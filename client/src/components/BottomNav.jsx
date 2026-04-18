import { NavLink } from 'react-router-dom';
import { CalendarDays, List, Settings, MessageCircle, Landmark } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`} end>
        <CalendarDays size={20} />
        <span className="nav-label">Timeline</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
        <List size={20} />
        <span className="nav-label">History</span>
      </NavLink>
      <NavLink to="/chat" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
        <MessageCircle size={20} />
        <span className="nav-label">Scorpio</span>
      </NavLink>
      <NavLink to="/transactions" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
        <Landmark size={20} />
        <span className="nav-label">Bank</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}>
        <Settings size={20} />
        <span className="nav-label">Settings</span>
      </NavLink>
    </nav>
  );
}
