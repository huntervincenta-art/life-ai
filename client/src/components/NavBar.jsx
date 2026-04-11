import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { pantry } from '../utils/api';

const tabs = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/pantry', label: 'Pantry', icon: '🧊', badge: true },
  { to: '/routines', label: 'Routines', icon: '✅' },
  { to: '/checkin', label: 'Check-In', icon: '📊' },
  { to: '/recipes', label: 'Recipes', icon: '🍳' },
];

export default function NavBar() {
  const [expiringCount, setExpiringCount] = useState(0);

  useEffect(() => {
    pantry.stats()
      .then(data => setExpiringCount(data.expiringSoon || 0))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Desktop Sidebar — hidden on mobile via CSS */}
      <aside className="sidebar">
        <div className="sidebar-logo">Life AI 🧠</div>
        <nav className="sidebar-nav">
          {tabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) => `sidebar-tab${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && expiringCount > 0 && (
                <span className="nav-badge">{expiringCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Bottom Nav — hidden on desktop via CSS */}
      <nav className="bottom-nav">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{tab.icon}</span>
            {tab.badge && expiringCount > 0 && (
              <span className="nav-badge">{expiringCount}</span>
            )}
            <span className="nav-label">{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
