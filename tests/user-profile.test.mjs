import assert from 'node:assert/strict';
import test from 'node:test';
import { toUserProfile } from '../src/lib/user-profile.ts';

const profile = Object.freeze({
  id: '11111111-1111-4111-8111-111111111111',
  name: '합성 회원', nickname: '성찰하는 회원', user_contacts: { phone: '01000000000', address: 'private', bank_account: 'private' },
  email: 'profile-fixture@example.invalid', role: 'user',
  created_at: '2026-10-21T00:00:00Z', updated_at: '2026-10-21T00:00:00Z',
});

test('operating name column maps to the existing display DTO without role changes', () => {
  const dto = toUserProfile(profile);
  assert.equal(dto.full_name, profile.name);
  assert.equal(Object.hasOwn(dto, 'name'), false);
  assert.equal(dto.role, profile.role);
  assert.equal(dto.id, profile.id);
  assert.equal(dto.email, profile.email);
  assert.equal(profile.name, '합성 회원');
});

test('empty persisted name stays empty for onboarding instead of inventing a name', () => {
  assert.equal(toUserProfile({ ...profile, name: null }).full_name, null);
});

test('extra storage fields never become part of the display DTO', () => {
  const dto = toUserProfile({ ...profile, private_note: 'synthetic-private' });
  assert.equal(Object.hasOwn(dto, 'private_note'), false);
  assert.deepEqual(Object.keys(dto).sort(), ['id', 'full_name', 'nickname', 'phone', 'email', 'role', 'created_at', 'updated_at'].sort());
});

test('phone comes only from the operating contact relation without exposing other contact fields', () => {
  assert.equal(toUserProfile(profile).phone, '01000000000');
  assert.equal(toUserProfile({ ...profile, user_contacts: null, phone: 'obsolete' }).phone, null);
  assert.equal(Object.hasOwn(toUserProfile(profile), 'user_contacts'), false);
  assert.equal(Object.hasOwn(toUserProfile(profile), 'address'), false);
  assert.equal(Object.hasOwn(toUserProfile(profile), 'bank_account'), false);
});
