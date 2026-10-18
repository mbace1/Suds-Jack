// Shot 2 · How. The main breakers for the city, in front of it: BANKS, INTERNET, POWER, WATER. On "cyberattack" the
// LEDs stutter and the whole skyline flickers; then, as the second line reads them off, the breakers drop one by one
// and each district goes dark behind its own word, until only the moon is left.
SCENES['dy_fuse'] = (() => {
  const { stack, box, put } = RFP, D = DY, ID = 'dy_fuse', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tC = D.at(ID, 'cyber', 1.0), tL = D.at(ID, 'list', 3.0), dur = D.dur(ID);
      const lever = [0, 1, 2, 3].map((i) => D.ease.out((lt - tL - i * 0.34) / 0.16));
      const stut = lt > tC && lt < tC + 0.5 ? (Math.sin(lt * 70) > 0 ? 1 : 0.35) : 1;
      const on = lever.map((v) => clamp(1 - v * 1.25, 0, 1) * stut);
      const cam = { x: Math.sin(lt * 0.35) * 6, y: 0, z: D.punch(lt, [tC, tL + 1.02]) * lerp(1.0, 1.04, D.ease.io(lt / dur)), fx: 540, fy: 1200 };
      stack(c, [
        { sh: D.night(), d: 0.03, lift: 0 },
        { sh: D.city(), d: 0.08, lift: 0.8 },
        { fn: (g, ox) => D.lights(g, on, lt, ox), d: 0.08 },
        { fn: (g, ox) => { put(g, D.boxBody(), 540 + ox, 1380, { lift: 1.6 }); D.breakers(g, 540 + ox, 1380, lever, lt);
          if (lt > tC && lt < tC + 0.45) { const r = U.rng(Math.floor(lt * 30)); g.strokeStyle = '#ffe9a8'; g.lineWidth = 4; for (let i = 0; i < 9; i++) { const x = 540 + ox + (r() - 0.5) * 600, y = 1150 + r() * 60; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y - 30 - r() * 40); g.stroke(); } }
        }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
