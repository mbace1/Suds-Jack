// GLYPH//CITY — a courier in an isometric city that is drawn in text.
//
// The loop: shards of data drop onto the streets; pick them up and carry them
// to an UPLINK. Carrying more pays more (n² x 100) and costs more — patrol
// drones sweep the streets with searchlights, standing in a light raises your
// TRACE, and a full trace flatlines you and the shards are gone. Cars own the
// lanes; the painted median between them is the one safe line, and every
// crossing is a gap you have to pick.
//
// The look is all ascii.js: this file renders an ordinary three.js scene and
// never draws a character of its own except through the overlay grid.
//
// ?capture=1 stops the rAF loop and hands the clock to window.__gc.frame(dt),
// which is how tools/capture.mjs records an MP4 frame by frame.

import * as THREE from '../vendor/three.module.min.js';
import { AsciiPass, PALETTES, bigText } from './ascii.js?v=1';
import { buildCity, blocked, rng, P, N, EXTENT, NEON } from './city.js?v=1';

const Q = new URLSearchParams(location.search);
const CAPTURE = Q.has('capture');
const SEED = Number(Q.get('seed') || 7);

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: CAPTURE });
renderer.setClearColor(0x070a14);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const ascii = new AsciiPass(renderer);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a14);
const city = buildCity(scene, SEED);
const R = rng(SEED * 31 + 5);

// isometric: 45° yaw, 30° down — the 2:1 tile camera
const CAM_D = 100, NEAR = 40, FAR = 190;
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, NEAR, FAR);
const CAM_OFF = new THREE.Vector3(1, Math.SQRT2 * Math.tan(Math.PI / 6), 1).normalize().multiplyScalar(CAM_D);
let viewH = Number(Q.get('zoom') || 26);    // world units of height on screen
scene.fog = new THREE.Fog(0x070a14, CAM_D - 10, CAM_D + 48);
ascii.mat.uniforms.edgeK.value = (FAR - NEAR) / 2.2;  // a 2.2-unit depth step is a silhouette; creases and roof clutter are not

// screen directions on the ground
const SCREEN_UP = new THREE.Vector3(-1, 0, -1).normalize();
const SCREEN_RIGHT = new THREE.Vector3(1, 0, -1).normalize();

// ---------------------------------------------------------------- rain
// Rain is not in the 3D scene: thin lines through a scene that is about to be
// averaged into cells only flip glyphs at random. It falls in the character
// grid instead, as '/' over the dark cells — weather made of the same text.
const rain = [];
const RR = rng(SEED * 7 + 1);   // its own stream: drawing must never move the game's dice
function rainStep(dt, cols, rows) {
  const want = Math.round(cols * rows / 26);
  while (rain.length < want) rain.push({ x: RR() * (cols + rows * 0.5), y: RR() * rows, v: 26 + RR() * 18, splash: 0 });
  rain.length = Math.min(rain.length, want);
  for (const d of rain) {
    if (d.splash > 0) { d.splash -= dt; if (d.splash <= 0) { d.x = RR() * (cols + rows * 0.5); d.y = -RR() * 4; } continue; }
    d.y += d.v * dt; d.x -= d.v * dt * 0.45;
    // most drops land somewhere on screen, not all at the bottom edge
    if (d.y > rows || (d.y > 2 && RR() < dt * 1.2)) d.splash = 0.12;
  }
}
function rainDraw(A) {
  for (const d of rain) {
    const c = Math.round(d.x), r = Math.round(d.y);
    if (d.splash > 0) { A.soft(c, r, 46, [90, 110, 160]); continue; }   // '.'
    A.soft(c, r, 47, [120, 145, 205]);                                  // '/'
    A.soft(c + 1, r - 1, 47, [60, 74, 110]);
  }
}

// ---------------------------------------------------------------- the runner
const runner = new THREE.Group();
{
  const coat = new THREE.MeshLambertMaterial({ color: 0x2a2f45 });
  const glow = new THREE.MeshBasicMaterial({ color: 0x22f0ff });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.42), coat); body.position.y = 1.15;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.12, 0.44), glow); stripe.position.y = 1.3;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.MeshLambertMaterial({ color: 0xd8c8b8 }));
  head.position.y = 1.85;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.3), glow); visor.position.set(0, 1.9, 0.08);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), coat); legL.position.set(-0.15, 0.35, 0);
  const legR = legL.clone(); legR.position.x = 0.15;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 1.0, 24), new THREE.MeshBasicMaterial({ color: 0x22f0ff, transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06;
  runner.add(body, stripe, head, visor, legL, legR, ring);
  runner.userData = { legL, legR, ring, stripe };
}
scene.add(runner);
const carriedGems = [];     // little shards orbiting the runner, one per carried shard

// ---------------------------------------------------------------- streets
const near = (v) => Math.round(v / P) * P;
function randomStreetPoint() {
  for (;;) {
    const along = (R() * 2 - 1) * (EXTENT - 2);
    const line = (Math.floor(R() * (2 * N + 1)) - N) * P;
    const p = R() < 0.5 ? new THREE.Vector3(along, 0, line) : new THREE.Vector3(line, 0, along);
    // keep clear of crossings (a shard in a junction is a car's)
    if (Math.abs(p.x - near(p.x)) < 2.6 && Math.abs(p.z - near(p.z)) < 2.6) continue;
    return p;
  }
}

// ---------------------------------------------------------------- cars
const cars = [];
function makeCar() {
  const g = new THREE.Group();
  const col = [0x3b4258, 0x5b2340, 0x23405b, 0x40405a, 0x6b5a2a][Math.floor(R() * 5)];
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 1.05), new THREE.MeshLambertMaterial({ color: col }));
  body.position.y = 0.5;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.9), new THREE.MeshLambertMaterial({ color: 0x151a26 }));
  cab.position.set(-0.15, 0.98, 0);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.9), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
  head.position.set(1.07, 0.55, 0);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.9), new THREE.MeshBasicMaterial({ color: 0xff2030 }));
  tail.position.set(-1.07, 0.6, 0);
  // headlight wash on the road ahead — the ascii pass turns it into a fan of dots
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.4), new THREE.MeshBasicMaterial({ color: 0xfff1c0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.rotation.x = -Math.PI / 2; beam.position.set(3.1, 0.04, 0);
  const under = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshBasicMaterial({ color: NEON[Math.floor(R() * NEON.length)], transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  under.rotation.x = -Math.PI / 2; under.position.y = 0.05;
  g.add(body, cab, head, tail, beam, under);
  scene.add(g);
  return g;
}
for (let i = 0; i < 22; i++) {
  const horizontal = i % 2 === 0;
  const line = (Math.floor(R() * (2 * N + 1)) - N) * P;
  const dir = R() < 0.5 ? 1 : -1;
  const lane = dir * 1.15 * (horizontal ? 1 : -1);
  const c = { m: makeCar(), horizontal, line, dir, lane, s: (R() * 2 - 1) * (EXTENT + P), v: 8 + R() * 7 };
  c.m.rotation.y = horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? -Math.PI / 2 : Math.PI / 2);
  cars.push(c);
}
function carPos(c) {
  return c.horizontal ? [c.s, c.line + c.lane] : [c.line + c.lane, c.s];
}

// ---------------------------------------------------------------- drones
const drones = [];
function makeDrone() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 1.2), new THREE.MeshLambertMaterial({ color: 0x3a3f55 }));
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), new THREE.MeshBasicMaterial({ color: 0xff3355 }));
  eye.position.y = -0.22;
  g.add(shell, eye);
  for (let k = 0; k < 4; k++) {
    const rot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 10), new THREE.MeshBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.5 }));
    rot.position.set(k < 2 ? -0.75 : 0.75, 0.2, k % 2 ? -0.75 : 0.75);
    g.add(rot);
  }
  const H = 8;
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 2.6, H, 20, 1, true), coneMat);
  cone.position.y = -H / 2;
  const poolMat = new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 28), poolMat);
  pool.rotation.x = -Math.PI / 2;
  scene.add(g, pool);
  g.add(cone);
  g.position.y = H;
  return { g, pool, coneMat, poolMat, eye };
}
for (let i = 0; i < 6; i++) {
  const d = makeDrone();
  d.horizontal = i % 2 === 0;
  d.line = ((i * 3) % (2 * N + 1) - N) * P;
  d.s = (R() * 2 - 1) * EXTENT;
  d.dir = R() < 0.5 ? 1 : -1;
  d.v = 3.2 + R() * 1.6;
  d.sway = R() * 6;
  d.lock = 0;
  drones.push(d);
}

// ---------------------------------------------------------------- shards & uplinks
const shardGeo = new THREE.OctahedronGeometry(0.55, 0);
const shardMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
const pillarMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending });
const shards = [];
function spawnShard() {
  const p = randomStreetPoint();
  const m = new THREE.Mesh(shardGeo, shardMat);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 14, 8, 1, true), pillarMat);
  pillar.position.y = 7;
  const g = new THREE.Group(); g.add(m, pillar); g.position.copy(p);
  scene.add(g);
  shards.push({ g, m, p, ph: R() * 6 });
}

const uplinks = [];
for (const [i, j] of [[-2, 2], [2, -2], [1, 2]]) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.9), new THREE.MeshLambertMaterial({ color: 0x1e3a2c }));
  base.position.y = 1.3;
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 1.0), new THREE.MeshBasicMaterial({ color: 0x7cff4f }));
  top.position.y = 2.7;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 6, 32), new THREE.MeshBasicMaterial({ color: 0x7cff4f }));
  halo.position.y = 3.4; halo.rotation.x = Math.PI / 2;
  const pad = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.0, 32), new THREE.MeshBasicMaterial({ color: 0x7cff4f, transparent: true, opacity: 0.6, depthWrite: false }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.05;
  // on the kerb corner of the junction, out of the lanes but reachable from
  // the street line beside it
  g.position.set(i * P + 2.3, 0, j * P + 2.3);
  g.add(base, top, halo, pad);
  scene.add(g);
  uplinks.push({ g, halo, pad, p: g.position });
  city.boxes.push({ minX: g.position.x - 0.45, maxX: g.position.x + 0.45, minZ: g.position.z - 0.45, maxZ: g.position.z + 0.45 });
}

// ---------------------------------------------------------------- state
const S = {
  mode: 'title', t: 0, score: 0, best: 0, carried: 0, trace: 0, palette: 0,
  pos: new THREE.Vector3(0, 0, P * 0), vel: new THREE.Vector3(), face: 0,
  dash: 0, dashCd: 0, stun: 0, flat: 0, autopilot: true, floaters: [], delivered: 0,
  raw: false, lastInput: -99,
};
try { S.best = Number(localStorage.getItem('glyphcityBest') || 0); } catch {}
try { S.palette = Number(localStorage.getItem('glyphcityPalette') || 0) % PALETTES.length; } catch {}
ascii.setPalette(S.palette);
for (let i = 0; i < 6; i++) spawnShard();

function respawn() {
  S.pos.set(city.plazaCentre.x - P / 2, 0, city.plazaCentre.z + P / 2);
  S.vel.set(0, 0, 0); S.trace = 0; S.carried = 0; S.stun = 0;
}
respawn();

function floater(text, rgb, pos) {
  S.floaters.push({ text, rgb, pos: pos.clone().setY(3), t: 0 });
}

// ---------------------------------------------------------------- input
const keys = new Set();
const touch = { id: null, x0: 0, y0: 0, x: 0, y: 0, start: 0 };
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  S.lastInput = S.t;
  if (e.code === 'KeyC') cyclePalette(1);
  else if (e.code === 'KeyV') S.raw = !S.raw;
  else if (e.code === 'BracketLeft') density(-1);
  else if (e.code === 'BracketRight') density(1);
  else if (e.code === 'Minus') viewH = Math.min(60, viewH + 4);
  else if (e.code === 'Equal') viewH = Math.max(14, viewH - 4);
  else if (S.mode === 'title') start();
  else if (e.code === 'Space') dash();
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.code));
canvas.addEventListener('pointerdown', (e) => {
  S.lastInput = S.t;
  if (S.mode === 'title') { start(); return; }
  touch.id = e.pointerId; touch.x0 = touch.x = e.clientX; touch.y0 = touch.y = e.clientY; touch.start = performance.now();
});
addEventListener('pointermove', (e) => { if (e.pointerId === touch.id) { touch.x = e.clientX; touch.y = e.clientY; S.lastInput = S.t; } });
addEventListener('pointerup', (e) => {
  if (e.pointerId !== touch.id) return;
  if (performance.now() - touch.start < 220 && Math.hypot(touch.x - touch.x0, touch.y - touch.y0) < 12) dash();
  touch.id = null;
});
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

let padPrev = [];
function readPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const p = [...pads].find(Boolean);
  if (!p) return [0, 0];
  const pressed = p.buttons.map((b) => b.pressed);
  const edge = (i) => pressed[i] && !padPrev[i];
  if (pressed.some(Boolean)) S.lastInput = S.t;
  if (S.mode === 'title' && (edge(0) || edge(9))) start();
  else if (edge(0) || edge(7)) dash();
  if (edge(3)) cyclePalette(1);
  if (edge(2)) S.raw = !S.raw;
  padPrev = pressed;
  let x = p.axes[0] || 0, y = p.axes[1] || 0;
  if (Math.hypot(x, y) < 0.18) { x = 0; y = 0; } else S.lastInput = S.t;
  if (pressed[14]) x = -1; if (pressed[15]) x = 1; if (pressed[12]) y = -1; if (pressed[13]) y = 1;
  return [x, y];
}

function moveInput() {
  let x = 0, y = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
  if (touch.id !== null) {
    const dx = touch.x - touch.x0, dy = touch.y - touch.y0, l = Math.hypot(dx, dy);
    if (l > 8) { x += dx / Math.max(l, 50); y += dy / Math.max(l, 50); }
  }
  const [px, py] = readPad();
  x += px; y += py;
  if (keys.size) S.lastInput = S.t;      // a held key is input too
  const v = SCREEN_RIGHT.clone().multiplyScalar(x).addScaledVector(SCREEN_UP, -y);
  if (v.length() > 1) v.normalize();
  return v;
}

function cyclePalette(d) {
  S.palette = (S.palette + d + PALETTES.length) % PALETTES.length;
  ascii.setPalette(S.palette);
  try { localStorage.setItem('glyphcityPalette', String(S.palette)); } catch {}
}
function density(d) {
  const c = ascii.cellCss;
  c.w = Math.min(16, Math.max(5, c.w + d)); c.h = Math.round(c.w * 1.75);
  resize();
}
function start() {
  S.mode = 'play'; S.autopilot = false; S.score = 0; S.delivered = 0; respawn();
}
function dash() {
  if (S.mode !== 'play' || S.dashCd > 0 || S.stun > 0) return;
  S.dash = 0.22; S.dashCd = 0.9;
}

// ---------------------------------------------------------------- autopilot
// the attract mode and the video use the same runner; everything lives on the
// street lines, so a route is "along this street to the right cross street,
// then along that one" and nothing smarter is needed
function autopilotDir() {
  let target = null, best = Infinity;
  const wantUplink = S.carried >= 2 || (S.carried > 0 && S.trace > 55);
  const list = wantUplink ? uplinks.map((u) => u.p) : shards.map((s) => s.p);
  for (const p of list) {
    const d = Math.abs(p.x - S.pos.x) + Math.abs(p.z - S.pos.z);
    if (d < best) { best = d; target = p; }
  }
  if (!target) return new THREE.Vector3();
  const px = S.pos.x, pz = S.pos.z;
  const onH = Math.abs(pz - near(pz)) < 1.2, onV = Math.abs(px - near(px)) < 1.2;
  const tH = Math.abs(target.z - near(target.z)) < 3.5, tV = Math.abs(target.x - near(target.x)) < 3.5;
  let wx = target.x, wz = target.z;
  // an uplink stands on a corner: approach it from the street beside it
  if (wantUplink) { wx = near(target.x); wz = target.z; }
  if (onH && (tH && Math.abs(near(target.z) - near(pz)) < 1)) { wz = near(pz); }
  else if (onV && ((tV || wantUplink) && Math.abs(near(wx) - near(px)) < 1)) { wx = near(px); }
  else if (onH && !onV) { wx = near(wantUplink ? target.x : (tV ? target.x : target.x)); wz = near(pz); }
  else if (onV && !onH) { wx = near(px); wz = near(target.z); }
  else { // at a junction: pick the axis that the target is further along
    if (Math.abs(target.x - px) > Math.abs(target.z - pz)) { wx = tV || wantUplink ? near(target.x) : target.x; wz = near(pz); }
    else { wx = near(px); wz = tH ? near(target.z) : target.z; }
  }
  const v = new THREE.Vector3(wx - px, 0, wz - pz);
  if (v.length() < 0.2) return new THREE.Vector3();
  // stay on the median: nudge back to the centre line of the street we are on
  if (Math.abs(v.x) > Math.abs(v.z) && onH) v.z += (near(pz) - pz) * 2;
  if (Math.abs(v.z) > Math.abs(v.x) && onV) v.x += (near(px) - px) * 2;
  return v.normalize();
}

// ---------------------------------------------------------------- simulation
const tmp = new THREE.Vector3();
function step(dt) {
  S.t += dt; hudDt = dt;
  city.update(S.t);

  // the title runs the attract loop behind it; leaving the game alone for a
  // while hands the runner back to the autopilot
  if (S.mode === 'play' && !CAPTURE && S.t - S.lastInput > 25) { S.mode = 'title'; S.autopilot = true; }

  // ---- runner
  S.dashCd = Math.max(0, S.dashCd - dt);
  S.stun = Math.max(0, S.stun - dt);
  if (S.flat > 0) {
    S.flat -= dt;
    if (S.flat <= 0) respawn();
  }
  const want = S.flat > 0 || S.stun > 0 ? new THREE.Vector3()
    : (S.autopilot ? autopilotDir() : moveInput());
  if (S.autopilot && S.dashCd <= 0 && S.trace > 30) { S.dash = 0.22; S.dashCd = 0.9; }
  const speed = S.dash > 0 ? 17 : 6.2;
  S.dash = Math.max(0, S.dash - dt);
  S.vel.lerp(want.multiplyScalar(speed), Math.min(1, dt * (S.dash > 0 ? 30 : 12)));
  const nx = S.pos.x + S.vel.x * dt, nz = S.pos.z + S.vel.z * dt;
  if (!blocked(city.boxes, nx, S.pos.z, 0.4)) S.pos.x = nx; else S.vel.x = 0;
  if (!blocked(city.boxes, S.pos.x, nz, 0.4)) S.pos.z = nz; else S.vel.z = 0;
  const sp = Math.hypot(S.vel.x, S.vel.z);
  if (sp > 0.3) S.face = Math.atan2(S.vel.x, S.vel.z);
  runner.position.copy(S.pos);
  runner.rotation.y = S.face;
  const ud = runner.userData;
  const swing = Math.sin(S.t * 14) * Math.min(1, sp / 5) * 0.7;
  ud.legL.rotation.x = swing; ud.legR.rotation.x = -swing;
  runner.position.y = Math.abs(Math.sin(S.t * 14)) * Math.min(1, sp / 5) * 0.08;
  ud.ring.scale.setScalar(1 + 0.15 * Math.sin(S.t * 6));
  runner.visible = S.flat <= 0 || Math.sin(S.t * 30) > 0;
  ud.stripe.material.color.setHex(S.dash > 0 ? 0xffffff : S.stun > 0 ? 0xff3355 : 0x22f0ff);

  // ---- carried shards orbit the runner
  while (carriedGems.length < S.carried) {
    const m = new THREE.Mesh(shardGeo, shardMat); m.scale.setScalar(0.45); scene.add(m); carriedGems.push(m);
  }
  while (carriedGems.length > S.carried) scene.remove(carriedGems.pop());
  carriedGems.forEach((m, i) => {
    const a = S.t * 3 + (i / Math.max(1, S.carried)) * Math.PI * 2;
    m.position.set(S.pos.x + Math.cos(a) * 1.1, 2.4 + Math.sin(S.t * 4 + i) * 0.15, S.pos.z + Math.sin(a) * 1.1);
    m.rotation.y = S.t * 4;
  });

  // ---- cars
  for (const c of cars) {
    c.s += c.dir * c.v * dt;
    const lim = EXTENT + P;
    if (c.s > lim) c.s -= 2 * lim; if (c.s < -lim) c.s += 2 * lim;
    const [x, z] = carPos(c);
    c.m.position.set(x, 0, z);
    if (S.flat > 0 || S.stun > 0 || S.dash > 0) continue;
    const along = c.horizontal ? Math.abs(S.pos.x - x) : Math.abs(S.pos.z - z);
    const across = c.horizontal ? Math.abs(S.pos.z - z) : Math.abs(S.pos.x - x);
    if (along < 1.3 && across < 0.85) {
      S.stun = 0.9;
      tmp.set(c.horizontal ? c.dir : 0, 0, c.horizontal ? 0 : c.dir).multiplyScalar(7);
      S.vel.copy(tmp);
      if (S.carried > 0) { floater(`-${S.carried} SHARD${S.carried > 1 ? 'S' : ''}`, [255, 80, 90], S.pos); S.carried = 0; }
      S.trace = Math.min(100, S.trace + 20);
    }
  }

  // ---- drones
  let lit = false;
  for (const d of drones) {
    const target = d.lock > 0 ? S.pos : null;
    if (target) {
      // locked on: drift after the runner, slower than they can run
      d.g.position.x += Math.sign(S.pos.x - d.g.position.x) * Math.min(Math.abs(S.pos.x - d.g.position.x), 3.6 * dt);
      d.g.position.z += Math.sign(S.pos.z - d.g.position.z) * Math.min(Math.abs(S.pos.z - d.g.position.z), 3.6 * dt);
    } else {
      d.s += d.dir * d.v * dt;
      if (Math.abs(d.s) > EXTENT) { d.dir *= -1; d.s = Math.sign(d.s) * EXTENT; }
      const sway = Math.sin(S.t * 0.7 + d.sway) * 1.6;
      const tx = d.horizontal ? d.s : d.line + sway, tz = d.horizontal ? d.line + sway : d.s;
      d.g.position.x += (tx - d.g.position.x) * Math.min(1, dt * 2);
      d.g.position.z += (tz - d.g.position.z) * Math.min(1, dt * 2);
    }
    d.g.position.y = 8 + Math.sin(S.t * 2 + d.sway) * 0.25;
    d.pool.position.set(d.g.position.x, 0.07, d.g.position.z);
    const dist = Math.hypot(S.pos.x - d.g.position.x, S.pos.z - d.g.position.z);
    const inLight = dist < 2.6 && S.flat <= 0 && S.dash <= 0;
    if (inLight) { lit = true; d.lock = 1.6; }
    else d.lock = Math.max(0, d.lock - dt);
    const hot = d.lock > 0;
    d.poolMat.color.setHex(hot ? 0xff3355 : 0xcfefff);
    d.coneMat.color.setHex(hot ? 0xff3355 : 0xbfe8ff);
    d.poolMat.opacity = hot ? 0.55 + 0.2 * Math.sin(S.t * 20) : 0.42;
  }
  if (S.flat <= 0) {
    S.trace = lit ? Math.min(100, S.trace + 38 * dt) : Math.max(0, S.trace - 9 * dt);
    if (S.trace >= 100) {
      S.flat = 2.2;
      floater('FLATLINE', [255, 60, 80], S.pos);
      S.carried = 0;
    }
  }

  // ---- shards
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.m.rotation.y = S.t * 2 + s.ph;
    s.m.position.y = 1.3 + Math.sin(S.t * 3 + s.ph) * 0.25;
    if (S.flat <= 0 && Math.hypot(S.pos.x - s.p.x, S.pos.z - s.p.z) < 1.3) {
      scene.remove(s.g); shards.splice(i, 1);
      S.carried++;
      floater(`SHARD ${S.carried}`, [255, 210, 63], s.p);
    }
  }
  while (shards.length < 6) spawnShard();

  // ---- uplinks
  for (const u of uplinks) {
    u.halo.rotation.z = S.t * 1.5;
    u.halo.position.y = 3.4 + Math.sin(S.t * 2) * 0.2;
    u.pad.material.opacity = S.carried > 0 ? 0.45 + 0.4 * Math.sin(S.t * 8) : 0.35;
    if (S.carried > 0 && S.flat <= 0 && Math.hypot(S.pos.x - u.p.x, S.pos.z - u.p.z) < 2.7) {
      const pts = S.carried * S.carried * 100;
      S.score += pts; S.delivered += S.carried;
      floater(`UPLINK +${pts}`, [124, 255, 79], u.p);
      S.carried = 0;
      if (S.mode === 'play' && S.score > S.best) {
        S.best = S.score;
        try { localStorage.setItem('glyphcityBest', String(S.best)); } catch {}
      }
    }
  }

  for (const f of S.floaters) f.t += dt;
  S.floaters = S.floaters.filter((f) => f.t < 1.6);

  // ---- camera: follow with a little lead
  const lead = tmp.set(S.vel.x, 0, S.vel.z).multiplyScalar(0.35);
  const focus = S.pos.clone().add(lead);
  camTarget.lerp(focus, Math.min(1, dt * 3));
  camera.position.copy(camTarget).add(CAM_OFF);
  camera.lookAt(camTarget);
  city.cutaway([S.pos], camDir, dt);
}
const camTarget = S.pos.clone();
const camDir = CAM_OFF.clone().normalize();

// ---------------------------------------------------------------- HUD (text in the grid)
const WHITE = [228, 236, 255], DIM = [120, 132, 170], CYAN = [34, 240, 255], PINK = [255, 43, 214], YEL = [255, 210, 63], RED = [255, 60, 80], GRN = [124, 255, 79];
let titleCache = { rows: 0, cols: 0, lines: [] };
const pad6 = (n) => String(Math.floor(n)).padStart(6, '0');

function hud() {
  const A = ascii; const C = A.cols, Rw = A.rows;
  A.clear();
  rainStep(hudDt, C, Rw);
  if (S.mode === 'title') {
    // the logo is drawn big into a canvas and read back as characters, sized
    // so each letter is ~11 cells wide — any smaller and it stops being letters
    const big = Math.max(5, Math.min(Math.floor(Rw / 3), Math.floor((C - 6) / 11 / 0.92)));
    if (titleCache.rows !== big || titleCache.cols !== C) {
      titleCache = { rows: big, cols: C, lines: bigText('GLYPH//CITY', big) };
    }
    const L = titleCache.lines, w = L[0].length;
    const top = Math.max(2, Math.floor(Rw * 0.14));
    A.panel(0, top - 1, C, L.length + 2);
    L.forEach((line, i) => {
      for (let k = 0; k < line.length; k++) {
        const ch = line[k];
        if (ch === ' ') continue;
        const hot = Math.sin(S.t * 3 - k * 0.12 + i * 0.3) > 0.75;
        A.put(Math.floor((C - w) / 2) + k, top + i, ch.charCodeAt(0), hot ? WHITE : (k / w < 0.5 ? PINK : CYAN));
      }
    });
    const lines = [
      ['a courier in a city made of text', DIM],
      ['', DIM],
      [Math.sin(S.t * 4) > -0.3 ? '> PRESS ANY KEY  /  TAP <' : '', WHITE],
      ['', DIM],
      ['carry shards to an uplink  ·  more carried, more paid  ·  stay out of the light', DIM],
    ];
    lines.forEach(([s, rgb], i) => {
      const s2 = s.replace('·', '-').replace('·', '-');
      const row = top + L.length + 1 + i;
      if (s2) { A.panel(Math.floor((C - s2.length) / 2) - 1, row, s2.length + 2, 1); A.text(Math.floor((C - s2.length) / 2), row, s2, rgb); }
    });
    if (S.best > 0) { const s = `BEST ${pad6(S.best)}`; A.text(Math.floor((C - s.length) / 2), top + L.length + 8, s, YEL); }
  } else {
    // top bar
    A.panel(0, 0, C, 1);
    A.text(1, 0, 'GLYPH//CITY', PINK);
    A.text(14, 0, `SCORE ${pad6(S.score)}`, WHITE);
    const sh = `SHARDS ${'<>'.repeat(S.carried) || '--'}`;
    A.text(30, 0, sh, YEL);
    const bar = 12, f = Math.round(S.trace / 100 * bar);
    const tr = `TRACE [${'#'.repeat(f)}${'.'.repeat(bar - f)}]`;
    const trCol = S.trace > 66 ? (Math.sin(S.t * 18) > 0 ? RED : WHITE) : S.trace > 0 ? RED : DIM;
    if (C > 70) A.text(C - tr.length - 1, 0, tr, trCol);
    else A.text(1, 1, tr, trCol);
    if (S.flat > 0) {
      const s = '  F L A T L I N E  ';
      const row = Math.floor(Rw * 0.3);
      A.panel(Math.floor((C - s.length) / 2), row, s.length, 1);
      A.text(Math.floor((C - s.length) / 2), row, s, RED);
    }
  }
  // the bottom line: controls + the palette in force
  const hint = S.mode === 'title'
    ? `C colour: ${ascii.palette.name}   V raw 3D   [ ] density   - = zoom`
    : `WASD/stick move   SPACE/tap dash   C colour: ${ascii.palette.name}   V raw`;
  const h2 = hint.length > C - 2 ? `C colour: ${ascii.palette.name}` : hint;
  A.panel(0, Rw - 1, C, 1);
  A.text(1, Rw - 1, h2, DIM);

  // the runner IS the @ — the roguelike's oldest sprite, stood on its own body
  if (S.mode === 'play' || S.autopilot) {
    tmp.copy(S.pos); tmp.y = 2.0; tmp.project(camera);
    const c0 = Math.round((tmp.x + 1) / 2 * C - 0.5), r0 = Math.round((1 - tmp.y) / 2 * Rw - 0.5);
    if (S.flat <= 0 || Math.sin(S.t * 30) > 0) A.put(c0, r0, 64, S.stun > 0 ? RED : S.dash > 0 ? WHITE : CYAN);
  }
  // floaters: text that rises from where it happened
  for (const f of S.floaters) {
    tmp.copy(f.pos); tmp.y += f.t * 3;
    tmp.project(camera);
    const col = Math.round((tmp.x + 1) / 2 * C - f.text.length / 2);
    const row = Math.round((1 - tmp.y) / 2 * Rw);
    if (f.t < 1.2 || Math.sin(f.t * 40) > 0) A.text(col, row, f.text, f.rgb);
  }
  rainDraw(A);
  A.flush();
}
let hudDt = 1 / 60;

// ---------------------------------------------------------------- frame
function resize(w = innerWidth, h = innerHeight) {
  const dpr = CAPTURE ? 1 : Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, !CAPTURE);
  const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
  ascii.resize(bw, bh, dpr);
  const aspect = w / h;
  // portrait shows less width, so pull back a little to keep three streets in frame
  const vh = aspect < 1 ? viewH * 1.35 : viewH;
  camera.top = vh / 2; camera.bottom = -vh / 2;
  camera.left = -vh * aspect / 2; camera.right = vh * aspect / 2;
  camera.updateProjectionMatrix();
}

function render() {
  ascii.mat.uniforms.raw.value = S.raw ? 1 : 0;
  hud();
  ascii.render(scene, camera, S.t);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  step(dt);
  render();
  requestAnimationFrame(loop);
}

if (CAPTURE) {
  const w = Number(Q.get('w') || 1280), h = Number(Q.get('h') || 720);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  resize(w, h);
} else {
  resize();
  addEventListener('resize', () => resize());
  requestAnimationFrame(loop);
}

// ---------------------------------------------------------------- the seam
window.__gc = {
  THREE, scene, camera, renderer, ascii, S, city, drones, cars, shards, uplinks,
  step, render, PALETTES,
  setPalette: (i) => { S.palette = i; ascii.setPalette(i); },
  setMode: (m, autopilot = true) => { S.mode = m; S.autopilot = autopilot; },
  setZoom: (v) => { viewH = v; resize(...(CAPTURE ? [canvas.width, canvas.height] : [])); },
  start,
  // advance the game by dt and return the frame as a PNG data URL
  frame(dt = 1 / 30) { step(dt); render(); return canvas.toDataURL('image/png'); },
};
