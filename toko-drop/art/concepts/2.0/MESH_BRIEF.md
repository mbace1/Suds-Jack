# Toko Drop 2.0 — World 2 mesh brief (for Claude)

Camera: portrait twin-stick, ~30° tilt, FOV ~60. Scale: Micro Machines — hero/enemies tiny vs curb/props.

## Mesh NOW (approved)

Source: `world-2/02-curb-lawn-modules-APPROVED.png` (+ `02-curb-lawn-modules-v2.jpg`)

| # | Module | Notes |
|---|--------|-------|
| 1 | Straight curb segment | Box + rounded cap; joint every `curbJoint` |
| 2 | Corner curb | Outer 90° |
| 3 | Open near-side curb end | Flat end, not infinite |
| 4 | Grass corner tuft | Outside play rectangle |
| 5 | Lawn strip wash | Beyond curb |
| 6 | Concrete floor cracks | Floor deco / albedo detail |
| 7 | Storm drain grate | In slab / curb cutout |
| 8 | Arena layout | Guide only — not a mesh |

### Live scales (`toko-drop/js/tuning.js` → `TUNING.scenery.driveway`)

```
lawnOut: 12
curbWidth: 0.4
curbHeight: 0.2
curbJoint: 2.4
curb color: [0.5, 0.5, 0.48]
```

Wire into existing `scenery.js` `_driveway` patterns (curb body + cap, lawn outside slab). Do not invent new curb sizes without retuning.

## Mesh as placeholders (modular expansion — Mikael asked 31 Oct)

Folder: `world-2/modules/`

| File | Mesh stubs |
|------|------------|
| `01-curb-modules.jpg` | Straight, corner, T-junction, open end, cracked curb, curb+drain cutout |
| `02-lawn-props-summer.jpg` | Grass corner, lawn strip, weed patch, rain puddle, hose coil, **hydrant BASE only** (flat red flange from above — no tall hydrant) |
| `03-hardscape-modules.jpg` | Sidewalk barrier long, sidewalk L-end, manhole, crack tile, chain-link panel, traffic cone |
| `04-hero-cubes.jpg` | White gel hero (elongated black oval eyes + small white highlight), teal jelly cube, orange jelly cube — **no letters on cubes** |

Also see prior concepts in `world-2/elements/` (same props, less modular layout). Prefer `modules/` for geo.

### Prop rules

- Season default = **summer** (green grass/weeds). Autumn leaves = seasonal variant only, not default W2.
- Hydrant = **bottom/base silhouette only** (top-down iso).
- Hero eyes = elongated black ovals with tiny white highlight circle.
- Spectator blobs = leave out for now.
- Materials target later: translucent jelly/gel + simple readable Wind Waker–type look. Placeholders can be flat/unlit first.

## Do NOT mesh

- Midori Edition / 4.0 Drive kit (Wall/Floor, enemy idea…)
- World 1 neon concepts (rejected drafts)
- Full upright fire hydrant
- Autumn leaf piles as default dressing
- Unapproved Well full-scene molds

## Deliverable shape

1. Placeholder meshes (or procedural geo matching modules) named clearly, e.g. `w2_curb_straight`, `w2_grass_tuft`, `w2_hose_coil`, `w2_hero_gel`, `w2_cube_teal`.
2. Hook curb/lawn into driveway scenery; props as optional scenic instances outside the play rectangle.
3. Keep hero/cube at Micro Machines scale vs curbHeight 0.2.
4. No merge of Midori kit; no social posts; no gallery menu code from this pack.
