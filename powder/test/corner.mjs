// The same lock ladder at a real CORNER speed, not at terminal velocity.
import { open } from './_browser.mjs';
const { page: p, root, close } = await open({ q: 'low' });
await p.evaluate(() => window.__pw.debug.start());
const run = async (v0, st, th, secs) => {
  await p.evaluate(([speed]) => { const g = window.__pw, v = g.player, z = -1200;
    const x = g.terrain.canyonX(z);
    v.pos.set(x, g.terrain.height(x, z) + 3, z);
    v.yaw = 0; v.pitch = v.roll = 0; v.yawRate = v.pitchRate = v.rollRate = 0;
    v.vel.set(0, 0, -speed); v._FLf = v._FLr = 0; v.n1 = 0.5; v.hitT = 0;
    g.terrain.update(x, z); }, [v0]);
  await p.evaluate(([s, t]) => { window.__pw.input.read = o => {
    o.steer=s; o.throttle=t; o.brake=false; o.lean=0; o.pan=0; o.overdrive=false; return o; }; }, [st, th]);
  await p.waitForTimeout(secs * 1000);
  return p.evaluate(() => { const v = window.__pw.player;
    return { kph: Math.round(v.kph), yr: +v.yawRate.toFixed(2), slip: +Math.abs(v.slip).toFixed(1),
             gLat: +Math.abs(v.gLat).toFixed(2) }; });
};
for (const [label, v0, th] of [['90 km/h, part throttle', 25, 0.45], ['65 km/h, part throttle', 18, 0.35]]) {
  console.log(`--- ${label} ---`);
  for (const [n, st] of [['quarter', -0.25], ['half', -0.5], ['full', -1]])
    console.log('  ' + n.padEnd(9), JSON.stringify(await run(v0, st, th, 2.5)));
}
await close();
