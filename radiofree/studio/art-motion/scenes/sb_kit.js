// The kit for "The Scoreboard" (Nordic 2) — the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline.
// One question: Denmark's bill exempts satire, so who decides what satire is? The courts, and courts have answered
// both ways since 1831. The device is an old flip-card scoreboard, COURTS | SATIRE, hung over a paper courtroom
// bench and labelled small CASES IN THIS FILM, so the tally is honest about being a selection.
// The look is Copenhagen, cool and pale: the Folketinget's grey stone and green copper, ash-wood furniture, daylight
// from high windows. It must not repeat film 5 (Satire Excepted): no red, no candlelight, no balance scale.
//   Times come from window.FILM_PLAN (pipeline/plan.mjs), loaded before this kit: SB.at('sb_before', 'guilty') is
//   the moment the caption's word lands, in the shot's own seconds.
window.SB = (() => {
  const { K, W, H, sheet, sprite, put, glow } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.43 };
  const at = (id, name, dflt = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? dflt : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const C = {
    stone0: '#8f9a9c', stone1: '#b5bebe', stone2: '#d3d8d4', joint: '#7d8789', copper: '#5f9e8a', copperD: '#3f7564', copperL: '#86bba6',
    ash0: '#9b7b55', ash1: '#c09a6b', ash2: '#dcbd8e', ashD: '#6e5236', cream: '#efe8d6', creamD: '#d2c8b0', ink: '#1b1d1f',
    board: '#15191b', boardL: '#22292c', card: '#f4f1e8', cardD: '#c8c2b2', bulb: '#ffe9a8', red: '#c9342b', green: '#2f8a57', navy: '#24364a',
  };
  const ease = { out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3), io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
  function punch(lt, hits = [], { open = 0.05, settle = 0.35, kick = 0.035 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }

  // ── the room: a pale stone hall, copper-green pilasters, high windows ────────────────────────────────────────
  const wall = () => sheet('sb_wall', (g) => {
    const v = g.createLinearGradient(0, 0, 0, 1400); v.addColorStop(0, C.stone0); v.addColorStop(1, C.stone1); g.fillStyle = v; g.fillRect(-90, -90, W + 180, 1500);
    g.fillStyle = 'rgba(0,0,0,.05)'; for (let y = 120; y < 1300; y += 86) g.fillRect(-90, y, W + 180, 2);                       // the stone courses
    for (let r = 0; r * 86 + 120 < 1300; r++) for (let x = (r % 2) * 90 - 90; x < W + 90; x += 180) g.fillRect(x, 120 + r * 86, 2, 86);
    for (const wx of [120, 960]) {                                                                                             // two high windows
      g.fillStyle = C.joint; g.beginPath(); g.roundRect(wx - 84, 210, 168, 420, [84, 84, 0, 0]); g.fill();
      const gl = g.createLinearGradient(0, 220, 0, 620); gl.addColorStop(0, '#e9f2f3'); gl.addColorStop(1, '#b9cfd2'); g.fillStyle = gl; g.beginPath(); g.roundRect(wx - 70, 224, 140, 396, [70, 70, 0, 0]); g.fill();
      g.fillStyle = C.joint; g.fillRect(wx - 3, 224, 6, 396); g.fillRect(wx - 70, 420, 140, 6);
    }
    g.fillStyle = C.copperD; for (const x of [250, 830]) g.fillRect(x - 18, 120, 36, 1200);                                     // copper pilasters
    g.fillStyle = C.copper; for (const x of [250, 830]) g.fillRect(x - 14, 120, 18, 1200);
    g.fillStyle = C.copperD; g.fillRect(-90, 100, W + 180, 26); g.fillStyle = C.copperL; g.fillRect(-90, 100, W + 180, 5);       // the copper cornice
    g.fillStyle = '#6f7a7c'; g.fillRect(-90, 1250, W + 180, 90);                                                                   // the plinth
  }, 12);
  const floor = () => sheet('sb_floor', (g) => {
    g.fillStyle = '#5d6567'; g.fillRect(-90, 1330, W + 180, H);
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(-90 + i * 110, 1330); g.lineTo(-400 + i * 190, H + 90); g.lineTo(-392 + i * 190, H + 90); g.lineTo(-86 + i * 110, 1330); g.fill(); }
  }, 6);
  /** cool daylight in long shafts from the high windows, dust turning in them */
  function daylight(c, lt, a = 1) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const [wx, dir] of [[120, 1], [960, -1]]) {
      const g = c.createLinearGradient(wx, 300, wx + dir * 420, 1500); g.addColorStop(0, `rgba(225,240,245,${0.16 * a})`); g.addColorStop(1, 'rgba(225,240,245,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(wx - 70, 300); c.lineTo(wx + 70, 300); c.lineTo(wx + dir * 600 + 160, 1600); c.lineTo(wx + dir * 600 - 240, 1600); c.closePath(); c.fill();
    }
    const r = U.rng(4); for (let i = 0; i < 50; i++) {
      const x = r() * W + Math.cos(lt * 0.3 + i * 2) * 16, y = 300 + r() * 1200 + Math.sin(lt * 0.4 + i) * 20;
      c.fillStyle = `rgba(255,255,255,${(0.07 + r() * 0.12) * a})`; c.beginPath(); c.arc(x, y, 1 + r() * 1.6, 0, TAU); c.fill();
    }
    c.restore();
  }

  // ── the bench: a long ash-wood judges' bench, the crown-less Danish kind, a plain carved panel ────────────────
  const bench = () => sheet('sb_bench', (g) => {
    g.fillStyle = C.ashD; g.fillRect(40, 1280, 1000, 30);
    g.fillStyle = C.ash1; g.fillRect(60, 1310, 960, 300);
    g.fillStyle = C.ash2; g.fillRect(40, 1268, 1000, 16);
    g.fillStyle = C.ash0; for (const x of [90, 400, 710]) { g.beginPath(); g.roundRect(x, 1340, 280, 230, 8); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.12)'; for (const x of [90, 400, 710]) g.fillRect(x, 1340, 280, 4);
    g.fillStyle = C.copperD; g.beginPath(); g.arc(540, 1455, 46, 0, TAU); g.fill(); g.fillStyle = C.copper; g.beginPath(); g.arc(540, 1455, 38, 0, TAU); g.fill();   // a copper roundel, no crest
    g.strokeStyle = C.copperL; g.lineWidth = 4; g.beginPath(); g.moveTo(520, 1440); g.lineTo(560, 1440); g.moveTo(540, 1430); g.lineTo(540, 1475); g.moveTo(518, 1462); g.lineTo(562, 1462); g.stroke();   // the scales of justice, as a mark
  }, 12);

  // ── the scoreboard: two flip-card windows under COURTS | SATIRE, a border of bulbs, the honest small print ────
  const BX = 540, BY = 700, BW = 780, BH = 360;
  const boardBody = () => sprite('sb_board', BW + 60, BH + 120, (BW + 60) / 2, (BH + 120) / 2, (g) => {
    g.fillStyle = C.copperD; g.beginPath(); g.roundRect(-BW / 2 - 16, -BH / 2 - 16, BW + 32, BH + 32, 18); g.fill();
    g.fillStyle = C.board; g.beginPath(); g.roundRect(-BW / 2, -BH / 2, BW, BH, 12); g.fill();
    g.fillStyle = C.boardL; g.fillRect(-BW / 2 + 20, -BH / 2 + 86, BW - 40, 3);
    g.fillStyle = C.boardL; g.fillRect(-2, -BH / 2 + 96, 4, BH - 150);
    for (const x of [-BW / 2 + 120, BW / 2 - 120]) { g.strokeStyle = '#0b0b0b'; g.lineWidth = 6; g.beginPath(); g.moveTo(x, -BH / 2 - 16); g.lineTo(x, -BH / 2 - 120); g.stroke(); }   // the chains it hangs from
  }, 10);
  /** one flip card: a digit on a split card. k = 0..1 flips from `from` to `to`; spin > 0 keeps it turning */
  function card(c, x, y, from, to, k, { w = 170, h = 190, font = 150, spin = 0 } = {}) {
    const face = (txt, half) => {                                            // half: -1 top, 1 bottom
      c.save(); c.beginPath(); half < 0 ? c.rect(x - w / 2, y - h / 2, w, h / 2) : c.rect(x - w / 2, y, w, h / 2); c.clip();
      c.fillStyle = half < 0 ? C.card : '#e6e1d4'; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 10); c.fill();
      c.fillStyle = C.ink; c.font = `${font}px "Anton-400"`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(txt), x, y + 6); c.restore();
    };
    if (spin > 0) { const f = (spin * 9) % 1; to = from; k = f; }
    k = clamp(k, 0, 1);
    face(to, -1); face(k < 1 ? from : to, 1);
    if (k > 0 && k < 1) {                                                    // the falling flap: the old top folding down, then the new bottom
      c.save(); c.translate(x, y);
      if (k < 0.5) { const s = 1 - k * 2; c.scale(1, s); c.translate(-x, -y); face(from, -1); }
      else { const s = (k - 0.5) * 2; c.scale(1, s); c.translate(-x, -y); face(to, 1); }
      c.restore();
    }
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(x - w / 2, y - 1.5, w, 3);    // the split
  }
  /** the whole board. s = { courts: [from, to, k], satire: [from, to, k] }, lit 0..1, dark 0..1 */
  function board(c, lt, s, { lit = 1, dark = 0, x = BX, y = BY, sc = 1 } = {}) {
    c.save(); c.translate(x, y); c.scale(sc, sc); c.translate(-BX, -BY);
    put(c, boardBody(), BX, BY, { lift: 1.3 });
    const [lc, ls] = ui('board', 'COURTS · SATIRE').split(' · ');
    c.fillStyle = C.cream; c.font = '54px "Anton-400"'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(lc, BX - BW / 4, BY - BH / 2 + 66); c.fillText(ls, BX + BW / 4, BY - BH / 2 + 66);
    card(c, BX - BW / 4, BY + 30, ...s.courts); card(c, BX + BW / 4, BY + 30, ...s.satire);
    c.fillStyle = 'rgba(239,232,214,.75)'; c.font = '24px "ArchivoBlack-400"'; c.fillText(ui('boardSmall', 'CASES IN THIS FILM'), BX, BY + BH / 2 - 22);
    const n = 26; for (let i = 0; i < n; i++) {                              // the bulbs: they come on one by one, and go out for "dark"
      const t = i / n, px = t < 0.5 ? BX - BW / 2 + 10 + (t / 0.5) * (BW - 20) : BX + BW / 2 - 10 - ((t - 0.5) / 0.5) * (BW - 20), py = t < 0.5 ? BY - BH / 2 + 8 : BY + BH / 2 - 8;
      const on = clamp(lit * n - i, 0, 1) * (1 - dark) * (0.85 + 0.15 * Math.sin(lt * 9 + i * 1.7));
      c.fillStyle = on > 0.05 ? `rgba(255,233,168,${0.35 + 0.65 * on})` : '#3a3a34'; c.beginPath(); c.arc(px, py, 7, 0, TAU); c.fill();
      if (on > 0.05) glow(c, px, py, 26, 'rgba(255,220,140,', 0.35 * on);
    }
    c.restore();
  }
  /** the new row that slides in under the board for the last shot: DENMARK and a card that will not settle */
  function denmarkRow(c, lt, k, spin) {
    if (k <= 0) return; const y = BY + BH / 2 + 110 + (1 - ease.back(k)) * -60, a = clamp(k * 2, 0, 1);
    c.save(); c.globalAlpha = a;
    c.fillStyle = C.copperD; c.beginPath(); c.roundRect(BX - BW / 2 - 16, y - 70, BW + 32, 140, 14); c.fill();
    c.fillStyle = C.board; c.beginPath(); c.roundRect(BX - BW / 2, y - 56, BW, 112, 10); c.fill();
    // a Dannebrog swallow-tail pennant, the colours only: white cross on red
    c.fillStyle = C.red; c.fillRect(BX - BW / 2 + 30, y - 30, 84, 60); c.fillStyle = '#fff'; c.fillRect(BX - BW / 2 + 56, y - 30, 12, 60); c.fillRect(BX - BW / 2 + 30, y - 6, 84, 12);
    c.fillStyle = C.cream; c.font = '64px "Anton-400"'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(ui('denmark', 'DENMARK'), BX - BW / 2 + 140, y + 4);
    card(c, BX + BW / 2 - 100, y, '?', '?', 1, { w: 120, h: 96, font: 76, spin });
    c.restore();
  }

  // ── the exhibits ─────────────────────────────────────────────────────────────────────────────────────────────
  /** Philipon's own defence, drawn at his 1831 trial: four heads, the first a king, the last a pear — line art on a
   *  strip of cream paper pinned up as evidence. Generic line drawing; the pear is the point. */
  const pearStrip = () => sprite('sb_pear', 860, 300, 430, 150, (g) => {
    g.fillStyle = C.cream; g.beginPath(); g.roundRect(-410, -130, 820, 260, 6); g.fill();
    g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(-410, 100, 820, 30);
    for (let i = 0; i < 4; i++) {
      const k = i / 3, cx = -300 + i * 200, cy = 6;
      const top = lerp(52, 30, k), mid = lerp(62, 50, k), bot = lerp(60, 80, k), h = 100;
      g.strokeStyle = C.ink; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath();
      g.moveTo(cx, cy - h * 0.62);
      g.bezierCurveTo(cx + top, cy - h * 0.62, cx + mid, cy - h * 0.1, cx + bot, cy + h * 0.25);
      g.bezierCurveTo(cx + bot, cy + h * 0.62, cx - bot, cy + h * 0.62, cx - bot, cy + h * 0.25);
      g.bezierCurveTo(cx - mid, cy - h * 0.1, cx - top, cy - h * 0.62, cx, cy - h * 0.62); g.stroke();
      g.globalAlpha = 1 - k;                                                   // the face fades out of it, step by step
      g.beginPath(); g.moveTo(cx - 40, cy - 70); g.quadraticCurveTo(cx, cy - 100, cx + 40, cy - 70); g.stroke();       // the quiff
      g.fillStyle = C.ink; for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 18, cy - 18, 4, 0, TAU); g.fill(); }
      g.beginPath(); g.moveTo(cx - 16, cy + 22); g.quadraticCurveTo(cx, cy + 30, cx + 16, cy + 22); g.stroke();
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * (mid - 4), cy - 20); g.lineTo(cx + s * (mid - 2), cy + 20); g.stroke(); }  // the sideburns
      g.globalAlpha = k; g.beginPath(); g.moveTo(cx, cy - h * 0.62); g.quadraticCurveTo(cx + 6, cy - h * 0.78, cx + 14, cy - h * 0.84); g.stroke();   // the stalk
      g.globalAlpha = 1;
    }
    g.fillStyle = C.navy; for (const x of [-380, 380]) { g.beginPath(); g.arc(x, -112, 9, 0, TAU); g.fill(); }        // pins
  }, 8);
  /** the 1988 exhibit: a blank liquor-ad poster — a bottle and a glass, an empty frame where a face would be, and the
   *  small print it really carried. Never the parody's content. */
  const adPoster = () => sprite('sb_ad', 420, 560, 210, 280, (g) => {
    g.fillStyle = '#efe4c8'; g.beginPath(); g.roundRect(-190, -260, 380, 520, 6); g.fill();
    g.fillStyle = C.navy; g.fillRect(-190, -260, 380, 70);
    g.fillStyle = '#dccfae'; g.beginPath(); g.roundRect(-150, -170, 180, 210, 6); g.fill();                    // the blank where a face went
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.strokeRect(-150, -170, 180, 210); g.setLineDash([]);
    g.fillStyle = '#7a2b23'; g.beginPath(); g.roundRect(70, -150, 70, 200, [30, 30, 8, 8]); g.fill(); g.fillRect(92, -200, 26, 60);   // a bottle
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(80, -120, 10, 140);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 5; i++) g.fillRect(-150, 80 + i * 22, 300 - (i % 2) * 60, 8);
    g.fillStyle = C.ink; g.font = '17px "ArchivoBlack-400"'; g.textAlign = 'center';
    g.fillText('AD PARODY — NOT TO BE', 0, 222); g.fillText('TAKEN SERIOUSLY', 0, 244);
  }, 8);
  /** an AI fake on a phone: a blank paper head (nobody's face) whose cut-out mouth flaps — the voice is the fake */
  function phone(c, x, y, lt, talk = 1, { sc = 1, rot = 0 } = {}) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
    put(c, sprite('sb_phone', 300, 560, 150, 280, (g) => {
      g.fillStyle = '#1d2226'; g.beginPath(); g.roundRect(-130, -260, 260, 520, 34); g.fill();
      const v = g.createLinearGradient(0, -230, 0, 230); v.addColorStop(0, '#cfe3ea'); v.addColorStop(1, '#a9c5cf'); g.fillStyle = v; g.beginPath(); g.roundRect(-112, -232, 224, 464, 20); g.fill();
      g.fillStyle = C.navy; g.fillRect(-112, 40, 224, 192);                                                       // the suit
      g.fillStyle = '#e9e4d8'; g.beginPath(); g.ellipse(0, -40, 74, 92, 0, 0, TAU); g.fill();                     // a blank paper head
      g.fillStyle = '#f4f1e8'; g.beginPath(); g.moveTo(-20, 40); g.lineTo(20, 40); g.lineTo(0, 120); g.closePath(); g.fill();
    }, 8), 0, 0, { lift: 1.2 });
    const m = Math.abs(Math.sin(lt * 11)) * talk;                              // the mouth: a cut-out flap on a hinge
    c.fillStyle = '#2a1f1a'; c.beginPath(); c.ellipse(0, 10, 26, 4 + m * 14, 0, 0, TAU); c.fill();
    c.restore();
  }
  /** a cardboard campaign loudspeaker on a pole, with a sound wave cut from card — a cloned voice, no face */
  function speaker(c, x, y, lt, talk = 1, { sc = 1 } = {}) {
    c.save(); c.translate(x, y); c.scale(sc, sc);
    put(c, sprite('sb_speaker', 300, 520, 150, 500, (g) => {
      g.fillStyle = '#4b4f52'; g.fillRect(-10, -320, 20, 320);
      g.fillStyle = '#e7e1d2'; g.beginPath(); g.moveTo(-40, -440); g.lineTo(-40, -360); g.lineTo(110, -310); g.lineTo(110, -490); g.closePath(); g.fill();
      g.fillStyle = C.navy; g.fillRect(-80, -430, 44, 60); g.fillStyle = C.red; g.fillRect(-80, -404, 44, 10);
      g.fillStyle = '#efe8d6'; g.beginPath(); g.roundRect(-120, -250, 240, 90, 8); g.fill(); g.fillStyle = C.navy; g.fillRect(-120, -250, 240, 24);
      g.fillStyle = C.ink; g.font = '30px "Anton-400"'; g.textAlign = 'center'; g.fillText('VOTE', 0, -180);
    }, 8), 0, 0, { lift: 1.2 });
    c.strokeStyle = C.cream; c.lineWidth = 6; c.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const r = 50 + i * 34 + ((lt * 60) % 34), a = talk * (1 - i / 3) * 0.9; c.globalAlpha = a; c.beginPath(); c.arc(110, -400, r, -0.6, 0.6); c.stroke(); }
    c.restore();
  }
  /** a stamp, rubber-inked, landing at k (0..1 over its first 0.16 s) */
  const stampSp = (text, col, w = 420) => sprite(`sb_stamp_${text}_${col}`, w + 40, 180, (w + 40) / 2, 90, (g) => {
    g.strokeStyle = col; g.lineWidth = 9; g.strokeRect(-w / 2, -70, w, 140); g.fillStyle = col; g.font = '100px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 6);
  }, 3);
  function stamp(c, text, col, x, y, t, { rot = -0.08, w = 420, sc = 1 } = {}) {
    if (t < 0) return; const k = Math.min(1, t / 0.16);
    put(c, stampSp(text, col, w), x, y, { sc: lerp(1.6, 1, k) * sc, rot, lift: 0.35 });
  }
  const hook = (c, x, y) => { c.fillStyle = '#2b2f31'; c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fill(); };
  const mask = () => sprite('sb_mask', 300, 260, 150, 130, (g) => {   // a jester's half-mask: the old sign for satire
    g.fillStyle = '#f2ecdc'; g.beginPath(); g.moveTo(-120, -40); g.quadraticCurveTo(0, -110, 120, -40); g.quadraticCurveTo(110, 60, 0, 90); g.quadraticCurveTo(-110, 60, -120, -40); g.fill();
    g.fillStyle = C.ink; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 48, -10, 30, 16, s * 0.25, 0, TAU); g.fill(); }
    g.strokeStyle = C.ink; g.lineWidth = 5; g.beginPath(); g.moveTo(-40, 50); g.quadraticCurveTo(0, 74, 40, 50); g.stroke();
    g.fillStyle = C.copper; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 100, -60); g.quadraticCurveTo(s * 140, -130, s * 170, -90); g.lineTo(s * 116, -44); g.fill(); g.fillStyle = '#e2b84a'; g.beginPath(); g.arc(s * 170, -90, 12, 0, TAU); g.fill(); g.fillStyle = C.copper; }
  }, 8);
  const pear = () => sprite('sb_pearfig', 160, 220, 80, 210, (g) => {   // the pear itself, as a little figure in the dock
    g.fillStyle = '#c9b24a'; g.beginPath(); g.moveTo(0, -180); g.bezierCurveTo(30, -180, 40, -110, 60, -70); g.bezierCurveTo(80, -20, 60, 0, 0, 0); g.bezierCurveTo(-60, 0, -80, -20, -60, -70); g.bezierCurveTo(-40, -110, -30, -180, 0, -180); g.fill();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(-24, -80, 12, 30, 0.3, 0, TAU); g.fill();
    g.strokeStyle = '#4a3a1a'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, -178); g.quadraticCurveTo(6, -200, 18, -206); g.stroke();
  }, 8);
  const dock = () => sprite('sb_dock', 360, 260, 180, 250, (g) => {
    g.fillStyle = C.ash0; g.fillRect(-160, -150, 320, 150); g.fillStyle = C.ash2; g.fillRect(-170, -164, 340, 18);
    g.fillStyle = 'rgba(0,0,0,.15)'; for (const x of [-100, 0, 100]) g.fillRect(x - 3, -146, 6, 146);
  }, 10);

  return { C, FP, at, dur, ease, punch, wall, floor, daylight, bench, board, card, denmarkRow, pearStrip, adPoster, phone, speaker, stamp, hook, mask, pear, dock, BX, BY, BW, BH };
})();
