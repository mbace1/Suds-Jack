// Shot 4 · 19.3–25.7 s · The look. Toko, phone lowered, turns to the hound; the hound looks
// back and tilts its head — once, and again. Nothing else happens, on purpose.
SCENES['dr_look'] = (() => {
  const { K, W, H, sheet, stack, box, put, glow, ease, move, walker } = RFP, D = DR, { clamp, lerp } = U;
  const B = 60 / 112, T_TURN = B, T_TILT1 = 3 * B, T_TILT2 = 6 * B;
  const tilt = (lt, t0) => { const k = (lt - t0) / 0.9; return k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.55 : 0; };
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.4) * 8, y: 0, z: move(lt, 0, 6.4, 1.04, 1.0), fx: 540, fy: 1200 };
      const turn = ease.out(clamp((lt - T_TURN) / 0.4, 0, 1));
      stack(c, [
        { sh: sheet('dr_lookwall', (g) => { g.fillStyle = D.C.wall; g.fillRect(-90, -90, W + 180, 1500); g.fillStyle = 'rgba(255,240,210,.03)'; for (let x = -90; x < W + 90; x += 70) g.fillRect(x, -90, 28, 1500); g.fillStyle = D.C.trim; g.fillRect(-90, 1384, W + 180, 22); g.fillStyle = D.C.floor; g.fillRect(-90, 1400, W + 180, H); }), d: 0.08, lift: 0 },
        { fn: (g, ox) => { glow(g, 120 + ox, 700, 620, 'rgba(240,170,70,', 0.36); put(g, D.lamp(), 110 + ox, 1520, { lift: 1 }); put(g, D.rug(), 560 + ox, 1760, { sc: 1.2, lift: 0.4 }); }, d: 0.14 },
        { fn: (g, ox) => {
          walker(g, 400 + ox, 930, 1.3, { coat: '#3a3530', scarf: K.ochre, t: lt, look: lerp(0, 0.5, turn), tilt: lerp(0, 0.34, turn) + Math.sin(lt * 0.7) * 0.02, led: false, lift: 1.6 });   // the mask tips down towards the dog
          D.dog(g, 780 + ox, 1770, 1.25, { dir: -1, t: lt, tilt: tilt(lt, T_TILT1) - tilt(lt, T_TILT2) * 0.8, look: -0.32 });   // head up, at the mask
        }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
