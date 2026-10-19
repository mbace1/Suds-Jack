// WELCOME HOME, IN PAPER — the approved Welcome Home message (copy v5) remade in the papercut shadowbox, after the owner
// withdrew the clay cut ("more about the apple devices and bunch of people") and asked for "an Apple / Pear video in a
// different style like that" (19 Oct). So almost everything happens ON ONE SCREEN: Pear's home display, a cream card
// squircle on a felt puck, on a counter in a dusk kitchen. The family is four heads from behind at the bottom of the
// frame; the only figures with masks are the two tiny ones on the door camera.
//   ph_screen  the display boots: Pear AI, For the future → Private by design; on "from whom?" a card ? is tacked on
//   ph_lock    her messages; a brother's sleeve reaches in from below; on "face" the lock card slams on, the hand withdraws
//   ph_door    the door camera: two small walkers go off up the path; on "camera" she turns to the lens; 4 WATCHING
//   ph_last    in on the glass: on "private." her texts come up locked in the corner; on "date" the pill pulses
// Timings come from window.FILM_PLAN (cues in papercut/welcome-paper/film.json).
(() => {
  const { K, W, H, sheet, sprite, stack, box, dusk, put, pop, ease, move, glow, hand, walker } = RFP, { S } = RFM, TAU = Math.PI * 2, { clamp, lerp } = U;
  const FP = () => window.FILM_PLAN, shot = (id) => { const f = FP(); return f && f.shots.find((x) => x.id === id); };
  const cue = (id, k, d) => { const f = FP(), s = shot(id); return f && s && f.cues[`${id}.${k}`] != null ? f.cues[`${id}.${k}`] - s.t0 : d; };
  const ui = (k, d) => { const f = FP(); return (f && f.ui && f.ui[k]) || d; };
  const C = { cream: '#efe4cf', creamD: '#d9ccb3', glass: '#121214', felt: '#8f8a80', feltD: '#77736a', tile: '#cfc2a4', tileD: '#b9ab8c', counter: '#c9b48e', counterD: '#a8946e',
    pear: '#7aa04a', pearD: '#4e7330', pink: '#e99a9a', violet: '#8a7ae0', sun: '#f2b07a', red: '#d8402f', yellow: '#f5c400' };
  const SC = { x: 170, y: 690, w: 740, h: 640, r: 92 };                    // the screen, in frame coordinates
  const FAM = [['#2b221c', S.GREEN], ['#d9b46a', S.BLUE], ['#c2a173', S.ORANGE], ['#3a2a20', S.YELLOW]];   // hair, mask colour: dad, mum, the brother, the other sister

  // ---- the room: dusk through a window on the left, a tiled wall, the counter the display stands on
  const wall = () => sheet('ph_wall', (g) => {
    g.fillStyle = '#3a2f26'; g.fillRect(-90, -90, W + 180, H + 180);
    g.fillStyle = C.tileD; g.fillRect(-90, 560, W + 180, 960); const r = U.rng(4);
    for (let y = 570; y < 1500; y += 62) for (let x = -80 + ((y / 62) % 2) * 31; x < W + 90; x += 62) { g.fillStyle = r() < 0.5 ? C.tile : '#d6caae'; g.fillRect(x, y, 56, 56); }
    g.fillStyle = '#2a211b'; g.fillRect(-90, 520, W + 180, 40);                                           // the shelf's shadow line
  });
  const counter = () => sheet('ph_counter', (g) => {
    g.fillStyle = C.counter; g.fillRect(-90, 1478, W + 180, 60); g.fillStyle = C.counterD; g.fillRect(-90, 1538, W + 180, H);
    g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -60; x < W + 90; x += 180) g.fillRect(x, 1560, 6, H);
  }, 12);
  const pendant = (g, x, lt) => { g.fillStyle = K.ink; g.fillRect(x - 2, -90, 4, 300); g.fillStyle = '#c9a35a'; g.beginPath(); g.moveTo(x - 80, 290); g.quadraticCurveTo(x, 170, x + 80, 290); g.closePath(); g.fill();
    glow(g, x, 300, 260, 'rgba(255,214,140,', 0.35 + 0.03 * Math.sin(lt * 5)); };
  // ---- the display: a cream card squircle with a dark glass face, on a grey felt puck
  const squircle = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.bezierCurveTo(x + w - r * 0.3, y, x + w, y + r * 0.3, x + w, y + r); g.lineTo(x + w, y + h - r);
    g.bezierCurveTo(x + w, y + h - r * 0.3, x + w - r * 0.3, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.bezierCurveTo(x + r * 0.3, y + h, x, y + h - r * 0.3, x, y + h - r); g.lineTo(x, y + r); g.bezierCurveTo(x, y + r * 0.3, x + r * 0.3, y, x + r, y); g.closePath(); };
  const device = () => sprite('ph_device', 860, 860, 430, 60, (g) => {
    g.fillStyle = C.feltD; g.beginPath(); g.roundRect(-150, 640, 300, 140, 40); g.fill(); g.fillStyle = C.felt; g.beginPath(); g.roundRect(-150, 640, 300, 30, 15); g.fill();
    g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(-130 + (i % 10) * 29, 690 + Math.floor(i / 10) * 22, 3, 0, TAU); g.fill(); }
    g.fillStyle = C.creamD; g.fillRect(-46, 560, 92, 90);                                                    // the neck
    g.fillStyle = C.cream; squircle(g, -400, -20, 800, 700, 120); g.fill();
    g.fillStyle = C.glass; squircle(g, SC.x - 540, SC.y - 690, SC.w, SC.h, SC.r); g.fill();
    g.fillStyle = K.ink; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();                                     // the camera, top centre
  }, 14);
  const clipScreen = (g, ox, oy) => { g.save(); squircle(g, SC.x + ox, SC.y + oy, SC.w, SC.h, SC.r); g.clip(); };
  /** Pear's mark: a plain pear with a leaf (never the real logo) */
  function pearMark(g, x, y, r, col, leaf = col) { g.save(); g.translate(x, y); g.fillStyle = col; g.beginPath(); g.moveTo(0, -r); g.bezierCurveTo(r * 0.45, -r, r * 0.5, -r * 0.35, r * 0.75, 0); g.bezierCurveTo(r * 1.1, r * 0.6, r * 0.7, r * 1.05, 0, r * 1.05);
    g.bezierCurveTo(-r * 0.7, r * 1.05, -r * 1.1, r * 0.6, -r * 0.75, 0); g.bezierCurveTo(-r * 0.5, -r * 0.35, -r * 0.45, -r, 0, -r); g.fill(); g.fillStyle = leaf; g.beginPath(); g.ellipse(r * 0.35, -r * 1.2, r * 0.32, r * 0.14, -0.6, 0, TAU); g.fill(); g.restore(); }
  /** the screen's wallpaper as cut card: a few flat colour pieces, overlapping */
  function wallpaper(g, ox, oy, cols) { g.fillStyle = cols[0]; g.fillRect(SC.x + ox, SC.y + oy, SC.w, SC.h);
    [[0.2, 0.25, 0.42, cols[1]], [0.85, 0.3, 0.38, cols[2]], [0.5, 0.95, 0.5, cols[3]]].forEach(([u, v, r, col]) => { g.fillStyle = col; g.beginPath(); g.ellipse(SC.x + ox + u * SC.w, SC.y + oy + v * SC.h, r * SC.w, r * SC.w * 0.8, 0.3, 0, TAU); g.fill(); }); }
  const label = (g, text, x, y, font, col = '#fff', align = 'left') => { g.fillStyle = col; g.font = font; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(text, x, y); };
  /** a paper card on the glass: rounded, cream, its own shadow */
  function card(g, x, y, w, h, fill = 'rgba(250,244,232,.97)') { g.save(); g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.roundRect(x + 8, y + 10, w, h, 26); g.fill(); g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, 26); g.fill(); g.restore(); }
  function maskDot(g, x, y, r, col) { RFM.mask(g, x, y, r, col, { strap: false, shade: false, face: K.card, frame: K.ink, ink: K.ink }); }
  function lockIcon(g, x, y, s, col) { g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = col; g.lineWidth = 9; g.beginPath(); g.arc(0, -16, 20, Math.PI, 0); g.stroke(); g.fillStyle = col; g.beginPath(); g.roundRect(-28, -16, 56, 46, 8); g.fill(); g.restore(); }
  /** her messages, on the glass: her mask's colour, the word, the blurred lines */
  function messages(g, ox, oy) { card(g, SC.x + 60 + ox, SC.y + 70 + oy, 620, 500); maskDot(g, SC.x + 140 + ox, SC.y + 150 + oy, 46, K.mag);
    label(g, ui('msgs', 'Messages'), SC.x + 210 + ox, SC.y + 168 + oy, '700 50px "Poppins-800"', K.ink);
    g.fillStyle = '#9a92a0'; for (let j = 0; j < 4; j++) { g.beginPath(); g.roundRect(SC.x + 110 + (j % 2) * 160 + ox, SC.y + 240 + j * 76 + oy, 360 - (j % 2) * 90, 46, 23); g.fill(); } }
  /** the door camera's picture: dusk over a porch beam, a brick path out to the road, a gabled house across it */
  const feed = () => sheet('ph_feed', (g) => {
    const x0 = SC.x, y0 = SC.y, w = SC.w, h = SC.h;
    const sk = g.createLinearGradient(0, y0, 0, y0 + h * 0.5); sk.addColorStop(0, '#3a3e58'); sk.addColorStop(1, '#c98a62'); g.fillStyle = sk; g.fillRect(x0, y0, w, h * 0.55);
    g.fillStyle = '#4a3a3a'; g.beginPath(); g.moveTo(x0 + 120, y0 + 330); g.lineTo(x0 + 250, y0 + 230); g.lineTo(x0 + 380, y0 + 330); g.closePath(); g.fill(); g.fillRect(x0 + 130, y0 + 330, 240, 90);   // the house across the road
    g.fillStyle = '#ffd98a'; g.fillRect(x0 + 170, y0 + 350, 40, 34); g.fillRect(x0 + 290, y0 + 350, 40, 34);
    g.fillStyle = '#3c4a32'; g.fillRect(x0, y0 + h * 0.55, w, h * 0.45); g.fillStyle = '#566a40'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(x0 + 40 + i * 90, y0 + h * 0.6, 60, 34, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#9a5a3c'; g.beginPath(); g.moveTo(x0 + w * 0.5 - 30, y0 + h * 0.55); g.lineTo(x0 + w * 0.5 + 30, y0 + h * 0.55); g.lineTo(x0 + w * 0.5 + 220, y0 + h); g.lineTo(x0 + w * 0.5 - 220, y0 + h); g.closePath(); g.fill();   // the brick path
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; for (let k = 1; k < 10; k++) { const v = k / 10, yy = y0 + h * 0.55 + v * v * h * 0.45, hw = 30 + v * v * 190; g.beginPath(); g.moveTo(x0 + w * 0.5 - hw, yy); g.lineTo(x0 + w * 0.5 + hw, yy); g.stroke(); }
    g.fillStyle = '#5a2a1e'; g.fillRect(x0, y0, w, 56); g.fillStyle = K.ink; for (let i = 0; i < 9; i++) { g.fillStyle = '#ffd98a'; g.beginPath(); g.arc(x0 + 40 + i * 84, y0 + 74 + Math.sin(i) * 6, 9, 0, TAU); g.fill(); }   // the porch beam, its string lights
  }, 6);
  /** the couple on the path, small, going away: she in pink with the magenta mask, he with a grey one */
  function couple(g, ox, oy, lt, turn) {
    const k = clamp(lt / 3.5, 0, 1), sc = lerp(0.62, 0.42, k), yb = lerp(SC.y + 520, SC.y + 420, k), step = Math.sin(lt * 7);
    for (const [dx, coat, col, me] of [[-70, '#e7a8b8', K.mag, true], [70, '#c8a678', '#9a9a9a', false]]) {
      const x = SC.x + SC.w * 0.5 + dx * sc / 0.62 + ox, look = me ? turn : 0;
      if (look > 0.05) walker(g, x, yb + oy, sc * 0.5, { coat, scarf: me ? '#f6f1e8' : '#6c6d5e', color: col, t: lt, step, led: false, lift: 0.3 });
      else { put(g, sprite(`ph_back_${coat}`, 300, 480, 150, 60, (q) => { q.fillStyle = K.ink; for (const sx of [-1, 1]) { q.beginPath(); q.roundRect(sx * 34 - 18, 300, 36, 150, 10); q.fill(); }
        q.fillStyle = coat; q.beginPath(); q.moveTo(-60, 10); q.quadraticCurveTo(-112, 22, -118, 110); q.lineTo(-132, 330); q.lineTo(132, 330); q.lineTo(118, 110); q.quadraticCurveTo(112, 22, 60, 10); q.closePath(); q.fill();
        q.fillStyle = '#2a1f18'; q.beginPath(); q.arc(0, -46, 70, 0, TAU); q.fill(); q.fillStyle = K.ink; q.fillRect(-74, -56, 148, 12); }, 6), x, yb + oy + step * 2, { sc: sc * 0.5, lift: 0.3 }); }
    }
  }
  /** the camera's chrome: the name and Live up top; the pill: n watching, a mask dot each (k = how far it has landed) */
  function chrome(g, ox, oy, k, pulse = 0) {
    label(g, ui('door', 'Front Door'), SC.x + SC.w / 2 + ox, SC.y + 120 + oy, '700 46px "Poppins-800"', '#fff', 'center');
    g.fillStyle = C.red; g.beginPath(); g.arc(SC.x + SC.w / 2 - 50 + ox, SC.y + 158 + oy, 9, 0, TAU); g.fill(); label(g, 'Live', SC.x + SC.w / 2 + 6 + ox, SC.y + 170 + oy, '700 34px "Poppins-800"', '#fff', 'center');
    if (k <= 0) return; const s = ease.back(k / 0.5) * (1 + 0.08 * pulse), tx = ui('watching', '4 WATCHING');
    g.save(); g.translate(SC.x + SC.w / 2 + ox, SC.y + 250 + oy); g.scale(s, s); g.font = '800 44px "Poppins-800"'; const tw = g.measureText(tx).width, pw = tw + 230;
    g.fillStyle = 'rgba(20,18,22,.9)'; g.beginPath(); g.roundRect(-pw / 2, -42, pw, 84, 42); g.fill();
    FAM.forEach(([, col], i) => { const a = ease.back((k - 0.25 - i * 0.12) / 0.3); if (a > 0) { g.save(); g.translate(-pw / 2 + 52 + i * 34, 0); g.scale(a, a); maskDot(g, 0, 0, 24, col); g.restore(); } });
    label(g, tx, -pw / 2 + 200, 15, '800 44px "Poppins-800"', '#fff'); g.restore();
  }
  /** her texts, still locked, in the corner of the same screen: the punchline's other half */
  function lockedChip(g, ox, oy, k) { if (k <= 0) return; const s = ease.back(k / 0.5); g.save(); g.translate(SC.x + 50 + ox, SC.y + SC.h - 190 + oy); g.scale(s, s);
    card(g, 0, 0, 330, 120); maskDot(g, 58, 60, 34, K.mag); label(g, ui('msgs', 'Messages'), 106, 52, '700 36px "Poppins-800"', K.ink); lockIcon(g, 120, 90, 0.45, K.ink); label(g, ui('lockedShort', 'Locked'), 146, 100, '600 30px "Poppins-800"', '#5a5560'); g.restore(); }
  /** the family, from behind, along the bottom of the frame: four heads, each with a mask's strap across the back */
  function family(g, ox, lt) { FAM.forEach(([hair], i) => { const x = 210 + i * 220 + ox, y = 1730 + (i % 2) * 40 + Math.sin(lt * 1.3 + i) * 3;
    put(g, sprite(`ph_head_${hair}`, 300, 300, 150, 150, (q) => { q.fillStyle = '#2a3a30'; q.beginPath(); q.ellipse(0, 170, 150, 70, 0, 0, TAU); q.fill(); q.fillStyle = hair; q.beginPath(); q.ellipse(0, 0, 104, 118, 0, 0, TAU); q.fill();
      q.fillStyle = K.ink; q.fillRect(-106, -10, 212, 18); }, 10), x, y, { lift: 2 }); }); }
  const tagOn = (g, lt, dur) => { if (window.CW && CW.tag) CW.tag(g, ui('tag', 'A REAL AD, REMADE IN PAPER'), lt, dur); };
  const deviceAt = (g, ox, oy) => put(g, device(), 540 + ox, 690 + oy, { lift: 1.2 });

  // ================================================================== 1 · the display boots: For the future → Private by design
  SCENES['ph_screen'] = (() => ({
    draw(c, lt) {
      const sh = shot('ph_screen'), dur = sh ? sh.dur : 7.5, flow = cue('ph_screen', 'flow', 3.2), q = cue('ph_screen', 'whom', 5.2);
      const cam = { x: lerp(-30, 30, lt / dur), y: 0, z: move(lt, 0.2, dur, 1.0, 1.1), fx: 540, fy: 1010 };
      stack(c, [
        { sh: wall(), d: 0.12, lift: 0 },
        { fn: (g, ox) => pendant(g, 860 + ox, lt), d: 0.2 },
        { sh: counter(), d: 0.5, lift: 0.6 },
        { fn: (g, ox, oy) => {
          deviceAt(g, ox, oy); clipScreen(g, ox, oy);
          if (lt < flow) { const k = clamp((lt - 0.3) / 0.9, 0, 1); wallpaper(g, ox, oy, ['#e9e2cf', '#b0d678', '#f6c496', '#d6e8aa']);
            g.globalAlpha = ease.out(k / 0.5); const s = 0.7 + 0.3 * ease.back(k / 0.6); g.save(); g.translate(540 + ox, 900 + oy); g.scale(s, s); pearMark(g, 0, 0, 80, C.pearD, '#3f6e2a'); g.restore();
            g.globalAlpha = ease.out((k - 0.2) / 0.4); label(g, 'Pear AI', 540 + ox, 1100 + oy, '800 110px "Poppins-800"', '#1f2419', 'center');
            g.globalAlpha = ease.out((k - 0.4) / 0.4); label(g, ui('future', 'For the future.'), 540 + ox, 1180 + oy, '600 52px "Poppins-800"', '#5a6150', 'center'); g.globalAlpha = 1; }
          else { wallpaper(g, ox, oy, [C.pink, '#fa8c78', '#ec6eaa', C.violet]);
            label(g, '7:42', SC.x + 60 + ox, SC.y + 150 + oy, '300 110px "Poppins-600"', '#fff');
            label(g, ui('private1', 'Private'), SC.x + 60 + ox, SC.y + 400 + oy, '800 100px "Poppins-800"', '#fff'); label(g, ui('private2', 'by design.'), SC.x + 60 + ox, SC.y + 510 + oy, '800 100px "Poppins-800"', '#fff');
            pearMark(g, SC.x + 80 + ox, SC.y + 560 + oy, 34, '#fff'); }
          g.restore();
          // on "from whom?" a card question mark is tacked onto the glass
          const kq = pop(lt, q, 0.3); if (kq > 0) put(g, sprite('ph_q', 240, 280, 120, 140, (s2) => { s2.fillStyle = C.yellow; s2.beginPath(); s2.roundRect(-110, -130, 220, 260, 18); s2.fill(); s2.fillStyle = K.ink; s2.font = '220px "Poppins-800"'; s2.textAlign = 'center'; s2.fillText('?', 0, 80); }, 10),
            SC.x + SC.w - 10 + ox, SC.y + 40 + oy, { rot: 0.16, sc: lerp(1.6, 1, Math.min(1, (lt - q) / 0.14)) * Math.min(1, kq + 0.2), lift: 2 });
        }, d: 0.62 },
      ], cam);
      tagOn(c, lt, dur); box(c);
    },
  }))();

  // ================================================================== 2 · her messages; her brother's sleeve reaches in; on "face" it locks him out
  SCENES['ph_lock'] = (() => ({
    draw(c, lt) {
      const reach = cue('ph_lock', 'reach', 1.2), lock = cue('ph_lock', 'lock', 2.4);
      const cam = { x: 0, y: 0, z: 1.12 + 0.04 * ease.out(lt / 4), fx: 540, fy: 1000 };
      const r = ease.out((lt - reach) / 0.6) * (1 - ease.out((lt - lock - 0.25) / 0.5));
      stack(c, [
        { sh: wall(), d: 0.12, lift: 0 }, { fn: (g, ox) => pendant(g, 860 + ox, lt), d: 0.2 }, { sh: counter(), d: 0.5, lift: 0.6 },
        { fn: (g, ox, oy) => { deviceAt(g, ox, oy); clipScreen(g, ox, oy); wallpaper(g, ox, oy, [C.pink, '#fa8c78', '#ec6eaa', C.violet]); messages(g, ox, oy);
          const k = pop(lt, lock, 0.3); if (k > 0) { g.save(); g.translate(540 + ox, 1010 + oy); g.scale(k, k); card(g, -340, -150, 680, 300, 'rgba(30,26,34,.96)'); lockIcon(g, -230, 0, 1.4, '#fff');
            const tx = ui('locked', 'Locked · not your face'); let fs = 48; g.font = `700 ${fs}px "Poppins-800"`; while (g.measureText(tx).width > 420 && fs > 28) { fs -= 2; g.font = `700 ${fs}px "Poppins-800"`; }
            label(g, tx, -150, 16, `700 ${fs}px "Poppins-800"`, '#fff'); g.restore(); }
          g.restore(); }, d: 0.62 },
        { fn: (g, ox) => { if (r > 0.01) hand(g, lerp(1000, 760, r) + ox, lerp(1900, 1280, r), 1.2, -0.55, { sleeve: '#6f6b3c', cuff: S.ORANGE, glove: S.ORANGE }); }, d: 0.9 },
      ], cam);
      box(c);
    },
  }))();

  // ================================================================== 3 · the door camera: the couple goes off up the path; on "camera" she turns; 4 WATCHING
  SCENES['ph_door'] = (() => ({
    draw(c, lt) {
      const turn = cue('ph_door', 'watch', 2.6);
      const cam = { x: lerp(20, -20, lt / 4), y: 0, z: 1.04 + 0.05 * ease.out(lt / 4), fx: 540, fy: 1000 };
      stack(c, [
        { sh: wall(), d: 0.12, lift: 0 }, { fn: (g, ox) => pendant(g, 860 + ox, lt), d: 0.2 }, { sh: counter(), d: 0.5, lift: 0.6 },
        { fn: (g, ox, oy) => { deviceAt(g, ox, oy); clipScreen(g, ox, oy); g.drawImage(feed().c, ox - feed().m, oy - feed().m);
          couple(g, ox, oy, lt, ease.out((lt - turn + 0.2) / 0.4)); chrome(g, ox, oy, clamp((lt - turn) / 0.9, 0, 1)); g.restore(); }, d: 0.62 },
        { fn: (g, ox) => { family(g, ox, lt); glow(g, 540 + ox, 1010, 700, 'rgba(255,214,190,', 0.12); }, d: 1.0 },
      ], cam);
      box(c);
    },
  }))();

  // ================================================================== 4 · in on the glass: her texts locked in the corner, her date on camera, 4 WATCHING
  SCENES['ph_last'] = (() => ({
    draw(c, lt) {
      const priv = cue('ph_last', 'priv', 1.2), date = cue('ph_last', 'date', 2.6);
      const cam = { x: 0, y: 0, z: 1.34 + 0.05 * ease.out(lt / 5), fx: 540, fy: 1010 };
      const pulse = lt > date ? Math.exp(-(lt - date) * 4) * Math.sin((lt - date) * 18) : 0;
      stack(c, [
        { sh: wall(), d: 0.12, lift: 0 }, { sh: counter(), d: 0.5, lift: 0.6 },
        { fn: (g, ox, oy) => { deviceAt(g, ox, oy); clipScreen(g, ox, oy); g.drawImage(feed().c, ox - feed().m, oy - feed().m);
          couple(g, ox, oy, lt + 3.0, 1); chrome(g, ox, oy, 1, pulse); lockedChip(g, ox, oy, clamp((lt - priv) / 0.45, 0, 1)); g.restore(); }, d: 0.62 },
      ], cam);
      box(c);
    },
  }))();
})();
