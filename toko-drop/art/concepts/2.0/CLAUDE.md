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

| File | Contents |
|------|----------|
| `01-hose.jpg` | Garden hose + nozzle on curb, Micro Machines scale |
| `02-sidewalk-barrier.jpg` | Long sidewalk slab barrier + end piece + hero scale |
| `03-grass-drain-hero.jpg` | Grass tuft cluster, storm drain + puddle, white gel hero |
| `04-curb-cracks-cube.jpg` | Curb module, concrete cracks sample, letterless enemy cube |
| `05-hydrant-mailbox-spigot.jpg` | Fire hydrant, mailbox, wall spigot |
| `06-puddle-leaves-weeds.jpg` | Rain puddle, fallen leaf cluster, weed patch |
| `07-manhole-fence-cone.jpg` | Manhole cover, chain-link fence panel, traffic cone |

Scale note: hero/enemies are Micro Machines tiny vs these props.

## World progression (context, not art)

1. World 1 — neon grid void  
2. World 2 — real-world driveway (this pack) — drop lands here  
3. Then sewers and deeper  

## Style options (later)

Gallery / picker: watercolor · 3D cel-shaded · 3D textured. Watercolor mood pics and other concepts are **not** in this PR until approved.

## What Claude should do

1. Keep curb/lawn modules as the sole **mesh-approved** 2.0 env kit for now.  
2. Build placeholder meshes matching modules 1–7; use #8 as layout guide. Scales → `tuning.js` driveway curb (`curbWidth` / `curbHeight` / `curbJoint`) and `scenery.js` world-2 patterns.  
3. Treat `world-2/elements/` as concept refs only — do **not** mesh until a sheet is marked APPROVED.  
4. Do **not** ship World 1 neon concepts or Well gameplay frames from earlier drafts — they were rejected.  
5. Do **not** merge Midori Edition (4.0 Drive kit) as 2.0.

## Out of scope

Worlds 1 / 3–6 art, spectator blobs (left out for now), Midori enemy kit, social posts.
