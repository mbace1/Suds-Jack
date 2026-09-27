// Sets: the miniature world the puppets stand in.
//
// Everything here is built the way a stop-motion set is built — card facades
// with painted plaster and windows cut out and lit from behind, felt skies,
// real little lamps with real light in them, and the characters of the street
// (a tram, a dog, a pigeon) in plasticine. The ART rules, learned on the first
// clay episode and held here:
//
//   depth first    a set is layers — pavement, street, facades, sky — and the
//                  camera always sees at least three of them
//   practicals     every set has lights IN it (lamps, lit windows, a monitor)
//                  so it is lit from inside as well as by the studio
//   one hero       each set has one warm thing and one cool thing, and the
//                  puppet stands where they meet

import * as THREE from 'three';
import { lump, feltMat, cardMat, woodMat, glassMat, metalMat, printMat, clayText, rng, n3 } from './clay.js';
import { tokoBadge, cloud } from './puppets.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const put = (m, x, y, z) => (m.position.set(x, y, z), m);

// ── painted textures ────────────────────────────────────────────────────────
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
/** a Helsinki facade: plaster, cornices, a grid of windows — some lit */
function facadeMats(color, { cols = 4, rows = 5, seed = 1, shop = null } = {}) {
  const r = rng(seed), W = 512, H = 1024, lit = [];
  for (let i = 0; i < cols * rows; i++) lit.push(r() < 0.42);
  const win = (c, fn) => {
    const gx = W / cols, gy = (H * 0.78) / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) fn(c, x * gx + gx * 0.26, 40 + y * gy + gy * 0.18, gx * 0.48, gy * 0.6, lit[y * cols + x], y * cols + x);
  };
  const map = canvasTex(W, H, (c) => {
    c.fillStyle = color; c.fillRect(0, 0, W, H);
    // plaster: blotches and a darker foot where the rain splashes
    for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${0.02 + r() * 0.035})`; c.beginPath(); c.arc(r() * W, r() * H, 3 + r() * 14, 0, Math.PI * 2); c.fill(); }
    const g = c.createLinearGradient(0, H * 0.7, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(40,20,10,.25)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    // cornices
    c.fillStyle = 'rgba(255,255,255,.35)'; for (const y of [30, H * 0.8]) c.fillRect(0, y, W, 10);
    c.fillStyle = 'rgba(0,0,0,.18)'; for (const y of [40, H * 0.8 + 10]) c.fillRect(0, y, W, 5);
    win(c, (c, x, y, w, h, on) => {
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x - 6, y - 6, w + 12, h + 12);      // frame
      c.fillStyle = on ? '#ffd58a' : '#26283a'; c.fillRect(x, y, w, h);
      if (on) { c.fillStyle = 'rgba(160,90,40,.35)'; c.fillRect(x, y + h * 0.55, w, h * 0.45); }    // a curtain line
      c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(x + w / 2 - 2, y, 4, h); c.fillRect(x, y + h * 0.42, w, 4);
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - 8, y + h + 6, w + 16, 7);             // sill shadow
    });
    if (shop) { c.fillStyle = '#2b2233'; c.fillRect(0, H * 0.82, W, H * 0.18); }
  });
  const glow = canvasTex(W, H, (c) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    win(c, (c, x, y, w, h, on) => { if (on) { c.fillStyle = '#ffc070'; c.fillRect(x, y, w, h); } });
  });
  return new THREE.MeshStandardMaterial({ map, emissiveMap: glow, emissive: '#ffffff', emissiveIntensity: 1.1, roughness: 0.9 });
}
function cobbles() {
  return canvasTex(1024, 1024, (c, W, H) => {
    c.fillStyle = '#4b4652'; c.fillRect(0, 0, W, H);
    const r = rng(12);
    for (let y = 0; y < H; y += 34) for (let x = (y / 34) % 2 ? -20 : 0; x < W; x += 44) {
      const v = 95 + r() * 55; c.fillStyle = `rgb(${v},${v - 6},${v + 8})`;
      c.beginPath(); c.roundRect(x + 3, y + 3, 38, 28, 10); c.fill();
      c.fillStyle = 'rgba(255,255,255,.12)'; c.beginPath(); c.roundRect(x + 8, y + 6, 18, 7, 4); c.fill();
    }
  });
}

// ── the street ─────────────────────────────────────────────────────────────
const FACADES = ['#e8c07a', '#b9d3b0', '#e6a9a0', '#a9c3dd', '#f0e3c8', '#d7b2d8'];

/** a streetlamp with its light: a real little bulb and a warm point light */
export function streetlamp(h = 34, { light = true } = {}) {
  const g = new THREE.Group(), pole = metalMat('#20352e', 0.5);
  g.add(Object.assign(put(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, h, 12), pole), 0, h / 2, 0), { castShadow: true }));
  g.add(put(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.4, 12), pole), 0, 0.7, 0));
  const arm = put(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 5, 8).rotateZ(Math.PI / 2), pole), 2.2, h - 0.5, 0); g.add(arm);
  const head = new THREE.Group(); head.position.set(4.6, h - 2.2, 0); g.add(head);
  head.add(put(new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.8, 12), pole), 0, 1.4, 0));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffd9a0' })); head.add(bulb);
  if (light) { const l = new THREE.PointLight('#ffb866', 900, 70, 1.6); l.position.y = -0.6; head.add(l); }
  g.userData = { head };
  return g;
}

/** a Helsinki tram, green and cream, in clay over a card body */
export function tram() {
  const g = new THREE.Group(), L = 58;
  const lower = lump(new THREE.BoxGeometry(L, 7, 9, 24, 4, 4), '#2f8a52', { seed: 300, lump: 0.25, freq: 0.15, boil: 0.02 }); lower.position.y = 5.5; g.add(lower);
  const upper = lump(new THREE.BoxGeometry(L - 1, 8, 8.6, 24, 4, 4), '#f1ead2', { seed: 301, lump: 0.22, freq: 0.15, boil: 0.02 }); upper.position.y = 13; g.add(upper);
  const roof = lump(new THREE.CylinderGeometry(4.4, 4.4, L - 2, 20, 6, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).scale(1, 0.45, 1), '#2f8a52', { seed: 302, lump: 0.15 }); roof.position.y = 17; g.add(roof);
  const winMat = new THREE.MeshStandardMaterial({ color: '#ffe0a0', emissive: '#ffc873', emissiveIntensity: 0.9, roughness: 0.4 });
  for (let i = 0; i < 8; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(5.2, 4.4, 0.3), winMat); w.position.set(-L / 2 + 5 + i * 6.8, 13.4, 4.35); g.add(w); }
  const sign = new THREE.Mesh(new THREE.BoxGeometry(8, 2.4, 0.3), printMat(256, 76, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffcc4a'; c.font = `${h * 0.7}px Anton`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('3  KALLIO', w / 2, h * 0.55); }));
  sign.material.emissive = new THREE.Color('#fff'); sign.material.emissiveMap = sign.material.map; sign.position.set(L / 2 - 6, 17.2, 4.4); g.add(sign);
  const pole = metalMat('#333', 0.4);
  const pant = put(new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, 0.4), pole), 0, 22, 0); pant.rotation.z = 0.5; g.add(pant);
  g.add(put(new THREE.Mesh(new THREE.BoxGeometry(9, 0.4, 0.8), pole), 2.2, 25.6, 0));
  for (const x of [-L / 2 + 8, L / 2 - 8]) for (const z of [-3.2, 3.2]) g.add(put(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1, 16).rotateX(Math.PI / 2), pole), x, 1.8, z));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff5d0' })); head.position.set(L / 2 + 0.2, 6, 2.6); g.add(head);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

/** a clay dog: sits, wags, looks up */
export function dog() {
  const g = new THREE.Group(), C = '#c98a4a', D = '#7a4a26';
  const body = lump(new THREE.CapsuleGeometry(2.3, 4.2, 8, 16).rotateZ(Math.PI / 2).rotateY(0.1), C, { seed: 400, lump: 0.12 }); body.position.set(0, 4.8, 0); body.rotation.z = 0.5; g.add(body);
  for (const [x, z] of [[1.8, 1.4], [1.8, -1.4], [-1.6, 1.6], [-1.6, -1.6]]) g.add(put(lump(new THREE.CapsuleGeometry(0.75, 2.6, 6, 10), C, { seed: 401, lump: 0.06 }), x, 1.6, z));
  const head = new THREE.Group(); head.position.set(3.2, 8.6, 0); g.add(head);
  head.add(lump(new THREE.SphereGeometry(2.4, 32, 20).scale(1.05, 0.95, 1), C, { seed: 402, lump: 0.1 }));
  head.add(put(lump(new THREE.SphereGeometry(1.3, 20, 14).scale(1.4, 0.9, 1.05), '#e8c49a', { seed: 403, lump: 0.05 }), 1.9, -0.6, 0));
  head.add(put(lump(new THREE.SphereGeometry(0.55, 12, 8), '#1a1214', { seed: 404, lump: 0.02, mat: { rough: 0.2, prints: 0.1 } }), 3.6, -0.3, 0));
  for (const z of [-0.9, 0.9]) {
    head.add(put(lump(new THREE.SphereGeometry(0.5, 14, 10), '#15110f', { seed: 405, lump: 0.01, mat: { rough: 0.15, prints: 0.1 } }), 1.6, 0.7, z));
    const ear = lump(new THREE.SphereGeometry(1.1, 16, 10).scale(0.5, 1.5, 0.9), D, { seed: 406, lump: 0.06 }); ear.position.set(-0.6, 0.4, z * 2.2); ear.rotation.x = z * 0.4; head.add(ear);
  }
  const collar = lump(new THREE.TorusGeometry(1.9, 0.35, 8, 24).rotateY(Math.PI / 2), '#d7263d', { seed: 407, lump: 0.02 }); collar.position.set(2.6, 7, 0); collar.rotation.z = 0.5; g.add(collar);
  const tail = lump(new THREE.CapsuleGeometry(0.45, 2.8, 6, 10), C, { seed: 408, lump: 0.05 }); const tp = new THREE.Group(); tp.position.set(-3.4, 3.4, 0); tp.add(put(tail, 0, 1.6, 0)); g.add(tp);
  g.userData = { wag: (t) => { tp.rotation.x = Math.sin(t * 14) * 0.6; tp.rotation.z = 0.7; }, head };
  return g;
}

/** a clay pigeon: grey, with the green-and-purple sheen at the neck */
export function pigeon() {
  const g = new THREE.Group();
  g.add(lump(new THREE.SphereGeometry(1.6, 24, 16).scale(1.4, 1, 1), '#8c8f9c', { seed: 500, lump: 0.06 }));
  const neck = lump(new THREE.CylinderGeometry(0.75, 1.0, 1.3, 16), '#6e7f7a', { seed: 501, lump: 0.04, marble: '#7a5a8e' }); neck.position.set(1.2, 1.3, 0); neck.rotation.z = -0.4; g.add(neck);
  const head = new THREE.Group(); head.position.set(1.8, 2.3, 0); g.add(head);
  head.add(lump(new THREE.SphereGeometry(0.8, 16, 12), '#7c7f8c', { seed: 502, lump: 0.03 }));
  head.add(put(lump(new THREE.ConeGeometry(0.22, 0.8, 8).rotateZ(-Math.PI / 2), '#e7b25a', { seed: 503, lump: 0.01 }), 0.95, -0.1, 0));
  for (const z of [-0.55, 0.55]) head.add(put(lump(new THREE.SphereGeometry(0.2, 8, 6), '#e0602a', { seed: 504, lump: 0.01, mat: { rough: 0.2 } }), 0.35, 0.2, z));
  const tail = lump(new THREE.BoxGeometry(2, 0.3, 1.4, 4, 1, 3), '#5d606b', { seed: 505, lump: 0.05 }); tail.position.set(-2, 0.1, 0); tail.rotation.z = 0.25; g.add(tail);
  for (const z of [-0.5, 0.5]) g.add(put(lump(new THREE.CapsuleGeometry(0.12, 0.9, 4, 6), '#d9727a', { seed: 506, lump: 0.01 }), 0.2, -1.3, z));
  g.userData = { bob: (t) => { head.position.x = 1.8 + Math.max(0, Math.sin(t * 9)) * 0.4; } };
  return g;
}

/** a clay cake on a glass stand in a bakery window */
export function cake(color = '#ff9ec4', seed = 1) {
  const g = new THREE.Group();
  g.add(put(new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 0.6, 32), glassMat()), 0, 2.3, 0));
  g.add(put(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.2, 2, 16), glassMat()), 0, 1, 0));
  g.add(put(lump(new THREE.CylinderGeometry(3.4, 3.5, 2.6, 40, 3), color, { seed: seed * 10, lump: 0.1 }), 0, 3.9, 0));
  g.add(put(lump(new THREE.CylinderGeometry(2.3, 2.4, 2.2, 40, 3), '#fff4ea', { seed: seed * 10 + 1, lump: 0.1 }), 0, 6.3, 0));
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.add(put(lump(new THREE.SphereGeometry(0.55, 10, 8), '#fff4ea', { seed: seed * 10 + 2 + i, lump: 0.04 }), Math.cos(a) * 3.1, 5.2, Math.sin(a) * 3.1)); }
  g.add(put(lump(new THREE.SphereGeometry(0.75, 16, 12), '#d7263d', { seed: seed * 10 + 20, lump: 0.03, mat: { rough: 0.2, prints: 0.2 } }), 0, 7.9, 0));
  return g;
}

/**
 * The street at dusk: road with rails, pavement, a row of card facades with
 * lit windows, the bakery, lamps, a bench and a painted sky.
 */
export function street({ lamps = [-40, 20, 80], tramOn = false } = {}) {
  const g = new THREE.Group();
  // sky: a painted backdrop, and a clay moon
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(700, 360), new THREE.MeshBasicMaterial({ map: canvasTex(512, 512, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#141a45'); gr.addColorStop(0.45, '#4a2f7a'); gr.addColorStop(0.75, '#d9677a'); gr.addColorStop(1, '#ffb070');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    const r = rng(3); c.fillStyle = '#fff6d8'; for (let i = 0; i < 120; i++) { c.globalAlpha = r() * 0.8; c.fillRect(r() * w, r() * h * 0.5, 1.5, 1.5); }
  }) }));
  sky.position.set(0, 120, -140); g.add(sky);
  const moon = lump(new THREE.SphereGeometry(9, 32, 24), '#fff1c8', { seed: 600, lump: 0.3, mat: { sss: 0.8 } }); moon.material = moon.material.clone(); moon.material.emissive = new THREE.Color('#fff1c8'); moon.material.emissiveIntensity = 0.55;
  moon.position.set(60, 150, -120); g.add(moon);
  [[-90, 130, -110, 1.4], [30, 170, -115, 1.1], [120, 120, -112, 1.2]].forEach(([x, y, z, s], i) => { const c = cloud(i + 7, s * 2); c.position.set(x, y, z); c.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.color = new THREE.Color('#d8b3cf'); } }); g.add(c); });
  // road and rails
  const roadT = cobbles(); roadT.wrapS = roadT.wrapT = THREE.RepeatWrapping; roadT.repeat.set(10, 3);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(500, 90), new THREE.MeshStandardMaterial({ map: roadT, roughness: 0.85 }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 55); road.receiveShadow = true; g.add(road);
  for (const z of [48, 58]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(500, 0.5, 0.9), metalMat('#9aa1ab', 0.3)); rail.position.set(0, 0.2, z); rail.receiveShadow = true; g.add(rail); }
  // pavement and kerb
  const slabs = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#a9a3a0'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 3; for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } const r = rng(4); for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(0,0,0,${r() * 0.06})`; c.fillRect(r() * w, r() * h, 4, 4); } });
  slabs.wrapS = slabs.wrapT = THREE.RepeatWrapping; slabs.repeat.set(12, 1);
  const pave = new THREE.Mesh(new THREE.BoxGeometry(500, 1.4, 22), [cardMat('#8f8a88'), cardMat('#8f8a88'), new THREE.MeshStandardMaterial({ map: slabs, roughness: 0.9 }), cardMat('#8f8a88'), cardMat('#8f8a88'), cardMat('#8f8a88')]);
  pave.position.set(0, 0.7, 1); pave.receiveShadow = true; g.add(pave);
  // the facades
  const facades = [];
  FACADES.forEach((col, i) => {
    const w = 48, h = 88 + ((i * 37) % 3) * 12, x = -150 + i * 50;
    const mat = facadeMats(col, { seed: i + 1, cols: 4, rows: 5, shop: i === 3 });
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 3), [cardMat(col), cardMat(col), cardMat(col), cardMat(col), mat, cardMat(col)]);
    f.position.set(x, h / 2, -12); f.receiveShadow = true; f.castShadow = true; g.add(f);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 4, 6), cardMat('#3c3446')); roof.position.set(x, h + 2, -12); g.add(roof);
    const ch = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 4), cardMat('#7a4a3a')); ch.position.set(x + (i % 2 ? 12 : -10), h + 6, -13); g.add(ch);
    facades.push(f);
  });
  // the bakery front on the fourth building (x = 0): awning, sign, lit window with cakes
  const shopX = 0;
  const win = new THREE.Mesh(new THREE.BoxGeometry(30, 16, 1), new THREE.MeshStandardMaterial({ color: '#ffe3b0', emissive: '#ffc070', emissiveIntensity: 0.6, roughness: 0.9 }));
  win.position.set(shopX, 10.5, -10.2); g.add(win);
  const sill = new THREE.Mesh(new THREE.BoxGeometry(32, 1.2, 5), woodMat()); sill.position.set(shopX, 3.2, -8.4); sill.castShadow = sill.receiveShadow = true; g.add(sill);
  const cakes = [['#ff9ec4', -8], ['#8fd3ff', 0], ['#ffd166', 8]].map(([c, x], i) => { const k = cake(c, i + 1); k.scale.setScalar(0.72); k.position.set(shopX + x, 3.8, -8.4); g.add(k); return k; });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(24, 4.4, 1), printMat(512, 94, (c, w, h) => { c.fillStyle = '#3b2230'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd9a0'; c.font = `${h * 0.66}px Anton`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('LEIPOMO · BAKERY', w / 2, h * 0.55); }));
  sign.material.emissive = new THREE.Color('#fff'); sign.material.emissiveMap = sign.material.map; sign.material.emissiveIntensity = 0.5;
  sign.position.set(shopX, 23, -9.8); g.add(sign);
  const shopLight = new THREE.PointLight('#ffc27a', 500, 40, 1.8); shopLight.position.set(shopX, 12, -2); g.add(shopLight);
  // lamps, a bench, a bin
  const lampList = lamps.map((x) => { const l = streetlamp(); l.position.set(x, 1.4, 9); g.add(l); return l; });
  const bench = new THREE.Group(); bench.position.set(-28, 1.4, -4); g.add(bench);
  for (let i = 0; i < 3; i++) bench.add(put(new THREE.Mesh(new THREE.BoxGeometry(16, 0.8, 1.4), woodMat()), 0, 4.5, -1.6 + i * 1.6));
  for (let i = 0; i < 2; i++) bench.add(put(new THREE.Mesh(new THREE.BoxGeometry(16, 1.4, 0.8), woodMat()), 0, 7 + i * 2, -2.6));
  for (const x of [-6.5, 6.5]) bench.add(put(new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.5, 4), metalMat('#20352e', 0.5)), x, 2.25, -0.6));
  bench.traverse((o) => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  const bin = lump(new THREE.CylinderGeometry(2.4, 2.1, 7, 20, 3), '#2f5d4a', { seed: 700, lump: 0.08 }); bin.position.set(44, 4.9, -5); g.add(bin);
  let tr = null;
  if (tramOn) { tr = tram(); tr.position.set(-120, 0, 53); g.add(tr); }
  return { g, lamps: lampList, cakes, tram: tr, facades, bench };
}

/** the reticle the glasses draw round what you look at, and its verdict card */
export function reticle(text, { w = 14, h = 14 } = {}) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: '#5ff3ff', transparent: true, opacity: 0.95, depthTest: false });
  const L = Math.min(w, h) * 0.28, T = 0.35;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(L, T, T), m); a.position.set(sx * (w / 2 - L / 2), sy * h / 2, 0); g.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(T, L, T), m); b.position.set(sx * w / 2, sy * (h / 2 - L / 2), 0); g.add(b);
  }
  const card = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.25, w * 0.3), new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, map: canvasTex(768, 184, (c, W, H) => {
    c.fillStyle = '#12c6dc'; c.beginPath(); c.roundRect(4, 4, W - 8, H - 8, 24); c.fill();
    c.strokeStyle = '#e8fdff'; c.lineWidth = 8; c.stroke();
    c.fillStyle = '#ffffff'; c.font = `${H * 0.34}px "Archivo Black"`; c.textAlign = 'center'; c.textBaseline = 'middle';
    let fs = H * 0.34; while (c.measureText(text).width > W * 0.88) { fs *= 0.93; c.font = `${fs}px "Archivo Black"`; }
    c.fillText(text, W / 2, H * 0.54);
  }) }));
  card.position.set(0, h / 2 + w * 0.26, 0); g.add(card);
  g.renderOrder = 10; g.traverse((o) => { o.renderOrder = 10; });
  return g;
}

/** the news studio: a curved desk with the station on its front, a big monitor, Toko on the wall */
export function studio() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), feltMat('#20264f')); wall.position.set(0, 50, -30); wall.receiveShadow = true; g.add(wall);
  // wall panels: a grid of slightly lighter felt squares
  for (let x = -3; x <= 3; x++) for (let y = 0; y < 3; y++) { const p = new THREE.Mesh(new THREE.BoxGeometry(17, 17, 0.6), feltMat(y === 1 && Math.abs(x) < 2 ? '#2d3670' : '#262d5c')); p.position.set(x * 19, 12 + y * 19, -29.4); p.receiveShadow = true; g.add(p); }
  // the monitor: a card TV with a lit screen showing a pair of glasses and a question
  const tv = new THREE.Mesh(new THREE.BoxGeometry(36, 22, 3), cardMat('#1b1b22')); tv.position.set(-16, 34, -26); tv.castShadow = true; g.add(tv);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(33, 19), new THREE.MeshBasicMaterial({ map: canvasTex(660, 380, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#5ff3ff'); gr.addColorStop(1, '#8a5cff'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#101020'; c.lineWidth = 22; c.beginPath(); c.ellipse(w * 0.35, h * 0.46, 80, 58, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(w * 0.65, h * 0.46, 80, 58, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(w * 0.43, h * 0.4); c.quadraticCurveTo(w / 2, h * 0.32, w * 0.57, h * 0.4); c.stroke();
    c.fillStyle = '#101020'; c.font = `${h * 0.16}px "Archivo Black"`; c.textAlign = 'center'; c.fillText('IT SEES WHAT YOU SEE', w / 2, h * 0.9);
  }) }));
  screen.position.set(-16, 34, -24.4); g.add(screen);
  const glow = new THREE.PointLight('#8ad8ff', 400, 60, 1.8); glow.position.set(-16, 34, -14); g.add(glow);
  const toko = tokoBadge({ r: 7 }); toko.position.set(17, 38, -27); g.add(toko);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(30, 5, 1), printMat(768, 128, (c, w, h) => { c.fillStyle = '#111'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff4fa3'; c.font = `${h * 0.66}px Anton`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TECH DESK', w / 2, h * 0.55); }));
  sign.material.emissive = new THREE.Color('#fff'); sign.material.emissiveMap = sign.material.map; sign.material.emissiveIntensity = 0.9;
  sign.position.set(17, 27, -27); g.add(sign);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 100), woodMat()); floor.rotation.x = -Math.PI / 2; floor.position.z = 10; floor.receiveShadow = true; g.add(floor);
  // the desk: a curved front printed with the station, a wooden top
  const front = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 13, 48, 1, true, -0.55, 1.1), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7, map: canvasTex(1024, 180, (c, w, h) => {
    c.fillStyle = '#f0027f'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd166'; c.fillRect(0, h * 0.78, w, h * 0.1);
    c.fillStyle = '#fff4ea'; c.font = `${h * 0.42}px Anton`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('RADIO FREE HELSINKI', w / 2, h * 0.42);
  }) }));
  front.rotation.y = 0; front.position.set(0, 6.5, -28); front.castShadow = front.receiveShadow = true; g.add(front);
  // the top is a curved STRIP (an annulus sector), not a slab: a slab to the
  // centre of the curve would pass straight through the presenter
  const arc = new THREE.Shape(); arc.absarc(0, 0, 41.5, Math.PI / 2 - 0.58, Math.PI / 2 + 0.58, false); arc.absarc(0, 0, 33, Math.PI / 2 + 0.58, Math.PI / 2 - 0.58, true);
  const top = new THREE.Mesh(new THREE.ExtrudeGeometry(arc, { depth: 1.2, bevelEnabled: false, curveSegments: 32 }).rotateX(Math.PI / 2), woodMat()); top.position.set(0, 14, -28); top.castShadow = top.receiveShadow = true; g.add(top);
  // desk props: a mug, papers, a microphone
  const mug = lump(new THREE.CylinderGeometry(1.2, 1.1, 2.6, 20), '#ffd166', { seed: 800, lump: 0.05 }); mug.position.set(11, 15.3, 10); g.add(mug);
  const papers = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 9), cardMat('#fbf6ea')); papers.position.set(-7, 14.2, 9); papers.rotation.y = 0.2; papers.castShadow = true; g.add(papers);
  const mic = new THREE.Group(); mic.position.set(10.5, 14, 8); mic.rotation.z = 0.25; g.add(mic);
  mic.add(put(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.6, 16), metalMat('#222', 0.4)), 0, 0.3, 0));
  mic.add(put(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 8), metalMat('#333', 0.3)), 0, 2.8, 0));
  mic.add(put(new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12).scale(1, 1.4, 1), metalMat('#555', 0.6)), 0, 5.7, 0));
  return { g, toko, screen };
}

/** a pegboard wall of glasses, `n` of them in a grid, one colour each */
export function glassesWall(makeGlasses, cols = 10, rows = 10) {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(cols * 9 + 10, rows * 7 + 16, 1.4), [cardMat('#d9b98a'), cardMat('#d9b98a'), cardMat('#d9b98a'), cardMat('#d9b98a'), new THREE.MeshStandardMaterial({ roughness: 0.9, map: canvasTex(512, 512, (c, w, h) => { c.fillStyle = '#d9b98a'; c.fillRect(0, 0, w, h); c.fillStyle = '#6a5132'; for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 16) { c.beginPath(); c.arc(x, y, 2.4, 0, Math.PI * 2); c.fill(); } }) }), cardMat('#d9b98a')]);
  board.position.set(0, rows * 3.5 + 8, -4); board.receiveShadow = true; g.add(board);
  const cols8 = ['#1d1a22', '#d7263d', '#2f6fd0', '#f2b53a', '#2fb58c', '#f0027f', '#6c4fd6', '#e2573e', '#fbf3e4', '#8a5433'];
  // ten prototypes, cloned: a clone SHARES its geometry, so a hundred pairs
  // boil as ten — otherwise the wall costs more than the rest of the film
  const protos = cols8.map((frame, i) => makeGlasses({ frame, seed: i + 1 }));
  const items = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const i = y * cols + x, gl = protos[(x * 3 + y * 7) % cols8.length].clone();
    gl.scale.setScalar(1.28); gl.position.set((x - (cols - 1) / 2) * 9, 12 + y * 7, -2.2); gl.rotation.set(0, 0, Math.sin(i * 1.7) * 0.05); g.add(gl); items.push(gl);
  }
  return { g, items };
}
