import * as THREE from 'three';
import { InputManager } from './input.js';
import { BulletPool } from './bullet.js';
import { Player, PLAYER_RADIUS } from './player.js';
import { Enemy, Pattern, ENEMY_RADIUS } from './enemy.js';
import { audio } from './audio.js';

const HALF     = 18;
const BULLET_R = 0.15;

// ── Wave scaling (Nex Machina pacing) ─────────────────────────────────────────
function getWaveScale(wave) {
  const w = wave - 1;
  return {
    speedMult:    Math.min(1 + w * 0.12, 2.8),
    intervalMult: Math.max(1 - w * 0.09, 0.35),
  };
}

// Wave 1-2: 4 enemies, wave 3-5: 5, wave 6+: 6
function getEnemyPatterns(wave) {
  const base = [Pattern.RING, Pattern.SPIRAL, Pattern.SPREAD, Pattern.ALTERNATING];
  if (wave >= 3) base.push(base[Math.floor(Math.random() * 4)]);
  if (wave >= 6) base.push(base[Math.floor(Math.random() * 4)]);
  return base;
}

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas-game'),
  antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.setSize(innerWidth, innerHeight);

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);
scene.fog = new THREE.Fog(0x0d0d1a, 42, 80);

// ── Camera ────────────────────────────────────────────────────────────────────
const CAM_REST = new THREE.Vector3(0, 26, 19);
const CAM_LOOK = new THREE.Vector3(0, 0, -2);
const camera   = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 120);
camera.position.copy(CAM_REST);
camera.lookAt(CAM_LOOK);

// ── Screen shake ─────────────────────────────────────────────────────────────
let shakeTrauma = 0;
function addShake(trauma) { shakeTrauma = Math.min(shakeTrauma + trauma, 1); }
function updateShake(dt) {
  if (shakeTrauma <= 0) {
    camera.position.copy(CAM_REST);
    camera.lookAt(CAM_LOOK);
    return;
  }
  shakeTrauma = Math.max(0, shakeTrauma - dt * 2.8);
  const mag = shakeTrauma * shakeTrauma;
  const t   = performance.now() / 1000;
  camera.position.set(
    CAM_REST.x + Math.sin(t * 41) * mag * 1.8,
    CAM_REST.y + Math.sin(t * 37) * mag * 1.2,
    CAM_REST.z + Math.sin(t * 43) * mag * 1.2,
  );
  camera.lookAt(CAM_LOOK);
}

// ── Lights ────────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const sun = new THREE.DirectionalLight(0xffffff, 1.3);
sun.position.set(8, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

// ── Arena ─────────────────────────────────────────────────────────────────────
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(HALF * 2, HALF * 2),
  new THREE.MeshPhongMaterial({ color: 0x14142b }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
scene.add(new THREE.GridHelper(HALF * 2, 28, 0x22224a, 0x22224a));
const border = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF * 2, 0.05, HALF * 2)),
  new THREE.LineBasicMaterial({ color: 0x5555cc }),
);
border.position.y = 0.02;
scene.add(border);

// ── Game objects ──────────────────────────────────────────────────────────────
const input   = new InputManager();
const bullets = new BulletPool(scene);
const player  = new Player(scene);
let enemies   = [];
let wave      = 0;

// ── Score ─────────────────────────────────────────────────────────────────────
let score   = 0;
let streak  = 0;
let hiScore = parseInt(localStorage.getItem('tokoDropHi') || '0');

function onKill() {
  streak++;
  score += 100 * streak;
  addShake(0.13);
  audio.enemyDie();
}
function onPlayerHit() {
  streak = 0;
  addShake(0.38);
  audio.playerHit();
}

// ── Game state ────────────────────────────────────────────────────────────────
// 'title' | 'playing' | 'paused' | 'gameover'
let gameState    = 'title';
let restartTimer = 0;

// ── UI canvas ─────────────────────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx      = uiCanvas.getContext('2d');
const overlay  = document.getElementById('overlay');
const _proj    = new THREE.Vector3();

function toScreen(worldPos) {
  _proj.copy(worldPos).project(camera);
  return { x: (_proj.x + 1) / 2 * uiCanvas.width, y: (-_proj.y + 1) / 2 * uiCanvas.height };
}

function hexToCSS(hex) { return '#' + hex.toString(16).padStart(6, '0'); }

function drawStick(stick, defaultX, defaultY) {
  const bx = stick.active ? stick.ox : defaultX;
  const by = stick.active ? stick.oy : defaultY;
  const R = 60, kr = 28;
  ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle   = 'rgba(255,255,255,0.05)'; ctx.fill();
  const clamp = v => Math.max(-R, Math.min(R, v));
  ctx.beginPath(); ctx.arc(bx + clamp(stick.dx), by + clamp(stick.dy), kr, 0, Math.PI * 2);
  ctx.fillStyle = stick.active ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.13)';
  ctx.fill();
}

function drawHUD() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);

  if (gameState !== 'playing' && gameState !== 'paused') return;

  // Sticks
  drawStick(input.left,  uiCanvas.width * 0.22, uiCanvas.height * 0.78);
  drawStick(input.right, uiCanvas.width * 0.78, uiCanvas.height * 0.78);

  // Pause button (top centre)
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('❙❙', uiCanvas.width / 2, 36);
  ctx.textAlign = 'left';

  // Wave + score (top row)
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(`WAVE ${wave}`, 16, 24);

  ctx.textAlign = 'right';
  ctx.fillText(`${score}`, uiCanvas.width - 16, 24);
  if (streak > 1) {
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`×${streak} STREAK`, uiCanvas.width - 16, 44);
  }
  ctx.textAlign = 'left';

  // Player HP dots
  const dotR = 9, dotGap = 24, dotY = 48;
  for (let i = 0; i < player.maxHp; i++) {
    ctx.beginPath();
    ctx.arc(16 + dotR + i * dotGap, dotY, dotR, 0, Math.PI * 2);
    ctx.fillStyle = i < player.hp ? '#ff3355' : 'rgba(255,255,255,0.15)';
    ctx.fill();
  }

  // Enemy HP bars (world→screen projection)
  for (const e of enemies) {
    if (!e.alive && !e._dying) continue;
    const s = toScreen(e.position);
    const barW = 36, barH = 5;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(s.x - barW / 2, s.y - 44, barW, barH);
    ctx.fillStyle = hexToCSS(e.color);
    ctx.fillRect(s.x - barW / 2, s.y - 44, barW * e.hpFrac, barH);
  }

  // Hi-score
  if (hiScore > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`HI ${hiScore}`, uiCanvas.width - 16, 60);
    ctx.textAlign = 'left';
  }
}

// ── Overlay helpers ───────────────────────────────────────────────────────────
function showTitle() {
  overlay.style.display = 'block';
  overlay.innerHTML =
    `<div style="font-size:58px;font-weight:bold;letter-spacing:4px">TOKO DROP</div>` +
    `<div style="font-size:14px;opacity:0.5;margin:10px 0 28px">TWIN-STICK BULLET-HELL</div>` +
    `<div style="font-size:16px;opacity:0.8">SPACE / TAP TO START</div>` +
    `<div style="font-size:12px;opacity:0.4;margin-top:12px">` +
    `WASD + hold LMB to aim/fire · SPACE to dash<br>` +
    `Right stick to aim/fire · release to dash · ESC pause</div>`;
}

function showPause() {
  overlay.style.display = 'block';
  overlay.innerHTML =
    `<div style="font-size:52px;font-weight:bold">PAUSED</div>` +
    `<div style="font-size:14px;opacity:0.5;margin-top:12px">ESC / ❙❙ TO RESUME</div>`;
}

function showGameOver() {
  overlay.style.display = 'block';
  const newHi = score >= hiScore && score > 0;
  overlay.innerHTML =
    `<div style="font-size:52px;font-weight:bold">YOU DIED</div>` +
    `<div style="font-size:22px;margin-top:8px;color:#ff6644">SCORE ${score}</div>` +
    (newHi ? `<div style="font-size:16px;color:#ffdd44;margin-top:6px">NEW BEST!</div>` : ``) +
    `<div style="font-size:13px;opacity:0.4;margin-top:16px">Restarting…</div>`;
}

function announceWave() {
  overlay.style.display = 'block';
  overlay.innerHTML = `<div style="font-size:48px;font-weight:bold">WAVE ${wave}</div>`;
  setTimeout(() => { if (gameState === 'playing') overlay.style.display = 'none'; }, 1100);
}

// ── Wave / restart helpers ────────────────────────────────────────────────────
function spawnWave() {
  for (const e of enemies) e.removeFrom(scene);
  enemies = [];
  wave++;
  const { speedMult, intervalMult } = getWaveScale(wave);
  const patterns = getEnemyPatterns(wave);
  patterns.forEach((p, i) => {
    const angle = (i / patterns.length) * Math.PI * 2;
    const r     = HALF * 0.6;
    enemies.push(new Enemy(scene, p, Math.cos(angle) * r, Math.sin(angle) * r, speedMult, intervalMult));
  });
  announceWave();
}

function startGame() {
  overlay.style.display = 'none';
  score  = 0; streak = 0; wave = 0;
  player.reset();
  bullets.clear();
  spawnWave();
  gameState = 'playing';
}

function triggerGameOver() {
  gameState = 'gameover';
  restartTimer = 3.2;
  if (score > hiScore) {
    hiScore = score;
    localStorage.setItem('tokoDropHi', hiScore);
  }
  addShake(0.9);
  audio.playerDie();
  showGameOver();
}

// ── Input wiring ──────────────────────────────────────────────────────────────
input.onDash  = () => { if (gameState === 'playing') player.dash(input.getAimDir()); };
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused';  showPause(); }
  else if (gameState === 'paused')  { gameState = 'playing'; overlay.style.display = 'none'; }
  else if (gameState === 'title')   startGame();
};

// Space also starts from title on desktop (keyup so the same keyup doesn't also trigger dash)
window.addEventListener('keyup', e => {
  if (e.code === 'Space' && gameState === 'title') startGame();
});
// Tap anywhere (outside stick zones) starts from title on mobile
window.addEventListener('touchend', () => {
  if (gameState === 'title') startGame();
}, { once: false });

player.onShoot = () => audio.shoot();

// ── Mouse aim ─────────────────────────────────────────────────────────────────
const raycaster   = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit        = new THREE.Vector3();
const _ndc        = new THREE.Vector2();

function mouseAimDir() {
  _ndc.set((input.mouse.x / innerWidth) * 2 - 1, -(input.mouse.y / innerHeight) * 2 + 1);
  raycaster.setFromCamera(_ndc, camera);
  if (!raycaster.ray.intersectPlane(groundPlane, _hit)) return { x: 0, z: 0, valid: false };
  const dx = _hit.x - player.position.x;
  const dz = _hit.z - player.position.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.5) return { x: 0, z: 0, valid: false };
  return { x: dx / len, z: dz / len, valid: input.mouse.down };
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let prev = performance.now();
showTitle();

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - prev) / 1000, 0.05);
  prev = now;

  updateShake(dt);

  // Title / paused — just render the scene, no game logic
  if (gameState === 'title' || gameState === 'paused') {
    renderer.render(scene, camera);
    drawHUD();
    return;
  }

  if (gameState === 'gameover') {
    restartTimer -= dt;
    for (const e of enemies) e.updateDeath(dt);
    if (restartTimer <= 0) startGame();
    renderer.render(scene, camera);
    drawHUD();
    return;
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  const moveDir = input.getMoveDir();
  let aimDir    = input.getAimDir();
  if (aimDir.useMouse) aimDir = mouseAimDir();

  player.update(dt, moveDir, aimDir, bullets, HALF);
  for (const e of enemies) { e.update(dt, player.position, bullets); e.updateDeath(dt); }
  bullets.update(dt, HALF);

  // Collision: player bullets → enemies
  for (let i = bullets.active.length - 1; i >= 0; i--) {
    const b = bullets.active[i];
    if (!b.isPlayer) continue;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = b.mesh.position.x - e.position.x;
      const dz = b.mesh.position.z - e.position.z;
      if (Math.hypot(dx, dz) < BULLET_R + ENEMY_RADIUS) {
        const died = e.hit();
        bullets.recycleAt(i);
        if (died) onKill(); else audio.enemyHit();
        break;
      }
    }
  }

  // Collision: enemy bullets → player
  if (!player.invincible) {
    for (let i = bullets.active.length - 1; i >= 0; i--) {
      const b = bullets.active[i];
      if (b.isPlayer) continue;
      const dx = b.mesh.position.x - player.position.x;
      const dz = b.mesh.position.z - player.position.z;
      if (Math.hypot(dx, dz) < BULLET_R + PLAYER_RADIUS) {
        player.hit();
        bullets.recycleAt(i);
        onPlayerHit();
        if (!player.alive) { triggerGameOver(); break; }
        break;
      }
    }
  }

  // All enemies dead (including death animations) → next wave
  if (gameState === 'playing' && enemies.length && enemies.every(e => !e.alive && !e._dying)) {
    bullets.clear();
    audio.waveClear();
    addShake(0.22);
    score += wave * 500;
    spawnWave();
  }

  renderer.render(scene, camera);
  drawHUD();
}

// ── Resize ────────────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  if (camera) { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  uiCanvas.width = innerWidth; uiCanvas.height = innerHeight;
}
window.addEventListener('resize', resize);
resize();
loop();
