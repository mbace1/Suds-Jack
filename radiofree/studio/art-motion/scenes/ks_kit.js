// "Kill Switch" — the SAFETY-LEAFLET look (style test, 17.10.2026). A new look for Radio Free Helsinki next to the
// papercut box: an appliance's folded instruction leaflet lying on a dark worktop, seen from above. Flat black line
// drawings of one weight, flat grey fills, ISO-style pictograms (yellow warning triangles, red prohibition rings, blue
// mandatory discs), numbered callouts, multilingual text as grey bars, certification marks in the footer.
// The argument is the layout: the toaster's leaflet is FULL; the AI model's identical leaflet is EMPTY.
// Test stills only: ks_toaster and ks_model, each with a mock caption and the station bug drawn in for legibility.
window.KS = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = {
    top: '#1c1d1f', topL: '#26282b', paper: '#f1eee5', paperD: '#e2ded2', ink: '#1a1a1a', grey: '#c9c6bd', greyD: '#a9a69d',
    bar: '#d6d3ca', yel: '#f2c200', red: '#d22b2b', blue: '#1f5aa6', pop: '#f2b83a',
  };
  const LW = 6, PW = 900, PH = 1360;                     // one line weight for every drawing; the leaflet's size
  const CACHE = {};
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ln = (g, w = LW) => { g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = C.ink; };
  const poly = (g, pts, close = true) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (close) g.closePath(); };

  // ------------------------------------------------------------------ pictograms (ISO 7010 grammar, drawn in code)
  function triangle(g, x, y, s, inner) {             // warning: yellow triangle, black border
    g.save(); g.translate(x, y);
    poly(g, [[0, -s * 0.55], [s * 0.6, s * 0.48], [-s * 0.6, s * 0.48]]); g.fillStyle = C.yel; g.fill(); ln(g, s * 0.07); g.stroke();
    g.save(); g.translate(0, s * 0.14); inner(g, s * 0.5); g.restore(); g.restore();
  }
  function forbid(g, x, y, s, inner) {               // prohibition: red ring and bar over a black symbol
    g.save(); g.translate(x, y); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, s * 0.5, 0, TAU); g.fill();
    inner(g, s * 0.6);
    g.strokeStyle = C.red; g.lineWidth = s * 0.09; g.beginPath(); g.arc(0, 0, s * 0.45, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.32, -s * 0.32); g.lineTo(s * 0.32, s * 0.32); g.stroke(); g.restore();
  }
  function must(g, x, y, s, inner) {                 // mandatory: blue disc, white symbol
    g.save(); g.translate(x, y); g.fillStyle = C.blue; g.beginPath(); g.arc(0, 0, s * 0.5, 0, TAU); g.fill(); inner(g, s * 0.6); g.restore();
  }
  const SYM = {
    heat(g, s) { g.strokeStyle = C.ink; g.lineWidth = s * 0.11; g.lineCap = 'round';
      for (const dx of [-0.32, 0, 0.32]) { g.beginPath(); for (let k = 0; k <= 12; k++) { const u = k / 12; g.lineTo(dx * s + Math.sin(u * TAU * 1.2) * s * 0.08, -s * 0.38 + u * s * 0.55); } g.stroke(); }
      g.fillStyle = C.ink; g.fillRect(-s * 0.55, s * 0.24, s * 1.1, s * 0.13); },
    shock(g, s) { g.fillStyle = C.ink; poly(g, [[s * 0.1, -s * 0.5], [-s * 0.22, s * 0.05], [0, s * 0.05], [-s * 0.12, s * 0.5], [s * 0.24, -s * 0.08], [s * 0.02, -s * 0.08]]); g.fill(); },
    child(g, s) { g.fillStyle = C.ink; g.beginPath(); g.arc(0, -s * 0.34, s * 0.13, 0, TAU); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = s * 0.12; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, -s * 0.18); g.lineTo(0, s * 0.12); g.moveTo(-s * 0.24, -s * 0.06); g.lineTo(s * 0.24, -s * 0.06);
      g.moveTo(0, s * 0.12); g.lineTo(-s * 0.16, s * 0.42); g.moveTo(0, s * 0.12); g.lineTo(s * 0.16, s * 0.42); g.stroke(); },
    water(g, s) { g.fillStyle = C.ink; g.beginPath(); g.roundRect(-s * 0.3, -s * 0.48, s * 0.6, s * 0.4, s * 0.08); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = s * 0.09; for (const dy of [0.12, 0.32]) { g.beginPath(); for (let k = 0; k <= 16; k++) { const u = k / 16; g.lineTo(-s * 0.48 + u * s * 0.96, s * dy + Math.sin(u * TAU * 2) * s * 0.05); } g.stroke(); } },
    fork(g, s) { g.fillStyle = C.ink; g.beginPath(); g.roundRect(-s * 0.36, -s * 0.05, s * 0.72, s * 0.42, s * 0.08); g.fill();
      g.fillStyle = '#fff'; g.fillRect(-s * 0.2, -s * 0.05, s * 0.1, s * 0.12); g.fillRect(s * 0.1, -s * 0.05, s * 0.1, s * 0.12);
      g.strokeStyle = C.ink; g.lineWidth = s * 0.06; g.beginPath(); g.moveTo(-s * 0.15, s * 0.05); g.lineTo(-s * 0.15, -s * 0.52);
      for (const dx of [-0.24, -0.15, -0.06]) { g.moveTo(dx * s, -s * 0.36); g.lineTo(dx * s, -s * 0.56); } g.stroke(); },
    plug(g, s) { g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-s * 0.26, -s * 0.18, s * 0.52, s * 0.36, s * 0.06); g.fill();
      g.fillRect(-s * 0.16, -s * 0.44, s * 0.08, s * 0.28); g.fillRect(s * 0.08, -s * 0.44, s * 0.08, s * 0.28);
      g.strokeStyle = '#fff'; g.lineWidth = s * 0.09; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, s * 0.18); g.quadraticCurveTo(0, s * 0.44, s * 0.3, s * 0.44); g.stroke(); },
    book(g, s) { g.fillStyle = '#fff'; poly(g, [[0, -s * 0.28], [-s * 0.42, -s * 0.38], [-s * 0.42, s * 0.3], [0, s * 0.4], [s * 0.42, s * 0.3], [s * 0.42, -s * 0.38]]); g.fill();
      g.strokeStyle = C.blue; g.lineWidth = s * 0.05; g.beginPath(); g.moveTo(0, -s * 0.26); g.lineTo(0, s * 0.38); g.stroke(); },
    rain(g, s) { g.fillStyle = C.ink; g.beginPath(); g.arc(-s * 0.15, -s * 0.2, s * 0.2, Math.PI, 0); g.arc(s * 0.15, -s * 0.22, s * 0.24, Math.PI, 0); g.lineTo(s * 0.39, -s * 0.05); g.lineTo(-s * 0.35, -s * 0.05); g.fill();
      g.strokeStyle = C.ink; g.lineWidth = s * 0.07; g.lineCap = 'round'; for (const dx of [-0.24, 0, 0.24]) { g.beginPath(); g.moveTo(dx * s, s * 0.05); g.lineTo(dx * s - s * 0.08, s * 0.32); g.stroke(); } },
  };

  // ------------------------------------------------------------------ the leaflet's furniture
  /** grey bars standing in for the same line in six other languages */
  function bars(g, x, y, w, n, seed, gap = 22, h = 9) {
    const r = U.rng(seed); g.fillStyle = C.bar;
    for (let i = 0; i < n; i++) { const ww = w * (0.55 + r() * 0.45); g.beginPath(); g.roundRect(x, y + i * gap, ww, h, h / 2); g.fill(); }
  }
  function callout(g, n, x, y, tx, ty) {             // a numbered ring with its leader line
    ln(g, 3); g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.stroke();
    g.fillStyle = C.paper; g.beginPath(); g.arc(x, y, 24, 0, TAU); g.fill(); ln(g, 4); g.stroke();
    g.fillStyle = C.ink; g.font = '700 30px "RobotoCondensed"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), x, y + 1);
    g.fillStyle = C.ink; g.beginPath(); g.arc(tx, ty, 6, 0, TAU); g.fill();
  }
  function header(g, left, right, codes) {
    g.fillStyle = C.ink; g.fillRect(40, 40, PW - 80, 96);
    g.fillStyle = C.paper; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.font = '800 46px "RobotoCondensed"'; g.fillText(left, 66, 104);
    g.textAlign = 'right'; g.font = '600 26px "RobotoCondensed"'; g.fillText(right, PW - 66, 100);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = '600 22px "RobotoCondensed"'; g.fillText(codes, 46, 172);
  }
  /** the paper: off-white, its fibre, and the two creases of a three-panel fold */
  function paper(g) {
    g.fillStyle = C.paper; g.fillRect(0, 0, PW, PH);
    const r = U.rng(41); for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.035)' : 'rgba(255,255,255,.5)'; g.fillRect(r() * PW, r() * PH, 1 + r() * 2, 1); }
    for (const fy of [PH / 3, (2 * PH) / 3]) {
      const sh = g.createLinearGradient(0, fy - 26, 0, fy + 26); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.48, 'rgba(0,0,0,.08)'); sh.addColorStop(0.5, 'rgba(255,255,255,.55)'); sh.addColorStop(0.56, 'rgba(0,0,0,.05)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = sh; g.fillRect(0, fy - 26, PW, 52);
    }
  }

  // ------------------------------------------------------------------ the two hero drawings
  /** a two-slot toaster in three-quarter view: flat grey sides, one line weight, the lever and the dial */
  function toaster(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const F = [[-200, -110], [140, -110], [140, 150], [-200, 150]];  // front face
    const D = [70, -60];                                            // depth vector, up-right
    poly(g, [[140, -110], [140 + D[0], -110 + D[1]], [140 + D[0], 150 + D[1]], [140, 150]]); g.fillStyle = C.grey; g.fill(); ln(g); g.stroke();
    poly(g, [[-200, -110], [-200 + D[0], -110 + D[1]], [140 + D[0], -110 + D[1]], [140, -110]]); g.fillStyle = C.paperD; g.fill(); ln(g); g.stroke();
    g.beginPath(); g.roundRect(-200, -110, 340, 260, 26); g.fillStyle = '#fbfaf6'; g.fill(); ln(g); g.stroke();
    for (const off of [0.32, 0.62]) {                                // the two slots on the top
      const ax = -200 + 340 * 0.12 + D[0] * off, ay = -110 + D[1] * off;
      g.beginPath(); g.roundRect(ax, ay - 7, 340 * 0.76, 14, 7); g.fillStyle = C.ink; g.fill();
    }
    ln(g, 4); g.beginPath(); g.moveTo(-178, 84); g.lineTo(118, 84); g.stroke();                     // a seam
    g.fillStyle = C.ink; g.beginPath(); g.roundRect(144 + D[0] * 0.4, -40 + D[1] * 0.4, 46, 22, 8); g.fill();   // the lever
    g.strokeStyle = C.ink; g.lineWidth = 4; g.beginPath(); g.moveTo(140 + D[0] * 0.4, -86 + D[1] * 0.4); g.lineTo(140 + D[0] * 0.4, 60 + D[1] * 0.4); g.stroke();
    g.beginPath(); g.arc(-110, 20, 30, 0, TAU); g.fillStyle = C.grey; g.fill(); ln(g, 5); g.stroke();                // the dial
    g.beginPath(); g.moveTo(-110, 20); g.lineTo(-92, -2); g.stroke();
    for (let k = 0; k < 7; k++) { const a = -Math.PI * 0.9 + k * 0.3; g.beginPath(); g.moveTo(-110 + Math.cos(a) * 40, 20 + Math.sin(a) * 40); g.lineTo(-110 + Math.cos(a) * 48, 20 + Math.sin(a) * 48); g.stroke(); }
    g.fillStyle = C.ink; for (const fx of [-170, 110]) { g.beginPath(); g.roundRect(fx, 150, 30, 14, 4); g.fill(); }  // feet
    ln(g, 5); g.beginPath(); g.moveTo(-200, 120); g.bezierCurveTo(-280, 130, -300, 200, -240, 220); g.bezierCurveTo(-180, 240, -150, 230, -120, 236); g.stroke();  // the cord
    g.beginPath(); g.roundRect(-124, 222, 54, 30, 6); g.fillStyle = C.grey; g.fill(); ln(g, 5); g.stroke();
    g.fillStyle = C.ink; g.fillRect(-70, 228, 22, 5); g.fillRect(-70, 242, 22, 5);
    g.restore();
  }
  /** a frontier model, as the leaflet would draw it: a server cabinet and the chat window it talks through */
  function model(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const D = [60, -50];
    poly(g, [[60, -200], [60 + D[0], -200 + D[1]], [60 + D[0], 190 + D[1]], [60, 190]]); g.fillStyle = C.grey; g.fill(); ln(g); g.stroke();
    poly(g, [[-120, -200], [-120 + D[0], -200 + D[1]], [60 + D[0], -200 + D[1]], [60, -200]]); g.fillStyle = C.paperD; g.fill(); ln(g); g.stroke();
    g.beginPath(); g.rect(-120, -200, 180, 390); g.fillStyle = '#fbfaf6'; g.fill(); ln(g); g.stroke();
    for (let i = 0; i < 9; i++) { const yy = -176 + i * 40; ln(g, 4); g.strokeRect(-104, yy, 148, 28); g.fillStyle = C.ink; g.beginPath(); g.arc(-88, yy + 14, 4, 0, TAU); g.fill(); g.fillRect(-40, yy + 11, 70, 6); }
    // the chat window, floating to its left, with three lines of an answer
    g.beginPath(); g.roundRect(-330, -140, 170, 120, 18); g.fillStyle = '#fbfaf6'; g.fill(); ln(g); g.stroke();
    poly(g, [[-200, -20], [-182, 12], [-176, -20]], false); g.fillStyle = '#fbfaf6'; g.fill(); ln(g); g.stroke();
    g.fillStyle = C.ink; [[-306, -110, 120], [-306, -84, 96], [-306, -58, 110]].forEach(([bx, by, bw]) => g.fillRect(bx, by, bw, 8));
    ln(g, 5); g.beginPath(); g.moveTo(60 + D[0] * 0.5, 160 + D[1] * 0.5); g.bezierCurveTo(200, 170, 210, 240, 150, 250); g.stroke();
    g.restore();
  }

  // ------------------------------------------------------------------ the two leaflets, each drawn once
  function toasterLeaflet() {
    if (CACHE.toaster) return CACHE.toaster;
    const c = canvas(PW, PH), g = c.getContext('2d'); paper(g);
    header(g, 'TOASTER T-2', 'SAFETY INSTRUCTIONS', 'EN · FI · SV · DA · NO · DE · FR · ES · IT · NL');
    toaster(g, 470, 420, 1.12);
    callout(g, 1, 150, 230, 268, 300); callout(g, 2, 760, 230, 668, 326); callout(g, 3, 150, 600, 330, 440);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '800 40px "RobotoCondensed"'; g.fillText('WARNINGS', 46, 712);
    g.textAlign = 'right'; g.font = '600 30px "RobotoCondensed"'; g.fillText('1 / 23', PW - 46, 712);
    ln(g, 3); g.beginPath(); g.moveTo(46, 728); g.lineTo(PW - 46, 728); g.stroke();
    const cells = [
      (x, y) => triangle(g, x, y, 150, SYM.heat), (x, y) => triangle(g, x, y, 150, SYM.shock), (x, y) => triangle(g, x, y, 150, SYM.child),
      (x, y) => forbid(g, x, y, 150, SYM.water), (x, y) => forbid(g, x, y, 150, SYM.fork), (x, y) => forbid(g, x, y, 150, SYM.rain),
      (x, y) => must(g, x, y, 150, SYM.plug), (x, y) => must(g, x, y, 150, SYM.book),
    ];
    cells.forEach((f, i) => { const col = i % 4, row = (i / 4) | 0, x = 140 + col * 207, y = 830 + row * 188; f(x, y); bars(g, x - 72, y + 96, 144, 2, 70 + i, 16, 7); });
    const lines = ['Do not immerse in water.', 'Never insert metal objects.', 'Unplug before cleaning.', 'Keep out of reach of children.'];
    g.textAlign = 'left'; lines.forEach((s, i) => { const y = 1185 + i * 30; g.fillStyle = C.ink; g.font = '700 24px "RobotoCondensed"'; g.fillText(`${i + 1}. ${s}`, 46, y); bars(g, 420, y - 16, 230, 1, 90 + i, 0, 8); bars(g, 670, y - 16, 180, 1, 95 + i, 0, 8); });
    // the footer: the standards it was tested to, the bin, a barcode
    ln(g, 4); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.beginPath(); g.ellipse(150, 1312, 92, 34, 0, 0, TAU); g.stroke(); g.fillStyle = C.ink; g.font = '700 24px "RobotoCondensed"'; g.fillText('IEC 60335-2-9', 150, 1313);
    g.beginPath(); g.roundRect(268, 1282, 150, 60, 10); g.stroke(); g.fillText('UL 1026', 343, 1313);
    g.font = '800 46px "RobotoCondensed"'; g.fillText('CE', 480, 1314);
    g.save(); g.translate(575, 1312); ln(g, 4); poly(g, [[-20, -24], [20, -24], [15, 26], [-15, 26]]); g.stroke(); g.beginPath(); g.moveTo(-30, -32); g.lineTo(30, 36); g.moveTo(30, -32); g.lineTo(-30, 36); g.stroke(); g.restore();
    const r = U.rng(9); let bx = 660; g.fillStyle = C.ink; while (bx < 850) { const w = 2 + ((r() * 4) | 0); g.fillRect(bx, 1284, w, 54); bx += w + 2 + ((r() * 4) | 0); }
    return (CACHE.toaster = c);
  }
  function modelLeaflet() {
    if (CACHE.model) return CACHE.model;
    const c = canvas(PW, PH), g = c.getContext('2d'); paper(g);
    header(g, 'FRONTIER AI MODEL', 'SAFETY INSTRUCTIONS', 'EN · FI · SV · DA · NO · DE · FR · ES · IT · NL');
    model(g, 520, 450, 1.0);
    callout(g, 1, 150, 230, 230, 330);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '800 40px "RobotoCondensed"'; g.fillText('WARNINGS', 46, 712);
    g.textAlign = 'right'; g.font = '600 30px "RobotoCondensed"'; g.fillText('0', PW - 46, 712);
    ln(g, 3); g.beginPath(); g.moveTo(46, 728); g.lineTo(PW - 46, 728); g.stroke();
    g.setLineDash([10, 10]); g.strokeStyle = C.greyD; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { const col = i % 4, row = (i / 4) | 0, x = 140 + col * 207, y = 830 + row * 188; g.beginPath(); g.arc(x, y, 66, 0, TAU); g.stroke(); }
    g.setLineDash([]);
    g.textAlign = 'left'; g.fillStyle = C.ink; g.font = '700 24px "RobotoCondensed"'; g.fillText('1. Release.', 46, 1185);
    ln(g, 4); g.setLineDash([10, 10]); g.strokeStyle = C.greyD; g.beginPath(); g.ellipse(150, 1312, 92, 34, 0, 0, TAU); g.stroke(); g.beginPath(); g.roundRect(268, 1282, 150, 60, 10); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.greyD; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 24px "RobotoCondensed"'; g.fillText('—', 150, 1313); g.fillText('—', 343, 1313);
    return (CACHE.model = c);
  }

  /** the big red emergency stop, as a leaflet would draw it, with a paper tag on a string */
  function estop(c, x, y, s, tag, swing = 0) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(16, 120, 150, 40, 0, 0, TAU); c.fill();
    c.beginPath(); c.roundRect(-130, -10, 260, 130, 20); c.fillStyle = C.yel; c.fill(); ln(c, 7); c.stroke();
    c.beginPath(); c.ellipse(0, -10, 96, 30, 0, 0, TAU); c.fillStyle = '#9a1b1b'; c.fill(); ln(c, 7); c.stroke();
    c.beginPath(); c.ellipse(0, -60, 110, 40, 0, Math.PI, 0); c.lineTo(110, -24); c.ellipse(0, -24, 110, 40, 0, 0, Math.PI); c.closePath(); c.fillStyle = C.red; c.fill(); ln(c, 7); c.stroke();
    c.beginPath(); c.ellipse(0, -60, 110, 40, 0, 0, TAU); c.fillStyle = '#e8483f'; c.fill(); ln(c, 7); c.stroke();
    if (tag) {                                       // a manila tag tied to the housing
      c.save(); c.translate(118, 40); c.rotate(0.22 + swing);
      ln(c, 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(36, 70); c.stroke();
      c.translate(36, 70); c.rotate(-0.18);
      c.beginPath(); c.moveTo(-50, 0); c.lineTo(50, 0); c.lineTo(132, 50); c.lineTo(132, 250); c.lineTo(-132, 250); c.lineTo(-132, 50); c.closePath();
      c.fillStyle = '#e6d39a'; c.fill(); ln(c, 5); c.stroke();
      c.beginPath(); c.arc(0, 26, 10, 0, TAU); c.fillStyle = C.paper; c.fill(); ln(c, 4); c.stroke();
      c.fillStyle = C.ink; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      tag.forEach(([t, f], i) => { c.font = f; c.fillText(t, 0, 104 + i * 54); });
      c.restore();
    }
    c.restore();
  }

  /** the worktop and the leaflet lying on it, with its own shadow */
  function lay(c, sheet, { x = 540, y = 470 + PH * 0.41, rot = -0.02, z = 0.82 } = {}) {
    c.fillStyle = C.top; c.fillRect(0, 0, W, H);
    const r = U.rng(3); for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.18)'; c.fillRect(r() * W, r() * H, 2 + r() * 3, 1 + r() * 2); }
    const v = c.createRadialGradient(540, 860, 200, 540, 960, 1150); v.addColorStop(0, 'rgba(255,240,215,.10)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(z, z);
    c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 40; c.shadowOffsetX = 18; c.shadowOffsetY = 26; c.fillStyle = C.paper; c.fillRect(-PW / 2, -PH / 2, PW, PH); c.restore();
    c.drawImage(sheet, -PW / 2, -PH / 2); c.restore();
  }

  /** MOCK caption + bug for the style test (the films burn these with rfcaps.py); [word] pops in amber */
  function mockCaption(c, lines, y) {
    c.save(); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.font = '82px "Poppins-800"'; c.lineJoin = 'round';
    lines.forEach((s, i) => {
      const parts = s.split(/(\[[^\]]+\])/).filter(Boolean), clean = parts.map((p) => p.replace(/[[\]]/g, ''));
      let x = 540 - c.measureText(clean.join('')).width / 2; c.textAlign = 'left';
      parts.forEach((p, j) => {
        const t = clean[j], yy = y + i * 98; c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowOffsetX = 3; c.shadowOffsetY = 3;
        c.lineWidth = 14; c.strokeStyle = '#000'; c.strokeText(t, x, yy); c.shadowColor = 'transparent';
        c.fillStyle = p.startsWith('[') ? C.pop : '#fff'; c.fillText(t, x, yy); x += c.measureText(t).width;
      });
    });
    c.font = '30px "Poppins-800"'; c.textAlign = 'left'; c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,.5)'; c.strokeText('● RADIO FREE HELSINKI', 92, 118);
    c.fillStyle = '#f0027f'; c.fillText('●', 92, 118); c.fillStyle = 'rgba(255,255,255,.82)'; c.fillText(' RADIO FREE HELSINKI', 92 + c.measureText('●').width, 118);
    c.restore();
  }
  /** the where/what tag: a black-and-yellow hazard label, kept above Instagram's bottom UI (RFP.SAFE_B) */
  function tag(c, text, x = 110, yb = 1700) {
    yb = Math.min(yb, RFP.SAFE_B);
    c.save(); c.font = '700 34px "RobotoCondensed"'; const w = c.measureText(text).width + 80, h = 62, y = yb - h;
    c.fillStyle = C.ink; c.fillRect(x, y, w, h);
    c.save(); c.beginPath(); c.rect(x, y, 30, h); c.clip(); c.fillStyle = C.yel; for (let k = -2; k < 6; k++) { c.beginPath(); c.moveTo(x + k * 18, y + h); c.lineTo(x + k * 18 + 9, y + h); c.lineTo(x + k * 18 + 9 + h, y); c.lineTo(x + k * 18 + h, y); c.fill(); } c.restore();
    c.fillStyle = C.yel; c.textBaseline = 'middle'; c.fillText(text, x + 50, y + h / 2 + 2); c.restore();
  }

  SCENES['ks_toaster'] = { draw(c, lt) {
    lay(c, toasterLeaflet(), { y: 470 + PH * 0.41 + Math.sin(lt * 0.6) * 4 });
    tag(c, 'SACRAMENTO · CALIFORNIA');
    mockCaption(c, ['A toaster ships with', '[23] warnings.'], 300);
  } };
  SCENES['ks_model'] = { draw(c, lt) {
    lay(c, modelLeaflet(), { y: 470 + PH * 0.41 + Math.sin(lt * 0.6) * 4 });
    estop(c, 770, 1215, 0.82, [['KILL SWITCH', '800 40px "RobotoCondensed"'], ['UNDER', '700 34px "RobotoCondensed"'], ['STUDY', '700 34px "RobotoCondensed"']], Math.sin(lt * 1.3) * 0.04);
    tag(c, 'SACRAMENTO · CALIFORNIA');
    mockCaption(c, ['A frontier AI model', 'ships with [none].'], 300);
  } };
  return { C, toasterLeaflet, modelLeaflet, estop, lay, tag, mockCaption };
})();
