// Shot 2 · The chair is taken. Closer on the witness chair: an AV cart rolls in from the right and bumps it — the
// old subpoena slides off the seat — and parks its monitor where a witness's head would be. The screen strikes,
// buffers, and on "video" becomes a call tile: a placeholder person (never a face), GOV'T AFFAIRS · SPACEXAI, one
// bar of signal. Then the company's own word appears on its own screen: SAFETY IS "CORE". Its cold light is the
// newest thing in the room.
SCENES['ct_screen'] = (() => {
  const { stack, box, put } = RFP, D = CT, ID = 'ct_screen', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tC = D.at(ID, 'cart', 0), tB = D.at(ID, 'bump', 0.8), tO = D.at(ID, 'on', 1.2), tT = D.at(ID, 'tile', 1.7), dur = D.dur(ID);
      const kc = clamp((lt - tC) / (tB - tC), 0, 1), mx = lt < tB ? lerp(1420, 540, D.ease.out(kc)) : 540 + Math.sin((lt - tB) * 18) * 14 * Math.exp(-(lt - tB) * 5);
      const wob = lt < tB ? Math.sin(lt * 20) * 0.01 : Math.sin((lt - tB) * 16) * 0.025 * Math.exp(-(lt - tB) * 4);
      const jolt = lt > tB ? Math.sin((lt - tB) * 30) * 0.03 * Math.exp(-(lt - tB) * 7) : 0;
      const kf = clamp((lt - tB) / 0.7, 0, 1), ey = lerp(1150, 1420, kf * kf), er = lerp(-0.1, 0.9, kf);   // the subpoena slides off and drops behind the table
      const state = lt < tO ? 'off' : lt < tO + 0.25 ? 'boot' : lt < tT ? 'spin' : 'tile';
      const chip = clamp((lt - (tT + 1.4)) / 0.3, 0, 1), blip = lt > tT + 3.0 && lt < tT + 3.6 ? clamp(Math.sin(((lt - tT - 3.0) / 0.6) * Math.PI) * 1.4, 0, 1) : 0;
      const S = 1.5 * D.punch(lt, [tB, tT], { open: 0.06 }), cam = { x: Math.sin(lt * 0.5) * 5, y: 0, z: 1, fx: 540, fy: 1120 };
      c.save(); c.translate(540, 1120); c.scale(S, S); c.translate(-540, -1120);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doors(g, 1, lt); g.restore(); }, d: 0.05 },
        { fn: (g) => D.daylight(g, lt, 0.6), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doorLight(g, 1, lt); g.restore(); [230, 850].forEach((x) => D.lamp(g, x + ox, 560, 1, lt)); }, d: 0.12 },
        { fn: (g, ox) => {
          put(g, D.chair(), 540 + ox, 1362, { lift: 1.2, rot: jolt });
          if (kf < 1) put(g, D.subpoena(), 556 + ox + kf * 40, ey, { sc: 0.46, rot: er, lift: 1.3 });
          put(g, D.cart(), mx + ox, 1700, { rot: wob * 0.5, lift: 1.2 });
          D.screen(g, mx + ox, 1112, state, lt - (state === 'boot' ? tO : state === 'spin' ? tO + 0.25 : tT), { chip, q: lt % 2.2 < 1.6 ? 2 : 1, spinner: blip });
        }, d: 0.2 },
        { sh: D.table(), d: 0.22, lift: 1.1 },
        { fn: (g, ox) => { CW.mic(g, 760 + ox, 1352, lt, 1, 0.8); put(g, CW.plate('SPACEXAI', 280), 540 + ox, 1356, { lift: 1.2 }); }, d: 0.22 },
      ], cam);
      c.restore();
      box(c);
    },
  };
})();
