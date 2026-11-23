// Integration test against a running API backed by a disposable database.
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

async function register(label) {
  const result = await request('auth/register', null, {
    method: 'POST', status: 201,
    body: {
      name: label, email: `${label.toLowerCase()}-${suffix}@example.test`,
      password: suffix, hostel_name: 'Notify Hostel', room_number: '12',
    },
  });
  return result; // { user, token }
}

const send = (token, receiverId, content) => request('messages', token, {
  method: 'POST', status: 201, body: { receiver_id: receiverId, content },
});
const summary = (token) => request('messages/unread-summary', token);

try {
  const receiver = await register('Receiver');
  const senderB = await register('SenderB');
  const senderC = await register('SenderC');
  const a = receiver.token;
  const aId = receiver.user.id;

  assert.deepEqual(await summary(a), { unread_messages: 0, unread_conversations: 0, latest: null });

  await send(senderB.token, aId, 'Is the textbook still available?');
  await send(senderB.token, aId, 'I can swap my notes for it.');
  await send(senderC.token, aId, 'Hello! Interested in your lamp.');

  let result = await summary(a);
  assert.equal(result.unread_messages, 3);
  assert.equal(result.unread_conversations, 2, 'Badge counts distinct students, not messages');
  assert.equal(result.latest.sender_name, 'SenderC');
  assert.equal(result.latest.content, 'Hello! Interested in your lamp.');

  // Senders never see their own sent messages as unread.
  assert.equal((await summary(senderB.token)).unread_messages, 0);

  const conversations = await request('messages/conversations', a);
  assert.equal(conversations.find((c) => c.user_id === senderB.user.id)?.unread_count, 2);
  assert.equal(conversations.find((c) => c.user_id === senderC.user.id)?.unread_count, 1);

  // Opening one conversation clears only that student's messages.
  await request(`messages/${senderB.user.id}`, a);
  result = await summary(a);
  assert.equal(result.unread_messages, 1);
  assert.equal(result.unread_conversations, 1);
  assert.equal(result.latest.sender_name, 'SenderC');

  await request(`messages/${senderC.user.id}`, a);
  assert.deepEqual(await summary(a), { unread_messages: 0, unread_conversations: 0, latest: null });

  console.log('Message notification checks passed.');
} finally {
  await db.end();
}
