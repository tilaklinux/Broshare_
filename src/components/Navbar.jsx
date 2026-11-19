import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🏠</span>
            </div>
            <span className="text-xl font-bold text-gray-900">HostelBarter</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link to="/post-item" className="btn-primary text-sm hidden sm:inline-flex items-center gap-1.5">
                  <span>+</span> Post Item
                </Link>
                <Link to="/my-listings" className="btn-secondary text-sm hidden sm:inline-flex">
                  My Listings
                </Link>
                <Link to="/inbox" className="btn-secondary text-sm hidden sm:inline-flex items-center gap-1.5">
                  💬 Inbox
                </Link>
                <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-gray-200">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.hostel_name} · Rm {user.room_number}</p>
                  </div>
                  <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors ml-2" title="Logout">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
                {/* Mobile menu */}
                <div className="flex sm:hidden gap-1">
                  <Link to="/post-item" className="p-2 text-emerald-600 text-lg">+</Link>
                  <Link to="/inbox" className="p-2 text-gray-600 text-lg">💬</Link>
                  <button onClick={handleLogout} className="p-2 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm">Login</Link>
                <Link to="/register" className="btn-primary text-sm">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
