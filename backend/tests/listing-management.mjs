// Integration test against a running API backed by a disposable database:
// owners can update a listing photo and delete their own listing; other
// students can do neither.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import db from '../db.js';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';
const origin = base.replace(/\/api\/?$/, '');
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
      password: suffix, hostel_name: 'Manage Hostel', room_number: '9',
    },
  });
  return result;
}

async function uploadPhoto(token, itemId, status = 200) {
  const form = new FormData();
  form.set('image', new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), 'photo.jpg');
  const res = await fetch(`${base}/items/${itemId}/photo`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  const text = await res.text();
  assert.equal(res.status, status, `POST items/${itemId}/photo: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function photoStatus(imageUrl) {
  const res = await fetch(`${origin}${imageUrl}`);
  await res.arrayBuffer();
  return res.status;
}

try {
  const owner = await register('Owner');
  const other = await register('Other');

  const created = await request('items', owner.token, {
    method: 'POST', status: 201,
    body: { title: `Kettle ${suffix}`, category: 'Essentials', description: 'A kettle', looking_for: 'Books' },
  });
  const itemId = created.id;

  // Add a first photo, then replace it. The old file must be removed.
  const first = await uploadPhoto(owner.token, itemId);
  assert.equal(await photoStatus(first.image_url), 200);
  const second = await uploadPhoto(owner.token, itemId);
  assert.notEqual(second.image_url, first.image_url);
  assert.equal(await photoStatus(second.image_url), 200);
  assert.equal(await photoStatus(first.image_url), 404, 'Replaced photo file should be deleted');
  let mine = await request('items/my-items', owner.token);
  assert.equal(mine.find((i) => i.id === itemId)?.image_url, second.image_url);

  // The owner can edit the details; another student cannot, and invalid
  // categories are rejected.
  const edited = { title: `Steel kettle ${suffix}`, description: 'A steel kettle', category: 'Essentials', looking_for: 'Novels' };
  await request(`items/${itemId}`, other.token, { method: 'PUT', status: 404, body: edited });
  await request(`items/${itemId}`, owner.token, {
    method: 'PUT', status: 400, body: { ...edited, category: 'Vehicles' },
  });
  await request(`items/${itemId}`, owner.token, { method: 'PUT', body: edited });
  mine = await request('items/my-items', owner.token);
  const afterEdit = mine.find((i) => i.id === itemId);
  assert.equal(afterEdit.title, edited.title);
  assert.equal(afterEdit.looking_for, 'Novels');
  assert.ok((await request('items', null)).some((i) => i.id === itemId && i.title === edited.title));

  // Another student cannot update the photo or delete the listing.
  await uploadPhoto(other.token, itemId, 404);
  await request(`items/${itemId}`, other.token, { method: 'DELETE', status: 404 });
  assert.ok((await request('items', null)).some((i) => i.id === itemId), 'Listing must survive other user attempts');

  // The owner can delete it: it leaves the feed and My Listings, and its
  // photo file is deleted too.
  await request(`items/${itemId}`, owner.token, { method: 'DELETE' });
  assert.ok(!(await request('items', null)).some((i) => i.id === itemId));
  mine = await request('items/my-items', owner.token);
  assert.ok(!mine.some((i) => i.id === itemId));
  assert.equal(await photoStatus(second.image_url), 404);
  const [[row]] = await db.query('SELECT status, image_url FROM items WHERE id = ?', [itemId]);
  assert.deepEqual([row.status, row.image_url], ['deleted', null]);

  // Deleting again (or editing a deleted listing) is a clear error,
  // not a silent success.
  await request(`items/${itemId}`, owner.token, { method: 'DELETE', status: 404 });
  await request(`items/${itemId}`, owner.token, { method: 'PUT', status: 404, body: edited });

  console.log('Listing management checks passed.');
} finally {
  await db.end();
}
