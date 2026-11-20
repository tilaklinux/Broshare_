import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { IncomingOffers } from '../components/Proposals.jsx';

const categoryIcons = {
  Books: '📚', Electronics: '🔌', Accessories: '🎒', Essentials: '🏠', Other: '📦',
};

function MyListings() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error,setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items/my-items', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hostelbarter_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        throw new Error('API failed');
      }
    } catch {
      setError('Could not contact the server. Please try again.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, [user.id]);

  const markAsBartered = async (itemId) => {
    try {
      const res = await fetch(`/api/items/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('hostelbarter_token')}`
        },
        body: JSON.stringify({ status: 'bartered' }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError('Listing could not be updated.');
    }
    fetchItems();
  };

  const markAsAvailable = async (itemId) => {
    try {
      const res = await fetch(`/api/items/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('hostelbarter_token')}`
        },
        body: JSON.stringify({ status: 'available' }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError('Listing could not be updated.');
    }
    fetchItems();
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hostelbarter_token')}` }
      });
      if (!res.ok) throw new Error();
    } catch {
      setError('Listing could not be updated.');
    }
    fetchItems();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My Listings</h1>
          <p className="text-gray-500 mt-1">{items.length} item{items.length !== 1 ? 's' : ''} listed</p>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      <IncomingOffers onChange={fetchItems} />
      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No listings yet</h3>
          <p className="text-gray-500 mb-4">Start by posting an item to barter or share!</p>
          <a href="/post-item" className="btn-primary inline-block">+ Post Your First Item</a>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="card p-4 flex gap-4 items-start">
              {/* Thumbnail */}
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{categoryIcons[item.category] || '📦'}</span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{item.category} · Looking for: {item.looking_for}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${
                    item.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.status === 'available' ? '✅ Available' : '🔄 Bartered'}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  {item.status === 'available' ? (
                    <button onClick={() => markAsBartered(item.id)} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-200 transition-colors">
                      Mark as Bartered
                    </button>
                  ) : (
                    <button onClick={() => markAsAvailable(item.id)} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200 transition-colors">
                      Mark Available
                    </button>
                  )}
                  <button onClick={() => deleteItem(item.id)} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyListings;
