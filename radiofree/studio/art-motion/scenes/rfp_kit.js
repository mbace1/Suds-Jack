// The papercut shadowbox kit (owner approved test 11, 2026-10-13: "Paper cut box is
// the best so far"). Everything is a SHEET of coloured card: a cached canvas with the
// card's tooth printed into it, and a pre-blurred shadow baked once beside it, so a
// frame is drawImage calls rather than live blurs. Sheets are drawn back to front,
// each shadow falling down-right (the light is upper left), and each sheet slides by
// its own depth when the camera drifts. The box frame is drawn last in every shot.
window.RFP = (() => {
  const W = 1080, H = 1920, M = 90, TAU = Math.PI * 2, P = PAINT, { clamp, lerp } = U, { mask, S, shapes } = RFM;
  const K = {
    // v2 (owner: "fall, darker palette with one or two contrast colours"): the dusk is DUSK, the lamps are the
    // brightest thing in the box, and only two colours are loud — ochre light and the magenta of the masks
    // v3 (owner, 2026-10-13: "this style is great. It can be a bit darker"): one more stop down
    sky0: '#0e110f', sky1: '#181c19', sky2: '#3a271e', sky3: '#5e3522', sky4: '#82502a',
    ink: '#15120f', card: '#d8c8a8', cardD: '#b8a88c', green: '#29473a', greenD: '#1a3027', red: '#a8321e', rust: '#9a4422',
    ochre: '#e3a33a', mag: '#f0027f',
    roof: '#2c1a15', roof2: '#46291f', stone: '#5e5446', stoneD: '#463e34', park: '#24321e', birch: '#d9a62e', birchD: '#b5801c',
    mapleA: '#d9542a', mapleB: '#f0a030', mapleC: '#b8322a', gold: '#e0b84a', wood: '#3a2618', lamp: '#ffd98a',
  };
  const CACHE = {};
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  // the card's tooth: light and dark specks plus a faint diagonal light, printed into whatever was drawn
  function tooth(g, w, h, seed) {
    g.save(); g.globalCompositeOperation = 'source-atop';
    const r = U.rng(seed);
    for (let i = 0; i < (w * h) / 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,250,235,.10)' : 'rgba(0,0,0,.09)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
    const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0, 'rgba(255,245,220,.10)'); sh.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.restore();
  }
  // a shadow: the sheet's silhouette, black, blurred once
  function shadowOf(src, blur) {
    const sil = canvas(src.width, src.height), sg = sil.getContext('2d');
    sg.drawImage(src, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#000'; sg.fillRect(0, 0, sil.width, sil.height);
    const out = canvas(src.width, src.height), og = out.getContext('2d'); og.filter = `blur(${blur}px)`; og.drawImage(sil, 0, 0); return out;
  }
  /** a full-frame sheet: draw(g) in frame coordinates; the canvas has an M-pixel margin all round for parallax */
  function sheet(key, draw, blur = 14) {
    if (CACHE[key]) return CACHE[key];
    const c = canvas(W + 2 * M, H + 2 * M), g = c.getContext('2d'); g.translate(M, M); draw(g); g.setTransform(1, 0, 0, 1, 0, 0);
    tooth(g, c.width, c.height, key.length * 13 + 7);
    return (CACHE[key] = { c, s: shadowOf(c, blur), m: M });
  }
  /** a sprite: a small card cut-out, origin at (ox, oy) inside a w×h canvas */
  function sprite(key, w, h, ox, oy, draw, blur = 8) {
    if (CACHE[key]) return CACHE[key];
    const pad = blur * 3, c = canvas(w + 2 * pad, h + 2 * pad), g = c.getContext('2d'); g.translate(pad + ox, pad + oy); draw(g); g.setTransform(1, 0, 0, 1, 0, 0);
    tooth(g, c.width, c.height, key.length * 7 + 3);
    return (CACHE[key] = { c, s: shadowOf(c, blur), ox: pad + ox, oy: pad + oy });
  }
  /** draw a sheet at its depth: shadow first (down-right), then the card */
  function layer(c, sh, ox = 0, oy = 0, { lift = 1, alpha = 0.55 } = {}) {
    c.save(); c.globalAlpha = alpha; c.drawImage(sh.s, ox - sh.m + 10 * lift, oy - sh.m + 14 * lift); c.restore();
    c.drawImage(sh.c, ox - sh.m, oy - sh.m);
  }
  function put(c, sp, x, y, { rot = 0, sc = 1, lift = 1, alpha = 0.5 } = {}) {
    for (const [dx, dy, img, a] of [[8 * lift, 11 * lift, sp.s, alpha], [0, 0, sp.c, 1]]) {
      c.save(); c.globalAlpha *= a; c.translate(x + dx, y + dy); c.rotate(rot); c.scale(sc, sc); c.drawImage(img, -sp.ox, -sp.oy); c.restore();
    }
  }
  /** the stack, back to front; cam = {x, y, z} — z scales about the frame centre */
  function stack(c, layers, cam = { x: 0, y: 0, z: 1 }) {
    for (const L of layers) {
      if (L.fn) { c.save(); zoom(c, cam, L.d); L.fn(c, -cam.x * L.d, -cam.y * L.d); c.restore(); continue; }
      c.save(); zoom(c, cam, L.d); layer(c, L.sh, -cam.x * L.d + (L.x || 0), -cam.y * L.d + (L.y || 0), { lift: L.lift ?? 1, alpha: L.alpha ?? 0.55 }); c.restore();
    }
  }
  // z scales about the focus (cam.fx, cam.fy; the frame centre by default), more for nearer sheets
  function zoom(c, cam, d) { const z = 1 + ((cam.z || 1) - 1) * d, fx = cam.fx ?? W / 2, fy = cam.fy ?? H / 2; if (z !== 1) { c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy); } }
  /** a camera move inside a shot: from a to b over [t0, t0+dur], eased; before t0 it holds a */
  const move = (lt, t0, dur, a, b) => lerp(a, b, ease.out((lt - t0) / dur));
  /** the box: a deep wooden frame, its inner bevel, and the shadow its top and left edges throw in */
  function box(c) {
    c.save();
    const sh = c.createLinearGradient(0, 56, 0, 150); sh.addColorStop(0, 'rgba(15,8,4,.6)'); sh.addColorStop(1, 'rgba(15,8,4,0)'); c.fillStyle = sh; c.fillRect(56, 56, W - 112, 94);
    const sl = c.createLinearGradient(56, 0, 140, 0); sl.addColorStop(0, 'rgba(15,8,4,.5)'); sl.addColorStop(1, 'rgba(15,8,4,0)'); c.fillStyle = sl; c.fillRect(56, 56, 84, H - 112);
    c.fillStyle = K.wood; c.beginPath(); c.rect(0, 0, W, H); c.rect(56, 56, W - 112, H - 112); c.fill('evenodd');
    c.strokeStyle = '#5a3a24'; c.lineWidth = 4; c.strokeRect(56, 56, W - 112, H - 112);
    c.strokeStyle = 'rgba(255,220,170,.08)'; c.lineWidth = 2; c.strokeRect(20, 20, W - 40, H - 40);
    c.restore();
  }
  /** the dusk sky at four o'clock in October: banded like cut card, not a smooth gradient */
  const dusk = (key, horizon = 1100) => sheet('rfp_sky_' + key, (g) => {
    const bands = [K.sky0, K.sky1, '#221f1a', '#2c231d', K.sky2, '#4a2e22', K.sky3, K.sky4];
    const step = horizon / bands.length;
    bands.forEach((col, i) => { g.fillStyle = col; g.beginPath(); g.moveTo(-M, -M + (i ? i * step : -M)); for (let x = -M; x <= W + M; x += 60) g.lineTo(x, i * step + Math.sin(x * 0.006 + i) * 14); g.lineTo(W + M, H + M); g.lineTo(-M, H + M); g.closePath(); g.fill(); });
  }, 10);
  const leafKey = (kind, col) => `rfp_leaf_${kind}_${col}`;
  function leafSprite(kind, col) {
    return sprite(leafKey(kind, col), 80, 80, 40, 40, (g) => {
      g.fillStyle = col; g.beginPath();
      if (kind === 'maple') { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k / 10 * TAU, rr = k % 2 ? 14 : 34 - Math.abs(k - 5) * 2; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } }
      else { // birch: a pointed ovate leaf with a fine saw edge
        for (let k = 0; k <= 40; k++) { const u = k / 40, a = u * TAU, side = Math.sin(a), len = Math.cos(a); const wdt = 24 * Math.pow(Math.max(0, (1 - len) / 2), 0.55) * (1 - 0.15 * (1 + len) / 2), saw = k % 2 ? 1 : 0.86;
          g.lineTo(side * wdt * saw, -len * 32 + 4); } }
      g.closePath(); g.fill();
      g.strokeStyle = 'rgba(80,40,10,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -26); g.lineTo(0, 34); g.stroke();
      g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 30); g.lineTo(2, 44); g.stroke();
    }, 5);
  }
  /** falling leaves over the whole shot, deterministic */
  function leaves(c, lt, { n = 14, seed = 5, depth = 1, cam = { x: 0 } } = {}) {
    const r = U.rng(seed);
    for (let i = 0; i < n; i++) {
      const kind = r() < 0.6 ? 'birch' : 'maple', col = kind === 'birch' ? (r() < 0.5 ? K.birch : K.birchD) : [K.mapleA, K.mapleB, K.mapleC][(r() * 3) | 0];
      const d = 0.5 + r() * 0.6 * depth, sp = 70 + r() * 90, x0 = r() * W, y0 = r() * (H + 200);
      const y = ((y0 + lt * sp) % (H + 200)) - 100, x = x0 + Math.sin(lt * 1.4 + i * 2) * 50 - cam.x * d;
      put(c, leafSprite(kind, col), x, y, { rot: Math.sin(lt * 1.8 + i) * 1.2 + i, sc: 0.5 + d * 0.5, lift: d });
    }
  }
  /** cut lettering: card letters with their own shadow, cached by content */
  function words(text, font, col, { pad = 20 } = {}) {
    const key = `rfp_w_${text}_${font}_${col}`; if (CACHE[key]) return CACHE[key];
    const m = canvas(10, 10).getContext('2d'); m.font = font; const tw = Math.ceil(m.measureText(text).width), th = Math.ceil(parseInt(font) * 1.3);
    return sprite(key, tw + pad, th, (tw + pad) / 2, th * 0.78, (g) => { g.font = font; g.fillStyle = col; g.textAlign = 'center'; g.fillText(text, 0, 0); }, 6);
  }
  /** springs and eases for the pops */
  const ease = { out: (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3), back: (k) => { k = clamp(k, 0, 1); const s = 1.9; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); } };
  const pop = (lt, t0, dur = 0.28) => (lt < t0 ? 0 : ease.back((lt - t0) / dur));
  /** a masked walker in card, facing us. Origin at the neck; s scales it */
  function walker(c, x, y, s, { coat = K.green, scarf = K.red, color = K.mag, t = 0, tilt = 0, look = 0, step = 0, led = true, umbrella = null, lift = 1 } = {}) {
    c.save(); c.translate(x, y); c.scale(s, s);
    const body = (g) => {
      g.fillStyle = K.ink; for (const sx of [-1, 1]) { g.beginPath(); g.roundRect(sx * 34 - 18 + (sx > 0 ? step : -step) * 6, 300, 36, 150, 10); g.fill(); }
      g.fillStyle = coat; g.beginPath(); g.moveTo(-60, 10); g.quadraticCurveTo(-112, 22, -118, 110); g.lineTo(-132, 330); g.lineTo(132, 330); g.lineTo(118, 110); g.quadraticCurveTo(112, 22, 60, 10); g.closePath(); g.fill();
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(0, 30); g.lineTo(-6, 330); g.lineTo(6, 330); g.fill();
      g.fillStyle = K.card; for (const by of [130, 190, 250]) { g.beginPath(); g.arc(14, by, 7, 0, TAU); g.fill(); }
      g.fillStyle = scarf; g.beginPath(); g.roundRect(-62, 2, 124, 34, 14); g.fill(); g.beginPath(); g.roundRect(22, 20, 32, 100, 10); g.fill();
    };
    // the body as a cached sprite per coat/scarf, shadow and all
    put(c, sprite(`rfp_body_${coat}_${scarf}`, 300, 470, 150, 10, body, 10), 0, 0, { lift });
    if (umbrella) umbrella(c);
    c.save(); c.translate(look * 30, 0);
    c.fillStyle = 'rgba(15,8,4,.35)'; c.beginPath(); c.arc(12, -34, 76, 0, TAU); c.fill();
    // no glasses (owner: "why do all Toko faces have glasses?"): the MASK is the device, its light on the strap
    mask(c, 0, -46, 72, color, { glasses: false, led: false, t, tilt: tilt + look * 0.32, strap: true, shade: false, face: K.card, frame: K.ink, ink: K.ink });
    // the red light, driven by the shot: true = the steady blink, a number = brightness 0..1
    const b = led === true ? (Math.floor(t * 4) % 2 === 0 ? 1 : 0) : +led || 0;
    c.translate(0, -46); c.rotate(tilt + look * 0.32); ledAt(c, 72 * 1.02, -72 * 0.11, 12, b);
    c.restore();
    c.restore();
  }
  /** the red light itself: a dark bead that wakes to red with a halo */
  function ledAt(c, x, y, r, b) {
    c.fillStyle = b > 0.05 ? `rgb(${lerp(110, 255, b) | 0},${lerp(20, 42, b) | 0},${lerp(16, 28, b) | 0})` : '#5a1410';
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    if (b > 0.05) glow(c, x, y, r * 8, 'rgba(255,60,36,', 0.75 * b);
  }
  /** a gloved hand in a sleeve and cuff, fingers closed round something — straight creases, no curve */
  function hand(c, x, y, s, rot = 0, { sleeve = K.green, cuff = K.red, glove = K.ink } = {}) {
    put(c, sprite(`rfp_hand_${sleeve}_${cuff}_${glove}`, 220, 520, 110, 90, (g) => {
      g.fillStyle = sleeve; g.beginPath(); g.moveTo(-64, 110); g.lineTo(64, 110); g.lineTo(86, 430); g.lineTo(-86, 430); g.closePath(); g.fill();
      g.fillStyle = cuff; g.fillRect(-70, 92, 140, 30);
      g.fillStyle = glove; g.beginPath(); g.roundRect(-62, 0, 124, 100, 28); g.fill();
      for (let i = 0; i < 4; i++) { g.beginPath(); g.roundRect(-58 + i * 30, -52 + Math.abs(i - 1.5) * 6, 26, 72, 13); g.fill(); }
      g.beginPath(); g.roundRect(-98, 26, 52, 30, 15); g.fill();
      g.strokeStyle = 'rgba(255,240,210,.18)'; g.lineWidth = 3; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-28 + i * 30, 8); g.lineTo(-28 + i * 30, 24); g.stroke(); }
    }, 9), x, y, { rot, sc: s });
  }
  /** a gloved fist closed round a shaft (vertical through its middle), the sleeve running off down-right; straight knuckles */
  function fist(c, x, y, s, rot = 0, { sleeve = K.green, cuff = K.red, glove = K.ink, len = 420 } = {}) {
    put(c, sprite(`rfp_fist_${sleeve}_${cuff}_${len}`, 260, len + 160, 110, 70, (g) => {
      g.fillStyle = sleeve; g.beginPath(); g.moveTo(-40, 40); g.lineTo(60, 40); g.lineTo(120, len); g.lineTo(-10, len); g.closePath(); g.fill();
      g.fillStyle = cuff; g.save(); g.translate(12, 52); g.rotate(-0.2); g.fillRect(-58, -12, 120, 26); g.restore();
      g.fillStyle = glove; g.beginPath(); g.roundRect(-50, -46, 100, 90, 26); g.fill();
      g.beginPath(); g.roundRect(-58, 0, 92, 30, 15); g.fill();
      g.strokeStyle = 'rgba(255,240,210,.2)'; g.lineWidth = 3; g.beginPath(); g.moveTo(40, -36); g.lineTo(40, 36); g.moveTo(-30, -2); g.lineTo(30, -2); g.stroke();
    }, 9), x, y, { rot, sc: s });
  }
  /** a lamp's glow: added light, the one thing in a paper box that is not paper */
  function glow(c, x, y, r, col = 'rgba(255,214,140,', a = 0.55) {
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col + a + ')'); g.addColorStop(1, col + '0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }
  return { K, W, H, M, sheet, sprite, layer, put, stack, box, dusk, leafSprite, leaves, words, ease, pop, move, walker, hand, fist, glow, ledAt, canvas };
})();
