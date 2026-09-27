// The controls measured the way the owner actually plays: two thumbs on glass.
//
// Owner, 2026-09-07: on-screen twin-stick touch is the MAIN control scheme.
// Every handling number before this file came from drive2.mjs / corner.mjs,
// which override `input.read` with exact steer values — so they measured the
// PHYSICS and bypassed every control scheme equally. What differs between
// schemes is the MAPPING from a hand to steer and throttle, and that is the
// only thing this file is about. Every input here is a real CDP touch event
// through input.js, never an override.
//
//   NODE_PATH=$(npm root -g) node powder/test/thumbs.mjs
//
// Two parts:
//  1. the GATE — for a thumb held at the rim at each angle, what steer and
//     throttle does the game actually receive? Pure input, no physics.
//  2. the TURN — the gesture a player makes: thumb up to power, then swept
//     out to the rim to turn hard. Driven on the rift's flat salt floor (the
//     known venue drive2 uses), against the same intent on the keyboard.
import { open, RESET_ON_SALT } from './_browser.mjs';

const W = 812, H = 375;                         // an iPhone held sideways, CSS px
const { page: p, context: ctx, close } = await open({ q: 'low', width: W, height: H, mobile: true, settle: 3000, log: false });
const cdp = await ctx.newCDPSession(p);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent',
  { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id })) });
const R = await p.evaluate(() => 58);           // STICK_R; the value input.js clamps to
const L0 = [170, 250];                          // where a left thumb lands

const input = () => p.evaluate(() => { const o = {}; window.__pw.input.read(o);
  return { steer: +o.steer.toFixed(2), throttle: +o.throttle.toFixed(2), brake: o.brake }; });
const sled = () => p.evaluate(() => { const v = window.__pw.player;
  return { kph: Math.round(v.kph), n1: +v.n1.toFixed(2), yawRate: +v.yawRate.toFixed(2),
           slip: +v.slip.toFixed(1), heading: +(v.yaw * 180 / Math.PI).toFixed(0) }; });

// ---- 1. the gate ---------------------------------------------------------
// the first touch on the menu starts the race and becomes the left stick
await touch('touchStart', [[...L0, 1]]); await p.waitForTimeout(400);
console.log('=== 1. THE GATE: thumb at the rim, what the game receives ===');
console.log('angle is above horizontal, to the right; 90 is straight up (full power)');
const gate = [];
for (const deg of [90, 75, 60, 45, 30, 15, 0]) {
  const a = deg * Math.PI / 180;
  // push well past the rim so the clamp is what decides, as a real thumb does
  const x = L0[0] + Math.cos(a) * R * 1.4, y = L0[1] - Math.sin(a) * R * 1.4;
  await touch('touchMove', [[x, y, 1]]); await p.waitForTimeout(60);
  const i = await input();
  gate.push({ deg, ...i });
  console.log(`  ${String(deg).padStart(2)}°   steer ${i.steer.toFixed(2).padStart(5)}   throttle ${i.throttle.toFixed(2)}`);
}
await touch('touchEnd', [[...L0, 1]]);
const both = gate.filter(g => g.steer >= 0.99 && g.throttle >= 0.99);
console.log(both.length
  ? `  full lock AND full throttle together: YES, at ${both.map(g => g.deg + '°').join(', ')}`
  : `  full lock AND full throttle together: NEVER — the most of both at once is ${
      gate.reduce((m, g) => Math.min(g.steer, g.throttle) > Math.min(m.steer, m.throttle) ? g : m).steer.toFixed(2)} steer`);

// ---- 2. the turn ---------------------------------------------------------
// Settle onto the salt floor at cruise, then make the gesture. The sim runs
// at ~75% of real time under SwiftShader at q=low, so read DELTAS between the
// two schemes, never the absolute numbers.
async function onSalt(speed) {
  await p.evaluate(RESET_ON_SALT, [speed, 0.85]);
  await p.waitForTimeout(250);
}
async function touchTurn(deg) {
  await onSalt(32);
  const a = deg * Math.PI / 180;
  await touch('touchStart', [[...L0, 2]]);
  await touch('touchMove', [[L0[0], L0[1] - R * 1.4, 2]]);          // thumb up: full power
  await p.waitForTimeout(600);
  const before = await sled();
  await touch('touchMove', [[L0[0] + Math.cos(a) * R * 1.4, L0[1] - Math.sin(a) * R * 1.4, 2]]);
  const got = await input();
  await p.waitForTimeout(1500);
  const after = await sled();
  await touch('touchEnd', [[L0[0], L0[1], 2]]);
  return { got, before, after };
}
// The gesture a thumb actually makes: power held, then the thumb slides out
// to the side WITHOUT dropping its height. On a round gate this could never
// be both full lock and full power; the square gate is what makes it so.
async function thumbSlide() {
  await onSalt(32);
  await touch('touchStart', [[...L0, 2]]);
  await touch('touchMove', [[L0[0], L0[1] - R * 1.4, 2]]);
  await p.waitForTimeout(600);
  const before = await sled();
  await touch('touchMove', [[L0[0] + R * 1.4, L0[1] - R * 1.4, 2]]);
  const got = await input();
  await p.waitForTimeout(1500);
  const after = await sled();
  await touch('touchEnd', [[L0[0], L0[1], 2]]);
  return { got, before, after };
}
async function keyTurn() {
  await onSalt(32);
  await p.keyboard.down('KeyW'); await p.waitForTimeout(600);
  const before = await sled();
  await p.keyboard.down('KeyD');
  await p.waitForTimeout(1500);
  const got = await input();
  const after = await sled();
  await p.keyboard.up('KeyD'); await p.keyboard.up('KeyW');
  return { got, before, after };
}
const line = (label, r) => {
  const turned = ((r.after.heading - r.before.heading + 540) % 360) - 180;
  console.log(`  ${label.padEnd(30)} sent steer ${r.got.steer.toFixed(2)} thr ${r.got.throttle.toFixed(2)}  →  ` +
    `turned ${String(turned).padStart(4)}°  slip ${String(Math.abs(r.after.slip)).padStart(4)} m/s  ` +
    `yaw ${Math.abs(r.after.yawRate).toFixed(2)} rad/s  n1 ${r.before.n1}→${r.after.n1}  ${r.before.kph}→${r.after.kph} km/h`);
  return { turned, slip: Math.abs(r.after.slip), n1drop: r.before.n1 - r.after.n1 };
};
console.log('\n=== 2. THE TURN: power on, then turn hard for 1.5 s, ~115 km/h on salt ===');
const kb = line('keyboard  W + D', await keyTurn());
const t0 = line('thumb swept to the rim, 0°', await touchTurn(0));
const t20 = line('thumb swept to the rim, 20°', await touchTurn(20));
const t45 = line('thumb swept to the rim, 45°', await touchTurn(45));
const ts = line('thumb up, slid right (natural)', await thumbSlide());
console.log('\n  what the rim costs you against the keyboard\'s full-throttle turn:');
for (const [k, t] of [['0°', t0], ['20°', t20], ['45°', t45], ['slide', ts]]) {
  console.log(`    ${k.padEnd(6)} N1 fell ${t.n1drop.toFixed(2)} (keyboard ${kb.n1drop.toFixed(2)})` +
    `   slip ${t.slip.toFixed(1)} m/s (keyboard ${kb.slip.toFixed(1)})   turned ${t.turned}° (keyboard ${kb.turned}°)`);
}
await close();
