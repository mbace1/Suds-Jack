// Shot 3 · 6.4–9.6 · a gloved hand holds a receipt that will not stop printing;
// one stamped item per beat, the camera rides down the paper (a vertical pan).
// Motifs: drizzle, the paper curling, a leaf caught on the strip.
SCENES['rfa_receipt'] = (() => {
  const { W, H, C, TAU, BEAT, ease, paper, rain, leaf, stamp, glove } = RFA, { clamp, lerp } = U;
  const ITEMS = [['1 × CAKE', 'ORDERED'], ['1 × VET VISIT, TUE', 'BOOKED'], ['1 × FLIGHT', 'CHECKING'], ['1 × BIRCH LEAF', '?'], ['1 × PIGEON', 'FOLLOWED'], ['1 × SKY', 'PENDING']];
  return {
    draw(c, lt, t) {
      const pan = ease(lt / 3.2) * 520;                       // the camera rides down the paper
      c.drawImage(RFA.paper('c'), 0, 0);
      // red and black structure behind the strip
      c.fillStyle = C.red; c.fillRect(0, 0, 180, H); c.fillStyle = C.ink; c.save(); c.translate(0, 900 - pan * 0.4); c.rotate(-0.35); c.fillRect(-100, 0, 1400, 70); c.restore();
      c.save(); c.translate(0, -pan);
      // the receipt: a long cream strip with a torn foot, printed line by line
      const lines = Math.min(ITEMS.length, Math.floor(lt / BEAT) + 1), len = 520 + lines * 260 + (lt % BEAT) / BEAT * 60;
      c.fillStyle = C.cream; c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowOffsetX = 6; c.shadowOffsetY = 8; c.shadowBlur = 6;
      c.beginPath(); c.moveTo(250, 260); c.lineTo(900, 260); c.lineTo(900 + Math.sin(lt * 3) * 6, 260 + len);
      for (let i = 0; i <= 18; i++) c.lineTo(900 - i * 650 / 18, 260 + len + (i % 2 ? 14 : 0)); c.closePath(); c.fill(); c.shadowColor = 'transparent';
      c.font = '52px "AlfaSlabOne-400"'; c.fillStyle = C.ink; c.fillText('GLANCE · RECEIPT', 290, 420);
      c.fillRect(290, 445, 580, 5);
      ITEMS.slice(0, lines).forEach(([item, verdict], i) => {
        const y = 540 + i * 260, at = i * BEAT;
        c.font = '46px "AlfaSlabOne-400"'; c.fillStyle = C.ink; c.fillText(item, 290, y);
        c.fillStyle = C.sub; c.fillText('·'.repeat(18), 290, y + 50);
        stamp(c, verdict, 470, y + 160, 96, lt, at + 0.15, { col: C.red, rot: -0.1, gap: 0.03 });   // inside the strip
      });
      leaf(c, 880, 1100 + Math.sin(lt * 2) * 10, 1.4, 0.6 + Math.sin(lt * 3) * 0.2);
      c.restore();
      // the gloved hand at the top, gripping the strip
      glove(c, 575, 150 - pan, 1.5, 0.05);   // it holds the receipt's top, so it rides up with the paper
      rain(c, lt + 6, { n: 80, alpha: 0.22 });
      // IT SAW. IT BOUGHT. stacked on the red bar
      c.save(); c.translate(130, 1880); c.rotate(-Math.PI / 2);
      stamp(c, 'IT SAW. IT BOUGHT.', 0, 0, 108, lt, 0.3, { col: C.cream, gap: 0.04 }); c.restore();
    },
  };
})();
