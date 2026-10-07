import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { CreditCard, Check, Search, X, ChevronDown } from 'lucide-react';
import type { UserRow } from '../api/users';
import { listUsers } from '../api/users';
import { getCashoutRequests, resolveCashoutRequest, topupWallet } from '../api/wallet';

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
  accentLight: 'rgba(124,58,30,0.1)',
  success:     '#3a6b3a',
  successDim:  'rgba(58,107,58,0.1)',
  danger:      '#8b1a1a',
  dangerDim:   'rgba(139,26,26,0.1)',
};

const SEMESTERS = [
  'Autumn Semester 2026',
  'Spring Semester 2026',
  '2026-Odd',
  '2026-Even',
  '2025-Odd',
  '2025-Even',
];

/* ── Top-up form ── */
function TopupTab() {
  const [studentId, setStudentId] = useState('');
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [semesterLabel, setSemesterLabel] = useState('Autumn Semester 2026');
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers({ limit: 1000 }),
    refetchInterval: 60_000,
  });

  const mutation = useMutation({
    mutationFn: topupWallet,
    onSuccess: () => {
      setSuccess(true);
      setAmount('');
      setNote('');
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Failed to top up wallet');
    },
  });

  const students: UserRow[] = usersData?.users.filter(
    u => u.role === 'STUDENT' || u.role === 'MESS_COMMITTEE'
  ) || [];

  const filtered = search.trim()
    ? students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(search.toLowerCase()))
    )
    : students;

  const handleSelectStudent = (s: UserRow) => {
    setStudentId(s.id);
    setSearch(s.name + (s.rollNo ? ` (${s.rollNo})` : ''));
    setShowDropdown(false);
  };

  const handleClear = () => {
    setStudentId('');
    setSearch('');
    setAmount('');
    setNote('');
    setShowDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !amount || !semesterLabel) return;
    mutation.mutate({
      studentId,
      amount: parseFloat(amount),
      semesterLabel,
      note: note.trim() || undefined,
    });
  };

  const canSubmit = !!studentId && !!amount && parseFloat(amount) > 0 && !!semesterLabel;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', flex: 1 }}>
      {/* Card */}
      <div style={{
        background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
        padding: '36px 40px', width: '100%',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {/* Card header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h2 style={{
            fontSize: 20, fontWeight: 800, color: C.primary, margin: 0,
            fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            PROCESS STUDENT ALLOCATION
          </h2>
        </div>

        {/* Success flash */}
        {success && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 10,
            background: C.successDim, border: `1px solid rgba(58,107,58,0.25)`,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, fontWeight: 600, color: C.success,
          }}>
            <Check size={15} strokeWidth={2.5} />
            Wallet topped up successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Student Identity */}
          <div>
            <label style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              color: C.textSub, textTransform: 'uppercase', display: 'block', marginBottom: 8,
            }}>
              STUDENT IDENTITY
            </label>
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: C.surface2, borderRadius: 10,
                border: `1px solid ${showDropdown ? C.borderFocus : C.border}`,
                padding: '12px 14px', transition: 'border-color 0.15s',
              }}>
                <Search size={16} color={C.textMuted} strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search by Student ID, Name or RFID Tag..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) { setStudentId(''); } }}
                  onFocus={() => setShowDropdown(true)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: C.text, fontSize: 14, fontFamily: 'inherit',
                  }}
                />
                {search && (
                  <button type="button" onClick={handleClear} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: C.textMuted, padding: 2, display: 'flex', alignItems: 'center',
                  }}>
                    <X size={14} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && filtered.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                  maxHeight: 220, overflowY: 'auto',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                }}>
                  {filtered.slice(0, 30).map(s => (
                    <div
                      key={s.id}
                      onMouseDown={() => handleSelectStudent(s)}
                      style={{
                        padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        borderBottom: `1px solid ${C.border}`, fontSize: 13,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.surface2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0,
                      }}>
                        {s.name.trim()[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: C.text }}>{s.name}</div>
                        {s.rollNo && <div style={{ fontSize: 11, color: C.textMuted }}>{s.rollNo}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Amount + Term Reference */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: C.textSub, textTransform: 'uppercase', display: 'block', marginBottom: 8,
              }}>
                ALLOCATION AMOUNT (₹)
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}`,
                padding: '12px 14px',
              }}>
                <span style={{ color: C.textMuted, fontSize: 15, fontWeight: 600 }}>₹</span>
                <input
                  type="number"
                  placeholder="0.00"
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: C.text, fontSize: 15, fontFamily: 'inherit', fontWeight: 600,
                    MozAppearance: 'textfield' as any,
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: C.textSub, textTransform: 'uppercase', display: 'block', marginBottom: 8,
              }}>
                TERM REFERENCE
              </label>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}`,
                padding: '0 14px',
              }}>
                <select
                  value={semesterLabel}
                  onChange={e => setSemesterLabel(e.target.value)}
                  required
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    color: C.text, fontSize: 14, fontFamily: 'inherit',
                    padding: '12px 0', cursor: 'pointer', appearance: 'none',
                  }}
                >
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                  {!SEMESTERS.includes(semesterLabel) && (
                    <option value={semesterLabel}>{semesterLabel}</option>
                  )}
                </select>
                <ChevronDown size={14} color={C.textMuted} strokeWidth={2} style={{ pointerEvents: 'none', flexShrink: 0 }} />
              </div>
            </div>
          </div>

          {/* Ledger Note */}
          <div>
            <label style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              color: C.textSub, textTransform: 'uppercase', display: 'block', marginBottom: 8,
            }}>
              LEDGER NOTE
            </label>
            <div style={{
              background: C.surface2, borderRadius: 10, border: `1px solid ${C.border}`,
              padding: '12px 14px',
            }}>
              <input
                type="text"
                placeholder="Optional administrative note for this transaction..."
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none',
                  color: C.text, fontSize: 13, fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Action Row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 16, marginTop: 12, paddingTop: 16, borderTop: `1px solid ${C.border}`,
          }}>
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'transparent', border: 'none',
                color: C.textMuted, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', padding: '8px 12px',
              }}
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 24,
                background: canSubmit ? C.primary : C.surface2,
                border: 'none',
                color: canSubmit ? '#fff' : C.textMuted,
                fontSize: 13, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', transition: 'all 0.15s',
                opacity: mutation.isPending ? 0.7 : 1,
                boxShadow: canSubmit ? '0 2px 8px rgba(45,27,14,0.2)' : 'none',
              }}
            >
              {mutation.isPending ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Processing…
                </>
              ) : (
                <>
                  <CreditCard size={15} strokeWidth={2} />
                  Process Top-Up
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Cashout requests tab ── */
function CashoutRequestsTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cashout-requests'],
    queryFn: () => getCashoutRequests('PENDING'),
    refetchInterval: 15_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: 'APPROVED' | 'REJECTED'; note?: string }) =>
      resolveCashoutRequest(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashout-requests'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Failed to resolve request');
    },
  });

  const handleResolve = (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (confirm(`Are you sure you want to ${status.toLowerCase()} this cashout?`)) {
      mutation.mutate({ id, status });
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 12, color: C.textMuted, fontSize: 14 }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.surface3}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading cashout requests…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12, color: C.textMuted, textAlign: 'center' }}>
        <span style={{ fontSize: 40 }}>⚠️</span>
        <p style={{ color: C.danger, margin: 0, fontSize: 14 }}>Failed to load cashout requests.</p>
      </div>
    );
  }

  const requests = data?.requests || [];

  if (requests.length === 0) {
    return (
      <div style={{
        background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
        padding: '60px 24px', textAlign: 'center', color: C.textMuted,
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <span style={{ fontSize: 48 }}>✓</span>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '8px 0 4px', fontFamily: "'Georgia', serif" }}>All clear</h3>
        <p style={{ fontSize: 14, margin: 0 }}>No pending cashout requests.</p>
      </div>
    );
  }

  return (
    <div style={{
      background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
      overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '140px 1fr 150px 110px 160px',
        padding: '12px 24px', borderBottom: `1px solid ${C.border}`, background: C.surface2,
      }}>
        {['Date', 'Student', 'Semester', 'Amount', 'Actions'].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>{h}</span>
        ))}
      </div>

      {requests.map((r: any, idx: number) => (
        <div
          key={r.id}
          style={{
            display: 'grid', gridTemplateColumns: '140px 1fr 150px 110px 160px',
            padding: '16px 24px', alignItems: 'center',
            borderBottom: idx < requests.length - 1 ? `1px solid ${C.border}` : 'none',
          }}
        >
          <span style={{ fontSize: 13, color: C.textMuted }}>{new Date(r.requestedAt).toLocaleDateString()}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{r.student.name}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{r.student.rollNo}</div>
          </div>
          <span style={{ fontSize: 13, color: C.textSub }}>{r.semesterLabel}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>₹{r.requestedAmount}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleResolve(r.id, 'APPROVED')}
              disabled={mutation.isPending}
              style={{
                padding: '6px 14px', borderRadius: 7, border: 'none',
                background: C.successDim, color: C.success,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'opacity 0.15s', opacity: mutation.isPending ? 0.5 : 1,
              }}
            >Approve</button>
            <button
              onClick={() => handleResolve(r.id, 'REJECTED')}
              disabled={mutation.isPending}
              style={{
                padding: '6px 14px', borderRadius: 7, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.textMuted,
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'opacity 0.15s', opacity: mutation.isPending ? 0.5 : 1,
              }}
            >Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */
export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<'topup' | 'cashouts'>('topup');

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif",
      padding: '36px 40px', gap: 24, minHeight: 0, overflowY: 'auto',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .wallet-tab-btn { transition: all 0.15s; }
      `}</style>

      {/* ── Header ── */}
      <div>
        <h1 style={{
          fontSize: 40, fontWeight: 900, color: C.primary, margin: '0 0 8px', lineHeight: 1.05,
          fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: '-0.5px',
        }}>
          WALLET &<br />FINANCES
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 650, lineHeight: 1.5 }}>
          Manage institutional mess funds, process student wallet top-ups, and review transaction ledgers. Ensure all terminal allocations are recorded with accurate term references.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        {([['topup', 'Manual Top-Up'], ['cashouts', 'Pending Cashouts']] as const).map(([val, label]) => (
          <button
            key={val}
            className="wallet-tab-btn"
            onClick={() => setActiveTab(val)}
            style={{
              padding: '8px 22px', borderRadius: 24,
              background: activeTab === val ? C.primary : C.surface,
              border: `1px solid ${activeTab === val ? C.primary : C.border}`,
              color: activeTab === val ? '#fff' : C.textMuted,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'topup' && <TopupTab />}
      {activeTab === 'cashouts' && <CashoutRequestsTab />}
    </div>
  );
}
