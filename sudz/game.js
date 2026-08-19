// Suds Jack — Horizon Mesh
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

  const LANES = 9;
  const GRAVITY = 26;
  const JUMP_V = -12;
  const BOOST_V = -17;
  const FLOAT_DRAG = 0.28;
  const MOVE_SPEED = 7;
  const PLAYER_DEPTH = 0.92;
  const HIT_DEPTH = 0.86;
  const HI_KEY = "sudsJack.horizon.best";

  let W = 0, H = 0, dpr = 1;
  let mode = "title";
  let score = 0;
  let best = Number(localStorage.getItem(HI_KEY) || 0) || 0;
  let lives = 3;
  let t = 0;
  let last = 0;
  let hue = 175;
  let seed = 42;
  let distance = 0;
  let wave = 0;
  let glitchUntil = 0;
  let shake = 0;

  const keys = new Set();
  const touch = { left: false, right: false, jump: false };
  const activeTouches = new Map();

  const player = {
    lane: (LANES - 1) / 2,
    z: 0, vz: 0,
    onGround: true,
    floating: false,
    boostUntil: 0,
    invuln: 0,
    facing: 1
  };

  let slices = [];
  let nextSliceId = 0;
  let genPhase = 0;
  let things = [];
  let particles = [];
  let spawnTimer = 0.4;

  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  function randRange(a, b) { return a + rand() * (b - a); }

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

  function vanish() { return { x: W * 0.5, y: H * 0.13 }; }

  function project(lane, depth, elev) {
    const v = vanish();
    const nearY = H * 0.9;
    const y = v.y + (nearY - v.y) * Math.pow(depth, 0.92);
    const scale = 0.06 + depth * 0.94;
    const laneW = W * 0.78 * scale;
    const x = v.x + (lane - (LANES - 1) / 2) * (laneW / (LANES - 1));
    return { x, y: y - elev * 48 * scale, s: scale };
  }

  function meshHeight(lane, depth) {
    const ph = genPhase + depth * 5.5;
    const base = 0.08 + 0.22 * Math.sin(ph + lane * 0.85) * Math.sin(ph * 0.55 + lane * 0.3);
    const ridge = 0.18 * Math.sin(ph * 1.7 + lane * 1.4);
    return Math.max(0, base + ridge);
  }

  function meshPeak(lane, depth) {
    return meshHeight(lane, depth) > 0.34;
  }

  function ensureSlices() {
    while (slices.length < 32) {
      const maxD = slices.length ? Math.max(...slices.map(s => s.depth)) : -0.04;
      const d = maxD + 0.042;
      const heights = [];
      const peak = [];
      for (let i = 0; i < LANES; i++) {
        const h = meshHeight(i, d);
        heights.push(h);
        peak.push(h > 0.34);
      }
      slices.push({ depth: d, heights, peak, id: nextSliceId++ });
    }
  }

  function advanceLandscape(dt) {
    const speed = 0.2 * (mode === "play" ? 1 + Math.min(1.1, distance * 0.012) : 0.45) * dt;
    for (const s of slices) s.depth += speed;
    slices = slices.filter(s => s.depth < 1.18);
    genPhase += dt * 0.7;
    ensureSlices();
    if (mode === "play") distance += speed * 12;
  }

  function spawnAtHorizon() {
    const r = rand();
    let kind = "orb";
    if (r > 0.62) kind = "crawler";
    else if (r > 0.82) kind = "dart";
    else if (r > 0.92) kind = "boost";
    things.push({
      lane: Math.floor(rand() * LANES),
      depth: 0.01 + rand() * 0.06,
      kind,
      alive: true,
      phase: rand() * 10
    });
  }

  function burst(lane, depth, elev, count, hOff) {
    const p = project(lane, depth, elev);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const sp = 40 + rand() * 90;
      particles.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: 0.35 + rand() * 0.4,
        hue: (hue + hOff + rand() * 40) % 360
      });
    }
  }

  function tryJump() {
    if (mode !== "play" || !player.onGround) return;
    const peak = meshPeak(player.lane, PLAYER_DEPTH);
    player.vz = peak ? BOOST_V : JUMP_V;
    player.onGround = false;
    player.floating = !!peak;
    if (peak) {
      player.boostUntil = t + 0.55;
      score += 40;
      burst(player.lane, PLAYER_DEPTH, meshHeight(player.lane, PLAYER_DEPTH), 14, 40);
      updateHud();
      if (glitch) {
        glitch.className = "flash";
        setTimeout(() => glitch.className = "", 300);
      }
    }
  }

  function updateHud() {
    elScore.textContent = String(score | 0);
    elBest.textContent = String(best | 0);
    elLives.textContent = lives > 0 ? "● ".repeat(lives).trim() : "—";
  }

  function startGame() {
    mode = "play";
    score = 0;
    lives = 3;
    player.lane = (LANES - 1) / 2;
    player.z = 0;
    player.vz = 0;
    player.onGround = true;
    player.floating = false;
    player.invuln = 0;
    things = [];
    particles = [];
    distance = 0;
    wave = 0;
    spawnTimer = 0.5;
    overlay.classList.remove("show");
    updateHud();
  }

  function hurt() {
    if (player.invuln > 0) return;
    lives--;
    player.invuln = 1.4;
    shake = 10;
    if (glitch) {
      glitch.className = "hard";
      setTimeout(() => glitch.className = "", 450);
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

  // ── Bomb Jack touch layout ─────────────────────────────────
  function zoneAt(x, y) {
    if (y < H * 0.52) return null;
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
    if ((e.code === "Enter") && (mode === "title" || mode === "over")) startGame();
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
    hue = (hue + dt * 16) % 360;
    if (shake > 0) shake *= 0.88;

    advanceLandscape(dt);

    if (mode === "title") {
      if (rand() < dt * 0.55) spawnAtHorizon();
      things = things.filter(th => th.alive && th.depth < 1.15);
      return;
    }
    if (mode !== "play") return;

    // move
    let input = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft") || touch.left) input -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight") || touch.right) input += 1;
    if (input) player.facing = input;
    const air = player.onGround ? 1 : 0.62;
    player.lane += input * MOVE_SPEED * air * dt;
    player.lane = Math.max(0, Math.min(LANES - 1, player.lane));

    // jump physics
    if (player.floating && player.vz > 0 && t < player.boostUntil + 0.65) {
      player.vz += GRAVITY * FLOAT_DRAG * dt;
    } else {
      player.vz += GRAVITY * dt;
      if (player.vz > 0) player.floating = false;
    }
    player.z += player.vz * dt;
    if (player.vz >= 0 && player.z <= 0) {
      player.z = 0;
      player.vz = 0;
      player.onGround = true;
      player.floating = false;
    } else {
      player.onGround = false;
    }

    if (player.invuln > 0) player.invuln -= dt;

    // spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnAtHorizon();
      if (rand() < 0.38) spawnAtHorizon();
      spawnTimer = Math.max(0.22, 0.78 - distance * 0.0018);
      wave++;
    }

    // things
    for (const th of things) {
      if (!th.alive) continue;
      th.phase += dt * 6;
      if (th.depth > 1.12) { th.alive = false; continue; }

      if (th.depth > HIT_DEPTH && th.depth < 1.01) {
        const dist = Math.abs(th.lane - player.lane);
        if (dist < 0.52) {
          if (th.kind === "orb" || th.kind === "boost") {
            if (th.kind === "boost" && player.z < 0.6 && !player.floating) continue;
            th.alive = false;
            score += th.kind === "boost" ? 180 : 100;
            burst(th.lane, th.depth, meshHeight(th.lane, th.depth) + 0.08, 12, th.kind === "boost" ? 50 : 160);
            updateHud();
          } else {
            // hazard
            const stomp = player.vz > 1.8 && player.z > 0.35;
            if (stomp && th.kind !== "dart") {
              th.alive = false;
              player.vz = JUMP_V * 0.5;
              score += 220;
              burst(th.lane, th.depth, meshHeight(th.lane, th.depth), 16, 0);
              updateHud();
            } else if (player.invuln <= 0 && player.z < 1.6) {
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
      p.vy += 120 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ── render ─────────────────────────────────────────────────
  function render() {
    ctx.save();
    if (shake > 0.4) {
      ctx.translate((rand() - 0.5) * shake, (rand() - 0.5) * shake);
    }

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, W, H);

    // horizon glow
    const v = vanish();
    const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, H * 0.55);
    g.addColorStop(0, `hsla(${hue}, 90%, 45%, 0.18)`);
    g.addColorStop(0.5, `hsla(${(hue + 40) % 360}, 70%, 30%, 0.06)`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const sorted = slices.slice().sort((a, b) => a.depth - b.depth);

    // lane rails
    for (let lane = 0; lane < LANES; lane++) {
      ctx.beginPath();
      let started = false;
      for (const s of sorted) {
        if (s.depth < 0.01 || s.depth > 1.05) continue;
        const p = project(lane, s.depth, s.heights[lane] || 0);
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      if (started) {
        ctx.strokeStyle = `hsla(${(hue + lane * 11) % 360}, 100%, 58%, 0.55)`;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    }

    // cross ribs + peaks
    for (const s of sorted) {
      if (s.depth < 0.04 || s.depth > 1.02) continue;
      ctx.beginPath();
      for (let lane = 0; lane < LANES; lane++) {
        const p = project(lane, s.depth, s.heights[lane] || 0);
        if (lane === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const fade = Math.min(1, s.depth * 1.5);
      ctx.strokeStyle = `hsla(${(hue + s.depth * 70) % 360}, 100%, 52%, ${0.18 + fade * 0.5})`;
      ctx.lineWidth = 1 + s.depth * 1.1;
      ctx.stroke();

      // peak markers
      for (let lane = 0; lane < LANES; lane++) {
        if (!s.peak[lane]) continue;
        const p = project(lane, s.depth, s.heights[lane]);
        const sz = 3.5 + s.depth * 9;
        ctx.strokeStyle = `hsla(${(hue + 55) % 360}, 100%, 72%, ${0.35 + fade * 0.55})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p.x - sz, p.y);
        ctx.lineTo(p.x, p.y - sz * 1.25);
        ctx.lineTo(p.x + sz, p.y);
        ctx.stroke();
      }
    }

    // things
    for (const th of things) {
      if (!th.alive) continue;
      const elev = meshHeight(th.lane, th.depth) + 0.06;
      const p = project(th.lane, th.depth, elev);
      const s = p.s;
      if (th.kind === "orb") {
        ctx.strokeStyle = `hsl(${(hue + 130) % 360}, 100%, 70%)`;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10 * s;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (th.kind === "boost") {
        ctx.strokeStyle = `hsl(${(hue + 45) % 360}, 100%, 68%)`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 8 * s);
        ctx.lineTo(p.x + 6 * s, p.y + 5 * s);
        ctx.lineTo(p.x - 6 * s, p.y + 5 * s);
        ctx.closePath();
        ctx.stroke();
      } else if (th.kind === "crawler") {
        ctx.strokeStyle = `hsl(${(hue + 10) % 360}, 100%, 60%)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(p.x - 6 * s, p.y);
        ctx.lineTo(p.x + 6 * s, p.y);
        ctx.moveTo(p.x, p.y - 5 * s);
        ctx.lineTo(p.x, p.y + 5 * s);
        ctx.stroke();
      } else {
        // dart
        ctx.strokeStyle = `hsl(${(hue + 190) % 360}, 100%, 65%)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 8 * s);
        ctx.lineTo(p.x + 5 * s, p.y + 6 * s);
        ctx.lineTo(p.x - 5 * s, p.y + 6 * s);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // player
    if (mode === "play") {
      if (!(player.invuln > 0 && Math.floor(t * 18) % 2 === 0)) {
        const elev = meshHeight(player.lane, PLAYER_DEPTH);
        const p = project(player.lane, PLAYER_DEPTH, elev + player.z * 0.05);
        const col = `hsl(${(hue + 12) % 360}, 100%, 74%)`;
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2.5;
        const f = player.facing;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 14);
        ctx.lineTo(p.x + 12 * f, p.y);
        ctx.lineTo(p.x, p.y + 12);
        ctx.lineTo(p.x - 12 * f, p.y);
        ctx.closePath();
        ctx.stroke();
        // legs
        ctx.beginPath();
        ctx.moveTo(p.x - 5, p.y + 12);
        ctx.lineTo(p.x - 9, p.y + 18);
        ctx.moveTo(p.x + 5, p.y + 12);
        ctx.lineTo(p.x + 9, p.y + 18);
        ctx.stroke();
        if (player.floating) {
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + 13);
          ctx.lineTo(p.x - f * 7, p.y + 32);
          ctx.lineTo(p.x + f * 5, p.y + 28);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
      }
    }

    // particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2.2);
      ctx.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // touch pads (Bomb Jack layout)
    if (mode === "play" && ("ontouchstart" in window || matchMedia("(pointer: coarse)").matches)) {
      const padH = Math.min(90, H * 0.17);
      const padY = H - padH - 12;
      const leftW = W * 0.48;
      const rightX = W * 0.52;
      const rightW = W - rightX - 10;

      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#0a1214";
      ctx.fillRect(10, padY, leftW - 18, padH);
      ctx.fillRect(rightX, padY, rightW, padH);

      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = "#22e0e8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(10, padY, leftW - 18, padH);
      ctx.strokeRect(rightX, padY, rightW, padH);

      const midX = 10 + (leftW - 18) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, padY + 10);
      ctx.lineTo(midX, padY + padH - 10);
      ctx.stroke();

      ctx.font = `bold ${Math.min(30, padH * 0.4)}px IBM Plex Mono, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cy = padY + padH / 2;

      ctx.globalAlpha = touch.left ? 1 : 0.5;
      ctx.fillStyle = touch.left ? "#22e0e8" : "#8af";
      ctx.fillText("◀", 10 + (leftW - 18) * 0.25, cy);

      ctx.globalAlpha = touch.right ? 1 : 0.5;
      ctx.fillStyle = touch.right ? "#22e0e8" : "#8af";
      ctx.fillText("▶", 10 + (leftW - 18) * 0.75, cy);

      ctx.globalAlpha = touch.jump ? 1 : 0.5;
      ctx.fillStyle = touch.jump ? "#22e0e8" : "#8af";
      ctx.font = `bold ${Math.min(24, padH * 0.34)}px IBM Plex Mono, monospace`;
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
