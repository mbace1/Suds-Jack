// Lino-noir (owner, 2026-10-13: "a mix of 1 and 2 … 1,2,4,5,7 — but fall, darker
// palette with one or two contrast colours"). Test 1's Hopper light — a dark street,
// one lit thing pulling the eye — cut as test 2's linocut, with test 4's grain, test
// 5's composition and rain, and test 7's misregistered plates. Printed on dark kraft:
// an OCHRE plate for every light source and a RUST plate for the leaves go down first,
// then the BLACK key over everything, with the light CARVED out of it as gouge cuts.
// The one contrast colour is the mask — Toko's own magenta, a clean face, no glasses.
window.LN = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask } = RFM;
  const C = { kraft: '#8f7a58', ink: '#14100c', mid: '#28392f', midL: '#3d5244', ochre: '#e3a33a', ochreD: '#b9781f', rust: '#8a3b1c', mag: '#f0027f', face: '#efe0c0' };
  /** a gouge cut: a lens-shaped stroke, pointed at both ends (what a V-tool leaves) */
  function gouge(g, x0, y0, x1, y1, w) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    g.moveTo(x0, y0); g.quadraticCurveTo(mx + nx, my + ny, x1, y1); g.quadraticCurveTo(mx - nx, my - ny, x0, y0);
  }
  const paper = () => P.cached('ln_paper', W, H, (g) => {
    g.fillStyle = C.kraft; g.fillRect(0, 0, W, H);
    const r = U.rng(3);
    for (let i = 0; i < 4000; i++) { const x = r() * W, y = r() * H, a = r() * TAU, l = 6 + r() * 22; g.strokeStyle = r() < 0.5 ? 'rgba(255,230,190,.07)' : 'rgba(0,0,0,.08)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  });
  // ink starvation: kraft showing through the black like a hand-pulled print
  const starve = () => P.cached('ln_starve', W, H, (g) => {
    const r = U.rng(11); g.fillStyle = '#000';
    for (let i = 0; i < 14000; i++) { const x = r() * W, y = r() * H, n = P.fbm(x * 0.004, y * 0.004, 3); if (n > 0.08) { g.globalAlpha = 0.3 + r() * 0.5; g.fillRect(x, y, 1 + r() * 2.5, 1 + r() * 2.5); } }
  });
  /** wavy horizontal cuts across a band: the carver's sky and water. dens(x, y) 0..1 sets the cut width */
  function sweep(g, y0, y1, step, dens, seed, wobble = 6) {
    const r = U.rng(seed);
    for (let y = y0; y < y1; y += step) for (let x = -60; x < W; x += 120 + r() * 90) {
      const w = 1.5 + dens(x, y) * 14 + r() * 2, len = 80 + r() * 170; if (w < 2.2 && r() < 0.6) continue;
      gouge(g, x, y + Math.sin(x * 0.01 + y) * wobble, x + len, y + Math.sin((x + len) * 0.01 + y) * wobble, w);
    }
  }
  /** rays cut round a light: the linocut way to draw a glow */
  function rays(g, x, y, r0, r1, n, w, seed) { const r = U.rng(seed); for (let k = 0; k < n; k++) { const a = k / n * TAU + r() * 0.1, l = r1 * (0.6 + r() * 0.4); gouge(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * l, y + Math.sin(a) * l, w * (0.7 + r() * 0.6)); } }
  /** falling rain slits, cut through the key */
  function rain(g, lt, n, ang, sp, seed, w = 3) { const r = U.rng(seed); for (let i = 0; i < n; i++) { const x = r() * (W + 400) - 100, len = 50 + r() * 70, y = ((lt * sp * (0.8 + r() * 0.4) + r() * 2300) % 2300) - 200; gouge(g, x, y, x - len * ang, y + len, w); } }
  /** a leaf, as a shape on whichever plate is drawing it */
  function leaf(g, x, y, s, rot) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.moveTo(0, -20); g.quadraticCurveTo(14, -4, 0, 18); g.quadraticCurveTo(-14, -4, 0, -20); g.restore(); }
  /**
   * print one frame. spec: { key, light(g, lt), rust(g, lt), black(g) [static, cached], carve(g, lt) [this frame's cuts], top(c, lt), reg }
   * reg is each colour plate's registration error in px — fixed per print, as it would be.
   */
  function print(c, lt, spec) {
    const reg = spec.reg || { light: [5, 3], rust: [-4, 5] };
    c.drawImage(paper(), 0, 0);
    // the MID plate first: a deep autumn teal-green over everything, so cuts in the key reveal colour, not bare paper
    if (spec.mid !== false) { c.fillStyle = C.mid; c.globalAlpha = 0.97; c.fillRect(0, 0, W, H); c.globalAlpha = 1; if (spec.mid) { const S_ = P.scratch('ln_mid'), g = S_.getContext('2d'); g.reset(); spec.mid(g, lt); c.drawImage(S_, -3, 2); } }
    for (const k of ['light', 'rust']) {
      if (!spec[k]) continue;
      const S_ = P.scratch('ln_' + k), g = S_.getContext('2d'); g.reset(); spec[k](g, lt);
      c.save(); c.globalAlpha = 0.97; c.drawImage(S_, reg[k][0], reg[k][1]); c.restore();
    }
    const B = P.scratch('ln_black'), bg = B.getContext('2d'); bg.reset();
    bg.drawImage(P.cached('ln_key_' + spec.key, W, H, (g) => { g.fillStyle = C.ink; g.fillRect(0, 0, W, H); spec.black(g); }), 0, 0);
    bg.globalCompositeOperation = 'destination-out'; bg.fillStyle = '#000'; bg.beginPath(); spec.carve(bg, lt); bg.fill();
    bg.drawImage(starve(), 0, 0); bg.globalCompositeOperation = 'source-over';
    c.drawImage(B, 0, 0);
    if (spec.top) spec.top(c, lt);
    c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.55; c.drawImage(P.grain('ln', 0.06, [30, 20, 10], 0.2), 0, 0); c.restore();
  }
  /** the mask: magenta, a clean face, a cord — printed as a plate like everything else: a hair off register, starved of ink in places */
  function face(c, x, y, r, tilt = 0) {
    const S_ = P.scratch('ln_face'), g = S_.getContext('2d'); g.reset();
    const box = Math.ceil(r * 2.6);
    mask(g, box / 2, box / 2, r, C.mag, { glasses: false, led: false, tilt, strap: true, shade: false, face: C.face, ink: C.ink });
    g.globalCompositeOperation = 'destination-out'; g.drawImage(starve(), -x * 0.37 % 300, -y * 0.29 % 300); g.globalCompositeOperation = 'source-over';
    c.drawImage(S_, 0, 0, box, box, x - box / 2 + 2, y - box / 2 - 1, box, box);
  }
  /** a figure's coat, cut: ink, with long gouges down the side the light is on (side = -1 left, 1 right) */
  function coat(c, x, y, w, h, side, br = 0, col = C.ochreD) {
    c.fillStyle = C.ink; c.beginPath(); c.moveTo(x - w * 1.1, y + h); c.lineTo(x - w, y + h * 0.22); c.quadraticCurveTo(x - w * 0.8, y + h * 0.06, x, y + br); c.quadraticCurveTo(x + w * 0.8, y + h * 0.06, x + w, y + h * 0.22); c.lineTo(x + w * 1.1, y + h); c.closePath(); c.fill();
    c.fillStyle = col; c.beginPath();
    for (let k = 0; k < 9; k++) { const q = k / 8, cx = x + side * w * (0.25 + q * 0.8); gouge(c, cx, y + h * (0.1 + 0.12 * (1 - q)), cx + side * w * 0.12, y + h - 30, 2 + q * 7); }
    gouge(c, x + side * w * 0.2, y + 8, x + side * w * 0.95, y + h * 0.2, 6);
    c.fill();
    c.fillStyle = C.midL; c.beginPath(); for (let k = 0; k < 4; k++) { const cx = x - side * w * (0.2 + k * 0.18); gouge(c, cx, y + h * 0.3, cx - side * 8, y + h - 40, 3); } c.fill();
  }
  /**
   * the CARVING pass, the method that replaced plate-by-plate cutting: paint the scene flat in light-ish fall
   * colours (Hopper's flat masses), then lay ink over it in rows of gouge marks whose WIDTH follows how dark the
   * painting is there — solid where it is dark, slits of colour in the mid-tones, nothing at all on the lights.
   * angle(x, y) turns the rows to follow the form (water flat, coats down, planks across). Ink is starved in places.
   */
  function engrave(c, src, { cell = 16, len = 2.9, angle = () => 0, seed = 1, t = 0, boil = 6, lo = 0.3, span = 0.52 } = {}) {
    const d = src.getContext('2d').getImageData(0, 0, W, H).data, r = U.rng(seed * 997 + Math.floor(t * boil));
    const I = P.scratch('ln_ink'), g = I.getContext('2d'); g.reset(); g.fillStyle = C.ink; g.beginPath();
    for (let row = 0, y = cell / 2; y < H + cell; y += cell, row++) for (let x = -cell + (row % 2) * cell * len * 0.45; x < W + cell; x += cell * len * 0.9) {
      const px = clamp((x + (r() - 0.5) * cell * 0.9) | 0, 0, W - 1), py = clamp((y + (r() - 0.5) * cell * 0.35) | 0, 0, H - 1), i = (py * W + px) * 4;
      const L = (0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255, k = clamp((1 - L - lo) / span, 0, 1);
      if (k < 0.05) continue;
      const a = angle(px, py) + (r() - 0.5) * 0.12, hl = cell * len * 0.5 * (0.65 + r() * 0.7), w = k * cell * 1.12 * (0.9 + r() * 0.2), ca = Math.cos(a), sa = Math.sin(a);
      gouge(g, px - ca * hl, py - sa * hl, px + ca * hl, py + sa * hl, w);
    }
    g.fill();
    g.globalCompositeOperation = 'destination-out'; g.drawImage(starve(), 0, 0); g.globalCompositeOperation = 'source-over';
    c.drawImage(I, 0, 0);
  }
  /** paint(g, lt) flat → carve over it → top(c, lt) clean on top (masks, type, rain glints, leaves) → grain */
  function cut(c, lt, { paint, angle, top, cell = 16, seed = 1 }) {
    const S_ = P.scratch('ln_paint'), g = S_.getContext('2d'); g.reset(); paint(g, lt);
    c.drawImage(S_, 0, 0);
    engrave(c, S_, { cell, angle, seed, t: lt });
    if (top) top(c, lt);
    c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.5; c.drawImage(P.grain('ln', 0.06, [30, 20, 10], 0.2), 0, 0); c.restore();
  }
  /** rain as glints of paper, slanted, falling */
  function glints(c, lt, n, ang, sp, seed, col = 'rgba(220,210,180,.55)') { c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); const r = U.rng(seed); for (let i = 0; i < n; i++) { const x = r() * (W + 400) - 100, len = 40 + r() * 60, y = ((lt * sp * (0.8 + r() * 0.4) + r() * 2300) % 2300) - 200; c.moveTo(x, y); c.lineTo(x - len * ang, y + len); } c.stroke(); }
  return { C, W, H, TAU, gouge, sweep, rays, rain, leaf, print, face, coat, engrave, cut, glints };
})();
