#!/usr/bin/env node
// lines-diff.mjs — how the grade lines move between two versions (v56): every
// campaign room's S / A / B / C, on the normal route and on HARD PAIN, and
// every world boss's S / A / B, read from the levels and tuning/bossfights.js
// at a git revision and as they stand now, as Markdown. Given the
// `room-tiers.mjs --json` reports of both sides it adds how often each skill
// got through and whether the room sits in its difficulty band.
//
//   node scripts/lines-diff.mjs main > LINES.md
//   node scripts/lines-diff.mjs main --old old.json --new new.json --old-hard oh.json --new-hard nh.json
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { TUNING as T } from '../js/tuning.js?v=163';
import { BOSS_TIERS } from '../js/tuning/bossfights.js?v=163';
import { BANDS } from './lines.mjs';

const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const REV = args.find((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')) ?? 'main';
const ROOT = new URL('..', import.meta.url).pathname;
const atRev = (path) => execFileSync('git', ['show', `${REV}:${path}`], { cwd: ROOT, encoding: 'utf8' });
const now = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const json = (p) => (p ? Object.fromEntries(JSON.parse(readFileSync(p, 'utf8')).map((r) => [r.id, r])) : null);
const reports = { old: json(opt('--old')), new: json(opt('--new')), oldHard: json(opt('--old-hard')), newHard: json(opt('--new-hard')) };

const k = (v) => (v == null ? '–' : v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : String(v));
const lines = (t) => (t ? `${k(t.S)} / ${k(t.A)} / ${k(t.B)} / ${k(t.C)}` : 'not tiered');
const move = (a, b) => (a && b && a > 0 ? `${b >= a ? '+' : ''}${Math.round(((b - a) / a) * 100)}%` : '–');
const pass = (r) => (r ? ['sharp', 'average', 'rough'].map((s) => Math.round((r.pass[s] ?? 0) * 100)).join(' / ') : '–');
const band = (d, r) => {
  if (!r) return '';
  const b = BANDS.find((x) => d >= x.d[0] && d <= x.d[1]), off = [];
  for (const s of ['average', 'rough']) { const p = r.pass[s] ?? 0, [lo, hi] = b[s]; if (p < lo - 1e-9) off.push(`${s} too hard`); else if (p > hi + 1e-9) off.push(`${s} too easy`); }
  return off.length ? off.join(', ') : 'in band';
};

const out = [`# The grade lines, ${REV} → now`, ''];
for (const [route, key, oldR, newR] of [['CAMPAIGN', 'tiers', reports.old, reports.new], ['HARD PAIN', 'tiersHard', reports.oldHard, reports.newHard]]) {
  // HARD PAIN is the mode you choose to be hard in: it is tiered whatever its pass rates, and held to no band
  const banded = key === 'tiers';
  out.push(`## ${route}`, '', `| # | Room | d | Lines then (S / A / B / C) | Lines now | S moves | Through then (sharp / avg / rough %) | Through now |${banded ? ' Band now |' : ''}`, `|---|---|---|---|---|---|---|---|${banded ? '---|' : ''}`);
  let i = 0;
  for (const wd of T.campaign.worlds) for (const { id } of wd.rooms) {
    i++;
    const before = JSON.parse(atRev(`levels/${id}.json`)), after = JSON.parse(now(`levels/${id}.json`));
    const a = before[key], b = after[key];
    out.push(`| ${i} | ${after.name} | ${after.plan.d} | ${lines(a)} | ${lines(b)} | ${move(a?.S, b?.S)} | ${pass(oldR?.[id])} | ${pass(newR?.[id])} |${banded ? ` ${band(after.plan.d, newR?.[id])} |` : ''}`);
  }
  out.push('');
}
const src = atRev('js/tuning/bossfights.js'), was = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1));
out.push('## ARCADE BOSSES (seconds to the kill)', '', '| World | Boss | Lines then (S / A / B) | Lines now | S moves |', '|---|---|---|---|---|');
for (const w of Object.keys(BOSS_TIERS).sort((x, y) => x - y)) for (const [boss, t] of Object.entries(BOSS_TIERS[w])) {
  const o = was[w]?.[boss];
  out.push(`| ${w} | ${boss} | ${o ? `${o.S} / ${o.A} / ${o.B}` : '–'} | ${t.S} / ${t.A} / ${t.B} | ${move(o?.S, t.S)} |`);
}
console.log(out.join('\n'));
