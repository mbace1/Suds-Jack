// THE KIT for "One Stockholm" (Doodle 4): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline, on an
// October night in Sweden. One question: Doodle wants a Stockholm's worth of power — how many jobs does Sweden get?
// Stockholm from the water, its windows coming on one by one until the whole city is lit, and a thick cable along the
// quay running north out of town; in a pine clearing at the cable's end the same paper city stands lit, and on "all of
// Stockholm" it folds flat and a windowless grey box unfolds up out of the same crease (the TURN); two signs pop up in
// front of the box's fence, the seller's hand-painted 500 JOBS (OUR ESTIMATE) and Doodle's printed STILL EARLY DAYS;
// a paper map of Sweden where price tags flip up in all four price areas on "nationwide"; and the box's own appliance
// label: POWER — an arrow at the longest bar, 1 STOCKHOLM; JOBS — a red stamp, TOO EARLY TO SAY.
// Kept apart from the two earlier Doodle data-centre films on purpose: no spruce, no dusk, no hoarding, no cheque —
// Scots pines, night blue, a city that is lit. Fair on purpose (plan/films/21-one-stockholm.md): "up to", the
// seller's figure is the seller's, Doodle's "maybe hundreds" is on its sign, the price warning is conditional.
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs),
// so every hit lands on its word in every language. Everything is a pure function of the shot's local time.
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, glow, K } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.428571 };
  const at = (id, name, d = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? d : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const ease = {
    out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
    io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  };
  /** the camera's small breath on a cut and a kick on each hit */
  function punch(lt, hits = [], { open = 0.04, settle = 0.35, kick = 0.025 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  /** a damped rock for something that has just landed: each kick [time, size] sets it going again */
  const swing = (lt, kicks, idle = 0.0) => kicks.reduce((a, [t, s]) => a + (lt > t ? s * Math.exp(-(lt - t) * 3.2) * Math.sin((lt - t) * 9) : 0), idle * Math.sin(lt * 1.7));
  const JP = '"NotoSansJP-800"';

  const C = {
    sky: ['#05080f', '#070c17', '#0a111f', '#0d1628', '#111c32', '#15233d', '#1a2a48', '#203253'],
    moon: '#efe6cf', far: '#1b2333', farL: '#253046', near: '#252e40', nearL: '#33405a', nearD: '#1c2331', brick: '#3a2a2c', brickL: '#4b3638',
    copper: '#3f6b5f', copperL: '#5b8a7a', gold: '#d8b25a', win: '#ffd27a', winD: '#141a26', winF: '#f4c26a',
    water: ['#07101c', '#091424', '#0c192c'], quay: '#2c2f35', quayL: '#3d414a', quayD: '#1d1f24', cable: '#0c0c0e', cableL: '#4e535d',
    pineC: ['#13221b', '#182a21', '#0f1d17'], pineL: '#22392d', trunk: '#5a3522', trunkL: '#77462b', ground: '#0f1612', moss: '#18241b', rock: '#2d3130', rockL: '#3c4140',
    boxW: '#7d848c', boxL: '#a3a9b0', boxD: '#5a6068', vent: '#4a4f56', led: '#7cf0a0',
    post: '#5d636b', postL: '#8a9099', mesh: 'rgba(205,212,220,', ply: '#c39a5c', plyL: '#d6b277', plyD: '#9b7440', paint: '#7d1f16',
    sign: '#f3efe6', signD: '#cfc9bb', ink: '#15120f', red: '#c9342b', redL: '#e0574b',
    sea: '#0a1928', seaL: '#10243a', land: '#d8c8a8', landD: '#b9a98b', lake: '#163049', tag: '#e3a33a', tagD: '#b77d22',
    label: '#f4f0e6', bars: ['#1f9a4b', '#56b04a', '#b9cf3a', '#f2e030', '#f5b32a', '#ec6d26', '#d8302b'],
  };

  // ── the night sky: blue cut bands, a few stars, a moon low on the right ──────────────────────────────────────
  const sky = () => sheet('os_sky', (g) => {
    g.fillStyle = C.sky[0]; g.fillRect(-90, -90, W + 180, H + 180);
    C.sky.forEach((col, i) => {
      if (!i) return;
      const y0 = 40 + i * 150; g.fillStyle = col; g.beginPath(); g.moveTo(-90, H + 90);
      for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, y0 + Math.sin(x * 0.008 + i * 1.7) * 14 + Math.sin(x * 0.027 + i) * 5);
      g.lineTo(W + 90, H + 90); g.closePath(); g.fill();
    });
    const r = U.rng(17);
    for (let i = 0; i < 120; i++) { const x = r() * (W + 180) - 90, y = r() * 1000 - 60, s = r(); g.fillStyle = `rgba(243,234,210,${0.25 + s * 0.6})`; g.beginPath(); g.arc(x, y, 0.8 + s * s * 2.2, 0, TAU); g.fill(); }
  }, 10);
  /** the moon: a cream disc with its halo, live so the halo can breathe */
  function moon(c, x, y, lt, r = 46) {
    glow(c, x, y, r * 5, 'rgba(239,230,207,', 0.16 + 0.02 * Math.sin(lt * 0.8));
    c.fillStyle = C.moon; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = 'rgba(200,190,170,.35)'; for (const [dx, dy, rr] of [[-12, -8, 9], [14, 10, 7], [6, -18, 5]]) { c.beginPath(); c.arc(x + dx, y + dy, rr, 0, TAU); c.fill(); }
  }

  // ── Stockholm from the water: two rows of card, every window a live light ───────────────────────────────────
  // Coordinates are in the city's own space: x from 0 to 1400 along the shore, y up from the waterline (negative).
  const NEAR = [], FAR = [];
  /** a building: its outline (a Path2D builder), its colour, and the rectangles that hold windows */
  const bld = (list, b) => { list.push(b); return b; };
  (() => {
    // far row: Södermalm's ridge of blocks, the Katarina dome, the TV tower
    const r = U.rng(5); let x = -20;
    while (x < 1420) { const w = 60 + r() * 90, h = 120 + r() * 140; bld(FAR, { kind: 'block', x, w, h, col: C.far, win: [[x + 10, -h + 16, w - 20, h - 30]] }); x += w - 4; }
    bld(FAR, { kind: 'dome', x: 960, w: 130, h: 230, col: C.farL, win: [[970, -200, 110, 150]] });
    bld(FAR, { kind: 'needle', x: 1290, w: 34, h: 600, col: C.farL, win: [] });
    // near row, left to right: the City Hall's tower and hall, Riddarholmen's iron spire, Gamla stan's gables with
    // Storkyrkan's tower behind them, the Palace's long block, low blocks out to the east
    bld(NEAR, { kind: 'block', x: 10, w: 250, h: 190, col: C.brick, edge: C.brickL, win: [[22, -176, 226, 150]] });
    bld(NEAR, { kind: 'hall', x: 140, w: 66, h: 470, col: C.brick, edge: C.brickL, win: [[150, -440, 46, 300]] });
    bld(NEAR, { kind: 'church', x: 300, w: 140, h: 200, spire: 340, col: C.near, edge: C.nearL, win: [[312, -182, 116, 150]] });
    bld(NEAR, { kind: 'tower', x: 600, w: 48, h: 380, col: C.nearD, edge: C.nearL, win: [[608, -350, 32, 260]] });
    let gx = 452; const r2 = U.rng(9);
    while (gx < 770) { const w = 34 + r2() * 24, h = 200 + r2() * 110; bld(NEAR, { kind: r2() < 0.5 ? 'step' : 'gable', x: gx, w, h, col: [C.near, C.nearD, '#2a2f3d'][(r2() * 3) | 0], edge: C.nearL, win: [[gx + 6, -h + 14, w - 12, h - 24]] }); gx += w; }
    bld(NEAR, { kind: 'palace', x: 776, w: 300, h: 228, col: '#2e3445', edge: C.nearL, win: [[790, -206, 272, 190]] });
    const r3 = U.rng(13); let bx = 1080;
    while (bx < 1420) { const w = 70 + r3() * 70, h = 120 + r3() * 90; bld(NEAR, { kind: 'block', x: bx, w, h, col: [C.near, C.nearD][(r3() * 2) | 0], edge: C.nearL, win: [[bx + 8, -h + 14, w - 16, h - 24]] }); bx += w - 2; }
  })();
  /** a building's silhouette, into a path */
  function outline(g, b) {
    const { x, w, h } = b; g.beginPath();
    if (b.kind === 'block' || b.kind === 'palace') { g.rect(x, -h, w, h); if (b.kind === 'palace') g.rect(x - 6, -h - 10, w + 12, 12); }
    else if (b.kind === 'gable') { g.moveTo(x, 0); g.lineTo(x, -h); g.lineTo(x + w / 2, -h - w * 0.6); g.lineTo(x + w, -h); g.lineTo(x + w, 0); }
    else if (b.kind === 'step') { g.moveTo(x, 0); g.lineTo(x, -h); const s = w / 6; for (let i = 0; i < 3; i++) { g.lineTo(x + s * i, -h - 14 * (i + 1)); g.lineTo(x + s * (i + 1), -h - 14 * (i + 1)); } for (let i = 3; i < 6; i++) { g.lineTo(x + s * i, -h - 14 * (6 - i)); g.lineTo(x + s * (i + 1), -h - 14 * (6 - i)); } g.lineTo(x + w, -h); g.lineTo(x + w, 0); }
    else if (b.kind === 'tower') { g.rect(x, -h, w, h); g.moveTo(x - 4, -h); g.lineTo(x + w / 2, -h - 70); g.lineTo(x + w + 4, -h); }
    else if (b.kind === 'hall') { g.rect(x, -h, w, h); g.rect(x - 6, -h - 14, w + 12, 16); g.rect(x + 14, -h - 70, w - 28, 58); g.moveTo(x + 14, -h - 70); g.lineTo(x + w / 2, -h - 112); g.lineTo(x + w - 14, -h - 70); }
    else if (b.kind === 'church') { g.rect(x, -h, w, h); g.moveTo(x - 4, -h); g.lineTo(x + w / 2, -h - 60); g.lineTo(x + w + 4, -h); g.rect(x + w / 2 - 26, -h - 110, 52, 110); }
    else if (b.kind === 'dome') { g.rect(x, -h + 40, w, h - 40); g.moveTo(x + 6, -h + 40); g.quadraticCurveTo(x + w / 2, -h - 70, x + w - 6, -h + 40); g.rect(x + w / 2 - 10, -h - 60, 20, 40); }
    else if (b.kind === 'needle') { g.rect(x + w / 2 - 9, -h + 80, 18, h - 80); g.rect(x, -h + 50, w, 46); g.rect(x + w / 2 - 3, -h, 6, 52); }
    g.closePath();
  }
  /** Riddarholmen's openwork spire: a tall iron lattice cone over the church tower */
  function lattice(g, b, col) {
    const cx = b.x + b.w / 2, y0 = -b.h - 110, y1 = y0 - b.spire, hw = 30;
    g.fillStyle = col; g.beginPath(); g.moveTo(cx - hw, y0); g.lineTo(cx, y1); g.lineTo(cx + hw, y0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 2.5;
    for (let k = 1; k < 9; k++) { const y = lerp(y0, y1, k / 9), w = hw * (1 - k / 9); g.beginPath(); g.moveTo(cx - w, y); g.lineTo(cx + w, y); g.stroke(); }
    g.beginPath(); for (let k = 0; k < 9; k++) { const ya = lerp(y0, y1, k / 9), yb = lerp(y0, y1, (k + 1) / 9), wa = hw * (1 - k / 9), wb = hw * (1 - (k + 1) / 9); g.moveTo(cx - wa, ya); g.lineTo(cx + wb, yb); g.moveTo(cx + wa, ya); g.lineTo(cx - wb, yb); } g.stroke();
  }
  /** the windows of a row: a grid inside each building's window rects, with the time each one comes on */
  function windowsOf(list, seed, cw, ch, gapX, gapY) {
    const r = U.rng(seed), out = [];
    for (const b of list) for (const [x0, y0, w, h] of b.win) {
      const nx = Math.max(1, Math.floor(w / (cw + gapX))), ny = Math.max(1, Math.floor(h / (ch + gapY))), ox = x0 + (w - nx * (cw + gapX) + gapX) / 2;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        if (r() < 0.12) continue;
        const x = ox + i * (cw + gapX), y = y0 + 4 + j * (ch + gapY);
        out.push({ x, y, w: cw, h: ch, on: r() < 0.3 ? -1 : r(), warm: r() });
      }
    }
    return out;
  }
  const WN = windowsOf(NEAR, 21, 9, 15, 11, 15), WF = windowsOf(FAR, 33, 6, 9, 9, 12);
  /** one row of the city as a cut-out: origin at x = 0 on the waterline */
  const cityRow = (key, list, wins, edge) => sprite(key, 1480, 820, 30, 790, (g) => {
    for (const b of list) {
      g.fillStyle = b.col; outline(g, b); g.fill();
      if (b.edge) { g.fillStyle = b.edge; g.fillRect(b.x, -b.h, 3, b.h); }
      if (b.kind === 'church') lattice(g, b, b.col);
      if (b.kind === 'hall') { g.fillStyle = C.gold; for (const dx of [-12, 0, 12]) { g.beginPath(); g.arc(b.x + b.w / 2 + dx, -b.h - 122, 5, 0, TAU); g.fill(); } g.fillRect(b.x + b.w / 2 - 1.5, -b.h - 134, 3, 22); }
      if (b.kind === 'dome') { g.fillStyle = C.copper; g.beginPath(); g.moveTo(b.x + 10, -b.h + 40); g.quadraticCurveTo(b.x + b.w / 2, -b.h - 62, b.x + b.w - 10, -b.h + 40); g.closePath(); g.fill(); }
      if (b.kind === 'tower') { g.fillStyle = C.copper; g.beginPath(); g.moveTo(b.x, -b.h); g.lineTo(b.x + b.w / 2, -b.h - 66); g.lineTo(b.x + b.w, -b.h); g.closePath(); g.fill(); }
    }
    g.fillStyle = C.winD; for (const w of wins) g.fillRect(w.x, w.y, w.w, w.h);
    if (edge) { g.fillStyle = edge; g.fillRect(-30, -4, 1500, 4); }
  }, 8);
  const cityFar = () => cityRow('os_cityFar', FAR, WF);
  const cityNear = () => cityRow('os_cityNear', NEAR, WN, '#0e131c');
  /** a row's lit windows, at (x, y) and scale s; k(w) says how lit each one is (0..1) */
  function lights(c, wins, x, y, s, k, { reflect = 0, lt = 0, a = 1 } = {}) {
    c.save(); c.translate(x, y); c.scale(s, s);
    for (const w of wins) {
      const v = k(w) * a; if (v <= 0.02) continue;
      c.fillStyle = w.warm < 0.75 ? `rgba(255,210,122,${v})` : `rgba(244,226,190,${v})`; c.fillRect(w.x, w.y, w.w, w.h);
      if (reflect) {                                                       // its streak in the water, broken by the ripples
        const ry = -w.y * 0.55, len = 18 + w.h * 1.3, dx = Math.sin(lt * 2.2 + w.x * 0.09) * 3;
        c.fillStyle = `rgba(255,200,110,${0.22 * v * reflect})`; c.fillRect(w.x + dx, ry, w.w * 0.8, len * 0.45); c.fillRect(w.x - dx * 0.6, ry + len * 0.55, w.w * 0.6, len * 0.35);
      }
    }
    c.restore();
  }
  /** a soft warm haze over a lit city: brighter the more of it is lit */
  function cityGlow(c, x, y, s, lit) {
    if (lit <= 0) return;
    const gr = c.createLinearGradient(0, y - 520 * s, 0, y); gr.addColorStop(0, 'rgba(255,190,110,0)'); gr.addColorStop(1, `rgba(255,190,110,${0.13 * lit})`);
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(x, y - 520 * s, 1400 * s, 520 * s); c.restore();
  }

  // ── the water and the quay ───────────────────────────────────────────────────────────────────────────────────
  const WL = 1230;                                                            // the far shore's waterline in shot 1
  const water = () => sheet('os_water', (g) => {
    C.water.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, WL + i * 110, W + 180, H); });
    g.strokeStyle = 'rgba(160,190,230,.07)'; g.lineWidth = 2;
    for (let y = WL + 20; y < 1560; y += 26) { g.beginPath(); for (let x = -90; x < W + 90; x += 40) { const yy = y + Math.sin(x * 0.02 + y) * 3; x === -90 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); }
  }, 8);
  const QY = 1590;                                                            // the quay's kerb, the water's near edge
  /** the near quay seen from on it: a granite kerb, paving running toward us, bollards; it ends in rocks and moss */
  const quay = () => sprite('os_quay', 2500, 380, 100, 0, (g) => {
    g.fillStyle = '#26292f'; g.fillRect(-100, 0, 1720, 380);
    g.fillStyle = '#30343b'; for (let i = 0; i < 6; i++) g.fillRect(-100, 30 + i * 58, 1720, 28);           // paving courses
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3;
    for (let i = 0; i < 7; i++) { const y = 26 + i * 58, step = 110 + i * 26; for (let x = -100 + (i % 2) * step / 2; x < 1620; x += step) { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 58); g.stroke(); } }
    g.fillStyle = '#4a4f58'; g.fillRect(-100, -6, 1720, 30); g.fillStyle = '#6a707a'; g.fillRect(-100, -6, 1720, 6);       // the kerb
    g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = -100; x < 1620; x += 160) g.fillRect(x, -6, 3, 30);
    for (const x of [60, 520, 980, 1440]) { g.fillStyle = '#1a1c20'; g.beginPath(); g.roundRect(x - 20, -52, 40, 58, 12); g.fill(); g.fillStyle = '#3a3e45'; g.fillRect(x - 20, -52, 8, 50); g.fillStyle = '#1a1c20'; g.beginPath(); g.ellipse(x, -52, 26, 9, 0, 0, TAU); g.fill(); }   // bollards
    const r = U.rng(3);
    g.fillStyle = C.ground; g.beginPath(); g.moveTo(1600, 380); g.lineTo(1600, 10); for (let x = 1600; x <= 2400; x += 40) g.lineTo(x, 10 + Math.sin(x * 0.03) * 8 - 10); g.lineTo(2400, 380); g.closePath(); g.fill();
    for (let i = 0; i < 8; i++) { const x = 1560 + i * 110 + r() * 40, w = 130 + r() * 90, h = 70 + r() * 60; g.fillStyle = i % 2 ? C.rock : C.rockL; g.beginPath(); g.ellipse(x, 30 + r() * 120, w / 2, h / 2, (r() - 0.5) * 0.3, 0, TAU); g.fill(); g.fillStyle = C.moss; g.beginPath(); g.ellipse(x - 10, 20 + r() * 110, w / 3, h / 5, 0, 0, TAU); g.fill(); }
  }, 8);
  /** the first pines of the forest, where the quay ends: big, near, their crowns cut off by the frame's top */
  const edgePines = () => sprite('os_edge', 1100, 1500, 60, 1480, (g) => {
    pine(g, 120, 0, 980, 501); pine(g, 330, -20, 1120, 502); pine(g, 560, 10, 940, 503); pine(g, 800, -10, 1060, 504);
  }, 10);
  /** a heavy cable lying along the ground from x0 to x1 at height y (with a little slack), live so it can pan */
  function cable(c, x0, x1, y, { sag = 10, w = 22, seed = 1 } = {}) {
    const pts = []; for (let x = x0; x <= x1; x += 40) pts.push([x, y + Math.sin(x * 0.006 + seed) * sag + Math.sin(x * 0.019) * 3]);
    for (const [dy, col, lw] of [[7, 'rgba(0,0,0,.45)', w + 4], [0, C.cable, w], [-w * 0.22, C.cableL, 3]]) {
      c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, yy], i) => (i ? c.lineTo(x, yy + dy) : c.moveTo(x, yy + dy))); c.stroke();
    }
  }
  /** a cable in perspective through three points, wide (w0) at the first and narrow (w1) where it plugs in */
  function lead(c, [a, m, b], w0, w1) {
    const N = 24, q = (t) => [(1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * m[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * m[1] + t * t * b[1]];
    for (const [dx, dy, col, f] of [[8, 10, 'rgba(0,0,0,.5)', 1.1], [0, 0, C.cable, 1], [-0.2, -0.3, 'rgba(150,165,190,.75)', 0.14], [-0.28, -0.38, 'rgba(200,215,235,.35)', 0.06]]) {
      c.strokeStyle = col; c.lineCap = 'round';
      for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N, p0 = q(t0), p1 = q(t1), w = lerp(w0, w1, (t0 + t1) / 2);
        const ox = dx > 1 ? dx : dx * w, oy = dy > 1 ? dy : dy * w; c.lineWidth = Math.max(2, w * f); c.beginPath(); c.moveTo(p0[0] + ox, p0[1] + oy); c.lineTo(p1[0] + ox, p1[1] + oy); c.stroke(); }
    }
    c.fillStyle = '#2b2e34'; c.beginPath(); c.roundRect(b[0] - 14, b[1] - 16, 28, 24, 4); c.fill();
  }
  /** the fingerpost on the quay: TORSBODA, pointing north (right) */
  const post = () => sprite('os_post', 360, 420, 40, 410, (g) => {
    g.fillStyle = '#4a4e55'; g.fillRect(-8, -410, 16, 410); g.fillStyle = '#6a6f78'; g.fillRect(-8, -410, 5, 410);
    g.fillStyle = C.sign; g.beginPath(); g.moveTo(-30, -400); g.lineTo(250, -400); g.lineTo(300, -362); g.lineTo(250, -324); g.lineTo(-30, -324); g.closePath(); g.fill();
    g.fillStyle = C.ink; g.font = '400 50px "Anton-400"'; g.textAlign = 'left'; g.fillText('TORSBODA', -6, -343);
  }, 7);

  // ── the pine forest: Scots pines — bare trunks, crowns only at the top ──────────────────────────────────────
  function pine(g, x, y, h, seed, { crown = C.pineC, trunk = C.trunk, lit = C.pineL, sil = null } = {}) {
    const r = U.rng(seed), tw = 6 + h * 0.018;
    g.fillStyle = sil || trunk; g.beginPath(); g.moveTo(x - tw, y); g.lineTo(x - tw * 0.4, y - h); g.lineTo(x + tw * 0.4, y - h); g.lineTo(x + tw, y); g.closePath(); g.fill();
    if (!sil) { g.fillStyle = C.trunkL; g.fillRect(x - tw * 0.8, y - h * 0.7, 2, h * 0.65); }
    const n = 7 + ((r() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const cy = y - h * (0.74 + r() * 0.27), cx = x + (r() - 0.5) * h * 0.3, rw = h * (0.055 + r() * 0.06), rh = rw * (0.38 + r() * 0.18);
      if (!sil) { g.strokeStyle = trunk; g.lineWidth = 3; g.beginPath(); g.moveTo(x, cy + rh); g.lineTo(cx, cy); g.stroke(); }
      g.fillStyle = sil || crown[i % crown.length]; g.beginPath(); g.ellipse(cx, cy, rw, rh, (r() - 0.5) * 0.3, 0, TAU); g.fill();
      if (!sil) { g.fillStyle = lit; g.beginPath(); g.ellipse(cx - rw * 0.15, cy - rh * 0.35, rw * 0.7, rh * 0.42, 0, Math.PI, TAU); g.fill(); }
    }
  }
  /** a row of pines as one sheet; far rows are silhouettes */
  const pines = (key, y, h0, h1, step, seed, opts = {}) => sheet(key, (g) => {
    const r = U.rng(seed); let x = -80;
    while (x < W + 80) { pine(g, x, y + r() * 30, lerp(h0, h1, r()), seed * 31 + ((x * 7) | 0), opts); x += step * (0.6 + r() * 0.8); }
    if (opts.floor) { g.fillStyle = opts.floor; g.fillRect(-90, y + 20, W + 180, H); }
  }, 10);
  const pinesFar = () => pines('os_pinesFar', 1060, 420, 640, 70, 3, { sil: '#0b1310', floor: '#0b1310' });
  const pinesMid = () => pines('os_pinesMid', 1180, 520, 760, 150, 7, { floor: C.ground });
  /** the forest floor: moss and rocks, the near edge of the clearing */
  const ground = (key, y) => sheet(key, (g) => {
    g.fillStyle = C.ground; g.fillRect(-90, y, W + 180, H);
    const r = U.rng(y);
    for (let i = 0; i < 30; i++) { g.fillStyle = r() < 0.5 ? C.moss : '#141e17'; g.beginPath(); g.ellipse(r() * W, y + 40 + r() * (H - y), 40 + r() * 120, 10 + r() * 20, 0, 0, TAU); g.fill(); }
    for (let i = 0; i < 5; i++) { const x = r() * W, yy = y + 120 + r() * 300; g.fillStyle = C.rock; g.beginPath(); g.ellipse(x, yy, 50 + r() * 40, 24 + r() * 12, 0, Math.PI, TAU); g.fill(); g.fillStyle = C.rockL; g.beginPath(); g.ellipse(x - 10, yy - 12, 30, 9, 0, Math.PI, TAU); g.fill(); }
  }, 8);
  /** the moon's cool wash over the clearing */
  function nightWash(c) { const v = c.createRadialGradient(780, 640, 40, 780, 640, 900); v.addColorStop(0, 'rgba(170,190,230,.10)'); v.addColorStop(1, 'rgba(170,190,230,0)'); c.fillStyle = v; c.fillRect(0, 0, W, H); }

  // ── the box: grey, windowless, a few vents, two chillers on the roof, a small Doodle plate ──────────────────
  const BOX = { w: 600, h: 300 };
  const dataBox = () => sprite('os_box', 680, 420, 340, 400, (g) => {
    const { w, h } = BOX;
    g.fillStyle = C.boxD; g.fillRect(-w / 2 + 10, -h - 60, 120, 60); g.fillRect(w / 2 - 160, -h - 60, 120, 60);   // chillers
    for (const x0 of [-w / 2 + 10, w / 2 - 160]) { g.fillStyle = C.vent; g.beginPath(); g.arc(x0 + 34, -h - 34, 20, 0, TAU); g.arc(x0 + 86, -h - 34, 20, 0, TAU); g.fill(); g.fillStyle = C.boxW; g.fillRect(x0, -h - 62, 120, 6); }
    g.fillStyle = C.boxW; g.fillRect(-w / 2, -h, w, h);
    g.fillStyle = C.boxL; g.fillRect(-w / 2, -h, w, 14);
    g.fillStyle = C.boxD; g.fillRect(-w / 2, -6, w, 6); g.fillRect(w / 2 - 8, -h, 8, h);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = -w / 2 + 75; x < w / 2; x += 75) g.fillRect(x, -h + 14, 2, h - 20);      // panel seams
    g.fillStyle = C.vent; for (let i = 0; i < 5; i++) g.fillRect(-w / 2 + 40 + i * 20, -h + 40, 12, 60);                 // louvres
    g.fillStyle = '#2f3339'; g.fillRect(w / 2 - 120, -110, 70, 104); g.fillStyle = '#3c4148'; g.fillRect(w / 2 - 116, -106, 62, 96);   // a steel door
    g.fillStyle = C.sign; g.beginPath(); g.roundRect(-w / 2 + 40, -120, 170, 54, 6); g.fill();
    BDF.doodleLogo(g, -w / 2 + 125, -80, 34, { align: 'center' });
  }, 9);
  /** the box's one live thing: a small green light on the door frame, blinking */
  function led(c, x, y, s, lt) { const on = 0.5 + 0.5 * Math.sin(lt * 5); glow(c, x + (BOX.w / 2 - 140) * s, y - 120 * s, 22 * s, 'rgba(124,240,160,', 0.4 * on); c.fillStyle = `rgba(124,240,160,${0.5 + 0.5 * on})`; c.fillRect(x + (BOX.w / 2 - 143) * s, y - 123 * s, 6 * s, 6 * s); }

  /** the where/what tag in the lower corner (CW.tag's look), with a Japanese face behind the Latin one */
  function tag(c, text, lt, dd, x = 110, t0 = 0.5) {
    const y = R.SAFE_B - 66, a = clamp((lt - t0) / 0.3, 0, 1) * clamp((dd - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = `32px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }

  // ═════════ 1 · os_city: Stockholm from the water, its windows coming on; on "Stockholm's" the whole city is lit;
  //            on "jobs" the camera leaves it, following the cable along the quay, north, to a fingerpost and the pines ═════════
  const PAN = 760;
  /** when a window comes on in shot 1: those already lit, then the rest across the city, all by the pop */
  const lit1 = (w, lt, tP) => { const t = w.on < 0 ? -1 : lerp(0.25, tP - 0.06, w.on); return clamp((lt - t) / 0.08, 0, 1); };
  SCENES.os_city = { draw(c, lt) {
    const id = 'os_city', dd = dur(id), tP = at(id, 'lit', 1.2), tG = at(id, 'go', 2.8);
    const pan = PAN * ease.io((lt - tG) / (dd - tG - 0.25));
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [tP, tG], { kick: 0.022 }) * lerp(1.0, 1.03, ease.io(lt / dd)), fx: 540, fy: 1100 };
    const flash = lt > tP ? Math.exp(-(lt - tP) * 3.5) : 0, allLit = clamp((lt - 0.2) / (tP - 0.2), 0, 1);
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { d: 0.03, fn: (g, ox, oy) => moon(g, 860 + ox - pan * 0.08, 610 + oy, lt) },
      { d: 0.06, fn: (g, ox, oy) => {
        const x = -60 + ox - pan * 0.35, y = WL - 34 + oy, s = 0.78;
        put(g, cityFar(), x, y, { sc: s, lift: 0.4 });
        lights(g, WF, x, y, s, (w) => lit1(w, lt, tP) * 0.8);
      } },
      { sh: water(), d: 0.1, lift: 0 },
      { d: 0.14, fn: (g, ox, oy) => {
        const x = -70 + ox - pan * 0.55, y = WL + oy;
        cityGlow(g, x, y, 1, allLit * (1 + flash));
        put(g, cityNear(), x, y, { lift: 0.8 });
        lights(g, WN, x, y, 1, (w) => lit1(w, lt, tP), { reflect: 1, lt });
        if (flash > 0) lights(g, WN, x, y, 1, () => 1, { a: 0.5 * flash });
        // the far shore past the city, where the pines begin
        for (let i = 0; i < 9; i++) pine(g, x + 1440 + i * 70 + (i % 3) * 14, y + 6, 260 + ((i * 53) % 90), 400 + i, { sil: '#0b1310' });
      } },
      { d: 0.3, fn: (g, ox, oy) => {
        const x = ox - pan, y = QY + oy;
        put(g, quay(), x, y, { lift: 0.6 });
        put(g, post(), x + 1290, y + 70, { lift: 1.2, rot: -0.02 });
        cable(g, x - 120, x + 2300, y + 150, { sag: 10, w: 34 });
        put(g, edgePines(), x + 1520, y + 250, { lift: 1.2 });
      } }], cam);
    tag(c, ui('city', 'STOCKHOLM'), lt, Math.min(dd, tP + 1.6));
    box(c);
  } };

  // ═════════ 2 · os_fold: in a pine clearing at the cable's end the paper city stands lit; on "all of Stockholm"
  //            it folds flat and the grey box unfolds up out of the same crease (the TURN) ═════════
  const CL = { x: 540, y: 1450, s: 0.7, box: 1.15 };                                     // the clearing: where the city / box stands
  /** the city's folding pieces, left to right: x ranges in the city's own space */
  const SEG = [[-60, 270], [270, 452], [452, 600], [600, 776], [776, 1080], [1080, 1460]];
  /** when each piece folds: the ends first, the middle last, the last one flat on the pop */
  const foldAt = (i, tP) => { const order = [0, 5, 1, 4, 2, 3].indexOf(i); return tP - 0.7 + order * 0.1; };   // score.py mirrors this
  function paperCity(g, x, y, s, lt, tP, glowK = 1) {
    cityGlow(g, x, y, s, glowK * (1 - clamp((lt - tP + 0.7) / 0.6, 0, 1)));
    SEG.forEach(([a, b], i) => {
      const k = ease.io((lt - foldAt(i, tP)) / 0.3), sy = Math.cos(k * Math.PI / 2); if (sy <= 0.01) return;
      g.save(); g.beginPath(); g.rect(x + a * s, y - 900 * s, (b - a) * s, 900 * s + 4); g.clip();
      g.translate(0, y); g.scale(1, sy); g.translate(0, -y);
      put(g, cityFar(), x + 40 * s, y - 30 * s, { sc: s * 0.82, lift: 0.3 * sy });
      lights(g, WF, x + 40 * s, y - 30 * s, s * 0.82, () => 0.7 * (1 - k));
      put(g, cityNear(), x, y, { sc: s, lift: 0.9 * sy });
      lights(g, WN, x, y, s, () => 1 - k);
      g.restore();
    });
  }
  /** the box unfolding up from the crease: a pop-up card rising past upright and settling */
  function boxUp(g, x, y, s, lt, tP) {
    const k = (lt - tP + 0.2) / 0.45; if (k <= 0) return 0;
    const sy = Math.min(1.06, Math.sin(ease.back(k) * Math.PI / 2 * 0.98) + 0.02) * (1 + swing(lt, [[tP + 0.25, 0.03]]));
    g.save(); g.translate(x, y); g.scale(s, s * sy); put(g, dataBox(), 0, 0, { lift: 1.1 * clamp(k, 0, 1) }); g.restore();
    return clamp(k, 0, 1);
  }
  SCENES.os_fold = { draw(c, lt) {
    const id = 'os_fold', dd = dur(id), tP = at(id, 'fold', 2.4);
    const cam = { x: Math.sin(lt * 0.33 + 1) * 6, y: 0, z: punch(lt, [tP], { kick: 0.035 }) * lerp(1.0, 1.06, ease.io(lt / dd)), fx: 540, fy: 1180 };
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { d: 0.03, fn: (g, ox, oy) => moon(g, 820 + ox, 560 + oy, lt + 6.43, 40) },
      { sh: pinesFar(), d: 0.06, lift: 0.3 }, { sh: pinesMid(), d: 0.12, lift: 0.8 }, { sh: ground('os_ground2', 1290), d: 0.2, lift: 0.4 },
      { d: 0.28, fn: (g, ox, oy) => {
        const x = CL.x + ox, y = CL.y + oy, s = CL.s, cx = x - 700 * s;
        // the crease: a thin dark line on the ground where both cards hinge
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(cx - 20, y - 2, 1400 * s + 40, 5);
        paperCity(g, cx, y, s, lt, tP);
        const k = boxUp(g, x, y, CL.box, lt, tP);
        if (k >= 1) led(g, x, y, CL.box, lt);
        // the cable comes in from the near ground and plugs in at the foot of whatever stands there
        lead(g, [[-60 + ox, 1860 + oy], [420 + ox, 1720 + oy], [x - BOX.w * CL.box / 2 + 30, y - 6]], 50, 20);
      } }, { d: 0.28, fn: (g) => nightWash(g) }], cam);
    tag(c, ui('site', 'TORSBODA, SWEDEN · UP TO 2,000 MW'), lt, dd, 110, 0.6);
    box(c);
  } };

  // ═════════ 3 · os_jobs: the box behind its fence; the seller's sign pops up on line 1, Doodle's on "early days" ═════════
  /** the chain-link fence: posts, a top rail and a diamond mesh, one sheet */
  const fence = () => sheet('os_fence', (g) => {
    const y0 = 1060, y1 = 1440;
    g.strokeStyle = C.mesh + '.28)'; g.lineWidth = 2;
    for (let x = -300; x < W + 300; x += 28) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x + (y1 - y0), y1); g.moveTo(x, y0); g.lineTo(x - (y1 - y0), y1); g.stroke(); }
    for (let x = -40; x < W + 80; x += 220) { g.fillStyle = C.post; g.fillRect(x - 6, y0 - 20, 12, y1 - y0 + 40); g.fillStyle = C.postL; g.fillRect(x - 6, y0 - 20, 4, y1 - y0 + 40); }
    g.fillStyle = C.post; g.fillRect(-90, y0 - 8, W + 180, 8); g.fillStyle = C.postL; g.fillRect(-90, y0 - 8, W + 180, 3);
    g.strokeStyle = 'rgba(205,212,220,.35)'; g.lineWidth = 2; for (let x = -90; x < W + 90; x += 18) { g.beginPath(); g.moveTo(x, y0 - 30); g.lineTo(x + 9, y0 - 44); g.lineTo(x + 18, y0 - 30); g.stroke(); }   // the barbed top
  }, 6);
  /** the seller's sign: plywood, hand-painted, on two stakes; origin at the foot of the stakes */
  const sellSign = () => sprite('os_sell', 470, 560, 235, 548, (g) => {
    g.fillStyle = '#5b3f22'; g.fillRect(-150, -330, 18, 330); g.fillRect(132, -330, 18, 330);
    g.save(); g.rotate(-0.025);
    g.fillStyle = C.plyD; g.fillRect(-212, -540, 424, 252); g.fillStyle = C.ply; g.fillRect(-208, -544, 416, 244);
    const r = U.rng(8); g.strokeStyle = 'rgba(120,80,40,.28)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const y = -536 + r() * 228; g.beginPath(); g.moveTo(-204, y); g.bezierCurveTo(-60, y + (r() - 0.5) * 10, 60, y + (r() - 0.5) * 10, 204, y + (r() - 0.5) * 6); g.stroke(); }
    g.fillStyle = C.paint; g.textAlign = 'center';
    g.font = '700 90px "Kalam-700"'; g.fillText('500 JOBS', 0, -410);
    g.font = '700 46px "Kalam-700"'; g.fillText('(OUR ESTIMATE)', 0, -348);
    g.fillStyle = 'rgba(125,31,22,.6)'; g.fillRect(70, -400, 3, 16); g.fillRect(-120, -340, 3, 10);      // a drip or two
    g.restore();
  }, 8);
  /** Doodle's sign: a neat printed panel on one steel post */
  const doodleSign = () => sprite('os_doodle', 500, 600, 250, 590, (g) => {
    g.fillStyle = '#8a9099'; g.fillRect(-9, -330, 18, 330); g.fillStyle = '#b4bac2'; g.fillRect(-9, -330, 5, 330);
    g.fillStyle = C.signD; g.beginPath(); g.roundRect(-226, -578, 452, 262, 10); g.fill();
    g.fillStyle = C.sign; g.beginPath(); g.roundRect(-220, -584, 440, 256, 10); g.fill();
    BDF.doodleLogo(g, 0, -518, 54, { align: 'center' });
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '400 35px "ArchivoBlack-400"';
    g.fillText('MAYBE HUNDREDS.', 0, -446); g.fillText('STILL EARLY DAYS.', 0, -390);
    g.fillStyle = '#4a82e0'; g.fillRect(-220, -340, 440, 12);
  }, 8);
  /** a sign springing up from flat on the ground, like a page in a pop-up book: past upright, then a rock */
  function popUp(g, sp, x, y, lt, t0, { sc = 1, lean = 0 } = {}) {
    const k = (lt - t0 + 0.05) / 0.42; if (k <= 0) return;
    const fold = 1 - ease.back(k), sy = Math.cos(clamp(fold, -0.25, 1) * Math.PI / 2);
    g.save(); g.translate(x, y); g.rotate(lean + swing(lt, [[t0 + 0.4, 0.03]])); g.scale(sc, sc * Math.max(0.02, sy)); put(g, sp, 0, 0, { lift: 1.3 * clamp(k, 0, 1) }); g.restore();
  }
  SCENES.os_jobs = { draw(c, lt) {
    const id = 'os_jobs', dd = dur(id), tS = at(id, 'sell', 0.6), tD = at(id, 'doodle', 2.6);
    const cam = { x: Math.sin(lt * 0.3 + 2) * 6, y: 0, z: punch(lt, [tS, tD], { kick: 0.02 }) * lerp(1.0, 1.05, ease.io(lt / dd)), fx: 540, fy: 1250 };
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { d: 0.03, fn: (g, ox, oy) => moon(g, 860 + ox, 520 + oy, lt + 12.86, 38) },
      { sh: pinesFar(), d: 0.05, lift: 0.3 }, { sh: ground('os_ground3', 1230), d: 0.1, lift: 0.4 },
      { d: 0.14, fn: (g, ox, oy) => { const x = 560 + ox, y = 1240 + oy, s = 1.25; g.save(); g.translate(x, y); g.scale(s, s); put(g, dataBox(), 0, 0, { lift: 1 }); g.restore(); led(g, x, y, s, lt); } },
      { sh: fence(), d: 0.2, lift: 0.6 },
      { sh: ground('os_ground3b', 1450), d: 0.24, lift: 0.5 },
      { d: 0.3, fn: (g, ox, oy) => {
        popUp(g, sellSign(), 300 + ox, 1770 + oy, lt, tS, { sc: 1.05, lean: -0.03 });
        popUp(g, doodleSign(), 765 + ox, 1790 + oy, lt, tD, { sc: 1.0, lean: 0.015 });
      } }, { d: 0.3, fn: (g) => nightWash(g) }], cam);
    box(c);
  } };

  // ═════════ 4 · os_map: Sweden in card on a dark sea; a warning at Torsboda, a power plant drawn in dashes that is
  //            not built, and on "nationwide" a price tag flips up in every one of the four price areas ═════════
  // Sweden as (lon, lat), clockwise from the southern tip; Gotland, Öland, and Vänern and Vättern as holes
  const SWE = [[13.36, 55.34], [12.98, 55.6], [12.69, 56.05], [12.45, 56.3], [12.85, 56.67], [12.25, 57.1], [11.9, 57.7], [11.6, 58.3], [11.17, 58.94],
    [11.45, 59.1], [11.8, 59.45], [12.2, 59.9], [12.6, 60.5], [12.3, 61.0], [12.85, 61.4], [12.1, 61.75], [12.3, 62.3], [12.05, 62.9], [12.15, 63.5],
    [13.9, 64.0], [14.2, 64.6], [14.1, 65.2], [15.0, 65.9], [15.6, 66.4], [16.2, 67.0], [16.7, 67.6], [17.9, 68.1], [18.4, 68.55], [19.9, 68.4], [20.55, 69.06],
    [21.4, 68.7], [22.5, 68.44], [23.0, 68.0], [23.37, 67.21], [23.65, 66.39], [24.15, 65.83], [22.9, 65.75], [22.15, 65.58], [21.48, 65.32], [21.3, 64.95],
    [21.0, 64.75], [20.5, 64.1], [20.26, 63.82], [19.5, 63.5], [18.72, 63.29], [17.94, 62.63], [17.31, 62.39], [17.4, 62.0], [17.1, 61.73], [17.06, 61.3],
    [17.15, 60.67], [17.8, 60.6], [18.44, 60.34], [18.7, 59.76], [18.9, 59.4], [18.5, 59.1], [17.95, 58.9], [16.9, 58.6], [16.7, 58.2], [16.64, 57.76],
    [16.45, 57.26], [16.36, 56.66], [15.9, 56.2], [15.59, 56.16], [14.58, 56.05], [14.28, 55.93], [14.35, 55.56], [13.82, 55.43]];
  const GOT = [[18.15, 56.92], [18.55, 57.25], [18.85, 57.45], [19.2, 57.95], [18.75, 57.85], [18.35, 57.6], [18.1, 57.45], [18.25, 57.2]];
  const OLA = [[16.45, 56.2], [16.75, 56.7], [17.1, 57.33], [16.95, 57.3], [16.55, 56.75], [16.38, 56.25]];
  const MP = { cx: 600, top: 520, k: 72, lon0: 17.3, lat0: 69.3 };
  const proj = ([lon, lat]) => [MP.cx + (lon - MP.lon0) * MP.k * Math.cos(62 * Math.PI / 180), MP.top + (MP.lat0 - lat) * MP.k];
  const shape = (pts) => U.poly(pts.map(proj));
  const ZONES = [[[11, 65.4], [25, 65.0]], [[11, 61.6], [25, 60.6]], [[11, 57.3], [25, 57.0]]];   // SE1|SE2, SE2|SE3, SE3|SE4
  const ZLAB = [['SE1', [19.6, 67.2]], ['SE2', [15.6, 63.4]], ['SE3', [14.8, 59.9]], ['SE4', [13.9, 56.45]]];
  const TAGS = [[20.6, 66.5], [14.7, 63.9], [14.2, 60.4], [14.1, 56.05]];
  const TORS = [17.45, 62.52], STHLM = [18.07, 59.33];
  const map = () => sheet('os_map', (g) => {
    g.fillStyle = C.sea; g.fillRect(-90, -90, W + 180, H + 180);
    g.strokeStyle = 'rgba(160,190,230,.06)'; g.lineWidth = 2; for (let y = 0; y < H; y += 34) { g.beginPath(); for (let x = -90; x < W + 90; x += 40) { const yy = y + Math.sin(x * 0.015 + y * 0.3) * 4; x === -90 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); }
    for (const P of [shape(SWE), shape(GOT), shape(OLA)]) { g.fillStyle = C.land; g.fill(P); }
    g.fillStyle = C.lake;
    for (const [lon, lat, rx, ry, rot] of [[13.25, 58.9, 0.75, 0.38, -0.5], [14.55, 58.3, 0.16, 0.5, 0.15]]) { const [x, y] = proj([lon, lat]); g.beginPath(); g.ellipse(x, y, rx * MP.k * 0.47, ry * MP.k, rot, 0, TAU); g.fill(); }
    // the price areas: dashed borders inside the land, and their names
    g.save(); g.clip(shape(SWE)); g.strokeStyle = 'rgba(21,18,15,.55)'; g.lineWidth = 3; g.setLineDash([12, 9]);
    for (const [a, b] of ZONES) { const [x0, y0] = proj(a), [x1, y1] = proj(b); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    g.restore();
    g.fillStyle = 'rgba(21,18,15,.6)'; g.font = '400 30px "Anton-400"'; g.textAlign = 'center';
    for (const [t, p] of ZLAB) { const [x, y] = proj(p); g.fillText(t, x, y); }
    // Stockholm, lit; Torsboda, a grey box
    const [sx, sy] = proj(STHLM); g.fillStyle = C.ink; g.font = '400 22px "ArchivoBlack-400"'; g.textAlign = 'right'; g.fillText('STOCKHOLM', sx - 16, sy + 8);
    const [tx, ty] = proj(TORS); g.fillStyle = C.boxD; g.fillRect(tx - 15, ty - 11, 30, 20); g.fillStyle = C.boxW; g.fillRect(tx - 14, ty - 12, 28, 18);
    g.fillStyle = C.ink; g.textAlign = 'right'; g.fillText('TORSBODA', tx - 22, ty + 8);
  }, 14);
  /** the price tag: ochre card on a string, 'kr' and an arrow up; origin at the top of its string */
  const priceTag = () => sprite('os_kr', 160, 150, 80, 4, (g) => {
    g.strokeStyle = '#ece2c6'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.stroke();
    g.fillStyle = C.tag; g.beginPath(); g.moveTo(-40, 26); g.lineTo(40, 26); g.lineTo(60, 42); g.lineTo(60, 112); g.lineTo(-60, 112); g.lineTo(-60, 42); g.closePath(); g.fill();
    g.fillStyle = C.tagD; g.fillRect(-60, 104, 120, 8);
    g.fillStyle = '#ece2c6'; g.beginPath(); g.arc(0, 40, 7, 0, TAU); g.fill();
    g.fillStyle = C.ink; g.font = '400 46px "Anton-400"'; g.textAlign = 'left'; g.fillText('kr', -46, 98);
    g.beginPath(); g.moveTo(26, 56); g.lineTo(46, 80); g.lineTo(33, 80); g.lineTo(33, 102); g.lineTo(19, 102); g.lineTo(19, 80); g.lineTo(6, 80); g.closePath(); g.fill();
  }, 6);
  /** the warning: a red triangle with an exclamation mark */
  const warnSign = () => sprite('os_warn', 120, 110, 60, 104, (g) => {
    g.fillStyle = C.red; g.beginPath(); g.moveTo(0, -100); g.lineTo(56, 0); g.lineTo(-56, 0); g.closePath(); g.fill();
    g.fillStyle = C.sign; g.beginPath(); g.moveTo(0, -78); g.lineTo(40, -10); g.lineTo(-40, -10); g.closePath(); g.fill();
    g.fillStyle = C.ink; g.fillRect(-5, -62, 10, 32); g.fillRect(-5, -24, 10, 9);
  }, 6);
  /** the power plant that is not there: a wind turbine drawn in dashes, revealed along its strokes over k */
  function ghostTurbine(g, x, y, s, k, lt) {
    if (k <= 0) return; const L = [[0, 0, 0, -150], [0, -150, -70, -190], [0, -150, 66, -196], [0, -150, 4, -70]];
    g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = 'rgba(236,226,198,.9)'; g.lineWidth = 5; g.lineCap = 'round'; g.setLineDash([12, 10]); g.lineDashOffset = -lt * 20;
    const tot = L.length; L.forEach(([a, b, c2, d], i) => { const kk = clamp(k * tot - i, 0, 1); if (kk <= 0) return; g.beginPath(); g.moveTo(a, b); g.lineTo(lerp(a, c2, kk), lerp(b, d, kk)); g.stroke(); });
    g.setLineDash([]); g.font = '400 26px "ArchivoBlack-400"'; g.fillStyle = `rgba(236,226,198,${clamp(k * 2 - 1, 0, 1)})`; g.textAlign = 'left'; g.fillText('?', 18, -96);
    g.restore();
  }
  SCENES.os_map = { draw(c, lt) {
    const id = 'os_map', dd = dur(id), tW = at(id, 'warn', 0.9), tB = at(id, 'built', 1.4), tN = at(id, 'nation', 2.8);
    const cam = { x: Math.sin(lt * 0.3 + 3) * 5, y: 0, z: punch(lt, [tW, tN], { kick: 0.02 }) * lerp(1.0, 1.05, ease.io(lt / dd)), fx: 600, fy: 1000 };
    const [tx, ty] = proj(TORS), [sx, sy] = proj(STHLM);
    stack(c, [{ sh: map(), d: 0.05, lift: 1.2, soft: 0 }, { d: 0.05, fn: (g, ox, oy) => {
      glow(g, sx + ox, sy + oy, 40, 'rgba(255,210,122,', 0.5 + 0.1 * Math.sin(lt * 3)); g.fillStyle = C.win; g.beginPath(); g.arc(sx + ox, sy + oy, 7, 0, TAU); g.fill();
      const kw = (lt - tW + 0.05) / 0.3; if (kw > 0) put(g, warnSign(), tx + 40 + ox, ty - 14 + oy, { sc: 0.62 * ease.back(kw), lift: 0.8, rot: swing(lt, [[tW + 0.25, 0.08]]) });
      ghostTurbine(g, tx + 150 + ox, ty + 130 + oy, 0.95, (lt - tB) / 0.8, lt);
      TAGS.forEach((p, i) => {
        const t0 = tN - 0.06 + i * 0.12, k = (lt - t0) / 0.3; if (k <= 0) return;
        const [x, y] = proj(p); put(g, priceTag(), x + ox, y - 40 + oy, { sc: 0.82 * ease.back(k), lift: 0.9, rot: swing(lt, [[t0 + 0.25, 0.18]]) });
      });
    } }], cam);
    tag(c, ui('grid', 'GRID OPERATOR: SVENSKA KRAFTNÄT'), lt, dd, 110, 0.6);
    box(c);
  } };

  // ═════════ 5 · os_end: the box's own appliance label. POWER: an arrow slides to the longest bar, 1 STOCKHOLM.
  //            JOBS: on "too early to say" a red stamp comes down across the empty field ═════════
  const LB = { w: 640, h: 900 };
  const label = () => sprite('os_label', 700, 960, 350, 480, (g) => {
    const { w, h } = LB, x0 = -w / 2, y0 = -h / 2;
    g.fillStyle = C.label; g.beginPath(); g.roundRect(x0, y0, w, h, 16); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 6; g.beginPath(); g.roundRect(x0 + 10, y0 + 10, w - 20, h - 20, 12); g.stroke();
    // header: the wordmark and what this is
    BDF.doodleLogo(g, x0 + 40, y0 + 100, 66);
    g.fillStyle = C.ink; g.textAlign = 'right'; g.font = '400 30px "ArchivoBlack-400"'; g.fillText('DATA CENTRE', x0 + w - 40, y0 + 72); g.font = '400 22px "ArchivoBlack-400"'; g.fillText('TORSBODA, SWEDEN', x0 + w - 40, y0 + 104);
    g.fillRect(x0 + 24, y0 + 132, w - 48, 5);
    // POWER: seven bars, short to long, green to red — the shape every appliance label has
    g.textAlign = 'left'; g.font = '400 54px "Anton-400"'; g.fillText('POWER', x0 + 40, y0 + 208);
    C.bars.forEach((col, i) => { const y = y0 + 236 + i * 50, len = 100 + i * 30; g.fillStyle = col; g.beginPath(); g.moveTo(x0 + 40, y); g.lineTo(x0 + 40 + len, y); g.lineTo(x0 + 40 + len + 22, y + 21); g.lineTo(x0 + 40 + len, y + 42); g.lineTo(x0 + 40, y + 42); g.closePath(); g.fill(); });
    g.fillStyle = C.ink; g.fillRect(x0 + 24, y0 + 600, w - 48, 5);
    // JOBS: an empty field
    g.font = '400 54px "Anton-400"'; g.fillText('JOBS', x0 + 40, y0 + 676);
    g.strokeStyle = 'rgba(21,18,15,.5)'; g.lineWidth = 4; g.setLineDash([16, 12]); g.strokeRect(x0 + 40, y0 + 700, w - 80, 150); g.setLineDash([]);
  }, 9);
  const BAR_END = (i) => [-LB.w / 2 + 40 + 100 + i * 30 + 26, -LB.h / 2 + 236 + i * 50 + 21];
  /** the class arrow: black, pointing left, 1 STOCKHOLM on it, with a little lit skyline */
  const arrow = () => sprite('os_arrow', 280, 90, 0, 45, (g) => {
    g.fillStyle = C.ink; g.beginPath(); g.moveTo(0, 0); g.lineTo(30, -40); g.lineTo(266, -40); g.lineTo(266, 40); g.lineTo(30, 40); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.font = '400 40px "Anton-400"'; g.textAlign = 'left'; g.fillText('1 STOCKHOLM', 40, 15);
  }, 6);
  /** the stamp: red ink, two lines, a worn double border */
  const stamp = () => sprite('os_stamp', 560, 200, 280, 100, (g) => {
    g.strokeStyle = C.red; g.lineWidth = 9; g.beginPath(); g.roundRect(-260, -86, 520, 172, 12); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.roundRect(-246, -72, 492, 144, 8); g.stroke();
    g.fillStyle = C.red; g.textAlign = 'center'; g.font = '400 64px "Anton-400"'; g.fillText('TOO EARLY', 0, -6); g.fillText('TO SAY', 0, 62);
    g.save(); g.globalCompositeOperation = 'destination-out'; const r = U.rng(4); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; g.fillRect(-270 + r() * 540, -96 + r() * 192, 2 + r() * 5, 1 + r() * 3); } g.restore();
  }, 4);
  SCENES.os_end = { draw(c, lt) {
    const id = 'os_end', dd = dur(id), tA = at(id, 'power', 0.5), tJ = at(id, 'jobs', 1.9);
    const L = { x: 540, y: 1100, rot: -0.02 };
    const cam = { x: Math.sin(lt * 0.3) * 5, y: 0, z: punch(lt, [tA + 0.3, tJ], { kick: 0.03 }) * lerp(1.0, 1.05, ease.io(lt / dd)), fx: 540, fy: 1150 };
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { sh: pinesFar(), d: 0.04, lift: 0.2 },
      { d: 0.1, fn: (g, ox, oy) => {
        // the box's wall, filling the lower frame: its grey card, seams, the roof edge
        g.fillStyle = C.boxD; g.fillRect(-60 + ox, 520 + oy, W + 120, 30); g.fillStyle = C.boxL; g.fillRect(-60 + ox, 548 + oy, W + 120, 16);
        g.fillStyle = C.boxW; g.fillRect(-60 + ox, 564 + oy, W + 120, H);
        g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = -60; x < W + 60; x += 180) g.fillRect(x + ox, 564 + oy, 3, H);
      } },
      { d: 0.16, fn: (g, ox, oy) => {
        const x = L.x + ox, y = L.y + oy;
        put(g, label(), x, y, { rot: L.rot, lift: 0.6 });
        g.save(); g.translate(x, y); g.rotate(L.rot);
        const [ex, ey] = BAR_END(6), k = ease.out((lt - tA) / 0.32);
        if (lt > tA - 0.05) put(g, arrow(), lerp(ex + 520, ex + 6, k) + swing(lt, [[tA + 0.32, 6]]), ey, { lift: 0.5 + 0.6 * (1 - k) });
        const ks = (lt - tJ + 0.02) / 0.16;
        if (ks > 0) { const sc = lerp(1.7, 1, ease.out(ks)); g.save(); g.globalAlpha = clamp(ks * 1.5, 0, 1); put(g, stamp(), 0, LB.h / 2 - 125, { sc, rot: -0.09, lift: 1.4 * (1 - clamp(ks, 0, 1)) }); g.restore(); }
        g.restore();
      } }, { d: 0.16, fn: (g) => nightWash(g) }], cam);
    box(c);
  } };

  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // THE VIRAL CUT (papercut/one-stockholm-viral, plan/films/21b-one-stockholm-viral.md). Owner, 23 Oct: viral cuts of
  // the Doodle films, "test other 2 as well and rest after". The same map, the same helpers; five short shots at the
  // Doodle tempo. Frame 0 IS the hook: the lit paper Stockholm in the pines over a label strip (Doodle DATA CENTRE ·
  // SWEDEN, UP TO 2,000 MW ≈ ALL OF STOCKHOLM), already starting to fold; on "power" it is flat and the grey box has
  // come up out of the crease. Then the real skyline lit end to end in one sweep, the two job signs, the price tags,
  // and the box's own label; on "back" the label drops away, the box folds down and the city stands up lit again,
  // exactly as frame 0 has it, so a replay reads as one more turn of the same thing. v1's scenes above are untouched.
  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  const V = { z0: 1.03, fx: 540, fy: 1150 };                  // frame 0's camera, and the last frame's
  /** a viral-cut camera: a drift that is 0 at both ends of the shot, a zoom path, and kicks on the hits */
  const vcam = (lt, dd, { z = () => 1, hits = [], kick = 0.03, amp = 4, fx = V.fx, fy = V.fy } = {}) => {
    let zz = z(lt); for (const h of hits) if (lt >= h) zz += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    const e = Math.sin(Math.PI * clamp(lt / dd, 0, 1));
    return { x: Math.sin(lt * 2.1) * amp * e, y: Math.cos(lt * 1.7 + 1.2) * amp * 0.8 * e, z: zz, fx, fy };
  };
  const ST = { x: 540, y: 1300, s: 0.66, box: 1.1 };           // the stand in the clearing: higher than v1's, clear of the strip
  const ORDER = [0, 5, 1, 4, 2, 3];                            // the hook folds the ends first, the middle last…
  const RORDER = [3, 2, 4, 1, 5, 0];                           // …and the loop stands the middle up first, the ends last
  const FOLD = { lead: 0.5, step: 0.06, len: 0.26 };           // score.py mirrors both of these
  const UNFOLD = { at: 0.22, step: 0.05, len: 0.26 };
  /** the paper city with each piece folded by kOf(i), 0 standing and lit to 1 flat and dark */
  function cityK(g, x, y, s, kOf, glowK = 1) {
    cityGlow(g, x, y, s, glowK);
    SEG.forEach(([a, b], i) => {
      const k = clamp(kOf(i), 0, 1), sy = Math.cos(k * Math.PI / 2); if (sy <= 0.01) return;
      g.save(); g.beginPath(); g.rect(x + a * s, y - 900 * s, (b - a) * s, 900 * s + 4); g.clip();
      g.translate(0, y); g.scale(1, sy); g.translate(0, -y);
      put(g, cityFar(), x + 40 * s, y - 30 * s, { sc: s * 0.82, lift: 0.3 * sy });
      lights(g, WF, x + 40 * s, y - 30 * s, s * 0.82, () => 0.7 * (1 - k));
      put(g, cityNear(), x, y, { sc: s, lift: 0.9 * sy });
      lights(g, WN, x, y, s, () => 1 - k);
      g.restore();
    });
  }
  /** how far up the box stands, k from 0 (flat) through a little overshoot to 1 */
  const boxSy = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : Math.min(1.08, 0.02 + 0.98 * ease.back(k)));
  /** the clearing at the cable's end, with the city and the box in whatever state they are in */
  function clearing(c, lt, cam, { kOf, sy = 0, glowK = 1, ledOn = false, moonT = lt }) {
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { d: 0.03, fn: (g, ox, oy) => moon(g, 820 + ox, 560 + oy, moonT, 40) },
      { sh: pinesFar(), d: 0.06, lift: 0.3 }, { sh: pinesMid(), d: 0.12, lift: 0.8 }, { sh: ground('os_ground2', 1290), d: 0.2, lift: 0.4 },
      { d: 0.28, fn: (g, ox, oy) => {
        const x = ST.x + ox, y = ST.y + oy, s = ST.s, cx = x - 700 * s;
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(cx - 20, y - 2, 1400 * s + 40, 5);          // the crease both cards hinge on
        cityK(g, cx, y, s, kOf, glowK);
        if (sy > 0.01) { g.save(); g.translate(x, y); g.scale(ST.box, ST.box * sy); put(g, dataBox(), 0, 0, { lift: 1.1 * clamp(sy, 0, 1) }); g.restore(); }
        if (ledOn) led(g, x, y, ST.box, lt);
        lead(g, [[-60 + ox, 1800 + oy], [400 + ox, 1600 + oy], [x - BOX.w * ST.box / 2 + 30, y - 6]], 50, 20);
      } }, { d: 0.28, fn: (g) => nightWash(g) }], cam);
  }
  /** the strip on frame 0 (and on the last frame, in the same place): a slice of the box's appliance label —
   *  Doodle DATA CENTRE · SWEDEN, then UP TO over the number and ≈ ALL OF STOCKHOLM beside it, fitted to the card */
  function bigTag(c, { k = 1, a = 1, dy = 0 } = {}) {
    if (a <= 0) return;
    const x = 130, y = 1356 + dy, w = 780, h = 262, sc = 1 + 0.05 * (1 - ease.out(k));
    c.save(); c.globalAlpha = a; c.translate(x + w / 2, y + h / 2); c.rotate(-0.02); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 18; c.shadowOffsetX = 9; c.shadowOffsetY = 13;
    c.fillStyle = C.label; c.beginPath(); c.roundRect(0, 0, w, h, 14); c.fill(); c.shadowColor = 'transparent';
    c.strokeStyle = C.ink; c.lineWidth = 5; c.beginPath(); c.roundRect(10, 10, w - 20, h - 20, 10); c.stroke();
    BDF.doodleLogo(c, 32, 64, 42);
    c.fillStyle = C.ink; c.textAlign = 'right'; c.font = `27px "ArchivoBlack-400", ${JP}`; c.fillText(ui('tagHead', 'DATA CENTRE · SWEDEN'), w - 32, 58);
    c.fillRect(24, 82, w - 48, 4);
    // ≈ ALL OF / STOCKHOLM on the right, in a black class arrow pointing at the number
    const a1 = ui('approx1', '≈ ALL OF'), a2 = ui('approx2', 'STOCKHOLM');
    c.font = `34px "ArchivoBlack-400", ${JP}`; const aw = Math.max(c.measureText(a1).width, c.measureText(a2).width) + 40, ax = w - 26 - aw, ay = 112;
    c.beginPath(); c.moveTo(ax - 34, ay + 58); c.lineTo(ax, ay); c.lineTo(ax + aw, ay); c.lineTo(ax + aw, ay + 116); c.lineTo(ax, ay + 116); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText(a1, ax + 18, ay + 48); c.fillText(a2, ax + 18, ay + 96);
    // UP TO, small, over the number; the number as big as the room left of the arrow allows
    c.fillStyle = C.ink; c.font = `400 40px "Anton-400", ${JP}`; c.fillText(ui('upTo', 'UP TO'), 30, 128);
    const val = ui('mw', '2,000 MW'), room = ax - 34 - 30 - 22; c.font = '400 128px "Anton-400"'; const vw = c.measureText(val).width;
    c.font = `400 ${Math.min(128, Math.floor(128 * room / vw))}px "Anton-400"`; c.fillText(val, 28, 236);
    c.restore();
  }

  // ═════════ V1 · osv_hook: frame 0 — the paper Stockholm stands lit in the clearing over the strip; the ends are
  //            already folding by a quarter second, it is flat on "power", and the grey box comes up out of the crease ═════════
  SCENES.osv_hook = { draw(c, lt) {
    const id = 'osv_hook', dd = dur(id), tP = at(id, 'pop', 0.75);
    const cam = vcam(lt, dd, { z: (l) => 1 + 0.03 * (1 - ease.out(l / 0.4)) + 0.03 * ease.io((l - tP - 0.2) / (dd - tP - 0.2)), hits: [tP], kick: 0.035 });
    const kOf = (i) => ease.io((lt - (tP - FOLD.lead + ORDER.indexOf(i) * FOLD.step)) / FOLD.len);
    const kb = (lt - tP + 0.2) / 0.38;
    clearing(c, lt, cam, { kOf, sy: boxSy(kb) * (1 + swing(lt, [[tP + 0.18, 0.03]])), glowK: 1 - clamp((lt - tP + FOLD.lead) / 0.5, 0, 1), ledOn: kb >= 1 });
    // on "power" the clearing flashes once, so the hit lands in the picture too
    if (lt > tP) { const f = Math.exp(-(lt - tP) * 6) * 0.2; c.fillStyle = `rgba(255,236,190,${f})`; c.fillRect(0, 0, W, H); }
    bigTag(c, { k: lt / 0.25 });
    box(c);
  } };

  // ═════════ V2 · osv_city: Stockholm from the water, its windows coming on in one sweep, left to right, the last
  //            ones on "all of Stockholm", the whole city flashing once ═════════
  const SWEEP = 0.15;                                          // when the sweep starts; score.py mirrors this
  SCENES.osv_city = { draw(c, lt) {
    const id = 'osv_city', dd = dur(id), tP = at(id, 'pop', 1.0);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.07, 1.01, ease.io(l / dd)), hits: [tP], kick: 0.04, fy: 1100 });
    const flash = lt > tP ? Math.exp(-(lt - tP) * 3.5) : 0, allLit = 0.3 + 0.7 * clamp((lt - SWEEP) / (tP - SWEEP), 0, 1);
    const k = (w) => { const t = w.on < 0 ? -1 : lerp(SWEEP, tP - 0.04, clamp((w.x + 20) / 1440, 0, 1)); return clamp((lt - t) / 0.08, 0, 1); };
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { d: 0.03, fn: (g, ox, oy) => moon(g, 860 + ox, 610 + oy, lt) },
      { d: 0.06, fn: (g, ox, oy) => { const x = -60 + ox, y = WL - 34 + oy, s = 0.78; put(g, cityFar(), x, y, { sc: s, lift: 0.4 }); lights(g, WF, x, y, s, (w) => k(w) * 0.8); } },
      { sh: water(), d: 0.1, lift: 0 },
      { d: 0.14, fn: (g, ox, oy) => {
        const x = -70 + ox, y = WL + oy;
        cityGlow(g, x, y, 1, allLit * (1 + flash));
        put(g, cityNear(), x, y, { lift: 0.8 });
        lights(g, WN, x, y, 1, k, { reflect: 1, lt });
        if (flash > 0) lights(g, WN, x, y, 1, () => 1, { a: 0.5 * flash });
      } },
      { d: 0.3, fn: (g, ox, oy) => { const x = ox, y = QY + oy; put(g, quay(), x, y, { lift: 0.6 }); cable(g, x - 120, x + 1300, y + 150, { sag: 10, w: 34 }); } }], cam);
    tag(c, ui('city', 'STOCKHOLM'), lt, dd, 110, 0.35);
    box(c);
  } };

  // ═════════ V3 · osv_jobs: the box behind its fence; the seller's sign comes up on "500", Doodle's on its pop.
  //            Both signs sit left of the right-hand rail ═════════
  SCENES.osv_jobs = { draw(c, lt) {
    const id = 'osv_jobs', dd = dur(id), tS = at(id, 'sell', 0.6), tD = at(id, 'doodle', 1.6);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.02, 1.07, ease.io(l / dd)), hits: [tS, tD], kick: 0.03, fy: 1250 });
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { d: 0.03, fn: (g, ox, oy) => moon(g, 860 + ox, 520 + oy, lt + 12.86, 38) },
      { sh: pinesFar(), d: 0.05, lift: 0.3 }, { sh: ground('os_ground3', 1230), d: 0.1, lift: 0.4 },
      { d: 0.14, fn: (g, ox, oy) => { const x = 540 + ox, y = 1240 + oy, s = 1.2; g.save(); g.translate(x, y); g.scale(s, s); put(g, dataBox(), 0, 0, { lift: 1 }); g.restore(); led(g, x, y, s, lt); } },
      { sh: fence(), d: 0.2, lift: 0.6 },
      { sh: ground('os_ground3b', 1450), d: 0.24, lift: 0.5 },
      { d: 0.3, fn: (g, ox, oy) => {
        popUp(g, sellSign(), 285 + ox, 1770 + oy, lt, tS, { sc: 1.0, lean: -0.03 });
        popUp(g, doodleSign(), 712 + ox, 1790 + oy, lt, tD, { sc: 0.92, lean: 0.015 });
      } }, { d: 0.3, fn: (g) => nightWash(g) }], cam);
    box(c);
  } };

  // ═════════ V4 · osv_map: v1's map, faster — the warning on the grid operator's name, the turbine that is not
  //            built drawn on the condition, and the four price tags on "nationwide" ═════════
  SCENES.osv_map = { draw(c, lt) {
    const id = 'osv_map', dd = dur(id), tW = at(id, 'warn', 0.6), tB = at(id, 'built', 1.0), tN = at(id, 'nation', 2.2);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.0, 1.06, ease.io(l / dd)), hits: [tW, tN], kick: 0.03, fx: 600, fy: 1000 });
    const [tx, ty] = proj(TORS), [sx, sy] = proj(STHLM);
    stack(c, [{ sh: map(), d: 0.05, lift: 1.2, soft: 0 }, { d: 0.05, fn: (g, ox, oy) => {
      glow(g, sx + ox, sy + oy, 40, 'rgba(255,210,122,', 0.5 + 0.1 * Math.sin(lt * 3)); g.fillStyle = C.win; g.beginPath(); g.arc(sx + ox, sy + oy, 7, 0, TAU); g.fill();
      const kw = (lt - tW + 0.05) / 0.3; if (kw > 0) put(g, warnSign(), tx + 40 + ox, ty - 14 + oy, { sc: 0.62 * ease.back(kw), lift: 0.8, rot: swing(lt, [[tW + 0.25, 0.08]]) });
      ghostTurbine(g, tx + 150 + ox, ty + 130 + oy, 0.95, (lt - tB) / 0.7, lt);
      TAGS.forEach((p, i) => {
        const t0 = tN - 0.06 + i * 0.12, k = (lt - t0) / 0.3; if (k <= 0) return;
        const [x, y] = proj(p); put(g, priceTag(), x + ox, y - 40 + oy, { sc: 0.82 * ease.back(k), lift: 0.9, rot: swing(lt, [[t0 + 0.25, 0.18]]) });
      });
    } }], cam);
    tag(c, ui('grid', 'GRID OPERATOR: SVENSKA KRAFTNÄT'), lt, dd, 110, 0.35);
    box(c);
  } };

  // ═════════ V5 · osv_end: the box's appliance label slams in over the clearing; the arrow to 1 STOCKHOLM, the stamp
  //            on "too early to say"; on "back" the label drops away, the box folds down, the city stands up lit and
  //            the strip comes back up: the last frame is frame 0 ═════════
  SCENES.osv_end = { draw(c, lt) {
    const id = 'osv_end', dd = dur(id), tA = at(id, 'power', 0.3), tJ = at(id, 'jobs', 1.1), tB = at(id, 'back', dd - 0.85);
    const zIn = lerp(1.08, 1.12, ease.io(lt / tB)), zOut = lerp(zIn, V.z0, ease.io((lt - tB) / (dd - tB)));
    const cam = vcam(lt, dd, { z: () => (lt < tB ? zIn : zOut), hits: [tA + 0.3, tJ], kick: 0.03 });
    if (lt >= dd - 1 / 60) { cam.x = 0; cam.y = 0; cam.z = V.z0; }
    const kOf = (i) => 1 - ease.io((lt - (tB + UNFOLD.at + RORDER.indexOf(i) * UNFOLD.step)) / UNFOLD.len);
    clearing(c, lt, cam, { kOf, sy: 1 - ease.io((lt - tB - 0.05) / 0.22), glowK: clamp((lt - tB - 0.45) / 0.3, 0, 1), ledOn: lt < tB, moonT: lt - dd });
    // the label: slams in on the cut, then on "back" it drops out of the frame under its own weight
    const kL = (lt + 0.02) / 0.2, kd = clamp((lt - tB) / 0.45, 0, 1), L = { x: 540, y: 900 + 1500 * kd * kd, rot: -0.02 + 0.25 * kd * kd, sc: lerp(1.3, 0.92, ease.out(kL)) };
    if (kd < 1) {
      put(c, label(), L.x, L.y, { rot: L.rot, sc: L.sc, lift: 0.6 + 0.8 * (1 - ease.out(kL)) });
      c.save(); c.translate(L.x, L.y); c.rotate(L.rot); c.scale(L.sc, L.sc);
      const [ex, ey] = BAR_END(6), k = ease.out((lt - tA) / 0.32);
      if (lt > tA - 0.05) put(c, arrow(), lerp(ex + 520, ex + 6, k) + swing(lt, [[tA + 0.32, 6]]), ey, { lift: 0.5 + 0.6 * (1 - k) });
      const ks = (lt - tJ + 0.02) / 0.16;
      if (ks > 0) { const sc = lerp(1.7, 1, ease.out(ks)); c.save(); c.globalAlpha = clamp(ks * 1.5, 0, 1); put(c, stamp(), 0, LB.h / 2 - 125, { sc, rot: -0.09, lift: 1.4 * (1 - clamp(ks, 0, 1)) }); c.restore(); }
      c.restore();
    }
    // the strip comes back up from below once the label has gone, so the punchline has the frame to itself until then
    const kC = clamp((lt - tB - 0.15) / 0.32, 0, 1);
    bigTag(c, { a: clamp(kC * 2.5, 0, 1), dy: 360 * (1 - ease.out(kC)) });
    box(c);
  } };
})();
