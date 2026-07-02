import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { InputManager } from './input.js?v=3';
import { Player } from './player.js?v=3';
import { Enemy, COST } from './enemy.js?v=3';
import { ProjectilePool } from './projectile.js?v=3';
import { C, glow } from './shared.js?v=3';
import { audio } from './audio.js?v=3';

const css = h => '#' + (h >>> 0).toString(16).padStart(6, '0').slice(-6);
const ARENA_R = 47;

// ── Renderer + night scene with neon bloom ────────────────────────────────────
const gameCanvas = document.getElementById('canvas-game');
const renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
scene.fog = new THREE.Fog(C.bg, 36, 96);
const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 400);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.5, 0.0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// floor: black plane + faint white grid + faint boundary ring (sketch on black)
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(ARENA_R * 2.4, ARENA_R * 2.4),
  new THREE.MeshBasicMaterial({ color: 0x050505 })).rotateX(-Math.PI / 2));
const grid = new THREE.GridHelper(ARENA_R * 2, 40, C.dim, C.dim);
grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);
const ring = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R, 0.12, 6, 96),
  new THREE.MeshBasicMaterial({ color: 0x888888 })); ring.rotation.x = -Math.PI / 2; scene.add(ring);

// ── Terrain (vertical test geometry) ──────────────────────────────────────────
// Flat surfaces (platforms/steps) + linear ramps. heightAt() is authoritative for
// physics; glow slabs/ramps render the white-line surfaces. Spawn (0,0) stays flat.
const flats = [
  { x0: 9,   x1: 24,  z0: -25, z1: -9,  top: 3.0 },   // raised NE platform
  { x0: -25, x1: -11, z0: 9,   z1: 22,  top: 1.6 },   // low SW platform
  { x0: -6,  x1: 6,   z0: 21,  z1: 31,  top: 2.2 },   // north platform
  { x0: -9,  x1: -4,  z0: -11, z1: -6,  top: 0.7 },   // step
  { x0: 5,   x1: 10,  z0: 6,   z1: 11,  top: 0.9 },   // step
];
const ramps = [
  { x0: 13,  x1: 20,  z0: -9, z1: -1, hA: 3.0, hB: 0 },    // up to NE platform
  { x0: -22, x1: -14, z0: 6,  z1: 9,  hA: 0,   hB: 1.6 },  // up to SW platform
  { x0: -3,  x1: 3,   z0: 15, z1: 21, hA: 0,   hB: 2.2 },  // up to north platform
];
function heightAt(x, z) {
  let h = 0;
  for (const r of ramps) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
    const t = Math.min(1, Math.max(0, (z - r.z0) / (r.z1 - r.z0))); h = Math.max(h, r.hA + (r.hB - r.hA) * t);
  }
  for (const f of flats) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) h = Math.max(h, f.top);
  return h;
}
for (const f of flats) {
  const g = glow(new THREE.BoxGeometry(f.x1 - f.x0, f.top, f.z1 - f.z0));
  g.position.set((f.x0 + f.x1) / 2, f.top / 2, (f.z0 + f.z1) / 2); scene.add(g);
}
for (const r of ramps) {
  const w = r.x1 - r.x0, lenZ = r.z1 - r.z0, rise = r.hB - r.hA;
  const g = glow(new THREE.BoxGeometry(w, 0.12, Math.hypot(lenZ, rise)));
  g.position.set((r.x0 + r.x1) / 2, (r.hA + r.hB) / 2, (r.z0 + r.z1) / 2);
  g.rotation.x = -Math.atan2(rise, lenZ); scene.add(g);
}

// ── A→B objective challenge (beacon at each waypoint; reach A then B) ──────────
const OBJ_SPOTS = [
  { x: 16, z: -17 }, { x: -18, z: 15 }, { x: 0, z: 26 },     // on the platforms (need traversal)
  { x: 32, z: 18 }, { x: -32, z: -18 }, { x: 28, z: -32 }, { x: -28, z: 32 }, { x: 0, z: -38 }, { x: 36, z: -4 },
];
const BEACON_COL = 0x35f0d8;
const beacon = new THREE.Group();
const beaconCol = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 22, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: BEACON_COL, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
beaconCol.position.y = 11; beacon.add(beaconCol);
const beaconRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.16, 8, 40), new THREE.MeshBasicMaterial({ color: BEACON_COL }));
beaconRing.rotation.x = -Math.PI / 2; beaconRing.position.y = 0.12; beacon.add(beaconRing);
scene.add(beacon); beacon.visible = false;
const obj = { pts: [], idx: 0, r: 3.4 };
function placeBeacon() { const w = obj.pts[obj.idx]; beacon.position.set(w.x, heightAt(w.x, w.z), w.z); beacon.visible = true; }
function newChallenge() {
  const pool2 = OBJ_SPOTS.slice();
  const A = pool2.splice((Math.random() * pool2.length) | 0, 1)[0];
  let B; do { B = pool2[(Math.random() * pool2.length) | 0]; } while (Math.hypot(B.x - A.x, B.z - A.z) < 28);
  obj.pts = [A, B]; obj.idx = 0; placeBeacon();
  toast('CHALLENGE — REACH A', BEACON_COL);
}
function objectiveUpdate(dt) {
  beacon.rotation.y += dt * 0.8;
  beaconRing.scale.setScalar(1 + Math.sin(performance.now() / 300) * 0.05);
  const w = obj.pts[obj.idx];
  if (Math.hypot(player.x - w.x, player.z - w.z) < obj.r) {
    if (obj.idx === 0) { obj.idx = 1; placeBeacon(); toast('REACH B', BEACON_COL); audio.objective(0); }
    else {
      challenges++; player.heal(30);
      burst(w.x, heightAt(w.x, w.z) + 1, w.z, BEACON_COL, 18);
      toast('CHALLENGE COMPLETE  +heal', C.hp); audio.objective(1);
      newChallenge();
    }
  }
}

// ── Objects ───────────────────────────────────────────────────────────────────
const input = new InputManager(gameCanvas);
const pool = new ProjectilePool(scene);
const player = new Player(scene, pool);
let enemies = [];

// ── Run state ─────────────────────────────────────────────────────────────────
let gameState = 'title';     // title | playing | paused | gameover
let runTime = 0, kills = 0, shake = 0, restartTimer = 0, fovKick = 0, challenges = 0;
let credits = 0, spawnCD = 0, nextBoss = 65, bossAlive = false;
let toasts = [];
let best = parseFloat(localStorage.getItem('skltrBestTime') || '0');

const PHASES = [[25, 'CALM', 0x9be7b0], [60, 'RISING', 0x9bc7ff], [110, 'FRENZY', 0xffd36b],
                [170, 'OVERLOAD', 0xff9a3a], [1e9, 'NIGHTMARE', 0xff5a6b]];
function phase() { for (const p of PHASES) if (runTime < p[0]) return p; return PHASES[PHASES.length - 1]; }
function scaling() { return { hpMul: 1 + runTime * 0.011, dmgMul: 0.55 + runTime * 0.008 }; }

// ── HUD / overlay ─────────────────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx = uiCanvas.getContext('2d');
const overlay = document.getElementById('overlay');
function showOverlay(h) { overlay.innerHTML = h; overlay.style.display = 'block'; }
function fmt(s) { const m = (s / 60) | 0, ss = (s % 60) | 0; return `${m}:${ss.toString().padStart(2, '0')}`; }
function toast(t, c) { toasts.push({ t, c, life: 2.6 }); }

function showTitle() {
  showOverlay(
    `<div style="font-size:64px;font-weight:bold;letter-spacing:10px;color:#9bfff0">SKLTR</div>` +
    `<div style="font-size:13px;opacity:.6;margin:8px 0 22px">neon survival — dodge the storm, ride the adrenaline</div>` +
    `<div style="font-size:15px">CLICK / TAP / ENTER to drop in</div>` +
    `<div style="font-size:12px;opacity:.55;margin-top:16px;line-height:1.7">` +
    `WASD move · mouse aim (look anywhere) · auto-fire on target (hold LMB to force)<br>` +
    `SPACE jump / double-jump · Q dash · SHIFT sprint · T auto-aim · ESC pause<br>` +
    `<span style="opacity:.85">Touch: left move · right aim · tap = jump / double-jump · swipe = dash</span></div>`);
}
function showPause() { showOverlay(`<div style="font-size:42px;font-weight:bold">PAUSED</div><div style="font-size:13px;opacity:.5;margin-top:10px">ESC to resume</div>`); }
function showGameOver() {
  const rec = runTime >= best;
  showOverlay(
    `<div style="font-size:44px;font-weight:bold;letter-spacing:3px;color:#ff7aa0">DOWN</div>` +
    `<div style="font-size:20px;margin-top:10px;color:#9bfff0">survived ${fmt(runTime)} · ${kills} kills</div>` +
    (rec ? `<div style="font-size:15px;color:${css(C.adr)};margin-top:6px">NEW BEST!</div>` : `<div style="font-size:12px;opacity:.5;margin-top:6px">best ${fmt(best)}</div>`) +
    `<div style="font-size:13px;opacity:.4;margin-top:16px">Restarting…  ·  CLICK / TAP / ENTER to retry</div>`);
}

// ── Flow ──────────────────────────────────────────────────────────────────────
function startGame() {
  overlay.style.display = 'none';
  runTime = 0; kills = 0; shake = 0; credits = 0; spawnCD = 0; nextBoss = 65; bossAlive = false; toasts = []; challenges = 0;
  for (const e of enemies) e.dispose(); enemies = []; pool.clear();
  player.reset(); newChallenge();
  gameState = 'playing'; audio.start();
}
function gameOver() {
  gameState = 'gameover'; shake = 1; restartTimer = 3.6;
  if (runTime > best) { best = runTime; localStorage.setItem('skltrBestTime', best.toFixed(1)); }
  audio.gameover(); showGameOver();
}

// ── Spawn director ────────────────────────────────────────────────────────────
function spawnAt(type, dist = 26) {
  const e = new Enemy(scene, type, scaling());
  const a = Math.random() * Math.PI * 2, r = dist + Math.random() * 8;
  let x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
  x = Math.max(-ARENA_R + 2, Math.min(ARENA_R - 2, x)); z = Math.max(-ARENA_R + 2, Math.min(ARENA_R - 2, z));
  e.place(x, z); enemies.push(e);
  if (e.boss) { bossAlive = true; audio.bossSpawn(); }
  return e;
}
function pickType() {
  const r = Math.random();
  if (runTime > 22 && r < 0.16) return 'flyer';
  if (runTime > 8 && r < 0.44) return 'turret';
  return 'chaser';
}
function director(dt) {
  credits += dt * (2.4 + runTime * 0.05);
  const cap = 9 + Math.floor(runTime / 11);
  spawnCD -= dt;
  if (spawnCD <= 0 && enemies.length < cap) {
    spawnCD = Math.max(0.35, 1.15 - runTime * 0.004);
    const type = pickType(), cost = COST[type];
    if (credits >= cost) { credits -= cost; spawnAt(type); }
  }
  if (runTime >= nextBoss && !bossAlive) { spawnAt('boss', 30); toast('BOSS INBOUND', C.boss); nextBoss += 95; }
}

// distance from point P to the segment A→B (swept collision, prevents tunneling)
function segDist(ax, ay, az, bx, by, bz, px, py, pz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const l2 = dx * dx + dy * dy + dz * dz;
  let t = l2 > 1e-9 ? ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t), pz - (az + dz * t));
}
// ── Collisions (3D, swept) ────────────────────────────────────────────────────
function collide() {
  for (let i = pool.active.length - 1; i >= 0; i--) {
    const p = pool.active[i];
    if (p.fromPlayer) {
      let consumed = false;
      for (const e of enemies) {
        if (!e.alive || (p.hitSet && p.hitSet.has(e))) continue;
        if (segDist(p.px, p.py, p.pz, p.x, p.y, p.z, e.x, e.y, e.z) > e.r + p.r) continue;
        const dead = e.takeDamage(p.damage);
        if (dead) onKill(e);
        if (p.pierce > 0) { p.pierce--; (p.hitSet || (p.hitSet = new Set())).add(e); } else consumed = true;
        break;
      }
      if (consumed) pool.recycle(i);
    } else {
      if (segDist(p.px, p.py, p.pz, p.x, p.y, p.z, player.x, 1.0, player.z) < 0.85 + p.r) {
        const hpb = player.hp; player.hurt(p.damage); pool.recycle(i);
        if (player.hp < hpb) shake = Math.max(shake, 0.55);
        if (!player.alive) { gameOver(); return; }
      }
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) { enemies[i].dispose(); enemies.splice(i, 1); }
}
function onKill(e) {
  kills++; audio.kill();
  const before = player.adr; player.addKill();
  if (player.adr > before) { audio.adrenaline(player.adr); toast(`ADRENALINE ${player.adr}`, C.adr); }
  if (e.boss) { bossAlive = false; toast('BOSS DOWN', C.adr); }
  burst(e.x, e.y, e.z, C.line);
}

// ── Hit sparks ────────────────────────────────────────────────────────────────
let sparks = [];
function burst(x, y, z, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z); scene.add(m);
    const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2, s = 3 + Math.random() * 5;
    sparks.push({ m, vx: Math.cos(a) * Math.cos(e) * s, vy: Math.sin(e) * s + 2, vz: Math.sin(a) * Math.cos(e) * s, life: 0.5 });
  }
}
function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]; s.life -= dt; s.vy -= 14 * dt;
    s.m.position.x += s.vx * dt; s.m.position.y += s.vy * dt; s.m.position.z += s.vz * dt;
    if (s.life <= 0) { scene.remove(s.m); sparks.splice(i, 1); }
  }
}

// ── Input wiring ──────────────────────────────────────────────────────────────
function dashDir() {                     // world dir from move input, else aim-forward
  const mv = input.getMove();
  if (Math.hypot(mv.x, mv.z) > 0.1) {
    const s = Math.sin(input.yaw), c = Math.cos(input.yaw);
    let x = -s * mv.z + c * mv.x, z = -c * mv.z - s * mv.x; const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l };
  }
  const l = Math.hypot(_aim.fx, _aim.fz) || 1; return { x: _aim.fx / l, z: _aim.fz / l };
}
function screenToWorld(sx, sy) {         // swipe screen dir → world dir (camera-relative)
  const s = Math.sin(input.yaw), c = Math.cos(input.yaw);
  let x = (-s) * (-sy) + c * sx, z = (-c) * (-sy) + (-s) * sx; const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l };
}
function didDash() { audio.dash(); fovKick = 1; }   // dash feedback: whoosh + camera punch
input.onTap = () => {                    // tap: jump on ground, double-jump in the air
  if (gameState !== 'playing') return;
  if (player.grounded()) { if (player.jump()) audio.jump(); }
  else if (player.doubleJump()) audio.jump();
};
input.onSwipe = (sx, sy) => {            // swipe/flick: dash in the flicked direction
  if (gameState !== 'playing') return;
  const d = screenToWorld(sx, sy);
  if (player.grounded() ? player.groundDash(d) : player.airDash(d)) didDash();
};
input.onDashKey = () => {                // desktop Q
  if (gameState !== 'playing') return;
  if (player.grounded() ? player.groundDash(dashDir()) : player.airDash(dashDir())) didDash();
};
input.onToggleAim = () => { player.autoAim = !player.autoAim; toast(player.autoAim ? 'AUTO-AIM ON' : 'AUTO-AIM OFF', C.adr); };
input.onStart = () => { if (gameState === 'title' || gameState === 'gameover') startGame(); };
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused'; showPause(); }
  else if (gameState === 'paused') { overlay.style.display = 'none'; gameState = 'playing'; }
  else if (gameState === 'title') startGame();
};
addEventListener('touchend', () => { if (gameState === 'title' || gameState === 'gameover') startGame(); });

// ── Camera (free-look over-the-shoulder; aim any direction) ────────────────────
const _aim = { fx: 0, fy: 0, fz: -1, yaw: 0, pitch: 0 };
function computeAim() {
  const y = input.yaw, p = input.pitch, cp = Math.cos(p);
  _aim.yaw = y; _aim.pitch = p;
  _aim.fx = -Math.sin(y) * cp; _aim.fy = Math.sin(p); _aim.fz = -Math.cos(y) * cp;
  return _aim;
}
function updateCamera() {
  const a = _aim, dist = 5.6, shoulder = 0.8;
  const cp = Math.cos(a.pitch);
  const rx = Math.cos(a.yaw), rz = -Math.sin(a.yaw);        // camera-right (horizontal)
  let sx = 0, sy = 0;
  if (shake > 0) { const m = shake * shake, t = performance.now() / 1000; sx = Math.sin(t * 53) * m * 0.5; sy = Math.cos(t * 47) * m * 0.5; }
  const hx = player.x, hy = player.y + 1.5, hz = player.z;
  const camY = Math.max(1.0, hy - a.fy * dist + 0.25 + sy);   // never dip below the floor
  camera.position.set(hx - a.fx * dist + rx * shoulder * cp + sx, camY, hz - a.fz * dist + rz * shoulder * cp);
  camera.lookAt(camera.position.x + a.fx, camera.position.y + a.fy, camera.position.z + a.fz);
  const fov = 66 + fovKick * 7;                              // dash punch
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function bar(x, y, w, h, k, color) {
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, k)), h);
}
const _v = new THREE.Vector3();
function enemyBars() {
  for (const e of enemies) {
    if (!e.alive || (!e.boss && e.type === 'chaser')) continue;
    _v.set(e.x, e.y + e.r + 0.5, e.z).project(camera);
    if (_v.z > 1) continue;
    const sx = (_v.x * .5 + .5) * uiCanvas.width, sy = (-_v.y * .5 + .5) * uiCanvas.height;
    const w = e.boss ? 160 : 34, h = e.boss ? 7 : 4;
    bar(sx - w / 2, sy, w, h, e.hp / e.maxHp, css(e.boss ? 0xff6b7e : 0xffffff));
  }
}
function drawObjective(W, H) {
  const w = obj.pts[obj.idx]; if (!w) return;
  const label = obj.idx === 0 ? 'A' : 'B';
  _v.set(w.x, heightAt(w.x, w.z) + 2.4, w.z).project(camera);
  const onScreen = _v.z < 1 && Math.abs(_v.x) < 0.96 && Math.abs(_v.y) < 0.96;
  ctx.fillStyle = css(BEACON_COL); ctx.strokeStyle = css(BEACON_COL); ctx.lineWidth = 2; ctx.textAlign = 'center';
  if (onScreen) {
    const sx = (_v.x * .5 + .5) * W, sy = (-_v.y * .5 + .5) * H;
    ctx.beginPath(); ctx.arc(sx, sy, 12, 0, 7); ctx.stroke();
    ctx.font = 'bold 13px monospace'; ctx.fillText(label, sx, sy + 4);
  } else {
    const camAng = Math.atan2(-Math.cos(input.yaw), -Math.sin(input.yaw));
    const bearing = Math.atan2(w.z - player.z, w.x - player.x) - camAng;
    const r = Math.min(W, H) * 0.34, ax = W / 2 + Math.sin(bearing) * r, ay = H / 2 - Math.cos(bearing) * r;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(bearing);
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(9, 8); ctx.lineTo(-9, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  const dist = Math.hypot(player.x - w.x, player.z - w.z) | 0;
  ctx.font = 'bold 13px monospace'; ctx.fillText(`REACH ${label}  ·  ${dist}m`, W / 2, H - 42);
}
function reticle(W, H) {
  const locked = player._target;
  const col = locked ? 0xff6b7e : (player.adr > 0 ? C.adr : C.player);
  ctx.strokeStyle = css(col); ctx.lineWidth = 2;
  const cx = W / 2, cy = H / 2, o = locked ? 15 : 12;
  ctx.beginPath();
  ctx.moveTo(cx - o, cy); ctx.lineTo(cx - 5, cy); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + o, cy);
  ctx.moveTo(cx, cy - o); ctx.lineTo(cx, cy - 5); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + o);
  ctx.stroke();
  if (locked) { ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.stroke(); }   // lock ring
  ctx.fillStyle = css(col); ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, 7); ctx.fill();
  if (player.autoAim) { ctx.fillStyle = 'rgba(205,234,255,.4)'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('AUTO', cx, cy + 30); }
  // dash-cooldown ring around the reticle
  const k = 1 - player.dashCD / 1.1;
  ctx.strokeStyle = k >= 1 ? css(C.player) : 'rgba(180,200,255,.5)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, k)); ctx.stroke();
}
function drawHUD() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
  const W = uiCanvas.width, H = uiCanvas.height;
  input.btns = [];
  if (gameState !== 'playing' && gameState !== 'paused') return;

  enemyBars();
  drawObjective(W, H);
  reticle(W, H);

  // health + adrenaline (top-left)
  ctx.textAlign = 'left';
  bar(16, 16, 240, 16, player.hp / player.maxHp, css(C.hp));
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.strokeRect(16, 16, 240, 16);
  ctx.fillStyle = '#cdeaff'; ctx.font = 'bold 11px monospace'; ctx.fillText(`${Math.ceil(player.hp)}`, 22, 28);
  ctx.fillStyle = player.adr > 0 ? css(C.adr) : 'rgba(205,234,255,.4)'; ctx.font = 'bold 10px monospace';
  ctx.fillText('ADRENALINE', 16, 50);
  for (let i = 0; i < 5; i++) { const px = 16 + i * 16;
    ctx.beginPath(); ctx.rect(px, 56, 12, 8);
    if (i < player.adr) { ctx.fillStyle = css(C.adr); ctx.fill(); }
    ctx.strokeStyle = 'rgba(205,234,255,.35)'; ctx.lineWidth = 1; ctx.stroke(); }

  // time + phase (top-center)
  const ph = phase();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cdeaff'; ctx.font = 'bold 22px monospace'; ctx.fillText(fmt(runTime), W / 2, 30);
  ctx.fillStyle = css(ph[2]); ctx.font = 'bold 13px monospace'; ctx.fillText(ph[1], W / 2, 50);

  // kills + best (top-right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#cdeaff'; ctx.font = 'bold 18px monospace'; ctx.fillText(`${kills} kills`, W - 16, 28);
  ctx.fillStyle = css(BEACON_COL); ctx.font = 'bold 12px monospace'; ctx.fillText(`${challenges} runs`, W - 16, 46);
  if (best > 0) { ctx.fillStyle = 'rgba(205,234,255,.5)'; ctx.font = '11px monospace'; ctx.fillText(`best ${fmt(best)}`, W - 16, 62); }

  // toasts
  ctx.textAlign = 'center'; ctx.font = 'bold 15px monospace';
  toasts.forEach((t, i) => { ctx.globalAlpha = Math.min(1, t.life); ctx.fillStyle = css(t.c); ctx.fillText(t.t, W / 2, H * 0.3 + i * 22); ctx.globalAlpha = 1; });

  if (input.isTouch) drawTouchUI(W, H);
}
function drawStick(s, dx, dy) {
  const bx = s.active ? s.ox : dx, by = s.active ? s.oy : dy, R = 60, kr = 26;
  ctx.beginPath(); ctx.arc(bx, by, R, 0, 7); ctx.strokeStyle = 'rgba(205,234,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
  const cl = v => Math.max(-R, Math.min(R, v));
  ctx.beginPath(); ctx.arc(bx + cl(s.dx), by + cl(s.dy), kr, 0, 7); ctx.fillStyle = s.active ? 'rgba(120,240,230,.4)' : 'rgba(205,234,255,.14)'; ctx.fill();
}
function drawTouchUI(W, H) {
  drawStick(input.left, W * 0.2, H * 0.74);
  drawStick(input.look, W * 0.8, H * 0.74);
  ctx.fillStyle = 'rgba(205,234,255,.35)'; ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.fillText('❙❙', W / 2, 40);
  // gesture hints (tap = jump/air-dash · swipe = dash)
  ctx.fillStyle = 'rgba(205,234,255,.3)'; ctx.font = '10px monospace';
  ctx.fillText('tap: jump / double-jump    swipe: dash', W / 2, H - 12);
}

// ── Loop ──────────────────────────────────────────────────────────────────────
let prev = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(); const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
  if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
  if (fovKick > 0) fovKick = Math.max(0, fovKick - dt * 4);
  for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].life -= dt; if (toasts[i].life <= 0) toasts.splice(i, 1); }
  computeAim();

  if (gameState === 'playing') {
    runTime += dt;
    input.updateLook(dt);
    player.update(dt, input, _aim, enemies, heightAt);
    if (player._fired) audio.shoot();
    if (player.dashing) {                       // fading dash streak
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 3), new THREE.MeshBasicMaterial({ color: C.player, transparent: true }));
      m.position.set(player.x, player.y + 0.8, player.z); scene.add(m);
      sparks.push({ m, vx: 0, vy: 0, vz: 0, life: 0.3 });
    }
    for (const e of enemies) e.update(dt, player, pool, heightAt);
    pool.update(dt);
    collide();
    director(dt);
    objectiveUpdate(dt);
    updateSparks(dt);
  } else {
    if (gameState === 'gameover') { restartTimer -= dt; updateSparks(dt); if (restartTimer <= 0) startGame(); }
    player.fig.group.position.set(player.x, player.y, player.z);
    player.fig.group.rotation.y = input.yaw + Math.PI;     // face the camera on the title screen
    player.fig.update(dt, { speed: 0, aimPitch: 0 });
  }

  updateCamera();
  composer.render();
  drawHUD();
}

// ── Resize / boot ─────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  uiCanvas.width = innerWidth; uiCanvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();
showTitle();
loop();
