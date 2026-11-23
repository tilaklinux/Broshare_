// Integration test against a running API backed by a disposable database.
// It promotes one test account directly in MariaDB, as a real deployment
// would, then exercises administrator permissions through the HTTP API.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import db from '../db.js';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';
const origin = base.replace(/\/api\/?$/, '');
const suffix = randomUUID();
const password = suffix;

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
  const email = `${label.toLowerCase()}-${suffix}@example.test`;
  const result = await request('auth/register', null, {
    method: 'POST', status: 201,
    body: { name: label, email, password, hostel_name: 'Admin Test Hostel', room_number: '101' },
  });
  return { ...result, email };
}

const login = (account, status = 200) => request('auth/login', null, {
  method: 'POST', status, body: { email: account.email, password },
});

async function createListing(token, title) {
  return (await request('items', token, {
    method: 'POST', status: 201,
    body: { title, category: 'Books', description: title, looking_for: 'Offers' },
  })).id;
}

async function createPhotoListing(token, title) {
  const form = new FormData();
  form.set('title', title);
  form.set('description', title);
  form.set('category', 'Electronics');
  form.set('looking_for', 'Offers');
  form.set('image', new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), 'listing.jpg');
  const res = await fetch(`${base}/items`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  const data = await res.json();
  assert.equal(res.status, 201, `Create photo listing: ${JSON.stringify(data)}`);
  const [[row]] = await db.query('SELECT image_url FROM items WHERE id = ?', [data.id]);
  assert.ok(row.image_url);
  return { id: data.id, imageUrl: row.image_url };
}

async function assertPhotoStatus(imageUrl, status) {
  const res = await fetch(`${origin}${imageUrl}`);
  assert.equal(res.status, status, `Photo ${imageUrl}`);
  await res.arrayBuffer();
}

try {
  const adminCandidate = await register('AdminCandidate');
  const sellerAccount = await register('Seller');
  const buyerAccount = await register('Buyer');
  const otherAccount = await register('Other');
  const victimAccount = await register('Victim');

  await db.query("UPDATE users SET role = 'admin' WHERE email = ?", [adminCandidate.email]);
  const admin = (await login(adminCandidate)).token;
  const seller = sellerAccount.token;
  const buyer = buyerAccount.token;
  const other = otherAccount.token;
  const victim = victimAccount.token;

  await request('admin/overview', null, { status: 401 });
  await request('admin/overview', seller, { status: 403 });

  const plainTitle = `Plain textbook ${suffix}`;
  const photoTitle = `Photo textbook ${suffix}`;
  const lampTitle = `Photo lamp ${suffix}`;
  const plainId = await createListing(seller, plainTitle);
  const photoListing = await createPhotoListing(seller, photoTitle);
  const lampListing = await createPhotoListing(seller, lampTitle);
  const calculatorId = await createListing(buyer, `Calculator ${suffix}`);
  await assertPhotoStatus(photoListing.imageUrl, 200);

  const propose = (body) => request('proposals', buyer, { method: 'POST', status: 204, body });
  await propose({ target_item_id: photoListing.id, kind: 'item', offered_item_id: calculatorId });
  let buyerHistory = await request('proposals/history', buyer);
  const firstProposal = buyerHistory.find((row) => row.title === photoTitle);
  assert.ok(firstProposal);

  const overview = await request('admin/overview', admin);
  assert.ok(overview.users >= 5 && overview.photos >= 2 && overview.pendingProposals >= 1);

  const found = await request(`admin/listings?search=${encodeURIComponent(suffix)}&status=available`, admin);
  assert.equal(Number(found.find((item) => item.id === photoListing.id)?.pending_proposals), 1);

  await request(`admin/proposals/${firstProposal.id}/cancel`, admin, { method: 'POST', body: {} });
  buyerHistory = await request('proposals/history', buyer);
  assert.equal(buyerHistory.find((row) => row.id === firstProposal.id)?.status, 'cancelled');

  await propose({ target_item_id: photoListing.id, kind: 'item', offered_item_id: calculatorId });
  await propose({ target_item_id: lampListing.id, kind: 'cash', amount: 250 });

  await request(`admin/listings/${photoListing.id}/remove-photo`, admin, { method: 'POST', body: {} });
  let [[photoRow]] = await db.query('SELECT image_url, photo_removed_by_admin FROM items WHERE id = ?', [photoListing.id]);
  assert.equal(photoRow.image_url, null);
  assert.equal(Number(photoRow.photo_removed_by_admin), 1);
  await assertPhotoStatus(photoListing.imageUrl, 404);

  // Another student cannot replace the photo; the owner can, which clears
  // the "removed by admin" prompt.
  await uploadReplacementPhoto(buyer, photoListing.id, 404);
  const replacement = await uploadReplacementPhoto(seller, photoListing.id);
  [[photoRow]] = await db.query('SELECT image_url, photo_removed_by_admin FROM items WHERE id = ?', [photoListing.id]);
  assert.equal(photoRow.image_url, replacement.image_url);
  assert.equal(Number(photoRow.photo_removed_by_admin), 0);
  await assertPhotoStatus(replacement.image_url, 200);
  const [mine] = [await request('items/my-items', seller)];
  assert.equal(mine.find((item) => item.id === photoListing.id)?.image_url, replacement.image_url);

  await request(`admin/listings/${lampListing.id}/delete`, admin, { method: 'POST', body: {} });
  const [[lampRow]] = await db.query('SELECT status, image_url FROM items WHERE id = ?', [lampListing.id]);
  assert.deepEqual([lampRow.status, lampRow.image_url], ['deleted', null]);
  await assertPhotoStatus(lampListing.imageUrl, 404);
  buyerHistory = await request('proposals/history', buyer);
  assert.equal(buyerHistory.find((row) => row.title === lampTitle)?.status, 'rejected');
  assert.ok(!(await request('items', null)).some((item) => item.id === lampListing.id));

  const adminUsers = await request('admin/users?search=' + encodeURIComponent(suffix), admin);
  const sellerRow = adminUsers.find((account) => account.email === sellerAccount.email);
  const buyerRow = adminUsers.find((account) => account.email === buyerAccount.email);
  const otherRow = adminUsers.find((account) => account.email === otherAccount.email);
  const victimRow = adminUsers.find((account) => account.email === victimAccount.email);
  assert.ok(sellerRow && buyerRow && otherRow && victimRow);

  await request(`admin/users/${sellerRow.id}/suspend`, admin, { method: 'POST', body: {} });
  await login(sellerAccount, 403);
  await request('items/my-items', seller, { status: 403 });
  assert.ok(!(await request('items', null)).some((item) => item.id === plainId));
  buyerHistory = await request('proposals/history', buyer);
  assert.equal(buyerHistory.find((row) => row.title === photoTitle)?.status, 'rejected');

  await request(`admin/users/${sellerRow.id}/reactivate`, admin, { method: 'POST', body: {} });
  await login(sellerAccount);
  assert.ok((await request('items', null)).some((item) => item.id === plainId));

  await request(`admin/users/${otherRow.id}/role`, admin, { method: 'POST', body: { role: 'admin' } });
  await request('admin/overview', other);
  await request(`admin/users/${otherRow.id}/role`, admin, { method: 'POST', body: { role: 'student' } });
  await request('admin/overview', other, { status: 403 });

  const [[adminRow]] = await db.query('SELECT id FROM users WHERE email = ?', [adminCandidate.email]);
  await request(`admin/users/${adminRow.id}/suspend`, admin, { method: 'POST', body: {}, status: 409 });
  await request(`admin/users/${adminRow.id}/role`, admin, { method: 'POST', body: { role: 'student' }, status: 409 });
  await request(`admin/users/${adminRow.id}`, admin, { method: 'DELETE', status: 409 });

  const victimPhoto = await createPhotoListing(victim, `Victim photo ${suffix}`);
  await assertPhotoStatus(victimPhoto.imageUrl, 200);
  await request(`admin/users/${victimRow.id}`, admin, { method: 'DELETE' });
  await login(victimAccount, 401);
  await assertPhotoStatus(victimPhoto.imageUrl, 404);
  const [[deletedVictim]] = await db.query('SELECT COUNT(*) AS total FROM users WHERE id = ?', [victimRow.id]);
  assert.equal(Number(deletedVictim.total), 0);

  await request(`admin/users/${buyerRow.id}`, admin, { method: 'DELETE' });
  await login(buyerAccount, 401);
  const buyerListings = await request(`admin/listings?search=${encodeURIComponent(`Calculator ${suffix}`)}`, admin);
  assert.ok(!buyerListings.some((item) => item.id === calculatorId));

  const actions = new Set((await request('admin/activity', admin)).map((entry) => entry.action));
  for (const action of ['photo_removed', 'listing_deleted', 'user_suspended', 'user_reactivated', 'user_promoted', 'user_demoted', 'proposal_cancelled', 'user_deleted']) {
    assert.ok(actions.has(action), `Missing audit action ${action}`);
  }

  console.log('Admin panel integration checks passed.');
} finally {
  await db.end();
}
