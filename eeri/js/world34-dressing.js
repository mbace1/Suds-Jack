// EERI — TEMPORARY World 3/4 visual sidecar for the greybox playtest pass.
//
// Collision, route shape and progression live in world34-rooms.js. Nothing
// here is standable or interactive. The whole point is to get enough PLACE
// identity on screen to judge layouts without accidentally tuning around art.
//
// WORLD 3 uses the approved Library cutouts already on this branch: hollow
// log/root tunnel + stump/felled-log clearing. WORLD 4 now follows the three
// owner-supplied 2026-08-16 source pieces directly in composition and colour:
//   4-1 grey loading dock / service wall
//   4-2 blue multi-bay warehouse exterior
//   4-3 blue/orange gantry crane as the dominant final silhouette
// The source sheets arrived with baked black backgrounds, so this pass keeps
// them as source art and builds clean non-collision planes around the existing
// transparent work-light / barrier / cable-reel cutouts. The large source art
// can replace those planes one-for-one after final alpha prep.
//
// Browser-only: world34-register.js imports this dynamically. Waiting for the
// existing __eeri THREE/scene handles keeps the plain-Node room gate pure.

const ASSET = {
  forestTunnel: new URL('../assets/2d/world3_log_tunnel_lib_v1.webp', import.meta.url).href,
  forestClearing: new URL('../assets/2d/world3_stump_clearing_lib_v1.webp', import.meta.url).href,
  worklamp: new URL('../assets/2d/world4_worklamp_lib_v1.webp', import.meta.url).href,
  reel: new URL('../assets/2d/world4_cable_reel_lib_v1.webp', import.meta.url).href,
  barriers: new URL('../assets/2d/world4_barrier_lamps_lib_v1.webp', import.meta.url).href,
};

let mounted = null;
let mountedSite = -1;
let loader = null;
const textures = new Map();

function disposeGroup(scene, root) {
  if (!root) return;
  scene.remove(root);
  root.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) m.dispose?.();
  });
}

function texture(THREE, key, done) {
  if (textures.has(key)) return done(textures.get(key));
  loader ||= new THREE.TextureLoader();
  loader.load(ASSET[key], (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    textures.set(key, tex);
    done(tex);
  }, undefined, () => console.warn(`[eeri] World 3/4 dressing asset failed: ${key}`));
}

function cutout(THREE, root, key, x, y, h, z = -0.85, opacity = 1) {
  texture(THREE, key, (tex) => {
    if (!root.parent) return; // site changed while the texture was loading
    const iw = tex.image?.naturalWidth || tex.image?.width || 1;
    const ih = tex.image?.naturalHeight || tex.image?.height || 1;
    const w = h * iw / ih;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, opacity,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    root.add(mesh);
  });
}

function panel(THREE, root, x, y, w, h, color, z = -1.1, opacity = 1) {
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z); root.add(mesh); return mesh;
}

function stripe(THREE, root, x, y, w, z = -0.72) {
  const n = Math.max(4, Math.round(w / 1.1));
  const cw = w / n;
  for (let i = 0; i < n; i++) {
    panel(THREE, root, x - w / 2 + cw * (i + 0.5), y, cw * 0.94, 0.34,
      i % 2 ? 0xf2a51c : 0x26221c, z);
  }
}

function warmWindow(THREE, root, x, y, w, h, z = -0.70) {
  panel(THREE, root, x, y, w + 0.35, h + 0.35, 0x243140, z - 0.03);
  panel(THREE, root, x, y, w, h, 0xffbd48, z);
}

function world3Backdrop(THREE, root) {
  // Broad green card masks the old Groundworks near layer. The actual Library
  // cutouts provide material detail; the mask only makes them belong together.
  panel(THREE, root, 48, 9, 122, 18, 0x577453, -1.62);
  panel(THREE, root, 48, 4.3, 122, 3.2, 0x394d38, -1.57);
}

function forestSite(THREE, scene, site) {
  const root = new THREE.Group();
  root.name = `world3-library-dressing-${site + 1}`;
  scene.add(root);
  world3Backdrop(THREE, root);

  // Large empty windows remain around every jump/hoist. The compositions
  // alternate organic mass and built timber, matching the World-3 catalog.
  if (site === 6) {                         // 3-1 THE CUT BANK
    cutout(THREE, root, 'forestTunnel', 22, 6.3, 8.0, -0.95, 0.94);
    cutout(THREE, root, 'forestClearing', 72, 5.9, 7.2, -0.90, 0.97);
  } else if (site === 7) {                  // 3-2 THE TIMBER LIFT
    cutout(THREE, root, 'forestClearing', 18, 6.0, 7.0, -0.92, 0.96);
    cutout(THREE, root, 'forestTunnel', 65, 6.7, 8.5, -0.97, 0.92);
    for (const x of [43, 83]) {              // timber-brace rhythm behind lifts
      panel(THREE, root, x, 8.0, 0.45, 7.6, 0x8a6242, -0.86);
      panel(THREE, root, x + 2.7, 8.0, 0.45, 7.6, 0x8a6242, -0.86);
      const d = panel(THREE, root, x + 1.35, 8.0, 0.30, 8.0, 0xa87c52, -0.84);
      d.rotation.z = -0.34;
    }
  } else {                                  // 3-3 ROOT WORKS
    cutout(THREE, root, 'forestTunnel', 18, 6.4, 8.0, -0.96, 0.94);
    cutout(THREE, root, 'forestClearing', 55, 6.1, 7.4, -0.91, 0.96);
    cutout(THREE, root, 'forestClearing', 87, 5.4, 5.9, -0.94, 0.90);
  }
  return root;
}

function nightBase(THREE, root) {
  // Cool blue card in FRONT of the old Groundworks near layer but behind z=0.
  // It changes the place, not Eeri/enemies/collectibles. Warm art does the rest.
  panel(THREE, root, 48, 9, 122, 19, 0x172b43, -1.66);
  panel(THREE, root, 48, 4.3, 122, 3.3, 0x101c2b, -1.60);
}

function loadingDock(THREE, root, wide = false) {
  // 4-1 source = grey service/loading wall. 4-2 source = blue three-bay
  // warehouse. These are intentionally flat planes: visual architecture,
  // never a second collision system pretending to be architecture.
  const x0 = wide ? 5 : 8;
  const width = wide ? 85 : 70;
  const wall = wide ? 0x214e78 : 0x777d83;
  panel(THREE, root, x0 + width / 2, 9.0, width, 10.8, wall, -1.22);
  panel(THREE, root, x0 + width / 2, 14.25, width, 0.42, 0x9aaab8, -1.02);

  const bays = wide ? [18, 40, 62] : [24, 47];
  for (const x of bays) {
    panel(THREE, root, x, 7.0, 12.0, 5.8, 0x30363d, -0.96);
    stripe(THREE, root, x, 10.05, 10.8, -0.76);
    warmWindow(THREE, root, x - 2.0, 6.0, 1.6, 0.7, -0.69);
    warmWindow(THREE, root, x + 2.0, 6.0, 1.6, 0.7, -0.69);
  }

  // Raised office + yellow service ladder from the supplied loading-dock art.
  const ox = x0 + width - 8;
  panel(THREE, root, ox, 10.8, 13.0, 8.7, wide ? 0x365b77 : 0x828487, -0.90);
  warmWindow(THREE, root, ox - 2.5, 12.3, 4.3, 2.2, -0.67);
  panel(THREE, root, ox + 3.0, 12.0, 2.8, 4.0, 0x214e78, -0.66);
  panel(THREE, root, ox, 8.0, 13.0, 0.28, 0xe3a51b, -0.63);
  for (let y = 4.8; y < 9.2; y += 0.76) panel(THREE, root, ox + 5.4, y, 2.0, 0.16, 0xe3a51b, -0.61);
  panel(THREE, root, ox + 4.45, 7.0, 0.16, 5.5, 0xe3a51b, -0.61);
  panel(THREE, root, ox + 6.35, 7.0, 0.16, 5.5, 0xe3a51b, -0.61);
}

function gantry(THREE, root) {
  // 4-3 source = blue/orange crafted gantry. Keep it huge and simple so the
  // final level has one unmistakable silhouette instead of extra prop noise.
  const blue = 0x245985, timber = 0x8a6242, steel = 0x7a838a;
  for (const x of [56, 90]) {
    panel(THREE, root, x, 9.2, 1.45, 13.0, timber, -0.55);
    panel(THREE, root, x, 8.8, 0.92, 10.8, blue, -0.51);
  }
  panel(THREE, root, 73, 14.8, 35.0, 1.25, blue, -0.52);
  panel(THREE, root, 73, 14.75, 31.5, 0.36, steel, -0.48);
  stripe(THREE, root, 73, 14.50, 22.0, -0.44);

  // orange trolley, twin dark chains and hook block
  panel(THREE, root, 77, 13.5, 5.2, 1.9, 0xe97822, -0.40);
  for (const x of [76.2, 77.8]) panel(THREE, root, x, 10.7, 0.20, 4.7, 0x282522, -0.36);
  panel(THREE, root, 77, 8.1, 3.2, 2.7, 0x3b3c3d, -0.34);
  stripe(THREE, root, 77, 8.55, 2.8, -0.30);
}

function eveningSite(THREE, scene, site) {
  const root = new THREE.Group();
  root.name = `world4-library-dressing-${site + 1}`;
  scene.add(root);
  nightBase(THREE, root);

  if (site === 9) {                         // 4-1 THE NIGHT SHIFT / loading dock
    loadingDock(THREE, root, false);
    cutout(THREE, root, 'barriers', 10, 4.2, 2.2, -0.58, 0.98);
    cutout(THREE, root, 'reel', 61, 4.5, 2.5, -0.57, 0.96);
    cutout(THREE, root, 'worklamp', 82, 5.6, 3.8, -0.56, 1);
  } else if (site === 10) {                 // 4-2 THE LIT SCAFFOLD / warehouse
    loadingDock(THREE, root, true);
    cutout(THREE, root, 'worklamp', 11, 5.8, 4.0, -0.56, 1);
    cutout(THREE, root, 'worklamp', 51, 5.9, 4.1, -0.56, 1);
    cutout(THREE, root, 'barriers', 88, 4.2, 2.1, -0.57, 0.96);
  } else {                                  // 4-3 LAST LIGHTS / gantry finale
    loadingDock(THREE, root, true);
    // Quiet the warehouse so the gantry owns the screen.
    panel(THREE, root, 48, 9.0, 96, 13.0, 0x0f1f30, -0.72, 0.40);
    gantry(THREE, root);
    cutout(THREE, root, 'worklamp', 47, 5.7, 4.0, -0.25, 1);
    cutout(THREE, root, 'barriers', 93, 4.3, 2.1, -0.24, 0.96);
  }
  return root;
}

function tick() {
  const e = window.__eeri;
  if (!e?.THREE || !e?.scene || typeof e.site !== 'function') {
    requestAnimationFrame(tick);
    return;
  }

  const site = e.site();
  if (site !== mountedSite) {
    disposeGroup(e.scene, mounted);
    mounted = null;
    mountedSite = site;

    if (site >= 6 && site <= 8) mounted = forestSite(e.THREE, e.scene, site);
    else if (site >= 9 && site <= 11) mounted = eveningSite(e.THREE, e.scene, site);
  }
  requestAnimationFrame(tick);
}

if (typeof window !== 'undefined') requestAnimationFrame(tick);
