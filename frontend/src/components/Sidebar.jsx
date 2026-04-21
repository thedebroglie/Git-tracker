import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar, TierBadge } from './ui';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '◈' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '⬡' },
    { to: '/profile', label: 'Score Details', icon: '◎' },
    { to: '/settings', label: 'Settings', icon: '⚙' },
  ];

  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">G</div>
        <div className="sidebar__logo-text">GitTracker</div>
      </div>

      {/* Navigation */}
      <div className="sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* User section */}
      {user && (
        <div className="sidebar__user">
          <Avatar
            src={user.avatar}
            alt={user.name}
            size="sm"
          />
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{user.name}</div>
            <div className="sidebar__user-id">{user.enrollmentId}</div>
          </div>
          <button
            className="btn btn--ghost btn--sm"
            onClick={logout}
            title="Sign out"
            style={{ padding: '4px 8px', fontSize: 14 }}
          >
            ↗
          </button>
        </div>
      )}
    </nav>
  );
}
