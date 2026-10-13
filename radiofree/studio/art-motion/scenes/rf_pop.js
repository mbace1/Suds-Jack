// A · Lichtenstein comic panel — "the glasses order for you". Portrait 1080×1920.
// Composition (new, for this subject): over-the-shoulder. The back of his head and
// the smart glasses fill the lower left; through the shop window, a cake sits in
// the glasses' reticle; a jagged balloon from the glasses' LED shouts the order.
// Technique from 13_pop: ben-day dots as createPattern tiles, 5–6px black ink on
// flat fills, white highlight bars, hatch shadows. No face is drawn: only hair,
// ear and the back of the neck.
// Main action: the reticle locks on and the balloon + KA-CHING! burst stamp in.
// Motif loops: burst jitter at 30fps, LED flashes, highlight shimmer on the cake.
SCENES['rf_pop'] = (() => {
  const W = 1080, H = 1920, P = PAINT, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { ink: '#141414', paper: '#f3eedb', yellow: '#f7d52c', red: '#d8232a', redD: '#a8161c', white: '#fbf8ee',
    pink: '#f58fb4', pinkD: '#d9567e', skin: '#fae0cc', dot: '#e2483c', hair: '#2a1d16', blue: '#2f5cc8' };
  const dots = (c, key, pitch, r, col, bg) => {
    const tile = P.cached('rfpop_' + key, pitch, pitch, (g) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, pitch, pitch); } g.fillStyle = col;
      [[0, 0], [pitch, 0], [0, pitch], [pitch, pitch], [pitch / 2, pitch / 2]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); });
    return c.createPattern(tile, 'repeat');
  };
  const ink = (c, p, fill, lw = 6) => { if (fill) { c.fillStyle = fill; c.fill(p); } c.strokeStyle = C.ink; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(p); };
  const smooth = (pts) => U.poly ? (() => { const p = new Path2D(); p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } p.closePath(); return p; })() : null;
  const ease = (k) => (k = clamp(k, 0, 1), k * k * (3 - 2 * k));
  const pop = (k) => { k = clamp(k, 0, 1); const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };

  // ── ① the panel: paper, frame, caption, the shop window and its yellow wall ──
  const bg = () => P.cached('rfpop_bg', W, H, (g) => {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    // the wall around the window: yellow with faint print dots
    g.fillStyle = C.yellow; g.fillRect(24, 24, W - 48, H - 48);
    g.globalAlpha = 0.22; g.fillStyle = dots(g, 'wall', 16, 2.6, '#c99a10'); g.fillRect(24, 24, W - 48, H - 48); g.globalAlpha = 1;
    // the bakery window: a red frame, the inside a pale blue-dotted interior
    g.fillStyle = dots(g, 'inside', 22, 5, '#9fc0f0', C.white); g.fillRect(150, 300, 860, 900);
    g.lineWidth = 6; g.strokeStyle = C.ink;
    g.fillStyle = C.red; [[130, 280, 900, 34], [130, 1196, 900, 40], [130, 280, 34, 956], [996, 280, 34, 956]].forEach(([x, y, w, h]) => { g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h); });
    g.fillStyle = C.white; g.fillRect(146, 316, 18, 300); // glint on the glass
    // a shelf inside, and the cake stand
    g.fillStyle = '#c98a4a'; g.fillRect(164, 1010, 832, 40); g.strokeRect(164, 1010, 832, 40);
    // the sign above the window
    g.fillStyle = C.white; g.fillRect(250, 150, 660, 110); g.lineWidth = 6; g.strokeRect(250, 150, 660, 110);
    g.font = '86px "Bangers-400"'; g.fillStyle = C.red; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LEIPOMO · BAKERY', 580, 208);
    // caption box, top left
    g.fillStyle = C.yellow; g.fillRect(40, 40, 470, 86); g.lineWidth = 5; g.strokeStyle = C.ink; g.strokeRect(40, 40, 470, 86);
    g.font = '50px "Bangers-400"'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('MEANWHILE, IN HELSINKI...', 58, 85);
    g.lineWidth = 8; g.strokeRect(20, 20, W - 40, H - 40);
    g.drawImage(P.grain('rfpop', 0.035, [60, 50, 30], 0.12), 0, 0);
  });

  // ── ② the cake, in comic ink ──
  function cake(c, t, x, y) {
    const tier = (yy, w, h, fill) => { const p = new Path2D(); p.ellipse(x, yy + h, w, w * 0.22, 0, 0, Math.PI); p.lineTo(x - w, yy); p.ellipse(x, yy, w, w * 0.22, 0, Math.PI, 0, true); p.closePath(); ink(c, p, fill);
      const top = new Path2D(); top.ellipse(x, yy, w, w * 0.22, 0, 0, TAU); ink(c, top, C.white); };
    tier(y - 170, 250, 150, dots(c, 'pinkdots', 14, 4, C.pinkD, C.pink));
    tier(y - 330, 170, 140, C.white);
    // icing drips and dollops
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU, d = new Path2D(); d.arc(x + Math.cos(a) * 200, y - 166 + Math.sin(a) * 40, 22, 0, TAU); ink(c, d, C.white, 4); }
    const cherry = new Path2D(); cherry.arc(x, y - 395, 44, 0, TAU); ink(c, cherry, C.red);
    c.fillStyle = C.white; c.beginPath(); c.ellipse(x - 14, y - 410, 12, 7 + Math.sin(t * 9) * 2, -0.5, 0, TAU); c.fill();
    c.strokeStyle = C.ink; c.lineWidth = 6; c.beginPath(); c.moveTo(x + 6, y - 438); c.quadraticCurveTo(x + 30, y - 490, x + 60, y - 500); c.stroke();
    // the glass stand
    const st = new Path2D(); st.moveTo(x - 280, y - 20); st.lineTo(x + 280, y - 20); st.lineTo(x + 230, y + 4); st.lineTo(x - 230, y + 4); st.closePath(); ink(c, st, '#dff0ff', 5);
  }

  // ── ③ the man from behind: hair, ear, neck, collar, and the glasses' arm ──
  function head(c, t) {
    const sway = Math.sin(t * 1.6) * 6;
    c.save(); c.translate(sway, 0);
    // jacket shoulder, cropped by the panel
    ink(c, smooth([[-60, 1920], [-60, 1500], [120, 1420], [430, 1430], [610, 1560], [660, 1920]]), C.red);
    c.save(); c.clip(smooth([[-60, 1920], [-60, 1500], [120, 1420], [430, 1430], [610, 1560], [660, 1920]]));
    c.fillStyle = dots(c, 'jacket', 18, 4.5, C.redD); c.fillRect(-60, 1400, 760, 520); c.restore();
    // neck and collar
    ink(c, smooth([[170, 1460], [190, 1300], [380, 1290], [420, 1460]]), dots(c, 'skin', 13, 3.3, C.dot, C.skin));
    ink(c, smooth([[120, 1470], [250, 1400], [470, 1430], [440, 1500], [180, 1520]]), C.white, 5);
    // the back of the head: a mass of black hair with blue highlight strokes
    const hp = smooth([[90, 1180], [120, 900], [300, 800], [520, 860], [590, 1060], [520, 1290], [300, 1350], [140, 1320]]);
    ink(c, hp, C.hair);
    c.save(); c.clip(hp); c.strokeStyle = C.blue; c.lineWidth = 12; c.lineCap = 'round';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(170 + i * 60, 900 + i * 6); c.quadraticCurveTo(230 + i * 60, 1050, 200 + i * 55, 1230); c.stroke(); }
    c.strokeStyle = C.white; c.lineWidth = 7; c.beginPath(); c.moveTo(330, 870); c.quadraticCurveTo(420, 900, 460, 980); c.stroke(); c.restore();
    // the ear on the right side of his head
    ink(c, smooth([[560, 1030], [620, 1010], [640, 1100], [600, 1170], [560, 1150]]), dots(c, 'skin', 13, 3.3, C.dot, C.skin));
    // the glasses' arm over the ear, the camera module, its LED
    const arm = new Path2D(); arm.moveTo(470, 1040); arm.lineTo(780, 1000); arm.lineTo(782, 1024); arm.lineTo(474, 1066); arm.closePath(); ink(c, arm, '#222', 5);
    const mod = new Path2D(); mod.roundRect(730, 970, 120, 74, 18); ink(c, mod, '#333', 5);
    const lens = new Path2D(); lens.arc(830, 1007, 22, 0, TAU); ink(c, lens, '#9fc0f0', 4);
    const on = (Math.floor(t * 6) % 2) === 0;
    c.fillStyle = on ? C.yellow : '#b28e10'; c.beginPath(); c.arc(752, 1007, 12, 0, TAU); c.fill(); c.stroke();
    c.restore();
    return { led: [752 + sway, 1007] };
  }

  // ── ④ the reticle, the balloon and the burst ──
  function reticle(c, t, x, y, w, h, k) {
    if (k <= 0) return;
    const s = lerp(1.5, 1, ease(k)), wobble = Math.sin(t * 10) * 4 * (1 - ease(k));
    c.save(); c.translate(x, y); c.scale(s, s); c.translate(wobble, 0);
    c.strokeStyle = C.ink; c.lineWidth = 16; c.lineCap = 'square';
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(sx * w / 2, sy * (h / 2 - 70)); c.lineTo(sx * w / 2, sy * h / 2); c.lineTo(sx * (w / 2 - 70), sy * h / 2); c.stroke(); }
    c.strokeStyle = C.red; c.lineWidth = 8;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(sx * w / 2, sy * (h / 2 - 70)); c.lineTo(sx * w / 2, sy * h / 2); c.lineTo(sx * (w / 2 - 70), sy * h / 2); c.stroke(); }
    c.restore();
  }
  function balloon(c, t, from, k) {
    if (k <= 0) return;
    const s = pop(k), cx = 640, cy = 1460;
    c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
    const r = U.rng(7), pts = [];
    for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU, rr = (i % 2 ? 0.86 : 1) * (1 + (r() - 0.5) * 0.08); pts.push([cx + Math.cos(a) * 330 * rr, cy + Math.sin(a) * 170 * rr]); }
    const p = U.poly(pts);
    // the jagged tail to the LED
    const tail = U.poly([[from[0] + 10, from[1] + 20], [cx - 150, cy - 80], [cx - 60, cy - 120]]);
    ink(c, tail, C.white, 6); ink(c, p, C.white, 7); c.fillStyle = C.white; c.fill(U.poly([[cx - 150, cy - 82], [cx - 60, cy - 118], [cx - 120, cy - 40]]));
    c.font = '78px "Bangers-400"'; c.fillStyle = C.ink; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('CAKE DETECTED.', cx, cy - 44); c.fillStyle = C.red; c.font = '104px "Bangers-400"'; c.fillText('ORDERED!', cx, cy + 50);
    c.restore();
  }
  function burst(c, t, k) {
    if (k <= 0) return;
    const f = Math.floor(t * 30), jx = (U.hash(f, 1) - 0.5) * 14, jy = (U.hash(f, 2) - 0.5) * 10, rot = (U.hash(f, 3) - 0.5) * 0.06;
    const s = pop(k), cx = 790, cy = 470;
    c.save(); c.translate(cx + jx, cy + jy); c.rotate(-0.12 + rot); c.scale(s, s);
    const star = (R, r, n, seed) => { const g = U.rng(seed), pts = []; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU, rr = (i % 2 ? r : R) * (0.85 + g() * 0.3); pts.push([Math.cos(a) * rr, Math.sin(a) * rr * 0.72]); } return U.poly(pts); };
    ink(c, star(250, 170, 14, 3), C.white, 7); ink(c, star(200, 140, 12, 9), C.yellow, 5);
    c.font = '112px "Bangers-400"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 14; c.strokeStyle = C.ink; c.lineJoin = 'round';
    c.strokeText('KA-CHING!', 0, 0); c.fillStyle = C.red; c.fillText('KA-CHING!', 0, 0);
    c.restore();
  }

  return {
    draw(c, lt, t) {
      c.drawImage(bg(), 0, 0);
      cake(c, lt, 580, 1010);
      const lock = clamp((lt - 0.6) / 0.5, 0, 1);
      reticle(c, lt, 580, 760, 640, 600, lock);
      const h = head(c, lt);
      balloon(c, lt, h.led, (lt - 1.3) / 0.35);
      burst(c, lt, (lt - 1.6) / 0.3);
    },
  };
})();
