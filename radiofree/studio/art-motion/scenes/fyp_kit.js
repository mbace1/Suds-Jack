// THE KIT for "For Your Protection" (RFH global, data-centre secrecy deals): the papercut box in CLEAN LIGHT
// (rfp_clean.js), made by the pipeline, a VIRAL cut from its first version (plan/films/28-for-your-protection.md).
// A small town at dusk, a sealed envelope stamped NDA on the town hall steps; a vast blank data centre rises behind the
// houses; Virginia's map, where records requests found secrecy deals in 25 of 31 places; the developers' stated
// reason on a flip card; Delaware banned them in August (SB 312): the envelope tears, VOID. The last frame is frame 0's
// framing with the envelope torn: signed, then void, then signed again.
// Fair on purpose: no company is named (the deals are many developers'); the figure at the lectern is a faceless cut
// card; Virginia's outline is drawn from rough coordinates, illustrative, not a survey; the pins are illustrative too,
// only their count (25 of 31) is the record.
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
    io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  };
  const JP = '"NotoSansJP-800"';
  const C = {
    sky: ['#121a26', '#1a2433', '#26303e', '#3a3a48', '#5a4450', '#7a5254', '#a2654e', '#c98a52'],
    hill: '#1d2a2a', hillL: '#25363a', house: ['#4a3a32', '#5a4436', '#3e3a3a', '#54402f'], roof: ['#2a1d18', '#33231c', '#25201e'],
    win: '#f1c46a', winD: '#6a5a44', hall: '#cfc4ac', hallD: '#a99d86', hallS: '#8b8070', step: '#9e9380', street: '#2a2826', curb: '#4a4640',
    lamp: '#ffd98a', dc: '#c4c8cc', dcD: '#9aa0a6', dcL: '#e0e3e6', fence: '#3a3f44',
    manila: '#d9b766', manilaD: '#b8933f', manilaL: '#ead08c', wax: '#a8231c', waxL: '#d0473a',
    table: '#1f2a33', tableL: '#26343f', state: '#d8cdb3', stateD: '#b9ad92', water: '#2c4a5e', pin: '#e3a33a',
    cream: '#efe6cf', ink: '#15120f', news: '#ece6d6', stamp: '#c8321f', suit: '#23262c', suitL: '#33373f', shirt: '#d9d3c4',
    wall: '#2b2a30', wallL: '#36353c', wood: '#5a3a24', woodL: '#74503a', board: '#e8e0cc',
  };

  // ── type
  function fitFont(c, text, size, maxW, face) { let s = size; c.font = face.replace('$', s); while (c.measureText(text).width > maxW && s > 20) { s -= 2; c.font = face.replace('$', s); } return s; }
  function screenTag(c, text, x, y, { a = 1, size = 34, bg = C.news, fg = C.ink } = {}) {
    if (a <= 0) return;
    c.save(); c.globalAlpha = a; fitFont(c, text, size, 860, `$px "ArchivoBlack-400", ${JP}`); const s = parseFloat(c.font), w = c.measureText(text).width + 44, h = s + 32;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = bg; c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 8); c.fill();
    c.shadowColor = 'transparent'; c.fillStyle = fg; c.textAlign = 'center'; c.fillText(text, x, y + s * 0.36); c.restore();
  }
  /** the where/what tag in the lower corner, as the other films have it */
  function tag(c, text, lt, dd, x = 110, t0 = 0.4) {
    const y = R.SAFE_B - 66, a = clamp((lt - t0) / 0.3, 0, 1) * clamp((dd - 0.5 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; fitFont(c, text, 30, 905 - x - 44, `$px "ArchivoBlack-400", ${JP}`); const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }
  /** the big clipping on frame 0 and on the last frame, in the same place */
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
    fitFont(c, text, size, 760, `400 $px "Anton-400", ${JP}`); const tw = c.measureText(text).width, fs = parseFloat(c.font), w = tw + 70, h = fs + 56;
    c.strokeStyle = C.stamp; c.lineWidth = 9; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 12); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.roundRect(-w / 2 + 14, -h / 2 + 14, w - 28, h - 28, 6); c.stroke();
    c.fillStyle = C.stamp; c.textAlign = 'center'; c.fillText(text, 0, fs * 0.36);
    c.globalCompositeOperation = 'destination-out'; const r = U.rng(text.length * 7 + 3);
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.5})`; c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 2 + r() * 4, 1 + r() * 3); }
    c.restore();
  }

  // ── the camera
  const vcam = (lt, dd, { hits = [], kick = 0.03, amp = 4, z = 1 } = {}) => {
    let zz = z; for (const h of hits) if (lt >= h) zz += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    const e = Math.sin(Math.PI * clamp(lt / dd, 0, 1));
    return { x: Math.sin(lt * 2.1) * amp * e, y: Math.cos(lt * 1.7 + 1.2) * amp * 0.8 * e, z: zz, fx: 540, fy: 1040 };
  };

  // ══ THE TOWN ═══════════════════════════════════════════════════════════════════════════════════════════════
  const HZ = 1140;                                                   // the street line
  const skySheet = () => sheet('fyp_sky', (g) => {
    const n = C.sky.length, step = 1000 / n;
    C.sky.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-90, i ? i * step + 120 : -90); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, 120 + i * step + Math.sin(x * 0.006 + i) * 12); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.fill(); });
    // a few stars in the top bands
    const r = U.rng(4); g.fillStyle = 'rgba(255,240,210,.55)'; for (let i = 0; i < 26; i++) { const x = r() * W, y = 150 + r() * 260; g.beginPath(); g.arc(x, y, 1 + r() * 1.6, 0, TAU); g.fill(); }
  }, 8);
  const hillSheet = () => sheet('fyp_hill', (g) => {
    g.fillStyle = C.hill; g.beginPath(); g.moveTo(-90, 1010); for (let x = -90; x <= W + 90; x += 30) g.lineTo(x, 960 + Math.sin(x * 0.004 + 1) * 34 + Math.sin(x * 0.013) * 10); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.fill();
    // pines on the ridge
    const r = U.rng(9); for (let i = 0; i < 40; i++) { const x = -60 + i * 30 + r() * 14, y0 = 962 + Math.sin(x * 0.004 + 1) * 34 + Math.sin(x * 0.013) * 10, h = 24 + r() * 26; g.fillStyle = r() < 0.5 ? C.hill : C.hillL; g.beginPath(); g.moveTo(x, y0 - h); g.lineTo(x + 9, y0 + 4); g.lineTo(x - 9, y0 + 4); g.fill(); }
  }, 10);
  /** the data centre: a vast windowless box, roof units, a fence; drawn in its own sheet so it can rise */
  const dcSheet = () => sheet('fyp_dc', (g) => {
    const x0 = 40, x1 = 1040, y0 = 640, y1 = 1100;
    g.fillStyle = C.dcD; g.fillRect(x0 + 12, y0 + 12, x1 - x0, y1 - y0);
    g.fillStyle = C.dc; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    // panel seams and a light top edge
    g.fillStyle = 'rgba(0,0,0,.08)'; for (let x = x0 + 50; x < x1; x += 50) g.fillRect(x, y0, 2, y1 - y0);
    // cladding: three horizontal bands of slightly different card, each with a shadow lip
    for (let i = 0; i < 3; i++) { const by = y0 + 30 + i * 140; g.fillStyle = i % 2 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)'; g.fillRect(x0, by, x1 - x0, 140); g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(x0, by + 136, x1 - x0, 4); }
    // louvre vents: rows of dark slats in grey frames, high on the wall
    for (let i = 0; i < 7; i++) { const vx = x0 + 70 + i * 135, vy = y0 + 60; g.fillStyle = C.dcD; g.fillRect(vx - 4, vy - 4, 96, 70); g.fillStyle = '#5c6268'; g.fillRect(vx, vy, 88, 62); g.fillStyle = '#3c4146'; for (let j = 0; j < 6; j++) g.fillRect(vx + 4, vy + 4 + j * 10, 80, 5); }
    // a pipe run along the wall, with brackets
    g.fillStyle = '#8c9298'; g.fillRect(x0, y0 + 190, x1 - x0, 14); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x0, y0 + 204, x1 - x0, 4);
    g.fillStyle = '#6a7076'; for (let x = x0 + 40; x < x1; x += 110) g.fillRect(x, y0 + 186, 8, 24);
    // service doors and a loading bay, low down (mostly behind the town, but they give the wall a scale)
    for (const dx of [x0 + 120, x1 - 180]) { g.fillStyle = C.dcD; g.fillRect(dx, y1 - 170, 60, 150); g.fillStyle = '#e8402f'; g.fillRect(dx + 22, y1 - 186, 16, 8); }
    g.fillStyle = '#7e848a'; g.fillRect(x0 + 380, y1 - 200, 220, 180); g.fillStyle = 'rgba(0,0,0,.12)'; for (let j = 0; j < 9; j++) g.fillRect(x0 + 380, y1 - 196 + j * 20, 220, 3);
    g.fillStyle = C.dcL; g.fillRect(x0, y0, x1 - x0, 10);
    // the roof units: rows of fans
    for (let i = 0; i < 10; i++) { const fx = x0 + 60 + i * 94; g.fillStyle = C.dcD; g.fillRect(fx - 34, y0 - 46, 68, 46); g.fillStyle = '#7e848a'; g.beginPath(); g.arc(fx - 14, y0 - 24, 13, 0, TAU); g.arc(fx + 16, y0 - 24, 13, 0, TAU); g.fill(); g.fillStyle = '#3a3f44'; g.beginPath(); g.arc(fx - 14, y0 - 24, 4, 0, TAU); g.arc(fx + 16, y0 - 24, 4, 0, TAU); g.fill(); }
    // a few red aviation lights
    g.fillStyle = '#e8402f'; for (const fx of [x0 + 10, x1 - 10]) { g.beginPath(); g.arc(fx, y0 - 6, 6, 0, TAU); g.fill(); }
  }, 16);
  const HOUSES = (() => { const r = U.rng(31), out = []; let x = -40; while (x < W + 40) { const w = 120 + r() * 70, h = 120 + r() * 70; if (x + w / 2 > 370 && x - w / 2 < 710) { x = 720 + w / 2; continue; } out.push({ x, w, h, c: (r() * 4) | 0, rc: (r() * 3) | 0, wins: r() }); x += w + 6 + r() * 10; } return out; })();
  const houseSheet = () => sheet('fyp_houses', (g) => {
    for (const hs of HOUSES) {
      const x = hs.x - hs.w / 2, y = HZ - hs.h;
      g.fillStyle = C.house[hs.c]; g.fillRect(x, y, hs.w, hs.h);
      g.fillStyle = C.roof[hs.rc]; g.beginPath(); g.moveTo(x - 10, y + 2); g.lineTo(hs.x, y - hs.w * 0.42); g.lineTo(x + hs.w + 10, y + 2); g.fill();
      // windows: two lit, one not
      const r = U.rng(Math.round(hs.x)); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const lit = r() < 0.6; g.fillStyle = lit ? C.win : C.winD; g.fillRect(x + 18 + i * (hs.w - 62), y + 24 + j * 50, 26, 32); }
      g.fillStyle = '#2a1f1a'; g.fillRect(hs.x - 14, HZ - 52, 28, 52);
    }
  }, 12);
  /** the town hall: pediment, four columns, a clock, steps, a flagpole */
  const hallSheet = () => sheet('fyp_hall', (g) => {
    const cx = 540, top = 820, w = 340;
    g.fillStyle = C.hallD; g.fillRect(cx - w / 2 + 10, top + 10, w, HZ - top);
    g.fillStyle = C.hall; g.fillRect(cx - w / 2, top, w, HZ - top);
    g.fillStyle = C.hall; g.beginPath(); g.moveTo(cx - w / 2 - 24, top + 4); g.lineTo(cx, top - 96); g.lineTo(cx + w / 2 + 24, top + 4); g.fill();
    g.fillStyle = C.hallS; g.beginPath(); g.moveTo(cx - w / 2 + 6, top - 4); g.lineTo(cx, top - 80); g.lineTo(cx + w / 2 - 6, top - 4); g.closePath(); g.fill();
    g.fillStyle = C.cream; g.beginPath(); g.arc(cx, top - 34, 24, 0, TAU); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, top - 34); g.lineTo(cx, top - 50); g.moveTo(cx, top - 34); g.lineTo(cx + 12, top - 30); g.stroke();
    for (let i = 0; i < 4; i++) { const px = cx - 120 + i * 80; g.fillStyle = C.hallS; g.fillRect(px - 15, top + 30, 34, HZ - top - 70); g.fillStyle = C.cream; g.fillRect(px - 17, top + 30, 30, HZ - top - 70); }
    g.fillStyle = '#2c2420'; g.fillRect(cx - 34, HZ - 150, 68, 110); g.fillStyle = C.win; g.fillRect(cx - 28, HZ - 144, 56, 10);
    for (let i = 0; i < 3; i++) { g.fillStyle = i % 2 ? C.step : C.hallD; g.fillRect(cx - w / 2 - 20 - i * 14, HZ - 40 + i * 14, w + 40 + i * 28, 16); }
    g.strokeStyle = '#3a3a3a'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx + w / 2 + 40, HZ); g.lineTo(cx + w / 2 + 40, top - 140); g.stroke();
    g.font = '400 30px "Anton-400"'; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText('TOWN HALL', cx, top + 22);
  }, 14);
  /** the Stars and Stripes, live (owner, v3: "make the flag wave"): 13 stripes, red top and bottom, a blue canton over
   *  the top seven with a simplified star field. Every vertical slice rides a sine travelling from the hoist to the fly,
   *  its amplitude growing toward the fly; crests lighten and troughs darken (paper folds). Everything is a function of
   *  the phase `ph` alone, so a shot that starts at ph 0 and one that ends at ph 0 meet without a jump (the loop) */
  const FLAG = { x: 540 + 170 + 43, y: 820 - 140, w: 132, h: 78 };
  function flag(g, ox, oy, ph) {
    const { w: fw, h: fh } = FLAG, fx = FLAG.x + ox, fy = FLAG.y + oy, sh = fh / 13, cw = fw * 0.42, ch = sh * 7, SL = 3;
    const gust = 0.82 + 0.18 * Math.sin(ph * 0.31);
    const off = (x) => { const u = x / fw; return (1.2 + 7.5 * u * u) * gust * Math.sin(u * Math.PI * 2.2 - ph); };
    const slope = (x) => { const u = x / fw; return Math.cos(u * Math.PI * 2.2 - ph) * Math.min(1, u * 3 + 0.15); };
    const sq = (x) => 1 - 0.04 * (x / fw) * (1 - slope(x)) * gust;   // the fly draws in a touch on each fold
    g.save();
    // shadow on the wall behind, following the cloth
    g.fillStyle = 'rgba(0,0,0,.28)';
    for (let x = 0; x < fw; x += SL) g.fillRect(fx + 6 + x * sq(x), fy + 8 + off(x), SL + 0.8, fh);
    for (let x = 0; x < fw; x += SL) {
      const X = fx + x * sq(x), Y = fy + off(x), inC = x < cw;
      for (let i = 0; i < 13; i++) {
        if (inC && i < 7) continue;
        g.fillStyle = i % 2 ? '#f1ece0' : '#b8312f'; g.fillRect(X, Y + i * sh, SL + 0.8, sh + 0.6);
      }
      if (inC) { g.fillStyle = '#2c3f73'; g.fillRect(X, Y, SL + 0.8, ch + 0.4); }
      // the fold: crests catch the light, troughs fall into shade
      const s0 = slope(x);
      g.fillStyle = s0 > 0 ? `rgba(255,248,230,${0.16 * s0})` : `rgba(10,8,20,${-0.22 * s0})`; g.fillRect(X, Y, SL + 0.8, fh);
    }
    g.fillStyle = '#f1ece0';
    for (let r = 0; r < 9; r++) { const n = r % 2 ? 5 : 6, o = r % 2 ? cw / 12 : 0; for (let j = 0; j < n; j++) { const sx = 4 + o + j * (cw - 8) / 6 + (cw - 8) / 12, sy = 3 + r * (ch - 6) / 9 + (ch - 6) / 18; g.beginPath(); g.arc(fx + sx * sq(sx), fy + sy + off(sx), 1.7, 0, TAU); g.fill(); } }
    // the hoist edge on the pole, and a paper edge along the top and bottom
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1.5; g.beginPath();
    for (let x = 0; x <= fw; x += SL) { const X = fx + x * sq(x), Y = fy + off(x); x ? g.lineTo(X, Y) : g.moveTo(X, Y); }
    g.stroke(); g.beginPath();
    for (let x = 0; x <= fw; x += SL) { const X = fx + x * sq(x), Y = fy + fh + off(x); x ? g.lineTo(X, Y) : g.moveTo(X, Y); }
    g.stroke();
    g.restore();
  }
  const FLAG_W = Math.PI * 2 * 1.05;   // rad/s: about one wave a second
  const streetSheet = () => sheet('fyp_street', (g) => {
    g.fillStyle = C.curb; g.fillRect(-90, HZ + 30, W + 180, 22);
    g.fillStyle = C.street; g.fillRect(-90, HZ + 52, W + 180, H);
    g.fillStyle = 'rgba(255,220,150,.08)'; for (let x = -60; x < W + 60; x += 130) g.fillRect(x, HZ + 160, 70, 8);
    // lamps
    for (const lx of [150, 930]) { g.fillStyle = '#2e2b28'; g.fillRect(lx - 5, HZ - 230, 10, 280); g.fillRect(lx - 30, HZ - 236, 60, 10); g.fillStyle = C.lamp; g.beginPath(); g.arc(lx, HZ - 214, 14, 0, TAU); g.fill(); }
  }, 10);
  /** lamplight pools, live */
  function lampGlow(c, k = 1) {
    for (const lx of [150, 930]) { const gr = c.createRadialGradient(lx, HZ - 214, 4, lx, HZ - 160, 260); gr.addColorStop(0, `rgba(255,214,140,${0.32 * k})`); gr.addColorStop(1, 'rgba(255,214,140,0)'); c.fillStyle = gr; c.fillRect(lx - 280, HZ - 480, 560, 640); }
  }

  // ── the envelope: sealed (a red wax seal, NDA on the flap), and torn in two
  const ENV_W = 330, ENV_H = 210;
  function envBody(g, w, h) {
    g.fillStyle = C.manilaD; g.fillRect(-w / 2 + 6, -h / 2 + 8, w, h);
    g.fillStyle = C.manila; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = C.manilaL; g.beginPath(); g.moveTo(-w / 2, -h / 2); g.lineTo(0, 20); g.lineTo(w / 2, -h / 2); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-w / 2, h / 2); g.lineTo(-30, 0); g.moveTo(w / 2, h / 2); g.lineTo(30, 0); g.stroke();
  }
  const ENV = () => sprite('fyp_env', ENV_W + 40, ENV_H + 40, (ENV_W + 40) / 2, (ENV_H + 40) / 2, (g) => {
    envBody(g, ENV_W, ENV_H);
    g.fillStyle = C.wax; g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = 40 + (i % 2) * 4; g.lineTo(Math.cos(a) * rr, 18 + Math.sin(a) * rr); } g.fill();
    g.fillStyle = C.waxL; g.beginPath(); g.arc(-8, 10, 14, 0, TAU); g.fill();
    g.fillStyle = '#f3e3c2'; g.font = '400 38px "Anton-400"'; g.textAlign = 'center'; g.fillText('NDA', 0, 32);
  }, 8);
  /** one half of the torn envelope (side -1 left, +1 right), the tear a zigzag down the middle */
  const ENV_HALF = (side) => sprite('fyp_env_' + side, ENV_W / 2 + 40, ENV_H + 40, (ENV_W / 2 + 40) / 2 - side * ENV_W / 4, (ENV_H + 40) / 2, (g) => {
    g.save(); g.beginPath();
    const zig = []; for (let i = 0; i <= 10; i++) zig.push([(i % 2 ? 9 : -9) + (i === 0 || i === 10 ? 0 : 0), -ENV_H / 2 - 4 + (i * (ENV_H + 8)) / 10]);
    if (side < 0) { g.moveTo(-ENV_W / 2 - 10, -ENV_H / 2 - 10); zig.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(-ENV_W / 2 - 10, ENV_H / 2 + 10); }
    else { g.moveTo(ENV_W / 2 + 10, -ENV_H / 2 - 10); zig.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(ENV_W / 2 + 10, ENV_H / 2 + 10); }
    g.closePath(); g.clip();
    envBody(g, ENV_W, ENV_H);
    g.fillStyle = C.wax; g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, rr = 40 + (i % 2) * 4; g.lineTo(Math.cos(a) * rr, 18 + Math.sin(a) * rr); } g.fill();
    g.fillStyle = '#f3e3c2'; g.font = '400 38px "Anton-400"'; g.textAlign = 'center'; g.fillText('NDA', 0, 32);
    g.restore();
  }, 8);

  /** the town, with the data centre at rise k (0 hidden below the house line, 1 up) */
  function town(c, lt, cam, { dcK = 0, glow = 1, ph = lt * FLAG_W } = {}) {
    const dy = (1 - ease.out(dcK)) * 520;
    c.save(); c.translate(540, 1040); c.scale(TZ, TZ); c.translate(-540, -1040);
    stack(c, [{ sh: skySheet(), d: 0.02, lift: 0 }, { sh: hillSheet(), d: 0.04, lift: 0.3 },
      { d: 0.06, fn: (g, ox, oy) => { if (dcK <= 0) return; const s = dcSheet(); g.save(); g.beginPath(); g.rect(-100, -100, W + 200, HZ - 40 + 100); g.clip(); g.globalAlpha = 0.5; g.drawImage(s.s, ox - s.m + 12, oy - s.m + 16 + dy); g.globalAlpha = 1; g.drawImage(s.c, ox - s.m, oy - s.m + dy); g.restore(); } },
      { sh: houseSheet(), d: 0.08, lift: 0.8 }, { sh: hallSheet(), d: 0.1, lift: 1 }, { d: 0.1, fn: (g, ox, oy) => flag(g, ox, oy, ph) }, { sh: streetSheet(), d: 0.12, lift: 0.6 },
      { d: 0.12, fn: () => lampGlow(c, glow) }], cam);
    c.restore();
  }
  const TZ = 1.5, ENVPOS = { x: 540, y: 1250 }, ESC = 1.2;

  // ═════════ 1 · fyp_hook: frame 0 — the town at dusk, the sealed NDA envelope already on the town hall steps; the
  //            clipping NDA: SIGNED; on "deal" the envelope thumps and the wax seal glints ═════════
  SCENES.fyp_hook = { draw(c, lt) {
    const id = 'fyp_hook', dd = dur(id), tD = at(id, 'deal', 1.6);
    const cam = vcam(lt, dd, { hits: [tD], kick: 0.03 });
    town(c, lt, cam);
    const th = lt > tD ? Math.exp(-(lt - tD) * 7) * Math.sin((lt - tD) * 30) * 0.04 : 0;
    put(c, ENV(), ENVPOS.x, ENVPOS.y, { sc: ESC * (1 + th), rot: -0.05, lift: 1.4 });
    if (lt > tD) { const f = Math.exp(-(lt - tD) * 6) * 0.5; c.fillStyle = `rgba(255,236,200,${f * 0.35})`; c.beginPath(); c.arc(ENVPOS.x, ENVPOS.y + 18, 60, 0, TAU); c.fill(); }
    bigClip(c, ui('clipLabel', 'DATA CENTRE DEAL · YOUR TOWN'), ui('clipValue', 'NDA: SIGNED'), { k: lt / 0.25, dy: 420 * ease.io((lt - dd + 0.55) / 0.5) });
    box(c);
  } };

  // ═════════ 2 · fyp_build: behind the houses, a vast blank data centre rises; on "in your town" it lands ═════════
  SCENES.fyp_build = { draw(c, lt) {
    const id = 'fyp_build', dd = dur(id), tR = at(id, 'rise', 0.15), tI = at(id, 'in', 1.8);
    const cam = vcam(lt, dd, { hits: [tI], kick: 0.035, z: lerp(1, 0.96, ease.io(lt / dd)) });
    const dcK = clamp((lt - tR) / (tI - tR + 0.05), 0, 1);
    town(c, lt, cam, { dcK });
    put(c, ENV(), ENVPOS.x, ENVPOS.y, { sc: ESC, rot: -0.05, lift: 1.4 });
    screenTag(c, ui('dcTag', 'DATA CENTRE'), 540, 560, { a: clamp((lt - tI) / 0.25, 0, 1), bg: C.cream, size: 40 });
    box(c);
  } };

  // ══ VIRGINIA ═══════════════════════════════════════════════════════════════════════════════════════════════
  // rough outline from (lon, lat), projected flat: about 101 px a degree of longitude, 128 a degree of latitude
  const VX = (lon) => 70 + (lon + 83.9) * 106, VY = (lat) => 790 + (39.6 - lat) * 134;   // v2: lower, nearer the counter
  const V = (pts) => pts.map(([lo, la]) => [VX(lo), VY(la)]);
  const VA = V([[-83.68, 36.6], [-81.68, 36.59], [-80.0, 36.54], [-78.0, 36.54], [-75.87, 36.55], [-75.97, 36.9], [-76.3, 37.0], [-76.25, 37.2], [-76.3, 37.6], [-76.25, 37.9], [-76.5, 38.15],
    [-77.0, 38.4], [-77.25, 38.6], [-77.05, 38.85], [-77.45, 39.2], [-77.75, 39.32], [-78.35, 39.45], [-78.9, 38.9], [-79.45, 38.45], [-79.8, 38.1], [-80.3, 37.5], [-80.85, 37.4],
    [-81.4, 37.25], [-81.95, 37.53], [-82.3, 37.3], [-82.9, 37.0]]);
  const VA_E = V([[-75.24, 38.03], [-75.66, 37.95], [-75.9, 37.6], [-76.02, 37.15], [-75.95, 37.12], [-75.6, 37.5]]);
  const inside = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  // 31 illustrative pins (the count is the record; the places are not), spread across the state, kept apart
  const PINS = (() => { const r = U.rng(77), out = []; let guard = 0; while (out.length < 31 && guard++ < 20000) { const x = VX(-83.4 + r() * 7.3), y = VY(36.65 + r() * 2.7); if (inside(VA, x, y) && out.every((p) => Math.hypot(p.x - x, p.y - y) > 46)) out.push({ x, y, nda: false, k: r() }); } const order = out.map((p, i) => i).sort((a, b) => out[a].k - out[b].k); order.slice(0, 25).forEach((i, n) => { out[i].nda = true; out[i].n = n; }); return out; })();
  const vaSheet = () => sheet('fyp_va', (g) => {
    g.fillStyle = C.table; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(3); for (let i = 0; i < 60; i++) { g.fillStyle = C.tableL; g.fillRect(r() * W, r() * H, 80 + r() * 200, 2); }
    // the bay and the sea, as cut card
    g.fillStyle = C.water; g.beginPath(); g.moveTo(VX(-76.3), VY(36.3)); g.lineTo(W + 90, VY(36.3)); g.lineTo(W + 90, VY(39.6)); g.lineTo(VX(-76.6), VY(39.6)); g.lineTo(VX(-76.4), VY(38.6)); g.lineTo(VX(-76.1), VY(37.6)); g.closePath(); g.fill();
    const path = (P) => { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    g.fillStyle = C.stateD; path(VA); g.save(); g.translate(8, 10); g.fill(); g.restore(); g.fillStyle = C.state; path(VA); g.fill();
    g.fillStyle = C.stateD; path(VA_E); g.save(); g.translate(6, 8); g.fill(); g.restore(); g.fillStyle = C.state; path(VA_E); g.fill();
    g.fillStyle = 'rgba(21,18,15,.5)'; g.font = '400 46px "Anton-400"'; g.textAlign = 'center'; g.fillText('VIRGINIA', VX(-79.6), VY(37.15));
  }, 14);
  const MINI = () => sprite('fyp_env_mini', 74, 50, 37, 25, (g) => { g.scale(0.2, 0.2); envBody(g, ENV_W, ENV_H); g.fillStyle = C.wax; g.beginPath(); g.arc(0, 18, 40, 0, TAU); g.fill(); }, 4);

  // ═════════ 3 · fyp_va: Virginia's map; 31 pins pop; envelopes drop on 25 of them; the counter counts to 25 / 31 ═════════
  SCENES.fyp_va = { draw(c, lt) {
    const id = 'fyp_va', dd = dur(id), tP = at(id, 'pins', 0.15), tN = at(id, 'n', 2.4);
    const cam = vcam(lt, dd, { hits: [tN], kick: 0.03, z: lerp(1.04, 1.0, ease.io(lt / dd)) });
    stack(c, [{ sh: vaSheet(), d: 0.05, lift: 0.4 }, { d: 0.1, fn: (g, ox, oy) => {
      g.save(); g.translate(ox, oy);
      PINS.forEach((p, i) => { const k = ease.back((lt - tP - i * 0.025) / 0.25); if (k <= 0) return; g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(p.x + 3, p.y + 4, 9 * k, 0, TAU); g.fill(); g.fillStyle = C.pin; g.beginPath(); g.arc(p.x, p.y, 9 * k, 0, TAU); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 2; g.stroke(); });
      const tE = tP + 0.9, span = Math.max(0.6, tN - tE - 0.1);
      PINS.forEach((p) => { if (!p.nda) return; const k = (lt - tE - (p.n / 25) * span) / 0.22; if (k <= 0) return; const e = ease.out(k); put(g, MINI(), p.x, p.y - 26 - (1 - e) * 140, { sc: 1 + 0.4 * (1 - e), rot: -0.1 + p.k * 0.2, lift: 0.8 }); });
      g.restore(); } }], cam);
    // the counter: n / 31
    const tE = tP + 0.9, span = Math.max(0.6, tN - tE - 0.1), n = clamp(Math.floor(((lt - tE) / span) * 25) + 1, 0, 25), on = lt > tE;
    if (on) { c.save(); c.fillStyle = C.cream; c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 14; c.shadowOffsetX = 7; c.shadowOffsetY = 10; c.beginPath(); c.roundRect(300, 1270, 480, 190, 12); c.fill(); c.shadowColor = 'transparent';
      c.fillStyle = C.stamp; c.textAlign = 'center'; c.font = '400 150px "Anton-400"'; c.fillText(`${n}`, 470, 1420); c.fillStyle = C.ink; c.font = '400 96px "Anton-400"'; c.fillText(`/ 31`, 640, 1415); c.restore(); }
    tag(c, ui('vaTag', 'PUBLIC RECORDS REQUESTS · 2025'), lt, dd, 110, 0.5);
    box(c);
  } };

  // ══ THE REASON ═════════════════════════════════════════════════════════════════════════════════════════════
  const roomSheet = () => sheet('fyp_room', (g) => {
    g.fillStyle = C.wall; g.fillRect(-90, -90, W + 180, H + 180);
    for (let x = -60; x < W + 60; x += 120) { g.fillStyle = C.wallL; g.fillRect(x, -90, 4, 1300); }
    g.fillStyle = C.wood; g.fillRect(-90, 1290, W + 180, 700); g.fillStyle = C.woodL; g.fillRect(-90, 1290, W + 180, 14);
  }, 10);
  /** the faceless figure at a lectern: a plain head, no features; a suit; one hand raised to the board */
  const FIG = () => sprite('fyp_fig', 300, 640, 150, 600, (g) => {
    g.fillStyle = C.suit; g.beginPath(); g.moveTo(-90, -40); g.lineTo(-74, -330); g.quadraticCurveTo(0, -370, 74, -330); g.lineTo(90, -40); g.closePath(); g.fill();
    g.fillStyle = C.shirt; g.beginPath(); g.moveTo(-22, -350); g.lineTo(0, -280); g.lineTo(22, -350); g.closePath(); g.fill();
    g.fillStyle = '#7a2a24'; g.beginPath(); g.moveTo(-7, -340); g.lineTo(7, -340); g.lineTo(10, -280); g.lineTo(0, -262); g.lineTo(-10, -280); g.closePath(); g.fill();
    g.fillStyle = '#4a3a34'; g.beginPath(); g.ellipse(0, -420, 52, 62, 0, 0, TAU); g.fill();                  // a plain head: no face
    g.fillStyle = C.suitL; g.save(); g.translate(-66, -322); g.rotate(-0.62); g.fillRect(-16, -170, 32, 170); g.restore();   // the raised arm, toward the board
    g.fillStyle = '#4a3a34'; g.beginPath(); g.arc(-66 + Math.sin(-0.62) * 176, -322 - Math.cos(-0.62) * 176, 18, 0, TAU); g.fill();
  }, 10);
  const LECTERN = () => sprite('fyp_lect', 300, 330, 150, 320, (g) => {
    g.fillStyle = C.woodL; g.beginPath(); g.moveTo(-130, -310); g.lineTo(130, -310); g.lineTo(100, 0); g.lineTo(-100, 0); g.closePath(); g.fill();
    g.fillStyle = C.wood; g.fillRect(-140, -320, 280, 26);
  }, 10);
  /** the board: a card that flips from the question to the reason */
  function board(c, x, y, flip, q, a) {
    const s = Math.cos(flip * Math.PI), face = s >= 0 ? q : a;
    c.save(); c.translate(x, y); c.scale(1, Math.max(0.02, Math.abs(s)));
    c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 16; c.shadowOffsetX = 8; c.shadowOffsetY = 12; c.fillStyle = s >= 0 ? C.board : C.cream; c.beginPath(); c.roundRect(-300, -150, 600, 300, 14); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = s >= 0 ? C.ink : C.stamp; c.textAlign = 'center';
    const lines = face.split(' / '); const fs = fitFont(c, lines.reduce((m, l) => (l.length > m.length ? l : m), ''), s >= 0 ? 70 : 84, 540, `400 $px "Anton-400", ${JP}`);
    lines.forEach((l, i) => c.fillText(l, 0, (i - (lines.length - 1) / 2) * fs * 1.1 + fs * 0.36));
    c.restore();
  }

  // ═════════ 4 · fyp_why: the faceless figure at a lectern points to a board, WHY KEEP IT SECRET?; on the pop
  //            word it flips: INSIDER TRADING RULES ═════════
  SCENES.fyp_why = { draw(c, lt) {
    const id = 'fyp_why', dd = dur(id), tF = at(id, 'flip', 2.0);
    const cam = vcam(lt, dd, { hits: [tF], kick: 0.03, z: lerp(1.0, 1.05, ease.io(lt / dd)) });
    stack(c, [{ sh: roomSheet(), d: 0.04, lift: 0 }, { d: 0.1, fn: (g, ox, oy) => {
      g.save(); g.translate(ox, oy);
      const gr = g.createRadialGradient(540, 760, 40, 540, 900, 700); gr.addColorStop(0, 'rgba(255,220,160,.22)'); gr.addColorStop(1, 'rgba(255,220,160,0)'); g.fillStyle = gr; g.fillRect(0, 300, W, 1100);
      put(g, FIG(), 790, 1330, { lift: 1.2 }); put(g, LECTERN(), 780, 1430, { lift: 1.2 });
      g.restore(); } }], cam);
    const kf = clamp((lt - tF + 0.12) / 0.3, 0, 1);
    board(c, 390, 700, kf, ui('whyQ', 'WHY KEEP IT / SECRET?'), ui('whyA', 'INSIDER TRADING / RULES'));
    tag(c, ui('whyTag', "THE DEVELOPERS' REASON · AS REPORTED"), lt, dd, 110, 0.4);
    box(c);
  } };

  // ═════════ 5 · fyp_end: back in the town (frame 0's framing); on "bans" the envelope tears in two and BANNED is
  //            stamped (v3, owner: "void" was jargon); the tag names the law and its scope; the clipping rises on
  //            "clip": NDA: BANNED, where frame 0 says SIGNED ═════════
  SCENES.fyp_end = { draw(c, lt) {
    const id = 'fyp_end', dd = dur(id), tB = at(id, 'tear', 1.2), tC = at(id, 'clip', dd - 1.0);
    const tH = tB + 3.6, tL = Math.min(dd - 0.35, tC + 0.3), kR = ease.io((lt - tH) / (tL - tH));   // hold 3.6 s on the punchline, then ease home
    const cam = vcam(lt, dd, { hits: [tB], kick: 0.04 }); cam.x *= 1 - kR; cam.y *= 1 - kR; if (lt >= tL) { cam.x = cam.y = 0; cam.z = 1; }
    town(c, lt, cam, { ph: (lt - dd) * FLAG_W });   // the flag's phase reaches 0 on the last frame: frame 0's flag, the loop
    const k = clamp((lt - tB + 0.05) / 0.4, 0, 1), e = ease.out(k), z = ESC, ex = ENVPOS.x, ey = ENVPOS.y;
    if (k <= 0) put(c, ENV(), ex, ey, { sc: z, rot: -0.05, lift: 1.4 });
    else { put(c, ENV_HALF(-1), ex - 50 * e, ey + 18 * e, { sc: z, rot: -0.05 - 0.28 * e, lift: 1.4 }); put(c, ENV_HALF(1), ex + 50 * e, ey + 10 * e, { sc: z, rot: -0.05 + 0.22 * e, lift: 1.4 });
      for (let i = 0; i < 10; i++) { const r = U.rng(i * 7 + 1), a = r() * TAU, d = 60 + r() * 140; c.fillStyle = `rgba(234,208,140,${1 - k})`; c.save(); c.translate(ex + Math.cos(a) * d * e, ey + Math.sin(a) * d * e - 40 * e); c.rotate(r() * 3 + k * 4); c.fillRect(-7, -4, 14, 8); c.restore(); } }
    stampMark(c, ui('banned', 'BANNED'), ex, ey - 190, { k: (lt - tB - 0.15) / 0.16, rot: -0.12, size: 110 });
    if (lt > tB) { const f = Math.exp(-(lt - tB) * 7) * 0.2; c.fillStyle = `rgba(255,236,190,${f})`; c.fillRect(0, 0, W, H); }
    screenTag(c, ui('deTag', 'DELAWARE · SB 312 · SIGNED 26.8.2026'), 540, 520, { a: clamp((lt - tB - 0.2) / 0.25, 0, 1) * clamp((tC - 0.2 - lt) / 0.3, 0, 1), bg: K.ochre, size: 34 });
    const kC = clamp((lt - tC + 0.32) / 0.32, 0, 1);
    bigClip(c, ui('clipLabel2', 'DELAWARE · AUGUST 2026'), ui('clipValue2', 'NDA: BANNED'), { a: clamp(kC * 2.5, 0, 1), dy: 320 * (1 - ease.out(kC)), red: true });
    box(c);
  } };
})();
