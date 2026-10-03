import test from 'node:test';
import assert from 'node:assert/strict';
import { restoreEvidence, recordEvidence, evidenceContext, startEvidenceClock } from '../src/evidence.js';
test('evidence retains exact error examples and trims private history safely', () => {
  const log = restoreEvidence();
  const context = evidenceContext({ id: 'q-1', prompt: '7 + 8?', answer: '15', options: ['15', '14'], visual: { a: 7, b: 8 } }, 3, 2, 'addition', 1250);
  recordEvidence(log, context, 'answer', { submittedAnswer: '14', attempt: 1, correct: false, independent: false, helpUsed: false });
  assert.equal(log.events[0].question.prompt, '7 + 8?');
  assert.equal(log.events[0].submittedAnswer, '14');
  assert.equal(log.events[0].activeMs, 1250);
  assert.deepEqual(restoreEvidence(JSON.parse(JSON.stringify(log))), log);
  for (let i = 0; i < 400; i++) recordEvidence(log, context, 'hint');
  assert.ok(log.events.length <= 300); assert.ok(JSON.stringify(log).length <= 90000); assert.ok(log.dropped > 0);
  assert.equal(restoreEvidence({ version: 1, events: [{ ...log.events[0], activeMs: -1 }] }).events.length, 0);
  assert.equal(restoreEvidence().events.length, 0);
});
test('active time excludes closed, hidden, unfocused and idle questions', () => {
  const originals = Object.fromEntries(['document', 'window', 'performance', 'setInterval', 'clearInterval'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  let now = 0, interval; const listeners = new Map();
  const doc = { hidden: false, hasFocus: () => true, addEventListener: (k, fn) => listeners.set(k, fn), removeEventListener: () => {} };
  const win = { addEventListener: () => {}, removeEventListener: () => {} };
  const q = { activeMs: 0 }; let open = true;
  try {
    for (const [k, value] of Object.entries({ document: doc, window: win, performance: { now: () => now }, setInterval: fn => { interval = fn; return 1 }, clearInterval: () => {} })) Object.defineProperty(globalThis, k, { configurable: true, value });
    const stop = startEvidenceClock(() => open ? q : null, () => {});
    now = 250; interval(); assert.equal(q.activeMs, 250);
    doc.hidden = true; now = 500; interval(); assert.equal(q.activeMs, 250);
    doc.hidden = false; doc.hasFocus = () => false; now = 750; interval(); assert.equal(q.activeMs, 250);
    doc.hasFocus = () => true; open = false; now = 1000; interval(); assert.equal(q.activeMs, 250);
    open = true; now = 92000; interval(); assert.equal(q.activeMs, 250);
    listeners.get('pointerdown')(); now = 92250; interval(); assert.equal(q.activeMs, 500);
    stop();
  } finally { for (const [k, descriptor] of Object.entries(originals)) { if (descriptor) Object.defineProperty(globalThis, k, descriptor); else delete globalThis[k]; } }
});

import { createLibrary, bookFor, pendingQuestion, submitAnswer, useHint } from '../src/learning.js';
import { normalizeSave } from '../server/save-service.js';
import { LEARNING } from '../src/curriculum.js';
test('question-level evidence survives canonical save normalization without mixing children', () => {
 const library = createLibrary(), id = library.selected, book = bookFor(library, id, 1), task = LEARNING.levels[0].task;
 const pending = pendingQuestion(book, task, 1); pending.activeMs = 2000;
 submitAnswer(book, task, '99999'); useHint(book, task); submitAnswer(book, task, pending.question.answer);
 const restored = normalizeSave(JSON.parse(JSON.stringify(library))).players[id].books[1].evidence;
 assert.equal(restored.events[0].type, 'question');
 const answers = restored.events.filter(e => e.type === 'answer');
 assert.equal(answers[0].submittedAnswer, '99999'); assert.equal(answers[1].attempt, 2); assert.equal(answers[1].independent, false); assert.equal(answers[1].helpUsed, true);
 assert.equal(answers[1].questionId, pending.id);
});
