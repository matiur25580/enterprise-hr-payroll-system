function isEligibleLogin(user, requestedRole, passwordMatches) {
  return Boolean(user && user.status === 'active'
    && String(user.role || '').trim().toLowerCase() === requestedRole
    && passwordMatches);
}

const PASSWORD_RESET_GENERIC_FAILURE = 'Unable to reset password. Verify the account details and OTP, then try again.';

module.exports = { isEligibleLogin, PASSWORD_RESET_GENERIC_FAILURE };
