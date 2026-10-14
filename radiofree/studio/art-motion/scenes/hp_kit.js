// The kit for "A Handful of People" (Coxon #1) — built on RFP (the papercut box).
// Real people are never drawn with faces: Coxon and Stewart are dark card silhouettes rimmed
// in lamplight at a late-night desk; the Speaker of the House is a podium. The public is
// hands — dozens of them, cut from card in coat colours, reaching up.
window.HP = (() => {
  const { K, W, H, sheet, sprite, put, glow } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { night: '#141a22', nightL: '#1d2632', sil: '#0f1114', rim: '#e3a33a', desk: '#24324a', deskL: '#2f4160', sea: '#2c5a6a', land: '#7a9a6a', stone: '#8c8573', stoneL: '#a39b86', stoneD: '#6e6858' };
  const COATS = ['#3a3530', '#4a3a2c', '#2e3236', '#5a4630', '#2a3a32', '#4a2e2a'];

  /** the post, typed out to n characters, on a card */
  const LINES = ['I resigned from Anthropic today.', '…at both OpenAI and Anthropic.', 'Neither company is', 'acting responsibly.'];
  function post(c, x, y, n, lt) {
    c.save(); c.translate(x, y); c.rotate(-0.02);
    c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 22; c.shadowOffsetX = 12; c.shadowOffsetY = 18; c.fillStyle = K.card; c.beginPath(); c.roundRect(-400, -300, 800, 600, 24); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = '#3a3a34'; c.beginPath(); c.arc(-330, -224, 34, 0, TAU); c.fill();                                        // an avatar disc, blank
    c.fillStyle = K.ink; c.font = '34px "Poppins-700"'; c.fillText('Jacob Coxon', -278, -228); c.fillStyle = '#5a5448'; c.font = '32px "RobotoCondensed"'; c.fillText('September 2026', -278, -186);
    c.fillStyle = K.ink; c.font = '48px "RobotoCondensed"'; let left = n;
    LINES.forEach((l, i) => { const s = l.slice(0, Math.max(0, left)); left -= l.length; c.fillText(s, -350, -80 + i * 76); if (left < 0 && left > -l.length - 1 && Math.floor(lt * 3) % 2) c.fillRect(-350 + c.measureText(s).width + 4, -118 + i * 76, 4, 50); });
    c.restore();
  }
  const POSTLEN = LINES.reduce((a, l) => a + l.length, 0);

  /** the late-night set: a New York skyline backdrop and the desk */
  const studio = () => sheet('hp_studio', (g) => {
    g.fillStyle = C.night; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(9); g.fillStyle = '#0d1218';
    for (let x = -90; x < W + 90;) { const w = 50 + r() * 90, h = 260 + r() * 520; g.fillRect(x, 1250 - h, w, h + 100); if (r() < 0.3) { g.fillRect(x + w * 0.4, 1250 - h - 60, w * 0.2, 60); } x += w + 6; }
    g.fillStyle = '#e0b060'; for (let i = 0; i < 160; i++) { const x = r() * W, y = 700 + r() * 540; if (r() < 0.55) g.fillRect(x, y, 6, 9); }
  }, 14);
  /** the desk, in front of whoever sits at it */
  const desk = () => sheet('hp_desk', (g) => {
    g.fillStyle = C.desk; g.beginPath(); g.moveTo(-90, 1420); g.quadraticCurveTo(540, 1340, W + 90, 1420); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill();
    g.fillStyle = C.deskL; g.beginPath(); g.moveTo(-90, 1420); g.quadraticCurveTo(540, 1340, W + 90, 1420); g.lineTo(W + 90, 1450); g.quadraticCurveTo(540, 1370, -90, 1450); g.closePath(); g.fill();
    g.fillStyle = '#e8e2d4'; g.fillRect(250, 1330, 44, 56); g.fillRect(800, 1328, 44, 56);   // two mugs
  }, 14);
  /** a silhouette at the desk: head and shoulders in dark card, rimmed on the lamp side (side = -1 lamp left, 1 lamp right) */
  const silhouette = (side, seed) => sprite('hp_sil_' + side + seed, 420, 520, 210, 500, (g) => {
    const shape = (p) => { p.beginPath(); p.moveTo(-190, 0); p.lineTo(-178, -220); p.quadraticCurveTo(-150, -296, -60, -306); p.lineTo(-34, -340); p.lineTo(34, -340); p.lineTo(60, -306); p.quadraticCurveTo(150, -296, 178, -220); p.lineTo(190, 0); p.closePath(); p.fill(); p.beginPath(); p.ellipse(0, -420, 80 + seed * 4, 94, 0, 0, TAU); p.fill(); };
    g.fillStyle = C.rim; g.save(); g.translate(side * -7, -3); shape(g); g.restore();   // the rim, a sliver of lamplight on one edge
    g.fillStyle = C.sil; shape(g);
  }, 12);
  /** a paper globe: sea card, land card, two lines of latitude; rot turns it */
  function globe(c, x, y, r, rot, lift = 1.6) {
    put(c, sprite('hp_globe_' + r, r * 2 + 40, r * 2 + 40, r + 20, r + 20, (g) => { g.fillStyle = C.sea; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }, 10), x, y, { lift });
    c.save(); c.beginPath(); c.arc(x, y, r - 2, 0, TAU); c.clip(); c.fillStyle = C.land; const R = U.rng(3);
    for (let i = 0; i < 7; i++) { const lon = ((i * 0.9 + rot) % TAU + TAU) % TAU - Math.PI, lat = (R() - 0.5) * 1.6; if (Math.abs(lon) > Math.PI / 2) { R(); R(); continue; } const px = x + Math.sin(lon) * r * 0.95, py = y + Math.sin(lat) * r * 0.9, w = (40 + R() * 70) * Math.cos(lon), h = 30 + R() * 50; c.beginPath(); c.ellipse(px, py, Math.max(4, w), h, 0.3, 0, TAU); c.fill(); }
    c.strokeStyle = 'rgba(216,200,168,.35)'; c.lineWidth = 3; for (const lt of [-0.45, 0, 0.45]) { c.beginPath(); c.ellipse(x, y + Math.sin(lt) * r, r * Math.cos(lt), r * 0.12, 0, 0, TAU); c.stroke(); }
    c.restore();
  }
  /** an open hand reaching up from below, its arm running off the bottom; fingers spread */
  const reach = (coat, k) => sprite(`hp_reach_${coat}_${k}`, 200, 900, 100, 120, (g) => {
    g.fillStyle = coat; g.beginPath(); g.moveTo(-46, 110); g.lineTo(46, 110); g.lineTo(64, 880); g.lineTo(-64, 880); g.closePath(); g.fill();
    g.fillStyle = K.card; g.fillRect(-48, 96, 96, 22);                                                                         // the cuff
    g.fillStyle = K.ink; g.beginPath(); g.roundRect(-42, 10, 84, 92, 24); g.fill();                                            // the glove's palm
    for (let i = 0; i < 4; i++) { g.save(); g.translate(-30 + i * 20, 16); g.rotate((i - 1.5) * 0.14 * k); g.beginPath(); g.roundRect(-9, -84 + Math.abs(i - 1.5) * 8, 18, 86, 9); g.fill(); g.restore(); }
    g.save(); g.translate(-40, 56); g.rotate(-0.9 * k); g.beginPath(); g.roundRect(-10, -60, 20, 64, 10); g.fill(); g.restore();   // the thumb
  }, 8);
  /** the Capitol: a long front, the drum and dome, the statue */
  const capitol = () => sheet('hp_capitol', (g) => {
    g.fillStyle = C.stoneD; g.fillRect(-90, 1260, W + 180, 260);
    g.fillStyle = C.stone; g.fillRect(260, 1200, 560, 320); g.fillStyle = C.stoneL; g.beginPath(); g.moveTo(330, 1200); g.lineTo(540, 1130); g.lineTo(750, 1200); g.closePath(); g.fill();
    g.fillStyle = C.stoneL; for (let i = 0; i < 8; i++) g.fillRect(300 + i * 66, 1210, 22, 300);
    g.fillStyle = C.stone; g.fillRect(380, 1010, 320, 130); g.fillStyle = C.stoneL; for (let i = 0; i < 12; i++) g.fillRect(392 + i * 26, 1020, 12, 116); g.fillRect(370, 1000, 340, 16);   // the drum
    g.fillStyle = C.stoneL; g.beginPath(); g.moveTo(400, 1000); g.quadraticCurveTo(410, 830, 540, 820); g.quadraticCurveTo(670, 830, 680, 1000); g.closePath(); g.fill();                       // the dome
    g.fillStyle = C.stone; g.fillRect(520, 760, 40, 64); g.beginPath(); g.arc(540, 752, 16, 0, TAU); g.fill();
    g.fillStyle = '#3a3630'; for (let k = 0; k < 4; k++) g.fillRect(220 - k * 40, 1520 + k * 20, 640 + k * 80, 20);
    g.fillStyle = '#1a1714'; g.fillRect(-90, 1600, W + 180, H);
  }, 14);
  const CAPWIN = []; for (let r = 0; r < 2; r++) for (let x = -40; x < W + 60; x += 76) if (x < 240 || x > 830) CAPWIN.push([x, 1300 + r * 110]);
  function capWindows(c, lit, ox = 0) { CAPWIN.forEach(([x, y], i) => { c.fillStyle = lit(i) ? '#e0a650' : '#2b2822'; c.fillRect(x + ox, y, 34, 70); }); }
  /** a lectern with a plate */
  const podium = () => sprite('hp_podium', 520, 700, 260, 690, (g) => {
    g.fillStyle = '#3a2618'; g.beginPath(); g.moveTo(-200, 0); g.lineTo(200, 0); g.lineTo(170, -560); g.lineTo(-170, -560); g.closePath(); g.fill();
    g.fillStyle = '#5a3a24'; g.fillRect(-230, -600, 460, 50); g.fillStyle = '#c9a24a'; g.fillRect(-110, -420, 220, 70); g.fillStyle = K.ink; g.font = '38px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('SPEAKER', 0, -370);
  }, 12);
  /** the hourglass, drawn live: f = sand left in the top bulb (0..1), turned by a */
  function hourglass(c, x, y, h, f, a) {
    c.save(); c.translate(x, y); c.rotate(a);
    const w = h * 0.36;
    c.fillStyle = '#5a3a24'; c.fillRect(-w - 20, -h / 2 - 22, 2 * w + 40, 22); c.fillRect(-w - 20, h / 2, 2 * w + 40, 22);
    c.fillStyle = 'rgba(220,230,235,.22)'; c.beginPath(); c.moveTo(-w, -h / 2); c.lineTo(w, -h / 2); c.quadraticCurveTo(w, -10, 8, 0); c.quadraticCurveTo(w, 10, w, h / 2); c.lineTo(-w, h / 2); c.quadraticCurveTo(-w, 10, -8, 0); c.quadraticCurveTo(-w, -10, -w, -h / 2); c.fill();
    c.fillStyle = K.ochre;
    const top = h / 2 * f, bot = h / 2 * (1 - f);
    c.beginPath(); c.moveTo(-w * f * 0.9, -top * 0.9); c.lineTo(w * f * 0.9, -top * 0.9); c.lineTo(0, -6); c.closePath(); if (f > 0.01) c.fill();
    c.beginPath(); c.moveTo(-w * 0.95, h / 2); c.lineTo(w * 0.95, h / 2); c.lineTo(0, h / 2 - bot * 0.9 - 4); c.closePath(); c.fill();
    if (f > 0.01 && Math.abs(Math.sin(a)) < 0.05) c.fillRect(-1.5, -4, 3, h / 2 - bot * 0.9);
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-w + 12, -h / 2 + 10); c.quadraticCurveTo(-w + 10, -30, -14, -6); c.stroke();
    c.restore();
  }
  /** a snail in card: the slowest thing in the box */
  const snail = () => sprite('hp_snail', 260, 190, 120, 160, (g) => {
    g.strokeStyle = '#8a7a5a'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(84, -30); g.lineTo(104, -86); g.moveTo(92, -28); g.lineTo(124, -78); g.stroke(); g.fillStyle = K.ink; g.beginPath(); g.arc(104, -88, 7, 0, TAU); g.arc(125, -80, 7, 0, TAU); g.fill();   // eye stalks
    g.fillStyle = '#8a7a5a'; g.beginPath(); g.moveTo(-90, 0); g.quadraticCurveTo(-20, -24, 70, -10); g.quadraticCurveTo(100, -40, 96, -60); g.lineTo(84, -60); g.quadraticCurveTo(84, -30, 60, -24); g.lineTo(90, 0); g.closePath(); g.fill();
    g.fillStyle = K.ochre; g.beginPath(); g.arc(-10, -50, 48, 0, TAU); g.fill(); g.strokeStyle = '#7a5a20'; g.lineWidth = 5; g.beginPath(); for (let t = 0; t < 14; t += 0.2) { const r = 44 * (1 - t / 14); g.lineTo(-10 + Math.cos(t) * r, -50 + Math.sin(t) * r); } g.stroke();
  }, 6);
  /** the calendar: NOVEMBER 2026 / 3 / TUESDAY */
  const calendar = () => sprite('hp_cal', 460, 520, 230, 260, (g) => {
    g.fillStyle = K.ink; g.beginPath(); g.roundRect(-210, -250, 420, 120, 10); g.fill(); g.fillStyle = K.card; g.fillRect(-210, -140, 420, 380);
    g.fillStyle = K.card; g.font = '52px "Anton-400"'; g.textAlign = 'center'; g.fillText('NOVEMBER', 0, -176); g.fillStyle = K.ink; g.font = '280px "Anton-400"'; g.fillText('3', 0, 150); g.font = '40px "ArchivoBlack-400"'; g.fillText('TUESDAY', 0, 214);
  }, 10);
  const box = () => sprite('hp_box', 520, 460, 260, 440, (g) => {
    g.fillStyle = '#5a4630'; g.fillRect(-220, -380, 440, 380); g.fillStyle = '#6a5438'; g.fillRect(-240, -420, 480, 50);
    g.fillStyle = K.ink; g.fillRect(-110, -404, 220, 18); g.fillStyle = K.card; g.fillRect(-150, -270, 300, 110); g.fillStyle = K.ink; g.font = '64px "Anton-400"'; g.textAlign = 'center'; g.fillText('BALLOTS', 0, -190);
  }, 12);
  const ballot = () => sprite('hp_ballot', 150, 200, 75, 100, (g) => { g.fillStyle = '#efe8d8'; g.fillRect(-60, -82, 120, 164); g.strokeStyle = K.ink; g.lineWidth = 3; for (let i = 0; i < 4; i++) { g.strokeRect(-46, -60 + i * 34, 18, 18); g.fillStyle = 'rgba(21,18,15,.5)'; g.fillRect(-20, -54 + i * 34, 64, 6); } g.lineWidth = 5; g.beginPath(); g.moveTo(-44, -10); g.lineTo(-37, 0); g.lineTo(-26, -20); g.stroke(); }, 6);

  return { C, COATS, post, POSTLEN, studio, desk, silhouette, globe, reach, capitol, capWindows, CAPWIN, podium, hourglass, snail, calendar, box, ballot };
})();
