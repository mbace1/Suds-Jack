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
//                            shots and when they cut, the headline broken into
//                            word runs, one caption at a time with a reading
//                            budget, the reveal, the payoff word, the figure
//                            counter, the sign-off. No DOM, no canvas, so
//                            test/film.mjs can assert it in bare node.
//   paintFilm(ctx, plan, t, shots) — the compositor. Every frame is a pure
//                            function of t: no state survives between frames,
//                            which is what lets a frame be re-rendered alone
//                            and a contact sheet be pulled at any set of times.
//
// What was TAKEN from the references, and what was refused, is the whole point
// of MOTION.md; the short version is that the timing, the typography motion,
// the transitions and the surface are borrowed, and the drawing medium is not.
// This station is a 128×152 pixel panel behind curved glass, and stays one.

import { parseLine } from './wire.js?v=65';
import { readFigures } from './visuals.js?v=65';
import { PAL } from './palette.js?v=65';

export const W = 1080, H = 1920;
export const MONO = '"IBM Plex Mono", "SF Mono", Menlo, Consolas, "IPAGothic", monospace';

// ── the numbers (MOTION.md carries where each came from) ────────────────
export const TIMING = {
  fps: 30,
  open: 2.0,           // cold open on footage, the slug and the first run arrive
  breath: 0.8,         // the silence before the payoff
  flash: 0.10,         // the cut flash, three frames at 30
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
  payoffLead: 0.35,    // the reveal's order: flash, amber, the payoff word, then the first strike
  payoffGrow: 0.30,    // the technique word grows this much across the hold
  runPop: 0.32,        // a word run pops in over this (backOut)
  boilHz: 12,          // grain re-seeds on twos
  roll: 5.2,           // seconds per scanline roll across the picture
};

export const SURFACE = { grain: 0.16, flicker: 0.035, vignette: 0.32, cutFlash: 0.34 };

export const TYPE = {
  tag: 34, run0: 52, runStep: 1.12, runMax: 4, runLine: 1.16,
  payoff0: 96, caption: 36, plain: 34, counter: 64, footer: 26,
};

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
const backOut = (x) => { x = clamp(x); const s = 1.9; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const hash = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ── the plan ─────────────────────────────────────────────────────────────

// The headline as WORD RUNS: the launch film's phrases each start larger than
// the last. A headline has to stay readable whole, so runs accumulate as lines
// rather than replacing each other, and the sizes are capped at four steps.
export function splitRuns(head, max = TYPE.runMax) {
  const parts = String(head || '').split(/\s*(?:[,;:]|—|–|\s-\s)\s*/).map(s => s.trim()).filter(Boolean);
  const runs = [];
  for (const p of parts) {
    const words = p.split(/\s+/);
    if (words.length > 7) {
      const cut = Math.ceil(words.length / 2);
      runs.push(words.slice(0, cut).join(' '), words.slice(cut).join(' '));
    } else runs.push(p);
  }
  // CJK headlines have no spaces to split on: break at the punctuation Japanese
  // copy actually uses, then in halves when a run is still long
  if (runs.length === 1 && runs[0].length > 18 && !/\s/.test(runs[0])) {
    const ja = runs[0].split(/(?<=[。、！？])/).filter(Boolean);
    runs.length = 0;
    for (const p of ja) {
      if (p.length <= 22) { runs.push(p); continue; }
      // break after the particle nearest the middle, never inside a word
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
function sentenceAround(text, at, len) {
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
    const s = sentenceAround(text, Math.max(0, firstSpan), text.length);
    // where the struck spans fall inside the sentence, for the strike later
    const spans = [];
    let pos = 0;
    for (const r of runs) {
      if (r.plain !== null) {
        const a = pos - s.start, b = a + r.text.length;
        if (a >= 0 && b <= s.text.length) spans.push({ a, b, plain: r.plain, spun: r.text });
      }
      pos += r.text.length;
    }
    reads.push({ para: li, text: s.text, spans });
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
  const fixed = T.open + T.breath + T.flash + T.card + (reads.length + pairs.length + (tellB ? 1 : 0)) * T.gap;
  const soft = readB.reduce((a, b) => a + b, 0) + pairB.reduce((a, b) => a + b, 0) + tellB;
  let scale = 1;
  if (opts.seconds && opts.seconds > 0) {
    scale = clamp((opts.seconds - fixed) / Math.max(0.001, soft), T.minScale, 1.6);
  }

  // ── lay the timeline ──
  const shots = [], captions = [];
  let t = 0;
  const push = (shot, len, extra = {}) => { shots.push({ t0: t, t1: t + len, shot, ...extra }); t += len; };

  push('broll', T.open);
  const runAt = [T.open * 0.45];                       // when each headline run pops
  const kinds = ['anchor', 'graphic', 'broll'];
  reads.forEach((r, i) => {
    const len = readB[i] * scale + T.gap;
    if (i < runs.length - 1) runAt.push(t);
    captions.push({ kind: 'read', t0: t + 0.12, t1: t + len - T.gap, text: r.text, spans: r.spans, para: r.para });
    push(kinds[i % kinds.length], len);
  });
  // any headline run not yet placed pops on the breath
  while (runAt.length < runs.length) runAt.push(t + 0.1);
  push('broll', T.breath);

  const reveal = t;
  const holdStart = t + T.flash;
  // the payoff word lands first; the first strike follows it
  t = holdStart + T.payoffLead;
  pairs.forEach((p, i) => {
    const len = pairB[i] * scale;
    captions.push({ kind: 'pair', t0: t, t1: t + len, spun: p.spun, plain: p.plain, para: p.para });
    t += len + T.gap;
  });
  if (tellB) {
    const len = tellB * scale;
    captions.push({ kind: 'tell', t0: t, t1: t + len, text: copy.tell });
    t += len + T.gap;
  }
  const holdEnd = t;
  shots.push({ t0: reveal, t1: holdEnd, shot: 'graphic', decoded: true });
  t = holdEnd;
  push('card', T.card);
  const S = t;

  return {
    S, fps, scale, shots, captions, reveal, holdStart, holdEnd,
    runs: runs.map((text, i) => ({ text, t: runAt[i] })),
    payoff: { text: copy.technique || '', t0: holdStart + 0.15 },
    counter: fig ? { claim: fig.claim, plain: fig.plain, unit: fig.unit || '', t0: holdStart + T.counterDelay } : null,
    card: { t0: holdEnd, t1: S },
    tag: { index: String(opts.index || 1).padStart(2, '0'), total: opts.total || 1, slug: copy.slug || '', date: opts.date || '' },
    onAir: opts.onAir || 'ON AIR',
    fiction: opts.fiction || '',
    freq: opts.freq || '',
    accent: opts.accent || PAL.GREEN,
    cuts: [...shots.map(s => s.t0).filter(x => x > 0)],
    // every shot beginning, for the flash; plus the reveal itself
  };
}

export function shotAt(plan, t) {
  let cur = plan.shots[0];
  for (const s of plan.shots) if (t >= s.t0) cur = s;
  return cur;
}

// ── the compositor ───────────────────────────────────────────────────────

function fmtNum(v, unit) {
  const a = Math.abs(v);
  const r = a >= 100 ? Math.round(v) : a >= 10 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
  return String(r) + unit;
}

let grainC = null, vigC = null;
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

// The picture: whichever canvas the shot is on, at an INTEGER scale when it is
// pixel art (anything drawn at 160 px or under), centred in the top band. A
// non-integer scale on a 128 px panel is uneven pixels, which is the one thing
// this renderer exists to avoid; the reference's slow push-in is refused for
// the same reason and the picture moves by roll and flicker instead.
function drawPicture(ctx, cv, band, k = 1) {
  if (!cv || !cv.width || !cv.height) return null;
  const pixel = cv.width <= 160;
  let s = Math.min((W * 0.86) / cv.width, (band * 0.92) / cv.height);
  if (pixel) s = Math.max(1, Math.floor(s));
  const dw = Math.round(cv.width * s * k), dh = Math.round(cv.height * s * k);
  const x = Math.round((W - dw) / 2), y = Math.round((band - dh) / 2);
  ctx.imageSmoothingEnabled = !pixel;
  ctx.drawImage(cv, x, y, dw, dh);
  return { x, y, w: dw, h: dh };
}

function setFont(ctx, size, weight = 400) { ctx.font = `${weight} ${Math.round(size)}px ${MONO}`; }

/**
 * Paint frame `t` of the plan. `shots` maps a shot name to the canvas that
 * shows it right now: { broll, anchor, graphic }.
 */
export function paintFilm(ctx, plan, t, shots) {
  surfaces();
  const T = TIMING, cur = shotAt(plan, t);
  const decoded = !!cur.decoded;
  const d = decoded ? ease(seg(t, plan.reveal, plan.reveal + 0.5)) : 0;
  const key = decoded ? PAL.AMBER : plan.accent;
  const dim = decoded ? PAL.AMBER_DIM : PAL.GREEN_DIM;

  ctx.fillStyle = PAL.VOID; ctx.fillRect(0, 0, W, H);

  if (cur.shot === 'card') { paintCard(ctx, plan, t); return; }

  // ── the picture ──
  const band = H * 0.56;      // ×6 for a 128 px panel: the picture IS the frame
  const cv = shots[cur.shot] || shots.broll;
  const box = drawPicture(ctx, cv, band);
  if (box) {
    // the housing: the picture arrives inside the set, not printed on the page
    ctx.fillStyle = dim; ctx.fillRect(box.x - 8, box.y - 8, box.w + 16, 6); ctx.fillRect(box.x - 8, box.y + box.h + 2, box.w + 16, 6);
    ctx.fillRect(box.x - 8, box.y - 8, 6, box.h + 16); ctx.fillRect(box.x + box.w + 2, box.y - 8, 6, box.h + 16);
    ctx.fillStyle = key;
    const tk = 26;
    for (const [cx, cy, sx, sy] of [[box.x - 8, box.y - 8, 1, 1], [box.x + box.w + 8, box.y - 8, -1, 1], [box.x - 8, box.y + box.h + 8, 1, -1], [box.x + box.w + 8, box.y + box.h + 8, -1, -1]]) {
      ctx.fillRect(cx - (sx < 0 ? 0 : 0), cy - (sy < 0 ? 6 : 0), tk * sx, 6);
      ctx.fillRect(cx - (sx < 0 ? 6 : 0), cy, 6, tk * sy);
    }
    // a scanline roll across the glass — the set's own motion
    const rollY = box.y + ((t / T.roll) % 1) * (box.h + 120) - 60;
    const rg = ctx.createLinearGradient(0, rollY - 40, 0, rollY + 40);
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.07)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
    ctx.fillStyle = rg; ctx.fillRect(box.x, rollY - 40, box.w, 80); ctx.restore();
  }

  // ── the lower third ──
  const x = 54, maxW = W - 108;
  const footerY = H - 96;
  let y = band + 40;
  ctx.textBaseline = 'top';

  // the tag line
  setFont(ctx, TYPE.tag);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillText('● ' + plan.onAir, x, y);
  const onW = ctx.measureText('● ' + plan.onAir + '  ').width;
  ctx.fillStyle = key;
  ctx.fillText(`${plan.tag.index}/${plan.tag.total} · ${plan.tag.slug} · ${plan.tag.date}`, x + onW, y);
  y += TYPE.tag * 1.9;

  // the headline as word runs, each popping in larger than the last
  const runsDim = decoded ? 0.5 : 1;
  plan.runs.forEach((r, i) => {
    if (t < r.t) return;
    const k = backOut(seg(t, r.t, r.t + T.runPop));
    const size = TYPE.run0 * Math.pow(TYPE.runStep, i);
    setFont(ctx, size, 700);
    const lines = wrap(ctx, r.text, maxW);
    ctx.save(); ctx.globalAlpha = runsDim * Math.min(1, k * 1.4);
    ctx.fillStyle = decoded ? PAL.GREEN_DIM : PAL.GREEN;
    ctx.translate(x, y); ctx.scale(lerp(0.92, 1, k), lerp(0.92, 1, k));
    lines.forEach((l, li) => ctx.fillText(l, 0, li * size * TYPE.runLine));
    ctx.restore();
    y += lines.length * size * TYPE.runLine + size * 0.18;
  });

  // ── the payoff word and the counter, in the hold ──
  if (decoded && plan.payoff.text && t >= plan.payoff.t0) {
    const k = backOut(seg(t, plan.payoff.t0, plan.payoff.t0 + 0.4));
    const grow = 1 + T.payoffGrow * ease(seg(t, plan.holdStart, plan.holdEnd));
    const size = TYPE.payoff0 * grow;
    setFont(ctx, size, 700);
    let txt = plan.payoff.text;
    while (ctx.measureText(txt).width > maxW && size > 40) { setFont(ctx, size * (maxW / ctx.measureText(txt).width), 700); break; }
    y += 10;
    ctx.save(); ctx.globalAlpha = Math.min(1, k * 1.2);
    ctx.translate(x, y); ctx.scale(k, k);
    ctx.fillStyle = PAL.AMBER_HOT; ctx.fillText(txt, 0, 0);
    ctx.restore();
    const ph = Math.round(size * 1.05);
    if (plan.counter && t >= plan.counter.t0) {
      const c = plan.counter, kk = easeOut(seg(t, c.t0, c.t0 + T.counter));
      const v = lerp(c.claim, c.plain, kk);
      setFont(ctx, TYPE.counter, 700);
      ctx.textAlign = 'right';
      ctx.fillStyle = kk < 1 ? PAL.AMBER : PAL.AMBER_HOT;
      ctx.fillText(fmtNum(v, c.unit), W - x, y + (ph - TYPE.counter) / 2);
      // the claim, struck, small, above it
      setFont(ctx, TYPE.counter * 0.5, 400);
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
    paintCaption(ctx, cap, t, x, y, maxW, room, d);
  }

  // footer
  setFont(ctx, TYPE.footer);
  ctx.fillStyle = '#5f8a74';
  ctx.fillText(plan.fiction, x, footerY);

  surface(ctx, plan, t);
}

function paintCaption(ctx, cap, t, x, y, maxW, room, d) {
  const T = TIMING;
  const inK = easeOut(seg(t, cap.t0, cap.t0 + 0.22)), outK = 1 - ease(seg(t, cap.t1 - 0.18, cap.t1));
  ctx.save(); ctx.globalAlpha = Math.min(inK, outK);
  const scrimTop = y - 24;
  const g = ctx.createLinearGradient(0, scrimTop - 80, 0, H);
  g.addColorStop(0, 'rgba(3,10,8,0)'); g.addColorStop(0.3, 'rgba(3,10,8,.86)'); g.addColorStop(1, 'rgba(3,10,8,.97)');
  ctx.fillStyle = g; ctx.fillRect(0, scrimTop - 80, W, H - scrimTop + 80);

  if (cap.kind === 'read') {
    setFont(ctx, TYPE.caption);
    let lines = wrap(ctx, cap.text, maxW - 48);
    let size = TYPE.caption;
    while (lines.length * size * 1.32 > room && size > 22) { size -= 2; setFont(ctx, size); lines = wrap(ctx, cap.text, maxW - 48); }
    ctx.fillStyle = PAL.GREEN_LO; ctx.fillText('>', x, y);
    ctx.fillStyle = '#b7e8cd';
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
    // the cursor, while typing
    if (typed < cap.plain.length && Math.floor(t * 4) % 2 === 0) {
      const last = pLines[pLines.length - 1] || '';
      ctx.fillRect(x + 48 + ctx.measureText(last).width + 4, yy + (pLines.length - 1) * TYPE.plain * 1.32 + 4, 14, TYPE.plain * 0.9);
    }
  } else if (cap.kind === 'tell') {
    setFont(ctx, TYPE.caption, 400);
    const lines = wrap(ctx, cap.text, maxW - 48);
    ctx.fillStyle = PAL.AMBER_DIM; ctx.fillText('?', x, y);
    ctx.fillStyle = PAL.AMBER;
    lines.forEach((l, i) => ctx.fillText(l, x + 48, y + i * TYPE.caption * 1.32));
  }
  ctx.restore();
}

// The sign-off: the station's own card. Not a planet limb — the waveform this
// codec has carried on every post since v1, going flat.
function paintCard(ctx, plan, t) {
  const k = seg(t, plan.card.t0, plan.card.t1);
  ctx.fillStyle = PAL.VOID; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const a = Math.min(1, easeOut(seg(t, plan.card.t0, plan.card.t0 + 0.25)) * 1.2);
  ctx.save(); ctx.globalAlpha = a;
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
  if (t >= plan.reveal && t < plan.reveal + T.flash) flash = 1 - (t - plan.reveal) / T.flash;
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${SURFACE.cutFlash * flash})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
