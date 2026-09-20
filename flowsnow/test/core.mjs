// Flowsnow core gate — bare node, no browser.
//   node flowsnow/test/core.mjs
import { terrain, height, base, depth, normal, lineX, kickerAt, monolithsIn, TILE, DEEP,
  CHAPTERS, chapter, crevasseAt, CREV_STEP, CREV_MAX_DROP, GRADE } from '../js/terrain.js';
import { createRider, stepRider, RUN_LENGTH, G } from '../js/physics.js';
import { SnowSim } from '../js/particles.js';
import { Snowpack, CELL } from '../js/snowpack.js';

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
// WHERE a test rides is now part of what it measures. z = 0 is the bowl, which
// is deliberately shallow and open; the run-out is where the deepest snow of the
// run is. Six powder checks were written when the mountain was one formula and
// silently became tests of a scoured stretch the moment it stopped being one.
const DEEP_Z = -2300;        // in the run-out, where the drift is deepest
const HARD_Z = -1500;        // on the glacier: scoured, the firmest ground there is
const ride = (off, input = {}, seconds = 20, ev = {}, dt = 1 / 120, z0 = 0) => {
  const s = createRider(terrain, lineX(z0) + off, z0);
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
// carry on riding a rider that already has speed
const rideOn = (s, off, input = {}, seconds = 6, dt = 1 / 120) => {
  for (let t = 0; t < seconds; t += dt) {
    const want = Math.atan2(lineX(s.z - 35) + off - s.x, 35);
    let d = want - s.yaw;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    stepRider(s, { ...input, lean: Math.max(-1, Math.min(1, d * 2.5)) }, dt, terrain);
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
  // measured against points INSIDE the channel: a fixed +/-30 samples the
  // couloir's WALLS, which reports a take-off as a hole three metres deep
  const prom = K => { const g = Math.min(30, chapter(K.z).gully * 0.7);
    return height(K.x, K.z) - (height(K.x - g, K.z) + height(K.x + g, K.z)) / 2; };
  const K = kickerAt(4) ?? kickerAt(5);
  ok('a kicker is a bump you can measure', prom(K) > 1.0, prom(K).toFixed(2));
  // and EVERY kicker is, in every chapter — one that lands on a wall is not a
  // take-off, and the spread that put it there was a constant from when the
  // channel was one width
  let weak = 0, worst = 99, wk = 0;
  for (let k = 3; k < 28; k++) { const C = kickerAt(k); if (!C) continue;
    const pv = prom(C); if (pv < worst) { worst = pv; wk = k; } if (pv < 0.8) weak++; }
  ok('and every kicker in every chapter stands proud of its own channel', weak === 0,
    `${weak} weak, worst ${worst.toFixed(2)} m at k=${wk}`);
}
{
  let mons = 0, onLine = 0;
  for (let ix = -8; ix <= 8; ix++) for (let iz = -80; iz < 0; iz++) {
    for (const m of monolithsIn(ix, iz)) { mons++; if (Math.abs(m.x - lineX(m.z)) < 30) onLine++; }
  }
  ok('monoliths stand on the field, never on the line', mons > 40 && onLine === 0, `${mons} ${onLine}`);
  ok('and none at the start', [...Array(6).keys()].every(i => [-5, -4, -3, -2, -1, 0].every(iz => monolithsIn(i - 3, iz).length === 0)));
}

// ── the chapters ──
// A chapter must change the SHAPE and the SNOW, not just the colour, and every
// boundary has to be rideable without knowing it is there.
{
  const names = CHAPTERS.map(c => c.name);
  ok('the run is divided into chapters', names.length >= 5, names.join(' '));
  const seen = new Set();
  for (let d = 0; d <= 2400; d += 10) seen.add(chapter(-d).name);
  ok('and every one of them is reached on the way down', seen.size === names.length,
    `${seen.size} of ${names.length}: ${[...seen].join(' ')}`);

  const wid = d => chapter(-d).gully, dep = d => chapter(-d).deep;
  ok('the couloir really closes in', wid(1000) < wid(500) * 0.5, `${wid(1000).toFixed(0)} vs ${wid(500).toFixed(0)}`);
  ok('and the glacier really opens out', wid(1500) > wid(1000) * 3, `${wid(1500).toFixed(0)} vs ${wid(1000).toFixed(0)}`);
  ok('the couloir and the glacier are scoured', dep(1000) < 0.5 && dep(1500) < 0.35, `${dep(1000).toFixed(2)} ${dep(1500).toFixed(2)}`);
  ok('and the run-out holds the deepest snow of the run',
    dep(2200) > dep(500) && dep(2200) > dep(1500) * 4, `${dep(2200).toFixed(2)}`);

  // A hard switch would put a step in the ground, and a step in the ground is a
  // wall you cannot see. Measure the BLEND rather than the ground: the ground
  // over the glacier is deliberately cut by crevasses, and a check that cannot
  // tell an intended slot from an unintended cliff fails on the feature.
  let worst = 0, at = 0, field = '';
  for (const c of CHAPTERS.slice(1)) {
    for (let d = c.at - 60; d <= c.at + 60; d += 0.5) {
      const a = chapter(-d), b = chapter(-d - 0.5);
      for (const f of ['gully', 'wall', 'deep', 'swell', 'roll', 'crev']) {
        // scale by the field's OWN range across the chapters. A relative
        // measure divides by zero where a field starts at zero — `crev` read a
        // 100% step on an absolute change of a millionth, which is the ruler
        // being wrong rather than the blend.
        const vals = CHAPTERS.map(c => c[f]);
        const span = Math.max(...vals) - Math.min(...vals) || 1;
        const j = Math.abs(a[f] - b[f]) / span;
        if (j > worst) { worst = j; at = d; field = f; }
      }
    }
  }
  ok('no chapter boundary is a step in the blend', worst < 0.02, `${field} moved ${(worst * 100).toFixed(2)}% at ${at.toFixed(0)} m`);
}

// ── crevasses ──
// The glacier's teeth. They need no new physics — the rider already flies when
// the ground drops away faster than gravity, and already tumbles on a hard
// landing — so the whole design is geometry, and the geometry must not trap.
{
  let n = 0, deepest = 0;
  for (let k = 0; k < 60; k++) { const C = crevasseAt(k); if (C) { n++; deepest = Math.max(deepest, C.drop); } }
  ok('the glacier is cut by crevasses', n > 15, n);
  ok('and none is deeper than the ramp out can pay for', deepest <= CREV_MAX_DROP + 1e-9,
    `${deepest.toFixed(2)} of ${CREV_MAX_DROP.toFixed(2)}`);
  // THE invariant: a slot deeper than the grade drops over its own ramp has a
  // far lip standing above its floor, and the run ends in it with the clock
  // still running. That is how this shipped the first three times.
  ok('the cap is derived from the grade, not chosen', CREV_MAX_DROP < GRADE * 24,
    `${CREV_MAX_DROP.toFixed(2)} < ${(GRADE * 24).toFixed(2)}`);

  // every crevasse must be RIDEABLE OUT OF: from its floor, nothing ahead may
  // stand higher than the floor by more than the grade will give back
  let trapped = 0, worstRise = 0;
  for (let k = 0; k < 60; k++) {
    const C = crevasseAt(k); if (!C) continue;
    const floor = height(C.x, C.z);
    let rise = 0;
    for (let d = 1; d <= 40; d += 1) rise = Math.max(rise, height(C.x, C.z - d) - floor);
    if (rise > worstRise) worstRise = rise;
    if (rise > 2.5) trapped++;
  }
  ok('and you can always ride out the downhill side', trapped === 0,
    `${trapped} trap(s), worst rise ${worstRise.toFixed(2)} m`);

  // they end, so going round is a route
  const C = [...Array(60).keys()].map(crevasseAt).find(Boolean);
  ok('a crevasse ends, so round it is always a line',
    height(C.x + C.span + 25, C.z) > height(C.x, C.z) + C.drop * 0.6,
    `${(height(C.x + C.span + 25, C.z) - height(C.x, C.z)).toFixed(2)} of ${C.drop.toFixed(2)}`);

  // the x-continuity check above steps across the slope; a crevasse varies
  // along it, so the interesting axis here is z and it needs its own check
  let jump = 0, jz = 0;
  for (let i = 0; i < 4000; i++) {
    const z = -i * 0.6, x = lineX(z) + ((i % 40) - 20) * 4;
    const j = Math.abs(height(x, z) - height(x, z - 0.05));
    if (j > jump) { jump = j; jz = -z; }
  }
  ok('and the slope is continuous along the fall line too', jump < 0.35, `${jump.toFixed(3)} m at ${jz.toFixed(0)} m`);
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
  // A rider holding full brake from a standing start never moves — measured, it
  // ends 7 m down the bowl at 0.3 m/s — so the pair has to get going first and
  // then brake, or `throws spray` is really measuring `has no speed`.
  const a = ride(PACKED, {}, 24);
  const b = ride(PACKED, {}, 8); rideOn(b, PACKED, { brake: 1 }, 6);
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
  // A kicker throws the rider without a button. This used to steer at ONE known
  // kicker, which made it a test of that kicker's luck rather than of the rule:
  // k=3 sits where a swell rises behind it and swallows the drop, so a green
  // suite turned red on a mountain that launches you eighteen times. Ride at
  // several, across chapters, and ask how many throw you.
  const ride_at = K => {
    let flew = false, kick = 0;
    const s = createRider(terrain, K.x, K.z + 220);
    const ev = { kicker: () => kick++ };
    for (let t = 0; t < 60 && s.z > K.z - 40; t += 1 / 60) {
      let d = Math.atan2(K.x - s.x, Math.max(6, s.z - K.z)) - s.yaw;
      while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      stepRider(s, { lean: Math.max(-1, Math.min(1, d * 2.5)), tuck: 1 }, 1 / 60, terrain, ev);
      if (!s.grounded && s.air > 0.2) flew = true;
    }
    return flew && kick > 0;
  };
  const tried = [];
  for (let k = 3; k < 28 && tried.length < 8; k++) { const C = kickerAt(k); if (C) tried.push(C); }
  const launched = tried.filter(ride_at).length;
  ok('the terrain itself gives air off a kicker, no button pressed', launched >= 1,
    `${launched} of ${tried.length}`);
  ok('and most of the run\'s kickers do it', launched >= tried.length * 0.5,
    `${launched} of ${tried.length}`);
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
  const lx = lineX(DEEP_Z);
  // A beaten line is a RELATIVE fact: much less snow than beside it. An absolute
  // 0.35 m was calibrated when every chapter loaded the same, and the run-out
  // carries 0.42 m even where everyone rides.
  ok('a packed line runs down the middle',
    depth(lx, DEEP_Z) < depth(lx + 40, DEEP_Z) * 0.35,
    `${depth(lx, DEEP_Z).toFixed(2)} against ${depth(lx + 40, DEEP_Z).toFixed(2)} beside it`);
  ok('and deep snow lies off it', depth(lx + 40, DEEP_Z) > 0.6, depth(lx + 40, DEEP_Z));
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
  const s = createRider(terrain, lineX(DEEP_Z) + POWDER, DEEP_Z);
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
  const s = createRider(terrain, lineX(DEEP_Z) + POWDER, DEEP_Z);
  s.vx = s.vy = s.vz = 0;
  run(s, { lean: 0 }, 2, {}, 1 / 120);        // settle in, still stopped
  const bogged = s.speed;
  ok('a rider dropped into deep snow starts buried', s.sink > 0.5 && bogged < 6, `${s.sink.toFixed(2)} ${bogged.toFixed(2)}`);
  // 30 s, not 18: this now digs out of the deepest drift in the game rather than
  // out of a uniform 1.3 m, and two metres of snow takes longer to climb out of.
  // The claim is that it DOES climb out, which is the thing that makes powder a
  // medium rather than a wall — not that it does so on an old stopwatch.
  for (let t = 0; t < 30; t += 1 / 120) {
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
  const neutral = ride(POWDER, {}, 30, {}, 1 / 120, DEEP_Z), back = ride(POWDER, { brake: 1 }, 30, {}, 1 / 120, DEEP_Z);
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
  const drop = (off, z0) => {
    const s = createRider(terrain, lineX(z0) + off, z0);
    run(s, { lean: 0 }, 5, {}, 1 / 120);
    s.vy += 7; s.grounded = false; s.air = 0; s.spin = 0;
    s.yaw += Math.PI / 2;
    let fell = 0, n = 0;
    while (!s.grounded && n++ < 600) stepRider(s, { lean: 0 }, 1 / 120, terrain, { tumble: () => fell++ });
    return { fell, d: depth(s.x, s.z) };
  };
  const hard = drop(PACKED, HARD_Z), soft = drop(POWDER, DEEP_Z);
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

// ── the run, ridden the way the browser gate rides it ──
// The playthrough's P+D pilot takes a DIFFERENT line from the checks above, and
// twice now a change has passed every bare-node test and stuck that pilot on the
// mountain — a windward ridge built to make crevasses visible turned out to have
// a crest, and a crest across the fall line is a line of zero gradient you can
// balance on with every metre ahead of you lower. That took a browser and three
// minutes to find. It costs two seconds here.
{
  const s = createRider(terrain, lineX(0), 0);
  s.vz = -2;
  // AND IT FIRES THE EVENTS THE GAME FIRES. Passing none is measuring a
  // different game: the landing crater lives in main.js's `land` handler, so a
  // pilot with no events never dug one, and a crater centred on the rider — it
  // lowers the ground you are standing on, you drop into it, that counts as a
  // landing — ran 2,320 times in one descent while every bare-node check stayed
  // green. The browser found it. This is what stops the next one getting that far.
  let lands = 0;
  const ev = { land(impact, air, spins, grab) {
    lands++;
    terrain.pack.cut(s.x, s.z, 0.9 + impact * 0.07, 0.25 + impact * 0.045,
      terrain.natural, 0, 0, Math.sin(s.yaw), -Math.cos(s.yaw));
  } };
  let slowest = Infinity, slowAt = 0, stuck = 0;
  for (let g = 0; g < 600 && !s.done; g++) {
    const off = s.x - lineX(s.z);
    const lean = Math.max(-0.45, Math.min(0.45, -(off * 0.03 + s.vx * 0.10)));
    for (let t = 0; t < 1; t += 1 / 120) stepRider(s, { lean }, 1 / 120, terrain, ev);
    if (s.dist > 60) {
      if (s.speed < slowest) { slowest = s.speed; slowAt = s.dist; }
      if (s.speed < 1) stuck++;
    }
  }
  ok('the browser gate\'s own pilot gets down too', s.done && s.dist >= RUN_LENGTH,
    `${s.dist.toFixed(0)} m in ${s.time.toFixed(0)} s`);
  ok('and is never held anywhere on the way', stuck === 0 && slowest > 2,
    `slowest ${slowest.toFixed(1)} m/s at ${slowAt.toFixed(0)} m`);
  // a landing that digs a hole you then land in is a loop, and it reads as a
  // plausible number everywhere else — the count is the only place it shows
  ok('and does not land on itself over and over', lands < 200, `${lands} landings`);
  // no chapter may be a place the run slows to a crawl in
  const perCh = {};
  {
    const r = createRider(terrain, lineX(0), 0); r.vz = -2;
    for (let g = 0; g < 600 && !r.done; g++) {
      const off = r.x - lineX(r.z);
      const lean = Math.max(-0.45, Math.min(0.45, -(off * 0.03 + r.vx * 0.10)));
      for (let t = 0; t < 1; t += 1 / 120) stepRider(r, { lean }, 1 / 120, terrain);
      const n = chapter(r.z).name;
      if (r.dist > 60) perCh[n] = Math.min(perCh[n] ?? Infinity, r.speed);
    }
  }
  const worstCh = Object.entries(perCh).sort((a, b) => a[1] - b[1])[0];
  ok('and no chapter is a place it crawls', worstCh[1] > 2,
    Object.entries(perCh).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' · '));
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


// ---- the snowpack: what you take, you put somewhere -------------------------
{
  const avail = () => 1.0;
  const p = new Snowpack(); p.recentre(0, 0);
  const moved = p.cut(0, 0, 0.6, 0.4, avail, 1, 0);
  ok('a carve displaces snow', moved > 0.05, `${moved.toFixed(3)} m³`);
  // THE invariant. A pack that quietly loses mass flattens the mountain over
  // 2,400 m and nothing else in the game would ever report it.
  ok('and every cubic metre of it ends up somewhere else',
    Math.abs(p.volume()) < 1e-6, `${p.volume().toExponential(2)} m³ adrift`);
  const [lo, hi] = p.range();
  ok('the trough is cut and the berm is piled', lo < -0.1 && hi > 0.02, `${lo.toFixed(3)} / ${hi.toFixed(3)}`);
  // a berm is a ring, so the same volume spread over more cells stands lower
  // than the trough is deep — a berm taller than its own trench is a bug
  ok('and the berm stands lower than the trough is deep', hi < -lo, `${hi.toFixed(3)} vs ${(-lo).toFixed(3)}`);

  // a whole stroke, the way the board actually lays one down
  const q = new Snowpack(); q.recentre(0, 0);
  for (let i = 0; i < 400; i++) q.cut(i * 0.05, -i * 0.05, 0.6, 0.03, avail, 1, 0);
  ok('a whole stroke conserves too', Math.abs(q.volume()) < 1e-5, `${q.volume().toExponential(2)} m³`);

  // A CARVE MAY NOT CUT INTO THE FIRM FLOOR. `cut` takes an availability
  // function rather than guessing, so it can only move snow that is lying there.
  const r = new Snowpack(); r.recentre(0, 0);
  r.cut(0, 0, 0.6, 5.0, () => 0.1);
  ok('a carve cannot take snow that is not there', r.range()[0] >= -0.1001, r.range()[0].toFixed(4));

  // THE DEPTH IS A TARGET, NOT AN INCREMENT, and this is the check that says so.
  // Removing a little more on each pass looks equivalent and is not: the ground
  // behind the board ends up cut more often than the ground ahead of it, the
  // surface rises in the direction of travel, and the rider climbs the leading
  // face of its own trench for 2,400 m. Cutting to a target converges in ONE
  // pass, so there is no rate to tune and re-riding your own groove is free.
  const w = new Snowpack(); w.recentre(0, 0);
  const seen = [];
  for (let k = 0; k < 8; k++) { w.cut(0, 0, 0.6, 0.3, () => 0.8); seen.push(w.at(0, 0)); }
  ok('a groove reaches its depth in one pass', seen[0] < -0.1, seen[0].toFixed(3));
  ok('and every pass after it moves nothing at all',
    seen.every(v => v === seen[0]), seen.map(v => v.toFixed(3)).join(' '));
  // and the profile is the target, not whatever the rate happened to reach
  ok('the groove is as deep as it was asked to be',
    Math.abs(w.at(0, 0) + 0.3 * Math.cos((0.283 / 0.6) * Math.PI * 0.5) ** 2) < 0.02,
    w.at(0, 0).toFixed(4));

  // the window is a ring: ground that scrolls in is ground this run has not
  // touched, and a toroidal buffer hands back the old index unless it is zeroed
  const v = new Snowpack(); v.recentre(0, 0);
  v.cut(0, 0, 0.6, 0.4, avail);
  ok('the pack remembers where you just were', Math.abs(v.at(0, 0)) > 0.05, v.at(0, 0).toFixed(3));
  v.recentre(0, -400);
  ok('and forgets ground that scrolled out of the window', Math.abs(v.at(0, 0)) < 1e-9, v.at(0, 0).toFixed(9));
  ok('leaving the field empty rather than wrapped', Math.abs(v.volume()) < 1e-9, v.volume().toExponential(2));

  // THE TRENCH IS BEHIND THE BOARD, and that is the load-bearing one. A lane
  // reaching even half a metre ahead means the board always arrives on ground it
  // has already stripped: `sink` goes to zero and takes the float, the spray,
  // the landing cushion and the entire surfing score with it, because the powder
  // model and the displacement model are then eating the same snow.
  {
    const g = new Snowpack(); g.recentre(0, 0);
    g.cut(0, 0, 0.6, 0.5, () => 1, 0, 0, 0, -1);        // heading -z
    ok('the ground the board is standing on is untouched', Math.abs(g.at(0, 0)) < 1e-9, g.at(0, 0).toFixed(9));
    ok('and so is the ground it is about to reach', Math.abs(g.at(0, -1.5)) < 1e-9, g.at(0, -1.5).toFixed(9));
    ok('the groove is the ground it has left', g.at(0, 1.8) < -0.1, g.at(0, 1.8).toFixed(3));
  }

  // the cell has to resolve a SHOULDER, not an edge: terrain.normal takes its
  // finite difference over EPS 0.35, so a trough narrower than a couple of
  // cells reads as a cliff to the rider and jitters rather than grooves
  ok('a cell is fine enough to shoulder a trough', CELL > 0.2 && CELL < 0.6, `${CELL} m`);
}

// ---- the snow under the board is the snow you left there --------------------
{
  // The displacement is a term in `depth`, which is the whole design: it means
  // the rider, the flakes, the collision and the renderer all learn about the
  // trench without one of them being told. Assert the seam rather than trusting
  // the prose.
  const x = lineX(DEEP_Z) + 30, z = DEEP_Z;
  terrain.pack.clear(); terrain.pack.recentre(x, z);
  const nat = terrain.natural(x, z), d0 = depth(x, z), h0 = height(x, z);
  ok('an unridden mountain is its natural depth', Math.abs(d0 - nat) < 1e-9, `${d0} vs ${nat}`);
  terrain.pack.cut(x, z, 0.6, 0.35, terrain.natural);
  const d1 = depth(x, z), h1 = height(x, z);
  ok('a carve leaves less snow under the board', d1 < d0 - 0.05, `${d0.toFixed(3)} → ${d1.toFixed(3)}`);
  ok('and the surface drops with it', h1 < h0 - 0.05, `${h0.toFixed(3)} → ${h1.toFixed(3)}`);
  ok('by exactly the snow that was taken', Math.abs((h0 - h1) - (d0 - d1)) < 1e-9);
  // the firm floor is not carveable
  const deepCut = new Array(40).fill(0);
  for (let i = 0; i < 40; i++) terrain.pack.cut(x, z, 0.6, 0.5, terrain.natural);
  ok('and a hundred passes still cannot cut into the firm floor',
    depth(x, z) >= 0 && height(x, z) >= base(x, z) - 1e-9,
    `${depth(x, z).toFixed(4)} m of snow left`);
  terrain.pack.clear();
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
