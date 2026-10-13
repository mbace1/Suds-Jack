// TEST 11 · Papercut shadowbox. Seven sheets of coloured card cut and stacked in a
// box, each throwing a soft shadow on the one behind, lit from the upper left;
// the camera drifts so the sheets slide past each other at their own depths. Back
// to front: an autumn sky, a low sun, Helsinki's roofline (the cathedral's domes,
// Kallio's tower, a crane), a park of cut-paper maples, a billboard reading
// LOOKING IS FREE* and its footnote, a tram, and three masked walkers in front.
SCENES['ts_paper'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S } = RFM;
  const K = { sky0: '#f2b25a', sky1: '#e2733a', sun: '#fbe7b0', roof: '#7a2e24', roof2: '#a8452c', park: '#3e5a32', mapleA: '#d9542a', mapleB: '#f0a030', mapleC: '#b8322a', board: '#f4ead2', ink: '#1f1a16', tram: '#2f6a50', tramL: '#ead9a8', road: '#4a3b30', front: '#2a201a' };
  // one sheet: a shape filled flat, with the card's tooth printed into it
  function sheet(key, col, draw) {
    return P.cached('ts_p_' + key, W, H, (g) => {
      g.fillStyle = col; draw(g);
      g.globalCompositeOperation = 'source-atop';
      g.drawImage(P.grain('ts_p_tooth_' + key, 0.18, [255, 255, 255], 0.08), 0, 0);
      g.drawImage(P.grain('ts_p_toothd_' + key, 0.12, [0, 0, 0], 0.08), 0, 0);
      const sh = g.createLinearGradient(0, 0, W, H); sh.addColorStop(0, 'rgba(255,245,220,.10)'); sh.addColorStop(1, 'rgba(0,0,0,.10)'); g.fillStyle = sh; g.fillRect(0, 0, W, H);
    });
  }
  const scallop = (g, y, amp, n, seed) => { const r = U.rng(seed); g.beginPath(); g.moveTo(-80, H); g.lineTo(-80, y); for (let i = 0; i <= n; i++) { const x = -80 + i * (W + 160) / n; g.quadraticCurveTo(x - (W + 160) / n / 2, y - amp * (0.6 + r() * 0.8), x, y); } g.lineTo(W + 80, H); g.closePath(); g.fill(); };
  const layers = () => [
    { d: 0.05, c: sheet('sky', K.sky1, (g) => { const gr = g.createLinearGradient(0, 0, 0, 1100); gr.addColorStop(0, K.sky0); gr.addColorStop(1, K.sky1); g.fillStyle = gr; g.fillRect(-100, -100, W + 200, H + 200); }) },
    { d: 0.1, c: sheet('sun', K.sun, (g) => { g.beginPath(); g.arc(700, 640, 170, 0, TAU); g.fill(); }) },
    { d: 0.2, c: sheet('city', K.roof, (g) => {
      g.fillRect(-80, 900, W + 160, H);
      const r = U.rng(2); for (let x = -80; x < W + 80; x += 70) g.fillRect(x, 860 - r() * 120, 64, 400);
      g.fillRect(150, 640, 70, 300); g.beginPath(); g.moveTo(140, 640); g.lineTo(185, 540); g.lineTo(230, 640); g.fill();          // Kallio's tower
      g.fillRect(470, 700, 200, 220); g.beginPath(); g.ellipse(570, 700, 90, 100, 0, Math.PI, 0); g.fill(); g.fillRect(564, 560, 12, 50);   // the cathedral, its dome and lantern
      for (const x of [440, 700]) { g.fillRect(x - 24, 760, 48, 160); g.beginPath(); g.ellipse(x, 760, 30, 36, 0, Math.PI, 0); g.fill(); }
      g.fillRect(880, 560, 14, 380); g.fillRect(780, 560, 260, 12); g.fillRect(1010, 572, 6, 140);            // a crane
    }) },
    { d: 0.32, c: sheet('city2', K.roof2, (g) => { const r = U.rng(5); for (let x = -80; x < W + 80; x += 110) { const h = 120 + r() * 160; g.fillRect(x, 1040 - h, 100, h + 400); g.beginPath(); g.moveTo(x - 6, 1040 - h); g.lineTo(x + 50, 1040 - h - 60); g.lineTo(x + 106, 1040 - h); g.fill(); } }) },
    { d: 0.45, c: sheet('park', K.park, (g) => scallop(g, 1180, 70, 9, 3)) },
    { d: 0.5, c: sheet('maples', K.mapleA, (g) => { const r = U.rng(7); for (let i = 0; i < 9; i++) { const x = 40 + i * 125 + r() * 40, y = 1110 + r() * 60; g.fillStyle = [K.mapleA, K.mapleB, K.mapleC][i % 3]; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + (r() - 0.5) * 90, y - r() * 110, 48 + r() * 26, 0, TAU); g.fill(); } g.fillStyle = K.front; g.fillRect(x - 7, y, 14, 120); } }) },
    { d: 0.58, c: sheet('board', K.board, (g) => { g.fillRect(560, 900, 420, 230); g.fillStyle = K.ink; g.fillRect(620, 1130, 16, 120); g.fillRect(900, 1130, 16, 120); g.fillRect(560, 900, 420, 10); }) },
    { d: 0.72, c: sheet('road', K.road, (g) => { g.fillRect(-80, 1380, W + 160, H); }) },
    { d: 0.78, slide: true, c: sheet('tram', K.tram, (g) => {
      g.beginPath(); g.roundRect(-60, 1180, 760, 230, 40); g.fill();
      g.fillStyle = K.tramL; g.fillRect(-60, 1180, 760, 44); for (let i = 0; i < 5; i++) g.fillRect(-20 + i * 140, 1250, 110, 80);
      g.fillStyle = K.ink; g.fillRect(320, 1120, 8, 60); g.fillRect(280, 1110, 90, 8); for (const x of [60, 560]) { g.beginPath(); g.arc(x, 1412, 34, 0, TAU); g.fill(); }
    }) },
    { d: 1.0, c: sheet('front', K.front, (g) => { scallop(g, 1700, 50, 6, 9); g.fillRect(-80, 1720, W + 160, H); }) },
  ];
  return {
    draw(c, lt) {
      const cam = Math.sin(lt * 0.6) * 30, camY = Math.cos(lt * 0.45) * 10, ls = layers();
      c.fillStyle = '#20160f'; c.fillRect(0, 0, W, H);
      ls.forEach((L, i) => {
        const ox = -cam * L.d * 1.6 + (L.slide ? 300 - lt * 70 : 0), oy = -camY * L.d;
        c.save();
        if (i > 0) { c.shadowColor = 'rgba(30,15,5,.55)'; c.shadowBlur = 18 + 16 * L.d; c.shadowOffsetX = 10 + 10 * L.d; c.shadowOffsetY = 14 + 12 * L.d; }
        c.drawImage(L.c, ox, oy);
        c.restore();
        // the words on the billboard sheet ride with it
        if (L.c === ls[6].c) {
          c.fillStyle = K.ink; c.font = '68px "ArchivoBlack-400"'; c.textAlign = 'center'; c.fillText('LOOKING', 770 + ox, 990 + oy); c.fillText('IS FREE*', 770 + ox, 1062 + oy);
          c.font = '22px "ArchivoBlack-400"'; c.fillStyle = K.mapleC; c.fillText('*FOR THE FIRST 3 SECONDS', 770 + ox, 1104 + oy); c.textAlign = 'left';
        }
        // the walkers stand on the road sheet, in front of the tram
        if (L.d === 0.78) {
          [[160, S.YELLOW, '#4a2a1a'], [470, S.PINK, '#22302a'], [800, S.ORANGE, '#3a2a40']].forEach(([x, col, coat], k) => {
            const wx = x - cam * 0.9 + Math.sin(lt * 0.8 + k) * 30, wy = 1560 + Math.abs(Math.sin(lt * 4 + k)) * -6;
            c.save(); c.shadowColor = 'rgba(30,15,5,.55)'; c.shadowBlur = 26; c.shadowOffsetX = 18; c.shadowOffsetY = 22;
            c.fillStyle = coat; c.beginPath(); c.moveTo(wx - 70, wy + 200); c.quadraticCurveTo(wx - 80, wy - 10, wx, wy - 20); c.quadraticCurveTo(wx + 80, wy - 10, wx + 70, wy + 200); c.closePath(); c.fill();
            c.restore();
            mask(c, wx, wy - 70, 64, col, { glasses: true, led: true, t: lt + k, strap: false, shade: false, face: K.board, frame: K.ink, ink: K.ink });
          });
        }
      });
      // falling paper leaves between the sheets
      const r = U.rng(21); for (let i = 0; i < 16; i++) { const d = 0.4 + r() * 0.6, x = (r() * W - cam * d * 1.6 + Math.sin(lt * 1.5 + i) * 40), y = (r() * H + lt * 90 * d) % H;
        c.save(); c.translate(x, y); c.rotate(lt * 1.3 + i); c.shadowColor = 'rgba(30,15,5,.5)'; c.shadowBlur = 8; c.shadowOffsetX = 6; c.shadowOffsetY = 8; c.fillStyle = [K.mapleA, K.mapleB, K.mapleC][i % 3]; c.beginPath(); c.ellipse(0, 0, 18 * d + 6, 9 * d + 3, 0, 0, TAU); c.fill(); c.restore(); }
      // the box: a deep frame with its inner bevel
      c.save(); c.fillStyle = '#3a2618'; c.beginPath(); c.rect(0, 0, W, H); c.rect(60, 60, W - 120, H - 120); c.fill('evenodd');
      c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 24; c.strokeRect(72, 72, W - 144, H - 144); c.strokeStyle = '#5a3a24'; c.lineWidth = 4; c.strokeRect(60, 60, W - 120, H - 120); c.restore();
    },
  };
})();
