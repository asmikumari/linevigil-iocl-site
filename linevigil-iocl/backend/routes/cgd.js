const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../middleware/auth');

// Get all CGD Geographical Area Targets & Achievements
router.get('/telemetry', authenticateToken, async (req, res) => {
  try {
    const telemetry = await db.findCGDTelemetry();
    res.json(telemetry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
