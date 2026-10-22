// End-to-end tests against the real Express app with the in-memory demo dataset.
process.env.NODE_ENV = 'test';
process.env.LINEVIGIL_DB = 'memory';
process.env.AUTH_RATE_LIMIT = '1000';
delete process.env.JWT_SECRET;

const test = require('node:test');
const assert = require('node:assert/strict');
const createApp = require('../app');
const { classifyRisk } = require('../lib/risk');

let server;
let base;

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

async function call(path, { method = 'GET', token, body, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  return { status: res.status, body: await res.json() };
}

const tokens = {};
async function tokenFor(role) {
  if (!tokens[role]) {
    const { body } = await call('/api/auth/login', { method: 'POST', body: { email: `${role}@linevigil.com`, password: 'password123' } });
    tokens[role] = body.token;
  }
  return tokens[role];
}

test('health reports the demo database and risk thresholds', async () => {
  const { status, body } = await call('/api/health');
  assert.equal(status, 200);
  assert.equal(body.database, 'demo-memory');
  assert.deepEqual(body.riskThresholdsMetres, { high: 500, medium: 1000 });
});

test('login: valid credentials return a token; wrong ones get the same 401 message', async () => {
  const ok = await call('/api/auth/login', { method: 'POST', body: { email: 'ADMIN@linevigil.com ', password: 'password123' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.role, 'admin');
  assert.ok(ok.body.token);

  const wrongPassword = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@linevigil.com', password: 'nope' } });
  const unknownUser = await call('/api/auth/login', { method: 'POST', body: { email: 'ghost@linevigil.com', password: 'nope' } });
  assert.equal(wrongPassword.status, 401);
  assert.equal(unknownUser.status, 401);
  assert.equal(wrongPassword.body.error, unknownUser.body.error);

  const missing = await call('/api/auth/login', { method: 'POST', body: {} });
  assert.equal(missing.status, 400);
});

test('signup always creates a contractor, even if another role is requested', async () => {
  const res = await call('/api/auth/signup', {
    method: 'POST',
    body: { name: 'Mallory', email: 'mallory@example.com', password: 'longpassword', role: 'admin' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.role, 'contractor');
  assert.equal(res.body.password, undefined);

  const again = await call('/api/auth/signup', {
    method: 'POST',
    body: { name: 'Mallory', email: 'MALLORY@example.com', password: 'longpassword' },
  });
  assert.equal(again.status, 409);

  const weak = await call('/api/auth/signup', { method: 'POST', body: { name: 'A', email: 'bad', password: 'short' } });
  assert.equal(weak.status, 400);
  assert.ok(weak.body.details.password);
});

test('protected routes: no token or a bad token is 401, the wrong role is 403', async () => {
  assert.equal((await call('/api/excavations/my')).status, 401);
  assert.equal((await call('/api/excavations/my', { token: 'not-a-jwt' })).status, 401);

  const contractor = await tokenFor('contractor');
  assert.equal((await call('/api/excavations', { token: contractor })).status, 403);
  assert.equal((await call('/api/patrol/users', { token: contractor })).status, 403);
  assert.equal((await call('/api/imagery/scan', { method: 'POST', token: contractor, body: {} })).status, 403);
  assert.equal((await call('/api/patrol/assign', { method: 'POST', token: contractor, body: { requestId: 1, patrolId: 2 } })).status, 403);

  const admin = await tokenFor('admin');
  const all = await call('/api/excavations', { token: admin });
  assert.equal(all.status, 200);
  assert.ok(Array.isArray(all.body));
});

test('collision check and permit filing agree on the risk for the same site', async () => {
  const contractor = await tokenFor('contractor');
  const site = { lng: 77.5, lat: 28.5 }; // a vertex of the Mathura–Jalandhar line

  const check = await call('/api/excavations/check-collision', { method: 'POST', token: contractor, body: site });
  assert.equal(check.status, 200);
  assert.ok(check.body.distanceToPipeline < 1);
  assert.equal(check.body.riskLevel, 'high');
  assert.equal(check.body.collisionStatus, 'danger');

  const permit = await call('/api/excavations', {
    method: 'POST',
    token: contractor,
    body: { ...site, companyName: 'Test Infra', workDate: '2026-11-02', purpose: 'Road Construction' },
  });
  assert.equal(permit.status, 201);
  assert.equal(permit.body.risk_level, check.body.riskLevel);
  assert.equal(permit.body.status, 'pending');

  // Farther out, both still use one rule.
  const far = { lng: 77.5 + 0.007, lat: 28.5 }; // roughly 680 m east
  const farCheck = await call('/api/excavations/check-collision', { method: 'POST', token: contractor, body: far });
  assert.equal(farCheck.body.riskLevel, classifyRisk(farCheck.body.distanceToPipeline));
});

test('permit filing validates input', async () => {
  const contractor = await tokenFor('contractor');
  const badCoords = await call('/api/excavations/check-collision', { method: 'POST', token: contractor, body: { lng: 500, lat: 28 } });
  assert.equal(badCoords.status, 400);

  const missingFields = await call('/api/excavations', { method: 'POST', token: contractor, body: { lng: 77.5, lat: 28.5 } });
  assert.equal(missingFields.status, 400);
  assert.ok(missingFields.body.details.companyName);
  assert.ok(missingFields.body.details.workDate);
});

test('only the assigned patrol officer can verify a permit', async () => {
  const patrol1 = await tokenFor('patrol'); // id 2, assigned to permit 2 in the demo data

  const notMine = await call('/api/patrol/verify', { method: 'POST', token: patrol1, body: { requestId: 3, notes: 'x' } });
  assert.equal(notMine.status, 403);

  const missing = await call('/api/patrol/verify', { method: 'POST', token: patrol1, body: { requestId: 999 } });
  assert.equal(missing.status, 404);

  const mine = await call('/api/patrol/verify', { method: 'POST', token: patrol1, body: { requestId: 2, notes: 'Markers intact' } });
  assert.equal(mine.status, 200);
  assert.equal(mine.body.status, 'Safe to Dig');

  const contractor = await tokenFor('contractor');
  assert.equal((await call('/api/patrol/verify', { method: 'POST', token: contractor, body: { requestId: 2 } })).status, 403);
});

test('admin can only assign permits to real patrol officers', async () => {
  const admin = await tokenFor('admin');
  const notPatrol = await call('/api/patrol/assign', { method: 'POST', token: admin, body: { requestId: 1, patrolId: 3 } });
  assert.equal(notPatrol.status, 400);
  const ok = await call('/api/patrol/assign', { method: 'POST', token: admin, body: { requestId: 1, patrolId: 4 } });
  assert.equal(ok.status, 200);
});

test('offline sync is safe to retry: re-sent points are not stored twice', async () => {
  const patrol = await tokenFor('patrol');
  const tracks = [
    { client_id: 'device-a-1', lat: 28.31, lng: 77.52, is_offline: true, battery_level: 80, recorded_at: '2026-10-20T10:00:00Z' },
    { client_id: 'device-a-2', lat: 28.32, lng: 77.52, is_offline: true, battery_level: 79, recorded_at: '2026-10-20T10:00:08Z' },
    { client_id: 'device-a-3', lat: 999, lng: 77.52 },
  ];

  const first = await call('/api/patrol/sync-tracks', { method: 'POST', token: patrol, body: { tracks } });
  assert.equal(first.status, 200);
  assert.equal(first.body.synced, 2);
  assert.equal(first.body.duplicates, 0);
  assert.equal(first.body.rejected.length, 1);

  const retry = await call('/api/patrol/sync-tracks', { method: 'POST', token: patrol, body: { tracks } });
  assert.equal(retry.body.synced, 0);
  assert.equal(retry.body.duplicates, 2);

  const admin = await tokenFor('admin');
  const stored = (await call('/api/patrol/tracks', { token: admin })).body.filter((t) => String(t.client_id).startsWith('device-a-'));
  assert.equal(stored.length, 2);
  assert.ok(stored.every((t) => Number.isFinite(t.lat) && Number.isFinite(t.lng)));
});

test('simulated satellite sweep is labelled and its risk matches its distance', async () => {
  const admin = await tokenFor('admin');
  for (let i = 0; i < 5; i++) {
    const { status, body } = await call('/api/imagery/scan', { method: 'POST', token: admin, body: {} });
    assert.equal(status, 201);
    const [d] = body.detections;
    assert.equal(d.simulated, true);
    assert.equal(d.source, 'simulated-satellite');
    assert.ok(d.distance_to_pipeline <= 1501);
    assert.equal(d.risk_level, classifyRisk(d.distance_to_pipeline));
    assert.ok(Number.isFinite(d.lat) && Number.isFinite(d.lng));
  }
});

test('unknown API routes and invalid JSON get JSON errors', async () => {
  const missing = await call('/api/does-not-exist');
  assert.equal(missing.status, 404);
  assert.match(missing.body.error, /No API route/);

  const broken = await call('/api/auth/login', { method: 'POST', raw: '{not json' });
  assert.equal(broken.status, 400);
  assert.match(broken.body.error, /not valid JSON/);
});

test('demo data agrees with the risk rule: each seeded permit matches a live check at the same spot', async () => {
  const admin = await tokenFor('admin');
  const { body: permits } = await call('/api/excavations', { token: admin });
  assert.ok(permits.length >= 3);
  for (const permit of permits) {
    const check = await call('/api/excavations/check-collision', { method: 'POST', token: admin, body: { lng: permit.lng, lat: permit.lat } });
    assert.equal(check.body.riskLevel, permit.risk_level, `permit ${permit.id}`);
    assert.ok(Math.abs(check.body.distanceToPipeline - permit.distance_to_pipeline) < 1, `permit ${permit.id} distance`);
  }

  const { body: detections } = await call('/api/imagery/detections', { token: admin });
  for (const d of detections.filter((x) => x.source !== 'patrol-report')) {
    assert.equal(d.simulated, true, `detection ${d.id} is labelled simulated`);
  }
});
