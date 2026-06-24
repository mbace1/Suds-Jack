// Suds Jack — Vector Tube Shooter
// Tempest 2000 x Bomb Jack x Suds 51

(async function () {
  'use strict';

  // ─── Canvas Setup ────────────────────────────────────────────────────────────
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ─── Constants ───────────────────────────────────────────────────────────────
  const NUM_SPOKES = 8;
  const NUM_RINGS = 5;
  const OUTER_RADIUS_RATIO = 0.42;  // fraction of min(w,h)
  const VANISH_Y_RATIO = 0.18;      // vanishing point top fraction
  const BULLET_SPEED = 0.045;
  const PLAYER_SHOOT_COOLDOWN = 180; // ms
  const PARTICLE_COUNT = 18;
  const SUPERZAPPER_COOLDOWN = 15000; // ms

  // ─── Level Data ──────────────────────────────────────────────────────────────
  let levels = [];
  try {
    const resp = await fetch('levels.json');
    levels = await resp.json();
  } catch (e) {
    levels = [
      { level: 1, wave_count: 3, enemy_types: ['basic'], speed_multiplier: 1.0, bomb_count: 3 },
      { level: 2, wave_count: 4, enemy_types: ['basic', 'flipper'], speed_multiplier: 1.3, bomb_count: 4 },
      { level: 3, wave_count: 5, enemy_types: ['basic', 'flipper', 'tanker'], speed_multiplier: 1.6, bomb_count: 5 }
    ];
  }

  // ─── Game State ──────────────────────────────────────────────────────────────
  let state = 'title'; // title | playing | dead | gameover
  let score = 0;
  let lives = 3;
  let levelIndex = 0;
  let hue = 0;
  let frameTime = 0;
  let lastTime = 0;
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let playerSpoke = 0;
  let playerMoveCD = 0;
  let shootCD = 0;
  let superzapperCD = 0;
  let superzapperActive = false;
  let superzapperTimer = 0;
  let waveTimer = 0;
  let wavesSpawned = 0;
  let levelComplete = false;
  let levelCompleteTimer = 0;
  let deathTimer = 0;

  let enemies = [];
  let bullets = [];
  let bombs = [];
  let particles = [];
  let superzapperParticles = [];

  // ─── Input ───────────────────────────────────────────────────────────────────
  const keys = {};
  window.addEventListener('keydown', e => {
    if (!keys[e.code]) {
      keys[e.code] = true;
      onKeyDown(e.code);
    }
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  function onKeyDown(code) {
    if (state === 'title' && code === 'Enter') startGame();
    if (state === 'gameover' && code === 'Enter') startGame();
    if (state === 'playing') {
      if (code === 'Space') tryShoot();
      if (code === 'KeyZ') trySuperzapper();
    }
  }

  // ─── Geometry Helpers ────────────────────────────────────────────────────────
  function cx() { return canvas.width / 2; }
  function cy() { return canvas.height; }  // vanishing point at bottom center — actually let's do top-center feel

  // Vanishing point at center-top area
  function vanishX() { return canvas.width / 2; }
  function vanishY() { return canvas.height * VANISH_Y_RATIO; }

  // Outer ring center
  function outerCX() { return canvas.width / 2; }
  function outerCY() { return canvas.height * 0.82; }
  function outerR() { return Math.min(canvas.width, canvas.height) * OUTER_RADIUS_RATIO; }

  // Get the XY position of a spoke at a given depth
  // depth 0 = vanishing point, depth 1 = outer ring
  function spokePoint(spokeIdx, depth) {
    const angle = (spokeIdx / NUM_SPOKES) * Math.PI * 2 - Math.PI / 2;
    const vx = vanishX();
    const vy = vanishY();
    const ox = outerCX() + Math.cos(angle) * outerR();
    const oy = outerCY() + Math.sin(angle) * outerR();
    return {
      x: vx + (ox - vx) * depth,
      y: vy + (oy - vy) * depth
    };
  }

  // Get XY on a ring at a given depth
  function ringPoint(spokeIdx, depth) {
    return spokePoint(spokeIdx, depth);
  }

  // Ring radius at depth (for drawing rings)
  function ringRadius(depth) {
    return outerR() * depth;
  }

  // Ring center at depth (perspective: rings converge toward vanish point)
  function ringCenter(depth) {
    const vx = vanishX();
    const vy = vanishY();
    const ocx = outerCX();
    const ocy = outerCY();
    return {
      x: vx + (ocx - vx) * depth,
      y: vy + (ocy - vy) * depth
    };
  }

  // ─── Drawing: Web/Tube ───────────────────────────────────────────────────────
  function drawWeb() {
    // Draw spokes
    for (let s = 0; s < NUM_SPOKES; s++) {
      const outer = spokePoint(s, 1);
      const inner = spokePoint(s, 0);
      const spokehue = (hue + s * (360 / NUM_SPOKES)) % 360;
      const color = `hsl(${spokehue}, 100%, 55%)`;
      ctx.beginPath();
      ctx.moveTo(outer.x, outer.y);
      ctx.lineTo(inner.x, inner.y);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw concentric rings (perspective correct)
    for (let r = 1; r <= NUM_RINGS; r++) {
      const depth = r / NUM_RINGS;
      const ringHue = (hue + r * 40) % 360;
      const color = `hsl(${ringHue}, 100%, 55%)`;
      ctx.beginPath();
      for (let s = 0; s <= NUM_SPOKES; s++) {
        const pt = spokePoint(s % NUM_SPOKES, depth);
        if (s === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  // ─── Drawing: Player ─────────────────────────────────────────────────────────
  function drawPlayer() {
    if (state === 'dead' || state === 'gameover') return;
    const pt = spokePoint(playerSpoke, 1);
    const nextPt = spokePoint((playerSpoke + 1) % NUM_SPOKES, 1);
    const prevPt = spokePoint((playerSpoke - 1 + NUM_SPOKES) % NUM_SPOKES, 1);

    // Draw a "claw" shape at the outer ring between adjacent nodes
    const midX = (prevPt.x + nextPt.x) / 2;
    const midY = (prevPt.y + nextPt.y) / 2;

    const playerHue = (hue * 2) % 360;
    const col = `hsl(${playerHue}, 100%, 70%)`;
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 2.5;

    // Claw: V-shape pointing inward from outer ring node
    const innerPt = spokePoint(playerSpoke, 0.85);
    ctx.beginPath();
    ctx.moveTo(prevPt.x, prevPt.y);
    ctx.lineTo(innerPt.x, innerPt.y);
    ctx.lineTo(nextPt.x, nextPt.y);
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.shadowBlur = 25;
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  // ─── Drawing: Enemies ────────────────────────────────────────────────────────
  function drawEnemies() {
    for (const e of enemies) {
      const pt = spokePoint(e.spoke, e.depth);
      let color;
      if (e.type === 'basic') color = '#ffffff';
      else if (e.type === 'flipper') color = `hsl(${(hue + 180) % 360}, 100%, 70%)`;
      else if (e.type === 'tanker') color = `hsl(${(hue + 30) % 360}, 100%, 65%)`;

      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2;

      if (e.type === 'basic') {
        // Simple cross/diamond
        const sz = 8 * e.depth + 3;
        ctx.beginPath();
        ctx.moveTo(pt.x - sz, pt.y);
        ctx.lineTo(pt.x + sz, pt.y);
        ctx.moveTo(pt.x, pt.y - sz);
        ctx.lineTo(pt.x, pt.y + sz);
        ctx.stroke();
      } else if (e.type === 'flipper') {
        // Hourglass between current and next spoke
        const nextPt = spokePoint((e.spoke + 1) % NUM_SPOKES, e.depth);
        const sz = 6 * e.depth + 2;
        ctx.beginPath();
        ctx.moveTo(pt.x - sz, pt.y - sz);
        ctx.lineTo(pt.x + sz, pt.y + sz);
        ctx.moveTo(pt.x + sz, pt.y - sz);
        ctx.lineTo(pt.x - sz, pt.y + sz);
        // line to neighbor
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(nextPt.x, nextPt.y);
        ctx.stroke();
      } else if (e.type === 'tanker') {
        // Large rectangle
        const sz = 10 * e.depth + 4;
        ctx.beginPath();
        ctx.rect(pt.x - sz, pt.y - sz * 0.6, sz * 2, sz * 1.2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
    }
  }

  // ─── Drawing: Bullets ────────────────────────────────────────────────────────
  function drawBullets() {
    for (const b of bullets) {
      const pt = spokePoint(b.spoke, b.depth);
      const tailPt = spokePoint(b.spoke, Math.min(1, b.depth + 0.08));
      const col = `hsl(${(hue + 60) % 360}, 100%, 80%)`;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 20;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(tailPt.x, tailPt.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // ─── Drawing: Bombs ──────────────────────────────────────────────────────────
  function drawBombs() {
    for (const b of bombs) {
      const pt = spokePoint(b.spoke, b.depth);
      const bombHue = (hue + b.hueOffset) % 360;
      const col = `hsl(${bombHue}, 100%, 65%)`;
      const r = 10 + Math.sin(b.phase) * 3;

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 25;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner star
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rx = pt.x + Math.cos(a) * r * 0.5;
        const ry = pt.y + Math.sin(a) * r * 0.5;
        if (i === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fillStyle = `hsla(${bombHue}, 100%, 75%, 0.6)`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ─── Drawing: Particles ──────────────────────────────────────────────────────
  function drawParticles() {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha})`;
      ctx.shadowColor = `hsl(${p.hue}, 100%, 65%)`;
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  // ─── Drawing: Superzapper Effect ─────────────────────────────────────────────
  function drawSuperzapper() {
    if (!superzapperActive) return;
    const progress = 1 - superzapperTimer / 800;
    const maxR = Math.max(canvas.width, canvas.height) * 1.5;
    for (let i = 0; i < 6; i++) {
      const r = maxR * progress * ((i + 1) / 6);
      const h = (hue + i * 60) % 360;
      ctx.beginPath();
      ctx.arc(vanishX(), vanishY(), r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${h}, 100%, 70%, ${0.7 - progress * 0.6})`;
      ctx.shadowColor = `hsl(${h}, 100%, 70%)`;
      ctx.shadowBlur = 30;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ─── Drawing: HUD ────────────────────────────────────────────────────────────
  function updateHUD() {
    document.getElementById('scoreDisplay').textContent = score;
    document.getElementById('levelDisplay').textContent = levelIndex + 1;
    const hearts = lives > 0 ? '♥ '.repeat(lives).trim() : '';
    document.getElementById('livesDisplay').textContent = hearts;
  }

  // ─── Game Actions ────────────────────────────────────────────────────────────
  function tryShoot() {
    if (shootCD > 0) return;
    bullets.push({ spoke: playerSpoke, depth: 0.97 });
    shootCD = PLAYER_SHOOT_COOLDOWN;
  }

  function trySuperzapper() {
    if (superzapperCD > 0 || superzapperActive) return;
    superzapperActive = true;
    superzapperTimer = 800;
    superzapperCD = SUPERZAPPER_COOLDOWN;
    // Kill all enemies
    for (const e of enemies) {
      spawnParticles(spokePoint(e.spoke, e.depth), e.type === 'tanker' ? 25 : 15);
      score += scoreForEnemy(e.type);
    }
    enemies = [];
  }

  function scoreForEnemy(type) {
    if (type === 'basic') return 100;
    if (type === 'flipper') return 250;
    if (type === 'tanker') return 500;
    return 100;
  }

  function spawnParticles(pt, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      particles.push({
        x: pt.x, y: pt.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 3 + Math.random() * 4,
        hue: (hue + Math.random() * 180) % 360,
        life: 40 + Math.random() * 30,
        maxLife: 70
      });
    }
  }

  function spawnBombs(levelData) {
    bombs = [];
    for (let i = 0; i < levelData.bomb_count; i++) {
      bombs.push({
        spoke: Math.floor(Math.random() * NUM_SPOKES),
        depth: 0.3 + Math.random() * 0.55,
        hueOffset: Math.random() * 360,
        phase: Math.random() * Math.PI * 2,
        driftDir: Math.random() < 0.5 ? 1 : -1,
        driftSpeed: 0.0003 + Math.random() * 0.0004
      });
    }
  }

  function spawnWave(levelData) {
    const types = levelData.enemy_types;
    const count = 2 + Math.floor(wavesSpawned * 0.5);
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      enemies.push({
        type,
        spoke: Math.floor(Math.random() * NUM_SPOKES),
        depth: 0.05 + Math.random() * 0.1,
        speed: (0.0008 + Math.random() * 0.0004) * levelData.speed_multiplier,
        flipTimer: type === 'flipper' ? 1500 + Math.random() * 1000 : Infinity,
        splitDone: false
      });
    }
    wavesSpawned++;
  }

  function startGame() {
    score = 0;
    lives = 3;
    levelIndex = 0;
    playerSpoke = 0;
    enemies = [];
    bullets = [];
    bombs = [];
    particles = [];
    wavesSpawned = 0;
    waveTimer = 0;
    levelComplete = false;
    superzapperCD = 0;
    superzapperActive = false;
    shootCD = 0;
    playerMoveCD = 0;
    state = 'playing';
    document.getElementById('overlay').classList.add('hidden');
    spawnBombs(currentLevel());
  }

  function currentLevel() {
    return levels[Math.min(levelIndex, levels.length - 1)];
  }

  function advanceLevel() {
    levelIndex++;
    if (levelIndex >= levels.length) levelIndex = levels.length - 1;
    enemies = [];
    bullets = [];
    wavesSpawned = 0;
    waveTimer = 0;
    levelComplete = false;
    spawnBombs(currentLevel());
  }

  function playerDie() {
    lives--;
    shakeFrames = 40;
    shakeIntensity = 12;
    spawnParticles(spokePoint(playerSpoke, 1), 30);

    if (lives <= 0) {
      state = 'gameover';
      showOverlay('GAME OVER', `SCORE: ${score}`, 'PRESS ENTER TO RESTART');
    } else {
      state = 'dead';
      deathTimer = 1800;
    }
  }

  function showOverlay(title, sub, instr) {
    const overlay = document.getElementById('overlay');
    overlay.classList.remove('hidden');
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlaySubtitle').textContent = sub;
    document.getElementById('overlayInstructions').textContent = instr || '';
  }

  // ─── Update ──────────────────────────────────────────────────────────────────
  function update(dt) {
    hue = (hue + 0.5) % 360;

    if (state === 'dead') {
      deathTimer -= dt;
      if (deathTimer <= 0) {
        state = 'playing';
        playerSpoke = 0;
        enemies = [];
        bullets = [];
      }
      updateParticles(dt);
      return;
    }

    if (state !== 'playing') return;

    // Cooldowns
    if (shootCD > 0) shootCD -= dt;
    if (playerMoveCD > 0) playerMoveCD -= dt;
    if (superzapperCD > 0) superzapperCD -= dt;
    if (superzapperActive) {
      superzapperTimer -= dt;
      if (superzapperTimer <= 0) superzapperActive = false;
    }

    // Player movement
    if (playerMoveCD <= 0) {
      if (keys['ArrowLeft'] || keys['KeyA']) {
        playerSpoke = (playerSpoke - 1 + NUM_SPOKES) % NUM_SPOKES;
        playerMoveCD = 120;
      } else if (keys['ArrowRight'] || keys['KeyD']) {
        playerSpoke = (playerSpoke + 1) % NUM_SPOKES;
        playerMoveCD = 120;
      }
    }

    // Auto-shoot when holding space
    if (keys['Space']) tryShoot();

    // Wave spawning
    const lv = currentLevel();
    waveTimer += dt;
    const waveInterval = 3500 / lv.speed_multiplier;
    if (waveTimer >= waveInterval && wavesSpawned < lv.wave_count * 3) {
      waveTimer = 0;
      spawnWave(lv);
    }

    // Level complete check
    if (wavesSpawned >= lv.wave_count * 3 && enemies.length === 0 && !levelComplete) {
      levelComplete = true;
      levelCompleteTimer = 2500;
    }
    if (levelComplete) {
      levelCompleteTimer -= dt;
      if (levelCompleteTimer <= 0) advanceLevel();
    }

    // Update enemies
    const toRemove = [];
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      e.depth += e.speed * dt;

      // Flipper logic: periodically switch to adjacent spoke
      if (e.type === 'flipper') {
        e.flipTimer -= dt;
        if (e.flipTimer <= 0) {
          e.spoke = (e.spoke + (Math.random() < 0.5 ? 1 : -1) + NUM_SPOKES) % NUM_SPOKES;
          e.flipTimer = 800 + Math.random() * 800;
        }
      }

      // Tanker splits at midpoint
      if (e.type === 'tanker' && !e.splitDone && e.depth > 0.5) {
        e.splitDone = true;
        enemies.push({
          type: 'basic',
          spoke: (e.spoke + 1) % NUM_SPOKES,
          depth: e.depth,
          speed: e.speed * 1.2,
          flipTimer: Infinity,
          splitDone: true
        });
        enemies.push({
          type: 'basic',
          spoke: (e.spoke - 1 + NUM_SPOKES) % NUM_SPOKES,
          depth: e.depth,
          speed: e.speed * 1.2,
          flipTimer: Infinity,
          splitDone: true
        });
        toRemove.push(i);
        spawnParticles(spokePoint(e.spoke, e.depth), 10);
        continue;
      }

      // Enemy reaches player
      if (e.depth >= 0.95) {
        if (e.spoke === playerSpoke) {
          toRemove.push(i);
          playerDie();
          return; // stop update this frame
        } else if (e.depth >= 1.05) {
          toRemove.push(i);
        }
      }
    }
    // Remove in reverse order
    for (let i = toRemove.length - 1; i >= 0; i--) {
      enemies.splice(toRemove[i], 1);
    }

    // Update bullets
    const bulletsToRemove = [];
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      b.depth -= BULLET_SPEED * (dt / 16);

      if (b.depth <= 0.02) {
        bulletsToRemove.push(i);
        continue;
      }

      // Collision with enemies
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (e.spoke === b.spoke && Math.abs(e.depth - b.depth) < 0.08) {
          spawnParticles(spokePoint(e.spoke, e.depth), PARTICLE_COUNT);
          score += scoreForEnemy(e.type);
          enemies.splice(j, 1);
          hit = true;
          break;
        }
      }
      if (hit) bulletsToRemove.push(i);
    }
    for (let i = bulletsToRemove.length - 1; i >= 0; i--) {
      bullets.splice(bulletsToRemove[i], 1);
    }

    // Update bombs
    for (let i = bombs.length - 1; i >= 0; i--) {
      const b = bombs[i];
      b.phase += 0.03;
      b.depth += b.driftDir * b.driftSpeed * dt;
      if (b.depth > 0.88) b.driftDir = -1;
      if (b.depth < 0.2) b.driftDir = 1;

      // Collect if player on same spoke and close enough
      const pt = spokePoint(b.spoke, b.depth);
      const playerPt = spokePoint(playerSpoke, 1.0);
      const dx = pt.x - playerPt.x;
      const dy = pt.y - playerPt.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 40 && b.spoke === playerSpoke) {
        score += 500;
        spawnParticles(pt, 20);
        bombs.splice(i, 1);
      }
    }

    updateParticles(dt);

    // Screen shake decay
    if (shakeFrames > 0) {
      shakeFrames--;
      shakeIntensity *= 0.92;
    }

    updateHUD();
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  function render() {
    ctx.save();

    // Screen shake
    if (shakeFrames > 0) {
      const sx = (Math.random() - 0.5) * shakeIntensity;
      const sy = (Math.random() - 0.5) * shakeIntensity;
      ctx.translate(sx, sy);
    }

    // Clear
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);

    drawWeb();
    drawBombs();
    drawEnemies();
    drawBullets();
    drawPlayer();
    drawParticles();
    drawSuperzapper();

    // Level complete flash
    if (levelComplete) {
      ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.15)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = 'bold 48px Courier New';
      ctx.textAlign = 'center';
      ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
      ctx.shadowColor = `hsl(${hue}, 100%, 70%)`;
      ctx.shadowBlur = 30;
      ctx.fillText('LEVEL CLEAR!', canvas.width / 2, canvas.height / 2);
      ctx.shadowBlur = 0;
    }

    // Superzapper charge indicator
    if (state === 'playing') {
      const zapReady = superzapperCD <= 0 && !superzapperActive;
      ctx.font = '14px Courier New';
      ctx.textAlign = 'left';
      ctx.fillStyle = zapReady ? '#0ff' : '#444';
      ctx.shadowColor = '#0ff';
      ctx.shadowBlur = zapReady ? 10 : 0;
      ctx.fillText('Z: SUPERZAPPER' + (zapReady ? ' [READY]' : ` [${Math.ceil(superzapperCD / 1000)}s]`), 20, canvas.height - 20);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // ─── Main Loop ───────────────────────────────────────────────────────────────
  function loop(timestamp) {
    const dt = Math.min(timestamp - lastTime, 50); // cap at 50ms
    lastTime = timestamp;
    frameTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(loop);
  }

  // Init
  updateHUD();
  requestAnimationFrame(ts => {
    lastTime = ts;
    requestAnimationFrame(loop);
  });

})();
