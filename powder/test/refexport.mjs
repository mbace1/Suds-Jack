// Export the KIT ships and two kit landmarks as .glb, in exactly the form
import { open } from './_browser.mjs';
const { page: p, root, close } = await open({ q: 'low' });
import { writeFileSync } from 'node:fs';

const exportShip = async (chassis) => {
  await p.evaluate(ch => window.__pw.debug.chassis(ch), chassis);
  await p.evaluate(() => window.__pw.debug.start());
  await p.waitForTimeout(400);
  const b64 = await p.evaluate(async () => {
    const g = window.__pw, T = g.THREE;
    const { GLTFExporter } = await import('https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/exporters/GLTFExporter.js');
    const src = g.player.mesh;
    const root = new T.Group(); root.name = 'ship';
    const S = src.scale.x;                       // the kit's 0.74, baked into the geometry
    for (const c of src.children) {
      if (c.name === 'flame') continue;          // runtime, not asset
      if (c.isMesh) {
        const m = new T.Mesh(c.geometry.clone(), c.material);
        // fans carry their radius as object scale; the contract wants object scale 1
        const sc = c.scale.x !== 1 ? c.scale.x : 1;
        m.geometry.scale(S * sc, S * sc, S * sc);
        m.position.copy(c.position).multiplyScalar(S);
        m.quaternion.copy(c.quaternion);
        m.name = c.name || (c.material.name || 'part').toLowerCase();
        root.add(m);
      } else if (c.name.startsWith('nozzle')) {
        const e = new T.Object3D(); e.name = c.name;
        e.position.copy(c.position).multiplyScalar(S);
        root.add(e);
      }
    }
    // the sprite-less, envMap-less materials export cleanly; strip envMaps
    root.traverse(o => { if (o.isMesh) { const m = o.material.clone(); m.envMap = null; m.name = o.material.name; o.material = m; } });
    const bin = await new Promise((res, rej) => new GLTFExporter().parse(root, res, rej, { binary: true }));
    let s = ''; const u8 = new Uint8Array(bin); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(OUT + `ship-${chassis === 'front' ? 'nose' : 'aft'}.glb`, buf);
  console.log(`ship-${chassis === 'front' ? 'nose' : 'aft'}.glb`, (buf.length / 1024).toFixed(0) + ' KB');
};
await exportShip('front');
await exportShip('rear');

// two landmarks from the kit's own recipe: an arch, and a monolith row
const exportLand = async (name, buildSrc) => {
  const b64 = await p.evaluate(async ([src]) => {
    const g = window.__pw, T = g.THREE;
    const { GLTFExporter } = await import('https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/exporters/GLTFExporter.js');
    const root = (0, eval)('(' + src + ')')(T, g);
    const bin = await new Promise((res, rej) => new GLTFExporter().parse(root, res, rej, { binary: true }));
    let s = ''; const u8 = new Uint8Array(bin); for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }, [buildSrc.toString()]);
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(OUT + name, buf);
  console.log(name, (buf.length / 1024).toFixed(0) + ' KB');
};
const paint = `const paint = (geo, hex) => { const c = new T.Color(hex); const n = geo.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b; } geo.setAttribute('color', new T.BufferAttribute(col, 3)); return geo; };
  const LAND = new T.MeshBasicMaterial({ vertexColors: true }); LAND.name = 'LAND';`;
await exportLand('land-arch-01.glb', new Function('T', 'g', `${paint}
  const root = new T.Group(); root.name = 'land-arch-01';
  const span = 40, rise = 26, segs = 9;
  for (let s = 0; s <= segs; s++) {
    const t = s / segs, a = Math.PI * t;
    const m = new T.Mesh(paint(new T.BoxGeometry(span / segs * 1.25, 5.5, 6), 0x7c5062), LAND);
    m.position.set(-Math.cos(a) * span / 2, Math.sin(a) * rise, 0);
    m.rotation.z = -a + Math.PI / 2;
    m.name = 'arch_' + s; root.add(m);
  }
  return root;`));
await exportLand('land-monoliths-01.glb', new Function('T', 'g', `${paint}
  const root = new T.Group(); root.name = 'land-monoliths-01';
  for (let s = 0; s < 4; s++) {
    const h = 30 * (1 - s * 0.13);
    const m = new T.Mesh(paint(new T.BoxGeometry(4.2, h, 1.8), s % 2 ? 0x9088b4 : 0x5c5478), LAND);
    m.position.set(s * 11, h / 2 - 1.5, s * 2.5); m.rotation.y = 0.2 * s; m.rotation.z = 0.03;
    m.name = 'slab_' + s; root.add(m);
  }
  return root;`));
writeFileSync(OUT + 'manifest.json', JSON.stringify({
  _: 'The kit, exported. Load with ?models=reference to exercise the pipeline door end to end.',
  ships: { nose: 'ship-nose.glb', aft: 'ship-aft.glb' },
  landmarks: ['land-arch-01.glb', 'land-monoliths-01.glb'],
  numerals: null,
}, null, 2) + '\n');
console.log('reference manifest written');
await close();
