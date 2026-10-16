// The kit for "On the Same Voluntary Terms" (film 2, id vt) — built on RFP, the papercut box.
// Its own look (owner: "slightly different colors ... so they don't all look the same"): a London MORNING, not the
// house's dark autumn. A slate sky, wet stone, a racing-green door, polished brass, and one pillar-box red thing that
// matters: the telephone. The sets: Westminster's clock tower and a terrace with the Institute's door (shots 1, 5),
// its rooms (2, 4), and a paper ocean with the White House and two labs on the far shore (3, 6). Every box travels
// on a STRING from the first shot, so that the strings can be pulled in shot 3. The testers are generic people in
// Toko masks; no real person is drawn. The three boxes are identical: no company is singled out.
window.VT = (() => {
  const { K, W, H, M, sheet, sprite, put, glow, walker, stack } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = {
    slate: '#2b3440', slateD: '#1d242d', slateL: '#3d4857',
    stone: '#6d7480', stoneL: '#858c96', stoneLL: '#a2a8af', stoneD: '#555c67', stoneDD: '#434953',
    cream: '#e2dfd5', creamD: '#bdbab0',
    green: '#1f4a3a', greenL: '#2c614f', greenD: '#133026',
    brass: '#c9a24a', brassL: '#ecd27e', brassD: '#8c6d2c', brassDD: '#5a4414',
    red: '#c8102e', redL: '#e8405a', redD: '#86091d',
    ink: '#161b21', iron: '#1a1f25', pen: '#1f2b45',
    kraft: '#b38b5b', kraftL: '#cba676', kraftD: '#8a6840', tape: '#e3d6ab',
    manila: '#eadcae', twine: '#e2d3a8', twineD: '#7d7052',
    china: '#f1f1ec', tea: '#7a4a24', teaCold: '#5a5048', lab: '#dedcd3',
  };
  const B = 60 / 112, DUR = 12 * B;
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  /** a colour between two hex colours */
  const mix = (a, b, k) => { const A = hx(a), Z = hx(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, Z[i], clamp(k, 0, 1)))).join(',')})`; };
  const io = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
  const eo = RFP.ease.out;
  /** a sprite cut at twice the resolution, for anything the camera pushes in on; put2 halves it back */
  const hi = (key, w, h, ox, oy, draw, blur = 8) => sprite(key + '@2', w * 2, h * 2, ox * 2, oy * 2, (g) => { g.scale(2, 2); draw(g); }, blur * 2);
  const put2 = (c, sp, x, y, o = {}) => put(c, sp, x, y, { ...o, sc: (o.sc ?? 1) * 0.5 });
  /** set a font no wider than maxW */
  function fit(g, text, fam, size, maxW, wt = '') { g.font = `${wt}${size}px "${fam}"`; while (g.measureText(text).width > maxW && size > 8) g.font = `${wt}${--size}px "${fam}"`; return size; }
  /** the camera for big moves: world point (cx, cy) lands on (sx, sy), scaled z */
  function camera(c, cx = 540, cy = 960, z = 1, sx = 540, sy = 960) { c.translate(sx, sy); c.scale(z, z); c.translate(-cx, -cy); }

  /** the box: the house's shadowbox, but lacquered slate-black with a brass fillet, for a London film */
  function frame(c) {
    c.save();
    const sh = c.createLinearGradient(0, 56, 0, 150); sh.addColorStop(0, 'rgba(8,12,18,.55)'); sh.addColorStop(1, 'rgba(8,12,18,0)'); c.fillStyle = sh; c.fillRect(56, 56, W - 112, 94);
    const sl = c.createLinearGradient(56, 0, 140, 0); sl.addColorStop(0, 'rgba(8,12,18,.45)'); sl.addColorStop(1, 'rgba(8,12,18,0)'); c.fillStyle = sl; c.fillRect(56, 56, 84, H - 112);
    c.fillStyle = '#1a2027'; c.beginPath(); c.rect(0, 0, W, H); c.rect(56, 56, W - 112, H - 112); c.fill('evenodd');
    c.strokeStyle = '#38414d'; c.lineWidth = 4; c.strokeRect(56, 56, W - 112, H - 112);
    c.strokeStyle = 'rgba(201,162,74,.28)'; c.lineWidth = 2; c.strokeRect(22, 22, W - 44, H - 44);
    c.restore();
  }
  /** the where/what tag: a brass card in the lower corner; a long one breaks at its last " · " and grows upward */
  function tag(c, text, lt, dur, x = 110, y = 1690) {
    y = Math.min(y, RFP.SAFE_B - 66);   // above Instagram's caption and channel line (a two-line tag grows upward from here)
    const a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dur - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = '32px "ArchivoBlack-400"';
    let lines = [text]; if (c.measureText(text).width > 800) { const i = text.lastIndexOf(' · '); lines = [text.slice(0, i), text.slice(i + 3)]; }
    const w = Math.max(...lines.map((s) => c.measureText(s).width)) + 44, h = 22 + lines.length * 44, top = y + 66 - h;
    c.shadowColor = 'rgba(8,12,18,.55)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = C.brass; c.beginPath(); c.roundRect(x, top, w, h, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = 'rgba(255,240,190,.35)'; c.fillRect(x + 8, top + 5, w - 16, 3);
    c.fillStyle = C.ink; lines.forEach((s, i) => c.fillText(s, x + 22, top + 45 + i * 44)); c.restore();
  }

  // ---------------------------------------------------------------- the London sky
  /** a London morning: slate at the top paling to a warm grey at the horizon, cut in bands like card */
  const sky = (key, horizon = 1250) => sheet('vt_sky_' + key, (g) => {
    const bands = ['#4b5664', '#576270', '#646f7c', '#737e89', '#848e97', '#969fa6', '#a9afb3', '#bcc0be', '#cdccc3'];
    const step = horizon / bands.length;
    bands.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-M, i ? i * step : -M); for (let x = -M; x <= W + M; x += 60) g.lineTo(x, i ? i * step + Math.sin(x * 0.005 + i * 1.7) * 12 : -M); g.lineTo(W + M, H + M); g.lineTo(-M, H + M); g.closePath(); g.fill(); });
  }, 10);
  /** long cloud strips, a paler card than the band behind them: rows of [y, x0, x1, colour, bump] */
  const clouds = (key, rows) => sheet('vt_clouds_' + key, (g) => {
    for (const [y, x0, x1, col, r] of rows) {
      g.fillStyle = col; g.beginPath(); g.moveTo(x0, y + r * 0.4);
      for (let x = x0, k = 0; x < x1; x += r * 1.25, k++) g.arc(x + r * 0.62, y - Math.abs(Math.sin(k * 1.9)) * r * 0.45, r * (0.7 + 0.3 * Math.abs(Math.cos(k * 1.3))), Math.PI, 0);
      g.lineTo(x1 + r * 0.6, y + r * 0.4); g.closePath(); g.fill();
    }
  }, 12);
  const SKYROWS = [[300, -60, 420, '#6c7783', 34], [470, 560, 1160, '#7f8994', 40], [760, -80, 330, '#9aa2a8', 30], [700, 760, 1180, '#a3aaaf', 26]];

  // ---------------------------------------------------------------- Westminster
  /** the Elizabeth Tower in silhouette: shaft, clock stage with its face, belfry, the pinnacled roof and spire */
  function tower(g, x, base, s, col, colL, face) {
    g.save(); g.translate(x, base); g.scale(s, s); g.fillStyle = col;
    g.fillRect(-50, -560, 100, 560); g.fillRect(-58, -702, 116, 144); g.fillRect(-63, -716, 126, 16); g.fillRect(-52, -794, 104, 80);
    g.beginPath(); g.moveTo(-57, -792); g.lineTo(-38, -848); g.lineTo(38, -848); g.lineTo(57, -792); g.closePath(); g.fill();
    for (const px of [-57, -30, 30, 57]) { g.beginPath(); g.moveTo(px - 6, -790); g.lineTo(px, -866); g.lineTo(px + 6, -790); g.fill(); }
    g.beginPath(); g.moveTo(-36, -846); g.lineTo(-11, -962); g.lineTo(-11, -992); g.lineTo(0, -1042); g.lineTo(11, -992); g.lineTo(11, -962); g.lineTo(36, -846); g.closePath(); g.fill();
    g.fillRect(-2, -1074, 4, 36); g.fillRect(-9, -1062, 18, 4);
    g.fillStyle = colL; for (const px of [-36, -13, 13, 36]) g.fillRect(px - 2, -548, 4, 526);
    for (let y = -70; y > -560; y -= 70) g.fillRect(-50, y, 100, 3);
    g.fillRect(-58, -572, 116, 6); g.fillRect(-58, -704, 116, 5);
    g.fillStyle = 'rgba(0,0,0,.28)'; for (const px of [-32, 0, 32]) { g.beginPath(); g.roundRect(px - 9, -780, 18, 54, [9, 9, 0, 0]); g.fill(); }
    g.fillStyle = face; g.beginPath(); g.arc(0, -630, 44, 0, TAU); g.fill();
    g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(0, -630, 44, 0, TAU); g.stroke();
    // nine o'clock in the morning: an L that reads at any size
    const hA = 9 / 12 * TAU, mA = 0; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -630); g.lineTo(Math.sin(hA) * 24, -630 - Math.cos(hA) * 24); g.moveTo(0, -630); g.lineTo(Math.sin(mA) * 36, -630 - Math.cos(mA) * 36); g.stroke();
    g.restore();
  }
  /** the Palace's roofline and the tower over it, far back and paled by the morning */
  const westminster = () => sheet('vt_westminster', (g) => {
    const col = '#6e7782', colL = '#7d8691';
    g.fillStyle = col; g.fillRect(-M, 1170, 480 + M, 260);
    for (let x = -80, k = 0; x < 380; x += 26, k++) { g.beginPath(); g.moveTo(x - 5, 1172); g.lineTo(x, k % 3 ? 1146 : 1128); g.lineTo(x + 5, 1172); g.fill(); }
    g.fillRect(-40, 1090, 80, 90); for (const px of [-40, 40]) { g.beginPath(); g.moveTo(px - 7, 1092); g.lineTo(px, 1050); g.lineTo(px + 7, 1092); g.fill(); }
    g.fillStyle = colL; for (let x = -70; x < 380; x += 26) g.fillRect(x, 1200, 8, 60);
    tower(g, 220, 1300, 0.9, col, colL, '#e7e2cf');
  }, 8);
  /** a London plane: mottled trunk, a lumpy grey-green crown */
  const plane = () => sprite('vt_plane', 400, 560, 200, 540, (g) => {
    g.fillStyle = '#4b4842'; g.beginPath(); g.moveTo(-16, 0); g.lineTo(-11, -230); g.lineTo(11, -230); g.lineTo(16, 0); g.closePath(); g.fill();
    g.lineWidth = 9; g.strokeStyle = '#4b4842'; g.beginPath(); g.moveTo(0, -200); g.lineTo(-70, -300); g.moveTo(0, -220); g.lineTo(60, -320); g.stroke();
    g.fillStyle = '#8b877a'; for (const [x, y] of [[-6, -40], [5, -110], [-4, -170]]) { g.beginPath(); g.ellipse(x, y, 6, 14, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#5c6a62'; for (const [x, y, r] of [[-100, -320, 82], [0, -380, 104], [100, -320, 84], [-50, -260, 72], [64, -250, 70], [0, -450, 74], [-140, -260, 50], [140, -250, 52]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.fillStyle = '#4d5a53'; for (const [x, y, r] of [[-60, -230, 50], [40, -220, 54], [-120, -230, 40], [120, -220, 40]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.fillStyle = '#6b7a71'; for (const [x, y, r] of [[-30, -420, 40], [-120, -350, 34], [70, -400, 36]]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  }, 12);
  /** a Victorian lamp standard, still lit in the grey morning */
  const lamp = () => sprite('vt_lamp', 140, 700, 70, 680, (g) => {
    g.fillStyle = C.iron; g.beginPath(); g.moveTo(-20, 0); g.lineTo(-14, -70); g.lineTo(14, -70); g.lineTo(20, 0); g.fill(); g.fillRect(-7, -580, 14, 520);
    for (const y of [-80, -300, -560]) g.fillRect(-11, y, 22, 10); g.fillRect(-34, -548, 68, 6);
    g.beginPath(); g.moveTo(-24, -580); g.lineTo(24, -580); g.lineTo(34, -650); g.lineTo(-34, -650); g.closePath(); g.fill();
    g.fillStyle = '#efe0b0'; g.beginPath(); g.moveTo(-17, -588); g.lineTo(17, -588); g.lineTo(25, -642); g.lineTo(-25, -642); g.closePath(); g.fill();
    g.fillStyle = C.iron; g.fillRect(-2, -642, 4, 54); g.beginPath(); g.moveTo(-40, -650); g.lineTo(0, -676); g.lineTo(40, -650); g.closePath(); g.fill(); g.fillRect(-3, -690, 6, 16);
  }, 8);
  /** a pillar box: plinth, red drum, its cap, the slot under a hood */
  const pillar = () => sprite('vt_pillar', 140, 280, 70, 268, (g) => {
    g.fillStyle = '#17191c'; g.fillRect(-46, -26, 92, 26);
    g.fillStyle = C.red; g.fillRect(-40, -196, 80, 172);
    g.fillStyle = C.redD; g.fillRect(-48, -204, 96, 10);
    g.fillStyle = C.red; g.beginPath(); g.ellipse(0, -204, 46, 40, 0, Math.PI, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(14, -194, 26, 170); g.beginPath(); g.ellipse(0, -204, 46, 40, 0, Math.PI * 1.55, TAU); g.lineTo(0, -204); g.fill();
    g.fillStyle = 'rgba(255,255,255,.16)'; g.fillRect(-30, -190, 9, 160);
    g.fillStyle = C.redD; g.fillRect(-30, -168, 60, 6); g.fillStyle = '#101113'; g.fillRect(-25, -162, 50, 8);
    g.fillStyle = '#e8e6de'; g.fillRect(-17, -138, 34, 22);
    g.strokeStyle = C.redD; g.lineWidth = 2; g.strokeRect(-24, -102, 48, 64);
  }, 8);
  /** a black London cab, side on: the tall cabin and round roof, the amber light on top */
  const cab = () => sprite('vt_cab', 420, 210, 210, 196, (g) => {
    g.fillStyle = '#14171b'; g.beginPath(); g.moveTo(-188, -26); g.lineTo(-192, -72); g.lineTo(-170, -88); g.lineTo(-126, -92); g.lineTo(-118, -150); g.quadraticCurveTo(-110, -172, -76, -174); g.lineTo(54, -174); g.quadraticCurveTo(84, -170, 96, -146); g.lineTo(114, -102); g.lineTo(176, -94); g.quadraticCurveTo(196, -88, 196, -60); g.lineTo(192, -26); g.closePath(); g.fill();
    g.strokeStyle = '#7d8894'; g.lineWidth = 3; g.beginPath(); g.moveTo(-126, -92); g.lineTo(-118, -150); g.quadraticCurveTo(-110, -172, -76, -174); g.lineTo(54, -174); g.quadraticCurveTo(84, -170, 96, -146); g.lineTo(114, -102); g.lineTo(176, -94); g.stroke();
    g.fillStyle = '#4a5560'; g.beginPath(); g.moveTo(-104, -100); g.lineTo(-98, -152); g.quadraticCurveTo(-94, -162, -78, -162); g.lineTo(-24, -162); g.lineTo(-24, -100); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-14, -100); g.lineTo(-14, -162); g.lineTo(48, -162); g.quadraticCurveTo(72, -160, 82, -140); g.lineTo(96, -100); g.closePath(); g.fill();
    g.fillStyle = 'rgba(210,220,230,.22)'; g.beginPath(); g.moveTo(-90, -110); g.lineTo(-60, -158); g.lineTo(-44, -158); g.lineTo(-74, -110); g.closePath(); g.fill();
    g.fillStyle = '#3a414a'; g.fillRect(-180, -84, 368, 3); g.fillStyle = '#9aa1a8'; g.fillRect(-194, -40, 22, 12); g.fillRect(176, -40, 24, 12);
    g.fillStyle = '#f2c050'; g.fillRect(-26, -188, 52, 14);
    g.fillStyle = '#f4ecd2'; g.beginPath(); g.arc(182, -74, 9, 0, TAU); g.fill();
    for (const x of [-118, 122]) { g.fillStyle = '#0b0c0e'; g.beginPath(); g.arc(x, -26, 30, 0, TAU); g.fill(); g.fillStyle = '#8f969c'; g.beginPath(); g.arc(x, -26, 13, 0, TAU); g.fill(); }
  }, 8);

  // ---------------------------------------------------------------- the terrace and the door
  /** a sash window: lintel, sill, painted frame, slate glass with a slice of reflected sky, glazing bars */
  function sash(g, cx, top, w, h) {
    g.fillStyle = C.stoneLL; g.fillRect(cx - w / 2 - 12, top - 22, w + 24, 18); g.fillRect(cx - w / 2 - 10, top + h, w + 20, 12);
    g.fillStyle = C.cream; g.fillRect(cx - w / 2, top, w, h);
    const gl = g.createLinearGradient(0, top, 0, top + h); gl.addColorStop(0, '#7d8b98'); gl.addColorStop(0.5, '#4a5867'); gl.addColorStop(1, '#2e3945');
    g.fillStyle = gl; g.fillRect(cx - w / 2 + 7, top + 7, w - 14, h - 14);
    g.fillStyle = 'rgba(220,228,235,.18)'; g.beginPath(); g.moveTo(cx - w / 2 + 7, top + h * 0.55); g.lineTo(cx - w / 2 + 7 + w * 0.45, top + 7); g.lineTo(cx - w / 2 + 7 + w * 0.7, top + 7); g.lineTo(cx - w / 2 + 7, top + h * 0.82); g.closePath(); g.fill();
    g.fillStyle = C.cream; for (const k of [1, 2]) g.fillRect(cx - w / 2 + (w * k) / 3 - 2, top, 4, h);
    g.fillRect(cx - w / 2, top + h / 2 - 5, w, 10); for (const k of [0.25, 0.75]) g.fillRect(cx - w / 2, top + h * k - 2, w, 4);
  }
  /** area railings on a stone plinth, spear tops */
  function railings(g, x0, x1, base, h = 150) {
    g.fillStyle = C.stoneLL; g.fillRect(x0, base - 14, x1 - x0, 14);
    g.fillStyle = C.iron; g.fillRect(x0, base - h + 16, x1 - x0, 6); g.fillRect(x0, base - 30, x1 - x0, 6);
    for (let x = x0 + 9; x < x1 - 2; x += 20) { g.fillRect(x - 2, base - h, 4, h - 14); g.beginPath(); g.moveTo(x - 5, base - h + 3); g.lineTo(x, base - h - 12); g.lineTo(x + 5, base - h + 3); g.fill(); }
  }
  /** the street in shots 1 and 5: a stone terrace with its sash windows and railings, wet York-stone flags, the road */
  const DOOR1 = { x: 690, y: 1462, s: 0.9 }, PAVE = 1521;
  const street = () => sheet('vt_street', (g) => {
    const X0 = 372, R = W + M;
    for (const cx of [520, 905]) { g.fillStyle = C.stoneD; g.fillRect(cx - 56, 528, 112, 80); g.fillStyle = C.stoneLL; g.fillRect(cx - 62, 520, 124, 12); g.fillStyle = '#8a5f46'; for (let k = -2; k <= 2; k++) g.fillRect(cx + k * 22 - 7, 494, 14, 28); }
    g.fillStyle = C.stoneLL; g.fillRect(X0 - 10, 600, R - X0 + 10, 22); g.fillStyle = C.stoneL; g.fillRect(X0, 622, R - X0, 28);
    g.fillStyle = C.stoneLL; for (let x = X0 + 6; x < R; x += 22) g.fillRect(x, 650, 12, 10);
    g.fillStyle = C.stoneL; g.fillRect(X0, 660, R - X0, 340);
    g.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 700; y < 1000; y += 40) g.fillRect(X0, y, R - X0, 2);
    g.fillStyle = C.stone; g.fillRect(X0, 1000, R - X0, PAVE - 1000);
    g.fillStyle = 'rgba(0,0,0,.15)'; for (let y = 1044; y < PAVE; y += 44) g.fillRect(X0, y, R - X0, 4);
    g.fillStyle = C.stoneLL; g.fillRect(X0, 990, R - X0, 16);
    g.fillStyle = C.stoneD; g.fillRect(X0, 600, 14, PAVE - 600);
    for (const cx of [450, 690, 930]) sash(g, cx, 720, 124, 236);
    sash(g, 448, 1108, 124, 236);
    railings(g, X0, 500, PAVE); railings(g, 878, R, PAVE);
    // the garden square across the side street: a low stone wall under its own railings
    g.fillStyle = C.stoneL; g.fillRect(-M, 1446, X0 + M, PAVE - 1446); g.fillStyle = C.stoneLL; g.fillRect(-M, 1440, X0 + M, 12);
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let x = -60; x < X0; x += 74) g.fillRect(x, 1452, 3, PAVE - 1452);
    railings(g, -M, X0 - 2, 1442, 120);
    g.fillStyle = C.stone; g.fillRect(-M, PAVE, W + 2 * M, 1700 - PAVE);
    g.fillStyle = 'rgba(0,0,0,.2)'; for (const y of [1580, 1640]) g.fillRect(-M, y, W + 2 * M, 3);
    for (let r = 0; r < 3; r++) for (let x = -60 + r * 70; x < W + M; x += 210) g.fillRect(x, PAVE + r * 60 + (r ? 0 : 0), 3, 59);
    g.fillStyle = 'rgba(205,214,222,.16)'; for (const [x, y, w] of [[140, 1600, 160], [420, 1660, 120], [880, 1615, 150], [980, 1670, 90]]) { g.beginPath(); g.ellipse(x, y, w, 12, 0, 0, TAU); g.fill(); }
    const rf = (x, w, h, col) => { const gr = g.createLinearGradient(0, PAVE + 4, 0, PAVE + 4 + h); gr.addColorStop(0, col + '.34)'); gr.addColorStop(1, col + '0)'); g.fillStyle = gr; g.fillRect(x - w / 2, PAVE + 4, w, h); };
    rf(DOOR1.x, 150, 130, 'rgba(31,74,58,'); for (const sx of [-1, 1]) rf(DOOR1.x + sx * 142, 30, 150, 'rgba(228,225,215,');
    g.fillStyle = C.stoneLL; g.fillRect(-M, 1700, W + 2 * M, 16);
    g.fillStyle = '#56606d'; g.fillRect(-M, 1716, W + 2 * M, H + M - 1716);
    g.fillStyle = 'rgba(190,200,210,.14)'; for (const [x, y, w] of [[200, 1770, 300], [700, 1800, 260], [420, 1840, 380]]) g.fillRect(x - w / 2, y, w, 6);
  }, 14);
  /** the door's stone surround, in doorway units (origin at the doorway's bottom centre; the doorway is 200 x 360):
   *  the architrave, a Georgian fanlight, two painted columns, the entablature, three steps */
  const surround = () => hi('vt_surround', 540, 660, 270, 572, (g) => {
    g.fillStyle = C.cream; g.fillRect(-116, -376, 16, 376); g.fillRect(100, -376, 16, 376);
    g.beginPath(); g.arc(0, -376, 116, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = '#3e4c5a'; g.beginPath(); g.arc(0, -380, 98, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(210,220,230,.2)'; g.beginPath(); g.moveTo(0, -380); g.arc(0, -380, 98, Math.PI * 1.15, Math.PI * 1.45); g.closePath(); g.fill();
    g.strokeStyle = C.cream; g.lineWidth = 4; for (let k = 1; k < 8; k++) { const a = Math.PI + (k * Math.PI) / 8; g.beginPath(); g.moveTo(Math.cos(a) * 30, -380 + Math.sin(a) * 30); g.lineTo(Math.cos(a) * 98, -380 + Math.sin(a) * 98); g.stroke(); }
    g.beginPath(); g.arc(0, -380, 30, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(0, -380, 66, Math.PI, 0); g.stroke();
    g.fillStyle = C.cream; g.fillRect(-116, -386, 232, 10);
    for (const sx of [-1, 1]) { const cx = sx * 158; g.fillStyle = C.cream; g.fillRect(cx - 18, -474, 36, 452); g.fillRect(cx - 26, -24, 52, 24); g.fillRect(cx - 29, -488, 58, 16); g.fillStyle = C.creamD; g.fillRect(cx + 8, -472, 7, 448); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(cx - 12, -472, 3, 448); g.fillRect(cx - 2, -472, 3, 448); }
    g.fillStyle = C.cream; g.fillRect(-204, -526, 408, 40); g.fillStyle = C.creamD; g.fillRect(-204, -492, 408, 6); g.fillStyle = C.cream; g.fillRect(-218, -540, 436, 16);
    g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(-218, -526, 436, 4);
    [[-150, 0, 300], [-176, 22, 352], [-202, 44, 404]].forEach(([x0, y0, w], i) => { g.fillStyle = [C.stoneLL, '#959ba3', C.stoneL][i]; g.fillRect(x0, y0, w, 22); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x0, y0 + 16, w, 6); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x0, y0, w, 3); });
  }, 9);
  /** the brass plate: engraved, screwed at the corners, polished */
  const plate = () => hi('vt_plate', 180, 130, 90, 65, (g) => {
    g.fillStyle = C.brassD; g.beginPath(); g.roundRect(-78, -52, 156, 104, 7); g.fill();
    const gr = g.createLinearGradient(-70, -46, 70, 46); gr.addColorStop(0, C.brassL); gr.addColorStop(0.45, C.brass); gr.addColorStop(1, '#a8842e');
    g.fillStyle = gr; g.beginPath(); g.roundRect(-72, -46, 144, 92, 5); g.fill();
    g.textAlign = 'center'; fit(g, 'AI SECURITY', 'RobotoCondensed', 27, 124, '700 ');
    g.fillStyle = 'rgba(255,244,200,.55)'; g.fillText('AI SECURITY', 1, -5); g.fillText('INSTITUTE', 1, 27);
    g.fillStyle = C.brassDD; g.fillText('AI SECURITY', 0, -6); g.fillText('INSTITUTE', 0, 26);
    for (const [x, y] of [[-62, -36], [62, -36], [-62, 36], [62, 36]]) { g.fillStyle = C.brassD; g.beginPath(); g.arc(x, y, 4.5, 0, TAU); g.fill(); g.strokeStyle = C.brassDD; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 3, y - 2); g.lineTo(x + 3, y + 2); g.stroke(); }
  }, 5);
  /** the joke: a little hand-lettered card on a string loop; origin at the hook under the plate */
  const card = () => hi('vt_card', 240, 210, 120, 14, (g) => {
    g.strokeStyle = C.twineD; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-74, 50); g.lineTo(0, 0); g.lineTo(74, 50); g.stroke();
    g.fillStyle = '#f5f1e6'; g.beginPath(); g.roundRect(-100, 38, 200, 140, 5); g.fill();
    g.fillStyle = C.ink; for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * 74, 52, 4, 0, TAU); g.fill(); }
    g.textAlign = 'center'; g.fillStyle = C.green; fit(g, 'OPEN', 'Kalam-700', 70, 172); g.fillText('OPEN', 0, 124);
    g.strokeStyle = C.green; g.lineWidth = 3; g.beginPath(); g.moveTo(-62, 134); g.quadraticCurveTo(0, 126, 64, 136); g.stroke();
    g.fillStyle = C.pen; fit(g, 'BY INVITATION', 'Kalam-700', 27, 182); g.fillText('BY INVITATION', 0, 166);
    g.fillStyle = C.brassD; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
  }, 6);
  /** the hall seen through the open door, in doorway units: lamp-lit walls, a black-and-white tiled floor */
  function hall(c) {
    c.fillStyle = '#b8955a'; c.fillRect(-100, -360, 200, 360);
    c.fillStyle = '#e9d397'; c.fillRect(-54, -300, 108, 196);
    c.fillStyle = '#9c7c48'; c.beginPath(); c.moveTo(-100, -360); c.lineTo(100, -360); c.lineTo(54, -300); c.lineTo(-54, -300); c.closePath(); c.fill();
    const rows = 6, d = (j) => 1 / lerp(1, 1 / 0.54, j / rows);
    for (let j = 0; j < rows; j++) {
      const a = d(j), b = d(j + 1), ya = -104 * (1 - a) / 0.46, yb = -104 * (1 - b) / 0.46;
      for (let k = 0; k < 6; k++) { c.fillStyle = (j + k) % 2 ? '#1c1f22' : '#e8e3d3'; const xa0 = (-100 + (200 * k) / 6) * a, xa1 = (-100 + (200 * (k + 1)) / 6) * a, xb0 = (-100 + (200 * k) / 6) * b, xb1 = (-100 + (200 * (k + 1)) / 6) * b; c.beginPath(); c.moveTo(xa0, ya); c.lineTo(xa1, ya); c.lineTo(xb1, yb); c.lineTo(xb0, yb); c.closePath(); c.fill(); }
    }
    glow(c, 0, -230, 200, 'rgba(255,226,150,', 0.45);
  }
  /** the racing-green leaf: six fielded panels, brass knocker, letterbox and knob. open 0..1 swings it into the hall */
  function leaf(c, x, y, s, open) {
    const th = open * 1.42, co = Math.cos(th), si = Math.sin(th);
    const P = (u, v) => [x + (-100 + u * co) * s, y + ((v + 180) * (1 - 0.16 * si * u / 200) - 180) * s];
    const quad = (u0, v0, u1, v1) => { const a = P(u0, v0), b = P(u1, v0), d = P(u1, v1), e = P(u0, v1); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.closePath(); };
    c.save(); c.beginPath(); c.rect(x - 100 * s, y - 360 * s, 200 * s, 360 * s); c.clip();
    if (si > 0.02) { const a = P(200, -360), b = P(200, 0); c.fillStyle = C.greenD; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + 12 * s * si, a[1]); c.lineTo(b[0] + 12 * s * si, b[1]); c.lineTo(b[0], b[1]); c.closePath(); c.fill(); }
    c.fillStyle = C.green; quad(0, -360, 200, 0); c.fill();
    for (const [u0, v0, u1, v1] of [[22, -340, 90, -266], [110, -340, 178, -266], [22, -246, 90, -136], [110, -246, 178, -136], [22, -112, 90, -22], [110, -112, 178, -22]]) {
      c.fillStyle = C.greenD; quad(u0, v0, u1, v1); c.fill(); c.fillStyle = C.greenL; quad(u0 + 5, v0 + 5, u1 - 5, v1 - 5); c.fill(); c.fillStyle = C.green; quad(u0 + 11, v0 + 11, u1 - 8, v1 - 8); c.fill();
    }
    c.fillStyle = C.brass; quad(68, -128, 132, -116); c.fill(); c.fillStyle = C.brassDD; quad(74, -125, 126, -119); c.fill();
    const kn = P(100, -196), kk = P(100, -300); c.fillStyle = C.brass; c.beginPath(); c.ellipse(kn[0], kn[1], Math.max(2, 11 * s * co), 11 * s, 0, 0, TAU); c.fill();
    c.strokeStyle = C.brass; c.lineWidth = 5 * s; c.beginPath(); c.ellipse(kk[0], kk[1] + 10 * s, Math.max(2, 16 * s * co), 18 * s, 0, 0, TAU); c.stroke();
    c.fillStyle = 'rgba(255,240,190,.5)'; c.beginPath(); c.ellipse(kn[0] - 3 * s * co, kn[1] - 3 * s, Math.max(1, 4 * s * co), 4 * s, 0, 0, TAU); c.fill();
    c.fillStyle = `rgba(0,0,0,${0.4 * si})`; quad(0, -360, 200, 0); c.fill();
    c.restore();
  }
  /** the whole door, live: hall and whatever is inside (inner(c) in doorway units, clipped), the leaf at its swing,
   *  the surround, the plate, and the card if it hangs. (x, y) is the doorway's bottom centre, s its scale. */
  function door(c, x, y, s, open, { inner = null, cardRot = null, cardDrop = 0, glint = -1 } = {}) {
    if (open > 0.001) {
      c.save(); c.translate(x, y); c.scale(s, s); c.beginPath(); c.rect(-100, -360, 200, 360); c.clip(); hall(c); if (inner) inner(c); c.restore();
      glow(c, x, y + 30 * s, 240 * s * open, 'rgba(255,214,140,', 0.3 * open);
    }
    leaf(c, x, y, s, open);
    put2(c, surround(), x, y, { sc: s, lift: 0.8 });
    const px = x + 262 * s, py = y - 272 * s;
    put2(c, plate(), px, py, { sc: s, lift: 0.5 });
    if (glint >= 0 && glint <= 1) { c.save(); c.beginPath(); c.roundRect(px - 72 * s, py - 46 * s, 144 * s, 92 * s, 5 * s); c.clip(); c.globalCompositeOperation = 'lighter'; const gx = px + lerp(-130, 130, glint) * s, gr = c.createLinearGradient(gx - 30 * s, 0, gx + 30 * s, 0); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, 'rgba(255,240,200,.6)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = gr; c.fillRect(px - 80 * s, py - 50 * s, 160 * s, 100 * s); c.restore(); }
    if (cardRot !== null) put2(c, card(), px, py + 50 * s - cardDrop, { sc: s, rot: cardRot, lift: 1.2 });
  }

  // ---------------------------------------------------------------- the boxes, their tags and their strings
  /** a sealed parcel of kraft card: lid lip, tape, PRE-RELEASE stencilled on the front. Origin at the bottom centre */
  const parcel = () => hi('vt_parcel', 220, 200, 110, 180, (g) => {
    g.fillStyle = C.kraft; g.fillRect(-90, -140, 180, 140);
    g.fillStyle = C.kraftL; g.beginPath(); g.moveTo(-90, -140); g.lineTo(-74, -162); g.lineTo(74, -162); g.lineTo(90, -140); g.closePath(); g.fill();
    g.fillStyle = C.kraftD; g.fillRect(66, -140, 24, 140); g.beginPath(); g.moveTo(66, -140); g.lineTo(90, -140); g.lineTo(74, -162); g.lineTo(62, -162); g.closePath(); g.fill();
    g.fillStyle = C.tape; g.fillRect(-14, -162, 28, 22); g.fillRect(-14, -140, 28, 40); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(-14, -140, 28, 3);
    g.strokeStyle = C.ink; g.lineWidth = 3.5; g.strokeRect(-78, -94, 156, 80);
    g.fillStyle = C.ink; g.textAlign = 'center'; fit(g, 'RELEASE', 'ArchivoBlack-400', 32, 140); g.fillText('PRE-', 0, -60); g.fillText('RELEASE', 0, -24);
  }, 8);
  /** the hand-written tag: manila, clipped top corners, a reinforced hole. Origin at the hole */
  const ticket = () => hi('vt_ticket', 240, 170, 120, 26, (g) => {
    g.fillStyle = C.manila; g.beginPath(); g.moveTo(-108, 10); g.lineTo(-78, -16); g.lineTo(78, -16); g.lineTo(108, 10); g.lineTo(108, 128); g.lineTo(-108, 128); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(-108, 120, 216, 8);
    g.fillStyle = '#d6c48a'; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill(); g.fillStyle = '#5a4c34'; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill();
    g.fillStyle = C.pen; g.textAlign = 'center'; fit(g, 'INVITATION', 'Kalam-700', 38, 196); g.fillText('BY', -2, 58); g.fillText('INVITATION', 0, 106);
  }, 6);
  /** a string: a polyline of points, drawn as twine over its own thin shadow. wob > 0 makes it lie slack and wavy */
  function string(c, pts, { wob = 0, t = 0, w = 3 } = {}) {
    const path = () => {
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], L = Math.hypot(x1 - x0, y1 - y0), n = wob ? Math.max(2, Math.ceil(L / 24)) : 1, nx = -(y1 - y0) / (L || 1), ny = (x1 - x0) / (L || 1);
        for (let j = 1; j <= n; j++) { const u = j / n, o = wob ? Math.sin(u * Math.PI) * wob * (Math.sin(u * L * 0.035 + t * 2.2 + i) * 0.6 + 0.4) : 0; c.lineTo(lerp(x0, x1, u) + nx * o, lerp(y0, y1, u) + ny * o); }
      }
    };
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    c.translate(3, 4); c.strokeStyle = 'rgba(10,14,20,.35)'; c.lineWidth = w; path(); c.stroke(); c.translate(-3, -4);
    c.strokeStyle = C.twine; c.lineWidth = w; path(); c.stroke();
    c.restore();
  }

  // ---------------------------------------------------------------- the testers and their tea
  /** a tester: a generic person in a white lab coat and a Toko mask. Origin at the neck */
  const tester = (c, x, y, s, o = {}) => walker(c, x, y, s, { coat: C.lab, scarf: C.green, color: K.mag, led: false, ...o });
  /** a china cup on its saucer, its tea, and steam while it is hot */
  function cup(c, x, y, s, { heat = 1, t = 0, cold = 0, rot = 0, saucer = true } = {}) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    if (saucer) { c.fillStyle = 'rgba(16,22,30,.28)'; c.beginPath(); c.ellipse(8, 9, 50, 9, 0, 0, TAU); c.fill(); c.fillStyle = C.china; c.beginPath(); c.ellipse(0, 2, 48, 10, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(0,0,0,.08)'; c.beginPath(); c.ellipse(0, 4, 34, 6, 0, 0, TAU); c.fill(); }
    c.strokeStyle = C.china; c.lineWidth = 7; c.beginPath(); c.ellipse(36, -28, 12, 13, 0, -1.4, 1.7); c.stroke();
    c.fillStyle = C.china; c.beginPath(); c.moveTo(-34, -52); c.lineTo(34, -52); c.bezierCurveTo(33, -18, 22, -2, 0, -2); c.bezierCurveTo(-22, -2, -33, -18, -34, -52); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.1)'; c.beginPath(); c.moveTo(14, -52); c.lineTo(34, -52); c.bezierCurveTo(33, -18, 22, -2, 6, -2); c.closePath(); c.fill();
    c.fillStyle = C.green; c.fillRect(-33, -45, 66, 5);
    c.fillStyle = C.china; c.beginPath(); c.ellipse(0, -52, 35, 8, 0, 0, TAU); c.fill();
    c.fillStyle = mix(C.tea, C.teaCold, cold); c.beginPath(); c.ellipse(0, -51, 30, 6, 0, 0, TAU); c.fill();
    if (cold > 0.55) { c.strokeStyle = `rgba(206,190,160,${(cold - 0.55) * 1.6})`; c.lineWidth = 1.6; for (const [dx, r] of [[-8, 9], [7, 6], [0, 14]]) { c.beginPath(); c.ellipse(dx, -51, r, r * 0.22, 0, 0.3, 2.6); c.stroke(); } }
    c.restore();
    if (heat > 0.02) steam(c, x, y - 58 * s, s, heat, t);
  }
  function steam(c, x, y, s, a, t) {
    c.save(); c.strokeStyle = `rgba(246,246,240,${0.6 * a})`; c.lineWidth = 4.5 * s; c.lineCap = 'round';
    for (let k = -1; k <= 1; k++) { c.beginPath(); for (let j = 0; j <= 14; j++) { const u = j / 14, yy = y - u * 100 * s * (0.45 + 0.55 * a), xx = x + k * 13 * s + Math.sin(u * 6 + t * 3 + k * 2) * 8 * s * u; j ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
    c.restore();
  }

  // ---------------------------------------------------------------- the rooms
  /** the painted panelling of the Institute's room, its sash window on the left with green curtains */
  const WIN = { x0: 112, x1: 366, y0: 720, y1: 1230 };
  /** what the window sees: a pale morning, or night; the tower on the skyline */
  function paneView(g, night = 0) {
    const { x0, x1, y0, y1 } = WIN, gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, mix('#9aa3aa', '#111821', night)); gr.addColorStop(1, mix('#d2d1c7', '#283244', night));
    g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (night > 0.5) { g.fillStyle = `rgba(240,236,220,${(night - 0.5) * 1.6})`; g.beginPath(); g.arc(178, 800, 16, 0, TAU); g.fill(); }
    tower(g, 296, 1190, 0.4, mix('#7c8590', '#161c25', night), mix('#8a929c', '#1d242d', night), mix('#e7e2cf', '#f3d88a', night));
    g.fillStyle = mix('#7a838e', '#10151c', night); g.fillRect(x0, 1130, x1 - x0, 100);
    for (const [x, w, h] of [[124, 60, 30], [196, 46, 50], [250, 70, 24]]) g.fillRect(x, 1130 - h, w, h);
    if (night > 0.5) { g.fillStyle = `rgba(243,210,130,${(night - 0.5) * 1.6})`; for (const [x, y] of [[140, 1150], [210, 1170], [320, 1150], [262, 1190]]) g.fillRect(x, y, 10, 14); }
  }
  function sashBars(g) {
    const { x0, x1, y0, y1 } = WIN; g.fillStyle = '#d6d3c9';
    for (const k of [1, 2]) g.fillRect(x0 + ((x1 - x0) * k) / 3 - 3, y0, 6, y1 - y0);
    g.fillRect(x0, (y0 + y1) / 2 - 8, x1 - x0, 16); for (const k of [0.25, 0.75]) g.fillRect(x0, y0 + (y1 - y0) * k - 3, x1 - x0, 6);
  }
  function panel(g, x, y, w, h) { g.fillStyle = '#323e4d'; g.fillRect(x, y, w, h); g.fillStyle = '#46546a'; g.fillRect(x + 6, y + 6, w - 12, h - 12); g.fillStyle = '#3c4859'; g.fillRect(x + 14, y + 14, w - 22, h - 22); }
  const room = () => sheet('vt_room', (g) => {
    g.fillStyle = '#3a4656'; g.fillRect(-M, -M, W + 2 * M, H + 2 * M);
    g.fillStyle = '#4b586a'; g.fillRect(-M, 560, W + 2 * M, 22); g.fillStyle = '#2a3442'; g.fillRect(-M, 582, W + 2 * M, 6);
    for (let x = 452; x < W + M; x += 214) panel(g, x, 640, 176, 560);
    g.fillStyle = '#4b586a'; g.fillRect(-M, 1236, W + 2 * M, 14);
    for (let x = -40; x < W + M; x += 214) panel(g, x, 1276, 176, 280);
    g.fillStyle = '#26303c'; g.fillRect(-M, 1560, W + 2 * M, 40);
    g.fillStyle = '#2b241e'; g.fillRect(-M, 1600, W + 2 * M, H + M - 1600); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 1640; y < H + M; y += 48) g.fillRect(-M, y, W + 2 * M, 3);
    const { x0, x1, y0, y1 } = WIN;
    g.fillStyle = '#d6d3c9'; g.fillRect(x0 - 16, y0 - 16, x1 - x0 + 32, y1 - y0 + 32);
    paneView(g, 0); sashBars(g);
    g.fillStyle = '#c4c1b6'; g.fillRect(x0 - 26, y1 + 14, x1 - x0 + 52, 16);
    for (const [cx, w] of [[96, 64], [382, 64]]) { g.fillStyle = C.green; g.fillRect(cx - w / 2, 650, w, 680); g.fillStyle = C.greenD; for (let k = 0; k < 4; k++) g.fillRect(cx - w / 2 + 6 + k * 16, 650, 5, 680); g.fillStyle = C.brass; g.fillRect(cx - w / 2 - 4, 1120, w + 8, 10); }
    g.fillStyle = C.greenD; g.fillRect(52, 628, 380, 46); g.fillStyle = C.brass; g.fillRect(52, 668, 380, 6);
  }, 14);
  /** the long table: green leather top with a tooled brass line, a dark wooden apron and legs */
  const TOP = 1318;
  const table = () => sheet('vt_table', (g) => {
    g.fillStyle = '#3d2c20'; g.fillRect(-M, 1284, W + 2 * M, 10);
    g.fillStyle = '#2f4b3e'; g.fillRect(-M, 1292, W + 2 * M, 32); g.fillStyle = C.brassD; g.fillRect(-M, 1296, W + 2 * M, 2);
    g.fillStyle = '#4a3526'; g.fillRect(-M, 1324, W + 2 * M, 16); g.fillStyle = '#3a2a1e'; g.fillRect(-M, 1340, W + 2 * M, 88);
    g.fillStyle = 'rgba(255,230,190,.07)'; g.fillRect(-M, 1340, W + 2 * M, 4); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-M, 1420, W + 2 * M, 8);
    for (const x of [110, 970]) { g.fillStyle = '#33251a'; g.fillRect(x - 20, 1428, 40, 280); g.fillStyle = '#4a3526'; for (const y of [1460, 1560, 1660]) { g.beginPath(); g.ellipse(x, y, 26, 12, 0, 0, TAU); g.fill(); } }
  }, 12);
  /** a tear-off pad on a green backing board, brass binding, hung from a nail. Origin at the nail */
  const calBoard = () => sprite('vt_calboard', 480, 640, 240, 20, (g) => {
    g.fillStyle = C.greenD; g.beginPath(); g.roundRect(-220, 10, 440, 600, 10); g.fill(); g.fillStyle = C.green; g.beginPath(); g.roundRect(-212, 18, 424, 584, 8); g.fill();
    g.fillStyle = C.brass; g.fillRect(-200, 34, 400, 16); g.fillStyle = C.brassD; g.fillRect(-200, 46, 400, 4);
    g.strokeStyle = C.twineD; g.lineWidth = 3; g.beginPath(); g.moveTo(-120, 14); g.lineTo(0, -6); g.lineTo(120, 14); g.stroke();
    g.fillStyle = '#8a8f96'; g.beginPath(); g.arc(0, -6, 8, 0, TAU); g.fill();
  }, 10);
  /** a day's page: DAY over the number; the last, 17, in the telephone's red. Origin at the top centre */
  const calPage = (d) => sprite('vt_calpage_' + d, 420, 500, 210, 0, (g) => {
    g.fillStyle = '#f3f0e7'; g.fillRect(-196, 0, 392, 470);
    g.fillStyle = 'rgba(22,27,33,.3)'; for (let x = -186; x < 186; x += 22) g.fillRect(x, 6, 11, 6);
    g.fillStyle = C.stone; g.textAlign = 'center'; g.font = '44px "ArchivoBlack-400"'; g.fillText('DAY', 0, 84);
    g.fillStyle = d === 17 ? C.red : C.ink; fit(g, String(d), 'Anton-400', 300, 340); g.fillText(String(d), 0, 420);
  }, 8);

  // ---------------------------------------------------------------- the paper ocean, the far shore, the near shore
  const SHORE = 842, QUAY = 1606, NEAR = { x: 640, y: 1556, s: 0.75 }, REELS = [[168, 856], [346, 856]], Q = [318, 1614], FOOT = 600;
  /** the far shore: a strip of land with a pale beach at the waterline */
  const farLand = () => sheet('vt_farland', (g) => {
    g.fillStyle = '#7c897f'; g.beginPath(); g.moveTo(-M, 806); for (let x = -M; x <= W + M; x += 40) g.lineTo(x, 802 + Math.sin(x * 0.02) * 4); g.lineTo(W + M, 856); for (let x = W + M; x >= -M; x -= 30) g.lineTo(x, 852 + Math.sin(x * 0.05) * 4); g.closePath(); g.fill();
    g.fillStyle = '#b5b29d'; g.beginPath(); g.moveTo(-M, 842); for (let x = -M; x <= W + M; x += 30) g.lineTo(x, 840 + Math.sin(x * 0.05) * 4); g.lineTo(W + M, 858); g.lineTo(-M, 858); g.closePath(); g.fill();
    g.fillStyle = '#6b786e'; for (const [x, r] of [[30, 24], [600, 18], [1040, 26]]) { g.beginPath(); g.arc(x, 806, r, Math.PI, 0); g.fill(); }
  }, 6);
  /** the White House from the south, in a pale silhouette: wings, the bowed portico's columns, the flag */
  const whiteHouse = () => sprite('vt_wh', 380, 210, 190, 196, (g) => {
    const P0 = '#dcdfde', P1 = '#c3c8ca', P2 = '#9aa2a8';
    g.fillStyle = P0; g.fillRect(-168, -84, 336, 84); g.fillRect(-62, -104, 124, 104);
    g.fillStyle = P1; g.fillRect(-172, -92, 344, 10); g.fillRect(-66, -112, 132, 10);
    g.fillStyle = P1; for (let x = -164; x < 166; x += 9) g.fillRect(x, -100, 4, 8);
    g.fillStyle = P2; for (const y of [-66, -34]) for (let x = -156; x < 160; x += 22) if (Math.abs(x) > 60) g.fillRect(x, y, 9, 16);
    g.fillStyle = P0; g.beginPath(); g.ellipse(0, -108, 54, 12, 0, 0, TAU); g.fill(); g.fillRect(-54, -108, 108, 108);
    g.fillStyle = '#6e7880'; g.fillRect(-46, -96, 92, 88);
    g.fillStyle = P0; for (let k = -3; k <= 3; k++) g.fillRect(k * 15 - 3.5, -98, 7, 92);
    g.fillStyle = P1; g.fillRect(-56, -60, 112, 6); g.fillRect(-58, -10, 116, 10);
    g.fillStyle = P1; for (const x of [-120, 120]) g.fillRect(x - 6, -112, 12, 22);
    g.fillStyle = '#5c6670'; g.fillRect(-1.5, -168, 3, 58);
    g.fillStyle = '#e2e4e2'; g.fillRect(1.5, -168, 30, 18); g.fillStyle = '#9c5560'; for (let k = 0; k < 3; k++) g.fillRect(1.5, -165 + k * 6, 30, 2.6); g.fillStyle = '#4a5a78'; g.fillRect(1.5, -168, 12, 9);
  }, 6);
  /** the Washington Monument: an obelisk, its pyramidion, the change of stone a third of the way up */
  const monument = () => sprite('vt_monument', 70, 380, 35, 370, (g) => {
    g.fillStyle = '#d4d5cf'; g.beginPath(); g.moveTo(-16, 0); g.lineTo(-11, -316); g.lineTo(0, -342); g.lineTo(11, -316); g.lineTo(16, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -342); g.lineTo(11, -316); g.lineTo(16, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(120,100,70,.08)'; g.fillRect(-16, -340, 32, 190);
  }, 6);
  /** a lab: a generic glass block on the far shore — no name, no logo (no company is singled out) */
  const lab = (k) => sprite('vt_lab' + k, 200, 190, 100, 176, (g) => {
    const w = k ? 132 : 152, h = k ? 108 : 132;
    g.fillStyle = k ? '#56687b' : '#4a5c6f'; g.fillRect(-w / 2, -h, w, h);
    g.fillStyle = '#a3b5c4'; for (let y = -h + 14; y < -12; y += 17) g.fillRect(-w / 2 + 8, y, w - 16, 7);
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = -w / 2 + 24; x < w / 2 - 8; x += 26) g.fillRect(x, -h + 10, 3, h - 20);
    g.fillStyle = '#3b4a59'; g.fillRect(-w / 2 - 4, -h - 8, w + 8, 10);
    if (k) { g.fillStyle = '#3b4a59'; for (let x = -w / 2; x < w / 2 - 10; x += 32) { g.beginPath(); g.moveTo(x, -h - 8); g.lineTo(x + 32, -h - 30); g.lineTo(x + 32, -h - 8); g.closePath(); g.fill(); } }
    else { g.fillStyle = '#3b4a59'; g.fillRect(-30, -h - 30, 40, 24); g.fillRect(36, -h - 52, 4, 46); g.beginPath(); g.ellipse(38, -h - 54, 16, 9, -0.5, 0, Math.PI); g.fill(); }
  }, 7);
  /** a reel on an A-frame, its spokes and crank turned by ang */
  function reel(c, x, y, s, ang) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.strokeStyle = '#4a3a2c'; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(-20, 24); c.lineTo(0, 0); c.lineTo(20, 24); c.stroke();
    c.fillStyle = '#6b5440'; c.beginPath(); c.arc(0, 0, 19, 0, TAU); c.fill(); c.fillStyle = C.twine; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.fill();
    c.strokeStyle = '#3a2c20'; c.lineWidth = 3; for (let k = 0; k < 4; k++) { const a = ang + (k * Math.PI) / 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 18, Math.sin(a) * 18); c.stroke(); }
    c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(-ang) * 28, Math.sin(-ang) * 28); c.stroke(); c.fillStyle = '#3a2c20'; c.beginPath(); c.arc(Math.cos(-ang) * 28, Math.sin(-ang) * 28, 5, 0, TAU); c.fill();
    c.restore();
  }
  /** the red telephone: a dial set with its handset on the cradle */
  const phoneBody = () => sprite('vt_phone', 240, 160, 120, 150, (g) => {
    g.fillStyle = C.red; g.beginPath(); g.moveTo(-98, 0); g.lineTo(-76, -78); g.quadraticCurveTo(-72, -94, -52, -94); g.lineTo(52, -94); g.quadraticCurveTo(72, -94, 76, -78); g.lineTo(98, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(-86, -8); g.lineTo(-68, -76); g.lineTo(-56, -76); g.lineTo(-72, -8); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(50, -88); g.lineTo(70, -80); g.lineTo(90, -6); g.lineTo(64, -6); g.closePath(); g.fill();
    g.fillStyle = C.redD; g.fillRect(-100, -8, 200, 8);
    g.fillStyle = C.red; for (const sx of [-1, 1]) { g.beginPath(); g.roundRect(sx * 54 - 11, -112, 22, 24, 7); g.fill(); }
    g.fillStyle = '#efe9da'; g.beginPath(); g.arc(0, -46, 31, 0, TAU); g.fill();
    g.fillStyle = '#3d0c16'; for (let k = 0; k < 10; k++) { const a = -Math.PI * 0.2 + k * 0.53; g.beginPath(); g.arc(Math.cos(a) * 21, -46 + Math.sin(a) * 21, 5, 0, TAU); g.fill(); }
    g.fillStyle = C.red; g.beginPath(); g.arc(0, -46, 11, 0, TAU); g.fill();
  }, 7);
  const handset = () => sprite('vt_handset', 260, 90, 130, 44, (g) => {
    g.fillStyle = C.red; g.beginPath(); g.roundRect(-82, -14, 164, 22, 11); g.fill();
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 88, 4, 27, 18, 0, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(-70, -11, 140, 4); g.fillStyle = 'rgba(0,0,0,.2)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 88, 14, 22, 6, 0, 0, Math.PI); g.fill(); }
  }, 6);
  /** the phone, live: ring 0..1 shakes it, hops the handset and throws red ring-lines out of it */
  function phone(c, x, y, s, ring, t) {
    const j = ring > 0.01 ? Math.sin(t * 95) * ring : 0, hop = ring > 0.01 ? Math.abs(Math.sin(t * 60)) * 10 * ring : 0;
    put(c, phoneBody(), x + j * 4 * s, y, { sc: s, rot: j * 0.04, lift: 0.6 });
    put(c, handset(), x + j * 6 * s, y - (106 + hop) * s, { sc: s, rot: -j * 0.07, lift: 0.8 + hop * 0.05 });
    if (ring > 0.05) {
      c.save(); c.strokeStyle = C.red; c.lineCap = 'round'; c.globalAlpha = Math.min(1, ring * 1.4);
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const r = (118 + k * 26 + ((t * 120) % 26)) * s; c.lineWidth = (8 - k * 1.5) * s; c.beginPath(); c.arc(x, y - 70 * s, r, sx > 0 ? -0.45 : Math.PI - 0.45, sx > 0 ? 0.45 : Math.PI + 0.45); c.stroke(); }
      c.restore();
    }
  }
  /** the telephone's cord: a coil from the White House to the phone */
  function cord(c, x0, y0, x1, y1, t, jig = 0) {
    c.save(); c.strokeStyle = C.redD; c.lineWidth = 3; c.beginPath();
    const n = 46; for (let i = 0; i <= n; i++) { const u = i / n, x = lerp(x0, x1, u), y = lerp(y0, y1, u) + Math.sin(u * Math.PI) * 18 + Math.sin(u * 60) * 5 + Math.sin(u * 9 + t * 40) * jig * 3; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.restore();
  }
  /** the paper ocean: rows of scalloped card from the far shore to the quay, each with a foam edge */
  const WROWS = 9;
  const rowY = (k) => SHORE + 10 + (QUAY - SHORE - 6) * Math.pow((k + 1) / WROWS, 1.55);
  const rowR = (k) => 7 + 46 * Math.pow((k + 1) / WROWS, 1.5);
  const wave = (k) => {
    const r = rowR(k), f = (k + 1) / WROWS, w = W + 2 * M + 6 * r;
    return sprite('vt_wave_' + k, w, Math.ceil(r * 3.8), 0, Math.ceil(r * 1.2), (g) => {
      g.fillStyle = mix(k % 2 ? '#8b9cab' : '#7d8fa0', k % 2 ? '#4a6278' : '#3b5166', f); g.beginPath(); g.moveTo(0, 0);
      for (let x = 0; x < w; x += 2 * r) g.arc(x + r, 0, r, Math.PI, 0);
      g.lineTo(w, r * 2.5); g.lineTo(0, r * 2.5); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(232,236,236,.85)'; g.lineWidth = 2 + 3 * f; g.beginPath(); for (let x = 0; x < w; x += 2 * r) { g.moveTo(x + r * 0.15, -r * 0.5); g.arc(x + r, 0, r, Math.PI * 1.17, Math.PI * 1.75); } g.stroke();
    }, 3 + 6 * f);
  };
  /** the near shore: a stone quay with its coping */
  const quay = () => sheet('vt_quay', (g) => {
    g.fillStyle = C.stoneLL; g.fillRect(-M, QUAY, W + 2 * M, 24); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(-M, QUAY + 24, W + 2 * M, 5);
    g.fillStyle = 'rgba(0,0,0,.14)'; for (let x = -60; x < W + M; x += 120) g.fillRect(x, QUAY, 3, 24);
    g.fillStyle = C.stone; g.fillRect(-M, QUAY + 29, W + 2 * M, H + M - QUAY - 29);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (const y of [1700, 1790]) g.fillRect(-M, y, W + 2 * M, 3); for (let r = 0; r < 3; r++) for (let x = -40 + r * 80; x < W + M; x += 240) g.fillRect(x, QUAY + 29 + r * 90, 3, 88);
    g.fillStyle = 'rgba(205,214,222,.14)'; for (const [x, y, w] of [[200, 1680, 150], [820, 1730, 170], [480, 1810, 200]]) { g.beginPath(); g.ellipse(x, y, w, 12, 0, 0, TAU); g.fill(); }
  }, 12);
  /** the Institute's front as a cut-out flat on the quay, in doorway units: rusticated stone, a sash window, railings */
  const flat = () => hi('vt_flat', 840, 720, 410, 640, (g) => {
    g.fillStyle = C.stone; g.beginPath(); g.moveTo(-392, 66); g.lineTo(-394, -574); g.lineTo(-366, -604); g.lineTo(384, -604); g.lineTo(404, -578); g.lineTo(406, 66); g.closePath(); g.fill();
    g.fillStyle = C.stoneLL; g.fillRect(-394, -604, 800, 24); g.fillStyle = C.stoneL; g.fillRect(-394, -580, 800, 14);
    g.fillStyle = 'rgba(0,0,0,.15)'; for (let y = -520; y < 60; y += 44) g.fillRect(-392, y, 798, 4);
    g.fillStyle = C.stoneD; g.fillRect(-394, -580, 12, 646);
    sash(g, -282, -430, 124, 236);
    railings(g, -392, -206, 66, 140); railings(g, 206, 406, 66, 140);
  }, 10);
  /** the clock tower again, small, on the London side of the water */
  const towerS = () => sprite('vt_tower_s', 160, 560, 80, 540, (g) => tower(g, 0, 0, 0.47, '#5d6773', '#6c7682', '#e2ddca'), 8);
  /** a box's place on its journey: the stack in the doorway, out over the steps to the quay's edge (u 0..0.3),
   *  then across the water to its lab's reel (0.3..1), shrinking into the distance */
  const STACK = [[8, -84], [50, 0], [-34, 0]], SB = 0.52, SQ = 0.5;
  function boxAt(i, u) {
    const [dx, dy] = STACK[i], sx = NEAR.x + dx * NEAR.s, sy = NEAR.y + dy * NEAR.s, s0 = SB * NEAR.s;
    if (u <= 0) return { x: sx, y: sy, s: s0, water: false };
    if (u < 0.3) { const k = u / 0.3, k1 = clamp(k / 0.45, 0, 1), k2 = clamp((k - 0.45) / 0.55, 0, 1);
      if (k < 0.45) return { x: lerp(sx, FOOT, k1), y: lerp(sy, QUAY + 4, k1) - Math.sin(k1 * Math.PI) * 50, s: lerp(s0, SQ, k1), water: false, rot: -0.3 * Math.sin(k1 * Math.PI) };
      return { x: lerp(FOOT, Q[0], k2), y: QUAY + 4 + Math.sin(k2 * Math.PI) * 4, s: SQ, water: false, rot: 0.04 * Math.sin(k2 * 12) }; }
    const k = (u - 0.3) / 0.7, [rx, ry] = REELS[i], y = lerp(Q[1], ry + 6, k), d = clamp((y - SHORE) / (QUAY - SHORE), 0, 1);
    return { x: lerp(Q[0], rx + (i ? 40 : 42), Math.pow(k, 0.8)), y, s: 0.25 + (SQ - 0.25) * Math.pow(d, 1.1), water: true, rot: 0 };
  }
  /** the whole shore set (shots 3 and 6). st = { cx, cy, z, ring, reel: [uA, uB] (-1 stacked), spin, open, taut: [a, b],
   *  cardRot, cardDrop, jolt }. Everything is drawn in world coordinates under the camera. */
  function shore(c, lt, st) {
    const cam = { x: Math.sin(lt * 0.45) * 8, y: 0, z: 1 }, px = (d) => -cam.x * d;
    c.save(); camera(c, st.cx, st.cy, st.z);
    stack(c, [
      { sh: sky('sea', SHORE), d: 0.02, lift: 0 },
      { sh: clouds('sea', SKYROWS), d: 0.035, lift: 0.4 },
      { fn: (g, ox) => glow(g, 820 + ox, 640, 300, 'rgba(255,244,214,', 0.22), d: 0.03 },
      { sh: farLand(), d: 0.06, lift: 0.3 },
    ], cam);
    const fx = px(0.06);
    put(c, monument(), 958 + fx, 826, { sc: 1.12, lift: 0.4 });
    put(c, whiteHouse(), 812 + fx, 846, { sc: 1.1, lift: 0.5 });
    put(c, lab(0), 166 + fx, 840, { sc: 1.18, lift: 0.5 }); put(c, lab(1), 346 + fx, 842, { sc: 1.18, lift: 0.5 });
    cord(c, 664 + fx, 838, 598 + fx, 842, lt, st.ring);
    phone(c, 512 + fx, 850, 1.0, st.ring, lt);
    REELS.forEach(([x, y], i) => reel(c, x + fx, y, 1.3, st.spin * (i ? 1.1 : 1)));
    // the sea, far to near, the travelling boxes slotted between the rows that hide their bottoms
    const g0 = c.createLinearGradient(0, SHORE, 0, QUAY); g0.addColorStop(0, '#8496a5'); g0.addColorStop(1, '#3d5368'); c.fillStyle = g0; c.fillRect(-M, SHORE + 6, W + 2 * M, QUAY - SHORE);
    const boxes = [0, 1].map((i) => ({ i, ...boxAt(i, st.reel[i]) })).filter((b) => b.water);
    // a box that has reached the far shore sits on the beach, in front of the first row of waves
    const boxPut = (b) => { const bob = b.y < rowY(0) ? 0 : Math.sin(lt * 5 + b.i * 2) * 3 * b.s / SQ; put2(c, parcel(), b.x + px(lerp(0.06, 0.2, (b.y - SHORE) / (QUAY - SHORE))), b.y + bob, { sc: b.s, rot: b.y < rowY(0) ? 0 : Math.sin(lt * 4 + b.i) * 0.06, lift: b.s }); };
    for (const b of boxes) if (b.y < rowY(0)) boxPut(b);
    for (let k = 0; k < WROWS; k++) {
      const f = (k + 1) / WROWS, r = rowR(k), y = rowY(k), d = 0.06 + 0.14 * f;
      put(c, wave(k), -M - 3 * r + Math.sin(lt * 0.8 + k * 1.3) * (4 + 14 * f) + px(d) - ((lt * (6 + 18 * f)) % (2 * r)), y + Math.sin(lt * 1.2 + k) * (1 + 4 * f), { lift: 0.25 + 0.5 * f, alpha: 0.35 });
      const next = k + 1 < WROWS ? rowY(k + 1) : QUAY + 99;
      for (const b of boxes) if (b.y >= y && b.y < next) boxPut(b);
    }
    const nx = px(0.2);
    put(c, towerS(), 992 + px(0.16), QUAY + 2, { lift: 0.7 });
    stack(c, [{ sh: quay(), d: 0.2, lift: 0.6 }], cam);
    put2(c, flat(), NEAR.x + nx, NEAR.y, { sc: NEAR.s, lift: 0.9 });
    // the stack in the doorway: whichever boxes have not been pulled out yet
    const inner = (g) => { for (const i of [2, 1, 0]) if (st.reel[i] === undefined || st.reel[i] <= 0) { const [dx, dy] = STACK[i]; put2(g, parcel(), dx + (st.jolt || 0) * (i < 2 ? -6 : 0), dy, { sc: SB, lift: 0.4 }); } };
    door(c, NEAR.x + nx, NEAR.y, NEAR.s, st.open, { inner, cardRot: st.cardRot, cardDrop: st.cardDrop || 0, glint: st.glint ?? -1 });
    // the boxes on their way out over the steps and the quay
    for (const i of [0, 1]) { const b = boxAt(i, st.reel[i]); if (st.reel[i] > 0 && !b.water) put2(c, parcel(), b.x + nx, b.y, { sc: b.s, rot: b.rot || 0, lift: 1 }); }
    // the strings: out of the door, down the steps, along the quay; two cross the water to the reels, one runs off along the quay
    const thr = (i) => [NEAR.x + nx - 20 + i * 14, NEAR.y + 2], foot = [FOOT - 20 + nx, QUAY + 4];
    for (const i of [0, 1, 2]) {
      const u = i < 2 ? st.reel[i] : -1, b = boxAt(i, u), att = st.open > 0.3 && u <= 0 ? [b.x + nx - 30 * b.s, b.y - 40 * b.s] : null;
      const start = u > 0 ? [b.x + nx - 60 * b.s + (b.water ? px(lerp(0.06, 0.2, (b.y - SHORE) / (QUAY - SHORE))) - nx : 0), b.y - 30 * b.s] : null;
      if (i === 2) { string(c, [...(att ? [att] : []), thr(i), foot, [Q[0] + nx, QUAY + 10], [-M, QUAY + 30]], { wob: 2, t: lt }); continue; }
      const R = [REELS[i][0] + fx, REELS[i][1]], taut = st.taut[i];
      if (u > 0 && b.water) string(c, [start, R], { w: 3.2 });
      else if (u > 0) string(c, [start, [Q[0] + nx, Q[1]], R], { w: 3.2 });
      else if (taut) string(c, [...(att ? [att] : []), thr(i), foot, [Q[0] + nx, Q[1]], R], { w: 3.2 });
      else { string(c, [...(att ? [att] : []), thr(i), foot, [Q[0] + nx, Q[1]]], { wob: 2, t: lt }); string(c, [[Q[0] + nx, Q[1]], R], { wob: 7, t: lt + i }); }
    }
    c.restore();
  }

  // ---------------------------------------------------------------- the street shots (1 and 5)
  /** the boxes arrive on their strings from off the left, the door opens, a tester takes them in. back = shot 5:
   *  the same choreography and the same cab, with two boxes, both wearing their BY INVITATION tags */
  const X_STOP = [535, 690, 845], T_OPEN = 2.25, T_HOP = 2.85, HOP_GAP = 0.6, BOX_S = 0.8;
  function streetShot(c, lt, back, tagText) {
    const n = back ? 2 : 3, cam = { x: Math.sin(lt * 0.5) * 9, y: 0, z: RFP.move(lt, 0, 6.4, 1.0, 1.05), fx: DOOR1.x, fy: 1320 };
    const open = eo((lt - T_OPEN) / 0.45);
    const boxes = [];
    for (let i = 0; i < n; i++) {
      const t0 = 0.5 + i * 0.32, k = clamp((lt - t0) / 1.3, 0, 1), kh = clamp((lt - (T_HOP + i * HOP_GAP)) / 0.42, 0, 1), ki = clamp((lt - (T_HOP + i * HOP_GAP + 0.42)) / 0.55, 0, 1);
      const settle = k >= 1 ? Math.sin((lt - t0 - 1.3) * 14) * Math.exp(-(lt - t0 - 1.3) * 5) * 0.08 : 0;
      let x = lerp(-260 - i * 40, X_STOP[i], eo(k)), y = 1652, s = BOX_S, rot = settle + (k < 1 ? Math.sin(lt * 18 + i) * 0.03 * k : 0), phase = 'out';
      if (kh > 0) { x = lerp(X_STOP[i], DOOR1.x + 14, io(kh)); y = lerp(1652, DOOR1.y + 4, io(kh)) - Math.sin(kh * Math.PI) * 90; rot = -0.25 * Math.sin(kh * Math.PI); }
      if (ki > 0) phase = 'in';
      boxes.push({ i, x, y, s, rot, phase, ki, k });
    }
    const layers = [
      { sh: sky('street', 1250), d: 0.02, lift: 0 },
      { sh: clouds('street', SKYROWS), d: 0.035, lift: 0.4 },
      { fn: (g, ox) => glow(g, 300 + ox, 760, 260, 'rgba(255,244,214,', 0.2), d: 0.03 },
      { sh: westminster(), d: 0.06, lift: 0.4, soft: 1 },
      { fn: (g, ox) => put(g, plane(), 210 + ox, 1530, { lift: 0.7 }), d: 0.1 },
      { sh: street(), d: 0.14, lift: 0.8 },
      { fn: (g, ox) => {
        // a box going in passes in front of the tester at the threshold and behind them once it is deeper in
        const inBox = (h, b) => { const sc = lerp(BOX_S / DOOR1.s, 0.38, b.ki), bx = lerp(14, -10, b.ki), by = lerp(0, -100, b.ki); h.save(); h.globalAlpha = 1 - clamp((b.ki - 0.75) / 0.25, 0, 1); put2(h, parcel(), bx, by, { sc, lift: 0.4 }); if (back) put2(h, ticket(), bx, by - 130 * sc, { sc: sc * 0.72, rot: 0.04, lift: 0.4 }); h.restore(); };
        const inner = (h) => {
          for (const b of boxes) if (b.phase === 'in' && b.ki >= 0.35 && b.ki < 1) inBox(h, b);
          if (open > 0.05) tester(h, 40, -232, 0.45, { t: lt, look: Math.sin(lt * 1.3) * 0.25 - (boxes.some((b) => b.phase === 'in' && b.ki < 1) ? 0.4 : 0), tilt: Math.sin(lt * 2) * 0.03, lift: 0.5 });
          for (const b of boxes) if (b.phase === 'in' && b.ki < 0.35) inBox(h, b);
        };
        door(g, DOOR1.x + ox, DOOR1.y, DOOR1.s, open, { inner, glint: (lt - 5.0) / 0.6 });
      }, d: 0.14 },
      { fn: (g, ox) => { put(g, lamp(), 112 + ox, 1700, { lift: 0.9 }); put(g, pillar(), 268 + ox, 1662, { sc: 0.86, lift: 1 }); }, d: 0.18 },
      { fn: (g, ox) => {
        // the strings first, so the boxes sit over them; then the boxes still outside
        for (const b of boxes) {
          const off = [-M - 40, 1640 + b.i * 9];
          if (b.phase === 'in') string(g, [[DOOR1.x + ox - 30 + b.i * 12, DOOR1.y + 6], [DOOR1.x + ox - 120, PAVE + 6], [DOOR1.x + ox - 200, 1630 + b.i * 6], off], { wob: 2, t: lt + b.i });
          else string(g, [[b.x + ox - 62 * b.s, b.y - 34 * b.s], off], { wob: b.k < 1 ? 1 : 3, t: lt + b.i });
        }
        for (const b of boxes) if (b.phase === 'out') {
          put2(g, parcel(), b.x + ox, b.y, { sc: b.s, rot: b.rot, lift: 1 });
          if (back) { const sw = Math.sin(lt * 3 + b.i) * 0.08 + (b.k < 1 ? 0.14 * Math.sin(lt * 9) : 0) + b.rot; put2(g, ticket(), b.x + ox, b.y - 130 * b.s, { sc: b.s * 0.72, rot: sw, lift: 1.2 }); }
        }
      }, d: 0.2 },
      { fn: (g, ox) => { const kt = clamp((lt - 0.15) / 1.85, 0, 1); if (kt <= 0 || kt >= 1) return; const x = lerp(-320, 1440, io(kt)) + ox; g.fillStyle = 'rgba(10,12,16,.35)'; g.beginPath(); g.ellipse(x, 1858, 190, 10, 0, 0, TAU); g.fill(); put(g, cab(), x, 1852, { sc: 0.95, lift: 1.2 }); g.save(); g.globalCompositeOperation = 'lighter'; glow(g, x, 1661, 40, 'rgba(255,200,90,', 0.5); g.restore(); }, d: 0.3 },
    ];
    stack(c, layers, cam);
    tag(c, tagText, lt, DUR);
    frame(c);
  }

  return { C, B, DUR, mix, io, eo, hi, put2, fit, camera, frame, tag, sky, clouds, SKYROWS, tower, westminster, plane, lamp, pillar, cab, sash, railings, street, DOOR1, surround, plate, card, hall, leaf, door, parcel, ticket, string, tester, cup, steam, WIN, paneView, sashBars, room, TOP, table, calBoard, calPage, SHORE, QUAY, NEAR, REELS, shore, boxAt, streetShot };
})();
