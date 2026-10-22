// Small HTTP helpers: typed errors, an async wrapper and the JSON error handler.

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.expose = true;
    if (details) this.details = details;
  }
}

const badRequest = (message, details) => new HttpError(400, message, details);
const forbidden = (message = 'You do not have access to this action') => new HttpError(403, message);
const notFound = (message = 'Not found') => new HttpError(404, message);
const conflict = (message) => new HttpError(409, message);

// Lets async route handlers throw; Express 5 already forwards rejected promises, this keeps intent explicit.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Express error handler: known errors keep their status and message; anything else is a generic 500.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500 && process.env.NODE_ENV !== 'test') console.error(err);
  const body = { error: err.expose || status < 500 ? err.message : 'Something went wrong on the server' };
  if (err.details) body.details = err.details;
  res.status(status).json(body);
}

module.exports = { HttpError, badRequest, forbidden, notFound, conflict, asyncHandler, errorHandler };
