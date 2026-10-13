// TEST 10 · Book of Hours (after the Limbourg brothers' calendar pages, c. 1415).
// A vellum page for OCTOBER: a miniature under a pointed arch on a tooled gold
// diaper ground, the labour of the month — in Helsinki, the faithful queuing on
// Senate Square to RENEW — an illuminated initial, a blackletter rubric, a saints'
// calendar of terms-of-service feasts, ivy and maple in the margins, and a
// drolerie: a snail in a mask crossing the foot of the page. Gold glints as the
// page turns in the light.
SCENES['ts_hours'] = (() => {
  const W = 1080, H = 1920, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, front, cathedral, S } = RFM;
  const K = { vellum: '#efe2c0', vellumD: '#d9c69a', ink: '#2a1d14', red: '#b3221b', gold: '#d6a43a', goldL: '#f6dc8a', goldD: '#9c6f1e', green: '#2f6b3a', rust: '#c2541c', ochre: '#d99a2b', lapis: '#2c4a8c' };
  const MX0 = 150, MX1 = 930, MY0 = 170, MY1 = 930;                        // the miniature
  const arch = () => {
    const p = new Path2D(), r = (MX1 - MX0) * 0.62, mid = (MX0 + MX1) / 2, rise = Math.sqrt(r * r - (mid - MX0 - r) ** 2), cy = MY0 + rise;
    const aL = TAU - Math.acos((mid - (MX0 + r)) / r), aR = TAU - Math.acos((mid - (MX1 - r)) / r);
    p.moveTo(MX0, MY1); p.lineTo(MX0, cy); p.arc(MX0 + r, cy, r, Math.PI, aL); p.arc(MX1 - r, cy, r, aR, TAU); p.lineTo(MX1, MY1); p.closePath(); return p;
  };
  const page = () => P.cached('ts_h_page', W, H, (g) => {
    g.drawImage(P.texture('ts_h_vel', K.vellum, { scale: 0.003, amt: 18, grain: 10, dark: K.vellumD, seed: 6 }), 0, 0);
    // foxing and a thumb-darkened corner
    const r = U.rng(8); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(150,105,50,${0.04 + r() * 0.08})`; g.beginPath(); g.arc(r() * W, r() * H, 3 + r() * 16, 0, TAU); g.fill(); }
    const cr = g.createRadialGradient(W, H, 0, W, H, 520); cr.addColorStop(0, 'rgba(120,80,30,.35)'); cr.addColorStop(1, 'rgba(120,80,30,0)'); g.fillStyle = cr; g.fillRect(0, 0, W, H);
    // the border: a gold bar with a red fillet, vines growing off it into both margins
    g.fillStyle = K.gold; g.fillRect(96, 120, 14, 1700); g.fillStyle = K.red; g.fillRect(112, 120, 5, 1700);
    g.strokeStyle = K.ink; g.lineWidth = 3;
    for (let y = 150; y < 1800; y += 54) {
      const sx = y % 108 ? 1 : -1; g.beginPath(); g.moveTo(103, y); g.bezierCurveTo(103 + sx * 40, y - 20, 103 + sx * 60, y + 30, 103 + sx * 44, y + 50); g.stroke();
      const lx = 103 + sx * 46, ly = y + 50, kind = Math.floor(y / 54) % 3;
      if (kind === 0) { g.fillStyle = K.goldL; g.beginPath(); g.arc(lx, ly, 9, 0, TAU); g.fill(); g.stroke(); }
      else { g.fillStyle = kind === 1 ? K.green : K.rust; g.beginPath(); g.moveTo(lx, ly - 16); g.quadraticCurveTo(lx + 16, ly, lx, ly + 16); g.quadraticCurveTo(lx - 16, ly, lx, ly - 16); g.fill(); g.stroke(); }
    }
    // the miniature's ground: tooled gold diaper (a lozenge net with a dot in each)
    g.save(); g.clip(arch());
    const gd = g.createLinearGradient(MX0, MY0, MX1, MY1); gd.addColorStop(0, K.goldL); gd.addColorStop(0.5, K.gold); gd.addColorStop(1, K.goldD); g.fillStyle = gd; g.fillRect(MX0, MY0, MX1 - MX0, MY1 - MY0);
    g.strokeStyle = 'rgba(110,70,15,.55)'; g.lineWidth = 2;
    for (let k = -900; k < 1800; k += 44) { g.beginPath(); g.moveTo(MX0 + k, MY0); g.lineTo(MX0 + k + 900, MY0 + 900); g.stroke(); g.beginPath(); g.moveTo(MX0 + k, MY0); g.lineTo(MX0 + k - 900, MY0 + 900); g.stroke(); }
    g.fillStyle = 'rgba(110,70,15,.5)'; for (let y = MY0; y < MY1; y += 44) for (let x = MX0 + ((y - MY0) / 44 % 2 ? 22 : 0); x < MX1; x += 44) { g.beginPath(); g.arc(x, y + 22, 3, 0, TAU); g.fill(); }
    // the land: green hills, the square's paving, the cathedral, autumn trees
    g.fillStyle = '#5c7a3a'; g.beginPath(); g.moveTo(MX0, 640); g.quadraticCurveTo(400, 560, 640, 620); g.quadraticCurveTo(820, 660, MX1, 600); g.lineTo(MX1, MY1); g.lineTo(MX0, MY1); g.fill();
    cathedral(g, 540, 700, 0.5);
    g.fillStyle = '#c9b58d'; g.beginPath(); g.moveTo(MX0, 720); g.lineTo(MX1, 720); g.lineTo(MX1, MY1); g.lineTo(MX0, MY1); g.fill();
    g.strokeStyle = 'rgba(90,70,40,.35)'; g.lineWidth = 2; for (let y = 740; y < MY1; y += 24) { g.beginPath(); g.moveTo(MX0, y); g.lineTo(MX1, y); g.stroke(); }
    for (const [x, y, col] of [[220, 640, K.rust], [860, 620, K.ochre], [300, 680, K.ochre]]) { g.fillStyle = '#4a3020'; g.fillRect(x - 6, y, 12, 70); g.fillStyle = col; g.beginPath(); g.arc(x, y - 10, 46, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,230,160,.35)'; g.beginPath(); g.arc(x - 14, y - 24, 20, 0, TAU); g.fill(); }
    // the booth where one renews: a little gilt pavilion with its sign
    g.fillStyle = K.red; g.fillRect(740, 740, 150, 150); g.fillStyle = K.goldL; g.beginPath(); g.moveTo(725, 740); g.lineTo(815, 680); g.lineTo(905, 740); g.closePath(); g.fill();
    g.fillStyle = K.vellum; g.fillRect(755, 760, 120, 44); g.fillStyle = K.ink; g.font = '30px "UnifrakturMaguntia-400"'; g.textAlign = 'center'; g.fillText('Renew', 815, 792); g.textAlign = 'left';
    g.restore();
    g.lineWidth = 8; g.strokeStyle = K.gold; g.stroke(arch()); g.lineWidth = 3; g.strokeStyle = K.ink; g.stroke(arch());
    // the initial O: gold leaf block, the letter in red with white penwork, a maple leaf inside
    g.fillStyle = K.gold; g.fillRect(150, 990, 210, 210); g.strokeStyle = K.ink; g.lineWidth = 3; g.strokeRect(150, 990, 210, 210);
    g.fillStyle = K.red; g.font = '200px "Cinzel-700"'; g.textAlign = 'center'; g.fillText('O', 255, 1170); g.textAlign = 'left';
    g.fillStyle = K.rust; g.beginPath(); g.moveTo(255, 1050); g.lineTo(280, 1095); g.lineTo(310, 1085); g.lineTo(290, 1120); g.lineTo(300, 1150); g.lineTo(255, 1135); g.lineTo(210, 1150); g.lineTo(220, 1120); g.lineTo(200, 1085); g.lineTo(230, 1095); g.closePath(); g.fill();
    // the rubric and the text
    g.fillStyle = K.red; g.font = '78px "UnifrakturMaguntia-400"'; g.fillText('ctober.', 380, 1060);
    g.fillStyle = K.ink; g.font = '44px "UnifrakturMaguntia-400"';
    ['In this month the faithful', 'go up unto the Square, and', 'there they renew their'].forEach((l, i) => g.fillText(l, 380, 1120 + i * 52));
    ['subscriptions, and are glad,', 'for it was renewed already.'].forEach((l, i) => g.fillText(l, 180, 1276 + i * 52));
    // the calendar: feast days in red and black
    const days = [['i', 'Auto-renew', 1], ['ij', 'Terms updated', 0], ['iij', 'S. Cookie, accepted', 1], ['iiij', 'Price adjusted', 0], ['v', 'S. Free Trial, ended', 1], ['vj', 'Nothing happened', 0]];
    g.font = '40px "UnifrakturMaguntia-400"';
    days.forEach(([n, f, red], i) => { const y = 1430 + i * 50; g.fillStyle = K.red; g.fillText(n, 185, y); g.fillStyle = red ? K.red : K.ink; g.fillText(f, 300, y); });
    g.fillStyle = K.goldD; g.fillRect(150, 1395, 780, 3); g.fillRect(150, 1730, 780, 3);
  });
  return {
    draw(c, lt) {
      c.drawImage(page(), 0, 0);
      // the labour of the month, painted on the gold: masked figures queuing toward the booth
      c.save(); c.clip(arch());
      const cols = [S.YELLOW, S.RED, S.ORANGE, S.GREEN, S.PINK];
      cols.forEach((col, i) => { const q = (lt * 0.05 + i * 0.16) % 0.8, x = lerp(200, 700, q), y = 790 - q * 30;
        front(c, x, y, 0.32, { color: col, coat: ['#5b2a1a', '#2f4a2a', '#4a3a6a', '#6a4a1a', '#3a2a1a'][i], scarf: K.red, t: lt + i, step: Math.sin(lt * 5 + i) }); });
      // leaves coming down over the square
      const r = U.rng(4); for (let i = 0; i < 14; i++) { const x = MX0 + r() * (MX1 - MX0) + Math.sin(lt * 2 + i) * 20, y = MY0 + 120 + ((lt * 60 * (0.5 + r()) + r() * 700) % 700); c.fillStyle = r() < 0.5 ? K.rust : K.ochre; c.save(); c.translate(x, y); c.rotate(lt * 2 + i); c.beginPath(); c.ellipse(0, 0, 10, 5, 0, 0, TAU); c.fill(); c.restore(); }
      // the gold glints: a narrow sweep of light across all gilt
      const gx = lerp(-400, W + 400, (lt * 0.25) % 1), gl = c.createLinearGradient(gx - 120, 0, gx + 120, 0); gl.addColorStop(0, 'rgba(255,250,220,0)'); gl.addColorStop(0.5, 'rgba(255,250,220,.45)'); gl.addColorStop(1, 'rgba(255,250,220,0)');
      c.globalCompositeOperation = 'overlay'; c.fillStyle = gl; c.fillRect(MX0, MY0, MX1 - MX0, 560); c.restore();
      c.save(); c.globalCompositeOperation = 'overlay'; c.fillStyle = gl; c.fillRect(150, 990, 210, 210); c.fillRect(96, 120, 14, 1700); c.restore();
      // the drolerie: a snail in a mask, crossing the foot of the page with its trail
      const sx = lerp(980, 160, (lt * 0.06) % 1), sy = 1810;
      c.strokeStyle = 'rgba(160,140,100,.6)'; c.lineWidth = 6; c.beginPath(); c.moveTo(sx + 60, sy + 22); c.lineTo(Math.min(980, sx + 400), sy + 22); c.stroke();
      c.fillStyle = '#b89a6a'; c.beginPath(); c.moveTo(sx - 70, sy + 24); c.quadraticCurveTo(sx - 70, sy - 4, sx - 40, sy - 6); c.lineTo(sx + 80, sy + 4); c.quadraticCurveTo(sx + 90, sy + 24, sx + 70, sy + 26); c.closePath(); c.fill(); c.strokeStyle = K.ink; c.lineWidth = 3; c.stroke();
      c.fillStyle = K.rust; c.beginPath(); c.arc(sx + 20, sy - 30, 44, 0, TAU); c.fill(); c.stroke();
      c.beginPath(); for (let a = 0; a < 3 * TAU; a += 0.2) { const rr = 40 * (1 - a / (3 * TAU)); c.lineTo(sx + 20 + Math.cos(a) * rr, sy - 30 + Math.sin(a) * rr); } c.stroke();
      mask(c, sx - 62, sy - 36, 26, S.LIME, { glasses: true, led: true, t: lt, strap: false, shade: false });
      c.strokeStyle = K.ink; c.lineWidth = 3; for (const dx of [-8, 8]) { c.beginPath(); c.moveTo(sx - 62 + dx, sy - 58); c.lineTo(sx - 62 + dx * 2.2, sy - 84); c.stroke(); }
    },
  };
})();
