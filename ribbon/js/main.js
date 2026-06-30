import * as THREE from 'three';
import { InputManager } from './input.js?v=2';
import { Player } from './player.js?v=2';
import { Enemy, ENEMY_COST } from './enemy.js?v=2';
import { ProjectilePool } from './projectile.js?v=2';
import { World, ARENA_R } from './world.js?v=2';
import { itemById } from './items.js?v=2';
import { C, INK, RARITY } from './shared.js?v=2';
import { audio } from './audio.js?v=2';

const css = h => '#' + (h >>> 0).toString(16).padStart(6, '0').slice(-6);

// ── Renderer / scene ──────────────────────────────────────────────────────────
const gameCanvas = document.getElementById('canvas-game');
const renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);

// ── Objects ───────────────────────────────────────────────────────────────────
const input = new InputManager(gameCanvas);
const pool = new ProjectilePool(scene);
const player = new Player(scene, pool);
const world = new World(scene);

// ── Run state ─────────────────────────────────────────────────────────────────
let gameState = 'title';   // title | playing | paused | gameover
let gold = 0, kills = 0, stage = 1, runTime = 0, difficulty = 1;
let credits = 0, spawnCD = 0, shake = 0, bossAlive = false;
let enemies = [], toasts = [], prompt = '';
let hiStage = parseInt(localStorage.getItem('ribbonHiStage') || '1');

const DIFF_TIERS = [
  [1.3, 'EASY', 0x39c66b], [1.9, 'NORMAL', 0x2b8cff], [2.8, 'HARD', 0xf5a623],
  [4.0, 'VERY HARD', 0xff7a45], [5.5, 'INSANE', 0xff3b30], [7.5, 'IMPOSSIBLE', 0xd11f1f],
  [10, 'I SEE YOU', 0xb1119b], [1e9, 'HAHAHA', 0x8e1f6b],
];
function diffTier() { for (const t of DIFF_TIERS) if (difficulty < t[0]) return t; return DIFF_TIERS[DIFF_TIERS.length - 1]; }
function scaling() { return { hpMul: Math.pow(difficulty, 1.1), dmgMul: 0.5 + (difficulty - 1) * 0.55 }; }

// ── HUD / overlay ─────────────────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx = uiCanvas.getContext('2d');
const overlay = document.getElementById('overlay');
function showOverlay(html) { overlay.innerHTML = html; overlay.style.display = 'block'; }

function showTitle() {
  showOverlay(
    `<div style="font-size:58px;font-weight:bold;letter-spacing:6px">RIBBON</div>` +
    `<div style="font-size:13px;opacity:.55;margin:6px 0 22px">a minimalist survival roguelike — loot, scale, charge the teleporter, escape</div>` +
    `<div style="font-size:15px;opacity:.85">CLICK / ENTER to start</div>` +
    `<div style="font-size:12px;opacity:.5;margin-top:16px;line-height:1.7">` +
    `WASD move · mouse aim · hold LMB fire · Shift sprint · Space jump<br>` +
    `RMB secondary · Q dash · R nova · F open chest / use teleporter</div>`);
}
function showPause() { showOverlay(`<div style="font-size:42px;font-weight:bold">PAUSED</div><div style="font-size:13px;opacity:.5;margin-top:10px">ESC to resume</div>`); }
function showGameOver() {
  const best = stage >= hiStage;
  showOverlay(
    `<div style="font-size:42px;font-weight:bold;letter-spacing:3px">YOU DIED</div>` +
    `<div style="font-size:18px;margin-top:10px;color:${css(C.gold)}">reached STAGE ${stage} · ${fmtTime(runTime)}</div>` +
    `<div style="font-size:14px;opacity:.7;margin-top:4px">${kills} kills · ${gold} gold banked</div>` +
    (best ? `<div style="font-size:15px;color:${css(C.enemy)};margin-top:6px">FURTHEST YET!</div>` : ``) +
    `<div style="font-size:13px;opacity:.5;margin-top:16px">CLICK / ENTER to run again</div>`);
}
function fmtTime(s) { const m = (s / 60) | 0, ss = (s % 60) | 0; return `${m}:${ss.toString().padStart(2, '0')}`; }
function toast(text, color) { toasts.push({ text, color, t: 3 }); }

// ── Flow ──────────────────────────────────────────────────────────────────────
function startGame() {
  overlay.style.display = 'none';
  gold = 0; kills = 0; stage = 1; runTime = 0; difficulty = 1; credits = 0; spawnCD = 0;
  bossAlive = false; prompt = ''; toasts = [];
  for (const e of enemies) e.dispose(); enemies = []; pool.clear();
  player.reset();
  world.newStage(1);
  gameState = 'playing'; audio.start();
}
function gameOver() {
  gameState = 'gameover'; shake = 1;
  if (stage > hiStage) { hiStage = stage; localStorage.setItem('ribbonHiStage', hiStage); }
  audio.gameover(); showGameOver();
}
function nextStage() {
  stage++; difficulty *= 1.0;        // time keeps driving difficulty; stage adds via scaling()
  for (const e of enemies) e.dispose(); enemies = []; pool.clear();
  bossAlive = false; gold += 25 * stage;
  player.x = 0; player.z = 0; player.vx = player.vz = 0;
  world.newStage(stage);
  audio.stageClear(); toast(`STAGE ${stage}`, C.tele);
}

// ── Spawn director ────────────────────────────────────────────────────────────
function spawnEnemy(type) {
  const e = new Enemy(scene, type, scaling());
  const a = Math.random() * Math.PI * 2, r = 22 + Math.random() * 12;
  let x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
  x = Math.max(-ARENA_R + 2, Math.min(ARENA_R - 2, x)); z = Math.max(-ARENA_R + 2, Math.min(ARENA_R - 2, z));
  e.place(x, z); enemies.push(e);
  if (e.boss) { bossAlive = true; audio.bossSpawn(); }
  return e;
}
function pickType() {
  const r = Math.random();
  if (difficulty > 2.2 && r < 0.22) return 'brute';
  if (r < 0.4) return 'gunner';
  return 'grunt';
}
function director(dt) {
  const charging = world.tele.state === 'charging';
  credits += dt * (2.2 + difficulty * 1.5) * (charging ? 2.2 : 1);
  const cap = 16 + stage * 3 + (charging ? 12 : 0);
  spawnCD -= dt;
  if (spawnCD <= 0 && enemies.length < cap) {
    spawnCD = Math.max(0.25, 1.4 - difficulty * 0.06);
    const type = pickType();
    const cost = ENEMY_COST[type] * (1 + difficulty * 0.25);
    if (credits >= cost) { credits -= cost; spawnEnemy(type); }
  }
}

// ── Collisions ────────────────────────────────────────────────────────────────
function collide() {
  for (let i = pool.active.length - 1; i >= 0; i--) {
    const p = pool.active[i];
    if (p.fromPlayer) {
      let consumed = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (p.hitSet && p.hitSet.has(e)) continue;
        if (Math.hypot(e.x - p.x, e.z - p.z) > 1.1 + p.r) continue;
        const dead = e.takeDamage(p.damage);
        if (player.stats.lifesteal) player.heal(player.stats.lifesteal);
        if (dead) { onEnemyDead(e); }
        if (p.pierce > 0) { p.pierce--; (p.hitSet || (p.hitSet = new Set())).add(e); }
        else { consumed = true; }
        break;
      }
      if (consumed) pool.recycle(i);
    } else {
      if (Math.hypot(player.x - p.x, player.z - p.z) < 1.0 + p.r) {
        player.hurt(p.damage); pool.recycle(i);
        if (!player.alive) gameOver();
      }
    }
  }
  // clear dead enemies left in array
  for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) { enemies[i].dispose(); enemies.splice(i, 1); }
}
function onEnemyDead(e) {
  gold += Math.round(e.gold * player.stats.goldMult); kills++; audio.kill();
  if (e.boss) { bossAlive = false; toast('BOSS DOWN', C.gold); }
}

// ── Interact (chest / teleporter) ─────────────────────────────────────────────
input.onInteract = () => {
  if (gameState !== 'playing') return;
  const c = world.nearestChest(player.x, player.z);
  if (c) {
    if (gold >= c.cost) { gold -= c.cost; const it = world.openChest(c); player.addItem(it.id); audio.chest(); toast(`${it.name}`, RARITY[it.rarity]); }
    else toast('NOT ENOUGH GOLD', C.enemy);
    return;
  }
  if (world.inTeleporter(player.x, player.z)) {
    if (world.tele.state === 'idle') { world.startCharge(); spawnEnemy('boss'); toast('TELEPORTER ENGAGED — survive!', C.tele); audio.teleport(); }
    else if (world.tele.state === 'ready') { audio.teleport(); nextStage(); }
  }
};
input.onSecondary = () => { if (gameState === 'playing') { player.secondary(enemies); audio.secondary(); } };
input.onUtility   = () => { if (gameState === 'playing') { const c0 = player.cool.q; player.utility(); if (player.cool.q !== c0) audio.dash(); } };
input.onSpecial   = () => { if (gameState === 'playing') { const c0 = player.cool.r; player.special(enemies); if (player.cool.r !== c0) audio.special(); } };
input.onStart = () => { if (gameState === 'title' || gameState === 'gameover') startGame(); };
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused'; showPause(); }
  else if (gameState === 'paused') { overlay.style.display = 'none'; gameState = 'playing'; }
};

// ── Camera ────────────────────────────────────────────────────────────────────
const _tgt = new THREE.Vector3();
function updateCamera() {
  const yaw = input.yaw, pitch = input.pitch, dist = 12;
  _tgt.set(player.x, player.y + 1.4, player.z);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  let sx = 0, sy = 0;
  if (shake > 0) { const m = shake * shake, t = performance.now() / 1000; sx = Math.sin(t * 53) * m * 0.6; sy = Math.cos(t * 47) * m * 0.5; }
  camera.position.set(
    _tgt.x + Math.sin(yaw) * dist * cp + sx,
    _tgt.y + sp * dist + sy,
    _tgt.z + Math.cos(yaw) * dist * cp);
  camera.lookAt(_tgt.x, _tgt.y, _tgt.z);   // over-the-shoulder, looking down onto the arena
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function bar(x, y, w, h, k, color, bg = 'rgba(20,20,20,.12)') {
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, k)), h);
  ctx.strokeStyle = css(INK); ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
}
const _v = new THREE.Vector3();
function enemyBars() {
  for (const e of enemies) {
    if (!e.alive) continue;
    _v.set(e.x, 2.2 * (e.boss ? 2 : 1) + 0.6, e.z).project(camera);
    if (_v.z > 1) continue;
    const sx = (_v.x * 0.5 + 0.5) * uiCanvas.width, sy = (-_v.y * 0.5 + 0.5) * uiCanvas.height;
    const w = e.boss ? 120 : 34, h = e.boss ? 7 : 4;
    bar(sx - w / 2, sy, w, h, e.hp / e.maxHp, css(e.boss ? C.boss : C.enemy));
  }
}
function skillIcon(x, y, key, label, cd, cdMax) {
  const s = 46;
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = css(INK); ctx.lineWidth = 2; ctx.strokeRect(x, y, s, s);
  if (cd > 0) { ctx.fillStyle = 'rgba(20,20,20,.55)'; ctx.fillRect(x, y, s, s * (cd / cdMax)); }
  ctx.fillStyle = css(INK); ctx.textAlign = 'center';
  ctx.font = 'bold 16px monospace'; ctx.fillText(key, x + s / 2, y + 20);
  ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(20,20,20,.6)'; ctx.fillText(label, x + s / 2, y + 38);
  return s;
}
function drawHUD() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
  const W = uiCanvas.width, H = uiCanvas.height;
  input.btns = [];
  if (gameState !== 'playing' && gameState !== 'paused') return;

  enemyBars();

  // crosshair
  ctx.strokeStyle = 'rgba(20,20,20,.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 5, 0, Math.PI * 2); ctx.stroke();

  // health + gold (top-left)
  ctx.textAlign = 'left';
  bar(16, 16, 240, 18, player.hp / player.stats.maxHp, css(C.hp));
  ctx.fillStyle = css(INK); ctx.font = 'bold 12px monospace';
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.stats.maxHp}`, 22, 30);
  ctx.fillStyle = css(C.gold); ctx.font = 'bold 16px monospace';
  ctx.fillText(`$ ${gold}`, 16, 56);

  // timer + difficulty + stage (top-center)
  const tier = diffTier();
  ctx.textAlign = 'center';
  ctx.fillStyle = css(INK); ctx.font = 'bold 20px monospace'; ctx.fillText(fmtTime(runTime), W / 2, 28);
  ctx.fillStyle = css(tier[2]); ctx.font = 'bold 13px monospace'; ctx.fillText(tier[1], W / 2, 46);
  ctx.fillStyle = 'rgba(20,20,20,.6)'; ctx.font = '12px monospace'; ctx.fillText(`STAGE ${stage}`, W / 2, 62);

  // skill bar (bottom-center)
  let sx = W / 2 - (46 * 4 + 30) / 2, sy = H - 64;
  skillIcon(sx, sy, 'M1', 'FIRE', 0, 1); sx += 56;
  skillIcon(sx, sy, 'M2', 'SLUG', player.cool.m2, 2.6); sx += 56;
  skillIcon(sx, sy, 'Q', 'DASH', player.cool.q, 4); sx += 56;
  skillIcon(sx, sy, 'R', 'NOVA', player.cool.r, 9);

  // inventory (left column of item chips)
  let iy = 78; ctx.textAlign = 'left'; ctx.font = 'bold 11px monospace';
  for (const [id, n] of player.inv) {
    const it = itemById(id); if (!it) continue;
    ctx.fillStyle = css(RARITY[it.rarity]); ctx.fillRect(16, iy, 12, 12);
    ctx.strokeStyle = css(INK); ctx.lineWidth = 1; ctx.strokeRect(16, iy, 12, 12);
    ctx.fillStyle = css(INK); ctx.fillText(`${it.name} ×${n}`, 34, iy + 10);
    iy += 18;
  }

  // teleporter charge + prompts
  if (world.tele.state === 'charging') {
    ctx.textAlign = 'center'; ctx.fillStyle = css(C.tele); ctx.font = 'bold 13px monospace';
    ctx.fillText(world.inTeleporter(player.x, player.z) ? 'CHARGING…' : 'RETURN TO THE TELEPORTER', W / 2, H - 92);
    bar(W / 2 - 130, H - 86, 260, 12, world.tele.progress, css(C.tele));
  } else if (world.tele.state === 'ready') {
    ctx.textAlign = 'center'; ctx.fillStyle = css(C.hp); ctx.font = 'bold 14px monospace';
    ctx.fillText('TELEPORTER READY — stand in it and press F', W / 2, H - 92);
  }
  // contextual interact prompt
  const c = world.nearestChest(player.x, player.z);
  if (c) { ctx.textAlign = 'center'; ctx.fillStyle = css(C.gold); ctx.font = 'bold 13px monospace';
    ctx.fillText(`F — open chest ($${c.cost})`, W / 2, H - 110); }
  else if (world.tele.state === 'idle' && world.inTeleporter(player.x, player.z)) {
    ctx.textAlign = 'center'; ctx.fillStyle = css(C.tele); ctx.font = 'bold 13px monospace';
    ctx.fillText('F — engage teleporter', W / 2, H - 110); }

  // toasts
  ctx.textAlign = 'center'; ctx.font = 'bold 15px monospace';
  toasts.forEach((t, i) => { ctx.globalAlpha = Math.min(1, t.t); ctx.fillStyle = css(t.color);
    ctx.fillText(t.text, W / 2, H * 0.32 + i * 22); ctx.globalAlpha = 1; });

  // off-screen teleporter arrow when not idle-found
  drawTeleArrow(W, H);

  // touch buttons (mobile)
  if ('ontouchstart' in window) drawTouchButtons(W, H);
}
function drawTeleArrow(W, H) {
  _v.set(world.tele.x, 1, world.tele.z).project(camera);
  const onScreen = _v.z < 1 && Math.abs(_v.x) < 1 && Math.abs(_v.y) < 1;
  if (onScreen) return;
  const ang = Math.atan2(world.tele.z - player.z, world.tele.x - player.x) - input.yaw + Math.PI / 2;
  const r = Math.min(W, H) * 0.32, ax = W / 2 + Math.cos(ang) * r, ay = H / 2 + Math.sin(ang) * r;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang + Math.PI / 2);
  ctx.fillStyle = css(world.tele.state === 'ready' ? C.hp : C.tele);
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawTouchButtons(W, H) {
  const defs = [['m2', 'M2', W - 60, H - 150], ['q', 'Q', W - 130, H - 110], ['r', 'R', W - 60, H - 80], ['f', 'F', W - 130, H - 200]];
  for (const [id, label, x, y] of defs) {
    input.btns.push({ id, x, y, r: 30, label });
    ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,20,20,.06)'; ctx.fill();
    ctx.strokeStyle = css(INK); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = css(INK); ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center'; ctx.fillText(label, x, y + 5);
  }
}

// ── Loop ──────────────────────────────────────────────────────────────────────
let prev = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - prev) / 1000, 0.05); prev = now;
  if (shake > 0) shake = Math.max(0, shake - dt * 2.2);
  for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].t -= dt; if (toasts[i].t <= 0) toasts.splice(i, 1); }

  if (gameState === 'playing') {
    runTime += dt;
    difficulty = (1 + (runTime / 60) * 0.13) * Math.pow(1.16, stage - 1);
    const m = input.getMove();
    const hpBefore = player.hp;
    player.update(dt, { moveX: m.x, moveZ: m.z, sprint: input.sprint, jump: input.jump, firing: input.firing, yaw: input.yaw, enemies });
    if (input.firing && !input.sprint && player.fireT >= player.stats.fireInterval - 0.001) audio.shoot();
    for (const e of enemies) e.update(dt, player, pool);
    pool.update(dt);
    collide();
    director(dt);
    const done = world.update(dt, world.inTeleporter(player.x, player.z));
    if (done) { audio.stageClear(); toast('TELEPORTER READY', C.hp); }
    if (player.hp < hpBefore) shake = Math.max(shake, 0.5);
    if (!player.alive && gameState === 'playing') gameOver();
  } else {
    player.update(dt, { moveX: 0, moveZ: 0, sprint: false, jump: false, firing: false, yaw: input.yaw, enemies: [] });
  }

  updateCamera();
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
