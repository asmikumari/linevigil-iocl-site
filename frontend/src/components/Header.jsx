import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABEL = { admin: 'Admin portal', patrol: 'Patrol portal', contractor: 'Contractor portal' };

// Plain page titles by address; the pages' own titles are a fallback.
const TITLES = {
  '/admin': 'Overview',
  '/admin/users': 'Users and access',
  '/admin/pipelines': 'Pipelines',
  '/admin/requests': 'Excavation requests',
  '/admin/incidents': 'Satellite alerts',
  '/admin/analytics': 'Analytics',
  '/admin/notifications': 'Notifications',
  '/admin/settings': 'Settings',
  '/admin/messages': 'Messages',
  '/patrol': 'Field console',
  '/patrol/zones': 'My zones',
  '/patrol/alerts': 'Live alerts',
  '/patrol/incidents': 'Incident history',
  '/patrol/report': 'Report an incident',
  '/patrol/status': 'Verification status',
  '/patrol/nav': 'Navigation',
  '/patrol/notifications': 'Notifications',
  '/patrol/messages': 'Messages',
  '/dashboard': 'Overview',
  '/dashboard/requests': 'My permits',
  '/dashboard/map': 'Pipeline map',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/messages': 'Messages',
  '/dashboard/profile': 'Profile',
};

const ACRONYMS = new Set(['IOCL', 'ROW', 'GPS', 'AI', 'GIS', 'CGD', 'HUD']);
const toTitle = (s = '') =>
  s
    .toLowerCase()
    .split(' ')
    .map((w, i) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');

const Header = ({ title, onMenu }) => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const heading = TITLES[pathname.replace(/\/$/, '')] || toTitle(title);

  return (
    <header className="lv-shell-head">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', minWidth: 0 }}>
        <button type="button" className="lv-icon-btn lv-menu-btn" onClick={onMenu} aria-label="Open navigation">
          <Menu size={16} />
        </button>
        <div className="lv-head-title">
          <span className="lv-mono">{ROLE_LABEL[user?.role] || 'Portal'}</span>
          <h1 key={heading} aria-label={heading}>
            <span aria-hidden="true">
              {heading.split(' ').map((w, i) => (
                <span key={`${w}-${i}`} className="lv-tw" style={{ '--d': `${(i * 0.07).toFixed(2)}s` }}>{w}{' '}</span>
              ))}
            </span>
          </h1>
        </div>
      </div>

      <div className="lv-head-right">
        <div className="lv-head-meta lv-mono">
          <span className={`lv-live${online ? '' : ' is-offline'}`}><i />{online ? 'Live' : 'Offline, caching'}</span>
          <strong>{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })} IST</strong>
        </div>
        <button type="button" className="lv-icon-btn" aria-label="Notifications, 3 unread">
          <Bell size={16} />
          <span className="lv-badge">3</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
