// THE KIT for "Short Supply" (RFH global, GPU and memory prices): the papercut box in CLEAN LIGHT (rfp_clean.js), made
// by the pipeline, a VIRAL cut from its first version (plan/films/31-short-supply.md).
// A graphics card on a store shelf at night; the clipping under it says $570 in June and turns to $805 in August.
// The memory goes the other way: carts of RAM sticks roll out of the DRAM works to an AI data centre whose sign lights
// on "AI". A lawsuit's first page slides onto a desk and ALLEGED is stamped on it on "planned"; the makers' motion to
// dismiss lands on top on "dismiss", the hearing date pinned beside it. Back on the shelf a receipt prints $805.00 on
// "$805", and the clipping turns back to June: frame 0 again.
// Fair on purpose: the box is generic (no maker's logo); the defendants are named only on the allegation's own tag and
// in the post, never as fact; the denial is on screen (Micron's, the one that is public); nobody is drawn.
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs).
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, K } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 3.857 };
  const at = (id, name, d = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? d : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const ease = {
    out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
    io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  };
  const JP = '"NotoSansJP-800"';
  const C = {
    wall: '#141b24', wallL: '#1c2633', peg: '#0d1218', shelf: '#5a3a24', shelfL: '#7a5236', shelfD: '#3a2416', strip: '#20262e',
    boxF: '#1b1f25', boxT: '#2c323b', boxS: '#111419', lime: '#a6e23a', limeD: '#78a822', cardB: '#2b3139', fan: '#3b434e', fanL: '#59636f', ring: '#8d96a3', gold: '#d9a83a',
    other: ['#252a31', '#2a2622', '#22282a'],
    sky: ['#0d1420', '#121b29', '#182334', '#202b3c', '#2b3443', '#3d3a44', '#5a4447', '#7a5246'],
    ground: '#191714', groundL: '#24201b', works: '#4a3f36', worksL: '#5c4f43', worksD: '#362d26', roofW: '#2c241e', win: '#f1c46a', winD: '#5a4a34',
    dc: '#2a3038', dcL: '#38404a', dcD: '#1e2329', led: '#3ad6c4', ledD: '#1d5f58', teal: '#5ff2dc',
    rail: '#3a3530', railL: '#6a625a', tie: '#2a221c', cart: '#7a3b28', cartL: '#96503a', cartD: '#55281b', pcb: '#2f7a43', pcbL: '#3f9657', chip: '#121214', pin: '#d9a83a',
    desk: '#2a1c14', deskL: '#3a281d', deskD: '#1d130d', paper: '#efe8d8', paperD: '#d8cfbb', line: '#b9b09c', ink: '#15120f',
    cream: '#efe6cf', news: '#ece6d6', stamp: '#c8321f', red: '#c8321f', receipt: '#f4f1ea', receiptD: '#dcd7cc',
  };

  // ── type and tags (the house's: fitted fonts, the ochre where/what tag, a centred newsprint tag, a rubber stamp)
  function fitFont(c, text, size, maxW, face) { let s = size; c.font = face.replace('$', s); while (c.measureText(text).width > maxW && s > 18) { s -= 2; c.font = face.replace('$', s); } return s; }
  function tag(c, text, lt, dd, x = 110, t0 = 0.4) {
    const y = R.SAFE_B - 66, a = clamp((lt - t0) / 0.3, 0, 1) * clamp((dd - 0.5 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; fitFont(c, text, 32, 905 - x - 44, `$px "ArchivoBlack-400", ${JP}`); const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }
  function stampMark(c, text, x, y, { k = 1, sc = 1, rot = -0.2, size = 92 } = {}) {
    if (k <= 0) return; const kk = ease.out(clamp(k, 0, 1)), s = sc * lerp(1.9, 1, kk);
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = clamp(k * 3, 0, 1) * 0.92;
    fitFont(c, text, size, 700, `400 $px "Anton-400", ${JP}`); const tw = c.measureText(text).width, fs = parseFloat(c.font), w = tw + 70, h = fs + 56;
    c.strokeStyle = C.stamp; c.lineWidth = 9; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 12); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.roundRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6); c.stroke();
    c.fillStyle = C.stamp; c.textAlign = 'center'; c.fillText(text, 0, fs * 0.36);
    c.globalCompositeOperation = 'destination-out'; const r = U.rng(text.length * 7 + 3);
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 2 + r() * 4, 1 + r() * 3); }
    c.restore();
  }
  /** the price clipping under the shelf: torn newsprint, a label, the price big, the source small. `flip` 0…1 turns it
   *  over (the old face until halfway, then the new one), the way a flip-card turns */
  function priceClip(c, A, B, sub, { flip = 0, a = 1, dy = 0 } = {}) {
    if (a <= 0) return;
    const f = clamp(flip, 0, 1), face = f < 0.5 ? A : B, sy = Math.max(0.03, Math.abs(Math.cos(f * Math.PI)));
    const x = 130, y = 1372 + dy, w = 820, h = 236;
    c.save(); c.globalAlpha = a; c.translate(x + w / 2, y + h / 2); c.rotate(-0.022); c.scale(1, sy); c.translate(-w / 2, -h / 2);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 18; c.shadowOffsetX = 9; c.shadowOffsetY = 13;
    c.fillStyle = C.news; c.beginPath(); c.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) c.lineTo((w * i) / 16, (i % 2) * 7);
    c.lineTo(w, h); for (let i = 16; i >= 0; i--) c.lineTo((w * i) / 16, h - (i % 2) * 7); c.closePath(); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = C.ink; c.textAlign = 'left';
    fitFont(c, face.label, 30, w - 52, `$px "ArchivoBlack-400", ${JP}`); c.fillText(face.label, 26, 46);
    fitFont(c, face.value, 138, w - 52, `400 $px "Anton-400", ${JP}`); c.fillStyle = face.red ? C.red : C.ink; c.fillText(face.value, 24, 184);
    c.fillStyle = 'rgba(21,18,15,.75)'; fitFont(c, sub, 22, w - 52, `$px "ArchivoBlack-400", ${JP}`); c.fillText(sub, 26, 220);
    c.restore();
  }

  // ── the camera: a drift that is 0 at both ends of a shot, and a kick on each hit
  const vcam = (lt, dd, { z = () => 1, hits = [], kick = 0.03, amp = 4 } = {}) => {
    let zz = z(lt); for (const h of hits) if (lt >= h) zz += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    const e = Math.sin(Math.PI * clamp(lt / dd, 0, 1));
    return { x: Math.sin(lt * 2.1) * amp * e, y: Math.cos(lt * 1.7 + 1.2) * amp * 0.8 * e, z: zz, fx: 540, fy: 960 };
  };
  const flash = (c, lt, t, a = 0.2) => { if (lt > t) { const f = Math.exp(-(lt - t) * 7) * a; c.fillStyle = `rgba(255,236,190,${f})`; c.fillRect(0, 0, W, H); } };

  // ══ THE STORE ═════════════════════════════════════════════════════════════════════════════════════════════════
  const SHELF_Y = 1176;                                      // the shelf's top: the box stands on it
  const storeSheet = () => sheet('ssu_store', (g) => {
    const v = g.createLinearGradient(0, 0, 0, H); v.addColorStop(0, C.wall); v.addColorStop(0.55, C.wallL); v.addColorStop(1, C.wall); g.fillStyle = v; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.peg; for (let y = 40; y < SHELF_Y - 20; y += 44) for (let x = 20; x < W; x += 44) { g.beginPath(); g.arc(x + ((y / 44) % 2) * 22, y, 4, 0, TAU); g.fill(); }
    // the next boxes along, dim, cropped by the frame: a shop, not a shrine
    for (const [x, w, h, col] of [[-140, 300, 330, C.other[0]], [930, 300, 360, C.other[1]]]) { g.fillStyle = col; g.fillRect(x, SHELF_Y - h, w, h); g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x, SHELF_Y - h, w, 10); }
    g.fillStyle = C.shelfD; g.fillRect(-90, SHELF_Y + 40, W + 180, H - SHELF_Y + 50);
    g.fillStyle = C.shelf; g.fillRect(-90, SHELF_Y, W + 180, 46); g.fillStyle = C.shelfL; g.fillRect(-90, SHELF_Y, W + 180, 8);
    g.fillStyle = C.strip; g.fillRect(-90, SHELF_Y + 46, W + 180, 30);
    g.fillStyle = 'rgba(255,255,255,.06)'; for (let x = 0; x < W; x += 120) g.fillRect(x + 8, SHELF_Y + 52, 80, 4);
  }, 12);
  /** the box: a generic gamer's graphics card box (no maker, no logo): a lime slash, the card drawn on the front */
  const GPU = () => sprite('ssu_gpu', 620, 460, 310, 230, (g) => {
    g.fillStyle = C.boxT; g.beginPath(); g.moveTo(-280, -190); g.lineTo(-236, -226); g.lineTo(316, -226); g.lineTo(280, -190); g.closePath(); g.fill();
    g.fillStyle = C.boxS; g.beginPath(); g.moveTo(280, -190); g.lineTo(316, -226); g.lineTo(316, 156); g.lineTo(280, 190); g.closePath(); g.fill();
    g.fillStyle = C.boxF; g.fillRect(-280, -190, 560, 380);
    g.fillStyle = C.lime; g.beginPath(); g.moveTo(-280, 120); g.lineTo(-90, 190); g.lineTo(-180, 190); g.lineTo(-280, 152); g.closePath(); g.fill();
    g.fillStyle = C.limeD; g.beginPath(); g.moveTo(-280, 90); g.lineTo(-10, 190); g.lineTo(-40, 190); g.lineTo(-280, 100); g.closePath(); g.fill();
    // the card on the front: a shroud, two fans, the gold fingers of the PCB under it
    g.fillStyle = C.gold; for (let i = 0; i < 14; i++) g.fillRect(-150 + i * 16, 74, 10, 16);
    g.fillStyle = C.cardB; g.beginPath(); g.roundRect(-220, -130, 440, 210, 18); g.fill();
    g.fillStyle = C.lime; g.fillRect(-220, -130, 440, 6);
    for (const fx of [-104, 104]) {
      g.fillStyle = C.ring; g.beginPath(); g.arc(fx, -26, 84, 0, TAU); g.fill(); g.fillStyle = C.fan; g.beginPath(); g.arc(fx, -26, 76, 0, TAU); g.fill();
      g.fillStyle = C.fanL; for (let b = 0; b < 9; b++) { g.save(); g.translate(fx, -26); g.rotate((b / 9) * TAU); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(40, -18, 70, -8); g.quadraticCurveTo(44, 6, 0, 10); g.closePath(); g.fill(); g.restore(); }
      g.fillStyle = C.boxS; g.beginPath(); g.arc(fx, -26, 22, 0, TAU); g.fill(); g.fillStyle = C.lime; g.beginPath(); g.arc(fx, -26, 8, 0, TAU); g.fill();
    }
    g.fillStyle = '#f4f2ec'; g.textAlign = 'right'; g.font = '400 84px "Anton-400"'; g.fillText('16GB', 262, 168);
    g.fillStyle = 'rgba(244,242,236,.8)'; g.textAlign = 'left'; g.font = '22px "ArchivoBlack-400"'; g.fillText('GRAPHICS CARD', -262, -152);
  }, 10);
  const BOX = { x: 540, y: SHELF_Y - 213, sc: 1.12 };   // standing on the shelf at its own scale
  function store(c, lt, cam, { glow = 1, bx = 0 } = {}) {   // bx: the box slid aside (the end makes room for the receipt)
    stack(c, [{ sh: storeSheet(), d: 0.04, lift: 0.2 }, { d: 0.1, fn: (g, ox, oy) => {
      g.save(); g.translate(ox, oy);
      const gr = g.createRadialGradient(540, 640, 30, 540, 900, 760); gr.addColorStop(0, `rgba(255,214,150,${0.26 * glow})`); gr.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = gr; g.fillRect(0, 200, W, 1300);
      put(g, GPU(), BOX.x + bx, BOX.y, { sc: BOX.sc, lift: 1.4 });
      g.restore(); } }], cam);
  }
  const FACE_A = () => ({ label: ui('clipLabelA', 'GRAPHICS CARD · JUNE 2026'), value: '$570' });
  const FACE_B = () => ({ label: ui('clipLabelB', 'GRAPHICS CARD · AUGUST 2026'), value: '$805', red: true });
  const SUB = () => ui('clipSub', "RTX 5060 TI 16GB · NEWEGG MEDIAN (TOM'S HARDWARE)");

  // ═════════ 1 · ssu_hook: frame 0 — the box on the shelf; the clipping says JUNE 2026, $570; on "$805" it turns over:
  //            AUGUST 2026, $805, in red ═════════
  SCENES.ssu_hook = { draw(c, lt) {
    const id = 'ssu_hook', dd = dur(id), tF = at(id, 'flip', 1.2);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.0, 1.035, ease.io(l / dd)), hits: [tF], kick: 0.03 });
    store(c, lt, cam);
    priceClip(c, FACE_A(), FACE_B(), SUB(), { flip: (lt - tF + 0.12) / 0.3 });
    flash(c, lt, tF, 0.16);
    box(c);
  } };

  // ══ THE LINE: the DRAM works, a rail, and the AI data centre ════════════════════════════════════════════════════
  const GY = 1300;                                           // the ground line; the rail runs along it
  const lineSheet = () => sheet('ssu_line', (g) => {
    const step = GY / C.sky.length; C.sky.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, -90 + i * step, W + 180, step + 92); });
    const r = U.rng(11); g.fillStyle = 'rgba(255,240,210,.5)'; for (let i = 0; i < 40; i++) g.fillRect(r() * W, r() * 600, 2, 2);
    // the DRAM works: a sawtooth roof, lit windows, a chimney
    g.fillStyle = C.works; g.fillRect(-60, 900, 470, GY - 900);
    g.fillStyle = C.roofW; g.beginPath(); g.moveTo(-60, 900); for (let i = 0; i < 4; i++) { g.lineTo(-60 + i * 118, 900); g.lineTo(-60 + i * 118 + 92, 830); g.lineTo(-60 + i * 118 + 118, 900); } g.closePath(); g.fill();
    g.fillStyle = C.worksD; g.fillRect(60, 760, 50, 140); g.fillStyle = C.worksL; g.fillRect(60, 760, 50, 10);
    for (let rr = 0; rr < 3; rr++) for (let i = 0; i < 5; i++) { g.fillStyle = (rr + i) % 3 ? C.win : C.winD; g.fillRect(-30 + i * 82, 960 + rr * 86, 52, 50); }
    g.fillStyle = C.worksD; g.fillRect(300, 1170, 110, 130);   // its loading door, where the rail starts
    g.fillStyle = C.cream; g.beginPath(); g.roundRect(80, 1076, 220, 70, 8); g.fill(); g.fillStyle = C.ink; g.font = '400 54px "Anton-400"'; g.textAlign = 'center'; g.fillText('DRAM', 190, 1132);
    // the AI data centre: a dark block, rack stripes, rows of status lights (lit in the scene), its door
    g.fillStyle = C.dc; g.fillRect(620, 760, 520, GY - 760); g.fillStyle = C.dcL; g.fillRect(620, 760, 520, 14);
    for (let i = 0; i < 6; i++) { g.fillStyle = C.dcD; g.fillRect(650 + i * 72, 840, 52, 300); }
    g.fillStyle = C.dcD; g.fillRect(640, 1170, 120, 130);
    // the ground and the rail's ties
    g.fillStyle = C.ground; g.fillRect(-90, GY, W + 180, H - GY + 90); g.fillStyle = C.groundL; g.fillRect(-90, GY, W + 180, 10);
    g.fillStyle = C.tie; for (let x = -40; x < W + 40; x += 46) g.fillRect(x, GY - 6, 26, 18);
    g.fillStyle = C.rail; g.fillRect(-90, GY - 14, W + 180, 8); g.fillStyle = C.railL; g.fillRect(-90, GY - 14, W + 180, 3);
  }, 12);
  /** one RAM stick: a green board, black chips, gold fingers */
  function stick(g, x, y, rot = 0, s = 1) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.fillStyle = C.pcb; g.fillRect(-60, -16, 120, 32); g.fillStyle = C.pcbL; g.fillRect(-60, -16, 120, 4);
    g.fillStyle = C.chip; for (let i = 0; i < 4; i++) g.fillRect(-52 + i * 28, -10, 20, 16);
    g.fillStyle = C.pin; for (let i = 0; i < 10; i++) g.fillRect(-56 + i * 12, 12, 7, 5);
    g.restore();
  }
  /** a cart heaped with sticks */
  const CART = () => sprite('ssu_cart', 220, 190, 110, 150, (g) => {
    const r = U.rng(4); for (let i = 0; i < 7; i++) stick(g, -50 + (i % 3) * 48 + r() * 8, -78 - Math.floor(i / 3) * 18 - r() * 8, (r() - 0.5) * 0.7, 0.8);
    g.fillStyle = C.cart; g.beginPath(); g.moveTo(-96, -70); g.lineTo(96, -70); g.lineTo(80, 4); g.lineTo(-80, 4); g.closePath(); g.fill();
    g.fillStyle = C.cartL; g.fillRect(-96, -70, 192, 8); g.fillStyle = C.cartD; g.fillRect(-80, -4, 160, 8);
    for (const wx of [-52, 52]) { g.fillStyle = C.ink; g.beginPath(); g.arc(wx, 16, 18, 0, TAU); g.fill(); g.fillStyle = C.railL; g.beginPath(); g.arc(wx, 16, 6, 0, TAU); g.fill(); }
  }, 7);
  const AI_SIGN = { x: 880, y: 690 };
  function aiSign(c, k) {   // the sign over the data centre: dark until "AI", then lit teal with a glow
    const lit = clamp(k, 0, 1);
    c.save(); c.translate(AI_SIGN.x, AI_SIGN.y);
    if (lit > 0) { c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(0, 0, 10, 0, 0, 340); g.addColorStop(0, `rgba(95,242,220,${0.5 * lit})`); g.addColorStop(1, 'rgba(95,242,220,0)'); c.fillStyle = g; c.fillRect(-340, -340, 680, 680); c.globalCompositeOperation = 'source-over'; }
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 14; c.shadowOffsetX = 7; c.shadowOffsetY = 10;
    c.fillStyle = C.dcD; c.beginPath(); c.roundRect(-150, -84, 300, 168, 14); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = lit > 0.5 ? C.teal : '#33414a'; c.font = `400 140px "Anton-400"`; c.textAlign = 'center'; c.fillText(ui('aiSign', 'AI'), 0, 50);
    c.restore();
  }
  function racks(c, lt, k) {   // the status lights on the racks: dim, then blinking teal once the sign is lit
    const r = U.rng(21);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 12; j++) {
      const on = (Math.sin(lt * (3 + r() * 6) + i * 1.7 + j) > 0.2) ? 1 : 0.25, x = 662 + i * 72 + (j % 2) * 26, y = 856 + j * 24;
      c.fillStyle = k > 0.5 && on > 0.5 ? C.led : C.ledD; c.fillRect(x, y, 12, 6);
    }
  }

  // ═════════ 2 · ssu_ai: the DRAM works on the left, the AI data centre on the right; carts of RAM sticks roll from one
  //            to the other along the rail; on "AI" the sign lights ═════════
  SCENES.ssu_ai = { draw(c, lt) {
    const id = 'ssu_ai', dd = dur(id), tC = at(id, 'carts', 0.1), tA = at(id, 'ai', 1.3);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.04, 1.0, ease.io(l / dd)), hits: [tA], kick: 0.03 });
    const kA = clamp((lt - tA + 0.05) / 0.2, 0, 1);
    stack(c, [{ sh: lineSheet(), d: 0.04, lift: 0.2 }, { d: 0.1, fn: (g, ox, oy) => {
      g.save(); g.translate(ox, oy); racks(g, lt, kA);
      // three carts, spaced along the rail, each leaving the works and going in at the data centre's door
      const sp = 150 + 120 * kA;   // they speed up once the sign is lit
      for (let i = 0; i < 4; i++) { const x = ((lt - tC) * sp + i * 330) % 1320 - 140; if (lt < tC && i > 1) continue; put(g, CART(), x + 200, GY - 18, { lift: 1.0 }); }
      g.restore(); } }], cam);
    aiSign(c, kA);
    flash(c, lt, tA, 0.14);
    tag(c, ui('aiTag', 'MEMORY LINES MOVED TO AI MEMORY (HBM)'), lt, dd, 110, 0.5);
    box(c);
  } };

  // ══ THE DESK: the complaint, the stamp, the motion, the hearing ═════════════════════════════════════════════════
  const deskSheet = () => sheet('ssu_desk', (g) => {
    g.fillStyle = C.desk; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(8); for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? C.deskL : C.deskD; g.fillRect(-90, r() * (H + 180) - 90, W + 180, 2 + r() * 8); }
    const gr = g.createRadialGradient(540, 980, 60, 540, 980, 900); gr.addColorStop(0, 'rgba(255,214,150,.22)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = gr; g.fillRect(-90, -90, W + 180, H + 180);
  }, 10);
  function paperLines(g, x0, y0, w, n, gap = 30, seed = 3) { const r = U.rng(seed); g.fillStyle = C.line; for (let i = 0; i < n; i++) g.fillRect(x0, y0 + i * gap, w * (i % 6 === 5 ? 0.55 : 0.82 + r() * 0.18), 8); }
  const COMPLAINT = () => sprite('ssu_complaint', 680, 860, 340, 430, (g) => {
    g.fillStyle = C.paper; g.fillRect(-320, -410, 640, 820); g.fillStyle = C.paperD; g.fillRect(-320, 400, 640, 10);
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '22px "ArchivoBlack-400"'; g.fillText('UNITED STATES DISTRICT COURT', 0, -350); g.fillText('NORTHERN DISTRICT OF CALIFORNIA', 0, -318);
    g.fillRect(-250, -296, 500, 3);
    g.font = '400 60px "Anton-400"'; g.fillText('CLASS ACTION', 0, -226); g.fillText('COMPLAINT', 0, -160);
    g.font = '20px "ArchivoBlack-400"'; g.fillText('Case No. 3:26-cv-06345', 0, -118);
    paperLines(g, -260, -70, 520, 14, 32, 5);
  }, 9);
  const MOTION = () => sprite('ssu_motion', 640, 800, 320, 400, (g) => {
    g.fillStyle = C.paper; g.fillRect(-300, -380, 600, 760); g.fillStyle = C.paperD; g.fillRect(-300, 370, 600, 10);
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '20px "ArchivoBlack-400"'; g.fillText('Case No. 3:26-cv-06345', 0, -326);
    g.fillRect(-240, -306, 480, 3);
    g.font = '400 64px "Anton-400"'; g.fillText('MOTION', 0, -226); g.fillText('TO DISMISS', 0, -156);
    paperLines(g, -240, -96, 480, 13, 32, 9);
  }, 9);
  const CAL = () => sprite('ssu_cal', 260, 300, 130, 150, (g) => {
    g.fillStyle = C.paper; g.fillRect(-110, -120, 220, 250); g.fillStyle = C.red; g.fillRect(-110, -120, 220, 70);
    for (const x of [-60, 60]) { g.fillStyle = C.ink; g.beginPath(); g.arc(x, -122, 9, 0, TAU); g.fill(); }
    g.fillStyle = '#fff'; g.textAlign = 'center'; fitFont(g, ui('calMonth', 'NOV'), 50, 190, `400 $px "Anton-400", ${JP}`); g.fillText(ui('calMonth', 'NOV'), 0, -66);
    g.fillStyle = C.ink; g.font = '400 128px "Anton-400"'; g.fillText('13', 0, 76);
    fitFont(g, ui('calNote', 'HEARING'), 26, 190, `$px "ArchivoBlack-400", ${JP}`); g.fillText(ui('calNote', 'HEARING'), 0, 116);
  }, 8);
  const DOC = { x: 520, y: 1010 };

  // ═════════ 3 · ssu_suit: the complaint's first page slides onto the desk; on "planned" ALLEGED is stamped on it ═════════
  SCENES.ssu_suit = { draw(c, lt) {
    const id = 'ssu_suit', dd = dur(id), tD = at(id, 'doc', 0.1), tS = at(id, 'stamp', 1.3);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.0, 1.04, ease.io(l / dd)), hits: [tS], kick: 0.035 });
    stack(c, [{ sh: deskSheet(), d: 0.05, lift: 0.2 }], cam);
    const kd = ease.out((lt - tD) / 0.4);
    put(c, COMPLAINT(), DOC.x + lerp(-720, 0, kd), DOC.y + lerp(60, 0, kd), { rot: lerp(-0.2, -0.03, kd), lift: 1.2 });
    stampMark(c, ui('alleged', 'ALLEGED'), DOC.x + 40, DOC.y + 170, { k: (lt - tS + 0.08) / 0.16, rot: -0.16, size: 120 });
    flash(c, lt, tS, 0.18);
    tag(c, ui('suitTag', 'CLASS ACTION · N.D. CALIFORNIA · FILED 25 JUNE 2026'), lt, dd, 110, 0.5);
    box(c);
  } };

  // ═════════ 4 · ssu_dismiss: the complaint stays (stamped); the makers' motion to dismiss slides over it; the hearing's
  //            date is pinned beside them; on "dismiss" the motion thumps down ═════════
  SCENES.ssu_dismiss = { draw(c, lt) {
    const id = 'ssu_dismiss', dd = dur(id), tM = at(id, 'motion', 0.15), tC = at(id, 'cal', 1.0), tT = at(id, 'thud', 1.2);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.04, 1.07, ease.io(l / dd)), hits: [tT], kick: 0.035 });
    stack(c, [{ sh: deskSheet(), d: 0.05, lift: 0.2 }], cam);
    put(c, COMPLAINT(), DOC.x, DOC.y, { rot: -0.03, lift: 1.2 });
    stampMark(c, ui('alleged', 'ALLEGED'), DOC.x + 40, DOC.y + 170, { k: 1, rot: -0.16, size: 120 });
    // the motion: in from the right, held a hair above the page, then down on "dismiss"
    const km = ease.out((lt - tM) / 0.45), kt = clamp((lt - tT + 0.06) / 0.12, 0, 1), hover = (1 - kt) * 0.05;
    put(c, MOTION(), DOC.x + 70 + lerp(760, 0, km), DOC.y + 70 + lerp(-40, 0, km), { rot: lerp(0.18, 0.05, km), sc: 1 + hover, lift: 1.2 + hover * 20 });
    const kc = ease.back((lt - tC) / 0.3);
    if (kc > 0) put(c, CAL(), 860, 640, { rot: 0.08, sc: kc, lift: 1.2 });
    flash(c, lt, tT, 0.16);
    tag(c, ui('dismissTag', 'MICRON DENIES THE CLAIMS · HEARING 13 NOV 2026'), lt, dd, 110, 0.5);
    box(c);
  } };

  // ══ THE RECEIPT ═════════════════════════════════════════════════════════════════════════════════════════════════
  const RECEIPT = () => sprite('ssu_receipt', 360, 640, 180, 600, (g) => {
    // the paper hangs from its top edge (the sprite's origin), so it can print up out of the slot
    g.fillStyle = C.receipt; g.beginPath(); g.moveTo(-150, -580);
    for (let i = 0; i <= 12; i++) g.lineTo(-150 + (300 * i) / 12, -580 + (i % 2) * 10);
    g.lineTo(150, 0); g.lineTo(-150, 0); g.closePath(); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '22px "ArchivoBlack-400"'; g.fillText('* * * RECEIPT * * *', 0, -520);
    g.fillStyle = C.receiptD; for (let i = 0; i < 6; i++) g.fillRect(-120, -480 + i * 26, 240, 3);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = '20px "ArchivoBlack-400"'; g.fillText('GRAPHICS CARD 16GB', -122, -318);
    g.fillRect(-122, -296, 244, 3);
    g.font = '24px "ArchivoBlack-400"'; g.fillText('TOTAL', -122, -246);
    g.textAlign = 'center'; g.font = '400 84px "Anton-400"'; g.fillText('$805.00', 0, -150);
    g.fillStyle = C.receiptD; for (let i = 0; i < 4; i++) g.fillRect(-120, -100 + i * 22, 240, 3);
  }, 8);

  // ═════════ 5 · ssu_end: back on the shelf, the clipping at AUGUST, $805; on "$805" a receipt prints up beside the box
  //            and the till rings; it holds; then the receipt slides away and the clipping turns back to JUNE, $570:
  //            frame 0 again ═════════
  SCENES.ssu_end = { draw(c, lt) {
    const id = 'ssu_end', dd = dur(id), tP = at(id, 'pay', 0.8), tB = at(id, 'back', dd - 0.8);
    const kR = ease.io((lt - (tB - 0.6)) / 0.6);
    const cam = vcam(lt, dd, { z: (l) => lerp(1.035, 1.0, kR), hits: [tP], kick: 0.03 }); cam.x *= 1 - kR; cam.y *= 1 - kR;
    // the box slides left to make room as the receipt prints out of the slot at the shelf's edge; both go home before the loop
    const kp = ease.out((lt - tP + 0.1) / 0.5), ko = ease.io((lt - (tB - 0.7)) / 0.45), up = kp * (1 - ko);
    store(c, lt, cam, { bx: -120 * up });
    if (up > 0.001) { c.save(); c.beginPath(); c.rect(0, 0, W, SHELF_Y + 46); c.clip(); put(c, RECEIPT(), 852, SHELF_Y + 46 + 560 * (1 - up), { rot: 0.04, sc: 0.86, lift: 1.1 }); c.restore();
      c.fillStyle = C.ink; c.fillRect(712, SHELF_Y + 38, 280, 10); }
    priceClip(c, FACE_B(), FACE_A(), SUB(), { flip: (lt - tB + 0.15) / 0.3 });
    flash(c, lt, tP, 0.16);
    box(c);
  } };
})();
