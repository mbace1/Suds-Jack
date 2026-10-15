// Shot 1 · 0–6.4 s · Christiansborg. The Danish parliament across the canal in a warm low sun: the
// long granite palace under its copper roof, the portico, and the tower with its copper-green spire
// and gilt crowns. Dannebrogs on two poles; a string of little paper flags sways over the water; the
// windows light one by one, candle-warm; a canal boat crosses.
SCENES['sat_borg'] = (() => {
  const { W, stack, put, glow, ease, move } = RFP, S = SAT, C = S.C, { clamp, lerp } = U;
  const B = 60 / 112, DUR = 12 * B;
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 12, y: 0, z: move(lt, 0, DUR, 1.0, 1.06), fx: 540, fy: 1250 };
      const n = clamp(Math.floor((lt - 0.4) / 0.09), 0, S.WIN.length), kb = clamp((lt - 0.5) / 5.6, 0, 1);
      stack(c, [
        { sh: S.sky('a', 1350), d: 0.02, lift: 0 },
        { fn: (g, ox) => { glow(g, 880 + ox, 860, 420, 'rgba(255,200,120,', 0.35); g.fillStyle = 'rgba(255,236,190,.9)'; g.beginPath(); g.arc(880 + ox, 860, 62, 0, Math.PI * 2); g.fill(); }, d: 0.03 },
        { sh: S.borg(), d: 0.1, lift: 0.8 },
        { fn: (g, ox) => { S.borgWindows(g, n, ox); S.WIN.forEach(([x, y], i) => { if (S.isLit(i, n)) glow(g, x + 14 + ox, y + 29, 46, 'rgba(255,190,90,', 0.3); }); }, d: 0.1 },
        { fn: (g, ox) => { S.pole(g, 150 + ox, 1452, 0.9, lt, 0); S.pole(g, 920 + ox, 1452, 0.9, lt, 1.4); }, d: 0.12 },
        { sh: S.canal(), d: 0.14, lift: 0.2 },
        { fn: (g, ox) => { if (kb > 0 && kb < 1) { const x = lerp(-280, 1360, kb); put(g, S.boat(), x + ox, 1640, { lift: 0.9 }); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - 230 + ox, 1642, 120, 4); } }, d: 0.2 },
        { fn: (g, ox) => S.garland(g, 70 + ox, 1520, 1010 + ox, 1520, 70, 13, lt, 1.1), d: 0.3 },
        { fn: (g) => S.tag(g, 'FOLKETINGET · COPENHAGEN', lt, DUR), d: 0 },
      ], cam);
      S.box(c);
    },
  };
})();
