// THE KIT for "The Round Trip" (RFH global/Coxon): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline,
// a VIRAL cut from its first version (plan/films/33-the-round-trip.md). Anthropic's IPO filing (S-1, public 26 Oct 2026):
// two of its investors, Doodle (the house parody of Google) and Amazon, are also the suppliers it must buy computing
// from, at least $114.5B and $110B, owed even if the computing goes unused. Two cut-card data-centre towers and one
// card box; between each tower and the box a loop of dashed track: money goes down one side, and comes back up the
// other. Frame 0: money bags already falling from the towers into the box; the end: the same money going round.
// Fair on purpose: no wrongdoing is drawn or claimed; no real logo (Doodle's wordmark is the parody's, Amazon and
// Anthropic are plain type); every number is on a tag, as reported from the filing; nobody is drawn.
// The disclosure (MADE WITH ANTHROPIC'S TOOLS) is the tag on the hook. Its wording is the owner's to approve.
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs).
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, K } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 4 };
  const at = (id, name, d = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? d : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const ease = {
    out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
    in: (k) => Math.pow(clamp(k, 0, 1), 3),
    io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  };
  const swing = (lt, kicks) => kicks.reduce((a, [t, s]) => a + (lt > t ? s * Math.exp(-(lt - t) * 3.2) * Math.sin((lt - t) * 9) : 0), 0);
  const JP = '"NotoSansJP-800"';
  const C = {
    wall: '#18202b', wallL: '#1f2935', table: '#2a2219', tableL: '#33291f',
    tower: '#2b3440', towerL: '#36414f', towerD: '#20272f', roof: '#3d4856', plate: '#ece6d6',
    led: '#86e0cf', ledW: '#f2d27a', ledOff: '#1a2028',
    box: '#e7dac0', boxD: '#c6b796', boxL: '#f3ead6', slot: '#3a2f22',
    track: '#efe6cf', bag: '#d9b766', bagD: '#b8933f', bagL: '#ead08c', coin: '#f0c043', coinD: '#c7962a',
    chip: '#2f6b4a', chipL: '#3f8a60', pin: '#d8c48a', die: '#1e2a24',
    cream: '#efe6cf', ink: '#15120f', news: '#ece6d6', stamp: '#c8321f', tagC: '#f6efe0',
  };

  // ── type, as the other viral cuts
  function fitFont(c, text, size, maxW, face) { let s = size; c.font = face.replace('$', s); while (c.measureText(text).width > maxW && s > 20) { s -= 2; c.font = face.replace('$', s); } return s; }
  /** the where/what tag in the lower corner, as the other films have it */
  function tag(c, text, lt, dd, x = 110, t0 = 0.4, { bg = K.ochre, t1 = dd - 0.5 } = {}) {
    const y = R.SAFE_B - 66, a = clamp((lt - t0) / 0.3, 0, 1) * clamp((t1 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; fitFont(c, text, 30, 905 - x - 44, `$px "ArchivoBlack-400", ${JP}`); const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = bg; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }
  function bigClip(c, label, value, { k = 1, a = 1, dy = 0, red = false } = {}) {
    if (a <= 0) return;
    const x = 130, y = 1398 + dy, w = 760, h = 206, sc = 1 + 0.05 * (1 - ease.out(k));
    c.save(); c.globalAlpha = a; c.translate(x + w / 2, y + h / 2); c.rotate(-0.022); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 18; c.shadowOffsetX = 9; c.shadowOffsetY = 13;
    c.fillStyle = C.news; c.beginPath(); c.moveTo(0, 0);
    for (let i = 0; i <= 16; i++) c.lineTo((w * i) / 16, (i % 2) * 7);
    c.lineTo(w, h); for (let i = 16; i >= 0; i--) c.lineTo((w * i) / 16, h - (i % 2) * 7); c.closePath(); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = C.ink; c.textAlign = 'left';
    fitFont(c, label, 30, w - 52, `$px "ArchivoBlack-400", ${JP}`); c.fillText(label, 26, 46);
    c.fillStyle = red ? C.stamp : C.ink; fitFont(c, value, 138, w - 52, `400 $px "Anton-400", ${JP}`); c.fillText(value, 24, 184);
    c.restore();
  }
  function stampMark(c, text, x, y, { k = 1, sc = 1, rot = -0.2, size = 92 } = {}) {
    if (k <= 0) return; const kk = ease.out(clamp(k, 0, 1)), s = sc * lerp(1.9, 1, kk);
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha = clamp(k * 3, 0, 1) * 0.92;
    fitFont(c, text, size, 420, `400 $px "Anton-400", ${JP}`); const tw = c.measureText(text).width, fs = parseFloat(c.font), w = tw + 60, h = fs + 50;
    c.strokeStyle = C.stamp; c.lineWidth = 8; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 12); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.roundRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24, 6); c.stroke();
    c.fillStyle = C.stamp; c.textAlign = 'center'; c.fillText(text, 0, fs * 0.36);
    c.globalCompositeOperation = 'destination-out'; const r = U.rng(text.length * 7 + 3);
    for (let i = 0; i < 120; i++) { c.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 2 + r() * 4, 1 + r() * 3); }
    c.restore();
  }

  // ── the camera: a slow drift, a kick on each hit, and a zoom about a focus point (applied to the whole box)
  const vcam = (lt, dd, { hits = [], kick = 0.03, amp = 4 } = {}) => {
    let zz = 1; for (const h of hits) if (lt >= h) zz += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    const e = Math.sin(Math.PI * clamp(lt / dd, 0, 1));
    return { x: Math.sin(lt * 2.1) * amp * e, y: Math.cos(lt * 1.7 + 1.2) * amp * 0.8 * e, z: zz, fx: 540, fy: 1040 };
  };
  const camZ = (c, z, fx = 540, fy = 1040) => { c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy); };

  // ══ THE ROOM ══════════════════════════════════════════════════════════════════════════════════════════════
  const TW = [{ x: 140, w: 260, key: 'doodle' }, { x: 680, w: 260, key: 'amazon' }], TY0 = 640, TY1 = 1190;
  const BX = { x: 330, y: 1238, w: 420, h: 214 };
  const wallSheet = () => sheet('rtr_wall', (g) => {
    g.fillStyle = C.wall; g.fillRect(-90, -90, W + 180, H + 180);
    for (let x = -60; x < W + 60; x += 120) { g.fillStyle = C.wallL; g.fillRect(x, -90, 3, 1400); }
    // a soft pool of light where the three stand
    const gr = g.createRadialGradient(540, 1020, 60, 540, 1060, 760); gr.addColorStop(0, 'rgba(255,226,170,.16)'); gr.addColorStop(1, 'rgba(255,226,170,0)'); g.fillStyle = gr; g.fillRect(-90, 200, W + 180, 1500);
    g.fillStyle = C.table; g.fillRect(-90, 1440, W + 180, 700); g.fillStyle = C.tableL; g.fillRect(-90, 1440, W + 180, 14);
    const r = U.rng(5); for (let i = 0; i < 30; i++) { g.fillStyle = r() < 0.5 ? '#30271d' : '#251e16'; g.fillRect(-90, 1460 + r() * 600, W + 180, 2 + r() * 6); }
  }, 8);
  /** the two towers, as one sheet; `lit` false draws every window dark (unused) */
  function towersDraw(g, lit) {
    for (const t of TW) {
      const { x, w } = t, h = TY1 - TY0;
      g.fillStyle = C.towerD; g.fillRect(x + 12, TY0 + 12, w, h);
      g.fillStyle = C.tower; g.fillRect(x, TY0, w, h);
      g.fillStyle = C.towerL; g.fillRect(x, TY0, w, 10); g.fillRect(x, TY0, 8, h);
      // the roof: a cap and a plate with the name
      g.fillStyle = C.roof; g.fillRect(x - 14, TY0 - 26, w + 28, 30);
      for (let i = 0; i < 4; i++) { g.fillStyle = C.towerD; g.fillRect(x + 20 + i * 60, TY0 - 52, 40, 26); }
      g.fillStyle = C.plate; g.beginPath(); g.roundRect(x + 18, TY0 + 28, w - 36, 74, 8); g.fill();
      if (t.key === 'doodle') BDF.doodleLogo(g, x + w / 2, TY0 + 84, 50, { align: 'center' });
      else { g.fillStyle = C.ink; g.font = '400 56px "Anton-400"'; g.textAlign = 'center'; g.fillText(ui('amazon', 'AMAZON'), x + w / 2, TY0 + 86); }
      // the server floors: rows of racks with small lights
      const r = U.rng(t.x);
      for (let row = 0; row < 8; row++) for (let col = 0; col < 4; col++) {
        const rx = x + 22 + col * 57, ry = TY0 + 128 + row * 50;
        g.fillStyle = '#151b22'; g.fillRect(rx, ry, 46, 38);
        for (let j = 0; j < 3; j++) { const on = lit && r() < 0.82; g.fillStyle = on ? (r() < 0.2 ? C.ledW : C.led) : C.ledOff; g.fillRect(rx + 6, ry + 6 + j * 11, 34, 5); }
      }
      // the door at the foot
      g.fillStyle = '#12171d'; g.fillRect(x + w / 2 - 32, TY1 - 70, 64, 70);
    }
  }
  const towersLit = () => sheet('rtr_towers_lit', (g) => towersDraw(g, true), 14);
  const towersDark = () => sheet('rtr_towers_dark', (g) => towersDraw(g, false), 14);
  /** the box: Anthropic, plain type, a slot in its lid where the money goes in and comes out */
  const boxSheet = () => sheet('rtr_box', (g) => {
    const { x, y, w, h } = BX;
    g.fillStyle = C.boxD; g.fillRect(x + 12, y + 12, w, h);
    g.fillStyle = C.box; g.fillRect(x, y, w, h);
    g.fillStyle = C.boxL; g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + 30, y - 40); g.lineTo(x + w - 30, y - 40); g.lineTo(x + w + 10, y); g.closePath(); g.fill();
    g.fillStyle = C.slot; g.beginPath(); g.roundRect(x + 110, y - 28, w - 220, 16, 6); g.fill();
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x, y + h - 30, w, 30);
    g.fillStyle = C.ink; g.textAlign = 'center'; fitFont(g, ui('anthropic', 'ANTHROPIC'), 92, w - 60, `400 $px "Anton-400", ${JP}`); g.fillText(ui('anthropic', 'ANTHROPIC'), x + w / 2, y + 128);
  }, 14);

  // ── the two loops: each an ellipse whose long axis runs from inside a tower to the box's slot. θ 0 is the tower end,
  //    π the slot end; money goes DOWN on the outer side (θ 0 → π) and comes back UP on the inner side (θ π → 2π)
  const mkLoop = (tx, ty, bx, by, side) => {
    const cx = (tx + bx) / 2, cy = (ty + by) / 2, dx = tx - cx, dy = ty - cy, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, a = L + 10, b = 64;
    const vx = -uy * side, vy = ux * side;   // the outer side
    return { at: (th) => [cx + ux * a * Math.cos(th) + vx * b * Math.sin(th), cy + uy * a * Math.cos(th) + vy * b * Math.sin(th)], a, b };
  };
  const LOOPS = [mkLoop(272, 930, 494, 1218, 1), mkLoop(808, 930, 586, 1218, -1)];
  /** the dashed track with arrowheads; k its strength (0 hidden), ph its march */
  function track(c, k, ph = 0) {
    if (k <= 0) return;
    c.save(); c.globalAlpha = k; c.strokeStyle = C.track; c.lineWidth = 5; c.setLineDash([18, 14]); c.lineDashOffset = -ph * 32; c.lineCap = 'round';
    for (const Lp of LOOPS) { c.beginPath(); for (let i = 0; i <= 120; i++) { const [x, y] = Lp.at((i / 120) * TAU); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    c.setLineDash([]); c.fillStyle = C.track;
    for (const Lp of LOOPS) for (const th of [Math.PI * 0.5, Math.PI * 1.5]) {
      const [x0, y0] = Lp.at(th - 0.04), [x1, y1] = Lp.at(th + 0.04), an = Math.atan2(y1 - y0, x1 - x0);
      c.save(); c.translate(x1, y1); c.rotate(an); c.beginPath(); c.moveTo(16, 0); c.lineTo(-12, -13); c.lineTo(-12, 13); c.closePath(); c.fill(); c.restore();
    }
    c.restore();
  }

  // ── the things that travel: a money bag (down), a coin (up), a chip of computing (down)
  const BAG = () => sprite('rtr_bag', 110, 120, 55, 64, (g) => {
    g.fillStyle = C.bagD; g.beginPath(); g.ellipse(4, 18, 46, 42, 0, 0, TAU); g.fill();
    g.fillStyle = C.bag; g.beginPath(); g.ellipse(0, 14, 46, 42, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(-18, -22); g.lineTo(-26, -46); g.lineTo(0, -36); g.lineTo(26, -46); g.lineTo(18, -22); g.closePath(); g.fill();
    g.fillStyle = C.bagD; g.fillRect(-22, -26, 44, 8);
    g.fillStyle = C.bagL; g.beginPath(); g.ellipse(-16, 0, 12, 18, -0.4, 0, TAU); g.fill();
    g.fillStyle = C.ink; g.font = '400 50px "Anton-400"'; g.textAlign = 'center'; g.fillText('$', 2, 34);
  }, 6);
  const COIN = () => sprite('rtr_coin', 56, 56, 28, 28, (g) => {
    g.fillStyle = C.coinD; g.beginPath(); g.arc(2, 2, 24, 0, TAU); g.fill();
    g.fillStyle = C.coin; g.beginPath(); g.arc(0, 0, 24, 0, TAU); g.fill();
    g.strokeStyle = C.coinD; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.stroke();
    g.fillStyle = C.coinD; g.font = '400 26px "Anton-400"'; g.textAlign = 'center'; g.fillText('$', 0, 10);
  }, 5);
  const CHIP = () => sprite('rtr_chip', 70, 70, 35, 35, (g) => {
    g.fillStyle = C.pin; for (let i = 0; i < 4; i++) { g.fillRect(-26, -21 + i * 12, 52, 4); g.fillRect(-21 + i * 12, -26, 4, 52); }
    g.fillStyle = C.chip; g.fillRect(-21, -21, 42, 42); g.fillStyle = C.chipL; g.fillRect(-21, -21, 42, 5);
    g.fillStyle = C.die; g.fillRect(-11, -11, 22, 22); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-11, -11, 22, 4);
  }, 5);
  /** a stream of n things riding one half of a loop: dir 'down' (θ 0→π) or 'up' (θ π→2π); starting at t0, `rate`
   *  loops a second; the first leaves at t0, so the stream visibly starts at its source */
  function stream(c, Lp, lt, { t0 = 0, n = 3, rate = 0.5, dir = 'down', sp = BAG, sc = 1, a = 1, until = 1e9 } = {}) {
    for (let i = 0; i < n; i++) {
      const p = (lt - t0) * rate - i / n; if (p < 0) continue;
      const startT = t0 + (i / n) / rate + Math.floor(p) / rate; if (startT > until) continue;   // stop sending new ones after `until`
      const f = p % 1, th = (dir === 'down' ? 0 : Math.PI) + Math.PI * f, [x, y] = Lp.at(th);
      const fade = clamp(f / 0.08, 0, 1) * clamp((1 - f) / 0.1, 0, 1);
      c.save(); c.globalAlpha *= fade * a; put(c, sp(), x, y, { sc: sc * (0.75 + 0.25 * fade), rot: Math.sin(f * 7 + i) * 0.15, lift: 1.1 }); c.restore();
    }
  }

  /** the room at time lt: wall, track, towers (lit or dark), box; the `fn` layer draws what travels */
  function room(c, lt, cam, { lit = 1, trackK = 0.35, ph = lt, travel = () => {}, z = 1, over = () => {} } = {}) {
    c.save(); camZ(c, 1.12 * z * cam.z, 540, 1010);   // v1b: the set nearer, so the loops and the money read at phone size
    stack(c, [{ sh: wallSheet(), d: 0.02, lift: 0 }, { d: 0.05, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); track(g, trackK, ph); g.restore(); } },
      { d: 0.07, fn: (g, ox, oy) => {
        const L = towersLit(), D = towersDark();
        g.save(); g.globalAlpha = 0.55; g.drawImage(L.s, ox - L.m + 10, oy - L.m + 14); g.restore();
        if (lit > 0) { g.save(); g.globalAlpha = lit; g.drawImage(L.c, ox - L.m, oy - L.m); g.restore(); }
        if (lit < 1) { g.save(); g.globalAlpha = 1 - lit; g.drawImage(D.c, ox - D.m, oy - D.m); g.restore(); }
      } },
      { sh: boxSheet(), d: 0.09, lift: 1 },
      { d: 0.1, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); travel(g); g.restore(); } },
      { d: 0.1, fn: (g, ox, oy) => { g.save(); g.translate(ox, oy); over(g); g.restore(); } }], cam);
    c.restore();
  }
  /** a small cream plate on a tower's face: INVESTOR, SUPPLIER */
  function plate(c, text, ti, row, k) {
    if (k <= 0) return; const t = TW[ti], x = t.x + t.w / 2, y = TY0 + 150 + row * 64, e = ease.back(k);
    c.save(); c.translate(x, y); c.scale(e, e); c.rotate((ti ? 1 : -1) * 0.03);
    fitFont(c, text, 34, t.w - 30, `$px "ArchivoBlack-400", ${JP}`); const w = c.measureText(text).width + 36;
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 10; c.shadowOffsetX = 5; c.shadowOffsetY = 8; c.fillStyle = C.tagC; c.beginPath(); c.roundRect(-w / 2, -28, w, 56, 8); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = C.ink; c.textAlign = 'center'; c.fillText(text, 0, 12); c.restore();
  }
  /** a price tag on a string, swinging from the tower's roof: ≥ $114.5B */
  function priceTag(c, text, ti, k, lt, t0) {
    if (k <= 0) return; const t = TW[ti], px = t.x + t.w / 2 + (ti ? -46 : 46), py = TY0 + 108;   // hung toward the middle: the zoom pushes the towers to the box's edge
    const sw = swing(lt, [[t0 + 0.05, 0.22]]) + (1 - ease.out(k)) * (ti ? -0.9 : 0.9);
    c.save(); c.translate(px, py); c.rotate(sw);
    c.strokeStyle = C.cream; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 236); c.stroke();
    c.translate(0, 236 + 56);
    fitFont(c, text, 76, 280, `400 $px "Anton-400", ${JP}`); const fs = parseFloat(c.font), w = c.measureText(text).width + 96, h = fs + 44;
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 16; c.shadowOffsetX = 8; c.shadowOffsetY = 12;
    c.fillStyle = C.tagC; c.beginPath(); c.moveTo(-w / 2 + 30, -h / 2); c.lineTo(w / 2, -h / 2); c.lineTo(w / 2, h / 2); c.lineTo(-w / 2 + 30, h / 2); c.lineTo(-w / 2, 0); c.closePath(); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = C.wall; c.beginPath(); c.arc(-w / 2 + 26, 0, 8, 0, TAU); c.fill();
    c.fillStyle = C.ink; c.textAlign = 'center'; c.fillText(text, 22, fs * 0.36); c.restore();
  }
  /** the S-1: a cream sheet with a header and lines of type, slid up out of the box */
  const S1 = () => sprite('rtr_s1', 340, 420, 170, 210, (g) => {
    g.fillStyle = '#f6f1e6'; g.fillRect(-170, -210, 340, 420);
    g.fillStyle = '#e4ddcd'; g.fillRect(-170, -210, 340, 64);
    g.fillStyle = C.ink; g.textAlign = 'left'; fitFont(g, ui('filing', 'S-1 · IPO FILING'), 30, 300, `$px "ArchivoBlack-400", ${JP}`); g.fillText(ui('filing', 'S-1 · IPO FILING'), -150, -166);
    g.fillStyle = 'rgba(21,18,15,.22)'; for (let i = 0; i < 11; i++) g.fillRect(-150, -120 + i * 28, 300 - ((i * 37) % 120), 8);
    g.fillStyle = 'rgba(200,50,31,.5)'; g.fillRect(-150, 40, 240, 10); g.fillRect(-150, 68, 180, 10);
  }, 8);
  const flash = (c, lt, t, k = 0.2) => { if (lt > t) { const f = Math.exp(-(lt - t) * 7) * k; c.fillStyle = `rgba(255,236,190,${f})`; c.fillRect(0, 0, W, H); } };

  // ═════════ 1 · rtr_hook: frame 0 — two money bags already falling, one from each tower, into the box; on
  //            "invested" they land and the box jumps; INVESTOR plates come up; the disclosure tag ═════════
  SCENES.rtr_hook = { draw(c, lt) {
    const id = 'rtr_hook', dd = dur(id), tD = at(id, 'drop', 1.4);
    const cam = vcam(lt, dd, { hits: [tD], kick: 0.03 });
    room(c, lt, cam, { z: lerp(1.06, 1.02, ease.io(lt / dd)), trackK: 0.3, travel: (g) => {
      const f = lt < tD ? lerp(0.32, 1, ease.in(lt / tD) * 0.35 + (lt / tD) * 0.65) : 1;
      if (f < 1) LOOPS.forEach((Lp) => { const [x, y] = Lp.at(Math.PI * f); put(g, BAG(), x, y, { sc: 1.45, rot: Math.sin(f * 6) * 0.12, lift: 1.3 }); });
      LOOPS.forEach((Lp) => stream(g, Lp, lt, { t0: tD + 0.35, n: 2, rate: 0.55, dir: 'down', sp: BAG, sc: 1.25 }));
    }, over: (g) => { TW.forEach((t, i) => plate(g, ui('investor', 'INVESTOR'), i, 0, (lt - tD - 0.1 - i * 0.12) / 0.3)); } });
    flash(c, lt, tD, 0.18);
    tag(c, ui('discl', "MADE WITH ANTHROPIC'S TOOLS"), lt, dd, 110, 0.1, { bg: C.cream });
    box(c);
  } };

  // ═════════ 2 · rtr_owe: the S-1 slides up out of the box; on "computing" chips stream down from both towers into
  //            the box, and coins start back up the other side; SUPPLIER plates join INVESTOR ═════════
  SCENES.rtr_owe = { draw(c, lt) {
    const id = 'rtr_owe', dd = dur(id), tF = at(id, 'file', 0.2), tC = at(id, 'chips', 2.0);
    const cam = vcam(lt, dd, { hits: [tC], kick: 0.03 });
    room(c, lt, cam, { z: 1.0, trackK: lerp(0.3, 0.6, clamp((lt - tC) / 0.4, 0, 1)), travel: (g) => {
      LOOPS.forEach((Lp) => { stream(g, Lp, lt, { t0: tC - 0.1, n: 4, rate: 0.6, dir: 'down', sp: CHIP, sc: 1.6 }); stream(g, Lp, lt, { t0: tC + 0.25, n: 4, rate: 0.6, dir: 'up', sp: COIN, sc: 1.35 }); });
    }, over: (g) => {
      TW.forEach((t, i) => { plate(g, ui('investor', 'INVESTOR'), i, 0, 1); plate(g, ui('supplier', 'SUPPLIER'), i, 1, (lt - tC - 0.15 - i * 0.12) / 0.3); });
      const ks = ease.out((lt - tF) / 0.45); if (ks > 0) put(g, S1(), 540, lerp(1240, 820, ks), { rot: lerp(0.1, -0.03, ks), sc: lerp(0.5, 0.86, ks), lift: 1.8 });
    } });
    flash(c, lt, tC, 0.14);
    tag(c, ui('fileTag', 'ANTHROPIC S-1 · PUBLIC 26.10.2026'), lt, dd, 110, 0.4);
    box(c);
  } };

  // ═════════ 3 · rtr_sum: the price tags swing down from the roofs: ≥ $114.5B on Doodle's tower on the pop word,
  //            ≥ $110B on Amazon's on line 3; coins keep climbing ═════════
  SCENES.rtr_sum = { draw(c, lt) {
    const id = 'rtr_sum', dd = dur(id), t1 = at(id, 'iou1', 0.8), t2 = at(id, 'iou2', 2.2);
    const cam = vcam(lt, dd, { hits: [t1, t2], kick: 0.03 });
    room(c, lt, cam, { z: lerp(1.0, 1.05, ease.io(lt / dd)), trackK: 0.6, travel: (g) => {
      LOOPS.forEach((Lp) => stream(g, Lp, lt + 3, { t0: 0, n: 4, rate: 0.6, dir: 'up', sp: COIN, sc: 1.35 }));
    }, over: (g) => {
      TW.forEach((t, i) => { plate(g, ui('investor', 'INVESTOR'), i, 0, 1); plate(g, ui('supplier', 'SUPPLIER'), i, 1, 1); });
      priceTag(g, ui('iou1', '≥ $114.5B'), 0, (lt - t1 + 0.1) / 0.35, lt, t1);
      priceTag(g, ui('iou2', '≥ $110B'), 1, (lt - t2 + 0.1) / 0.35, lt, t2);
    } });
    flash(c, lt, t1, 0.16); flash(c, lt, t2, 0.12);
    tag(c, ui('sumTag', 'MINIMUM COMMITMENTS · AS REPORTED'), lt, dd, 110, 0.4);
    box(c);
  } };

  // ═════════ 4 · rtr_idle: the towers' lights go out (the computing unused), but the coins keep climbing; on
  //            "unused" an UNUSED stamp lands on each tower ═════════
  SCENES.rtr_idle = { draw(c, lt) {
    const id = 'rtr_idle', dd = dur(id), tK = at(id, 'dark', 0.3), tS = at(id, 'stamp', 1.8);
    const cam = vcam(lt, dd, { hits: [tS], kick: 0.035 });
    const lit = 1 - clamp((lt - tK) / 0.35, 0, 1);
    room(c, lt, cam, { lit, z: 1.03, trackK: 0.6, travel: (g) => {
      LOOPS.forEach((Lp) => stream(g, Lp, lt + 7, { t0: 0, n: 4, rate: 0.6, dir: 'up', sp: COIN, sc: 1.35 }));
    }, over: (g) => {
      TW.forEach((t, i) => { plate(g, ui('investor', 'INVESTOR'), i, 0, 1); plate(g, ui('supplier', 'SUPPLIER'), i, 1, 1); });
      TW.forEach((t, i) => stampMark(g, ui('unused', 'UNUSED'), t.x + t.w / 2, TY0 + 360, { k: (lt - tS + 0.08 - i * 0.12) / 0.16, rot: i ? 0.14 : -0.14, size: 78 }));
    } });
    if (lt > tK && lt < tK + 0.4) { const f = (1 - (lt - tK) / 0.4) * 0.12; c.fillStyle = `rgba(0,0,0,${f})`; c.fillRect(0, 0, W, H); }
    flash(c, lt, tS, 0.16);
    box(c);
  } };

  // ═════════ 5 · rtr_end: the lights come back; the whole round trip runs: bags down one side of each loop, coins
  //            up the other, the track bold and marching; on "back" a coin lands in Doodle's tower; the clipping
  //            rises on "clip": ROUND TRIP ═════════
  SCENES.rtr_end = { draw(c, lt) {
    const id = 'rtr_end', dd = dur(id), tB = at(id, 'back', 1.0), tC = at(id, 'clip', dd - 1.2);
    const cam = vcam(lt, dd, { hits: [tB], kick: 0.04 });
    const lit = clamp(lt / 0.5, 0, 1);
    room(c, lt, cam, { lit, z: lerp(1.03, 0.98, ease.io(lt / dd)), trackK: lerp(0.6, 1, clamp(lt / 0.6, 0, 1)), ph: lt * 1.6, travel: (g) => {
      LOOPS.forEach((Lp, i) => { stream(g, Lp, lt + i * 0.4, { t0: 0, n: 3, rate: 0.5, dir: 'down', sp: BAG, sc: 1.2 }); stream(g, Lp, lt + 0.9 + i * 0.4, { t0: 0, n: 4, rate: 0.5, dir: 'up', sp: COIN, sc: 1.35 }); });
    }, over: (g) => {
      TW.forEach((t, i) => { plate(g, ui('investor', 'INVESTOR'), i, 0, 1); plate(g, ui('supplier', 'SUPPLIER'), i, 1, 1); });
      if (lt > tB) { const k = (lt - tB) / 0.5; if (k < 1) { const [x, y] = LOOPS[0].at(TAU - 0.15); g.save(); g.globalAlpha = 1 - k; g.strokeStyle = C.coin; g.lineWidth = 6; g.beginPath(); g.arc(x, y, 30 + 90 * k, 0, TAU); g.stroke(); g.restore(); } }
    } });
    flash(c, lt, tB, 0.16);
    const kC = clamp((lt - tC + 0.32) / 0.32, 0, 1);
    bigClip(c, ui('clipLabel2', 'ANTHROPIC IPO FILING · 26.10.2026'), ui('clipValue2', 'ROUND TRIP'), { a: clamp(kC * 2.5, 0, 1), dy: 320 * (1 - ease.out(kC)), red: true });
    box(c);
  } };
})();
