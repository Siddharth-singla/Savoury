import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin, checkSetupStatus } from '../api/auth';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

/* ── Design tokens — warm light theme ── */
const C = {
  bg:          '#f5f0eb',
  surface:     '#ffffff',
  surface2:    '#f0ebe4',
  surface3:    '#e8e1d8',
  border:      'rgba(0,0,0,0.08)',
  borderFocus: 'rgba(45,27,14,0.3)',
  text:        '#1a120b',
  textMuted:   '#7a6855',
  textSub:     '#5c4a38',
  primary:     '#2d1b0e',
  accent:      '#7c3a1e',
  danger:      '#8b1a1a',
  dangerBg:    'rgba(139,26,26,0.08)',
};

const HERO_IMG = 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1000&q=80';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: C.bg,
      padding: 24,
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .login-input {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .login-input:focus {
          background: transparent !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .login-input:-webkit-autofill,
        .login-input:-webkit-autofill:hover,
        .login-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px ${C.surface2} inset !important;
          -webkit-text-fill-color: ${C.text} !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        .input-box:focus-within {
          border-color: ${C.borderFocus} !important;
          background: ${C.surface2} !important;
          box-shadow: 0 0 0 3px rgba(45,27,14,0.06) !important;
        }
      `}</style>

      {/* ── Split Card Container ── */}
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: 900,
        minHeight: 540,
        background: C.surface,
        borderRadius: 24,
        overflow: 'hidden',
        border: `1px solid ${C.border}`,
        boxShadow: '0 12px 40px rgba(45,27,14,0.08)',
      }}>

        {/* ── Left Hero Side with Image ── */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 40,
          minHeight: 400,
          background: C.primary,
        }}>
          {/* Background image & gradient overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${HERO_IMG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(22,10,4,0.65) 0%, rgba(22,10,4,0.85) 100%)',
          }} />

          {/* Top Brand */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/logo-light.png"
              alt="Savoury"
              style={{
                width: 46, height: 46, objectFit: 'contain', flexShrink: 0,
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
              }}
            />
            <span style={{
              fontSize: 24, fontWeight: 900, color: '#ffffff',
              fontFamily: "'Georgia', serif", letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              Savoury
            </span>
          </div>

          {/* Bottom Hero Message */}
          <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto' }}>
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: 20,
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)',
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              color: 'rgba(255,255,255,0.9)', textTransform: 'uppercase', marginBottom: 12,
            }}>
              Institutional Portal
            </div>
            <h2 style={{
              fontSize: 28, fontWeight: 800, color: '#ffffff', lineHeight: 1.2, margin: '0 0 10px',
              fontFamily: "'Georgia', serif", letterSpacing: '-0.3px',
            }}>
              Streamline mess operations with real-time dining control.
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
              Automated headcounts, smart attendance rosters, meal allocations, and live kitchen management.
            </p>
          </div>
        </div>

        {/* ── Right Form Side ── */}
        <div style={{
          width: 440,
          padding: '48px 44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: C.surface,
        }}>
          <div>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
              color: C.textMuted, textTransform: 'uppercase', margin: '0 0 6px',
            }}>
              STAFF & ADMIN ACCESS
            </p>
            <h1 style={{
              fontSize: 32, fontWeight: 900, color: C.primary, margin: '0 0 8px',
              fontFamily: "'Georgia', serif", letterSpacing: '-0.5px',
            }}>
              Sign In
            </h1>
            <p style={{ fontSize: 14, color: C.textMuted, margin: '0 0 24px', lineHeight: 1.5 }}>
              Enter your credentials to access the management dashboard.
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.dangerBg, border: `1px solid ${C.danger}33`,
              borderLeft: `4px solid ${C.danger}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 20,
              color: C.danger, fontSize: 13, lineHeight: 1.4,
            }}>
              <AlertCircle size={16} color={C.danger} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email Field */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 700,
                color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Email Address
              </label>
              <div className="input-box" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: C.surface2, borderRadius: 12,
                padding: '12px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <Mail size={16} color={C.textMuted} />
                <input
                  className="login-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@college.edu"
                  autoFocus
                  disabled={loading}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    outline: 'none', color: C.text, fontSize: 14, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label style={{
                display: 'block', fontSize: 12, fontWeight: 700,
                color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Password
              </label>
              <div className="input-box" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: C.surface2, borderRadius: 12,
                padding: '12px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <Lock size={16} color={C.textMuted} />
                <input
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    outline: 'none', color: C.text, fontSize: 14, fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 0, display: 'flex' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 8, padding: '14px 20px', borderRadius: 14,
                background: C.primary, border: 'none', color: '#ffffff',
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, transition: 'all 0.15s ease',
                boxShadow: '0 4px 14px rgba(45,27,14,0.18)',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
