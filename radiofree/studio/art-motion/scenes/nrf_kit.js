// The kit for "The Newsreader Was Fake" (Radio Free Helsinki · Big Tech · film 3) — built on RFP.
// Its own look: a TV news studio on a Finnish winter night — deep teal, studio cyan, crisp white,
// scam gold; magenta only for the stamps. The scam ad's newsreader is an obvious CARDBOARD
// standee with a BLANK oval for a face (no features — imitating a real anchor's face is the scam);
// the real newsreaders are only ever seen from behind. Everything here is prefixed nrf_.
window.NRF = (() => {
  const { W, H, sheet, sprite, put, glow, ease } = RFP, TAU = Math.PI * 2, { clamp, lerp } = U;
  const N = {
    night0: '#061219', night1: '#0a1c25', teal: '#0f2a36', teal2: '#163a49', teal3: '#1f4b5d', teal4: '#2a6178',
    cyan: '#39b5c9', cyanL: '#93dde8', cyanD: '#1d7586', white: '#f1f6f6', paper: '#e3eae8', paperD: '#b4c3c3',
    gold: '#e8c547', goldL: '#f7e28e', goldD: '#a8861f', mag: '#f0027f', ink: '#071319', inkL: '#14262e',
    board: '#c39a63', boardD: '#9a7343', boardL: '#dbb57f', skin: '#e6d3bb', skinD: '#c9b296', red: '#e0352b',
  };

  /** the shadowbox frame, lacquered night-blue instead of the house's walnut (called last in every shot) */
  function box(c) {
    c.save();
    const sh = c.createLinearGradient(0, 56, 0, 150); sh.addColorStop(0, 'rgba(0,6,10,.65)'); sh.addColorStop(1, 'rgba(0,6,10,0)'); c.fillStyle = sh; c.fillRect(56, 56, W - 112, 94);
    const sl = c.createLinearGradient(56, 0, 140, 0); sl.addColorStop(0, 'rgba(0,6,10,.55)'); sl.addColorStop(1, 'rgba(0,6,10,0)'); c.fillStyle = sl; c.fillRect(56, 56, 84, H - 112);
    c.fillStyle = '#0a1820'; c.beginPath(); c.rect(0, 0, W, H); c.rect(56, 56, W - 112, H - 112); c.fill('evenodd');
    c.strokeStyle = '#1e4252'; c.lineWidth = 4; c.strokeRect(56, 56, W - 112, H - 112);
    c.strokeStyle = 'rgba(57,181,201,.14)'; c.lineWidth = 2; c.strokeRect(20, 20, W - 40, H - 40);
    c.restore();
  }

  /** a where/what tag cut like a news chyron: white bar, a cyan block at its head, sliding in. '\n' = a second line */
  function tag(c, text, lt, dur, x = 110, y = 1700) {
    const a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dur - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    const slide = 1 - ease.out(clamp((lt - 0.5) / 0.45, 0, 1)), lines = text.split('\n');
    c.save(); c.globalAlpha = a; c.translate(-slide * 70, 0); c.font = '32px "ArchivoBlack-400"'; const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 70, h = 66 + (lines.length - 1) * 44;
    c.shadowColor = 'rgba(0,6,10,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = N.white; c.beginPath(); c.roundRect(x, y, w, h, 4); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = N.cyan; c.fillRect(x, y, 16, h);
    c.fillStyle = N.ink; lines.forEach((l, i) => c.fillText(l, x + 40, y + 45 + i * 44)); c.restore();
  }

  /** a backdrop banded like cut card: cols from top to bottom, each band's lower edge a gentle wave */
  const bands = (key, cols, y0 = 0, y1 = H, amp = 12) => sheet('nrf_bands_' + key, (g) => {
    const step = (y1 - y0) / cols.length;
    cols.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-90, i ? y0 + i * step : -90); for (let x = -90; x <= W + 90; x += 60) g.lineTo(x, (i ? y0 + i * step : -90) + (i ? Math.sin(x * 0.006 + i * 1.7) * amp : 0)); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill(); });
  }, 10);

  /** snow: white card flakes drifting down a region, deterministic */
  function snow(c, lt, { n = 60, seed = 3, x0 = 56, x1 = W - 56, y0 = 56, y1 = H - 56, sp = 70, ox = 0, size = 1, alpha = 1 } = {}) {
    const r = U.rng(seed); c.save(); c.fillStyle = N.white;
    for (let i = 0; i < n; i++) {
      const d = 0.35 + r() * 0.65, x = x0 + r() * (x1 - x0), y = y0 + ((r() * (y1 - y0) + lt * sp * d) % (y1 - y0)), s = (2.2 + r() * 4) * d * size;
      c.globalAlpha = alpha * (0.45 + 0.55 * d); c.beginPath(); c.arc(x + Math.sin(lt * 0.9 + i * 1.3) * 14 * d + ox * d, y, s, 0, TAU); c.fill();
    }
    c.restore();
  }

  // ---------------------------------------------------------------------------------------------
  // THE CARDBOARD NEWSREADER. A standee: origin at its foot, 900 tall. A brown card rim all round
  // the print (that is what says "cut-out"), a suit, a gold tie, a sign held at the chest — and a
  // plain blank oval where a face would be. NO features, no hair: it is nobody, on purpose.
  const SIGN = { x0: -215, x1: 215, y0: -585, y1: -350 };
  function silhouette(p, sign = true) {
    p.beginPath(); p.ellipse(0, -800, 84, 102, 0, 0, TAU);                                                       // the head
    p.rect(-34, -720, 68, 64);                                                                                    // the neck
    p.moveTo(-62, -670); p.quadraticCurveTo(-176, -662, -184, -596); p.lineTo(-222, -470); p.lineTo(-222, -350); p.lineTo(-160, -350); p.lineTo(-150, -380);
    p.lineTo(-108, -380); p.lineTo(-104, -12); p.lineTo(-14, -12); p.lineTo(-10, -300); p.lineTo(10, -300); p.lineTo(14, -12); p.lineTo(104, -12); p.lineTo(108, -380);
    p.lineTo(150, -380); p.lineTo(160, -350); p.lineTo(222, -350); p.lineTo(222, -470); p.lineTo(184, -596); p.quadraticCurveTo(176, -662, 62, -670); p.closePath();
    if (sign) p.rect(SIGN.x0 - 6, SIGN.y0, SIGN.x1 - SIGN.x0 + 12, SIGN.y1 - SIGN.y0);                              // the sign
    p.rect(-128, -24, 256, 24);                                                                                   // the shoes' strip
  }
  /** the body without its sign: torso, arms hanging at its sides, two legs, two shoes — each cut apart, so
   *  that lying face down (its plain brown back to us) it still reads as a person */
  function bodyShape(p) {
    p.beginPath(); p.ellipse(0, -800, 84, 102, 0, 0, TAU); p.rect(-34, -720, 68, 64);
    p.moveTo(-62, -670); p.quadraticCurveTo(-160, -662, -168, -600); p.lineTo(-150, -380); p.lineTo(150, -380); p.lineTo(168, -600); p.quadraticCurveTo(160, -662, 62, -670); p.closePath();
    p.moveTo(-170, -612); p.lineTo(-214, -598); p.lineTo(-240, -372); p.lineTo(-186, -366); p.closePath(); p.moveTo(170, -612); p.lineTo(214, -598); p.lineTo(240, -372); p.lineTo(186, -366); p.closePath();
    p.ellipse(-214, -352, 28, 34, 0, 0, TAU); p.ellipse(214, -352, 28, 34, 0, 0, TAU);
    p.rect(-108, -390, 90, 380); p.rect(18, -390, 90, 380); p.ellipse(-70, -14, 58, 18, 0, 0, TAU); p.ellipse(70, -14, 58, 18, 0, 0, TAU);
  }
  /** the front, sign gone: the print of the suit on the same cut, a thin brown rim */
  const standeeBare = () => sprite('nrf_standee_bare', 540, 960, 270, 930, (g) => {
    g.lineJoin = 'round'; g.fillStyle = N.board; g.strokeStyle = N.board; g.lineWidth = 14; bodyShape(g); g.stroke(); g.fill();
    g.save(); bodyShape(g); g.clip();
    g.fillStyle = '#16242d'; g.fillRect(-120, -400, 240, 400); g.fillStyle = N.ink; g.fillRect(-140, -34, 280, 40);
    g.fillStyle = '#1d3346'; g.fillRect(-250, -680, 500, 300); g.fillStyle = N.skin; g.fillRect(-250, -390, 80, 80); g.fillRect(170, -390, 80, 80);
    g.fillStyle = N.white; g.beginPath(); g.moveTo(-50, -672); g.lineTo(50, -672); g.lineTo(0, -560); g.closePath(); g.fill();
    g.fillStyle = N.gold; g.beginPath(); g.moveTo(-14, -668); g.lineTo(14, -668); g.lineTo(18, -580); g.lineTo(0, -540); g.lineTo(-18, -580); g.closePath(); g.fill();
    g.fillStyle = N.skinD; g.fillRect(-34, -722, 68, 60); g.fillStyle = N.skin; g.beginPath(); g.ellipse(0, -800, 84, 102, 0, 0, TAU); g.fill();
    g.restore();
  }, 12);

  /** the sign's printed face, centred on (x, y): scam gold, ink letters */
  function signFace(g, x, y) {
    const w = SIGN.x1 - SIGN.x0, h = SIGN.y1 - SIGN.y0; g.save(); g.translate(x, y);
    g.fillStyle = N.gold; g.fillRect(-w / 2, -h / 2, w, h);
    g.strokeStyle = N.ink; g.lineWidth = 6; g.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
    g.fillStyle = N.ink; g.textAlign = 'center'; g.font = '92px "Anton-400"'; g.fillText('GET RICH', 0, -h / 2 + 115); g.font = '64px "Anton-400"'; g.fillText('WITH CRYPTO', 0, -h / 2 + 200);
    g.restore();
  }
  /** the sign on its own, with its card rim — for when it comes away from the hands */
  const signCard = () => sprite('nrf_sign', 480, 290, 240, 145, (g) => { g.fillStyle = N.board; g.fillRect(-228, -130, 456, 260); signFace(g, 0, 0); }, 10);
  const standee = (withSign = true) => sprite('nrf_standee' + (withSign ? '' : '_nosign'), 520, 960, 260, 930, (g) => {
    g.lineJoin = 'round';
    g.fillStyle = N.board; g.strokeStyle = N.board; g.lineWidth = 26; silhouette(g, withSign); g.stroke(); g.fill();   // the cardboard rim
    // trousers and shoes
    g.fillStyle = '#16242d'; g.beginPath(); g.moveTo(-108, -390); g.lineTo(108, -390); g.lineTo(104, -14); g.lineTo(14, -14); g.lineTo(10, -300); g.lineTo(-10, -300); g.lineTo(-14, -14); g.lineTo(-104, -14); g.closePath(); g.fill();
    g.fillStyle = N.ink; g.beginPath(); g.roundRect(-126, -26, 118, 26, [12, 12, 4, 4]); g.fill(); g.beginPath(); g.roundRect(8, -26, 118, 26, [12, 12, 4, 4]); g.fill();
    // the jacket, lapels, shirt and the gold tie
    g.fillStyle = '#1d3346'; g.beginPath(); g.moveTo(-62, -670); g.quadraticCurveTo(-176, -662, -184, -596); g.lineTo(-222, -470); g.lineTo(-222, -360); g.lineTo(-150, -380); g.lineTo(150, -380); g.lineTo(222, -360); g.lineTo(222, -470); g.lineTo(184, -596); g.quadraticCurveTo(176, -662, 62, -670); g.closePath(); g.fill();
    g.fillStyle = N.white; g.beginPath(); g.moveTo(-50, -672); g.lineTo(50, -672); g.lineTo(0, -560); g.closePath(); g.fill();
    g.fillStyle = '#284a63'; g.beginPath(); g.moveTo(-62, -670); g.lineTo(-8, -560); g.lineTo(-40, -540); g.lineTo(-96, -640); g.closePath(); g.fill(); g.beginPath(); g.moveTo(62, -670); g.lineTo(8, -560); g.lineTo(40, -540); g.lineTo(96, -640); g.closePath(); g.fill();
    g.fillStyle = N.gold; g.beginPath(); g.moveTo(-14, -668); g.lineTo(14, -668); g.lineTo(8, -650); g.lineTo(18, -580); g.lineTo(0, -560); g.lineTo(-18, -580); g.lineTo(-8, -650); g.closePath(); g.fill();
    // the neck and the BLANK face: one plain oval, a cut line round it, nothing in it
    g.fillStyle = N.skinD; g.fillRect(-34, -722, 68, 60);
    g.fillStyle = N.skin; g.beginPath(); g.ellipse(0, -800, 84, 102, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,90,60,.35)'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -800, 80, 98, 0, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-26, -836, 30, 44, -0.3, 0, TAU); g.fill();       // the gloss of the print, not a feature
    if (withSign) signFace(g, 0, (SIGN.y0 + SIGN.y1) / 2);
    // the hands on the sign's edges
    g.fillStyle = N.skin; for (const sx of [-1, 1]) { g.beginPath(); g.roundRect(sx * 222 - 26, -500, 52, 74, 22); g.fill(); }
    // the cardboard: a fold across the legs and a scuffed corner
    g.strokeStyle = 'rgba(255,240,215,.25)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-104, -196); g.lineTo(104, -186); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(-104, -190); g.lineTo(104, -180); g.stroke();
  }, 12);
  /** its back: plain corrugated board, flutes running up, a brown tape strip and the strut's hinge */
  const standeeBack = () => sprite('nrf_standee_back2', 540, 960, 270, 930, (g) => {
    g.lineJoin = 'round'; g.fillStyle = N.boardD; g.strokeStyle = N.boardD; g.lineWidth = 14; bodyShape(g); g.stroke(); g.fill();
    g.save(); g.lineWidth = 14; bodyShape(g); g.stroke(); g.clip();
    g.strokeStyle = 'rgba(70,45,20,.35)'; g.lineWidth = 3; for (let x = -260; x <= 260; x += 12) { g.beginPath(); g.moveTo(x, -920); g.lineTo(x, 10); g.stroke(); }
    g.fillStyle = 'rgba(210,170,110,.55)'; g.fillRect(-260, -560, 520, 40);                                          // a tape strip
    g.restore();
    g.strokeStyle = 'rgba(70,45,20,.5)'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, -800, 70, 86, 0, 0, TAU); g.stroke();   // the head's outline pressed through from the print side
  }, 12);

  /** the sponsored post's picture: a studio backdrop in cyan with a desk — the cut-out stands in front */
  function newsSet(g, x, y, w, h) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#1b6f82'); gr.addColorStop(0.65, N.cyan); gr.addColorStop(1, '#1d6a7b'); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(241,246,246,.28)'; g.lineWidth = Math.max(2, w / 160); const cx = x + w * 0.5, cy = y + h * 0.42, R = w * 0.42;
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    for (const k of [-0.6, -0.25, 0.1, 0.45]) { g.beginPath(); g.ellipse(cx, cy + k * R, R * Math.sqrt(1 - k * k), R * 0.1, 0, 0, TAU); g.stroke(); }
    for (const k of [0.35, 0.75]) { g.beginPath(); g.ellipse(cx, cy, R * k, R, 0, 0, TAU); g.stroke(); }
    g.fillStyle = 'rgba(241,246,246,.16)'; for (let i = 0; i < 5; i++) g.fillRect(x, y + h * (0.08 + i * 0.05), w, Math.max(2, h / 220));
    // the desk across the bottom: white top, a gold stripe
    g.fillStyle = N.white; g.fillRect(x, y + h * 0.78, w, h * 0.05); g.fillStyle = N.teal2; g.fillRect(x, y + h * 0.83, w, h * 0.17); g.fillStyle = N.gold; g.fillRect(x, y + h * 0.87, w, h * 0.02);
    g.fillStyle = N.white; g.font = `${Math.round(h * 0.075)}px "Anton-400"`; g.textAlign = 'left'; g.fillText('NEWS', x + w * 0.05, y + h * 0.965);   // a generic news desk: no channel's name or logo (imitating them is the scam)
    g.restore();
  }

  /** a gold coin, a disc with a rim and a stamped ring */
  const coin = () => sprite('nrf_coin', 80, 80, 40, 40, (g) => { g.fillStyle = N.goldD; g.beginPath(); g.arc(2, 3, 30, 0, TAU); g.fill(); g.fillStyle = N.gold; g.beginPath(); g.arc(0, 0, 30, 0, TAU); g.fill(); g.strokeStyle = N.goldD; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,250,220,.5)'; g.beginPath(); g.ellipse(-10, -12, 8, 4, -0.6, 0, TAU); g.fill(); }, 5);
  /** a coin seen edge-on as it spins: squash its width by |cos| */
  function spin(c, x, y, s, a, lift = 1) { c.save(); c.translate(x, y); c.scale(Math.max(0.12, Math.abs(Math.cos(a))), 1); put(c, coin(), 0, 0, { sc: s, lift }); c.restore(); }

  /** the crook's mask: a black domino mask, two almond eye holes (an icon on a paddle, not a face) */
  function crookMask(g, x, y, w) {
    g.save(); g.translate(x, y); g.scale(w / 200, w / 200); g.fillStyle = N.ink; g.beginPath();
    g.moveTo(-100, -18); g.quadraticCurveTo(-60, -44, 0, -26); g.quadraticCurveTo(60, -44, 100, -18); g.quadraticCurveTo(104, 26, 60, 34); g.quadraticCurveTo(20, 34, 0, 12); g.quadraticCurveTo(-20, 34, -60, 34); g.quadraticCurveTo(-104, 26, -100, -18); g.closePath();
    g.ellipse(-50, 0, 26, 14, 0.15, 0, TAU); g.ellipse(50, 0, 26, 14, -0.15, 0, TAU); g.fill('evenodd');
    g.beginPath(); g.moveTo(-98, -10); g.lineTo(-130, -26); g.lineTo(-126, -6); g.closePath(); g.fill(); g.beginPath(); g.moveTo(98, -10); g.lineTo(130, -26); g.lineTo(126, -6); g.closePath(); g.fill();   // the ties
    g.restore();
  }
  /** a bidding paddle: a disc on a handle, origin at the handle's foot. crook = gold, with the mask */
  const paddle = (crook) => sprite('nrf_paddle_' + (crook ? 'crook' : 'plain'), 200, 330, 100, 300, (g) => {
    g.fillStyle = '#3a2a1c'; g.fillRect(-10, -150, 20, 150);
    g.fillStyle = crook ? N.gold : N.white; g.beginPath(); g.arc(0, -220, 82, 0, TAU); g.fill();
    g.strokeStyle = crook ? N.goldD : N.cyan; g.lineWidth = 8; g.beginPath(); g.arc(0, -220, 70, 0, TAU); g.stroke();
    if (crook) crookMask(g, 0, -222, 118);
  }, 7);

  /** an arm from below holding a paddle up: a sleeve from (sx, sy) to the hand at (hx, hy), a mitten at the end */
  function arm(c, sx, sy, hx, hy, w, sleeve, glove = N.ink) {
    const a = Math.atan2(hy - sy, hx - sx), L = Math.hypot(hx - sx, hy - sy);
    c.save(); c.translate(sx, sy); c.rotate(a);
    c.fillStyle = sleeve; c.beginPath(); c.moveTo(0, -w * 0.55); c.lineTo(L, -w * 0.4); c.lineTo(L, w * 0.4); c.lineTo(0, w * 0.55); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(L - w * 0.3, -w * 0.42, w * 0.18, w * 0.84);
    c.fillStyle = glove; c.beginPath(); c.roundRect(L - w * 0.15, -w * 0.45, w * 0.95, w * 0.9, w * 0.35); c.fill();
    c.restore();
  }

  /** a person seen from BEHIND, head and shoulders: origin at the base of the neck. Real people are
   *  never given a face — the back of a head is all the frame ever shows. hair: bob / short / bun */
  const back = (hair, coat, hairCol, rim = N.cyan) => sprite(`nrf_back_${hair}_${coat}_${hairCol}`, 420, 560, 210, 330, (g) => {
    const shape = (p, dx = 0, dy = 0) => {
      p.beginPath(); p.moveTo(-190 + dx, 230 + dy); p.lineTo(-178 + dx, 60 + dy); p.quadraticCurveTo(-160 + dx, -6 + dy, -60 + dx, -16 + dy); p.lineTo(60 + dx, -16 + dy); p.quadraticCurveTo(160 + dx, -6 + dy, 178 + dx, 60 + dy); p.lineTo(190 + dx, 230 + dy); p.closePath(); p.fill();
      p.beginPath(); p.ellipse(dx, -112 + dy, 80, 96, 0, 0, TAU); p.fill();
      if (hair === 'bun') { p.beginPath(); p.arc(dx, -214 + dy, 40, 0, TAU); p.fill(); }
      if (hair === 'bob') { p.beginPath(); p.roundRect(-92 + dx, -150 + dy, 184, 140, [10, 10, 40, 40]); p.fill(); }
    };
    g.fillStyle = rim; shape(g, -5, -6);                                                                              // the studio's cyan rim light along the top edges
    g.fillStyle = coat; shape(g);
    g.fillStyle = N.skinD; g.fillRect(-34, -40, 68, 30);                                                              // the nape
    g.fillStyle = coat; g.beginPath(); g.moveTo(-60, -16); g.lineTo(60, -16); g.lineTo(40, 16); g.lineTo(-40, 16); g.closePath(); g.fill();   // the collar
    g.fillStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(-4, -10); g.lineTo(4, -10); g.lineTo(6, 230); g.lineTo(-6, 230); g.fill();   // the back seam
    g.fillStyle = hairCol; g.beginPath(); g.ellipse(0, -112, 80, 96, 0, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(80, -100); g.quadraticCurveTo(70, hair === 'short' ? -60 : -30, 40, hair === 'short' ? -46 : -24); g.lineTo(-40, hair === 'short' ? -46 : -24); g.quadraticCurveTo(-70, hair === 'short' ? -60 : -30, -80, -100); g.closePath(); g.fill();
    if (hair === 'bob') { g.beginPath(); g.roundRect(-92, -150, 184, 140, [10, 10, 40, 40]); g.fill(); }
    if (hair === 'bun') { g.beginPath(); g.arc(0, -214, 40, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.beginPath(); g.arc(0, -214, 28, 0.4, 2.6); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 3; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 22, -200); g.quadraticCurveTo(i * 26, -140, i * 18, hair === 'short' ? -50 : -30); g.stroke(); }   // combed strands
  }, 12);

  /** a real person FRONT-ON as dark card with NO face (as A Handful of People drew them): head and
   *  shoulders above a desk, origin at the bottom centre, rimmed by the light behind. hair: bob / short / bun;
   *  robe = a German judge's black robe with its velvet facings and white tie */
  const front = (hair, body = '#0c1920', rim = N.cyan, robe = false) => sprite(`nrf_front_${hair}_${body}_${rim}_${robe}`, 460, 600, 230, 560, (g) => {
    const shape = (p) => {
      p.beginPath(); p.moveTo(-190, 0); p.lineTo(-178, -220); p.quadraticCurveTo(-150, -296, -60, -306); p.lineTo(-34, -340); p.lineTo(34, -340); p.lineTo(60, -306); p.quadraticCurveTo(150, -296, 178, -220); p.lineTo(190, 0); p.closePath(); p.fill();
      p.beginPath(); p.ellipse(0, -420, 80, 96, 0, 0, TAU); p.fill();
      if (hair === 'bun') { p.beginPath(); p.arc(0, -524, 40, 0, TAU); p.fill(); }
      if (hair === 'bob') { p.beginPath(); p.roundRect(-98, -476, 196, 160, [46, 46, 26, 26]); p.fill(); }
      if (hair === 'short') { p.beginPath(); p.ellipse(0, -446, 88, 78, 0, Math.PI, TAU); p.fill(); }
    };
    g.fillStyle = rim; for (const dx of [-7, 7]) { g.save(); g.translate(dx, -6); shape(g); g.restore(); }       // rim light on both edges
    g.fillStyle = body; shape(g);
    if (robe) {
      g.fillStyle = '#1b1b22'; g.beginPath(); g.moveTo(-70, -300); g.lineTo(-20, 0); g.lineTo(-58, 0); g.lineTo(-108, -290); g.closePath(); g.fill(); g.beginPath(); g.moveTo(70, -300); g.lineTo(20, 0); g.lineTo(58, 0); g.lineTo(108, -290); g.closePath(); g.fill();   // velvet facings
      g.fillStyle = N.white; g.beginPath(); g.moveTo(-26, -320); g.lineTo(26, -320); g.lineTo(18, -220); g.lineTo(-18, -220); g.closePath(); g.fill();   // the white tie
    } else {
      g.fillStyle = 'rgba(180,195,195,.32)'; g.beginPath(); g.moveTo(-34, -322); g.lineTo(34, -322); g.lineTo(0, -232); g.closePath(); g.fill();   // the shirt's V, dim
      g.strokeStyle = 'rgba(147,221,232,.16)'; g.lineWidth = 4; g.beginPath(); g.moveTo(-40, -318); g.lineTo(-6, -200); g.moveTo(40, -318); g.lineTo(6, -200); g.stroke();   // lapels
    }
  }, 12);

  /** a gavel, origin at the far end of its handle (the hand that swings it is out of shot); the head at -len */
  const gavel = (len = 560) => sprite('nrf_gavel_' + len, len + 200, 220, len + 100, 110, (g) => {
    g.fillStyle = '#6a4a2e'; g.fillRect(-len + 50, -14, len - 30, 28); g.fillStyle = '#4a3220'; g.beginPath(); g.roundRect(-len - 55, -96, 110, 192, 18); g.fill();
    g.fillStyle = N.gold; g.fillRect(-len - 55, -96, 110, 18); g.fillRect(-len - 55, 78, 110, 18); g.fillStyle = '#6a4a2e'; g.fillRect(-len - 40, -58, 16, 116);
  }, 8);
  const block = () => sprite('nrf_block', 320, 90, 160, 60, (g) => { g.fillStyle = '#3a2618'; g.beginPath(); g.ellipse(0, 0, 130, 32, 0, 0, TAU); g.fill(); g.fillStyle = '#5a3a24'; g.beginPath(); g.ellipse(0, -10, 130, 28, 0, 0, TAU); g.fill(); }, 8);
  /** a magenta rubber stamp's mark — magenta is spent on the stamps and nothing else */
  const stamp = (text, w = 520, fs = 116) => sprite(`nrf_stamp_${text}_${w}`, w + 40, 200, (w + 40) / 2, 100, (g) => {
    g.strokeStyle = N.mag; g.lineWidth = 10; g.strokeRect(-w / 2, -80, w, 160); g.lineWidth = 3; g.strokeRect(-w / 2 + 12, -68, w - 24, 136);
    g.fillStyle = N.mag; g.font = fs + 'px "Anton-400"'; g.textAlign = 'center'; g.fillText(text, 0, fs * 0.36);
    g.save(); g.globalCompositeOperation = 'destination-out'; const r = U.rng(text.length * 7 + 1); for (let i = 0; i < 90; i++) { g.globalAlpha = 0.5 + r() * 0.5; g.beginPath(); g.arc(-w / 2 + r() * w, -80 + r() * 160, 1 + r() * 4, 0, TAU); g.fill(); } g.restore();   // ink that did not take
  }, 3);
  /** a stamp landing: big and late, then hard; returns nothing, draws at (x, y) */
  function slam(c, sp, x, y, lt, t0, rot = -0.08) {
    const k = RFP.pop(lt, t0, 0.16); if (k <= 0) return;
    put(c, sp, x, y, { sc: lerp(1.6, 1, Math.min(k, 1)), rot, lift: 0.3 });
  }

  /** the cash register, brass in scam gold: origin at its foot. The drawer is drawn by the caller */
  const register = () => sprite('nrf_register', 520, 560, 260, 520, (g) => {
    g.fillStyle = N.goldD; g.beginPath(); g.roundRect(-232, -170, 464, 170, 10); g.fill();                              // the drawer housing
    g.fillStyle = N.gold; g.beginPath(); g.roundRect(-226, -166, 452, 156, 8); g.fill();
    g.fillStyle = N.goldD; g.fillRect(-200, -140, 400, 6);
    // the key bank, raked toward us
    g.fillStyle = N.gold; g.beginPath(); g.moveTo(-226, -170); g.lineTo(226, -170); g.lineTo(186, -360); g.lineTo(-186, -360); g.closePath(); g.fill();
    g.fillStyle = N.goldD; g.beginPath(); g.moveTo(-210, -182); g.lineTo(210, -182); g.lineTo(176, -346); g.lineTo(-176, -346); g.closePath(); g.fill();
    for (let row = 0; row < 4; row++) for (let k = 0; k < 6; k++) {
      const y = -200 - row * 40, span = lerp(370, 300, row / 3), x = -span / 2 + (k + 0.5) * span / 6;
      g.fillStyle = N.ink; g.beginPath(); g.arc(x + 2, y + 3, 15, 0, TAU); g.fill(); g.fillStyle = (row + k) % 5 === 0 ? N.cyan : N.white; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill();
    }
    // the head: a display window, an art-deco crest, the receipt slot at the top right
    g.fillStyle = N.gold; g.beginPath(); g.roundRect(-160, -470, 320, 116, 10); g.fill();
    g.fillStyle = N.ink; g.beginPath(); g.roundRect(-128, -450, 256, 70, 8); g.fill();
    g.fillStyle = N.goldD; g.beginPath(); g.moveTo(-120, -470); g.quadraticCurveTo(0, -540, 120, -470); g.closePath(); g.fill();
    g.fillStyle = N.gold; g.beginPath(); g.moveTo(-100, -470); g.quadraticCurveTo(0, -524, 100, -470); g.closePath(); g.fill();
    g.fillStyle = N.ink; g.fillRect(40, -474, 96, 8);
    // the crank on the right
    g.strokeStyle = N.goldD; g.lineWidth = 14; g.beginPath(); g.moveTo(226, -110); g.lineTo(262, -150); g.lineTo(262, -210); g.stroke(); g.fillStyle = N.ink; g.beginPath(); g.arc(262, -216, 16, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,250,220,.25)'; g.fillRect(-222, -166, 452, 10);
  }, 12);
  /** the display: segments that tick over (no digits, so nothing to misread) */
  function display(c, x, y, lt, rate = 6) {
    for (let i = 0; i < 5; i++) { const on = (Math.floor(lt * rate) + i * 3) % 4 !== 0; c.fillStyle = on ? N.cyan : 'rgba(57,181,201,.18)'; c.beginPath(); c.roundRect(x - 110 + i * 46, y - 22, 34, 44, 5); c.fill(); }
    glow(c, x, y, 160, 'rgba(57,181,201,', 0.25);
  }
  /** the drawer, k = 0 shut … 1 open (it slides toward us and down) */
  function drawer(c, x, y, k) {
    const dy = k * 70, s = 1 + k * 0.08;
    c.save(); c.translate(x, y + dy); c.scale(s, s);
    if (k > 0.05) { c.fillStyle = N.ink; c.fillRect(-196, -132 - dy / s, 392, dy / s + 10); for (let i = 0; i < 5; i++) { put(c, coin(), -150 + i * 75, -100 - dy / s + 20, { sc: 0.9, lift: 0.3 }); } }
    c.fillStyle = N.goldD; c.beginPath(); c.roundRect(-206, -130, 412, 116, 6); c.fill(); c.fillStyle = N.gold; c.beginPath(); c.roundRect(-200, -126, 400, 104, 6); c.fill();
    c.fillStyle = N.ink; c.beginPath(); c.roundRect(-40, -84, 80, 18, 9); c.fill();
    c.restore();
  }
  /** a receipt ribbon along a smooth path (pts in frame coordinates), printed lines scrolling along it */
  function receipt(c, pts, scroll, w = 64, word = '', every = 560) {
    const P = []; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < 1; s += 0.05) { const s2 = s * s, s3 = s2 * s; P.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * s + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3), 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3)]); } }
    P.push(pts[pts.length - 1]);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'butt';
    c.strokeStyle = 'rgba(0,6,10,.4)'; c.lineWidth = w; c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x + 10, y + 14) : c.moveTo(x + 10, y + 14))); c.stroke();   // its shadow
    c.strokeStyle = N.paperD; c.lineWidth = w + 4; c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    c.strokeStyle = N.white; c.lineWidth = w - 4; c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
    // the printed lines: every 16 px of paper a row, broken into words, scrolling with the feed
    let acc = 0; const step = 16, r0 = Math.floor(scroll / step);
    for (let i = 1; i < P.length; i++) {
      const [ax, ay] = P[i - 1], [bx, by] = P[i], L = Math.hypot(bx - ax, by - ay); if (!L) continue;
      const nx = -(by - ay) / L, ny = (bx - ax) / L;
      for (let d = Math.ceil((acc - (scroll % step)) / step) * step + (scroll % step); d < acc + L; d += step) {
        const u = (d - acc) / L, x = ax + (bx - ax) * u, y = ay + (by - ay) * u, row = Math.round((d - (scroll % step)) / step) - r0, h = U.hash(row, 7);
        c.strokeStyle = h < 0.12 ? 'rgba(168,134,31,.9)' : 'rgba(7,19,25,.55)'; c.lineWidth = h < 0.12 ? 4 : 2.5;
        const a = -w / 2 + 9, l1 = (0.25 + 0.45 * U.hash(row, 3)) * (w - 18), gap = 6, b0 = w / 2 - 9 - (0.15 + 0.2 * U.hash(row, 5)) * (w - 18);
        c.beginPath(); c.moveTo(x + nx * a, y + ny * a); c.lineTo(x + nx * (a + l1), y + ny * (a + l1)); if (a + l1 + gap < b0) { c.moveTo(x + nx * b0, y + ny * b0); c.lineTo(x + nx * (w / 2 - 9), y + ny * (w / 2 - 9)); } c.stroke();
      }
      acc += L;
    }
    // INVOICE, printed along the paper every so often, each letter on the curve where it falls
    if (word) {
      const seg = []; let tot = 0; for (let i = 1; i < P.length; i++) { const L = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push([tot, L, i]); tot += L; }
      const at = (d) => { for (const [s0, L, i] of seg) if (d <= s0 + L) { const u = L ? (d - s0) / L : 0, [ax, ay] = P[i - 1], [bx, by] = P[i]; return [ax + (bx - ax) * u, ay + (by - ay) * u, Math.atan2(by - ay, bx - ax)]; } return null; };
      c.font = `${Math.round(w * 0.56)}px "Anton-400"`; c.textAlign = 'center'; c.fillStyle = N.ink; const adv = [...word].map((ch) => c.measureText(ch).width + 2);
      for (let d0 = ((scroll % every) + every) % every - every; d0 < tot; d0 += every) {
        let d = d0 + 40; for (let k = 0; k < word.length; k++) { const q = d + adv[k] / 2; d += adv[k]; if (q < 6 || q > tot - 6) continue; const p = at(q); if (!p) continue; c.save(); c.translate(p[0], p[1]); c.rotate(p[2]); c.fillText(word[k], 0, w * 0.2); c.restore(); }
      }
    }
    c.restore();
    return P;
  }

  /** a studio camera seen from the front, on its pedestal: the prompter hood faces us; tally on top */
  const camera = () => sprite('nrf_cam', 280, 620, 140, 600, (g) => {
    g.fillStyle = '#0c1a20'; g.fillRect(-14, -360, 28, 360); g.beginPath(); g.moveTo(-110, 0); g.lineTo(110, 0); g.lineTo(60, -40); g.lineTo(-60, -40); g.closePath(); g.fill();   // the pedestal
    g.fillStyle = '#1a2c34'; g.beginPath(); g.roundRect(-112, -560, 224, 210, 14); g.fill();                          // the hood
    g.fillStyle = '#0a1418'; g.beginPath(); g.roundRect(-92, -540, 184, 160, 8); g.fill();                            // the prompter glass
    g.fillStyle = 'rgba(147,221,232,.22)'; g.beginPath(); g.moveTo(-92, -540); g.lineTo(-20, -540); g.lineTo(-92, -430); g.closePath(); g.fill();
    g.fillStyle = 'rgba(57,181,201,.35)'; for (let i = 0; i < 4; i++) g.fillRect(-70, -510 + i * 26, 140 - (i % 2) * 40, 8);   // the prompter's text, as bars
    g.fillStyle = '#0c1a20'; g.fillRect(-160, -420, 50, 14); g.fillRect(110, -420, 50, 14);                           // the pan bars
  }, 10);

  /** the Helsinki Cathedral at night, floodlit: podium and steps, portico, drum, the big dome, two corner domes */
  function cathedral(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    const Wt = '#d9e6e8', Wd = '#a9bfc4', D = '#3f7d78';
    g.fillStyle = Wd; for (let k = 0; k < 6; k++) g.fillRect(-260 + k * 8, -k * 14, 520 - k * 16, 14);                 // the steps
    g.fillStyle = Wt; g.fillRect(-200, -260, 400, 176);                                                                 // the body
    g.fillStyle = D; for (const sx of [-1, 1]) { g.fillRect(sx * 170 - 22, -310, 44, 50); g.beginPath(); g.ellipse(sx * 170, -310, 30, 34, 0, Math.PI, TAU); g.fill(); g.fillStyle = N.gold; g.fillRect(sx * 170 - 2, -360, 4, 18); g.fillStyle = D; }   // corner domes
    g.fillStyle = Wd; for (let i = 0; i < 6; i++) g.fillRect(-108 + i * 40, -250, 16, 166);                            // portico columns
    g.fillStyle = Wt; g.beginPath(); g.moveTo(-132, -262); g.lineTo(0, -320); g.lineTo(132, -262); g.closePath(); g.fill();   // pediment
    g.fillStyle = Wt; g.fillRect(-84, -420, 168, 104); g.fillStyle = Wd; for (let i = 0; i < 8; i++) g.fillRect(-78 + i * 21, -412, 9, 92);   // the drum
    g.fillStyle = D; g.beginPath(); g.ellipse(0, -420, 100, 104, 0, Math.PI, TAU); g.fill();                         // the dome
    g.fillStyle = Wt; g.fillRect(-14, -560, 28, 40); g.fillStyle = D; g.beginPath(); g.ellipse(0, -560, 18, 20, 0, Math.PI, TAU); g.fill();
    g.fillStyle = N.gold; g.fillRect(-2, -610, 4, 36); g.fillRect(-12, -598, 24, 4);                                   // the cross
    g.restore();
  }

  /** Frankfurt by night, through the court's window: the Messeturm's pencil top, the Commerzbank
   *  tower and its mast, the Main Tower's antenna, the twin Deutsche Bank towers — with lit floors */
  const frankfurt = () => sheet('nrf_frankfurt2', (g) => {
    const sky = g.createLinearGradient(0, 560, 0, 1160); sky.addColorStop(0, '#163f50'); sky.addColorStop(0.7, '#2f6f80'); sky.addColorStop(1, '#4a8f9b'); g.fillStyle = sky; g.fillRect(-90, 400, W + 180, 900);
    const S0 = '#0a1c25', S1 = '#0d2531', lit = [];
    const tower = (a, b, top, col = S0) => { g.fillStyle = col; g.fillRect(a, top, b - a, 1300 - top); lit.push([a, b, top]); };
    tower(200, 250, 1000); tower(420, 470, 1030); tower(600, 660, 1010); tower(850, 900, 990);                        // the low blocks
    // left pane: the Messeturm (a shaft and its pencil-point pyramid) and the twin Deutsche Bank towers
    g.fillStyle = S1; g.fillRect(268, 760, 84, 600); g.beginPath(); g.moveTo(268, 760); g.lineTo(310, 650); g.lineTo(352, 760); g.closePath(); g.fill(); lit.push([268, 352, 780]);
    tower(362, 404, 820, S0); tower(410, 452, 850, S0);
    // right pane: the Commerzbank tower and its mast, the Main Tower and its antenna
    g.fillStyle = S0; g.fillRect(690, 700, 84, 640); g.fillRect(730, 620, 4, 82); lit.push([690, 774, 720]);
    g.fillStyle = S1; g.beginPath(); g.roundRect(790, 770, 76, 600, [36, 36, 0, 0]); g.fill(); g.fillRect(826, 680, 4, 92); lit.push([790, 866, 800]);
    let r = 11; g.fillStyle = 'rgba(232,197,71,.7)';
    for (const [a, b, top] of lit) for (let y = top + 14; y < 1180; y += 22) for (let x = a + 8; x < b - 8; x += 15) { r = (r * 9301 + 49297) % 233280; if (r / 233280 < 0.24) g.fillRect(x, y, 6, 9); }
    g.fillStyle = N.red; for (const [x, y] of [[732, 620], [828, 680], [310, 650]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); }   // aircraft lights
  }, 6);

  return { N, box, tag, bands, snow, standee, standeeBare, standeeBack, signCard, SIGN, newsSet, coin, spin, crookMask, paddle, arm, back, front, gavel, block, stamp, slam, register, display, drawer, receipt, camera, cathedral, frankfurt };
})();
