import { useState, useEffect } from 'react';
import { listHostels, createHostel, deleteHostel, updateHostel, listFeePlans, setFeePlan } from '../api/hostels';
import type { Hostel, HostelFeePlan } from '../api/hostels';

export default function HostelsPage() {
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [feePlans, setFeePlans] = useState<HostelFeePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Hostel State
  const [newHostelName, setNewHostelName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [editName, setEditName] = useState('');
  const [editSemesterLabel, setEditSemesterLabel] = useState('2026-Odd');
  const [editFee, setEditFee] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchData = async () => {
    try {
      const [hostelsRes, feePlansRes] = await Promise.all([
        listHostels(),
        listFeePlans()
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
    try {
      const data = await createHostel({ name: newHostelName.trim() });
      setHostels([...hostels, data.hostel]);
      setNewHostelName('');
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
      setHostels(hostels.filter(h => h.id !== id));
      setFeePlans(feePlans.filter(f => f.hostelId !== id));
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
      setEditFee(fp.totalFee.toString());
    } else {
      setEditSemesterLabel('2026-Odd');
      setEditFee('');
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
        setHostels(hostels.map(h => h.id === editingHostel.id ? hData.hostel : h));
      }
      
      // 2. Update Fee Plan if provided
      if (editFee.trim()) {
        const feeVal = parseFloat(editFee);
        if (!isNaN(feeVal)) {
          const fData = await setFeePlan(editingHostel.id, { semesterLabel: editSemesterLabel, totalFee: feeVal });
          
          let updatedFeePlans = [...feePlans];
          const existingIdx = updatedFeePlans.findIndex(f => f.hostelId === editingHostel.id && f.semesterLabel === editSemesterLabel);
          if (existingIdx >= 0) {
            updatedFeePlans[existingIdx] = fData.feePlan;
          } else {
            updatedFeePlans.push(fData.feePlan);
          }
          setFeePlans(updatedFeePlans);
        }
      }
      
      setEditingHostel(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getActiveFee = (hostelId: string) => {
    const fp = feePlans.find(f => f.hostelId === hostelId);
    return fp ? `₹${fp.totalFee} (${fp.semesterLabel})` : 'Not set';
  };

  return (
    <div className="page" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', position: 'relative' }}>
      <div className="page-header">
        <h1>Hostels & Fees</h1>
        <p>Manage hostels and their semester fee plans in one place.</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {/* Add Hostel Form */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Add New Hostel</h2>
        <form onSubmit={handleAddHostel} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label>Hostel Name</label>
            <input
              type="text"
              required
              value={newHostelName}
              onChange={e => setNewHostelName(e.target.value)}
              placeholder="e.g. Hostel A (Boys)"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Adding...' : 'Add Hostel'}
          </button>
        </form>
      </div>

      {/* Hostels List */}
      <div className="card">
        {loading ? (
          <div className="state-center">
            <div className="spinner"></div>
            <p className="text-muted">Loading...</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hostel Name</th>
                  <th>Associated Mess</th>
                  <th>Current Fee Plan</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hostels.map((hostel) => (
                  <tr key={hostel.id}>
                    <td style={{ fontWeight: 500, color: 'var(--text)' }}>
                      {hostel.name}
                    </td>
                    <td className="text-muted">
                      Sodexo
                    </td>
                    <td className="text-muted">
                      {getActiveFee(hostel.id)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => openEditModal(hostel)}
                        className="btn btn-outline btn-sm"
                        style={{ marginRight: '8px' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteHostel(hostel.id)}
                        className="btn btn-outline btn-sm"
                        style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {hostels.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No hostels added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingHostel && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Edit Hostel & Fees</h2>
            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>Hostel Name</label>
                <input 
                  type="text" 
                  required 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Semester Label</label>
                <input 
                  type="text" 
                  required 
                  value={editSemesterLabel}
                  onChange={e => setEditSemesterLabel(e.target.value)}
                  placeholder="e.g. 2026-Odd"
                />
              </div>
              <div className="form-group">
                <label>Total Fee (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required 
                  value={editFee}
                  onChange={e => setEditFee(e.target.value)}
                  placeholder="e.g. 50000"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setEditingHostel(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={isSavingEdit} className="btn btn-primary">
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
