import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Chat() {
  const { userId } = useParams();
  const selectedItem = useLocation().state?.item;
  const [error, setError] = useState('');
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [relatedItem, setRelatedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    setOtherUser(null);
    setRelatedItem(selectedItem || null);
    fetchMessages();
    
    // Poll for new messages every 4 seconds
    pollRef.current = setInterval(fetchMessages, 4000);
    
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [userId, user.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${userId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hostelbarter_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || data);
        setOtherUser(data.partner);
        setRelatedItem(selectedItem || data.item);
        setError('');
      } else {
        throw new Error('API failed');
      }
    } catch {
      setError('Could not load this conversation. Please check your connection or sign in again.');
    }
    setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msgData = {
      sender_id: user.id,
      receiver_id: parseInt(userId),
      content: newMessage.trim(),
      item_id: relatedItem?.id || null,
      created_at: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('hostelbarter_token')}`
        },
        body: JSON.stringify(msgData),
      });
      if (!res.ok) throw new Error('Failed');
    } catch {
      setError('Message not sent. Please try again.');
      return;
    }

    setMessages(prev => [...prev, { ...msgData, id: msgData.id || Date.now() }]);
    setNewMessage('');
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Chat Header */}
      <div className="card p-4 mb-4 flex items-center gap-3">
        <Link to="/inbox" className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg font-bold text-emerald-700">
          {otherUser?.name?.charAt(0) || '?'}
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900">{otherUser?.name || 'Student'}</h2>
          <p className="text-xs text-gray-500">{otherUser?.hostel_name} · Room {otherUser?.room_number}</p>
        </div>
      </div>

      {/* Related Item Banner */}
      {relatedItem && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4 flex items-center gap-3">
          <span className="text-2xl">📦</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-600 font-medium">Regarding:</p>
            <p className="text-sm font-semibold text-emerald-800 truncate">{relatedItem.title}</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="card p-4 min-h-[400px] max-h-[500px] overflow-y-auto mb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm">No messages yet. Say hello!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-md'
                      : 'bg-gray-100 text-gray-800 rounded-bl-md'
                  }`}>
                    <p className="text-xs font-bold">{isMe ? user.name : msg.sender_name || otherUser?.name}</p>
                    <p className="text-sm">{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMe ? 'text-emerald-200' : 'text-gray-400'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error && <p role="alert">{error}</p>}
      <p className="text-sm mb-2">Messaging as {user.name}</p>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="input-field flex-1"
          placeholder="Type a message..."
        />
        <button type="submit" className="btn-primary px-6">
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;
