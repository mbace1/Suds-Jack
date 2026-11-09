// THE SEALED PARCEL (v2.71, NARRATIVE-TWISTS.md §1) — the pure half: which
// offer is sealed, what the notebook says, and that the notebook keeps.
//
//   node toko-move/test/sealed.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { NOTEBOOK, SEALED_NAME, KIOSK_COST, sealPick, noteFor, loadNotebook, addNote } from '../js/sealed.js';

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const fams = ['2', '6', '4'];

// ── 1. which offer
ok(sealPick(7, 0, fams) === -1, 'never on the first dispatch — the first job teaches, and stays as it was');
ok(sealPick(7, 2, fams) === -1, 'once per run: the second dispatch only');
for (let s = 0; s < 200; s++) { const i = sealPick(s, 1, fams); ok(i === 1 || i === 2, `seed ${s}: never the first offer listed (${i})`); }
ok(new Set([...Array(50).keys()].map(s => sealPick(s, 1, fams))).size === 2, 'the seed decides which of the others');
ok(sealPick(7, 1, ['2', 'M1', null]) === -1, 'only an offer whose last ride is a tram family — "ride the M1" names nothing');
ok(sealPick(7, 1, ['2', 'M1', '6']) === 2, 'and it finds the one that is');
ok(sealPick(7, 1, ['2']) === -1, 'a board of one offer has none to seal');

// ── 2. the notebook
ok(NOTEBOOK.length >= 10 && new Set(NOTEBOOK).size === NOTEBOOK.length, 'ten or more lines, no repeats');
ok(NOTEBOOK.every(l => /^[A-Z].*\.$/.test(l) && l.length < 60), 'each is one short sentence');
ok(!NOTEBOOK.some(l => /piritori|east of|toko/i.test(l)), 'none names a place the game does not have (Toko Move carries nothing of Piritori)');
ok(noteFor(0, 'Ooppera') === `Ooppera · ${NOTEBOOK[0]}`, 'a line is the stop and a sentence');
ok(noteFor(NOTEBOOK.length, 'Kamppi') === `Kamppi · ${NOTEBOOK[0]}`, 'and it goes round when the lines run out');
{ const mem = new Map(), s = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)) };
  ok(loadNotebook(s).length === 0, 'an empty notebook is empty');
  const a = addNote('Ooppera', s), b = addNote('Kamppi', s);
  ok(a === noteFor(0, 'Ooppera') && b === noteFor(1, 'Kamppi'), 'each drop writes the next line');
  ok(JSON.stringify(loadNotebook(s)) === JSON.stringify([a, b]), 'and the notebook keeps them in order');
  mem.set('tokoMoveNotebook', '{"broken":'); ok(loadNotebook(s).length === 0, 'a mangled notebook reads as empty, never a crash');
  mem.set('tokoMoveNotebook', '[1, "x", null]'); ok(JSON.stringify(loadNotebook(s)) === '["x"]', 'and keeps only lines'); }
{ const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  ok(loadNotebook(bad).length === 0 && typeof addNote('Eira', bad) === 'string', 'blocked storage does not stop a delivery'); }

// ── 3. the card and its prices
ok(KIOSK_COST === 400, 'the kiosk is +40 s (events.js prices every option in seconds: ticks / 10)');
ok(SEALED_NAME === 'SEALED', 'a sealed stop reads SEALED');
const src = fs.readFileSync(new URL('../js/sealed.js', import.meta.url), 'utf8');
ok(/"The label says: you'll know the stop\."/.test(src), 'the card is the bible\'s line');
ok(/Ride the \$\{fam\} and watch/.test(src) && /'Ask at the kiosk'/.test(src), 'and its two buttons');
const events = fs.readFileSync(new URL('../js/events.js', import.meta.url), 'utf8');
ok(/if\(o\.reveal\)ch\.revealSealed\?\.\(\)/.test(events), 'the kiosk button opens it (events.js choose)');

// ── 4. every line is in Finnish
const lang = fs.readFileSync(new URL('../js/lang.js', import.meta.url), 'utf8');
for (const l of [...NOTEBOOK, 'SEALED', 'NOTEBOOK', 'Ask at the kiosk']) ok(lang.includes(`'${l}':`) || lang.includes(`"${l}":`), `FI: "${l}"`);
ok(lang.includes("The label says: you'll know the stop."), 'FI: the card');

console.log(`  sealed: ${n} checks`);
