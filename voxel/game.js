'use strict';
// ─── SUDS JACK — VOXEL ────────────────────────────────────────────────────────
// 5 half-pipes side by side · Comanche-style voxel terrain · true 1/z projection
// Movement is Tiny Wings: ride the trough, launch off the ridge, land downhill.
// Suda 51 aesthetic: black/red/white/cyan, scanlines, graphic type

// ─── Canvas ───────────────────────────────────────────────────────────────────
const LW = 320, LH = 180;
const off = document.createElement('canvas');
off.width = LW; off.height = LH;
const g = off.getContext('2d');
g.imageSmoothingEnabled = false;

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  const s = Math.min(window.innerWidth / LW, window.innerHeight / LH);
  canvas.width  = Math.floor(LW * s);
  canvas.height = Math.floor(LH * s);
  ctx.imageSmoothingEnabled = false;
}
resize();
window.addEventListener('resize', resize);

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  BG:'#000000', SKY:'#05000c',
  RIM:'#00d4ff', PL:'#ff0000', PLH:'#ff6666', PLD:'#660000',
  BLT:'#ffee00', E1:'#ffffff', E2:'#00ffff', E3:'#ff44ff',
  HW:'#ffffff', HR:'#ff0000', HC:'#00ffff', HY:'#ffff00', DIM:'#222222',
};

// ─── World: 5 half-pipes side by side ─────────────────────────────────────────
// Terrain height depends on X only, so the ridges run straight into the
// distance and converge on the vanishing point — the part the vector build
// got right. Troughs sit at pipe centres, ridges exactly between them.
const NPIPES = 5;
const PITCH  = 54;                    // world units between pipe centres
const DEPTH  = 17;                    // ridge height above trough floor
const XMIN   = -(NPIPES / 2) * PITCH;
const XMAX   =  (NPIPES / 2) * PITCH;

const TWO_PI_P = Math.PI * 2 / PITCH;
function terrainH(x)     { return DEPTH * 0.5 * (1 - Math.cos(x * TWO_PI_P)); }
function terrainSlope(x) { return DEPTH * 0.5 * TWO_PI_P * Math.sin(x * TWO_PI_P); }
function terrainCurv(x)  { return DEPTH * 0.5 * TWO_PI_P * TWO_PI_P * Math.cos(x * TWO_PI_P); }
function pipeCenter(i)   { return (i - (NPIPES - 1) / 2) * PITCH; }
function pipeAt(x)       { return Math.max(0, Math.min(NPIPES - 1,
                             Math.round(x / PITCH + (NPIPES - 1) / 2))); }

// ─── Projection: true perspective divide ──────────────────────────────────────
const PSCALE  = 7.6;
const NEARZ   = 6.2;
const HORIZON = 52;                   // screen Y the world converges to
const CAMH    = 34;                   // camera height above trough floor
const VPX     = LW / 2;
const ZFAR    = 150;                  // furthest slice drawn
const ZSTEP   = 1.6;

function pAt(z)  { return PSCALE / (z + NEARZ); }
function proj(wx, wy, wz) {
  const p = pAt(wz);
  return { x: VPX + (wx - camWX) * p, y: HORIZON + (CAMH - wy) * p, p };
}

// ─── State ────────────────────────────────────────────────────────────────────
let state = 'title';
let score = 0, hi = 0, lives = 3, frame = 0, scroll = 0;
let camWX = 0, camT = 0;

const PL = {
  x: 0, y: 0,            // world X, height above trough floor
  vx: 0, vy: 0,
  air: false,
  floats: 0,             // remaining mid-air float impulses
  inv: 0, zapCD: 0,
  airTime: 0, bestAir: 0, combo: 0,
};

const GRAV      = 0.16;   // world units / frame²
const ACCEL     = 0.075;  // stick acceleration
const FRIC      = 0.992;
const MAXVX     = 3.2;
const JUMP_V    = 2.6;    // flat hop — just clears a ridge
const LAUNCH_GAIN = 0.55; // how much climbing speed converts into height
const FLOAT_IMP = 1.15;   // impulse per mid-air press
const MAX_FLOAT = 3;
const HOLD_G    = 0.62;   // gravity multiplier while jump held and rising slowly
const LAUNCH_MIN= 0.55;   // min |vx| to auto-launch off a crest
const FIRE_INT  = 130;
let fireCD = 0;

const bullets = [], enemies = [], particles = [], rings = [];
let flashCol = null, flashAlpha = 0;
let shakeT = 0, shakeMag = 0;

// ─── Input ────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  if (!keys[e.code]) { keys[e.code] = true; onKey(e.code); }
  if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function onKey(code) {
  if ((state === 'title' || state === 'gameover') && code === 'Enter') return startGame();
  if (state === 'playing') {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') tryJump();
    if (code === 'KeyZ') tryZap();
  }
}

const T = { left:false, right:false, jump:false };
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (state !== 'playing') return startGame();
  for (const t of e.changedTouches) {
    const x = t.clientX / window.innerWidth, y = t.clientY / window.innerHeight;
    if (y > 0.55) { if (x < 0.35) T.left = true; else if (x > 0.65) T.right = true; else tryZap(); }
    else { T.jump = true; tryJump(); }
  }
}, { passive:false });
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  T.left = T.right = T.jump = false;
  for (const t of e.touches) {
    const x = t.clientX / window.innerWidth, y = t.clientY / window.innerHeight;
    if (y > 0.55) { if (x < 0.35) T.left = true; else if (x > 0.65) T.right = true; }
  }
}, { passive:false });

// ─── Gamepad: left stick to carve, one button to jump ─────────────────────────
const PAD = { on:false, ax:0, jump:false, prev:[] };
const PAD_DZ = 0.30;

function pollPad() {
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of list) if (p && p.connected) { gp = p; break; }
  PAD.on = !!gp;
  if (!gp) { PAD.ax = 0; PAD.jump = false; PAD.prev = []; return; }

  const down = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const hit  = i => down(i) && !PAD.prev[i];
  let ax = gp.axes[0] || 0;
  if (Math.abs(ax) < PAD_DZ) ax = 0;
  else ax = (ax - Math.sign(ax) * PAD_DZ) / (1 - PAD_DZ);   // rescale past deadzone
  if (down(14)) ax = -1;
  if (down(15)) ax =  1;

  PAD.ax   = ax;
  PAD.jump = down(0) || down(12);

  if (state === 'playing') {
    if (hit(0) || hit(12)) tryJump();
    if (hit(1) || hit(2) || hit(5) || hit(7)) tryZap();
  } else if (hit(0) || hit(9)) startGame();

  PAD.prev = gp.buttons.map(b => b.pressed);
}
window.addEventListener('gamepadconnected',    () => { PAD.on = true; });
window.addEventListener('gamepaddisconnected', () => { PAD.on = false; PAD.prev = []; });

// ─── Actions ──────────────────────────────────────────────────────────────────
function tryJump() {
  if (PL.air) {
    // Repeated presses give small float impulses — hang time, not a second jump
    if (PL.floats > 0) {
      PL.floats--;
      PL.vy = Math.max(PL.vy, 0) + FLOAT_IMP;
      puff(PL.x, PL.y, 5, '#66557f');
    }
    return;
  }
  // Grounded: launch along the surface tangent, so jumping while climbing the
  // ridge converts your speed into height — the ski-jump beat.
  const s = terrainSlope(PL.x);
  PL.vy  = JUMP_V + Math.max(0, s * PL.vx) * LAUNCH_GAIN;
  PL.air = true;
  PL.floats = MAX_FLOAT;
  PL.airTime = 0;
  puff(PL.x, PL.y, 7, '#3a3a5c');
}

function tryZap() {
  if (PL.zapCD > 0) return;
  PL.zapCD = 8000;
  enemies.forEach(e => burst(e, 14));
  score += enemies.length * 150;
  enemies.length = 0;
  flashCol = '#ffffff'; flashAlpha = 0.8;
  shake(6, 260);
}

function startGame() {
  score = 0; lives = 3; frame = 0; scroll = 0; camT = 0;
  enemies.length = 0; bullets.length = 0; particles.length = 0; rings.length = 0;
  Object.assign(PL, { x:0, y:0, vx:0, vy:0, air:false, floats:0, inv:0, zapCD:0,
                      airTime:0, bestAir:0, combo:0 });
  PL.y  = terrainH(PL.x);
  camWX = PL.x;
  fireCD = 0; flashCol = null; flashAlpha = 0; shakeT = 0;
  state = 'playing';
}

function shake(mag, ms) { shakeMag = mag; shakeT = ms; }

// ─── Particles / VFX ──────────────────────────────────────────────────────────
function chunk(sx, sy, vx, vy, col, sz, life) {
  particles.push({ x:sx, y:sy, vx, vy, life, col, sz, dsz:-sz/life, grav:0.18 });
}
function puff(wx, wy, n, col) {
  const p = proj(wx, wy, 0);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 0.4 + Math.random() * 1.6;
    chunk(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp - 0.8, col,
          Math.round(2 + Math.random() * 3), 10 + Math.random() * 8);
  }
}
function burst(e, n) {
  const p = proj(e.x, e.y, e.z);
  const sc = Math.max(0.5, p.p / pAt(0));
  for (let i = 0; i < Math.max(4, n * 0.5); i++) {
    const a = Math.random() * Math.PI * 2, sp = 1.2 + Math.random() * 2.5;
    chunk(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp - 1.5, e.col,
          Math.round((4 + Math.random() * 4) * Math.min(1.5, sc + 0.6)),
          22 + Math.random() * 14);
  }
  for (let i = 0; i < n * 0.7; i++) {
    const a = Math.random() * Math.PI * 2, sp = 0.5 + Math.random() * 3.5;
    chunk(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp - 2,
          Math.random() < 0.5 ? e.col : '#ffffff', 2, 12 + Math.random() * 10);
  }
}

// ─── Enemies ──────────────────────────────────────────────────────────────────
const ETYPES = [
  { kind:'grunt',   col:C.E1, speed:0.62, hp:1, pts:100 },
  { kind:'flipper', col:C.E2, speed:0.50, hp:1, pts:150 },
  { kind:'tanker',  col:C.E3, speed:0.38, hp:2, pts:350 },
];
function spawnWave() {
  const lvl = Math.floor(frame / 1800);
  const n = 2 + Math.min(lvl, 4);
  for (let i = 0; i < n; i++) {
    const roll = Math.random() * (1.5 + lvl * 0.4);
    const et = ETYPES[roll < 1 ? 0 : roll < 2 ? 1 : 2];
    const pipe = Math.floor(Math.random() * NPIPES);
    const x = pipeCenter(pipe) + (Math.random() - 0.5) * PITCH * 0.5;
    enemies.push({ kind:et.kind, col:et.col, hp:et.hp, pts:et.pts,
      x, tx:x, y:0, z: ZFAR * (0.55 + Math.random() * 0.4),
      speed: et.speed * (1 + lvl * 0.1), pipe,
      flipCD: 600 + Math.random() * 700, dir: Math.random() < 0.5 ? -1 : 1 });
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────
let lastTS = 0;

function update(dt) {
  if (state !== 'playing') return;
  frame++;
  const f = dt / 16.67;                      // frame-normalised step
  scroll = (scroll + dt * 0.012) % 1000;

  // ── Lateral input: stick is analog, keys/touch are full deflection ──
  let mx = PAD.ax;
  if (keys['ArrowLeft']  || keys['KeyA'] || T.left)  mx = -1;
  if (keys['ArrowRight'] || keys['KeyD'] || T.right) mx =  1;

  const holdJump = keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || T.jump || PAD.jump;

  if (PL.air) {
    // ── Ballistic. Hold jump near apex to stretch the arc (float) ──
    let gmul = 1;
    if (holdJump && PL.vy < 1.2) gmul = HOLD_G;
    PL.vy -= GRAV * gmul * f;
    PL.y  += PL.vy * f;
    PL.vx += mx * ACCEL * 0.45 * f;          // limited air steering
    PL.x  += PL.vx * f;
    PL.airTime += dt;

    const ground = terrainH(PL.x);
    if (PL.y <= ground && PL.vy <= 0) {
      // ── Landing. Downhill in your direction of travel = keep speed and
      //    build combo; slamming into an upslope scrubs it off. ──
      PL.y = ground; PL.air = false;
      const s = terrainSlope(PL.x);
      const downhill = (PL.vx > 0 && s < 0) || (PL.vx < 0 && s > 0);
      const clean = downhill && Math.abs(s) > 0.25;

      if (clean) {
        PL.vx *= 1.14;
        PL.combo++;
        const gain = Math.round(60 + PL.airTime * 0.55 + PL.combo * 40);
        score += gain;
        rings.push({ x:PL.x, y:PL.y, t:0, txt:`+${gain}` });
        puff(PL.x, PL.y, 10, C.HY);
      } else {
        PL.vx *= 0.55;
        PL.combo = 0;
        puff(PL.x, PL.y, 7, '#3a3a5c');
      }
      PL.bestAir = Math.max(PL.bestAir, PL.airTime);
      if (PL.airTime > 500) shake(3, 160);
      PL.airTime = 0;
    }
  } else {
    // ── On the surface: gravity pulls you down the slope, stick adds energy ──
    const s = terrainSlope(PL.x);
    const ax = -GRAV * s / (1 + s * s) + mx * ACCEL;
    PL.vx += ax * f;
    PL.vx *= Math.pow(FRIC, f);
    PL.vx  = Math.max(-MAXVX, Math.min(MAXVX, PL.vx));
    PL.x  += PL.vx * f;
    PL.y   = terrainH(PL.x);

    // Auto-launch: cresting a ridge fast throws you off the lip on your own.
    const s2 = terrainSlope(PL.x);
    const vyImplied = s2 * PL.vx;
    if (vyImplied > 0.12 && terrainCurv(PL.x) < 0 && Math.abs(PL.vx) > LAUNCH_MIN) {
      PL.air = true;
      PL.vy = vyImplied;
      PL.floats = MAX_FLOAT;
      PL.airTime = 0;
    }
  }

  // Outer walls of the outermost pipes
  if (PL.x < XMIN) { PL.x = XMIN; PL.vx = Math.abs(PL.vx) * 0.4; }
  if (PL.x > XMAX) { PL.x = XMAX; PL.vx = -Math.abs(PL.vx) * 0.4; }

  // ── Camera follows the rider, with a little drift ──
  camT += dt * 0.00065;
  const camTarget = PL.x + PL.vx * 6 + Math.sin(camT) * 3.5;
  camWX += (camTarget - camWX) * Math.min(1, 0.06 * f);

  // ── Timers ──
  if (PL.inv   > 0) PL.inv   -= dt;
  if (PL.zapCD > 0) PL.zapCD -= dt;
  if (fireCD   > 0) fireCD   -= dt;
  if (shakeT   > 0) shakeT   -= dt;
  if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt * 0.004);

  // ── Auto-fire forward ──
  if (fireCD <= 0) { bullets.push({ x:PL.x, y:PL.y + 4, z:0 }); fireCD = FIRE_INT; }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.z += 3.4 * f;
    if (b.z > ZFAR) { bullets.splice(i, 1); continue; }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.abs(e.z - b.z) < 4 && Math.abs(e.x - b.x) < 9) {
        if (--e.hp <= 0) {
          burst(e, 12); score += e.pts;
          if (e.kind === 'tanker') {
            for (const o of [-1, 1]) {
              const nx = e.x + o * PITCH * 0.3;
              enemies.push({ kind:'grunt', col:C.E1, hp:1, pts:100, x:nx, tx:nx,
                y:0, z:e.z, speed:0.62, pipe:pipeAt(nx), flipCD:600, dir:o });
            }
          }
          enemies.splice(j, 1);
        }
        bullets.splice(i, 1);
        break;
      }
    }
  }

  // ── Enemies ride the terrain toward you ──
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.z -= e.speed * f;
    if (e.kind === 'flipper') {
      e.flipCD -= dt;
      if (e.flipCD <= 0) {
        let np = e.pipe + e.dir;
        if (np < 0 || np >= NPIPES) { e.dir *= -1; np = e.pipe + e.dir; }
        e.pipe = np; e.tx = pipeCenter(np);
        e.flipCD = 500 + Math.random() * 600;
      }
      e.x += (e.tx - e.x) * Math.min(1, 0.05 * f);
    }
    e.y = terrainH(e.x);
    if (e.z <= 0) {
      if (Math.abs(e.x - PL.x) < 11 && Math.abs(e.y - PL.y) < 14 && PL.inv <= 0) {
        lives--; PL.inv = 2200; PL.combo = 0;
        flashCol = '#ff0000'; flashAlpha = 0.45; shake(7, 300);
        puff(PL.x, PL.y, 16, C.PL);
        if (lives <= 0) { hi = Math.max(hi, score); state = 'gameover'; }
      }
      enemies.splice(i, 1);
    }
  }

  // ── Particles / score popups ──
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * f; p.y += p.vy * f; p.vy += p.grav * f;
    p.sz = Math.max(0, p.sz + p.dsz * f);
    p.life -= f;
    if (p.life <= 0 || p.sz <= 0) particles.splice(i, 1);
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].t += dt;
    if (rings[i].t > 900) rings.splice(i, 1);
  }

  const wInt = Math.max(90, 200 - Math.floor(frame / 1800) * 16);
  if (frame % wInt === 0) spawnWave();
}

// ─── Terrain colour LUT ───────────────────────────────────────────────────────
// Precomputed so the column march never builds strings.
const SHADES = 6, FOGS = 5;
const LUT = [];
(function buildLUT() {
  for (let s = 0; s < SHADES; s++) {
    LUT[s] = [];
    const t = s / (SHADES - 1);                       // 0 trough → 1 ridge
    for (let fg = 0; fg < FOGS; fg++) {
      const fog = 1 - fg / (FOGS - 1);                // 1 near → 0 far
      LUT[s][fg] = [];
      for (let st = 0; st < 2; st++) {
        // Deep violet trough rising to a colder lit ridge
        let r = 14 + t * 52 + st * 7;
        let gg =  4 + t * 16 + st * 5;
        let b  = 30 + t * 92 + st * 12;
        const k = 0.22 + fog * 0.78;                  // fog toward black
        LUT[s][fg][st] = `rgb(${Math.round(r*k)},${Math.round(gg*k)},${Math.round(b*k)})`;
      }
    }
  }
})();

// ─── Draw: voxel terrain (Comanche column march, far → near) ──────────────────
const COLW = 2;
const NCOL = Math.ceil(LW / COLW);
const ybuf = new Int16Array(NCOL);

function drawTerrain() {
  g.fillStyle = C.SKY;
  g.fillRect(0, 0, LW, LH);
  ybuf.fill(LH);

  for (let z = ZFAR; z >= 0; z -= ZSTEP) {
    const p    = pAt(z);
    const invp = 1 / p;
    const fg   = Math.min(FOGS - 1, Math.floor((z / ZFAR) * (FOGS - 1) + 0.5));
    const st   = (Math.floor((z + scroll * 6) / 9) & 1);
    const yBase = HORIZON + CAMH * p;

    for (let c = 0; c < NCOL; c++) {
      const wx = camWX + (c * COLW + COLW / 2 - VPX) * invp;
      const h  = terrainH(wx);
      const sy = (yBase - h * p) | 0;
      const prev = ybuf[c];
      if (sy < prev) {
        const s = Math.min(SHADES - 1, (h / DEPTH * (SHADES - 1) + 0.5) | 0);
        g.fillStyle = LUT[s][fg][st];
        g.fillRect(c * COLW, sy, COLW, prev - sy);
        // Cyan rim light on ridge crowns catches the eye at speed
        if (s >= SHADES - 1 && prev - sy > 1) {
          g.fillStyle = fg <= 1 ? C.RIM : '#083a4a';
          g.fillRect(c * COLW, sy, COLW, 1);
        }
        ybuf[c] = sy;
      }
    }
  }
}

// ─── Draw: entities ───────────────────────────────────────────────────────────
function drawEnemies() {
  enemies.slice().sort((a, b) => b.z - a.z).forEach(e => {
    const p = proj(e.x, e.y, e.z);
    if (p.y < 0 || p.y > LH + 20) return;
    const rel = p.p / pAt(0);
    const w = Math.max(2, Math.round((e.kind === 'tanker' ? 17 : 13) * rel));
    const h = w;
    g.fillStyle = e.col;
    g.fillRect(p.x - w / 2, p.y - h, w, h);
    g.fillStyle = '#ffffff';
    g.fillRect(p.x - w / 2, p.y - h, w, 1);
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(p.x + w / 2 - 2, p.y - h + 1, 2, h - 1);
    if (e.kind === 'flipper' && w >= 5) {
      const wg = Math.max(1, Math.round(w * 0.3));
      g.fillStyle = e.col;
      const wh = Math.max(1, h - wg * 2);
      g.fillRect(p.x - w / 2 - wg, p.y - h + wg, wg, wh);
      g.fillRect(p.x + w / 2,      p.y - h + wg, wg, wh);
    }
    if (e.hp > 1) { g.fillStyle = C.HY; g.fillRect(p.x - 1, p.y - h - 3, 2, 2); }
  });
}

function drawBullets() {
  for (const b of bullets) {
    const p = proj(b.x, b.y, b.z);
    const s = Math.max(1, Math.round(3 * (p.p / pAt(0))));
    g.fillStyle = C.BLT;
    g.fillRect(p.x - s / 2, p.y - s, s, s);
  }
}

function drawPlayer() {
  if (PL.inv > 0 && ((PL.inv / 80) | 0) % 2 === 0) return;
  const p = proj(PL.x, PL.y, 0);
  const w = 11, h = 15;

  // Shadow on the surface below — sells the height when airborne
  const gy = proj(PL.x, terrainH(PL.x), 0);
  const sw = Math.max(3, Math.round(w * (1 - Math.min(0.6, (PL.y - terrainH(PL.x)) / 60))));
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(gy.x - sw / 2, gy.y - 2, sw, 3);

  // Lean into the carve
  const lean = Math.max(-3, Math.min(3, Math.round(PL.vx * 1.1)));
  g.fillStyle = C.PL;  g.fillRect(p.x - w / 2 + lean, p.y - h, w, h);
  g.fillStyle = C.PLH; g.fillRect(p.x - w / 2 + lean, p.y - h, w, 4);
  g.fillStyle = C.PLD; g.fillRect(p.x + w / 2 - 3 + lean, p.y - h + 4, 3, h - 4);
  g.fillStyle = '#ffffff';
  g.fillRect(p.x - 4 + lean, p.y - h + 6, 2, 3);
  g.fillRect(p.x + 2 + lean, p.y - h + 6, 2, 3);

  // Float pips overhead: how much hang time is left
  if (PL.air && PL.floats > 0) {
    for (let i = 0; i < PL.floats; i++) {
      g.fillStyle = C.HC;
      g.fillRect(p.x - 5 + i * 4, p.y - h - 5, 2, 2);
    }
  }
}

function drawParticles() {
  for (const p of particles) {
    const sz = Math.max(1, Math.round(p.sz));
    g.globalAlpha = Math.min(1, p.life / 10);
    g.fillStyle = p.col;
    g.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
    g.globalAlpha = 1;
  }
}

function drawPopups() {
  g.textAlign = 'center';
  g.font = 'bold 8px monospace';
  for (const r of rings) {
    const p = proj(r.x, r.y, 0);
    g.globalAlpha = Math.max(0, 1 - r.t / 900);
    g.fillStyle = C.HY;
    g.fillText(r.txt, p.x, p.y - 22 - r.t * 0.02);
    g.globalAlpha = 1;
  }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD() {
  g.textBaseline = 'top';
  g.font = 'bold 7px monospace';

  g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(3, 3, 54, 18);
  g.fillStyle = C.HC; g.textAlign = 'left'; g.fillText('SCORE', 6, 5);
  g.fillStyle = C.HW; g.font = 'bold 9px monospace';
  g.fillText(String(score).padStart(6, '0'), 6, 13);

  g.font = 'bold 7px monospace';
  g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(LW - 48, 3, 45, 18);
  g.fillStyle = C.HR; g.textAlign = 'right'; g.fillText('LIVES', LW - 6, 5);
  for (let i = 0; i < Math.max(0, lives); i++) {
    g.fillStyle = C.HR;  g.fillRect(LW - 12 - i * 12, 12, 8, 8);
    g.fillStyle = C.PLH; g.fillRect(LW - 12 - i * 12, 12, 8, 2);
  }

  // Pipe position: which of the 5 you're over
  const cur = pipeAt(PL.x);
  g.textAlign = 'center';
  for (let i = 0; i < NPIPES; i++) {
    g.fillStyle = i === cur ? C.RIM : '#243';
    g.fillRect(LW / 2 - 22 + i * 9, 6, 7, 3);
  }

  // Air / combo readout
  if (PL.air) {
    g.fillStyle = C.HY;
    g.fillText(`AIR ${(PL.airTime / 1000).toFixed(1)}s`, LW / 2, 13);
  } else if (PL.combo > 1) {
    g.fillStyle = C.HY;
    g.fillText(`COMBO x${PL.combo}`, LW / 2, 13);
  }

  const zapReady = PL.zapCD <= 0;
  g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(3, LH - 14, 74, 11);
  g.fillStyle = zapReady ? C.HY : C.DIM; g.textAlign = 'left';
  g.fillText((PAD.on ? 'B:ZAP ' : 'Z:ZAP ') + (zapReady ? '[RDY]' : `[${Math.ceil(PL.zapCD/1000)}s]`), 6, LH - 12);

  if (PAD.on) {
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(LW - 44, LH - 14, 41, 11);
    g.fillStyle = C.HC; g.textAlign = 'right'; g.fillText('◎ PAD', LW - 6, LH - 12);
  }
  g.textBaseline = 'alphabetic';
}

// ─── Title / Game over ────────────────────────────────────────────────────────
function drawTitle() {
  drawTerrain();
  g.fillStyle = 'rgba(0,0,0,0.66)'; g.fillRect(0, 0, LW, LH);
  g.fillStyle = C.PL;
  g.fillRect(0, LH / 2 - 46, LW, 1); g.fillRect(0, LH / 2 + 34, LW, 1);
  g.textAlign = 'center'; g.textBaseline = 'top';
  g.font = 'bold 26px monospace';
  g.fillStyle = '#440000'; g.fillText('SUDS JACK', LW / 2 + 2, LH / 2 - 38);
  g.fillStyle = '#ffffff'; g.fillText('SUDS JACK', LW / 2, LH / 2 - 40);
  g.font = 'bold 7px monospace';
  g.fillStyle = C.HC;  g.fillText('FIVE PIPES · VOXEL', LW / 2, LH / 2 - 8);
  g.fillStyle = C.DIM; g.fillText('CARVE THE TROUGH · LAUNCH THE RIDGE', LW / 2, LH / 2 + 2);
  if (hi > 0) { g.fillStyle = C.HY; g.fillText(`HI  ${hi}`, LW / 2, LH / 2 - 22); }
  if (((Date.now() / 550) | 0) % 2 === 0) {
    g.fillStyle = C.HW;
    g.fillText(PAD.on ? '— PRESS  A  OR  START —' : '— PRESS ENTER  OR  TAP —', LW / 2, LH / 2 + 16);
  }
  g.fillStyle = PAD.on ? C.HC : '#444444';
  g.fillText(PAD.on ? '◎ LEFT STICK: CARVE   ·   A: JUMP / FLOAT'
                    : 'A/D OR STICK: CARVE   ·   SPACE: JUMP / FLOAT', LW / 2, LH / 2 + 40);
  g.textBaseline = 'alphabetic';
}

function drawGameOver() {
  drawTerrain();
  g.fillStyle = 'rgba(0,0,0,0.72)'; g.fillRect(0, 0, LW, LH);
  g.fillStyle = C.PL;
  g.fillRect(0, LH / 2 - 36, LW, 1); g.fillRect(0, LH / 2 + 28, LW, 1);
  g.textAlign = 'center'; g.textBaseline = 'top';
  g.font = 'bold 22px monospace';
  g.fillStyle = '#440000'; g.fillText('GAME OVER', LW / 2 + 2, LH / 2 - 30);
  g.fillStyle = '#ffffff'; g.fillText('GAME OVER', LW / 2, LH / 2 - 32);
  g.font = 'bold 8px monospace';
  g.fillStyle = C.HC; g.fillText(`SCORE  ${score}`, LW / 2, LH / 2 - 6);
  g.fillStyle = C.HY; g.fillText(`HI  ${hi}`, LW / 2, LH / 2 + 5);
  g.fillStyle = C.DIM;
  g.fillText(`BEST AIR  ${(PL.bestAir / 1000).toFixed(1)}s`, LW / 2, LH / 2 + 16);
  if (((Date.now() / 550) | 0) % 2 === 0) {
    g.fillStyle = C.HW;
    g.fillText(PAD.on ? '— A OR START TO RETRY —' : '— ENTER TO RETRY —', LW / 2, LH / 2 + 30);
  }
  g.textBaseline = 'alphabetic';
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  g.fillStyle = C.BG; g.fillRect(0, 0, LW, LH);

  if (state === 'title')         drawTitle();
  else if (state === 'gameover') drawGameOver();
  else {
    drawTerrain();
    drawEnemies();
    drawBullets();
    drawPlayer();
    drawParticles();
    drawPopups();
    drawHUD();
  }

  if (flashAlpha > 0 && flashCol) {
    g.globalAlpha = flashAlpha; g.fillStyle = flashCol;
    g.fillRect(0, 0, LW, LH); g.globalAlpha = 1;
  }

  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < LH; y += 2) g.fillRect(0, y, LW, 1);
  g.fillStyle = 'rgba(0,100,255,0.04)';
  g.fillRect(0, 0, LW, 6); g.fillRect(0, LH - 6, LW, 6);

  // Blit with screen shake
  let ox = 0, oy = 0;
  if (shakeT > 0) {
    ox = (Math.random() - 0.5) * shakeMag;
    oy = (Math.random() - 0.5) * shakeMag;
  }
  const sc = canvas.width / LW;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(off, Math.round(ox * sc), Math.round(oy * sc), canvas.width, canvas.height);
}

// ─── Main loop ────────────────────────────────────────────────────────────────
function loop(ts) {
  const dt = Math.min(ts - lastTS, 50);
  lastTS = ts;
  pollPad();
  update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(ts => { lastTS = ts; requestAnimationFrame(loop); });
