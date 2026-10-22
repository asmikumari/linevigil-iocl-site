const express = require('express');
const cors = require('cors');
require('dotenv').config({ quiet: true });

const db = require('./db');
const { corsOrigins } = require('./lib/config');
const { errorHandler, notFound } = require('./lib/http');
const { RISK_THRESHOLDS_M } = require('./lib/risk');

const authRoutes = require('./routes/auth');
const excavationRoutes = require('./routes/excavations');
const pipelineRoutes = require('./routes/pipelines');
const patrolRoutes = require('./routes/patrol');
const imageryRoutes = require('./routes/imagery');
const cgdRoutes = require('./routes/cgd');

// Builds the Express app without starting a server, so tests and Vercel can use it directly.
function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    });
    next();
  });

  const origins = corsOrigins();
  app.use(cors(origins.length ? { origin: origins } : {}));
  app.use(express.json({ limit: '1mb' }));

  if (process.env.NODE_ENV !== 'test') {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`));
      next();
    });
  }

  // No request runs until the data layer has decided between MongoDB and the demo dataset.
  app.use(async (req, res, next) => {
    await db.ready;
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      database: db.isMock() ? 'demo-memory' : 'mongodb',
      riskThresholdsMetres: RISK_THRESHOLDS_M,
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/excavations', excavationRoutes);
  app.use('/api/pipelines', pipelineRoutes);
  app.use('/api/patrol', patrolRoutes);
  app.use('/api/imagery', imageryRoutes);
  app.use('/api/cgd', cgdRoutes);

  app.get('/', (req, res) => res.json({ name: 'LineVigil API', health: '/api/health' }));
  app.use('/api', (req, res, next) => next(notFound(`No API route for ${req.method} ${req.originalUrl}`)));
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
