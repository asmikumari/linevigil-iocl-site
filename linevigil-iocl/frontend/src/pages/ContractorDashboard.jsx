import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { excavationService, pipelineService } from '../services/api';
import Map from '../components/Map';
import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  Plus, 
  MapPin, 
  Bell, 
  MessageSquare, 
  ShieldCheck, 
  Clock,
  ArrowRight,
  Calendar,
  AlertTriangle,
  Radar,
  Activity,
  CheckCircle2
} from 'lucide-react';

const ContractorDashboard = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formData, setFormData] = useState({ companyName: '', workDate: '', purpose: 'Road Construction' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Real-time Collision Radar state
  const [collisionInfo, setCollisionInfo] = useState(null);
  const [checkingCollision, setCheckingCollision] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Fetch collision data when map coordinate is clicked/adjusted
  useEffect(() => {
    if (selectedLocation) {
      checkProximityCollision(selectedLocation.lat, selectedLocation.lng);
    } else {
      setCollisionInfo(null);
    }
  }, [selectedLocation]);

  const loadData = async () => {
    try {
      const [pipeRes, reqRes] = await Promise.all([
        pipelineService.getAll(),
        excavationService.getMy()
      ]);
      setPipelines(pipeRes.data);
      setMyRequests(reqRes.data);
    } catch (err) {
      console.warn('Backend link down. Operating in standalone client-side Contractor GIS fallback mode.', err);
      
      setPipelines({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { id: 1, name: 'IOCL-PL-01 (Mathura-Jalandhar)', type: 'product' }, geometry: { type: 'LineString', coordinates: [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50], [76.50, 31.00]] } }
        ]
      });

      setMyRequests([
        { id: 1, contractor_name: user?.name || 'Contractor User', company_name: 'Buildwell Ltd.', work_date: '2026-06-12', purpose: 'Road Construction', status: 'pending', risk_level: 'high', distance_to_pipeline: 120.5, lat: 28.58, lng: 77.12 }
      ]);
    }
  };

  const checkProximityCollision = async (lat, lng) => {
    setCheckingCollision(true);
    try {
      const res = await excavationService.checkCollision({ lat, lng });
      setCollisionInfo(res.data);
    } catch (err) {
      console.warn('Backend check-collision failed. Executing local GIS calculations.', err);
      
      // Client-side math implementation (fallback)
      const mockPipelines = [
        { name: 'IOCL-PL-01 (Mathura-Jalandhar)', geom: [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50], [76.50, 31.00]] },
        { name: 'IOCL-PL-02 (Koyali-Sanganer)', geom: [[73.18, 22.30], [73.50, 23.50], [74.50, 25.50], [75.80, 26.90]] },
        { name: 'IOCL-PL-03 (Paradip-Haldia)', geom: [[86.67, 20.27], [87.50, 21.50], [88.20, 22.50]] }
      ];

      function pointToSegmentDistance(px, py, ax, ay, bx, by) {
        const dx = bx - ax;
        const dy = by - ay;
        if (dx === 0 && dy === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);
        const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
        const clampedT = Math.max(0, Math.min(1, t));
        const nearestX = ax + clampedT * dx;
        const nearestY = ay + clampedT * dy;
        return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
      }

      let minDistance = Infinity;
      let nearestPipe = null;

      for (const pipe of mockPipelines) {
        let minPipeDist = Infinity;
        for (let i = 0; i < pipe.geom.length - 1; i++) {
          const d = pointToSegmentDistance(lng, lat, pipe.geom[i][0], pipe.geom[i][1], pipe.geom[i+1][0], pipe.geom[i+1][1]);
          if (d < minPipeDist) minPipeDist = d;
        }
        const dMeters = minPipeDist * 111320;
        if (dMeters < minDistance) {
          minDistance = dMeters;
          nearestPipe = pipe;
        }
      }

      const distance = minDistance;
      const pipelineName = nearestPipe ? nearestPipe.name : 'Unknown Pipeline';
      let riskLevel = 'low';
      let collisionStatus = 'safe';

      if (distance < 100) {
        riskLevel = 'high';
        collisionStatus = 'danger';
      } else if (distance < 500) {
        riskLevel = 'medium';
        collisionStatus = 'warning';
      }

      setCollisionInfo({
        distanceToPipeline: distance,
        pipelineName,
        riskLevel,
        collisionStatus,
        overlappingPermits: []
      });
    } finally {
      setCheckingCollision(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLocation) {
      setMessage({ type: 'error', text: 'Select coordinates on the map' });
      return;
    }
    setLoading(true);
    try {
      await excavationService.create({ 
        ...formData, 
        contractorName: user?.name || 'Contractor User', 
        lng: selectedLocation.lng, 
        lat: selectedLocation.lat 
      });
      setMessage({ type: 'success', text: 'Permit safety request submitted successfully' });
      setFormData({ companyName: '', workDate: '', purpose: 'Road Construction' });
      setSelectedLocation(null);
      loadData();
    } catch (err) {
      console.warn('Backend permit create failed. Simulating client-side submission.', err);
      
      // Simulate permit cache locally
      setTimeout(() => {
        const localRequest = {
          id: Date.now(),
          contractor_name: user?.name || 'Contractor User',
          company_name: formData.companyName,
          work_date: formData.workDate,
          purpose: formData.purpose,
          lat: selectedLocation.lat,
          lng: selectedLocation.lng,
          distance_to_pipeline: collisionInfo ? collisionInfo.distanceToPipeline : 1000,
          risk_level: collisionInfo ? collisionInfo.riskLevel : 'low',
          status: 'pending'
        };
        
        setMyRequests(prev => [localRequest, ...prev]);
        setMessage({ type: 'success', text: 'Permit safety request submitted successfully (Local Offline Cache)' });
        setFormData({ companyName: '', workDate: '', purpose: 'Road Construction' });
        setSelectedLocation(null);
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="CONTRACTOR PORTAL">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        
        {/* Left: Excavation Form & Proximity Radar */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Submit Request */}
          <div className="glass-panel rounded-2xl border border-slate-900 p-6">
            <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
              <Plus className="h-4 w-4 mr-2 text-[#86FFD3]" />
              New Excavation Permit
            </h2>
            
            {message && (
              <div className={`p-4 rounded-xl mb-6 text-[9px] font-black uppercase tracking-widest leading-relaxed border animate-in fade-in duration-300 ${
                message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Entity / Company Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none text-white uppercase placeholder:text-slate-800"
                  placeholder="ENTER CONTRACTOR FIRM NAME"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Purpose</label>
                <select 
                  className="w-full px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none text-slate-300 uppercase cursor-pointer"
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  required
                >
                  <option value="Road Construction">ROAD CONSTRUCTION</option>
                  <option value="Sewer Line">SEWER LINE</option>
                  <option value="Building Foundation">BUILDING FOUNDATION</option>
                  <option value="Utility Cable Laying">UTILITY CABLE LAYING</option>
                  <option value="Water Main Digging">WATER MAIN DIGGING</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold text-slate-300 cursor-pointer focus:border-[#7CEEFF]/40 outline-none"
                    value={formData.workDate}
                    onChange={(e) => setFormData({...formData, workDate: e.target.value})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Coordinates Selection</label>
                  <div className="p-3 bg-black border border-slate-900 rounded-xl flex items-center justify-center text-[9px] font-black text-[#7CEEFF] uppercase tracking-wide">
                    {selectedLocation ? (
                      <span className="truncate">{selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}</span>
                    ) : (
                      <span className="text-red-400 animate-pulse italic">CLICK ON MAP</span>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading || !selectedLocation}
                className="w-full bg-[#111917] hover:bg-[#1c2a27] border border-[#86FFD3]/30 text-white font-black py-4 rounded-xl text-[9px] uppercase tracking-[0.2em] transition disabled:opacity-30 mt-4 flex items-center justify-center group"
              >
                {loading ? 'SUBMITTING SAFETY PERMIT...' : (
                  <>
                    SUBMIT SAFETY PERMIT
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform text-[#86FFD3]" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Real-time Collision Radar Card */}
          <div className="glass-panel rounded-2xl border border-slate-900 p-6 relative overflow-hidden">
            <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
              <Radar className="h-4 w-4 mr-2 text-[#F37021] animate-pulse" />
              Proximity Collision Radar
            </h2>

            {checkingCollision ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <Activity className="h-6 w-6 text-[#7CEEFF] animate-pulse" />
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest hud-telemetry">COMPUTING BUFFER OVERLAPS...</span>
              </div>
            ) : collisionInfo ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className={`p-4 rounded-xl border flex justify-between items-start ${
                  collisionInfo.collisionStatus === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  collisionInfo.collisionStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <div>
                    <span className="text-[8px] font-black uppercase tracking-widest block">COLLISION HAZARD:</span>
                    <span className="text-sm font-black uppercase tracking-wider block mt-1">{(collisionInfo.collisionStatus || '').toUpperCase()}</span>
                  </div>
                  <span className="text-[9px] font-black bg-black/50 border border-slate-800 px-2 py-0.5 rounded uppercase tracking-wider hud-telemetry">
                    {Math.round(collisionInfo.distanceToPipeline)} METERS
                  </span>
                </div>

                <div className="space-y-2 text-[9px] font-bold text-slate-400 bg-black/40 border border-slate-900 p-4 rounded-xl">
                  <div className="flex justify-between">
                    <span>CLOSEST PIPE:</span>
                    <span className="text-white uppercase truncate max-w-[150px]">{collisionInfo.pipelineName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SEVERITY RISK:</span>
                    <span className={`uppercase font-black ${
                      collisionInfo.riskLevel === 'high' ? 'text-red-400' :
                      collisionInfo.riskLevel === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{collisionInfo.riskLevel} RISK</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CONFLICT PERMITS:</span>
                    <span className="text-white">{collisionInfo.overlappingPermits?.length || 0} ACTIVE</span>
                  </div>
                </div>

                {collisionInfo.collisionStatus === 'danger' && (
                  <p className="text-[8px] font-bold text-red-400 leading-normal border-l-2 border-red-500 pl-3 uppercase tracking-wider">
                    CRITICAL: Safety guidelines prohibit excavation within the 100m core corridor without direct physical patrol markers.
                  </p>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                Select coordinate point on the map to trigger automated safety check.
              </div>
            )}
          </div>

        </div>

        {/* Center: Map & Permit History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 overflow-hidden flex flex-col h-[450px]">
            <div className="p-5 border-b border-[#7CEEFF]/10 flex justify-between items-center bg-black/40">
              <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
                <ShieldCheck className="h-4 w-4 mr-2 text-[#86FFD3]" />
                Right of Way (ROW) Corridor Map
              </h2>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                SELECT EXCAVATION POINT ON INTERACTIVE LAYER
              </div>
            </div>
            <div className="flex-1 relative bg-black">
              <Map 
                pipelines={pipelines} 
                requests={myRequests} 
                onLocationSelect={setSelectedLocation} 
                selectedLocation={selectedLocation} 
              />
            </div>
          </div>

          {/* Permit History & Workflow Timeline */}
          <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden">
            <div className="p-5 border-b border-slate-900 bg-black/10 flex justify-between items-center">
              <h2 className="font-black text-white text-xs uppercase tracking-widest">My Permit Logs</h2>
              <span className="text-[9px] text-slate-500 font-bold uppercase">{myRequests.length} Submitted</span>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                    <th className="px-6 py-4">PERMIT ID</th>
                    <th className="px-6 py-4">RISK TELEMETRY</th>
                    <th className="px-6 py-4">DATE</th>
                    <th className="px-6 py-4">PERMIT TIMELINE STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {myRequests.map(req => (
                    <tr key={req.id} className="hover:bg-white/5 transition cursor-default">
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-black text-[#7CEEFF] hud-telemetry">EXC-{3000 + req.id}</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase truncate max-w-[130px] mt-1 italic">"{req.purpose}"</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1.5">
                          <AlertTriangle className={`h-3.5 w-3.5 ${req.risk_level === 'high' ? 'text-red-500' : 'text-slate-600'}`} />
                          <span className={`text-[9px] font-black uppercase tracking-widest ${req.risk_level === 'high' ? 'text-red-400' : 'text-slate-400'}`}>
                            {req.risk_level} Risk
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
                        
                        {/* Glow Workflow Node Tracker */}
                        <div className="flex items-center space-x-1">
                          {[
                            { name: 'Request', active: true },
                            { name: 'Assign', active: req.status !== 'pending' },
                            { name: 'Verify', active: req.status === 'verified' || req.status === 'approved' },
                            { name: 'Approve', active: req.status === 'approved' }
                          ].map((node, i) => (
                            <React.Fragment key={i}>
                              <div className="flex flex-col items-center">
                                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[7px] font-black ${
                                  node.active ? 'bg-[#86FFD3]/20 border-[#86FFD3] text-[#86FFD3]' : 'bg-slate-950 border-slate-800 text-slate-600'
                                }`}>
                                  {i + 1}
                                </div>
                                <span className="text-[6px] font-bold mt-1 text-slate-600 uppercase tracking-tighter">{node.name}</span>
                              </div>
                              {i < 3 && (
                                <div className={`w-4 h-0.5 mb-2.5 ${
                                  node.active ? 'bg-[#86FFD3]' : 'bg-slate-800'
                                }`}></div>
                              )}
                            </React.Fragment>
                          ))}
                        </div>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section: Notifications & Safety Messages */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel rounded-2xl border border-slate-900 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
                <Bell className="h-4 w-4 mr-2 text-[#7CEEFF] animate-pulse" />
                Safety Feeds
              </h2>
            </div>
            
            <div className="space-y-4">
              {[
                { text: 'Your permit EXC-3001 is queued for physical patrol check', time: '10:45 AM', color: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' },
                { text: 'Encroachment scan detected excavators near Panipat zone', time: '09:30 AM', color: 'bg-red-500 shadow-[0_0_8px_#ef4444]' },
                { text: 'Permit EXC-3002 fully verified and approved', time: 'Yesterday', color: 'bg-emerald-500 shadow-[0_0_8px_#10b981]' },
              ].map((n, idx) => (
                <div key={idx} className="flex items-start space-x-3.5 border-b border-slate-900 pb-4 last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full ${n.color} mt-1.5 shrink-0`}></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-300 leading-normal uppercase tracking-wide">{n.text}</p>
                    <p className="text-[8px] text-slate-500 font-bold mt-1.5 uppercase tracking-widest flex items-center">
                      <Clock className="h-3 w-3 mr-1.5 text-slate-700" />
                      {n.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-slate-900 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-[#86FFD3]" />
                Command Communications
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3.5 p-3 rounded-xl bg-black/40 border border-slate-900 cursor-pointer hover:border-slate-800 transition">
                <div className="w-8 h-8 rounded-lg bg-[#7CEEFF]/10 border border-[#7CEEFF]/20 text-[#7CEEFF] flex items-center justify-center text-[9px] font-black shadow-inner">AD</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-white uppercase tracking-wide">IOCL Admin Unit</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7CEEFF] animate-pulse shadow-[0_0_5px_#7CEEFF]"></span>
                  </div>
                  <p className="text-[8px] text-slate-500 font-bold mt-1 truncate uppercase">Regarding safety protocol for excavation route EXC-3001...</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </motion.div>
    </DashboardLayout>
  );
};

export default ContractorDashboard;
