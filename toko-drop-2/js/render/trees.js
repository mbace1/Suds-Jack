// trees.js — the trees past the driveway, as the low sun throws them across the slab (v129).
//
// The owner, 2026-11-09, on v128's leaf shade: "The tree shadows look weird". v128 drew them as noise — blobs with
// holes in them, which read as camouflage and not as a tree. A tree's shadow is a TREE: a trunk, limbs forking into
// thinner branches, and the leaves in clumps at their ends with the sun coming through between them. So each tree is
// drawn once, here, as the silhouette the sun sees (a canvas, white where it blocks the light), and the floor and the
// lawn cast it (scenery.js treeShade): a point on the ground is in a tree's shadow if the sun's ray from it, rising
// at the sun's elevation, passes through the silhouette — its height on the tree is how far it lies from the trunk
// along the shadow, × tan θ. Nothing here is loaded from a file; every number is TUNING.worlds.lit.concrete.daylight.trees.
import * as THREE from 'three/webgpu';

// a small seeded generator, so a tree is the same tree on every load
function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// One tree, in a tile `S` px square at `ox`: x across (0 … 1), y up from its foot (0 … 1)
function drawTree(g, ox, S, rnd, C) {
  const X = (u) => ox + u * S, Y = (v) => S * (1 - v);
  g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  const tips = [];
  const limb = (x, y, ang, len, w, depth) => {
    // a branch bends a little along its length (two segments), thinning as it goes
    const bend = (rnd() - 0.5) * 0.35, xm = x + Math.cos(ang) * len * 0.5, ym = y + Math.sin(ang) * len * 0.5;
    const a2 = ang + bend, x2 = xm + Math.cos(a2) * len * 0.5, y2 = ym + Math.sin(a2) * len * 0.5;
    g.lineWidth = Math.max(1, w * S); g.beginPath(); g.moveTo(X(x), Y(y)); g.lineTo(X(xm), Y(ym)); g.stroke();
    g.lineWidth = Math.max(1, w * 0.8 * S); g.beginPath(); g.moveTo(X(xm), Y(ym)); g.lineTo(X(x2), Y(y2)); g.stroke();
    if (depth <= C.leafDepth) tips.push([x2, y2, depth]);
    if (depth <= 0) return;
    const kids = 2 + (rnd() < C.third ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const a = a2 + (k - (kids - 1) / 2) * (C.fork[0] + rnd() * C.fork[1]) + (rnd() - 0.5) * 0.25;
      // the crown spreads up and out, never back down into the trunk
      const up = Math.max(0.15, Math.min(Math.PI - 0.15, a));
      limb(x2, y2, up, len * (C.shrink[0] + rnd() * C.shrink[1]), w * C.thin, depth - 1);
    }
  };
  // the trunk, leaning a little, tapering to where it forks
  const lean = (rnd() - 0.5) * C.lean, fork = C.fork0[0] + rnd() * C.fork0[1], tx = 0.5 + lean;
  g.beginPath();
  g.moveTo(X(0.5 - C.trunk), Y(0)); g.lineTo(X(tx - C.trunk * 0.55), Y(fork)); g.lineTo(X(tx + C.trunk * 0.55), Y(fork)); g.lineTo(X(0.5 + C.trunk), Y(0));
  g.closePath(); g.fill();
  const limbs = C.limbs[0] + Math.floor(rnd() * (C.limbs[1] - C.limbs[0] + 1));
  for (let k = 0; k < limbs; k++) {
    const a = Math.PI / 2 + (k - (limbs - 1) / 2) * C.spread + (rnd() - 0.5) * 0.3;
    limb(tx, fork, a, C.limb[0] + rnd() * C.limb[1], C.trunk * 1.1, C.depth);
  }
  // the leaves: clumps round every twig's end, leaving gaps the sun comes through (softened once for the whole
  // atlas below, and by the floor's penumbra: the sun is a disc, not a point)
  for (const [x, y, d] of tips) {
    const n = C.leaves[0] + Math.floor(rnd() * (C.leaves[1] - C.leaves[0] + 1)) + d;
    for (let j = 0; j < n; j++) {
      const r = (C.leaf[0] + rnd() * C.leaf[1]) * S, cx = X(x + (rnd() - 0.5) * C.clump), cy = Y(y + (rnd() - 0.5) * C.clump * 0.8);
      g.beginPath(); g.ellipse(cx, cy, r, r * (0.6 + rnd() * 0.4), rnd() * Math.PI, 0, Math.PI * 2); g.fill();
    }
  }
}

// `n` trees side by side, each `px` square: white where a tree blocks the sun. Built once and shared by the floor
// and the lawn
let atlas = null;
export function treeAtlas(C) {
  if (atlas) return atlas;
  const S = C.px, cv = document.createElement('canvas');
  cv.width = S * C.n; cv.height = S;
  const g = cv.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < C.n; i++) drawTree(g, i * S, S, rng(C.seed + i * 977), C.shape);
  // one soft pass over the lot (a filter on every leaf drawn was thousands of blurs)
  const soft = document.createElement('canvas'); soft.width = cv.width; soft.height = cv.height;
  const sg = soft.getContext('2d'); sg.filter = `blur(${(S * C.shape.blur).toFixed(1)}px)`; sg.drawImage(cv, 0, 0);
  atlas = new THREE.CanvasTexture(soft);
  atlas.colorSpace = THREE.NoColorSpace; atlas.wrapS = atlas.wrapT = THREE.ClampToEdgeWrapping;
  atlas.minFilter = THREE.LinearMipmapLinearFilter; atlas.magFilter = THREE.LinearFilter;
  return atlas;
}
export const treeCanvas = (C) => treeAtlas(C).image;   // for a look check
