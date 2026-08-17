# World 1 library — starter catalog

This is a **source trove**, not the production seam. Claude Code / Art / Level agents may pull from these pieces when dressing Groundworks, combine them into larger segments, recolour them, crop them, or rasterise them before promotion to `eeri/assets/2d/`.

All starter assets obey the World 1 constraints in `README.md`: **flat plane, frontal/near-side-on, transparent background, no floor plane, no clouds, no baked sky decoration.**

## Background

- `background/halfbuilt-silhouette-a.svg` — quiet low-contrast unfinished structural rhythm for skyline/far use. Keep it subtle; this is not a hero layer.

## Midground

- `midground/frame-gable-a.svg` — larger gabled half-built structure. Painted card/foam-board frame, pale balsa roof truss, exposed corrugated edges, masking-tape repairs, brass fasteners.
- `midground/scaffold-bay-a.svg` — modular scaffold bay with cross-bracing and exposed fluting. Designed to repeat or be cropped into custom level segments.

## Foreground

- `foreground/pipe-crossing-a.svg` — high foreground crossing designed to crop off frame edges. Dark painted pipe/board material with taped supports. Use sparingly as an occluder.

## Props

- `props/barrier-hazard-a.svg` — flat side-view black/yellow hazard barrier. No product-render feet or implied floor; bottom edge meets the existing level ground line.

## Textures

- `textures/material-swatch-sheet.svg` — source/reference swatches for kraft card, pale painted foam/card, balsa, masking tape, felt/soft safe material, painted steel and corrugated cut edges.

## Agent use

1. Check this catalog before generating another World 1 construction piece.
2. Prefer assembling/customising these ingredients over repeating the exact same background composition.
3. SVGs are source assets: edit them freely in this library, then rasterise/export only the chosen composition.
4. Do **not** point runtime code at this folder.
5. Do **not** overwrite existing `groundworks_*` production layers unless the task explicitly calls for an art replacement.
6. When promoting a composition, follow `eeri/assets/README.md` and the layer dimension/depth contract.

## Texture direction

World 1 should not collapse into one generic paper material. Mix surfaces deliberately:

- **painted foam/card** for structural uprights and pale walls
- **balsa / pale timber** for trusses and temporary bracing
- **kraft + corrugated card** for packed materials, cut faces and rough construction elements
- **masking tape** as the visible hand-built join language
- **felt/soft material** where a safe/grass-like lip is needed
- **painted steel / dark board** for pipes, barriers and selected foreground occluders
- **brass/simple fasteners** as the shared detail motif

Keep the silhouette readable and the material noise restrained.