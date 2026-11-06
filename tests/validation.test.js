/* Unit tests for js/validation.js. Run: node --test tests/validation.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../js/validation.js');

const ok = (fn, x) => assert.equal(fn(x), '', `${fn.name}(${JSON.stringify(x)}) should be valid`);
const bad = (fn, x) => assert.notEqual(fn(x), '', `${fn.name}(${JSON.stringify(x)}) should be rejected`);

test('name: at least 2 letters, no digits', () => {
  ['Sangeetha Prakash', 'Al', "D'Souza", 'R. K. Menon', 'Anne-Marie', 'Ramesh K.'].forEach(x => ok(v.validateName, x));
  ['', ' ', 'A', 'R', 'John3', '123', 'Mary 2', 'A1', '@@', '.A'].forEach(x => bad(v.validateName, x));
  assert.equal(v.validateName('R'), 'Enter at least 2 letters. Numbers are not allowed.');
});

test('email: local part, @, domain and TLD; uppercase accepted', () => {
  ['name@example.com', 'sangeetha.p@tridyaent.in', 'Test@GMAIL.com', 'MARY.EVANS@EXAMPLE.CO.IN', 'a+b@x.io'].forEach(x => ok(v.validateEmail, x));
  ['', 'mary.example.com', 'mary@', 'mary@example', '@example.com', 'sangeetha.p@', 'a..b@x.com', 'a b@x.com', 'mary@.com'].forEach(x => bad(v.validateEmail, x));
});

test('email is normalised to lower case, never rejected for case', () => {
  assert.equal(v.normalizeEmail('  Test@GMAIL.com '), 'test@gmail.com');
  assert.equal(v.validateEmail('Test@GMAIL.com'), '');
});

test('phone: digits only, 10 digits, starts 6-9', () => {
  ['9843012345', '98430 12345', '6000000000', '7012345678', '8123456789'].forEach(x => ok(v.validatePhone, x));
  ['', '98765abc', '12345', '98765 4321x', '5843012345', '0843012345', '984301234', '98430123456', '+919843012345', '98430-12345'].forEach(x => bad(v.validatePhone, x));
  assert.equal(v.digitsOnly('98a43-0 12'), '9843012');
});

test('password: 8+ characters with a letter and a number', () => {
  ['secret12', 'Tridya2026', 'abc12345'].forEach(x => ok(v.validatePassword, x));
  ['', 'short1', 'allletters', '12345678', 'abc 123'].forEach(x => bad(v.validatePassword, x));
  assert.ok(v.passwordStrength('Tridya2026!') > v.passwordStrength('abc12345'));
  assert.equal(v.passwordStrength(''), 0);
});

test('OTP: exactly 6 digits', () => {
  ['123456', '000000', '123 456'].forEach(x => ok(v.validateOtp, x));
  ['', '12345', '1234567', '12a456'].forEach(x => bad(v.validateOtp, x));
});

test('required', () => {
  ok(v.validateRequired, 'x');
  bad(v.validateRequired, '');
  bad(v.validateRequired, '   ');
});

test('rules are inferred from field name / type', () => {
  const f = (name, type, extra = {}) => ({ name, type, getAttribute: k => extra[k] || null });
  assert.deepEqual(v.rulesFor(f('name', 'text')), ['name']);
  assert.deepEqual(v.rulesFor(f('patient-name', 'text')), ['name']);
  assert.deepEqual(v.rulesFor(f('email', 'email')), ['email']);
  assert.deepEqual(v.rulesFor(f('phone', 'tel')), ['phone']);
  assert.deepEqual(v.rulesFor(f('mobile', 'text')), ['phone']);
  assert.deepEqual(v.rulesFor(f('password', 'password')), ['password']);
  assert.deepEqual(v.rulesFor(f('otp', 'text')), ['otp']);
  assert.deepEqual(v.rulesFor(f('password', 'password', { 'data-rule': 'required' })), ['required']);
  assert.deepEqual(v.rulesFor(f('message', 'text')), []);
});

test('validateField: required vs optional, checkbox', () => {
  const field = (o) => Object.assign({ name: 'name', type: 'text', value: '', required: false, tagName: 'INPUT', getAttribute: () => null }, o);
  assert.equal(v.validateField(field({ value: '' })), '');
  assert.notEqual(v.validateField(field({ value: '', required: true })), '');
  assert.notEqual(v.validateField(field({ value: 'A' })), '');
  assert.equal(v.validateField(field({ value: 'Asha' })), '');
  assert.notEqual(v.validateField(field({ type: 'checkbox', required: true, checked: false })), '');
  assert.equal(v.validateField(field({ type: 'checkbox', required: true, checked: true })), '');
});
