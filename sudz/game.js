// Suds Jack — horizon vector landscape (Bomb Jack controls)
// Left side move · Right side JUMP

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
  const GRAVITY = 28;
  const JUMP_V = -11.5;
  const BOOST_V = -16.5;
  const MOVE_SPEED = 6.5;
  const PLAYER_DEPTH = 0.92;
  const HI_KEY = "sudsJack.horizon.best";

  let W = 0, H = 0, dpr = 1;
  let mode = "title";
  let score = 0;
  let best = Number(localStorage.getItem(HI_KEY) || 0) || 0;
  let lives = 3;
  let t = 0;
  let last = 0;
  let hue = 175;
  let seed = 1;
  let distance = 0;

  const keys = new Set();
  const touch = { left: false, right: false, jump: false };
  const activeTouches = new Map();

  const player = {
    lane: (LANES - 1) / 2,
    z: 0, vz: 0, onGround: true, floating: false, boostUntil: 0, invuln: 0, facing: 1
  };

  let slices = [];
  let things = [];
  let particles = [];
  let spawnTimer = 0;
  let nextSliceId = 0;
  let genPhase = 0;

  function rand() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }

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

  function vanish() { return { x: W * 0.5, y: H * 0.14 }; }

  function project(lane, depth, elev) {
    const v = vanish();
    const nearY = H * 0.88;
    const y = v.y + (nearY - v.y) * depth;
    const scale = 0.08 + depth * 0.92;
    const laneW = W * 0.72 * scale;
    const x = v.x + (lane - (LANES - 1) / 2) * (laneW / (LANES - 1));
    const elevPx = elev * 40 * scale;
    return { x, y: y - elevPx, s: scale };
  }

  function meshHeight(lane, depth) {
    const ph = genPhase + depth * 4;
    return 0.15 + 0.25 * Math.sin(ph + lane * 0.7) * Math.sin(ph * 0.6);
  }

  function meshPeak(lane, depth) {
    const h = meshHeight(lane, depth);
    return h > 0.32;
  }

  function ensureSlices() {
    while (slices.length < 28) {
      const depths = slices.map(s => s.depth);
      const maxD = depths.length ? Math.max(...depths) : -0.05;
      const d = maxD + 0.045;
      const heights = [];
      const peak = [];
      for (let i = 0; i < LANES; i++) {
        const h = 0.12 + 0.3 * Math.sin(genPhase + d * 5 + i * 0.8);
        heights.push(Math.max(0, h));
        peak.push(h > 0.35);
      }
      slices.push({ depth: d, heights, peak, id: nextSliceId++ });
    }
  }

  function advanceLandscape(dt) {
    const scroll = 0.22 * (mode === "play" ? 1 + Math.min(0.8, distance * 0.01) : 0.5) * dt;
    for (const s of slices) s.depth += scroll;
    slices = slices.filter(s => s.depth < 1.15);
    genPhase += dt * 0.8;
    ensureSlices();
    distance += scroll * 10;
  }

  function spawnAtHorizon() {
    const kind = rand() < 0.55 ? "orb" : (rand() < 0.6 ? "crawler" : "dart");
    things.push({
      lane: Math.floor(rand() * LANES),
      depth: 0.02 + rand() * 0.08,
      kind,
      alive: true,
      phase: rand() * 6
    });
  }

  function tryJump() {
    if (mode !== "play" || !player.onGround) return;
    const peak = meshPeak(player.lane, PLAYER_DEPTH);
    player.vz = peak ? BOOST_V : JUMP_V;
    player.onGround = false;
    player.floating = peak;
    if (peak) {
      player.boostUntil = t + 0.5;
      score += 30;
      updateHud();
    }
  }

  function updateHud() {
    elScore.textContent = String(score);
    elBest.textContent = String(best);
    elLives.textContent = "● ".repeat(Math.max(0, lives)).trim() || "—";
  }

  function startGame() {
    mode = "play";
    score = 0;
    lives = 3;
    player.lane = (LANES - 1) / 2;
    player.z = 0; player.vz = 0; player.onGround = true; player.floating = false;
    things = [];
    particles = [];
    distance = 0;
    overlay.classList.remove("show");
    updateHud();
  }

  function hurt() {
    lives--;
    player.invuln = 1.2;
    if (glitch) { glitch.className = "hard"; setTimeout(() => glitch.className = "", 500); }
    if (lives <= 0) {
      mode = "over";
      if (score > best) { best = score; localStorage.setItem(HI_KEY, String(best)); }
      overlay.classList.add("show");
      updateHud();
    }
  }

  function zoneAt(x, y) {
    const bandTop = H * 0.55;
    if (y < bandTop) return null;
    if (x < W * 0.48) return x < W * 0.24 ? "left" : "right";
    if (x > W * 0.52) return "jump";
    return null;
  }

  function syncTouchFlags() {
    touch.left = touch.right = touch.jump = false;
    for (const z of activeTouches.values()) {
      if (z === "left") touch.left = true;
      else if (z === "right") touch.right = true;
      else if (z === "jump") touch.jump = true;
    }
  }

  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code)) e.preventDefault();
    if (keys.has(e.code)) return;
    keys.add(e.code);
    if (e.code === "Enter" && (mode === "title" || mode === "over")) startGame();
    if (mode === "play" && (e.code === "Space" || e.code === "KeyW" || e.code === "ArrowUp")) tryJump();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => { keys.clear(); activeTouches.clear(); syncTouchFlags(); });

  playBtn.addEventListener("click", () => startGame());
  overlay.addEventListener("click", (e) => { if (e.target === overlay || e.target === playBtn) startGame(); });

  function onTouchStart(e) {
    e.preventDefault();
    if (mode !== "play") { startGame(); return; }
    for (const te of e.changedTouches) {
      const z = zoneAt(te.clientX, te.clientY);
      if (z) {
        activeTouches.set(te.identifier, z);
        if (z === "jump") tryJump();
      }
    }
    syncTouchFlags();
  }
  function onTouchMove(e) {
    e.preventDefault();
    if (mode !== "play") return;
    for (const te of e.changedTouches) {
      const z = zoneAt(te.clientX, te.clientY);
      if (z) activeTouches.set(te.identifier, z);
      else activeTouches.delete(te.identifier);
    }
    syncTouchFlags();
  }
  function onTouchEnd(e) {
    e.preventDefault();
    for (const te of e.changedTouches) activeTouches.delete(te.identifier);
    syncTouchFlags();
  }
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });

  function update(dt) {
    t += dt;
    hue = (hue + dt * 14) % 360;
    advanceLandscape(dt);

    if (mode === "title") {
      if (rand() < dt * 0.6) spawnAtHorizon();
      things = things.filter(th => th.alive && th.depth < 1.2);
      return;
    }
    if (mode !== "play") return;

    let input = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft") || touch.left) input -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight") || touch.right) input += 1;
    if (input) player.facing = input;
    const air = player.onGround ? 1 : 0.65;
    player.lane += input * MOVE_SPEED * air * dt;
    player.lane = Math.max(0, Math.min(LANES - 1, player.lane));

    if (player.floating && player.vz > 0 && t < player.boostUntil + 0.7) {
      player.vz += GRAVITY * 0.32 * dt;
    } else {
      player.vz += GRAVITY * dt;
      if (player.vz > 0) player.floating = false;
    }
    player.z += player.vz * dt;
    if (player.vz >= 0 && player.z <= 0) {
      player.z = 0; player.vz = 0; player.onGround = true; player.floating = false;
    } else player.onGround = false;

    if (player.invuln > 0) player.invuln -= dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnAtHorizon();
      if (rand() < 0.4) spawnAtHorizon();
      spawnTimer = Math.max(0.3, 0.9 - distance * 0.002);
    }

    for (const th of things) {
      if (!th.alive) continue;
      th.phase += dt * 5;
      if (th.depth > 1.15) { th.alive = false; continue; }
      if (th.depth > 0.88 && th.depth < 1.02) {
        const laneDist = Math.abs(th.lane - player.lane);
        if (laneDist < 0.55) {
          if (th.kind === "orb") {
            th.alive = false;
            score += 100;
            updateHud();
          } else if (player.invuln <= 0 && player.z < 1.5) {
            th.alive = false;
            hurt();
          }
        }
      }
    }
    things = things.filter(th => th.alive);
  }

  function render() {
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, W, H);

    const v = vanish();
    const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, H * 0.5);
    g.addColorStop(0, `hsla(${hue}, 80%, 40%, 0.15)`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const sorted = slices.slice().sort((a, b) => a.depth - b.depth);
    for (let lane = 0; lane < LANES; lane++) {
      ctx.beginPath();
      let started = false;
      for (const s of sorted) {
        if (s.depth < 0 || s.depth > 1.05) continue;
        const p = project(lane, s.depth, s.heights[lane] || 0);
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      if (started) {
        ctx.strokeStyle = `hsla(${(hue + lane * 12) % 360}, 100%, 55%, 0.6)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    for (const s of sorted) {
      if (s.depth < 0.05 || s.depth > 1.0) continue;
      ctx.beginPath();
      for (let lane = 0; lane < LANES; lane++) {
        const p = project(lane, s.depth, s.heights[lane] || 0);
        if (lane === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `hsla(${(hue + s.depth * 80) % 360}, 100%, 50%, ${0.2 + s.depth * 0.5})`;
      ctx.lineWidth = 1 + s.depth;
      ctx.stroke();
    }

    for (const th of things) {
      if (!th.alive) continue;
      const elev = meshHeight(th.lane, th.depth);
      const p = project(th.lane, th.depth, elev + 0.05);
      const s = p.s;
      if (th.kind === "orb") {
        ctx.strokeStyle = `hsl(${(hue + 120) % 360}, 100%, 70%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 * s, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.strokeStyle = `hsl(${(hue + 0) % 360}, 100%, 60%)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 8 * s);
        ctx.lineTo(p.x + 5 * s, p.y + 6 * s);
        ctx.lineTo(p.x - 5 * s, p.y + 6 * s);
        ctx.closePath();
        ctx.stroke();
      }
    }

    if (mode === "play") {
      if (!(player.invuln > 0 && Math.floor(t * 20) % 2 === 0)) {
        const elev = meshHeight(player.lane, PLAYER_DEPTH);
        const p = project(player.lane, PLAYER_DEPTH, elev + player.z * 0.045);
        const col = `hsl(${(hue + 15) % 360}, 100%, 72%)`;
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2.4;
        const f = player.facing;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 13);
        ctx.lineTo(p.x + 11 * f, p.y);
        ctx.lineTo(p.x, p.y + 11);
        ctx.lineTo(p.x - 11 * f, p.y);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    if (mode === "play" && ("ontouchstart" in window || matchMedia("(pointer: coarse)").matches)) {
      const padH = Math.min(88, H * 0.16);
      const padY = H - padH - 10;
      const leftW = W * 0.48;
      const rightX = W * 0.52;
      const rightW = W - rightX - 8;

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#0a1214";
      ctx.fillRect(8, padY, leftW - 16, padH);
      ctx.fillRect(rightX, padY, rightW, padH);

      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#22e0e8";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(8, padY, leftW - 16, padH);
      ctx.strokeRect(rightX, padY, rightW, padH);

      const midX = 8 + (leftW - 16) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, padY + 8);
      ctx.lineTo(midX, padY + padH - 8);
      ctx.stroke();

      ctx.font = `bold ${Math.min(28, padH * 0.38)}px IBM Plex Mono, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cy = padY + padH / 2;

      ctx.globalAlpha = touch.left ? 1 : 0.55;
      ctx.fillStyle = touch.left ? "#22e0e8" : "#8fd";
      ctx.fillText("◀", 8 + (leftW - 16) * 0.25, cy);

      ctx.globalAlpha = touch.right ? 1 : 0.55;
      ctx.fillStyle = touch.right ? "#22e0e8" : "#8fd";
      ctx.fillText("▶", 8 + (leftW - 16) * 0.75, cy);

      ctx.globalAlpha = touch.jump ? 1 : 0.55;
      ctx.fillStyle = touch.jump ? "#22e0e8" : "#8fd";
      ctx.font = `bold ${Math.min(22, padH * 0.32)}px IBM Plex Mono, monospace`;
      ctx.fillText("JUMP", rightX + rightW / 2, cy);
      ctx.restore();
    }
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
