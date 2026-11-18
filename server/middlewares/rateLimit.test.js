const test = require('node:test');
const assert = require('node:assert/strict');
const createRateLimit = require('./rateLimit');

function makeResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test('rate limiter uses the trusted request IP and enforces the configured limit', () => {
  const limiter = createRateLimit({ windowMs: 60_000, max: 1, message: 'Too many requests' });
  let calls = 0;
  const request = { ip: '203.0.113.8', socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '198.51.100.9' } };
  const first = makeResponse();
  limiter(request, first, () => { calls += 1; });
  const second = makeResponse();
  limiter(request, second, () => { calls += 1; });
  assert.equal(calls, 1);
  assert.equal(second.statusCode, 429);
  assert.deepEqual(second.body, { message: 'Too many requests' });
});

test('different request IPs have independent limits', () => {
  const limiter = createRateLimit({ windowMs: 60_000, max: 1, message: 'Too many requests' });
  let calls = 0;
  for (const ip of ['203.0.113.1', '203.0.113.2']) {
    limiter({ ip, headers: {} }, makeResponse(), () => { calls += 1; });
  }
  assert.equal(calls, 2);
});
