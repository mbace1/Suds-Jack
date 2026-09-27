// The kit ship on a turntable: four seats, both chassis, the pods posed on
// the ground they are parked on. shots.mjs holds the kit against a Blender
// file; this one is for looking at the kit itself while it is being built.
//
//   NODE_PATH=$(npm root -g) node powder/test/car.mjs [tag]
//
// Shots land in powder/test/out/car-<tag>-<chassis>-<seat>.png (gitignored).
import { open, OUT } from './_browser.mjs';

const tag = process.argv[2] || 'now';

const PARK = () => {
  const g = window.__pw, v = g.player, z = -1200;
  const x = g.terrain.canyonX(z) + 260;          // out on the flats, clear of the rift
  v.pos.set(x, g.terrain.height(x, z) + 1.2, z);
  v.yaw = 0; v.pitch = v.roll = 0;
  v.vel.set(0, 0, 0); v.yawRate = v.pitchRate = v.rollRate = 0;
  g.input.read = o => { o.steer = 0; o.throttle = 0; o.brake = false; o.lean = 0; o.pan = 0; o.overdrive = false; return o; };
  g.terrain.update(x, z);
  // settle onto the pads NOW, in sim time: under SwiftShader the race loop
  // runs at a fraction of real time and a turntable shot of a car still
  // dropping onto its springs shows it floating
  const ctl = { steer: 0, throttle: 0, brake: false, lean: 0, pan: 0, overdrive: false };
  for (let i = 0; i < 360; i++) v.update(1 / 120, ctl);
  v.vel.set(0, 0, 0);
};

const SEAT = (s) => {
  const g = window.__pw, T = g.THREE, v = g.player;
  g.state.mode = 'paused';
  if (!document.getElementById('shotcss')) {
    const st = document.createElement('style'); st.id = 'shotcss';
    st.textContent = 'body > *:not(#game){display:none !important}';
    document.head.appendChild(st);
  }
  v.steerVis = s.steer || 0;
  v.n1 = s.n1; v.throttle = 1; v.pose(0.016);
  const a = s.az * Math.PI / 180;
  const dir = new T.Vector3(Math.sin(a), 0, -Math.cos(a));
  g.camera.position.copy(v.pos).addScaledVector(dir, s.dist);
  g.camera.position.y += s.dist * Math.tan(s.el * Math.PI / 180);
  g.camera.lookAt(v.pos.x, v.pos.y - 0.2, v.pos.z);
  g.camera.fov = s.fov; g.camera.updateProjectionMatrix();
  g.sky.update(g.camera); g.flare.update(g.camera);
};

const SEATS = {
  front: { az: 35, el: 14, dist: 12, fov: 40, n1: 0.5, steer: 0.6 },
  side:  { az: 90, el: 6, dist: 12, fov: 42, n1: 0.5 },
  rear:  { az: 150, el: 16, dist: 12, fov: 40, n1: 0.95 },
  chase: { az: 180, el: 12, dist: 11, fov: 58, n1: 0.9 },
};

const { page: p, errors, close } = await open({ q: 'high', settle: 3000, width: 1280, height: 720, log: false });
for (const chassis of ['front', 'rear']) {
  await p.evaluate(c => window.__pw.debug.chassis(c), chassis);
  await p.evaluate(() => window.__pw.debug.start());
  await p.waitForTimeout(500);
  await p.evaluate(PARK);
  await p.waitForTimeout(1500);                    // let the pads settle onto the sand
  const info = await p.evaluate(() => {
    const v = window.__pw.player, b = new window.__pw.THREE.Box3().setFromObject(v.mesh), s = b.getSize(new window.__pw.THREE.Vector3());
    let tris = 0; v.mesh.traverse(o => { if (o.isMesh && o.geometry) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    let draws = 0; v.mesh.traverse(o => { if ((o.isMesh || o.isSprite) && o.visible) draws++; });
    return { size: [s.x, s.y, s.z].map(n => +n.toFixed(2)), tris: Math.round(tris), draws, gap: +v.gap.toFixed(2), sink: +(v.sink * 100).toFixed(0) };
  });
  console.log(`  ${chassis}: ${JSON.stringify(info)}`);
  for (const [seat, s] of Object.entries(SEATS)) {
    await p.evaluate(SEAT, s);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/car-${tag}-${chassis}-${seat}.png` });
  }
  await p.evaluate(() => { document.getElementById('shotcss')?.remove(); window.__pw.state.mode = 'menu'; });
}
if (errors.length) console.log('PAGE ERRORS:', errors.join(' | '));
await close();
console.log(`shots: ${OUT}/car-${tag}-*.png`);
