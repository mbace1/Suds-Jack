import * as THREE from 'three';
import { InputManager } from './input.js?v=1';
import { Runner } from './runner.js?v=1';
import { Track, INK, ACCENT, GOOD, SHIELD, ARROW, LABEL } from './track.js?v=1';
import { audio } from './audio.js?v=1';

// ── Tunables ──────────────────────────────────────────────────────────────────
const MAX_HEALTH_START = 3;
const CLEARS_PER_TUNE  = 14;      // clears between each roguelite "tune-up" choice
const SPEED_BASE = 15, SPEED_GROW = 0.012, SPEED_CAP = 34;
const css = h => '#' + h.toString(16).padStart(6, '0');

// ── Renderer / scene (pure white void, flat vector look) ───────────────────────
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas-game'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 400);

// ── Objects ───────────────────────────────────────────────────────────────────
const input  = new InputManager();
const track  = new Track(scene);
const runner = new Runner(scene);

// ── State ─────────────────────────────────────────────────────────────────────
let gameState = 'title';   // title | playing | perk | paused | gameover
let score = 0, combo = 0, bestCombo = 0, clears = 0, clearsSinceTune = 0;
let health = MAX_HEALTH_START, maxHealth = MAX_HEALTH_START, shields = 0;
let scoreMul = 1, windowScale = 1, speedMul = 1;
let shake = 0, flash = 0, flashCol = ACCENT;
let perks = [];            // current tune-up offer
let hiScore = parseInt(localStorage.getItem('ribbonHi') || '0');

// ── Perk pool (the roguelite layer) ───────────────────────────────────────────
const PERK_POOL = [
  { name: 'STEADY BEAT', desc: '+1 max heart, heal up',  apply: () => { maxHealth++; health = maxHealth; } },
  { name: 'LOOSE GROOVE', desc: 'wider timing window',   apply: () => { windowScale += 0.22; } },
  { name: 'ENCORE',       desc: '+0.5 score multiplier',  apply: () => { scoreMul += 0.5; } },
  { name: 'REWIND',       desc: '+2 shields (save a miss)', apply: () => { shields += 2; } },
  { name: 'METRONOME',    desc: 'ease the tempo a touch',  apply: () => { speedMul *= 0.92; } },
];

// ── HUD canvas + DOM overlay ──────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx = uiCanvas.getContext('2d');
const overlay = document.getElementById('overlay');

function ctxNow() {
  const speed = Math.min(SPEED_CAP, SPEED_BASE + track.traveled * SPEED_GROW) * speedMul;
  const gap = Math.max(6.5, 13 - track.traveled * 0.006);
  return { speed, gap, windowScale };
}

// ── Flow ──────────────────────────────────────────────────────────────────────
function startGame() {
  overlay.style.display = 'none';
  score = combo = bestCombo = clears = clearsSinceTune = 0;
  maxHealth = health = MAX_HEALTH_START; shields = 0;
  scoreMul = windowScale = speedMul = 1; shake = flash = 0;
  track.reset(); runner.reset();
  gameState = 'playing';
  audio.start();
}

function gameOver() {
  gameState = 'gameover';
  if (score > hiScore) { hiScore = score; localStorage.setItem('ribbonHi', hiScore); }
  shake = 1; runner.visible(false); audio.gameover();
  showOverlay(
    `<div style="font-size:40px;font-weight:bold;letter-spacing:4px">OFF THE RIBBON</div>` +
    `<div style="font-size:22px;margin-top:10px;color:${css(GOOD)}">SCORE ${score}</div>` +
    `<div style="font-size:14px;opacity:.7;margin-top:4px">best combo ×${bestCombo} · ${Math.floor(track.traveled)} m</div>` +
    (score >= hiScore && score > 0 ? `<div style="font-size:15px;color:${css(ACCENT)};margin-top:6px">NEW BEST!</div>` : ``) +
    `<div style="font-size:13px;opacity:.5;margin-top:18px">ENTER / TAP to run again</div>`);
}

function openTuneUp() {
  gameState = 'perk';
  // three distinct random perks
  const pool = PERK_POOL.slice(); perks = [];
  for (let i = 0; i < 3 && pool.length; i++) perks.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  audio.perkOpen();
}
function pickPerk(i) {
  if (gameState !== 'perk' || !perks[i]) return;
  perks[i].apply(); perks = []; input.tapTargets = [];
  clearsSinceTune = 0; flash = 0.5; flashCol = SHIELD;
  gameState = 'playing'; audio.perkPick();
}

// ── Scoring helpers ───────────────────────────────────────────────────────────
function onClear() {
  combo++; bestCombo = Math.max(bestCombo, combo);
  score += Math.round((100 + combo * 15) * scoreMul);
  clears++; clearsSinceTune++;
  flash = 0.35; flashCol = GOOD;
  audio.clear(combo);
  if (clearsSinceTune >= CLEARS_PER_TUNE) openTuneUp();
}
function onMiss() {
  if (gameState !== 'playing') return;   // a multi-miss frame can't re-trigger game over
  combo = 0;
  if (shields > 0) { shields--; flash = 0.4; flashCol = SHIELD; runner.stumble(); audio.miss(); shake = Math.max(shake, 0.4); return; }
  health--; flash = 0.5; flashCol = ACCENT; shake = Math.max(shake, 0.7);
  runner.stumble(); audio.miss();
  if (health <= 0) gameOver();
}

// ── Input wiring ──────────────────────────────────────────────────────────────
input.onAction = dir => {
  if (gameState !== 'playing') return;
  runner.trigger(dir);
  const res = track.tryAction(dir, ctxNow());
  if (res === 'clear') onClear();
  else if (res === 'wrong') onMiss();
  // 'none' → free move, no penalty
};
input.onStart = () => { if (gameState === 'title' || gameState === 'gameover') startGame(); };
input.onTap   = () => { if (gameState === 'title' || gameState === 'gameover') startGame(); };
input.onPerk  = i => pickPerk(i);
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused'; showOverlay(`<div style="font-size:40px;font-weight:bold">PAUSED</div><div style="font-size:13px;opacity:.5;margin-top:10px">ESC to resume</div>`); }
  else if (gameState === 'paused') { overlay.style.display = 'none'; gameState = 'playing'; }
};

// ── Camera ────────────────────────────────────────────────────────────────────
const _look = new THREE.Vector3();
function updateCamera(dt) {
  let sx = 0, sy = 0;
  if (shake > 0) {
    shake = Math.max(0, shake - dt * 2.4);
    const m = shake * shake, t = performance.now() / 1000;
    sx = Math.sin(t * 47) * m * 0.5; sy = Math.cos(t * 41) * m * 0.4;
  }
  const rx = runner.group.position.x;
  camera.position.set(rx * 0.45 + sx, 4.2 + sy, 7.4);
  _look.set(rx * 0.2, 1.0, -10);
  camera.lookAt(_look);
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function showOverlay(html) { overlay.innerHTML = html; overlay.style.display = 'block'; }

function showTitle() {
  showOverlay(
    `<div style="font-size:60px;font-weight:bold;letter-spacing:8px">RIBBON</div>` +
    `<div style="font-size:13px;opacity:.55;margin:6px 0 26px">a minimalist vector run · read the cue, hit the beat</div>` +
    `<div style="font-size:15px;opacity:.85">ENTER / TAP to start</div>` +
    `<div style="font-size:12px;opacity:.5;margin-top:18px;line-height:1.7">` +
    `↑ / W / Space — JUMP &nbsp;&nbsp; ↓ / S — SLIDE<br>` +
    `← / A — DODGE LEFT &nbsp;&nbsp; → / D — DODGE RIGHT<br>` +
    `touch: swipe in the cue's direction</div>`);
}

function heart(x, y, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.3);
  ctx.bezierCurveTo(x, y - r * 0.5, x - r, y - r * 0.5, x - r, y + r * 0.25);
  ctx.bezierCurveTo(x - r, y + r * 0.8, x, y + r, x, y + r * 1.2);
  ctx.bezierCurveTo(x, y + r, x + r, y + r * 0.8, x + r, y + r * 0.25);
  ctx.bezierCurveTo(x + r, y - r * 0.5, x, y - r * 0.5, x, y + r * 0.3);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
}

function drawHUD() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
  const W = uiCanvas.width, H = uiCanvas.height;

  // accent flash wash on a clear / miss
  if (flash > 0) {
    ctx.fillStyle = css(flashCol); ctx.globalAlpha = flash * 0.18;
    ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  }
  if (gameState === 'perk') { drawPerks(W, H); return; }
  if (gameState !== 'playing' && gameState !== 'paused') return;

  // hearts + shields (top-left)
  for (let i = 0; i < maxHealth; i++) heart(24 + i * 26, 26, 9, i < health ? css(ACCENT) : 'rgba(20,20,20,.13)');
  for (let i = 0; i < shields; i++) {
    ctx.beginPath(); ctx.arc(24 + (maxHealth) * 26 + i * 18, 30, 6, 0, Math.PI * 2);
    ctx.fillStyle = css(SHIELD); ctx.fill();
  }

  // score / combo / hi (top-right)
  ctx.textAlign = 'right'; ctx.fillStyle = css(INK);
  ctx.font = 'bold 22px monospace'; ctx.fillText(`${score}`, W - 18, 30);
  ctx.font = '11px monospace'; ctx.fillStyle = 'rgba(20,20,20,.55)';
  ctx.fillText(`HI ${hiScore}  ·  ×${scoreMul.toFixed(1)}`, W - 18, 48);
  if (combo > 1) { ctx.fillStyle = css(GOOD); ctx.font = 'bold 16px monospace'; ctx.fillText(`COMBO ×${combo}`, W - 18, 70); }

  // distance + next tune-up (top-centre)
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(20,20,20,.5)'; ctx.font = '12px monospace';
  ctx.fillText(`${Math.floor(track.traveled)} m`, W / 2, 26);
  ctx.fillText(`tune-up in ${Math.max(0, CLEARS_PER_TUNE - clearsSinceTune)}`, W / 2, 44);

  // control legend (bottom)
  ctx.textAlign = 'center'; ctx.font = '12px monospace'; ctx.fillStyle = 'rgba(20,20,20,.45)';
  ctx.fillText('↑ JUMP    ↓ SLIDE    ← DODGE    → DODGE', W / 2, H - 22);
}

function drawPerks(W, H) {
  ctx.textAlign = 'center';
  ctx.fillStyle = css(INK); ctx.font = 'bold 30px monospace';
  ctx.fillText('TUNE-UP', W / 2, H * 0.26);
  ctx.font = '13px monospace'; ctx.fillStyle = 'rgba(20,20,20,.55)';
  ctx.fillText('pick one — press 1 / 2 / 3 or tap', W / 2, H * 0.26 + 24);

  const cw = Math.min(220, (W - 80) / 3), ch = 150, gap = 20;
  const total = perks.length * cw + (perks.length - 1) * gap;
  let x = (W - total) / 2, y = H / 2 - ch / 2;
  input.tapTargets = [];
  perks.forEach((p, i) => {
    ctx.strokeStyle = css(INK); ctx.lineWidth = 2;
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, cw, ch); ctx.strokeRect(x, y, cw, ch);
    ctx.fillStyle = css(ACCENT); ctx.font = 'bold 22px monospace'; ctx.fillText(`${i + 1}`, x + cw / 2, y + 38);
    ctx.fillStyle = css(INK); ctx.font = 'bold 15px monospace'; ctx.fillText(p.name, x + cw / 2, y + 78);
    ctx.fillStyle = 'rgba(20,20,20,.6)'; ctx.font = '12px monospace';
    wrap(p.desc, x + cw / 2, y + 104, cw - 24);
    input.tapTargets.push({ x, y, w: cw, h: ch, fn: () => pickPerk(i) });
    x += cw + gap;
  });
}
function wrap(text, cx, cy, maxw) {
  const words = text.split(' '); let line = '', yy = cy;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxw && line) { ctx.fillText(line, cx, yy); line = w; yy += 16; }
    else line = test;
  }
  ctx.fillText(line, cx, yy);
}

// ── Loop ──────────────────────────────────────────────────────────────────────
let prev = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
  if (flash > 0) flash = Math.max(0, flash - dt * 1.6);

  if (gameState === 'playing') {
    const c = ctxNow();
    for (const m of track.update(dt, c)) onMiss();
    runner.update(dt, c.speed * 0.85);
  } else {
    runner.update(dt, 6);           // jog in place on menus
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  drawHUD();
}

// ── Resize / boot ─────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  uiCanvas.width = innerWidth; uiCanvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();
showTitle();
loop();
