// The kit for "Committee of the Whole" (Coxon #2) — built on RFP (the papercut box).
// New York City Hall at night and its council chamber, in card: the marble front with its
// cupola and clock, the panelled chamber with the dais, a dial on the wall, nameplates,
// envelopes, the gavel and an empty chair. Coxon is a real person, so he is shown only from
// behind — no face drawn and no Toko mask put on him; the masks are the council's.
window.CW = (() => {
  const { K, W, H, sheet, sprite, put, glow, ledAt, walker } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { marble: '#8c8573', marbleL: '#a39b86', marbleD: '#6e6858', wood: '#3a2618', woodL: '#5a3a24', woodD: '#2a1a10', brass: '#c9a24a', suit: '#23272b', hair: '#3a2a1e', green: '#24321e' };

  /** City Hall: two wings, the portico, the cupola with its clock and the figure on top */
  const hall = () => sheet('cw_hall', (g) => {
    g.fillStyle = C.green; for (const x of [-60, 1060]) { g.beginPath(); g.ellipse(x, 1330, 220, 300, 0, 0, TAU); g.fill(); }   // trees either side
    g.fillStyle = C.marbleD; g.fillRect(-40, 1080, W + 80, 420);                                                              // the wings
    g.fillStyle = C.marble; g.fillRect(250, 1010, 580, 490);                                                                  // the centre block
    g.fillStyle = C.marbleL; g.fillRect(-40, 1066, W + 80, 18); g.fillRect(240, 996, 600, 18);                                // cornices
    g.fillStyle = C.marble; g.fillRect(400, 760, 280, 250); g.fillStyle = C.marbleL; g.fillRect(390, 748, 300, 16);           // the drum
    g.fillStyle = C.marbleD; g.beginPath(); g.moveTo(420, 748); g.quadraticCurveTo(540, 600, 660, 748); g.closePath(); g.fill(); // the cupola
    g.fillStyle = C.marble; g.fillRect(520, 560, 40, 70); g.beginPath(); g.arc(540, 556, 16, 0, TAU); g.fill();                // the lantern and Justice
    g.fillStyle = '#e8e0c8'; g.beginPath(); g.arc(540, 870, 62, 0, TAU); g.fill(); g.strokeStyle = K.ink; g.lineWidth = 5; g.beginPath(); g.arc(540, 870, 62, 0, TAU); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(540, 870); g.lineTo(540, 828); g.moveTo(540, 870); g.lineTo(572, 880); g.stroke();   // the clock, ten past seven
    g.fillStyle = C.marbleL; for (let i = 0; i < 6; i++) g.fillRect(300 + i * 92, 1030, 30, 380);                              // the portico's columns
    g.fillStyle = C.marbleD; g.fillRect(250, 1410, 580, 30); g.fillStyle = '#4a4538'; for (let k = 0; k < 4; k++) g.fillRect(200 - k * 30, 1440 + k * 22, 680 + k * 60, 22);   // the steps
    g.fillStyle = '#1a1714'; g.fillRect(-90, 1530, W + 180, H);                                                               // the plaza
  }, 14);
  /** the windows of City Hall, lit by the caller (each is [x, y]) */
  const WINDOWS = [[30, 1130], [120, 1130], [210, 1130], [870, 1130], [960, 1130], [1050, 1130], [30, 1300], [120, 1300], [210, 1300], [870, 1300], [960, 1300], [1050, 1300]];
  function windows(c, n, ox = 0) { WINDOWS.forEach(([x, y], i) => { c.fillStyle = i < n ? '#e0a650' : '#2b2822'; c.beginPath(); c.roundRect(x - 26 + ox, y, 52, 110, [26, 26, 0, 0]); c.fill(); }); }

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

  return { C, hall, windows, chamber, dais, council, dial, needle, plate, mic, backView, envelope, stampMark, gavel, block, chair, table };
})();
