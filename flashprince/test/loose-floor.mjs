import assert from 'node:assert/strict';
import { Hero } from '../js/hero.js';
import { World } from '../js/level.js';

let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; };

const TILE = 16;
const LIP = 8 * TILE; // room 6 crumbling row, feet y when stood on it

function input(dir, jump = false) {
  return { dir, dirHeld: dir ? 30 : 0, up: false, down: false, jumpPress: jump, gunPress: false, firePress: false };
}

function room() {
  const world = new World();
  world.load(6);
  const hero = new Hero(40, LIP);
  hero.face = 1;
  const game = { kill() {}, hurt() {} };
  return { world, hero, game };
}

function step(world, hero, game, dir, jump = false) {
  hero.update(world, input(dir, jump), game);
  world.update(hero);
}

// A standing jump off the solid lip of room 6 lands on the crumbling tiles,
// but the feet stop a fraction short of the lip pixel. The floor used to
// notice a hero only when y was exactly the tile top, so the bridge never
// gave way after a hop.
{
  const { world, hero, game } = room();
  step(world, hero, game, 1, true);
  let landed = false;
  for (let i = 0; i < 90 && !landed; i++) {
    step(world, hero, game, 0);
    landed = hero.state === 'land' || hero.state === 'stand';
  }
  ok(landed, 'standing jump from the lip comes back down');
  ok(hero.grounded(world), 'he is standing on the floor he landed on');
  ok(hero.y !== LIP, `jump landing is not an exact lip pixel (y=${hero.y})`);
  const under = [...world.loose.values()].find(l => Math.abs(hero.x - (l.tx * TILE + 8)) < 12);
  ok(under, `landing x ${hero.x} is over a loose tile`);
  ok(under && under.t >= 0, `loose tile starts to give way after a jump landing (t=${under && under.t}, y=${hero.y})`);
  const untouched = [...world.loose.values()].filter(l => l !== under && l.t < 0);
  ok(untouched.length >= 1, 'tiles he did not land on stay solid');
}

// Walking on from an exact lip still starts the same tiles. Guards the
// integer path the old compare happened to get right.
{
  const { world, hero, game } = room();
  hero.x = 56;
  hero.y = LIP;
  for (let i = 0; i < 16; i++) step(world, hero, game, 1);
  const under = [...world.loose.values()].find(l => l.t >= 0);
  ok(under, `walking onto a loose tile from an exact lip still crumbles it (y=${hero.y})`);
}

console.log(`Flash Prince loose floor: ${checks} checks passed`);
