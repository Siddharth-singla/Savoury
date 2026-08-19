import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listHostels, listFeePlans, setFeePlan } from '../api/hostels';

export default function FeePlanPage() {
  const qc = useQueryClient();
  const [hostelId, setHostelId] = useState('');
  const [semesterLabel, setSemesterLabel] = useState('2026-Odd');
  const [totalFee, setTotalFee] = useState('');

  const { data: hostelsData } = useQuery({
    queryKey: ['hostels'],
    queryFn: listHostels,
  });

  const { data: feePlansData, isLoading } = useQuery({
    queryKey: ['fee-plans'],
    queryFn: listFeePlans,
  });

  const mutation = useMutation({
    mutationFn: (payload: { hostelId: string; semesterLabel: string; totalFee: number }) => 
      setFeePlan(payload.hostelId, { semesterLabel: payload.semesterLabel, totalFee: payload.totalFee }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fee-plans'] });
      alert('Fee plan saved successfully!');
      setTotalFee('');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Failed to save fee plan');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostelId || !semesterLabel || !totalFee) return;
    mutation.mutate({
      hostelId,
      semesterLabel,
      totalFee: parseFloat(totalFee),
    });
  };

  const hostels = hostelsData?.hostels || [];
  const feePlans = feePlansData?.feePlans || [];

  return (
    <div className="page" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div className="page-header">
        <h1>Hostel Fee Plans</h1>
        <p>Manage semester fees for each hostel</p>
      </div>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
        
        {/* Create/Update Form */}
        <div className="card" style={{ flex: '1', minWidth: '300px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Set Semester Fee</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Hostel</label>
              <select 
                className="form-input"
                value={hostelId}
                onChange={e => setHostelId(e.target.value)}
                required
              >
                <option value="">Select Hostel...</option>
                {hostels.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Semester Label</label>
              <input 
                type="text" 
                className="form-input"
                value={semesterLabel}
                onChange={e => setSemesterLabel(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Fee (₹)</label>
              <input 
                type="number" 
                className="form-input"
                value={totalFee}
                onChange={e => setTotalFee(e.target.value)}
                min="1"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Fee Plan'}
            </button>
          </form>
        </div>

        {/* Existing Plans */}
        <div style={{ flex: '2', minWidth: '400px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Existing Plans</h2>
          {isLoading ? (
            <div className="spinner" />
          ) : feePlans.length === 0 ? (
            <p className="text-muted">No fee plans configured yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hostel</th>
                  <th>Semester Label</th>
                  <th>Total Fee (₹)</th>
                </tr>
              </thead>
              <tbody>
                {feePlans.map(fp => (
                  <tr key={fp.id}>
                    <td>{fp.hostel?.name || 'Unknown'}</td>
                    <td>{fp.semesterLabel}</td>
                    <td style={{ fontWeight: 600 }}>{fp.totalFee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
      </div>
    </div>
  );
}
