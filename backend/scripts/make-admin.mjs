// Bootstrap or restore an administrator from the server terminal.
// Usage from backend/: npm run make-admin -- student@example.com
import db from '../db.js';

const email = process.argv[2]?.trim().toLowerCase();
try {
  if (!email) throw new Error('Usage: npm run make-admin -- student@example.com');
  const [result] = await db.query(
    "UPDATE users SET role = 'admin', status = 'active' WHERE email = ?", [email],
  );
  if (!result.affectedRows) throw new Error(`No registered user found for ${email}`);
  const [[user]] = await db.query('SELECT name, email, role, status FROM users WHERE email = ?', [email]);
  console.log(`${user.name} (${user.email}) is now an active ${user.role}.`);
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
