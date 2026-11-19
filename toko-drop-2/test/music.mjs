#!/usr/bin/env node
// music.mjs — the music (v58, js/music.js), in bare node. Two halves: the
// score itself (every song reads, every bar adds up, every world has its own
// song, the campaign's worlds land on the song that shares their rule, a held
// note never grinds a semitone against its chord, the layers stack), and the
// player on a fake audio context (test/lib/fakeaudio.mjs) that sees every
// node: nothing laid down in the past, nothing left running, everything
// through the music's bus, a hidden tab coming back without a burst, MUSIC
// off making nothing, a song changing fading out and going, and the cues —
// a rule's warning, a hit's flinch, the dark, the pause — doing what they say.
import { TUNING as T } from '../js/tuning.js?v=156';
import { compile, notesAt, parseChord, midiOf, parseBars, Music } from '../js/music.js?v=156';
import { FakeAudioContext, reaches } from './lib/fakeaudio.mjs';

const M = T.music;
let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };

// ── the score ────────────────────────────────────────────────────────────────
check('the notation reads: C4 is middle C, sharps and flats, chords and their tones',
  midiOf('C4') === 60 && midiOf('A4') === 69 && midiOf('C#5') === 73 && midiOf('Bb3') === 58 && midiOf('H4') === null
  && parseChord('Am').pcs.join() === '9,0,4' && parseChord('E7').pcs.join() === '4,8,11,2' && parseChord('A/G').bass === 7 && parseChord('F#m7').third === 3);
let threw = 0;
try { parseChord('Q7'); } catch { threw++; }
try { parseBars('A4:x'); } catch { threw++; }
check('a chord or a note that will not read is an error, not a silence', threw === 2);

const songs = Object.keys(M.songs), read = {};
for (const id of songs) { try { read[id] = compile(id); } catch (e) { check(`song ${id} reads`, false, e.message); } }
check('every song reads: every bar of every section adds up to the bar, every pattern is a bar long', Object.keys(read).length === songs.length, `${Object.keys(read).length}/${songs.length}`);
check('every arcade world has its song, in the worlds\' own order',
  M.byWorld.length === T.worlds.list.length && T.worlds.list.every((w, i) => M.byWorld[i] === w.id && read[w.id]), M.byWorld.join(' '));
check('every campaign world plays the song of the arcade world that shares its rule',
  T.campaign.worlds.every((wd) => read[M.byRule[wd.rule ?? 'none']] && (wd.rule == null || T.worlds.list.find((w) => w.id === M.byRule[wd.rule])?.rule === wd.rule)),
  T.campaign.worlds.map((wd) => `${wd.name}→${M.byRule[wd.rule ?? 'none']}`).join(', '));
check('and the title has its own', !!read.title && !M.byWorld.includes('title'));
// nine songs, nine of their own: no two share a tempo and a key, or a tune
const keyOf = (C) => `${C.S.bpm}:${C.tonic}`, tuneOf = (C) => C.a.lead.map((b) => b.notes.map((n) => n.midi).join()).join('|');
const ids = Object.values(read);
check('no two songs share a tempo and a key, or a tune', new Set(ids.map(keyOf)).size === ids.length && new Set(ids.map(tuneOf)).size === ids.length);
check('every world song has a boss section of its own', M.byWorld.every((id) => M.songs[id].boss && read[id].boss !== read[id].a));
// the tempo climbs, broadly, from the first world to the last (the deep and the river breathe slower)
check('the last world is the fastest and the first faster than the title', read.core.S.bpm === Math.max(...M.byWorld.map((id) => read[id].S.bpm)) && read.grid.S.bpm > read.title.S.bpm);

// A held note (a beat or longer) is never a semitone ABOVE one of its chord's
// tones without being one: that is the grind (F over an E chord). Shorter
// notes pass through anything; a semitone below (a major seventh) is colour.
const clashes = [], ranges = [];
for (const C of ids) for (const k of ['a', 'b', 'boss']) {
  const X = C[k];
  if (!X || (k === 'boss' && X === C.a)) continue;
  X.lead.forEach((bar, i) => {
    const ch = X.chords[i];
    for (const n of bar.notes) {
      if (n.midi == null) continue;
      if (n.midi < midiOf('E4') - 12 || n.midi > midiOf('A6')) ranges.push(`${C.id}.${k} bar ${i + 1}: ${n.midi}`);
      const pc = n.midi % 12;
      if (n.dur >= C.S.beat && !ch.pcs.includes(pc) && ch.pcs.some((t) => (pc - t + 12) % 12 === 1)) clashes.push(`${C.id}.${k} bar ${i + 1} (${ch.name}): midi ${n.midi} for ${n.dur} steps`);
    }
  });
}
check('no held lead note grinds a semitone over its chord', !clashes.length, clashes.join('; '));
check('every lead note sits where its wave speaks (E3 to A6)', !ranges.length, ranges.join('; '));

// the layers stack: across a whole loop, a level hears everything the one under it does, and more
const loop = (C, st, sec = null) => {
  const n = {};
  for (const k of sec ? [sec] : C.form) for (let b = 0; b < C[k].bars; b++) for (let s = 0; s < C.S.bar; s++)
    for (const ev of notesAt(C, k, b, s, st)) n[ev.part] = (n[ev.part] || 0) + 1;
  return n;
};
for (const C of ids) {
  const at = [0, 1, 2, 3, 4].map((level) => loop(C, { level, lull: false })), total = at.map((n) => Object.values(n).reduce((a, b) => a + b, 0));
  const grows = at.every((n, i) => i === 0 || Object.keys(at[i - 1]).every((p) => n[p] >= at[i - 1][p])) && total.every((x, i) => i === 0 || x > total[i - 1]);
  check(`${C.id}: each level adds to the one under it (${total.join(' → ')} notes a loop)`, grows, JSON.stringify(at));
  const quiet = at[0];
  check(`${C.id}: an empty floor with no heat is the harmony alone — no drums, no tune`, !quiet.kick && !quiet.snare && !quiet.hat && !quiet.lead && (quiet.pad || quiet.bass));
  const vel = (level) => { for (const k of C.form) for (let b = 0; b < C[k].bars; b++) for (let s = 0; s < C.S.bar; s++) { const e = notesAt(C, k, b, s, { level, lull: false }).find((x) => x.part === 'lead'); if (e) return e.vel; } return 0; };
  check(`${C.id}: the tune is there from level 1, quietly, and the heat brings it forward at ×2`, at[1].lead === at[2].lead && vel(1) === M.leadSoft && vel(2) === 1 && !at[0].lead);
  const lull = loop(C, { level: 4, lull: true });
  check(`${C.id}: a lull rests the drums and keeps the tune`, !lull.kick && !lull.snare && !lull.hat && !lull.ride && !lull.metal && lull.lead === at[4].lead);
  const urgent = loop(C, { level: 2, lull: false, urgent: true }, 'a');
  check(`${C.id}: a room's last seconds put a hat on every step`, urgent.hat === C.a.bars * C.S.bar - (C.S.drums.snare ? C.S.beat : 0) || urgent.hat === C.a.bars * C.S.bar, `${urgent.hat} hats in ${C.a.bars * C.S.bar} steps`);
}
// the boss section plays the boss's chords
{
  const C = read.grid, pads = [];
  for (let b = 0; b < C.boss.bars; b++) pads.push(notesAt(C, 'boss', b, 0, { level: 0 }).find((e) => e.part === 'pad').notes[0] % 12);
  check('a boss section is played on its own chords (THE GRID\'s: Am Bb Am E)', pads.join() === [9, 10, 9, 4].join(), pads.join());
}

// ── the player, on a fake context ────────────────────────────────────────────
const DT = 1 / 60;
function rig() {
  const ctx = new FakeAudioContext(), out = ctx.createGain(); out.connect(ctx.destination);
  const m = new Music(); m.attach(ctx, out);
  const run = (secs) => { for (let i = 0; i < Math.round(secs / DT); i++) { ctx.currentTime += DT; m.frame(); } };
  return { ctx, out, m, run };
}
{
  const { ctx, out, m, run } = rig();
  m.set({ song: 'grid', level: 3, lull: false });
  run(8);
  const S = ctx.sources;
  check('a song plays: notes made, laid down ahead of the clock', S.length > 200 && m.state().song === 'grid', `${S.length} sources`);
  check('nothing is laid down in the past', S.every((n) => n.started >= n.born - 1e-9), `${S.filter((n) => n.started < n.born - 1e-9).length} late`);
  check('everything that starts is stopped after it starts', S.every((n) => n.stopped != null && n.stopped > n.started));
  check('every voice goes through the music\'s bus into the master, never straight out', S.every((n) => reaches(n, m.bus) && reaches(n, out)) && !ctx.nodes.some((n) => n !== out && n.outs.includes(ctx.destination)));
  const ahead = m.cur.next - ctx.currentTime;
  check('the song is laid down about a lookahead ahead, no further', ahead > 0 && ahead <= M.lookahead + read.grid.step + 1e-9, `${ahead.toFixed(3)} s`);
  const rate = S.length / 8;
  check('it makes few enough sources a second for a phone (under 150 at level 3)', rate < 150, `${rate.toFixed(0)}/s`);

  // a hidden tab: the clock goes on without frames, and the song comes back where it would be, not in a burst
  const before = S.length, t0 = ctx.currentTime;
  ctx.currentTime += 6; m.frame();
  const burst = S.length - before;
  check('back from a hidden tab: no burst, and the song walked on to where it would be', burst < 40 && S.slice(before).every((n) => n.started >= ctx.currentTime - 1e-9) && m.cur.next >= ctx.currentTime, `${burst} sources in one frame, clock ${(m.cur.next - t0).toFixed(1)} s on`);

  // the level: a hit flinches the filter and drops the level at the next bar line
  m.set({ level: 4 }); run(4);
  check('the level rises with the heat', m.state().level === 4);
  m.cue('hurt'); m.set({ level: 1 }); run(0.05);
  const fl = m.cur.tone.frequency.events.filter((e) => e.type === 'target').at(-1);
  check('a hit makes the music flinch: its low-pass drops at once', fl && fl.v <= M.cut.hurt * 1.25, JSON.stringify(fl));
  run(read.grid.step * read.grid.S.bar + 0.4);
  check('…and the heat thrown away drops the level at the next bar line', m.state().level === 1, `level ${m.state().level}`);
  run(1.5);
  const back = m.cur.tone.frequency.events.filter((e) => e.type === 'target').at(-1);
  check('…and the low-pass opens again', back.v >= M.cut.open * 0.9, `${back.v.toFixed(0)} Hz`);

  // THE VOID's dark closes it; the pause ducks and muffles it
  m.set({ dark: 1 }); run(0.1);
  check('the dark closes the music\'s filter with it', m.cur.tone.frequency.events.filter((e) => e.type === 'target').at(-1).v <= M.cut.dark * 1.05);
  m.set({ dark: 0, duck: true }); run(0.1);
  check('the pause ducks the music and muffles it', m.cur.duck.gain.events.at(-1).v === M.duck.pause && m.cur.tone.frequency.events.filter((e) => e.type === 'target').at(-1).v <= M.duck.cut * 1.01);
  m.set({ duck: false }); run(0.1);
  check('…and resuming gives it back', m.cur.duck.gain.events.at(-1).v === 1);

  // a rule's warning: a riser over the warning's length, then the hit
  const n0 = ctx.sources.length;
  m.cue('warn', { t: 1.1 }); m.cue('fire');
  const fresh = ctx.sources.slice(n0), riser = ctx.nodes.find((n) => n.kind === 'filter' && n.frequency.events.some((e) => e.type === 'exp' && e.v === M.riser.f1));
  check('a sweep or an updraft coming swells a riser into its hit', !!riser && fresh.some((n) => n.stopped - n.started >= 1.1) && fresh.every((n) => reaches(n, m.bus)));

  // MUSIC off: the clock walks on and nothing is made
  m.setVolume(0); run(0.2);
  const quiet0 = ctx.sources.length; run(3);
  check('MUSIC off makes nothing at all, and the bus is at zero', ctx.sources.length === quiet0 && m.bus.gain.events.at(-1).v === 0);
  m.setVolume(1); run(1);
  check('…and on again it plays on from where the song is', ctx.sources.length > quiet0);

  // a song changes: the old one fades out and is let go; the new one starts from now
  const t1 = ctx.currentTime, was = m.cur;
  m.set({ song: 'river' }); run(0.1);
  check('a new song: the old one fades out under the new one fading in', m.state().song === 'river' && m.old.includes(was) && was.fade.gain.events.some((e) => e.type === 'lin' && e.v === 0));
  check('…and the new one starts from now', ctx.sources.filter((n) => n.born >= t1).every((n) => n.started >= t1 - 1e-9));
  run(5);
  check('…and the old one is let go once its echo has died away', !m.old.length && was.fade.outs.length === 0);

  // a boss: its section from the next bar line, and the song's top once it is gone
  m.set({ boss: true }); run(read.river.step * read.river.S.bar + 0.4);
  const inBoss = m.state().section;
  m.set({ boss: false }); run(read.river.step * read.river.S.bar + 0.4);
  check('a boss takes the song to its boss section, and the song comes back to its top after', inBoss === 'boss' && m.state().section === 'a', `${inBoss} → ${m.state().section}`);

  // a sting with no song playing still sounds, in the last song's key
  m.set({ song: null }); run(2);
  const s0 = ctx.sources.length;
  m.cue('over'); run(0.1);
  check('a game over\'s sting sounds with the song gone, through the bus', ctx.sources.length - s0 >= 4 && ctx.sources.slice(s0).every((n) => reaches(n, m.bus)));
  run(6);
  check('nothing is left playing once a song is gone', !m.cur && !m.old.length);
}
// the same song, the same say, the same notes
{
  const shot = () => {
    const { ctx, m, run } = rig();
    m.set({ song: 'boiler', level: 4, lull: false }); run(3);
    m.set({ boss: true }); run(3);
    return ctx.sources.map((n) => `${n.started.toFixed(4)}:${n.type ?? n.kind}:${n.frequency?.events[0]?.v?.toFixed(2) ?? ''}`).join('|');
  };
  check('it plays the same notes every time: nothing reads Math.random', shot() === shot());
}
// a song that will not read is said once and left out: the game goes on
{
  const { m, run } = rig(), errs = [], was = console.error;
  console.error = (e) => errs.push(e);
  m.set({ song: 'no-such-song', level: 2 });
  let ok = true;
  try { run(1); } catch { ok = false; }
  console.error = was;
  check('a song that will not read is reported once and left out, and the loop goes on', ok && errs.length === 1 && !m.cur);
}

console.log(failed ? `\n✗ music: ${failed} failed, ${passed} passed` : `✔ music: ${passed} checks`);
process.exit(failed ? 1 : 0);
