// STYLE 4 — clay in the shadowbox.
//
// The station already speaks in dark cut-paper shadowboxes. Put the clay
// actors INSIDE one: every layer of the room and the city is a sheet of card
// with its silhouette cut out, lit from behind and stacked a finger apart so
// each edge throws a soft halo of shadow on the sheet behind it — and the bot
// is made of translucent clay, the one thing in the box that glows from within.

import * as THREE from 'three';
import { boot } from './lib/stage.js';
import { surface } from './lib/clay.js';
import { lumpy, sausage, ball, lathe, mesh, rng } from './lib/sculpt.js';
import { buildKid, buildArms, buildToy } from './lib/cast.js';
import { canvas, tex } from './lib/city.js';

const V2 = (x, y) => new THREE.Vector2(x, y);

boot(async ({ scene, camera, renderer, q }) => {
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const card = (color, o = {}) => surface({ surf: 'felt', color, rough: 0.92, fibre: 0.004, fibreF: 40, lump: 0.0, mottle: 0.06, specks: 0.15, roughVar: 0.02, eps: 0.006, ...o });
  const clay = (color, o = {}) => surface({ color, wrap: 0.4, wrapTint: '#ffc6a0', rough: 0.62, lump: 0.03, lumpF: 0.6, thumb: 0.028, thumbCell: 1.6, ridge: 0.1, tool: 0.7, grain: 0.003, grainF: 9, mottle: 0.08, specks: 0.4, roughVar: 0.1, ...o });

  // a sheet of card cut to a shape, with a pale core showing on the cut edge
  const sheet = (shape, mat, z, { depth = 0.14, edge = '#d8cfbd', cast = true } = {}) => {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 });
    const m = new THREE.Mesh(g, [mat, edgeMat(edge)]);
    m.position.z = z; m.castShadow = cast; m.receiveShadow = true;
    scene.add(m); return m;
  };
  const edgeCache = {};
  const edgeMat = (c) => edgeCache[c] || (edgeCache[c] = card(c, { fibre: 0.002 }));
  const rect = (x0, y0, x1, y1) => [V2(x0, y0), V2(x1, y0), V2(x1, y1), V2(x0, y1)];
  // the light strip hidden behind the next sheet: a band of glow rising off its edge
  const glowCard = (color, glowCol, yLo, yHi, k = 1, o = {}) => {
    const c = canvas(8, 256), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 256, 0, 0);   // canvas bottom = world yLo
    gr.addColorStop(0, '#000'); gr.addColorStop(0.18, glowCol); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
    const m = card(color, { emissive: '#ffffff', emissiveIntensity: k, ...o });
    const t = tex(c); t.wrapS = THREE.RepeatWrapping;
    // ExtrudeGeometry UVs are world x,y: map y ∈ [yLo, yHi] onto the strip
    t.repeat.set(1, 1 / (yHi - yLo)); t.offset.set(0, -yLo / (yHi - yLo)); t.wrapT = THREE.ClampToEdgeWrapping;
    m.emissiveMap = t;
    return m;
  };
  const BW = 40, BH = 72; // the box opening, cm

  // ---------------------------------------------------------- 0: the sky, backlit
  {
    const c = canvas(256, 512), g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#0a1430'); gr.addColorStop(0.17, '#17284e'); gr.addColorStop(0.27, '#2f437a'); gr.addColorStop(0.33, '#7d6f8a'); gr.addColorStop(0.38, '#e2a062'); gr.addColorStop(0.5, '#7a5236'); gr.addColorStop(1, '#2a1e1a');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
    const r = rng(3);
    for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${0.025 * r()})`; g.fillRect(r() * 256, r() * 512, 1, 1 + r() * 3); }
    const m = new THREE.MeshBasicMaterial({ map: tex(c) }); m.color.setScalar(1.6);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(BW + 20, BH + 20), m); p.position.set(0, 4, -0.5); scene.add(p);
  }
  // 1: torn cloud bands, a shade lighter, catching the backlight on their tops
  {
    const r = rng(11);
    [[36, '#2a3b66', 1.2], [27, '#34477a', 2.0], [44, '#3e5188', 2.8]].forEach(([y, col, z], k) => {
      const pts = [V2(-BW, y - 6)];
      for (let x = -BW; x <= BW; x += 2.5) pts.push(V2(x, y + Math.sin(x * 0.18 + k * 2) * 1.6 + r() * 0.8));
      pts.push(V2(BW, y - 6));
      sheet(new THREE.Shape(pts), glowCard(col, '#1c2a48', y - 6, y + 3, 0.5), z, { edge: '#8fa2c8' });
    });
  }
  // 2: the far skyline and the cathedral, pin-pricked windows
  const holeLights = [];
  const skyline = (tops, base, holes) => {
    const pts = [V2(-BW, base)];
    for (const [x, y] of tops) pts.push(V2(x, y));
    pts.push(V2(BW, base));
    const sh = new THREE.Shape(pts);
    for (const [x, y, w, h] of holes) sh.holes.push(new THREE.Path(rect(x, y, x + w, y + h).reverse()));
    return sh;
  };
  {
    const r = rng(21), holes = [];
    const tops = [[-BW, 4], [-26, 4], [-26, 7], [-21, 7], [-21, 3], [-12, 3], [-12, 6], [-8, 6]];
    // the cathedral: drum, dome, lantern — as a cut silhouette
    const DX = 9, DY = 9;
    tops.push([DX - 9, DY - 3], [DX - 9, DY + 1], [DX - 7, DY + 1], [DX - 7, DY + 4]);
    for (let a = Math.PI; a >= 0; a -= Math.PI / 24) tops.push([DX + Math.cos(a) * 6.2, DY + 4 + Math.sin(a) * 6.6]);
    tops.push([DX + 7, DY + 4], [DX + 7, DY + 1], [DX + 9, DY + 1], [DX + 9, DY - 3]);
    tops.splice(tops.length - 4 - 25 + 12, 0); // keep order
    tops.push([18, 5], [24, 5], [24, 8], [30, 8], [30, 4], [BW, 4]);
    // lantern on the dome
    const lanternAt = tops.findIndex(([x, y]) => Math.abs(x - DX) < 0.3 && y > DY + 10);
    tops.splice(lanternAt, 1, [DX - 1, DY + 10.6], [DX - 1, DY + 12.4], [DX - 0.15, DY + 12.6], [DX - 0.15, DY + 14], [DX + 0.15, DY + 14], [DX + 0.15, DY + 12.6], [DX + 1, DY + 12.4], [DX + 1, DY + 10.6]);
    for (let i = 0; i < 26; i++) { const x = -BW + 4 + r() * (BW * 2 - 8), y = -8 + r() * 10; if (Math.abs(x - DX) < 10) continue; holes.push([x, y, 0.45, 0.7]); }
    for (let i = 0; i < 5; i++) holes.push([DX - 4.8 + i * 2.3, DY - 1.4, 0.36, 1.0]); // the drum's windows
    sheet(skyline(tops, -40, holes), glowCard('#4a5e92', '#34487a', -8, 34, 1.0), 4, { edge: '#7d8fb8' }).position.y = 10;
    // warm light behind the far sheet so its windows burn through
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(BW * 2, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 4.2, 1.6) })); lp.position.set(0, 2, 3.6); scene.add(lp);
    const lpd = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.0, 0.7) })); lpd.position.set(9, 17.9, 3.7); scene.add(lpd);
  }
  {
    const r = rng(29), holes = [];
    const tops = [[-BW, 1], [-33, 1], [-33, 4.5], [-30, 6.5], [-27, 4.5], [-20, 4.5], [-20, 2], [-8, 2], [-8, 5], [-5, 5], [-5, 2.5], [3, 2.5], [3, 0.5], [14, 0.5], [14, 3.5], [17, 3.5], [17, 1.5], [BW, 1.5]];
    for (let i = 0; i < 40; i++) { const x = -BW + 3 + r() * (BW * 2 - 6), y = -16 + r() * 15; holes.push([x, y, 0.55, 0.85]); }
    sheet(skyline(tops, -40, holes), glowCard('#1d2945', '#000000', -6, 8, 0.0), 6, { edge: '#6a7ca0' }).position.y = 5;
    const lp2 = new THREE.Mesh(new THREE.PlaneGeometry(BW * 2, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.0, 1.2) })); lp2.position.set(0, -6, 5.6); scene.add(lp2);
  }
  // 3: rain — glass beads strung on threads, hung between the layers
  {
    const r = rng(31), thread = new THREE.MeshBasicMaterial({ color: '#5a6a8e', transparent: true, opacity: 0.35 });
    const bead = new THREE.MeshPhysicalMaterial({ color: '#9fb3d8', roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, emissive: '#3a4c78', emissiveIntensity: 0.5, transparent: true, opacity: 0.8 });
    const bg = new THREE.SphereGeometry(0.1, 10, 8);
    const im = new THREE.InstancedMesh(bg, bead, 900); let k = 0; const M4 = new THREE.Matrix4();
    for (let i = 0; i < 46; i++) {
      const x = -BW + 1 + r() * (BW * 2 - 2), z = 5.2 + r() * 4.5;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, BH + 20, 3), thread); t.position.set(x, 10, z); scene.add(t);
      for (let y = -30 + r() * 3; y < 46 && k < 900; y += 2.6 + r() * 3.4) { const s = 0.6 + r() * 0.7; M4.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 2.6, s)); im.setMatrixAt(k++, M4); }
    }
    im.count = k; scene.add(im);
    // tram wires
    const wire = new THREE.MeshBasicMaterial({ color: '#070910' });
    for (const [y0, y1] of [[16, 12], [15, 11]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 90, 4), wire); w.position.set(0, (y0 + y1) / 2, 6.2); w.rotation.z = Math.PI / 2 + Math.atan2(y0 - y1, 90); scene.add(w); }
  }
  // 4: the near block across the street, windows cut clean through
  {
    const r = rng(41), holes = [];
    const tops = [[-BW, 0], [-30, 0], [-30, 2.5], [-27, 4.5], [-24, 2.5], [-16, 2.5], [-16, -0.5], [-2, -0.5], [-2, 1], [12, 1], [12, -1], [26, -1], [26, 2], [BW, 2]];
    for (let y = -24; y < -3; y += 3.0) for (let x = -BW + 2; x < BW - 2; x += 2.4) { if (r() < 0.32) holes.push([x + r() * 0.3, y, 0.8, 1.3]); }
    sheet(skyline(tops, -40, holes), card('#121a20'), 8, { edge: '#6c7a6a' });
    // lamplight behind it: warm, uneven
    const c = canvas(256, 128), g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 40; i++) { const gr = g.createRadialGradient(r() * 256, r() * 128, 0, 0, 0, 0); }
    for (let i = 0; i < 60; i++) { const x = r() * 256, y = r() * 128, rad = 10 + r() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, rad); const warm = r() < 0.8; gr.addColorStop(0, warm ? 'rgba(255,190,90,1)' : 'rgba(200,220,255,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    const lm = new THREE.MeshBasicMaterial({ map: tex(c) }); lm.color.setRGB(3.2, 2.2, 1.2);
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(BW * 2, 28), lm); lp.position.set(0, -13, 7.4); scene.add(lp);
  }

  // ---------------------------------------------------------- 5: the room wall, the window cut in it
  const WZ = 12, WX = 14, WY0 = -6, WY1 = 22;
  {
    // wallpaper: a dark green card with a faint printed stripe
    const c = canvas(256, 256), g = c.getContext('2d');
    g.fillStyle = '#6a8e7c'; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) { g.fillStyle = 'rgba(60,84,62,0.35)'; g.fillRect(x + 4, 0, 3, 256); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x + 18, 0, 8, 256); }
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 10, 1 / 10);
    const wm = card('#ffffff'); wm.map = t;
    const sh = new THREE.Shape(rect(-BW - 10, -50, BW + 10, 60));
    // an arched window, Jugend style
    const hole = new THREE.Path(); hole.moveTo(-WX, WY0); hole.lineTo(WX, WY0); hole.lineTo(WX, WY1); hole.absarc(0, WY1, WX, 0, Math.PI, false); hole.lineTo(-WX, WY0);
    sh.holes.push(hole);
    sheet(sh, wm, WZ, { depth: 0.2, edge: '#c9bea6' });
    // the frame and glazing bars: cream card strips, laid on just in front
    const fm = card('#d9ccad');
    const ring = new THREE.Shape(); ring.moveTo(-WX - 1.4, WY0 - 1.2); ring.lineTo(WX + 1.4, WY0 - 1.2); ring.lineTo(WX + 1.4, WY1); ring.absarc(0, WY1, WX + 1.4, 0, Math.PI, false); ring.lineTo(-WX - 1.4, WY0 - 1.2);
    const inner = new THREE.Path(); inner.moveTo(-WX + 0.6, WY0 + 0.6); inner.lineTo(WX - 0.6, WY0 + 0.6); inner.lineTo(WX - 0.6, WY1); inner.absarc(0, WY1, WX - 0.6, 0, Math.PI, false); inner.lineTo(-WX + 0.6, WY0 + 0.6);
    ring.holes.push(inner);
    sheet(ring, fm, WZ + 0.25, { depth: 0.25, edge: '#f2ead8' });
    const strip = (x0, y0, x1, y1, w) => { const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0); const s = new THREE.Shape(rect(0, -w / 2, L, w / 2)); const m = sheet(s, fm, WZ + 0.1, { depth: 0.18, edge: '#f2ead8' }); m.position.x = x0; m.position.y = y0; m.rotation.z = a; };
    strip(-WX, WY1, WX, WY1, 0.9); strip(0, WY0, 0, WY1, 0.8); strip(-WX, 8, WX, 8, 0.7);
    for (const a of [0.45, 0.95, 1.5708, 2.19, 2.69]) strip(0, WY1, Math.cos(a) * WX, WY1 + Math.sin(a) * WX, 0.6);
  }

  // a paper star lantern hung in the window, the Finnish November way — card, its pattern pricked through
  {
    const SX = -7.5, SYs = 28.5, R = 3.8, r = 1.65, z = WZ + 2.2;
    const star = new THREE.Shape();
    for (let i = 0; i <= 16; i++) { const a = Math.PI / 2 + i * Math.PI / 8, rr = i % 2 ? r : R; const p = [SX + Math.cos(a) * rr, SYs + Math.sin(a) * rr]; i ? star.lineTo(...p) : star.moveTo(...p); }
    for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + i * Math.PI / 4; const h = new THREE.Path(); h.absellipse(SX + Math.cos(a) * 2.15, SYs + Math.sin(a) * 2.15, 0.26, 0.26, 0, Math.PI * 2, true); star.holes.push(h); }
    { const h = new THREE.Path(); h.absarc(SX, SYs, 0.75, 0, Math.PI * 2, true); star.holes.push(h); }
    for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + Math.PI / 8 + i * Math.PI / 4; const h = new THREE.Path(); h.absellipse(SX + Math.cos(a) * 1.25, SYs + Math.sin(a) * 1.25, 0.15, 0.15, 0, Math.PI * 2, true); star.holes.push(h); }
    sheet(star, card('#6a2219'), z, { edge: '#e8a080' });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(2.5, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.6, 0.8) }));
    glow.position.set(SX, SYs, z - 0.25); scene.add(glow);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 14, 4), new THREE.MeshStandardMaterial({ color: '#1a1410' }));
    cord.position.set(SX, SYs + R + 7, z); scene.add(cord);
    const sl = new THREE.PointLight('#ffb060', 40, 0, 2); sl.position.set(SX, SYs - 1, z + 1.5); scene.add(sl);
  }

  // ---------------------------------------------------------- 6: the seat, the lamp, the actors
  const SZ = WZ + 0.4, SY = WY0 - 0.5; // seat top
  {
    const seat = card('#5a2a20', { fibre: 0.004 });
    const sm = new THREE.Mesh(new THREE.BoxGeometry(BW * 2, 3.2, 11), [seat, seat, card('#6a3a2c'), seat, seat, seat]);
    sm.position.set(0, SY - 1.6, SZ + 5.5); sm.castShadow = sm.receiveShadow = true; scene.add(sm);
    // the seat's front: a panel of card with a cut-out pattern
    const front = new THREE.Shape(rect(-BW, -50, BW, SY - 3.2));
    sheet(front, card('#a8603e'), SZ + 11, { edge: '#f0d0b0' });
    // a skirting strip and a radiator's fins cut from the same card
    for (let i = -7; i <= 7; i++) { const f = new THREE.Shape(rect(i * 2.6 - 0.8, -21, i * 2.6 + 0.8, SY - 6)); sheet(f, card('#8a4a30'), SZ + 11.2, { edge: '#f0c8a8' }); }
  }
  const C = {
    jumper: clay('#b8862f'), collar: clay('#9a6c26'), trousers: clay('#30384a'), socks: clay('#8d3a2a'),
    head: clay('#3a2418', { tool: 1.8, thumbCell: 0.9, thumb: 0.04 }), hair: clay('#3a2418', { tool: 1.6 }),
    hat: clay('#2f5c48', { tool: 1.0 }), hatBrim: clay('#1f382c', { thumb: 0.04, tool: 1.4, thumbCell: 1.0 }), pompom: clay('#d9c8a2', { thumb: 0.05, thumbCell: 0.7, lump: 0.08, lumpF: 1.6 }),
    skin: clay('#d39c80'),
    maskDisc: clay('#e2037f', { rough: 0.55, thumb: 0.025, thumbCell: 1.4, mottle: 0.05, speckColor: '#5a0730' }),
    maskInk: clay('#fbf4e6', { rough: 0.55, thumb: 0.012, thumbCell: 0.9 }),
    strap: clay('#1a1614', { thumb: 0.01 }), redLed: new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 0.4, 0.3) }),
    // the bot: translucent, lit from inside — brightest where it faces you
    body: surface({ color: '#7fd6dc', rough: 0.3, lump: 0.02, thumb: 0.02, thumbCell: 1.4, mottle: 0.05, specks: 0.05, wrap: 0.9, wrapTint: '#9ff4ff', glow: '#1c7a86', glowPow: 2.2 }),
    belly: surface({ color: '#c8f4f6', rough: 0.3, thumb: 0.01, glow: '#3aa8b4', glowPow: 1.6, wrap: 0.9 }),
    ear: surface({ color: '#5fbcc6', rough: 0.35, thumb: 0.02, glow: '#145e68', glowPow: 2, wrap: 0.9 }),
    antenna: clay('#2a2826'), bobble: clay('#e86a4a'),
    eye: clay('#0f1214', { rough: 0.2, thumb: 0.004, specks: 0 }), eyeGlint: new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2) }),
    smile: clay('#16313a', { rough: 0.4, thumb: 0.004 }), cheek: clay('#f09aa0'),
    bezel: clay('#3a4a4e', { rough: 0.3 }), led: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 9, 10) }),
  };
  C.body.userData.U.uGlow.value.multiplyScalar(1.0);
  const T = [0.2, 7.0, 7.0], TR = 3.7;
  const kid = buildKid(C, { lump: 0.14, lumpF: 0.32, legPose: 'hang', seatEdge: 9.2, thighY: 1.6, shinLen: 6.0, pitch: 0.4, roll: -0.3, yaw: 0.0, headY: 16.0 });
  kid.position.set(-1.2, SY + 0.2, SZ + 1.4);
  scene.add(kid);
  kid.add(buildArms(C, { lump: 0.12, t: T, tr: TR }));
  const toy = buildToy(C, { r: TR, lean: 0.34, lump: 0.1 });
  toy.position.set(...T); kid.add(toy);

  // the paper lamp: a cut-card stand and a vellum shade lit from inside
  {
    const base = card('#1c1a18');
    const stand = new THREE.Shape([V2(-3.2, 0), V2(3.2, 0), V2(2.2, 1.0), V2(0.35, 1.6), V2(0.35, 13), V2(-0.35, 13), V2(-0.35, 1.6), V2(-2.2, 1.0)]);
    const sm = sheet(stand, base, 0, { edge: '#a89a86' }); sm.position.set(-15.5, SY, SZ + 7);
    const vellum = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.25, 0.6, 0.15) });
    const sh = new THREE.Shape([V2(-6.2, 0), V2(6.2, 0), V2(4.2, 7.6), V2(-4.2, 7.6)]);
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }), vellum); m.position.set(-15.5, SY + 11.5, SZ + 7.05); scene.add(m);
    // its pleats, cut lines that let the light through brighter
    for (let i = -4; i <= 4; i++) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 7.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.1, 0.3) })); pl.position.set(-15.5 + i * 1.15, SY + 11.5 + 3.8, SZ + 7.2); pl.rotation.z = -i * 0.03; scene.add(pl); }
  }

  // ---------------------------------------------------------- 7: the foreground: curtains and a plant, the box's own lip
  {
    // a cut-paper lace border round the window: scalloped outside, punched through
    const archLoop = (d, scal = 0, n = 420) => {
      // walk the window's outline offset by d (left side up, arch over, right side down, along the bottom)
      const pts = [], L1 = WY1 - WY0 + d, A = Math.PI * (WX + d), L = 2 * L1 + A + 2 * (WX + d);
      for (let i = 0; i < n; i++) {
        const sArc = i / n * L; let x, y, nx, ny;
        if (sArc < L1) { x = -WX - d; y = WY0 - d + sArc; nx = -1; ny = 0; }
        else if (sArc < L1 + A) { const a = Math.PI - (sArc - L1) / (WX + d); x = Math.cos(a) * (WX + d); y = WY1 + Math.sin(a) * (WX + d); nx = Math.cos(a); ny = Math.sin(a); }
        else if (sArc < 2 * L1 + A) { x = WX + d; y = WY1 - (sArc - L1 - A); nx = 1; ny = 0; }
        else { x = WX + d - (sArc - 2 * L1 - A); y = WY0 - d; nx = 0; ny = -1; }
        const sc = scal * Math.abs(Math.sin(sArc / 1.9 * Math.PI));
        pts.push(V2(x + nx * sc, y + ny * sc));
      }
      return pts;
    };
    const lace = new THREE.Shape(archLoop(3.6, 0.75).reverse());
    lace.holes.push(new THREE.Path(archLoop(1.0)));
    { const mid = archLoop(2.5, 0, 150); for (let i = 0; i < mid.length; i += 2) { const h = new THREE.Path(); h.absarc(mid[i].x, mid[i].y, 0.32, 0, Math.PI * 2, true); lace.holes.push(h); } }
    sheet(lace, card('#e3d6b8'), WZ + 0.8, { edge: '#fff6e4' });
    // a potted plant on the sill, as a silhouette in the foreground
    const r = rng(61), PX = 15.5, PY = SY + 6.5, leaves = new THREE.Shape([V2(PX - 3.6, PY - 7), V2(PX + 3.6, PY - 7), V2(PX + 3, PY), V2(PX - 3, PY)]);
    sheet(leaves, card('#9a5030'), 20, { edge: '#f0c0a0' });
    for (let i = 0; i < 9; i++) {
      const a = 0.5 + (i / 8) * 2.2 + (r() - 0.5) * 0.2, L = 4 + r() * 5, cx = PX + Math.cos(a) * L * 0.7, cy = PY + Math.sin(a) * L;
      const leaf = new THREE.Shape(); leaf.moveTo(PX, PY); leaf.quadraticCurveTo(cx - Math.sin(a) * 2.0, cy + Math.cos(a) * 0.5, cx + Math.cos(a) * 1.4, cy + Math.sin(a) * 1.4); leaf.quadraticCurveTo(cx + Math.sin(a) * 2.0, cy - Math.cos(a) * 0.5, PX, PY);
      sheet(leaf, card('#4a8a58'), 20.2 + i * 0.05, { edge: '#c8e8b8' });
    }
    // the box's front lip: a black card mat with a softly torn opening
    const lip = new THREE.Shape(rect(-BW - 30, -70, BW + 30, 80));
    const op = []; const r2 = rng(71);
    for (let i = 0; i < 160; i++) { const t = i / 160 * Math.PI * 2; const x = Math.cos(t), y = Math.sin(t); const k = Math.pow(Math.abs(x) ** 7 + Math.abs(y) ** 7, -1 / 7); op.push(V2(x * k * 18.2 + (r2() - 0.5) * 0.22, y * k * 33.2 + 14.4 + (r2() - 0.5) * 0.22)); }
    lip.holes.push(new THREE.Path(op));
    sheet(lip, card('#07090a'), 26, { edge: '#2a2a28' });
  }

  // ---------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight('#4a5a80', '#1a120e', 0.3));
  // a gallery light into the box from above-front: every sheet drops a shadow on the next
  const key = new THREE.SpotLight('#ffe4c4', 26000, 0, 0.3, 0.35, 2);
  key.position.set(-28, 72, 262); key.target.position.set(0, 9, 10);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.radius = 5; key.shadow.bias = -0.0002; key.shadow.normalBias = 0.01; key.shadow.camera.near = 150; key.shadow.camera.far = 340;
  scene.add(key, key.target);
  // the lamp in the room, warm, low and to the left
  const lamp = new THREE.PointLight('#ffb062', 800, 0, 2); lamp.position.set(-15.5, SY + 15, SZ + 8.5); lamp.castShadow = false; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.radius = 4; lamp.shadow.bias = -0.002; lamp.shadow.camera.near = 0.5; lamp.shadow.camera.far = 120; scene.add(lamp);
  // backlight from the window onto the actors' backs
  const back = new THREE.DirectionalLight('#7f9fe8', 1.6); back.position.set(6, 30, -40); back.target.position.set(0, 0, 14); scene.add(back, back.target);
  scene.updateMatrixWorld(true);
  // the bot is the brightest thing in the box
  const ledP = toy.userData.body.localToWorld(toy.userData.ledLocal.clone());
  const led = new THREE.PointLight('#6fefff', 650, 0, 2); led.position.copy(ledP).add(new THREE.Vector3(0, 0.5, 2.6)); scene.add(led);
  led.castShadow = false; led.shadow.mapSize.set(1024, 1024); led.shadow.radius = 5; led.shadow.bias = -0.002; led.shadow.camera.near = 0.5; led.shadow.camera.far = 60;
  {
    const c = canvas(128, 128), g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(120,240,255,0.55)'); gr.addColorStop(0.35, 'rgba(80,200,230,0.18)'); gr.addColorStop(1, 'rgba(60,160,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: tex(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    halo.position.copy(ledP); halo.position.z = WZ + 0.9; scene.add(halo);
  }
  const inside = new THREE.PointLight('#8ff4ff', 25, 0, 2); inside.position.copy(toy.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0, 0.5)); scene.add(inside);

  // ---------------------------------------------------------- camera: straight into the box
  camera.fov = 20; camera.near = 20; camera.far = 600;
  camera.position.set(0, 14.5, 205);
  camera.lookAt(0, 14, 0);
  camera.updateProjectionMatrix();
  const maskP = kid.userData.mask.getWorldPosition(new THREE.Vector3());
  if (q.get('cam') === 'head') { camera.position.lerp(maskP, 0.8); camera.lookAt(maskP); }
  const focus = camera.position.distanceTo(maskP);

  return {
    focus, aperture: 12, maxBlur: 14, radScale: 0.8,
    threshold: 1.0, knee: 0.5, bloomA: 0.4, bloomB: 0.25,
    exposure: 1.0, vignette: 0.3, grain: 0.03, sat: 1.0, contrast: 1.06, lift: [0.0, 0.008, 0.012], gain: [1.02, 1.0, 0.96], toe: 0.06,
  };
});
