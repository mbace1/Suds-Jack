// Shot 4 · 9.6–12.8 · a queue of backs at the tram stop, every head in the
// glasses. One birch leaf falls; every head turns to follow it at once; the leaf
// gets a price. Camera pulls out to show the billboard over them: LOOK = BUY.
// Motifs: drizzle, the heads' radio arcs, the tram stop sign swinging.
SCENES['rfa_queue'] = (() => {
  const { W, H, C, TAU, BEAT, ease, eout, paper, print, rain, leaf, stamp, back } = RFA, { clamp, lerp } = U;
  const PEOPLE = [ { x: 150, s: 0.9, coat: C.ink, hat: null }, { x: 330, s: 1.0, coat: '#3a332c', hat: C.ink }, { x: 520, s: 0.95, coat: C.ink, hat: null, hair: '#6a4a2a' },
    { x: 700, s: 1.05, coat: '#4a3f36', hat: null }, { x: 890, s: 0.92, coat: C.ink, hat: C.red } ];
  return {
    draw(c, lt, t) {
      const z = lerp(1.22, 1.0, ease(lt / 3.2));                // the pull-out
      c.save(); c.translate(W / 2, H * 0.62); c.scale(z, z); c.translate(-W / 2, -H * 0.62);
      c.drawImage(paper('d'), 0, 0);
      // the billboard: LOOK = BUY in block letters, black and red
      c.fillStyle = C.ink; c.fillRect(60, 140, 960, 560); c.fillStyle = C.cream; c.fillRect(84, 164, 912, 512);
      c.font = '300px "Anton-400"'; c.fillStyle = C.ink; c.fillText('LOOK', 110, 440); c.fillStyle = C.red; c.fillText('=BUY', 110, 660);
      c.fillStyle = C.red; c.beginPath(); c.arc(860, 300, 90, 0, TAU); c.fill();
      // the shelter roof and the pavement
      c.fillStyle = C.ink; c.fillRect(0, 900, W, 40); c.fillRect(40, 940, 16, 700); c.fillRect(1020, 940, 16, 700);
      c.fillStyle = '#3a332c'; c.fillRect(0, 1640, W, 280);
      // the tram stop sign, swinging (motif)
      // inside the frame even at the start of the pull-out (qa: half-cut at x 1000)
      c.save(); c.translate(900, 980); c.rotate(Math.sin(lt * 2.2) * 0.06); c.fillStyle = C.ruska; c.beginPath(); c.arc(0, 60, 54, 0, TAU); c.fill(); c.fillStyle = C.ink; c.font = '62px "Anton-400"'; c.textAlign = 'center'; c.fillText('3', 0, 84); c.restore();
      // the leaf: falls from top left in a long zigzag
      const k = clamp((lt - 0.2) / 2.4, 0, 1), lx = lerp(200, 640, k) + Math.sin(k * 9) * 120, ly = lerp(860, 1180, k);
      const turn = clamp((lx - 540) / 380, -1, 1);
      PEOPLE.forEach((p, i) => {
        const lag = clamp((lt - 0.3 - i * 0.04) / 0.2, 0, 1);  // heads follow on the same beat, near enough
        back(c, p.x, 1240, p.s, { coat: p.coat, hat: p.hat, hair: p.hair, turn: turn * lag, led: true, t: lt + i * 0.13 });
      });
      leaf(c, lx, ly, 2.2, k * 9);
      if (lt > 2.4) { const kk = eout((lt - 2.4) / 0.25); c.save(); c.translate(lx + 60, ly - 40); c.rotate(-0.15); c.scale(kk, kk);
        c.fillStyle = C.cream; c.fillRect(0, -36, 220, 72); c.strokeStyle = C.ink; c.lineWidth = 5; c.strokeRect(0, -36, 220, 72);
        c.fillStyle = C.red; c.font = '62px "Anton-400"'; c.fillText('$249', 30, 24); c.restore(); }
      rain(c, lt + 9, { n: 110, alpha: 0.3 });
      c.restore();
    },
  };
})();
