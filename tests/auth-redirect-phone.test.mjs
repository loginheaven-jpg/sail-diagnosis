import assert from 'node:assert/strict';
import test from 'node:test';
import { safeInternalRedirect } from '../src/lib/auth-redirect.ts';
import { phoneLoginCredentials } from '../src/lib/phone.ts';

test('redirects reject external, protocol relative, scripts, backslashes and controls', () => {
  for (const value of ['https://outside.invalid', '//outside.invalid', 'javascript:alert(1)', '/\\outside.invalid', '/\n/outside.invalid', '/\routside', '/\0path', '/a/..//outside.invalid', '/a/%2e%2e//outside.invalid', null, {}, 4]) {
    assert.equal(safeInternalRedirect(value), '/');
  }
  assert.equal(safeInternalRedirect('https://outside.invalid', '//bad.invalid'), '/');
  assert.equal(safeInternalRedirect('javascript:alert(1)', '/coach'), '/coach');
});

test('internal redirect query and fragment encoding survive normalization', () => {
  assert.equal(safeInternalRedirect('/coach/../test?group=A%26B%20C#form'), '/test?group=A%26B%20C#form');
  assert.equal(safeInternalRedirect('/test?query=한글 글#문항'), '/test?query=%ED%95%9C%EA%B8%80%20%EA%B8%80#%EB%AC%B8%ED%95%AD');
  assert.equal(safeInternalRedirect('/authors/%ED%95%9C%EA%B8%80'), '/authors/%ED%95%9C%EA%B8%80');
});

test('phone credential input normalizes formats and preserves the exact password', () => {
  assert.deepEqual(phoneLoginCredentials({ phone: '+82-10-1234-5678', password: ' exact password ' }), { phone: '01012345678', password: ' exact password ' });
});

test('phone-only availability probes and malformed credential fields are rejected', () => {
  for (const value of [null, [], {}, { phone: '01012345678' }, { phone: '123', password: 'password' }, { phone: 1012345678, password: 'password' }, { phone: '01012345678', password: '' }, { phone: '01012345678', password: 'x'.repeat(1025) }, { phone: '01012345678', password: 'password', email: 'fixture@example.invalid' }]) {
    assert.equal(phoneLoginCredentials(value), null);
  }
});
