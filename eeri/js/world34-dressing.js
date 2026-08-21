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

// ---- DRESSING AS DATA ---------------------------------------------------
// Every prop in worlds 3 and 4 used to exist only as a line of code that ran
// once. That is why nothing could be "placed": there was no object anywhere
// to select, and a nudge meant editing a number in a function body and
// reloading. The composites below (`timberFrame`, `crateStack`, `gantry`, …)
// all bottom out in exactly THREE leaves — `panel`, `disc`, `cutout` — so
// recording those three captures the whole scene with nothing left over.
// (`light` is a fourth row kind but not a fourth leaf: no builder emits one,
// because there were never any lights to record. It is authored in the
// inspector and only ever arrives from a sheet.)
//
// The capture is not a re-authoring and cannot drift from what ships: the
// leaves push a row on the way past, so the recording IS the build. Rows are
// replayed through the same three functions, which is what makes the data
// path and the code path identical by construction rather than by review.
//
// Same seam as every other asset here — `getModel(name, buildPlaceholder)`,
// data if present and code if not. A site with no JSON still builds from its
// builder, so this migration cannot take a level away.
let REC = null;
let rowId = 0;
const rec = (row) => { if (REC) REC.push({ id: `d${++rowId}`, ...row }); };
// While replaying, the id of the row currently being drawn. Stamped onto the
// mesh so the inspector can go from "the thing I clicked" back to "the line
// that made it" — without which a drag can be seen but never saved. It has to
// be a stamp rather than an index because `cutout` finishes ASYNCHRONOUSLY:
// meshes arrive in texture-load order, not row order.
let TAG = null;
const tagged = (mesh) => { if (TAG) mesh.userData.row = TAG; return mesh; };
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

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
  rec({ k: 'cutout', a: key, x, y, h, z, o: opacity, f: flip });
  const id = TAG;                      // captured NOW — TAG has moved on by
  texture(THREE, key, (tex) => {       // the time this callback runs
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
    if (id) mesh.userData.row = id;
    root.add(mesh);
  });
}


// ---- LIGHTS ------------------------------------------------------------
// Owner's two constraints pull against each other: "light sources can correct
// a lot" and "if assets move, the lights break". The seam that resolves them
// was already here and cost nothing to find:
//
//   every dressing primitive above is MeshBasicMaterial, which ignores lights
//   entirely, and everything you PLAY on — level tiles, craft props, the kid,
//   the enemies, the machines — is MeshLambertMaterial, which does not.
//
// So a light placed in a sheet lights the actors and the terrain and CANNOT
// touch the painted backdrop. That is the right split and it is free: the
// half of the picture that would look wrong if a light moved is immune by
// construction. Nothing is baked, so nothing can go stale — move the lamp,
// move its row, and the light is simply somewhere else next frame.
//
// The budget is small on purpose. A PointLight with a distance is per-fragment
// work on every Lambert surface in range, and the level is a lot of boxes.
const MAX_LIGHTS = 6;

function light(THREE, root, x, y, z, color, intensity, distance) {
  rec({ k: 'light', x, y, z, c: hex(color), i: intensity, d: distance });
  const id = TAG;
  const L = new THREE.PointLight(color, intensity, distance);
  L.position.set(x, y, z);
  if (id) L.userData.row = id;
  root.add(L);

  // A HANDLE, because a light has no geometry and the inspector selects by
  // raycast — there is nothing to click. It is a sibling rather than the
  // light's parent, and that is not a style choice: WebGLRenderer.projectObject
  // skips an invisible subtree wholesale, and it is also where lights are
  // gathered, so parenting the light to a hidden handle switches the light off.
  // The inspector mirrors the handle's position onto `pairedLight`.
  const h = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshBasicMaterial({ color, wireframe: true }),
  );
  h.position.set(x, y, z);
  h.visible = false;                    // the shipped game never shows these
  h.userData.lightHandle = true;
  h.userData.pairedLight = L;
  if (id) h.userData.row = id;
  root.add(h);
  return L;
}

// ---- MODELS ------------------------------------------------------------
// The shelf, made reachable. Thirteen props shipped, catalogued and correct —
// forklift, generator, floodlight, cable drum, wheelbarrow, dump truck… — and
// `audit-assets.mjs` reported every one of them UNREACHABLE, because nothing
// under `js/` named them in a `getModel()` call. Correct files answering a
// question nobody asked.
//
// A `model` row is what asks. It goes through the same seam everything else
// does, so a prop whose file 404s or is still `placeholder` draws nothing
// rather than a white slab: art is the one thing in this game allowed to be
// absent.
//
// THE IMPORT IS DYNAMIC AND CARRIES THE SAME TOKEN AS MAIN.JS'S. This module
// has no static imports on purpose — it is a browser-only sidecar and the room
// gate loads its data in plain Node, where `three` and `window` must never
// become dependencies. A dynamic `import()` of the same URL resolves to the
// same live module instance main.js is using; a different token would build a
// SECOND assets.js with its own null manifest, which is the failure that
// silently unplugged 2.7 MB of layer art twice.
let assetsMod = null;
const assets = () => (assetsMod ||= import('./assets.js?v=47'));

function model(THREE, root, name, x, y, z, height, flip) {
  rec({ k: 'model', a: name, x, y, z, h: height, f: !!flip });
  const id = TAG;
  assets().then(({ getModel }) => getModel(name, () => null)).then((asset) => {
    if (!asset?.root || !root.parent) return;   // level changed while it loaded
    const g = new THREE.Group();
    g.add(asset.root);
    // `height` is in TILES, and the seam has already rescaled the model to the
    // manifest's own figure — so this is the EDITOR's size on top of that: the
    // size slider's value, not a second opinion about how big a forklift is.
    if (height) {
      const b = new THREE.Box3().setFromObject(g);
      const h = b.max.y - b.min.y;
      if (h > 0.001) g.scale.multiplyScalar(height / h);
    }
    g.position.set(x, y, z);
    if (flip) g.scale.x *= -1;
    if (id) { g.userData.row = id; g.traverse((o) => { o.userData.row = id; }); }
    root.add(g);
  }).catch(() => {});
}

function panel(THREE, root, x, y, w, h, color, z = -1.1, opacity = 1) {
  rec({ k: 'panel', x, y, w, h, c: hex(color), z, o: opacity });
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z);
  root.add(tagged(mesh));
  return mesh;
}

function disc(THREE, root, x, y, r, color, z = -1.0, opacity = 1) {
  rec({ k: 'disc', x, y, r, c: hex(color), z, o: opacity });
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 18), mat);
  mesh.position.set(x, y, z);
  root.add(tagged(mesh));
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
  // THE CANOPY IS NOT A ROW OF CIRCLES.
  //
  // It was fourteen flat discs of one green in one line, and at this depth
  // each spans about a fifth of the screen — so what the eye read was
  // circles, not trees. Making them smaller was the previous attempt and it
  // does not help: what gives a disc away is that its EDGE is a perfect arc
  // all the way round in a single value.
  //
  // Two changes, both about breaking the arc:
  //
  //   * a tree is a CLUSTER, not a ball — three or four overlapping lobes of
  //     different radii, off-centre from each other, so the silhouette has
  //     notches in it. Overlap is what turns circles into foliage.
  //   * a tree has TWO values — a darker mass behind and a lighter crown up
  //     and to the left, which is §3.1's "key from upper-left" applied to a
  //     shape that had no shading in it at all.
  //
  // And a trunk under every second one: a canopy floating with nothing
  // holding it up is the other half of why these read as decals. The trunks
  // are thin, dark and short, because they only have to be GLIMPSED between
  // the near lane's cutouts to do their job.
  const DARK = 0x22422f, LIT = 0x2f5941;
  const tree = (x, y, r, flip) => {
    disc(THREE, root, x, y, r, DARK, -1.56, 0.97);
    disc(THREE, root, x + r * (flip ? 0.52 : -0.52), y - r * 0.34, r * 0.78, DARK, -1.56, 0.97);
    disc(THREE, root, x + r * (flip ? -0.44 : 0.44), y - r * 0.46, r * 0.66, DARK, -1.56, 0.97);
    disc(THREE, root, x - r * 0.3, y + r * 0.42, r * 0.62, LIT, -1.545, 0.97);
    disc(THREE, root, x + r * 0.16, y + r * 0.58, r * 0.4, LIT, -1.545, 0.97);
  };
  const line = [[2, 12.4, 2.6], [9, 13.2, 3.0], [16, 12.0, 2.4], [24, 13.4, 2.9],
                [32, 12.2, 2.5], [40, 13.6, 3.1], [48, 12.6, 2.7], [56, 13.2, 2.9],
                [64, 12.1, 2.4], [72, 13.5, 3.0], [80, 12.4, 2.6], [88, 13.3, 2.8],
                [96, 12.2, 2.5], [104, 13.0, 2.7]];
  line.forEach(([x, y, r], i) => {
    if (i % 2 === 0) panel(THREE, root, x + 0.2, y - r - 1.5, 0.5, 3.4, 0x2d2016, -1.58);
    tree(x, y, r, i % 2 === 1);
  });
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

// ---- the replayer, and the capture the tool drives ----------------------
// `replay` is the only thing the runtime needs once a site has JSON. It takes
// the same three leaves the builders take, so a row cannot describe anything
// the code could not already draw — which is the point: the format is not a
// new vocabulary, it is the existing one written down.
function replay(THREE, scene, site, rows) {
  const root = new THREE.Group();
  root.name = `world34-dressing-${site + 1}`;
  scene.add(root);
  let lit = 0, dropped = 0;
  for (const r of rows) {
    TAG = r.id;
    if (r.k === 'panel') panel(THREE, root, r.x, r.y, r.w, r.h, +('0x' + r.c.slice(1)), r.z, r.o);
    else if (r.k === 'disc') disc(THREE, root, r.x, r.y, r.r, +('0x' + r.c.slice(1)), r.z, r.o);
    else if (r.k === 'cutout') cutout(THREE, root, r.a, r.x, r.y, r.h, r.z, r.o, r.f);
    else if (r.k === 'model') model(THREE, root, r.a, r.x, r.y, r.z, r.h, r.f);
    else if (r.k === 'light') {
      // NO SILENT CAPS. A budget that quietly drops the seventh lamp reads as
      // "that light does not work" and gets debugged for an hour.
      if (lit < MAX_LIGHTS) { light(THREE, root, r.x, r.y, r.z, +('0x' + r.c.slice(1)), r.i, r.d); lit++; }
      else dropped++;
    }
  }
  if (dropped) {
    console.warn(`[eeri] site ${site + 1}: ${dropped} light row(s) past the ` +
      `budget of ${MAX_LIGHTS} were not placed`);
  }
  TAG = null;
  // the rows travel WITH the group, so the inspector can select a mesh and
  // find the row that made it without a second index to keep in step
  root.userData.rows = rows;
  return root;
}

// Drive from `art-src/tools/capture-dressing.mjs`. Builds into a throwaway
// group purely to make the builder run; what comes back is the recording.
// The two build paths, exported side by side ON PURPOSE so a test can run
// both in ONE page and compare the meshes. That is the only honest proof that
// the sheet and the builder agree — two page loads settle the camera and the
// idle animation differently, and comparing screenshots of them reported a
// 93% pixel difference on a scene that was in fact identical.
export const __replay = replay;
export function __build(THREE, scene, site) {
  return site <= 8 ? forestSite(THREE, scene, site) : eveningSite(THREE, scene, site);
}

export function captureSite(THREE, site) {
  const spare = new THREE.Group();
  spare.userData.captureOnly = true;
  const scene = new THREE.Scene();
  scene.add(spare);
  REC = []; rowId = 0;
  try {
    if (site >= 6 && site <= 8) forestSite(THREE, scene, site);
    else if (site >= 9 && site <= 11) eveningSite(THREE, scene, site);
    return REC;
  } finally { REC = null; }
}

// A site's rows, or null for "nothing authored, use the builder". Fetched
// once and remembered — a level change must not cost a round trip.
const sheets = new Map();
// WHICH SITES HAVE A SHEET, asked before anything is fetched. Every site looks
// for dressing now, and a site without a sheet used to answer that question
// with a 404 — which is a console error, which `smoke.cjs` fails the boot on,
// correctly. The manifest already declares every other asset before it is
// loaded; a sheet is no different. Adding one means adding its number there.
let manifestSites = null;
async function sheetSites() {
  if (manifestSites) return manifestSites;
  try {
    const url = new URL('../assets/manifest.json?v=34', import.meta.url);
    const res = await fetch(url);
    const j = res.ok ? await res.json() : null;
    manifestSites = new Set((j?.dressing?.sites || []).map((n) => n - 1));
  } catch { manifestSites = new Set(); }
  return manifestSites;
}

async function rowsFor(site) {
  if (sheets.has(site)) return sheets.get(site);
  if (!(await sheetSites()).has(site)) { sheets.set(site, null); return null; }
  let rows = null;
  try {
    const url = new URL(`../assets/dressing/site-${site + 1}.json?v=47`, import.meta.url);
    const res = await fetch(url);
    if (res.ok) {
      const j = await res.json();
      if (Array.isArray(j?.rows) && j.rows.length) rows = j.rows;
    }
  } catch { /* no sheet is not an error — it is the seam working */ }
  sheets.set(site, rows);
  return rows;
}

// Live-editing hook for the inspector: hand back replaced rows and rebuild
// this site from them without a reload.
export function applyRows(site, rows) {
  sheets.set(site, rows);
  if (site === mountedSite) mountedSite = -1;
}
export function currentRows() {
  return mounted?.userData?.rows || null;
}

// THE EDITOR'S HANDLE, and it goes on the window rather than through
// `__eeri`. This module is a browser-only sidecar that main.js does not
// import — world34-register.js pulls it in dynamically — so there is no path
// for main.js to re-export it, and the inspector runs in the dev frame's
// realm where a fresh `import()` would build a SECOND copy of this module with
// its own `sheets` map and its own `mounted`. One live instance, published
// once, is the only version of this that can work.
if (typeof window !== 'undefined') {
  window.__eeriDress = { applyRows, currentRows };
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

    // EVERY SITE, not just worlds 3 and 4. This used to be gated on
    // `site >= 6 && site <= 11` because those were the only rooms with a
    // dressing sidecar to run. Now that a sheet is data, that gate is what
    // stopped the editor from being able to dress the rooms the player sees
    // FIRST: worlds 1 and 2 have no sidecar to capture, so the only way they
    // ever get one is by someone placing rows into an empty sheet.
    //
    // Worlds 1 and 2 therefore start with no sheet and no builder, mount
    // nothing, and cost one 404 on entry — which `rowsFor` already treats as
    // "nothing authored" rather than as an error. The moment a sheet is saved
    // for one of them it mounts like any other.
    {
      const want = site;
      // DATA IF PRESENT, CODE IF NOT. The await is why the site is re-checked
      // on the way back: a level change during the fetch would otherwise mount
      // the room you just left on top of the one you are now standing in.
      rowsFor(site).then((rows) => {
        if (mountedSite !== want || mounted) return;
        if (rows) mounted = replay(e.THREE, e.scene, want, rows);
        else if (want >= 6 && want <= 8) mounted = forestSite(e.THREE, e.scene, want);
        else if (want >= 9 && want <= 11) mounted = eveningSite(e.THREE, e.scene, want);
      });
    }
  }
  requestAnimationFrame(tick);
}

if (typeof window !== 'undefined') requestAnimationFrame(tick);
