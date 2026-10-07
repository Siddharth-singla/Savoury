import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMealTypes } from '../api/menu';
import { getRoster, checkIn } from '../api/attendance';
import type { RosterStudent } from '../api/attendance';
import { Search, UtensilsCrossed, Clock, Check, X, Hourglass } from 'lucide-react';

/* ─── Warm Light Theme Tokens ─── */
const C = {
  bg:          '#f5f0eb',
  surface:     '#ffffff',
  surface2:    '#f0ebe4',
  surface3:    '#e8e1d8',
  border:      'rgba(0,0,0,0.08)',
  borderFocus: 'rgba(45,27,14,0.3)',
  primary:     '#2d1b0e',
  primaryDim:  'rgba(45,27,14,0.08)',
  text:        '#1a120b',
  textMuted:   '#7a6855',
  textSub:     '#5c4a38',
  success:     '#3a6b3a',
  successDim:  'rgba(58,107,58,0.12)',
  warning:     '#b8860b',
  warningDim:  'rgba(184,134,11,0.12)',
  danger:      '#8b1a1a',
  dangerDim:   'rgba(139,26,26,0.12)',
  accent:      '#7c3a1e',
};

function avatarColor(name: string) {
  const colors = ['#2d1b0e', '#7c3a1e', '#8b5cf6', '#b45309', '#3a6b3a', '#0369a1', '#be123c', '#0f766e'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const bg = avatarColor(name || 'User');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0,
      fontFamily: "'Inter', sans-serif",
    }}>
      {name?.trim()[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function formatTime(isoString: string) {
  try {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
  } catch { return '—'; }
}

function formatStudentId(rollNo: string | null) {
  if (!rollNo) return '—';
  return rollNo;
}

export default function CheckInPage() {
  const [mealTypeId, setMealTypeId] = useState('');
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [checkedInLog, setCheckedInLog] = useState<Array<{
    student: RosterStudent;
    timestamp: string;
  }>>([]);

  const [pendingSyncs, setPendingSyncs] = useState<string[]>([]);
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncing = useRef(false);
  const [recentRate, setRecentRate] = useState(0);
  const rateTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recentWindow = useRef<number[]>([]);

  const { data: mealTypes } = useQuery({
    queryKey: ['meal-types'],
    queryFn: getMealTypes,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (mealTypes && mealTypes.length > 0 && !mealTypeId) {
      const now = new Date();
      let targetMt = mealTypes.find((mt: any) => {
        const [endH, endM] = mt.servingEnd.split(':').map(Number);
        let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0, 0);
        const [startH, startM] = mt.servingStart.split(':').map(Number);
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0, 0);
        if (end < start) end.setDate(end.getDate() + 1);
        return now <= end;
      });
      setMealTypeId(targetMt ? targetMt.id : mealTypes[0].id);
    }
  }, [mealTypes, mealTypeId]);

  const mealTargetDate = useMemo(() => {
    if (!mealTypes || !mealTypeId) return '';
    const mt = mealTypes.find((m: any) => m.id === mealTypeId);
    if (!mt) return '';
    const now = new Date();
    const [startH, startM] = mt.servingStart.split(':').map(Number);
    const [endH, endM] = mt.servingEnd.split(':').map(Number);
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0, 0);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0, 0);
    if (end < start) end.setDate(end.getDate() + 1);
    let target = new Date(now);
    if (now > end) target.setDate(target.getDate() + 1);
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T12:00:00Z`).toISOString();
  }, [mealTypes, mealTypeId]);

  const mealStatus = useMemo(() => {
    if (!mealTypes || !mealTypeId || !mealTargetDate) return { isActive: false, hasEnded: false, hasNotStarted: false };
    const mt = mealTypes.find((m: any) => m.id === mealTypeId);
    if (!mt) return { isActive: false, hasEnded: false, hasNotStarted: false };
    const now = new Date();
    const targetDateObj = new Date(mealTargetDate);
    const [startH, startM] = mt.servingStart.split(':').map(Number);
    const [endH, endM] = mt.servingEnd.split(':').map(Number);
    let start = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), startH, startM, 0, 0);
    let end = new Date(targetDateObj.getFullYear(), targetDateObj.getMonth(), targetDateObj.getDate(), endH, endM, 0, 0);
    if (end < start) end.setDate(end.getDate() + 1);
    return { isActive: now >= start && now <= end, hasEnded: now > end, hasNotStarted: now < start };
  }, [mealTypes, mealTypeId, mealTargetDate]);

  const { data: serverRoster, isLoading, isError, refetch } = useQuery({
    queryKey: ['roster', mealTypeId, mealTargetDate.split('T')[0]],
    queryFn: () => getRoster(mealTypeId, mealTargetDate),
    enabled: !!mealTypeId && !!mealTargetDate,
    staleTime: 0,
    refetchInterval: 15_000, // Faster polling for check-ins
  });

  useEffect(() => {
    if (serverRoster) {
      setRoster(prev => {
        if (prev.length === 0) return serverRoster;
        const prevMap = new Map(prev.map(s => [s.studentId, s]));
        return serverRoster.map(s => {
          const localS = prevMap.get(s.studentId);
          if (localS?.isServed) return localS;
          return s;
        });
      });
    }
  }, [serverRoster]);

  /* Rate tracker: count check-ins in last 5 minutes */
  useEffect(() => {
    rateTimer.current = setInterval(() => {
      const now = Date.now();
      recentWindow.current = recentWindow.current.filter(t => now - t < 5 * 60 * 1000);
      setRecentRate(recentWindow.current.length);
    }, 10000);
    return () => { if (rateTimer.current) clearInterval(rateTimer.current); };
  }, []);

  /* Sync queue */
  useEffect(() => {
    syncTimer.current = setInterval(async () => {
      if (pendingSyncs.length === 0 || isSyncing.current) return;
      isSyncing.current = true;
      const studentId = pendingSyncs[0];
      try {
        const res = await checkIn({ studentId, mealTypeId, date: mealTargetDate });
        if (res.success) setPendingSyncs(prev => prev.slice(1));
      } catch (err: any) {
        console.warn('Sync failed, will retry...', err.message);
      } finally {
        isSyncing.current = false;
      }
    }, 2000);
    return () => { if (syncTimer.current) clearInterval(syncTimer.current); };
  }, [pendingSyncs, mealTypeId, mealTargetDate]);

  const handleMarkServed = (studentId: string) => {
    const student = roster.find(s => s.studentId === studentId);
    if (!student || student.isServed) return;
    setRoster(prev => prev.map(s => s.studentId === studentId ? { ...s, isServed: true } : s));
    setPendingSyncs(prev => { if (prev.includes(studentId)) return prev; return [...prev, studentId]; });
    if (student) {
      setCheckedInLog(prev => [{ student, timestamp: new Date().toISOString() }, ...prev].slice(0, 50));
      recentWindow.current.push(Date.now());
      setRecentRate(recentWindow.current.filter(t => Date.now() - t < 5 * 60 * 1000).length);
    }
    setSearch('');
  };

  const currentMeal = mealTypes?.find((m: any) => m.id === mealTypeId);
  const servedCount = useMemo(() => roster.filter(s => s.isServed).length, [roster]);
  const totalEligibleCount = useMemo(() => roster.filter(s => s.status !== 'OPTED_OUT').length, [roster]);
  const servedPct = totalEligibleCount > 0 ? (servedCount / totalEligibleCount) * 100 : 0;

  /* ── Search & Relevance Ranking ── */
  const tableRows = useMemo(() => {
    const query = search.toLowerCase().trim();
    return roster
      .filter(s =>
        !s.isServed &&
        s.status !== 'OPTED_OUT' &&
        (!query ||
          s.name.toLowerCase().includes(query) ||
          (s.rollNo && s.rollNo.toLowerCase().includes(query)))
      )
      .sort((a, b) => {
        if (!query) return a.name.localeCompare(b.name);
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aRoll = (a.rollNo || '').toLowerCase();
        const bRoll = (b.rollNo || '').toLowerCase();

        // 1. Exact matches (Roll No or Name)
        const aExact = aRoll === query || aName === query;
        const bExact = bRoll === query || bName === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // 2. Starts with query (Roll No or Name)
        const aStarts = aRoll.startsWith(query) || aName.startsWith(query);
        const bStarts = bRoll.startsWith(query) || bName.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        // 3. Alphabetical fallback
        return aName.localeCompare(bName);
      });
  }, [roster, search]);

  /* Format meal timing nicely */
  function fmtTime(t: string) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  const lastCheckedIn = checkedInLog[0];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif",
      minHeight: 0,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .ci-row:hover { background: rgba(0,0,0,0.02) !important; cursor: pointer; }
        .ci-serve-btn:hover { opacity: 0.9 !important; transform: scale(1.02); }
        .ci-meal-tab:hover { opacity: 0.9 !important; }
      `}</style>

      {/* ── Main Scroll Area ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '36px 40px',
        display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0,
      }}>

        {/* ── Page Header ── */}
        <div>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            color: C.textMuted, textTransform: 'uppercase', margin: '0 0 4px',
          }}>
            OPERATIONS CONTROL
          </p>
          <h1 style={{
            fontSize: 38, fontWeight: 900, color: C.primary, margin: '0 0 8px', lineHeight: 1.1,
            fontFamily: "'Georgia', serif", letterSpacing: '-0.5px',
          }}>
            {currentMeal?.name ?? 'Meal'} Service
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 620, lineHeight: 1.5 }}>
            Real-time attendance tracking and meal distribution metrics for the current session.
          </p>
        </div>

        {/* ── Meal selector tabs ── */}
        {mealTypes && mealTypes.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {mealTypes.map((mt: any) => {
              const isSelected = mt.id === mealTypeId;
              return (
                <button
                  key={mt.id}
                  className="ci-meal-tab"
                  onClick={() => { setMealTypeId(mt.id); setRoster([]); refetch(); }}
                  style={{
                    padding: '8px 22px', borderRadius: 24,
                    background: isSelected ? C.primary : C.surface,
                    border: `1px solid ${isSelected ? C.primary : C.border}`,
                    color: isSelected ? '#fff' : C.textMuted,
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  {mt.name}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Two-column layout: Left stats, Right log ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start', flex: 1 }}>

          {/* ── Left Column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Session Progress Card */}
            <div style={{
              background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
              padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase', margin: '0 0 4px' }}>
                    SESSION PROGRESS
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, fontFamily: "'Georgia', serif" }}>
                    Served
                  </p>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <UtensilsCrossed size={18} color={C.textSub} strokeWidth={2} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 44, fontWeight: 900, color: C.primary, lineHeight: 1, fontFamily: "'Georgia', serif" }}>
                    {servedCount}
                  </span>
                  <span style={{ fontSize: 18, color: C.textMuted, fontWeight: 500 }}>
                    / {totalEligibleCount}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ height: 6, background: C.surface2, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(servedPct, 100)}%`,
                    background: C.primary,
                    borderRadius: 99,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                {recentRate > 0 && (
                  <p style={{ fontSize: 12, color: C.success, fontWeight: 600, margin: '8px 0 0' }}>
                    +{recentRate} in last 5m
                  </p>
                )}
              </div>
            </div>

            {/* Meal Timing Card */}
            <div style={{
              background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
              padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14,
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase', margin: '0 0 4px' }}>
                    SCHEDULE
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0, fontFamily: "'Georgia', serif" }}>
                    Meal Timing
                  </p>
                </div>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Clock size={18} color={C.textSub} strokeWidth={2} />
                </div>
              </div>

              {currentMeal ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: C.primary, fontFamily: "'Georgia', serif" }}>
                      {fmtTime(currentMeal.servingStart)}
                    </span>
                    <span style={{ fontSize: 16, color: C.textMuted, margin: '0 2px' }}>–</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: C.primary, fontFamily: "'Georgia', serif" }}>
                      {fmtTime(currentMeal.servingEnd)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: mealStatus.isActive ? C.success : mealStatus.hasEnded ? C.danger : C.warning,
                      display: 'inline-block',
                    }} />
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: mealStatus.isActive ? C.success : mealStatus.hasEnded ? C.danger : C.warning,
                    }}>
                      {mealStatus.isActive ? 'Service Active' : mealStatus.hasEnded ? 'Service Ended' : 'Not Started'}
                      {mealStatus.isActive && currentMeal && (() => {
                        const now = new Date();
                        const [endH, endM] = currentMeal.servingEnd.split(':').map(Number);
                        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0);
                        const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000));
                        return ` · ${diff}m remaining`;
                      })()}
                    </span>
                  </div>
                </div>
              ) : (
                <span style={{ color: C.textMuted, fontSize: 14 }}>—</span>
              )}
            </div>

            {/* Live Feed Card */}
            {lastCheckedIn && (
              <div style={{
                background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
                padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10,
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase', margin: 0 }}>
                  LIVE FEED
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={lastCheckedIn.student.name} size={36} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>
                      {lastCheckedIn.student.name}
                    </p>
                    <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                      Just checked in · {formatTime(lastCheckedIn.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sync status */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 12,
              background: pendingSyncs.length > 0 ? '#fef3c7' : '#e6f4ea',
              border: `1px solid ${pendingSyncs.length > 0 ? 'rgba(184,134,11,0.2)' : 'rgba(58,107,58,0.2)'}`,
              fontSize: 13, fontWeight: 600,
              color: pendingSyncs.length > 0 ? '#b45309' : '#2e7d32',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              {pendingSyncs.length > 0 ? (
                <>
                  <div style={{ width: 14, height: 14, border: `2px solid #b45309`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  {pendingSyncs.length} syncing…
                </>
              ) : (
                <>
                  <Check size={14} strokeWidth={2.5} />
                  All synced
                </>
              )}
            </div>
          </div>

          {/* ── Right Column: Search + Live Log ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            {/* Search Input directly above Live Log */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.surface, borderRadius: 14,
              padding: '11px 18px', border: `1px solid ${C.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              <Search size={16} color={C.textMuted} strokeWidth={2} />
              <input
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  outline: 'none', color: C.text, fontSize: 14, fontFamily: 'inherit',
                }}
                type="text"
                placeholder="Search records..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && tableRows.length > 0) {
                    e.preventDefault();
                    handleMarkServed(tableRows[0].studentId);
                  }
                }}
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: 2, display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Live Log Container */}
            <div style={{
              background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
              display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 460,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}>
              {/* Log Header (No filter, No export buttons) */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 24px', borderBottom: `1px solid ${C.border}`, flexShrink: 0,
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: 0, fontFamily: "'Georgia', serif" }}>
                  Live Log
                </h2>
              </div>

            {/* Loading / Error states */}
            {isLoading && roster.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '80px 24px', color: C.textMuted, fontSize: 14 }}>
                <div style={{ width: 36, height: 36, border: `3px solid ${C.surface3}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span>Loading roster…</span>
              </div>
            )}

            {isError && roster.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '60px 24px', color: C.textMuted, textAlign: 'center' }}>
                <span style={{ fontSize: 40 }}>⚠️</span>
                <span style={{ color: C.danger }}>Failed to load roster.</span>
                <button onClick={() => refetch()} style={{ padding: '8px 20px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Retry</button>
              </div>
            )}

            {/* Empty state when meal not started AND no search query is active */}
            {!isLoading && !isError && mealStatus.hasNotStarted && !search && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '80px 24px', color: C.textMuted, textAlign: 'center' }}>
                <Hourglass size={48} color={C.warning} strokeWidth={1.5} />
                <h3 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '4px 0', fontFamily: "'Georgia', serif" }}>Meal Not Started</h3>
                <p style={{ fontSize: 14, color: C.textMuted, maxWidth: 380, margin: 0, lineHeight: 1.5 }}>
                  Serving begins at {currentMeal?.servingStart || 'scheduled time'}. The roster will appear here once service starts.
                </p>
              </div>
            )}

            {/* Empty state when meal ended AND no search query is active */}
            {!isLoading && !isError && mealStatus.hasEnded && !search && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '80px 24px', color: C.textMuted, textAlign: 'center' }}>
                <span style={{ fontSize: 48 }}>🍽️</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: '4px 0', fontFamily: "'Georgia', serif" }}>Service Ended</h3>
                <p style={{ fontSize: 14, color: C.textMuted, maxWidth: 380, margin: 0, lineHeight: 1.5 }}>
                  Serving hours {currentMeal ? `(${currentMeal.servingStart} – ${currentMeal.servingEnd})` : ''} have concluded. Check-ins are closed.
                </p>
              </div>
            )}

            {/* Active meal OR when search is being typed: show interactive roster log */}
            {!isLoading && !isError && (mealStatus.isActive || !!search) && (
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Table Header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 160px 160px 130px', gap: 0,
                  padding: '12px 24px', borderBottom: `1px solid ${C.border}`, background: C.surface2,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>STUDENT</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>ID NUMBER</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>TIMESTAMP</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase', textAlign: 'right' }}>ACTION</span>
                </div>

                {/* Recently checked in list (top items) */}
                {checkedInLog.slice(0, 10).map((entry, i) => (
                  <div
                    key={entry.student.studentId + entry.timestamp}
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 160px 160px 130px', gap: 0,
                      padding: '14px 24px', borderBottom: `1px solid ${C.border}`,
                      alignItems: 'center',
                      background: i === 0 ? 'rgba(58,107,58,0.06)' : 'transparent',
                      animation: i === 0 ? 'fadeSlideIn 0.3s ease' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={entry.student.name} size={34} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: i === 0 ? C.success : C.text }}>
                        {entry.student.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, color: C.textMuted, fontFamily: 'monospace' }}>
                      {formatStudentId(entry.student.rollNo)}
                    </span>
                    <span style={{ fontSize: 13, color: C.textMuted }}>
                      {formatTime(entry.timestamp)}
                    </span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                        background: '#e6f4ea', color: '#2e7d32', fontSize: 11, fontWeight: 700,
                      }}>
                        Served
                      </span>
                    </div>
                  </div>
                ))}

                {/* Waiting queue (ranked by search relevance) */}
                {tableRows.map((student, idx) => (
                  <div
                    key={student.studentId}
                    className="ci-row"
                    style={{
                      display: 'grid', gridTemplateColumns: '1fr 160px 160px 130px', gap: 0,
                      padding: '14px 24px', borderBottom: `1px solid ${C.border}`,
                      alignItems: 'center', transition: 'background 0.12s',
                      background: idx === 0 && search ? 'rgba(45,27,14,0.03)' : 'transparent',
                    }}
                    onClick={() => handleMarkServed(student.studentId)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={student.name} size={34} />
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{student.name}</span>
                        {idx === 0 && search && (
                          <span style={{
                            marginLeft: 8, fontSize: 10, fontWeight: 700,
                            background: C.surface2, color: C.textSub,
                            padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase',
                          }}>Top Match · Press Enter</span>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: C.textMuted, fontFamily: 'monospace' }}>
                      {formatStudentId(student.rollNo)}
                    </span>
                    <span style={{ fontSize: 13, color: C.textMuted }}>—</span>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        className="ci-serve-btn"
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          background: C.primary, border: 'none',
                          color: '#fff', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                        onClick={e => { e.stopPropagation(); handleMarkServed(student.studentId); }}
                      >
                        Tap to Serve
                      </button>
                    </div>
                  </div>
                ))}

                {tableRows.length === 0 && checkedInLog.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 8, color: C.textMuted, textAlign: 'center' }}>
                    {search ? (
                      <span style={{ fontSize: 14 }}>No students match &quot;{search}&quot;</span>
                    ) : totalEligibleCount > 0 && servedCount >= totalEligibleCount ? (
                      <>
                        <span style={{ fontSize: 36 }}>🎉</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>All students served!</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 14 }}>No students waiting to be served.</span>
                    )}
                  </div>
                )}

                {tableRows.length === 0 && checkedInLog.length > 0 && (
                  <div style={{ padding: '16px 24px', textAlign: 'center' }}>
                    <span style={{ fontSize: 13, color: C.textMuted }}>
                      {search ? `No students match "${search}"` : '• • •'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

