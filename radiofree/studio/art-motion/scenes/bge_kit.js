// THE KIT for "Break Glass in Emergency" (The Brink 2): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the
// pipeline, on a winter night at Finland's closed eastern border. One question: when does a temporary law stop being
// temporary? A guardhouse by a lowered barrier; on its wall a red IN EMERGENCY / BREAK GLASS case with the law inside
// it; its inspection tag says VALID TO 2025. Snow and dust gather on the glass while the days pass, and the glass is
// never broken; the red marker (rough.js, as ml_mark in ml_kit.js) strikes the year and writes the next one, on the
// wall and then on the committee's desk beside the proposal, and on "agreed" a stamp comes down while two small
// DISSENT cards slide in. The end is the case again, snowed over, its tag reading 2025, 2026, 2028.
// Sober on purpose (plan/films/19-break-glass.md): no people at the border, no crowd, no flags, no party colours,
// nothing that argues the threat. The aim is the word "temporary".
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs),
// so the tag drops on "one year", the strike lands on "In 2025" and the stamp on "agreed" in every language.
// Everything is a pure function of the shot's local time.
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
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  const swing = (lt, kicks, idle = 0.02) => kicks.reduce((a, [t, s]) => a + (lt > t ? s * Math.exp(-(lt - t) * 2.6) * Math.sin((lt - t) * 8.5) : 0), idle * Math.sin(lt * 1.7));
  const JP = '"NotoSansJP-800"';
  const SH = 6.428571;                                                       // one shot, for continuity across cuts

  const C = {
    sky: ['#06080f', '#090d18', '#0d1322', '#121a2d', '#182238', '#1f2b44', '#283652', '#33425f'],
    moon: '#efe6cf',
    far: '#1c2c3c', farS: '#3a4a5c', mid: '#14261f', midS: '#9fb0be', near: '#0f1d18',
    snow: '#dde4ea', snowS: '#b5c1cd', snowD: '#8e9cb0', road: '#c3cbd3', rut: '#a2adb9',
    wood: '#3b4754', woodD: '#323d49', woodL: '#46535f', seam: '#1b2229', roofD: '#1d2228',
    win: '#ffd98a', lamp: '#ffe2a0',
    boomR: '#b8352a', boomW: '#ece6da', post: '#3a3f47', postL: '#5a616c',
    caseR: '#c0392b', caseD: '#8a2519', caseL: '#de5a45', plate: '#efe6cf', back: '#24201c',
    book: '#e8dcc0', bookD: '#cbbd9c', ink: '#15120f', red: '#d8402f', tag: '#e3a33a', tagD: '#b77d22', thread: '#ece2c6',
    chain: '#9aa1aa', hammer: '#c0392b', handle: '#8a6a44', web: 'rgba(236,230,214,',
    desk: '#4a2f1d', deskL: '#5a3a24', deskD: '#38220f', blot: '#1f3a33', blotL: '#2a4a41', paper: '#f1e8d2', paperD: '#d9cdb1', grey: '#b9ad93',
    stamp: '#2f7a4f', stampW: '#6b4a2e', stampD: '#3d2a1a', dissent: '#efe6cf',
  };

  // ── the corner tag (CW.tag's look), with a Japanese face behind the Latin one ──────────────────────────────────────
  function tag(c, text, lt, dd, x = 110) {
    const y = R.SAFE_B - 66, a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dd - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = `32px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }

  // ── snow: flakes falling at their own speeds, a pure function of time ─────────────────────────────────────────────
  const FLAKES = (() => { const r = U.rng(311); return Array.from({ length: 170 }, () => ({ x: r() * 1240 - 80, y: r() * 2120, v: 50 + r() * 80, s: 1.6 + r() * r() * 5, p: r() * TAU, a: 0.45 + r() * 0.5 })); })();
  function snowfall(c, T, ox, oy, { n = 170, sz = 1, a = 0.85, wind = 18 } = {}) {
    c.save(); c.fillStyle = C.snow;
    for (let i = 0; i < n; i++) {
      const f = FLAKES[i], y = ((f.y + T * f.v * (0.6 + f.s / 8)) % 2120) - 100, x = f.x + Math.sin(T * 0.7 + f.p) * wind + T * 9 + ox * f.s / 5;
      c.globalAlpha = a * f.a; c.beginPath(); c.arc(((x % 1240) + 1240) % 1240 - 80, y + oy * f.s / 5, f.s * sz, 0, TAU); c.fill();
    }
    c.restore();
  }

  // ═══════════════ the wide: a closed crossing at night ═══════════════
  const sky = () => sheet('bge_sky', (g) => {
    g.fillStyle = C.sky[0]; g.fillRect(-90, -90, W + 180, H + 180);
    C.sky.forEach((col, i) => {
      if (!i) return;
      const y0 = -60 + i * 150; g.fillStyle = col; g.beginPath(); g.moveTo(-90, H + 90);
      for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, y0 + Math.sin(x * 0.008 + i * 2.1) * 10 + Math.sin(x * 0.027 + i) * 4);
      g.lineTo(W + 90, H + 90); g.closePath(); g.fill();
    });
    const r = U.rng(17);
    for (let i = 0; i < 120; i++) { const x = r() * (W + 180) - 90, y = r() * 900 - 60, s = r(); g.fillStyle = `rgba(239,230,207,${0.25 + s * 0.5})`; g.beginPath(); g.arc(x, y, 0.8 + s * 1.8, 0, TAU); g.fill(); }
    const gr = g.createRadialGradient(812, 600, 30, 812, 600, 220); gr.addColorStop(0, 'rgba(239,230,207,.18)'); gr.addColorStop(1, 'rgba(239,230,207,0)'); g.fillStyle = gr; g.fillRect(560, 360, 520, 480);
    g.fillStyle = C.moon; g.beginPath(); g.arc(812, 600, 46, 0, TAU); g.fill();
    g.fillStyle = 'rgba(180,170,150,.35)'; for (const [x, y, rr] of [[798, 590, 9], [826, 612, 6], [806, 620, 5]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
  }, 10);
  /** a spruce: a zigzag of tiers, snow on the tips of the near ones */
  function spruce(g, x, yb, h, col, snow = null) {
    const n = 7, w = h * 0.36, pts = [[x, yb - h]];
    for (let i = 1; i <= n; i++) { const y = yb - h + (h * 0.88) * (i / n), ww = w * (0.18 + 0.82 * i / n); pts.push([x + ww, y], [x + ww * 0.42, y - h * 0.035]); }
    const left = pts.slice(1).map(([px, py]) => [2 * x - px, py]).reverse();
    g.fillStyle = col; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(([px, py]) => g.lineTo(px, py)); g.lineTo(x + h * 0.03, yb); g.lineTo(x - h * 0.03, yb); left.forEach(([px, py]) => g.lineTo(px, py)); g.closePath(); g.fill();
    if (snow) { g.fillStyle = snow; for (let i = 1; i <= n; i++) { const y = yb - h + (h * 0.88) * (i / n), ww = w * (0.18 + 0.82 * i / n); g.beginPath(); g.moveTo(x - ww * 0.95, y - 2); g.lineTo(x - ww * 0.45, y - h * 0.05); g.lineTo(x - ww * 0.2, y - h * 0.03); g.closePath(); g.fill(); } }
  }
  const ROADY = 1110, roadX = (y, side) => { const k = (y - ROADY) / (H - ROADY); return side < 0 ? lerp(512, 240, k) : lerp(568, 840, k); };
  const far = () => sheet('bge_far', (g) => {
    const r = U.rng(5);
    g.fillStyle = C.far; g.fillRect(-90, 1060, W + 180, 120);
    for (let x = -90; x < W + 110; x += 26 + r() * 18) spruce(g, x, 1100 + r() * 14, 120 + r() * 120, C.far);
  }, 8);
  const mid = () => sheet('bge_mid', (g) => {
    const r = U.rng(9);
    for (let x = -90; x < W + 110; x += 46 + r() * 30) { if (x > 448 && x < 632) continue; spruce(g, x, 1130 + r() * 18, 230 + r() * 170, C.mid, 'rgba(200,214,226,.75)'); }
  }, 10);
  const ground = () => sheet('bge_ground', (g) => {
    g.fillStyle = C.snowS; g.beginPath(); g.moveTo(-90, H + 90); g.lineTo(-90, 1120);
    for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, 1108 + Math.sin(x * 0.012) * 8 + Math.sin(x * 0.041) * 3);
    g.lineTo(W + 90, H + 90); g.closePath(); g.fill();
    g.fillStyle = C.snow; g.beginPath(); g.moveTo(-90, H + 90); g.lineTo(-90, 1180);
    for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, 1170 + Math.sin(x * 0.009 + 1) * 14);
    g.lineTo(W + 90, H + 90); g.closePath(); g.fill();
    g.fillStyle = C.road; g.beginPath(); g.moveTo(roadX(ROADY, -1), ROADY); g.lineTo(roadX(ROADY, 1), ROADY); g.lineTo(roadX(H + 90, 1), H + 90); g.lineTo(roadX(H + 90, -1), H + 90); g.closePath(); g.fill();
    g.strokeStyle = C.rut; g.lineWidth = 6; for (const u of [0.28, 0.4, 0.6, 0.72]) { g.beginPath(); g.moveTo(lerp(roadX(ROADY, -1), roadX(ROADY, 1), u), ROADY); g.lineTo(lerp(roadX(H + 90, -1), roadX(H + 90, 1), u), H + 90); g.stroke(); }
    g.fillStyle = C.snow; for (const side of [-1, 1]) { g.beginPath(); for (let y = ROADY; y <= H + 90; y += 20) { const x = roadX(y, side) + side * 4 + Math.sin(y * 0.05) * 3; y === ROADY ? g.moveTo(x, y) : g.lineTo(x, y); } g.lineTo(roadX(H + 90, side) - side * 40, H + 90); g.lineTo(roadX(ROADY, side) - side * 4, ROADY); g.closePath(); g.fill(); }
  }, 12);
  const fore = () => sheet('bge_fore', (g) => {
    g.fillStyle = C.snow; g.beginPath(); g.moveTo(-90, H + 90); g.lineTo(-90, 1760);
    for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, 1770 - Math.sin((x + 90) / (W + 180) * Math.PI) * 50 + Math.sin(x * 0.03) * 8);
    g.lineTo(W + 90, H + 90); g.closePath(); g.fill();
    spruce(g, -40, 1960, 760, C.near, 'rgba(210,222,232,.9)'); spruce(g, 1130, 1990, 820, C.near, 'rgba(210,222,232,.9)');
  }, 14);
  /** the guardhouse, red board under a snowed roof: a lit window, and on its wall the small red case under a lamp */
  const HUT = { x: 270, y: 1300 }, HUT_CASE = [342, 1176], HUT_LAMP = [342, 1112];
  const hut = () => sprite('bge_hut', 420, 420, 210, 400, (g) => {
    g.fillStyle = C.woodD; g.fillRect(-160, -250, 320, 250);
    g.fillStyle = C.wood; for (let x = -160; x < 160; x += 26) { g.fillRect(x + 2, -250, 22, 250); }
    g.fillStyle = C.seam; for (let x = -160; x < 160; x += 26) g.fillRect(x, -250, 2, 250);
    g.fillStyle = C.roofD; g.beginPath(); g.moveTo(-190, -246); g.lineTo(0, -350); g.lineTo(190, -246); g.closePath(); g.fill();
    g.fillStyle = C.snow; g.beginPath(); g.moveTo(-200, -244); g.lineTo(0, -362); g.lineTo(200, -244); g.lineTo(186, -232); g.lineTo(0, -338); g.lineTo(-186, -232); g.closePath(); g.fill();
    g.fillStyle = C.snowS; g.fillRect(-196, -240, 392, 8);
    g.fillStyle = C.roofD; g.fillRect(-122, -190, 92, 82); g.fillStyle = C.win; g.fillRect(-114, -182, 76, 66); g.fillStyle = C.woodD; g.fillRect(-78, -182, 4, 66); g.fillRect(-114, -151, 76, 4);
    g.fillStyle = C.snow; g.fillRect(-126, -110, 100, 8);
    g.fillStyle = C.roofD; g.fillRect(-10, -150, 74, 150); g.fillStyle = C.woodL; g.fillRect(-4, -144, 62, 144); g.fillStyle = C.ink; g.beginPath(); g.arc(46, -72, 4, 0, TAU); g.fill();
    // the case on the wall, small at this distance
    g.fillStyle = C.caseD; g.fillRect(HUT_CASE[0] - HUT.x - 27, HUT_CASE[1] - HUT.y - 34, 54, 68); g.fillStyle = C.caseR; g.fillRect(HUT_CASE[0] - HUT.x - 25, HUT_CASE[1] - HUT.y - 33, 50, 64);
    g.fillStyle = C.plate; g.fillRect(HUT_CASE[0] - HUT.x - 20, HUT_CASE[1] - HUT.y - 29, 40, 11);
    g.fillStyle = '#3c4a55'; g.fillRect(HUT_CASE[0] - HUT.x - 19, HUT_CASE[1] - HUT.y - 14, 38, 42); g.fillStyle = C.book; g.fillRect(HUT_CASE[0] - HUT.x - 10, HUT_CASE[1] - HUT.y - 8, 20, 28);
    g.fillStyle = C.post; g.fillRect(HUT_LAMP[0] - HUT.x - 2, HUT_LAMP[1] - HUT.y - 20, 4, 14); g.fillRect(HUT_LAMP[0] - HUT.x - 12, HUT_LAMP[1] - HUT.y - 8, 24, 8);
    g.fillStyle = C.snow; g.beginPath(); g.moveTo(-170, 0); g.quadraticCurveTo(0, -26, 170, 0); g.closePath(); g.fill();
  }, 10);
  /** the barrier: a striped boom across the road on a post with its counterweight, a CLOSED sign hung in the middle */
  const BOOM = { x: 452, y: 1352 };
  const boom = () => sprite('bge_boom', 560, 300, 60, 200, (g) => {
    g.fillStyle = C.post; g.fillRect(-16, -130, 32, 236); g.fillStyle = C.postL; g.fillRect(-16, -130, 8, 236);
    g.fillStyle = '#2b2f36'; g.fillRect(-58, -36, 46, 52);
    const L = 470; g.fillStyle = C.boomW; g.beginPath(); g.roundRect(0, -16, L, 26, 8); g.fill();
    g.fillStyle = C.boomR; for (let x = 24; x < L - 10; x += 70) g.fillRect(x, -16, 35, 26);
    g.fillStyle = C.snow; g.beginPath(); g.roundRect(-4, -24, L + 2, 10, 5); g.fill(); g.beginPath(); g.ellipse(0, -132, 22, 8, 0, 0, TAU); g.fill();
  }, 8);
  const closed = () => sprite('bge_closed', 200, 120, 100, 10, (g) => {
    g.strokeStyle = C.chain; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-50, 0); g.lineTo(-62, 26); g.moveTo(50, 0); g.lineTo(62, 26); g.stroke();
    g.fillStyle = C.boomR; g.beginPath(); g.roundRect(-88, 24, 176, 74, 6); g.fill(); g.fillStyle = C.boomW; g.beginPath(); g.roundRect(-80, 32, 160, 58, 4); g.fill();
    g.fillStyle = C.boomR; g.textAlign = 'center'; g.font = '400 50px "Anton-400"'; g.fillText('CLOSED', 0, 80);
  }, 6);

  SCENES.bge_gate = { draw(c, lt) {
    const id = 'bge_gate', dd = dur(id), tL = at(id, 'lamp', 2.4);
    const kz = ease.io(lt / dd), cam = { x: Math.sin(lt * 0.25) * 8, y: 0, z: punch(lt, [tL], { kick: 0.02 }) * lerp(1.0, 1.1, kz), fx: 360, fy: 1180 };
    const lampOn = lt > tL ? 1 - (lt - tL < 0.25 ? (Math.floor((lt - tL) * 24) % 2) * 0.6 : 0) : 0;
    stack(c, [{ sh: sky(), d: 0.02, lift: 0 }, { sh: far(), d: 0.06, lift: 0.4 }, { sh: mid(), d: 0.12, lift: 0.8 }, { sh: ground(), d: 0.16, lift: 0.6 },
      { d: 0.2, fn: (g, ox, oy) => {
        put(g, hut(), HUT.x + ox, HUT.y + oy, { lift: 1.2 });
        glow(g, 194 + ox, 1152 + oy, 70, 'rgba(255,214,140,', 0.35);
        if (lampOn > 0) { glow(g, HUT_LAMP[0] + ox, HUT_LAMP[1] + oy, 110, 'rgba(255,214,140,', 0.55 * lampOn); glow(g, HUT_CASE[0] + ox, HUT_CASE[1] + oy, 60, 'rgba(255,226,170,', 0.35 * lampOn); g.fillStyle = C.lamp; g.globalAlpha = lampOn; g.beginPath(); g.arc(HUT_LAMP[0] + ox, HUT_LAMP[1] + oy + 4, 7, 0, TAU); g.fill(); g.globalAlpha = 1; }
        put(g, boom(), BOOM.x + ox, BOOM.y + oy, { lift: 1.2 });
        put(g, closed(), BOOM.x + 250 + ox, BOOM.y + 2 + oy, { lift: 1.0, rot: swing(lt, [], 0.025) });
      } },
      { d: 0.3, fn: (g, ox, oy) => snowfall(g, lt, ox, oy, { n: 150, sz: 1, a: 0.8 }) },
      { sh: fore(), d: 0.34, lift: 1.4 }], cam);
    tag(c, ui('border', 'EASTERN BORDER · FINLAND'), lt, dd);
    box(c);
  } };

  // ═══════════════ the case on the wall, close ═══════════════
  const wall = () => sheet('bge_wall', (g) => {
    g.fillStyle = C.seam; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(71);
    for (let x = -90, i = 0; x < W + 90; x += 124, i++) {
      g.fillStyle = [C.wood, C.woodD, C.woodL][i % 3 === 1 ? 1 : i % 3 === 2 ? 2 : 0]; g.fillRect(x + 4, -90, 118, H + 180);
      g.fillStyle = 'rgba(0,0,0,.13)'; for (let k = 0; k < 7; k++) { const gx = x + 14 + r() * 96; g.fillRect(gx, -90, 1.6, H + 180); }
      g.fillStyle = 'rgba(255,230,200,.05)'; g.fillRect(x + 4, -90, 10, H + 180);
      g.fillStyle = '#151a20'; for (const y of [300, 1100, 1760]) { g.beginPath(); g.arc(x + 64, y + r() * 30, 4, 0, TAU); g.fill(); }
    }
    g.fillStyle = C.snowS; g.beginPath(); g.moveTo(-90, H + 90); g.lineTo(-90, 1680); for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, 1664 + Math.sin(x * 0.02) * 12); g.lineTo(W + 90, H + 90); g.closePath(); g.fill();
    g.fillStyle = C.snow; g.beginPath(); g.moveTo(-90, H + 90); g.lineTo(-90, 1720); for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, 1708 + Math.sin(x * 0.015 + 2) * 16); g.lineTo(W + 90, H + 90); g.closePath(); g.fill();
  }, 10);
  const CS = { x: 540, y: 858, w: 500, h: 620 };                              // the case, close
  const GL = { x0: -222, x1: 222, y0: -170, y1: 290 };                          // its glass, in case coordinates
  const theCase = () => sprite('bge_case', 540, 660, 270, 330, (g) => {
    const w = CS.w, h = CS.h;
    g.fillStyle = C.caseD; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 12); g.fill();
    g.fillStyle = C.caseR; g.beginPath(); g.roundRect(-w / 2 + 6, -h / 2 + 4, w - 12, h - 12, 10); g.fill();
    g.fillStyle = C.caseL; g.fillRect(-w / 2 + 12, -h / 2 + 8, w - 24, 5); g.fillRect(-w / 2 + 12, -h / 2 + 8, 5, h - 24);
    g.fillStyle = C.plate; g.beginPath(); g.roundRect(-200, -h / 2 + 22, 400, 112, 6); g.fill();
    g.fillStyle = C.caseR; g.textAlign = 'center'; g.font = '400 44px "Anton-400"'; g.fillText('IN EMERGENCY', 0, -h / 2 + 70); g.font = '400 54px "Anton-400"'; g.fillText('BREAK GLASS', 0, -h / 2 + 124);
    g.fillStyle = C.caseD; g.fillRect(GL.x0 - 10, GL.y0 - 10, GL.x1 - GL.x0 + 20, GL.y1 - GL.y0 + 20);
    g.fillStyle = C.back; g.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0);
    // the law, on two clips
    const bx = -160, by = -130, bw = 320, bh = 390;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(bx + 8, by + 10, bw, bh);
    g.fillStyle = C.book; g.fillRect(bx, by, bw, bh); g.fillStyle = C.bookD; g.fillRect(bx, by + bh - 10, bw, 10);
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '700 23px "LibreBaskerville-700"';
    ['ACT ON', 'TEMPORARY', 'MEASURES TO', 'COMBAT', 'INSTRUMENTALISED', 'MIGRATION'].forEach((s, i) => g.fillText(s, 0, by + 58 + i * 33));
    g.fillRect(-70, by + 268, 140, 3);
    g.font = '400 58px "Anton-400"'; g.fillText('2024', 0, by + 345);
    g.fillStyle = C.postL; for (const x of [-120, 120]) { g.fillRect(x - 14, by - 14, 28, 22); }
    g.fillStyle = C.caseD; g.beginPath(); g.arc(0, h / 2 - 24, 9, 0, TAU); g.fill();
  }, 10);
  /** the lamp on its bracket above the case */
  const LAMP = [540, 478];
  const lamp = () => sprite('bge_lamp', 120, 120, 60, 60, (g) => {
    g.fillStyle = C.post; g.fillRect(-4, -60, 8, 30); g.fillRect(-26, -34, 52, 14);
    g.fillStyle = C.lamp; g.beginPath(); g.arc(0, 0, 16, 0, Math.PI, true); g.lineTo(-16, 0); g.fill(); g.beginPath(); g.ellipse(0, 2, 16, 14, 0, 0, Math.PI); g.fill();
    g.strokeStyle = C.post; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 20, Math.PI, 0); g.stroke(); for (const x of [-10, 0, 10]) { g.beginPath(); g.moveTo(x, -20); g.lineTo(x * 1.2, 18); g.stroke(); }
  }, 6);
  /** the hammer on its chain beside the case, never taken down */
  const HAM = [196, 650];
  const hammer = () => sprite('bge_hammer', 140, 460, 70, 10, (g) => {
    g.fillStyle = C.post; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
    g.strokeStyle = C.chain; g.lineWidth = 3; for (let y = 10; y < 250; y += 18) { g.beginPath(); g.ellipse(0, y + 8, 5, 9, 0, 0, TAU); g.stroke(); }
    g.fillStyle = C.handle; g.fillRect(-8, 258, 16, 130); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(2, 258, 6, 130);
    g.fillStyle = C.hammer; g.beginPath(); g.roundRect(-46, 384, 92, 40, 6); g.fill(); g.fillStyle = C.caseL; g.fillRect(-42, 386, 84, 5);
  }, 8);

  // ── the inspection tag: a card that stays put, and its years drawn live so the marker can strike and write them ──
  const tagBody = () => sprite('bge_tag', 280, 380, 140, 6, (g) => {
    g.strokeStyle = C.thread; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 54); g.stroke();
    g.fillStyle = C.tag; g.beginPath(); g.moveTo(-74, 46); g.lineTo(74, 46); g.lineTo(112, 78); g.lineTo(112, 352); g.lineTo(-112, 352); g.lineTo(-112, 78); g.closePath(); g.fill();
    g.fillStyle = C.tagD; g.fillRect(-112, 342, 224, 10);
    g.fillStyle = '#efe6cf'; g.beginPath(); g.arc(0, 70, 12, 0, TAU); g.fill(); g.fillStyle = C.ink; g.beginPath(); g.arc(0, 70, 5, 0, TAU); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '400 46px "Anton-400"'; g.fillText('VALID TO', 0, 134);
    g.fillStyle = 'rgba(21,18,15,.35)'; for (const y of [212, 274, 336]) g.fillRect(-84, y, 168, 2);
  }, 7);
  const ROWS = [{ y: 206, text: '2025', ink: C.ink }, { y: 268, text: '2026', ink: C.red }, { y: 330, text: '2028', ink: C.red }];
  const GEN = () => rough.generator();
  const SVG = () => document.createElementNS('http://www.w3.org/2000/svg', 'path');
  function mkMark(t0, dd, drawables) {
    const el = SVG();
    const parts = drawables.flatMap((dr) => GEN().toPaths(dr)).filter((p) => p.d && p.stroke !== 'none').map((p) => { el.setAttribute('d', p.d); return { p: new Path2D(p.d), d: p.d, len: el.getTotalLength(), stroke: p.stroke, w: p.strokeWidth || 6 }; });
    const first = parts[0], last = parts[parts.length - 1];
    el.setAttribute('d', first.d); const a = el.getPointAtLength(0); el.setAttribute('d', last.d); const b = el.getPointAtLength(last.len);
    return { t0, dur: dd, parts, total: parts.reduce((s, q) => s + q.len, 0), start: [a.x, a.y], end: [b.x, b.y] };
  }
  const ink = (seed, extra = {}) => ({ seed, roughness: 1.2, bowing: 1.1, stroke: C.red, strokeWidth: 7, ...extra });
  function drawMark(g, m, k) {
    let left = m.total * clamp(k, 0, 1), tip = null; const el = SVG();
    for (const q of m.parts) {
      if (left <= 0) break; const run = Math.min(q.len, left); left -= run;
      g.save(); g.strokeStyle = q.stroke; g.lineWidth = q.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([run, q.len + 10]); g.stroke(q.p); g.restore();
      if (run < q.len || left <= 0) { el.setAttribute('d', q.d); const p = el.getPointAtLength(run); tip = [p.x, p.y]; }
    }
    return tip;
  }
  const STRIKE = [0, 1].map((i) => (t0, dd = 0.28) => mkMark(t0, dd, [GEN().line(-78, ROWS[i].y - 20, 80, ROWS[i].y - 24, ink(60 + i, { strokeWidth: 8 }))]));
  const ROUND = (t0) => mkMark(t0, 0.42, [GEN().ellipse(0, ROWS[2].y - 22, 210, 78, ink(71, { strokeWidth: 7 }))]);
  /**
   * The tag at T = {x, y, rot, sc} (its string's top). st: rows written [{row, t0}] (t0 -10 = already there),
   * marks [mark] in tag coordinates. Returns the pen (layer coordinates) while something is being written or drawn.
   */
  function drawTag(g, T, lt, st) {
    put(g, tagBody(), T.x, T.y, { rot: T.rot, sc: T.sc, lift: T.lift ?? 0.9 });
    g.save(); g.translate(T.x, T.y); g.rotate(T.rot); g.scale(T.sc, T.sc);
    let tip = null;
    for (const w of st.rows) {
      const k = (lt - w.t0) / 0.45; if (k <= 0) continue; const Rw = ROWS[w.row];
      g.save(); g.beginPath(); g.rect(-100, Rw.y - 70, 200 * clamp(k, 0, 1) + 4, 90); g.clip();
      g.fillStyle = Rw.ink; g.textAlign = 'center'; g.font = '600 70px "Caveat-600"'; g.fillText(Rw.text, 0, Rw.y); g.restore();
      if (k < 1) tip = [-74 + 150 * k, Rw.y - 12 - 16 * Math.abs(Math.sin(k * 18))];
    }
    for (const m of st.marks || []) { const k = (lt - m.t0) / m.dur; if (k <= 0) continue; const tp = drawMark(g, m, ease.out(k)); if (k < 1 && tp) tip = tp; }
    g.restore();
    return tip ? tagToLayer(T, tip) : null;
  }
  const tagToLayer = (T, p) => [T.x + T.sc * (Math.cos(T.rot) * p[0] - Math.sin(T.rot) * p[1]), T.y + T.sc * (Math.sin(T.rot) * p[0] + Math.cos(T.rot) * p[1])];
  /** the marker in a gloved hand, its tip at `pen` — the house's hand, as ml_mark draws it */
  function marker(g, pen, rot = -0.5) {
    const ax = Math.sin(-rot), ay = Math.cos(rot);
    g.save(); g.translate(pen[0], pen[1]); g.rotate(rot);
    g.fillStyle = C.red; g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, 26); g.lineTo(10, 26); g.closePath(); g.fill();
    g.fillStyle = '#2a2420'; g.fillRect(-16, 26, 32, 190); g.fillStyle = C.red; g.fillRect(-16, 196, 32, 22); g.restore();
    fist(g, pen[0] + ax * 120, pen[1] + ay * 120, 0.62, rot, { sleeve: K.green, cuff: K.red, len: 1500 });
  }
  function penAt(lt, keys) {
    if (lt <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (lt <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = ease.io((lt - t0) / Math.max(1e-3, t1 - t0)); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
    return keys[keys.length - 1][1];
  }

  // ── what time does to the case: snow on its top, ice on its sill, dust on its glass, a web from the hammer ──────────
  const SPECK = (() => { const r = U.rng(91); return Array.from({ length: 240 }, () => ({ x: lerp(GL.x0 + 6, GL.x1 - 6, r()), y: lerp(GL.y0 + 6, GL.y1 - 6, Math.pow(r(), 0.7)), s: 1 + r() * 3, th: r() })); })();
  function glass(g, X, Y, dust, gleam) {
    g.save(); g.translate(X, Y);
    g.fillStyle = `rgba(150,190,210,${0.14 + dust * 0.1})`; g.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0);
    g.fillStyle = `rgba(190,184,170,${dust * 0.22})`; g.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0);
    g.fillStyle = 'rgba(214,206,190,.75)'; for (const s of SPECK) if (s.th < dust) { g.globalAlpha = clamp((dust - s.th) * 8, 0, 1) * 0.8; g.fillRect(s.x, s.y, s.s, s.s); }
    g.globalAlpha = 1;
    g.save(); g.beginPath(); g.rect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0); g.clip();
    g.fillStyle = 'rgba(255,255,255,.10)'; g.beginPath(); g.moveTo(GL.x0 + 40, GL.y0); g.lineTo(GL.x0 + 120, GL.y0); g.lineTo(GL.x0 - 60, GL.y1); g.lineTo(GL.x0 - 140, GL.y1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(GL.x0 + 160, GL.y0); g.lineTo(GL.x0 + 190, GL.y0); g.lineTo(GL.x0 + 10, GL.y1); g.lineTo(GL.x0 - 20, GL.y1); g.closePath(); g.fill();
    if (gleam > 0 && gleam < 1) { const x = lerp(GL.x0 - 260, GL.x1 + 120, gleam), a = Math.sin(Math.PI * gleam); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(x - 90, 0, x + 90, 0); gr.addColorStop(0, 'rgba(255,250,235,0)'); gr.addColorStop(0.5, `rgba(255,250,235,${0.78 * a})`); gr.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 30, GL.y0); g.lineTo(x + 150, GL.y0); g.lineTo(x - 10, GL.y1); g.lineTo(x - 190, GL.y1); g.closePath(); g.fill(); }
    g.restore();
    g.restore();
  }
  function snowcap(g, X, Y, h) {
    if (h <= 0) return; const top = Y - CS.h / 2 + 4;
    g.save(); g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(X - CS.w / 2 - 6, top + 6);
    for (let x = -CS.w / 2 - 6; x <= CS.w / 2 + 6; x += 10) g.lineTo(X + x, top + 6 - h * (0.75 + 0.25 * Math.sin(x * 0.03 + 1)) * Math.pow(Math.sin(Math.PI * (x + CS.w / 2 + 6) / (CS.w + 12)), 0.25));
    g.lineTo(X + CS.w / 2 + 6, top + 6); g.closePath(); g.fill();
    g.fillStyle = C.snow; g.beginPath(); g.moveTo(X - CS.w / 2 - 8, top);
    for (let x = -CS.w / 2 - 8; x <= CS.w / 2 + 8; x += 10) g.lineTo(X + x, top - h * (0.75 + 0.25 * Math.sin(x * 0.03 + 1)) * Math.pow(Math.sin(Math.PI * (x + CS.w / 2 + 8) / (CS.w + 16)), 0.25));
    g.lineTo(X + CS.w / 2 + 8, top + 8); g.quadraticCurveTo(X, top + 16, X - CS.w / 2 - 8, top + 8); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(X - CS.w / 2 + 10, top - h * 0.8, CS.w - 20, 3);
    g.restore();
  }
  const ICE = (() => { const r = U.rng(43); return Array.from({ length: 13 }, (_, i) => ({ x: -220 + i * 36 + r() * 10, l: 0.4 + r() * 0.6, w: 6 + r() * 6 })); })();
  function icicles(g, X, Y, k) {
    if (k <= 0) return; const y0 = Y + CS.h / 2 - 8;
    for (const s of ICE) { const L = 70 * s.l * k; g.fillStyle = 'rgba(214,232,242,.9)'; g.beginPath(); g.moveTo(X + s.x - s.w, y0); g.lineTo(X + s.x + s.w, y0); g.lineTo(X + s.x + 1, y0 + L); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(X + s.x - s.w * 0.5, y0, 2, L * 0.6); }
  }
  function cobweb(g, X, Y, k) {
    if (k <= 0) return; const cx = X - CS.w / 2 + 2, cy = Y - CS.h / 2 + 150;            // anchored at the case's left edge, out to the chain
    const anchors = [[HAM[0] + 4, HAM[1] + 40], [HAM[0] + 4, HAM[1] + 190], [cx, cy - 120], [cx, cy + 160], [HAM[0] + 2, HAM[1] + 120]];
    const hub = [lerp(HAM[0], cx, 0.55), cy + 30];
    g.save(); g.strokeStyle = C.web + (0.5 * clamp(k * 2, 0, 1)) + ')'; g.lineWidth = 1.4;
    for (const a of anchors) { g.beginPath(); g.moveTo(hub[0], hub[1]); g.lineTo(lerp(hub[0], a[0], clamp(k * 1.6, 0, 1)), lerp(hub[1], a[1], clamp(k * 1.6, 0, 1))); g.stroke(); }
    const rings = Math.floor(clamp((k - 0.3) / 0.7, 0, 1) * 6);
    for (let r = 1; r <= rings; r++) { g.beginPath(); anchors.forEach((a, i) => { const p = [lerp(hub[0], a[0], r / 7), lerp(hub[1], a[1], r / 7)]; i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.closePath(); g.stroke(); }
    g.restore();
  }
  /** the wall, the lamp, the hammer and the case with everything time has put on it; returns the tag's anchor */
  function caseLayer(g, ox, oy, lt, st) {
    const X = CS.x + ox, Y = CS.y + oy;
    const on = st.lamp ?? 1;
    glow(g, LAMP[0] + ox, LAMP[1] + oy + 200, 560, 'rgba(255,200,130,', 0.22 * on);
    put(g, lamp(), LAMP[0] + ox, LAMP[1] + oy, { lift: 1.0 });
    glow(g, LAMP[0] + ox, LAMP[1] + oy, 60, 'rgba(255,226,160,', 0.6 * on);
    put(g, hammer(), HAM[0] + ox, HAM[1] + oy, { lift: 1.0, rot: swing(lt, [], 0.004) });
    cobweb(g, X, Y, st.web || 0);
    put(g, theCase(), X, Y, { lift: 1.5 });
    glass(g, X, Y, st.dust || 0, st.gleam ?? -1);
    snowcap(g, X, Y, st.snow || 0);
    icicles(g, X, Y, st.ice || 0);
    return [X + 196, Y + CS.h / 2 - 4];
  }
  /** the light of the days passing: pale bands sweep the wall, one a day, all through the shot */
  function days(g, lt, t1, ox, oy, n = 6) {
    if (lt >= t1) return;
    for (let i = 0; i < n; i++) {
      const a = (t1 * i) / n, b = (t1 * (i + 1)) / n, k = (lt - a) / (b - a); if (k <= 0 || k >= 1) continue;
      const x = lerp(-700, W + 400, k) + ox, s = Math.sin(Math.PI * k);
      g.save(); g.globalCompositeOperation = 'lighter'; const gr = g.createLinearGradient(x - 260, 0, x + 260, 0);
      gr.addColorStop(0, 'rgba(170,200,240,0)'); gr.addColorStop(0.5, `rgba(170,200,240,${0.16 * s})`); gr.addColorStop(1, 'rgba(170,200,240,0)');
      g.fillStyle = gr; g.translate(x, 960 + oy); g.rotate(0.35); g.fillRect(-260, -1400, 520, 2800); g.restore();
    }
  }

  // ═════════ 2 · bge_case: the case on the guardhouse wall; on "one year" the tag drops on: VALID TO 2025 ═════════
  SCENES.bge_case = { draw(c, lt) {
    const id = 'bge_case', dd = dur(id), tT = at(id, 'tag', 3.1);
    const cam = { x: Math.sin(lt * 0.3) * 8, y: 0, z: punch(lt, [tT], { kick: 0.022 }) * lerp(1.06, 1.0, ease.io(lt / dd)), fx: 560, fy: 1000 };
    stack(c, [{ sh: wall(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      const A = caseLayer(g, ox, oy, lt, { lamp: 1, dust: 0.05 }), kD = (lt - tT) / 0.32;
      if (kD > 0) drawTag(g, { x: A[0], y: A[1], rot: swing(lt, [[tT, 0.22]]), sc: ease.back(kD) }, lt, { rows: [{ row: 0, t0: -10 }] });
    } }, { d: 0.3, fn: (g, ox, oy) => snowfall(g, lt + SH, ox, oy, { n: 70, sz: 1.3, a: 0.6 }) }], cam);
    tag(c, ui('inforce', 'IN FORCE 22.7.2024 · ONE YEAR'), lt, dd);
    box(c);
  } };

  // ═════════ 3 · bge_dust: days pass, snow and dust settle; the glass is whole; 2025 struck, 2026 written ═════════
  let M3 = null;
  const marks3 = (tS) => (M3 && M3.key === tS ? M3 : (M3 = { key: tS, strike: STRIKE[0](tS, 0.3) }));
  SCENES.bge_dust = { draw(c, lt) {
    const id = 'bge_dust', dd = dur(id), tG = at(id, 'gleam', 1.3), tS = at(id, 'strike', 2.6), tW = at(id, 'write', 3.6), M = marks3(tS);
    // in on the tag for the strike and the new year, then back out to the case while the snow keeps coming
    const kT = ease.io((lt - tS + 0.6) / 0.9) * (1 - 0.75 * ease.io((lt - tW - 0.8) / 2.6));
    const cam = { x: Math.sin(lt * 0.3 + 1) * 6 * (1 - kT), y: 0, z: punch(lt, [tG], { kick: 0.02, open: 0.02 }) * lerp(1.0, 1.22, kT), fx: lerp(560, 690, kT), fy: lerp(1000, 1290, kT) };
    const grow = ease.io(clamp(lt / dd, 0, 1) * 0.9 + 0.1 * clamp(lt / 0.8, 0, 1)), on = 1;
    stack(c, [{ sh: wall(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => days(g, lt, dd, ox, oy, 7) }, { d: 0.1, fn: (g, ox, oy) => {
      const A = caseLayer(g, ox, oy, lt, { lamp: on, dust: lerp(0.05, 0.45, grow), snow: lerp(0, 34, grow), ice: lerp(0, 0.55, grow), web: lerp(0, 0.7, grow), gleam: (lt - tG) / 0.6 });
      const T = { x: A[0], y: A[1], rot: swing(lt, [[tS, 0.05], [tW + 0.45, 0.04]], 0.012), sc: 1 };
      const tip = drawTag(g, T, lt, { rows: [{ row: 0, t0: -10 }, { row: 1, t0: tW }], marks: [M.strike] });
      const L = (p) => tagToLayer(T, p), rest = [W + 160 + ox, 2060 + oy];
      const pen = tip || penAt(lt, [[tS - 0.6, rest], [tS, L(M.strike.start)], [tS + 0.3, L(M.strike.end)], [tW, L([-74, ROWS[1].y - 12])], [tW + 0.45, L([76, ROWS[1].y - 12])], [tW + 1.3, rest]]);
      if (lt > tS - 0.6 && lt < tW + 1.3) marker(g, pen, -0.62);
    } }, { d: 0.3, fn: (g, ox, oy) => snowfall(g, lt + 2 * SH, ox, oy, { n: 110, sz: 1.3, a: 0.65, wind: 30 }) }], cam);
    tag(c, ui('applied', 'FINNISH GOVERNMENT: NOT APPLIED'), lt, dd);
    box(c);
  } };

  // ═════════ 4 · bge_desk: the committee's desk from above; 2026 struck, 2028 written; "agreed": the stamp; DISSENT ×2 ═════════
  const desk = () => sheet('bge_desk', (g) => {
    g.fillStyle = C.desk; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(29);
    for (let y = -90; y < H + 90; y += 46) { g.fillStyle = r() < 0.5 ? C.deskL : C.deskD; g.globalAlpha = 0.5; g.fillRect(-90, y, W + 180, 22 + r() * 18); }
    g.globalAlpha = 1; g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 160; i++) { const y = r() * (H + 180) - 90; g.fillRect(-90, y, W + 180, 1.2); }
    g.fillStyle = C.blot; g.beginPath(); g.roundRect(120, 500, 860, 1100, 10); g.fill(); g.fillStyle = C.blotL; g.fillRect(120, 500, 860, 6);
    g.fillStyle = C.deskD; g.fillRect(-90, 1700, W + 180, 300);
  }, 10);
  const BILL = { x: 470, y: 970, rot: -0.035 };
  const bill = () => sprite('bge_bill', 580, 800, 290, 400, (g) => {
    g.fillStyle = C.paperD; g.fillRect(-276, -386, 560, 780); g.fillStyle = C.paper; g.fillRect(-280, -390, 560, 780);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = '400 36px "Anton-400"'; g.fillText('GOVERNMENT PROPOSAL', -236, -318);
    g.fillRect(-236, -298, 472, 3);
    { const T = 'TEMPORARY MEASURES ACT'; g.font = '400 60px "Anton-400"'; const fz = Math.min(60, 60 * 472 / g.measureText(T).width); g.font = `400 ${fz.toFixed(1)}px "Anton-400"`; g.fillText(T, -236, -222); }
    g.font = '700 26px "LibreBaskerville-700"'; g.fillText('VALIDITY:', -236, -150); g.fillText('TO 31.12.2028', -236 + g.measureText('VALIDITY:  ').width, -150);
    g.fillText('CHANGES TO CONTENT:', -236, -100); g.fillStyle = C.red; g.fillText('NONE', -236 + g.measureText('CHANGES TO CONTENT:  ').width, -100); g.fillStyle = C.ink;
    g.fillStyle = C.grey; const r = U.rng(3); for (let y = -50; y < 360; y += 30) g.fillRect(-236, y, 300 + r() * 170, 9);
  }, 8);
  const STAMP = [372, 1140];
  /** the rubber stamp, as a stamp is drawn: a knob on a neck, a wooden block, the rubber under it; origin at the rubber */
  const stampTool = () => sprite('bge_stamp', 240, 300, 120, 270, (g) => {
    g.fillStyle = C.stampD; g.beginPath(); g.roundRect(-96, -30, 192, 30, 4); g.fill();
    g.fillStyle = C.stampW; g.beginPath(); g.roundRect(-104, -96, 208, 70, 8); g.fill(); g.fillStyle = '#86603d'; g.fillRect(-104, -96, 208, 12);
    g.fillStyle = C.stampD; g.fillRect(-18, -170, 36, 76);
    g.fillStyle = '#946b47'; g.beginPath(); g.ellipse(0, -196, 56, 44, 0, 0, TAU); g.fill(); g.fillStyle = '#ad8460'; g.beginPath(); g.ellipse(-16, -210, 22, 14, -0.4, 0, TAU); g.fill();
  }, 12);
  function imprint(g, x, y, k) {
    if (k <= 0) return; g.save(); g.translate(x, y); g.rotate(-0.12); g.globalAlpha = clamp(k, 0, 1) * 0.92;
    g.strokeStyle = C.stamp; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 82, 0, TAU); g.stroke(); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 68, 0, TAU); g.stroke();
    g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-34, 2); g.lineTo(-8, 30); g.lineTo(38, -30); g.stroke();
    g.restore();
  }
  const dissentCard = () => sprite('bge_dissent', 250, 110, 125, 55, (g) => {
    g.fillStyle = C.paperD; g.fillRect(-118, -48, 240, 100); g.fillStyle = C.dissent; g.fillRect(-120, -50, 240, 100);
    g.fillStyle = C.red; g.textAlign = 'center'; g.font = '400 52px "Anton-400"'; g.fillText('DISSENT', 0, 20);
  }, 7);
  const GLASS = [210, 1460];
  const water = () => sprite('bge_water', 160, 160, 80, 80, (g) => {
    g.fillStyle = 'rgba(200,225,235,.35)'; g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.fill(); g.strokeStyle = 'rgba(235,245,250,.7)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 58, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(160,200,215,.35)'; g.beginPath(); g.arc(0, 0, 46, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-20, -22, 14, 6, -0.7, 0, TAU); g.fill();
  }, 10);
  let M4 = null;
  const marks4 = (tW) => (M4 && M4.key === tW ? M4 : (M4 = { key: tW, was: STRIKE[0](-10, 0.3), strike: STRIKE[1](tW - 0.42, 0.3) }));
  SCENES.bge_desk = { draw(c, lt) {
    const id = 'bge_desk', dd = dur(id), tW = at(id, 'write', 1.7), tP = at(id, 'stamp', 4.0), M = marks4(tW);
    const kT = ease.io((lt - tW + 0.9) / 0.8) * (1 - ease.io((lt - tW - 0.7) / 0.9));
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [tP], { kick: 0.035 }) * lerp(1.0, 1.2, kT), fx: lerp(560, 730, kT), fy: lerp(980, 1240, kT) };
    const T = { x: 740, y: 1050, rot: 0.14, sc: 1, lift: 0.5 };
    stack(c, [{ sh: desk(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      put(g, water(), GLASS[0] + ox, GLASS[1] + oy, { lift: 0.6 });
      put(g, bill(), BILL.x + ox, BILL.y + oy, { rot: BILL.rot, lift: 0.5 });
      imprint(g, STAMP[0] + ox, STAMP[1] + oy, lt >= tP ? 1 : 0);
      const Tt = { ...T, x: T.x + ox, y: T.y + oy };
      const tip = drawTag(g, Tt, lt, { rows: [{ row: 0, t0: -10 }, { row: 1, t0: -10 }, { row: 2, t0: tW }], marks: [M.was, M.strike] });
      const L = (p) => tagToLayer(Tt, p), rest = [W + 160 + ox, 2060 + oy];
      const pen = tip || penAt(lt, [[tW - 1.0, rest], [M.strike.t0, L(M.strike.start)], [M.strike.t0 + 0.3, L(M.strike.end)], [tW, L([-74, ROWS[2].y - 12])], [tW + 0.45, L([76, ROWS[2].y - 12])], [tW + 1.1, rest]]);
      if (lt > tW - 1.0 && lt < tW + 1.1) marker(g, pen, -0.62);
      // the stamp: it drops from above the camera, lands on "agreed", lifts away
      const kS = (lt - tP + 0.22) / 0.22, kU = (lt - tP - 0.18) / 0.35;
      if (kS > 0 && kU < 1) { const h = kS < 1 ? lerp(-520, 0, ease.io(kS)) : lerp(0, -560, ease.io(kU)), a = kU > 0 ? 1 - ease.io(kU) : clamp(kS * 3, 0, 1); g.save(); g.globalAlpha = a; put(g, stampTool(), STAMP[0] + ox, STAMP[1] + oy + 70 + h, { sc: 0.9, lift: 0.6 - h / 60 }); g.restore(); }
      // the two DISSENT cards slide in from the right edge, one after the other, beside the proposal and clear of the tag
      [[0.55, 862, 650, 0.08], [0.85, 842, 790, -0.06]].forEach(([d, x, y, r]) => { const k = ease.out((lt - tP - d) / 0.3); if (k > 0) put(g, dissentCard(), lerp(W + 200, x, k) + ox, y + oy, { rot: r, lift: 0.5 }); });
    } }], cam);
    tag(c, ui('committee', 'COMMITTEE STATEMENT · 16.10.2026'), lt, dd);
    box(c);
  } };

  // ═════════ 5 · bge_tail: the case again, snowed over and dusty, glass whole; the tag 2025 / 2026 / 2028; "2028" circled ═════════
  let M5 = null;
  const marks5 = (tM) => (M5 && M5.key === tM ? M5 : (M5 = { key: tM, a: STRIKE[0](-10), b: STRIKE[1](-10), round: ROUND(tM) }));
  SCENES.bge_tail = { draw(c, lt) {
    const id = 'bge_tail', dd = dur(id), tT = at(id, 'tag', 0.3), tM = at(id, 'mark', 2.4), M = marks5(tM);
    const cam = { x: Math.sin(lt * 0.25) * 6, y: 0, z: punch(lt, [tM], { kick: 0.03 }) * lerp(0.99, 1.12, ease.io(lt / dd)), fx: 600, fy: 1110 };
    stack(c, [{ sh: wall(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      const A = caseLayer(g, ox, oy, lt, { lamp: lt > tM && lt < tM + 0.2 ? 0.5 : 1, dust: 0.62, snow: 58, ice: 1, web: 1, gleam: (lt - tM - 0.25) / 0.6 });
      const T = { x: A[0], y: A[1], rot: swing(lt, [[tT, 0.16], [tM, 0.05]], 0.012), sc: 1 };
      const tip = drawTag(g, T, lt, { rows: [{ row: 0, t0: -10 }, { row: 1, t0: -10 }, { row: 2, t0: -10 }], marks: [M.a, M.b, M.round] });
      const L = (p) => tagToLayer(T, p), rest = [W + 160 + ox, 2060 + oy];
      const pen = tip || penAt(lt, [[tM - 0.6, rest], [tM, L(M.round.start)], [tM + 0.42, L(M.round.end)], [tM + 1.2, rest]]);
      if (lt > tM - 0.6 && lt < tM + 1.2) marker(g, pen, -0.62);
    } }, { d: 0.3, fn: (g, ox, oy) => snowfall(g, lt + 4 * SH, ox, oy, { n: 120, sz: 1.3, a: 0.7, wind: 26 }) }], cam);
    tag(c, ui('vote', 'PLENARY VOTE: STILL TO COME'), lt, dd);
    box(c);
  } };

  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // THE VIRAL CUT (papercut/break-glass-viral; plan/films/19b-break-glass-viral.md): five shots at 124 BPM, the bgev_*
  // scenes below. Nothing above this line changes, so the v1 draft renders exactly as it did. The hook is frame 0: the
  // case snowed over and dusty, its glass whole, NEVER USED stamped across it, its tag reading 2025, 2026, 2028 ringed,
  // and FINLAND on the corner tag. Shot 5 stamps it again and ends on frame 0's view, state and snow, so the film loops.
  // The moves here are a whole-picture VIEW (a true zoom): a stack camera's z only reaches a layer as 1 + (z-1)·d, which
  // at the case's depth (0.1) is a push of a few per cent.
  const VIEW0 = { z: 1.04, fx: 560, fy: 1000 };                              // frame 0; bgev_tail ends on it
  const SNOW0 = 40;                                                          // the snowfall's clock on frame 0
  const AGED = { lamp: 1, dust: 0.62, snow: 58, ice: 1, web: 1 };           // the case as frame 0 shows it
  const STILL = { x: 0, y: 0, z: 1 };                                        // the stack camera where the loop joins
  const NU = { x: 548, y: 1000, rot: -0.12 };                                // the label, over the booklet's lower half
  function view(c, v, fn) { c.save(); c.translate(v.fx + (v.sx || 0), v.fy + (v.sy || 0)); c.scale(v.z, v.z); c.translate(-v.fx, -v.fy); fn(); c.restore(); }
  const kick = (lt, h, s) => (lt >= h ? s * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60)) : 0);   // 0 on its own frame
  const shakeAt = (f) => (f >= 0 ? Math.exp(-f * 7) * Math.sin(f * 70) * 9 : 0);
  /** a corner tag at alpha a (bge's tag() fades on its own clock; the hook's has to be up on frame 0) */
  function corner(c, text, a, x = 110) {
    if (a <= 0) return; const y = R.SAFE_B - 66;
    c.save(); c.globalAlpha = clamp(a, 0, 1); c.font = `32px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }
  const win = (lt, a, b) => clamp((lt - a) / 0.3, 0, 1) * clamp((b - lt) / 0.3, 0, 1);

  /** NEVER USED: a red rubber stamp on a paper label stuck to the glass. The label covers the booklet's small print
   *  under it (red ink straight on the booklet read as noise); the ink, double-ruled, carries the stamp's grain */
  let NUC = null;
  function neverUsed() {
    if (NUC) return NUC;
    const w = 420, h = 290, mk = () => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; };
    const ink = mk(), g = ink.getContext('2d');
    g.translate(w / 2, h / 2); g.strokeStyle = C.red; g.fillStyle = C.red;
    g.lineWidth = 10; g.beginPath(); g.roundRect(-186, -122, 372, 244, 14); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.roundRect(-170, -106, 340, 212, 7); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    for (const [s, y] of [['NEVER', -6], ['USED', 92]]) { g.font = '400 112px "Anton-400"'; const fz = Math.min(112, 112 * 300 / g.measureText(s).width); g.font = `400 ${fz.toFixed(1)}px "Anton-400"`; g.fillText(s, 0, y); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; const r = U.rng(57);
    for (let i = 0; i < 1000; i++) { g.globalAlpha = 0.25 + r() * 0.75; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2); }
    for (let i = 0; i < 7; i++) { g.save(); g.globalAlpha = 0.55; g.translate(r() * w, r() * h); g.rotate(-0.3 + r() * 0.6); g.fillRect(-30 - r() * 50, -1, 60 + r() * 110, 2 + r() * 2.5); g.restore(); }
    const out = mk(), o = out.getContext('2d');
    o.fillStyle = '#f3ecda'; o.beginPath(); o.roundRect(8, 8, w - 16, h - 16, 6); o.fill();
    o.fillStyle = 'rgba(120,100,70,.08)'; for (let i = 0; i < 60; i++) o.fillRect(8 + r() * (w - 16), 8 + r() * (h - 16), 10 + r() * 40, 1);
    o.drawImage(ink, 0, 0);
    return (NUC = out);
  }
  function stampNU(g, ox, oy, sc, a) {
    if (a <= 0) return; const cv = neverUsed();
    g.save(); g.translate(NU.x + ox, NU.y + oy); g.rotate(NU.rot); g.scale(sc, sc); g.globalAlpha = clamp(a, 0, 1);
    g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 12 * sc; g.shadowOffsetX = 6 + 6 * (sc - 1); g.shadowOffsetY = 9 + 10 * (sc - 1);
    g.drawImage(cv, -cv.width / 2, -cv.height / 2); g.restore();
  }
  /** the stamp coming down at tS: in from 1.7× over 0.12 s, a small bounce after (score.py lands press_stamp on tS) */
  function landing(lt, tS) {
    const k = (lt - tS + 0.12) / 0.12; if (k <= 0) return { sc: 1, a: 0 };
    if (k < 1) return { sc: lerp(1.7, 1, k * k), a: clamp(k * 2.5, 0, 1) };
    return { sc: 1 + 0.035 * Math.exp(-(lt - tS) * 9) * Math.sin((lt - tS) * 30), a: 1 };
  }
  /** snow knocked off the case's top by a hit at t = 0 */
  const PUFF = (() => { const r = U.rng(131); return Array.from({ length: 48 }, () => ({ x: lerp(-CS.w / 2, CS.w / 2, r()), vx: (r() - 0.5) * 140, vy: -60 - r() * 140, s: 2 + r() * 4.5, d: 0.5 + r() * 0.7 })); })();
  function puff(g, ox, oy, t) {
    if (t <= 0 || t > 1.3) return; const X = CS.x + ox, Y = CS.y - CS.h / 2 - 30 + oy;
    g.save(); g.fillStyle = C.snow;
    for (const p of PUFF) { const k = t / p.d; if (k >= 1) continue; g.globalAlpha = 0.9 * (1 - k); g.beginPath(); g.arc(X + p.x + p.vx * t, Y + p.vy * t + 450 * t * t, p.s, 0, TAU); g.fill(); }
    g.restore();
  }
  function flash(c, f, a = 0.16) { if (f < 0 || f >= 0.3) return; c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(216,64,47,${a * (1 - f / 0.3)})`; c.fillRect(0, 0, W, H); c.restore(); }
  let MAGED = null;
  const aged = () => MAGED || (MAGED = { a: STRIKE[0](-10), b: STRIKE[1](-10), round: ROUND(-10) });

  // ═════════ V1 · bgev_hook: frame 0 is the case as it is now; a hit; on "never used" the stamp comes down again ═════════
  SCENES.bgev_hook = { draw(c, lt) {
    const id = 'bgev_hook', dd = dur(id), tH = at(id, 'hit', 0.035), tP = at(id, 'stamp', 0.72), f = lt - tP, M = aged();
    const v = { z: VIEW0.z * (1 + kick(lt, tH, 0.03) + kick(lt, tP, 0.035)) * lerp(1, 1.05, ease.io(lt / dd)), fx: VIEW0.fx, fy: VIEW0.fy, sx: shakeAt(f) };
    // the stamp lifts a hair before the word and slams back on it
    const sc = f < -0.1 ? 1 : f < 0 ? 1 + 0.1 * ease.out((f + 0.1) / 0.1) : 1 + 0.1 * Math.exp(-f * 14) * Math.cos(f * 22);
    view(c, v, () => stack(c, [{ sh: wall(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      const A = caseLayer(g, ox, oy, lt, { ...AGED, gleam: -1 });
      puff(g, ox, oy, lt - tH); puff(g, ox + 7, oy, lt - tP);
      stampNU(g, ox, oy, sc, 1);
      drawTag(g, { x: A[0], y: A[1], rot: swing(lt, [[tH, 0.035], [tP, 0.04]], 0.012), sc: 1 }, lt, { rows: [0, 1, 2].map((row) => ({ row, t0: -10 })), marks: [M.a, M.b, M.round] });
    } }, { d: 0.3, fn: (g, ox, oy) => snowfall(g, SNOW0 + lt, ox, oy, { n: 120, sz: 1.3, a: 0.7, wind: 26 }) }], STILL));
    flash(c, f);
    corner(c, ui('act', 'FINLAND · TEMPORARY MEASURES ACT'), clamp((dd - 0.3 - lt) / 0.3, 0, 1));
    box(c);
  } };

  // ═════════ V2 · bgev_year: what the law is for. Back to 2024, the case new and clean: the lamp clicks on at "In an
  //            emergency,", the glass glints on "stop", and at the end of the sentence the tag drops on: VALID TO 2025 ═════════
  SCENES.bgev_year = { draw(c, lt) {
    const id = 'bgev_year', dd = dur(id), tL = at(id, 'lamp', 0.3), tP = at(id, 'stop', 1.0), tT = at(id, 'tag', 2.4), kD = (lt - tT) / 0.32;
    const lampOn = lt < tL ? 0.15 : lt < tL + 0.2 ? 1 - (Math.floor((lt - tL) * 24) % 2) * 0.6 : 1;
    // no push-in: the caption runs to four lines, so the plate has to stay below it and the tag above the corner tag
    const v = { z: lerp(1.0, 1.02, ease.io(lt / dd)) * (1 + kick(lt, tP, 0.025) + kick(lt, tT, 0.03)), fx: 560, fy: 1060, sy: 25 };
    view(c, v, () => stack(c, [{ sh: wall(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      const A = caseLayer(g, ox, oy, lt, { lamp: lampOn, dust: 0.03, gleam: (lt - tP) / 0.55 });
      if (kD > 0) drawTag(g, { x: A[0], y: A[1], rot: swing(lt, [[tT, 0.22]]), sc: ease.back(kD) }, lt, { rows: [{ row: 0, t0: -10 }] });
    } }, { d: 0.3, fn: (g, ox, oy) => snowfall(g, lt + SH, ox, oy, { n: 60, sz: 1.3, a: 0.55 }) }], { x: Math.sin(lt * 0.3) * 8, y: 0, z: 1 }));
    corner(c, ui('inforce', 'IN FORCE 22.7.2024 · ONE YEAR'), win(lt, 0.35, dd - 0.3));
    box(c);
  } };

  // ═════════ V3 · bgev_again: THE ESCALATION. Close on the tag, one line a year: 2025 struck at the end of line 1, 2026
  //            written at the end of line 2, 2026 struck and 2028 written on the pop, the view stepping in on each new
  //            year; then the days run on and the snow piles up ═════════
  let M3V = null;
  const marks3v = (tS1, tW1, tW2) => {
    const key = `${tS1}|${tW1}|${tW2}`; if (M3V && M3V.key === key) return M3V;
    const s1 = STRIKE[0](Math.max(0.08, tS1), 0.26), s2 = STRIKE[1](Math.max(tW1 + 0.47, tW2 - 0.4), 0.2);
    return (M3V = { key, s1, s2, w2: Math.max(tW2, s2.t0 + s2.dur) });       // 2028 starts once 2026 is struck through
  };
  SCENES.bgev_again = { draw(c, lt) {
    const id = 'bgev_again', dd = dur(id), tW1 = at(id, 'write1', 1.2), tW2 = at(id, 'write2', 1.8), M = marks3v(at(id, 'strike1', 0.55), tW1, tW2);
    // a step in on each new year, but only to 1.1: any closer and the plate rides up behind the captions (above 1.12)
    // while the tag's foot reaches the corner tag; the plate only leaves the frame above 1.8, where the sprites go soft
    const step = (t) => clamp(ease.back((lt - t) / 0.28), 0, 1.2);
    const z = 1.0 + 0.04 * step(tW1) + 0.05 * step(tW2) + 0.01 * ease.io(clamp((lt - tW2 - 0.3) / Math.max(0.5, dd - tW2 - 0.3), 0, 1));
    const grow = ease.io(clamp(lt / dd, 0, 1));
    const v = { z: z * (1 + kick(lt, tW1, 0.02) + kick(lt, tW2, 0.03)), fx: 600, fy: 1250, sx: shakeAt(lt - tW2) * 0.8 + shakeAt(lt - tW1) * 0.4 };
    view(c, v, () => stack(c, [{ sh: wall(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => days(g, lt, dd, ox, oy, 8) }, { d: 0.1, fn: (g, ox, oy) => {
      const A = caseLayer(g, ox, oy, lt, { lamp: 1, dust: lerp(0.06, 0.5, grow), snow: lerp(4, 46, grow), ice: lerp(0, 0.8, grow), web: lerp(0, 0.8, grow), gleam: -1 });
      const T = { x: A[0], y: A[1], rot: swing(lt, [[M.s1.t0, 0.05], [tW2, 0.07]], 0.012), sc: 1 };
      const tip = drawTag(g, T, lt, { rows: [{ row: 0, t0: -10 }, { row: 1, t0: tW1 }, { row: 2, t0: M.w2 }], marks: [M.s1, M.s2] });
      const L = (p) => tagToLayer(T, p), rest = [W + 160 + ox, 2060 + oy];
      const pen = tip || penAt(lt, [[0, L([150, ROWS[0].y + 90])], [M.s1.t0, L(M.s1.start)], [M.s1.t0 + M.s1.dur, L(M.s1.end)], [tW1, L([-74, ROWS[1].y - 12])], [tW1 + 0.45, L([76, ROWS[1].y - 12])],
        [M.s2.t0, L(M.s2.start)], [M.s2.t0 + M.s2.dur, L(M.s2.end)], [M.w2, L([-74, ROWS[2].y - 12])], [M.w2 + 0.45, L([76, ROWS[2].y - 12])], [M.w2 + 1.2, rest]]);
      if (lt < M.w2 + 1.2) marker(g, pen, -0.62);
    } }, { d: 0.3, fn: (g, ox, oy) => snowfall(g, lt * 2.2 + 2 * SH, ox, oy, { n: 110, sz: 1.3, a: 0.65, wind: 34 }) }], { x: Math.sin(lt * 0.3 + 1) * 6, y: 0, z: 1 }));
    flash(c, lt - tW2, 0.12);
    corner(c, ui('proposal', 'GOVERNMENT PROPOSAL · 3.9.2026'), win(lt, tW1 + 0.3, dd - 0.3));   // whose proposal, before "Proposed:"
    box(c);
  } };

  // ═════════ V4 · bgev_desk: the proposal; NONE ringed on "Unchanged."; the stamp on "agreed"; two DISSENT cards ═════════
  let M4V = null;
  const marks4v = (tN) => {
    if (M4V && M4V.key === tN) return M4V;
    const m = document.createElement('canvas').getContext('2d'); m.font = '700 26px "LibreBaskerville-700"';
    const x0 = -236 + m.measureText('CHANGES TO CONTENT:  ').width, wN = m.measureText('NONE').width;
    const ring = mkMark(Math.max(0.22, tN - 0.2), 0.42, [GEN().ellipse(x0 + wN / 2 + 6, -109, wN + 36, 56, ink(83, { strokeWidth: 6 }))]);
    return (M4V = { key: tN, ring });
  };
  const billToLayer = (p, ox, oy) => [BILL.x + ox + Math.cos(BILL.rot) * p[0] - Math.sin(BILL.rot) * p[1], BILL.y + oy + Math.sin(BILL.rot) * p[0] + Math.cos(BILL.rot) * p[1]];
  SCENES.bgev_desk = { draw(c, lt) {
    const id = 'bgev_desk', dd = dur(id), tN = at(id, 'none', 0.4), tP = at(id, 'stamp', 1.15), M = marks4v(tN);
    const v = { z: lerp(1.14, 1.19, ease.io(lt / dd)) * (1 + kick(lt, tP, 0.035)), fx: 470, fy: 900, sx: shakeAt(lt - tP) * 0.5 };
    view(c, v, () => stack(c, [{ sh: desk(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      put(g, water(), GLASS[0] + ox, GLASS[1] + oy, { lift: 0.6 });
      put(g, bill(), BILL.x + ox, BILL.y + oy, { rot: BILL.rot, lift: 0.5 });
      g.save(); g.translate(BILL.x + ox, BILL.y + oy); g.rotate(BILL.rot); const k = (lt - M.ring.t0) / M.ring.dur, tp = k > 0 ? drawMark(g, M.ring, ease.out(k)) : null; g.restore();
      imprint(g, STAMP[0] + ox, STAMP[1] + oy, lt >= tP ? 1 : 0);
      const B = (p) => billToLayer(p, ox, oy), rest = [W + 160 + ox, 2060 + oy];
      const pen = k > 0 && k < 1 && tp ? B(tp) : penAt(lt, [[0, B([250, 10])], [M.ring.t0, B(M.ring.start)], [M.ring.t0 + M.ring.dur, B(M.ring.end)], [M.ring.t0 + M.ring.dur + 0.8, rest]]);
      if (lt < M.ring.t0 + M.ring.dur + 0.8) marker(g, pen, -0.62);
      // the stamp drops from above the camera, lands on "agreed", lifts away (v1's, on this cut's cue)
      const kS = (lt - tP + 0.22) / 0.22, kU = (lt - tP - 0.18) / 0.35;
      if (kS > 0 && kU < 1) { const h = kS < 1 ? lerp(-520, 0, ease.io(kS)) : lerp(0, -560, ease.io(kU)), a = kU > 0 ? 1 - ease.io(kU) : clamp(kS * 3, 0, 1); g.save(); g.globalAlpha = a; put(g, stampTool(), STAMP[0] + ox, STAMP[1] + oy + 70 + h, { sc: 0.9, lift: 0.6 - h / 60 }); g.restore(); }
      // the two DISSENT cards slide in from the right, low on the proposal and clear of the rail
      [[0.55, 676, 1080, 0.08], [0.85, 660, 1222, -0.06]].forEach(([d, x, y, r]) => { const kc = ease.out((lt - tP - d) / 0.3); if (kc > 0) put(g, dissentCard(), lerp(W + 200, x, kc) + ox, y + oy, { rot: r, lift: 0.5 }); });
    } }], { x: Math.sin(lt * 0.3) * 6, y: 0, z: 1 }));
    corner(c, ui('committee', 'COMMITTEE STATEMENT · 16.10.2026'), win(lt, 0.35, dd - 0.3));
    box(c);
  } };

  // ═════════ V5 · bgev_tail: the case as it is now; NEVER USED comes down on "Never used.", the glass rings on "temporary",
  //            2028 is ringed on line 3; then the view settles onto frame 0's, so the last frame hands into the first ═════════
  let M5V = null;
  const marks5v = (tM) => (M5V && M5V.key === tM ? M5V : (M5V = { key: tM, round: ROUND(tM) }));
  SCENES.bgev_tail = { draw(c, lt) {
    const id = 'bgev_tail', dd = dur(id), tS = at(id, 'stamp', 0.4), tG = at(id, 'gleam', 0.9), tM = at(id, 'mark', 1.75), M = marks5v(tM), A0 = aged();
    const endK = ease.io(clamp((lt - (dd - 0.7)) / 0.7, 0, 1)), f = lt - tS;
    const zIn = lerp(1.1, 1.15, ease.io(clamp(lt / (dd - 0.7), 0, 1))) * (1 + kick(lt, tS, 0.035) + kick(lt, tM, 0.02));
    const v = { z: VIEW0.z * lerp(zIn, 1, endK), fx: lerp(600, VIEW0.fx, endK), fy: lerp(1080, VIEW0.fy, endK), sx: shakeAt(f) * (1 - endK) };
    const S = landing(lt, tS);
    view(c, v, () => stack(c, [{ sh: wall(), d: 0.05, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      const A = caseLayer(g, ox, oy, lt - dd, { ...AGED, gleam: (lt - tG) / 0.6 });
      puff(g, ox, oy, f);
      stampNU(g, ox, oy, S.sc, S.a);
      const T = { x: A[0], y: A[1], rot: swing(lt, [[tS, 0.04], [tM, 0.05]], 0) * (1 - endK) + 0.012 * Math.sin((lt - dd) * 1.7), sc: 1 };
      const tip = drawTag(g, T, lt, { rows: [0, 1, 2].map((row) => ({ row, t0: -10 })), marks: [A0.a, A0.b, M.round] });
      const L = (p) => tagToLayer(T, p), rest = [W + 160 + ox, 2060 + oy];
      const pen = tip || penAt(lt, [[tM - 0.6, rest], [tM, L(M.round.start)], [tM + 0.42, L(M.round.end)], [tM + 1.2, rest]]);
      if (lt > tM - 0.6 && lt < tM + 1.2) marker(g, pen, -0.62);
    } }, { d: 0.3, fn: (g, ox, oy) => snowfall(g, SNOW0 - dd + lt, ox, oy, { n: 120, sz: 1.3, a: 0.7, wind: 26 }) }], STILL));
    flash(c, f);
    corner(c, ui('vote', 'PLENARY VOTE: STILL TO COME'), win(lt, tM - 0.1, dd - 0.95));       // with "Proposed till 2028."
    corner(c, ui('act', 'FINLAND · TEMPORARY MEASURES ACT'), clamp((lt - (dd - 0.75)) / 0.3, 0, 1));
    box(c);
  } };
})();
