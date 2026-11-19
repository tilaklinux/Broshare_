import { useState, useEffect } from 'react';
import ItemCard from '../components/ItemCard.jsx';
import { getMockItems, CATEGORIES } from '../utils/mockData.js';

function Home() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to fetch from backend API first, fall back to mock data
    const fetchItems = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/items');
        if (res.ok) {
          const data = await res.json();
          setItems(data.filter(i => i.status === 'available'));
        } else {
          setItems(getMockItems().filter(i => i.status === 'available'));
        }
      } catch {
        setItems(getMockItems().filter(i => i.status === 'available'));
      }
      setLoading(false);
    };
    fetchItems();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="text-center mb-8 pt-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3">
          Barter & Share at <span className="text-emerald-600">Your Hostel</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Exchange books, electronics, and essentials with fellow students. No money needed — just trade what you have for what you need!
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-12"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategory('All')}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              category === 'All' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                category === cat ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No items found</h3>
          <p className="text-gray-500">Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  );
}

export default Home;
