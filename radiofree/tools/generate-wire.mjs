#!/usr/bin/env node
// Radio Free Helsinki — the morning wire, written by the machine.
//
//   node radiofree/tools/generate-wire.mjs [--date YYYY-MM-DD] [--count 5]
//                                          [--dry-run] [--print] [--feeds a,b]
//
// Today's real headlines in, one day's broadcast out: `wire/<date>.json`, plus
// the date on the front of `wire/index.json`. No build, no deploy, no token
// bump — the wire is data, and this writes data.
//
// Three things about the shape of this script are deliberate.
//
//   1. IT VALIDATES WITH THE APP'S OWN VALIDATOR. `js/wire.js` is imported
//      here, exactly as `tools/validate-wire.mjs` imports it and exactly as the
//      browser imports it. A generator with its own idea of the format would
//      eventually write something that passes its own check and shows the
//      off-air card to everybody — which is the one failure the whole
//      fetched-wire arrangement exists to avoid.
//   2. IT REPAIRS RATHER THAN RETRIES. A rejected draft goes back to the model
//      with the validator's errors attached. Rerolling from scratch throws away
//      four good bulletins to fix a fifth, and costs the same again.
//   3. IT WRITES NOTHING UNLESS EVERYTHING PASSES. There is no half-episode.
//      The job either commits a broadcast that the app will accept or it fails
//      loudly and yesterday's stays up, which is the correct thing for a
//      station to do when the copy does not arrive.
//
// The naming rule (`EDITORIAL.md`) is the one editorial rule checked here in
// code rather than left to the prompt: proper nouns lifted out of the source
// headlines are looked for in the finished copy, and finding one is an error.
// Real events, invented actors — a generator that quietly stopped inventing the
// actors would be indistinguishable, from the outside, from one that was
// working.

// The pure parts are EXPORTED and `main()` only runs when this file is the
// program. The gate imports it and drives the feed parser, the assembler and
// the naming check over fixtures — a rule nobody can test is a rule that holds
// only until the morning it doesn't, and the naming rule is the one this
// project cannot afford to get wrong quietly.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const { validateWire, parseLine } = await import(path.join(ROOT, 'js/wire.js'));
const { PANEL_KEYS, BROLL_KEYS } = await import(path.join(ROOT, 'js/visuals.js'));
const { SECTOR_COLOR } = await import(path.join(ROOT, 'js/palette.js'));

// ── the desk ──────────────────────────────────────────────────────────────
const API = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.RFH_MODEL || 'claude-opus-5';
const KEEP_EPISODES = Number(process.env.RFH_KEEP_EPISODES || 30);
const SECTOR = { id: 'RFH', freq: '104.40', call: 'HELSINKI' };

// One band. The three-channel dial was retired at the owner's call; the wire
// keeps the field because the format has it, and every bulletin sits on RFH.
const FEEDS = (process.env.RFH_FEEDS || [
  'https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_NEWS',
  'https://www.gamesindustry.biz/feed',
  'https://feeds.arstechnica.com/arstechnica/technology-lab',
  'https://www.theregister.com/headlines.atom',
].join(',')).split(',').map(s => s.trim()).filter(Boolean);

// What the pictures actually draw. The model picks two art keys per bulletin
// and the validator rejects a key this build cannot draw — but a key that is
// merely WRONG passes validation and ships the wrong picture beside the right
// words, which is the failure `PANEL_KEYS` was exported to prevent in the first
// place. So the prompt gets told what each one is, in one line, and the lists
// below are checked against the build at startup so a new panel cannot be added
// without this file noticing it is undescribed.
const PANEL_NOTES = {
  chart: 'a field of 260 lit cells; decoded, 92 of them go dark — a headline count that shrinks once the double-counting comes out',
  chart2: 'a bar chart on a truncated axis; decoded the baseline drops from 68 to 0 and the mountain becomes a bump (+40% → +4%)',
  mesh: 'a small node on a stalk above a big one; decoded the top shrinks and the base is re-measured 50% → 100% — a share whose denominator was the trick',
  crowd: 'a packed 900-seat auditorium; decoded it empties to the four people on the stage',
  heat: 'a lit building venting heat into housing blocks; decoded a 96% / 4% split appears — how much of the heat actually went anywhere',
  crane: 'a construction crane over low blocks, load swinging; decoded a scoreboard lights under it',
  tower: 'a valuation spire with a beacon; decoded it goes hollow and three funding steps read 3 / 1 / 1',
  coin: 'a stack of 400 bars; decoded all but the top go hollow — 6% of the money actually moved',
  sea: 'a dithered sea, a vessel and a shoreline; decoded its track and the shallow it is sitting on light up',
  sat: 'satellites tracking overhead and a plume rising off the ground; decoded the plume\'s source moves somewhere else entirely',
  engine: 'a wireframe terrain running to a horizon; decoded a targeting box locks onto one object and counts it as one',
  crowd2: 'nine hundred accounts orbiting a hub; decoded three-quarters of them snap onto a second node that made them all',
  beach: 'the city beach from the drone counting it; decoded the coverage cone shows it surveyed a wedge of the sand',
  moon: 'a low moon beside a heating-plant chimney; decoded a second moon at the same radius appears high in the empty sky — the chimney was the whole comparison',
  border: 'a checkpoint with five marks on the map; decoded only two of them are real',
  esplanadi: 'the boulevard, drones overhead',
  kamppi: 'the Kamppi blocks at night',
  harbour: 'the container harbour, gantries working',
  gulf: 'open water off the Gulf',
  cathedral: 'the cathedral steps in phosphor',
  katu: 'a narrow street, lit windows',
  mannerheim: 'the main avenue, trams',
  station: 'the central station clock',
  suomenlinna: 'the fortress islands over water',
  katajanokka: 'the Katajanokka waterfront',
};
const BROLL_NOTES = {
  esplanadi: 'drones over the boulevard',
  kamppi: 'Kamppi at night',
  harbour: 'the container harbour',
  gulf: 'open water, the Gulf',
  cathedral: 'the cathedral (photographed)',
  katu: 'a narrow street (photographed)',
  mannerheim: 'the main avenue (photographed)',
  station: 'the central station',
  suomenlinna: 'the fortress islands',
  katajanokka: 'the waterfront',
  beach: 'a Helsinki summer beach with drones over it',
  moon: 'a low moon behind a chimney, drones over it',
  winterhall: 'a winter hall, cold and lit',
  packice: 'pack ice, a vessel working through it',
  chase: 'ACTION — a car pursuit on the ring road, night',
  approach: 'ACTION — a heavy aircraft landing, seen from underneath',
};

// Places are not accusations (`EDITORIAL.md`), so the naming check has to know
// the difference between a proper noun that is a company and one that is a map.
const PLACES = new Set(['helsinki', 'finland', 'finnish', 'suomi', 'espoo', 'vantaa',
  'tampere', 'turku', 'oulu', 'lapland', 'kamppi', 'vuosaari', 'katajanokka',
  'suomenlinna', 'esplanadi', 'mannerheim', 'baltic', 'nordic', 'nordics',
  'scandinavia', 'europe', 'european', 'eu', 'nato', 'bothnia', 'gulf',
  'sweden', 'norway', 'denmark', 'estonia', 'tallinn', 'stockholm', 'russia',
  'ukraine', 'arctic', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',
  'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december']);

// ── arguments ─────────────────────────────────────────────────────────────
function args(argv) {
  const out = { count: 5, dryRun: false, print: false, date: null, feeds: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--print') out.print = true;
    else if (a === '--date') out.date = argv[++i];
    else if (a === '--count') out.count = Number(argv[++i]);
    else if (a === '--feeds') out.feeds = argv[++i].split(',').map(s => s.trim()).filter(Boolean);
  }
  return out;
}

// The Helsinki date, because the show is a Helsinki morning — a job that fires
// at 04:10 UTC in December must not file the broadcast under yesterday.
export function helsinkiDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

// ── the source: real headlines, and nothing else from them ────────────────
// A deliberately small parser. RSS and Atom in the wild are both "XML" and
// neither is worth a dependency for the four fields this needs; anything it
// cannot read is skipped rather than guessed at.
const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/\s+/g, ' ').trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};

export function parseFeed(xml, source) {
  const items = [];
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(m => m[0]);
  for (const b of blocks) {
    const title = tag(b, 'title');
    if (!title) continue;
    const link = tag(b, 'link')
      || (b.match(/<link[^>]*href="([^"]+)"/i) || [, ''])[1];
    const when = tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published');
    const summary = (tag(b, 'description') || tag(b, 'summary')).slice(0, 400);
    items.push({ title, link, when, summary, source });
  }
  return items;
}

// A feed spec that is not a URL is a FILE, which is how this runs without the
// network: a saved RSS file, or a hand-curated one when the job is being driven
// by an editor rather than by the clock.
async function readFeed(spec) {
  if (!/^https?:\/\//.test(spec)) return readFile(path.resolve(spec), 'utf8');
  const res = await fetch(spec, {
    headers: { 'User-Agent': 'radio-free-helsinki/1.0 (wire generator)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.text();
}

export async function headlines(feeds, limit) {
  const all = [];
  const failed = [];
  for (const url of feeds) {
    const label = /^https?:\/\//.test(url) ? new URL(url).hostname : path.basename(url);
    try {
      const items = parseFeed(await readFeed(url), label);
      if (!items.length) throw new Error('no items parsed');
      all.push(...items.slice(0, 12));
      console.log(`  · ${label}: ${items.length} items`);
    } catch (err) {
      failed.push(`${url}: ${err.message}`);
      console.warn(`  ! ${url}: ${err.message}`);
    }
  }
  if (!all.length) {
    throw new Error('no feed could be read:\n  ' + failed.join('\n  '));
  }
  // Interleave the sources rather than taking the first feed whole — one bad
  // morning at one outlet should not make the whole broadcast about it.
  const bySource = new Map();
  for (const it of all) {
    if (!bySource.has(it.source)) bySource.set(it.source, []);
    bySource.get(it.source).push(it);
  }
  const lists = [...bySource.values()];
  const picked = [];
  for (let i = 0; picked.length < limit && lists.some(l => l[i]); i++) {
    for (const l of lists) if (l[i] && picked.length < limit) picked.push(l[i]);
  }
  return picked;
}

// ── the prompt ────────────────────────────────────────────────────────────
function artTable() {
  const panels = PANEL_KEYS.filter(k => k !== 'signoff');
  const lines = [];
  lines.push('VISUAL — the story panel. Pick the one whose picture argues the same thing the words do:');
  for (const k of panels) lines.push(`  ${k.padEnd(12)} ${PANEL_NOTES[k] || '(no description — avoid)'}`);
  lines.push('');
  lines.push('BROLL — the footage the post cuts to:');
  for (const k of BROLL_KEYS) lines.push(`  ${k.padEnd(12)} ${BROLL_NOTES[k] || '(no description — avoid)'}`);
  return lines.join('\n');
}

const SCHEMA = `Return ONE JSON object and nothing else. No prose, no code fence.

{
  "stories": [
    {
      "id": "kebab-case-slug",              // unique, never "sign-off"
      "visual": "<one VISUAL key>",
      "broll": "<one BROLL key>",
      "en": {
        "slug": "SHORT DATELINE IN CAPS",   // e.g. "RING ROAD III", "VUOSAARI"
        "head": "one headline, sentence case, no full stop",
        "lines": [
          "1-3 sentences of broadcast copy with {{as broadcast|what that means}} markup",
          "a second paragraph, same"
        ],
        "technique": "THE NAMED MOVE IN CAPS",
        "decodeNote": "3-5 sentences on what the move did here",
        "tell": "one question the listener can ask of a real article tomorrow"
      },
      "fi": { ...same fields, written in Finnish... },
      "ja": { ...same fields, written in Japanese... }
    }
  ]
}`;

function systemPrompt(editorial) {
  return `${editorial}

---

## Your job right now

You are writing one morning's broadcast for Radio Free Helsinki. Everything
above is the bar. What follows is the mechanical part.

${artTable()}

## Hard requirements — the file is rejected automatically if any of these fail

- Every bulletin has copy in ALL THREE languages: en, fi, ja.
- The three are NOT translations of each other. Each is written the way that
  language really pulls this move: Finnish reaches for the true agentless
  passiivi and the preesens-as-futuuri; Japanese for 〜される, 「〜している」
  ambiguity, and the polite institutional noun (再編、協議、見直し).
- 2 to 4 \`{{spun|plain}}\` spans per bulletin, in EVERY language. The braces are
  the mechanic; a bulletin with none is rejected.
- No nested or unclosed braces. No \`|\` inside a span other than the separator.
- The plain reading is what someone who knew would say out loud: flat, specific,
  never a paraphrase of the spin.
- Each bulletin uses a DIFFERENT technique from the others in this batch, named
  in caps, and the technique name is translated per language.
- EVERY company, agency, ministry, operator and named person is INVENTED, and
  audibly so — a pun name signals to the listener that it is not a claim
  ("Piggies and Birds Inc", "Ka-Boom Nordics Oy", "Rack & Ruin Oy"). Do not
  reuse any proper noun from the source headline except a place name. No real
  person is quoted, ever.
- The event stays real and unembellished. The reframe is the joke; inventing
  the event is not.
- Funny first. If a line is only clever, cut it.

${SCHEMA}`;
}

function userPrompt(items, date, avoidTechniques, avoidIds) {
  const wire = items.map((it, i) =>
    `${i + 1}. ${it.title}${it.summary ? `\n   ${it.summary}` : ''}\n   [${it.source}]`).join('\n\n');
  return `Date: ${date}.

Today's real headlines, off the wire services:

${wire}

Write ${items.length <= 5 ? items.length : 5} bulletins. Use the headlines that
reframe best — a headline that resists the treatment is better skipped than
forced.

${avoidTechniques.length ? `Techniques used in recent broadcasts (pick different ones):\n${avoidTechniques.join(', ')}\n` : ''}${avoidIds.length ? `Ids already used (pick different ones):\n${avoidIds.join(', ')}\n` : ''}`;
}

// ── the call ──────────────────────────────────────────────────────────────
async function ask(system, messages) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 2000 * 2 ** attempt));
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ model: MODEL, max_tokens: 16000, system, messages }),
        signal: AbortSignal.timeout(600000),
      });
      if (res.status === 429 || res.status >= 500) throw new Error('HTTP ' + res.status);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ? body.error.message : 'HTTP ' + res.status);
      return (body.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    } catch (err) {
      lastErr = err;
      console.warn(`  ! api: ${err.message}`);
    }
  }
  throw lastErr;
}

// The model is asked for bare JSON and usually sends bare JSON. "Usually" is
// not a parser, so this takes the outermost braces and lets JSON.parse be the
// judge of the rest.
function extractJson(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('no JSON object in the reply');
  return JSON.parse(text.slice(a, b + 1));
}

// ── assembly ──────────────────────────────────────────────────────────────
const LANGS = ['en', 'fi', 'ja'];

export function assemble(draft, date) {
  const stories = [];
  const copy = { en: {}, fi: {}, ja: {} };
  for (const s of (draft.stories || [])) {
    if (!s || !s.id) continue;
    stories.push({ id: s.id, sector: SECTOR.id, visual: s.visual, broll: s.broll, filed: date });
    for (const lang of LANGS) if (s[lang]) copy[lang][s.id] = s[lang];
  }
  return {
    version: 1,
    station: 'Radio Free Helsinki',
    date,
    updated: date,
    sectors: [SECTOR],
    stories,
    copy,
  };
}

// Proper nouns worth protecting: the capitalised words in the source headlines
// that are plausibly somebody's name.
//
// SENTENCE-INITIAL COUNTS, and that costs some false positives on purpose. The
// first draft skipped the first word of every headline to avoid flagging
// "Police said…" — and headlines lead with the company more often than not, so
// "Nokia Oyj cuts 340 jobs" sailed through the one check that exists to stop a
// real firm's name reaching air. A false positive costs a repair round. A false
// negative costs the naming rule, silently, on a morning nobody is reading the
// job log. The common-word list below is what keeps the noise down.
const COMMON = new Set(['the', 'a', 'an', 'and', 'but', 'new', 'more', 'most',
  'after', 'before', 'why', 'how', 'what', 'when', 'where', 'who', 'this',
  'that', 'these', 'those', 'first', 'last', 'next', 'one', 'two', 'three',
  'four', 'five', 'police', 'government', 'ministry', 'minister', 'city',
  'council', 'court', 'report', 'study', 'survey', 'here', 'there', 'over',
  'under', 'with', 'without', 'from', 'into', 'about', 'their', 'they', 'it',
  'its', 'his', 'her', 'our', 'your', 'said', 'says', 'will', 'can', 'could',
  'should', 'would', 'now', 'still', 'again', 'also', 'just', 'even', 'top',
  'big', 'best', 'worst', 'why?', 'tech', 'news', 'update', 'exclusive']);

export function sourceNames(items) {
  const names = new Set();
  for (const it of items) {
    const text = `${it.title}. ${it.summary || ''}`;
    for (const m of text.matchAll(/\b([A-ZÅÄÖ][\w&'’-]{3,}(?:\s+[A-ZÅÄÖ][\w&'’-]{2,}){0,2})\b/g)) {
      const phrase = m[1].trim();
      const head = phrase.split(/\s+/)[0].toLowerCase();
      if (PLACES.has(head) || COMMON.has(head)) continue;
      names.add(phrase);
      // the phrase AND its head word: "Wing & A Prayer Oy" must not be caught
      // by half of a real name either
      if (phrase.includes(' ')) names.add(phrase.split(/\s+/)[0]);
    }
  }
  return [...names];
}

// The editorial checks that are worth running in code rather than trusting to
// the prompt. Everything structural is `validateWire`'s job; these are the two
// rules that would fail SILENTLY — copy that reads perfectly and is either
// undecodable or is wearing a real company's name.
export function editorialProblems(wire, names) {
  const errors = [];
  const seenTech = new Map();

  for (const st of wire.stories) {
    for (const lang of LANGS) {
      const c = wire.copy[lang] && wire.copy[lang][st.id];
      if (!c || !Array.isArray(c.lines)) continue;
      const spans = c.lines.reduce((n, l) => n + parseLine(l).filter(r => r.plain !== null).length, 0);
      if (spans < 2) errors.push(`copy.${lang}.${st.id}: ${spans} decode span(s) — the bar is 2 to 4`);
      if (spans > 4) errors.push(`copy.${lang}.${st.id}: ${spans} decode spans — the bar is 2 to 4, it reads as a puzzle`);

      const flat = [c.slug, c.head, ...c.lines, c.decodeNote].join(' ');
      for (const n of names) {
        if (flat.includes(n)) {
          errors.push(`copy.${lang}.${st.id}: "${n}" is lifted straight from the source headline `
            + '— every actor must be invented (EDITORIAL.md, the naming rule)');
        }
      }
    }
    const tech = wire.copy.en[st.id] && wire.copy.en[st.id].technique;
    if (!tech) continue;
    if (seenTech.has(tech)) {
      errors.push(`copy.en.${st.id}: technique "${tech}" is already used by ${seenTech.get(tech)} `
        + '— the sign-off hands each one back once, so two bulletins may not share one');
    } else seenTech.set(tech, st.id);
  }
  return errors;
}

export function check(wire, names) {
  const v = validateWire(wire, {
    panelKeys: PANEL_KEYS,
    brollKeys: BROLL_KEYS,
    sectorIds: Object.keys(SECTOR_COLOR),
  });
  const errors = [...v.errors, ...editorialProblems(wire, names)];
  return { ok: errors.length === 0, errors, warnings: v.warnings };
}

// ── recent history, so a week does not read as one bulletin five times ────
async function recent(dir, limit = 4) {
  const techniques = new Set(), ids = new Set();
  const indexPath = path.join(dir, 'index.json');
  if (!existsSync(indexPath)) return { techniques: [], ids: [] };
  try {
    const idx = JSON.parse(await readFile(indexPath, 'utf8'));
    for (const date of (idx.episodes || []).slice(0, limit)) {
      const f = path.join(dir, `${date}.json`);
      if (!existsSync(f)) continue;
      const ep = JSON.parse(await readFile(f, 'utf8'));
      for (const s of ep.stories || []) {
        ids.add(s.id);
        const c = ep.copy && ep.copy.en && ep.copy.en[s.id];
        if (c && c.technique) techniques.add(c.technique);
      }
    }
  } catch { /* a history we cannot read is not a reason not to broadcast */ }
  return { techniques: [...techniques], ids: [...ids] };
}

// ── main ──────────────────────────────────────────────────────────────────
async function main() {
  const opt = args(process.argv.slice(2));
  const date = opt.date || helsinkiDate();
  const wireDir = path.join(ROOT, 'wire');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(`✗ --date must be YYYY-MM-DD, got ${date}`);
    process.exit(1);
  }

  // Every panel this build can draw should be describable to the writer. A new
  // one that nobody wrote a line for is simply never chosen, which looks like the
  // model ignoring it rather than like a missing line here.
  for (const k of PANEL_KEYS) {
    if (k !== 'signoff' && !PANEL_NOTES[k]) console.warn(`  ! panel "${k}" has no description in this file`);
  }
  for (const k of BROLL_KEYS) if (!BROLL_NOTES[k]) console.warn(`  ! broll "${k}" has no description in this file`);

  console.log(`Radio Free Helsinki — wire for ${date} (${MODEL})`);
  console.log('\nreading the feeds');
  const items = await headlines(opt.feeds || FEEDS, Math.max(opt.count * 2, 8));
  console.log(`  ${items.length} headlines`);

  const editorial = await readFile(path.join(ROOT, 'EDITORIAL.md'), 'utf8');
  const history = await recent(wireDir);
  const names = sourceNames(items);

  const system = systemPrompt(editorial);
  const messages = [{ role: 'user', content: userPrompt(items, date, history.techniques, history.ids) }];

  let wire = null, verdict = null;
  for (let round = 0; round < 3; round++) {
    console.log(`\ndrafting${round ? ` — repair round ${round}` : ''}`);
    const reply = await ask(system, messages);
    let draft;
    try {
      draft = extractJson(reply);
    } catch (err) {
      console.warn(`  ! ${err.message}`);
      messages.push({ role: 'assistant', content: reply });
      messages.push({ role: 'user', content: `That was not parseable JSON (${err.message}). Send the whole object again, bare JSON, nothing else.` });
      continue;
    }
    wire = assemble(draft, date);
    verdict = check(wire, names);
    console.log(`  ${wire.stories.length} bulletins, ${verdict.errors.length} problem${verdict.errors.length === 1 ? '' : 's'}`);
    if (verdict.ok) break;
    for (const e of verdict.errors) console.log(`    ✗ ${e}`);
    messages.push({ role: 'assistant', content: reply });
    messages.push({
      role: 'user',
      content: `The wire was rejected. Fix exactly these and send the WHOLE object again, `
        + `bare JSON, keeping everything that was not at fault:\n\n${verdict.errors.join('\n')}`,
    });
  }

  if (!verdict || !verdict.ok) {
    console.error('\n✗ the wire did not pass. Nothing written — yesterday\'s broadcast stays up.');
    process.exit(1);
  }
  for (const w of verdict.warnings) console.warn(`  ! ${w}`);

  if (opt.print) console.log('\n' + JSON.stringify(wire, null, 2));

  console.log('\nthe broadcast');
  for (const st of wire.stories) {
    const c = wire.copy.en[st.id];
    console.log(`  ${st.id.padEnd(24)} ${st.visual.padEnd(10)} ${st.broll.padEnd(10)} ${c.technique}`);
    console.log(`    ${c.head}`);
  }

  if (opt.dryRun) {
    console.log('\n(dry run — nothing written)');
    process.exit(0);
  }

  await mkdir(wireDir, { recursive: true });
  await writeFile(path.join(wireDir, `${date}.json`), JSON.stringify(wire, null, 2) + '\n');

  // The index is what the app reads first and what the archive picker draws, so
  // it is written LAST: a date on the index with no file behind it is a listener
  // staring at the off-air card, while a file the index has not caught up to is
  // invisible and harmless.
  let index = { version: 1, station: 'Radio Free Helsinki', episodes: [] };
  const indexPath = path.join(wireDir, 'index.json');
  if (existsSync(indexPath)) {
    try { index = JSON.parse(await readFile(indexPath, 'utf8')); } catch { /* rebuild it */ }
  }
  const episodes = [...new Set([date, ...(index.episodes || [])])]
    .sort((a, b) => b.localeCompare(a))
    .slice(0, KEEP_EPISODES);
  await writeFile(indexPath, JSON.stringify({ ...index, episodes }, null, 2) + '\n');

  console.log(`\n✓ wire/${date}.json — ${wire.stories.length} bulletins, ${episodes.length} in the archive`);
}

// Only when this file IS the program. Imported — by the gate, or by anything
// that wants the feed parser or the naming check — it must do nothing at all.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
