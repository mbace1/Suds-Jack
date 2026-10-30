# Toko Drop 2.0 — Concept handoff (approved only)

## Approved (meshes allowed)

- `world-2/02-curb-lawn-modules-v2.jpg` (and `02-curb-lawn-modules-APPROVED.png`) — **WORLD 2 — CURB / LAWN MODULES**
  1. Straight curb segment  
  2. Corner curb piece  
  3. Open near-side curb end  
  4. Grass corner tuft  
  5. Lawn strip wash  
  6. Concrete floor with cracks  
  7. Storm drain grate  
  8. Arena layout  

**Meshes only from approved sheets.** Element concepts below are **not** mesh-approved until Mikael marks them.

## World 2 element concepts (pending approval)

Folder: `world-2/elements/`

| File | Contents | Notes (Mikael 31 Oct) |
|------|----------|------------------------|
| `01-hose.jpg` | Garden hose + nozzle on curb | — |
| `02-sidewalk-barrier.jpg` | Long sidewalk slab barrier + end piece | — |
| `03-grass-drain-hero.jpg` | Grass tuft, storm drain + puddle, white gel hero | Hero eyes → more defined in future art |
| `04-curb-cracks-cube.jpg` | Curb module, concrete cracks, letterless cube | — |
| `05-hydrant-mailbox-spigot.jpg` | Fire hydrant, mailbox, wall spigot | **Hydrant:** only bottom/base usable (top-down iso); full upright form is wrong for game cam |
| `06-puddle-leaves-weeds.jpg` | Rain puddle, fallen leaves, weed patch | **Leaves = seasonal patch only.** Main World 2 = **summer** |
| `07-manhole-fence-cone.jpg` | Manhole cover, chain-link fence, traffic cone | — |

Scale: hero/enemies are Micro Machines tiny vs props. Camera: ~30° top-down isometric twin-stick.

Hero: white gel dome/blob; eyes = Japanese Kirby style — elongated black oval dots with a small white highlight circle.

## World progression (context, not art)

1. World 1 — neon grid void  
2. World 2 — real-world driveway (this pack) — drop lands here — **summer default**  
3. Then sewers and deeper  

## Style options (later)

Gallery / picker: watercolor · 3D cel-shaded · 3D textured. Watercolor mood pics and other concepts are **not** in this PR until approved.

## What Claude should do

1. Keep curb/lawn modules as the sole **mesh-approved** 2.0 env kit for now.  
2. Build placeholder meshes matching modules 1–7; use #8 as layout guide. Scales → `tuning.js` driveway curb (`curbWidth` / `curbHeight` / `curbJoint`) and `scenery.js` world-2 patterns.  
3. Treat `world-2/elements/` as concept refs only — do **not** mesh until a sheet is marked APPROVED.  
4. If meshing hydrant later: use base/bottom silhouette only.  
5. Do **not** ship World 1 neon concepts or Well gameplay frames from earlier drafts — they were rejected.  
6. Do **not** merge Midori Edition (4.0 Drive kit) as 2.0.

## Out of scope

Worlds 1 / 3–6 art, spectator blobs (left out for now), Midori enemy kit, social posts, autumn leaves as default W2 dressing.
