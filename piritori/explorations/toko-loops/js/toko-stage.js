// Toko Slomo's noodle bar, acted: the approved v02 painting split into cut-card pieces and moved from hidden pivots.
// Pieces and pivots come from layers/layers.json (written by tools/layers.py); everything below is a pure function of
// time, so the same call draws the in-game loop, a still, or a frame of a review render.
//   Character clips are posed on a 10 fps rhythm (ART_BIBLE §14.1); ambient loops hold 4–8 frames at their own rates
//   with seeded offsets, so nothing on screen loops in step (§14.3). Frame zero of every clip is the painting as approved.
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const step = (t, fps) => Math.floor(t * fps + 1e-6) / fps;
const rng = (seed) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const D = Math.PI / 180;

// ── the rig: pivots sit inside the overlaps, where a joint would be hidden
export const PIVOTS = {
  torso: [757, 455],      // on the counter's back edge: he breathes and leans from the waist
  head: [762, 338],       // the neck, under the chin of the hood
  brow_l: [727, 186], brow_r: [800, 184],
  fore_r: [588, 425],     // right elbow (image left): the drying arm
  hand_l: [938, 412],     // left elbow (image right): the hand on the note
  note: [812, 485],
  lantern: [82, 20],
};
// the default pose: every channel at rest draws the approved painting exactly
const REST = { 'torso.s': 1, 'torso.sy': 1, 'torso.ty': 0, 'head.rot': 0, 'head.tx': 0, 'head.ty': 0, 'head.s': 1,
  'brow_l.rot': 0, 'brow_l.ty': 0, 'brow_r.rot': 0, 'brow_r.ty': 0, 'fore_r.rot': 0, 'fore_r.tx': 0, 'fore_r.ty': 0,
  'hand_l.rot': 0, 'hand_l.tx': 0, 'hand_l.ty': 0, 'note.tx': 0, 'note.ty': 0, 'note.rot': 0, 'note.a': 1, blink: 0, till: 0 };

// ── the clips: [time, value] keys per channel, eased between, sampled at 10 fps
const loopKeys = (period, n, a, b, phase = 0) => {   // n cycles of a → b → a over the period
  const k = []; for (let i = 0; i <= n * 2; i++) k.push([phase + (i / (n * 2)) * period, i % 2 ? b : a]); return k; };
const blinkAt = (t0) => [[0, 0], [t0, 0], [t0 + 0.1, 1], [t0 + 0.2, 1], [t0 + 0.3, 0]];
// v2 (owner, 21 Oct: "good but could be slightly more animated"): bigger strokes, a look about with a quizzical brow,
// finger taps, two blinks, talking nods while he lowers his voice, and fuller acting on every choice
export const CLIPS = {
  // drying the cloth round his fist, breathing into his shoulders, a look about with a brow, finger taps, two blinks
  idle: { dur: 6.0, loop: true, keys: {
    'torso.sy': loopKeys(6.0, 2, 1, 1.012), 'torso.s': loopKeys(6.0, 2, 1, 1.004),
    'fore_r.rot': loopKeys(6.0, 6, 0, 5 * D), 'fore_r.tx': loopKeys(6.0, 6, 0, 5, 0.25), 'fore_r.ty': loopKeys(6.0, 6, 0, -4, 0.12),
    'head.rot': [[0, 0], [0.9, 2.6 * D], [2.1, 2.6 * D], [3.0, -2.2 * D], [4.4, -2.2 * D], [5.3, 0], [6.0, 0]],
    'head.tx': [[0, 0], [0.9, 3], [2.1, 3], [3.0, -3], [4.4, -3], [5.3, 0], [6.0, 0]],
    'head.ty': loopKeys(6.0, 2, 0, 1.5),
    'brow_l.ty': [[0, 0], [1.0, -4], [1.9, -4], [2.3, 0], [6.0, 0]], 'brow_r.ty': [[0, 0], [3.1, 0], [3.4, -4], [4.2, -4], [4.6, 0], [6.0, 0]],
    'hand_l.rot': [[0, 0], [2.2, 0], [2.3, -2.6 * D], [2.4, 0], [2.6, -2.6 * D], [2.7, 0], [6.0, 0]],
    blink: [[0, 0], [1.4, 0], [1.5, 1], [1.6, 1], [1.7, 0], [4.8, 0], [4.9, 1], [5.0, 1], [5.1, 0], [5.2, 1], [5.3, 0]] } },
  // "Toko lowers his voice": he leans over the counter, brows down and in, and talks: small nods on the syllables,
  // the cloth hand lifting on the important word
  lean: { dur: 3.6, loop: true, hold: { 'torso.s': 1.03, 'torso.ty': 7, 'head.ty': 12, 'head.rot': -3 * D, 'head.s': 1.02,
    'brow_l.rot': 8 * D, 'brow_r.rot': -8 * D, 'brow_l.ty': 2, 'brow_r.ty': 2, 'fore_r.rot': -1 * D, 'fore_r.ty': 2 }, keys: {
    'torso.sy': loopKeys(3.6, 1, 1, 1.01),
    'head.ty': [[0, 12], [0.3, 14], [0.5, 12], [0.8, 15], [1.0, 12], [1.3, 17], [1.6, 12], [1.9, 14], [2.1, 12], [3.6, 12]],
    'head.rot': [[0, -3 * D], [0.8, -4.2 * D], [1.6, -2 * D], [2.4, -3.6 * D], [3.6, -3 * D]],
    'brow_l.ty': [[0, 2], [1.2, 2], [1.35, -3], [1.8, -3], [2.1, 2], [3.6, 2]], 'brow_r.ty': [[0, 2], [1.2, 2], [1.35, -3], [1.8, -3], [2.1, 2], [3.6, 2]],
    'fore_r.rot': [[0, -1 * D], [1.1, -1 * D], [1.35, -6 * D], [1.9, -6 * D], [2.3, -1 * D], [3.6, -1 * D]],
    blink: blinkAt(2.7) } },
  // BUY INFO: the hand lifts, slides the note across the counter to you, the till rings up the price, brows up, a nod
  buy_info: { dur: 3.2, loop: false, hold: { 'torso.s': 1.03, 'torso.ty': 7, 'head.ty': 12, 'head.rot': -3 * D, 'head.s': 1.02 }, keys: {
    'hand_l.rot': [[0, 0], [0.3, -4.5 * D], [0.6, -1 * D], [1.2, 0]],
    'hand_l.tx': [[0, 0], [0.4, 0], [0.9, -24], [1.3, -24], [1.9, 0]], 'hand_l.ty': [[0, 0], [0.4, -6], [0.9, 18], [1.3, 18], [1.9, 0]],
    'note.tx': [[0, 0], [0.4, 0], [0.9, -44], [2.4, -44], [2.9, -56]], 'note.ty': [[0, 0], [0.4, 0], [0.9, 44], [2.4, 44], [2.9, 64]],
    'note.rot': [[0, 0], [0.9, -8 * D], [2.9, -12 * D]], 'note.a': [[0, 1], [2.5, 1], [2.9, 0]],
    'brow_l.ty': [[0, 2], [1.4, 2], [1.6, -6], [2.4, -6], [2.8, 0]], 'brow_r.ty': [[0, 2], [1.4, 2], [1.6, -6], [2.4, -6], [2.8, 0]],
    'brow_l.rot': [[0, 8 * D], [1.4, 8 * D], [1.6, -2 * D], [2.6, -2 * D], [3.2, 0]], 'brow_r.rot': [[0, -8 * D], [1.4, -8 * D], [1.6, 2 * D], [2.6, 2 * D], [3.2, 0]],
    'head.ty': [[0, 12], [1.6, 12], [1.8, 20], [2.0, 12], [2.15, 17], [2.3, 12], [3.2, 4]],
    'torso.sy': [[0, 1], [1.5, 1], [1.8, 1.012], [2.6, 1]],
    till: [[0, 0], [1.1, 0], [1.2, 1], [3.2, 1]] }, events: [[1.2, 'till'], [0.9, 'paper']] },
  // RISK SABOTAGE: he looks hard at the window, sets the cloth down, the brows knit, a slow shake of the head, a sigh
  sabotage: { dur: 3.4, loop: false, keys: {
    'head.rot': [[0, 0], [0.4, 5.5 * D], [1.2, 5.5 * D], [1.5, -4 * D], [1.8, 4 * D], [2.1, -4 * D], [2.4, 1 * D], [3.4, 0]],
    'head.tx': [[0, 0], [0.4, 10], [1.2, 10], [2.4, 1], [3.4, 0]], 'head.ty': [[0, 0], [0.4, -2], [1.2, -2], [2.6, 4], [3.4, 0]],
    'brow_l.rot': [[0, 0], [0.5, 12 * D], [2.8, 12 * D], [3.4, 0]], 'brow_r.rot': [[0, 0], [0.5, -12 * D], [2.8, -12 * D], [3.4, 0]],
    'brow_l.ty': [[0, 0], [0.5, 4], [2.8, 4], [3.4, 0]], 'brow_r.ty': [[0, 0], [0.5, 4], [2.8, 4], [3.4, 0]],
    'fore_r.rot': [[0, 0], [0.5, 7 * D], [2.8, 7 * D], [3.4, 0]], 'fore_r.ty': [[0, 0], [0.5, 10], [2.8, 10], [3.4, 0]],
    'torso.sy': [[0, 1], [0.6, 1.015], [1.4, 1.0], [2.6, 1.012], [3.4, 1]],          // a breath in, out, and a sigh
    blink: [[0, 0], [2.5, 0], [2.6, 1], [2.7, 1], [2.8, 0]] }, events: [[0.4, 'look']] },
  // LEAVE: a bow from the neck and the cloth raised in a wave, three waves
  leave: { dur: 2.8, loop: false, keys: {
    'head.ty': [[0, 0], [0.3, 20], [0.75, 20], [1.05, 0]], 'head.s': [[0, 1], [0.3, 0.975], [0.75, 0.975], [1.05, 1]],
    'torso.s': [[0, 1], [0.3, 1.018], [1.05, 1]],
    'fore_r.rot': [[0, 0], [0.9, 0], [1.2, -13 * D], [1.38, -8 * D], [1.56, -13 * D], [1.74, -8 * D], [1.92, -13 * D], [2.1, -8 * D], [2.8, 0]],
    'fore_r.ty': [[0, 0], [0.9, 0], [1.2, -7], [2.1, -7], [2.8, 0]],
    'brow_l.ty': [[0, 0], [1.1, 0], [1.3, -5], [2.2, -5], [2.6, 0]], 'brow_r.ty': [[0, 0], [1.1, 0], [1.3, -5], [2.2, -5], [2.6, 0]],
    blink: blinkAt(0.35) }, events: [[0.3, 'bow']] },
};

function sampleKeys(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * smooth((t - t0) / (t1 - t0 || 1)); }
  return keys[keys.length - 1][1];
}
/** a clip's pose at local time t (looped clips wrap) */
export function pose(name, t) {
  const c = CLIPS[name], lt = c.loop ? ((t % c.dur) + c.dur) % c.dur : clamp(t, 0, c.dur), p = { ...REST, ...(c.hold || {}) };
  for (const [ch, keys] of Object.entries(c.keys)) p[ch] = sampleKeys(keys, lt);
  return p;
}
const mix = (a, b, k) => { const o = {}; for (const ch in REST) o[ch] = a[ch] + (b[ch] - a[ch]) * k; return o; };

// ── the drawing
export async function createStage(canvas, { base = './layers/', seed = 11 } = {}) {
  const L = await (await fetch(base + 'layers.json')).json(), g = canvas.getContext('2d');
  canvas.width = L.size[0]; canvas.height = L.size[1];
  const img = {}; await Promise.all(Object.entries(L.pieces).map(([k, p]) => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => { img[k] = i; res(); }; i.onerror = rej; i.src = base + p.file; })));
  const pc = L.pieces, put = (k, dx = 0, dy = 0) => g.drawImage(img[k], pc[k].x + dx, pc[k].y + dy);
  const about = (k, [px, py], rot = 0, s = 1, sy = 1, tx = 0, ty = 0) => { g.translate(px + tx, py + ty); g.rotate(rot); g.scale(s, s * sy); g.translate(-px, -py); };
  // each eyelid: the opening's own shape in hood yellow with a darker card edge, cached once
  const lid = (k) => { const p = pc[k], c = document.createElement('canvas'); c.width = p.w; c.height = p.h; const x = c.getContext('2d');
    x.drawImage(img[k], 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${L.lid_rgb})`; x.fillRect(0, 0, p.w, p.h); return c; };
  const LID = { eye_l: lid('eye_l'), eye_r: lid('eye_r') };
  const R = rng(seed), steamPuffs = Array.from({ length: 7 }, (_, i) => ({ off: R() * 5, dx: -10 - R() * 36, s: 0.75 + R() * 0.55, seed: 100 + i }));
  const drops = Array.from({ length: 70 }, () => ({ x: R(), y: R(), l: 12 + R() * 16, v: 0.8 + R() * 0.5 }));
  const GLASS = [1400, 32, 1664, 446];

  function ambient(t) {
    // the lantern swings a degree and a half on its cord (6 held frames a swing)
    const ls = Math.sin(step(t + 0.37, 6) * TAU / 3.1) * 2.2 * D;
    g.save(); about('lantern', PIVOTS.lantern, ls); put('lantern'); g.restore();
    // the tram rocks on its bogies and its headlights breathe in the rain
    const rock = step(t, 8), ry = Math.round(Math.sin(rock * TAU / 1.7) * 1);
    put('tram', 0, ry);
    for (const [hx, hy] of [[1567, 374], [1622, 374]]) { const a = 0.32 + 0.08 * Math.sin(step(t, 8) * 5.1 + hx);
      const gr = g.createRadialGradient(hx, hy + ry, 0, hx, hy + ry, 34); gr.addColorStop(0, `rgba(255,236,190,${a})`); gr.addColorStop(1, 'rgba(255,236,190,0)');
      g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(hx - 34, hy - 34 + ry, 68, 68); g.globalCompositeOperation = 'source-over'; }
    // rain on the street through the window: fine diagonal streaks, 12 fps
    const tr = step(t, 12); g.save(); g.beginPath(); g.rect(GLASS[0], GLASS[1], GLASS[2] - GLASS[0], GLASS[3] - GLASS[1]); g.clip();
    g.strokeStyle = 'rgba(178,198,224,.32)'; g.lineWidth = 1.2;
    for (const d of drops) { const h = GLASS[3] - GLASS[1], y = GLASS[1] + ((d.y * h + tr * 620 * d.v) % h), x = GLASS[0] + d.x * (GLASS[2] - GLASS[0]) - (y - GLASS[1]) * 0.12;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - d.l * 0.2, y + d.l); g.stroke(); }
    g.restore();
    // steam off the pot: cut-paper puffs that rise, swell and thin, 8 fps, never two in step
    const ts = step(t, 8);
    for (const p of steamPuffs) { const k = ((ts + p.off) % 5) / 5, x = 262 + p.dx * k, y = 318 - k * 130, r = (10 + k * 34) * p.s, a = 0.34 * Math.sin(k * Math.PI);
      const pr = rng(p.seed); g.fillStyle = `rgba(226,214,192,${a})`; g.beginPath();
      for (let i = 0; i < 9; i++) { const an = i / 9 * TAU, rr = r * (0.75 + pr() * 0.4); g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.8); }
      g.closePath(); g.fill(); }
  }
  function chef(p) {
    const T = PIVOTS.torso, bodyT = () => about('torso', T, 0, p['torso.s'], p['torso.sy'], 0, p['torso.ty']);
    g.save(); bodyT(); put('torso');
    g.save(); about('head', PIVOTS.head, p['head.rot'], p['head.s'], 1, p['head.tx'], p['head.ty']);
    put('head');
    if (p['brow_l.rot'] || p['brow_l.ty'] || p['brow_r.rot'] || p['brow_r.ty']) {   // the bare hood under the brows, then the brows where they are now
      put('hood_bare');
      for (const k of ['brow_l', 'brow_r']) { g.save(); about(k, PIVOTS[k], p[k + '.rot'], 1, 1, 0, p[k + '.ty']); put(k); g.restore(); } }
    if (p.blink > 0.02) for (const k of ['eye_l', 'eye_r']) { const e = pc[k], hh = Math.ceil(e.h * clamp(p.blink));
      g.drawImage(LID[k], 0, 0, e.w, hh, e.x, e.y, e.w, hh);
      g.fillStyle = 'rgba(60,34,8,.55)'; g.fillRect(e.x + 2, e.y + hh - 2, e.w - 4, 2); }
    g.restore(); g.restore();
    put('counter');                                     // the counter's near edge, in front of his waist
    g.save(); bodyT(); g.save(); about('fore_r', PIVOTS.fore_r, p['fore_r.rot'], 1, 1, p['fore_r.tx'], p['fore_r.ty']); put('fore_r'); g.restore(); g.restore();
    if (p['note.a'] > 0.01) { g.save(); g.globalAlpha = p['note.a']; about('note', PIVOTS.note, p['note.rot'], 1, 1, p['note.tx'], p['note.ty']); put('note'); g.restore(); }
    g.save(); bodyT(); about('hand_l', PIVOTS.hand_l, p['hand_l.rot'], 1, 1, p['hand_l.tx'], p['hand_l.ty']); put('hand_l'); g.restore();
    if (p.till > 0.01) {                               // the till's display rings up the price
      g.fillStyle = '#25221d'; g.fillRect(1222, 383, 56, 19); g.fillStyle = '#d9cfb8'; g.font = '600 16px "Courier New", monospace'; g.textAlign = 'right';
      g.fillText((120 * smooth(p.till)).toFixed(2), 1276, 399); }
  }
  /** draw the scene with the chef in pose p at time t (ambient loops read t) */
  function frame(t, p) { g.drawImage(img.plate, 0, 0); ambient(t); chef(p || REST); }
  /** the reduced-motion / low-power frame: the approved painting, rebuilt from its pieces at rest, no ambient overlays */
  function still() { g.drawImage(img.plate, 0, 0); put('lantern'); put('tram'); chef(REST); }
  // ── the in-game player: play(name) blends from wherever he is into the clip over 0.3 s; one-shots fall back to `then`
  let cur = { name: 'idle', t0: 0, from: null, then: 'idle' }, clock = () => performance.now() / 1000;
  function current(t) {
    let c = CLIPS[cur.name]; if (!c.loop && t - cur.t0 >= c.dur) { cur = { name: cur.then, t0: cur.t0 + c.dur, from: pose(cur.name, c.dur), then: cur.then }; c = CLIPS[cur.name]; }
    let p = pose(cur.name, step(t - cur.t0, 10)); if (cur.from) p = mix(cur.from, p, smooth((t - cur.t0) / 0.3));
    return p;
  }
  return {
    frame, still, pose, current,
    play(name, { then = 'idle', at = clock() } = {}) { const from = current(at); cur = { name, t0: at, from, then }; },
    tick(t = clock()) { frame(t, current(t)); },
    setClock(fn) { clock = fn; },
  };
}
