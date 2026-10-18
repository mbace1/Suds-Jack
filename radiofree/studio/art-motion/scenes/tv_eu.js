// Shot 5 · The EU. Back to Berlin's phone, the paper chancellor talking again. On "need a label" the big yellow
// label comes down from above, as it did in California; on "spoil the joke" it shrinks, and shrinks, to a small AI
// tag in the screen's corner — a TV channel's corner bug — and the jaw keeps going. Labelled, and the joke intact.
SCENES['tv_eu'] = (() => {
  const { box } = RFP, D = TV, ID = 'tv_eu', { clamp, lerp } = U, BUG = [540 + 150 * 1.1, 1010 - 330 * 1.1];
  return {
    draw(c, lt) {
      const tL = D.at(ID, 'labelled', 1.4), tP = D.at(ID, 'light', 2.4), dur = D.dur(ID);
      const kd = clamp((lt - tL) / 0.45, 0, 1), ks = D.ease.io(clamp((lt - tP + 0.05) / 0.4, 0, 1));
      const z = D.punch(lt, [tP]) * lerp(1.0, 1.05, D.ease.io(lt / dur));
      c.save(); c.translate(540, 1050); c.scale(z, z); c.translate(-540, -1050);
      D.table(c, Math.sin(lt * 0.3) * 6);
      D.phone(c, 540, 1010, lt, clamp(lt / 0.3, 0, 1), { sc: 1.1, rot: -0.03 });
      if (ks < 1 && kd > 0) { const hov = lt < tP ? 0.25 + 0.75 * (1 - D.ease.out(kd)) : 0; c.save(); c.globalAlpha = 1 - ks * 0.6;
        D.sticker(c, lerp(540, BUG[0], ks), lerp(980, BUG[1], ks), 1, 0, { sc: lerp(1.05 + hov * 0.4, 0.25, ks), rot: lerp(-0.07, 0, ks) }); c.restore(); }
      if (ks > 0.6) D.bug(c, BUG[0] - 18, BUG[1] + 12, 1.55 * D.ease.back((ks - 0.6) / 0.4));
      c.restore();
      CW.tag(c, D.ui('tagEU', 'EU AI ACT · ART. 50 · 2.8.2026'), lt, dur);
      box(c);
    },
  };
})();
