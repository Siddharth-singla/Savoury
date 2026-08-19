import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsers, updateRole, deleteUser } from '../api/users';
import { useAuth } from '../context/AuthContext';

const ALL_ROLES = ['STUDENT', 'COUNTER_STAFF', 'MESS_COMMITTEE', 'WARDEN_ADMIN', 'SUPER_ADMIN'];
const WARDEN_ASSIGNABLE_ROLES = ['STUDENT', 'COUNTER_STAFF', 'MESS_COMMITTEE', 'WARDEN_ADMIN'];

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const { user } = useAuth();
  const isWardenAdmin = user?.role === 'WARDEN_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const ROLES = isWardenAdmin ? WARDEN_ASSIGNABLE_ROLES : ALL_ROLES;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users', roleFilter, page],
    queryFn: () => listUsers({ role: roleFilter || undefined, page }),
    staleTime: 30_000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      alert('User deleted successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to delete user.');
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>User Management</h1>
        <p>View and manage user roles</p>
      </div>

      <div className="filter-bar">
        <label>Filter by role:
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        {data && <span className="total-label">{data.total} users total</span>}
      </div>

      {isLoading && <div className="state-center"><div className="spinner" /></div>}
      {isError && (
        <div className="state-center">
          <div className="state-icon">⚠️</div>
          <p className="error-msg">{(error as Error).message}</p>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.users.length === 0 ? (
            <div className="state-center">
              <div className="state-icon">👥</div>
              <p>No users found with this filter.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Roll No.</th>
                    <th>Hostel</th>
                    <th>Role</th>
                    <th>Joined</th>
                    {isSuperAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.users.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td className="text-muted">{u.email}</td>
                      <td className="text-muted">{u.rollNo ?? '—'}</td>
                      <td>{u.hostel?.name ?? '—'}</td>
                      <td>
                        <select
                          value={u.role}
                          disabled={roleMutation.isPending}
                          onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                          className="role-select"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                      {isSuperAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="btn btn-outline btn-sm"
                            style={{ color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}
                            disabled={deleteMutation.isPending || u.id === user?.id}
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="pagination">
            <button className="btn btn-sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>← Prev</button>
            <span>Page {data.page} of {Math.ceil(data.total / data.limit) || 1}</span>
            <button className="btn btn-sm" onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(data.total / data.limit)}>Next →</button>
          </div>
        </>
      )}
    </div>
  );
}
