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
---

## Imported 2026-08-17 — owner's World 1 craft renders

Sixteen approved renders handed over in chat, filed here as **source
ingredients**. Nothing below is a production layer and nothing is referenced
by `assets/manifest.json`; promotion still goes through the seam described at
the top of this file.

**Keying, and read this before you composite anything.** These arrived on two
different negative-space colours, and neither is the magenta `keylib.js`
expects (see `INDEX.md`):

- the five single/composed pieces are on **bright blue** — the colour the
  README names as World 1 negative space
- the eleven boards are on **black**

So `art-src/tools/keylib.js` cannot key either one as it stands. Key them by
hand, or give keylib the blue and black variants it is already noted as
needing — do **not** run the magenta key on them and then wonder where the
fringe came from.

### Single and composed pieces (blue-backed, 1254×1254 / 1448×1086)

- `props/hazard-barricade-frame-a.png` — black-and-yellow hazard board hung in
  a pale foam-board frame. Flat, frontal, sits straight on the ground line.
- `props/material-yard-a.png` — kraft/corrugated sheet stacks beside a strapped
  concrete-pipe pyramid on a pallet. One of the best "this is a worksite"
  props in the set.
- `props/material-cluster-a.png` — pallets, pipe stack and a blank board
  grouped as one silhouette; crop it apart or use whole as a yard anchor.
- `props/billboard-blank-a.png` — blank taped billboard on a single post.
  **Carries a baked green/soil ground strip** — cut it off at the post foot
  before use, per the README's plane rule.
- `midground/frame-gable-skyline-a.png` — gabled half-built timber frame.
  **Carries a baked pale-blue skyline between the studs.** Either mask the
  skyline out or accept it only where the existing far layer already reads
  blue; do not promote it with the skyline attached.

### Boards (black-backed, 1448×1086)

Multi-piece sheets. Cut from them; never promote a whole board.

- `sheets/w1-frames-truss-a.png` — hoarding frames at three sizes plus a
  balsa roof truss.
- `sheets/w1-timber-parts-a.png` — truss, plank, low crate wall, pallet rack.
- `sheets/w1-vertical-parts-a.png` — ladder, two scaffold standards, a tower-
  crane jib, and a material pile.
- `sheets/w1-site-kit-a.png` — lamp post, insulation-board bundle, crane jib,
  crates/pipes/cones.
- `sheets/w1-site-kit-b.png` — ladder, bracketed truss, insulation bundle,
  box-and-pipe pile.
- `sheets/w1-scaffold-kit-a.png` — ladder-and-scaffold bay, truss, hoarding
  panel, teal tarp banner, kerb strip.
- `sheets/w1-scaffold-kit-b.png` — ladder, hoarding panel, banner, sawhorse
  barricade, cones, tape rolls.
- `sheets/w1-scaffold-kit-c.png` — scaffold, hoarding, truss, teal banner,
  kerb. Second take on `-a`.
- `sheets/w1-yard-dressing-a.png` — pipe stacks, timber pallet, barricade with
  cones, green signpost.
- `sheets/w1-yard-dressing-b.png` — same family, different take: pipe stacks,
  timber-and-card pallet, barricade, cone, signpost.
- `sheets/w1-yard-dressing-c.png` — pipe stack, timber pallet, barricade,
  cone, signpost, amber hazard light.

The three `yard-dressing` and three `scaffold-kit`/`site-kit` boards are
**variant takes of the same kit**, not six different kits. Pick the cleanest
cut of each object rather than shipping three near-identical cones.
