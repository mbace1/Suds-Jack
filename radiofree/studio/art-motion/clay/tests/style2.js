// STYLE 2 — Laika-style miniature.
//
// A refined stop-motion set: knitted wool, felt, painted wood and real-looking
// tiny props, lit by practicals — a lamp, a candle, the bot's LED and the cold
// window — in a dark green room. Shot tilt-shift so it reads as a model.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { boot } from './lib/stage.js';
import { surface } from './lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh, rng } from './lib/sculpt.js';
import { buildKid, buildArms, buildToy } from './lib/cast.js';
import { skyPlane, facadeFlat, cathedral, rainStreaks, canvas, tex, dropMaterial } from './lib/city.js';

boot(async ({ scene, camera, renderer, q }) => {
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // ------------------------------------------------------------ materials
  const felt = (color, o = {}) => surface({ surf: 'felt', color, rough: 0.96, sheen: 1, sheenColor: o.sheenColor ?? '#ffffff', sheenRough: 0.55, fibre: 0.012, fibreF: 26, lump: 0.01, lumpF: 0.8, mottle: 0.07, specks: 0.25, roughVar: 0.02, eps: 0.01, ...o });
  const knit = (color, o = {}) => surface({ surf: 'knit', color, rough: 0.95, sheen: 0.8, sheenColor: o.sheenColor ?? '#ffe2b0', sheenRough: 0.6, fibre: 0.05, fibreF: 30, knitW: 0.34, knitH: 0.3, lump: 0.01, mottle: 0.06, specks: 0.2, roughVar: 0.02, eps: 0.008, ...o });
  const paint = (color, o = {}) => surface({ color, rough: 0.55, lump: 0.004, lumpF: 0.6, thumb: 0.0, tool: 0, grain: 0.002, grainF: 30, mottle: 0.08, specks: 0.4, roughVar: 0.1, ...o });
  const M = {
    jumper: knit('#9a6a28', { sheenColor: '#d7a35a' }),
    collar: knit('#7d5520', { knitW: 0.22, knitH: 0.5 }),
    sleeveFn: (s, sh, wr) => knit('#9a6a28', { sheenColor: '#d7a35a', knitAxis: [wr[0] - sh[0], wr[1] - sh[1], wr[2] - sh[2]], knitO: sh }),
    cuffFn: () => knit('#7d5520', { knitW: 0.2, knitH: 0.5 }),
    trousers: felt('#3c4532', { sheenColor: '#8a9670', fibre: 0.008 }),
    sockFn: (s, a) => knit('#c9bda6', { knitO: [a[0], 0, a[2]], knitW: 0.26, knitH: 0.24, sheenColor: '#fff2dc' }),
    skin: surface({ color: '#b8958a', rough: 0.55, lump: 0.004, thumb: 0.004, grain: 0.002, mottle: 0.05, specks: 0.05, wrap: 0.5, wrapTint: '#ff9f7f' }),
    hat: knit('#29473a', { sheenColor: '#7fae94' }),
    hatBrim: knit('#a5762e', { knitW: 0.22, knitH: 0.55, sheenColor: '#e9b86a' }),
    pompom: felt('#b4843a', { fibre: 0.05, fibreF: 14, lump: 0.12, lumpF: 2.5, sheenColor: '#ffd590' }),
    hair: felt('#3a2418', { fibre: 0.03, fibreF: 18 }),
    head: felt('#3a2418', { fibre: 0.035, fibreF: 9, sheenColor: '#a07850' }),
    maskDisc: felt('#c80aa6', { sheenColor: '#ff90e0', fibre: 0.008 }),
    maskInk: felt('#f3ead8', { sheenColor: '#ffffff', fibre: 0.006 }),
    thread: new THREE.MeshStandardMaterial({ color: '#8c0d4c', roughness: 0.7 }),
    rimThread: new THREE.MeshStandardMaterial({ color: '#efe3cc', roughness: 0.7 }),
    strap: felt('#1b1716', { sheenColor: '#5a504a' }),
    redLed: new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 0.5, 0.3) }),
    body: felt('#bdb6a8', { sheenColor: '#f4f0e6' }),
    belly: felt('#d8d1c2', { sheenColor: '#ffffff' }),
    ear: felt('#a39b8d'),
    antenna: paint('#2a2725', { rough: 0.4 }),
    bobble: felt('#b4843a', { sheenColor: '#ffd590' }),
    eye: paint('#0e0c0b', { rough: 0.18, specks: 0 }),
    eyeGlint: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6) }),
    smile: new THREE.MeshStandardMaterial({ color: '#2a1c18', roughness: 0.8 }),
    cheek: felt('#c98a7e'),
    bezel: paint('#58524c', { rough: 0.3, metal: 0.6 }),
    led: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 6.2, 7.2) }),
  };
  const S = {
    plaster: paint('#7d7462', { lump: 0.02, grain: 0.006, grainF: 6, mottle: 0.2, rough: 0.85 }),
    frame: paint('#cfc5b0', { rough: 0.5, mottle: 0.12, specks: 1.0, speckColor: '#5a4632' }),
    wood: paint('#3a2618', { rough: 0.6, grain: 0.004, grainF: 3, mottle: 0.25 }),
    cushion: felt('#5e2a2a', { sheenColor: '#b06a62' }),
    blanket: knit('#8b8577', { knitW: 0.42, knitH: 0.36, sheenColor: '#e8e2d2', knitAxis: [1, 0, 0] }),
    radiator: paint('#b8ae98', { rough: 0.45, mottle: 0.15, specks: 1.2, speckColor: '#6a4a30' }),
    book: [felt('#5b3a2a'), felt('#2d4a52'), felt('#7a6a3a')],
    pages: paint('#e8dcc0', { rough: 0.9 }),
    cup: paint('#e9e2d4', { rough: 0.2, mottle: 0.03 }),
    tea: paint('#3a1e10', { rough: 0.08 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#ffe9c8', roughness: 0.1, transmission: 0.0, transparent: true, opacity: 0.35 }),
    wax: surface({ color: '#efe4cc', rough: 0.6, lump: 0.01, wrap: 0.8, wrapTint: '#ffcf8a', glow: '#3a1e05', glowPow: 1.5 }),
    pot: paint('#8a4a30', { rough: 0.8, mottle: 0.2 }),
    leaf: felt('#3f5a2c', { sheenColor: '#9fc070' }),
    lampBase: paint('#2b2e2a', { rough: 0.35, metal: 0.3 }),
    shade: surface({ color: '#e7c88e', rough: 0.95, lump: 0.0, thumb: 0, grain: 0.004, grainF: 30, side: THREE.DoubleSide, glow: '#ad6a22', glowPow: 0.5 }),
  };

  // --------------------------------------------------------------- the room
  const WX = 13, WY0 = 0, WY1 = 52, WALLZ = 8, DEEP = 14, GZ = WALLZ - DEEP;
  {
    // wallpaper: a dark green damask, sun-faded, stained under the sill
    const c = canvas(512, 512), g = c.getContext('2d');
    g.fillStyle = '#1b261e'; g.fillRect(0, 0, 512, 512);
    const r = rng(4);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '40,58,44' : '18,26,20'},${0.25 * r()})`; g.fillRect(r() * 512, r() * 512, 2 + r() * 6, 2 + r() * 6); }
    g.fillStyle = 'rgba(70,92,64,0.55)';
    const motif = (cx, cy, s) => {
      g.save(); g.translate(cx, cy); g.scale(s, s);
      g.beginPath(); g.moveTo(0, -60); g.bezierCurveTo(30, -40, 34, -10, 10, 0); g.bezierCurveTo(40, 10, 40, 50, 0, 64); g.bezierCurveTo(-40, 50, -40, 10, -10, 0); g.bezierCurveTo(-34, -10, -30, -40, 0, -60); g.fill();
      g.beginPath(); g.ellipse(0, 4, 8, 16, 0, 0, Math.PI * 2); g.fillStyle = 'rgba(24,34,26,0.8)'; g.fill(); g.fillStyle = 'rgba(70,92,64,0.55)';
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 36, -30, 14, 6, sx * 0.6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(sx * 30, 40, 12, 5, -sx * 0.5, 0, Math.PI * 2); g.fill(); }
      g.restore();
    };
    for (const [x, y] of [[128, 128], [384, 384], [384, -128], [-128, 384], [384, 128 + 512], [128 + 512, 384]]) motif(x, y, 1.3);
    motif(384, 128 - 512 + 512, 0); // keep tiling even
    for (const [x, y] of [[128, 128 + 512], [128 - 512, 128], [128, 128 - 512], [128 + 512, 128]]) motif(x, y, 1.3);
    for (const [x, y] of [[384, 384 - 512], [384 - 512, 384]]) motif(x, y, 1.3);
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 16, 1 / 16);
    const wallMat = paint('#ffffff', { rough: 0.85, grain: 0.004, grainF: 4, mottle: 0.15, specks: 0.2 });
    wallMat.map = t;
    const sh = new THREE.Shape([[-90, -45], [90, -45], [90, 100], [-90, 100]].map(([x, y]) => new THREE.Vector2(x, y)));
    sh.holes.push(new THREE.Path([[-WX, WY0], [-WX, WY1], [WX, WY1], [WX, WY0]].map(([x, y]) => new THREE.Vector2(x, y))));
    const front = new THREE.ShapeGeometry(sh);
    mesh(front, wallMat, { pos: [0, 0, WALLZ] , parent: scene });
    // the reveal: plaster, four sides
    mesh(new THREE.BoxGeometry(2, WY1 - WY0 + 4, DEEP), S.plaster, { pos: [-WX - 1, (WY0 + WY1) / 2, GZ + DEEP / 2], parent: scene });
    mesh(new THREE.BoxGeometry(2, WY1 - WY0 + 4, DEEP), S.plaster, { pos: [WX + 1, (WY0 + WY1) / 2, GZ + DEEP / 2], parent: scene });
    mesh(new THREE.BoxGeometry(WX * 2 + 4, 2, DEEP), S.plaster, { pos: [0, WY1 + 1, GZ + DEEP / 2], parent: scene });
    // skirting / panelling under the seat
    mesh(new THREE.BoxGeometry(180, 34, 1), S.wood, { pos: [0, -28, WALLZ + 0.5], parent: scene });
  }
  // a Finnish double window: inner and outer casements a hand's width apart
  const bar = (x, y, w, h, z, d = 1.6) => mesh(new RoundedBoxGeometry(w, h, d, 2, 0.25), S.frame, { pos: [x, y, z], parent: scene });
  for (const z of [GZ + 0.8, GZ - 5.0]) {
    const k = z < GZ ? 0.9 : 1;
    bar(0, WY1 - 1.0, WX * 2, 2.0, z); bar(0, WY0 + 1.0, WX * 2, 2.0, z);
    bar(-WX + 1.0, (WY0 + WY1) / 2, 2.0, WY1 - WY0, z); bar(WX - 1.0, (WY0 + WY1) / 2, 2.0, WY1 - WY0, z);
    bar(0, (WY0 + WY1) / 2, 1.4 * k, WY1 - WY0, z); bar(0, 38, WX * 2, 1.4 * k, z);
  }
  // brass catch on the inner casement
  mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), paint('#a07a3a', { rough: 0.3, metal: 0.8 }), { pos: [0.9, 24, GZ + 1.9], parent: scene });

  // the seat: a wooden board, a felt cushion, a knitted blanket slipping off it
  const CD = DEEP + 4;
  mesh(new RoundedBoxGeometry(WX * 2 + 2, 2.2, CD, 2, 0.3), S.wood, { pos: [0, -3.2, GZ + CD / 2], parent: scene });
  mesh(lumpy(new RoundedBoxGeometry(WX * 2 - 1, 2.6, CD - 4, 6, 1.1), 0.08, 0.4, 5), S.cushion, { pos: [0, -0.9, GZ + (CD - 4) / 2 + 1.0], parent: scene });
  {
    // blanket: a sheet over the cushion's right end, folding over the front edge
    const pts = [];
    const w = 11, x0 = 4;
    const geo = new THREE.PlaneGeometry(w, 30, 40, 120);
    const p = geo.attributes.position;
    const r = rng(9);
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i), v = p.getY(i) + 15; // v: 0..30 along the drape
      let y, z;
      const top = CD - 4; // run along the top, then over the edge
      if (v < top) { y = 0.45 + Math.sin(u * 0.9 + v * 0.3) * 0.12; z = GZ + 1 + v; }
      else { const a = Math.min((v - top) / 2.0, 1) * Math.PI / 2; const rr = 1.0; if (v - top < 2.0) { y = 0.45 - (1 - Math.cos(a)) * rr * 1.2; z = GZ + 1 + top + Math.sin(a) * rr; } else { y = 0.45 - rr * 1.2 - (v - top - 2.0); z = GZ + 1 + top + rr + Math.sin(v * 0.7 + u) * 0.25; } }
      const fold = Math.sin(u * 1.3 + 0.5) * 0.35 * Math.min(1, Math.max(0, (v - top) / 4));
      p.setXYZ(i, x0 + u + Math.sin(v * 0.4) * 0.3, y + fold * 0.2, z + fold);
    }
    geo.computeVertexNormals();
    const b = mesh(geo, S.blanket, { parent: scene }); b.material.side = THREE.DoubleSide;
  }
  // a heavy velvet curtain drawn back on the left, folds hanging to the floor
  {
    const velvet = felt('#1c2a20', { sheenColor: '#6f9a72', fibre: 0.006 });
    for (let i = 0; i < 7; i++) {
      const x = -WX - 12 + i * 1.7, ph = i * 1.9, pts = [];
      for (let k = 0; k <= 8; k++) { const y = 66 - k * 11; const gather = Math.max(0, 1 - Math.abs(y - 18) / 30); pts.push([x + gather * (6 - i) * 0.55 + Math.sin(ph + k * 0.5) * 0.3, y, WALLZ + 1.2 + (i % 2) * 1.0 + gather * 1.5]); }
      mesh(sausage(pts, [1.0, 1.05, 1.1, 0.8, 0.7, 0.9, 1.1, 1.2, 1.3], { up: [0, 0, 1], steps: 96 }), velvet, { parent: scene });
    }
    // the tie-back
    mesh(sausage([[-WX - 13, 18, WALLZ + 3.6], [-WX - 7, 18.5, WALLZ + 4.4], [-WX - 2.5, 18, WALLZ + 3.2]], [0.35, 0.4, 0.35], { up: [0, 1, 0] }), paint('#a07a3a', { rough: 0.4, metal: 0.6 }), { parent: scene });
  }
  // a cast-iron radiator under it
  for (let i = 0; i < 13; i++) mesh(new RoundedBoxGeometry(1.5, 20, 5, 2, 0.6), S.radiator, { pos: [-15 + i * 2.5, -17, WALLZ + 2.8], parent: scene });
  mesh(new THREE.CylinderGeometry(0.5, 0.5, 34, 10).rotateZ(Math.PI / 2), S.radiator, { pos: [0, -7.5, WALLZ + 2.8], parent: scene });

  // props on the sill: books, tea, a candle in a glass, a plant
  {
    const books = new THREE.Group();
    const dims = [[6.2, 1.1, 4.4], [5.6, 0.9, 4.0], [5.0, 1.3, 3.6]];
    let y = 0;
    dims.forEach(([w, h, d], i) => {
      mesh(new RoundedBoxGeometry(w, h, d, 2, 0.12), S.book[i], { pos: [0, y + h / 2, 0], rot: [0, (i - 1) * 0.12, 0], parent: books });
      mesh(new THREE.BoxGeometry(w - 0.3, h - 0.25, d - 0.15), S.pages, { pos: [0.18, y + h / 2, 0], rot: [0, (i - 1) * 0.12, 0], parent: books });
      y += h;
    });
    books.position.set(-9.5, 0.4, GZ + 5.5); books.rotation.y = 0.3; scene.add(books);
    const cup = new THREE.Group();
    mesh(lathe([[0.01, 0], [0.9, 0], [1.0, 0.15], [1.45, 1.5], [1.55, 1.9], [1.45, 1.95], [1.3, 0.4], [0.01, 0.35]], 40), S.cup, { parent: cup });
    mesh(new THREE.CylinderGeometry(1.35, 1.2, 0.05, 30), S.tea, { pos: [0, 1.5, 0], parent: cup });
    mesh(new THREE.TorusGeometry(0.55, 0.13, 8, 20, Math.PI * 1.3).rotateZ(-Math.PI * 0.65), S.cup, { pos: [1.6, 1.0, 0], parent: cup });
    mesh(lathe([[0.01, 0], [2.6, 0], [2.7, 0.1], [2.6, 0.28], [1.2, 0.2], [0.01, 0.2]], 40), S.cup, { pos: [0, -0.2, 0], parent: cup });
    cup.position.set(-9.0, 4.3, GZ + 5.4); scene.add(cup);
    // the tealight in its glass: the second practical
    const cand = new THREE.Group();
    mesh(lathe([[0.01, 0], [1.4, 0], [1.5, 0.1], [1.55, 2.6], [1.45, 2.6], [1.4, 0.3], [0.01, 0.3]], 32), S.glass, { parent: cand, cast: false });
    mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.9, 24), S.wax, { pos: [0, 0.75, 0], parent: cand });
    mesh(new THREE.SphereGeometry(0.22, 10, 8).scale(1, 2.3, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(12, 6.5, 2.2) }), { pos: [0, 1.75, 0], parent: cand, cast: false });
    cand.position.set(9.5, 0.4, GZ + 9.5); scene.add(cand);
    const fl = new THREE.PointLight('#ff9a40', 140, 0, 2); fl.position.set(9.5, 2.6, GZ + 9.5); scene.add(fl);
    fl.castShadow = true; fl.shadow.mapSize.set(512, 512); fl.shadow.radius = 4; fl.shadow.bias = -0.003; fl.shadow.camera.near = 0.3; fl.shadow.camera.far = 60;
    // a pothos in a clay pot in the far corner
    const plant = new THREE.Group();
    mesh(lathe([[0.01, 0], [1.8, 0], [2.4, 3.2], [2.6, 3.4], [2.5, 3.6], [2.2, 3.2], [0.01, 3.0]], 32), S.pot, { parent: plant });
    const r = rng(31);
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, L = 2 + r() * 5, droop = r();
      const stem = [[0, 3.2, 0], [Math.cos(a) * L * 0.4, 3.6 + L * 0.3, Math.sin(a) * L * 0.4], [Math.cos(a) * L, 3.0 + L * 0.2 - droop * L * 0.8, Math.sin(a) * L]];
      mesh(sausage(stem, [0.08, 0.07, 0.06], { seg: 6, steps: 12, capSteps: 2 }), S.leaf, { parent: plant });
      const lf = new THREE.SphereGeometry(1, 12, 8); lf.scale(0.9, 0.12, 1.3);
      mesh(lf, S.leaf, { pos: stem[2], rot: [0.4 * r(), a, 0.6 * (r() - 0.5)], parent: plant });
    }
    plant.position.set(11, 0.4, GZ + 3.5); scene.add(plant);
  }

  // ------------------------------------------------------------- outside
  scene.fog = new THREE.Fog('#2b3754', 140, 560);
  const out = new THREE.Group(); scene.add(out);
  out.add(skyPlane(500, 160, [[0, '#0b1428'], [0.35, '#1a2a4a'], [0.6, '#33456a'], [0.75, '#6a6478'], [0.86, '#a77a62'], [1, '#3b2c2a']], { pos: [0, 70, -260], intensity: 1.0 }));
  {
    // the cathedral: a real little dome on a drum, in the haze
    const cat = new THREE.Group();
    // floodlit, as it is every night: pale stone, green copper
    const copper = paint('#5f9a8a', { rough: 0.6, mottle: 0.2, emissive: '#1d4a40' });
    const stone = paint('#d6d2c6', { rough: 0.8, emissive: '#6a6458' });
    mesh(new THREE.CylinderGeometry(9, 9, 11, 32), stone, { pos: [0, 5.5, 0], parent: cat });
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; mesh(new THREE.CylinderGeometry(0.45, 0.45, 9, 6), stone, { pos: [Math.cos(a) * 9.5, 5.5, Math.sin(a) * 9.5], parent: cat }); }
    mesh(new THREE.SphereGeometry(9.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.1, 1), copper, { pos: [0, 11, 0], parent: cat });
    mesh(new THREE.CylinderGeometry(1.8, 1.8, 4, 12), stone, { pos: [0, 23.5, 0], parent: cat });
    mesh(new THREE.SphereGeometry(2.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), copper, { pos: [0, 25.5, 0], parent: cat });
    mesh(new THREE.BoxGeometry(60, 18, 20), stone, { pos: [0, -9, 0], parent: cat });
    for (const x of [-24, 24]) { mesh(new THREE.CylinderGeometry(3.4, 3.4, 6, 16), stone, { pos: [x, 3, 0], parent: cat }); mesh(new THREE.SphereGeometry(3.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 1.25, 1), copper, { pos: [x, 6, 0], parent: cat }); }
    cat.userData.place = true; out.add(cat);
    const lit = new THREE.PointLight('#ffd0a0', 0, 0); out.add(lit);
    // roofs and the facade across the street
    const far = facadeFlat({ w: 300, h: 80, px: 6, seed: 7, wall: ['#1d2436', '#20283b', '#1a2132'], frame: '#151a28', lit: ['#ffcf7a', '#ffe0a6'], litP: 0.14, dark: '#1a2030', winW: 1.6, winH: 2.4, winGapX: 2.0, winGapY: 2.4, blockW: 26, topMin: 0.4, topVar: 0.16, glow: 1.6 });
    far.position.set(-10, 30, -150); out.add(far);
    const mid = facadeFlat({ w: 170, h: 70, px: 10, seed: 41, wall: ['#3a3430', '#352f2f', '#433a32'], frame: '#211b1a', lit: ['#ffc366', '#ffd894', '#ff9a52', '#e8f0ff'], litP: 0.34, dark: '#25232a', winW: 1.6, winH: 2.6, winGapX: 1.6, winGapY: 2.2, blockW: 22, topMin: 0.06, topVar: 0.12, glow: 2.4 });
    mid.position.set(4, 4, -64); out.add(mid);
    // catenary street lamps hung over the street on their wires
    const wire = new THREE.MeshBasicMaterial({ color: '#06080c' });
    for (const [y0, y1, z] of [[40, 34, -42], [38.5, 32.5, -42.5]]) out.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(-60, y0, z), new THREE.Vector3(60, y1, z + 3)), 2, 0.07, 4), wire));
    const lampGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 5.2, 3.2) });
    for (const x of [-14, 12]) { const y = 37 - (x + 60) / 120 * 6; out.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3, 4), wire).translateX(x).translateY(y - 1.4).translateZ(-41)); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 8).scale(1.4, 0.6, 1.4), lampGlow); gl.position.set(x, y - 3, -41); out.add(gl); }
  }
  out.add(rainStreaks(900, [-45, 45, -10, 75, -60, -6], { len: 3.2, w: 0.03, opacity: 0.3, seed: 8 }));
  {
    // drops on the OUTER pane, and a few slow runs
    const r = rng(23), n = 70;
    const dropMat = dropMaterial({ sky: '#5f7096', dark: '#0e0d12', glint: '#ffcf99', lightDir: [-0.6, 0.4, 0.8], glintAmt: 2.4, opacity: 0.85 });
    const geo = new THREE.SphereGeometry(1, 20, 12); geo.scale(1, 1.1, 0.45);
    const im = new THREE.InstancedMesh(geo, dropMat, n); const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { const s = 0.16 + r() * r() * r() * 0.6; m.compose(new THREE.Vector3(-WX + 2 + r() * (WX * 2 - 4), WY0 + 2 + r() * (WY1 - 4), GZ - 5.9), new THREE.Quaternion(), new THREE.Vector3(s, s * (1 + r() * 0.5), s)); im.setMatrixAt(i, m); }
    scene.add(im);
  }
  {
    // cold window light falling into the room: a soft shaft, and dust in it
    const c = canvas(64, 256), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(140,170,230,0.0)'); gr.addColorStop(0.25, 'rgba(140,170,230,0.10)'); gr.addColorStop(1, 'rgba(140,170,230,0.0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(26, 70), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    
    const r = rng(77), N = 160, pos = [];
    for (let i = 0; i < N; i++) pos.push(-14 + r() * 26, 4 + r() * 40, GZ + 2 + r() * 26);
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: new THREE.Color(1.1, 1.2, 1.5), size: 0.09, transparent: true, opacity: 0.7, depthWrite: false, fog: false })));
  }

  // ------------------------------------------------------------- actors
  const T = [0.2, 6.5, 7.2], TR = 3.4;
  const kid = buildKid(M, {
    lump: 0.035, lumpF: 0.5, headR: 4.6, headY: 15.4, headZ: 2.2, pitch: 0.42, roll: 0.26, yaw: -0.12,
    torsoW: 3.6, torsoD: 2.9, maskR: 3.95, maskThick: 0.42, maskDome: 0.1, maskKind: 'felt', maskRaise: 0.14, maskBevel: 0.0, maskLump: 0.0,
    legR: 1.35, armR: 1.15, legPose: 'hang', bangs: false, headSZ: 0.86, hatY: 1.15, seatEdge: CD - 7.5 + 0.5, thighY: 1.3, shinLen: 8.6,
  });
  kid.position.set(0.8, 0.0, GZ + 7.5);
  kid.rotation.y = -0.28;
  scene.add(kid);
  kid.add(buildArms(M, { lump: 0.03, t: T, tr: TR, armR: 1.15 }));
  const toy = buildToy(M, { r: TR, lean: 0.3, lump: 0.05, ear: 0.8 });
  toy.position.set(...T);
  kid.add(toy);

  // the lamp at camera left: brass stem, pleated shade
  {
    const lamp = new THREE.Group();
    mesh(lathe([[0.01, 0], [3.2, 0], [3.3, 0.5], [1.2, 1.4], [0.45, 2.0], [0.45, 16], [0.01, 16]], 40), S.lampBase, { parent: lamp });
    const sh = lathe([[5.6, 0], [5.8, 0.15], [3.6, 7.2], [3.4, 7.3]], 96);
    const p = sh.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + 0.035 * Math.cos(a * 24); p.setX(i, x * k); p.setZ(i, z * k); }
    sh.computeVertexNormals();
    mesh(sh, S.shade, { pos: [0, 13, 0], parent: lamp, cast: false });
    mesh(new THREE.SphereGeometry(1.3, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(10, 6.2, 2.8) }), { pos: [0, 15.2, 0], parent: lamp, cast: false });
    lamp.position.set(-23, -2, 44); scene.add(lamp);
  }

  // --------------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight('#3a4a6a', '#1a120c', 0.28));
  const key = new THREE.SpotLight('#ffc088', 3600, 0, 0.75, 0.85, 2);
  key.position.set(-23, 13, 44); key.target.position.set(0, 13, 5);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 4; key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.camera.near = 3; key.shadow.camera.far = 120;
  scene.add(key, key.target);
  const win = new THREE.DirectionalLight('#7f9be0', 1.7);
  win.position.set(12, 50, -90); win.target.position.set(0, 8, 4);
  win.castShadow = true; win.shadow.mapSize.set(2048, 2048); win.shadow.radius = 3; win.shadow.bias = -0.0004; win.shadow.normalBias = 0.03;
  Object.assign(win.shadow.camera, { left: -40, right: 40, top: 50, bottom: -30, near: 1, far: 220 });
  scene.add(win, win.target);
  const winFill = new THREE.PointLight('#6f86c8', 260, 0, 2); winFill.position.set(0, 26, GZ - 2); scene.add(winFill);
  scene.updateMatrixWorld(true);
  const led = new THREE.PointLight('#5fe8ff', 55, 0, 2); led.position.copy(toy.userData.body.localToWorld(toy.userData.ledLocal.clone())); scene.add(led);
  led.castShadow = true; led.shadow.mapSize.set(512, 512); led.shadow.radius = 3; led.shadow.bias = -0.002; led.shadow.camera.near = 0.5; led.shadow.camera.far = 60;

  // -------------------------------------------------------------- camera
  camera.fov = 29; camera.near = 5; camera.far = 1000;
  camera.position.set(-21, 17, 104);
  camera.lookAt(1.0, 17.5, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  out.traverse(o => { if (o.userData.place) { const v = new THREE.Vector3(0.3, 0.36, 0.5).unproject(camera).sub(camera.position).normalize(); const t = (-190 - camera.position.z) / v.z; o.position.copy(camera.position).addScaledVector(v, t); o.position.y -= 14; } });
  const maskP = kid.userData.mask.getWorldPosition(new THREE.Vector3());
  if (q.get('cam') === 'head') { camera.position.lerp(maskP, 0.75); camera.lookAt(maskP.x, maskP.y - 2, maskP.z); }
  const focus = camera.position.distanceTo(maskP);
  const ms = maskP.clone().project(camera);

  return {
    focus, aperture: 22, maxBlur: 28, radScale: 0.8,
    tilt: 22, tiltCenter: (ms.y + 1) / 2, tiltBand: 0.32,
    threshold: 1.2, knee: 0.5, bloomA: 0.32, bloomB: 0.16,
    exposure: 1.05, vignette: 0.6, grain: 0.032, sat: 0.95, contrast: 1.08, lift: [0.0, 0.012, 0.012], gain: [1.03, 1.0, 0.93], toe: 0.08,
  };
});
