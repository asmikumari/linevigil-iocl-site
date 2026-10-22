const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../lib/http');
const { distanceToPolyline, EARTH_RADIUS_M } = require('../lib/geo');
const { classifyRisk } = require('../lib/risk');

const router = express.Router();
router.use(authenticateToken);

const OBJECT_TYPES = ['Hydraulic excavator', 'Backhoe loader', 'Fresh trench', 'Soil disturbance', 'Heavy truck'];

// Every detection on record (satellite simulations and patrol reports).
router.get('/detections', asyncHandler(async (req, res) => {
  res.json(await db.findImageryDetections());
}));

/*
 * Simulated satellite sweep (admin).
 * There is no imagery provider behind this demo, so the sweep places one plausible detection near a
 * pipeline corridor: a random point along a route, offset sideways by up to 1.5 km. Its risk comes from
 * the measured distance, using the same rule as permits, and the response is marked simulated.
 */
router.post('/scan', requireRole('admin'), asyncHandler(async (req, res) => {
  const routes = await db.findPipelineRoutes();
  const route = routes[Math.floor(Math.random() * routes.length)];
  const line = JSON.parse(route.geojson).coordinates;

  const i = Math.floor(Math.random() * (line.length - 1));
  const t = Math.random();
  const [aLng, aLat] = line[i];
  const [bLng, bLat] = line[i + 1];
  const baseLng = aLng + t * (bLng - aLng);
  const baseLat = aLat + t * (bLat - aLat);

  // Offset perpendicular to the segment by 0-1500 m.
  const offset = (Math.random() * 2 - 1) * 1500;
  const mPerDegLat = (Math.PI / 180) * EARTH_RADIUS_M;
  const mPerDegLng = mPerDegLat * Math.cos((baseLat * Math.PI) / 180);
  const dx = (bLng - aLng) * mPerDegLng;
  const dy = (bLat - aLat) * mPerDegLat;
  const len = Math.hypot(dx, dy) || 1;
  const lng = baseLng + ((-dy / len) * offset) / mPerDegLng;
  const lat = baseLat + ((dx / len) * offset) / mPerDegLat;

  const distance = distanceToPolyline(lng, lat, line).metres;
  const detection = await db.createImageryDetection({
    name: OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)],
    confidence: Math.round((0.7 + Math.random() * 0.27) * 100) / 100,
    risk_level: classifyRisk(distance),
    distance_to_pipeline: Math.round(distance),
    source: 'simulated-satellite',
    simulated: true,
    location: { type: 'Point', coordinates: [lng, lat] },
  });

  const response = {
    id: detection.id,
    name: detection.name,
    confidence: detection.confidence,
    risk_level: detection.risk_level,
    distance_to_pipeline: detection.distance_to_pipeline,
    pipeline: route.name,
    source: 'simulated-satellite',
    simulated: true,
    lng,
    lat,
    detected_at: detection.detected_at,
  };

  if (req.app.get('io')) req.app.get('io').emit('new-anomalies', [response]);
  res.status(201).json({ message: 'Simulated satellite sweep complete', simulated: true, detections: [response] });
}));

module.exports = router;
