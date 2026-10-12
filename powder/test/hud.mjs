// The HUD must not overlap itself. v12, the owner's phone screenshot: in
// portrait the NEXT GATE panel ran over the CLOCK panel and the telemetry
// ran over the ground speed. The panels are fixed-position, placed for a
// landscape screen, so this renders the race at a spread of real screen
// sizes and reports every pair of HUD boxes that intersect — including the
// arcade's HUB button and the CAM chip, which sit in the same corner.
//
//   NODE_PATH=$(npm root -g) node powder/test/hud.mjs
import { open, OUT } from './_browser.mjs';

const SIZES = [
  ['phone-portrait', 412, 915, true], ['small-phone', 360, 740, true], ['iphone', 390, 844, true],
  ['phone-landscape', 915, 412, true], ['tablet', 820, 1180, true], ['laptop', 1280, 720, false],
];
let bad = 0;
for (const [name, w, h, mobile] of SIZES) {
  const { page: p, close } = await open({ q: 'low', width: w, height: h, mobile, settle: 2500, log: false });
  await p.evaluate(() => window.__pw.debug.start());
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const els = [...document.querySelectorAll('#cluster .panel, #cam, .arcade-home')];
    const boxes = els.filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
      .map(e => { const b = e.getBoundingClientRect(); return { id: e.id || e.className, l: b.left, t: b.top, r: b.right, b: b.bottom }; })
      .filter(b => b.r > b.l && b.b > b.t);
    const hits = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      const ox = Math.min(a.r, c.r) - Math.max(a.l, c.l), oy = Math.min(a.b, c.b) - Math.max(a.t, c.t);
      if (ox > 0.5 && oy > 0.5) hits.push(`${a.id} x ${c.id} (${Math.round(ox)}x${Math.round(oy)})`);
    }
    const off = boxes.filter(b => b.l < 0 || b.t < 0 || b.r > innerWidth || b.b > innerHeight).map(b => b.id);
    return { hits, off };
  });
  await p.screenshot({ path: `${OUT}/hud-${name}.png` });
  const ok = !r.hits.length && !r.off.length;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(16)} ${w}x${h}  ${r.hits.join(', ') || ''}${r.off.length ? '  off-screen: ' + r.off.join(', ') : ''}`);
  await close();
}
process.exitCode = bad ? 1 : 0;
