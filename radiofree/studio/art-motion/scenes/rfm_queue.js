// Sample 2 · the queue, facing us. Five commuters at a Kallio tram stop at dusk,
// every one in a Toko mask of a different carrier colour — and every one wearing
// the glasses over it, red light on. One pair still has its $249 tag. The lamp
// is lit; leaves and rain. The heads all turn to the same leaf.
SCENES['rfm_queue'] = (() => {
  const { W, H, C, TAU, ease, eout, rain, leaf, stamp } = RFA, { front, dusk, S } = RFM, { clamp, lerp } = U;
  const CROWD = [ { x: 150, s: 0.92, color: S.ORANGE }, { x: 340, s: 1.0, color: S.RED }, { x: 540, s: 1.08, color: '#f0027f' }, { x: 740, s: 1.0, color: S.YELLOW }, { x: 930, s: 0.92, color: S.GREEN } ];
  return {
    draw(c, lt) {
      c.drawImage(dusk('g', 520), 0, 0);
      // the billboard, smaller and whole this time
      c.fillStyle = C.ink; c.fillRect(110, 120, 860, 400); c.fillStyle = C.cream; c.fillRect(130, 140, 820, 360);
      c.font = '200px "Anton-400"'; c.fillStyle = C.ink; c.fillText('LOOK', 160, 330); c.fillStyle = C.red; c.fillText('= BUY', 160, 490);
      c.fillStyle = C.red; c.beginPath(); c.arc(830, 250, 70, 0, TAU); c.fill();
      // the shelter, its lamp lit, the pavement wet
      c.fillStyle = C.ink; c.fillRect(0, 860, W, 34); c.fillRect(40, 894, 16, 760); c.fillRect(1024, 894, 16, 760);
      const lampOn = 0.85 + 0.15 * Math.sin(lt * 23) * (Math.sin(lt * 3) > 0.9 ? 1 : 0);
      c.fillStyle = `rgba(217,162,27,${0.32 * lampOn})`; c.beginPath(); c.moveTo(500, 894); c.lineTo(80, 1700); c.lineTo(1000, 1700); c.closePath(); c.fill();
      c.fillStyle = C.ruska; c.fillRect(470, 894, 140, 24);
      c.fillStyle = '#3a332c'; c.fillRect(0, 1640, W, 280);
      c.fillStyle = C.ruska; c.globalAlpha = 0.4; for (let i = 0; i < 7; i++) c.fillRect(80 + i * 140, 1700 + (i % 3) * 50, 90, 6); c.globalAlpha = 1;
      // the leaf they all look at
      const k = (lt * 0.3) % 1, lx = 120 + k * 840 + Math.sin(k * 10) * 60, ly = 700 + k * 260;
      CROWD.forEach((p, i) => {
        const look = clamp((lx - p.x) / 500, -1, 1) * 0.22;
        front(c, p.x, 1250, p.s, { color: p.color, t: lt + i * 0.17, tilt: look, step: 0 });
      });
      leaf(c, lx, ly, 2, k * 12);
      // the $249 tag still hanging off the yellow mask's glasses
      c.save(); c.translate(740 + 86, 1250 - 64); c.rotate(0.25 + Math.sin(lt * 3) * 0.12);
      c.strokeStyle = C.cream; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 60); c.stroke();
      c.fillStyle = C.cream; c.fillRect(-60, 60, 130, 56); c.fillStyle = C.red; c.font = '46px "Anton-400"'; c.fillText('$249', -46, 105); c.restore();
      rain(c, lt + 4, { n: 130, alpha: 0.3 });
      stamp(c, 'EVERYONE LOOKS THE SAME', 60, 1820, 64, lt, 0.4, { font: 'Anton-400', col: C.cream, gap: 0.02 });
    },
  };
})();
