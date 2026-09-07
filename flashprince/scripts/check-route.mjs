import assert from 'node:assert/strict';
import { World, ROOMS } from '../js/level.js';
import { decodeRouteSave, encodeRouteSave } from '../js/route-save.js';

const room = scene => ROOMS.findIndex(r => r.scene === scene);

// The post-crown chapter is one connected route with a combat lock, two safe
// checkpoints, a vertical lift, an electrified lower path and a final signal.
assert.ok(room('facilityCrown') < room('cultivationCanal'));
assert.ok(room('cultivationCanal') < room('wardenArchive'));
assert.equal(ROOMS[room('wardenArchive')].requiresClear, true);
assert.equal(ROOMS[room('liftShaft')].checkpoint, true);
assert.equal(ROOMS[room('electricSpillway')].electricWater, true);
assert.equal(ROOMS[room('signalSpire')].missionEnd, true);

// A vertical platform carries both coordinates correctly and remains solid.
{
  const world = new World();
  world.load(room('liftShaft'));
  const lift = world.platforms[0];
  const rider = { x: lift.x + 12, y: lift.y };
  const before = rider.y;
  world.update(rider);
  assert.notEqual(lift.y, before);
  assert.equal(rider.y, lift.y);
  assert.equal(world.boxSolid(lift.x + 2, lift.y, 4, 2), true);
}

// The flooded lower route is dangerous only during its readable charge phase.
{
  const world = new World();
  world.load(room('electricSpillway'));
  assert.equal(world.lethal(20, 150, 8, 26), 'water');
  world.clock = 110;
  assert.equal(world.lethal(20, 150, 8, 26), null);
}

// Route state survives a round trip and rejects malformed/out-of-range data.
{
  const state = {
    checkpointRoom: room('liftShaft'), facilityPower: 1, hybridOutcome: 'allied',
    bioSeed: 1, tapes: 4, parts: 2, missionComplete: false,
    wildlifeChoice: 'spared', defeated: new Set(['21:10:9:w']),
    collected: new Set(['20:10:11:V']),
  };
  const decoded = decodeRouteSave(encodeRouteSave(state), ROOMS.length);
  assert.equal(decoded.checkpointRoom, room('liftShaft'));
  assert.deepEqual(decoded.defeated, ['21:10:9:w']);
  assert.equal(decodeRouteSave('{bad', ROOMS.length), null);
  assert.equal(decodeRouteSave(JSON.stringify({ schema: 1, checkpointRoom: 999 }), ROOMS.length).checkpointRoom, ROOMS.length - 1);
}

console.log('route checks ok — mission order, lift, hazard and persistence');
