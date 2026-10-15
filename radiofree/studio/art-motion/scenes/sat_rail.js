// Shot 4 · 19.3–25.7 s · The exception. A costume rail of faces — people's faces are Toko masks in
// carrier colours — each with its © tag. In the middle hangs a plain card mask on a stick; its tag
// flips over: SATIRE ✓ PARODY ✓. The camera leans in on it.
SCENES['sat_rail'] = (() => {
  const { W, H, stack, put, glow, ease, move } = RFP, S = SAT, C = S.C, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B, RY = 800, T_FLIP = 3 * B;
  const HANG = [[210, RFM.S.GREEN], [375, RFM.S.SKY], [540, null], [705, RFM.S.ORANGE], [870, RFM.S.PURPLE]];
  return {
    draw(c, lt) {
      const kf = clamp((lt - T_FLIP) / 0.45, 0, 1), fa = ease.back(kf) * Math.PI, kz = ease.out(clamp((lt - (T_FLIP + 0.3)) / 2.2, 0, 1));
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: 1 };
      c.save(); S.view(c, lerp(1.0, 1.32, kz), lerp(540, 540, kz), lerp(1250, 1260, kz), 540, lerp(1250, 1180, kz));
      stack(c, [
        { sh: S.wardrobe(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { glow(g, 540 + ox, 1000, 620, 'rgba(255,200,120,', 0.22); }, d: 0.05 },
        { sh: S.rail(RY), d: 0.14, lift: 0.8 },
        { fn: (g, ox) => {
          HANG.forEach(([x, col], i) => {
            const sw = Math.sin(lt * 1.3 + i * 1.7) * 0.035 + (i === 2 && lt > T_FLIP ? Math.exp(-(lt - T_FLIP) * 3) * Math.sin((lt - T_FLIP) * 11) * 0.05 : 0);
            g.save(); g.translate(x + ox, RY - 20); g.rotate(sw);
            put(g, S.hanger(), 0, 0, { lift: 0.8 });
            g.strokeStyle = C.inkL; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 60); g.lineTo(0, col ? 120 : 92); g.stroke();
            if (col) {
              S.person(g, 0, 190, 72, col);
              g.save(); g.translate(0, 262); g.rotate(-sw * 2); put(g, S.ctag(80, 60), 0, 0, { lift: 0.9 }); g.restore();
            } else {
              put(g, S.face('plain', true), 0, 200, { sc: 0.66, lift: 1.1 });
              // the tag on the stick: flips over to show what the bill leaves open
              const k = Math.cos(fa), back = k < 0;
              g.save(); g.translate(14, 370); g.rotate(-sw * 2); g.scale(Math.max(0.02, Math.abs(k)) * (1 + 0.12 * Math.sin(kf * Math.PI)), 1 + 0.12 * Math.sin(kf * Math.PI));
              put(g, back ? S.ctag(300, 150, ['SATIRE', 'PARODY']) : S.ctag(110, 80), 0, 0, { lift: 1.2 + Math.sin(kf * Math.PI) * 1.5 });
              g.restore();
            }
            g.restore();
          });
        }, d: 0.2 },
      ], cam);
      c.restore();
      S.box(c);
    },
  };
})();
