// Shot 6 · 32.1–37.5 s · The empty chair. The far end of the companies' table: a chair with
// nobody in it, its nameplate SPACEXAI. A subpoena drifts down onto the seat; on the last hit a
// stamp lands across the frame: TO COURT.
SCENES['cw_chair'] = (() => {
  const { K, W, H, stack, box, put, glow, ease, move, pop } = RFP, D = CW, { clamp, lerp } = U;
  const B = 60 / 112, T_LAND = 1.4, T_HIT = 3.0;
  return {
    draw(c, lt) {
      const slam = lt < T_HIT ? 1 : 1 + 0.06 * Math.exp(-(lt - T_HIT) * 6) * (1 - Math.exp(-(lt - T_HIT) * 40));
      const cam = { x: Math.sin(lt * 0.5) * 8, y: 0, z: slam * move(lt, 0, 3.0, 1.08, 1.0), fx: 540, fy: 1250 };
      const kd = clamp((lt - 0.3) / (T_LAND - 0.3), 0, 1), ey = lerp(-200, 1180, 1 - (1 - kd) ** 2), ex = 540 + Math.sin(kd * Math.PI * 2) * 120 * (1 - kd);
      stack(c, [
        { sh: D.chamber(), d: 0.06, lift: 0 },
        { fn: (g, ox) => glow(g, 540 + ox, 1100, 600, 'rgba(240,170,70,', 0.28), d: 0.06 },
        { fn: (g, ox) => { put(g, D.chair(), 540 + ox, 1460, { lift: 1.4 }); put(g, D.envelope('SUBPOENA', null), ex + ox, ey, { sc: 0.62, rot: lerp(0.6, -0.08, kd) + Math.sin(lt * 3) * 0.04 * (1 - kd), lift: 1 + (1 - kd) * 2 }); }, d: 0.25 },
        { sh: D.table(), d: 0.3, lift: 1.2, y: 0 },
        { fn: (g, ox) => { D.mic(g, 700 + ox, 1480, lt, 0.12, 0.8); put(g, D.plate('SPACEXAI', 300), 540 + ox, 1560, { lift: 1.4 }); }, d: 0.3 },
        { fn: (g, ox) => { const ks = pop(lt, T_HIT, 0.16); if (ks > 0) put(g, D.stampMark('TO COURT', 560), 540 + ox, 900, { sc: lerp(1.6, 1, Math.min(ks, 1)), rot: -0.08, lift: 0.3 }); }, d: 0.3 },
      ], cam);
      box(c);
    },
  };
})();
