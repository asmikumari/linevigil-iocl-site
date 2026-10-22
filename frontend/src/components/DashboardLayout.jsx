import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import IntroLoader, { shouldPlayIntro } from './IntroLoader';
import Terrain from './Terrain';
import { useAuth } from '../context/AuthContext';
import '../motion.css';
import '../app.css';

const PORTAL_NAMES = { admin: 'admin portal', patrol: 'patrol portal', contractor: 'contractor portal' };

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// One orchestrated entrance per page: panels rise in order, table rows follow, and big numbers count up.
const playEntrance = (main) => {
  if (!main || reducedMotion()) return;
  const content = main.firstElementChild;
  const blocks = content ? Array.from(content.children).slice(0, 10) : [];
  const panels = blocks.flatMap((b) => (b.children.length > 1 && b.children.length <= 6 && getComputedStyle(b).display === 'grid' ? Array.from(b.children) : [b]));
  panels.slice(0, 14).forEach((el, i) => {
    el.animate(
      [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }],
      { duration: 520, delay: 60 + i * 55, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)', fill: 'backwards' }
    );
  });

  Array.from(main.querySelectorAll('tbody tr')).slice(0, 18).forEach((row, i) => {
    row.animate(
      [{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }],
      { duration: 380, delay: 220 + i * 35, easing: 'ease-out', fill: 'backwards' }
    );
  });

  // Count up by editing the existing text node in place, so React keeps ownership of it.
  main.querySelectorAll('.text-2xl, .text-3xl, .text-4xl, .text-5xl').forEach((el) => {
    const node = el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE ? el.firstChild : null;
    if (!node) return;
    const match = node.nodeValue.trim().match(/^(\d{1,5})(%?)$/);
    if (!match) return;
    const target = Number(match[1]);
    const suffix = match[2];
    const start = performance.now();
    let written = node.nodeValue;
    const step = (now) => {
      if (node.nodeValue !== written) return; // React updated the value; leave it alone.
      const t = Math.min(1, (now - start) / 900);
      written = `${Math.round(target * (1 - Math.pow(1 - t, 3)))}${suffix}`;
      node.nodeValue = written;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
};

const DashboardLayout = ({ children, title }) => {
  const { user } = useAuth();
  const location = useLocation();
  const mainRef = useRef(null);
  const introKey = `lv-intro-${user?.role || 'app'}`;
  const [showIntro, setShowIntro] = useState(() => shouldPlayIntro(introKey));
  const [navOpen, setNavOpen] = useState(false);

  // The portals are dark-only now; drop the old light theme if it was saved.
  useEffect(() => {
    document.body.classList.remove('light');
    try { localStorage.setItem('theme', 'dark'); } catch { /* storage unavailable */ }
  }, []);

  // Each page change (and the first paint after the intro): run the entrance.
  useEffect(() => {
    if (showIntro) return undefined;
    setNavOpen(false);
    const main = mainRef.current;
    const id = requestAnimationFrame(() => playEntrance(main));
    return () => cancelAnimationFrame(id);
  }, [location.pathname, showIntro]);

  return (
    <div className={`lv-app flex h-screen w-full overflow-hidden${navOpen ? ' nav-open' : ''}`}>
      {showIntro && (
        <IntroLoader
          storageKey={introKey}
          label={`Loading the ${PORTAL_NAMES[user?.role] || 'portal'}`}
          duration={1500}
          onDone={() => setShowIntro(false)}
        />
      )}
      {/* Same contour terrain as the landing page, behind everything; it ignores the pointer over maps. */}
      <div className="lv-app-bg" aria-hidden="true">
        <Terrain pipeline={false} ignore=".leaflet-container" />
      </div>
      <Sidebar role={user?.role} onNavigate={() => setNavOpen(false)} />
      {navOpen && <div className="lv-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <span key={location.pathname} className="lv-route-line" aria-hidden="true" />
        <Header title={title} onMenu={() => setNavOpen(true)} />
        <main ref={mainRef} className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: 'clamp(1rem, 2.4vw, 2rem)' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
