// RFP v5 · CLEAN LIGHT — the papercut refinement (plan/PRODUCTION-STANDARD.md, order of work 3; owner, 17 Oct:
// "the clay and paper cut are better but still have a feel that is less polished"). Loaded AFTER rfp_kit.js and
// BEFORE a film's own kit, it upgrades the box in place for that film only; every older film renders as it was.
// What changes, and why each is the polish rather than a new style:
//   · the card's tooth was grit (specks everywhere); now it is a few long faint fibres and a soft top light —
//     the paper is still paper, but clean
//   · every cut edge catches the key: a bright rim on the edges facing the light, a dark one on the edges facing
//     away — the single strongest cue that this is a cut sheet with a thickness, lit
//   · one blurry shadow became two: a tight dark CONTACT shadow where the card nearly touches what is under it,
//     and a wide soft AMBIENT one — the way a lit miniature reads in a photograph
//   · the box frame is thinner and cleaner, and a grade (a soft vignette, lifted blacks) closes the frame
// Same API (sheet, sprite, layer, put, stack, box), so a film's kit and scenes need no changes to use it.
(() => {
  const R = RFP, { W, H, M, canvas } = R, { clamp, lerp } = U;
  const CACHE = {}, LIGHT = { dx: 9, dy: 13 };
  function clean(g, w, h, seed) {
    g.save(); g.globalCompositeOperation = 'source-atop';
    const v = g.createLinearGradient(0, 0, 0, h); v.addColorStop(0, 'rgba(255,248,232,.09)'); v.addColorStop(0.5, 'rgba(255,248,232,0)'); v.addColorStop(1, 'rgba(0,0,0,.09)');
    g.fillStyle = v; g.fillRect(0, 0, w, h);
    const r = U.rng(seed);
    for (let i = 0; i < (w * h) / 5200; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,250,235,.035)' : 'rgba(0,0,0,.04)'; g.save(); g.translate(r() * w, r() * h); g.rotate((r() - 0.5) * 0.5); g.fillRect(0, 0, 8 + r() * 18, 1.2); g.restore(); }
    g.restore();
  }
  const sil = (c, col = '#fff') => { const s = canvas(c.width, c.height), g = s.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, s.width, s.height); return s; };
  function edges(c, w = 2.2) {
    const s = sil(c), band = (dx, dy, col) => { const b = canvas(c.width, c.height), g = b.getContext('2d'); g.drawImage(s, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(s, dx, dy); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, b.width, b.height); return b; };
    const g = c.getContext('2d'); g.save(); g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = 0.42; g.drawImage(band(w, w, '#fff6e4'), 0, 0);     // the edge facing the light (up-left)
    g.globalAlpha = 0.30; g.drawImage(band(-w, -w, '#000'), 0, 0);       // the edge turned away
    g.restore();
  }
  function shadows(src, blur) {
    const s = sil(src, '#000'), mk = (b) => { const o = canvas(src.width, src.height), g = o.getContext('2d'); g.filter = `blur(${b}px)`; g.drawImage(s, 0, 0); return o; };
    return { s: mk(blur * 1.5), s2: mk(2.5) };
  }
  function sheet(key, draw, blur = 14) {
    if (CACHE[key]) return CACHE[key];
    const c = canvas(W + 2 * M, H + 2 * M), g = c.getContext('2d'); g.translate(M, M); draw(g); g.setTransform(1, 0, 0, 1, 0, 0);
    clean(g, c.width, c.height, key.length * 13 + 7); edges(c, 2.6);
    return (CACHE[key] = { c, ...shadows(c, blur), m: M });
  }
  function sprite(key, w, h, ox, oy, draw, blur = 8) {
    if (CACHE[key]) return CACHE[key];
    const pad = blur * 4, c = canvas(w + 2 * pad, h + 2 * pad), g = c.getContext('2d'); g.translate(pad + ox, pad + oy); draw(g); g.setTransform(1, 0, 0, 1, 0, 0);
    clean(g, c.width, c.height, key.length * 7 + 3); edges(c, 2);
    return (CACHE[key] = { c, ...shadows(c, blur), ox: pad + ox, oy: pad + oy });
  }
  const SOFT = new WeakMap();
  function blurred(sh, b) {
    const k = Math.round(b * 2) / 2; let m = SOFT.get(sh); if (!m) SOFT.set(sh, (m = {}));
    if (m[k]) return m[k];
    const out = canvas(sh.c.width, sh.c.height), g = out.getContext('2d'); g.filter = `blur(${k}px)`; g.drawImage(sh.c, 0, 0); return (m[k] = out);
  }
  /** a sheet at its depth: the wide ambient shadow, the tight contact shadow, then the card */
  function layer(c, sh, ox = 0, oy = 0, { lift = 1, alpha = 0.55, soft = 0 } = {}) {
    if (lift > 0) {
      c.save(); c.globalAlpha = alpha * 0.7; c.drawImage(sh.s, ox - sh.m + LIGHT.dx * lift * 1.2, oy - sh.m + LIGHT.dy * lift * 1.2); c.restore();
      c.save(); c.globalAlpha = Math.min(0.6, alpha * 1.1); c.drawImage(sh.s2, ox - sh.m + 2 + lift, oy - sh.m + 3 + lift * 1.4); c.restore();
    }
    c.drawImage(soft >= 0.6 ? blurred(sh, soft) : sh.c, ox - sh.m, oy - sh.m);
  }
  function put(c, sp, x, y, { rot = 0, sc = 1, lift = 1, alpha = 0.5 } = {}) {
    const one = (dx, dy, img, a) => { c.save(); c.globalAlpha *= a; c.translate(x + dx, y + dy); c.rotate(rot); c.scale(sc, sc); c.drawImage(img, -sp.ox, -sp.oy); c.restore(); };
    if (lift > 0) { one(LIGHT.dx * lift, LIGHT.dy * lift, sp.s, alpha * 0.75); one(1.5 + lift, 2.5 + lift * 1.2, sp.s2, Math.min(0.6, alpha * 1.15)); }
    one(0, 0, sp.c, 1);
  }
  function zoom(c, cam, d) { const z = 1 + ((cam.z || 1) - 1) * d, fx = cam.fx ?? W / 2, fy = cam.fy ?? H / 2; if (z !== 1) { c.translate(fx, fy); c.scale(z, z); c.translate(-fx, -fy); } }
  function stack(c, layers, cam = { x: 0, y: 0, z: 1 }) {
    LIGHT.dx = 9 + (cam.x || 0) * 0.45; LIGHT.dy = 13 + (cam.y || 0) * 0.3 + ((cam.z || 1) - 1) * 36;
    for (const L of layers) {
      if (L.fn) { c.save(); zoom(c, cam, L.d); L.fn(c, -cam.x * L.d, -cam.y * L.d); c.restore(); continue; }
      c.save(); zoom(c, cam, L.d); layer(c, L.sh, -cam.x * L.d + (L.x || 0), -cam.y * L.d + (L.y || 0), { lift: L.lift ?? 1, alpha: L.alpha ?? 0.55, soft: L.soft ?? Math.max(0, 0.14 - L.d) * 25 }); c.restore();
    }
  }
  /** the box, thinner and cleaner: a 40 px frame with a lit top-left bevel, its shadow thrown into the box, a grade */
  function box(c, { frame = '#2b1d13', vignette = 0.32 } = {}) {
    const F = 40; c.save();
    const v = c.createRadialGradient(W / 2, H * 0.47, H * 0.28, W / 2, H * 0.5, H * 0.72); v.addColorStop(0, 'rgba(6,8,10,0)'); v.addColorStop(1, `rgba(6,8,10,${vignette})`); c.fillStyle = v; c.fillRect(0, 0, W, H);
    const sh = c.createLinearGradient(0, F, 0, F + 70); sh.addColorStop(0, 'rgba(8,6,4,.55)'); sh.addColorStop(1, 'rgba(8,6,4,0)'); c.fillStyle = sh; c.fillRect(F, F, W - 2 * F, 70);
    const sl = c.createLinearGradient(F, 0, F + 60, 0); sl.addColorStop(0, 'rgba(8,6,4,.45)'); sl.addColorStop(1, 'rgba(8,6,4,0)'); c.fillStyle = sl; c.fillRect(F, F, 60, H - 2 * F);
    c.fillStyle = frame; c.beginPath(); c.rect(0, 0, W, H); c.rect(F, F, W - 2 * F, H - 2 * F); c.fill('evenodd');
    c.strokeStyle = 'rgba(255,226,180,.16)'; c.lineWidth = 2; c.beginPath(); c.moveTo(F - 1, H - F); c.lineTo(F - 1, F - 1); c.lineTo(W - F, F - 1); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.moveTo(W - F + 1, F); c.lineTo(W - F + 1, H - F + 1); c.lineTo(F, H - F + 1); c.stroke();
    c.restore();
  }
  Object.assign(RFP, { sheet, sprite, layer, put, stack, box, CLEAN: true, LIGHT });
})();
