// The PRIMARY controls: on-screen twin sticks, driven with real touch
import { open } from './_browser.mjs';
const { page: p, context: ctx, close } = await open({ q: 'low', width: 812, height: 375, mobile: true });
const cdp = await ctx.newCDPSession(p);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id })) });
const read = () => p.evaluate(() => { const o = {}; window.__pw.input.read(o);
  return { steer: +o.steer.toFixed(2), thr: +o.throttle.toFixed(2), brake: o.brake, lean: +o.lean.toFixed(2), pan: +o.pan.toFixed(2), mode: window.__pw.state.mode }; });
const L = [180, 260], R = [640, 260];
console.log('mode before any touch:', (await read()).mode);
// first touch on the menu: should start the race AND become the left stick
await touch('touchStart', [[...L, 1]]); await p.waitForTimeout(150);
console.log('left finger down     ', JSON.stringify(await read()));
await touch('touchMove', [[L[0], L[1] - 45, 1]]); await p.waitForTimeout(80);
console.log('left up 45px         ', JSON.stringify(await read()));
await touch('touchMove', [[L[0] + 58, L[1] - 45, 1]]); await p.waitForTimeout(80);
console.log('left up+right        ', JSON.stringify(await read()));
await touch('touchMove', [[L[0], L[1] + 40, 1]]); await p.waitForTimeout(80);
console.log('left down 40px       ', JSON.stringify(await read()));
await touch('touchMove', [[L[0], L[1] - 45, 1]]);
await touch('touchStart', [[L[0], L[1] - 45, 1], [...R, 2]]); await p.waitForTimeout(80);
console.log('+ right finger down  ', JSON.stringify(await read()));
await touch('touchMove', [[L[0], L[1] - 45, 1], [R[0], R[1] + 45, 2]]); await p.waitForTimeout(80);
console.log('right pulled back    ', JSON.stringify(await read()));
await touch('touchMove', [[L[0], L[1] - 45, 1], [R[0] + 50, R[1] + 10, 2]]); await p.waitForTimeout(80);
console.log('right swept right    ', JSON.stringify(await read()));
await touch('touchMove', [[L[0], L[1] - 45, 1], [R[0], R[1] - 45, 2]]); await p.waitForTimeout(80);
console.log('right pushed forward ', JSON.stringify(await read()));
await touch('touchEnd', [[L[0], L[1] - 45, 1]]); await p.waitForTimeout(80);
console.log('left lifted          ', JSON.stringify(await read()));
await touch('touchEnd', [[R[0], R[1] - 45, 2]]); await p.waitForTimeout(80);
console.log('both lifted          ', JSON.stringify(await read()));
// fingers that wander across the midline: does the stick follow, or drop?
await touch('touchStart', [[380, 260, 3]]); await touch('touchMove', [[440, 220, 3]]); await p.waitForTimeout(80);
console.log('left stick dragged past centre', JSON.stringify(await read()));
await touch('touchEnd', [[440, 220, 3]]);
// the stick radius against a phone: 58 px of travel for full throttle
console.log('stick radius px:', await p.evaluate(() => 58), ' viewport', 812, 'x', 375, ' devicePixelRatio', await p.evaluate(() => devicePixelRatio));
await close();
