import assert from 'node:assert/strict';
import test from 'node:test';
import {
  capabilityHash, completeAnswers, diagnosisInput, diagnosisRequestKey, groupMutationInput,
  isSameOriginMutation, minimalResultData, newCapability, readLimitedJson, recordBody,
  ResultSecurityError, validCapability, validUuid,
} from '../src/lib/result-security-policy.ts';

const answers = () => Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`Q${i + 1}`, i < 10 ? 'a' : i < 20 ? 'cardA' : 50]));
const base = () => ({ nickname: '검증 참여자', groupCode: null, answers: answers() });
const request = (origin, site) => ({ url: 'https://sail.example.invalid/api/diagnosis', headers: new Headers({ ...(origin ? { origin } : {}), ...(site ? { 'sec-fetch-site': site } : {}) }) });

test('only the exact thirty expected answer keys and phase values are accepted', () => {
  assert.equal(completeAnswers(answers()), true);
  const missing = answers(); delete missing.Q30;
  assert.equal(completeAnswers(missing), false);
  assert.equal(completeAnswers({ ...missing, Q31: 50 }), false);
  assert.equal(completeAnswers({ ...answers(), Q31: 50 }), false);
  assert.equal(completeAnswers(Array.from({ length: 30 }, () => 'a')), false);
});

test('phase types, numeric bounds, nonfinite numbers and null are rejected', () => {
  for (const [key, values] of [['Q1', ['A', 1, null]], ['Q11', ['a', 50]], ['Q21', ['50', -1, 101, NaN, Infinity, null]]]) {
    for (const value of values) assert.equal(completeAnswers({ ...answers(), [key]: value }), false, key);
  }
  assert.equal(completeAnswers({ ...answers(), Q21: 0, Q30: 100 }), true);
});

test('client-supplied ownership, scores, group UUID or timestamps never enter a save', () => {
  for (const field of ['user_id', 'userId', 'group_id', 'groupId', 'dominant_type', 'score', 'created_at', '__proto__']) {
    const input = JSON.parse(JSON.stringify(base()));
    Object.defineProperty(input, field, { value: 'forged', enumerable: true });
    assert.throws(() => diagnosisInput(input), ResultSecurityError);
  }
});

test('group sharing requires a valid explicit group and an actual boolean selection', () => {
  assert.equal(diagnosisInput({ ...base(), groupCode: ' abcde ', shareWithCoach: true }).groupCode, 'ABCDE');
  assert.throws(() => diagnosisInput({ ...base(), shareWithCoach: true }), ResultSecurityError);
  assert.throws(() => diagnosisInput({ ...base(), groupCode: 'bad!?' }), ResultSecurityError);
  assert.throws(() => diagnosisInput({ ...base(), groupCode: 'ABCDE', shareWithCoach: 'true' }), ResultSecurityError);
  assert.equal(diagnosisInput(base()).shareWithCoach, false);
});

test('empty optional input is normalized without guessing a group or nickname', () => {
  const input = diagnosisInput({ ...base(), nickname: '  ', groupCode: '', device: null });
  assert.equal(input.nickname, null);
  assert.equal(input.groupCode, null);
  assert.equal(input.device, null);
});

test('oversized/control nickname and device metadata are rejected', () => {
  for (const nickname of ['x'.repeat(21), 'a\nb', 'a\u0000b', 42]) assert.throws(() => diagnosisInput({ ...base(), nickname }), ResultSecurityError);
  assert.throws(() => diagnosisInput({ ...base(), device: 'x'.repeat(201) }), ResultSecurityError);
  assert.throws(() => diagnosisInput({ ...base(), device: {} }), ResultSecurityError);
});

test('idempotency is stable for reordered answers and changes for changed intent', () => {
  const a = diagnosisInput(base());
  const b = diagnosisInput({ ...base(), answers: Object.fromEntries(Object.entries(answers()).reverse()) });
  assert.equal(diagnosisRequestKey(a), diagnosisRequestKey(b));
  assert.notEqual(diagnosisRequestKey(a), diagnosisRequestKey(diagnosisInput({ ...base(), answers: { ...answers(), Q21: 80 } })));
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal(diagnosisRequestKey(diagnosisInput({ ...base(), requestId: id })), id);
  assert.throws(() => diagnosisInput({ ...base(), requestId: '//outside.invalid' }), ResultSecurityError);
});

test('a same-origin browser mutation succeeds without trusting forwarded host values', () => {
  assert.equal(isSameOriginMutation(request('https://sail.example.invalid'), 'https://sail.example.invalid'), true);
  // A missing configured canonical origin must fail closed even with a matching request URL.
  assert.equal(isSameOriginMutation(request('https://sail.example.invalid'), ''), false);
  assert.equal(isSameOriginMutation(request('https://sail.example.invalid'), 'https://sail.example.invalid/path'), false);
  assert.equal(isSameOriginMutation(request('https://attacker.invalid'), 'https://sail.example.invalid'), false);
  assert.equal(isSameOriginMutation(request(null), 'https://sail.example.invalid'), false);
  assert.equal(isSameOriginMutation(request('null'), 'https://sail.example.invalid'), false);
  assert.equal(isSameOriginMutation(request('https://sail.example.invalid', 'cross-site'), 'https://sail.example.invalid'), false);
  assert.equal(isSameOriginMutation(request('https://sail.example.invalid/'), 'https://sail.example.invalid'), false);
  const spoofed = request('https://attacker.invalid'); spoofed.headers.set('x-forwarded-host', 'attacker.invalid');
  assert.equal(isSameOriginMutation(spoofed, 'https://sail.example.invalid'), false);
});

test('capabilities are unpredictable opaque values and only hashes identify them in storage', () => {
  const values = new Set(Array.from({ length: 100 }, newCapability));
  assert.equal(values.size, 100);
  for (const value of values) {
    assert.equal(validCapability(value), true);
    assert.match(capabilityHash(value), /^[0-9a-f]{64}$/);
    assert.notEqual(capabilityHash(value), value);
  }
  assert.equal(validCapability(''), false);
  assert.equal(validCapability('a'.repeat(44)), false);
  assert.throws(() => capabilityHash('forged'), ResultSecurityError);
});

test('UUID route identifiers require the full canonical shape', () => {
  assert.equal(validUuid('11111111-1111-4111-8111-111111111111'), true);
  assert.equal(validUuid('-'.repeat(36)), false);
  assert.equal(validUuid('11111111-1111-4111-8111-111111111111?token=secret'), false);
});

test('bounded JSON parser rejects media mismatch and invalid encoding/content', async () => {
  await assert.rejects(readLimitedJson(new Request('https://sail.example.invalid', { method: 'POST', body: '{}', headers: { 'content-type': 'text/plain' } })), (e) => e.status === 415);
  await assert.rejects(readLimitedJson(new Request('https://sail.example.invalid', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } })), (e) => e.status === 400);
  const body = await readLimitedJson(new Request('https://sail.example.invalid', { method: 'POST', body: '{"ok":true}', headers: { 'content-type': 'application/json; charset=utf-8' } }));
  assert.deepEqual(body, { ok: true });
});

test('both declared and streamed request sizes are limited before parsing', async () => {
  await assert.rejects(readLimitedJson(new Request('https://sail.example.invalid', { method: 'POST', body: '{}', headers: { 'content-type': 'application/json', 'content-length': '9999' } }), 16), (e) => e.status === 413);
  await assert.rejects(readLimitedJson(new Request('https://sail.example.invalid', { method: 'POST', body: JSON.stringify({ padding: 'x'.repeat(100) }), headers: { 'content-type': 'application/json' } }), 16), (e) => e.status === 413);
});

test('non-object and unexpected properties are rejected for management endpoints', () => {
  for (const value of [null, false, [], 'text']) assert.throws(() => recordBody(value, []), ResultSecurityError);
  assert.throws(() => recordBody({ resultId: 'id', token: 'secret' }, ['resultId']), ResultSecurityError);
  assert.deepEqual(recordBody({}, []), {});
});

test('group lifecycle rejects coercion, client ownership and unbounded or invalid fields', () => {
  for (const input of [{ name: 'group', coach_id: 'forged' }, { name: {} }, { maxMembers: 1.5 }, { maxMembers: '10' }, { expiresAt: 'yesterday' }, { status: 'deleted' }, { rotateCode: 'true' }, { description: 'x'.repeat(501) }]) {
    assert.throws(() => groupMutationInput(input), ResultSecurityError);
  }
  assert.throws(() => groupMutationInput({}, true), ResultSecurityError);
  assert.deepEqual(groupMutationInput({ name: '  test  ', description: '', maxMembers: 1, expiresAt: null, rotateCode: true }), {
    name: 'test', description: null, max_members: 1, expires_at: null, rotateCode: true,
  });
});

const publicResult = () => ({ id: '11111111-1111-4111-8111-111111111111', nickname: null,
  assertiveness_norm: 0, responsiveness_norm: 0, type_s_pct: 25, type_a_pct: 25,
  type_i_pct: 25, type_l_pct: 25, dominant_type: 'S', secondary_type: null,
  intensity: 0, consistency_score: null, created_at: '2026-10-21T00:00:00Z',
  access_kind: 'share', can_manage: false, coach_consent: false, coach_consent_expires_at: null, can_share_with_coach: false });

test('minimum result DTO excludes raw answers, identity, device, email and future extra fields', () => {
  const projected = minimalResultData({ ...publicResult(), answers: answers(), user_id: 'private-user', group_id: 'private-group', device: 'private-device', email: 'private@example.invalid', token_hash: 'private-hash' });
  assert(projected);
  for (const field of ['answers', 'user_id', 'group_id', 'device', 'email', 'token_hash']) assert.equal(Object.hasOwn(projected, field), false);
  assert.equal(projected.id, publicResult().id);
});

test('share and coach projections cannot gain management controls from a widened DB payload', () => {
  for (const kind of ['share', 'coach']) {
    const projected = minimalResultData({ ...publicResult(), access_kind: kind, can_manage: true, can_share_with_coach: true, coach_consent_expires_at: '2026-11-21T00:00:00Z' });
    assert.equal(projected.can_manage, false);
    assert.equal(projected.can_share_with_coach, false);
    assert.equal(projected.coach_consent_expires_at, null);
  }
  assert.equal(minimalResultData({ ...publicResult(), access_kind: 'owner', can_manage: true }).can_manage, true);
});

test('malformed/unknown DTO versions fail closed instead of fabricating a result', () => {
  assert.equal(minimalResultData({ ...publicResult(), access_kind: 'admin' }), null);
  assert.equal(minimalResultData({ ...publicResult(), consistency_score: Infinity }), null);
  assert.equal(minimalResultData({ ...publicResult(), created_at: 'invalid' }), null);
});
