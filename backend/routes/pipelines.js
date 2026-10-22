const express = require('express');
const db = require('../db');
const { asyncHandler } = require('../lib/http');

const router = express.Router();

// All pipeline routes as a GeoJSON FeatureCollection. Public: the routes are shown before sign-in.
router.get('/', asyncHandler(async (req, res) => {
  const pipelines = await db.findPipelineRoutes();
  res.json({
    type: 'FeatureCollection',
    features: pipelines.map((row) => ({
      type: 'Feature',
      properties: { id: row.id, name: row.name, type: row.type },
      geometry: JSON.parse(row.geojson),
    })),
  });
}));

module.exports = router;
