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
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
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
      SELECT items.*, users.name AS user_name, users.hostel_name, users.room_number
      FROM items
      JOIN users ON items.user_id = users.id
      WHERE items.status = 'available'
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
      SELECT items.*, users.name AS user_name, users.hostel_name, users.room_number
      FROM items
      JOIN users ON items.user_id = users.id
      WHERE items.user_id = ?
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

// ============================================
// PUT /api/items/:id/status
// Update item status (available/bartered)
// ============================================
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'bartered'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Verify ownership
    const [item] = await db.query('SELECT user_id FROM items WHERE id = ?', [req.params.id]);
    if (item.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    if (item[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this item' });
    }

    await db.query('UPDATE items SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `Item marked as ${status}` });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ message: 'Server error updating item status' });
  }
});

// ============================================
// DELETE /api/items/:id
// Delete an item listing
// ============================================
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Verify ownership
    const [item] = await db.query('SELECT user_id FROM items WHERE id = ?', [req.params.id]);
    if (item.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    if (item[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }

    await db.query('DELETE FROM items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ message: 'Server error deleting item' });
  }
});

export default router;
