// Geodesy helpers for proximity checks. Coordinates are [lng, lat] in degrees, distances in metres.

const EARTH_RADIUS_M = 6371008.8; // mean Earth radius (IUGG)
const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance between two points.
function haversine(lng1, lat1, lng2, lat2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Shortest distance from a point to a line segment.
 *
 * The segment is projected onto a local plane centred on the point (equirectangular, with longitude
 * scaled by cos(latitude)), the closest point is found there, and the final distance is measured with
 * haversine. Over pipeline-scale distances (well under 100 km from the point) this stays within a few
 * metres of a full geodesic solution, unlike treating degrees as equal in both directions.
 */
function distanceToSegment(lng, lat, a, b) {
  const kx = Math.cos(toRad(lat)) * (Math.PI / 180) * EARTH_RADIUS_M; // metres per degree of longitude here
  const ky = (Math.PI / 180) * EARTH_RADIUS_M; // metres per degree of latitude
  const ax = (a[0] - lng) * kx;
  const ay = (a[1] - lat) * ky;
  const bx = (b[0] - lng) * kx;
  const by = (b[1] - lat) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
  const nearest = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  return { metres: haversine(lng, lat, nearest[0], nearest[1]), nearest };
}

// Shortest distance from a point to a polyline (array of [lng, lat]).
function distanceToPolyline(lng, lat, coords) {
  let best = { metres: Infinity, nearest: null };
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distanceToSegment(lng, lat, coords[i], coords[i + 1]);
    if (d.metres < best.metres) best = d;
  }
  return best;
}

const isLatitude = (v) => typeof v === 'number' && Number.isFinite(v) && v >= -90 && v <= 90;
const isLongitude = (v) => typeof v === 'number' && Number.isFinite(v) && v >= -180 && v <= 180;

// Accepts numbers or numeric strings; returns { lng, lat } or null if either is missing or out of range.
function parseLngLat(lng, lat) {
  const x = typeof lng === 'string' && lng.trim() !== '' ? Number(lng) : lng;
  const y = typeof lat === 'string' && lat.trim() !== '' ? Number(lat) : lat;
  return isLongitude(x) && isLatitude(y) ? { lng: x, lat: y } : null;
}

module.exports = { EARTH_RADIUS_M, haversine, distanceToSegment, distanceToPolyline, parseLngLat };
