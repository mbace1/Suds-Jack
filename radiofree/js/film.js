// Radio Free Helsinki — a bulletin as a FILM, not a still with a clock on it.
//
// The first export was the feed's lower third painted under whichever shot the
// package happened to be on: every word on screen from frame one, the reveal a
// state flip at the halfway mark, nothing moving but the panel. Held against
// the code-drawn launch films of 2026-09 (MOTION.md names them and what was
// measured off each), that is every fault they list at once — "everything
// arrives at one brisk speed, events pile on top of each other, and moments
// are over before anyone understands them."
//
// So this module is the edit. It has two halves, deliberately split:
//
//   planFilm(entry, opts)  — PURE. Turns a bulletin's copy into a timeline: the
//                            shots and when they cut, each shot's LOOK, the
//                            headline broken into word runs, one caption at a
//                            time with a reading budget, the reveal, Toko's
//                            reaction shot, the payoff word, the figure
//                            counter, the sign-off. No DOM, no canvas, so
//                            test/film.mjs can assert it in bare node.
//   paintFilm(ctx, plan, t, shots) — the compositor. Every frame is a pure
//                            function of t: no state survives between frames,
//                            which is what lets a frame be re-rendered alone
//                            and a contact sheet be pulled at any set of times.
//   actAt(plan, t)         — what Toko is DOING this frame (mouth, eyes, lean,
//                            the take), handed to the anchor shot by the export.
//
// What was TAKEN from the references, and what was refused, is the whole point
// of MOTION.md; the short version is that the timing, the typography motion,
// the transitions and the surface are borrowed, and the drawing medium is not.
// This station is a 128×152 pixel panel behind curved glass, and stays one.

import { parseLine } from './wire.js?v=71';
import { readFigures } from './visuals.js?v=71';
import { PAL } from './palette.js?v=71';
import { mix } from './screen.js?v=71';

export const W = 1080, H = 1920;
export const MONO = '"IBM Plex Mono", "SF Mono", Menlo, Consolas, "IPAGothic", monospace';

// ── the numbers (MOTION.md carries where each came from) ────────────────
export const TIMING = {
  fps: 30,
  open: 2.0,           // cold open on footage, the slug and the first run arrive
  breath: 0.8,         // the silence before the payoff
  flash: 0.10,         // the cut flash, three frames at 30
  strike0: 1.0,        // the reveal shot: amber, the stamp, the payoff word
  take: 0.7,           // Toko's reaction — the reverse shot the punchline earns
  card: 1.6,           // the sign-off
  readFloor: 2.4,      // no broadcast caption shorter than this
  readPerChar: 1 / 22, // a broadcast sentence: 1 s + 1 s per 22 characters
  plainFloor: 1.6,
  plainPerChar: 1 / 17,// a plain reading: 1 s + 1 s per 17 characters
  gap: 0.3,            // between captions, so the picture gets the eyes back
  tellFloor: 2.2,
  minScale: 0.55,      // how far a target length may compress the reading budgets
  strike: 0.25,        // the strike-through wipe
  typeChar: 0.028,     // the plain reading types on at this per character
  counter: 0.9,        // the figure rolls from claim to plain over this
  counterDelay: 0.4,
  payoffGrow: 0.30,    // the technique word grows this much across the hold
  runPop: 0.32,        // a word run pops in over this (backOut)
  wordStagger: 0.12,   // ...and its words arrive one after another at this
  roll: 0.22,          // the V-hold roll between broadcast shots
  slam: 0.30,          // the graphic falls into its frame and lands (its own cut in)
  drop: 0.45,          // …and falls out of it under gravity (its own cut out)
  shake: 0.16,         // the reveal's camera shake
  collapse: 0.30,      // the tube switching off into the card
  boilHz: 12,          // grain re-seeds on twos
  sweep: 5.2,          // seconds per scanline roll across the picture
  syl: 5.6,            // syllables a second, when Toko reads
  bpm: 96,             // the score's tempo (js/score.js) — every cut lands on one of its beats
};

export const SURFACE = { grain: 0.16, flicker: 0.035, vignette: 0.32, cutFlash: 0.34, bloom: 0.55 };

export const TYPE = {
  tag: 34, run0: 52, runStep: 1.12, runMax: 4, runLine: 1.16,
  payoff0: 96, caption: 36, plain: 34, counter: 64, footer: 26, stamp: 150,
};

// The LOOKS — a palette ARC across the film rather than green-then-amber. Every
// broadcast shot is a different cold phosphor (neighbours never share one),
// the breath is pushed into false colour (the reel's gradient map, on a third
// of its shots), and amber keeps its one job: the spin showing. The tell goes
// one step warmer than amber; the card comes home to green.
export const LOOKS = {
  green:  { key: PAL.GREEN,    dim: PAL.GREEN_DIM, name: 'green' },
  cyan:   { key: PAL.GAMING,   dim: '#2a7f9c',     name: 'cyan' },
  lime:   { key: PAL.INDUSTRY, dim: '#4f8a3a',     name: 'lime',
            treat: { map: ['#06110a', '#2f6a1e', '#8fe36a', '#eaffc0'], steps: 6 } },
  violet: { key: '#c86dff',    dim: '#6d3a99',     name: 'violet',
            treat: { map: ['#12062a', '#7b2d9e', '#f0027f', '#ffd6e8'], steps: 5 } },
  amber:  { key: PAL.AMBER,    dim: PAL.AMBER_DIM, name: 'amber' },
  ember:  { key: PAL.DEFENCE,  dim: '#8a3a3a',     name: 'ember' },
};
// Toko's shot takes a set colour, the graphic shot is re-hued through its
// look's gradient map, the third read (when there is one) is footage in green
// How Toko takes a story, by its wire `tone` (js/wire.js TONES): the mark that
// pops by his head on every cut to him. DECODE is always '!'.
export const EMOTES = { boast: 'spark', uneasy: '!?', absurd: '?', grim: 'sweat', default: 'spark' };

const READ_LOOKS = [LOOKS.cyan, LOOKS.lime, LOOKS.green];

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const easeIn = (x) => Math.pow(clamp(x), 3);
const backOut = (x) => { x = clamp(x); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ── the plan ─────────────────────────────────────────────────────────────

// The headline as WORD RUNS: the launch film's phrases each start larger than
// the last. A headline has to stay readable whole, so runs accumulate as lines
// rather than replacing each other, and the sizes are capped at four steps.
export function splitRuns(head, max = TYPE.runMax) {
  // A clause break is punctuation FOLLOWED BY A SPACE: "37,000 jobs" and
  // Finnish "674 000:een" are one number each, and the first cut of this
  // split them into "37" and "000 jobs" — a headline that opened on a run
  // reading "1", then "500", then "000 wishlists".
  const parts = String(head || '').split(/\s*(?:[,;:](?=\s)|—|–|\s-\s)\s*/).map(s => s.trim()).filter(Boolean);
  const runs = [];
  for (const p of parts) {
    const words = p.split(/\s+/);
    if (words.length > 7) {
      // halve near the middle — but "700 000" and "674 000:een" are one number
      // written as two words, and a cut between them reads as two numbers
      const isNum = (w) => /^\d[\d,.]*(?::\w+)?$/.test(w);
      const mid = Math.ceil(words.length / 2);
      let cut = mid;
      for (let d = 0; d < words.length; d++) {
        for (const c of [mid + d, mid - d]) {
          if (c > 0 && c < words.length && !(isNum(words[c - 1]) && isNum(words[c]))) { cut = c; d = words.length; break; }
        }
      }
      runs.push(words.slice(0, cut).join(' '), words.slice(cut).join(' '));
    } else runs.push(p);
  }
  // CJK headlines have no spaces to split on: break at the punctuation Japanese
  // copy actually uses, then after a particle when a run is still long
  if (runs.length === 1 && runs[0].length > 18 && !/\s/.test(runs[0])) {
    const ja = runs[0].split(/(?<=[。、！？])/).filter(Boolean);
    runs.length = 0;
    for (const p of ja) {
      if (p.length <= 22) { runs.push(p); continue; }
      const mid = Math.ceil(p.length / 2);
      let cut = -1;
      for (let i = mid + 4; i >= 4; i--) if (/[でをにはがのとへも]/.test(p[i - 1])) { cut = i; break; }
      if (cut < 0) cut = mid;
      runs.push(p.slice(0, cut), p.slice(cut));
    }
  }
  while (runs.length > max) { const a = runs.splice(max - 1, 2); runs.splice(max - 1, 0, a.join(' ')); }
  return runs;
}

// The sentence a struck span sits in — a clip is a reel of the bulletin, not
// the bulletin, so the broadcast phase shows the sentence that carries the
// move and leaves the paragraph to the feed.
function sentenceAround(text, at) {
  const ends = /[.!?。！？](\s|$)/g;
  let start = 0, m;
  while ((m = ends.exec(text))) {
    const end = m.index + m[0].length;
    if (at < end) return { text: text.slice(start, end).trim(), start };
    start = end;
  }
  return { text: text.slice(start).trim(), start };
}

function readingBudget(text, floor, perChar) {
  return Math.max(floor, 1 + String(text).length * perChar);
}

/**
 * The timeline. `entry` is the feed's own record ({ story, copy, post }).
 * opts.seconds is a TARGET, not a length: the reading budgets compress toward
 * it down to TIMING.minScale, and the plan reports the length it actually is.
 */
export function planFilm(entry, opts = {}) {
  const T = TIMING, fps = opts.fps || T.fps;
  const copy = entry.copy || {};
  const story = entry.story || {};
  const lines = (copy.lines || []).map(l => parseLine(l));
  const broadcastOf = (runs) => runs.map(r => r.text).join('');

  // ── the captions of the broadcast phase: one sentence per paragraph ──
  const reads = [];
  lines.forEach((runs, li) => {
    const text = broadcastOf(runs);
    let at = 0, firstSpan = -1;
    for (const r of runs) { if (r.plain !== null && firstSpan < 0) firstSpan = at; at += r.text.length; }
    const s = sentenceAround(text, Math.max(0, firstSpan));
    reads.push({ para: li, text: s.text });
  });

  // ── the plain readings: every pair, in order ──
  const pairs = [];
  lines.forEach((runs, li) => {
    for (const r of runs) if (r.plain !== null) pairs.push({ para: li, spun: r.text, plain: r.plain });
  });

  const runs = splitRuns(copy.head);
  const figures = readFigures(story.figures);
  const fig = figures.rows[0] || null;

  // ── budgets, unscaled ──
  const readB = reads.map(r => readingBudget(r.text, T.readFloor, T.readPerChar));
  const pairB = pairs.map(p => readingBudget(p.plain, T.plainFloor, T.plainPerChar));
  const tellB = copy.tell ? readingBudget(copy.tell, T.tellFloor, T.plainPerChar) : 0;
  const fixed = T.open + T.breath + T.flash + T.strike0 + T.take + T.card
    + (reads.length + pairs.length + (tellB ? 1 : 0)) * T.gap;
  const soft = readB.reduce((a, b) => a + b, 0) + pairB.reduce((a, b) => a + b, 0) + tellB;
  let scale = 1;
  if (opts.seconds && opts.seconds > 0) {
    scale = clamp((opts.seconds - fixed) / Math.max(0.001, soft), T.minScale, 1.6);
  }

  // ── lay the timeline ──
  const shots = [], captions = [];
  let t = 0;
  // Every cut lands ON A BEAT of the score. A shot is only ever LENGTHENED to
  // reach the next beat — never cut short — so no reading budget shrinks; the
  // picture and the music lock together the way PDoomVideo's did (its hits all
  // sit on its 88 BPM grid). The card is the one shot left at its own length.
  const BEAT = 60 / T.bpm;
  const onBeat = (x) => Math.ceil(x / BEAT - 1e-6) * BEAT;
  const push = (shot, len, look, extra = {}) => {
    const t1 = extra.free ? t + len : onBeat(t + len);
    delete extra.free;
    shots.push({ t0: t, t1, shot, look: look.name, ...extra }); t = t1;
  };

  push('broll', T.open, LOOKS.green);
  const runAt = [T.open * 0.45];                       // when each headline run pops
  const kinds = ['anchor', 'graphic', 'broll'];
  reads.forEach((r, i) => {
    const len = readB[i] * scale + T.gap;
    if (i < runs.length - 1) runAt.push(t);
    captions.push({ kind: 'read', t0: t + 0.12, t1: t + len - T.gap, text: r.text, para: r.para });
    push(kinds[i % kinds.length], len, READ_LOOKS[i % READ_LOOKS.length]);
  });
  // any headline run not yet placed pops on the breath
  while (runAt.length < runs.length) runAt.push(t + 0.1);
  push('broll', T.breath, LOOKS.violet);

  const reveal = t;
  push('graphic', T.flash + T.strike0, LOOKS.amber, { decoded: true });
  push('anchor', T.take, LOOKS.amber, { decoded: true, take: true });
  const holdStart = t;
  pairs.forEach((p, i) => {
    const len = pairB[i] * scale;
    captions.push({ kind: 'pair', t0: t, t1: t + len, spun: p.spun, plain: p.plain, para: p.para });
    t += len + T.gap;
  });
  const tellAt = t;
  if (tellB) {
    const len = tellB * scale;
    captions.push({ kind: 'tell', t0: t, t1: t + len, text: copy.tell });
    t += len + T.gap;
  }
  const holdEnd = onBeat(t);
  shots.push({ t0: holdStart, t1: holdEnd, shot: 'graphic', look: 'amber', decoded: true });
  t = holdEnd;
  push('card', T.card, LOOKS.green, { free: true });
  const S = t;

  return {
    S, fps, scale, shots, captions, reveal, holdStart, holdEnd, tellAt: tellB ? tellAt : -1,
    runs: runs.map((text, i) => ({ text, t: runAt[i] })),
    payoff: { text: copy.technique || '', t0: reveal + T.flash + 0.15 },
    counter: fig ? { claim: fig.claim, plain: fig.plain, unit: fig.unit || '', t0: holdStart + T.counterDelay } : null,
    card: { t0: holdEnd, t1: S },
    tag: { index: String(opts.index || 1).padStart(2, '0'), total: opts.total || 1, slug: copy.slug || '', date: opts.date || '' },
    onAir: opts.onAir || 'ON AIR',
    fiction: opts.fiction || '',
    freq: opts.freq || '',
    accent: opts.accent || PAL.GREEN,
    cuts: shots.map(s => s.t0).filter(x => x > 0),
    tone: story.tone || null,
    // the morning as ONE escalating set (PDoomVideo's four choruses on one
    // stage): heat rises with the bulletin's place in the morning, and the
    // SPIN-O-METER climbs by this bulletin's spins on the reveal
    heat: (opts.total || 1) > 1 ? clamp(((opts.index || 1) - 1) / ((opts.total || 1) - 1)) : 0,
    meter: {
      before: opts.spinsBefore || 0,
      after: (opts.spinsBefore || 0) + pairs.length,
      total: Math.max(1, opts.spinsTotal || ((opts.spinsBefore || 0) + pairs.length)),
    },
  };
}

export function shotAt(plan, t) {
  let cur = plan.shots[0];
  for (const s of plan.shots) if (t >= s.t0) cur = s;
  return cur;
}
function shotBefore(plan, cur) {
  const i = plan.shots.indexOf(cur);
  return i > 0 ? plan.shots[i - 1] : null;
}
export function lookAt(plan, t) {
  const sh = shotAt(plan, t);
  let look = LOOKS[sh.look] || LOOKS.green;
  // the tell is one step warmer than amber
  if (plan.tellAt >= 0 && t >= plan.tellAt && sh.shot === 'graphic') look = LOOKS.ember;
  return look;
}

// ── Toko, acting ─────────────────────────────────────────────────────────
//
// A read-aloud envelope over the caption that is actually on screen: syllables
// at TIMING.syl, uneven, with the breath at the end of each sentence. Between
// captions the mouth is shut — an anchor who chews between sentences is a
// puppet. The eyes open while he reads, blink before every cut away from him
// (the thing that carries over the cut), and on the reveal he does a TAKE:
// lids shut, then a pop wide with a lean back and a tilt, the expression
// morphing rather than snapping.
export function actAt(plan, t) {
  const T = TIMING, sh = shotAt(plan, t);
  const cap = plan.captions.find(c => t >= c.t0 && t < c.t1 && c.kind === 'read');
  let mouth = 0, open = null, squash = null, grin = null, lean = 0, nod = 0, tilt = 0, gesture = 0, hands = 0;
  if (cap) {
    const u = (t - cap.t0) / (cap.t1 - cap.t0);
    // one hand makes the point of each sentence — alternate sentences, alternate
    // hands — up on the first words, down before the nod lands it
    const side = plan.captions.indexOf(cap) % 2 ? -1 : 1;
    gesture = side * 0.85 * ease(seg(u, 0.08, 0.26)) * (1 - ease(seg(u, 0.62, 0.84)));
    if (u < 0.88) {
      const n = Math.floor(t * T.syl), f = t * T.syl - n;
      const o = Math.sin(f * Math.PI);
      mouth = o * o * (0.45 + hash(n) * 0.55);
    }
    open = 1;
    // the head rides the syllables a little — a mouth alone never reads as
    // talking on a face this simple — and nods as the sentence lands
    nod = mouth * 0.28 + ease(seg(u, 0.86, 0.93)) * (1 - ease(seg(u, 0.95, 1)));
  }
  // the blink that carries over the cut
  const cut = plan.cuts.find(c => c > t && c - t < 0.22 && sh.shot === 'anchor');
  if (cut !== undefined) squash = 1 - ease(seg(t, cut - 0.22, cut - 0.08)) * (1 - ease(seg(t, cut - 0.08, cut)));
  // A MOOD CHANGE on every cut to him (PDoomVideo's mood(): never snap a
  // face). The lids start shut and open over 0.16 s, the badge squashes then
  // springs, and the mark for the story's tone pops by his head and fades.
  let pop = 1, emote = null, emoteK = 0;
  if (sh.shot === 'anchor' && !sh.take) {
    const age = t - sh.t0;
    if (age < 0.16) squash = Math.min(squash == null ? 1 : squash, 0.06 + 0.94 * (age / 0.16));
    pop = age < 0.16 ? 1 - 0.1 * Math.sin((age / 0.16) * Math.PI)
      : age < 0.4 ? 1 + 0.07 * Math.sin(((age - 0.16) / 0.24) * Math.PI) * (1 - (age - 0.16) / 0.24) : 1;
    emote = EMOTES[plan.tone] || EMOTES.default;
    emoteK = seg(age, 0.05, 0.3) * (1 - seg(age, 1.4, 1.7));
  }
  if (sh.take) {
    emote = '!';
    emoteK = seg(t - sh.t0, 0.12, 0.3) * (1 - seg(t - sh.t0, 0.95, 1.25));
    const u = t - sh.t0;
    const pop = backOut(seg(u, 0.12, 0.42));
    squash = u < 0.12 ? 1 - ease(seg(u, 0, 0.1)) : lerp(0, 1.12, pop);
    open = u < 0.12 ? 0 : 1;
    grin = lerp(1, 1.28, pop) - 0.14 * ease(seg(u, 0.45, T.take));
    lean = -0.06 * pop;
    nod = -0.35 * pop;                                              // back and up
    tilt = -0.13 * pop + 0.03 * Math.sin(u * 24) * (1 - ease(seg(u, 0.2, 0.6)));
    hands = pop;                                                    // both up, beside the face
  }
  const look = lookAt(plan, t);
  return { mouth, open, squash, grin, lean, nod, tilt, gesture, hands, pop, emote, emoteK, key: look.key, dim: look.dim, hot: !!sh.decoded };
}

// ── the compositor ───────────────────────────────────────────────────────

function fmtNum(v, unit) {
  const a = Math.abs(v);
  const r = a >= 100 ? Math.round(v) : a >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
  return String(r) + unit;
}

let grainC = null, vigC = null, scratch = null;
const LUTS = new Map();
function surfaces() {
  if (grainC) return;
  // Full-resolution noise, built once. Grain has to be per pixel to read as
  // grain; it boils by being drawn at a different offset every tick.
  grainC = document.createElement('canvas'); grainC.width = W + 64; grainC.height = H + 64;
  const g = grainC.getContext('2d'), id = g.createImageData(grainC.width, grainC.height), d = id.data;
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < d.length; i += 4) { const v = 96 + rnd() * 64 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  g.putImageData(id, 0, 0);
  vigC = document.createElement('canvas'); vigC.width = W; vigC.height = H;
  const v = vigC.getContext('2d');
  const gr = v.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.78);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${SURFACE.vignette})`);
  v.fillStyle = gr; v.fillRect(0, 0, W, H);
  scratch = document.createElement('canvas');
}

// A posterised gradient map — the false colour of a risograph, from the reel's
// `treat`. Luminance picks a colour along `map`; `steps` posterises. Built
// once per look as a 256-entry table and applied to a copy of the plate.
function lutFor(treat) {
  const k = JSON.stringify(treat);
  if (LUTS.has(k)) return LUTS.get(k);
  const stops = treat.map.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    let l = i / 255;
    if (treat.steps > 1) l = Math.round(l * (treat.steps - 1)) / (treat.steps - 1);
    const f = l * (stops.length - 1), j = Math.min(stops.length - 2, Math.floor(f)), u = f - j;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = stops[j][c] + (stops[j + 1][c] - stops[j][c]) * u;
  }
  LUTS.set(k, lut);
  return lut;
}
function treated(cv, treat) {
  const lut = lutFor(treat);
  if (scratch.width !== cv.width || scratch.height !== cv.height) { scratch.width = cv.width; scratch.height = cv.height; }
  const x = scratch.getContext('2d', { willReadFrequently: true });
  x.drawImage(cv, 0, 0);
  const im = x.getImageData(0, 0, cv.width, cv.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) | 0;
    d[i] = lut[l * 3]; d[i + 1] = lut[l * 3 + 1]; d[i + 2] = lut[l * 3 + 2];
  }
  x.putImageData(im, 0, 0);
  return scratch;
}

// Word wrap that also works for Japanese: a "word" wider than the column is
// broken by character.
export function wrap(ctx, text, maxWidth) {
  const out = [];
  let line = '';
  const push = () => { if (line) out.push(line); line = ''; };
  for (const word of String(text).split(' ')) {
    if (ctx.measureText(word).width > maxWidth) {
      push();
      let run = '';
      for (const ch of word) {
        if (ctx.measureText(run + ch).width > maxWidth) { out.push(run); run = ch; }
        else run += ch;
      }
      line = run;
      continue;
    }
    const trial = line ? line + ' ' + word : word;
    if (ctx.measureText(trial).width > maxWidth) { push(); line = word; }
    else line = trial;
  }
  push();
  return out;
}

// Where a canvas lands in the top band: an INTEGER scale when it is pixel art
// (anything drawn at 160 px or under), centred. A non-integer scale on a 128
// px panel is uneven pixels, which is the one thing this renderer exists to
// avoid; the reference's slow push-in is refused for the same reason and the
// picture moves by roll and flicker instead.
function placement(cv, band) {
  if (!cv || !cv.width || !cv.height) return null;
  const pixel = cv.width <= 160;
  let s = Math.min((W * 0.86) / cv.width, (band * 0.92) / cv.height);
  if (pixel) s = Math.max(1, Math.floor(s));
  const dw = Math.round(cv.width * s), dh = Math.round(cv.height * s);
  return { x: Math.round((W - dw) / 2), y: Math.round((band - dh) / 2), w: dw, h: dh, pixel };
}
function blit(ctx, cv, box, dy = 0) {
  ctx.imageSmoothingEnabled = !box.pixel;
  ctx.drawImage(cv, box.x, box.y + dy, box.w, box.h);
}

function setFont(ctx, size, weight = 400) { ctx.font = `${weight} ${Math.round(size)}px ${MONO}`; }

/**
 * Paint frame `t` of the plan. `shots` maps a shot name to the canvas that
 * shows it right now: { broll, anchor, graphic }.
 */
export function paintFilm(ctx, plan, t, shots) {
  surfaces();
  const T = TIMING, cur = shotAt(plan, t), look = lookAt(plan, t);
  const decoded = !!cur.decoded;
  const key = look.key, dim = look.dim;

  // the ground carries the look too: never pure void under a coloured shot
  ctx.fillStyle = mix(PAL.VOID, key, 0.11); ctx.fillRect(0, 0, W, H);

  if (cur.shot === 'card') { paintCard(ctx, plan, t); return; }

  // the reveal's shake: four frames at 24 Hz
  ctx.save();
  // the graphic landing in its frame shakes the set, briefly
  if (cur.shot === 'graphic' && !cur.decoded && cur.t0 > 0) {
    const land = cur.t0 + T.slam * 0.62, a = 9 * (1 - seg(t, land, land + 0.12));
    if (t >= land && a > 0.5) { const f = Math.floor(t * 30); ctx.translate((hash(f * 1.3) - 0.5) * 2 * a, (hash(f * 2.9 + 4) - 0.5) * 2 * a); }
  }
  if (t >= plan.reveal && t < plan.reveal + T.shake) {
    const f = Math.floor(t * 24), a = 12 * (1 - seg(t, plan.reveal, plan.reveal + T.shake));
    ctx.translate((hash(f * 1.7) - 0.5) * 2 * a, (hash(f * 2.3 + 9) - 0.5) * 2 * a);
  }

  // ── the picture ──
  const band = H * 0.56;      // ×6 for a 128 px panel: the picture IS the frame
  const cvRaw = shots[cur.shot] || shots.broll;
  // a gradient map re-hues footage and the broadcast graphic; never Toko (the
  // brand's magenta is not a look) and never the decoded panel (amber is a fact)
  const mappable = cur.shot !== 'anchor' && !cur.decoded;
  const cv = look.treat && mappable && cvRaw ? treated(cvRaw, look.treat) : cvRaw;
  // Toko is not a panel: he is drawn AT the frame's resolution, full bleed,
  // and the film's lower third sits on his desk front. The camera pushes in
  // slowly on every shot of him and crashes in on the take.
  const fullAnchor = cur.shot === 'anchor' && shots.anchorObj;
  if (fullAnchor) {
    const u = seg(t, cur.t0, cur.t1);
    let zoom = 1 + 0.07 * ease(u);
    if (cur.take) zoom = 1.05 + 0.15 * backOut(seg(t - cur.t0, 0.08, 0.34));
    const m = plan.meter, mv = t < plan.reveal ? m.before : lerp(m.before, m.after, easeOut(seg(t, plan.reveal + T.flash, plan.reveal + T.flash + 0.9)));
    shots.anchorObj.render(ctx, W, H, { zoom, toko3d: shots.toko3d || null, heat: plan.heat, meter: { value: mv, total: m.total, bump: t >= plan.reveal } });
    // the lower third's ground, so type never sits on a lit desk
    const sg = ctx.createLinearGradient(0, band - 40, 0, band + 260);
    sg.addColorStop(0, 'rgba(1,4,3,0)'); sg.addColorStop(1, 'rgba(1,4,3,0.78)');
    ctx.fillStyle = sg; ctx.fillRect(0, band - 40, W, H - band + 40);
  }
  const box = fullAnchor ? null : placement(cv, band);
  if (box) {
    // the V-hold roll: between broadcast shots the old picture rolls up and
    // the new one rolls in under it, the way a tube loses vertical hold
    const prev = shotBefore(plan, cur);
    // the frame is never void around a panel: the shot itself, blown up past
    // the edges, blurred to light and darkened, fills it — so a panel reads as
    // the brightest thing in a room lit by it rather than a stamp on black
    // (blurred SMALL and scaled up: a 42 px blur at 1080×1920 every frame is
    // most of a render's time, and the upscale's own smoothing does the rest)
    if (!ambC) { ambC = document.createElement('canvas'); ambC.width = W / 12; ambC.height = H / 12; }
    const ab = ambC.getContext('2d');
    ab.clearRect(0, 0, ambC.width, ambC.height);
    ab.filter = 'blur(6px) saturate(1.5) brightness(0.45)';
    const cs = Math.max(W / cv.width, H / cv.height) * 1.15 / 12;
    ab.imageSmoothingEnabled = true;
    ab.drawImage(cv, (ambC.width - cv.width * cs) / 2, (band / 12 - cv.height * cs) / 2 + (H - band) * 0.2 / 12, cv.width * cs, cv.height * cs);
    ab.filter = 'none';
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(ambC, 0, 0, W, H); ctx.restore();
    // THE GRAPHIC CARRIES ITS OWN CUT (PDoomVideo: the action carries you
    // across). Coming in, the panel falls into its frame from above and
    // lands with a squash; going out, it drops away under gravity over the
    // next shot. Everything else between broadcast shots still rolls.
    const slamming = cur.shot === 'graphic' && !cur.decoded && cur.t0 > 0 && t < cur.t0 + T.slam;
    if (slamming) {
      const k = seg(t, cur.t0, cur.t0 + T.slam), fall = seg(k, 0, 0.62), land = seg(k, 0.62, 1);
      const dy = (1 - easeIn(fall)) * -(box.y + box.h + 60);
      const sy = fall < 1 ? 1.06 : 1 - 0.1 * Math.sin(land * Math.PI) * (1 - land);
      ctx.save();
      ctx.translate(box.x + box.w / 2, box.y + box.h + dy);
      ctx.scale(2 - sy, sy);
      ctx.translate(-(box.x + box.w / 2), -(box.y + box.h));
      blit(ctx, cv, box);
      ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    const rolling = !slamming && prev && prev.shot !== 'anchor' && prev.shot !== 'graphic' && !cur.decoded && cur.t0 > 0 && t < cur.t0 + T.roll && shots[prev.shot];
    if (rolling) {
      const k = ease(seg(t, cur.t0, cur.t0 + T.roll));
      const pcv = shots[prev.shot], pbox = placement(pcv, band);
      if (pbox) { blit(ctx, pcv, { ...pbox, x: box.x, y: box.y, w: box.w, h: box.h }, -k * box.h); }
      blit(ctx, cv, box, (1 - k) * box.h);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(box.x, box.y + (1 - k) * box.h - 3, box.w, 6);
    } else if (!slamming) blit(ctx, cv, box);
    // a scanline sweep across the glass — the set's own motion
    const rollY = box.y + ((t / T.sweep) % 1) * (box.h + 120) - 60;
    const rg = ctx.createLinearGradient(0, rollY - 40, 0, rollY + 40);
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.07)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(box.x, rollY - 40, box.w, 80);
    ctx.restore();

    // the housing, and corner ticks that slide in on every cut
    ctx.fillStyle = dim;
    ctx.fillRect(box.x - 8, box.y - 8, box.w + 16, 6); ctx.fillRect(box.x - 8, box.y + box.h + 2, box.w + 16, 6);
    ctx.fillRect(box.x - 8, box.y - 8, 6, box.h + 16); ctx.fillRect(box.x + box.w + 2, box.y - 8, 6, box.h + 16);
    const slide = (1 - backOut(seg(t, cur.t0, cur.t0 + 0.3))) * 46;
    ctx.fillStyle = key;
    const tk = 30;
    for (const [cx, cy, sx, sy] of [[box.x - 8, box.y - 8, 1, 1], [box.x + box.w + 8, box.y - 8, -1, 1], [box.x - 8, box.y + box.h + 8, 1, -1], [box.x + box.w + 8, box.y + box.h + 8, -1, -1]]) {
      const ox = -sx * slide, oy = -sy * slide;
      ctx.fillRect(cx + ox, cy + oy - (sy < 0 ? 6 : 0), tk * sx, 6);
      ctx.fillRect(cx + ox - (sx < 0 ? 6 : 0), cy + oy, 6, tk * sy);
    }

    // the DECODE stamp: a comic sfx letter slammed over the picture on the
    // reveal, pops on backOut, wobbles, and is gone before the take
    const st = t - (plan.reveal + T.flash + 0.05);
    if (st >= 0 && st < 1.05) {
      const pop = backOut(seg(st, 0, 0.25)), out = 1 - ease(seg(st, 0.8, 1.05));
      ctx.save();
      ctx.translate(box.x + box.w * 0.5, box.y + box.h * 0.78);
      ctx.rotate(-0.10 + Math.sin(st * 22) * 0.03 * (1 - ease(seg(st, 0, 0.6))));
      ctx.scale(pop, pop); ctx.globalAlpha = out;
      setFont(ctx, TYPE.stamp, 700); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = TYPE.stamp * 0.16; ctx.strokeStyle = PAL.INK;
      ctx.strokeText('DECODE', 0, 0);
      ctx.fillStyle = PAL.AMBER_HOT; ctx.fillText('DECODE', 0, 0);
      ctx.restore();
      ctx.textAlign = 'left';
    }
  }
  dropOut(ctx, plan, t, cur, shots, band);
  ctx.restore();

  // the lower third's ground, so type never sits on a lit desk or a glow
  if (!fullAnchor) {
    const sg = ctx.createLinearGradient(0, band, 0, band + 200);
    sg.addColorStop(0, 'rgba(1,4,3,0)'); sg.addColorStop(1, 'rgba(1,4,3,0.7)');
    ctx.fillStyle = sg; ctx.fillRect(0, band, W, H - band);
  }

  // ── the lower third ──
  const x = 54, maxW = W - 108;
  const footerY = H - 96;
  let y = band + 40;
  ctx.textBaseline = 'top';

  // the tag line; the dot pulses like the anchor's REC
  setFont(ctx, TYPE.tag);
  ctx.fillStyle = '#ff6b6b';
  ctx.globalAlpha = (t % 1.6) < 1.0 ? 1 : 0.35;
  ctx.fillText('●', x, y);
  ctx.globalAlpha = 1;
  ctx.fillText('  ' + plan.onAir, x, y);
  const onW = ctx.measureText('  ' + plan.onAir + '  ').width;
  ctx.fillStyle = key;
  ctx.fillText(`${plan.tag.index}/${plan.tag.total} · ${plan.tag.slug} · ${plan.tag.date}`, x + onW, y);
  y += TYPE.tag * 1.9;

  // the headline as word runs, each popping in larger than the last, and
  // inside a run the words arrive one after another
  const runsDim = decoded ? 0.5 : 1;
  plan.runs.forEach((r, i) => {
    if (t < r.t) return;
    const size = TYPE.run0 * Math.pow(TYPE.runStep, i);
    setFont(ctx, size, 700);
    const lines = wrap(ctx, r.text, maxW);
    const sp = ctx.measureText(' ').width;
    let wi = 0;
    ctx.fillStyle = decoded ? PAL.GREEN_DIM : mix(PAL.GREEN, key, 0.35);
    lines.forEach((l, li) => {
      let wx = x;
      for (const word of l.split(' ')) {
        const k = backOut(seg(t, r.t + wi * T.wordStagger, r.t + wi * T.wordStagger + T.runPop));
        const ww = ctx.measureText(word).width;
        if (k > 0.01) {
          ctx.save(); ctx.globalAlpha = runsDim * Math.min(1, k * 1.4);
          ctx.translate(wx + ww / 2, y + li * size * TYPE.runLine + size / 2); ctx.scale(lerp(0.7, 1, k), lerp(0.7, 1, k));
          ctx.fillText(word, -ww / 2, -size / 2);
          ctx.restore();
        }
        wx += ww + sp; wi++;
      }
    });
    y += lines.length * size * TYPE.runLine + size * 0.18;
  });

  // ── the payoff word and the counter, in the hold ──
  if (decoded && plan.payoff.text && t >= plan.payoff.t0) {
    const k = backOut(seg(t, plan.payoff.t0, plan.payoff.t0 + 0.4));
    const grow = 1 + T.payoffGrow * ease(seg(t, plan.holdStart, plan.holdEnd));
    let size = TYPE.payoff0 * grow;
    setFont(ctx, size, 700);
    const txt = plan.payoff.text;
    const tw = ctx.measureText(txt).width;
    if (tw > maxW * 0.62) { size *= (maxW * 0.62) / tw; setFont(ctx, size, 700); }
    y += 10;
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.2);
    ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = mix(PAL.AMBER_HOT, key, 0.25); ctx.fillText(txt, 0, 0);
    ctx.restore();
    const ph = Math.round(size * 1.05);
    if (plan.counter && t >= plan.counter.t0) {
      const c = plan.counter, kk = easeOut(seg(t, c.t0, c.t0 + T.counter));
      const v = lerp(c.claim, c.plain, kk);
      const land = c.t0 + T.counter;
      const bump = t >= land ? 1 + 0.16 * (1 - ease(seg(t, land, land + 0.22))) : 1;
      ctx.save();
      setFont(ctx, TYPE.counter, 700);
      ctx.textAlign = 'right';
      ctx.translate(W - x, y + (ph - TYPE.counter) / 2 + TYPE.counter / 2); ctx.scale(bump, bump);
      ctx.fillStyle = kk < 1 ? PAL.AMBER : PAL.AMBER_HOT;
      ctx.fillText(fmtNum(v, c.unit), 0, -TYPE.counter / 2);
      ctx.restore();
      // the claim, struck, small, above it
      setFont(ctx, TYPE.counter * 0.5, 400);
      ctx.textAlign = 'right';
      ctx.fillStyle = PAL.GREEN_DIM;
      const cl = fmtNum(c.claim, c.unit);
      ctx.fillText(cl, W - x, y - TYPE.counter * 0.58);
      const cw = ctx.measureText(cl).width;
      ctx.fillStyle = PAL.AMBER; ctx.fillRect(W - x - cw, y - TYPE.counter * 0.58 + TYPE.counter * 0.26, cw * ease(seg(t, c.t0, c.t0 + T.strike)), 3);
      ctx.textAlign = 'left';
    }
    y += ph + 8;
  }

  // ── the caption: one at a time, sized to fit what is left ──
  const cap = plan.captions.find(c => t >= c.t0 && t < c.t1);
  if (cap) {
    const room = footerY - 28 - y;
    paintCaption(ctx, cap, t, x, y, maxW, room, key);
  }

  // footer
  setFont(ctx, TYPE.footer);
  ctx.fillStyle = '#5f8a74';
  ctx.fillText(plan.fiction, x, footerY);

  // clay is matte: bloom would glow it back into gloss, so a clay Toko's
  // shots take a third of it
  bloom(ctx, fullAnchor && shots.toko3d && shots.toko3d.style === 'clay' ? 0.35 : 1);
  surface(ctx, plan, t);

  // the tube switching off: the whole picture collapses to a line, then a dot
  const ct = t - (plan.holdEnd - T.collapse);
  if (ct >= 0) collapse(ctx, seg(ct, 0, T.collapse));
}

// The graphic leaving: the panel of the shot before falls out of its frame,
// turning as it goes, over whatever the new shot is.
function dropOut(ctx, plan, t, cur, shots, band) {
  const prev = shotBefore(plan, cur);
  if (!prev || prev.shot !== 'graphic' || prev.decoded || t >= cur.t0 + TIMING.drop) return;
  const pcv = shots.graphic, box = placement(pcv, band);
  if (!box) return;
  const age = t - cur.t0, g = H * 5.2, side = hash(Math.floor(cur.t0 * 10)) < 0.5 ? -1 : 1;
  ctx.save();
  ctx.translate(box.x + box.w / 2 + side * age * 220, box.y + box.h / 2 + 0.5 * g * age * age - 30 * age);
  ctx.rotate(side * age * 1.4);
  ctx.translate(-(box.x + box.w / 2), -(box.y + box.h / 2));
  blit(ctx, pcv, box);
  ctx.restore();
}

// Bloom: what is bright spills light. The frame is taken down to a quarter,
// crushed so only its highlights survive, blurred, and screened back over
// itself — the face, the ring, the phosphor type and the amber all glow, and
// the dark stays dark. The base is never blurred, so the pixel art under it
// keeps every hard edge.
let bloomC = null, ambC = null;
function bloom(ctx, amount = 1) {
  const q = 4, bw = W / q, bh = H / q;
  if (!bloomC) { bloomC = document.createElement('canvas'); bloomC.width = bw; bloomC.height = bh; }
  const b = bloomC.getContext('2d');
  b.clearRect(0, 0, bw, bh);
  b.filter = 'brightness(0.72) contrast(2.6) blur(5px)';
  b.drawImage(ctx.canvas, 0, 0, bw, bh);
  b.filter = 'none';
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = SURFACE.bloom * amount;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(bloomC, 0, 0, W, H);
  ctx.restore();
}

function collapse(ctx, k) {
  if (scratch.width !== W || scratch.height !== H) { scratch.width = W; scratch.height = H; }
  const x = scratch.getContext('2d', { willReadFrequently: true });
  x.drawImage(ctx.canvas, 0, 0);
  ctx.fillStyle = PAL.INK; ctx.fillRect(0, 0, W, H);
  const sy = Math.max(0.002, 1 - ease(seg(k, 0, 0.7)));
  const sx = 1 - ease(seg(k, 0.65, 1));
  const h = Math.max(3, H * sy), w = Math.max(6, W * sx);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(scratch, (W - w) / 2, (H - h) / 2, w, h);
  // the bright line as the raster dies
  ctx.globalAlpha = ease(seg(k, 0.4, 0.75)) * (1 - ease(seg(k, 0.9, 1)));
  ctx.fillStyle = PAL.GREEN_HOT; ctx.fillRect((W - w) / 2, H / 2 - 2, w, 4);
  ctx.restore();
}

function paintCaption(ctx, cap, t, x, y, maxW, room, key) {
  const T = TIMING;
  const inK = easeOut(seg(t, cap.t0, cap.t0 + 0.22)), outK = 1 - ease(seg(t, cap.t1 - 0.18, cap.t1));
  ctx.save(); ctx.globalAlpha = Math.min(inK, outK);
  const scrimTop = y - 24;
  const g = ctx.createLinearGradient(0, scrimTop - 80, 0, H);
  const sc = mix('#030a08', key, 0.12), [sr, sg, sb] = [1, 3, 5].map(i => parseInt(sc.slice(i, i + 2), 16));
  g.addColorStop(0, `rgba(${sr},${sg},${sb},0)`); g.addColorStop(0.3, `rgba(${sr},${sg},${sb},.86)`); g.addColorStop(1, `rgba(${sr},${sg},${sb},.97)`);
  ctx.fillStyle = g; ctx.fillRect(0, scrimTop - 80, W, H - scrimTop + 80);

  if (cap.kind === 'read') {
    setFont(ctx, TYPE.caption);
    let lines = wrap(ctx, cap.text, maxW - 48);
    let size = TYPE.caption;
    while (lines.length * size * 1.32 > room && size > 22) { size -= 2; setFont(ctx, size); lines = wrap(ctx, cap.text, maxW - 48); }
    ctx.fillStyle = key; ctx.fillText('>', x, y);
    ctx.fillStyle = mix('#b7e8cd', key, 0.2);
    lines.forEach((l, i) => ctx.fillText(l, x + 48, y + i * size * 1.32));
  } else if (cap.kind === 'pair') {
    // the struck wording, then the plain reading TYPING ON under it
    setFont(ctx, TYPE.caption, 700);
    const sLines = wrap(ctx, cap.spun, maxW - 48);
    ctx.fillStyle = '#b7e8cd';
    ctx.fillText('>', x, y);
    sLines.forEach((l, i) => ctx.fillText(l, x + 48, y + i * TYPE.caption * 1.32));
    const sk = ease(seg(t, cap.t0 + 0.08, cap.t0 + 0.08 + T.strike));
    ctx.fillStyle = PAL.AMBER;
    sLines.forEach((l, i) => {
      const w = ctx.measureText(l).width;
      ctx.fillRect(x + 48, y + i * TYPE.caption * 1.32 + TYPE.caption * 0.55, w * sk, 4);
    });
    let yy = y + sLines.length * TYPE.caption * 1.32 + 10;
    const typed = Math.floor(Math.max(0, t - (cap.t0 + 0.08 + T.strike * 0.6)) / T.typeChar);
    const shown = cap.plain.slice(0, typed);
    setFont(ctx, TYPE.plain, 400);
    ctx.fillStyle = PAL.AMBER_HOT;
    ctx.fillText('→', x, yy);
    const pLines = wrap(ctx, shown, maxW - 48);
    pLines.forEach((l, i) => ctx.fillText(l, x + 48, yy + i * TYPE.plain * 1.32));
    if (typed < cap.plain.length && Math.floor(t * 4) % 2 === 0) {
      const last = pLines[pLines.length - 1] || '';
      ctx.fillRect(x + 48 + ctx.measureText(last).width + 4, yy + (pLines.length - 1) * TYPE.plain * 1.32 + 4, 14, TYPE.plain * 0.9);
    }
  } else if (cap.kind === 'tell') {
    setFont(ctx, TYPE.caption, 400);
    const lines = wrap(ctx, cap.text, maxW - 48);
    ctx.fillStyle = key; ctx.fillText('?', x, y);
    ctx.fillStyle = mix(PAL.AMBER, key, 0.5);
    lines.forEach((l, i) => ctx.fillText(l, x + 48, y + i * TYPE.caption * 1.32));
  }
  ctx.restore();
}

// The sign-off: the station's own card. Not a planet limb — the waveform this
// codec has carried on every post since v1, going flat. It opens from the dot
// the tube collapsed to.
function paintCard(ctx, plan, t) {
  const k = seg(t, plan.card.t0, plan.card.t1);
  ctx.fillStyle = PAL.VOID; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const a = Math.min(1, easeOut(seg(t, plan.card.t0, plan.card.t0 + 0.3)) * 1.2);
  const bloom = 1 - ease(seg(t, plan.card.t0, plan.card.t0 + 0.35));
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(W / 2, H / 2); ctx.scale(lerp(0.2, 1, 1 - bloom), lerp(0.02, 1, 1 - bloom)); ctx.translate(-W / 2, -H / 2);
  setFont(ctx, 40, 500); ctx.fillStyle = PAL.GREEN; ctx.letterSpacing = '6px';
  ctx.fillText('RADIO FREE HELSINKI', W / 2, H * 0.42);
  ctx.letterSpacing = '0px';
  if (plan.freq) { setFont(ctx, 128, 700); ctx.fillStyle = PAL.GREEN_HOT; ctx.fillText(plan.freq, W / 2, H * 0.50); }
  // the waveform, flatlining
  const n = 31, bw = 18, x0 = W / 2 - (n * bw) / 2, yy = H * 0.585, amp = 60 * (1 - ease(seg(k, 0.35, 0.95)));
  ctx.fillStyle = PAL.GREEN_DIM;
  for (let i = 0; i < n; i++) {
    const h = 4 + amp * (0.3 + 0.7 * hash(i * 3.1 + Math.floor(t * 12)));
    ctx.fillRect(x0 + i * bw + 3, yy - h / 2, bw - 6, h);
  }
  setFont(ctx, TYPE.footer + 2); ctx.fillStyle = '#5f8a74';
  ctx.fillText(plan.fiction, W / 2, H * 0.66);
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  surface(ctx, plan, t);
}

// Grain that boils, an exposure flicker, a vignette, and the cut flash.
function surface(ctx, plan, t) {
  const T = TIMING;
  const tick = Math.floor(t * T.boilHz);
  const ox = Math.floor(hash(tick * 1.3) * 64), oy = Math.floor(hash(tick * 2.7 + 5) * 64);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = SURFACE.grain;
  ctx.drawImage(grainC, -ox, -oy);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.drawImage(vigC, 0, 0);
  const fl = (hash(tick * 7.7 + 1) - 0.5) * 2 * SURFACE.flicker;
  ctx.fillStyle = fl > 0 ? `rgba(255,255,255,${fl})` : `rgba(0,0,0,${-fl})`;
  ctx.fillRect(0, 0, W, H);
  // the cut flash: every cut, and the reveal hardest
  let flash = 0;
  for (const c of plan.cuts) if (t >= c && t < c + T.flash) flash = Math.max(flash, 1 - (t - c) / T.flash);
  if (t >= plan.reveal && t < plan.reveal + T.flash) flash = 1;
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${SURFACE.cutFlash * flash})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
