// THAT'S A WEDNESDAY (Coxon, US AI politics) — the kit and its five scenes, the papercut box in CLEAN LIGHT
// (rfp_clean.js), made by the pipeline. One question: should you ask a chatbot when to vote? The chatbot is a
// fairground fortune-teller booth, ASK ME ANYTHING, whose crystal ball types; it names no one. Its answers are paper
// tickets. The polling place is a school gym, open and busy on Tuesday, chained on Wednesday with the stickers in
// the gutter. The twist is MARKS BY HAND (rough.js, as in ml_kit's ml_mark): a red marker strikes WED 4 on a paper
// calendar and circles TUE 3. Plum night, gold bulbs, mint glass, tan brick; the marker is the only red, and there is
// no red-against-blue anywhere (no party colours).
//   wd_booth      the fairground: the booth's ball types; the masked voter asks WHEN DO I VOTE?; on the pop the ball flares
//   wd_answers    ten answers pegged out on two strings; on "29%" three go bad (torn, blotted, yellowed); on
//                 "incomplete, wrong, outdated" they drop, one a word
//   wd_ticket     close on the slot: ELECTION DAY · NOV 4 prints out; a gloved hand tears it off
//   wd_tuesday    Tuesday at the gym: the doors open, a queue goes in, voters come out with stickers; the card says TUE 3
//   wd_wednesday  Wednesday: chained doors, POLLS CLOSED, stickers in the gutter; he arrives with his ticket; a calendar
//                 slaps on the door, the marker strikes WED 4 and circles TUE 3; the end card: ASK YOUR LOCAL ELECTION OFFICE
// Times come from window.FILM_PLAN (pipeline/plan.mjs; cues in papercut/thats-a-wednesday/film.json), so the picture
// hits the words in every language. Every scene is a pure function of the shot's local time.
window.WD = (() => {
  const { K, W, H, sheet, sprite, put, glow } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.43 };
  const at = (id, name, d = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? d : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const ease = { out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3), in: (k) => Math.pow(clamp(k, 0, 1), 2.2), io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
  const pop = (lt, t0, d = 0.3) => (lt < t0 ? 0 : ease.back((lt - t0) / d));
  function punch(lt, hits = [], { open = 0.05, settle = 0.35, kick = 0.035 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  const C = {
    night: ['#120c19', '#160f1f', '#1b1226', '#21162d', '#271a34', '#2e1f3c', '#362444', '#3f2a4c'],
    wheel: '#0d0912', tent: '#d9c9a4', tentS: '#3c2440',
    plum: '#4a2a46', plumD: '#2b182b', plumL: '#6a3d5f', velvet: '#5c2a50', velvetD: '#3b1a35',
    gold: '#e0a83e', goldD: '#a8781f', goldL: '#f6d384', bulb: '#ffdc8c',
    mint: '#a6f0d0', mintD: '#3f9c80', glass: '#0f171b',
    cream: '#efe4c9', creamD: '#d8c9a6', ink: '#17110f', old: '#c6a35e', oldD: '#a8843f', blot: '#1c1420',
    earth: '#21161b', earthL: '#2f2027', saw: '#6a5240',
    coat: '#4f6e5d', ochre: '#e3a33a', sage: '#7c9a7a', red: '#d8402f',
  };
  const FAM = '"Anton-400", "NotoSansJP-800"';
  /** set the biggest font (≤ size) at which text fits maxW */
  function fit(g, text, size, maxW, fam = FAM) { let s = size; g.font = `${s}px ${fam}`; while (g.measureText(text).width > maxW && s > 14) { s -= 2; g.font = `${s}px ${fam}`; } return s; }
  /** two balanced lines from a phrase (a Japanese one stays whole) */
  function split2(text) { const w = text.split(' '); if (w.length < 2) return [text]; let best = null;
    for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(' '), b = w.slice(i).join(' '), d = Math.abs(a.length - b.length); if (!best || d < best[0]) best = [d, [a, b]]; }
    return best[1]; }

  // ── the fairground at night ──────────────────────────────────────────────────────────────────────────────────
  const night = () => sheet('wd_night', (g) => {
    const hz = 1300, st = hz / C.night.length;
    C.night.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-90, i ? i * st : -90); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, i * st + Math.sin(x * 0.006 + i) * 14); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill(); });
    const r = U.rng(21); g.fillStyle = 'rgba(239,228,201,.55)'; for (let i = 0; i < 60; i++) g.fillRect(r() * W, 470 + r() * 420, 2 + r() * 2, 2 + r() * 2);
  }, 6);
  const WHEEL = { x: 250, y: 860, r: 320 };
  /** the far fair: the big wheel's frame, a striped tent, the fence */
  const fair = () => sheet('wd_fair', (g) => {
    const { x, y, r } = WHEEL;
    g.strokeStyle = C.wheel; g.lineWidth = 14; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.lineWidth = 8; g.beginPath(); g.arc(x, y, r * 0.62, 0, TAU); g.stroke();
    g.lineWidth = 5; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
    g.lineWidth = 16; g.beginPath(); g.moveTo(x - 190, 1560); g.lineTo(x, y); g.lineTo(x + 190, 1560); g.stroke();
    g.fillStyle = C.wheel; g.beginPath(); g.arc(x, y, 30, 0, TAU); g.fill();
    // a striped tent on the right, cream and plum
    const tx = 960, ty = 1080;
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? C.tentS : C.tent; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - 200 + i * 50, 1400); g.lineTo(tx - 150 + i * 50, 1400); g.closePath(); g.fill(); }
    g.fillStyle = C.tentS; g.beginPath(); g.moveTo(tx - 214, 1400); for (let i = 0; i <= 8; i++) g.quadraticCurveTo(tx - 189 + i * 50, 1440, tx - 164 + i * 50, 1400); g.lineTo(tx + 214, 1420); g.lineTo(tx - 214, 1420); g.fill();
    g.fillStyle = C.gold; g.beginPath(); g.moveTo(tx, ty - 40); g.lineTo(tx + 18, ty); g.lineTo(tx - 18, ty); g.closePath(); g.fill();
    g.fillStyle = '#140d18'; g.fillRect(-90, 1440, W + 180, 140); g.fillStyle = '#1d1322'; for (let x = -80; x < W + 90; x += 46) g.fillRect(x, 1410, 12, 60);   // the fence
  }, 8);
  /** the wheel's bulbs, turning */
  function wheelLights(c, lt, ox) {
    const { x, y, r } = WHEEL, a0 = lt * 0.12;
    for (let i = 0; i < 24; i++) { const a = a0 + i / 24 * TAU, bx = x + ox + Math.cos(a) * r, by = y + Math.sin(a) * r, on = (Math.floor(lt * 3) + i) % 3 !== 0;
      c.fillStyle = on ? C.bulb : '#6b5236'; c.beginPath(); c.arc(bx, by, 7, 0, TAU); c.fill(); if (on && i % 2) glow(c, bx, by, 26, 'rgba(255,214,140,', 0.35); }
    for (let i = 0; i < 12; i++) { const a = a0 + i / 12 * TAU, gx = x + ox + Math.cos(a) * r, gy = y + Math.sin(a) * r;     // the gondolas hang straight down
      c.fillStyle = C.wheel; c.fillRect(gx - 3, gy, 6, 26); c.beginPath(); c.roundRect(gx - 26, gy + 24, 52, 36, 8); c.fill(); }
  }
  const ground = () => sheet('wd_ground', (g) => {
    g.fillStyle = C.earth; g.fillRect(-90, 1540, W + 180, H); g.fillStyle = C.earthL; g.fillRect(-90, 1540, W + 180, 16);
    const r = U.rng(8); g.fillStyle = 'rgba(214,180,120,.18)'; for (let i = 0; i < 260; i++) g.fillRect(r() * W, 1560 + r() * 360, 3 + r() * 5, 2);   // sawdust
  }, 8);
  /** a string of bulbs on a sagging wire, from (x0,y0) to (x1,y1) */
  function bulbs(c, x0, y0, x1, y1, sag, n, lt, ox, seed = 1) {
    c.strokeStyle = 'rgba(8,5,10,.9)'; c.lineWidth = 3; c.beginPath();
    const P = (u) => [lerp(x0, x1, u) + ox, lerp(y0, y1, u) + sag * 4 * u * (1 - u)];
    for (let i = 0; i <= 30; i++) { const [x, y] = P(i / 30); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    for (let i = 1; i < n; i++) { const [x, y] = P(i / n), on = Math.sin(lt * 2.4 + i * 1.7 + seed) > -0.6;
      c.fillStyle = on ? C.bulb : '#7a5a34'; c.beginPath(); c.arc(x, y + 9, 8, 0, TAU); c.fill(); if (on) glow(c, x, y + 9, 34, 'rgba(255,214,140,', 0.32); }
  }

  // ── the booth: ASK ME ANYTHING, a crystal ball that types, a brass ticket slot ───────────────────────────────
  // origin at the middle of its base; it stands 1060 tall
  const BALL = { x: 0, y: -470, r: 96 }, SLOT = { y: -300 };
  const booth = () => { const sign = ui('sign', 'ASK ME ANYTHING');
    return sprite('wd_booth_' + sign, 520, 1120, 260, 1080, (g) => {
      g.fillStyle = C.plumD; g.fillRect(-235, -175, 470, 175); g.fillStyle = C.gold; g.fillRect(-240, -186, 480, 14); g.fillRect(-235, -12, 470, 12);   // the plinth
      g.fillStyle = C.goldD; for (let x = -200; x < 210; x += 100) { g.beginPath(); g.arc(x, -90, 22, 0, TAU); g.fill(); }
      g.fillStyle = C.plum; g.fillRect(-215, -780, 430, 600);                                                                    // the cabinet
      g.fillStyle = C.gold; g.fillRect(-215, -780, 22, 600); g.fillRect(193, -780, 22, 600);
      g.fillStyle = C.glass; g.beginPath(); g.roundRect(-172, -740, 344, 380, [172, 172, 12, 12]); g.fill();                    // the window
      g.fillStyle = C.velvet; g.beginPath(); g.moveTo(-172, -600); g.quadraticCurveTo(-110, -560, -120, -362); g.lineTo(-172, -362); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(172, -600); g.quadraticCurveTo(110, -560, 120, -362); g.lineTo(172, -362); g.closePath(); g.fill();
      g.fillStyle = C.velvetD; g.beginPath(); g.moveTo(-172, -612); g.quadraticCurveTo(0, -560, 172, -612); g.lineTo(172, -650); g.quadraticCurveTo(0, -600, -172, -650); g.closePath(); g.fill();
      g.fillStyle = C.goldD; g.beginPath(); g.moveTo(-60, -362); g.lineTo(60, -362); g.lineTo(34, -392); g.lineTo(-34, -392); g.closePath(); g.fill();   // the ball's stand
      g.strokeStyle = C.gold; g.lineWidth = 12; g.beginPath(); g.roundRect(-178, -746, 356, 392, [178, 178, 14, 14]); g.stroke();
      g.fillStyle = C.gold; g.beginPath(); g.roundRect(-150, SLOT.y - 34, 300, 68, 14); g.fill(); g.fillStyle = C.goldL; g.fillRect(-140, SLOT.y - 28, 280, 6);   // the slot plate
      g.fillStyle = '#0a0608'; g.beginPath(); g.roundRect(-110, SLOT.y - 6, 220, 14, 6); g.fill();
      g.fillStyle = C.plumD; g.beginPath(); g.moveTo(-190, -246); g.lineTo(190, -246); g.lineTo(210, -196); g.lineTo(-210, -196); g.closePath(); g.fill();   // the keyboard shelf
      g.fillStyle = C.creamD; for (let i = 0; i < 9; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(-150 + i * 37 + j * 14, -232 + j * 20, 10, 0, TAU); g.fill(); }
      g.fillStyle = C.plumD; g.beginPath(); g.roundRect(-250, -1040, 500, 270, 34); g.fill();                                   // the marquee
      g.strokeStyle = C.gold; g.lineWidth = 10; g.beginPath(); g.roundRect(-238, -1028, 476, 246, 28); g.stroke();
      const L = split2(sign); g.fillStyle = C.goldL; g.textAlign = 'center'; g.textBaseline = 'middle';
      const fam = '"Rye-400", "NotoSansJP-800"', s = Math.min(...L.map((l) => fit(g, l, 84, 400, fam))); g.font = `${s}px ${fam}`;
      L.forEach((l, i) => g.fillText(l, 0, -905 + (i - (L.length - 1) / 2) * s * 1.08)); g.textBaseline = 'alphabetic';
      g.fillStyle = C.gold; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * TAU, rr = k % 2 ? 16 : 40; g.lineTo(Math.cos(a) * rr, -1066 + Math.sin(a) * rr); } g.closePath(); g.fill();   // the star on top
    }, 12); };
  /** the marquee's bulbs, chasing */
  function marquee(c, x, y, lt, k = 1) {
    for (let i = 0; i < 26; i++) { const u = i / 26; let px, py;
      if (u < 0.35) { px = -232 + u / 0.35 * 464; py = -1034; } else if (u < 0.5) { px = 232; py = -1034 + (u - 0.35) / 0.15 * 246; } else if (u < 0.85) { px = 232 - (u - 0.5) / 0.35 * 464; py = -788; } else { px = -232; py = -788 - (u - 0.85) / 0.15 * 246; }
      const on = (i + Math.floor(lt * 8)) % 3 !== 0; c.fillStyle = on ? C.bulb : '#6e5030'; c.beginPath(); c.arc(x + px, y + py, 8, 0, TAU); c.fill(); if (on && i % 2) glow(c, x + px, y + py, 30, 'rgba(255,214,140,', 0.3 * k); }
  }
  /** the crystal ball: mint glass and, inside it, a chat bubble typing its three dots; kF flares it */
  function ball(c, x, y, lt, kF = 0, s = 1) {
    const { r } = BALL, cx = x + BALL.x * s, cy = y + BALL.y * s, R = r * s, br = 1 + 0.6 * kF;
    glow(c, cx, cy, R * (2.4 + 1.8 * kF), 'rgba(166,240,208,', (0.28 + 0.4 * kF) * (0.9 + 0.1 * Math.sin(lt * 5)));
    const gr = c.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R); gr.addColorStop(0, '#e9fff4'); gr.addColorStop(0.35, C.mint); gr.addColorStop(1, C.mintD);
    c.save(); c.globalAlpha = 0.92; c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill(); c.restore();
    c.save(); c.translate(cx, cy + R * 0.02); c.scale(s * br * 0.9 + 0.1, s * br * 0.9 + 0.1);                // the bubble
    c.fillStyle = 'rgba(250,255,252,.95)'; c.beginPath(); c.roundRect(-58, -36, 116, 66, 26); c.fill(); c.beginPath(); c.moveTo(-34, 26); c.lineTo(-46, 46); c.lineTo(-14, 28); c.closePath(); c.fill();
    const sp = 6 + 10 * kF; for (let i = 0; i < 3; i++) { const b = Math.max(0, Math.sin(lt * sp - i * 0.9)); c.fillStyle = C.mintD; c.beginPath(); c.arc(-28 + i * 28, -3 - b * 9, 9, 0, TAU); c.fill(); }
    c.restore();
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(cx - R * 0.42, cy - R * 0.5, R * 0.2, R * 0.09, -0.6, 0, TAU); c.fill();
    if (kF > 0.02) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(200,255,232,${0.5 * kF})`; c.lineWidth = 4;     // the flare's rays
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + lt * 0.5, r0 = R * 1.15, r1 = R * (1.4 + 0.5 * kF); c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke(); } c.restore(); }
  }
  /** a paper speech bubble with the voter's question; tail at (tx, ty) */
  function speech(c, x, y, text, k, tx, ty) {
    if (k <= 0) return; c.save(); c.translate(x, y); c.scale(k, k);
    c.font = `56px ${FAM}`; const s = fit(c, text, 56, 440), w = c.measureText(text).width + 70, h = 104;
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.roundRect(-w / 2 + 10, -h / 2 + 14, w, h, 22); c.fill();
    c.fillStyle = C.cream; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 22); c.fill();
    c.beginPath(); c.moveTo(-w * 0.22, h / 2 - 2); c.lineTo((tx - x) / k, (ty - y) / k); c.lineTo(-w * 0.04, h / 2 - 2); c.closePath(); c.fill();
    c.fillStyle = C.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `${s}px ${FAM}`; c.fillText(text, 0, 4); c.textBaseline = 'alphabetic';
    c.restore();
  }

  // ── the answers: paper tickets ───────────────────────────────────────────────────────────────────────────────
  const TK = { w: 132, h: 192 };
  function tkEdge(g, w, h) {                          // a ticket's outline: perforated top and bottom
    g.beginPath(); g.moveTo(-w / 2, -h / 2); for (let x = -w / 2; x < w / 2; x += 12) { g.lineTo(x + 6, -h / 2 + 5); g.lineTo(x + 12, -h / 2); }
    g.lineTo(w / 2, h / 2); for (let x = w / 2; x > -w / 2; x -= 12) { g.lineTo(x - 6, h / 2 - 5); g.lineTo(x - 12, h / 2); } g.closePath();
  }
  const ticket = (kind = 'ok') => sprite('wd_tk_' + kind, TK.w, TK.h, TK.w / 2, TK.h / 2, (g) => {
    const { w, h } = TK, paper = kind === 'old' ? C.old : C.cream;
    g.fillStyle = paper; tkEdge(g, w, h); g.fill();
    g.fillStyle = kind === 'old' ? C.oldD : C.gold; g.fillRect(-w / 2, -h / 2 + 10, w, 40);
    g.fillStyle = kind === 'old' ? '#8a6a30' : C.plumD; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * TAU, rr = k % 2 ? 6 : 14; g.lineTo(Math.cos(a) * rr, -h / 2 + 30 + Math.sin(a) * rr); } g.closePath(); g.fill();
    g.fillStyle = kind === 'old' ? 'rgba(80,55,20,.45)' : 'rgba(23,17,15,.55)'; for (let i = 0; i < 4; i++) g.fillRect(-w / 2 + 18, -h / 2 + 76 + i * 26, w - 36 - (i === 3 ? 40 : 0), 9);
    if (kind === 'old') { g.fillStyle = 'rgba(110,70,20,.35)'; g.beginPath(); g.arc(w * 0.22, h * 0.25, 26, 0, TAU); g.fill(); g.beginPath(); g.arc(-w * 0.3, -h * 0.05, 14, 0, TAU); g.fill(); }
  }, 6);
  const peg = () => sprite('wd_peg', 24, 50, 12, 10, (g) => { g.fillStyle = '#b98a52'; g.beginPath(); g.roundRect(-9, -10, 18, 50, 4); g.fill(); g.fillStyle = '#8a6036'; g.fillRect(-9, 8, 18, 4); }, 4);

  // ── the ticket printed for him: ELECTION DAY · NOV 4 ─────────────────────────────────────────────────────────
  const BIG = { w: 380, h: 600 };
  const bigTicket = () => { const head = ui('ticketHead', 'ELECTION DAY'), date = ui('ticketDate', 'NOV 4');
    return sprite('wd_big_' + head + date, BIG.w, BIG.h, BIG.w / 2, 0, (g) => {
      const { w, h } = BIG; g.save(); g.translate(0, h / 2); g.fillStyle = C.cream; tkEdge(g, w, h); g.fill(); g.restore();
      g.fillStyle = C.gold; g.fillRect(-w / 2, 40, w, 96); g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      fit(g, head, 60, w - 50); g.fillText(head, 0, 90);
      g.fillStyle = C.plumD; for (let k = 0; k < 3; k++) { g.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j / 10 * TAU, rr = j % 2 ? 7 : 16; g.lineTo(-70 + k * 70 + Math.cos(a) * rr, 186 + Math.sin(a) * rr); } g.closePath(); g.fill(); }
      g.fillStyle = C.ink; fit(g, date, 190, w - 50); g.fillText(date, 0, 360);
      g.fillStyle = 'rgba(23,17,15,.35)'; for (let i = 0; i < 3; i++) g.fillRect(-w / 2 + 40, 480 + i * 26, w - 80 - (i === 2 ? 90 : 0), 9);
      g.textBaseline = 'alphabetic';
    }, 10); };

  // ── the school gym, Tuesday (open, warm) and Wednesday (chained, cold) ───────────────────────────────────────
  const GYM = {
    tue: { sky: ['#f7e7bd', '#f2dcaa', '#ecd29a', '#e6c88c', '#e2c084'], tree: '#7d8f5c', treeD: '#62764a', brick: '#c79a6a', brickD: '#b0845a', brickL: '#d8b080', mortar: '#e6d2a8',
      band: '#3b3029', cope: '#ece0c4', win: '#f2cf78', winF: '#5c4a3a', door: '#5f7f62', doorD: '#46614b', awn: '#efe4c9', walk: '#d2c5a8', walkD: '#b8ab8e', curb: '#a0957f', road: '#5b5650' },
    wed: { sky: ['#8e8aa0', '#98949f', '#a4a0b0', '#afabba', '#bab6c3'], tree: '#596260', treeD: '#474f4d', brick: '#9a8579', brickD: '#86736a', brickL: '#a8958a', mortar: '#b9ada6',
      band: '#2b292e', cope: '#c4beba', win: '#6d6e7e', winF: '#3a383f', door: '#4d6357', doorD: '#394a41', awn: '#c7c1bb', walk: '#a9a49e', walkD: '#94908a', curb: '#827d78', road: '#46444a' },
  };
  const G = { x0: 70, x1: 1010, top: 820, base: 1470, dx0: 400, dx1: 680, dtop: 1140 };
  const gymSky = (m) => sheet('wd_gsky_' + m, (g) => {
    const P = GYM[m], st = 1000 / P.sky.length;
    P.sky.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-90, i ? i * st : -90); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, i * st + Math.sin(x * 0.006 + i) * 12); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill(); });
    if (m === 'tue') { g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(860, 600, 74, 0, TAU); g.fill(); }
    else { g.fillStyle = 'rgba(112,107,128,.55)'; for (const [x, y, rx] of [[180, 600, 220], [420, 650, 180], [760, 580, 260], [980, 660, 160]]) { g.beginPath(); g.ellipse(x, y, rx, 54, 0, 0, TAU); g.fill(); } }
    const r = U.rng(5); for (let i = 0; i < 15; i++) { const x = -60 + i * 82, y = 820 + r() * 30, rr = 58 + r() * 40; g.fillStyle = i % 2 ? P.tree : P.treeD; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
  }, 6);
  const gym = (m) => sheet('wd_gym_' + m, (g) => {
    const P = GYM[m], { x0, x1, top, base, dx0, dx1, dtop } = G;
    g.fillStyle = P.mortar; g.fillRect(x0, top, x1 - x0, base - top);
    const r = U.rng(m === 'tue' ? 11 : 12);
    for (let y = top + 122, row = 0; y < base; y += 26, row++) for (let x = x0 - (row % 2) * 30; x < x1; x += 60) {
      const k = r(); g.fillStyle = k < 0.22 ? P.brickD : k > 0.86 ? P.brickL : P.brick; const a = Math.max(x0, x + 2), b = Math.min(x1, x + 58); if (b > a) g.fillRect(a, y + 2, b - a, Math.min(22, base - y - 2));
    }
    g.fillStyle = P.cope; g.fillRect(x0 - 22, top - 18, x1 - x0 + 44, 24);                                         // the parapet, and GYM over the doors
    g.fillStyle = P.band; g.fillRect(x0, top + 6, x1 - x0, 116); g.fillStyle = P.cope; g.font = '100px "Anton-400"'; g.textAlign = 'center'; g.fillText('GYM', 540, top + 104);
    for (let i = 0; i < 6; i++) { const wx = x0 + 52 + i * 152; g.fillStyle = P.winF; g.fillRect(wx - 6, top + 150, 112, 120); g.fillStyle = P.win; g.fillRect(wx, top + 156, 100, 108);
      g.fillStyle = P.winF; g.fillRect(wx + 47, top + 156, 6, 108); g.fillRect(wx, top + 206, 100, 6); }
    g.fillStyle = P.band; g.fillRect(dx0 - 18, dtop - 18, dx1 - dx0 + 36, base - dtop + 18);                       // the door frame
    g.fillStyle = P.awn; g.fillRect(dx0 - 50, dtop - 60, dx1 - dx0 + 100, 34); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(dx0 - 50, dtop - 26, dx1 - dx0 + 100, 10);
    g.fillStyle = P.walk; g.fillRect(-90, base, W + 180, 92); g.fillStyle = P.walkD; for (let x = -60; x < W + 90; x += 150) g.fillRect(x, base, 4, 92);   // the pavement, the kerb, the road
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(-90, base, W + 180, 8);
    g.fillStyle = P.curb; g.fillRect(-90, base + 92, W + 180, 22); g.fillStyle = P.road; g.fillRect(-90, base + 114, W + 180, H);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-90, base + 114, W + 180, 70);                                     // the gutter
    g.fillStyle = '#2c2a2c'; g.fillRect(800, base + 122, 120, 46); g.fillStyle = P.road; for (let i = 0; i < 6; i++) g.fillRect(808 + i * 19, base + 128, 9, 34);   // a drain
    if (m === 'wed') {                                                                                              // Wednesday: the day after, in the gutter
      const q = U.rng(40);
      for (let i = 0; i < 11; i++) { const sx = 60 + i * 92 + q() * 40, sy = base + 132 + q() * 40; if (sx > 790 && sx < 930) continue; sticker(g, sx, sy, 0.95 + q() * 0.25, (q() - 0.5) * 1.2, q() < 0.3); }
      for (const [sx, sy] of [[470, 34], [560, 58], [650, 30], [760, 62], [850, 44], [330, 66]]) sticker(g, sx + q() * 20, base + sy, 0.85, (q() - 0.5) * 1.4, q() < 0.25);
      g.fillStyle = '#7a5a3a'; for (let i = 0; i < 9; i++) { g.save(); g.translate(q() * W, base + 120 + q() * 70); g.rotate(q() * 3); g.beginPath(); g.ellipse(0, 0, 16, 8, 0, 0, TAU); g.fill(); g.restore(); }
    }
  }, 10);
  /** an I VOTED sticker: a cream oval with an ochre ring and a star (no flag colours); back = face down */
  function sticker(g, x, y, s, rot, back) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(4, 6, 40, 26, 0, 0, TAU); g.fill();
    g.fillStyle = back ? '#e9e1d2' : C.cream; g.beginPath(); g.ellipse(0, 0, 40, 26, 0, 0, TAU); g.fill();
    if (!back) { g.strokeStyle = C.ochre; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 34, 20, 0, 0, TAU); g.stroke();
      g.fillStyle = C.ink; g.font = '17px "Anton-400"'; g.textAlign = 'center'; g.fillText('I VOTED', 0, 6);
      g.fillStyle = C.ochre; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * TAU, rr = k % 2 ? 2.5 : 6; g.lineTo(Math.cos(a) * rr, -12 + Math.sin(a) * rr); } g.closePath(); g.fill(); }
    else { g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-20, 0); g.lineTo(20, 0); g.stroke(); }
    g.restore();
  }
  /** the doors: k = 0 shut, 1 swung open (a warm hall inside); chain = the padlocked chain across the handles */
  function doors(c, m, k, ox, { chain = false } = {}) {
    const P = GYM[m], { dx0, dx1, dtop, base } = G, mid = (dx0 + dx1) / 2, hw = (dx1 - dx0) / 2, hh = base - dtop;
    if (k > 0) { c.fillStyle = '#2a1e16'; c.fillRect(dx0 + ox, dtop, dx1 - dx0, hh); glow(c, mid + ox, dtop + hh * 0.6, 260, 'rgba(255,206,130,', 0.45 * k);
      c.fillStyle = 'rgba(255,214,150,.25)'; c.fillRect(dx0 + ox, base - 60, dx1 - dx0, 60); }
    for (const sd of [-1, 1]) {
      const hinge = sd < 0 ? dx0 : dx1, wq = hw * lerp(1, 0.22, ease.io(k)), x = sd < 0 ? hinge : hinge - wq, sk = 26 * ease.io(k);
      c.fillStyle = k > 0.5 ? P.doorD : P.door; c.beginPath(); c.moveTo(x + ox, dtop - (sd < 0 ? 0 : sk) * 0); c.lineTo(x + wq + ox, dtop + (sd < 0 ? sk : 0)); c.lineTo(x + wq + ox, base + (sd < 0 ? sk * 0.4 : 0)); c.lineTo(x + ox, base); c.closePath(); c.fill();
      if (k < 0.35) { c.fillStyle = 'rgba(210,225,230,.25)'; c.fillRect(x + 28 + ox, dtop + 30, wq - 56, 120); c.fillStyle = '#b8a77a'; c.fillRect(sd < 0 ? x + wq - 30 + ox : x + 14 + ox, dtop + 190, 16, 70); }
    }
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(mid - 2 + ox, dtop, 4, hh * (1 - k));
    if (chain) {
      c.strokeStyle = '#8c8a86'; c.lineWidth = 7; for (let i = 0; i < 9; i++) { const x = mid - 120 + i * 30 + ox, y = dtop + 240 + Math.sin(i / 8 * Math.PI) * 26; c.beginPath(); c.ellipse(x, y, 16, 9, i % 2 ? 0.3 : -0.3, 0, TAU); c.stroke(); }
      c.fillStyle = '#6e6a64'; c.beginPath(); c.roundRect(mid - 30 + ox, dtop + 266, 60, 54, 8); c.fill(); c.strokeStyle = '#8c8a86'; c.lineWidth = 9; c.beginPath(); c.arc(mid + ox, dtop + 266, 20, Math.PI, 0); c.stroke();
      c.fillStyle = '#2a2826'; c.beginPath(); c.arc(mid + ox, dtop + 290, 6, 0, TAU); c.fill(); c.fillRect(mid - 2 + ox, dtop + 290, 4, 14);
    }
  }
  /** the POLLING PLACE board on the wall, left of the doors; its day card is drawn by the scene */
  const BOARD = { x: 236, y: 1150, w: 230, h: 190 };
  const board = (m) => { const t = ui('polling', 'POLLING PLACE');
    return sprite('wd_board_' + m + t, BOARD.w, BOARD.h, BOARD.w / 2, BOARD.h / 2, (g) => {
      const { w, h } = BOARD; g.fillStyle = m === 'tue' ? C.cream : '#d9d3c8'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 10); g.fill();
      g.fillStyle = m === 'tue' ? C.ochre : '#b49a6a'; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, 62, [10, 10, 0, 0]); g.fill();
      g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, t, 40, w - 26); g.fillText(t, 0, -h / 2 + 33); g.textBaseline = 'alphabetic';
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-w / 2 + 20, -h / 2 + 80, w - 40, h - 100);
    }, 8); };
  /** the day card in the board: blank, then flipped (k: 0 → 1) to the day */
  function dayCard(c, ox, k, text) {
    const { x, y, w, h } = BOARD, cy = y + 30, ch = h - 100, sy = Math.abs(Math.cos(clamp(k, 0, 1) * Math.PI)), face = k > 0.5;
    c.save(); c.translate(x + ox, cy); c.scale(1, Math.max(0.04, sy));
    c.fillStyle = face ? '#fffaf0' : '#e2d6bb'; c.beginPath(); c.roundRect(-w / 2 + 24, -ch / 2 + 4, w - 48, ch - 8, 6); c.fill();
    if (face) { c.fillStyle = C.ink; c.textAlign = 'center'; c.textBaseline = 'middle'; fit(c, text, 74, w - 70); c.fillText(text, 0, 6); c.textBaseline = 'alphabetic'; }
    c.restore();
  }
  /** a masked voter (a generic person: a masked Toko); sticker = wearing I VOTED */
  function voter(c, x, y, s, o = {}) {
    const { stick = false, alpha = 1, ...rest } = o; if (alpha <= 0) return;
    c.save(); c.globalAlpha = alpha; RFP.walker(c, x, y, s, { led: false, ...rest });
    if (stick) sticker(c, x - 40 * s, y + 120 * s, s * 0.9, -0.15, false);
    c.restore();
  }

  // ── the calendar, the marker and the end card ────────────────────────────────────────────────────────────────
  const CAL = { x: 540, y: 1105, w: 520, h: 330, rot: -0.03 };
  const CELL = CAL.w / 3;
  const calendar = () => { const head = ui('calHead', 'NOVEMBER 2026'), days = [ui('mon', 'MON'), ui('tue', 'TUE'), ui('wed', 'WED')];
    return sprite('wd_cal_' + head + days.join(), CAL.w, CAL.h, CAL.w / 2, CAL.h / 2, (g) => {
      const { w, h } = CAL; g.fillStyle = '#fbf6ea'; g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = C.ink; g.fillRect(-w / 2, -h / 2, w, 70); g.fillStyle = '#fbf6ea'; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, head, 46, w - 40); g.fillText(head, 0, -h / 2 + 37);
      g.fillStyle = 'rgba(23,17,15,.3)'; for (let i = 1; i < 3; i++) g.fillRect(-w / 2 + i * CELL - 1.5, -h / 2 + 70, 3, h - 70);
      days.forEach((d, i) => { const cx = -w / 2 + (i + 0.5) * CELL; g.fillStyle = C.ink; fit(g, d, 46, CELL - 30); g.fillText(d, cx, -h / 2 + 112); g.font = `150px ${FAM}`; g.fillText(String(i + 2), cx, -h / 2 + 232); });
      g.textBaseline = 'alphabetic';
    }, 10); };
  function tape(c, x, y, rot) { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = 'rgba(236,226,190,.82)'; c.fillRect(-46, -16, 92, 32); c.restore(); }
  // the marks, in the calendar's own coordinates: two strokes strike WED 4, then a ring round TUE 3
  let MARKS = null;
  function marks() {
    if (MARKS) return MARKS;
    const gen = rough.generator(), o = (seed, extra = {}) => ({ seed, roughness: 1.4, bowing: 1.2, stroke: C.red, strokeWidth: 12, ...extra }), wx = CELL, cy = 24;
    const spec = [
      [0, 0.26, gen.line(wx - 66, cy - 100, wx + 70, cy + 118, o(3))],
      [0.32, 0.26, gen.line(wx + 68, cy - 98, wx - 64, cy + 120, o(5))],
      [0.66, 0.62, gen.ellipse(0, cy + 6, 214, 300, o(9, { strokeWidth: 10, roughness: 1.7 }))],
    ];
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    MARKS = spec.map(([t0, d, ...ds]) => {
      const parts = ds.flatMap((dr) => gen.toPaths(dr)).filter((p) => p.d && p.stroke !== 'none').map((p) => { el.setAttribute('d', p.d); return { p: new Path2D(p.d), d: p.d, len: el.getTotalLength(), w: p.strokeWidth || 10 }; });
      return { t0, d, parts, total: parts.reduce((s, q) => s + q.len, 0) };
    });
    return MARKS;
  }
  const PEN = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  /** draw one mark up to k (along its own length); return the pen tip, in calendar coordinates */
  function drawMark(g, m, k) {
    let left = m.total * clamp(k, 0, 1), tip = null;
    for (const q of m.parts) {
      if (left <= 0) break; const run = Math.min(q.len, left); left -= run;
      g.save(); g.strokeStyle = C.red; g.lineWidth = q.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([run, q.len + 10]); g.stroke(q.p); g.restore();
      if (run < q.len || left <= 0) { PEN.setAttribute('d', q.d); const pt = PEN.getPointAtLength(run); tip = [pt.x, pt.y]; }
    }
    return tip;
  }
  /** the marker in a gloved hand: the tip at (x, y), the body running down-right through the fist */
  function marker(g, x, y) {
    const rot = -0.5, ax = Math.sin(-rot), ay = Math.cos(rot);
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = C.red; g.beginPath(); g.moveTo(0, 0); g.lineTo(-11, 28); g.lineTo(11, 28); g.closePath(); g.fill();
    g.fillStyle = '#2a2420'; g.fillRect(-17, 28, 34, 196); g.fillStyle = C.red; g.fillRect(-17, 200, 34, 24); g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(-12, 34, 6, 160); g.restore();
    RFP.fist(g, x + ax * 124, y + ay * 124, 0.64, rot, { sleeve: C.plum, cuff: C.ochre, len: 1500 });
  }
  /** the end card: the real source, in the master's language */
  const endCard = () => { const t = ui('ask', 'ASK YOUR LOCAL|ELECTION OFFICE'), L = t.split('|');
    return sprite('wd_card_' + t, 600, 170, 300, 85, (g) => {
      g.fillStyle = C.cream; g.beginPath(); g.roundRect(-300, -85, 600, 170, 14); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 5; g.beginPath(); g.roundRect(-288, -73, 576, 146, 9); g.stroke();
      g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; const s = Math.min(...L.map((l) => fit(g, l, 60, 520))); g.font = `${s}px ${FAM}`;
      L.forEach((l, i) => g.fillText(l, 0, (i - (L.length - 1) / 2) * s * 1.12 + 2)); g.textBaseline = 'alphabetic';
    }, 10); };
  return { C, at, dur, ui, ease, pop, punch, fit, night, fair, wheelLights, ground, bulbs, booth, BALL, SLOT, marquee, ball, speech, TK, ticket, peg, BIG, bigTicket,
    GYM, G, gymSky, gym, sticker, doors, BOARD, board, dayCard, voter, CAL, CELL, calendar, tape, marks, drawMark, marker, endCard };
})();

// ═══ the scenes ═════════════════════════════════════════════════════════════════════════════════════════════════
(() => {
  const { K, W, H, stack, box, put, glow, sprite } = RFP, D = WD, TAU = Math.PI * 2, { clamp, lerp } = U;
  const VOTER = { coat: D.C.coat, scarf: D.C.ochre, color: K.mag };
  const S = RFM.S;

  // 1 · The question. The fairground at night; the booth's ball types to itself; he steps up and asks, his question
  // rises in a paper bubble, and on "when to vote" the ball flares.
  SCENES['wd_booth'] = { draw(c, lt) {
    const ID = 'wd_booth', tA = D.at(ID, 'ask', 0.9), tB = D.at(ID, 'ball', 1.3), dur = D.dur(ID);
    const kF = lt < tB ? 0 : Math.exp(-(lt - tB) * 1.6) * Math.min(1, (lt - tB) / 0.08), kQ = D.pop(lt, tA, 0.34);
    const cam = { x: Math.sin(lt * 0.35) * 8, y: 0, z: D.punch(lt, [tB]) * lerp(1.0, 1.06, D.ease.io(lt / dur)), fx: 600, fy: 1150 };
    const BX = 650, BY = 1600;
    stack(c, [
      { sh: D.night(), d: 0.03, lift: 0 },
      { sh: D.fair(), d: 0.06, lift: 0.6 },
      { fn: (g, ox) => D.wheelLights(g, lt, ox), d: 0.06 },
      { fn: (g, ox) => { D.bulbs(g, -60, 610, 1140, 650, 90, 16, lt, ox, 1); }, d: 0.12 },
      { sh: D.ground(), d: 0.1, lift: 0 },
      { fn: (g, ox) => {
        put(g, D.booth(), BX + ox, BY, { lift: 1.4 }); D.marquee(g, BX + ox, BY, lt, 1); D.ball(g, BX + ox, BY, lt, kF);
        const step = lt < tA - 0.1 ? Math.sin(lt * 8) : 0, vx = lerp(150, 285, D.ease.out(lt / Math.max(0.3, tA - 0.1)));
        D.voter(g, vx + ox, 1170, 0.92, { ...VOTER, t: lt, step, look: lt > tB ? 0.45 : 0.2, lift: 1.2 });
        D.speech(g, 330 + ox, 900 - 30 * D.ease.out((lt - tA) / 0.5), D.ui('question', 'WHEN DO I VOTE?'), kQ, vx + 40 + ox, 1060);
      }, d: 0.22 },
      { fn: (g, ox) => D.bulbs(g, -100, 520, 1180, 470, 70, 12, lt, ox * 1.4, 3), d: 0.34 },
    ], cam);
    CW.tag(c, D.ui('tagMid', 'US MIDTERMS 2026'), lt, dur);
    box(c);
  } };

  // 2 · The first fact. The booth (cropped, left) pegs its answers out on two strings: ten tickets. On "29%" three go
  // bad one after another — one tears in half, one blots, one yellows — and drop to the sawdust. Seven are left.
  /** the back of the stall behind the strings: dark canvas in two plums, a scalloped valance */
  const stall = () => RFP.sheet('wd_stall', (g) => {
    for (let x = -90, i = 0; x < W + 90; x += 70, i++) { g.fillStyle = i % 2 ? '#2a1a31' : '#22152a'; g.fillRect(x, 470, 70, 1100); }
    g.fillStyle = D.C.plumD; g.fillRect(-90, 440, W + 180, 60); g.fillStyle = D.C.goldD; g.beginPath(); g.moveTo(-90, 500);
    for (let x = -90; x < W + 90; x += 90) g.quadraticCurveTo(x + 45, 556, x + 90, 500); g.lineTo(W + 90, 490); g.lineTo(-90, 490); g.closePath(); g.fill();
    g.fillStyle = '#140d18'; g.fillRect(-90, 1440, W + 180, 140);
  }, 8);
  const ROWS = [{ x0: 190, y0: 660, x1: 1060, y1: 640, sag: 46 }, { x0: 190, y0: 1010, x1: 1060, y1: 990, sag: 46 }];
  const XS = [300, 455, 610, 765, 920];
  const sY = (R, x) => { const u = (x - R.x0) / (R.x1 - R.x0); return lerp(R.y0, R.y1, u) + R.sag * 4 * u * (1 - u); };
  const SPOTS = ROWS.flatMap((R, ri) => XS.map((x, i) => ({ x, y: sY(R, x) + 8 + D.TK.h / 2, ri, i, sway: (ri * 5 + i) * 1.3 })));
  const BAD = [{ k: 2, how: 'tear', dx: 10, rot: -1.3 }, { k: 4, how: 'blot', dx: 40, rot: 1.2 }, { k: 8, how: 'old', dx: 40, rot: 1.45 }];   // the three of ten that fail, clear of the tag
  const FALL = 0.55, GAP = 0.14, DEF = 0.25, FLOOR = 1585;   // on "29%" they go bad; on the third line's words they drop
  SCENES['wd_answers'] = { draw(c, lt) {
    const ID = 'wd_answers', tP = D.at(ID, 'print', 0.3), tF = D.at(ID, 'fall', 1.0), dur = D.dur(ID);
    const d1 = D.at(ID, 'drop1', tF + 1.3), d3 = Math.max(d1 + 0.3, D.at(ID, 'drop3', tF + 1.8)), DROP = [d1, (d1 + d3) / 2, d3];
    const cam = { x: Math.sin(lt * 0.33) * 7, y: 0, z: D.punch(lt, [tF, ...DROP], { kick: 0.02 }) * lerp(1.0, 1.04, D.ease.io(lt / dur)), fx: 600, fy: 1000 };
    stack(c, [
      { sh: D.night(), d: 0.03, lift: 0 },
      { sh: stall(), d: 0.06, lift: 0.6 },
      { fn: (g, ox) => D.bulbs(g, 200, 560, 1100, 540, 40, 12, lt, ox, 2), d: 0.07 },
      { sh: D.ground(), d: 0.1, lift: 0 },
      { fn: (g, ox) => {
        put(g, D.booth(), -70 + ox, 1640, { lift: 1.4 }); D.marquee(g, -70 + ox, 1640, lt, 0.8); D.ball(g, -70 + ox, 1640, lt, 0);
        g.fillStyle = '#1a1118'; g.fillRect(1030 + ox, 560, 26, 1100);                                             // the far post
        for (const R of ROWS) { g.strokeStyle = 'rgba(230,214,180,.85)'; g.lineWidth = 3; g.beginPath(); for (let x = R.x0; x <= R.x1; x += 20) { const y = sY(R, x); x === R.x0 ? g.moveTo(x + ox, y) : g.lineTo(x + ox, y); } g.stroke(); }
        SPOTS.forEach((sp, n) => {
          const bad = BAD.findIndex((b) => b.k === n), b = BAD[bad], tb = tF + bad * GAP;
          const sw = Math.sin(lt * 1.6 + sp.sway) * 0.04;
          let x = sp.x, y = sp.y, rot = sw, kind = 'ok';
          if (n === 5) { const k = D.ease.out((lt - tP) / 0.5); if (lt < tP) return; x = lerp(-10, sp.x, k); y = lerp(1330, sp.y, k) - Math.sin(k * Math.PI) * 160; rot = (1 - k) * -1.2 + sw; }   // the last one, out of the slot
          if (b) {
            const kd = clamp((lt - tb) / DEF, 0, 1), kf = clamp((lt - DROP[bad]) / FALL, 0, 1), dx = b.dx;
            if (b.how === 'old' && kd > 0) kind = kd > 0.5 ? 'old' : 'ok';
            if (kf > 0) { const e = D.ease.in(kf); x += dx * D.ease.out(kf); y = lerp(sp.y, FLOOR - bad * 12, e); rot = lerp(sw, b.rot, D.ease.out(kf)); }
            if (b.how === 'tear' && kd > 0) {                                                                    // incomplete: torn in two
              for (const half of [-1, 1]) { const off = half * 10 * kd + (half > 0 ? 18 * kf : 0), hy = half > 0 ? 60 * kf : 0;
                g.save(); g.translate(x + ox + off, y + hy); g.rotate(rot + half * 0.12 * kd); g.beginPath();
                if (half < 0) { g.moveTo(-90, -120); g.lineTo(90, -120); g.lineTo(90, -6); for (let q = 0; q < 8; q++) g.lineTo(90 - (q + 1) * 22.5, q % 2 ? -6 : 10); } else { g.moveTo(-90, 120); g.lineTo(90, 120); g.lineTo(90, -6); for (let q = 0; q < 8; q++) g.lineTo(90 - (q + 1) * 22.5, q % 2 ? -6 : 10); }
                g.closePath(); g.clip(); put(g, D.ticket('ok'), 0, 0, { lift: 0.8 }); g.restore(); }
              if (kf <= 0) put(g, D.peg(), sp.x + ox, sp.y - D.TK.h / 2 - 6, { lift: 0.5 }); return;
            }
            put(g, D.ticket(kind), x + ox, y, { rot, lift: 0.8 });
            if (b.how === 'blot' && kd > 0) { const r = 16 + 46 * D.ease.out(kd); g.save(); g.translate(x + ox, y); g.rotate(rot); g.fillStyle = D.C.blot; g.beginPath(); for (let a = 0; a <= TAU + 0.01; a += TAU / 14) { const rr = r * (0.75 + 0.35 * Math.abs(Math.sin(a * 3.3 + 1))); g.lineTo(Math.cos(a) * rr, 10 + Math.sin(a) * rr); } g.closePath(); g.fill();
              g.beginPath(); g.arc(r * 0.9, 10 + r, 7, 0, TAU); g.fill(); g.restore(); }
            if (kf <= 0) put(g, D.peg(), sp.x + ox, sp.y - D.TK.h / 2 - 6, { lift: 0.5 });
            return;
          }
          put(g, D.ticket(kind), x + ox, y, { rot, lift: 0.8 });
          if (n !== 5 || lt > tP + 0.5) put(g, D.peg(), sp.x + ox, sp.y - D.TK.h / 2 - 6, { lift: 0.5 });
        });
      }, d: 0.2 },
    ], cam);
    CW.tag(c, D.ui('dateline', 'ISD STUDY · 3.9.2026'), lt, dur);
    RFP.box(c);
  } };

  // 3 · The second fact. Close on the booth's slot, the ball's glow above it: a ticket prints out, ELECTION DAY ·
  // NOV 4, landing on the pop; then a gloved hand comes up and tears it off, and holds it.
  const panel = () => RFP.sheet('wd_panel', (g) => {
    const C = D.C; g.fillStyle = C.plum; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.gold; g.fillRect(60, -90, 40, H + 180); g.fillRect(W - 100, -90, 40, H + 180);
    g.fillStyle = C.glass; g.beginPath(); g.roundRect(170, 130, 740, 720, [370, 370, 30, 30]); g.fill(); g.strokeStyle = C.gold; g.lineWidth = 22; g.beginPath(); g.roundRect(160, 120, 760, 740, [380, 380, 36, 36]); g.stroke();
    g.fillStyle = C.velvet; g.beginPath(); g.moveTo(190, 420); g.quadraticCurveTo(300, 560, 290, 850); g.lineTo(175, 850); g.lineTo(175, 420); g.closePath(); g.fill(); g.beginPath(); g.moveTo(890, 420); g.quadraticCurveTo(780, 560, 790, 850); g.lineTo(905, 850); g.lineTo(905, 420); g.closePath(); g.fill();
    g.fillStyle = C.goldD; g.beginPath(); g.moveTo(420, 850); g.lineTo(660, 850); g.lineTo(612, 806); g.lineTo(468, 806); g.closePath(); g.fill();
    g.fillStyle = C.gold; g.beginPath(); g.roundRect(240, 905, 600, 150, 26); g.fill(); g.fillStyle = C.goldL; g.fillRect(262, 919, 556, 12);
    g.fillStyle = C.goldD; for (const x of [276, 804]) { g.beginPath(); g.arc(x, 980, 12, 0, TAU); g.fill(); }
    g.fillStyle = '#0a0608'; g.beginPath(); g.roundRect(320, 968, 440, 24, 10); g.fill();
    g.fillStyle = C.plumD; g.fillRect(-90, 1700, W + 180, H); g.fillStyle = C.gold; g.fillRect(-90, 1690, W + 180, 14);
  }, 10);
  SCENES['wd_ticket'] = { draw(c, lt) {
    const ID = 'wd_ticket', tS = D.at(ID, 'slot', 0.4), tD = D.at(ID, 'date', 1.3), tT = D.at(ID, 'tear', 4.2), dur = D.dur(ID);
    const kOut = clamp((lt - tS) / Math.max(0.3, tD - tS), 0, 1), len = D.BIG.h * kOut, kTear = clamp((lt - tT) / 0.4, 0, 1);
    const kHand = D.ease.out((lt - (tT - 0.75)) / 0.7);
    const cam = { x: Math.sin(lt * 0.3) * 5, y: 0, z: D.punch(lt, [tD, tT], { kick: 0.04 }) * lerp(1.0, 1.08, D.ease.io(lt / dur)), fx: 540, fy: 1200 };
    stack(c, [
      { sh: panel(), d: 0.05, lift: 0 },
      { fn: (g, ox) => D.ball(g, 540 + ox, 1395, lt, lt > tD ? Math.exp(-(lt - tD) * 2) * 0.6 : 0, 1.5), d: 0.05 },
      { fn: (g, ox) => {
        if (len <= 0) return;
        const pull = D.ease.out(kTear), sx = 540 + ox + 90 * pull, sy = 980 - 30 * pull, rot = kTear > 0 ? 0.1 * pull : Math.sin(lt * 2.2) * 0.02 * kOut;
        const bounce = lt > tD ? Math.sin((lt - tD) * 18) * 10 * Math.exp(-(lt - tD) * 6) : 0;
        g.save(); g.translate(sx, sy); g.rotate(rot); g.beginPath(); g.rect(-260, kTear > 0 ? -20 : 0, 520, len + 30); g.clip();
        put(g, D.bigTicket(), 0, len - D.BIG.h + bounce, { lift: 1.1 }); g.restore();
        if (kTear > 0) { g.fillStyle = D.C.cream; g.beginPath(); g.moveTo(540 - 190 + ox, 980); for (let q = 0; q <= 16; q++) g.lineTo(540 - 190 + q * 23.75 + ox, 980 + (q % 2 ? 9 : 2)); g.lineTo(540 + 190 + ox, 980); g.closePath(); g.fill(); }   // the stub left in the slot
      }, d: 0.12 },
      { fn: (g, ox) => { if (kHand <= 0) return; const pull = D.ease.out(kTear);
        RFP.hand(g, 600 + ox + 90 * pull, lerp(2150, 1615, kHand) - 30 * pull, 1.15, -0.06, { sleeve: D.C.coat, cuff: D.C.ochre }); }, d: 0.18 },
    ], cam);
    RFP.box(c);
  } };

  // 4 · The third fact. Tuesday: the gym in the morning sun, POLLING PLACE, bunting out. The doors swing open and a
  // queue goes in; voters come out wearing the sticker. On "Tuesday" the day card flips to TUE 3. He is not there.
  const bunting = (m) => RFP.sheet('wd_bunt_' + m, (g) => {
    const cols = [D.C.cream, D.C.ochre, D.C.sage], { x0, x1, top } = D.G, droop = m === 'wed';
    g.strokeStyle = 'rgba(30,24,20,.7)'; g.lineWidth = 3; g.beginPath();
    const P = (u) => droop && u > 0.55 ? [lerp(x0, x1, 0.55) + (u - 0.55) * 140, top + 30 + (u - 0.55) * 900] : [lerp(x0, x1, u), top + 140 + 40 * Math.sin(u * Math.PI * 4)];
    for (let i = 0; i <= 60; i++) { const [x, y] = P(i / 60); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (let i = 0; i < 22; i++) { const u = (i + 0.5) / 22, [x, y] = P(u); g.fillStyle = cols[i % 3]; g.save(); g.translate(x, y); if (droop && u > 0.55) g.rotate(-1.3); g.beginPath(); g.moveTo(-18, 0); g.lineTo(18, 0); g.lineTo(0, 40); g.closePath(); g.fill(); g.restore(); }
  }, 6);
  const QUEUE = [[S.GREEN, '#6b5b4b', D.C.cream], [S.ORANGE, '#5d6a62', D.C.sage], [S.YELLOW, '#7a6a5a', D.C.cream], [S.PURPLE, '#66705c', D.C.ochre], [S.LIME, '#6e5e66', D.C.cream], [S.PINK, '#5a5e52', D.C.sage]];
  SCENES['wd_tuesday'] = { draw(c, lt) {
    const ID = 'wd_tuesday', tO = D.at(ID, 'open', 0.3), tU = D.at(ID, 'tue', 1.2), dur = D.dur(ID);
    const kO = clamp((lt - tO) / 0.6, 0, 1), kU = clamp((lt - tU) / 0.3, 0, 1);
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: D.punch(lt, [tU], { kick: 0.03 }) * lerp(1.0, 1.04, D.ease.io(lt / dur)), fx: 540, fy: 1200 };
    stack(c, [
      { sh: D.gymSky('tue'), d: 0.03, lift: 0 },
      { sh: D.gym('tue'), d: 0.08, lift: 0.8 },
      { sh: bunting('tue'), d: 0.08, lift: 0.6 },
      { fn: (g, ox) => { D.doors(g, 'tue', kO, ox); put(g, D.board('tue'), D.BOARD.x + ox, D.BOARD.y, { lift: 0.8 }); D.dayCard(g, ox, kU, D.ui('dayTue', 'TUE 3')); }, d: 0.08 },
      { fn: (g, ox) => {
        // the queue: six masks, shuffling left to the door; the one at the door goes in
        const sp = 132, base = 660, shift = Math.max(0, lt - tO) * 28;
        const ppl = QUEUE.map((q, i) => ({ q, x: base + ((i * sp - shift) % (sp * QUEUE.length) + sp * QUEUE.length) % (sp * QUEUE.length) })).sort((a, b) => b.x - a.x);
        for (const { q, x } of ppl) { const a = clamp((x - 600) / 60, 0, 1); D.voter(g, x + ox, 1312, 0.48, { color: q[0], coat: q[1], scarf: q[2], t: lt, step: Math.sin(lt * 6 + x) * 0.5, look: -0.6, alpha: a, lift: 0.7 }); }
        // two come out wearing the sticker, off to the left
        for (const [t0, q] of [[tO + 0.5, QUEUE[3]], [tO + 2.6, QUEUE[0]]]) { const k = lt - t0; if (k < 0) continue; const x = 540 - k * 95; if (x < -120) continue;
          D.voter(g, x + ox, 1322, 0.5, { color: q[0] === S.PURPLE ? S.ORANGE : S.YELLOW, coat: '#5b6b5f', scarf: D.C.cream, t: lt, step: Math.sin(lt * 7), look: -0.3, alpha: clamp(k / 0.35, 0, 1), stick: true, lift: 0.8 }); }
      }, d: 0.12 },
    ], cam);
    RFP.box(c);
  } };

  // 5 · The answer. Wednesday: the same gym, grey; the doors chained, POLLS CLOSED, the stickers in the gutter. He walks
  // in with his NOV 4 ticket and stops. The calendar slaps onto the door; on "Wednesday" the red marker strikes WED 4
  // and circles TUE 3; then the end card sends you to the real source.
  const closedSign = () => { const t = D.ui('closed', 'POLLS CLOSED');
    return sprite('wd_closed_' + t, 190, 104, 95, 52, (g) => { g.fillStyle = '#f6f1e6'; g.fillRect(-95, -52, 190, 104); g.fillStyle = D.C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
      const L = t.split(' '), s = Math.min(...L.map((l) => D.fit(g, l, 44, 176))); g.font = `${s}px "Anton-400", "NotoSansJP-800"`; L.forEach((l, i) => g.fillText(l, 0, (i - (L.length - 1) / 2) * s * 1.05)); g.textBaseline = 'alphabetic'; }, 6); };
  const smallTicket = () => { const d = D.ui('ticketDate', 'NOV 4');
    return sprite('wd_stk_' + d, 92, 130, 46, 65, (g) => { g.fillStyle = D.C.cream; g.fillRect(-46, -65, 92, 130); g.fillStyle = D.C.gold; g.fillRect(-46, -56, 92, 24); g.fillStyle = D.C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; D.fit(g, d, 40, 80); g.fillText(d, 0, 14); g.textBaseline = 'alphabetic'; }, 5); };
  SCENES['wd_wednesday'] = { draw(c, lt) {
    const ID = 'wd_wednesday', tA = D.at(ID, 'arrive', 0.3), tC = D.at(ID, 'cal', 1.7), tW = D.at(ID, 'wed', 2.3), tE = D.at(ID, 'card', 3.6), dur = D.dur(ID);
    const kC = clamp((lt - tC) / 0.22, 0, 1), kE = D.pop(lt, tE, 0.34), M = D.marks(), CAL = D.CAL;
    const cam = { x: Math.sin(lt * 0.28) * 5, y: 0, z: D.punch(lt, [tC, tW, tE], { kick: 0.03 }) * lerp(1.0, 1.07, D.ease.io(lt / dur)), fx: 540, fy: 1180 };
    const walkK = D.ease.out((lt - tA) / 1.5), vx = lerp(-150, 170, walkK), moving = lt > tA && walkK < 0.97;
    stack(c, [
      { sh: D.gymSky('wed'), d: 0.03, lift: 0 },
      { sh: D.gym('wed'), d: 0.08, lift: 0.8 },
      { sh: bunting('wed'), d: 0.08, lift: 0.6 },
      { fn: (g, ox) => { D.doors(g, 'wed', 0, ox, { chain: true }); put(g, D.board('wed'), D.BOARD.x + ox, D.BOARD.y, { lift: 0.8 }); put(g, closedSign(), 885 + ox, 1292, { rot: 0.06, lift: 0.6 }); }, d: 0.08 },
      { fn: (g, ox) => {                                                                                       // a sticker the wind keeps moving along the gutter
        const k = ((lt * 70) % 900); D.sticker(g, 1100 - k + ox, D.G.base + 150 + Math.sin(lt * 5) * 4, 1.0, lt * 2.2, Math.floor(lt * 2.2 / Math.PI) % 2 === 1);
      }, d: 0.1 },
      { fn: (g, ox) => {
        if (kC > 0) { const s = lerp(1.35, 1, D.ease.out(kC)), r = lerp(-0.22, CAL.rot, D.ease.out(kC));
          g.save(); g.translate(CAL.x + ox, CAL.y); g.rotate(r); g.scale(s, s); put(g, D.calendar(), 0, 0, { lift: lerp(3, 0.7, kC) });
          if (kC >= 1) { D.tape(g, -CAL.w / 2 + 10, -CAL.h / 2 + 4, -0.6); D.tape(g, CAL.w / 2 - 10, -CAL.h / 2 + 4, 0.6); }
          g.restore(); }
      }, d: 0.12 },
      { fn: (g, ox) => {                                                                                       // him, with his ticket
        const step = moving ? Math.sin(lt * 8) : 0, look = lt > tC ? 0.55 : 0.1, y = 1262;
        D.voter(g, vx + ox, y, 0.66, { ...VOTER, t: lt, step, look, lift: 1.1 });
        put(g, smallTicket(), vx + 112 + ox, y + 190 + step * 3, { rot: 0.12 + step * 0.04, lift: 0.8 });
        g.fillStyle = D.C.ink; g.beginPath(); g.roundRect(vx + 92 + ox, y + 238, 40, 30, 12); g.fill();
      }, d: 0.16 },
      { fn: (g, ox) => {                                                                                       // the marker: strike WED 4, ring TUE 3
        if (lt < tW - 0.6 || kC < 1) return;
        g.save(); g.translate(CAL.x + ox, CAL.y); g.rotate(CAL.rot); let tip = null;
        for (const m of M) { const k = (lt - tW - m.t0) / m.d; if (k <= 0) continue; const t = D.drawMark(g, m, D.ease.out(k)); if (k < 1) tip = t; }
        g.restore();
        const last = M[M.length - 1], done = tW + last.t0 + last.d, rest = [980, 1820];
        let pen; if (tip) { const cs = Math.cos(CAL.rot), sn = Math.sin(CAL.rot); pen = [CAL.x + ox + cs * tip[0] - sn * tip[1], CAL.y + sn * tip[0] + cs * tip[1]]; }
        else if (lt < tW) { const k = D.ease.out((lt - (tW - 0.6)) / 0.6), s0 = M[0].parts[0]; pen = [lerp(rest[0], CAL.x + D.CELL - 60, k) + ox, lerp(rest[1], CAL.y - 76, k)]; }
        else { const gap = M.find((m) => lt < tW + m.t0); if (gap) { pen = [CAL.x + ox + D.CELL * (gap === M[2] ? 0.6 : 1.2), CAL.y - 70]; } else { const k = D.ease.out((lt - done) / 0.5); pen = [lerp(CAL.x + 110, rest[0], k) + ox, lerp(CAL.y + 180, rest[1] + 200, k)]; } }
        if (pen[1] < 1960) D.marker(g, pen[0], pen[1]);
      }, d: 0.12 },
      { fn: (g, ox) => { if (kE > 0) put(g, D.endCard(), 654 + ox, 1440, { sc: kE, lift: 1.2 }); }, d: 0.14 },
    ], cam);
    RFP.box(c);
  } };
})();
