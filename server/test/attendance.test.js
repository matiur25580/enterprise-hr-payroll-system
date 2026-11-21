const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildCheckInFilter, buildCheckOutFilter } = require('../utils/attendance');

test('check-in only matches an attendance record without a check-in timestamp', () => {
  assert.deepEqual(buildCheckInFilter('employee-1', '2026-11-22'), {
    employee: 'employee-1',
    date: '2026-11-22',
    checkIn: { $exists: false }
  });
});

test('check-out only matches an open workday and excludes already checked-out records', () => {
  assert.deepEqual(buildCheckOutFilter('employee-1', '2026-11-22'), {
    employee: 'employee-1',
    date: '2026-11-22',
    checkIn: { $exists: true },
    $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
  });
});
