const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../lib/config');

// 401 when the token is missing or invalid (the client should sign in again).
function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Sign in to continue' });
  }
  let secret;
  try {
    secret = getJwtSecret();
  } catch (err) {
    return next(err);
  }
  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(401).json({ error: 'Your session has expired. Sign in again.' });
    req.user = user;
    next();
  });
}

// 403 when a signed-in user's role may not use the route.
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You do not have access to this action' });
  }
  next();
};

module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.requireRole = requireRole;
