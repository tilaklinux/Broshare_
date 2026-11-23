import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Inbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages/conversations", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("hostelbarter_token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      } else {
        throw new Error("API failed");
      }
    } catch {
      setError("Could not contact the server. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {error && <p role="alert">{error}</p>}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900">Inbox</h1>
        <p className="text-gray-500 mt-1">
          {(() => {
            const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
            const unreadChats = conversations.filter((c) => c.unread_count > 0).length;
            return totalUnread > 0
              ? `${totalUnread} unread message${totalUnread !== 1 ? "s" : ""} from ${unreadChats} student${unreadChats !== 1 ? "s" : ""}`
              : "Your conversations with other students";
          })()}
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            No messages yet
          </h3>
          <p className="text-gray-500 mb-4">
            Start a conversation by messaging an item owner!
          </p>
          <Link to="/" className="btn-primary inline-block">
            Browse Items
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.user_id}
              to={`/chat/${conv.user_id}`}
              className="card p-4 items-center gap-4 hover:bg-gray-50 transition-colors block"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-lg font-bold text-emerald-700 shrink-0">
                {conv.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-gray-900">{conv.name}</h3>
                  <span className="flex items-center gap-2 shrink-0">
                    {conv.unread_count > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                        {conv.unread_count}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(conv.created_at).toLocaleDateString()}
                    </span>
                  </span>
                </div>
                <p className={`text-sm truncate ${conv.unread_count > 0 ? "text-gray-900 font-semibold" : "text-gray-500"}`}>
                  {conv.last_message}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {conv.hostel_name} · Room {conv.room_number}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-gray-300 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Inbox;
