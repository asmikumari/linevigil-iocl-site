import React, { useState, useEffect } from 'react';
import { Bell, Shield, Database, Radio, Cpu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = ({ title }) => {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const [themeMode, setThemeMode] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (themeMode === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
    localStorage.setItem('theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const getRoleTheme = (role) => {
    switch(role) {
      case 'admin': return { border: 'border-[#F37021]/30', label: 'IOCL COMMAND UNIT', color: 'text-[#F37021]', bg: 'bg-[#F37021]/10' };
      case 'patrol': return { border: 'border-[#7CEEFF]/30', label: 'PATROL FIELD UNIT', color: 'text-[#7CEEFF]', bg: 'bg-[#7CEEFF]/10' };
      case 'contractor': return { border: 'border-[#86FFD3]/30', label: 'CONTRACTOR ROW ACCESS', color: 'text-[#86FFD3]', bg: 'bg-[#86FFD3]/10' };
      default: return { border: 'border-slate-800', label: 'ROW MONITORING', color: 'text-slate-400', bg: 'bg-slate-800/10' };
    }
  };

  const theme = getRoleTheme(user?.role);

  return (
    <header className="glass-panel border-b border-[#7CEEFF]/10 h-20 flex items-center justify-between px-10 shrink-0 sticky top-0 z-20">
      
      {/* Title & AI Link Indicators */}
      <div className="flex items-center space-x-8">
        <div>
          <h1 className="text-lg font-black text-white tracking-wider uppercase glow-text-cyan">{title}</h1>
        </div>
        
        {/* Systems Diagnostics */}
        <div className="hidden lg:flex items-center space-x-6 border-l border-slate-800 pl-8 text-[9px] hud-telemetry font-bold text-slate-500 uppercase tracking-widest">
          <div className="flex items-center space-x-2">
            <Database className="h-3.5 w-3.5 text-emerald-400" />
            <span>DB CONNECTED</span>
          </div>
          <div className="flex items-center space-x-2">
            <Cpu className="h-3.5 w-3.5 text-[#7CEEFF] animate-pulse" />
            <span>AI CORE: ACTIVE</span>
          </div>
          <div className="flex items-center space-x-2">
            <Radio className="h-3.5 w-3.5 text-[#F37021] animate-ping" style={{ animationDuration: '3s' }} />
            <span>GIS FEED: LINKED</span>
          </div>
        </div>
      </div>

      {/* Profile & Alerts info */}
      <div className="flex items-center space-x-6">
        
        {/* Clock telemetry */}
        <div className="hidden md:block text-right text-slate-400 font-bold hud-telemetry text-[10px] border-r border-slate-800 pr-6 uppercase tracking-wider">
          <div>DATE: {time.toLocaleDateString()}</div>
          <div className="text-white mt-0.5 glow-text-cyan">SYS TIME: {time.toLocaleTimeString()}</div>
        </div>

        {/* Alerts count */}
        <div className="relative group cursor-pointer p-2 bg-slate-900/50 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-all shadow-inner">
          <Bell className="h-5 w-5 text-red-400 animate-pulse" />
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] w-4.5 h-4.5 flex items-center justify-center rounded-md font-bold shadow-lg border border-red-500/50">3</span>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
          className="p-2 rounded-xl border border-slate-800 bg-black/30 hover:bg-slate-700/40 transition flex items-center justify-center"
        >
          {themeMode === 'light' ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
        </button>

        {/* Profile Card */}
        <div className="flex items-center space-x-4 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-white leading-none tracking-wider uppercase">{user?.name}</p>
            <p className={`text-[8px] mt-1 font-bold tracking-widest ${theme.color} uppercase`}>{theme.label}</p>
          </div>
          <div className={`p-0.5 rounded-xl border ${theme.border} ${theme.bg}`}>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-black/40 border border-slate-800 text-slate-300 font-black text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Header;
