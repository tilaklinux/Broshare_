import dotenv from 'dotenv';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load backend/.env explicitly so SMTP settings are found no matter which
// folder the server was started from.
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

// Free email sending: configure any SMTP account in backend/.env, for
// example a Gmail account with an App Password
// (SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_USER, SMTP_PASS).
// Without SMTP settings no email is sent; the reset link is printed in the
// backend terminal instead so the flow still works for local development.
// Email is optional: if the nodemailer package has not been installed yet
// (run `npm install` in backend/), the server must still start — sending
// just falls back to printing reset links in the terminal.
let nodemailer = null;
try {
  nodemailer = (await import('nodemailer')).default;
} catch {
  console.warn('[mail] nodemailer is not installed; email sending is disabled. Run "npm install" in backend/.');
}

let transporter = null;
if (nodemailer && process.env.SMTP_HOST) {
  console.log(`[mail] SMTP configured: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587} as ${process.env.SMTP_USER || '(no user)'}`);
} else if (nodemailer) {
  console.log('[mail] SMTP not configured (SMTP_HOST missing from backend/.env); reset links will be printed in this terminal.');
}
if (nodemailer && process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

export function isMailConfigured() {
  return Boolean(transporter);
}

// Sends a simple test email so you can verify your SMTP settings with
// `npm run test-email -- you@example.com` in backend/.
export async function sendTestEmail(to) {
  if (!transporter) return { delivered: false };
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Broshare email test',
    text: 'Your Broshare SMTP settings are working. Password reset emails will be sent from this address.',
    html: '<div style="font-family: Arial, sans-serif;"><h2 style="color:#059669;">Broshare email test</h2><p>Your SMTP settings are working. Password reset emails will be sent from this address.</p></div>',
  });
  return { delivered: true };
}

export async function sendPasswordResetEmail(to, resetLink) {
  if (!transporter) {
    console.log('\n================ Broshare password reset ================');
    console.log(`No SMTP configured, so no email was sent.`);
    console.log(`Reset link for ${to} (valid 30 minutes):`);
    console.log(resetLink);
    console.log('==========================================================\n');
    return { delivered: false };
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: 'Reset your Broshare password',
    text: [
      'You asked to reset your Broshare password.',
      '',
      `Open this link within 30 minutes to choose a new password:`,
      resetLink,
      '',
      'If you did not request this, you can ignore this email. Your password will not change.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#059669;">Broshare password reset</h2>
        <p>You asked to reset your Broshare password.</p>
        <p><a href="${resetLink}" style="display:inline-block;background:#059669;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold;">Reset my password</a></p>
        <p style="color:#555;">This link expires in 30 minutes. If the button does not work, paste this address into your browser:</p>
        <p style="word-break:break-all;color:#059669;">${resetLink}</p>
        <p style="color:#555;">If you did not request this, you can ignore this email. Your password will not change.</p>
      </div>`,
  });
  return { delivered: true };
}
