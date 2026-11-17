// THE ROUND TRIP (RFH · Anthropic's IPO), 3D v1, 18 Nov. Owner, 17 Nov: "Do 1 and yes and yes" — build it, the disclosure
// line MADE WITH ANTHROPIC'S TOOLS, and every figure attributed to the outlets that reported the filing.
// Device: a CLOSED LOOP in one unbroken shot of a marble run. Each investor is a glass tower; gold runs down a chute
// from it into ANTHROPIC, out through the IPO gate, and up a helix straight back into the same tower. A ticker counts
// the money in against the money owed back. The camera's last frame is its first.
//   s1  the wide: Google and Amazon invested (gold runs down both chutes into the box)
//   s2  the IPO gate: the ticker flips to the price
//   s3  the return helix: the stream past the gate thickens; SUPPLIER joins INVESTOR; the counter rolls to ~$231B
//   s4  the tower: its COMPUTE lights go dark, the gold keeps climbing
//   s5  back to the wide: "Their money comes back"
// The machine kit (new): wood, brass, glass and gold under one warm key. copy.json holds every word and its source.
import { THREE, RoundedBoxGeometry, mergeGeometries, W, H, TAU, DEG, Q, FPS, clamp, lerp, smooth, ease, rng, C3, V, hash2, fbm, hermite3, renderer,
  canvasTex, std, lum, mesh, rbox, glowTex, glow, shadowed, castAll, uvOf, normalTex, canvasOf, toScreen, shoot, out, g2d } from '../kit/night.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as CAP from '../../pipeline/text/captions.js';

const LANG = Q.get('lang') || 'en', MAG = '#F0027F', AMBER = '#f2b83a';
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 4.6], ['s3', 8.6], ['s4', 13.2], ['s5', 16.6], ['end', 21.0]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { pour: T.s1 + 0.35, invested: popT('invested'), flip: T.s2 + 0.25, price: popT('ipo'), multiply: T.s3 + 0.15, supplier: popT('computing'),
  dark: T.s4 + 0.3, unused: popT('unused'), back: popT('back') };

// ------------------------------------------------------------------ the room: a walnut bench, a backdrop, one warm key
const S = new THREE.Scene(), FOGC = C3('#0b1416'); S.fog = new THREE.Fog(FOGC, 0.006, 9.0004); S.background = FOGC;
S.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; S.environmentIntensity = 0.2;
S.add(new THREE.HemisphereLight('#6a8a92', '#140d08', 0.55));
const key = new THREE.SpotLight('#ffd9a8', 520, 60, 0.62, 0.55, 1.6); key.position.set(-7, 13, 10); key.target.position.set(0, 2.6, 0); S.add(key, key.target);
shadowed(key, 2048, 4, 40, { bias: -0.0004, normalBias: 0.03 });
const rim = new THREE.SpotLight('#7fd8e6', 520, 50, 0.7, 0.7, 1.6); rim.position.set(8, 9, -9); rim.target.position.set(0, 3, 0); S.add(rim, rim.target);
const fill = new THREE.PointLight('#ffb070', 30, 16, 2); fill.position.set(0, 1.2, 6.5); S.add(fill);
{ // the bench: walnut planks with grain in their normals
  const grain = canvasOf(512, 512, (g) => { const im = g.createImageData(512, 512); for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const v = 128 + 60 * Math.sin(y * 0.09 + fbm(x / 90, y / 18, 3) * 9) + (hash2(x, y) - 0.5) * 30 + ((x % 128) < 2 ? -80 : 0), i = (y * 512 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = clamp(v, 0, 255); im.data[i + 3] = 255; } g.putImageData(im, 0, 0); });
  const col = canvasTex(512, 512, (g) => { const im = g.createImageData(512, 512), d = grain.getContext('2d').getImageData(0, 0, 512, 512).data; for (let i = 0; i < 512 * 512; i++) { const k = d[i * 4] / 255; im.data.set([lerp(52, 112, k), lerp(30, 66, k), lerp(18, 38, k), 255], i * 4); } g.putImageData(im, 0, 0); });
  col.wrapS = col.wrapT = THREE.RepeatWrapping; col.repeat.set(4, 4);
  const m = mesh(new THREE.PlaneGeometry(40, 40), std('#ffffff', { map: col, normalMap: normalTex(grain, 2, [4, 4]), normalScale: new THREE.Vector2(0.5, 0.5), roughness: 0.55 }), { rot: [-Math.PI / 2, 0, 0], parent: S }); m.userData.noCast = true; }
{ // a seamless backdrop sweeping up behind the machine
  const sh = new THREE.Shape(); sh.moveTo(-30, 0); sh.lineTo(30, 0); sh.lineTo(30, 30); sh.lineTo(-30, 30);
  const g = new THREE.CylinderGeometry(22, 22, 30, 64, 1, true, Math.PI * 0.62, Math.PI * 0.76); g.translate(0, 15, 3);
  const tx = canvasTex(64, 512, (c) => { const gr = c.createLinearGradient(0, 512, 0, 0); gr.addColorStop(0, '#1c2b2c'); gr.addColorStop(0.35, '#10201f'); gr.addColorStop(1, '#03080a'); c.fillStyle = gr; c.fillRect(0, 0, 64, 512); });
  mesh(g, new THREE.MeshBasicMaterial({ map: tx, side: THREE.BackSide, fog: false }), { parent: S }); }

// ------------------------------------------------------------------ materials and labels
const brass = std('#b08a3c', { metalness: 0.85, roughness: 0.35, envMapIntensity: 0.7 }), darkBrass = std('#6e5524', { metalness: 0.85, roughness: 0.4 }), wood = std('#7a4d2a', { roughness: 0.6 });
const glass = new THREE.MeshStandardMaterial({ color: C3('#bfdde4'), roughness: 0.06, metalness: 0.0, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.6 });
const gold = std('#ffc23a', { metalness: 1.0, roughness: 0.18, emissive: C3('#3a2200'), envMapIntensity: 1.6 });
const plate = (text, w, h, { ink = '#1a1208', bg = '#e8dcc0', size = 0.62, font = 'Anton-400' } = {}) => {
  const c = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.strokeStyle = ink; g.lineWidth = 8; g.strokeRect(10, 10, cw - 20, ch - 20); g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; let fs = ch * size; g.font = `${fs}px "${font}"`; while (g.measureText(text).width > cw - 60) { fs -= 2; g.font = `${fs}px "${font}"`; } g.fillText(text, cw / 2, ch / 2 + fs * 0.04); });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), std('#ffffff', { map: c, roughness: 0.5, metalness: 0.1 })); };

// ------------------------------------------------------------------ the towers (investor and supplier), the box, the gate
const TOWER_H = 6.0, TOWER_R = 0.56, TX = 1.95, SIDES = [{ s: -1, name: UI.google }, { s: 1, name: UI.amazon }];
const TW = SIDES.map(({ s, name }) => {
  const G = new THREE.Group(); S.add(G); G.position.set(TX * s, 0, 0);
  mesh(new THREE.CylinderGeometry(TOWER_R, TOWER_R, TOWER_H, 48, 1, true), glass, { pos: [0, TOWER_H / 2 + 0.25, 0], parent: G }).userData.noShadow = true;
  for (const [y, r, h] of [[0.12, 0.68, 0.25], [TOWER_H + 0.33, 0.66, 0.16], [TOWER_H * 0.5, 0.6, 0.04], [TOWER_H * 0.25, 0.6, 0.04], [TOWER_H * 0.75, 0.6, 0.04]]) mesh(new THREE.CylinderGeometry(r, r, h, 48), brass, { pos: [0, y, 0], parent: G });
  mesh(new THREE.ConeGeometry(0.4, 0.4, 32, 1, true), brass, { pos: [0, TOWER_H + 0.62, 0], rot: [Math.PI, 0, 0], parent: G });     // the hopper on top
  mesh(new THREE.BoxGeometry(1.15, 0.36, 0.22), darkBrass, { pos: [0, 0.18, 1.12], parent: G }); const nm = plate(name, 1.05, 0.3); nm.position.set(0, 0.19, 1.235); G.add(nm);   // the name on a plinth in front, outside the helix
  const inv = plate(UI.investor, 0.8, 0.2, { bg: '#1a1208', ink: '#f2b83a', size: 0.58, font: 'RobotoCondensed' }); inv.position.set(0, 0.98, TOWER_R + 0.07); inv.scale.setScalar(0.001); G.add(inv);
  const sup = plate(UI.supplier, 0.8, 0.2, { bg: '#1a1208', ink: '#7fd8e6', size: 0.58, font: 'RobotoCondensed' }); sup.position.set(0, 1.24, TOWER_R + 0.07); sup.scale.setScalar(0.001); G.add(sup);
  // inside: a server rack (COMPUTE) with lights, and the coins stacking up as the money comes back
  mesh(new THREE.BoxGeometry(0.42, TOWER_H * 0.62, 0.3), std('#141a1d', { roughness: 0.5, metalness: 0.4 }), { pos: [0, TOWER_H * 0.56 + 0.25, -0.1], parent: G });
  const LED = [], R = rng(7 + s * 3); for (let i = 0; i < 46; i++) { const m = mesh(new THREE.BoxGeometry(0.035, 0.02, 0.01), lum(0, 0, 0), { pos: [-0.16 + (i % 6) * 0.064, TOWER_H * 0.3 + 0.4 + Math.floor(i / 6) * 0.42, 0.055], parent: G }); m.userData.ph = R() * 10; m.userData.c = R() < 0.7 ? [0.2, 2.2, 1.0] : [2.4, 1.5, 0.3]; LED.push(m); }
  const cp = plate(UI.compute, 0.4, 0.11, { bg: '#0b0f11', ink: '#7fd8e6', size: 0.6, font: 'RobotoCondensed' }); cp.position.set(0, TOWER_H * 0.25 + 0.55, 0.06); G.add(cp);
  const coinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.03, 24), STACK = new THREE.InstancedMesh(coinGeo, gold, 420), D = new THREE.Object3D(), Rc = rng(31 + s);
  for (let i = 0; i < 420; i++) { const col = i % 14, row = Math.floor(i / 14), a = col / 14 * TAU + row * 0.31; D.position.set(Math.cos(a) * 0.4 + (Rc() - 0.5) * 0.03, 0.3 + row * 0.031, Math.sin(a) * 0.4 + (Rc() - 0.5) * 0.04); D.rotation.set((Rc() - 0.5) * 0.12, Rc() * 3, (Rc() - 0.5) * 0.12); D.updateMatrix(); STACK.setMatrixAt(i, D.matrix); }
  STACK.count = 0; G.add(STACK);
  const lamp = new THREE.PointLight('#7fd8e6', 0, 3.2, 2); lamp.position.set(0, TOWER_H * 0.55, 0.4); G.add(lamp);
  return { G, s, inv, sup, LED, STACK, lamp };
});
{ // ANTHROPIC: a cream box with its name in plain type and a slot in its front
  const G = new THREE.Group(); S.add(G);
  mesh(rbox(1.6, 1.8, 1.3, 0.1), std('#e9dfc9', { roughness: 0.62 }), { pos: [0, 0.9, 0], parent: G });
  const nm = plate(UI.anthropic, 1.4, 0.32, { bg: '#e9dfc9', ink: '#191410' }); nm.position.set(0, 1.25, 0.662); G.add(nm);
  mesh(new THREE.BoxGeometry(0.7, 0.28, 0.02), std('#140f0b'), { pos: [0, 0.32, 0.655], parent: G });
  mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), darkBrass, { pos: [0, 1.82, 0], parent: G }); }
// the IPO gate: a brass arch over both tracks, with a split-flap sign on top
const GATE_Z = 1.75, flap = canvasOf(512, 160, () => {}); let flapText = null;
const flapTex = new THREE.CanvasTexture(flap); flapTex.colorSpace = THREE.SRGBColorSpace; flapTex.anisotropy = 8;
function drawFlap(text, k = 1) { if (text === flapText && k >= 1) return; flapText = k >= 1 ? text : null; const g = flap.getContext('2d'); g.fillStyle = '#0d0c0a'; g.fillRect(0, 0, 512, 160);
  const cells = text.length, cw = 492 / cells; g.font = '96px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < cells; i++) { const x = 10 + i * cw; g.fillStyle = '#211e1a'; g.fillRect(x + 2, 14, cw - 4, 132); g.fillStyle = '#000'; g.fillRect(x + 2, 79, cw - 4, 2);
    const kk = clamp(k * cells - i * 0.6); const ch = kk >= 1 ? text[i] : ' ABCDEFGHIJ0123456789$'[Math.floor(hash2(i, Math.floor(k * 40)) * 22)]; g.fillStyle = kk >= 1 ? '#f2b83a' : '#c9b48a'; g.fillText(ch, x + cw / 2, 84); }
  flapTex.needsUpdate = true; }
{ const G = new THREE.Group(); S.add(G); G.position.set(0, 0, GATE_Z);
  const arch = new THREE.TorusGeometry(0.6, 0.045, 12, 40, Math.PI); mesh(arch, brass, { pos: [0, 0.15, 0], parent: G });
  for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.24, 16), brass, { pos: [sx * 0.6, 0.1, 0], parent: G });
  mesh(new THREE.BoxGeometry(1.15, 0.38, 0.1), darkBrass, { pos: [0, 1.0, 0], parent: G });
  mesh(new THREE.PlaneGeometry(1.07, 0.32), new THREE.MeshBasicMaterial({ map: flapTex, color: new THREE.Color(1.1, 1.1, 1.1) }), { pos: [0, 1.0, 0.055], parent: G });
  const ip = plate(UI.ipo, 0.38, 0.15, { bg: '#1a1208', ink: '#f2b83a', size: 0.7 }); ip.position.set(0, 1.27, 0.03); G.add(ip);
  for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 8), brass, { pos: [sx * 0.45, 0.55, 0], parent: G }); }
drawFlap('ANT ------');

// ------------------------------------------------------------------ the run: one closed curve per tower (down the chute, through the box, out the gate, up the helix)
const CH_TOP = TOWER_H + 0.95;
function loopCurve(s) { const X = TX * s, P = [];
  P.push(V([X, CH_TOP, 0]), V([X - s * 0.45, CH_TOP - 0.2, 0.5]));                                      // out of the hopper
  const zig = [[0.5, 5.9, 0.95], [0.2, 5.15, 0.42], [0.55, 4.4, 0.95], [0.22, 3.6, 0.45], [0.5, 2.85, 0.9], [0.25, 2.25, 0.5]];
  for (const [k, y, z] of zig) P.push(V([lerp(X, 0, k + 0.1), y, z]));
  P.push(V([s * 0.22, 1.9, 0.15]), V([s * 0.17, 1.1, 0.1]), V([s * 0.15, 0.32, 0.5]));   // into the box, down through it
  P.push(V([s * 0.15, 0.27, 1.15]), V([s * 0.15, 0.26, GATE_Z]), V([s * 0.4, 0.26, 2.4]), V([s * 1.25, 0.3, 2.55]), V([X + s * 0.15, 0.36, 1.75]));
  const r = 0.86, turns = 2.25, n = 46;                                                                      // the helix, outside the glass
  for (let i = 0; i <= n; i++) { const u = i / n, a = u * turns * TAU; P.push(V([X + s * r * Math.sin(a), lerp(0.6, TOWER_H + 0.35, u), r * Math.cos(a)])); }
  P.push(V([X + s * 0.6, CH_TOP + 0.08, -0.25]));
  return new THREE.CatmullRomCurve3(P, true, 'centripetal'); }
const CURVES = SIDES.map(({ s }) => loopCurve(s));
const LEN = CURVES.map((c) => c.getLength());
// where each stretch begins and ends along u: the box (in), the gate, the tower's top (back)
const nearestU = (c, p) => { let best = 0, bd = 1e9; for (let i = 0; i <= 2000; i++) { const u = i / 2000, d = c.getPointAt(u).distanceToSquared(p); if (d < bd) { bd = d; best = u; } } return best; };
const U = CURVES.map((c, i) => { const s = SIDES[i].s; return { box: nearestU(c, V([s * 0.22, 1.9, 0.15])), gate: nearestU(c, V([s * 0.16, 0.33, GATE_Z])), helix: nearestU(c, V([TX * s, 0.6, 0.86])) }; });
// the track: a clear tube with brass bands, and wooden posts down to the bench wherever it runs in the air
for (const c of CURVES) {
  const tube = mesh(new THREE.TubeGeometry(c, 900, 0.1, 14, true), glass, { parent: S }); tube.userData.noShadow = true; tube.renderOrder = 2;
  const bands = [], posts = [];
  for (let i = 0; i < 70; i++) { const u = i / 70, p = c.getPointAt(u), t = c.getTangentAt(u); bands.push(new THREE.TorusGeometry(0.104, 0.012, 6, 18).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V([0, 0, 1]), t)).translate(p.x, p.y, p.z));
    if (i % 7 === 0 && p.y > 0.7 && Math.hypot(p.x, p.z) > 1.0) posts.push(new THREE.CylinderGeometry(0.016, 0.022, p.y - 0.13, 6).translate(p.x, (p.y - 0.13) / 2, p.z)); }
  mesh(mergeGeometries(bands), brass, { parent: S }); if (posts.length) mesh(mergeGeometries(posts), wood, { parent: S }); }
castAll(S);

// ------------------------------------------------------------------ the gold: a steady stream on each loop, and the stream the gate multiplies after s3
const BALL_R = 0.07, SPEED = 2.4, BASE_N = 22, EXTRA_N = 64;
const ballGeo = new THREE.SphereGeometry(BALL_R, 18, 12);
const BALLS = CURVES.map(() => { const m = new THREE.InstancedMesh(ballGeo, gold, BASE_N + EXTRA_N); m.castShadow = true; m.frustumCulled = false; S.add(m); return m; });
const _D = new THREE.Object3D();
function ballsAt(t) {
  CURVES.forEach((c, k) => { const L = LEN[k], m = BALLS[k], u0 = (((t * SPEED / L) % 1) + 1) % 1; let n = 0;   // (a sub-exposure before 0 s is negative time)
    for (let i = 0; i < BASE_N; i++) { const u = (u0 + i / BASE_N + k * 0.013) % 1; _D.position.copy(c.getPointAt(u)); _D.rotation.set(u * 400, u * 300, 0); _D.scale.setScalar(1); _D.updateMatrix(); m.setMatrixAt(n++, _D.matrix); }
    // the extra stream is born at the gate: a ball at u (past the gate) passed it (u-gate)·L/SPEED seconds ago
    const ug = U[k].gate;
    for (let i = 0; i < EXTRA_N; i++) { const u = (u0 + (i + 0.5) / EXTRA_N + 0.004) % 1; if (u < ug) continue; const past = u - ug;   // only from the gate round to the hopper
      const bornAt = t - past * L / SPEED; if (bornAt < EV.multiply) continue; const grow = clamp((t - bornAt) / 0.25);
      _D.position.copy(c.getPointAt(u)); _D.rotation.set(u * 400, u * 300, 0); _D.scale.setScalar(grow); _D.updateMatrix(); m.setMatrixAt(n++, _D.matrix); }
    m.count = n; m.instanceMatrix.needsUpdate = true; }); }

// ------------------------------------------------------------------ the camera: one shot that ends where it began
const CAMP = hermite3([[0, [0, 3.7, 17.0]], [2.6, [-1.1, 5.0, 10.5]], [T.s2 + 0.5, [0.3, 1.5, 6.4]], [T.s3 + 0.8, [1.9, 1.5, 5.4]], [T.s3 + 3.2, [2.7, 4.6, 6.8]],
  [T.s4 + 1.2, [-1.0, 4.4, 6.9]], [T.s5 + 1.0, [-0.3, 3.8, 13.8]], [DUR, [0, 3.7, 17.0]]]);
const CAMT = hermite3([[0, [0, 3.15, 0]], [2.6, [-1.3, 4.1, 0.4]], [T.s2 + 0.5, [0, 0.62, 1.75]], [T.s3 + 0.8, [1.95, 1.2, 0.8]], [T.s3 + 3.2, [1.95, 3.9, 0.2]],
  [T.s4 + 1.2, [-1.95, 3.5, 0]], [T.s5 + 1.0, [0, 3.15, 0]], [DUR, [0, 3.15, 0]]]);
const cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 400), _t = new THREE.Vector3();
function poseCam(t) { CAMP(t, cam.position); CAMT(t, _t); const br = 0.02 * Math.sin(t * 0.9); cam.position.y += br; cam.lookAt(_t); cam.updateMatrixWorld(true); }

// ------------------------------------------------------------------ the state of the machine at t
const pop = (t, at) => { const k = t - at; return k <= 0 ? 0.001 : ease.back(k / 0.35); };
function stateAt(t) {
  ballsAt(t); poseCam(t);
  const dark = smooth((t - EV.dark) / 0.35) * (1 - smooth((t - (EV.back - 0.15)) / 0.4));       // COMPUTE goes dark through beat 4, back on for the end
  TW.forEach((w, k) => { w.inv.scale.setScalar(pop(t, EV.invested + k * 0.12)); w.sup.scale.setScalar(pop(t, EV.supplier + k * 0.12));
    w.LED.forEach((m) => { const on = (Math.sin(t * 7 + m.userData.ph * 3) > -0.2 ? 1 : 0.15) * (1 - dark); const [r, g, b] = m.userData.c; m.material.color.setRGB(r * on, g * on, b * on); });
    w.lamp.intensity = 6 * (1 - dark);
    w.STACK.count = Math.round(420 * clamp(0.03 + 0.97 * smooth((t - T.s3) / (DUR - T.s3 - 1.2)))); });
  // the split-flap sign: dashes, then it flips to the price on beat 2
  const fk = (t - EV.flip) / 0.7; drawFlap('ANT ' + UI.price, fk <= 0 ? 0 : fk); if (fk <= 0) drawFlap('ANT ------');
}

// ------------------------------------------------------------------ the frame
const tag = (g, text, x, y, { size = 30, col = 'rgba(236,242,255,.92)', align = 'center', bg = 'rgba(8,10,12,.72)', a = 1 } = {}) => { if (a <= 0.01) return; g.save(); g.globalAlpha = a; g.font = `700 ${size}px RobotoCondensed`; g.textAlign = align; g.textBaseline = 'middle';
  if (bg) { const w = g.measureText(text).width + 36, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w + 18 : x - 18; g.fillStyle = bg; g.beginPath(); g.roundRect(x0, y - size * 0.85, w, size * 1.7, 8); g.fill(); }
  g.fillStyle = col; g.fillText(text, x, y); g.restore(); };
const TAGS = [['tag1', T.s1 + 1.2, T.s2 - 0.1, 1560], ['tag2', T.s2 + 0.9, T.s3 - 0.1, 1560], ['tag3', T.s3 + 1.4, T.s4 - 0.1, 1560], ['tag4', T.s4 + 1.4, T.s5 - 0.1, 1560], ['tag5', T.s5 + 1.6, DUR - 0.2, 1560]];
const num = (k, to, dec) => (to * k).toFixed(dec);
function counters(g, t) {   // the ticker: money in against money owed back
  const kIn = smooth((t - EV.pour) / (EV.invested + 0.6 - EV.pour)), kBack = smooth((t - EV.multiply) / (EV.supplier + 0.9 - EV.multiply)), a = clamp((t - 0.4) / 0.4);
  if (a <= 0) return; const y = 1690, x0 = 150, x1 = 930; g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(8,10,12,.78)'; g.beginPath(); g.roundRect(x0, y - 62, x1 - x0, 124, 16); g.fill(); g.strokeStyle = 'rgba(242,184,58,.4)'; g.lineWidth = 2; g.stroke();
  g.beginPath(); g.moveTo(540, y - 46); g.lineTo(540, y + 46); g.stroke(); g.textBaseline = 'middle'; g.textAlign = 'center';
  g.font = '700 26px RobotoCondensed'; g.fillStyle = '#c9c2b2'; g.fillText(UI.inLabel, 345, y - 30); g.fillText(UI.backLabel, 735, y - 30);
  g.font = '64px "Anton-400"'; g.fillStyle = '#f2ecdc'; g.fillText(kIn >= 1 ? UI.inValue : '≥ $' + num(kIn, 26.3, 1) + 'B', 345, y + 18);
  const big = kBack > 0 ? 1 + 0.12 * Math.exp(-Math.max(0, t - EV.supplier - 0.9) * 5) * (kBack >= 1 ? 1 : 0) : 1;
  g.save(); g.translate(735, y + 18); g.scale(big, big); g.fillStyle = kBack > 0 ? AMBER : '#6d665a'; g.fillText(kBack <= 0 ? '—' : kBack >= 1 ? UI.backValue : '~ $' + num(kBack, 231, 0) + 'B', 0, 0); g.restore();
  g.restore(); }
let BUSY = null;
function frame(t, captions = true, kForce = 0) {
  const K = kForce || Number(Q.get('subs') || 0) || 3, SH = 0.5 / FPS;
  stateAt(t);
  shoot(S, cam, { K, t, seed: Math.floor(t * 24), grade: { exposure: 1.0, bloomA: 0.3, bloomB: 0.24, threshold: 1.1, vignette: 0.55, streak: 0.06, streakThreshold: 6, lift: [0.006, 0.006, 0.01], gain: [1.03, 1.0, 0.96], sat: 1.04, contrast: 1.08 },
    update(j) { const ts = t + ((j + 0.5) / K - 0.5) * SH; ballsAt(ts); poseCam(ts); } });
  const g = g2d; g.setTransform(1, 0, 0, 1, 0, 0);
  CAP.bug(g);
  tag(g, UI.disclosure, W / 2, 1790, { size: 28, col: '#ffffff', bg: 'rgba(240,2,127,.86)', a: clamp(t / 0.1) * clamp((2.9 - t) / 0.2) });
  for (const [k, a0, a1, y] of TAGS) tag(g, UI[k], W / 2, y + 230, { size: 26, a: clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3) });
  counters(g, t);
  if (captions) CAP.draw(g, P, t, { busy: BUSY || {} });
  return out;
}
frame(1.0, false, 1);
if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false, 1), 3);
const cueNames = ['pour', 'invested', 'flip', 'price', 'multiply', 'supplier', 'dark', 'unused', 'back'];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, cueNames, speed: SPEED, len: LEN, uBox: U.map((u) => u.box), uGate: U.map((u) => u.gate), uHelix: U.map((u) => u.helix), ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }), look: 'machine kit (3D marble run)' },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
