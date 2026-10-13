// Shot 5 · 12.8–15 · the end: the gloved hand folds the glasses and slips them
// into a coat pocket. The red light keeps blinking through the cloth.
// Camera: a slow push. Motifs: drizzle, the light's pulse, a last leaf.
SCENES['rfa_pocket'] = (() => {
  const { W, H, C, TAU, ease, eout, paper, rain, leaf, stamp, glove, specs } = RFA, { clamp, lerp } = U;
  return {
    draw(c, lt, t) {
      const z = 1 + 0.06 * ease(lt / 2.2);
      c.save(); c.translate(W / 2, H * 0.6); c.scale(z, z); c.translate(-W / 2, -H * 0.6);
      c.drawImage(paper('e'), 0, 0);
      // the coat, filling the lower frame, with its pocket
      c.fillStyle = C.ink; c.beginPath(); c.moveTo(0, 820); c.quadraticCurveTo(W / 2, 760, W, 820); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
      c.fillStyle = '#2b2520'; c.fillRect(260, 1180, 560, 420);                                          // the pocket
      c.fillStyle = C.red; c.fillRect(260, 1160, 560, 30);                                                // its red lining at the lip
      c.strokeStyle = C.sub; c.lineWidth = 4; c.setLineDash([16, 12]); c.strokeRect(276, 1196, 528, 390); c.setLineDash([]);   // stitching
      c.fillStyle = C.sub; for (const y of [980, 1660]) { c.beginPath(); c.arc(930, y, 22, 0, TAU); c.fill(); }                   // buttons
      c.fillStyle = '#2b2520'; c.beginPath(); c.moveTo(540, 800); c.lineTo(760, 800); c.lineTo(600, 1120); c.closePath(); c.fill();   // a lapel
      // the glasses fold, then sink into the pocket
      const fold = ease(lt / 0.6), sink = ease((lt - 0.6) / 0.6), y = lerp(700, 1300, sink);
      c.save(); c.beginPath(); c.rect(0, 0, W, lerp(H, 1190, sink > 0.5 ? 1 : 0) ); if (sink > 0.5) c.clip();
      specs(c, 540, y, 1.1, { fold, led: false });
      glove(c, 540, y - 150, 1.4, 0.1);
      c.restore();
      // the light keeps blinking through the cloth
      if (lt > 1.3) { const on = Math.floor(lt * 4) % 2 === 0; c.fillStyle = on ? C.red : '#5a120e'; c.globalAlpha = on ? 0.9 : 0.6;
        c.beginPath(); c.arc(640, 1380, on ? 26 : 18, 0, TAU); c.fill(); c.globalAlpha = 1;
        if (on) { c.strokeStyle = C.red; c.lineWidth = 4; for (const r of [50, 80]) { c.beginPath(); c.arc(640, 1380, r, -1, 0.4); c.stroke(); } } }
      leaf(c, 300, 300 + lt * 260, 1.6, lt * 3);
      rain(c, lt + 12, { n: 70, alpha: 0.25 });
      c.restore();
      stamp(c, 'STILL', 70, 330, 200, lt, 1.2);
      stamp(c, 'LOOKING', 70, 530, 200, lt, 1.4, { red: [0, 1, 2, 3, 4, 5, 6], gap: 0.05 });
    },
  };
})();
