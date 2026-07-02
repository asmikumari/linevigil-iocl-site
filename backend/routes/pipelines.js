const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all pipeline routes as GeoJSON
router.get('/', async (req, res) => {
  try {
    const pipelines = await db.findPipelineRoutes();
    
    const features = pipelines.map(row => ({
      type: 'Feature',
      properties: {
        id: row.id,
        name: row.name,
        type: row.type
      },
      geometry: JSON.parse(row.geojson)
    }));

    res.json({
      type: 'FeatureCollection',
      features: features
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
