#!/usr/bin/env node
// Radio Free Helsinki — promote one validated episode to the live wire.
// The dated episode is canonical. If validation fails, nothing is written.

import { readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const WIRE_DIR = path.join(ROOT, 'wire');
const KEEP_EPISODES = Number(process.env.RFH_KEEP_EPISODES || 30);

const { validateWire } = await import(path.join(ROOT, 'js/wire.js'));
const { PANEL_KEYS, BROLL_KEYS } = await import(path.join(ROOT, 'js/visuals.js'));
const { SECTOR_COLOR } = await import(path.join(ROOT, 'js/palette.js'));

function helsinkiDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

function args(argv) {
  const out = { date: null, checkOnly: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--date') out.date = argv[++i];
    else if (argv[i] === '--check') out.checkOnly = true;
  }
  return out;
}

async function atomicJson(file, value) {
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n');
  await rename(tmp, file);
}

async function main() {
  const opt = args(process.argv.slice(2));
  const date = opt.date || helsinkiDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`invalid date: ${date}`);

  const episodePath = path.join(WIRE_DIR, `${date}.json`);
  if (!existsSync(episodePath)) throw new Error(`canonical episode missing: wire/${date}.json`);

  const episode = JSON.parse(await readFile(episodePath, 'utf8'));
  if (episode.date !== date) throw new Error(`episode date ${episode.date} does not match filename ${date}`);

  const verdict = validateWire(episode, {
    panelKeys: PANEL_KEYS,
    brollKeys: BROLL_KEYS,
    sectorIds: Object.keys(SECTOR_COLOR),
  });
  if (!verdict.ok) {
    throw new Error(`episode rejected; live wire unchanged:\n${verdict.errors.map(e => `  - ${e}`).join('\n')}`);
  }
  for (const w of verdict.warnings) console.warn(`! ${w}`);

  let index = { version: 1, station: 'Radio Free Helsinki', episodes: [] };
  const indexPath = path.join(WIRE_DIR, 'index.json');
  if (existsSync(indexPath)) {
    try { index = JSON.parse(await readFile(indexPath, 'utf8')); }
    catch { console.warn('! rebuilding unreadable wire/index.json'); }
  }
  const episodes = [...new Set([date, ...(index.episodes || [])])]
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, KEEP_EPISODES);

  if (opt.checkOnly) {
    console.log(`✓ wire/${date}.json validates; would promote ${episode.stories.length} stories`);
    return;
  }

  // Promote fallback first and archive pointer last. If interrupted, the app can
  // only see an old index with a newer valid fallback, never a pointer to bad data.
  await atomicJson(path.join(ROOT, 'wire.json'), episode);
  await atomicJson(indexPath, { ...index, version: 1, station: 'Radio Free Helsinki', episodes });

  console.log(`✓ promoted wire/${date}.json → wire.json; ${episodes.length} archived episodes`);
}

await main().catch(err => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
