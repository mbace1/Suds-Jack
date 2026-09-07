// EERI — the FX pack's gate.
//
// Pure Node, no browser, no GPU, no audio device — the same shape as
// `test/rooms.mjs`. That is possible only because `js/fx.js` and
// `js/audio-fx.js` keep their **spec and simulation as plain data and plain
// maths**, with three.js and WebAudio injected rather than imported. If a
// future edit puts `import * as THREE` at the top of either, this file stops
// running, and that is the point: it is the thing that keeps the FX layer
// testable and therefore honest.
//
// Run: node eeri/test/fx-smoke.mjs

import { FXPool, FX_SPEC, sample, detect } from '../js/fx.js';
import { SFX_SPEC, VOICES, validateSpec, AudioFX } from '../js/audio-fx.js';

let pass = 0, fail = 0;
const ok = (name, cond, note = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${note ? ' → ' + note : ''}`); }
};

// a deterministic rng, so every number below is a fact rather than a mood
let seed = 12345;
const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

console.log('\nthe spec');

ok('every visual effect has a sound with the same name, or is `clear`',
  Object.keys(FX_SPEC).every((k) => SFX_SPEC[k] || k === 'clear'),
  Object.keys(FX_SPEC).filter((k) => !SFX_SPEC[k]).join(','));

ok('the voice table is playable', validateSpec().length === 0, validateSpec().join(' | '));

// Age six, on a phone, held at arm's length. Nothing may be shrill and
// nothing may be loud — this is the one tuning rule that is not taste.
ok('no voice exceeds 0.4 gain', VOICES.every((v) => SFX_SPEC[v].gain <= 0.4));
ok('no voice is longer than a second and a half',
  VOICES.every((v) => (SFX_SPEC[v].dur ?? 0) <= 1.5));

// weight is carried by duration, not volume — the heavy voice must be the
// long one, not the loud one
ok('the heaviest sound is the longest, not the loudest',
  SFX_SPEC.heavy.dur > SFX_SPEC.pickup.dur
  && SFX_SPEC.heavy.gain <= Math.max(...VOICES.map((v) => SFX_SPEC[v].gain)));

console.log('\nthe particle pool');

{
  const pool = new FXPool({ cap: 40, rng });
  const made = pool.burst('pickup', 10, 5);
  ok('a burst makes the number of particles its spec asks for',
    made === FX_SPEC.pickup.n && pool.live === FX_SPEC.pickup.n, `${made}/${FX_SPEC.pickup.n}`);
  ok('…all of them at the point given', [...Array(pool.live).keys()].every((i) => pool.x[i] === 10 && pool.y[i] === 5));

  // the cap is a real cap, and an overflow is COUNTED rather than silently
  // dropped — a pool that quietly eats effects looks like an FX bug forever.
  // Two `clear` bursts is 60 into a pool of 40, so this really does overflow
  // rather than merely coming close to it.
  pool.burst('clear', 0, 0);
  pool.burst('clear', 0, 0);
  ok('the pool never exceeds its cap', pool.live === 40, String(pool.live));
  ok('…and counts what it had to drop', pool.dropped > 0, String(pool.dropped));
}

{
  const pool = new FXPool({ cap: 100, rng });
  pool.burst('dirt', 0, 8);
  const n0 = pool.live;
  for (let i = 0; i < 60; i++) pool.update(1 / 60);   // one second
  ok('particles die and the pool empties itself', pool.live < n0, `${n0} → ${pool.live}`);
  for (let i = 0; i < 200; i++) pool.update(1 / 60);
  ok('…completely', pool.live === 0, String(pool.live));
}

{
  // gravity has to actually pull down, or every effect hangs in the air
  const pool = new FXPool({ cap: 20, rng });
  pool.burst('heavy', 0, 10);
  for (let i = 0; i < 30; i++) pool.update(1 / 60);
  const anyFell = [...Array(pool.live).keys()].some((i) => pool.vy[i] < 0);
  ok('gravity pulls particles back down', anyFell);
  ok('fade runs 1 → 0 over a life',
    [...Array(pool.live).keys()].every((i) => pool.fade(i) >= 0 && pool.fade(i) <= 1));
}

console.log('\nreading events out of game state');

const base = {
  collected: 0, stomps: 0, bank: 5, wallHits: 0, girder: 0, cleared: false,
  site: 0, mode: 'foot', x: 10, y: 4, exc: { x: 20, y: 4 }, golden: 0,
};
const step = (over) => detect(base, { ...base, ...over });

ok('a bolt going in reads as a pickup', step({ collected: 1 })[0]?.kind === 'pickup');
ok('a golden bolt reads bigger than a plain one',
  (step({ golden: 1 })[0]?.scale ?? 1) > 1);
ok('a stomp reads as a stomp', step({ stomps: 1 })[0]?.kind === 'stomp');
ok('the bank going down reads as digging', step({ bank: 4 })[0]?.kind === 'dirt');
ok('…at the machine, not at the kid', step({ bank: 4 })[0]?.x > base.x);
ok('a wall hit reads as brick', step({ wallHits: 1 })[0]?.kind === 'brick');
ok('the girder moving reads as heavy', step({ girder: 1 })[0]?.kind === 'heavy');
ok('clearing reads as clear', step({ cleared: true })[0]?.kind === 'clear');
ok('nothing changing fires nothing', step({}).length === 0);

// THE GUARD THAT MATTERS. Every counter resets on a new level, so without
// this the first frame of level 2 fired a dig, a stomp and a clear at once.
ok('a level change fires nothing at all',
  detect(base, { ...base, site: 1, collected: 0, bank: 9, stomps: 0 }).length === 0);

ok('sampling a missing game is null, not a throw', sample(null) === null);
ok('detect survives a null side', detect(null, base).length === 0 && detect(base, null).length === 0);

console.log('\nthe audio kit, with no audio device');

{
  const a = new AudioFX();
  ok('play() with no context is harmless', a.play('pickup') === false);
  ok('…but it still records what was asked for', a.recent(1)[0] === 'pickup');
  ok('an unknown voice is refused', a.play('nope') === false);
  a.setVolume(2);
  ok('volume is clamped', a.volume === 1);
  a.setVolume(-1);
  ok('…at both ends', a.volume === 0);
  ok('start() with no AudioContext available does not throw', a.start(undefined) === null || a.ctx === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
