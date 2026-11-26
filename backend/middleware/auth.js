import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Verify the token AND load the current account from MariaDB. Loading the
// account on each authenticated request means an admin promotion, demotion,
// suspension, or account deletion takes effect immediately instead of when
// the seven-day token happens to expire.
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }

  try {
    const [[user]] = await db.query(
      `SELECT id, name, email, hostel_name, room_number, role, status, password_changed_at
       FROM users WHERE id = ?`,
      [decoded.id],
    );

    if (!user) {
      return res.status(401).json({ message: 'This account no longer exists. Please log in again.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ message: 'This account has been suspended. Please contact an administrator.' });
    }
    // Tokens issued before the last password reset/change no longer work.
    if (user.password_changed_at && decoded.iat
        && decoded.iat * 1000 < new Date(user.password_changed_at).getTime()) {
      return res.status(401).json({ message: 'Your password has changed. Please log in again.' });
    }

    delete user.password_changed_at;
    req.user = user;
    return next();
  } catch (err) {
    console.error('Authentication check failed:', err);
    return res.status(500).json({ message: 'Could not verify this session. Please retry.' });
  }
}

// Admin authority comes from the fresh database record attached by
// authenticateToken, never from a role claim supplied by the browser.
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Administrator access is required.' });
  }
  return next();
}
