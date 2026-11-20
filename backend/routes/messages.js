import express from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// ============================================
// GET /api/messages/conversations
// Get list of all conversations for the user
// ============================================
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id 
          ELSE m.sender_id 
        END AS other_user_id,
        u.name,
        u.hostel_name,
        u.room_number,
        m.content AS last_message,
        m.created_at
      FROM messages m
      JOIN users u ON u.id = CASE 
        WHEN m.sender_id = ? THEN m.receiver_id 
        ELSE m.sender_id 
      END
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.created_at DESC
    `, [req.user.id, req.user.id, req.user.id, req.user.id]);

    // Group by other_user_id and get latest message per conversation
    const convMap = {};
    rows.forEach(row => {
      if (!convMap[row.other_user_id]) {
        convMap[row.other_user_id] = {
          user_id: row.other_user_id,
          name: row.name,
          hostel_name: row.hostel_name,
          room_number: row.room_number,
          last_message: row.last_message,
          created_at: row.created_at,
        };
      }
    });

    res.json(Object.values(convMap));
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ message: 'Server error fetching conversations' });
  }
});

// ============================================
// GET /api/messages/:userId
// Get message history with a specific user
// ============================================
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId);

    // Get messages between the two users
    const [messages] = await db.query(`
      SELECT m.*, 
        sender.name AS sender_name,
        receiver.name AS receiver_name
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE (m.sender_id = ? AND m.receiver_id = ?)
         OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `, [req.user.id, otherUserId, otherUserId, req.user.id]);

    // Get the related item if any
    let item = null;
    const itemMsg = messages.find(m => m.item_id);
    if (itemMsg) {
      const [items] = await db.query(`
        SELECT items.*, users.name AS user_name, users.hostel_name, users.room_number
        FROM items
        JOIN users ON items.user_id = users.id
        WHERE items.id = ?
      `, [itemMsg.item_id]);
      if (items.length > 0) item = items[0];
    }

    const [[partner]] = await db.query('SELECT id, name, hostel_name, room_number FROM users WHERE id = ?', [otherUserId]);
    if (!partner) return res.status(404).json({ message: 'Student not found' });
    res.json({ messages, item, partner });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

// ============================================
// POST /api/messages
// Send a new message
// ============================================
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiver_id, item_id, content } = req.body;

    if (!receiver_id || !content) {
      return res.status(400).json({ message: 'Receiver and content are required' });
    }

    const [result] = await db.query(
      'INSERT INTO messages (sender_id, receiver_id, item_id, content) VALUES (?, ?, ?, ?)',
      [req.user.id, receiver_id, item_id || null, content]
    );

    res.status(201).json({ message: 'Message sent', id: result.insertId });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

export default router;
