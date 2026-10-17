// HD-007: no death screen may say "felled by something".
//
//   node hyperdagger/test/killers.mjs
//
// Bare node, no browser. Walks every killer key the code can set and asserts
// ENEMY_NAMES in js/main.js names each one:
//   - the third argument of every playerStruck(...) call: a string literal, or
//     `<x>.type`, which means every enemy type any module assigns;
//   - every string literal on the right of `lastKiller = ...`.
// A playerStruck killer argument of any other shape fails the check, so a new
// call site cannot slip past it unread.
import fs from 'node:fs';
import path from 'node:path';

const JS = path.resolve(import.meta.dirname, '../js');
const files = fs.readdirSync(JS).filter(f => f.endsWith('.js') && f !== 'voxel-lab.js');
const src = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(JS, f), 'utf8')]));
const main = src['main.js'];

let fails = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails++; };

// the name table, evaluated straight from the source
const lit = main.match(/const ENEMY_NAMES = (\{[\s\S]*?\n\});/);
ok(!!lit, 'ENEMY_NAMES found in main.js');
const NAMES = lit ? Function(`return ${lit[1]};`)() : {};

// enemy types: `this.type = 'x'` and `type: 'x'` anywhere in js/
const enemyTypes = new Set();
for (const s of Object.values(src))
  for (const m of s.matchAll(/(?:this\.type\s*=|\btype:)\s*'([a-z][\w ]*)'/g)) enemyTypes.add(m[1]);
// audio/three node types share the `.type =` spelling; they are not enemies
for (const t of ['lowpass', 'highpass', 'bandpass', 'sawtooth', 'square', 'sine', 'triangle']) enemyTypes.delete(t);

const keys = new Map();   // key -> where
const add = (k, where) => { if (!keys.has(k)) keys.set(k, where); };

for (const [f, s] of Object.entries(src)) {
  // playerStruck(sx, sz, killer, ref?) — split the top-level arguments
  for (const m of s.matchAll(/\bplayerStruck\(/g)) {
    if (/function\s+playerStruck\($/.test(s.slice(Math.max(0, m.index - 9), m.index + 13))) continue;
    let i = m.index + m[0].length, depth = 0, cur = '', args = [];
    for (; i < s.length; i++) {
      const c = s[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
      if (c === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    args.push(cur.trim());
    const line = s.slice(0, m.index).split('\n').length;
    const k = args[2] ?? '';
    const q = k.match(/^'([^']+)'$/);
    if (q) add(q[1], `${f}:${line}`);
    else if (/^\w+\.type$/.test(k)) for (const t of enemyTypes) add(t, `${f}:${line} (enemy type)`);
    else ok(false, `${f}:${line} playerStruck killer argument "${k}" is not a literal or <enemy>.type`);
  }
  // lastKiller = <expr>;
  for (const m of s.matchAll(/\blastKiller\s*=(?!=)([^;\n]*)/g)) {
    const line = s.slice(0, m.index).split('\n').length;
    for (const q of m[1].matchAll(/'([^']+)'/g)) add(q[1], `${f}:${line}`);
  }
}

ok(keys.size >= 15, `walked ${keys.size} killer keys`);
for (const k of ['thorn', 'orb', 'wave', 'rockfall', 'the road', 'the fall', 'skull', 'serpent', 'leviathan'])
  ok(keys.has(k), `walker sees '${k}'`);   // the walker itself cannot go blind
for (const [k, where] of [...keys].sort())
  ok(typeof NAMES[k] === 'string' && NAMES[k].trim() && NAMES[k] !== 'something',
    `'${k}' -> ${JSON.stringify(NAMES[k])}  (${where})`);

// the fallback path: 'something' only behind killerName, and it warns in dev
ok(!/ENEMY_NAMES\[lastKiller\]/.test(main), 'no death line reads ENEMY_NAMES[lastKiller] directly');
ok(/function killerName\(key\)[\s\S]{0,200}if \(DEV_BUILD\) console\.warn/.test(main), 'killerName warns on fallback in dev builds');
ok(!('__not_a_killer__' in NAMES), 'control: an unknown key is unnamed');

console.log(fails ? `\n${fails} FAILED` : '\nall killer keys named');
process.exit(fails ? 1 : 0);
