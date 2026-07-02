import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Setup Custom Neon Marker Icons using L.divIcon for a futuristic HUD theme
const createMarkerIcon = (color, shadowColor) => {
  return L.divIcon({
    className: 'custom-hud-marker',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8">
        <div class="absolute w-3 h-3 rounded-full" style="background-color: ${color}; box-shadow: 0 0 10px ${shadowColor};"></div>
        <div class="absolute w-6 h-6 rounded-full border border-dashed animate-spin" style="border-color: ${color}90; animation-duration: 6s;"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const defaultIcon = createMarkerIcon('#F37021', '#F37021'); // IOCL Orange
const patrolIcon = createMarkerIcon('#7CEEFF', '#7CEEFF');  // Neon Cyan
const contractorIcon = createMarkerIcon('#86FFD3', '#86FFD3'); // Mint Green

// Target crosshair for AI satellite anomalies
const anomalyIcon = L.divIcon({
  className: 'custom-anomaly-icon',
  html: `
    <div class="relative w-12 h-12 flex items-center justify-center">
      <div class="absolute inset-0 border border-red-500/80 animate-pulse rounded-sm"></div>
      <div class="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-red-500"></div>
      <div class="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-red-500"></div>
      <div class="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-red-500"></div>
      <div class="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-red-500"></div>
      <div class="absolute w-1.5 h-1.5 bg-red-600 rounded-full animate-ping"></div>
      <span class="absolute -bottom-5 text-[8px] bg-red-950/90 text-red-400 font-black border border-red-500/30 px-1 py-0.5 whitespace-nowrap rounded-sm tracking-widest hud-telemetry">OBJ DETECTED</span>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24]
});

// Location Marker Selection Event Listener
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      if (setPosition) {
        setPosition(e.latlng);
      }
    },
  });

  return !position ? null : (
    <Marker 
      position={position} 
      draggable={true}
      icon={contractorIcon}
      eventHandlers={{
        dragend: (e) => {
          setPosition(e.target.getLatLng());
        },
      }}
    >
      <Popup>
        <div className="p-2 hud-telemetry">
          <div className="text-[10px] font-black text-[#86FFD3] uppercase tracking-widest mb-1.5">Selected Excavation Point</div>
          <div className="text-[11px] font-black text-slate-300 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
            LAT: {position.lat.toFixed(6)}<br/>
            LNG: {position.lng.toFixed(6)}
          </div>
          <p className="text-[9px] text-[#7CEEFF] mt-2 font-bold uppercase tracking-wider italic animate-pulse">Ready to deploy. Drag to adjust.</p>
        </div>
      </Popup>
    </Marker>
  );
};

// Sub-component to pan the map programmatically when mapCenter shifts
const ChangeMapCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 9, { animate: true });
    }
  }, [center, map]);
  return null;
};

const Map = ({ 
  pipelines, 
  requests, 
  imageryDetections = [], 
  patrolTracks = [], 
  onLocationSelect, 
  selectedLocation,
  showImageryScan = false,
  showBufferZones = true,
  mapCenter,
  selectedGA
}) => {
  const center = [28.6139, 77.2090]; // Mathura-Jalandhar/Delhi region
  const [mapStyle, setMapStyle] = useState('dark'); // 'dark' or 'satellite'
  const [isLightTheme, setIsLightTheme] = useState(document.body.classList.contains('light'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsLightTheme(document.body.classList.contains('light'));
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Custom Neon Pipeline Line Styles
  const getPipelineStyle = (type, layerType = 'core') => {
    let color = '#F37021'; // Default IOCL Orange
    if (type === 'crude') color = '#F37021'; // Orange
    if (type === 'product') color = '#7CEEFF'; // Cyan glow
    if (type === 'gas') color = '#86FFD3'; // Mint green

    if (layerType === 'core') {
      return { color, weight: 3, opacity: 0.95, lineJoin: 'round', className: 'neon-glow-line' };
    } else if (layerType === 'danger-buffer') {
      return { color: '#ef4444', weight: 16, opacity: 0.15, lineJoin: 'round', className: 'danger-glow-zone' }; // 100m High Risk
    } else {
      return { color: '#eab308', weight: 45, opacity: 0.05, lineJoin: 'round', className: 'warning-glow-zone' }; // 500m Buffer
    }
  };

  return (
    <div className="h-full w-full relative overflow-hidden bg-black">
      
      {/* High-tech Corner HUD Overlays (Polaris style) */}
      <div className="absolute top-4 left-4 z-[1000] pointer-events-none hud-telemetry bg-black/85 border border-[#7CEEFF]/30 px-3 py-2 rounded-xl text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center space-x-2">
        <span className="size-1.5 rounded-full bg-[#7CEEFF] animate-pulse"></span>
        <span>HUD: Operational Corridor</span>
      </div>

      <div className="absolute top-4 right-12 z-[1000] pointer-events-none hud-telemetry bg-black/85 border border-[#F37021]/30 px-3 py-2 rounded-xl text-[8px] font-black text-[#F37021] uppercase tracking-widest flex items-center space-x-2">
        <span className="size-1.5 rounded-full bg-[#F37021] animate-ping" style={{ animationDuration: '2s' }}></span>
        <span>SATELLITE SYNC: ACTIVE</span>
      </div>

      {/* Map Style Selector Widget */}
      <div className="absolute top-16 right-12 z-[1000] hud-telemetry bg-black/85 border border-[#7CEEFF]/30 p-2 rounded-xl text-[8px] font-black uppercase tracking-widest flex flex-col space-y-1.5 pointer-events-auto">
        <span className="text-[6px] text-slate-500 mb-0.5 tracking-wider">MAP RENDERER</span>
        <div className="flex space-x-1">
          <button 
            onClick={() => setMapStyle('dark')}
            className={`px-2 py-1 rounded transition-colors ${
              mapStyle === 'dark' 
                ? 'bg-[#7CEEFF]/20 text-[#7CEEFF] border border-[#7CEEFF]/30' 
                : 'text-slate-500 hover:text-white'
            }`}
          >
            Vector Dark
          </button>
          <button 
            onClick={() => setMapStyle('satellite')}
            className={`px-2 py-1 rounded transition-colors ${
              mapStyle === 'satellite' 
                ? 'bg-[#7CEEFF]/20 text-[#7CEEFF] border border-[#7CEEFF]/30' 
                : 'text-slate-500 hover:text-white'
            }`}
          >
            Google Sat
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none hud-telemetry bg-black/85 border border-slate-900 px-3 py-2 rounded-xl text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
        <div className="flex justify-between gap-4"><span>TARGET MATRIX:</span> <span className="text-white">NCR-HARYANA-UP</span></div>
        <div className="flex justify-between gap-4"><span>PRECISION:</span> <span className="text-[#86FFD3]">±1.2 METERS</span></div>
      </div>

      <div className="absolute bottom-4 right-4 z-[1000] pointer-events-none hud-telemetry bg-black/85 border border-slate-900 px-3 py-2 rounded-xl text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
        <div className="flex justify-between gap-4"><span>ACTIVE PATROLS:</span> <span className="text-[#7CEEFF]">02 ONLINE</span></div>
        <div className="flex justify-between gap-4"><span>TELEMETRY BEATS:</span> <span className="text-white">5.0Hz</span></div>
      </div>

      {/* Decorative corner brackets (Polaris UI HUD markers) */}
      <div className="absolute top-2 left-2 z-[1000] pointer-events-none w-4 h-4 border-t border-l border-[#7CEEFF]/30"></div>
      <div className="absolute top-2 right-2 z-[1000] pointer-events-none w-4 h-4 border-t border-r border-[#7CEEFF]/30"></div>
      <div className="absolute bottom-2 left-2 z-[1000] pointer-events-none w-4 h-4 border-b border-l border-[#7CEEFF]/30"></div>
      <div className="absolute bottom-2 right-2 z-[1000] pointer-events-none w-4 h-4 border-b border-r border-[#7CEEFF]/30"></div>

      {/* AI scanline sweep animation */}
      {showImageryScan && <div className="satellite-scanline"></div>}


      <MapContainer center={center} zoom={7} className="h-full w-full">
        {/* Dynamic Map Tiles switcher */}
        <TileLayer
          key={`${mapStyle}-${isLightTheme}`}
          url={
            mapStyle === 'satellite' 
              ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
              : isLightTheme
                ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          }
          attribution={
            mapStyle === 'satellite' 
              ? '&copy; Google Maps' 
              : isLightTheme
                ? '&copy; <a href="https://carto.com/">CARTO</a>'
                : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }
        />
        
        {/* Render Pipeline Routes and Automated Buffer Zones */}
        {pipelines && pipelines.features && pipelines.features.map((feature, idx) => {
          const coords = feature.geometry.coordinates.map(c => [c[1], c[0]]); // Leaflet wants [lat, lng]
          const type = feature.properties.type;
          
          return (
            <React.Fragment key={`pipe-${feature.properties.id || idx}`}>
              {/* Outer Alert Buffer (500m) */}
              {showBufferZones && (
                <Polyline 
                  positions={coords} 
                  pathOptions={getPipelineStyle(type, 'warning-buffer')} 
                />
              )}
              
              {/* Core Danger Buffer (100m) */}
              {showBufferZones && (
                <Polyline 
                  positions={coords} 
                  pathOptions={getPipelineStyle(type, 'danger-buffer')} 
                />
              )}

              {/* Core Pipeline Line */}
              <GeoJSON 
                data={feature} 
                style={() => getPipelineStyle(type, 'core')}
                onEachFeature={(feat, layer) => {
                  layer.bindPopup(`
                    <div class="p-2 min-w-[150px] hud-telemetry">
                      <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">IOCL Core Asset</div>
                      <div class="text-xs font-black text-[#7CEEFF] uppercase tracking-tight">${feat.properties.name}</div>
                      <div class="mt-2 flex items-center bg-[#111917]/80 p-1.5 rounded border border-emerald-500/20">
                        <span class="w-2 h-2 rounded-full mr-2 animate-pulse" style="background-color: ${getPipelineStyle(type, 'core').color}"></span>
                        <span class="text-[9px] font-black text-[#86FFD3] uppercase tracking-widest">${(type || '').toUpperCase()} TRANSMISSION</span>
                      </div>
                    </div>
                  `);
                }}
              />
            </React.Fragment>
          );
        })}

        {/* Render Active Excavation Requests */}
        {requests && requests.map(req => (
          <React.Fragment key={`req-${req.id}`}>
            {/* Visual safety zones around digging points */}
            {req.status !== 'closed' && (
              <Circle 
                center={[req.lat, req.lng]}
                radius={200}
                pathOptions={{ 
                  fillColor: req.risk_level === 'high' ? '#ef4444' : '#f59e0b',
                  color: req.risk_level === 'high' ? '#ef4444' : '#f59e0b',
                  weight: 1,
                  fillOpacity: 0.12,
                  dashArray: '4, 6'
                }}
              />
            )}
            
            <Marker position={[req.lat, req.lng]} icon={req.status === 'verified' ? patrolIcon : defaultIcon}>
              <Popup>
                <div className="p-3 min-w-[200px] hud-telemetry">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">PERMIT ID</p>
                      <h3 className="font-black text-xs text-[#7CEEFF] uppercase tracking-tight">EXC-{1000 + req.id}</h3>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                      req.risk_level === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                      req.risk_level === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 
                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {req.risk_level} RISK
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-3 bg-slate-950/80 p-2.5 rounded-lg border border-slate-900">
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest block">CONTRACTOR</span>
                      <span className="text-[10px] font-black text-white uppercase">{req.contractor_name}</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest block">WORK PURPOSE</span>
                      <span className="text-[10px] font-black text-slate-300 uppercase italic">"{req.purpose}"</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 pt-2 border-t border-slate-900">
                    <span>Status: <span className="text-[#86FFD3]">{(req.status || '').toUpperCase()}</span></span>
                    <span>Proximity: <span className="text-[#F37021]">{Math.round(req.distance_to_pipeline || 0)}m</span></span>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Render Satellite Imagery AI Anomalies */}
        {imageryDetections && imageryDetections.map(anom => (
          <Marker 
            key={`anom-${anom.id}`} 
            position={[anom.lat, anom.lng]} 
            icon={anomalyIcon}
          >
            <Popup>
              <div className="p-3 min-w-[200px] hud-telemetry">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-widest block">SATELLITE WARNING</span>
                    <h3 className="font-black text-xs text-white uppercase tracking-tight">{anom.name}</h3>
                  </div>
                  <span className="text-[9px] bg-red-950/80 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded font-black">
                    {(anom.confidence * 100).toFixed(0)}% CONF
                  </span>
                </div>
                <p className="text-[9px] text-slate-300 bg-red-950/20 border border-red-500/10 p-2 rounded mb-3">
                  AI threat evaluation indicates excavation machinery within pipeline buffer zones.
                </p>
                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 border-t border-slate-900 pt-2 uppercase">
                  <span>Threat: <span className="text-red-500">CRITICAL</span></span>
                  <span>Coords: <span className="text-slate-200">{anom.lat.toFixed(3)}, {anom.lng.toFixed(3)}</span></span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Patrol Telemetry Tracks */}
        {patrolTracks && patrolTracks.map((track, idx) => (
          <React.Fragment key={`track-${track.id || idx}`}>
            {/* Draw a pulsing circle for the actual current/last position of the vehicle */}
            {idx === 0 && (
              <Circle 
                center={[track.lat, track.lng]}
                radius={300}
                pathOptions={{ 
                  fillColor: '#7CEEFF',
                  color: '#7CEEFF',
                  weight: 1,
                  fillOpacity: 0.1,
                  className: 'radar-glow-ring'
                }}
              />
            )}
            
            <Marker 
              position={[track.lat, track.lng]} 
              icon={patrolIcon}
            >
              <Popup>
                <div className="p-3 min-w-[180px] hud-telemetry">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] text-[#7CEEFF] font-black uppercase tracking-widest">Patrol Vehicle</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                      track.is_offline ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {track.is_offline ? 'Offline Synced' : 'Online'}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[10px] font-bold text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-900">
                    <div className="flex justify-between"><span>Battery:</span> <span className="text-white">{track.battery_level}%</span></div>
                    <div className="flex justify-between"><span>Signal:</span> <span className="text-white uppercase">{track.signal_strength}</span></div>
                    <div className="flex justify-between"><span>Last Sync:</span> <span className="text-white">{new Date(track.recorded_at).toLocaleTimeString()}</span></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Selection Marker for New Requests */}
        <LocationMarker position={selectedLocation} setPosition={onLocationSelect} />

        {/* Pan Controller */}
        <ChangeMapCenter center={mapCenter} />

        {/* Render Selected CGD GA Sonar Indicator */}
        {selectedGA && (
          <>
            <Circle 
              center={[selectedGA.lat, selectedGA.lng]}
              radius={8000}
              pathOptions={{
                fillColor: '#86FFD3',
                color: '#86FFD3',
                weight: 1.5,
                fillOpacity: 0.05,
                className: 'sonar-ping-ring'
              }}
            />
            <Circle 
              center={[selectedGA.lat, selectedGA.lng]}
              radius={4000}
              pathOptions={{
                fillColor: '#86FFD3',
                color: '#86FFD3',
                weight: 2,
                fillOpacity: 0.1,
                className: 'radar-glow-ring'
              }}
            />
            <Marker 
              position={[selectedGA.lat, selectedGA.lng]}
              icon={L.divIcon({
                className: 'custom-hud-marker',
                html: `
                  <div class="relative flex items-center justify-center w-8 h-8">
                    <div class="absolute w-3.5 h-3.5 rounded-full" style="background-color: #86FFD3; box-shadow: 0 0 12px #86FFD3;"></div>
                    <div class="absolute w-7 h-7 rounded-full border border-dashed animate-spin" style="border-color: #86FFD390; animation-duration: 4s;"></div>
                  </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })}
            >
              <Popup>
                <div className="p-3 min-w-[200px] hud-telemetry">
                  <span className="text-[8px] font-black text-[#86FFD3] uppercase tracking-widest block">CGD GEOGRAPHICAL AREA</span>
                  <h3 className="font-black text-xs text-white uppercase tracking-tight mb-2">{selectedGA.ga_name}</h3>
                  <div className="space-y-1.5 text-[9px] font-bold text-slate-300 bg-slate-950/80 p-2 rounded border border-slate-900">
                    <div><span className="text-slate-500">DISTRICT:</span> <span className="text-white uppercase">{selectedGA.district_covered}</span></div>
                    <div><span className="text-slate-500">ENTITY:</span> <span className="text-[#7CEEFF] uppercase">{selectedGA.authorized_entity}</span></div>
                    <div><span className="text-slate-500">TARGET DATE:</span> <span className="text-white">{selectedGA.date_target_completion}</span></div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default Map;
