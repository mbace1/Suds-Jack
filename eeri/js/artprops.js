// EERI — ART PROPS: every keyed cutout in the game, placeable on any lane.
//
// Owner direction, 2026-09-05: *"I wanted a level editor with all layers of
// art available. snap to place placement etc"* — and the honest answer to
// why the editor did not have that is here rather than in the editor. The
// editor could only offer what the GAME could place from data, and the only
// art that had ever been data was `js/scenery.js`'s builder props: World 1
// and World 2's dressing vocabulary, and lamps. Every painted cutout —
// World 3's trees, the log tunnel, the stump clearing, World 4's worklamp
// and cable reel — was a hard-coded call inside `world34-dressing.js`, at a
// hard-coded x. A tool cannot offer you a thing the game can only build by
// running one specific line of one specific function.
//
// So this module is the missing half: ONE builder that mounts ANY keyed
// cutout on ANY lane, driven by a row. With it, `scenery.js` can carry art
// rows the same way it already carries prop rows, `layers.js` mounts them
// for every world rather than only for 3 and 4, and the editor's rail can
// finally offer a palette per lane.
//
// TWO RULES IT KEEPS, both learned the expensive way elsewhere in this repo:
//
//  1. **THREE arrives as a parameter.** `dev/inspector.js` pulls the level
//     list into the TOP page of `dev.html`, which has no import map, so a
//     static `import ... from 'three'` anywhere reachable from `rooms.js`
//     breaks the editor with "failed to resolve module specifier three" —
//     which is exactly what v15.55 shipped for a day. Nothing here imports
//     three; the caller hands it in.
//  2. **A missing file draws NOTHING, never a white slab.** Same rule the
//     asset seam keeps (`js/assets.js`): a texture that fails to load hides
//     its mesh, because a bright rectangle where a tree should be is worse
//     than a gap.

// ---- THE CATALOGUE -------------------------------------------------------
//
// `layer` is the lane a piece belongs on by default — the editor groups the
// palette by it and a row may override it. `h` is its height in world units,
// which is what a cutout is sized by: the width follows the image's own
// aspect, so a piece is never stretched.
//
// The z each lane sits at is NOT here. `layers.js` owns `LAYER_Z` and hands
// it in, because a second copy of those numbers is a second thing to keep in
// step, and this repo has written down what that costs.
export const ART = {
  // World 3 — the felt treeline (v15.55). Generated against the house craft
  // block and keyed with the shared hue-ratio key.
  treeSpruce:   { file: '2d/world3_tree_spruce_v1.webp', label: 'spruce',        layer: 'near', h: 8.4 },
  treeOak:      { file: '2d/world3_tree_oak_v1.webp',    label: 'oak',           layer: 'near', h: 7.2 },
  treeBirch:    { file: '2d/world3_tree_birch_v1.webp',  label: 'birch',         layer: 'near', h: 7.6 },
  logTunnel:    { file: '2d/world3_log_tunnel_lib_v1.webp',    label: 'log tunnel',    layer: 'play', h: 8.2 },
  stumpClearing:{ file: '2d/world3_stump_clearing_lib_v1.webp', label: 'stump clearing', layer: 'play', h: 7.5 },

  // World 4 — the depot's own vocabulary.
  worklamp:     { file: '2d/world4_worklamp_lib_v1.webp',     label: 'work lamp',    layer: 'play', h: 3.4 },
  cableReel:    { file: '2d/world4_cable_reel_lib_v1.webp',   label: 'cable reel',   layer: 'play', h: 2.2 },
  barrierLamps: { file: '2d/world4_barrier_lamps_lib_v1.webp', label: 'lit barrier', layer: 'play', h: 1.6 },

  // The buried features. They were only ever placed by `level.js`'s own
  // seeded scatter into the earth band; as rows they can also be put
  // somewhere on purpose, which is what a cut you want the player to notice
  // needs.
  fRoot:   { file: '2d/f_root_v1.png',   label: 'root',        layer: 'play', h: 1.1 },
  fPipe:   { file: '2d/f_pipe_v1.png',   label: 'buried pipe', layer: 'play', h: 0.8 },
  fDrum:   { file: '2d/f_drum_v1.png',   label: 'buried drum', layer: 'play', h: 0.9 },
  fBrick:  { file: '2d/f_brick_v1.png',  label: 'brickwork',   layer: 'play', h: 1.0 },
  fStones: { file: '2d/f_stones_v1.png', label: 'stones',      layer: 'play', h: 0.75 },
  fStone:  { file: '2d/f_stone_v1.png',  label: 'stone',       layer: 'play', h: 0.5 },
  fBottle: { file: '2d/f_bottle_v1.png', label: 'bottle',      layer: 'play', h: 0.5 },
};

/**
 * Builders for every entry in `ART`, ready to hand to `placeScenery`.
 *
 * `zFor(layer)` maps a lane name to its depth — `layers.js` passes its own
 * `LAYER_Z` through, so the numbers stay in one place.
 */
export function buildArtBuilders(THREE, scene, zFor, baseURL) {
  const cache = new Map();
  const loader = new THREE.TextureLoader();
  const texture = (file, done) => {
    if (cache.has(file)) { done(cache.get(file)); return; }
    loader.load(new URL('../assets/' + file, baseURL).href, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      cache.set(file, t);
      done(t);
    }, undefined, () => done(null));
  };

  const builders = {};
  for (const [name, spec] of Object.entries(ART)) {
    builders[name] = (row) => {
      const g = new THREE.Group();
      g.name = `art:${name}`;
      const h = row.h ?? spec.h;
      const z = row.z ?? zFor(row.layer || spec.layer);
      // FOOT, NOT CENTRE, and this is the bug the trees shipped with on
      // 2026-09-05: `cutout()` takes a centre and was handed a base, so
      // every tree hung a metre above the ground. A row's `y` is where the
      // piece STANDS; the mount does the arithmetic.
      g.position.set(row.x, (row.y ?? 0) + h / 2, z);
      if (row.flip) g.scale.x = -1;
      scene.add(g);
      texture(spec.file, (t) => {
        if (!t || !g.parent) return;    // gone, or the level changed
        const iw = t.image?.naturalWidth || t.image?.width || 1;
        const ih = t.image?.naturalHeight || t.image?.height || 1;
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(h * iw / ih, h),
          new THREE.MeshBasicMaterial({
            map: t, transparent: true, depthWrite: false,
            opacity: row.o ?? 1, side: THREE.DoubleSide,
          }),
        );
        g.add(m);
      });
      return g;
    };
  }
  return builders;
}

/** Take down everything `buildArtBuilders` put in the scene. */
export function disposeArt(scene, made) {
  for (const g of made) {
    scene.remove(g);
    g.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) m.dispose?.();
    });
  }
}
