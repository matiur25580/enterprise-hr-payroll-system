const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword } = require('../scripts/createAdmin');

test('first Admin password validation accepts strong passwords within bcrypt limits', () => {
  assert.equal(validatePassword('Secur3!Provisioning-Admin'), true);
});

test('first Admin password validation rejects weak or overlong passwords', () => {
  assert.equal(validatePassword('Short1!'), false);
  assert.equal(validatePassword('alllowercase123!'), false);
  assert.equal(validatePassword('NoNumberPassword!'), false);
  assert.equal(validatePassword('NoSymbolPassword123'), false);
  assert.equal(validatePassword('Has Spaces123!Strong'), false);
  assert.equal(validatePassword(`A1!${'b'.repeat(70)}`), false);
  assert.equal(validatePassword('Ä'.repeat(14) + 'A1!'), false);
});
