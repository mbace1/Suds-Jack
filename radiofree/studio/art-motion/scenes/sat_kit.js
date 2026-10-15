// The kit for "Satire Excepted" (Radio Free Helsinki · the Nordics) — built on RFP (the papercut box).
// Its own look, not the house's dark autumn: Copenhagen and cosy — Danish red and white, candle amber,
// pale beech, the copper-green of the spires, a warm low sun. The set: Christiansborg with its tower
// over the canal, little Dannebrog flags; a workshop with a copying press; a desk with the bill and a
// calendar; a costume rail of masks with © tags; a brass balance; Toko, the station's masked presenter.
// The masks that are FACES of people are Toko masks in carrier colours; the satire masks (laughing,
// hurt, SATIRE ONLY) are plain card faces — generic, and drawn not to look like theatre's pair.
window.SAT = (() => {
  const { W, H, sheet, sprite, put, glow, ease } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112;
  const C = {
    red: '#c8102e', redD: '#9c0d24', redL: '#e04a5f', white: '#fbf8f2', cream: '#f5ecdd', creamD: '#e6d8c2',
    amber: '#f2a93b', amberL: '#ffd27a', candle: '#fff3cc',
    beech: '#e2c697', beechL: '#efdcb8', beechD: '#c9a874', beechDD: '#a5824d', beechX: '#86683c',
    copper: '#5e9e8a', copperL: '#8cc2ae', copperD: '#3f7766', copperDD: '#2f5c4f',
    stone: '#ddd6c9', stoneL: '#ebe5da', stoneD: '#bfb6a6', stoneDD: '#9c9283',
    sky0: '#e6c4a6', sky1: '#eccfb2', sky2: '#f1dabf', sky3: '#f5e3cc', sky4: '#f8ebda', sky5: '#fbf2e6',
    water: '#86a7a8', waterL: '#a9c3c1', waterD: '#6a8d8f',
    ink: '#2a1f1a', inkL: '#4a3a30', brass: '#d6a648', brassL: '#f0c76a', brassD: '#a87c2a', blue: '#9cc6dd',
  };
  const cv = RFP.canvas;
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };

  // ---------------------------------------------------------------- Danish flags
  /** a Dannebrog: red with the white Nordic cross set toward the hoist; waving if t is given */
  function flagTex(w, h) { const c = cv(w, h), g = c.getContext('2d'); g.fillStyle = C.red; g.fillRect(0, 0, w, h); g.fillStyle = C.white; const b = h * 0.14; g.fillRect(w * 0.33, 0, b, h); g.fillRect(0, h / 2 - b / 2, w, b); return c; }
  const FT = {};
  function flag(g, x, y, w, h, t, amp = 0.07, ph = 0) {
    const key = w + 'x' + h, tex = FT[key] || (FT[key] = flagTex(Math.ceil(w), Math.ceil(h))), n = 16, sw = tex.width / n;
    for (let i = 0; i < n; i++) { const u = i / n, k = Math.sin(u * 5.5 - t * 4.6 + ph), off = k * h * amp * (0.2 + u); g.drawImage(tex, i * sw, 0, sw + 0.5, tex.height, x + u * w, y + off, w / n + 0.8, h); g.fillStyle = `rgba(${k > 0 ? '255,250,235' : '60,10,10'},${(0.12 * Math.abs(k)).toFixed(3)})`; g.fillRect(x + u * w, y + off, w / n + 0.8, h); }
  }
  /** a flagpole with its Dannebrog, foot at (x, y) */
  function pole(g, x, y, s, t, ph = 0) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = C.white; g.fillRect(-4, -420, 8, 420); g.fillStyle = C.stoneD; g.fillRect(-1, -420, 3, 420);
    g.fillStyle = C.brass; g.beginPath(); g.arc(0, -426, 9, 0, TAU); g.fill();
    flag(g, 4, -414, 150, 104, t, 0.07, ph);
    g.restore();
  }
  /** a string of little paper Dannebrogs, as hung for a birthday */
  function garland(g, x0, y0, x1, y1, sag, n, t, s = 1) {
    const at = (u) => [lerp(x0, x1, u), lerp(y0, y1, u) + Math.sin(u * Math.PI) * sag + Math.sin(t * 1.6 + u * 3) * 3];
    g.strokeStyle = C.inkL; g.lineWidth = 2; g.beginPath(); for (let u = 0; u <= 1.001; u += 0.02) { const [x, y] = at(u); u ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, [x, y] = at(u), sw = Math.sin(t * 2.4 + i * 1.3) * 0.08; g.save(); g.translate(x, y); g.rotate(sw); g.fillStyle = 'rgba(42,31,26,.18)'; g.fillRect(-15 * s + 3, 3, 32 * s, 24 * s); flag(g, -16 * s, 0, 32 * s, 24 * s, 0, 0); g.restore(); }
  }

  // ---------------------------------------------------------------- Copenhagen
  /** the sky: a warm low sun, banded like cut card */
  const sky = (key, horizon = 1300) => sheet('sat_sky_' + key, (g) => {
    const bands = [C.sky0, C.sky1, C.sky2, C.sky3, C.sky4, C.sky5];
    const step = horizon / bands.length;
    bands.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-90, -90 + (i ? i * step : -90)); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, i * step + Math.sin(x * 0.006 + i * 1.3) * 12); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill(); });
  }, 8);
  const WIN = []; for (let r = 0; r < 3; r++) for (let x = -50; x < W + 60; x += 62) if (x < 360 || x > 700) WIN.push([x, 1150 + r * 88]);
  /** Christiansborg: the long granite palace with its copper mansard, the portico, and the tower —
   *  a tall square shaft, the belfry with its pinnacles, the copper helmet, the lantern and the spire
   *  with its gilt crowns. (The windows are drawn live so they can light.) */
  const borg = () => sheet('sat_borg', (g) => {
    // the tower
    const tx = 540;
    g.fillStyle = C.stoneD; g.fillRect(tx - 66, 760, 132, 360);
    g.fillStyle = C.stone; g.fillRect(tx - 60, 760, 112, 360);
    g.fillStyle = C.stoneDD; for (const dx of [-30, 12]) { g.beginPath(); g.roundRect(tx + dx - 12, 800, 24, 90, [12, 12, 0, 0]); g.fill(); g.beginPath(); g.roundRect(tx + dx - 12, 930, 24, 70, [12, 12, 0, 0]); g.fill(); }
    g.fillStyle = C.stoneL; g.fillRect(tx - 74, 748, 148, 16); g.fillRect(tx - 70, 1000, 140, 10);
    for (const dx of [-70, 58]) { g.fillStyle = C.stone; g.fillRect(tx + dx, 712, 12, 40); g.fillStyle = C.copper; g.beginPath(); g.moveTo(tx + dx - 2, 712); g.lineTo(tx + dx + 6, 680); g.lineTo(tx + dx + 14, 712); g.fill(); }   // corner pinnacles
    // the copper helmet: a swelling ogee, then the lantern, then the spire
    g.fillStyle = C.copper; g.beginPath(); g.moveTo(tx - 62, 748); g.bezierCurveTo(tx - 70, 700, tx - 22, 690, tx - 20, 650); g.lineTo(tx + 20, 650); g.bezierCurveTo(tx + 22, 690, tx + 70, 700, tx + 62, 748); g.closePath(); g.fill();
    g.fillStyle = C.copperL; g.beginPath(); g.moveTo(tx - 62, 748); g.bezierCurveTo(tx - 70, 700, tx - 22, 690, tx - 20, 650); g.lineTo(tx - 6, 650); g.bezierCurveTo(tx - 10, 690, tx - 44, 704, tx - 40, 748); g.closePath(); g.fill();
    g.fillStyle = C.copperD; g.fillRect(tx - 22, 610, 44, 42); g.fillStyle = C.copperDD; for (const dx of [-14, 2]) g.fillRect(tx + dx, 618, 10, 28);
    g.fillStyle = C.copper; g.beginPath(); g.moveTo(tx - 24, 612); g.quadraticCurveTo(tx, 590, tx + 24, 612); g.fill();
    g.fillStyle = C.copper; g.beginPath(); g.moveTo(tx - 9, 600); g.lineTo(tx, 470); g.lineTo(tx + 9, 600); g.closePath(); g.fill();
    g.fillStyle = C.copperL; g.beginPath(); g.moveTo(tx - 9, 600); g.lineTo(tx, 470); g.lineTo(tx - 2, 600); g.closePath(); g.fill();
    const crown = (y, s) => { g.fillStyle = C.brass; g.beginPath(); g.moveTo(tx - 12 * s, y); g.lineTo(tx - 14 * s, y - 14 * s); g.lineTo(tx - 7 * s, y - 7 * s); g.lineTo(tx, y - 18 * s); g.lineTo(tx + 7 * s, y - 7 * s); g.lineTo(tx + 14 * s, y - 14 * s); g.lineTo(tx + 12 * s, y); g.closePath(); g.fill(); g.fillStyle = C.brassL; g.fillRect(tx - 12 * s, y - 3 * s, 24 * s, 3 * s); };
    crown(560, 1.25); crown(520, 0.95); crown(486, 0.7); g.fillStyle = C.brass; g.fillRect(tx - 1.5, 452, 3, 22);   // three crowns, as on the real spire
    // the palace: roof, facade, cornice, the portico
    g.fillStyle = C.copperD; g.beginPath(); g.moveTo(-90, 1110); g.lineTo(-60, 1040); g.lineTo(W + 60, 1040); g.lineTo(W + 90, 1110); g.closePath(); g.fill();
    g.fillStyle = C.copper; g.beginPath(); g.moveTo(-90, 1110); g.lineTo(-70, 1060); g.lineTo(W + 70, 1060); g.lineTo(W + 90, 1110); g.closePath(); g.fill();
    g.fillStyle = 'rgba(47,92,79,.5)'; for (let x = -60; x < W + 60; x += 22) g.fillRect(x, 1062, 3, 46);
    g.fillStyle = C.copperD; for (let x = -30; x < W + 60; x += 124) if (x < 380 || x > 680) { g.fillRect(x, 1040, 34, 34); g.beginPath(); g.moveTo(x - 4, 1042); g.lineTo(x + 17, 1020); g.lineTo(x + 38, 1042); g.fill(); g.fillStyle = C.amberL; g.fillRect(x + 9, 1048, 16, 20); g.fillStyle = C.copperD; }   // dormers
    g.fillStyle = C.stone; g.fillRect(-90, 1108, W + 180, 330);
    g.fillStyle = C.stoneL; g.fillRect(-90, 1104, W + 180, 14); g.fillRect(-90, 1225, W + 180, 6); g.fillRect(-90, 1313, W + 180, 6);
    g.fillStyle = C.stoneD; g.fillRect(-90, 1400, W + 180, 40);   // the rusticated ground floor's band
    // the central portico: brought forward, columns, a pediment
    g.fillStyle = C.stoneL; g.fillRect(370, 1080, 340, 360);
    g.fillStyle = C.stone; g.beginPath(); g.moveTo(360, 1084); g.lineTo(540, 1020); g.lineTo(720, 1084); g.closePath(); g.fill();
    g.fillStyle = C.stoneD; g.beginPath(); g.moveTo(395, 1078); g.lineTo(540, 1034); g.lineTo(685, 1078); g.closePath(); g.fill();
    for (let i = 0; i < 6; i++) { const x = 392 + i * 58; g.fillStyle = '#f4efe6'; g.fillRect(x, 1110, 22, 280); g.fillStyle = C.stoneD; g.fillRect(x + 16, 1110, 6, 280); g.fillStyle = C.stoneL; g.fillRect(x - 4, 1104, 30, 8); }
    g.fillStyle = '#6d6052'; for (let i = 0; i < 5; i++) { const x = 418 + i * 58; g.beginPath(); g.roundRect(x, 1300, 28, 96, [14, 14, 0, 0]); g.fill(); }
    // the quay
    g.fillStyle = C.stoneDD; g.fillRect(-90, 1438, W + 180, 50);
    g.fillStyle = C.stoneD; g.fillRect(-90, 1438, W + 180, 14);
  }, 12);
  /** the palace's windows, n of them lit with candle light */
  function borgWindows(g, n, ox = 0) { WIN.forEach(([x, y], i) => { const lit = ((i * 7) % WIN.length) < n; g.fillStyle = lit ? C.amberL : '#7d7266'; g.fillRect(x + ox, y, 28, 58); if (lit) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x + ox + 12, y, 3, 58); g.fillRect(x + ox, y + 26, 28, 3); } }); }
  const isLit = (i, n) => ((i * 7) % WIN.length) < n;
  /** the canal: banded water with the palace smeared down into it */
  const canal = () => sheet('sat_canal', (g) => {
    g.fillStyle = C.water; g.fillRect(-90, 1488, W + 180, H);
    g.fillStyle = C.waterD; for (let y = 1500, k = 0; y < H + 90; y += 22 + k * 3, k++) g.fillRect(-90, y, W + 180, 5 + k * 0.6);
    g.fillStyle = 'rgba(221,214,201,.45)'; for (let k = 0; k < 9; k++) g.fillRect(-90, 1494 + k * 17, W + 180, 7);   // the palace's reflection
    g.fillStyle = 'rgba(94,158,138,.55)'; g.fillRect(500, 1494, 80, 160);   // the tower's, in copper
  }, 10);
  /** a canal tour boat, side on: a low hull, a glass canopy, little flags at each end */
  const boat = () => sprite('sat_boat', 460, 150, 230, 120, (g) => {
    g.fillStyle = C.white; g.beginPath(); g.moveTo(-210, -40); g.lineTo(200, -40); g.quadraticCurveTo(222, -36, 214, -14); g.lineTo(196, 6); g.lineTo(-196, 6); g.lineTo(-214, -22); g.closePath(); g.fill();
    g.fillStyle = C.red; g.fillRect(-206, -22, 412, 10);
    g.fillStyle = '#c7dfe6'; g.beginPath(); g.roundRect(-160, -96, 320, 56, [26, 26, 0, 0]); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; for (let x = -140; x < 150; x += 46) g.fillRect(x, -90, 6, 48);
    g.fillStyle = C.inkL; g.fillRect(-160, -44, 320, 4);
  }, 8);

  // ---------------------------------------------------------------- the box and the tag
  let FRAME = null;
  function frame() {
    if (FRAME) return FRAME;
    const c = cv(W, H), g = c.getContext('2d');
    g.fillStyle = C.beech; g.beginPath(); g.rect(0, 0, W, H); g.rect(56, 56, W - 112, H - 112); g.fill('evenodd');
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(56, 56, W - 112, H - 112); g.clip('evenodd');
    const r = U.rng(31); g.lineWidth = 1.4;
    for (let i = 0; i < 70; i++) { const vert = i % 2, p = r(), col = `rgba(140,104,56,${0.12 + r() * 0.18})`; g.strokeStyle = col; g.beginPath(); if (vert) { const x = p * W; for (let y = 0; y <= H; y += 30) g.lineTo(x + Math.sin(y * 0.01 + i) * 6, y); } else { const y = p * H; for (let x = 0; x <= W; x += 30) g.lineTo(x, y + Math.sin(x * 0.012 + i) * 4); } g.stroke(); }
    g.fillStyle = 'rgba(255,248,230,.35)'; g.fillRect(0, 0, W, 5); g.fillRect(0, 0, 5, H);
    g.fillStyle = 'rgba(90,60,30,.18)'; g.fillRect(0, H - 8, W, 8); g.fillRect(W - 8, 0, 8, H);
    g.restore();
    return (FRAME = c);
  }
  function box(c) {
    c.save();
    const sh = c.createLinearGradient(0, 56, 0, 132); sh.addColorStop(0, 'rgba(70,40,20,.32)'); sh.addColorStop(1, 'rgba(70,40,20,0)'); c.fillStyle = sh; c.fillRect(56, 56, W - 112, 76);
    const sl = c.createLinearGradient(56, 0, 124, 0); sl.addColorStop(0, 'rgba(70,40,20,.24)'); sl.addColorStop(1, 'rgba(70,40,20,0)'); c.fillStyle = sl; c.fillRect(56, 56, 68, H - 112);
    c.drawImage(frame(), 0, 0);
    c.strokeStyle = C.red; c.lineWidth = 6; c.strokeRect(53, 53, W - 106, H - 106);
    c.strokeStyle = C.white; c.lineWidth = 2; c.strokeRect(48.5, 48.5, W - 97, H - 97);
    c.restore();
  }
  /** the where/what tag: Danish red card, white letters */
  function tag(c, text, lt, dur, x = 96, yb = 1800) {
    const a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dur - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = '32px "ArchivoBlack-400"'; const w = c.measureText(text).width + 44, h = 64;
    if (x === 'right') x = W - 96 - w;
    c.shadowColor = 'rgba(70,30,20,.35)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = C.red; c.beginPath(); c.roundRect(x, yb - h, w, h, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = C.white; c.textAlign = 'left'; c.fillText(text, x + 22, yb - h + 44); c.restore();
  }

  // ---------------------------------------------------------------- masks
  /** a plain card face, generic — oval, eye holes, a nose, a mouth by mood — on an optional stick.
   *  mood: 'plain' | 'laugh' | 'hurt'. Origin at the face's centre. */
  const face = (mood = 'plain', stick = false, col = C.cream) => sprite(`sat_face_${mood}_${stick}_${col}`, 260, stick ? 560 : 300, 130, 140, (g) => {
    if (stick) { g.fillStyle = C.beechDD; g.fillRect(-8, 100, 16, 300); g.fillStyle = C.beechD; g.fillRect(-8, 100, 6, 300); }
    g.fillStyle = C.creamD; g.beginPath(); g.ellipse(0, 0, 104, 124, 0, 0, TAU); g.fill();
    g.fillStyle = col; g.beginPath(); g.ellipse(-3, -3, 98, 118, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(42,31,26,.08)'; g.beginPath(); g.ellipse(26, 20, 70, 92, 0, 0, TAU); g.fill();
    g.fillStyle = C.ink; g.strokeStyle = C.ink; g.lineCap = 'round';
    if (mood === 'laugh') {
      g.lineWidth = 9; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 40, -18, 20, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }   // eyes screwed shut, upturned
      g.fillStyle = 'rgba(200,16,46,.28)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 62, 22, 18, 12, 0, 0, TAU); g.fill(); }   // flushed cheeks
      g.fillStyle = C.inkL; g.beginPath(); g.moveTo(-52, 24); g.quadraticCurveTo(0, 30, 52, 24); g.quadraticCurveTo(46, 92, 0, 92); g.quadraticCurveTo(-46, 92, -52, 24); g.fill();   // the open laugh
      g.fillStyle = C.white; g.fillRect(-40, 26, 80, 12);
      g.fillStyle = C.redL; g.beginPath(); g.ellipse(0, 76, 24, 11, 0, 0, TAU); g.fill();
      g.lineWidth = 5; g.beginPath(); g.moveTo(-4, -8); g.lineTo(-10, 12); g.lineTo(2, 14); g.stroke();
    } else if (mood === 'hurt') {
      g.lineWidth = 7; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 64, -50); g.lineTo(sx * 20, -60); g.stroke(); }   // brows up in the middle
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 40, -20, 15, 9, sx * -0.25, 0, TAU); g.fill(); }
      g.lineWidth = 7; g.beginPath(); g.moveTo(-42, 62); g.quadraticCurveTo(-20, 38, 0, 46); g.quadraticCurveTo(22, 36, 42, 64); g.stroke();   // a wobbling down-turned mouth
      g.fillStyle = C.blue; g.beginPath(); g.moveTo(42, -6); g.quadraticCurveTo(52, 16, 42, 24); g.quadraticCurveTo(32, 16, 42, -6); g.fill();   // a tear
      g.save(); g.translate(-58, -76); g.rotate(-0.5); g.fillStyle = '#e8c9a0'; rr(g, -34, -11, 68, 22, 8); g.fillStyle = '#d4ae80'; g.fillRect(-10, -11, 20, 22); g.restore();   // a sticking plaster
      g.lineWidth = 5; g.beginPath(); g.moveTo(-4, -8); g.lineTo(-10, 12); g.lineTo(2, 14); g.stroke();
    } else {
      for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 40, -20, 20, 12, 0, 0, TAU); g.fill(); }   // eye holes
      g.lineWidth = 7; g.beginPath(); g.moveTo(-32, 50); g.quadraticCurveTo(0, 66, 32, 50); g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(-4, -8); g.lineTo(-10, 16); g.lineTo(2, 18); g.stroke();
    }
  }, 9);
  /** a © tag on a string: a little card label with a punched hole; back = the other side's text lines
   *  (drawn when the tag has flipped). Origin at the string's top. */
  function copyMark(g, x, y, r, col = C.red) { g.strokeStyle = col; g.lineWidth = r * 0.22; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.lineWidth = r * 0.24; g.beginPath(); g.arc(x, y, r * 0.48, Math.PI * 0.28, Math.PI * 1.72); g.stroke(); }
  const ctag = (w = 90, h = 60, back = null) => sprite(`sat_ctag_${w}_${h}_${back ? back.join('|') : ''}`, w + 30, h + 70, w / 2 + 15, 10, (g) => {
    g.strokeStyle = C.inkL; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 40); g.stroke();
    g.fillStyle = C.white; g.beginPath(); g.moveTo(-w / 2 + 12, 34); g.lineTo(w / 2 - 12, 34); g.lineTo(w / 2, 46); g.lineTo(w / 2, 34 + h); g.lineTo(-w / 2, 34 + h); g.lineTo(-w / 2, 46); g.closePath(); g.fill();
    g.strokeStyle = C.creamD; g.lineWidth = 2; g.stroke();
    g.fillStyle = C.beechD; g.beginPath(); g.arc(0, 44, 4, 0, TAU); g.fill();
    if (!back) copyMark(g, 0, 34 + h * 0.58, Math.min(w, h) * 0.26);
    else {   // the back: each line with a tick after it, the block centred on the tag
      g.textAlign = 'left'; const fs = Math.round(h / (back.length + 1.4)); g.font = fs + 'px "ArchivoBlack-400"';
      const tw = Math.max(...back.map((s) => g.measureText(s).width)), x0 = -(tw + fs * 1.1) / 2;
      back.forEach((s, i) => { const y = 34 + h * 0.3 + (i + 0.85) * fs * 1.12; g.fillStyle = C.ink; g.fillText(s, x0, y); tick(g, x0 + tw + fs * 0.62, y - fs * 0.38, fs * 0.36); });
    }
  }, 6);
  /** a tick, drawn (the fonts have no ✓) */
  function tick(g, x, y, s) { g.strokeStyle = C.copperD; g.lineWidth = s * 0.45; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x - s * 0.25, y + s * 0.8); g.lineTo(x + s * 1.1, y - s * 0.9); g.stroke(); }
  /** a plain label tag (SATIRE ONLY, MISLEADS): text, no tick */
  const label = (text, w, col = C.white, ink = C.ink) => sprite(`sat_label_${text}_${w}_${col}`, w + 30, 140, w / 2 + 15, 10, (g) => {
    g.strokeStyle = C.inkL; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 36); g.stroke();
    g.fillStyle = col; g.beginPath(); g.moveTo(-w / 2 + 12, 30); g.lineTo(w / 2 - 12, 30); g.lineTo(w / 2, 42); g.lineTo(w / 2, 100); g.lineTo(-w / 2, 100); g.lineTo(-w / 2, 42); g.closePath(); g.fill();
    g.fillStyle = C.beechD; g.beginPath(); g.arc(0, 40, 4, 0, TAU); g.fill();
    g.fillStyle = ink; g.textAlign = 'center'; let fs = 34; g.font = fs + 'px "ArchivoBlack-400"'; while (g.measureText(text).width > w - 24 && fs > 12) g.font = --fs + 'px "ArchivoBlack-400"'; g.fillText(text, 0, 80);
  }, 6);
  /** a Toko mask (a person's face) on its own, origin at its centre */
  function person(g, x, y, r, color) { RFM.mask(g, x, y, r, color, { strap: false, shade: false, face: C.cream, ink: C.ink }); }

  // ---------------------------------------------------------------- the copying press
  /** the press body: two beech posts, a red crown with a wheel, a lens that reads, the bed; origin at the bed's centre */
  const pressBody = () => sprite('sat_press', 520, 760, 260, 560, (g) => {
    g.fillStyle = C.beechDD; g.fillRect(-230, -520, 50, 720); g.fillRect(180, -520, 50, 720);
    g.fillStyle = C.beechD; g.fillRect(-224, -520, 22, 720); g.fillRect(186, -520, 22, 720);
    g.fillStyle = C.redD; rr(g, -250, -560, 500, 90, 16); g.fillStyle = C.red; rr(g, -244, -556, 488, 74, 12);
    g.fillStyle = C.white; g.fillRect(-244, -526, 488, 10);
    // the lens on the crown's left: a brass barrel, a dark glass
    g.fillStyle = C.brassD; rr(g, -330, -560, 96, 70, 14); g.fillStyle = C.brass; rr(g, -326, -556, 88, 60, 12); g.fillStyle = C.ink; g.beginPath(); g.arc(-306, -526, 22, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(-312, -532, 7, 0, TAU); g.fill();
    // the bed
    g.fillStyle = C.beechDD; g.fillRect(-250, 0, 500, 40); g.fillStyle = C.beechD; g.fillRect(-240, -12, 480, 16);
    g.fillStyle = C.beechDD; g.fillRect(-250, 40, 40, 160); g.fillRect(210, 40, 40, 160);
  }, 12);
  /** the platen that comes down: a red block on a brass screw; origin at its bottom centre */
  const platen = () => sprite('sat_platen', 420, 120, 210, 100, (g) => { g.fillStyle = C.redD; rr(g, -190, -70, 380, 70, 8); g.fillStyle = C.red; rr(g, -184, -66, 368, 56, 6); g.fillStyle = C.white; g.fillRect(-184, -36, 368, 8); }, 8);
  /** a sound wave on a card (the voice) */
  const voiceCard = () => sprite('sat_voice', 230, 190, 115, 95, (g) => {
    g.fillStyle = C.white; rr(g, -100, -80, 200, 160, 12);
    g.fillStyle = C.ink; for (let i = 0; i < 15; i++) { const h = 10 + Math.abs(Math.sin(i * 1.7) * 50 + Math.sin(i * 0.6) * 30); rr(g, -84 + i * 11.5, -h / 2, 7, h, 3); }
  }, 8);
  /** a figure mid-step on a card (the moves) */
  const movesCard = (coat) => sprite('sat_moves_' + coat, 230, 190, 115, 95, (g) => {
    g.fillStyle = C.white; rr(g, -100, -80, 200, 160, 12);
    g.save(); g.translate(0, 4); g.fillStyle = C.ink; g.lineCap = 'round'; g.strokeStyle = C.ink; g.lineWidth = 12;
    g.beginPath(); g.moveTo(-6, 20); g.lineTo(-32, 64); g.moveTo(6, 20); g.lineTo(28, 46); g.lineTo(46, 62); g.stroke();   // legs, a kick
    g.strokeStyle = coat; g.lineWidth = 14; g.beginPath(); g.moveTo(-6, -24); g.lineTo(-48, -50); g.moveTo(8, -24); g.lineTo(44, -6); g.stroke();   // arms out
    g.fillStyle = coat; rr(g, -20, -36, 40, 60, 10);
    g.fillStyle = C.ink; g.beginPath(); g.arc(2, -54, 18, 0, TAU); g.fill();
    g.restore();
  }, 8);

  // ---------------------------------------------------------------- the desk
  /** the bill: a paper document, L 49 on its cover */
  const bill = () => sprite('sat_bill', 420, 560, 210, 280, (g) => {
    g.fillStyle = C.creamD; rr(g, -186, -246, 380, 500, 6);
    g.fillStyle = C.white; rr(g, -190, -250, 380, 500, 6);
    g.fillStyle = C.red; g.fillRect(-190, -250, 380, 18);
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '150px "Anton-400"'; g.fillText('L 49', 0, -40);
    g.fillStyle = 'rgba(42,31,26,.28)'; for (let i = 0; i < 7; i++) rr(g, -140, 20 + i * 30, i % 3 === 2 ? 180 : 280, 10, 5);
    g.fillStyle = 'rgba(42,31,26,.5)'; g.fillRect(-140, -10, 280, 3);
  }, 10);
  /** a calendar page: the month in a red band, the day large */
  const calPage = (month, year, day) => sprite(`sat_cal_${month}_${day}`, 400, 440, 200, 30, (g) => {
    g.fillStyle = C.white; rr(g, -180, 0, 360, 400, 8);
    g.fillStyle = C.red; g.beginPath(); g.roundRect(-180, 0, 360, 96, [8, 8, 0, 0]); g.fill();
    g.fillStyle = C.white; g.textAlign = 'center'; g.font = '50px "Anton-400"'; g.fillText(month + ' ' + year, 0, 68);
    g.fillStyle = C.ink; g.font = '250px "Anton-400"'; g.fillText(String(day), 0, 350);
  }, 6);

  // ---------------------------------------------------------------- the rail and the scale
  /** a wooden coat hanger with its hook; origin at the hook's top */
  const hanger = () => sprite('sat_hanger', 260, 120, 130, 14, (g) => {
    g.strokeStyle = C.inkL; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.arc(0, 14, 12, Math.PI, Math.PI * 2.1); g.moveTo(0, 22); g.lineTo(0, 38); g.stroke();
    g.fillStyle = C.beechDD; g.beginPath(); g.moveTo(-110, 78); g.quadraticCurveTo(0, 22, 110, 78); g.lineTo(110, 90); g.quadraticCurveTo(0, 38, -110, 90); g.closePath(); g.fill();
    g.fillStyle = C.beechD; g.beginPath(); g.moveTo(-104, 78); g.quadraticCurveTo(0, 28, 104, 78); g.lineTo(104, 82); g.quadraticCurveTo(0, 32, -104, 82); g.closePath(); g.fill();
  }, 6);
  /** the rail: a beech pole on two stands, across the frame at y */
  const rail = (y) => sheet('sat_rail_' + y, (g) => {
    for (const x of [96, W - 96]) { g.fillStyle = C.beechDD; g.fillRect(x - 12, y, 24, H - y); g.fillStyle = C.beechD; g.fillRect(x - 12, y, 9, H - y); }
    g.fillStyle = C.beechDD; rr(g, 70, y - 14, W - 140, 28, 14); g.fillStyle = C.beechL; rr(g, 74, y - 12, W - 148, 10, 5);
  }, 8);
  /** the wardrobe behind it: beech panels, a red curtain, a candle-lit lamp */
  const wardrobe = () => sheet('sat_wardrobe', (g) => {
    g.fillStyle = C.beechL; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.beech; for (let x = -60; x < W + 90; x += 150) g.fillRect(x, -90, 130, 1660);
    g.fillStyle = 'rgba(140,104,56,.16)'; for (let x = -60; x < W + 90; x += 150) for (let k = 0; k < 5; k++) g.fillRect(x + 14 + k * 24, -90, 2, 1660);
    g.fillStyle = C.redD; g.beginPath(); g.moveTo(W - 220, -90); g.lineTo(W + 90, -90); g.lineTo(W + 90, 1600); g.quadraticCurveTo(W - 120, 1500, W - 160, 1200); g.quadraticCurveTo(W - 240, 700, W - 220, -90); g.fill();
    g.fillStyle = C.red; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(W - 200 + k * 60, -90); g.quadraticCurveTo(W - 210 + k * 60, 700, W - 150 + k * 70, 1500); g.lineTo(W - 130 + k * 70, 1500); g.quadraticCurveTo(W - 180 + k * 60, 700, W - 170 + k * 60, -90); g.fill(); }
    g.fillStyle = C.beechD; g.fillRect(-90, 1560, W + 180, H);
    g.fillStyle = C.beechDD; for (let y = 1580; y < H + 90; y += 50) g.fillRect(-90, y, W + 180, 4);
  }, 12);
  const scalePost = (h = 760) => sprite('sat_post_' + h, 360, h + 140, 180, h + 120, (g) => {
    g.fillStyle = C.brassD; g.beginPath(); g.moveTo(-150, 0); g.lineTo(150, 0); g.lineTo(110, -50); g.lineTo(-110, -50); g.closePath(); g.fill();
    g.fillStyle = C.brass; g.beginPath(); g.moveTo(-130, -8); g.lineTo(130, -8); g.lineTo(96, -46); g.lineTo(-96, -46); g.closePath(); g.fill();
    g.fillStyle = C.brassD; g.fillRect(-18, -h, 36, h - 46); g.fillStyle = C.brassL; g.fillRect(-12, -h, 10, h - 46);
    g.fillStyle = C.brass; g.beginPath(); g.arc(0, -h - 10, 26, 0, TAU); g.fill(); g.fillStyle = C.brassL; g.beginPath(); g.arc(-6, -h - 16, 8, 0, TAU); g.fill();
  }, 12);
  const scaleBeam = (arm) => sprite('sat_beam_' + arm, arm * 2 + 80, 70, arm + 40, 35, (g) => {
    g.fillStyle = C.brassD; g.beginPath(); g.moveTo(-arm, -10); g.quadraticCurveTo(0, -26, arm, -10); g.lineTo(arm, 10); g.quadraticCurveTo(0, -4, -arm, 10); g.closePath(); g.fill();
    g.fillStyle = C.brass; g.beginPath(); g.arc(0, -8, 22, 0, TAU); g.fill(); for (const x of [-arm, arm]) { g.beginPath(); g.arc(x, 0, 12, 0, TAU); g.fill(); }
  }, 8);
  const scalePan = (w = 300) => sprite('sat_pan_' + w, w + 40, 90, w / 2 + 20, 20, (g) => { g.fillStyle = C.brassD; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.quadraticCurveTo(w * 0.37, 56, 0, 58); g.quadraticCurveTo(-w * 0.37, 56, -w / 2, 0); g.fill(); g.fillStyle = C.brass; g.fillRect(-w / 2, -7, w, 10); }, 8);
  /** a balance's beam, chains and pans drawn about its pivot (px, py), tipped by th (positive: left down);
   *  load(side, x, y) draws what sits in each pan */
  function balance(g, px, py, arm, hang, th, load, pw = 300) {
    const L = [px - arm * Math.cos(th), py + arm * Math.sin(th)], R = [px + arm * Math.cos(th), py - arm * Math.sin(th)];
    put(g, scaleBeam(arm), px, py, { rot: -th, lift: 1.5 });
    for (const [[x, y], side] of [[L, -1], [R, 1]]) {
      const yy = y + hang;
      g.strokeStyle = C.brassD; g.lineWidth = 3; g.beginPath(); for (const dx of [-pw * 0.45, 0, pw * 0.45]) { g.moveTo(x, y); g.lineTo(x + dx, yy); } g.stroke();
      if (load) load(side, x, yy);
      put(g, scalePan(pw), x, yy, { lift: 1.5 });
    }
  }
  /** a candle on a brass dish, its flame flickering, its light added */
  function candle(g, x, y, t, s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = C.brassD; g.beginPath(); g.ellipse(0, 0, 50, 12, 0, 0, TAU); g.fill(); g.fillStyle = C.brass; g.beginPath(); g.ellipse(0, -4, 46, 10, 0, 0, TAU); g.fill();
    g.fillStyle = C.white; rr(g, -16, -150, 32, 148, 6); g.fillStyle = 'rgba(42,31,26,.08)'; g.fillRect(4, -150, 12, 148);
    g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -150); g.lineTo(0, -162); g.stroke();
    const f = 1 + Math.sin(t * 13) * 0.08 + Math.sin(t * 7.3) * 0.06;
    g.fillStyle = C.amber; g.beginPath(); g.ellipse(Math.sin(t * 5) * 2, -178, 10, 22 * f, 0, 0, TAU); g.fill();
    g.fillStyle = C.candle; g.beginPath(); g.ellipse(Math.sin(t * 5) * 2, -174, 5, 12 * f, 0, 0, TAU); g.fill();
    g.restore();
    glow(g, x, y - 178 * s, 260 * s, 'rgba(255,190,90,', 0.32 + Math.sin(t * 9) * 0.03);
  }
  /** a view: world point (px, py) lands on screen at (sx, sy), scaled z */
  function view(c, z, px, py, sx = 540, sy = 1250) { c.translate(sx, sy); c.scale(z, z); c.translate(-px, -py); }

  return { C, B, rr, flag, pole, garland, sky, borg, borgWindows, isLit, WIN, canal, boat, box, tag, face, ctag, copyMark, tick, label, person, pressBody, platen, voiceCard, movesCard,
    bill, calPage, hanger, rail, wardrobe, scalePost, scaleBeam, scalePan, balance, candle, view };
})();
