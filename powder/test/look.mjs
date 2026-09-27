// The look, through the GAME'S OWN camera, in the moments a player sees.
//
// shots.mjs photographs the ship on a turntable; this photographs the race.
// Every scene is set up the same way each run (a park, a speed, a held
// input) and then left to the real loop for a fixed wall time, so a
// before/after pair is the same moment rendered by two builds. It asserts
// nothing: a gate certifies works, and this is about looks.
//
//   NODE_PATH=$(npm root -g) node powder/test/look.mjs [tag] [--size WxH] [--q high|low] [--only a,b]
//
// Shots land in powder/test/out/look-<tag>-<scene>.png (gitignored).
import { open, OUT, FIND_DUNE } from './_browser.mjs';

const args = process.argv.slice(2);
const tag = args.find(a => !a.startsWith('--') && !/^\d+x\d+$|^(high|low)$/.test(a)) || 'now';
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [W, H] = arg('--size', '1280x720').split('x').map(Number);
const Q = arg('--q', 'high');
const ONLY = (arg('--only', '') || '').split(',').filter(Boolean);

/** Put the player somewhere known, moving, with a held input. */
const SETUP = ([where, speed, n1, steer, lean, dune]) => {
  const g = window.__pw, v = g.player, T = g.terrain;
  // the flats shots run on a clean dune straight FIND_DUNE found: the first
  // lanes tried had a boulder or a monolith in them, and a shot of the car
  // sliding off a rock is not a shot of how it drives
  const z = where === 'rift' ? -1200 : dune.z;
  const x = where === 'rift' ? T.canyonX(z) : dune.x;
  T.rocksNear = (_x, _z, out) => { out.length = 0; return out; };   // see FIND_DUNE
  v.pos.set(x, T.height(x, z) + 0.7, z);
  v.yaw = 0; v.pitch = v.roll = 0; v.yawRate = v.pitchRate = v.rollRate = 0;
  v.vel.set(0, 0, -speed); v.n1 = n1; v.hitT = 0; v.impact = 0; v.damage = 0;
  v._FLf = v._FLr = 0;
  for (const o of g.field) if (o !== v) { o.pos.set(x + (Math.random() - 0.5) * 30, 0, z + 40 + Math.random() * 60); o.pos.y = T.height(o.pos.x, o.pos.z) + 2.4; o.vel.set(0, 0, -speed * 0.95); }
  T.update(x, z);
  g.input.read = o => { o.steer = steer; o.throttle = 1; o.brake = false; o.lean = lean; o.pan = 0; o.overdrive = lean > 0.45; return o; };
  g.state.timer = 60;
  for (const q of v.pads) { q.sink = 0; q.gy = null; q.fS = 0; }
  g.trenches.clear();
  // run the held input for 2 s of SIM time now, through the whole race step,
  // so the shot is of a carve already established — grooves cut, spray in
  // the air: under SwiftShader the loop is a fraction of real time, and a
  // few frames after a teleport the car is still landing
  g.debug.advance(240);
  g.debug.snapCamera();
};

const SCENES = {
  menu:   { menu: true, wait: 2500 },
  start:  { start: true, wait: 900 },
  cruise: { setup: ['flats', 42, 0.9, 0, 0], wait: 900 },
  carve:  { setup: ['flats', 38, 0.9, 0.85, 0], wait: 900 },
  rift:   { setup: ['rift', 48, 0.95, 0.15, 0], wait: 900 },
  boost:  { setup: ['flats', 44, 1.0, 0, 1], wait: 900 },
};

const { page: p, errors, close } = await open({ q: Q, width: W, height: H, settle: 3000, log: false });
await p.evaluate(() => window.__pw.debug.start());
const dune = await p.evaluate(FIND_DUNE);
console.log('  dune venue', JSON.stringify(dune));
for (const [name, s] of Object.entries(SCENES)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  if (s.menu) {
    await p.waitForTimeout(s.wait);
  } else {
    await p.evaluate(() => window.__pw.debug.start());
    if (s.setup) { await p.waitForTimeout(400); await p.evaluate(SETUP, [...s.setup, dune]); }
    await p.waitForTimeout(s.wait);
  }
  const st = await p.evaluate(() => {
    const v = window.__pw.player;
    return v ? { kph: Math.round(v.kph), slip: +v.slip.toFixed(1), sink: +(v.sink * 100).toFixed(0), roll: +(v.roll * 57.3).toFixed(1), edge: +v.edge.toFixed(2), fov: +window.__pw.camera.fov.toFixed(1), hit: v.hitT > 0 } : {};
  });
  await p.screenshot({ path: `${OUT}/look-${tag}-${name}.png` });
  console.log(`  ${name.padEnd(7)} ${JSON.stringify(st)}`);
}
if (errors.length) console.log('PAGE ERRORS:', errors.join(' | '));
await close();
console.log(`shots: ${OUT}/look-${tag}-*.png`);
