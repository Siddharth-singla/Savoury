import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMenu, upsertMenu } from '../api/menu';
import { CalendarDays, Pencil, Sunrise, Sun, Moon, Utensils, Plus, X } from 'lucide-react';

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
};

const CATEGORIES = [
  'Main Entrées',
  'Side Dishes',
  'Condiments',
  'Beverages',
] as const;

type CategoryName = typeof CATEGORIES[number];

/* ── Date helpers ── */
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

function fmtDay(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase();
}

function fmtDateNum(d: Date) {
  return d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
}

function fmtServingTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/* ── Meal Header Icons ── */
function MealHeaderIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('breakfast') || lower.includes('morning')) {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sunrise size={16} color="#b45309" strokeWidth={2.2} />
      </div>
    );
  }
  if (lower.includes('lunch') || lower.includes('noon')) {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sun size={16} color="#c2410c" strokeWidth={2.2} />
      </div>
    );
  }
  if (lower.includes('dinner') || lower.includes('night') || lower.includes('supper')) {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Moon size={16} color="#6b21a8" strokeWidth={2.2} />
      </div>
    );
  }
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Utensils size={16} color={C.textSub} strokeWidth={2.2} />
    </div>
  );
}

/* ── Category Card Component ── */
interface CategoryCardProps {
  category: CategoryName;
  items: string[];
  onSave: (category: CategoryName, items: string[]) => void;
  isSaving: boolean;
}

function CategoryCard({ category, items, onSave, isSaving }: CategoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localItems, setLocalItems] = useState<string[]>(items);
  const [inputVal, setInputVal] = useState('');

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleAddItem = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputVal.trim()) {
      e.preventDefault();
      const val = inputVal.trim();
      if (!localItems.includes(val)) {
        setLocalItems(prev => [...prev, val]);
      }
      setInputVal('');
    }
  };

  const handleRemoveItem = (idx: number) => {
    setLocalItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCommit = () => {
    let finalItems = [...localItems];
    const val = inputVal.trim();
    if (val && !finalItems.includes(val)) {
      finalItems.push(val);
      setLocalItems(finalItems);
      setInputVal('');
    }
    onSave(category, finalItems);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalItems(items);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div style={{
        background: C.surface, borderRadius: 16,
        border: `1px solid ${C.borderFocus}`,
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 12,
        minHeight: 140,
        boxShadow: '0 8px 24px rgba(45,27,14,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{
            fontSize: 16, fontWeight: 800, color: C.primary, margin: 0,
            fontFamily: "'Georgia', serif",
          }}>
            {category}
          </h4>
          <button
            type="button"
            onClick={handleCancel}
            style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16, padding: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Tag chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 28 }}>
          {localItems.map((item, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: C.surface2, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: C.text,
              }}
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemoveItem(idx)}
                style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13, padding: 0, display: 'flex', alignItems: 'center' }}
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </span>
          ))}
          {localItems.length === 0 && (
            <span style={{ fontSize: 12, color: C.textMuted, fontStyle: 'italic' }}>No dishes added yet</span>
          )}
        </div>

        {/* Input to type new dish */}
        <input
          type="text"
          placeholder="Type dish name & press Enter..."
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleAddItem}
          autoFocus
          style={{
            background: C.surface2, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        {/* Save & Cancel */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '6px 14px', borderRadius: 8, background: 'transparent',
              border: `1px solid ${C.border}`, color: C.textSub, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={isSaving}
            style={{
              padding: '6px 16px', borderRadius: 8, background: C.primary,
              border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  // Display View
  return (
    <div
      className="category-card"
      onClick={() => setIsEditing(true)}
      style={{
        background: C.surface, borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 10,
        minHeight: 140,
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{
          fontSize: 16, fontWeight: 800, color: C.primary, margin: 0,
          fontFamily: "'Georgia', serif",
        }}>
          {category}
        </h4>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          title={`Edit ${category}`}
          style={{
            background: 'transparent', border: 'none', color: C.textMuted,
            cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center',
          }}
        >
          <Pencil size={14} strokeWidth={2} />
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
        {items.length > 0 ? (
          <p style={{
            fontSize: 13, lineHeight: 1.6, color: C.textSub, margin: 0,
            fontFamily: "'Inter', sans-serif",
          }}>
            {items.join(', ')}
          </p>
        ) : (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: C.textMuted, fontSize: 13, fontStyle: 'italic',
          }}>
            <Plus size={14} strokeWidth={2} />
            Add items
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Meal Row Component for Selected Day ── */
interface MealRowProps {
  mealType: {
    id: string;
    name: string;
    servingStart: string;
    servingEnd: string;
  };
  categoryData: Record<string, string[]>;
  onSaveMeal: (mealTypeId: string, items: Record<string, string[]>) => void;
  isSaving: boolean;
}

function MealRow({ mealType, categoryData, onSaveMeal, isSaving }: MealRowProps) {
  const servingLabel = mealType.servingStart && mealType.servingEnd
    ? `${fmtServingTime(mealType.servingStart)} - ${fmtServingTime(mealType.servingEnd)}`
    : '';

  const handleCategorySave = (cat: CategoryName, items: string[]) => {
    const updated = {
      ...categoryData,
      [cat]: items,
    };
    onSaveMeal(mealType.id, updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Meal Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 2 }}>
        <MealHeaderIcon name={mealType.name} />
        <h3 style={{
          fontSize: 17, fontWeight: 800, color: C.text, margin: 0,
          fontFamily: "'Georgia', serif",
        }}>
          {mealType.name}
        </h3>
        {servingLabel && (
          <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, fontFamily: "'Inter', sans-serif" }}>
            {servingLabel}
          </span>
        )}
      </div>

      {/* 4 Category Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
      }}>
        {CATEGORIES.map(cat => {
          // Backward compatibility: if cat is "Main Entrées" and categoryData[cat] is empty, fallback to legacy "Items"
          let catItems = categoryData[cat] || [];
          if (cat === 'Main Entrées' && catItems.length === 0 && Array.isArray(categoryData['Items'])) {
            catItems = categoryData['Items'];
          }

          return (
            <CategoryCard
              key={cat}
              category={cat}
              items={catItems}
              onSave={handleCategorySave}
              isSaving={isSaving}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Weekly Menu Page Component ── */
export default function MenuPage() {
  const [weekStart, setWeekStart] = useState(() => getStartOfWeek(new Date()));
  const [selectedDayStr, setSelectedDayStr] = useState(() => toLocalStr(new Date()));

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  const queryStart = new Date(weekStart);
  queryStart.setUTCHours(0, 0, 0, 0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['menu', toLocalStr(weekStart)],
    queryFn: () => getMenu(queryStart.toISOString(), weekEnd.toISOString()),
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: upsertMenu,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Failed to save menu.');
    },
  });

  // Map of `dateStr_mealTypeId` -> Record<string, string[]>
  const [menuMap, setMenuMap] = useState<Record<string, Record<string, string[]>>>({});

  useEffect(() => {
    if (data?.menus) {
      const newMap: Record<string, Record<string, string[]>> = {};
      data.menus.forEach(m => {
        const dateStr = toLocalStr(new Date(m.date));
        const key = `${dateStr}_${m.mealTypeId}`;
        const itemsObj: Record<string, string[]> = {};
        if (m.items) {
          if (Array.isArray(m.items.Items)) {
            itemsObj['Main Entrées'] = m.items.Items;
          } else {
            Object.entries(m.items).forEach(([k, v]) => {
              itemsObj[k] = Array.isArray(v) ? (v as string[]) : [];
            });
          }
        }
        newMap[key] = itemsObj;
      });
      setMenuMap(newMap);
    }
  }, [data]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() - 7);
    setWeekStart(d);
    setSelectedDayStr(toLocalStr(d));
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setUTCDate(d.getUTCDate() + 7);
    setWeekStart(d);
    setSelectedDayStr(toLocalStr(d));
  };

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    return d;
  });

  // Make sure selectedDayStr is inside current week
  useEffect(() => {
    const dayStrs = days.map(toLocalStr);
    if (!dayStrs.includes(selectedDayStr)) {
      setSelectedDayStr(dayStrs[0]);
    }
  }, [weekStart]);

  const mealTypes = data?.mealTypes ?? [];
  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;

  const handleSaveMeal = (mealTypeId: string, items: Record<string, string[]>) => {
    const date = new Date(`${selectedDayStr}T12:00:00Z`).toISOString();
    const key = `${selectedDayStr}_${mealTypeId}`;
    setMenuMap(prev => ({
      ...prev,
      [key]: items,
    }));
    mutation.mutate([{ mealTypeId, date, items }]);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', width: '100%',
      background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif",
      padding: '36px 40px', gap: 28,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .category-card:hover {
          border-color: rgba(45,27,14,0.2) !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.06) !important;
        }
        .day-tab-btn:hover {
          background: rgba(45,27,14,0.05) !important;
        }
      `}</style>

      {/* ── Page Header ── */}
      <div>
        <h1 style={{
          fontSize: 40, fontWeight: 900, color: C.primary, margin: '0 0 8px', lineHeight: 1.1,
          fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: '-0.5px',
        }}>
          WEEKLY MENU
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 620, lineHeight: 1.5 }}>
          Plan and manage meal services across all mess halls. Changes are published to the student app in real-time.
        </p>
      </div>

      {/* ── Week Navigator Pill ── */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 12,
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: 24, padding: '6px 14px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <button
            onClick={prevWeek}
            title="Previous week"
            style={{
              background: 'transparent', border: 'none', color: C.textSub,
              cursor: 'pointer', fontSize: 16, padding: '2px 6px', display: 'flex', alignItems: 'center',
            }}
          >
            ‹
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, fontWeight: 600, color: C.text,
          }}>
            <CalendarDays size={15} color={C.textSub} strokeWidth={2} />
            <span>{weekLabel}</span>
          </div>
          <button
            onClick={nextWeek}
            title="Next week"
            style={{
              background: 'transparent', border: 'none', color: C.textSub,
              cursor: 'pointer', fontSize: 16, padding: '2px 6px', display: 'flex', alignItems: 'center',
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* ── Day Selector Strip ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 10,
      }}>
        {days.map(day => {
          const dateStr = toLocalStr(day);
          const isSelected = dateStr === selectedDayStr;

          return (
            <button
              key={dateStr}
              type="button"
              className="day-tab-btn"
              onClick={() => setSelectedDayStr(dateStr)}
              style={{
                background: isSelected ? C.surface2 : 'transparent',
                border: isSelected ? `1px solid ${C.border}` : '1px solid transparent',
                borderRadius: 16,
                padding: '14px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                color: isSelected ? C.primary : C.textMuted,
              }}>
                {fmtDay(day)}
              </span>
              <span style={{
                fontSize: 20, fontWeight: 800,
                color: isSelected ? C.primary : C.textSub,
                lineHeight: 1.1,
              }}>
                {fmtDateNum(day)}
              </span>
              {/* Active Orange Dot */}
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: isSelected ? '#d97706' : 'transparent',
                marginTop: 2,
              }} />
            </button>
          );
        })}
      </div>

      {/* ── States ── */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '80px 24px', color: C.textMuted, fontSize: 14 }}>
          <div style={{ width: 38, height: 38, border: `3px solid ${C.surface3}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span>Loading menu…</span>
        </div>
      )}

      {isError && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '80px 24px', textAlign: 'center', color: C.textMuted }}>
          <span style={{ fontSize: 48 }}>⚠️</span>
          <p style={{ color: C.danger, margin: 0, fontSize: 14 }}>Failed to load menu.</p>
        </div>
      )}

      {!isLoading && !isError && mealTypes.length === 0 && (
        <div style={{
          background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
          padding: '60px 24px', textAlign: 'center', color: C.textMuted,
        }}>
          <span style={{ fontSize: 48 }}>🍽️</span>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '8px 0 4px', fontFamily: "'Georgia', serif" }}>
            No meal types configured
          </h3>
          <p style={{ fontSize: 14, margin: 0 }}>Set up meal types first to manage the weekly menu.</p>
        </div>
      )}

      {/* ── Meals for Selected Day ── */}
      {!isLoading && !isError && mealTypes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 4 }}>
          {mealTypes.map(mt => {
            const key = `${selectedDayStr}_${mt.id}`;
            const categoryData = menuMap[key] || {};

            return (
              <MealRow
                key={mt.id}
                mealType={mt}
                categoryData={categoryData}
                onSaveMeal={handleSaveMeal}
                isSaving={mutation.isPending}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
