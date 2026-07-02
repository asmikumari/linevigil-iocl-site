const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Get assigned tasks for patrol
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await db.findExcavationRequests({
      assigned_to: req.user.id,
      status: { $ne: 'closed' }
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify task (Marks as Safe to Dig)
router.post('/verify', authenticateToken, async (req, res) => {
  const { requestId, notes, photoUrl } = req.body;
  try {
    await db.createVerificationLog({
      request_id: parseInt(requestId),
      patrol_id: req.user.id,
      notes,
      photo_url: photoUrl
    });
    await db.updateExcavationRequest(requestId, { status: 'Safe to Dig' });
    res.json({ message: 'Verification successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check in to task
router.post('/check-in', authenticateToken, async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await db.findExcavationRequestById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized: This task is not assigned to you' });
    }
    await db.updateExcavationRequest(requestId, {
      checked_in: true,
      check_in_time: new Date()
    });
    res.json({ message: 'Checked in successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get all verification logs
router.get('/verifications', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  try {
    const logs = await db.findVerificationLogs();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Assign / Reassign patrol
router.post('/assign', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  const { requestId, patrolId } = req.body;
  try {
    await db.updateExcavationRequest(requestId, {
      assigned_to: parseInt(patrolId),
      status: 'assigned',
      checked_in: false,
      check_in_time: null
    });
    res.json({ message: 'Patrol assigned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all patrol users
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await db.findPatrolUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Patrol Tracks
router.get('/tracks', authenticateToken, async (req, res) => {
  try {
    const tracks = await db.findPatrolTracks();
    res.json(tracks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync Offline Tracking Logs
router.post('/sync-tracks', authenticateToken, async (req, res) => {
  const { tracks } = req.body;
  if (!tracks || !Array.isArray(tracks)) {
    return res.status(400).json({ error: 'Tracks array missing' });
  }

  const patrolId = req.user.id;
  const syncedTracks = [];
  const collisionAlerts = [];

  try {
    for (const track of tracks) {
      const { lat, lng, is_offline, battery_level, signal_strength } = track;
      
      const newTrack = await db.createPatrolTrack({
        patrol_id: patrolId,
        location: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        },
        is_offline: is_offline || false,
        battery_level: battery_level || 100,
        signal_strength: signal_strength || 'good',
        recorded_at: track.recorded_at ? new Date(track.recorded_at) : new Date()
      });

      // Format flat track response for client mapping
      const trackResponse = {
        id: newTrack.id,
        patrol_id: newTrack.patrol_id,
        is_offline: newTrack.is_offline,
        battery_level: newTrack.battery_level,
        signal_strength: newTrack.signal_strength,
        lng: newTrack.location ? newTrack.location.coordinates[0] : lng,
        lat: newTrack.location ? newTrack.location.coordinates[1] : lat,
        recorded_at: newTrack.recorded_at
      };

      // Check collision hazard with nearest pipeline
      const nearest = await db.findNearestPipeline(lng, lat);
      if (nearest && nearest.distance_meters < 100) {
        collisionAlerts.push({
          type: 'Critical Proximity Alert',
          message: `Patrol Officer ${req.user.name} reported near ${nearest.name || 'pipeline'} within ${Math.round(nearest.distance_meters)}m (Offline Tracked)`,
          lat,
          lng,
          time: new Date()
        });
      }
      
      syncedTracks.push(trackResponse);
    }

    // Broadcast WebSocket Alerts if there are proximity issues
    if (collisionAlerts.length > 0 && req.app.get('io')) {
      req.app.get('io').emit('patrol-collision-alerts', collisionAlerts);
    }

    res.json({
      message: `Telemetry sync complete. ${syncedTracks.length} points synced successfully.`,
      tracks: syncedTracks,
      alerts: collisionAlerts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Report incident manually (Patrol)
router.post('/report-incident', authenticateToken, async (req, res) => {
  const { name, riskLevel, lat, lng, confidence } = req.body;
  try {
    const newAnomaly = await db.createImageryDetection({
      name: name || 'Manual Patrol Intrusion Report',
      confidence: parseFloat(confidence || 0.95),
      risk_level: riskLevel || 'high',
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      }
    });

    const response = {
      id: newAnomaly.id,
      name: newAnomaly.name,
      confidence: newAnomaly.confidence,
      risk_level: newAnomaly.risk_level,
      lng: parseFloat(lng),
      lat: parseFloat(lat),
      detected_at: newAnomaly.detected_at
    };

    if (req.app.get('io')) {
      req.app.get('io').emit('new-anomalies', [response]);
    }

    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get verifications logged by current patrol officer
router.get('/my-verifications', authenticateToken, async (req, res) => {
  try {
    const logs = await db.findVerificationLogs();
    const myLogs = logs.filter(l => l.patrol_id === req.user.id);
    res.json(myLogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
