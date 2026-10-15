// Shot 4 · 19.3–25.7 s · Seven. A yellow highlighter sweeps the wall row by row, looking for AI. Every
// screen it passes goes dark — except seven, which light up yellow and pop forward. Then the seven step
// out of the wall into one row across its middle, and count off one by one: 7 of 95.
SCENES['pfb_seven'] = (() => {
  const { stack, put, ease, pop, glow } = RFP, F = PFB, { clamp, lerp } = U, C = F.C;
  const DUR = 12 * 60 / 112, B = 60 / 112, T0 = 0.5, ROW = 0.18, X0 = 70, X1 = 1010, T_END = T0 + 12 * ROW;
  const T_OUT = 3.0, T_CNT = 4.0;
  const rowY = (r) => 728 + r * 86 + 37;
  const PASS = F.GRID.map((q) => { const u = (q.x - X0) / (X1 - X0); return T0 + q.r * ROW + (q.r % 2 ? 1 - u : u) * ROW; });
  const SLOT = F.AI.map((_, j) => ({ x: 540 + (j - 3) * 132, y: 1236 }));
  const isAI = new Set(F.AI);
  function pen(lt) {
    if (lt < T0) { const k = ease.out((lt - 0.05) / (T0 - 0.05)); return { x: lerp(-160, X0, k), y: rowY(0) - lerp(300, 0, k) }; }
    if (lt > T_END) { const k = clamp((lt - T_END) / 0.45, 0, 1); return { x: lerp(X0, 1240, k * k), y: rowY(11) + k * 300 }; }
    const s = (lt - T0) / ROW, r = Math.min(11, Math.floor(s)), u = Math.min(1, s - r);
    return { x: r % 2 ? lerp(X1, X0, u) : lerp(X0, X1, u), y: rowY(r) };
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5 + 2) * 8, y: 0, z: 1 };
      const p = pen(lt);
      stack(c, [
        { sh: F.wallpaper(), d: 0.03, lift: 0, soft: 1 },
        { sh: F.bunting(), d: 0.2, lift: 0.7, alpha: 0.35 },
        { fn: (g, ox, oy) => F.wall(g, ox, oy, (i) => (isAI.has(i) ? null : { sc: 1, dim: 0.62 * clamp((lt - PASS[i]) / 0.3, 0, 1) })), d: 0.08 },
        { fn: (g, ox, oy) => {   // the highlighter's ink: the row it is on, and the rows behind it fading
          g.save(); g.globalCompositeOperation = 'multiply';
          for (let r = 0; r < 12; r++) {
            const t0 = T0 + r * ROW; if (lt < t0) break;
            const u = clamp((lt - t0) / ROW, 0, 1), a = 0.85 * clamp(1 - (lt - t0 - ROW) / 0.5, 0, 1); if (a <= 0) continue;
            const xa = r % 2 ? lerp(X1, X0, u) : X0, xb = r % 2 ? X1 : lerp(X0, X1, u);
            g.fillStyle = `rgba(255,226,74,${a.toFixed(3)})`; g.beginPath(); g.roundRect(xa + ox, rowY(r) - 30 + oy, xb - xa, 60, 8); g.fill();
          }
          g.restore();
        }, d: 0.08 },
        { fn: (g, ox, oy) => {   // the seven
          F.AI.forEach((i, j) => {
            const q = F.GRID[i], lit = lt >= PASS[i], kp = pop(lt, PASS[i], 0.3), ko = ease.out((lt - T_OUT - j * 0.07) / 0.5);
            const cnt = lt >= T_CNT + j * 0.2 ? Math.exp(-(lt - T_CNT - j * 0.2) * 7) : 0;
            const x = lerp(q.x, SLOT[j].x, ko) + ox, y = lerp(q.y, SLOT[j].y, ko) + oy, sc = (lit ? lerp(1, 1.22, Math.min(kp, 1.2)) : 1) + ko * 0.06 + cnt * 0.18;
            if (lit) { glow(g, x, y, 110, 'rgba(255,226,74,', 0.55); g.fillStyle = C.hilite; g.beginPath(); g.roundRect(x - 64 * sc, y - 48 * sc, 128 * sc, 96 * sc, 10); g.fill(); }
            put(g, F.cell(i), x, y, { sc, lift: lit ? 1.4 + ko : 0.6, alpha: 0.4 });
          });
        }, d: 0.12 },
        { fn: (g, ox, oy) => { if (lt < T_END + 0.5) put(g, F.highlighter(), p.x + ox, p.y + oy, { lift: 2.2, alpha: 0.35 }); }, d: 0.16 },
      ], cam);
      F.tag(c, 'NYT ANALYSIS · 30.9.2026', lt, DUR);
      F.box(c);
    },
  };
})();
