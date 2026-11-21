function isEligibleLogin(user, requestedRole, passwordMatches) {
  return Boolean(user && user.status === 'active'
    && String(user.role || '').trim().toLowerCase() === requestedRole
    && passwordMatches);
}

module.exports = { isEligibleLogin };
