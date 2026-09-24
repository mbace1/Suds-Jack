#!/usr/bin/env node
// Radio Free Helsinki — the film plan, in bare node.
//
//   node radiofree/test/film.mjs
//
// `planFilm` is pure — no DOM, no canvas — which is what lets the timeline be
// asserted here for every bulletin on disk in every language, in a second.
// What this cannot see is the PICTURE: that is a contact sheet of decoded
// frames, and MOTION.md says what to look for.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { planFilm, shotAt, actAt, splitRuns, TIMING } = await import(path.join(RF, 'js', 'film.js'));
const { LANGS } = await import(path.join(RF, 'js', 'wire.js'));

let checks = 0, fails = 0;
const ok = (name, cond, detail = '') => {
  checks++;
  if (cond) { console.log('  ok   ' + name); return; }
  fails++;
  console.log('  FAIL ' + name + (detail ? '\n         ' + detail : ''));
};
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

const index = JSON.parse(fs.readFileSync(path.join(RF, 'wire', 'index.json'), 'utf8'));
const days = (index.episodes || []).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));

console.log('film plan');
const problems = [];
let plans = 0, longest = { S: 0 }, shortest = { S: 1e9 };
for (const day of days) {
  const wire = JSON.parse(fs.readFileSync(path.join(RF, 'wire', day + '.json'), 'utf8'));
  for (const story of wire.stories) {
    for (const lang of LANGS) {
      const copy = wire.copy[lang] && wire.copy[lang][story.id];
      if (!copy) continue;
      const tag = `${day}/${lang}/${story.id}`;
      const p = planFilm({ story, copy }, { index: 1, total: wire.stories.length, date: day });
      plans++;
      if (p.S > longest.S) longest = { S: p.S, tag };
      if (p.S < shortest.S) shortest = { S: p.S, tag };
      // ── the timeline is one piece ──
      for (let i = 1; i < p.shots.length; i++) {
        if (!near(p.shots[i].t0, p.shots[i - 1].t1)) problems.push(`${tag}: a gap between shots ${i - 1} and ${i}`);
      }
      if (!near(p.shots[0].t0, 0) || !near(p.shots[p.shots.length - 1].t1, p.S)) problems.push(`${tag}: the shots do not cover 0..S`);
      // ── neighbours differ ──
      for (let i = 1; i < p.shots.length; i++) {
        const a = p.shots[i - 1], b = p.shots[i];
        if (a.shot === b.shot && !!a.decoded === !!b.decoded) problems.push(`${tag}: two consecutive ${a.shot} shots`);
      }
      // ── the reveal is a cut into the decoded graphic, after the breath ──
      const rev = shotAt(p, p.reveal + 0.01);
      if (!(rev.shot === 'graphic' && rev.decoded)) problems.push(`${tag}: the reveal does not land on the decoded graphic`);
      const before = shotAt(p, p.reveal - 0.01);
      if (before.decoded) problems.push(`${tag}: decoded before the reveal`);
      if (!(before.t1 - before.t0 >= TIMING.breath - 1e-6)) problems.push(`${tag}: no breath before the reveal`);
      // ── one caption at a time, each for its budget, with a gap ──
      const caps = [...p.captions].sort((a, b) => a.t0 - b.t0);
      for (let i = 0; i < caps.length; i++) {
        const c = caps[i];
        const len = c.t1 - c.t0;
        const floor = c.kind === 'read' ? TIMING.readFloor : c.kind === 'tell' ? TIMING.tellFloor : TIMING.plainFloor;
        if (len < floor * TIMING.minScale - 1e-6) problems.push(`${tag}: ${c.kind} caption shorter than its floor (${len.toFixed(2)}s)`);
        if (i && c.t0 < caps[i - 1].t1 - 1e-6) problems.push(`${tag}: captions overlap at ${c.t0.toFixed(2)}s`);
        if (c.kind === 'pair' && c.t0 < p.holdStart - 1e-6) problems.push(`${tag}: a plain reading before the reveal`);
        if (c.kind === 'read' && c.t1 > p.reveal + 1e-6) problems.push(`${tag}: a broadcast caption runs into the reveal`);
      }
      // ── every struck span in the copy is a pair in the film ──
      const spans = (copy.lines || []).join(' ').match(/\{\{[^}]*\}\}/g) || [];
      const pairs = caps.filter(c => c.kind === 'pair').length;
      if (pairs !== spans.length) problems.push(`${tag}: ${spans.length} spans in the copy, ${pairs} pairs in the film`);
      // ── the headline arrives as runs, all of it, before the reveal ──
      const joined = p.runs.map(r => r.text).join(' ').replace(/\s+/g, '');
      const head = String(copy.head).replace(/[,;:—–\s-]/g, '').replace(/\s+/g, '');
      if (joined.replace(/[,;:—–。、！？-]/g, '') !== head.replace(/[。、！？]/g, '')) problems.push(`${tag}: the runs do not add back up to the headline`);
      if (p.runs.some(r => r.t > p.reveal)) problems.push(`${tag}: a headline run pops after the reveal`);
      if (p.runs.length > 4) problems.push(`${tag}: ${p.runs.length} runs`);
      // a number is never cut in half by a run break
      for (const num of String(copy.head).match(/\d[\d,\u00a0 ]*\d(?::\w+)?|\d/g) || []) {
        if (!p.runs.some(r => r.text.includes(num))) problems.push(`${tag}: the number "${num}" is split across runs`);
      }
      // ── the payoff is the technique, and the card ends the film ──
      if (p.payoff.text !== copy.technique) problems.push(`${tag}: the payoff word is not the technique`);
      if (!(p.payoff.t0 > p.reveal && p.payoff.t0 < p.holdEnd)) problems.push(`${tag}: the payoff is outside the hold`);
      const last = p.shots[p.shots.length - 1];
      if (last.shot !== 'card' || !near(last.t1 - last.t0, TIMING.card)) problems.push(`${tag}: the film does not end on the card`);
      // ── the take is Toko's own shot, between the reveal and the hold ──
      const ri = p.shots.findIndex(s => s.t0 === p.reveal);
      const r0 = p.shots[ri], tk = p.shots[ri + 1], hold = p.shots[ri + 2];
      if (!(r0 && r0.shot === 'graphic' && r0.decoded && tk && tk.shot === 'anchor' && tk.take && tk.decoded
            && hold && hold.shot === 'graphic' && hold.decoded && near(hold.t0, p.holdStart))) {
        problems.push(`${tag}: the reveal is not graphic → take → hold`);
      }
      // ── the palette arc: neighbours differ, amber only once decoded ──
      for (let i = 1; i < p.shots.length; i++) {
        if (p.shots[i].look === p.shots[i - 1].look && !(p.shots[i].decoded && p.shots[i - 1].decoded)) {
          problems.push(`${tag}: shots ${i - 1} and ${i} share the ${p.shots[i].look} look`);
        }
      }
      if (p.shots.some(s => !s.decoded && s.shot !== 'card' && s.look === 'amber')) problems.push(`${tag}: amber before DECODE`);
      if (p.shots.filter(s => !s.decoded).map(s => s.look).filter((v, i, a) => a.indexOf(v) === i).length < 3) {
        problems.push(`${tag}: fewer than three looks before the reveal`);
      }
      // ── Toko acts: he reads with the caption, blinks before the cut, takes on the reveal ──
      const rd = caps.find(c => c.kind === 'read');
      if (rd) {
        const mid = (rd.t0 + rd.t1) / 2;
        let moving = 0;
        for (let q = 0; q < 12; q++) if (actAt(p, mid + q / 30).mouth > 0.05) moving++;
        if (moving < 3) problems.push(`${tag}: his mouth does not move while he reads`);
        if (actAt(p, rd.t1 + 0.05).mouth > 0.001) problems.push(`${tag}: he talks into the gap`);
      }
      const anchorCut = p.shots.find(s => s.shot === 'anchor' && !s.decoded);
      if (anchorCut) {
        const a = actAt(p, anchorCut.t1 - 0.09);
        if (!(a.squash != null && a.squash < 0.2)) problems.push(`${tag}: no blink before the cut away from him (squash ${a.squash})`);
      }
      const tA = actAt(p, tk.t0 + 0.05), tB = actAt(p, tk.t0 + 0.45);
      if (!(tA.open === 0 && tB.open === 1 && tB.squash > 1 && tB.grin > 1.1 && tB.tilt < -0.05)) {
        problems.push(`${tag}: the take does not shut then pop wide (${JSON.stringify({ tA, tB })})`);
      }
      // ── figures reach the counter ──
      const hasFig = Array.isArray(story.figures) && story.figures.length > 0;
      if (hasFig !== !!p.counter) problems.push(`${tag}: figures ${hasFig ? 'present' : 'absent'} but the counter is ${p.counter ? 'on' : 'off'}`);
    }
  }
}
ok(`every bulletin on disk plans as a film (${plans} plans, ${days.length} mornings, ${LANGS.length} languages)`, plans > 0 && problems.length === 0,
   problems.slice(0, 8).join('\n         '));
ok('no clip is under ten seconds or over a minute', shortest.S >= 10 && longest.S <= 60,
   `shortest ${shortest.S.toFixed(1)}s ${shortest.tag} · longest ${longest.S.toFixed(1)}s ${longest.tag}`);

// ── a target compresses the budgets and reports the truth ──
{
  const wire = JSON.parse(fs.readFileSync(path.join(RF, 'wire', days[0] + '.json'), 'utf8'));
  const story = wire.stories[0], copy = wire.copy.en[story.id];
  const free = planFilm({ story, copy }, {});
  const tight = planFilm({ story, copy }, { seconds: 10 });
  ok('a target length compresses the reading budgets, never below the floor',
     tight.S < free.S && near(tight.scale, TIMING.minScale), `${free.S.toFixed(1)}s → ${tight.S.toFixed(1)}s at ×${tight.scale.toFixed(2)}`);
  const loose = planFilm({ story, copy }, { seconds: free.S + 5 });
  ok('and stretches toward a longer one', loose.S > free.S && loose.scale > 1, `${free.S.toFixed(1)}s → ${loose.S.toFixed(1)}s`);
  ok('the plan is the same twice — a pure function of its inputs',
     JSON.stringify(planFilm({ story, copy }, { seconds: 20 })) === JSON.stringify(planFilm({ story, copy }, { seconds: 20 })));
}

// ── word runs ──
ok('a headline breaks into runs at its own clauses',
   JSON.stringify(splitRuns("Next year's budget agreed at €92.5 billion, with the difference to be found later"))
   === JSON.stringify(["Next year's budget agreed at €92.5 billion", "with the difference to be found later"]));
ok('a thousands separator is not a clause break',
   JSON.stringify(splitRuns('Studio releases its first title today; 1,500,000 wishlists reported, sales to date 0'))
   === JSON.stringify(['Studio releases its first title today', '1,500,000 wishlists reported', 'sales to date 0']));
ok('nor is a Finnish case ending on a number',
   splitRuns('määrän ennustetaan nousevan 674 000:een vuoteen 2045 mennessä').some(r => r.includes('674 000:een')));
ok('a long clause is halved rather than left as one run',
   splitRuns('one two three four five six seven eight nine ten').length === 2);
ok('a Japanese headline breaks at its punctuation and after a particle, never inside a word',
   JSON.stringify(splitRuns('首都のクラブ、カップ決勝をホームで1点差で落とす。クラブは「学び」と表現'))
   === JSON.stringify(['首都のクラブ、', 'カップ決勝をホームで1点差で落とす。', 'クラブは「学び」と表現']));
ok('never more than four runs', splitRuns('a, b, c, d, e, f, g').length <= 4);

console.log(`\n${checks - fails}/${checks} passed`);
process.exit(fails ? 1 : 0);
