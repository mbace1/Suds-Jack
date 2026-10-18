// The kit for "It Was Only a Test" (EU): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline. One
// question: when an AI test breaks out of the lab, is it still a test? A street in pale daylight, side on: two white
// test labs (OPENAI · TEST LAB, ANTHROPIC · TEST LAB) with TESTING IN PROGRESS on their doors, between ordinary brick
// houses with steps. What got out is a trail of glowing cyan footprints, from under a lab door, up someone else's
// steps. The EU's letter is a blue envelope with the gold stars; the law's answer is a stamp: EXEMPT. Cyan (the tests)
// and EU blue are the only loud colours; everything else is brick, stone and paper.
//   Times come from window.FILM_PLAN (pipeline/plan.mjs): OT.at('ot_letter', 'exempt') is the moment the caption's
//   third line starts, in the shot's own seconds.
window.OT = (() => {
  const { K, W, H, sheet, sprite, put, glow } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.43 };
  const at = (id, name, dflt = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? dflt : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const C = {
    sky0: '#cfdbe0', sky1: '#e6ece6', stone: '#b9b2a4', stoneD: '#9a9284', step: '#a8a091', pave: '#8f8a80', paveL: '#a39e93', kerb: '#7a756c', road: '#5d5a55',
    brick: '#a5543a', brickD: '#86412c', brick2: '#b8714e', brick2D: '#955536', render: '#d9cdb4', renderD: '#bdb096',
    lab: '#eef0ee', labD: '#cfd4d3', glass: '#1d2428', glassL: '#33404a', cyan: '#3ff0e6', cyanD: '#1fb5ad', red: '#d63b2f',
    eu: '#1f3f9a', euD: '#152d70', gold: '#f4c620', ink: '#1b1d1f', cream: '#f2ecdc', doorG: '#2f5a46', doorR: '#7a2a24', doorB: '#2a4a6e',
  };
  const ease = { out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3), io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
  function punch(lt, hits = [], { open = 0.05, settle = 0.35, kick = 0.035 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  const sky = () => sheet('ot_sky', (g) => { const v = g.createLinearGradient(0, 0, 0, 1200); v.addColorStop(0, C.sky0); v.addColorStop(1, C.sky1); g.fillStyle = v; g.fillRect(-90, -90, W + 180, 1400);
    g.fillStyle = 'rgba(255,255,255,.55)'; for (const [x, y, r] of [[200, 520, 70], [270, 500, 90], [350, 530, 60], [760, 430, 80], [840, 410, 100], [930, 440, 70]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }, 6);
  /** the pavement and the road in front of the doors */
  const pavement = (y0 = 1440) => sheet('ot_pave_' + y0, (g) => {
    g.fillStyle = C.pave; g.fillRect(-90, y0, W + 180, 300); g.fillStyle = C.paveL; for (let x = -90; x < W + 90; x += 130) g.fillRect(x, y0, 4, 300);
    for (let y = y0 + 100; y < y0 + 300; y += 100) g.fillRect(-90, y, W + 180, 3);
    g.fillStyle = C.kerb; g.fillRect(-90, y0 + 300, W + 180, 26); g.fillStyle = C.road; g.fillRect(-90, y0 + 326, W + 180, H);
  }, 8);

  // ── buildings, all drawn with the door's sill at y = 0 so they sit on one pavement ─────────────────────────────
  /** a test lab: a white block, a black glass door with its sign, a red TEST light, the company's plate */
  const lab = (name) => sprite('ot_lab_' + name, 560, 1300, 280, 1250, (g) => {
    g.fillStyle = C.lab; g.fillRect(-260, -1200, 520, 1200); g.fillStyle = C.labD; for (let y = -1150; y < -460; y += 110) g.fillRect(-260, y, 520, 6);
    for (const x of [-190, 80]) for (let y = -1120; y < -500; y += 110) { g.fillStyle = C.glassL; g.fillRect(x, y, 110, 70); }
    g.fillStyle = C.labD; g.fillRect(-140, -470, 280, 470);
    g.fillStyle = C.glass; g.fillRect(-110, -430, 220, 430); g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(-110, -430); g.lineTo(-40, -430); g.lineTo(-110, -260); g.closePath(); g.fill();
    g.fillStyle = '#c7ccce'; g.fillRect(70, -250, 12, 60);                                                          // the handle
    g.fillStyle = C.ink; g.beginPath(); g.roundRect(-235, -530, 470, 56, 6); g.fill(); g.fillStyle = C.cream; g.font = '36px "Anton-400"'; g.textAlign = 'center'; g.fillText(name, 0, -489);
    g.fillStyle = C.stoneD; g.fillRect(-170, 0, 340, 24);                                                           // the sill
  }, 12);
  /** the sign on a lab door; `ex` stamps EXEMPT under it */
  function sign(c, x, y, s = 1, ex = 0, wob = 0) {
    c.save(); c.translate(x, y); c.rotate(wob); c.scale(s, s);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(-92 + 6, -70 + 8, 184, 140);
    c.fillStyle = C.cream; c.fillRect(-92, -70, 184, 140); c.fillStyle = C.red; c.fillRect(-92, -70, 184, 34);
    c.fillStyle = C.cream; c.textAlign = 'center'; c.font = '22px "Anton-400"'; c.fillText('TESTING IN PROGRESS', 0, -45);
    c.fillStyle = C.ink; c.font = '30px "Anton-400"'; c.fillText('DO NOT', 0, 4); c.fillText('ENTER', 0, 40);
    if (ex > 0) { const k = ease.out(ex), sc = lerp(2.2, 1, k); c.save(); c.translate(0, 98); c.rotate(-0.12); c.scale(sc, sc); c.globalAlpha = clamp(ex * 3, 0, 1);
      c.strokeStyle = C.red; c.lineWidth = 6; c.strokeRect(-92, -30, 184, 60); c.fillStyle = C.red; c.font = '46px "Anton-400"'; c.fillText('EXEMPT', 0, 18); c.restore(); }
    c.restore();
  }
  /** the red TEST light above a lab door */
  function testLight(c, x, y, lt) { const on = Math.sin(lt * 3) > -0.3 ? 1 : 0.35; c.fillStyle = '#3a1210'; c.beginPath(); c.roundRect(x - 60, y - 24, 120, 48, 10); c.fill();
    c.globalAlpha = on; c.fillStyle = C.red; c.beginPath(); c.roundRect(x - 52, y - 17, 104, 34, 8); c.fill(); c.fillStyle = '#ffe0d8'; c.font = '24px "Anton-400"'; c.textAlign = 'center'; c.fillText('TEST', x, y + 9); c.globalAlpha = 1;
    glow(c, x, y, 110, 'rgba(214,59,47,', 0.4 * on); }
  /** a brick house with steps up to its door; `door` is the door's colour, `name` an optional plate */
  const house = (key, brick, brickD, door, name = '') => sprite('ot_house_' + key, 520, 1500, 260, 1450, (g) => {
    g.fillStyle = brick; g.fillRect(-240, -1400, 480, 1400);
    g.fillStyle = brickD; for (let y = -1380; y < 0; y += 22) for (let x = -240 + ((y / 22) % 2 ? 0 : 20); x < 240; x += 44) g.fillRect(x, y, 2, 20);
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = -1390; y < 0; y += 22) g.fillRect(-240, y, 480, 2);
    for (const [x, y] of [[-150, -1250], [60, -1250], [-150, -950], [60, -950], [-150, -650]]) { g.fillStyle = C.render; g.fillRect(x - 10, y - 10, 110, 170); g.fillStyle = C.glass; g.fillRect(x, y, 90, 150); g.fillStyle = C.render; g.fillRect(x + 43, y, 4, 150); }
    g.fillStyle = C.render; g.fillRect(-10, -660, 200, 400); g.fillStyle = door; g.fillRect(10, -640, 160, 360);
    g.fillStyle = 'rgba(255,255,255,.12)'; for (const yy of [-610, -460]) g.fillRect(30, yy, 120, 120);
    g.fillStyle = '#d6b45a'; g.beginPath(); g.arc(150, -460, 8, 0, TAU); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? C.step : C.stone; g.fillRect(-30 - i * 30, -280 + i * 70, 260 + i * 60, 70); }   // four steps down to the pavement
    if (name) { g.fillStyle = C.cream; g.beginPath(); g.roundRect(-30, -740, 240, 62, 6); g.fill(); g.fillStyle = C.ink; g.font = '34px "Anton-400"'; g.textAlign = 'center'; g.fillText(name, 90, -696); }
  }, 12);
  /** the steps' top: where footprints climb to (relative to the house's own origin) */
  const STEPS = [[90, -10], [60, -80], [90, -150], [100, -220], [100, -300]];

  const WINDOWS = [[-150, -1250], [60, -1250], [-150, -950], [60, -950], [-150, -650]];
  /** a house at (x, y) scale sc, lit from inside in cyan: its door by kd, its windows one by one by kw (0..1) */
  function houseLit(c, x, y, sc, kd, kw = 0, lt = 0) {
    const fl = 0.85 + 0.15 * Math.sin(lt * 23 + x);
    if (kd > 0) { c.save(); c.globalAlpha = clamp(kd, 0, 1) * fl; c.fillStyle = C.cyan; for (const yy of [-610, -460]) c.fillRect(x + 30 * sc, y + yy * sc, 120 * sc, 120 * sc);
      c.globalAlpha = clamp(kd, 0, 1) * 0.5 * fl; c.fillRect(x + 10 * sc, y - 286 * sc, 160 * sc, 6 * sc); c.restore(); glow(c, x + 90 * sc, y - 460 * sc, 260 * sc, 'rgba(63,240,230,', 0.55 * clamp(kd, 0, 1) * fl); }
    WINDOWS.forEach(([wx, wy], i) => { const k = clamp(kw * WINDOWS.length - i, 0, 1); if (k <= 0) return;
      c.save(); c.globalAlpha = 0.75 * k * fl; c.fillStyle = C.cyan; c.fillRect(x + wx * sc, y + wy * sc, 90 * sc, 150 * sc); c.restore();
      c.fillStyle = C.render; c.fillRect(x + (wx + 43) * sc, y + wy * sc, 4 * sc, 150 * sc); glow(c, x + (wx + 45) * sc, y + (wy + 75) * sc, 150 * sc, 'rgba(63,240,230,', 0.35 * k * fl); });
  }
  /** the STEPS of a house at (x, y) scale sc, as frame points, after a pavement run from `from` (n prints) */
  const toDoor = (from, x, y, sc, n = 6, via = null) => { const foot0 = [x + (STEPS[0][0] - 70) * sc, y + 30 * sc];
    return [...path(from, via || foot0, n), ...STEPS.map(([sx, sy]) => [x + sx * sc, y + sy * sc])]; };

  // ── what got out: glowing footprints, a pair at a time ───────────────────────────────────────────────────────
  const foot = () => sprite('ot_foot', 60, 90, 30, 45, (g) => {
    g.fillStyle = C.cyan; g.beginPath(); g.ellipse(0, 6, 14, 24, 0, 0, TAU); g.fill();
    for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-12 + i * 6, -24 + Math.abs(i - 2) * 3, 4 - Math.abs(i - 2) * 0.6, 0, TAU); g.fill(); }
  }, 3);
  /** a trail of footprints along points, revealed up to k (0..1); each print glows. `sz` is a scale, or a function of y */
  function trail(c, pts, k, sz = 1, lt = 0) {
    const n = pts.length, m = Math.floor(clamp(k, 0, 1) * n);
    for (let i = 0; i < m; i++) {
      const [x, y] = pts[i], [x2, y2] = i < n - 1 ? pts[i + 1] : [2 * x - pts[Math.max(0, i - 1)][0], 2 * y - pts[Math.max(0, i - 1)][1]], a = Math.atan2(x2 - x, -(y2 - y)), side = i % 2 ? 1 : -1;
      const s = typeof sz === 'function' ? sz(y) : sz;
      const ox = Math.cos(a) * 14 * side * s, oy = Math.sin(a) * 14 * side * s;
      glow(c, x + ox, y + oy, 40 * s, 'rgba(63,240,230,', 0.35);
      put(c, foot(), x + ox, y + oy, { sc: s * 0.8, rot: a, lift: 0.2 });
    }
  }
  /** points along a path from a to b, `n` steps, with an optional arc up (steps are climbed as the y drops) */
  const path = (a, b, n) => Array.from({ length: n }, (_, i) => [lerp(a[0], b[0], i / (n - 1)), lerp(a[1], b[1], i / (n - 1))]);

  // ── the EU's letter, and the viewer's doormat ─────────────────────────────────────────────────────────────────
  const envelope = () => sprite('ot_env', 380, 260, 190, 130, (g) => {
    g.fillStyle = C.eu; g.fillRect(-170, -110, 340, 220); g.fillStyle = C.euD; g.beginPath(); g.moveTo(-170, -110); g.lineTo(0, 10); g.lineTo(170, -110); g.closePath(); g.fill();
    g.fillStyle = C.gold; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.arc(-110 + Math.cos(a) * 34, 36 + Math.sin(a) * 34, 5, 0, TAU); g.fill(); }
    g.fillStyle = C.cream; g.font = '18px "ArchivoBlack-400"'; g.textAlign = 'left'; g.fillText('REQUEST FOR', -48, 34); g.fillText('INFORMATION', -48, 60);
  }, 8);
  const mat = () => sprite('ot_mat', 760, 300, 380, 150, (g) => {
    g.fillStyle = '#6b4a2a'; g.beginPath(); g.roundRect(-340, -120, 680, 240, 16); g.fill(); g.fillStyle = '#7d5833'; g.beginPath(); g.roundRect(-320, -100, 640, 200, 12); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -310; x < 310; x += 10) g.fillRect(x, -96, 3, 192);
    g.fillStyle = '#2d1e10'; g.font = '84px "Anton-400"'; g.textAlign = 'center'; g.fillText('WELCOME', 0, 30);
  }, 10);
  return { C, at, dur, ui, ease, punch, sky, pavement, lab, sign, testLight, house, houseLit, STEPS, toDoor, foot, trail, path, envelope, mat, FP };
})();
