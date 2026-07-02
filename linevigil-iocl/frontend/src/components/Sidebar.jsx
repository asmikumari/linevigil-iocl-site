import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Map as MapIcon, 
  FileText, 
  AlertTriangle, 
  BarChart3, 
  Bell, 
  Settings, 
  LogOut,
  ShieldCheck,
  Navigation,
  MessageSquare,
  User,
  Plus,
  Shield,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ role }) => {
  const { logout } = useAuth();

  const themes = {
    admin: {
      border: 'border-[#F37021]/30',
      active: 'bg-[#F37021]/10 text-white border-r-2 border-[#F37021] shadow-[0_0_15px_rgba(243,112,33,0.15)]',
      glow: 'glow-text-orange',
      accent: '#F37021'
    },
    patrol: {
      border: 'border-[#7CEEFF]/30',
      active: 'bg-[#7CEEFF]/10 text-white border-r-2 border-[#7CEEFF] shadow-[0_0_15px_rgba(124,238,255,0.15)]',
      glow: 'glow-text-cyan',
      accent: '#7CEEFF'
    },
    contractor: {
      border: 'border-[#86FFD3]/30',
      active: 'bg-[#86FFD3]/10 text-white border-r-2 border-[#86FFD3] shadow-[0_0_15px_rgba(134,255,211,0.15)]',
      glow: 'glow-text-mint',
      accent: '#86FFD3'
    }
  };

  const theme = themes[role] || themes.contractor;

  const menuItems = {
    admin: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
      { name: 'User Management', icon: Users, path: '/admin/users' },
      { name: 'Pipeline Management', icon: MapIcon, path: '/admin/pipelines' },
      { name: 'Excavation Requests', icon: FileText, path: '/admin/requests' },
      { name: 'Incident Management', icon: AlertTriangle, path: '/admin/incidents' },
      { name: 'Analytics & Reports', icon: BarChart3, path: '/admin/analytics' },
      { name: 'Notifications', icon: Bell, path: '/admin/notifications' },
      { name: 'System Settings', icon: Settings, path: '/admin/settings' },
      { name: 'Messages', icon: MessageSquare, path: '/admin/messages' },
    ],
    patrol: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/patrol' },
      { name: 'My Zones', icon: MapIcon, path: '/patrol/zones' },
      { name: 'Live Alerts', icon: Bell, path: '/patrol/alerts' },
      { name: 'Incidents', icon: AlertTriangle, path: '/patrol/incidents' },
      { name: 'Report Incident', icon: FileText, path: '/patrol/report' },
      { name: 'Incident Status', icon: ShieldCheck, path: '/patrol/status' },
      { name: 'Navigation', icon: Navigation, path: '/patrol/nav' },
      { name: 'Notifications', icon: Bell, path: '/patrol/notifications' },
      { name: 'Messages', icon: MessageSquare, path: '/patrol/messages' },
    ],
    contractor: [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { name: 'New Excavation Request', icon: Plus, path: '/dashboard/new' },
      { name: 'My Requests', icon: ClipboardList, path: '/dashboard/requests' },
      { name: 'Pipeline Map', icon: MapIcon, path: '/dashboard/map' },
      { name: 'Notifications', icon: Bell, path: '/dashboard/notifications' },
      { name: 'Messages', icon: MessageSquare, path: '/dashboard/messages' },
      { name: 'Profile', icon: User, path: '/dashboard/profile' },
    ]
  };

  const items = menuItems[role] || menuItems.contractor;

  return (
    <div className="w-64 glass-panel border-r border-[#7CEEFF]/10 text-slate-300 flex flex-col h-screen shrink-0 overflow-hidden z-30">
      
      {/* Brand Logo Header */}
      <div className="p-8 flex items-center space-x-4 border-b border-[#7CEEFF]/10 bg-black/20">
        <div className="bg-[#111917] p-2 rounded-xl border border-slate-800 shadow-inner flex items-center justify-center">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div className="leading-none">
          <p className="logo-font text-sm tracking-widest text-white uppercase italic">LINEVIGIL</p>
          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">IOCL INTEGRITY SYS</p>
        </div>
      </div>

      {/* Navigation menu */}
      <div className="flex-1 mt-6 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="px-4 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-600">HUD NAVIGATION</div>
        {items.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center space-x-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 group ${
                isActive ? theme.active : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </div>

      {/* Active System Mode Info */}
      <div className="px-6 py-4 mx-4 mb-4 rounded-xl bg-black/40 border border-slate-900 hud-telemetry text-[8px] text-slate-500 space-y-1.5">
        <div className="flex justify-between"><span>LINK STATE:</span> <span className="text-emerald-400 font-bold">LINKED</span></div>
        <div className="flex justify-between"><span>ENCRYPTION:</span> <span className="text-white">QUANTUM AES</span></div>
        <div className="flex justify-between"><span>LOCATOR:</span> <span className="text-white">GPS/GLONASS</span></div>
      </div>

      {/* Logout button */}
      <div className="p-6 border-t border-[#7CEEFF]/10 bg-black/20">
        <button
          onClick={logout}
          className="flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all border border-slate-900 hover:border-red-500/30"
        >
          <LogOut className="h-4 w-4 text-red-500/60 group-hover:text-red-400" />
          <span>Disconnect Session</span>
        </button>
      </div>

    </div>
  );
};

export default Sidebar;
