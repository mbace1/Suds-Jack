// Shot 1 · The bill, and the question (v2). The empty board hangs over the bench, dark. Below it a paper phone shows
// a blank paper head (nobody's face): an AI stamp lands, and a red BANNED band slides across it. A jester's mask
// slides in beside it, and on "exempts satire" a green tag flips up on it: SATIRE: EXEMPT. Then the board lights up,
// bulb by bulb — SATIRE 0 · THE POWERFUL 0 — and on "wins" the bulbs jump. Tag: DENMARK · BILL L 49.
SCENES['sb_bill'] = (() => {
  const { stack, box, put } = RFP, D = SB, ID = 'sb_bill', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tP = D.at(ID, 'phone', 0.3), tS = D.at(ID, 'stamp', 1.4), tE = D.at(ID, 'exempt', 2.6), tL = D.at(ID, 'lights', 3.0), tW = D.at(ID, 'wins', 4.2), dur = D.dur(ID);
      const kp = D.ease.back((lt - tP) / 0.5), kb = D.ease.out((lt - tS - 0.25) / 0.45), km = D.ease.back((lt - (tE - 0.6)) / 0.5), kq = D.ease.back((lt - tE) / 0.3);
      const lit = clamp((lt - tL) / 1.0, 0, 1), flash = lt > tW ? 1 + 0.6 * Math.exp(-(lt - tW) * 5) * Math.abs(Math.sin((lt - tW) * 30)) : 1;
      const S = D.punch(lt, [tS, tE, tW]), cam = { x: Math.sin(lt * 0.4) * 6, y: 0, z: 1 };
      c.save(); c.translate(540, 1000); c.scale(S, S); c.translate(-540, -1000);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g) => D.daylight(g, lt, 0.9), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => D.board(g, lt, { satire: [0, 0, 1], power: [0, 0, 1] }, { lit: Math.min(1, lit * flash), x: D.BX + ox, y: D.BY + 50, sc: 0.74 }), d: 0.14 },
        { sh: D.bench(), d: 0.24, lift: 1.1 },
        { fn: (g, ox) => {
          if (kp > 0) D.phone(g, 330 + ox, 1125 + (1 - kp) * 900, lt, lt < tS ? 1 : 0.4, { sc: 0.82, rot: -0.04 });
          D.stamp(g, 'AI', '#24364a', 345 + ox, 985, lt - tS, { w: 170, rot: -0.12, sc: 0.85 });
          if (kb > 0) { g.save(); g.translate(330 + ox, 1125); g.rotate(-0.22); g.fillStyle = D.C.red; g.fillRect(-170, -36, 340 * kb, 72); g.fillStyle = '#fff'; g.font = '50px "Anton-400"'; g.textBaseline = 'middle'; g.save(); g.beginPath(); g.rect(-170, -36, 340 * kb, 72); g.clip(); g.fillText('BANNED', -88, 4); g.restore(); g.restore(); }
          if (km > 0) {
            const mx = lerp(1300, 770, km) + ox, wob = lt > tE ? Math.sin((lt - tE) * 14) * 0.08 * Math.exp(-(lt - tE) * 3) : 0;
            put(g, D.mask(), mx, 1060, { rot: -0.05 + wob, sc: 1.05, lift: 1.3 });
            if (kq > 0) { g.save(); g.translate(mx, 1225); g.rotate(0.05 + wob); g.scale(kq, kq); g.font = '34px "ArchivoBlack-400"'; const t = D.FP.ui.exempt || 'SATIRE: EXEMPT', w = g.measureText(t).width + 50;
              g.fillStyle = D.C.green; g.beginPath(); g.roundRect(-w / 2, -32, w, 64, 10); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, 0, 3); g.restore(); }
          }
        }, d: 0.3 },
      ], cam);
      c.restore();
      CW.tag(c, D.FP.ui.tagBill || 'DENMARK · BILL L 49 · 8.10.2026', lt, dur);
      box(c);
    },
  };
})();
