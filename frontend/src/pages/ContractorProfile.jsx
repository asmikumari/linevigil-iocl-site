import React from 'react';
import { motion } from 'framer-motion';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  ShieldCheck, 
  FileText, 
  TrendingUp, 
  Terminal, 
  Lock, 
  CheckCircle2, 
  Calendar 
} from 'lucide-react';

const ContractorProfile = () => {
  const { user } = useAuth();

  const complianceStats = [
    { label: 'Safety Compliance Rate', value: 98, color: 'bg-[#86FFD3] shadow-[0_0_6px_#86FFD3]', textColor: 'text-[#86FFD3]' },
    { label: 'Permit Verification Accuracy', value: 100, color: 'bg-[#7CEEFF] shadow-[0_0_6px_#7CEEFF]', textColor: 'text-[#7CEEFF]' },
    { label: 'Collision Advisory Response', value: 95, color: 'bg-[#F37021] shadow-[0_0_6px_#F37021]', textColor: 'text-[#F37021]' },
  ];

  return (
    <DashboardLayout title="CONTRACTOR SECURITY FILE">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        
        {/* Left Column: Profile Core Info */}
        <div className="lg:col-span-4 glass-panel border border-slate-900 rounded-2xl p-6 flex flex-col items-center text-center cursor-default">
          <div className="w-20 h-20 rounded-2xl bg-black/40 border border-[#86FFD3]/30 flex items-center justify-center relative group mb-4">
            <User className="h-10 w-10 text-[#86FFD3] shadow-inner" />
            <div className="absolute inset-0 rounded-2xl border border-dashed border-[#86FFD3]/20 animate-spin" style={{ animationDuration: '10s' }}></div>
          </div>
          
          <h2 className="text-lg font-black text-white uppercase tracking-wider">{user?.name || 'CONTRACTOR USER'}</h2>
          <p className="text-[9px] text-[#86FFD3] font-black uppercase tracking-[0.25em] mt-1">Authorized Row Excavator</p>
          
          <div className="w-full border-t border-slate-900 my-6"></div>

          <div className="w-full space-y-3.5 text-left text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-black/30 border border-slate-900 p-4.5 rounded-xl">
            <div className="flex justify-between"><span>LICENSE KEY:</span> <span className="text-white">LIC-88204-UP</span></div>
            <div className="flex justify-between"><span>CLEARANCE LEVEL:</span> <span className="text-[#86FFD3]">TIER 2 ACCREDITED</span></div>
            <div className="flex justify-between"><span>AUTH MATRIX:</span> <span className="text-white">STATE CORRIDORS</span></div>
            <div className="flex justify-between"><span>REGISTRATION:</span> <span className="text-white">24-MAY-2024</span></div>
            <div className="flex justify-between"><span>SYS CONNECTION:</span> <span className="text-emerald-400">NOMINAL</span></div>
          </div>
        </div>

        {/* Center Column: Compliance Tracking */}
        <div className="lg:col-span-5 glass-panel border border-slate-900 rounded-2xl p-6 space-y-6">
          <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center border-b border-slate-900 pb-3">
            <TrendingUp className="h-4 w-4 mr-2 text-[#7CEEFF]" />
            Advisory & Compliance Index
          </h3>

          <div className="space-y-6">
            {complianceStats.map((stat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span>{stat.label}</span>
                  <span className={`${stat.textColor}`}>{stat.value}%</span>
                </div>
                <div className="w-full bg-slate-950 border border-slate-900 h-2.5 rounded-full overflow-hidden">
                  <div className={`${stat.color} h-full transition-all duration-1000`} style={{ width: `${stat.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-black/30 border border-slate-900 rounded-xl p-4 flex items-start space-x-3.5 mt-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Compliance Status: Excellent</p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1 leading-normal">
                Your firm compliance scoring remains above the IOCL safety threshold (90%). No security deviations or corridor violations logged.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Encrypted Keys & Tokens */}
        <div className="lg:col-span-3 glass-panel border border-slate-900 rounded-2xl p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center border-b border-slate-900 pb-3">
              <Lock className="h-4 w-4 mr-2 text-[#F37021]" />
              Secure Signatures
            </h3>
            
            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
              Decryption signatures generated by LineVigil key servers to establish encrypted telemetry pipelines with patrol team field units.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-black/60 border border-slate-900 rounded-xl font-mono text-[8px] text-slate-400 uppercase tracking-wide leading-relaxed break-all">
                <span className="text-[#F37021] font-black block mb-1">AES-GCM SIGNATURE TOKEN:</span>
                0X86FFD3A3B91C32A932E4B4E80C96636395466FA
              </div>

              <div className="p-3.5 bg-black/60 border border-slate-900 rounded-xl font-mono text-[8px] text-slate-400 uppercase tracking-wide leading-relaxed break-all">
                <span className="text-[#7CEEFF] font-black block mb-1">RSA-4096 LOG KEY:</span>
                LINEVIGIL_FIELD_ACC_ID_05173_KEY_SECURE
              </div>
            </div>
          </div>

          <div className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] text-center mt-6 pt-3 border-t border-slate-900 flex items-center justify-center space-x-1">
            <Terminal className="h-3.5 w-3.5 text-slate-600 mr-1" />
            <span>LineVigil Identity Board</span>
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
};

export default ContractorProfile;
