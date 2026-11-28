function buildPendingLeaveReviewFilter(requestId) {
  return { _id: requestId, status: 'pending' };
}

module.exports = buildPendingLeaveReviewFilter;
