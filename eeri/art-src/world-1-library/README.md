# EERI — World 1 reusable art library

This folder is an **optional source library for World 1 / Groundworks**.
It is deliberately outside `eeri/assets/` and outside `assets/manifest.json`.
Nothing in this folder is loaded by the game automatically, and nothing here
replaces a production asset unless an agent deliberately selects, prepares,
and promotes it through the normal asset seam.

## Agent rule

When dressing or extending **World 1**, look here for reusable source pieces
before generating another near-duplicate. Treat these as ingredients, not as
complete level art. Crop, mask, combine and recolour as needed, then export the
final production layer through the existing `eeri/assets/2d/` workflow.

Do **not** edit existing production assets merely because a similar library
piece exists here.

## World 1 visual lock

Reference: the current World 1 / Groundworks look.

- handcrafted construction-set material language
- slightly cleaner / higher-definition than the current live layer is fine
- pale painted foam-board/card structures, balsa-like timber, kraft/corrugated
  card, masking tape, simple metal fasteners
- bright blue remains negative space / transparency during source generation
- material texture is welcome; visual noise is not
- construction-site subject matter only

### Critical plane rule

The current environment system is made from **flat 2D planes**. Therefore
library pieces must work when composited onto a flat layer:

- NO visible floor plane under an object
- NO pedestal/base added merely to make a prop stand up
- NO three-quarter tabletop/product-render angle
- NO cast shadow that implies an unseen floor
- NO perspective ground receding toward the horizon
- prefer frontal or near-side-on cutout construction
- apparent material thickness is allowed at exposed cardboard edges, but the
  overall asset must still read as a flat stage-set/cutout piece

If a prop logically needs ground contact, compose it so its bottom edge simply
meets the level's existing flat ground line.

### Clouds

**Clouds are a separate existing asset layer. Do not bake clouds into any
World 1 library background, structure, prop, foreground or texture asset.**
Likewise, do not add a new sun or sky decoration unless specifically requested.

## Folder contract

- `background/` — distant structural silhouettes and large flat construction
  forms; quiet, low-detail ingredients for skyline/far use
- `midground/` — scaffold bays, hoarding, frames, trusses, incomplete walls,
  beams and larger set dressing
- `foreground/` — narrow vertical occluders, bottom-edge sweeps and overhead
  crossings intended to crop against the screen edge; never large eye-level
  blobs
- `props/` — flat-side-view construction dressing such as strapped pipe stacks,
  pallets, barriers, boards and site materials that can sit directly on the
  existing ground line
- `textures/` — source texture patches/material swatches: corrugated card,
  kraft paper, painted foam board, balsa/wood, masking tape, felt/soft material,
  brushed/painted metal and related World 1 surfaces
- `candidates/` — newly generated pieces awaiting visual approval; agents should
  prefer the category folders above

## Promotion to production

A library item becomes a shipping asset only when deliberately integrated:

1. prepare/crop/repaint it for the target layer
2. export it to the correct `eeri/assets/2d/` production path and dimensions
3. update `assets/manifest.json` only if the production seam requires it
4. run the existing EERI smoke gate

This separation is intentional: **library = optional ingredients; `assets/` =
shipping contract.**
