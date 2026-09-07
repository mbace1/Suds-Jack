// Is the haze actually bending pixels? Two frames of the same paused pose,
import { open } from './_browser.mjs';
const { page: p, root, close } = await open({ q: 'high' });
await p.evaluate(() => { window.__pw.debug.chassis('rear'); window.__pw.debug.start(); });
await p.evaluate(() => { const g = window.__pw;
  g.input.read = (o) => { o.steer = 0; o.throttle = 1; o.brake=false; o.lean=0; o.pan=0; o.overdrive=true; return o; }; });
await p.waitForTimeout(3000);
// park: camera low behind the tail, looking through the exhaust at the flats
await p.evaluate(() => {
  const g = window.__pw, T = g.THREE, v = g.player;
  g.state.mode = 'paused';
  document.getElementById('msg').style.display = 'none';
  const fwd = new T.Vector3(Math.sin(v.yaw), 0, -Math.cos(v.yaw));
  g.camera.position.copy(v.pos).addScaledVector(fwd, 14); g.camera.position.y += 1.2;
  g.camera.lookAt(v.pos.x - fwd.x * 30, v.pos.y + 0.5, v.pos.z - fwd.z * 30);
  g.camera.fov = 50; g.camera.updateProjectionMatrix();
  g.sky.update(g.camera); g.flare.update(g.camera);
  // freeze the haze particles where they are so both frames see the same set
  g.haze.update = () => {};
  g.haze.mat.uniforms.uTime.value = 3; g.haze.bandMat.uniforms.uTime.value = 3;
  window.__count = () => { let n = 0; for (let i = 0; i < g.haze.n; i++) if (g.haze.alpha[i] > 0) n++; return n; };
});
console.log('live haze sprites:', await p.evaluate(() => window.__count()));
await p.waitForTimeout(300);
const A = (await p.screenshot({ path: 'haze-on.png' })).toString('base64');
await p.evaluate(() => { const g = window.__pw; g.haze.scene.visible = false; });
await p.waitForTimeout(300);
const B = (await p.screenshot({ path: 'haze-off.png' })).toString('base64');
const diff = await p.evaluate(async ([a, b]) => {
  const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
  const [ia, ib] = await Promise.all([load(a), load(b)]);
  const W = ia.width, H = ia.height;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, W, H).data;
  g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, W, H).data;
  let changed = 0, rows = new Array(H).fill(0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    const d = Math.abs(da[o] - db[o]) + Math.abs(da[o + 1] - db[o + 1]) + Math.abs(da[o + 2] - db[o + 2]);
    if (d > 18) { changed++; rows[y]++; }
  }
  const bands = [];
  for (let y = 0; y < H; y += 72) bands.push(rows.slice(y, y + 72).reduce((s, v) => s + v, 0));
  return { changed, pct: (100 * changed / (W * H)).toFixed(2), bands };
}, [A, B]);
console.log('pixels moved by the haze:', diff.changed, `(${diff.pct}%)`);
console.log('by 72px row band, top→bottom:', diff.bands.join(' '));
await close();
