import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMockMessages, getMockUsers, getDemoUser } from '../utils/mockData.js';

function Inbox() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/messages/conversations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hostelbarter_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      } else {
        throw new Error('API failed');
      }
    } catch {
      // Demo mode: build conversations from mock data
      const messages = getMockMessages();
      const users = getMockUsers();
      const userMsgs = messages.filter(m => m.sender_id === user.id || m.receiver_id === user.id);
      
      const convMap = {};
      userMsgs.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (!convMap[otherId] || new Date(msg.created_at) > new Date(convMap[otherId].created_at)) {
          const otherUser = users.find(u => u.id === otherId) || getDemoUser(otherId) || { name: 'Unknown', hostel_name: '', room_number: '' };
          convMap[otherId] = {
            user_id: otherId,
            name: otherUser.name,
            hostel_name: otherUser.hostel_name,
            room_number: otherUser.room_number,
            last_message: msg.content,
            created_at: msg.created_at,
          };
        }
      });
      setConversations(Object.values(convMap).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    }
    setLoading(false);
  };

  useEffect(() => { fetchConversations(); }, [user.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900">Inbox</h1>
        <p className="text-gray-500 mt-1">Your conversations with other students</p>
      </div>

      {conversations.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">💬</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No messages yet</h3>
          <p className="text-gray-500 mb-4">Start a conversation by messaging an item owner!</p>
          <Link to="/" className="btn-primary inline-block">Browse Items</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <Link
              key={conv.user_id}
              to={`/chat/${conv.user_id}`}
              className="card p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors block"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-lg font-bold text-emerald-700 flex-shrink-0">
                {conv.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">{conv.name}</h3>
                  <span className="text-xs text-gray-400">
                    {new Date(conv.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                <p className="text-xs text-gray-400 mt-0.5">{conv.hostel_name} · Room {conv.room_number}</p>
              </div>
              <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Inbox;
