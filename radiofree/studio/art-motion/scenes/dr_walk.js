// Shot 2 · 6.4–12.9 s · The note. Low, by the rug: the hound gets up and trots across from
// right to left. The camera on the shelf above follows it — card brackets close round the
// dog as it moves — and on the beat a label pins to it: DEER. The dog stops at the sofa's end.
SCENES['dr_walk'] = (() => {
  const { K, W, H, sheet, stack, box, put, glow, ease, move, pop } = RFP, D = DR, { clamp, lerp } = U;
  const B = 60 / 112, T_GO = 0.5, T_STOP = 3.2, T_TAG = 4 * B;
  return {
    draw(c, lt) {
      const k = ease.out(clamp((lt - T_GO) / (T_STOP - T_GO), 0, 1)), x = lerp(960, 520, k), trot = lt > T_GO && lt < T_STOP + 0.1 ? 1 - Math.pow(k, 6) : 0;
      const cam = { x: lerp(20, -20, k), y: 0, z: 1.0, fx: 540, fy: 1300 };
      stack(c, [
        { sh: sheet('dr_lowwall', (g) => { g.fillStyle = D.C.wall; g.fillRect(-90, -90, W + 180, 1460); g.fillStyle = 'rgba(255,240,210,.03)'; for (let x = -90; x < W + 90; x += 70) g.fillRect(x, -90, 28, 1460); g.fillStyle = D.C.trim; g.fillRect(-90, 1350, W + 180, 24); g.fillStyle = D.C.floor; g.fillRect(-90, 1370, W + 180, H); g.fillStyle = D.C.floorL; for (let y = 1400; y < H; y += 60) g.fillRect(-90, y, W + 180, 4); }), d: 0.1, lift: 0 },
        { fn: (g, ox) => {
          glow(g, 300 + ox, 900, 700, 'rgba(240,170,70,', 0.22);
          put(g, D.shelf(), 820 + ox, 820, { lift: 1.2 }); D.cam(g, 840 + ox, 820, lt);
          // the camera's gaze: a faint cone from the lens to the dog
          g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,106,80,.06)'; g.beginPath(); g.moveTo(840 + ox, 724); g.lineTo(x - 180 + ox, 1720); g.lineTo(x + 200 + ox, 1720); g.closePath(); g.fill(); g.restore();
          put(g, D.rug(), 560 + ox, 1700, { sc: 1.25, lift: 0.4 });
          const sniff = lt > T_STOP ? 0.05 + Math.max(0, Math.sin((lt - T_STOP) * 2.2)) * 0.34 + Math.sin(lt * 14) * 0.02 * (Math.sin((lt - T_STOP) * 2.2) > 0.3 ? 1 : 0) : 0;   // stopped, it sniffs the rug
          D.dog(g, x + ox, 1760, 1.15, { dir: -1, t: lt, trot, look: sniff });
          const br = 1 + Math.sin(lt * 5) * 0.015; D.brackets(g, x - 430 * br + ox, 1300 - 10 * (br - 1) * 60, x + 250 * br + ox, 1790, br);   // the camera keeps re-framing it
          D.label(g, 'DEER', x - 90 + ox, 1230, 1.5 * pop(lt, T_TAG, 0.25));
        }, d: 0.3 },
        { fn: (g, ox) => put(g, D.sofaFront(), -330 + ox, 1560, { sc: 1.3, lift: 1.8 }), d: 0.4 },
      ], cam);
      box(c);
    },
  };
})();
