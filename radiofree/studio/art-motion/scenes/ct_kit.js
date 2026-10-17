// The kit for "The Chair Is Taken" (Coxon #5) — the papercut box in CLEAN LIGHT (rfp_clean.js), the first film
// made by the pipeline in the papercut engine. The council chamber on the morning of 16 Oct 2026: the same panelled
// room as Committee of the Whole, lit the way a premium miniature is lit — a cool, dark room (daylight through the
// tall windows), warm practical lamps that make pools, and one new source that does not belong in a council
// chamber: the witness's SCREEN, which throws cold light on the table it sits at. Light is how this film tells you
// who is in the room.
//   Times come from window.FILM_PLAN (pipeline/plan.mjs): CT.at('ct_scale', 'tip') is the moment the caption's pop
//   word "law" lands, in the shot's own seconds — so the picture hits what the words say, in every language.
window.CT = (() => {
  const { K, W, H, sheet, sprite, put, glow, ledAt } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.43 };
  /** a cue in the shot's own seconds */
  const at = (id, name, dflt = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? dflt : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const C = {
    wall0: '#0d171b', wall1: '#13232a', panel: '#1a2e36', panelL: '#24404a', pil: '#2c2018', pilL: '#4a3322',
    wood0: '#2e1b10', wood1: '#4f2f1b', wood2: '#76482a', woodHi: '#a8703f', brass: '#d6ab52', brassD: '#9a7631',
    carpet: '#16222e', carpetL: '#1f3040', cream: '#ebe1c7', creamD: '#c9bc9c', glass: '#2c4656', glassL: '#3f6275',
    screen: '#dff1ff', screenD: '#9fc4dc', bezel: '#121518', steel: '#6d7880', steelD: '#3e464c', hat: '#f2b705', hatD: '#c98f00',
  };
  const ease = { out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3), io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); }, spring: (k) => { k = Math.max(0, k); return 1 - Math.exp(-6 * k) * Math.cos(10 * k); } };
  /** the feed-native camera: every shot opens a touch close and settles (a cut that lands), and each hit kicks it */
  function punch(lt, hits = [], { open = 0.05, settle = 0.35, kick = 0.035 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }

  // ── the room ──────────────────────────────────────────────────────────────────────────────────────────────
  /** the far wall: dark cool panels between warm pilasters, two tall windows, the double doors and the clock */
  const wall = () => sheet('ct_wall', (g) => {
    const v = g.createLinearGradient(0, 0, 0, 1300); v.addColorStop(0, C.wall0); v.addColorStop(1, C.wall1); g.fillStyle = v; g.fillRect(-90, -90, W + 180, 1400);
    for (let i = -1; i < 8; i++) {                                                     // raised panels
      const x = 30 + i * 150; g.fillStyle = C.panel; g.beginPath(); g.roundRect(x + 14, 300, 116, 380, 6); g.fill(); g.beginPath(); g.roundRect(x + 14, 720, 116, 470, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(x + 14, 300, 116, 4); g.fillRect(x + 14, 720, 116, 4);
    }
    g.fillStyle = C.pil; for (let i = -1; i < 9; i++) g.fillRect(16 + i * 150, 240, 24, 1060);   // pilasters
    g.fillStyle = C.wood1; g.fillRect(-90, 230, W + 180, 22); g.fillStyle = C.brassD; g.fillRect(-90, 252, W + 180, 4);   // the cornice
    g.fillStyle = C.wood0; g.fillRect(-90, 1180, W + 180, 120);                                                          // the dado
    for (const wx of [150, 930]) {                                                      // two tall arched windows
      g.fillStyle = C.wood0; g.beginPath(); g.roundRect(wx - 92, 360, 184, 640, [92, 92, 0, 0]); g.fill();
      const gl = g.createLinearGradient(0, 380, 0, 990); gl.addColorStop(0, C.glassL); gl.addColorStop(1, C.glass); g.fillStyle = gl; g.beginPath(); g.roundRect(wx - 78, 376, 156, 616, [78, 78, 0, 0]); g.fill();
      g.fillStyle = C.wood0; g.fillRect(wx - 4, 376, 8, 616); for (const y of [560, 740, 900]) g.fillRect(wx - 78, y, 156, 7);
    }
    // the doors' frame and arch (the leaves are drawn live, so they can open)
    g.fillStyle = C.wood1; g.beginPath(); g.roundRect(372, 728, 336, 560, [168, 168, 0, 0]); g.fill();
    g.fillStyle = '#05080a'; g.beginPath(); g.roundRect(392, 748, 296, 540, [148, 148, 0, 0]); g.fill();
    g.fillStyle = C.brassD; g.fillRect(372, 900, 336, 6);
    // the chamber clock above the doors: the dial motif the series keeps returning to
    g.fillStyle = C.wood1; g.beginPath(); g.arc(540, 620, 70, 0, TAU); g.fill(); g.fillStyle = C.cream; g.beginPath(); g.arc(540, 620, 56, 0, TAU); g.fill();
    g.strokeStyle = '#1a140f'; g.lineWidth = 3; for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.beginPath(); g.moveTo(540 + Math.cos(a) * 46, 620 + Math.sin(a) * 46); g.lineTo(540 + Math.cos(a) * 52, 620 + Math.sin(a) * 52); g.stroke(); }
    g.lineWidth = 5; g.beginPath(); g.moveTo(540, 620); g.lineTo(540, 582); g.moveTo(540, 620); g.lineTo(512, 612); g.stroke();   // ten to ten: the hearing was called for ten
  }, 12);
  /** the floor: the chamber's carpet, a runner up the aisle to the doors */
  const floor = () => sheet('ct_floor', (g) => {
    g.fillStyle = C.carpet; g.fillRect(-90, 1290, W + 180, H);
    g.fillStyle = C.carpetL; g.beginPath(); g.moveTo(440, 1290); g.lineTo(640, 1290); g.lineTo(900, H + 90); g.lineTo(180, H + 90); g.closePath(); g.fill();
    g.fillStyle = 'rgba(214,171,82,.25)'; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(540 + s * 100, 1290); g.lineTo(540 + s * 360, H + 90); g.lineTo(540 + s * 352, H + 90); g.lineTo(540 + s * 96, 1290); g.fill(); }
  }, 6);
  /** the door leaves, opened by k (0 shut, 1 wide): each leaf narrows toward its hinge; behind, the corridor's light */
  function doors(c, k, lt) {
    const L = 392, R = 688, top = 748, bot = 1288, half = (R - L) / 2;
    if (k > 0.01) {
      const g = c.createLinearGradient(0, top, 0, bot); g.addColorStop(0, '#fff3dc'); g.addColorStop(1, '#ffd9a0');
      c.save(); c.globalAlpha = clamp(k * 1.6, 0, 1); c.fillStyle = g; c.beginPath(); c.roundRect(L, top, R - L, bot - top, [148, 148, 0, 0]); c.fill(); c.restore();
    }
    for (const s of [-1, 1]) {
      const hinge = s < 0 ? L : R, w = half * (1 - 0.82 * ease.out(k)), x0 = s < 0 ? hinge : hinge - w;
      c.save(); c.beginPath(); c.roundRect(L, top, R - L, bot - top, [148, 148, 0, 0]); c.clip();
      c.fillStyle = C.wood1; c.fillRect(x0, top, w, bot - top); c.fillStyle = C.wood2; c.fillRect(x0 + w * 0.15, top + 220, w * 0.7, 140); c.fillRect(x0 + w * 0.15, top + 390, w * 0.7, 120);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(s < 0 ? x0 + w - 3 : x0, top, 3, bot - top);
      c.fillStyle = C.brass; c.beginPath(); c.arc(s < 0 ? x0 + w - 18 : x0 + 18, top + 330, 7, 0, TAU); c.fill(); c.restore();
    }
  }
  /** the corridor's light thrown into the room: a long warm wedge across the carpet, and haze in the doorway */
  function doorLight(c, k, lt) {
    if (k <= 0.01) return; c.save(); c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, 1288, 0, 1900); g.addColorStop(0, `rgba(255,214,150,${0.42 * k})`); g.addColorStop(1, 'rgba(255,214,150,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(392, 1288); c.lineTo(688, 1288); c.lineTo(900, 1900); c.lineTo(180, 1900); c.closePath(); c.fill(); c.restore();
    glow(c, 540, 1060, 360, 'rgba(255,220,170,', 0.35 * k);
  }
  /** a brass pendant lamp; on = 0..1 (it flickers as it strikes) */
  function lamp(c, x, y, on, lt, i = 0) {
    c.save(); c.strokeStyle = '#0b0d0f'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, 40); c.lineTo(x, y - 40); c.stroke(); c.restore();
    put(c, sprite('ct_lamp', 140, 120, 70, 40, (g) => {
      g.fillStyle = C.brassD; g.beginPath(); g.moveTo(-60, 0); g.quadraticCurveTo(0, -60, 60, 0); g.closePath(); g.fill();
      g.fillStyle = C.brass; g.fillRect(-64, -4, 128, 10); g.fillStyle = C.brassD; g.fillRect(-6, -60, 12, 22);
    }, 6), x, y, { lift: 0.8 });
    const f = on * (lt < 0 ? 1 : 1);
    if (f > 0.02) { c.fillStyle = `rgba(255,236,190,${0.85 * f})`; c.beginPath(); c.ellipse(x, y + 6, 40, 10, 0, 0, TAU); c.fill(); glow(c, x, y + 40, 420, 'rgba(255,196,120,', 0.32 * f); }
  }
  /** cool daylight from the tall windows, falling as soft shafts with dust turning in them */
  function daylight(c, lt, a = 1) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [wx, dir] of [[150, 1], [930, -1]]) {
      const g = c.createLinearGradient(wx, 600, wx + dir * 420, 1500); g.addColorStop(0, `rgba(150,195,230,${0.13 * a})`); g.addColorStop(1, 'rgba(150,195,230,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(wx - 70, 420); c.lineTo(wx + 70, 420); c.lineTo(wx + dir * 520 + 160, 1500); c.lineTo(wx + dir * 520 - 220, 1500); c.closePath(); c.fill();
    }
    const r = U.rng(9); for (let i = 0; i < 60; i++) {
      const x = r() * W, y0 = 420 + r() * 1100, y = y0 + Math.sin(lt * 0.4 + i) * 24, xx = x + Math.cos(lt * 0.3 + i * 2) * 18;
      c.fillStyle = `rgba(230,240,255,${(0.08 + r() * 0.12) * a})`; c.beginPath(); c.arc(xx, y, 1 + r() * 1.8, 0, TAU); c.fill();
    }
    c.restore();
  }

  // ── the witness table ──────────────────────────────────────────────────────────────────────────────────────
  const table = () => sheet('ct_table', (g) => {
    g.fillStyle = C.wood2; g.fillRect(110, 1352, 860, 18);                          // the top, catching the lamps
    g.fillStyle = C.woodHi; g.fillRect(110, 1352, 860, 4);
    g.fillStyle = C.wood1; g.fillRect(126, 1370, 828, 190);                         // the front panel
    g.fillStyle = C.wood0; for (const x of [126, 400, 680]) g.fillRect(x + 20, 1392, 236, 146);
    g.fillStyle = C.wood2; for (const x of [126, 400, 680]) { g.fillRect(x + 20, 1392, 236, 3); }
    g.fillStyle = C.wood0; g.fillRect(140, 1560, 24, 120); g.fillRect(916, 1560, 24, 120);
  }, 12);
  /** the witness chair, empty: high leather back with brass studs */
  const chair = () => sprite('ct_chair', 360, 520, 180, 500, (g) => {
    g.fillStyle = C.wood0; g.beginPath(); g.roundRect(-130, -500, 260, 340, [40, 40, 6, 6]); g.fill();
    g.fillStyle = '#5a2a1c'; g.beginPath(); g.roundRect(-112, -484, 224, 300, [32, 32, 4, 4]); g.fill();
    g.fillStyle = 'rgba(255,230,200,.10)'; g.beginPath(); g.roundRect(-104, -476, 90, 280, [28, 0, 0, 4]); g.fill();
    g.fillStyle = C.brass; for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; g.beginPath(); g.arc(Math.cos(a) * 100, -440 + Math.sin(a) * 34 + (i === 0 || i === 8 ? 40 : 0), 3.5, 0, TAU); g.fill(); }
    g.fillStyle = C.wood0; g.fillRect(-150, -190, 300, 50); g.fillStyle = '#5a2a1c'; g.fillRect(-140, -186, 280, 32);
    g.fillStyle = C.wood0; for (const x of [-140, 124]) g.fillRect(x, -140, 16, 140);
  }, 12);

  // ── the screen in the chair ────────────────────────────────────────────────────────────────────────────────
  /** the AV cart: a steel pole on a wheeled base (most of it hidden behind the table), a monitor mount on top */
  const cart = () => sprite('ct_cart', 420, 700, 210, 690, (g) => {
    g.fillStyle = C.steelD; g.fillRect(-12, -560, 24, 520); g.fillStyle = C.steel; g.fillRect(-12, -560, 6, 520);
    g.fillStyle = C.steelD; g.fillRect(-170, -60, 340, 22); for (const x of [-150, 150]) { g.fillStyle = '#0d0f11'; g.beginPath(); g.arc(x, -24, 22, 0, TAU); g.fill(); }
    g.fillStyle = C.steelD; g.fillRect(-60, -600, 120, 46);
  }, 10);
  const bezel = () => sprite('ct_bezel', 420, 280, 210, 140, (g) => {
    g.fillStyle = C.bezel; g.beginPath(); g.roundRect(-200, -128, 400, 256, 14); g.fill();
    g.fillStyle = '#23292e'; g.fillRect(-200, 96, 400, 32); g.fillStyle = '#d23a2a'; g.beginPath(); g.arc(178, 112, 4, 0, TAU); g.fill();   // a status light
  }, 10);
  const SCR = { w: 368, h: 210 };
  /** the screen's picture, drawn live. state: off | boot | spin | tile; t = seconds in that state; opts: chip, q (signal 0..4) */
  function screen(c, x, y, state, t, { chip = 0, q = 1, sc = 1, spinner = 0 } = {}) {
    put(c, bezel(), x, y + 8 * sc, { sc, lift: 1.3 });
    c.save(); c.translate(x, y - 8 * sc); c.scale(sc, sc);
    const w = SCR.w, h = SCR.h; c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
    c.fillStyle = '#05080b'; c.fillRect(-w / 2, -h / 2, w, h);
    if (state === 'boot') { const k = clamp(t / 0.25, 0, 1); c.fillStyle = '#eaf6ff'; c.fillRect(-w / 2, -2 - h / 2 * k, w, 4 + h * k); c.globalAlpha = 1 - k; c.fillRect(-w / 2, -2, w, 4); c.globalAlpha = 1; if (k >= 1) state = 'spin'; }
    if (state === 'spin' || state === 'tile') {
      const bg = c.createLinearGradient(0, -h / 2, 0, h / 2); bg.addColorStop(0, '#2a3a46'); bg.addColorStop(1, '#16202a'); c.fillStyle = bg; c.fillRect(-w / 2, -h / 2, w, h);
    }
    if (state === 'tile') {                                                                  // a video-call tile: a placeholder person, never a face
      c.fillStyle = '#5d7486'; c.beginPath(); c.arc(0, -18, 36, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, 70, 74, 52, 0, Math.PI, TAU); c.fill();
      c.fillStyle = 'rgba(5,8,11,.7)'; c.fillRect(-w / 2, h / 2 - 34, w, 34);
      c.fillStyle = '#e9f3fb'; c.font = '17px "ArchivoBlack-400"'; c.textAlign = 'left'; c.fillText("GOV'T AFFAIRS · SPACEXAI", -w / 2 + 12, h / 2 - 11);
      for (let i = 0; i < 4; i++) { c.fillStyle = i < q ? '#e9f3fb' : 'rgba(233,243,251,.25)'; c.fillRect(w / 2 - 50 + i * 9, h / 2 - 12 - (i + 1) * 4, 6, (i + 1) * 4); }
      if (chip > 0) {                                                                         // the company's own word, on its own screen
        const k = ease.back(chip); c.save(); c.translate(-w / 2 + 16, -h / 2 + 18); c.scale(k, k);
        c.fillStyle = '#e9f3fb'; c.beginPath(); c.roundRect(0, 0, 186, 32, 16); c.fill(); c.fillStyle = '#16202a'; c.font = '15px "ArchivoBlack-400"'; c.fillText('SAFETY IS "CORE"', 14, 22); c.restore();
      }
    }
    if (state === 'spin' || spinner > 0) {                                                  // buffering
      const a = state === 'spin' ? 1 : spinner; c.save(); c.globalAlpha = a; c.fillStyle = state === 'spin' ? 'rgba(0,0,0,0)' : 'rgba(5,8,11,.55)'; c.fillRect(-w / 2, -h / 2, w, h);
      for (let i = 0; i < 12; i++) { const ang = (i / 12) * TAU + Math.floor(t * 12) * (TAU / 12); c.fillStyle = `rgba(233,243,251,${0.15 + 0.85 * (i / 12)})`; c.beginPath(); c.arc(Math.cos(ang) * 30, Math.sin(ang) * 30 - 6, 5, 0, TAU); c.fill(); }
      c.restore();
    }
    c.restore();
    if (state !== 'off') screenLight(c, x, y, sc, state === 'boot' ? clamp(t / 0.25, 0, 1) : 1);
  }
  /** the screen's own light: cold, thrown forward onto the table and up the chair */
  function screenLight(c, x, y, sc, a) {
    glow(c, x, y, 330 * sc, 'rgba(170,215,255,', 0.32 * a);
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(0, y, 0, y + 420 * sc); g.addColorStop(0, `rgba(160,205,245,${0.16 * a})`); g.addColorStop(1, 'rgba(160,205,245,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 190 * sc, y + 100 * sc); c.lineTo(x + 190 * sc, y + 100 * sc); c.lineTo(x + 420 * sc, y + 520 * sc); c.lineTo(x - 420 * sc, y + 520 * sc); c.closePath(); c.fill(); c.restore();
  }

  // ── props ──────────────────────────────────────────────────────────────────────────────────────────────────
  const binder = () => sprite('ct_binder', 460, 200, 230, 150, (g) => {
    g.fillStyle = '#5a1e18'; g.beginPath(); g.roundRect(-210, -120, 420, 120, 8); g.fill();         // a fat ring binder, lying flat, spine to us
    g.fillStyle = '#7a2a20'; g.fillRect(-210, -120, 420, 16);
    g.fillStyle = C.cream; for (let i = 0; i < 7; i++) g.fillRect(-196, -102 + i * 12, 392, 6);       // the pages' edge
    g.fillStyle = '#5a1e18'; g.fillRect(-210, -24, 420, 24);
    g.fillStyle = C.cream; g.beginPath(); g.roundRect(-120, -16, 240, 0, 2); g.fill();
    g.fillStyle = '#efe4c8'; g.fillRect(-176, -96, 352, 66); g.fillStyle = '#5a1e18'; g.font = '30px "Anton-400"'; g.textAlign = 'center'; g.fillText('CATASTROPHE', 0, -60); g.font = '18px "ArchivoBlack-400"'; g.fillText('INSURANCE', 0, -38);
  }, 9);
  const page = () => sprite('ct_page', 140, 180, 70, 90, (g) => { g.fillStyle = C.cream; g.fillRect(-60, -80, 120, 160); g.fillStyle = 'rgba(30,20,10,.25)'; for (let i = 0; i < 8; i++) g.fillRect(-46, -60 + i * 16, 70 + (i % 3) * 8, 3); }, 6);
  /** a brass balance: the post and the beam (live, so it can tip) and two pans on chains */
  const post = () => sprite('ct_post', 300, 520, 150, 510, (g) => {
    g.fillStyle = C.brassD; g.beginPath(); g.ellipse(0, -14, 120, 24, 0, 0, TAU); g.fill(); g.fillStyle = C.brass; g.beginPath(); g.ellipse(0, -24, 110, 20, 0, 0, TAU); g.fill();
    g.fillStyle = C.brassD; g.fillRect(-12, -470, 24, 450); g.fillStyle = C.brass; g.fillRect(-12, -470, 7, 450); g.beginPath(); g.arc(0, -478, 22, 0, TAU); g.fill();
  }, 10);
  const beam = () => sprite('ct_beam', 640, 60, 320, 30, (g) => { g.fillStyle = C.brass; g.beginPath(); g.roundRect(-300, -9, 600, 18, 9); g.fill(); g.fillStyle = C.brassD; for (const x of [-300, 300]) { g.beginPath(); g.arc(x, 0, 12, 0, TAU); g.fill(); } }, 8);
  const pan = () => sprite('ct_pan', 300, 60, 150, 20, (g) => { g.fillStyle = C.brassD; g.beginPath(); g.ellipse(0, 6, 130, 20, 0, 0, Math.PI); g.fill(); g.fillStyle = C.brass; g.fillRect(-132, -4, 264, 10); }, 8);
  function scale(c, x, y, tilt, loads, lt) {
    put(c, post(), x, y, { lift: 1.2 });
    const px = x, py = y - 478, ex = Math.cos(tilt) * 300, ey = Math.sin(tilt) * 300;
    for (const [s, load] of [[-1, loads[0]], [1, loads[1]]]) {
      const hx = px + s * ex, hy = py + s * ey, panY = hy + 250;
      c.save(); c.strokeStyle = '#7a5d26'; c.lineWidth = 2.5; for (const dx of [-110, 0, 110]) { c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + dx, panY); c.stroke(); } c.restore();
      put(c, pan(), hx, panY, { lift: 1.4 });
      if (load) load(c, hx, panY);
    }
    put(c, beam(), px, py, { rot: tilt, lift: 1.6 });
  }
  const coffin = () => sprite('ct_coffin', 160, 230, 80, 220, (g) => {
    g.fillStyle = '#3a2a22'; g.beginPath(); g.moveTo(-30, -210); g.lineTo(30, -210); g.lineTo(56, -150); g.lineTo(36, 0); g.lineTo(-36, 0); g.lineTo(-56, -150); g.closePath(); g.fill();
    g.fillStyle = '#54402f'; g.beginPath(); g.moveTo(-22, -198); g.lineTo(22, -198); g.lineTo(44, -150); g.lineTo(28, -12); g.lineTo(-28, -12); g.lineTo(-44, -150); g.closePath(); g.fill();
    g.fillStyle = C.cream; g.fillRect(-4, -170, 8, 60); g.fillRect(-20, -150, 40, 8);
  }, 8);
  const lawbook = () => sprite('ct_law', 300, 200, 150, 190, (g) => {
    for (let i = 0; i < 3; i++) { const y = -i * 58; g.fillStyle = ['#233a52', '#1d3046', '#2b4560'][i]; g.beginPath(); g.roundRect(-130 + i * 6, y - 56, 260 - i * 12, 56, 4); g.fill(); g.fillStyle = C.cream; g.fillRect(-122 + i * 6, y - 50, 8, 44); g.fillStyle = C.brass; g.fillRect(-60 + i * 6, y - 40, 120 - i * 12, 4); g.fillRect(-60 + i * 6, y - 18, 120 - i * 12, 4); }
    g.fillStyle = C.brass; g.font = '34px "Anton-400"'; g.textAlign = 'center'; g.fillText('LAW', 0, -126);
  }, 9);
  /** a hard hat, side on, SAFETY across it */
  const hat = () => sprite('ct_hat', 300, 190, 150, 150, (g) => {
    g.fillStyle = C.hatD; g.beginPath(); g.ellipse(0, -4, 140, 18, 0, 0, TAU); g.fill();                  // the brim
    g.fillStyle = C.hat; g.beginPath(); g.moveTo(-104, -6); g.bezierCurveTo(-104, -140, 104, -140, 104, -6); g.closePath(); g.fill();
    g.fillStyle = C.hatD; g.fillRect(-12, -126, 24, 120); g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-46, -84, 26, 36, -0.5, 0, TAU); g.fill();
    g.fillStyle = '#1b1406'; g.font = '24px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('SAFETY', 0, -40);
  }, 9);
  /** a raised forearm in a sleeve, the gloved hand open, palm up — a person below the frame, never their face */
  const arm = (sleeve, cuff) => sprite(`ct_arm_${sleeve}_${cuff}`, 220, 640, 110, 70, (g) => {
    g.fillStyle = sleeve; g.beginPath(); g.moveTo(-50, 80); g.lineTo(50, 80); g.lineTo(64, 620); g.lineTo(-64, 620); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(14, 100, 8, 500);
    g.fillStyle = cuff; g.fillRect(-54, 64, 108, 26);
    g.fillStyle = '#1b1715'; g.beginPath(); g.roundRect(-52, -10, 104, 80, 22); g.fill();                     // the palm, cupped up
    for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(-50 + i * 26, -50 + Math.abs(i - 1.5) * 5, 22, 56, 11); g.fill(); }
    g.beginPath(); g.roundRect(44, 6, 46, 24, 12); g.fill();
  }, 9);
  /** Coxon #2's dial on the chamber wall, relabelled for this film — and with no needle */
  const dial = () => sprite('ct_dial', 640, 470, 320, 330, (g) => {
    g.fillStyle = C.cream; g.beginPath(); g.arc(0, 0, 300, Math.PI, 0); g.closePath(); g.fill();
    g.strokeStyle = '#1a140f'; g.lineWidth = 4; for (let k = 0; k <= 10; k++) { const a = Math.PI + (k / 10) * Math.PI, r0 = k % 5 ? 250 : 220; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * 286, Math.sin(a) * 286); g.stroke(); }
    g.fillStyle = '#1a140f'; g.font = '34px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('0', -250, -14); g.fillText('50', 0, -190); g.fillText('100', 250, -14);
    g.fillRect(-250, 14, 500, 96); g.fillStyle = C.cream; g.font = '28px "ArchivoBlack-400"'; g.fillText('ODDS OF CATASTROPHE', 0, 52); g.font = '22px "RobotoCondensed"'; g.fillText("THE COMPANY'S NUMBER", 0, 90);
    g.fillStyle = '#1a140f'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill();
  }, 10);
  /** the dais rail in the near foreground: a dark band of wood with a brass edge and a plate, out of focus */
  const rail = (plateText = 'COMMITTEE ON TECHNOLOGY') => sheet('ct_rail_' + plateText, (g) => {
    g.fillStyle = C.wood0; g.beginPath(); g.moveTo(-90, 1660); g.quadraticCurveTo(540, 1610, W + 90, 1660); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill();
    g.fillStyle = C.brassD; g.beginPath(); g.moveTo(-90, 1660); g.quadraticCurveTo(540, 1610, W + 90, 1660); g.lineTo(W + 90, 1670); g.quadraticCurveTo(540, 1620, -90, 1670); g.closePath(); g.fill();
    let fs = 26; g.font = fs + 'px "ArchivoBlack-400"'; while (g.measureText(plateText).width > 560 && fs > 14) g.font = --fs + 'px "ArchivoBlack-400"';   // the plate fits its words
    const pw = g.measureText(plateText).width + 48; g.fillStyle = C.brass; g.fillRect(960 - pw, 1700, pw, 54); g.fillStyle = '#1a140f'; g.textAlign = 'center'; g.fillText(plateText, 960 - pw / 2, 1737);
  }, 10);
  /** the front of the dais, from its rail all the way down: what the raised hands come up from behind */
  const daisFront = (top = 1250, plateText = 'THE COUNCIL OF THE CITY OF NEW YORK') => sheet('ct_daisfront_' + top, (g) => {
    g.fillStyle = C.wood1; g.fillRect(-90, top, W + 180, H + 180 - top); g.fillStyle = C.woodHi; g.fillRect(-90, top, W + 180, 5);
    g.fillStyle = C.wood0; for (let x = -40; x < W + 90; x += 220) g.fillRect(x + 20, top + 60, 180, 300);
    g.fillStyle = C.brassD; g.fillRect(-90, top + 14, W + 180, 4);
    let fs = 26; g.font = fs + 'px "ArchivoBlack-400"'; while (g.measureText(plateText).width > 760 && fs > 14) g.font = --fs + 'px "ArchivoBlack-400"';
    g.fillStyle = C.brass; g.textAlign = 'center'; g.fillText(plateText, 540, top + 44);
  }, 12);
  const subpoena = () => CW.envelope('SUBPOENA', null);
  return { C, FP, at, dur, ease, punch, wall, floor, doors, doorLight, lamp, daylight, table, chair, cart, screen, screenLight, SCR, binder, page, scale, coffin, lawbook, hat, arm, dial, rail, daisFront, subpoena };
})();
