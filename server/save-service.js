import { createHash } from 'node:crypto';
import { restoreLibrary } from '../src/learning.js';

export const GAME_ID = 'cloudkeepers';
export const MAX_BYTES = 2_000_000;
export function normalizeSave(raw) {
  if (!raw || raw.version !== 3 || !raw.players || Array.isArray(raw.players)) throw new Error('Choose a version 3 Cloudkeepers save.');
  const players = Object.keys(raw.players);
  if (!players.length || players.length > 20 || players.some(id => !/^[\w-]{1,100}$/.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id))) throw new Error('Invalid player profiles.');
  if (Buffer.byteLength(JSON.stringify(raw)) > MAX_BYTES) throw new Error('The save is too large. Download a backup and reduce the number of players.');
  return restoreLibrary(raw);
}
export function saveIdentity(userId) { return `${GAME_ID}:${userId}`; }
export function publicSave(doc) { return doc ? { revision: doc.revision, library: doc.library, updatedAt: doc.updatedAt } : { revision: 0, library: null, updatedAt: null }; }

// One account/game document is the pilot's household. Mongo updates are atomic.
// Identity always comes from the verified session, never from the request body.
export async function readAccount(collection, userId) {
  return publicSave(await collection.findOne({ _id: saveIdentity(userId) }));
}
export async function writeAccount(collection, userId, input) {
  if (!Number.isSafeInteger(input?.revision) || input.revision < 0 || !/^[a-f0-9-]{36}$/.test(input?.mutationId || '')) return { status: 400, body: { error: 'Invalid save revision or operation ID.' } };
  let library;
  try { library = normalizeSave(input.library); } catch (error) { return { status: 400, body: { error: error.message } }; }
  const _id = saveIdentity(userId), digest = createHash('sha256').update(JSON.stringify(library)).digest('hex');
  const current = await collection.findOne({ _id });
  if (current?.mutationId === input.mutationId) {
    return current.digest === digest ? { status: 200, body: publicSave(current) } : { status: 409, body: { error: 'This operation ID was already used for a different save.', ...publicSave(current) } };
  }
  if ((current?.revision || 0) !== input.revision) return { status: 409, body: { error: 'Another device has saved newer progress.', ...publicSave(current) } };
  const next = { _id, revision: input.revision + 1, library, mutationId: input.mutationId, digest, updatedAt: new Date().toISOString() };
  try {
    if (!current) await collection.insertOne(next);
    else {
      const { _id: ignored, ...fields } = next;
      const result = await collection.updateOne({ _id, revision: input.revision }, { $set: fields });
      if (!result.matchedCount) return { status: 409, body: { error: 'Another device has saved newer progress.', ...await readAccount(collection, userId) } };
    }
  } catch (error) {
    if (error.code !== 11000) throw error;
    const raced = await collection.findOne({ _id });
    if (raced.mutationId === input.mutationId && raced.digest === digest) return { status: 200, body: publicSave(raced) };
    return { status: 409, body: { error: 'Another device has saved newer progress.', ...publicSave(raced) } };
  }
  return { status: 200, body: publicSave(next) };
}
