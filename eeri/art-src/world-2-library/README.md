# EERI — World 2 reusable art library

**World 2 is THE WATERWORKS** (DESIGN §4.1 "pipes/water", due at level 4).

Same rules as `world-1-library/` — read that README first, it is the parent
document and everything in its *Agent rule*, *Critical plane rule*, *Clouds*,
*Folder contract* and *Promotion to production* sections applies here
unchanged. This file records only what is **different about World 2**, plus
the one trap the pipe world adds.

This folder is a **source library**, not shipping art: nothing here is in
`assets/manifest.json`, nothing is loaded by the game, and nothing replaces a
production asset until an agent deliberately promotes it through the seam.

## This is not a fresh start — World 2 already exists

Before generating anything, look at what is already built:

- **`art-src/craft/pipeworks/`** — 25 pool pieces (`W-sky-*`, `W-far-*`,
  `W-mid-*`, `W-near-*`, `W-fore-*`, `WG-*` grades)
- **`art-src/tools/build-layers.mjs`** — `POOLS.pipeworks` / `CONFIGS.pipeworks`
  build the five layers; run with `WORLD=pipeworks`
- **`assets/manifest.json`** — `layers.pipeworks`, five entries at
  `2d/pipeworks_*_v1.png`, held as **`placeholder`** until level 4 needs them

Extend that vocabulary — tank, rack, valve, elbow, sluice, culvert, standpipe,
pump skid — rather than inventing a parallel one. A second lineage in the art
is as expensive as a second lineage in the code.

## World 2 visual lock

**The kit is the same, the end of it is different.** World 1 is warm — putty,
kraft, balsa. The waterworks is **cool and damp**: galvanised silver, slate
blue, weed green, wet-card grey. Same handmade construction-set language, same
80/20 Crafted World ratio, no warm browns leading.

Materials that belong to this world and not to World 1: **paper drinking
straws, cardboard tube, kitchen foil, pipe cleaners, cork, rubber bands, wire
mesh, tulle, hessian sacking, cotton wool, greaseproof paper.**

### The one locked look rule

> **Water is CUT PAPER** — layered blue card with hand-torn scalloped edges.
> **Never a rendered liquid.** No transparency, no reflection, no gradient, no
> shine, no wetness.

This predates the library (it is written into `build-layers.mjs`) and it is
the rule most likely to be broken by someone who reaches for "water" and gets
a render. `props/watersheet-paper.png` exists in this library specifically so
there is a picture to point at instead of a sentence to argue with.

### Cap it, or crop it

The plane rule is inherited whole from World 1, but the pipe world adds a trap
that the construction world never surfaced:

> **A pipe world is full of circular openings, and an opening is the hardest
> thing to keep flat.**

A pipe stub, a hose coupling, a vent collar — the model wants to show you the
**mouth**, because a mouth is what says "pipe". But a mouth is a circle whose
axis points at the camera, so drawing it at all tilts the object, and out
comes the ellipse that means the piece is carrying ground. Three of the first
twelve failed exactly this way. Saying "no ellipses" does not help, because
the model is not trying to draw an ellipse — it is trying to draw a pipe.

So give it the two legal ways to end a pipe, and leave nothing to decide:

> **CAP IT, OR CROP IT.**

A flat disc cap facing the camera is a **true circle** and is correct. A pipe
running off the edge of the frame has no end to draw at all. Every pipe end in
`tools/sheet-w2lib.mjs` and `tools/fix-w2lib.mjs` is explicitly one or the
other; reuse that `ENDS` clause.

## Generating

`art-src/tools/plane-clauses.mjs` holds the shared clauses (`ELEV`, `FLOAT`,
`CRAFT`, `KEY`, and `laws()` which assembles them). **Import them rather than
retyping them** — same reason `keylib.js` is shared, which is that every one
of its rules shipped as a bug first. `tools/sheet-w2lib.mjs` is the worked
example.

Pieces are committed **already keyed**, as transparent PNGs at ≤1024px wide.
Backing colour is a detail of generation and should not reach anyone
downstream.
