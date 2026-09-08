#!/usr/bin/env node
// shader-lint.mjs — the floor shader must survive a phone.
//
// v240 shipped `mix(1e5, -1e5, …)` in FLOOR_FRAG. Fine on a desktop GPU. On a
// phone, fragment floats are often mediump — a 16-bit half whose largest
// finite value is 65504 — so 1e5 is Inf, mix() computes 0 * (-Inf) = NaN, and
// mix(col, NaN, 0.0) is NaN as well: the shape pass being OFF did not save
// it. Every floor pixel rendered white, in every mode, and no gate caught it
// because every gate runs on SwiftShader, which is 32-bit everywhere.
//
// This cannot run a phone GPU either. What it CAN do is refuse the class of
// mistake: any float literal in the two floor shaders (the GLSL string and
// the TSL graph — the same maths twice, by design) whose magnitude exceeds
// the half-float range. Bare node, no browser.
import { readFileSync } from 'node:fs';

const HALF_MAX = 65504;
const src = readFileSync(new URL('../toko-drop/js/main.js', import.meta.url), 'utf8');

const slice = (from, to, name) => {
  const i = src.indexOf(from);
  if (i < 0) { console.error(`✘ could not find ${name} (${from})`); process.exit(1); }
  const j = src.indexOf(to, i);
  return src.slice(i, j < 0 ? src.length : j);
};
const regions = [
  ['FLOOR_FRAG (GLSL)', slice('const FLOOR_FRAG = `', '`;', 'FLOOR_FRAG')],
  ['makeFloorMat() (TSL)', slice('function makeFloorMat()', '\nconst floor = ', 'makeFloorMat')],
];

let checks = 0, fails = 0;
for (const [name, body] of regions) {
  // strip comments so an explanation of the bug does not trip the lint
  const code = body.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const lits = code.match(/(?<![\w.])-?\d+(?:\.\d+)?(?:e[+-]?\d+)?(?![\w.])/gi) ?? [];
  const big = lits.filter(l => Math.abs(parseFloat(l)) > HALF_MAX);
  checks++;
  if (big.length) {
    fails++;
    console.error(`✘ ${name}: ${big.length} literal(s) outside half-float range (|x| > ${HALF_MAX}): ${[...new Set(big)].join(', ')}`);
  } else {
    console.log(`  ok  ${name}: ${lits.length} literals, all within ±${HALF_MAX}`);
  }
}
// the two paths must carry the same sentinel, or one renderer draws a different floor
const g = regions[0][1].match(/mix\((-?[\d.e]+),\s*(-?[\d.e]+),\s*uShapeMode\.y\)/);
const t = regions[1][1].match(/mix\(float\((-?[\d.e]+)\),\s*float\((-?[\d.e]+)\),\s*M\.y\)/);
checks++;
if (g && t && g[1] === t[1] && g[2] === t[2]) console.log(`  ok  GLSL and TSL agree on the sentinel (${g[1]})`);
else { fails++; console.error(`✘ GLSL and TSL sentinels differ: ${g?.[1]} vs ${t?.[1]}`); }

console.log(`${checks - fails}/${checks} shader lint checks passed`);
if (fails) { console.error('✘ FAILED — this floor would go white on a mediump GPU'); process.exit(1); }
console.log('✔ the floor shader fits a half float');
