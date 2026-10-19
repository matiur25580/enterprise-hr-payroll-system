const test = require('node:test');
const assert = require('node:assert/strict');
const createRateLimit = require('../middlewares/rateLimit');
const { authorize } = require('../middlewares/auth');

function responseRecorder() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test('rate limiter allows the configured request count and then returns 429', () => {
  const limit = createRateLimit({ windowMs: 60_000, max: 2, message: 'Too many requests' });
  let nextCalls = 0;

  for (let request = 0; request < 2; request += 1) {
    const response = responseRecorder();
    limit({ ip: '192.0.2.1', socket: {} }, response, () => { nextCalls += 1; });
    assert.equal(response.statusCode, 200);
  }

  const blockedResponse = responseRecorder();
  limit({ ip: '192.0.2.1', socket: {} }, blockedResponse, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(blockedResponse.statusCode, 429);
  assert.deepEqual(blockedResponse.payload, { message: 'Too many requests' });
});

test('rate limiter keeps independent request counts per client IP', () => {
  const limit = createRateLimit({ windowMs: 60_000, max: 1, message: 'Too many requests' });
  const firstResponse = responseRecorder();
  const secondResponse = responseRecorder();
  let nextCalls = 0;

  limit({ ip: '192.0.2.1', socket: {} }, firstResponse, () => { nextCalls += 1; });
  limit({ ip: '192.0.2.2', socket: {} }, secondResponse, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(firstResponse.statusCode, 200);
  assert.equal(secondResponse.statusCode, 200);
});

test('role authorization blocks missing and disallowed roles', () => {
  const middleware = authorize('admin');
  const response = responseRecorder();
  let nextCalls = 0;

  middleware({}, response, () => { nextCalls += 1; });
  middleware({ user: { role: 'employee' } }, response, () => { nextCalls += 1; });

  assert.equal(nextCalls, 0);
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.payload, { message: 'Access denied' });
});

test('role authorization allows only an explicitly configured role', () => {
  const response = responseRecorder();
  let nextCalls = 0;

  authorize('admin', 'hr')({ user: { role: 'hr' } }, response, () => { nextCalls += 1; });

  assert.equal(nextCalls, 1);
  assert.equal(response.statusCode, 200);
});
