import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

import api from '../utils/proposalApi.js';

export function OfferForm({target}) {
  const {token} = useAuth();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('item');
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function begin() {
    setOpen(true); setNotice('');
    try { setItems((await api('items/my-items',token)).filter(i => i.status === 'available')); }
    catch (e) { setNotice(e.message); }
  }
  async function send(e) {
    e.preventDefault(); setBusy(true);
    const form = new FormData(e.currentTarget);
    const offer = {target_item_id: target, kind};
    if (kind === 'item') offer.offered_item_id = Number(form.get('item'));
    if (kind === 'cash') offer.amount = form.get('amount');
    try { await api('proposals',token,offer); setOpen(false); setNotice('Proposal sent to the owner.'); }
    catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  }
  return <div className="mt-2">
    {!open ? <button className="btn-secondary w-full" onClick={begin}>Propose barter</button> :
      <form onSubmit={send} className="space-y-2">
        <label>Offer type<select className="input-field" value={kind} onChange={e=>setKind(e.target.value)}>
          <option value="item">My item</option><option value="cash">Cash</option><option value="free">Request for free</option></select></label>
        {kind === 'item' && <label>Your listing<select name="item" required className="input-field"><option value="">Choose an available listing</option>{items.map(i=><option key={i.id} value={i.id}>{i.title}</option>)}</select></label>}
        {kind === 'cash' && <label>Amount (₹)<input className="input-field" name="amount" type="number" min="0.01" max="99999999.99" step="0.01" required /></label>}
        <button disabled={busy} className="btn-primary">Send proposal</button> <button type="button" onClick={()=>setOpen(false)}>Cancel</button>
      </form>}
    <p role="status" className="text-sm">{notice}</p>
  </div>;
}

export function IncomingOffers({onChange}) {
  const {token} = useAuth();
  const [rows,setRows] = useState([]);
  const [error,setError] = useState('');
  async function load() {
    try { setRows(await api('proposals',token)); }
    catch(e) { setError(e.message); }
  }
  useEffect(()=>{load();},[token]);
  async function decide(id,decision) {
    setError('');
    try { await api(`proposals/${id}/${decision}`,token,{}); onChange(); }
    catch(e) { setError(e.message); }
    await load();
  }
  return <section className="card p-4 mb-5"><h2 className="font-bold">Incoming proposals</h2>
    {error && <p role="alert">{error}</p>}{!rows.length && !error && <p>No pending proposals.</p>}
    {rows.map(r=><div key={r.id} className="border-t py-3"><p>{r.name} requests <b>{r.title}</b> {r.kind === 'free' ? 'for free' : `in exchange for ${r.kind === 'cash' ? `₹${r.amount}` : r.offered_title}`}</p>
      <button className="btn-primary" onClick={()=>decide(r.id,'accept')}>Accept and mark as swapped</button> <button className="btn-secondary" onClick={()=>decide(r.id,'reject')}>Reject</button></div>)}
  </section>;
}
