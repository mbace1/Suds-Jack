import assert from 'node:assert/strict';
import { Hero, HANG } from '../js/hero.js';

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

// Jumping holsters the visible pistol for the flight frames, but it must not
// delete the selected weapon and return as a different loadout on landing.
{
  const hero = new Hero(48, 96);
  hero.weapon = 'gun';
  hero.jump(world, input, false);
  assert.equal(hero.weapon, 'gun');
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

console.log('movement checks ok — step, mantle, climb-down, armed jump, shield');
