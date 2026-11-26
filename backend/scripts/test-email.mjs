// Verify SMTP settings: cd backend && npm run test-email -- you@example.com
import { isMailConfigured, sendTestEmail } from '../utils/mail.js';

const to = process.argv[2] || process.env.SMTP_USER;
try {
  if (!to) throw new Error('Usage: npm run test-email -- you@example.com');
  if (!isMailConfigured()) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in backend/.env first.');
  }
  await sendTestEmail(to);
  console.log(`Test email sent to ${to}. Check the inbox (and spam folder).`);
} catch (err) {
  console.error('Test email failed:', err.message);
  console.error('For Gmail: use smtp.gmail.com, port 465, your full Gmail address, and a 16-character App Password with no spaces.');
  process.exitCode = 1;
}
