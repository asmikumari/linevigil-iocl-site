const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyRisk, RISK_THRESHOLDS_M, COLLISION_STATUS } = require('../lib/risk');
const rateLimit = require('../lib/rateLimit');

test('classifyRisk: thresholds at 500 m and 1 km', () => {
  assert.deepEqual(RISK_THRESHOLDS_M, { high: 500, medium: 1000 });
  assert.equal(classifyRisk(0), 'high');
  assert.equal(classifyRisk(499.9), 'high');
  assert.equal(classifyRisk(500), 'medium');
  assert.equal(classifyRisk(999.9), 'medium');
  assert.equal(classifyRisk(1000), 'low');
  assert.equal(classifyRisk(25_000), 'low');
});

test('classifyRisk: rejects invalid distances', () => {
  assert.throws(() => classifyRisk(-1), TypeError);
  assert.throws(() => classifyRisk(NaN), TypeError);
  assert.throws(() => classifyRisk('400'), TypeError);
});

test('collision status follows the risk level', () => {
  assert.deepEqual(COLLISION_STATUS, { high: 'danger', medium: 'warning', low: 'safe' });
});

test('rateLimit: blocks after the limit within the window', () => {
  const limit = rateLimit({ windowMs: 60_000, max: 2 });
  const req = { ip: '10.0.0.1' };
  const statuses = [];
  for (let i = 0; i < 3; i++) {
    let passed = false;
    const res = {
      set() {},
      status(code) { statuses.push(code); return { json() {} }; },
    };
    limit(req, res, () => { passed = true; });
    if (passed) statuses.push('next');
  }
  assert.deepEqual(statuses, ['next', 'next', 429]);
});
