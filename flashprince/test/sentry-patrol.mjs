import assert from 'node:assert/strict';
import { Sentry } from '../js/enemy.js';

let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };

// Floor probes sit at feet+1. Wall probes sit above the feet. Anything at or
// below the floor line is ground; walls are opt-in.
function flat(feetY, wall) {
  return {
    boxSolid(x, y) {
      if (y >= feetY) return true;
      return wall ? wall(x, y) : false;
    },
  };
}

const hero = { x: 9000, y: 0, dead: false, low: false };
const game = { shoot() {}, fx: { burst() {} } };

{
  const home = 200;
  const s = new Sentry(home, 160);
  const world = flat(161);
  let crossed = false;
  for (let i = 0; i < 400 && !crossed; i++) {
    s.update(world, hero, game);
    if (Math.abs(s.x - home) > 54) crossed = true;
  }
  ok(crossed, 'sentry reaches the patrol leash');
  const atLeash = s.x;
  const away = Math.sign(atLeash - home);
  let flips = 0;
  let prev = s.face;
  for (let i = 0; i < 40; i++) {
    s.update(world, hero, game);
    if (s.face !== prev) { flips++; prev = s.face; }
  }
  ok(Math.abs(s.x - atLeash) > 4, `after the leash he walks back instead of freezing (x ${atLeash} -> ${s.x})`);
  ok(Math.sign(s.x - atLeash) === -away, 'he heads back toward home');
  ok(flips <= 1, `leash reverses once, not every frame (flips=${flips})`);
  ok(s.state === 'patrol', 'an unseen player leaves him on patrol');
}

{
  const home = 200;
  const s = new Sentry(home, 160);
  const world = flat(161);
  let min = home, max = home, frozen = 0, last = s.x, stuck = false;
  for (let i = 0; i < 800; i++) {
    s.update(world, hero, game);
    min = Math.min(min, s.x);
    max = Math.max(max, s.x);
    frozen = s.x === last ? frozen + 1 : 0;
    if (frozen >= 8) stuck = true;
    last = s.x;
  }
  ok(!stuck, 'open-floor patrol does not freeze in place');
  ok(min < home - 40, `patrol reaches the left of home (min ${min})`);
  ok(max > home + 40, `patrol reaches the right of home (max ${max})`);
}

{
  const s = new Sentry(200, 160);
  const world = flat(161, (x) => x < 190);
  const start = s.x;
  for (let i = 0; i < 30; i++) s.update(world, hero, game);
  ok(s.x > start + 4, `a wall still turns him around once (x ${start} -> ${s.x})`);
  ok(s.face === 1, 'after the left wall he faces right');
}

console.log(`Flash Prince sentry patrol: ${checks} checks passed`);
