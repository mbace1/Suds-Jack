import * as THREE from 'three';
import { COL } from './palette.js?v=3';
import { InputManager } from './input.js?v=3';
import { Player, DRIVE_HALF, PLAYER_R } from './player.js?v=3';
import { PaperPool } from './paper.js?v=3';
import { World } from './world.js?v=3';
import { audio } from './audio.js?v=3';

const MAX_LIVES  = 3;
const START_PAPERS = 10;
const MAX_PAPERS = 25;
const DAY_DIST   = 130;     // metres per "day"

// Paperboy framing: the route rolls mostly UP the screen with a slight rightward
// lean (small x offset), not a hard 45° diagonal. Orthographic for the flat read.
const ISO_OFF  = new THREE.Vector3(5, 19, 21);   // camera offset from the bike
const VIEW_SIZE = 28;                             // world units shown vertically

// ── Renderer (flat & bright — Paperboy daytime, no bloom/gel) ──────────────────
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas-game'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;       // keep colours flat & poster-bright
renderer.setSize(innerWidth, innerHeight);

// ── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.sky);
scene.fog = new THREE.Fog(COL.haze, 70, 140);

function makeOrthoCamera() {
  const aspect = innerWidth / innerHeight;
  const c = new THREE.OrthographicCamera(
    -VIEW_SIZE * aspect / 2, VIEW_SIZE * aspect / 2,
     VIEW_SIZE / 2, -VIEW_SIZE / 2, -50, 220);
  return c;
}
let camera = makeOrthoCamera();

// ── Lights (bright sunny day) ──────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight(0xeaf6ff, COL.lawn, 0.95)); // sky/ground bounce
const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
sun.position.set(-14, 26, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
sun.shadow.camera.top = 34;  sun.shadow.camera.bottom = -34;
sun.shadow.camera.near = 1;  sun.shadow.camera.far = 90;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);

// ── Road + ground (follow the bike; scrolling lane texture sells the speed) ─────
function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
function makeRoadTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = hex(COL.road); g.fillRect(0, 0, 128, 128);        // asphalt
  g.fillStyle = hex(COL.roadLine);                                // yellow markings
  g.fillRect(7, 0, 5, 128); g.fillRect(116, 0, 5, 128);           // solid lane edges
  g.fillRect(61, 8, 6, 50);                                       // dashed centre line
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 90);
  tex.anisotropy = 4;
  return tex;
}
const roadTex = makeRoadTexture();
const ROAD_W = (DRIVE_HALF + 1) * 2;
const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, 700),
  new THREE.MeshLambertMaterial({ map: roadTex }));
road.rotation.x = -Math.PI / 2; road.position.y = 0.0; road.receiveShadow = true;
scene.add(road);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 700),
  new THREE.MeshLambertMaterial({ color: COL.lawn }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
scene.add(ground);

const kerbMat = new THREE.MeshLambertMaterial({ color: COL.sidewalk });
const kerbL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 700), kerbMat);
const kerbR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 700), kerbMat);
kerbL.position.set(-(DRIVE_HALF + 1.1), 0.2, 0);
kerbR.position.set( (DRIVE_HALF + 1.1), 0.2, 0);
scene.add(kerbL, kerbR);

// Grey sidewalk strip between kerb and houses (where the mailboxes sit)
const swMat = new THREE.MeshLambertMaterial({ color: COL.sidewalk });
const swGeo = new THREE.PlaneGeometry(2.0, 700);
const swL = new THREE.Mesh(swGeo, swMat); const swR = new THREE.Mesh(swGeo, swMat);
swL.rotation.x = swR.rotation.x = -Math.PI / 2; swL.position.y = swR.position.y = 0.012;
swL.position.x = -(DRIVE_HALF + 1.6); swR.position.x = (DRIVE_HALF + 1.6);
swL.receiveShadow = swR.receiveShadow = true;
scene.add(swL, swR);

// White picket fence lines along the kerb (uses a tiny picket texture)
function makeFenceTex() {
  const c = document.createElement('canvas'); c.width = 32; c.height = 16;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 32, 16); g.fillStyle = '#f7f9f4';
  g.fillRect(2, 2, 7, 14);                                    // picket
  g.fillRect(0, 7, 32, 3);                                    // top rail joining pickets
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(230, 1); tex.magFilter = THREE.NearestFilter;
  return tex;
}
const fenceTex = makeFenceTex();
const fenceGeo = new THREE.PlaneGeometry(700, 0.9);
const fenceMat = new THREE.MeshLambertMaterial({ map: fenceTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
const fenceL = new THREE.Mesh(fenceGeo, fenceMat); const fenceR = new THREE.Mesh(fenceGeo, fenceMat);
fenceL.rotation.y = fenceR.rotation.y = Math.PI / 2;
fenceL.position.set(-(DRIVE_HALF + 0.9), 0.45, 0);
fenceR.position.set( (DRIVE_HALF + 0.9), 0.45, 0);
scene.add(fenceL, fenceR);

// ── Sparks ────────────────────────────────────────────────────────────────────
class Spark {
  constructor(x, y, z, vx, vy, vz, color, size = 0.16) {
    this.vx = vx; this.vy = vy; this.vz = vz; this.life = 0.9;
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 5, 3), this.mat);
    this.mesh.position.set(x, y, z); scene.add(this.mesh);
  }
  update(dt) {
    this.life -= dt; this.vy -= 16 * dt;
    this.mesh.position.x += this.vx * dt; this.mesh.position.y += this.vy * dt; this.mesh.position.z += this.vz * dt;
    if (this.mesh.position.y < 0.05) { this.mesh.position.y = 0.05; this.vy = 0; this.vx *= 0.4; this.vz *= 0.4; }
    this.mat.opacity = Math.min(1, this.life / 0.3);
    return this.life > 0;
  }
  remove() { scene.remove(this.mesh); }
}
let sparks = [];
function burst(x, y, z, color, n = 12, spread = 6) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * spread;
    sparks.push(new Spark(x, y, z, Math.cos(a) * s, 2 + Math.random() * 4, Math.sin(a) * s, color));
  }
}

// ── Screen shake ────────────────────────────────────────────────────────────
let shakeTrauma = 0;
function addShake(v) { shakeTrauma = Math.min(shakeTrauma + v, 1); }

// ── Game objects ──────────────────────────────────────────────────────────────
const input  = new InputManager();
const player = new Player(scene);
const papers = new PaperPool(scene);
const world  = new World(scene);

let gameState = 'title';          // 'title' | 'playing' | 'paused' | 'gameover'
let score = 0, streak = 0, lives = MAX_LIVES, paperCount = START_PAPERS;
let day = 1, dayMark = 0, restartTimer = 0;
let hiScore = parseInt(localStorage.getItem('paperRouteHi') || '0');

// ── UI ─────────────────────────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx = uiCanvas.getContext('2d');
const overlay = document.getElementById('overlay');

function showTitle() {
  overlay.style.display = 'block';
  overlay.innerHTML =
    `<div style="font-size:54px;font-weight:bold;letter-spacing:3px">PAPER ROUTE</div>` +
    `<div style="font-size:14px;opacity:0.6;margin:8px 0 26px">DAWN RUN · deliver to the teal houses</div>` +
    `<div style="font-size:16px;opacity:0.85">ENTER / TAP TO START</div>` +
    `<div style="font-size:12px;opacity:0.45;margin-top:14px">` +
    `A/D or ←/→ steer · W/S throttle<br>` +
    `Z throw left · X throw right · SPACE throw<br>` +
    `Touch: left stick to ride · ◀ ▶ buttons to throw</div>`;
}
function showPause() {
  overlay.style.display = 'block';
  overlay.innerHTML = `<div style="font-size:50px;font-weight:bold">PAUSED</div>` +
    `<div style="font-size:14px;opacity:0.5;margin-top:12px">ESC TO RESUME</div>`;
}
function showGameOver() {
  overlay.style.display = 'block';
  const newHi = score >= hiScore && score > 0;
  overlay.innerHTML =
    `<div style="font-size:48px;font-weight:bold">ROUTE OVER</div>` +
    `<div style="font-size:22px;margin-top:8px;color:#108a52">SCORE ${score}</div>` +
    `<div style="font-size:15px;opacity:0.7;margin-top:4px">reached DAY ${day}</div>` +
    (newHi ? `<div style="font-size:16px;color:#c7321f;margin-top:6px">NEW BEST!</div>` : ``) +
    `<div style="font-size:13px;opacity:0.4;margin-top:16px">Restarting…</div>`;
}
function announceDay() {
  overlay.style.display = 'block';
  overlay.innerHTML = `<div style="font-size:46px;font-weight:bold">DAY ${day}</div>`;
  setTimeout(() => { if (gameState === 'playing') overlay.style.display = 'none'; }, 1000);
}

function drawHUD() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
  if (gameState !== 'playing' && gameState !== 'paused') return;

  const ink = COL_css(COL.hudInk);

  // Day + distance (top-left)
  ctx.textAlign = 'left';
  ctx.fillStyle = ink; ctx.font = 'bold 15px monospace';
  ctx.fillText(`DAY ${day}`, 16, 26);
  ctx.font = '12px monospace';
  ctx.fillText(`${Math.floor(-player.position.z)} m`, 16, 44);

  // Score + hi (top-right)
  ctx.textAlign = 'right';
  ctx.fillStyle = ink; ctx.font = 'bold 16px monospace';
  ctx.fillText(`${score}`, uiCanvas.width - 16, 26);
  if (streak > 1) { ctx.fillStyle = COL_css(COL.hudGood); ctx.font = 'bold 13px monospace';
    ctx.fillText(`×${streak}`, uiCanvas.width - 16, 46); }
  if (hiScore > 0) { ctx.fillStyle = ink; ctx.font = '12px monospace';
    ctx.fillText(`HI ${hiScore}`, uiCanvas.width - 16, 62); }

  // Lives (hearts) + papers (top-left, second row)
  ctx.textAlign = 'left';
  for (let i = 0; i < MAX_LIVES; i++) {
    ctx.beginPath(); ctx.arc(20 + i * 22, 64, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < lives ? COL_css(COL.hudDanger) : 'rgba(20,50,74,0.18)'; ctx.fill();
  }
  ctx.fillStyle = ink; ctx.font = 'bold 14px monospace';
  ctx.fillText(`PAPERS ${paperCount}`, 16, 92);
  if (paperCount === 0) { ctx.fillStyle = COL_css(COL.hudDanger);
    ctx.fillText(`OUT OF PAPERS — grab a blue bundle`, 16, 110); }

  // Steer stick
  if (input.stick.active) {
    const s = input.stick, R = 64;
    ctx.beginPath(); ctx.arc(s.ox, s.oy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(20,50,74,0.3)'; ctx.lineWidth = 2; ctx.stroke();
    const cx = s.ox + Math.max(-R, Math.min(R, s.dx)), cy = s.oy + Math.max(-R, Math.min(R, s.dy));
    ctx.beginPath(); ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20,50,74,0.4)'; ctx.fill();
  }

  // Throw buttons
  drawThrowBtn(input.throwBtnL, '◀');
  drawThrowBtn(input.throwBtnR, '▶');
}
function drawThrowBtn(b, label) {
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(43,108,255,0.18)'; ctx.fill();
  ctx.strokeStyle = COL_css(COL.hudInk); ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = COL_css(COL.hudInk); ctx.font = `bold ${Math.floor(b.r)}px monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, b.x, b.y + 1); ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
}
function COL_css(hex) { return '#' + hex.toString(16).padStart(6, '0'); }

// ── State transitions ───────────────────────────────────────────────────────
function startGame() {
  overlay.style.display = 'none';
  score = 0; streak = 0; lives = MAX_LIVES; paperCount = START_PAPERS; day = 1; dayMark = 0;
  player.reset(); player.setBaseSpeed(9);
  papers.clear();
  for (const s of sparks) s.remove(); sparks = [];
  world.reset(0); world.setDifficulty(1);
  gameState = 'playing';
  announceDay();
}
function triggerGameOver() {
  gameState = 'gameover'; restartTimer = 3.4;
  if (score > hiScore) { hiScore = score; localStorage.setItem('paperRouteHi', hiScore); }
  player.hide(); addShake(0.9); audio.gameover(); showGameOver();
}

// ── Throwing ──────────────────────────────────────────────────────────────────
function doThrow(side) {
  if (gameState !== 'playing') return;
  if (paperCount <= 0) { audio.empty(); return; }
  paperCount--;
  papers.throw_(player.position.x, player.position.z, side, player.speed);
  audio.throw_();
}
input.onThrowLeft  = () => doThrow(-1);
input.onThrowRight = () => doThrow(1);
input.onStart = () => {
  if (gameState === 'title' || gameState === 'gameover') { if (gameState === 'title') startGame(); }
  else if (gameState === 'playing') doThrow(input.getSteer() < 0 ? -1 : 1);
};
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused'; showPause(); }
  else if (gameState === 'paused') { gameState = 'playing'; overlay.style.display = 'none'; }
};
addEventListener('touchend', () => { if (gameState === 'title') startGame(); });

// ── Camera follow (fixed isometric angle, tracks the bike) ─────────────────────
const _camLook = new THREE.Vector3();
function updateCamera(dt) {
  const p = player.position;
  // Look a little ahead of the bike so you can read the road coming up.
  _camLook.set(p.x * 0.4, 0.8, p.z - 6);
  let ox = 0, oy = 0, oz = 0;
  if (shakeTrauma > 0) {
    shakeTrauma = Math.max(0, shakeTrauma - dt * 2.6);
    const m = shakeTrauma * shakeTrauma, t = performance.now() / 1000;
    ox = Math.sin(t * 41) * m * 1.4; oy = Math.sin(t * 37) * m * 1.0; oz = Math.sin(t * 43) * m * 1.4;
  }
  camera.position.set(_camLook.x + ISO_OFF.x + ox, ISO_OFF.y + oy, p.z + ISO_OFF.z + oz);
  camera.lookAt(_camLook);
  // Keep the sun (and its shadow frustum) over the bike.
  sun.position.set(p.x - 14, 26, p.z + 10);
  sun.target.position.set(p.x, 0, p.z);
}

// ── Main loop ─────────────────────────────────────────────────────────────────
let prev = performance.now();
showTitle();
updateCamera(0);

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min((now - prev) / 1000, 0.05);
  prev = now;
  const t = now / 1000;

  if (gameState === 'title' || gameState === 'paused') {
    updateCamera(dt); renderer.render(scene, camera); drawHUD(); return;
  }

  if (gameState === 'gameover') {
    restartTimer -= dt;
    for (let i = sparks.length - 1; i >= 0; i--) if (!sparks[i].update(dt)) { sparks[i].remove(); sparks.splice(i, 1); }
    updateCamera(dt); renderer.render(scene, camera); drawHUD();
    if (restartTimer <= 0) startGame();
    return;
  }

  // ── Playing ──────────────────────────────────────────────────────────────
  const steer = input.getSteer();
  const throttle = input.getThrottle();
  player.update(dt, steer, throttle);

  // Follow road/ground/kerbs to the bike; scroll lane texture
  const pz = player.position.z;
  road.position.z = pz; ground.position.z = pz; kerbL.position.z = pz; kerbR.position.z = pz;
  swL.position.z = swR.position.z = pz; fenceL.position.z = fenceR.position.z = pz;
  roadTex.offset.y = pz * (90 / 700);   // scroll markings with travel

  world.update(dt, pz, t);
  papers.update(dt);

  // Resolve landed papers
  for (const p of papers.freshLandings()) {
    const r = world.resolvePaper(p);
    if (r.result === 'deliver') {
      streak++; const pts = r.points * Math.max(1, streak); score += pts;
      burst(r.house.zoneX, 1.2, r.house.z, COL.delivered, 14, 7); audio.deliver(); addShake(0.06);
    } else if (r.result === 'smash') {
      score += r.points; burst(p.x, 1.4, p.z, COL.smash, 12, 6); audio.smash();
    }
  }

  // Drain missed subscribers (break the delivery streak)
  if (world.missedEvents > 0) { streak = 0; world.missedEvents = 0; }

  // Pickup collision (paper bundles)
  const pk = world.pickupHit(player.position.x, pz, PLAYER_R + 0.3);
  if (pk) { paperCount = Math.min(MAX_PAPERS, paperCount + 5); score += 25;
    burst(pk.x, 0.8, pk.z, COL.bundle, 10, 5); audio.pickup(); }

  // Hazard collision → crash
  if (!player.invincible) {
    const hz = world.hazardHit(player.position.x, pz, PLAYER_R + 0.25);
    if (hz && player.crash()) {
      lives--; streak = 0; addShake(0.5); audio.crash();
      burst(player.position.x, 0.8, pz, COL.car, 18, 8);
      if (lives <= 0) { triggerGameOver(); }
    }
  }

  // Day milestone
  if (-pz - dayMark >= DAY_DIST) {
    dayMark += DAY_DIST; day++;
    score += 300 * day;
    player.setBaseSpeed(9 + (day - 1) * 1.1);
    world.setDifficulty(1 + (day - 1) * 0.5);
    audio.dayClear(); addShake(0.15); announceDay();
  }

  // Sparks
  for (let i = sparks.length - 1; i >= 0; i--) if (!sparks[i].update(dt)) { sparks[i].remove(); sparks.splice(i, 1); }

  updateCamera(dt);
  renderer.render(scene, camera);
  drawHUD();
}

// ── Resize ────────────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  const aspect = innerWidth / innerHeight;
  camera.left = -VIEW_SIZE * aspect / 2; camera.right = VIEW_SIZE * aspect / 2;
  camera.top = VIEW_SIZE / 2; camera.bottom = -VIEW_SIZE / 2;
  camera.updateProjectionMatrix();
  uiCanvas.width = innerWidth; uiCanvas.height = innerHeight;
}
addEventListener('resize', resize);
resize();
loop();
