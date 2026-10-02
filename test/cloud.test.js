import test from 'node:test';
import assert from 'node:assert/strict';
import { newId } from '../src/id.js';
import { createLibrary, bookFor, pendingQuestion } from '../src/learning.js';
import { writeAccount, readAccount, normalizeSave } from '../server/save-service.js';
import { CloudSave } from '../src/cloud-save.js';
import handler from '../api/save.js';

class Collection {
  docs = new Map();
  async findOne({ _id }) { return structuredClone(this.docs.get(_id) || null); }
  async insertOne(doc) { if (this.docs.has(doc._id)) throw Object.assign(new Error('duplicate'), { code: 11000 }); this.docs.set(doc._id, structuredClone(doc)); }
  async updateOne({ _id, revision }, { $set }) { const doc = this.docs.get(_id); if (doc?.revision !== revision) return { matchedCount: 0 }; this.docs.set(_id, { ...doc, ...structuredClone($set) }); return { matchedCount: 1 }; }
}
const input = (library = createLibrary(), revision = 0) => ({ library, revision, mutationId: newId() });
const storage = () => { const data = new Map(); return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) }; };
function controller(store, request) { return new CloudSave({ storage: store, request, apply() {}, status() {}, conflict() {} }); }

test('cloud saves isolate parent accounts and preserve the exact pending question/draft', async () => {
  const c = new Collection(), library = createLibrary();
  const book = bookFor(library, library.selected, 1); const pending = pendingQuestion(book, 'bridge', 1); pending.draft = '14'; pending.hinted = true; pending.missed = true;
  book.resumeTask = 'bridge';
  const result = await writeAccount(c, 'parent-a', { ...input(library), userId: 'parent-b' });
  assert.equal(result.status, 200);
  assert.equal((await readAccount(c, 'parent-b')).library, null);
  const restored = (await readAccount(c, 'parent-a')).library.players[library.selected].books[1].levels.bridge.pending;
  assert.equal(restored.id, pending.id); assert.equal(restored.draft, '14'); assert.equal(restored.hinted, true); assert.equal(restored.missed, true);
});
test('duplicate delivery is idempotent; reused IDs and stale writes cannot overwrite', async () => {
  const c = new Collection(), a = input();
  assert.equal((await writeAccount(c, 'a', a)).body.revision, 1);
  assert.equal((await writeAccount(c, 'a', a)).body.revision, 1);
  const changed = structuredClone(a); changed.library.players[changed.library.selected].name = 'Changed';
  assert.equal((await writeAccount(c, 'a', changed)).status, 409);
  assert.equal((await writeAccount(c, 'a', input())).status, 409);
  assert.equal((await readAccount(c, 'a')).library.players['player-1'].name, 'Player 1');
});
test('two concurrent first saves have exactly one winner', async () => {
  const c = new Collection(); const results = await Promise.all([writeAccount(c, 'a', input()), writeAccount(c, 'a', input())]);
  assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); assert.equal((await readAccount(c, 'a')).revision, 1);
});
test('oversized saves and unsafe player IDs are rejected', () => {
  const library = createLibrary(); library.players['__proto__'] = { name: 'unsafe' };
  assert.throws(() => normalizeSave(JSON.parse('{"version":3,"players":{"__proto__":{"name":"unsafe"}}}')));
  library.extra = 'x'.repeat(2_000_001); assert.throws(() => normalizeSave(library));
});
test('lost server acknowledgement retries the exact mutation after reload', async () => {
  const c = new Collection(), device = storage(); let dropped = false, mutations = [];
  const request = async (method, body) => {
    if (method === 'GET') return readAccount(c, 'a');
    mutations.push(body.mutationId); const result = await writeAccount(c, 'a', body);
    if (!dropped) { dropped = true; throw new Error('Network dropped after commit'); }
    if (result.status !== 200) throw Object.assign(new Error(), { status: result.status, body: result.body }); return result.body;
  };
  const first = controller(device, request); await first.connect('a'); first.save(createLibrary()); clearTimeout(first.timer); await first.flush();
  assert.ok(first.state.pending); assert.equal((await readAccount(c, 'a')).revision, 1);
  const resumed = controller(device, request); await resumed.connect('a'); clearTimeout(resumed.timer);
  assert.equal(resumed.state.pending, null); assert.equal(resumed.state.revision, 1); assert.equal(mutations[0], mutations[1]);
});
test('conflicts keep local work until an explicit choice; switching accounts never imports guest data', async () => {
  const c = new Collection(), device = storage();
  const request = async (method, body) => { if (method === 'GET') return readAccount(c, 'a'); const result = await writeAccount(c, 'a', body); if (result.status !== 200) throw Object.assign(new Error(), { status: result.status, body: result.body }); return result.body; };
  const sync = controller(device, request); await sync.connect('a'); const local = createLibrary(); local.players['player-1'].name = 'Local'; sync.save(local); clearTimeout(sync.timer);
  await writeAccount(c, 'a', input()); await sync.flush(); assert.ok(sync.remote); assert.equal(sync.state.library.players['player-1'].name, 'Local');
  sync.resolve(false); assert.equal(sync.state.library.players['player-1'].name, 'Player 1');
  await sync.connect('b'); assert.equal(sync.state.library.players['player-1'].name, 'Player 1'); clearTimeout(sync.timer);
});
test('API rejects unauthenticated requests without touching the database', async () => {
  const old = { ...process.env }; Object.assign(process.env, { CLERK_SECRET_KEY: 'sk_test_placeholder', MONGODB_URI: 'mongodb://127.0.0.1:1', APP_ORIGINS: 'https://games.example.com' });
  const response = { setHeader() {}, status(value) { this.code = value; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: 'GET', headers: {} }, response); assert.equal(response.code, 401);
  delete process.env.CLERK_SECRET_KEY; await handler({ method: 'GET', headers: {} }, response); assert.equal(response.code, 503);
  for (const key of ['CLERK_SECRET_KEY','MONGODB_URI','APP_ORIGINS']) { if (old[key] === undefined) delete process.env[key]; else process.env[key] = old[key]; }
});

test('saving retries a lost acknowledgement automatically without a sync button', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const c = new Collection(), calls = []; let drop = true;
  const sync = controller(storage(), async (method, body) => {
    if (method === 'GET') return readAccount(c, 'a');
    calls.push(structuredClone(body));
    const result = await writeAccount(c, 'a', body);
    if (drop) { drop = false; throw new Error('Response lost'); }
    return result.body;
  });
  await sync.connect('a');
  const library = createLibrary(); library.players['player-1'].name = 'Explorer';
  sync.save(library);
  t.mock.timers.tick(1500); await new Promise(setImmediate);
  assert.ok(sync.state.pending);
  t.mock.timers.tick(2000); await new Promise(setImmediate);
  assert.equal(sync.state.pending, null);
  assert.equal(sync.state.dirty, false);
  assert.deepEqual(calls[0], calls[1]);
  const remote = await readAccount(c, 'a');
  assert.equal(remote.revision, 1);
  assert.equal(remote.library.players['player-1'].name, 'Explorer');
});
