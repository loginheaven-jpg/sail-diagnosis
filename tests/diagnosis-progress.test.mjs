import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test, { before } from 'node:test';

// Use the real Zustand persistence and scoring modules with browser storage.
// Only the app's TypeScript path alias needs resolution in Node's test runner.
const values = new Map();
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
let store;
before(async () => {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      return nextResolve(specifier.startsWith('@/')
        ? new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href
        : specifier, context);
    },
  });
  globalThis.window = {};
  globalThis.localStorage = storage;
  ({ useTestStore: store } = await import('../src/stores/test-store.ts'));
});
const key = 'sail-test-progress';
const answers = Object.fromEntries(Array.from({ length: 30 }, (_, index) =>
  ['Q' + (index + 1), index < 10 ? 'a' : index < 20 ? 'cardA' : 50]));

function complete() {
  store.getState().reset();
  store.getState().startTest();
  store.setState({ answers, phase: 3, questionIndex: 9 });
  store.getState().setShareWithCoach(true);
  store.getState().completePhase();
  return store.getState().requestId;
}

test('completed response-loss refresh restores the same key, answers and explicit consent', async () => {
  const requestId = complete();
  assert.match(requestId, /^[0-9a-f-]{36}$/);
  const saved = localStorage.getItem(key);
  store.getState().reset();
  localStorage.setItem(key, saved);
  await store.persist.rehydrate();
  assert.equal(store.getState().isCompleted, true);
  assert.equal(store.getState().requestId, requestId);
  assert.equal(store.getState().shareWithCoach, true);
  assert.deepEqual(store.getState().answers, answers);
  // Neither a retry nor a stale checkbox event changes an in-flight payload.
  store.getState().completePhase();
  store.getState().setShareWithCoach(false);
  assert.equal(store.getState().requestId, requestId);
  assert.equal(store.getState().shareWithCoach, true);
});

test('reset and a fresh attempt discard previous key, consent and answers', () => {
  const previous = complete();
  store.getState().reset();
  assert.equal(store.getState().requestId, null);
  assert.equal(store.getState().shareWithCoach, false);
  store.getState().startTest();
  assert.notEqual(store.getState().requestId, previous);
  assert.equal(store.getState().shareWithCoach, false);
  assert.deepEqual(store.getState().answers, {});
});

test('legacy completed drafts keep answers but require final confirmation and fresh consent', async () => {
  for (const requestId of [undefined, 'invalid-key']) {
    store.getState().reset();
    localStorage.setItem(key, JSON.stringify({ version: 0, state: {
      isStarted: true, isCompleted: true, phase: 3, questionIndex: 9,
      answers, requestId, shareWithCoach: true,
    } }));
    await store.persist.rehydrate();
    assert.equal(store.getState().isCompleted, false);
    assert.equal(store.getState().phase, 3);
    assert.equal(store.getState().questionIndex, 9);
    assert.equal(store.getState().requestId, null);
    assert.equal(store.getState().shareWithCoach, false);
    assert.deepEqual(store.getState().answers, answers);
    store.getState().completePhase();
    assert.match(store.getState().requestId, /^[0-9a-f-]{36}$/);
  }
});
