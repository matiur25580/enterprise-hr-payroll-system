const { buildCheckInFilter, buildCheckOutFilter } = require('../utils/attendance');

test('check-in only matches an attendance record without a check-in timestamp', () => {
  expect(buildCheckInFilter('employee-1', '2026-11-22')).toEqual({
    employee: 'employee-1',
    date: '2026-11-22',
    checkIn: { $exists: false }
  });
});

test('check-out only matches an open workday and excludes already checked-out records', () => {
  expect(buildCheckOutFilter('employee-1', '2026-11-22')).toEqual({
    employee: 'employee-1',
    date: '2026-11-22',
    checkIn: { $exists: true },
    $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
  });
});
