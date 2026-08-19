// Suds Jack — Horizon Mesh v3
// Bomb Jack × Tempest × Tiny Wings × Suda51
// Left side = move · Right side = JUMP

(() => {
  "use strict";

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const elScore = document.getElementById("score");
  const elBest = document.getElementById("best");
  const elLives = document.getElementById("lives");
  const overlay = document.getElementById("overlay");
  const playBtn = document.getElementById("play");
  const glitch = document.getElementById("glitch");

  // ── constants ──────────────────────────────────────────────
  const LANES = 9;
  const GRAVITY = 27;
  const JUMP_V = -12.2;
  const BOOST_V = -18.5;
  const FLOAT_DRAG = 0.26;
  const MOVE_SPEED = 7.2;
  const PLAYER_DEPTH = 0.91;
  const HIT_DEPTH = 0.85;
  const HI_KEY = "sudsJack.horizon.v3.best";

  // ── state ──────────────────────────────────────────────────
  let W = 0, H = 0, dpr = 1;
  let mode = "title"; // title | play | over
  let score = 0, best = Number(localStorage.getItem(HI_KEY) || 0) || 0;
  let lives = 3, mult = 1, combo = 0, comboTimer = 0;
  let t = 0, last = 0, hue = 168, seed = 17;
  let distance = 0, wave = 0, intensity = 1;
  let shake = 0, glitchUntil = 0, flash = 0;

  const keys = new Set();
  const touch = { left: false, right: false, jump: false };
  const activeTouches = new Map();

  const player = {
    lane: (LANES - 1) / 2,
    z: 0, vz: 0,
    onGround: true, floating: false,
    boostUntil: 0, invuln: 0, facing: 1
  };

  let slices = [];
  let nextSliceId = 0;
  let genPhase = 0;
  let things = [];
  let particles = [];
  let spawnTimer = 0.55;
  let audioCtx = null;

  // ── audio (tiny WebAudio) ──────────────────────────────────
  function ensureAudio() {
    if (audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  function blip(freq, dur, type, vol, slide) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    if (slide) o.frequency.linearRampToValueAtTime(slide, audioCtx.currentTime + dur);
    g.gain.value = vol || 0.08;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }
  function sfxJump(peak) { blip(peak ? 380 : 220, 0.12, "triangle", 0.09, peak ? 520 : 140); }
  function sfxCollect() { blip(660, 0.08, "sine", 0.07, 990); }
  function sfxBoost() { blip(180, 0.18, "sawtooth", 0.06, 420); }
  function sfxHit() { blip(90, 0.2, "sawtooth", 0.1, 40); }
  function sfxStomp() { blip(140, 0.1, "square", 0.08, 60); }

  // ── rng ────────────────────────────────────────────────────
  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function randRange(a, b) { return a + rand() * (b - a); }

  // ── layout ─────────────────────────────────────────────────
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function vanish() { return { x: W * 0.5, y: H * 0.12 }; }

  function project(lane, depth, elev) {
    const v = vanish();
    const nearY = H * 0.92;
    const d = Math.pow(Math.max(0, depth), 0.9);
    const y = v.y + (nearY - v.y) * d;
    const scale = 0.05 + d * 0.95;
    const laneW = W * 0.8 * scale;
    const x = v.x + (lane - (LANES - 1) / 2) * (laneW / (LANES - 1));
    return { x, y: y - elev * 52 * scale, s: scale };
  }

  // richer heightfield
  function meshHeight(lane, depth) {
    const ph = genPhase + depth * 6.2;
    const a = 0.1 + 0.2 * Math.sin(ph + lane * 0.9) * Math.sin(ph * 0.5);
    const b = 0.16 * Math.sin(ph * 1.8 + lane * 1.5);
    const c = 0.09 * Math.sin(ph * 0.3 + lane * 0.4 + distance * 0.02);
    return Math.max(0, a + b + c);
  }
  function meshPeak(lane, depth) {
    return meshHeight(lane, depth) > 0.36;
  }

  function ensureSlices() {
    while (slices.length < 36) {
      const maxD = slices.length ? Math.max(...slices.map(s => s.depth)) : -0.05;
      const d = maxD + 0.038;
      const heights = [], peak = [];
      for (let i = 0; i < LANES; i++) {
        const h = meshHeight(i, d);
        heights.push(h);
        peak.push(h > 0.36);
      }
      slices.push({ depth: d, heights, peak, id: nextSliceId++ });
    }
  }

  function advanceLandscape(dt) {
    const base = mode === "play" ? 0.21 + Math.min(0.28, distance * 0.0014) : 0.42;
    const speed = base * intensity * dt;
    for (const s of slices) s.depth += speed;
    slices = slices.filter(s => s.depth < 1.2);
    genPhase += dt * (0.65 + intensity * 0.15);
    ensureSlices();
    if (mode === "play") {
      distance += speed * 14;
      intensity = 1 + Math.min(1.8, distance * 0.004);
    }
  }

  function spawnAtHorizon() {
    const r = rand();
    let kind = "orb";
    if (r > 0.55) kind = "crawler";
    else if (r > 0.78) kind = "dart";
    else if (r > 0.9) kind = "boost";
    else if (r > 0.96 && intensity > 1.3) kind = "spike";
    things.push({
      lane: Math.floor(rand() * LANES),
      depth: 0.008 + rand() * 0.05,
      kind,
      alive: true,
      phase: rand() * 12,
      hp: kind === "spike" ? 2 : 1
    });
  }

  function burst(lane, depth, elev, count, hOff) {
    const p = project(lane, depth, elev);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const sp = 50 + rand() * 110;
      particles.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.3 + rand() * 0.45,
        hue: (hue + hOff + rand() * 50) % 360,
        size: 2 + rand() * 3
      });
    }
  }

  function addCombo(pts) {
    combo++;
    comboTimer = 2.2;
    mult = Math.min(8, 1 + Math.floor(combo / 3));
    score += pts * mult;
    updateHud();
  }

  function tryJump() {
    if (mode !== "play" || !player.onGround) return;
    ensureAudio();
    const peak = meshPeak(player.lane, PLAYER_DEPTH);
    player.vz = peak ? BOOST_V : JUMP_V;
    player.onGround = false;
    player.floating = !!peak;
    sfxJump(peak);
    if (peak) {
      player.boostUntil = t + 0.6;
      addCombo(50);
      burst(player.lane, PLAYER_DEPTH, meshHeight(player.lane, PLAYER_DEPTH), 16, 30);
      flash = 0.25;
      if (glitch) {
        glitch.className = "flash";
        setTimeout(() => glitch.className = "", 280);
      }
    }
  }

  function updateHud() {
    elScore.textContent = String(score | 0);
    elBest.textContent = String(best | 0);
    elLives.textContent = lives > 0 ? "● ".repeat(lives).trim() : "—";
  }

  function startGame() {
    ensureAudio();
    mode = "play";
    score = 0; lives = 3; mult = 1; combo = 0; comboTimer = 0;
    player.lane = (LANES - 1) / 2;
    player.z = 0; player.vz = 0;
    player.onGround = true; player.floating = false; player.invuln = 0;
    things = []; particles = [];
    distance = 0; wave = 0; intensity = 1;
    spawnTimer = 0.6;
    overlay.classList.remove("show");
    updateHud();
  }

  function hurt() {
    if (player.invuln > 0) return;
    lives--;
    player.invuln = 1.5;
    shake = 14;
    combo = 0; mult = 1; comboTimer = 0;
    sfxHit();
    if (glitch) {
      glitch.className = "hard";
      setTimeout(() => glitch.className = "", 480);
    }
    if (lives <= 0) {
      mode = "over";
      if (score > best) {
        best = score;
        localStorage.setItem(HI_KEY, String(best));
      }
      overlay.classList.add("show");
      updateHud();
    }
  }

  // ── Bomb Jack touch ────────────────────────────────────────
  function zoneAt(x, y) {
    if (y < H * 0.5) return null;
    if (x < W * 0.48) return x < W * 0.24 ? "left" : "right";
    if (x > W * 0.52) return "jump";
    return null;
  }
  function syncTouch() {
    touch.left = touch.right = touch.jump = false;
    for (const z of activeTouches.values()) {
      if (z === "left") touch.left = true;
      else if (z === "right") touch.right = true;
      else if (z === "jump") touch.jump = true;
    }
  }

  window.addEventListener("keydown", e => {
    if (["ArrowLeft","ArrowRight","ArrowUp","Space"].includes(e.code)) e.preventDefault();
    if (keys.has(e.code)) return;
    keys.add(e.code);
    if (e.code === "Enter" && (mode === "title" || mode === "over")) startGame();
    if (mode === "play" && (e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp")) tryJump();
  });
  window.addEventListener("keyup", e => keys.delete(e.code));
  window.addEventListener("blur", () => { keys.clear(); activeTouches.clear(); syncTouch(); });

  playBtn.addEventListener("click", startGame);
  overlay.addEventListener("click", e => {
    if (e.target === overlay || e.target === playBtn || e.target.closest("#play")) startGame();
  });

  function onTS(e) {
    e.preventDefault();
    if (mode !== "play") { startGame(); return; }
    for (const te of e.changedTouches) {
      const z = zoneAt(te.clientX, te.clientY);
      if (z) {
        activeTouches.set(te.identifier, z);
        if (z === "jump") tryJump();
      }
    }
    syncTouch();
  }
  function onTM(e) {
    e.preventDefault();
    if (mode !== "play") return;
    for (const te of e.changedTouches) {
      const z = zoneAt(te.clientX, te.clientY);
      if (z) activeTouches.set(te.identifier, z);
      else activeTouches.delete(te.identifier);
    }
    syncTouch();
  }
  function onTE(e) {
    e.preventDefault();
    for (const te of e.changedTouches) activeTouches.delete(te.identifier);
    syncTouch();
  }
  canvas.addEventListener("touchstart", onTS, { passive: false });
  canvas.addEventListener("touchmove", onTM, { passive: false });
  canvas.addEventListener("touchend", onTE, { passive: false });
  canvas.addEventListener("touchcancel", onTE, { passive: false });

  // ── update ─────────────────────────────────────────────────
  function update(dt) {
    t += dt;
    hue = (hue + dt * (14 + intensity * 4)) % 360;
    if (shake > 0) shake *= 0.86;
    if (flash > 0) flash -= dt;
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) { combo = 0; mult = 1; }
    }

    advanceLandscape(dt);

    if (mode === "title") {
      if (rand() < dt * 0.65) spawnAtHorizon();
      things = things.filter(th => th.alive && th.depth < 1.15);
      // light particles in attract
      if (rand() < dt * 2) {
        const lane = Math.floor(rand() * LANES);
        burst(lane, 0.3 + rand() * 0.5, 0.1, 2, 80);
      }
      return;
    }
    if (mode !== "play") return;

    // lateral
    let input = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft") || touch.left) input -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight") || touch.right) input += 1;
    if (input) player.facing = input;
    const air = player.onGround ? 1 : 0.58;
    player.lane += input * MOVE_SPEED * air * dt;
    player.lane = Math.max(0, Math.min(LANES - 1, player.lane));

    // vertical
    if (player.floating && player.vz > 0 && t < player.boostUntil + 0.7) {
      player.vz += GRAVITY * FLOAT_DRAG * dt;
    } else {
      player.vz += GRAVITY * dt;
      if (player.vz > 0) player.floating = false;
    }
    player.z += player.vz * dt;
    if (player.vz >= 0 && player.z <= 0) {
      player.z = 0; player.vz = 0;
      player.onGround = true; player.floating = false;
    } else player.onGround = false;

    if (player.invuln > 0) player.invuln -= dt;

    // spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnAtHorizon();
      if (rand() < 0.35 + intensity * 0.1) spawnAtHorizon();
      if (rand() < intensity * 0.08) spawnAtHorizon();
      spawnTimer = Math.max(0.18, 0.72 - distance * 0.0015 - intensity * 0.04);
      wave++;
    }

    // entities
    for (const th of things) {
      if (!th.alive) continue;
      th.phase += dt * (5 + intensity);
      // slow lateral drift on some
      if (th.kind === "crawler" || th.kind === "spike") {
        th.lane += Math.sin(th.phase * 0.4) * 0.4 * dt;
        th.lane = Math.max(0, Math.min(LANES - 1, th.lane));
      }
      if (th.depth > 1.14) { th.alive = false; continue; }

      if (th.depth > HIT_DEPTH && th.depth < 1.02) {
        const dist = Math.abs(th.lane - player.lane);
        if (dist < 0.5) {
          if (th.kind === "orb" || th.kind === "boost") {
            if (th.kind === "boost" && player.z < 0.5 && !player.floating) continue;
            th.alive = false;
            if (th.kind === "boost") {
              sfxBoost();
              player.vz = BOOST_V * 0.7;
              player.floating = true;
              player.boostUntil = t + 0.4;
              addCombo(200);
              burst(th.lane, th.depth, meshHeight(th.lane, th.depth) + 0.1, 18, 40);
            } else {
              sfxCollect();
              addCombo(100);
              burst(th.lane, th.depth, meshHeight(th.lane, th.depth) + 0.08, 10, 140);
            }
          } else {
            const stomp = player.vz > 2 && player.z > 0.4;
            if (stomp && th.kind !== "dart") {
              th.hp--;
              if (th.hp <= 0) {
                th.alive = false;
                player.vz = JUMP_V * 0.55;
                sfxStomp();
                addCombo(th.kind === "spike" ? 350 : 250);
                burst(th.lane, th.depth, meshHeight(th.lane, th.depth), 18, 0);
              }
            } else if (player.invuln <= 0 && player.z < 1.7) {
              th.alive = false;
              hurt();
            }
          }
        }
      }
    }
    things = things.filter(th => th.alive);

    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 140 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ── render ─────────────────────────────────────────────────
  function render() {
    ctx.save();
    if (shake > 0.5) {
      ctx.translate((rand() - 0.5) * shake, (rand() - 0.5) * shake);
    }

    // bg
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, W, H);

    // horizon glow + flash
    const v = vanish();
    const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, H * 0.6);
    g.addColorStop(0, `hsla(${hue}, 95%, 48%, ${0.2 + flash * 0.4})`);
    g.addColorStop(0.45, `hsla(${(hue + 50) % 360}, 70%, 28%, 0.07)`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const sorted = slices.slice().sort((a, b) => a.depth - b.depth);

    // lane rails
    for (let lane = 0; lane < LANES; lane++) {
      ctx.beginPath();
      let started = false;
      for (const s of sorted) {
        if (s.depth < 0.01 || s.depth > 1.06) continue;
        const p = project(lane, s.depth, s.heights[lane] || 0);
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      if (started) {
        ctx.strokeStyle = `hsla(${(hue + lane * 10) % 360}, 100%, 56%, 0.5)`;
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
    }

    // ribs + peaks
    for (const s of sorted) {
      if (s.depth < 0.03 || s.depth > 1.03) continue;
      ctx.beginPath();
      for (let lane = 0; lane < LANES; lane++) {
        const p = project(lane, s.depth, s.heights[lane] || 0);
        if (lane === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const fade = Math.min(1, s.depth * 1.6);
      ctx.strokeStyle = `hsla(${(hue + s.depth * 65) % 360}, 100%, 50%, ${0.15 + fade * 0.48})`;
      ctx.lineWidth = 1 + s.depth * 1.15;
      ctx.stroke();

      for (let lane = 0; lane < LANES; lane++) {
        if (!s.peak[lane]) continue;
        const p = project(lane, s.depth, s.heights[lane]);
        const sz = 3.2 + s.depth * 10;
        ctx.strokeStyle = `hsla(${(hue + 48) % 360}, 100%, 75%, ${0.3 + fade * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x - sz, p.y);
        ctx.lineTo(p.x, p.y - sz * 1.3);
        ctx.lineTo(p.x + sz, p.y);
        ctx.stroke();
      }
    }

    // entities
    for (const th of things) {
      if (!th.alive) continue;
      const elev = meshHeight(th.lane, th.depth) + 0.07;
      const p = project(th.lane, th.depth, elev);
      const s = p.s;
      const pulse = 0.85 + 0.15 * Math.sin(th.phase);

      if (th.kind === "orb") {
        ctx.strokeStyle = `hsl(${(hue + 125) % 360}, 100%, 70%)`;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12 * s;
        ctx.lineWidth = 2.1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.8 * s * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (th.kind === "boost") {
        ctx.strokeStyle = `hsl(${(hue + 40) % 360}, 100%, 70%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 9 * s);
        ctx.lineTo(p.x + 7 * s, p.y + 6 * s);
        ctx.lineTo(p.x - 7 * s, p.y + 6 * s);
        ctx.closePath();
        ctx.stroke();
      } else if (th.kind === "crawler") {
        ctx.strokeStyle = `hsl(${(hue + 5) % 360}, 100%, 58%)`;
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(p.x - 7 * s, p.y);
        ctx.lineTo(p.x + 7 * s, p.y);
        ctx.moveTo(p.x, p.y - 6 * s);
        ctx.lineTo(p.x, p.y + 6 * s);
        ctx.stroke();
      } else if (th.kind === "spike") {
        ctx.strokeStyle = `hsl(${(hue + 0) % 360}, 100%, 55%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 10 * s);
        ctx.lineTo(p.x + 8 * s, p.y + 7 * s);
        ctx.lineTo(p.x, p.y + 3 * s);
        ctx.lineTo(p.x - 8 * s, p.y + 7 * s);
        ctx.closePath();
        ctx.stroke();
      } else {
        // dart
        ctx.strokeStyle = `hsl(${(hue + 185) % 360}, 100%, 65%)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 9 * s);
        ctx.lineTo(p.x + 5.5 * s, p.y + 7 * s);
        ctx.lineTo(p.x - 5.5 * s, p.y + 7 * s);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // player
    if (mode === "play") {
      if (!(player.invuln > 0 && Math.floor(t * 16) % 2 === 0)) {
        const elev = meshHeight(player.lane, PLAYER_DEPTH);
        const p = project(player.lane, PLAYER_DEPTH, elev + player.z * 0.055);
        const col = `hsl(${(hue + 8) % 360}, 100%, 75%)`;
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 20;
        ctx.lineWidth = 2.6;
        const f = player.facing;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 15);
        ctx.lineTo(p.x + 13 * f, p.y);
        ctx.lineTo(p.x, p.y + 13);
        ctx.lineTo(p.x - 13 * f, p.y);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x - 6, p.y + 13);
        ctx.lineTo(p.x - 10, p.y + 20);
        ctx.moveTo(p.x + 6, p.y + 13);
        ctx.lineTo(p.x + 10, p.y + 20);
        ctx.stroke();
        if (player.floating) {
          ctx.globalAlpha = 0.45;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + 14);
          ctx.lineTo(p.x - f * 8, p.y + 34);
          ctx.lineTo(p.x + f * 6, p.y + 30);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
      }
    }

    // particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2.4);
      ctx.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
      const sz = p.size || 3;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    // combo / mult display
    if (mode === "play" && mult > 1) {
      ctx.font = "bold 18px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = `hsla(${(hue + 30) % 360}, 100%, 70%, ${0.5 + comboTimer * 0.2})`;
      ctx.fillText("×" + mult, W * 0.5, 48);
    }

    // touch pads
    if (mode === "play" && ("ontouchstart" in window || matchMedia("(pointer: coarse)").matches)) {
      const padH = Math.min(92, H * 0.175);
      const padY = H - padH - 14;
      const leftW = W * 0.48;
      const rightX = W * 0.52;
      const rightW = W - rightX - 12;

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#0a1214";
      ctx.fillRect(12, padY, leftW - 20, padH);
      ctx.fillRect(rightX, padY, rightW, padH);

      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#22e0e8";
      ctx.lineWidth = 1.6;
      ctx.strokeRect(12, padY, leftW - 20, padH);
      ctx.strokeRect(rightX, padY, rightW, padH);

      const midX = 12 + (leftW - 20) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, padY + 12);
      ctx.lineTo(midX, padY + padH - 12);
      ctx.stroke();

      ctx.font = `bold ${Math.min(32, padH * 0.42)}px IBM Plex Mono, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cy = padY + padH / 2;

      ctx.globalAlpha = touch.left ? 1 : 0.48;
      ctx.fillStyle = touch.left ? "#22e0e8" : "#8af";
      ctx.fillText("◀", 12 + (leftW - 20) * 0.25, cy);

      ctx.globalAlpha = touch.right ? 1 : 0.48;
      ctx.fillStyle = touch.right ? "#22e0e8" : "#8af";
      ctx.fillText("▶", 12 + (leftW - 20) * 0.75, cy);

      ctx.globalAlpha = touch.jump ? 1 : 0.48;
      ctx.fillStyle = touch.jump ? "#22e0e8" : "#8af";
      ctx.font = `bold ${Math.min(26, padH * 0.36)}px IBM Plex Mono, monospace`;
      ctx.fillText("JUMP", rightX + rightW / 2, cy);
      ctx.restore();
    }

    ctx.restore();
  }

  function frame(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener("resize", resize);
  elBest.textContent = String(best);
  ensureSlices();
  requestAnimationFrame(frame);
})();
