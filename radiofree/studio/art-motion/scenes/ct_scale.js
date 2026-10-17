// Shot 4 · The law. On the dais: the chair's gavel taps once; a coffin-shaped card drops onto one pan of a brass
// balance and a stack of books, LAW, onto the other — and on "law" the beam comes down hard on the law's side.
// Far behind, out of focus, the screen in the witness chair keeps glowing.
SCENES['ct_scale'] = (() => {
  const { stack, box, put, glow } = RFP, D = CT, ID = 'ct_scale', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tG = D.at(ID, 'gavel', 0.45), tL = D.at(ID, 'load', 1.3), tT = D.at(ID, 'tip', 2.6), dur = D.dur(ID);
      const gk = lt < tG - 0.35 ? 0 : lt < tG ? (lt - (tG - 0.35)) / 0.35 : Math.max(0, 1 - (lt - tG) / 0.08);   // the gavel lifts, then strikes
      const gr = lt < tG ? -0.55 * D.ease.out(gk) : -0.55 * gk + (lt > tG ? Math.sin((lt - tG) * 40) * 0.03 * Math.exp(-(lt - tG) * 8) : 0);
      const drop = (t0) => (lt < t0 ? -1 : clamp((lt - t0) / 0.35, 0, 1));
      const k1 = drop(tL), k2 = drop(tL + 0.12);
      let tilt = lt < tL ? Math.sin(lt * 1.6) * 0.015 : lt < tT ? Math.sin((lt - tL) * 7) * 0.05 * Math.exp(-(lt - tL) * 2.2) : 0.24 * D.ease.back((lt - tT) / 0.4) + Math.sin((lt - tT) * 9) * 0.02 * Math.exp(-(lt - tT) * 3);
      const S = 1.0 * D.punch(lt, [tG, tT], { open: 0.06, kick: 0.045 }), cam = { x: Math.sin(lt * 0.4) * 8, y: 0, z: lerp(1.0, 1.05, lt / dur), fx: 540, fy: 1100 };
      const load = (sp, k) => (g, x, y) => { if (k < 0) return; const yy = lerp(y - 520, y - 2, k * k); put(g, sp, x, yy, { sc: 0.8, lift: 1 + (1 - k) * 2 }); };
      c.save(); c.translate(540, 1100); c.scale(S, S); c.translate(-540, -1100);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0, soft: 3 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doors(g, 1, lt); D.doorLight(g, 0.6, lt); g.restore(); }, d: 0.05 },
        { fn: (g, ox) => { [230, 850].forEach((x) => D.lamp(g, x + ox, 520, 1, lt)); D.screen(g, 540 + ox, 1060, 'tile', lt + 6, { chip: 1, q: 1, sc: 0.42 }); }, d: 0.08 },
        { fn: (g) => D.daylight(g, lt, 0.5), d: 0.08 },
        { fn: (g, ox) => {                                                      // the dais top, seen from the chair's side
          g.fillStyle = CT.C.wood1; g.beginPath(); g.moveTo(-90, 1380); g.quadraticCurveTo(540, 1330, 1170, 1380); g.lineTo(1170, 2010); g.lineTo(-90, 2010); g.closePath(); g.fill();
          g.fillStyle = CT.C.woodHi; g.beginPath(); g.moveTo(-90, 1380); g.quadraticCurveTo(540, 1330, 1170, 1380); g.lineTo(1170, 1386); g.quadraticCurveTo(540, 1336, -90, 1386); g.closePath(); g.fill();
          glow(g, 560 + ox, 1300, 520, 'rgba(255,196,120,', 0.22);
        }, d: 0.3 },
        { fn: (g, ox) => D.scale(g, 600 + ox, 1520, tilt, [load(D.coffin(), k1), load(D.lawbook(), k2)], lt), d: 0.35 },
        { fn: (g, ox) => { put(g, CW.block(), 190 + ox, 1700, { sc: 0.9, lift: 1.2 }); put(g, CW.gavel(420), 470 + ox, 1610, { sc: 0.8, rot: gr, lift: 1.6 + gk }); }, d: 0.45 },
      ], cam);
      c.restore();
      box(c);
    },
  };
})();
