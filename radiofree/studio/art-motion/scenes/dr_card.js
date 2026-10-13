// Shot 6 · 32.1–37.5 s · Early access. The room again, wider and later: the rain, Toko
// dozing on the sofa, the hound asleep on the rug. The camera's light wakes once more; on the
// last hit its brackets close round the sleeping dog and the label lands: DEER.
SCENES['dr_card'] = (() => {
  const { K, W, H, stack, box, put, glow, ease, move, pop, walker } = RFP, D = DR, { clamp, lerp } = U;
  const B = 60 / 112, T_HIT = 3.0;
  return {
    draw(c, lt) {
      const snap = clamp((lt - (T_HIT - 0.15)) / 0.15, 0, 1);
      const cam = { x: Math.sin(lt * 0.4) * 8, y: 0, z: move(lt, 0, 3.0, 1.06, 1.0) * (lt < T_HIT ? 1 : 1 + 0.05 * Math.exp(-(lt - T_HIT) * 6)), fx: 760, fy: 1500 };
      stack(c, [
        { sh: D.city(), d: 0.04, lift: 0 },
        { fn: (g, ox) => D.rain(g, lt + 9, ox), d: 0.12 },
        { sh: D.room(), d: 0.12, lift: 0.8 },
        { fn: (g, ox) => {
          glow(g, 150 + ox, 760, 520, 'rgba(240,170,70,', 0.26);
          put(g, D.lamp(), 150 + ox, 1560, { lift: 1.2 });
          put(g, D.shelf(), 880 + ox, 1180, { lift: 1.2 }); D.cam(g, 900 + ox, 1180, lt, lt > T_HIT - 0.6 ? 1 : 0.4);
          put(g, D.rug(), 620 + ox, 1660, { lift: 0.4 });
          D.asleep(g, 770 + ox, 1720, 0.78, lt);
        }, d: 0.2 },
        { fn: (g, ox) => {
          put(g, D.sofaBack(), 360 + ox, 1460, { lift: 1.2 });
          walker(g, 360 + ox, 1180, 0.78, { coat: '#3a3530', scarf: K.ochre, t: lt, tilt: 0.32 + Math.sin(lt * 1.1) * 0.03, look: -0.1, led: false, lift: 1.4 });   // dozing: head over, its light off
          put(g, D.sofaFront(), 360 + ox, 1460, { lift: 1.6 });
        }, d: 0.28 },
        { fn: (g, ox) => {
          // the camera's frame and its label, over everything: the dog is clear of the sofa now
          if (snap > 0) { const L = lerp(1.3, 1, ease.out(snap)); D.brackets(g, 770 - 200 * L + ox, 1610 - 140 * L, 770 + 210 * L + ox, 1735 + 30 * L, L); }
          D.label(g, 'DEER', 770 + ox, 1520, 1.5 * pop(lt, T_HIT, 0.25));
        }, d: 0.2 },
      ], cam);
      box(c);
    },
  };
})();
