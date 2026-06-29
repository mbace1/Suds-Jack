import { setOrigin } from './proj.js';
import { COL } from './palette.js';
import { Player } from './player.js';
import { PaperPool } from './paper.js';
import { World } from './world.js';
import { InputManager } from './input.js';
import { audio } from './audio.js';

const DAY_DIST     = 130;
const PAPERS_START = 12;
const MAX_PAPERS   = 20;
const PAPERS_REFILL = 6;
const MAX_LIVES    = 3;
const SCROLL_OFFSET = 5;   // player sits this many f-units above the scroll origin

const canvas  = document.getElementById('game');
const ctx     = canvas.getContext('2d');
const overlay = document.getElementById('overlay');

function resize() {
  canvas.width  = innerWidth;
  canvas.height = innerHeight;
  setOrigin(innerWidth * 0.40, innerHeight * 0.72);
}
addEventListener('resize', resize);
resize();

// ── instances ─────────────────────────────────────────────────────────────────
const input     = new InputManager();
const player    = new Player();
const world     = new World();
const paperPool = new PaperPool();

// ── state ─────────────────────────────────────────────────────────────────────
let state = 'title';   // 'title' | 'playing' | 'paused' | 'dying' | 'gameover'
let score = 0, hi = +localStorage.getItem('paperRouteHi') || 0;
let lives = MAX_LIVES, papers = PAPERS_START;
let day = 1, streak = 1, dayStartF = 0;

// ── state transitions ─────────────────────────────────────────────────────────
function startGame() {
  score = 0; lives = MAX_LIVES; papers = PAPERS_START;
  day = 1; streak = 1;
  player.reset();
  dayStartF = player.f;
  world.reset(player.f);
  paperPool.clear();
  state = 'playing';
  overlay.style.display = 'none';
}

function showTitle() {
  state = 'title';
  player.hide();
  overlay.style.display = 'block';
  overlay.innerHTML = [
    `<div style="font-size:clamp(28px,7vw,56px);color:${COL.barWarn};letter-spacing:3px">PAPER ROUTE</div>`,
    `<div style="font-size:clamp(11px,2.5vw,18px);color:${COL.barGood};margin-top:6px">DAWN RUN</div>`,
    `<div style="font-size:clamp(10px,2vw,14px);margin-top:28px">A / D &nbsp;or&nbsp; ← / → &nbsp;&nbsp;steer</div>`,
    `<div style="font-size:clamp(10px,2vw,14px);margin-top:4px">W / S &nbsp;throttle</div>`,
    `<div style="font-size:clamp(10px,2vw,14px);margin-top:4px">Z / X / M &nbsp;throw &nbsp;(Space = quick throw)</div>`,
    `<div style="font-size:clamp(13px,3vw,20px);color:${COL.barGood};margin-top:28px">ENTER or SPACE to play</div>`,
    hi > 0 ? `<div style="font-size:clamp(10px,2vw,14px);color:${COL.barWarn};margin-top:18px">HI-SCORE &nbsp;${hi}</div>` : '',
  ].join('');
}

function showGameOver() {
  state = 'gameover';
  const newHi = score > hi;
  if (newHi) { hi = score; localStorage.setItem('paperRouteHi', hi); }
  overlay.style.display = 'block';
  overlay.innerHTML = [
    `<div style="font-size:clamp(26px,6vw,48px);color:${COL.barDanger}">GAME OVER</div>`,
    `<div style="font-size:clamp(14px,3vw,24px);margin-top:16px">SCORE &nbsp;${score}</div>`,
    newHi && score > 0 ? `<div style="font-size:clamp(10px,2vw,14px);color:${COL.barWarn};margin-top:8px">NEW HIGH SCORE!</div>` : `<div style="font-size:clamp(10px,2vw,14px);color:${COL.barInk};margin-top:8px;opacity:0.5">HI &nbsp;${hi}</div>`,
    `<div style="font-size:clamp(13px,3vw,20px);color:${COL.barGood};margin-top:28px">ENTER or SPACE to retry</div>`,
  ].join('');
}

// ── input wiring ──────────────────────────────────────────────────────────────
input.onStart = () => {
  if (state === 'title' || state === 'gameover') { startGame(); return; }
  if (state === 'playing') {
    state = 'paused';
    overlay.style.display = 'block';
    overlay.innerHTML = [
      `<div style="font-size:clamp(22px,5vw,44px)">PAUSED</div>`,
      `<div style="font-size:clamp(10px,2vw,14px);color:${COL.barGood};margin-top:16px">ESC or ENTER to resume</div>`,
    ].join('');
  } else if (state === 'paused') {
    state = 'playing';
    overlay.style.display = 'none';
  }
};
input.onPause = () => {
  if (state === 'playing') { input.onStart(); }
  else if (state === 'paused') { state = 'playing'; overlay.style.display = 'none'; }
};
input.onThrow = () => {
  if (state !== 'playing') return;
  if (papers <= 0) { audio.empty(); return; }
  paperPool.throw_(player.s, player.f);
  papers--;
  audio.throw_();
};

// ── loop ──────────────────────────────────────────────────────────────────────
let last = 0;

function loop(ts) {
  const dt = last ? Math.min((ts - last) / 1000, 0.05) : 0;
  last = ts;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (state === 'playing') {
    player.update(dt, input.getSteer(), input.getThrottle());

    const scrollF = player.f - SCROLL_OFFSET;
    world.update(dt, scrollF, ts / 1000);
    paperPool.update(dt);

    // resolve paper landings
    for (const p of paperPool.freshLandings()) {
      const r = world.resolvePaper(p);
      if (r.result === 'deliver') {
        score += r.points * streak; streak++;
        audio.deliver();
      } else if (r.result === 'smash') {
        score += r.points; streak = 1;
        audio.smash();
      }
    }

    // missed subscriber houses break the streak
    if (world.missedEvents > 0) { streak = 1; world.missedEvents = 0; }

    // pickup
    if (world.pickupHit(player.s, player.f)) {
      papers = Math.min(papers + PAPERS_REFILL, MAX_PAPERS);
      audio.pickup();
    }

    // hazard collision
    if (world.hazardHit(player.s, player.f) && player.crash()) {
      lives--; streak = 1;
      audio.crash();
      if (lives <= 0) {
        player.hide();
        state = 'dying';
        setTimeout(showGameOver, 900);
      }
    }

    // day clear
    if (player.f - dayStartF >= DAY_DIST) {
      dayStartF += DAY_DIST;
      day++;
      score += 500;
      papers = Math.min(papers + PAPERS_START, MAX_PAPERS);
      player.setBaseSpeed(5.5 + day * 0.35);
      world.setDifficulty(day);
      audio.dayClear();
    }
  }

  // draw world during active play states
  if (state !== 'title') {
    const scrollF = player.f - SCROLL_OFFSET;
    world.draw(ctx, scrollF, player, paperPool);
    drawHUD();
    drawTouch();
  }

  requestAnimationFrame(loop);
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function drawHUD() {
  const W = canvas.width, BH = 40;
  ctx.fillStyle = COL.barBg;
  ctx.fillRect(0, 0, W, BH);
  ctx.fillStyle = COL.barEdge;
  ctx.fillRect(0, BH, W, 2);

  ctx.textBaseline = 'middle';

  // lives
  ctx.font = 'bold 16px monospace';
  let x = 12;
  for (let i = 0; i < MAX_LIVES; i++) {
    ctx.globalAlpha = i < lives ? 1 : 0.2;
    ctx.fillStyle = COL.barDanger;
    ctx.fillText('♥', x, BH / 2);
    x += 20;
  }
  ctx.globalAlpha = 1;

  // papers
  x += 6;
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = COL.bundle;
  ctx.fillText('[' + papers + ']', x, BH / 2);

  // score (centred)
  ctx.fillStyle = COL.barInk;
  ctx.textAlign = 'center';
  ctx.fillText(score, W / 2, BH / 2);
  ctx.textAlign = 'left';

  // day (right)
  ctx.fillStyle = COL.barWarn;
  ctx.textAlign = 'right';
  ctx.fillText('DAY ' + day, W - 12, BH / 2);
  ctx.textAlign = 'left';

  // day progress bar
  const traveled = (state === 'playing' || state === 'dying')
    ? Math.min((player.f - dayStartF) / DAY_DIST, 1) : 0;
  const bw = Math.min(200, W * 0.28), bx = (W - bw) / 2, by = BH + 4;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(bx, by, bw, 4);
  ctx.fillStyle = COL.barGood;
  ctx.fillRect(bx, by, bw * traveled, 4);

  // streak badge
  if (streak > 2 && state === 'playing') {
    ctx.font = '11px monospace';
    ctx.fillStyle = COL.barGood;
    ctx.textAlign = 'center';
    ctx.fillText('\xd7' + streak + ' streak', W / 2, BH + 17);
    ctx.textAlign = 'left';
  }

  ctx.textBaseline = 'alphabetic';
}

// ── touch controls ────────────────────────────────────────────────────────────
function drawTouch() {
  if (!navigator.maxTouchPoints) return;
  const b = input.throwBtn;

  // throw button ring
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = COL.paper;
  ctx.font = Math.round(b.r * 0.75) + 'px monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✉', b.x, b.y);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 1;

  // stick visualisation
  if (input.stick.active) {
    const { ox, oy, dx, dy } = input.stick;
    ctx.globalAlpha = 0.13; ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(ox, oy, 64, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.arc(ox + dx, oy + dy, 22, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

// ── start ─────────────────────────────────────────────────────────────────────
showTitle();
requestAnimationFrame(loop);
