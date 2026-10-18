// Shot 4 · 2024, AI fakes. Two exhibits from the AI era, no face in either: a phone whose blank paper head talks
// through a cut-out mouth (Berlin; on "the government won" a red BLOCKED stamp, THE POWERFUL flips to 2), and a
// cardboard campaign speaker sending out a cloned voice (California; on "satire" a green PROTECTED, SATIRE to 2).
SCENES['sb_fakes'] = (() => {
  const { stack, box, put } = RFP, D = SB, ID = 'sb_fakes', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tP = D.at(ID, 'phone', 0.4), tN = D.at(ID, 'no', 2.0), tY = D.at(ID, 'yes', 3.4), dur = D.dur(ID);
      const kp = D.ease.back((lt - tP) / 0.5), ks = D.ease.back((lt - (tN + 0.3)) / 0.5);
      const S = D.punch(lt, [tN, tY]), cam = { x: Math.sin(lt * 0.4) * 5, y: 0, z: 1 };
      c.save(); c.translate(540, 980); c.scale(S, S); c.translate(-540, -980);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g) => D.daylight(g, lt, 0.8), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => D.board(g, lt, { satire: [1, 2, (lt - tY) / 0.3], power: [1, 2, (lt - tN) / 0.3] }, { x: D.BX + ox, y: D.BY - 40, sc: 0.84 }), d: 0.14 },
        { sh: D.bench(), d: 0.24, lift: 1.1 },
        { fn: (g, ox) => {
          if (kp > 0) { D.phone(g, 300 + ox, 1060 + (1 - kp) * 900, lt, lt < tN ? 1 : 0.15, { sc: 0.8, rot: -0.05 }); D.stamp(g, 'BLOCKED', D.C.red, 300 + ox, 1060, lt - tN, { w: 420, sc: 0.62, rot: -0.14 }); }
          if (ks > 0) { D.speaker(g, 780 + ox, 1290 + (1 - ks) * 900, lt, 1, { sc: 0.9 }); D.stamp(g, 'PROTECTED', D.C.green, 790 + ox, 1060, lt - tY, { w: 520, sc: 0.56, rot: 0.1 }); }
        }, d: 0.3 },
      ], cam);
      c.restore();
      const ui = D.FP.ui, split = (tN + tY) / 2 + 0.2;
      CW.tag(c, lt < split ? (ui.tagBerlin || 'LANDGERICHT BERLIN · 2024') : (ui.tagCalifornia || 'US DISTRICT COURT, CALIFORNIA · 2024'), lt < split ? lt : lt - split + 0.5, lt < split ? split + 0.3 : dur - split + 0.5);
      box(c);
    },
  };
})();
