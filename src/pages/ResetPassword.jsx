import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(Boolean(token));
  const [linkValid, setLinkValid] = useState(false);

  useEffect(() => {
    if (!token) return;
    let current = true;
    fetch(`/api/auth/reset-password/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!current) return;
        if (res.ok) setLinkValid(true);
        else setError((await res.json().catch(() => ({}))).message || 'This reset link is invalid or has expired.');
      })
      .catch(() => { if (current) setError('Could not check this reset link. Please try again.'); })
      .finally(() => { if (current) setChecking(false); });
    return () => { current = false; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Enter a new password of at least 6 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setDone(true);
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
          <h2 className="text-3xl font-extrabold text-gray-900">Choose a new password</h2>
        </div>

        {done ? (
          <div className="card p-8 space-y-4 text-center">
            <div className="text-5xl">✅</div>
            <p role="status" className="text-gray-700">Password updated. Please log in with your new password.</p>
            <Link to="/login" className="btn-primary inline-block">Go to login</Link>
          </div>
        ) : !token || checking || !linkValid ? (
          <div className="card p-8 space-y-4 text-center">
            {checking ? <p role="status">Checking your reset link…</p> : (
              <>
                <p role="alert" className="text-red-700">{error || 'This reset link is missing. Request a new one.'}</p>
                <Link to="/forgot-password" className="btn-primary inline-block">Request a new reset link</Link>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-8 space-y-5">
            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">New password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="At least 6 characters" required />
            </div>
            <div>
              <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm new password</label>
              <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input-field" placeholder="Type it again" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-center">
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
