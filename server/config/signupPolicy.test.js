const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicSignupRole } = require('./signupPolicy');

test('public signup permits employee accounts only', () => {
  assert.equal(isPublicSignupRole('employee'), true);
  assert.equal(isPublicSignupRole('admin'), false);
  assert.equal(isPublicSignupRole('hr'), false);
  assert.equal(isPublicSignupRole('super_admin'), false);
});
