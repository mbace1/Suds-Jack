#!/usr/bin/env node
// playlog-check.mjs — the play reader counts what a person did (v268).
//
// Bare node, no browser. A scripted afternoon — two page loads, five plays —
// is driven through js/playlog.js's reader on a fake clock and a memory store,
// and the report is checked to the number. The rules pinned are the ones that
// decide whether the report tells the truth:
//   · a tab hidden mid-run and FINISHED later is not a quit; one that never
//     reports again is, once, however many times it was hidden first
//   · "went again" is about deaths — the next campaign room after a clear is
//     the campaign working, not a retry
//   · a pod family that was never offered is absent, not refused
//   · the shared site log gets one line per run and one per quit, no more
// Each rule also runs a NEGATIVE CONTROL: the records are altered so the rule
// would have to fire, and the check proves the number moves.
import { createReader, summarise, HEADLINES, STORE_MAX } from '../toko-drop/js/playlog.js';

let checks = 0, fails = 0;
const ok = (name, cond, info = '') => { checks++; if (!cond) { fails++; console.error(`✘ ${name} ${info}`); } else console.log(`  ok   ${name}`); };
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);

// one store for the whole afternoon, like localStorage; a clock we move by hand
let T = 0;
const mem = { v: [], read() { return this.v.map(r => ({ ...r })); }, write(v) { this.v = v; } };
const sent = [];
const send = (game, type, data) => sent.push({ game, type, ...data });
const at = s => { T = s * 1000; };

// ── page load 1 ─────────────────────────────────────────────────────────────
at(0);
let R = createReader({ now: () => T, store: mem, send });
// play 1 — arcade, 60 s, dies to a TORO in THE SURFACE
at(12);
R.start({ mode: 'arcade', world: 'THE SURFACE' });
R.wave(2, 'THE SURFACE'); R.wave(3, 'THE SURFACE');
for (let i = 0; i < 5; i++) R.kill(false);
R.podOffered('S'); R.podOffered('S'); R.podOffered('B');
R.podTaken('S'); R.podExpired();
R.gateOffered(); R.gateOffered();
R.hit(); R.bossMet();
at(72);
const r1 = R.end({ outcome: 'died', killer: 'TORO' });
eq('a run files its own seconds', r1.secs, 60);
eq('and what was offered, by family', r1.pods, { offered: { S: 2, B: 1 }, taken: { S: 1 }, expired: 1 });
ok('the reader is closed after the end', !R.live);
ok('a second end is a no-op', R.end({ outcome: 'died' }) === null);

// play 2 — went again 8 s later; pocketed mid-run, came back, and died in THE WELL
at(80);
R.start({ mode: 'arcade', world: 'THE SURFACE' });
R.wave(7, 'THE WELL');
at(100); R.abandon('hidden');
ok('a hidden tab leaves the run open', R.live);
at(130); R.kill(true); R.end({ outcome: 'died', killer: 'GLOBBO' });

// play 3 — 70 s later; reaches THE VEIN, then the phone is put away for good
at(200);
R.start({ mode: 'arcade', melee: true, world: 'THE SURFACE' });
R.wave(9, 'THE VEIN');
R.gateOffered(); R.gateDashed();
at(230); R.abandon('hidden');
at(231); R.abandon('leave');

// ── page load 2 ─────────────────────────────────────────────────────────────
at(1000);
R = createReader({ now: () => T, store: mem, send });
// the campaign list, read for 9 s; the room is cleared with an A
at(1004); R.pickOpened();
at(1013); R.picked('undertow');
R.start({ mode: 'campaign', room: 'undertow', goal: 'survive', world: 'THE WELL' });
R.podOffered('L');
at(1058); R.end({ outcome: 'clear', grade: 'A' });
// the next room 5 s later (a restart after a CLEAR); then a new run starts over a live one
at(1063);
R.start({ mode: 'campaign', room: 'eddy', goal: 'quota', world: 'THE WELL' });
at(1070);
R.start({ mode: 'tokotron' });                         // replaces the live 'eddy' run
at(1100); R.end({ outcome: 'died', killer: null });

const recs = mem.read();
const rep = summarise(recs);

// ── the report, to the number ────────────────────────────────────────────────
eq('record types, in order', recs.map(r => r.type),
   ['title', 'run', 'restart', 'abandon', 'run', 'restart', 'abandon', 'abandon',
    'pick', 'title', 'run', 'restart', 'abandon', 'run']);
eq('plays = finished runs + quits', [rep.plays, rep.runs, rep.quits], [6, 4, 2]);
eq('deaths', rep.deaths, 3);
eq('quit rate', rep.quitRate, 0.33);
eq('quits by world (the replaced run was in THE WELL)', rep.quitsByWorld, { 'THE VEIN': 1, 'THE WELL': 1 });
eq('quits by mode', rep.quitsByMode, { arcade: 1, campaign: 1 });
eq('deaths by world', rep.deathsByWorld, { 'THE SURFACE': 1, 'THE WELL': 1, '—': 1 });
eq('killers (a run with no killer is not a killer)', rep.killers, { TORO: 1, GLOBBO: 1 });
eq('went again: after deaths only', [rep.wentAgain, rep.cameBackWithin30s, rep.restartGapMedianS], [2, 1, 39]);
eq('title wait, one per page load', rep.titleWaitMedianS, 12.5);   // 12 s, and 13 s (the second load read the room list first)
eq('campaign pick', rep.campaignPickMedianS, 9);
eq('pods', rep.pods, { offered: { S: 2, B: 1, L: 1 }, taken: { S: 1 }, podsOffered: 4, podsTaken: 1, expired: 1, takeRate: 0.25, neverTaken: ['B', 'L'] });
eq('a family never offered is not "never taken"', rep.pods.neverTaken.includes('G'), false);
eq('gates', rep.gates, { offered: 3, dashed: 1, dashRate: 0.33 });
eq('bosses', rep.bosses, { met: 1, beat: 1 });
eq('minutes (finished runs + the quits\' last snapshots)', rep.minutes, +((60 + 50 + 31 + 45 + 7 + 30) / 60).toFixed(1));
// 2 quits in 6 is just under the line, 2 retries after 3 deaths is not under half,
// and 4 pods / 3 gates are too few to judge — so nothing is flagged
eq('headline: nothing past its line', rep.headline.id, 'ok');
eq('headline text', rep.headline.text, HEADLINES.ok());

// ── the shared log ───────────────────────────────────────────────────────────
eq('shared log: one line per run, one per quit', sent.map(s => s.type),
   ['run', 'abandon', 'run', 'abandon', 'run', 'abandon', 'run']);
ok('shared lines carry no per-run detail', sent.every(s => !('pods' in s) && !('runId' in s)));

// ── negative controls: each rule, made to fire ───────────────────────────────
{ // the pocketed-and-finished run: drop its 'run' record and it IS a quit
  const r2Id = recs.find(r => r.type === 'abandon' && r.reason === 'hidden').runId;
  const alt = summarise(recs.filter(r => !(r.type === 'run' && r.runId === r2Id)));
  eq('control: an unfinished hidden run counts as a quit', alt.quits, 3);
  eq('control: which moves the headline to quits', alt.headline.id, 'quit');
  eq('control: and names the world', alt.headline.text, HEADLINES.quit(3, 6, 'THE WELL'));
}
{ // a run hidden twice then gone is ONE quit, filed at its last snapshot
  const veinQuit = summarise(recs).quitsByWorld['THE VEIN'];
  eq('control: hidden then gone is one quit', veinQuit, 1);
}
{ // count a restart after a CLEAR as "went again" and the number must move
  const alt = summarise(recs.map(r => r.type === 'restart' && r.afterOutcome === 'clear' ? { ...r, afterOutcome: 'died' } : r));
  eq('control: a restart after a death is counted', alt.wentAgain, 3);
}
{ // three quits in five plays is past the line
  const extra = { type: 'abandon', runId: 'x', mode: 'arcade', world: 'THE KILN', reason: 'leave', secs: 10 };
  const alt = summarise([...recs, extra]);
  eq('control: 3 quits of 7 plays leads the headline', [alt.quits, alt.plays, alt.headline.id], [3, 7, 'quit']);
}
{ // pods: five offered, one taken
  const alt = summarise([{ type: 'run', runId: 'p', outcome: 'clear', secs: 1, pods: { offered: { R: 5 }, taken: { R: 1 }, expired: 4 } },
                         { type: 'run', runId: 'q', outcome: 'clear', secs: 1 }, { type: 'run', runId: 'r', outcome: 'clear', secs: 1 }]);
  eq('control: pods left on the floor lead when nothing else does', alt.headline.id, 'pods');
}
eq('nobody yet', summarise([]), { plays: 0, note: 'nobody has played yet' });
eq('too few', summarise(recs.slice(0, 2)).headline.id, 'few');

// ── the store is bounded ─────────────────────────────────────────────────────
{
  const big = { v: [], read() { return this.v; }, write(v) { this.v = v; } };
  const Rb = createReader({ now: () => T, store: big });
  for (let i = 0; i < STORE_MAX + 50; i++) { Rb.start({ mode: 'arcade' }); Rb.end({ outcome: 'died' }); }
  ok(`the store keeps the last ${STORE_MAX} records`, big.v.length === STORE_MAX, `got ${big.v.length}`);
}

console.log(fails ? `\n✘ playlog-check: ${fails} of ${checks} FAILED` : `\n✔ playlog-check: ${checks} checks green`);
process.exit(fails ? 1 : 0);
