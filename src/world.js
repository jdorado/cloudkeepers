import * as THREE from 'three';
import { CONFIG, workshopOpen, lighthouseOpen } from './game.config.js';

const palette = { stone: '#b1a1a7', deep: '#8d879d', cream: '#fff0d2', gold: '#e6af58', coral: '#cf7053', teal: '#558d91', leaf: '#628665', bark: '#9b795d' };
let seed = 23;
const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const materials = new Map();
function material(color, extra = {}) {
  const key = color + JSON.stringify(extra);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .9, ...extra }));
  return materials.get(key);
}
function mesh(parent, geometry, color, x = 0, y = 0, z = 0, extra) {
  const item = new THREE.Mesh(geometry, material(color, extra));
  item.position.set(x, y, z); item.castShadow = true; item.receiveShadow = true;
  parent.add(item); return item;
}
const sphere = (p, c, x, y, z, r, scale = [1, 1, 1]) => { const m = mesh(p, new THREE.SphereGeometry(r, 16, 12), c, x, y, z); m.scale.set(...scale); return m; };
const box = (p, c, x, y, z, w, h, d) => mesh(p, new THREE.BoxGeometry(w, h, d), c, x, y, z);
const cone = (p, c, x, y, z, r, h, n = 8) => mesh(p, new THREE.ConeGeometry(r, h, n), c, x, y, z);
const cylinder = (p, c, x, y, z, rt, rb, h, n = 16, extra) => mesh(p, new THREE.CylinderGeometry(rt, rb, h, n), c, x, y, z, extra);
function group(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

function tree(parent, x, z, size = 1, tint = '#718d75') {
  const g = group(parent, x, .15, z); g.scale.setScalar(size);
  cylinder(g, palette.bark, 0, 1, 0, .16, .24, 2, 7);
  sphere(g, tint, 0, 2.5, 0, 1.2, [1, 1.28, .92]);
  sphere(g, tint, -.65, 2, .2, .65); sphere(g, tint, .5, 2.9, .15, .75);
  for (let i = 0; i < 3; i++) sphere(g, '#e7b578', (random() - .5) * 1.4, 2.1 + random() * 1.8, .7, .13);
}
function flower(parent, x, z, color = '#e8b3ac', size = 1) {
  const g = group(parent, x, .2, z); g.scale.setScalar(size);
  cylinder(g, '#527563', 0, .25, 0, .035, .045, .5, 5);
  for (let j = 0; j < 5; j++) sphere(g, color, Math.cos(j * 1.256) * .15, .54, Math.sin(j * 1.256) * .15, .14);
  sphere(g, '#f5db89', 0, .62, 0, .08);
}
function cloud(parent, x, y, z, scale = 1) {
  const g = group(parent, x, y, z); g.scale.setScalar(scale);
  for (const [a, b, c, r] of [[0, 0, 0, 2], [-1.8, -.4, 0, 1.3], [1.6, -.2, .1, 1.5], [.1, .3, -.5, 1.6]]) {
    const m = sphere(g, '#ede2df', a, b, c, r, [1.2, .52, 1]); m.castShadow = false;
  }
  return g;
}
function face(parent, y, z, width = .5) {
  sphere(parent, '#463b47', -width / 2, y, z, .07);
  sphere(parent, '#463b47', width / 2, y, z, .07);
  sphere(parent, '#df9290', -width / 2 - .15, y - .13, z - .015, .075, [1, .5, .35]);
  sphere(parent, '#df9290', width / 2 + .15, y - .13, z - .015, .075, [1, .5, .35]);
  const smile = mesh(parent, new THREE.TorusGeometry(.1, .025, 6, 12, Math.PI), '#725260', 0, y - .12, z + .02);
  smile.rotation.z = Math.PI;
}
function friend(parent, color, x, z) {
  const g = group(parent, x, .3, z);
  sphere(g, color, 0, .55, 0, .6, [1, .85, .8]);
  sphere(g, color, -.42, .3, .02, .24); sphere(g, color, .42, .3, .02, .24);
  sphere(g, color, -.28, 1, 0, .18, [.7, 1.4, .8]); sphere(g, color, .28, 1, 0, .18, [.7, 1.4, .8]);
  face(g, .63, .48, .42); return g;
}
function cottage(parent, x, z) {
  const g = group(parent, x, .2, z);
  box(g, '#f1dfbd', 0, 1.1, 0, 2.8, 2.2, 2.5);
  const roof = cone(g, '#c97861', 0, 2.7, 0, 2.45, 1.5, 4); roof.rotation.y = Math.PI / 4;
  box(g, '#925f59', .95, 3, -.4, .4, 1.1, .45);
  box(g, '#6a8986', 0, .65, 1.28, .65, 1.3, .12);
  const windows = [];
  for (const xx of [-.9, .9]) {
    box(g, '#8b7968', xx, 1.3, 1.28, .58, .76, .13);
    windows.push(box(g, '#657884', xx, 1.3, 1.37, .43, .6, .04));
    box(g, palette.cream, xx, 1.3, 1.41, .05, .65, .025);
  }
  return { g, windows };
}
function crystals(parent, x, z) {
  const g = group(parent, x, .15, z);
  cylinder(g, '#cdbdae', 0, .15, 0, .85, 1, .3, 10);
  const shards = [];
  for (const [xx, yy, zz, h] of [[0, 1, 0, 1.6], [-.5, .55, .15, .9], [.4, .65, .25, 1.1]]) {
    const m = mesh(g, new THREE.OctahedronGeometry(.45), '#9fc6c7', xx, yy, zz); m.scale.y = h; shards.push(m);
  }
  return { g, shards };
}
function airship(parent, x, z, tiny = false) {
  const g = group(parent, x, .2, z); if (tiny) g.scale.setScalar(.7);
  const lift = group(g, 0, 0, 0);
  sphere(lift, '#d69a6d', 0, 2.1, 0, 1.3, [1.35, .8, .8]);
  sphere(lift, '#e9c59c', 0, 2.1, 0, 1.28, [.22, .83, .83]);
  for (const xx of [-.65, .65]) cylinder(lift, '#b19e86', xx, 1.2, .3, .035, .035, 1.6, 6);
  sphere(lift, '#946753', 0, .5, .1, .7, [1.6, .45, .7]);
  box(lift, '#d2b290', 0, .7, .1, 1.4, .35, .7);
  const fin = cone(lift, '#638c95', -1.6, 2.1, 0, .45, 1.1, 3); fin.rotation.z = Math.PI / 2;
  box(g, '#bca793', 0, .05, 0, 2.8, .1, 2);
  return { g, lift };
}
function fountain(parent, x, z) {
  const g = group(parent, x, .15, z);
  cylinder(g, '#d9c9b3', 0, .15, 0, 1.3, 1.4, .35, 18);
  const water = cylinder(g, '#7dabb3', 0, .34, 0, 1.08, 1.08, .03, 24);
  cylinder(g, '#cbbba7', 0, .85, 0, .23, .4, 1.4, 10);
  cylinder(g, '#dacdb7', 0, 1.5, 0, .65, .25, .2, 16);
  const drops = group(g, 0, 0, 0);
  for (let i = 0; i < 10; i++) sphere(drops, '#afdce0', Math.sin(i) * .7, .65 + (i % 4) * .35, Math.cos(i) * .7, .08);
  drops.visible = false; return { g, water, drops };
}
function windmill(parent, x, z) {
  const g = group(parent, x, .15, z);
  cylinder(g, '#eee0c3', 0, 1.5, 0, .65, 1.2, 3, 10);
  cone(g, '#cf8265', 0, 3.4, 0, .9, 1, 10);
  const blades = group(g, 0, 2.65, .82);
  for (let i = 0; i < 4; i++) {
    const arm = group(blades, 0, 0, 0); arm.rotation.z = i * Math.PI / 2;
    box(arm, '#99735b', 0, 1, 0, .12, 2.5, .12);
    box(arm, '#ead8b5', .22, 1.15, 0, .48, 1.4, .06);
    for (let j = 0; j < 4; j++) box(arm, '#af9671', .22, .6 + j * .3, .04, .53, .04, .04);
  }
  sphere(blades, '#d0a278', 0, 0, .1, .18); return { g, blades };
}
function catcher(parent, x, z) {
  const g = group(parent, x, .15, z);
  cylinder(g, '#c6b598', 0, .1, 0, 1, 1.2, .25, 12);
  cylinder(g, '#a78d6d', 0, 1, 0, .15, .18, 2, 8);
  const balloon = group(g, 0, 0, 0);
  sphere(balloon, '#79b7b4', 0, 2.8, 0, 1, [1, 1.3, 1]);
  cylinder(balloon, '#e1c697', 0, 1.45, 0, .3, .22, .4, 8);
  for (const xx of [-.25, .25]) cylinder(balloon, '#a49075', xx, 1.9, 0, .025, .025, .8, 5);
  return { g, balloon };
}
function lighthouse(parent, x, z) {
  const g = group(parent, x, .15, z);
  cylinder(g, '#ece0c8', 0, 2.7, 0, .95, 1.5, 5.4, 12);
  for (const y of [1.4, 3.3]) cylinder(g, '#bf7b65', 0, y, 0, 1.39 - y * .08, 1.39 - y * .08, .6, 12);
  box(g, '#567b85', 0, .8, 1.37, .6, 1.6, .15);
  cylinder(g, '#aa9073', 0, 5.55, 0, 1.25, 1.25, .25, 12);
  cylinder(g, '#bacdd1', 0, 6.2, 0, .95, .95, 1.1, 12, { transparent: true, opacity: .65 });
  for (let i = 0; i < 8; i++) cylinder(g, '#6b8b8b', Math.sin(i * Math.PI / 4) * .93, 6.2, Math.cos(i * Math.PI / 4) * .93, .035, .035, 1.2, 6);
  cone(g, '#cb826b', 0, 7.05, 0, 1.4, .9, 12);
  sphere(g, palette.gold, 0, 7.6, 0, .15);
  const glow = sphere(g, '#ffe8a3', 0, 6.25, 0, .6, [1, 1, 1]);
  glow.material = material('#ffe8a3', { emissive: '#ffcf69', emissiveIntensity: 2 });
  glow.visible = false;
  const beam = mesh(g, new THREE.ConeGeometry(3, 18, 32, 1, true), '#fff0bc', 0, 6.25, 0, { transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide, emissive: '#ffda8b', emissiveIntensity: .7 });
  beam.geometry.translate(0, -9, 0); beam.rotation.z = Math.PI / 2; beam.visible = false; beam.castShadow = false;
  return { g, glow, beam };
}

export class SkyWorld {
  constructor(container) {
    this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog('#cfbed2', 65, 150);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.22;
    container.append(this.renderer.domElement);
    this.camera = new THREE.OrthographicCamera(-40, 40, 25, -25, .1, 220);
    this.scene.add(new THREE.HemisphereLight('#ffecd8', '#87849d', 2.3));
    const sun = new THREE.DirectionalLight('#ffe2ba', 3.1); sun.position.set(-25, 45, 25);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 35, bottom: -35, near: .5, far: 110 });
    sun.shadow.normalBias = .04; sun.shadow.bias = -.0002; sun.shadow.radius = 4;
    this.scene.add(sun); this.sun = sun;
    this.target = new THREE.Vector3(0, 0, 0); this.camera.position.set(15, 36, 56); this.camera.lookAt(this.target);
    this.clock = 0; this.mode = 'opening'; this.area = 0; this.done = new Set(); this.objects = new Map(); this.friends = []; this.clouds = [];
    this.bridges = []; this.islandScenes = []; this.journeyTask = null;
    this.build(); this.buildFox();
    this.raycaster = new THREE.Raycaster(); this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.25);
    this.resize(); window.addEventListener('resize', () => this.resize());
  }
  build() {
    for (const [i, island] of CONFIG.islands.entries()) {
      const g = group(this.scene, island.x, 0, 0);
      this.islandScenes.push(g);
      cylinder(g, palette.stone, 0, -1.7, 0, 9.85, 8.25, 3.2, 14);
      g.userData.grass = cylinder(g, island.color, 0, .03, 0, 10, 9.8, .32, 32);
      cone(g, palette.deep, 0, -4.2, 0, 8.3, 4.7, 12).rotation.z = Math.PI;
      for (let j = 0; j < 13; j++) {
        const a = j * Math.PI * 2 / 13;
        const rock = mesh(g, new THREE.DodecahedronGeometry(.5 + random() * .7), j % 2 ? '#ab9b9c' : '#c3aea3', Math.cos(a) * 9.25, -.5 - random(), Math.sin(a) * 9.25);
        rock.scale.y = 1.8;
        if (j % 3 === 0) {
          for (let v = 0; v < 4; v++) sphere(g, '#688b7b', Math.cos(a) * 9.6, -.4 - v * .5, Math.sin(a) * 9.6, .22 - v * .025);
        }
      }
      for (let j = 0; j < 8; j++) {
        const a = .5 + j * .74; tree(g, Math.cos(a) * 7.6, Math.sin(a) * 7.6, .7 + random() * .45, ['#71937f', '#93a987', '#789a91'][j % 3]);
      }
      for (let j = 0; j < 38; j++) {
        const a = random() * Math.PI * 2, r = 5 + random() * 4.4;
        flower(g, Math.cos(a) * r, Math.sin(a) * r, ['#e7b2ab', '#eddb9d', '#bac3e4'][j % 3], .7 + random() * .5);
      }
      // A curving trail of pale stepping stones guides exploration.
      for (let j = 0; j < 19; j++) {
        const x = -8.6 + j * .95, z = Math.sin(j * .4) * .65 + 1;
        const stone = cylinder(g, '#d9d4bd', x, .23, z, .32, .38, .08, 7); stone.scale.z = .7;
      }
      for (let j = 0; j < 8; j++) cylinder(g, '#d9d4bd', Math.sin(j) * .2, .23, -5 + j * .65, .3, .35, .08, 7);
      for (let j = 0; j < 5; j++) {
        const b = sphere(g, '#7b9680', -7 + j * .65, .45, -5.4, .6, [1, .65, .8]); b.rotation.y = random();
      }
      // A tiny fence along the safe rear edge.
      for (let j = 0; j < 6; j++) {
        box(g, '#d3bf9d', -3 + j, .6, -8.1, .1, 1.1, .1);
        if (j < 5) box(g, '#d3bf9d', -2.5 + j, .65, -8.1, 1, .08, .08);
      }
      cloud(this.scene, island.x - 7, -6, 4, 1.7); cloud(this.scene, island.x + 6, -5, -5, 1.9);
      if (i < 2) {
        const b = group(this.scene, island.x + 13.5, .05, 1);
        for (let j = 0; j < 15; j++) box(b, '#d4b59c', -4.8 + j * .69, .06, 0, .62, .15, 2.3);
        for (const z of [-1.15, 1.15]) {
          box(b, '#997d68', 0, .65, z, 10, .08, .08);
          for (let j = 0; j < 6; j++) cylinder(b, '#a88b70', -4.7 + j * 1.9, .5, z, .05, .06, 1, 6);
        }
        b.visible = false; this.bridges.push(b);
      }
    }
    for (const task of CONFIG.tasks) {
      let object;
      if (task.id === 'fountain') object = fountain(this.scene, task.x, task.z);
      else if (task.id === 'windmill') object = windmill(this.scene, task.x, task.z);
      else if (task.id === 'house') object = cottage(this.scene, task.x, task.z);
      else if (task.id === 'balloon') object = catcher(this.scene, task.x, task.z);
      else if (task.kind === 'cargo') object = airship(this.scene, task.x, task.z, task.area === 2);
      else if (task.id === 'light-3') object = windmill(this.scene, task.x, task.z);
      else object = crystals(this.scene, task.x, task.z);
      this.objects.set(task.id, object);
      if (task.friend) {
        const f = friend(this.scene, task.color, task.x - 1.4, task.z + 1.5);
        this.friends.push({ mesh: f, task, phase: random() * 6 });
      }
    }
    this.lighthouse = lighthouse(this.scene, 26.5, -2.5);
    for (const d of CONFIG.discoveries) {
      const g = group(this.scene, d.x, .15, d.z);
      if (d.type === 'bell') {
        for (const x of [-.5, .5]) cylinder(g, '#977757', x, .8, 0, .06, .08, 1.6, 7);
        box(g, '#a08765', 0, 1.65, 0, 1.3, .12, .15);
        cone(g, palette.gold, 0, 1.22, 0, .35, .5, 12);
        sphere(g, '#ad8752', 0, 1, 0, .08);
      } else if (d.type === 'sprout') {
        sphere(g, '#9db781', 0, .65, 0, .6, [.8, 1.1, .8]); face(g, .8, .45, .35);
        sphere(g, '#79a17d', -.35, 1.15, 0, .3, [1, .3, .6]); sphere(g, '#79a17d', .3, 1.25, 0, .3, [1, .3, .6]);
      } else {
        sphere(g, '#e9c3b5', 0, .5, 0, .7, [1, .8, .5]);
        for (let j = 0; j < 5; j++) sphere(g, '#f4d9c2', -.45 + j * .22, .65, .3, .13, [.5, 1.8, .5]);
      }
      this.objects.set(d.id, { g });
    }
    for (let i = 0; i < 19; i++) this.clouds.push({ mesh: cloud(this.scene, -65 + random() * 130, -11 + random() * 6, -40 + random() * 90, 1 + random() * 2), phase: random() * 6 });
    // Floating motes and hanging stars add life without remote assets.
    const particles = new THREE.BufferGeometry(), coords = [];
    for (let i = 0; i < 110; i++) coords.push((random() - .5) * 90, 1 + random() * 12, (random() - .5) * 32);
    particles.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    this.motes = new THREE.Points(particles, new THREE.PointsMaterial({ color: '#fff0bf', size: .1, transparent: true, opacity: .65 })); this.scene.add(this.motes);
    this.confetti = [];
    for (let i = 0; i < 45; i++) {
      const m = mesh(this.scene, new THREE.OctahedronGeometry(.09), ['#fff0b0', '#eec1a9', '#b5d6cf'][i % 3]);
      m.visible = false; m.castShadow = false; this.confetti.push({ mesh: m, age: 10, velocity: new THREE.Vector3() });
    }
  }
  buildFox() {
    const g = group(this.scene, -27, .3, 1.5); this.fox = g;
    this.body = group(g, 0, 0, 0);
    sphere(this.body, '#cb7750', 0, .58, 0, .45, [.8, 1.1, .75]);
    sphere(this.body, '#f3dfb8', 0, .6, .3, .3, [.65, 1, .3]);
    sphere(this.body, '#d28353', 0, 1.28, .08, .55, [1.05, .9, .8]);
    for (const x of [-.35, .35]) {
      cone(this.body, '#c57450', x, 1.83, .02, .22, .63, 3);
      cone(this.body, '#e7b695', x, 1.86, .11, .1, .33, 3);
      sphere(this.body, '#f6e7cb', x * .7, 1.09, .4, .29, [1, .65, .7]);
    }
    sphere(this.body, '#443843', 0, 1.16, .64, .085);
    for (const x of [-.22, .22]) { sphere(this.body, '#3c3541', x, 1.36, .49, .065); sphere(this.body, '#fff1df', x + .015, 1.38, .535, .018); }
    const scarf = cylinder(this.body, '#5b9299', 0, .95, 0, .33, .35, .2, 12);
    this.scarfTail = box(this.body, '#6caaa8', -.32, .63, -.1, .18, .65, .09); this.scarfTail.rotation.z = -.2;
    this.legs = [-.2, .2].map(x => sphere(g, '#785947', x, .18, 0, .17, [.7, 1.3, 1]));
    this.tail = sphere(this.body, '#c97b50', 0, .55, -.65, .38, [.6, .75, 1.6]); this.tail.rotation.x = -.45;
    sphere(this.body, '#f6e4c6', 0, .8, -1, .23, [.9, .8, 1.2]);
    // Soft ground contact beneath our keeper.
    const shadow = mesh(g, new THREE.CircleGeometry(.58, 24), '#656876', 0, -.07, 0, { transparent: true, opacity: .17, depthWrite: false }); shadow.rotation.x = -Math.PI / 2; shadow.castShadow = false;
    this.fox.rotation.y = .3;
  }
  resize() {
    this.width = innerWidth; this.height = innerHeight; this.renderer.setSize(this.width, this.height);
  }
  restore(done, powered = done) {
    this.done = done; this.powered = powered;
    this.bridges[0].visible = workshopOpen(powered); this.bridges[1].visible = lighthouseOpen(powered);
    for (const [id, o] of this.objects) {
      const repaired = powered.has(id);
      if (o.shards) o.shards.forEach(m => { m.material = repaired ? material('#ffe3a0', { emissive: '#f4b864', emissiveIntensity: .45 }) : material('#9fc6c7'); });
      if (o.windows) o.windows.forEach(m => { m.material = repaired ? material('#ffe2a0', { emissive: '#ffd277', emissiveIntensity: .7 }) : material('#657884'); });
      if (o.drops) o.drops.visible = repaired;
    }
    this.lighthouse.glow.visible = powered.has('light-1'); this.lighthouse.beam.visible = done.size === CONFIG.tasks.length;
  }
  burst(x, z) {
    for (const p of this.confetti) {
      p.age = random() * .25; p.mesh.position.set(x, .8, z);
      p.velocity.set((random() - .5) * 5, 3 + random() * 4, (random() - .5) * 5); p.mesh.visible = true;
    }
  }
  valid(x, z) {
    if (this.journeyTask) return (x - CONFIG.islands[this.journeyTask.area].x) ** 2 + z ** 2 < 9.35 ** 2;
    if (CONFIG.islands.some((a, i) => (i === 0 || (i === 1 ? workshopOpen(this.powered) : lighthouseOpen(this.powered))) && (x - a.x) ** 2 + z ** 2 < 9.35 ** 2)) return true;
    if (workshopOpen(this.powered) && x >= -18.5 && x <= -8.5 && z >= -.03 && z <= 2.03) return true;
    return lighthouseOpen(this.powered) && x >= 8.5 && x <= 18.5 && z >= -.03 && z <= 2.03;
  }
  walk(dx, dz, dt) {
    const x = this.fox.position.x, z = this.fox.position.z, speed = CONFIG.speed * dt;
    if (this.valid(x + dx * speed, z)) this.fox.position.x += dx * speed;
    if (this.valid(this.fox.position.x, z + dz * speed)) this.fox.position.z += dz * speed;
    if (dx || dz) this.fox.rotation.y = THREE.MathUtils.lerp(this.fox.rotation.y, Math.atan2(dx, dz), .24);
    this.moving = !!(dx || dz);
    this.area = this.fox.position.x < -13.5 ? 0 : this.fox.position.x > 13.5 ? 2 : 1;
  }
  travel(area) {
    this.fox.position.set(CONFIG.islands[area].x, .3, 1.5); this.area = area;
    if (this.mode === 'play') this.focusArea();
    this.burst(this.fox.position.x, this.fox.position.z);
  }
  visit(task) {
    this.journeyTask = task;
    const color = new THREE.Color(CONFIG.islands[task.area].color).lerp(new THREE.Color(task.color), .22);
    this.islandScenes[task.area].userData.grass.material = material(`#${color.getHexString()}`);
    this.travel(task.area);
  }
  focusArea() {
    this.target.set(CONFIG.islands[this.area].x, 0, 1);
    const aspect = this.width / this.height, height = aspect < .8 ? 27 / aspect : 33;
    this.camera.top = height / 2; this.camera.bottom = -height / 2;
    this.camera.left = -height * aspect / 2; this.camera.right = height * aspect / 2;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(this.target).add(new THREE.Vector3(13, 27, 32)); this.camera.lookAt(this.target);
  }
  pointer(clientX, clientY) {
    this.raycaster.setFromCamera(new THREE.Vector2(clientX / this.width * 2 - 1, -(clientY / this.height) * 2 + 1), this.camera);
    const out = new THREE.Vector3(); return this.raycaster.ray.intersectPlane(this.plane, out) && this.valid(out.x, out.z) ? out : null;
  }
  project(x, y, z) { const p = new THREE.Vector3(x, y, z).project(this.camera); return { x: (p.x + 1) / 2 * this.width, y: (-p.y + 1) / 2 * this.height, visible: p.z < 1 }; }
  update(dt) {
    this.clock += dt; const t = this.clock, aspect = this.width / this.height;
    const overview = this.mode === 'opening' || this.mode === 'ending';
    this.islandScenes.forEach((g, area) => { g.visible = overview || !this.journeyTask || area === this.journeyTask.area; });
    this.bridges.forEach((g, i) => { g.visible = overview && (i === 0 ? workshopOpen(this.powered) : lighthouseOpen(this.powered)); });
    for (const [id, object] of this.objects) object.g.visible = overview || !this.journeyTask || id === this.journeyTask.id || CONFIG.discoveries.some(d => d.id === id && d.area === this.area);
    this.lighthouse.g.visible = overview || this.area === 2;
    const width = overview ? (aspect < .8 ? (this.mode === 'ending' ? 42 : 63) : 103) : (aspect < .8 ? 27 : 33 * aspect);
    const desiredHeight = width / aspect;
    const currentHeight = (this.camera.top - this.camera.bottom) || desiredHeight;
    const height = THREE.MathUtils.lerp(currentHeight, desiredHeight, Math.min(1, dt * 3));
    this.camera.top = height / 2; this.camera.bottom = -height / 2; this.camera.left = -height * aspect / 2; this.camera.right = height * aspect / 2; this.camera.updateProjectionMatrix();
    let tx = overview ? (aspect < .8 ? 5 : -24) : CONFIG.islands[this.area].x + (this.fox.position.x - CONFIG.islands[this.area].x) * .16;
    let tz = overview ? (aspect < .8 ? -14 : -3) : 1;
    if (this.mode === 'ending') {
      tz = aspect < .8 ? -22 / aspect : -18;
      tx = aspect < .8 ? 27 + tz * 12 / 55 : 8;
    }
    this.target.lerp(new THREE.Vector3(tx, 0, tz), Math.min(1, dt * 3));
    const offset = overview ? new THREE.Vector3(12, 36, 55) : new THREE.Vector3(13, 27, 32);
    this.camera.position.copy(this.target).add(offset); this.camera.lookAt(this.target);
    this.fox.visible = !overview || this.mode === 'ending';
    this.body.position.y = this.moving && !overview ? Math.sin(t * 14) * .07 : Math.sin(t * 2) * .02;
    this.legs.forEach((leg, i) => { leg.position.z = this.moving ? Math.sin(t * 14 + i * Math.PI) * .14 : 0; });
    this.tail.rotation.z = Math.sin(t * 4) * .12; this.scarfTail.rotation.x = Math.sin(t * 5) * .13;
    for (const [id, o] of this.objects) {
      const active = this.powered.has(id);
      if (o.blades && active) o.blades.rotation.z -= dt * .9;
      if (o.lift) o.lift.position.y = active ? .6 + Math.sin(t * 1.3) * .15 : Math.sin(t) * .04;
      if (o.balloon) o.balloon.position.y = active ? 1 + Math.sin(t) * .2 : Math.sin(t) * .04;
      if (o.drops && active) { o.drops.rotation.y += dt; o.drops.position.y = Math.sin(t * 3) * .08; }
    }
    for (const f of this.friends) {
      const active = this.done.has(f.task.id);
      f.mesh.visible = overview || !this.journeyTask || f.task.id === this.journeyTask.id || active;
      if (this.done.size === CONFIG.tasks.length && overview) {
        const idx = this.friends.indexOf(f), a = idx / this.friends.length * Math.PI * 2;
        f.mesh.position.x = 26.5 + Math.cos(a) * 4.8; f.mesh.position.z = 1 + Math.sin(a) * 3.1;
      } else if (active && !overview && this.journeyTask && f.task.id !== this.journeyTask.id) {
        const idx = this.friends.filter(friend => this.done.has(friend.task.id)).indexOf(f), angle = idx * 2.4;
        f.mesh.position.x = CONFIG.islands[this.area].x + Math.cos(angle) * (2.4 + idx * .12);
        f.mesh.position.z = 3.5 + Math.sin(angle) * 1.4;
      } else { f.mesh.position.x = f.task.x - 1.4; f.mesh.position.z = f.task.z + 1.5; }
      f.mesh.position.y = active ? .3 + Math.max(0, Math.sin(t * 2.3 + f.phase)) * .25 : .3 + Math.sin(t + f.phase) * .04;
      f.mesh.rotation.y = Math.sin(t * .6 + f.phase) * .2;
    }
    this.clouds.forEach(c => { c.mesh.position.x += Math.sin(t * .05 + c.phase) * dt * .15; c.mesh.position.y += Math.cos(t * .2 + c.phase) * dt * .03; });
    this.motes.position.y = Math.sin(t * .3) * .6;
    this.lighthouse.beam.rotation.y = t * .3;
    for (const p of this.confetti) if (p.age < 2.6) { p.age += dt; p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.y -= dt * 2.5; p.mesh.rotation.x += dt * 3; p.mesh.visible = p.age < 2.6; }
    this.renderer.render(this.scene, this.camera); this.moving = false;
  }
}
