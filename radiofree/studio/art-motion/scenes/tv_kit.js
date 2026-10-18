// The kit for "Same Trick, Two Verdicts" (EU/US) — the papercut box in CLEAN LIGHT (rfp_clean.js), made by the
// pipeline. One question: can a joke use AI to put words in a leader's mouth? Two courts, two answers.
// Seen from ABOVE, on a satirist's green cutting mat: the trick is literally a paper puppet — a blank paper head whose
// jaw is a separate cut-out piece, dropped open by a strip of AI voice (the cyan bars). It is laid out twice: on a
// phone (Berlin, the chancellor) and on a campaign poster (California, a candidate). Nobody's face: the heads are blank
// paper. A court's answer arrives from above, as things do on a table: a stamp, a sticker, a gavel.
// Not The Scoreboard's room (stone, copper, daylight shafts): this is a workbench, and the camera looks straight down.
//   Times come from window.FILM_PLAN (pipeline/plan.mjs): TV.at('tv_berlin', 'banned') is the moment the caption's
//   first line lands, in the shot's own seconds.
window.TV = (() => {
  const { W, H, sheet, sprite, put, glow } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.43 };
  const at = (id, name, dflt = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? dflt : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const C = {
    mat: '#2f6a53', matD: '#285b47', line: '#4c8a71', major: '#6aa88d', paper: '#efe9da', paperD: '#d6ceb9', ink: '#1b1d1f',
    phone: '#1d2226', screen0: '#d7e7ec', screen1: '#b4ccd4', navy: '#24364a', navyD: '#1a2836', red: '#c9342b', redD: '#9e241d',
    cyan: '#3fd0e6', yellow: '#f4c620', yellowD: '#c99e10', wood: '#8a5a33', woodD: '#5e3b20', brass: '#c9a54e', de: ['#1b1d1f', '#c9342b', '#e8b923'],
  };
  const ease = { out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3), io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
  function punch(lt, hits = [], { open = 0.05, settle = 0.35, kick = 0.035 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  /** the AI voice's loudness at t: syllables in phrases, with breaths — 0..1, times `talk` */
  const voice = (t, talk = 1) => talk * clamp(Math.abs(Math.sin(t * 9.7)) * (0.55 + 0.45 * Math.sin(t * 2.9 + 1.3)) * (Math.sin(t * 1.3) > -0.75 ? 1 : 0.1), 0, 1);

  /** paper's finish on anything cut from it: fibre specks over the area, and the lit cut edge of the rectangle */
  function grain(g, x, y, w, h, seed = 1, edge = true) {
    const r = U.rng(seed); for (let i = 0; i < w * h / 900; i++) { g.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.10)'; g.fillRect(x + r() * w, y + r() * h, 1.5 + r() * 2, 1.5 + r() * 2); }
    if (edge) { g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 1, y + h); g.lineTo(x + 1, y + 1); g.lineTo(x + w, y + 1); g.stroke(); }
  }
  /** a strip of masking tape, torn at both ends */
  function tape(g, x, y, w, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(232,220,180,.82)'; g.beginPath(); g.moveTo(-w / 2, -16);
    for (let i = 0; i <= 6; i++) g.lineTo(-w / 2 + (i % 2 ? 5 : -3), -16 + i * 32 / 6); g.lineTo(w / 2, 16); for (let i = 0; i <= 6; i++) g.lineTo(w / 2 + (i % 2 ? -5 : 3), 16 - i * 32 / 6); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-w / 2, -16, w, 6); g.restore(); }

  // ── the table: a green cutting mat with its grid and rulers, a craft knife, offcuts ───────────────────────────
  const mat = () => sheet('tv_mat', (g) => {
    g.fillStyle = C.mat; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.line; for (let x = 0; x < W + 90; x += 36) g.fillRect(x, -90, 1.5, H + 180); for (let y = 0; y < H + 90; y += 36) g.fillRect(-90, y, W + 180, 1.5);
    g.fillStyle = C.major; for (let x = 0; x < W + 90; x += 180) g.fillRect(x - 1, -90, 3, H + 180); for (let y = 0; y < H + 90; y += 180) g.fillRect(-90, y - 1, W + 180, 3);
    g.fillStyle = C.major; g.font = '20px "ArchivoBlack-400"'; g.textAlign = 'center';
    for (let x = 180, n = 1; x < W; x += 180, n++) g.fillText(String(n * 5), x, 1880);
    g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; const r = U.rng(11);                                    // old knife scores
    for (let i = 0; i < 18; i++) { const x = r() * W, y = r() * H, a = r() * TAU, l = 60 + r() * 220; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    g.fillStyle = C.major; g.font = '18px "ArchivoBlack-400"'; g.textAlign = 'center';
    for (let x = 180, n = 1; x < W; x += 180, n++) { g.fillText(String(n * 5), x, 70); for (let k = 0; k < 5; k++) g.fillRect(x - 180 + k * 36, 44, 2, k ? 8 : 14); }
    g.textAlign = 'left'; for (let y = 180, n = 1; y < H; y += 180, n++) g.fillText(String(n * 5), 52, y + 7);
    g.strokeStyle = 'rgba(106,168,141,.55)'; g.lineWidth = 2; g.setLineDash([14, 10]);
    for (const a of [Math.PI / 4, Math.PI / 3]) { g.beginPath(); g.moveTo(40, H - 40); g.lineTo(40 + Math.cos(a) * 2400, H - 40 - Math.sin(a) * 2400); g.stroke(); }
    g.setLineDash([]); g.fillStyle = C.major; g.font = '16px "ArchivoBlack-400"'; g.fillText('45°', 250, H - 230); g.fillText('60°', 170, H - 330);
    g.fillText('SELF-HEALING · A1', W - 280, H - 52);
    const lamp = g.createRadialGradient(780, 560, 40, 780, 560, 1300); lamp.addColorStop(0, 'rgba(255,238,205,.16)'); lamp.addColorStop(0.55, 'rgba(255,238,205,.05)'); lamp.addColorStop(1, 'rgba(0,0,0,.10)');
    g.fillStyle = lamp; g.fillRect(-90, -90, W + 180, H + 180);
  }, 4);
  const knife = () => sprite('tv_knife', 520, 80, 260, 40, (g) => {
    g.fillStyle = '#c8cdd0'; g.beginPath(); g.moveTo(-250, 0); g.lineTo(-170, -16); g.lineTo(-170, 16); g.closePath(); g.fill();
    g.fillStyle = '#8f969a'; g.fillRect(-172, -16, 24, 32); g.fillStyle = C.yellow; g.beginPath(); g.roundRect(-150, -20, 400, 40, 14); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -120; x < 240; x += 26) g.fillRect(x, -20, 8, 40);
  }, 6);
  const scraps = () => sheet('tv_scraps', (g) => {
    const r = U.rng(5);
    for (const [x, y] of [[120, 1560], [960, 1500], [880, 640], [150, 560], [600, 1700]]) {
      g.save(); g.translate(x, y); g.rotate(r() * TAU); g.fillStyle = r() > 0.5 ? C.paper : '#e4d9bf'; g.beginPath(); g.moveTo(0, 0); g.lineTo(40 + r() * 50, 6); g.lineTo(20 + r() * 30, 30 + r() * 40); g.closePath(); g.fill(); g.restore();
    }
  }, 4);
  /** the table's dressing, drawn by every shot under its exhibits */
  function table(c, ox = 0) { RFP.layer(c, mat(), ox * 0.3, 0, { lift: 0 }); RFP.layer(c, scraps(), ox * 0.5, 0, { lift: 0.4 }); put(c, knife(), 830 + ox, 1720, { rot: -0.35, lift: 0.8 }); }

  // ── the trick: a blank paper head with a separate jaw, opened by the voice ─────────────────────────────────────
  /** a paper puppet's head at (x, y): the jaw is cut along the mouth line and drops by `open` (0..1). No face. */
  function head(c, x, y, s, open, { mouth = 'flap' } = {}) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const drop = open * 32, cut = 18;
    c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(5, 8, 74, 92, 0, 0, TAU); c.fill();
    c.fillStyle = '#2a1f1a'; c.fillRect(-42, cut - 2, 84, drop + 4);                                                  // the dark behind the open jaw
    const sh = c.createRadialGradient(-26, -40, 10, 0, 0, 100); sh.addColorStop(0, '#fbf7ec'); sh.addColorStop(1, C.paperD);
    c.save(); c.beginPath(); c.rect(-90, -110, 180, 110 + cut); c.clip(); c.fillStyle = sh; c.beginPath(); c.ellipse(0, 0, 74, 92, 0, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 0, 72, 90, 0, Math.PI * 1.05, Math.PI * 1.7); c.stroke(); c.restore();
    c.save(); c.translate(0, drop); c.beginPath(); c.rect(-90, cut, 180, 90); c.clip(); c.fillStyle = C.paperD; c.beginPath(); c.ellipse(0, 0, 74, 92, 0, 0, TAU); c.fill();
    c.fillStyle = C.brass; c.beginPath(); c.arc(-50, cut + 6, 5, 0, TAU); c.arc(50, cut + 6, 5, 0, TAU); c.fill(); c.restore();     // two split-pin hinges
    if (mouth === 'cone') { const r = 30 + open * 10; for (let i = 0; i < 3; i++) { c.fillStyle = ['#5a6166', '#3c4245', '#202426'][i]; c.beginPath(); c.arc(0, 30 + drop * 0.4, r * (1 - i * 0.3), 0, TAU); c.fill(); } }
    c.restore();
  }
  /** the AI voice as a strip of cyan bars under the puppet; it lights where it is loud */
  function wave(c, x, y, w, lt, talk) {
    const n = 22; c.save();
    c.fillStyle = 'rgba(15,30,36,.85)'; c.beginPath(); c.roundRect(x - w / 2 - 10, y - 46, w + 20, 92, 10); c.fill();
    for (let i = 0; i < n; i++) { const a = voice(lt - (n - i) * 0.03, talk), h = 6 + a * 70, bx = x - w / 2 + (i + 0.5) * w / n;
      c.fillStyle = C.cyan; c.globalAlpha = 0.45 + a * 0.55; c.fillRect(bx - w / n * 0.3, y - h / 2, w / n * 0.6, h); }
    c.restore(); if (talk > 0.05) glow(c, x, y, w * 0.7, 'rgba(63,208,230,', 0.18 * talk);
  }
  /** the Berlin exhibit: a phone lying on the mat, a paper chancellor on its screen — a dark suit, a small
   *  black-red-gold pin, no face — talking through the cut-out jaw */
  const phoneBody = () => sprite('tv_phone', 440, 820, 220, 410, (g) => {
    g.fillStyle = C.phone; g.beginPath(); g.roundRect(-200, -390, 400, 780, 48); g.fill();
    const v = g.createLinearGradient(0, -360, 0, 360); v.addColorStop(0, C.screen0); v.addColorStop(1, C.screen1); g.fillStyle = v; g.beginPath(); g.roundRect(-176, -362, 352, 724, 30); g.fill();
    g.fillStyle = '#2b2f31'; g.beginPath(); g.roundRect(-40, -350, 80, 14, 7); g.fill();
    g.fillStyle = '#9fb7bf'; g.fillRect(-176, 70, 352, 6);                                                          // a lectern edge
    g.fillStyle = C.navyD; g.beginPath(); g.moveTo(-150, 360); g.lineTo(-150, 120); g.quadraticCurveTo(-140, 40, -60, 30); g.lineTo(60, 30); g.quadraticCurveTo(140, 40, 150, 120); g.lineTo(150, 360); g.closePath(); g.fill();
    g.fillStyle = C.paper; g.beginPath(); g.moveTo(-34, 30); g.lineTo(34, 30); g.lineTo(0, 130); g.closePath(); g.fill();
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(-60, 30); g.lineTo(-10, 150); g.lineTo(-90, 120); g.closePath(); g.fill(); g.beginPath(); g.moveTo(60, 30); g.lineTo(10, 150); g.lineTo(90, 120); g.closePath(); g.fill();
    C.de.forEach((col, i) => { g.fillStyle = col; g.fillRect(70, 100 + i * 8, 26, 8); });                             // the lapel pin
    g.fillStyle = '#4d5d63'; g.font = '18px "ArchivoBlack-400"'; g.textAlign = 'left'; g.fillText('12:50', -150, -322);
    g.fillRect(118, -334, 30, 13); g.fillRect(149, -330, 3, 5); for (let i = 0; i < 3; i++) g.fillRect(84 + i * 9, -322 - i * 4, 6, 4 + i * 4);
    g.fillStyle = 'rgba(255,255,255,.10)'; g.beginPath(); g.moveTo(-176, -200); g.lineTo(-40, -362); g.lineTo(40, -362); g.lineTo(-176, -110); g.closePath(); g.fill();   // glare
  }, 10);
  function phone(c, x, y, lt, talk, { sc = 1, rot = 0, lift = 1.2 } = {}) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
    put(c, phoneBody(), 0, 0, { lift });
    head(c, 0, -80, 1.15, voice(lt, talk)); wave(c, 0, 280, 280, lt, talk);
    const pk = (lt * 0.06) % 1; c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-150, 342, 300, 4); c.fillStyle = C.red; c.fillRect(-150, 342, 300 * pk, 4);   // the video's playhead
    c.beginPath(); c.arc(-150 + 300 * pk, 344, 7, 0, TAU); c.fill();
    c.restore();
  }
  /** the California exhibit: a campaign poster, a paper candidate whose mouth is a loudspeaker cone */
  const posterBody = () => sprite('tv_poster', 560, 800, 280, 400, (g) => {
    g.fillStyle = C.paper; g.fillRect(-260, -380, 520, 760);
    g.fillStyle = C.navy; g.fillRect(-260, -380, 520, 130); g.fillStyle = C.paper; for (let i = 0; i < 9; i++) { const sx = -200 + i * 50; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 7 : 16, a = -Math.PI / 2 + k * Math.PI / 5; g.lineTo(sx + Math.cos(a) * r, -315 + Math.sin(a) * r); } g.fill(); }
    g.fillStyle = C.red; for (let i = 0; i < 3; i++) g.fillRect(-260, 210 + i * 40, 520, 20);
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(-170, 190); g.quadraticCurveTo(-160, 60, -70, 40); g.lineTo(70, 40); g.quadraticCurveTo(160, 60, 170, 190); g.closePath(); g.fill();
    g.fillStyle = C.paper; g.beginPath(); g.moveTo(-30, 40); g.lineTo(30, 40); g.lineTo(0, 120); g.closePath(); g.fill();
    g.fillStyle = C.paper; g.fillRect(-260, 330, 520, 50); g.fillStyle = C.navy; g.font = '120px "Anton-400"'; g.textAlign = 'center'; g.fillText('VOTE', 0, 352 - 10);
    grain(g, -260, -380, 520, 760, 3);
    const fold = g.createLinearGradient(-6, 0, 6, 0); fold.addColorStop(0, 'rgba(0,0,0,.08)'); fold.addColorStop(1, 'rgba(255,255,255,.12)'); g.fillStyle = fold; g.fillRect(-6, -380, 12, 760);   // folded once
    tape(g, -236, -372, 110, -0.6); tape(g, 236, -372, 110, 0.6);
  }, 10);
  function poster(c, x, y, lt, talk, { sc = 1, rot = 0, lift = 1 } = {}) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
    put(c, posterBody(), 0, 0, { lift });
    head(c, 0, -100, 1.0, voice(lt + 0.7, talk), { mouth: 'cone' }); wave(c, 0, -330, 300, lt + 0.7, talk);
    if (talk > 0.05) { c.save(); c.strokeStyle = C.cyan; c.lineWidth = 6; c.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const r = 60 + i * 34 + ((lt * 60) % 34); c.globalAlpha = talk * (1 - i / 3) * 0.8; for (const sd of [-1, 1]) { c.beginPath(); c.arc(0, -70, r, sd > 0 ? -0.5 : Math.PI - 0.5, sd > 0 ? 0.5 : Math.PI + 0.5); c.stroke(); } }
      c.restore(); }
    c.restore();
  }

  // ── the answers, arriving from above ──────────────────────────────────────────────────────────────────────────
  const stampSp = (text, col, w) => sprite(`tv_stamp_${text}_${w}`, w + 40, 190, (w + 40) / 2, 95, (g) => {
    g.strokeStyle = col; g.lineWidth = 10; g.strokeRect(-w / 2, -72, w, 144); g.fillStyle = col; g.font = '104px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 6);
    g.globalCompositeOperation = 'destination-out'; const r = U.rng(text.length * 7);
    for (let i = 0; i < 260; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.beginPath(); g.arc(-w / 2 + r() * w, -76 + r() * 152, 1 + r() * 4, 0, TAU); g.fill(); }
    g.globalAlpha = 0.35; for (let i = 0; i < 5; i++) { const y = -70 + r() * 140; g.fillRect(-w / 2, y, w, 2 + r() * 3); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }, 3);
  /** a rubber stamp's mark, landing over 0.16 s from t = 0 */
  function stamp(c, text, col, x, y, t, { rot = -0.1, w = 440, sc = 1 } = {}) {
    if (t < 0) return; const k = Math.min(1, t / 0.16);
    put(c, stampSp(text, col, w), x, y, { sc: lerp(1.6, 1, k) * sc, rot, lift: lerp(4, 0.3, k) });
  }
  /** a paper tab pushed out from under an exhibit: the reason, as a label */
  const tabSp = (text) => sprite('tv_tab_' + text, 520, 110, 260, 55, (g) => {
    g.fillStyle = C.paper; g.beginPath(); g.roundRect(-240, -42, 480, 84, 6); g.fill(); g.fillStyle = C.red; g.fillRect(-240, -42, 18, 84);
    g.fillStyle = C.ink; g.font = '44px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 10, 4);
    grain(g, -240, -42, 480, 84, 5); tape(g, 214, -30, 70, 0.5);
  }, 6);
  function tab(c, text, x, y, k, rot = 0.03) { if (k <= 0) return; put(c, tabSp(text), x, y + (1 - ease.back(k)) * -120, { rot, lift: 0.8, sc: lerp(0.9, 1, k) }); }
  /** the sticker the law demanded: as big as the poster's biggest word */
  const stickerSp = () => sprite('tv_sticker', 600, 300, 300, 150, (g) => {
    g.fillStyle = C.yellow; g.beginPath(); g.roundRect(-280, -130, 560, 260, 18); g.fill();
    g.strokeStyle = C.ink; g.lineWidth = 10; g.beginPath(); g.roundRect(-258, -108, 516, 216, 10); g.stroke();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '120px "Anton-400"'; g.fillText('LABEL', 0, 22); g.font = '46px "Anton-400"'; g.fillText('REQUIRED', 0, 84);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(180, -130); g.lineTo(280, -130); g.lineTo(280, -30); g.closePath(); g.fill();    // a peeling corner
    g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(-280, -40); g.lineTo(-170, -130); g.lineTo(-90, -130); g.lineTo(-280, 30); g.closePath(); g.fill();   // vinyl gloss
  }, 8);
  /** k: 0..1 slaps it on; off: 0..1 knocks it away (down and left, the way the gavel swings, spinning); sc shrinks
   *  it (the EU's answer) */
  function sticker(c, x, y, k, off = 0, { sc = 1, rot = -0.06 } = {}) {
    if (k <= 0) return; const e = ease.out(k), o = ease.out(off);
    put(c, stickerSp(), x - o * 860, y + o * 640 - Math.sin(o * Math.PI) * 160, { sc: lerp(1.45, 1, e) * sc * (1 + Math.sin(o * Math.PI) * 0.18), rot: rot - o * 3.4, lift: off > 0 ? lerp(0.4, 5, Math.sin(Math.min(1, o * 1.4) * Math.PI / 2)) : lerp(5, 0.35, e) });
  }
  /** the gavel, side on like every cut-out here: a turned mahogany head with brass rings and two striking faces on
   *  a tapered handle with a knob. Origin at the grip end; the handle runs along +x, the head across it at x = HEADX. */
  const HEADX = 600, HEADH = 150;
  const gavelSp = () => sprite('tv_gavel2', 820, 360, 60, 180, (g) => {
    g.fillStyle = C.woodD; g.beginPath(); g.moveTo(10, -13); g.lineTo(HEADX - 40, -19); g.lineTo(HEADX - 40, 19); g.lineTo(10, 13); g.closePath(); g.fill();
    g.fillStyle = '#a8673d'; g.beginPath(); g.moveTo(14, -10); g.lineTo(HEADX - 40, -15); g.lineTo(HEADX - 40, -5); g.lineTo(14, -2); g.closePath(); g.fill();
    g.fillStyle = C.woodD; g.beginPath(); g.ellipse(0, 0, 26, 24, 0, 0, TAU); g.fill(); g.fillStyle = '#a8673d'; g.beginPath(); g.ellipse(-6, -8, 12, 9, 0, 0, TAU); g.fill();   // the knob
    const hx = HEADX, hw = 62;
    const body = g.createLinearGradient(hx - hw, 0, hx + hw, 0); body.addColorStop(0, '#5a2e17'); body.addColorStop(0.35, '#a8673d'); body.addColorStop(0.7, '#7a3f22'); body.addColorStop(1, '#4f2814');
    g.fillStyle = body; g.beginPath(); g.moveTo(hx - hw, -HEADH + 24); g.quadraticCurveTo(hx, -HEADH + 8, hx + hw, -HEADH + 24); g.lineTo(hx + hw, HEADH - 24); g.quadraticCurveTo(hx, HEADH - 8, hx - hw, HEADH - 24); g.closePath(); g.fill();
    for (const sy of [-1, 1]) {
      g.fillStyle = '#6b351b'; g.fillRect(hx - hw - 6, sy * (HEADH - 22) - 11, hw * 2 + 12, 22);                     // the striking faces, a step proud
      g.fillStyle = C.brass; g.fillRect(hx - hw, sy * (HEADH - 52) - 6, hw * 2, 12); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(hx - hw, sy * (HEADH - 52) - 6, hw * 2, 3);
    }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(hx + k * 18, -HEADH + 50); g.bezierCurveTo(hx + k * 18 + 8, -30, hx + k * 18 - 8, 30, hx + k * 18, HEADH - 50); g.stroke(); }
  }, 10);
  /** the swing: the gavel is brought in, cocked, and swung about a hand off to the right so that its lower face lands
   *  on (ix, iy) at tHit; it bounces, holds, and is taken away. Ghosts trail the fast part; the blow throws out ink
   *  strokes and chips of the sticker. */
  function gavelSwing(c, lt, tHit, ix, iy) {
    const D = HEADX, P = [ix + D, iy - HEADH], deg = Math.PI / 180;
    const ang = (t) => {
      if (t < tHit - 0.4) return 210 * deg;
      if (t < tHit - 0.2) return lerp(210, 222, ease.out((t - (tHit - 0.4)) / 0.2)) * deg;
      if (t < tHit) { const k = (t - (tHit - 0.2)) / 0.2; return lerp(222, 180, k * k) * deg; }
      const a = t - tHit; if (a < 0.4) return (180 - 7 * Math.sin(a * 22) * Math.exp(-a * 9)) * deg;
      return lerp(180, 215, ease.io((a - 0.4) / 0.45)) * deg;
    };
    const slide = (t) => t < tHit - 0.4 ? 620 * (1 - ease.out((t - (tHit - 0.8)) / 0.4)) : t > tHit + 0.4 ? 700 * ease.io((t - tHit - 0.4) / 0.45) : 0;
    if (lt < tHit - 0.8 || lt > tHit + 0.9) return;
    const draw = (t, alpha) => { const th = ang(t), sl = slide(t), near = Math.abs(t - tHit) < 0.08;
      c.save(); c.globalAlpha = alpha; put(c, gavelSp(), P[0] + sl, P[1] + sl * 0.2, { rot: th, lift: near ? 1.0 : 2.4 }); c.restore(); };
    if (lt > tHit - 0.2 && lt < tHit) for (let k = 3; k >= 1; k--) draw(lt - k * 0.025, 0.16);
    draw(lt, 1);
    const a = lt - tHit; if (a >= 0 && a < 0.35) {                                                                   // the blow
      const k = a / 0.35, r = U.rng(9); c.save(); c.globalAlpha = 1 - k; c.strokeStyle = C.ink; c.lineWidth = 7; c.lineCap = 'round';
      for (let i = 0; i < 9; i++) { const an = Math.PI * 0.55 + i / 8 * Math.PI * 1.1 + (r() - 0.5) * 0.2, r0 = 70 + k * 90, r1 = r0 + 40 + r() * 30;
        c.beginPath(); c.moveTo(ix + Math.cos(an) * r0, iy + Math.sin(an) * r0 * 0.8); c.lineTo(ix + Math.cos(an) * r1, iy + Math.sin(an) * r1 * 0.8); c.stroke(); }
      c.fillStyle = C.yellow; for (let i = 0; i < 8; i++) { const an = r() * TAU, d = 40 + k * (160 + r() * 140); c.save(); c.translate(ix + Math.cos(an) * d, iy + Math.sin(an) * d + k * k * 120); c.rotate(r() * TAU + k * 6); c.fillRect(-9, -6, 18, 12); c.restore(); }
      c.restore();
    }
  }
  /** "more speech": a paper speech bubble with ink scribble — words of its own, never ours */
  const bubbleSp = (i) => sprite('tv_bubble_' + i, 300, 220, 150, 110, (g) => {
    g.fillStyle = '#fbf8f0'; g.beginPath(); g.ellipse(0, -10, 130, 80, 0, 0, TAU); g.fill(); g.strokeStyle = 'rgba(27,29,31,.35)'; g.lineWidth = 3; g.stroke();
    g.beginPath(); g.moveTo(i % 2 ? 40 : -40, 50); g.lineTo(i % 2 ? 90 : -90, 100); g.lineTo(i % 2 ? 0 : 0, 60); g.closePath(); g.fill();
    g.fillStyle = C.ink; const L = [[-80, -40, 150], [-80, -12, 120], [-80, 16, 140]].slice(0, 2 + (i % 2));
    for (const [x, y, w] of L) { g.beginPath(); g.roundRect(x, y, w, 12, 6); g.fill(); }
  }, 8);
  function bubble(c, i, x, y, k, bounce = 0) { if (k <= 0) return; put(c, bubbleSp(i), x, y - bounce * 14, { sc: ease.back(k) * 0.9, rot: (i % 2 ? 0.1 : -0.1), lift: 1.2 }); }
  /** the EU's answer: a small AI tag in the corner, like a TV channel's corner bug */
  function bug(c, x, y, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(16,22,26,.72)'; c.beginPath(); c.roundRect(-46, -26, 92, 52, 10); c.fill();
    c.fillStyle = '#ffffff'; c.font = '36px "Anton-400"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AI', 0, 3);
    c.restore();
  }
  /** a luggage tag on a string with a question mark: the answer still to come */
  const qtagSp = () => sprite('tv_qtag', 240, 300, 120, 60, (g) => {
    g.strokeStyle = C.paperD; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -50); g.bezierCurveTo(30, -30, -20, -10, 0, 10); g.stroke();
    g.fillStyle = '#e8d7a8'; g.beginPath(); g.moveTo(-60, 30); g.lineTo(60, 30); g.lineTo(60, 220); g.lineTo(-60, 220); g.lineTo(-60, 30); g.closePath(); g.fill();
    g.fillStyle = C.mat; g.beginPath(); g.arc(0, 50, 9, 0, TAU); g.fill(); g.fillStyle = C.ink; g.font = '120px "Anton-400"'; g.textAlign = 'center'; g.fillText('?', 0, 190);
  }, 8);
  function qtag(c, x, y, k, rot = 0.12) { if (k <= 0) return; put(c, qtagSp(), x, y, { sc: lerp(1.5, 1, ease.out(k)), rot, lift: lerp(5, 0.6, ease.out(k)) }); }

  return { C, FP, at, dur, ui, ease, punch, voice, mat, table, head, wave, phone, poster, stamp, tab, sticker, gavelSwing, bubble, bug, qtag };
})();
