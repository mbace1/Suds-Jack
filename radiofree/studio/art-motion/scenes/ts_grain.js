// TEST 4 · Editorial grain (contemporary magazine illustration; the skill's 16_2026
// grain point technique, taken further). No outlines: flat shapes in a warm/cold
// split, modelled only by GRAIN — 2px points whose density is a function of
// position. Inside the bakery, warm; outside the rainy glass, the cold dusk; a
// masked face close to the window, its reticle locked on the cake in the middle.
SCENES['ts_grain'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S } = RFM;
  const K = { night: '#173330', night2: '#24504a', glow: '#f6c46b', wood: '#7a3f22', woodD: '#5a2c18', counter: '#c98a4f', cream: '#fbeedd', coat: '#9c3f24', pink: '#ec1a7c', dome: 'rgba(255,255,255,.14)' };
  // grain: sprinkle points inside a path, density = f(x, y). Deterministic.
  function grain(g, path, bx, by, bw, bh, col, f, n = 9000, seed = 1) {
    const r = U.rng(seed); g.save(); g.clip(path); g.fillStyle = col;
    for (let i = 0; i < n; i++) { const x = bx + r() * bw, y = by + r() * bh; if (r() < f(x, y)) g.fillRect(x, y, 2, 2); }
    g.restore();
  }
  const rect = (x, y, w, h) => { const p = new Path2D(); p.rect(x, y, w, h); return p; };
  const ell = (x, y, rx, ry) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, 0, 0, TAU); return p; };
  const outside = () => P.cached('ts_g_out', W, H, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, 1300); sky.addColorStop(0, K.night); sky.addColorStop(1, K.night2); g.fillStyle = sky; g.fillRect(0, 0, W, 1300);
    grain(g, rect(0, 0, W, 1300), 0, 0, W, 1300, '#0c1f1d', (x, y) => 0.2 + 0.4 * (1 - y / 1300), 120000, 3);
    // far facades across the street, a few warm windows
    g.fillStyle = '#122a27'; g.fillRect(0, 260, W, 760);
    const r = U.rng(4); for (let y = 300; y < 900; y += 90) for (let x = 40; x < W; x += 110) if (r() < 0.3) { g.fillStyle = '#e7b766'; g.fillRect(x, y, 46, 58); }
    // street lamps with halos
    for (const x of [180, 900]) { const h = g.createRadialGradient(x, 420, 0, x, 420, 160); h.addColorStop(0, 'rgba(246,196,107,.6)'); h.addColorStop(1, 'rgba(246,196,107,0)'); g.fillStyle = h; g.fillRect(x - 160, 260, 320, 320); g.fillStyle = '#fbe3a8'; g.beginPath(); g.arc(x, 420, 14, 0, TAU); g.fill(); }
  });
  const inside = () => P.cached('ts_g_in', W, H, (g) => {
    // the window frame and its mullion
    g.fillStyle = K.wood; g.fillRect(0, 0, 60, 1320); g.fillRect(W - 60, 0, 60, 1320); g.fillRect(0, 0, W, 50); g.fillRect(0, 1250, W, 80); g.fillRect(950, 0, 34, 1300);   // the mullion, off-centre so it does not cut the face
    grain(g, rect(0, 1250, W, 80), 0, 1250, W, 80, K.woodD, (x, y) => 0.15 + (y - 1250) / 160, 30000, 5);
    // the counter, lit from above, grain darkening toward the front edge
    g.fillStyle = K.counter; g.fillRect(0, 1330, W, 590);
    grain(g, rect(0, 1330, W, 590), 0, 1330, W, 590, '#8a5530', (x, y) => clamp((y - 1330) / 700, 0, 1) * 0.55 + Math.abs(x - W / 2) / W * 0.3, 160000, 6);
    // the warm spill of the shop's light up the glass
    const sp = g.createLinearGradient(0, 1300, 0, 900); sp.addColorStop(0, 'rgba(246,196,107,.28)'); sp.addColorStop(1, 'rgba(246,196,107,0)'); g.fillStyle = sp; g.fillRect(60, 900, W - 120, 400);
    // the gold lettering on the glass, read from inside: backwards
    g.save(); g.translate(W / 2, 170); g.scale(-1, 1); g.font = '96px "PlayfairDisplay-700"'; g.textAlign = 'center'; g.fillStyle = 'rgba(232,186,92,.85)'; g.fillText('LEIPOMO', 0, 0); g.restore();
  });
  function cake(g, x, y, s, top, mid, seed) {
    const body = rect(x - 150 * s, y - 120 * s, 300 * s, 120 * s), tierT = rect(x - 100 * s, y - 220 * s, 200 * s, 100 * s);
    g.fillStyle = mid; g.fill(body); g.fillStyle = top; g.fill(tierT);
    g.fillStyle = K.cream; g.fill(ell(x, y - 120 * s, 150 * s, 26 * s)); g.fill(ell(x, y - 220 * s, 100 * s, 18 * s));
    grain(g, body, x - 150 * s, y - 120 * s, 300 * s, 120 * s, 'rgba(90,30,30,.9)', (px) => clamp((px - x) / (150 * s), 0, 1) * 0.6, 9000, seed);
    grain(g, tierT, x - 100 * s, y - 220 * s, 200 * s, 100 * s, 'rgba(120,80,60,.9)', (px) => clamp((px - x) / (100 * s), 0, 1) * 0.5, 5000, seed + 1);
    g.fillStyle = '#c8231c'; g.fill(ell(x, y - 252 * s, 26 * s, 26 * s));
    g.fillStyle = K.dome; g.beginPath(); g.ellipse(x, y, 190 * s, 320 * s, 0, Math.PI, 0); g.fill();                 // the glass dome
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(x - 110 * s, y - 180 * s, 16 * s, 80 * s, -0.3, 0, TAU); g.fill();
  }
  return {
    draw(c, lt) {
      c.drawImage(outside(), 0, 0);
      // a tram passing behind, far off: warm windows sliding
      c.fillStyle = '#1c3d38'; c.fillRect(-200 + ((lt * 160) % 1600) - 300, 820, 900, 170);
      c.fillStyle = '#e9bb6a'; for (let i = 0; i < 6; i++) c.fillRect(-180 + ((lt * 160) % 1600) - 300 + i * 140, 840, 100, 70);
      // the figure outside, close to the glass: shoulders, a hand pressed to the pane, the mask
      c.fillStyle = K.coat; c.beginPath(); c.moveTo(300, 1300); c.quadraticCurveTo(330, 900, 540, 880); c.quadraticCurveTo(750, 900, 780, 1300); c.closePath(); c.fill();
      c.fillStyle = '#e0a51c'; c.beginPath(); c.moveTo(440, 900); c.lineTo(640, 900); c.lineTo(600, 1010); c.lineTo(480, 1010); c.closePath(); c.fill();   // a scarf
      grain(c, (() => { const p = new Path2D(); p.moveTo(300, 1300); p.quadraticCurveTo(330, 900, 540, 880); p.quadraticCurveTo(750, 900, 780, 1300); p.closePath(); return p; })(), 300, 880, 480, 420, '#5a1f10', (x) => clamp((x - 540) / 340, 0, 1) * 0.6, 40000, 9);
      c.fillStyle = '#2a1712'; c.beginPath(); c.roundRect(700, 960, 100, 130, 36); c.fill();                // the gloved hand on the glass
      c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); c.ellipse(750, 1020, 80, 100, 0, 0, TAU); c.fill();   // its breath-mist on the pane
      mask(c, 540, 760, 125, K.pink, { glasses: true, led: true, t: lt, tilt: 0.06 + Math.sin(lt * 0.8) * 0.03, face: K.cream, frame: '#f2c46b', ink: '#120c0a' });
      // rain on the glass: drops that hang, then run
      const r = U.rng(17);
      for (let i = 0; i < 70; i++) {
        const x = 70 + r() * (W - 140), y0 = 60 + r() * 1150, sp = r(), run = sp > 0.7 ? ((lt * 220 * sp) % 400) : 0, rr = 4 + r() * 9;
        c.fillStyle = 'rgba(220,240,235,.35)'; c.beginPath(); c.arc(x, y0 + run, rr, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(x - rr * 0.3, y0 + run - rr * 0.3, rr * 0.3, 0, TAU); c.fill();
        if (run) { c.strokeStyle = 'rgba(220,240,235,.22)'; c.lineWidth = rr * 0.6; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 + run); c.stroke(); }
      }
      c.drawImage(inside(), 0, 0);
      cake(c, 190, 1660, 0.8, '#f3a7c0', '#e46a8f', 21);
      cake(c, 890, 1660, 0.8, '#b9e0c2', '#5fb07a', 25);
      cake(c, 540, 1860, 1.3, '#fbe2a6', '#e9b257', 23);
      // the reticle the glasses draw — reflected on the glass, round the big cake
      const k = clamp((lt - 0.6) / 0.4, 0, 1), sc = lerp(1.6, 1, k), cx = 540, cy = 1600;
      if (k > 0) { c.save(); c.translate(cx, cy); c.scale(sc, sc); c.strokeStyle = 'rgba(251,238,221,.9)'; c.lineWidth = 6;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(sx * 270, sy * 210); c.lineTo(sx * 270, sy * 290); c.lineTo(sx * 190, sy * 290); c.stroke(); }
        c.restore(); }
      if (lt > 1.1) { c.fillStyle = 'rgba(200,35,28,.92)'; c.fillRect(360, 1250, 360, 70); c.fillStyle = K.cream; c.font = '50px "Anton-400"'; c.textAlign = 'center'; c.fillText('ORDERED · 1 CAKE', 540, 1303); c.textAlign = 'left'; }
      // final grain over everything, so inside and outside are one print
      c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.6; c.drawImage(P.grain('ts_g', 0.05, [40, 25, 15], 0.18), 0, 0); c.restore();
    },
  };
})();
