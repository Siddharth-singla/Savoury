import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setupSuperAdmin } from '../api/auth';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

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
  warning:     '#92400e',
  warningBg:   '#fef3c7',
};

const HERO_IMG = 'https://images.unsplash.com/photo-1567521464027-f127ff144326?w=1000&q=80';

export default function SetupPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('All fields are required.');
      return;
    }
    if (!email.trim().endsWith('@thapar.edu')) {
      setError('Email must end with @thapar.edu.');
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
      navigate('/');
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
        .setup-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .setup-input {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .setup-input:focus {
          background: transparent !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .setup-input:-webkit-autofill,
        .setup-input:-webkit-autofill:hover,
        .setup-input:-webkit-autofill:focus {
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
        maxWidth: 960,
        minHeight: 580,
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
              background: C.warningBg, color: C.warning,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 12,
            }}>
              First-Time Initialization
            </div>
            <h2 style={{
              fontSize: 28, fontWeight: 800, color: '#ffffff', lineHeight: 1.2, margin: '0 0 10px',
              fontFamily: "'Georgia', serif", letterSpacing: '-0.3px',
            }}>
              Initialize your institution's super admin account.
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
              Set up the master administrator profile to configure hostels, manage meal plans, and grant staff permissions.
            </p>
          </div>
        </div>

        {/* ── Right Form Side ── */}
        <div style={{
          width: 460,
          padding: '40px 44px',
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
              INITIAL SETUP
            </p>
            <h1 style={{
              fontSize: 30, fontWeight: 900, color: C.primary, margin: '0 0 8px',
              fontFamily: "'Georgia', serif", letterSpacing: '-0.5px',
            }}>
              Create Admin Account
            </h1>
            <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.5 }}>
              Enter the primary administrator credentials below.
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.dangerBg, border: `1px solid ${C.danger}33`,
              borderLeft: `4px solid ${C.danger}`,
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              color: C.danger, fontSize: 13, lineHeight: 1.4,
            }}>
              <AlertCircle size={16} color={C.danger} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Full Name */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: C.textSub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Full Name
              </label>
              <div className="input-box" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: C.surface2, borderRadius: 12,
                padding: '10px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <User size={16} color={C.textMuted} />
                <input
                  className="setup-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Dr. Ramesh Kumar"
                  autoFocus
                  disabled={loading}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    outline: 'none', color: C.text, fontSize: 14, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: C.textSub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Email Address
              </label>
              <div className="input-box" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: C.surface2, borderRadius: 12,
                padding: '10px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <Mail size={16} color={C.textMuted} />
                <input
                  className="setup-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@college.edu"
                  disabled={loading}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    outline: 'none', color: C.text, fontSize: 14, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: C.textSub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Password <span style={{ fontSize: 11, color: C.textMuted, textTransform: 'none' }}>(min 8 characters)</span>
              </label>
              <div className="input-box" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: C.surface2, borderRadius: 12,
                padding: '10px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <Lock size={16} color={C.textMuted} />
                <input
                  className="setup-input"
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

            {/* Confirm Password */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: C.textSub, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Confirm Password
              </label>
              <div className="input-box" style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: C.surface2, borderRadius: 12,
                padding: '10px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <Lock size={16} color={C.textMuted} />
                <input
                  className="setup-input"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{
                    flex: 1, background: 'transparent', border: 'none',
                    outline: 'none', color: C.text, fontSize: 14, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="setup-btn"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginTop: 6, padding: '13px 20px', borderRadius: 14,
                background: C.primary, border: 'none', color: '#ffffff',
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, transition: 'all 0.15s ease',
                boxShadow: '0 4px 14px rgba(45,27,14,0.18)',
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create Super Admin</span>
                  <ArrowRight size={16} strokeWidth={2.5} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: 4, fontSize: 13, color: C.textMuted }}>
              Already set up?{' '}
              <a href="/login" style={{ color: C.accent, fontWeight: 600, textDecoration: 'none' }}>Sign in instead</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
