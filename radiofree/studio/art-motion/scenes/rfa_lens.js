// Shot 2 · 3.2–6.4 · the glasses as two Lissitzky circles; a cake in the left
// lens, a birch in the right. The red wedge drives in on the beat; ORDERED is
// stamped. Camera: a slam-in on the first beat, then holds. Motifs: dashed ring
// turning, leaves crossing, drizzle.
SCENES['rfa_lens'] = (() => {
  const { W, H, C, TAU, BEAT, ease, eout, paper, print, rain, leaves, stamp } = RFA, P = PAINT, { clamp, lerp } = U;
  const cake = () => print('cake', 380, 380, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#dcdcdc'); gr.addColorStop(1, '#7a7a7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#444'; g.beginPath(); g.ellipse(190, 300, 160, 36, 0, 0, TAU); g.fill();
    for (const [y, r, v] of [[280, 140, '#9a9a9a'], [196, 100, '#e8e8e8']]) { g.fillStyle = v; g.fillRect(190 - r, y - 76, r * 2, 76); g.fillStyle = '#f6f6f6'; g.beginPath(); g.ellipse(190, y - 76, r, r * 0.25, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#222'; g.beginPath(); g.arc(190, 104, 24, 0, TAU); g.fill();
  }, { cell: 6, edge: 0 });
  const birch = () => print('birch', 380, 380, (g, w, h) => {
    g.fillStyle = '#cfcfcf'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fafafa'; g.fillRect(160, 0, 54, h);                                   // the white trunk
    g.fillStyle = '#222'; for (let i = 0; i < 9; i++) g.fillRect(160 + (i % 2) * 20, 20 + i * 40, 30 - (i % 3) * 6, 8);   // its black marks
    g.fillStyle = '#8a8a8a'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(40 + (i * 53) % 300, 30 + (i * 37) % 200, 14, 0, TAU); g.fill(); }
  }, { cell: 6, edge: 0 });
  return {
    draw(c, lt, t) {
      const slam = 1 + 0.22 * (1 - eout(lt / 0.25));
      c.save(); c.translate(W / 2, H * 0.42); c.scale(slam, slam); c.translate(-W / 2, -H * 0.42);
      c.drawImage(paper('b'), 0, 0);
      const L = [330, 760], R = [750, 760], rad = 250;
      c.fillStyle = C.ink; c.beginPath(); c.arc(L[0], L[1], rad, 0, TAU); c.fill();
      const lp = new Path2D(); lp.arc(L[0], L[1], rad - 34, 0, TAU);
      c.save(); c.clip(lp); c.fillStyle = C.cream; c.fill(lp); c.drawImage(cake(), L[0] - 190, L[1] - 196); c.restore();
      c.lineWidth = 46; c.strokeStyle = C.red; c.beginPath(); c.arc(R[0], R[1], rad - 23, 0, TAU); c.stroke();
      const rp = new Path2D(); rp.arc(R[0], R[1], rad - 46, 0, TAU);
      c.save(); c.clip(rp); c.fillStyle = C.cream; c.fill(rp); c.drawImage(birch(), R[0] - 190, R[1] - 190); c.restore();
      c.fillStyle = C.ink; c.fillRect(L[0] + rad - 20, L[1] - 40, R[0] - L[0] - 2 * rad + 40, 46);
      c.save(); c.setLineDash([46, 22]); c.lineDashOffset = -260 * lt; c.strokeStyle = C.red; c.lineWidth = 8; c.beginPath(); c.arc(R[0], R[1], rad + 34, 0, TAU); c.stroke(); c.restore();
      // the wedge: drives in on every second beat
      const ph = (lt % (BEAT * 2)) / (BEAT * 2), thrust = 90 * Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 3);
      const tip = [L[0] + 40 + thrust * 0.6, L[1] + 150 - thrust * 0.3];
      c.fillStyle = C.red; c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(-60, 1640); c.lineTo(-60, 1300); c.closePath(); c.fill();
      leaves(c, lt + 7, { n: 9, seed: 21, size: 1.3, speed: 200 });
      rain(c, lt + 3, { n: 90, alpha: 0.25 });
      c.restore();
      // ORDERED, stamped diagonally over the cake on the second beat
      stamp(c, 'ORDERED', 200, 1300, 200, lt, BEAT * 2, { col: C.ink, rot: -0.18, gap: 0.04 });   // black: in red it merged into the wedge
      stamp(c, '1 × CAKE · FROM LOOKING AT IT', 210, 1400, 46, lt, BEAT * 3, { font: 'AlfaSlabOne-400', gap: 0.012 });
    },
  };
})();
