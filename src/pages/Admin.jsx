import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { adminRequest } from '../utils/adminApi.js';
import ListingPhoto from '../components/ListingPhoto.jsx';

const tabs = [
  ['overview', 'Overview'],
  ['listings', 'Listings'],
  ['users', 'Users'],
  ['photos', 'Photos'],
  ['trades', 'Trades'],
  ['activity', 'Activity'],
];

const badgeClasses = {
  available: 'bg-emerald-100 text-emerald-800',
  active: 'bg-emerald-100 text-emerald-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  bartered: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
  suspended: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
  deleted: 'bg-gray-200 text-gray-700',
  withdrawn: 'bg-gray-200 text-gray-700',
  cancelled: 'bg-purple-100 text-purple-800',
  admin: 'bg-purple-100 text-purple-800',
  student: 'bg-gray-100 text-gray-700',
};

function Badge({ children }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClasses[children] || badgeClasses.student}`}>
      {children}
    </span>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : '';
}

function offerText(trade) {
  if (trade.kind === 'item') return trade.offered_title || 'An item';
  if (trade.kind === 'cash') return `₹${trade.amount}`;
  return 'Requested for free';
}

export default function Admin() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [listings, setListings] = useState(null);
  const [users, setUsers] = useState(null);
  const [photos, setPhotos] = useState(null);
  const [trades, setTrades] = useState(null);
  const [activity, setActivity] = useState(null);
  const [listingSearch, setListingSearch] = useState('');
  const [listingStatus, setListingStatus] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userStatus, setUserStatus] = useState('all');
  const [userRole, setUserRole] = useState('all');
  const [photoSearch, setPhotoSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyKey, setBusyKey] = useState('');

  async function loadOverview() {
    setOverview(await adminRequest('overview', token));
  }

  async function loadListings() {
    const query = new URLSearchParams({ search: listingSearch, status: listingStatus });
    setListings(await adminRequest(`listings?${query}`, token));
  }

  async function loadPhotos() {
    const query = new URLSearchParams({ search: photoSearch });
    setPhotos(await adminRequest(`photos?${query}`, token));
  }

  async function loadUsers() {
    const query = new URLSearchParams({ search: userSearch, status: userStatus, role: userRole });
    setUsers(await adminRequest(`users?${query}`, token));
  }

  async function loadTrades() {
    setTrades(await adminRequest('trades', token));
  }

  async function loadActivity() {
    setActivity(await adminRequest('activity', token));
  }

  async function loadTab(tab = activeTab) {
    setError('');
    try {
      if (tab === 'overview') await Promise.all([loadOverview(), loadActivity()]);
      if (tab === 'listings') await loadListings();
      if (tab === 'users') await loadUsers();
      if (tab === 'photos') await loadPhotos();
      if (tab === 'trades') await loadTrades();
      if (tab === 'activity') await loadActivity();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadTab(activeTab);
    // Reloading intentionally follows tab/filter changes; action handlers
    // call loadTab directly after a successful change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, listingSearch, listingStatus, userSearch, userStatus, userRole, photoSearch, token]);

  async function perform(key, request, confirmation) {
    if (confirmation && !window.confirm(confirmation)) return;
    setBusyKey(key);
    setError('');
    setNotice('');
    try {
      const result = await request();
      setNotice(result?.message || 'Admin action completed.');
      await loadTab();
      if (activeTab !== 'overview') loadOverview().catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  }

  const listingActions = (item) => (
    <div className="flex flex-wrap gap-2">
      {item.image_url && (
        <button
          type="button"
          disabled={busyKey !== ''}
          className="btn-danger text-sm"
          onClick={() => perform(
            `photo-${item.id}`,
            () => adminRequest(`listings/${item.id}/remove-photo`, token, { method: 'POST', body: {} }),
            `Remove the photo from “${item.title}”? The uploaded file will be deleted, but the listing will stay online.`,
          )}
        >
          Remove photo
        </button>
      )}
      {item.status === 'deleted' ? (
        <button
          type="button"
          disabled={busyKey !== ''}
          className="btn-primary text-sm"
          onClick={() => perform(
            `restore-${item.id}`,
            () => adminRequest(`listings/${item.id}/restore`, token, { method: 'POST', body: {} }),
            `Restore “${item.title}” as an available listing?`,
          )}
        >
          Restore listing
        </button>
      ) : (
        <button
          type="button"
          disabled={busyKey !== ''}
          className="btn-danger text-sm"
          onClick={() => perform(
            `listing-${item.id}`,
            () => adminRequest(`listings/${item.id}/delete`, token, { method: 'POST', body: {} }),
            `Remove “${item.title}” from the marketplace? Its photo file will be deleted and pending proposals involving it will be rejected. Resolved trade history will remain readable.`,
          )}
        >
          Delete listing
        </button>
      )}
    </div>
  );

  const statCards = overview ? [
    ['Students & admins', overview.users],
    ['Active accounts', overview.activeUsers],
    ['Suspended accounts', overview.suspendedUsers],
    ['Admins', overview.admins],
    ['Live listings', overview.listings],
    ['Available listings', overview.availableListings],
    ['Listings with photos', overview.photos],
    ['Pending proposals', overview.pendingProposals],
    ['Completed trades', overview.completedTrades],
    ['Messages', overview.messages],
    ['Removed listings', overview.deletedListings],
  ] : [];

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Admin Panel</h1>
          <p className="mt-1 text-gray-500">
            Moderate listings, photos, accounts, and pending trades. Server-side admin checks protect every action.
          </p>
        </div>
        <button type="button" className="btn-secondary" disabled={busyKey !== ''} onClick={() => loadTab()}>
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Admin sections">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={activeTab === id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">{notice}</p>}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {!overview && !error && <p role="status">Loading overview…</p>}
          {overview && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {statCards.map(([label, value]) => (
                <article key={label} className="card p-5">
                  <p className="text-sm font-medium text-gray-500">{label}</p>
                  <p className="mt-2 text-3xl font-extrabold text-gray-900">{value}</p>
                </article>
              ))}
            </div>
          )}
          <section className="card p-5">
            <h2 className="text-xl font-bold">Recent admin activity</h2>
            {!activity && !error && <p className="mt-3">Loading activity…</p>}
            {activity?.length === 0 && <p className="mt-3 text-gray-500">No admin actions recorded yet.</p>}
            <div className="mt-3 divide-y divide-gray-100">
              {activity?.slice(0, 8).map((entry) => (
                <p key={entry.id} className="py-3 text-sm">
                  <strong>{entry.admin_name || 'An admin'}</strong> — {entry.action.replaceAll('_', ' ')}:{' '}
                  {entry.target_label || `${entry.target_type} #${entry.target_id}`}
                  <span className="block text-gray-500">{formatDate(entry.created_at)}</span>
                </p>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="card flex flex-col gap-3 p-4 md:flex-row">
            <input className="input-field flex-1" type="search" value={listingSearch} onChange={(e) => setListingSearch(e.target.value)} placeholder="Search title, description, owner name, or email" aria-label="Search listings" />
            <select className="input-field md:w-48" value={listingStatus} onChange={(e) => setListingStatus(e.target.value)} aria-label="Listing status">
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="bartered">Bartered</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
          {!listings && !error && <p role="status">Loading listings…</p>}
          {listings?.length === 0 && <p className="card p-5">No listings match these filters.</p>}
          {listings?.map((item) => (
            <article key={item.id} className="card flex flex-col gap-4 p-4 sm:flex-row">
              <div className="h-36 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-48">
                {item.image_url ? <ListingPhoto src={item.image_url} title={item.title} /> : <div className="flex h-full items-center justify-center text-gray-400">No photo</div>}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-lg font-bold break-words">{item.title}</h2>
                  <Badge>{item.status}</Badge>
                </div>
                <p className="text-sm text-gray-600">{item.description}</p>
                <p className="text-sm"><strong>Looking for:</strong> {item.looking_for}</p>
                <p className="text-sm text-gray-600">
                  Owner: {item.owner_name} ({item.owner_email}) · {item.owner_hostel_name}, Room {item.owner_room_number}
                </p>
                <p className="text-xs text-gray-500">
                  {item.category} · Posted {formatDate(item.created_at)} · {item.pending_proposals} pending proposal(s)
                </p>
                {listingActions(item)}
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="card flex flex-col gap-3 p-4 lg:flex-row">
            <input className="input-field flex-1" type="search" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search name, email, hostel, or room" aria-label="Search users" />
            <select className="input-field lg:w-44" value={userStatus} onChange={(e) => setUserStatus(e.target.value)} aria-label="User status">
              <option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
            </select>
            <select className="input-field lg:w-44" value={userRole} onChange={(e) => setUserRole(e.target.value)} aria-label="User role">
              <option value="all">All roles</option><option value="student">Students</option><option value="admin">Admins</option>
            </select>
          </div>
          {!users && !error && <p role="status">Loading users…</p>}
          {users?.length === 0 && <p className="card p-5">No users match these filters.</p>}
          {users?.map((account) => {
            const isSelf = account.id === user.id;
            return (
              <article key={account.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{account.name} {isSelf && <span className="text-sm text-emerald-700">(You)</span>}</h2>
                    <p className="text-sm text-gray-600">{account.email}</p>
                    <p className="text-sm text-gray-600">{account.hostel_name} · Room {account.room_number} · Joined {formatDate(account.created_at)}</p>
                    <p className="mt-1 text-xs text-gray-500">{account.listing_count} listing(s) · {account.photo_count} photo(s) · {account.message_count} message(s)</p>
                  </div>
                  <div className="flex gap-2"><Badge>{account.role}</Badge><Badge>{account.status}</Badge></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {account.status === 'suspended' ? (
                    <button type="button" className="btn-primary text-sm" disabled={busyKey !== ''} onClick={() => perform(`reactivate-${account.id}`, () => adminRequest(`users/${account.id}/reactivate`, token, { method: 'POST', body: {} }), `Reactivate ${account.name}'s account?`)}>
                      Reactivate
                    </button>
                  ) : (
                    <button type="button" className="btn-secondary text-sm" disabled={busyKey !== '' || isSelf || account.role === 'admin'} title={account.role === 'admin' ? 'Remove admin access before suspending this account' : undefined} onClick={() => perform(`suspend-${account.id}`, () => adminRequest(`users/${account.id}/suspend`, token, { method: 'POST', body: {} }), `Suspend ${account.name}? They will be signed out immediately, their listings will be hidden, and their pending proposals will be rejected.`)}>
                      Suspend
                    </button>
                  )}
                  {!isSelf && (
                    <button type="button" className="btn-secondary text-sm" disabled={busyKey !== ''} onClick={() => perform(`role-${account.id}`, () => adminRequest(`users/${account.id}/role`, token, { method: 'POST', body: { role: account.role === 'admin' ? 'student' : 'admin' } }), account.role === 'admin' ? `Remove admin access from ${account.name}?` : `Give ${account.name} full admin access?`)}>
                      {account.role === 'admin' ? 'Remove admin' : 'Make admin'}
                    </button>
                  )}
                  <button type="button" className="btn-danger text-sm" disabled={busyKey !== '' || isSelf || account.role === 'admin'} title={account.role === 'admin' ? 'Remove admin access before deleting this account' : undefined} onClick={() => perform(`user-${account.id}`, () => adminRequest(`users/${account.id}`, token, { method: 'DELETE' }), `Permanently delete ${account.name} and their listings, messages, proposals, and uploaded photos? This cannot be undone.`)}>
                    Delete user
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="space-y-4">
          <input className="input-field" type="search" value={photoSearch} onChange={(e) => setPhotoSearch(e.target.value)} placeholder="Search photos by listing or owner" aria-label="Search photos" />
          {!photos && !error && <p role="status">Loading photos…</p>}
          {photos?.length === 0 && <p className="card p-5">No listing photos match this search.</p>}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {photos?.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                <div className="h-56 bg-gray-100"><ListingPhoto src={item.image_url} title={item.title} /></div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2"><h2 className="font-bold">{item.title}</h2><Badge>{item.status}</Badge></div>
                  <p className="text-sm text-gray-600">{item.owner_name} ({item.owner_email})</p>
                  {listingActions(item)}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'trades' && (
        <div className="space-y-4">
          {!trades && !error && <p role="status">Loading trades…</p>}
          {trades?.length === 0 && <p className="card p-5">No proposals found.</p>}
          {trades?.map((trade) => (
            <article key={trade.id} className="card space-y-2 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="font-bold">{trade.title}</h2><Badge>{trade.status}</Badge>
              </div>
              <p className="text-sm">{trade.requester_name} offered <strong>{offerText(trade)}</strong> to {trade.owner_name}.</p>
              <p className="text-xs text-gray-500">Target listing: {trade.target_status}</p>
              {trade.status === 'pending' && (
                <button type="button" className="btn-danger text-sm" disabled={busyKey !== ''} onClick={() => perform(`proposal-${trade.id}`, () => adminRequest(`proposals/${trade.id}/cancel`, token, { method: 'POST', body: {} }), 'Cancel this pending proposal? Both students will see it as cancelled.')}>
                  Cancel pending proposal
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card p-5">
          <h2 className="text-xl font-bold">Admin activity</h2>
          {!activity && !error && <p className="mt-3">Loading activity…</p>}
          {activity?.length === 0 && <p className="mt-3 text-gray-500">No admin actions recorded yet.</p>}
          <div className="mt-3 divide-y divide-gray-100">
            {activity?.map((entry) => (
              <article key={entry.id} className="py-4">
                <p><strong>{entry.admin_name || 'Deleted admin'}</strong> — {entry.action.replaceAll('_', ' ')}</p>
                <p className="text-sm text-gray-600">{entry.target_label || `${entry.target_type} #${entry.target_id}`}</p>
                {entry.details && <p className="text-sm text-gray-500">{entry.details}</p>}
                <p className="text-xs text-gray-400">{formatDate(entry.created_at)}</p>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
