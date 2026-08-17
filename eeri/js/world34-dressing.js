// EERI — World 3/4 ART PASS 2 for the greybox playtest campaign.
//
// This is deliberately a VISUAL-ONLY sidecar. It owns no collision, pickups,
// hazards, machine state or route logic. The goal is to make the six greyboxes
// read as authored places before we start moving geometry around because of art.
//
// WORLD 3 uses the approved Library vocabulary already in the repo plus the
// live f_root cutout: hollow trunks, stump/felled timber, exposed roots and
// simple timber work structures. Each room now frames its actual gameplay beat:
//   3-1 cut bank / springy root floor
//   3-2 timber lift / hoist work
//   3-3 root-clearing world peak
//
// WORLD 4 follows the owner-supplied loading-dock, warehouse and gantry source
// pieces. Until the exact large source PNGs are alpha-prepped in the art lane,
// this sidecar builds the same big silhouettes from clean planes and uses the
// already-approved worklamp / barrier / cable-reel cutouts as accents.

const ASSET = {
  forestTunnel: new URL('../assets/2d/world3_log_tunnel_lib_v1.webp', import.meta.url).href,
  forestClearing: new URL('../assets/2d/world3_stump_clearing_lib_v1.webp', import.meta.url).href,
  root: new URL('../assets/2d/f_root_v1.png', import.meta.url).href,
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

function cutout(THREE, root, key, x, y, h, z = -0.85, opacity = 1, flip = false) {
  texture(THREE, key, (tex) => {
    if (!root.parent) return; // level changed while the image loaded
    const iw = tex.image?.naturalWidth || tex.image?.width || 1;
    const ih = tex.image?.naturalHeight || tex.image?.height || 1;
    const w = h * iw / ih;
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, depthWrite: false, opacity,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    if (flip) mesh.scale.x = -1;
    root.add(mesh);
  });
}

function panel(THREE, root, x, y, w, h, color, z = -1.1, opacity = 1) {
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  root.add(mesh);
  return mesh;
}

function disc(THREE, root, x, y, r, color, z = -1.0, opacity = 1) {
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 18), mat);
  mesh.position.set(x, y, z);
  root.add(mesh);
  return mesh;
}

function stripe(THREE, root, x, y, w, z = -0.72) {
  const n = Math.max(4, Math.round(w / 1.05));
  const cw = w / n;
  for (let i = 0; i < n; i++) {
    panel(THREE, root, x - w / 2 + cw * (i + 0.5), y, cw * 0.92, 0.34,
      i % 2 ? 0xf2a51c : 0x26221c, z);
  }
}

function warmWindow(THREE, root, x, y, w, h, z = -0.70, glow = false) {
  if (glow) disc(THREE, root, x, y, Math.max(w, h) * 1.25, 0xffbd48, z - 0.08, 0.07);
  panel(THREE, root, x, y, w + 0.35, h + 0.35, 0x243140, z - 0.03);
  panel(THREE, root, x, y, w, h, 0xffbd48, z);
}

// -------------------------------------------------------------------------
// WORLD 3 — FOREST CLEARING / ROOT WORK
// -------------------------------------------------------------------------

function world3Backdrop(THREE, root) {
  // Layered felt-card forest bands. Low contrast so platforms and Eeri stay
  // readable; the more detailed Library cutouts sit nearer the playfield.
  panel(THREE, root, 48, 10.5, 124, 22, 0x355b47, -1.70);
  panel(THREE, root, 48, 7.2, 124, 12, 0x416d4d, -1.64);
  panel(THREE, root, 48, 4.0, 124, 2.5, 0x6b5438, -1.58);

  // Treeline rhythm rather than a flat green card — but SMALL, and this is
  // the whole of why World 3 read as green blobs. These sit at z −1.55,
  // barely behind the plane the game is played on, so a disc of r 6 is not
  // "a tree in the distance": it spans the playfield from below Eeri's feet
  // to above the frame, in one flat colour. Depth magnifies, and the fix is
  // the same one the fore lane needed — smaller, more of them, higher up,
  // so the eye reads a canopy line instead of seven circles.
  const line = [[2, 12.4, 2.6], [9, 13.2, 3.0], [16, 12.0, 2.4], [24, 13.4, 2.9],
                [32, 12.2, 2.5], [40, 13.6, 3.1], [48, 12.6, 2.7], [56, 13.2, 2.9],
                [64, 12.1, 2.4], [72, 13.5, 3.0], [80, 12.4, 2.6], [88, 13.3, 2.8],
                [96, 12.2, 2.5], [104, 13.0, 2.7]];
  for (const [x, y, r] of line) disc(THREE, root, x, y, r, 0x274c3c, -1.55, 0.96);
}

function timberFrame(THREE, root, x, base, h, w = 5.2, z = -0.82) {
  const dark = 0x6e4c32, light = 0xa87c52;
  panel(THREE, root, x - w / 2, base + h / 2, 0.42, h, dark, z);
  panel(THREE, root, x + w / 2, base + h / 2, 0.42, h, dark, z);
  panel(THREE, root, x, base + h, w + 0.6, 0.46, light, z + 0.01);
  const brace = panel(THREE, root, x, base + h / 2, 0.30, Math.hypot(w, h), light, z + 0.02);
  brace.rotation.z = -Math.atan2(w, h);
}

function logBeam(THREE, root, x, y, w, z = -0.70) {
  panel(THREE, root, x, y, w, 0.62, 0x7a5136, z);
  panel(THREE, root, x, y + 0.16, w * 0.94, 0.18, 0xa87950, z + 0.01);
  // rope wraps make it read as intentionally placed timber, not another ledge.
  for (const dx of [-w * 0.36, w * 0.36]) panel(THREE, root, x + dx, y, 0.18, 0.82, 0xc59a66, z + 0.02);
}

function rootPocket(THREE, root, x, y, flip = false, scale = 1) {
  cutout(THREE, root, 'root', x, y, 2.7 * scale, -0.74, 0.92, flip);
  disc(THREE, root, x + (flip ? -1 : 1) * 0.8 * scale, y + 0.9 * scale,
    0.65 * scale, 0x355b47, -0.79, 0.95);
}

function forestSite(THREE, scene, site) {
  const root = new THREE.Group();
  root.name = `world3-artpass2-${site + 1}`;
  scene.add(root);
  world3Backdrop(THREE, root);

  if (site === 6) { // 3-1 THE CUT BANK — springy/root floor
    // Big early hollow establishes the forest immediately, then the level opens
    // into a cut clearing around the machine. Root pockets visually underline
    // the two tarp beats without sitting on top of their collision.
    cutout(THREE, root, 'forestTunnel', 17, 6.6, 8.2, -0.97, 0.96);
    rootPocket(THREE, root, 31, 5.2, false, 1.05);
    rootPocket(THREE, root, 61, 5.0, true, 0.95);
    cutout(THREE, root, 'forestClearing', 75, 5.9, 7.5, -0.90, 0.98);
    logBeam(THREE, root, 37, 8.1, 7.0, -0.88);
  } else if (site === 7) { // 3-2 THE TIMBER LIFT — hoists own the composition
    cutout(THREE, root, 'forestClearing', 8, 5.7, 6.3, -0.94, 0.94);
    // Timber work frames sit BEHIND both real hoists so the moving platforms
    // read like purposeful forestry machinery rather than generic elevators.
    timberFrame(THREE, root, 15, 4.1, 6.0, 5.2, -0.84);
    timberFrame(THREE, root, 31, 4.1, 7.3, 5.4, -0.84);
    logBeam(THREE, root, 35, 10.1, 8.0, -0.80);
    rootPocket(THREE, root, 51, 4.8, true, 0.85);
    cutout(THREE, root, 'forestTunnel', 61, 6.5, 8.2, -0.96, 0.91, true);
    // Final chasm gets a felled-log visual promise before the machine solves it.
    logBeam(THREE, root, 75.5, 3.4, 9.4, -0.89);
    timberFrame(THREE, root, 87, 4.0, 6.0, 4.8, -0.88);
  } else { // 3-3 ROOT WORKS — denser clearing / world peak
    cutout(THREE, root, 'forestTunnel', 12, 6.5, 8.4, -0.98, 0.94);
    rootPocket(THREE, root, 27, 5.0, false, 1.15);
    timberFrame(THREE, root, 31, 4.1, 7.4, 5.6, -0.85);
    cutout(THREE, root, 'forestClearing', 49, 5.8, 7.5, -0.92, 0.95);
    rootPocket(THREE, root, 61, 4.9, true, 1.10);
    // The machine/wall end now sits in an obvious ROOT-CLEARING zone so the
    // familiar crane mechanic no longer reads as a random return to World 1.
    for (const x of [72, 77, 83]) rootPocket(THREE, root, x, 5.0, x % 2 === 0, 1.0);
    cutout(THREE, root, 'forestClearing', 89, 5.4, 6.1, -0.93, 0.88, true);
  }
  return root;
}

// -------------------------------------------------------------------------
// WORLD 4 — NIGHT WAREHOUSE / LOADING DOCK
// -------------------------------------------------------------------------

function nightBase(THREE, root) {
  panel(THREE, root, 48, 10.0, 124, 22, 0x14263c, -1.72);
  panel(THREE, root, 48, 4.1, 124, 3.0, 0x101b28, -1.62);
  // Soft-looking but flat pools: scenery circles, not gameplay lights.
  for (const x of [18, 48, 78]) disc(THREE, root, x, 7.0, 6.0, 0xffbd48, -1.48, 0.055);
}

function loadingDock(THREE, root, { x0 = 7, width = 78, blue = false, bays = 2 } = {}) {
  const wall = blue ? 0x214e78 : 0x777d83;
  const trim = blue ? 0x173b5c : 0x666d73;
  panel(THREE, root, x0 + width / 2, 9.0, width, 10.8, wall, -1.22);
  panel(THREE, root, x0 + width / 2, 14.25, width, 0.42, 0x9aaab8, -1.02);
  panel(THREE, root, x0 + width / 2, 4.1, width, 0.8, trim, -0.92);

  const bayXs = bays === 3 ? [x0 + 15, x0 + 37, x0 + 59] : [x0 + 18, x0 + 43];
  for (const x of bayXs) {
    panel(THREE, root, x, 7.0, 12.0, 5.8, 0x30363d, -0.96);
    stripe(THREE, root, x, 10.05, 10.8, -0.76);
    warmWindow(THREE, root, x - 2.0, 6.0, 1.6, 0.7, -0.69);
    warmWindow(THREE, root, x + 2.0, 6.0, 1.6, 0.7, -0.69);
  }

  // Raised office + yellow service ladder: the most useful readable feature
  // from the owner-supplied grey loading-dock sheet.
  const ox = x0 + width - 7;
  panel(THREE, root, ox, 10.8, 13.0, 8.7, blue ? 0x365b77 : 0x85888a, -0.90);
  warmWindow(THREE, root, ox - 2.5, 12.3, 4.3, 2.2, -0.67, true);
  panel(THREE, root, ox + 3.0, 12.0, 2.8, 4.0, 0x214e78, -0.66);
  panel(THREE, root, ox, 8.0, 13.0, 0.28, 0xe3a51b, -0.63);
  for (let y = 4.8; y < 9.3; y += 0.76) panel(THREE, root, ox + 5.4, y, 2.0, 0.16, 0xe3a51b, -0.61);
  panel(THREE, root, ox + 4.45, 7.0, 0.16, 5.5, 0xe3a51b, -0.61);
  panel(THREE, root, ox + 6.35, 7.0, 0.16, 5.5, 0xe3a51b, -0.61);
}

function dockSlab(THREE, root, x, y, w, z = -0.60) {
  panel(THREE, root, x, y, w, 0.72, 0x686d72, z);
  panel(THREE, root, x, y + 0.32, w, 0.14, 0x9aaab8, z + 0.01);
  stripe(THREE, root, x, y - 0.25, Math.min(w * 0.8, 8.5), z + 0.02);
}

function crateStack(THREE, root, x, y, n = 3, z = -0.54) {
  for (let i = 0; i < n; i++) {
    const dx = (i % 2) * 1.15;
    const dy = Math.floor(i / 2) * 0.92;
    panel(THREE, root, x + dx, y + dy, 1.0, 0.82, 0x9d7048, z);
    panel(THREE, root, x + dx, y + dy, 0.78, 0.06, 0xc49a66, z + 0.01);
  }
}

function serviceDeck(THREE, root, x, y, w, z = -0.52) {
  panel(THREE, root, x, y, w, 0.32, 0x7a8a9a, z);
  for (const px of [x - w / 2, x + w / 2]) panel(THREE, root, px, y + 1.45, 0.16, 3.0, 0xe3a51b, z + 0.01);
  panel(THREE, root, x, y + 2.85, w, 0.16, 0xe3a51b, z + 0.01);
}

function gantry(THREE, root) {
  // Owner source: timber-card uprights, blue bolted braces, blue beam,
  // orange trolley, twin chain drop and black/yellow hook block.
  const blue = 0x245985, timber = 0x8a6242, steel = 0x7a838a;
  for (const x of [55, 91]) {
    panel(THREE, root, x, 9.2, 1.55, 13.2, timber, -0.55);
    panel(THREE, root, x, 8.8, 0.96, 10.9, blue, -0.51);
    const brace = panel(THREE, root, x + (x < 70 ? 2.2 : -2.2), 10.1, 0.48, 6.2, blue, -0.49);
    brace.rotation.z = x < 70 ? -0.55 : 0.55;
  }
  panel(THREE, root, 73, 14.8, 37.0, 1.35, blue, -0.52);
  panel(THREE, root, 73, 14.72, 33.5, 0.38, steel, -0.48);
  stripe(THREE, root, 73, 14.45, 23.0, -0.44);
  panel(THREE, root, 77, 13.4, 5.4, 1.9, 0xe97822, -0.40);
  for (const x of [76.1, 77.9]) panel(THREE, root, x, 10.6, 0.21, 4.9, 0x282522, -0.36);
  panel(THREE, root, 77, 8.0, 3.3, 2.8, 0x3b3c3d, -0.34);
  stripe(THREE, root, 77, 8.45, 2.9, -0.30);
  warmWindow(THREE, root, 59.5, 13.1, 1.1, 0.9, -0.31, true);
}

function eveningSite(THREE, scene, site) {
  const root = new THREE.Group();
  root.name = `world4-artpass2-${site + 1}`;
  scene.add(root);
  nightBase(THREE, root);

  if (site === 9) { // 4-1 THE NIGHT SHIFT — loading dock + belt rhythm
    loadingDock(THREE, root, { x0: 6, width: 76, blue: false, bays: 2 });
    // Each conveyor section now sits visually in a loading lane instead of on
    // anonymous floor. These slabs are BEHIND the actual belt collision.
    for (const x of [17, 31, 51]) dockSlab(THREE, root, x, 3.8, 8.0, -0.58);
    cutout(THREE, root, 'barriers', 8, 4.3, 2.2, -0.53, 0.98);
    cutout(THREE, root, 'reel', 63, 4.6, 2.6, -0.52, 0.98);
    cutout(THREE, root, 'worklamp', 84, 5.8, 4.0, -0.50, 1);
    crateStack(THREE, root, 88, 4.4, 4, -0.56);
  } else if (site === 10) { // 4-2 THE LIT SCAFFOLD — warehouse/service decks
    loadingDock(THREE, root, { x0: 3, width: 88, blue: true, bays: 3 });
    // Make the room's vertical gameplay belong to the architecture: the two
    // hoists visually service decks instead of floating in front of a wall.
    serviceDeck(THREE, root, 18, 7.7, 8.5, -0.51);
    serviceDeck(THREE, root, 34, 10.2, 9.0, -0.51);
    dockSlab(THREE, root, 51, 4.0, 11.0, -0.57);
    cutout(THREE, root, 'worklamp', 10, 5.9, 4.1, -0.48, 1);
    cutout(THREE, root, 'worklamp', 52, 6.0, 4.2, -0.48, 1);
    cutout(THREE, root, 'barriers', 89, 4.3, 2.1, -0.49, 0.96);
    crateStack(THREE, root, 79, 4.4, 5, -0.56);
  } else { // 4-3 LAST LIGHTS — gantry owns the finale
    loadingDock(THREE, root, { x0: 2, width: 90, blue: true, bays: 3 });
    // Quiet the warehouse and leave a darker visual runway to the machine.
    panel(THREE, root, 48, 9.0, 98, 13.0, 0x0f1f30, -0.72, 0.46);
    dockSlab(THREE, root, 18, 3.9, 13.0, -0.58);
    dockSlab(THREE, root, 36, 3.9, 11.0, -0.58);
    gantry(THREE, root);
    cutout(THREE, root, 'worklamp', 45, 5.8, 4.1, -0.24, 1);
    cutout(THREE, root, 'barriers', 94, 4.4, 2.1, -0.23, 0.96);
    crateStack(THREE, root, 50, 4.3, 3, -0.25);
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
