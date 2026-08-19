import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, checkSetupStatus } from '../api/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect to setup if no SUPER_ADMIN exists yet
  useEffect(() => {
    checkSetupStatus().then(({ setupRequired }) => {
      if (setupRequired) navigate('/setup', { replace: true });
    }).catch(() => { /* backend offline — stay on login */ });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Both fields are required.'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await apiLogin(email.trim(), password);
      const role = result.user.role;
      
      if (role === 'STUDENT') {
        setError('Students cannot access the staff portal. Please use the mobile app.');
        return;
      }
      
      login(result.accessToken, result.user);
      navigate('/');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number; data?: { error?: string } } }).response?.status;
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      if (status === 401) setError('Invalid email or password.');
      else if (!status) setError('Cannot reach server. Is the backend running?');
      else setError(msg ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">🍽️</span>
          <h1>SmartMess Admin</h1>
          <p>Staff & Management Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          <label>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="staff@example.com" autoFocus disabled={loading} />
          </label>
          <label>Password
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" disabled={loading} />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
