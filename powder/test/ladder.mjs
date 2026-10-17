// The handling ladder in SIM time: speed x lock, measured by stepping the
// vehicle directly at 120 Hz with the race loop paused, so the numbers do
// not depend on how fast SwiftShader draws. What it answers is the owner's
// v12 brief — "miniscule movements at high speed and more snowboarding like
// at lower speeds": how far the sled banks, how hard it turns and how much
// it slides, at each speed and lock.
//
//   NODE_PATH=$(npm root -g) node powder/test/ladder.mjs [chassis]
import { open } from './_browser.mjs';

const chassis = process.argv[2] || 'front';
// --free lets the speed go where the sled takes it (the default holds it)
const HOLD = !process.argv.includes('--free');
// SPEC overrides for an experiment:  edgeDig=0 bankMax=0.3 ...
const OVR = Object.fromEntries(process.argv.slice(3).filter(a => a.includes('=')).map(a => { const [k, v] = a.split('='); return [k, +v]; }));
const ONLY = process.argv.find(a => a.startsWith('--at='));
const { page: p, close } = await open({ q: 'low', log: false });
await p.evaluate(c => window.__pw.debug.chassis(c), chassis);
await p.evaluate(() => window.__pw.debug.start());
await p.waitForTimeout(800);
if (Object.keys(OVR).length) console.log('SPEC', JSON.stringify(await p.evaluate(async o => {
  const { SPEC } = await import(new URL('js/vehicle.js?v=12', location.href).href);
  Object.assign(SPEC, o); return o; }, OVR)));

const run = (speed, steer, secs) => p.evaluate(([speed, steer, secs, HOLD]) => {
  const g = window.__pw, v = g.player, z = -1200;
  g.state.mode = 'paused';
  // out on the deep-sand flats, where a race is mostly driven, with the rocks
  // cleared: on the rift floor half the mid-speed runs met the canyon wall
  // and read as a handling washout
  const x = g.terrain.canyonX(z) + 260;
  g.terrain.rocksNear = (_x, _z, out) => { out.length = 0; return out; };
  g.terrain.update(x, z);
  for (const q of v.pads) { q.sink = 0; q.gy = null; q.fS = 0; }
  v.pos.set(x, g.terrain.height(x, z) + 0.9, z);
  v.yaw = 0; v.pitch = v.roll = 0; v.yawRate = v.pitchRate = v.rollRate = 0;
  v.vel.set(0, 0, 0); v._FLf = v._FLr = 0; v.hitT = 0; v.impact = 0;
  const ctl = { steer: 0, throttle: 0, brake: false, lean: 0, pan: 0, overdrive: false };
  for (let i = 0; i < 240; i++) v.update(1 / 120, ctl);          // settle on the pads
  v.vel.set(0, 0, -speed); v.n1 = 0.9;
  // hold the speed with the throttle the sled would need, roughly: full
  // power, and put the speed back each step so a phase is AT its speed
  ctl.steer = steer; ctl.throttle = 1;
  let hitAt = -1, maxRoll = 0, yaw0 = v.yaw, sumYr = 0, n = 0, sumSlip = 0, sumG = 0;
  for (let i = 0; i < secs * 120; i++) {
    v.update(1 / 120, ctl);
    if (HOLD) { const sp = Math.hypot(v.vel.x, v.vel.z); if (sp > 0.1) { v.vel.x *= speed / sp; v.vel.z *= speed / sp; } }
    if (i > secs * 60) { sumYr += Math.abs(v.yawRate); sumSlip += Math.abs(v.slip); sumG += Math.abs(v.gLat); n++; }
    maxRoll = Math.max(maxRoll, Math.abs(v.roll));
    if (v.hitT > 0 && hitAt < 0) hitAt = i / 120;
  }
  const r = x => +x.toFixed(2);
  return { yr: r(sumYr / n), R: r(speed / Math.max(0.01, sumYr / n)), g: r(sumG / n), slip: r(sumSlip / n),
           bankDeg: Math.round(maxRoll * 57.3), headDeg: Math.round(Math.abs(v.yaw - yaw0) * 57.3), surf: v.surf
  , hit: hitAt, kph: Math.round(Math.hypot(v.vel.x, v.vel.z) * 3.6) };
}, [speed, steer, secs, HOLD]);

console.log(`chassis ${chassis}; ${'speed'.padEnd(8)} lock   yaw rad/s  radius m  lat g  slip m/s  bank deg  heading deg in 2 s`);
for (const speed of ONLY ? ONLY.slice(5).split(',').map(Number) : [10, 20, 30, 40, 50]) {
  for (const steer of [0.25, 0.5, 1]) {
    const o = await run(speed, steer, 2);
    console.log(`         ${String(speed + ' m/s').padEnd(8)} ${String(steer).padEnd(6)} ${String(o.yr).padEnd(10)} ${String(o.R).padEnd(9)} ${String(o.g).padEnd(6)} ${String(o.slip).padEnd(9)} ${String(o.bankDeg).padEnd(9)} ${String(o.headDeg).padEnd(6)} ${o.kph} km/h end${o.hit >= 0 ? '  HIT at ' + o.hit.toFixed(2) + ' s' : ''} ${o.surf}`);
  }
}
await close();
