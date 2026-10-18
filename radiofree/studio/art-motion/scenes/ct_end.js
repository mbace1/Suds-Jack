// Shot 5 · The answer (v2). Back at the witness table: the screen in the chair, still on its call, its lower third
// still saying SAFETY IS "CORE". The camera eases in. On "nobody" the SAFETY hat from shot 4 — the one every hand
// let go of — drops out of the air onto the table beside the nameplate, rocks, and stays there. Nobody picks it up.
SCENES['ct_end'] = (() => {
  const { stack, box, put } = RFP, D = CT, ID = 'ct_end', { clamp, lerp } = U;
  const HX = 330, HY = 1352;                                                    // where the hat comes to rest: on the table top, left of the plate
  return {
    draw(c, lt) {
      const tL = D.at(ID, 'land', 2.0), dur = D.dur(ID);
      const kp = D.ease.io(lt / dur), cy = lerp(1120, 1180, kp), S = lerp(1.32, 1.46, kp) * D.punch(lt, [tL], { open: 0.05, kick: 0.04 });
      const kh = clamp((lt - (tL - 0.5)) / 0.5, 0, 1), hx = lerp(150, HX, D.ease.out(kh)), hy = lt < tL ? lerp(620, HY, kh * kh) : HY;
      const rock = lt > tL ? Math.sin((lt - tL) * 13) * 0.16 * Math.exp(-(lt - tL) * 2.2) : lerp(-1.4, 0, kh), squash = lt > tL ? 1 - 0.1 * Math.exp(-(lt - tL) * 12) : 1;
      const cam = { x: Math.sin(lt * 0.4) * 6, y: 0, z: 1, fx: 540, fy: cy };
      c.save(); c.translate(540, 960); c.scale(S, S); c.translate(-540, -cy);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doors(g, 1, lt); g.restore(); }, d: 0.05 },
        { fn: (g) => D.daylight(g, lt, 0.7), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doorLight(g, 1, lt); g.restore(); [230, 850].forEach((x) => D.lamp(g, x + ox, 560, 1, lt)); }, d: 0.12 },
        { fn: (g, ox) => {
          put(g, D.chair(), 540 + ox, 1362, { lift: 1.2 }); put(g, D.cart(), 540 + ox, 1700, { lift: 1.2 });
          D.screen(g, 540 + ox, 1112, 'tile', lt + 9, { chip: 1, q: 1, spinner: 0.6 + 0.4 * Math.sin(lt * 2) ** 2 });
        }, d: 0.2 },
        { sh: D.table(), d: 0.22, lift: 1.1 },
        { fn: (g, ox) => {
          CW.mic(g, 760 + ox, 1352, lt, 1, 0.8); put(g, CW.plate('SPACEXAI', 280), 540 + ox, 1356, { lift: 1.2 });
          if (lt > tL - 0.5) { g.save(); g.translate(hx + ox, hy); g.scale(1 / squash, squash); put(g, D.hat(), 0, 0, { sc: 0.72, rot: rock, lift: lt < tL ? 3 : 0.8 }); g.restore(); }
        }, d: 0.22 },
      ], cam);
      c.restore();
      box(c);
    },
  };
})();
