import { LEARNING, generateQuestion } from './curriculum.js';
import { newId } from './id.js';

export function createBook(startBand = 1) { return { startBand, area: 0, currentTask: null, resumeTask: null, levels: {}, discoveries: [], events: [], celebrated: false }; }
export function createLibrary() { return { version: 3, selected: LEARNING.players[0].id, players: Object.fromEntries(LEARNING.players.map(p => [p.id, { name: p.name, year: p.year, books: {} }])) }; }
export function addPlayer(library, name = 'New player', year = 1) {
  if (Object.keys(library.players).length >= 20) throw new Error('This device already has 20 players');
  const id = newId(); library.players[id] = { name: String(name).trim().slice(0, 30) || 'New player', year: LEARNING.years.includes(year) ? year : 1, books: {} }; return id;
}
function event(book, data) { book.events = [...book.events, { id: newId(), at: new Date().toISOString(), ...data }].slice(-500); }

export function bookFor(library, playerId, year) {
  const player = library.players[playerId]; if (!player || !LEARNING.years.includes(year)) throw new Error('Unknown player or year');
  return player.books[year] ||= createBook();
}
export function progressFor(book, task) {
  return book.levels[task] ||= { band: book.startBand, points: 0, recent: [], cleanRun: 0, missRun: 0, completed: 0, independent: 0, pending: null, seen: [], mastered: false };
}
export function pendingQuestion(book, task, year, rng = Math.random) {
  const progress = progressFor(book, task);
  if (!progress.pending) {
    let question = generateQuestion(task, year, progress.band, progress.seen, rng);
    // Alternate representations as well as number facts, keeping practice varied.
    const lastForm = progress.recent.at(-1)?.form;
    for (let attempt = 0; attempt < 40 && question.form === lastForm; attempt++) question = generateQuestion(task, year, progress.band, progress.seen, rng);
    const clean = progress.recent.filter(item => item.clean), forms = new Set(clean.map(item => item.form));
    // Introduce a second style before the last stars, instead of leaving a hidden final hurdle.
    if (!progress.mastered && clean.length >= LEARNING.mastery.independent - 2 && forms.size < LEARNING.mastery.forms) {
      for (let attempt = 0; attempt < 40 && forms.has(question.form); attempt++) question = generateQuestion(task, year, progress.band, progress.seen, rng);
    }
    progress.seen = [...progress.seen, question.key].slice(-100);
    progress.pending = { id: newId(), year, question, missed: false, hinted: false, recorded: false, attempts: 0, activeMs: 0, draft: '' };
  }
  return progress.pending;
}
function record(progress, pending, independent) {
  progress.recent = [...progress.recent, { clean: independent, band: pending.question.band, form: pending.question.form, key: pending.question.key }].slice(-LEARNING.mastery.window);
  if (independent) { progress.independent++; progress.cleanRun++; progress.missRun = 0; if (progress.cleanRun >= LEARNING.raiseAfter) { progress.band = Math.min(2, progress.band + 1); progress.cleanRun = 0; } }
  else { progress.cleanRun = 0; if (pending.missed) { progress.missRun++; if (progress.missRun >= LEARNING.lowerAfter) { progress.band = Math.max(0, progress.band - 1); progress.missRun = 0; } } else progress.missRun = 0; }
  pending.recorded = true;
  const clean = progress.recent.filter(item => item.clean);
  if (clean.length >= LEARNING.mastery.independent && clean.filter(item => item.band === 2).length >= LEARNING.mastery.challenge && new Set(clean.map(item => item.form)).size >= LEARNING.mastery.forms && new Set(clean.map(item => item.key)).size >= LEARNING.mastery.independent) progress.mastered = true;
}
export function useHint(book, task) {
  const pending = progressFor(book, task).pending; if (!pending || pending.hinted) return;
  pending.hinted = true;
  event(book, { type: 'hint', task, questionId: pending.id, year: pending.year, band: pending.question.band, key: pending.question.key, form: pending.question.form, contentVersion: 'uk-maths-v1', activeMs: Math.round(pending.activeMs) });
}
export function submitAnswer(book, task, answer) {
  const p = progressFor(book, task), pending = p.pending;
  if (!pending) throw new Error('No question to answer');
  const entered = String(answer).trim();
  const correct = pending.question.options ? entered.toLowerCase() === pending.question.answer.toLowerCase() : /^\d+$/.test(entered) && Number(entered) === Number(pending.question.answer);
  pending.attempts++;
  event(book, { type: 'answer', task, questionId: pending.id, year: pending.year, band: pending.question.band, key: pending.question.key, form: pending.question.form, attempt: pending.attempts, correct, independent: correct && !pending.hinted && !pending.missed, hinted: pending.hinted, activeMs: Math.round(pending.activeMs), contentVersion: 'uk-maths-v1' });
  pending.draft = '';
  const previousBand = p.band, previouslyMastered = p.mastered;
  if (!correct) { pending.missed = true; if (!pending.recorded) record(p, pending, false); return { correct: false, changedBand: p.band !== previousBand }; }
  if (!pending.recorded) record(p, pending, !pending.hinted && !pending.missed);
  p.points++; p.completed++; const independent = !pending.hinted && !pending.missed;
  p.pending = null;
  return { correct: true, independent, newlyMastered: !previouslyMastered && p.mastered, changedBand: p.band !== previousBand };
}
export const masteredTasks = book => new Set(LEARNING.levels.filter(l => book.levels[l.task]?.mastered).map(l => l.task));
export const poweredTasks = book => new Set(LEARNING.levels.filter(l => (book.levels[l.task]?.points || 0) >= LEARNING.routePoints).map(l => l.task));
export function masteryStatus(progress) {
  const clean = progress.recent.filter(item => item.clean);
  return { independent: Math.min(LEARNING.mastery.independent, clean.length), challenge: Math.min(LEARNING.mastery.challenge, clean.filter(item => item.band === 2).length), forms: Math.min(LEARNING.mastery.forms, new Set(clean.map(item => item.form)).size) };
}
export function rescueStatus(progress) {
  const status = masteryStatus(progress), target = LEARNING.mastery.independent;
  if (progress.mastered) return { stars: target, challengeStars: LEARNING.mastery.challenge, otherStars: target - LEARNING.mastery.challenge, remaining: 0, challengeLeft: 0, stylesLeft: 0, complete: true };
  const distinct = new Set(progress.recent.filter(item => item.clean).map(item => item.key)).size;
  const challengeLeft = LEARNING.mastery.challenge - status.challenge;
  const remaining = Math.max(target - status.independent, challengeLeft, target - distinct);
  const stars = target - remaining, challengeStars = Math.min(status.challenge, stars);
  return { stars, challengeStars, otherStars: stars - challengeStars, remaining, challengeLeft, stylesLeft: LEARNING.mastery.forms - status.forms, complete: false };
}
function validQuestion(q, family) {
  if (!q || q.family !== family || ![0, 1, 2].includes(q.band)) return false;
  if (!['key', 'answer', 'prompt', 'hint', 'form', 'expression'].every(field => typeof q[field] === 'string' && q[field].length <= 1500)) return false;
  if (q.options && (!Array.isArray(q.options) || q.options.length > 4 || !q.options.every(value => typeof value === 'string' && value.length <= 80))) return false;
  const v = q.visual;
  const required = { count: ['a', 'b'], takeAway: ['a', 'b'], place: ['number'], numberCards: ['numbers'], column: ['a', 'b', 'op'], array: ['groups', 'each'], sharing: ['groups', 'total'], partition: ['groups', 'each'], fraction: ['numerator', 'denominator'], coins: ['coins'], ribbon: ['a', 'b'], rectangle: ['width', 'height'], measure: ['whole', 'rest', 'unit', 'output'], clock: ['hour', 'minutes'], shape: ['name', 'sides', 'right'], chart: ['labels', 'units', 'scale'] };
  if (!v || !Object.hasOwn(required, v.type) || !required[v.type].every(field => Object.hasOwn(v, field))) return false;
  const number = value => Number.isInteger(value) && value >= 0 && value <= 10_000;
  const numericFields = ['a', 'b', 'number', 'groups', 'each', 'total', 'numerator', 'denominator', 'quantity', 'paid', 'width', 'height', 'whole', 'rest', 'hour', 'minutes', 'sides', 'right', 'scale'];
  if (!required[v.type].filter(field => numericFields.includes(field)).every(field => number(v[field]))) return false;
  for (const field of numericFields) if (v[field] != null && !number(v[field])) return false;
  for (const field of ['coins', 'units']) if (Object.hasOwn(v, field) && (!Array.isArray(v[field]) || v[field].length > 24 || !v[field].every(number))) return false;
  if (v.type === 'numberCards' && (!Array.isArray(v.numbers) || v.numbers.length > 4 || !v.numbers.every(value => value === '?' || number(value)))) return false;
  if (v.type === 'chart' && (!Array.isArray(v.labels) || v.labels.length > 5 || v.labels.length !== v.units.length || !v.labels.every(value => typeof value === 'string' && value.length <= 40) || v.units.some(value => value > 20))) return false;
  if (v.type === 'count' && v.a + v.b > 100 || v.type === 'takeAway' && v.a > 100 || ['array', 'sharing'].includes(v.type) && v.groups > 24 || v.type === 'array' && v.each > 24) return false;
  if (v.type === 'fraction' && (v.denominator < 1 || v.denominator > 20) || v.type === 'shape' && (v.sides < 3 || v.sides > 12)) return false;
  if (v.type === 'shape' && !['triangle', 'square', 'rectangle', 'pentagon', 'hexagon'].includes(v.name)) return false;
  if (v.type === 'column' && !['+', '−'].includes(v.op)) return false;
  if (v.type === 'measure' && (!['m', 'kg'].includes(v.unit) || !['cm', 'g'].includes(v.output))) return false;
  return true;
}
export function restoreLibrary(raw) {
  const library = createLibrary(); if (!raw || ![2, 3].includes(raw.version) || !raw.players || typeof raw.players !== 'object') return library;
  const entries = Object.entries(raw.players).filter(([id, value]) => /^[a-zA-Z0-9_-]{1,64}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id) && value && typeof value === 'object').slice(0, 20);
  if (!entries.length) return library;
  library.players = {};
  for (const [id, old] of entries) {
    const player = { id };
    library.players[id] = { name: typeof old.name === 'string' && old.name.trim() ? old.name.trim().slice(0, 30) : id.replace(/^./, c => c.toUpperCase()), year: LEARNING.years.includes(old.year) ? old.year : 1, books: {} };
    for (const year of LEARNING.years) {
      const data = old.books?.[year]; if (!data || typeof data !== 'object') continue;
      const book = createBook([0, 1, 2].includes(data.startBand) ? data.startBand : 1);
      book.area = [0, 1, 2].includes(data.area) ? data.area : 0;
      book.currentTask = LEARNING.levels.some(l => l.task === data.currentTask) ? data.currentTask : null;
      book.resumeTask = LEARNING.levels.some(l => l.task === data.resumeTask) ? data.resumeTask : null;
      book.events = Array.isArray(data.events) ? data.events.filter(item => item && typeof item.id === 'string' && ['answer', 'hint'].includes(item.type) && LEARNING.levels.some(l => l.task === item.task) && typeof item.questionId === 'string' && Number.isFinite(item.activeMs) && item.activeMs >= 0 && (item.type === 'hint' || Number.isSafeInteger(item.attempt) && item.attempt >= 1 && typeof item.correct === 'boolean' && typeof item.independent === 'boolean')).slice(-500) : [];
      book.celebrated = data.celebrated === true;
      book.discoveries = Array.isArray(data.discoveries) ? data.discoveries.filter(s => typeof s === 'string') : [];
      for (const level of LEARNING.levels) {
        const oldProgress = data.levels?.[level.task]; if (!oldProgress || typeof oldProgress !== 'object') continue;
        const p = progressFor(book, level.task);
        for (const field of ['points', 'completed', 'independent', 'cleanRun', 'missRun']) p[field] = Number.isSafeInteger(oldProgress[field]) && oldProgress[field] >= 0 ? oldProgress[field] : 0;
        p.band = [0, 1, 2].includes(oldProgress.band) ? oldProgress.band : book.startBand;
        p.recent = Array.isArray(oldProgress.recent) ? oldProgress.recent.filter(item => item && typeof item.key === 'string' && typeof item.form === 'string' && [0, 1, 2].includes(item.band) && typeof item.clean === 'boolean').slice(-LEARNING.mastery.window) : [];
        p.seen = Array.isArray(oldProgress.seen) ? oldProgress.seen.filter(s => typeof s === 'string').slice(-100) : [];
        p.mastered = oldProgress.mastered === true;
        const pending = oldProgress.pending;
        if (validQuestion(pending?.question, level.type)) {
          p.pending = { id: typeof pending.id === 'string' ? pending.id : newId(), year, question: pending.question, missed: pending.missed === true, hinted: pending.hinted === true, recorded: pending.recorded === true, attempts: Number.isSafeInteger(pending.attempts) && pending.attempts >= 0 ? pending.attempts : pending.missed ? 1 : 0, activeMs: Number.isFinite(pending.activeMs) && pending.activeMs >= 0 ? pending.activeMs : 0, draft: typeof pending.draft === 'string' ? pending.draft.replace(/[^0-9]/g, '').slice(0, 5) : '' };
        }
      }
      if (raw.version === 2) {
        const pending = LEARNING.levels.filter(l => book.levels[l.task]?.pending);
        book.resumeTask = (pending.filter(l => LEARNING.levels.indexOf(l) < (book.area === 0 ? 3 : book.area === 1 ? 7 : 12) && LEARNING.levels.indexOf(l) >= (book.area === 0 ? 0 : book.area === 1 ? 3 : 7)).at(-1) || pending.at(-1))?.task || null;
        book.currentTask = book.resumeTask;
      }
      library.players[player.id].books[year] = book;
    }
  }
  library.selected = Object.hasOwn(library.players, raw.selected) ? raw.selected : Object.keys(library.players)[0];
  return library;
}
