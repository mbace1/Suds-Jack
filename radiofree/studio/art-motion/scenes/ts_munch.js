// TEST 12 · Expressionist oil (after Munch, "The Scream", 1893). The sky over the
// bay goes to bands of blood orange; the railing rushes away to the upper left
// where two figures walk off with their shopping; in front, a figure in a mask —
// still smiling, because masks do — presses both hands to its sides. Painted as
// strokes that follow the bands, the swirl of the water and the run of the
// railing, re-laid eight times a second so the whole picture boils. The museum
// label is the joke: THE TOTAL.
SCENES['ts_munch'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S } = RFM;
  const K = { coat: '#232a26', glove: '#efe2c0', rail: '#b8652a', deck: '#7a3e1e', water: '#25463e', waterL: '#3f6a56', land: '#3b4a26', landL: '#6a6a2a', ink: '#1a1512' };
  const SKY = ['#d8461c', '#ee7a22', '#f4b23e', '#c8301a', '#f09a2c', '#e8622a', '#f6c45a'];
  const HZ = 860, VP = [70, 930];                                        // horizon; where the railing vanishes
  const band = (x, y) => y + 46 * Math.sin(x * 0.006 + y * 0.012) + 22 * Math.sin(x * 0.013 - y * 0.02);
  const onDeck = (x, y) => y > lerp(VP[1], 1980, (x - VP[0]) / (W + 200 - VP[0])) - 40 && x > VP[0];
  const base = () => P.cached('ts_m_base', W, H, (g) => {
    g.fillStyle = SKY[1]; g.fillRect(0, 0, W, HZ + 80);
    for (let y = -60; y < HZ + 60; y += 6) { const k = Math.floor(((y + 60) / 64)) % SKY.length; g.fillStyle = SKY[k]; g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, band(x, y)); g.lineTo(W, band(W, y) + 8); for (let x = W; x >= 0; x -= 20) g.lineTo(x, band(x, y) + 8); g.fill(); }
    // the bay, and the far shore's dark hill bleeding into it
    g.fillStyle = K.water; g.fillRect(0, HZ - 40, W, H);
    for (let i = 0; i < 14; i++) { g.strokeStyle = i % 2 ? K.waterL : '#1c3630'; g.lineWidth = 26; g.beginPath(); g.ellipse(360, 1140, 120 + i * 40, 50 + i * 18, -0.2, 0, TAU); g.stroke(); }
    g.fillStyle = K.land; g.beginPath(); g.moveTo(420, HZ - 30); g.quadraticCurveTo(760, 700, W + 40, 760); g.lineTo(W + 40, 1500); g.quadraticCurveTo(820, 1200, 420, HZ - 30); g.fill();
    g.fillStyle = K.landL; g.beginPath(); g.moveTo(620, 820); g.quadraticCurveTo(900, 760, W + 40, 820); g.lineTo(W + 40, 1000); g.quadraticCurveTo(850, 920, 620, 820); g.fill();
    // the deck, rushing off to the upper left
    g.fillStyle = K.deck; g.beginPath(); g.moveTo(VP[0], VP[1]); g.lineTo(W + 200, 1700); g.lineTo(W + 200, H + 100); g.lineTo(-200, H + 100); g.closePath(); g.fill();
    g.fillStyle = '#9a5228'; g.beginPath(); g.moveTo(VP[0], VP[1]); g.lineTo(W + 200, 1980); g.lineTo(-200, H + 100); g.closePath(); g.fill();
  });
  const flow = (x, y) => {
    if (onDeck(x, y)) return Math.atan2(1980 - VP[1], W + 200 - VP[0]);                      // along the boards
    if (y < HZ) { const e = 0.6; return Math.atan2(band(x + e, y) - band(x - e, y), 2 * e); }   // along the sky's bands
    if (x > 600 && y < 1300 && y > 760) return -0.18;                                         // across the far hill
    return Math.atan2(y - 1140, x - 360) + Math.PI / 2;                                       // round the bay's swirl
  };
  return {
    draw(c, lt) {
      c.drawImage(base(), 0, 0);
      P.strokes(c, base(), { cell: 13, len: 34, width: 9, angle: (x, y) => flow(x, y), seed: 3, t: lt, boil: 8, outline: 0.22, outlineCol: [40, 20, 10], outlineMix: 0.6, jitterCol: 26 });
      // the railing: three long rails converging, painted in two loaded strokes each
      c.lineCap = 'round';
      for (const [dy, w] of [[-260, 16], [-170, 12], [-90, 9]]) {
        c.strokeStyle = 'rgba(40,20,10,.6)'; c.lineWidth = w + 6; c.beginPath(); c.moveTo(VP[0], VP[1] - dy * 0.05 - 30); c.lineTo(W + 100, 1700 + dy); c.stroke();
        c.strokeStyle = K.rail; c.lineWidth = w; c.beginPath(); c.moveTo(VP[0], VP[1] - dy * 0.05 - 30); c.lineTo(W + 100, 1700 + dy); c.stroke();
      }
      for (let i = 0; i < 9; i++) { const q = (i + 1) / 10, x = lerp(VP[0], W + 100, q * q), y0 = lerp(VP[1] - 30, 1440, q * q), y1 = lerp(VP[1], 1720, q * q); c.strokeStyle = K.rail; c.lineWidth = 3 + q * 12; c.beginPath(); c.moveTo(x, y0); c.lineTo(x - 10 * q, y1); c.stroke(); }
      // two figures walking away at the far end, carrying bags
      for (const [x, y, s] of [[170, 935, 1], [230, 950, 1.1]]) { const b = Math.sin(lt * 5 + x) * 2; c.fillStyle = K.ink; c.beginPath(); c.ellipse(x, y - 40 * s + b, 9 * s, 34 * s, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(x, y - 82 * s + b, 8 * s, 0, TAU); c.fill(); c.fillStyle = '#f2e2b0'; c.fillRect(x + 8 * s, y - 34 * s + b, 12 * s, 14 * s); }
      // the figure: a coat that sways like the bands, hands at the mask, the mask still smiling
      const sw = Math.sin(lt * 1.3) * 18, mx = 560 + sw * 0.6, my = 1210;
      c.fillStyle = K.coat; c.beginPath(); c.moveTo(mx - 60, my + 120); c.bezierCurveTo(mx - 200 + sw, my + 420, mx - 120 - sw, my + 560, mx - 230, H + 20); c.lineTo(mx + 260, H + 20); c.bezierCurveTo(mx + 150 - sw, my + 560, mx + 220 + sw, my + 380, mx + 60, my + 120); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(80,90,70,.7)'; c.lineWidth = 8; for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(mx - 40 + k * 16, my + 160); c.bezierCurveTo(mx - 120 + k * 30 + sw, my + 420, mx - 60 + k * 20 - sw, my + 560, mx - 160 + k * 60, H); c.stroke(); }
      mask(c, mx, my, 130, S.YELLOW, { glasses: true, led: true, t: lt, tilt: Math.sin(lt * 1.3) * 0.08, strap: false, shade: false, face: '#f6ecd0', frame: K.ink, ink: K.ink });
      c.strokeStyle = K.coat; c.lineCap = 'round'; c.lineWidth = 64;
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(mx + sx * 134, my + 80); c.bezierCurveTo(mx + sx * 170, my + 200, mx + sx * 90 + sw, my + 230, mx + sx * 70, my + 330); c.stroke(); }
      for (const sx of [-1, 1]) {
        c.save(); c.translate(mx + sx * 128, my + 20); c.rotate(sx * -0.2);
        c.fillStyle = K.glove; c.strokeStyle = K.ink; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, 40, 86, 0, 0, TAU); c.fill(); c.stroke();
        c.lineWidth = 4; for (const fx of [-14, 0, 14]) { c.beginPath(); c.moveTo(fx, -70); c.lineTo(fx, -20); c.stroke(); }
        c.restore();
      }
      // the label beside the frame
      c.fillStyle = '#f4ead2'; c.fillRect(640, 1760, 380, 110); c.strokeStyle = K.ink; c.lineWidth = 3; c.strokeRect(640, 1760, 380, 110);
      c.fillStyle = K.ink; c.font = '38px "LibreBaskerville-700"'; c.fillText('The Total', 662, 1806); c.font = '24px "LibreBaskerville-400"'; c.fillText('oil on receipt, Helsinki 2026', 662, 1846);
    },
  };
})();
