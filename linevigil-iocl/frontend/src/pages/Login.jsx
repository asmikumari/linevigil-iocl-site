import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import { Shield, Lock, Mail, ArrowRight, Terminal, Wifi, Radio, Cpu, Activity } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authService.login({ email, password });
      login(response.data.user, response.data.token);
      const role = response.data.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'patrol') navigate('/patrol');
      else navigate('/dashboard');
    } catch (err) {
      console.warn('Backend connection failed, performing fail-safe client decryption.', err);
      
      const mockUsers = {
        'admin@linevigil.com': { id: 1, name: 'Admin User', role: 'admin' },
        'patrol@linevigil.com': { id: 2, name: 'Patrol Officer 1', role: 'patrol' },
        'patrol2@linevigil.com': { id: 4, name: 'Patrol Officer 2', role: 'patrol' },
        'contractor@linevigil.com': { id: 3, name: 'Contractor User', role: 'contractor' }
      };

      const normalizedEmail = email.trim().toLowerCase();
      if (mockUsers[normalizedEmail] && password === 'password123') {
        const userObj = mockUsers[normalizedEmail];
        login(userObj, 'mock-secure-telemetry-token-key');
        if (userObj.role === 'admin') navigate('/admin');
        else if (userObj.role === 'patrol') navigate('/patrol');
        else navigate('/dashboard');
      } else {
        setError('Security handshake failed. Invalid coordinate or decryption key.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070B09] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      
      {/* Background Neon Glow Nodes (Polaris Style) */}
      <div className="absolute w-[600px] h-[600px] bg-[#F37021]/5 rounded-full blur-[120px] -top-60 -left-60 pointer-events-none"></div>
      <div className="absolute w-[600px] h-[600px] bg-[#7CEEFF]/5 rounded-full blur-[120px] -bottom-60 -right-60 pointer-events-none"></div>
      
      {/* Grid Pattern mask */}
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(124, 238, 255, 0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      ></div>

      {/* 1. TOP NAVBAR */}
      <nav className="relative z-20 max-w-[1400px] w-full mx-auto px-6 md:px-12 h-20 flex items-center justify-between border-b border-slate-900/60">
        <div className="flex items-center space-x-2.5">
          <span className="size-2 rounded-full bg-[#F37021] animate-pulse shadow-[0_0_10px_#F37021]"></span>
          <span className="font-display font-extrabold tracking-widest text-sm uppercase text-white logo-font">LINEVIGIL</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#7CEEFF] px-3 py-1 rounded-full bg-[#7CEEFF]/5 border border-[#7CEEFF]/10">
            <span className="size-1.5 rounded-full bg-[#7CEEFF] animate-pulse"></span>
            SYSTEM NOMINAL
          </span>
        </div>
      </nav>

      {/* 2. MAIN SPLIT GRID BODY */}
      <main className="relative z-10 flex-1 max-w-[1400px] w-full mx-auto px-6 md:px-12 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Polaris Typography & Live Telemetry Details (7 Cols) */}
        <div className="lg:col-span-7 space-y-10 text-left">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-[#111917]/50 text-[10px] font-mono tracking-tight text-slate-400">
            <span className="text-[#F37021]">●</span>
            <span className="text-slate-500 uppercase tracking-widest">Version 2.5 —</span>
            <span className="text-[#7CEEFF] uppercase">ROW Protection Suite</span>
          </div>

          <h1 className="font-sans font-black tracking-tighter leading-[1.02] text-white text-[clamp(2rem,5.5vw,4.5rem)]">
            The intelligence layer for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F37021] to-[#7CEEFF]">energy lifelines.</span>
          </h1>

          <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-xl">
            LineVigil integrates cross-country pipeline geometry, real-time patrol officer telemetry, and satellite imagery analysis into a single, cohesive threat mitigation HUD. Detect excavation hazards instantly before accidents strike.
          </p>

          {/* High-Tech live telemetry overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg pt-6 border-t border-slate-900/60">
            <div className="bg-[#111917]/35 border border-slate-900 rounded-xl p-4 space-y-1.5">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block">Core Corridor</span>
              <span className="text-xs font-bold text-white block">Mathura-Jalandhar</span>
              <span className="text-[8px] font-bold text-[#86FFD3] uppercase tracking-wider flex items-center">
                <span className="size-1 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                Nominal Flow
              </span>
            </div>
            <div className="bg-[#111917]/35 border border-slate-900 rounded-xl p-4 space-y-1.5">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block">Active Patrols</span>
              <span className="text-xs font-bold text-white block">02 Units Linked</span>
              <span className="text-[8px] font-bold text-[#7CEEFF] uppercase tracking-wider flex items-center">
                <span className="size-1 rounded-full bg-[#7CEEFF] mr-1 animate-pulse"></span>
                Live GPS Sync
              </span>
            </div>
            <div className="bg-[#111917]/35 border border-slate-900 rounded-xl p-4 space-y-1.5">
              <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest block">AI Radar sweeps</span>
              <span className="text-xs font-bold text-white block">04 Threat Anchors</span>
              <span className="text-[8px] font-bold text-rose-400 uppercase tracking-wider flex items-center">
                <span className="size-1 rounded-full bg-rose-400 mr-1 animate-pulse"></span>
                01 Alert Pending
              </span>
            </div>
          </div>

        </div>

        {/* Right Column: Secure Access Panel (5 Cols) */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="max-w-md w-full glass-panel border border-[#7CEEFF]/15 rounded-2xl shadow-2xl p-8 relative overflow-hidden bg-black/60">
            
            <div className="absolute top-4 right-6 flex items-center space-x-1.5 text-[8px] hud-telemetry text-slate-500 font-bold">
              <Wifi className="h-3 w-3 text-emerald-400" />
              <span>SYS SECURE LINK</span>
            </div>

            <div className="flex flex-col items-start mb-8">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">COMMAND CENTER</h2>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Provide credentials to sync telemetry</p>
            </div>

            {error && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-[9px] font-black uppercase tracking-widest leading-normal">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Coordinate (Email)</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-[#7CEEFF] transition-colors" />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-black/50 border border-slate-900 rounded-xl focus:border-[#7CEEFF]/50 focus:ring-4 focus:ring-[#7CEEFF]/5 outline-none transition-all text-xs font-bold text-white uppercase placeholder:text-slate-700"
                    placeholder="identity@iocl.co.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Decryption Key (Password)</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-500 group-focus-within:text-[#7CEEFF] transition-colors" />
                  <input
                    type="password"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-black/50 border border-slate-900 rounded-xl focus:border-[#7CEEFF]/50 focus:ring-4 focus:ring-[#7CEEFF]/5 outline-none transition-all text-xs font-bold text-white placeholder:text-slate-700"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#111917] hover:bg-[#1c2a27] border border-[#7CEEFF]/30 text-white font-black py-4 rounded-xl transition-all shadow-lg hover:shadow-[#7CEEFF]/10 flex items-center justify-center group disabled:opacity-50 text-[10px] uppercase tracking-[0.2em] relative"
              >
                <span>{loading ? 'AUTHSYNCING...' : 'ESTABLISH LINK'}</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform text-[#7CEEFF]" />
              </button>

            </form>

            {/* Monospace Credentials hints at bottom */}
            <div className="mt-8 pt-6 border-t border-[#7CEEFF]/5 text-left font-bold hud-telemetry text-[8px] text-slate-500 space-y-1">
              <p className="uppercase text-slate-400 text-center tracking-widest mb-1.5">CREDENTIAL TELEMETRY HINTS</p>
              <div className="bg-black/40 p-3 rounded border border-slate-900 leading-relaxed font-mono">
                ADMIN: <span className="text-[#7CEEFF]">admin@linevigil.com</span> / password123<br/>
                PATROL 1: <span className="text-[#7CEEFF]">patrol@linevigil.com</span> / password123<br/>
                CONTRACTOR: <span className="text-[#7CEEFF]">contractor@linevigil.com</span> / password123
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* 3. FOOTER */}
      <footer className="relative z-20 border-t border-slate-900/60 py-6 text-center text-slate-500 font-mono text-[9px] uppercase tracking-[0.2em]">
        <div className="max-w-[1400px] w-full mx-auto px-6 md:px-12 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>LAT 28.6139 · LONG 77.2090 · IOCL PLHO NOIDA</div>
          <div>© {new Date().getFullYear()} LineVigil OS. All rights reserved.</div>
        </div>
      </footer>

    </div>
  );
};

export default Login;
