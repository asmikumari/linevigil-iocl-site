const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler, badRequest } = require('../lib/http');
const { parseLngLat } = require('../lib/geo');
const { classifyRisk, COLLISION_STATUS, NO_PIPELINE_DISTANCE_M, RISK_THRESHOLDS_M } = require('../lib/risk');

const router = express.Router();
router.use(authenticateToken);

// Distance from a point to the nearest pipeline and the resulting risk, the one calculation every
// permit and collision check goes through.
async function assess(lng, lat) {
  const nearest = await db.findNearestPipeline(lng, lat);
  const distance = nearest ? nearest.distance_meters : NO_PIPELINE_DISTANCE_M;
  return { nearest, distance, riskLevel: classifyRisk(distance) };
}

function readCoords(body) {
  const coords = parseLngLat(body?.lng, body?.lat);
  if (!coords) throw badRequest('Choose a valid location on the map', { lng: 'Longitude -180 to 180', lat: 'Latitude -90 to 90' });
  return coords;
}

// File an excavation permit (contractors).
router.post('/', requireRole('contractor', 'admin'), asyncHandler(async (req, res) => {
  const { lng, lat } = readCoords(req.body);
  const { contractorName, companyName, workDate, purpose } = req.body;

  const errors = {};
  if (typeof companyName !== 'string' || !companyName.trim()) errors.companyName = 'Enter the company name';
  if (typeof workDate !== 'string' || Number.isNaN(Date.parse(workDate))) errors.workDate = 'Choose the work date';
  if (typeof purpose !== 'string' || !purpose.trim()) errors.purpose = 'Choose the work purpose';
  if (Object.keys(errors).length) throw badRequest('Check the highlighted fields', errors);

  const { distance, riskLevel } = await assess(lng, lat);
  const request = await db.createExcavationRequest({
    contractor_id: req.user.id,
    contractor_name: (contractorName || req.user.name || '').toString().slice(0, 120),
    company_name: companyName.trim().slice(0, 120),
    work_date: workDate,
    purpose: purpose.trim().slice(0, 120),
    distance_to_pipeline: Math.round(distance * 10) / 10,
    risk_level: riskLevel,
    status: 'pending',
    location: { type: 'Point', coordinates: [lng, lat] },
    lng,
    lat,
  });

  res.status(201).json(request);
}));

// Live check while a contractor picks a site: same risk rule as filing, plus nearby permits.
router.post('/check-collision', asyncHandler(async (req, res) => {
  const { lng, lat } = readCoords(req.body);
  const { nearest, distance, riskLevel } = await assess(lng, lat);
  const overlapping = await db.findOverlappingRequests(lng, lat, RISK_THRESHOLDS_M.high);

  res.json({
    distanceToPipeline: Math.round(distance * 10) / 10,
    pipelineName: nearest ? nearest.name : 'None',
    riskLevel,
    collisionStatus: COLLISION_STATUS[riskLevel],
    thresholdsMetres: RISK_THRESHOLDS_M,
    overlappingPermits: overlapping,
  });
}));

// All permits (admin and patrol). Contractors use /my.
router.get('/', requireRole('admin', 'patrol'), asyncHandler(async (req, res) => {
  const requests = await db.findExcavationRequests();
  requests.sort((a, b) => b.id - a.id);
  res.json(requests);
}));

// The signed-in contractor's own permits.
router.get('/my', asyncHandler(async (req, res) => {
  const requests = await db.findExcavationRequests({ contractor_id: req.user.id });
  requests.sort((a, b) => b.id - a.id);
  res.json(requests);
}));

module.exports = router;
