import { CONFIG } from './game.config.js';

// Logical island stops reuse scene templates; curriculum/reward IDs stay stable.
const names = ['Crystal Cove', 'Mossy Nest', 'Wishing Springs', 'Windmill Grove', 'Airship Harbour', 'Lantern Hollow', 'Balloon Meadow', 'Starlight Landing', 'Moonbeam Bay', 'Gear Garden', 'Beacon Heights', 'The Sky Picnic'];
export const JOURNEY = CONFIG.tasks.map((task, index) => ({ ...task, number: index + 1, name: names[index] || `Sky Island ${index + 1}` }));
export const islandFor = id => JOURNEY.find(island => island.id === id);
export function islandAvailable(book, id) {
  const index = JOURNEY.findIndex(island => island.id === id);
  if (index < 0) return false;
  const progress = book.levels[id];
  // Previously played stops remain available when migrating the old free-roaming journey.
  return index === 0 || !!book.levels[JOURNEY[index - 1].id]?.mastered || !!(progress?.mastered || progress?.pending || progress?.points || progress?.recent?.length);
}
export function currentIsland(book) {
  if (islandAvailable(book, book.currentTask)) return islandFor(book.currentTask);
  const played = JOURNEY.filter(island => islandAvailable(book, island.id) && (book.levels[island.id]?.pending || book.levels[island.id]?.points));
  return played.at(-1) || JOURNEY.find(island => islandAvailable(book, island.id) && !book.levels[island.id]?.mastered) || JOURNEY[0];
}
export const nextIsland = id => JOURNEY[JOURNEY.findIndex(island => island.id === id) + 1] || null;
