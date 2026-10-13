// Shared kit for "You Looked At It" (Constructivist poster × Helsinki autumn).
// One palette, one paper, one way to make a photo (grey source → 45° halftone →
// white cut edge), one rain, one leaf, one way to draw a person from behind.
// Every shot draws only through these, so the film stays one style.
window.RFA = (() => {
  const W = 1080, H = 1920, P = PAINT, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { paper: '#e9dfc4', cream: '#f4ecd6', ink: '#151311', sub: '#6b6458', red: '#c8231c', ruska: '#d9a21b' };
  const ease = (k) => (k = clamp(k, 0, 1), k * k * (3 - 2 * k));
  const eout = (k) => 1 - (1 - clamp(k, 0, 1)) ** 3;
  const pop = (k) => { k = clamp(k, 0, 1); const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
  const BEAT = 60 / 112;

  /** aged poster paper with stains and grain — the ground of every shot */
  const paper = (key = 'a') => P.cached('rfa_paper_' + key, W, H, (g) => {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    const r = U.rng(key.charCodeAt(0) * 31);
    for (let i = 0; i < 1100; i++) { g.fillStyle = `rgba(120,90,40,${r() * 0.055})`; g.beginPath(); g.arc(r() * W, r() * H, 2 + r() * 24, 0, TAU); g.fill(); }
    g.drawImage(P.grain('rfa_' + key, 0.05, [80, 60, 20], 0.14), 0, 0);
  });

  /** a grey "photograph" turned to a halftone print with a white cut edge; cached */
  function print(key, w, h, paintGrey, { cell = 6, gain = 0.82, edge = 6, col = C.ink } = {}) {
    return P.cached('rfa_print_' + key, w + edge * 4, h + edge * 4, (g) => {
      const src = P.cached('rfa_src_' + key, w, h, (s) => paintGrey(s, w, h));
      const ht = P.canvas(w, h), hg = ht.getContext('2d');
      P.halftoneGray(hg, src, 0, 0, w, h, cell, col, gain);
      // the white cut edge: the photo's own silhouette, grown, in cream
      if (edge) { g.filter = `drop-shadow(0 0 ${edge}px ${C.cream}) drop-shadow(0 0 ${edge / 2}px ${C.cream})`; g.drawImage(src, edge * 2, edge * 2); g.filter = 'none';
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = C.cream; g.fillRect(0, 0, w + edge * 4, h + edge * 4); g.globalCompositeOperation = 'source-over'; }
      g.drawImage(ht, edge * 2, edge * 2);
    });
  }

  /** drizzle: thin ink strokes on a slant, positions a pure function of t */
  function rain(c, t, { n = 110, alpha = 0.35, seed = 3, slant = 0.22, speed = 1500 } = {}) {
    c.save(); c.strokeStyle = C.ink; c.lineWidth = 2; c.globalAlpha = alpha; c.beginPath();
    const r = U.rng(seed);
    for (let i = 0; i < n; i++) {
      const x0 = r() * (W + 400) - 200, ph = r(), len = 30 + r() * 50, y = ((t * speed * (0.8 + r() * 0.4) + ph * (H + 200)) % (H + 200)) - 100;
      const x = x0 - (y + 100) * slant; c.moveTo(x, y); c.lineTo(x - len * slant, y + len);
    }
    c.stroke(); c.restore();
  }

  /** a birch leaf: a halftoned ochre oval with a stalk and a midrib, cut from paper */
  function leafPath(s = 1) {
    const p = new Path2D(); p.moveTo(0, -30 * s); p.bezierCurveTo(24 * s, -22 * s, 26 * s, 14 * s, 0, 30 * s); p.bezierCurveTo(-26 * s, 14 * s, -24 * s, -22 * s, 0, -30 * s); p.closePath(); return p;
  }
  function leaf(c, x, y, s, rot, flip = 1) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(flip, 1);
    const p = leafPath(s);
    c.fillStyle = C.ruska; c.fill(p);
    c.save(); c.clip(p); c.fillStyle = P.dotPattern(c, 'rfa_leafdots', 9, 2.4, '#a8740c'); c.fillRect(-40 * s, -40 * s, 80 * s, 80 * s); c.restore();
    c.strokeStyle = C.ink; c.lineWidth = 2.2 * s; c.beginPath(); c.moveTo(0, -30 * s); c.lineTo(0, 30 * s); c.lineTo(0, 44 * s); c.stroke();
    c.restore();
  }
  /** a deterministic fall of n leaves across the frame */
  function leaves(c, t, { n = 14, seed = 9, size = 1, y0 = -80, speed = 160 } = {}) {
    const r = U.rng(seed);
    for (let i = 0; i < n; i++) {
      const bx = r() * W, ph = r(), sp = speed * (0.7 + r() * 0.6), s = size * (0.7 + r() * 0.7);
      const y = ((t * sp + ph * (H + 300)) % (H + 300)) + y0;
      const x = bx + Math.sin(t * 1.3 + i * 1.7) * 60;
      const flip = Math.cos(t * 2.2 + i) ; leaf(c, x, y, s, Math.sin(t * 1.7 + i) * 1.2, flip);
    }
  }

  /** stamped words: each letter lands big and settles, at `at` + i·gap */
  function stamp(c, text, x, y, size, lt, at, { col = C.ink, red = [], gap = 0.06, font = 'Anton-400', rot = 0, align = 'left' } = {}) {
    c.save(); c.translate(x, y); c.rotate(rot); c.font = `${size}px "${font}"`; c.textBaseline = 'alphabetic';
    let w = 0; const ws = [...text].map((ch) => { const m = c.measureText(ch).width; w += m; return m; });
    let cx = align === 'center' ? -w / 2 : 0;
    [...text].forEach((ch, i) => {
      const k = clamp((lt - at - i * gap) / 0.12, 0, 1);
      if (k > 0) { const s = lerp(1.7, 1, k); c.save(); c.translate(cx + ws[i] / 2, -size * 0.35); c.scale(s, s); c.translate(-ws[i] / 2, size * 0.35);
        c.fillStyle = red.includes(i) ? C.red : col; c.globalAlpha = clamp(k * 3, 0, 1); c.fillText(ch, 0, 0); c.restore(); }
      cx += ws[i];
    });
    c.restore();
    return w;
  }

  /**
   * A person from behind, Constructivist cut-paper: a head (hair, ears), a
   * coat, the yellow arms of the glasses. `turn` -1..1 turns the head (the
   * ears and the glasses' arms slide, the hair mass shifts), `bob` lifts.
   */
  function back(c, x, y, s, { coat = C.ink, hair = '#2a221c', hat = null, turn = 0, bob = 0, umbrella = false, t = 0, step = 0, led = false } = {}) {
    c.save(); c.translate(x, y - bob); c.scale(s, s);
    // legs, if walking
    c.fillStyle = C.ink;
    for (const [sx, sw] of [[-1, step], [1, -step]]) { c.beginPath(); c.moveTo(sx * 30 - 22, 260); c.lineTo(sx * 30 + 22, 260); c.lineTo(sx * 30 + 22 + sw * 24, 420); c.lineTo(sx * 30 - 22 + sw * 24, 420); c.closePath(); c.fill(); }
    // coat: a trapezoid with shoulders, a red seam down the back
    c.fillStyle = coat; c.beginPath(); c.moveTo(-70, 30); c.quadraticCurveTo(-112, 40, -118, 110); c.lineTo(-132, 290); c.lineTo(132, 290); c.lineTo(118, 110); c.quadraticCurveTo(112, 40, 70, 30); c.closePath(); c.fill();
    c.fillStyle = C.red; c.fillRect(-4, 60, 8, 230);
    // neck, head
    c.fillStyle = '#c9b49a'; c.fillRect(-24, 0, 48, 40);
    c.save(); c.translate(turn * 10, 0);
    c.fillStyle = hair; c.beginPath(); c.ellipse(0, -36, 58, 66, 0, 0, TAU); c.fill();
    // ears slide with the turn: the far one hides, the near one shows more
    c.fillStyle = '#c9b49a';
    for (const sx of [-1, 1]) { const vis = clamp(1 - sx * turn * 1.2, 0, 1); if (vis > 0.05) { c.beginPath(); c.ellipse(sx * (56 - turn * sx * 10), -30, 10 * vis, 18, 0, 0, TAU); c.fill(); } }
    // the glasses' arms: ochre bars over the ears; the led on the right temple
    c.fillStyle = C.ruska; for (const sx of [-1, 1]) { const vis = clamp(1 - sx * turn * 1.2, 0, 1); if (vis > 0.05) c.fillRect(sx * 50 - (sx > 0 ? 0 : 26 * vis), -44, 26 * vis, 9); }
    if (led) { const on = Math.floor(t * 4) % 2 === 0; c.fillStyle = on ? C.red : '#7a1510'; c.beginPath(); c.arc(64 - turn * 10, -40, 8, 0, TAU); c.fill(); }
    if (hat) { c.fillStyle = hat; c.beginPath(); c.ellipse(0, -76, 66, 16, 0, 0, TAU); c.fill(); c.fillRect(-44, -128, 88, 52); }
    c.restore();
    if (umbrella) { // a black Lissitzky half-disc on a cane
      c.fillStyle = C.ink; c.beginPath(); c.arc(0, -140, 230, Math.PI, 0); c.closePath(); c.fill();
      c.strokeStyle = C.paper; c.lineWidth = 3; for (let k = 1; k < 6; k++) { const a = Math.PI + k * Math.PI / 6; c.beginPath(); c.moveTo(0, -140); c.lineTo(Math.cos(a) * 230, -140 + Math.sin(a) * 230); c.stroke(); }
      c.strokeStyle = C.ink; c.lineWidth = 8; c.beginPath(); c.moveTo(0, -140); c.lineTo(0, 120); c.stroke();
    }
    c.restore();
  }

  /** a gloved hand (black leather, cut paper) — fingers curled round whatever it holds */
  function glove(c, x, y, s, rot = 0, { grip = 1 } = {}) {
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.fillStyle = C.ink;
    c.beginPath(); c.roundRect(-70, -10, 140, 110, 34); c.fill();                       // palm
    for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(-64 + i * 34, -10 - 70 * (1 - grip * 0.6), 30, 80, 15); c.fill(); }  // fingers
    c.beginPath(); c.roundRect(-110, 10, 60, 34, 17); c.fill();                          // thumb
    c.fillStyle = C.red; c.fillRect(-74, 96, 148, 28);                                    // cuff
    c.strokeStyle = C.sub; c.lineWidth = 3; c.beginPath(); c.moveTo(-40, 30); c.quadraticCurveTo(0, 50, 40, 30); c.stroke();  // a stitch line
    c.restore();
  }

  /** the glasses as a poster object: two circles and a bridge, optionally folded */
  function specs(c, x, y, s, { fold = 0, led = false, t = 0 } = {}) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const sep = lerp(150, 90, fold);
    c.lineWidth = 22; c.strokeStyle = C.ink;
    for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * sep, 0, 100, 100 * lerp(1, 0.35, fold), 0, 0, TAU); c.stroke(); }
    c.fillStyle = C.ink; c.fillRect(-sep + 100, -12, 2 * (sep - 100), 22);
    c.fillStyle = C.ruska; for (const sx of [-1, 1]) { c.save(); c.translate(sx * (sep + 100), 0); c.rotate(sx * lerp(0, 1.5, fold)); c.fillRect(sx > 0 ? 0 : -140, -8, 140, 16); c.restore(); }
    if (led) { const on = Math.floor(t * 4) % 2 === 0; c.fillStyle = on ? C.red : '#7a1510'; c.beginPath(); c.arc(sep + 92, -60, 16, 0, TAU); c.fill(); }
    c.restore();
  }

  return { W, H, C, TAU, BEAT, ease, eout, pop, paper, print, rain, leaf, leaves, stamp, back, glove, specs };
})();
