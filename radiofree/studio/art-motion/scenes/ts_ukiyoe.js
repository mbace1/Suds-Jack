// TEST 5 · Ukiyo-e rain (after Hiroshige, "Sudden Shower over Shin-Ōhashi", 1857).
// The bridge on a steep diagonal, people hurrying across under umbrellas, the far
// bank in mist, the sky's dark bokashi, rain as two fields of fine straight lines.
// Here: Pitkäsilta in Helsinki, Kallio church on the far bank, every hurrying
// figure in a mask and the glasses. Keyblock outlines, flat colour blocks, a
// woodgrain ghost in the paper, a title cartouche, and Toko as the publisher's seal.
SCENES['ts_ukiyoe'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S, shapes } = RFM;
  const K = { paper: '#ece2c8', key: '#1e1a17', prussian: '#24476b', prussianL: '#5c7f99', mist: '#b9b39c', wood: '#8c6a43', woodL: '#b58f5e', straw: '#d2b06a', seal: '#c8231c', sky: '#3a3a36' };
  const paper = () => P.cached('ts_u_paper', W, H, (g) => {
    g.fillStyle = K.paper; g.fillRect(0, 0, W, H);
    // the ghost of the woodblock's grain, printed faintly through everything
    g.strokeStyle = 'rgba(120,95,60,.07)'; g.lineWidth = 2;
    for (let y = 0; y < H; y += 9) { g.beginPath(); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.006 + y * 0.03) * 7 + P.fbm(x * 0.003, y * 0.01, 2) * 18); g.stroke(); }
    g.drawImage(P.grain('ts_u', 0.04, [90, 70, 40], 0.12), 0, 0);
  });
  const stat = () => P.cached('ts_u_static', W, H, (g) => {
    // sky: the dark bokashi, ink fading down into paper (Hiroshige's wiped gradient)
    const sk = g.createLinearGradient(0, 0, 0, 640); sk.addColorStop(0, 'rgba(30,26,23,.95)'); sk.addColorStop(0.45, 'rgba(58,58,54,.55)'); sk.addColorStop(1, 'rgba(58,58,54,0)');
    g.fillStyle = sk; g.fillRect(0, 0, W, 700);
    // far bank in the mist: low town, and Kallio church's granite tower
    g.fillStyle = K.mist; g.beginPath(); g.moveTo(0, 820); for (let x = 0; x <= W; x += 60) g.lineTo(x, 800 - (U.hash(x, 3) * 40)); g.lineTo(W, 900); g.lineTo(0, 900); g.closePath(); g.fill();
    g.fillRect(700, 560, 70, 260); g.beginPath(); g.moveTo(690, 560); g.lineTo(735, 470); g.lineTo(780, 560); g.closePath(); g.fill(); g.fillRect(731, 440, 8, 40);
    // the river: prussian blue in bands, with a lighter bokashi at its top edge
    const rv = g.createLinearGradient(0, 880, 0, H); rv.addColorStop(0, K.prussianL); rv.addColorStop(0.2, K.prussian); rv.addColorStop(1, '#1b3550');
    g.fillStyle = rv; g.fillRect(0, 880, W, H - 880);
    g.strokeStyle = 'rgba(236,226,200,.35)'; g.lineWidth = 3;
    for (let y = 920; y < H; y += 46) { g.beginPath(); for (let x = -40; x <= W + 40; x += 30) g.lineTo(x, y + Math.sin(x * 0.04 + y) * 5); g.stroke(); }
  });
  // a log raft on the river, its man poling — seen from behind, a straw hat, no face
  function raft(c, lt) {
    const x = 120 + Math.sin(lt * 0.6) * 10, y = 1700, rock = Math.sin(lt * 1.3) * 0.02;
    c.save(); c.translate(x, y); c.rotate(-0.08 + rock); c.strokeStyle = K.key; c.lineWidth = 3;
    for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? K.wood : K.woodL; c.beginPath(); c.roundRect(0, i * 18, 420, 18, 9); c.fill(); c.stroke(); }
    c.fillStyle = K.key; c.fillRect(30, -4, 10, 98); c.fillRect(380, -4, 10, 98);
    // the poler, leaning into the pole
    c.save(); c.translate(250, 0); c.rotate(0.18);
    c.fillStyle = K.key; c.beginPath(); c.moveTo(-10, 0); c.lineTo(-24, -70); c.lineTo(8, -70); c.lineTo(14, 0); c.closePath(); c.fill();
    c.fillStyle = '#5b5f4a'; c.beginPath(); c.moveTo(-34, -70); c.quadraticCurveTo(-30, -150, 0, -158); c.quadraticCurveTo(30, -150, 26, -70); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = K.straw; c.beginPath(); c.moveTo(-58, -158); c.quadraticCurveTo(-4, -222, 52, -158); c.closePath(); c.fill(); c.stroke();
    c.restore();
    c.lineWidth = 6; c.beginPath(); c.moveTo(150, -280); c.lineTo(330, 140); c.stroke();
    c.restore();
    c.strokeStyle = 'rgba(236,226,200,.5)'; c.lineWidth = 3; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(x + 470 + k * 30, y + 60, 40 + k * 26, 8, 0, Math.PI * 0.1, Math.PI * 0.9); c.stroke(); }
  }
  // the bridge: a steep diagonal deck with posts and rails, in keyblock outline
  const deck = (y) => { const x0 = -40, x1 = W + 40, y0 = 1460, y1 = 980; return [x0, x1, y0, y1]; };
  function bridge(c) {
    const [x0, x1, y0, y1] = deck();
    c.fillStyle = K.woodL; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x1, y1 + 60); c.lineTo(x0, y0 + 60); c.closePath(); c.fill();
    c.strokeStyle = K.key; c.lineWidth = 4; c.stroke();
    c.fillStyle = K.wood; for (let i = 0; i < 12; i++) { const u = i / 11, x = lerp(x0, x1, u), y = lerp(y0, y1, u); c.fillRect(x - 10, y + 60, 20, 520); c.strokeRect(x - 10, y + 60, 20, 520); }  // piles into the river
    c.lineWidth = 6; c.beginPath(); c.moveTo(x0, y0 - 110); c.lineTo(x1, y1 - 110); c.stroke();                                              // the rail
    for (let i = 0; i < 24; i++) { const u = i / 23; c.beginPath(); c.moveTo(lerp(x0, x1, u), lerp(y0, y1, u)); c.lineTo(lerp(x0, x1, u), lerp(y0, y1, u) - 110); c.stroke(); }
  }
  function walker(c, x, y, s, col, brolly, lt, ph) {
    const step = Math.sin(lt * TAU * 1.4 + ph), lean = 0.16;
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate(lean);
    c.strokeStyle = K.key; c.lineWidth = 4;
    c.fillStyle = K.key; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 14, 120); c.lineTo(sx * 14 + step * 26 * sx, 200); c.lineWidth = 12; c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.moveTo(-50, 130); c.quadraticCurveTo(-44, 10, 0, 0); c.quadraticCurveTo(44, 10, 50, 130); c.closePath(); c.fill(); c.lineWidth = 4; c.stroke();
    mask(c, 0, -26, 36, brolly.mask, { glasses: true, led: true, t: lt + ph, strap: false, shade: false, face: K.paper, frame: K.key, ink: K.key });
    // the umbrella: Hiroshige's are straw and oiled paper; these are too
    c.fillStyle = brolly.col; c.beginPath(); c.moveTo(-110, -40); c.quadraticCurveTo(0, -150, 110, -40); c.closePath(); c.fill(); c.stroke();
    c.lineWidth = 2; for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(0, -112); c.lineTo(k * 34, -44); c.stroke(); }
    c.lineWidth = 4; c.beginPath(); c.moveTo(0, -112); c.lineTo(0, 20); c.stroke();
    c.restore();
  }
  return {
    draw(c, lt) {
      c.drawImage(paper(), 0, 0);
      c.drawImage(stat(), 0, 0);
      raft(c, lt);
      bridge(c);
      const [x0, x1, y0, y1] = deck();
      const people = [[0.12, '#2f4a3a', { col: K.straw, mask: S.YELLOW }, 1.0, 0], [0.3, '#7a2b20', { col: K.key, mask: S.RED }, 1.1, 1.3], [0.47, '#3c3a52', { col: K.straw, mask: S.ORANGE }, 0.95, 2.1],
        [0.66, '#2f4a3a', { col: K.key, mask: '#f0027f' }, 1.05, 0.7], [0.83, '#6b4a2a', { col: K.straw, mask: S.GREEN }, 0.9, 2.8]];
      for (const [u0, col, b, s, ph] of people) {
        const u = (u0 + lt * 0.03) % 1, x = lerp(x0, x1, u), y = lerp(y0, y1, u) - 180 * s;
        walker(c, x, y, s, col, b, lt, ph);
      }
      // rain: two fields of fine straight lines at slightly different angles (the print's signature)
      c.save(); c.strokeStyle = 'rgba(30,26,23,.55)'; c.lineWidth = 1.6; c.beginPath();
      for (const [ang, n, seed, sp] of [[0.08, 520, 3, 1400], [0.16, 340, 7, 1700]]) {
        const r = U.rng(seed);
        for (let i = 0; i < n; i++) { const x = r() * (W + 300) - 150, len = 140 + r() * 260, y = ((lt * sp + r() * (H + 400)) % (H + 400)) - 200; c.moveTo(x, y); c.lineTo(x - len * ang, y + len); }
      }
      c.stroke(); c.restore();
      // the cartouche: title strip, top right, with its trilingual line
      c.fillStyle = K.paper; c.fillRect(890, 60, 130, 440); c.strokeStyle = K.seal; c.lineWidth = 6; c.strokeRect(890, 60, 130, 440);
      c.save(); c.translate(955, 90); c.fillStyle = K.key; c.font = '62px "NotoSerifJP-600"'; c.textAlign = 'center';
      ['見', 'る', 'は', '買', 'う'].forEach((ch, i) => c.fillText(ch, 0, 62 + i * 78)); c.restore();
      // the series cartouche beside it, Latin run sideways
      c.fillStyle = K.paper; c.fillRect(830, 60, 52, 330); c.strokeStyle = K.key; c.lineWidth = 3; c.strokeRect(830, 60, 52, 330);
      c.save(); c.translate(856, 225); c.rotate(Math.PI / 2); c.font = '28px "EBGaramond-600"'; c.fillStyle = K.key; c.textAlign = 'center'; c.fillText('Pitkäsilta · rain', 0, 10); c.restore();
      // the publisher's seal: Toko's face cut in a red square
      const sx = 60, sy = 1780, sz = 96;
      c.fillStyle = K.seal; c.fillRect(sx, sy, sz, sz);
      c.save(); c.translate(sx + sz * 0.14, sy + sz * 0.16); c.scale(sz * 0.72 / 700, sz * 0.72 / 700); c.fillStyle = K.paper; for (const k of ['eyeL', 'eyeR', 'mouthOuter', 'mouthInner']) c.fill(shapes[k]); c.restore();
    },
  };
})();
