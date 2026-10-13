// Shot 1 · 0–6.4 s · The hold, October 2025. Kajaani at night: a site hoarding with
// Doodle's board on it, a chain-link gate in the middle, two tower cranes standing idle
// over the cleared ground behind. A sign drops onto the gate on two chains — ON HOLD —
// and swings; on the beat a padlock snaps shut on the latch. The cranes' red lights
// blink; nothing else moves. Lit from a street lamp on the right, so the sign is the
// brightest card in the box.
SCENES['doh_gate'] = (() => {
  const { K, W, H, sheet, stack, box, dusk, put, glow, ease, move, pop, leaves } = RFP, { C, row } = BDF, D = DOH, { clamp, lerp } = U;
  const B = 60 / 112, T_SIGN = B, T_LOCK = 3 * B, SX = 540, SY = 1190;
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 12, y: 0, z: move(lt, 0, 6.4, 1.0, 1.1), fx: SX, fy: SY };
      // the sign: dropped from above on its chains, a bounce, then a slowing swing
      const k = clamp((lt - 0.1) / (T_SIGN - 0.1), 0, 1), drop = k * k;
      const sy = lerp(-300, SY, drop) + (lt > T_SIGN ? Math.sin((lt - T_SIGN) * 15) * Math.exp(-(lt - T_SIGN) * 5) * 22 : 0);
      const sw = lt > T_SIGN ? Math.sin((lt - T_SIGN) * 3.1) * 0.07 * Math.exp(-(lt - T_SIGN) * 0.5) : 0;
      stack(c, [
        { sh: dusk('doh', 1150), d: 0.04, lift: 0 },
        { sh: row('doh_far', 1170, 16, 300, C.far, null, 41), d: 0.1, lift: 0.4 },
        { fn: (g, ox) => { D.crane(g, 200 + ox, 1190, 500, 470, 0.15, lt); D.crane(g, 880 + ox, 1200, 420, 400, Math.PI - 0.25, lt + 0.4); }, d: 0.14 },
        { sh: D.site(), d: 0.2, lift: 0.4 },
        { fn: (g, ox) => {
          // the two leaves, shut, and the chained sign hanging on them
          put(g, D.leaf(1), D.GX0 + ox, D.GY1, { lift: 0.6 }); put(g, D.leaf(-1), D.GX1 + ox, D.GY1, { lift: 0.6 });
          const hx0 = SX - 160 + ox, hx1 = SX + 160 + ox, top = D.GY0 + 30;
          if (lt > 0.1) {
            const a = [-160, -72], b = [160, -72];                                                      // the sign's two holes
            const ca = Math.cos(sw), sa = Math.sin(sw), P = ([x, y]) => [SX + ox + x * ca - y * sa, sy + x * sa + y * ca];
            const pa = P(a), pb = P(b);
            D.chain(g, hx0, top, pa[0], pa[1]); D.chain(g, hx1, top, pb[0], pb[1]);
            put(g, D.sign(), SX + ox, sy, { rot: sw, lift: 2 });
          }
          const kl = pop(lt, T_LOCK, 0.22); if (kl > 0) put(g, D.padlock(), SX + ox, 1330, { sc: kl, rot: 0.05, lift: 1.4 });
        }, d: 0.3 },
        { sh: D.hoarding(), d: 0.3, lift: 1.2 },
        { fn: (g, ox) => {
          glow(g, 980 + ox, 760, 520, 'rgba(240,170,70,', 0.22);                                           // the street lamp, off the frame's right
          glow(g, SX + ox, SY, 380, 'rgba(240,170,70,', 0.2);
        }, d: 0.3 },
        { sh: D.road(), d: 0.4, lift: 0.6 },
      ], cam);
      leaves(c, lt + 3, { n: 6, seed: 91, cam });
      D.tag(c, '10.2025 · KAJAANI · MUHOS', 110, 1690, D.tagA(lt, 6.43));
      box(c);
    },
  };
})();
