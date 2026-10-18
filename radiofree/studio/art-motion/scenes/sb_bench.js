// Shot 2 · The bench. The courtroom bench, and above it the scoreboard lighting bulb by bulb: COURTS 0 · SATIRE 0,
// CASES IN THIS FILM. On "courts" the gavel strikes once and the board's bulbs jump.
SCENES['sb_bench'] = (() => {
  const { stack, box, put } = RFP, D = SB, ID = 'sb_bench', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tL = D.at(ID, 'lights', 0.4), tG = D.at(ID, 'gavel', 2.0), dur = D.dur(ID);
      const lit = clamp((lt - tL) / 1.2, 0, 1), up = clamp((tG - lt) / 0.35, 0, 1), gr = lt < tG ? -0.6 * D.ease.out(1 - up) : Math.sin((lt - tG) * 40) * 0.03 * Math.exp(-(lt - tG) * 8);
      const kz = D.ease.io(lt / dur), S = lerp(1.0, 1.06, kz) * D.punch(lt, [tG]), cam = { x: Math.sin(lt * 0.4) * 5, y: 0, z: 1 };
      c.save(); c.translate(540, 980); c.scale(S, S); c.translate(-540, -980);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g) => D.daylight(g, lt, 0.8), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => D.board(g, lt, { courts: [0, 0, 1], satire: [0, 0, 1] }, { lit, x: D.BX + ox }), d: 0.14 },
        { sh: D.bench(), d: 0.24, lift: 1.1 },
        { fn: (g, ox) => { put(g, CW.block(), 760 + ox, 1262, { sc: 0.6, lift: 1.1 }); put(g, CW.gavel(300), 760 + ox + 150, 1210, { sc: 0.6, rot: -0.1 + gr, lift: 1.4 }); }, d: 0.26 },
      ], cam);
      c.restore();
      box(c);
    },
  };
})();
