import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { 
  MessageSquare, 
  Send, 
  User, 
  Cpu, 
  Radio, 
  Wifi, 
  Terminal, 
  ShieldAlert 
} from 'lucide-react';

const ContractorMessages = () => {
  const [contacts, setContacts] = useState([
    { id: 1, name: 'IOCL Command Board', initials: 'CB', role: 'System Admin', online: true, unread: true },
    { id: 2, name: 'Patrol Officer Singh', initials: 'PS', role: 'Field Patrol Unit 2', online: true, unread: false },
    { id: 3, name: 'Safety Supervisor Sen', initials: 'SS', role: 'External Auditor', online: false, unread: false }
  ]);

  const [activeContact, setActiveContact] = useState(contacts[0]);
  
  const [conversations, setConversations] = useState({
    1: [
      { id: 1, sender: 'CB', text: 'Attention: Safety Permit EXC-3001 has been flagged for automated high risk buffers checks.', time: '10:15 AM', system: true },
      { id: 2, sender: 'me', text: 'Understood. We have locked coordinate telemetry at Mathura district.', time: '10:16 AM', system: false },
      { id: 3, sender: 'CB', text: 'Patrol Assignment dispatcher has allocated Patrol Officer Singh to inspect. Keep telemetry link active.', time: '10:20 AM', system: true }
    ],
    2: [
      { id: 1, sender: 'PS', text: 'Establishing local sync channel. I am approaching the Mathura excavation coordinates now.', time: '09:40 AM', system: false },
      { id: 2, sender: 'me', text: 'Copy that. Bounding markers are set in the field.', time: '09:42 AM', system: false },
      { id: 3, sender: 'PS', text: 'Verified coordinates match. Scanning boundary markers now.', time: '09:45 AM', system: false }
    ],
    3: [
      { id: 1, sender: 'SS', text: 'Audit file safety checklists updated. Ensure you log all excavation telemetry offline if network drops.', time: 'Yesterday', system: false }
    ]
  });

  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom of chat when message state changes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeContact]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now(),
      sender: 'me',
      text: inputVal.trim().toUpperCase(),
      time: timestamp,
      system: false
    };

    setConversations(prev => ({
      ...prev,
      [activeContact.id]: [...prev[activeContact.id], userMsg]
    }));

    setInputVal('');

    // Simulate cybernetic telemetry reply from command/patrol
    setTimeout(() => {
      let replyText = 'ADVISORY: TRANSMISSION LINK STABLE. TRANSACTION TELEMETRY RECEIVED.';
      if (activeContact.id === 1) {
        replyText = 'IOCL AUTO-ALERT: COMMAND RECORD LOG UPDATED. ALL COMPLIANCE MATRICES ACTIVE.';
      } else if (activeContact.id === 2) {
        replyText = 'FIELD UPDATE: LOCAL MARKS REGISTERED. TELEMETRY COORDS CORRELATING NOMINAL.';
      }
      
      const replyMsg = {
        id: Date.now() + 1,
        sender: activeContact.initials,
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        system: activeContact.id === 1
      };

      setConversations(prev => ({
        ...prev,
        [activeContact.id]: [...prev[activeContact.id], replyMsg]
      }));
    }, 1500);
  };

  const selectContact = (contact) => {
    setActiveContact(contact);
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unread: false } : c));
  };

  const activeMessages = conversations[activeContact.id] || [];

  return (
    <DashboardLayout title="SECURE CHAT LINK">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-170px)] shrink-0 overflow-hidden"
      >
        
        {/* Contacts column */}
        <div className="lg:col-span-4 glass-panel border border-slate-900 rounded-2xl flex flex-col overflow-hidden h-full">
          <div className="p-5 border-b border-slate-900 bg-black/40 flex items-center justify-between">
            <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-[#86FFD3]" />
              Secure Channels
            </h2>
            <div className="flex items-center space-x-1.5 text-[8px] hud-telemetry text-slate-500 font-bold">
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span>LINK ACTIVE</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {contacts.map(c => (
              <div 
                key={c.id}
                onClick={() => selectContact(c)}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center space-x-3.5 ${
                  activeContact.id === c.id 
                    ? 'bg-[#86FFD3]/10 border-[#86FFD3]/30 shadow-[0_0_15px_rgba(134,255,211,0.05)]' 
                    : 'bg-black/20 border-slate-900 hover:border-slate-800 hover:bg-white/5'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg bg-black/40 border border-slate-800 text-slate-300 font-black text-xs flex items-center justify-center shrink-0 relative`}>
                  {c.initials}
                  {c.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black shadow-[0_0_5px_#10b981]"></span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                    <p className={`text-xs font-black uppercase truncate tracking-wide leading-none ${activeContact.id === c.id ? 'text-white' : 'text-slate-300'}`}>
                      {c.name}
                    </p>
                    {c.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#7CEEFF] animate-pulse shadow-[0_0_6px_#7CEEFF]"></span>
                    )}
                  </div>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{c.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat window column */}
        <div className="lg:col-span-8 glass-panel border border-slate-900 rounded-2xl flex flex-col overflow-hidden h-full relative">
          
          {/* Header Info */}
          <div className="p-5 border-b border-slate-900 bg-black/40 flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider">{activeContact.name}</p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">{activeContact.role}</p>
            </div>
            <div className="text-right text-[8px] hud-telemetry font-bold text-slate-500 uppercase tracking-widest border border-slate-800 bg-black/40 p-2 rounded-lg flex items-center space-x-1.5">
              <Terminal className="h-3 w-3 text-[#7CEEFF]" />
              <span>LOG ENCRYPTED: SHA256/AES</span>
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-black/10">
            {activeMessages.map(msg => (
              <div 
                key={msg.id}
                className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] rounded-2xl p-4 border ${
                  msg.sender === 'me'
                    ? 'bg-[#111917]/80 border-[#86FFD3]/20 text-white rounded-tr-none'
                    : msg.system
                      ? 'bg-red-950/20 border-red-500/20 text-slate-300 rounded-tl-none shadow-[inset_0_0_12px_rgba(239,68,68,0.05)]'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 rounded-tl-none'
                }`}>
                  {msg.system && (
                    <div className="flex items-center space-x-1.5 text-[8px] font-black text-red-400 uppercase tracking-widest mb-1.5 border-b border-red-500/10 pb-1">
                      <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                      <span>Security Core Alert</span>
                    </div>
                  )}
                  <p className="text-xs font-bold leading-relaxed uppercase tracking-wide whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-[7px] text-slate-500 font-bold text-right mt-2 uppercase tracking-widest">{msg.time}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt input */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-900 bg-black/40 flex items-center space-x-3.5">
            <input
              type="text"
              placeholder="ENTER SECURE TRANSMISSION MESSAGE..."
              className="flex-1 bg-black border border-slate-900 rounded-xl px-4 py-3.5 text-xs font-bold text-white focus:border-[#7CEEFF]/40 outline-none uppercase placeholder:text-slate-800"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="bg-[#111917] hover:bg-[#1c2a27] border border-[#86FFD3]/30 text-white p-3.5 rounded-xl transition disabled:opacity-20 flex items-center justify-center shrink-0 shadow-lg shadow-[#86FFD3]/5"
            >
              <Send className="h-4.5 w-4.5 text-[#86FFD3]" />
            </button>
          </form>

        </div>

      </motion.div>
    </DashboardLayout>
  );
};

export default ContractorMessages;
