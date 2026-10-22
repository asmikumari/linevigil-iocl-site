const test = require('node:test');
const assert = require('node:assert/strict');
const { haversine, distanceToSegment, distanceToPolyline, parseLngLat, EARTH_RADIUS_M } = require('../lib/geo');

const metresPerDegLng = (lat) => (Math.PI / 180) * EARTH_RADIUS_M * Math.cos((lat * Math.PI) / 180);

test('haversine: New Delhi to Mumbai is about 1,150 km', () => {
  const d = haversine(77.209, 28.6139, 72.8777, 19.076);
  assert.ok(Math.abs(d - 1_150_000) < 12_000, `got ${Math.round(d)} m`);
});

test('distanceToSegment: a point 1 km east of a north-south line at 28.5° N is 1 km away', () => {
  const lat = 28.5;
  const lng = 77.5 + 1000 / metresPerDegLng(lat);
  const { metres } = distanceToSegment(lng, lat, [77.5, 28], [77.5, 29]);
  assert.ok(Math.abs(metres - 1000) < 2, `got ${metres.toFixed(2)} m`);
});

test('distanceToSegment: the old degrees × 111,320 shortcut overstated east-west distance by ~14%', () => {
  const lat = 28.5;
  const offsetDeg = 1000 / metresPerDegLng(lat);
  const naive = offsetDeg * 111320;
  assert.ok(naive > 1130, `naive ${naive.toFixed(0)} m`);
  const { metres } = distanceToSegment(77.5 + offsetDeg, lat, [77.5, 28], [77.5, 29]);
  assert.ok(Math.abs(metres - 1000) < 2);
});

test('distanceToSegment: beyond the end of a segment, distance is to the endpoint', () => {
  const { metres, nearest } = distanceToSegment(77.5, 29.1, [77.5, 28], [77.5, 29]);
  assert.deepEqual(nearest.map((n) => Number(n.toFixed(6))), [77.5, 29]);
  assert.ok(Math.abs(metres - haversine(77.5, 29.1, 77.5, 29)) < 0.5);
});

test('distanceToPolyline: a point on a vertex is 0 m away', () => {
  const line = [[77.67, 27.49], [77.5, 28.5], [77.2, 29.5]];
  assert.ok(distanceToPolyline(77.5, 28.5, line).metres < 0.01);
});

test('parseLngLat: accepts numbers and numeric strings, rejects bad input', () => {
  assert.deepEqual(parseLngLat(77.2, 28.6), { lng: 77.2, lat: 28.6 });
  assert.deepEqual(parseLngLat('77.2', '28.6'), { lng: 77.2, lat: 28.6 });
  assert.equal(parseLngLat(200, 28), null);
  assert.equal(parseLngLat(77, -91), null);
  assert.equal(parseLngLat('', 28), null);
  assert.equal(parseLngLat(undefined, undefined), null);
  assert.equal(parseLngLat('abc', 28), null);
});
