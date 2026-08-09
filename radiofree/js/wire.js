// Radio Free Helsinki — the wire format, and the gate it has to get through.
//
// The bulletins are DATA, not code: they live in `wire.json`, they are fetched
// at boot, and a new day's wire reaches a listener without anyone shipping a
// new build. That is the whole reason this file exists — the moment content
// can be updated from outside the bundle, the bundle stops being able to
// guarantee it, so the app has to check the wire itself, every time, before it
// puts a word of it on screen.
//
// Nothing in here touches the DOM or fetch, so `tools/validate-wire.mjs` runs
// the exact same validator over a file in a terminal that the app runs over a
// download. One implementation, two callers: a wire that passes locally cannot
// then fail in the browser for a reason the author never saw.

export const WIRE_VERSION = 1;
export const LANGS = ['en', 'fi', 'ja'];
// slug, head and lines are the bulletin. `technique`, `decodeNote` and `tell`
// belonged to DECODE and are no longer read by anything — a wire that still
// carries them is fine, they are simply ignored.
export const FIELDS = ['slug', 'head', 'lines'];

// `sign-off` is the station's own closing post; a bulletin claiming that id
// would collide with it in every lookup that steps over `p.signoff`.
const RESERVED_IDS = ['sign-off'];

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

// A filing date is YYYY-MM-DD and has to be a date that exists — '2026-02-31'
// parses happily in most hands and then sorts somewhere nobody expects.
const isDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

// Well-formed markup is {{as broadcast|what that means}}. A stray or unclosed
// brace does not throw — parseLine simply does not match it, and the bulletin
// ships with the raw braces visible on air. So it is an error here instead.
const MARKUP = /\{\{([^|{}]*)\|([^{}]*)\}\}/g;
function markupProblems(line) {
  const bad = [];
  const stripped = line.replace(MARKUP, '');
  if (stripped.includes('{{') || stripped.includes('}}')) bad.push('malformed {{…|…}} markup');
  for (const m of line.matchAll(MARKUP)) {
    if (!isStr(m[1])) bad.push('empty broadcast wording in a {{…|…}} pair');
    if (!isStr(m[2])) bad.push('empty plain reading in a {{…|…}} pair');
  }
  return bad;
}

/**
 * Check a parsed wire. Never throws — it returns every problem it can find in
 * one pass, because an external author fixing one error at a time through a
 * deploy cycle is exactly the workflow this format exists to avoid.
 *
 * `panelKeys` / `brollKeys` are passed in rather than imported so this module
 * stays dependency-free; the caller supplies whatever the build actually draws.
 */
export function validateWire(wire, { panelKeys = null, brollKeys = null, sectorIds = null } = {}) {
  const errors = [];
  const warnings = [];
  const E = (where, msg) => errors.push(`${where}: ${msg}`);

  if (!wire || typeof wire !== 'object' || Array.isArray(wire)) {
    return { ok: false, errors: ['wire: not an object'], warnings };
  }
  if (wire.version !== WIRE_VERSION) {
    // A format bump must fail loudly. Half-rendering a wire written to a
    // schema this build does not know is worse than showing the off-air card.
    E('wire.version', `expected ${WIRE_VERSION}, got ${JSON.stringify(wire.version)}`);
  }

  // ── channels ─────────────────────────────────────────────────────
  const sectors = wire.sectors;
  const known = new Set();
  if (!Array.isArray(sectors) || sectors.length === 0) {
    E('wire.sectors', 'must be a non-empty array');
  } else {
    sectors.forEach((s, i) => {
      const at = `sectors[${i}]`;
      if (!s || typeof s !== 'object') return E(at, 'not an object');
      for (const f of ['id', 'freq', 'call']) if (!isStr(s[f])) E(at, `missing ${f}`);
      if (!isStr(s.id)) return;
      if (known.has(s.id)) E(at, `duplicate channel id "${s.id}"`);
      known.add(s.id);
      // a channel with no accent colour in the build renders with no accent
      if (sectorIds && !sectorIds.includes(s.id)) {
        E(at, `channel "${s.id}" has no colour in this build (known: ${sectorIds.join(', ')})`);
      }
    });
  }

  // ── the roster ───────────────────────────────────────────────────
  const stories = wire.stories;
  const ids = [];
  if (!Array.isArray(stories) || stories.length === 0) {
    E('wire.stories', 'must be a non-empty array');
  } else {
    const seen = new Set();
    stories.forEach((s, i) => {
      const at = `stories[${i}]`;
      if (!s || typeof s !== 'object') return E(at, 'not an object');
      if (!isStr(s.id)) return E(at, 'missing id');
      const where = `stories[${i}] "${s.id}"`;
      if (seen.has(s.id)) E(where, 'duplicate id');
      if (RESERVED_IDS.includes(s.id)) E(where, `"${s.id}" is reserved by the station`);
      seen.add(s.id);
      ids.push(s.id);
      if (!isStr(s.sector)) E(where, 'missing sector');
      else if (known.size && !known.has(s.sector)) E(where, `unknown channel "${s.sector}"`);
      // `broll` falls back silently in the renderer — to the first plate —
      // which ships the wrong picture beside the right words in total silence.
      // It is the failure this file was written for: the copy is external, the
      // art is not. (`visual` named a DECODE panel and is now ignored.)
      if (!isStr(s.broll)) E(where, 'missing broll');
      else if (brollKeys && !brollKeys.includes(s.broll)) {
        E(where, `broll "${s.broll}" is not footage in this build (have: ${brollKeys.join(', ')})`);
      }
      // ── the rotation, all optional ────────────────────────────────
      if (s.filed !== undefined && !isDate(s.filed)) {
        E(where, `filed must be YYYY-MM-DD, got ${JSON.stringify(s.filed)}`);
      }
      if (s.retired !== undefined && typeof s.retired !== 'boolean') {
        E(where, `retired must be true or false, got ${JSON.stringify(s.retired)}`);
      }
    });
  }

  // ── the archive ──────────────────────────────────────────────────
  if (wire.keep !== undefined
      && (!Number.isInteger(wire.keep) || wire.keep < 1)) {
    E('wire.keep', `must be a positive whole number, got ${JSON.stringify(wire.keep)}`);
  }
  if (Array.isArray(stories) && stories.length) {
    const live = stories.filter(s => s && s.retired !== true);
    // An empty feed is the failure this whole file exists to prevent, and
    // archiving is the one edit that can cause it from a wire that is
    // otherwise perfectly well-formed.
    if (live.length === 0) E('wire.stories', 'every bulletin is retired — that is an empty broadcast');
    const cut = live.length - (wire.keep || live.length);
    if (cut > 0) {
      // Never silent. A cap that quietly drops bulletins reads as "they were
      // never written" the next time somebody counts the feed.
      warnings.push(`wire.keep = ${wire.keep}: ${cut} bulletin${cut === 1 ? '' : 's'} `
        + `will be archived off the bottom of the rotation`);
    }
    const retired = stories.filter(s => s && s.retired === true).length;
    if (retired) warnings.push(`${retired} bulletin${retired === 1 ? ' is' : 's are'} retired`);
  }

  // ── the copy, in every language ──────────────────────────────────
  const copy = wire.copy;
  if (!copy || typeof copy !== 'object') {
    E('wire.copy', 'must be an object keyed by language');
  } else {
    for (const lang of LANGS) {
      const block = copy[lang];
      if (!block || typeof block !== 'object') { E(`copy.${lang}`, 'missing'); continue; }
      for (const id of ids) {
        const c = block[id];
        const at = `copy.${lang}.${id}`;
        if (!c || typeof c !== 'object') { E(at, 'missing'); continue; }
        for (const f of FIELDS) {
          if (f === 'lines') continue;
          if (!isStr(c[f])) E(at, `missing ${f}`);
        }
        if (!Array.isArray(c.lines) || c.lines.length === 0) { E(at, 'lines must be a non-empty array'); continue; }
        let marked = 0;
        c.lines.forEach((line, li) => {
          if (!isStr(line)) return E(`${at}.lines[${li}]`, 'empty line');
          for (const p of markupProblems(line)) E(`${at}.lines[${li}]`, p);
          if (MARKUP.test(line)) marked++;
          MARKUP.lastIndex = 0;
        });
        // Markup is legacy: it used to be required, because DECODE was the
        // point. Now it is stripped before a word reaches the screen and a
        // bulletin without any is the normal case.
        void marked;
      }
      // copy for a bulletin that is not on the roster is dead weight, not a bug
      for (const id of Object.keys(block)) {
        if (!ids.includes(id)) warnings.push(`copy.${lang}.${id}: not on the roster`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}


/**
 * Split a marked-up line into the two things a line actually is: the BROADCAST
 * — what Toko says, with no annotation in it at all — and the DECODE, a list of
 * spans naming where the spin sits and what it plainly meant.
 *
 * This is the roadmap's load-bearing move, and it is worth being exact about
 * why. Until now the plain readings lived INSIDE the broadcast string as
 * `{{spun|plain}}`, so "DECODE off" could only ever mean "rendered and then
 * hidden" — the annotation was still in the DOM, still in the accessibility
 * tree, and still one CSS mistake away from being on screen. A clean export
 * cannot be built on that. Split here, `broadcast` is a string that has never
 * met an annotation, and clean mode is a field read rather than a filter.
 *
 * `at` is the character offset into `broadcast`, so a renderer can put the
 * strike and the plain reading back exactly where they came from.
 */
export function splitLine(line) {
  const runs = parseLine(line);
  let broadcast = '';
  const decode = [];
  for (const r of runs) {
    if (r.plain !== null) decode.push({ at: broadcast.length, spun: r.text, plain: r.plain });
    broadcast += r.text;
  }
  return { broadcast, decode };
}

// The inverse: rebuild the marked-up form from the split one, so a wire may be
// written EITHER way and everything downstream sees one shape.
export function joinLine(broadcast, decode = []) {
  if (!decode.length) return broadcast;
  let out = '', at = 0;
  for (const d of [...decode].sort((a, b) => a.at - b.at)) {
    out += broadcast.slice(at, d.at) + `{{${d.spun}|${d.plain}}}`;
    at = d.at + d.spun.length;
  }
  return out + broadcast.slice(at);
}

// What a clean render is allowed to contain: the broadcast, and nothing else.
export function cleanLines(copy) {
  return (copy && Array.isArray(copy.lines) ? copy.lines : []).map(l => splitLine(l).broadcast);
}

/**
 * Put the roster in channel order. The feed is grouped by band, and an
 * external author appending a bulletin to the end of the file should not have
 * to know that — sorting here is what makes "add a line anywhere" true.
 * Stable within a channel, so hand-ordering inside a band still holds.
 */
export function orderByChannel(stories, sectors) {
  const rank = new Map(sectors.map((s, i) => [s.id, i]));
  return stories
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (rank.get(a.s.sector) ?? 99) - (rank.get(b.s.sector) ?? 99) || a.i - b.i)
    .map(x => x.s);
}

/**
 * The rotation: what the feed actually shows, newest first, oldest archived
 * off the bottom.
 *
 * A bulletin filed today has to arrive at the TOP — that is the whole point of
 * a wire you can update from outside the bundle. But the feed is also read as
 * three channels, and shuffling a day's batch across the bands would make the
 * dial jump about. So it sorts by filing date DESCENDING and keeps channel
 * order inside each day's batch: a new drop lands on top, still grouped.
 *
 * `filed` is OPTIONAL and its absence is meaningful — an unfiled bulletin is
 * the standing backlog and sorts BELOW everything dated, in exactly the order
 * the file lists it. That is what lets a wire with no dates in it at all keep
 * the arrangement it already had.
 *
 * Two ways to archive, and both are deliberate:
 *   `story.retired: true` — this one, by name, out of the rotation.
 *   `wire.keep: n`        — keep the newest n and let the tail fall off.
 * Retiring never deletes: the copy stays in the wire, so un-retiring is a
 * one-word edit rather than a rewrite.
 */
export function rotate(wire) {
  const stories = Array.isArray(wire.stories) ? wire.stories : [];
  const sectors = Array.isArray(wire.sectors) ? wire.sectors : [];
  const rank = new Map(sectors.map((s, i) => [s.id, i]));
  // '' for undated, and it sorts LAST under a descending compare because no
  // real date is below it
  const filed = (s) => (typeof s.filed === 'string' ? s.filed : '0000-00-00');

  const live = stories
    .filter(s => s && s.retired !== true)
    .map((s, i) => ({ s, i }))
    .sort((a, b) =>
      filed(b.s).localeCompare(filed(a.s))
      || (rank.get(a.s.sector) ?? 99) - (rank.get(b.s.sector) ?? 99)
      || a.i - b.i)
    .map(x => x.s);

  const keep = Number.isInteger(wire.keep) && wire.keep > 0 ? wire.keep : live.length;
  const shown = live.slice(0, keep);
  const archived = [
    ...stories.filter(s => s && s.retired === true).map(s => s.id),
    ...live.slice(keep).map(s => s.id),
  ];
  return { shown, archived };
}

// English is the fallback, the same way t() falls back — a language missing a
// bulletin shows the English one rather than an empty post.
export function pickCopy(copy, id, lang) {
  return (copy[lang] && copy[lang][id]) || (copy.en && copy.en[id]) || null;
}

// Split a marked-up line into runs: {text, plain}, plain null for the parts
// that read the same either way.
export function parseLine(line) {
  const runs = [];
  const re = new RegExp(MARKUP.source, 'g');
  let at = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > at) runs.push({ text: line.slice(at, m.index), plain: null });
    runs.push({ text: m[1], plain: m[2] });
    at = m.index + m[0].length;
  }
  if (at < line.length) runs.push({ text: line.slice(at), plain: null });
  return runs;
}

// the read-aloud (or decoded) string for a whole line
export function flatten(line, decoded) {
  return parseLine(line).map(r => (decoded && r.plain !== null ? r.plain : r.text)).join('');
}
