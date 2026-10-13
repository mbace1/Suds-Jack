// Sample 3 · Senate Square at dusk: the real cathedral (white, green domes), a
// crowd of masked umbrellas looking up, and over the square a monument — a giant
// pair of the glasses, its red light sweeping the crowd.
SCENES['rfm_square'] = (() => {
  const { W, H, C, TAU, ease, eout, rain, leaves, stamp } = RFA, { mask, dusk, cathedral, S } = RFM, { clamp, lerp } = U;
  // the back row under umbrellas, the front row bare-headed and lower: front umbrellas hid the back row's masks
  const CROWD = Array.from({ length: 11 }, (_, i) => ({ x: 60 + (i % 6) * 190 + (i >= 6 ? 95 : 0), y: i >= 6 ? 1800 : 1610, brolly: i < 6, col: [S.YELLOW, S.RED, S.ORANGE, '#f0027f', S.GREEN, S.LIME][i % 6] }));
  return {
    draw(c, lt) {
      c.drawImage(dusk('h', 900), 0, 0);
      cathedral(c, 540, 1440, 0.95);
      // the monument: giant glasses on two poles, a red light sweeping
      const gy = 430 + Math.sin(lt * 1.2) * 10;
      c.fillStyle = C.ink; c.fillRect(150, gy, 14, 1000); c.fillRect(916, gy, 14, 1000);
      c.lineWidth = 34; c.strokeStyle = C.ruska; for (const sx of [-1, 1]) { c.beginPath(); c.arc(540 + sx * 210, gy, 170, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(500, gy - 10); c.lineTo(580, gy - 10); c.stroke();
      const sweep = Math.sin(lt * 1.6) * 0.5;
      c.save(); c.translate(790, gy - 150); c.rotate(sweep);
      c.fillStyle = 'rgba(200,35,28,.28)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-260, 1500); c.lineTo(260, 1500); c.closePath(); c.fill(); c.restore();
      c.fillStyle = C.red; c.beginPath(); c.arc(790, gy - 150, 26, 0, TAU); c.fill();
      // the banner across the cathedral steps
      c.fillStyle = C.red; c.fillRect(0, 1360, W, 90); c.font = '74px "Anton-400"'; c.fillStyle = C.cream; c.textBaseline = 'middle';
      const off = (lt * 120) % 1200; c.fillText('IT SEES WHAT YOU SEE · IT SEES WHAT YOU SEE · ', -off, 1408); c.fillText('IT SEES WHAT YOU SEE · IT SEES WHAT YOU SEE · ', 1200 - off, 1408);
      // the crowd: masked faces under black umbrellas, all tilted up to the monument
      CROWD.forEach((p, i) => {
        if (p.brolly) { c.fillStyle = C.ink; c.beginPath(); c.arc(p.x, p.y - 74, 104, Math.PI, 0); c.closePath(); c.fill(); }
        c.fillStyle = C.ink; c.fillRect(p.x - 70, p.y + 40, 140, 300);
        mask(c, p.x, p.y, 62, p.col, { glasses: true, led: true, t: lt + i * 0.21, tilt: (540 - p.x) / 2400 + Math.sin(lt * 2 + i) * 0.03 });
      });
      leaves(c, lt + 5, { n: 12, seed: 41, size: 1.2 });
      rain(c, lt + 2, { n: 140, alpha: 0.32 });
      stamp(c, 'SENAATINTORI · 16:04', 60, 120, 56, lt, 0.2, { font: 'Anton-400', col: C.cream, gap: 0.02 });
    },
  };
})();
