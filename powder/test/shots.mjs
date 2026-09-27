// The look at the Blender ships, so the production manifest is a decision
// somebody MADE rather than one that defaulted.
//
// models/manifest.json is empty on purpose: pipeline/authored/*.py produced
// ship-nose-01, ship-aft-01 and land-derrick-01, and models/blender/manifest
// says in as many words that production stays empty "until the owner has
// looked at these in game". This is that look.
//
// It renders the SAME chassis, at the SAME camera and the SAME turbine pose,
// once on the procedural kit and once on the Blender file, so the pair can be
// held against each other. A ship rendered alone always looks fine; a ship
// rendered beside the one it would replace does not.
//
//   NODE_PATH=$(npm root -g) node powder/test/shots.mjs
import { open, OUT } from './_browser.mjs';

/** Park somewhere flat and empty so the ship is the only thing in frame. */
const PARK = () => {
  const g = window.__pw, v = g.player, z = -1200;
  const x = g.terrain.canyonX(z) + 260;          // out on the flats, clear of the rift
  v.pos.set(x, g.terrain.height(x, z) + 2.2, z);
  v.yaw = 0; v.pitch = v.roll = 0;
  v.vel.set(0, 0, 0); v.yawRate = v.pitchRate = v.rollRate = 0;
  g.terrain.update(x, z);
};

/**
 * Freeze the sled in a lit pose and put the camera on a named orbit seat.
 * @param {{az:number, el:number, dist:number, fov:number, n1:number}} s
 */
const SEAT = (s) => {
  const g = window.__pw, T = g.THREE, v = g.player;
  g.state.mode = 'paused';
  // Hiding the HUD element by element does not hold: the race loop writes the
  // panels back every frame, so a display:none set once is gone by the shot.
  // A stylesheet outranks it and the loop has nothing to undo.
  if (!document.getElementById('shotcss')) {
    const st = document.createElement('style'); st.id = 'shotcss';
    st.textContent = 'body > *:not(#game){display:none !important}';
    document.head.appendChild(st);
  }
  // the sled is on springs and was still settling when it was parked; a ship
  // photographed mid-bounce reads as a modelling fault that is not there
  v.pitch = v.roll = 0; v.pitchRate = v.rollRate = v.yawRate = 0;
  // the flames and the fans are driven by N1, so the pose has to be set or the
  // engine bay is photographed switched off
  v.n1 = s.n1; v.throttle = 1; v.pose(0.016);
  v.mesh.position.copy(v.pos);
  v.mesh.rotation.set(0, v.yaw, 0);
  // az is a compass angle about the sled: 0 is nose-on, 180 is straight up the
  // exhausts. The nose points -z, so +az swings to the ship's right.
  const a = s.az * Math.PI / 180;
  const dir = new T.Vector3(Math.sin(a), 0, -Math.cos(a));
  g.camera.position.copy(v.pos).addScaledVector(dir, s.dist);
  g.camera.position.y += s.dist * Math.tan(s.el * Math.PI / 180);
  g.camera.lookAt(v.pos.x, v.pos.y + 0.3, v.pos.z);
  g.camera.fov = s.fov; g.camera.updateProjectionMatrix();
  g.sky.update(g.camera); g.flare.update(g.camera);
};

/** What the door actually decided about each file, in the game's own words. */
const REGISTRY = () => {
  const g = window.__pw;
  return {
    ships: Object.fromEntries(Object.entries(g.models.ships).map(([id, s]) => [id, { file: s.file, tris: s.tris }])),
    landmarks: g.models.landmarks.map(l => ({ name: l.name, radius: +l.radius.toFixed(1) })),
    report: g.models.report,
  };
};

const SEATS = {
  // three-quarter front: the silhouette, the canopy, the chrome nacelles
  front: { az: 38, el: 11, dist: 11, fov: 38, n1: 0.55 },
  // rear quarter, lit: the engine bay, the nozzle bells and the flames
  bay:   { az: 152, el: 9, dist: 10, fov: 40, n1: 0.95 },
};

async function shoot(label, query, chassis) {
  const { page: p, errors, close } = await open({ q: 'high', query, settle: 3000, width: 1280, height: 720, log: false });
  await p.evaluate(c => window.__pw.debug.chassis(c), chassis);
  await p.waitForTimeout(300);
  const menu = await p.evaluate(() => (document.getElementById('msg').textContent.match(/SHIPS[^\n]*/) || [''])[0].replace(/\s+/g, ' '));
  const reg = await p.evaluate(REGISTRY);
  await p.evaluate(() => window.__pw.debug.start());
  await p.waitForTimeout(1200);
  await p.evaluate(PARK);
  await p.waitForTimeout(1200);   // let the pads settle before framing anything
  for (const [seat, s] of Object.entries(SEATS)) {
    await p.evaluate(SEAT, s);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/ship-${chassis}-${label}-${seat}.png` });
  }
  await close();
  return { menu, reg, errors };
}

/**
 * Find and photograph a placed landmark.
 *
 * populate() records one in the tile's rock list as { x, z, r: radius } with
 * no name, so it is told from a boulder by its radius matching a REGISTERED
 * landmark's exactly. Matching "r > 4" instead finds the biggest boulder,
 * which is what the first version of this photographed.
 */
async function derrick() {
  const { page: p, close } = await open({ q: 'high', query: 'models=blender', settle: 3500, width: 1280, height: 720, log: false });
  await p.evaluate(() => window.__pw.debug.start());
  await p.waitForTimeout(1200);
  const hit = await p.evaluate(() => {
    const g = window.__pw;
    const want = g.models.landmarks.map(l => l.radius);
    const near = r => want.some(w => Math.abs(r - w) < 0.02);
    const seen = [];
    // landmarks land on ~6% of tiles, so one screen of streamed tiles usually
    // holds none — walk the world until one turns up
    for (let step = 0; step < 220 && !seen.length; step++) {
      g.terrain.update((step % 15) * 260 - 1800, -Math.floor(step / 15) * 260 - 200);
      for (const t of g.terrain.tiles.values())
        for (const r of (t.props.userData.rocks || [])) if (near(r.r)) seen.push({ x: r.x, z: r.z, r: r.r });
    }
    if (!seen.length) return null;
    const b = seen[0];
    g.terrain.update(b.x, b.z);
    g.state.mode = 'paused';
    if (!document.getElementById('shotcss')) {
      const st = document.createElement('style'); st.id = 'shotcss';
      st.textContent = 'body > *:not(#game){display:none !important}';
      document.head.appendChild(st);
    }
    const y = g.terrain.height(b.x, b.z);
    // the derrick is 22 m tall; framed from 27 m at eye height its top falls
    // outside the frustum, which reads as a cropped ASSET rather than a
    // cropped photograph
    g.camera.position.set(b.x + 26, y + 9, b.z + 34);
    g.camera.lookAt(b.x, y + 12, b.z);
    g.camera.fov = 52; g.camera.updateProjectionMatrix();
    g.sky.update(g.camera); g.flare.update(g.camera);
    return { x: Math.round(b.x), z: Math.round(b.z), footprint: +b.r.toFixed(1), placedFound: seen.length };
  });
  if (hit) { await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/landmark-derrick.png` }); }
  await close();
  return hit;
}

const out = {};
for (const chassis of ['front', 'rear']) {
  out[`${chassis}/kit`]     = await shoot('kit', '', chassis);
  out[`${chassis}/blender`] = await shoot('blender', 'models=blender', chassis);
}
for (const [k, v] of Object.entries(out)) {
  console.log(`\n=== ${k} ===`);
  console.log('  menu:', v.menu || '(no SHIPS line)');
  console.log('  registered:', JSON.stringify(v.reg.ships));
  if (v.reg.landmarks.length) console.log('  landmarks:', JSON.stringify(v.reg.landmarks));
  for (const line of v.reg.report) console.log('  [models]', line);
  if (v.errors.length) console.log('  PAGE ERRORS:', v.errors.join(' | '));
}
console.log('\n=== derrick ===');
console.log(' ', JSON.stringify(await derrick()));
console.log('\nshots in', OUT);
