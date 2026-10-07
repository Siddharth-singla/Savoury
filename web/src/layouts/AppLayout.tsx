import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  UserCheck, 
  Users, 
  UtensilsCrossed, 
  UserCog, 
  Wallet, 
  Building2, 
  LogOut,
  Megaphone,
} from 'lucide-react';

interface NavItem { to: string; label: string; icon: React.ReactNode; allowedRoles: string[] }

// Warden, Co-Warden and Caretaker share an identical feature set.
const HOSTEL_ADMINS = ['WARDEN_ADMIN', 'CO_WARDEN', 'CARETAKER'];

const NAV_ITEMS: NavItem[] = [
  { to: '/checkin',   label: 'Check-In',   icon: <UserCheck size={18} strokeWidth={1.8} />, allowedRoles: ['COUNTER_STAFF', 'MESS_COMMITTEE', ...HOSTEL_ADMINS] },
  { to: '/dashboard', label: 'Headcount',  icon: <Users size={18} strokeWidth={1.8} />,     allowedRoles: ['MESS_COMMITTEE', ...HOSTEL_ADMINS] },
  { to: '/menu',      label: 'Menu',       icon: <UtensilsCrossed size={18} strokeWidth={1.8} />, allowedRoles: ['MESS_COMMITTEE', ...HOSTEL_ADMINS] },
  { to: '/users',     label: 'Users',      icon: <UserCog size={18} strokeWidth={1.8} />,   allowedRoles: [...HOSTEL_ADMINS, 'SUPER_ADMIN'] },
  { to: '/wallet',    label: 'Wallet',     icon: <Wallet size={18} strokeWidth={1.8} />,    allowedRoles: [...HOSTEL_ADMINS] },
  { to: '/notices',   label: 'Notices',    icon: <Megaphone size={18} strokeWidth={1.8} />, allowedRoles: ['MESS_COMMITTEE', ...HOSTEL_ADMINS] },
  { to: '/hostels',   label: 'Hostels',    icon: <Building2 size={18} strokeWidth={1.8} />, allowedRoles: ['SUPER_ADMIN'] },
];

function userInitial(user: { name?: string; email?: string } | null) {
  if (!user) return '?';
  return (user.name || user.email || '?').trim()[0].toUpperCase();
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = NAV_ITEMS.filter(item => user && item.allowedRoles.includes(user.role));
  const displayName = user?.name || user?.email || '';
  const initial = userInitial(user);

  return (
    <div className="app-layout" style={{ background: '#f5f0eb' }}>
      <style>{`
        .warm-sidebar {
          width: 220px;
          background: #ede7df;
          border-right: 1px solid rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
        }
        .warm-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-radius: 12px;
          color: #5c4a38;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        .warm-nav-link:hover {
          background: rgba(45,27,14,0.05);
          color: #2d1b0e;
        }
        .warm-nav-link-active {
          background: #3d2415 !important;
          color: #ffffff !important;
          box-shadow: 0 4px 12px rgba(61,36,21,0.22);
          font-weight: 600;
        }
        .warm-nav-link-active svg {
          color: #f5f0eb !important;
        }
      `}</style>

      <aside className="warm-sidebar">
        {/* Brand Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '20px 20px 18px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}>
          <img
            src="/logo.png"
            alt="Savoury"
            style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
          />
          <span style={{
            fontFamily: "'Georgia', serif",
            fontWeight: 900,
            fontSize: 19,
            color: '#2d1b0e',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            Savoury
          </span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `warm-nav-link ${isActive ? 'warm-nav-link-active' : ''}`}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20 }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div style={{
          padding: '16px 18px',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#3d2415',
            color: '#f5f0eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
            flexShrink: 0,
          }}>
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: '#2d1b0e',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {displayName}
            </div>
            <div style={{
              fontSize: 10, color: '#7a6855', marginTop: 1,
              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            }}>
              {user?.role?.replace(/_/g, ' ')}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#7a6855',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#8b1a1a'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#7a6855'; }}
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </aside>

      <main className="main-content" style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'hidden', background: '#f5f0eb', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
}
