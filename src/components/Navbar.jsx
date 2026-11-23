import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
// import logo from "../assets/Broshare.png";
import logo2 from "../assets/logo_.png";
import { s } from "framer-motion/m";

function Navbar() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState({ conversations: 0, messages: 0 });
  const [toast, setToast] = useState(null);
  const notifiedIdRef = useRef(0);

  // Poll for unread messages; pop a toast when a genuinely new one arrives.
  useEffect(() => {
    if (!user || !token) {
      setUnread({ conversations: 0, messages: 0 });
      setToast(null);
      return undefined;
    }
    const storageKey = `broshare_last_notified_message_${user.id}`;
    notifiedIdRef.current = Number(localStorage.getItem(storageKey)) || 0;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/messages/unread-summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setUnread({
          conversations: data.unread_conversations || 0,
          messages: data.unread_messages || 0,
        });
        const latest = data.latest;
        if (latest && latest.id > notifiedIdRef.current) {
          notifiedIdRef.current = latest.id;
          localStorage.setItem(storageKey, String(latest.id));
          // Don't pop a toast for a chat the user is already reading.
          if (location.pathname !== `/chat/${latest.sender_id}`) {
            setToast({ ...latest, unreadMessages: data.unread_messages });
          }
        }
      } catch {
        // Keep the last known counts if the server is briefly unreachable.
      }
    };

    poll();
    const interval = setInterval(poll, 8000);
    window.addEventListener("focus", poll);
    window.addEventListener("broshare:messages-changed", poll);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", poll);
      window.removeEventListener("broshare:messages-changed", poll);
    };
  }, [user, token, location.pathname]);

  // Auto-dismiss the popup after a few seconds.
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const unreadBadge = unread.conversations > 0 && (
    <span
      className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center"
      title={`${unread.conversations} conversation(s) with ${unread.messages} unread message(s)`}
    >
      {unread.conversations > 99 ? "99+" : unread.conversations}
    </span>
  );

  return (
    <>
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-auto h-6 bg-emerald-600 rounded-xl flex items-center justify-center">
              {/* <span className="text-white text-lg">🏠</span> */}
              <Link to="/" className="flex items-center gap-2">
                <img
                  src={logo2}
                  alt="BroShare Logo"
                  className="h-16 w-auto object-contain"
                />
              </Link>
            </div>
            <span className="text-xl font-bold text-gray-900">Home</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/post-item"
                  className="btn-primary text-sm hidden sm:inline-flex items-center gap-1.5"
                >
                  <span>+</span> Post Item
                </Link>
                <Link
                  to="/my-listings"
                  className="btn-secondary text-sm hidden sm:inline-flex"
                >
                  My Listings
                </Link>
                <Link to="/trades" className="btn-secondary text-sm">Trades</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="btn-secondary text-sm hidden sm:inline-flex">
                    🛡️ Admin
                  </Link>
                )}
                <Link
                  to="/inbox"
                  className="btn-secondary text-sm hidden sm:inline-flex items-center gap-1.5 relative"
                >
                  💬 Inbox
                  {unreadBadge}
                </Link>
                <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-gray-200">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.hostel_name} · Rm {user.room_number}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                    title="Logout"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
                {/* Mobile menu */}
                <div className="flex sm:hidden gap-1">
                  <Link
                    to="/post-item"
                    className="p-2 text-emerald-600 text-lg"
                  >
                    +
                  </Link>
                  <Link to="/inbox" className="p-2 text-gray-600 text-lg relative">
                    💬
                    {unreadBadge}
                  </Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="p-2 text-gray-600 text-lg" title="Admin panel">
                      🛡️
                    </Link>
                  )}
                  <button onClick={handleLogout} className="p-2 text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
    {toast && (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[60] w-[min(92vw,22rem)] card p-4 shadow-xl cursor-pointer"
        onClick={() => {
          setToast(null);
          navigate(`/chat/${toast.sender_id}`);
        }}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">💬</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">
              New message from {toast.sender_name}
            </p>
            <p className="text-sm text-gray-600 truncate">{toast.content}</p>
            {toast.unreadMessages > 1 && (
              <p className="text-xs text-gray-400 mt-0.5">
                {toast.unreadMessages} unread messages
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation();
              setToast(null);
            }}
          >
            ✕
          </button>
        </div>
      </div>
    )}
    </>
  );
}

export default Navbar;
