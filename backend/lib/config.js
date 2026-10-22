const crypto = require('crypto');

const isProduction = () => process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

let devSecret = null;

// Production must set JWT_SECRET. In development and tests a random per-process secret is used,
// so tokens simply stop working after a restart instead of everyone sharing a guessable key.
function getJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (isProduction()) {
    const err = new Error('JWT_SECRET is not set on the server');
    err.status = 500;
    err.expose = true;
    throw err;
  }
  if (!devSecret) {
    devSecret = crypto.randomBytes(32).toString('hex');
    if (process.env.NODE_ENV !== 'test') console.warn('JWT_SECRET not set; using a temporary development secret.');
  }
  return devSecret;
}

// Comma-separated list of allowed browser origins; unset means any origin (fine for the public demo).
const corsOrigins = () =>
  (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

module.exports = { getJwtSecret, corsOrigins, isProduction };
