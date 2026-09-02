import assert from 'node:assert/strict';
import { Hero, HANG } from '../js/hero.js';
import { World } from '../js/level.js';
import { ROOMS } from '../js/rooms.js';

const world = {
  boxSolid: () => false,
  ledgeBehind: () => null,
  stepUpAhead: () => null,
};
const input = {
  dir: 0, dirHeld: 0, up: false, down: false, careful: false,
  jumpPress: false, firePress: false, gunPress: false, carefulPress: false,
};
const game = { bumped() {}, hurt() {}, kill() { throw new Error('unexpected kill'); } };
const tick = (hero, n) => { for (let i = 0; i < n; i++) hero.update(world, input, game); };

// Low steps must finish on one exact tile position. The old incremental carry
// accumulated a different x depending on how the move was entered.
{
  const hero = new Hero(25.25, 96);
  hero.stepTarget = { x: 40, y: 80 };
  hero.go('stepUp');
  tick(hero, 30);
  assert.equal(hero.x, 40);
  assert.equal(hero.y, 80);
  assert.equal(hero.state, 'stand');
}

// Both floor-height actions must be real Conrad sequences, never the default
// standing fallback that used to float upward or freeze through a pickup.
{
  const hero = new Hero(40, 96);
  hero.go('stepUp');
  assert.equal(hero.sprite().anim, 'stepUp');
  const first = hero.sprite().f;
  hero.f = 18;
  assert.ok(hero.sprite().f > first);
  hero.go('drink');
  assert.equal(hero.sprite().anim, 'collect');
  hero.f = 24;
  assert.equal(hero.sprite().f, 1);
}

// Low climbing with the pistol selected must restore the aimed stance instead
// of silently showing the unarmed idle character at the top.
{
  const hero = new Hero(25.25, 96);
  hero.weapon = 'gun';
  hero.stepTarget = { x: 40, y: 80 };
  hero.go('stepUp');
  tick(hero, 30);
  assert.equal(hero.state, 'standArmed');
  assert.equal(hero.weapon, 'gun');
}

// A mantle ends one body radius inside the ledge and exactly on its floor.
{
  const hero = new Hero(27, 48 + HANG);
  hero.face = 1; hero.ledgeX = 27; hero.ledgeY = 48;
  hero.go('pullUp');
  tick(hero, 40);
  assert.equal(hero.x, 40);
  assert.equal(hero.y, 48);
  assert.equal(hero.state, 'stand');
}

// Mantling has the same loadout contract as a low climb.
{
  const hero = new Hero(27, 48 + HANG);
  hero.weapon = 'gun';
  hero.face = 1; hero.ledgeX = 27; hero.ledgeY = 48;
  hero.go('pullUp');
  tick(hero, 40);
  assert.equal(hero.state, 'standArmed');
  assert.equal(hero.weapon, 'gun');
}

// Deliberate climb-down ends at the same hang coordinate as an airborne grab.
{
  const hero = new Hero(48, 96);
  hero.climbTo = { x: 53, y: 96, face: -1 };
  hero.go('climbDown');
  tick(hero, 34);
  assert.equal(hero.x, 53);
  assert.equal(hero.y, 96 + HANG);
  assert.equal(hero.state, 'hang');
}

// Fractional air positions snap to the exact tile top on landing, preventing
// the one-pixel jitter that used to feed into the next step or climb.
{
  const tiled = new World();
  tiled.grid = Array.from({ length: 12 }, (_, ty) => Array(20).fill(ty === 6 ? '#' : ' '));
  const hero = new Hero(40.4, 94.35);
  hero.go('air'); hero.vx = 0; hero.vy = 2.4; hero.fallFrom = 80;
  for (let i = 0; i < 4 && hero.state === 'air'; i++) hero.update(tiled, input, game);
  assert.equal(hero.y, 96);
  assert.equal(hero.state, 'land');
}

// Jumping holsters the visible pistol for the flight frames, but it must not
// delete the selected weapon and return as a different loadout on landing.
{
  const hero = new Hero(48, 96);
  hero.weapon = 'gun';
  hero.jump(world, input, false);
  assert.equal(hero.weapon, 'gun');
}

// Holding a direction through a landing must not skip the authored final
// settle cell. The move completes first, then hands over to locomotion.
{
  const hero = new Hero(48, 96);
  const groundedWorld = { ...world, boxSolid: (_x, y, _w, h) => y + h >= 97 };
  hero.go('land'); hero.face = 1; input.dir = 1;
  for (let i = 0; i < 10; i++) hero.update(groundedWorld, input, game);
  assert.equal(hero.state, 'land');
  assert.equal(hero.sprite().anim, 'land');
  assert.equal(hero.sprite().f, 3);
  hero.update(groundedWorld, input, game);
  assert.equal(hero.state, 'step');
  input.dir = 0;
}

// Pull-up begins on the exact hang cell already on screen, then enters the
// mantle row after its four-frame brace instead of popping immediately.
{
  const hero = new Hero(27, 48 + HANG);
  hero.face = 1; hero.ledgeX = 27; hero.ledgeY = 48;
  hero.go('hang'); hero.f = 55;
  const held = hero.sprite().f;
  hero.go('pullUp');
  assert.equal(hero.sprite().anim, 'hang');
  assert.equal(hero.sprite().f, held);
  tick(hero, 3);
  assert.equal(hero.sprite().anim, 'hang');
  tick(hero, 1);
  assert.equal(hero.sprite().anim, 'mantle');
}

// Careful remains the precision-step button unarmed and becomes the shield
// while the pistol is aimed, on the same keyboard/touch/gamepad input path.
{
  const hero = new Hero(48, 96);
  const groundedWorld = { ...world, boxSolid: (_x, y, _w, h) => y + h >= 97 };
  hero.weapon = 'gun'; hero.go('standArmed'); input.careful = true;
  hero.update(groundedWorld, input, game);
  assert.equal(hero.state, 'shield');
  const charge = hero.shield;
  for (let i = 0; i < 4; i++) hero.update(groundedWorld, input, game);
  assert.ok(hero.shield < charge);
  input.careful = false; hero.update(groundedWorld, input, game);
  assert.equal(hero.state, 'standArmed');
}

// A floor pickup is a committed animation: crouch detects it, the reward edge
// arrives during the low hold, and the selected stance returns at the end.
{
  const hero = new Hero(48, 96);
  const groundedWorld = { ...world, boxSolid: (_x, y, _w, h) => y + h >= 97 };
  const pickupGame = { ...game, flaskUnder: () => true };
  hero.go('crouchIdle');
  hero.update(groundedWorld, input, pickupGame);
  assert.equal(hero.state, 'drink');
  for (let i = 0; i < 22; i++) hero.update(groundedWorld, input, pickupGame);
  assert.equal(hero.drinkQueued, true);
  hero.drinkQueued = false;
  for (let i = hero.f; i < 46; i++) hero.update(groundedWorld, input, pickupGame);
  assert.equal(hero.state, 'stand');
}

// The powered facility ferry is real collision and carries a planted hero;
// it is not only background animation.
{
  const transit = new World();
  transit.load(ROOMS.length - 1);
  assert.equal(transit.platforms.length, 1);
  const rider = { x: 70, y: 160 };
  const beforePlatform = transit.platforms[0].x;
  const beforeRider = rider.x;
  transit.update(rider);
  assert.ok(transit.platforms[0].x > beforePlatform);
  assert.equal(rider.x - beforeRider, transit.platforms[0].x - beforePlatform);
  assert.equal(transit.boxSolid(transit.platforms[0].x + 2, 160, 4, 2), true);
}

console.log('movement checks ok — exact landings, animated pickups, armed traversal, step, mantle, climb-down, jump, shield, ferry');
