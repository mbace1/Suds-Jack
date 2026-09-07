// Handling on a KNOWN venue. The open-field version of this test kept
import { open } from './_browser.mjs';
const { page: p, root, close } = await open({ q: 'low' });
await p.evaluate(() => window.__pw.debug.start());
const set = (st, th) => p.evaluate(([s, t]) => { window.__pw.input.read = o => {
  o.steer=s; o.throttle=t; o.brake=false; o.lean=0; o.pan=0; o.overdrive=false; return o; }; }, [st, th]);
// drop onto the salt floor heading down the rift at 35 m/s
const reset = () => p.evaluate(() => { const g = window.__pw, v = g.player, z = -1200;
  const x = g.terrain.canyonX(z);
  v.pos.set(x, g.terrain.height(x, z) + 3, z);
  v.yaw = 0; v.pitch = v.roll = 0; v.yawRate = v.pitchRate = v.rollRate = 0;
  v.vel.set(0, 0, -35); v._FLf = v._FLr = 0; v.n1 = 0.85; v.hitT = 0; v.impact = 0;
  g.terrain.update(x, z); });
const snap = () => p.evaluate(() => { const v = window.__pw.player;
  return { kph: Math.round(v.kph), yr: +v.yawRate.toFixed(2), slip: +Math.abs(v.slip).toFixed(1),
           surf: v.surf, hit: +v.hitT.toFixed(1) }; });
const phase = async (label, st, th, secs) => {
  await reset(); await set(st, th); await p.waitForTimeout(secs * 1000);
  console.log(label.padEnd(24), JSON.stringify(await snap()));
  return snap();
};
console.log('--- on the salt floor, 3 s per phase ---');
await phase('straight, full throttle', 0, 1, 3);
await phase('quarter lock', -0.25, 1, 3);
await phase('half lock', -0.5, 1, 3);
await phase('full lock', -1, 1, 3);
await phase('full lock, 6 s', -1, 1, 6);

console.log('\n--- release from a full-lock slide ---');
await reset(); await set(-1, 1); await p.waitForTimeout(3500);
console.log('at release            ', JSON.stringify(await snap()));
await set(0, 1);
for (const ms of [500, 500, 1000]) { await p.waitForTimeout(ms);
  console.log('  +' + ms + 'ms'.padEnd(16), JSON.stringify(await snap())); }

console.log('\n--- countersteer out of the same slide ---');
await reset(); await set(-1, 1); await p.waitForTimeout(3500);
console.log('at countersteer       ', JSON.stringify(await snap()));
await set(1, 0.4); await p.waitForTimeout(1200);
console.log('  +1.2s opposite lock ', JSON.stringify(await snap()));
await close();
