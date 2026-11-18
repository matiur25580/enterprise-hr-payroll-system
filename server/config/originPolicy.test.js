const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAllowedOrigins, isAllowedOrigin } = require('./originPolicy');

test('parses and deduplicates explicit frontend origins', () => {
  assert.deepEqual(
    parseAllowedOrigins('https://hr.example.com, https://hr.example.com,https://admin.example.com', 'production'),
    ['https://hr.example.com', 'https://admin.example.com'],
  );
});

test('rejects wildcard and malformed origins', () => {
  assert.throws(() => parseAllowedOrigins('*', 'production'), /wildcard/);
  assert.throws(() => parseAllowedOrigins('not-a-url', 'production'), /valid absolute/);
  assert.throws(() => parseAllowedOrigins('https://example.com/app', 'production'), /plain HTTP/);
});

test('requires explicit origins in production and provides localhost defaults in development', () => {
  assert.throws(() => parseAllowedOrigins('', 'production'), /must be configured/);
  assert.deepEqual(parseAllowedOrigins('', 'development'), ['http://localhost:5173', 'http://localhost:3000']);
});

test('allows only exact configured browser origins and non-browser requests without Origin', () => {
  const allowed = ['https://hr.example.com'];
  assert.equal(isAllowedOrigin('https://hr.example.com', allowed), true);
  assert.equal(isAllowedOrigin('https://attacker.example', allowed), false);
  assert.equal(isAllowedOrigin('null', allowed), false);
  assert.equal(isAllowedOrigin(undefined, allowed), true);
});
