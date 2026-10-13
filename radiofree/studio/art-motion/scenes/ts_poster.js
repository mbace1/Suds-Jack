// TEST 3 · Constructivist photomontage poster, v2 (Klutsis / Rodchenko, printed).
// What v1 lacked and this adds: a low-angle HERO (a giant masked figure seen from
// below, foreshortened, towering over the city), real photomontage (halftone
// Helsinki — the tram and the cathedral — cut out with white edges and pasted at
// different scales), diagonals that drive the eye, and PRINT: the red plate off
// register, uneven ink, the poster's fold creases, worn corners and tape.
SCENES['ts_poster'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S } = RFM, { C, print } = RFA;
  const RED = '#c8231c', INK = '#151311', PAPER = '#e7dcc0';
  const tramPhoto = () => print('v2tram', 760, 300, (g, w, h) => {
    g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#f0f0f0'); sky.addColorStop(1, '#9a9a9a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a5a5a'; g.fillRect(20, 120, 720, 140); g.fillStyle = '#cfcfcf'; g.fillRect(20, 60, 720, 70);
    g.fillStyle = '#2a2a2a'; for (let i = 0; i < 7; i++) g.fillRect(40 + i * 100, 75, 70, 46);
    g.fillStyle = '#ececec'; for (let i = 0; i < 7; i++) g.fillRect(48 + i * 100, 80, 24, 36);
    g.fillStyle = '#111'; for (const x of [120, 600]) { g.beginPath(); g.arc(x, 262, 26, 0, TAU); g.fill(); }
    g.strokeStyle = '#333'; g.lineWidth = 4; g.beginPath(); g.moveTo(380, 60); g.lineTo(330, 0); g.moveTo(330, 0); g.lineTo(440, 0); g.stroke();
  }, { cell: 6, edge: 7 });
  const domePhoto = () => print('v2dome', 520, 560, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#bdbdbd'); sky.addColorStop(1, '#efefef'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    const cx = w / 2; g.fillStyle = '#f6f6f6'; g.fillRect(cx - 200, 360, 400, 200); g.fillRect(cx - 100, 250, 200, 120);
    g.fillStyle = '#4a4a4a'; g.beginPath(); g.ellipse(cx, 250, 116, 130, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#777'; for (let i = 0; i < 6; i++) g.fillRect(cx - 160 + i * 60, 390, 14, 160);
    for (const s of [-1, 1]) { g.fillStyle = '#f6f6f6'; g.fillRect(cx + s * 200 - 34, 290, 68, 80); g.fillStyle = '#4a4a4a'; g.beginPath(); g.ellipse(cx + s * 200, 290, 44, 50, 0, Math.PI, 0); g.fill(); }
    g.fillStyle = '#222'; g.fillRect(cx - 4, 70, 8, 60);
  }, { cell: 6, edge: 7 });
  // paper: stains, the two fold creases, worn corners — the poster as an object
  const sheet = () => P.cached('ts_p_sheet', W, H, (g) => {
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    const r = U.rng(8); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(110,80,40,${r() * 0.05})`; g.beginPath(); g.arc(r() * W, r() * H, 2 + r() * 26, 0, TAU); g.fill(); }
    g.drawImage(P.grain('ts_p', 0.06, [80, 60, 20], 0.14), 0, 0);
  });
  const finish = () => P.cached('ts_p_finish', W, H, (g) => {
    // creases: a light ridge and a dark valley along each fold
    for (const [x0, y0, x1, y1] of [[W / 2, 0, W / 2 + 4, H], [0, H / 3, W, H / 3 + 3], [0, 2 * H / 3, W, 2 * H / 3 - 2]]) {
      g.strokeStyle = 'rgba(255,250,235,.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - 2, y0 - 2); g.lineTo(x1 - 2, y1 - 2); g.stroke();
      g.strokeStyle = 'rgba(60,40,20,.28)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 1, y0 + 1); g.lineTo(x1 + 1, y1 + 1); g.stroke();
    }
    // worn corners and edge nicks: paper colour bites
    const r = U.rng(12); g.fillStyle = '#d9cba6';
    for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]]) for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(cx + (r() - 0.5) * 120, cy + (r() - 0.5) * 120, 6 + r() * 22, 0, TAU); g.fill(); }
    // two strips of old tape at the top
    g.fillStyle = 'rgba(214,190,120,.55)'; for (const [x, a] of [[90, -0.4], [W - 90, 0.4]]) { g.save(); g.translate(x, 40); g.rotate(a); g.fillRect(-80, -26, 160, 52); g.restore(); }
  });
  const mottle = () => P.cached('ts_p_mottle', W, H, (g) => {        // uneven ink: lighter blotches inside the solid colour
    const s = P.canvas(W / 6, H / 6), sg = s.getContext('2d'), im = sg.createImageData(W / 6, H / 6);
    for (let y = 0; y < H / 6; y++) for (let x = 0; x < W / 6; x++) { const n = P.fbm(x * 0.09, y * 0.09, 4), i = (y * W / 6 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = clamp((n + 0.1) * 300, 0, 120); }
    sg.putImageData(im, 0, 0); g.drawImage(s, 0, 0, W, H);
  });
  return {
    draw(c, lt) {
      c.drawImage(sheet(), 0, 0);
      // ── red plate, drawn off register by (+6, -4) ──
      const R = P.scratch('ts_p_red'), rg = R.getContext('2d'); rg.reset(); rg.fillStyle = RED;
      rg.beginPath(); rg.moveTo(0, 1120); rg.lineTo(W, 520); rg.lineTo(W, 760); rg.lineTo(0, 1400); rg.closePath(); rg.fill();   // the great diagonal
      rg.beginPath(); rg.arc(840, 300, 170, 0, TAU); rg.fill();                                                                 // the sun disc
      // the rays from the glasses: a fan that pulses on the beat
      const pulse = 0.85 + 0.15 * Math.pow(Math.max(0, Math.sin(lt * Math.PI * 112 / 60)), 4);
      for (let k = 0; k < 7; k++) { const a = -2.6 + k * 0.28; rg.beginPath(); rg.moveTo(560, 520); rg.lineTo(560 + Math.cos(a) * 1400 * pulse, 520 + Math.sin(a) * 1400 * pulse); rg.lineTo(560 + Math.cos(a + 0.09) * 1400 * pulse, 520 + Math.sin(a + 0.09) * 1400 * pulse); rg.closePath(); rg.fill(); }
      rg.globalCompositeOperation = 'destination-out'; rg.drawImage(mottle(), 0, 0); rg.globalCompositeOperation = 'source-over';
      c.save(); c.globalCompositeOperation = 'multiply'; c.drawImage(R, 6, -4); c.restore();
      // ── photomontage: the cathedral small and far, the tram big and near, on a slant ──
      c.save(); c.translate(70, 1150); c.rotate(-0.08); c.drawImage(domePhoto(), 0, 0, 380, 410); c.restore();
      c.save(); c.translate(-40, 1560); c.rotate(-0.18); c.drawImage(tramPhoto(), 0, 0, 900, 355); c.restore();
      // ── the hero from below: foreshortened coat widening to the bottom, head small up top ──
      const sway = Math.sin(lt * 0.9) * 6;
      c.fillStyle = INK; c.beginPath(); c.moveTo(380 + sway, 640); c.quadraticCurveTo(560 + sway, 600, 740 + sway, 640); c.lineTo(1080, 1920); c.lineTo(280, 1920); c.closePath(); c.fill();
      c.fillStyle = RED; c.beginPath(); c.moveTo(470 + sway, 640); c.lineTo(650 + sway, 640); c.lineTo(600 + sway, 980); c.closePath(); c.fill();            // the scarf, falling
      c.strokeStyle = '#2b2622'; c.lineWidth = 5; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(560 + sway + (i - 1.5) * 50, 700); c.lineTo(560 + (i - 1.5) * 170, 1900); c.stroke(); }   // coat seams converging up
      mask(c, 560 + sway, 520, 120, S.YELLOW, { glasses: true, led: true, t: lt, tilt: -0.1, face: '#f4ecd6', frame: INK, ink: INK });
      // ── the slogan in hand-cut block letters, and the small type ──
      c.save(); c.translate(70, 230); c.rotate(-0.05);
      c.font = '210px "Anton-400"'; c.fillStyle = INK; c.fillText('LOOK', 0, 0);
      c.fillStyle = RED; c.fillText('= BUY', 0, 200); c.restore();
      c.save(); c.translate(0, 1120); c.rotate(-Math.atan2(600, W)); c.font = '58px "AlfaSlabOne-400"'; c.fillStyle = PAPER; c.fillText('SAY ITS NAME · IT SEES · IT BUYS', 90, 140); c.restore();
      // ── the poster as an object: creases, wear, tape, grain over everything ──
      c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.9; c.drawImage(P.grain('ts_p2', 0.03, [30, 20, 10], 0.25), 0, 0); c.restore();
      c.drawImage(finish(), 0, 0);
    },
  };
})();
