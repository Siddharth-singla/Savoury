import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMealTypes } from '../api/menu';
import { getRoster, checkIn } from '../api/attendance';
import type { RosterStudent } from '../api/attendance';

/* ─── Inline styles (light theme) ─── */
const s = {
  page: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    background: '#f1f5f9',
    fontFamily: "'Inter', sans-serif",
  },
  topSearch: {
    padding: '16px 28px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  searchIcon: {
    color: '#94a3b8',
    fontSize: 18,
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: 15,
    color: '#1e293b',
    outline: 'none',
    fontFamily: 'inherit',
  },
  mealSelect: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 14,
    color: '#334155',
    fontFamily: 'inherit',
    cursor: 'pointer',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  statCard: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    padding: '20px 22px',
    display: 'flex',
    alignItems: 'center',
    gap: 18,
  },
  statIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: '#4f6bed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 22,
  },
  statBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 500,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    color: '#1e293b',
    lineHeight: 1.2,
  },
  progressTrack: {
    height: 6,
    background: '#e2e8f0',
    borderRadius: 99,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBar: (pct: number) => ({
    height: '100%',
    width: `${Math.min(pct, 100)}%`,
    background: '#4f6bed',
    borderRadius: 99,
    transition: 'width 0.4s ease',
  }),
  syncBadge: (pending: number) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    background: pending > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.12)',
    color: pending > 0 ? '#d97706' : '#16a34a',
    border: `1px solid ${pending > 0 ? 'rgba(245,158,11,0.3)' : 'rgba(34,197,94,0.3)'}`,
  }),
  tableWrapper: {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    flex: 1,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 14,
  },
  th: {
    padding: '14px 20px',
    textAlign: 'left' as const,
    fontWeight: 700,
    color: '#1e293b',
    fontSize: 14,
    borderBottom: '1px solid #e2e8f0',
    background: '#fff',
  },
  thAction: {
    padding: '14px 20px',
    textAlign: 'right' as const,
    fontWeight: 700,
    color: '#1e293b',
    fontSize: 14,
    borderBottom: '1px solid #e2e8f0',
    background: '#fff',
  },
  td: {
    padding: '14px 20px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
    fontSize: 14,
    verticalAlign: 'middle' as const,
  },
  tdMuted: {
    padding: '14px 20px',
    borderBottom: '1px solid #f1f5f9',
    color: '#64748b',
    fontSize: 14,
    verticalAlign: 'middle' as const,
    fontFamily: 'monospace',
  },
  tdAction: {
    padding: '14px 20px',
    borderBottom: '1px solid #f1f5f9',
    textAlign: 'right' as const,
    verticalAlign: 'middle' as const,
  },
  trHover: {
    background: '#f8fafc',
    cursor: 'pointer',
  },
  tapBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 18px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    background: '#4f6bed',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, transform 0.1s',
  },
  center: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    gap: 12,
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center' as const,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid #e2e8f0',
    borderTopColor: '#4f6bed',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export default function CheckInPage() {
  const [mealTypeId, setMealTypeId] = useState('');
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const [pendingSyncs, setPendingSyncs] = useState<string[]>([]);
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncing = useRef(false);

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
    setRoster(prev => prev.map(s => s.studentId === studentId ? { ...s, isServed: true } : s));
    setPendingSyncs(prev => { if (prev.includes(studentId)) return prev; return [...prev, studentId]; });
    setSearch('');
  };

  const currentMeal = mealTypes?.find((m: any) => m.id === mealTypeId);

  const servedCount = useMemo(() => roster.filter(s => s.isServed).length, [roster]);
  const totalEligibleCount = useMemo(() => roster.filter(s => s.status !== 'OPTED_OUT').length, [roster]);

  // Only show unserved and opted-in students in the active queue
  const tableRows = useMemo(() => {
    const lowerSearch = search.toLowerCase().trim();
    return roster.filter(s =>
      !s.isServed &&
      s.status !== 'OPTED_OUT' &&
      (!lowerSearch ||
        s.name.toLowerCase().includes(lowerSearch) ||
        (s.rollNo && s.rollNo.toLowerCase().includes(lowerSearch)))
    );
  }, [roster, search]);

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Top Search Bar ── */}
      <div style={s.topSearch}>
        <span style={s.searchIcon}>🔍</span>
        <input
          style={s.searchInput}
          type="text"
          placeholder="Search student name or roll no..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          disabled={!mealStatus.isActive}
        />
        {mealTypes && mealTypes.length > 0 && (
          <select
            style={s.mealSelect}
            value={mealTypeId}
            onChange={e => { setMealTypeId(e.target.value); setRoster([]); refetch(); }}
          >
            {mealTypes.map((mt: any) => (
              <option key={mt.id} value={mt.id}>{mt.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Main Content ── */}
      <div style={s.content}>

        {/* Section Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={s.sectionTitle}>
            {currentMeal?.name ?? 'Meal'} Attendance
          </h2>
          <div style={s.syncBadge(pendingSyncs.length)}>
            {pendingSyncs.length > 0 ? `⏳ ${pendingSyncs.length} syncing…` : '✓ All synced'}
          </div>
        </div>

        {/* Stats Cards */}
        <div style={s.statsRow}>
          {/* Served card */}
          <div style={s.statCard}>
            <div style={s.statIconBox}>🍽️</div>
            <div style={s.statBody}>
              <span style={s.statLabel}>Served:</span>
              <span style={s.statValue}>{servedCount} / {totalEligibleCount}</span>
              <div style={s.progressTrack}>
                <div style={s.progressBar(totalEligibleCount ? (servedCount / totalEligibleCount) * 100 : 0)} />
              </div>
            </div>
          </div>

          {/* Meal Timing card */}
          <div style={s.statCard}>
            <div style={{ ...s.statIconBox, background: '#4f6bed' }}>🕐</div>
            <div style={s.statBody}>
              <span style={s.statLabel}>Meal Timing:</span>
              <span style={s.statValue}>
                {currentMeal ? `${currentMeal.servingStart} – ${currentMeal.servingEnd}` : '—'}
              </span>
              <span style={{ fontSize: 12, color: mealStatus.isActive ? '#16a34a' : mealStatus.hasEnded ? '#dc2626' : '#d97706', fontWeight: 600, marginTop: 2 }}>
                {mealStatus.isActive ? '● Active' : mealStatus.hasEnded ? '● Ended' : '● Not started'}
              </span>
            </div>
          </div>
        </div>

        {/* Table / Roster Container */}
        <div style={s.tableWrapper}>
          {isLoading && roster.length === 0 && (
            <div style={s.center}>
              <div style={s.spinner} />
              <span>Loading roster…</span>
            </div>
          )}

          {isError && roster.length === 0 && (
            <div style={s.center}>
              <span style={{ fontSize: 36 }}>⚠️</span>
              <span style={{ color: '#dc2626' }}>Failed to load roster.</span>
              <button onClick={() => refetch()} style={{ ...s.tapBtn, marginTop: 4 }}>Retry</button>
            </div>
          )}

          {/* If meal has not started */}
          {!isLoading && !isError && mealStatus.hasNotStarted && (
            <div style={s.center}>
              <span style={{ fontSize: 48 }}>⏳</span>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '8px 0 4px' }}>Meal Not Started</h3>
              <p style={{ color: '#64748b', fontSize: 14, maxWidth: 420 }}>
                This meal has not started serving yet. The student roster and check-in options will appear here once serving begins at {currentMeal?.servingStart || 'scheduled time'}.
              </p>
            </div>
          )}

          {/* If meal has ended */}
          {!isLoading && !isError && mealStatus.hasEnded && (
            <div style={s.center}>
              <span style={{ fontSize: 48 }}>🍽️</span>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: '8px 0 4px' }}>Meal Ended</h3>
              <p style={{ color: '#64748b', fontSize: 14, maxWidth: 420 }}>
                Serving hours ({currentMeal ? `${currentMeal.servingStart} – ${currentMeal.servingEnd}` : ''}) have concluded for this meal. Check-ins are now closed.
              </p>
            </div>
          )}

          {/* Active Meal Table */}
          {!isLoading && !isError && mealStatus.isActive && (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Student name</th>
                  <th style={s.th}>ID No</th>
                  <th style={s.thAction}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(student => (
                  <tr
                    key={student.studentId}
                    style={hoveredRow === student.studentId ? s.trHover : {}}
                    onMouseEnter={() => setHoveredRow(student.studentId)}
                    onMouseLeave={() => setHoveredRow(null)}
                    onClick={() => handleMarkServed(student.studentId)}
                  >
                    <td style={{ ...s.td, fontWeight: 600, color: '#1e293b' }}>{student.name}</td>
                    <td style={s.tdMuted}>{student.rollNo || '—'}</td>
                    <td style={s.tdAction}>
                      <button
                        style={s.tapBtn}
                        onClick={e => {
                          e.stopPropagation();
                          handleMarkServed(student.studentId);
                        }}
                      >
                        Tap to Serve
                      </button>
                    </td>
                  </tr>
                ))}

                {tableRows.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ ...s.td, textAlign: 'center', color: '#94a3b8', padding: '50px 20px' }}>
                      {search ? (
                        <span>No students match &quot;{search}&quot;</span>
                      ) : totalEligibleCount > 0 && servedCount >= totalEligibleCount ? (
                        <span>All students have been served! 🎉</span>
                      ) : (
                        <span>No students waiting to be served.</span>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
