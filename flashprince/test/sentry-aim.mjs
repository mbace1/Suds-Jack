import assert from 'node:assert/strict';
import { Sentry } from '../js/enemy.js';

let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };

function flat(feetY) {
  return { boxSolid(x, y) { return y >= feetY; } };
}

const world = flat(161);

function fired(sentry, hero) {
  const shots = [];
  const game = {
    shoot(x, y, vx, vy, from) { shots.push({ x, y, vx, vy, from }); },
    fx: { burst() {} },
  };
  for (let i = 0; i < 160 && shots.length === 0; i++) sentry.update(world, hero, game);
  return shots[0];
}

// He is allowed to notice someone close behind him. The shot still left in
// the direction he was patrolling, so the hero he had already seen was never
// in front of the gun.
{
  const s = new Sentry(200, 160);
  s.face = 1;
  const hero = { x: 185, y: 160, dead: false, low: false };
  ok(s.sees(hero), 'a hero close behind is seen');
  const shot = fired(s, hero);
  ok(shot, 'he still fires after spotting someone behind him');
  ok(Math.sign(shot.vx) === -1, `shot at a hero behind him goes toward him (vx=${shot && shot.vx}, face=${s.face})`);
  ok(s.face === -1, 'he has turned to face the hero he spotted');
}

// The same miss on the second shot: recover goes back to aim while he can
// still see a hero who stepped behind him, without turning.
{
  const s = new Sentry(200, 160);
  s.face = 1;
  s.state = 'recover';
  s.f = 0;
  const hero = { x: 185, y: 160, dead: false, low: false };
  ok(s.sees(hero), 'recover still sees a hero close behind');
  const shot = fired(s, hero);
  ok(shot, 'recover leads to another shot');
  ok(Math.sign(shot.vx) === -1, `second shot also faces the hero behind him (vx=${shot && shot.vx}, face=${s.face})`);
}

// A hero already in front of the gun is unchanged.
{
  const s = new Sentry(200, 160);
  s.face = 1;
  const hero = { x: 260, y: 160, dead: false, low: false };
  ok(s.sees(hero), 'a hero in front is seen');
  const shot = fired(s, hero);
  ok(Math.sign(shot.vx) === 1, `a hero in front is still shot at (vx=${shot && shot.vx})`);
  ok(s.face === 1, 'he does not turn away from a hero in front');
}

console.log(`Flash Prince sentry aim: ${checks} checks passed`);
