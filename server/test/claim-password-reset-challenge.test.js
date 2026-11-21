const test = require('node:test');
const assert = require('node:assert/strict');
const claimPasswordResetChallenge = require('../utils/claim-password-reset-challenge');

test('claims only a verified, unexpired password reset challenge for the exact account', async () => {
  const expected = { _id: 'challenge-1' };
  let query;
  const EmailChallenge = {
    findOneAndDelete: async (value) => {
      query = value;
      return expected;
    },
  };
  const now = new Date('2026-11-22T00:00:00.000Z');
  const result = await claimPasswordResetChallenge(EmailChallenge, 'person@example.com', 'EMAB22111990', now);
  assert.equal(result, expected);
  assert.deepEqual(query, {
    email: 'person@example.com',
    userId: 'EMAB22111990',
    purpose: 'password-reset',
    expiresAt: { $gt: now },
    verifiedAt: { $exists: true },
  });
});

test('returns null when another concurrent request has already consumed the challenge', async () => {
  let available = true;
  const EmailChallenge = {
    findOneAndDelete: async () => {
      if (!available) return null;
      available = false;
      return { _id: 'challenge-1' };
    },
  };
  const first = await claimPasswordResetChallenge(EmailChallenge, 'person@example.com', 'EMAB22111990');
  const second = await claimPasswordResetChallenge(EmailChallenge, 'person@example.com', 'EMAB22111990');
  assert.ok(first);
  assert.equal(second, null);
});
