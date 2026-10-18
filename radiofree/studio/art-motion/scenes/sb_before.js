// Shot 3 · Courts have ruled before. The board, and two exhibits pinned up under it in turn: Philipon's own
// four-head king-to-pear sketch from his 1831 trial (on "guilty" a GUILTY stamp, and COURTS flips to 1), then a
// blank 1988 liquor-ad poster with its small print (on "protected" a PROTECTED stamp, and SATIRE flips to 1). The
// two hits land under half a second apart, so both exhibits stay up side by side: the verdicts are read together.
SCENES['sb_before'] = (() => {
  const { stack, box, put } = RFP, D = SB, ID = 'sb_before', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tP = D.at(ID, 'pear', 0.5), tG = D.at(ID, 'guilty', 2.2), tA = D.at(ID, 'ad', 2.8), tR = D.at(ID, 'protected', 3.8), dur = D.dur(ID);
      const kp = D.ease.back((lt - tP) / 0.5), ka = D.ease.back((lt - (tA - 0.2)) / 0.5);
      const S = D.punch(lt, [tG, tR]), cam = { x: Math.sin(lt * 0.4) * 5, y: 0, z: 1 };
      c.save(); c.translate(540, 980); c.scale(S, S); c.translate(-540, -980);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g) => D.daylight(g, lt, 0.8), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => D.board(g, lt, { courts: [0, 1, (lt - tG) / 0.3], satire: [0, 1, (lt - tR) / 0.3] }, { x: D.BX + ox, y: D.BY - 40, sc: 0.84 }), d: 0.14 },
        { sh: D.bench(), d: 0.24, lift: 1.1 },
        { fn: (g, ox) => {
          if (kp > 0) { const x = 318 + ox, y = 1110 + (1 - kp) * 700, sc = 0.6;
            put(g, D.pearStrip(), x, y, { sc, rot: -0.05, lift: 1.3 }); D.stamp(g, 'GUILTY', D.C.red, x, y + 20, lt - tG, { sc: 0.6, rot: -0.12 }); }
          if (ka > 0) { const x = 790 + ox, y = 1110 + (1 - ka) * 800;
            put(g, D.adPoster(), x, y, { sc: 0.8, rot: 0.05, lift: 1.3 }); D.stamp(g, 'PROTECTED', D.C.green, x, y - 20, lt - tR, { w: 520, sc: 0.62, rot: 0.1 }); }
        }, d: 0.3 },
      ], cam);
      c.restore();
      const ui = D.FP.ui; CW.tag(c, lt < tA ? (ui.tagParis || 'PARIS · 14.11.1831') : (ui.tagWashington || 'US SUPREME COURT · 1988'), lt < tA ? lt : lt - tA + 0.5, lt < tA ? tA + 0.3 : dur - tA + 0.5);
      box(c);
    },
  };
})();
