// The city: a neo-Helsinki megablock in the rain, built for an isometric camera and meant to be seen only as glyphs.
// So it is built for what a CELL can carry: big flat masses with a hard edge (the edge becomes a / | \ stroke), window
// grids at about two cells a window (they read as scattered bright glyphs), and neon as flat over-bright colour (it
// becomes @ and # and blooms). Words are never modelled: a sign is a lit board plus a LABEL, the text set straight into
// the grid over it, so SAUNA reads as SAUNA at any distance.
//
// Units are metres-ish; +x runs to the lower right of the screen, +z to the lower left, the camera sits up at +x +z.
// The main street runs along x at z = STREET; the row of blocks in front of it (camera side) is kept low so the street
// is never walled off, and the row behind it is the tall backdrop every sign faces out from.

import * as THREE from 'three';
import { fillMaster } from '../../toko/js/master.js';

export const PITCH = 36, BLOCK = 26, STREET = PITCH / 2, CAM_D = 700, RUNZ = STREET - 4;   // the courier's line: the far side, where no kiosk can hide him
export const ISO = new THREE.Vector3(0.612, 0.5, 0.612).normalize();                       // 2:1 dimetric: 30° up, 45° round
export const NEON = { magenta: [3.4, 0.3, 1.9], cyan: [0.25, 2.5, 3.1], amber: [3.1, 1.35, 0.25], lime: [1.0, 3.0, 0.45], red: [3.2, 0.25, 0.3], violet: [1.7, 0.6, 3.3] };
export const INK = { magenta: '#ff6ad8', cyan: '#80f8ff', amber: '#ffc65a', lime: '#c8ff6a', red: '#ff6464', violet: '#cfa6ff', white: '#f2f6ff' };
const SIGNS = [['SAUNA', 'cyan'], ['ﾗｰﾒﾝ', 'magenta'], ['GRILLI', 'amber'], ['24H', 'red'], ['KAHVILA', 'lime'], ['ﾎﾃﾙ', 'violet'], ['BAARI', 'magenta'],
  ['ｶﾗｵｹ', 'cyan'], ['NOODLES', 'amber'], ['ﾈｵﾝ', 'magenta'], ['KIOSKI', 'lime'], ['PACHINKO', 'red'], ['APTEEKKI', 'lime'], ['ｹﾞｰﾑ', 'violet']];

export function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const HDR = (c, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0] * k, c[1] * k, c[2] * k) });

export function buildCity(seed = 7) {
  const r = rng(seed), scene = new THREE.Scene();
  scene.background = new THREE.Color(0.004, 0.004, 0.012);
  scene.fog = new THREE.Fog(new THREE.Color(0.016, 0.01, 0.034), CAM_D - 40, CAM_D + 380);     // fog by distance from an iso camera CAM_D back
  const add = (m, p = scene) => (p.add(m), m);
  const box = (w, h, d, mat, x, y, z, p = scene) => { const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), p); m.position.set(x, y, z); return m; };

  // ---------------------------------------------------------------- window grids: four windows a texture, some lit
  const winTex = Array.from({ length: 8 }, (_, v) => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 64, 64);
    const lit = ['#ffb46a', '#ffd9a0', '#7ff0ff', '#ff7ad8', '#e8eeff'];
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const on = r() < 0.16 + 0.05 * (v % 3); g.fillStyle = on ? lit[(r() * lit.length) | 0] : '#0b0d16';
      g.fillRect(x * 16 + 3, y * 16 + 3, 10, 11);
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; return t;
  });
  const concrete = ['#1a1c27', '#1e1a25', '#161b23', '#20202b', '#17161f'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.1 }));
  const wallMat = (w, h) => { const t = winTex[(r() * winTex.length) | 0].clone(); t.repeat.set(Math.max(1, Math.round(w / 8)), Math.max(1, Math.round(h / 9))); t.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ color: '#2a2d3d', roughness: 0.8, metalness: 0.1, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 1.6 }); };
  const blinkers = [], signs = [], lights = [];
  function tower(x, z, w, d, h, opts = {}) {
    const top = concrete[(r() * concrete.length) | 0];
    const m = box(w, h, d, [wallMat(d, h), wallMat(d, h), top, top, wallMat(w, h), wallMat(w, h)], x, h / 2, z);
    if (opts.setback && h > 30) { const h2 = h * (0.25 + r() * 0.3), w2 = w * 0.62, d2 = d * 0.62; box(w2, h2, d2, [wallMat(d2, h2), wallMat(d2, h2), top, top, wallMat(w2, h2), wallMat(w2, h2)], x - w * 0.08, h + h2 / 2, z - d * 0.08); h += h2; }
    // the roof: plant boxes, a tank, an aerial with a red light that blinks
    if (opts.kiosk) return { x, z, w, d, h, m };
    for (let i = 0; i < 1 + (r() * 2 | 0); i++) box(2 + r() * 4, 1.5 + r() * 2, 2 + r() * 4, top, x + (r() - 0.5) * w * 0.6, h + 1, z + (r() - 0.5) * d * 0.6);
    if (r() < 0.6) { const a = box(0.4, 6 + r() * 10, 0.4, top, x + w * 0.3, h + 4, z - d * 0.3); const tip = box(0.9, 0.9, 0.9, HDR(NEON.red), a.position.x, h + a.geometry.parameters.height + 0.5, a.position.z); blinkers.push({ m: tip, ph: r() * 6 }); }
    if (r() < 0.4) add(new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 4, 12), top)).position.set(x - w * 0.25, h + 2.5, z + d * 0.2);
    return { x, z, w, d, h, m };
  }

  // ---------------------------------------------------------------- the ground: wet asphalt, kerbs, the lane marks
  add(new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0a0b11', roughness: 0.3, metalness: 0.5 })));
  const kerb = new THREE.MeshStandardMaterial({ color: '#23242f', roughness: 0.7 }), dash = HDR([0.42, 0.4, 0.36]);
  const mark = (w, d, x, z) => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), dash)); m.position.set(x, 0.04, z); };
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 5; j++) box(BLOCK, 0.6, BLOCK, kerb, i * PITCH, 0.3, j * PITCH);
  for (let x = -230; x < 230; x += 7) mark(3, 0.35, x, STREET);
  for (let i = -6; i <= 5; i++) for (let z = -230; z < 230; z += 7) mark(0.35, 3, i * PITCH + STREET, z);

  // ---------------------------------------------------------------- the blocks
  const towers = [];
  for (let i = -6; i <= 6; i++) for (let j = -6; j <= 5; j++) {
    const cx = i * PITCH, cz = j * PITCH, front = j >= 1, street = j === 0;
    const lots = front || r() < 0.45 ? [[0, 0, 1, 1]] : r() < 0.5 ? [[-0.25, 0, 0.5, 1], [0.25, 0, 0.5, 1]] : [[0, -0.25, 1, 0.5], [0, 0.25, 1, 0.5]];
    for (const [ox, oz, sw, sd] of lots) {
      const w = BLOCK * sw - 3 - r() * 3, d = BLOCK * sd - 3 - r() * 3;
      const h = front ? 2.4 + r() * 2.6 :                                  // kiosks: anything taller walls off the street from this camera
         street ? 34 + r() * 50 : 26 + r() * 70 * (1 - Math.min(1, Math.hypot(i, j) / 9));
      towers.push({ ...tower(cx + ox * BLOCK, cz + oz * BLOCK, w, d, h, { setback: !front && r() < 0.5, kiosk: front }), i, j });
    }
  }
  // the spire: one tower above everything, with the billboard
  const spire = tower(PITCH * 1, -PITCH * 1, 20, 20, 150);
  const board = box(0.6, 34, 26, HDR([0.22, 0.03, 0.15]), spire.x + 10.4, 108, spire.z);
  board.rotation.y = 0; const boardSpec = { center: new THREE.Vector3(spire.x + 10.8, 108, spire.z), up: 17, half: 13 };
  // a second face of it toward the street, so the camera always has one in view
  const board2 = box(26, 34, 0.6, HDR([0.22, 0.03, 0.15]), spire.x, 108, spire.z + 10.4);
  const boardSpec2 = { center: new THREE.Vector3(spire.x, 108, spire.z + 10.8), up: 17, half: 13 };

  // ---------------------------------------------------------------- neon: boards on the street's back wall, facing out
  const neonLights = [];
  let si = 0;
  for (const t of towers.filter((t) => t.j === 0)) {
    const fz = t.z + t.d / 2;
    // a vertical sign on the corner, high up
    const [txt, hue] = SIGNS[si++ % SIGNS.length], vert = [...txt].length <= 5 && r() < 0.75;
    if (vert && t.h > 24) {
      const n = [...txt].length, hgt = n * 2.7 + 1.6, y = Math.min(t.h - hgt / 2 - 2, 10 + r() * (t.h - 16));
      const x = t.x + (r() < 0.5 ? -1 : 1) * (t.w / 2 - 1.8);
      const m = box(2.6, hgt, 0.8, HDR(NEON[hue], 0.32), x, y, fz + 1.2);
      signs.push({ m, hue, txt, vertical: true, top: new THREE.Vector3(x, y + hgt / 2 - 0.9, fz + 1.7), flicker: r() < 0.3, ph: r() * 9 });
    }
    // a shopfront board over the street
    const [t2, h2] = SIGNS[si++ % SIGNS.length], len = [...t2].length * 1.25 + 2.5, sx = t.x + (r() - 0.5) * Math.max(0, t.w - len - 4);
    const m2 = box(len, 2.4, 0.6, HDR(NEON[h2], 0.32), sx, 5.2, fz + 0.6);
    box(len + 1, 0.5, 3, kerb, sx, 3.6, fz + 1.6);                                          // the awning under it
    signs.push({ m: m2, hue: h2, txt: t2, vertical: false, mid: new THREE.Vector3(sx, 5.2, fz + 1.0), flicker: r() < 0.25, ph: r() * 9 });
    if (neonLights.length < 6) { const l = add(new THREE.PointLight(new THREE.Color(...NEON[h2]).multiplyScalar(0.3), 140, 46, 1.6)); l.position.set(sx, 7, fz + 5); neonLights.push(l); }
  }

  // ---------------------------------------------------------------- traffic: cars in the street, cars in the air
  const carBody = new THREE.MeshStandardMaterial({ color: '#15161f', roughness: 0.4, metalness: 0.6 });
  const head = HDR([2.6, 2.5, 2.2]), tail = HDR(NEON.red, 0.8);
  const car = (fly) => { const g = add(new THREE.Group()); box(4.4, 1.3, 2.1, carBody, 0, 0.9, 0, g); box(2.4, 0.9, 1.8, carBody, -0.3, 1.9, 0, g);
    box(0.2, 0.35, 1.6, head, 2.25, 0.95, 0, g); box(0.2, 0.3, 1.7, tail, -2.25, 1.0, 0, g); if (fly) box(3.6, 0.15, 1.6, HDR(NEON.cyan, 0.7), 0, 0.15, 0, g); return g; };
  const cars = [];
  for (let k = 0; k < 6; k++) cars.push({ g: car(false), axis: 'x', dir: k % 2 ? 1 : -1, lane: STREET + (k % 2 ? 0.9 : 3.6),          // both lanes on the near side: the far kerb is the courier's
      y: 0, v: 13 + r() * 6, o: r() * 460 });
  for (let k = 0; k < 6; k++) cars.push({ g: car(false), axis: 'z', dir: k % 2 ? 1 : -1, lane: ((k % 3) - 1) * PITCH + STREET + (k % 2 ? 2.4 : -2.4), y: 0, v: 12 + r() * 6, o: r() * 460 });
  for (let k = 0; k < 7; k++) cars.push({ g: car(true), axis: k % 2 ? 'x' : 'z', dir: k % 3 ? 1 : -1, lane: (r() - 0.5) * 160, y: 34 + r() * 30, v: 22 + r() * 12, o: r() * 460 });

  // ---------------------------------------------------------------- people on the pavements, umbrellas up
  const coat = new THREE.MeshStandardMaterial({ color: '#2a2a36', roughness: 0.9 });
  const umb = ['magenta', 'cyan', 'amber', 'violet'].map((h) => new THREE.MeshStandardMaterial({ color: '#111', emissive: new THREE.Color(...NEON[h]).multiplyScalar(0.12), roughness: 0.6 }));
  const people = [];
  for (let k = 0; k < 26; k++) {
    const g = add(new THREE.Group()); box(0.9, 1.7, 0.7, coat, 0, 0.85, 0, g); box(0.6, 0.6, 0.6, coat, 0, 2.0, 0, g);
    if (r() < 0.7) { const u = add(new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.7, 10), umb[k % 4]), g); u.position.y = 2.9; }
    people.push({ g, z: STREET + (k % 2 ? 6.6 : -6.6), dir: k % 3 ? 1 : -1, v: 1.2 + r() * 0.8, o: r() * 460 });   // the pavements either side
  }

  // ---------------------------------------------------------------- steam out of the street
  const puffMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.55, 0.62), transparent: true, opacity: 0.3, depthWrite: false });
  const vents = [-50, 14, 70].map((x) => ({ x, z: STREET + (r() - 0.5) * 3, puffs: Array.from({ length: 7 }, () => add(new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), puffMat.clone()))) }));

  // ---------------------------------------------------------------- the courier: the one you play
  const courier = add(new THREE.Group()); courier.scale.setScalar(2.1);
  { const jacket = new THREE.MeshStandardMaterial({ color: '#6a1652', roughness: 0.5, emissive: '#7a0a5a' }), dark = new THREE.MeshStandardMaterial({ color: '#101118', roughness: 0.7 });
    const body = new THREE.Group(); courier.add(body); courier.userData.body = body;
    box(1.5, 1.9, 1.0, jacket, 0, 3.0, 0, body); box(1.56, 0.25, 1.06, HDR(NEON.magenta), 0, 2.4, 0, body);                // jacket and its lit hem
    box(1.0, 1.0, 1.0, dark, 0, 4.4, 0, body); box(1.06, 0.3, 0.7, HDR(NEON.cyan), 0.15, 4.45, 0, body);                   // head and visor
    box(1.2, 1.5, 0.7, dark, -0.95, 3.1, 0, body); box(0.15, 1.3, 0.5, HDR(NEON.cyan, 0.9), -1.58, 3.1, 0, body);          // the pack, a data stripe on it
    courier.userData.legs = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0, 2.1, s * 0.35); body.add(p); box(0.5, 2.0, 0.45, dark, 0, -1.0, 0, p); return p; });
    courier.userData.arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(0, 3.8, s * 0.85); body.add(p); box(0.4, 1.7, 0.4, jacket, 0, -0.8, 0, p); return p; }); }

  // ---------------------------------------------------------------- light: almost none; the neon does the work
  add(new THREE.HemisphereLight('#2a3260', '#050508', 0.55));
  const moon = add(new THREE.DirectionalLight('#8a94ff', 3.0)); moon.position.set(-90, 260, 150);

  const wrap = (v, lo = -230, hi = 230) => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));
  function update(t) {
    for (const c of cars) { const s = wrap(c.o + c.dir * c.v * t); if (c.axis === 'x') { c.g.position.set(s, c.y, c.lane); c.g.rotation.y = c.dir > 0 ? 0 : Math.PI; } else { c.g.position.set(c.lane, c.y, s); c.g.rotation.y = c.dir > 0 ? -Math.PI / 2 : Math.PI / 2; } }
    for (const p of people) { p.g.position.set(wrap(p.o + p.dir * p.v * t), 0.6, p.z); p.g.rotation.y = p.dir > 0 ? 0 : Math.PI; }
    for (const v of vents) v.puffs.forEach((m, k) => { const u = ((t * 0.45 + k / v.puffs.length) % 1); m.position.set(v.x + u * 3, 0.5 + u * 16, v.z - u * 2); m.scale.setScalar(1 + u * 4); m.material.opacity = 0.32 * (1 - u) * Math.min(1, u * 6); });
    for (const b of blinkers) b.m.visible = Math.sin(t * 3 + b.ph) > 0.2;
    for (const s of signs) { const on = !s.flicker || Math.sin(t * 23 + s.ph) + Math.sin(t * 7.1 + s.ph * 2) > -1.2; s.on = on; s.m.material.color.setRGB(...NEON[s.hue].map((c) => c * (on ? 0.13 : 0.03))); }
  }
  /** the courier at x along the street (running when `run` > 0) */
  function pose(x, z, t, run = 1, heading = 0) {
    courier.position.set(x, 0.6, z); courier.rotation.y = heading;
    const ph = t * 11, a = Math.sin(ph) * 0.9 * run, { legs, arms, body } = courier.userData;
    legs[0].rotation.z = a; legs[1].rotation.z = -a; arms[0].rotation.z = -a * 0.8; arms[1].rotation.z = a * 0.8;
    body.position.y = Math.abs(Math.sin(ph)) * 0.35 * run; body.rotation.z = -0.18 * run;
  }
  /** the city's writing, into the grid: every sign's word, and the billboard's face */
  function write(A, camera, t) {
    for (const s of signs) {
      if (!s.on) continue;
      if (s.vertical) { const [c, rw] = A.cell(s.top, camera); A.putV(c, rw, s.txt, INK[s.hue]); }
      else { const [c, rw] = A.cell(s.mid, camera); A.put(c - Math.floor([...s.txt].length / 2), rw, s.txt, INK[s.hue]); }
    }
    for (const B of [boardSpec, boardSpec2]) {
      const isZ = B === boardSpec2, side = isZ ? new THREE.Vector3(B.half, 0, 0) : new THREE.Vector3(0, 0, B.half);
      const tl = A.cell(B.center.clone().sub(side).add(new THREE.Vector3(0, B.up, 0)), camera), br = A.cell(B.center.clone().add(side).sub(new THREE.Vector3(0, B.up, 0)), camera);
      const c0 = Math.min(tl[0], br[0]), c1 = Math.max(tl[0], br[0]), r0 = Math.min(tl[1], br[1]), r1 = Math.max(tl[1], br[1]), w = c1 - c0, h = r1 - r0;
      if (w < 6 || h < 4 || c1 < 0 || c0 > A.cols || r1 < 0 || r0 > A.rows) continue;
      const blink = (t % 4.3) < 0.18 ? 0.15 : 1;                                                  // the resting animation of the mark is a blink
      A.stamp(c0 + 1, r0 + 1, w - 1, Math.max(2, h - 3), (g, cw, chh) => { const s = Math.min(cw, chh) * 0.86; fillMaster(g, (cw - s) / 2, (chh - s * 0.62) / 2, s, { color: '#fff', squash: blink }); }, INK.magenta, ' .:*#@');
      const msg = ' TOKO MIDORI GAMES · GO MAKE YOUR OWN ·', k = Math.floor(t * 8) % msg.length, line = (msg + msg).slice(k, k + Math.max(0, w - 1));
      A.put(c0 + 1, r1 - 1, line, INK.cyan);
    }
  }
  return { scene, update, pose, write, courier, towers, signs, spire };
}

/** an isometric camera on a target; `span` is how many metres the frame is tall */
export function isoCamera(aspect) { const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000); c.userData.aspect = aspect; return c; }
export function aim(cam, target, span) {
  const a = cam.userData.aspect; cam.top = span / 2; cam.bottom = -span / 2; cam.left = -span * a / 2; cam.right = span * a / 2;
  cam.position.copy(target).addScaledVector(ISO, CAM_D); cam.lookAt(target); cam.near = 100; cam.far = 1500; cam.updateProjectionMatrix();
}
