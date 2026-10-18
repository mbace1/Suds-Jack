// Shot 3 · 1988: a TV preacher and a parody ad. The blank liquor-ad poster with the small print it really carried
// (never the parody's content), pinned up big. On "satire" a green PROTECTED stamp lands, and SATIRE flips to 1.
SCENES['sb_ad'] = (() => {
  const { stack, box, put } = RFP, D = SB, ID = 'sb_ad', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tA = D.at(ID, 'ad', 0.4), tV = D.at(ID, 'verdict', 2.6), dur = D.dur(ID);
      const ka = D.ease.back((lt - tA) / 0.5), S = D.punch(lt, [tV]) * lerp(1, 1.04, D.ease.io(lt / dur)), cam = { x: Math.sin(lt * 0.4) * 5, y: 0, z: 1 };
      c.save(); c.translate(540, 1000); c.scale(S, S); c.translate(-540, -1000);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g) => D.daylight(g, lt, 0.8), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => D.board(g, lt, { satire: [0, 1, (lt - tV) / 0.3], power: [1, 1, 1] }, { x: D.BX + ox, y: D.BY - 40, sc: 0.84 }), d: 0.14 },
        { sh: D.bench(), d: 0.24, lift: 1.1 },
        { fn: (g, ox) => { if (ka > 0) { const y = 1160 + (1 - ka) * 900; put(g, D.adPoster(), 540 + ox, y, { sc: 0.92, rot: 0.03, lift: 1.3 }); D.stamp(g, 'PROTECTED', D.C.green, 540 + ox, y - 30, lt - tV, { w: 520, sc: 0.8, rot: 0.08 }); } }, d: 0.3 },
      ], cam);
      c.restore();
      CW.tag(c, D.FP.ui.tagWashington || 'US SUPREME COURT · 1988', lt, dur);
      box(c);
    },
  };
})();
