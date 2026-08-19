import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, hasRole } from '../context/AuthContext';

interface NavItem { to: string; label: string; icon: string; allowedRoles: string[] }

const NAV_ITEMS: NavItem[] = [
  { to: '/checkin',   label: 'Check-In',   icon: '📋', allowedRoles: ['COUNTER_STAFF', 'MESS_COMMITTEE', 'WARDEN_ADMIN'] },
  { to: '/dashboard',label: 'Headcount',  icon: '📊', allowedRoles: ['MESS_COMMITTEE', 'WARDEN_ADMIN'] },
  { to: '/menu',     label: 'Menu',       icon: '🍽️', allowedRoles: ['MESS_COMMITTEE', 'WARDEN_ADMIN'] },
  { to: '/users',    label: 'Users',      icon: '👥', allowedRoles: ['WARDEN_ADMIN', 'SUPER_ADMIN'] },

  { to: '/wallet',   label: 'Wallet',     icon: '👛', allowedRoles: ['WARDEN_ADMIN'] },
  { to: '/hostels',  label: 'Hostels',    icon: '🏠', allowedRoles: ['SUPER_ADMIN'] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = NAV_ITEMS.filter(item => user && item.allowedRoles.includes(user.role));

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>🍽️</span>
          <span className="brand-text">SmartMess</span>
        </div>

        <nav className="sidebar-nav">
          {visibleNav.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">{user?.name || user?.email}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
