// Shot 6 · No number, and the hat. Coxon #2's dial is back on the chamber wall, relabelled ODDS OF CATASTROPHE ·
// THE COMPANY'S NUMBER — and it has no needle. On "no number" a stamp lands across it: NO NUMBER. Then the camera
// tilts down to the witness chair, where the screen is still buffering, and on "headcount" the hard hat from shot 5
// drops out of the air and lands on top of the monitor, rocking. Nobody in the room is wearing it.
SCENES['ct_dial'] = (() => {
  const { stack, box, put } = RFP, D = CT, ID = 'ct_dial', { clamp, lerp } = U;
  return {
    draw(c, lt) {
      const tD = D.at(ID, 'dial', 0.3), tB = D.at(ID, 'blank', 1.3), tT = D.at(ID, 'tilt', 3.8), tL = D.at(ID, 'land', 5.5), dur = D.dur(ID);
      const kt = D.ease.io((lt - tT) / 1.1), cy = lerp(620, 1150, kt), S = lerp(1.15, 1.45, kt) * D.punch(lt, [tB, tL], { open: 0.05, kick: 0.04 });
      const kh = clamp((lt - (tL - 0.55)) / 0.55, 0, 1), hx = lerp(1250, 540, D.ease.out(kh)), hy = lt < tL ? lerp(700, 984, kh * kh) - Math.sin(kh * Math.PI) * 120 : 984;
      const rock = lt > tL ? Math.sin((lt - tL) * 14) * 0.12 * Math.exp(-(lt - tL) * 2.5) : lerp(-1.2, 0, kh), squash = lt > tL ? 1 - 0.08 * Math.exp(-(lt - tL) * 12) : 1;
      const ks = lt > tB ? Math.min(1, (lt - tB) / 0.16) : 0;
      const cam = { x: Math.sin(lt * 0.4) * 6, y: 0, z: 1, fx: 540, fy: cy };
      c.save(); c.translate(540, 960); c.scale(S, S); c.translate(-540, -cy);
      stack(c, [
        { sh: D.wall(), d: 0.05, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doors(g, 1, lt); g.restore(); }, d: 0.05 },
        { fn: (g) => D.daylight(g, lt, 0.7), d: 0.06 },
        { sh: D.floor(), d: 0.1, lift: 0 },
        { fn: (g, ox) => { g.save(); g.translate(ox, 0); D.doorLight(g, 1, lt); g.restore(); [230, 850].forEach((x) => D.lamp(g, x + ox, 560, 1, lt)); }, d: 0.12 },
        { fn: (g, ox) => {                                                       // the dial leaves with the tilt, so the last line has a clean sky
          const fade = 1 - clamp((lt - tT) / 0.7, 0, 1); if (fade <= 0) return; g.save(); g.globalAlpha = fade;
          g.strokeStyle = '#0b0d0f'; g.lineWidth = 3; for (const x of [360, 720]) { g.beginPath(); g.moveTo(x + ox, 240); g.lineTo(x + ox, 470); g.stroke(); }
          put(g, D.dial(), 540 + ox, 640 + (lt < tD ? -40 * (1 - clamp(lt / tD, 0, 1)) : 0) - 160 * (1 - fade), { sc: 0.78, lift: 1.4 });
          if (ks > 0) put(g, CW.stampMark('NO NUMBER', 560), 540 + ox, 560 - 160 * (1 - fade), { sc: lerp(1.5, 0.62, ks), rot: -0.07, lift: 0.4 });
          g.restore();
        }, d: 0.14 },
        { fn: (g, ox) => {
          put(g, D.chair(), 540 + ox, 1362, { lift: 1.2 }); put(g, D.cart(), 540 + ox, 1700, { lift: 1.2 });
          D.screen(g, 540 + ox, 1112, 'tile', lt + 9, { chip: 1, q: 1, spinner: 0.6 + 0.4 * Math.sin(lt * 2) ** 2 });
          if (lt > tL - 0.55) { g.save(); g.translate(hx + ox, hy); g.scale(1 / squash, squash); put(g, D.hat(), 0, 0, { sc: 0.62, rot: rock, lift: lt < tL ? 3 : 0.8 }); g.restore(); }
        }, d: 0.2 },
        { sh: D.table(), d: 0.22, lift: 1.1 },
        { fn: (g, ox) => { CW.mic(g, 760 + ox, 1352, lt, 1, 0.8); put(g, CW.plate('SPACEXAI', 280), 540 + ox, 1356, { lift: 1.2 }); }, d: 0.22 },
      ], cam);
      c.restore();
      box(c);
    },
  };
})();
