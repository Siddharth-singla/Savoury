import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listUsers, updateRole, updateUser, deleteUser, createUser } from '../api/users';
import type { UserRow } from '../api/users';
import { listHostels } from '../api/hostels';
import type { Hostel } from '../api/hostels';
import { useAuth } from '../context/AuthContext';
import { Search, SlidersHorizontal, Pencil, Trash2, X, Users, GraduationCap, UtensilsCrossed, ShieldAlert, UserPlus } from 'lucide-react';

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
  dangerDim:   'rgba(139,26,26,0.1)',
};

const HOSTEL_ADMIN_ROLES = ['WARDEN_ADMIN', 'CO_WARDEN', 'CARETAKER'];
const ALL_ROLES = ['STUDENT', 'MESS_COMMITTEE', 'COUNTER_STAFF', 'CARETAKER', 'CO_WARDEN', 'WARDEN_ADMIN', 'SUPER_ADMIN'];
// Roles a hostel admin may see in filters / inline role control.
const WARDEN_FILTER_ROLES = ['STUDENT', 'MESS_COMMITTEE', 'COUNTER_STAFF'];

const isHostelAdminRole = (role?: string | null) => !!role && HOSTEL_ADMIN_ROLES.includes(role);

function getRoleLabel(role: string): string {
  switch (role) {
    case 'STUDENT': return 'Student';
    case 'MESS_COMMITTEE': return 'Mess Sec.';
    case 'COUNTER_STAFF': return 'Mess Staff';
    case 'CARETAKER': return 'Caretaker';
    case 'CO_WARDEN': return 'Co-Warden';
    case 'WARDEN_ADMIN': return 'Warden';
    case 'SUPER_ADMIN': return 'Super Admin';
    default: return role;
  }
}

function getRoleStyle(role: string) {
  switch (role) {
    case 'STUDENT':
      return {
        bg: '#fef3c7',
        border: '1px solid rgba(217,119,6,0.25)',
        color: '#b45309',
      };
    case 'COUNTER_STAFF':
    case 'MESS_COMMITTEE':
      return {
        bg: '#f0ebe4',
        border: '1px solid rgba(0,0,0,0.1)',
        color: '#5c4a38',
      };
    case 'CARETAKER':
    case 'CO_WARDEN':
    case 'WARDEN_ADMIN':
    case 'SUPER_ADMIN':
      return {
        bg: '#2d1b0e',
        border: '1px solid #2d1b0e',
        color: '#ffffff',
      };
    default:
      return {
        bg: '#f0ebe4',
        border: '1px solid rgba(0,0,0,0.1)',
        color: '#5c4a38',
      };
  }
}

function avatarColor(name: string) {
  const colors = ['#2d1b0e', '#7c3a1e', '#8b5cf6', '#b45309', '#3a6b3a', '#0369a1', '#be123c', '#0f766e'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

function UserAvatar({ name, size = 38 }: { name: string; size?: number }) {
  const bg = avatarColor(name || 'User');
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0,
      fontFamily: "'Inter', sans-serif",
    }}>
      {name?.trim()[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isWarden = currentUser?.role === 'WARDEN_ADMIN';
  const isCoWarden = currentUser?.role === 'CO_WARDEN';
  const isHostelAdmin = isHostelAdminRole(currentUser?.role);
  // Can this user add Mess Staff? (Warden & Co-Warden only — not Caretaker)
  const canAddStaff = isWarden || isCoWarden;

  // Role options for the inline role control + role filter dropdown.
  const ROLES = isHostelAdmin ? WARDEN_FILTER_ROLES : ALL_ROLES;

  // Hostels — only needed for the Super Admin (hostel filter + create picker).
  const { data: hostelData } = useQuery({
    queryKey: ['hostels'],
    queryFn: listHostels,
    enabled: isSuperAdmin,
    staleTime: 60_000,
  });
  const hostels: Hostel[] = hostelData?.hostels ?? [];

  const pageSize = 500;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['users', roleFilter, hostelFilter, debouncedSearch],
    queryFn: () => listUsers({
      role: roleFilter || undefined,
      hostelId: hostelFilter || undefined,
      limit: pageSize,
      search: debouncedSearch || undefined,
    }),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const sortedUsers = useMemo(() => {
    if (!data?.users) return [];
    const query = debouncedSearch.toLowerCase().trim();
    if (!query) return data.users;
    return [...data.users].sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aRoll = (a.rollNo || '').toLowerCase();
      const bRoll = (b.rollNo || '').toLowerCase();

      // 1. Exact match on rollNo or name
      const aExact = aRoll === query || aName === query;
      const bExact = bRoll === query || bName === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // 2. Starts with query (Roll No, Name)
      const aStarts = aRoll.startsWith(query) || aName.startsWith(query);
      const bStarts = bRoll.startsWith(query) || bName.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return aName.localeCompare(bName);
    });
  }, [data?.users, debouncedSearch]);

  /* ── 4 Stat Cards Counts ── */
  const { data: totalStats } = useQuery({
    queryKey: ['users-stat-total'],
    queryFn: () => listUsers({ limit: 1 }),
    staleTime: 30_000,
  });
  const { data: dinersStats } = useQuery({
    queryKey: ['users-stat-diners'],
    queryFn: () => listUsers({ role: 'STUDENT', limit: 1 }),
    staleTime: 30_000,
  });
  const { data: staffStats } = useQuery({
    queryKey: ['users-stat-staff'],
    queryFn: () => listUsers({ role: 'COUNTER_STAFF', limit: 1 }),
    staleTime: 30_000,
  });
  const { data: adminStats } = useQuery({
    queryKey: ['users-stat-admin'],
    queryFn: () => listUsers({ role: 'WARDEN_ADMIN', limit: 1 }),
    staleTime: 30_000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => updateRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err: any) => alert(err?.response?.data?.error || 'Failed to update role'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Failed to delete user.');
    },
  });

  const handleDelete = (u: UserRow) => {
    if (window.confirm(`Are you sure you want to delete user "${u.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(u.id);
    }
  };

  return (
    <div style={{
      height: '100%', width: '100%',
      display: 'flex', flexDirection: 'column',
      background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif",
      padding: '36px 40px', gap: 20, boxSizing: 'border-box', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .user-row:hover { background: rgba(0,0,0,0.02) !important; }
        .role-pill-select:hover { opacity: 0.9 !important; }
      `}</style>

      {/* ── Page Header ── */}
      <div style={{ flexShrink: 0 }}>
        <h1 style={{
          fontSize: 40, fontWeight: 900, color: C.primary, margin: '0 0 8px', lineHeight: 1.1,
          fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: '-0.5px',
        }}>
          USER DIRECTORY
        </h1>
        <p style={{ fontSize: 14, color: C.textMuted, margin: 0, maxWidth: 650, lineHeight: 1.5 }}>
          Manage system access, roles, and institutional details for all diners, staff, and administrators within the Savoury network.
        </p>
      </div>

      {/* ── 4 Top Counter Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, flexShrink: 0 }}>
        {/* TOTAL */}
        <div style={{
          background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: C.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={18} color="#ffffff" strokeWidth={2} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              background: C.surface2, color: C.textSub,
              padding: '3px 9px', borderRadius: 12,
            }}>
              TOTAL
            </span>
          </div>
          <div>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.text, fontFamily: "'Georgia', serif", lineHeight: 1 }}>
              {(totalStats?.total ?? data?.total ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, fontWeight: 500 }}>
              Active Users
            </div>
          </div>
        </div>

        {/* DINERS */}
        <div style={{
          background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: '#fef3c7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={18} color="#b45309" strokeWidth={2} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              background: '#fef3c7', color: '#b45309',
              padding: '3px 9px', borderRadius: 12,
            }}>
              DINERS
            </span>
          </div>
          <div>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.text, fontFamily: "'Georgia', serif", lineHeight: 1 }}>
              {(dinersStats?.total ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, fontWeight: 500 }}>
              Registered Students
            </div>
          </div>
        </div>

        {/* STAFF */}
        <div style={{
          background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: C.surface2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UtensilsCrossed size={18} color="#5c4a38" strokeWidth={2} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              background: C.surface2, color: C.textSub,
              padding: '3px 9px', borderRadius: 12,
            }}>
              STAFF
            </span>
          </div>
          <div>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.text, fontFamily: "'Georgia', serif", lineHeight: 1 }}>
              {(staffStats?.total ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, fontWeight: 500 }}>
              Mess Staff
            </div>
          </div>
        </div>

        {/* ADMIN */}
        <div style={{
          background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
          padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: '#ffe4e6',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldAlert size={18} color="#be123c" strokeWidth={2} />
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
              background: '#ffe4e6', color: '#be123c',
              padding: '3px 9px', borderRadius: 12,
            }}>
              ADMIN
            </span>
          </div>
          <div>
            <div style={{ fontSize: 30, fontWeight: 900, color: C.text, fontFamily: "'Georgia', serif", lineHeight: 1 }}>
              {(adminStats?.total ?? 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4, fontWeight: 500 }}>
              Administrators
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Card Container ── */}
      <div style={{
        background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minHeight: 0,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}>

        {/* ── Toolbar: Search + Filter ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, padding: '18px 24px', borderBottom: `1px solid ${C.border}`,
          flexWrap: 'wrap', flexShrink: 0,
        }}>
          {/* Search bar */}
          <div style={{
            flex: 1, minWidth: 280, maxWidth: 440,
            display: 'flex', alignItems: 'center', gap: 10,
            background: C.surface2, borderRadius: 10,
            padding: '10px 14px', border: `1px solid ${C.border}`,
          }}>
            <Search size={16} color={C.textMuted} strokeWidth={2} />
            <input
              type="text"
              placeholder="Search users by name, email, or roll no..."
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

          {/* Right actions: Filter by hostel (Super Admin), filter by role, Add User */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {isSuperAdmin && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.surface2, borderRadius: 10,
                padding: '0 14px', border: `1px solid ${C.border}`,
                height: 42,
              }}>
                <SlidersHorizontal size={14} color={C.textMuted} strokeWidth={2} />
                <select
                  value={hostelFilter}
                  onChange={e => setHostelFilter(e.target.value)}
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    color: C.text, fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
                    cursor: 'pointer', appearance: 'none', paddingRight: 16,
                  }}
                >
                  <option value="" style={{ background: C.surface, color: C.text }}>All Hostels</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id} style={{ background: C.surface, color: C.text }}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: C.surface2, borderRadius: 10,
              padding: '0 14px', border: `1px solid ${C.border}`,
              height: 42,
            }}>
              <SlidersHorizontal size={14} color={C.textMuted} strokeWidth={2} />
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                style={{
                  background: 'transparent', border: 'none', outline: 'none',
                  color: C.text, fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
                  cursor: 'pointer', appearance: 'none', paddingRight: 16,
                }}
              >
                <option value="" style={{ background: C.surface, color: C.text }}>All Roles</option>
                {ROLES.map(r => (
                  <option key={r} value={r} style={{ background: C.surface, color: C.text }}>{getRoleLabel(r)}</option>
                ))}
              </select>
            </div>

            {/* Add User — Super Admin always; Warden/Co-Warden to add Mess Staff */}
            {(isSuperAdmin || canAddStaff) && (
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  height: 42, padding: '0 18px', borderRadius: 10,
                  background: C.primary, border: 'none', color: '#fff',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <UserPlus size={15} strokeWidth={2.2} />
                {isSuperAdmin ? 'Add User' : 'Add Mess Staff'}
              </button>
            )}
          </div>
        </div>

        {/* ── Table / Content ── */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 12, color: C.textMuted, fontSize: 14 }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${C.surface3}`, borderTopColor: C.primary, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Loading users…
          </div>
        )}

        {isError && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
            <span style={{ fontSize: 40 }}>⚠️</span>
            <p style={{ color: C.danger, margin: 0, fontSize: 14 }}>{(error as Error).message || 'Failed to fetch users'}</p>
            <button onClick={() => refetch()} style={{ padding: '8px 18px', borderRadius: 8, background: C.primary, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <>
            {data.users.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 12, color: C.textMuted, textAlign: 'center' }}>
                <span style={{ fontSize: 44 }}>👥</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: 0, fontFamily: "'Georgia', serif" }}>No users found</h3>
                <p style={{ fontSize: 13, margin: 0 }}>Try clearing filters or search query.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 650 }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 2, background: C.surface2 }}>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
                      <th style={{ padding: '12px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>USER</th>
                      <th style={{ padding: '12px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>ROLE & ACCESS</th>
                      <th style={{ padding: '12px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase' }}>LOCATION</th>
                      <th style={{ padding: '12px 24px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.textMuted, textTransform: 'uppercase', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u) => {
                      const roomDisplay = u.roomNo ? `Room ${u.roomNo}` : '—';
                      const roleStyle = getRoleStyle(u.role);

                      // Role is NOT changeable from the inline control when:
                      //  - the row is a Super Admin (never demoted from this UI), or
                      //  - the row is a hostel-admin (Warden/Co-Warden/Caretaker)
                      //    and the viewer is not a Super Admin.
                      // Only a Super Admin may change a hostel-admin's role.
                      const roleLocked =
                        u.role === 'SUPER_ADMIN' ||
                        (HOSTEL_ADMIN_ROLES.includes(u.role) && !isSuperAdmin);

                      return (
                        <tr
                          key={u.id}
                          className="user-row"
                          style={{
                            borderBottom: `1px solid ${C.border}`,
                            transition: 'background 0.12s',
                          }}
                        >
                          {/* USER column */}
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <UserAvatar name={u.name} size={38} />
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                                  {u.name}
                                </div>
                                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                                  {u.email} {u.rollNo ? `• ${u.rollNo}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* ROLE & ACCESS column */}
                          <td style={{ padding: '16px 24px' }}>
                            {roleLocked ? (
                              // Static, non-editable badge — role can only be
                              // changed by a Super Admin (and never for a Super Admin).
                              <span style={{
                                display: 'inline-block',
                                background: roleStyle.bg,
                                border: roleStyle.border,
                                borderRadius: 8,
                                color: roleStyle.color,
                                fontSize: 11,
                                fontWeight: 700,
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                                padding: '6px 12px',
                                fontFamily: 'inherit',
                              }}>
                                {getRoleLabel(u.role)}
                              </span>
                            ) : (
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <select
                                  value={u.role}
                                  disabled={roleMutation.isPending}
                                  onChange={e => roleMutation.mutate({ id: u.id, role: e.target.value })}
                                  className="role-pill-select"
                                  style={{
                                    background: roleStyle.bg,
                                    border: roleStyle.border,
                                    borderRadius: 8,
                                    color: roleStyle.color,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase',
                                    padding: '6px 24px 6px 12px',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none',
                                    fontFamily: 'inherit',
                                    transition: 'opacity 0.15s',
                                  }}
                                >
                                  {ROLES.map(r => (
                                    <option key={r} value={r} style={{ background: C.surface, color: C.text }}>
                                      {getRoleLabel(r)}
                                    </option>
                                  ))}
                                </select>
                                <span style={{
                                  position: 'absolute', right: 8, top: '50%',
                                  transform: 'translateY(-50%)', pointerEvents: 'none',
                                  fontSize: 10, color: roleStyle.color,
                                }}>
                                  ▾
                                </span>
                              </div>
                            )}
                          </td>

                          {/* LOCATION column */}
                          <td style={{ padding: '16px 24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: u.roomNo ? C.text : C.textMuted }}>
                                {roomDisplay}
                              </span>
                              {u.hostel?.name && (
                                <span style={{ fontSize: 11, color: C.textMuted }}>
                                  {u.hostel.name}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* ACTIONS column */}
                          <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                              {/* Direct Edit Button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingUser(u); }}
                                title="Edit User"
                                style={{
                                  background: C.surface2,
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 8,
                                  color: C.textSub,
                                  cursor: 'pointer',
                                  padding: '6px 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.color = C.primary; e.currentTarget.style.borderColor = C.primary; }}
                                onMouseLeave={e => { e.currentTarget.style.color = C.textSub; e.currentTarget.style.borderColor = C.border; }}
                              >
                                <Pencil size={13} strokeWidth={2} />
                                Edit
                              </button>

                              {/* Direct Delete Button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(u); }}
                                disabled={u.id === currentUser?.id || deleteMutation.isPending}
                                title="Delete User"
                                style={{
                                  background: C.dangerDim,
                                  border: `1px solid rgba(139,26,26,0.2)`,
                                  borderRadius: 8,
                                  color: C.danger,
                                  cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer',
                                  padding: '6px 10px',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  opacity: u.id === currentUser?.id ? 0.4 : 1,
                                  transition: 'opacity 0.15s',
                                }}
                              >
                                <Trash2 size={13} strokeWidth={2} />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Edit User Modal ── */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          roles={ROLES}
          onClose={() => setEditingUser(null)}
          onSubmit={async (formData) => {
            await updateUser(editingUser.id, formData);
            qc.invalidateQueries({ queryKey: ['users'] });
            setEditingUser(null);
          }}
        />
      )}

      {/* ── Create User Modal ── */}
      {showCreate && (
        <CreateUserModal
          isSuperAdmin={isSuperAdmin}
          hostels={hostels}
          onClose={() => setShowCreate(false)}
          onSubmit={async (payload) => {
            await createUser(payload);
            qc.invalidateQueries({ queryKey: ['users'] });
            qc.invalidateQueries({ queryKey: ['users-stat-total'] });
            qc.invalidateQueries({ queryKey: ['users-stat-diners'] });
            qc.invalidateQueries({ queryKey: ['users-stat-staff'] });
            qc.invalidateQueries({ queryKey: ['users-stat-admin'] });
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}

/* ── Edit User Modal Component ── */
interface EditUserModalProps {
  user: UserRow;
  roles: string[];
  onClose: () => void;
  onSubmit: (formData: any) => Promise<void>;
}

function EditUserModal({ user, roles, onClose, onSubmit }: EditUserModalProps) {
  const [name, setName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [rollNo, setRollNo] = useState(user.rollNo || '');
  const [roomNo, setRoomNo] = useState(user.roomNo || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [role, setRole] = useState(user.role || 'STUDENT');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMsg('Name and email are required');
      return;
    }
    if (!email.trim().endsWith('@thapar.edu')) {
      setErrorMsg('Email must end with @thapar.edu');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        rollNo: rollNo.trim() || null,
        roomNo: roomNo.trim() || null,
        phone: phone.trim() || null,
        role,
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
        width: '100%', maxWidth: 500, padding: '30px 32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0, fontFamily: "'Georgia', serif" }}>Edit User</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 18, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div style={{
            background: C.dangerDim, border: '1px solid rgba(139,26,26,0.2)',
            borderRadius: 10, padding: '10px 14px', color: C.danger, fontSize: 13, marginBottom: 16,
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              style={{
                background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '10px 14px', color: C.text, fontSize: 14, width: '100%', outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. s.jenkins@college.edu"
              style={{
                background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '10px 14px', color: C.text, fontSize: 14, width: '100%', outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Room Number
              </label>
              <input
                type="text"
                value={roomNo}
                onChange={e => setRoomNo(e.target.value)}
                placeholder="e.g. 214"
                style={{
                  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: '10px 14px', color: C.text, fontSize: 14, width: '100%', outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Roll Number
              </label>
              <input
                type="text"
                value={rollNo}
                onChange={e => setRollNo(e.target.value)}
                placeholder="e.g. CS21045"
                style={{
                  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: '10px 14px', color: C.text, fontSize: 14, width: '100%', outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                style={{
                  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: '10px 14px', color: C.text, fontSize: 14, width: '100%', outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Role
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{
                  background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: '10px 14px', color: C.text, fontSize: 14, width: '100%', outline: 'none',
                }}
              >
                {roles.map(r => (
                  <option key={r} value={r} style={{ background: C.surface, color: C.text }}>
                    {getRoleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px', borderRadius: 10,
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px', borderRadius: 10,
                background: C.primary,
                border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Create User Modal Component ── */
interface CreateUserModalProps {
  isSuperAdmin: boolean;
  hostels: Hostel[];
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    hostelId?: string | null;
    rollNo?: string | null;
    phone?: string | null;
    roomNo?: string | null;
  }) => Promise<void>;
}

// Roles a Super Admin may create from this screen, in display order.
const SUPERADMIN_CREATABLE_ROLES = [
  'WARDEN_ADMIN',
  'CO_WARDEN',
  'CARETAKER',
  'COUNTER_STAFF',
  'MESS_COMMITTEE',
  'STUDENT',
];

function CreateUserModal({ isSuperAdmin, hostels, onClose, onSubmit }: CreateUserModalProps) {
  // Super Admin picks any creatable role; Warden/Co-Warden can only add Mess Staff.
  const creatableRoles = isSuperAdmin ? SUPERADMIN_CREATABLE_ROLES : ['COUNTER_STAFF'];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(creatableRoles[0]);
  const [hostelId, setHostelId] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [roomNo, setRoomNo] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Mess Staff / caretakers / wardens are not app students, so roll/room are
  // only meaningful for STUDENT / MESS_COMMITTEE accounts.
  const isStudentType = role === 'STUDENT' || role === 'MESS_COMMITTEE';
  // Super Admin must choose a hostel for every role except (there is none here
  // that is hostel-less — all creatable roles are hostel-bound).
  const needsHostel = isSuperAdmin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Name, email and password are required');
      return;
    }
    if (!email.trim().endsWith('@thapar.edu')) {
      setErrorMsg('Email must end with @thapar.edu');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (needsHostel && !hostelId) {
      setErrorMsg('Please select a hostel for this user');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        // Warden/Co-Warden: backend forces their own hostel, so we omit it.
        hostelId: isSuperAdmin ? (hostelId || null) : undefined,
        rollNo: isStudentType ? (rollNo.trim() || null) : null,
        roomNo: isStudentType ? (roomNo.trim() || null) : null,
        phone: phone.trim() || null,
      });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10,
    padding: '10px 14px', color: C.text, fontSize: 14, width: '100%', outline: 'none',
  } as const;
  const labelStyle = {
    fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase',
    display: 'block', marginBottom: 6,
  } as const;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`,
        width: '100%', maxWidth: 500, padding: '30px 32px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0, fontFamily: "'Georgia', serif" }}>
            {isSuperAdmin ? 'Add User' : 'Add Mess Staff'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.textMuted, fontSize: 18, cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: C.textMuted, margin: '0 0 18px', lineHeight: 1.5 }}>
          {isSuperAdmin
            ? 'Create a warden, co-warden, caretaker, mess staff, or student. Wardens and co-wardens are limited to one per hostel.'
            : 'Mess staff are created with login credentials and do not register through the app. They can scan and let students in for meals.'}
        </p>

        {errorMsg && (
          <div style={{
            background: C.dangerDim, border: '1px solid rgba(139,26,26,0.2)',
            borderRadius: 10, padding: '10px 14px', color: C.danger, fontSize: 13, marginBottom: 16,
          }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Full Name *</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Jenkins" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Email Address *</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. s.jenkins@thapar.edu" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Password *</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: needsHostel ? '1fr 1fr' : '1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Role {isSuperAdmin ? '' : '(Mess Staff)'}</label>
              {isSuperAdmin ? (
                <select value={role} onChange={e => setRole(e.target.value)} style={inputStyle}>
                  {creatableRoles.map(r => (
                    <option key={r} value={r} style={{ background: C.surface, color: C.text }}>{getRoleLabel(r)}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value="Mess Staff" disabled style={{ ...inputStyle, opacity: 0.7, cursor: 'not-allowed' }} />
              )}
            </div>

            {needsHostel && (
              <div>
                <label style={labelStyle}>Hostel *</label>
                <select value={hostelId} onChange={e => setHostelId(e.target.value)} style={inputStyle}>
                  <option value="" style={{ background: C.surface, color: C.text }}>Select hostel…</option>
                  {hostels.map(h => (
                    <option key={h.id} value={h.id} style={{ background: C.surface, color: C.text }}>{h.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {isStudentType && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Roll Number</label>
                <input type="text" value={rollNo} onChange={e => setRollNo(e.target.value)} placeholder="e.g. 102103045" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Room Number</label>
                <input type="text" value={roomNo} onChange={e => setRoomNo(e.target.value)} placeholder="e.g. 214" style={inputStyle} />
              </div>
            </div>
          )}

          <div>
            <label style={labelStyle}>Phone Number</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px', borderRadius: 10,
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textSub, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 22px', borderRadius: 10,
                background: C.primary, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
