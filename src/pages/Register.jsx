import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function Register() {
  const [form, setForm] = useState({
    name: '', email: '', password: '', hostel_name: '', room_number: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/');
    return null;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        navigate('/');
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch {
      // Demo mode: register locally
      if (!form.name || !form.email || !form.password) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }
      const registeredUsers = JSON.parse(localStorage.getItem('hostelbarter_registered_users') || '[]');
      if (registeredUsers.find(u => u.email === form.email)) {
        setError('Email already registered');
        setLoading(false);
        return;
      }
      const newUser = { id: Date.now(), ...form };
      registeredUsers.push(newUser);
      localStorage.setItem('hostelbarter_registered_users', JSON.stringify(registeredUsers));
      const { password: _, ...userData } = newUser;
      login(userData, 'demo_token_' + Date.now());
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎓</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Join HostelBarter</h2>
          <p className="text-gray-500 mt-2">Create your account to start bartering</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Arjun Mehta" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} className="input-field" placeholder="you@college.edu" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
            <input type="password" name="password" value={form.password} onChange={handleChange} className="input-field" placeholder="••••••••" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hostel Name *</label>
              <input type="text" name="hostel_name" value={form.hostel_name} onChange={handleChange} className="input-field" placeholder="Tagore Hostel" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Room No. *</label>
              <input type="text" name="room_number" value={form.room_number} onChange={handleChange} className="input-field" placeholder="204" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full text-center mt-2">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 font-semibold hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;
