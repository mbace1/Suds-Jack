// Shot 5 · 19.3–25.7 s · No rush. A podium, SPEAKER, an hourglass on it. On the beat the
// hourglass is turned over; then the sand runs, very slowly. A snail crosses the lectern.
SCENES['hp_speaker'] = (() => {
  const { K, W, H, sheet, stack, box, put, glow, ease, move } = RFP, D = HP, { clamp, lerp } = U;
  const B = 60 / 112, T_TURN = 2 * B;
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: move(lt, 0, 6.4, 1.0, 1.06), fx: 540, fy: 1150 };
      const kt = ease.out(clamp((lt - T_TURN) / 0.6, 0, 1)), a = kt * Math.PI, f = lt < T_TURN + 0.6 ? 0.08 : 0.92 - (lt - T_TURN - 0.6) * 0.008;
      stack(c, [
        { sh: sheet('hp_hall', (g) => { g.fillStyle = '#1e1a16'; g.fillRect(-90, -90, W + 180, H + 180); g.fillStyle = '#2a231c'; for (let x = -60; x < W + 90; x += 160) g.fillRect(x, 300, 120, 1300); g.fillStyle = '#1a1612'; g.fillRect(-90, 1700, W + 180, H); }), d: 0.05, lift: 0 },
        { fn: (g, ox) => glow(g, 540 + ox, 1000, 640, 'rgba(240,170,70,', 0.3), d: 0.05 },
        { fn: (g, ox) => {
          put(g, D.podium(), 540 + ox, 1800, { lift: 1.4 });
          if (kt < 1) D.hourglass(g, 540 + ox, 1050 - Math.sin(kt * Math.PI) * 60, 260, 0.08, a);   // turning: the run-out sand goes over the top
          else D.hourglass(g, 540 + ox, 1050, 260, 0.92 - (lt - T_TURN - 0.6) * 0.012, 0);
          put(g, D.snail(), lerp(250, 330, lt / 6.4) + ox, 1205, { sc: 1.3, lift: 1.2 });
        }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
