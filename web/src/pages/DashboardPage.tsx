import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHeadcount } from '../api/bookings';
import { getMealTypes } from '../api/menu';
import type { HeadcountEntry } from '../api/bookings';
import { Users, CheckCircle2, Clock, CalendarDays } from 'lucide-react';

/* ── Design tokens — warm light theme ── */
const C = {
  bg:          '#f5f0eb',
  surface:     '#ffffff',
  surface2:    '#f0ebe4',
  surface3:    '#e8e1d8',
  border:      'rgba(0,0,0,0.08)',
  text:        '#1a120b',
  textMuted:   '#7a6855',
  textSub:     '#5c4a38',
  primary:     '#2d1b0e',
  accent:      '#7c3a1e',
  accentLight: 'rgba(124,58,30,0.1)',
  success:     '#3a6b3a',
  successLight:'rgba(58,107,58,0.1)',
  warning:     '#b8860b',
  danger:      '#8b1a1a',
};

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // UTC+5:30

/**
 * The IST calendar date (YYYY-MM-DD) for a given instant, regardless of the
 * viewer's local timezone. Meals/bookings are keyed to the IST calendar day,
 * so "today" must be the IST day — not the browser's local or UTC day.
 * (At e.g. 03:10 IST the UTC date is still the previous day, which previously
 * made the dashboard query the wrong day and show every meal as Final.)
 */
function istDateStr(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO instant for UTC-midnight of the given IST calendar date string. */
function istDateToUtcMidnightIso(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00.000Z').toISOString();
}

function formatDateLabel(dateStr: string) {
  // dateStr is YYYY-MM-DD; render it as a UTC date so it isn't shifted.
  return new Date(dateStr + 'T00:00:00.000Z')
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase();
}

function formatCutoff(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return '—'; }
}

/* ── Food image by meal name ── */
function getMealImage(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('breakfast') || lower.includes('morning')) {
    return 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=300&h=300&fit=crop&crop=center';
  }
  if (lower.includes('lunch') || lower.includes('noon')) {
    return 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop&crop=center';
  }
  if (lower.includes('dinner') || lower.includes('night') || lower.includes('supper')) {
    return 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&h=300&fit=crop&crop=center';
  }
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&crop=center';
}

function formatServingTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ── Circular arc progress ── */
interface DonutProps {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
  value: string;
}
function DonutChart({ pct, size = 160, strokeWidth = 10, color, label, value }: DonutProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const safePct = isNaN(pct) ? 0 : Math.max(0, Math.min(pct, 100));
  const dash = (safePct / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={0}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 2,
        }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: C.primary, lineHeight: 1, fontFamily: "'Georgia', serif" }}>
            {value}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase', fontFamily: "'Inter', sans-serif" }}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Status badge ──
   Lifecycle (today): Upcoming → Final (cutoff passed) → Active (serving) → Over.
   "Over" takes top priority once the serving window has ended. */
function StatusBadge({ locked, isActive, isOver }: { locked: boolean; isActive: boolean; isOver: boolean }) {
  if (isOver) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20,
        background: C.surface2, border: `1px solid ${C.border}`,
        fontSize: 11, fontWeight: 700, color: C.textMuted,
        fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em',
      }}>
        Over
      </span>
    );
  }
  if (isActive) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20,
        background: C.accentLight, border: `1px solid rgba(124,58,30,0.25)`,
        fontSize: 11, fontWeight: 700, color: C.accent,
        fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, display: 'inline-block' }} />
        Active
      </span>
    );
  }
  if (locked) {
    // Cutoff passed but serving hasn't ended yet — bookings are final.
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '3px 10px', borderRadius: 20,
        background: C.successLight, border: `1px solid rgba(58,107,58,0.25)`,
        fontSize: 11, fontWeight: 700, color: C.success,
        fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em',
      }}>
        Final
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: C.surface2, border: `1px solid ${C.border}`,
      fontSize: 11, fontWeight: 700, color: C.textMuted,
      fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em',
    }}>
      Upcoming
    </span>
  );
}

/* ── Stat row ── */
function StatRow({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: React.ReactNode; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ color: C.textMuted, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: valueColor ?? C.text, fontFamily: "'Inter', sans-serif" }}>{value}</span>
    </div>
  );
}

/* ── Meal card ── */
interface MealCardProps {
  hc: HeadcountEntry;
  servingStart?: string;
  servingEnd?: string;
  isActive: boolean;
  isToday: boolean;
}
function MealCard({ hc, servingStart, servingEnd, isActive, isToday }: MealCardProps) {
  // Real attendance: served out of expected (booked) students.
  // Guard divide-by-zero; the donut fill is clamped to 100% even if
  // served exceeds expected (e.g. OVERRIDE walk-ins), while the Actual
  // number below still shows the true served count.
  const expected = hc.count;
  const served = hc.servedCount;
  const rawPct = expected > 0 ? (served / expected) * 100 : 0;
  const pct = Math.min(100, Math.round(rawPct));

  // "Over": today's serving window has fully ended (compared in IST, the
  // timezone the serving times are configured in). Only applies to today —
  // a future day's meal is never "over".
  const isOver = (() => {
    if (!isToday || !servingEnd) return false;
    const istNow = new Date(Date.now() + IST_OFFSET_MS);
    const nowMin = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
    const [eh, em] = servingEnd.split(':').map(Number);
    return nowMin > eh * 60 + em;
  })();

  const arcColor = (hc.locked || isActive) ? C.primary : 'rgba(45,27,14,0.25)';
  const pctLabel = 'Served';
  const pctDisplay = `${pct}%`;

  const timeLabel = servingStart && servingEnd
    ? `${formatServingTime(servingStart)} – ${formatServingTime(servingEnd)}`
    : '';

  return (
    <div style={{
      background: C.surface, borderRadius: 20,
      border: `1px solid ${C.border}`,
      padding: '24px 24px 20px',
      display: 'flex', flexDirection: 'column', gap: 0,
      flex: '1 1 240px', minWidth: 220,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h3 style={{
            fontSize: 22, fontWeight: 800, color: C.text, margin: '0 0 2px',
            fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: '0.02em',
          }}>{hc.mealTypeName}</h3>
          {timeLabel && (
            <p style={{ fontSize: 12, color: C.textMuted, margin: 0, fontFamily: "'Inter', sans-serif" }}>{timeLabel}</p>
          )}
        </div>
        <StatusBadge locked={hc.locked} isActive={isActive} isOver={isOver} />
      </div>

      {/* Image + Donut row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '20px 0 16px' }}>
        {/* Circular food photo */}
        <div style={{
          width: 120, height: 120, borderRadius: '50%', flexShrink: 0,
          overflow: 'hidden',
          border: `3px solid ${C.surface2}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
        }}>
          <img
            src={getMealImage(hc.mealTypeName)}
            alt={hc.mealTypeName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
        {/* Donut chart */}
        <DonutChart
          pct={pct}
          size={120}
          strokeWidth={11}
          color={arcColor}
          label={pctLabel}
          value={pctDisplay}
        />
      </div>

      {/* Stats */}
      <div>
        <StatRow
          icon={<Users size={14} strokeWidth={2} />}
          label="Expected"
          value={expected}
        />
        <StatRow
          icon={<CheckCircle2 size={14} strokeWidth={2} />}
          label="Actual"
          value={served}
          valueColor={hc.locked ? C.success : isActive ? C.accent : C.textMuted}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10 }}>
          <span style={{ color: C.textMuted, display: 'flex', alignItems: 'center', flexShrink: 0 }}><Clock size={14} strokeWidth={2} /></span>
          <span style={{ flex: 1, fontSize: 13, color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Cutoff</span>
          <span style={{
            fontSize: 12, fontWeight: 700, color: C.text,
            background: C.surface2, border: `1px solid ${C.border}`,
            padding: '3px 10px', borderRadius: 8, fontFamily: "'Inter', sans-serif",
          }}>
            {formatCutoff(hc.cutoffAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Page ── */
export default function DashboardPage() {
  const now = new Date();
  // IST calendar dates (YYYY-MM-DD) for today/tomorrow — independent of the
  // viewer's local timezone, so the correct day is queried even in the
  // early-morning IST window where UTC is still the previous day.
  const todayStr = istDateStr(now);
  const tomorrowStr = istDateStr(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  const [viewDate, setViewDate] = useState<'today' | 'tomorrow'>('today');
  const targetDateStr = viewDate === 'today' ? todayStr : tomorrowStr;
  const isoDate = istDateToUtcMidnightIso(targetDateStr);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['headcount', isoDate],
    queryFn: () => getHeadcount(isoDate),
    refetchInterval: 5_000,
    staleTime: 25_000,
  });

  const { data: mealTypes } = useQuery({
    queryKey: ['meal-types'],
    queryFn: getMealTypes,
    staleTime: Infinity,
  });

  /* Determine which meal is currently being served (IST), only for "today". */
  const activeMealTypeId = useMemo(() => {
    if (!mealTypes || viewDate !== 'today') return null;
    // Current time as minutes-since-midnight in IST, regardless of the
    // viewer's local timezone (matches how serving windows are configured).
    const istNow = new Date(Date.now() + IST_OFFSET_MS);
    const nowMin = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();
    const active = mealTypes.find((mt: any) => {
      const [sh, sm] = mt.servingStart.split(':').map(Number);
      const [eh, em] = mt.servingEnd.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      return nowMin >= startMin && nowMin <= endMin;
    });
    return active?.id ?? null;
  }, [mealTypes, viewDate]);

  const mealTypeMap = useMemo(() => {
    if (!mealTypes) return {};
    return Object.fromEntries(mealTypes.map((mt: any) => [mt.id, mt]));
  }, [mealTypes]);

  /* Summary totals */
  const totals = useMemo(() => {
    if (!data || data.headcounts.length === 0) {
      return { expected: 0, total: 0, served: 0 };
    }
    // "expected" is summed across meals (plates to plan for).
    // "total" is the DISTINCT student count — identical on every meal entry,
    // so take it from the first entry rather than summing across meals.
    // "served" is the day total of actually-served students.
    const expected = data.headcounts.reduce((acc, hc) => acc + hc.count, 0);
    return {
      expected,
      total: data.headcounts[0].totalStudents,
      served: data.totalServed ?? data.headcounts.reduce((acc, hc) => acc + hc.servedCount, 0),
    };
  }, [data]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%',
      background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif",
      padding: '36px 40px', gap: 28,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .dash-toggle-btn { transition: all 0.15s; }
        .dash-toggle-btn:hover { opacity: 0.85; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{
            margin: '0 0 12px',
            lineHeight: 1.05,
            fontFamily: "'Georgia', serif",
            textTransform: 'uppercase',
            color: C.primary,
          }}>
            <span style={{
              display: 'block',
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: '-0.3px',
              color: C.primary,
              marginBottom: 4,
            }}>
              {viewDate === 'today' ? "TODAY'S" : "TOMORROW'S"}
            </span>
            <span style={{
              display: 'block',
              fontSize: 52,
              fontWeight: 900,
              letterSpacing: '-1.5px',
              color: C.primary,
            }}>
              HEADCOUNT
            </span>
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 500, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
            Real-time attendance analytics for the mess hall, tracking expected versus actual diners across all meal services.
          </p>
        </div>

        {/* Date chip + toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 10,
            background: C.surface, border: `1px solid ${C.border}`,
            fontSize: 12, fontWeight: 700, color: C.textSub, letterSpacing: '0.06em',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <CalendarDays size={14} strokeWidth={2} color={C.textMuted} />
            {formatDateLabel(targetDateStr)}
          </div>
          <div style={{
            display: 'flex', gap: 0,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 24, padding: 4,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            {(['today', 'tomorrow'] as const).map(v => (
              <button
                key={v}
                className="dash-toggle-btn"
                onClick={() => setViewDate(v)}
                style={{
                  padding: '6px 18px', borderRadius: 20,
                  background: viewDate === v ? C.primary : 'transparent',
                  border: 'none',
                  color: viewDate === v ? '#fff' : C.textMuted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Summary strip ── */}
      {data && data.headcounts.length > 0 && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            {
              label: 'Total Students',
              value: totals.total,
              icon: (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} color={C.textMuted} strokeWidth={1.8} />
                </div>
              ),
            },
            {
              label: 'Total Booked\n(All Meals)',
              value: totals.expected,
              icon: (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={20} color={C.textMuted} strokeWidth={1.8} />
                </div>
              ),
            },
            {
              label: 'Served Today\n(All Meals)',
              value: totals.served,
              icon: (
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: C.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={20} color={C.success} strokeWidth={1.8} />
                </div>
              ),
            },
          ].map(item => (
            <div key={item.label} style={{
              background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
              padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16,
              flex: '1 1 160px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}>
              {item.icon}
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: C.text, lineHeight: 1, fontFamily: "'Georgia', serif" }}>{item.value}</div>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 500, marginTop: 3, whiteSpace: 'pre-line', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── States ── */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '80px 24px', color: C.textMuted, fontSize: 14 }}>
          <div style={{ width: 38, height: 38, border: `3px solid ${C.surface3}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span>Loading headcount…</span>
        </div>
      )}

      {isError && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '80px 24px', textAlign: 'center' }}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ fontSize: 14, color: C.danger, margin: 0 }}>{(error as Error).message ?? 'Failed to fetch headcount'}</p>
          <button onClick={() => refetch()} style={{ padding: '9px 22px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.headcounts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '80px 24px', color: C.textMuted, textAlign: 'center' }}>
              <span style={{ fontSize: 52 }}>🍽️</span>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0, fontFamily: "'Georgia', serif" }}>No meal types configured</h3>
              <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>Set up meal types in the Menu section to see headcounts here.</p>
            </div>
          ) : (
            /* ── Meal Cards ── */
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'stretch' }}>
              {data.headcounts.map(hc => {
                const mt = mealTypeMap[hc.mealTypeId];
                return (
                  <MealCard
                    key={hc.mealTypeId}
                    hc={hc}
                    servingStart={mt?.servingStart}
                    servingEnd={mt?.servingEnd}
                    isActive={hc.mealTypeId === activeMealTypeId}
                    isToday={viewDate === 'today'}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Auto-refresh note ── */}
      <p style={{ fontSize: 11, color: C.textMuted, margin: 0, textAlign: 'right' }}>
        Auto-refreshes every 5s
      </p>
    </div>
  );
}
