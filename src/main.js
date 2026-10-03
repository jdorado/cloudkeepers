import './style.css';
import './tokens.css';
import './learning.css';
import { CONFIG } from './game.config.js';
import { JOURNEY, islandFor, islandAvailable, currentIsland, nextIsland } from './journey.js';
import { readSave, writeSave } from './save-store.js';
import { SkyWorld } from './world.js';
import { LEARNING, levelTitle, difficultyDescription } from './curriculum.js';
import { restoreLibrary, addPlayer, bookFor, progressFor, pendingQuestion, skipPending, submitAnswer, useHint, masteredTasks, poweredTasks, rescueStatus } from './learning.js';
import { questionVisual, escapeHtml as e } from './question-view.js';
import { setupCloud } from './cloud-save.js';

const $ = id => document.getElementById(id);
const loaded = readSave();
let library = loaded.library, saveFailed = loaded.unavailable;
let playerId = library.selected, year = library.players[playerId].year, book = bookFor(library, playerId, year);
let done = masteredTasks(book), powered = poweredTasks(book), discoveries = new Set(book.discoveries);
let island = currentIsland(book);
let mode = 'opening', activeTask = null, destination = null, closest = null, toastTimer, audio = null, soundOn = false;
const keys = new Set(), touchDirections = new Set();
let world, cloud;
try { world = new SkyWorld($('world')); } catch {
  $('opening').innerHTML = '<h1>A little sky<br>is waiting.</h1><p>This browser needs WebGL to open the village. Please use a recent Safari, Chrome, or Edge with graphics acceleration enabled.</p>';
  throw new Error('WebGL could not start.');
}
function restoreWorld() {
  done = masteredTasks(book); powered = poweredTasks(book); discoveries = new Set(book.discoveries);
  world.restore(done, powered);
  island = currentIsland(book); world.visit(island);
}
restoreWorld();

function save() {
  book.area = world.area; book.currentTask = island.id; book.discoveries = [...discoveries];
  try { if (cloud?.userId) cloud.save(library); else writeSave(localStorage, library); saveFailed = false; }
  catch { saveFailed = true; }
  if (!cloud?.userId) $('save-status').textContent = saveFailed ? 'Not saved · browser storage unavailable' : 'Saved on this device';
  if (!cloud?.userId) $('save-status').classList.toggle('save-error', saveFailed);
  $('storage-warning').hidden = !saveFailed;
}
function toast(message) {
  clearTimeout(toastTimer); $('toast').textContent = message; $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4500);
}
function tone(notes, duration = .2) {
  if (!soundOn) return;
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  notes.forEach((hz, i) => {
    const oscillator = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + i * duration;
    oscillator.type = 'sine'; oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.07, start + .02); gain.gain.exponentialRampToValueAtTime(.001, start + duration + .2);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + duration + .25);
  });
}
function setMode(next) {
  mode = next; world.mode = next; keys.clear(); touchDirections.clear(); destination = null;
  if (next === 'play') world.focusArea();
  $('opening').hidden = next !== 'opening'; $('hud').hidden = next !== 'play'; $('ending').hidden = next !== 'ending';
  $('markers').hidden = next !== 'play'; updateHud();
}
function guide() {
  if (done.size === JOURNEY.length) return 'All twelve friends are home. Revisit any island for fresh practice.';
  const p = progressFor(book, island.id), status = rescueStatus(p), next = nextIsland(island.id);
  return p.mastered ? next ? `Island ${island.number} complete! Travel to Island ${next.number}: ${next.name}.` : 'The sky picnic is ready!' : `Island ${island.number} is Level ${island.number}. Rescue ${island.friend}: ${remainingText(status)}.`;
}
function visitIsland(next, question = false) {
  if (!next || !islandAvailable(book, next.id)) return;
  island = next; book.currentTask = island.id; world.visit(island); destination = null;
  save(); updateHud(); if (question) openPuzzle(island);
}
function updateHud() {
  const player = library.players[playerId];
  const hasProgress = Object.values(book.levels).some(p => p.points || p.pending || p.recent.length);
  $('play').innerHTML = `${hasProgress ? `Continue · Island ${island.number}` : 'Let’s play'} <span>↗</span>`;
  $('chapter').innerHTML = `<span>${e(player.name.toUpperCase())} · YEAR ${year}</span><b>ISLAND ${island.number} · LEVEL ${island.number}</b>`;
  $('area-name').textContent = island.name;
  $('progress-count').textContent = `${done.size} / ${JOURNEY.length}`;
  $('progress-fill').style.width = `${done.size / JOURNEY.length * 100}%`; $('guide').textContent = guide();
  document.body.classList.toggle('restored', done.size === JOURNEY.length);
  const nav = document.querySelector('.island-nav'); nav.replaceChildren();
  const index = JOURNEY.indexOf(island);
  for (const [label, next] of [['← Previous', JOURNEY[index - 1]], ['Next island →', JOURNEY[index + 1]]]) {
    const b = document.createElement('button'); b.textContent = label;
    b.disabled = !next || !islandAvailable(book, next.id);
    b.setAttribute('aria-label', next ? `Visit Island ${next.number}: ${next.name}` : label);
    b.onclick = () => { visitIsland(next); tone([392, 523], .1); }; nav.append(b);
  }
}
function profileSetup() {
  const choices = document.querySelector('.player-choices'); choices.replaceChildren();
  for (const [id, player] of Object.entries(library.players)) {
    const b = document.createElement('button'); b.textContent = player.name; b.dataset.player = id;
    b.setAttribute('aria-pressed', String(id === playerId)); b.onclick = () => selectProfile(id); choices.append(b);
  }
  $('player-name').value = library.players[playerId].name;
  $('school-year').value = year; $('start-band').value = book.startBand;
  $('profile-note').textContent = `${library.players[playerId].name} · ${done.size}/12 friends rescued. New islands start here; played islands keep their adaptive difficulty.`;
}
function selectProfile(id, nextYear = library.players[id].year) {
  save(); playerId = id; year = nextYear; library.selected = id; library.players[id].year = year;
  book = bookFor(library, playerId, year); restoreWorld(); buildMarkers(); profileSetup(); updateHud(); save();
}
$('player-name').oninput = () => {
  library.players[playerId].name = $('player-name').value.trim().slice(0, 30) || 'Player';
  document.querySelectorAll('[data-player]').forEach(button => { if (button.dataset.player === playerId) button.textContent = library.players[playerId].name; });
  $('profile-note').textContent = `${library.players[playerId].name} · ${done.size}/12 friends rescued. Every player keeps their own progress.`;
  updateHud(); save();
};
$('player-name').onchange = profileSetup;
$('add-player').onclick = () => { try { const id = addPlayer(library, `Player ${Object.keys(library.players).length + 1}`, year); selectProfile(id); $('player-name').focus(); } catch (error) { toast(error.message); } };
$('download-save').onclick = () => {
  save(); const url = URL.createObjectURL(new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'cloudkeepers-save.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('restore-save').onchange = async () => {
  const file = $('restore-save').files[0]; if (!file) return;
  try {
    if (file.size > 20_000_000) throw new Error('This save file is too large.');
    const raw = JSON.parse(await file.text());
    if (![2, 3].includes(raw.version) || !raw.players || typeof raw.players !== 'object') throw new Error('Choose a Cloudkeepers save file.');
    const restored = restoreLibrary(raw); library = restored; playerId = library.selected; year = library.players[playerId].year; book = bookFor(library, playerId, year);
    restoreWorld(); buildMarkers(); profileSetup(); updateHud(); save(); toast('Save restored. Choose Continue to return to your island.');
  } catch (error) { toast(`Could not restore: ${error.message}`); }
  $('restore-save').value = '';
};
$('school-year').onchange = () => selectProfile(playerId, Number($('school-year').value));
$('start-band').onchange = () => { book.startBand = Number($('start-band').value); for (const p of Object.values(book.levels)) if (!p.completed && !p.pending && !p.recent.length) p.band = book.startBand; save(); };
$('play').onclick = () => {
  setMode('play'); $('play').blur(); tone([392, 494, 587]);
  if (done.size === JOURNEY.length && !book.celebrated) { book.celebrated = true; book.resumeTask = null; world.travel(2); setMode('ending'); save(); return; }
  const resume = islandFor(book.resumeTask);
  if (resume && islandAvailable(book, resume.id)) {
    const next = nextIsland(resume.id), p = progressFor(book, resume.id);
    visitIsland(p.mastered && !p.pending && next ? next : resume, true);
  } else if (!done.size) toast('Help this island’s friend. Six varied stars unlock the next island.');
};
$('home').onclick = () => { closePuzzle(); closeLevels(); $('help-modal').hidden = true; setMode('opening'); profileSetup(); };
$('sound').onclick = () => {
  soundOn = !soundOn; $('sound').innerHTML = soundOn ? '♫ <span>Sound on</span>' : '♫ <span>Sound off</span>';
  $('sound').setAttribute('aria-pressed', String(soundOn)); $('sound').setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
  if (soundOn) tone([392, 523, 659], .12);
};
let beforeHelp;
function showHelp() { beforeHelp = document.activeElement; keys.clear(); destination = null; $('help-modal').hidden = false; $('close-help').focus(); }
function closeHelp() { $('help-modal').hidden = true; beforeHelp?.focus(); }
$('help').onclick = showHelp; $('close-help').onclick = closeHelp; $('help-ok').onclick = closeHelp;
$('replay').onclick = () => { setMode('play'); visitIsland(JOURNEY[0]); save(); updateHud(); toast('Your friends are safe. Choose any level for new questions.'); showLevels(); };
$('explore').onclick = () => { setMode('play'); visitIsland(JOURNEY.at(-1)); updateHud(); $('explore').blur(); save(); };
function closeLevels() { $('levels-modal').hidden = true; $('levels').focus(); }
function practiceLog() {
  const answers = book.events.filter(event => event.type === 'answer');
  const first = answers.filter(event => event.attempt === 1);
  const correct = first.filter(event => event.correct && event.independent);
  const hints = book.events.filter(event => event.type === 'hint');
  return `<details class="practice-log"><summary>Parent: practice history</summary><p>${answers.length} answer attempts · ${correct.length}/${first.length} first answers correct without help · ${hints.length} hints. Showing the most recent 500 events for this player and school year.</p><table><thead><tr><th>Island</th><th>Difficulty</th><th>Try</th><th>Result</th><th>Thinking time*</th></tr></thead><tbody>${answers.slice(-12).reverse().map(event => `<tr><td>${islandFor(event.task)?.number}</td><td>${e(LEARNING.bands[event.band] || '')}</td><td>${event.attempt}</td><td>${event.correct ? event.independent ? 'Correct, independent' : 'Correct with help/retry' : 'Try again'}</td><td>${Math.round(event.activeMs / 1000)}s</td></tr>`).join('')}</tbody></table><p>*Approximate cumulative time with the question open and browser focused. Hidden tabs, menus and pauses after 90 seconds without interaction are excluded. Timing does not decide stars or difficulty. Signed-in learning evidence is saved automatically for planning future practice. Older saves have no reconstructed evidence.</p></details>`;
}
function showLevels() {
  keys.clear(); touchDirections.clear(); destination = null;
  const card = document.querySelector('.level-card');
  card.innerHTML = `<button class="close" id="close-levels" aria-label="Close levels">×</button><span class="eyebrow">${e(library.players[playerId].name.toUpperCase())} · UK YEAR ${year}</span><h2 id="levels-title">Twelve islands. One sky adventure.</h2><p>Each island is one maths level. Collect six varied stars at the difficulty that is right for you to rescue its friend and unlock the next island. Challenge questions also earn optional Gold.</p><div class="level-grid">${JOURNEY.map((t, i) => {
    const p = progressFor(book, t.id), status = rescueStatus(p), unlocked = islandAvailable(book, t.id);
    const completeText = status.gold ? '★ Gold · level complete' : `✓ Level complete · Gold ${status.goldProgress}/4 optional`;
    return `<button class="level-tile${p.mastered ? ' mastered' : ''}" data-level="${t.id}" ${unlocked ? '' : 'disabled'}><span class="level-index">ISLAND ${String(i + 1).padStart(2, '0')} · LEVEL ${i + 1}</span><strong>${e(t.name)}</strong><small>${e(levelTitle(t.id, year))}</small><small>Rescue ${e(t.friend)} · ${e(LEARNING.bands[p.band])}</small><div class="mini-track"><span style="width:${p.mastered ? 100 : status.stars / LEARNING.mastery.independent * 100}%"></span></div><span class="tile-status">${!unlocked ? `Complete Island ${i} to unlock` : p.mastered ? completeText : `${status.stars}/6 stars · ${remainingText(status)}`}</span></button>`;
  }).join('')}</div>${practiceLog()}<div class="level-legend"><span>♡ ${done.size}/12 friends rescued · ${e($('save-status').textContent)}</span><button id="change-player" class="text-button">Change player or starting year</button></div>`;
  $('levels-modal').hidden = false; $('close-levels').onclick = closeLevels;
  $('change-player').onclick = () => { closeLevels(); setMode('opening'); profileSetup(); };
  card.querySelectorAll('[data-level]').forEach(b => b.onclick = () => { const t = islandFor(b.dataset.level); closeLevels(); visitIsland(t, true); });
  $('close-levels').focus();
}
$('levels').onclick = showLevels;

const markers = new Map();
function buildMarkers() {
  $('markers').replaceChildren(); markers.clear();
  for (const item of [...CONFIG.tasks, ...CONFIG.discoveries]) {
    const button = document.createElement('button');
    button.className = 'world-marker' + (item.type ? ' discovery' : '');
    const compact = item.type ? { bell: 'Wishing bell', sprout: 'Sleepy sprout', shell: 'Sky shell' }[item.type] : item.title.replace(/^The lighthouse · /, '').replace(/^The /, '').replace(/^A /, '').replace(/^lift for /, '').replace(/^rescue for /, '');
    button.innerHTML = `<span class="spark">${item.type ? '✧' : '✦'}</span><span class="marker-full">${item.title.replace('The lighthouse · ', '')}</span><span class="marker-short">${compact}</span>`;
    button.setAttribute('aria-label', item.title); button.dataset.object = item.id;
    button.onclick = () => approach(item); $('markers').append(button); markers.set(item.id, button);
  }
}
function approach(item) {
  if (mode !== 'play' || activeTask) return;
  destination = { x: item.x, z: item.z + 1.35, item };
  if (Math.hypot(world.fox.position.x - item.x, world.fox.position.z - item.z) < 3) interact(item);
}
function interact(item) {
  destination = null;
  if (item.type) {
    discoveries.add(item.id); save(); world.burst(item.x, item.z); toast(item.message); tone(item.type === 'bell' ? [784, 1047, 784] : [330, 440, 587], .14);
  } else if (item.id === island.id && islandAvailable(book, item.id)) openPuzzle(island);
}
$('interact').onclick = () => { if (closest) interact(closest); };
buildMarkers();

function openPuzzle(task) {
  activeTask = task; book.resumeTask = task.id; keys.clear(); touchDirections.clear(); destination = null;
  clearTimeout(toastTimer); $('toast').classList.remove('visible');
  $('challenge').hidden = false; $('interact').hidden = true; renderQuestion(); tone([440], .1);
}
function closePuzzle() {
  const previous = activeTask; activeTask = null; book.resumeTask = null; save(); $('challenge').hidden = true; keys.clear(); touchDirections.clear();
  if (previous) markers.get(previous.id)?.focus();
}
function shell(body) {
  const t = activeTask, index = islandFor(t.id).number;
  document.querySelector('.puzzle').innerHTML = `<button class="close" id="close-puzzle" aria-label="Return to village">×</button><span class="eyebrow">ISLAND ${index} · LEVEL ${index} · YEAR ${year} · RESCUE ${e(t.friend.toUpperCase())}</span><h2 id="puzzle-title" tabindex="-1">${e(levelTitle(t.id, year))}</h2>${body}`;
  $('close-puzzle').onclick = closePuzzle;
  document.querySelector('.puzzle').scrollTop = 0;
}
function remainingText(status) {
  if (status.complete) return 'Level complete';
  if (status.stylesLeft && status.remaining === 1) return 'One different question style left';
  const number = status.remaining;
  return `${number} rescue ${number === 1 ? 'star' : 'stars'} left`;
}
function progressHtml(p, task = activeTask) {
  const status = rescueStatus(p), target = LEARNING.mastery.independent, gold = LEARNING.mastery.challenge;
  const stars = (count, earned, kind) => Array.from({ length: count }, (_, i) => `<span class="rescue-star ${kind}${i < earned ? ' earned' : ''}" aria-hidden="true">${i < earned ? '★' : '☆'}</span>`).join('');
  const powerLeft = Math.max(0, LEARNING.routePoints - p.points);
  const powerText = powerLeft ? `Midpoint · ${powerLeft} successful ${powerLeft === 1 ? 'answer' : 'answers'} to restore the landmark` : status.complete ? 'Landmark restored' : 'Landmark restored · rescue continues';
  const goldText = status.gold ? '★ Gold Challenge earned' : `☆ Gold Challenge ${status.goldProgress}/${gold} · optional`;
  return `<section class="rescue-progress${status.complete ? ' complete' : ''}" id="level-progress" aria-label="Level progress"><div class="rescue-heading"><strong>${status.complete ? `✓ Level ${islandFor(task.id).number} complete` : `Rescue ${e(task.friend)}`}</strong><b>${status.stars}/${target} stars</b></div><div class="rescue-stars" role="img" aria-label="${status.stars} of ${target} rescue stars earned"><div>${stars(target, status.stars, 'any')}<small>Rescue stars · any difficulty</small></div></div><p class="rescue-remaining" role="status">${status.complete ? `${e(task.friend)} is safely home. Choose the next level!` : e(remainingText(status))}</p><div class="route-progress"><span>⚡ ${e(powerText)}</span><span>${e(goldText)}</span><small>${status.complete ? nextIsland(task.id) ? `Island ${nextIsland(task.id).number} unlocked` : 'All islands complete' : 'Six varied rescue stars unlock the next island'}</small></div></section>`;
}
function difficultyHtml(task, q) {
  return `<div class="difficulty-panel"><div class="skill-line"><label for="question-band">How tricky?</label><select id="question-band" class="difficulty-select" aria-label="Question difficulty">${LEARNING.bands.map((band, i) => `<option value="${i}" ${i === q.band ? 'selected' : ''}>${e(band)}</option>`).join('')}</select></div><p><b>${e(LEARNING.bands[q.band])}:</b> ${e(difficultyDescription(task.id, year, q.band))}</p><small>Every difficulty earns rescue stars. Challenge also works toward optional Gold.</small></div>`;
}
function questionCredit(p, pending) {
  if (p.mastered) return p.gold ? 'Extra practice. Gold earned and your friend stays rescued.' : 'Extra practice. Four independent Challenge answers earn optional Gold.';
  if (pending.hinted || pending.missed) return 'Use the hint and try again. Your next fresh question can earn a star.';
  return 'Answer on your own, on your first try, to earn a star.';
}
function renderQuestion() {
  const t = activeTask, p = progressFor(book, t.id), pending = pendingQuestion(book, t.id, year), q = pending.question;
  lastActivity = performance.now(); save();
  const equationLabel = q.visual.type === 'numberCards' && q.expression.includes('?') ? 'Missing number =' : q.visual.type === 'column' && !q.expression.includes('?') ? q.family === 'subtract' ? 'Left =' : 'Total =' : q.expression;
  const choices = q.options ? `<div class="answer-choices" aria-label="Choose your answer">${q.options.map(option => `<button type="button" data-answer="${e(option)}">${e(option)}</button>`).join('')}</div>` : `<label class="equation" for="answer"><span>${e(equationLabel)}</span><input id="answer" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="5" aria-label="Your answer" /></label><div class="keypad" aria-label="Number buttons">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button type="button" data-number="${n}">${n}</button>`).join('')}<button type="button" id="erase-number" aria-label="Delete a digit">⌫</button><button type="button" id="clear-number" aria-label="Clear answer">C</button></div><button class="primary" type="submit">Check answer <span>✦</span></button>`;
  const missing = ['add', 'subtract'].includes(q.family) && q.expression.includes('?');
  shell(`${progressHtml(p)}${difficultyHtml(t, q)}<p class="puzzle-intro" id="question-prompt">${e(q.prompt)}</p>${q.options && q.visual.type === 'numberCards' ? '' : questionVisual(q)}${missing ? '<p class="missing-note">Enter the number that belongs in the ? box.</p>' : ''}<form class="answer-form">${q.options ? `<p class="choice-expression">${e(q.expression)}</p>` : ''}${choices}<p class="feedback" id="feedback" role="status" aria-live="polite">${pending.missed ? 'Take your time. This question is ready for another try.' : ''}</p></form><button class="hint-button" id="hint-button" aria-expanded="${pending.hinted}">${pending.hinted ? 'Hide hint' : 'Show a hint'}</button><div class="hint" id="hint" ${pending.hinted ? '' : 'hidden'}>${e(q.hint)}</div><p class="mastery-details" id="question-credit">${e(questionCredit(p, pending))}</p><details class="rescue-rules"><summary>How do rescue stars work?</summary><p>Collect six stars at the difficulty that is right for you. Solve on your first try without opening a hint. We check your last eight questions, with different facts and at least two question styles. Hints and retries still restore landmarks. Four independent Challenge answers earn optional Gold, but Gold never blocks the next island. Rescued friends stay rescued.</p></details>`);
  $('question-band').onchange = () => { skipPending(book, t.id); p.band = Number($('question-band').value); p.pending = null; p.cleanRun = 0; p.missRun = 0; save(); renderQuestion(); };
  const input = $('answer');
  if (input) {
    input.value = pending.draft;
    const saveDraft = () => { input.value = input.value.replace(/[^0-9]/g, '').slice(0, 5); pending.draft = input.value; save(); };
    input.addEventListener('input', saveDraft);
    document.querySelector('.answer-form').onsubmit = event => { event.preventDefault(); checkAnswer(input.value); };
    document.querySelectorAll('[data-number]').forEach(b => b.onclick = () => { if (input.value.length < 5) input.value += b.dataset.number; saveDraft(); });
    $('erase-number').onclick = () => { input.value = input.value.slice(0, -1); saveDraft(); }; $('clear-number').onclick = () => { input.value = ''; saveDraft(); };
  } else document.querySelectorAll('[data-answer]').forEach(b => b.onclick = () => checkAnswer(b.dataset.answer));
  $('hint-button').onclick = () => {
    const show = $('hint').hidden; $('hint').hidden = !show;
    $('hint-button').setAttribute('aria-expanded', String(show)); $('hint-button').textContent = show ? 'Hide hint' : 'Show a hint';
    if (show) { useHint(book, t.id); save(); $('question-credit').textContent = questionCredit(p, pending); }
  };
  const counted = new Set();
  document.querySelectorAll('[data-count]').forEach(button => button.onclick = () => {
    const id = button.dataset.count; if (counted.has(id)) counted.delete(id); else counted.add(id);
    button.classList.toggle('counted', counted.has(id)); button.setAttribute('aria-pressed', String(counted.has(id)));
    $('count-caption').textContent = `${counted.size} crystals marked`; tone([330 + counted.size * 13], .03);
  });
  if (input && innerWidth > 700 && innerHeight > 850 && !matchMedia('(pointer: coarse)').matches) input.focus(); else $('puzzle-title').focus({ preventScroll: true });
}
function checkAnswer(answer) {
  if (!String(answer).trim()) { $('feedback').textContent = 'Choose an answer first.'; $('answer')?.focus(); return; }
  const t = activeTask, p = progressFor(book, t.id), before = rescueStatus(p), questionBand = p.pending.question.band;
  const result = submitAnswer(book, t.id, answer);
  if (!result.correct) {
    useHint(book, t.id); save(); $('level-progress').outerHTML = progressHtml(p); $('question-credit').textContent = questionCredit(p, p.pending); $('feedback').classList.add('wrong');
    $('feedback').textContent = `Let’s try a different way.${result.changedBand ? ' Your next question will be gentler.' : ' Your progress is safe.'}`;
    $('hint').hidden = false; $('hint-button').textContent = 'Hide hint'; $('hint-button').setAttribute('aria-expanded', 'true');
    if ($('answer')) { $('answer').value = ''; if (!matchMedia('(pointer: coarse)').matches) $('answer').focus(); }
    tone([330, 392], .1); return;
  }
  done = masteredTasks(book); powered = poweredTasks(book); world.restore(done, powered); world.burst(t.x, t.z); save(); updateHud(); tone([392, 494, 587, 784], .12);
  const last = done.size === CONFIG.tasks.length && !book.celebrated;
  const status = rescueStatus(p), starEarned = status.stars > before.stars;
  const nextLevel = nextIsland(t.id);
  const message = result.newlyMastered ? `${t.friend} rescued!` : result.newlyGold ? 'Gold Challenge earned!' : starEarned ? 'Rescue star earned!' : p.mastered ? 'Lovely practice!' : result.independent ? 'Correct! Keep going.' : 'You worked it out!';
  let detail = result.newlyMastered ? `All six rescue stars are ready. Level ${islandFor(t.id).number} is complete!` : result.newlyGold ? 'Four independent Challenge answers earned optional Gold. Your island progress was already safe.' : starEarned ? `${status.stars} of six rescue stars earned. ${remainingText(status)}.` : result.independent ? p.mastered ? 'Your friend is safe. You can keep practising or choose another level.' : `Good practice. ${remainingText(status)}.` : `Hints and retries help you learn. This answer restores the landmark; the next fresh question can earn a rescue star.`;
  if (result.changedBand) detail += p.band === 2 ? ' You’re ready for Challenge; it can also earn optional Gold.' : `Next questions: ${LEARNING.bands[p.band]}.`;
  if (result.newlyMastered && nextLevel) detail += ` Next: Level ${nextLevel.number}, ${levelTitle(nextLevel.id, year)}.`;
  const buttonLabel = last ? 'See the village shine' : result.newlyMastered ? 'Travel to next island' : p.mastered ? 'Keep practising' : status.stylesLeft && status.remaining === 1 ? 'Try a different question' : p.band === 2 ? 'Next Challenge question' : 'Next question';
  shell(`<div class="success${result.newlyMastered ? ' level-complete' : ''}">${result.newlyMastered ? `<div class="friend-portrait" style="--friend-color:${t.color}"><i></i><i></i></div>` : `<div class="reward-icon">${starEarned || result.newlyGold ? '★' : '✓'}</div>`}<span class="eyebrow">${result.newlyMastered ? `LEVEL ${islandFor(t.id).number} COMPLETE` : result.newlyGold ? 'GOLD CHALLENGE' : starEarned ? 'RESCUE STAR' : 'GOOD PRACTICE'}</span><h2>${e(message)}</h2><p>${e(detail)}</p>${progressHtml(p)}<div class="success-actions"><button class="primary" id="next-question">${e(buttonLabel)} <span>↗</span></button><button class="text-button" id="back-levels">Level map</button></div>${result.newlyMastered && !last ? '<button class="text-button" id="practise-again">Practise this level again</button>' : ''}</div>`);
  function celebrate() { book.celebrated = true; closePuzzle(); world.travel(2); setMode('ending'); world.burst(26.5, 1); save(); tone([523, 659, 784, 1047], .2); $('replay').focus(); }
  $('next-question').onclick = () => { if (last) celebrate(); else if (result.newlyMastered && nextLevel) { closePuzzle(); visitIsland(nextLevel, true); } else renderQuestion(); };
  if ($('practise-again')) $('practise-again').onclick = renderQuestion;
  $('back-levels').onclick = () => { if (last) celebrate(); else { closePuzzle(); showLevels(); } };
  $('next-question').focus({ preventScroll: true });
}

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('levels-modal').hidden) closeLevels(); else if (!$('help-modal').hidden) closeHelp(); else if (activeTask) closePuzzle(); return; }
  const modal = activeTask ? document.querySelector('.puzzle') : !$('levels-modal').hidden ? document.querySelector('.level-card') : !$('help-modal').hidden ? document.querySelector('.help-card') : null;
  if (modal && e.key === 'Tab') {
    const focusables = [...modal.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')].filter(el => el.offsetParent !== null);
    const first = focusables[0], last = focusables.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  if (mode !== 'play' || modal || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const key = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'e', ' '].includes(key)) { e.preventDefault(); destination = null; }
  if ((key === 'e' || key === ' ') && closest && !e.repeat) interact(closest);
  else keys.add(key);
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); touchDirections.clear(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); touchDirections.clear(); } });
document.querySelectorAll('[data-dir]').forEach(b => {
  b.onpointerdown = e => { e.preventDefault(); destination = null; b.setPointerCapture(e.pointerId); touchDirections.add(b.dataset.dir); };
  b.onpointerup = b.onpointercancel = () => touchDirections.delete(b.dataset.dir);
});
world.renderer.domElement.addEventListener('pointerdown', e => {
  if (mode !== 'play' || activeTask || !$('help-modal').hidden || !$('levels-modal').hidden) return;
  const pos = world.pointer(e.clientX, e.clientY); if (pos) destination = { x: pos.x, z: pos.z };
});

let previousTime = performance.now(), lastActivity = performance.now(), lastTimingSave = performance.now();
for (const type of ['pointerdown', 'keydown', 'input']) document.addEventListener(type, () => { lastActivity = performance.now(); });
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { save(); if (!document.hidden) lastActivity = performance.now(); });
function frame(now) {
  requestAnimationFrame(frame); const elapsed = now - previousTime, dt = Math.min(elapsed / 1000, .045); previousTime = now;
  const pending = activeTask && book.levels[activeTask.id]?.pending;
  if (pending && !document.hidden && document.hasFocus() && now - lastActivity < 90_000) {
    pending.activeMs += Math.min(elapsed, 1000);
    if (now - lastTimingSave > 10_000) { save(); lastTimingSave = now; }
  }
  if (mode === 'play' && !activeTask && $('help-modal').hidden && $('levels-modal').hidden) {
    let horizontal = Number(keys.has('d') || keys.has('arrowright') || touchDirections.has('right')) - Number(keys.has('a') || keys.has('arrowleft') || touchDirections.has('left'));
    let vertical = Number(keys.has('w') || keys.has('arrowup') || touchDirections.has('up')) - Number(keys.has('s') || keys.has('arrowdown') || touchDirections.has('down'));
    let dx = horizontal * .927 - vertical * .377, dz = -horizontal * .377 - vertical * .927;
    if (destination && !horizontal && !vertical) {
      dx = destination.x - world.fox.position.x; dz = destination.z - world.fox.position.z; const distance = Math.hypot(dx, dz);
      if (distance < .25 || destination.item && Math.hypot(world.fox.position.x - destination.item.x, world.fox.position.z - destination.item.z) < 2.6) {
        const item = destination.item; destination = null; dx = dz = 0; if (item) interact(item);
      }
    }
    const length = Math.hypot(dx, dz); if (length > .001) world.walk(dx / length, dz / length, dt);

  }
  world.update(dt);
  if (mode === 'play') {
    closest = null; let nearest = 3;
    const signLayout = [];
    for (const item of [...CONFIG.tasks, ...CONFIG.discoveries]) {
      const button = markers.get(item.id), complete = done.has(item.id), available = item.type || item.id === island.id;
      const visible = item.area === world.area && available && !activeTask && $('levels-modal').hidden;
      button.hidden = !visible;
      if (!visible) continue;
      button.classList.toggle('completed', complete);
      if (complete && !button.dataset.complete) { button.innerHTML = `<span>✓</span><span>${e(item.friend)} · practise</span>`; button.dataset.complete = 'true'; }
      const p = world.project(item.x, item.id === 'windmill' ? 4.6 : item.id === 'light-4' ? 7.8 : 3, item.z);
      signLayout.push({ button, p, width: button.offsetWidth, height: button.offsetHeight });
      { const distance = Math.hypot(item.x - world.fox.position.x, item.z - world.fox.position.z); if (distance < nearest) { nearest = distance; closest = item; } }
    }
    // Stack nearby signs so every landmark remains selectable on a narrow screen.
    const placed = [];
    for (const sign of signLayout) {
      const x = Math.max(sign.width / 2 + 12, Math.min(innerWidth - sign.width / 2 - 12, sign.p.x));
      const rect = { left: x - sign.width / 2, right: x + sign.width / 2, top: sign.p.y - sign.height, bottom: sign.p.y };
      for (let tries = 0; tries < 12 && placed.some(r => rect.left < r.right + 7 && rect.right > r.left - 7 && rect.top < r.bottom + 7 && rect.bottom > r.top - 7); tries++) { rect.top -= sign.height + 8; rect.bottom -= sign.height + 8; }
      placed.push(rect); sign.button.style.left = `${x}px`; sign.button.style.top = `${rect.bottom}px`;
    }
    $('interact').hidden = !closest || !!activeTask || !$('help-modal').hidden || !$('levels-modal').hidden;
    if (closest) $('interact-name').textContent = closest.title.replace('The lighthouse · ', '');
  }
}
profileSetup(); setMode('opening');
$('save-status').textContent = saveFailed ? 'Browser storage unavailable' : loaded.recovered ? 'Recovered the previous device save' : 'Progress saves on this device';
$('storage-warning').hidden = !saveFailed;
requestAnimationFrame(frame);

function applyLibrary(next) {
  activeTask = null; $('challenge').hidden = true; $('levels-modal').hidden = true;
  library = next; playerId = library.selected; year = library.players[playerId].year;
  book = bookFor(library, playerId, year); restoreWorld(); buildMarkers(); profileSetup(); setMode('opening');
}
setupCloud({ apply: applyLibrary, guest: () => readSave().library, activate: value => { cloud = value; }, status: (message, error = false) => { $('save-status').textContent = message; $('save-status').classList.toggle('save-error', error); } });
