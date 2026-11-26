import { useState } from 'react';
import { Link } from 'react-router-dom';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Request failed');
      setSent(data);
    } catch (err) {
      setError(err.message || 'Could not contact the server. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔑</span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">Forgot your password?</h2>
          <p className="text-gray-500 mt-2">
            Enter the email you registered with and we will send you a link to reset your password.
          </p>
        </div>

        {sent ? (
          <div className="card p-8 space-y-4 text-center">
            <div className="text-5xl">📬</div>
            <p role="status" className="text-gray-700">{sent.message}</p>
            <p className="text-sm text-gray-500">
              Check your inbox and spam folder. Requesting a new link makes the old one stop working.
            </p>
            {sent.devResetLink && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                <p className="text-sm font-semibold text-amber-800">Development mode</p>
                <p className="text-sm text-amber-700 mt-1">
                  No email service is configured on this server, so here is your reset link directly:
                </p>
                <a href={sent.devResetLink} className="text-sm text-emerald-700 font-semibold break-all hover:underline">
                  {sent.devResetLink}
                </a>
              </div>
            )}
            <p className="text-sm text-gray-500">
              <Link to="/login" className="text-emerald-600 font-semibold hover:underline">Back to login</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-8 space-y-5">
            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">Registered email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@college.edu"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-center">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Remembered it?{' '}
              <Link to="/login" className="text-emerald-600 font-semibold hover:underline">Back to login</Link>
            </p>
            <p className="text-xs text-gray-400 text-center border-t border-gray-100 pt-4">
              Forgot which email you used? Ask an admin to look up your account by your name in the Admin Panel.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
