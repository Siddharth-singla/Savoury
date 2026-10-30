import { useState, useEffect } from 'react';
import { listHostels, createHostel, deleteHostel, updateHostel, listFeePlans, setFeePlan } from '../api/hostels';
import type { Hostel, HostelFeePlan } from '../api/hostels';
import { Building2, Plus, Pencil, Trash2, X, AlertCircle, Calendar, Check, Search } from 'lucide-react';

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

export default function HostelsPage() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [feePlans, setFeePlans] = useState<HostelFeePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Add Hostel Form State (all fields unified)
  const [newHostelName, setNewHostelName] = useState('');
  const [newSemesterLabel, setNewSemesterLabel] = useState('');
  const [newFee, setNewFee] = useState('');
  const [newSemEndDate, setNewSemEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [editName, setEditName] = useState('');
  const [editSemesterLabel, setEditSemesterLabel] = useState('');
  const [editFee, setEditFee] = useState('');
  const [editSemEndDate, setEditSemEndDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchData = async () => {
    try {
      const [hostelsRes, feePlansRes] = await Promise.all([
        listHostels(),
        listFeePlans(),
      ]);
      setHostels(hostelsRes.hostels);
      setFeePlans(feePlansRes.feePlans);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostelName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // 1. Create Hostel
      const data = await createHostel({ name: newHostelName.trim() });

      // 2. Set Fee Plan and Hostel-Specific Semester End Date
      if (newFee.trim() || newSemEndDate || newSemesterLabel.trim()) {
        const feeVal = newFee.trim() ? parseFloat(newFee) : 0;
        await setFeePlan(data.hostel.id, {
          semesterLabel: newSemesterLabel.trim() || '2026-Odd',
          totalFee: feeVal,
          semesterEndDate: newSemEndDate || null,
        });
      }

      setNewHostelName('');
      setNewSemesterLabel('');
      setNewFee('');
      setNewSemEndDate('');
      setSuccessMsg(`Hostel "${newHostelName.trim()}" and fee plan added successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create hostel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHostel = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this hostel? All associated users and mess data will be lost forever.')) {
      return;
    }
    
    try {
      await deleteHostel(id);
      setHostels(prev => prev.filter(h => h.id !== id));
      setFeePlans(prev => prev.filter(f => f.hostelId !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete hostel');
    }
  };

  const openEditModal = (hostel: Hostel) => {
    setEditingHostel(hostel);
    setEditName(hostel.name);
    
    const fp = feePlans.find(f => f.hostelId === hostel.id);
    if (fp) {
      setEditSemesterLabel(fp.semesterLabel);
      setEditFee(fp.totalFee ? fp.totalFee.toString() : '');
      setEditSemEndDate(fp.semesterEndDate ? fp.semesterEndDate.split('T')[0] : '');
    } else {
      setEditSemesterLabel('');
      setEditFee('');
      setEditSemEndDate('');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHostel || !editName.trim()) return;
    
    setIsSavingEdit(true);
    setError(null);
    try {
      // 1. Update Hostel Name
      if (editName.trim() !== editingHostel.name) {
        const hData = await updateHostel(editingHostel.id, { name: editName.trim() });
        setHostels(prev => prev.map(h => h.id === editingHostel.id ? hData.hostel : h));
      }
      
      // 2. Update Fee Plan and Hostel-Specific Semester End Date
      const feeVal = editFee.trim() ? parseFloat(editFee) : 0;
      await setFeePlan(editingHostel.id, {
        semesterLabel: editSemesterLabel.trim() || '2026-Odd',
        totalFee: feeVal,
        semesterEndDate: editSemEndDate || null,
      });
      
      setEditingHostel(null);
      setSuccessMsg(`Hostel "${editName.trim()}" updated successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getActiveFee = (hostelId: string) => {
    const fp = feePlans.find(f => f.hostelId === hostelId);
    return fp ? `₹${Number(fp.totalFee).toLocaleString('en-IN')} (${fp.semesterLabel})` : 'Not set';
  };

  const getHostelSemEndDate = (hostelId: string) => {
    const fp = feePlans.find(f => f.hostelId === hostelId);
    if (!fp?.semesterEndDate) return 'Not configured';
    const [y, m, d] = fp.semesterEndDate.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  // Filtered hostels based on search input
  const filteredHostels = hostels.filter(h => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchName = h.name.toLowerCase().includes(q);
    const fp = feePlans.find(f => f.hostelId === h.id);
    const matchFee = fp ? fp.totalFee.toString().includes(q) || fp.semesterLabel.toLowerCase().includes(q) : false;
    return matchName || matchFee;
  });

  return (
    <div style={{
      height: '100%', width: '100%',
      display: 'flex', flexDirection: 'column',
      background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif",
      padding: '36px 40px', gap: 20, boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hostel-row:hover { background: rgba(0,0,0,0.02) !important; }
        .hostel-input {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          color: ${C.text} !important;
        }
        .hostel-input-box:focus-within {
          border-color: ${C.borderFocus} !important;
          box-shadow: 0 0 0 3px rgba(45,27,14,0.06) !important;
        }
        .hostel-btn:hover { opacity: 0.92; transform: translateY(-1px); }
        .action-btn:hover { opacity: 0.85; transform: scale(1.02); }

        /* Remove number stepper arrows */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        input[type="number"] {
          -moz-appearance: textfield !important;
          appearance: textfield !important;
        }

        /* High contrast black calendar picker icon */
        input[type="date"] {
          color-scheme: light !important;
          color: ${C.text} !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: brightness(0) !important;
          cursor: pointer !important;
          opacity: 0.75 !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1 !important;
        }

        @media (max-width: 960px) {
          .hostels-side-by-side {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .hostels-form-panel {
            width: 100% !important;
          }
        }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ flexShrink: 0 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
          color: C.textMuted, textTransform: 'uppercase', margin: '0 0 4px',
        }}>
          INSTITUTIONAL SETUP
        </p>
        <h1 style={{
          fontSize: 40, fontWeight: 900, color: C.primary, margin: '0 0 8px', lineHeight: 1.1,
          fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: '-0.5px',
        }}>
          HOSTELS & FEES
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 650, lineHeight: 1.5 }}>
          Manage campus hostels, assigned mess dining facilities, active semester fee plans, and semester cashout cutoff dates.
        </p>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          background: C.dangerBg, border: `1px solid ${C.danger}33`,
          borderLeft: `4px solid ${C.danger}`,
          borderRadius: 12, padding: '12px 16px',
          color: C.danger, fontSize: 14,
        }}>
          <AlertCircle size={18} color={C.danger} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
          background: 'rgba(58,107,58,0.1)', border: '1px solid rgba(58,107,58,0.3)',
          borderLeft: '4px solid #3a6b3a',
          borderRadius: 12, padding: '12px 16px',
          color: '#3a6b3a', fontSize: 14, fontWeight: 600,
        }}>
          <Check size={18} color="#3a6b3a" style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Side-by-Side Main Container: Add Hostel (Left) & Hostels Directory (Right) ── */}
      <div className="hostels-side-by-side" style={{
        display: 'flex', flexDirection: 'row', gap: 24, flex: 1, minHeight: 0,
        overflow: 'hidden', alignItems: 'stretch',
      }}>
        {/* ── Left Panel: Add New Hostel Form Card ── */}
        <div className="hostels-form-panel" style={{
          width: 360, flexShrink: 0,
          background: C.surface, borderRadius: 20,
          border: `1px solid ${C.border}`, padding: '24px 26px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={16} color={C.primary} strokeWidth={2.2} />
            </div>
            <h2 style={{
              fontSize: 18, fontWeight: 800, color: C.primary, margin: 0,
              fontFamily: "'Georgia', serif",
            }}>
              Add New Hostel
            </h2>
          </div>

          <form onSubmit={handleAddHostel} style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {/* Hostel Name */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Hostel Name *
              </label>
              <div className="hostel-input-box" style={{
                display: 'flex', alignItems: 'center',
                background: C.surface2, borderRadius: 12,
                padding: '10px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <input
                  className="hostel-input"
                  type="text"
                  required
                  value={newHostelName}
                  onChange={e => setNewHostelName(e.target.value)}
                  placeholder="e.g. Hostel A (Boys)"
                  disabled={isSubmitting}
                  style={{
                    flex: 1, color: C.text, fontSize: 13, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Semester Label */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Semester Label *
              </label>
              <div className="hostel-input-box" style={{
                display: 'flex', alignItems: 'center',
                background: C.surface2, borderRadius: 12,
                padding: '10px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <input
                  className="hostel-input"
                  type="text"
                  required
                  value={newSemesterLabel}
                  onChange={e => setNewSemesterLabel(e.target.value)}
                  placeholder="Add semester label (e.g. 2026-Odd)"
                  disabled={isSubmitting}
                  style={{
                    flex: 1, color: C.text, fontSize: 13, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Total Fee Plan */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Total Fee Plan (₹) *
              </label>
              <div className="hostel-input-box" style={{
                display: 'flex', alignItems: 'center',
                background: C.surface2, borderRadius: 12,
                padding: '10px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <input
                  className="hostel-input"
                  type="number"
                  step="0.01"
                  required
                  value={newFee}
                  onChange={e => setNewFee(e.target.value)}
                  placeholder="e.g. 50000"
                  disabled={isSubmitting}
                  style={{
                    flex: 1, color: C.text, fontSize: 13, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Semester End Date */}
            <div>
              <label style={{
                display: 'block', fontSize: 11, fontWeight: 700,
                color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Semester End Date (Cashout Gate)
              </label>
              <div className="hostel-input-box" style={{
                display: 'flex', alignItems: 'center',
                background: C.surface2, borderRadius: 12,
                padding: '8px 14px', border: `1px solid ${C.border}`,
                transition: 'all 0.15s',
              }}>
                <input
                  className="hostel-input"
                  type="date"
                  value={newSemEndDate}
                  onChange={e => setNewSemEndDate(e.target.value)}
                  disabled={isSubmitting}
                  style={{
                    flex: 1, color: C.text, fontSize: 13, fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 10 }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="hostel-btn"
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 20px', borderRadius: 12,
                  background: C.primary, border: 'none', color: '#ffffff',
                  fontSize: 13, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1, transition: 'all 0.15s ease',
                  boxShadow: '0 2px 8px rgba(45,27,14,0.12)', height: 44,
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span>Adding Hostel…</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Add Hostel & Setup</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ── Right Panel: Hostels Directory & Search Card ── */}
        <div style={{
          flex: 1, minWidth: 0, minHeight: 0,
          background: C.surface, borderRadius: 20,
          border: `1px solid ${C.border}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Toolbar: Search input + Count badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 16, padding: '16px 24px', borderBottom: `1px solid ${C.border}`,
            flexShrink: 0, flexWrap: 'wrap',
          }}>
            {/* Search Bar */}
            <div style={{
              flex: 1, minWidth: 240, maxWidth: 400,
              display: 'flex', alignItems: 'center', gap: 10,
              background: C.surface2, borderRadius: 10,
              padding: '9px 14px', border: `1px solid ${C.border}`,
            }}>
              <Search size={16} color={C.textMuted} strokeWidth={2} />
              <input
                type="text"
                placeholder="Search hostels by name or fee..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: C.text, fontSize: 13, fontFamily: 'inherit',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>

            <div style={{
              fontSize: 12, fontWeight: 700, color: C.textMuted,
              background: C.surface2, padding: '7px 14px', borderRadius: 8,
              border: `1px solid ${C.border}`,
            }}>
              {filteredHostels.length} {filteredHostels.length === 1 ? 'Hostel' : 'Hostels'}
            </div>
          </div>

          {/* Table Container with Internal Scroll */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 12, color: C.textMuted, fontSize: 14 }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.surface3}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span>Loading hostels…</span>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 620 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: C.surface2 }}>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
                    <th style={{ padding: '14px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>HOSTEL NAME</th>
                    <th style={{ padding: '14px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>ASSOCIATED MESS</th>
                    <th style={{ padding: '14px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>CURRENT FEE PLAN</th>
                    <th style={{ padding: '14px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>SEMESTER END</th>
                    <th style={{ padding: '14px 20px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHostels.map((hostel) => (
                    <tr
                      key={hostel.id}
                      className="hostel-row"
                      style={{ borderBottom: `1px solid ${C.border}`, transition: 'background 0.12s' }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                          {hostel.name}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-block', padding: '4px 10px', borderRadius: 8,
                          background: C.surface2, color: C.textSub, fontSize: 12, fontWeight: 600,
                        }}>
                          Sodexo
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: C.textSub, fontWeight: 600 }}>
                        {getActiveFee(hostel.id)}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 12, color: C.textSub }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={13} color={C.accent} />
                          <span>{getHostelSemEndDate(hostel.id)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            onClick={() => openEditModal(hostel)}
                            className="action-btn"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '6px 12px', borderRadius: 8,
                              background: C.surface2, border: `1px solid ${C.border}`,
                              color: C.primary, fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <Pencil size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteHostel(hostel.id)}
                            className="action-btn"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              padding: '6px 12px', borderRadius: 8,
                              background: C.dangerBg, border: `1px solid ${C.danger}33`,
                              color: C.danger, fontSize: 12, fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredHostels.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '60px 24px', color: C.textMuted }}>
                        <span style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>🏢</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                          {search ? 'No matching hostels found' : 'No hostels added yet'}
                        </span>
                        {search && (
                          <p style={{ fontSize: 12, margin: '4px 0 0' }}>Try changing or clearing your search term.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal with All Details (Hostel Name, Semester Label, Fee Plan, Semester End Date) ── */}
      {editingHostel && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(22,10,4,0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: 20,
        }}>
          <div style={{
            background: C.surface, borderRadius: 24, width: '100%', maxWidth: 460,
            border: `1px solid ${C.border}`, padding: '28px 32px',
            boxShadow: '0 16px 48px rgba(45,27,14,0.18)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{
                fontSize: 20, fontWeight: 800, color: C.primary, margin: 0,
                fontFamily: "'Georgia', serif",
              }}>
                Edit Hostel & Fee Plan
              </h2>
              <button
                type="button"
                onClick={() => setEditingHostel(null)}
                style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Hostel Name
                </label>
                <div className="hostel-input-box" style={{
                  display: 'flex', alignItems: 'center',
                  background: C.surface2, borderRadius: 12,
                  padding: '10px 16px', border: `1px solid ${C.border}`,
                }}>
                  <input
                    className="hostel-input"
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    style={{ flex: 1, color: C.text, fontSize: 14, fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Semester Label
                </label>
                <div className="hostel-input-box" style={{
                  display: 'flex', alignItems: 'center',
                  background: C.surface2, borderRadius: 12,
                  padding: '10px 16px', border: `1px solid ${C.border}`,
                }}>
                  <input
                    className="hostel-input"
                    type="text"
                    required
                    value={editSemesterLabel}
                    onChange={e => setEditSemesterLabel(e.target.value)}
                    placeholder="Add semester label (e.g. 2026-Odd)"
                    style={{ flex: 1, color: C.text, fontSize: 14, fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Total Fee Plan (₹)
                </label>
                <div className="hostel-input-box" style={{
                  display: 'flex', alignItems: 'center',
                  background: C.surface2, borderRadius: 12,
                  padding: '10px 16px', border: `1px solid ${C.border}`,
                }}>
                  <input
                    className="hostel-input"
                    type="number"
                    step="0.01"
                    required
                    value={editFee}
                    onChange={e => setEditFee(e.target.value)}
                    placeholder="e.g. 50000"
                    style={{ flex: 1, color: C.text, fontSize: 14, fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  color: C.textSub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Semester End Date (Cashout Gate)
                </label>
                <div className="hostel-input-box" style={{
                  display: 'flex', alignItems: 'center',
                  background: C.surface2, borderRadius: 12,
                  padding: '8px 16px', border: `1px solid ${C.border}`,
                }}>
                  <input
                    className="hostel-input"
                    type="date"
                    value={editSemEndDate}
                    onChange={e => setEditSemEndDate(e.target.value)}
                    style={{ flex: 1, color: C.text, fontSize: 14, fontFamily: 'inherit' }}
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setEditingHostel(null)}
                  style={{
                    padding: '10px 18px', borderRadius: 12,
                    background: 'transparent', border: `1px solid ${C.border}`,
                    color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="hostel-btn"
                  style={{
                    padding: '10px 22px', borderRadius: 12,
                    background: C.primary, border: 'none', color: '#ffffff',
                    fontSize: 13, fontWeight: 700, cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                    opacity: isSavingEdit ? 0.6 : 1,
                  }}
                >
                  {isSavingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
