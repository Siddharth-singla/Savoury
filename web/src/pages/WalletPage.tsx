import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topupWallet, getCashoutRequests, resolveCashoutRequest } from '../api/wallet';
import { listUsers } from '../api/users';

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<'topup' | 'cashouts'>('topup');

  return (
    <div className="page" style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <div className="page-header">
        <h1>Wallet Ledger</h1>
        <p>Manage student wallets and cashout requests</p>
      </div>

      <div className="tab-bar" style={{ marginBottom: 24 }}>
        <button 
          className={`tab ${activeTab === 'topup' ? 'tab-active' : ''}`} 
          onClick={() => setActiveTab('topup')}
        >
          Manual Top-Up
        </button>
        <button 
          className={`tab ${activeTab === 'cashouts' ? 'tab-active' : ''}`} 
          onClick={() => setActiveTab('cashouts')}
        >
          Pending Cashouts
        </button>
      </div>

      {activeTab === 'topup' && <TopupTab />}
      {activeTab === 'cashouts' && <CashoutRequestsTab />}
    </div>
  );
}

function TopupTab() {
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState('');
  const [semesterLabel, setSemesterLabel] = useState('2026-Odd');
  const [note, setNote] = useState('');
  
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => listUsers({ limit: 1000 }),
  });

  const mutation = useMutation({
    mutationFn: topupWallet,
    onSuccess: () => {
      alert('Wallet topped up successfully!');
      setAmount('');
      setNote('');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Failed to top up wallet');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !amount || !semesterLabel) return;
    mutation.mutate({
      studentId,
      amount: parseFloat(amount),
      semesterLabel,
      note: note.trim() || undefined,
    });
  };

  const students = usersData?.users.filter(u => u.role === 'STUDENT' || u.role === 'MESS_COMMITTEE') || [];

  return (
    <div className="card" style={{ maxWidth: '500px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Add Funds to Student Wallet</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label className="form-label">Student</label>
          <select 
            className="form-input"
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            required
          >
            <option value="">Select Student...</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.rollNo})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Amount (₹)</label>
          <input 
            type="number" 
            className="form-input"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="1"
            required
          />
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
          <label className="form-label">Note (Optional)</label>
          <input 
            type="text" 
            className="form-input"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Semester Fee Payment"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Processing...' : 'Process Top-Up'}
        </button>
      </form>
    </div>
  );
}

function CashoutRequestsTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cashout-requests'],
    queryFn: () => getCashoutRequests('PENDING'),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string, status: 'APPROVED' | 'REJECTED', note?: string }) => 
      resolveCashoutRequest(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cashout-requests'] });
      alert('Request resolved successfully');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error || 'Failed to resolve request');
    }
  });

  const handleResolve = (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (confirm(`Are you sure you want to ${status.toLowerCase()} this cashout?`)) {
      mutation.mutate({ id, status });
    }
  };

  if (isLoading) return <div className="spinner" />;
  if (isError) return <div>Failed to load requests.</div>;

  const requests = data?.requests || [];

  return (
    <div>
      {requests.length === 0 ? (
        <div className="state-center">
          <p>No pending cashout requests.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Student</th>
              <th>Semester</th>
              <th>Amount (₹)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r: any) => (
              <tr key={r.id}>
                <td>{new Date(r.requestedAt).toLocaleDateString()}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.student.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.student.rollNo}</div>
                </td>
                <td>{r.semesterLabel}</td>
                <td style={{ fontWeight: 'bold' }}>{r.requestedAmount}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => handleResolve(r.id, 'APPROVED')}
                      disabled={mutation.isPending}
                    >Approve</button>
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={() => handleResolve(r.id, 'REJECTED')}
                      disabled={mutation.isPending}
                    >Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
