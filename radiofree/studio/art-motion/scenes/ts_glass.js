// TEST 9 · Stained glass. A lancet window in a dark stone wall: OUR LADY OF FREE
// RETURNS, a masked saint whose halo carries the red light, one gloved hand raised,
// the other holding the phone the way an icon holds the Book. Built the way glass
// is: a flat cartoon of regions, broken into panes (each pane its own shade of its
// region's colour), lead came along every pane edge and every region edge, the
// face painted on as grisaille. Light moves across it; the window throws its
// colours on the floor.
SCENES['ts_glass'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S, shapes } = RFM;
  const K = { stone: '#1d1915', stoneL: '#2c2620', lead: '#17130f', ruby: '#a3141c', amber: '#e08a1c', gold: '#f0c23a', green: '#1d6b45', greenL: '#3f9a63', cream: '#f3e6c4', glove: '#efe7d2', phone: '#1b2228', screen: '#7fe0d0' };
  const X0 = 130, X1 = 950, Y0 = 150, Y1 = 1700, CX = 540;
  // the lancet: straight sides, a pointed arch of two arcs
  const lancet = () => { const p = new Path2D(), r = X1 - X0, ya = Y0 + r * 0.87; p.moveTo(X0, Y1); p.lineTo(X0, ya); p.arc(X1, ya, r, Math.PI, Math.PI * 1.333, false); p.arc(X0, ya, r, Math.PI * 1.667, 0, false); p.lineTo(X1, Y1); p.closePath(); return p; };
  const robe = () => { const p = new Path2D(); p.moveTo(CX - 120, 930); p.quadraticCurveTo(CX - 330, 1100, CX - 330, 1520); p.lineTo(CX + 330, 1520); p.quadraticCurveTo(CX + 330, 1100, CX + 120, 930); p.closePath(); return p; };
  const banner = () => { const p = new Path2D(); p.rect(X0, 1530, X1 - X0, 120); return p; };
  const halo = () => { const p = new Path2D(); p.arc(CX, 760, 250, 0, TAU); return p; };
  const raised = () => { const p = new Path2D(); p.roundRect(CX + 230, 880, 92, 120, 30); p.roundRect(CX + 238, 800, 30, 100, 15); p.roundRect(CX + 276, 790, 30, 110, 15); return p; };
  const phone = () => { const p = new Path2D(); p.roundRect(CX - 300, 1070, 150, 250, 18); return p; };
  const holder = () => { const p = new Path2D(); p.roundRect(CX - 320, 1250, 190, 90, 34); return p; };
  // the cartoon: flat regions, the colour each pane will take its tone from
  const cartoon = () => P.cached('ts_gl_cartoon', W, H, (g) => {
    const bg = g.createLinearGradient(0, Y0, 0, Y1); bg.addColorStop(0, K.ruby); bg.addColorStop(0.55, '#c2391a'); bg.addColorStop(1, K.amber); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // falling leaves in the field, as amber and gold panes
    const r = U.rng(9); for (let i = 0; i < 26; i++) { const x = X0 + 40 + r() * (X1 - X0 - 80), y = Y0 + 200 + r() * 1200; if (Math.hypot(x - CX, y - 900) < 380) continue; g.fillStyle = r() < 0.5 ? K.gold : '#f0a23a'; g.beginPath(); g.ellipse(x, y, 26, 14, r() * 3, 0, TAU); g.fill(); }
    g.fillStyle = K.gold; g.fill(halo());
    g.fillStyle = '#f6d873'; g.beginPath(); g.arc(CX, 760, 200, 0, TAU); g.fill();
    g.fillStyle = K.green; g.fill(robe());
    g.fillStyle = K.greenL; g.beginPath(); g.moveTo(CX - 40, 930); g.lineTo(CX, 1520); g.lineTo(CX + 40, 930); g.closePath(); g.fill();
    g.fillStyle = K.ruby; g.fillRect(CX - 140, 920, 280, 46);
    g.fillStyle = K.phone; g.fill(phone()); g.fillStyle = K.screen; g.fillRect(CX - 284, 1094, 118, 190);
    g.fillStyle = K.glove; g.fill(holder()); g.fill(raised());
    mask(g, CX, 760, 150, S.PINK, { glasses: false, led: false, strap: false, shade: false, face: K.cream });
    g.fillStyle = K.cream; g.fill(banner());
  });
  // the panes: a jittered Voronoi over the window at half resolution, each pane a
  // lightness offset applied to whatever region colour lies under it; lead where two panes meet
  const glass = () => P.cached('ts_gl_glass', W, H, (g) => {
    const w = W / 2, h = H / 2, src = cartoon().getContext('2d').getImageData(0, 0, W, H).data;
    const cell = 34, r = U.rng(31), gw = Math.ceil(w / cell) + 1, gh = Math.ceil(h / cell) + 1, seeds = [];
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) seeds.push([(i + 0.15 + r() * 0.7) * cell, (j + 0.15 + r() * 0.7) * cell, (r() - 0.5) * 0.34, r()]);
    const im = g.createImageData(w, h), d = im.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ci = Math.floor(x / cell), cj = Math.floor(y / cell); let b1 = 1e9, b2 = 1e9, s1 = null;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = ci + di, jj = cj + dj; if (ii < 0 || jj < 0 || ii >= gw || jj >= gh) continue; const s = seeds[jj * gw + ii], dd = (s[0] - x) ** 2 + (s[1] - y) ** 2; if (dd < b1) { b2 = b1; b1 = dd; s1 = s; } else if (dd < b2) b2 = dd; }
      const si = ((y * 2) * W + x * 2) * 4, o = (y * w + x) * 4, edge = Math.sqrt(b2) - Math.sqrt(b1);
      // tone inside a pane: its offset, plus a slight bulge of light toward its centre (blown glass is never flat)
      const k = 1 + s1[2] + 0.12 * (1 - clamp(Math.sqrt(b1) / cell, 0, 1)) + (s1[3] < 0.08 ? 0.25 : 0);
      const inBanner = y * 2 > 1530 && y * 2 < 1650;
      if (edge < 1.6 && !inBanner) { d[o] = 23; d[o + 1] = 19; d[o + 2] = 15; } else { d[o] = clamp(src[si] * k, 0, 255); d[o + 1] = clamp(src[si + 1] * k, 0, 255); d[o + 2] = clamp(src[si + 2] * k, 0, 255); }
      d[o + 3] = 255;
    }
    const half = P.canvas(w, h); half.getContext('2d').putImageData(im, 0, 0);
    g.imageSmoothingEnabled = true; g.drawImage(half, 0, 0, W, H);
    // lead along every region edge, heavier than the pane lead, then the painted grisaille
    g.strokeStyle = K.lead; g.lineJoin = 'round'; g.lineWidth = 12;
    for (const p of [robe(), halo(), banner(), phone(), holder(), raised()]) g.stroke(p);
    g.beginPath(); g.arc(CX, 760, 200, 0, TAU); g.stroke(); g.beginPath(); g.arc(CX, 760, 150, 0, TAU); g.stroke();
    g.strokeRect(CX - 140, 920, 280, 46);
    const s = (150 * 2 * 0.72) / 700; g.save(); g.translate(CX - 350 * s, 760 - 350 * s + 150 * 0.06); g.scale(s, s); g.lineWidth = 9 / s; for (const key of ['eyeL', 'eyeR', 'mouthOuter', 'mouthInner']) g.stroke(shapes[key]); g.restore();
    g.lineWidth = 5; g.strokeStyle = 'rgba(23,19,15,.75)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(CX - 300 + i * 70, 1140 + (i % 2) * 40); g.quadraticCurveTo(CX - 280 + i * 70, 1330, CX - 300 + i * 66, 1510); g.stroke(); }
    g.fillStyle = K.lead; g.font = '50px "Cinzel-700"'; g.textAlign = 'center'; g.fillText('OUR LADY OF', CX, 1580); g.font = '62px "Cinzel-700"'; g.fillText('FREE RETURNS', CX, 1636);
    g.fillStyle = K.lead; g.font = '44px "Cinzel-700"'; g.fillText('$249', CX - 225, 1200); g.textAlign = 'left';
  });
  const wall = () => P.cached('ts_gl_wall', W, H, (g) => {
    g.drawImage(P.texture('ts_gl_stone', K.stone, { scale: 0.006, amt: 22, grain: 18, dark: '#0f0c0a', seed: 4 }), 0, 0);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; const r = U.rng(3);
    for (let y = 0; y < H; y += 120) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 120) % 2 ? 0 : 110; x < W; x += 220) { g.beginPath(); g.moveTo(x + r() * 10, y); g.lineTo(x + r() * 10, y + 120); g.stroke(); } }
    // the splayed reveal round the window
    g.lineWidth = 46; g.strokeStyle = K.stoneL; g.stroke(lancet()); g.lineWidth = 10; g.strokeStyle = '#3b332a'; g.stroke(lancet());
    g.fillStyle = '#2a241e'; g.fillRect(X0 - 50, Y1, X1 - X0 + 100, 40);
  });
  return {
    draw(c, lt) {
      c.drawImage(wall(), 0, 0);
      // the coloured light thrown on the flagstones, drifting with the cloud
      const sway = Math.sin(lt * 0.7) * 40, fl = 0.75 + 0.25 * Math.sin(lt * 1.9);
      c.save(); c.globalCompositeOperation = 'screen'; c.filter = 'blur(26px)'; c.globalAlpha = 0.9 * fl;
      for (const [x, col] of [[300, K.ruby], [470, K.gold], [620, K.green], [780, K.amber]]) { c.fillStyle = col; c.beginPath(); c.ellipse(x + sway, 1830, 130, 60, 0, 0, TAU); c.fill(); }
      c.restore();
      c.save(); c.clip(lancet()); c.drawImage(glass(), 0, 0);
      // daylight passing behind: a soft bright band sweeping across, glass glowing where it lands
      const bx = lerp(-300, W + 300, (lt * 0.22) % 1);
      const gr = c.createLinearGradient(bx - 260, 0, bx + 260, 0); gr.addColorStop(0, 'rgba(255,240,200,0)'); gr.addColorStop(0.5, 'rgba(255,240,200,.32)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
      c.globalCompositeOperation = 'overlay'; c.fillStyle = gr; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over';
      // the red light in the halo: a jewel of glass that is the only thing that blinks
      const on = Math.floor(lt * 4) % 2 === 0;
      c.fillStyle = on ? '#ff2a1c' : '#5a1010'; c.beginPath(); c.arc(CX + 176, 584, 26, 0, TAU); c.fill(); c.strokeStyle = K.lead; c.lineWidth = 10; c.stroke();
      if (on) { const gl = c.createRadialGradient(CX + 176, 584, 0, CX + 176, 584, 110); gl.addColorStop(0, 'rgba(255,70,40,.55)'); gl.addColorStop(1, 'rgba(255,70,40,0)'); c.fillStyle = gl; c.fillRect(CX + 66, 474, 220, 220); }
      c.restore();
      c.lineWidth = 14; c.strokeStyle = K.lead; c.stroke(lancet());
      // dust in the beam in front of the glass
      c.fillStyle = 'rgba(255,236,200,.5)'; const r = U.rng(12);
      for (let i = 0; i < 40; i++) { const x = (r() * W + lt * 18 * (r() + 0.3)) % W, y = 300 + r() * 1500 + Math.sin(lt + i) * 12; c.fillRect(x, y, 3, 3); }
    },
  };
})();
