// Suds Jack — Horizon Mesh v4
// Actual vector perspective + geometric heightfield
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

  const LANES = 9;
  const GRAVITY = 27;
  const JUMP_V = -12.4;
  const BOOST_V = -19;
  const FLOAT_DRAG = 0.25;
  const MOVE_SPEED = 7.4;
  const PLAYER_DEPTH = 0.905;
  const HIT_DEPTH = 0.84;
  const HI_KEY = "sudsJack.horizon.v4.best";

  // Perspective constants (real vector feel)
  const FAR_SCALE = 0.035;   // width scale at horizon
  const NEAR_SCALE = 1.0;    // width scale at player plane
  const ELEV_SCALE = 0.14;   // how much elevation lifts in screen space (fraction of H)

  let W = 0, H = 0, dpr = 1;
  let mode = "title";
  let score = 0, best = Number(localStorage.getItem(HI_KEY) || 0) || 0;
  let lives = 3, mult = 1, combo = 0, comboTimer = 0;
  let t = 0, last = 0, hue = 170, seed = 31;
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

  // ── audio ──────────────────────────────────────────────────
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
  function sfxJump(peak) { blip(peak ? 400 : 230, 0.11, "triangle", 0.09, peak ? 540 : 130); }
  function sfxCollect() { blip(680, 0.07, "sine", 0.07, 1020); }
  function sfxBoost() { blip(160, 0.16, "sawtooth", 0.06, 440); }
  function sfxHit() { blip(85, 0.18, "sawtooth", 0.1, 35); }
  function sfxStomp() { blip(130, 0.09, "square", 0.08, 55); }

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

  // ── TRUE VECTOR PERSPECTIVE ────────────────────────────────
  // depth ∈ [0, 1]   0 = vanishing point (far), 1 = near plane
  // scale is linear in depth (classic vector arcade feel)
  // elevation is applied in world units then projected by the same scale

  function vanish() {
    return { x: W * 0.5, y: H * 0.11 };
  }

  function perspectiveScale(depth) {
    // linear interpolation of scale → constant foreshortening rate
    // this is the classic Tempest / Star Wars vector look
    return FAR_SCALE + (NEAR_SCALE - FAR_SCALE) * depth;
  }

  function project(lane, depth, elev) {
    const v = vanish();
    const s = perspectiveScale(depth);

    // Y: linear from vanish → near floor, then elev lifts against gravity direction
    const nearY = H * 0.91;
    const baseY = v.y + (nearY - v.y) * depth;
    const elevPx = elev * H * ELEV_SCALE * s;

    // X: centered fan of lanes, width proportional to scale
    const totalW = W * 0.84 * s;
    const x = v.x + (lane - (LANES - 1) / 2) * (totalW / (LANES - 1));

    return { x, y: baseY - elevPx, s };
  }

  // ── GEOMETRIC HEIGHTFIELD (vector / angular) ───────────────
  // Instead of soft pure sines we build angular ridges + plateaus
  // so peaks read as real launch pads, not gentle hills.

  function meshHeight(lane, depth) {
    // world-space phase that marches toward the player
    const world = genPhase + depth * 7.5 + distance * 0.015;

    // primary ridge system (angular)
    const ridge = Math.abs(Math.sin(world * 0.55 + lane * 0.7));
    const sharp = Math.pow(ridge, 1.8);               // sharpens the peaks

    // secondary cross ridges
    const cross = Math.abs(Math.sin(world * 1.3 + lane * 1.6)) * 0.35;

    // occasional high plateaus (true peaks)
    const plateau = Math.sin(world * 0.22 + lane * 0.25);
    const plat = plateau > 0.72 ? (plateau - 0.72) * 2.2 : 0;

    // gentle base undulation so the floor never feels dead flat
    const base = 0.04 + 0.06 * Math.sin(world * 0.18 + lane * 0.4);

    return Math.min(0.85, base + sharp * 0.32 + cross * 0.18 + plat);
  }

  function meshPeak(lane, depth) {
    // only the highest geometric features are launchable
    return meshHeight(lane, depth) > 0.42;
  }

  function ensureSlices() {
    while (slices.length < 40) {
      const maxD = slices.length ? Math.max(...slices.map(s => s.depth)) : -0.04;
      const d = maxD + 0.034;
      const heights = [];
      const peak = [];
      for (let i = 0; i < LANES; i++) {
        const h = meshHeight(i, d);
        heights.push(h);
        peak.push(h > 0.42);
      }
      slices.push({ depth: d, heights, peak, id: nextSliceId++ });
    }
  }

  function advanceLandscape(dt) {
    const base = mode === "play"
      ? 0.195 + Math.min(0.3, distance * 0.0013)
      : 0.4;
    const speed = base * intensity * dt;
    for (const s of slices) s.depth += speed;
    slices = slices.filter(s => s.depth < 1.22);
    genPhase += dt * (0.6 + intensity * 0.18);
    ensureSlices();
    if (mode === "play") {
      distance += speed * 15;
      intensity = 1 + Math.min(1.9, distance * 0.0038);
    }
  }

  function spawnAtHorizon() {
    const r = rand();
    let kind = "orb";
    if (r > 0.52) kind = "crawler";
    else if (r > 0.76) kind = "dart";
    else if (r > 0.88) kind = "boost";
    else if (r > 0.95 && intensity > 1.25) kind = "spike";
    things.push({
      lane: Math.floor(rand() * LANES),
      depth: 0.006 + rand() * 0.04,
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
      const sp = 55 + rand() * 120;
      particles.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 45,
        life: 0.28 + rand() * 0.4,
        hue: (hue + hOff + rand() * 45) % 360,
        size: 2 + rand() * 3.2
      });
    }
  }

  function addCombo(pts) {
    combo++;
    comboTimer = 2.3;
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
      player.boostUntil = t + 0.65;
      addCombo(55);
      burst(player.lane, PLAYER_DEPTH, meshHeight(player.lane, PLAYER_DEPTH), 18, 25);
      flash = 0.28;
      if (glitch) {
        glitch.className = "flash";
        setTimeout(() => glitch.className = "", 260);
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
    spawnTimer = 0.55;
    overlay.classList.remove("show");
    updateHud();
  }

  function hurt() {
    if (player.invuln > 0) return;
    lives--;
    player.invuln = 1.5;
    shake = 15;
    combo = 0; mult = 1; comboTimer = 0;
    sfxHit();
    if (glitch) {
      glitch.className = "hard";
      setTimeout(() => glitch.className = "", 460);
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

  // ── Bomb Jack controls ─────────────────────────────────────
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
    hue = (hue + dt * (13 + intensity * 5)) % 360;
    if (shake > 0) shake *= 0.85;
    if (flash > 0) flash -= dt;
    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) { combo = 0; mult = 1; }
    }

    advanceLandscape(dt);

    if (mode === "title") {
      if (rand() < dt * 0.7) spawnAtHorizon();
      things = things.filter(th => th.alive && th.depth < 1.15);
      if (rand() < dt * 2.2) {
        const lane = Math.floor(rand() * LANES);
        burst(lane, 0.25 + rand() * 0.55, 0.12, 2, 70);
      }
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

    if (player.floating && player.vz > 0 && t < player.boostUntil + 0.75) {
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

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnAtHorizon();
      if (rand() < 0.32 + intensity * 0.12) spawnAtHorizon();
      if (rand() < intensity * 0.09) spawnAtHorizon();
      spawnTimer = Math.max(0.16, 0.68 - distance * 0.0014 - intensity * 0.045);
    }

    for (const th of things) {
      if (!th.alive) continue;
      th.phase += dt * (5.5 + intensity);
      if (th.kind === "crawler" || th.kind === "spike") {
        th.lane += Math.sin(th.phase * 0.35) * 0.45 * dt;
        th.lane = Math.max(0, Math.min(LANES - 1, th.lane));
      }
      if (th.depth > 1.16) { th.alive = false; continue; }

      if (th.depth > HIT_DEPTH && th.depth < 1.03) {
        const dist = Math.abs(th.lane - player.lane);
        if (dist < 0.48) {
          if (th.kind === "orb" || th.kind === "boost") {
            if (th.kind === "boost" && player.z < 0.45 && !player.floating) continue;
            th.alive = false;
            if (th.kind === "boost") {
              sfxBoost();
              player.vz = BOOST_V * 0.72;
              player.floating = true;
              player.boostUntil = t + 0.42;
              addCombo(220);
              burst(th.lane, th.depth, meshHeight(th.lane, th.depth) + 0.1, 20, 35);
            } else {
              sfxCollect();
              addCombo(110);
              burst(th.lane, th.depth, meshHeight(th.lane, th.depth) + 0.08, 11, 135);
            }
          } else {
            const stomp = player.vz > 2.1 && player.z > 0.38;
            if (stomp && th.kind !== "dart") {
              th.hp--;
              if (th.hp <= 0) {
                th.alive = false;
                player.vz = JUMP_V * 0.52;
                sfxStomp();
                addCombo(th.kind === "spike" ? 380 : 270);
                burst(th.lane, th.depth, meshHeight(th.lane, th.depth), 20, 0);
              }
            } else if (player.invuln <= 0 && player.z < 1.65) {
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
      p.vy += 150 * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ── render (clean vector strokes) ──────────────────────────
  function render() {
    ctx.save();
    if (shake > 0.5) {
      ctx.translate((rand() - 0.5) * shake, (rand() - 0.5) * shake);
    }

    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, W, H);

    // horizon glow
    const v = vanish();
    const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, H * 0.58);
    g.addColorStop(0, `hsla(${hue}, 95%, 50%, ${0.22 + flash * 0.45})`);
    g.addColorStop(0.4, `hsla(${(hue + 40) % 360}, 70%, 30%, 0.07)`);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // sort far → near so near lines overdraw cleanly
    const sorted = slices.slice().sort((a, b) => a.depth - b.depth);

    // 1. Lane rails (true vector lines from horizon to near)
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let lane = 0; lane < LANES; lane++) {
      ctx.beginPath();
      let started = false;
      for (const s of sorted) {
        if (s.depth < 0.008 || s.depth > 1.05) continue;
        const p = project(lane, s.depth, s.heights[lane] || 0);
        if (!started) { ctx.moveTo(p.x, p.y); started = true; }
        else ctx.lineTo(p.x, p.y);
      }
      if (started) {
        // intensity falls off slightly with depth (CRT vector feel)
        const alpha = 0.35 + 0.45 * Math.min(1, sorted[sorted.length - 1].depth);
        ctx.strokeStyle = `hsla(${(hue + lane * 9) % 360}, 100%, 58%, ${alpha})`;
        ctx.lineWidth = 1.15;
        ctx.stroke();
      }
    }

    // 2. Depth ribs (Guitar Hero frets) + peak chevrons
    for (const s of sorted) {
      if (s.depth < 0.025 || s.depth > 1.02) continue;

      // rib
      ctx.beginPath();
      for (let lane = 0; lane < LANES; lane++) {
        const p = project(lane, s.depth, s.heights[lane] || 0);
        if (lane === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      const fade = Math.min(1, s.depth * 1.7);
      ctx.strokeStyle = `hsla(${(hue + s.depth * 55) % 360}, 100%, 52%, ${0.12 + fade * 0.5})`;
      ctx.lineWidth = 0.9 + s.depth * 1.3;
      ctx.stroke();

      // geometric peak markers (sharp chevrons)
      for (let lane = 0; lane < LANES; lane++) {
        if (!s.peak[lane]) continue;
        const p = project(lane, s.depth, s.heights[lane]);
        const sz = 2.8 + s.depth * 11;
        ctx.strokeStyle = `hsla(${(hue + 42) % 360}, 100%, 78%, ${0.28 + fade * 0.62})`;
        ctx.lineWidth = 1.35;
        ctx.beginPath();
        ctx.moveTo(p.x - sz, p.y + 1);
        ctx.lineTo(p.x, p.y - sz * 1.35);
        ctx.lineTo(p.x + sz, p.y + 1);
        ctx.stroke();
      }
    }

    // 3. Entities (clean vector shapes)
    for (const th of things) {
      if (!th.alive) continue;
      const elev = meshHeight(th.lane, th.depth) + 0.06;
      const p = project(th.lane, th.depth, elev);
      const s = p.s;
      const pulse = 0.88 + 0.12 * Math.sin(th.phase);

      ctx.lineWidth = 1.6 + s * 0.6;

      if (th.kind === "orb") {
        ctx.strokeStyle = `hsl(${(hue + 120) % 360}, 100%, 72%)`;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 11 * s;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5 * s * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (th.kind === "boost") {
        ctx.strokeStyle = `hsl(${(hue + 38) % 360}, 100%, 72%)`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 9 * s);
        ctx.lineTo(p.x + 7 * s, p.y + 6 * s);
        ctx.lineTo(p.x - 7 * s, p.y + 6 * s);
        ctx.closePath();
        ctx.stroke();
      } else if (th.kind === "crawler") {
        ctx.strokeStyle = `hsl(${(hue + 8) % 360}, 100%, 58%)`;
        ctx.beginPath();
        ctx.moveTo(p.x - 7 * s, p.y);
        ctx.lineTo(p.x + 7 * s, p.y);
        ctx.moveTo(p.x, p.y - 6 * s);
        ctx.lineTo(p.x, p.y + 6 * s);
        ctx.stroke();
      } else if (th.kind === "spike") {
        ctx.strokeStyle = `hsl(${(hue + 0) % 360}, 100%, 56%)`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 10 * s);
        ctx.lineTo(p.x + 8 * s, p.y + 7 * s);
        ctx.lineTo(p.x, p.y + 3 * s);
        ctx.lineTo(p.x - 8 * s, p.y + 7 * s);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.strokeStyle = `hsl(${(hue + 180) % 360}, 100%, 66%)`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 9 * s);
        ctx.lineTo(p.x + 5.5 * s, p.y + 7 * s);
        ctx.lineTo(p.x - 5.5 * s, p.y + 7 * s);
        ctx.closePath();
        ctx.stroke();
      }
    }

    // 4. Player (vector diamond)
    if (mode === "play") {
      if (!(player.invuln > 0 && Math.floor(t * 15) % 2 === 0)) {
        const elev = meshHeight(player.lane, PLAYER_DEPTH);
        const p = project(player.lane, PLAYER_DEPTH, elev + player.z * 0.058);
        const col = `hsl(${(hue + 6) % 360}, 100%, 76%)`;
        ctx.strokeStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 18;
        ctx.lineWidth = 2.5;
        const f = player.facing;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 15);
        ctx.lineTo(p.x + 13 * f, p.y);
        ctx.lineTo(p.x, p.y + 13);
        ctx.lineTo(p.x - 13 * f, p.y);
        ctx.closePath();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x - 5.5, p.y + 13);
        ctx.lineTo(p.x - 9.5, p.y + 20);
        ctx.moveTo(p.x + 5.5, p.y + 13);
        ctx.lineTo(p.x + 9.5, p.y + 20);
        ctx.stroke();
        if (player.floating) {
          ctx.globalAlpha = 0.42;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + 14);
          ctx.lineTo(p.x - f * 8, p.y + 35);
          ctx.lineTo(p.x + f * 5.5, p.y + 30);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.shadowBlur = 0;
      }
    }

    // particles
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life * 2.5);
      ctx.fillStyle = `hsl(${p.hue}, 100%, 66%)`;
      const sz = p.size || 3;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    // multiplier
    if (mode === "play" && mult > 1) {
      ctx.font = "bold 18px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = `hsla(${(hue + 25) % 360}, 100%, 72%, ${0.45 + comboTimer * 0.22})`;
      ctx.fillText("×" + mult, W * 0.5, 46);
    }

    // touch pads
    if (mode === "play" && ("ontouchstart" in window || matchMedia("(pointer: coarse)").matches)) {
      const padH = Math.min(94, H * 0.175);
      const padY = H - padH - 14;
      const leftW = W * 0.48;
      const rightX = W * 0.52;
      const rightW = W - rightX - 12;

      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "#0a1214";
      ctx.fillRect(12, padY, leftW - 20, padH);
      ctx.fillRect(rightX, padY, rightW, padH);

      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#22e0e8";
      ctx.lineWidth = 1.5;
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
