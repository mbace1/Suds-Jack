// Flowsnow core gate — bare node, no browser.
//   node flowsnow/test/core.mjs
import { terrain, height, normal, lineX, kickerAt, monolithsIn, TILE } from '../js/terrain.js';
import { createRider, stepRider, RUN_LENGTH, G } from '../js/physics.js';
import { SnowSim } from '../js/particles.js';

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? ' → ' + detail : '')); }
};
const run = (s, input, seconds, ev, dt = 1 / 60) => {
  for (let t = 0; t < seconds; t += dt) stepRider(s, input, dt, terrain, ev);
  return s;
};

// ── the mountain ──
ok('height is deterministic', height(12.5, -340.25) === height(12.5, -340.25));
ok('downhill is -z along the line', height(lineX(-500), -500) < height(lineX(0), 0) - 100);
ok('the gully walls climb away from the line', height(lineX(-300) + 90, -300) > height(lineX(-300), -300) + 10
  && height(lineX(-300) - 90, -300) > height(lineX(-300), -300) + 10);
{
  let worst = 0;
  for (let i = 0; i < 2000; i++) {
    const x = (i % 50) * 3.1 - 70, z = -i * 0.9;
    worst = Math.max(worst, Math.abs(height(x, z) - height(x + 0.05, z)));
  }
  ok('the surface is continuous (no cliff in a 5 cm step)', worst < 0.15, worst);
}
{
  const n = normal(lineX(-200), -200);
  ok('normals are unit and point up', Math.abs(Math.hypot(...n) - 1) < 1e-6 && n[1] > 0.7);
  ok('and lean uphill on the fall line (toward -z is down)', n[2] < -0.15, n[2]);
}
{
  let count = 0, near = 0;
  for (let k = 0; k < 60; k++) { const K = kickerAt(k); if (K) { count++; if (Math.abs(K.x - lineX(K.z)) < 30) near++; } }
  ok('kickers exist on most steps and sit near the line', count > 30 && near / count > 0.8, `${count} ${near}`);
  const K = kickerAt(4) ?? kickerAt(5);
  ok('a kicker is a bump you can measure', height(K.x, K.z) - (height(K.x - 30, K.z) + height(K.x + 30, K.z)) / 2 > 1.0);
}
{
  let mons = 0, onLine = 0;
  for (let ix = -8; ix <= 8; ix++) for (let iz = -80; iz < 0; iz++) {
    for (const m of monolithsIn(ix, iz)) { mons++; if (Math.abs(m.x - lineX(m.z)) < 30) onLine++; }
  }
  ok('monoliths stand on the field, never on the line', mons > 40 && onLine === 0, `${mons} ${onLine}`);
  ok('and none at the start', [...Array(6).keys()].every(i => [-5, -4, -3, -2, -1, 0].every(iz => monolithsIn(i - 3, iz).length === 0)));
}

// ── the rider ──
{
  const s = createRider(terrain, lineX(0), 0);
  run(s, { lean: 0 }, 6);
  ok('gravity takes the rider downhill', s.z < -40 && s.dist > 40, s.z);
  ok('and the speed is snowboard speed, not free fall', s.speed > 10 && s.speed < 30, s.speed);
  const s2 = createRider(terrain, lineX(0), 0);
  run(s2, { lean: 0 }, 25);
  ok('terminal speed is capped by drag (under 100 km/h)', s2.speedMax < 28, s2.speedMax);
  const tucked = createRider(terrain, lineX(0), 0);
  run(tucked, { lean: 0, tuck: 1 }, 25);
  ok('a tuck is faster', tucked.speedMax > s2.speedMax + 1, `${tucked.speedMax} vs ${s2.speedMax}`);
}
{
  const s = createRider(terrain, lineX(0), 0);
  run(s, { lean: 0 }, 3);
  const yaw0 = s.yaw;
  run(s, { lean: 1 }, 1.2);
  ok('leaning right turns the board right', s.yaw > yaw0 + 0.4, s.yaw - yaw0);
  ok('and the edge follows the lean', s.edge > 0.9, s.edge);
  const l = createRider(terrain, lineX(0), 0);
  run(l, { lean: 0 }, 3);
  run(l, { lean: -1 }, 1.2);
  ok('leaning left turns it left', l.yaw < -0.4, l.yaw);
  ok('a held carve holds: velocity follows the board (small slip)', Math.abs(s.slip) < 0.5, s.slip);
  ok('a clean carve earns flow', s.flow > 0.15 && s.score > 0, s.flow);
}
{
  // brake scrubs speed
  const a = createRider(terrain, lineX(0), 0); run(a, { lean: 0 }, 5);
  const b = createRider(terrain, lineX(0), 0); run(b, { lean: 0 }, 5);
  run(a, { lean: 0 }, 2); run(b, { lean: 0, brake: 1 }, 2);
  ok('the brake scrubs speed', b.speed < a.speed - 4, `${b.speed} vs ${a.speed}`);
  ok('and throws spray', b.spray > 0.3, b.spray);
  ok('and costs flow rather than earning it', b.flow <= a.flow);
}
{
  // a pop leaves the ground and comes back
  const s = createRider(terrain, lineX(0), 0);
  run(s, { lean: 0 }, 4);
  const ev = { land: 0, pop: 0 };
  stepRider(s, { lean: 0, jump: true }, 1 / 60, terrain, { pop: () => ev.pop++ });
  ok('a pop leaves the ground', !s.grounded && ev.pop === 1 && s.y > height(s.x, s.z) - 0.01);
  stepRider(s, { lean: 0 }, 1 / 60, terrain);
  ok('and rises off the surface', s.y > height(s.x, s.z) + 0.03, s.y - height(s.x, s.z));
  let frames = 0;
  while (!s.grounded && frames++ < 400) stepRider(s, { lean: 0 }, 1 / 60, terrain, { land: () => ev.land++ });
  ok('and the rider lands again, cleanly', s.grounded && ev.land === 1 && s.tumble === 0, `${frames} ${s.tumble}`);
  ok('air time is recorded', s.airBest > 0.3 && s.airBest < 2.5, s.airBest);
}
{
  // a kicker throws the rider without a button: steer at a known one
  let flew = false, kick = 0, K = null;
  for (let k = 3; !K; k++) K = kickerAt(k);
  const s = createRider(terrain, K.x, K.z + 260);
  const ev = { kicker: () => kick++ };
  const aim = () => {
    let d = Math.atan2(K.x - s.x, s.z - K.z) - s.yaw;
    while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    return Math.max(-1, Math.min(1, d * 2.5));
  };
  for (let t = 0; t < 60 && s.z > K.z - 40; t += 1 / 60) {
    stepRider(s, { lean: aim(), tuck: 1 }, 1 / 60, terrain, ev);
    if (!s.grounded && s.air > 0.2) flew = true;
  }
  ok('the terrain itself gives air off a kicker, no button pressed', flew && kick > 0, `${flew} ${kick} ${s.z - K.z}`);
}
{
  // a spin in the air, a fakie landing that is not a fall
  const s = createRider(terrain, lineX(0), 0);
  run(s, { lean: 0 }, 4);
  stepRider(s, { lean: 0, jump: true }, 1 / 60, terrain);
  let n = 0;
  while (!s.grounded && n++ < 400) stepRider(s, { lean: 1 }, 1 / 60, terrain);
  ok('spinning in the air turns the board', s.spinBest >= 180 || s.tumble > 0, s.spinBest);
}
{
  // landing across the line at speed is a tumble, and the rider recovers
  const s = createRider(terrain, lineX(0), 0);
  run(s, { lean: 0 }, 5);
  s.vy += 6; s.grounded = false; s.air = 0; s.spin = 0;
  s.yaw += Math.PI / 2;     // board across the velocity
  let tumbled = 0, n = 0;
  while (!s.grounded && n++ < 400) stepRider(s, { lean: 0 }, 1 / 60, terrain, { tumble: () => tumbled++ });
  ok('landing sideways at speed is a fall', tumbled === 1 && s.tumble > 0 && s.tumbles === 1);
  run(s, { lean: 1 }, 2);
  ok('and the rider gets back up and can steer again', s.tumble === 0 && Math.abs(s.edge) > 0.5);
}
{
  // a wall is a wall
  const m = (() => { for (let ix = -8; ix <= 8; ix++) for (let iz = -40; iz < -1; iz++) { const l = monolithsIn(ix, iz); if (l.length && !l[0].arch) return l[0]; } })();
  const s = createRider(terrain, m.x, m.z + 6);
  s.vz = -12; s.y = height(s.x, s.z);
  let hit = 0;
  for (let i = 0; i < 90; i++) stepRider(s, { lean: 0 }, 1 / 60, terrain, { tumble: () => hit++ });
  const d = Math.hypot(s.x - m.x, s.z - m.z);
  ok('a monolith stops the board and costs a fall', hit === 1 && d >= m.w * 0.5, `${hit} ${d}`);
}
{
  // a whole run ends
  // steered like a person would: aim the board at the line forty metres ahead
  const s = createRider(terrain, lineX(0), 0);
  let done = 0, steps = 0;
  const aim = () => {
    const want = Math.atan2(lineX(s.z - 40) - s.x, 40);
    let d = want - s.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    return Math.max(-1, Math.min(1, d * 2.5));
  };
  while (!s.done && steps++ < 60 * 400) stepRider(s, { lean: aim(), tuck: 1 }, 1 / 60, terrain, { done: () => done++ });
  ok(`a run ends at ${RUN_LENGTH} m`, s.done && done === 1 && s.dist >= RUN_LENGTH, `${s.dist} ${steps}`);
  ok('within a few minutes', s.time < 240, s.time);
  ok('and stays near the line without a wall', Math.abs(s.x - lineX(s.z)) < 120, s.x - lineX(s.z));
  ok('flow never leaves 0..1', s.flow >= 0 && s.flow <= 1);
  ok('steps after done are inert', (stepRider(s, { lean: 1 }, 1 / 60, terrain), s.dist >= RUN_LENGTH && s.done));
}
{
  // frame rate independence: 30 vs 120 fps land within a few metres
  const a = createRider(terrain, lineX(0), 0); run(a, { lean: 0.5 }, 8, {}, 1 / 30);
  const b = createRider(terrain, lineX(0), 0); run(b, { lean: 0.5 }, 8, {}, 1 / 120);
  ok('the model is roughly frame-rate independent', Math.hypot(a.x - b.x, a.z - b.z) < 25 && Math.abs(a.speed - b.speed) < 3,
    `${Math.hypot(a.x - b.x, a.z - b.z)} ${a.speed} ${b.speed}`);
}

// ── the snow ──
{
  const sim = new SnowSim(500);
  sim.burst(200, 0, height(0, 0) + 0.5, 0, 0.5, 0.7, -0.5, 6, 0.5, 1.2, 0.2);
  ok('a burst fills the pool', sim.count === 200);
  let below = 0;
  for (let i = 0; i < 120; i++) {
    sim.step(1 / 60, terrain);
    for (let k = 0; k < sim.count; k++) if (sim.pos[k * 3 + 1] < height(sim.pos[k * 3], sim.pos[k * 3 + 2]) - 0.05) below++;
  }
  ok('no flake ever sits under the snow', below === 0, below);
  ok('and they all die within their life', sim.count === 0, sim.count);
  for (let i = 0; i < 700; i++) sim.emit(0, 5, 0, 0, 0, 0, 10, 1, 2);
  ok('the pool never overflows', sim.count === 500);
  sim.wind = [3, 0, 0];
  const x0 = sim.pos[0];
  for (let i = 0; i < 60; i++) sim.step(1 / 60, terrain);
  ok('wind carries the flakes', sim.pos[0] > x0 + 0.5, sim.pos[0] - x0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
