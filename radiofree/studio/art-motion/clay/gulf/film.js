// STABLE (RFH, Helsinki · the drone war in the Gulf of Finland), v1 stills, 21 Nov. Owner, Sat 21 Nov: "Look into the Russian
// boat being attacked by drones next to helsinki", then "Make the feeling a bit more ominous, with visuals and sounds. This is
// a war piece". See plan/films/50-stable.md.
// DEVICE: two places cut against each other — the NIGHT SEA off the coast (sleet, swell, a flash behind Gogland; later a ship
// burning on the horizon) and a Defence Forces PLOTTING ROOM (the cold-war look first built for Sleep Tight: black and navy, a
// phosphor-green radar map of the gulf with a sweep, red markers, a hatched restricted zone, a teleprinter typing the official
// lines). The lamp flickers on a distant thud and goes OUT on the last word.
// Five beats, one thing happening in each:
//   1 · SEA     night, sleet, the swell; a flash under the cloud behind Suursaari (Gogland) on "40 km"                     "hit"
//   2 · ROOM    the table: the first red marker at Gogland pulses; the teleprinter types NO IMMEDIATE THREAT     "threat"
//   3 · SEA     a ship burning low on the horizon, smoke leaning in the wind                                    "fire"
//   4 · ROOM    a red beacon turns; the hatched restricted zone floods in on "Again"; the second marker          "closed"
//   5 · ROOM    low across the table: the teleprinter types STABLE; a thud, the lamp flickers, and goes out        "stable"
// Map: Natural Earth 10m (public domain), see GEO-NOTICE.md. No people, no flags, no weapons. 1080×1920, 30 fps.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Post } from '../welcome/lib/post.js';
import * as CAP from '../../pipeline/text/captions.js';

const W = 1080, H = 1920, TAU = Math.PI * 2, FPS = 30, DEG = Math.PI / 180;
const Q = new URLSearchParams(location.search), LANG = Q.get('lang') || 'en';
const FONT_DIR = Q.get('fonts') || '../../am/' + encodeURIComponent('代码工程') + '/lib/fonts/';
for (const [fam, file] of [['Inter', 'Inter-var.woff'], ['Anton-400', 'Anton-400.woff'], ['RobotoCondensed', 'RobotoCondensed-var.woff']]) {
  const f = new FontFace(fam, `url(${FONT_DIR}${file})`, fam === 'Inter' || fam === 'RobotoCondensed' ? { weight: '100 900' } : {}); document.fonts.add(await f.load()); }
const TYPE = '"Courier 10 Pitch", "Courier New", monospace';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const ease = { io: (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }, out: (k) => 1 - Math.pow(1 - clamp(k), 3) };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
const C3 = (h) => new THREE.Color(h);

// ------------------------------------------------------------------ renderer, post
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
document.body.appendChild(renderer.domElement); renderer.domElement.style.width = '100%';
const ENV = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const post = new Post(renderer, W, H);
const out = document.createElement('canvas'); out.width = W; out.height = H; const g2d = out.getContext('2d');

// ------------------------------------------------------------------ copy and timing
await CAP.loadFonts(FONT_DIR);
const COPY = await CAP.loadCopy('copy.json');
const BEATS = [['s1', 0], ['s2', 5.0], ['s3', 10.0], ['s4', 14.6], ['s5', 19.6], ['end', 25.0]];
const P = CAP.plan(COPY, LANG, BEATS, { snap: 0.25 }), T = P.T, DUR = T.end, UI = P.ui;
const GEO = await (await fetch('geo.json')).json();
const popT = (id) => { const c = P.captions.find((c) => c.id === id); return (c.words.find((w) => w.pop) || c.words[0]).t; };
const EV = { flash: popT('hit'), mark1: T.s2 + 0.3, tty1: T.s2 + 0.7, fire: T.s3 + 0.05, beacon: T.s4 + 0.1, zone: popT('closed'), mark2: T.s4 + 0.6,
  tty2: T.s5 + 0.5, thud: popT('stable') - 0.35, out: popT('stable') + 1.1 };
EV.tty1End = EV.tty1 + (UI.tty1.length + 6) * 0.045; EV.tty2End = EV.tty2 + (UI.tty2.length + 6) * 0.05;
for (let i = 0, t = T.s2 + 0.2; t < T.s3 - 0.1; i++, t += 1.6) EV['ping' + i] = +t.toFixed(3);
const KICKS = [[EV.flash, 0.6], [EV.thud, 1.2]];
const TAGS = [['tag1', T.s1 + 1.6, T.s2 - 0.1], ['tag2', EV.tty1End + 0.2, T.s3 - 0.1], ['tag3', T.s3 + 1.2, T.s4 - 0.1], ['tag4', EV.zone + 0.3, T.s5 - 0.1], ['tag5', EV.tty2End + 0.2, EV.out]];
for (const [k, a0] of TAGS) EV['on_' + k] = +a0.toFixed(3);
function kickAt(t) { let k = 0; for (const [t0, a] of KICKS) { const dt = t - t0; if (dt >= 0 && dt < 0.5) k += a * Math.exp(-dt * 14) * Math.cos(dt * 40); } return k; }

// ------------------------------------------------------------------ helpers
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.userData.canvas = c; return t; };
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
const mesh = (geo, mat, { pos = [0, 0, 0], rot = [0, 0, 0], parent, cast = true, recv = true } = {}) => {
  const m = new THREE.Mesh(geo, mat); m.position.set(...pos); m.rotation.set(...rot); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; };
const rbox = (w, h, d, r = 0.25, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));
function rings(g, list, proj, how) { for (const r of list) { g.beginPath(); r.forEach((p, i) => { const [x, y] = proj(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); if (how === 'fill') { g.closePath(); g.fill(); } else g.stroke(); } }
const glowTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
const flameTex = canvasTex(128, 256, (g) => { const gr = g.createRadialGradient(64, 170, 0, 64, 170, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.save(); g.scale(1, 2.0); g.translate(0, -85); g.fillStyle = gr; g.fillRect(0, 0, 128, 256); g.restore(); });
const smokeTex = canvasTex(256, 256, (g) => { const R = rng(5); for (let i = 0; i < 40; i++) { const x = 128 + (R() - 0.5) * 120, y = 128 + (R() - 0.5) * 120, r = 30 + R() * 50;
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } });

// ================================================================== 1 · THE NIGHT SEA
const SEA = new THREE.Scene(); const FOGC = C3('#070b12'); SEA.background = FOGC; SEA.fog = new THREE.FogExp2(FOGC, 0.0015);
SEA.environment = ENV; SEA.environmentIntensity = 0.05;
const skyTex = canvasTex(2048, 1024, (g, w, h) => { const R = rng(17);
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#020307'); gr.addColorStop(0.55, '#070b14'); gr.addColorStop(0.8, '#2b3548'); gr.addColorStop(1, '#1d2533'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { const y = h * (0.25 + R() * 0.5), x = R() * w, rw = 200 + R() * 700, rh = 18 + R() * 50; g.fillStyle = `rgba(${R() < 0.5 ? '20,26,38' : '4,6,10'},${0.25 + R() * 0.4})`; g.beginPath(); g.ellipse(x, y, rw, rh, 0, 0, TAU); g.fill(); } });
mesh(new THREE.PlaneGeometry(2600, 1300), new THREE.MeshBasicMaterial({ map: skyTex, fog: false }), { pos: [0, 520, -900], parent: SEA, cast: false, recv: false });
// the swell: a CPU-displaced plane, a few long waves and a short chop; dark, a little metallic so the flash and the fire lay a road on it
const WN = 150, WS = 900, waterGeo = new THREE.PlaneGeometry(WS, WS, WN, WN); waterGeo.rotateX(-Math.PI / 2);
const W0 = Float32Array.from(waterGeo.attributes.position.array);
const water = mesh(waterGeo, std('#05080d', { roughness: 0.55, metalness: 0.3, envMapIntensity: 0.25 }), { pos: [0, 0, -300], parent: SEA, cast: false });
const WAVES = [[0.021, 0.9, 1.6, 0.35], [0.034, -0.4, 1.1, 0.55], [0.07, 0.3, 0.42, 1.0], [0.13, 1.7, 0.18, 1.6], [0.21, -1.1, 0.08, 2.3]];
function swell(x, z, t) { let y = 0; for (const [k, a, amp, sp] of WAVES) y += Math.sin((x * Math.cos(a) + z * Math.sin(a)) * k + t * sp) * amp; return y; }
let waterT = -1;
function waterAt(t) { if (t === waterT) return; waterT = t; const p = waterGeo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) p[i + 1] = swell(W0[i], W0[i + 2] - 300, t); waterGeo.attributes.position.needsUpdate = true; waterGeo.computeVertexNormals(); }
// the far shore: Gogland, a low dark hump on the horizon, a few Russian lights; and a darker headland on the left
const ISL = new THREE.Group(); SEA.add(ISL); ISL.position.set(40, -2, -620);
{ const hump = new THREE.SphereGeometry(1, 48, 16, 0, TAU, 0, Math.PI / 2); hump.scale(70, 16, 18);
  mesh(hump, new THREE.MeshBasicMaterial({ color: '#03050a' }), { parent: ISL, cast: false, recv: false });
  const hump2 = new THREE.SphereGeometry(1, 32, 12, 0, TAU, 0, Math.PI / 2); hump2.scale(40, 9, 12); mesh(hump2, new THREE.MeshBasicMaterial({ color: '#03050a' }), { pos: [-62, 0, 4], parent: ISL, cast: false, recv: false });
  for (const [x, y] of [[-20, 6], [8, 9], [30, 5]]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(1.6, 1.1, 0.6), depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.position.set(x, y, 2); s.scale.set(4, 4, 1); ISL.add(s); } }
// the flash: a light under the cloud behind the island, a bloom sprite, and the cloud lit from below
const FL = { light: new THREE.PointLight('#ffb070', 0, 2000, 1.2), glow: new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C3('#ffb070'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })) };
FL.light.position.set(60, 30, -660); FL.glow.position.set(60, 22, -680); FL.glow.scale.set(170, 70, 1); SEA.add(FL.light, FL.glow);
// the burning ship: a low hull, a superstructure, fire, smoke leaning downwind; far, but closer than the island
const SHIP = new THREE.Group(); SEA.add(SHIP); SHIP.position.set(-46, 0, -380); SHIP.rotation.y = 0.25;
{ const k = new THREE.MeshBasicMaterial({ color: '#020305' });
  mesh(new THREE.BoxGeometry(46, 5, 8), k, { pos: [0, 2, 0], parent: SHIP, cast: false, recv: false });
  mesh(new THREE.BoxGeometry(8, 8, 7), k, { pos: [-15, 8, 0], parent: SHIP, cast: false, recv: false });
  mesh(new THREE.BoxGeometry(2, 9, 2), k, { pos: [-15, 15, 0], parent: SHIP, cast: false, recv: false });
  for (const x of [-4, 4, 12]) mesh(new THREE.BoxGeometry(1, 10, 1), k, { pos: [x, 9, 0], parent: SHIP, cast: false, recv: false }); }
const FIRE = [], SMOKE = [];
{ const R = rng(41);
  for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: new THREE.Color(2.2, 0.95, 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    s.userData = { x: -6 + R() * 18, ph: R() * TAU, s: 5 + R() * 6 }; SHIP.add(s); FIRE.push(s); }
  for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: C3('#3a3f4a'), transparent: true, opacity: 0.0, depthWrite: false, fog: true }));
    s.userData = { ph: R(), x: R() * 10 - 2, s: 14 + R() * 18 }; SEA.add(s); SMOKE.push(s); } }
const fireLight = new THREE.PointLight('#ff7a2a', 0, 600, 1.3); fireLight.position.set(-44, 10, -372); SEA.add(fireLight);
// sleet: streaks blowing in from the left
const SLEET = (() => { const n = 1600, R = rng(77), pos = new Float32Array(n * 3), base = []; for (let i = 0; i < n; i++) base.push([R() * 120 - 60, R() * 70, R() * 120 - 110]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ color: C3('#9aa6b8'), size: 0.35, transparent: true, opacity: 0.55, depthWrite: false })); SEA.add(p); return { p, base }; })();
function sleetAt(t) { const a = SLEET.p.geometry.attributes.position.array;
  SLEET.base.forEach(([x, y, z], i) => { const yy = ((y - t * 14) % 70 + 70) % 70; a[i * 3] = ((x + t * 9 + 60) % 120 + 120) % 120 - 60; a[i * 3 + 1] = yy - 6; a[i * 3 + 2] = z; }); SLEET.p.geometry.attributes.position.needsUpdate = true; }
SEA.add(new THREE.HemisphereLight('#24304a', '#020306', 0.9));
const moonish = new THREE.DirectionalLight('#8496b8', 0.45); moonish.position.set(-120, 260, -900); SEA.add(moonish);   // a low moon behind the cloud, ahead: the swell catches a sheen
const camS = new THREE.PerspectiveCamera(30, W / H, 0.5, 4000);
function seaAt(t, which) {
  waterAt(t); sleetAt(t);
  // the flash: a sharp rise on "40 km", a second smaller one, then a dull ember that will not go out
  const f = (dt) => dt < 0 ? 0 : Math.exp(-dt * 4) * (1 + 0.25 * Math.sin(dt * 9));
  const fl = which === 1 ? f(t - EV.flash) + 0.55 * f(t - EV.flash - 0.42) + (t > EV.flash ? 0.12 * clamp((t - EV.flash) / 0.8) : 0) : 0;
  FL.light.intensity = fl * 260; FL.glow.material.opacity = Math.min(1, fl * 0.9); ISL.visible = true;
  SHIP.visible = which === 3;
  if (which === 3) { const lt = t - EV.fire;
    FIRE.forEach((s, i) => { const u = s.userData, fl2 = 0.88 + 0.12 * Math.sin(t * 4.1 + u.ph) * Math.sin(t * 2.3 + u.ph * 2); s.position.set(u.x, 8 + fl2 * 5 + (i % 3) * 3, 0); s.scale.set(u.s * 0.8 * fl2, u.s * 2.6 * fl2, 1); s.material.opacity = clamp(lt / 0.6) * 0.9; });
    fireLight.intensity = clamp(lt / 0.6) * (160 + 25 * Math.sin(t * 3.7) * Math.sin(t * 2.2));
    SMOKE.forEach((s) => { const u = s.userData, ph = ((u.ph + t * 0.09) % 1); s.position.set(SHIP.position.x + u.x + ph * 90, 14 + ph * 110, SHIP.position.z - 6 - ph * 30); const sc = u.s * (1 + ph * 3.2); s.scale.set(sc, sc, 1); s.material.opacity = Math.sin(ph * Math.PI) * clamp(lt / 1.2); });
  } else { fireLight.intensity = 0; SMOKE.forEach((s) => (s.material.opacity = 0)); }
  // a camera on a boat: low, the horizon rolling a little, slowly pushing toward the far light
  const lt = t - (which === 1 ? T.s1 : T.s3), bob = swell(0, 30, t) * 0.5;
  if (which === 1) { camS.position.set(lerp(-6, 0, lt / 5), 7.5 + bob, lerp(60, 42, lt / 5)); camS.lookAt(30, 9 + bob * 0.4, -600); }
  else { camS.position.set(lerp(10, 4, lt / 4.6), 6.5 + bob, lerp(40, 30, lt / 4.6)); camS.lookAt(-44, 12 + bob * 0.4, -380); }
  camS.rotateZ(Math.sin(t * 0.7) * 0.018 + swell(5, 30, t) * 0.004); camS.updateMatrixWorld(true);
}

// ================================================================== 2 · THE PLOTTING ROOM
const ROOM = new THREE.Scene(); ROOM.background = C3('#010204'); ROOM.environment = ENV; ROOM.environmentIntensity = 0.1;
const MV = { lon0: 21.8, lon1: 30.9, lat0: 58.75, lat1: 61.35 }, TW = 156, TD = 117, MPW = 2048, MPH = 1536;
const map = (() => { const latC = (MV.lat0 + MV.lat1) / 2, cl = Math.cos(latC * DEG), lc = (MV.lon0 + MV.lon1) / 2;
  const s = Math.min(MPW / ((MV.lon1 - MV.lon0) * cl), MPH / (MV.lat1 - MV.lat0)), pr = ([lon, lat]) => [MPW / 2 + (lon - lc) * cl * s, MPH / 2 - (lat - latC) * s];
  const c = document.createElement('canvas'); c.width = MPW; c.height = MPH; const g = c.getContext('2d');
  const m = document.createElement('canvas'); m.width = MPW; m.height = MPH; const mg = m.getContext('2d'); mg.fillStyle = '#000'; mg.fillRect(0, 0, MPW, MPH); mg.fillStyle = '#f00'; rings(mg, GEO.land, pr, 'fill'); mg.fillStyle = '#000'; rings(mg, GEO.lakes, pr, 'fill');
  const md = mg.getImageData(0, 0, MPW, MPH).data, img = g.createImageData(MPW, MPH), R = rng(29);
  for (let i = 0; i < MPW * MPH; i++) { const land = md[i * 4] > 128, sp = R(), y = (i / MPW) | 0; const v = land ? 0.12 + 0.28 * sp * sp : 0.015 * sp, sl = y % 3 === 0 ? 0.7 : 1;
    img.data[i * 4] = 40 * v * sl; img.data[i * 4 + 1] = 255 * v * sl; img.data[i * 4 + 2] = 130 * v * sl; img.data[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(150,255,190,.9)'; g.lineWidth = 2.6; rings(g, GEO.land, pr, 'stroke'); g.strokeStyle = 'rgba(150,255,190,.4)'; g.lineWidth = 1.4; rings(g, GEO.lakes, pr, 'stroke');
  g.strokeStyle = 'rgba(255,170,70,.9)'; g.lineWidth = 3; g.setLineDash([12, 9]); rings(g, GEO.finRus, pr, 'stroke'); g.setLineDash([]);
  g.strokeStyle = 'rgba(120,255,180,.12)'; g.lineWidth = 1.5; for (let lon = 20; lon <= 32; lon++) { const [x0, y0] = pr([lon, 58]), [x1, y1] = pr([lon, 62]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  for (let lat = 58.5; lat <= 62; lat += 0.5) { const [x0, y0] = pr([20, lat]), [x1, y1] = pr([32, lat]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  g.font = '700 34px RobotoCondensed'; g.textBaseline = 'middle';
  for (const [n, lon, lat] of [['HELSINKI', 24.94, 60.17], ['TALLINN', 24.75, 59.44], ['KOTKA', 26.95, 60.47], ['ST PETERSBURG', 30.32, 59.94], ['NARVA', 28.19, 59.38], ['PORVOO', 25.66, 60.39], ['HAMINA', 27.20, 60.57]]) {
    const [x, y] = pr([lon, lat]); g.fillStyle = 'rgba(255,190,110,.95)'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); g.fillStyle = 'rgba(200,255,220,.85)'; g.fillText(n, x + 18, y); }
  { const [x, y] = pr([26.98, 60.05]); g.fillStyle = 'rgba(200,255,220,.6)'; g.font = '600 28px RobotoCondensed'; g.fillText('SUURSAARI', x + 26, y + 30); }
  g.fillStyle = 'rgba(150,255,190,.35)'; g.font = '700 64px RobotoCondensed'; g.textAlign = 'center'; { const [x, y] = pr([25.6, 59.95]); g.fillText(UI.map, x, y); }
  return { canvas: c, pr }; })();
const mapTex = canvasTex(MPW, MPH, (g) => g.drawImage(map.canvas, 0, 0));
const onTable = (lon, lat) => { const [x, y] = map.pr([lon, lat]); return [(x / MPW - 0.5) * TW, (y / MPH - 0.5) * TD]; };
// the restricted zone: hatched red, drawn into its own transparent texture so it can flood in
const ZONE = [[26.35, 60.38], [27.75, 60.52], [28.25, 60.3], [27.9, 60.12], [26.6, 60.12]];
const zoneTex = canvasTex(MPW, MPH, (g) => { g.save(); g.beginPath(); ZONE.forEach((p, i) => { const [x, y] = map.pr(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
  g.fillStyle = 'rgba(255,40,30,.16)'; g.fill(); g.clip(); g.strokeStyle = 'rgba(255,60,40,.75)'; g.lineWidth = 5; for (let i = -MPH; i < MPW; i += 26) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + MPH, MPH); g.stroke(); } g.restore();
  g.beginPath(); ZONE.forEach((p, i) => { const [x, y] = map.pr(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.strokeStyle = 'rgba(255,70,50,.95)'; g.lineWidth = 6; g.setLineDash([22, 12]); g.stroke(); g.setLineDash([]);
  const [x, y] = map.pr([27.0, 60.66]); g.fillStyle = 'rgba(255,90,70,1)'; g.font = '800 44px RobotoCondensed'; g.textAlign = 'center'; g.fillText(UI.zone, x, y); g.font = '700 28px RobotoCondensed'; g.fillText(UI.zoneSub, x, y + 38); });
const R = {};
{
  const steel = std('#15191d', { metalness: 0.7, roughness: 0.42 });
  mesh(new THREE.BoxGeometry(TW + 12, 8, TD + 12), steel, { pos: [0, -4.1, 0], parent: ROOM });
  R.mapMat = new THREE.MeshBasicMaterial({ map: mapTex, color: new THREE.Color(0.42, 0.42, 0.42) });
  mesh(new THREE.PlaneGeometry(TW, TD), R.mapMat, { pos: [0, 0.03, 0], rot: [-Math.PI / 2, 0, 0], parent: ROOM, cast: false, recv: false });
  R.zone = mesh(new THREE.PlaneGeometry(TW, TD), new THREE.MeshBasicMaterial({ map: zoneTex, transparent: true, opacity: 0, depthWrite: false }), { pos: [0, 0.06, 0], rot: [-Math.PI / 2, 0, 0], parent: ROOM, cast: false, recv: false });
  const sh = mesh(new THREE.PlaneGeometry(TW, TD), new THREE.ShadowMaterial({ opacity: 0.6 }), { pos: [0, 0.09, 0], rot: [-Math.PI / 2, 0, 0], parent: ROOM, cast: false }); sh.receiveShadow = true;
  mesh(new THREE.BoxGeometry(600, 4, 600), std('#07090b', { roughness: 0.9 }), { pos: [0, -60, 0], parent: ROOM });
  mesh(new THREE.BoxGeometry(600, 300, 4), std('#0c1013', { roughness: 0.95 }), { pos: [0, 80, -120], parent: ROOM });
  // the radar sweep: a sector of green light turning around Helsinki, over the glass
  const [hx, hz] = onTable(24.94, 60.17);
  R.sweep = new THREE.Mesh(new THREE.CircleGeometry(72, 96), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uA: { value: 0 }, uOn: { value: 1 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec2 vP; uniform float uA, uOn; void main(){ float a = atan(vP.y, vP.x); float d = mod(uA - a, 6.2831853); float r = length(vP)/72.;' +
      ' float trail = exp(-d*2.6) * smoothstep(1.0, 0.85, r); float line = smoothstep(0.03, 0.0, d) * smoothstep(1.0, 0.9, r); float ring = smoothstep(0.012,0.0,abs(fract(r*5.)-0.5)-0.488)*0.12;' +
      ' gl_FragColor = vec4(vec3(0.25,1.0,0.55) * (trail*0.06 + line*0.35 + ring*0.4) * uOn, 1.); }' }));
  R.sweep.rotation.x = -Math.PI / 2; R.sweep.position.set(hx, 0.12, hz); ROOM.add(R.sweep);
  // the two markers: a red-headed pin and a pulsing ring
  const marker = (label) => { const G = new THREE.Group(); ROOM.add(G);
    mesh(new THREE.CylinderGeometry(0.35, 0.35, 9, 8), std('#bfc4ca', { metalness: 1, roughness: 0.3 }), { pos: [0, 4.5, 0], parent: G });
    mesh(new THREE.SphereGeometry(2.3, 20, 14), new THREE.MeshStandardMaterial({ color: '#c0141a', emissive: new THREE.Color(0.9, 0.05, 0.05), roughness: 0.3 }), { pos: [0, 9.6, 0], parent: G });
    const ring = mesh(new THREE.RingGeometry(3, 3.8, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.25, 0.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), { pos: [0, 0.15, 0], rot: [-Math.PI / 2, 0, 0], parent: G, cast: false, recv: false });
    const LW = label.length > 8 ? 520 : 300, PW = LW / 20;   // the label is as wide as its words (21 NOV (APPROX.) was cut at a fixed 300)
    const lt = canvasTex(LW, 90, (g) => { g.fillStyle = 'rgba(10,4,4,.85)'; g.fillRect(0, 0, LW, 90); g.strokeStyle = '#ff4a3a'; g.lineWidth = 4; g.strokeRect(2, 2, LW - 4, 86); g.fillStyle = '#ff6a58'; let px = 54; g.font = `800 ${px}px RobotoCondensed`; while (g.measureText(label).width > LW - 30 && px > 24) { px -= 2; g.font = `800 ${px}px RobotoCondensed`; } g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, LW / 2, 48); });
    mesh(new THREE.PlaneGeometry(PW, 4.5), new THREE.MeshBasicMaterial({ map: lt }), { pos: [3.5 + PW / 2, 0.2, 3], rot: [-Math.PI / 2, 0, 0], parent: G, cast: false, recv: false });
    G.userData.ring = ring; return G; };
  R.m1 = marker(UI.m1); { const [x, z] = onTable(26.98, 60.06); R.m1.position.set(x, 0, z); }
  R.m2 = marker(UI.m2); { const [x, z] = onTable(27.75, 59.93); R.m2.position.set(x, 0, z); }
  // the teleprinter: a grey box at the table's near edge, its paper running out over the map
  R.tty = new THREE.Group(); ROOM.add(R.tty); R.tty.position.set(-30, 0, 48); R.tty.rotation.y = 0.12;
  mesh(rbox(44, 14, 22, 2), std('#3b4146', { metalness: 0.3, roughness: 0.5 }), { pos: [0, 7, 0], parent: R.tty });
  mesh(new THREE.BoxGeometry(22, 1.2, 3), std('#101214'), { pos: [0, 13.8, -6], parent: R.tty });
  R.paperC = document.createElement('canvas'); R.paperC.width = 640; R.paperC.height = 900; R.paperTex = new THREE.CanvasTexture(R.paperC); R.paperTex.colorSpace = THREE.SRGBColorSpace; R.paperTex.anisotropy = 8;
  R.paper = mesh(new THREE.PlaneGeometry(19.2, 27), new THREE.MeshStandardMaterial({ map: R.paperTex, roughness: 0.9, side: THREE.DoubleSide }), { pos: [0, 15.5, -17], rot: [-1.2, 0, 0], parent: R.tty, cast: true });
  // light: one hanging lamp (it flickers, it goes out), a red beacon on the wall, the map's own glow
  const shade = std('#1f2a24', { metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide });
  R.lampG = new THREE.Group(); ROOM.add(R.lampG); R.lampG.position.set(0, 150, 4);
  mesh(new THREE.CylinderGeometry(0.3, 0.3, 60, 6), std('#111'), { pos: [0, -30, 0], parent: R.lampG });
  mesh(new THREE.ConeGeometry(16, 12, 40, 1, true), shade, { pos: [0, -62, 0], parent: R.lampG });
  R.bulb = mesh(new THREE.SphereGeometry(4.2, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 3.2, 2.8) }), { pos: [0, -66, 0], parent: R.lampG, cast: false });
  R.key = new THREE.SpotLight('#e4fff0', 13000, 420, 0.66, 0.6, 2); R.key.position.set(0, -67, 0); R.lampG.add(R.key); R.key.target.position.set(0, 0, 0); ROOM.add(R.key.target);
  R.key.castShadow = true; R.key.shadow.mapSize.set(2048, 2048); R.key.shadow.bias = -0.0003; R.key.shadow.radius = 5;
  R.green = new THREE.PointLight('#48ff96', 90, 160, 2); R.green.position.set(0, 6, 20); ROOM.add(R.green);
  R.hemi = new THREE.HemisphereLight('#1a2836', '#080c0a', 0.3); ROOM.add(R.hemi);
  R.beaconG = new THREE.Group(); ROOM.add(R.beaconG); R.beaconG.position.set(70, 70, -116);
  mesh(new THREE.CylinderGeometry(4, 4.6, 7, 24), new THREE.MeshStandardMaterial({ color: '#550806', emissive: new THREE.Color(1.6, 0.1, 0.08), transparent: true, opacity: 0.9 }), { parent: R.beaconG, cast: false });
  R.beacon = new THREE.SpotLight('#ff2818', 0, 500, 0.35, 0.5, 1.6); R.beaconG.add(R.beacon); R.beaconT = new THREE.Object3D(); R.beaconG.add(R.beaconT); R.beacon.target = R.beaconT;
}
let paperKey = '';
const wrapW = (str, n) => { const out = []; let line = ''; for (const w of str.split(' ')) { if ((line + ' ' + w).trim().length > n && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; };
const TTY1 = ['11 NOV', ...wrapW(UI.tty1, 15)], TTY2 = ['11 NOV', ...wrapW(UI.tty2, 15)];   // both are the 11 Nov statement: no source has 'stable' on 21 Nov
function drawPaper(t) {
  const c1 = TTY1.join('').length, c2 = TTY2.join('').length;
  const n1 = Math.floor(clamp((t - EV.tty1) / (EV.tty1End - EV.tty1)) * c1), n2 = Math.floor(clamp((t - EV.tty2) / (EV.tty2End - EV.tty2)) * c2);
  const key = n1 + ':' + n2; if (key === paperKey) return; paperKey = key; const g = R.paperC.getContext('2d'), w = 640, h = 900;
  g.fillStyle = '#e8e3d4'; g.fillRect(0, 0, w, h); const Rr = rng(3); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(90,80,60,${Rr() * 0.06})`; g.fillRect(Rr() * w, Rr() * h, 2, 2); }
  g.fillStyle = '#1b1916'; g.font = `bold 26px ${TYPE}`; g.fillText(UI.ttyHead, 30, 50); g.fillRect(30, 64, w - 60, 2);
  const block = (lines, n, y0) => { let left = n; lines.forEach((s, li) => { const k = Math.max(0, Math.min(s.length, left)); left -= s.length; const Rl = rng(11 + y0 + li); let x = 30;
    g.font = `bold ${li === 0 ? 36 : 50}px ${TYPE}`; for (const ch of s.slice(0, k)) { g.globalAlpha = 0.75 + Rl() * 0.25; g.fillText(ch, x, y0 + li * 64 + (Rl() - 0.5) * 2); x += g.measureText(ch).width; } g.globalAlpha = 1; }); };
  block(TTY1, n1, 130); block(TTY2, n2, 130 + (TTY1.length + 0.6) * 64);
  R.paperTex.needsUpdate = true;
}
const camR = new THREE.PerspectiveCamera(34, W / H, 1, 3000);
function roomAt(t, which) {
  drawPaper(t); R.sweep.material.uniforms.uA.value = t * 1.7;
  const p1 = t > EV.mark1 ? 1 : 0; R.m1.visible = t > EV.mark1 - 0.4; R.m1.position.y = t < EV.mark1 ? 40 * (1 - clamp((t - EV.mark1 + 0.4) / 0.4)) ** 2 : 0;
  R.m1.userData.ring.scale.setScalar(1 + ((t * 0.8) % 1) * 2.2); R.m1.userData.ring.material.opacity = (1 - (t * 0.8) % 1) * p1;
  R.m2.visible = t > EV.mark2 - 0.4; R.m2.position.y = t < EV.mark2 ? 40 * (1 - clamp((t - EV.mark2 + 0.4) / 0.4)) ** 2 : 0;
  R.m2.userData.ring.scale.setScalar(1 + ((t * 0.8 + 0.5) % 1) * 2.2); R.m2.userData.ring.material.opacity = (1 - (t * 0.8 + 0.5) % 1) * (t > EV.mark2 ? 1 : 0);
  R.zone.material.opacity = t < EV.zone ? 0 : Math.min(1, ease.out((t - EV.zone) / 0.5)) * (0.85 + 0.15 * Math.sin(t * 6));
  // the beacon turns from beat 4 on
  const bOn = t > EV.beacon ? 1 : 0; R.beacon.intensity = bOn * 26000; const ba = t * 4.2; R.beaconT.position.set(Math.cos(ba) * 100, -40, Math.sin(ba) * 100 + 80);
  // the lamp: it swings after the thud, flickers, and goes out with everything on it (the sweep too) at EV.out
  const sw = t > EV.thud ? Math.sin((t - EV.thud) * 3.1) * Math.exp(-(t - EV.thud) * 0.6) * 0.07 : Math.sin(t * 0.6) * 0.006; R.lampG.rotation.set(sw * 0.4, 0, sw);
  let L = 1; const dt = t - EV.thud; if (dt > 0) L = 0.7 + 0.3 * (Math.sin(dt * 7.5) > 0.6 ? 0.35 : 1);   // a few slow stutters, then one blink and out (no strobe)
  if (t > EV.out) L = 0; else if (t > EV.out - 0.42 && t < EV.out - 0.3) L *= 0.15;
  R.key.intensity = 13000 * L; R.bulb.material.color.setRGB(3.0 * L, 3.2 * L, 2.8 * L); R.green.intensity = 90 * (t > EV.out ? 0.25 : 1); R.sweep.material.uniforms.uOn.value = t > EV.out ? 0.35 : 1;
  R.mapMat.color.setScalar(t > EV.out ? 0.1 : 0.42); R.hemi.intensity = t > EV.out ? 0.0 : 0.3; ROOM.environmentIntensity = t > EV.out ? 0.0 : 0.1; if (t > EV.out) R.green.intensity = 0;
  const lt = t - [0, 0, T.s2, 0, T.s4, T.s5][which], d = [0, 0, T.s3 - T.s2, 0, T.s5 - T.s4, T.end - T.s5][which], k = smooth(lt / d), kk = kickAt(t);
  const [g1x, g1z] = onTable(26.98, 60.06);
  if (which === 2) { camR.position.set(lerp(g1x - 30, g1x - 22, k), lerp(108, 92, k), lerp(g1z + 120, g1z + 100, k)); camR.lookAt(lerp(g1x - 22, g1x - 18, k), 0, g1z + 14); camR.fov = 34; }
  else if (which === 4) { camR.position.set(lerp(30, 24, k), lerp(150, 136, k), lerp(150, 136, k)); camR.lookAt(10, 0, 6); camR.fov = 36; }
  else { camR.position.set(lerp(-29, -30, k), lerp(70, 64, k), lerp(98, 92, k)); camR.lookAt(-31, 9, 21); camR.fov = 30; }
  camR.position.y -= kk * 2.0; camR.position.x += kk * 1.2; camR.updateProjectionMatrix();
}

// ================================================================== overlays and the frame
function tag(g, text, a, y = 1520) {
  if (a <= 0 || !text) return;
  g.save(); g.globalAlpha = a; g.font = '800 30px Inter';
  let w = g.measureText(text).width; const maxW = 905 - 110 - 44; if (w > maxW) { g.font = `800 ${Math.floor(30 * maxW / w)}px Inter`; w = g.measureText(text).width; }
  const x = 110; g.fillStyle = 'rgba(8,10,12,.86)'; g.beginPath(); g.roundRect(x, y, w + 44, 62, 6); g.fill();
  g.strokeStyle = 'rgba(255,90,70,.55)'; g.lineWidth = 2; g.stroke();
  g.fillStyle = '#f0e2dc'; g.textBaseline = 'middle'; g.fillText(text, x + 22, y + 32); g.restore();
}
function scanlines(g, a) { g.save(); g.globalAlpha = a; g.fillStyle = '#000'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.4); g.restore(); }
function stamp(g, t) {   // a cold time code, like a watch camera's, top right
  g.save(); g.font = '600 26px RobotoCondensed'; g.fillStyle = 'rgba(255,120,100,.85)'; g.textAlign = 'right';
  const sea = t < T.s2 || (t >= T.s3 && t < T.s4); const base = t < T.s3 ? [11, 2, 47] : [21, 4, 15]; const s = Math.floor(t * 1) % 60;
  g.fillText(`${base[0]} NOV  ${String(base[1]).padStart(2, '0')}:${String(base[2]).padStart(2, '0')}:${String(s).padStart(2, '0')}`, W - 60, 120);
  if (sea) { g.fillStyle = (Math.floor(t * 1.6) % 2) ? 'rgba(255,60,40,.95)' : 'rgba(255,60,40,.25)'; g.beginPath(); g.arc(W - 330, 112, 9, 0, TAU); g.fill(); }
  g.restore();
}
const SHOTS = [{ t0: () => T.s1, kind: 1 }, { t0: () => T.s2, kind: 2 }, { t0: () => T.s3, kind: 3 }, { t0: () => T.s4, kind: 4 }, { t0: () => T.s5, kind: 5 }];
const shotAt = (t) => { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].t0()) return i; return 0; };
function frame(t, captions = true) {
  const S = SHOTS[shotAt(t)], kk = kickAt(t);
  if (S.kind === 1 || S.kind === 3) {
    seaAt(t, S.kind);
    post.render(SEA, camS, { focus: 1e5, aperture: 0, maxBlur: 0, tilt: 0, threshold: 0.7, knee: 0.5, bloomA: 0.8, bloomB: 0.6,
      exposure: 1.15, vignette: 0.7, grain: 0.07, seed: Math.floor(t * 24), sat: 0.9, contrast: 1.15, toe: 0.02, lift: [0.0, 0.004, 0.012], gain: [1.02, 1.0, 1.0], aberration: 0.0025 + Math.abs(kk) * 0.004 });
  } else {
    roomAt(t, S.kind);
    const [g1x, g1z] = onTable(26.98, 60.06); const _p = new THREE.Vector3(S.kind === 5 ? -30 : g1x, S.kind === 5 ? 14 : 4, S.kind === 5 ? 36 : g1z).project(camR); const fc = clamp((_p.y + 1) / 2, 0.2, 0.8);
    post.render(ROOM, camR, { focus: 60, aperture: 0, maxBlur: 24, tilt: S.kind === 5 ? 16 : 9, tiltCenter: fc, tiltBand: S.kind === 5 ? 0.28 : 0.5, threshold: 0.9, knee: 0.5, bloomA: 0.4, bloomB: 0.3,
      exposure: 1.05, vignette: 0.68, grain: 0.06, seed: Math.floor(t * 24), sat: 1.0, contrast: 1.14, toe: 0.02, lift: [0.0, 0.006, 0.012], gain: [1.02, 1.0, 0.98], aberration: 0.0018 + Math.abs(kk) * 0.004 });
  }
  g2d.setTransform(1, 0, 0, 1, 0, 0); g2d.drawImage(renderer.domElement, 0, 0);
  scanlines(g2d, S.kind === 1 || S.kind === 3 ? 0.14 : 0.08); stamp(g2d, t);
  // hard cuts (21 Nov: the static frames on each cut read as glitches)
  CAP.bug(g2d);
  const tg = (a0, a1) => clamp((t - a0) / 0.3) * clamp((a1 - t) / 0.3);
  for (const [k, a0, a1] of TAGS) tag(g2d, UI[k], tg(a0, a1));
  if (captions) CAP.draw(g2d, P, t, { busy: BUSY || {} });
  return out;
}
frame(T.s2 + 2, false); frame(T.s3 + 2, false);
let BUSY = null; if (Q.get('busy') !== '0') BUSY = CAP.measureBusy(g2d, P, (t) => frame(t, false));
const LOOKS = [{ name: '1-sea', t: EV.flash + 0.3 }, { name: '2-room', t: T.s3 - 0.6 }, { name: '3-fire', t: T.s4 - 0.8 }, { name: '4-closed', t: EV.zone + 0.6 }, { name: '5-stable', t: EV.out - 0.5 }];
const cueNames = ['flash', 'mark1', 'tty1', 'fire', 'beacon', 'zone', 'mark2', 'tty2', 'thud', 'out'];
window.__film = { fps: FPS, frames: Math.round(DUR * FPS), events: { ...T, lang: LANG, ...EV, cueNames, ...CAP.events(P), quiet: [] }, lang: LANG,
  report: { ...CAP.report(g2d, P, { keep: () => [], busy: BUSY || {} }) },
  looks: LOOKS.map((l) => ({ name: l.name })), look(i) { return frame(LOOKS[i].t).toDataURL('image/png'); },
  frame(i, q = 0.92) { return frame(i / FPS).toDataURL('image/jpeg', q); },
  still(t) { return frame(t).toDataURL('image/png'); } };
window.__ready = true;
