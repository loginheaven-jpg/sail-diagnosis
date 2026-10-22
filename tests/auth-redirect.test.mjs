import assert from 'node:assert/strict';
import test from 'node:test';

import { authRedirectUrl } from '../src/lib/auth-redirect.ts';

test('approved public origin overrides Next internal hostname for logout and callbacks', () => {
  const internal = 'http://localhost:3040/auth/callback?code=synthetic-code';
  const publicOrigin = 'http://127.0.0.1:3040';
  assert.equal(authRedirectUrl(internal, '/', publicOrigin).href, publicOrigin + '/');
  assert.equal(authRedirectUrl(internal, '/coach?tab=groups', publicOrigin).href, publicOrigin + '/coach?tab=groups');
});

test('redirect destinations cannot change the approved origin or retain callback secrets', () => {
  const origin = 'https://sail.example.invalid';
  for (const destination of ['https://attacker.invalid/path', '//attacker.invalid/path', '/\\attacker.invalid', '/\n/attacker.invalid']) {
    assert.equal(authRedirectUrl(origin + '/auth/callback?code=synthetic-secret', destination, origin).href, origin + '/');
  }
  assert.equal(authRedirectUrl(origin + '/auth/signout?untrusted=value', '/', origin).href, origin + '/');
});

test('invalid configured origins fail closed instead of falling back to request host', () => {
  for (const configured of ['https://user:password@sail.example.invalid', 'https://sail.example.invalid/path', 'https://sail.example.invalid/', 'javascript:alert(1)', '']) {
    assert.throws(() => authRedirectUrl('https://sail.example.invalid/auth/signout', '/', configured));
  }
});
