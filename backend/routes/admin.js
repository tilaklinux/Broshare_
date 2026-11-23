import express from 'express';
import { unlink } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken, requireAdmin);

const __dirname = dirname(fileURLToPath(import.meta.url));
const uploadsDir = join(__dirname, '..', 'uploads');

const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};

function positiveId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) fail(400, 'Invalid ID.');
  return id;
}

async function audit(connection, req, action, targetType, targetId, targetLabel, details = null) {
  await connection.query(
    `INSERT INTO admin_actions (admin_id, action, target_type, target_id, target_label, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [req.user.id, action, targetType, targetId, targetLabel, details],
  );
}

// Only files created by the item upload route may be removed. Never turn a
// database value into an arbitrary filesystem path.
function uploadPath(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/uploads/')) return null;
  const filename = basename(imageUrl.slice('/uploads/'.length));
  if (!filename || filename !== imageUrl.slice('/uploads/'.length)) return null;
  return join(uploadsDir, filename);
}

async function removeUploads(imageUrls) {
  const paths = [...new Set(imageUrls.map(uploadPath).filter(Boolean))];
  await Promise.all(paths.map(async (path) => {
    try {
      await unlink(path);
    } catch (err) {
      if (err.code !== 'ENOENT') console.error(`Could not remove uploaded file ${path}:`, err.message);
    }
  }));
}

// Runs moderation changes and their audit record in one transaction. Uploaded
// files are removed only after the database commit succeeds.
function transaction(work) {
  return async (req, res) => {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      const result = await work(connection, req) || {};
      await connection.commit();
      if (result.files?.length) await removeUploads(result.files);
      res.json(result.body || { message: 'Done' });
    } catch (err) {
      if (connection) await connection.rollback().catch(() => {});
      const status = err.status || 500;
      if (status >= 500) console.error('Admin action failed:', err);
      res.status(status).json({ message: err.status ? err.message : 'Admin action failed. Please retry.' });
    } finally {
      connection?.release();
    }
  };
}

const listingSelect = `
  SELECT i.*, u.name AS owner_name, u.email AS owner_email,
    u.hostel_name AS owner_hostel_name, u.room_number AS owner_room_number,
    u.role AS owner_role, u.status AS owner_status,
    (SELECT COUNT(*) FROM barter_requests r
      WHERE r.status = 'pending' AND (r.target_item_id = i.id OR r.offered_item_id = i.id)
    ) AS pending_proposals
  FROM items i
  JOIN users u ON u.id = i.user_id`;

function listingFilters(req, { photosOnly = false } = {}) {
  const conditions = [];
  const params = [];
  const status = req.query.status || 'all';
  const search = (req.query.search || '').trim();

  if (photosOnly) conditions.push("i.image_url IS NOT NULL", "i.status <> 'deleted'");
  if (status !== 'all') {
    if (!['available', 'bartered', 'deleted'].includes(status)) fail(400, 'Invalid listing status.');
    conditions.push('i.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push(`(LOCATE(?, i.title) > 0 OR LOCATE(?, i.description) > 0
      OR LOCATE(?, i.looking_for) > 0 OR LOCATE(?, u.name) > 0 OR LOCATE(?, u.email) > 0)`);
    params.push(search, search, search, search, search);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function findListingForUpdate(connection, id) {
  const [[item]] = await connection.query(
    `SELECT i.*, u.name AS owner_name, u.status AS owner_status
     FROM items i JOIN users u ON u.id = i.user_id WHERE i.id = ? FOR UPDATE`,
    [id],
  );
  if (!item) fail(404, 'Listing not found.');
  return item;
}

router.get('/overview', async (req, res) => {
  try {
    const count = async (sql) => Number((await db.query(sql))[0][0].total);
    const [users, activeUsers, suspendedUsers, admins, listings, availableListings,
      barteredListings, deletedListings, photos, pendingProposals, completedTrades, messages] = await Promise.all([
      count('SELECT COUNT(*) AS total FROM users'),
      count("SELECT COUNT(*) AS total FROM users WHERE status = 'active'"),
      count("SELECT COUNT(*) AS total FROM users WHERE status = 'suspended'"),
      count("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'"),
      count("SELECT COUNT(*) AS total FROM items WHERE status <> 'deleted'"),
      count("SELECT COUNT(*) AS total FROM items WHERE status = 'available'"),
      count("SELECT COUNT(*) AS total FROM items WHERE status = 'bartered'"),
      count("SELECT COUNT(*) AS total FROM items WHERE status = 'deleted'"),
      count("SELECT COUNT(*) AS total FROM items WHERE image_url IS NOT NULL AND status <> 'deleted'"),
      count("SELECT COUNT(*) AS total FROM barter_requests WHERE status = 'pending'"),
      count('SELECT COUNT(*) AS total FROM completed_trades'),
      count('SELECT COUNT(*) AS total FROM messages'),
    ]);
    res.json({ users, activeUsers, suspendedUsers, admins, listings, availableListings,
      barteredListings, deletedListings, photos, pendingProposals, completedTrades, messages });
  } catch (err) {
    console.error('Admin overview failed:', err);
    res.status(500).json({ message: 'Could not load admin overview.' });
  }
});

router.get('/listings', async (req, res) => {
  try {
    const { where, params } = listingFilters(req);
    const [rows] = await db.query(`${listingSelect} ${where} ORDER BY i.created_at DESC LIMIT 200`, params);
    res.json(rows);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Could not load listings.' });
  }
});

router.get('/photos', async (req, res) => {
  try {
    const { where, params } = listingFilters(req, { photosOnly: true });
    const [rows] = await db.query(`${listingSelect} ${where} ORDER BY i.created_at DESC LIMIT 200`, params);
    res.json(rows);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Could not load photos.' });
  }
});

router.post('/listings/:id/remove-photo', transaction(async (connection, req) => {
  const id = positiveId(req.params.id);
  const item = await findListingForUpdate(connection, id);
  if (!item.image_url) fail(409, 'This listing does not have a photo.');
  await connection.query('UPDATE items SET image_url = NULL, photo_removed_by_admin = 1 WHERE id = ?', [id]);
  await audit(connection, req, 'photo_removed', 'photo', id, item.title, `Photo removed from listing owned by ${item.owner_name}.`);
  return { files: [item.image_url], body: { message: 'Photo removed and its uploaded file deleted.' } };
}));

router.post('/listings/:id/delete', transaction(async (connection, req) => {
  const id = positiveId(req.params.id);
  const item = await findListingForUpdate(connection, id);
  if (item.status === 'deleted') fail(409, 'This listing has already been removed.');
  await connection.query("UPDATE items SET status = 'deleted', image_url = NULL, photo_removed_by_admin = 0 WHERE id = ?", [id]);
  await connection.query(
    `UPDATE barter_requests SET status = 'rejected' WHERE status = 'pending'
     AND (target_item_id = ? OR offered_item_id = ?)`,
    [id, id],
  );
  await audit(connection, req, 'listing_deleted', 'listing', id, item.title, `Listing owned by ${item.owner_name} was removed from the marketplace.`);
  return { files: item.image_url ? [item.image_url] : [], body: { message: 'Listing removed from the marketplace.' } };
}));

router.post('/listings/:id/restore', transaction(async (connection, req) => {
  const id = positiveId(req.params.id);
  const item = await findListingForUpdate(connection, id);
  if (item.status !== 'deleted') fail(409, 'Only a removed listing can be restored.');
  if (item.owner_status !== 'active') fail(409, 'Reactivate the listing owner before restoring this listing.');
  const [[{ total }]] = await connection.query(
    'SELECT COUNT(*) AS total FROM completed_trades WHERE target_item_id = ? OR offered_item_id = ?', [id, id],
  );
  const restoredStatus = Number(total) > 0 ? 'bartered' : 'available';
  await connection.query('UPDATE items SET status = ? WHERE id = ?', [restoredStatus, id]);
  await audit(connection, req, 'listing_restored', 'listing', id, item.title, `Removed listing was restored as ${restoredStatus}. A deleted photo file cannot be restored.`);
  return { body: { message: `Listing restored as ${restoredStatus}.` } };
}));

router.get('/users', async (req, res) => {
  try {
    const conditions = [];
    const params = [];
    const { status = 'all', role = 'all' } = req.query;
    const search = (req.query.search || '').trim();
    if (status !== 'all') {
      if (!['active', 'suspended'].includes(status)) fail(400, 'Invalid user status.');
      conditions.push('u.status = ?'); params.push(status);
    }
    if (role !== 'all') {
      if (!['student', 'admin'].includes(role)) fail(400, 'Invalid user role.');
      conditions.push('u.role = ?'); params.push(role);
    }
    if (search) {
      conditions.push('(LOCATE(?, u.name) > 0 OR LOCATE(?, u.email) > 0 OR LOCATE(?, u.hostel_name) > 0 OR LOCATE(?, u.room_number) > 0)');
      params.push(search, search, search, search);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await db.query(`
      SELECT u.id, u.name, u.email, u.hostel_name, u.room_number, u.role, u.status, u.created_at,
        (SELECT COUNT(*) FROM items i WHERE i.user_id = u.id AND i.status <> 'deleted') AS listing_count,
        (SELECT COUNT(*) FROM items i WHERE i.user_id = u.id AND i.status <> 'deleted' AND i.image_url IS NOT NULL) AS photo_count,
        (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id OR m.receiver_id = u.id) AS message_count
      FROM users u ${where} ORDER BY u.created_at DESC LIMIT 200`, params);
    res.json(rows);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Could not load users.' });
  }
});

async function findUserForUpdate(connection, id) {
  const [[user]] = await connection.query('SELECT * FROM users WHERE id = ? FOR UPDATE', [id]);
  if (!user) fail(404, 'User not found.');
  return user;
}

router.post('/users/:id/suspend', transaction(async (connection, req) => {
  const id = positiveId(req.params.id);
  if (id === req.user.id) fail(409, 'You cannot suspend your own admin account.');
  const user = await findUserForUpdate(connection, id);
  if (user.role === 'admin') fail(409, 'Remove admin access before suspending this account.');
  if (user.status === 'suspended') fail(409, 'This account is already suspended.');
  await connection.query("UPDATE users SET status = 'suspended' WHERE id = ?", [id]);
  await connection.query(
    `UPDATE barter_requests SET status = 'rejected' WHERE status = 'pending' AND (
       requester_id = ? OR target_item_id IN (SELECT id FROM items WHERE user_id = ?)
       OR offered_item_id IN (SELECT id FROM items WHERE user_id = ?))`,
    [id, id, id],
  );
  await audit(connection, req, 'user_suspended', 'user', id, `${user.name} (${user.email})`, 'Account suspended and its pending proposals were rejected.');
  return { body: { message: 'Account suspended. Existing sign-in sessions stop working immediately.' } };
}));

router.post('/users/:id/reactivate', transaction(async (connection, req) => {
  const id = positiveId(req.params.id);
  const user = await findUserForUpdate(connection, id);
  if (user.status === 'active') fail(409, 'This account is already active.');
  await connection.query("UPDATE users SET status = 'active' WHERE id = ?", [id]);
  await audit(connection, req, 'user_reactivated', 'user', id, `${user.name} (${user.email})`);
  return { body: { message: 'Account reactivated.' } };
}));

router.post('/users/:id/role', transaction(async (connection, req) => {
  const id = positiveId(req.params.id);
  const { role } = req.body || {};
  if (!['student', 'admin'].includes(role)) fail(400, 'Invalid role.');
  if (id === req.user.id) fail(409, 'You cannot change your own admin role.');
  const user = await findUserForUpdate(connection, id);
  if (user.role === role) fail(409, `This account is already ${role === 'admin' ? 'an admin' : 'a student'}.`);
  if (user.role === 'admin' && role === 'student') {
    const [[{ total }]] = await connection.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
    if (Number(total) <= 1) fail(409, 'Broshare needs at least one admin account.');
  }
  await connection.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
  await audit(connection, req, role === 'admin' ? 'user_promoted' : 'user_demoted', 'user', id, `${user.name} (${user.email})`, `Role changed to ${role}.`);
  return { body: { message: `Account role changed to ${role}.` } };
}));

router.delete('/users/:id', transaction(async (connection, req) => {
  const id = positiveId(req.params.id);
  if (id === req.user.id) fail(409, 'You cannot delete your own admin account.');
  const user = await findUserForUpdate(connection, id);
  if (user.role === 'admin') fail(409, 'Remove admin access before deleting this account.');

  const [photos] = await connection.query(
    "SELECT image_url FROM items WHERE user_id = ? AND image_url IS NOT NULL", [id],
  );
  await connection.query('DELETE FROM barter_requests WHERE requester_id = ?', [id]);
  await connection.query(
    `DELETE r FROM barter_requests r JOIN items i ON i.user_id = ?
     WHERE r.target_item_id = i.id OR r.offered_item_id = i.id`, [id],
  );
  await connection.query('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?', [id, id]);
  await connection.query('DELETE FROM items WHERE user_id = ?', [id]);
  await connection.query('DELETE FROM users WHERE id = ?', [id]);
  await audit(connection, req, 'user_deleted', 'user', id, `${user.name} (${user.email})`, 'Account, listings, messages, proposals, and uploaded photos were permanently deleted.');
  return { files: photos.map(row => row.image_url), body: { message: 'User and their listings, messages, proposals, and photos were deleted.' } };
}));

router.get('/trades', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.id, r.kind, r.amount, r.status, r.requester_id,
        t.id AS target_item_id, t.title, t.status AS target_status,
        o.id AS offered_item_id, o.title AS offered_title,
        owner.id AS owner_id, owner.name AS owner_name,
        requester.name AS requester_name
      FROM barter_requests r
      JOIN items t ON t.id = r.target_item_id
      LEFT JOIN items o ON o.id = r.offered_item_id
      JOIN users owner ON owner.id = t.user_id
      JOIN users requester ON requester.id = r.requester_id
      ORDER BY (r.status = 'pending') DESC, r.id DESC LIMIT 100`);
    res.json(rows);
  } catch (err) {
    console.error('Admin trades failed:', err);
    res.status(500).json({ message: 'Could not load trades.' });
  }
});

router.post('/proposals/:id/cancel', transaction(async (connection, req) => {
  const id = positiveId(req.params.id);
  const [[proposal]] = await connection.query(
    `SELECT r.*, t.title FROM barter_requests r JOIN items t ON t.id = r.target_item_id
     WHERE r.id = ? FOR UPDATE`, [id],
  );
  if (!proposal) fail(404, 'Proposal not found.');
  if (proposal.status !== 'pending') fail(409, 'Only a pending proposal can be cancelled.');
  await connection.query("UPDATE barter_requests SET status = 'cancelled' WHERE id = ?", [id]);
  await audit(connection, req, 'proposal_cancelled', 'proposal', id, proposal.title, 'Pending proposal was cancelled by an administrator.');
  return { body: { message: 'Pending proposal cancelled.' } };
}));

router.get('/activity', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT a.*, u.name AS admin_name, u.email AS admin_email
      FROM admin_actions a LEFT JOIN users u ON u.id = a.admin_id
      ORDER BY a.created_at DESC, a.id DESC LIMIT 50`);
    res.json(rows);
  } catch (err) {
    console.error('Admin activity failed:', err);
    res.status(500).json({ message: 'Could not load admin activity.' });
  }
});

export default router;
