import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMealTypes } from '../api/menu';
import { getRoster, markServed } from '../api/attendance';
import { useAuth } from '../context/AuthContext';

export default function RosterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [mealTypeId, setMealTypeId] = useState('');
  const [search, setSearch] = useState('');
  const [date] = useState(new Date().toISOString());

  const { data: mealTypes } = useQuery({
    queryKey: ['meal-types'],
    queryFn: getMealTypes,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (mealTypes && mealTypes.length > 0 && !mealTypeId) {
      setMealTypeId(mealTypes[0].id);
    }
  }, [mealTypes, mealTypeId]);

  const { data: roster, isLoading, isError } = useQuery({
    queryKey: ['roster', mealTypeId, date.split('T')[0]],
    queryFn: () => getRoster(mealTypeId, date),
    enabled: !!mealTypeId,
    staleTime: 5 * 60 * 1000,
  });

  const markMutation = useMutation({
    mutationFn: markServed,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['roster', mealTypeId, date.split('T')[0]] });
      const previousRoster = queryClient.getQueryData(['roster', mealTypeId, date.split('T')[0]]);
      
      queryClient.setQueryData(['roster', mealTypeId, date.split('T')[0]], (old: any) => {
        if (!old) return old;
        return old.map((student: any) => 
          student.studentId === variables.studentId 
            ? { ...student, isServed: true } 
            : student
        );
      });

      return { previousRoster };
    },
    onError: (err, variables, context) => {
      if (context?.previousRoster) {
        queryClient.setQueryData(['roster', mealTypeId, date.split('T')[0]], context.previousRoster);
      }
      alert('Failed to mark student as served. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['roster', mealTypeId, date.split('T')[0]] });
    },
  });

  const filteredRoster = useMemo(() => {
    if (!roster) return [];
    if (!search.trim()) return roster;
    const lowerSearch = search.toLowerCase();
    return roster.filter(s => 
      s.name.toLowerCase().includes(lowerSearch) || 
      (s.rollNo && s.rollNo.toLowerCase().includes(lowerSearch))
    );
  }, [roster, search]);

  const servedCount = useMemo(() => roster?.filter(s => s.isServed).length ?? 0, [roster]);

  return (
    <div className="scanner-page" style={{ background: 'var(--bg)' }}>
      <div className="scanner-topbar">
        <span className="scanner-topbar-role">
          👤 {user?.name ?? user?.email}
        </span>
        <span className="served-counter">Served today: <strong>{servedCount}</strong> / {roster?.length ?? 0}</span>
      </div>

      <div className="meal-config-bar">
        <label>Meal being served:</label>
        {mealTypes && mealTypes.length > 0 ? (
          <select
            value={mealTypeId}
            onChange={e => setMealTypeId(e.target.value)}
            className="meal-select"
          >
            {mealTypes.map(mt => (
              <option key={mt.id} value={mt.id}>
                {mt.name} ({mt.servingStart}–{mt.servingEnd})
              </option>
            ))}
          </select>
        ) : (
          <span className="text-muted">Loading meal types…</span>
        )}
        
        <input 
          type="text" 
          placeholder="Search name or roll no..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto', maxWidth: '300px' }}
        />
      </div>

      <div className="page" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        {isLoading && (
          <div className="state-center">
            <div className="spinner" />
            <p className="text-muted">Loading roster...</p>
          </div>
        )}
        
        {isError && (
          <div className="state-center">
            <div className="state-icon">⚠️</div>
            <p className="error-msg">Failed to load roster. Check your connection.</p>
          </div>
        )}

        {!isLoading && !isError && roster && (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Booking Status</th>
                  <th>Service Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoster.map(student => (
                  <tr key={student.studentId}>
                    <td>{student.rollNo || '-'}</td>
                    <td style={{ fontWeight: 600 }}>{student.name}</td>
                    <td>
                      {student.status === 'OPTED_IN' && <span className="badge badge-live">OPTED IN</span>}
                      {student.status === 'LOCKED' && <span className="badge badge-final">LOCKED (OPTED IN)</span>}
                      {student.status === 'OPTED_OUT' && <span className="badge" style={{ background: '#334155' }}>OPTED OUT</span>}
                    </td>
                    <td>
                      {student.isServed 
                        ? <span className="text-green" style={{ fontWeight: 600 }}>✓ Served</span> 
                        : <span className="text-muted">Not Served</span>
                      }
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn btn-primary btn-sm"
                        disabled={student.isServed || student.status === 'OPTED_OUT' || markMutation.isPending}
                        onClick={() => markMutation.mutate({ 
                          studentId: student.studentId, 
                          mealTypeId, 
                          date 
                        })}
                      >
                        {student.isServed ? 'Served' : 'Mark Served'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRoster.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px' }} className="text-muted">
                      No students found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
