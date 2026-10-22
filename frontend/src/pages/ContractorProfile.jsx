import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { excavationService } from '../services/api';
import { User, FileText, ShieldCheck } from 'lucide-react';

const VERIFIED = ['verified', 'approved', 'Safe to Dig'];

// Contractor profile: account details from the session and statistics from the contractor's own permits.
const ContractorProfile = () => {
  const { user } = useAuth();
  const [permits, setPermits] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    excavationService
      .getMy()
      .then((res) => setPermits(res.data))
      .catch(() => setError('Permit statistics are unavailable while offline.'));
  }, []);

  const total = permits?.length || 0;
  const count = (fn) => (permits || []).filter(fn).length;
  const verified = count((p) => VERIFIED.includes(p.status));
  const stats = [
    { label: 'Permits filed', value: total },
    { label: 'Awaiting patrol check', value: count((p) => p.status === 'pending' || p.status === 'assigned') },
    { label: 'Verified safe to dig', value: verified },
    { label: 'Within 500 m of a pipeline', value: count((p) => p.risk_level === 'high') },
  ];
  const share = total ? Math.round((verified / total) * 100) : 0;

  return (
    <DashboardLayout title="Profile">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 glass-panel border border-slate-900 rounded-2xl p-6 space-y-5">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-xl border border-slate-800 flex items-center justify-center">
              <User className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{user?.name || 'Contractor'}</h2>
              <p className="text-[9px] text-slate-500">Contractor account</p>
            </div>
          </div>
          <dl className="space-y-3 text-sm border-t border-slate-900 pt-5">
            <div className="flex justify-between gap-4"><dt className="text-[9px] text-slate-500">Email</dt><dd className="text-white truncate">{user?.email || 'Not available'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[9px] text-slate-500">Account ID</dt><dd className="text-white">{user?.id ?? 'Not available'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[9px] text-slate-500">Role</dt><dd className="text-white">Contractor</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-[9px] text-slate-500">Session</dt><dd className="text-white">Expires 24 hours after sign-in</dd></div>
          </dl>
        </div>

        <div className="lg:col-span-8 glass-panel border border-slate-900 rounded-2xl p-6 space-y-6">
          <h3 className="font-black text-white text-sm flex items-center">
            <FileText className="h-4 w-4 mr-2 text-slate-400" />
            Your permits
          </h3>

          {error && <p className="text-sm text-slate-400">{error}</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="border border-slate-900 rounded-xl p-4">
                <p className="text-[9px] text-slate-500">{s.label}</p>
                <p className="text-3xl font-black text-white mt-2">{permits ? s.value : '–'}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[9px] text-slate-500">
              <span>Share of permits verified on site</span>
              <span className="text-white">{permits ? `${share}%` : '–'}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
              <div className="h-full bg-[#F37021] transition-all duration-700" style={{ width: `${share}%` }} />
            </div>
          </div>

          <div className="border border-slate-900 rounded-xl p-4 flex items-start space-x-3">
            <ShieldCheck className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-400">
              Each permit is measured against the nearest pipeline when you file it. Sites under 500 m are high risk and need a
              patrol officer's on-site check before digging; 500 m to 1 km is medium risk.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContractorProfile;
