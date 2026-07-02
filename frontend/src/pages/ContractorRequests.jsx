import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { excavationService, pipelineService } from '../services/api';
import Map from '../components/Map';
import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar, 
  AlertTriangle, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';

const ContractorRequests = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pipeRes, reqRes] = await Promise.all([
        pipelineService.getAll(),
        excavationService.getMy()
      ]);
      setPipelines(pipeRes.data);
      const requests = reqRes.data;
      setMyRequests(requests);
      if (requests.length > 0) {
        setSelectedRequest(requests[0]);
      }
    } catch (err) {
      console.warn('Backend link down. Operating in standalone client-side Contractor Fallback mode.', err);
      
      setPipelines({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { id: 1, name: 'IOCL-PL-01 (Mathura-Jalandhar)', type: 'product' }, geometry: { type: 'LineString', coordinates: [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50], [76.50, 31.00]] } }
        ]
      });

      const fallbackRequests = [
        { id: 1, contractor_name: user?.name || 'Contractor User', company_name: 'Buildwell Ltd.', work_date: '2026-06-12', purpose: 'Road Construction', status: 'pending', risk_level: 'high', distance_to_pipeline: 120.5, lat: 28.58, lng: 77.12 },
        { id: 2, contractor_name: user?.name || 'Contractor User', company_name: 'Buildwell Ltd.', work_date: '2026-06-15', purpose: 'Sewer Line', status: 'verified', risk_level: 'medium', distance_to_pipeline: 450.0, lat: 28.50, lng: 77.50 },
        { id: 3, contractor_name: user?.name || 'Contractor User', company_name: 'Buildwell Ltd.', work_date: '2026-05-20', purpose: 'Utility Cable Laying', status: 'approved', risk_level: 'low', distance_to_pipeline: 1200.0, lat: 27.49, lng: 77.67 },
        { id: 4, contractor_name: user?.name || 'Contractor User', company_name: 'Buildwell Ltd.', work_date: '2026-05-18', purpose: 'Water Main Digging', status: 'closed', risk_level: 'low', distance_to_pipeline: 2300.0, lat: 28.98, lng: 77.70 }
      ];

      setMyRequests(fallbackRequests);
      setSelectedRequest(fallbackRequests[0]);
    }
  };

  // Filter requests based on search, status, and risk filters
  const filteredRequests = myRequests.filter(req => {
    const matchesSearch = 
      req.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `EXC-${3000 + req.id}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter.toLowerCase();
    const matchesRisk = riskFilter === 'ALL' || req.risk_level === riskFilter.toLowerCase();
    return matchesSearch && matchesStatus && matchesRisk;
  });

  // Calculate high-tech KPIs
  const totalCount = myRequests.length;
  const pendingCount = myRequests.filter(r => r.status === 'pending').length;
  const approvedCount = myRequests.filter(r => r.status === 'approved').length;
  const highRiskCount = myRequests.filter(r => r.risk_level === 'high').length;

  return (
    <DashboardLayout title="CONTRACTOR PERMITS">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="space-y-6"
      >
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Submitted', value: totalCount, sub: 'All excavation filings', color: 'text-[#86FFD3]', border: 'border-[#86FFD3]/20', bg: 'bg-[#86FFD3]/5' },
            { label: 'Pending Review', value: pendingCount, sub: 'Awaiting patrol survey', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
            { label: 'Approved Licenses', value: approvedCount, sub: 'Safe to excavate', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
            { label: 'High Risk Zones', value: highRiskCount, sub: 'Inside critical buffers', color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' }
          ].map((kpi, idx) => (
            <div key={idx} className={`glass-panel p-5 rounded-2xl border ${kpi.border} ${kpi.bg} cursor-default`}>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</p>
              <p className={`text-2xl font-black ${kpi.color} mt-2 tracking-tighter`}>{kpi.value}</p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left/Center: Table and Search filters */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Filter Panel */}
            <div className="glass-panel rounded-2xl border border-slate-900 p-5 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="SEARCH PERMIT ID OR WORK PURPOSE..."
                  className="w-full pl-10 pr-4 py-2.5 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none text-white uppercase placeholder:text-slate-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex items-center space-x-2 bg-black border border-slate-900 rounded-xl px-3 py-1.5">
                  <Filter className="h-3 w-3 text-slate-500" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Status:</span>
                  <select 
                    className="bg-transparent border-0 outline-none text-[9px] font-black text-white uppercase cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">ALL STATUS</option>
                    <option value="PENDING">PENDING</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                {/* Risk Filter */}
                <div className="flex items-center space-x-2 bg-black border border-slate-900 rounded-xl px-3 py-1.5">
                  <AlertTriangle className="h-3 w-3 text-slate-500" />
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Risk:</span>
                  <select 
                    className="bg-transparent border-0 outline-none text-[9px] font-black text-white uppercase cursor-pointer"
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                  >
                    <option value="ALL">ALL RISK</option>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Permits Table */}
            <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden">
              <div className="p-5 border-b border-slate-900 bg-black/10 flex justify-between items-center">
                <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
                  <ClipboardList className="h-4 w-4 mr-2 text-[#86FFD3]" />
                  Active Permit Database
                </h2>
                <span className="text-[9px] text-slate-500 font-bold uppercase">{filteredRequests.length} matching</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                      <th className="px-6 py-4">PERMIT ID</th>
                      <th className="px-6 py-4">FIRM & PURPOSE</th>
                      <th className="px-6 py-4">RISK STATE</th>
                      <th className="px-6 py-4">WORK DATE</th>
                      <th className="px-6 py-4">STATUS</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                          No matching permit logs found
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map(req => (
                        <tr 
                          key={req.id} 
                          className={`hover:bg-white/5 transition cursor-pointer ${selectedRequest?.id === req.id ? 'bg-[#7CEEFF]/5' : ''}`}
                          onClick={() => setSelectedRequest(req)}
                        >
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black text-[#7CEEFF] hud-telemetry">EXC-{3000 + req.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-black text-white uppercase tracking-wider">{req.company_name}</p>
                            <p className="text-[8px] text-slate-500 font-bold uppercase mt-1 italic">"{req.purpose}"</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                req.risk_level === 'high' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' :
                                req.risk_level === 'medium' ? 'bg-amber-500 shadow-[0_0_6px_#f59e0b]' :
                                'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                              }`}></span>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${
                                req.risk_level === 'high' ? 'text-red-400' :
                                req.risk_level === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {req.risk_level} ({Math.round(req.distance_to_pipeline || 0)}m)
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-[10px] font-bold text-slate-500 hud-telemetry">
                              <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-700" />
                              {req.work_date ? new Date(req.work_date).toLocaleDateString() : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase tracking-widest ${
                              req.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                              req.status === 'verified' ? 'bg-blue-500/10 text-[#7CEEFF] border-blue-500/20' : 
                              req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              'bg-slate-800/20 text-slate-500 border-slate-800'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <ChevronRight className={`h-4 w-4 transition-transform ${selectedRequest?.id === req.id ? 'text-[#7CEEFF] translate-x-1' : 'text-slate-600'}`} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Inspector */}
          <div className="lg:col-span-4 space-y-6">
            {selectedRequest ? (
              <>
                {/* Mini-Map Component */}
                <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden flex flex-col h-[260px]">
                  <div className="p-4 border-b border-slate-900 bg-black/40 flex items-center justify-between">
                    <h3 className="font-black text-white text-[10px] uppercase tracking-widest flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1.5 text-[#7CEEFF]" />
                      ROW GIS Coordinates Location
                    </h3>
                  </div>
                  <div className="flex-1 relative bg-black">
                    <Map 
                      pipelines={pipelines} 
                      requests={[selectedRequest]} 
                      mapCenter={[selectedRequest.lat, selectedRequest.lng]} 
                    />
                  </div>
                </div>

                {/* Workflow Timeline */}
                <div className="glass-panel rounded-2xl border border-slate-900 p-5 space-y-5">
                  <h3 className="font-black text-white text-[10px] uppercase tracking-widest flex items-center border-b border-slate-900 pb-3">
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-[#86FFD3]" />
                    Permit Authorization Timeline
                  </h3>

                  <div className="relative pl-6 border-l border-slate-800 space-y-6 ml-2 py-1">
                    {[
                      { name: 'Safety Permit Filed', desc: 'Excavation plans registered on platform', active: true, done: true },
                      { name: 'Patrol Assignment', desc: 'Automatic collision checker queue assignment', active: true, done: selectedRequest.status !== 'pending' },
                      { name: 'Physical Survey Verification', desc: 'Patrol officer field marker verification', active: selectedRequest.status !== 'pending', done: selectedRequest.status === 'verified' || selectedRequest.status === 'approved' },
                      { name: 'Administrative Approval', desc: 'IOCL Command Board final authorization link', active: selectedRequest.status === 'verified' || selectedRequest.status === 'approved', done: selectedRequest.status === 'approved' }
                    ].map((step, idx) => (
                      <div key={idx} className="relative">
                        <span className={`absolute -left-[31px] top-0 w-4.5 h-4.5 rounded-full border flex items-center justify-center text-[7px] font-black ${
                          step.done ? 'bg-[#86FFD3]/20 border-[#86FFD3] text-[#86FFD3]' : 
                          step.active ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-950 border-slate-800 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-wide leading-tight ${step.active ? 'text-white' : 'text-slate-500'}`}>{step.name}</p>
                          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1 leading-normal">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safety Checklist */}
                <div className="glass-panel rounded-2xl border border-slate-900 p-5 space-y-4">
                  <h3 className="font-black text-white text-[10px] uppercase tracking-widest flex items-center border-b border-slate-900 pb-3">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-red-400" />
                    Excavator Safety Checklists
                  </h3>

                  <div className="space-y-3">
                    {[
                      { label: 'Physical Marker Scan', status: selectedRequest.status !== 'pending' },
                      { label: 'Proximity Check > 100m', status: selectedRequest.distance_to_pipeline > 100 },
                      { label: 'Active Patrol Supervision', status: selectedRequest.status === 'verified' || selectedRequest.status === 'approved' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-slate-900">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                        {item.status ? (
                          <span className="flex items-center text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-400" /> PASS
                          </span>
                        ) : (
                          <span className="flex items-center text-[8px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
                            <Clock className="h-3.5 w-3.5 mr-1 text-amber-500" /> PENDING
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="glass-panel rounded-2xl border border-slate-900 p-8 text-center text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                Select a permit from the list to inspect telemetry and coordinates.
              </div>
            )}
          </div>

        </div>

      </motion.div>
    </DashboardLayout>
  );
};

export default ContractorRequests;
