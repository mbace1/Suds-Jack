// The kit for "Unexpectedly, a Deer" (Toko thinker #1) — built on RFP (the papercut box).
// A Kallio flat at dusk: the big window with the city and a tram behind rain, the sofa, the
// rug, the shelf with the camera, the coat rack in the hall. The hound is a Finnish hound —
// tan, black saddle, white chest, long legs: the dog a camera could take for a deer. It is a
// body and four legs (so it can trot), a head that tilts, and a curled sleeping pose.
window.DR = (() => {
  const { K, W, H, sheet, sprite, put, glow, ledAt } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const C = { wall: '#2a302a', wallD: '#20251f', trim: '#3a3a30', floor: '#2a1d15', floorL: '#33241a', rug: '#7a3a22', rugL: '#9a4a28',
    sofa: '#2c4038', sofaD: '#203029', tan: '#b4733a', tanD: '#8a5428', saddle: '#2a2018', white: '#d8c8a8', nose: '#15120f', glass: '#1b2430' };
  const WX0 = 170, WX1 = 910, WY0 = 360, WY1 = 1090;                        // the window

  /** outside the window: the dusk, Kallio's roofs and the church tower */
  const city = () => sheet('dr_city', (g) => {
    const bands = ['#141a1e', '#1a2026', '#242628', '#3a2e26', '#5a3a26', '#7a4a2a'];
    bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, -90 + i * 190 + (i ? 280 : 0), W + 180, H); });
    g.fillStyle = '#121416';
    g.beginPath(); g.moveTo(-90, 1000); for (const [x, y] of [[120, 1000], [120, 930], [260, 930], [260, 960], [380, 960], [380, 900], [470, 900], [470, 950], [660, 950], [660, 910], [800, 910], [800, 970], [1170, 970]]) g.lineTo(x, y); g.lineTo(1170, 1200); g.lineTo(-90, 1200); g.closePath(); g.fill();
    // Kallio church: the granite tower with its steep cap
    g.beginPath(); g.moveTo(560, 950); g.lineTo(560, 700); g.lineTo(590, 640); g.lineTo(620, 700); g.lineTo(620, 950); g.closePath(); g.fill();
    g.fillStyle = '#c98a44'; for (const [x, y] of [[150, 950], [300, 975], [410, 930], [700, 935], [840, 990], [880, 990]]) g.fillRect(x, y, 16, 22);
  }, 8);

  /** the room's back wall with the window cut out of it, and the floor */
  const room = () => sheet('dr_room', (g) => {
    g.fillStyle = C.wall; g.beginPath(); g.rect(-90, -90, W + 180, 1500); g.rect(WX0, WY0, WX1 - WX0, WY1 - WY0); g.fill('evenodd');
    g.fillStyle = 'rgba(255,240,210,.03)'; for (let x = -90; x < W + 90; x += 70) g.fillRect(x, -90, 28, 1500);
    g.fillStyle = C.trim; g.fillRect(WX0 - 24, WY0 - 24, WX1 - WX0 + 48, 24); g.fillRect(WX0 - 24, WY1, WX1 - WX0 + 48, 36); g.fillRect(WX0 - 24, WY0, 24, WY1 - WY0); g.fillRect(WX1, WY0, 24, WY1 - WY0);
    g.fillRect((WX0 + WX1) / 2 - 10, WY0, 20, WY1 - WY0); g.fillRect(WX0, 640, WX1 - WX0, 16);   // mullions
    g.fillStyle = C.floor; g.fillRect(-90, 1400, W + 180, H); g.fillStyle = C.floorL; for (let y = 1430; y < H; y += 60) g.fillRect(-90, y, W + 180, 4);
    g.fillStyle = C.trim; g.fillRect(-90, 1384, W + 180, 22);
  }, 14);

  /** rain on the glass: short pale streaks, falling, clipped to the window */
  function rain(c, lt, ox = 0) {
    c.save(); c.beginPath(); c.rect(WX0 + ox, WY0, WX1 - WX0, WY1 - WY0); c.clip();
    c.strokeStyle = 'rgba(200,210,215,.22)'; c.lineWidth = 2; c.beginPath(); const r = U.rng(7);
    for (let i = 0; i < 70; i++) { const x = WX0 + r() * (WX1 - WX0) + ox, y = WY0 + ((lt * 260 * (0.6 + r() * 0.6) + r() * 900) % 800) - 40; c.moveTo(x, y); c.lineTo(x - 3, y + 26); } c.stroke();
    c.restore();
  }
  /** the tram outside: a lit band sliding across behind the rain */
  const tram = () => sprite('dr_tram', 760, 140, 380, 70, (g) => {
    g.fillStyle = '#1c2a24'; g.beginPath(); g.roundRect(-360, -60, 720, 120, 24); g.fill();
    g.fillStyle = '#e8c46a'; for (let i = 0; i < 9; i++) g.fillRect(-330 + i * 74, -36, 54, 40);
    g.fillStyle = '#2f5a3e'; g.fillRect(-360, 30, 720, 14);
  }, 6);

  const sofaBack = () => sprite('dr_sofaback', 620, 300, 310, 280, (g) => { g.fillStyle = C.sofaD; g.beginPath(); g.roundRect(-290, -260, 580, 280, 40); g.fill(); g.fillStyle = C.sofa; for (const x of [-150, 150]) { g.beginPath(); g.roundRect(x - 130, -230, 260, 210, 30); g.fill(); } }, 12);
  const sofaFront = () => sprite('dr_sofafront', 680, 300, 340, 40, (g) => {
    g.fillStyle = C.sofa; g.beginPath(); g.roundRect(-300, -20, 600, 120, 26); g.fill();
    g.fillStyle = C.sofaD; for (const x of [-330, 270]) { g.beginPath(); g.roundRect(x, -110, 60, 240, 26); g.fill(); }
    g.fillStyle = '#1a140f'; for (const x of [-290, 270]) g.fillRect(x, 120, 20, 40);
  }, 12);
  const rug = () => sprite('dr_rug', 860, 220, 430, 110, (g) => { g.fillStyle = C.rug; g.beginPath(); g.ellipse(0, 0, 410, 96, 0, 0, TAU); g.fill(); g.strokeStyle = C.rugL; g.lineWidth = 10; g.beginPath(); g.ellipse(0, 0, 360, 74, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(0, 0, 250, 46, 0, 0, TAU); g.stroke(); }, 6);
  const lamp = () => sprite('dr_lamp', 260, 900, 130, 880, (g) => {
    g.fillStyle = '#1a140f'; g.fillRect(-6, -760, 12, 760); g.beginPath(); g.ellipse(0, 0, 70, 14, 0, 0, TAU); g.fill();
    g.fillStyle = K.ochre; g.beginPath(); g.moveTo(-80, -740); g.lineTo(80, -740); g.lineTo(54, -850); g.lineTo(-54, -850); g.closePath(); g.fill();
  }, 10);
  /** the shelf, a few books, and the camera with its red light */
  const shelf = () => sprite('dr_shelf', 340, 260, 170, 200, (g) => {
    g.fillStyle = '#3a2618'; g.fillRect(-160, 0, 320, 20); g.fillStyle = '#2a1c12'; g.fillRect(-150, 20, 14, 30); g.fillRect(136, 20, 14, 30);
    const r = U.rng(3); for (let i = 0; i < 6; i++) { g.fillStyle = ['#5a3a26', '#3a4a3c', '#6a5038', '#2e3a44'][i % 4]; const h = 110 + r() * 50; g.fillRect(-150 + i * 26, -h, 22, h); }
  }, 8);
  const camera = () => sprite('dr_cam', 140, 170, 70, 150, (g) => {
    g.fillStyle = '#e8e2d4'; g.beginPath(); g.roundRect(-40, -140, 80, 140, 34); g.fill();
    g.fillStyle = '#15120f'; g.beginPath(); g.arc(0, -96, 26, 0, TAU); g.fill(); g.fillStyle = '#2e4a5e'; g.beginPath(); g.arc(-6, -102, 9, 0, TAU); g.fill();
  }, 6);
  function cam(c, x, y, lt, on = 1) { put(c, camera(), x, y, { lift: 1.2 }); ledAt(c, x, y - 40, 7, on * (Math.floor(lt * 2.5) % 2 ? 1 : 0.35)); }

  // ── the hound ──────────────────────────────────────────────────────────
  const body = () => sprite('dr_dogbody', 520, 300, 260, 170, (g) => {
    g.fillStyle = C.tan; g.beginPath(); g.moveTo(-170, -40); g.quadraticCurveTo(-150, -110, -40, -112); g.quadraticCurveTo(80, -118, 160, -96); g.quadraticCurveTo(200, -80, 196, -30); g.quadraticCurveTo(190, 20, 140, 26); g.quadraticCurveTo(20, 10, -100, 30); g.quadraticCurveTo(-180, 30, -170, -40); g.fill();
    g.fillStyle = C.saddle; g.beginPath(); g.moveTo(-120, -100); g.quadraticCurveTo(-20, -126, 120, -104); g.quadraticCurveTo(110, -50, 0, -54); g.quadraticCurveTo(-90, -50, -120, -100); g.fill();   // the black saddle
    g.fillStyle = C.white; g.beginPath(); g.moveTo(160, -40); g.quadraticCurveTo(200, -10, 170, 26); g.quadraticCurveTo(140, 20, 136, -4); g.fill();                                                       // the white chest
    g.strokeStyle = C.tanD; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(-168, -50); g.quadraticCurveTo(-230, -110, -210, -170); g.stroke();                                        // the tail, carried up
  }, 10);
  const head = () => sprite('dr_doghead', 280, 260, 60, 150, (g) => {
    g.fillStyle = C.tan; g.beginPath(); g.moveTo(-20, 40); g.lineTo(10, -60); g.quadraticCurveTo(40, -120, 110, -116); g.lineTo(190, -84); g.quadraticCurveTo(206, -64, 186, -50); g.lineTo(110, -44); g.quadraticCurveTo(70, 0, 40, 50); g.closePath(); g.fill();   // neck, skull, long muzzle
    g.fillStyle = C.white; g.beginPath(); g.moveTo(186, -50); g.lineTo(110, -46); g.lineTo(120, -62); g.lineTo(190, -66); g.fill();
    g.fillStyle = C.nose; g.beginPath(); g.arc(194, -76, 10, 0, TAU); g.fill(); g.beginPath(); g.arc(110, -92, 6, 0, TAU); g.fill();     // nose and eye
    g.fillStyle = C.tanD; g.beginPath(); g.moveTo(66, -104); g.quadraticCurveTo(30, -60, 50, 10); g.quadraticCurveTo(80, -20, 92, -96); g.closePath(); g.fill();   // the long ear
  }, 8);
  const leg = (back) => sprite('dr_dogleg_' + back, 60, 190, 30, 10, (g) => { g.fillStyle = back ? C.tanD : C.tan; g.beginPath(); g.roundRect(-13, -10, 26, 150, 12); g.fill(); g.fillStyle = C.white; g.beginPath(); g.roundRect(-14, 110, 30, 46, 12); g.fill(); }, 5);
  /** the hound at (x, ground y), facing dir (1 right, -1 left); trot 0..1 swings the legs at phase t; tilt turns the head */
  function dog(c, x, y, s, { dir = 1, t = 0, trot = 0, tilt = 0, look = 0, lift = 1.4 } = {}) {
    c.save(); c.translate(x, y); c.scale(s * dir, s);
    const bob = trot * Math.abs(Math.sin(t * 9)) * 6, sw = (k) => trot * Math.sin(t * 9 + k) * 0.5;
    for (const [lx, k, back] of [[-120, Math.PI, true], [130, 0, true]]) put(c, leg(true), lx, -150 - bob, { rot: sw(k), lift });   // the far legs, darker
    put(c, body(), 0, -150 - bob, { lift });
    for (const [lx, k] of [[-100, 0], [150, Math.PI]]) put(c, leg(false), lx, -150 - bob, { rot: sw(k), lift });
    put(c, head(), 150, -230 - bob, { rot: -0.15 + tilt + look, lift });
    c.restore();
  }
  /** curled up asleep on the rug, breathing */
  const sleeping = () => sprite('dr_dogsleep', 460, 220, 230, 180, (g) => {
    g.fillStyle = C.tan; g.beginPath(); g.ellipse(0, -70, 190, 80, 0, 0, TAU); g.fill();
    g.fillStyle = C.saddle; g.beginPath(); g.ellipse(-20, -112, 140, 40, -0.05, Math.PI, TAU); g.fill();
    g.fillStyle = C.tan; g.beginPath(); g.ellipse(150, -40, 90, 46, 0.2, 0, TAU); g.fill();                     // the head, down on the paws
    g.fillStyle = C.white; g.beginPath(); g.ellipse(200, -12, 70, 20, 0.1, 0, TAU); g.fill();
    g.fillStyle = C.tanD; g.beginPath(); g.ellipse(120, -50, 30, 56, 0.6, 0, TAU); g.fill();                     // the ear over the eye
    g.fillStyle = C.nose; g.beginPath(); g.arc(236, -30, 9, 0, TAU); g.fill();
    g.strokeStyle = C.tanD; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(-180, -40); g.quadraticCurveTo(-120, 10, 40, 4); g.stroke();   // the tail round
  }, 10);
  function asleep(c, x, y, s, lt, lift = 1.2) { put(c, sleeping(), x, y, { sc: s * (1 + Math.sin(lt * 2.2) * 0.012), lift }); }

  /** the camera's brackets round something, and the label it gives it */
  function brackets(c, x0, y0, x1, y1, k = 1, col = '#ff6a50') {
    const L = 46 * k; c.strokeStyle = col; c.lineWidth = 6; c.beginPath();
    for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { c.moveTo(x + sx * L, y); c.lineTo(x, y); c.lineTo(x, y + sy * L); }
    c.stroke();
  }
  function label(c, text, x, y, k = 1) {
    if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k); c.font = '46px "Anton-400"'; const w = c.measureText(text).width + 36;
    c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 10; c.shadowOffsetX = 5; c.shadowOffsetY = 8; c.fillStyle = '#ff6a50'; c.beginPath(); c.roundRect(-w / 2, -40, w, 64, 6); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.textAlign = 'center'; c.fillText(text, 0, 10); c.restore();
  }

  /** the coat rack: a pole, a foot, and hooks that curve up — they are the antlers */
  const rack = () => sprite('dr_rack', 340, 1100, 170, 1080, (g) => {
    g.fillStyle = '#3a2618'; g.fillRect(-10, -1000, 20, 1000); g.beginPath(); g.ellipse(0, 0, 110, 18, 0, 0, TAU); g.fill();
    g.strokeStyle = '#3a2618'; g.lineWidth = 14; g.lineCap = 'round';
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, -940); g.quadraticCurveTo(s * 70, -950, s * 90, -1020); g.moveTo(0, -880); g.quadraticCurveTo(s * 110, -880, s * 130, -960); g.stroke(); }
    g.fillStyle = '#5a3a26'; g.beginPath(); g.moveTo(-60, -900); g.quadraticCurveTo(-90, -700, -40, -560); g.lineTo(10, -560); g.quadraticCurveTo(-20, -720, 10, -900); g.fill();   // a coat on a hook
    g.fillStyle = K.rust; g.fillRect(30, -880, 26, 260);                                                                                          // a scarf
  }, 10);

  return { C, WX0, WX1, WY0, WY1, city, room, rain, tram, sofaBack, sofaFront, rug, lamp, shelf, cam, dog, asleep, brackets, label, rack };
})();
