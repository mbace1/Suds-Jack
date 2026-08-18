// Kindling — the errand: what happens when you send it out.
//
// This is the loop's outward half. You do a small real thing, the fire takes it,
// and the fire buys an outing you do not watch: the creature is gone for a
// minute and a half of real time whether the tab is open or not, and comes back
// with two lines about where it went and, often, something for the shelf.
//
// Two decisions worth keeping:
//
//  * The outcome is SEEDED AT DEPARTURE and computed on return. The errand
//    survives a reload — closing the tab and coming back to find it home is the
//    good feeling, and a result rolled on arrival would change every time the
//    page was refreshed.
//  * It is never a failure. There is no bad outing, nothing is lost out there,
//    and an errand that brings nothing home still brings back the walk. A care
//    app that can punish you for looking away has forgotten what it is for.

import { PAL } from './palette.js?v=10';

export const ERRAND_MS = 90 * 1000;

// seeded RNG — an errand you cannot reproduce is a bug in a costume
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WHERE = [
  'down to the birch line',
  'along the ditch behind the shed',
  'up the hill while the light held',
  'as far as the culvert and back',
  'out to where the gravel ends',
  'through the long grass by the fence',
  'down to the water, slowly',
  'around the block twice, for no reason',
  'into the pines, where it is quieter',
  'out to the field with the one stone in it',
];

const SAW = [
  'Watched a heron decide not to leave.',
  'Sat still until the sparrows forgot about it.',
  'Found the exact spot where the wind stops.',
  'Counted nine puddles. Stood in two.',
  'The frogs were arguing about something.',
  'Rain came, and it stayed out in it a while.',
  'A dog on a lead wanted very badly to be friends.',
  'The light went orange and then it went blue.',
  'Somebody has been leaving bread out for the crows.',
  'Nothing happened for a long time. It was good.',
  'Snow on the north side of everything, still.',
  'Followed a bee home and lost it at the hedge.',
];

// The things that come back. Each draws itself at 6×6-ish, because the shelf is
// twelve pixels tall and an object that needs more room than that is a picture
// of an object rather than one.
export const THINGS = {
  cone:   { name: 'a small cone', draw(s, x, y) {
    for (let i = 0; i < 4; i++) s.px(x + 1 - (i > 1 ? 1 : 0), y - i, 4 - (i > 1 ? 1 : 0) * 2 + (i > 1 ? 1 : 0), 1, i > 2 ? PAL.WOOD : PAL.WOOD_LIT);
    s.px(x + 2, y + 1, 1, 1, PAL.WOOD);
  } },
  feather:{ name: 'one grey feather', draw(s, x, y) {
    for (let i = 0; i < 5; i++) s.px(x + i * 0.7, y - i, 2, 1, i > 2 ? PAL.BONE : PAL.STONE);
    s.px(x, y + 1, 1, 1, PAL.STONE);
  } },
  stone:  { name: 'a stone worn flat', draw(s, x, y) {
    s.px(x, y - 1, 5, 2, PAL.STONE); s.px(x + 1, y - 2, 3, 1, PAL.BONE);
  } },
  moss:   { name: 'a cushion of moss', draw(s, x, y) {
    s.px(x, y - 1, 5, 2, PAL.MOSS);
    s.px(x + 1, y - 2, 1, 1, PAL.MOSS); s.px(x + 3, y - 2, 1, 1, PAL.MOSS);
  } },
  cap:    { name: 'a rusted bottle cap', draw(s, x, y) {
    s.px(x, y - 2, 5, 3, PAL.RUST); s.px(x + 1, y - 2, 3, 1, PAL.EMBER);
  } },
  shell:  { name: 'an empty snail shell', draw(s, x, y) {
    s.px(x + 1, y - 3, 3, 4, PAL.BONE); s.px(x, y - 1, 5, 2, PAL.BONE);
    s.px(x + 2, y - 2, 1, 1, PAL.WOOD);
  } },
  curl:   { name: 'a curl of birch bark', draw(s, x, y) {
    s.px(x, y - 3, 4, 4, PAL.BONE);
    s.px(x, y - 3, 4, 1, PAL.INK); s.px(x + 1, y - 1, 2, 1, PAL.INK);
  } },
  thread: { name: 'a length of blue thread', draw(s, x, y) {
    for (let i = 0; i < 5; i++) s.px(x + i, y - (i % 2), 1, 1, PAL.THREAD);
  } },
  bead:   { name: 'a bead of green glass', draw(s, x, y) {
    s.px(x + 1, y - 3, 3, 4, PAL.GLASS); s.px(x + 2, y - 3, 1, 1, PAL.EYE_LIGHT);
  } },
  acorn:  { name: 'an acorn, still capped', draw(s, x, y) {
    s.px(x + 1, y - 2, 3, 3, PAL.WOOD_LIT); s.px(x, y - 3, 5, 1, PAL.WOOD);
  } },
  quartz: { name: 'a chip of quartz', draw(s, x, y) {
    s.px(x + 1, y - 3, 3, 4, PAL.BONE); s.px(x + 1, y - 3, 1, 2, PAL.EYE_LIGHT);
  } },
  nail:   { name: 'a very old nail', draw(s, x, y) {
    s.px(x + 2, y - 4, 1, 5, PAL.RUST); s.px(x + 1, y - 4, 3, 1, PAL.RUST);
  } },
};

const THING_IDS = Object.keys(THINGS);

export function startErrand(seed = (Math.random() * 1e9) | 0, now = Date.now()) {
  return { out: true, seed: seed >>> 0, leftAt: now, endsAt: now + ERRAND_MS };
}

export function errandLeft(errand, now = Date.now()) {
  if (!errand?.out) return 0;
  return Math.max(0, errand.endsAt - now);
}

// The report. `owned` is what is already on the shelf: a duplicate is possible
// but weighted well down, so the shelf keeps filling without the tables having
// to run dry — and the seed still decides, so the same errand always tells the
// same story.
export function report(errand, owned = []) {
  const r = rng(errand.seed);
  const where = WHERE[Math.floor(r() * WHERE.length)];
  const saw = SAW[Math.floor(r() * SAW.length)];
  const brings = r() < 0.62;
  let thing = null;
  if (brings) {
    const wanted = THING_IDS.filter(id => !owned.includes(id));
    const pool = wanted.length && r() < 0.85 ? wanted : THING_IDS;
    thing = pool[Math.floor(r() * pool.length)];
  }
  const lines = [`Went ${where}.`, saw];
  if (thing) lines.push(`Brought back ${THINGS[thing].name}.`);
  return { lines, thing };
}
