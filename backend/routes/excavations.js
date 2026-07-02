const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Add Excavation Request
router.post('/', authenticateToken, async (req, res) => {
  const { contractorName, companyName, workDate, purpose, lng, lat } = req.body;
  const contractorId = req.user.id;

  try {
    // 1. Calculate risk using GIS helper
    const nearest = await db.findNearestPipeline(lng, lat);
    
    let distance = 5000; // default safe distance
    let riskLevel = 'low';

    if (nearest) {
      distance = nearest.distance_meters;
      if (distance < 500) riskLevel = 'high';
      else if (distance < 1000) riskLevel = 'medium';
    }

    // 2. Insert request
    const newRequest = await db.createExcavationRequest({
      contractor_id: contractorId,
      contractor_name: contractorName,
      company_name: companyName,
      work_date: workDate,
      purpose,
      distance_to_pipeline: distance,
      risk_level: riskLevel,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      }
    });

    res.status(201).json(newRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Check Collision and Buffer zones (Real-time HUD)
router.post('/check-collision', authenticateToken, async (req, res) => {
  const { lng, lat } = req.body;
  if (!lng || !lat) {
    return res.status(400).json({ error: 'Coordinates missing' });
  }

  try {
    let distance = 5000;
    let pipelineName = 'None';
    
    // Find nearest pipeline route
    const nearest = await db.findNearestPipeline(lng, lat);
    if (nearest) {
      distance = nearest.distance_meters;
      pipelineName = nearest.name;
    }

    // Find overlapping permits within 500m
    const overlapping = await db.findOverlappingRequests(lng, lat, 500);

    let riskLevel = 'low';
    let collisionStatus = 'safe';

    if (distance < 100) {
      riskLevel = 'high';
      collisionStatus = 'danger';
    } else if (distance < 500) {
      riskLevel = 'medium';
      collisionStatus = 'warning';
    }

    res.json({
      distanceToPipeline: distance,
      pipelineName,
      riskLevel,
      collisionStatus,
      overlappingPermits: overlapping
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Requests (Admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const requests = await db.findExcavationRequests();
    // Sort descending by id or created_at (mock fallback doesn't have MongoDB sort)
    requests.sort((a, b) => b.id - a.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get User's Requests
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const requests = await db.findExcavationRequests({ contractor_id: req.user.id });
    requests.sort((a, b) => b.id - a.id);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
