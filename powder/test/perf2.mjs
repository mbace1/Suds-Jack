// Per-pass attribution. info.render resets on every render() call unless
import { open } from './_browser.mjs';
const { page: p, root, close } = await open({ q: (process.argv[2] || 'high') });

await p.evaluate(() => {
  const g = window.__pw;
  g.renderer.info.autoReset = false;
  const T = window.__T = { n: 0, pass: {}, order: [] };
  const acc = (key, ms) => {
    const i = g.renderer.info.render, s = T.pass[key] || (T.pass[key] = { ms: 0, calls: 0, tris: 0 });
    s.ms += ms; s.calls += i.calls; s.tris += i.triangles;
    g.renderer.info.reset();
  };
  // The composer drives renderer.render internally (RenderPass, and one
  // fullscreen quad per effect), so the wrapper must not attribute those to
  // the standalone passes — it counts them as the composer's own and lets
  // info accumulate through them.
  let inComposer = false;
  const rr = g.renderer.render.bind(g.renderer);
  g.renderer.render = (...a) => {
    if (inComposer) return rr(...a);
    const t = performance.now(); const r = rr(...a);
    acc(T.seq === 0 ? '2 depth prepass (full res)' : '3 HD layer (full res)', performance.now() - t);
    T.seq = (T.seq || 0) + 1; return r;
  };
  const c = g.composer.render.bind(g.composer);
  g.composer.render = (...a) => {
    inComposer = true;
    const t = performance.now(); const r = c(...a);
    inComposer = false;
    acc('1 composer (PS2 world, 0.62x)', performance.now() - t); T.seq = 0; return r;
  };
  g.debug.start();
  const tick = () => { T.n++; requestAnimationFrame(tick); };
  tick();
});
await p.keyboard.down('KeyW');
await p.waitForTimeout(12000);
const r = await p.evaluate(() => {
  const T = window.__T, out = { q: window.__pw.quality, frames: T.n, pass: {} };
  for (const k of Object.keys(T.pass).sort()) { const s = T.pass[k];
    out.pass[k] = { ms: +(s.ms / T.n).toFixed(2), calls: Math.round(s.calls / T.n), tris: Math.round(s.tris / T.n) }; }
  return out;
});
console.log(`\n=== ${r.q} @1280x720, ${r.frames} frames ===`);
console.log('pass'.padEnd(30) + 'ms'.padStart(8) + 'calls'.padStart(8) + 'tris'.padStart(10));
let m = 0, c = 0, t = 0;
for (const k in r.pass) { const s = r.pass[k]; m += s.ms; c += s.calls; t += s.tris;
  console.log(k.padEnd(30) + s.ms.toFixed(2).padStart(8) + String(s.calls).padStart(8) + ((s.tris/1000).toFixed(1)+'k').padStart(10)); }
console.log('TOTAL'.padEnd(30) + m.toFixed(2).padStart(8) + String(c).padStart(8) + ((t/1000).toFixed(1)+'k').padStart(10));
await close();
