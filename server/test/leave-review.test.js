const { test } = require('node:test');
const assert = require('node:assert/strict');
const buildPendingLeaveReviewFilter = require('../utils/leave-review');

test('leave review only matches the requested pending leave record', () => {
  assert.deepEqual(buildPendingLeaveReviewFilter('leave-123'), {
    _id: 'leave-123',
    status: 'pending',
  });
});
