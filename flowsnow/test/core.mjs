// Flowsnow core gate — bare node, no browser.
//   node flowsnow/test/core.mjs
import { terrain, height, base, depth, normal, lineX, kickerAt, monolithsIn, TILE, DEEP } from '../js/terrain.js';
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
// Ride holding a fixed offset from the wandering line, so a run stays in the
// snow it was meant to test. A fixed lean drifts across the whole depth field,
// which is why the plain `run` cannot compare packed against deep.
const ride = (off, input = {}, seconds = 20, ev = {}, dt = 1 / 120) => {
  const s = createRider(terrain, lineX(0) + off, 0);
  s.vz = -2;
  for (let t = 0; t < seconds; t += dt) {
    const want = Math.atan2(lineX(s.z - 35) + off - s.x, 35);
    let d = want - s.yaw;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    stepRider(s, { ...input, lean: Math.max(-1, Math.min(1, d * 2.5)) }, dt, terrain, ev);
  }
  return s;
};
const PACKED = 0, POWDER = 42;

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
  const flat = ride(PACKED, {}, 30), tucked = ride(PACKED, { tuck: 1 }, 30);
  ok('a tuck is faster on the packed line', tucked.speed > flat.speed + 0.4, `${tucked.speed} vs ${flat.speed}`);
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
  // the brake bites on the packed line
  const a = ride(PACKED, {}, 24), b = ride(PACKED, { brake: 1 }, 24);
  ok('the brake scrubs speed on the packed line', b.speed < a.speed - 4, `${b.speed} vs ${a.speed}`);
  ok('and throws spray', b.spray > 0.3, b.spray);
  // Measured as a CHANGE under the brake, not as one run against another: two
  // runs end in different snow, and the one that scrubs covers less ground, so
  // comparing their final flow compares where they stopped, not what they did.
  const c = ride(PACKED, {}, 12);
  c.flow = 0.8;
  const before = c.flow;
  for (let t = 0; t < 2; t += 1 / 120) stepRider(c, { lean: 0, brake: 1 }, 1 / 120, terrain, {});
  ok('and scrubbing spends flow', c.flow < before - 0.2, `${before} -> ${c.flow.toFixed(2)}`);
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
  // Frame-rate independence, measured down the packed line. A held lean was the
  // old test and is no longer a fair one: it carves across a depth field that
  // varies in space, so two step sizes end up in different snow and the medium,
  // not the integrator, explains the gap.
  const a = ride(PACKED, {}, 10, {}, 1 / 30), b = ride(PACKED, {}, 10, {}, 1 / 120);
  ok('the model is roughly frame-rate independent',
    Math.hypot(a.x - b.x, a.z - b.z) < 12 && Math.abs(a.speed - b.speed) < 2,
    `${Math.hypot(a.x - b.x, a.z - b.z).toFixed(1)}m ${a.speed.toFixed(1)} ${b.speed.toFixed(1)}`);
}

// ── the snowpack ──
{
  const lx = lineX(-800);
  ok('a packed line runs down the middle', depth(lx, -800) < 0.35, depth(lx, -800));
  ok('and deep snow lies off it', depth(lx + 40, -800) > 0.6, depth(lx + 40, -800));
  ok('the wind scours the walls back to bare', depth(lx + 130, -800) < 0.4, depth(lx + 130, -800));
  let mx = 0, deepEnough = 0, n = 0;
  for (let i = 0; i < 3000; i++) {
    const z = -i * 0.8, x = lineX(z) + ((i * 37) % 150) - 75, d = depth(x, z);
    mx = Math.max(mx, d); if (d > 1) deepEnough++; n++;
  }
  ok('the deepest pockets are properly deep', mx > 1.6 && mx <= DEEP, mx);
  ok('and a good share of the field is worth riding', deepEnough / n > 0.2, deepEnough / n);
  const K = (() => { for (let k = 3; ; k++) { const K = kickerAt(k); if (K) return K; } })();
  ok('a take-off is stamped firm — you cannot build a lip out of powder',
    depth(K.x, K.z) < 0.3, depth(K.x, K.z));
  ok('the surface is the ground plus its snow', Math.abs(height(12, -400) - (base(12, -400) + depth(12, -400))) < 1e-9);
  let worst = 0;
  for (let i = 0; i < 1500; i++) {
    const x = (i % 60) * 4 - 120, z = -i * 1.1;
    worst = Math.max(worst, Math.abs(depth(x, z) - depth(x + 0.05, z)));
  }
  ok('and the pack is continuous, like the ground under it', worst < 0.05, worst);
}

// ── sinking in, and getting back on top ──
{
  const s = createRider(terrain, lineX(0) + POWDER, 0);
  const d0 = depth(s.x, s.z);
  run(s, { lean: 0 }, 2.5, {}, 1 / 120);
  ok('at a standstill the board settles to the floor of the pack',
    d0 > 0.5 && s.sink > d0 * 0.6, `${s.sink} of ${d0}`);

  const fast = ride(POWDER, {}, 30);
  ok('at speed it planes back up out of the snow', fast.plane > 0.75 && fast.sink < fast.depth * 0.5,
    `sink ${fast.sink.toFixed(2)} of ${fast.depth.toFixed(2)}, plane ${fast.plane.toFixed(2)}`);
  ok('and it is genuinely riding deep snow, not the packed line', fast.depth > 0.7, fast.depth);
}

// ── powder costs speed, and pays for it ──
{
  const packed = ride(PACKED, {}, 30), deep = ride(POWDER, {}, 30);
  ok('deep snow is slower than the packed line', deep.speed < packed.speed - 4,
    `${deep.speed.toFixed(1)} vs ${packed.speed.toFixed(1)}`);
  ok('but it is still ridden, not a wall', deep.speed > 8, deep.speed);
  ok('and riding it is what scores', deep.score > packed.score * 3 + 50,
    `${Math.round(deep.score)} vs ${Math.round(packed.score)}`);
}

// ── a bog is somewhere you crawl out of, never a trap ──
{
  // Pointed down the fall line, from a dead stop, buried to the floor of the
  // pack. Steering is part of the premise: an unsteered board on a banked wall
  // traverses and climbs it, and then it is the side-hill stopping you rather
  // than the snow.
  const s = createRider(terrain, lineX(0) + POWDER, 0);
  s.vx = s.vy = s.vz = 0;
  run(s, { lean: 0 }, 2, {}, 1 / 120);        // settle in, still stopped
  const bogged = s.speed;
  ok('a rider dropped into deep snow starts buried', s.sink > 0.5 && bogged < 6, `${s.sink.toFixed(2)} ${bogged.toFixed(2)}`);
  for (let t = 0; t < 18; t += 1 / 120) {
    const want = Math.atan2(lineX(s.z - 35) + POWDER - s.x, 35);
    let d = want - s.yaw;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    stepRider(s, { lean: Math.max(-1, Math.min(1, d * 2.5)) }, 1 / 120, terrain, {});
  }
  ok('and digs itself back out onto the plane', s.speed > 10 && s.plane > 0.7,
    `${bogged.toFixed(2)} -> ${s.speed.toFixed(2)} m/s, plane ${s.plane.toFixed(2)}`);
}

// ── trim: the same key means float in powder and edge on hardpack ──
{
  const neutral = ride(POWDER, {}, 30), back = ride(POWDER, { brake: 1 }, 30);
  ok('weighting the tail floats you in powder rather than scrubbing',
    back.speed > neutral.speed - 1.5 && back.sink < neutral.sink,
    `speed ${back.speed.toFixed(1)} vs ${neutral.speed.toFixed(1)}, sink ${back.sink.toFixed(2)} vs ${neutral.sink.toFixed(2)}`);
  ok('and it is the better line, so it scores more', back.score > neutral.score,
    `${Math.round(back.score)} vs ${Math.round(neutral.score)}`);
  const packedBrake = ride(PACKED, { brake: 1 }, 24), packedFlat = ride(PACKED, {}, 24);
  ok('while the same key still bites on the packed line', packedBrake.speed < packedFlat.speed - 4);
}

// ── over the front ──
{
  let dives = 0;
  const nose = ride(POWDER, { tuck: 1 }, 45, { dive: () => dives++ });
  ok('nose-heavy in deep snow eventually goes over the front', dives > 0 && nose.dives === dives, dives);
  ok('and a tuck buries the board rather than freeing it', nose.plane < 0.75, nose.plane);
  let backDives = 0;
  ride(POWDER, { brake: 1 }, 45, { dive: () => backDives++ });
  ok('getting the weight back is the answer to it', backDives === 0, backDives);
}

// ── powder catches you ──
{
  // the same crossed-up landing, dropped into deep snow and onto the packed line
  const drop = (off) => {
    const s = createRider(terrain, lineX(0) + off, 0);
    run(s, { lean: 0 }, 5, {}, 1 / 120);
    s.vy += 7; s.grounded = false; s.air = 0; s.spin = 0;
    s.yaw += Math.PI / 2;
    let fell = 0, n = 0;
    while (!s.grounded && n++ < 600) stepRider(s, { lean: 0 }, 1 / 120, terrain, { tumble: () => fell++ });
    return { fell, d: depth(s.x, s.z) };
  };
  const hard = drop(PACKED), soft = drop(POWDER);
  ok('a crossed-up landing on the packed line puts you down', hard.fell === 1, JSON.stringify(hard));
  ok('and deep snow catches the same one', soft.fell === 0 && soft.d > 0.6, JSON.stringify(soft));
}

// ── the board comes out of its trench to jump ──
{
  const s = ride(POWDER, {}, 12);
  const buried = s.sink;
  stepRider(s, { lean: 0, jump: true }, 1 / 120, terrain, {});
  ok('a pop lifts the board clear of the snow it was riding in',
    !s.grounded && s.sink === 0 && buried > 0.05, `${buried} -> ${s.sink}`);
  let n = 0;
  while (!s.grounded && n++ < 600) stepRider(s, { lean: 0 }, 1 / 120, terrain, {});
  ok('and it is a real jump, not a one-frame stutter', s.airBest > 0.2, s.airBest);
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


// ---- the cache tokens, because a fix nobody re-downloads is not shipped ----
// The sub-modules were imported BARE until v3: index.html busts main.js and
// main.js asked for `./audio.js`, so a returning browser kept the old copy of
// every other module in the game. A crash fix in audio.js would simply not
// have arrived. The other half of the rule is that ONE module gets ONE token:
// palette.js has three importers and snowmat.js two, and two different tokens
// for one module is two instances of it with their state split.
{
  const dir = new URL('../js/', import.meta.url);
  const files = (await import('node:fs')).readdirSync(dir).filter(f => f.endsWith('.js'));
  const seen = new Map();
  let bare = [];
  for (const f of files) {
    const src = (await import('node:fs')).readFileSync(new URL(f, dir), 'utf8');
    for (const m of src.matchAll(/from '\.\/([a-z]+\.js)(\?v=(\d+))?'/g)) {
      if (!m[2]) { bare.push(`${f} -> ${m[1]}`); continue; }
      const prev = seen.get(m[1]);
      if (prev === undefined) seen.set(m[1], m[3]);
      else if (prev !== m[3]) bare.push(`${m[1]} asked for as v${prev} and v${m[3]}`);
    }
  }
  ok('every local import carries a cache token', bare.length === 0, bare.join(', '));
  ok('and one module is never asked for under two tokens', bare.length === 0, bare.join(', '));
  // The title screen prints `v${VERSION}` to the player. It sat at 1 through
  // v2 AND v3 while the cabinet advertised the real number — the arcade and the
  // game disagreeing about what you are playing.
  const mainSrc = (await import('node:fs')).readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  const log = (await import('node:fs')).readFileSync(new URL('../VERSIONS.md', import.meta.url), 'utf8');
  const declared = Number(mainSrc.match(/export const VERSION = (\d+)/)?.[1]);
  const logged = Number(log.match(/^## v(\d+)/m)?.[1]);
  ok('the version the game shows is the version that shipped', declared === logged,
    `main.js says v${declared}, VERSIONS.md says v${logged}`);
  const html = (await import('node:fs')).readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  ok('the page asks for a tokened entry module', /src="js\/main\.js\?v=\d+"/.test(html));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
