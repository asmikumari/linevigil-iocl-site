import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { excavationService, pipelineService } from '../services/api';
import Map from '../components/Map';
import DashboardLayout from '../components/DashboardLayout';
import { motion } from 'framer-motion';
import { 
  Map as MapIcon, 
  Radar, 
  Activity, 
  MapPin, 
  AlertTriangle,
  Info,
  Clock
} from 'lucide-react';

const ContractorMap = () => {
  const { user } = useAuth();
  const [pipelines, setPipelines] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showBufferZones, setShowBufferZones] = useState(true);
  
  // Proximity Radar State
  const [collisionInfo, setCollisionInfo] = useState(null);
  const [checkingCollision, setCheckingCollision] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Recalculate proximity when map coordinate is clicked
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
      console.warn('Backend link down. Operating in standalone client-side Contractor Map fallback mode.', err);
      
      setPipelines({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { id: 1, name: 'IOCL-PL-01 (Mathura-Jalandhar)', type: 'product' }, geometry: { type: 'LineString', coordinates: [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50], [76.50, 31.00]] } },
          { type: 'Feature', properties: { id: 2, name: 'IOCL-PL-02 (Koyali-Sanganer)', type: 'crude' }, geometry: { type: 'LineString', coordinates: [[73.18, 22.30], [73.50, 23.50], [74.50, 25.50], [75.80, 26.90]] } },
          { type: 'Feature', properties: { id: 3, name: 'IOCL-PL-03 (Paradip-Haldia)', type: 'gas' }, geometry: { type: 'LineString', coordinates: [[86.67, 20.27], [87.50, 21.50], [88.20, 22.50]] } }
        ]
      });

      setMyRequests([
        { id: 1, contractor_name: user?.name || 'Contractor User', company_name: 'Buildwell Ltd.', work_date: '2026-06-12', purpose: 'Road Construction', status: 'pending', risk_level: 'high', distance_to_pipeline: 120.5, lat: 28.58, lng: 77.12 },
        { id: 2, contractor_name: user?.name || 'Contractor User', company_name: 'Buildwell Ltd.', work_date: '2026-06-15', purpose: 'Sewer Line', status: 'verified', risk_level: 'medium', distance_to_pipeline: 450.0, lat: 28.50, lng: 77.50 }
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

  return (
    <DashboardLayout title="PIPELINE GIS NETWORK">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full h-[calc(100vh-160px)] relative glass-panel rounded-2xl border border-[#7CEEFF]/10 overflow-hidden"
      >
        
        {/* Full-width Map Container */}
        <div className="w-full h-full relative bg-black">
          <Map 
            pipelines={pipelines} 
            requests={myRequests} 
            onLocationSelect={setSelectedLocation} 
            selectedLocation={selectedLocation}
            showBufferZones={showBufferZones}
          />
        </div>

        {/* Floating HUD Control Overlay */}
        <div className="absolute top-6 left-6 z-[1000] w-80 glass-panel border border-[#7CEEFF]/20 rounded-xl p-5 bg-black/85 backdrop-blur-md shadow-2xl pointer-events-auto">
          
          {/* Header */}
          <div className="flex items-center space-x-2 border-b border-slate-900 pb-3 mb-4">
            <MapIcon className="h-4 w-4 text-[#7CEEFF] animate-pulse" />
            <h2 className="font-black text-white text-[10px] uppercase tracking-widest leading-none">GIS Navigation Center</h2>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            
            {/* Buffer Corridors Toggle */}
            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-black/40 border border-slate-900 p-2.5 rounded-lg">
              <span>Show Buffer Rings</span>
              <button 
                onClick={() => setShowBufferZones(!showBufferZones)}
                className={`px-2.5 py-1 rounded border transition-all text-[8px] font-black ${
                  showBufferZones ? 'border-[#7CEEFF]/30 text-white bg-[#7CEEFF]/15' : 'border-slate-800 text-slate-500 bg-transparent'
                }`}
              >
                {showBufferZones ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Pipeline Legend */}
            <div className="bg-black/40 border border-slate-900 p-3 rounded-lg space-y-2">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Asset Legend</span>
              <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-[#F37021] mr-1.5 shadow-[0_0_6px_#F37021]"></span> Crude PL</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-[#7CEEFF] mr-1.5 shadow-[0_0_6px_#7CEEFF]"></span> Product PL</span>
                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-[#86FFD3] mr-1.5 shadow-[0_0_6px_#86FFD3]"></span> Gas PL</span>
              </div>
            </div>

            {/* Proximity Radar read-out */}
            <div className="border-t border-slate-900 pt-3">
              <h3 className="font-black text-white text-[9px] uppercase tracking-widest mb-3 flex items-center">
                <Radar className="h-3.5 w-3.5 mr-1.5 text-[#F37021] animate-pulse" />
                Proximity Telemetry
              </h3>

              {checkingCollision ? (
                <div className="py-6 flex flex-col items-center justify-center space-y-2">
                  <Activity className="h-4.5 w-4.5 text-[#7CEEFF] animate-pulse" />
                  <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Calculating coordinates...</span>
                </div>
              ) : collisionInfo ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                  
                  <div className={`p-3 rounded-lg border flex justify-between items-center ${
                    collisionInfo.collisionStatus === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    collisionInfo.collisionStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    <div>
                      <span className="text-[7px] font-black uppercase tracking-widest block">HAZARD:</span>
                      <span className="text-[11px] font-black uppercase tracking-wider block">{collisionInfo.collisionStatus}</span>
                    </div>
                    <span className="text-[8px] font-black bg-black/60 border border-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
                      {Math.round(collisionInfo.distanceToPipeline)}M
                    </span>
                  </div>

                  <div className="space-y-1.5 text-[8px] font-bold text-slate-400 bg-black/60 border border-slate-900 p-3 rounded-lg">
                    <div className="flex justify-between"><span>COORDS:</span> <span className="text-white">{selectedLocation.lat.toFixed(4)}N, {selectedLocation.lng.toFixed(4)}E</span></div>
                    <div className="flex justify-between"><span>CLOSEST:</span> <span className="text-white uppercase truncate max-w-[110px]">{collisionInfo.pipelineName}</span></div>
                    <div className="flex justify-between"><span>RISK VALUE:</span> <span className={`font-black ${
                      collisionInfo.riskLevel === 'high' ? 'text-red-400' :
                      collisionInfo.riskLevel === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{collisionInfo.riskLevel.toUpperCase()}</span></div>
                  </div>
                  
                </div>
              ) : (
                <div className="p-3 bg-black/40 border border-slate-900 rounded-lg text-center text-slate-600 text-[8px] font-bold uppercase tracking-widest leading-normal">
                  Click on any map coordinate to measure safety zones and buffer clearances.
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider flex items-start space-x-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
              <Info className="h-3.5 w-3.5 text-slate-600 shrink-0 mt-0.5" />
              <span>Markers on map display your existing submitted excavation permits. Click them to inspect details.</span>
            </div>

          </div>

        </div>

      </motion.div>
    </DashboardLayout>
  );
};

export default ContractorMap;
