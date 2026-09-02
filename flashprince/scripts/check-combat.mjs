import assert from 'node:assert/strict';
import { Sentry, advanceBolt } from '../js/sentry.js';
import { World, ROOMS } from '../js/level.js';
import { HybridKeeper, HYBRID_COMMUNE_FRAMES } from '../js/hybrid.js';

const hero = {
  x: 48, y: 176, face: 1, h: 30,
  shielding: false, f: 99,
};

// The flooded-hub map marker must survive room parsing and become a sentry.
{
  const world = new World();
  const facility = ROOMS.findIndex(room => room.scene === 'bioFacility');
  world.load(facility);
  assert.equal(world.room.requiresPower, true);
  assert.equal(world.spawns.filter(spawn => spawn.kind === 'g').length, 1);
  assert.equal(world.pickups.filter(pickup => pickup.kind === 'loot').length, 1);
  assert.equal(world.pickups.filter(pickup => pickup.kind === 'tape').length, 1);
  assert.equal(world.pickups.filter(pickup => pickup.kind === 'socket').length, 1);
}

// The facility mission ends in a real choice. A sustained shield signal makes
// the keeper an ally; firing first turns it into a telegraphed combatant.
{
  const world = new World();
  const sanctum = ROOMS.findIndex(room => room.scene === 'hybridSanctum');
  world.load(sanctum);
  assert.equal(world.room.requiresHybrid, true);
  assert.equal(world.spawns.filter(spawn => spawn.kind === 'H').length, 1);
  assert.ok(ROOMS.some(room => room.scene === 'facilityCrown' && room.missionEnd));

  const keeper = new HybridKeeper(216, 176);
  const signalling = { ...hero, x: 150, face: 1, shielding: true };
  for (let i = 0; i < HYBRID_COMMUNE_FRAMES; i++) keeper.update(signalling);
  assert.equal(keeper.allied, true);
  assert.equal(keeper.giftQueued, true);

  const hostile = new HybridKeeper(216, 176);
  hostile.struck(150);
  assert.equal(hostile.hostile, true);
  for (let i = 0; i < 100 && !hostile.shotQueued; i++) hostile.update(signalling);
  assert.equal(hostile.shotQueued, true);
  assert.equal(hostile.spore().bio, true);
}

// The machine has a readable track → warning → fire sequence and emits one
// bolt, not a stream hidden inside the update loop.
{
  const sentry = new Sentry(296, 176, -1);
  const nearby = { ...hero, x: 60 };
  for (let i = 0; i < 140 && !sentry.shotQueued; i++) sentry.update(nearby);
  assert.equal(sentry.shotQueued, true);
  const bolt = sentry.bolt();
  assert.ok(bolt.vx < 0);
  assert.equal(bolt.y, 154);
}

// Standing takes the high shot.
{
  const bolt = { x: 55, px: 55, y: 154, vx: -8, life: 10 };
  assert.equal(advanceBolt(bolt, hero), 'hit');
}

// Crouching passes beneath it.
{
  const crouched = { ...hero, h: 16 };
  const bolt = { x: 55, px: 55, y: 154, vx: -8, life: 10 };
  assert.equal(advanceBolt(bolt, crouched), null);
}

// A front-facing shield intercepts before the body; facing away does not.
{
  const guarded = { ...hero, shielding: true };
  const bolt = { x: 70, px: 70, y: 154, vx: -8, life: 10 };
  assert.equal(advanceBolt(bolt, guarded), 'shield');
  const wrongWay = { ...guarded, face: -1 };
  const second = { x: 55, px: 55, y: 154, vx: -8, life: 10 };
  assert.equal(advanceBolt(second, wrongWay), 'hit');
}

// Raising the shield just before impact reflects the bolt; simply holding it
// remains the safer, more expensive block.
{
  const timed = { ...hero, shielding: true, f: 4 };
  const bolt = { x: 70, px: 70, y: 154, vx: -8, life: 10 };
  assert.equal(advanceBolt(bolt, timed), 'reflect');
}

console.log('combat checks ok — sentry, shield, reflection, facility loot and hybrid choice');
