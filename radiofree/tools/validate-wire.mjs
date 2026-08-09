#!/usr/bin/env node
// Check a wire file without a browser.
//
//   node radiofree/tools/validate-wire.mjs [path/to/wire.json]
//
// Same validator the app runs on the download (`js/wire.js`), and the panel and
// footage key lists come from the modules that actually draw them — so this
// cannot drift from the build and then bless a wire the app will reject. No
// dependencies: an external author with node and a text editor has everything.
//
// Exit 0 = safe to publish. Exit 1 = the app would show the off-air card.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const target = path.resolve(process.argv[2] || path.join(ROOT, 'wire.json'));

const { validateWire, rotate, LANGS } = await import(path.join(ROOT, 'js/wire.js'));
// These import cleanly under node because neither touches the DOM at module
// scope — PixelScreen only reaches for `document` when one is constructed.
const { BROLL_KEYS } = await import(path.join(ROOT, 'js/visuals.js'));
const { SECTOR_COLOR } = await import(path.join(ROOT, 'js/palette.js'));

let wire;
try {
  wire = JSON.parse(await readFile(target, 'utf8'));
} catch (err) {
  console.error(`✗ ${path.relative(process.cwd(), target)}: ${err.message}`);
  process.exit(1);
}

const { ok, errors, warnings } = validateWire(wire, {
  brollKeys: BROLL_KEYS,
  sectorIds: Object.keys(SECTOR_COLOR),
});

const rel = path.relative(process.cwd(), target);
for (const w of warnings) console.warn(`  ! ${w}`);
for (const e of errors) console.error(`  ✗ ${e}`);

if (!ok) {
  console.error(`\n✗ ${rel}: ${errors.length} problem${errors.length === 1 ? '' : 's'} — the app would show the off-air card.`);
  process.exit(1);
}

// What will actually air, and in what order. An author adding a bulletin needs
// to see it land at the top before they publish, and an author archiving one
// needs to see it leave — neither is visible from the file, because the file is
// in whatever order it was edited in.
const { shown, archived } = rotate(wire);

const perChannel = new Map();
for (const s of shown) perChannel.set(s.sector, (perChannel.get(s.sector) || 0) + 1);
const bands = wire.sectors.map(s => `${s.call} ${perChannel.get(s.id) || 0}`).join(' · ');

console.log(`✓ ${rel}: ${shown.length} on air (${bands}), ${LANGS.join('/')} complete`
  + `${archived.length ? `, ${archived.length} archived` : ''}`
  + `${warnings.length ? `, ${warnings.length} warning${warnings.length === 1 ? '' : 's'}` : ''}`);

console.log('\n  the rotation, top first:');
for (const [i, st] of shown.entries()) {
  const head = (wire.copy?.en?.[st.id]?.head || '').slice(0, 46);
  console.log(`  ${String(i + 1).padStart(2, '0')}  ${(st.filed || '   backlog').padEnd(10)}  `
    + `${st.sector.padEnd(8)}  ${st.id.padEnd(22)}  ${head}`);
}
if (archived.length) {
  console.log('\n  archived (still on the wire, off the rotation):');
  for (const id of archived) console.log(`      ${id}`);
}
