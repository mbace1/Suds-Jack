// EERI — TEMPORARY World 3/4 visual sidecar for the greybox playtest pass.
//
// Collision, route shape and progression live in world34-rooms.js. Nothing
// here is standable or interactive. The whole point is to get enough place
// identity on screen to judge the layouts without accidentally tuning around
// decorative geometry.
//
// SOURCE PROVENANCE
// World 3: actual crafted assets saved in the user's ChatGPT Library:
//   - hollow log / root tunnel
//   - stump + felled-log clearing
// They line up with the World-3 source catalog's forest-cutbank, log-tunnel,
// clearing-stumps and built/organic composition language.
//
// World 4: the source catalog explicitly has NO APPROVED ASSETS yet. For the
// first test only, three pieces were cropped from the user's saved crafted
// construction asset sheet: work lamp, cable reel and illuminated barriers.
// Treat those as PROVISIONAL visual vocabulary, not final art direction.
//
// This module intentionally has no static three.js import. It is loaded as a
// browser-only sidecar by world34-register.js and waits for main.js to expose
// its existing THREE/scene debug handles. That keeps the plain-Node room gate
// free of browser dependencies.

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
    // A site may have changed while its image was loading. Never add a late
    // forest prop to the next level's root after that root has been removed.
    if (!root.parent) return;
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

function dusk(THREE, root) {
  // One broad translucent sheet between the near backdrop and playfield.
  // It makes the existing temporary Groundworks backdrop read as evening
  // without tinting Eeri, enemies, pickups or collision geometry.
  const mat = new THREE.MeshBasicMaterial({
    color: 0x26334a, transparent: true, opacity: 0.36,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const veil = new THREE.Mesh(new THREE.PlaneGeometry(118, 25), mat);
  veil.position.set(48, 8.5, -1.55);
  root.add(veil);

  // Small matte pools of warm light behind the action. These are scenery,
  // not real PointLights, so gameplay materials and visibility never change.
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf6c35b, transparent: true, opacity: 0.11,
    depthWrite: false, side: THREE.DoubleSide,
  });
  for (const x of [18, 46, 75]) {
    const g = new THREE.Mesh(new THREE.CircleGeometry(6.5, 24), glowMat.clone());
    g.scale.y = 0.68;
    g.position.set(x, 7.4, -1.42);
    root.add(g);
  }
}

function forestSite(THREE, scene, site) {
  const root = new THREE.Group();
  root.name = `world3-library-dressing-${site + 1}`;
  scene.add(root);

  // These are broad connecting shapes, not individual props. Each level gets
  // two recognisable silhouettes with a large empty gameplay window between.
  if (site === 6) {                         // 3-1 THE CUT BANK
    cutout(THREE, root, 'forestTunnel', 24, 6.3, 7.6, -0.95, 0.92);
    cutout(THREE, root, 'forestClearing', 74, 5.9, 7.0, -0.90, 0.95);
  } else if (site === 7) {                  // 3-2 THE TIMBER LIFT
    cutout(THREE, root, 'forestClearing', 20, 6.0, 6.8, -0.92, 0.94);
    cutout(THREE, root, 'forestTunnel', 66, 6.7, 8.2, -0.97, 0.90);
  } else {                                  // 3-3 ROOT WORKS
    cutout(THREE, root, 'forestTunnel', 19, 6.4, 7.8, -0.96, 0.92);
    cutout(THREE, root, 'forestClearing', 57, 6.1, 7.2, -0.91, 0.94);
    cutout(THREE, root, 'forestClearing', 87, 5.4, 5.8, -0.94, 0.88);
  }
  return root;
}

function eveningSite(THREE, scene, site) {
  const root = new THREE.Group();
  root.name = `world4-library-dressing-${site + 1}`;
  scene.add(root);
  dusk(THREE, root);

  // Props stay low or high and behind z=0. They create the night-shift read,
  // while the actual obstacle/machine silhouettes remain the strongest marks.
  if (site === 9) {                         // 4-1 THE NIGHT SHIFT
    cutout(THREE, root, 'barriers', 17, 4.1, 2.2, -0.72, 0.98);
    cutout(THREE, root, 'worklamp', 39, 5.2, 3.6, -0.70, 1);
    cutout(THREE, root, 'reel', 73, 4.4, 2.5, -0.73, 0.96);
  } else if (site === 10) {                 // 4-2 THE LIT SCAFFOLD
    cutout(THREE, root, 'worklamp', 20, 5.3, 3.8, -0.70, 1);
    cutout(THREE, root, 'barriers', 48, 4.0, 2.1, -0.73, 0.96);
    cutout(THREE, root, 'worklamp', 64, 5.4, 4.0, -0.71, 1);
  } else {                                  // 4-3 LAST LIGHTS
    cutout(THREE, root, 'barriers', 14, 4.0, 2.0, -0.74, 0.94);
    cutout(THREE, root, 'worklamp', 43, 5.3, 3.8, -0.70, 1);
    cutout(THREE, root, 'reel', 59, 4.3, 2.4, -0.73, 0.96);
    cutout(THREE, root, 'worklamp', 85, 5.5, 4.1, -0.71, 1);
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
