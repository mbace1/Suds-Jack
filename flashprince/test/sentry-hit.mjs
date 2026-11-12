import assert from 'node:assert/strict';
import { Sentry } from '../js/enemy.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

const world = { boxSolid(x, y) { return y >= 161; } };

// Shot in the back from across the room: he flinches, then aims. The aim has
// to come round to the hero, or the return shot leaves into the empty hall.
{
  const s = new Sentry(200, 160);
  s.face = 1;
  const hero = { x: 120, y: 160, dead: false, low: false };
  ok(!s.sees(hero), 'hero far behind is unseen');
  const shots = [];
  const game = { shoot(x, y, vx) { shots.push({ x, vx }); }, fx: { burst() {} } };
  s.strike(game);
  ok(s.state === 'hit', 'sentry flinches when shot');
  for (let i = 0; i < 80 && shots.length === 0; i++) s.update(world, hero, game);
  ok(shots.length === 1, 'he shoots back after the flinch');
  ok(shots[0].vx < 0, `return shot travels toward the hero (vx=${shots[0].vx})`);
}

console.log(`Flash Prince sentry hit: ${checks} checks passed`);
