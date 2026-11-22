// boss.mjs — what the worlds' own bosses' tests share (v45,
// test/species/<boss>.mjs): a world with one boss in it and nothing else,
// the hero untouchable, stepped and read back; and the checks every one of
// them answers the same way (seeded, its look, its world's boss wave, the
// rage at half health).
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=160';
import { TUNING as T } from '../../js/tuning.js?v=160';
import { LOOKS } from '../../js/render/looks/index.js?v=160';
import { BOSS_PHASES } from '../../js/tuning/bossphases.js?v=160';
import { BOSS_KINDS } from '../../js/tuning/bosskinds.js?v=160';

// v156: since v154 a world boss in ARCADE fights in three phases (tuning/bossphases.js), and its old single rage at half
// health is what ?bossphases=off gives back. These specs hold each boss's own pattern and that v153 rage, so they run
// with the phases off; test/bossphases.mjs holds the phases themselves
BOSS_PHASES.on = false;
// v157: and the kinds off (endurance clocks, strategic armour): these specs are each species' own fight; the kinds
// have their own test (test/bosskinds.mjs)
BOSS_KINDS.on = false;

export const dt = T.sim.dt;
export const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

export function checker(key) {
  let failed = 0, passed = 0;
  const check = (claim, ok, detail = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`); };
  const done = () => { console.log(failed ? `\n✗ ${key}: ${failed} failed, ${passed} passed` : `✔ ${key}: ${passed} checks`); process.exit(failed ? 1 : 0); };
  return { check, done };
}

// one boss at (x, z) in world `world`'s arena, nothing else on the floor
// `posts`: keep what stands on a later world's floor (v108, sim/posts.js) — off by default, so a boss's own pattern
// is counted on a bare floor (its shots dying on a post is the posts' rule, held in test/posts.mjs)
export function arena(key, { world = 1, seed = 4, x = 10, z = 0, boss = true, hero = [0, 0], posts = false, mode = 'arcade' } = {}) {
  const w = createWorld({ seed, mode, world });
  w.director = { step() {} };
  if (!posts) w.posts.length = 0;
  w.hero.invinc = 1e9;
  w.hero.x = hero[0]; w.hero.z = hero[1];
  const g = api.spawn(w, key, x, z, boss ? { isBoss: true, hp: T.species[key].bossHp } : {});
  const log = [];
  // step `secs` (or until `until` says so), every event kept in `log`
  const run = (secs, until, input = IDLE) => {
    for (let i = 0; i < secs / dt; i++) {
      step(w, typeof input === 'function' ? input(w) : input);
      log.push(...w.events);
      if (until?.(w, g, i)) return i * dt;
    }
    return -1;
  };
  const shots = () => w.bullets.filter((b) => !b.hero && !b.dead && b.src === key).length;
  return { w, g, log, run, shots, api };
}

// what every world boss answers alike
export function common(key, world, { check }) {
  const S = T.species[key];
  const src = readFileSync(new URL(`../../js/sim/species/${key}.js`, import.meta.url), 'utf8');
  check('no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check(`world ${world}'s own boss (TUNING.waves.boss.worlds)`, T.waves.boss.worlds[world - 1] === key);
  check('a boss row: a name, a boss\'s health, a rage at half', !!S.name && S.bossHp > S.hp && S.rage?.at === 0.5 && !!S.rage.label);
  const L = LOOKS[key];
  check('a look of its own (with the boss ring)', typeof L?.build === 'function' && typeof L.update === 'function');
  // its rage: at half its health, once, announced
  const A = arena(key, { world });
  A.run(0.5);
  A.g.hp = Math.floor(A.g.maxHp * S.rage.at);
  A.run(0.2);
  const ph = A.log.filter((e) => e.type === 'phase' && e.kind === key);
  A.run(1);
  check('at half its health it rages, once, with its banner', ph.length === 1 && ph[0].label === S.rage.label && A.g.s.enraged && A.log.filter((e) => e.type === 'phase').length === 1);
  // a body that is not a boss never rages
  const B = arena(key, { world, boss: false });
  B.run(0.3); B.g.hp = 1; B.run(0.3);
  check('…and a body that is not a boss never does', !B.g.s.enraged && !B.log.some((e) => e.type === 'phase'));
  // the same seed, the same fight
  const r = () => { const C = arena(key, { world, seed: 9 }); C.run(6); return `${C.g.x.toFixed(6)}:${C.g.z.toFixed(6)}:${C.w.bullets.length}`; };
  check('it replays from its seed', r() === r());
  return { S, T };
}
