// Fixed-window rate limiter kept in memory. Good enough to slow down password guessing on a single
// instance; behind several serverless instances each keeps its own count.

function rateLimit({ windowMs, max, message = 'Too many attempts. Try again in a minute.' }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const entry = hits.get(key);
    if (!entry || now - entry.start >= windowMs) {
      hits.set(key, { start: now, count: 1 });
    } else if (++entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.start + windowMs - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    if (hits.size > 10000) {
      for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k);
    }
    next();
  };
}

module.exports = rateLimit;
