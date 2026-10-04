import assert from 'node:assert/strict';
import { Beast, Drone, Sentry } from '../js/enemy.js';

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };

const world = { boxSolid(x, y) { return y >= 161; } };
const hero = { x: 9000, y: 0, dead: false, low: false };
const game = { shoot() {}, hurt() {}, fx: { burst() {} } };

{
  const s = new Sentry(200, 160);
  s.strike(game);
  ok(s.hurtT > 0, 'sentry flashes on hit');
  for (let i = 0; i < 20; i++) s.update(world, hero, game);
  ok(s.hurtT === 0, `sentry flash clears (hurtT=${s.hurtT})`);
}

{
  const b = new Beast(200, 160);
  b.strike(game);
  ok(b.hurtT > 0, 'beast flashes on hit');
  for (let i = 0; i < 20; i++) b.update(world, hero, game);
  ok(b.hurtT === 0, `beast flash clears (hurtT=${b.hurtT})`);
}

{
  const d = new Drone(200, 160);
  d.strike(game);
  ok(d.hurtT > 0, 'drone flashes on hit');
  for (let i = 0; i < 20; i++) d.update(world, hero, game);
  ok(d.hurtT === 0, `drone flash clears (hurtT=${d.hurtT})`);
}

console.log(`Flash Prince hurt flash: ${checks} checks passed`);
