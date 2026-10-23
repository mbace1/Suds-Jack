// THE KIT for "Again Urged" (The Brink 3): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline.
// One question: who can make the GPS jamming stop? A cockpit at night over southern Finland: on the moving-map screen
// the plane icon is suddenly sitting in a lake (spoofing's effect, never its method), and the pilot's gloved hands
// unfold a paper chart while the panel clock spins through a whole day ("around the clock"). Then Geneva by day:
// four envelopes (FI, EE, LV, LT) land in the board's tray, its nameplate flips up, and on its desk a rubber stamp
// comes down three times on a letter to the Russian Federation: URGE, AGAIN URGE, STRONGLY URGE. The end is a closed
// door: the letters drop through its slot onto a pile of unopened ones, and NO RESPONSE RECEIVED is stamped on it.
// Sober on purpose (plan/films/22-again-urged.md): no flags, no transmitters, no faces, no crash, no how-to.
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs),
// so the jump lands on "stop", the clock spins on "around the clock", the stamps on the three verbs and the last
// stamp on "none" in every language. Everything is a pure function of the shot's local time.
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, glow, fist, K } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
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
  function punch(lt, hits = [], { open = 0.04, settle = 0.35, kick = 0.025 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) { const [t, k] = Array.isArray(h) ? h : [h, kick]; if (lt >= t) z += k * Math.exp(-(lt - t) * 7) * (1 - Math.exp(-(lt - t) * 60)); }
    return z;
  }
  const JP = '"NotoSansJP-800"';

  const C = {
    night: ['#04060c', '#070a14', '#0a0f1d', '#0e1527', '#121b31', '#17223b'], star: '#efe6cf',
    frame: '#14171b', frameL: '#22272d', shield: '#0d0f12', panel: '#262b31', panelL: '#30363e', panelD: '#1b1f24', screw: '#4a525c',
    dial: '#0f1114', tick: '#e8e2d2', needle: '#f2ece0', amber: '#ffb54a', amberD: '#7a4e14', green: '#4fd18a', greenD: '#1e4a33',
    scr: '#0b1a2a', land: '#1f5a57', landL: '#2c6f69', sea: '#0e2c40', lake: '#4f8fb8', lakeL: '#78b2d6', coast: '#8fd3c4', grid: 'rgba(143,211,196,',
    chart: '#efe4c8', chartD: '#d8caa7', chartInk: '#2d6fa6', chartMag: '#b5427a', chartLand: '#e6dab9',
    sleeve: '#2b3648', cuff: '#c9a646',
    wall: '#c9d2d8', wallD: '#b4bec6', wallL: '#d8dfe4', wood: '#7a5534', woodD: '#5c3e24', woodL: '#94683f', floor: '#3a2a1c',
    paper: '#f1e8d2', paperD: '#d9cdb1', ink: '#15120f', grey: '#b9ad93', blue: '#2f56a8', red: '#c8402f', brass: '#c9a24a', brassD: '#8a6a2a',
    felt: '#3d4f5f', feltL: '#4a5e70', stampW: '#6b4a2e', stampD: '#3d2a1a',
    hall: '#3c4744', hallD: '#2e3735', door: '#53625c', doorD: '#44524c', doorL: '#61716a', mat: '#4a3524', matL: '#5e4630', boards: '#5b4632', boardsD: '#4a3826',
  };

  // ── the corner tag (CW.tag's look), with a Japanese face behind the Latin one ──────────────────────────────────────
  function tag(c, text, lt, dd, x = 110) {
    const y = R.SAFE_B - 66, a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dd - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = `32px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }

  // ═══════════════ the cockpit: windscreen, panel, gauges, the moving-map screen ═══════════════
  const SKY_BOTTOM = 780;
  /** the windscreen's sky as banded card; phase 0 = night, then dawn, day, dusk and night again (shot 2's spin) */
  const SKYKEYS = [
    [0, ['#04060c', '#070a14', '#0a0f1d', '#0e1527', '#121b31', '#17223b']],
    [0.22, ['#141a33', '#2a2a4a', '#4a3552', '#8a4a4a', '#c8703a', '#e8a24a']],
    [0.42, ['#3f78b0', '#5288bb', '#6a9cc8', '#82b0d3', '#9ac2dc', '#b5d3e4']],
    [0.62, ['#2a2346', '#4a2e4e', '#7a3a44', '#a8502e', '#cf7a34', '#e09a46']],
    [0.82, ['#04060c', '#070a14', '#0a0f1d', '#0e1527', '#121b31', '#17223b']],
    [1, ['#04060c', '#070a14', '#0a0f1d', '#0e1527', '#121b31', '#17223b']],
  ];
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mixHex = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',')})`; };
  function skyAt(ph) {
    ph = clamp(ph, 0, 1); let i = 0; while (i < SKYKEYS.length - 2 && ph > SKYKEYS[i + 1][0]) i++;
    const [p0, a] = SKYKEYS[i], [p1, b] = SKYKEYS[i + 1], k = clamp((ph - p0) / Math.max(1e-6, p1 - p0), 0, 1);
    return a.map((col, j) => mixHex(col, b[j], k));
  }
  const STARS = (() => { const r = U.rng(21); return Array.from({ length: 110 }, () => ({ x: r() * 1260 - 90, y: r() * 720 - 60, s: r() })); })();
  function windscreen(g, ox, oy, ph = 0) {
    const bands = skyAt(ph), step = (SKY_BOTTOM + 90) / bands.length;
    bands.forEach((col, i) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(-90 + ox, -90 + oy + i * step);
      for (let x = -90; x <= W + 90; x += 40) g.lineTo(x + ox, -90 + oy + i * step + Math.sin(x * 0.007 + i * 1.7) * 9);
      g.lineTo(W + 90 + ox, SKY_BOTTOM + 40 + oy); g.lineTo(-90 + ox, SKY_BOTTOM + 40 + oy); g.closePath(); g.fill();
    });
    const n = clamp(ph < 0.5 ? 1 - ph / 0.14 : (ph - 0.76) / 0.12, 0, 1);
    if (n > 0) { g.fillStyle = C.star; for (const s of STARS) { g.globalAlpha = n * (0.25 + s.s * 0.55); g.beginPath(); g.arc(s.x + ox, s.y + oy, 0.8 + s.s * 1.6, 0, TAU); g.fill(); } g.globalAlpha = 1; }
    // the far ground under the nose: a dark band of land with a few town lights at night
    g.fillStyle = mixHex('#0a0d12', '#3a4a44', clamp(1 - n, 0, 1) * 0.8); g.fillRect(-90 + ox, SKY_BOTTOM - 70 + oy, W + 180, 120);
    if (n > 0) { const r = U.rng(5); g.fillStyle = C.amber; for (let i = 0; i < 26; i++) { g.globalAlpha = n * (0.3 + r() * 0.5); g.fillRect(r() * W + ox, SKY_BOTTOM - 62 + r() * 30 + oy, 2.5, 2.5); } g.globalAlpha = 1; }
  }
  const SCR = { x: 238, y: 838, w: 604, h: 494 };                 // the map screen's window
  const ICON = [540, 1046];                                        // where the plane sits on it
  const GAUGES = [{ x: 140, y: 930, r: 74, kind: 'att' }, { x: 140, y: 1192, r: 74, kind: 'spd' }, { x: 940, y: 930, r: 74, kind: 'clock' }, { x: 940, y: 1192, r: 74, kind: 'alt' }];
  const LAMPS = [{ x: 330, label: 'FUEL' }, { x: 450, label: 'GPS', gps: true }, { x: 570, label: 'HYD' }, { x: 690, label: 'ICE' }, { x: 810, label: 'GEN' }];
  const LAMPY = 1418;
  /** the cockpit's frame: two windscreen pillars, the glare shield, the panel with its dial faces, screw heads, lamps */
  const frame = () => sheet('au_frame', (g) => {
    g.fillStyle = C.frame;
    g.beginPath(); g.moveTo(-90, -90); g.lineTo(150, -90); g.lineTo(250, SKY_BOTTOM - 40); g.lineTo(-90, SKY_BOTTOM - 40); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(W + 90, -90); g.lineTo(W - 150, -90); g.lineTo(W - 250, SKY_BOTTOM - 40); g.lineTo(W + 90, SKY_BOTTOM - 40); g.closePath(); g.fill();
    g.fillRect(-90, -90, W + 180, 120);
    g.fillStyle = C.frameL; g.fillRect(-90, 26, W + 180, 6);
    // the glare shield, a dark curve over the panel
    g.fillStyle = C.shield; g.beginPath(); g.moveTo(-90, SKY_BOTTOM - 40); g.quadraticCurveTo(W / 2, SKY_BOTTOM - 110, W + 90, SKY_BOTTOM - 40); g.lineTo(W + 90, 830); g.lineTo(-90, 830); g.closePath(); g.fill();
    // the panel
    g.fillStyle = C.panel; g.fillRect(-90, 816, W + 180, H + 90 - 816);
    g.fillStyle = C.panelL; g.fillRect(-90, 816, W + 180, 8);
    g.fillStyle = C.panelD; g.fillRect(-90, 1500, W + 180, H + 90 - 1500); g.fillStyle = C.panelL; g.fillRect(-90, 1500, W + 180, 5);
    for (const G of GAUGES) {
      g.fillStyle = '#121418'; g.beginPath(); g.arc(G.x, G.y, G.r + 12, 0, TAU); g.fill();
      g.fillStyle = C.dial; g.beginPath(); g.arc(G.x, G.y, G.r, 0, TAU); g.fill();
      g.strokeStyle = C.tick; g.lineWidth = 3;
      const n = G.kind === 'clock' ? 12 : 10;
      for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU - Math.PI / 2, l = i % 2 ? 7 : 14; g.lineWidth = i % 2 ? 2 : 3.5; g.beginPath(); g.moveTo(G.x + Math.cos(a) * (G.r - 4), G.y + Math.sin(a) * (G.r - 4)); g.lineTo(G.x + Math.cos(a) * (G.r - 4 - l), G.y + Math.sin(a) * (G.r - 4 - l)); g.stroke(); }
      if (G.kind === 'clock') { g.fillStyle = C.tick; g.textAlign = 'center'; g.font = '700 20px "LibreBaskerville-700"'; for (const [k, s] of [[0, '12'], [3, '3'], [6, '6'], [9, '9']]) { const a = (k / 12) * TAU - Math.PI / 2; g.fillText(s, G.x + Math.cos(a) * (G.r - 32), G.y + Math.sin(a) * (G.r - 32) + 7); } }
      g.fillStyle = C.screw; for (const a of [0.8, 2.35, 3.9, 5.5]) { g.beginPath(); g.arc(G.x + Math.cos(a) * (G.r + 22), G.y + Math.sin(a) * (G.r + 22), 4, 0, TAU); g.fill(); }
    }
    // the lamps' housings and their labels
    for (const L of LAMPS) {
      g.fillStyle = '#121418'; g.beginPath(); g.roundRect(L.x - 44, LAMPY - 28, 88, 56, 8); g.fill();
      g.fillStyle = L.gps ? C.amberD : C.greenD; g.beginPath(); g.roundRect(L.x - 38, LAMPY - 22, 76, 44, 6); g.fill();
      g.fillStyle = 'rgba(232,226,210,.55)'; g.textAlign = 'center'; g.font = '22px "ArchivoBlack-400"'; g.fillText(L.label, L.x, LAMPY + 8);
    }
    // a row of toggles under the lamps
    for (let i = 0; i < 9; i++) { const x = 230 + i * 78; g.fillStyle = '#121418'; g.beginPath(); g.arc(x, 1560, 14, 0, TAU); g.fill(); g.fillStyle = '#9aa1aa'; g.fillRect(x - 4, 1530, 8, 30); }
  }, 10);
  /** the screen's bezel: a dark rounded frame with a window cut through it */
  const bezel = () => sprite('au_bezel', SCR.w + 60, SCR.h + 60, SCR.w / 2 + 30, SCR.h / 2 + 30, (g) => {
    g.fillStyle = '#16191d'; g.beginPath(); g.roundRect(-SCR.w / 2 - 30, -SCR.h / 2 - 30, SCR.w + 60, SCR.h + 60, 22); g.fill();
    g.fillStyle = '#20252b'; g.beginPath(); g.roundRect(-SCR.w / 2 - 22, -SCR.h / 2 - 22, SCR.w + 44, SCR.h + 44, 16); g.fill();
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.roundRect(-SCR.w / 2, -SCR.h / 2, SCR.w, SCR.h, 10); g.fill(); g.globalCompositeOperation = 'source-over';
    g.fillStyle = C.screw; for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(x * (SCR.w / 2 + 14), y * (SCR.h / 2 + 14), 4, 0, TAU); g.fill(); }
  }, 8);

  // ── the map: coast, sea, an archipelago, a scatter of lakes; in its own coordinates, drawn live inside the window ──
  const coastY = (mx) => 560 + 38 * Math.sin(mx / 180) + 22 * Math.sin(mx / 57 + 1.3);
  function blob(r, cx, cy, rad, n = 14, j = 0.35) {
    const p = new Path2D();
    for (let i = 0; i <= n; i++) { const a = (i / n) * TAU, rr = rad * (1 - j / 2 + j * r()); const x = cx + Math.cos(a) * rr * 1.25, y = cy + Math.sin(a) * rr * 0.8; i ? p.lineTo(x, y) : p.moveTo(x, y); }
    p.closePath(); return p;
  }
  const MAP = (() => {
    const r = U.rng(77), sea = new Path2D(), isl = [], lakes = [];
    sea.moveTo(-600, 2400); for (let x = -600; x <= 4200; x += 16) sea.lineTo(x, coastY(x)); sea.lineTo(4200, 2400); sea.closePath();
    for (let i = 0; i < 70; i++) { const x = -400 + r() * 4400, y = coastY(x) + 18 + r() * r() * 180; isl.push(blob(r, x, y, 6 + r() * 16, 9, 0.5)); }
    let big = null;
    for (let i = 0; i < 90; i++) {
      const x = -400 + r() * 4400, y = coastY(x) - 90 - r() * 900, rad = 14 + r() * r() * 80, p = blob(r, x, y, rad);
      lakes.push({ p, x, y, rad });
      if (x > 1150 && x < 1700 && (!big || rad > big.rad)) big = { x, y, rad };
    }
    if (!big) big = { x: 1300, y: coastY(1300) - 400, rad: 70 };
    return { sea, isl, lakes, big };
  })();
  const MAPSPD = 46;
  const posBefore = (lt) => { const mx = 330 + MAPSPD * lt; return [mx, coastY(mx) - 34]; };
  /** the map with the point M under the icon; glitch tears it into strips (0..1) */
  function drawMap(g, M, glitch = null, frame = 0) {
    const draw = (Mx, My, dx = 0) => {
      g.save(); g.translate(ICON[0] - Mx + dx, ICON[1] - My);
      g.fillStyle = C.land; g.fillRect(Mx - 900, My - 900, 1800, 1800);
      const gx0 = Math.floor((Mx - 900) / 120) * 120, gy0 = Math.floor((My - 900) / 120) * 120;
      g.strokeStyle = C.grid + '.13)'; g.lineWidth = 1.5; g.beginPath();
      for (let x = gx0; x < Mx + 900; x += 120) { g.moveTo(x, My - 900); g.lineTo(x, My + 900); }
      for (let y = gy0; y < My + 900; y += 120) { g.moveTo(Mx - 900, y); g.lineTo(Mx + 900, y); }
      g.stroke();
      g.fillStyle = C.sea; g.fill(MAP.sea);
      g.fillStyle = C.landL; for (const p of MAP.isl) g.fill(p);
      for (const L of MAP.lakes) { if (Math.abs(L.x - Mx) > 800 || Math.abs(L.y - My) > 700) continue; g.fillStyle = C.lake; g.fill(L.p); g.strokeStyle = C.lakeL; g.lineWidth = 2; g.stroke(L.p); }
      g.strokeStyle = C.coast; g.lineWidth = 3; g.stroke(MAP.sea);
      g.restore();
    };
    if (!glitch) { draw(M[0], M[1]); return; }
    const r = U.rng(1000 + frame), n = 9, sh = SCR.h / n;
    for (let i = 0; i < n; i++) {
      g.save(); g.beginPath(); g.rect(SCR.x, SCR.y + i * sh, SCR.w, sh + 1); g.clip();
      const use = r() < 0.5 ? M : glitch.from; draw(use[0], use[1], (r() - 0.5) * 90);
      g.restore();
    }
  }
  /** the plane, from above, nose to the right */
  function plane(g, x, y, sc = 1, rot = 0) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc);
    const P = new Path2D('M 34 0 L 22 -5 L 6 -5 L -8 -30 L -18 -30 L -10 -5 L -24 -5 L -32 -16 L -38 -16 L -34 0 L -38 16 L -32 16 L -24 5 L -10 5 L -18 30 L -8 30 L 6 5 L 22 5 Z');
    g.lineJoin = 'round'; g.strokeStyle = '#06101a'; g.lineWidth = 6; g.stroke(P); g.fillStyle = '#ffffff'; g.fill(P);
    g.restore();
  }
  function gpsFlag(g, x, y, a) {
    if (a <= 0) return; g.save(); g.globalAlpha = a;
    g.strokeStyle = C.amber; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 46, y - 46); g.stroke();
    g.font = '30px "ArchivoBlack-400"'; const w = g.measureText('GPS?').width + 24;
    g.fillStyle = C.amber; g.beginPath(); g.roundRect(x + 40, y - 86, w, 46, 7); g.fill();
    g.fillStyle = '#1a1206'; g.fillText('GPS?', x + 52, y - 52); g.restore();
  }
  /** the screen, live: the map, the icon, after the jump the flag; scanlines and a faint glow */
  function screen(g, ox, oy, lt, tJ) {
    g.save(); g.translate(ox, oy);
    g.save(); g.beginPath(); g.roundRect(SCR.x, SCR.y, SCR.w, SCR.h, 10); g.clip();
    g.fillStyle = C.scr; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    const jumped = lt >= tJ, Mb = posBefore(Math.min(lt, tJ)), Ma = [MAP.big.x + 6 * Math.max(0, lt - tJ), MAP.big.y];
    const gl = jumped && lt < tJ + 0.16 ? { from: Mb } : 0;
    drawMap(g, jumped ? Ma : Mb, gl || null, Math.floor(lt * 30));
    if (gl) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(120,255,230,.10)'; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h); g.restore(); }
    const bob = Math.sin(lt * 2.1) * 1.5;
    if (!gl || Math.floor(lt * 30) % 2 === 0) plane(g, ICON[0] + (gl ? (U.rng(Math.floor(lt * 60))() - 0.5) * 30 : 0), ICON[1] + bob, 1.1);
    gpsFlag(g, ICON[0] + 18, ICON[1] - 10, jumped ? ease.out((lt - tJ - 0.18) / 0.25) : 0);
    // the screen's own light: scanlines and a soft sheen
    g.fillStyle = 'rgba(0,0,0,.16)'; for (let y = SCR.y; y < SCR.y + SCR.h; y += 4) g.fillRect(SCR.x, y, SCR.w, 1.2);
    const sh = g.createLinearGradient(SCR.x, SCR.y, SCR.x + SCR.w, SCR.y + SCR.h); sh.addColorStop(0, 'rgba(255,255,255,.07)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    g.restore();
    glow(g, SCR.x + SCR.w / 2, SCR.y + SCR.h / 2, 420, 'rgba(90,200,190,', 0.07);
    put(g, bezel(), SCR.x + SCR.w / 2, SCR.y + SCR.h / 2, { lift: 0.6 });
    g.restore();
  }
  /** the needles, the lamps (GPS blinking after the jump) and the clock's hands; spin (0..1) runs the clock round a day */
  function gauges(g, ox, oy, lt, { gpsOn = -1, spin = -1 } = {}) {
    g.save(); g.translate(ox, oy);
    for (const G of GAUGES) {
      let angles;
      if (G.kind === 'clock') { const base = 22.6 / 12, turns = spin > 0 ? ease.io(spin) * 2 : 0, hr = (base + turns) * TAU, mn = (0.42 + turns * 12) * TAU; angles = [[hr, G.r * 0.5, 6], [mn, G.r * 0.78, 4]]; }
      else if (G.kind === 'att') { angles = []; g.save(); g.beginPath(); g.arc(G.x, G.y, G.r - 18, 0, TAU); g.clip(); const roll = Math.sin(lt * 0.7) * 0.05; g.translate(G.x, G.y); g.rotate(roll); g.fillStyle = '#2f6fa8'; g.fillRect(-G.r, -G.r, G.r * 2, G.r); g.fillStyle = '#7a4f2a'; g.fillRect(-G.r, 0, G.r * 2, G.r); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-G.r, 0); g.lineTo(G.r, 0); g.stroke(); g.restore(); g.strokeStyle = C.amber; g.lineWidth = 5; g.beginPath(); g.moveTo(G.x - 34, G.y); g.lineTo(G.x - 10, G.y); g.moveTo(G.x + 10, G.y); g.lineTo(G.x + 34, G.y); g.stroke(); }
      else angles = [[(G.kind === 'spd' ? 0.62 : 0.31) * TAU + Math.sin(lt * 1.3 + G.y) * 0.03, G.r * 0.78, 4]];
      for (const [a, l, w] of angles) { g.strokeStyle = C.needle; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(G.x, G.y); g.lineTo(G.x + Math.sin(a) * l, G.y - Math.cos(a) * l); g.stroke(); }
      g.fillStyle = '#9aa1aa'; g.beginPath(); g.arc(G.x, G.y, 7, 0, TAU); g.fill();
    }
    for (const L of LAMPS) {
      const on = L.gps ? (gpsOn >= 0 ? (Math.floor(gpsOn * 3.2) % 2 === 0 ? 1 : 0.25) : 0) : 0.55;
      if (on <= 0) continue;
      g.save(); g.globalAlpha = on; g.fillStyle = L.gps ? C.amber : C.green; g.beginPath(); g.roundRect(L.x - 38, LAMPY - 22, 76, 44, 6); g.fill();
      g.fillStyle = '#1a1206'; g.textAlign = 'center'; g.font = '22px "ArchivoBlack-400"'; g.fillText(L.label, L.x, LAMPY + 8); g.restore();
      if (L.gps) glow(g, L.x, LAMPY, 110, 'rgba(255,181,74,', 0.4 * on);
    }
    g.restore();
  }

  // ═════════ 1 · au_screen: the coast on the screen; on "stop" the icon is suddenly in a lake ═════════
  SCENES.au_screen = { draw(c, lt) {
    const id = 'au_screen', dd = dur(id), tJ = at(id, 'jump', 2.3);
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [[tJ, 0.03]]) * lerp(1.0, 1.12, ease.io(lt / dd)), fx: 540, fy: 1080 };
    stack(c, [{ d: 0.02, fn: (g, ox, oy) => windscreen(g, ox, oy, 0) }, { sh: frame(), d: 0.1, lift: 0.4 },
      { d: 0.1, fn: (g, ox, oy) => { screen(g, ox, oy, lt, tJ); gauges(g, ox, oy, lt, { gpsOn: lt >= tJ ? lt - tJ : -1 }); } }], cam);
    tag(c, ui('airspace', 'OVER SOUTHERN FINLAND'), lt, dd);
    box(c);
  } };

  // ═════════ 2 · au_chart: gloved hands unfold a paper chart; on "around the clock" the clock spins a whole day ═════════
  const CH = { w: 640, h: 440, n: 4 };
  const chartArt = () => sprite('au_chart', CH.w, CH.h, 0, 0, (g) => {
    g.fillStyle = C.chart; g.fillRect(0, 0, CH.w, CH.h);
    const r = U.rng(9), cy = (x) => 300 + 26 * Math.sin(x / 70) + 12 * Math.sin(x / 23 + 1);
    g.fillStyle = C.chartLand; g.fillRect(0, 0, CH.w, CH.h);
    g.fillStyle = 'rgba(45,111,166,.18)'; g.beginPath(); g.moveTo(0, CH.h); for (let x = 0; x <= CH.w; x += 8) g.lineTo(x, cy(x)); g.lineTo(CH.w, CH.h); g.closePath(); g.fill();
    g.strokeStyle = C.chartInk; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= CH.w; x += 8) x ? g.lineTo(x, cy(x)) : g.moveTo(x, cy(x)); g.stroke();
    g.lineWidth = 2; for (let i = 0; i < 26; i++) { const x = r() * CH.w, y = 30 + r() * 230; g.beginPath(); g.ellipse(x, y, 8 + r() * 22, 5 + r() * 12, r(), 0, TAU); g.stroke(); }
    g.strokeStyle = 'rgba(45,111,166,.35)'; g.lineWidth = 1.2; for (let x = 40; x < CH.w; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH.h); g.stroke(); } for (let y = 40; y < CH.h; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(CH.w, y); g.stroke(); }
    g.strokeStyle = C.chartMag; g.lineWidth = 3; g.setLineDash([14, 8]); g.beginPath(); g.moveTo(30, 250); g.lineTo(300, 200); g.lineTo(610, 236); g.stroke(); g.setLineDash([]);
    g.save(); g.translate(540, 90); g.strokeStyle = C.chartMag; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 44, 0, TAU); g.stroke(); for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, -56); g.lineTo(8, -8); g.lineTo(0, 0); g.closePath(); g.fillStyle = C.chartMag; g.fill(); } g.restore();
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 1; i < CH.n; i++) g.fillRect((CH.w / CH.n) * i - 1, 0, 2, CH.h);
  }, 6);
  /** the chart at (x, y) (top-left), unfolding panel by panel as k runs 0..1; returns the right edge */
  function chart(g, x, y, k) {
    const src = chartArt(), pw = CH.w / CH.n; let cx = x;
    for (let i = 0; i < CH.n; i++) {
      const u = i === 0 ? 1 : clamp(k * (CH.n - 1) - (i - 1), 0, 1); if (u <= 0) break;
      const w = pw * (0.08 + 0.92 * ease.out(u)), shade = (1 - u) * 0.35 + (i % 2 ? 0.06 : 0);
      g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; g.shadowOffsetX = 8; g.shadowOffsetY = 12;
      g.drawImage(src.c, src.ox + pw * i, src.oy, pw, CH.h, cx, y + (1 - u) * 10, w, CH.h - (1 - u) * 20); g.restore();
      if (shade > 0) { g.fillStyle = `rgba(0,0,0,${shade})`; g.fillRect(cx, y + (1 - u) * 10, w, CH.h - (1 - u) * 20); }
      cx += w;
    }
    return cx;
  }
  SCENES.au_chart = { draw(c, lt) {
    const id = 'au_chart', dd = dur(id), tU = at(id, 'unfold', 0.6), tS = at(id, 'spin', 3.2);
    const spin = (lt - tS) / 1.5, ph = clamp(spin, 0, 1);
    const cam = { x: Math.sin(lt * 0.3 + 1) * 5, y: 0, z: punch(lt, [[tS, 0.025]]) * lerp(1.06, 1.0, ease.io(lt / dd)), fx: 540, fy: 1080 };
    const up = ease.out((lt - tU + 0.5) / 0.6), kU = ease.io((lt - tU - 0.1) / 1.0);
    stack(c, [{ d: 0.02, fn: (g, ox, oy) => windscreen(g, ox, oy, ph) }, { sh: frame(), d: 0.1, lift: 0.4 },
      { d: 0.1, fn: (g, ox, oy) => {
        screen(g, ox, oy, lt + 10, 0);
        gauges(g, ox, oy, lt, { gpsOn: lt + 10, spin: spin > 0 ? spin : -1 });
        if (up > 0) {
          const x0 = 200 + ox, y0 = lerp(H + 80, 1150, up) + oy + Math.sin(lt * 1.6) * 3, rx = chart(g, x0, y0, kU);
          fist(g, x0 + 24, y0 + CH.h - 30, 0.62, -0.25, { sleeve: C.sleeve, cuff: C.cuff, len: 900 });
          fist(g, rx - 20, y0 + CH.h - 30, 0.62, 0.15, { sleeve: C.sleeve, cuff: C.cuff, len: 900 });
        }
      } }], cam);
    tag(c, ui('traficom', 'TRAFICOM · APRIL 2026'), lt, dd);
    box(c);
  } };

  // ═════════ 3 · au_post: four envelopes land in the board's tray; on "ITU" its nameplate flips up ═════════
  const office = () => sheet('au_office', (g) => {
    g.fillStyle = C.wall; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.wallL; for (let x = -90; x < W + 90; x += 180) g.fillRect(x, -90, 6, 1100);
    g.fillStyle = C.wallD; g.fillRect(-90, 1000, W + 180, 14); g.fillStyle = C.wallL; g.fillRect(-90, 1014, W + 180, 6);
    // a tall window on the left with the light of a day in Geneva, and its shadow on the wall
    g.fillStyle = '#e4ecf1'; g.fillRect(90, 560, 260, 400); g.fillStyle = '#a9b8c3'; g.fillRect(90, 560, 260, 12); g.fillRect(214, 560, 12, 400); g.fillRect(90, 754, 260, 10);
    g.fillStyle = '#cfdbe3'; for (const [x, y] of [[100, 576], [230, 576], [100, 770], [230, 770]]) g.fillRect(x, y, 110, 172);
    // the desk
    g.fillStyle = C.woodD; g.fillRect(-90, 1196, W + 180, 30);
    g.fillStyle = C.wood; g.fillRect(-90, 1170, W + 180, 30); g.fillStyle = C.woodL; g.fillRect(-90, 1170, W + 180, 6);
    g.fillStyle = C.woodD; g.fillRect(-90, 1226, W + 180, 300); g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -90; x < W + 90; x += 220) g.fillRect(x, 1226, 4, 300);
    g.fillStyle = C.floor; g.fillRect(-90, 1526, W + 180, H);
  }, 10);
  const TRAY = { x: 770, y: 1170 }, TS = 1.25, PS = 1.15;
  const tray = () => sprite('au_tray', 380, 150, 190, 130, (g) => {
    g.fillStyle = C.woodD; g.beginPath(); g.moveTo(-180, -60); g.lineTo(180, -60); g.lineTo(168, 0); g.lineTo(-168, 0); g.closePath(); g.fill();
    g.fillStyle = C.woodL; g.fillRect(-180, -66, 360, 10);
    g.fillStyle = C.paper; g.beginPath(); g.roundRect(-150, -50, 300, 36, 4); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '700 16px "LibreBaskerville-700"'; g.fillText('INTERFERENCE REPORTS', 0, -26);
  }, 8);
  const TRAYBACK = () => sprite('au_trayback', 380, 120, 190, 110, (g) => { g.fillStyle = C.wood; g.beginPath(); g.moveTo(-170, -100); g.lineTo(170, -100); g.lineTo(180, -60); g.lineTo(-180, -60); g.closePath(); g.fill(); }, 6);
  const POSTS = ['FI', 'EE', 'LV', 'LT'];
  const envelope = (code) => sprite('au_env_' + code, 260, 170, 130, 85, (g) => {
    g.fillStyle = C.paperD; g.fillRect(-124, -78, 252, 162); g.fillStyle = C.paper; g.fillRect(-128, -82, 252, 162);
    g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-128, -82); g.lineTo(-2, 6); g.lineTo(124, -82); g.stroke();
    g.fillStyle = '#6d8aa8'; g.fillRect(74, -70, 38, 46); g.strokeStyle = C.paper; g.lineWidth = 3; g.setLineDash([4, 3]); g.strokeRect(74, -70, 38, 46); g.setLineDash([]);
    g.strokeStyle = 'rgba(140,40,30,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(44, -38, 30, 0, TAU); g.stroke(); g.beginPath(); g.arc(44, -38, 23, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(140,40,30,.9)'; g.textAlign = 'center'; g.font = '400 24px "Anton-400"'; g.fillText(code, 44, -29);
    g.fillStyle = C.grey; g.fillRect(-90, 20, 150, 8); g.fillRect(-90, 38, 120, 8); g.fillRect(-90, 56, 136, 8);
  }, 7);
  /** a card thrown on an arc from p0 to p1 over [t0, t0+d], then a damped bounce where it lands */
  function thrown(lt, t0, d, p0, p1, arc, r0, r1) {
    const k = (lt - t0) / d; if (k <= 0) return null;
    if (k < 1) return { x: lerp(p0[0], p1[0], k), y: lerp(p0[1], p1[1], k) - arc * 4 * k * (1 - k), r: lerp(r0, r1, ease.out(k)) };
    const tb = lt - t0 - d; return { x: p1[0], y: p1[1] - Math.exp(-tb * 9) * Math.abs(Math.sin(tb * 17)) * 16, r: r1 + Math.exp(-tb * 7) * Math.sin(tb * 15) * 0.05 };
  }
  const PLATE = { x: 290, y: 1172 };
  const plate = () => sprite('au_plate', 420, 150, 210, 140, (g) => {
    g.fillStyle = C.brassD; g.beginPath(); g.moveTo(-200, 0); g.lineTo(200, 0); g.lineTo(186, -126); g.lineTo(-186, -126); g.closePath(); g.fill();
    g.fillStyle = C.brass; g.beginPath(); g.moveTo(-192, -6); g.lineTo(192, -6); g.lineTo(180, -120); g.lineTo(-180, -120); g.closePath(); g.fill();
    g.fillStyle = '#e8cc7a'; g.fillRect(-176, -116, 352, 5);
    g.fillStyle = '#2a1e0a'; g.textAlign = 'center'; g.font = '400 64px "Anton-400"'; g.fillText('ITU', 0, -50);
    g.font = '700 18px "LibreBaskerville-700"'; g.fillText('RADIO REGULATIONS BOARD', 0, -20);
  }, 8);
  SCENES.au_post = { draw(c, lt) {
    const id = 'au_post', dd = dur(id), tE = at(id, 'env', 0.6), tP = at(id, 'plate', 3.6);
    const cam = { x: Math.sin(lt * 0.28) * 7, y: 0, z: punch(lt, [[tP, 0.03]]) * lerp(1.0, 1.08, ease.io(lt / dd)), fx: 600, fy: 1120 };
    const gap = clamp((tP - 0.3 - tE) / 4, 0.28, 0.5);
    stack(c, [{ sh: office(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      put(g, TRAYBACK(), TRAY.x + ox, TRAY.y + oy, { lift: 0.4, sc: TS });
      POSTS.forEach((code, i) => {
        const p = thrown(lt, tE + i * gap, 0.55, [-260, 740 + i * 30], [TRAY.x - 6 + (i % 2 ? 14 : -16), TRAY.y - 80 - i * 12], 280, -0.9 + i * 0.2, (i % 2 ? 0.05 : -0.06));
        if (p) put(g, envelope(code), p.x + ox, p.y + oy, { rot: p.r, sc: 0.82, lift: 0.8 });
      });
      put(g, tray(), TRAY.x + ox, TRAY.y + oy, { lift: 0.6, sc: TS });
      // the nameplate, hinged at its foot: it flips up on "ITU"
      const kp = (lt - tP + 0.05) / 0.32;
      if (kp > 0) { const s = ease.back(kp); g.save(); g.translate(PLATE.x + ox, PLATE.y + oy); g.scale(1, Math.max(0.02, s)); put(g, plate(), 0, 0, { lift: 0.7 * s, sc: PS }); g.restore(); }
    } }], cam);
    tag(c, ui('itu', 'ITU · GENEVA'), lt, dd);
    box(c);
  } };

  // ═════════ 4 · au_stamp: the board's desk from above; three letters, three stamps: URGE, AGAIN URGE, STRONGLY URGE ═════════
  const desk = () => sheet('au_desk', (g) => {
    g.fillStyle = C.woodD; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(31); for (let y = -90; y < H + 90; y += 40) { g.fillStyle = r() < 0.5 ? C.wood : C.woodD; g.globalAlpha = 0.45; g.fillRect(-90, y, W + 180, 18 + r() * 16); } g.globalAlpha = 1;
    g.fillStyle = C.felt; g.beginPath(); g.roundRect(110, 560, 860, 1060, 12); g.fill(); g.fillStyle = C.feltL; g.fillRect(110, 560, 860, 6);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 140; i++) { g.fillRect(110 + r() * 860, 560 + r() * 1060, 2, 2); }
  }, 10);
  const LET = { x: 520, y: 1110, w: 560, h: 720 };
  const letter = (n) => sprite('au_letter' + n, LET.w + 20, LET.h + 20, LET.w / 2 + 10, LET.h / 2 + 10, (g) => {
    const w = LET.w, h = LET.h;
    g.fillStyle = C.paperD; g.fillRect(-w / 2 + 6, -h / 2 + 6, w, h); g.fillStyle = C.paper; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = '400 40px "Anton-400"'; g.fillText('ITU', -w / 2 + 40, -h / 2 + 70);
    g.font = '700 15px "LibreBaskerville-700"'; g.fillText('RADIOCOMMUNICATION BUREAU · GENEVA', -w / 2 + 116, -h / 2 + 62); g.fillRect(-w / 2 + 40, -h / 2 + 92, w - 80, 3);
    g.font = '700 21px "LibreBaskerville-700"'; g.fillText('TO: THE ADMINISTRATION OF', -w / 2 + 40, -h / 2 + 148); g.fillText('THE RUSSIAN FEDERATION', -w / 2 + 40, -h / 2 + 180);
    g.font = '700 17px "LibreBaskerville-700"'; g.fillText('RE: HARMFUL INTERFERENCE', -w / 2 + 40, -h / 2 + 226); g.fillText('TO SATELLITE NAVIGATION', -w / 2 + 40, -h / 2 + 252);
    g.fillStyle = C.grey; const r = U.rng(40 + n); for (let y = -h / 2 + 300; y < h / 2 - 120; y += 30) g.fillRect(-w / 2 + 40, y, 300 + r() * 170, 9);
    g.fillStyle = C.ink; g.fillRect(-w / 2 + 40, h / 2 - 70, 180, 2);
  }, 8);
  const stampTool = () => sprite('au_stamp', 260, 320, 130, 290, (g) => {
    g.fillStyle = C.stampD; g.beginPath(); g.roundRect(-110, -30, 220, 30, 4); g.fill();
    g.fillStyle = C.stampW; g.beginPath(); g.roundRect(-118, -96, 236, 70, 8); g.fill(); g.fillStyle = '#86603d'; g.fillRect(-118, -96, 236, 12);
    g.fillStyle = C.stampD; g.fillRect(-18, -170, 36, 76);
    g.fillStyle = '#946b47'; g.beginPath(); g.ellipse(0, -196, 56, 44, 0, 0, TAU); g.fill(); g.fillStyle = '#ad8460'; g.beginPath(); g.ellipse(-16, -210, 22, 14, -0.4, 0, TAU); g.fill();
  }, 12);
  /** a rectangular stamp's imprint: double border, the word(s), a little ink texture where it did not take */
  function imprint(g, x, y, k, lines, col, sc = 1, rot = -0.08, holes = 70) {
    if (k <= 0) return; g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc); g.globalAlpha = clamp(k, 0, 1) * 0.92;
    g.font = '400 64px "Anton-400"'; const w = Math.max(...lines.map((s) => g.measureText(s).width)) + 60, h = lines.length * 70 + 30;
    g.strokeStyle = col; g.lineWidth = 8; g.strokeRect(-w / 2, -h / 2, w, h); g.lineWidth = 3; g.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
    g.fillStyle = col; g.textAlign = 'center'; lines.forEach((s, i) => g.fillText(s, 0, -h / 2 + 82 + i * 70));
    g.globalCompositeOperation = 'destination-out'; const r = U.rng(lines.join('').length * 7); g.fillStyle = 'rgba(0,0,0,.5)'; for (let i = 0; i < holes; i++) g.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 1.5 + r() * 3, 1.2 + r() * 2.2);
    g.restore();
  }
  /** the stamp coming down on time t, landing at (x, y), lifting away */
  function stamping(g, lt, t, x, y, sc = 1) {
    const kS = (lt - t + 0.2) / 0.2, kU = (lt - t - 0.16) / 0.32;
    if (kS <= 0 || kU >= 1) return;
    const h = kS < 1 ? lerp(-560, 0, ease.io(kS)) : lerp(0, -600, ease.io(kU)), a = kU > 0 ? 1 - ease.io(kU) : clamp(kS * 3, 0, 1);
    g.save(); g.globalAlpha = a; put(g, stampTool(), x, y + 60 + h, { sc: 0.95 * sc, lift: 0.6 - h / 60 }); g.restore();
  }
  const STAMPS = [{ lines: ['URGE'], col: C.blue, sc: 1 }, { lines: ['AGAIN', 'URGE'], col: C.blue, sc: 1 }, { lines: ['STRONGLY', 'URGE'], col: C.red, sc: 1.18 }];
  SCENES.au_stamp = { draw(c, lt) {
    const id = 'au_stamp', dd = dur(id), T = [at(id, 's1', 1.0), at(id, 's2', 2.6), at(id, 's3', 4.2)];
    const shake = lt > T[2] ? Math.exp(-(lt - T[2]) * 9) * Math.sin((lt - T[2]) * 60) * 10 : 0;
    const cam = { x: Math.sin(lt * 0.3) * 5 + shake, y: shake * 0.6, z: punch(lt, [[T[0], 0.025], [T[1], 0.03], [T[2], 0.05]]) * lerp(1.0, 1.06, ease.io(lt / dd)), fx: 540, fy: 1110 };
    stack(c, [{ sh: desk(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      // each letter: slides in from below before its stamp, is stamped, then is sent off the top (the last stays)
      for (let i = 0; i < 3; i++) {
        const tin = i === 0 ? -10 : T[i - 1] + 0.55, tout = i < 2 ? T[i] + Math.min(0.55, (T[i + 1] - T[i]) * 0.38) : 99;
        const din = i === 0 ? 1 : Math.min(0.4, Math.max(0.2, T[i] - tin - 0.25)), dout = i < 2 ? Math.min(0.4, Math.max(0.2, T[i + 1] - tout - 0.1)) : 1;
        const kin = ease.out((lt - tin) / din), kout = ease.io((lt - tout) / dout);
        if (kin <= 0 || kout >= 1) continue;
        const x = LET.x + ox + lerp(0, 160, kout), y = lerp(H + 500, LET.y, kin) + lerp(0, -1700, kout) + oy, rot = (i - 1) * 0.03 + kout * 0.2;
        put(g, letter(i), x, y, { rot, lift: 0.5 + kout });
        g.save(); g.translate(x, y); g.rotate(rot);
        const S = STAMPS[i]; imprint(g, 0, 150, lt >= T[i] ? 1 : 0, S.lines, S.col, S.sc, -0.08 + i * 0.05);
        g.restore();
      }
      for (let i = 0; i < 3; i++) stamping(g, lt, T[i], LET.x + ox, LET.y + 150 + oy, STAMPS[i].sc);
    } }], cam);
    tag(c, ui('board', 'RADIO REGULATIONS BOARD · 2025–26'), lt, dd);
    box(c);
  } };

  // ═════════ 5 · au_pile: a closed door; three letters drop through the slot onto the unopened pile; "none" stamped ═════════
  const DOOR = { x0: 290, x1: 790, y0: 470, y1: 1420 }, SLOT = { x: 540, y: 1010, w: 220, h: 30 };
  const hall = () => sheet('au_hall', (g) => {
    g.fillStyle = C.hall; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.hallD; for (let x = -90; x < W + 90; x += 64) g.fillRect(x, -90, 3, 1600);
    g.fillStyle = '#26302d'; g.fillRect(-90, 1380, W + 180, 30);
    g.fillStyle = C.boards; g.fillRect(-90, 1410, W + 180, H); g.fillStyle = C.boardsD; for (let y = 1430; y < H + 90; y += 46) g.fillRect(-90, y, W + 180, 3);
    // the door, its frame and panels; a brass slot; a knob
    g.fillStyle = '#2a3330'; g.fillRect(DOOR.x0 - 30, DOOR.y0 - 30, DOOR.x1 - DOOR.x0 + 60, DOOR.y1 - DOOR.y0 + 30);
    g.fillStyle = C.door; g.fillRect(DOOR.x0, DOOR.y0, DOOR.x1 - DOOR.x0, DOOR.y1 - DOOR.y0);
    g.fillStyle = C.doorD; for (const [x, y, w, h] of [[DOOR.x0 + 50, DOOR.y0 + 50, 170, 380], [DOOR.x0 + 280, DOOR.y0 + 50, 170, 380], [DOOR.x0 + 50, DOOR.y0 + 600, 170, 300], [DOOR.x0 + 280, DOOR.y0 + 600, 170, 300]]) { g.fillRect(x, y, w, h); g.fillStyle = C.doorL; g.fillRect(x, y, w, 5); g.fillRect(x, y, 5, h); g.fillStyle = C.doorD; }
    g.fillStyle = C.brassD; g.beginPath(); g.roundRect(SLOT.x - SLOT.w / 2 - 14, SLOT.y - SLOT.h / 2 - 12, SLOT.w + 28, SLOT.h + 24, 6); g.fill();
    g.fillStyle = C.brass; g.beginPath(); g.roundRect(SLOT.x - SLOT.w / 2 - 8, SLOT.y - SLOT.h / 2 - 6, SLOT.w + 16, SLOT.h + 12, 5); g.fill();
    g.fillStyle = '#0d0f0e'; g.fillRect(SLOT.x - SLOT.w / 2, SLOT.y - SLOT.h / 2, SLOT.w, SLOT.h);
    g.fillStyle = C.brass; g.beginPath(); g.arc(DOOR.x1 - 60, DOOR.y0 + 520, 20, 0, TAU); g.fill(); g.fillStyle = '#e8cc7a'; g.beginPath(); g.arc(DOOR.x1 - 66, DOOR.y0 + 514, 7, 0, TAU); g.fill();
    // the mat
    g.fillStyle = C.mat; g.beginPath(); g.roundRect(DOOR.x0 - 40, 1440, DOOR.x1 - DOOR.x0 + 80, 150, 10); g.fill();
    g.fillStyle = C.matL; const r = U.rng(8); for (let i = 0; i < 500; i++) g.fillRect(DOOR.x0 - 30 + r() * (DOOR.x1 - DOOR.x0 + 60), 1448 + r() * 134, 1.5, 4);
  }, 10);
  const mail = (n, label) => sprite('au_mail' + n, 300, 190, 150, 95, (g) => {
    g.fillStyle = C.paperD; g.fillRect(-140, -86, 284, 176); g.fillStyle = C.paper; g.fillRect(-144, -90, 284, 176);
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-144, -90); g.lineTo(-2, 10); g.lineTo(140, -90); g.stroke();
    if (label) imprint(g, 30, 30, 1, label.lines, label.col, 0.42 * (label.sc || 1), -0.1);
    g.fillStyle = C.grey; g.fillRect(-110, 50, 90, 7);
  }, 6);
  // the pile already on the mat: letters that came before, unopened, a little dusty
  const OLD = (() => { const r = U.rng(66); return Array.from({ length: 10 }, (_, i) => ({ x: 440 + (r() - 0.5) * 300, y: 1515 - i * 6 - r() * 10, r: (r() - 0.5) * 0.9, st: i % 3 === 0 ? STAMPS[0] : i % 3 === 1 ? STAMPS[1] : null })); })();
  /** a letter out of the slot: it slides through, tips and falls to the top of the pile, a little bounce */
  function falling(lt, t0, land, rot1) {
    const k1 = (lt - t0) / 0.18; if (k1 <= 0) return null;
    if (k1 < 1) return { x: SLOT.x, y: SLOT.y + 10 + 30 * ease.out(k1), r: 0.0, clip: true };
    const tf = lt - t0 - 0.18, y0 = SLOT.y + 40, T = Math.sqrt((2 * (land[1] - y0)) / 5200);
    if (tf < T) { const k = tf / T; return { x: lerp(SLOT.x, land[0], k), y: y0 + 0.5 * 5200 * tf * tf, r: lerp(0.0, rot1, k) + Math.sin(k * 3.2) * 0.25 }; }
    const tb = tf - T; return { x: land[0], y: land[1] - Math.exp(-tb * 10) * Math.abs(Math.sin(tb * 16)) * 14, r: rot1 };
  }
  SCENES.au_pile = { draw(c, lt) {
    const id = 'au_pile', dd = dur(id), T = [at(id, 'f1', 0.0), at(id, 'f2', 0.4), at(id, 'f3', 0.8)], tN = at(id, 'none', 1.7);
    const cam = { x: Math.sin(lt * 0.25) * 6, y: 0, z: punch(lt, [[tN, 0.04]]) * lerp(1.0, 1.1, ease.io(lt / dd)), fx: 540, fy: 1260 };
    stack(c, [{ sh: hall(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      for (const o of OLD) { put(g, mail('old' + (o.st ? STAMPS.indexOf(o.st) : 'x'), o.st), o.x + ox, o.y + oy, { rot: o.r, sc: 0.7, lift: 0.3 }); }
      g.fillStyle = 'rgba(160,150,130,.18)'; g.fillRect(DOOR.x0 - 20 + ox, 1440 + oy, DOOR.x1 - DOOR.x0 + 40, 120);
      [[470, 1462, 0.32], [600, 1452, -0.28], [520, 1440, 0.12]].forEach(([x, y, r], i) => {
        const p = falling(lt, T[i], [x, y], r); if (!p) return;
        if (p.clip) { g.save(); g.beginPath(); g.rect(0, SLOT.y + oy, W, H); g.clip(); put(g, mail(i, STAMPS[i]), p.x + ox, p.y + oy + 60, { rot: -Math.PI / 2 * 0, sc: 0.7, lift: 0.4 }); g.restore(); return; }
        put(g, mail(i, STAMPS[i]), p.x + ox, p.y + oy, { rot: p.r, sc: 0.7, lift: 0.5 });
      });
      // on "none": the stamp comes down on the closed door
      stamping(g, lt, tN, DOOR.x0 + 250 + ox, DOOR.y0 + 330 + oy, 1.2);
      imprint(g, DOOR.x0 + 250 + ox, DOOR.y0 + 330 + oy, lt >= tN ? 1 : 0, ['NO RESPONSE', 'RECEIVED'], C.red, 0.92, -0.1, 30);
    } }], cam);
    tag(c, ui('next', 'BOARD MEETS AGAIN · 26–30.10.'), lt, dd);
    box(c);
  } };
})();
