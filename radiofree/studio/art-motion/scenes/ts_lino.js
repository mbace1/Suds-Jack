// TEST 2 · Finnish linocut (the woodcut tradition of Gallen-Kallela, cut in lino).
// Two plates on cream paper. The YELLOW plate (ruska) is printed first and a hair
// off register: the low sun, the leaves, the mask. The BLACK plate is solid ink
// with everything light CARVED out of it as tapered gouge strokes — the sky's
// wavy cuts, the birch bark left as paper, the rain as slits, the coat's folds.
// Ink starvation speckles the black like a hand-pulled print.
SCENES['ts_lino'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S } = RFM;
  const PAPER = '#efe6d0', INK = '#16120f', YEL = '#e0a51c';
  // a gouge cut: a lens-shaped stroke, pointed at both ends (that is what a V-tool leaves)
  function gouge(g, x0, y0, x1, y1, w) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    g.moveTo(x0, y0); g.quadraticCurveTo(mx + nx, my + ny, x1, y1); g.quadraticCurveTo(mx - nx, my - ny, x0, y0);
  }
  const paper = () => P.cached('ts_l_paper', W, H, (g) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    const r = U.rng(3); g.strokeStyle = 'rgba(120,90,50,.06)'; g.lineWidth = 1;
    for (let i = 0; i < 2500; i++) { const x = r() * W, y = r() * H, a = r() * TAU, l = 6 + r() * 20; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  });
  // the static black plate: sky, ground, birches — cut once and cached
  const plate = () => P.cached('ts_l_plate', W, H, (g) => {
    g.fillStyle = INK; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'destination-out'; g.beginPath();
    const r = U.rng(7);
    // the sky: long wavy horizontal cuts, wider toward the sun's glow (low right)
    for (let y = 40; y < 900; y += 22) {
      const near = clamp(1 - Math.hypot(0, y - 760) / 760, 0, 1);
      for (let x = -40; x < W; x += 140 + r() * 80) { const w = 3 + near * 14 + r() * 3, len = 90 + r() * 160; gouge(g, x, y + Math.sin(x * 0.01 + y) * 6, x + len, y + Math.sin((x + len) * 0.01 + y) * 6, w); }
    }
    // the ground: a field of short diagonal cuts, sparser toward the bottom
    for (let i = 0; i < 900; i++) { const x = r() * W, y = 1300 + r() * 620, l = 14 + r() * 26, w = 3 + r() * 3; if (r() < 1 - (y - 1300) / 900) gouge(g, x, y, x + l, y - l * 0.3, w); }
    g.fill();
    // the birch trunks: paper left standing, with black bark marks printed back in
    g.globalCompositeOperation = 'destination-out';
    const trunks = [[120, 70], [300, 44], [860, 80], [990, 36]];
    for (const [x, w] of trunks) { g.beginPath(); g.moveTo(x - w / 2, -20); g.lineTo(x + w / 2, -20); g.lineTo(x + w / 2 + 10, 1420); g.lineTo(x - w / 2 - 6, 1420); g.closePath(); g.fill(); }
    g.globalCompositeOperation = 'source-over'; g.fillStyle = INK;
    for (const [x, w] of trunks) for (let y = 0; y < 1400; y += 34 + r() * 40) { g.beginPath(); gouge(g, x - w / 2 + r() * w * 0.3, y, x - w / 2 + w * (0.4 + r() * 0.5), y + (r() - 0.5) * 10, 6 + r() * 6); g.fill(); }
    // the path the figure walks on: a carved lighter band
    g.globalCompositeOperation = 'destination-out'; g.beginPath();
    for (let y = 1480; y < 1920; y += 16) { const half = 140 + (y - 1480) * 0.5; for (let x = 540 - half; x < 540 + half; x += 60) gouge(g, x, y, x + 40, y + 2, 5); }
    g.fill(); g.globalCompositeOperation = 'source-over';
  });
  const starve = () => P.cached('ts_l_starve', W, H, (g) => {           // ink starvation: paper showing through the black
    const r = U.rng(11); g.fillStyle = '#000';
    for (let i = 0; i < 9000; i++) { const x = r() * W, y = r() * H, n = P.fbm(x * 0.004, y * 0.004, 3); if (n > 0.05) { g.globalAlpha = 0.35 + r() * 0.5; g.fillRect(x, y, 1 + r() * 2.5, 1 + r() * 2.5); } }
  });
  return {
    draw(c, lt) {
      c.drawImage(paper(), 0, 0);
      // ── yellow plate, printed first, 5px off register ──
      c.save(); c.translate(5, 4); c.fillStyle = YEL;
      c.beginPath(); c.arc(760, 760, 230, 0, TAU); c.fill();                                                  // the low sun
      const r = U.rng(21);
      for (let i = 0; i < 16; i++) { const x = r() * W, ph = r(), y = ((lt * 120 * (0.7 + r() * 0.6) + ph * 2000) % 2000) - 60, a = lt * 1.6 + i;
        c.save(); c.translate(x + Math.sin(lt + i) * 40, y); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 14, 26, 0, 0, TAU); c.fill(); c.restore(); }
      c.restore();
      // ── black plate ──
      const B = P.scratch('ts_l_b'), g = B.getContext('2d'); g.reset();
      g.drawImage(plate(), 0, 0);
      // the walker: a coat with carved folds, an umbrella with carved ribs, legs mid-stride
      const step = Math.sin(lt * TAU * 0.9), bob = Math.abs(step) * 8, fx = 540, fy = 1240 - bob;
      const big = (ctx) => { ctx.translate(540, 1880); ctx.scale(1.6, 1.6); ctx.translate(-540, -1690); };   // the walker is the subject: big
      g.save(); big(g); g.fillStyle = INK;
      g.beginPath(); g.moveTo(fx - 120, fy + 300); g.quadraticCurveTo(fx - 110, fy + 40, fx, fy + 30); g.quadraticCurveTo(fx + 110, fy + 40, fx + 120, fy + 300); g.closePath(); g.fill();
      for (const [sx, sw] of [[-1, step], [1, -step]]) { g.beginPath(); g.moveTo(fx + sx * 34 - 20, fy + 290); g.lineTo(fx + sx * 34 + 20, fy + 290); g.lineTo(fx + sx * 34 + 22 + sw * 26, fy + 450); g.lineTo(fx + sx * 34 - 22 + sw * 26, fy + 450); g.closePath(); g.fill(); }
      g.beginPath(); g.arc(fx, fy - 170, 250, Math.PI, 0); g.closePath(); g.fill();
      g.fillRect(fx - 5, fy - 170, 10, 220);
      g.globalCompositeOperation = 'destination-out'; g.beginPath();
      for (let k = 1; k < 8; k++) { const a = Math.PI + k * Math.PI / 8; gouge(g, fx + Math.cos(a) * 40, fy - 170 + Math.sin(a) * 40, fx + Math.cos(a) * 240, fy - 170 + Math.sin(a) * 240, 7); }
      for (let k = 0; k < 6; k++) gouge(g, fx - 80 + k * 30, fy + 80 + (k % 2) * 20, fx - 70 + k * 30 + (k - 3) * 6, fy + 290, 6);     // coat folds
      g.fill(); g.restore(); g.globalCompositeOperation = 'destination-out'; g.beginPath();
      // the rain: slits cut through everything, falling
      const rr = U.rng(31);
      for (let i = 0; i < 140; i++) { const x = rr() * (W + 300), y = ((lt * 1500 * (0.8 + rr() * 0.4) + rr() * 2200) % 2200) - 200; gouge(g, x, y, x - 14, y + 60, 3.2); }
      g.fill(); g.globalCompositeOperation = 'destination-out'; g.drawImage(starve(), 0, 0); g.globalCompositeOperation = 'source-over';
      c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(B, 0, 0); c.restore();
      // the mask: yellow plate (printed in register this time — the face must read), paper face
      c.save(); big(c);
      mask(c, fx, fy - 30, 80, YEL, { glasses: true, led: false, tilt: Math.sin(lt * 1.3) * 0.05, face: PAPER, frame: INK, ink: INK, shade: false, strap: true });
      // the glasses' light is the only red in the print: a third, tiny stamp
      if (Math.floor(lt * 4) % 2 === 0) { c.fillStyle = '#c8231c'; c.beginPath(); c.arc(fx + 66, fy - 64, 8, 0, TAU); c.fill(); }
      c.restore();
      // the carver's monogram and an edition number, in pencil
      c.fillStyle = 'rgba(60,50,40,.7)'; c.font = '30px "Caveat-600"'; c.fillText('3/40   "Katse ostaa"', 60, 1890);
    },
  };
})();
