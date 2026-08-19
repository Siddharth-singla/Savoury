import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setupSuperAdmin } from '../api/auth';

export default function SetupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await setupSuperAdmin(name.trim(), email.trim(), password);
      login(result.accessToken, result.user);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.error;
      if (err?.response?.status === 409) {
        setError('Setup already completed. Please log in instead.');
      } else {
        setError(msg ?? 'Setup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420 }}>
        <div className="login-header">
          <span className="login-logo">🍽️</span>
          <h1>SmartMess Setup</h1>
          <p style={{ color: 'var(--warning, #f59e0b)', fontSize: 13, marginTop: 4 }}>
            ⚠️ First-time setup — Create your Super Admin account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}

          <label>Full Name
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dr. Ramesh Kumar"
              autoFocus
              disabled={loading}
            />
          </label>

          <label>Email Address
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@college.edu"
              disabled={loading}
            />
          </label>

          <label>Password <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(min 8 chars)</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </label>

          <label>Confirm Password
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </label>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Super Admin Account'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}>
            Already set up?{' '}
            <a href="/login" style={{ color: 'var(--primary)' }}>Sign in instead</a>
          </div>
        </form>
      </div>
    </div>
  );
}
