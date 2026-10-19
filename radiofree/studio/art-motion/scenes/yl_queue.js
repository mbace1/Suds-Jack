// Ported from rfp_queue.js for the pipeline cut of You Looked At It (papercut/you-looked).
// Shot 4 · 9.6–12.8 s · The tram stop. Four masked people queue under a lit billboard
// — LOOKING IS FREE*, *FOR THE FIRST 3 SECONDS — with the town and the park's maples
// behind. A birch leaf comes down between them; on the beat every head turns to it at
// once; two beats later a red SOLD tag clips on and the leaf stops falling, hanging
// by its string, while every light in the queue comes on together. The camera pulls back.
SCENES['yl_queue'] = (() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, leafSprite, words, pop, ease, move, glow, put, walker } = RFP, { S } = RFM, TAU = Math.PI * 2, { clamp, lerp } = U;
  const B = 60 / 112, T_TURN = 2 * B, T_SOLD = 4 * B;
  const town = () => sheet('rfp_q_town', (g) => {
    g.fillStyle = K.roof; const r = U.rng(9);
    for (let x = -90; x < W + 90; x += 96) { const h = 160 + r() * 200; g.fillRect(x, 900 - h, 92, h + 900); g.beginPath(); g.moveTo(x - 4, 900 - h); g.lineTo(x + 46, 900 - h - 56); g.lineTo(x + 96, 900 - h); g.fill(); }
    g.fillStyle = K.lamp; for (let i = 0; i < 30; i++) g.fillRect(-60 + r() * (W + 120), 640 + r() * 220, 18, 24);
  });
  const park = () => sheet('rfp_q_park', (g) => {
    g.fillStyle = K.park; g.beginPath(); g.moveTo(-90, H); g.lineTo(-90, 1050); for (let i = 0; i <= 9; i++) g.quadraticCurveTo(-90 + i * 140 - 70, 990, -90 + i * 140, 1050); g.lineTo(W + 90, H); g.fill();
    const r = U.rng(7); for (let i = 0; i < 9; i++) { const x = 20 + i * 125 + r() * 30, y = 1000 + r() * 50; g.fillStyle = [K.mapleA, K.mapleB, K.mapleC][i % 3]; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + (r() - 0.5) * 90, y - r() * 110, 46 + r() * 24, 0, TAU); g.fill(); } g.fillStyle = K.ink; g.fillRect(x - 7, y, 14, 120); }
  });
  const board = () => sheet('rfp_q_board', (g) => {
    g.fillStyle = K.ink; g.fillRect(250, 720, 18, 500); g.fillRect(810, 720, 18, 500);
    g.fillStyle = K.card; g.fillRect(150, 360, 780, 380); g.fillStyle = K.ink; g.fillRect(150, 360, 780, 14);
    g.fillStyle = K.ink; g.font = '120px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('LOOKING', 540, 510); g.fillText('IS FREE*', 540, 640);
    g.fillStyle = K.mag; g.font = '38px "ArchivoBlack-400"'; g.fillText('*SEE TERMS', 540, 706);
    for (const x of [300, 780]) { g.fillStyle = K.ink; g.fillRect(x - 4, 300, 8, 60); g.fillRect(x - 40, 296, 80, 16); }
  });
  const road = () => sheet('rfp_q_road', (g) => { g.fillStyle = '#3a2f28'; g.fillRect(-90, 1330, W + 180, H); g.fillStyle = K.stoneD; g.fillRect(-90, 1330, W + 180, 30); });
  const shelter = () => sheet('rfp_q_shelter', (g) => {
    g.fillStyle = K.greenD; g.fillRect(70, 1000, 16, 520); g.fillRect(994, 1000, 16, 520); g.fillRect(40, 980, 1000, 40);
    g.fillStyle = K.card; g.beginPath(); g.roundRect(840, 1040, 150, 70, 8); g.fill(); g.fillStyle = K.greenD; g.font = '44px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('3', 915, 1092);
  });
  // the string the leaf now hangs by, and the tag tied on just above the stem
  const soldTag = () => sprite('rfp_q_sold', 420, 460, 120, 380, (g) => {
    g.strokeStyle = K.card; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -96); g.lineTo(0, 0); g.stroke();
    g.beginPath(); g.moveTo(0, -60); g.lineTo(60, -40); g.stroke();
    g.save(); g.translate(60, -40); g.rotate(0.25);
    g.fillStyle = K.mag; g.beginPath(); g.moveTo(0, -36); g.lineTo(170, -36); g.lineTo(170, 36); g.lineTo(0, 36); g.lineTo(-26, 0); g.closePath(); g.fill();
    g.fillStyle = K.card; g.beginPath(); g.arc(-6, 0, 8, 0, TAU); g.fill();
    g.font = '52px "Anton-400"'; g.textAlign = 'center'; g.fillText('SOLD', 92, 19); g.restore();
  }, 6);
  return {
    draw(c, lt) {
      // You Looked At It, the pipeline cut: the shot sits 170 px lower, clear of the caption band; the sky is laid unshifted first
      RFP.layer(c, dusk('q', 900), 0, 0, { lift: 0 }); c.save(); c.translate(0, 170);
      // open tight on the queue and pull back to show the billboard over them; then lean in to the bought leaf
      const pull = move(lt, 0, 1.1, 1.32, 1) * move(lt, T_SOLD, 0.6, 1, 1.06), cam = { x: lerp(20, -20, lt / 3.2), y: 0, z: pull, fx: 540, fy: lt < T_SOLD ? 1300 : 1000 };
      // the leaf: falls and sways until it is bought, then hangs
      // the leaf comes down BESIDE the billboard (never across its words), then drifts in under the shelter roof
      const tl = Math.min(lt, T_SOLD), ly = lerp(-80, 1194, tl / T_SOLD), lx = (ly < 760 ? 985 : lerp(985, 600, (ly - 760) / 434)) + Math.sin(tl * 2.4) * 18;
      const hang = lt > T_SOLD ? Math.sin((lt - T_SOLD) * 5) * Math.exp(-(lt - T_SOLD) * 2) * 0.4 : 0;
      const turn = lt < T_TURN ? 0 : ease.back((lt - T_TURN) / 0.16), allOn = lt >= T_SOLD;
      const QUEUE = [[210, K.mag, '#3a2418', K.rust], [430, K.mag, '#1e2b25', '#6a5a2a'], [650, K.mag, '#2e2a22', K.green], [870, K.mag, '#2a2c22', K.rust]];
      stack(c, [
        { sh: dusk('q', 900), d: 0.05, lift: 0 },
        { sh: town(), d: 0.15, lift: 0.8 },
        { sh: park(), d: 0.3 },
        { sh: board(), d: 0.42 },
        { fn: (g, ox) => { glow(g, 300 + ox, 400, 260, 'rgba(255,230,170,', 0.3); glow(g, 780 + ox, 400, 260, 'rgba(255,230,170,', 0.3); }, d: 0.42 },
        { sh: road(), d: 0.55, lift: 0.6 },
        { sh: shelter(), d: 0.6 },
        { fn: (g, ox) => {
          QUEUE.forEach(([x, col, coat, scarf], i) => {
            const wx = x + ox, dir = clamp((lx - wx) / 300, -1, 1);
            walker(g, wx, 1370 + (i % 2) * 14, 0.92, { coat, scarf, color: col, t: lt + i * 0.13, tilt: Math.sin(lt * 1.6 + i) * 0.03, look: dir * turn, led: allOn ? 1 : 0, lift: 1.8 });
            // every light comes on at once: a ring off each bead
            if (lt >= T_SOLD && lt < T_SOLD + 0.6) { const q = (lt - T_SOLD) / 0.6, s2 = 0.92, lxx = wx + s2 * (dir * turn * 30 + 73), lyy = 1370 + (i % 2) * 14 - s2 * 54; g.strokeStyle = `rgba(255,70,40,${1 - q})`; g.lineWidth = 6; g.beginPath(); g.arc(lxx, lyy, 12 + q * 110, 0, Math.PI * 2); g.stroke(); }
          });
        }, d: 0.75 },
        { fn: (g, ox) => {
          // falling it tumbles; bought, it swings stem-up from the string
          const sold = lt >= T_SOLD, rot = sold ? Math.PI + hang : Math.sin(lt * 3) * 0.9;
          put(g, leafSprite('birch', K.birch), lx + ox, ly, { rot, sc: 1.9, lift: 2.4 });
          if (sold) { const ks = pop(lt, T_SOLD, 0.22), sx = lx + ox - Math.sin(rot) * 84, sy = ly + Math.cos(rot) * 84; put(g, soldTag(), sx, sy, { sc: 0.4 + 0.6 * ks, rot: hang, lift: 2.6 }); }
        }, d: 0.85 },
      ], cam);
      RFP.leaves(c, lt + 11, { n: 8, seed: 41, cam });
      c.restore();
      box(c);
    },
  };
})();
