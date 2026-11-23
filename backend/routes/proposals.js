import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
function transaction(action) {
  return async (req, res) => {
    let c;
    try {
      c = await db.getConnection();
      await c.beginTransaction();
      await action(c, req);
      await c.commit();
      res.sendStatus(204);
    } catch (e) {
      if (c) await c.rollback();
      const status = e.status || (e.code === 'ER_LOCK_DEADLOCK' ? 409 : 500);
      res.status(status).json({message: e.status ? e.message : 'Could not save proposal. Please retry.'});
    } finally { c?.release(); }
  };
}
async function lockItems(c, target, offered) {
  const ids = offered ? [target, offered] : [target];
  const [rows] = await c.query(`SELECT i.*, u.status AS owner_status FROM items i
    JOIN users u ON u.id = i.user_id WHERE i.id IN (?) ORDER BY i.id FOR UPDATE`, [ids]);
  if (rows.length !== ids.length || rows.some(i => i.status !== 'available' || i.owner_status !== 'active')) fail(409, 'Listing no longer available');
  return rows;
}
router.post('/', transaction(async (c, req) => {
  const {target_item_id: target, offered_item_id: offered = null, kind, amount = null} = req.body;
  const validId = id => Number.isSafeInteger(id) && id > 0;
  if (!validId(target) || !['item','free','cash'].includes(kind) ||
      (kind === 'item' ? !validId(offered) || offered === target : offered !== null) ||
      (kind === 'cash' ? !/^\d{1,8}(\.\d{1,2})?$/.test(String(amount)) || Number(amount) <= 0 : amount !== null)) fail(400, 'Invalid offer');
  const items = await lockItems(c, target, offered);
  if (items.find(i => i.id === target).user_id === req.user.id || (offered && items.find(i => i.id === offered).user_id !== req.user.id)) fail(403, 'Check ownership of the listings');
  await c.query('INSERT INTO barter_requests(target_item_id,offered_item_id,requester_id,kind,amount) VALUES (?,?,?,?,?)', [target, offered, req.user.id, kind, amount]);
}));
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT r.*, t.title, o.title AS offered_title, u.name FROM barter_requests r
      JOIN items t ON t.id=r.target_item_id LEFT JOIN items o ON o.id=r.offered_item_id
      JOIN users u ON u.id=r.requester_id WHERE t.user_id=? AND r.status='pending' ORDER BY r.id DESC`, [req.user.id]);
    res.json(rows);
  } catch { res.status(500).json({message:'Could not load proposals'}); }
});
router.get('/history', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT r.id, r.kind, r.amount, r.status, r.requester_id,
      t.title, o.title AS offered_title, owner.name AS owner_name, sender.name AS requester_name
      FROM barter_requests r JOIN items t ON t.id=r.target_item_id
      LEFT JOIN items o ON o.id=r.offered_item_id
      JOIN users owner ON owner.id=t.user_id JOIN users sender ON sender.id=r.requester_id
      WHERE t.user_id=? OR r.requester_id=? ORDER BY r.id DESC`, [req.user.id, req.user.id]);
    res.json(rows);
  } catch { res.status(500).json({message:'Could not load trade history'}); }
});

router.post('/:id/withdraw', transaction(async (c, req) => {
  const [result] = await c.query(`UPDATE barter_requests SET status='withdrawn'
    WHERE id=? AND requester_id=? AND status='pending'`, [req.params.id, req.user.id]);
  if (!result.affectedRows) fail(409, 'Only your own pending offer can be withdrawn.');
}));

router.post('/:id/:decision', transaction(async (c, req) => {
  const {id, decision} = req.params;
  if (!['accept','reject'].includes(decision)) fail(400, 'Invalid decision');
  const [[r]] = await c.query(`SELECT r.*, t.user_id FROM barter_requests r JOIN items t ON t.id=r.target_item_id WHERE r.id=?`, [id]);
  if (!r) fail(404, 'Proposal not found');
  if (r.user_id !== req.user.id) fail(403, 'Only the owner can decide');
  const accept = decision === 'accept';
  const items = accept ? await lockItems(c,r.target_item_id,r.offered_item_id) : [];
  const [update] = await c.query("UPDATE barter_requests SET status=? WHERE id=? AND status='pending'", [accept?'accepted':'rejected', id]);
  if (!update.affectedRows) fail(409,'Proposal already resolved');
  if (!accept) return;
  const ids = items.map(i => i.id);
  await c.query("UPDATE items SET status='bartered' WHERE id IN (?)", [ids]);
  await c.query("UPDATE barter_requests SET status='rejected' WHERE status='pending' AND (target_item_id IN (?) OR offered_item_id IN (?))", [ids,ids]);
  await c.query('INSERT INTO completed_trades(request_id,target_item_id,offered_item_id,requester_id,owner_id,kind,amount) VALUES (?,?,?,?,?,?,?)', [r.id,r.target_item_id,r.offered_item_id,r.requester_id,r.user_id,r.kind,r.amount]);
}));
export default router;
