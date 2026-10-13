// TEST 8 · Lichtenstein close-up ("Hopeless", "Drowning Girl", 1963). A tight,
// tilted close-up cropped by the panel edge, thick black ink lines, flat
// primaries, Ben-Day dots on the skin — here the skin is the MASK, so the dots go
// on the pink carrier — a big cartoon tear, a hand with red nails at the cheek,
// hair as long outlined ribbons, a thought balloon with the line. The mask's face
// is the traced original; the tear sits on the mask, not in it.
SCENES['ts_comic'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { shapes } = RFM;
  const K = { ink: '#141414', white: '#fbf8ee', yellow: '#f7d52c', red: '#d8232a', blue: '#2f5cc8', pink: '#ec1a7c', pinkD: '#b30f5c', hair: '#f8d62c', hairD: '#d9a514', skin: '#f7d9c4', skinD: '#e0755f' };
  const dots = (c, key, pitch, r, col, bg) => {
    const tile = P.cached('ts_c_' + key, pitch, pitch, (g) => { if (bg) { g.fillStyle = bg; g.fillRect(0, 0, pitch, pitch); } g.fillStyle = col;
      [[0, 0], [pitch, 0], [0, pitch], [pitch, pitch], [pitch / 2, pitch / 2]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }); });
    return c.createPattern(tile, 'repeat');
  };
  const ink = (c, p, fill, lw = 9) => { if (fill) { c.fillStyle = fill; c.fill(p); } c.strokeStyle = K.ink; c.lineWidth = lw; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(p); };
  // hair strands: cubic ribbons in the mask's frame, [x0,y0, c1x,c1y, c2x,c2y, x1,y1, width]
  const STRANDS = [
    [-120, -520, -560, -560, -700, -80, -520, 360, 190],
    [60, -540, -380, -700, -760, 120, -600, 760, 170],
    [260, -500, -200, -760, -860, 400, -520, 1120, 150],
    [380, -400, 640, -300, 660, 200, 560, 620, 150],
    [-300, 200, -760, 420, -420, 760, -720, 1180, 160],
  ];
  const strand = (c, s, sway, w) => { c.beginPath(); c.moveTo(s[0], s[1]); c.bezierCurveTo(s[2] + sway, s[3], s[4] - sway, s[5], s[6] + sway * 0.6, s[7]); c.lineWidth = w; c.stroke(); };
  return {
    draw(c, lt) {
      // the panel: blue Ben-Day sky
      c.fillStyle = dots(c, 'sky', 26, 6, K.blue, K.white); c.fillRect(0, 0, W, H);
      const tilt = -0.2 + Math.sin(lt * 1.4) * 0.012, cx = 640, cy = 1180, R = 470, sway = Math.sin(lt * 1.6) * 14;
      c.save(); c.translate(cx, cy); c.rotate(tilt);
      c.lineCap = 'round'; c.lineJoin = 'round';
      // hair: every strand stroked black wide, then yellow narrow — the outline is the union
      c.strokeStyle = K.ink; for (const s of STRANDS) strand(c, s, sway, s[8] + 20);
      c.strokeStyle = K.hair; for (const s of STRANDS) strand(c, s, sway, s[8]);
      c.strokeStyle = K.ink; for (const s of STRANDS) strand(c, s, sway, 7);
      c.strokeStyle = K.hairD; for (const s of STRANDS) { c.save(); c.translate(-s[8] * 0.25, 0); strand(c, s, sway, 5); c.restore(); }
      // the mask: pink carrier in Ben-Day dots, thick outline, the traced face in white
      const m = new Path2D(); m.arc(0, 0, R, 0, TAU);
      ink(c, m, dots(c, 'mask', 18, 5.2, K.pinkD, K.pink), 14);
      const s = (R * 2 * 0.72) / 700;
      c.save(); c.translate(-350 * s, -350 * s + R * 0.06); c.scale(s, s); c.fillStyle = K.white; c.strokeStyle = K.ink; c.lineWidth = 7 / s;
      for (const k of ['eyeL', 'eyeR', 'mouthOuter', 'mouthInner']) { c.stroke(shapes[k]); c.fill(shapes[k]); } c.restore();
      // the glasses on the mask, and the red light
      c.lineWidth = 16; c.strokeStyle = K.ink; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * R * 0.36, -R * 0.22, R * 0.3, 0, TAU); c.stroke(); }
      c.beginPath(); c.moveTo(-R * 0.06, -R * 0.22); c.lineTo(R * 0.06, -R * 0.22); c.stroke();
      const on = Math.floor(lt * 4) % 2 === 0; c.fillStyle = on ? K.red : '#6a1010'; c.lineWidth = 9; c.beginPath(); c.arc(R * 0.8, -R * 0.46, 30, 0, TAU); c.fill(); c.stroke();
      // the tear: big, pale blue, black-lined, sliding down the mask's cheek
      const tx = -R * 0.52, ty = R * 0.06 + ((lt * 0.3) % 1) * R * 0.3;
      const tear = new Path2D(); tear.moveTo(tx, ty - 90); tear.quadraticCurveTo(tx + 56, ty + 6, tx, ty + 52); tear.quadraticCurveTo(tx - 56, ty + 6, tx, ty - 90);
      ink(c, tear, '#cfe6ff', 8); c.fillStyle = K.white; c.beginPath(); c.ellipse(tx - 14, ty + 4, 10, 18, 0, 0, TAU); c.fill();
      // the hand at the cheek: fingers as long capsules, Ben-Day skin, red nails
      c.save(); c.translate(-R * 0.86, R * 0.62); c.rotate(-0.55);
      const skin = dots(c, 'skin', 14, 3.4, K.skinD, K.skin);
      const palm = new Path2D(); palm.roundRect(-120, 40, 230, 300, 90); ink(c, palm, skin, 10);
      [[-104, 150], [-48, 175], [8, 170], [62, 150]].forEach(([x, len], i) => {
        const f = new Path2D(); f.roundRect(x - 26, -len + 70, 52, len + 60, 26); ink(c, f, skin, 10);
        const n = new Path2D(); n.roundRect(x - 17, -len + 78, 34, 44, 16); ink(c, n, K.red, 6);
      });
      c.restore();
      c.restore();
      // the thought balloon, top: the line
      const bx = 520, by = 330;
      c.fillStyle = K.white; c.strokeStyle = K.ink; c.lineWidth = 10;
      const blob = new Path2D(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; blob.moveTo(bx + Math.cos(a) * 400 + 100, by + Math.sin(a) * 200); blob.arc(bx + Math.cos(a) * 400, by + Math.sin(a) * 200, 100, 0, TAU); }
      c.fill(blob); c.stroke(blob); c.beginPath(); c.ellipse(bx, by, 420, 210, 0, 0, TAU); c.fill();
      for (const [x, y, r] of [[720, 610, 34], [770, 690, 22], [810, 750, 13]]) { c.beginPath(); c.arc(x, y + Math.sin(lt * 3 + x) * 3, r, 0, TAU); c.fill(); c.stroke(); }
      c.fillStyle = K.ink; c.font = '84px "Bangers-400"'; c.textAlign = 'center';
      c.fillText('I ONLY LOOKED AT IT...', bx, by - 50); c.fillText('AND NOW I OWN', bx, by + 40);
      c.fillStyle = K.red; c.font = '112px "Bangers-400"'; c.fillText('A BAKERY!', bx, by + 155);
      c.textAlign = 'left';
      c.strokeStyle = K.ink; c.lineWidth = 18; c.strokeRect(9, 9, W - 18, H - 18);
    },
  };
})();
