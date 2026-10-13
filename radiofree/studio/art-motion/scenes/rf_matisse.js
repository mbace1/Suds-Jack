// C · Matisse cut-outs — "everything you look at floats up into the glasses".
// Portrait 1080×1920. Composition (new): a cut-paper street seen from behind a
// black paper figure (Matisse's Icarus silhouette, here a man walking away from
// us — no face exists to draw); two big yellow paper rings at the top are the
// glasses' view; what he looks at — a cake, a dog, a bird — lifts off the street
// on pinned price tags and drifts up into the rings.
// Technique from 30_matisse: scissor-cut polylines (P.cut), saturated flat paper,
// pinned-paper drop shadows, algae shapes as a union of round-ended fingers.
// Warm palette on purpose: the deliver gate counts blue-purple frames.
// Main action: the three things lift and drift into the rings, one after another.
// Motif loops: algae sway, yellow stars spin-twinkle, the figure's stride.
SCENES['rf_matisse'] = (() => {
  const W = 1080, H = 1920, P = PAINT, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { bg: '#f2a03d', wall1: '#e8452f', wall2: '#f7d13b', wall3: '#1f9a5a', pink: '#f39ab8', ink: '#141210', paper: '#fbf3e2', cobalt: '#1d55c4', green: '#1f9a5a', leaf: '#2fb36a', orange: '#e2741c' };
  const ease = (k) => (k = clamp(k, 0, 1), k * k * (3 - 2 * k));
  const cut = (pts, seed, step = 18, amp = 2.4) => P.cut(pts, seed, step, amp);
  const pin = (c, fn) => { c.save(); c.shadowColor = 'rgba(40,20,10,.32)'; c.shadowOffsetX = 6; c.shadowOffsetY = 7; c.shadowBlur = 5; fn(); c.restore(); };
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const circle = (cx, cy, r, n = 28) => Array.from({ length: n }, (_, i) => [cx + Math.cos(i / n * TAU) * r, cy + Math.sin(i / n * TAU) * r]);

  // algae: a tapering stem with alternating round-ended fingers, one union path
  function algae(x, y, len, w, lobes, seed, bend) {
    const p = new Path2D(), r = U.rng(seed);
    const cap = (A, th, L, ww) => { const d = [Math.sin(th), -Math.cos(th)], n = [-d[1], d[0]], T = [A[0] + d[0] * (L - ww / 2), A[1] + d[1] * (L - ww / 2)], pts = [];
      pts.push([A[0] + n[0] * ww * 0.42, A[1] + n[1] * ww * 0.42]);
      for (let k = 0; k <= 8; k++) { const a = Math.atan2(n[1], n[0]) - k / 8 * Math.PI; pts.push([T[0] + Math.cos(a) * ww / 2, T[1] + Math.sin(a) * ww / 2]); }
      pts.push([A[0] - n[0] * ww * 0.42, A[1] - n[1] * ww * 0.42]); return pts; };
    p.addPath(cut(cap([x, y], bend, len, w * 0.5), seed, 14, 1.6));
    for (let i = 0; i < lobes * 2; i++) {
      const u = (i + 1) / (lobes * 2 + 1), A = [x + Math.sin(bend) * len * u, y - Math.cos(bend) * len * u], side = i % 2 ? 1 : -1;
      p.addPath(cut(cap(A, bend + side * (1.05 - 0.55 * u), w * (1 - 0.45 * u), w * (0.34 - 0.12 * u)), seed + i + 1, 12, 1.4));
    }
    return p;
  }

  const bg = () => P.cached('rfm_bg', W, H, (g) => {
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    // the facades: three tall cut sheets with black window squares
    const fac = [[40, 520, 330, 900, C.wall1, 11], [380, 600, 320, 820, C.wall2, 12], [710, 470, 340, 950, C.pink, 13]];
    for (const [x, y, w, h, col, s] of fac) {
      pin(g, () => { g.fillStyle = col; g.fill(cut(rect(x, y, w, h), s, 22, 2.6)); });
      for (let r = 0; r < 4; r++) for (let q = 0; q < 2; q++) { g.fillStyle = (r + q + s) % 3 ? C.ink : C.cobalt; g.fill(cut(rect(x + 50 + q * (w / 2 - 20), y + 70 + r * 170, w / 2 - 90, 110), s * 10 + r * 2 + q, 16, 2)); }
    }
    // the street: a green band, with white paper zigzag tram rails
    pin(g, () => { g.fillStyle = C.green; g.fill(cut(rect(-20, 1410, W + 40, 530), 21, 26, 3)); });
    g.fillStyle = C.paper; for (const y of [1560, 1640]) g.fill(cut(rect(-20, y, W + 40, 14), y, 30, 2));
    g.drawImage(P.grain('rfm', 0.04, [80, 50, 20], 0.12), 0, 0);
  });

  // the three things he looks at, each a cut shape with a pinned white price tag
  function cake(c, x, y, s) { const g = (p, col, sd) => { c.fillStyle = col; c.fill(cut(p, sd, 12, 1.6)); };
    pin(c, () => { g(rect(x - 90 * s, y - 70 * s, 180 * s, 70 * s), C.pink, 31); g(rect(x - 60 * s, y - 130 * s, 120 * s, 60 * s), C.paper, 32); g(circle(x, y - 150 * s, 20 * s, 14), C.wall1, 33); }); }
  function dog(c, x, y, s) { pin(c, () => { c.fillStyle = C.orange; c.fill(cut([[x - 110 * s, y], [x - 100 * s, y - 70 * s], [x + 40 * s, y - 80 * s], [x + 60 * s, y - 130 * s], [x + 120 * s, y - 120 * s], [x + 130 * s, y - 70 * s], [x + 100 * s, y - 50 * s], [x + 90 * s, y], [x + 60 * s, y], [x + 50 * s, y - 40 * s], [x - 60 * s, y - 40 * s], [x - 70 * s, y]], 41, 14, 2));
    c.fillStyle = C.ink; c.fill(cut(circle(x + 100 * s, y - 104 * s, 9 * s, 8), 42, 8, 1)); }); }
  function bird(c, x, y, s, t) { const f = Math.cos(t * 13) * 0.45 + 0.55; pin(c, () => { c.fillStyle = C.paper;
    c.fill(cut([[x - 90 * s, y - 60 * s * f], [x - 20 * s, y - 6 * s], [x + 20 * s, y - 6 * s], [x + 90 * s, y - 60 * s * f], [x + 40 * s, y + 20 * s], [x - 40 * s, y + 20 * s]], 51, 12, 1.6)); }); }
  function tag(c, x, y, text, rot) { c.save(); c.translate(x, y); c.rotate(rot);
    pin(c, () => { c.fillStyle = C.paper; c.fill(cut([[-80, -26], [62, -26], [86, 0], [62, 26], [-80, 26]], 61 + text.length, 12, 1.4)); });
    c.fillStyle = C.ink; c.font = '34px "AlfaSlabOne-400"'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, -6, 2);
    c.fillStyle = C.wall1; c.beginPath(); c.arc(70, 0, 6, 0, TAU); c.fill(); c.restore(); }

  return {
    draw(c, lt, t) {
      c.drawImage(bg(), 0, 0);
      // the glasses' view: two yellow paper rings and a bridge, at the top
      pin(c, () => {
        c.fillStyle = C.wall2;
        for (const cx of [300, 780]) { const ring = new Path2D(); ring.addPath(cut(circle(cx, 250, 210, 40), cx, 18, 2.2)); ring.addPath(cut(circle(cx, 250, 160, 34).reverse(), cx + 1, 16, 2)); c.fill(ring, 'nonzero'); }
        c.fill(cut(rect(500, 220, 80, 34), 71, 14, 1.4));
      });
      // stars twinkle (motif loop)
      for (let k = 0; k < 7; k++) {
        const r = U.rng(80 + k), x = 80 + r() * 920, y = 440 + r() * 200, s = 0.82 + 0.22 * Math.sin(7 * lt + 1.9 * k);
        c.save(); c.translate(x, y); c.rotate(lt * 0.8 + k); c.scale(s, s); c.fillStyle = C.wall2;
        const pts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, rr = i % 2 ? 11 : 26; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
        c.fill(cut(pts, 90 + k, 8, 1.2)); c.restore();
      }
      // algae at both edges, swaying like paper on pins (motif loop)
      for (const [x, y, len, w, seed, ph] of [[60, 1930, 520, 230, 5, 0], [1030, 1930, 460, 210, 6, 1.7]]) {
        c.save(); c.translate(x, y); c.rotate(Math.sin(2.8 * lt + ph) * 0.13); c.translate(-x, -y);
        pin(c, () => { c.fillStyle = seed === 5 ? C.leaf : C.cobalt; c.fill(algae(x, y, len, w, 4, seed, seed === 5 ? 0.25 : -0.3)); }); c.restore();
      }
      // MAIN ACTION — each thing lifts off the street and drifts up into a ring
      const things = [
        { draw: cake, from: [220, 1470], to: [300, 260], at: 0.3, tag: '$ORDERED', rot: -0.1 },
        { draw: dog, from: [860, 1520], to: [780, 290], at: 1.1, tag: 'VET · TUE', rot: 0.12 },
        { draw: bird, from: [560, 760], to: [540, 120], at: 1.9, tag: 'FLIGHTS?', rot: -0.05 },
      ];
      for (const th of things) {
        const k = ease((lt - th.at) / 1.6), x = lerp(th.from[0], th.to[0], k) + Math.sin(lt * 3 + th.at) * 18 * (1 - k), y = lerp(th.from[1], th.to[1], k);
        const s = lerp(1, 0.62, k);
        th.draw(c, x, y, s, lt);
        if (lt > th.at) tag(c, x + 40, y + 46 * s, th.tag.replace('$', ''), th.rot);
      }
      // the man from behind: a black paper silhouette walking away, glasses arms showing
      const step = Math.sin(lt * 2 * Math.PI * 0.9), bob = Math.abs(step) * 10;
      pin(c, () => {
        c.fillStyle = C.ink;
        const cx = 540, top = 1180 + bob;
        c.fill(cut(circle(cx, top, 70, 26), 101, 14, 1.8));                                            // head
        c.fill(cut([[cx - 120, top + 70], [cx + 120, top + 70], [cx + 150, top + 360], [cx - 150, top + 360]], 102, 18, 2.2)); // coat
        for (const [sx, sw] of [[-1, step], [1, -step]]) c.fill(cut([[cx + sx * 40 - 34, top + 350], [cx + sx * 40 + 34, top + 350], [cx + sx * 40 + 34 + sw * 30, top + 600], [cx + sx * 40 - 34 + sw * 30, top + 600]], 103 + sx, 16, 1.8));
        for (const [sx, sw] of [[-1, -step], [1, step]]) c.fill(cut([[cx + sx * 120, top + 90], [cx + sx * 150, top + 90], [cx + sx * 170 + sw * 20, top + 320], [cx + sx * 140 + sw * 20, top + 320]], 105 + sx, 16, 1.6));
        c.fillStyle = C.wall2; for (const sx of [-1, 1]) c.fill(cut(rect(cx + sx * 60 - (sx > 0 ? 0 : 20), top - 14, 20, 10), 107 + sx, 8, 0.8));  // the glasses' arms
      });
    },
  };
})();
