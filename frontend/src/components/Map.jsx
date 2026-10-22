import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, GeoJSON, Circle, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../motion.css';
import '../app.css';
import L from 'leaflet';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Basemap: CARTO's dark tiles need a free Basemaps API key (https://carto.com/basemaps/apikey), passed as ?key=.
// Set VITE_CARTO_API_KEY in frontend/.env locally and in the Vercel project; without it the map uses Esri's
// keyless dark basemap so it never shows the "API key required" watermark.
const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY;
const BASEMAP = CARTO_KEY
  ? {
      url: `https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }
  : {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>, HERE, Garmin, &copy; OpenStreetMap contributors',
    };

const RISK_COLOR ={ high: 'var(--high)', medium: 'var(--medium)', low: 'var(--low)' };
const PIPE_COLOR = { product: '#f37021', crude: '#ededed', gas: '#9097a0' };

// Markers are plain HTML so they can use the app's CSS animations (scale-in, radar rings).
const dotIcon = ({ color, solid = false, rings = 0, delay = 0 }) =>
  L.divIcon({
    className: 'lv-marker',
    html: `<div class="lv-mk" style="--c:${color};--d:${delay}s">
      ${rings ? '<span class="lv-mk-ring"></span>' : ''}${rings > 1 ? '<span class="lv-mk-ring two"></span>' : ''}
      <span class="lv-mk-dot${solid ? ' is-solid' : ''}"></span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -10],
  });

const detectionIcon = (confidence, delay) =>
  L.divIcon({
    className: 'lv-marker',
    html: `<div class="lv-mk" style="--c:var(--high);--d:${delay}s">
      <span class="lv-mk-ring"></span><span class="lv-mk-ring two"></span>
      <span class="lv-mk-detect"></span>
      <span class="lv-mk-label">${Math.round((confidence || 0) * 100)}%</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -12],
  });

const pickIcon = L.divIcon({
  className: 'lv-marker',
  html: '<div class="lv-mk"><span class="lv-mk-pick"></span></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -12],
});

const riskTag = (risk) => `lv-tag lv-mono ${risk === 'high' ? 'is-high' : risk === 'medium' ? 'is-medium' : risk === 'low' ? 'is-low' : 'is-neutral'}`;

// Contractor picks a dig site by clicking the map.
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      if (setPosition) setPosition(e.latlng);
    },
  });

  return !position ? null : (
    <Marker
      position={position}
      draggable
      icon={pickIcon}
      eventHandlers={{ dragend: (e) => setPosition(e.target.getLatLng()) }}
    >
      <Popup>
        <div className="lv-pop">
          <div>
            <span className="lv-pop-kicker lv-mono">Selected dig site</span>
            <h3>{position.lat.toFixed(5)}° N, {position.lng.toFixed(5)}° E</h3>
          </div>
          <p>Drag the marker to adjust the site.</p>
        </div>
      </Popup>
    </Marker>
  );
};

// Pans to a new centre when the parent asks for one.
const ChangeMapCenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 9, { duration: reducedMotion() ? 0 : 1.1 });
  }, [center, map]);
  return null;
};

// Camera intro: start wide, then glide into the corridor.
const FlyIn = ({ to, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (reducedMotion()) { map.setView(to, zoom); return undefined; }
    const id = setTimeout(() => map.flyTo(to, zoom, { duration: 1.6, easeLinearity: 0.2 }), 150);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

// Live cursor coordinates for the readout.
const CursorTracker = ({ onMove }) => {
  useMapEvents({
    mousemove(e) { onMove(e.latlng); },
    mouseout() { onMove(null); },
  });
  return null;
};

// Draw each pipeline along its length once, when the map first shows it.
const drawOnAdd = (layer) => {
  layer.once('add', () => {
    const el = layer.getElement?.();
    if (!el || typeof el.getTotalLength !== 'function' || reducedMotion()) return;
    el.style.setProperty('--len', el.getTotalLength());
    el.classList.add('lv-map-draw');
    el.addEventListener('animationend', () => el.classList.remove('lv-map-draw'), { once: true });
  });
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
  selectedGA,
}) => {
  const center = [28.6139, 77.209];
  const [mapStyle, setMapStyle] = useState('dark');
  const [cursor, setCursor] = useState(null);
  const frameRef = useRef(0);

  const onCursor = (latlng) => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setCursor(latlng));
  };

  const routeCount = pipelines?.features?.length || 0;
  const permitCount = requests?.filter((r) => r.status !== 'closed').length || 0;
  const detectionCount = imageryDetections?.length || 0;
  const trackLine = patrolTracks?.length > 1 ? patrolTracks.map((t) => [t.lat, t.lng]) : null;

  return (
    <div className={`lv-map ${mapStyle === 'satellite' ? 'is-sat' : 'is-dark'}`}>
      <div className="lv-map-chip lv-mono">
        <span><strong>{routeCount}</strong> routes</span>
        {permitCount > 0 && <span><strong>{permitCount}</strong> permits</span>}
        {detectionCount > 0 && <span><strong>{detectionCount}</strong> detections</span>}
      </div>

      <div className="lv-map-switch" role="group" aria-label="Map style">
        <button type="button" aria-pressed={mapStyle === 'dark'} onClick={() => setMapStyle('dark')}>Map</button>
        <button type="button" aria-pressed={mapStyle === 'satellite'} onClick={() => setMapStyle('satellite')}>Satellite</button>
      </div>

      <div className="lv-map-coords lv-mono" aria-live="off">
        {cursor
          ? <>{cursor.lat.toFixed(4)}° N <span>/</span> {cursor.lng.toFixed(4)}° E</>
          : <span>Move over the map for coordinates</span>}
      </div>

      <div className="lv-map-legend lv-mono" aria-hidden="true">
        <div><i className="k-pipe" />Pipeline</div>
        {showBufferZones && <div><i className="k-band" />500 m band</div>}
        {requests?.length > 0 && <div><i className="k-permit" />Permit</div>}
        {patrolTracks?.length > 0 && <div><i className="k-patrol" />Patrol</div>}
        {detectionCount > 0 && <div><i className="k-detect" />Detection</div>}
      </div>

      {showImageryScan && <div className="satellite-scanline" />}

      <MapContainer center={center} zoom={5} zoomControl className="h-full w-full">
        <FlyIn to={center} zoom={7} />
        <CursorTracker onMove={onCursor} />

        <TileLayer
          key={mapStyle}
          url={mapStyle === 'satellite' ? 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' : BASEMAP.url}
          attribution={mapStyle === 'satellite' ? '&copy; Google' : BASEMAP.attribution}
        />

        {/* Pipelines: buffer bands, the line itself, then a slow product-flow overlay. */}
        {pipelines?.features?.map((feature, idx) => {
          const coords = feature.geometry.coordinates.map((c) => [c[1], c[0]]);
          const type = feature.properties.type;
          const color = PIPE_COLOR[type] || '#f37021';
          return (
            <React.Fragment key={`pipe-${feature.properties.id || idx}`}>
              {showBufferZones && (
                <>
                  <Polyline positions={coords} pathOptions={{ color: '#f37021', weight: 34, opacity: 0.05, lineJoin: 'round', lineCap: 'round', interactive: false }} />
                  <Polyline positions={coords} pathOptions={{ color: '#e5484d', weight: 14, opacity: 0.09, lineJoin: 'round', lineCap: 'round', interactive: false }} />
                </>
              )}
              <GeoJSON
                data={feature}
                style={() => ({ color, weight: 2.5, opacity: 1, lineJoin: 'round', lineCap: 'round' })}
                onEachFeature={(feat, layer) => {
                  drawOnAdd(layer);
                  layer.bindPopup(`
                    <div class="lv-pop">
                      <div>
                        <span class="lv-pop-kicker lv-mono">IOCL pipeline</span>
                        <h3>${feat.properties.name}</h3>
                      </div>
                      <dl class="lv-mono">
                        <dt>Product</dt><dd>${feat.properties.type || 'n/a'}</dd>
                        <dt>Buffer</dt><dd>500 m / 1 km</dd>
                      </dl>
                    </div>
                  `);
                }}
              />
              {!reducedMotion() && (
                <Polyline positions={coords} pathOptions={{ color: '#ffffff', weight: 2, opacity: 0.55, lineCap: 'round', className: 'lv-flow', interactive: false }} />
              )}
            </React.Fragment>
          );
        })}

        {/* Excavation permits: a dashed safety circle and a risk-coloured marker. Pending ones pulse. */}
        {requests?.map((req, i) => (
          <React.Fragment key={`req-${req.id}`}>
            {req.status !== 'closed' && (
              <Circle
                center={[req.lat, req.lng]}
                radius={200}
                pathOptions={{
                  color: req.risk_level === 'high' ? '#e5484d' : req.risk_level === 'medium' ? '#e8a23a' : '#4fb286',
                  weight: 1,
                  fillOpacity: 0.08,
                  dashArray: '3 5',
                }}
              />
            )}
            <Marker
              position={[req.lat, req.lng]}
              icon={dotIcon({
                color: RISK_COLOR[req.risk_level] || 'var(--paper)',
                solid: req.status === 'verified' || req.status === 'approved',
                rings: req.status === 'pending' ? 1 : 0,
                delay: 1.2 + i * 0.08,
              })}
            >
              <Popup>
                <div className="lv-pop">
                  <div className="lv-pop-head">
                    <div>
                      <span className="lv-pop-kicker lv-mono">Permit</span>
                      <h3>EXC-{1000 + req.id}</h3>
                    </div>
                    <span className={riskTag(req.risk_level)}>{req.risk_level} risk</span>
                  </div>
                  <dl className="lv-mono">
                    <dt>Contractor</dt><dd>{req.contractor_name}</dd>
                    <dt>Purpose</dt><dd>{req.purpose}</dd>
                    <dt>Status</dt><dd>{req.status}</dd>
                    <dt>Distance</dt><dd>{Math.round(req.distance_to_pipeline || 0)} m</dd>
                  </dl>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        {/* Satellite detections: a red diamond with radar rings and its confidence. */}
        {imageryDetections?.filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lng)).map((anom, i) => (
          <Marker key={`anom-${anom.id}`} position={[anom.lat, anom.lng]} icon={detectionIcon(anom.confidence, 1.4 + i * 0.1)}>
            <Popup>
              <div className="lv-pop">
                <div className="lv-pop-head">
                  <div>
                    <span className="lv-pop-kicker lv-mono">Satellite detection</span>
                    <h3>{anom.name}</h3>
                  </div>
                  <span className={riskTag(anom.risk_level)}>{Math.round((anom.confidence || 0) * 100)}%</span>
                </div>
                <p>Possible excavation machinery inside the pipeline buffer.</p>
                <dl className="lv-mono">
                  <dt>Severity</dt><dd>{anom.risk_level || 'n/a'}</dd>
                  <dt>Location</dt><dd>{anom.lat.toFixed(3)}, {anom.lng.toFixed(3)}</dd>
                </dl>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Patrol: the travelled track as a moving dashed line, and the latest position with a halo. */}
        {trackLine && (
          <Polyline positions={trackLine} pathOptions={{ color: '#ededed', weight: 1.5, opacity: 0.7, className: 'lv-track', interactive: false }} />
        )}
        {patrolTracks?.map((track, idx) => (
          <Marker
            key={`track-${track.id || idx}`}
            position={[track.lat, track.lng]}
            icon={dotIcon({ color: 'var(--paper)', solid: true, rings: idx === patrolTracks.length - 1 ? 2 : 0, delay: 1.3 + idx * 0.06 })}
          >
            <Popup>
              <div className="lv-pop">
                <div className="lv-pop-head">
                  <div>
                    <span className="lv-pop-kicker lv-mono">Patrol position</span>
                    <h3>{new Date(track.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</h3>
                  </div>
                  <span className={riskTag(track.is_offline ? 'medium' : 'low')}>{track.is_offline ? 'Synced later' : 'Live'}</span>
                </div>
                <dl className="lv-mono">
                  <dt>Battery</dt><dd>{track.battery_level}%</dd>
                  <dt>Signal</dt><dd>{track.signal_strength}</dd>
                </dl>
              </div>
            </Popup>
          </Marker>
        ))}

        <LocationMarker position={selectedLocation} setPosition={onLocationSelect} />
        <ChangeMapCenter center={mapCenter} />

        {/* Selected city gas distribution area. */}
        {selectedGA && (
          <>
            <Circle center={[selectedGA.lat, selectedGA.lng]} radius={8000} pathOptions={{ color: '#ededed', weight: 1, fillOpacity: 0.03, dashArray: '3 6', className: 'lv-ga-ring' }} />
            <Marker position={[selectedGA.lat, selectedGA.lng]} icon={dotIcon({ color: 'var(--paper)', solid: true, rings: 2 })}>
              <Popup>
                <div className="lv-pop">
                  <div>
                    <span className="lv-pop-kicker lv-mono">City gas distribution area</span>
                    <h3>{selectedGA.ga_name}</h3>
                  </div>
                  <dl className="lv-mono">
                    <dt>District</dt><dd>{selectedGA.district_covered}</dd>
                    <dt>Operator</dt><dd>{selectedGA.authorized_entity}</dd>
                    <dt>Target date</dt><dd>{selectedGA.date_target_completion}</dd>
                  </dl>
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
