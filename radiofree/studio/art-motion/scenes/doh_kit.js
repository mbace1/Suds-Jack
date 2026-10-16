// The kit for "On Hold" (Doodle #2) — built on RFP (the papercut box) and BDF (the forest,
// the Doodle wordmark). The site is one set used twice, shut in shot 1 and open in shot 5,
// so everything about it lives here: the hoarding with the gate in it, the two gate leaves
// (sprites, so they can swing on their hinges), the ON HOLD sign, the padlock, two tower
// cranes whose jibs are separate pieces (a jib slewing round reads as its length changing),
// and the cheque from the first film, so the money looks the same both times.
window.DOH = (() => {
  const { K, W, H, sheet, sprite, put, glow, ledAt } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { iron: '#1b1a17', ironL: '#4a4236', ply: '#2e2a22', plyL: '#3c362b', plyD: '#24211b', ground: '#171512', mesh: 'rgba(214,200,170,.34)', hivis: '#d9a22e', hall: '#2a2c2a', hallL: '#363936' };
  const GX0 = 330, GX1 = 750, GY0 = 930, GY1 = 1500;          // the gate opening in the hoarding

  /** the site behind the gate: dark ground, a lit cabin, spoil heaps */
  const site = () => sheet('doh_site', (g) => {
    g.fillStyle = '#1f1b16'; g.beginPath(); g.moveTo(-90, 1160); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, 1150 + Math.sin(x * 0.013) * 16); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill();
    g.fillStyle = '#2a241c'; for (const [x, w, h] of [[300, 260, 90], [700, 340, 120], [960, 200, 70]]) { g.beginPath(); g.moveTo(x - w / 2, 1190); g.quadraticCurveTo(x, 1190 - h * 2, x + w / 2, 1190); g.fill(); }
    g.fillStyle = '#3a3a34'; g.fillRect(560, 1050, 200, 110); g.fillStyle = '#2c2c27'; g.fillRect(550, 1040, 220, 18);   // a site cabin
    g.fillStyle = '#c98a44'; g.fillRect(590, 1080, 60, 40);
  }, 10);

  /** the hoarding: plywood panels either side of the gate, the Doodle board on the left */
  const hoarding = () => sheet('doh_hoarding', (g) => {
    for (const [x0, x1] of [[-90, GX0 - 26], [GX1 + 26, W + 90]]) {
      g.fillStyle = C.ply; g.fillRect(x0, GY0, x1 - x0, GY1 - GY0);
      g.strokeStyle = C.plyD; g.lineWidth = 6; for (let x = x0 + 160; x < x1; x += 160) { g.beginPath(); g.moveTo(x, GY0); g.lineTo(x, GY1); g.stroke(); }
      g.fillStyle = C.plyL; g.fillRect(x0, GY0, x1 - x0, 14);
    }
    // the board: Doodle's wordmark and the two names
    g.fillStyle = K.card; g.fillRect(84, 1010, 210, 236);
    BDF.doodleLogo(g, 189, 1090, 54, { align: 'center' });
    g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '30px "ArchivoBlack-400"'; g.fillText('KAJAANI', 189, 1146); g.fillText('MUHOS', 189, 1184);
    g.font = '18px "RobotoCondensed"'; g.fillText('DATA CENTRE · SITE', 189, 1224);
    // a no-entry board on the right
    g.fillStyle = '#c9a23e'; g.fillRect(820, 1040, 160, 110); g.fillStyle = K.ink; g.font = '26px "ArchivoBlack-400"'; g.fillText('TYÖMAA', 900, 1088); g.font = '18px "RobotoCondensed"'; g.fillText('NO ENTRY', 900, 1122); g.textAlign = 'left';
    // the two gate posts
    g.fillStyle = C.iron; g.fillRect(GX0 - 26, GY0 - 40, 26, GY1 - GY0 + 40); g.fillRect(GX1, GY0 - 40, 26, GY1 - GY0 + 40);
  }, 14);

  /** one gate leaf, hinge at x=0, opening to +x; chain-link in a steel frame */
  const leaf = (dir) => sprite('doh_leaf_' + dir, 240, 600, dir > 0 ? 10 : 230, 590, (g) => {
    g.save(); if (dir < 0) g.scale(-1, 1);
    const w = (GX1 - GX0) / 2, h = GY1 - GY0 - 20;
    g.strokeStyle = C.mesh; g.lineWidth = 2;
    for (let k = -h; k < w + h; k += 26) { g.beginPath(); g.moveTo(k, -h); g.lineTo(k + h, 0); g.stroke(); g.beginPath(); g.moveTo(k + h, -h); g.lineTo(k, 0); g.stroke(); }
    g.globalCompositeOperation = 'destination-in'; g.fillRect(0, -h, w, h); g.globalCompositeOperation = 'source-over';
    g.strokeStyle = C.ironL; g.lineWidth = 12; g.strokeRect(6, -h + 6, w - 12, h - 12); g.beginPath(); g.moveTo(6, -h / 2); g.lineTo(w - 6, -h / 2); g.stroke();
    g.restore();
  }, 6);

  /** the sign: ochre card, ink lettering, two holes for the chains */
  const sign = () => sprite('doh_sign', 460, 250, 230, 125, (g) => {
    g.fillStyle = K.ochre; g.beginPath(); g.roundRect(-200, -100, 400, 200, 10); g.fill();
    g.strokeStyle = K.ink; g.lineWidth = 6; g.strokeRect(-184, -84, 368, 168);
    g.fillStyle = K.ink; g.font = '112px "Anton-400"'; g.textAlign = 'center'; g.fillText('ON HOLD', 0, 46);
    g.fillStyle = '#5a3a1a'; for (const x of [-160, 160]) { g.beginPath(); g.arc(x, -72, 8, 0, TAU); g.fill(); }
  }, 10);

  /** a padlock: a shackle and a body */
  const padlock = () => sprite('doh_lock', 120, 160, 60, 90, (g) => {
    g.strokeStyle = '#8a8a80'; g.lineWidth = 12; g.beginPath(); g.arc(0, -30, 30, Math.PI, 0); g.lineTo(30, 0); g.moveTo(-30, -30); g.lineTo(-30, 0); g.stroke();
    g.fillStyle = '#2a2a26'; g.beginPath(); g.roundRect(-44, -4, 88, 70, 10); g.fill(); g.fillStyle = '#6a6a60'; g.beginPath(); g.arc(0, 26, 8, 0, TAU); g.fill(); g.fillRect(-3, 26, 6, 20);
  }, 5);

  /** a chain hanging from (x0,y0) to (x1,y1): oval links */
  function chain(c, x0, y0, x1, y1) {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 22));
    c.strokeStyle = '#7a776c'; c.lineWidth = 4;
    for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, x = lerp(x0, x1, k), y = lerp(y0, y1, k); c.save(); c.translate(x, y); c.rotate(Math.atan2(y1 - y0, x1 - x0) + (i % 2 ? 0 : 0)); c.beginPath(); c.ellipse(0, 0, 12, i % 2 ? 3 : 7, 0, 0, TAU); c.stroke(); c.restore(); }
  }

  /** a tower crane's mast (origin at its foot) — a lattice of two legs and diagonals */
  const mast = (h) => sprite('doh_mast_' + h, 120, h + 120, 60, h + 10, (g) => {
    g.strokeStyle = C.iron; g.lineWidth = 7;
    g.beginPath(); g.moveTo(-26, 0); g.lineTo(-26, -h); g.moveTo(26, 0); g.lineTo(26, -h); g.stroke();
    g.lineWidth = 4; g.beginPath(); for (let y = 0; y > -h; y -= 52) { g.moveTo(-26, y); g.lineTo(26, y - 52); g.moveTo(-26, y); g.lineTo(26, y); } g.stroke();
    g.fillStyle = C.iron; g.fillRect(-46, -h - 70, 92, 72);                         // the slewing ring and the cab
    g.fillStyle = '#c98a44'; g.fillRect(-30, -h - 56, 34, 26);
  }, 8);
  /** the jib and counter-jib (origin at the slewing ring); drawn pointing right, mirrored by the caller */
  const jib = (len) => sprite('doh_jib_' + len, len + 340, 180, 300, 110, (g) => {
    g.strokeStyle = C.iron; g.lineWidth = 6;
    g.beginPath(); g.moveTo(-240, -20); g.lineTo(len, -20); g.moveTo(-240, 10); g.lineTo(len, 10); g.stroke();
    g.lineWidth = 3; g.beginPath(); for (let x = -240; x < len; x += 40) { g.moveTo(x, 10); g.lineTo(x + 20, -20); g.lineTo(x + 40, 10); } g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(0, -90); g.lineTo(len * 0.7, -20); g.moveTo(0, -90); g.lineTo(-240, -20); g.moveTo(0, -90); g.lineTo(0, 10); g.stroke();   // the A-frame and its ties
    g.fillStyle = C.iron; g.fillRect(-250, -16, 70, 60);                          // the counterweight
    g.strokeStyle = '#3a372f'; g.lineWidth = 2; g.beginPath(); g.moveTo(len * 0.6, 10); g.lineTo(len * 0.6, 120); g.stroke();   // the hook line
    g.fillStyle = C.iron; g.fillRect(len * 0.6 - 12, 116, 24, 22);
  }, 8);
  /** an aircraft-warning light: a small red bead and a small halo — a lamp-sized glow made blobs of them */
  function beacon(c, x, y, b) {
    c.fillStyle = b > 0.5 ? '#ff3a24' : '#6a1a12'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
    if (b > 0.5) glow(c, x, y, 22, 'rgba(255,60,36,', 0.55);
  }
  /** a crane: mast at (x,y), jib slewed by angle a (0 = pointing right, PI = left) */
  function crane(c, x, y, h, len, a, t, { lift = 0.8 } = {}) {
    put(c, mast(h), x, y, { lift });
    const ca = Math.cos(a);
    c.save(); c.translate(x, y - h - 40); c.scale(Math.abs(ca) < 0.06 ? 0.06 * Math.sign(ca || 1) : ca, 1); put(c, jib(len), 0, 0, { lift }); c.restore();
    beacon(c, x + len * ca, y - h - 60, Math.floor(t * 1.5 + x) % 2 ? 1 : 0.25);   // the red light on the jib's tip
    beacon(c, x, y - h - 136, Math.floor(t * 1.5 + x + 1) % 2 ? 1 : 0.25);
  }

  /** the cheque from the first film: same card, same lettering, same sum */
  const cheque = () => sprite('doh_cheque', 860, 420, 430, 210, (g) => {
    g.fillStyle = K.ochre; g.beginPath(); g.roundRect(-400, -180, 800, 360, 10); g.fill();
    g.strokeStyle = K.ink; g.lineWidth = 3; g.strokeRect(-380, -160, 760, 320);
    BDF.doodleLogo(g, -360, -96, 62, { outline: 3 });
    g.fillStyle = K.ink; g.font = '24px "RobotoCondensed"'; g.fillText('9.9.2026', 250, -110);
    g.fillText('PAY', -360, -40); g.fillRect(-300, -36, 640, 3); g.font = '40px "RobotoCondensed"'; g.fillText('its own data centres in Finland', -290, -46);   // an investment in its own sites, not a payment to the state (review v2)
    g.font = '70px "Anton-400"'; g.fillText('€13 000 000 000', -360, 50);
    g.font = '30px "RobotoCondensed"'; g.fillText('2027–2028 · Hamina, Kajaani, Muhos, Vaala', -360, 122);
    g.lineWidth = 3; g.beginPath(); g.moveTo(170, 150); g.bezierCurveTo(200, 120, 230, 170, 260, 140); g.stroke();
  }, 14);

  /** the road in front of the hoarding, puddles catching the street lamp */
  const road = () => sheet('doh_road', (g) => { g.fillStyle = C.ground; g.fillRect(-90, 1500, W + 180, H); g.fillStyle = 'rgba(227,163,58,.16)'; for (const [x, w] of [[420, 260], [760, 160], [180, 120]]) { g.beginPath(); g.ellipse(x, 1640 + (x % 7) * 20, w, 26, 0, 0, Math.PI * 2); g.fill(); } }, 10);

  /** a small ochre tag in the box's lower corner: what and when */
  function tag(c, text, x = 110, y = 1690, a = 1) {
    y = Math.min(y, RFP.SAFE_B - 70);   // above Instagram's caption and channel line
    if (a <= 0) return; c.save(); c.globalAlpha = a; c.font = '34px "ArchivoBlack-400"'; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 70, 8); c.fill(); c.restore();
    c.save(); c.globalAlpha = a; c.fillStyle = K.ink; c.font = '34px "ArchivoBlack-400"'; c.fillText(text, x + 22, y + 48); c.restore();
  }
  /** a tag's fade: in after the dissolve, out before the next one (dur = the shot's length) */
  const tagA = (lt, dur) => clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dur - 0.6 - lt) / 0.3, 0, 1);

  /** a worker from behind, in hi-vis: the coat's back with its reflective bands, a beanie, the mask's strap and its light */
  const back = () => sprite('doh_back', 300, 480, 150, 460, (g) => {
    g.fillStyle = K.ink; for (const sx of [-1, 1]) { g.beginPath(); g.roundRect(sx * 40 - 20, -70, 40, 70, 8); g.fill(); }
    g.fillStyle = C.hivis; g.beginPath(); g.moveTo(-120, -60); g.lineTo(-104, -250); g.quadraticCurveTo(-90, -310, -40, -320); g.lineTo(40, -320); g.quadraticCurveTo(90, -310, 104, -250); g.lineTo(120, -60); g.closePath(); g.fill();
    g.fillStyle = '#d8d4c8'; g.fillRect(-114, -150, 228, 16); g.fillRect(-108, -230, 216, 16);
    g.fillStyle = '#3a2c22'; g.beginPath(); g.ellipse(0, -380, 62, 70, 0, 0, TAU); g.fill();
    g.fillStyle = '#2a2a26'; g.beginPath(); g.ellipse(0, -416, 64, 40, 0, Math.PI, TAU); g.fill();
    g.fillStyle = K.ink; g.fillRect(-64, -392, 128, 12);
  }, 10);
  function worker(c, x, y, s, t, lift = 1) { put(c, back(), x, y + Math.abs(Math.sin(t * 9)) * -4 * s, { sc: s, rot: Math.sin(t * 9) * 0.03, lift }); ledAt(c, x + 60 * s, y - 386 * s, 6 * s + 2, Math.floor(t * 4) % 2 ? 1 : 0.3); }

  return { C, GX0, GX1, GY0, GY1, site, hoarding, road, worker, tagA, leaf, sign, padlock, chain, crane, cheque, tag };
})();
