const express = require('express');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../lib/http');

const router = express.Router();

// City gas distribution area targets and progress (admin analytics).
router.get('/telemetry', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
  res.json(await db.findCGDTelemetry());
}));

module.exports = router;
