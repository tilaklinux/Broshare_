import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../utils/mail.js';

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

    // New public accounts are always students. Admins are promoted only by
    // an existing admin or by a deliberate database update.
    const token = jwt.sign(
      { id: result.insertId, name, email, hostel_name, room_number, role: 'student', status: 'active' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user data (without password)
    const user = { id: result.insertId, name, email, hostel_name, room_number, role: 'student', status: 'active' };
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
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'This account has been suspended. Please contact an administrator.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, hostel_name: user.hostel_name, room_number: user.room_number, role: user.role, status: user.status },
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
      role: user.role,
      status: user.status,
    };

    res.json({ user: userData, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Current database-backed profile. The client uses this on refresh so role
// and suspension changes are reflected without waiting for a new login.
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ============================================
// Password reset
// The emailed link carries a random token; only its SHA-256 hash is stored.
// Answers never reveal whether an email is registered.
// ============================================
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const resetRequests = new Map(); // email -> timestamps, basic rate limiting

router.post('/forgot-password', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!email) return res.status(400).json({ message: 'Enter your registered email address.' });

    const generic = { message: 'If an account exists for that email, a password reset link has been sent. It expires in 30 minutes.' };

    // Allow at most 5 reset requests per email in 15 minutes.
    const now = Date.now();
    const recent = (resetRequests.get(email) || []).filter((t) => now - t < 15 * 60 * 1000);
    if (recent.length >= 5) return res.json(generic);
    recent.push(now);
    resetRequests.set(email, recent);

    const [[user]] = await db.query('SELECT id, email FROM users WHERE email = ?', [email]);
    if (!user) return res.json(generic);

    const token = crypto.randomBytes(32).toString('hex');
    await db.query(
      `UPDATE users SET reset_token_hash = ?,
         reset_token_expires = DATE_ADD(NOW(), INTERVAL 30 MINUTE) WHERE id = ?`,
      [hashResetToken(token), user.id],
    );

    const frontend = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetLink = `${frontend}/reset-password?token=${token}`;
    const result = await sendPasswordResetEmail(user.email, resetLink).catch((err) => {
      console.error('Password reset email failed:', err.message);
      return { delivered: false };
    });

    // Opt-in local/demo shortcut only: never expose this on a public server.
    if (!result.delivered && process.env.ALLOW_DEV_RESET_LINK === 'true') {
      return res.json({ ...generic, devResetLink: resetLink });
    }
    return res.json(generic);
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Could not start the password reset. Please retry.' });
  }
});

router.get('/reset-password/:token', async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires > NOW()',
      [hashResetToken(req.params.token)],
    );
    if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });
    return res.json({ valid: true });
  } catch (err) {
    console.error('Reset token check failed:', err);
    res.status(500).json({ message: 'Could not check this reset link. Please retry.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Enter a new password of at least 6 characters.' });
    }
    const [[user]] = await db.query(
      'SELECT id FROM users WHERE reset_token_hash = ? AND reset_token_expires > NOW()',
      [hashResetToken(token)],
    );
    if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      `UPDATE users SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL,
         password_changed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [hashedPassword, user.id],
    );
    return res.json({ message: 'Password updated. Please log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Could not update your password. Please retry.' });
  }
});

export default router;
