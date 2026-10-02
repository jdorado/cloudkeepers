import test from 'node:test';
import assert from 'node:assert/strict';
import { LEARNING, generateQuestion } from '../src/curriculum.js';
import { CONFIG } from '../src/game.config.js';
import { createBook, createLibrary, addPlayer, bookFor, progressFor, pendingQuestion, useHint, submitAnswer, restoreLibrary, poweredTasks, masteredTasks, rescueStatus } from '../src/learning.js';
import { JOURNEY, islandAvailable, currentIsland } from '../src/journey.js';
import { readSave, writeSave } from '../src/save-store.js';
import { questionVisual } from '../src/question-view.js';

function seeded(seed = 109) { return () => { seed = Math.imul(1664525, seed) + 1013904223 | 0; return (seed >>> 0) / 4294967296; }; }
function answerFor(q, year) {
  const v = q.visual;
  if (q.family === 'place') {
    if (v.type === 'count') return v.a + v.b;
    if (q.expression.startsWith('Hundreds')) return Math.floor(v.number / 100);
    if (q.expression.startsWith('Tens')) return Math.floor(v.number / 10) % 10;
    if (q.expression.startsWith('Ones')) return v.number % 10;
    return v.number;
  }
  if (q.family === 'compare') return q.form === '2' ? v.numbers[0] + 1 : q.form === '1' ? Math.min(...v.numbers) : Math.max(...v.numbers);
  if (q.family === 'add' || q.family === 'subtract') {
    if (q.expression.includes('?')) { const nums = q.expression.match(/\d+/g).map(Number); return q.family === 'add' ? nums[1] - nums[0] : nums[0] - nums[1]; }
    return q.family === 'add' ? v.a + v.b : v.a - v.b;
  }
  if (q.family === 'table' || q.family === 'groups') return v.type === 'sharing' ? v.total / v.groups : q.expression.startsWith('?') ? v.groups : v.groups * v.each;
  if (q.family === 'fraction') {
    if (v.quantity) return v.quantity / v.denominator * v.numerator;
    if (q.prompt.includes('shaded')) return `${v.numerator}/${v.denominator}`;
    if (q.prompt.includes('equivalent')) { const [n, d] = q.answer.split('/').map(Number); assert.equal(n * v.denominator, d * v.numerator); return q.answer; }
    const [a, d, b] = q.expression.match(/\d+/g).map(Number);
    return `${q.expression.includes('−') ? a - b : a + b}/${d}`;
  }
  if (q.family === 'practical') {
    if (v.type === 'coins') { const total = v.coins.reduce((a, b) => a + b, 0); return v.paid === null ? total : v.paid - total; }
    if (v.type === 'ribbon') return v.a + v.b;
    if (v.type === 'rectangle') return (year === 3 ? 2 : 1) * (v.width + v.height);
    return v.whole * (v.unit === 'm' ? 100 : 1000) + v.rest;
  }
  if (q.family === 'timeShape') return v.type === 'clock' ? `${v.hour}:${String(v.minutes).padStart(2, '0')}` : q.expression.includes('Right') ? v.right : q.expression.includes('Straight') ? v.sides : v.name;
  const values = v.units.map(n => n * v.scale);
  return q.form === '0' ? values.reduce((a, b) => a + b) : q.form === '1' ? Math.abs(values[0] - values[1]) : v.labels[values.indexOf(Math.max(...values))];
}

test('all 12 topics generate correct, bounded, renderable maths for all years and difficulty bands', () => {
  const rng = seeded();
  assert.equal(CONFIG.tasks.length, 12); assert.equal(new Set(CONFIG.tasks.map(t => t.friend)).size, 12);
  for (const level of LEARNING.levels) for (const year of LEARNING.years) for (const band of [0, 1, 2]) {
    const forms = new Set(), keys = new Set();
    for (let i = 0; i < 200; i++) {
      const q = generateQuestion(level.task, year, band, [], rng);
      assert.equal(q.answer, String(answerFor(q, year)), `${level.task}/Y${year}/B${band}: ${q.expression}`);
      assert.ok(q.prompt && q.hint);
      if (!(['add', 'subtract'].includes(q.family) && q.expression.includes('?'))) assert.ok(questionVisual(q));
      forms.add(q.form); keys.add(q.key);
      if (q.options) { assert.ok(q.options.includes(q.answer)); assert.equal(new Set(q.options).size, q.options.length); assert.ok(q.options.length >= 2 && q.options.length <= 4); }
      else assert.ok(/^\d+$/.test(q.answer), q.expression);
      if (['add', 'subtract'].includes(q.family)) {
        const v = q.visual;
        assert.ok(v.a >= 0 && v.b >= 0); assert.ok(q.family !== 'subtract' || v.a >= v.b);
        if (year === 1) assert.ok(v.a <= 20 && v.b <= 20 && (q.family === 'subtract' || v.a + v.b <= 20));
        if (year === 3 && band === 2) assert.ok(q.family === 'subtract' ? v.a % 10 < v.b % 10 : v.a % 10 + v.b % 10 >= 10);
      }
    }
    assert.ok(forms.size >= 2, `${level.task} must offer two actual question styles`);
    assert.ok(keys.size >= (band === 2 ? 6 : 3), `${level.task} needs enough different facts at band ${band}`);
  }
});
test('fresh questions avoid recent facts', () => {
  const rng = seeded(), seen = [];
  for (let i = 0; i < 70; i++) { const q = generateQuestion('fountain', 3, 2, seen, rng); assert.ok(!seen.includes(q.key)); seen.push(q.key); }
});
test('missing-number arithmetic never displays the missing operand in a duplicate diagram', () => {
  const rng = seeded(); let checked = 0;
  for (const task of ['fountain', 'windmill']) for (const year of LEARNING.years) for (const band of [1, 2]) for (let i = 0; i < 50; i++) {
    const q = generateQuestion(task, year, band, [], rng);
    if (q.expression.includes('?')) { assert.equal(questionVisual(q), ''); checked++; }
  }
  assert.ok(checked > 100);
});
test('six rescue stars always means complete, while Gold remains an optional achievement', () => {
  const p = progressFor(createBook(), 'bridge');
  const clean = (band, i, form = '0') => ({ clean: true, band, key: `fact-${i}`, form });
  p.recent = Array.from({ length: 6 }, (_, i) => clean(1, i, String(i % 2)));
  let status = rescueStatus(p); assert.equal(status.stars, 5); assert.equal(status.remaining, 1); assert.equal(status.goldProgress, 0); assert.equal(status.complete, false);
  p.recent = Array.from({ length: 6 }, (_, i) => clean(i < 4 ? 2 : 1, i, '0'));
  status = rescueStatus(p); assert.equal(status.stars, 5); assert.equal(status.remaining, 1); assert.equal(status.stylesLeft, 1); assert.equal(status.complete, false);
  p.mastered = true; p.gold = false; p.recent = []; status = rescueStatus(p);
  assert.equal(status.stars, 6); assert.equal(status.complete, true); assert.equal(status.gold, false); assert.equal(status.remaining, 0);
});
test('the last rescue questions introduce another style before the learner gets stuck at six stars', () => {
  const book = createBook(2), p = progressFor(book, 'bridge');
  p.recent = Array.from({ length: 4 }, (_, i) => ({ clean: true, band: 2, form: '0', key: `previous-${i}` }));
  assert.notEqual(pendingQuestion(book, 'bridge', 3, seeded()).question.form, '0');
});
test('support questions can complete an island without Challenge, and Gold is earned separately', () => {
  const supportBook = createBook(0), support = progressFor(supportBook, 'bridge'), rng = seeded();
  for (let answered = 0; !support.mastered && answered < 12; answered++) {
    support.band = 0; support.cleanRun = 0;
    const q = pendingQuestion(supportBook, 'bridge', 1, rng).question;
    assert.equal(q.band, 0); submitAnswer(supportBook, 'bridge', q.answer);
  }
  assert.equal(support.mastered, true); assert.equal(support.gold, false); assert.equal(rescueStatus(support).stars, 6);

  const challengeBook = createBook(2), challenge = progressFor(challengeBook, 'bridge'); let goldResult;
  for (let answered = 0; answered < 6; answered++) {
    const q = pendingQuestion(challengeBook, 'bridge', 1, rng).question;
    const result = submitAnswer(challengeBook, 'bridge', q.answer);
    if (result.newlyGold) goldResult = result;
  }
  assert.equal(challenge.mastered, true); assert.equal(challenge.gold, true); assert.equal(goldResult.newlyGold, true);
});
test('two independent answers raise difficulty; two distinct misses lower it once, even with retries', () => {
  const book = createBook(1), rng = seeded();
  for (let i = 0; i < 2; i++) { const q = pendingQuestion(book, 'bridge', 3, rng).question; submitAnswer(book, 'bridge', q.answer); }
  const p = progressFor(book, 'bridge'); assert.equal(p.band, 2);
  for (let i = 0; i < 2; i++) { const q = pendingQuestion(book, 'bridge', 3, rng).question; submitAnswer(book, 'bridge', 'incorrect'); submitAnswer(book, 'bridge', 'incorrect'); submitAnswer(book, 'bridge', q.answer); }
  assert.equal(p.band, 1); assert.equal(p.recent.filter(x => x.clean).length, 2); assert.equal(p.completed, 4);
});
test('hints and mistakes persist across reload and earn route power without rescue stars', () => {
  let library = createLibrary(), book = bookFor(library, 'player-1', 1), q = pendingQuestion(book, 'bridge', 1).question;
  useHint(book, 'bridge'); library = restoreLibrary(JSON.parse(JSON.stringify(library))); book = bookFor(library, 'player-1', 1);
  assert.equal(pendingQuestion(book, 'bridge', 1).question.key, q.key);
  assert.equal(submitAnswer(book, 'bridge', q.answer).independent, false);
  q = pendingQuestion(book, 'bridge', 1).question; submitAnswer(book, 'bridge', 'incorrect');
  library = restoreLibrary(JSON.parse(JSON.stringify(library))); book = bookFor(library, 'player-1', 1);
  assert.equal(submitAnswer(book, 'bridge', q.answer).independent, false);
  q = pendingQuestion(book, 'bridge', 1).question; useHint(book, 'bridge'); submitAnswer(book, 'bridge', q.answer);
  assert.ok(poweredTasks(book).has('bridge')); assert.equal(masteredTasks(book).size, 0); assert.equal(islandAvailable(book, 'nest'), false);
});
test('every year and starting band can master all levels, with sequential island unlocks and continued practice', () => {
  for (const year of LEARNING.years) for (const band of [0, 1, 2]) {
    const book = createBook(band), rng = seeded(year * 13 + band);
    assert.equal(islandAvailable(book, 'nest'), false);
    for (const level of LEARNING.levels) {
      let answered = 0; const p = progressFor(book, level.task);
      while (!p.mastered && answered < 60) { const q = pendingQuestion(book, level.task, year, rng).question; submitAnswer(book, level.task, q.answer); answered++; }
      assert.ok(p.mastered, `mastery reachable: ${level.task}, year ${year}, band ${band}`);
      assert.equal(islandAvailable(book, level.task), true);
      const next = JOURNEY[JOURNEY.findIndex(island => island.id === level.task) + 1];
      if (next) assert.equal(islandAvailable(book, next.id), true);
      const q = pendingQuestion(book, level.task, year, rng).question; submitAnswer(book, level.task, 'incorrect'); submitAnswer(book, level.task, q.answer);
      assert.ok(p.mastered, 'later practice does not revoke a rescue');
    }
    assert.equal(masteredTasks(book).size, 12);
  }
});
test('school year and player books stay independent; malformed and old saves do not grant mastery', () => {
  const library = createLibrary(), book = bookFor(library, 'player-1', 1);
  const q = pendingQuestion(book, 'bridge', 1).question; submitAnswer(book, 'bridge', q.answer);
  assert.equal(progressFor(bookFor(library, 'player-2', 3), 'bridge').points, 0);
  assert.equal(progressFor(bookFor(library, 'player-1', 3), 'bridge').points, 0);
  const restored = restoreLibrary(JSON.parse(JSON.stringify(library)));
  assert.equal(progressFor(bookFor(restored, 'player-1', 1), 'bridge').points, 1);
  for (const raw of [null, 'bad', { done: CONFIG.tasks.map(t => t.id) }, { version: 2, players: { 'player-1': { year: 99, books: { 1: { levels: { bridge: { band: 99, points: -8, pending: { question: {} } } } } } } } }]) {
    const clean = restoreLibrary(raw), p = progressFor(bookFor(clean, 'player-1', 1), 'bridge'); assert.equal(p.mastered, false); assert.equal(p.points, 0); assert.equal(p.pending, null);
  }
});
test('repeated copies of one fact cannot satisfy mastery', () => {
  const book = createBook(2), p = progressFor(book, 'bridge');
  for (let i = 0; i < 12; i++) { pendingQuestion(book, 'bridge', 3); p.pending.question.key = 'same-fact'; p.pending.question.form = String(i % 2); submitAnswer(book, 'bridge', p.pending.question.answer); }
  assert.equal(p.mastered, false);
});


test('one island is one level and restoring a legacy journey keeps previously played islands accessible', () => {
  const legacy = { version: 2, selected: 'legacy-player', players: { 'legacy-player': { year: 3, books: { 3: { area: 2, levels: { 'light-1': { points: 2, pending: { question: generateQuestion('light-1', 3, 2), hinted: true, missed: true, recorded: true } } } } } } } };
  const library = restoreLibrary(legacy), book = bookFor(library, 'legacy-player', 3);
  assert.equal(library.version, 3); assert.equal(library.players['legacy-player'].name, 'Legacy-player');
  assert.equal(currentIsland(book).number, 8); assert.equal(book.resumeTask, 'light-1');
  assert.equal(islandAvailable(book, 'light-1'), true); assert.equal(islandAvailable(book, 'light-2'), false);
  assert.equal(progressFor(book, 'light-1').pending.hinted, true);
  assert.equal(progressFor(book, 'light-1').points, 2);
  assert.deepEqual(JOURNEY.map(island => island.number), Array.from({ length: 12 }, (_, i) => i + 1));
});
test('old completed saves keep their former Challenge achievement while new non-Gold completion stays non-Gold', () => {
  const legacy = { version: 3, selected: 'p', players: { p: { year: 1, books: { 1: { levels: { bridge: { mastered: true } } } } } } };
  let restored = restoreLibrary(legacy); assert.equal(progressFor(bookFor(restored, 'p', 1), 'bridge').gold, true);
  legacy.players.p.books[1].levels.bridge.gold = false;
  restored = restoreLibrary(legacy); assert.equal(progressFor(bookFor(restored, 'p', 1), 'bridge').gold, false);
});
test('generic nicknames, current island, draft answer, time and question identity survive reload', () => {
  let library = createLibrary(); const id = addPlayer(library, 'A friend', 2); library.selected = id;
  let book = bookFor(library, id, 2); book.currentTask = 'bridge'; book.resumeTask = 'bridge';
  const pending = pendingQuestion(book, 'bridge', 2, seeded()); pending.draft = '42'; pending.activeMs = 1250;
  const questionId = pending.id;
  library = restoreLibrary(JSON.parse(JSON.stringify(library))); book = bookFor(library, id, 2);
  assert.equal(library.players[id].name, 'A friend'); assert.equal(book.resumeTask, 'bridge');
  assert.equal(book.levels.bridge.pending.id, questionId); assert.equal(book.levels.bridge.pending.draft, '42');
  assert.equal(book.levels.bridge.pending.activeMs, 1250);
});
test('attempt and hint telemetry distinguishes retries, preserves IDs and excludes invented past timing', () => {
  let library = createLibrary(), book = bookFor(library, 'player-1', 1);
  const pending = pendingQuestion(book, 'bridge', 1); pending.activeMs = 1500;
  const id = pending.id, answer = pending.question.answer;
  submitAnswer(book, 'bridge', 'wrong'); useHint(book, 'bridge'); useHint(book, 'bridge');
  library = restoreLibrary(JSON.parse(JSON.stringify(library))); book = bookFor(library, 'player-1', 1);
  book.levels.bridge.pending.activeMs = 3100; submitAnswer(book, 'bridge', answer);
  const attempts = book.events.filter(event => event.type === 'answer');
  assert.equal(attempts.length, 2); assert.equal(book.events.filter(event => event.type === 'hint').length, 1);
  assert.equal(attempts[0].questionId, id); assert.equal(attempts[1].questionId, id);
  assert.equal(attempts[1].attempt, 2); assert.equal(attempts[1].independent, false); assert.equal(attempts[1].activeMs, 3100);
  assert.equal(new Set(book.events.map(event => event.id)).size, 3);
  for (let i = 0; i < 510; i++) { const q = pendingQuestion(book, 'bridge', 1).question; submitAnswer(book, 'bridge', q.answer); }
  assert.equal(book.events.length, 500);
});
test('device save retains a valid backup and recovers it after damaged JSON', () => {
  const values = new Map(); const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const library = createLibrary(), book = bookFor(library, 'player-1', 1);
  const q = pendingQuestion(book, 'bridge', 1).question; submitAnswer(book, 'bridge', q.answer); writeSave(storage, library);
  const again = pendingQuestion(book, 'bridge', 1); again.draft = '123'; writeSave(storage, library);
  assert.equal(readSave(storage).library.players['player-1'].books[1].levels.bridge.pending.draft, '123');
  storage.setItem(LEARNING.saveKey, '{damaged');
  const recovered = readSave(storage); assert.equal(recovered.recovered, true);
  assert.equal(recovered.library.players['player-1'].books[1].levels.bridge.points, 1);
  assert.equal(readSave({ getItem() { throw new Error('Storage unavailable'); } }).unavailable, true);
});

test('all generated question representations survive save import; malformed visuals/events are rejected', () => {
  const library = createLibrary(), rng = seeded();
  for (const year of LEARNING.years) for (const band of [0, 1, 2]) for (let i = 0; i < 20; i++) {
    const book = bookFor(library, 'player-1', year);
    for (const level of LEARNING.levels) progressFor(book, level.task).pending = { question: generateQuestion(level.task, year, band, [], rng) };
    const restored = bookFor(restoreLibrary(JSON.parse(JSON.stringify(library))), 'player-1', year);
    for (const level of LEARNING.levels) assert.equal(restored.levels[level.task].pending?.question.key, book.levels[level.task].pending.question.key, `${level.task}/Y${year}/B${band}`);
  }
  const book = bookFor(library, 'player-1', 3), p = progressFor(book, 'light-3');
  p.mastered = true; p.points = 9;
  p.pending = { question: { ...generateQuestion('light-3', 3, 2), visual: { type: 'coins', coins: ['<img src=x>'] } } };
  book.events.push({ type: 'answer', id: 'bad', questionId: 'q', task: 'light-3', activeMs: 1, attempt: '<img src=x>', correct: true, independent: true });
  const clean = bookFor(restoreLibrary(JSON.parse(JSON.stringify(library))), 'player-1', 3);
  assert.equal(clean.levels['light-3'].pending, null); assert.equal(clean.levels['light-3'].points, 9); assert.equal(clean.levels['light-3'].mastered, true);
  assert.equal(clean.events.length, 0);
});
