import * as THREE from 'three';
import { InputManager } from './input.js';
import { BulletPool } from './bullet.js';
import { Player, PLAYER_RADIUS } from './player.js';
import { Enemy, Pattern, ENEMY_RADIUS } from './enemy.js';

const HALF = 15; // arena half-size
const BULLET_R = 0.15;

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas-game'),
  antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
resize();

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);
scene.fog = new THREE.Fog(0x0d0d1a, 35, 65);

// ── Camera: angled perspective (isometric-ish) ────────────────────────────────
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 22, 16);
camera.lookAt(0, 0, -1);

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

scene.add(new THREE.GridHelper(HALF * 2, 24, 0x22224a, 0x22224a));

// Subtle border ring
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

function spawnWave() {
  for (const e of enemies) e.removeFrom(scene);
  enemies = [];
  const patterns = [Pattern.RING, Pattern.SPIRAL, Pattern.SPREAD, Pattern.ALTERNATING];
  patterns.forEach((p, i) => {
    const angle = (i / patterns.length) * Math.PI * 2;
    const r = HALF * 0.6;
    enemies.push(new Enemy(scene, p, Math.cos(angle) * r, Math.sin(angle) * r));
  });
  wave++;
}

player.reset();
spawnWave();

input.onDash = () => player.dash(input.getAimDir());

// ── Mouse aim via raycasting ──────────────────────────────────────────────────
const raycaster  = new THREE.Raycaster();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit        = new THREE.Vector3();
const _ndc        = new THREE.Vector2();

function mouseAimDir() {
  _ndc.set(
    (input.mouse.x / innerWidth)  *  2 - 1,
    (input.mouse.y / innerHeight) * -2 + 1,
  );
  raycaster.setFromCamera(_ndc, camera);
  if (!raycaster.ray.intersectPlane(groundPlane, _hit)) return { x: 0, z: 0, valid: false };
  const dx = _hit.x - player.position.x;
  const dz = _hit.z - player.position.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.5) return { x: 0, z: 0, valid: false };
  return { x: dx / len, z: dz / len, valid: input.mouse.down };
}

// ── UI canvas (joystick overlay) ──────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx      = uiCanvas.getContext('2d');
const overlay  = document.getElementById('overlay');

function drawStick(stick, defaultX, defaultY) {
  const bx = stick.active ? stick.ox : defaultX;
  const by = stick.active ? stick.oy : defaultY;
  const R  = 60, kr = 28;

  ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle   = 'rgba(255,255,255,0.05)'; ctx.fill();

  const clamp = v => Math.max(-R, Math.min(R, v));
  ctx.beginPath(); ctx.arc(bx + clamp(stick.dx), by + clamp(stick.dy), kr, 0, Math.PI * 2);
  ctx.fillStyle = stick.active ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.13)';
  ctx.fill();
}

function drawUI() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
  drawStick(input.left,  uiCanvas.width * 0.22, uiCanvas.height * 0.78);
  drawStick(input.right, uiCanvas.width * 0.78, uiCanvas.height * 0.78);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '14px monospace';
  ctx.fillText(`WAVE ${wave}`, 16, 24);
}

// ── Game state ────────────────────────────────────────────────────────────────
let gameOver      = false;
let restartTimer  = 0;

// ── Main loop ─────────────────────────────────────────────────────────────────
let prev = performance.now();

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt  = Math.min((now - prev) / 1000, 0.05);
  prev = now;

  if (gameOver) {
    restartTimer -= dt;
    if (restartTimer <= 0) {
      gameOver = false;
      overlay.style.display = 'none';
      player.reset();
      bullets.clear();
      spawnWave();
    }
    renderer.render(scene, camera);
    drawUI();
    return;
  }

  // Input
  const moveDir = input.getMoveDir();
  let aimDir    = input.getAimDir();
  if (aimDir.useMouse) aimDir = mouseAimDir();

  // Update
  player.update(dt, moveDir, aimDir, bullets, HALF);
  for (const e of enemies) { if (e.alive) e.update(dt, player.position, bullets); }
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
        e.destroy();
        bullets.recycleAt(i);
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
        player.die();
        bullets.recycleAt(i);
        triggerGameOver();
        break;
      }
    }
  }

  // All enemies dead → next wave
  if (enemies.length && enemies.every(e => !e.alive)) {
    bullets.clear();
    spawnWave();
  }

  renderer.render(scene, camera);
  drawUI();
}

function triggerGameOver() {
  gameOver = true;
  restartTimer = 2.5;
  overlay.style.display = 'block';
  overlay.textContent = 'YOU DIED';
}

// ── Resize ────────────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  if (camera) {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  uiCanvas.width  = innerWidth;
  uiCanvas.height = innerHeight;
}
window.addEventListener('resize', resize);

loop();
