// Gamepad verification. navigator.getGamepads is stubbed BEFORE the page's
import { open } from './_browser.mjs';
const { browser, page: _first, base, close } = await open({ q: 'low', settle: 200, log: false });
await _first.close();
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await (await import('./_browser.mjs')).routeThree(p);
await p.addInitScript(() => {
  window.__PAD = { connected: true, axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  navigator.getGamepads = () => [window.__PAD, null, null, null];
});
await p.goto(`${base}/powder/?q=low`, { waitUntil: 'load' });
await p.waitForTimeout(2500);

const res = await p.evaluate(() => {
  const g = window.__pw, P = window.__PAD;
  const hits = { start: 0, pause: 0, swap: 0 };
  g.input.onStart = () => hits.start++;
  g.input.onPause = () => hits.pause++;
  g.input.onSwap = () => hits.swap++;
  const set = (ax, btn = {}) => {
    P.axes = ax.slice();
    P.buttons = Array.from({ length: 17 }, (_, i) =>
      ({ pressed: !!btn[i], value: typeof btn[i] === 'number' ? btn[i] : (btn[i] ? 1 : 0) }));
  };
  const read = () => { g.input.pollGamepad(); const o = {}; g.input.read(o);
    return { steer: +o.steer.toFixed(3), throttle: +o.throttle.toFixed(3), brake: o.brake,
             lean: +o.lean.toFixed(3), pan: +o.pan.toFixed(3), overdrive: o.overdrive,
             seen: g.input.gamepad }; };
  const out = {};
  set([0, 0, 0, 0]);                       out.neutral      = read();
  set([0, -1, 0, 0]);                      out.LstickUp     = read();
  set([0, 1, 0, 0]);                       out.LstickDown   = read();
  set([-1, 0, 0, 0]);                      out.LstickLeft   = read();
  set([1, 0, 0, 0]);                       out.LstickRight  = read();
  set([0, 0, 0, 1]);                       out.RstickDown   = read();
  set([0, 0, 0, -1]);                      out.RstickUp     = read();
  set([0, 0, -1, 0]);                      out.RstickLeft   = read();
  set([0, 0, 0, 0], { 7: 1 });             out.RT           = read();
  set([0, 0, 0, 0], { 6: 1 });             out.LT           = read();
  set([0.10, -0.10, 0.10, 0.10]);          out.deadzone     = read();
  set([0, -0.5, 0, 0]);                    out.halfThrottle = read();
  // edge detection: A, Start, Y held for three polls each
  set([0, 0, 0, 0], { 0: 1, 9: 1, 3: 1 });
  g.input.pollGamepad(); g.input.pollGamepad(); g.input.pollGamepad();
  out.heldHits = { ...hits };
  set([0, 0, 0, 0]); g.input.pollGamepad();
  set([0, 0, 0, 0], { 0: 1, 9: 1, 3: 1 }); g.input.pollGamepad();
  out.repressHits = { ...hits };
  // unplug: the pad must stop contributing and the touch overlay come back
  window.__PAD.connected = false;
  g.input.pollGamepad();
  out.unplugged = read();
  return out;
});
for (const k in res) console.log(k.padEnd(14), JSON.stringify(res[k]));
await close();
