// Shot 6 · 32.1–37.5 s · The 3rd of November. A calendar on the wall, NOVEMBER 3, TUESDAY; below
// it a ballot box. Hands from both sides drop ballots in, one after another; on the last hit the
// lid snaps and the 3 is ringed in magenta.
SCENES['hp_ballot'] = (() => {
  const { K, W, H, sheet, stack, box, put, glow, ease, move } = RFP, D = HP, { clamp, lerp } = U;
  const B = 60 / 112, T_HIT = 3.0, DROPS = Array.from({ length: 8 }, (_, i) => ({ t: 0.4 + i * B / 2, side: i % 2 ? 1 : -1, c: D.COATS[i % 6] }));
  return {
    draw(c, lt) {
      const slam = lt < T_HIT ? 1 : 1 + 0.06 * Math.exp(-(lt - T_HIT) * 6) * (1 - Math.exp(-(lt - T_HIT) * 40));
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: slam * move(lt, 0, 3.0, 1.05, 1.0), fx: 540, fy: 1200 };
      const ring = clamp((lt - T_HIT + 0.05) / 0.3, 0, 1), bounce = lt > T_HIT ? Math.abs(Math.sin((lt - T_HIT) * 18)) * Math.exp(-(lt - T_HIT) * 6) * 34 : 0;
      stack(c, [
        { sh: sheet('hp_room', (g) => { g.fillStyle = '#26201b'; g.fillRect(-90, -90, W + 180, H + 180); g.fillStyle = 'rgba(255,230,190,.035)'; for (let x = -90; x < W + 90; x += 60) g.fillRect(x, -90, 22, H + 180); g.fillStyle = '#1c1814'; g.fillRect(-90, 1700, W + 180, H); }), d: 0.05, lift: 0 },
        { fn: (g, ox) => {
          glow(g, 540 + ox, 900, 640, 'rgba(240,170,70,', 0.3);
          put(g, D.calendar(), 540 + ox, 900, { lift: 1.4 });
          if (ring > 0) { g.strokeStyle = K.mag; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.ellipse(540 + ox, 940, 118, 132, -0.15, -Math.PI / 2, -Math.PI / 2 + ring * Math.PI * 2.05); g.stroke(); }
        }, d: 0.15 },
        { fn: (g, ox) => {
          put(g, D.box(), 540 + ox, 1760 - bounce, { lift: 1.4 });
          // the ballots: each comes in a hand from the side, over the slot, and drops in
          for (const d of DROPS) {
            const k = clamp((lt - d.t) / 0.45, 0, 1); if (k <= 0) continue;
            const out = ease.out(clamp((lt - d.t - 0.45) / 0.5, 0, 1)), hx = 540 + d.side * lerp(560, 150, ease.out(k)) + d.side * out * 520, hy = 1310 + Math.sin(k * Math.PI) * -30;
            if (k < 1) put(g, D.ballot(), hx - d.side * 40 + ox, hy - 70, { rot: d.side * 0.25, sc: 0.8, lift: 1.8 });
            else { const f = clamp((lt - d.t - 0.45) / 0.25, 0, 1); if (f < 1) put(g, D.ballot(), 540 + d.side * 110 * (1 - f) + ox, 1300 + f * 90, { rot: d.side * 0.25 * (1 - f), sc: 0.8 * (1 - f * 0.3), lift: 1.6 }); }
            if (out < 1) put(g, D.reach(d.c, 0.4), hx + ox, hy, { sc: 0.8, rot: d.side * -1.25, lift: 1.8 });
          }
        }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
