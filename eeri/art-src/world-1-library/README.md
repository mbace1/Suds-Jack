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

**There is no expanded 3D ground area in this game.** The environment is made
from **flat 2D planes** and a prop meets the world at a single ground *line* —
there is no floor extending back in z for anything to stand on. So a piece
that was photographed from anywhere above its own middle brings a floor with
it, and the level cannot honour it. This is geometry, not taste.

- NO visible floor plane under an object
- NO pedestal/base added merely to make a prop stand up
- NO three-quarter tabletop/product-render angle
- NO cast shadow that implies an unseen floor
- NO perspective ground receding toward the horizon
- frontal or dead side-on cutout construction
- apparent material thickness is allowed at exposed cardboard edges, but the
  overall asset must still read as a flat stage-set/cutout piece

If a prop logically needs ground contact, compose it so its bottom edge simply
meets the level's existing flat ground line.

#### The elevation test

Naming the camera angle did **not** prevent the problem — six of the first
twelve direction pieces came back carrying volume anyway, because a model can
miss "no three-quarter angle" by ten degrees and still feel obedient. Ask for
the *consequence* instead. It has no degrees in it and it settles in a second:

> **A circle is either a true circle or a straight line — never an ellipse.**

Both halves carry. A circle whose face is square to the camera — a cable drum
flange, a cork valve wheel — is a **true circle** and is correct. A circle
whose axis lies across the picture — a bucket rim, a pipe mouth — is edge-on
and must be a **straight line**. The ellipse is the state between them, and it
is the tell: **find an ellipse and the camera is off-axis and the piece is
carrying ground.** Every offender had one — a bucket rim, a drum barrel, a
pallet board, a roof cap.

The companion tell is the same fact from the other side: **if you can see the
top of it, or inside it, it is wrong** — no top face, no lid surface, no open
mouth, no upper edge turning away.

The clauses that enforce all of this live in `art-src/tools/plane-clauses.mjs`
— import them rather than retyping them, for the reason `keylib.js` exists.

Two things follow that are not obvious:

- **Never ask an elevation piece for anything along its side.** Requesting
  "the cut foam core showing down one edge" is requesting a second face, and
  the model will turn the object to give you one. Material detail has to live
  on the front face.
- **Flatness and craft pull against each other.** Elevation removes the
  shading that normally sells "handmade", and a model will reach for vector
  art to fill the gap — flat, obedient, and suddenly clip art. So name the
  material as *surface* (paper fibre, chalky matte paint, brush marks,
  hand-cut edges) rather than leaving it to be implied by light.

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
