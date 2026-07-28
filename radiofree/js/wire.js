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
export const FIELDS = ['slug', 'head', 'lines', 'technique', 'decodeNote', 'tell'];

// `sign-off` is the station's own closing post; a bulletin claiming that id
// would collide with it in every lookup that steps over `p.signoff`.
const RESERVED_IDS = ['sign-off'];

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

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
      // These two fall back silently in the renderer — to the bar chart and to
      // the first footage plate — which ships the wrong picture beside the
      // right words in total silence. It is the failure this file was written
      // for: the copy is external, the art is not.
      if (!isStr(s.visual)) E(where, 'missing visual');
      else if (panelKeys && !panelKeys.includes(s.visual)) {
        E(where, `visual "${s.visual}" is not a panel in this build (have: ${panelKeys.join(', ')})`);
      }
      if (!isStr(s.broll)) E(where, 'missing broll');
      else if (brollKeys && !brollKeys.includes(s.broll)) {
        E(where, `broll "${s.broll}" is not footage in this build (have: ${brollKeys.join(', ')})`);
      }
    });
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
        // A bulletin with nothing marked has nothing to decode, which makes it
        // a news item rather than a lesson — the one thing this app is for.
        if (marked === 0) E(at, 'no {{…|…}} markup — nothing to decode');
      }
      // copy for a bulletin that is not on the roster is dead weight, not a bug
      for (const id of Object.keys(block)) {
        if (!ids.includes(id)) warnings.push(`copy.${lang}.${id}: not on the roster`);
      }
    }
  }

  // The sign-off hands every technique back and marks the ones the listener
  // caught; two bulletins sharing one costs a slot and teaches nothing twice.
  if (copy && copy.en) {
    const byTech = new Map();
    for (const id of ids) {
      const tech = copy.en[id] && copy.en[id].technique;
      if (!isStr(tech)) continue;
      if (byTech.has(tech)) warnings.push(`copy.en.${id}: technique "${tech}" also used by ${byTech.get(tech)}`);
      else byTech.set(tech, id);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
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
