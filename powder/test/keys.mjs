// The keyboard, as a player uses it: TAPS and short holds, through real key
import { open } from './_browser.mjs';
const { page: p, root, close } = await open({ q: 'low' });
await p.evaluate(() => window.__pw.debug.start());
const reset = (speed, n1 = 0.6) => p.evaluate(([sp, n]) => { const g = window.__pw, v = g.player, z = -1200;
  const x = g.terrain.canyonX(z); v.pos.set(x, g.terrain.height(x, z) + 3, z);
  v.yaw = 0; v.pitch = v.roll = 0; v.yawRate = v.pitchRate = v.rollRate = 0;
  v.vel.set(0, 0, -sp); v._FLf = v._FLr = 0; v.n1 = n; v.hitT = 0; g.input._kSteer = 0;
  g.terrain.update(x, z); }, [speed, n1]);
const snap = () => p.evaluate(() => { const v = window.__pw.player;
  return { kph: Math.round(v.kph), hdg: +(v.yaw * 57.3).toFixed(1), slip: +Math.abs(v.slip).toFixed(1), n1: +v.n1.toFixed(2) }; });
const peakSlip = ms => p.evaluate(m => new Promise(r => { const g = window.__pw; let pk = 0, n = 0;
  const id = setInterval(() => { pk = Math.max(pk, Math.abs(g.player.slip)); if (++n * 50 >= m) { clearInterval(id); r(+pk.toFixed(1)); } }, 50); }), ms);

for (const kph of [90, 140]) {
  console.log(`--- keyboard at ${kph} km/h (W held) ---`);
  for (const [name, ms] of [['tap A 120ms', 120], ['hold A 400ms', 400], ['hold A 1000ms', 1000]]) {
    await reset(kph / 3.6, 0.85); await p.keyboard.down('KeyW'); await p.waitForTimeout(150);
    await p.keyboard.down('KeyA'); await p.waitForTimeout(ms); await p.keyboard.up('KeyA');
    const pk = await peakSlip(1200);
    const s = await snap(); await p.keyboard.up('KeyW');
    console.log('  ' + name.padEnd(15), `heading ${s.hdg}deg after, peak slip ${pk} m/s, ${s.kph} km/h`);
  }
}
console.log('--- throttle: time from idle to 50% thrust (N1 0.71) ---');
await reset(15, 0.15); await p.keyboard.down('KeyW');
const t50 = await p.evaluate(() => new Promise(r => { const g = window.__pw, t0 = performance.now();
  const id = setInterval(() => { if (g.player.n1 >= 0.707) { clearInterval(id); r(((performance.now() - t0) / 1000).toFixed(2)); } }, 20); }));
await p.keyboard.up('KeyW'); console.log(`  ${t50} s`);
console.log('--- brake: S from 140 km/h ---');
await reset(140 / 3.6, 0.3); await p.keyboard.down('KeyS');
for (const t of [1, 2, 3]) { await p.waitForTimeout(1000); console.log(`  +${t}s ${(await snap()).kph} km/h`); }
await p.keyboard.up('KeyS');
await close();
