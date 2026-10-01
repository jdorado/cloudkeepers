// Scene templates and visual rewards. Logical progression lives in journey.js.
export const CONFIG = {
  saveKey: 'cloudkeepers-adventure-v1',
  speed: 6,
  islands: [
    { name: 'The Garden Island', short: 'Garden', x: -27, color: '#8eae82' },
    { name: 'The Workshop Island', short: 'Workshop', x: 0, color: '#86aea2' },
    { name: 'The Lighthouse Island', short: 'Lighthouse', x: 27, color: '#95a8ac' },
  ],
  tasks: [
    { id: 'bridge', area: 0, x: -20.5, z: 1, kind: 'crystal', title: 'The crystal bridge', friend: 'Pip', color: '#f3d792' },
    { id: 'nest', area: 0, x: -31, z: -3, kind: 'cargo', title: 'A lift for Momo', friend: 'Momo', color: '#d9acd0' },
    { id: 'fountain', area: 0, x: -28, z: 5, kind: 'water', title: 'The wishing fountain', friend: 'Fern', color: '#b9d69c' },
    { id: 'windmill', area: 1, x: -4, z: -3.5, kind: 'repair', title: 'The sleepy windmill', friend: 'Bramble', color: '#e7b079' },
    { id: 'ship', area: 1, x: 4, z: -2, kind: 'cargo', title: 'A rescue for Luna', friend: 'Luna', color: '#bbb1e4' },
    { id: 'house', area: 1, x: -3.5, z: 4.5, kind: 'crystal', title: 'The lantern cottage', friend: 'Sol', color: '#f4ca82' },
    { id: 'balloon', area: 1, x: 4, z: 4, kind: 'repair', title: 'The cloud catcher', friend: 'Wisp', color: '#a3d9d3' },
    { id: 'light-1', area: 2, x: 24, z: 4, kind: 'crystal', friend: 'Nova', color: '#eac69f', title: 'The lighthouse · first spark' },
    { id: 'light-2', area: 2, x: 30.5, z: 3, kind: 'cargo', friend: 'Tilly', color: '#ccbddc', title: 'The lighthouse · sky supplies' },
    { id: 'light-3', area: 2, x: 30, z: -3.5, kind: 'repair', friend: 'Otto', color: '#b5ccae', title: 'The lighthouse · turning gears' },
    { id: 'light-4', area: 2, x: 26.5, z: -1, kind: 'crystal', friend: 'Clover', color: '#f0d187', title: 'The lighthouse · a new dawn' },
    { id: 'light-5', area: 2, x: 23.5, z: -3.5, kind: 'crystal', friend: 'Skye', color: '#aed4d7', title: 'The sky picnic' },
  ],
  discoveries: [
    { id: 'garden-bell', area: 0, x: -33, z: 3, title: 'Ring the wishing bell', message: 'Ding! Somewhere in the sky, a cloud makes a wish.', type: 'bell' },
    { id: 'workshop-flower', area: 1, x: 0, z: -7, title: 'Meet the sleepy sprout', message: 'A tiny sprout wakes up… and waves hello!', type: 'sprout' },
    { id: 'sky-shell', area: 2, x: 32.5, z: 0, title: 'Listen to the sky shell', message: 'Whoooosh. The shell remembers every breeze.', type: 'shell' },
  ],
};

export const workshopOpen = powered => powered.has('bridge');
export const lighthouseOpen = powered => workshopOpen(powered) && CONFIG.tasks.some(t => t.area === 1 && powered.has(t.id));
