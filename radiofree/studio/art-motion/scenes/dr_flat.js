// Shot 1 · 0–6.4 s · The flat. Kallio at dusk through a big window — the church tower, the
// roofs, rain on the glass — and a lit tram sliding past. Inside: the sofa, Toko on it,
// the lamp, the hound asleep on the rug, and on the shelf a small white camera whose red
// light wakes and starts to blink.
SCENES['dr_flat'] = (() => {
  const { K, W, H, stack, box, put, glow, ease, move, walker } = RFP, D = DR, { clamp, lerp } = U;
  const B = 60 / 112, T_WAKE = 2 * B;
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 10, y: 0, z: move(lt, 0, 6.4, 1.0, 1.07), fx: 880, fy: 1100 };
      const tx = lerp(-520, 1600, clamp((lt - 0.3) / 3.8, 0, 1));
      stack(c, [
        { sh: D.city(), d: 0.04, lift: 0 },
        { fn: (g, ox) => put(g, D.tram(), tx + ox, 1035, { lift: 0.3 }), d: 0.06 },
        { fn: (g, ox) => D.rain(g, lt, ox), d: 0.12 },
        { sh: D.room(), d: 0.12, lift: 0.8 },
        { fn: (g, ox) => {
          glow(g, 150 + ox, 760, 520, 'rgba(240,170,70,', 0.32);
          put(g, D.lamp(), 150 + ox, 1560, { lift: 1.2 });
          put(g, D.shelf(), 880 + ox, 1180, { lift: 1.2 }); D.cam(g, 900 + ox, 1180, lt, lt > T_WAKE ? 1 : 0);
          put(g, D.rug(), 620 + ox, 1660, { lift: 0.4 });
          D.asleep(g, 770 + ox, 1720, 0.78, lt);
        }, d: 0.2 },
        { fn: (g, ox) => {
          put(g, D.sofaBack(), 360 + ox, 1460, { lift: 1.2 });
          walker(g, 360 + ox, 1170, 0.78, { coat: '#3a3530', scarf: K.ochre, t: lt, tilt: Math.sin(lt * 0.8) * 0.04, look: 0.2, led: false, lift: 1.4 });   // one blinking light in the room: the camera's (review v3)
          put(g, D.sofaFront(), 360 + ox, 1460, { lift: 1.6 });
        }, d: 0.28 },
      ], cam);
      box(c);
    },
  };
})();
