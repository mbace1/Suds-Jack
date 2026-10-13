// Sample 1 · "HEY GLANCE!" — Rodchenko's shout (the 1924 Lengiz poster's cupped
// hand and cone of words), at dusk, through a Toko mask in the yellow carrier.
SCENES['rfm_shout'] = (() => {
  const { W, H, C, TAU, ease, eout, rain, leaves, stamp } = RFA, { mask, hand, dusk, S } = RFM, { clamp, lerp } = U;
  return {
    draw(c, lt) {
      c.drawImage(dusk('f', 700), 0, 0);
      // the cone of words, opening from the mask's mouth to the top right
      const mx = 270, my = 1180, grow = eout(lt / 0.9);
      // band colour, letter colour: cream / red / black, as Rodchenko's cone — black bands vanished into the dusk sky
      const bands = [['HEY', C.ink, 110, C.cream], ['GLANCE!', C.cream, 150, C.red], ['IT LISTENS', C.cream, 66, C.ink]];
      // a shorter cone at a shallower angle: the long one ran its words off the frame
      c.save(); c.translate(mx + 110, my - 60); c.rotate(-0.82);   // up the tall frame, as Rodchenko's cone goes
      const len = 820 * grow;
      c.beginPath(); c.moveTo(0, -40); c.lineTo(len, -300); c.lineTo(len, 300); c.lineTo(0, 40); c.closePath();
      c.save(); c.clip();
      let y = -240; const h = [150, 180, 150];   // centred in the cone
      bands.forEach(([txt, col, size, bandCol], i) => {
        c.fillStyle = bandCol; c.fillRect(0, y, 1400, h[i]);
        c.font = `${size}px "Anton-400"`; c.textBaseline = 'middle'; c.fillStyle = col;
        const k = clamp((lt - 0.35 - i * 0.22) / 0.2, 0, 1); c.globalAlpha = k;
        c.fillText(txt, [560, 300, 520][i], y + h[i] / 2 + 8);   // each word where the cone is wide enough for it
        c.globalAlpha = 1; y += h[i];
      });
      c.restore(); c.restore();
      // the figure: coat, scarf, the yellow mask with the glasses, a gloved hand cupped at the mouth
      c.fillStyle = C.ink; c.beginPath(); c.moveTo(60, 1920); c.lineTo(110, 1360); c.quadraticCurveTo(330, 1290, 560, 1370); c.lineTo(640, 1920); c.closePath(); c.fill();
      c.fillStyle = C.red; c.fillRect(200, 1320, 260, 54);
      const tilt = -0.18 + Math.sin(lt * 7) * 0.02 * (lt > 0.4 && lt < 1.6 ? 1 : 0);
      mask(c, mx, my, 190, S.YELLOW, { glasses: true, led: lt > 1.4, t: lt, tilt, glint: 1 });
      hand(c, mx + 200, my + 120, 1.15, -0.9, { open: 0.4 });
      // the light comes on, and its arcs
      if (lt > 1.4) for (let i = 0; i < 3; i++) { const q = ((lt - 1.4) * 1.3 + i / 3) % 1, r = 30 + q * 300; c.strokeStyle = C.red; c.globalAlpha = (1 - q); c.lineWidth = 10 * (1 - q) + 2;
        c.beginPath(); c.arc(mx + 150, my - 130, r, -2.2, -0.6); c.stroke(); c.globalAlpha = 1; }
      leaves(c, lt + 2, { n: 10, seed: 31, size: 1.3 });
      rain(c, lt, { n: 130, alpha: 0.3 });
      stamp(c, 'RADIO FREE HELSINKI · TECH DESK', 60, 120, 44, lt, 0.1, { font: 'AlfaSlabOne-400', col: C.cream, gap: 0.01 });
    },
  };
})();
