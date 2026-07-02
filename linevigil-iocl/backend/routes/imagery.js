const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Get All Detections
router.get('/detections', authenticateToken, async (req, res) => {
  try {
    const detections = await db.findImageryDetections();
    res.json(detections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Satellite Imagery Scan Simulation
router.post('/scan', authenticateToken, async (req, res) => {
  const { minLng, minLat, maxLng, maxLat } = req.body;
  
  // Simulated Scan Bounds (fallback if not provided)
  const bounds = {
    minLng: minLng || 73.0,
    minLat: minLat || 21.0,
    maxLng: maxLng || 88.0,
    maxLat: maxLat || 31.0
  };

  // Generate a random mock anomaly in this bounding box
  const lng = bounds.minLng + Math.random() * (bounds.maxLng - bounds.minLng);
  const lat = bounds.minLat + Math.random() * (bounds.maxLat - bounds.minLat);
  
  const anomalyNames = [
    'CAT-345 Hydraulic Excavator',
    'JCB 3DX Eco Backhoe Loader',
    'Unauthorised Soil Excavation Area',
    'Fresh Trench Anomaly',
    'Industrial Truck Intrusion',
    'Sewer Pipeline Encroachment'
  ];
  
  const selectedName = anomalyNames[Math.floor(Math.random() * anomalyNames.length)];
  const confidence = parseFloat((0.75 + Math.random() * 0.23).toFixed(2));
  const riskLevel = confidence > 0.9 ? 'high' : (confidence > 0.82 ? 'medium' : 'low');

  try {
    const newAnomaly = await db.createImageryDetection({
      name: selectedName,
      confidence,
      risk_level: riskLevel,
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    });

    // Format coordinates as flat properties for the frontend
    const anomalyResponse = {
      id: newAnomaly.id,
      name: newAnomaly.name,
      confidence: newAnomaly.confidence,
      risk_level: newAnomaly.risk_level,
      lng: newAnomaly.location ? newAnomaly.location.coordinates[0] : lng,
      lat: newAnomaly.location ? newAnomaly.location.coordinates[1] : lat,
      detected_at: newAnomaly.detected_at
    };

    // Broadcast event via Socket.IO if available
    if (req.app.get('io')) {
      req.app.get('io').emit('new-anomalies', [anomalyResponse]);
    }

    res.status(201).json({
      message: 'Satellite scan completed successfully',
      detections: [anomalyResponse]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
