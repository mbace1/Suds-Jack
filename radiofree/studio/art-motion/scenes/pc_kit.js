// The kit for "Per Caller" (Coxon): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline. Every scene of
// the film is registered in this file ("scenes": [] in film.json).
// One question: can an AI call your cellphone about the election without asking? Today, no: it needs your consent. A
// political group has asked the FCC to drop that for political calls, and a ruling could come before Election Day.
// The proposed limit is three calls a month — PER CALLER. The look is a kitchen at night (plum wall, gingham oilcloth,
// an unsigned CONSENT form, a phone in its stand) with a big window onto the street; then the FCC by day (sage panels,
// a walnut desk, three empty chairs, a stamp that hovers and never lands); then the kitchen again, where the street
// lamps come on over a queue of masked callers, each holding a 3, and their calls land on the table as cards with
// weight (matter.js) until the pile shoves the phone off the edge.
//   Times come from window.FILM_PLAN (pipeline/plan.mjs): at('pc_end', 'caller') is the moment the pop word "Per"
//   comes on, in the shot's own seconds, so the lamps and the physics hit the word in every language.
(() => {
  const { W, H, sheet, sprite, put, stack, box, glow, walker, hand } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.43 };
  const at = (id, name, dflt = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? dflt : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const C = {
    night0: '#0a1114', night1: '#111b20', night2: '#18252b', house: '#121a1e', house2: '#172127', road: '#151a1c', pave: '#242a2c', paveL: '#3a4244', sodium: '#f2b24c',
    wall: '#2e2232', wallD: '#211826', trim: '#d9cdb0', trimD: '#b3a586', tile: '#d6cfbb', tileD: '#b9b19b',
    cloth: '#e9e0c8', check: '#c99a2e', wood: '#4d3020', woodD: '#3a2416', woodL: '#6a4630', floor: '#1d1611',
    paper: '#f1e8d2', paperD: '#ddd2b8', ink: '#15120f', mag: '#f0027f', ochre: '#e3a33a', ochreD: '#b9801f',
    phone: '#141618', bezel: '#2a2e31', screen: '#1a2326', lit: '#c9f2dc', litD: '#7fcfa6', answer: '#3fae6a', grey: '#6b7378',
    sage: '#33433b', sageL: '#3e5148', sageD: '#27332d', leather: '#2b211c', leatherL: '#3b2d25', brass: '#c9a24a', brassD: '#94722a', blotter: '#2d4636', carpet: '#24262a',
    sleeve: '#3c4146', steel: '#8a949b', steelD: '#4b5258', stamp: '#9a6438', stampL: '#b77a45',
  };
  const ease = {
    out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
    io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
  };
  function punch(lt, hits = [], { open = 0.05, settle = 0.35, kick = 0.035 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  // Japanese labels fall back to IPA P Gothic (PLANNING.md: a gothic, never the bundled serif)
  const FONT = (px, fam = 'Anton-400') => `${px}px "${fam}", "IPAPGothic"`;
  function fit(g, text, maxW, px, fam) { let s = px; g.font = FONT(s, fam); while (g.measureText(text).width > maxW && s > 10) { s -= 1; g.font = FONT(s, fam); } return s; }
  /** the small ochre where/what tag, low left, above Instagram's caption (as CW.tag, with a Japanese fallback) */
  function tag(c, text, lt, d, x = 110, y = RFP.SAFE_B - 66) {
    const a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((d - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = FONT(32, 'ArchivoBlack-400'); const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(10,6,2,.55)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = C.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = C.ink; c.textBaseline = 'alphabetic'; c.fillText(text, x + 22, y + 45); c.restore();
  }

  // <phys> ── the twist, with weight (matter.js): every caller's three calls land on the kitchen table, one card a call,
  // until the pile shoves the phone off the edge. A pure function of τ = time since "Per" (the punchline's pop word), so
  // the cards land at the same offsets from the word in every language and the cue sheet places a paper tap on each
  // (score.py holds the offsets, printed from this very block by the scratch tool pc_phys_test.mjs). It re-simulates
  // from zero whenever time goes back, so stills and the full render agree.
  const PCP = (() => {
    const TY = 1440, TX1 = 905, SIM0 = -1.75, SY = 1035, CREEP = 115;      // the table's surface line and right-hand end; the sim's start (τ); the window sill; the phone's top creep
    const CARD = { w: 150, h: 98 }, PHONE = { x: 830, w: 136, h: 282, bw: 188, bh: 40 }, MUG = { x: 150, w: 104, h: 126 };
    // caller 0 (at the window from the start) sends three before the word; then, from the word on, the queue: each
    // caller's three in quick succession, a caller every 0.36 s
    const N = 7, SPAWN = [];
    for (let k = 0; k < N; k++) for (let j = 0; j < 3; j++) {
      const t = k === 0 ? -1.68 + j * 0.38 : 0.16 + (k - 1) * 0.36 + j * 0.11, r = U.rng(400 + k * 7 + j);
      SPAWN.push(k === 0 ? { t, k, j, x: [330, 220, 440][j] + r() * 30, vx: 0.8 + r() * 1.0, vy: -3 - r() * 1.5, a: (r() - 0.5) * 0.9, w: (r() - 0.5) * 0.3 }
        : { t, k, j, x: 200 + r() * 360, vx: 1.8 + r() * 2.2, vy: -3.0 - r() * 2.0, a: (r() - 0.5) * 0.9, w: (r() - 0.5) * 0.3 });
    }
    let SIM = null;
    function make() {
      const { Engine, Bodies, Body, Composite, Events } = Matter, eng = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0012 } });
      const st = { isStatic: true, friction: 0.7 };
      const table = Bodies.rectangle((TX1 - 400) / 2, TY + 20, TX1 + 400, 40, { ...st, friction: 0.55 });
      const wall = Bodies.rectangle(44 - 40, TY - 600, 80, 1600, st);
      const mug = Bodies.rectangle(MUG.x, TY - MUG.h / 2, MUG.w, MUG.h, { ...st, chamfer: { radius: 10 } });
      const floor = Bodies.rectangle(540, 1950, 3000, 100, st);                     // the kitchen floor, at the foot of the frame
      const base = Bodies.rectangle(PHONE.x, TY - PHONE.bh / 2, PHONE.bw, PHONE.bh, { chamfer: { radius: 4 } });
      const body = Bodies.rectangle(PHONE.x, TY - PHONE.bh - PHONE.h / 2, PHONE.w, PHONE.h, { chamfer: { radius: 18 } });
      const phone = Body.create({ parts: [base, body], friction: 0.24, frictionAir: 0.01, restitution: 0.05 });
      Body.setDensity(phone, 0.002);
      const off = { x: PHONE.x - phone.position.x, y: TY - phone.position.y };     // the drawing's origin (the stand's foot) from the centre of mass
      Composite.add(eng.world, [table, wall, mug, floor, phone]);
      const S = { eng, t: SIM0, next: 0, cards: [], phone, off, table, floor, landed: [], fall: null, hit: null };
      Events.on(eng, 'collisionStart', (ev) => {
        for (const p of ev.pairs) for (const [a, b] of [[p.bodyA, p.bodyB], [p.bodyB, p.bodyA]]) {
          const cd = a.pcCard; if (!cd || cd.land !== undefined) continue;
          if (b === S.floor) continue; cd.land = S.t; S.landed.push(S.t);
        }
        // the phone hits the floor (or a card that went over before it): the first contact once it is well below the table
        for (const p of ev.pairs) if (!S.hit && S.phone.position.y > TY + 150 && (p.bodyA.parent === S.phone || p.bodyB.parent === S.phone)) S.hit = S.t;
      });
      return S;
    }
    /** the world at τ (seconds since the word); steps at 120 Hz. A card's inertia is six times a flat sheet's, so it tumbles less */
    function at(tau) {
      if (!SIM || tau < SIM.t - 1e-6) SIM = make();
      const dt = 1 / 120, { Bodies, Body, Composite, Engine } = Matter;
      while (SIM.t + dt <= tau + 1e-9) {
        while (SIM.next < SPAWN.length && SPAWN[SIM.next].t <= SIM.t) {
          const s = SPAWN[SIM.next++], b = Bodies.rectangle(s.x, SY, CARD.w, CARD.h, { angle: s.a, frictionAir: 0.02, friction: 0.45, restitution: 0.04, density: 0.0009, chamfer: { radius: 6 } });
          Body.setInertia(b, b.inertia * 6); Body.setVelocity(b, { x: s.vx, y: s.vy }); Body.setAngularVelocity(b, s.w); b.pcCard = { k: s.k, j: s.j, born: SIM.t };
          Composite.add(SIM.eng.world, b); SIM.cards.push(b);
        }
        Engine.update(SIM.eng, dt * 1000); SIM.t += dt;
        const p = SIM.phone.position, v = SIM.phone.velocity;
        // while it still stands on the table the phone CREEPS (at most CREEP px/s): a hard card can nudge it but not throw
        // it, so the push reads as the pile's weight rather than one hit, and a hair's difference between machines in
        // how one card lands cannot turn into a jump
        if (p.y < TY - 120 && p.x < TX1 - 10 && SIM.px !== undefined && Math.abs(p.x - SIM.px) > CREEP * dt) {
          Body.setPosition(SIM.phone, { x: SIM.px + Math.sign(p.x - SIM.px) * CREEP * dt, y: p.y }); Body.setVelocity(SIM.phone, { x: Math.sign(v.x) * Math.min(Math.abs(v.x), CREEP / 60), y: v.y });
        }
        SIM.px = SIM.phone.position.x;
        if (SIM.fall === null && p.x > TX1 + 10 && p.y > TY - 120) SIM.fall = SIM.t;      // over the edge and going down
      }
      return SIM;
    }
    return { at, TY, TX1, CARD, PHONE, MUG, N, SPAWN, SIM0, SY };
  })();
  // </phys>
  const { TY } = PCP;

  // ── the callers: masks in the sticker colours that carry no party (never red, never blue) ───────────────────────
  const MASKS = ['#f5c400', '#8dc21f', '#f07d12', '#ec1a7c', '#7c1d96', '#f0027f', '#e3a33a', '#12783a', '#d8c8a8', '#f5c400', '#8dc21f', '#f07d12', '#ec1a7c', '#7c1d96'];
  const COATS = ['#2f3d36', '#4a3f33', '#3d2e43', '#302d29', '#4b3a2a', '#35423e'], SCARVES = ['#d8c8a8', '#e3a33a', '#8a949b', '#b8a88c'];
  // the queue on the pavement outside, near and big at the left, away down the street to the right and out of sight
  const QX = [270, 400, 500, 578, 640, 692, 735, 772, 803, 830, 853, 873, 890, 906];
  const QS = [0.62, 0.47, 0.37, 0.30, 0.25, 0.21, 0.18, 0.155, 0.135, 0.12, 0.107, 0.096, 0.087, 0.08];
  const feetY = (x) => 1039 - 0.339 * (x - 270), kerbY = (x) => 1000 - 0.253 * (x - 130);
  const WIN = { x0: 150, x1: 930, y0: 500, y1: 1060 };

  // ── the street, seen through the window ──────────────────────────────────────────────────────────────────────
  const street = () => sheet('pc_street', (g) => {
    const bands = [C.night0, '#0c1518', C.night1, '#141f24', C.night2];
    bands.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, 380 + i * 64, W + 180, 900); });
    const r = U.rng(21);
    g.fillStyle = 'rgba(235,225,199,.55)'; for (let i = 0; i < 26; i++) g.fillRect(150 + r() * 780, 505 + r() * 90, 2, 2);
    let x = 100;                                                           // the houses across the road: gables, a few lit windows
    while (x < 990) {
      const w = 110 + r() * 100, h = 130 + r() * 70, top = 820 - h;
      g.fillStyle = r() < 0.5 ? C.house : C.house2; g.fillRect(x, top, w, 300);
      g.beginPath(); g.moveTo(x - 8, top); g.lineTo(x + w / 2, top - 46 - r() * 34); g.lineTo(x + w + 8, top); g.closePath(); g.fill();
      for (let wy = top + 26; wy < 790; wy += 50) for (let wx = x + 16; wx < x + w - 30; wx += 40) { g.fillStyle = r() < 0.28 ? 'rgba(227,163,58,.7)' : 'rgba(0,0,0,.32)'; g.fillRect(wx, wy, 20, 28); }
      x += w + 10;
    }
    g.fillStyle = C.road; g.fillRect(-90, 815, W + 180, 400);
    g.fillStyle = 'rgba(200,190,160,.10)'; for (let i = 0; i < 9; i++) { const xx = 160 + i * 100; g.fillRect(xx, 838 - i * 2, 50, 4); }   // the road's centre line, far off
    g.fillStyle = C.pave; g.beginPath(); g.moveTo(-90, kerbY(-90)); g.lineTo(990, kerbY(990)); g.lineTo(990, 1200); g.lineTo(-90, 1200); g.closePath(); g.fill();
    g.strokeStyle = C.paveL; g.lineWidth = 5; g.beginPath(); g.moveTo(-90, kerbY(-90)); g.lineTo(990, kerbY(990)); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 2; for (let i = 0; i < 12; i++) { const xx = 120 + i * 80; g.beginPath(); g.moveTo(xx, kerbY(xx) + 4); g.lineTo(xx - 60 + i * 4, 1200); g.stroke(); }   // paving joints
  }, 8);
  // street lamps on the kerb: the near one is always lit; the rest come on over the queue on "per caller"
  const LAMPS = [{ x: 196, h: 430 }, { x: 462, h: 300 }, { x: 688, h: 196 }, { x: 842, h: 124 }];
  function lamps(c, on, ox = 0, oy = 0) {
    LAMPS.forEach((L, i) => {
      const bx = L.x + ox, by = kerbY(L.x) + oy, s = L.h / 430, top = by - L.h, k = on[i] || 0;
      c.fillStyle = '#0b0f11'; c.fillRect(bx - 7 * s, top, 14 * s, L.h); c.fillRect(bx - 7 * s, top, 60 * s, 8 * s);
      c.beginPath(); c.moveTo(bx + 40 * s, top + 4 * s); c.lineTo(bx + 76 * s, top + 4 * s); c.lineTo(bx + 68 * s, top + 26 * s); c.lineTo(bx + 48 * s, top + 26 * s); c.closePath(); c.fill();
      if (k > 0) {
        c.fillStyle = `rgba(255,214,140,${0.9 * k})`; c.fillRect(bx + 48 * s, top + 22 * s, 20 * s, 6 * s);
        glow(c, bx + 58 * s, top + 26 * s, 260 * s, 'rgba(242,178,76,', 0.55 * k);
        c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(bx + 58 * s, by, 0, bx + 58 * s, by, 220 * s); g.addColorStop(0, `rgba(242,178,76,${0.28 * k})`); g.addColorStop(1, 'rgba(242,178,76,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(bx + 58 * s, by, 220 * s, 60 * s, 0, 0, TAU); c.fill(); c.restore();
      }
    });
  }
  /** the 3 every caller holds up */
  const three = () => sprite('pc_three', 128, 128, 64, 64, (g) => {
    g.fillStyle = C.paper; g.beginPath(); g.roundRect(-60, -60, 120, 120, 8); g.fill();
    g.strokeStyle = C.ochre; g.lineWidth = 8; g.beginPath(); g.roundRect(-52, -52, 104, 104, 6); g.stroke();
    g.fillStyle = C.ink; g.font = FONT(98); g.textAlign = 'center'; g.fillText('3', 0, 36);
  }, 6);
  function caller(c, k, lt, a, ox = 0, oy = 0) {
    if (a <= 0) return;
    const s = QS[k], x = QX[k] + ox, neck = feetY(QX[k]) - 450 * s + oy, sc = lerp(0.6, 1, ease.back(a));
    c.save(); c.globalAlpha *= clamp(a * 1.6, 0, 1);
    c.translate(x, neck + 450 * s); c.scale(sc, sc); c.translate(-x, -(neck + 450 * s));
    walker(c, x, neck, s, { coat: COATS[k % COATS.length], scarf: SCARVES[k % SCARVES.length], color: MASKS[k], t: lt + k * 0.37, look: Math.sin(lt * 0.9 + k * 1.7) * 0.22, led: (Math.floor(lt * 2.5 + k * 0.6) % 2) ? 0.9 : 0.15, lift: 0.6 });
    const py = neck + 150 * s;                                                    // the placard, held at the chest in two gloves
    put(c, three(), x, py, { sc: s * 0.95, lift: 0.4 });
    c.fillStyle = C.ink; for (const sx of [-1, 1]) { c.beginPath(); c.roundRect(x + sx * 62 * s - 16 * s, py - 4 * s, 32 * s, 40 * s, 12 * s); c.fill(); }
    c.restore();
  }

  // ── the kitchen ──────────────────────────────────────────────────────────────────────────────────────────────
  const kWall = () => sheet('pc_kwall', (g) => {
    g.fillStyle = C.wall; g.fillRect(-90, -90, W + 180, 1440);
    g.fillStyle = 'rgba(255,236,214,.035)'; for (let x = -90; x < W + 90; x += 46) g.fillRect(x, -90, 14, 1440);      // a faint striped paper
    g.fillStyle = C.tile; g.fillRect(-90, 1090, W + 180, 260);                                                          // the backsplash
    g.strokeStyle = C.tileD; g.lineWidth = 3;
    for (let row = 0; row < 5; row++) { const y = 1090 + row * 64; g.beginPath(); g.moveTo(-90, y); g.lineTo(W + 90, y); g.stroke(); for (let x = -90 + (row % 2) * 32; x < W + 90; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } }
    g.globalCompositeOperation = 'destination-out'; g.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); g.globalCompositeOperation = 'source-over';
    g.fillStyle = C.trim; g.beginPath(); g.rect(WIN.x0 - 22, WIN.y0 - 22, WIN.x1 - WIN.x0 + 44, WIN.y1 - WIN.y0 + 22); g.rect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); g.fill('evenodd');
    g.fillStyle = C.trim; g.fillRect(WIN.x0 - 46, WIN.y1, WIN.x1 - WIN.x0 + 92, 30); g.fillStyle = C.trimD; g.fillRect(WIN.x0 - 46, WIN.y1 + 24, WIN.x1 - WIN.x0 + 92, 8);   // the sill
    // a short gingham valance along the top of the window, its hem scalloped
    g.save(); g.beginPath(); g.moveTo(WIN.x0 - 30, WIN.y0 - 30); g.lineTo(WIN.x1 + 30, WIN.y0 - 30);
    for (let x = WIN.x1 + 30; x >= WIN.x0 - 30; x -= 40) g.quadraticCurveTo(x - 20, WIN.y0 + 48, x - 40, WIN.y0 + 34);
    g.closePath(); g.fillStyle = C.cloth; g.fill(); g.clip();
    g.fillStyle = 'rgba(201,154,46,.45)'; for (let x = WIN.x0 - 30; x < WIN.x1 + 40; x += 36) g.fillRect(x, WIN.y0 - 40, 18, 100);
    for (let y = WIN.y0 - 30; y < WIN.y0 + 60; y += 36) g.fillRect(WIN.x0 - 40, y, WIN.x1 - WIN.x0 + 80, 18);
    g.restore();
  }, 14);
  /** the window's glass: two faint streaks of reflection */
  function glass(c, ox = 0, oy = 0) {
    c.save(); c.beginPath(); c.rect(WIN.x0 + ox, WIN.y0 + oy, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0); c.clip();
    c.fillStyle = 'rgba(220,235,240,.05)'; for (const [x, w] of [[300, 90], [430, 30]]) { c.beginPath(); c.moveTo(x + ox, WIN.y0 + oy); c.lineTo(x + w + ox, WIN.y0 + oy); c.lineTo(x + w - 260 + ox, WIN.y1 + oy); c.lineTo(x - 260 + ox, WIN.y1 + oy); c.closePath(); c.fill(); }
    c.restore();
  }
  const BK = 1330, FR = 1490, xEnd = (y) => lerp(870, 920, (y - BK) / (FR - BK));      // the table top's back and front edges; its right-hand end (= TX1 at TY)
  const kTable = () => sheet('pc_ktable', (g) => {
    g.fillStyle = C.wallD; g.fillRect(-90, BK, W + 180, 290); g.fillStyle = '#2a1c16'; g.fillRect(-90, 1600, W + 180, 24);
    g.fillStyle = C.floor; g.fillRect(-90, 1624, W + 180, 400); g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 1660; y < 2000; y += 54) g.fillRect(-90, y, W + 180, 3);
    g.fillStyle = C.woodD; g.fillRect(104, 1540, 44, 420); g.fillRect(820, 1540, 44, 420);
    g.fillStyle = C.cloth; g.beginPath(); g.moveTo(-90, BK); g.lineTo(xEnd(BK), BK); g.lineTo(xEnd(FR), FR); g.lineTo(-90, FR); g.closePath(); g.fill();
    g.save(); g.clip();                                                    // gingham in perspective: bands across, bands along
    g.fillStyle = 'rgba(201,154,46,.30)';
    const ys = Array.from({ length: 9 }, (_, i) => BK + (FR - BK) * Math.pow(i / 8, 1.2));
    for (let i = 0; i < 8; i += 2) g.fillRect(-90, ys[i], W + 180, ys[i + 1] - ys[i]);
    const persp = (x, y) => 540 + (x - 540) * lerp(1, 1.1, (y - BK) / (FR - BK));
    for (let x = -120; x < 1000; x += 64) { g.beginPath(); g.moveTo(persp(x, BK), BK); g.lineTo(persp(x + 32, BK), BK); g.lineTo(persp(x + 32, FR), FR); g.lineTo(persp(x, FR), FR); g.closePath(); g.fill(); }
    g.restore();
    g.fillStyle = C.cloth; g.fillRect(-90, FR, xEnd(FR) + 90, 16); g.fillStyle = 'rgba(201,154,46,.3)'; for (let x = -90; x < xEnd(FR); x += 36) g.fillRect(x, FR, 18, 16);
    g.fillStyle = C.wood; g.fillRect(-90, FR + 16, xEnd(FR) + 90 - 4, 52); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-90, FR + 60, xEnd(FR) + 86, 8);
    g.fillStyle = C.woodL; g.beginPath(); g.moveTo(xEnd(FR) - 4, FR); g.lineTo(xEnd(FR) + 8, FR + 6); g.lineTo(xEnd(FR) + 8, FR + 66); g.lineTo(xEnd(FR) - 4, FR + 68); g.closePath(); g.fill();
  }, 12);

  /** the CONSENT form, drawn in a 640×790 design box, origin at its foot; big = the close-up's legible small print */
  function formFace(g) {
    const w = 640, h = 790;
    g.fillStyle = C.paper; g.beginPath(); g.roundRect(-w / 2, -h, w, h, 6); g.fill();
    g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(-w / 2, -h, w, 10);
    g.fillStyle = C.ink; g.textAlign = 'center'; fit(g, ui('consent', 'CONSENT'), 540, 128); g.fillText(ui('consent', 'CONSENT'), 0, -620);
    g.fillRect(-260, -594, 520, 5);
    g.textAlign = 'left'; g.font = '700 35px "LibreBaskerville-700"';
    ['I agree to receive calls', 'made with an AI voice', 'on my cellphone.'].forEach((s, i) => g.fillText(s, -262, -520 + i * 52));
    g.fillStyle = 'rgba(21,18,15,.22)'; for (let i = 0; i < 3; i++) g.fillRect(-262, -340 + i * 26, i === 2 ? 300 : 520, 9);
    g.fillStyle = C.ink; g.font = FONT(24, 'ArchivoBlack-400'); g.fillText('SIGNATURE', -262, -230);
    g.font = FONT(58); g.fillText('X', -262, -150); g.fillRect(-214, -152, 476, 4);
    g.font = FONT(24, 'ArchivoBlack-400'); g.fillText('DATE', -262, -70); g.fillRect(-180, -70, 200, 4);
    g.fillStyle = C.steel; g.beginPath(); g.roundRect(-250, -810, 34, 92, 16); g.fill(); g.fillStyle = C.paper; g.beginPath(); g.roundRect(-243, -800, 20, 72, 10); g.fill();   // a paper clip
  }
  const formSmall = () => sprite('pc_form_s_' + ui('consent', 'CONSENT'), 252, 316, 126, 316, (g) => { g.scale(252 / 640, 316 / 790); formFace(g); }, 7);
  const formBig = () => sprite('pc_form_b_' + ui('consent', 'CONSENT'), 640, 820, 320, 790, (g) => formFace(g), 12);
  const mug = () => sprite('pc_mug', 150, 140, 62, 126, (g) => {
    g.strokeStyle = C.ochreD; g.lineWidth = 16; g.beginPath(); g.ellipse(-52, -66, 26, 34, 0, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
    g.fillStyle = C.ochre; g.beginPath(); g.roundRect(-52, -126, 104, 126, [6, 6, 16, 16]); g.fill();
    g.fillStyle = C.ochreD; g.fillRect(-52, -88, 104, 14); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, -122, 46, 7, 0, 0, TAU); g.fill();
  }, 7);
  const pen = () => sprite('pc_pen', 200, 24, 100, 12, (g) => {
    g.fillStyle = '#1f2a33'; g.beginPath(); g.roundRect(-96, -8, 170, 16, 8); g.fill(); g.fillStyle = C.steel; g.fillRect(-60, -9, 14, 18); g.fillRect(-96, -3, 60, 4);
    g.fillStyle = C.paperD; g.beginPath(); g.moveTo(74, -6); g.lineTo(96, 0); g.lineTo(74, 6); g.closePath(); g.fill();
  }, 5);

  // ── the phone in its stand: the sprite is the stand and the case; the screen is drawn live on top ─────────────
  const P_ = PCP.PHONE;
  const phoneSprite = () => sprite('pc_phone', 220, 340, 110, 330, (g) => {
    g.fillStyle = C.woodL; g.beginPath(); g.roundRect(-P_.bw / 2, -P_.bh, P_.bw, P_.bh, 6); g.fill(); g.fillStyle = C.wood; g.fillRect(-P_.bw / 2, -10, P_.bw, 10);
    g.fillStyle = C.phone; g.beginPath(); g.roundRect(-P_.w / 2, -P_.bh - P_.h, P_.w, P_.h, 20); g.fill();
    g.fillStyle = C.bezel; g.beginPath(); g.roundRect(-P_.w / 2 + 4, -P_.bh - P_.h + 4, P_.w - 8, P_.h - 8, 17); g.fill();
    g.fillStyle = C.phone; g.beginPath(); g.roundRect(-P_.w / 2 + 8, -P_.bh - P_.h + 8, P_.w - 16, P_.h - 16, 14); g.fill();
    g.fillStyle = C.woodL; g.fillRect(-P_.bw / 2 + 10, -P_.bh - 8, P_.bw - 20, 12);           // the lip that holds it
  }, 8);
  /** the phone at its foot (x, y): st.on 0..1 lights the screen; st.count shows the calls so far; st.buzz = seconds since a ring */
  function phone(c, x, y, st = {}) {
    const on = st.on || 0, bz = st.buzz >= 0 ? Math.sin(st.buzz * 70) * 2.2 * Math.exp(-st.buzz * 1.2) : 0;
    c.save(); c.translate(x + bz, y);
    put(c, phoneSprite(), 0, 0, { lift: 0.9 });
    const sx = -P_.w / 2 + 12, sy = -P_.bh - P_.h + 12, sw = P_.w - 24, sh = P_.h - 24;
    c.fillStyle = C.screen; c.beginPath(); c.roundRect(sx, sy, sw, sh, 10); c.fill();
    if (on > 0) {
      c.save(); c.globalAlpha = on;
      const gr = c.createLinearGradient(0, sy, 0, sy + sh); gr.addColorStop(0, C.lit); gr.addColorStop(1, C.litD); c.fillStyle = gr; c.beginPath(); c.roundRect(sx, sy, sw, sh, 10); c.fill();
      c.fillStyle = C.ink; c.textAlign = 'center'; fit(c, ui('unknown', 'UNKNOWN'), sw - 14, 30); c.fillText(ui('unknown', 'UNKNOWN'), 0, sy + 44);
      if (st.count === undefined) {                                                 // a caller with no face: a grey disc and a question mark
        c.fillStyle = 'rgba(21,18,15,.25)'; c.beginPath(); c.arc(0, sy + 116, 36, 0, TAU); c.fill(); c.fillStyle = C.ink; c.font = FONT(48); c.fillText('?', 0, sy + 133);
      } else {
        c.fillStyle = C.ink; fit(c, String(st.count), sw - 10, 92); c.fillText(String(st.count), 0, sy + 150);
        fit(c, ui('calls', 'CALLS'), sw - 16, 24, 'ArchivoBlack-400'); c.fillText(ui('calls', 'CALLS'), 0, sy + 180);
      }
      c.fillStyle = C.answer; c.beginPath(); c.arc(-30, sy + sh - 30, 17, 0, TAU); c.fill(); c.fillStyle = C.grey; c.beginPath(); c.arc(30, sy + sh - 30, 17, 0, TAU); c.fill();
      c.restore();
      if (st.buzz >= 0 && st.buzz < 6) {                                            // the buzz, drawn as two pairs of short strokes
        const k = (Math.sin(st.buzz * 9) > -0.2 ? 1 : 0) * on; c.strokeStyle = `rgba(201,242,220,${0.8 * k})`; c.lineWidth = 5; c.lineCap = 'round';
        for (const sxn of [-1, 1]) for (let i = 0; i < 2; i++) { const xx = sxn * (P_.w / 2 + 16 + i * 14), yy = sy + 40 + i * 6; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx + sxn * 8, yy + 34); c.stroke(); }
      }
    }
    c.restore();
    if (on > 0) glow(c, x, y - P_.bh - P_.h / 2, 300, 'rgba(190,240,215,', 0.3 * on);
  }
  /** the still things on the kitchen table: the form leaning on the tiles, the pen, the mug */
  function props(c, ox, oy) {
    put(c, formSmall(), 520 + ox, 1402 + oy, { rot: -0.035, lift: 0.7 });
    put(c, pen(), 600 + ox, 1452 + oy, { rot: 0.06, sc: 0.75, lift: 0.4 });
    put(c, mug(), PCP.MUG.x + ox, TY + oy, { lift: 0.8 });
  }
  const PHX = PCP.PHONE.x;

  // ── a call card: the caller's colour on the band, which of its three calls it is ─────────────────────────────
  const card = (k, j) => sprite(`pc_card_${k}_${j}`, PCP.CARD.w, PCP.CARD.h, PCP.CARD.w / 2, PCP.CARD.h / 2, (g) => {
    const w = PCP.CARD.w, h = PCP.CARD.h;
    g.fillStyle = C.paper; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 7); g.fill();
    g.save(); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 7); g.clip(); g.fillStyle = MASKS[k]; g.fillRect(-w / 2, -h / 2, w, 26); g.restore();
    g.fillStyle = C.ink; g.font = FONT(17, 'ArchivoBlack-400'); g.textAlign = 'left'; g.fillText('AI CALL', -w / 2 + 34, -h / 2 + 20);
    g.save(); g.translate(-w / 2 + 18, -h / 2 + 13); g.rotate(-0.6); g.beginPath(); g.roundRect(-9, -4, 18, 8, 4); g.fill(); g.restore();        // a handset glyph
    g.textAlign = 'center'; g.font = FONT(52); g.fillText(`${j + 1}/3`, 0, h / 2 - 16);
  }, 6);

  // ── the FCC ──────────────────────────────────────────────────────────────────────────────────────────────────
  const oWall = () => sheet('pc_owall', (g) => {
    g.fillStyle = C.sage; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.sageD; g.fillRect(-90, 440, W + 180, 22);
    for (let x = -60; x < W + 90; x += 230) {                                       // tall panels with a thin cream bead
      g.fillStyle = C.sageL; g.fillRect(x, 500, 190, 1000); g.strokeStyle = 'rgba(217,205,176,.35)'; g.lineWidth = 3; g.strokeRect(x + 14, 514, 162, 972);
    }
    g.fillStyle = C.sageD; g.fillRect(-90, 1500, W + 180, 40);
  }, 14);
  const chair = () => sprite('pc_chair', 250, 470, 125, 460, (g) => {
    g.fillStyle = '#1e1714'; g.beginPath(); g.roundRect(-118, -460, 236, 460, [70, 70, 10, 10]); g.fill();
    g.fillStyle = C.leather; g.beginPath(); g.roundRect(-104, -446, 208, 446, [60, 60, 8, 8]); g.fill();
    g.fillStyle = C.leatherL; for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-66 + i * 44 + (r % 2) * 22, -380 + r * 70, 5, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; for (let r = 0; r < 4; r++) { g.beginPath(); g.moveTo(-90, -380 + r * 70 + 35); g.lineTo(90, -380 + r * 70 + 35); g.stroke(); }
  }, 10);
  const DB = 1010, DF = 1430;                                                         // the desk top's back and front edges
  const oDesk = () => sheet('pc_odesk', (g) => {
    g.fillStyle = C.wood; g.beginPath(); g.moveTo(30, DB); g.lineTo(1050, DB); g.lineTo(1170, DF); g.lineTo(-90, DF); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2; for (let i = 1; i < 12; i++) { const y = DB + (DF - DB) * (i / 12); g.beginPath(); g.moveTo(-90, y + Math.sin(i) * 3); g.lineTo(W + 90, y - Math.sin(i * 2) * 3); g.stroke(); }
    g.fillStyle = C.blotter; g.beginPath(); g.moveTo(220, DB + 40); g.lineTo(860, DB + 40); g.lineTo(920, DF - 40); g.lineTo(160, DF - 40); g.closePath(); g.fill();
    g.strokeStyle = C.brassD; g.lineWidth = 3; g.stroke();
    g.fillStyle = C.woodL; g.fillRect(-90, DF, W + 180, 12);
    g.fillStyle = C.woodD; g.fillRect(-90, DF + 12, W + 180, 170); g.fillStyle = 'rgba(0,0,0,.2)'; for (let x = -60; x < W + 90; x += 270) g.fillRect(x, DF + 30, 6, 140);
    g.fillStyle = C.brass; g.beginPath(); g.roundRect(420, DF + 40, 240, 86, 8); g.fill(); g.strokeStyle = C.brassD; g.lineWidth = 4; g.strokeRect(430, DF + 50, 220, 66);   // the plate
    g.fillStyle = C.ink; g.font = FONT(56); g.textAlign = 'center'; g.fillText('FCC', 540, DF + 104);
    g.fillStyle = C.carpet; g.fillRect(-90, DF + 182, W + 180, 400);
  }, 12);
  /** the petition, in a 420×540 box about its centre: what is asked, and in small hand at the foot, per caller */
  const petition = () => sprite('pc_petition', 420, 540, 210, 270, (g) => {
    g.fillStyle = C.paper; g.beginPath(); g.roundRect(-210, -270, 420, 540, 6); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center';
    g.font = FONT(74); g.fillText('PETITION', 0, -178); g.font = FONT(20, 'ArchivoBlack-400'); g.fillText('FOR A WAIVER', 0, -144); g.fillRect(-160, -130, 320, 4);
    g.font = FONT(44); g.fillText('NO CONSENT NEEDED', 0, -74); g.font = FONT(25, 'ArchivoBlack-400'); g.fillText('FOR POLITICAL CALLS', 0, -36); g.fillText('TO CELLPHONES', 0, -4);
    g.font = FONT(17, 'ArchivoBlack-400'); g.fillStyle = 'rgba(21,18,15,.7)'; g.fillText('AI AND RECORDED VOICES', 0, 24);
    g.strokeStyle = C.ink; g.lineWidth = 4; g.strokeRect(-170, 44, 340, 92); g.fillStyle = C.ink; g.font = FONT(42); g.fillText('MAX. 3 CALLS / 30 DAYS', 0, 98, 320);
    g.font = '700 22px "Kalam-700"'; g.fillText('per caller', 0, 126);
    g.fillStyle = 'rgba(21,18,15,.22)'; for (let i = 0; i < 4; i++) g.fillRect(-170, 162 + i * 20, i === 3 ? 180 : 340, 7);
    g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 248); g.bezierCurveTo(70, 220, 90, 260, 120, 236); g.bezierCurveTo(140, 222, 150, 250, 172, 240); g.stroke();   // a signature, no name
  }, 9);
  /** the stamp in a gloved fist, the sleeve running off up to the right; origin at the pad */
  const stampArm = () => sprite('pc_stamp', 760, 640, 220, 600, (g) => {
    g.fillStyle = C.sleeve; g.beginPath(); g.moveTo(10, -232); g.lineTo(60, -128); g.lineTo(560, -440); g.lineTo(520, -560); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(40, -170); g.lineTo(60, -128); g.lineTo(560, -440); g.lineTo(545, -470); g.closePath(); g.fill();
    g.fillStyle = C.paper; g.save(); g.translate(46, -186); g.rotate(-0.55); g.fillRect(-14, -52, 28, 104); g.restore();          // the cuff
    g.fillStyle = '#1d1a18'; g.fillRect(-116, -16, 232, 16);                                                                     // the rubber
    g.fillStyle = C.stamp; g.beginPath(); g.roundRect(-110, -74, 220, 60, 6); g.fill(); g.fillStyle = C.stampL; g.fillRect(-104, -70, 208, 8); g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-110, -26, 220, 12);
    g.fillStyle = C.brass; g.fillRect(-40, -96, 80, 24);
    g.fillStyle = C.woodD; g.fillRect(-17, -178, 34, 84);
    g.fillStyle = C.stampL; g.beginPath(); g.ellipse(0, -196, 46, 30, 0, 0, TAU); g.fill();
    g.fillStyle = C.ink; g.beginPath(); g.roundRect(-52, -190, 104, 78, 24); g.fill(); g.beginPath(); g.roundRect(-74, -168, 44, 26, 13); g.fill();
    g.strokeStyle = 'rgba(255,240,210,.2)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-18 + i * 26, -184); g.lineTo(-18 + i * 26, -166); g.stroke(); }
  }, 10);
  /** the stamp hovering at (x, y): a shadow on whatever is under it, deeper as it dips */
  function stampAt(c, x, y, below, lt) {
    const gap = Math.max(20, below - y), a = clamp(0.5 - gap / 900, 0.12, 0.45);
    c.save(); c.filter = 'blur(10px)'; c.fillStyle = `rgba(0,0,0,${a})`; c.beginPath(); c.ellipse(x + 40 + gap * 0.12, below, 120 + gap * 0.1, 22, 0, 0, TAU); c.fill(); c.restore();
    put(c, stampArm(), x, y, { rot: Math.sin(lt * 1.3) * 0.03, lift: 2.2 });
  }
  // the calendar: October 2026 starts on a Thursday, November 2026 on a Sunday (US calendars start the week on Sunday)
  const CAL = { w: 640, h: 720, cell: 88, row: 100, gx: -308, gy: 200 };
  const calPage = (month, first, days) => sprite(`pc_cal_${month}`, CAL.w, CAL.h, CAL.w / 2, 0, (g) => {
    g.fillStyle = C.paper; g.beginPath(); g.roundRect(-CAL.w / 2, 0, CAL.w, CAL.h, 8); g.fill();
    g.fillStyle = C.ochre; g.beginPath(); g.roundRect(-CAL.w / 2, 0, CAL.w, 132, [8, 8, 0, 0]); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = FONT(84); g.fillText(month, -CAL.w / 2 + 34, 104); g.textAlign = 'right'; g.font = FONT(34, 'ArchivoBlack-400'); g.fillText('2026', CAL.w / 2 - 30, 100);
    g.textAlign = 'center'; g.font = FONT(26, 'ArchivoBlack-400'); g.fillStyle = 'rgba(21,18,15,.6)';
    'SMTWTFS'.split('').forEach((d, i) => g.fillText(d, CAL.gx + i * CAL.cell + CAL.cell / 2, 182));
    g.strokeStyle = 'rgba(21,18,15,.18)'; g.lineWidth = 2;
    for (let r = 0; r <= 5; r++) { g.beginPath(); g.moveTo(CAL.gx, CAL.gy + r * CAL.row); g.lineTo(CAL.gx + 7 * CAL.cell, CAL.gy + r * CAL.row); g.stroke(); }
    for (let i = 0; i <= 7; i++) { g.beginPath(); g.moveTo(CAL.gx + i * CAL.cell, CAL.gy); g.lineTo(CAL.gx + i * CAL.cell, CAL.gy + 5 * CAL.row); g.stroke(); }
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = FONT(38);
    for (let d = 1; d <= days; d++) { const i = first + d - 1; g.fillText(String(d), CAL.gx + (i % 7) * CAL.cell + 10, CAL.gy + Math.floor(i / 7) * CAL.row + 42); }
  }, 10);
  /** the middle of a date's number (printed at its cell's top left), where the marker goes */
  const numC = (first, d) => { const i = first + d - 1; return [CAL.gx + (i % 7) * CAL.cell + 10 + (d > 9 ? 20 : 10), CAL.gy + Math.floor(i / 7) * CAL.row + 27]; };
  /** a marker stroke drawn along a polyline up to k (0..1) */
  function stroke(c, pts, k, col = C.mag, w = 9) {
    if (k <= 0) return; let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    let left = L * clamp(k, 0, 1); c.save(); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && left > 0; i++) { const f = Math.min(1, left / seg[i - 1]); c.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); left -= seg[i - 1]; }
    c.stroke(); c.restore();
  }
  const wobble = (cx, cy, rx, ry, a0 = -2.2, turns = 1.12, seed = 3) => { const r = U.rng(seed), n = 60; return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (i / n) * TAU * turns, w = 1 + (r() - 0.5) * 0.05 + i / n * 0.08; return [cx + Math.cos(a) * rx * w, cy + Math.sin(a) * ry * w]; }); };
  /** a wall clock, its second hand ticking */
  function clock(c, x, y, r, lt) {
    c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 14; c.shadowOffsetX = 8; c.shadowOffsetY = 10; c.fillStyle = C.woodD; c.beginPath(); c.arc(x, y, r + 10, 0, TAU); c.fill(); c.restore();
    c.fillStyle = C.paper; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.fillStyle = C.ink; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; c.fillRect(x + Math.cos(a) * r * 0.82 - 3, y + Math.sin(a) * r * 0.82 - 3, 6, 6); }
    const hand_ = (a, len, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); c.stroke(); };
    hand_(-Math.PI / 2 + 0.9, r * 0.5, 7, C.ink); hand_(-Math.PI / 2 + 4.4, r * 0.72, 5, C.ink); hand_((Math.floor(lt) / 60) * TAU - Math.PI / 2 + 1.2, r * 0.8, 2.5, C.mag);
  }

  // ═══ 1 · the question: the kitchen at night, the form unsigned; on "without asking" the phone lights up UNKNOWN ═══
  SCENES.pc_table = { draw(c, lt) {
    const ID = 'pc_table', tR = at(ID, 'ring', 4.0), d = dur(ID), on = clamp((lt - tR) / 0.1, 0, 1);
    const cam = { x: Math.sin(lt * 0.35) * 8, y: 0, z: punch(lt, [tR]) * lerp(1.0, 1.05, ease.io(lt / d)), fx: 600, fy: 1250 };
    stack(c, [
      { sh: street(), d: 0.03, lift: 0 },
      { fn: (g, ox, oy) => lamps(g, [1, 0, 0, 0], ox, oy), d: 0.03 },
      { sh: kWall(), d: 0.08, lift: 1.2 },
      { fn: (g, ox, oy) => { glass(g, ox, oy); glow(g, 470 + ox, 1250 + oy, 560, 'rgba(255,214,140,', 0.14); }, d: 0.08 },
      { sh: kTable(), d: 0.12, lift: 0.8 },
      { fn: (g, ox, oy) => { props(g, ox, oy); phone(g, PHX + ox, TY + oy, { on, buzz: on > 0 ? (lt - tR) % 1.1 : -1 }); }, d: 0.12 },
    ], cam);
    tag(c, ui('tag1', 'USA · FCC · DA 26-940'), lt, d);
    box(c);
  } };

  // ═══ 2 · today: only with consent. Close on the form; on "consent" SIGN HERE lands on the empty line and the phone goes dark ═══
  const tiles = () => sheet('pc_tiles', (g) => {
    g.fillStyle = C.tile; g.fillRect(-90, -90, W + 180, 1700);
    g.strokeStyle = C.tileD; g.lineWidth = 4;
    for (let row = 0; row * 120 < 1700; row++) { const y = -90 + row * 120; g.beginPath(); g.moveTo(-90, y); g.lineTo(W + 90, y); g.stroke(); for (let x = -90 + (row % 2) * 60; x < W + 90; x += 120) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 120); g.stroke(); } }
    g.fillStyle = 'rgba(46,34,50,.10)'; g.fillRect(-90, -90, W + 180, 1700);
  }, 12);
  const clothNear = () => sheet('pc_cloth', (g) => {
    g.fillStyle = C.cloth; g.fillRect(-90, 1530, W + 180, 600);
    g.fillStyle = 'rgba(201,154,46,.30)'; for (let y = 1530; y < 2100; y += 120) g.fillRect(-90, y, W + 180, 60); for (let x = -90; x < W + 90; x += 120) g.fillRect(x, 1530, 60, 600);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-90, 1530, W + 180, 10);
  }, 12);
  const signTab = () => sprite('pc_tab_' + ui('sign', 'SIGN HERE'), 300, 80, 0, 40, (g) => {
    g.fillStyle = C.ochre; g.beginPath(); g.moveTo(0, 0); g.lineTo(44, -36); g.lineTo(290, -36); g.lineTo(290, 36); g.lineTo(44, 36); g.closePath(); g.fill();
    g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; fit(g, ui('sign', 'SIGN HERE'), 220, 32, 'ArchivoBlack-400'); g.fillText(ui('sign', 'SIGN HERE'), 168, 2);
  }, 7);
  SCENES.pc_form = { draw(c, lt) {
    const ID = 'pc_form', tC = at(ID, 'consent', 2.4), d = dur(ID), FX = 500, FY = 1540, rot = -0.025;
    const kt = ease.back((lt - tC) / 0.3), off = clamp(1 - (lt - tC) / 0.25, 0, 1);
    const cam = { x: Math.sin(lt * 0.4) * 6, y: 0, z: punch(lt, [tC], { kick: 0.03 }) * lerp(1.0, 1.08, ease.io(lt / d)), fx: 560, fy: 1360 };
    // where the signature line is, on the form as it leans
    const lx = (px, py) => FX + px * Math.cos(rot) - py * Math.sin(rot), ly = (px, py) => FY + px * Math.sin(rot) + py * Math.cos(rot);
    stack(c, [
      { sh: tiles(), d: 0.05, lift: 0 },
      { fn: (g, ox, oy) => glow(g, 560 + ox, 1100 + oy, 760, 'rgba(255,214,140,', 0.12), d: 0.05 },
      { sh: clothNear(), d: 0.1, lift: 0.5 },
      { fn: (g, ox, oy) => {
        put(g, mug(), 40 + ox, 1560 + oy, { sc: 1.7, lift: 1.2 });
        put(g, formBig(), FX + ox, FY + oy, { rot, lift: 1.4 });
        put(g, pen(), 560 + ox, 1610 + oy, { rot: 0.08, sc: 1.6, lift: 0.8 });
        g.save(); g.translate(1015 + ox, 1580 + oy); g.scale(1.65, 1.65); phone(g, 0, 0, { on: off, buzz: off > 0 ? lt % 1.1 : -1 }); g.restore();
        if (lt > tC) { const ex = lx(112, -150), ey = ly(112, -150); put(g, signTab(), ex + lerp(260, 0, clamp(kt, 0, 1.2)) + ox, ey + oy, { rot, sc: lerp(1.3, 1, clamp(kt, 0, 1)), lift: lerp(3, 1, clamp(kt, 0, 1)) }); }
      }, d: 0.18 },
    ], cam);
    box(c);
  } };

  // ═══ 3 · the request: a petition slides across the FCC's desk on "asked"; the stamp hovers over it and does not come down ═══
  SCENES.pc_desk = { draw(c, lt) {
    const ID = 'pc_desk', tS = at(ID, 'slide', 0.6), tA = at(ID, 'asked', 1.1), d = dur(ID);
    const ks = ease.out((lt - tS) / Math.max(0.2, tA - tS)), px = lerp(-330, 540, ks), land = lt > tA ? Math.exp(-(lt - tA) * 9) * Math.sin((lt - tA) * 40) * 0.02 : 0;
    const out = ease.io((lt - tA - 0.7) / 0.6), hx = px - 270 - out * 600;
    const dip = lt > tA ? Math.sin(clamp((lt - tA - 0.15) / 1.1, 0, 1) * Math.PI) * 70 : 0;      // it comes down a little, and goes back up
    const sy = 860 + Math.sin(lt * 1.6) * 16 + dip;
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [tA]) * lerp(1.0, 1.05, ease.io(lt / d)), fx: 540, fy: 1150 };
    stack(c, [
      { sh: oWall(), d: 0.04, lift: 0 },
      { fn: (g, ox, oy) => { for (const x of [250, 540, 830]) put(g, chair(), x + ox, DB + 12 + oy, { lift: 1.1 }); }, d: 0.07 },
      { sh: oDesk(), d: 0.1, lift: 1.0 },
      { fn: (g, ox, oy) => {
        g.save(); g.translate(px + ox, 1215 + oy); g.scale(1 + land, 0.84 * (1 - land)); put(g, petition(), 0, 0, { rot: -0.035 + (1 - ks) * 0.12, lift: lt < tA ? 1.6 : 0.7 }); g.restore();
        if (out < 1) hand(g, hx + ox, 1250 + oy, 0.8, Math.PI / 2, { sleeve: C.sleeve, cuff: C.paperD });
        stampAt(g, 650 + ox, sy + oy, 1215 + oy, lt);
      }, d: 0.14 },
    ], cam);
    tag(c, ui('tag3', 'PETITION · 31.8.2026'), lt, d);
    box(c);
  } };

  // ═══ 4 · the timing: on the calendar, 19 October crossed out (CLOSED); the page tears to November; on the pop, 3 circled ═══
  SCENES.pc_cal = { draw(c, lt) {
    const ID = 'pc_cal', tX = at(ID, 'closed', 1.4), tF = at(ID, 'flip', 1.8), tN = at(ID, 'nov', 3.0), d = dur(ID);
    const HX = 540, HY = 600, CS = 1.2, kf = ease.out((lt - tF) / 0.5);
    const cam = { x: Math.sin(lt * 0.33) * 6, y: 0, z: punch(lt, [tX, tN], { kick: 0.03 }) * lerp(1.0, 1.05, ease.io(lt / d)), fx: 540, fy: 1000 };
    const [x19, y19] = numC(4, 19), [x3, y3] = numC(0, 3);
    stack(c, [
      { sh: oWall(), d: 0.04, lift: 0 },
      { fn: (g, ox, oy) => { clock(g, 150 + ox, 516 + oy, 56, lt); }, d: 0.06 },
      { fn: (g, ox, oy) => {
        g.save(); g.translate(HX + ox, HY + oy); g.scale(CS, CS);                       // the calendar, in its own coordinates (0, 0 = the nail)
        g.fillStyle = C.steelD; g.beginPath(); g.arc(0, -18, 8, 0, TAU); g.fill();
        put(g, calPage('NOVEMBER', 0, 30), 0, 0, { lift: 1.1 });
        if (lt > tN) {
          const k = clamp((lt - tN) / 0.38, 0, 1);
          stroke(g, wobble(x3, y3, 40, 36, -2.4, 1.1, 7), k);
          if (k > 0.6) { g.save(); g.globalAlpha = clamp((k - 0.6) / 0.3, 0, 1); g.fillStyle = C.mag; g.textAlign = 'left'; fit(g, ui('election', 'ELECTION DAY'), 300, 46, 'Caveat-600'); g.fillText(ui('election', 'ELECTION DAY'), x3 + 50, y3 + 52); g.restore(); }
        }
        if (kf < 1) {                                                            // October, torn off upward and away
          g.save(); g.translate(kf * 260, -kf * 420 + kf * kf * 160); g.rotate(-kf * 0.7); g.globalAlpha = 1 - kf * 0.5;
          put(g, calPage('OCTOBER', 4, 31), 0, 0, { lift: 1.1 + kf * 3 });
          const kx = clamp((lt - tX) / 0.32, 0, 1);
          stroke(g, [[x19 - 30, y19 - 26], [x19 + 30, y19 + 26]], kx * 2); stroke(g, [[x19 + 30, y19 - 26], [x19 - 30, y19 + 26]], kx * 2 - 1);
          if (kx > 0.7) { g.fillStyle = C.mag; g.textAlign = 'center'; fit(g, ui('closed', 'CLOSED'), 150, 34, 'Caveat-600'); g.fillText(ui('closed', 'CLOSED'), x19 + 14, y19 + 62); }
          g.restore();
        }
        g.fillStyle = C.steel; for (let i = -4; i <= 4; i++) { g.beginPath(); g.roundRect(i * 64 - 6, -14, 12, 30, 6); g.fill(); }   // the binding
        g.restore();
      }, d: 0.1 },
      { fn: (g, ox, oy) => stampAt(g, 800 + ox, 690 + Math.sin(lt * 1.5) * 14 + oy, 790 + oy, lt), d: 0.16 },
    ], cam);
    box(c);
  } };

  // ═══ 5 · the answer: the proposed limit is three AI calls a month — and on "per caller" the street lamps come on over the
  //       queue; their calls land on the table in threes until the pile shoves the phone off the edge ═══
  SCENES.pc_end = { draw(c, lt) {
    const ID = 'pc_end', tP = at(ID, 'caller', 2.0), d = dur(ID), tau = lt - tP;
    const S = PCP.at(Math.max(PCP.SIM0, tau));
    const z = lerp(1.08, 1.0, ease.io((tau + 0.05) / 0.9));
    const cam = { x: Math.sin(lt * 0.35) * 6, y: 0, z: z * punch(lt, [tP], { open: 0.02, kick: 0.02 }), fx: 520, fy: 1060 };
    const lampOn = [1, ...[0, 0.12, 0.24].map((t0) => clamp((tau - t0) / 0.08, 0, 1))];
    const born = S.cards.filter((b) => b.pcCard.born <= S.t - 0.3).length, last = S.cards.length ? S.t - S.cards[S.cards.length - 1].pcCard.born : -1;
    stack(c, [
      { sh: street(), d: 0.03, lift: 0 },
      { fn: (g, ox, oy) => { lamps(g, lampOn, ox, oy); for (let k = QX.length - 1; k >= 0; k--) caller(g, k, lt, k === 0 ? 1 : clamp((tau - 0.02 - k * 0.055) / 0.16, 0, 1), ox, oy); }, d: 0.03 },
      { sh: kWall(), d: 0.08, lift: 1.2 },
      { fn: (g, ox, oy) => { glass(g, ox, oy); glow(g, 470 + ox, 1250 + oy, 560, 'rgba(255,214,140,', 0.14); }, d: 0.08 },
      { sh: kTable(), d: 0.12, lift: 0.8 },
      { fn: (g, ox, oy) => {
        props(g, ox, oy);
        // a card is a rectangle, so turned half a turn it fills exactly the same space: it is drawn the right way up,
        // and every 1/3, 2/3, 3/3 on the pile stays readable however it landed
        for (const b of S.cards) { const age = S.t - b.pcCard.born, k = ease.out(age / 0.16), rot = b.angle - Math.PI * Math.round(b.angle / Math.PI);
          g.save(); g.globalAlpha = clamp(age / 0.08, 0, 1); put(g, card(b.pcCard.k, b.pcCard.j), b.position.x + ox, b.position.y + oy, { rot, sc: lerp(0.55, 1, k), lift: lerp(0.3, 0.8, k) }); g.restore(); }
        // the phone is drawn over the pile, so it stays in sight while it is shoved, tips and goes over the edge
        const p = S.phone.position, o = S.off;
        g.save(); g.translate(p.x + ox, p.y + oy); g.rotate(S.phone.angle); phone(g, o.x, o.y, { on: 1, count: born, buzz: last >= 0 && last < 0.6 ? last : -1 }); g.restore();
      }, d: 0.12 },
    ], cam);
    tag(c, ui('tag5', 'A REQUEST · NOT YET RULED'), lt, d);
    box(c);
  } };

  window.PC = { PCP, at, dur, ui };
})();
