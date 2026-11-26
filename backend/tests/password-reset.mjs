// Integration test against a running API backed by a disposable database.
// Start the backend with ALLOW_DEV_RESET_LINK=true (and no SMTP configured)
// so the reset link is returned in the forgot-password response.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import db from '../db.js';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';
const suffix = randomUUID();

async function request(path, token, { method = 'GET', body, status = 200 } = {}) {
  const res = await fetch(`${base}/${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  assert.equal(res.status, status, `${method} ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

try {
  const email = `forgetful-${suffix}@example.test`;
  const account = await request('auth/register', null, {
    method: 'POST', status: 201,
    body: { name: 'Forgetful', email, password: 'oldpass1', hostel_name: 'Reset Hostel', room_number: '5' },
  });
  const oldToken = account.token;

  // Unknown emails get the same answer and no link.
  const unknown = await request('auth/forgot-password', null, {
    method: 'POST', body: { email: `nobody-${suffix}@example.test` },
  });
  assert.ok(!unknown.devResetLink);

  const forgot = await request('auth/forgot-password', null, { method: 'POST', body: { email } });
  assert.ok(forgot.devResetLink, 'Run the backend with ALLOW_DEV_RESET_LINK=true and no SMTP for this test.');
  const token = new URL(forgot.devResetLink).searchParams.get('token');
  assert.ok(token);

  await request(`auth/reset-password/${token}`, null);
  await request(`auth/reset-password/${token}x`, null, { status: 400 });
  await request('auth/reset-password', null, {
    method: 'POST', status: 400, body: { token, password: 'short' },
  });

  await request('auth/reset-password', null, {
    method: 'POST', body: { token, password: 'newpass1' },
  });

  // The link is single-use, the old password and old session stop working.
  await request('auth/reset-password', null, {
    method: 'POST', status: 400, body: { token, password: 'another1' },
  });
  await request('auth/login', null, {
    method: 'POST', status: 401, body: { email, password: 'oldpass1' },
  });
  await request('auth/login', null, {
    method: 'POST', body: { email, password: 'newpass1' },
  });
  await request('auth/me', oldToken, { status: 401 });

  const [[row]] = await db.query(
    'SELECT reset_token_hash, reset_token_expires FROM users WHERE email = ?', [email],
  );
  assert.equal(row.reset_token_hash, null);
  assert.equal(row.reset_token_expires, null);

  console.log('Password reset checks passed.');
} finally {
  await db.end();
}
