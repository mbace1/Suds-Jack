// Shot 6 · 32.1–37.5 s · The fine print. Back in the living room, the ad ends on its last card: the flag,
// a band of stars, and the disclaimer — PAID FOR BY, then a name too small to read. The camera leans in
// to read it, and on every half-beat it shrinks, and shrinks, until it is a dot. The dot shivers, rolls
// off the card, drops out of the TV, bounces along the sideboard, falls to the floor and rolls under
// the rug. A lump crosses the rug and stops. (The station's joke: it asked not to be mentioned.)
SCENES['pfb_dot'] = (() => {
  const { stack, ease } = RFP, F = PFB, { clamp, lerp } = U, C = F.C, TAU = Math.PI * 2;
  const B = 60 / 112, DUR = 10 * B;
  const STEPS = [1.5, 2, 2.5, 3, 3.5].map((b) => b * B), SIZES = [1, 0.72, 0.5, 0.32, 0.18, 0.05];
  const T_FREE = 4.5 * B, T_STOP = 9 * B, R = F.DOT.r;
  const X0 = F.SCR.x + F.DOT.x * F.SCR.w / 688, Y0 = F.SCR.y + F.DOT.y * F.SCR.h / 388;   // where the fine print sits, in the room
  const SB = 1182 - R, FL = 1446 - R;                                                     // the dot resting on the sideboard, on the floor
  /** the fine print's scale: a quick step down on every half-beat */
  function scale(lt) { let s = 1; STEPS.forEach((t, i) => { const k = ease.out((lt - t) / 0.12); s = lerp(s, SIZES[i + 1], clamp(k, 0, 1)); }); return s; }
  /** the dot, once it is free: where it is, how far it has rolled, whether it is resting on something */
  const SEGS = [
    [T_FREE, 0.4, (u) => [X0 + 150 * u * u, Y0, true]],                                 // rolls off along the card
    [T_FREE + 0.4, 0.28, (u) => [X0 + 150 + 110 * u, Y0 + (SB - Y0) * u * u, false]],    // drops out of the TV
    [T_FREE + 0.68, 0.3, (u) => [X0 + 260 + 120 * u, SB - 56 * 4 * u * (1 - u), u > 0.92]], // bounces on the sideboard
    [T_FREE + 0.98, 0.1, (u) => [X0 + 380 + 60 * u, SB, true]],                          // rolls to its end
    [T_FREE + 1.08, 0.38, (u) => [X0 + 440 + 30 * u, SB + (FL - SB) * u * u, false]],    // falls to the floor
    [T_FREE + 1.46, 0.2, (u) => [X0 + 470 - 10 * u, FL + 28 * u - 22 * 4 * u * (1 - u), u > 0.9]],   // a small bounce
    [T_FREE + 1.66, 0.3, (u) => [X0 + 460 - 54 * u, FL + 28 + 92 * u, true]],           // and away, under the rug
  ];
  function dotAt(lt) {
    let p = null, dist = 0;
    for (const [t0, d, f] of SEGS) { const u = clamp((lt - t0) / d, 0, 1); const q = f(u); if (p) dist += Math.hypot(q[0] - p[0], q[1] - p[1]) * (q[2] ? 1 : 0.3); p = q; if (lt < t0 + d) break; }
    return { x: p[0], y: p[1], rest: p[2], rot: dist / R, sc: 1 + clamp((p[1] - SB) / (FL - SB + 120), 0, 1) * 0.12 };
  }
  function ball(g, d) {
    const r = R * d.sc;
    if (d.rest) { g.fillStyle = 'rgba(20,14,8,.3)'; g.beginPath(); g.ellipse(d.x + 6, d.y + r * 0.95, r * 1.1, r * 0.32, 0, 0, TAU); g.fill(); }
    g.fillStyle = C.navy; g.beginPath(); g.arc(d.x, d.y, r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(248,242,228,.85)'; g.beginPath(); g.arc(d.x + Math.cos(d.rot) * r * 0.55, d.y + Math.sin(d.rot) * r * 0.55, r * 0.18, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.arc(d.x - r * 0.35, d.y - r * 0.38, r * 0.3, 0, TAU); g.fill();
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 6, y: 0, z: 1 };
      // the camera: leans in to read the fine print; follows the dot down; settles on the rug
      const kin = U.ease.inOut(clamp((lt - STEPS[0]) / (STEPS[4] + 0.15 - STEPS[0]), 0, 1));
      const kb = U.ease.inOut(clamp((lt - T_FREE - 0.05) / 1.0, 0, 1)), kc = U.ease.inOut(clamp((lt - T_FREE - 1.0) / 0.8, 0, 1)), kd = U.ease.inOut(clamp((lt - T_FREE - 1.85) / 0.75, 0, 1));
      const z = lerp(lerp(lerp(lerp(1.35, 1.75, kin), 1.2, kb), 1.2, kc), 1.2, kd), px = lerp(lerp(lerp(X0, 770, kb), 740, kc), 600, kd), py = lerp(lerp(lerp(Y0, 1290, kb), 1380, kc), 1343, kd);   // ends wide enough for the whole TV, its card now blank, under the captions, and the lump below
      const s = scale(lt), free = lt >= T_FREE, jx = lt > T_FREE - 0.22 && !free ? Math.sin(lt * 90) * 2.2 : 0;
      const ks = clamp((lt - (T_FREE + 1.88)) / 0.08, 0, 1), kl = ease.out((lt - (T_FREE + 1.9)) / (T_STOP - T_FREE - 1.9));
      const lx = lerp(F.RUG.x + 368, 640, kl), ly = lerp(F.RUG.y + 2, F.RUG.y + 10, kl), sq = lt > T_STOP ? Math.exp(-(lt - T_STOP) * 6) * Math.sin((lt - T_STOP) * 22) * 0.35 : 0;
      c.save(); F.view(c, z, px, py);
      stack(c, F.room({
        screen: (g, w, h) => F.endCard(g, w, h, lt, s, !free, jx),
        dot: (g) => { if (free && lt < T_FREE + 1.98) ball(g, dotAt(lt)); },
        lump: (g) => { if (ks > 0) F.lump(g, lx, ly, ks, sq); },
        sofaDy: 560,   // the sofa and its viewer stay out of this shot: the camera ends low on the floor
      }), cam);
      c.restore();
      F.box(c);
    },
  };
})();
