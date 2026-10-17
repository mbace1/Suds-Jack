// Shot 3 · The insurance. Down at the tabletop, the screen above it: a fat binder, CATASTROPHE INSURANCE, slides
// in from the left and stops dead against the monitor's stand; a few pages jump out of it and float down. On
// "specifics" the call buffers again and the signal drops to one bar.
SCENES['ct_binder'] = (() => {
  const { stack, box, put } = RFP, D = CT, ID = 'ct_binder', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tP = D.at(ID, 'push', 0.55), tH = D.at(ID, 'hit', 1.35), tS = D.at(ID, 'shrug', 2.5), dur = D.dur(ID);
      const kp = clamp((lt - tP) / (tH - tP), 0, 1), bx = lt < tH ? lerp(-200, 412, kp * kp) : 412 - 34 * Math.sin(Math.min(1, (lt - tH) / 0.3) * Math.PI * 0.5) * Math.exp(-(lt - tH) * 2.2) - 10 * (1 - Math.exp(-(lt - tH) * 3));
      const shake = lt > tH ? Math.sin((lt - tH) * 34) * 0.02 * Math.exp(-(lt - tH) * 6) : 0;
      const S = 1.6 * D.punch(lt, [tH, tS], { open: 0.05, kick: 0.04 }), cam = { x: Math.sin(lt * 0.5) * 4, y: 0, z: 1, fx: 540, fy: 1250 };
      c.save(); c.translate(540, 1250); c.scale(S, S); c.translate(-540, -1250);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0, soft: 2.5 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doors(g, 1, lt); g.restore(); }, d: 0.05 },
        { sh: D.floor(), d: 0.1, lift: 0, soft: 1.5 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doorLight(g, 1, lt); g.restore(); }, d: 0.1 },
        { fn: (g, ox) => {
          put(g, D.chair(), 540 + ox, 1362, { lift: 1.2 }); put(g, D.cart(), 540 + ox, 1700, { rot: shake * 0.5, lift: 1.2 });
          D.screen(g, 540 + ox, 1112, 'tile', lt + 3, { chip: 1, q: lt > tS ? 1 : 2, spinner: lt > tS ? clamp((lt - tS) / 0.2, 0, 1) : 0 });
        }, d: 0.2 },
        { sh: D.table(), d: 0.22, lift: 1.1 },
        { fn: (g, ox) => {
          put(g, D.binder(), bx + ox, 1360, { sc: 0.6, rot: shake, lift: 1.0 });
          if (lt > tH) for (let i = 0; i < 3; i++) {                                          // pages jump out and settle
            const k = (lt - tH - i * 0.05) / 1.6; if (k <= 0 || k > 1) continue;
            const px = bx + ox + 40 + i * 50 + Math.sin(k * 9 + i) * 40 * k, py = 1300 - Math.sin(k * Math.PI) * (90 + i * 30) + k * 60;
            put(g, D.page(), px, py, { sc: 0.42, rot: Math.sin(k * 7 + i * 2) * 0.6, lift: 1.4 * (1 - k) + 0.3 });
          }
          CW.mic(g, 760 + ox, 1352, lt, 1, 0.8);
        }, d: 0.22 },
      ], cam);
      c.restore();
      box(c);
    },
  };
})();
