// Shot 1 · 0–3.2 · Senate Square in the drizzle. A man under a black Lissitzky
// umbrella walks away from us; he says its name and the red light on his glasses
// comes on. Camera holds. Motifs: drizzle, falling birch leaves, radio arcs.
SCENES['rfa_square'] = (() => {
  const { W, H, C, TAU, ease, paper, print, rain, leaves, stamp, back } = RFA, P = PAINT, { clamp, lerp } = U;
  // the square as a grey photograph: overcast sky, the cathedral on its steps, wet stone
  const square = () => print('square', 1000, 900, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#9a9a9a'); sky.addColorStop(0.55, '#d8d8d8'); sky.addColorStop(1, '#6a6a6a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const cx = w / 2;
    g.fillStyle = '#f2f2f2';                                                                   // the cathedral, white
    g.fillRect(cx - 230, 420, 460, 230); g.fillRect(cx - 120, 300, 240, 130);
    g.beginPath(); g.ellipse(cx, 300, 140, 150, 0, Math.PI, 0); g.fill();
    g.fillRect(cx - 14, 120, 28, 40); g.fillRect(cx - 4, 70, 8, 60);
    for (const s of [-1, 1]) { g.fillRect(cx + s * 230 - 34, 330, 68, 100); g.beginPath(); g.ellipse(cx + s * 230, 330, 46, 52, 0, Math.PI, 0); g.fill(); }
    g.fillStyle = '#8a8a8a'; for (let i = 0; i < 6; i++) g.fillRect(cx - 170 + i * 66, 470, 20, 170);   // columns' shadows
    g.fillStyle = '#b8b8b8'; for (let i = 0; i < 7; i++) g.fillRect(cx - 300 - i * 30, 650 + i * 26, 600 + i * 60, 26); // steps
    g.fillStyle = '#5a5a5a'; g.fillRect(0, 840, w, 60);
  }, { cell: 7, edge: 8 });
  return {
    draw(c, lt, t) {
      c.drawImage(paper('a'), 0, 0);
      // a red sun-disc that is not a sun (four o'clock, the light already going)
      c.fillStyle = C.red; c.beginPath(); c.arc(820, 300, 150, 0, TAU); c.fill();
      c.drawImage(square(), 40, 260);
      // wet paving: black wedge with ruska reflections
      // wet paving: grey halftone stone (not black — a black coat vanished into it), ruska reflections
      c.save(); c.beginPath(); c.moveTo(0, 1240); c.lineTo(W, 1170); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.clip();
      c.fillStyle = '#b9ad94'; c.fillRect(0, 1160, W, 800);
      c.fillStyle = PAINT.dotPattern(c, 'rfa_wet', 12, 3.4, '#6b6458'); c.fillRect(0, 1160, W, 800); c.restore();
      c.fillStyle = C.ruska; c.globalAlpha = 0.5; for (let i = 0; i < 6; i++) c.fillRect(120 + i * 150 + Math.sin(lt * 2 + i) * 8, 1300 + i * 70, 80, 8); c.globalAlpha = 1;
      // the man walks away, smaller with each step
      const k = lt / 3.2, s = lerp(1.7, 1.45, k), step = Math.sin(lt * TAU * (112 / 120)), bob = Math.abs(step) * 10;
      const on = lt > 1.7;
      back(c, 560, 1330 - k * 60, s, { umbrella: true, step, bob, turn: 0, led: on, t: lt, coat: C.ink });
      // the radio arcs, once the light is on
      if (on) for (let i = 0; i < 3; i++) { const q = ((lt - 1.7) * 1.3 + i / 3) % 1, r = 20 + q * 260; c.strokeStyle = C.red; c.globalAlpha = (1 - q) * 0.9; c.lineWidth = 8 * (1 - q) + 2;
        c.beginPath(); c.arc(560 + 64 * s, 1330 - k * 60 - 40 * s, r, -1.2, 0.3); c.stroke(); c.globalAlpha = 1; }
      leaves(c, lt + 3, { n: 12, seed: 11, size: 1.2 });
      rain(c, lt, { n: 120, alpha: 0.32 });
      // SAY ITS NAME, stamped across the top
      stamp(c, 'SAY ITS', 70, 190, 150, lt, 0.5, { red: [] });
      stamp(c, 'NAME', 70, 340, 190, lt, 0.9, { red: [0, 1, 2, 3], gap: 0.08 });
    },
  };
})();
