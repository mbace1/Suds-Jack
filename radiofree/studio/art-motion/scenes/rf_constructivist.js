// B · Constructivist poster — "LOOK = BUY". Portrait 1080×1920.
// Composition (new): the glasses ARE the poster's geometry — two Lissitzky circles
// joined by a bridge, top half; a red wedge drives into the left lens from the
// lower left; inside each lens a halftone "photo" of what was looked at (cake,
// dog); a halftone photo-cutout hand points up from the bottom right (Rodchenko);
// the slogan is block lettering stamped down the diagonal.
// Technique from 22_constructivism: aged paper, grey source → P.halftoneGray at
// 45°, white cut edge round photo pieces, geometric glyphs filled part by part.
// Main action: the wedge thrusts on the beat and the slogan stamps in letter by letter.
// Motif loops: red dashed ring turning round the right lens, radio arcs from the
// camera on the bridge.
SCENES['rf_constructivist'] = (() => {
  const W = 1080, H = 1920, P = PAINT, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { paper: '#e9dfc4', paperD: '#d9c9a4', red: '#c8231c', redD: '#8f1711', ink: '#151311', cream: '#f4ecd6' };
  const ease = (k) => (k = clamp(k, 0, 1), k * k * (3 - 2 * k));

  // block glyphs on a 5×7 grid, every part filled on its own (no nonzero holes)
  const GL = {
    L: [[0, 0, 1.4, 7], [0, 5.6, 5, 1.4]],
    O: [[0, 0, 5, 1.4], [0, 5.6, 5, 1.4], [0, 0, 1.4, 7], [3.6, 0, 1.4, 7]],
    K: [[0, 0, 1.4, 7], { p: [[1.2, 3.1], [3.6, 0], [5, 0], [2.3, 3.5]] }, { p: [[1.2, 3.9], [2.3, 3.5], [5, 7], [3.6, 7]] }],
    B: [[0, 0, 1.4, 7], [0, 0, 4.4, 1.3], [0, 2.9, 4.4, 1.2], [0, 5.7, 4.6, 1.3], [3.6, 0, 1.3, 3.6], [3.7, 3.4, 1.3, 3.6]],
    U: [[0, 0, 1.4, 7], [3.6, 0, 1.4, 7], [0, 5.6, 5, 1.4]],
    Y: [{ p: [[0, 0], [1.4, 0], [3.1, 3.4], [1.9, 3.4]] }, { p: [[5, 0], [3.6, 0], [1.9, 3.4], [3.1, 3.4]] }, [1.8, 3.2, 1.4, 3.8]],
    '=': [[0, 1.8, 5, 1.3], [0, 4.0, 5, 1.3]],
  };
  function glyph(c, ch, x, y, u, col) {
    c.fillStyle = col;
    for (const part of GL[ch] || []) {
      c.beginPath();
      if (Array.isArray(part)) c.rect(x + part[0] * u, y + part[1] * u, part[2] * u, part[3] * u);
      else part.p.forEach(([px, py], i) => (i ? c.lineTo(x + px * u, y + py * u) : c.moveTo(x + px * u, y + py * u)));
      c.fill();
    }
  }

  // a grey "photograph" drawn off-screen, then halftoned onto the poster
  function photo(key, w, h, paint) {
    return P.cached('rfc_ph_' + key, w, h, (g) => { paint(g, w, h); });
  }
  const cakePhoto = () => photo('cake', 420, 420, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(1, '#7a7a7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a4a4a'; g.beginPath(); g.ellipse(210, 330, 170, 40, 0, 0, TAU); g.fill();
    for (const [y, r, v] of [[300, 150, '#9a9a9a'], [210, 110, '#e6e6e6']]) { g.fillStyle = v; g.fillRect(210 - r, y - 80, r * 2, 80); g.beginPath(); g.ellipse(210, y - 80, r, r * 0.25, 0, 0, TAU); g.fillStyle = '#f4f4f4'; g.fill(); }
    g.fillStyle = '#2a2a2a'; g.beginPath(); g.arc(210, 112, 26, 0, TAU); g.fill();
  });
  const dogPhoto = () => photo('dog', 420, 420, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#e8e8e8'); gr.addColorStop(1, '#8a8a8a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a5a5a'; g.beginPath(); g.ellipse(210, 300, 120, 110, 0, 0, TAU); g.fill();               // body
    g.fillStyle = '#7a7a7a'; g.beginPath(); g.arc(210, 170, 92, 0, TAU); g.fill();                                // head
    g.fillStyle = '#3a3a3a'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(210 + s * 88, 160, 30, 66, s * 0.3, 0, TAU); g.fill(); }  // ears
    g.fillStyle = '#c8c8c8'; g.beginPath(); g.ellipse(210, 210, 46, 34, 0, 0, TAU); g.fill();                   // muzzle
    g.fillStyle = '#111'; g.beginPath(); g.arc(210, 196, 14, 0, TAU); g.fill();
  });
  const handPhoto = () => photo('hand', 380, 640, (g) => {
    const gr = g.createLinearGradient(0, 0, 380, 0); gr.addColorStop(0, '#f4f4f4'); gr.addColorStop(1, '#8c8c8c');
    g.fillStyle = gr;
    const p = new Path2D(); // a pointing hand, index finger up, from a cuff at the bottom
    p.moveTo(130, 640); p.lineTo(110, 400); p.quadraticCurveTo(90, 330, 140, 300); p.lineTo(150, 60); p.quadraticCurveTo(175, 20, 200, 60);
    p.lineTo(205, 290); p.quadraticCurveTo(240, 270, 265, 300); p.quadraticCurveTo(300, 290, 315, 330); p.quadraticCurveTo(350, 330, 350, 380);
    p.lineTo(340, 470); p.quadraticCurveTo(320, 540, 280, 560); p.lineTo(290, 640); p.closePath(); g.fill(p);
    g.strokeStyle = '#6a6a6a'; g.lineWidth = 4; for (const y of [330, 360]) { g.beginPath(); g.moveTo(215, y); g.lineTo(330, y); g.stroke(); }
  });
  function placePhoto(c, src, x, y, s, clipPath, cell) {
    const k = 'rfc_ht_' + src.width + '_' + cell + '_' + x;
    const ht = P.cached(k, src.width, src.height, (g) => { g.fillStyle = C.cream; g.fillRect(0, 0, src.width, src.height); P.halftoneGray(g, src, 0, 0, src.width, src.height, cell, C.ink, 0.8); });
    c.save(); if (clipPath) c.clip(clipPath); c.drawImage(ht, x, y, src.width * s, src.height * s); c.restore();
  }

  const bg = () => P.cached('rfc_bg', W, H, (g) => {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    const r = U.rng(4); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,90,40,${r() * 0.06})`; g.beginPath(); g.arc(r() * W, r() * H, 2 + r() * 22, 0, TAU); g.fill(); }
    // structural bars: a black diagonal band and thin rules
    g.save(); g.translate(0, 1180); g.rotate(-0.42); g.fillStyle = C.ink; g.fillRect(-200, 0, 1600, 120); g.restore();
    g.strokeStyle = C.ink; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(80 + i * 22, 60); g.lineTo(80 + i * 22, 300); g.stroke(); }
    g.fillStyle = C.red; g.fillRect(860, 70, 150, 150);
    // small type on the black band, in cream block letters
    g.drawImage(P.grain('rfc', 0.05, [80, 60, 20], 0.14), 0, 0);
  });

  return {
    draw(c, lt) {
      c.drawImage(bg(), 0, 0);
      const L = [330, 640], R = [750, 640], rad = 250;
      // the left lens: a black disc with the cake photo cut into it
      c.fillStyle = C.ink; c.beginPath(); c.arc(L[0], L[1], rad, 0, TAU); c.fill();
      const lp = new Path2D(); lp.arc(L[0], L[1], rad - 34, 0, TAU);
      c.save(); c.fillStyle = C.cream; c.fill(lp); c.restore();
      placePhoto(c, cakePhoto(), L[0] - 210 + 0, L[1] - 220, 1.0, lp, 7);
      // the right lens: a red ring with the dog photo
      c.lineWidth = 46; c.strokeStyle = C.red; c.beginPath(); c.arc(R[0], R[1], rad - 23, 0, TAU); c.stroke();
      const rp = new Path2D(); rp.arc(R[0], R[1], rad - 46, 0, TAU);
      c.fillStyle = C.cream; c.fill(rp); placePhoto(c, dogPhoto(), R[0] - 210, R[1] - 200, 1.0, rp, 7);
      // the bridge with the camera, and its radio arcs (motif loop)
      c.fillStyle = C.ink; c.fillRect(L[0] + rad - 20, L[1] - 40, R[0] - L[0] - 2 * rad + 40, 46);
      c.fillStyle = C.red; c.beginPath(); c.arc(540, L[1] - 16, 24, 0, TAU); c.fill();
      for (let k = 0; k < 4; k++) {
        const q = (lt * 1.4 + k / 4) % 1, r = 30 + q * 300;
        c.strokeStyle = `rgba(200,35,28,${(1 - q) * 0.9})`; c.lineWidth = 10 * (1 - q) + 2;
        c.beginPath(); c.arc(540, L[1] - 16, r, -Math.PI * 0.82, -Math.PI * 0.18); c.stroke();
      }
      // the turning dashed ring around the right lens (motif loop)
      c.save(); c.setLineDash([46, 22]); c.lineDashOffset = -260 * lt; c.strokeStyle = C.red; c.lineWidth = 8;
      c.beginPath(); c.arc(R[0], R[1], rad + 34, 0, TAU); c.stroke(); c.restore();
      // MAIN ACTION — the red wedge thrusts into the left lens, on the beat
      const beat = 60 / 112, ph = (lt % (beat * 2)) / (beat * 2), thrust = 70 * Math.pow(Math.max(0, Math.sin(ph * Math.PI)), 3);
      const ax = 0.6, tipD = lerp(0, 1, ease(lt / 0.6));
      const tip = [L[0] + 30 + Math.cos(-ax) * thrust * 0.4, L[1] + 170 - Math.sin(ax) * thrust * 0.4];
      const base1 = [-60, 1500], base2 = [-60, 1180];
      if (tipD > 0) { c.fillStyle = C.red; c.beginPath(); c.moveTo(lerp(-60, tip[0], tipD), lerp(1340, tip[1], tipD)); c.lineTo(base1[0], base1[1]); c.lineTo(base2[0], base2[1]); c.closePath(); c.fill(); }
      // the pointing hand: a halftone photo cut-out with its white edge
      const hx = 700, hy = 1260 + Math.sin(lt * 3) * 8;
      c.save(); c.shadowColor = 'rgba(0,0,0,.25)'; c.shadowBlur = 6; c.shadowOffsetX = 5; c.shadowOffsetY = 6;
      const hand = handPhoto(); const hk = P.cached('rfc_handht', hand.width, hand.height, (g) => { P.halftoneGray(g, hand, 0, 0, hand.width, hand.height, 6, C.ink, 0.85); });
      c.drawImage(P.cached('rfc_handedge', hand.width + 20, hand.height + 20, (g) => { g.filter = 'drop-shadow(0 0 5px #f4ecd6) drop-shadow(0 0 3px #f4ecd6)'; g.drawImage(hand, 10, 10); g.filter = 'none'; g.globalCompositeOperation = 'source-atop'; g.fillStyle = C.cream; g.fillRect(0, 0, hand.width + 20, hand.height + 20); }), hx - 10, hy - 10);
      c.restore();
      c.drawImage(hk, hx, hy);
      // the slogan, stamped letter by letter, then riding a wave
      const text = 'LOOK=BUY', u = 25, step = 5.6 * u;
      [...text].forEach((ch, i) => {
        const at = 0.8 + i * 0.09, k = clamp((lt - at) / 0.12, 0, 1); if (k <= 0) return;
        const s = lerp(1.6, 1, k), x = 60 + (i % 4) * step, y = i < 4 ? 1330 : 1560;   // below the black band, which crossed it
        const wave = -10 * Math.max(0, Math.sin(11 * lt - 0.8 * i)) * (lt > 2 ? 1 : 0);
        c.save(); c.translate(x + 2.5 * u, y + 3.5 * u + wave); c.scale(s, s); c.translate(-(2.5 * u), -(3.5 * u));
        glyph(c, ch, 0, 0, u, i % 4 === 3 ? C.red : C.ink); c.restore();
      });
      // the small line on the black band: SAY ITS NAME
      c.save(); c.translate(0, 1180); c.rotate(-0.42); c.font = '62px "AlfaSlabOne-400"'; c.fillStyle = C.cream; c.textBaseline = 'middle';
      c.fillText('SAY ITS NAME · IT SEES · IT BUYS', 140, 62); c.restore();
    },
  };
})();
