import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// ============================================
// POST /api/auth/register
// Register a new user
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, hostel_name, room_number } = req.body;

    // Validate required fields
    if (!name || !email || !password || !hostel_name || !room_number) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, hostel_name, room_number) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, hostel_name, room_number]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, name, email, hostel_name, room_number },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const user = { id: result.insertId, name, email, hostel_name, room_number };
    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ============================================
// POST /api/auth/login
// Login an existing user
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, hostel_name: user.hostel_name, room_number: user.room_number },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      hostel_name: user.hostel_name,
      room_number: user.room_number,
    };

    res.json({ user: userData, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

export default router;
