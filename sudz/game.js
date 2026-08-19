// Suds Jack — Horizon Mesh v5.0
// Fixed projection + consistent jump physics (z up, positive)
// Bomb Jack × Tempest × Tiny Wings × Suda51

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

  const VERSION = "v5.0";
  const LANES = 9;

  // Physics — z is UP, 0 = ground
  const GRAVITY = 48;
  const JUMP_V = 14;
  const BOOST_V = 22;
  const FLOAT_G = 12;
  const MOVE_SPEED = 7.2;
  const PLAYER_DEPTH = 0.88;
  const HIT_DEPTH = 0.82;
  const HI_KEY = "sudsJack.horizon.v5.best";

  // Perspective — sane classic vector
  const FAR_SCALE = 0.06;
  const NEAR_SCALE = 1.0;
  const ELEV_PX = 90;

  let W = 0, H = 0, dpr = 1;
  let mode = "title";
  let score = 0, best = Number(localStorage.getItem(HI_KEY) || 0) || 0;
  let lives = 3, mult = 1, combo = 0, comboTimer = 0;
  let t = 0, last = 0, hue = 172, seed = 11;
  let distance = 0, intensity = 1;
  let shake = 0, flash = 0;

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
    g.gain.value = vol || 0.07;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }
  function sfxJump(peak) { blip(peak ? 420 : 240, 0.1, "triangle", 0.08, peak ? 560 : 150); }
  function sfxCollect() { blip(700, 0.06, "sine", 0.06, 1000); }
  function sfxBoost() { blip(170, 0.14, "sawtooth", 0.05, 400); }
  function sfxHit() { blip(80, 0.16, "sawtooth", 0.09, 30); }
  function sfxStomp() { blip(120, 0.08, "square", 0.07, 50); }

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

  function vanish() {
    return { x: W * 0.5, y: H * 0.14 };
  }

  function perspectiveScale(depth) {
    const d = Math.max(0, Math.min(1, depth));
    return FAR_SCALE + (NEAR_SCALE - FAR_SCALE) * d;
  }

  function project(lane, depth, elev, jumpZ) {
    const v = vanish();
    const d = Math.max(0, Math.min(1.05, depth));
    const s = perspectiveScale(d);
    const nearY = H * 0.86;
    const baseY = v.y + (nearY - v.y) * d;
    const totalElev = Math.max(0, (elev || 0) + (jumpZ || 0));
    const elevPx = totalElev * ELEV_PX * s;
    const totalW = W * 0.78 * s;
    const x = v.x + (lane - (LANES - 1) / 2) * (totalW / (LANES - 1));
    return { x, y: baseY - elevPx, s };
  }

  function meshHeight(lane, depth) {
    const world = genPhase + depth * 6.5 + distance * 0.012;
    const ridge = Math.abs(Math.sin(world * 0.5 + lane * 0.65));
    const sharp = Math.pow(ridge, 2.0) * 0.28;
    const cross = Math.pow(Math.abs(Math.sin(world * 1.2 + lane * 1.5)), 1.8) * 0.14;
    const platWave = Math.sin(world * 0.2 + lane * 0.28);
    const plat = platWave > 0.7 ? (platWave - 0.7) * 1.8 : 0;
    const base = 0.03 + 0.05 * Math.sin(world * 0.14 + lane * 0.35);
    return Math.min(0.7, base + sharp + cross + plat);
  }

  function meshPeak(lane, depth) {
    return meshHeight(lane, depth) > 0.38;
  }

  function ensureSlices() {
    while (slices.length < 36) {
      const maxD = slices.length ? Math.max(...slices.map(s => s.depth)) : -0.03;
      const d = maxD + 0.036;
      const heights = [];
      const peak = [];
      for (let i = 0; i < LANES; i++) {
        const h = meshHeight(i, d);
        heights.push(h);
        peak.push(h > 0.38);
      }
      slices.push({ depth: d, heights, peak, id: nextSliceId++ });
    }
  }

  function advanceLandscape(dt) {
    const base = mode === "play" ? 0.18 + Math.min(0.22, distance * 0.001) : 0.35;
    const speed = base * intensity * dt;
    for (const s of slices) s.depth += speed;
    slices = slices.filter(s => s.depth < 1.08);
    genPhase += dt * (0.55 + intensity * 0.12);
    ensureSlices();
    if (mode === "play") {
      distance += speed * 14;
      intensity = 1 + Math.min(1.6, distance * 0.0035);
    }
  }

  function spawnAtHorizon() {
    const r = rand();
    let kind = "orb";
    if (r > 0.55) kind = "crawler";
    else if (r > 0.78) kind = "dart";
    else if (r > 0.9) kind = "boost";
    else if (r > 0.96 && intensity > 1.2) kind = "spike";
    things.push({
      lane: Math.floor(rand() * LANES),
      depth: 0.01 + rand() * 0.04,
      kind,
      alive: true,
      phase: rand() * 12,
      hp: kind === "spike" ? 2 : 1
    });
  }

  function burst(lane, depth, elev, count, hOff) {
    const p = project(lane, depth, elev, 0);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const sp = 40 + rand() * 90;
      particles.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 30,
        life: 0.25 + rand() * 0.35,
        hue: (hue + hOff + rand() * 40) % 360,
        size: 2 + rand() * 2.5
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
      player.boostUntil = t + 0.55;
      addCombo(50);
      burst(player.lane, PLAYER_DEPTH, meshHeight(player.lane, PLAYER_DEPTH), 14, 30);
      flash = 0.22;
      if (glitch) {
        glitch.className = "flash";
        setTimeout(() => glitch.className = "", 250);
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
    distance = 0; intensity = 1;
    spawnTimer = 0.5;
    overlay.classList.remove("show");
    updateHud();
  }

  function hurt() {
    if (player.invuln > 0) return;
    lives--;
    player.invuln = 1.4;
    shake = 12;
    combo = 0; mult = 1; comboTimer = 0;
    sfxHit();
    if (glitch) {
      glitch.className = "hard";
      setTimeout(() => glitch.className = "", 400);
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

  function update(dt) {
    t += dt;
    hue = (hue + dt * (12 + intensity * 4)) % 360;
    if (shake > 0) shake *= 0.86;
    if (flash > 0) flash -= dt;
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) { combo = 0; mult = 1; }
    }

    advanceLandscape(dt);

    if (mode === "title") {
      if (rand() < dt * 0.6) spawnAtHorizon();
      things = things.filter(th => th.alive && th.depth < 1.05);
      return;
    }
    if (mode !== "play") return;

    let input = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft") || touch.left) input -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight") || touch.right) input += 1;
    if (input) player.facing = input;
    const air = player.onGround ? 1 : 0.55;
    player.lane += input * MOVE_SPEED * air * dt;
    player.lane = Math.max(0, Math.min(LANES - 1, player.lane));

    // vertical — z is UP
    if (player.floating && player.vz < 0 && t < player.boostUntil + 0.6) {
      player.vz -= FLOAT_G * dt;
    } else {
      player.vz -= GRAVITY * dt;
    }
    player.z += player.vz * dt;
    if (player.z <= 0) {
      player.z = 0;
      player.vz = 0;
      player.onGround = true;
      player.floating = false;
    } else {
      player.onGround = false;
    }

    if (player.invuln > 0) player.invuln -= dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnAtHorizon();
      if (rand() < 0.3 + intensity * 0.1) spawnAtHorizon();
      spawnTimer = Math.max(0.2, 0.7 - distance * 0.0012 - intensity * 0.04);
    }

    for (const th of things) {
      if (!th.alive) continue;
      th.phase += dt * (5 + intensity);
      if (th.kind === "crawler" || th.kind === "spike") {
        th.lane += Math.sin(th.phase * 0.35) * 0.4 * dt;
        th.lane = Math.max(0, Math.min(LANES - 1, th.lane));
      }
      if (th.depth > 1.05) { th.alive = false; continue; }

      if (th.depth > HIT_DEPTH && th.depth < 0.98) {
        const dist = Math.abs(th.lane - player.lane);
        if (dist < 0.5) {
          if (th.kind === "orb" || th.kind === "boost") {
            if (th.kind === "boost" && player.z < 0.3 && !player.floating) continue;
            th.alive = false;
            if (th.kind === "boost") {
              sfxBoost();
              player.vz = BOOST_V * 0.65;
              player.floating = true;
              player.boostUntil = t + 0.35;
              addCombo(200);
              burst(th.lane, th.depth, meshHeight(th.lane, th.depth), 16, 40);
            } else {
              sfxCollect();
              addCombo(100);
              burst(th.lane, th.depth, meshHeight(th.lane, th.depth), 10, 130);
            }
          } else {
            const stomp = player.vz < -2 && player.z > 0.25;
            if (stomp && th.kind !== "dart") {
              th.hp--;
              if (th.hp <= 0) {
                th.alive = false;
                player.vz = JUMP_V * 0.45;
                sfxStomp();
                addCombo(th.kind === "spike" ? 350 : 240);
                burst(th.lane, th.depth, meshHeight(th.lane, th.depth), 16, 0);
              }
            } else if (player.invuln <= 0 && player.z < 1.2) {
              th.alive = false;
              hurt();
            }
          }
        }
      }
    }
    things = things.filter(th => th.alive);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 140 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function render() {
    ctx.save();
    if (shake > 0.5) {
      ctx.translate((rand() - 0.5) * shake, (rand() - 0.5) * shake);
    }

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, W, H);

    const v = vanish();
    const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, H * 0.5);
    g.addColorStop(0, `hsla(${hue}, 90%, 45%, ${0.18 + flash * 0.35})`);
    g.addColorStop(0.5, `hsla(${(hue + 40) % 360}, 60%, 25%, 0.05)`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const sorted = slices.slice().sort((a, b) => a.depth - b.depth);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let lane = 0; lane < LANES; lane++) {
      ctx.beginPath();
      let started = false;
      for (const s of sorted) {
        if (s.depth < 0.01 || s.depth > 1.0) continue;
        const p = project(lane, s.depth, s.heights[lane] || 0, 0);
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      if (started) {
        ctx.strokeStyle = `hsla(${(hue + lane * 9) % 360}, 100%, 55%, 0.5)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    for (const s of sorted) {
      if (s.depth < 0.03 || s.depth > 0.98) continue;
      ctx.beginPath();
      for (let lane = 0; lane < LANES; lane++) {
        const p = project(lane, s.depth, s.heights[lane] || 0, 0);
        if (lane === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const fade = Math.min(1, s.depth * 1.5);
      ctx.strokeStyle = `hsla(${(hue + s.depth * 50) % 360}, 100%, 50%, ${0.12 + fade * 0.45})`;
      ctx.lineWidth = 0.9 + s.depth * 1.1;
      ctx.stroke();

      for (let lane = 0; lane < LANES; lane++) {
        if (!s.peak[lane]) continue;
        const p = project(lane, s.depth, s.heights[lane], 0);
        const sz = 3 + s.depth * 9;
        ctx.strokeStyle = `hsla(${(hue + 45) % 360}, 100%, 75%, ${0.3 + fade * 0.55})`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(p.x - sz, p.y + 1);
        ctx.lineTo(p.x, p.y - sz * 1.2);
        ctx.lineTo(p.x + sz, p.y + 1);
        ctx.stroke();
      }
    }

    for (const th of things) {
      if (!th.alive || th.depth > 1.0) continue;
      const elev = meshHeight(th.lane, th.depth);
      const p = project(th.lane, th.depth, elev, 0);
      const s = p.s;
      const pulse = 0.9 + 0.1 * Math.sin(th.phase);
      ctx.lineWidth = 1.5 + s * 0.5;

      if (th.kind === "orb") {
        ctx.strokeStyle = `hsl(${(hue + 120) % 360}, 100%, 70%)`;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10 * s;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 * s * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (th.kind === "boost") {
        ctx.strokeStyle = `hsl(${(hue + 40) % 360}, 100%, 70%)`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 8 * s);
        ctx.lineTo(p.x + 6 * s, p.y + 5 * s);
        ctx.lineTo(p.x - 6 * s, p.y + 5 * s);
        ctx.closePath();
        ctx.stroke();
      } else if (th.kind === "crawler") {
        ctx.strokeStyle = `hsl(${(hue + 5) % 360}, 100%, 55%)`;
        ctx.beginPath();
        ctx.moveTo(p.x - 6 * s, p.y);
        ctx.lineTo(p.x + 6 * s, p.y);
        ctx.moveTo(p.x, p.y - 5 * s);
        ctx.lineTo(p.x, p.y + 5 * s);
        ctx.stroke();
      } else if (th.kind === "spike") {
        ctx.strokeStyle = `hsl(${(hue + 0) % 360}, 100%, 55%)`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 9 * s);
        ctx.lineTo(p.x + 7 * s, p.y + 6 * s);
        ctx.lineTo(p.x, p.y + 2 * s);
        ctx.lineTo(p.x - 7 * s, p.y + 6 * s);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.strokeStyle = `hsl(${(hue + 180) % 360}, 100%, 65%)`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 8 * s);
        ctx.lineTo(p.x + 5 * s, p.y + 6 * s);
        ctx.lineTo(p.x - 5 * s, p.y + 6 * s);
        ctx.closePath();
        ctx.stroke();
      }
    }

    if (mode === "play") {
      if (!(player.invuln > 0 && Math.floor(t * 14) % 2 === 0)) {
        const elev = meshHeight(player.lane, PLAYER_DEPTH);
        const jumpZ = Math.min(1.1, player.z * 0.07);
        const p = project(player.lane, PLAYER_DEPTH, elev, jumpZ);
        const py = Math.max(H * 0.08, Math.min(H * 0.82, p.y));
        const col = `hsl(${(hue + 8) % 360}, 100%, 75%)`;
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 16;
        ctx.lineWidth = 2.4;
        const f = player.facing;
        ctx.beginPath();
        ctx.moveTo(p.x, py - 14);
        ctx.lineTo(p.x + 12 * f, py);
        ctx.lineTo(p.x, py + 12);
        ctx.lineTo(p.x - 12 * f, py);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x - 5, py + 12);
        ctx.lineTo(p.x - 9, py + 18);
        ctx.moveTo(p.x + 5, py + 12);
        ctx.lineTo(p.x + 9, py + 18);
        ctx.stroke();
        if (player.floating) {
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.moveTo(p.x, py + 13);
          ctx.lineTo(p.x - f * 7, py + 30);
          ctx.lineTo(p.x + f * 5, py + 26);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
      }
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2.4);
      ctx.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
      const sz = p.size || 3;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    if (mode === "play" && mult > 1) {
      ctx.font = "bold 17px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = `hsla(${(hue + 25) % 360}, 100%, 70%, ${0.5 + comboTimer * 0.2})`;
      ctx.fillText("×" + mult, W * 0.5, 44);
    }

    // version — always visible
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.font = "11px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#7cf";
    ctx.fillText(VERSION, 10, H - 8);
    ctx.restore();

    if (mode === "play" && ("ontouchstart" in window || matchMedia("(pointer: coarse)").matches)) {
      const padH = Math.min(88, H * 0.16);
      const padY = H - padH - 12;
      const leftW = W * 0.48;
      const rightX = W * 0.52;
      const rightW = W - rightX - 10;

      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "#0a1214";
      ctx.fillRect(10, padY, leftW - 16, padH);
      ctx.fillRect(rightX, padY, rightW, padH);

      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "#22e0e8";
      ctx.lineWidth = 1.4;
      ctx.strokeRect(10, padY, leftW - 16, padH);
      ctx.strokeRect(rightX, padY, rightW, padH);

      const midX = 10 + (leftW - 16) / 2;
      ctx.beginPath();
      ctx.moveTo(midX, padY + 10);
      ctx.lineTo(midX, padY + padH - 10);
      ctx.stroke();

      ctx.font = `bold ${Math.min(28, padH * 0.4)}px IBM Plex Mono, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cy = padY + padH / 2;

      ctx.globalAlpha = touch.left ? 1 : 0.45;
      ctx.fillStyle = touch.left ? "#22e0e8" : "#8af";
      ctx.fillText("◀", 10 + (leftW - 16) * 0.25, cy);

      ctx.globalAlpha = touch.right ? 1 : 0.45;
      ctx.fillStyle = touch.right ? "#22e0e8" : "#8af";
      ctx.fillText("▶", 10 + (leftW - 16) * 0.75, cy);

      ctx.globalAlpha = touch.jump ? 1 : 0.45;
      ctx.fillStyle = touch.jump ? "#22e0e8" : "#8af";
      ctx.font = `bold ${Math.min(22, padH * 0.32)}px IBM Plex Mono, monospace`;
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
