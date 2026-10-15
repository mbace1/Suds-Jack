// Shot 2 · 6.4–12.9 s · The wall. The living-room TV, still playing its ad, shrinks into one slot of a
// wall of small screens, and the others come on around it in a ripple — 95 TVs, each a different ad
// (11 rows of 8 and a row of 7), each with its own strip of fine print. Then a brass tick lands on
// every one, top to bottom: the New York Times reviewed all 95.
SCENES['pfb_wall'] = (() => {
  const { stack, put, pop, sprite } = RFP, F = PFB, { clamp, lerp } = U, C = F.C;
  const DUR = 12 * 60 / 112, T0 = 0.3, T1 = 1.5, T_TICK = 3.3;
  const H0 = { x: 540, y: 974, w: 743, h: 417 }, hq = F.GRID[F.HERO];
  const ON = F.GRID.map((q) => 1.05 + Math.hypot((q.k - hq.k) * 1.1, q.r - hq.r) * 0.17);
  const TICK = F.GRID.map((q, i) => T_TICK + (i / F.GRID.length) * 1.7);
  const tickMark = () => sprite('pfb_tick', 40, 40, 20, 20, (g) => {
    g.fillStyle = C.brass; g.beginPath(); g.arc(0, 0, 16, 0, Math.PI * 2); g.fill();
    g.strokeStyle = C.navy; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-7, 0); g.lineTo(-2, 6); g.lineTo(8, -6); g.stroke();
  }, 3);
  const tick = (g, i, x, y, lt) => { const p = pop(lt, TICK[i], 0.22); if (p > 0) put(g, tickMark(), x + 42, y - 27, { sc: p, lift: 0.5, alpha: 0.35 }); };
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: 1 };
      const kh = U.ease.inOut(clamp((lt - T0) / (T1 - T0), 0, 1));
      const hx = lerp(H0.x, hq.x, kh), hy = lerp(H0.y, hq.y, kh), hw = lerp(H0.w, 92, kh), hh = lerp(H0.h, 62, kh);
      stack(c, [
        { sh: F.wallpaper(), d: 0.03, lift: 0, soft: 1 },
        { sh: F.bunting(), d: 0.2, lift: 0.7, alpha: 0.35 },
        { fn: (g, ox, oy) => F.wall(g, ox, oy, (i) => {
          if (i === F.HERO) return null;
          const p = pop(lt, ON[i], 0.3); if (p <= 0) return null;
          return { sc: p, flash: clamp(1 - (lt - ON[i]) / 0.35, 0, 1) * 0.85, over: (gg, x, y) => tick(gg, i, x, y, lt) };
        }), d: 0.08 },
        { fn: (g, ox, oy) => { F.heroScreen(g, hx + ox, hy + oy, hw, hh, lt + DUR); if (kh >= 1) tick(g, F.HERO, hx + ox, hy + oy, lt); }, d: 0.08 },
      ], cam);
      F.box(c);
    },
  };
})();
