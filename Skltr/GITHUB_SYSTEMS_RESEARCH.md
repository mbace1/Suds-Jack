# SKLTR — GitHub systems worth adopting

Reviewed 2026-09-03 against the current Three.js/WebGL build.

## 1. three-mesh-bvh — highest value next dependency
Repository: gkjohnson/three-mesh-bvh
Use: fast raycasts and spatial queries against real triangle meshes.
Why SKLTR needs it: v88 restored projectile blocking with hand-authored AABBs, but the next art leap needs richer irregular architecture. BVH would let imported/procedural hero meshes become the collision/LOS source directly instead of maintaining separate visual and gameplay approximations.
Recommended use: first for projectile LOS + cover hit tests; then player capsule/sphere collision against environment meshes.
Status: research/adopt next; do not hot-swap the current stable AABB system until a compatibility test is proven.

## 2. three-bvh-csg — strong later candidate
Repository: gkjohnson/three-bvh-csg
Use: fast constructive solid geometry built on three-mesh-bvh.
Why SKLTR could use it: world transformations, cut-open brutalist forms, dynamic holes/cuts, and authored arena assembly can be generated from a small geometry grammar rather than piles of primitive boxes.
Recommended use: offline/runtime-light arena construction and transition set-pieces, not per-frame destruction.
Status: prototype after BVH foundation.

## 3. pmndrs/postprocessing — selective visual upgrade
Repository: pmndrs/postprocessing
Use: optimized Three.js post effects.
Why SKLTR could use it: stronger atmosphere, selective bloom, vignette, chromatic/glitch accents, depth-driven effects.
Caution: SKLTR already has a custom post stack and mobile is a primary target. Adopt only effects that survive a mobile GPU budget test.
Status: evaluate effect-by-effect; do not replace the existing renderer wholesale.

## 4. pmndrs/meshline — useful but not foundational
Repository: pmndrs/meshline
Use: variable-width geometry lines instead of platform-dependent GL lines.
Why SKLTR could use it: reliable thick vector-world strokes, trails, signal rails, traversal lines and bullet telegraphs across mobile/desktop.
Status: useful for the Vector/Bio worlds after collision architecture is solved.

## Decision
Immediate architecture priority is **visual geometry = gameplay geometry**. v92 starts this by deriving tactical cover visuals from the same BOXES used by collision and by making bullet impacts drive cover feedback. The next infrastructure prototype should test `three-mesh-bvh` on one HOUND/TORTOISE arena before importing more complex hero meshes.
