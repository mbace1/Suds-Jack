// The NaN guard. v11 went WHITE on a phone: one pow() of a negative in the
// planet's limb shader made a NaN pixel, and bloom blurs every pixel into
// every other, so one NaN became the whole frame (black on a desktop GPU,
// white on a phone's). This plants a quad that writes NaN into the world
// layer — on a portrait phone viewport at high quality, the path the report
// came from — and reads the canvas back: with the sanitise pass (main.js)
// the world must still be there, the NaN costing a speck.
//
//   NODE_PATH=$(npm root -g) node powder/test/nan.mjs
import { open, OUT } from './_browser.mjs';
const tag = 'nan';
const { page: p, close } = await open({ q: 'high', width: 412, height: 915, mobile: true, settle: 3000, log: false });
await p.evaluate(() => window.__pw.debug.start());
await p.waitForTimeout(2500);
// plant a tiny quad in front of the camera whose fragment is NaN, on the
// world layer (the one bloom sees)
await p.evaluate(() => {
  const g = window.__pw, T = g.THREE;
  const m = new T.Mesh(new T.PlaneGeometry(0.05, 0.05), new T.ShaderMaterial({
    uniforms: { uZero: { value: 0 } },
    vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float uZero; void main(){ float n = uZero / uZero; gl_FragColor = vec4(n, n, n, 1.0); }',
    fog: false,
  }));
  m.position.set(0, 0, -3); m.frustumCulled = false;
  g.camera.add(m); g.scene.add(g.camera);
});
await p.waitForTimeout(3000);
await p.screenshot({ path: `${OUT}/phone-${tag}.png` });
const white = await p.evaluate(() => new Promise(r => requestAnimationFrame(() => {
  const c = document.getElementById('game'), gl = window.__pw.renderer.getContext();
  const px = new Uint8Array(4); const out = [];
  for (const [fx, fy] of [[0.1, 0.1], [0.5, 0.3], [0.9, 0.5], [0.2, 0.8]]) { gl.readPixels(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); out.push([...px].slice(0, 3)); }
  r(out);
})));
const lit = white.filter(([r, g, b]) => r + g + b > 60).length;
console.log(tag, JSON.stringify(white), lit >= 3 ? 'PASS: the world survives a NaN pixel' : 'FAIL: one NaN pixel took the frame');
if (lit < 3) process.exitCode = 1;
await close();
