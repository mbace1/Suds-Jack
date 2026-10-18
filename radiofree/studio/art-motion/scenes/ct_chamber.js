// Shot 1 · The chamber, the chair still empty. The room is cool and dark, morning daylight in the tall windows; the
// lamps strike one by one; the witness chair waits behind its table with Committee of the Whole's subpoena still
// on the seat. As the question finishes (v2: "will you accept responsibility?") the double doors behind the chair
// swing open into the corridor's warm light — and nobody walks through them. Then a shadow crosses the doorway and
// something on wheels rattles closer.
SCENES['ct_chamber'] = (() => {
  const { stack, box, put } = RFP, D = CT, ID = 'ct_chamber', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tL = D.at(ID, 'lamps', 0.25), tD = D.at(ID, 'doors', 2), tR = D.at(ID, 'rattle', 5.4), dur = D.dur(ID);
      const on = (i) => { const t = lt - tL - i * 0.14; if (t < 0) return 0; return t < 0.22 ? (Math.floor(t * 36) % 2 ? 0.25 : 0.9) : 1; };
      const dk = lt > tD ? D.ease.out((lt - tD) / 0.9) : 0;
      const cam = { x: Math.sin(lt * 0.4) * 6, y: 0, z: D.punch(lt, [tD + 0.08]) * lerp(1.0, 1.07, D.ease.io(lt / dur)), fx: 540, fy: 1150 };
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g, ox) => {
          g.save(); g.translate(ox, 0); D.doors(g, dk, lt);
          if (lt > tR) { const k = clamp((lt - tR) / 1.0, 0, 1); g.save(); g.beginPath(); g.roundRect(392, 748, 296, 540, [148, 148, 0, 0]); g.clip(); g.fillStyle = 'rgba(20,14,8,.55)'; g.fillRect(lerp(720, 470, k), 900, 160, 400); g.restore(); }   // a shadow on wheels, coming
          g.restore(); }, d: 0.05 },
        { fn: (g) => D.daylight(g, lt, 1 - 0.4 * dk), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doorLight(g, dk, lt); g.restore(); }, d: 0.1 },
        { fn: (g, ox) => [230, 850].forEach((x, i) => D.lamp(g, x + ox, 560, on(i), lt, i)), d: 0.12 },
        { fn: (g, ox) => { put(g, D.chair(), 540 + ox, 1362, { lift: 1.2 }); put(g, D.subpoena(), 556 + ox, 1150, { sc: 0.46, rot: -0.1, lift: 1.3 }); }, d: 0.2 },
        { sh: D.table(), d: 0.22, lift: 1.1 },
        { fn: (g, ox) => { CW.mic(g, 760 + ox, 1352, lt, 0.12, 0.8); put(g, CW.plate('SPACEXAI', 280), 540 + ox, 1356, { lift: 1.2 }); }, d: 0.22 },
        { sh: D.rail(), d: 0.5, lift: 1.4 },
      ], cam);
      CW.tag(c, D.FP.ui.dateline || 'NEW YORK CITY HALL · 16.10.2026', lt, dur);
      box(c);
    },
  };
})();
