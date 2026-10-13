// Shot 2 · 6.4–12.9 s · The tax, 1 July 2026. An electricity meter on the data hall's
// cladding, its cables running up and out to the pylons against the dusk. Under it, the
// tax card: on the beats its digits roll, one wheel after another, from 0.05 to 2.24
// c/kWh, and the meter's disc spins faster; then a magenta stamp lands beside it: ≈ ×45.
SCENES['doh_meter'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, glow, ease, move, pop } = RFP, D = DOH, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_ROLL = B, T_STAMP = 5 * B, MX = 540, MY = 1020;
  const pylons = () => sheet('doh_pylons', (g) => {
    g.strokeStyle = '#1b1a17'; g.lineWidth = 6;
    for (const [x, y, s] of [[170, 900, 1], [930, 860, 0.8]]) {   // two lattice pylons
      g.beginPath(); g.moveTo(x - 70 * s, y); g.lineTo(x, y - 380 * s); g.lineTo(x + 70 * s, y); g.moveTo(x - 110 * s, y - 280 * s); g.lineTo(x + 110 * s, y - 280 * s); g.moveTo(x - 80 * s, y - 200 * s); g.lineTo(x + 80 * s, y - 200 * s); g.stroke();
      g.lineWidth = 3; g.beginPath(); for (let k = 0; k < 6; k++) { const y0 = y - k * 60 * s, w0 = 70 * s * (1 - k / 7), w1 = 70 * s * (1 - (k + 1) / 7); g.moveTo(x - w0, y0); g.lineTo(x + w1, y0 - 60 * s); g.moveTo(x + w0, y0); g.lineTo(x - w1, y0 - 60 * s); } g.stroke(); g.lineWidth = 6;
    }
    g.lineWidth = 3; for (const dy of [-280, -200]) { g.beginPath(); g.moveTo(-90, 640 + dy * 0.2); g.quadraticCurveTo(170, 900 + dy * 0.8, 170 - 110, 900 + dy); g.moveTo(170 + 110 * (dy === -280 ? 1 : 0.8), 900 + dy); g.quadraticCurveTo(560, 860 + dy * 0.4, 930 - 88, 860 + dy * 0.8); g.moveTo(930 + 88, 860 + dy * 0.8); g.quadraticCurveTo(1100, 800 + dy * 0.6, W + 90, 760 + dy * 0.5); g.stroke(); }
  }, 10);
  const wall = () => sheet('doh_wall', (g) => {
    g.fillStyle = D.C.hall; g.fillRect(-90, 760, W + 180, H);
    g.fillStyle = D.C.hallL; for (let x = -60; x < W + 90; x += 90) g.fillRect(x, 760, 6, H);   // the cladding's seams
    g.fillStyle = '#202220'; g.fillRect(-90, 760, W + 180, 22);
  }, 14);
  const meter = () => sprite('doh_meter', 640, 760, 320, 380, (g) => {
    g.fillStyle = '#1e1f1d'; g.beginPath(); g.roundRect(-300, -360, 600, 720, 40); g.fill();
    g.fillStyle = K.card; g.beginPath(); g.roundRect(-270, -330, 540, 660, 30); g.fill();
    g.fillStyle = '#2a2b28'; g.beginPath(); g.arc(0, -120, 190, 0, TAU); g.fill();                       // the window's rim
    g.fillStyle = '#121311'; g.beginPath(); g.arc(0, -120, 170, 0, TAU); g.fill();
    g.fillStyle = K.ink; g.font = '24px "RobotoCondensed"'; g.textAlign = 'center'; g.fillText('kWh', 0, 150);
    g.fillStyle = '#121311'; g.fillRect(-180, 100 - 20, 360, 0);
  }, 12);
  const card = () => sprite('doh_taxcard', 700, 340, 350, 170, (g) => { g.fillStyle = K.ochre; g.beginPath(); g.roundRect(-320, -150, 640, 300, 12); g.fill(); g.strokeStyle = K.ink; g.lineWidth = 4; g.strokeRect(-300, -130, 600, 260); g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '30px "ArchivoBlack-400"'; g.fillText('ELECTRICITY TAX · DATA CENTRES', 0, -86); g.font = '34px "RobotoCondensed"'; g.fillText('c/kWh', 220, 96); g.textAlign = 'left'; }, 10);
  const stampMark = () => sprite('doh_x45', 380, 220, 190, 110, (g) => {
    g.strokeStyle = K.mag; g.lineWidth = 9; g.strokeRect(-170, -90, 340, 180); g.fillStyle = K.mag; g.font = '120px "Anton-400"'; g.textAlign = 'left';
    g.font = '80px "Anton-400"'; g.fillText('≈', -150, 30); g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(-86, -34); g.lineTo(-26, 36); g.moveTo(-26, -34); g.lineTo(-86, 36); g.stroke();   // the ×, drawn: the font's is too small at phone size
    g.font = '130px "Anton-400"'; g.fillText('45', -6, 48);
  }, 3);
  /** one rolling digit wheel: value v (may be fractional between two digits) */
  function wheel(c, x, y, v, size, col = K.ink) {
    c.save(); c.beginPath(); c.rect(x - size * 0.36, y - size * 0.8, size * 0.72, size * 0.92); c.clip();
    c.fillStyle = col; c.font = `${size}px "Anton-400"`; c.textAlign = 'center';
    const d = Math.floor(v), f = v - d;
    for (const [n, off] of [[d, 0], [d + 1, 1]]) c.fillText(String(((n % 10) + 10) % 10), x, y - f * size * 1.1 + off * size * 1.1);
    c.restore();
  }
  return {
    draw(c, lt) {
      const cam = { x: Math.sin(lt * 0.6) * 10, y: 0, z: move(lt, T_STAMP, 1.6, 1.0, 1.06), fx: MX, fy: 1400 };
      // the rate: three wheels after the point roll from 0.05 to 2.24, staggered on the beat
      const kd = (i) => ease.out(clamp((lt - T_ROLL - i * B * 0.5) / (B * 1.6), 0, 1));
      const from = [0, 0, 5], to = [2, 2, 4], vals = from.map((a, i) => a + ((to[i] - a + (to[i] < a ? 10 : 0)) * kd(i)));
      const rate = lerp(0.05, 2.24, kd(2)), spin = lt * (1.2 + rate * 2.4);
      stack(c, [
        { sh: dusk('doh_m', 900), d: 0.04, lift: 0 },
        { sh: pylons(), d: 0.1, lift: 0.4 },
        { sh: wall(), d: 0.2, lift: 0.8 },
        { fn: (g, ox) => {
          // cables from the meter's top up the wall and away
          g.strokeStyle = '#141412'; g.lineWidth = 16; g.lineCap = 'round'; for (const dx of [-60, 0, 60]) { g.beginPath(); g.moveTo(MX + dx + ox, MY - 360); g.lineTo(MX + dx + ox, 760); g.stroke(); }
          glow(g, MX + ox, MY - 60, 520, 'rgba(240,170,70,', 0.22);
          put(g, meter(), MX + ox, MY, { lift: 1.6 });
          // the disc, seen edge-on through the window: a band with a mark running round it, faster as the rate climbs
          g.save(); g.translate(MX + ox, MY - 120);
          g.fillStyle = '#8a8a80'; g.beginPath(); g.ellipse(0, 0, 140, 22, 0, 0, TAU); g.fill();
          g.fillStyle = '#5a5a52'; g.beginPath(); g.ellipse(0, 6, 140, 16, 0, 0, Math.PI); g.fill();
          const a = spin * 3, mx = Math.cos(a) * 130, front = Math.sin(a) > 0; if (front) { g.fillStyle = K.mag; g.fillRect(mx - 7, -6, 14, 26); }
          g.restore();
          // the kWh counter, ticking over
          const kwh = 48213 + lt * (40 + rate * 120);
          for (let i = 0; i < 6; i++) { const place = Math.pow(10, 5 - i), v = (kwh / place) % 10; g.fillStyle = '#121311'; g.fillRect(MX - 165 + i * 55 + ox, MY + 40, 48, 64); wheel(g, MX - 141 + i * 55 + ox, MY + 98, Math.floor(v), 56, K.card); }   // stepped, like a real counter: a half-rolled wheel reads as broken
        }, d: 0.3 },
        { fn: (g, ox) => {
          put(g, card(), MX + ox, 1530, { lift: 2 });
          // 0.05 → 2.24: wheel · point · wheel · wheel
          const y = 1612, x0 = MX - 150 + ox;
          wheel(g, x0, y, vals[0], 150); g.fillStyle = K.ink; g.font = '150px "Anton-400"'; g.textAlign = 'center'; g.fillText('.', x0 + 58, y); wheel(g, x0 + 116, y, vals[1], 150); wheel(g, x0 + 216, y, vals[2], 150); g.textAlign = 'left';
          const ks = pop(lt, T_STAMP, 0.18); if (ks > 0) put(g, stampMark(), MX + ox, MY + 215, { sc: lerp(1.6, 1, Math.min(ks, 1)), rot: -0.1, lift: 0.3 });
        }, d: 0.36 },
      ], cam);
      D.tag(c, '1.7.2026', 110, 1690, D.tagA(lt, 6.43));
      box(c);
    },
  };
})();
