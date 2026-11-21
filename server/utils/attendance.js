function buildCheckInFilter(employeeId, date) {
  return { employee: employeeId, date, checkIn: { $exists: false } };
}

function buildCheckOutFilter(employeeId, date) {
  return {
    employee: employeeId,
    date,
    checkIn: { $exists: true },
    $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
  };
}

module.exports = { buildCheckInFilter, buildCheckOutFilter };
