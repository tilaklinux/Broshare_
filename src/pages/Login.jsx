import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect
  if (user) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        navigate('/');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      // Demo mode: simulate login
      const mockUsers = JSON.parse(localStorage.getItem('hostelbarter_registered_users') || '[]');
      const found = mockUsers.find(u => u.email === email);
      if (found && found.password === password) {
        const { password: _, ...userData } = found;
        login(userData, 'demo_token_' + Date.now());
        navigate('/');
      } else if (email && password) {
        // Auto-create demo account
        const demoUser = { id: Date.now(), name: email.split('@')[0], email, hostel_name: 'Demo Hostel', room_number: '101' };
        login(demoUser, 'demo_token_' + Date.now());
        navigate('/');
      } else {
        setError('Please enter email and password');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Welcome back!</h2>
          <p className="text-gray-500 mt-2">Login to continue bartering</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@college.edu"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full text-center">
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-600 font-semibold hover:underline">Sign up</Link>
          </p>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 text-center">
              💡 Demo mode: Enter any email & password to explore the app
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
