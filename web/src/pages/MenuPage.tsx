import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMenu, upsertMenu } from '../api/menu';

// Use noon UTC to avoid timezone shift edge-cases
function getStartOfWeek(d: Date) {
  const result = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0));
  const day = result.getUTCDay();
  const diff = result.getUTCDate() - day + (day === 0 ? -6 : 1);
  result.setUTCDate(diff);
  return result;
}

function toLocalStr(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function MenuPage() {
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const qc = useQueryClient();

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  
  const queryStart = new Date(weekStart);
  queryStart.setUTCHours(0, 0, 0, 0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['menu', toLocalStr(weekStart)],
    queryFn: () => getMenu(queryStart.toISOString(), weekEnd.toISOString()),
    staleTime: 0,
  });

// Key format: "YYYY-MM-DD_mealTypeId" -> items array
  const [initialData, setInitialData] = useState<Record<string, string[]>>({});
  
  useEffect(() => {
    if (data?.menus) {
      const newForm: Record<string, string[]> = {};
      data.menus.forEach(m => {
        const localDate = new Date(m.date);
        const dateStr = toLocalStr(localDate);
        const key = `${dateStr}_${m.mealTypeId}`;
        
        let items: string[] = [];
        if (m.items) {
          if (Array.isArray(m.items.Items)) {
            items = m.items.Items;
          } else {
            items = Object.values(m.items).flat() as string[];
          }
        }
        newForm[key] = items;
      });
      setInitialData(newForm);
    }
  }, [data]);

  const prevWeek = () => { const d = new Date(weekStart); d.setUTCDate(d.getUTCDate() - 7); setWeekStart(d); };
  const nextWeek = () => { const d = new Date(weekStart); d.setUTCDate(d.getUTCDate() + 7); setWeekStart(d); };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    return d;
  });

  const mealTypes = data?.mealTypes ?? [];

  return (
    <div className="page" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Weekly Menu Management</h1>
          <p>Edit the full week at a glance. Changes are saved per meal.</p>
        </div>
      </div>

      <div className="week-nav" style={{ marginBottom: 24 }}>
        <button className="btn btn-outline btn-sm" onClick={prevWeek}>‹ Previous Week</button>
        <span className="week-label" style={{ fontSize: 16 }}>
          {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <button className="btn btn-outline btn-sm" onClick={nextWeek}>Next Week ›</button>
      </div>

      {isLoading && (
        <div className="state-center">
          <div className="spinner" />
          <p className="text-muted">Loading menu...</p>
        </div>
      )}

      {isError && (
        <div className="state-center">
          <div className="state-icon">⚠️</div>
          <p className="error-msg">Failed to load menus.</p>
        </div>
      )}

      {!isLoading && !isError && mealTypes.length > 0 && (
        <div className="table-wrapper">
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '10%' }}>Day</th>
                {mealTypes.map(mt => (
                  <th key={mt.id} style={{ width: '30%' }}>
                    {mt.name} <br/>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({mt.servingStart}–{mt.servingEnd})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(day => {
                const dateStr = toLocalStr(day);
                const dayName = day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                
                return (
                  <tr key={dateStr}>
                    <td style={{ fontWeight: 600, verticalAlign: 'top', paddingTop: 16 }}>
                      {dayName}
                    </td>
                    {mealTypes.map(mt => {
                      const key = `${dateStr}_${mt.id}`;
                      const initialItems = initialData[key] ?? [];
                      return (
                        <td key={mt.id} style={{ padding: 8, verticalAlign: 'top' }}>
                          <MenuCell 
                            dateStr={dateStr}
                            mealTypeId={mt.id}
                            initialItems={initialItems}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {!isLoading && !isError && mealTypes.length === 0 && (
        <div className="state-center">
          <p className="text-muted">No meal types configured.</p>
        </div>
      )}
    </div>
  );
}

function MenuCell({ dateStr, mealTypeId, initialItems }: { dateStr: string, mealTypeId: string, initialItems: string[] }) {
  const [items, setItems] = useState<string[]>(initialItems);
  const [inputVal, setInputVal] = useState('');
  const qc = useQueryClient();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const mutation = useMutation({
    mutationFn: upsertMenu,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Failed to save meal.');
    }
  });

  const handleSave = () => {
    const date = new Date(`${dateStr}T12:00:00Z`).toISOString();
    mutation.mutate([{
      mealTypeId,
      date,
      items: { Items: items }
    }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputVal.trim()) {
      e.preventDefault();
      if (!items.includes(inputVal.trim())) {
        setItems([...items, inputVal.trim()]);
      }
      setInputVal('');
    }
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const isDirty = JSON.stringify(items) !== JSON.stringify(initialItems);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <span>{item}</span>
            <button 
              onClick={() => removeItem(idx)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 2px' }}
            >×</button>
          </div>
        ))}
      </div>
      
      <input 
        type="text"
        placeholder="Add item & Enter..."
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        className="form-input"
        style={{ fontSize: '12px', padding: '6px' }}
      />
      
      {isDirty && (
        <button 
          className="btn btn-primary btn-sm" 
          onClick={handleSave} 
          disabled={mutation.isPending}
          style={{ alignSelf: 'flex-start', padding: '4px 12px', fontSize: '12px' }}
        >
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
      )}
    </div>
  );
}
