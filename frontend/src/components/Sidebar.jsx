import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Scramble from './Scramble';

const ROLE_LABEL = { admin: 'Admin', patrol: 'Patrol officer', contractor: 'Contractor' };

const MENU = {
  admin: [
    { name: 'Dashboard', path: '/admin' },
    { name: 'User management', path: '/admin/users' },
    { name: 'Pipelines', path: '/admin/pipelines' },
    { name: 'Excavation requests', path: '/admin/requests' },
    { name: 'Incidents', path: '/admin/incidents' },
    { name: 'Analytics and reports', path: '/admin/analytics' },
    { name: 'Notifications', path: '/admin/notifications' },
    { name: 'Settings', path: '/admin/settings' },
    { name: 'Messages', path: '/admin/messages' },
  ],
  patrol: [
    { name: 'Dashboard', path: '/patrol' },
    { name: 'My zones', path: '/patrol/zones' },
    { name: 'Live alerts', path: '/patrol/alerts' },
    { name: 'Incidents', path: '/patrol/incidents' },
    { name: 'Report an incident', path: '/patrol/report' },
    { name: 'Incident status', path: '/patrol/status' },
    { name: 'Navigation', path: '/patrol/nav' },
    { name: 'Notifications', path: '/patrol/notifications' },
    { name: 'Messages', path: '/patrol/messages' },
  ],
  contractor: [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'New excavation request', path: '/dashboard/new' },
    { name: 'My requests', path: '/dashboard/requests' },
    { name: 'Pipeline map', path: '/dashboard/map' },
    { name: 'Notifications', path: '/dashboard/notifications' },
    { name: 'Messages', path: '/dashboard/messages' },
    { name: 'Profile', path: '/dashboard/profile' },
  ],
};

export const Mark = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
    <path d="M2 17 C 7 15, 9 8, 20 4" fill="none" stroke="#f37021" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="13.5" cy="13.5" r="3" fill="none" stroke="#ededed" strokeWidth="1.4" />
  </svg>
);

const Sidebar = ({ role, onNavigate }) => {
  const { user, logout } = useAuth();
  const items = MENU[role] || MENU.contractor;
  const home = items[0].path;

  return (
    <aside className="lv-shell-side" aria-label="Portal navigation">
      <div className="lv-side-brand">
        <Mark />
        <span className="lv-mono">LineVigil <span className="lv-dim">/ {role || 'portal'}</span></span>
      </div>

      <div className="lv-side-label lv-mono">Navigation</div>
      <nav className="lv-side-nav custom-scrollbar">
        {items.map((item, i) => (
          <Scramble
            key={item.path}
            as={NavLink}
            to={item.path}
            end={item.path === home}
            onClick={onNavigate}
            className={({ isActive }) => `lv-side-link${isActive ? ' active' : ''}`}
            text={item.name}
          >
            <sup>{String(i + 1).padStart(2, '0')}</sup>
          </Scramble>
        ))}
      </nav>

      <div className="lv-side-foot">
        <div className="lv-side-user">
          <span className="lv-avatar" aria-hidden="true">{user?.name?.charAt(0) || 'U'}</span>
          <div style={{ minWidth: 0 }}>
            <p>{user?.name || 'Signed in'}</p>
            <span className="lv-mono">{ROLE_LABEL[role] || 'User'}</span>
          </div>
        </div>
        <button type="button" className="lv-pill" onClick={logout}>Sign out</button>
      </div>
    </aside>
  );
};

export default Sidebar;
