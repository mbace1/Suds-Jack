// THE CAPTION PIPELINE (PRODUCTION-STANDARD.md, "The text pipeline"). One module for every film drawn in a
// browser canvas: it reads the film's copy.json, times each line from reading speed, retimes the picture when
// a language needs longer, draws the house captions word by word, decides on its own when a scrim is needed,
// and reports everything a check needs (widths, boxes, reading time, safe zones, native reads).
//
//   import * as CAP from '../../pipeline/text/captions.js';
//   const copy = await CAP.loadCopy('copy.json');
//   const plan = CAP.plan(copy, lang, BEATS);      // BEATS: [[name, seconds], ...] in order, for the base cut
//   ... build the picture from plan.T (the retimed beats) ...
//   CAP.draw(ctx, plan, t, { busy });               // last thing drawn in a frame
//   window.__film.report = CAP.report(ctx, plan);
//
// Copy syntax, all languages: "/" breaks a line, [word] or [a few words] is the pop (amber, sprung).
// Japanese: a space marks a segment boundary for the word-by-word reveal and is never drawn.

export const RATE = { en: 20, fi: 17, ja: 6 };      // characters a second, on top of a 1 s base (house rule)
export const REVEAL = 2.2;                          // words come on at REVEAL × the reading rate…
export const LINE_PAUSE = 0.22;                     // …with this pause at each line break
export const TAIL = 0.8;                            // the last word stays at least this long
export const SAFE = { left: 140, right: 940, top: 150, bottom: 1630, rail: { x0: 930, y0: 980, y1: 1630 } };
export const WIDTH = 800;                           // no line wider than this
// Two sizes. HOUSE is the house caption exactly as libass draws the ASS style "Poppins ExtraBold 82" that every film
// before the pipeline used: libass scales a font so its Windows ascent + descent (1135 + 627 units) fill 82 px, so
// the em is 46.5 px and lines step 87 px (measured: "It invited five AI companies." inks 661 px wide either way).
// BIG is the creator-native size the Kill Switch pilot was built at (82 px em). copy.json picks: "captionSize".
export const STYLES = {
  house: { latin: { family: 'Poppins-800', size: 46.5, lead: 87, stroke: 14, lift: 17 }, ja: { family: 'NotoSansJP-800', size: 46, lead: 87, stroke: 14, lift: 17 } },
  big: { latin: { family: 'Poppins-800', size: 82, lead: 98, stroke: 14, lift: 30 }, ja: { family: 'NotoSansJP-800', size: 74, lead: 104, stroke: 14, lift: 28 } },
  // NOIR: the pulp narration box (Backup Mode, Toko Slomo): condensed caps, white on a black box with a hairline rule,
  // the pop in magenta; the film loads the two faces itself (Anton-400, NotoSerifJP-600)
  noir: { latin: { family: 'Anton-400', size: 64, lead: 80, stroke: 0, lift: 22, box: true, pop: '#f0027f' }, ja: { family: 'NotoSerifJP-600', size: 54, lead: 80, stroke: 0, lift: 20, box: true, pop: '#f0027f' } },
};
export const STYLE = STYLES.house;
export const BAND = { top: 240, low: 1180 };        // where a caption's first baseline sits, by placement
const POP = '#f2b83a';
export const SCRIM = 0.62;                          // the darkest a scrim gets, behind the busiest picture

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const spring = (k) => { k = Math.max(0, k); return 1 - Math.exp(-7 * k) * Math.cos(11 * k); };
const back = (k) => { k = clamp(k); const s = 1.7; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };

export async function loadFonts(base) {
  for (const [fam, file] of [['Poppins-800', 'Poppins-800.woff'], ['NotoSansJP-800', 'NotoSansJP-800.woff']]) {
    const f = new FontFace(fam, `url(${base}${file})`); document.fonts.add(await f.load());
  }
}
export async function loadCopy(url) { const r = await fetch(url); if (!r.ok) throw new Error('copy: ' + url + ' ' + r.status); return r.json(); }

/** "Its safety standard / asks for a [second]" → [[{w, pop}], ...] (lines of words) */
export function parse(text, lang) {
  let open = false;                                   // a pop can span words: "[sticky note]" lights both
  return text.split('/').map((ln) => ln.trim().split(/\s+/).filter(Boolean).map((w) => {
    if (w.includes('[')) open = true; const pop = open; if (w.includes(']')) open = false;
    return { w: w.replace(/[[\]]/g, ''), pop };
  }));
}
/** what a reader actually reads: no marks, no layout, and no segment spaces in Japanese */
export function plain(text, lang) { const s = text.replace(/[[\]]/g, '').replace(/\s*\/\s*/g, ' ').trim(); return lang === 'ja' ? s.replace(/\s+/g, '') : s; }
export function readTime(text, lang) { return 1 + plain(text, lang).length / RATE[lang]; }
const styleOf = (lang, size = 'house') => (lang === 'ja' ? STYLES[size].ja : STYLES[size].latin);

/** when each word comes on, from t0: reveal speed per character, a pause per line */
function wordTimes(lines, lang, t0) {
  const cps = RATE[lang] * REVEAL; let t = t0; const out = [];
  lines.forEach((ln, i) => { if (i) t += LINE_PAUSE; ln.forEach((w) => { out.push({ ...w, line: i, t }); t += (w.w.length + (lang === 'ja' ? 0 : 1)) / cps; }); });
  return { words: out, revealEnd: out.length ? out[out.length - 1].t : t0 };
}

/**
 * Resolve the copy against the picture's beats for one language. A caption runs from `at` (+offset) to `until`
 * (+offset); if the language needs longer than that, a HOLD is inserted before the caption's `hold` beat and every
 * beat from there on moves later — so a film's length comes from its copy, never the other way round.
 */
export function plan(copy, lang, beats, { snap = 0 } = {}) {
  // snap: a hold is rounded UP to a whole number of these (a beat), so a retimed cut still lands on the grid
  const T = Object.fromEntries(beats); const order = beats.map(([n]) => n); const holds = []; const size = copy.captionSize || 'house';
  const at = (ref) => { if (typeof ref === 'number') return ref; const m = /^([A-Za-z0-9_]+)\s*([+-]\s*[\d.]+)?$/.exec(ref); if (!m || !(m[1] in T)) throw new Error('copy: unknown beat ' + ref); return T[m[1]] + (m[2] ? Number(m[2].replace(/\s/g, '')) : 0); };
  const caps = [];
  for (const c of copy.captions) {
    const text = c.text[lang]; if (!text) throw new Error(`copy: ${c.id} has no ${lang}`);
    const lines = parse(text, lang), t0 = at(c.at), read = readTime(text, lang);
    const { revealEnd } = wordTimes(lines, lang, t0);
    const need = Math.max(read, revealEnd - t0 + TAIL), span = at(c.until) - t0;
    if (span < need - 1e-6) {
      let extra = need - span; if (snap) extra = Math.ceil(extra / snap - 1e-9) * snap; extra = +extra.toFixed(4);
      const from = order.indexOf(c.hold || c.until.split(/[+-]/)[0].trim());
      if (from < 0) throw new Error('copy: unknown hold beat for ' + c.id);
      for (const n of order.slice(from)) T[n] += extra;
      holds.push({ caption: c.id, beat: order[from], extra });
    }
    caps.push({ c, lines });
  }
  const resolved = caps.map(({ c, lines }) => {
    const t0 = at(c.at), t1 = at(c.until), { words } = wordTimes(lines, lang, t0);
    return { id: c.id, lang, size: c.size || size, text: c.text[lang], lines, words, t0, t1, read: readTime(c.text[lang], lang), place: c.place || 'top', native: nativeRead(copy, c, lang) };
  });
  const ui = Object.fromEntries(Object.entries(copy.ui || {}).map(([k, v]) => [k, v[lang] ?? v.en]));
  return { lang, T, holds, captions: resolved, ui, end: T.end ?? Math.max(...Object.values(T)) };
}
function nativeRead(copy, c, lang) { const own = c.native_read && c.native_read[lang]; return own ?? (copy.native_read ? !!copy.native_read[lang] : false); }

/** a word's look on its own clock: plain words spring up, the pop word overshoots and wobbles */
function wordPose(k, pop) {
  if (pop) return (0.55 + 0.45 * spring(k / 0.5)) * (1 + 0.12 * Math.exp(-k * 6) * Math.sin(k * 30));
  return 0.7 + 0.3 * back(k / 0.22);
}

/** lay a caption out (no drawing): each word's x, each line's width and the caption's box */
export function layout(ctx, cap) {
  const st = styleOf(cap.lang, cap.size); ctx.save(); ctx.font = `${st.size}px "${st.family}"`;
  const space = cap.lang === 'ja' ? 0 : ctx.measureText(' ').width, y0 = BAND[cap.place] ?? cap.place, out = [];
  const widths = cap.lines.map((ln, i) => {
    const ws = ln.map((w) => ctx.measureText(w.w).width), total = ws.reduce((a, b) => a + b, 0) + space * (ln.length - 1);
    let x = 540 - total / 2; ln.forEach((w, j) => { out.push({ w: w.w, x, width: ws[j], y: y0 + i * st.lead }); x += ws[j] + space; }); return total;
  });
  ctx.restore();
  const asc = st.size * 0.82, desc = st.size * 0.28, pad = st.box ? 30 : st.stroke / 2 + 4, wmax = Math.max(...widths);
  const box = { x: 540 - wmax / 2 - pad, y: y0 - asc - pad, w: wmax + pad * 2, h: (cap.lines.length - 1) * st.lead + asc + desc + pad * 2 };
  return { words: out, widths, box };
}

/**
 * Busy-ness of the picture behind a caption, 0..1: luminance edge energy in its box, the most of several captionless
 * frames across its span. A scrim is drawn only when the picture behind is busy (the standard's rule).
 */
export function measureBusy(ctx, plan, render, samples = 5) {
  const out = {};
  for (const cap of plan.captions) {
    const { box } = layout(ctx, cap); let e = 0;
    for (let i = 0; i < samples; i++) {
      const t = cap.t0 + ((i + 0.5) / samples) * (cap.t1 - cap.t0), c = render(t), g = c.getContext('2d');
      const x = Math.max(0, box.x | 0), y = Math.max(0, box.y | 0), w = Math.min(c.width - x, box.w | 0), h = Math.min(c.height - y, box.h | 0);
      const d = g.getImageData(x, y, w, h).data; let s = 0, n = 0;
      for (let yy = 0; yy < h - 2; yy += 2) for (let xx = 0; xx < w - 2; xx += 2) {
        const p = (yy * w + xx) * 4, L = (q) => 0.2126 * d[q] + 0.7152 * d[q + 1] + 0.0722 * d[q + 2];
        s += Math.abs(L(p) - L(p + 8)) + Math.abs(L(p) - L(p + w * 8)); n++;
      }
      e = Math.max(e, s / Math.max(1, n));           // the busiest moment decides: a scrim is one level for a caption's life
    }
    out[cap.id] = { edge: +e.toFixed(2), busy: +clamp((e - 6) / 14).toFixed(2) };
  }
  return out;
}

/** the house caption, word by word, with a scrim behind it when the picture is busy */
export function draw(ctx, plan, t, { busy = {}, fadeOut = 0.25 } = {}) {
  for (const cap of plan.captions) {
    if (t < cap.t0 || t > cap.t1 + fadeOut) continue;
    const st = styleOf(cap.lang, cap.size), L = layout(ctx, cap), fade = clamp(1 - (t - cap.t1) / fadeOut);
    // the scrim hugs the words — a soft, blurred shadow of the caption's own box, never a band across the frame
    if (st.box) { noirBox(ctx, cap, L, st, t, fade); continue; }
    const sa = (busy[cap.id]?.busy ?? 0) * SCRIM * clamp((t - cap.t0) / 0.2) * fade;
    if (sa > 0.01) {                                  // it grows line by line with the reveal: never a dark box waiting for its words
      const b = L.box, shown = cap.words.filter((w) => w.t <= t), lines = shown.length ? shown[shown.length - 1].line + 1 : 1;
      const ws = L.widths.slice(0, lines), wmax = Math.max(...ws), h = b.h - (cap.lines.length - lines) * st.lead, x = 540 - wmax / 2 - (b.w - Math.max(...L.widths)) / 2;
      ctx.save(); ctx.filter = 'blur(26px)'; ctx.fillStyle = `rgba(8,8,10,${sa})`;
      ctx.beginPath(); ctx.roundRect(x - 18, b.y - 6, wmax + (b.w - Math.max(...L.widths)) + 36, h + 12, 48); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.font = `${st.size}px "${st.family}"`; ctx.lineJoin = 'round'; ctx.textBaseline = 'alphabetic';
    cap.words.forEach((w, i) => {
      const k = t - w.t, p = L.words[i]; if (k <= 0 || fade <= 0) return;
      const s = wordPose(k, w.pop);
      ctx.save(); ctx.globalAlpha = clamp(k / 0.08) * fade; ctx.translate(p.x + p.width / 2, p.y - st.lift); ctx.scale(s, s); ctx.translate(-p.width / 2, st.lift - 10 * (1 - clamp(k / 0.2)));
      ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3; ctx.lineWidth = st.stroke; ctx.strokeStyle = '#000'; ctx.strokeText(w.w, 0, 0); ctx.shadowColor = 'transparent';
      ctx.fillStyle = w.pop ? POP : '#fff'; ctx.fillText(w.w, 0, 0); ctx.restore();
    });
    ctx.restore();
  }
}

/** the noir narration box: a hard black box that opens line by line with the reveal, a hairline rule inside it, the
 *  words typed on (no spring) and only the pop word sprung, in the style's own pop colour */
function noirBox(ctx, cap, L, st, t, fade) {
  const b = L.box, shown = cap.words.filter((w) => w.t <= t), lines = shown.length ? shown[shown.length - 1].line + 1 : 1;
  const open = clamp((t - cap.t0) / 0.18), h = (b.h - (cap.lines.length - lines) * st.lead) * (0.25 + 0.75 * back(open));
  ctx.save(); ctx.globalAlpha = fade;
  ctx.fillStyle = 'rgba(8,8,10,.9)'; ctx.fillRect(b.x, b.y, b.w, h);
  ctx.strokeStyle = 'rgba(244,240,232,.55)'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 9, b.y + 9, b.w - 18, Math.max(0, h - 18));
  ctx.beginPath(); ctx.rect(b.x, b.y, b.w, h); ctx.clip();
  ctx.font = `${st.size}px "${st.family}"`; ctx.textBaseline = 'alphabetic';
  cap.words.forEach((w, i) => {
    const k = t - w.t, p = L.words[i]; if (k <= 0) return;
    const s = w.pop ? wordPose(k, true) : 1;
    ctx.save(); ctx.globalAlpha = clamp(k / 0.05) * fade; ctx.translate(p.x + p.width / 2, p.y - st.lift); ctx.scale(s, s); ctx.translate(-p.width / 2, st.lift);
    ctx.fillStyle = w.pop ? st.pop : '#f4f0e8'; ctx.fillText(w.w, 0, 0); ctx.restore();
  });
  ctx.restore();
}

/** the station's bug, top left on every film: the magenta dot and the name, on a soft dark backing so it stays a
 *  label over the picture rather than becoming part of it when the camera moves in under it */
export function bug(ctx, name = 'RADIO FREE HELSINKI', size = 'big') {
  // house: the ASS bug every papercut film carries (Poppins ExtraBold "30" = a 17 px em, top-left at 92,88, 81% white)
  const em = size === 'house' ? 17 : 30, base = size === 'house' ? 88 + em * 0.98 : 118, pad = em * 0.5;
  ctx.save(); ctx.font = `${em}px "${STYLES.house.latin.family}"`; const w = ctx.measureText('● ' + name).width;
  ctx.filter = `blur(${em / 3}px)`; ctx.fillStyle = 'rgba(8,8,10,.45)'; ctx.beginPath(); ctx.roundRect(92 - pad, base - em * 1.2, w + pad * 2, em * 1.66, em * 0.83); ctx.fill(); ctx.filter = 'none';
  ctx.lineWidth = em / 5; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineJoin = 'round'; ctx.strokeText('● ' + name, 92, base);
  ctx.fillStyle = '#f0027f'; ctx.fillText('●', 92, base); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText(' ' + name, 92 + ctx.measureText('●').width, base); ctx.restore();
}

/** the events a score needs: every word (pops flagged) and every caption's in and out */
export function events(plan) {
  return { words: plan.captions.flatMap((c) => c.words.map((w) => ({ w: w.w, t: +w.t.toFixed(3), pop: w.pop, caption: c.id }))),
    captions: plan.captions.map((c) => ({ id: c.id, t0: +c.t0.toFixed(3), t1: +c.t1.toFixed(3) })) };
}

const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** everything the checks read, measured with the real fonts: widths, boxes, timing, safe zones, native reads */
export function report(ctx, plan, { keep = () => [], busy = {} } = {}) {
  return {
    lang: plan.lang, end: plan.end, holds: plan.holds,
    captions: plan.captions.map((cap) => {
      const L = layout(ctx, cap), b = L.box, kept = [];
      for (let t = cap.t0; t <= cap.t1; t += 0.1) for (const r of keep(t)) if (hit(b, r)) kept.push({ t: +t.toFixed(1), what: r.what });
      return {
        id: cap.id, text: cap.text, plain: plain(cap.text, cap.lang), t0: +cap.t0.toFixed(3), t1: +cap.t1.toFixed(3), shown: +(cap.t1 - cap.t0).toFixed(3),
        read: +cap.read.toFixed(3), lastWord: +cap.words[cap.words.length - 1].t.toFixed(3), widths: L.widths.map((w) => Math.round(w)), box: Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v)])),
        inSafe: b.x >= SAFE.left - 20 && b.x + b.w <= SAFE.right + 20 && b.y >= SAFE.top && b.y + b.h <= SAFE.bottom,
        inRail: hit(b, { x: SAFE.rail.x0, y: SAFE.rail.y0, w: 1080 - SAFE.rail.x0, h: SAFE.rail.y1 - SAFE.rail.y0 }),
        covers: kept.slice(0, 5), busy: busy[cap.id] || null, native: cap.native,
      };
    }),
  };
}
