// Shot 3 · 12.9–19.3 s · The witness. The council chamber from behind the witness table:
// Jacob Coxon's back and shoulders (a real person: no face, no mask), the microphone's red
// light, the masked council along the dais. On the wall a dial — LOSS OF CONTROL, 0 to 100 —
// and on the beat its needle swings past 50: more likely than not.
SCENES['cw_mic'] = (() => {
  const { K, W, H, stack, box, put, glow, ease, move } = RFP, D = CW, { clamp, lerp } = U;
  const B = 60 / 112, T_SWING = 4 * B;
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, 0, 6.4, 1.0, 1.06), fx: 540, fy: 900 };
      const k = clamp((lt - T_SWING) / 0.5, 0, 1), rot = lt < T_SWING ? -1.35 + Math.sin(lt * 1.3) * 0.03 : lerp(-1.35, 0.22, ease.back(k)) + Math.sin((lt - T_SWING) * 9) * 0.04 * Math.exp(-(lt - T_SWING) * 3);
      stack(c, [
        { sh: D.chamber(), d: 0.06, lift: 0 },
        { fn: (g, ox) => { glow(g, 540 + ox, 800, 520, 'rgba(240,170,70,', 0.2); put(g, D.dial(), 540 + ox, 860, { sc: 0.82, lift: 1.2 }); put(g, D.needle(), 540 + ox, 860, { sc: 0.82, rot, lift: 1.6 }); }, d: 0.1 },
        { fn: (g, ox) => D.council(g, lt, ox, 1170, 7, 0.46), d: 0.18 },
        { sh: D.dais(), d: 0.18, lift: 1.0 },
        { sh: D.table(), d: 0.35, lift: 1.2 },
        { fn: (g, ox) => { D.mic(g, 840 + ox, 1520, lt, 1, 1.1); put(g, D.backView(), 420 + ox, 1930, { sc: 1.12, rot: Math.sin(lt * 0.9) * 0.01, lift: 2.2 }); }, d: 0.5 },
      ], cam);
      // the house tag: who this is
      c.save(); c.font = '30px "ArchivoBlack-400"'; const t = 'WITNESS · JACOB COXON', w = c.measureText(t).width + 40; c.globalAlpha = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((5.83 - lt) / 0.3, 0, 1);
      c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 10; c.shadowOffsetX = 5; c.shadowOffsetY = 8; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(560, RFP.SAFE_B - 64, w, 64, 8); c.fill(); c.shadowColor = 'transparent'; c.fillStyle = K.ink; c.fillText(t, 580, RFP.SAFE_B - 20); c.restore();
      box(c);
    },
  };
})();
