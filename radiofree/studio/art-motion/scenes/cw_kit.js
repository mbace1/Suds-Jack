// The kit for "Committee of the Whole" (Coxon #2) — built on RFP (the papercut box).
// New York City Hall at night and its council chamber, in card: the marble front with its
// cupola and clock, the panelled chamber with the dais, a dial on the wall, nameplates,
// envelopes, the gavel and an empty chair. Coxon is a real person, so he is shown only from
// behind — no face drawn and no Toko mask put on him; the masks are the council's.
window.CW = (() => {
  const { K, W, H, sheet, sprite, put, glow, ledAt, walker } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { marble: '#8c8573', marbleL: '#a39b86', marbleD: '#6e6858', wood: '#3a2618', woodL: '#5a3a24', woodD: '#2a1a10', brass: '#c9a24a', suit: '#23272b', hair: '#3a2a1e', green: '#24321e' };

  /** City Hall as it is — drawn in final frame coordinates. Two storeys of marble under one long
   *  balustrade; the centre a two-storey portico (columns below, columns above, its own balustrade);
   *  behind it the cupola: a square clock stage, a round colonnaded drum, a small dome, and Justice
   *  on top, gilt, with her scales. Park trees close the sides. Owner, 2026-10-14: "I wasn't sure it
   *  looked like" New York — so the building is the real silhouette and the skyline is behind it. */
  function balustrade(g, x0, x1, y, h = 22, col = C.marbleL) {
    g.fillStyle = col; g.fillRect(x0, y - 6, x1 - x0, 7); g.fillRect(x0, y + h, x1 - x0, 6);
    for (let x = x0 + 6; x < x1 - 6; x += 15) { g.beginPath(); g.ellipse(x + 4, y + h / 2 + 1, 4, h / 2, 0, 0, TAU); g.fill(); }
  }
  const hall = () => sheet('cw_hall2', (g) => {
    // the wings
    g.fillStyle = C.marbleD; g.fillRect(-90, 1170, W + 180, 400);
    g.fillStyle = C.marbleL; g.fillRect(-90, 1156, W + 180, 16); balustrade(g, -90, W + 90, 1126);
    g.fillStyle = C.marble; for (const x of [-60, 1030]) g.fillRect(x, 1150, 110, 420);                               // the end pavilions
    g.fillStyle = C.marbleL; for (const x of [-50, 30, 1040, 1120]) g.fillRect(x - 6, 1180, 12, 380);                  // pilasters
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-90, 1360, W + 180, 8);                                                 // the string course
    // the portico
    g.fillStyle = C.marble; g.fillRect(320, 1070, 440, 500);
    g.fillStyle = C.marbleL; g.fillRect(310, 1056, 460, 16); balustrade(g, 310, 770, 1026);
    g.fillStyle = C.marbleL; g.fillRect(310, 1330, 460, 24);                                                           // entablature
    for (let i = 0; i < 6; i++) { const x = 346 + i * 78; g.fillStyle = C.marbleL; g.fillRect(x, 1090, 24, 236); g.fillRect(x - 5, 1086, 34, 10); g.fillRect(x, 1360, 26, 200); g.fillRect(x - 5, 1356, 36, 10); }
    g.fillStyle = '#4a4538'; for (let i = 0; i < 5; i++) { const x = 378 + i * 78; g.fillRect(x, 1104, 40, 220); }     // shadowed bays between the upper columns
    // the steps and the plaza
    g.fillStyle = '#2f2b25'; for (let i = 0; i < 5; i++) { const x = 380 + i * 78; g.beginPath(); g.roundRect(x, 1390, 40, 170, [20, 20, 0, 0]); g.fill(); }   // the arched doors between the lower columns
    g.fillStyle = '#3a362e'; g.fillRect(-90, 1566, W + 180, 110);                                                     // the plinth
    g.fillStyle = '#4a4538'; for (let k = 0; k < 5; k++) g.fillRect(290 - k * 26, 1570 + k * 20, 500 + k * 52, 20);
    g.fillStyle = '#1a1714'; g.fillRect(-90, 1670, W + 180, H);
    // the cupola: clock stage, colonnaded drum, dome, lantern
    g.fillStyle = C.marble; g.fillRect(440, 880, 200, 160); g.fillStyle = C.marbleL; g.fillRect(430, 868, 220, 14); g.fillRect(430, 1036, 220, 12);
    g.fillStyle = '#e8e0c8'; g.beginPath(); g.arc(540, 958, 56, 0, TAU); g.fill(); g.strokeStyle = K.ink; g.lineWidth = 5; g.beginPath(); g.arc(540, 958, 56, 0, TAU); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(540, 958); g.lineTo(540, 920); g.moveTo(540, 958); g.lineTo(568, 968); g.stroke();   // ten past seven
    g.fillStyle = C.marbleD; g.fillRect(470, 760, 140, 108);                                                            // the drum's shadowed core
    g.fillStyle = C.marbleL; for (let i = 0; i < 6; i++) g.fillRect(470 + i * 25, 762, 12, 104); g.fillRect(458, 750, 164, 14); g.fillRect(458, 864, 164, 10);
    g.fillStyle = C.marble; g.beginPath(); g.ellipse(540, 752, 76, 64, 0, Math.PI, TAU); g.fill();                     // the dome
    g.fillStyle = C.marbleL; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(540 + i * 26, 730, 4, 26, i * 0.1, 0, TAU); g.fill(); }   // ribs
    g.fillStyle = C.marble; g.fillRect(526, 650, 28, 42); g.fillStyle = C.marbleL; g.fillRect(520, 644, 40, 8);         // the lantern
    // Justice, gilt: a standing figure, the scales held out to her left, the sword down to her right
    g.fillStyle = '#c9a24a'; g.beginPath(); g.moveTo(528, 644); g.lineTo(532, 600); g.quadraticCurveTo(540, 588, 548, 600); g.lineTo(552, 644); g.closePath(); g.fill();
    g.beginPath(); g.arc(540, 582, 9, 0, TAU); g.fill();
    g.strokeStyle = '#c9a24a'; g.lineWidth = 5; g.beginPath(); g.moveTo(546, 600); g.lineTo(570, 572); g.stroke();       // the raised arm
    g.lineWidth = 3; g.beginPath(); g.moveTo(556, 572); g.lineTo(584, 572); g.stroke();
    for (const x of [556, 584]) { g.beginPath(); g.moveTo(x, 572); g.lineTo(x, 584); g.stroke(); g.beginPath(); g.ellipse(x, 586, 7, 3, 0, 0, TAU); g.fill(); }
    g.lineWidth = 4; g.beginPath(); g.moveTo(533, 604); g.lineTo(518, 640); g.stroke();                                // the sword
  }, 14);
  /** the windows of City Hall, lit by the caller: the wings' upper (square) then lower (arched) rows */
  const WINDOWS = [[200, 1200], [260, 1200], [820, 1200], [880, 1200], [140, 1200], [940, 1200], [200, 1400], [260, 1400], [820, 1400], [880, 1400], [140, 1400], [940, 1400]];
  function windows(c, n, ox = 0) { WINDOWS.forEach(([x, y], i) => { c.fillStyle = i < n ? '#e0a650' : '#2b2822'; c.beginPath(); c.roundRect(x - 20 + ox, y, 40, i % 12 < 6 ? 120 : 130, i % 12 < 6 ? 3 : [20, 20, 0, 0]); c.fill(); }); }
  /** lower Manhattan behind it, as seen from City Hall Park: One World Trade Center far left, the
   *  Woolworth Building's gothic tower and copper crown, the Municipal Building's tiers and gilt
   *  statue on the right, ordinary towers between with lit windows */
  const skyline = () => sheet('cw_skyline', (g) => {
    const S0 = '#20262c', S1 = '#2a3137', S2 = '#353d44';
    const towers = [[330, 410, 780], [405, 470, 840], [620, 700, 720], [700, 790, 800], [-20, 60, 640], [470, 540, 900]];
    g.fillStyle = S0; for (const [a, b, top] of towers) g.fillRect(a, top, b - a, 1200 - top);
    g.fillStyle = 'rgba(224,166,80,.55)'; let r = 7;
    for (const [a, b, top] of towers) for (let y = top + 20; y < 1150; y += 26) for (let x = a + 8; x < b - 8; x += 18) { r = (r * 9301 + 49297) % 233280; if (r / 233280 < 0.18) g.fillRect(x, y, 7, 10); }
    // One World Trade Center
    g.fillStyle = S1; g.beginPath(); g.moveTo(60, 1200); g.lineTo(70, 330); g.lineTo(120, 330); g.lineTo(170, 1200); g.closePath(); g.fill();
    g.fillStyle = S2; g.beginPath(); g.moveTo(115, 1200); g.lineTo(95, 330); g.lineTo(120, 330); g.lineTo(170, 1200); g.closePath(); g.fill();
    g.fillStyle = S1; g.fillRect(93, 230, 4, 100);
    // the Woolworth Building
    g.fillStyle = S1; g.fillRect(165, 610, 150, 600); g.fillRect(195, 440, 90, 180); g.fillRect(210, 380, 60, 70);
    g.fillStyle = S2; for (let x = 172; x < 312; x += 16) g.fillRect(x, 616, 4, 590); for (let x = 200; x < 284; x += 14) g.fillRect(x, 446, 3, 170);
    g.fillStyle = '#4f6b62'; g.beginPath(); g.moveTo(206, 384); g.lineTo(240, 300); g.lineTo(274, 384); g.closePath(); g.fill();   // the copper crown
    g.fillRect(238, 262, 4, 40);
    for (const [x, y] of [[196, 440], [284, 440], [210, 380], [270, 380]]) { g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x, y - 30); g.lineTo(x + 7, y); g.fill(); }   // pinnacles
    // the Municipal Building
    g.fillStyle = S1; g.fillRect(790, 640, 300, 570); g.fillRect(850, 560, 160, 90); g.fillRect(885, 495, 90, 70); g.fillRect(905, 450, 50, 50);
    g.fillStyle = S2; for (let x = 858; x < 1004; x += 18) g.fillRect(x, 566, 6, 80); for (let x = 890; x < 972; x += 14) g.fillRect(x, 500, 4, 60);
    g.fillStyle = S1; g.beginPath(); g.ellipse(930, 450, 25, 18, 0, Math.PI, TAU); g.fill();
    g.fillStyle = '#c9a24a'; g.beginPath(); g.moveTo(922, 432); g.lineTo(926, 396); g.quadraticCurveTo(930, 388, 934, 396); g.lineTo(938, 432); g.closePath(); g.fill();   // Civic Fame, gilt: a robed figure
    g.beginPath(); g.arc(930, 382, 6, 0, TAU); g.fill(); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.beginPath(); g.moveTo(934, 398); g.lineTo(946, 372); g.stroke(); g.beginPath(); g.moveTo(926, 400); g.lineTo(916, 412); g.stroke();
    g.beginPath(); g.arc(946, 368, 6, Math.PI * 0.9, Math.PI * 2.1); g.stroke();   // the crown she holds up
    g.fillStyle = 'rgba(224,166,80,.45)'; for (let y = 660; y < 1150; y += 28) for (let x = 802; x < 1080; x += 22) { r = (r * 9301 + 49297) % 233280; if (r / 233280 < 0.14) g.fillRect(x, y, 8, 11); }
  }, 6);
  /** a New York taxi, side on, in card */
  const taxi = () => sprite('cw_taxi', 300, 120, 150, 110, (g) => {
    g.fillStyle = '#e8b520'; g.beginPath(); g.moveTo(-140, -20); g.lineTo(-130, -54); g.lineTo(-70, -58); g.lineTo(-44, -92); g.lineTo(52, -92); g.lineTo(84, -58); g.lineTo(136, -52); g.lineTo(144, -20); g.closePath(); g.fill();
    g.fillStyle = '#1d2226'; g.beginPath(); g.moveTo(-36, -86); g.lineTo(2, -86); g.lineTo(2, -60); g.lineTo(-58, -60); g.closePath(); g.fill(); g.beginPath(); g.moveTo(10, -86); g.lineTo(48, -86); g.lineTo(74, -60); g.lineTo(10, -60); g.closePath(); g.fill();
    g.fillStyle = '#f4ecd0'; g.fillRect(-14, -108, 44, 16); g.fillStyle = K.ink; g.font = '12px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('TAXI', 8, -96);
    g.fillStyle = K.ink; g.font = '15px "ArchivoBlack-400"'; g.fillText('NYC', -40, -32);
    g.fillStyle = '#15120f'; for (const x of [-86, 86]) { g.beginPath(); g.arc(x, -16, 22, 0, TAU); g.fill(); }
    g.fillStyle = '#6a6458'; for (const x of [-86, 86]) { g.beginPath(); g.arc(x, -16, 9, 0, TAU); g.fill(); }
  }, 6);
  /** a small ochre tag in the box's lower corner — where and what, so a viewer far from New York knows */
  function tag(c, text, lt, dur, x = 110, y = 1700) {
    y = Math.min(y, RFP.SAFE_B - 66);   // above Instagram's caption and channel line
    const a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dur - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = '32px "ArchivoBlack-400"'; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }

  /** the council chamber: panelled walls, the curved dais, the seal */
  const chamber = () => sheet('cw_chamber', (g) => {
    g.fillStyle = C.woodD; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.wood; for (let x = -60; x < W + 90; x += 150) g.fillRect(x, 300, 128, 760);
    g.fillStyle = '#d8c8a8'; g.fillRect(-90, 250, W + 180, 14);
  }, 14);
  const dais = () => sheet('cw_dais', (g) => {
    g.fillStyle = C.woodL; g.beginPath(); g.moveTo(-90, 1180); g.quadraticCurveTo(540, 1080, W + 90, 1180); g.lineTo(W + 90, 1420); g.quadraticCurveTo(540, 1320, -90, 1420); g.closePath(); g.fill();
    g.fillStyle = C.wood; g.beginPath(); g.moveTo(-90, 1200); g.quadraticCurveTo(540, 1100, W + 90, 1200); g.lineTo(W + 90, 1230); g.quadraticCurveTo(540, 1130, -90, 1230); g.closePath(); g.fill();
    g.fillStyle = C.brass; g.font = '26px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('THE COUNCIL OF THE CITY OF NEW YORK', 540, 1300);
  }, 12);
  /** council members at the dais: masked heads and shoulders, drawn by the caller in a row */
  function council(c, lt, ox = 0, y = 1100, n = 7, s = 0.5) {
    for (let i = 0; i < n; i++) { const x = 120 + i * (840 / (n - 1)); walker(c, x + ox, y - Math.sin((x / 1080) * Math.PI) * 90, s, { coat: ['#2e3236', '#3a3530', '#2a2f2c'][i % 3], scarf: ['#5a5a52', K.ochre, '#8a7a5a'][i % 3], t: lt + i, tilt: Math.sin(lt * 0.7 + i) * 0.04, led: false, lift: 1 }); }
  }
  /** the dial: a semicircle, 0 to 100, a mark at 50 */
  const dial = () => sprite('cw_dial', 640, 460, 320, 330, (g) => {
    g.fillStyle = '#d8c8a8'; g.beginPath(); g.arc(0, 0, 300, Math.PI, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(240,2,127,.18)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 286, -Math.PI / 2, 0); g.closePath(); g.fill();   // past 50
    g.strokeStyle = K.ink; g.lineWidth = 4; for (let k = 0; k <= 10; k++) { const a = Math.PI + (k / 10) * Math.PI, r0 = k % 5 ? 250 : 220; g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * 286, Math.sin(a) * 286); g.stroke(); }
    g.fillStyle = K.ink; g.font = '34px "ArchivoBlack-400"'; g.textAlign = 'center'; g.fillText('0', -250, -14); g.fillText('50', 0, -190); g.fillText('100', 250, -14);
    g.fillStyle = K.ink; g.fillRect(-230, 14, 460, 92); g.fillStyle = '#d8c8a8'; g.font = '28px "ArchivoBlack-400"'; g.fillText('LOSS OF CONTROL', 0, 50); g.font = '22px "RobotoCondensed"'; g.fillText("COXON'S ESTIMATE, ON OUR CURRENT PATH", 0, 88);   // his estimate, not the council's reading (review v2)   // the label on a strip under the dial, clear of the needle
  }, 10);
  const needle = () => sprite('cw_needle', 60, 300, 30, 270, (g) => { g.fillStyle = K.mag; g.beginPath(); g.moveTo(-10, 0); g.lineTo(0, -262); g.lineTo(10, 0); g.closePath(); g.fill(); g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); }, 6);
  /** a nameplate: a dark wooden block with a brass plate */
  const plate = (text, w = 300, fixed = 0) => sprite(`cw_plate_${text}_${w}_${fixed}`, w + 40, 110, (w + 40) / 2, 90, (g) => {
    g.fillStyle = C.woodD; g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(w / 2, 0); g.lineTo(w / 2 - 14, -80); g.lineTo(-w / 2 + 14, -80); g.closePath(); g.fill();
    g.fillStyle = C.brass; g.fillRect(-w / 2 + 24, -66, w - 48, 50); g.fillStyle = K.ink; g.textAlign = 'center';
    let fs = fixed || 30; g.font = fs + 'px "ArchivoBlack-400"'; while (g.measureText(text).width > w - 64 && fs > 14) g.font = --fs + 'px "ArchivoBlack-400"';   // the plate is cut to fit its name, never the name to overrun the plate
    g.fillText(text, 0, -41 + fs * 0.36);
  }, 6);
  /** a gooseneck microphone, its light driven by the caller */
  function mic(c, x, y, lt, on = 1, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s);
    c.strokeStyle = '#1b1b1b'; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10, -120, 70, -180); c.stroke();
    c.fillStyle = '#1b1b1b'; c.beginPath(); c.ellipse(80, -190, 22, 34, -0.8, 0, TAU); c.fill(); c.fillRect(-40, -6, 80, 16);
    c.restore(); ledAt(c, x + 30 * s, y - 2 * s, 7 * s, on);
  }
  /** Coxon, from behind, seated at the witness table: a suit's shoulders and the back of his head */
  const backView = () => sprite('cw_back', 420, 520, 210, 500, (g) => {
    g.fillStyle = C.suit; g.beginPath(); g.moveTo(-190, 0); g.lineTo(-176, -230); g.quadraticCurveTo(-150, -300, -60, -312); g.lineTo(60, -312); g.quadraticCurveTo(150, -300, 176, -230); g.lineTo(190, 0); g.closePath(); g.fill();
    g.fillStyle = '#9fb4c8'; g.beginPath(); g.moveTo(-40, -322); g.lineTo(40, -322); g.lineTo(52, -304); g.lineTo(-52, -304); g.closePath(); g.fill();   // a blue shirt collar
    g.fillStyle = '#1a1d20'; g.beginPath(); g.moveTo(-70, -312); g.lineTo(-30, -306); g.lineTo(-60, -280); g.closePath(); g.fill(); g.beginPath(); g.moveTo(70, -312); g.lineTo(30, -306); g.lineTo(60, -280); g.closePath(); g.fill();   // the jacket's collar over it
    g.fillStyle = '#c99b7a'; g.fillRect(-36, -350, 72, 40);                                                                                   // the neck
    g.fillStyle = C.hair; g.beginPath(); g.ellipse(0, -420, 84, 96, 0, 0, TAU); g.fill();
    g.fillStyle = '#c99b7a'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 84, -414, 14, 24, 0, 0, TAU); g.fill(); }                    // ears
  }, 12);
  /** an envelope, face down (blank) or turned (its answer) */
  const envelope = (label, answer) => sprite(`cw_env_${label}_${answer || ''}`, 400, 250, 200, 125, (g) => {
    g.fillStyle = answer ? '#e8dcbc' : K.card; g.beginPath(); g.roundRect(-180, -105, 360, 210, 8); g.fill();
    g.strokeStyle = K.cardD; g.lineWidth = 3; g.beginPath(); g.moveTo(-180, -105); g.lineTo(0, 10); g.lineTo(180, -105); g.stroke();
    g.fillStyle = K.ink; g.textAlign = 'center'; g.font = '38px "ArchivoBlack-400"'; g.fillText(label, 0, 64);
    if (answer) { g.fillStyle = answer === 'YES' ? '#2f6a3e' : K.mag; g.font = '46px "Anton-400"'; g.fillText(answer, 0, -36); }
  }, 8);
  const stampMark = (text, w = 520) => sprite('cw_stamp_' + text, w + 40, 190, (w + 40) / 2, 95, (g) => { g.strokeStyle = K.mag; g.lineWidth = 9; g.strokeRect(-w / 2, -76, w, 152); g.fillStyle = K.mag; g.font = '108px "Anton-400"'; g.textAlign = 'center'; g.fillText(text, 0, 40); }, 3);
  /** the gavel, origin at the far end of its handle (the hand that swings it is out of shot): the head at -len */
  const gavel = (len = 620) => sprite('cw_gavel_' + len, len + 200, 220, len + 100, 110, (g) => {
    g.fillStyle = C.woodL; g.fillRect(-len + 50, -14, len - 30, 28); g.fillStyle = C.wood; g.beginPath(); g.roundRect(-len - 55, -100, 110, 200, 18); g.fill();
    g.fillStyle = C.brass; g.fillRect(-len - 55, -100, 110, 18); g.fillRect(-len - 55, 82, 110, 18); g.fillStyle = C.woodL; g.fillRect(-len - 40, -60, 16, 120);
  }, 8);
  const block = () => sprite('cw_block', 320, 90, 160, 60, (g) => { g.fillStyle = C.wood; g.beginPath(); g.ellipse(0, 0, 140, 34, 0, 0, TAU); g.fill(); g.fillStyle = C.woodL; g.beginPath(); g.ellipse(0, -10, 140, 30, 0, 0, TAU); g.fill(); }, 8);
  const chair = () => sprite('cw_chair', 340, 560, 170, 540, (g) => {
    g.fillStyle = '#2a1a10'; g.fillRect(-120, -500, 240, 300); g.fillStyle = '#4a2a1a'; g.beginPath(); g.roundRect(-110, -490, 220, 280, 18); g.fill();   // the back, leather
    g.fillStyle = '#2a1a10'; g.fillRect(-140, -220, 280, 60); g.fillStyle = '#4a2a1a'; g.fillRect(-130, -214, 260, 40);                               // the seat
    g.fillStyle = '#1a120c'; for (const x of [-120, 104]) g.fillRect(x, -160, 16, 160);
  }, 12);
  const table = () => sheet('cw_table', (g) => { g.fillStyle = C.woodL; g.fillRect(-90, 1460, W + 180, 60); g.fillStyle = C.wood; g.fillRect(-90, 1520, W + 180, H); g.fillStyle = 'rgba(255,240,210,.06)'; g.fillRect(-90, 1460, W + 180, 8); }, 12);

  return { C, hall, windows, skyline, taxi, tag, chamber, dais, council, dial, needle, plate, mic, backView, envelope, stampMark, gavel, block, chair, table };
})();
