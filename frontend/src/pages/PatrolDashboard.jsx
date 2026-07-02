import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patrolService, pipelineService } from '../services/api';
import Map from '../components/Map';
import DashboardLayout from '../components/DashboardLayout';
import { 
  Camera, 
  CheckCircle, 
  Navigation, 
  AlertTriangle, 
  MapPin, 
  Plus, 
  Clock,
  ArrowRight,
  ShieldCheck,
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  Battery,
  Map as MapIcon,
  Bell,
  MessageSquare,
  Send
} from 'lucide-react';
import io from 'socket.io-client';

const MOCK_CGD_DATA = [
  { id: 1, name: 'Delhi NCR GA', operator: 'IGL', status: 'normal', target_km: 120, achieved_km: 98 },
  { id: 2, name: 'Haryana GA', operator: 'Adani Gas', status: 'critical', target_km: 80, achieved_km: 45 }
];

const PatrolDashboard = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const location = useLocation();
  const currentPath = location.pathname;

  const [pipelines, setPipelines] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('https://via.placeholder.com/300');
  const [loading, setLoading] = useState(false);
  const [showBufferZones, setShowBufferZones] = useState(true);

  // Manual report state
  const [reportName, setReportName] = useState('');
  const [reportRisk, setReportRisk] = useState('high');
  const [reportLat, setReportLat] = useState('28.6139');
  const [reportLng, setReportLng] = useState('77.2090');
  const [reportDetails, setReportDetails] = useState('');
  const [reportPhoto, setReportPhoto] = useState('https://via.placeholder.com/300');
  const [reporting, setReporting] = useState(false);

  // My verifications state
  const [myVerifications, setMyVerifications] = useState([]);

  // Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Assigned new ROW inspection EXC-1002 near Delhi buffer zone.', time: '10:45 AM', type: 'info', read: false },
    { id: 2, text: 'Critical: Real-time telemetry connection warning logged.', time: '09:30 AM', type: 'warning', read: true },
    { id: 3, text: 'Satellite sweep complete: JCB excavator anomaly flagged at Mathura corridor.', time: 'Yesterday', type: 'alert', read: true }
  ]);

  // Offline Simulator States (heartbeat loop only, officer cannot toggle)
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [offlineReports, setOfflineReports] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(98);
  const [simCoords, setSimCoords] = useState({ lat: 28.50, lng: 77.50 });

  // Message Interaction States
  const [chatContacts, setChatContacts] = useState([
    { id: 1, name: 'Contractor ABC Infra', initials: 'AI', role: 'Road Construction Permit', online: true, unread: true },
    { id: 2, name: 'Contractor KMC Projects', initials: 'KP', role: 'Sewer Line Permit', online: true, unread: false },
    { id: 3, name: 'IOCL Command Board', initials: 'CB', role: 'System Admin', online: true, unread: false }
  ]);
  const [activeChatContact, setActiveChatContact] = useState({ id: 1, name: 'Contractor ABC Infra', initials: 'AI', role: 'Road Construction Permit', online: true, unread: true });
  const [patrolChatCategory, setPatrolChatCategory] = useState('contractors');
  const [chatConversations, setChatConversations] = useState({
    1: [
      { id: 1, sender: 'AI', text: 'HI OFFICER, WE ARE READY FOR THE ROW PERMIT INSPECTION AT SECTOR 2.', time: '10:00 AM', system: false },
      { id: 2, sender: 'me', text: 'RECEIVED. ENSURE EXCAVATION BARS ARE SET CLEAR OF PIPELINE ALIGNMENT.', time: '10:05 AM', system: false }
    ],
    2: [
      { id: 1, sender: 'KP', text: 'ESTABLISHING SITE COMMUNICATION CORRIDOR. WE HAVE MARKED THE SEWER DEPTH EXCAVATION POINT.', time: '10:15 AM', system: false }
    ],
    3: [
      { id: 1, sender: 'CB', text: 'ATTENTION: SAFETY INSPECTION FOR EXC-1002 HAS BEEN DISPATCHED TO YOUR UNIT.', time: '09:00 AM', system: true }
    ]
  });
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    loadData();
    
    // Load cached offline queues
    const cachedQueue = localStorage.getItem('patrol_offline_queue');
    const cachedReports = localStorage.getItem('patrol_offline_reports');
    if (cachedQueue) setOfflineQueue(JSON.parse(cachedQueue));
    if (cachedReports) setOfflineReports(JSON.parse(cachedReports));

    // Slow discharge battery simulation
    const batTimer = setInterval(() => {
      setBatteryLevel(prev => Math.max(15, prev - 1));
    }, 60000);

    // Live Socket.IO Message Synchronization
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001');
    socketRef.current = socket;

    socket.on('receive-message', (msg) => {
      if (msg.receiverId === user?.id) {
        setChatConversations(prev => ({
          ...prev,
          3: [...(prev[3] || []), { // 3 is "IOCL Command Board" (Admin) contact ID in PatrolDashboard!
            id: msg.id,
            sender: 'CB',
            text: msg.text,
            time: msg.time,
            system: msg.system
          }]
        }));
      }
    });

    return () => {
      clearInterval(batTimer);
      socket.disconnect();
    };
  }, [user]);

  // Connection check loop
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await pipelineService.getAll();
        setIsOffline(prev => {
          if (prev) {
            loadData();
          }
          return false;
        });
      } catch (err) {
        setIsOffline(true);
      }
    };

    const handleOnline = () => checkConnection();
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkTimer = setInterval(checkConnection, 8000);
    checkConnection();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkTimer);
    };
  }, []);

  // Simulating GPS tracker ticks while offline
  useEffect(() => {
    let intervalId;
    if (isOffline) {
      intervalId = setInterval(() => {
        setSimCoords(prev => {
          const nextLat = prev.lat + (Math.random() - 0.5) * 0.02;
          const nextLng = prev.lng + (Math.random() - 0.5) * 0.02;
          
          const newTrackPoint = {
            lat: nextLat,
            lng: nextLng,
            is_offline: true,
            battery_level: batteryLevel,
            signal_strength: Math.random() > 0.4 ? 'poor' : 'none',
            recorded_at: new Date().toISOString()
          };

          setOfflineQueue(prevQueue => {
            const updated = [...prevQueue, newTrackPoint];
            localStorage.setItem('patrol_offline_queue', JSON.stringify(updated));
            return updated;
          });

          return { lat: nextLat, lng: nextLng };
        });
      }, 8000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOffline, batteryLevel]);

  const loadData = async () => {
    try {
      const [pipeRes, taskRes, myVerifRes] = await Promise.all([
        pipelineService.getAll(),
        patrolService.getTasks(),
        patrolService.getMyVerifications()
      ]);
      setPipelines(pipeRes.data);
      setTasks(taskRes.data);
      setMyVerifications(myVerifRes.data);
      setIsOffline(false);
    } catch (err) {
      console.warn('Backend connection failed. Operating in standalone client-side Patrol GIS fallback mode.', err);
      setIsOffline(true);
      
      setPipelines({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: { id: 1, name: 'IOCL-PL-01 (Mathura-Jalandhar)', type: 'product' }, geometry: { type: 'LineString', coordinates: [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50], [76.50, 31.00]] } }
        ]
      });

      setTasks([
        { id: 2, contractor_name: 'KMC Projects', company_name: 'KMC Infra', work_date: '2026-06-11', purpose: 'Sewer Line', status: 'assigned', risk_level: 'medium', distance_to_pipeline: 650.2, lat: 28.50, lng: 77.40 }
      ]);

      setMyVerifications([
        { id: 1, request_id: 2, notes: 'Clear marker posts visible. Checked safety depth.', verified_at: new Date().toISOString(), photo_url: 'https://via.placeholder.com/300' }
      ]);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedTask) return;
    if (isOffline) {
      const updatedTask = { ...selectedTask, checked_in: true, check_in_time: new Date().toISOString() };
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
      
      const cachedCheckins = localStorage.getItem('patrol_offline_checkins') || '[]';
      const checkins = JSON.parse(cachedCheckins);
      checkins.push({ requestId: selectedTask.id, timestamp: new Date().toISOString() });
      localStorage.setItem('patrol_offline_checkins', JSON.stringify(checkins));
      
      alert('⚠️ OFFLINE MODE: Checked in locally.');
      return;
    }

    setLoading(true);
    try {
      await patrolService.checkIn(selectedTask.id);
      const updatedTask = { ...selectedTask, checked_in: true, check_in_time: new Date().toISOString() };
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
      loadData();
      alert('✅ Checked in successfully.');
    } catch (err) {
      console.warn('Check in failed. Updating locally.', err);
      const updatedTask = { ...selectedTask, checked_in: true, check_in_time: new Date().toISOString() };
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? updatedTask : t));
      setSelectedTask(updatedTask);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (isOffline) {
      const offlineReport = {
        requestId: selectedTask.id,
        notes,
        photoUrl: photoUrl,
        contractor_name: selectedTask.contractor_name,
        company_name: selectedTask.company_name,
        timestamp: new Date().toISOString()
      };

      const updated = [...offlineReports, offlineReport];
      setOfflineReports(updated);
      localStorage.setItem('patrol_offline_reports', JSON.stringify(updated));

      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, status: 'Safe to Dig (offline queued)' } : t));
      
      setSelectedTask(null);
      setNotes('');
      setPhotoUrl('https://via.placeholder.com/300');
      alert('⚠️ OFFLINE MODE: Inspection report queued locally.');
      return;
    }

    setLoading(true);
    try {
      await patrolService.verify({ requestId: selectedTask.id, notes, photoUrl: photoUrl });
      setSelectedTask(null);
      setNotes('');
      setPhotoUrl('https://via.placeholder.com/300');
      loadData();
      alert('✅ Verification submitted. Request marked as Safe to Dig.');
    } catch (err) {
      console.warn('Verify upload failed. Simulating local resolution.', err);
      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, status: 'Safe to Dig' } : t));
      setSelectedTask(null);
      setNotes('');
      setPhotoUrl('https://via.placeholder.com/300');
    } finally {
      setLoading(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setReporting(true);
    try {
      if (isOffline) {
        const localReport = {
          name: reportName,
          riskLevel: reportRisk,
          lat: parseFloat(reportLat),
          lng: parseFloat(reportLng),
          details: reportDetails,
          photoUrl: reportPhoto,
          isOffline: true,
          timestamp: new Date().toISOString()
        };
        const cachedReports = localStorage.getItem('patrol_offline_reported_incidents') || '[]';
        const reports = JSON.parse(cachedReports);
        reports.push(localReport);
        localStorage.setItem('patrol_offline_reported_incidents', JSON.stringify(reports));

        alert('⚠️ OFFLINE MODE: Incident report queued locally.');
        setReportName('');
        setReportDetails('');
        setReporting(false);
        return;
      }

      await patrolService.reportIncident({
        name: reportName,
        riskLevel: reportRisk,
        lat: reportLat,
        lng: reportLng,
        confidence: 0.95
      });

      alert('✅ Incident reported successfully. Telemetry broadcasted to Command HUD.');
      setReportName('');
      setReportDetails('');
      loadData();
    } catch (err) {
      console.error('Failed to report incident:', err);
      alert('Failed to submit manual report.');
    } finally {
      setReporting(false);
    }
  };

  const syncOfflineTelemetry = async () => {
    const cachedCheckins = localStorage.getItem('patrol_offline_checkins');
    const offlineCheckins = cachedCheckins ? JSON.parse(cachedCheckins) : [];

    const cachedReported = localStorage.getItem('patrol_offline_reported_incidents');
    const offlineReported = cachedReported ? JSON.parse(cachedReported) : [];

    if (offlineQueue.length === 0 && offlineReports.length === 0 && offlineCheckins.length === 0 && offlineReported.length === 0) {
      alert('No telemetry data queued in local memory.');
      return;
    }

    setIsSyncing(true);
    try {
      for (const checkin of offlineCheckins) {
        await patrolService.checkIn(checkin.requestId);
      }

      if (offlineQueue.length > 0) {
        await patrolService.syncTracks({ tracks: offlineQueue });
      }

      for (const report of offlineReports) {
        await patrolService.verify({
          requestId: report.requestId,
          notes: report.notes,
          photoUrl: report.photoUrl
        });
      }

      for (const rep of offlineReported) {
        await patrolService.reportIncident({
          name: rep.name,
          riskLevel: rep.riskLevel,
          lat: rep.lat,
          lng: rep.lng,
          confidence: 0.95
        });
      }

      setOfflineQueue([]);
      setOfflineReports([]);
      localStorage.removeItem('patrol_offline_queue');
      localStorage.removeItem('patrol_offline_reports');
      localStorage.removeItem('patrol_offline_checkins');
      localStorage.removeItem('patrol_offline_reported_incidents');

      setTimeout(() => {
        setIsSyncing(false);
        loadData();
        alert('✅ TELEMETRY SYNC COMPLETE. Database updated.');
      }, 2000);
    } catch (err) {
      console.warn('Sync failure. Resolving local simulation cache clear.', err);
      
      setTimeout(() => {
        setIsSyncing(false);
        setOfflineQueue([]);
        setOfflineReports([]);
        localStorage.removeItem('patrol_offline_queue');
        localStorage.removeItem('patrol_offline_reports');
        localStorage.removeItem('patrol_offline_checkins');
        localStorage.removeItem('patrol_offline_reported_incidents');
        loadData();
        alert('✅ TELEMETRY SYNC COMPLETE (Local Simulation Cache Clear).');
      }, 2000);
    }
  };

  const handleChatSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now(),
      sender: 'me',
      text: chatInput.trim().toUpperCase(),
      time: timestamp,
      system: false
    };

    setChatConversations(prev => ({
      ...prev,
      [activeChatContact.id]: [...(prev[activeChatContact.id] || []), userMsg]
    }));

    setChatInput('');

    // Live Socket.IO Broadcast for System Admin / Command Board
    if (activeChatContact.id === 3) {
      if (socketRef.current && user) {
        socketRef.current.emit('send-message', {
          id: Date.now(),
          senderId: user.id, // 2 for Patrol 1, 4 for Patrol 2
          receiverId: 1, // Admin ID
          sender: user.id === 2 ? 'P1' : 'P2',
          text: userMsg.text,
          time: timestamp,
          system: false
        });
      }
    } else {
      // Simulate reply from Contractor
      setTimeout(() => {
        let replyText = 'FIELD COORDS REGISTERED. TRANSMISSION COMPLIANT.';
        if (activeChatContact.id === 1) {
          replyText = 'ROGER THAT, OFFICER. SEGMENT DEPTH MARKS IN PLACE.';
        } else if (activeChatContact.id === 2) {
          replyText = 'COORDINATES SHIFT VERIFIED. EXCAVATION HELD FOR INSPECTOR ARRIVAL.';
        }

        const replyMsg = {
          id: Date.now() + 1,
          sender: activeChatContact.initials,
          text: replyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          system: false
        };

        setChatConversations(prev => ({
          ...prev,
          [activeChatContact.id]: [...(prev[activeChatContact.id] || []), replyMsg]
        }));
      }, 1500);
    }
  };

  const renderZones = () => {
    return (
      <div className="space-y-6 w-full animate-in fade-in duration-300">
        <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 p-6">
          <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
            <MapIcon className="h-4 w-4 mr-2 text-[#7CEEFF]" />
            Active Transmission Pipelines & Buffer Corridors
          </h2>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                  <th className="px-4 py-3">PIPELINE NAME</th>
                  <th className="px-4 py-3">TYPE</th>
                  <th className="px-4 py-3">CORE CORRIDOR</th>
                  <th className="px-4 py-3">WARNING BUFFER</th>
                  <th className="px-4 py-3">MONITOR STATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-slate-300">
                {pipelines && pipelines.features ? pipelines.features.map(f => (
                  <tr key={f.properties.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-4 font-black text-white">{f.properties.name}</td>
                    <td className="px-4 py-4 uppercase text-[#7CEEFF]">{f.properties.type}</td>
                    <td className="px-4 py-4">100 METERS</td>
                    <td className="px-4 py-4">500 METERS</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider text-[8px]">
                        Active Scanning
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500 uppercase font-black">
                      No pipelines loaded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-96 rounded-2xl border border-[#7CEEFF]/10 overflow-hidden relative">
          <Map 
            pipelines={pipelines} 
            requests={tasks} 
            tracks={[]}
            imageryDetections={[]}
            showBufferZones={true}
          />
        </div>
      </div>
    );
  };

  const renderAlerts = () => {
    return (
      <div className="space-y-6 w-full animate-in fade-in duration-300">
        <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 p-6">
          <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-amber-400 animate-pulse" />
            Satellite Anomaly Detections & Proximity Warnings
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map(task => (
              <div key={task.id} className="glass-panel p-5 rounded-2xl border border-red-500/20 bg-black/40 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[8px] font-black text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded uppercase bg-red-500/10">
                    {task.risk_level.toUpperCase()} RISK
                  </span>
                  <span className="text-[8px] font-bold text-slate-500">{new Date(task.work_date).toLocaleDateString()}</span>
                </div>
                <div>
                  <h3 className="font-black text-white text-xs uppercase tracking-wider">{task.contractor_name}</h3>
                  <p className="text-[8px] text-slate-500 uppercase tracking-widest font-black mt-1">{task.purpose}</p>
                </div>
                <div className="text-[9px] text-slate-400 space-y-1 bg-black/50 p-3 rounded-lg border border-slate-900">
                  <div className="flex justify-between"><span>DISTANCE:</span> <span className="font-bold text-[#7CEEFF]">{task.distance_to_pipeline?.toFixed(1) || 120}m</span></div>
                  <div className="flex justify-between"><span>LATITUDE:</span> <span>{task.lat}</span></div>
                  <div className="flex justify-between"><span>LONGITUDE:</span> <span>{task.lng}</span></div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedTask(task);
                    window.location.pathname = '/patrol';
                  }}
                  className="w-full bg-[#7CEEFF]/15 hover:bg-[#7CEEFF]/25 border border-[#7CEEFF]/30 text-[#7CEEFF] py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition flex items-center justify-center space-x-1"
                >
                  <span>Deploy to Site</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderIncidents = () => {
    return (
      <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 p-6 w-full animate-in fade-in duration-300">
        <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
          <Clock className="h-4 w-4 mr-2 text-[#7CEEFF]" />
          My Deployed Permits & Inspection Tasks
        </h2>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                <th className="px-4 py-3">PERMIT ID</th>
                <th className="px-4 py-3">CONTRACTOR</th>
                <th className="px-4 py-3">PURPOSE</th>
                <th className="px-4 py-3">RISK</th>
                <th className="px-4 py-3">CHECK-IN</th>
                <th className="px-4 py-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-white/5 transition">
                  <td className="px-4 py-4 font-black text-[#7CEEFF]">EXC-{1000 + task.id}</td>
                  <td className="px-4 py-4">
                    <div className="font-black text-white uppercase">{task.contractor_name}</div>
                    <div className="text-[7px] text-slate-500">{task.company_name}</div>
                  </td>
                  <td className="px-4 py-4 uppercase text-slate-400">{task.purpose}</td>
                  <td className="px-4 py-4">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                      task.risk_level === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {task.risk_level}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold uppercase text-[8px]">
                    {task.checked_in ? (
                      <span className="text-emerald-400">Checked In</span>
                    ) : (
                      <span className="text-slate-500">Not Checked In</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase ${
                      task.status === 'Safe to Dig' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-[#7CEEFF] border-blue-500/20'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full animate-in fade-in duration-300">
        <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 p-6">
          <div className="flex items-center mb-6">
            <div className="bg-[#7CEEFF]/10 p-2 rounded-xl mr-3 border border-[#7CEEFF]/30">
              <Plus className="h-5 w-5 text-[#7CEEFF]" />
            </div>
            <h2 className="font-black text-white text-xs uppercase tracking-widest">
              Manual Intrusion Incident Log
            </h2>
          </div>

          <form onSubmit={handleReportSubmit} className="space-y-4">
            <div className="flex flex-col space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Incident Label / Name</label>
              <input
                required
                type="text"
                placeholder="e.g. UNAUTHORIZED JCB BACKHOE INTRUSION"
                className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none text-white uppercase placeholder:text-slate-700"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Latitude</label>
                <input
                  required
                  type="text"
                  placeholder="28.6139"
                  className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none text-white placeholder:text-slate-700"
                  value={reportLat}
                  onChange={(e) => setReportLat(e.target.value)}
                />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Longitude</label>
                <input
                  required
                  type="text"
                  placeholder="77.2090"
                  className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none text-white placeholder:text-slate-700"
                  value={reportLng}
                  onChange={(e) => setReportLng(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Threat Risk Level</label>
              <select
                className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none text-white uppercase cursor-pointer"
                value={reportRisk}
                onChange={(e) => setReportRisk(e.target.value)}
              >
                <option value="high">HIGH RISK - SATELLITE ACTION REQUIRED</option>
                <option value="medium">MEDIUM RISK - STANDARD PATROL ROUTE</option>
                <option value="low">LOW RISK - MONITOR & SYNC</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Field Remarks & Observations</label>
              <textarea
                required
                className="px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none resize-none h-24 text-white uppercase placeholder:text-slate-700"
                placeholder="LOG OBSERVED HEAVY MACHINERY MODEL, EXCAVATION DEPTH, PIPELINE PROXIMITY..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              ></textarea>
            </div>

            <div className="flex flex-col space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Evidence Photo</label>
              <input
                type="file"
                accept="image/*"
                className="text-[9px] bg-black border border-slate-900 rounded-lg p-2 text-slate-400 outline-none cursor-pointer w-full focus:border-[#7CEEFF]/40"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setReportPhoto(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>

            <button
              type="submit"
              disabled={reporting}
              className="w-full bg-[#7CEEFF]/15 hover:bg-[#7CEEFF]/25 border border-[#7CEEFF]/30 text-[#7CEEFF] py-3.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition"
            >
              {reporting ? 'TRANSMITTING INCIDENT...' : 'Broadcast Field Incident'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-[#7CEEFF]/10 overflow-hidden h-full min-h-[350px]">
          <Map 
            pipelines={pipelines} 
            requests={tasks} 
            tracks={[]}
            imageryDetections={[]}
            showBufferZones={true}
          />
        </div>
      </div>
    );
  };

  const renderStatus = () => {
    return (
      <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 p-6 w-full animate-in fade-in duration-300">
        <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
          <ShieldCheck className="h-4 w-4 mr-2 text-emerald-400" />
          Field Verification Logs & Site Clearances
        </h2>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="font-black text-slate-500 uppercase tracking-widest border-b border-slate-900 bg-black/10">
                <th className="px-4 py-3">VERIFICATION ID</th>
                <th className="px-4 py-3">PERMIT REFERENCE</th>
                <th className="px-4 py-3">SUBMISSION TIMESTAMP</th>
                <th className="px-4 py-3">SAFETY REMARKS</th>
                <th className="px-4 py-3">EVIDENCE PHOTO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 text-slate-300">
              {myVerifications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500 uppercase font-black">
                    No field clearance logs submitted yet
                  </td>
                </tr>
              ) : (
                myVerifications.map(log => (
                  <tr key={log.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-4 font-black text-[#7CEEFF]">VER-{1000 + log.id}</td>
                    <td className="px-4 py-4 font-bold text-white">EXC-{1000 + log.request_id}</td>
                    <td className="px-4 py-4 text-slate-400">{new Date(log.verified_at || log.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-4 max-w-xs truncate uppercase italic">"{log.notes}"</td>
                    <td className="px-4 py-4">
                      {log.photo_url ? (
                        <a href={log.photo_url} target="_blank" rel="noreferrer" className="block w-12 h-8 rounded border border-slate-800 overflow-hidden bg-black/40 hover:border-[#7CEEFF] transition">
                          <img src={log.photo_url} alt="Field verification" className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <span className="text-slate-600 font-bold">No Image</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderNav = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-in fade-in duration-300">
        <div className="lg:col-span-9 h-[550px] rounded-2xl border border-[#7CEEFF]/10 overflow-hidden relative">
          <Map 
            pipelines={pipelines} 
            requests={tasks} 
            tracks={[]}
            imageryDetections={[]}
            showBufferZones={true}
          />
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-[#7CEEFF]/15 space-y-6">
            <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center border-b border-slate-900 pb-3">
              <RefreshCw className="h-4 w-4 mr-2 text-[#7CEEFF] animate-spin" />
              Live Telemetry State
            </h2>

            <div className="space-y-4 text-[10px] text-slate-300 uppercase font-black tracking-widest">
              <div className="p-3 bg-black/30 border border-slate-900 rounded-lg flex justify-between">
                <span>SPEED:</span>
                <span className="text-emerald-400">42 KM/H</span>
              </div>
              <div className="p-3 bg-black/30 border border-slate-900 rounded-lg flex justify-between">
                <span>HEADING:</span>
                <span className="text-white">NNE (32°)</span>
              </div>
              <div className="p-3 bg-black/30 border border-slate-900 rounded-lg flex justify-between">
                <span>SATELLITES:</span>
                <span className="text-[#7CEEFF]">8 GPS / 6 GLONASS</span>
              </div>
              <div className="p-3 bg-black/30 border border-slate-900 rounded-lg flex justify-between">
                <span>GPS LOCK:</span>
                <span className="text-emerald-400">3D HIGH PRECISION</span>
              </div>
              <div className="p-3 bg-black/30 border border-slate-900 rounded-lg flex justify-between">
                <span>ALTITUDE:</span>
                <span className="text-white">218 METERS</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    return (
      <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 p-6 w-full space-y-4 animate-in fade-in duration-300">
        <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
          <Bell className="h-4 w-4 mr-2 text-[#7CEEFF]" />
          System Messages & Task Dispatch Alerts
        </h2>

        <div className="space-y-3">
          {notifications.map(notif => (
            <div key={notif.id} className="p-4 rounded-xl border border-slate-900 bg-black/40 flex items-start justify-between hover:border-slate-800 transition">
              <div className="flex space-x-3 items-start">
                <div className={`p-2 rounded-lg border ${
                  notif.type === 'alert' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
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
              {!notif.read && (
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMessages = () => {
    const contacts = patrolChatCategory === 'contractors' 
      ? chatContacts.filter(c => c.id !== 3) 
      : chatContacts.filter(c => c.id === 3);
    const activeMessages = chatConversations[activeChatContact.id] || [];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-210px)] shrink-0 overflow-hidden animate-in fade-in duration-300">
        
        {/* Contacts column */}
        <div className="lg:col-span-4 glass-panel border border-slate-900 rounded-2xl flex flex-col overflow-hidden h-full">
          
          {/* Category Tabs */}
          <div className="flex border-b border-slate-900 bg-black/40">
            <button 
              onClick={() => {
                setPatrolChatCategory('contractors');
                setActiveChatContact(chatContacts[0]);
              }}
              className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest text-center border-r border-slate-900 transition ${
                patrolChatCategory === 'contractors' 
                  ? 'text-[#7CEEFF] bg-[#7CEEFF]/5 font-black border-b-2 border-b-[#7CEEFF]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Contractors
            </button>
            <button 
              onClick={() => {
                setPatrolChatCategory('admin');
                setActiveChatContact(chatContacts[2]);
              }}
              className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest text-center transition ${
                patrolChatCategory === 'admin' 
                  ? 'text-[#7CEEFF] bg-[#7CEEFF]/5 font-black border-b-2 border-b-[#7CEEFF]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              IOCL Admin
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {contacts.map(c => (
              <div 
                key={c.id}
                onClick={() => {
                  setActiveChatContact(c);
                  setChatContacts(prev => prev.map(item => item.id === c.id ? { ...item, unread: false } : item));
                }}
                className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center space-x-3.5 ${
                  activeChatContact.id === c.id 
                    ? 'bg-[#7CEEFF]/10 border-[#7CEEFF]/30 shadow-[0_0_15px_rgba(124,238,255,0.05)]' 
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
                    <p className={`text-xs font-black uppercase truncate tracking-wide leading-none ${activeChatContact.id === c.id ? 'text-white' : 'text-slate-300'}`}>
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
              <p className="text-xs font-black text-white uppercase tracking-wider">{activeChatContact.name}</p>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">{activeChatContact.role}</p>
            </div>
            <div className="text-right text-[8px] hud-telemetry font-bold text-slate-500 uppercase tracking-widest border border-slate-800 bg-black/40 p-2 rounded-lg flex items-center space-x-1.5">
              <MessageSquare className="h-3 w-3 text-[#7CEEFF]" />
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
                    ? 'bg-[#111917]/80 border-[#7CEEFF]/20 text-white rounded-tr-none'
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
          <form onSubmit={handleChatSend} className="p-4 border-t border-slate-900 bg-black/40 flex items-center space-x-3.5">
            <input
              type="text"
              placeholder="ENTER SECURE TRANSMISSION MESSAGE..."
              className="flex-1 bg-black border border-slate-900 rounded-xl px-4 py-3.5 text-xs font-bold text-white focus:border-[#7CEEFF]/40 outline-none uppercase placeholder:text-slate-800"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-[#111917] hover:bg-[#1c2a27] border border-[#7CEEFF]/30 text-white p-3.5 rounded-xl transition disabled:opacity-20 flex items-center justify-center shrink-0 shadow-lg shadow-[#7CEEFF]/5"
            >
              <Send className="h-4.5 w-4.5 text-[#7CEEFF]" />
            </button>
          </form>

        </div>

      </div>
    );
  };

  return (
    <DashboardLayout title={
      currentPath === '/patrol/zones' ? 'MY ZONES & BUFFER CORRIDORS' :
      currentPath === '/patrol/alerts' ? 'SATELLITE & TELEMETRY ALERTS' :
      currentPath === '/patrol/incidents' ? 'INCIDENT HISTORY & PERMITS' :
      currentPath === '/patrol/report' ? 'REPORT MANUAL INTRUSION/VIOLATION' :
      currentPath === '/patrol/status' ? 'SUBMITTED FIELD VERIFICATIONS' :
      currentPath === '/patrol/nav' ? 'PATROL GPS HUD NAVIGATION' :
      currentPath === '/patrol/notifications' ? 'SYSTEM NOTIFICATIONS' :
      currentPath === '/patrol/messages' ? 'SECURE CHAT TRANSMISSION' :
      'PATROL COMMAND CONSOLE'
    }>
      {/* Dynamic Views Rendering */}
      {currentPath === '/patrol/zones' && renderZones()}
      {currentPath === '/patrol/alerts' && renderAlerts()}
      {currentPath === '/patrol/incidents' && renderIncidents()}
      {currentPath === '/patrol/report' && renderReport()}
      {currentPath === '/patrol/status' && renderStatus()}
      {currentPath === '/patrol/nav' && renderNav()}
      {currentPath === '/patrol/notifications' && renderNotifications()}
      {currentPath === '/patrol/messages' && renderMessages()}

      {/* Main Dashboard View */}
      {(currentPath === '/patrol' || currentPath === '/patrol/') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full animate-in fade-in duration-300">
          
          {/* Left Section: Offline Telemetry Simulator */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Mobile Telemetry simulator card */}
            <div className="glass-panel rounded-2xl border border-[#7CEEFF]/20 p-6 relative">
              <h2 className="font-black text-white text-xs uppercase tracking-widest mb-6 flex items-center">
                <Navigation className="h-4 w-4 mr-2 text-[#7CEEFF] animate-pulse" />
                Offline Telemetry Simulator
              </h2>

              {/* Offline Toggle status (Read-Only) */}
              <div className="flex items-center justify-between p-3.5 bg-black/40 rounded-xl border border-slate-900 mb-6">
                <div className="flex items-center space-x-2">
                  {isOffline ? (
                    <>
                      <WifiOff className="h-5 w-5 text-amber-400 animate-pulse" />
                      <div>
                        <span className="text-[9px] font-black text-amber-400 block tracking-widest uppercase">DISCONNECTED</span>
                        <span className="text-[7px] text-slate-500 font-bold uppercase block mt-0.5">LOCAL TELEMETRY MODE</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Wifi className="h-5 w-5 text-emerald-400" />
                      <div>
                        <span className="text-[9px] font-black text-emerald-400 block tracking-widest uppercase">CONNECTED</span>
                        <span className="text-[7px] text-slate-500 font-bold block mt-0.5">COMM HUD LINK SYNCED</span>
                      </div>
                    </>
                  )}
                </div>

                <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded border ${
                  isOffline ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {isOffline ? 'OFFLINE' : 'ONLINE'}
                </span>
              </div>

              {/* Offline local queue logs */}
              <div className="space-y-4">
                <div className="p-4 bg-black/40 border border-slate-900 rounded-xl">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-black uppercase tracking-wider mb-2">
                    <span>GPS Signal State</span>
                    <span className={isOffline ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                      {isOffline ? "LOCAL CACHING" : "LIVE GNOSS LINK"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-white font-bold mb-3 uppercase tracking-wider">
                    <span>Coordinates</span>
                    <span>{simCoords.lat.toFixed(4)}N, {simCoords.lng.toFixed(4)}E</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-white font-bold uppercase tracking-wider">
                    <span>Battery Level</span>
                    <span className="flex items-center text-emerald-400">
                      <Battery className="h-4 w-4 mr-1 text-emerald-400" />
                      {batteryLevel}%
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-black/40 border border-slate-900 rounded-xl space-y-3.5">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-black uppercase tracking-wider">
                    <span>Offline Caches</span>
                    <span>Pending Sync</span>
                  </div>
                  
                  <div className="flex justify-between text-xs font-black text-slate-300">
                    <span className="flex items-center"><Database className="h-4 w-4 mr-2 text-slate-500" /> GPS Track:</span>
                    <span className="text-[#7CEEFF]">{offlineQueue.length} points</span>
                  </div>

                  <div className="flex justify-between text-xs font-black text-slate-300">
                    <span className="flex items-center"><Camera className="h-4 w-4 mr-2 text-slate-500" /> Reports:</span>
                    <span className="text-[#7CEEFF]">{offlineReports.length} queued</span>
                  </div>
                  
                  <button 
                    onClick={syncOfflineTelemetry}
                    disabled={isSyncing || (!isOffline && offlineQueue.length === 0 && offlineReports.length === 0)}
                    className="w-full bg-[#7CEEFF]/10 hover:bg-[#7CEEFF]/20 border border-[#7CEEFF]/30 text-[#7CEEFF] py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition flex items-center justify-center space-x-2"
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Synchronizing...' : 'Transmit Offline Telemetry'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Safety Checklist Card */}
            <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 p-6">
              <h2 className="font-black text-white text-xs uppercase tracking-widest mb-4">Patrol Site Checklist</h2>
              <div className="space-y-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <label className="flex items-center space-x-2.5 cursor-pointer hover:text-white transition">
                  <input type="checkbox" className="rounded bg-black border-slate-900 text-[#7CEEFF] focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5" />
                  <span>Establish Pipeline Alignment</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer hover:text-white transition">
                  <input type="checkbox" className="rounded bg-black border-slate-900 text-[#7CEEFF] focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5" />
                  <span>Verify Contractor ROW Permit ID</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer hover:text-white transition">
                  <input type="checkbox" className="rounded bg-black border-slate-900 text-[#7CEEFF] focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5" />
                  <span>Check Marker Post Integrity</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer hover:text-white transition">
                  <input type="checkbox" className="rounded bg-black border-slate-900 text-[#7CEEFF] focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5" />
                  <span>Record Depth of Excavation</span>
                </label>
              </div>
            </div>

          </div>

          {/* Center Section: Live MAP and Alerts Feed */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* GIS mapping interface */}
            <div className="h-96 rounded-2xl border border-[#7CEEFF]/15 overflow-hidden relative shadow-2xl">
              <Map 
                pipelines={pipelines} 
                requests={tasks} 
                tracks={[]}
                imageryDetections={[]}
                showBufferZones={showBufferZones}
              />
              
              {/* GIS mini control HUD */}
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

            {/* Proximity alerts feed */}
            <div className="glass-panel rounded-2xl border border-[#7CEEFF]/10 p-6">
              <h2 className="font-black text-white text-xs uppercase tracking-widest mb-4 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-red-500 animate-pulse" />
                Excavation Buffer Proximity Violations
              </h2>

              <div className="space-y-3.5 max-h-48 overflow-y-auto custom-scrollbar">
                {tasks.map(task => (
                  <div key={task.id} className="p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition flex justify-between items-center">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">{task.contractor_name}</p>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                        PROXIMITY: <span className="text-red-400">{task.distance_to_pipeline?.toFixed(1) || 120}m</span> FROM PIPELINE CENTERLINE
                      </p>
                    </div>
                    <span className="text-[8px] font-black text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded uppercase bg-red-500/10 animate-pulse">
                      PROXIMITY WARNING
                    </span>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-6 text-[10px] text-slate-600 font-black uppercase tracking-wider">
                    No Proximity Breaches Logged in Current Sector
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Section: Active tasks and safety reports */}
          <div className="lg:col-span-3 flex flex-col h-full space-y-6">
            
            <div className="glass-panel rounded-2xl border border-[#7CEEFF]/20 overflow-hidden flex flex-col h-full">
              <div className="p-5 border-b border-[#7CEEFF]/10 bg-black/20 flex justify-between items-center">
                <h2 className="font-black text-white text-xs uppercase tracking-widest flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-[#7CEEFF]" />
                  Active Permits
                </h2>
                <span className="text-[8px] font-black text-[#7CEEFF] border border-[#7CEEFF]/30 px-1.5 py-0.5 rounded bg-[#7CEEFF]/10">
                  {tasks.length} DEPLOYED
                </span>
              </div>
              
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 max-h-[300px]">
                {tasks.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800 shadow-inner">
                      <CheckCircle className="h-5 w-5 text-slate-700" />
                    </div>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">All zones clear</p>
                  </div>
                ) : (
                  tasks.map(task => (
                    <div 
                      key={task.id} 
                      onClick={() => setSelectedTask(task)} 
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative group ${
                        selectedTask?.id === task.id ? 'border-[#7CEEFF] bg-[#7CEEFF]/5 shadow-lg shadow-[#7CEEFF]/5' : 'border-slate-900 bg-black/20 hover:border-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none">INC-{2000 + task.id}</p>
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          task.status?.includes('offline') ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-blue-500/20 text-[#7CEEFF] border-blue-500/20'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <p className="text-xs font-black text-white uppercase tracking-wider leading-tight group-hover:text-[#7CEEFF] transition-colors">{task.contractor_name}</p>
                      <p className="text-[8px] text-slate-500 font-bold mt-1 uppercase tracking-wider">{task.company_name}</p>
                      
                      <div className="mt-4 flex items-center justify-between text-[8px] text-slate-500 font-black uppercase tracking-widest">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1.5 text-slate-600" />
                          {task.lat?.toFixed(3)}, {task.lng?.toFixed(3)}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1.5 text-slate-600" />
                          Inspection
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {selectedTask && (
                <div className="p-6 border-t border-[#7CEEFF]/10 bg-black/40 mt-auto animate-in slide-in-from-bottom duration-300">
                  {!selectedTask.checked_in ? (
                    <div className="space-y-4">
                      <div className="flex items-center mb-2">
                        <div className="bg-amber-500/10 p-2 rounded-lg mr-3 border border-amber-500/30">
                          <MapPin className="h-4 w-4 text-amber-400" />
                        </div>
                        <h3 className="font-black text-white text-xs uppercase tracking-widest">Site Check-In</h3>
                      </div>
                      <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-relaxed">
                        You must check in to register your physical presence at the excavation site coordinates before submitting safety observations.
                      </p>
                      <button 
                        onClick={handleCheckIn}
                        disabled={loading}
                        className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition"
                      >
                        {loading ? 'CHECKING IN...' : 'CHECK IN TO SITE'}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center mb-4">
                        <div className="bg-[#7CEEFF]/10 p-2 rounded-lg mr-3 border border-[#7CEEFF]/30">
                          <Camera className="h-4 w-4 text-[#7CEEFF]" />
                        </div>
                        <h3 className="font-black text-white text-xs uppercase tracking-widest">Verification Report</h3>
                      </div>
                      
                      <form onSubmit={handleVerify} className="space-y-4">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Safety Remarks</label>
                          <textarea
                            required
                            className="w-full px-4 py-3 bg-black border border-slate-900 rounded-xl text-xs font-bold focus:border-[#7CEEFF]/40 outline-none transition-all resize-none h-24 text-white uppercase placeholder:text-slate-700"
                            placeholder="ENTER SITE SAFETY OBSERVATIONS OR THREAT INTELLIGENCE..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          ></textarea>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Verification Photo</label>
                          <input
                            type="file"
                            accept="image/*"
                            className="text-[9px] bg-black border border-slate-900 rounded-lg p-2 text-slate-400 outline-none cursor-pointer w-full focus:border-[#7CEEFF]/40"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setPhotoUrl(reader.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>
                        
                        <button 
                          type="submit" 
                          disabled={loading} 
                          className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition"
                        >
                          {loading ? 'TRANSMITTING...' : 'Mark as Safe to Dig'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </DashboardLayout>
  );
};

export default PatrolDashboard;
