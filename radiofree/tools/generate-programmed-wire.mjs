#!/usr/bin/env node
// Radio Free Helsinki — programmed morning wire.
//
// This is the v2 desk: editorial voice comes from EDITORIAL.md, transmission
// mix comes from PROGRAMMING.md. It deliberately selects a broader candidate
// pool before asking the model to write the final programme.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const { validateWire } = await import(path.join(ROOT, 'js/wire.js'));
const { PANEL_KEYS, BROLL_KEYS } = await import(path.join(ROOT, 'js/visuals.js'));
const { SECTOR_COLOR } = await import(path.join(ROOT, 'js/palette.js'));

const API = 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.RFH_MODEL || 'claude-opus-5';
const SECTOR = { id: 'RFH', freq: '104.40', call: 'HELSINKI' };
const DEFAULT_COUNT = 7;
const FEEDS = (process.env.RFH_FEEDS || [
  'https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_NEWS',
  'https://www.gamesindustry.biz/feed',
  'https://feeds.arstechnica.com/arstechnica/technology-lab',
  'https://www.theregister.com/headlines.atom',
].join(',')).split(',').map(s => s.trim()).filter(Boolean);

const DESKS = {
  CITY: /helsinki|espoo|vantaa|tram|metro|street|city|restaurant|food|nightlife|museum|gallery|architecture|transport|harbour/i,
  GAMES: /game|gaming|studio|developer|publisher|playstation|xbox|nintendo|steam|console|esport/i,
  TECH: /ai|artificial intelligence|data cent|telecom|network|energy|chip|semiconductor|software|cloud|robot|industry|factory|logistics/i,
  CULTURE: /film|music|art|museum|festival|theatre|book|design|culture|restaurant|food|nightlife/i,
  SIGNAL: /gps|positioning|radio|satellite|cable|border|defen[cs]e|security|resilience|interference|drone|radar/i,
};

function decode(s = '') {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
}

export function parseFeed(xml, source) {
  const out = [];
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(m => m[0]);
  for (const b of blocks) {
    const title = tag(b, 'title');
    if (!title) continue;
    const summary = (tag(b, 'description') || tag(b, 'summary')).slice(0, 500);
    const link = tag(b, 'link') || (b.match(/<link[^>]*href="([^"]+)"/i) || [, ''])[1];
    const when = tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published');
    out.push({ title, summary, link, when, source });
  }
  return out;
}

async function readFeed(spec) {
  if (!/^https?:\/\//.test(spec)) return readFile(path.resolve(spec), 'utf8');
  const res = await fetch(spec, {
    headers: { 'User-Agent': 'radio-free-helsinki/2.0 (programming desk)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export async function collectCandidates(feeds = FEEDS) {
  const all = [];
  for (const spec of feeds) {
    const source = /^https?:\/\//.test(spec) ? new URL(spec).hostname : path.basename(spec);
    try {
      all.push(...parseFeed(await readFeed(spec), source).slice(0, 20));
    } catch (err) {
      console.warn(`  ! ${source}: ${err.message}`);
    }
  }
  if (!all.length) throw new Error('No usable feed items');
  return all;
}

function deskFor(item) {
  const text = `${item.title} ${item.summary}`;
  for (const [desk, re] of Object.entries(DESKS)) if (re.test(text)) return desk;
  return 'GENERAL';
}

function score(item) {
  const text = `${item.title} ${item.summary}`;
  let n = 0;
  if (/helsinki|finland|finnish|suomi/i.test(text)) n += 4;
  if (/\b\d+[,.]?\d*\b/.test(text)) n += 2;
  if (/jobs?|people|homes?|workers?|passengers?|residents?|players?|customers?/i.test(text)) n += 1;
  if (/announces?|cuts?|opens?|closes?|launches?|votes?|approves?|bans?|builds?|buys?|sells?|fails?|wins?|loses?/i.test(text)) n += 1;
  return n;
}

export function programmeCandidates(items, count = DEFAULT_COUNT) {
  const ranked = items.map((item, index) => ({ ...item, desk: deskFor(item), _score: score(item), _index: index }))
    .sort((a, b) => b._score - a._score || a._index - b._index);

  const wanted = ['CITY', 'GAMES', 'TECH', 'CULTURE', 'SIGNAL'];
  const selected = [];
  const used = new Set();
  for (const desk of wanted) {
    const hit = ranked.find(x => x.desk === desk && !used.has(x._index));
    if (hit) { selected.push(hit); used.add(hit._index); }
  }
  // ODD WIRE: prefer a concrete lower-stakes item outside the already-filled desks.
  const odd = [...ranked].reverse().find(x => !used.has(x._index) && x._score >= 1);
  if (odd) { selected.push({ ...odd, desk: 'ODD WIRE' }); used.add(odd._index); }
  for (const item of ranked) {
    if (selected.length >= Math.max(count * 2, 14)) break;
    if (!used.has(item._index)) { selected.push(item); used.add(item._index); }
  }
  return selected;
}

function schema() {
  return `Return bare JSON only:\n{\n  "stories": [\n    {\n      "id":"kebab-case",\n      "label":"LEAD|CITY|GAMES|TECH|CULTURE|SIGNAL|ODD WIRE",\n      "visual":"one of: ${PANEL_KEYS.filter(k => k !== 'signoff').join(', ')}",\n      "broll":"one of: ${BROLL_KEYS.join(', ')}",\n      "visualBeat":"one sentence describing what becomes newly legible during DECODE",\n      "en":{"slug":"DATELINE","head":"headline","lines":["copy with {{spin|plain}} markup"],"technique":"NAME","decodeNote":"3-5 sentences","tell":"question"},\n      "fi":{"slug":"...","head":"...","lines":["..."],"technique":"...","decodeNote":"...","tell":"..."},\n      "ja":{"slug":"...","head":"...","lines":["..."],"technique":"...","decodeNote":"...","tell":"..."}\n    }\n  ]\n}`;
}

async function ask(system, user) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 18000, system, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(600000),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error?.message || `HTTP ${res.status}`);
  return (body.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
}

function parseJson(text) {
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  if (a < 0 || b <= a) throw new Error('model returned no JSON object');
  return JSON.parse(text.slice(a, b + 1));
}

export function assemble(draft, date) {
  const stories = [];
  const copy = { en: {}, fi: {}, ja: {} };
  for (const s of draft.stories || []) {
    if (!s?.id) continue;
    stories.push({
      id: s.id, sector: SECTOR.id, visual: s.visual, broll: s.broll, filed: date,
      label: s.label || 'LEAD', visualBeat: s.visualBeat || '',
    });
    for (const lang of ['en', 'fi', 'ja']) if (s[lang]) copy[lang][s.id] = s[lang];
  }
  return { version: 1, station: 'Radio Free Helsinki', date, updated: date, sectors: [SECTOR], stories, copy };
}

function validateProgramme(wire, count) {
  const result = validateWire(wire, { panelKeys: PANEL_KEYS, brollKeys: BROLL_KEYS, sectorIds: Object.keys(SECTOR_COLOR) });
  const errors = [...result.errors];
  if (wire.stories.length !== count) errors.push(`expected ${count} stories, got ${wire.stories.length}`);
  const ids = new Set();
  const techniques = new Set();
  for (const s of wire.stories) {
    if (ids.has(s.id)) errors.push(`duplicate id: ${s.id}`); ids.add(s.id);
    if (!s.visualBeat || s.visualBeat.length < 12) errors.push(`${s.id}: missing useful visualBeat`);
    const t = wire.copy.en?.[s.id]?.technique;
    if (t && techniques.has(t)) errors.push(`${s.id}: repeated technique ${t}`);
    if (t) techniques.add(t);
  }
  if (!wire.stories.some(s => s.label === 'GAMES')) errors.push('programme has no GAMES bulletin');
  if (!wire.stories.some(s => s.label === 'CITY')) errors.push('programme has no CITY bulletin');
  return { ok: errors.length === 0, errors, warnings: result.warnings };
}

function helsinkiDate() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

async function main() {
  const argv = process.argv.slice(2);
  const value = flag => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
  const dryRun = argv.includes('--dry-run');
  const date = value('--date') || helsinkiDate();
  const count = Number(value('--count') || DEFAULT_COUNT);
  const feedOverride = value('--feeds');
  const feeds = feedOverride ? feedOverride.split(',').map(x => x.trim()).filter(Boolean) : FEEDS;

  console.log(`Radio Free Helsinki v2 — ${date} — ${count} bulletins`);
  const candidates = programmeCandidates(await collectCandidates(feeds), count);
  console.log(`  ${candidates.length} programmed candidates from ${feeds.length} feeds`);

  const editorial = await readFile(path.join(ROOT, 'EDITORIAL.md'), 'utf8');
  const programming = await readFile(path.join(ROOT, 'PROGRAMMING.md'), 'utf8');
  const source = candidates.map((x, i) => `${i + 1}. [${x.desk}] ${x.title}\n   ${x.summary}\n   SOURCE: ${x.source}`).join('\n\n');
  const system = `${editorial}\n\n---\n\n${programming}\n\n---\n\nYou are the RFH programming desk and writer. Preserve the editorial safety rules exactly.`;
  const user = `Build exactly ${count} bulletins for ${date}. Select a varied programme from these real source items.\n\n${source}\n\nRules specific to this pass:\n- LEAD is the strongest opening story, regardless of desk.\n- Include CITY and GAMES when suitable candidates exist.\n- Do not force SIGNAL if the available item is weak.\n- Make visual and broll choices semantically specific.\n- visualBeat must say what the viewer understands during DECODE, not merely describe motion.\n- All three languages are authored idiomatically, not translated mechanically.\n\n${schema()}`;

  const draft = parseJson(await ask(system, user));
  const wire = assemble(draft, date);
  const verdict = validateProgramme(wire, count);
  if (!verdict.ok) {
    for (const e of verdict.errors) console.error(`  ✗ ${e}`);
    throw new Error('programmed wire failed validation');
  }

  for (const s of wire.stories) console.log(`  ${String(s.label).padEnd(9)} ${s.id.padEnd(24)} ${s.visual.padEnd(10)} ${s.broll}`);
  if (dryRun) return;

  const dir = path.join(ROOT, 'wire');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${date}.json`), JSON.stringify(wire, null, 2) + '\n');
  const indexPath = path.join(dir, 'index.json');
  let index = { version: 1, station: 'Radio Free Helsinki', episodes: [] };
  if (existsSync(indexPath)) try { index = JSON.parse(await readFile(indexPath, 'utf8')); } catch {}
  const episodes = [...new Set([date, ...(index.episodes || [])])].sort((a, b) => b.localeCompare(a)).slice(0, 30);
  await writeFile(indexPath, JSON.stringify({ ...index, episodes }, null, 2) + '\n');
  console.log(`✓ wire/${date}.json`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
