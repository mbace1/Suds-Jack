#!/usr/bin/env node
// Radio Free Helsinki — curate a balanced source packet before the writer sees it.
// Writes a small local RSS file consumed by generate-wire.mjs.

import { writeFile } from 'node:fs/promises';
import { parseFeed } from './generate-wire.mjs';
import { rankAndBalance } from './source-balance.mjs';

const DEFAULT_FEEDS = [
  'https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_NEWS',
  'https://www.gamesindustry.biz/feed',
  'https://feeds.arstechnica.com/arstechnica/technology-lab',
  'https://www.theregister.com/headlines.atom',
];

function args(argv) {
  const out = { output: '/tmp/rfh-curated.xml', limit: 10 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--output') out.output = argv[++i];
    else if (argv[i] === '--limit') out.limit = Number(argv[++i]);
  }
  return out;
}

const esc = s => String(s || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'radio-free-helsinki/1.0 (source curator)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

const opt = args(process.argv.slice(2));
const feeds = (process.env.RFH_FEEDS || DEFAULT_FEEDS.join(','))
  .split(',').map(s => s.trim()).filter(Boolean);
const all = [];
for (const url of feeds) {
  const source = new URL(url).hostname;
  try {
    const items = parseFeed(await fetchFeed(url), source);
    all.push(...items.slice(0, 16));
    console.log(`  · ${source}: ${items.length}`);
  } catch (err) {
    console.warn(`  ! ${source}: ${err.message}`);
  }
}
if (!all.length) throw new Error('no source feed could be read');

const selected = rankAndBalance(all, opt.limit);
console.log('\ncurated source packet');
for (const [i, item] of selected.entries()) {
  console.log(`  ${String(i + 1).padStart(2, '0')} ${String(item.quality).padStart(3)} ${item.topic.padEnd(8)} ${item.source.padEnd(24)} ${item.title}`);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n`
  + `<title>Radio Free Helsinki curated sources</title>\n`
  + selected.map(item => `<item><title>${esc(item.title)}</title><link>${esc(item.link)}</link>`
    + `<pubDate>${esc(item.when)}</pubDate><description>${esc(item.summary)}</description></item>`).join('\n')
  + `\n</channel></rss>\n`;
await writeFile(opt.output, xml);
console.log(`\n✓ ${selected.length} balanced headlines → ${opt.output}`);
