// The Game of Life — string gate. No browser, no dependencies:
//   node gameoflife/test/check_strings.mjs
//
// A missing string is the one kind of breakage this project cannot see at
// runtime: t() falls back to English, then to the key itself, so an experience
// with no strings still renders — showing the player 'sd.s1' where a sentence
// should be. That shipped once. This gate closes it.
//
// It checks three things:
//   1. every key exists in all three languages (no half-translated string)
//   2. every experience module in js/experiences/ is registered in main.js
//   3. every key an experience asks for by name exists — including its own
//      name/desc, which the hub needs before it can offer it at all
//
// Keys built at runtime (t(`sd.day${n}`)) cannot be read statically; those are
// covered by playing the experience in test/smoke.cjs.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LANGS, keysOf, has } from '../js/i18n.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(HERE, '..', 'js');
const CODES = LANGS.map(l => l.code);

let failures = 0;
function check(name, cond, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond || !detail ? '' : ` — ${detail}`}`);
  if (!cond) failures++;
}

// 1. the three catalogues line up
const en = keysOf('en');
check('the catalogue is not empty', en.length > 100, `${en.length} keys`);
for (const code of CODES) {
  const missing = en.filter(k => !has(code, k));
  const extra = keysOf(code).filter(k => !en.includes(k));
  check(`${code} has every English key`, missing.length === 0, missing.slice(0, 6).join(', '));
  check(`${code} has no key English lacks`, extra.length === 0, extra.slice(0, 6).join(', '));
}

// 2. every module is registered, and the registry has no ghosts
const main = readFileSync(path.join(JS, 'main.js'), 'utf8');
const registry = (main.match(/const REGISTRY = \[([^\]]+)\]/) ?? [, ''])[1]
  .split(',').map(s => s.trim()).filter(Boolean);
const files = readdirSync(path.join(JS, 'experiences')).filter(f => f.endsWith('.js'));

const experiences = files.map(f => {
  const src = readFileSync(path.join(JS, 'experiences', f), 'utf8');
  const id = (src.match(/\bid:\s*'([^']+)'/) ?? [])[1];
  const kind = (src.match(/\bkind:\s*'([^']+)'/) ?? [])[1];
  const name = path.basename(f, '.js');
  return { file: f, name, id, kind, src };
});

for (const e of experiences) {
  check(`${e.file} declares an id and a kind`, !!e.id && !!e.kind, `id=${e.id} kind=${e.kind}`);
  check(`${e.file} is imported by main.js`, main.includes(`experiences/${e.file}?`));
  check(`${e.name} is in the REGISTRY`, registry.includes(e.name));
}
check('the REGISTRY has no unknown entries',
  registry.every(r => experiences.some(e => e.name === r)),
  registry.filter(r => !experiences.some(e => e.name === r)).join(', '));

// 3. every string an experience asks for by name, plus the hub's own two
for (const e of experiences) {
  const wanted = new Set([`exp.${e.id}.name`, `exp.${e.id}.desc`]);
  for (const m of e.src.matchAll(/\bt\('([^']+)'\)/g)) wanted.add(m[1]);
  const gaps = [];
  for (const key of wanted) for (const code of CODES) if (!has(code, key)) gaps.push(`${code}:${key}`);
  check(`${e.id} has all ${wanted.size} of its strings`, gaps.length === 0, gaps.slice(0, 8).join(', '));
}

// the imports inside an experience must carry the same ?v= as the ones main.js
// uses, or the browser loads a second copy of pixel.js/palette.js alongside it
const version = (main.match(/\.\/i18n\.js\?v=(\d+)/) ?? [])[1];
for (const e of experiences) {
  const versions = [...e.src.matchAll(/\?v=(\d+)/g)].map(m => m[1]);
  check(`${e.id} imports at ?v=${version}`, versions.every(v => v === version),
    [...new Set(versions)].join(', '));
}

console.log(failures ? `\n${failures} FAILED` : '\nall string checks passed');
process.exit(failures ? 1 : 0);
