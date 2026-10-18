// The kit for "The Day After" (Coxon 7): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline.
// One question: AI insiders reportedly expect a disaster within a year — what is the industry getting ready? The answer
// is paperwork for afterwards. The look is a US city at night in card, whose four districts (banks, the internet,
// power, water) can be switched off one by one; then the briefing room from The Chair Is Taken (the same panelled
// wall and clock, CT), set and waiting; then the emergency box whose plate says OPEN THE DAY AFTER, with Kill Switch's
// sticky note stuck to its glass. Ochre light and one red are the only loud colours.
//   Times come from window.FILM_PLAN (pipeline/plan.mjs): DY.at('dy_fuse', 'list') is the moment the caption's second
//   line starts, in the shot's own seconds — so the breakers drop as the words do, in every language.
window.DY = (() => {
  const { K, W, H, sheet, sprite, put, glow } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.43 };
  const at = (id, name, dflt = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? dflt : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const C = {
    sky0: '#06090d', sky1: '#0b131b', sky2: '#14202c', moon: '#e9dcb4', bld0: '#10171e', bld1: '#162029', bld2: '#1e2b36', edge: '#2a3a47',
    win: '#e0a650', winD: '#1a222a', red: '#c9342b', redD: '#8f2018', redL: '#e8574a', green: '#3fae6a', steel: '#5d676f', steelD: '#373f45', steelL: '#8a949b',
    cream: '#ebe1c7', creamD: '#c9bc9c', ink: '#15120f', yellow: '#fbe55c', yellowD: '#f2d84a', navy: '#1d2c44', navyL: '#2c4060', wood: '#3a2618', woodL: '#5a3a22',
  };
  const ease = { out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3), io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
  function punch(lt, hits = [], { open = 0.05, settle = 0.35, kick = 0.035 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  const JP = '"NotoSansJP-800"';

  // ── the city at night ─────────────────────────────────────────────────────────────────────────────────────────
  const night = () => sheet('dy_night', (g) => {
    const v = g.createLinearGradient(0, 0, 0, 1400); v.addColorStop(0, C.sky0); v.addColorStop(0.6, C.sky1); v.addColorStop(1, C.sky2); g.fillStyle = v; g.fillRect(-90, -90, W + 180, 1500);
    const r = U.rng(31); g.fillStyle = 'rgba(235,225,199,.7)'; for (let i = 0; i < 70; i++) { const x = r() * W, y = 420 + r() * 520; g.fillRect(x, y, 2 + r() * 2, 2 + r() * 2); }
    g.fillStyle = C.moon; g.beginPath(); g.arc(840, 640, 66, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.arc(862, 628, 58, 0, TAU); g.fill();
  }, 6);
  // the four districts, left to right: BANKS · INTERNET · POWER · WATER. Each lists its lit windows, drawn live
  const DIST = [{ x0: 20, x1: 330 }, { x0: 330, x1: 540 }, { x0: 540, x1: 800 }, { x0: 800, x1: 1070 }];
  const WINS = [[], [], [], []];
  { const r = U.rng(77), add = (d, x, y, w = 10, h = 14) => { if (r() < 0.55) WINS[d].push([x, y, w, h]); };
    for (const [a, b, top] of [[40, 150, 760], [170, 290, 840]]) for (let y = top + 24; y < 1120; y += 30) for (let x = a + 12; x < b - 12; x += 22) add(0, x, y);   // bank towers
    for (let y = 1150; y < 1270; y += 28) for (let x = 352; x < 512; x += 20) add(1, x, y, 8, 10);                                                        // the data hall
    for (let y = 980; y < 1270; y += 30) for (let x = 572; x < 768; x += 24) add(2, x, y, 12, 14);                                                        // the power station
    for (const [a, b, top] of [[820, 900, 1150], [910, 1050, 1180]]) for (let y = top + 18; y < 1280; y += 26) for (let x = a + 10; x < b - 10; x += 20) add(3, x, y, 10, 12);   // houses under the tower
  }
  const city = () => sheet('dy_city', (g) => {
    // banks: two towers and a classical bank in front (pediment and columns: the kind of place a balance lives)
    g.fillStyle = C.bld1; g.fillRect(40, 760, 110, 540); g.fillStyle = C.bld0; g.fillRect(170, 840, 120, 460);
    g.fillStyle = C.bld2; g.fillRect(52, 1150, 226, 150); g.beginPath(); g.moveTo(40, 1150); g.lineTo(165, 1080); g.lineTo(290, 1150); g.closePath(); g.fill();
    g.fillStyle = C.bld0; for (let x = 66; x < 280; x += 34) g.fillRect(x, 1166, 14, 120);
    // the internet: a lattice mast with dishes, and the low data hall at its foot
    g.strokeStyle = C.edge; g.lineWidth = 5; g.beginPath(); g.moveTo(400, 1300); g.lineTo(430, 560); g.lineTo(460, 1300); g.stroke();
    g.lineWidth = 3; for (let y = 620; y < 1290; y += 46) { const w = lerp(4, 30, (y - 560) / 740); g.beginPath(); g.moveTo(430 - w, y); g.lineTo(430 + w, y + 46); g.moveTo(430 + w, y); g.lineTo(430 - w, y + 46); g.stroke(); }
    g.fillStyle = C.edge; for (const [y, s] of [[700, -1], [790, 1], [880, -1]]) { g.beginPath(); g.ellipse(430 + s * 24, y, 10, 22, 0, 0, TAU); g.fill(); }
    g.fillStyle = C.bld1; g.fillRect(340, 1130, 180, 170);
    // power: the station, two chimneys, a pylon walking off to the right
    g.fillStyle = C.bld0; g.fillRect(560, 960, 220, 340); g.fillStyle = C.bld1; g.fillRect(588, 780, 44, 190); g.fillRect(668, 740, 44, 230);
    g.strokeStyle = C.edge; g.lineWidth = 4; g.beginPath(); g.moveTo(760, 1300); g.lineTo(790, 900); g.lineTo(820, 1300); g.moveTo(770, 960); g.lineTo(810, 960); g.moveTo(762, 1030); g.lineTo(818, 1030); g.stroke();
    // water: the tower on its legs, its tank, and the houses it serves
    g.strokeStyle = C.bld2; g.lineWidth = 7; g.beginPath(); for (const x of [870, 990]) { g.moveTo(x, 1300); g.lineTo(x + (x < 930 ? 20 : -20), 1000); } g.moveTo(880, 1150); g.lineTo(980, 1150); g.stroke();
    g.fillStyle = C.bld2; g.beginPath(); g.roundRect(856, 880, 148, 120, 18); g.fill(); g.beginPath(); g.moveTo(856, 884); g.lineTo(930, 836); g.lineTo(1004, 884); g.closePath(); g.fill();
    g.fillStyle = C.bld0; g.fillRect(820, 1150, 80, 150); g.fillRect(910, 1180, 140, 120);
    g.fillStyle = '#0b1016'; g.fillRect(-90, 1300, W + 180, 30);                                                                                   // the street
  }, 8);
  /** the city's lights: `on[d]` in 0..1 per district; going off, a district flickers first */
  function lights(c, on, lt, ox = 0) {
    for (let d = 0; d < 4; d++) {
      const k = on[d]; if (k <= 0) continue;
      const fl = k < 1 ? (Math.sin(lt * 63 + d * 7) > 0.2 ? k : k * 0.3) : 1;
      c.save(); c.globalAlpha = fl;
      c.fillStyle = C.win; for (const [x, y, w, h] of WINS[d]) c.fillRect(x + ox, y, w, h);
      if (d === 1) { const b = Math.sin(lt * 4) > 0 ? 1 : 0.25; c.globalAlpha = fl * b; c.fillStyle = C.redL; c.beginPath(); c.arc(430 + ox, 556, 9, 0, TAU); c.fill(); glow(c, 430 + ox, 556, 40, 'rgba(232,87,74,', 0.5 * fl * b); }
      if (d === 3) { glow(c, 930 + ox, 940, 90, 'rgba(255,214,140,', 0.25 * fl); }
      c.restore();
      if (d === 0 || d === 2) glow(c, (DIST[d].x0 + DIST[d].x1) / 2 + ox, 1100, 200, 'rgba(255,200,120,', 0.12 * fl);
    }
  }
  /** a tear-off calendar block: k = pages torn (0..12), the top page lifting off as it goes; month names in English */
  const MONTHS = ['OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT'];
  function pageFace(g, i, w, h) {
    g.fillStyle = C.cream; g.fillRect(-w / 2, 0, w, h); g.fillStyle = C.red; g.fillRect(-w / 2, 0, w, 64);            // the year on the band, the MONTH big
    g.fillStyle = C.cream; g.textAlign = 'center'; g.font = '44px "Anton-400"'; g.fillText(i < 3 ? '2026' : '2027', 0, 48);
    g.fillStyle = i === 12 ? C.red : C.ink; g.font = '118px "Anton-400"'; g.fillText(MONTHS[i], 0, 196);
  }
  function calendar(c, x, y, k, lt) {
    const w = 220, h = 260, n = Math.min(12, Math.floor(k)), f = k - n;
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-w / 2 + 12, 16, w, h);
    c.save(); pageFace(c, Math.min(12, n + 1), w, h); c.restore();                                                     // the page underneath
    if (n < 12) { c.save(); const lift = ease.out(f); c.translate(lift * 220, -lift * 260 + lift * lift * 120); c.rotate(lift * 0.9); c.globalAlpha = 1 - lift * 0.6; pageFace(c, n, w, h); c.restore(); }
    c.fillStyle = C.steelD; c.fillRect(-w / 2 - 6, -14, w + 12, 22); c.fillStyle = C.steelL; for (let i = -3; i <= 3; i++) { c.beginPath(); c.arc(i * 30, -3, 5, 0, TAU); c.fill(); }
    c.restore();
  }
  /** a utility pole for the calendar to hang on: a paper pole, a crossbar, a sagging wire */
  const pole = () => sheet('dy_pole', (g) => {
    g.fillStyle = '#1c140e'; g.fillRect(170, 640, 34, 1400); g.fillRect(90, 700, 200, 18);
    g.strokeStyle = 'rgba(10,8,6,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-90, 760); g.quadraticCurveTo(100, 820, 290, 712); g.moveTo(100, 712); g.quadraticCurveTo(600, 860, W + 90, 760); g.stroke();
  }, 10);

  // ── the fuse box: four breakers, one a district ───────────────────────────────────────────────────────────────
  const boxBody = () => sprite('dy_fusebody', 860, 640, 430, 320, (g) => {
    g.fillStyle = C.steelD; g.beginPath(); g.roundRect(-400, -300, 800, 600, 18); g.fill();
    g.fillStyle = C.steel; g.beginPath(); g.roundRect(-380, -280, 760, 560, 12); g.fill();
    g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(-380, -280, 760, 10);
    g.fillStyle = C.yellow; g.fillRect(-380, -280, 760, 70); g.fillStyle = C.ink; for (let x = -380; x < 380; x += 50) { g.beginPath(); g.moveTo(x, -210); g.lineTo(x + 25, -210); g.lineTo(x + 50, -280); g.lineTo(x + 25, -280); g.closePath(); g.fill(); }
    g.fillStyle = C.ink; g.beginPath(); g.roundRect(-150, -268, 300, 46, 8); g.fill(); g.fillStyle = C.yellow; g.font = '32px "Anton-400"'; g.textAlign = 'center'; g.fillText('MAIN BREAKERS', 0, -233);
    for (let i = 0; i < 4; i++) { const x = -270 + i * 180; g.fillStyle = C.steelD; g.beginPath(); g.roundRect(x - 54, -150, 108, 270, 10); g.fill(); g.fillStyle = '#1b2024'; g.beginPath(); g.roundRect(x - 18, -120, 36, 210, 8); g.fill(); }
  }, 12);
  /** the breakers: lever[i] 0 = up (on, green), 1 = down (off, red); labels from the copy, in the master's language */
  function breakers(c, x, y, lever, lt) {
    const labels = [ui('banks', 'BANKS'), ui('internet', 'INTERNET'), ui('power', 'POWER'), ui('water', 'WATER')];
    for (let i = 0; i < 4; i++) {
      const bx = x - 270 + i * 180, k = lever[i], ly = y + lerp(-90, 50, k);
      c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.roundRect(bx - 36 + 6, ly - 30 + 10, 72, 60, 10); c.fill();
      c.fillStyle = k > 0.5 ? C.red : '#dfe5e8'; c.beginPath(); c.roundRect(bx - 36, ly - 30, 72, 60, 10); c.fill();
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(bx - 36, ly + 18, 72, 12);
      const led = k > 0.5 ? C.redL : C.green; c.fillStyle = led; c.beginPath(); c.arc(bx, y - 182, 11, 0, TAU); c.fill(); glow(c, bx, y - 182, 34, k > 0.5 ? 'rgba(232,87,74,' : 'rgba(63,174,106,', 0.55);
      c.fillStyle = C.cream; c.beginPath(); c.roundRect(bx - 80, y + 150, 160, 54, 6); c.fill();
      const lab = labels[i]; let fs = 34; const font = (s) => `${s}px "Anton-400", ${JP}`; c.font = font(fs); while (c.measureText(lab).width > 146 && fs > 18) { fs -= 2; c.font = font(fs); }
      c.fillStyle = C.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lab, bx, y + 178); c.textBaseline = 'alphabetic';
    }
  }

  // ── the briefing room (the Chair Is Taken's panelled wall and clock, CT) ─────────────────────────────────────
  const podium = () => sprite('dy_podium', 520, 720, 260, 700, (g) => {
    g.fillStyle = C.wood; g.beginPath(); g.moveTo(-210, -560); g.lineTo(210, -560); g.lineTo(180, 0); g.lineTo(-180, 0); g.closePath(); g.fill();
    g.fillStyle = C.woodL; g.beginPath(); g.moveTo(-240, -600); g.lineTo(240, -600); g.lineTo(226, -556); g.lineTo(-226, -556); g.closePath(); g.fill();
    g.fillStyle = C.navy; g.beginPath(); g.roundRect(-150, -470, 300, 250, 12); g.fill();
    g.fillStyle = C.cream; g.beginPath(); g.arc(0, -370, 56, Math.PI, 0); g.fill(); g.fillRect(-70, -372, 140, 10); g.fillRect(-6, -446, 12, 26);   // a dome, in card
    for (let x = -50; x <= 50; x += 20) g.fillRect(x - 3, -362, 6, 34); g.fillRect(-74, -330, 148, 10);
    g.fillStyle = C.cream; g.textAlign = 'center'; g.font = '30px "Anton-400"'; g.fillText('BRIEFING', 0, -280); g.font = '22px "ArchivoBlack-400"'; g.fillText('FOR CONGRESS', 0, -246);
  }, 12);
  const glass = () => sprite('dy_glass', 80, 130, 40, 120, (g) => {
    g.fillStyle = 'rgba(200,225,240,.35)'; g.beginPath(); g.moveTo(-26, -100); g.lineTo(26, -100); g.lineTo(20, 0); g.lineTo(-20, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(160,200,230,.45)'; g.beginPath(); g.moveTo(-23, -64); g.lineTo(23, -64); g.lineTo(20, 0); g.lineTo(-20, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-18, -96, 5, 90);
  }, 6);
  const seat = () => sprite('dy_seat', 220, 330, 110, 320, (g) => {
    g.fillStyle = '#1d2a33'; g.beginPath(); g.roundRect(-90, -300, 180, 210, [40, 40, 8, 8]); g.fill();
    g.fillStyle = '#26363f'; g.beginPath(); g.roundRect(-78, -288, 156, 180, [32, 32, 6, 6]); g.fill();
    g.fillStyle = '#111a20'; g.fillRect(-8, -90, 16, 90); g.fillRect(-70, -12, 140, 12);
  }, 8);
  /** the chamber clock's second hand, ticking (CT's wall has the clock at 540, 620) */
  function second(c, lt, ox = 0) { const a = (Math.floor(lt) / 60) * TAU - Math.PI / 2; c.strokeStyle = C.red; c.lineWidth = 3; c.beginPath(); c.moveTo(540 + ox, 620); c.lineTo(540 + ox + Math.cos(a) * 50, 620 + Math.sin(a) * 50); c.stroke(); }
  const binder = () => sprite('dy_binder', 420, 520, 210, 260, (g) => {
    g.fillStyle = C.navy; g.beginPath(); g.roundRect(-180, -230, 360, 460, 14); g.fill(); g.fillStyle = C.navyL; g.fillRect(-180, -230, 40, 460);
    g.fillStyle = C.cream; g.beginPath(); g.roundRect(-110, -150, 260, 190, 8); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.font = '48px "Anton-400"'; g.fillText('RULES', 20, -86); g.font = '26px "ArchivoBlack-400"'; g.fillText('FOR THE', 20, -46); g.font = '40px "Anton-400"'; g.fillText('DAY AFTER', 20, 6);
  }, 10);
  /** the open binder's page: the rules for the day after, one of them about to be marked */
  function page(c, x, y, lt, kHi, kType) {
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(-380 + 16, -520 + 22, 760, 1040);
    c.fillStyle = C.cream; c.fillRect(-380, -520, 760, 1040); c.fillStyle = 'rgba(0,0,0,.05)'; for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-330, -360 + i * 360, 18, 0, TAU); c.fill(); }
    c.fillStyle = C.ink; c.textAlign = 'left'; c.font = '64px "Anton-400"'; c.fillText('RULES FOR THE DAY AFTER', -290, -400);
    c.fillRect(-290, -370, 600, 5);
    const r = U.rng(9), rows = 7, row = 4;
    for (let i = 0; i < rows; i++) {
      const ry = -280 + i * 104; c.fillStyle = C.ink; c.font = '40px "Anton-400"'; c.fillText(`${i + 1}.`, -290, ry + 14);
      if (i === row) continue;
      c.fillStyle = 'rgba(21,18,15,.3)'; c.fillRect(-220, ry - 6, 360 + r() * 180, 16); c.fillRect(-220, ry + 26, 200 + r() * 160, 12);
    }
    const ry = -280 + row * 104, txt = 'REQUIRED KILL SWITCH', n = Math.floor(clamp(kType, 0, 1) * txt.length);
    if (kHi > 0) { c.fillStyle = 'rgba(251,229,92,.75)'; c.fillRect(-232, ry - 40, 560 * ease.out(kHi), 64); }
    c.fillStyle = C.red; c.font = '52px "Anton-400"'; c.fillText(txt.slice(0, n), -220, ry + 16);
    c.restore();
  }

  // ── the emergency box: the real switch, behind glass, for afterwards; the sticky note on the glass, for now ──
  function note(c, x, y, s, rot) {                         // Kill Switch's sticky note, the same drawing in card
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    const N = 300, r = U.rng(12);
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 22; c.shadowOffsetX = 10; c.shadowOffsetY = 16; c.fillStyle = C.yellow; c.fillRect(-N / 2, -N / 2, N, N); c.restore();
    c.fillStyle = C.yellowD; c.fillRect(-N / 2, -N / 2, N, 46);
    c.fillStyle = '#fff3a6'; c.beginPath(); c.moveTo(N / 2, N / 2 - 64); c.lineTo(N / 2 - 64, N / 2); c.lineTo(N / 2 - 58, N / 2 - 58); c.closePath(); c.fill();
    const cx = 0, cy = 8, R = 72;
    c.save(); c.beginPath(); c.ellipse(cx, cy, R, R * 0.62, 0, 0, TAU); c.clip(); c.lineCap = 'round';
    for (let k = -R * 2; k < R * 2; k += 8) { c.strokeStyle = `rgba(214,30,40,${0.6 + r() * 0.2})`; c.lineWidth = 8 + r() * 2; c.beginPath(); c.moveTo(cx + k - 46, cy - R); c.lineTo(cx + k + 46, cy + R); c.stroke(); }
    c.restore(); c.strokeStyle = 'rgba(30,24,30,.92)'; c.lineWidth = 4; c.lineCap = 'round';
    for (let pass = 0; pass < 2; pass++) { c.beginPath(); for (let a = 0; a <= TAU + 0.3; a += 0.05) { const w = 1 + (r() - 0.5) * 0.03; c.lineTo(cx + Math.cos(a) * R * w + pass * 2, cy + Math.sin(a) * R * 0.62 * w); } c.stroke(); }
    c.beginPath(); c.moveTo(cx - R, cy + 3); c.bezierCurveTo(cx - R + 2, cy + 58, cx + R - 2, cy + 58, cx + R, cy + 2); c.stroke();
    c.fillStyle = 'rgba(30,24,30,.92)'; c.textAlign = 'center';
    c.font = '44px "Kalam-700"'; c.save(); c.translate(0, -78); c.rotate(-0.03); c.fillText('KILL SWITCH', 0, 0); c.restore();
    c.font = '33px "Kalam-700"'; c.save(); c.translate(0, 124); c.rotate(0.02); c.fillText('study — due 16 Nov', 0, 0); c.restore();
    c.restore();
  }
  const ebox = () => sprite('dy_ebox', 760, 1000, 380, 500, (g) => {
    g.fillStyle = C.redD; g.beginPath(); g.roundRect(-330, -460, 660, 900, 26); g.fill();
    g.fillStyle = C.red; g.beginPath(); g.roundRect(-310, -440, 620, 860, 20); g.fill();
    g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(-310, -440, 620, 14);
    g.fillStyle = '#2a0d0a'; g.beginPath(); g.roundRect(-250, -230, 500, 560, 14); g.fill();                         // the recess behind the glass
    // the switch inside: a big lever on a striped base
    g.fillStyle = C.yellow; g.fillRect(-170, 120, 340, 150); g.fillStyle = C.ink; for (let x = -170; x < 170; x += 46) { g.beginPath(); g.moveTo(x, 270); g.lineTo(x + 23, 270); g.lineTo(x + 46, 120); g.lineTo(x + 23, 120); g.closePath(); g.fill(); }
    g.fillStyle = C.steelD; g.beginPath(); g.roundRect(-110, 40, 220, 100, 16); g.fill();
    g.strokeStyle = C.steelL; g.lineWidth = 30; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 90); g.lineTo(80, -120); g.stroke();
    g.fillStyle = C.redL; g.beginPath(); g.arc(80, -130, 54, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.arc(64, -146, 18, 0, TAU); g.fill();
    g.fillStyle = C.cream; g.font = '40px "Anton-400"'; g.textAlign = 'center'; g.fillText('KILL SWITCH', 0, -180);
  }, 14);
  /** the glass over the recess: a pale sheet and a streak of reflection */
  function glassFront(c, x, y) {
    c.save(); c.translate(x, y); c.fillStyle = 'rgba(200,225,240,.12)'; c.beginPath(); c.roundRect(-250, -230, 500, 560, 14); c.fill();
    c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.moveTo(-200, -230); c.lineTo(-120, -230); c.lineTo(-260, 120); c.lineTo(-250, -40); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath(); c.roundRect(-250, -230, 500, 560, 14); c.stroke(); c.restore();
  }
  /** the plate on top of the box: IN CASE OF DISASTER / OPEN THE DAY AFTER, its second line stamped on at k */
  function plate(c, x, y, k) {
    c.save(); c.translate(x, y);
    c.fillStyle = C.cream; c.beginPath(); c.roundRect(-290, -170, 580, 140, 10); c.fill(); c.strokeStyle = C.ink; c.lineWidth = 4; c.beginPath(); c.roundRect(-280, -160, 560, 120, 8); c.stroke();
    c.fillStyle = C.ink; c.textAlign = 'center'; c.font = '40px "Anton-400"'; c.fillText('IN CASE OF DISASTER', 0, -112);
    if (k > 0) { const s = lerp(1.6, 1, ease.out(k)); c.save(); c.translate(0, -60); c.scale(s, s); c.globalAlpha = clamp(k * 3, 0, 1); c.fillStyle = C.red; c.font = '48px "Anton-400"'; c.fillText('OPEN THE DAY AFTER', 0, 0); c.restore(); }
    c.restore();
  }
  return { C, at, dur, ui, ease, punch, night, city, lights, calendar, pole, boxBody, breakers, podium, glass, seat, second, binder, page, note, ebox, glassFront, plate, FP };
})();
