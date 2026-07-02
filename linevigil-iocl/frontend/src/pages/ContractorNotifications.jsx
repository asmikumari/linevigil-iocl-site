import React, { useState } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Clock, 
  Search,
  Filter,
  Check
} from 'lucide-react';

const ContractorNotifications = () => {
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Safety Permit EXC-3001 is queued for physical patrol field survey verification.', time: '10:45 AM', type: 'warning', read: false },
    { id: 2, text: 'Encroachment sweep detected heavy excavators within 100m Mathura transmission line.', time: '09:30 AM', type: 'critical', read: false },
    { id: 3, text: 'Safety Permit EXC-3002 fully verified and approved by IOCL Command Board.', time: 'Yesterday', type: 'success', read: true },
    { id: 4, text: 'Active patrol telemetry tracking link established on ROW corridor.', time: 'Yesterday', type: 'info', read: true },
    { id: 5, text: 'Excavation boundaries updated for Mathura district construction corridor.', time: '2 days ago', type: 'info', read: true }
  ]);

  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const toggleRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case 'critical': return { icon: AlertTriangle, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/10 shadow-[0_0_8px_#ef4444]' };
      case 'warning': return { icon: AlertTriangle, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10 shadow-[0_0_8px_#f59e0b]' };
      case 'success': return { icon: CheckCircle2, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10 shadow-[0_0_8px_#10b981]' };
      default: return { icon: Info, color: 'text-[#7CEEFF]', border: 'border-blue-500/20', bg: 'bg-blue-500/10 shadow-[0_0_8px_#7CEEFF]' };
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'ALL' || n.type === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout title="CONTRACTOR ALERTS">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="space-y-6"
      >
        
        {/* KPI Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-5 rounded-2xl border border-red-500/20 bg-red-500/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Critical Alerts</p>
            <p className="text-2xl font-black text-red-400 mt-2 tracking-tighter">
              {notifications.filter(n => n.type === 'critical' && !n.read).length} Unread
            </p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Warnings</p>
            <p className="text-2xl font-black text-amber-400 mt-2 tracking-tighter">
              {notifications.filter(n => n.type === 'warning' && !n.read).length} Unread
            </p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-[#7CEEFF]/20 bg-[#7CEEFF]/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Unread</p>
            <p className="text-2xl font-black text-[#7CEEFF] mt-2 tracking-tighter">
              {notifications.filter(n => !n.read).length} Messages
            </p>
          </div>
        </div>

        {/* Filter and Control Bar */}
        <div className="glass-panel rounded-2xl border border-slate-900 p-5 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="SEARCH ALERTS CONTENT..."
              className="w-full pl-10 pr-4 py-2.5 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none text-white uppercase placeholder:text-slate-700 animate-in fade-in"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Severity Filter */}
            <div className="flex items-center space-x-2 bg-black border border-slate-900 rounded-xl px-3 py-1.5 text-[9px] font-black">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-500 uppercase">Severity:</span>
              <select 
                className="bg-transparent border-0 outline-none text-white uppercase cursor-pointer"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="ALL">ALL ALERTS</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="WARNING">WARNING</option>
                <option value="SUCCESS">APPROVED</option>
                <option value="INFO">INFO</option>
              </select>
            </div>

            {/* Clear All Trigger */}
            <button
              onClick={markAllRead}
              className="text-[9px] font-black bg-[#111917] hover:bg-[#86FFD3]/15 border border-[#86FFD3]/30 text-[#86FFD3] px-3.5 py-2.5 rounded-xl transition-all uppercase tracking-widest flex items-center space-x-1.5"
            >
              <Check className="h-3.5 w-3.5 text-[#86FFD3]" />
              <span>Mark All Read</span>
            </button>
          </div>
        </div>

        {/* Notifications Table */}
        <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-900 bg-black/10 flex justify-between items-center">
            <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
              <Bell className="h-4 w-4 mr-2 text-[#7CEEFF] animate-pulse" />
              HUD System Alert Ticker
            </h2>
            <span className="text-[9px] text-slate-500 font-bold uppercase">{filteredNotifications.length} items logged</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                  <th className="px-6 py-4">SEVERITY</th>
                  <th className="px-6 py-4">ADVISORY CONTENT</th>
                  <th className="px-6 py-4">TIMELOG</th>
                  <th className="px-6 py-4">READ STATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredNotifications.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                      No notifications matching search filters.
                    </td>
                  </tr>
                ) : (
                  filteredNotifications.map(n => {
                    const style = getAlertStyle(n.type);
                    return (
                      <tr 
                        key={n.id} 
                        className={`hover:bg-white/5 transition cursor-pointer ${!n.read ? 'bg-[#7CEEFF]/5' : ''}`}
                        onClick={() => toggleRead(n.id)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${style.bg} shrink-0`}></span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${style.color}`}>{n.type}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-xs font-black uppercase tracking-wide leading-relaxed ${!n.read ? 'text-white' : 'text-slate-400'}`}>
                            {n.text}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-[10px] font-bold text-slate-500 hud-telemetry">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-slate-700" />
                            {n.time}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase tracking-widest ${
                            n.read ? 'bg-slate-900/50 text-slate-500 border-slate-900' : 'bg-[#7CEEFF]/10 text-[#7CEEFF] border-[#7CEEFF]/20 animate-pulse'
                          }`}>
                            {n.read ? 'READ' : 'NEW'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
};

export default ContractorNotifications;
