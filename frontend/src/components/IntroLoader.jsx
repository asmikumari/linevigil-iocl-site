import React, { useEffect, useRef, useState } from 'react';
import RouteNetwork, { ROUTES } from './RouteNetwork';
import '../motion.css';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Plays once per browser session for each `storageKey`; returns null afterwards.
export const shouldPlayIntro = (storageKey) => {
  if (prefersReducedMotion()) return false;
  try {
    return !sessionStorage.getItem(storageKey);
  } catch {
    return false;
  }
};

/**
 * Full-screen route-plotting intro: the pipeline routes draw themselves while a counter
 * runs to 100 %, then the screen lifts away to reveal the page underneath.
 */
const IntroLoader = ({ storageKey, label, duration = 2200, onDone }) => {
  const [percent, setPercent] = useState(0);
  const [routeIndex, setRouteIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* storage unavailable */ }
    setLeaving(true);
    setTimeout(() => onDone?.(), 650);
  };

  useEffect(() => {
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 2.2);
      setPercent(Math.round(eased * 100));
      setRouteIndex(Math.min(ROUTES.length - 1, Math.floor(t * ROUTES.length)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else setTimeout(finish, 250);
    };
    frame = requestAnimationFrame(tick);
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`lv-loader${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`${label}, ${percent} percent`}
      onClick={finish}
    >
      <div className="lv-loader-top">
        <span>{label}</span>
        <span className="lv-loader-skip">Click or press Esc to skip</span>
      </div>
      <RouteNetwork className="lv-loader-network" stagger={(duration / 1000) * 0.28} />
      <div className="lv-loader-bottom">
        <span key={routeIndex} className="lv-loader-route">{ROUTES[routeIndex].name}</span>
        <span className="lv-loader-percent">{percent}%</span>
      </div>
    </div>
  );
};

export default IntroLoader;
