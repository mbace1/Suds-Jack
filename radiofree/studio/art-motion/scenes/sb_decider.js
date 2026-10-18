// Shot 5 · The decider. The board at two all. A new row slides in under it: DENMARK and a card. The pear from 1831
// is back, in the dock in front of the bench, and the gavel lifts and hovers. On "decider" the DENMARK card starts
// to spin, and it does not stop: the film ends before any court has ruled.
SCENES['sb_decider'] = (() => {
  const { stack, box, put } = RFP, D = SB, ID = 'sb_decider', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tR = D.at(ID, 'row', 0.6), tD = D.at(ID, 'decider', 2.0), dur = D.dur(ID);
      const kr = clamp((lt - tR) / 0.5, 0, 1), spin = lt > tD ? lt - tD : 0, gl = D.ease.out((lt - tR - 0.4) / 0.8), hover = Math.sin(lt * 3) * 0.03;
      const kz = D.ease.io(lt / dur), S = lerp(1.0, 1.05, kz) * D.punch(lt, [tD]), cam = { x: Math.sin(lt * 0.4) * 5, y: 0, z: 1 };
      c.save(); c.translate(540, 980); c.scale(S, S); c.translate(-540, -980);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g) => D.daylight(g, lt, 0.8), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.board(g, lt, { courts: [2, 2, 1], satire: [2, 2, 1] }, { x: D.BX, y: D.BY - 60, sc: 0.84 }); D.denmarkRow(g, lt, kr, spin); g.restore(); }, d: 0.14 },
        { sh: D.bench(), d: 0.24, lift: 1.1 },
        { fn: (g, ox) => { put(g, CW.block(), 780 + ox, 1262, { sc: 0.6, lift: 1.1 }); put(g, CW.gavel(300), 780 + ox + 150, 1210 - gl * 60, { sc: 0.6, rot: -0.1 - gl * 0.55 + hover, lift: 1.4 + gl }); }, d: 0.26 },
        { fn: (g, ox) => { put(g, D.dock(), 330 + ox, 1560, { lift: 1.2 }); put(g, D.pear(), 330 + ox, 1420 + Math.sin(lt * 2) * 3, { sc: 0.9, rot: Math.sin(lt * 1.3) * 0.03, lift: 1.4 }); }, d: 0.32 },
      ], cam);
      c.restore();
      box(c);
    },
  };
})();
