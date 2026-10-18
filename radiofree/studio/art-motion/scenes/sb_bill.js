// Shot 1 · The bill. A paper phone shows a blank paper head (nobody's face); an AI stamp lands on it and a red
// BANNED band slides across it. Then a jester's mask swings in on a hook beside it, and on "satire" a paper tag
// flips up on the mask: "?". Nobody has said who decides. Tag: BILL L 49 · FOLKETINGET.
SCENES['sb_bill'] = (() => {
  const { stack, box, put } = RFP, D = SB, ID = 'sb_bill', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tP = D.at(ID, 'phone', 0.3), tS = D.at(ID, 'stamp', 1.6), tM = D.at(ID, 'mask', 2.6), dur = D.dur(ID);
      const kp = D.ease.back((lt - tP) / 0.5), kb = D.ease.out((lt - tS - 0.25) / 0.45), km = D.ease.back((lt - (tM - 0.9)) / 0.6), kq = D.ease.back((lt - tM) / 0.3);
      const S = D.punch(lt, [tS, tM]), cam = { x: Math.sin(lt * 0.4) * 6, y: 0, z: 1 };
      c.save(); c.translate(540, 1000); c.scale(S, S); c.translate(-540, -1000);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g) => D.daylight(g, lt, 0.9), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => {
          if (kp > 0) D.phone(g, 360 + ox, 1060 + (1 - kp) * 900, lt, lt < tS ? 1 : 0.4, { rot: -0.04 });
          D.stamp(g, 'AI', '#24364a', 380 + ox, 900, lt - tS, { w: 170, rot: -0.12 });
          if (kb > 0) { g.save(); g.translate(360 + ox, 1060); g.rotate(-0.22); g.fillStyle = D.C.red; g.fillRect(-190, -40, 380 * kb, 80); g.fillStyle = '#fff'; g.font = '56px "Anton-400"'; g.textBaseline = 'middle'; g.save(); g.beginPath(); g.rect(-190, -40, 380 * kb, 80); g.clip(); g.fillText('BANNED', -100, 4); g.restore(); g.restore(); }
          if (km > 0) {
            const sw = Math.sin((lt - tM + 0.9) * 5) * 0.12 * Math.exp(-(lt - tM + 0.9) * 1.5);
            g.strokeStyle = '#2b2f31'; g.lineWidth = 3; g.beginPath(); g.moveTo(760 + ox, 640); g.lineTo(760 + ox + Math.sin(sw) * 200, 840 - (1 - km) * 400); g.stroke(); D.hook(g, 760 + ox, 640);
            put(g, D.mask(), 760 + ox + Math.sin(sw) * 260, 960 - (1 - km) * 400, { rot: sw, sc: 1.1, lift: 1.3 });
            if (kq > 0) { g.save(); g.translate(760 + ox + Math.sin(sw) * 260 + 130, 1080 - (1 - km) * 400); g.rotate(0.1 + sw); g.scale(kq, kq);
              g.fillStyle = D.C.cream; g.beginPath(); g.roundRect(-46, -50, 92, 100, 8); g.fill(); g.fillStyle = D.C.ink; g.font = '84px "Anton-400"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 6); g.restore(); }
          }
        }, d: 0.2 },
        { sh: D.bench(), d: 0.24, lift: 1.1 },
      ], cam);
      c.restore();
      CW.tag(c, D.FP.ui.tagBill || 'BILL L 49 · FOLKETINGET · 8.10.2026', lt, dur);
      box(c);
    },
  };
})();
