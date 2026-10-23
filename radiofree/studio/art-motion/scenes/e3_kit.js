// THE KIT for "Ends in 3" (Global 2): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline.
// One question: should a phone need its owner's ID to work? A paper street in Mexico at dusk: every masked passer-by
// holds a phone, and each phone shows one big digit, the last digit of its line. On "work" they all light. At a
// registry counter a red string ties a phone to an ID card, pulled tight on "extortion and fraud" (the reason the
// regulator gives). On a wall calendar of last digits a red marker has crossed out 0, 1 and 2, crosses out the 3,
// and a tally rolls to 2,248,143 on "2.2 million"; then it crosses out the 4 and rings the 5 (next, 31/10). Back on
// the street the unlinked 3s go grey; on "linked" one owner holds up an ID card and the phone comes back. Then the
// alert: on "gets through" every phone on the street lights at once, the grey ones too, with the same alert screen.
// Never a quake, never damage, nobody runs (plan/films/23-ends-in-3.md).
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs), so
// the phones light on "work", the knot on "extortion and fraud", the tally on "2.2 million", the phone on "linked" and
// the alert on "gets through" in every language. Everything is a pure function of the shot's local time.
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, glow, walker, fist, K } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = window.FILM_PLAN || { shots: [], cues: {}, ui: {} };
  const shotOf = (id) => FP.shots.find((s) => s.id === id) || { t0: 0, dur: 6.428571 };
  const at = (id, name, d = 0) => { const v = FP.cues[`${id}.${name}`]; return v === undefined ? d : v - shotOf(id).t0; };
  const dur = (id) => shotOf(id).dur;
  const ui = (k, d) => (FP.ui && FP.ui[k]) || d;
  const ease = {
    out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3),
    io: (k) => { k = clamp(k, 0, 1); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    back: (k) => { k = clamp(k, 0, 1); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
    in: (k) => Math.pow(clamp(k, 0, 1), 3),
  };
  /** the camera's small breath on a cut and a kick on each hit */
  function punch(lt, hits = [], { open = 0.04, settle = 0.35, kick = 0.025 } = {}) {
    let z = 1 + open * (1 - ease.out(lt / settle));
    for (const h of hits) if (lt >= h) z += kick * Math.exp(-(lt - h) * 7) * (1 - Math.exp(-(lt - h) * 60));
    return z;
  }
  const JP = '"NotoSansJP-800"';

  const C = {
    sky: ['#101528', '#171d36', '#232543', '#36294a', '#523050', '#74394c', '#934a44'],
    farB: '#1e1b33', farL: '#2a2541',
    fac: ['#9c4a32', '#c98f3a', '#2f6b68', '#b5566a', '#7d5a3c', '#3f5f88', '#c27a46'], facD: 'rgba(0,0,0,.22)',
    winLit: '#ffd98a', winDark: '#1e1a1c', trim: '#e8dcc0', iron: '#1a1716',
    walk: '#4a3e36', walkL: '#5c4d42', kerb: '#6b5a4b', road: '#221d1c', roadL: '#2c2624', lampPost: '#141110', lamp: '#ffd98a',
    coats: ['#2a3a46', '#3a2f45', '#2f4a3a', '#4a3a2a', '#283848', '#3d3040', '#26413f', '#45352a', '#2d3a4f', '#3b4434'],
    phone: '#17181b', phoneL: '#2a2c30', screen: '#e6f4f2', screenD: '#c7dedb', digit: '#15120f',
    grey: '#36373b', greyD: '#46474c', alert: '#e8452c', alertD: '#b83220', white: '#fff7ea',
    // the registry
    wall: ['#2c3433', '#323b39', '#38423f'], wallL: '#425049', counter: '#4a3020', counterL: '#6a4630', counterD: '#2e1d13', counterTop: '#7a5636', counterTopL: '#8e6743',
    card: '#efe6cf', cardD: '#d8cdb2', band: '#2f5f8a', bandD: '#234a6c', photo: '#b9c3c6', bar: '#9f957f', thread: '#d8402f',
    sign: '#e8dcc0', signD: '#c9bc9c', signInk: '#1f2a2c',
    // the calendar
    cwall: ['#3a2a24', '#41302a', '#48362e'], calPaper: '#f3ead4', calPaperD: '#d8cdb2', calRule: '#cbbf9f', calHead: '#a8321e', calHeadD: '#7e2416', ring: '#9aa0a6', ringD: '#5d6267',
    tallyBg: '#1c1a19', tallyCell: '#2b2826', tallyDigit: '#f3ead4', red: '#d8402f', ink: '#15120f',
  };

  /** the where/what tag in the lower corner (the house look), with a Japanese face behind the Latin one */
  function tag(c, text, lt, dd, x = 110) {
    const y = R.SAFE_B - 66, a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dd - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = `32px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }

  // ── the phone: a dark slab, its screen off, lit with its last digit, grey (cut off), or showing the alert ─────────
  const PH = { w: 120, h: 214, sw: 104, sh: 188 };
  /** the alert's icon, white on the alert red: a triangle with a seismograph trace in it, at (0, 0), size s */
  function alertIcon(g, s, col = C.white) {
    g.save(); g.scale(s, s); g.strokeStyle = col; g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(0, -40); g.lineTo(42, 32); g.lineTo(-42, 32); g.closePath(); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(-26, 14); g.lineTo(-14, 14); g.lineTo(-8, -4); g.lineTo(0, 26); g.lineTo(7, -10); g.lineTo(13, 14); g.lineTo(26, 14); g.stroke();
    g.restore();
  }
  const phoneSp = (state, digit) => sprite(`e3_ph_${state}_${digit}`, PH.w + 10, PH.h + 10, PH.w / 2 + 5, PH.h / 2 + 5, (g) => {
    g.fillStyle = C.phone; g.beginPath(); g.roundRect(-PH.w / 2, -PH.h / 2, PH.w, PH.h, 18); g.fill();
    g.fillStyle = C.phoneL; g.fillRect(-PH.w / 2 + 6, -PH.h / 2 + 4, PH.w - 12, 3);
    const sx = -PH.sw / 2, sy = -PH.sh / 2, scr = new Path2D(); scr.roundRect(sx, sy, PH.sw, PH.sh, 12);
    g.save(); g.clip(scr);
    if (state === 'off') { g.fillStyle = '#0b0c0e'; g.fillRect(sx, sy, PH.sw, PH.sh); g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 50, sy); g.lineTo(sx, sy + 90); g.fill(); }
    else if (state === 'lit' || state === 'grey' || state === 'back') {
      g.fillStyle = state === 'grey' ? C.grey : C.screen; g.fillRect(sx, sy, PH.sw, PH.sh);
      if (state !== 'grey') { g.fillStyle = C.screenD; g.fillRect(sx, sy, PH.sw, 16); }
      g.fillStyle = state === 'grey' ? C.greyD : C.digit; g.textAlign = 'center'; g.font = '400 132px "Anton-400"'; g.fillText(String(digit), 0, 46);
      if (state === 'back') { g.fillStyle = '#2f7d4f'; g.beginPath(); g.arc(30, -66, 22, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(19, -66); g.lineTo(27, -57); g.lineTo(41, -76); g.stroke(); }
    } else if (state === 'alert') {
      g.fillStyle = C.alert; g.fillRect(sx, sy, PH.sw, PH.sh); g.fillStyle = C.alertD; g.fillRect(sx, sy + PH.sh - 40, PH.sw, 40);
      g.translate(0, -12); alertIcon(g, 0.95);
    }
    g.restore();
  }, 6);
  /** the ID card: a cream card, a blue band, a photo of a mask, two lines and a long number */
  const idSp = () => sprite('e3_id', 230, 150, 115, 75, (g) => {
    g.fillStyle = C.cardD; g.beginPath(); g.roundRect(-112, -71, 226, 146, 14); g.fill();
    g.fillStyle = C.card; g.beginPath(); g.roundRect(-114, -74, 226, 146, 14); g.fill();
    g.fillStyle = C.band; g.beginPath(); g.roundRect(-114, -74, 226, 34, [14, 14, 0, 0]); g.fill();
    g.fillStyle = C.card; g.font = '400 22px "ArchivoBlack-400"'; g.textAlign = 'left'; g.fillText('ID', -98, -48);
    g.fillStyle = C.photo; g.fillRect(-98, -28, 66, 80);
    g.fillStyle = K.mag; g.beginPath(); g.arc(-65, 2, 21, 0, TAU); g.fill(); g.fillStyle = '#2a3a46'; g.beginPath(); g.moveTo(-94, 52); g.quadraticCurveTo(-65, 22, -36, 52); g.closePath(); g.fill();
    g.fillStyle = C.bar; g.fillRect(-20, -22, 112, 10); g.fillRect(-20, -2, 86, 10);
    g.fillStyle = C.ink; g.font = '400 15px "ArchivoBlack-400"'; g.fillText('CURP', -20, 28);
    g.fillStyle = C.bandD; for (let i = 0; i < 18; i++) g.fillRect(-20 + i * 6.2, 36, 4, 12);
  }, 6);

  // ── the street ──────────────────────────────────────────────────────────────────────────────────────────────────
  const sky = () => sheet('e3_sky', (g) => {
    const step = 1150 / C.sky.length;
    C.sky.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-90, i ? i * step : -90); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, i * step + Math.sin(x * 0.006 + i) * 12); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill(); });
  }, 10);
  const far = () => sheet('e3_far', (g) => {
    const r = U.rng(4); let x = -90;
    while (x < W + 90) { const w = 70 + r() * 150, h = 160 + r() * 260; g.fillStyle = r() < 0.5 ? C.farB : C.farL; g.fillRect(x, 980 - h, w, h + 200); if (r() < 0.35) { g.fillRect(x + w * 0.4, 980 - h - 70, 10, 70); } x += w + 4; }
    // a far church dome and a tower: a city, not a place
    g.fillStyle = C.farL; g.beginPath(); g.arc(700, 640, 70, Math.PI, TAU); g.fill(); g.fillRect(630, 640, 140, 300); g.fillRect(694, 540, 12, 40);
  }, 12);
  /** the near facades: low colourful card buildings with lit and dark windows, balconies, a door or two */
  const FACS = [[-90, 230, 560, 0], [140, 210, 640, 1], [350, 260, 600, 2], [610, 200, 520, 3], [810, 220, 620, 4], [1030, 160, 580, 5]];
  const near = () => sheet('e3_near', (g) => {
    const base = 1120, r = U.rng(11);
    for (const [x, w, top, ci] of FACS) {
      g.fillStyle = C.fac[ci]; g.fillRect(x, top, w, base - top);
      g.fillStyle = C.facD; g.fillRect(x + w - 10, top, 10, base - top);
      g.fillStyle = C.trim; g.fillRect(x - 4, top - 14, w + 8, 16);                     // the parapet
      for (let wy = top + 50; wy < base - 200; wy += 130) for (let wx = x + 28; wx < x + w - 60; wx += 78) {
        g.fillStyle = r() < 0.55 ? C.winLit : C.winDark; g.fillRect(wx, wy, 42, 66);
        g.fillStyle = C.trim; g.fillRect(wx - 5, wy + 66, 52, 6);
        if (r() < 0.4) { g.fillStyle = C.iron; g.fillRect(wx - 10, wy + 54, 62, 4); for (let k = 0; k < 6; k++) g.fillRect(wx - 8 + k * 11, wy + 54, 3, 24); }
      }
      g.fillStyle = C.winDark; g.fillRect(x + w / 2 - 34, base - 150, 68, 150);           // a door
      g.fillStyle = C.trim; g.fillRect(x + w / 2 - 40, base - 158, 80, 8);
    }
    // the pavement, the kerb, the road
    g.fillStyle = C.walk; g.fillRect(-90, base, W + 180, 120); g.fillStyle = C.walkL; g.fillRect(-90, base, W + 180, 6);
    g.fillStyle = C.kerb; g.fillRect(-90, base + 120, W + 180, 14);
    g.fillStyle = C.road; g.fillRect(-90, base + 134, W + 180, H); g.fillStyle = C.roadL; for (let x = -60; x < W + 90; x += 220) g.fillRect(x, base + 420, 120, 10);
    // two street lamps
    for (const lx of [60, 1000]) { g.fillStyle = C.lampPost; g.fillRect(lx - 7, 640, 14, base - 630); g.fillRect(lx - 7, 640, 60 * (lx < 500 ? 1 : -1), 10); g.fillStyle = C.lamp; g.beginPath(); g.arc(lx + 52 * (lx < 500 ? 1 : -1), 660, 14, 0, TAU); g.fill(); }
  }, 14);
  function lamps(g, ox, oy) { for (const lx of [60, 1000]) glow(g, lx + 52 * (lx < 500 ? 1 : -1) + ox, 660 + oy, 300, 'rgba(255,214,140,', 0.4); }

  // the people: two rows, each with a phone and its last digit. Three of them end in 3: two are unlinked, one is linked.
  // the back row stands between the front row's shoulders, so no phone hides behind a head
  const BACK = [8, 3, 6].map((d, i) => ({ d, x: 300 + i * 240, y: 1085, s: 0.5, side: 1, coat: C.coats[i], ph: 0.64 }));
  const FRONT = [7, 3, 5, 3].map((d, i) => ({ d, x: 170 + i * 240, y: 1275, s: 0.68, side: 1, coat: C.coats[4 + i], ph: 0.84 }));
  const NB = BACK.length;
  const CUT = [NB + 1, 1];            // the unlinked 3s: front row's second, back row's second (indices into back + front)
  const BACKAGAIN = NB + 1;          // the one that is linked again on "linked"
  /**
   * One person with the phone held up in front of the chest. `state` is the phone's screen; `raise` lifts it toward
   * the face; `id` 0..1 brings an ID card up in the other hand; `tap` jiggles the phone (a tap on a dead screen).
   */
  function person(g, p, lt, ox, oy, { state = 'lit', raise = 0, id = 0, tap = 0, glowA = 0, look = 0 } = {}) {
    const x = p.x + ox, y = p.y + oy, s = p.s;
    walker(g, x, y, s, { coat: p.coat, scarf: K.red, t: lt + p.x * 0.013, led: false, look });
    const px = x + p.side * 64 * s, py = y + lerp(178, 120, raise) * s + Math.sin(tap * 40) * 6 * tap;
    // the arm: a sleeve from the shoulder down and in to the phone, a glove round its foot
    const sx = x + p.side * 96 * s, sy = y + 56 * s, ax = px - sx, ay = py + PH.h * 0.3 * p.ph - sy, al = Math.hypot(ax, ay);
    g.save(); g.translate(sx, sy); g.rotate(Math.atan2(ay, ax)); g.fillStyle = p.coat; g.beginPath(); g.roundRect(0, -24 * s, al, 48 * s, 18 * s); g.fill(); g.restore();
    put(g, phoneSp(state, p.d), px, py, { sc: p.ph, lift: 0.9 });
    g.fillStyle = K.ink; g.beginPath(); g.roundRect(px - 34 * p.ph, py + PH.h * 0.22 * p.ph, 68 * p.ph, 52 * p.ph, 16 * p.ph); g.fill();
    if (glowA > 0) glow(g, px, py, 210 * p.ph, state === 'alert' ? 'rgba(255,110,70,' : 'rgba(170,230,255,', glowA);
    if (id > 0) {
      const ix = x - p.side * 140 * s, iy = y + lerp(320, -170, ease.back(id)) * s;
      const qx = x - p.side * 96 * s, qy = y + 56 * s, bx = ix - qx, by = iy + 40 * s - qy;
      g.save(); g.translate(qx, qy); g.rotate(Math.atan2(by, bx)); g.fillStyle = p.coat; g.beginPath(); g.roundRect(0, -24 * s, Math.hypot(bx, by), 48 * s, 18 * s); g.fill(); g.restore();
      put(g, idSp(), ix, iy, { sc: s * 1.25, rot: -p.side * 0.12, lift: 0.9 });
      g.fillStyle = K.ink; g.beginPath(); g.roundRect(ix - 40 * s, iy + 40 * s, 80 * s, 56 * s, 18 * s); g.fill();
    }
  }
  /** the whole street: sky, city, facades, lamps, then the back row and the front row */
  function street(c, lt, cam, row) {
    stack(c, [
      { sh: sky(), d: 0.02, lift: 0 },
      { sh: far(), d: 0.05, lift: 0.2 },
      { sh: near(), d: 0.1, lift: 0.5 },
      { fn: (g, ox, oy) => lamps(g, ox, oy), d: 0.1 },
      { fn: (g, ox, oy) => BACK.forEach((p, i) => person(g, p, lt, ox, oy, row(i, p))), d: 0.18 },
      { fn: (g, ox, oy) => FRONT.forEach((p, j) => person(g, p, lt, ox, oy, row(NB + j, p))), d: 0.3 },
    ], cam);
  }

  // ═════════ 1 · e3_street: every phone shows one digit; on "work" they all light ═════════
  SCENES.e3_street = { draw(c, lt) {
    const id = 'e3_street', dd = dur(id), tW = at(id, 'work', 2.1);
    const cam = { x: Math.sin(lt * 0.3) * 8, y: 0, z: punch(lt, [tW], { kick: 0.02 }) * lerp(1.07, 1.13, ease.io(lt / dd)), fx: 540, fy: 1300 };
    street(c, lt, cam, (i) => {
      const t = tW + (i % NB) * 0.045 + (i >= NB ? 0.02 : 0), on = lt >= t;
      return { state: on ? 'lit' : 'off', raise: 0.25 + 0.15 * Math.sin(lt * 0.8 + i), glowA: on ? 0.5 * Math.exp(-(lt - t) * 2) + 0.12 : 0, look: Math.sin(lt * 0.5 + i * 1.7) * 0.15 };
    });
    tag(c, ui('place', 'MEXICO · 2026'), lt, dd);
    box(c);
  } };

  // ═════════ 2 · e3_ledger: a registry counter; a red string ties a phone to an ID card, tight on the pop ═════════
  const office = () => sheet('e3_office', (g) => {
    C.wall.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, -90 + i * 360, W + 180, H + 180); });
    g.fillStyle = C.wallL; g.fillRect(-90, 1010, W + 180, 10);
    // a frosted window behind the queue, evening outside
    g.fillStyle = '#2a3846'; g.fillRect(620, 470, 360, 330); g.fillStyle = '#3a4c5c'; g.fillRect(632, 482, 336, 306); g.fillStyle = C.wall[0]; g.fillRect(794, 470, 12, 330); g.fillRect(620, 630, 360, 12);
  }, 14);
  /** the sign over the counter: a phone, a link, a card — a pictogram, so it needs no language */
  const signSp = () => sprite('e3_sign', 460, 200, 230, 100, (g) => {
    g.fillStyle = C.signD; g.beginPath(); g.roundRect(-222, -86, 452, 184, 14); g.fill();
    g.fillStyle = C.sign; g.beginPath(); g.roundRect(-226, -90, 452, 184, 14); g.fill();
    g.fillStyle = C.signInk; g.beginPath(); g.roundRect(-160, -60, 70, 120, 12); g.fill(); g.fillStyle = C.sign; g.fillRect(-152, -48, 54, 88);
    g.strokeStyle = C.signInk; g.lineWidth = 12; g.lineCap = 'round'; for (const dx of [-26, 26]) { g.beginPath(); g.ellipse(dx, 0, 30, 18, 0, 0, TAU); g.stroke(); }
    g.fillStyle = C.signInk; g.beginPath(); g.roundRect(80, -44, 116, 84, 10); g.fill(); g.fillStyle = C.sign; g.beginPath(); g.arc(112, -4, 16, 0, TAU); g.fill(); g.fillRect(140, -14, 44, 8); g.fillRect(140, 4, 34, 8);
  }, 8);
  const counter = () => sheet('e3_counter', (g) => {
    g.fillStyle = C.counterD; g.beginPath(); g.moveTo(-90, 1150); g.lineTo(W + 90, 1150); g.lineTo(W + 90, 1580); g.lineTo(-90, 1580); g.closePath(); g.fill();
    g.fillStyle = C.counterTop; g.beginPath(); g.moveTo(-60, 1130); g.lineTo(W + 60, 1130); g.lineTo(W + 90, 1560); g.lineTo(-90, 1560); g.closePath(); g.fill();
    g.fillStyle = C.counterTopL; g.fillRect(-60, 1130, W + 120, 8);
    const r = U.rng(5); g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 2; for (let i = 0; i < 16; i++) { const y = 1160 + r() * 390; g.beginPath(); g.moveTo(-90, y); g.bezierCurveTo(300, y + (r() - 0.5) * 20, 700, y + (r() - 0.5) * 20, W + 90, y); g.stroke(); }
    g.fillStyle = C.counter; g.fillRect(-90, 1560, W + 180, H); g.fillStyle = C.counterL; g.fillRect(-90, 1560, W + 180, 8);
    for (let x = 60; x < W; x += 240) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x, 1600, 180, 400); }
  }, 14);
  /** the big phone lying on the counter, lit, its digit a 3 */
  const bigPhone = () => sprite('e3_bigphone', 250, 440, 125, 220, (g) => {
    g.save(); g.scale(1.95, 1.95); g.translate(0, 0);
    g.fillStyle = C.phone; g.beginPath(); g.roundRect(-PH.w / 2, -PH.h / 2, PH.w, PH.h, 18); g.fill();
    g.fillStyle = C.screen; g.beginPath(); g.roundRect(-PH.sw / 2, -PH.sh / 2, PH.sw, PH.sh, 12); g.fill();
    g.fillStyle = C.screenD; g.fillRect(-PH.sw / 2, -PH.sh / 2, PH.sw, 16);
    g.fillStyle = C.digit; g.textAlign = 'center'; g.font = '400 132px "Anton-400"'; g.fillText('3', 0, 46);
    g.restore();
  }, 9);
  /** the string: a loop round the phone and the card, drawn on as it is wound, with a bow that pops at the knot */
  function stringLoop(g, a, b, k, tight, bow) {
    if (k <= 0) return;
    const x0 = Math.min(a[0] - a[2], b[0] - b[2]) - 6, x1 = Math.max(a[0] + a[2], b[0] + b[2]) + 6, yc = (a[1] + b[1]) / 2, hh = lerp(64, 40, tight);
    const pts = [[(x0 + x1) / 2, yc - hh], [x1, yc - hh + 8], [x1 + 4, yc + hh - 8], [(x0 + x1) / 2, yc + hh], [x0 - 4, yc + hh - 8], [x0, yc - hh + 8], [(x0 + x1) / 2, yc - hh]];
    const p = new Path2D(); p.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) { const m = [(pts[i - 1][0] + pts[i][0]) / 2, (pts[i - 1][1] + pts[i][1]) / 2]; p.quadraticCurveTo(pts[i - 1][0], pts[i - 1][1], m[0], m[1]); } p.lineTo(...pts[pts.length - 1]);
    const len = 2 * (x1 - x0) + 4 * hh + 60;
    for (const [dx, dy, col, w] of [[4, 6, 'rgba(0,0,0,.3)', 9], [0, 0, C.thread, 8]]) { g.save(); g.translate(dx, dy); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.setLineDash([len * clamp(k, 0, 1), len + 10]); g.stroke(p); g.restore(); }
    if (bow > 0) {
      const bx = (x0 + x1) / 2, by = yc - hh, sc = 1.6 * ease.back(bow);
      g.save(); g.translate(bx, by); g.scale(sc, sc); g.strokeStyle = C.thread; g.lineWidth = 9; g.lineCap = 'round';
      for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 30, -14, 30, 18, sd * 0.4, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(0, 0); g.lineTo(sd * 22, 46); g.stroke(); }
      g.fillStyle = C.thread; g.beginPath(); g.arc(0, -2, 11, 0, TAU); g.fill(); g.restore();
    }
  }
  // the queue across the counter: masked, ID cards held up
  const QUEUE = [0, 1, 2, 3].map((i) => ({ x: 170 + i * 250, y: 860, s: 0.5, coat: C.coats[2 + i * 2], side: i % 2 ? 1 : -1 }));
  SCENES.e3_ledger = { draw(c, lt) {
    const id = 'e3_ledger', dd = dur(id), tL = at(id, 'lace', 2.3), tT = at(id, 'tie', 4.1);
    const k = (lt - tL) / Math.max(0.5, tT - 0.2 - tL), tight = ease.back((lt - tT) / 0.3), bow = (lt - tT - 0.06) / 0.32;
    const gap = lerp(0, 22, ease.out((lt - tT) / 0.25));
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [tT], { kick: 0.035 }) * lerp(1.0, 1.08, ease.io(lt / dd)), fx: 540, fy: 1300 };
    stack(c, [
      { sh: office(), d: 0.05, lift: 0 },
      { fn: (g, ox, oy) => { put(g, signSp(), 300 + ox, 560 + oy, { lift: 1.2, rot: -0.02 + Math.sin(lt * 0.9) * 0.01 }); glow(g, 540 + ox, 600 + oy, 640, 'rgba(255,230,180,', 0.1); }, d: 0.08 },
      { fn: (g, ox, oy) => QUEUE.forEach((q, i) => {
        walker(g, q.x + ox, q.y + oy, q.s, { coat: q.coat, scarf: K.red, t: lt + i, led: false, look: Math.sin(lt * 0.6 + i) * 0.2 });
        const up = 0.5 + 0.5 * Math.sin(lt * 1.1 + i * 1.3), ix = q.x + ox + q.side * 70 * q.s, iy = q.y + oy + lerp(200, 110, up) * q.s;
        put(g, idSp(), ix, iy, { sc: 0.62, rot: q.side * 0.1, lift: 0.8 });
        g.fillStyle = K.ink; g.beginPath(); g.roundRect(ix - 22, iy + 26, 44, 34, 12); g.fill();
      }), d: 0.14 },
      { sh: counter(), d: 0.24, lift: 0.6 },
      { d: 0.32, fn: (g, ox, oy) => {
        const pa = [360 + gap + ox, 1340 + oy, 118], ca = [740 - gap + ox, 1352 + oy, 140];
        put(g, bigPhone(), pa[0], pa[1], { rot: -0.07, sc: 0.95, lift: 0.5 });
        glow(g, pa[0], pa[1], 220, 'rgba(170,230,255,', 0.18);
        put(g, idSp(), ca[0], ca[1], { rot: 0.05, sc: 1.24, lift: 0.5 });
        stringLoop(g, pa, ca, ease.io(k), clamp(tight, 0, 1.2), bow);
      } },
    ], cam);
    tag(c, ui('registry', 'CRT · LINE REGISTRY · 2026'), lt, dd);
    box(c);
  } };

  // ═════════ 3 · e3_cal: the calendar of last digits; the marker crosses out the 3; the tally rolls to 2,248,143 ═════════
  const GEN = () => rough.generator();
  const SVG = () => document.createElementNS('http://www.w3.org/2000/svg', 'path');
  function mkMark(t0, dd, drawables) {
    const el = SVG();
    const parts = drawables.flatMap((dr) => GEN().toPaths(dr)).filter((p) => p.d && p.stroke !== 'none').map((p) => { el.setAttribute('d', p.d); return { p: new Path2D(p.d), d: p.d, len: el.getTotalLength(), stroke: p.stroke, w: p.strokeWidth || 6 }; });
    const first = parts[0], last = parts[parts.length - 1];
    el.setAttribute('d', first.d); const a = el.getPointAtLength(0); el.setAttribute('d', last.d); const b = el.getPointAtLength(last.len);
    return { t0, dur: dd, parts, total: parts.reduce((s, q) => s + q.len, 0), start: [a.x, a.y], end: [b.x, b.y] };
  }
  const inkOf = (seed, extra = {}) => ({ seed, roughness: 1.4, bowing: 1.2, stroke: C.red, strokeWidth: 10, ...extra });
  function drawMark(g, m, k) {
    let left = m.total * clamp(k, 0, 1), tip = null; const el = SVG();
    for (const q of m.parts) {
      if (left <= 0) break; const run = Math.min(q.len, left); left -= run;
      g.save(); g.strokeStyle = q.stroke; g.lineWidth = q.w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([run, q.len + 10]); g.stroke(q.p); g.restore();
      if (run < q.len || left <= 0) { el.setAttribute('d', q.d); const p = el.getPointAtLength(run); tip = [p.x, p.y]; }
    }
    return tip;
  }
  /** the marker in a gloved hand, its tip at `pen` (layer coordinates) — the house's hand, as ml_mark draws it */
  function marker(g, pen, rot = -0.5) {
    const ax = Math.sin(-rot), ay = Math.cos(rot);
    g.save(); g.translate(pen[0], pen[1]); g.rotate(rot);
    g.fillStyle = C.red; g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, 26); g.lineTo(10, 26); g.closePath(); g.fill();
    g.fillStyle = '#2a2420'; g.fillRect(-16, 26, 32, 190); g.fillStyle = C.red; g.fillRect(-16, 196, 32, 22); g.restore();
    fist(g, pen[0] + ax * 120, pen[1] + ay * 120, 0.62, rot, { sleeve: K.green, cuff: K.red, len: 1500 });
  }
  function penAt(lt, keys) {
    if (lt <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (lt <= keys[i][0]) { const [t0, a] = keys[i - 1], [t1, b] = keys[i], k = ease.io((lt - t0) / Math.max(1e-3, t1 - t0)); return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
    return keys[keys.length - 1][1];
  }
  // the calendar: ten cells, a digit and its deadline (dd/mm), two rows of five; centred on CAL in layer coordinates
  const CAL = { x: 530, y: 880, cw: 148, ch: 236, gx: 6, top: 150 };
  const DATES = ['15/08', '31/08', '15/09', '30/09', '15/10', '31/10', '15/11', '30/11', '15/12', '31/12'];
  const cellAt = (d) => { const col = d % 5, row = Math.floor(d / 5), w5 = 5 * CAL.cw + 4 * CAL.gx; return [CAL.x - w5 / 2 + col * (CAL.cw + CAL.gx) + CAL.cw / 2, CAL.y - CAL.top + 40 + row * (CAL.ch + CAL.gx) + CAL.ch / 2]; };
  const calSp = () => sprite('e3_cal', 900, 760, 450, 260, (g) => {
    const w5 = 5 * CAL.cw + 4 * CAL.gx, x0 = -w5 / 2 - 24;
    g.fillStyle = C.calPaperD; g.beginPath(); g.roundRect(x0 + 6, -CAL.top - 60 + 8, w5 + 48, 2 * CAL.ch + CAL.gx + 230, 10); g.fill();
    g.fillStyle = C.calPaper; g.beginPath(); g.roundRect(x0, -CAL.top - 60, w5 + 48, 2 * CAL.ch + CAL.gx + 230, 10); g.fill();
    g.fillStyle = C.calHead; g.fillRect(x0, -CAL.top - 60, w5 + 48, 120); g.fillStyle = C.calHeadD; g.fillRect(x0, -CAL.top + 50, w5 + 48, 10);
    g.fillStyle = C.calPaper; g.textAlign = 'center'; g.font = '400 64px "Anton-400"'; g.fillText('2026', 0, -CAL.top + 28);
    for (let i = 0; i < 10; i++) {
      const [cx, cy] = [-w5 / 2 + (i % 5) * (CAL.cw + CAL.gx) + CAL.cw / 2, -CAL.top + 40 + Math.floor(i / 5) * (CAL.ch + CAL.gx) + CAL.ch / 2];
      g.strokeStyle = C.calRule; g.lineWidth = 3; g.strokeRect(cx - CAL.cw / 2, cy - CAL.ch / 2, CAL.cw, CAL.ch);
      g.fillStyle = C.ink; g.font = '400 150px "Anton-400"'; g.fillText(String(i), cx, cy + 40);
      g.fillStyle = '#6f6650'; g.font = '400 27px "ArchivoBlack-400"'; g.fillText(DATES[i], cx, cy + 92);
    }
  }, 9);
  const rings = () => sprite('e3_rings', 900, 80, 450, 40, (g) => { for (let i = 0; i < 9; i++) { const x = -360 + i * 90; g.fillStyle = C.ringD; g.beginPath(); g.roundRect(x - 9, -34, 18, 62, 9); g.fill(); g.fillStyle = C.ring; g.beginPath(); g.roundRect(x - 7, -36, 14, 56, 7); g.fill(); } }, 4);
  /** the tally: a mechanical counter, seven wheels rolling to the number, a label over it */
  function tally(g, x, y, k, label, appear) {
    if (appear <= 0) return;
    const N = 2248143, v = Math.round(N * ease.out(k)), digits = String(v).padStart(7, '0'), s = `${digits[0]},${digits.slice(1, 4)},${digits.slice(4)}`;
    const cw = 66, w = 9 * cw + 40, h = 190, a = ease.out(appear);
    g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * 40);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.roundRect(x - w / 2 + 8, y - h / 2 + 12, w, h, 14); g.fill();
    g.fillStyle = C.tallyBg; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 14); g.fill();
    g.fillStyle = K.ochre; g.textAlign = 'center'; g.font = `400 28px "ArchivoBlack-400", ${JP}`; g.fillText(label, x, y - h / 2 + 42);
    let cx = x - w / 2 + 20 + cw / 2;
    for (const ch of s) {
      if (ch !== ',') { g.fillStyle = C.tallyCell; g.fillRect(cx - cw / 2 + 4, y - 30, cw - 8, 100); }
      g.fillStyle = C.tallyDigit; g.font = '400 84px "Anton-400"'; g.fillText(ch, cx, y + 50); cx += cw;
    }
    g.restore();
  }
  let MARKS = null;
  const marks3 = (tX, tN) => {
    if (MARKS && MARKS.key === `${tX}|${tN}`) return MARKS;
    const X = (d, t0, dd, seed) => { const [cx, cy] = cellAt(d), h = 74; return mkMark(t0, dd, [GEN().line(cx - h, cy - h * 1.2, cx + h, cy + h * 1.2, inkOf(seed)), GEN().line(cx + h, cy - h * 1.2, cx - h, cy + h * 1.2, inkOf(seed + 1))]); };
    const old = [0, 1, 2].map((d) => X(d, -10, 0.1, 10 + d * 3));
    const three = X(3, tX, 0.5, 31);
    const four = X(4, tN + 0.85, 0.4, 41);
    const [c5x, c5y] = cellAt(5), ring5 = mkMark(tN + 1.55, 0.45, [GEN().ellipse(c5x, c5y, 190, 270, inkOf(51, { strokeWidth: 8 }))]);
    return (MARKS = { key: `${tX}|${tN}`, old, three, four, ring5 });
  };
  const cwall = () => sheet('e3_cwall', (g) => {
    C.cwall.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, -90 + i * 640, W + 180, H + 180); });
    const r = U.rng(8); g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 2; for (let i = 0; i < 30; i++) { const x = r() * W; g.beginPath(); g.moveTo(x, -90); g.lineTo(x + (r() - 0.5) * 30, H + 90); g.stroke(); }
  }, 14);
  SCENES.e3_cal = { draw(c, lt) {
    const id = 'e3_cal', dd = dur(id), tX = at(id, 'cross', 0.6), tN = at(id, 'count', 2.9), M = marks3(tX, tN);
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [tN], { kick: 0.03 }) * lerp(1.0, 1.06, ease.io(lt / dd)), fx: 540, fy: 1000 };
    stack(c, [
      { sh: cwall(), d: 0.05, lift: 0 },
      { fn: (g, ox, oy) => glow(g, 540 + ox, 820 + oy, 760, 'rgba(255,220,160,', 0.12), d: 0.05 },
      { d: 0.3, fn: (g, ox, oy) => {
        g.save(); g.translate(ox, oy);
        put(g, calSp(), CAL.x, CAL.y, { lift: 1.0, rot: -0.012 });
        put(g, rings(), CAL.x, CAL.y - CAL.top - 60, { lift: 0.6 });
        const tips = [];
        for (const m of [...M.old, M.three, M.four, M.ring5]) { const k = (lt - m.t0) / m.dur; if (k <= 0) continue; const tp = drawMark(g, m, ease.out(k)); if (k < 1) tips.push(tp); }
        tally(g, 540, 1455, (lt - (tN - 0.7)) / 0.7, ui('cutoff', 'LINES CUT OFF · ENDING IN 3'), (lt - (tN - 0.95)) / 0.25);
        g.restore();
        const L = (p) => [p[0] + ox, p[1] + oy], REST = [1260, 2050];
        const keys = [[0, L(REST)], [tX - 0.35, L(M.three.start)], [tX, L(M.three.start)], [tX + M.three.dur, L(M.three.end)], [tX + M.three.dur + 0.5, L([cellAt(3)[0] + 140, cellAt(3)[1] + 260])],
          [M.four.t0, L(M.four.start)], [M.four.t0 + M.four.dur, L(M.four.end)], [M.ring5.t0, L(M.ring5.start)], [M.ring5.t0 + M.ring5.dur, L(M.ring5.end)], [M.ring5.t0 + M.ring5.dur + 0.7, L(REST)]];
        marker(g, tips.length ? L(tips[0]) : penAt(lt, keys), -0.55);
      } },
    ], cam);
    tag(c, ui('dateline', 'CRT · 4.10.2026'), lt, dd);
    box(c);
  } };

  // ═════════ 4 · e3_grey: the unlinked 3s go grey; on "linked" one owner shows an ID card and the phone comes back ═════════
  SCENES.e3_grey = { draw(c, lt) {
    const id = 'e3_grey', dd = dur(id), tG = at(id, 'grey', 0.6), tL = at(id, 'linked', 3.2);
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [tL], { kick: 0.025 }) * lerp(1.18, 1.3, ease.io(lt / dd)), fx: 440, fy: 1300 };
    street(c, lt, cam, (i) => {
      const cut = CUT.indexOf(i), tg = tG + cut * 0.35;
      let state = 'lit', idK = 0, tap = 0, glowA = 0.12;
      if (cut >= 0 && lt >= tg) { state = 'grey'; glowA = 0; }
      if (i === BACKAGAIN) {
        const tTap = tg + 0.7; if (lt > tTap && lt < tTap + 0.5) tap = 1 - (lt - tTap) / 0.5;
        idK = clamp((lt - (tL - 0.45)) / 0.4, 0, 1);
        if (lt >= tL) { state = 'back'; glowA = 0.45 * Math.exp(-(lt - tL) * 2.5) + 0.12; }
      }
      return { state, raise: 0.3, id: idK, tap, glowA, look: i === BACKAGAIN ? -0.3 * idK : Math.sin(lt * 0.5 + i * 1.7) * 0.15 };
    });
    tag(c, ui('kept', 'THE NUMBER IS KEPT'), lt, dd);
    box(c);
  } };

  // ═════════ 5 · e3_alert: on "gets through" every phone lights with the alert, the grey ones too ═════════
  SCENES.e3_alert = { draw(c, lt) {
    const id = 'e3_alert', dd = dur(id), tA = at(id, 'alert', 2.6);
    const cam = { x: Math.sin(lt * 0.3) * 8, y: 0, z: punch(lt, [tA], { kick: 0.03 }) * lerp(1.12, 1.07, ease.io(lt / dd)), fx: 540, fy: 1300 };
    const pulse = lt >= tA ? 0.5 + 0.5 * Math.cos((lt - tA) * Math.PI * 2 / 0.9) : 0;
    street(c, lt, cam, (i) => {
      const t = tA + (i % NB) * 0.02, on = lt >= t, cut = i === CUT[1];
      return { state: on ? 'alert' : cut ? 'grey' : 'lit', raise: on ? 0.45 : 0.3, glowA: on ? 0.25 + 0.3 * pulse : cut ? 0 : 0.12, look: on ? 0 : Math.sin(lt * 0.5 + i * 1.7) * 0.15 };
    });
    // the street takes the alert's colour, softly, in time with it
    if (lt >= tA) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(232,69,44,${0.05 + 0.05 * pulse})`; c.fillRect(0, 0, W, H); c.restore(); }
    box(c);
  } };
})();
