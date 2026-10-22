import React from 'react';

// The three IOCL demo routes (same coordinates as the backend's demo data), as [lng, lat].
export const ROUTES = [
  { name: 'Mathura–Jalandhar product line', color: '#f37021', coords: [[77.67, 27.49], [77.5, 28.5], [77.2, 29.5], [76.5, 31.0]] },
  { name: 'Koyali–Sanganer crude line', color: '#ededed', coords: [[73.18, 22.3], [73.5, 23.5], [74.5, 25.5], [75.8, 26.9]] },
  { name: 'Paradip–Haldia gas line', color: '#9aa0c6', coords: [[86.67, 20.27], [87.5, 21.5], [88.2, 22.5]] },
];

// City gas distribution areas from the demo dataset, shown as faint context points.
const CGD_POINTS = [
  [77.67, 27.49], [77.71, 28.98], [81.85, 25.44], [78.57, 25.45], [77.55, 29.97], [77.85, 28.41],
  [77.27, 28.95], [78.09, 27.9], [82.48, 25.26], [81.24, 26.16], [79.52, 26.47], [82.14, 26.78],
  [83.37, 26.76], [77.71, 29.47], [78.77, 28.84], [80.49, 26.54], [78.91, 25.69], [83.19, 26.07], [79.43, 28.37],
];

const W = 600;
const H = 520;
const LNG = [71.5, 89.5];
const LAT = [19, 32.5];

export const project = ([lng, lat]) => [
  20 + ((lng - LNG[0]) / (LNG[1] - LNG[0])) * (W - 40),
  20 + ((LAT[1] - lat) / (LAT[1] - LAT[0])) * (H - 40),
];

const toPath = (coords) => coords.map((c, i) => `${i ? 'L' : 'M'} ${project(c).map((n) => n.toFixed(1)).join(' ')}`).join(' ');

// Draw timing is driven by CSS custom properties so the loader and landing page can share it.
const RouteNetwork = ({ className = '', stagger = 0.45 }) => {
  const graticule = [];
  for (let lng = 72; lng <= 89; lng += 2) {
    const [x] = project([lng, LAT[0]]);
    graticule.push(<line key={`v${lng}`} x1={x} y1={20} x2={x} y2={H - 20} />);
  }
  for (let lat = 20; lat <= 32; lat += 2) {
    const [, y] = project([LNG[0], lat]);
    graticule.push(<line key={`h${lat}`} x1={20} y1={y} x2={W - 20} y2={y} />);
  }

  return (
    <svg className={`lv-network ${className}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <g className="lv-network-grid">{graticule}</g>
      <g className="lv-network-cgd">
        {CGD_POINTS.map((p, i) => {
          const [x, y] = project(p);
          return <circle key={i} cx={x} cy={y} r={2.2} style={{ animationDelay: `${0.25 + i * 0.03}s` }} />;
        })}
      </g>
      {ROUTES.map((r, i) => {
        const [sx, sy] = project(r.coords[0]);
        const [ex, ey] = project(r.coords[r.coords.length - 1]);
        const delay = `${0.15 + i * stagger}s`;
        return (
          <g key={r.name} className="lv-network-route" style={{ '--delay': delay, '--route': r.color }}>
            <path d={toPath(r.coords)} pathLength="1" className="lv-network-glow" />
            <path d={toPath(r.coords)} pathLength="1" className="lv-network-line" />
            <circle cx={sx} cy={sy} r={4} className="lv-network-end" />
            <circle cx={ex} cy={ey} r={4} className="lv-network-end lv-network-end-late" />
          </g>
        );
      })}
    </svg>
  );
};

export default RouteNetwork;
