// THE KIT for "Approved Vendor" (Global 1): the papercut box in CLEAN LIGHT (rfp_clean.js), made by the pipeline.
// One question: who approved the ad firm whose ads delivered spyware? A newsroom at night: a masked reporter's hands
// on a paper laptop, and in the corner of the page a cheerful banner ad slides in, a paper sun over SALE. Close on it:
// the cursor never moves, and on "no click" the sun opens into an EYE (the TURN) and a red thread runs out of the ad.
// The thread ends in an auction hall of masked bidders whose paddles carry audiences (2M, 640K…); on "targeted" one
// paddle shoots up: AUDIENCE 1. On the auctioneer's lectern, a clipboard: GLOBAL VENDOR LIST, a row of ticks for what a
// vendor declares, and the sheets riffle 2020 → 2026 on "six years". Then a rubber stamp comes down on that row on
// "October": SUSPENDED · OCT 2026. No nation, no newsroom, no company named, no logo (plan/films/20-approved-vendor.md).
// Every scene is registered here ("scenes": [] in film.json). Times come from window.FILM_PLAN (pipeline/plan.mjs), so
// the eye opens on "no click", the paddle on "targeted", the riffle lands on "six years" and the stamp on "October" in
// every language. Everything is a pure function of the shot's local time.
(() => {
  const R = RFP, { W, H, sheet, sprite, stack, box, put, glow, hand, fist, walker, K } = R, TAU = Math.PI * 2, { clamp, lerp } = U;
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
    wall: ['#0b1118', '#0f1720', '#131d28', '#172331'], win: '#0a1018', winSky: ['#101b2c', '#14223a', '#1a2b47'], city: ['#141e2b', '#1a2635', '#202e3f'], lit: '#e9b85a',
    desk: '#2e2119', deskL: '#43301f', deskD: '#1f1611', lampG: '#2f5a46', lampGL: '#3f7259', lampLight: '#ffd98a',
    shell: '#c3c8cd', shellD: '#8f969d', shellL: '#e2e5e8', kb: '#24282d', key: '#363c43', keyL: '#454c54', bezel: '#14171a',
    page: '#efe9da', pageD: '#ddd5c1', text: '#b8b09d', head: '#3c3a36', chrome: '#2b2f34', chromeL: '#3a3f45',
    sky: '#86c8e6', skyD: '#5aa6cc', skyL: '#b5e0f0', sun: '#f5c63a', sunD: '#d9a11f', sunL: '#fbe08a', red: '#d8402f', cream: '#f4efe2', ribbon: '#fbf7ec',
    eyeW: '#f4efe2', iris: '#1f5866', irisL: '#2f7e8f', pupil: '#0b0d0f', ink: '#15120f',
    thread: '#d8402f',
    hall: ['#2a0e12', '#331116', '#3c151a', '#46191f'], hallL: '#5a2128', rail: '#c9a24a', railD: '#94722a', wains: '#1e0c0d', wainsL: '#2c1214', floor: '#120909',
    paddle: '#efe6cf', paddleD: '#cfc4a8', stick: '#5b3a24',
    lectern: '#3a2416', lecternL: '#52331f', lecternD: '#2a190f', board: '#7a5236', boardD: '#5a3b26', boardL: '#916447', clip: '#b9bec5', clipD: '#7d838b', clipL: '#e3e6e9',
    paper: '#f3ead4', paperD: '#d8cdb2', paperB: '#e8dec6', rule: '#cbbf9f', tick: '#2f7d4f', band: 'rgba(227,163,58,.26)', grey: '#b7ad97', greyD: '#9d937d',
    stamp: '#c9342b', stampWood: '#6b4528', stampWoodL: '#86593a', stampBase: '#2a2420',
  };

  /** the where/what tag in the lower corner (the house look), with a Japanese face behind the Latin one */
  function tag(c, text, lt, dd, x = 110) {
    const y = R.SAFE_B - 66, a = clamp((lt - 0.5) / 0.3, 0, 1) * clamp((dd - 0.6 - lt) / 0.3, 0, 1); if (a <= 0) return;
    c.save(); c.globalAlpha = a; c.font = `32px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }

  // ── the banner ad: a paper sun over SALE on a sky card. Drawn live, because its sun turns into an eye ─────────
  const AD = { w: 230, h: 290 };                       // in "ad units"; drawn at any scale
  const SUN = { x: 0, y: -48, r: 52 };
  const adCard = () => sprite('av_ad', 260, 320, 130, 160, (g) => {
    const { w, h } = AD;
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, C.skyL); gr.addColorStop(1, C.sky); g.fillStyle = gr;
    g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 10); g.fill();
    g.fillStyle = C.skyD; g.fillRect(-w / 2, h / 2 - 8, w, 8);
    // two paper clouds
    g.fillStyle = C.cream; for (const [x, y, s] of [[-70, -100, 1], [72, 4, 0.8]]) { g.beginPath(); g.arc(x - 16 * s, y, 15 * s, 0, TAU); g.arc(x + 4 * s, y - 8 * s, 19 * s, 0, TAU); g.arc(x + 24 * s, y, 14 * s, 0, TAU); g.fill(); g.fillRect(x - 30 * s, y, 66 * s, 12 * s); }
    // the ribbon with SALE
    g.fillStyle = C.ribbon; g.beginPath(); g.moveTo(-w / 2 + 14, 52); g.lineTo(w / 2 - 14, 52); g.lineTo(w / 2 - 4, 82); g.lineTo(w / 2 - 14, 112); g.lineTo(-w / 2 + 14, 112); g.lineTo(-w / 2 + 4, 82); g.closePath(); g.fill();
    g.fillStyle = C.red; g.textAlign = 'center'; g.font = '400 50px "ArchivoBlack-400"'; g.fillText('SALE', 0, 101);
    g.fillStyle = 'rgba(21,18,15,.55)'; g.font = '400 15px "ArchivoBlack-400"'; g.fillText('SHOP NOW ›', 0, 134);
  }, 6);
  /**
   * The sun, or the eye it turns into. o = 0..1 how far the eye is open (0 = the sun), look = [-1..1, -1..1] where the
   * iris looks, blink 0..1 closes it again, spin turns the rays. Drawn in ad units at the origin of the sun.
   */
  function sunEye(g, o, look = [0, 0], blink = 0, spin = 0) {
    const r = SUN.r, ow = clamp(o, 0, 1), open = ow * (1 - blink);
    // the rays: twelve paper triangles; as the eye opens the lower ones fold away and the upper ones become lashes
    for (let i = 0; i < 12; i++) {
      const a = spin + (i / 12) * TAU, up = -Math.sin(a) > 0.2, lower = !up;
      let len = 26, wid = 0.16, col = C.sun;
      if (lower) { len *= 1 - ow; } else { len = lerp(26, 20, ow); wid = lerp(0.16, 0.07, ow); col = ow > 0.5 ? C.ink : C.sun; }
      if (len < 1) continue;
      g.fillStyle = col; g.beginPath(); g.moveTo(Math.cos(a - wid) * (r + 4), Math.sin(a - wid) * (r + 4)); g.lineTo(Math.cos(a) * (r + 4 + len), Math.sin(a) * (r + 4 + len)); g.lineTo(Math.cos(a + wid) * (r + 4), Math.sin(a + wid) * (r + 4)); g.closePath(); g.fill();
    }
    g.fillStyle = C.sunD; g.beginPath(); g.arc(2, 3, r, 0, TAU); g.fill();
    g.fillStyle = C.sun; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = C.sunL; g.beginPath(); g.arc(-12, -14, r * 0.42, 0, TAU); g.fill();
    if (open <= 0.005) return;
    // the aperture: an almond that opens from a closed seam to most of the disc
    const ax = r * 0.96, ay = r * 0.7 * open;
    const almond = new Path2D(); almond.moveTo(-ax, 0); almond.quadraticCurveTo(0, -ay * 1.9, ax, 0); almond.quadraticCurveTo(0, ay * 1.9, -ax, 0); almond.closePath();
    g.save(); g.clip(almond);
    g.fillStyle = C.eyeW; g.fillRect(-r, -r, 2 * r, 2 * r);
    const ix = look[0] * r * 0.38, iy = look[1] * r * 0.18, ir = r * 0.46;
    g.fillStyle = C.iris; g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.fill();
    g.fillStyle = C.irisL; g.beginPath(); g.arc(ix, iy, ir * 0.72, 0, TAU); g.fill();
    g.fillStyle = C.pupil; g.beginPath(); g.arc(ix, iy, ir * 0.42, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(ix - ir * 0.3, iy - ir * 0.32, ir * 0.15, 0, TAU); g.fill();
    g.fillStyle = 'rgba(21,18,15,.22)'; g.fillRect(-r, -r, 2 * r, r * 0.38 + (1 - open) * r * 0.4);     // the lid's shadow on the white
    g.restore();
    g.strokeStyle = C.ink; g.lineWidth = 4; g.lineJoin = 'round'; g.stroke(almond);
  }
  /** the whole ad at (x, y), scale s: the card, then the sun or the eye on it */
  function ad(c, x, y, s, { o = 0, look = [0, 0], blink = 0, spin = 0, rot = 0, lift = 1 } = {}) {
    put(c, adCard(), x, y, { sc: s, rot, lift });
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.translate(SUN.x, SUN.y); sunEye(c, o, look, blink, spin); c.restore();
  }

  // ── the cursor: a white arrow, parked. It never moves ───────────────────────────────────────────────────────────
  const cursor = () => sprite('av_cursor', 70, 100, 8, 8, (g) => {
    g.fillStyle = '#fff'; g.strokeStyle = C.ink; g.lineWidth = 4; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 64); g.lineTo(16, 50); g.lineTo(28, 78); g.lineTo(40, 72); g.lineTo(28, 46); g.lineTo(48, 46); g.closePath(); g.fill(); g.stroke();
  }, 5);

  // ═════════ 1 · av_room: a newsroom at night; a masked reporter's hands on a laptop; the ad slides in ═════════
  const room = () => sheet('av_room', (g) => {
    C.wall.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, -90 + i * 260, W + 180, H + 180); });
    // the long window onto the city
    const wx0 = 40, wx1 = W - 40, wy0 = 470, wy1 = 900;
    C.winSky.forEach((col, i) => { g.fillStyle = col; g.fillRect(wx0, wy0 + i * 140, wx1 - wx0, wy1 - wy0); });
    const r = U.rng(9);
    C.city.forEach((col, j) => {
      g.fillStyle = col; let x = wx0;
      while (x < wx1) { const w = 50 + r() * 110, h = 120 + r() * 230 - j * 50; g.fillRect(x, wy1 - h, w, h); if (j === 2) for (let yy = wy1 - h + 16; yy < wy1 - 12; yy += 26) for (let xx = x + 10; xx < x + w - 14; xx += 22) if (r() < 0.32) { g.fillStyle = r() < 0.75 ? C.lit : '#c9d6e6'; g.fillRect(xx, yy, 9, 12); g.fillStyle = col; } x += w + 6; }
    });
    g.fillStyle = C.win; for (let x = wx0; x <= wx1; x += (wx1 - wx0) / 4) g.fillRect(x - 9, wy0, 18, wy1 - wy0); g.fillRect(wx0, wy0 - 12, wx1 - wx0, 20); g.fillRect(wx0, wy1 - 8, wx1 - wx0, 22);
    // a strip light under the ceiling, off
    g.fillStyle = '#1d2a36'; g.fillRect(140, 300, 800, 16);
    // the far row of desks, monitors asleep
    g.fillStyle = '#0c1117'; g.fillRect(-90, 700, W + 180, 120);
    for (const x of [130, 330, 560]) { g.fillStyle = '#10161d'; g.fillRect(x - 70, 600, 140, 90); g.fillStyle = '#1a2836'; g.fillRect(x - 62, 608, 124, 74); g.fillStyle = '#0c1117'; g.fillRect(x - 8, 690, 16, 12); }
  }, 16);
  /** the near desk: dark wood from the laptop's foot to the bottom of the frame */
  const desk = () => sheet('av_desk', (g) => {
    g.fillStyle = C.deskD; g.fillRect(-90, 1360, W + 180, H);
    g.fillStyle = C.desk; g.fillRect(-90, 1372, W + 180, H);
    g.fillStyle = C.deskL; g.fillRect(-90, 1372, W + 180, 6);
    const r = U.rng(3); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { const y = 1400 + r() * 560; g.beginPath(); g.moveTo(-90, y); g.bezierCurveTo(300, y + (r() - 0.5) * 30, 700, y + (r() - 0.5) * 30, W + 90, y + (r() - 0.5) * 20); g.stroke(); }
  }, 14);
  /** a far colleague under a green lamp: masked, at a desk card */
  function colleague(g, lt, ox, oy) {
    const x = 850 + ox, y = 640 + oy;
    glow(g, x - 110, y + 20, 240, 'rgba(255,217,138,', 0.2);
    walker(g, x, y, 0.42, { coat: '#2a3a46', scarf: K.red, t: lt, led: false, look: -0.5 + Math.sin(lt * 0.6) * 0.2 });
    put(g, sprite('av_fardesk', 420, 140, 210, 10, (q) => {
      q.fillStyle = C.deskD; q.fillRect(-210, 0, 420, 130); q.fillStyle = C.deskL; q.fillRect(-210, 0, 420, 8);
      q.fillStyle = C.lampG; q.fillRect(-190, -70, 90, 34); q.fillStyle = C.lampGL; q.fillRect(-190, -70, 90, 8); q.fillStyle = '#c9a24a'; q.fillRect(-148, -36, 6, 36); q.fillRect(-166, -4, 42, 6);
    }, 8), x, y + 60, { lift: 0.6 });
  }
  /** the laptop's screen content (the page being written), cached: browser chrome, headline, text, an empty column */
  const LP = { x0: 150, x1: 930, y0: 760, y1: 1300 };     // the lid, outer
  const SC = { x0: 176, x1: 904, y0: 786, y1: 1272 };     // the screen
  const CARET = 200;                                      // where the last line ends and the caret blinks
  const screenPage = () => sprite('av_screen', SC.x1 - SC.x0, SC.y1 - SC.y0, 0, 0, (g) => {
    const w = SC.x1 - SC.x0, h = SC.y1 - SC.y0;
    g.fillStyle = C.page; g.fillRect(0, 0, w, h);
    g.fillStyle = C.chrome; g.fillRect(0, 0, w, 40); g.fillStyle = C.chromeL; g.beginPath(); g.roundRect(120, 9, w - 200, 22, 11); g.fill();
    for (const [i, col] of [['#d8402f', 0], ['#e3a33a', 1], ['#3fae6a', 2]].map((a, i) => [i, a[0]])) { g.fillStyle = col; g.beginPath(); g.arc(22 + i * 22, 20, 7, 0, TAU); g.fill(); }
    g.fillStyle = C.head; g.fillRect(34, 76, 380, 26); g.fillRect(34, 112, 300, 26);
    const r = U.rng(12); g.fillStyle = C.text;
    for (let i = 0; i < 12; i++) { const y = 170 + i * 24; if (i === 5) continue; g.fillRect(34, y, i === 11 ? CARET - 40 : 330 + r() * 110, 10); }
    g.strokeStyle = C.pageD; g.lineWidth = 2; g.beginPath(); g.moveTo(470, 60); g.lineTo(470, h - 20); g.stroke();
  }, 2);
  const AD1 = { x: 778, y: 1010, s: 0.92 };              // where the ad sits in the page's right column
  function laptop(g, lt, ox, oy, adK, adKick) {
    // the lid
    put(g, sprite('av_lid', LP.x1 - LP.x0 + 20, LP.y1 - LP.y0 + 20, 10, 10, (q) => {
      q.fillStyle = C.shellD; q.beginPath(); q.roundRect(0, 0, LP.x1 - LP.x0, LP.y1 - LP.y0, 20); q.fill();
      q.fillStyle = C.bezel; q.beginPath(); q.roundRect(8, 8, LP.x1 - LP.x0 - 16, LP.y1 - LP.y0 - 18, 14); q.fill();
    }, 10), LP.x0 + ox, LP.y0 + oy, { lift: 1.0 });
    g.save(); g.beginPath(); g.rect(SC.x0 + ox, SC.y0 + oy, SC.x1 - SC.x0, SC.y1 - SC.y0); g.clip();
    g.drawImage(screenPage().c, SC.x0 + ox - screenPage().ox, SC.y0 + oy - screenPage().oy);
    // the caret at the end of the last line, blinking: somebody is writing
    if (Math.floor(lt * 2) % 2 === 0) { g.fillStyle = C.head; g.fillRect(SC.x0 + ox + CARET, SC.y0 + oy + 170 + 11 * 24 - 6, 4, 22); }
    if (adK > 0) ad(g, AD1.x + ox + (1 - ease.back(adK)) * 330, AD1.y + oy, AD1.s * (1 + adKick), { lift: 0.5, spin: lt * 0.25 });
    g.restore();
    put(g, cursor(), SC.x0 + ox + 300, SC.y0 + oy + 330, { lift: 0.4, sc: 0.8 });
    // the screen's own light, cool
    g.save(); g.globalCompositeOperation = 'lighter'; const gl = g.createLinearGradient(0, SC.y0 + oy, 0, SC.y1 + oy); gl.addColorStop(0, 'rgba(200,225,255,.05)'); gl.addColorStop(1, 'rgba(200,225,255,0)'); g.fillStyle = gl; g.fillRect(SC.x0 + ox, SC.y0 + oy, SC.x1 - SC.x0, SC.y1 - SC.y0); g.restore();
    // the base and its keys
    put(g, sprite('av_base', 980, 200, 490, 10, (q) => {
      q.fillStyle = C.shellD; q.beginPath(); q.moveTo(-400, 0); q.lineTo(400, 0); q.lineTo(470, 170); q.lineTo(-470, 170); q.closePath(); q.fill();
      q.fillStyle = C.shell; q.beginPath(); q.moveTo(-396, 0); q.lineTo(396, 0); q.lineTo(462, 158); q.lineTo(-462, 158); q.closePath(); q.fill();
      q.fillStyle = C.shellL; q.fillRect(-396, 0, 792, 5);
      for (let row = 0; row < 4; row++) { const y = 18 + row * 26, sp = lerp(400, 440, row / 4) - 40, n = 13; for (let i = 0; i < n; i++) { const x = -sp + (i + 0.5) * (2 * sp / n); q.fillStyle = C.kb; q.fillRect(x - 24, y, 48, 21); q.fillStyle = C.key; q.fillRect(x - 21, y + 2, 42, 15); } }
      q.fillStyle = C.kb; q.fillRect(-170, 124, 340, 22);
    }, 10), 540 + ox, LP.y1 + oy - 4, { lift: 1.2 });
  }
  SCENES.av_room = { draw(c, lt) {
    const id = 'av_room', dd = dur(id), tS = at(id, 'slide', 0.9), tA = at(id, 'ad', 1.96);
    const adK = (lt - tS) / 0.38, adKick = lt > tA ? 0.08 * Math.exp(-(lt - tA) * 6) * Math.sin((lt - tA) * 18) : 0;
    const cam = { x: Math.sin(lt * 0.3) * 8, y: 0, z: punch(lt, [tA], { kick: 0.02 }) * lerp(1, 1.07, ease.io(lt / dd)), fx: 640, fy: 1040 };
    stack(c, [
      { sh: room(), d: 0.04, lift: 0 },
      { fn: (g, ox, oy) => colleague(g, lt, ox, oy), d: 0.08 },
      { sh: desk(), d: 0.2, lift: 0.4 },
      { d: 0.3, fn: (g, ox, oy) => {
        laptop(g, lt, ox, oy, adK, adKick);
        // the reporter's gloved hands on the keys, typing; the arms run off the bottom of the frame
        const t1 = Math.abs(Math.sin(lt * 9)) * 6, t2 = Math.abs(Math.sin(lt * 9 + 1.7)) * 6;
        hand(g, 360 + ox, 1452 + oy - t1, 0.82, 0.32);
        hand(g, 720 + ox, 1452 + oy - t2, 0.82, -0.32);
        glow(g, 540 + ox, 1330 + oy, 520, 'rgba(190,215,255,', 0.1);
      } },
    ], cam);
    tag(c, ui('room', 'A NEWSROOM · NIGHT'), lt, dd);
    box(c);
  } };

  // ═════════ 2 · av_eye: close on the ad; the cursor never moves; on "no click" the sun opens into an eye ═════════
  const page2 = () => sheet('av_page2', (g) => {
    g.fillStyle = C.page; g.fillRect(-90, -90, W + 180, H + 180);
    // the article's column, close and out of focus: headline bars, then body lines with a paragraph break
    const r = U.rng(31);
    g.fillStyle = C.head; g.fillRect(-40, 470, 330, 44); g.fillRect(-40, 530, 250, 44);
    g.fillStyle = C.text; for (let i = 0; i < 26; i++) { if (i === 9 || i === 18) continue; const y = 640 + i * 40; g.fillRect(-40, y, i === 8 || i === 17 ? 140 : 250 + r() * 60, 16); }
    g.strokeStyle = C.pageD; g.lineWidth = 4; g.beginPath(); g.moveTo(352, -90); g.lineTo(352, H + 90); g.stroke();
    // the bezel: the screen ends just above the bottom of the frame
    g.fillStyle = C.bezel; g.fillRect(-90, 1700, W + 180, 400);
    g.fillStyle = C.shellD; g.fillRect(-90, 1790, W + 180, 300);
  }, 14);
  const AD2 = { x: 650, y: 1050, s: 2.5 };
  SCENES.av_eye = { draw(c, lt) {
    const id = 'av_eye', dd = dur(id), tO = at(id, 'open', 2.49);
    const o = ease.out((lt - tO) / 0.42);
    // where the eye looks: straight at the cursor as it opens, then round at us; one blink
    const lk = lt < tO + 0.7 ? [-0.9, 0.3] : lt < tO + 1.25 ? [lerp(-0.9, 0.15, ease.io((lt - tO - 0.7) / 0.3)), lerp(0.3, 0, ease.io((lt - tO - 0.7) / 0.3))] : [0.15 + Math.sin(lt * 0.9) * 0.05, 0];
    const bl = Math.max(0, 1 - Math.abs(lt - (tO + 2.1)) / 0.09);
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [tO], { kick: 0.04 }) * lerp(1.0, 1.08, ease.io(lt / dd)), fx: AD2.x, fy: AD2.y - 110 };
    const thK = ease.out((lt - tO - 0.75) / 0.7);
    stack(c, [
      { sh: page2(), d: 0.1, lift: 0.2 },
      // when the eye opens the screen dims round it: the page was never the thing being looked at
      { d: 0.1, fn: (g) => { if (o <= 0) return; const v = g.createRadialGradient(AD2.x, AD2.y - 120, 200, AD2.x, AD2.y - 120, 1300); v.addColorStop(0, 'rgba(8,10,14,0)'); v.addColorStop(1, `rgba(8,10,14,${0.55 * o})`); g.fillStyle = v; g.fillRect(-90, -90, W + 180, H + 180); } },
      { d: 0.3, fn: (g, ox, oy) => {
        // the red thread runs out of the bottom of the ad, down, and out of the frame
        if (thK > 0) {
          const a = [AD2.x + ox + 40, AD2.y + oy + AD.h / 2 * AD2.s - 30], b = [AD2.x + ox + 170, H + 60], m = [AD2.x + ox + 220, AD2.y + oy + 600];
          for (const [dx, dy, col, w] of [[5, 8, 'rgba(0,0,0,.3)', 7], [0, 0, C.thread, 6.5]]) {
            g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0] + dx, a[1] + dy);
            const N = 40; for (let i = 1; i <= N * thK; i++) { const t = i / N, x = (1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * m[0] + t * t * b[0], y = (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * m[1] + t * t * b[1]; g.lineTo(x + dx, y + dy); }
            g.stroke(); g.restore();
          }
        }
        ad(g, AD2.x + ox, AD2.y + oy, AD2.s * (1 + (lt > tO ? 0.03 * Math.exp(-(lt - tO) * 5) * Math.sin((lt - tO) * 16) : 0)), { o, look: lk, blink: bl, spin: lt * 0.25 * (1 - o), lift: 1.4 });
        if (o > 0) glow(g, AD2.x + ox, AD2.y + oy + SUN.y * AD2.s, 260 * o, 'rgba(216,64,47,', 0.12 * o);
        // the cursor, parked where it was, and its count
        put(g, cursor(), 170 + ox, 1270 + oy, { lift: 0.6, sc: 1.5 });
      } },
    ], cam);
    tag(c, ui('dateline', 'CITIZEN LAB · 15.10.2026'), lt, dd);
    box(c);
  } };

  // ═════════ 3 · av_bid: the auction hall; paddles carry audiences; on "targeted" one goes up: AUDIENCE 1 ═════════
  const hall = () => sheet('av_hall', (g) => {
    C.hall.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, -90 + i * 280, W + 180, H + 180); });
    // panels and the brass rail
    for (let x = 30; x < W; x += 255) { g.strokeStyle = C.hallL; g.lineWidth = 6; g.strokeRect(x, 480, 200, 340); }
    g.fillStyle = C.railD; g.fillRect(-90, 860, W + 180, 18); g.fillStyle = C.rail; g.fillRect(-90, 858, W + 180, 8);
    g.fillStyle = C.wains; g.fillRect(-90, 878, W + 180, 600); for (let x = 0; x < W + 90; x += 180) { g.fillStyle = C.wainsL; g.fillRect(x, 900, 150, 200); }
    g.fillStyle = C.floor; g.fillRect(-90, 1420, W + 180, 700);
  }, 14);
  /** a paddle: a cream oval on a stick, AUDIENCE over a number; origin at the grip */
  const paddle = (label, key = false) => sprite(`av_pad_${label}_${key}`, 220, 420, 110, 300, (g) => {
    g.fillStyle = C.stick; g.fillRect(-7, -120, 14, 130);
    g.fillStyle = key ? '#fff7e6' : C.paddle; g.beginPath(); g.ellipse(0, -205, 98, 100, 0, 0, TAU); g.fill();
    g.strokeStyle = key ? C.red : C.paddleD; g.lineWidth = key ? 7 : 4; g.beginPath(); g.ellipse(0, -205, 88, 90, 0, 0, TAU); g.stroke();
    g.fillStyle = key ? C.red : C.ink; g.textAlign = 'center'; g.font = '400 19px "ArchivoBlack-400"'; g.fillText('AUDIENCE', 0, -238);
    g.font = `400 ${key ? 112 : 70}px "Anton-400"`; g.fillText(label, 0, key ? -128 : -150);
    g.fillStyle = K.ink; g.beginPath(); g.roundRect(-22, -8, 44, 38, 14); g.fill();             // the glove on the grip
  }, 8);
  const BACK = [['2M', 140], ['640K', 335], ['90K', 540], ['1.2M', 745], ['300K', 940]].map(([l, x], i) => ({ l, x, y: 990, s: 0.52, coat: ['#1d2a33', '#26313a', '#22303a', '#1a262f', '#2a343c'][i], side: 1 }));
  const FRONT = [['5M', 210, 1], ['1', 540, 0], ['850K', 870, -1]].map(([l, x, side], i) => ({ l, x, y: 1270, s: 0.84, coat: ['#202c35', '#2b3640', '#1c2830'][i], side: side || 1, key: l === '1' }));
  // who bids when: index into BACK + FRONT, up, down
  const BIDS = [[1, 0.3, 0.95], [5, 0.55, 1.2], [3, 0.85, 1.45], [7, 1.1, 1.7], [0, 1.35, 1.95], [2, 1.6, 2.2]];
  function bidder(g, b, lt, ox, oy, raise, look) {
    const x = b.x + ox, y = b.y + oy, s = b.s;
    walker(g, x, y, s, { coat: b.coat, scarf: K.red, t: lt + b.x * 0.01, led: false, look });
    const px = x + b.side * 120 * s, py = y + 170 * s - raise * 170 * s;
    // the arm that holds it: a sleeve from the shoulder to the grip, so a raised paddle is a raised hand
    const sx = x + b.side * 82 * s, sy = y + 60 * s, ax = px - sx, ay = py - sy, al = Math.hypot(ax, ay);
    g.save(); g.translate(sx, sy); g.rotate(Math.atan2(ay, ax));
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(6 * s, -26 * s + 10 * s, al, 52 * s);
    g.fillStyle = b.coat; g.beginPath(); g.roundRect(0, -26 * s, al, 52 * s, 20 * s); g.fill();
    g.fillStyle = K.red; g.fillRect(al - 34 * s, -28 * s, 18 * s, 56 * s); g.restore();
    put(g, paddle(b.l, !!b.key), px, py, { sc: s * (b.key ? 1.0 + 0.12 * raise : 1), rot: b.side * 0.08 * Math.max(0, 1 - raise), lift: 0.8 + raise * 0.6 });
    return [px, py - 205 * s * (b.key ? 1.0 + 0.12 * raise : 1) - 100 * s * (b.key ? 1.0 + 0.12 * raise : 1)];
  }
  SCENES.av_bid = { draw(c, lt) {
    const id = 'av_bid', dd = dur(id), tN = at(id, 'one', 1.97), ALL = [...BACK, ...FRONT];
    const up = (i) => BIDS.filter((b) => b[0] === i).reduce((a, [, u, d]) => Math.max(a, ease.out((lt - u) / 0.18) * (1 - ease.io((lt - Math.min(d, tN - 0.1)) / 0.22))), 0);
    const kN = ease.back((lt - tN) / 0.32);
    const cam = { x: Math.sin(lt * 0.35) * 8, y: 0, z: punch(lt, [tN], { kick: 0.035 }) * lerp(1.0, 1.06, ease.io(lt / dd)), fx: 540, fy: 1100 };
    stack(c, [
      { sh: hall(), d: 0.05, lift: 0 },
      { fn: (g, ox, oy) => { glow(g, 540 + ox, 620 + oy, 520, 'rgba(255,214,140,', 0.12); }, d: 0.05 },
      { d: 0.16, fn: (g, ox, oy) => { BACK.forEach((b, i) => bidder(g, b, lt, ox, oy, up(i), Math.sin(lt * 0.7 + i) * 0.2)); } },
      { d: 0.3, fn: (g, ox, oy) => {
        if (kN > 0) { const k = clamp(kN, 0, 1); g.save(); g.globalCompositeOperation = 'lighter'; const cx = FRONT[1].x + FRONT[1].side * 120 * FRONT[1].s + ox, gr = g.createLinearGradient(0, 380, 0, 1300); gr.addColorStop(0, `rgba(255,220,150,${0.16 * k})`); gr.addColorStop(1, 'rgba(255,220,150,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(cx - 60, 380 + oy); g.lineTo(cx + 60, 380 + oy); g.lineTo(cx + 260, 1300 + oy); g.lineTo(cx - 260, 1300 + oy); g.closePath(); g.fill(); g.restore(); }
        let keyTop = null;
        FRONT.forEach((b, j) => { const r = b.key ? kN * 3.1 : up(5 + j); const tp = bidder(g, b, lt, ox, oy, r, b.key ? 0 : Math.sin(lt * 0.7 + j * 2) * 0.2); if (b.key) keyTop = tp; });
        // the red thread from the ad comes down from the top of the frame to the one paddle: slack, then taut
        const a = [W + 60 + ox, 560 + oy], k = clamp(kN, 0, 1), sag = lerp(220, 12, k), m = [(a[0] + keyTop[0]) / 2 + 40 * (1 - k), (a[1] + keyTop[1]) / 2 + sag];
        for (const [dx, dy, col, w] of [[5, 8, 'rgba(0,0,0,.3)', 5], [0, 0, C.thread, 4.5]]) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0] + dx, a[1] + dy); g.quadraticCurveTo(m[0] + dx, m[1] + dy, keyTop[0] + dx, keyTop[1] + dy); g.stroke(); }
      } },
    ], cam);
    tag(c, ui('count', 'AT LEAST 45 DEVICES · 2024–25'), lt, dd);
    box(c);
  } };

  // ── the clipboard on the lectern: GLOBAL VENDOR LIST, one sheet a year ───────────────────────────────────────────
  const CB = { x: 540, y: 1070, w: 720, h: 1000 };       // the board, centred
  const SH = { w: 650, h: 880, y0: -400 };                // the sheet, under the clip (board coordinates)
  const ROWS = 9, ROW0 = 250, ROWH = 64, KEYROW = 5;
  const COLS = [{ x: -290, w: 210, k: 'VENDOR' }, { x: -50, k: 'PURPOSES' }, { x: 100, k: 'LEGAL BASIS' }, { x: 250, k: 'CONSENT' }];
  const lectern = () => sheet('av_lectern', (g) => {
    C.hall.forEach((col, i) => { g.fillStyle = col; g.fillRect(-90, -90 + i * 160, W + 180, H + 180); });
    g.fillStyle = C.rail; g.fillRect(-90, 520, W + 180, 6);
    g.fillStyle = C.lecternD; g.beginPath(); g.moveTo(-90, 600); g.lineTo(W + 90, 600); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill();
    g.fillStyle = C.lectern; g.beginPath(); g.moveTo(-60, 620); g.lineTo(W + 60, 620); g.lineTo(W + 90, H + 90); g.lineTo(-90, H + 90); g.closePath(); g.fill();
    g.fillStyle = C.lecternL; g.fillRect(-60, 620, W + 120, 8);
    const r = U.rng(7); g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 2; for (let i = 0; i < 18; i++) { const x = -60 + r() * (W + 120); g.beginPath(); g.moveTo(x, 640); g.bezierCurveTo(x + (r() - 0.5) * 40, 1100, x + (r() - 0.5) * 60, 1500, x + (r() - 0.5) * 50, H + 90); g.stroke(); }
  }, 14);
  const boardSp = () => sprite('av_board', CB.w + 20, CB.h + 20, CB.w / 2 + 10, CB.h / 2 + 10, (g) => {
    g.fillStyle = C.boardD; g.beginPath(); g.roundRect(-CB.w / 2, -CB.h / 2, CB.w, CB.h, 22); g.fill();
    g.fillStyle = C.board; g.beginPath(); g.roundRect(-CB.w / 2 + 4, -CB.h / 2 + 2, CB.w - 10, CB.h - 10, 20); g.fill();
    g.fillStyle = C.boardL; g.fillRect(-CB.w / 2 + 20, -CB.h / 2 + 6, CB.w - 40, 4);
  }, 12);
  const clipSp = () => sprite('av_clip', 300, 140, 150, 70, (g) => {
    g.fillStyle = C.clipD; g.beginPath(); g.roundRect(-130, -30, 260, 70, 12); g.fill();
    g.fillStyle = C.clip; g.beginPath(); g.roundRect(-126, -34, 252, 62, 12); g.fill();
    g.fillStyle = C.clipL; g.fillRect(-116, -30, 232, 6);
    g.fillStyle = C.clipD; g.beginPath(); g.roundRect(-46, -62, 92, 44, 16); g.fill(); g.fillStyle = C.board; g.beginPath(); g.roundRect(-26, -52, 52, 24, 10); g.fill();
  }, 8);
  /** a hand-drawn tick, as a path from (x, y), size s */
  const tickPath = (x, y, s = 1) => { const p = new Path2D(); p.moveTo(x - 16 * s, y - 2 * s); p.lineTo(x - 4 * s, y + 12 * s); p.lineTo(x + 20 * s, y - 18 * s); return p; };
  /** one year's sheet: header, the year big in the corner, the table; ticks everywhere except the firm's row, which is drawn live on the first */
  const sheetSp = (year, keyTicks = true) => sprite(`av_sheet_${year}_${keyTicks}`, SH.w + 10, SH.h + 10, SH.w / 2 + 5, 5, (g) => {
    g.fillStyle = C.paper; g.fillRect(-SH.w / 2, 0, SH.w, SH.h);
    g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(-SH.w / 2, 0, SH.w, 4);
    g.fillStyle = C.ink; g.textAlign = 'left'; g.font = '400 40px "ArchivoBlack-400"'; g.fillText('GLOBAL', -SH.w / 2 + 40, 118); g.fillText('VENDOR LIST', -SH.w / 2 + 40, 166);
    g.textAlign = 'right'; g.fillStyle = C.ink; g.font = '400 112px "Anton-400"'; g.fillText(String(year), SH.w / 2 - 36, 170);
    g.fillStyle = C.rule; g.fillRect(-SH.w / 2 + 36, 196, SH.w - 72, 4);
    g.fillStyle = C.greyD; g.font = '400 21px "ArchivoBlack-400"'; g.textAlign = 'center';
    for (const col of COLS) g.fillText(col.k, col.k === 'VENDOR' ? col.x + 60 : col.x, 234);
    const r = U.rng(year);
    for (let i = 0; i < ROWS; i++) {
      const y = ROW0 + i * ROWH;
      if (i === KEYROW) { g.fillStyle = C.band; g.fillRect(-SH.w / 2 + 24, y + 4, SH.w - 48, ROWH - 8); }
      g.fillStyle = C.rule; g.fillRect(-SH.w / 2 + 36, y + ROWH - 2, SH.w - 72, 2);
      g.fillStyle = i === KEYROW ? C.greyD : C.grey; g.fillRect(COLS[0].x, y + 22, 120 + (U.rng(i * 7 + 1)() * 100), 18);
      for (const col of COLS.slice(1)) {
        g.strokeStyle = C.greyD; g.lineWidth = 3; g.strokeRect(col.x - 18, y + 14, 36, 36);
        if (i !== KEYROW || keyTicks) { g.strokeStyle = C.tick; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(tickPath(col.x + 2, y + 32, 0.95 + (r() - 0.5) * 0.15)); }
      }
    }
  }, 5);
  const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  /**
   * The clipboard at board-centre (x, y): `top` is the index of the sheet on top, `flipK` how far it has lifted
   * (0..1: it swings up toward us on the clip and is gone), `live` draws the firm's ticks on the first sheet over time.
   */
  const CBS = 1.12;                                       // the board's scale on the lectern
  function clipboard(g, x, y, rot, { top = 0, flipK = 0, liveK = 1, jolt = 0 } = {}) {
    g.save(); g.translate(x, y + jolt); g.rotate(rot); g.scale(CBS, CBS);
    put(g, boardSp(), 0, 0, { lift: 1.3 });
    const sy = -CB.h / 2 + 60, under = Math.min(top + 1, YEARS.length - 1);
    // the sheet underneath (the next year), then the top one
    if (flipK > 0 && top + 1 < YEARS.length) put(g, sheetSp(YEARS[under]), 0, sy, { lift: 0.3 });
    if (flipK < 1) {
      const s = Math.cos(Math.PI / 2 * ease.in(flipK));
      g.save(); g.translate(0, sy); g.scale(1, Math.max(0.001, s)); g.translate(0, -sy);
      const first = top === 0 && liveK < 1;
      put(g, sheetSp(YEARS[top], !first), 0, sy, { lift: 0.3 + flipK * 2 });
      if (first) {                                                        // the firm's row: three ticks drawn in, one by one
        const yy = sy + ROW0 + KEYROW * ROWH + 32;
        g.strokeStyle = C.tick; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
        COLS.slice(1).forEach((col, i) => { const k = clamp(liveK * 3 - i, 0, 1); if (k <= 0) return; g.save(); g.setLineDash([60 * k, 80]); g.stroke(tickPath(col.x + 2, yy, 0.95)); g.restore(); });
      }
      if (flipK > 0) { g.fillStyle = `rgba(30,20,10,${0.25 * flipK})`; g.fillRect(-SH.w / 2, sy, SH.w, SH.h); }
      g.restore();
    }
    put(g, clipSp(), 0, -CB.h / 2 + 50, { lift: 1.0 });
    g.restore();
  }
  /** the board's row of the firm, in layer coordinates — where the stamp lands */
  const keyRowAt = (x, y, rot) => { const ry = (-CB.h / 2 + 60 + ROW0 + KEYROW * ROWH + ROWH / 2) * CBS, rx = 60 * CBS; return [x - Math.sin(rot) * ry + Math.cos(rot) * rx, y + Math.cos(rot) * ry + Math.sin(rot) * rx]; };

  // ═════════ 4 · av_list: the vendor list; the firm's row ticked; on "six years" the sheets riffle 2020 → 2026 ═════════
  let FLIPS = null;
  const flips = (tF, tN) => {
    if (FLIPS && FLIPS.key === `${tF}|${tN}`) return FLIPS;
    const n = YEARS.length - 1, fd = 0.2, step = Math.max(0.12, (tN - fd - tF) / (n - 1));
    return (FLIPS = { key: `${tF}|${tN}`, fd, ts: Array.from({ length: n }, (_, i) => tN - fd - (n - 1 - i) * step) });
  };
  SCENES.av_list = { draw(c, lt) {
    const id = 'av_list', dd = dur(id), tF = at(id, 'flip', 0.6), tN = at(id, 'six', 2.2), F = flips(tF, tN);
    let top = 0, flipK = 0;
    F.ts.forEach((t, i) => { if (lt >= t + F.fd) top = i + 1; else if (lt >= t) { top = i; flipK = (lt - t) / F.fd; } });
    const jolt = lt > tN ? 10 * Math.exp(-(lt - tN) * 7) * Math.sin((lt - tN) * 20) : 0;
    const liveK = clamp((lt - 0.15) / 0.5, 0, 1);
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [tN], { kick: 0.03 }) * lerp(1.0, 1.05, ease.io(lt / dd)), fx: 540, fy: 1060 };
    stack(c, [
      { sh: lectern(), d: 0.05, lift: 0 },
      { d: 0.3, fn: (g, ox, oy) => clipboard(g, CB.x + ox, CB.y + oy + 40 * (1 - ease.out(lt / 0.5)), -0.025 + Math.sin(lt * 0.5) * 0.004, { top, flipK, liveK, jolt }) },
    ], cam);
    tag(c, ui('list', 'IAB EUROPE · GLOBAL VENDOR LIST'), lt, dd);
    box(c);
  } };

  // ═════════ 5 · av_stamp: the same row; on "October" a rubber stamp comes down: SUSPENDED · OCT 2026 ═════════
  /** the stamp in a gloved fist: wooden knob and body, black rubber; origin at the rubber's face */
  const stampSp = () => sprite('av_stamp', 600, 520, 300, 420, (g) => {
    g.fillStyle = C.stampBase; g.beginPath(); g.roundRect(-275, -50, 550, 50, 8); g.fill();
    g.fillStyle = C.stampWood; g.beginPath(); g.roundRect(-262, -128, 524, 82, 10); g.fill(); g.fillStyle = C.stampWoodL; g.fillRect(-254, -124, 508, 10);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-262, -62, 524, 14);
    g.fillStyle = C.stampWood; g.beginPath(); g.moveTo(-46, -128); g.lineTo(46, -128); g.lineTo(32, -270); g.lineTo(-32, -270); g.closePath(); g.fill();
    g.fillStyle = C.stampWoodL; g.beginPath(); g.ellipse(0, -310, 78, 56, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,240,210,.18)'; g.beginPath(); g.ellipse(-22, -326, 34, 18, -0.3, 0, TAU); g.fill();
  }, 10);
  /** the ink it leaves: a rounded box, SUSPENDED, and the month; a little uneven, as a stamp is */
  const inkSp = () => sprite('av_ink', 560, 220, 280, 110, (g) => {
    g.strokeStyle = C.stamp; g.lineWidth = 9; g.beginPath(); g.roundRect(-262, -92, 524, 184, 18); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.roundRect(-248, -78, 496, 156, 12); g.stroke();
    g.fillStyle = C.stamp; g.textAlign = 'center'; g.font = '400 74px "ArchivoBlack-400"'; g.fillText('SUSPENDED', 0, 14);
    g.font = '400 40px "ArchivoBlack-400"'; g.fillText('OCT 2026', 0, 64);
    // where the rubber did not take
    g.globalCompositeOperation = 'destination-out'; const r = U.rng(19);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`; const x = (r() - 0.5) * 540, y = (r() - 0.5) * 200; g.fillRect(x, y, 2 + r() * 7, 1 + r() * 3); }
  }, 2);
  SCENES.av_stamp = { draw(c, lt) {
    const id = 'av_stamp', dd = dur(id), tL = at(id, 'lift', 0.5), tS = at(id, 'stamp', 1.25);
    const rot = -0.025, bx = CB.x, by = CB.y - 40;
    const jolt = lt > tS ? 12 * Math.exp(-(lt - tS) * 8) * Math.sin((lt - tS) * 24) : 0;
    const [rx, ry] = keyRowAt(bx, by, rot);
    // the stamp: hovers off to the right, winds up on "lift", slams on the pop, holds, and lifts away to the right
    const hover = [rx + 300, ry - 190], wind = [rx + 260, ry - 300], down = [rx + 10, ry + 8];
    let p = hover, sR = 0.18;
    if (lt < tL) p = [hover[0], hover[1] + Math.sin(lt * 2.2) * 10];
    else if (lt < tS - 0.12) { const k = ease.out((lt - tL) / Math.max(0.1, tS - 0.12 - tL)); p = [lerp(hover[0], wind[0], k), lerp(hover[1], wind[1], k)]; sR = lerp(0.18, 0.28, k); }
    else if (lt < tS) { const k = ease.in((lt - (tS - 0.12)) / 0.12); p = [lerp(wind[0], down[0], k), lerp(wind[1], down[1], k)]; sR = lerp(0.28, -0.1, k); }
    else if (lt < tS + 0.42) { p = down; sR = -0.1; }
    else { const k = ease.io((lt - tS - 0.42) / 0.5); p = [lerp(down[0], rx + 760, k), lerp(down[1], ry - 420, k)]; sR = lerp(-0.1, 0.3, k); }
    const inkOn = lt >= tS;
    const cam = { x: Math.sin(lt * 0.3) * 5, y: 0, z: punch(lt, [tS], { kick: 0.05, open: 0.02 }) * lerp(1.18, 1.26, ease.io(lt / dd)), fx: 560, fy: ry };
    stack(c, [
      { sh: lectern(), d: 0.05, lift: 0 },
      { d: 0.3, fn: (g, ox, oy) => {
        clipboard(g, bx + ox, by + oy, rot, { top: YEARS.length - 1, jolt });
        if (inkOn) { const k = clamp((lt - tS) / 0.05, 0, 1); g.save(); g.globalAlpha = 0.92 * k; g.translate(rx + 10 + ox, ry + 8 + oy + jolt); g.rotate(-0.1); g.drawImage(inkSp().c, -inkSp().ox, -inkSp().oy); g.restore(); }
        // a puff of paper dust where it hits
        if (lt > tS && lt < tS + 0.5) { const k = (lt - tS) / 0.5; g.fillStyle = `rgba(243,234,212,${0.6 * (1 - k)})`; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, d = 170 + 120 * ease.out(k); g.beginPath(); g.arc(rx + 10 + ox + Math.cos(a) * d * 1.4, ry + 8 + oy + Math.sin(a) * d * 0.5, 6 * (1 - k) + 2, 0, TAU); g.fill(); } }
      } },
      { d: 0.34, fn: (g, ox, oy) => {
        const near = lt >= tS - 0.12 && lt < tS + 0.42;
        put(g, stampSp(), p[0] + ox, p[1] + oy, { rot: sR, sc: 0.96, lift: near ? 0.4 : 2.4 });
        // the fist round the stamp's neck, the sleeve running off to the right edge
        const nk = 220 * 0.96; fist(g, p[0] + ox + Math.sin(sR) * nk, p[1] + oy - Math.cos(sR) * nk, 1.0, 4.1 + sR, { sleeve: K.green, cuff: K.red, len: 1600 });
      } },
    ], cam);
    box(c);
  } };

  // ════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // THE VIRAL CUT (papercut/approved-vendor-viral; plan/films/20b-approved-vendor-viral.md): five shots at 124 BPM, the
  // avv_* scenes below. Nothing above this line changes, so the v1 draft renders exactly as it did. Frame 0 is the hook:
  // the SALE banner, big and cheerful, its paper sun turning, the dateline already up; at 0.45 s the sun opens into an
  // eye and on "spyware" it looks straight at us. Then the laptop (the cursor never moved), the escalation (the camera
  // pulls back from that laptop to a newsroom of 45 and on "targeted" their suns open one after another, until every
  // eye looks at us), the list riffling six years, and the stamp. After the stamp the picture whips back to the banner
  // and the eye shuts into the sun on frame 0's own framing, so the last frame hands back into the first.
  const VAD = { x: 540, y: 1070, s: 3.0 };              // the hook's ad, centred (v1's AD2 sat at x 650, its edge on the platforms' right rail)
  const V0 = { x: 0, y: 0, z: 1.0, fx: 540, fy: 1000 };  // frame 0's camera; avv_stamp ends on it
  const VSPIN = 0.6;                                     // the sun's turn: lt·VSPIN in the hook, (lt − dd)·VSPIN at the end, so the loop does not jump
  const VCUR = { x: 104, y: 640, s: 1.5 };               // the parked cursor, up by the headline and well away from the ad
  const kick = (lt, t, a) => (lt >= t ? a * Math.exp(-(lt - t) * 7) * (1 - Math.exp(-(lt - t) * 60)) : 0);
  /** the tag at a given alpha: the hook's is up from the very first frame (it has no time to fade one in) */
  function tagAt(c, text, a, x = 110) {
    if (a <= 0) return; const y = R.SAFE_B - 66;
    c.save(); c.globalAlpha = a; c.font = `32px "ArchivoBlack-400", ${JP}`; const w = c.measureText(text).width + 44;
    c.shadowColor = 'rgba(4,6,12,.6)'; c.shadowBlur = 12; c.shadowOffsetX = 6; c.shadowOffsetY = 9; c.fillStyle = K.ochre; c.beginPath(); c.roundRect(x, y, w, 66, 8); c.fill(); c.shadowColor = 'transparent';
    c.fillStyle = K.ink; c.fillText(text, x + 22, y + 45); c.restore();
  }
  /** the page behind the hook's banner: v1's close-up page with its article column narrowed, so the ad can sit centred */
  const pageV = () => sheet('avv_page', (g) => {
    g.fillStyle = C.page; g.fillRect(-90, -90, W + 180, H + 180);
    const r = U.rng(31);
    g.fillStyle = C.head; g.fillRect(-60, 470, 230, 44); g.fillRect(-60, 530, 170, 44);
    g.fillStyle = C.text; for (let i = 0; i < 26; i++) { if (i === 9 || i === 18) continue; const y = 640 + i * 40; g.fillRect(-60, y, i === 8 || i === 17 ? 100 : 170 + r() * 40, 16); }
    g.strokeStyle = C.pageD; g.lineWidth = 4; g.beginPath(); g.moveTo(214, -90); g.lineTo(214, H + 90); g.stroke();
    g.fillStyle = C.bezel; g.fillRect(-90, 1700, W + 180, 400);
    g.fillStyle = C.shellD; g.fillRect(-90, 1790, W + 180, 300);
  }, 14);
  /** the hook's picture: the page, the dim round an open eye, the ad (sun or eye), the parked cursor. avv_hook draws it
   *  and so does the end of avv_stamp, with the same camera, which is what makes the loop seamless */
  function hookFrame(c, cam, { o = 0, look = [0, 0], blink = 0, spin = 0, bounce = 0, red = 0 } = {}) {
    stack(c, [
      { sh: pageV(), d: 0.1, lift: 0.2 },
      { d: 0.1, fn: (g) => { if (o <= 0) return; const v = g.createRadialGradient(VAD.x, VAD.y - 140, 240, VAD.x, VAD.y - 140, 1100); v.addColorStop(0, 'rgba(8,10,14,0)'); v.addColorStop(1, `rgba(8,10,14,${0.78 * clamp(o, 0, 1)})`); g.fillStyle = v; g.fillRect(-90, -90, W + 180, H + 180); } },
      { d: 0.3, fn: (g, ox, oy) => {
        ad(g, VAD.x + ox, VAD.y + oy, VAD.s * (1 + bounce), { o, look, blink, spin, lift: 1.4 });
        if (o > 0) glow(g, VAD.x + ox, VAD.y + oy + SUN.y * VAD.s, 300 * clamp(o, 0, 1), 'rgba(216,64,47,', (0.12 + red) * clamp(o, 0, 1));
        put(g, cursor(), VCUR.x + ox, VCUR.y + oy, { lift: 0.6, sc: VCUR.s });
      } },
    ], cam);
  }

  // ═════════ V1 · avv_hook: frame 0 is the banner, cheerful; at `open` the sun opens into an eye; on "spyware" it looks at us ═════════
  SCENES.avv_hook = { draw(c, lt) {
    const id = 'avv_hook', dd = dur(id), tH = at(id, 'hit', 0.035), tO = at(id, 'open', 0.45), tP = at(id, 'spy', 0.63);
    const o = ease.out((lt - tO) / 0.3), toUs = ease.io((lt - tP) / 0.14);
    const look = [lerp(-0.85, 0, toUs), lerp(-0.4, 0, toUs)];                // up at the cursor as it opens, then at us
    const blink = Math.max(0, 1 - Math.abs(lt - (tP + 1.7)) / 0.09);
    const bounce = lt >= tH ? 0.05 * Math.exp(-(lt - tH) * 6) * Math.sin((lt - tH) * 18) : 0;   // the cheerful bounce on the hit
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: V0.z * (1 + kick(lt, tH, 0.06) + kick(lt, tO, 0.15) + kick(lt, tP, 0.12)) * lerp(1, 1.25, ease.io(lt / dd)), fx: V0.fx, fy: V0.fy };
    hookFrame(c, cam, { o, look, blink, spin: lt * VSPIN * (1 - o), bounce, red: lt >= tP ? 0.14 * Math.exp(-(lt - tP) * 3) : 0 });
    tagAt(c, ui('dateline', 'CITIZEN LAB · 15.10.2026'), clamp((dd - 0.6 - lt) / 0.3, 0, 1));
    box(c);
  } };

  /** a red marker ring, drawn on as k goes 0 → 1: a little more than one turn, opening as it goes, as a hand draws one */
  function markerRing(g, x, y, rx, ry, k) {
    if (k <= 0) return; const N = 72, p = new Path2D();
    for (let i = 0; i <= N * clamp(k, 0, 1); i++) { const t = i / N, a = -2.3 + t * 1.12 * TAU, gr = (1 + 0.1 * t) * (1 + Math.sin(t * 9 + 1) * 0.02); i ? p.lineTo(x + Math.cos(a) * rx * gr, y + Math.sin(a) * ry * gr) : p.moveTo(x + Math.cos(a) * rx * gr, y + Math.sin(a) * ry * gr); }
    for (const [dx, dy, col, w] of [[3, 5, 'rgba(0,0,0,.28)', 10], [0, 0, C.red, 9]]) { g.save(); g.translate(dx, dy); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(p); g.restore(); }
  }

  // ═════════ V2 · avv_noclick: the laptop, the eye open in its corner; on "No click" the parked cursor is ringed ═════════
  SCENES.avv_noclick = { draw(c, lt) {
    const id = 'avv_noclick', dd = dur(id), tR = at(id, 'ring', 0.25), k = ease.io(lt / dd);
    const cx = SC.x0 + 300 + 20, cy = SC.y0 + 330 + 30;                      // the middle of v1's parked cursor
    const atCur = ease.io((lt - tR) / 0.15) * (1 - ease.io((lt - tR - 1.2) / 0.25));   // the eye looks down at it, then back at us
    const look = [lerp(Math.sin(lt * 0.9) * 0.08, -1, atCur), lerp(0, 0.45, atCur)];
    const blink = Math.max(0, 1 - Math.abs(lt - (tR + 2.2)) / 0.09);
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: lerp(1.9, 1.3, k) + kick(lt, tR, 0.12), fx: lerp(640, 600, k), fy: lerp(1060, 1080, k) };
    stack(c, [
      { sh: room(), d: 0.04, lift: 0 },
      { fn: (g, ox, oy) => colleague(g, lt, ox, oy), d: 0.08 },
      { sh: desk(), d: 0.2, lift: 0.4 },
      { d: 0.3, fn: (g, ox, oy) => {
        laptop(g, lt, ox, oy, 0, 0);
        g.save(); g.beginPath(); g.rect(SC.x0 + ox, SC.y0 + oy, SC.x1 - SC.x0, SC.y1 - SC.y0); g.clip();
        ad(g, AD1.x + ox, AD1.y + oy, AD1.s, { o: 1, look, blink, lift: 0.5 });
        glow(g, AD1.x + ox, AD1.y + oy + SUN.y * AD1.s, 150, 'rgba(216,64,47,', 0.12);
        if (lt >= tR && lt < tR + 0.4) { g.fillStyle = `rgba(216,64,47,${0.14 * (1 - (lt - tR) / 0.4)})`; g.fillRect(SC.x0 + ox, SC.y0 + oy, SC.x1 - SC.x0, SC.y1 - SC.y0); }
        g.restore();
        markerRing(g, cx + ox, cy + oy, 74, 88, ease.out((lt - tR) / 0.3));
        const t1 = Math.abs(Math.sin(lt * 9)) * 6, t2 = Math.abs(Math.sin(lt * 9 + 1.7)) * 6;   // still typing: nobody clicked anything
        hand(g, 360 + ox, 1452 + oy - t1, 0.82, 0.32);
        hand(g, 720 + ox, 1452 + oy - t2, 0.82, -0.32);
        glow(g, 540 + ox, 1330 + oy, 520, 'rgba(190,215,255,', 0.1);
      } },
    ], cam);
    tag(c, ui('room', 'A NEWSROOM · NIGHT'), lt, dd);
    box(c);
  } };

  // ── the newsroom of 45: six rows of desks, one laptop for each targeted device, each with the same banner ─────────
  const ML = 2;                                           // the mini laptop is drawn at twice its size, for the pull-back
  const miniLaptop = () => sprite('avv_mini', 280 * ML, 210 * ML, 140 * ML, 200 * ML, (g) => {
    g.scale(ML, ML);
    g.fillStyle = C.shellD; g.beginPath(); g.roundRect(-110, -192, 220, 152, 10); g.fill();
    g.fillStyle = C.bezel; g.beginPath(); g.roundRect(-104, -186, 208, 140, 7); g.fill();
    g.fillStyle = C.page; g.fillRect(-98, -180, 196, 128);
    g.fillStyle = C.chrome; g.fillRect(-98, -180, 196, 10);
    g.fillStyle = C.head; g.fillRect(-90, -162, 80, 7); g.fillRect(-90, -151, 60, 7);
    g.fillStyle = C.text; for (let i = 0; i < 6; i++) g.fillRect(-90, -134 + i * 12, i === 5 ? 40 : 76, 4);
    g.strokeStyle = C.pageD; g.lineWidth = 1.5; g.beginPath(); g.moveTo(12, -170); g.lineTo(12, -56); g.stroke();
    g.fillStyle = C.shellD; g.beginPath(); g.moveTo(-112, -40); g.lineTo(112, -40); g.lineTo(132, 0); g.lineTo(-132, 0); g.closePath(); g.fill();
    g.fillStyle = C.shell; g.beginPath(); g.moveTo(-110, -40); g.lineTo(110, -40); g.lineTo(128, -4); g.lineTo(-128, -4); g.closePath(); g.fill();
    g.fillStyle = C.kb; for (let r = 0; r < 3; r++) g.fillRect(-96 - r * 5, -34 + r * 9, 192 + r * 10, 6);
  }, 5);
  const MAD = { x: 54, y: -116, s: 0.36 };                 // where the banner sits on a mini laptop's screen
  // [count, scale, y of the desk line]: 12 + 10 + 8 + 7 + 5 + 3 = 45, every right edge left of x 905 (the platforms' rail)
  const NEWS = [[12, 0.24, 800], [10, 0.30, 905], [8, 0.38, 1030], [7, 0.48, 1175], [5, 0.62, 1335], [3, 0.82, 1505]].flatMap(([n, s, y], ri) => {
    const hs = 420 - 110 * s; return Array.from({ length: n }, (_, i) => ({ x: 480 - hs + (2 * hs * i) / (n - 1), y, s, ri, i }));
  });
  const HERO = NEWS.findIndex((l) => l.ri === 5 && l.i === 1);   // the front row's middle laptop: shot 2's, already open
  // the order the others open in (seeded), and when: tOpen + 1.25·((k + 1)/44)^0.55, faster and faster (score.py mirrors it)
  const ORDER = (() => { const r = U.rng(45), ids = NEWS.map((_, i) => i).filter((i) => i !== HERO); for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } const at = {}; ids.forEach((id, k) => { at[id] = 1.25 * Math.pow((k + 1) / ids.length, 0.55); }); return at; })();
  const newsFloor = () => sheet('avv_floor', (g) => {
    g.fillStyle = '#0d1219'; g.fillRect(-90, 770, W + 180, H);
    for (const [s, y] of [[0.24, 800], [0.30, 905], [0.38, 1030], [0.48, 1175], [0.62, 1335], [0.82, 1505]]) {
      g.fillStyle = C.desk; g.fillRect(-90, y - 70 * s, W + 180, 82 * s);
      g.fillStyle = C.deskL; g.fillRect(-90, y - 70 * s, W + 180, 4 * s + 1);
      g.fillStyle = C.deskD; g.fillRect(-90, y + 12 * s, W + 180, 50 * s);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-90, y + 62 * s, W + 180, 30 * s);
    }
    // a column on the right, in front of the desks: the rows stop at it, clear of the platforms' right rail
    g.fillStyle = '#0a0e13'; g.fillRect(918, -90, W, H + 180);
    g.fillStyle = '#18212c'; g.fillRect(918, -90, 10, H + 180);
    g.fillStyle = 'rgba(255,217,138,.06)'; g.fillRect(928, 700, 60, 900);
  }, 12);

  // ═════════ V3 · avv_count: the escalation. Pull back from that laptop to 45; on "targeted" their suns open, then all stare ═════════
  SCENES.avv_count = { draw(c, lt) {
    const id = 'avv_count', dd = dur(id), tP = at(id, 'pull', 0.25), tO = at(id, 'open', 1.51), tS = at(id, 'stare', 2.95);
    const kP = ease.io((lt - tP) / 1.3), hero = NEWS[HERO], f = lt - tS;
    const cam = { x: Math.sin(lt * 0.3) * 5 * kP, y: 0, z: lerp(4.2, 1.0, kP) + kick(lt, tO, 0.1) + kick(lt, tS, 0.3), fx: lerp(hero.x, 540, kP), fy: lerp(hero.y - 120, 1000, kP) };
    const stare = ease.io(f / 0.12);
    stack(c, [
      { sh: room(), d: 0.12, lift: 0 },
      { sh: newsFloor(), d: 0.3, lift: 0.3 },
      { d: 0.3, fn: (g, ox, oy) => {
        NEWS.forEach((l, i) => {
          const x = l.x + ox, y = l.y + oy, s = l.s;
          const o = i === HERO ? 1 : ease.back((lt - tO - ORDER[i]) / 0.16);
          const roam = [Math.sin(lt * 1.3 + i * 2.1) * 0.8, Math.cos(lt * 0.9 + i * 1.7) * 0.4];
          glow(g, x, y - 115 * s, 170 * s, f >= 0 ? 'rgba(216,64,47,' : 'rgba(190,215,255,', f >= 0 ? 0.2 * (0.6 + 0.4 * Math.cos(f * 7)) : 0.1);
          put(g, miniLaptop(), x, y, { sc: s / ML, lift: 0.5 });
          ad(g, x + MAD.x * s, y + MAD.y * s, MAD.s * s, { o, look: [lerp(roam[0], 0, stare), lerp(roam[1], 0, stare)], spin: lt * VSPIN * (1 - clamp(o, 0, 1)), lift: 0.25 });
        });
      } },
    ], cam);
    if (f >= 0 && f < 0.35) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(216,64,47,${0.18 * (1 - f / 0.35)})`; c.fillRect(0, 0, W, H); c.restore(); }
    tag(c, ui('count', 'AT LEAST 45 DEVICES · 2024–25'), lt, dd);
    box(c);
  } };

  // ═════════ V4 · avv_list: v1's vendor list on this cut's cues; the sheets riffle 2020 → 2026 and land on "six years" ═════════
  const CBX = 524, CBY = CB.y + 90;                       // the board 16 px left of v1's (its right edge was on the platforms' rail) and 90 lower, under four BIG lines
  SCENES.avv_list = { draw(c, lt) {
    const id = 'avv_list', dd = dur(id), tF = at(id, 'flip', 0.25), tN = at(id, 'six', 1.53), F = flips(tF, tN);
    let top = 0, flipK = 0;
    F.ts.forEach((t, i) => { if (lt >= t + F.fd) top = i + 1; else if (lt >= t) { top = i; flipK = (lt - t) / F.fd; } });
    const jolt = lt > tN ? 10 * Math.exp(-(lt - tN) * 7) * Math.sin((lt - tN) * 20) : 0;
    const liveK = clamp((lt - 0.15) / 0.5, 0, 1);
    const cam = { x: Math.sin(lt * 0.3) * 6, y: 0, z: punch(lt, [tN], { kick: 0.04 }) * lerp(1.0, 1.06, ease.io(lt / dd)), fx: 540, fy: CBY - 10 };
    stack(c, [
      { sh: lectern(), d: 0.05, lift: 0 },
      { d: 0.3, fn: (g, ox, oy) => clipboard(g, CBX + ox, CBY + oy + 40 * (1 - ease.out(lt / 0.4)), -0.025 + Math.sin(lt * 0.5) * 0.004, { top, flipK, liveK, jolt }) },
    ], cam);
    tag(c, ui('list', 'IAB EUROPE · GLOBAL VENDOR LIST'), lt, dd);
    box(c);
  } };

  // ═════════ V5 · avv_stamp: SUSPENDED on "October"; then a whip back to the banner, whose eye shuts into the sun (frame 0) ═════════
  /** v1's stamp on this cut's cues, the board at CBX, and the stamp kept above the rail: it hovers and winds up higher */
  function stampFrame(c, lt, dd, tL, tS) {
    const rot = -0.025, bx = CBX, by = CBY - 40;
    const jolt = lt > tS ? 12 * Math.exp(-(lt - tS) * 8) * Math.sin((lt - tS) * 24) : 0;
    const [rx, ry] = keyRowAt(bx, by, rot);
    const hover = [rx + 200, ry - 280], wind = [rx + 170, ry - 380], down = [rx + 10, ry + 8], away = [rx + 760, ry - 520];
    let p = hover, sR = 0.18;
    if (lt < tL) p = [hover[0], hover[1] + Math.sin(lt * 2.2) * 10];
    else if (lt < tS - 0.12) { const k = ease.out((lt - tL) / Math.max(0.1, tS - 0.12 - tL)); p = [lerp(hover[0], wind[0], k), lerp(hover[1], wind[1], k)]; sR = lerp(0.18, 0.28, k); }
    else if (lt < tS) { const k = ease.in((lt - (tS - 0.12)) / 0.12); p = [lerp(wind[0], down[0], k), lerp(wind[1], down[1], k)]; sR = lerp(0.28, -0.1, k); }
    else if (lt < tS + 0.42) { p = down; sR = -0.1; }
    else { const k = ease.io((lt - tS - 0.42) / 0.5); p = [lerp(down[0], away[0], k), lerp(down[1], away[1], k)]; sR = lerp(-0.1, 0.3, k); }
    const cam = { x: Math.sin(lt * 0.3) * 5, y: 0, z: punch(lt, [tS], { kick: 0.06, open: 0.02 }) * lerp(1.18, 1.26, ease.io(lt / dd)), fx: 560, fy: ry };
    stack(c, [
      { sh: lectern(), d: 0.05, lift: 0 },
      { d: 0.3, fn: (g, ox, oy) => {
        clipboard(g, bx + ox, by + oy, rot, { top: YEARS.length - 1, jolt });
        if (lt >= tS) { const k = clamp((lt - tS) / 0.05, 0, 1); g.save(); g.globalAlpha = 0.92 * k; g.translate(rx + 10 + ox, ry + 8 + oy + jolt); g.rotate(-0.1); g.drawImage(inkSp().c, -inkSp().ox, -inkSp().oy); g.restore(); }
        if (lt > tS && lt < tS + 0.5) { const k = (lt - tS) / 0.5; g.fillStyle = `rgba(243,234,212,${0.6 * (1 - k)})`; for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, d = 170 + 120 * ease.out(k); g.beginPath(); g.arc(rx + 10 + ox + Math.cos(a) * d * 1.4, ry + 8 + oy + Math.sin(a) * d * 0.5, 6 * (1 - k) + 2, 0, TAU); g.fill(); } }
      } },
      { d: 0.34, fn: (g, ox, oy) => {
        const near = lt >= tS - 0.12 && lt < tS + 0.42;
        put(g, stampSp(), p[0] + ox, p[1] + oy, { rot: sR, sc: 0.96, lift: near ? 0.4 : 2.4 });
        const nk = 220 * 0.96; fist(g, p[0] + ox + Math.sin(sR) * nk, p[1] + oy - Math.cos(sR) * nk, 1.0, 4.1 + sR, { sleeve: K.green, cuff: K.red, len: 1600 });
      } },
    ], cam);
  }
  /** the whip: paper-coloured and dark streaks across the frame, strongest mid-move */
  function streaks(c, e) {
    const a = Math.sin(Math.PI * clamp(e, 0, 1)); if (a <= 0.01) return; const r = U.rng(77);
    c.save(); c.globalAlpha = a;
    for (let i = 0; i < 28; i++) { const y = 60 + r() * (H - 120), w = 260 + r() * 700, h = 2 + r() * 7, x = (r() * 1.6 - 0.3) * W - e * 500; c.fillStyle = r() < 0.5 ? 'rgba(243,234,212,.4)' : 'rgba(10,8,6,.4)'; c.fillRect(x, y, w, h); }
    c.restore();
  }
  SCENES.avv_stamp = { draw(c, lt) {
    const id = 'avv_stamp', dd = dur(id), tL = at(id, 'lift', 0.49), tS = at(id, 'stamp', 0.99), tW = dd - 0.9, WD = 0.28, D = W + 180;
    const e = ease.io((lt - tW) / WD);
    // the banner at the end: the eye open as the whip lands, shut into the sun just before the cut; the camera eases to
    // frame 0's (V0, no sway), and the sun's turn runs into the hook's, so the last frame is the first
    const o = 1 - ease.io((lt - (tW + WD + 0.05)) / 0.4);
    const endCam = { x: 0, y: 0, z: lerp(1.08, V0.z, ease.io((lt - tW) / (dd - tW))), fx: V0.fx, fy: V0.fy };
    const endHook = { o, look: [0, 0], spin: (lt - dd) * VSPIN * (1 - o) };
    c.fillStyle = '#0b0d10'; c.fillRect(0, 0, W, H);
    if (e < 1) { c.save(); c.translate(e * D, 0); stampFrame(c, lt, dd, tL, tS); c.restore(); }
    if (e > 0) { c.save(); c.translate((e - 1) * D, 0); hookFrame(c, endCam, endHook); c.restore(); streaks(c, e); }
    tagAt(c, ui('dateline', 'CITIZEN LAB · 15.10.2026'), clamp((lt - (dd - 0.4)) / 0.25, 0, 1));
    box(c);
  } };
})();
