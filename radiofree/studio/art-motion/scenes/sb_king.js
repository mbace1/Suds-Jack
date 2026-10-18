// Shot 2 · 1831, Paris: a king. Philipon's own four-head sketch from his trial — the king's face turning into a pear
// — pinned up as the exhibit, big. On "the king" a red GUILTY stamp lands on it, and THE POWERFUL flips to 1.
SCENES['sb_king'] = (() => {
  const { stack, box, put } = RFP, D = SB, ID = 'sb_king', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tP = D.at(ID, 'pear', 0.4), tV = D.at(ID, 'verdict', 2.4), dur = D.dur(ID);
      const kp = D.ease.back((lt - tP) / 0.5), S = D.punch(lt, [tV]) * lerp(1, 1.04, D.ease.io(lt / dur)), cam = { x: Math.sin(lt * 0.4) * 5, y: 0, z: 1 };
      c.save(); c.translate(540, 1000); c.scale(S, S); c.translate(-540, -1000);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g) => D.daylight(g, lt, 0.8), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => D.board(g, lt, { satire: [0, 0, 1], power: [0, 1, (lt - tV) / 0.3] }, { x: D.BX + ox, y: D.BY - 40, sc: 0.84 }), d: 0.14 },
        { sh: D.bench(), d: 0.24, lift: 1.1 },
        { fn: (g, ox) => { if (kp > 0) { const y = 1110 + (1 - kp) * 800; put(g, D.pearStrip(), 540 + ox, y, { sc: 1.08, rot: -0.03, lift: 1.3 }); D.stamp(g, 'GUILTY', D.C.red, 560 + ox, y + 30, lt - tV, { sc: 0.85, rot: -0.1 }); } }, d: 0.3 },
      ], cam);
      c.restore();
      CW.tag(c, D.FP.ui.tagParis || 'PARIS · 14.11.1831', lt, dur);
      box(c);
    },
  };
})();
