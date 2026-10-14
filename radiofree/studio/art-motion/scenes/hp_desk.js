// Shot 2 · 6.4–12.9 s · The Daily Show, 5 October. A late-night desk against a New York
// skyline; two silhouettes at it, rimmed in studio light — no faces. Above them a paper globe
// turns slowly, held up in one small hand: the choice, and how few hold it.
SCENES['hp_desk'] = (() => {
  const { K, W, H, stack, box, put, glow, ease, move } = RFP, D = HP, { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, 0, 6.4, 1.0, 1.06), fx: 540, fy: 1000 };
      const rise = ease.out(clamp((lt - 0.4) / 1.0, 0, 1));
      stack(c, [
        { sh: D.studio(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { glow(g, 540 + ox, 980, 620, 'rgba(240,170,70,', 0.26); glow(g, 180 + ox, 1300, 380, 'rgba(120,160,220,', 0.12); glow(g, 900 + ox, 1300, 380, 'rgba(120,160,220,', 0.12); }, d: 0.05 },
        { fn: (g, ox) => { put(g, D.silhouette(1, 0), 300 + ox, 1440, { lift: 1.6 }); put(g, D.silhouette(-1, 2), 790 + ox, 1440, { sc: 0.96, lift: 1.6 }); }, d: 0.2 },
        { fn: (g, ox) => {
          // the hand comes down from above the frame — someone else's — and later lifts the globe higher, out of reach
          const lift = ease.out(clamp((lt - 3.4) / 1.6, 0, 1)), y = lerp(-200, 960, rise) - lift * 170 + Math.sin(lt * 1.4) * 6;
          D.globe(g, 540 + ox, y, 120, lt * 0.5);
          put(g, D.reach('#23272b', 0.5), 540 + ox, y - 150, { sc: 0.7, rot: Math.PI + Math.sin(lt * 0.9) * 0.02, lift: 1.4 });
        }, d: 0.25 },
        { sh: D.desk(), d: 0.3, lift: 1.4 },
      ], cam);
      box(c);
    },
  };
})();
