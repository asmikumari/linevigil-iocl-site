import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import IntroLoader, { shouldPlayIntro } from '../components/IntroLoader';
import Terrain from '../components/Terrain';
import CursorRing from '../components/CursorRing';
import Scramble from '../components/Scramble';
import './landing.css';

const GITHUB_URL = 'https://github.com/asmikumari/linevigil-iocl-site';
const INTRO_KEY = 'lv-intro-landing';

// Public demo accounts from the README, used by the one-click demo buttons.
const DEMO_PASSWORD = 'password123';
const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@linevigil.com' },
  { label: 'Patrol officer', email: 'patrol@linevigil.com' },
  { label: 'Contractor', email: 'contractor@linevigil.com' },
];

const riskFor = (metres) => (metres < 500 ? 'high' : metres < 1000 ? 'medium' : 'low');
const RISK_LABEL = { high: 'High risk', medium: 'Medium risk', low: 'Low risk' };

// Splits text into words so they can animate one after another.
const Words = ({ text, className, step, start = 0 }) =>
  text.split(' ').map((word, i) => (
    <span key={`${word}-${i}`} className={className} style={{ '--d': `${(start + i * step).toFixed(3)}s` }}>
      {word}{' '}
    </span>
  ));

const Mark = () => (
  <svg width="24" height="24" viewBox="0 0 22 22" aria-hidden="true">
    <path d="M2 17 C 7 15, 9 8, 20 4" fill="none" stroke="#f37021" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="13.5" cy="13.5" r="3" fill="none" stroke="#ededed" strokeWidth="1.4" />
  </svg>
);

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="lv-arrow">
    <path d="M2 7h9M7.5 3.5 11 7l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const STEPS = [
  { title: 'Request', body: 'A contractor marks the dig site on the right-of-way map and files an excavation permit.' },
  { title: 'Measure', body: 'LineVigil measures the distance from the site to the pipeline centreline and sets the risk level.', risk: true },
  { title: 'Dispatch', body: 'An admin reviews the permit and assigns a patrol officer to the site.' },
  { title: 'Verify', body: 'The officer checks the site in person. GPS tracks and reports are saved offline and sync when signal returns.' },
];

const PORTALS = [
  { role: 'Admin', body: 'Sees every pipeline, permit, patrol and alert on one map. Assigns patrols and reviews excavation machinery flagged by satellite sweeps.' },
  { role: 'Patrol officer', body: 'Navigates the corridor, inspects assigned sites and reports incidents with photos. Keeps working in network dead zones.' },
  { role: 'Contractor', body: 'Requests excavation permits on the map and follows each permit from filing to approval.' },
];

const HEADLINE = "Know who's digging.";
const SUBTITLE = 'Right-of-way protection for oil and gas pipelines, before the first shovel goes in.';

// Scroll-linked progress: the page progress line, heading fills and the step line.
const useScrollMotion = (rootRef) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      const page = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      root.style.setProperty('--page', page.toFixed(4));
      const badge = root.querySelector('.lv-progress-value');
      if (badge) badge.textContent = `${String(Math.round(page * 100)).padStart(2, '0')}%`;

      root.querySelectorAll('[data-scroll-fill]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.92 - r.top) / (vh * 0.45)));
        el.style.setProperty('--fill', `${(p * 100).toFixed(1)}%`);
      });

      const steps = root.querySelector('.lv-steps');
      if (steps) {
        const r = steps.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.8 - r.top) / (vh * 0.5)));
        steps.style.setProperty('--fill', `${(p * 100).toFixed(1)}%`);
        steps.dataset.reached = String(Math.min(STEPS.length, Math.floor(p * STEPS.length + 0.35)));
      }
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [rootRef]);
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(() => shouldPlayIntro(INTRO_KEY));
  const [measure, setMeasure] = useState(null);
  const rootRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  useScrollMotion(rootRef);

  const goToPortal = (role) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'patrol') navigate('/patrol');
    else navigate('/dashboard');
  };

  const signIn = async (emailValue, passwordValue) => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.login({ email: emailValue, password: passwordValue });
      login(response.data.user, response.data.token);
      goToPortal(response.data.user.role);
    } catch (err) {
      console.warn('Backend connection failed, signing in with the offline demo accounts.', err);

      const mockUsers = {
        'admin@linevigil.com': { id: 1, name: 'Admin User', role: 'admin' },
        'patrol@linevigil.com': { id: 2, name: 'Patrol Officer 1', role: 'patrol' },
        'patrol2@linevigil.com': { id: 4, name: 'Patrol Officer 2', role: 'patrol' },
        'contractor@linevigil.com': { id: 3, name: 'Contractor User', role: 'contractor' }
      };

      const normalizedEmail = emailValue.trim().toLowerCase();
      if (mockUsers[normalizedEmail] && passwordValue === DEMO_PASSWORD) {
        const userObj = mockUsers[normalizedEmail];
        login(userObj, 'mock-secure-telemetry-token-key');
        goToPortal(userObj.role);
      } else {
        setError("That email and password don't match an account. Check them and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    signIn(email, password);
  };

  const risk = measure ? riskFor(measure.metres) : null;

  return (
    <div className={`lv${showIntro ? '' : ' is-ready'}`} ref={rootRef}>
      {showIntro && (
        <IntroLoader storageKey={INTRO_KEY} label="Plotting LineVigil" onDone={() => setShowIntro(false)} />
      )}
      <CursorRing />

      <div className="lv-progress" aria-hidden="true">
        <span className="lv-progress-bar" />
        <span className="lv-progress-value">00%</span>
      </div>

      <section className="lv-hero" id="top">
        <Terrain onMeasure={setMeasure} />

        {measure && (
          <div
            className={`lv-readout risk-${risk}`}
            style={{
              // Flip to the other side of the pointer near the right and bottom edges.
              transform: `translate(${measure.x > window.innerWidth - 240 ? `calc(${measure.x - 18}px - 100%)` : `${measure.x + 18}px`}, ${measure.y > window.innerHeight - 90 ? `calc(${measure.y - 18}px - 100%)` : `${measure.y + 18}px`})`,
            }}
            aria-hidden="true"
          >
            <span>{measure.metres.toLocaleString('en-IN')} m from pipeline</span>
            <span className="lv-readout-risk">{RISK_LABEL[risk]}</span>
          </div>
        )}

        <header className="lv-header">
          <a className="lv-brand" href="#top">
            <Mark />
            <span className="lv-mono">LineVigil <span className="lv-dim lv-hide-sm">/ Pipeline safety</span></span>
          </a>
          <nav className="lv-nav" aria-label="Main">
            <Scramble as="a" href="#how-it-works" className="lv-navlink lv-hide-sm" text="How it works"><sup>01</sup></Scramble>
            <Scramble as="a" href="#portals" className="lv-navlink lv-hide-sm" text="Portals"><sup>02</sup></Scramble>
            <Scramble as="a" href={GITHUB_URL} target="_blank" rel="noreferrer" className="lv-navlink lv-hide-sm" text="GitHub"><sup>03</sup></Scramble>
            <Scramble as="a" href="#sign-in" className="lv-pill" text="Sign in" />
          </nav>
        </header>

        <div className="lv-meta lv-mono">
          <span>LineVigil · right-of-way protection</span>
          <span className="lv-hide-sm">Base · 28.54° N, 77.39° E · Noida</span>
          <span className="lv-hide-sm">Built at IOCL, 2026</span>
        </div>

        <div className="lv-hero-copy">
          <h1 aria-label={HEADLINE}>
            <span aria-hidden="true"><Words text={HEADLINE} className="lv-hw" step={0.12} start={0.1} /></span>
          </h1>
          <p className="lv-sub">
            <Words text={SUBTITLE} className="lv-lw" step={0.035} start={0.55} />
            <span className="lv-caret" aria-hidden="true" />
          </p>
          <ul className="lv-tags lv-mono lv-rise" aria-label="Highlights">
            <li><i className="dot" />3 pipeline routes</li>
            <li><i className="dot" />500 m and 1 km risk bands</li>
            <li className="lv-hide-touch"><i className="tri" />Point anywhere to measure the distance to the pipeline</li>
            <li className="lv-show-touch"><i className="tri" />Tap anywhere to measure the distance to the pipeline</li>
          </ul>
        </div>

        <div className="lv-hero-foot lv-rise">
          <p>Permits, proximity checks, patrol dispatch and offline field checks.<br />One live map, built during an SDE internship at Indian Oil.</p>
          <div className="lv-actions">
            <Scramble as="a" href="#sign-in" className="lv-pill" text="Try the live demo"><Arrow /></Scramble>
            <Scramble as="a" href={GITHUB_URL} target="_blank" rel="noreferrer" className="lv-pill lv-pill-dark" text="View the code" />
          </div>
        </div>
      </section>

      <main>
        <section className="lv-section" id="how-it-works">
          <div className="lv-section-head lv-mono">
            <span>[01] How it works</span>
            <span className="lv-dim">Four steps, one permit</span>
          </div>
          <h2 data-scroll-fill>How a dig gets cleared</h2>
          <p className="lv-intro">
            Every excavation near the pipeline follows the same four steps, from the contractor's request to an
            officer standing on the site.
          </p>
          <ol className="lv-steps" data-reached="0">
            {STEPS.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                {step.risk && (
                  <div className="lv-risk lv-mono" aria-label="Risk levels by distance">
                    <span><i style={{ background: 'var(--high)' }} />High &lt; 500 m</span>
                    <span><i style={{ background: 'var(--medium)' }} />Medium &lt; 1 km</span>
                    <span><i style={{ background: 'var(--low)' }} />Low beyond</span>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="lv-section" id="portals">
          <div className="lv-section-head lv-mono">
            <span>[02] Portals</span>
            <span className="lv-dim">Same live map, three jobs</span>
          </div>
          <h2 data-scroll-fill>One system, three portals</h2>
          <div className="lv-portals">
            {PORTALS.map((p) => (
              <div className="lv-portal" key={p.role}>
                <h3>{p.role}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="lv-section lv-signin" id="sign-in">
          <div className="lv-section-head lv-mono">
            <span>[03] Sign in</span>
            <span className="lv-dim">Demo data, not real IOCL records</span>
          </div>
          <div className="lv-signin-grid">
            <div>
              <h2 data-scroll-fill>Sign in to LineVigil</h2>
              <p className="lv-intro">Use your account, or explore the demo as any of the three roles.</p>
              <div className="lv-demo">
                <p className="lv-mono lv-dim">Explore the demo as</p>
                <div className="lv-demo-roles">
                  {DEMO_ACCOUNTS.map((a) => (
                    <Scramble
                      key={a.email}
                      as="button"
                      type="button"
                      className="lv-pill lv-pill-dark"
                      disabled={loading}
                      onClick={() => signIn(a.email, DEMO_PASSWORD)}
                      text={a.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <form className="lv-form" onSubmit={handleSubmit}>
              {error && <p className="lv-error" role="alert">{error}</p>}
              <div className="lv-field">
                <label htmlFor="lv-email">Email</label>
                <input
                  id="lv-email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="lv-field">
                <label htmlFor="lv-password">Password</label>
                <input
                  id="lv-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Scramble as="button" type="submit" className="lv-pill lv-pill-wide" disabled={loading} text={loading ? 'Signing in…' : 'Sign in'} />
            </form>
          </div>
        </section>
      </main>

      <footer className="lv-footer lv-mono">
        <span>Built by Asmi Kumari · B.Tech CSE · Amity University Noida</span>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">Source on GitHub</a>
      </footer>
    </div>
  );
};

export default Login;
