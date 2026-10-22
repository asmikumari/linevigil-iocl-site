// Demo pipelines, permits and detections shared by the in-memory store and the MongoDB seeder.
// Distances and risk levels are computed from the geometry with the same rule the API uses,
// so the sample data never disagrees with what a new permit at the same spot would get.
const { distanceToPolyline } = require('./geo');
const { classifyRisk } = require('./risk');

const PIPELINES = [
  { id: 1, name: 'IOCL-PL-01 (Mathura-Jalandhar)', type: 'product', coordinates: [[77.67, 27.49], [77.50, 28.50], [77.20, 29.50], [76.50, 31.00]] },
  { id: 2, name: 'IOCL-PL-02 (Koyali-Sanganer)', type: 'crude', coordinates: [[73.18, 22.30], [73.50, 23.50], [74.50, 25.50], [75.80, 26.90]] },
  { id: 3, name: 'IOCL-PL-03 (Paradip-Haldia)', type: 'gas', coordinates: [[86.67, 20.27], [87.50, 21.50], [88.20, 22.50]] },
];

const PERMITS = [
  { id: 1, contractor_id: 3, contractor_name: 'ABC Infra', company_name: 'Buildwell Ltd.', work_date: '2026-06-12', purpose: 'Road Construction', status: 'pending', lng: 77.588, lat: 28.0, assigned_to: null },
  { id: 2, contractor_id: 3, contractor_name: 'KMC Projects', company_name: 'KMC Infra', work_date: '2026-06-11', purpose: 'Sewer Line', status: 'assigned', lng: 73.403, lat: 23.1, assigned_to: 2 },
  { id: 3, contractor_id: 3, contractor_name: 'KMC Projects', company_name: 'Delhi Roads', work_date: '2026-06-14', purpose: 'Water Pipeline', status: 'assigned', lng: 77.474, lat: 28.6, assigned_to: 4 },
];

// Simulated satellite detections: there is no imagery provider, and these are labelled as such.
const DETECTIONS = [
  { id: 1, name: 'Excavator near right-of-way', confidence: 0.94, lng: 77.538, lat: 28.3 },
  { id: 2, name: 'Soil disturbance', confidence: 0.81, lng: 73.441, lat: 23.25 },
  { id: 3, name: 'Backhoe loader near right-of-way', confidence: 0.88, lng: 77.368, lat: 28.95 },
  { id: 4, name: 'Trench', confidence: 0.75, lng: 87.2, lat: 21.15 },
];

function nearestDistance(lng, lat) {
  return Math.min(...PIPELINES.map((p) => distanceToPolyline(lng, lat, p.coordinates).metres));
}

function scoredPermits() {
  return PERMITS.map((p) => {
    const distance = nearestDistance(p.lng, p.lat);
    return { ...p, distance_to_pipeline: Math.round(distance * 10) / 10, risk_level: classifyRisk(distance), checked_in: false, check_in_time: null, created_at: new Date() };
  });
}

function scoredDetections() {
  return DETECTIONS.map((d) => {
    const distance = nearestDistance(d.lng, d.lat);
    return { ...d, distance_to_pipeline: Math.round(distance * 10) / 10, risk_level: classifyRisk(distance), source: 'simulated-satellite', simulated: true, detected_at: new Date() };
  });
}

module.exports = { PIPELINES, scoredPermits, scoredDetections };
