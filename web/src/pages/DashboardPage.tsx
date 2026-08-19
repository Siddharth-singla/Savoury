import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHeadcount } from '../api/bookings';

function dateStr(d: Date) { return d.toISOString().slice(0, 10); }

export default function DashboardPage() {
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const [viewDate, setViewDate] = useState<'today' | 'tomorrow'>('today');
  const targetDate = viewDate === 'today' ? today : tomorrow;
  const isoDate = new Date(dateStr(targetDate)).toISOString();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['headcount', isoDate],
    queryFn: () => getHeadcount(isoDate),
    refetchInterval: 5_000,
    staleTime: 25_000,
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Headcount Dashboard</h1>
        <p>Expected meal attendance — auto-refreshes every 5s</p>
      </div>

      <div className="tab-bar">
        <button className={`tab ${viewDate === 'today' ? 'tab-active' : ''}`} onClick={() => setViewDate('today')}>
          Today · {dateStr(today)}
        </button>
        <button className={`tab ${viewDate === 'tomorrow' ? 'tab-active' : ''}`} onClick={() => setViewDate('tomorrow')}>
          Tomorrow · {dateStr(tomorrow)}
        </button>
      </div>

      {isLoading && (
        <div className="state-center">
          <div className="spinner" />
          <p>Loading headcount…</p>
        </div>
      )}

      {isError && (
        <div className="state-center">
          <div className="state-icon">⚠️</div>
          <p className="error-msg">{(error as Error).message ?? 'Failed to fetch headcount'}</p>
          <button className="btn btn-primary" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.headcounts.length === 0 ? (
            <div className="state-center">
              <div className="state-icon">🍽️</div>
              <p>No meal types configured yet.</p>
            </div>
          ) : (
            <div className="headcount-grid">
              {data.headcounts.map(hc => (
                <div key={hc.mealTypeId} className={`headcount-card ${hc.locked ? 'card-locked' : 'card-live'}`}>
                  <div className="headcount-card-top">
                    <span className="headcount-meal">{hc.mealTypeName}</span>
                    <span className={`badge ${hc.locked ? 'badge-final' : 'badge-live'}`}>
                      {hc.locked ? '🔒 FINAL' : '🟢 LIVE'}
                    </span>
                  </div>
                  <div className="headcount-count">{hc.count}</div>
                  <div className="headcount-label">students eating ({hc.optedOutCount} opted out of {hc.totalStudents})</div>
                  <div className="headcount-cutoff">
                    Cutoff: {new Date(hc.cutoffAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
