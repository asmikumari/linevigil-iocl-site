import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { excavationService, pipelineService, patrolService, imageryService, cgdService } from '../services/api';
import Map from '../components/Map';
import DashboardLayout from '../components/DashboardLayout';
import { 
  Users, 
  Map as MapIcon, 
  FileText, 
  AlertTriangle, 
  Radar, 
  Activity, 
  CheckCircle2, 
  Plus, 
  Settings, 
  Bell, 
  Layers,
  MapPin,
  RefreshCw,
  Cpu,
  BarChart,
  ClipboardList,
  Radio,
  Trash2,
  Lock,
  Compass,
  Zap,
  Sliders,
  CheckCircle,
  MessageSquare,
  Send
} from 'lucide-react';
import io from 'socket.io-client';

const MOCK_CGD_DATA = [
  { id: 1, name: 'Delhi NCR GA', operator: 'IGL', status: 'normal', target_km: 120, achieved_km: 98 },
  { id: 2, name: 'Haryana GA', operator: 'Adani Gas', status: 'critical', target_km: 80, achieved_km: 45 }
];

const AdminDashboard = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const socketRef = useRef(null);
  const [pipelines, setPipelines] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [patrolUsers, setPatrolUsers] = useState([]);
  const [imageryDetections, setImageryDetections] = useState([]);
  const [patrolTracks, setPatrolTracks] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');
  const [showBufferZones, setShowBufferZones] = useState(true);
  const [verificationLogs, setVerificationLogs] = useState([]);

  // CGD GA Telemetry States
  const [cgdGAs, setCgdGAs] = useState([]);
  const [selectedGA, setSelectedGA] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [cgdSearch, setCgdSearch] = useState('');
  const [cgdEntityFilter, setCgdEntityFilter] = useState('ALL');

  // Form toggles and states
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('patrol');

  const [pipelineFormOpen, setPipelineFormOpen] = useState(false);
  const [newPipeName, setNewPipeName] = useState('');
  const [newPipeType, setNewPipeType] = useState('product');

  // Settings
  const [settings, setSettings] = useState({
    satelliteSweepInterval: 15,
    gpsHeartbeatRate: 5,
    enableEmailAlerts: true,
    enableSMSAlerts: false,
    logRetentionDays: 90
  });

  // Live Demonstration Simulation States & Handlers
  const [isSimulatingPatrol, setIsSimulatingPatrol] = useState(false);
  const [simIndex, setSimIndex] = useState(0);

  const simulatePatrolMovement = () => {
    if (isSimulatingPatrol) {
      setIsSimulatingPatrol(false);
      return;
    }
    setIsSimulatingPatrol(true);
    setSimIndex(0);
  };

  useEffect(() => {
    let interval;
    if (isSimulatingPatrol) {
      const patrolRouteCoords1 = [
        [27.4924, 77.6737],
        [28.0000, 77.5800],
        [28.3000, 77.5200],
        [28.5000, 77.5000],
        [28.9845, 77.7064],
        [29.4727, 77.7085]
      ];
      const patrolRouteCoords2 = [
        [28.6300, 77.2200],
        [28.5800, 77.1200],
        [28.5200, 77.0500],
        [28.4500, 76.9800],
        [28.3800, 76.9200],
        [28.3000, 76.8500]
      ];
      interval = setInterval(() => {
        setSimIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % patrolRouteCoords1.length;
          const [lat1, lng1] = patrolRouteCoords1[nextIndex];
          const [lat2, lng2] = patrolRouteCoords2[nextIndex % patrolRouteCoords2.length];
          
          setPatrolTracks(prev => [
            {
              id: 1,
              patrol_id: 2,
              lat: lat1,
              lng: lng1,
              is_offline: false,
              battery_level: 95 - nextIndex * 2,
              signal_strength: nextIndex % 2 === 0 ? 'excellent' : 'good',
              recorded_at: new Date()
            },
            {
              id: 2,
              patrol_id: 4,
              lat: lat2,
              lng: lng2,
              is_offline: false,
              battery_level: 88 - nextIndex * 3,
              signal_strength: nextIndex % 3 === 0 ? 'excellent' : 'good',
              recorded_at: new Date()
            },
            ...prev.filter(t => t.id !== 1 && t.id !== 2)
          ]);
          setMapCenter([lat1, lng1]);
          return nextIndex;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isSimulatingPatrol]);


  const simulateDroneThreat = () => {
    const mockThreat = {
      id: Date.now(),
      name: 'CAT-320 Heavy Excavator (Simulated)',
      confidence: 0.94,
      risk_level: 'high',
      lat: 28.58,
      lng: 77.12,
      detected_at: new Date()
    };
    setImageryDetections(prev => [mockThreat, ...prev]);
    setMapCenter([28.58, 77.12]);
  };


  // Admin Chat states (Seperate interactions for Contractor and Patrol Officer)
  const [chatCategory, setChatCategory] = useState('contractors'); // 'contractors' or 'patrol'
  const [contractorContacts, setContractorContacts] = useState([
    { id: 101, name: 'Contractor ABC Infra', initials: 'AI', role: 'Road Construction (EXC-1001)', online: true, unread: true },
    { id: 102, name: 'Contractor KMC Projects', initials: 'KP', role: 'Sewer Line (EXC-1002)', online: true, unread: false }
  ]);
  const [patrolContacts, setPatrolContacts] = useState([
    { id: 201, name: 'Patrol Officer 1', initials: 'P1', role: 'Field Patrol Unit 1', online: true, unread: false },
    { id: 202, name: 'Patrol Officer 2', initials: 'P2', role: 'Field Patrol Unit 2', online: true, unread: true }
  ]);
  const [activeAdminContact, setActiveAdminContact] = useState({ id: 101, name: 'Contractor ABC Infra', initials: 'AI', role: 'Road Construction (EXC-1001)', online: true, unread: true });
  const [adminConversations, setAdminConversations] = useState({
    101: [
      { id: 1, sender: 'AI', text: 'REQUESTING CLEARANCE CONFIRMATION FOR THE ROAD EXCAVATION SEGMENT.', time: '11:00 AM', system: false },
      { id: 2, sender: 'me', text: 'STAND BY. SATELLITE IMAGE ANALYSIS AND FIELD INSPECTOR MATCH REQUIRED.', time: '11:05 AM', system: false }
    ],
    102: [
      { id: 1, sender: 'KP', text: 'Sewer line markers have been set at coordinates. Ready for check in.', time: '11:20 AM', system: false }
    ],
    201: [
      { id: 1, sender: 'P1', text: 'I AM APPROACHING THE SEWER EXCAVATION SITE FOR PERMIT EXC-1002.', time: '11:30 AM', system: false },
      { id: 2, sender: 'me', text: 'CONFIRMED. LOG SITE CHECK-IN AND VERIFY PIPELINE BUFFER DEPTH CONSTRAINTS.', time: '11:32 AM', system: false }
    ],
    202: [
      { id: 1, sender: 'P2', text: 'Standby telemetry channel linked. Standing by for instructions.', time: '10:45 AM', system: false }
    ]
  });
  const [adminChatInput, setAdminChatInput] = useState('');

  // Admin Notifications Log
  const [adminNotifications, setAdminNotifications] = useState([
    { id: 1, type: 'critical', text: 'JCB Earthmover proximity violation detected at Delhi Sector 2 Corridor.', time: 'Just now' },
    { id: 2, type: 'info', text: 'Patrol Officer 1 checked in to Sewer Line excavation permit EXC-1002.', time: '12 mins ago' },
    { id: 3, type: 'warning', text: 'GPS Telemetry sync heartbeat delay on Patrol Officer 2 transmitter.', time: '45 mins ago' }
  ]);

  useEffect(() => {
    loadData();

    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001');
    socketRef.current = socket;
    
    socket.on('new-anomalies', (newAnoms) => {
      setImageryDetections(prev => [...newAnoms, ...prev]);
    });

    socket.on('patrol-collision-alerts', (newAlerts) => {
      alert(`⚠️ REAL-TIME HUD ALERT:\n${newAlerts[0].message}`);
      loadData();
    });

    socket.on('receive-message', (msg) => {
      if (msg.receiverId === 1) { // Msg is for Admin
        const senderContactId = msg.senderId === 2 ? 201 : msg.senderId === 4 ? 202 : null;
        if (senderContactId) {
          setAdminConversations(prev => ({
            ...prev,
            [senderContactId]: [...(prev[senderContactId] || []), {
              id: msg.id,
              sender: msg.sender,
              text: msg.text,
              time: msg.time,
              system: msg.system
            }]
          }));
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadData = async () => {
    try {
      const [pipeRes, reqRes, patrolRes, imgRes, trackRes, cgdRes, verifRes] = await Promise.all([
        pipelineService.getAll(),
        excavationService.getAll(),
        patrolService.getUsers(),
        imageryService.getDetections(),
        patrolService.getTracks(),
        cgdService.getTelemetry(),
        patrolService.getVerifications()
      ]);
      setPipelines(pipeRes.data);
      setAllRequests(reqRes.data);
      setPatrolUsers(patrolRes.data);
      setImageryDetections(imgRes.data);
      setPatrolTracks(trackRes.data);
      setCgdGAs(cgdRes.data);
      setVerificationLogs(verifRes.data);
    } catch (err) {
      console.warn('Backend link down. Operating in standalone client-side GIS fallback mode.', err);
      
      setPipelines({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { id: 1, name: 'IOCL-PL-01 (Mathura-Jalandhar)', type: 'product' }, geometry: { type: 'LineString', coordinates: [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50], [76.50, 31.00]] } },
          { type: 'Feature', properties: { id: 2, name: 'IOCL-PL-02 (Koyali-Sanganer)', type: 'crude' }, geometry: { type: 'LineString', coordinates: [[73.18, 22.30], [73.50, 23.50], [74.50, 25.50], [75.80, 26.90]] } },
          { type: 'Feature', properties: { id: 3, name: 'IOCL-PL-03 (Paradip-Haldia)', type: 'gas' }, geometry: { type: 'LineString', coordinates: [[86.67, 20.27], [87.50, 21.50], [88.20, 22.50]] } }
        ]
      });

      setAllRequests([
        { id: 1, contractor_name: 'ABC Infra', company_name: 'Buildwell Ltd.', work_date: '2026-06-12', purpose: 'Road Construction', status: 'pending', risk_level: 'high', distance_to_pipeline: 120.5, lat: 28.58, lng: 77.12, assigned_to: null, checked_in: false, check_in_time: null },
        { id: 2, contractor_name: 'KMC Projects', company_name: 'KMC Infra', work_date: '2026-06-11', purpose: 'Sewer Line', status: 'assigned', risk_level: 'medium', distance_to_pipeline: 650.2, lat: 28.50, lng: 77.40, assigned_to: 2, checked_in: true, check_in_time: new Date().toISOString() },
        { id: 3, contractor_name: 'KMC Projects', company_name: 'Delhi Roads', work_date: '2026-06-14', purpose: 'Water Pipeline', status: 'assigned', risk_level: 'high', distance_to_pipeline: 250.0, lat: 28.60, lng: 77.20, assigned_to: 4, checked_in: false, check_in_time: null }
      ]);

      setPatrolUsers([
        { id: 2, name: 'Patrol Officer 1', email: 'patrol@linevigil.com' },
        { id: 4, name: 'Patrol Officer 2', email: 'patrol2@linevigil.com' }
      ]);

      setImageryDetections([
        { id: 1, name: 'CAT-320 Heavy Excavator', confidence: 0.94, risk_level: 'high', lat: 28.62, lng: 77.15, detected_at: new Date().toISOString() },
        { id: 2, name: 'Soil Displacement Anomaly', confidence: 0.81, risk_level: 'medium', lat: 28.50, lng: 77.40, detected_at: new Date().toISOString() },
        { id: 3, name: 'Unauthorized Backhoe Loader', confidence: 0.88, risk_level: 'high', lat: 28.95, lng: 77.40, detected_at: new Date().toISOString() }
      ]);

      setPatrolTracks([
        { id: 1, patrol_id: 2, lat: 28.50, lng: 77.50, is_offline: false, battery_level: 85, signal_strength: 'excellent', recorded_at: new Date().toISOString() }
      ]);

      setVerificationLogs([
        { id: 1, request_id: 2, patrol_id: 2, photo_url: 'https://via.placeholder.com/300', notes: 'Clear area, markers visible.', verified_at: new Date().toISOString() }
      ]);

      setCgdGAs(MOCK_CGD_DATA);
    }
  };

  const handleAssign = async (requestId, patrolId) => {
    try {
      await patrolService.assign({ requestId, patrolId });
      loadData();
    } catch (err) {
      console.warn('Backend assign failed, updating locally');
      setAllRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'assigned', assigned_to: parseInt(patrolId) } : r));
    }
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    const newUser = {
      id: Date.now(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole
    };
    setPatrolUsers(prev => [...prev, newUser]);
    setNewUserName('');
    setNewUserEmail('');
    setUserFormOpen(false);
    alert('User added successfully (Local Simulation Mode).');
  };

  const handleAddPipeline = (e) => {
    e.preventDefault();
    const newFeature = {
      type: 'Feature',
      properties: { id: Date.now(), name: newPipeName, type: newPipeType },
      geometry: { type: 'LineString', coordinates: [[77.10, 28.30], [77.50, 28.80]] }
    };
    setPipelines(prev => ({
      ...prev,
      features: [...prev.features, newFeature]
    }));
    setNewPipeName('');
    setPipelineFormOpen(false);
    alert('Pipeline alignment mapped successfully (Local Simulation Mode).');
  };

  const triggerSatelliteScan = async () => {
    setIsScanning(true);
    setScanMessage('Calibrating radar coordinates...');
    try {
      const bounds = {
        minLng: 77.0,
        minLat: 27.0,
        maxLng: 77.9,
        maxLat: 29.5
      };
      await imageryService.triggerScan(bounds);
      setTimeout(async () => {
        setIsScanning(false);
        setScanMessage('');
        await loadData();
      }, 2500);
    } catch (err) {
      console.warn('Backend scan failed. Simulating satellite detection locally.', err);
      setTimeout(() => {
        setIsScanning(false);
        setScanMessage('');
        const lat = 28.50 + Math.random() * 0.7;
        const lng = 77.20 + Math.random() * 0.5;
        const names = ['CAT-345 Heavy Earthmover', 'Unauthorized Trench Excavation', 'Soil Displacement Alert'];
        const name = names[Math.floor(Math.random() * names.length)];
        const localDetection = {
          id: Date.now(),
          name,
          confidence: parseFloat((0.82 + Math.random() * 0.15).toFixed(2)),
          risk_level: 'high',
          lat,
          lng,
          detected_at: new Date().toISOString()
        };
        setImageryDetections(prev => [localDetection, ...prev]);
      }, 2500);
    }
  };

  const handleAdminChatSend = (e) => {
    e.preventDefault();
    if (!adminChatInput.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now(),
      sender: 'me',
      text: adminChatInput.trim().toUpperCase(),
      time: timestamp,
      system: false
    };

    setAdminConversations(prev => ({
      ...prev,
      [activeAdminContact.id]: [...(prev[activeAdminContact.id] || []), userMsg]
    }));

    setAdminChatInput('');

    // Emit live WebSocket message for Patrol Officers
    if (chatCategory === 'patrol') {
      const receiverId = activeAdminContact.id === 201 ? 2 : activeAdminContact.id === 202 ? 4 : null;
      if (receiverId && socketRef.current) {
        socketRef.current.emit('send-message', {
          id: Date.now(),
          senderId: 1, // Admin
          receiverId,
          sender: 'CB',
          text: userMsg.text,
          time: timestamp,
          system: false
        });
      }
    } else {
      // Simulate reply from Contractor (since contractors are static in this dashboard)
      setTimeout(() => {
        let replyText = 'ROGER. SECURE DATA LINK STABLE.';
        if (activeAdminContact.id === 101) {
          replyText = 'ABC INFRA CO: ALL GRADING MARKERS ARE VERIFIED CLEAR OF CORE ALIGNMENT.';
        } else {
          replyText = 'KMC PROJECTS: SOIL AND ANOMALY SENSORS IN PLACE. AWAITING PATROL SIGN-OFF.';
        }

        const replyMsg = {
          id: Date.now() + 1,
          sender: activeAdminContact.initials,
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          system: false
        };

        setAdminConversations(prev => ({
          ...prev,
          [activeAdminContact.id]: [...(prev[activeAdminContact.id] || []), replyMsg]
        }));
      }, 1500);
    }
  };

  const renderUsers = () => {
    return (
      <div className="space-y-6 w-full animate-in fade-in duration-300">
        <div className="flex justify-between items-center bg-black/20 p-4 border border-slate-900 rounded-2xl">
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-widest">Active System Operators</h2>
            <p className="text-[8px] text-slate-500 uppercase mt-0.5">Manage permissions and credentials of patrol units</p>
          </div>
          <button 
            onClick={() => setUserFormOpen(!userFormOpen)}
            className="bg-[#F37021]/15 hover:bg-[#F37021]/25 border border-[#F37021]/30 text-[#F37021] px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition"
          >
            Create New Operator
          </button>
        </div>

        {userFormOpen && (
          <div className="glass-panel p-6 rounded-2xl border border-[#F37021]/30 bg-black/40 max-w-md animate-in slide-in-from-top duration-300">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Create System operator</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Operator Name</label>
                <input required type="text" className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#F37021]/40 outline-none text-white uppercase placeholder:text-slate-700" placeholder="e.g. PATROL OFFICER 3" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Email Address</label>
                <input required type="email" className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#F37021]/40 outline-none text-white placeholder:text-slate-700" placeholder="patrol3@linevigil.com" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Access Role</label>
                <select className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#F37021]/40 outline-none text-white cursor-pointer" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                  <option value="patrol">PATROL OFFICER - FIELD APP CONTROL</option>
                  <option value="admin">SYSTEM ADMINISTRATOR - COMMAND CENTER</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-[#F37021] text-white font-black py-3 rounded-xl text-[9px] uppercase tracking-widest hover:bg-[#d95d16] transition">
                Register Operator
              </button>
            </form>
          </div>
        )}

        <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                <th className="px-6 py-4">OPERATOR ID</th>
                <th className="px-6 py-4">NAME</th>
                <th className="px-6 py-4">EMAIL</th>
                <th className="px-6 py-4">ROLE</th>
                <th className="px-6 py-4">TRANSMITTER LINK</th>
                <th className="px-6 py-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {patrolUsers.map(user => (
                <tr key={user.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4 font-black text-[#F37021]">OP-{user.id}</td>
                  <td className="px-6 py-4 font-black text-white uppercase">{user.name}</td>
                  <td className="px-6 py-4 font-bold">{user.email || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[#7CEEFF] border border-blue-500/20 font-black uppercase text-[8px]">
                      {user.role || 'patrol'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-400">SYNCED</td>
                  <td className="px-6 py-4">
                    <button className="text-red-400 hover:text-red-300 transition text-[9px] font-black uppercase tracking-wider flex items-center">
                      <Lock className="h-3 w-3 mr-1" /> Revoke Access
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPipelines = () => {
    return (
      <div className="space-y-6 w-full animate-in fade-in duration-300">
        <div className="flex justify-between items-center bg-black/20 p-4 border border-slate-900 rounded-2xl">
          <div>
            <h2 className="text-xs font-black text-white uppercase tracking-widest">Pipeline Alignments & Geofencing</h2>
            <p className="text-[8px] text-slate-500 uppercase mt-0.5">Configure spatial buffer zone overlays</p>
          </div>
          <button 
            onClick={() => setPipelineFormOpen(!pipelineFormOpen)}
            className="bg-[#F37021]/15 hover:bg-[#F37021]/25 border border-[#F37021]/30 text-[#F37021] px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition"
          >
            Add Pipeline Section
          </button>
        </div>

        {pipelineFormOpen && (
          <div className="glass-panel p-6 rounded-2xl border border-[#F37021]/30 bg-black/40 max-w-md animate-in slide-in-from-top duration-300">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Add Pipeline alignment</h3>
            <form onSubmit={handleAddPipeline} className="space-y-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pipeline Segment Label</label>
                <input required type="text" className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#F37021]/40 outline-none text-white uppercase placeholder:text-slate-700" placeholder="e.g. IOCL-PL-04 (Dadri-Panipat)" value={newPipeName} onChange={e => setNewPipeName(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Fluid Type</label>
                <select className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#F37021]/40 outline-none text-white cursor-pointer" value={newPipeType} onChange={e => setNewPipeType(e.target.value)}>
                  <option value="product">PRODUCT LINE (HIGH PRESSURE)</option>
                  <option value="gas">NATURAL GAS (CRITICAL CORRIDOR)</option>
                  <option value="crude">CRUDE OIL (ROW SENSOR ENABLED)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-[#F37021] text-white font-black py-3 rounded-xl text-[9px] uppercase tracking-widest hover:bg-[#d95d16] transition">
                Map segment alignment
              </button>
            </form>
          </div>
        )}

        <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                <th className="px-6 py-4">SEGMENT ID</th>
                <th className="px-6 py-4">ROUTE NAME</th>
                <th className="px-6 py-4">FLUID TYPE</th>
                <th className="px-6 py-4">BUFFER RANGE</th>
                <th className="px-6 py-4">GPS CORRIDORS</th>
                <th className="px-6 py-4">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {pipelines && pipelines.features ? pipelines.features.map(p => (
                <tr key={p.properties.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4 font-black text-[#F37021]">SEG-{p.properties.id}</td>
                  <td className="px-6 py-4 font-black text-white uppercase">{p.properties.name}</td>
                  <td className="px-6 py-4 font-bold uppercase text-[#7CEEFF]">{p.properties.type}</td>
                  <td className="px-6 py-4 font-bold">500 METERS</td>
                  <td className="px-6 py-4 font-bold">ACTIVE OVERLAY</td>
                  <td className="px-6 py-4 text-emerald-400 font-bold uppercase">MONITORED</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500 uppercase font-black">
                    No pipelines loaded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderRequests = () => {
    return (
      <div className="space-y-6 w-full animate-in fade-in duration-300">
        <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-900 bg-black/20 flex justify-between items-center">
            <h2 className="font-black text-white text-xs uppercase tracking-widest">Excavation Permit Permits Control</h2>
            <span className="text-[8px] font-black text-slate-500 uppercase">Manage active and pending excavation zones</span>
          </div>

          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                <th className="px-6 py-4">PERMIT REFERENCE</th>
                <th className="px-6 py-4">CONTRACTOR</th>
                <th className="px-6 py-4">RISK THREAT</th>
                <th className="px-6 py-4">BUFFER PROXIMITY</th>
                <th className="px-6 py-4">DEPLOYED UNIT</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4">DISPATCH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {allRequests.map(req => {
                const assignedPatrol = patrolUsers.find(p => p.id === req.assigned_to);
                return (
                  <tr key={req.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 font-black text-[#F37021]">EXC-{1000 + req.id}</td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-black text-white uppercase tracking-wider">{req.contractor_name}</p>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">{req.company_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase tracking-widest ${
                        req.risk_level === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {req.risk_level} RISK
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-300">{req.distance_to_pipeline?.toFixed(1) || 120}m FROM Centerline</td>
                    <td className="px-6 py-4 font-bold uppercase text-[9px]">
                      {assignedPatrol ? assignedPatrol.name : <span className="text-slate-500">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase tracking-widest ${
                        req.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        req.status === 'Safe to Dig' || req.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        'bg-blue-500/10 text-[#7CEEFF] border-blue-500/20'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        className="text-[9px] font-black bg-black border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#F37021]/30 transition-all hover:border-[#F37021]/30 text-slate-300 uppercase cursor-pointer"
                        value={req.assigned_to || ""}
                        onChange={(e) => handleAssign(req.id, e.target.value)}
                      >
                        <option value="" disabled>DEPLOY PATROL UNIT</option>
                        {patrolUsers.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderIncidents = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-in fade-in duration-300">
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-slate-900 overflow-hidden">
          <div className="p-5 border-b border-slate-900 bg-black/20 flex justify-between items-center">
            <h2 className="font-black text-white text-xs uppercase tracking-widest">Active Incident Threats feed</h2>
            <span className="text-[8px] font-black text-slate-500 uppercase">satellite anomaly & ROW encroachments logs</span>
          </div>

          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                <th className="px-6 py-4">THREAT ID</th>
                <th className="px-6 py-4">THREAT TYPE</th>
                <th className="px-6 py-4">SEVERITY</th>
                <th className="px-6 py-4">CONFIDENCE</th>
                <th className="px-6 py-4">COORDINATES</th>
                <th className="px-6 py-4">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {imageryDetections.map(det => (
                <tr key={det.id} className="hover:bg-white/5 transition">
                  <td className="px-6 py-4 font-black text-[#F37021]">INC-{det.id}</td>
                  <td className="px-6 py-4 font-black text-white uppercase">{det.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                      det.risk_level === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {det.risk_level}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-400">{((det.confidence || 0.9) * 100).toFixed(0)}%</td>
                  <td className="px-6 py-4 text-[9px] font-bold text-[#7CEEFF]">{det.lat?.toFixed(4)}N, {det.lng?.toFixed(4)}E</td>
                  <td className="px-6 py-4">
                    <button className="bg-[#F37021]/15 hover:bg-[#F37021]/25 border border-[#F37021]/30 text-[#F37021] px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition">
                      Acknowledge Anomaly
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-4 h-[450px] rounded-2xl border border-slate-900 overflow-hidden relative">
          <Map 
            pipelines={pipelines} 
            requests={[]} 
            tracks={[]}
            imageryDetections={imageryDetections}
            showBufferZones={true}
          />
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    return (
      <div className="space-y-6 w-full animate-in fade-in duration-300">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-900 bg-black/40 space-y-2">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">SATELLITE SCANS CONDUCTED</p>
            <p className="text-3xl font-black text-white tracking-tighter">148 SWEEPS</p>
            <span className="text-[8px] font-bold text-[#86FFD3] uppercase tracking-wider block">+12.5% INCREMENTAL MONTHLY</span>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-900 bg-black/40 space-y-2">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Compliance Rate (Buffer zone)</p>
            <p className="text-3xl font-black text-white tracking-tighter">98.42%</p>
            <span className="text-[8px] font-bold text-[#86FFD3] uppercase tracking-wider block">WITHIN IOCL TOLERANCE</span>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-900 bg-black/40 space-y-2">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">PATROL DISPATCH LATENCY</p>
            <p className="text-3xl font-black text-white tracking-tighter">12.4 MINS</p>
            <span className="text-[8px] font-bold text-[#7CEEFF] uppercase tracking-wider block">AVG RESPONSE TIME</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-[#F37021]/15 p-6 space-y-4">
          <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center">
            <Zap className="h-4 w-4 mr-2 text-[#F37021]" />
            Monthly Threat Mitigation Performance
          </h2>
          <div className="h-48 w-full bg-black/20 rounded border border-slate-900 p-2 flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-end justify-between p-8 space-x-4">
              <div className="w-full bg-slate-900 h-1/3 rounded-t-lg relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-500">APR</span></div>
              <div className="w-full bg-slate-900 h-2/3 rounded-t-lg relative"><span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-500">MAY</span></div>
              <div className="w-full bg-[#F37021]/40 h-full rounded-t-lg border-t border-[#F37021] relative">
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black text-white">JUN</span>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black text-white">98%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    return (
      <div className="glass-panel rounded-2xl border border-slate-900 p-6 w-full space-y-4 animate-in fade-in duration-300">
        <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
          <Bell className="h-4 w-4 mr-2 text-[#F37021]" />
          System Messages & Command Dispatch Log
        </h2>

        <div className="space-y-3">
          {adminNotifications.map(notif => (
            <div key={notif.id} className="p-4 rounded-xl border border-slate-900 bg-black/40 flex items-start justify-between hover:border-slate-800 transition">
              <div className="flex space-x-3 items-start">
                <div className={`p-2 rounded-lg border ${
                  notif.type === 'critical' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                  notif.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                  'bg-blue-500/10 border-blue-500/20 text-[#7CEEFF]'
                }`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-300 uppercase leading-snug">{notif.text}</p>
                  <span className="text-[8px] text-slate-500 font-bold block mt-1.5">{notif.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="glass-panel rounded-2xl border border-slate-900 p-6 w-full max-w-2xl animate-in fade-in duration-300">
        <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center border-b border-slate-900 pb-3">
          <Sliders className="h-4 w-4 mr-2 text-[#F37021]" />
          Command HUD System Settings
        </h2>

        <form className="space-y-6 text-[10px] uppercase font-black tracking-widest text-slate-400" onSubmit={e => { e.preventDefault(); alert('Settings saved successfully.'); }}>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>SATELLITE IMAGERY SCAN OVERLAP:</span>
              <span className="text-white">{settings.satelliteSweepInterval} MINUTES</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="60" 
              className="w-full accent-[#F37021] bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
              value={settings.satelliteSweepInterval}
              onChange={e => setSettings(prev => ({ ...prev, satelliteSweepInterval: parseInt(e.target.value) }))}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>GPS TRANSMITTER HEARTBEAT CYCLE:</span>
              <span className="text-white">{settings.gpsHeartbeatRate} SECONDS</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="15" 
              className="w-full accent-[#F37021] bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
              value={settings.gpsHeartbeatRate}
              onChange={e => setSettings(prev => ({ ...prev, gpsHeartbeatRate: parseInt(e.target.value) }))}
            />
          </div>

          <div className="space-y-4 border-t border-slate-900 pt-4">
            <label className="flex items-center space-x-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={settings.enableEmailAlerts}
                onChange={e => setSettings(prev => ({ ...prev, enableEmailAlerts: e.target.checked }))}
                className="rounded bg-black border-slate-900 text-[#F37021] focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span>ENABLE DISPATCH THREAT ALERTS EMAIL INSTANT TRANSMISSION</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={settings.enableSMSAlerts}
                onChange={e => setSettings(prev => ({ ...prev, enableSMSAlerts: e.target.checked }))}
                className="rounded bg-black border-slate-900 text-[#F37021] focus:ring-0 focus:ring-offset-0 h-4 w-4" 
              />
              <span>ENABLE SMS GATEWAY CELLULAR TELEMETRY ALERTS</span>
            </label>
          </div>

          <button type="submit" className="w-full bg-[#F37021] text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] hover:bg-[#d95d16] transition shadow-lg shadow-[#F37021]/10">
            Commit HUD Settings
          </button>
        </form>
      </div>
    );
  };

  const renderMessages = () => {
    const contacts = chatCategory === 'contractors' ? contractorContacts : patrolContacts;
    const activeMessages = adminConversations[activeAdminContact.id] || [];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-210px)] shrink-0 overflow-hidden animate-in fade-in duration-300">
        
        {/* Contacts column */}
        <div className="lg:col-span-4 glass-panel border border-slate-900 rounded-2xl flex flex-col overflow-hidden h-full">
          
          {/* Category Tabs */}
          <div className="flex border-b border-slate-900 bg-black/40">
            <button 
              onClick={() => {
                setChatCategory('contractors');
                setActiveAdminContact(contractorContacts[0]);
              }}
              className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest text-center border-r border-slate-900 transition ${
                chatCategory === 'contractors' 
                  ? 'text-[#F37021] bg-[#F37021]/5 font-black border-b-2 border-b-[#F37021]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Contractors
            </button>
            <button 
              onClick={() => {
                setChatCategory('patrol');
                setActiveAdminContact(patrolContacts[0]);
              }}
              className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest text-center transition ${
                chatCategory === 'patrol' 
                  ? 'text-[#F37021] bg-[#F37021]/5 font-black border-b-2 border-b-[#F37021]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Field Patrol
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {contacts.map(c => (
              <div 
                key={c.id}
                onClick={() => {
                  setActiveAdminContact(c);
                  if (chatCategory === 'contractors') {
                    setContractorContacts(prev => prev.map(item => item.id === c.id ? { ...item, unread: false } : item));
                  } else {
                    setPatrolContacts(prev => prev.map(item => item.id === c.id ? { ...item, unread: false } : item));
                  }
                }}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center space-x-3.5 ${
                  activeAdminContact.id === c.id 
                    ? 'bg-[#F37021]/10 border-[#F37021]/30 shadow-[0_0_15px_rgba(243,112,33,0.05)]' 
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
                    <p className={`text-xs font-black uppercase truncate tracking-wide leading-none ${activeAdminContact.id === c.id ? 'text-white' : 'text-slate-300'}`}>
                      {c.name}
                    </p>
                    {c.unread && (
                      <span className="w-2 h-2 rounded-full bg-[#F37021] animate-pulse shadow-[0_0_6px_#F37021]"></span>
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
              <p className="text-xs font-black text-white uppercase tracking-wider">{activeAdminContact.name}</p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">{activeAdminContact.role}</p>
            </div>
            <div className="text-right text-[8px] hud-telemetry font-bold text-slate-500 uppercase tracking-widest border border-slate-800 bg-black/40 p-2 rounded-lg flex items-center space-x-1.5">
              <MessageSquare className="h-3 w-3 text-[#F37021]" />
              <span>LOG SECURE SYNC CHANNEL</span>
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
                    ? 'bg-[#111917]/80 border-[#F37021]/20 text-white rounded-tr-none'
                    : msg.system
                      ? 'bg-red-950/20 border-red-500/20 text-slate-300 rounded-tl-none shadow-[inset_0_0_12px_rgba(239,68,68,0.05)]'
                      : 'bg-slate-900/50 border-slate-800 text-slate-300 rounded-tl-none'
                }`}>
                  <p className="text-xs font-bold leading-relaxed uppercase tracking-wide whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-[7px] text-slate-500 font-bold text-right mt-2 uppercase tracking-widest">{msg.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Prompt input */}
          <form onSubmit={handleAdminChatSend} className="p-4 border-t border-slate-900 bg-black/40 flex items-center space-x-3.5">
            <input
              type="text"
              placeholder="ENTER SECURE TRANSMISSION MESSAGE..."
              className="flex-1 bg-black border border-slate-900 rounded-xl px-4 py-3.5 text-xs font-bold text-white focus:border-[#F37021]/40 outline-none uppercase placeholder:text-slate-800"
              value={adminChatInput}
              onChange={(e) => setAdminChatInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!adminChatInput.trim()}
              className="bg-[#111917] hover:bg-[#1c2a27] border border-[#F37021]/30 text-white p-3.5 rounded-xl transition disabled:opacity-20 flex items-center justify-center shrink-0 shadow-lg shadow-[#F37021]/5"
            >
              <Send className="h-4.5 w-4.5 text-[#F37021]" />
            </button>
          </form>

        </div>

      </div>
    );
  };

  const filteredCgdGAs = (cgdGAs || []).filter((ga) => {
    const name = (ga?.name ?? '').toString().trim().toLowerCase();
    const operator = (ga?.operator ?? '').toString().trim().toUpperCase();
    const searchTerm = (cgdSearch ?? '').toString().trim().toLowerCase();

    return name.includes(searchTerm) && (cgdEntityFilter === 'ALL' || operator.includes(cgdEntityFilter));
  });

  return (
    <DashboardLayout title={
      currentPath === '/admin/users' ? 'USER PRIVILEGES & KEY ACCESS' :
      currentPath === '/admin/pipelines' ? 'IOCL TRANSMISSION ROUTE ALIGNMENT' :
      currentPath === '/admin/requests' ? 'EXCAVATION BUFFER PERMITS CONTROL' :
      currentPath === '/admin/incidents' ? 'SATELLITE INTELLIGENCE ALERTS' :
      currentPath === '/admin/analytics' ? 'MITIGATION STATISTICAL ANALYTICS' :
      currentPath === '/admin/notifications' ? 'SYSTEM MESSAGE LOGS' :
      currentPath === '/admin/settings' ? 'SYSTEM HEARTBEAT CONFIG' :
      currentPath === '/admin/messages' ? 'SECURE SYSTEM CHAT PORTALS' :
      'IOCL COMMAND HUD'
    }>
      {/* Dynamic Views Rendering based on subpath */}
      {currentPath === '/admin/users' && renderUsers()}
      {currentPath === '/admin/pipelines' && renderPipelines()}
      {currentPath === '/admin/requests' && renderRequests()}
      {currentPath === '/admin/incidents' && renderIncidents()}
      {currentPath === '/admin/analytics' && renderAnalytics()}
      {currentPath === '/admin/notifications' && renderNotifications()}
      {currentPath === '/admin/settings' && renderSettings()}
      {currentPath === '/admin/messages' && renderMessages()}
      
      {/* Default Dashboard View */}
      {(currentPath === '/admin' || currentPath === '/admin/') && (
        <div className="space-y-6 w-full animate-in fade-in duration-300">
          
          {/* Top Floating Telemetry Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Active Pipelines', value: '3 Major Routes', sub: 'Mathura, Koyali, Haldia', icon: MapIcon, color: 'text-[#F37021]', bg: 'bg-[#F37021]/10', border: 'border-[#F37021]/20' },
              { label: 'ROW Excavation Permits', value: allRequests.length, sub: `${allRequests.filter(r => r.status === 'pending').length} Pending Review`, icon: FileText, color: 'text-[#86FFD3]', bg: 'bg-[#86FFD3]/10', border: 'border-[#86FFD3]/20' },
              { label: 'AI Satellite Anomaly Alerts', value: imageryDetections.length, sub: `${imageryDetections.filter(d => d.risk_level === 'high').length} High Severity`, icon: Cpu, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
              { label: 'Patrol Active Transmitters', value: patrolUsers.length, sub: `${patrolTracks.filter(t => t.is_offline).length} Offline Queueing`, icon: Users, color: 'text-[#7CEEFF]', bg: 'bg-[#7CEEFF]/10', border: 'border-[#7CEEFF]/20' }
            ].map((stat, idx) => (
              <div key={idx} className={`glass-panel p-6 rounded-2xl border ${stat.border} hover:border-[#7CEEFF]/30 transition-all duration-300 flex items-start justify-between cursor-default`}>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-white mt-3 tracking-tighter uppercase">{stat.value}</p>
                  <div className="flex items-center mt-2.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${stat.bg} ${stat.color} tracking-wider uppercase`}>
                      {stat.sub}
                    </span>
                  </div>
                </div>
                <div className={`${stat.bg} ${stat.color} p-3.5 rounded-xl border ${stat.border}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            ))}
          </div>

          {/* Center split view grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Map and Permits (Spans 8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Primary Interactive GIS interface */}
              <div className="h-[480px] rounded-2xl border border-[#7CEEFF]/10 overflow-hidden relative shadow-2xl">
                <Map 
                  pipelines={pipelines} 
                  requests={allRequests} 
                  tracks={patrolTracks}
                  imageryDetections={imageryDetections}
                  showBufferZones={showBufferZones}
                />
                
                {/* GIS HUD Overlay details */}
                <div className="absolute bottom-4 left-4 bg-black/85 border border-[#7CEEFF]/30 p-4 rounded-xl hud-telemetry space-y-1.5 pointer-events-auto z-10">
                  <p className="text-[9px] font-black text-white uppercase tracking-widest">MAP HUD OVERLAYS</p>
                  <label className="flex items-center space-x-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-white transition">
                    <input 
                      type="checkbox" 
                      checked={showBufferZones} 
                      onChange={(e) => setShowBufferZones(e.target.checked)}
                      className="rounded bg-black border-[#7CEEFF]/30 text-[#7CEEFF] h-3 w-3 focus:ring-0" 
                    />
                    <span>Show 500m Safety Buffer Zone</span>
                  </label>
                </div>
              </div>

              {/* Permits Management table */}
              <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 overflow-hidden">
                <div className="p-5 border-b border-[#7CEEFF]/10 flex justify-between items-center bg-black/20">
                  <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
                    <ClipboardList className="h-4 w-4 mr-2 text-[#7CEEFF]" />
                    Excavation ROW Permits
                  </h2>
                  <div className="text-[9px] text-[#7CEEFF] font-black uppercase tracking-widest hud-telemetry">
                    ACTIVE MONITORING STATE
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                        <th className="px-6 py-4">REQUEST ID</th>
                        <th className="px-6 py-4">CONTRACTOR</th>
                        <th className="px-6 py-4">RISK LEVEL</th>
                        <th className="px-6 py-4">BUFFER PROXIMITY</th>
                        <th className="px-6 py-4">DEPLOYED UNIT</th>
                        <th className="px-6 py-4">STATUS</th>
                        <th className="px-6 py-4">DISPATCH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {allRequests.map((req) => {
                        const assignedPatrol = patrolUsers.find(p => p.id === req.assigned_to);
                        return (
                          <tr key={req.id} className="hover:bg-white/5 transition cursor-default">
                            <td className="px-6 py-4 text-[10px] font-black text-[#7CEEFF] hud-telemetry">EXC-{1000 + req.id}</td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-black text-white uppercase tracking-wider">{req.contractor_name}</p>
                              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">{req.company_name}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase tracking-widest ${
                                req.risk_level === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {req.risk_level}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-300">{req.distance_to_pipeline?.toFixed(1) || 120}m FROM centerline</td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-300 uppercase">
                              {assignedPatrol ? assignedPatrol.name : <span className="text-slate-500">Unassigned</span>}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase tracking-widest ${
                                req.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                req.status === 'Safe to Dig' || req.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                'bg-blue-500/10 text-[#7CEEFF] border-blue-500/20'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {!assignedPatrol ? (
                                <select 
                                  className="text-[9px] font-black bg-black border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#F37021]/30 transition-all hover:border-[#F37021]/30 text-slate-300 uppercase cursor-pointer"
                                  defaultValue=""
                                  onChange={(e) => handleAssign(req.id, e.target.value)}
                                >
                                  <option value="" disabled>DEPLOY PATROL UNIT</option>
                                  {patrolUsers.map(p => <option key={p.id} value={p.id}>{(p.name || 'Patrol Officer').toUpperCase()}</option>)}
                                </select>
                              ) : (
                                <div className="flex items-center text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> DEPLOYED
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Patrol Requests Section */}
              <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 overflow-hidden">
                <div className="p-5 border-b border-[#7CEEFF]/10 flex justify-between items-center bg-black/20">
                  <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
                    <Users className="h-4 w-4 mr-2 text-[#7CEEFF]" />
                    Patrol Requests & Inspections
                  </h2>
                  <div className="text-[9px] text-[#7CEEFF] font-black uppercase tracking-widest hud-telemetry">
                    REAL-TIME FIELD DEPLOYMENT STATE
                  </div>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                        <th className="px-6 py-4">REQUEST ID</th>
                        <th className="px-6 py-4">CONTRACTOR</th>
                        <th className="px-6 py-4">ASSIGNED PATROL</th>
                        <th className="px-6 py-4">REQUEST STATUS</th>
                        <th className="px-6 py-4">CHECK-IN STATUS</th>
                        <th className="px-6 py-4">VERIFICATION IMAGE</th>
                        <th className="px-6 py-4">REASSIGN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {allRequests.filter(r => r.assigned_to !== null && r.assigned_to !== undefined).length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-10 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                            No active patrol inspections deployed
                          </td>
                        </tr>
                      ) : (
                        allRequests.filter(r => r.assigned_to !== null && r.assigned_to !== undefined).map(req => {
                          const assignedPatrol = patrolUsers.find(p => p.id === req.assigned_to);
                          const verifLog = verificationLogs.find(l => l.request_id === req.id);
                          
                          return (
                            <tr key={req.id} className="hover:bg-white/5 transition cursor-default">
                              <td className="px-6 py-4 text-[10px] font-black text-[#7CEEFF] hud-telemetry">EXC-{1000 + req.id}</td>
                              <td className="px-6 py-4">
                                <p className="text-xs font-black text-white uppercase tracking-wider">{req.contractor_name}</p>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">{req.company_name}</p>
                              </td>
                              <td className="px-6 py-4 text-xs font-bold text-slate-300 uppercase">
                                {assignedPatrol ? assignedPatrol.name : 'Unknown Patrol'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[8px] font-black px-2 py-1 rounded border uppercase tracking-widest ${
                                  req.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                  req.status === 'Safe to Dig' || req.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                  'bg-blue-500/10 text-[#7CEEFF] border-blue-500/20'
                                }`}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {req.checked_in ? (
                                  <div className="text-[10px] font-bold text-emerald-400 uppercase">
                                    Checked In
                                    {req.check_in_time && (
                                      <span className="block text-[8px] text-slate-500 font-normal mt-1">
                                        {new Date(req.check_in_time).toLocaleTimeString()}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">
                                    Not Checked In
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {verifLog && verifLog.photo_url ? (
                                  <div className="flex flex-col space-y-1">
                                    <a href={verifLog.photo_url} target="_blank" rel="noreferrer" className="block w-12 h-8 rounded border border-slate-800 overflow-hidden bg-black/40 hover:border-[#7CEEFF] transition">
                                      <img src={verifLog.photo_url} alt="Verification" className="w-full h-full object-cover" />
                                    </a>
                                    {verifLog.notes && (
                                      <span className="block text-[8px] text-slate-400 truncate max-w-[120px] italic">
                                        "{verifLog.notes}"
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-bold text-slate-600 uppercase">No Data</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  className="text-[9px] font-black bg-black border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-[#7CEEFF]/30 transition-all hover:border-[#7CEEFF]/30 text-slate-300 uppercase cursor-pointer"
                                  value={req.assigned_to || ""}
                                  onChange={(e) => handleAssign(req.id, e.target.value)}
                                >
                                  {patrolUsers.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CGD Geographical Area Target & Achievement Telemetry Panel */}
              <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 overflow-hidden">
                <div className="p-5 border-b border-[#7CEEFF]/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-black/20">
                  <div className="flex items-center space-x-2">
                    <Radar className="h-4 w-4 text-[#86FFD3] animate-pulse" />
                    <h2 className="font-black text-white text-xs uppercase tracking-widest">
                      CGD Geographical Area (GA) Telemetry
                    </h2>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="SEARCH GEOGRAPHICAL AREA..." 
                        className="bg-black/40 border border-slate-900 rounded-xl px-4 py-2.5 pl-9 text-[9px] font-black text-white tracking-widest outline-none focus:border-[#86FFD3]/40 w-full sm:w-48 placeholder:text-slate-700 text-uppercase"
                        value={cgdSearch}
                        onChange={(e) => setCgdSearch(e.target.value)}
                      />
                      <Compass className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-700" />
                    </div>

                    <select
                      className="bg-black/40 border border-slate-900 rounded-xl px-3 py-2 text-[9px] font-black text-[#86FFD3] tracking-widest outline-none cursor-pointer focus:border-[#86FFD3]/40 uppercase"
                      value={cgdEntityFilter}
                      onChange={(e) => setCgdEntityFilter(e.target.value)}
                    >
                      <option value="ALL">ALL OPERATORS</option>
                      <option value="IGL">IGL ONLY</option>
                      <option value="ADANI">ADANI GAS ONLY</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                        <th className="px-6 py-4">GEOGRAPHICAL AREA</th>
                        <th className="px-6 py-4">GA OPERATOR</th>
                        <th className="px-6 py-4">TARGET MONITOR</th>
                        <th className="px-6 py-4">ACHIEVED LENGTH</th>
                        <th className="px-6 py-4">COMPLIANCE RATIO</th>
                        <th className="px-6 py-4">STATUS STATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {filteredCgdGAs.map(ga => {
                        const targetKm = Number(ga?.target_km) || 0;
                        const achievedKm = Number(ga?.achieved_km) || 0;
                        const completionRatio = targetKm > 0 ? ((achievedKm / targetKm) * 100).toFixed(0) : '0';
                        return (
                          <tr 
                            key={ga.id} 
                            onClick={() => {
                              setSelectedGA(ga);
                              if (ga.id === 1) setMapCenter([28.61, 77.20]);
                              else setMapCenter([28.45, 77.02]);
                            }}
                            className={`hover:bg-[#86FFD3]/5 transition cursor-pointer ${selectedGA?.id === ga.id ? 'bg-[#86FFD3]/5' : ''}`}
                          >
                            <td className="px-6 py-4 font-black text-white uppercase">{ga?.name ?? 'Unnamed GA'}</td>
                            <td className="px-6 py-4 font-bold text-slate-400">{ga?.operator ?? 'N/A'}</td>
                            <td className="px-6 py-4 font-bold text-slate-300">{targetKm} KM</td>
                            <td className="px-6 py-4 font-black text-[#86FFD3]">{achievedKm} KM</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                                  <div className="bg-[#86FFD3] h-full" style={{ width: `${completionRatio}%` }}></div>
                                </div>
                                <span className="font-black text-[9px] text-[#86FFD3]">{completionRatio}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${
                                (ga?.status ?? 'normal') === 'normal' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                              }`}>
                                {ga?.status ?? 'normal'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Right Column: Alerts & Surveillance Scans (Spans 4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Demonstration Simulation Console Card */}
              <div className="glass-panel rounded-2xl border border-[#7CEEFF]/20 p-6 relative overflow-hidden bg-black/30">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#7CEEFF]/5 rounded-full blur-2xl"></div>
                
                <h2 className="font-black text-white text-xs uppercase tracking-widest mb-4 flex items-center">
                  <Cpu className="h-4 w-4 mr-2 text-[#7CEEFF] animate-pulse" />
                  Demo Simulator Console
                </h2>

                <p className="text-[9px] text-slate-400 leading-normal mb-5 uppercase tracking-wider">
                  Simulate live GPS positioning and third-party encroachment alarms for your presentation.
                </p>

                <div className="space-y-3">
                  <button 
                    onClick={simulatePatrolMovement}
                    className={`w-full font-black py-3 rounded-xl text-[9px] uppercase tracking-[0.2em] transition border ${
                      isSimulatingPatrol 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-[#86FFD3]' 
                        : 'bg-[#7CEEFF]/15 border-[#7CEEFF]/30 text-[#7CEEFF] hover:bg-[#7CEEFF]/25'
                    }`}
                  >
                    {isSimulatingPatrol ? '● PATROL SIM ACTIVE' : 'Start Patrol Simulation'}
                  </button>

                  <button 
                    onClick={simulateDroneThreat}
                    className="w-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-black py-3 rounded-xl text-[9px] uppercase tracking-[0.2em] transition"
                  >
                    Simulate Threat Alarm
                  </button>
                </div>
              </div>

              {/* AI Satellite Sweep Trigger Card */}
              <div className="glass-panel rounded-2xl border border-[#F37021]/20 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#F37021]/5 rounded-full blur-2xl"></div>
                
                <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
                  <Radio className="h-4 w-4 mr-2 text-[#F37021]" />
                  Satellite Surveillance Link
                </h2>

                <p className="text-[10px] text-slate-400 leading-normal mb-6 uppercase tracking-wider">
                  Initiate a cognitive radar scan over the pipeline ROW corridors to detect physical encroachment threats (earthmovers, trenches) via AI imagery matching.
                </p>

                {isScanning ? (
                  <div className="bg-black/40 border border-[#7CEEFF]/30 p-4 rounded-xl flex items-center justify-center space-x-3 mb-2 animate-pulse">
                    <Radar className="h-5 w-5 text-[#7CEEFF] animate-spin" />
                    <span className="text-[9px] font-black text-[#7CEEFF] uppercase tracking-widest hud-telemetry">
                      {scanMessage}
                    </span>
                  </div>
                ) : (
                  <button 
                    onClick={triggerSatelliteScan}
                    className="w-full bg-[#F37021] hover:bg-[#d95d16] text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-[0.2em] transition shadow-lg shadow-[#F37021]/20 border border-[#F37021]/20"
                  >
                    Initiate AI Satellite Sweep
                  </button>
                )}
              </div>

              {/* AI Detections Feed */}
              <div className="glass-panel rounded-2xl border border-red-500/20 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                    Satellite Threat Alerts
                  </h2>
                  {imageryDetections.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                  )}
                </div>

                <div className="space-y-4 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                  {imageryDetections.length === 0 ? (
                    <div className="text-center py-10 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                      No satellite threat detections reported
                    </div>
                  ) : (
                    imageryDetections.map((det) => (
                      <div key={det.id} className="p-4 rounded-xl bg-[#111917]/50 border border-slate-900 hover:border-red-500/20 transition flex space-x-3 cursor-default">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <p className="text-[11px] font-black text-white uppercase truncate tracking-wide leading-tight">{det.name}</p>
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                              det.risk_level === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {det.risk_level} THREAT
                            </span>
                          </div>
                          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                            COORDS: {det.lat?.toFixed(3)}N, {det.lng?.toFixed(3)}E | CONF: {((det.confidence || 0) * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent High-Risk Excavation Requests Table */}
              <div className="glass-panel rounded-2xl border border-red-500/20 p-6">
                <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-500 animate-pulse" />
                  Recent High-Risk Excavations
                </h2>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                        <th className="px-2 py-2">ID</th>
                        <th className="px-2 py-2">CONTRACTOR</th>
                        <th className="px-2 py-2">RISK</th>
                        <th className="px-2 py-2">PATROL</th>
                        <th className="px-2 py-2">STATUS</th>
                        <th className="px-2 py-2">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {allRequests.filter(r => r.risk_level === 'high').slice(0, 5).map(req => {
                        const assignedPatrolUser = patrolUsers.find(p => p.id === req.assigned_to);
                        return (
                          <tr key={req.id} className="hover:bg-white/5 transition text-[9px] text-slate-300">
                            <td className="px-2 py-3 font-black text-[#7CEEFF] whitespace-nowrap">EXC-{1000 + req.id}</td>
                            <td className="px-2 py-3">
                              <p className="font-black text-white uppercase truncate max-w-[80px] tracking-wider">{req.contractor_name}</p>
                              <p className="text-[7px] text-slate-500 uppercase truncate max-w-[80px]">{req.company_name}</p>
                            </td>
                            <td className="px-2 py-3 text-[8px] font-black text-red-400 uppercase tracking-wider">HIGH</td>
                            <td className="px-2 py-3 uppercase text-[8px] text-slate-400">
                              {assignedPatrolUser ? assignedPatrolUser.name : 'Unassigned'}
                            </td>
                            <td className="px-2 py-3">
                              <span className={`text-[7px] font-black px-1 py-0.5 rounded border uppercase tracking-wider ${
                                req.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                req.status === 'Safe to Dig' || req.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                'bg-blue-500/10 text-[#7CEEFF] border-blue-500/20'
                              }`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-[8px] text-slate-400 whitespace-nowrap">
                              {req.work_date ? new Date(req.work_date).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                      {allRequests.filter(r => r.risk_level === 'high').length === 0 && (
                        <tr>
                          <td colSpan="6" className="px-2 py-6 text-center text-[10px] text-slate-500 uppercase font-black">
                            No High-Risk Permits
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
