// LABEL SOLD SEPARATELY (Coxon, US AI politics) — the kit and its five scenes, the papercut box in CLEAN LIGHT
// (rfp_clean.js), made by the pipeline. One question: would you know a political ad was made with AI? The ads are a
// wall of ten paper TV sets, each with a masked candidate at a podium (no party, no party colours, no flags). The
// twist is MARKS BY HAND (rough.js, as in ml_kit's ml_mark): a red marker rings the three screens that say MADE WITH
// AI, and the seven that don't stay bare. A dim teal office, cream card sets, ochre labels; the marker is the only
// red, and there is no red-against-blue anywhere. No cash imagery (that was *Paid For By*): money is a counter's digits.
//   lss_wall     the wall of ten (a tower, two sets wide and five high): every candidate mid-speech; on "made with
//                AI" a sparkle winks on every screen
//   lss_count    the camera pulls back: the ten are part of 220; a flip counter lands on $137,000,000
//   lss_labels   a gloved hand holds a sheet of ten MADE WITH AI stickers; three fly to the three nearest screens
//                (the third on "3 in 10"), then the sheet goes down into the pocket
//   lss_law      a shelf of 50 plain binders: 30 put out a tab; the FEDERAL slot above is empty, dust and a cobweb
//   lss_end      the wall again; the marker rings the three labelled screens; the aide stands by, seven labels
//                still on the sheet in his pocket
// Times come from window.FILM_PLAN (pipeline/plan.mjs; cues in papercut/label-sold-separately/film.json), so the
// picture hits the words in every language. Every scene is a pure function of the shot's local time.
window.LSS = (() => {
  const { K, W, H, sheet, sprite, put, glow } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.43 };
  const at = (id, name, d = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? d : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const ease = { out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3), in: (k) => Math.pow(clamp(k, 0, 1), 2.2), io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
  const pop = (lt, t0, d = 0.3) => (lt < t0 ? 0 : ease.back((lt - t0) / d));
  function punch(lt, hits = [], { open = 0.05, settle = 0.35, kick = 0.035 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  const C = {
    wall: ['#0f201f', '#12262a', '#152b2d', '#183032', '#1b3536', '#1e3a3a'], panel: '#20403f', panelD: '#163030',
    floor: '#120f0e', floorL: '#1f1a17', wood: '#3a2618', woodL: '#4d3322', woodD: '#28190f',
    case: '#e6d9bd', caseD: '#c9b994', caseL: '#f3e9d2', bezel: '#2a2420', knob: '#8a7a5e',
    screens: ['#dfe7d8', '#e9dfc6', '#d8e2e0', '#ece2cc', '#dfe3cf', '#e6dccb', '#d6e0d9', '#e9e2cf', '#dde6dc', '#eadfca'],
    podium: '#efe4c9', podiumD: '#cdbf9c', coat: ['#4f6e5d', '#5d5446', '#46544f', '#6b5b4b', '#55605a'],
    ochre: '#e3a33a', ochreD: '#b67d1f', cream: '#efe4c9', ink: '#17110f', red: '#d8402f', mint: '#bff3dc', lamp: '#ffe2a8',
    binder: ['#d9cdb2', '#cfc2a4', '#e2d7be', '#c7b996'], binderD: '#a89a7c', brass: '#c9a24e', brassD: '#8f6f2c',
  };
  const S = RFM.S;
  const MASKS = [S.GREEN, S.ORANGE, S.YELLOW, S.PURPLE, S.LIME, S.PINK, S.YELLOW, S.GREEN, S.PINK, S.ORANGE];   // never RED, BLUE or SKY
  const FAM = '"Anton-400", "NotoSansJP-800"';
  function fit(g, text, size, maxW, fam = FAM) { let s = size; g.font = `${s}px ${fam}`; while (g.measureText(text).width > maxW && s > 12) { s -= 2; g.font = `${s}px ${fam}`; } return s; }

  // ── the office: dark teal panels, a ceiling strip light, the floor ─────────────────────────────────────────────
  const room = () => sheet('lss_room', (g) => {
    const st = 1500 / C.wall.length;
    C.wall.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, i ? i * st : -90, W + 180, H); });
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -40; x < W + 90; x += 180) g.fillRect(x, -90, 6, 1520);   // the panel seams
    g.fillStyle = '#0b1716'; g.fillRect(-90, 520, W + 180, 22);                                             // a picture rail
    g.fillStyle = C.floor; g.fillRect(-90, 1660, W + 180, H); g.fillStyle = C.floorL; g.fillRect(-90, 1660, W + 180, 14);
    const r = U.rng(4); g.fillStyle = 'rgba(214,190,150,.06)'; for (let i = 0; i < 80; i++) g.fillRect(r() * W, 1680 + r() * 220, 30 + r() * 80, 2);
  }, 10);
  /** the strip light over the wall */
  function stripLight(c, ox, lt) { c.fillStyle = '#d9d2bf'; c.fillRect(300 + ox, 470, 630, 12); glow(c, 615 + ox, 520, 560, 'rgba(255,226,168,', 0.10 + 0.01 * Math.sin(lt * 9)); }

  // ── the TV: a boxy set in cream card, a dark bezel, two knobs; the screen is drawn live ────────────────────────
  const TV = { w: 176, h: 150, sx: -78, sy: -60, sw: 130, sh: 106 };
  const tvCase = () => sprite('lss_tv', TV.w + 20, TV.h + 34, (TV.w + 20) / 2, TV.h / 2 + 4, (g) => {
    const { w, h } = TV;
    g.fillStyle = C.case; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 12); g.fill();
    g.fillStyle = C.caseL; g.fillRect(-w / 2 + 6, -h / 2 + 5, w - 12, 6);
    g.fillStyle = C.bezel; g.beginPath(); g.roundRect(TV.sx - 7, TV.sy - 7, TV.sw + 14, TV.sh + 14, 14); g.fill();
    g.fillStyle = '#0d0b0a'; g.beginPath(); g.roundRect(TV.sx, TV.sy, TV.sw, TV.sh, 10); g.fill();
    g.fillStyle = C.knob; for (const ky of [-26, 10]) { g.beginPath(); g.arc(w / 2 - 20, ky, 9, 0, TAU); g.fill(); }
    g.fillStyle = C.caseD; for (let i = 0; i < 4; i++) g.fillRect(w / 2 - 30, 30 + i * 7, 20, 3);          // the speaker grille
    g.fillStyle = C.bezel; g.fillRect(-w / 2 + 22, h / 2, 14, 14); g.fillRect(w / 2 - 36, h / 2, 14, 14);   // the feet
  }, 7);
  /** what is on a screen: a masked candidate at a podium, one arm moving; i picks the set's colours. In set coords. */
  function screen(c, x, y, s, i, lt, { bright = 1, tiny = false } = {}) {
    const sx = x + TV.sx * s, sy = y + TV.sy * s, sw = TV.sw * s, sh = TV.sh * s;
    c.save(); c.beginPath(); c.roundRect(sx, sy, sw, sh, 10 * s); c.clip();
    c.fillStyle = C.screens[i % 10]; c.fillRect(sx, sy, sw, sh);
    c.fillStyle = 'rgba(30,58,58,.12)'; c.fillRect(sx, sy + sh * 0.62, sw, sh * 0.38);                       // the set behind him
    const cx = sx + sw * (0.42 + 0.08 * ((i * 37) % 3 - 1)), base = sy + sh;
    c.fillStyle = C.coat[i % C.coat.length]; c.beginPath(); c.moveTo(cx - 34 * s, base); c.lineTo(cx - 26 * s, base - 40 * s); c.quadraticCurveTo(cx, base - 50 * s, cx + 26 * s, base - 40 * s); c.lineTo(cx + 34 * s, base); c.fill();
    if (!tiny) {
      const arm = Math.sin(lt * (2.2 + (i % 4) * 0.4) + i * 1.3);                                           // a gesture, mid-speech
      c.save(); c.translate(cx + 24 * s, base - 36 * s); c.rotate(-1.1 - 0.5 * arm); c.fillStyle = C.coat[i % C.coat.length]; c.fillRect(-5 * s, -32 * s, 10 * s, 32 * s);
      c.fillStyle = C.ink; c.beginPath(); c.arc(0, -34 * s, 6 * s, 0, TAU); c.fill(); c.restore();
      RFM.mask(c, cx, base - 62 * s, 19 * s, MASKS[i % 10], { glasses: false, led: false, t: lt, tilt: 0.08 * Math.sin(lt * 1.5 + i), strap: false, shade: false, face: K.card, frame: K.ink, ink: K.ink });
    } else { c.fillStyle = MASKS[i % 10]; c.beginPath(); c.arc(cx, base - 62 * s, 19 * s, 0, TAU); c.fill(); }
    c.fillStyle = C.podium; c.fillRect(cx - 30 * s, base - 26 * s, 60 * s, 26 * s); c.fillStyle = C.podiumD; c.fillRect(cx - 30 * s, base - 26 * s, 60 * s, 5 * s);
    if (!tiny) { c.fillStyle = C.ink; c.fillRect(cx - 1.5 * s, base - 40 * s, 3 * s, 14 * s); }             // the microphone
    c.fillStyle = 'rgba(0,0,0,.07)'; for (let yy = sy; yy < sy + sh; yy += 5 * s) c.fillRect(sx, yy, sw, 1.4 * s);   // scanlines
    if (bright !== 1) { c.fillStyle = `rgba(255,248,230,${clamp(bright - 1, 0, 1) * 0.5})`; c.fillRect(sx, sy, sw, sh); }
    c.restore();
    glow(c, x - 13 * s, y - 7 * s, 120 * s, 'rgba(210,240,225,', 0.10 * bright);
  }
  /** the AI wink: a four-pointed sparkle in a screen's corner, k = 0..1..0 */
  function sparkle(c, x, y, r, k) {
    if (k <= 0.01) return; c.save(); c.translate(x, y); c.rotate(k * 0.6); c.globalAlpha = clamp(k, 0, 1);
    c.fillStyle = '#ffffff'; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr = i % 2 ? r * 0.22 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill();
    c.restore(); glow(c, x, y, r * 3, 'rgba(200,255,232,', 0.5 * k);
  }

  // ── the wall of ten, five by two on two shelves ────────────────────────────────────────────────────────────────
  const TVS = 1.3, COLS = [470, 760], ROWS = [572, 792, 1012, 1232, 1452];
  const SPOT = ROWS.flatMap((y) => COLS.map((x) => ({ x, y })));
  const LABELLED = [8, 9, 7];   // the three nearest the sheet, in the order they are labelled
  const shelves = () => sheet('lss_shelves', (g) => {
    const x0 = COLS[0] - 160, x1 = COLS[1] + 160, hh = TV.h * TVS / 2;
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(x0 + 10, ROWS[0] - hh - 26, x1 - x0 - 20, ROWS[4] - ROWS[0] + hh * 2 + 60);   // the unit's back
    for (const y of ROWS) { g.fillStyle = C.wood; g.fillRect(x0, y + hh + 8, x1 - x0, 16); g.fillStyle = C.woodL; g.fillRect(x0, y + hh + 8, x1 - x0, 4); g.fillStyle = C.woodD; g.fillRect(x0, y + hh + 24, x1 - x0, 5); }
    g.fillStyle = C.woodD; g.fillRect(x0, ROWS[0] - hh - 26, 14, ROWS[4] - ROWS[0] + hh * 2 + 70); g.fillRect(x1 - 14, ROWS[0] - hh - 26, 14, ROWS[4] - ROWS[0] + hh * 2 + 70);
    g.fillStyle = C.wood; g.fillRect(x0 - 6, ROWS[0] - hh - 34, x1 - x0 + 12, 14);
  }, 10);
  /** the wall: sets, screens, and whatever labels are on them by now (lab: index → {k, rot}) */
  function wall(g, ox, lt, { wink = 0, labels = {} } = {}) {
    SPOT.forEach((p, i) => {
      put(g, tvCase(), p.x + ox, p.y, { sc: TVS, lift: 0.9 });
      screen(g, p.x + ox, p.y, TVS, i, lt, { bright: 1 + 0.06 * Math.sin(lt * (7 + i) + i * 2) });
      sparkle(g, p.x + ox + 40 * TVS, p.y - 40 * TVS, 26, wink * (0.8 + 0.2 * Math.sin(lt * 9 + i)));
    });
    for (const [i, l] of Object.entries(labels)) { const q = labelAt(+i); if (l.k > 0) label(g, q[0] + ox, q[1], l.k, l.rot ?? -0.12, TVS); }
  }
  /** where a set's sticker goes: over the top-left corner of its screen */
  const labelAt = (i) => [SPOT[i].x - 36 * TVS, SPOT[i].y - 50 * TVS];

  // ── the MADE WITH AI sticker and the sheet they come on ──────────────────────────────────────────────────────
  const LAB = { w: 128, h: 46 };
  const labelSprite = () => { const t = ui('label', 'MADE WITH AI');
    return sprite('lss_lab_' + t, LAB.w, LAB.h, LAB.w / 2, LAB.h / 2, (g) => {
      g.fillStyle = C.ochre; g.beginPath(); g.roundRect(-LAB.w / 2, -LAB.h / 2, LAB.w, LAB.h, 8); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = 2.5; g.beginPath(); g.roundRect(-LAB.w / 2 + 5, -LAB.h / 2 + 5, LAB.w - 10, LAB.h - 10, 5); g.stroke();
      g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, t, 26, LAB.w - 20); g.fillText(t, 0, 2); g.textBaseline = 'alphabetic';
    }, 5); };
  /** one sticker at (x, y): k > 1 overshoots the slap, 0 = not there */
  function label(c, x, y, k, rot = -0.12, s = 1) { if (k <= 0) return; put(c, labelSprite(), x, y, { rot, sc: s * Math.max(0.01, k), lift: 0.5 }); }
  const SHEET = { w: 330, h: 190, cols: 5, rows: 2 };
  const sheetCard = () => sprite('lss_sheet', SHEET.w + 10, SHEET.h + 10, (SHEET.w + 10) / 2, (SHEET.h + 10) / 2, (g) => {
    g.fillStyle = '#f6efdd'; g.beginPath(); g.roundRect(-SHEET.w / 2, -SHEET.h / 2, SHEET.w, SHEET.h, 8); g.fill();
    g.strokeStyle = 'rgba(23,17,15,.25)'; g.setLineDash([6, 5]); g.lineWidth = 2;
    for (let i = 0; i < 10; i++) { const [x, y] = sheetSlot(i); g.strokeRect(x - 30, y - 12, 60, 24); }
    g.setLineDash([]);
  }, 6);
  function sheetSlot(i) { const c = i % 5, r = Math.floor(i / 5); return [-SHEET.w / 2 + 38 + c * 63.5, -SHEET.h / 2 + 62 + r * 66]; }
  /** the sheet with whichever stickers are still on it (used: how many have been taken, from slot 0) */
  function stickerSheet(c, x, y, rot, s, used) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    put(c, sheetCard(), 0, 0, { lift: 0.6 });
    for (let i = used; i < 10; i++) { const [sx, sy] = sheetSlot(i); put(c, labelSprite(), sx, sy, { sc: 0.47, lift: 0.2 }); }
    c.restore();
  }
  /** a slot on the sheet in screen coordinates */
  function slotAt(x, y, rot, s, i) { const [sx, sy] = sheetSlot(i), cs = Math.cos(rot), sn = Math.sin(rot); return [x + (cs * sx - sn * sy) * s, y + (sn * sx + cs * sy) * s]; }

  // ── the 220: a mosaic of small sets, the wall of ten in its middle ────────────────────────────────────────────
  const MOS = { cols: 20, rows: 11, pw: 48, ph: 48 * 230 / 290, home: [9, 3] };   // the ten are columns 9–10, rows 3–7
  /** the split-flap counter: it counts UP to the figure in text (an odometer, so it never shows more than it lands
   *  on), k = 0..1 */
  function counter(c, x, y, text, k, lt) {
    const target = +text.replace(/[^0-9]/g, ''), now = Math.round(target * (1 - Math.pow(1 - clamp(k, 0, 1), 3)));
    const digits = String(now).padStart(String(target).length, '0');
    let di = 0; text = text.replace(/[0-9]/g, () => digits[di++]);
    const chars = text.split(''), cw = 64, ch = 96, w = chars.length * (cw + 6) + 30;
    c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.roundRect(x - w / 2 + 10, y - ch / 2 - 14 + 14, w, ch + 28, 12); c.fill();
    c.fillStyle = '#121010'; c.beginPath(); c.roundRect(x - w / 2, y - ch / 2 - 14, w, ch + 28, 12); c.fill();
    chars.forEach((chr, i) => {
      const cx = x - w / 2 + 15 + i * (cw + 6) + cw / 2, digit = /\d/.test(chr);
      if (!digit) { c.fillStyle = C.cream; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `70px ${FAM}`; c.fillText(chr, cx, y + 4); return; }
      c.fillStyle = '#26211e'; c.beginPath(); c.roundRect(cx - cw / 2, y - ch / 2, cw, ch, 6); c.fill();
      c.fillStyle = k >= 1 ? C.cream : '#b3a890'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `74px ${FAM}`; c.fillText(chr, cx, y + 4);
      c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(cx - cw / 2, y - 1, cw, 3);
    });
    c.textBaseline = 'alphabetic';
  }

  // ── the shelf of 50 binders and the empty FEDERAL slot ──────────────────────────────────────────────────────
  const BIND = { n: 25, w: 34, pitch: 37.6, h: 228, x0: 72, rows: [900, 1185] };
  const order = (() => { const r = U.rng(31), a = Array.from({ length: 50 }, (_, i) => i); for (let i = 49; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  const TABBED = new Set(order.slice(0, 30));   // which thirty: no state is named, and none is meant
  const RIPPLE = Object.fromEntries(order.slice(0, 30).map((b, n) => [b, n]));
  const binders = () => sheet('lss_binders', (g) => {
    for (const [ri, y] of BIND.rows.entries()) {
      g.fillStyle = C.woodD; g.fillRect(50, y - 20, W - 100, BIND.h + 40); g.fillStyle = C.wood; g.fillRect(40, y + BIND.h, W - 80, 22); g.fillStyle = C.woodL; g.fillRect(40, y + BIND.h, W - 80, 5);
      const r = U.rng(60 + ri);
      for (let i = 0; i < BIND.n; i++) { const x = BIND.x0 + i * BIND.pitch, hh = BIND.h - 8 - r() * 26;
        g.fillStyle = C.binder[Math.floor(r() * C.binder.length)]; g.beginPath(); g.roundRect(x, y + BIND.h - hh, BIND.w, hh, 3); g.fill();
        g.fillStyle = C.binderD; g.fillRect(x + 5, y + BIND.h - hh + 26, BIND.w - 10, 46);                  // a blank spine label
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(x + BIND.w / 2, y + BIND.h - 36, 7, 0, TAU); g.fill(); }
    }
    // the top shelf: one slot, labelled, with nothing in it
    g.fillStyle = C.woodD; g.fillRect(250, 640, 580, 210); g.fillStyle = C.wood; g.fillRect(230, 850, 620, 22); g.fillStyle = C.woodL; g.fillRect(230, 850, 620, 5);
    g.fillStyle = C.wood; g.fillRect(230, 626, 620, 18); g.fillStyle = 'rgba(255,240,210,.06)'; g.fillRect(300, 660, 480, 190);   // where a binder was never shelved
  }, 10);
  const plate = () => { const t = ui('federal', 'FEDERAL');
    return sprite('lss_plate_' + t, 260, 64, 130, 32, (g) => {
      g.fillStyle = C.brass; g.beginPath(); g.roundRect(-130, -32, 260, 64, 6); g.fill(); g.fillStyle = C.brassD; g.fillRect(-122, -24, 244, 4);
      g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, t, 40, 220); g.fillText(t, 0, 3); g.textBaseline = 'alphabetic';
      g.fillStyle = C.brassD; for (const x of [-116, 116]) { g.beginPath(); g.arc(x, 0, 4, 0, TAU); g.fill(); }
    }, 5); };
  /** a tab out of the top of binder b, k = 0..1 */
  function tab(c, ox, b, k) {
    if (k <= 0) return; const row = Math.floor(b / 25), i = b % 25, x = BIND.x0 + i * BIND.pitch + BIND.w / 2 + ox, top = BIND.rows[row] + 16, hh = 34 * ease.back(k);
    c.fillStyle = C.ochre; c.beginPath(); c.roundRect(x - 13, top - hh, 26, hh + 6, [5, 5, 0, 0]); c.fill(); c.fillStyle = C.ochreD; c.fillRect(x - 13, top + 2, 26, 4);
  }
  /** a cobweb in the empty slot's corner, swaying */
  function cobweb(c, x, y, s, lt) {
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate(0.03 * Math.sin(lt * 1.3)); c.strokeStyle = 'rgba(235,228,210,.55)'; c.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) { const a = i / 5 * (Math.PI / 2); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 120, Math.sin(a) * 120); c.stroke(); }
    for (let r = 26; r < 120; r += 22) { c.beginPath(); for (let i = 0; i <= 5; i++) { const a = i / 5 * (Math.PI / 2), rr = r - 5 * Math.sin(i * 1.7); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.stroke(); }
    c.restore();
  }

  // ── the marks: the marker rings three screens, one after another ─────────────────────────────────────────────
  let MARKS = null;
  function marks() {
    if (MARKS) return MARKS;
    const gen = rough.generator(), o = (seed) => ({ seed, roughness: 1.6, bowing: 1.3, stroke: C.red, strokeWidth: 10 });
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    MARKS = [7, 8, 9].map((i, n) => {
      const p = SPOT[i], dr = gen.ellipse(p.x - 6, p.y - 2, TV.w * TVS + 40, TV.h * TVS + 46, o(7 + n * 4));
      const parts = gen.toPaths(dr).filter((q) => q.d && q.stroke !== 'none').map((q) => { el.setAttribute('d', q.d); return { p: new Path2D(q.d), d: q.d, len: el.getTotalLength(), w: q.strokeWidth || 10 }; });
      return { parts, total: parts.reduce((s, q) => s + q.len, 0) };
    });
    return MARKS;
  }
  const PEN = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  function drawMark(g, m, k) {
    let left = m.total * clamp(k, 0, 1), tip = null;
    for (const q of m.parts) {
      if (left <= 0) break; const run = Math.min(q.len, left); left -= run;
      g.save(); g.strokeStyle = C.red; g.lineWidth = q.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([run, q.len + 10]); g.stroke(q.p); g.restore();
      if (run < q.len || left <= 0) { PEN.setAttribute('d', q.d); const pt = PEN.getPointAtLength(run); tip = [pt.x, pt.y]; }
    }
    return tip;
  }
  /** the marker in a gloved hand: tip at (x, y), body running down-right through the fist (steep enough that the
   *  sleeve passes right of the tower, not across the set under the one being ringed) */
  function marker(g, x, y, rot = -0.78) {
    const ax = Math.sin(-rot), ay = Math.cos(rot);
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = C.red; g.beginPath(); g.moveTo(0, 0); g.lineTo(-11, 28); g.lineTo(11, 28); g.closePath(); g.fill();
    g.fillStyle = '#2a2420'; g.fillRect(-17, 28, 34, 196); g.fillStyle = C.red; g.fillRect(-17, 200, 34, 24); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-12, 34, 6, 160); g.restore();
    RFP.fist(g, x + ax * 124, y + ay * 124, 0.64, rot, { sleeve: '#3d4a44', cuff: C.ochre, len: 1500 });
  }

  return { C, at, dur, ui, ease, pop, punch, fit, room, stripLight, TV, TVS, tvCase, screen, sparkle, COLS, ROWS, SPOT, LABELLED, labelAt, shelves, wall,
    LAB, label, labelSprite, SHEET, stickerSheet, slotAt, MOS, counter, BIND, TABBED, RIPPLE, binders, plate, tab, cobweb, marks, drawMark, marker };
})();

// ═══ the scenes ═════════════════════════════════════════════════════════════════════════════════════════════════
(() => {
  const { K, W, H, stack, box, put, glow } = RFP, D = LSS, TAU = Math.PI * 2, { clamp, lerp } = U;
  const AIDE = { coat: '#3d4a44', scarf: D.C.ochre, color: RFM.S.ORANGE };

  // 1 · The question. The wall of ten in a dim office, every candidate mid-speech. On "made with AI" a small sparkle
  // winks on every screen — all ten are — and nothing else on them says so.
  SCENES['lss_wall'] = { draw(c, lt) {
    const ID = 'lss_wall', tW = D.at(ID, 'wink', 1.6), dur = D.dur(ID);
    const wink = lt < tW ? 0 : Math.min(1, (lt - tW) / 0.12) * Math.exp(-Math.max(0, lt - tW - 0.5) * 1.4);
    const cam = { x: Math.sin(lt * 0.33) * 6, y: 0, z: D.punch(lt, [tW], { kick: 0.025 }) * lerp(1.0, 1.05, D.ease.io(lt / dur)), fx: 540, fy: 1000 };
    stack(c, [                                                                                                   // the tower centred (x − 75): nothing else is in this shot
      { sh: D.room(), d: 0.03, lift: 0 },
      { fn: (g, ox) => D.stripLight(g, ox - 75, lt), d: 0.04 },
      { sh: D.shelves(), d: 0.08, lift: 0.7, x: -75 },
      { fn: (g, ox) => D.wall(g, ox - 75, lt, { wink }), d: 0.08 },
    ], cam);
    CW.tag(c, D.ui('tagMid', 'US MIDTERMS 2026'), lt, dur);
    box(c);
  } };

  // 2 · The first fact. The camera pulls back: the ten are a small part of a wall of 220. A flip counter over the
  // wall rolls and lands on $137,000,000 on the pop.
  SCENES['lss_count'] = { draw(c, lt) {
    const ID = 'lss_count', tR = D.at(ID, 'roll', 0.2), tN = D.at(ID, 'count', 1.4), dur = D.dur(ID);
    const k = D.ease.io(clamp(lt / 1.5, 0, 1)), M = D.MOS;
    const s = lerp(290 / M.pw, 0.98, k);
    const F = [lerp((M.home[0] + 0.5) * M.pw, (M.cols - 1) / 2 * M.pw, k), lerp((M.home[1] + 2) * M.ph, (M.rows - 1) / 2 * M.ph, k)];
    const P = [540, lerp(1012, 1080, k)];
    const cam = { x: Math.sin(lt * 0.3) * 4, y: 0, z: D.punch(lt, [tN], { kick: 0.03 }), fx: 540, fy: 1000 };
    stack(c, [
      { sh: D.room(), d: 0.03, lift: 0 },
      { fn: (g, ox) => D.stripLight(g, ox - 75, lt), d: 0.04 },
      { fn: (g, ox) => {
        for (let r = 0; r < M.rows; r++) for (let q = 0; q < M.cols; q++) {
          const x = P[0] + (q * M.pw - F[0]) * s + ox, y = P[1] + (r * M.ph - F[1]) * s, sc = s * M.pw / 290 * D.TVS;
          if (x < -160 || x > W + 160 || y < 250 || y > H + 100) continue;
          const home = q >= M.home[0] && q < M.home[0] + 2 && r >= M.home[1] && r < M.home[1] + 5, i = home ? (r - M.home[1]) * 2 + (q - M.home[0]) : (q * 7 + r * 3) % 10;
          put(g, D.tvCase(), x, y, { sc, lift: 0.6 * sc + 0.1 });
          D.screen(g, x, y, sc, i, lt + q * 0.3 + r, { tiny: sc < 0.5, bright: 1 + 0.08 * Math.sin(lt * 6 + q * 1.7 + r * 2.3) });
        }
      }, d: 0.08 },
      { fn: (g, ox) => { if (lt < tR - 0.1) return; const a = clamp((lt - tR + 0.1) / 0.25, 0, 1);
        g.save(); g.globalAlpha = a; D.counter(g, 540 + ox, 640, D.ui('count', '$137,000,000'), clamp((lt - tR) / Math.max(0.2, tN - tR), 0, 1), lt); g.restore(); }, d: 0.1 },
    ], cam);
    CW.tag(c, D.ui('dateline', 'WESLEYAN MEDIA PROJECT · 15.10.2026'), lt, dur);
    box(c);
  } };

  // 3 · The second fact. A gloved hand holds a sheet of ten MADE WITH AI stickers below the wall. Three fly off it
  // and slap onto three screens (the third on "3 in 10"); then the sheet goes down, into the pocket.
  const SH = { x: 168, y: 1200, rot: 0.1, s: 0.86 };
  const FLY = 0.26;
  SCENES['lss_labels'] = { draw(c, lt) {
    const ID = 'lss_labels', T = [D.at(ID, 'l1', 0.5), D.at(ID, 'l2', 0.9), D.at(ID, 'l3', 1.4)], tP = D.at(ID, 'pocket', 3.6), dur = D.dur(ID);
    const kP = D.ease.in((lt - tP) / 0.7), shY = SH.y + 900 * kP;
    const cam = { x: Math.sin(lt * 0.3) * 5, y: 0, z: D.punch(lt, T, { kick: 0.018 }) * lerp(1.0, 1.04, D.ease.io(lt / dur)), fx: 560, fy: 1200 };
    const used = T.filter((t) => lt >= t - FLY).length;
    const labels = {}; T.forEach((t, n) => { if (lt >= t) labels[D.LABELLED[n]] = { k: 1 + 0.18 * Math.exp(-(lt - t) * 9) * Math.cos((lt - t) * 30), rot: [-0.12, -0.06, -0.15][n] }; });
    stack(c, [
      { sh: D.room(), d: 0.03, lift: 0 },
      { fn: (g, ox) => D.stripLight(g, ox, lt), d: 0.04 },
      { sh: D.shelves(), d: 0.08, lift: 0.7 },
      { fn: (g, ox) => D.wall(g, ox, lt, { labels }), d: 0.08 },
      { fn: (g, ox) => {
        RFP.hand(g, SH.x + ox - 20, shY + 120, 1.05, 0.12, { sleeve: AIDE.coat, cuff: D.C.ochre });
        D.stickerSheet(g, SH.x + ox, shY, SH.rot, SH.s, used);
        T.forEach((t, i) => {                                                                                    // a sticker in flight, sheet to screen
          const k = (lt - (t - FLY)) / FLY; if (k <= 0 || k >= 1) return;
          const [x0, y0] = D.slotAt(SH.x + ox, SH.y, SH.rot, SH.s, i), [x1, y1] = D.labelAt(D.LABELLED[i]), e = D.ease.io(k);
          D.label(g, lerp(x0, x1 + ox, e), lerp(y0, y1, e) - Math.sin(k * Math.PI) * 180, 1, -0.12 + (1 - e) * 1.8 * (i % 2 ? -1 : 1), lerp(0.47 * SH.s, D.TVS, e));
        });
      }, d: 0.14 },
    ], cam);
    CW.tag(c, D.ui('tagLabels', '~3 IN 10 LABELLED · WESLEYAN'), lt, dur);
    box(c);
  } };

  // 4 · The third fact. A shelf of fifty plain binders (no state named). On the first line thirty put out an ochre tab,
  // a ripple; the slot above, FEDERAL, holds nothing: on the pop a light finds it, the dust and the cobweb.
  SCENES['lss_law'] = { draw(c, lt) {
    const ID = 'lss_law', tT = D.at(ID, 'tabs', 0.8), tN = D.at(ID, 'none', 2.6), dur = D.dur(ID);
    const kL = clamp((lt - tN) / 0.25, 0, 1);
    const cam = { x: Math.sin(lt * 0.28) * 5, y: 0, z: D.punch(lt, [tN], { kick: 0.04 }) * lerp(1.0, 1.05, D.ease.io(lt / dur)), fx: 540, fy: lerp(1000, 760, D.ease.io(clamp((lt - tN + 0.3) / 1.2, 0, 1))) };
    stack(c, [
      { sh: D.room(), d: 0.03, lift: 0 },
      { sh: D.binders(), d: 0.08, lift: 0.7 },
      { fn: (g, ox) => {
        for (const b of D.TABBED) D.tab(g, ox, b, clamp((lt - tT - D.RIPPLE[b] * 0.045) / 0.18, 0, 1));
        put(g, D.plate(), 540 + ox, 600, { lift: 0.6 });
        D.cobweb(g, 302 + ox, 662, 0.9, lt);
        if (kL > 0) { glow(g, 540 + ox, 760, 360, 'rgba(255,226,168,', 0.35 * kL); g.fillStyle = `rgba(255,240,210,${0.08 * kL})`; g.fillRect(300 + ox, 660, 480, 190); }
        const r = U.rng(9); g.fillStyle = 'rgba(240,230,205,.55)';                                            // dust, drifting down through the empty slot
        for (let i = 0; i < 26; i++) { const x = 320 + r() * 440, sp = 14 + r() * 22, y = 660 + ((r() * 190 + lt * sp) % 190); g.beginPath(); g.arc(x + ox + Math.sin(lt + i) * 6, y, 2 + r() * 2, 0, TAU); g.fill(); }
      }, d: 0.1 },
    ], cam);
    CW.tag(c, D.ui('tagLaw', 'STATE LAWS: ~30 · FEDERAL: NONE'), lt, dur);
    box(c);
  } };

  // 5 · The punchline. The wall again, three screens labelled. On the second line the marker rings them, one by one;
  // the seven others stay bare. The aide stands by on the right, the sheet in his pocket with seven labels still on it.
  SCENES['lss_end'] = { draw(c, lt) {
    const ID = 'lss_end', tM = D.at(ID, 'mark', 2.0), tS = D.at(ID, 'said', 3.4), dur = D.dur(ID), M = D.marks();
    const RING = 0.32, GAPR = 0.05, sched = [0, 1, 2].map((n) => tM + n * (RING + GAPR));
    const cam = { x: Math.sin(lt * 0.26) * 5, y: 0, z: D.punch(lt, [tS], { kick: 0.03 }) * lerp(1.0, 1.05, D.ease.io(lt / dur)), fx: 600, fy: 1150 };
    const labels = { 8: { k: 1, rot: -0.12 }, 9: { k: 1, rot: -0.06 }, 7: { k: 1, rot: -0.15 } };
    stack(c, [
      { sh: D.room(), d: 0.03, lift: 0 },
      { fn: (g, ox) => D.stripLight(g, ox, lt), d: 0.04 },
      { sh: D.shelves(), d: 0.08, lift: 0.7 },
      { fn: (g, ox) => {
        D.wall(g, ox, lt, { labels });
        g.save(); g.translate(ox, 0); let tip = null;
        M.forEach((m, n) => { const k = (lt - sched[n]) / RING; if (k <= 0) return; const t = D.drawMark(g, m, D.ease.out(k)); if (k < 1) tip = t; });
        g.restore();
        const last = sched[2] + RING, rest = [1080, 2000], RG = [7, 8, 9], near = (i) => [D.SPOT[i].x + 150, D.SPOT[i].y - 120];
        let pen = null;
        if (tip) pen = [tip[0] + ox, tip[1]];
        else if (lt < sched[0] && lt > sched[0] - 0.6) { const k = D.ease.out((lt - (sched[0] - 0.6)) / 0.6), q = near(RG[0]); pen = [lerp(rest[0], q[0], k) + ox, lerp(rest[1], q[1], k)]; }
        else if (lt >= sched[0] && lt < last) { const n = sched.findIndex((t) => lt < t); if (n > 0) { const q = near(RG[n]); pen = [q[0] + ox, q[1]]; } }
        else if (lt >= last) { const k = D.ease.out((lt - last) / 0.5), q = near(RG[2]); if (k < 1) pen = [lerp(q[0], rest[0], k) + ox, lerp(q[1] + 200, rest[1], k)]; }
        if (pen && pen[1] < 1960) D.marker(g, pen[0], pen[1]);
      }, d: 0.08 },
      { fn: (g, ox) => {                                                                                       // the aide, cropped by the frame on the left
        const x = 105 + ox, y = 1170, s = 1.08;
        RFP.walker(g, x, y, s, { ...AIDE, t: lt, look: 0.55, led: false, lift: 1.2 });
        D.stickerSheet(g, x + 58 * s, y + 248 * s, -0.3, 0.6, 3);
        g.fillStyle = AIDE.coat; g.beginPath(); g.roundRect(x - 6 * s, y + 262 * s, 146 * s, 120 * s, 10); g.fill();   // the pocket, over the sheet's lower half
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 6 * s, y + 262 * s, 146 * s, 8);
      }, d: 0.14 },
    ], cam);
    box(c);
  } };
})();

// ═══ THE VIRAL CUT (Coxon 12 viral, 23 Oct; papercut/label-sold-separately-viral): five fast scenes, lssv_* ═══════
// The hook is the first frame: the wall of ten under "US midterms: spot the AI ad." The answer comes at once (all ten
// are: every screen sparkles), then the scale (220 of them, $137M), the escalation (a ripple puts a sticker on 66 of
// the 220, three in ten, and the 154 bare ones go dark), and the punchline on the wall again: the marker rings the
// three, the seven stickers nobody used tumble down past the bare screens, and the frame eases back to the opening
// one, so a replay is seamless. The wall sits 40 px lower than v1's so a three-line BIG caption clears the top shelf,
// and the whole frame scales about (540, 600): 1.03 on the first frame, back to 1 by half a second, and back to 1.03
// on the last. v1's scenes above are untouched.
(() => {
  const { W, H, stack, put, glow, box } = RFP, D = LSS, TAU = Math.PI * 2, { clamp, lerp } = U;
  const DY = 40, OX = -75, PUNCH = 1.03, PX = 540, PY = 600;
  // the 220 stood up for a phone: 11 across and 20 down (v1's 20 × 11 used a third of a vertical frame), the ten in
  // columns 4–5, rows 7–11; S0 is the wall's own scale, so the pull-back starts exactly where the wall left off
  const M = { cols: 11, rows: 20, pw: D.MOS.pw, ph: D.MOS.ph, home: [4, 7] }, S0 = 290 / M.pw, S1 = 1.19, YK0 = 220 / (M.ph * S0), CY = 530;
  /** the whole frame (not the box) scaled about (PX, PY) */
  function framed(c, k, draw) { c.save(); if (k !== 1) { c.translate(PX, PY); c.scale(k, k); c.translate(-PX, -PY); } draw(); c.restore(); }
  /** the wall of ten, centred and 40 px down */
  const wallLayers = (lt, opts = {}, extra = []) => [
    { sh: D.room(), d: 0.03, lift: 0 },
    { fn: (g, ox) => { g.save(); g.translate(0, DY); D.stripLight(g, ox + OX, lt); g.restore(); }, d: 0.04 },
    { sh: D.shelves(), d: 0.08, lift: 0.7, x: OX, y: DY },
    { fn: (g, ox) => { g.save(); g.translate(0, DY); D.wall(g, ox + OX, lt, opts); g.restore(); }, d: 0.08 },
    ...extra,
  ];
  const LABELS = { 8: { k: 1, rot: -0.12 }, 9: { k: 1, rot: -0.06 }, 7: { k: 1, rot: -0.15 } };

  // ── the 220 ───────────────────────────────────────────────────────────────────────────────────────────────────
  const isHome = (q, r) => q >= M.home[0] && q < M.home[0] + 2 && r >= M.home[1] && r < M.home[1] + 5;
  const HOMEL = D.LABELLED.map((i) => `${M.home[0] + (i % 2)},${M.home[1] + Math.floor(i / 2)}`);
  const STUCK = (() => {                                                                                         // 66 of 220: three in ten
    const r = U.rng(220), cells = [];
    for (let y = 0; y < M.rows; y++) for (let x = 0; x < M.cols; x++) if (!isHome(x, y)) cells.push(`${x},${y}`);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    return [...HOMEL, ...cells.slice(0, 63)];
  })();
  const RANK = new Map(STUCK.map((key) => { const [x, y] = key.split(',').map(Number); return [key, Math.hypot(x - (M.home[0] + 0.5), (y - (M.home[1] + 2)) * M.ph / M.pw)]; })
    .sort((a, b) => a[1] - b[1]).map(([key], n) => [key, n]));
  /** the mosaic at pull-back k (0: the ten exactly where the wall had them, 1: all 220 on screen); stickAt(key) → the
   *  sticker's k or 0; appear(q, r) → how far a set has popped in (the neighbours arrive as the camera pulls back);
   *  ai(q, r, key) → [strength, size] of the AI sparkle on that set (v2); shelves: the wall's unit, carried along by the
   *  pull-back and fading out, since it belongs to the ten and not to the 220 (v2) */
  function mosaic(g, ox, lt, k, { stickAt = null, dim = 0, twinkle = 0, appear = null, ai = null, shelves = false } = {}) {
    const s0 = S0 * Math.pow(S1 / S0, k), yk = lerp(YK0, 1, k);
    const F = [lerp((M.home[0] + 0.5) * M.pw, (M.cols - 1) / 2 * M.pw, k), lerp((M.home[1] + 2) * M.ph, (M.rows - 1) / 2 * M.ph, k)];
    const P = [540, lerp(1012 + DY, 1085, k)];
    if (shelves) { const f = 1 - clamp(k / 0.3, 0, 1); if (f > 0) {
      const hx = P[0] + ((M.home[0] + 0.5) * M.pw - F[0]) * s0 + ox, hy = P[1] + ((M.home[1] + 2) * M.ph - F[1]) * s0 * yk, z = s0 / S0;
      g.save(); g.translate(hx, hy); g.scale(z, z); g.translate(-540, -(1012 + DY)); g.globalAlpha = f;
      g.save(); g.translate(0, DY); D.stripLight(g, OX, lt); g.restore();
      RFP.layer(g, D.shelves(), OX, DY, { lift: 0.7, alpha: 0.55 * f, soft: 1.5 }); g.restore();
    } }
    for (let r = 0; r < M.rows; r++) for (let q = 0; q < M.cols; q++) {
      const home = isHome(q, r), a = appear && !home ? appear(q, r) : 1; if (a <= 0.01) continue;
      const s = s0 * a, x = P[0] + (q * M.pw - F[0]) * s0 + ox, y = P[1] + (r * M.ph - F[1]) * s0 * yk, sc = s * M.pw / 290 * D.TVS;
      if (x < -160 || x > W + 160 || y < 250 || y > H + 100) continue;
      const key = `${q},${r}`, i = home ? (r - M.home[1]) * 2 + (q - M.home[0]) : (q * 7 + r * 3) % 10;
      put(g, D.tvCase(), x, y, { sc, lift: 0.6 * sc + 0.1 });
      D.screen(g, x, y, sc, i, home ? lt : lt + q * 0.3 + r, { tiny: sc < 0.5, bright: home ? 1 + 0.06 * Math.sin(lt * (7 + i) + i * 2) : 1 + 0.08 * Math.sin(lt * 6 + q * 1.7 + r * 2.3) });   // the ten carry on exactly as on the wall
      const sk = stickAt ? stickAt(key) : 0;
      if (dim > 0 && !RANK.has(key)) { g.fillStyle = `rgba(4,8,8,${0.62 * dim})`; g.fillRect(x - D.TV.w * sc / 2, y - D.TV.h * sc / 2, D.TV.w * sc, D.TV.h * sc); }
      if (twinkle > 0) { const ph = ((q * 13 + r * 7) % 17) / 17, tw = Math.pow(Math.max(0, Math.sin(lt * 4.2 + ph * TAU)), 10) * twinkle; D.sparkle(g, x + 40 * sc, y - 40 * sc, Math.max(7, 26 * sc), tw); }
      if (ai) { const [ak, ag] = ai(q, r, key); if (ak > 0.01) D.sparkle(g, x + 40 * sc, y - 40 * sc, Math.max(8, 24 * sc) * ag, ak * (0.88 + 0.12 * Math.sin(lt * 7 + q * 1.3 + r))); }
      if (sk > 0) D.label(g, x - 36 * sc, y - 50 * sc, sk, -0.12 + ((q * 5 + r) % 5 - 2) * 0.05, sc * (sc < 0.5 ? 1.6 : 1));
    }
  }

  // 1 · THE HOOK. Frame one is the wall of ten, every candidate mid-speech, under "US midterms: spot the AI ad." Nothing
  // on the screens says which. The frame lands at 1.03 and settles back.
  SCENES['lssv_hook'] = { draw(c, lt) {
    const ID = 'lssv_hook', dur = D.dur(ID), k = 1 + (PUNCH - 1) * (1 - D.ease.out(lt / 0.5));
    const cam = { x: Math.sin(lt * 0.33) * 6, y: 0, z: 1, fx: 540, fy: 1000 };
    framed(c, k, () => stack(c, wallLayers(lt), cam));
    box(c);
  } };

  // 2 · Trick question: all ten are. On the pop every screen sparkles at once, and keeps sparkling; a white flash.
  SCENES['lssv_all'] = { draw(c, lt) {
    const ID = 'lssv_all', tA = D.at(ID, 'all', 1.0);
    // every screen gets the AI sparkle at once, big on the pop (left to right with the blips) and staying lit after
    const burst = { fn: (g, ox) => { if (lt < tA) return; D.SPOT.forEach((p, i) => { const t = lt - tA - i * 0.03; if (t <= 0) return;
      D.sparkle(g, p.x + OX + ox + 40 * D.TVS, p.y + DY - 40 * D.TVS, 30 + 44 * Math.exp(-t * 3.5), Math.min(1, t / 0.1) * (0.85 + 0.15 * Math.sin(lt * 9 + i))); }); }, d: 0.08 };
    const cam = { x: Math.sin((lt + 3) * 0.33) * 6, y: 0, z: D.punch(lt, [tA], { open: 0, kick: 0.5 }), fx: 540, fy: 1000 };
    framed(c, 1 + 0.02 * Math.exp(-Math.max(0, lt - tA) * 8) * (lt >= tA ? 1 : 0), () => stack(c, wallLayers(lt, {}, [burst]), cam));
    if (lt >= tA) { c.fillStyle = `rgba(255,252,240,${0.32 * Math.exp(-(lt - tA) * 9)})`; c.fillRect(0, 0, W, H); }
    box(c);
  } };

  // 3 · Over $137M on 220 like them. The camera pulls back fast to the 220 (every screen twinkles now: all of them are
  // AI ads), and the counter rolls up and lands on the pop.
  SCENES['lssv_count'] = { draw(c, lt) {
    const ID = 'lssv_count', tR = D.at(ID, 'roll', 0.15), tN = D.at(ID, 'count', 1.3), dur = D.dur(ID);
    const k = D.ease.io(clamp(lt / 0.9, 0, 1));
    const cam = { x: Math.sin(lt * 0.3) * 4, y: 0, z: D.punch(lt, [tN], { kick: 0.5 }), fx: 540, fy: 1000 };
    framed(c, 1 + 0.025 * Math.exp(-Math.max(0, lt - tN) * 7) * (lt >= tN ? 1 : 0), () => stack(c, [
      { sh: D.room(), d: 0.03, lift: 0 },
      { fn: (g, ox) => mosaic(g, ox, lt, k, { twinkle: clamp((lt - 0.4) / 0.4, 0, 1),
        appear: (q, r) => D.pop(lt, 0.06 + 0.045 * Math.hypot(q - M.home[0] - 0.5, (r - M.home[1] - 2) * M.ph / M.pw), 0.22) }), d: 0.08 },
      { fn: (g, ox) => { if (lt < tR - 0.1) return; const a = clamp((lt - tR + 0.1) / 0.2, 0, 1);
        g.save(); g.globalAlpha = a; D.counter(g, 540 + ox, CY, D.ui('count', '$137,000,000'), clamp((lt - tR) / Math.max(0.2, tN - tR), 0, 1), lt); g.restore(); }, d: 0.1 },
    ], cam));
    CW.tag(c, D.ui('dateline', 'WESLEYAN MEDIA PROJECT · 15.10.2026'), lt, dur);
    box(c);
  } };

  // 4 · THE ESCALATION. Labelled as AI: about 3 in 10. A ripple runs out from the home ten and slaps a sticker on 66
  // of the 220, landing on the pop; then the 154 with nothing go dark.
  SCENES['lssv_ripple'] = { draw(c, lt) {
    const ID = 'lssv_ripple', tA = D.at(ID, 'rip', 0.4), tB = D.at(ID, 'three', 1.6), dur = D.dur(ID), n = STUCK.length;
    const stickAt = (key) => { if (!RANK.has(key)) return 0; const t = tA + (RANK.get(key) / (n - 1)) * (tB - tA); return D.pop(lt, t, 0.14); };
    const dim = D.ease.out((lt - tB - 0.15) / 0.5);
    const cam = { x: Math.sin(lt * 0.3) * 4, y: 0, z: D.punch(lt, [tB], { kick: 0.5 }), fx: 540, fy: 1000 };
    framed(c, 1 + 0.025 * Math.exp(-Math.max(0, lt - tB) * 7) * (lt >= tB ? 1 : 0), () => stack(c, [
      { sh: D.room(), d: 0.03, lift: 0 },
      { fn: (g, ox) => mosaic(g, ox, lt, 1, { stickAt, dim, twinkle: 0.6 * (1 - dim) }), d: 0.08 },
      { fn: (g, ox) => { g.save(); g.globalAlpha = 0.9; D.counter(g, 540 + ox, CY, D.ui('count', '$137,000,000'), 1, lt); g.restore(); }, d: 0.1 },
    ], cam));
    CW.tag(c, D.ui('tagLabels', '~3 IN 10 LABELLED · WESLEYAN'), lt, dur);
    box(c);
  } };

  // 5 · THE PUNCHLINE. The wall again, three labelled. On "About three" the marker rings them; on "said so" the seven
  // stickers nobody used tumble down past the seven bare screens and out of the frame; then the frame eases back to
  // the opening one (1.03, the camera centred), so the end hands into the start.
  const FALL = Array.from({ length: 7 }, (_, n) => ({ x: 330 + n * 78 + ((n * 37) % 23), dt: n * 0.085, rot: (n % 2 ? 1 : -1) * (0.4 + n * 0.11), spin: (n % 3 - 1) * 2.4 + (n % 2 ? 1.2 : -1.2), vx: ((n * 53) % 7 - 3) * 22 }));
  SCENES['lssv_end'] = { draw(c, lt) {
    const ID = 'lssv_end', tM = D.at(ID, 'mark', 1.4), tS = D.at(ID, 'said', 2.6), tF = D.at(ID, 'fall', tS + 0.15), dur = D.dur(ID), MK = D.marks();
    const RING = 0.3, GAPR = 0.05, sched = [0, 1, 2].map((n) => tM + n * (RING + GAPR));
    const back = D.ease.io(clamp((lt - (dur - 0.9)) / (0.9 - 1 / 30), 0, 1));                                    // the hand-off to frame one
    const cam = { x: Math.sin(lt * 0.26) * 6 * (1 - back), y: 0, z: D.punch(lt, [tS], { kick: 0.5 }), fx: 540, fy: 1000 };
    const ringLayer = { fn: (g, ox) => {
      g.save(); g.translate(OX + ox, DY); let tip = null;
      MK.forEach((m, n) => { const k = (lt - sched[n]) / RING; if (k <= 0) return; const t = D.drawMark(g, m, D.ease.out(k)); if (k < 1) tip = t; });
      const last = sched[2] + RING, rest = [1080, 2000], RG = [7, 8, 9], near = (i) => [D.SPOT[i].x + 150, D.SPOT[i].y - 120];
      let pen = null;
      if (tip) pen = tip;
      else if (lt < sched[0] && lt > sched[0] - 0.5) { const k = D.ease.out((lt - (sched[0] - 0.5)) / 0.5), q = near(RG[0]); pen = [lerp(rest[0], q[0], k), lerp(rest[1], q[1], k)]; }
      else if (lt >= sched[0] && lt < last) { const n = sched.findIndex((t) => lt < t); if (n > 0) pen = near(RG[n]); }
      else if (lt >= last) { const k = D.ease.out((lt - last) / 0.45), q = near(RG[2]); if (k < 1) pen = [lerp(q[0], rest[0], k), lerp(q[1] + 200, rest[1], k)]; }
      if (pen && pen[1] < 1960) D.marker(g, pen[0], pen[1]);
      g.restore();
    }, d: 0.08 };
    const fallLayer = { fn: (g, ox) => {
      for (const f of FALL) { const t = lt - tF - f.dt; if (t <= 0) continue;
        const y = -90 + 220 * t + 0.5 * 1800 * t * t; if (y > H + 120) continue;                                    // paper: slower than a stone
        D.label(g, f.x + f.vx * t + Math.sin(t * 4 + f.x) * 40 + ox, y, 1, f.rot + f.spin * t, D.TVS); }
    }, d: 0.12 };
    framed(c, lerp(1, PUNCH, back), () => stack(c, wallLayers(lt, { labels: LABELS }, [ringLayer, fallLayer]), cam));
    box(c);
  } };

  // ═══ VIRAL v2 (owner, 23 Oct: "needs clarity of messaging") ═══════════════════════════════════════════════════
  // Every caption stands on its own for a cold viewer; no riddle. Four shots. The wall becomes the 220 as "220
  // political ads" comes up, and every screen lights with the AI sparkle on "AI" (the sparkle IS "made using AI" from
  // here on); the counter lands on $137 million; stickers ripple onto about 3 in 10 and the rest go dark; the ten again:
  // the three labelled ones ringed on "Three told you.", the seven bare ones flaring with the sparkle on "Seven
  // didn't." (AI, and no label), and the frame eases back to the opening one for the loop.
  const fromHome = (q, r) => Math.hypot(q - M.home[0] - 0.5, (r - M.home[1] - 2) * M.ph / M.pw);
  /** the AI sparkle arriving on every set at tA, in a wave out from the ten: [strength, size] */
  const aiWave = (lt, tA) => (q, r) => { const t = lt - tA - 0.025 * fromHome(q, r); return t <= 0 ? [0, 1] : [Math.min(1, t / 0.08), 1 + 1.3 * Math.exp(-t * 4)]; };

  // 1 · THE HOOK. Frame one is the wall of ten. On "220 political ads" the camera pulls back and the other 210 pop in
  // round the ten; on "AI" every one of the 220 lights with the sparkle.
  SCENES['lssv2_hook'] = { draw(c, lt) {
    const ID = 'lssv2_hook', tP = D.at(ID, 'pull', 0.5), tA = D.at(ID, 'ai', 1.4);
    const k = lt < tP ? -1 : D.ease.io(clamp((lt - tP) / 1.0, 0, 1));
    const fk = (1 + (PUNCH - 1) * (1 - D.ease.out(lt / 0.5))) * (lt >= tA ? 1 + 0.025 * Math.exp(-(lt - tA) * 7) : 1);
    const cam = { x: Math.sin(lt * 0.33) * 6, y: 0, z: D.punch(lt, [tA], { open: 0, kick: 0.4 }), fx: 540, fy: 1000 };
    framed(c, fk, () => stack(c, k < 0 ? wallLayers(lt) : [
      { sh: D.room(), d: 0.03, lift: 0 },
      { fn: (g, ox) => mosaic(g, ox, lt, k, { shelves: true, ai: aiWave(lt, tA),
        appear: (q, r) => D.pop(lt, tP + 0.06 + 0.045 * fromHome(q, r), 0.22) }), d: 0.08 },
    ], cam));
    box(c);
  } };

  // 2 · Over $137 million spent airing them. The 220 hold, all lit; the counter rolls up and lands on the pop.
  SCENES['lssv2_count'] = { draw(c, lt) {
    const ID = 'lssv2_count', tR = D.at(ID, 'roll', 0.1), tN = D.at(ID, 'count', 0.6), dur = D.dur(ID);
    const cam = { x: Math.sin((lt + 4.8) * 0.33) * 6, y: 0, z: D.punch(lt, [tN], { kick: 0.5 }), fx: 540, fy: 1000 };
    framed(c, 1 + 0.025 * Math.exp(-Math.max(0, lt - tN) * 7) * (lt >= tN ? 1 : 0), () => stack(c, [
      { sh: D.room(), d: 0.03, lift: 0 },
      { fn: (g, ox) => mosaic(g, ox, lt, 1, { ai: () => [1, 1] }), d: 0.08 },
      { fn: (g, ox) => { const a = clamp((lt - tR + 0.1) / 0.2, 0, 1); if (a <= 0) return;
        g.save(); g.globalAlpha = a; D.counter(g, 540 + ox, CY, D.ui('count', '$137,000,000'), clamp((lt - tR) / Math.max(0.2, tN - tR), 0, 1), lt); g.restore(); }, d: 0.1 },
    ], cam));
    CW.tag(c, D.ui('dateline', 'WESLEYAN MEDIA PROJECT · 15.10.2026'), lt, dur);
    box(c);
  } };

  // 3 · How many tell you they used AI? About 3 in 10. A ripple out from the ten puts a MADE WITH AI sticker on 66 of
  // the 220 (30%), landing on the pop; then the 154 with nothing go dark. The counter has said its piece and goes.
  SCENES['lssv2_ripple'] = { draw(c, lt) {
    const ID = 'lssv2_ripple', tA = D.at(ID, 'rip', 0.8), tB = D.at(ID, 'three', 1.6), dur = D.dur(ID), n = STUCK.length;
    const stickAt = (key) => { if (!RANK.has(key)) return 0; const t = tA + (RANK.get(key) / (n - 1)) * (tB - tA); return D.pop(lt, t, 0.14); };
    const dim = D.ease.out((lt - tB - 0.15) / 0.5);
    const cam = { x: Math.sin((lt + 9.2) * 0.33) * 6, y: 0, z: D.punch(lt, [tB], { kick: 0.5 }), fx: 540, fy: 1000 };
    framed(c, 1 + 0.025 * Math.exp(-Math.max(0, lt - tB) * 7) * (lt >= tB ? 1 : 0), () => stack(c, [
      { sh: D.room(), d: 0.03, lift: 0 },
      { fn: (g, ox) => mosaic(g, ox, lt, 1, { stickAt, dim, ai: (q, r, key) => [RANK.has(key) ? 1 : 1 - 0.85 * dim, 1] }), d: 0.08 },
      { fn: (g, ox) => { const a = 1 - clamp(lt / 0.3, 0, 1); if (a <= 0) return;
        g.save(); g.globalAlpha = a; D.counter(g, 540 + ox, CY, D.ui('count', '$137,000,000'), 1, lt); g.restore(); }, d: 0.1 },
    ], cam));
    CW.tag(c, D.ui('tagLabels', '~3 IN 10 LABELLED · WESLEYAN'), lt, dur);
    box(c);
  } };

  // 4 · THE PUNCHLINE. Ten AI ads. Three told you. Seven didn't. The wall again with its three stickers: on "Three
  // told you." the marker rings the three; on "Seven didn't." the seven bare screens flare with the AI sparkle (they
  // are AI ads too, with nothing on them). Then the frame eases back to the opening one (1.03, the camera centred).
  const BARE = [0, 1, 2, 3, 4, 5, 6].filter((i) => !D.LABELLED.includes(i));
  SCENES['lssv2_end'] = { draw(c, lt) {
    const ID = 'lssv2_end', tM = D.at(ID, 'mark', 0.8), tS = D.at(ID, 'seven', 1.4), dur = D.dur(ID), MK = D.marks(), RING = 0.32;
    const back = D.ease.io(clamp((lt - (dur - 0.9)) / (0.9 - 1 / 30), 0, 1));                                    // the hand-off to frame one
    const cam = { x: Math.sin(lt * 0.26) * 6 * (1 - back), y: 0, z: D.punch(lt, [tS], { kick: 0.5 }), fx: 540, fy: 1000 };
    const ringLayer = { fn: (g, ox) => { g.save(); g.translate(OX + ox, DY);
      MK.forEach((m, n) => { const k = (lt - tM - n * 0.08) / RING; if (k > 0) D.drawMark(g, m, D.ease.out(k)); }); g.restore(); }, d: 0.08 };
    const sevenLayer = { fn: (g, ox) => { if (lt < tS) return; BARE.forEach((i, n) => { const t = lt - tS - n * 0.035; if (t <= 0) return; const p = D.SPOT[i];
      D.sparkle(g, p.x + OX + ox + 40 * D.TVS, p.y + DY - 40 * D.TVS, 30 + 44 * Math.exp(-t * 3.5), Math.min(1, t / 0.1) * (0.85 + 0.15 * Math.sin(lt * 9 + i)) * (1 - back)); }); }, d: 0.08 };
    framed(c, lerp(1, PUNCH, back) * (lt >= tS ? 1 + 0.02 * Math.exp(-(lt - tS) * 8) : 1), () => stack(c, wallLayers(lt, { labels: LABELS }, [ringLayer, sevenLayer]), cam));
    box(c);
  } };
})();
