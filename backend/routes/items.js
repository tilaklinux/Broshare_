import express from 'express';
import multer from 'multer';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// ============================================
// Multer setup for image uploads
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /^\.(jpe?g|png|gif|webp)$/;
    const ext = allowedExtensions.test(extname(file.originalname).toLowerCase());
    const mimetype = /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype);
    if (ext && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ============================================
// GET /api/items
// Get all available items (public)
// ============================================
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT items.*, users.name AS user_name, users.hostel_name
      FROM items
      JOIN users ON items.user_id = users.id
      WHERE items.status = 'available' AND users.status = 'active'
      ORDER BY items.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Get items error:', err);
    res.status(500).json({ message: 'Server error fetching items' });
  }
});

// ============================================
// GET /api/items/my-items
// Get items posted by the logged-in user
// ============================================
router.get('/my-items', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT items.*, users.name AS user_name, users.hostel_name
      FROM items
      JOIN users ON items.user_id = users.id
      WHERE items.user_id = ? AND items.status <> 'deleted'
      ORDER BY items.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Get my items error:', err);
    res.status(500).json({ message: 'Server error fetching your items' });
  }
});

// ============================================
// POST /api/items
// Create a new item listing (auth required)
// ============================================
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { title, description, category, looking_for } = req.body;

    if (!title || !description || !category || !looking_for) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO items (user_id, title, description, category, looking_for, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, title, description, category, looking_for, image_url]
    );

    res.status(201).json({ message: 'Item posted successfully', id: result.insertId });
  } catch (err) {
    console.error('Post item error:', err);
    res.status(500).json({ message: 'Server error creating item' });
  }
});

// Only delete files created by this upload route, never an arbitrary path.
async function removeUpload(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.startsWith('/uploads/')) return;
  const filename = basename(imageUrl.slice('/uploads/'.length));
  if (!filename || filename !== imageUrl.slice('/uploads/'.length)) return;
  try {
    await unlink(join(__dirname, '..', 'uploads', filename));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Could not remove uploaded file:', err.message);
  }
}

// Return JSON instead of Express's default HTML page for bad/oversized files.
function uploadPhoto(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image must be 5 MB or smaller.'
      : 'Only JPG, PNG, GIF, or WebP images are allowed.';
    return res.status(400).json({ message });
  });
}

// ============================================
// POST /api/items/:id/photo
// Add or replace the photo on your own listing. Used when a listing has no
// photo, including after an admin removed the previous one.
// ============================================
router.post('/:id/photo', authenticateToken, uploadPhoto, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Choose an image to upload.' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  let connection;
  let oldImageUrl = null;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [[item]] = await connection.query(
      'SELECT user_id, status, image_url FROM items WHERE id = ? FOR UPDATE',
      [req.params.id],
    );
    if (!item || item.user_id !== req.user.id || item.status === 'deleted') {
      await connection.rollback();
      await unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Listing not found for this account' });
    }

    oldImageUrl = item.image_url;
    await connection.query(
      'UPDATE items SET image_url = ?, photo_removed_by_admin = 0 WHERE id = ?',
      [imageUrl, req.params.id],
    );
    await connection.commit();
  } catch (err) {
    if (connection) await connection.rollback().catch(() => {});
    await unlink(req.file.path).catch(() => {});
    console.error('Photo upload failed:', err);
    return res.status(500).json({ message: 'Could not upload the photo. Please retry.' });
  } finally {
    connection?.release();
  }

  if (oldImageUrl && oldImageUrl !== imageUrl) await removeUpload(oldImageUrl);
  return res.json({ message: 'Photo uploaded.', image_url: imageUrl });
});

// ============================================
// PUT /api/items/:id/status
// Update item status (available/bartered)
// ============================================
// Keep resolved proposals readable. Removing a listing hides it rather than
// cascading a delete through its history. Invalidate pending offers atomically.
async function changeStatus(req, res, status) {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const id = req.params.id;
    const [[item]] = await connection.query('SELECT user_id,status FROM items WHERE id=? FOR UPDATE', [id]);
    if (!item || item.status === 'deleted' || item.user_id !== req.user.id) {
      await connection.rollback();
      return res.status(404).json({ message: 'Listing not found for this account' });
    }
    await connection.query('UPDATE items SET status=? WHERE id=?', [status,id]);
    if (status !== 'available') {
      await connection.query(`UPDATE barter_requests SET status='rejected' WHERE status='pending'
        AND (target_item_id=? OR offered_item_id=?)`, [id,id]);
    }
    await connection.commit();
    res.json({ message: `Listing marked as ${status}` });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Listing update failed:', err);
    res.status(500).json({ message: 'Could not update listing. Please retry.' });
  } finally { connection?.release(); }
}

router.put('/:id/status', authenticateToken, (req, res) => {
  const {status} = req.body;
  if (!['available','bartered'].includes(status)) return res.status(400).json({message:'Invalid status'});
  return changeStatus(req, res, status);
});
router.delete('/:id', authenticateToken, (req,res) => changeStatus(req,res,'deleted'));

export default router;
