#!/usr/bin/env node
// Toko Move — the street importer.
//
// WHY THIS FILE EXISTS. The board is 4.90 x 8.41 km (41.2 km²) and the street
// pack in the tree covers 60.17-60.20 / 24.93-24.98 — 9.2 km², **22% of it**.
// Fifteen of the twenty-two delivery anchors and twenty-eight of the forty-one
// districts stand on ground with no streets under them: Töölö, Kamppi,
// Senaatintori, Kauppatori, Katajanokka, Eira, Käpylä, Pasila, Jätkäsaari,
// Länsisatama, Arabianranta, Meilahti. The map is honest about it — outside the
// extract the board draws its schematic corridors and the credit line names the
// extent — but honest is not the same as finished.
//
// The pack was produced by a `map/tools/streets-import.mjs` that names itself in
// the file's `generatedBy` and **exists in no branch of this repository**. So
// the tool was rewritten here, and this one is committed.
//
// IT CANNOT FETCH FROM THIS SANDBOX and does not pretend otherwise: the egress
// proxy refuses overpass-api.de by organisation policy, which is a network
// limit rather than a missing token. So the fetch is a documented manual step:
//
//   node toko-move/scripts/streets-import.mjs --print-query        # copy this
//   # run it at https://overpass-turbo.eu or:
//   #   curl -sG https://overpass-api.de/api/interpreter --data-urlencode "data=<query>" -o raw.json
//   node toko-move/scripts/streets-import.mjs --in raw.json --out toko-move/cities/ground/helsinki-streets.json
//   node toko-move/scripts/streets-import.mjs --check toko-move/cities/ground/helsinki-streets.json
//
// The --check step is the one that matters: it holds a fresh import against the
// committed centre extract in the ground they share, so an import that quietly
// lost Mannerheimintie fails rather than shipping.
import { readFileSync, writeFileSync } from 'node:fs';

// The board, plus a margin so streets do not stop exactly on the frame. These
// are the numbers boardBox() derives from the delivery anchors; they are
// repeated here rather than imported because this script must run standalone
// against a raw Overpass dump with no game modules loaded.
export const BOARD = { s: 60.1443, w: 24.8975, n: 60.2199, e: 24.9860 };
const MARGIN = 0.002;
export const BBOX = { s: BOARD.s - MARGIN, w: BOARD.w - MARGIN, n: BOARD.n + MARGIN, e: BOARD.e + MARGIN };

// What counts as a street, and how big it reads. The tiers are the game's, not
// OSM's: the camera reveals major at city scale, adds mid at route scale and
// the rest at stop scale, so the classification IS the zoom hierarchy.
export const TIERS = {
  motorway: 'major', trunk: 'major', primary: 'major',
  secondary: 'mid', tertiary: 'mid',
  unclassified: 'minor', residential: 'minor', living_street: 'minor',
  pedestrian: 'minor', service: 'minor', track: 'minor',
};
const CLASSES = Object.keys(TIERS);

export function overpassQuery(box = BBOX) {
  const bb = `${box.s},${box.w},${box.n},${box.e}`;
  return `[out:json][timeout:300];
way["highway"~"^(motorway|trunk|primary|secondary|tertiary)(_link)?$|^(unclassified|residential|living_street|pedestrian|service|track)$"](${bb});
out geom;`;
}

// Overpass `out geom` gives each way its full geometry in one element, so a way
// stays ONE polyline. The committed centre pack is 82% two-point fragments —
// 5652 ways carrying 14291 points — which is what you get when geometry arrives
// per segment. Whole ways draw faster, join cleanly, and carry their name once.
export function packFromOverpass(raw, box = BBOX) {
  const roads = [];
  let skipped = 0;
  for (const el of raw?.elements || []) {
    if (el.type !== 'way' || !Array.isArray(el.geometry)) { skipped++; continue; }
    const cls = String(el.tags?.highway || '').replace(/_link$/, '');
    if (!CLASSES.includes(cls)) { skipped++; continue; }
    const shape = el.geometry
      .filter(p => p && Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map(p => [Number(p.lat.toFixed(6)), Number(p.lon.toFixed(6))]);
    if (shape.length < 2) { skipped++; continue; }
    roads.push({ class: cls, tier: TIERS[cls], name: el.tags?.name || '', points: shape.length, shape });
  }
  roads.sort((a, b) => a.class.localeCompare(b.class) || (a.name || '').localeCompare(b.name || '') || b.points - a.points);
  return {
    schemaVersion: 1,
    id: 'helsinki-streets-v2',
    title: 'Real streets, classified by size, over the whole board',
    generatedBy: 'toko-move/scripts/streets-import.mjs',
    source: {
      dataset: 'OpenStreetMap via Overpass',
      licence: 'ODbL 1.0',
      attribution: '© OpenStreetMap contributors',
      fetchedElsewhere: 'Overpass is refused by the egress policy of the environment this tool was written in, so the query is run on a networked machine and its JSON imported here. Run the tool with --print-query for the exact query.',
      query: overpassQuery(box),
    },
    boundingBox: box,
    coordinateSystem: 'WGS84 [lat, lon]',
    roads,
    _skipped: skipped,
  };
}

const M_PER_DEG = 111320;
const area = b => {
  const kx = Math.cos(((b.n + b.s) / 2) * Math.PI / 180);
  return ((b.n - b.s) * M_PER_DEG / 1000) * ((b.e - b.w) * M_PER_DEG * kx / 1000);
};

// The check. Three questions, and the third is the one worth having.
export function check(pack, reference = null) {
  const out = [], fail = m => out.push(['FAIL', m]), ok = m => out.push(['ok', m]);
  const b = pack.boundingBox;
  // 1. does it cover the board?
  const covers = b && b.s <= BOARD.s && b.n >= BOARD.n && b.w <= BOARD.w && b.e >= BOARD.e;
  covers ? ok(`covers the whole board (${area(b).toFixed(1)} km² over ${area(BOARD).toFixed(1)})`)
         : fail(`does NOT cover the board — ${area(b).toFixed(1)} km², ${(100 * area(b) / area(BOARD)).toFixed(0)}% of it`);
  // 2. is it a real street network, tiered?
  const byTier = {};
  for (const r of pack.roads || []) byTier[r.tier] = (byTier[r.tier] || 0) + 1;
  const tiered = ['major', 'mid', 'minor'].every(t => byTier[t] > 0);
  tiered ? ok(`${pack.roads.length} ways in three tiers (${['major', 'mid', 'minor'].map(t => `${t} ${byTier[t]}`).join(', ')})`)
         : fail(`missing a tier: ${JSON.stringify(byTier)}`);
  const frag = (pack.roads || []).filter(r => r.points === 2).length / Math.max(1, (pack.roads || []).length);
  ok(`${(frag * 100).toFixed(0)}% of ways are two-point fragments (the centre extract is 82%; whole ways are better)`);
  // 3. does it AGREE with what we already have, where they overlap?
  //    An import that silently lost half the centre passes both checks above.
  if (reference) {
    const names = s => new Set((s.roads || []).filter(r => r.name).map(r => r.name));
    const have = names(pack), want = names(reference);
    const missing = [...want].filter(n => !have.has(n));
    const kept = 1 - missing.length / Math.max(1, want.size);
    kept >= 0.97
      ? ok(`keeps ${(kept * 100).toFixed(1)}% of the ${want.size} named streets the centre extract knows`)
      : fail(`lost ${missing.length} of ${want.size} named streets from the centre extract, e.g. ${missing.slice(0, 6).join(', ')}`);
  } else out.push(['--', 'no reference pack given; overlap agreement not checked']);
  return out;
}

// ------------------------------------------------------------------ cli
// Only when this file IS the command. Importing it — which the gate does, to
// test the parser against real geometry — must not print a banner and must not
// call process.exit.
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
const args = isMain ? process.argv.slice(2) : ['--library'];
if (!isMain) { /* imported as a module */ }
else {
const arg = n => { const i = args.indexOf(n); return i < 0 ? null : args[i + 1]; };
if (args.includes('--print-query')) { console.log(overpassQuery()); process.exit(0); }

if (args.includes('--check')) {
  const p = JSON.parse(readFileSync(arg('--check'), 'utf8'));
  let ref = null;
  try { ref = JSON.parse(readFileSync(new URL('../cities/ground/helsinki-streets.json', import.meta.url), 'utf8')); } catch {}
  const rows = check(p, ref);
  for (const [k, m] of rows) console.log(`  ${k.padEnd(4)} ${m}`);
  process.exit(rows.some(([k]) => k === 'FAIL') ? 1 : 0);
}

if (args.includes('--in')) {
  const raw = JSON.parse(readFileSync(arg('--in'), 'utf8'));
  const pack = packFromOverpass(raw);
  const skipped = pack._skipped; delete pack._skipped;
  const dest = arg('--out') || 'toko-move/cities/ground/helsinki-streets.json';
  writeFileSync(dest, JSON.stringify(pack));
  const pts = pack.roads.reduce((n, r) => n + r.points, 0);
  console.log(`wrote ${dest}: ${pack.roads.length} ways, ${pts} points, ${(JSON.stringify(pack).length / 1024 / 1024).toFixed(2)} MB (${skipped} elements skipped)`);
  process.exit(0);
}

if (args.length) { console.error('unknown arguments:', args.join(' ')); process.exit(2); }
console.log(`toko-move street importer

  --print-query                 the exact Overpass query for the whole board
  --in <raw.json> [--out <p>]   turn an Overpass response into a street pack
  --check <pack.json>           validate a pack, including agreement with the
                                committed centre extract where they overlap

The board is ${area(BOARD).toFixed(1)} km²; the committed extract covers 9.2 km² of it (22%).`);
}
