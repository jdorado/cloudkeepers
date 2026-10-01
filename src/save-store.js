import { LEARNING } from './curriculum.js';
import { restoreLibrary } from './learning.js';

const backupKey = `${LEARNING.saveKey}:backup`;
function parse(text) {
  try {
    const raw = JSON.parse(text);
    return raw && [2, 3].includes(raw.version) && raw.players && typeof raw.players === 'object' ? raw : null;
  } catch { return null; }
}
export function readSave(storage) {
  try {
    storage ||= localStorage;
    const primary = parse(storage.getItem(LEARNING.saveKey));
    const backup = primary ? null : parse(storage.getItem(backupKey));
    return { library: restoreLibrary(primary || backup), recovered: !!backup, unavailable: false };
  } catch { return { library: restoreLibrary(null), recovered: false, unavailable: true }; }
}
export function writeSave(storage, library) {
  // Keep the last valid snapshot. Backup failure must not prevent the current save.
  const previous = storage.getItem(LEARNING.saveKey);
  if (parse(previous)) { try { storage.setItem(backupKey, previous); } catch { /* Primary write still decides success. */ } }
  storage.setItem(LEARNING.saveKey, JSON.stringify(library));
}
