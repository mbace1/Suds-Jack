'use strict';
// ─── SUDS JACK — VOXEL PROTOTYPE ─────────────────────────────────────────────
// Hyper Dagger tech · 4px voxel grid · half-pipe tunnel · Bomb Jack + Tempest
// Suda 51 aesthetic: black/red/white/cyan, scanlines, graphic type

// ─── Canvas setup ─────────────────────────────────────────────────────────────
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
  BG:   '#000000',
  SKY:  '#00000a',
  TA:   '#06000e',   // tunnel wall dark
  TB:   '#0e001c',   // tunnel wall mid
  FA:   '#04040e',   // floor dark
  FB:   '#0a0a1c',   // floor mid
  FG:   '#120026',   // floor grid line
  RIM:  '#00d4ff',   // neon cyan rim
  RDIM: '#002233',   // dim rim
  PL:   '#ff0000',   // player red
  PLH:  '#ff5555',   // player highlight
  PLD:  '#660000',   // player shadow
  BLT:  '#ffee00',   // bullet yellow
  E1:   '#ffffff',   // enemy basic
  E2:   '#00ffff',   // enemy flipper
  E3:   '#ff44ff',   // enemy tanker
  BUMP: '#ffaa00',   // bump/launch tile
  HW:   '#ffffff',   // HUD white
  HR:   '#ff0000',   // HUD red
  HC:   '#00ffff',   // HUD cyan
  HY:   '#ffff00',   // HUD yellow
  DIM:  '#222222',
};

// ─── Tunnel config ────────────────────────────────────────────────────────────
const ND   = 22;         // depth slices
const VPX  = LW / 2;    // vanish X (center)
const VPY  = 36;         // vanish Y (upper)
const NY   = LH * 0.82; // near floor Y
const NW   = LW * 0.45; // near half-width
const WHF  = 0.50;       // wall height fraction of (NY-VPY)
const NC   = 8;          // floor columns
const NR   = 4;          // wall rows

function lerp(a, b, t) { return a + (b - a) * t; }
function ss(t) { return t * t * (3 - 2 * t); } // smoothstep

function sliceAt(d) {
  const t = ss(Math.max(0, d) / ND);
  return {
    y:  lerp(NY, VPY, t),
    hw: lerp(NW, 0,   t),
    wh: lerp((NY - VPY) * WHF, 0, t),
  };
}

// ─── Tunnel row variation ─────────────────────────────────────────────────────
// Each world "ring" (voxel row of the half-pipe) gets a deterministic profile so
// the tunnel reads as built out of stacked voxel rows rather than a smooth cone.
// hash → 0..1, stable per ring index, so the variation scrolls with the world.
function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// Profile for ring r: how many wall rows are present, and whether it's a marker.
// rows  : 1..NR   — wall height in voxel rows (creates dips and towers)
// marker: true    — a red accent ring (Suda 51 punctuation every so often)
// gate  : true    — narrowed ring, walls pushed inward
function ringProfile(r) {
  const h = hash1(r);
  let rows = NR;
  if (h < 0.16)      rows = 2;             // dip
  else if (h < 0.30) rows = 3;
  else if (h > 0.92) rows = NR + 1;        // tower
  const marker = (r % 8) === 0;
  const gate   = hash1(r * 1.7 + 5) > 0.90;
  return { rows, marker, gate };
}

// World-space enemy/bullet → screen position
// wx: -1..+1 (tunnel width), wy: 0=floor (voxel rows), wz: 0..1 (0=near)
function w2s(wx, wy, wz) {
  const d  = wz * ND;
  const sl = sliceAt(d);
  return {
    x:  Math.round(VPX + camX + wx * sl.hw),
    y:  Math.round(sl.y - wy * sl.wh / NR),
    sc: sl.hw / NW,
  };
}

// ─── Game state ───────────────────────────────────────────────────────────────
let state  = 'title';
let score  = 0;
let hi     = 0;
let lives  = 3;
let frame  = 0;
let scroll = 0;   // 0..1 floor checker phase
let ringOff = 0;  // monotonic ring counter — drives tunnel row variation
let camX   = 0;
let camT   = 0;

// Player physics
const PL = {
  x: 0, y: 0,          // position: x in -1..+1, y in voxel units above floor
  vx: 0, vy: 0,
  onGround: true,
  boosts: 0,            // mid-air Bomb Jack boosts remaining
  inv: 0,               // invincibility timer (ms)
  zapCD: 0,
};
const GRAV     = 0.28;
const J_VEL    = -5.8;  // jump velocity
const BOOST_V  = -3.0;  // Bomb Jack air boost
const P_SPD    = 0.045; // horizontal acceleration
const P_FRIC   = 0.80;  // horizontal friction (per frame)
const P_CEIL   = NR;    // max height (wall height in voxel rows)
const FIRE_INT = 130;   // ms between auto-fire shots
let   fireCD   = 0;

const bullets   = [];
const enemies   = [];
const particles = []; // {x,y,vx,vy,life,col,sz,dsz,grav}

// Screen-flash overlay (zap / player hit)
let flashCol = null, flashAlpha = 0;

// Terrain bumps: array of {x, z, active} — glow tiles on floor that launch player
const bumps = [];

// ─── Input ────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  if (!keys[e.code]) { keys[e.code] = true; handleKey(e.code); }
  if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function handleKey(code) {
  if ((state === 'title' || state === 'gameover') && code === 'Enter') startGame();
  if (state === 'playing') {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') tryJump();
    if (code === 'KeyZ') tryZap();
  }
}

// Touch controls
const T = { left: false, right: false, jump: false };
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (state !== 'playing') { startGame(); return; }
  for (const t of e.changedTouches) {
    const x = t.clientX / window.innerWidth;
    const y = t.clientY / window.innerHeight;
    if (y > 0.55) {
      if (x < 0.35)      T.left  = true;
      else if (x > 0.65) T.right = true;
      else                { tryZap(); }
    } else {
      T.jump = true; tryJump();
    }
  }
}, { passive: false });
canvas.addEventListener('touchend', e => {
  e.preventDefault();
  T.left = T.right = T.jump = false;
  for (const t of e.touches) {
    const x = t.clientX / window.innerWidth;
    const y = t.clientY / window.innerHeight;
    if (y > 0.55) {
      if (x < 0.35)      T.left  = true;
      else if (x > 0.65) T.right = true;
    }
  }
}, { passive: false });

// ─── Gamepad ──────────────────────────────────────────────────────────────────
// Standard mapping: 0=A 1=B 2=X 3=Y 4/5=bumpers 6/7=triggers 9=start
// 12/13/14/15 = dpad up/down/left/right. Axis 0 = left stick X.
const PAD = { on: false, left: false, right: false, jump: false, prev: [] };
const PAD_DZ = 0.30;   // stick deadzone

function pollPad() {
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = null;
  for (const p of list) if (p && p.connected) { gp = p; break; }

  PAD.on = !!gp;
  if (!gp) { PAD.left = PAD.right = PAD.jump = false; PAD.prev = []; return; }

  const down = i => !!(gp.buttons[i] && gp.buttons[i].pressed);
  const hit  = i => down(i) && !PAD.prev[i];          // edge-triggered
  const ax   = gp.axes[0] || 0;

  // Held states — feed straight into movement / float
  PAD.left  = ax < -PAD_DZ || down(14);
  PAD.right = ax >  PAD_DZ || down(15);
  PAD.jump  = down(0) || down(12);

  if (state === 'playing') {
    if (hit(0) || hit(12)) tryJump();                          // A / dpad-up
    if (hit(1) || hit(2) || hit(5) || hit(7)) tryZap();        // B / X / RB / RT
  } else if (hit(0) || hit(9)) {
    startGame();                                                // A / Start
  }

  PAD.prev = gp.buttons.map(b => b.pressed);
}

window.addEventListener('gamepadconnected',    () => { PAD.on = true;  });
window.addEventListener('gamepaddisconnected', () => { PAD.on = false; PAD.prev = []; });

// ─── Game actions ─────────────────────────────────────────────────────────────
function tryJump() {
  if (PL.onGround) {
    PL.vy = J_VEL;
    PL.onGround = false;
    PL.boosts = 2;
  } else if (PL.boosts > 0) {
    PL.vy = Math.min(PL.vy, BOOST_V);
    PL.boosts--;
  }
}

function tryZap() {
  if (PL.zapCD > 0) return;
  PL.zapCD = 8000;
  enemies.forEach(e => burst(e, 14));
  score += enemies.length * 150;
  enemies.length = 0;
  zapVfx();
}

function startGame() {
  score = 0; lives = 3; frame = 0; scroll = 0; ringOff = 0; camT = 0;
  flashCol = null; flashAlpha = 0;
  enemies.length = 0; bullets.length = 0; particles.length = 0; bumps.length = 0;
  Object.assign(PL, { x:0, y:0, vx:0, vy:0, onGround:true, boosts:0, inv:0, zapCD:0 });
  fireCD = 0;
  spawnBumps();
  state = 'playing';
}

// ─── Spawning ─────────────────────────────────────────────────────────────────
// Tempest-style lanes: enemies ride discrete lanes down the tube rather than
// arbitrary positions, so approach reads clearly and shots line up.
const LANES = 8;
function laneX(i) { return ((i + 0.5) / LANES) * 2 - 1; }   // -0.875 .. 0.875

// 0 GRUNT  — straight down its lane
// 1 FLIPPER— hops lanes on a timer (the Tempest signature)
// 2 TANKER — slow, 2 HP, splits into two grunts on death
const ETYPES = [
  { kind: 'grunt',   col: C.E1, speed: 0.009, hp: 1, pts: 100 },
  { kind: 'flipper', col: C.E2, speed: 0.007, hp: 1, pts: 150 },
  { kind: 'tanker',  col: C.E3, speed: 0.005, hp: 2, pts: 350 },
];

function makeEnemy(kind, lane, z, lvl) {
  const et = ETYPES.find(e => e.kind === kind);
  return {
    kind:    et.kind,
    lane,
    x:       laneX(lane),
    tx:      laneX(lane),         // target x while flipping between lanes
    y:       0,
    z,
    speed:   et.speed * (1 + Math.random() * 0.3 + lvl * 0.12),
    col:     et.col,
    hp:      et.hp,
    pts:     et.pts,
    flipCD:  600 + Math.random() * 700,   // ms until next lane hop
    dir:     Math.random() < 0.5 ? -1 : 1,
  };
}

function spawnWave() {
  const lvl   = Math.floor(frame / 1800);
  const count = 2 + Math.min(lvl, 5);

  // Pick distinct lanes so a wave spreads across the tube
  const pool = [];
  for (let i = 0; i < LANES; i++) pool.push(i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (let i = 0; i < count; i++) {
    const roll = Math.random() * (1.5 + lvl * 0.4);
    const kind = roll < 1 ? 'grunt' : roll < 2 ? 'flipper' : 'tanker';
    enemies.push(makeEnemy(kind, pool[i % LANES], 0.88 + Math.random() * 0.12, lvl));
  }
}

function spawnBumps() {
  bumps.length = 0;
  for (let i = 0; i < 6; i++) {
    bumps.push({ x: laneX(Math.floor(Math.random() * LANES)), z: 0.15 + i * 0.14 });
  }
}

// Spawn a single voxel chunk particle
function spawnChunk(x, y, vx, vy, col, sz, life) {
  particles.push({ x, y, vx, vy, life, col, sz, dsz: -sz / life, grav: 0.18 });
}

// Spawn a spark particle (small, fast)
function spawnSpark(x, y, vx, vy, col, life) {
  particles.push({ x, y, vx, vy, life, col, sz: 2, dsz: -2 / life, grav: 0.22 });
}

// Enemy kill burst: chunky voxel explosion
function burst(e, n) {
  const p = w2s(e.x, e.y, e.z);
  const scale = Math.max(0.4, p.sc);
  // Big voxel chunks
  const chunks = Math.max(4, Math.round(n * 0.5));
  for (let i = 0; i < chunks; i++) {
    const a  = (i / chunks) * Math.PI * 2 + Math.random() * 0.5;
    const sp = 1.2 + Math.random() * 2.5;
    const sz = Math.round((4 + Math.random() * 4) * Math.min(1.6, scale + 0.6));
    spawnChunk(p.x, p.y, Math.cos(a) * sp, Math.sin(a) * sp - 1.5,
               e.col, sz, 22 + Math.random() * 14);
  }
  // Spark shower
  const sparks = Math.max(6, Math.round(n * 0.7));
  for (let i = 0; i < sparks; i++) {
    const a  = Math.random() * Math.PI * 2;
    const sp = 0.5 + Math.random() * 3.5;
    spawnSpark(p.x + (Math.random() - 0.5) * 4, p.y,
               Math.cos(a) * sp, Math.sin(a) * sp - 2,
               Math.random() < 0.5 ? e.col : '#ffffff',
               12 + Math.random() * 10);
  }
}

// Zap flash + mass voxel debris
function zapVfx() {
  flashCol   = '#ffffff';
  flashAlpha = 0.82;
  // Debris cloud from all killed enemies is already handled by burst() calls
  // Extra floor voxel columns
  for (let i = 0; i < 8; i++) {
    const sx = 10 + i * (LW / 8);
    const sy = NY + 4;
    for (let r = 0; r < 5; r++) {
      spawnChunk(sx + (Math.random() - 0.5) * 8, sy,
                 (Math.random() - 0.5) * 2,
                 -(2.5 + Math.random() * 4),
                 Math.random() < 0.5 ? C.HC : C.HY,
                 Math.round(4 + Math.random() * 4),
                 20 + Math.random() * 20);
    }
  }
}

// Player hit: red voxel burst from player screen pos
function playerHitVfx() {
  flashCol   = '#ff0000';
  flashAlpha = 0.45;
  const px = Math.round(VPX + camX + PL.x * NW);
  const py = Math.round(NY - PL.y * (NY - VPY) * WHF / NR);
  for (let i = 0; i < 16; i++) {
    const a  = (i / 16) * Math.PI * 2;
    const sp = 1 + Math.random() * 3;
    spawnChunk(px, py, Math.cos(a) * sp, Math.sin(a) * sp - 2,
               Math.random() < 0.6 ? C.PL : C.PLH,
               Math.round(4 + Math.random() * 6), 20 + Math.random() * 12);
  }
}

// Jump/land dust puffs from floor
function dustVfx(screenX, screenY) {
  for (let i = 0; i < 6; i++) {
    const side = (Math.random() - 0.5) * 12;
    spawnChunk(screenX + side, screenY,
               side * 0.3 + (Math.random() - 0.5),
               -(0.4 + Math.random() * 1.2),
               Math.random() < 0.5 ? '#333355' : '#1a1a33',
               Math.round(2 + Math.random() * 3), 10 + Math.random() * 8);
  }
}

// Bump launch: orange voxel spray
function bumpVfx(screenX, screenY) {
  for (let i = 0; i < 10; i++) {
    const a  = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const sp = 2 + Math.random() * 4;
    spawnChunk(screenX + (Math.random() - 0.5) * 8, screenY,
               Math.cos(a) * sp, Math.sin(a) * sp,
               Math.random() < 0.6 ? C.BUMP : '#ffcc44',
               Math.round(3 + Math.random() * 5), 16 + Math.random() * 12);
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────
let lastTS = 0;

function update(dt) {
  if (state !== 'playing') return;
  frame++;

  // Camera sway
  camT += dt * 0.00065;
  camX = Math.sin(camT) * 7 + Math.sin(camT * 2.3) * 2.5;

  // Scroll (floor animation) + ring advance for tunnel row variation
  const adv = dt * 0.006;
  scroll  = (scroll + adv) % 1;
  ringOff += adv;

  // ── Player horizontal ──
  const mx = (keys['ArrowLeft']  || keys['KeyA'] || T.left  || PAD.left  ? -1 : 0)
           + (keys['ArrowRight'] || keys['KeyD'] || T.right || PAD.right ?  1 : 0);
  PL.vx += mx * P_SPD * (dt / 16);
  PL.vx *= Math.pow(P_FRIC, dt / 16);
  PL.vx = Math.max(-0.14, Math.min(0.14, PL.vx));

  // ── Gravity ──
  if (!PL.onGround) {
    PL.vy += GRAV * (dt / 16);
    // Bomb Jack float: hold jump to slow fall
    const holdingJump = keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || T.jump || PAD.jump;
    if (holdingJump && PL.vy > 0.5) PL.vy *= 0.93;
  }

  // Apply
  PL.x += PL.vx * (dt / 16);
  PL.y -= PL.vy * (dt / 16);

  // Walls
  PL.x = Math.max(-0.85, Math.min(0.85, PL.x));

  // Ceiling
  if (PL.y > P_CEIL) { PL.y = P_CEIL; PL.vy = 0; }

  // Floor landing
  if (PL.y <= 0) {
    const px = Math.round(VPX + camX + PL.x * NW);
    const py = Math.round(NY);
    if (PL.vy > 4 && Math.abs(PL.vx) > 0.04) {
      // Speed-bump landing → Bomb Jack launch
      PL.vy = -(PL.vy * 0.45 + Math.abs(PL.vx) * 18);
      PL.boosts = 3;
      PL.onGround = false;
      dustVfx(px, py);
    } else {
      if (!PL.onGround && PL.vy > 1) dustVfx(px, py);
      PL.y = 0; PL.vy = 0; PL.onGround = true; PL.boosts = 2;
    }
  }

  // Bump tiles: when player is over a bump at near z and running fast
  for (const b of bumps) {
    if (PL.onGround && PL.y <= 0.1 && Math.abs(PL.x - b.x) < 0.12 && Math.abs(PL.vx) > 0.06) {
      PL.vy = J_VEL * 1.1;
      PL.onGround = false;
      PL.boosts = 3;
      const bsp = w2s(b.x, 0, b.z);
      bumpVfx(bsp.x, bsp.y);
    }
  }

  // ── Timers ──
  if (PL.inv  > 0) PL.inv  -= dt;
  if (PL.zapCD > 0) PL.zapCD -= dt;
  if (fireCD   > 0) fireCD   -= dt;

  // ── Auto-fire ──
  if (fireCD <= 0) {
    bullets.push({ x: PL.x, y: PL.y + 0.5, z: 0.01 });
    fireCD = FIRE_INT;
  }

  // ── Update bullets ──
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.z += 0.055 * (dt / 16);
    if (b.z >= 1) { bullets.splice(i, 1); continue; }
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.abs(e.z - b.z) < 0.055 && Math.abs(e.x - b.x) < 0.22) {
        e.hp--;
        if (e.hp <= 0) {
          burst(e, 12);
          score += e.pts;
          // Tankers split into two grunts on adjacent lanes (Tempest behaviour)
          if (e.kind === 'tanker') {
            const lvl = Math.floor(frame / 1800);
            for (const off of [-1, 1]) {
              const nl = Math.max(0, Math.min(LANES - 1, e.lane + off));
              const child = makeEnemy('grunt', nl, e.z, lvl);
              child.x = e.x;               // spawn at parent, slide into lane
              enemies.push(child);
            }
          }
          enemies.splice(j, 1);
        }
        bullets.splice(i, 1);
        hit = true; break;
      }
    }
    if (hit) continue;
  }

  // ── Update enemies ──
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.z -= e.speed * (dt / 16);

    // Flippers hop lanes on a timer — Tempest signature movement
    if (e.kind === 'flipper') {
      e.flipCD -= dt;
      if (e.flipCD <= 0) {
        let nl = e.lane + e.dir;
        if (nl < 0 || nl >= LANES) { e.dir *= -1; nl = e.lane + e.dir; }
        e.lane = nl;
        e.tx   = laneX(nl);
        e.flipCD = 500 + Math.random() * 600;
      }
    }
    // Ease toward target lane (snappy but visible — reads as a flip)
    e.x += (e.tx - e.x) * Math.min(1, 0.22 * (dt / 16));

    if (e.z <= 0.02) {
      if (Math.abs(e.x - PL.x) < 0.28 && PL.inv <= 0) {
        lives--;
        PL.inv = 2200;
        playerHitVfx();
        if (lives <= 0) { hi = Math.max(hi, score); state = 'gameover'; }
      }
      enemies.splice(i, 1);
    }
  }

  // ── Flash decay ──
  if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - dt * 0.004);

  // ── Particles ──
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx * (dt / 16);
    p.y  += p.vy * (dt / 16);
    p.vy += (p.grav || 0.12) * (dt / 16);
    p.sz  = Math.max(0, p.sz + p.dsz * (dt / 16));
    p.life -= dt / 16;
    if (p.life <= 0 || p.sz <= 0) particles.splice(i, 1);
  }

  // ── Wave spawning ──
  const wInt = Math.max(100, 220 - Math.floor(frame / 1800) * 18);
  if (frame % wInt === 0) spawnWave();

  // ── Recycle bumps ──
  for (let i = bumps.length - 1; i >= 0; i--) {
    if (bumps[i].z <= 0) bumps[i] = { x: laneX(Math.floor(Math.random() * LANES)), z: 0.95 };
    bumps[i].z -= 0.007 * (dt / 16);
  }
}

// ─── Drawing: Tunnel ──────────────────────────────────────────────────────────
function drawTunnel() {
  // Sky inside tunnel
  g.fillStyle = C.SKY;
  const top = sliceAt(ND);
  g.fillRect(0, 0, LW, Math.round(top.y));

  // Slices far → near
  for (let d = ND; d >= 1; d--) {
    const cur  = sliceAt(d);
    const near = sliceAt(d - 1);
    if (cur.hw < 1) continue;

    // World ring index for this slice — advances as the tunnel scrolls
    const ring = Math.floor(ND - d + ringOff);
    const prof = ringProfile(ring);

    // Gate rings pull the walls inward for a pinch-point
    const hw  = prof.gate ? cur.hw * 0.76 : cur.hw;

    const lx  = Math.round(VPX + camX - hw);
    const rx  = Math.round(VPX + camX + hw);
    const sw  = Math.max(2, rx - lx);
    const sy  = Math.round(cur.y);
    const ny  = Math.round(near.y);
    const fh  = Math.max(1, ny - sy);
    const tw  = Math.max(1, Math.round(sw / NC));

    // ── Floor strip ──
    for (let c = 0; c < NC; c++) {
      const fx = lx + Math.round(c * sw / NC);
      const fw = Math.round((c + 1) * sw / NC) - Math.round(c * sw / NC);
      const check = (c + Math.floor((ND - d + scroll * NC) * 0.75)) % 2;
      g.fillStyle = check ? C.FA : C.FB;
      g.fillRect(fx, sy, fw, fh);
      // grid line
      if (c > 0) { g.fillStyle = C.FG; g.fillRect(fx, sy, 1, fh); }
    }

    // Marker rings: red band across the floor (Suda 51 punctuation)
    if (prof.marker) {
      g.fillStyle = '#2a0008';
      g.fillRect(lx, sy, sw, Math.max(1, Math.round(fh * 0.5)));
    }

    // ── Wall strips (left & right) — height varies per ring ──
    const rows = prof.rows;
    for (let r = 0; r < rows; r++) {
      const wy = Math.round(sy - (r + 1) * cur.wh / NR);
      const rh = Math.max(1, Math.round(cur.wh / NR));
      const isTop = r === rows - 1;
      g.fillStyle = isTop ? C.TB : C.TA;
      g.fillRect(lx,      wy, tw, rh);
      g.fillRect(rx - tw, wy, tw, rh);
      // Rim light on the top voxel of each column
      if (isTop) {
        g.fillStyle = prof.marker ? C.PL : C.RIM;
        g.fillRect(lx,      wy, tw, 1);
        g.fillRect(rx - tw, wy, tw, 1);
      }
    }

    // ── Vertical edges ──
    const wallH = cur.wh * rows / NR;
    const ey = Math.round(sy - wallH);
    const eh = Math.round(wallH + fh);
    g.fillStyle = prof.marker ? C.PL : (prof.gate ? C.RIM : C.RDIM);
    g.fillRect(lx,     ey, 1, eh);
    g.fillRect(rx - 1, ey, 1, eh);
  }

  // Near floor apron (stage where player stands)
  const n0 = sliceAt(0);
  g.fillStyle = C.FA;
  g.fillRect(0, Math.round(n0.y), LW, LH - Math.round(n0.y));

  // Near tunnel mouth — cyan frame
  const n1 = sliceAt(1);
  const ml = Math.round(VPX + camX - n1.hw);
  const mr = Math.round(VPX + camX + n1.hw);
  const mt = Math.round(n1.y - n1.wh);
  const mb = Math.round(n1.y);
  g.fillStyle = C.RIM;
  g.fillRect(ml, mt, mr - ml, 1);   // top of mouth
  g.fillRect(ml, mt, 1, mb - mt);   // left pillar
  g.fillRect(mr, mt, 1, mb - mt);   // right pillar
}

// ─── Drawing: Bump tiles ──────────────────────────────────────────────────────
function drawBumps() {
  for (const b of bumps) {
    const p = w2s(b.x, 0, b.z);
    if (p.sc < 0.05) continue;
    const bw = Math.max(2, Math.round(10 * p.sc));
    const bh = Math.max(1, Math.round(4 * p.sc));
    g.fillStyle = C.BUMP;
    g.fillRect(p.x - bw / 2, p.y - bh, bw, bh);
    g.fillStyle = '#ffcc44';
    g.fillRect(p.x - bw / 2, p.y - bh, bw, 1);
  }
}

// ─── Drawing: Player ──────────────────────────────────────────────────────────
function drawPlayer() {
  // Blink while invincible
  if (PL.inv > 0 && Math.floor(PL.inv / 80) % 2 === 0) return;

  const px = Math.round(VPX + camX + PL.x * NW);
  const py = Math.round(NY - PL.y * (NY - VPY) * WHF / NR);
  const pw = 12, ph = 16;

  // Drop shadow
  g.fillStyle = 'rgba(0,0,0,0.5)';
  g.fillRect(px - pw / 2 + 2, py - 2, pw, 3);

  // Body
  g.fillStyle = C.PL;
  g.fillRect(px - pw / 2, py - ph, pw, ph);

  // Top highlight face
  g.fillStyle = C.PLH;
  g.fillRect(px - pw / 2, py - ph, pw, 4);

  // Right shadow face
  g.fillStyle = C.PLD;
  g.fillRect(px + pw / 2 - 3, py - ph + 4, 3, ph - 4);

  // Eyes (Suda 51 — two white rectangles)
  g.fillStyle = '#ffffff';
  g.fillRect(px - 4, py - ph + 6, 2, 3);
  g.fillRect(px + 2, py - ph + 6, 2, 3);

  // Jump trail: draw faint ghost voxels when airborne
  if (!PL.onGround) {
    for (let i = 1; i <= 3; i++) {
      const gy  = py + i * 4;
      const alp = (4 - i) / 8;
      g.fillStyle = `rgba(255,0,0,${alp})`;
      g.fillRect(px - pw / 2, gy - ph, pw, ph);
    }
  }
}

// ─── Drawing: Enemies ─────────────────────────────────────────────────────────
function drawEnemies() {
  // Sort far to near
  enemies.slice().sort((a, b) => b.z - a.z).forEach(e => {
    const p = w2s(e.x, e.y, e.z);
    const base = e.kind === 'tanker' ? 18 : 14;
    const ew = Math.max(2, Math.round(base * p.sc));
    const eh = Math.max(2, Math.round(base * p.sc));

    g.fillStyle = e.col;
    g.fillRect(p.x - ew / 2, p.y - eh, ew, eh);

    // Highlight top
    g.fillStyle = '#ffffff';
    g.fillRect(p.x - ew / 2, p.y - eh, ew, 1);

    // Right shadow
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(p.x + ew / 2 - 2, p.y - eh + 1, 2, eh - 1);

    // Flipper wings — side voxels that lean the way it's travelling
    if (e.kind === 'flipper' && ew >= 5) {
      const wg = Math.max(1, Math.round(ew * 0.3));
      g.fillStyle = e.col;
      g.fillRect(p.x - ew / 2 - wg, p.y - eh + wg, wg, Math.max(1, eh - wg * 2));
      g.fillRect(p.x + ew / 2,      p.y - eh + wg, wg, Math.max(1, eh - wg * 2));
    }

    // Tanker: dark core so it reads as armoured
    if (e.kind === 'tanker' && ew >= 6) {
      const ci = Math.max(2, Math.round(ew * 0.35));
      g.fillStyle = '#440044';
      g.fillRect(p.x - ci / 2, p.y - eh / 2 - ci / 2, ci, ci);
    }

    // HP pip for tankers
    if (e.hp > 1) {
      g.fillStyle = C.HY;
      g.fillRect(p.x - 1, p.y - eh - 3, 2, 2);
    }
  });
}

// ─── Drawing: Bullets ─────────────────────────────────────────────────────────
function drawBullets() {
  for (const b of bullets) {
    const cur  = w2s(b.x, b.y, b.z);
    const prev = w2s(b.x, b.y, Math.max(0, b.z - 0.06));
    const bs = Math.max(1, Math.round(3 * cur.sc));
    // Tail
    g.fillStyle = 'rgba(255,238,0,0.3)';
    g.fillRect(prev.x - 1, prev.y - 1, 2, 2);
    // Head
    g.fillStyle = C.BLT;
    g.fillRect(cur.x - bs / 2, cur.y - bs, bs, bs);
  }
}

// ─── Drawing: Particles ───────────────────────────────────────────────────────
function drawParticles() {
  for (const p of particles) {
    const sz = Math.max(1, Math.round(p.sz));
    const alp = Math.min(1, p.life / 10);
    g.globalAlpha = alp;
    // Top-lit voxel: brighter top strip
    g.fillStyle = p.col;
    g.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz);
    if (sz >= 4) {
      g.fillStyle = '#ffffff';
      g.globalAlpha = alp * 0.35;
      g.fillRect(Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, Math.max(1, Math.round(sz / 3)));
      g.fillStyle = 'rgba(0,0,0,0.4)';
      g.fillRect(Math.round(p.x + sz / 2 - Math.max(1, Math.round(sz / 3))), Math.round(p.y - sz / 2), Math.max(1, Math.round(sz / 3)), sz);
    }
    g.globalAlpha = 1;
  }
}

// ─── Drawing: HUD ─────────────────────────────────────────────────────────────
function drawHUD() {
  g.font = 'bold 7px monospace';
  g.textBaseline = 'top';

  // Score panel
  g.fillStyle = 'rgba(0,0,0,0.7)';
  g.fillRect(3, 3, 52, 18);
  g.fillStyle = C.DIM;
  g.fillRect(3, 3, 52, 1);
  g.fillStyle = C.HC;
  g.textAlign = 'left';
  g.fillText('SCORE', 6, 5);
  g.fillStyle = C.HW;
  g.font = 'bold 9px monospace';
  g.fillText(String(score).padStart(6, '0'), 6, 13);

  // Lives
  g.fillStyle = 'rgba(0,0,0,0.7)';
  g.fillRect(LW - 48, 3, 45, 18);
  g.font = 'bold 7px monospace';
  g.fillStyle = C.HR;
  g.textAlign = 'right';
  g.fillText('LIVES', LW - 6, 5);
  for (let i = 0; i < Math.max(0, lives); i++) {
    g.fillStyle = C.HR;
    g.fillRect(LW - 12 - i * 12, 12, 8, 8);
    g.fillStyle = C.PLH;
    g.fillRect(LW - 12 - i * 12, 12, 8, 2);
  }

  // Level
  const lvl = Math.floor(frame / 1800) + 1;
  g.fillStyle = 'rgba(0,0,0,0.7)';
  g.fillRect(LW / 2 - 22, 3, 44, 10);
  g.fillStyle = C.HY;
  g.textAlign = 'center';
  g.font = 'bold 7px monospace';
  g.fillText(`LVL  ${lvl}`, LW / 2, 5);

  // ZAP indicator (bottom)
  const zapReady = PL.zapCD <= 0;
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(3, LH - 14, 72, 11);
  g.fillStyle = zapReady ? C.HY : C.DIM;
  g.textAlign = 'left';
  g.font = 'bold 7px monospace';
  g.fillText('Z:ZAP ' + (zapReady ? '[RDY]' : `[${Math.ceil(PL.zapCD / 1000)}s]`), 6, LH - 12);

  // Controller connected indicator
  if (PAD.on) {
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(LW - 44, LH - 14, 41, 11);
    g.fillStyle = C.HC;
    g.textAlign = 'right';
    g.font = 'bold 7px monospace';
    g.fillText('◎ PAD', LW - 6, LH - 12);
  }

  // Mobile hints
  if ('ontouchstart' in window) {
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, LH - 30, LW, 30);
    g.fillStyle = C.DIM;
    g.textAlign = 'center';
    g.font = 'bold 6px monospace';
    g.fillText('← MOVE →     TAP UPPER = JUMP     CENTER = ZAP', LW/2, LH - 8);
  }

  g.textBaseline = 'alphabetic';
}

// ─── Drawing: Title screen ────────────────────────────────────────────────────
function drawTitle() {
  drawTunnel();

  // Dark overlay
  g.fillStyle = 'rgba(0,0,0,0.68)';
  g.fillRect(0, 0, LW, LH);

  // Horizontal dividers (graphic design element)
  g.fillStyle = C.PL;
  g.fillRect(0, LH / 2 - 46, LW, 1);
  g.fillRect(0, LH / 2 + 32, LW, 1);

  // SUDS JACK — large pixel title
  g.textAlign = 'center';
  g.textBaseline = 'top';

  // Red shadow offset
  g.font = 'bold 26px monospace';
  g.fillStyle = '#440000';
  g.fillText('SUDS JACK', LW / 2 + 2, LH / 2 - 40 + 2);

  // White main
  g.fillStyle = '#ffffff';
  g.fillText('SUDS JACK', LW / 2, LH / 2 - 40);

  // Subtitle
  g.font = 'bold 7px monospace';
  g.fillStyle = C.HC;
  g.fillText('VOXEL PROTOTYPE', LW / 2, LH / 2 - 10);
  g.fillStyle = C.DIM;
  g.fillText('HYPER DAGGER TECH  ·  4X VOXELS', LW / 2, LH / 2);

  // Blink start
  if (Math.floor(Date.now() / 550) % 2 === 0) {
    g.fillStyle = C.HW;
    g.fillText(PAD.on ? '— PRESS  A  OR  START —' : '— PRESS ENTER  OR  TAP —',
               LW / 2, LH / 2 + 16);
  }

  // Controls footer
  g.fillStyle = '#444444';
  g.fillText('A/D:MOVE   SPACE/W:JUMP+FLOAT   Z:SUPERZAP', LW / 2, LH / 2 + 36);
  g.fillStyle = PAD.on ? C.HC : '#333333';
  g.fillText(PAD.on ? '◎ PAD: STICK/DPAD  ·  A:JUMP  ·  B:ZAP'
                    : 'GAMEPAD SUPPORTED — PRESS ANY BUTTON', LW / 2, LH / 2 + 46);

  // HI score
  if (hi > 0) {
    g.fillStyle = C.HY;
    g.fillText(`HI  ${hi}`, LW / 2, LH / 2 - 24);
  }

  g.textBaseline = 'alphabetic';
}

// ─── Drawing: Game Over ───────────────────────────────────────────────────────
function drawGameOver() {
  drawTunnel();
  g.fillStyle = 'rgba(0,0,0,0.72)';
  g.fillRect(0, 0, LW, LH);

  g.fillStyle = C.PL;
  g.fillRect(0, LH / 2 - 36, LW, 1);
  g.fillRect(0, LH / 2 + 28, LW, 1);

  g.textAlign = 'center';
  g.textBaseline = 'top';

  g.font = 'bold 22px monospace';
  g.fillStyle = '#440000';
  g.fillText('GAME OVER', LW / 2 + 2, LH / 2 - 32 + 2);
  g.fillStyle = '#ffffff';
  g.fillText('GAME OVER', LW / 2, LH / 2 - 32);

  g.font = 'bold 8px monospace';
  g.fillStyle = C.HC;
  g.fillText(`SCORE  ${score}`, LW / 2, LH / 2 - 6);
  g.fillStyle = C.HY;
  g.fillText(`HI  ${hi}`, LW / 2, LH / 2 + 6);

  if (Math.floor(Date.now() / 550) % 2 === 0) {
    g.fillStyle = C.HW;
    g.fillText(PAD.on ? '— A  OR  START TO RETRY —' : '— ENTER TO RETRY —',
               LW / 2, LH / 2 + 18);
  }

  g.textBaseline = 'alphabetic';
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  g.fillStyle = C.BG;
  g.fillRect(0, 0, LW, LH);

  if (state === 'title') {
    drawTitle();
  } else if (state === 'gameover') {
    drawGameOver();
  } else {
    drawTunnel();
    drawBumps();
    drawBullets();
    drawEnemies();
    drawPlayer();
    drawParticles();
    drawHUD();
  }

  // Screen flash overlay (zap / player hit)
  if (flashAlpha > 0 && flashCol) {
    g.globalAlpha = flashAlpha;
    g.fillStyle = flashCol;
    g.fillRect(0, 0, LW, LH);
    g.globalAlpha = 1;
  }

  // CRT scanlines (every 2 rows, Suda 51 TV feel)
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < LH; y += 2) g.fillRect(0, y, LW, 1);

  // Chromatic fringe (top/bottom edges, very subtle)
  g.fillStyle = 'rgba(0,100,255,0.04)';
  g.fillRect(0, 0, LW, 6);
  g.fillRect(0, LH - 6, LW, 6);

  // Blit
  ctx.drawImage(off, 0, 0, canvas.width, canvas.height);
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
