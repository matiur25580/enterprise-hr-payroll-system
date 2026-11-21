const test = require('node:test');
const assert = require('node:assert/strict');
const { isEligibleLogin } = require('../utils/auth-security');

test('login eligibility is false for unknown accounts', () => {
  assert.equal(isEligibleLogin(null, 'employee', false), false);
});

test('login eligibility is false for a mismatched role', () => {
  assert.equal(isEligibleLogin({ role: 'hr', status: 'active' }, 'employee', true), false);
});

test('login eligibility is false for invalid passwords', () => {
  assert.equal(isEligibleLogin({ role: 'employee', status: 'active' }, 'employee', false), false);
});

test('login eligibility is false for inactive accounts', () => {
  assert.equal(isEligibleLogin({ role: 'employee', status: 'pending' }, 'employee', true), false);
});

test('login eligibility accepts only active accounts with matching roles and passwords', () => {
  assert.equal(isEligibleLogin({ role: 'Employee', status: 'active' }, 'employee', true), true);
});

test('password reset uses a generic failure message without disclosing account existence', () => {
  const { PASSWORD_RESET_GENERIC_FAILURE } = require('../utils/auth-security');
  assert.equal(PASSWORD_RESET_GENERIC_FAILURE, 'Unable to reset password. Verify the account details and OTP, then try again.');
});
