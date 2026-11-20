import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../utils/proposalApi.js';

const badges = {
  pending: 'bg-amber-100 text-amber-800', accepted: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800', withdrawn: 'bg-gray-100 text-gray-700',
};

export default function Trades() {
  const { user, token } = useAuth();
  const [sent, setSent] = useState(false);
  const [rows, setRows] = useState(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    setRows(null);
    api('proposals/history', token)
      .then(data => { if (current) setRows(data); })
      .catch(err => { if (current) setError(err.message); });
    return () => { current = false; };
  }, [revision, token]);

  async function decide(id, action) {
    setBusy(true);
    setError('');
    try { await api(`proposals/${id}/${action}`, token, {}); }
    catch (err) { setError(err.message); }
    finally { setRevision(n => n + 1); setBusy(false); }
  }

  const offers = rows?.filter(row => (row.requester_id === user.id) === sent);
  return <section className="max-w-3xl mx-auto space-y-4">
    <h1 className="text-3xl font-bold">Trades</h1>
    <p className="text-gray-600">Review your offers and see how past trades turned out.</p>
    <div className="flex flex-wrap gap-2">
      {[false, true].map(value => <button key={String(value)} aria-pressed={sent === value}
        className={sent === value ? 'btn-primary' : 'btn-secondary'} onClick={() => setSent(value)}>
        {value ? 'Sent' : 'Received'}</button>)}
      <button className="btn-secondary ml-auto" disabled={busy} onClick={() => { setError(''); setRevision(n => n+1); }}>Refresh</button>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!rows && !error && <p role="status">Loading offers…</p>}
    {offers?.length === 0 && <p className="card p-5">No {sent ? 'sent' : 'received'} offers yet.</p>}
    {offers?.map(r => <article key={r.id} className="card p-5 space-y-2">
      <div className="flex justify-between items-start gap-2"><h2 className="font-bold break-words">{r.title}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badges[r.status]}`}>{r.status}</span></div>
      <p>{sent ? `To: ${r.owner_name}` : `From: ${r.requester_name}`}</p>
      <p>Offer: {r.kind === 'item' ? r.offered_title : r.kind === 'cash' ? `₹${r.amount}` : 'Requested for free'}</p>
      {r.status === 'pending' && <div className="flex flex-wrap gap-2">
        {sent ? <button disabled={busy} className="btn-secondary" onClick={() => decide(r.id,'withdraw')}>Withdraw offer</button> : <>
          <button disabled={busy} className="btn-primary" onClick={() => decide(r.id,'accept')}>Accept and mark as swapped</button>
          <button disabled={busy} className="btn-secondary" onClick={() => decide(r.id,'reject')}>Reject</button>
        </>}
      </div>}
    </article>)}
  </section>;
}
