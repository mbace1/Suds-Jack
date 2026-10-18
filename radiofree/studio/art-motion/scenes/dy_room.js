// Shot 3 · The plan. The briefing room from The Chair Is Taken, at night: the panelled wall, the chamber clock (its
// second hand ticking), the lamps lit. A podium is set — BRIEFING FOR CONGRESS, two microphones live, a glass of water
// poured — in front of rows of empty seats. On "after", a binder drops onto the podium: RULES FOR THE DAY AFTER.
SCENES['dy_room'] = (() => {
  const { stack, box, put } = RFP, D = DY, ID = 'dy_room', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tA = D.at(ID, 'after', 4.0), dur = D.dur(ID);
      const kb = clamp((lt - (tA - 0.32)) / 0.32, 0, 1), by = lerp(260, 905, kb * kb), brot = lerp(-0.5, -0.04, kb) + (lt > tA ? Math.sin((lt - tA) * 18) * 0.04 * Math.exp(-(lt - tA) * 5) : 0);
      const cam = { x: Math.sin(lt * 0.4) * 6, y: 0, z: D.punch(lt, [tA]) * lerp(1.0, 1.06, D.ease.io(lt / dur)), fx: 540, fy: 1000 };
      stack(c, [
        { sh: CT.wall(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); CT.doors(g, 0, lt); g.restore(); D.second(g, lt, ox); }, d: 0.05 },
        { sh: CT.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => [230, 850].forEach((x, i) => CT.lamp(g, x + ox, 560, 1, lt, i)), d: 0.12 },
        { fn: (g, ox) => {
          put(g, D.podium(), 540 + ox, 1500, { lift: 1.3 });
          CW.mic(g, 470 + ox, 912, lt, 1, 0.7); g.save(); g.translate(1080, 0); g.scale(-1, 1); CW.mic(g, 1080 - 610 - ox, 912, lt, 1, 0.7); g.restore();
          put(g, D.glass(), 680 + ox, 900, { lift: 0.8 });
          if (kb > 0) put(g, D.binder(), 540 + ox, by, { sc: 0.48, rot: brot, lift: lt < tA ? 3 : 0.8 });
        }, d: 0.22 },
        { fn: (g, ox) => { for (const x of [150, 400, 680, 930]) put(g, D.seat(), x + ox * 1.6, 1780, { sc: 0.82, lift: 1.4 }); }, d: 0.35 },
        { fn: (g, ox) => { for (const x of [20, 300, 780, 1060]) put(g, D.seat(), x + ox * 2.2, 2020, { sc: 1.1, lift: 1.8 }); }, d: 0.5 },
      ], cam);
      box(c);
    },
  };
})();
