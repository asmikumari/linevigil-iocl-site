const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler, badRequest, forbidden, notFound } = require('../lib/http');
const { parseLngLat } = require('../lib/geo');
const { classifyRisk } = require('../lib/risk');

const router = express.Router();
router.use(authenticateToken);

const MAX_SYNC_BATCH = 500;
const RISK_LEVELS = ['high', 'medium', 'low'];

const requestIdFrom = (value) => {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id < 1) throw badRequest('Missing or invalid requestId');
  return id;
};

// Permits assigned to the signed-in patrol officer that are still open.
router.get('/tasks', requireRole('patrol'), asyncHandler(async (req, res) => {
  const tasks = await db.findExcavationRequests({ assigned_to: req.user.id, status: { $ne: 'closed' } });
  res.json(tasks);
}));

// Mark a permit safe to dig. Only the assigned officer (or an admin) may verify it.
router.post('/verify', requireRole('patrol', 'admin'), asyncHandler(async (req, res) => {
  const requestId = requestIdFrom(req.body?.requestId);
  const request = await db.findExcavationRequestById(requestId);
  if (!request) throw notFound('Permit not found');
  if (req.user.role === 'patrol' && request.assigned_to !== req.user.id) {
    throw forbidden('This permit is not assigned to you');
  }

  const notes = typeof req.body.notes === 'string' ? req.body.notes.slice(0, 2000) : '';
  const photoUrl = typeof req.body.photoUrl === 'string' ? req.body.photoUrl.slice(0, 2048) : null;
  await db.createVerificationLog({ request_id: requestId, patrol_id: req.user.id, notes, photo_url: photoUrl });
  await db.updateExcavationRequest(requestId, { status: 'Safe to Dig', verified_at: new Date() });
  res.json({ message: 'Verification saved', requestId, status: 'Safe to Dig' });
}));

// Record arrival at an assigned site.
router.post('/check-in', requireRole('patrol'), asyncHandler(async (req, res) => {
  const requestId = requestIdFrom(req.body?.requestId);
  const request = await db.findExcavationRequestById(requestId);
  if (!request) throw notFound('Permit not found');
  if (request.assigned_to !== req.user.id) throw forbidden('This permit is not assigned to you');
  await db.updateExcavationRequest(requestId, { checked_in: true, check_in_time: new Date() });
  res.json({ message: 'Checked in', requestId });
}));

// Admin: every verification on record.
router.get('/verifications', requireRole('admin'), asyncHandler(async (req, res) => {
  res.json(await db.findVerificationLogs());
}));

// Admin: assign or reassign a patrol officer to a permit.
router.post('/assign', requireRole('admin'), asyncHandler(async (req, res) => {
  const requestId = requestIdFrom(req.body?.requestId);
  const patrolId = Number.parseInt(req.body?.patrolId, 10);
  const patrols = await db.findPatrolUsers();
  if (!patrols.some((p) => p.id === patrolId)) throw badRequest('Choose a patrol officer');
  if (!(await db.findExcavationRequestById(requestId))) throw notFound('Permit not found');

  await db.updateExcavationRequest(requestId, { assigned_to: patrolId, status: 'assigned', checked_in: false, check_in_time: null });
  res.json({ message: 'Patrol assigned', requestId, patrolId });
}));

// Patrol officers, for the admin's dispatch list.
router.get('/users', requireRole('admin'), asyncHandler(async (req, res) => {
  res.json(await db.findPatrolUsers());
}));

// Latest patrol positions.
router.get('/tracks', requireRole('admin', 'patrol'), asyncHandler(async (req, res) => {
  res.json(await db.findPatrolTracks());
}));

/*
 * Upload GPS points recorded while offline.
 * Each point may carry a client_id (generated on the device). Points already stored under the same
 * client_id are skipped, so a queue that is re-sent after a timeout is not stored twice.
 */
router.post('/sync-tracks', requireRole('patrol'), asyncHandler(async (req, res) => {
  const { tracks } = req.body || {};
  if (!Array.isArray(tracks)) throw badRequest('Send a tracks array');
  if (tracks.length > MAX_SYNC_BATCH) throw badRequest(`Send at most ${MAX_SYNC_BATCH} points per request`);

  const synced = [];
  const rejected = [];
  const alerts = [];
  let duplicates = 0;

  for (const [index, point] of tracks.entries()) {
    const coords = parseLngLat(point?.lng, point?.lat);
    const recordedAt = point?.recorded_at ? new Date(point.recorded_at) : new Date();
    if (!coords || Number.isNaN(recordedAt.getTime())) {
      rejected.push({ index, reason: 'Invalid coordinates or timestamp' });
      continue;
    }

    const { track, duplicate } = await db.createPatrolTrack({
      patrol_id: req.user.id,
      client_id: typeof point.client_id === 'string' ? point.client_id.slice(0, 64) : undefined,
      location: { type: 'Point', coordinates: [coords.lng, coords.lat] },
      is_offline: Boolean(point.is_offline),
      battery_level: Number.isFinite(point.battery_level) ? Math.max(0, Math.min(100, point.battery_level)) : null,
      signal_strength: typeof point.signal_strength === 'string' ? point.signal_strength.slice(0, 20) : 'unknown',
      recorded_at: recordedAt,
    });
    if (duplicate) {
      duplicates++;
      continue;
    }

    const nearest = await db.findNearestPipeline(coords.lng, coords.lat);
    if (nearest && classifyRisk(nearest.distance_meters) === 'high') {
      alerts.push({
        type: 'proximity',
        message: `${req.user.name || 'Patrol officer'} was ${Math.round(nearest.distance_meters)} m from ${nearest.name}`,
        lat: coords.lat,
        lng: coords.lng,
        time: recordedAt,
      });
    }
    synced.push({
      id: track.id,
      client_id: track.client_id,
      patrol_id: track.patrol_id,
      lng: coords.lng,
      lat: coords.lat,
      is_offline: track.is_offline,
      battery_level: track.battery_level,
      signal_strength: track.signal_strength,
      recorded_at: track.recorded_at,
    });
  }

  if (alerts.length && req.app.get('io')) req.app.get('io').emit('patrol-collision-alerts', alerts);

  res.json({
    message: `Synced ${synced.length} new point${synced.length === 1 ? '' : 's'}`,
    synced: synced.length,
    duplicates,
    rejected,
    tracks: synced,
    alerts,
  });
}));

// Report an incident seen in the field.
router.post('/report-incident', requireRole('patrol', 'admin'), asyncHandler(async (req, res) => {
  const coords = parseLngLat(req.body?.lng, req.body?.lat);
  if (!coords) throw badRequest('Enter a valid latitude and longitude');
  const riskLevel = RISK_LEVELS.includes(req.body.riskLevel) ? req.body.riskLevel : 'high';
  const name = typeof req.body.name === 'string' && req.body.name.trim() ? req.body.name.trim().slice(0, 160) : 'Field report';

  const incident = await db.createImageryDetection({
    name,
    confidence: 1,
    risk_level: riskLevel,
    source: 'patrol-report',
    reported_by: req.user.id,
    location: { type: 'Point', coordinates: [coords.lng, coords.lat] },
  });

  const response = {
    id: incident.id,
    name: incident.name,
    confidence: incident.confidence,
    risk_level: incident.risk_level,
    source: 'patrol-report',
    lng: coords.lng,
    lat: coords.lat,
    detected_at: incident.detected_at,
  };
  if (req.app.get('io')) req.app.get('io').emit('new-anomalies', [response]);
  res.status(201).json(response);
}));

// Verifications logged by the signed-in officer.
router.get('/my-verifications', requireRole('patrol'), asyncHandler(async (req, res) => {
  const logs = await db.findVerificationLogs();
  res.json(logs.filter((l) => l.patrol_id === req.user.id));
}));

module.exports = router;
