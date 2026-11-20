// Integration test against a running API backed by a disposable database.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import db from '../db.js';

const base = process.env.TEST_API_URL || 'http://127.0.0.1:5000/api';
const suffix = randomUUID();
async function request(path, token, body, status = 200, method = body ? 'POST' : 'GET') {
  const res = await fetch(`${base}/${path}`, {method, headers: {
    'Content-Type': 'application/json', ...(token && {Authorization:`Bearer ${token}`}),
  }, body: body && JSON.stringify(body)});
  const text = await res.text();
  assert.equal(res.status, status, `${method} ${path}: ${text}`);
  return text && JSON.parse(text);
}
const register = async name => (await request('auth/register', null, {
  name, email:`${name}-${suffix}@example.test`, password:suffix, hostel_name:'A', room_number:'101',
}, 201)).token;
const list = async (token, title) => (await request('items', token, {
  title, category:'Books', description:title, looking_for:'Offers',
}, 201)).id;
const history = token => request('proposals/history', token);
const act = (id, action, token, status=204) => request(`proposals/${id}/${action}`, token, {}, status);
try {
  const [a,b,c] = await Promise.all(['Owner','Swapper','Bidder'].map(register));
  const textbook = await list(a,'Textbook');
  const calculator = await list(b,'Calculator');
  const offer = (token, props) => request('proposals',token,{target_item_id:textbook,...props},204);
  await offer(b,{kind:'item',offered_item_id:calculator});
  await offer(c,{kind:'free'});
  const [free] = await history(c);
  await act(free.id,'withdraw',a,409);
  await act(free.id,'withdraw',c);
  await act(free.id,'accept',a,409);
  await offer(c,{kind:'cash',amount:300});
  const [swap] = await history(b);
  assert.equal(swap.owner_name,'Owner');
  assert.equal(swap.offered_title,'Calculator');
  assert.equal((await history(a)).length,3);
  await act(swap.id,'accept',a);
  await act(swap.id,'withdraw',b,409);
  assert.deepEqual((await history(c)).map(r=>r.status),['rejected','withdrawn']);
  assert.deepEqual((await history(b)).map(r=>r.status),['accepted']);
  assert.ok(!(await request('items')).some(i=>[textbook,calculator].includes(i.id)));
  const [[{total}]] = await db.query('SELECT COUNT(*) AS total FROM completed_trades WHERE request_id=?',[swap.id]);
  assert.equal(Number(total),1);
  await request(`items/${textbook}`,a,null,200,'DELETE');
  assert.equal((await history(b))[0].title,'Textbook');
  console.log('Three-student trade history checks passed.');
} finally { await db.end(); }
