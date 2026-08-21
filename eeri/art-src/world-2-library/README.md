# World 2 library — Pipeworks

Optional source art for **World 2: pipes and water hazards**. Use this as a
trove for custom level dressing and composition; it does not replace the live
`pipeworks_*` backdrop set.

Read `CATALOG.md` for the catalogued pieces and `INDEX.md` for the twelve
committed direction pieces and what generating them cost.

## Style lock

- Crafted World first: visibly hand-built cardboard, pressed paper, painted
  card, tape, brads, corrugated edges, rubber hose and toy-like pipe fittings.
- Pipeworks has a rounder visual language than World 1: pipe mouths, elbows,
  flanges, valves, drains and wet-channel shapes.
- Palette leans grey / blue / teal with orange and yellow accents.
- Water is a crafted sheet/material with a hard cut edge, not realistic
  transparent water.
- Keep pieces front-on or near-side-on and compatible with the game's flat
  gameplay plane.
- No baked clouds. No product-render floor/pedestal. No automatic gameplay
  meaning.

## Use

Agents may crop, layer, recolour and combine these into new background,
midground, foreground or accent compositions. Promotion into `eeri/assets/**`
is always a separate deliberate art-lane change.

Pieces are committed **already keyed**, as transparent PNGs at ≤ 1024 px wide.
Backing colour is a detail of generation and should not reach anyone
downstream.

Materials that belong to this world and not to World 1: **paper drinking
straws, cardboard tube, kitchen foil, pipe cleaners, cork, rubber bands, wire
mesh, tulle, hessian sacking, cotton wool, greaseproof paper.**

## This is not a fresh start — World 2 already exists

Before generating anything, look at what is already built:

- **`art-src/craft/pipeworks/`** — 25 pool pieces (`W-sky-*`, `W-far-*`,
  `W-mid-*`, `W-near-*`, `W-fore-*`, `WG-*` grades)
- **`art-src/tools/build-layers.mjs`** — `POOLS.pipeworks` /
  `CONFIGS.pipeworks` build the five layers; run with `WORLD=pipeworks`
- **`assets/manifest.json`** — `layers.pipeworks`, five entries at
  `2d/pipeworks_*_v1.png`, held as **`placeholder`** until level 4 needs them

Extend that vocabulary — tank, rack, valve, elbow, sluice, culvert, standpipe,
pump skid — rather than inventing a parallel one. A second lineage in the art
is as expensive as a second lineage in the code.

## Water is cut paper

> **Water is CUT PAPER** — layered blue card with hand-torn scalloped edges.
> **Never a rendered liquid.** No transparency, no reflection, no gradient, no
> shine, no wetness.

This predates the library (it is written into `build-layers.mjs`) and it is the
rule most likely to be broken by someone who reaches for "water" and gets a
render. `props/watersheet-paper.png` exists specifically so there is a picture
to point at instead of a sentence to argue with.

## Flat plane: the elevation test

"Front-on or near-side-on" above is the rule; this is how to tell whether a
piece actually obeys it. **There is no expanded 3D ground area** — the
environment is flat planes and a prop meets the world at a single ground
*line*, with no floor extending back in z. A piece photographed from above its
own middle brings a floor with it, and the level cannot honour it.

Naming the camera angle does not prevent this — a model can miss "no
three-quarter angle" by ten degrees and still feel obedient. Ask for the
consequence instead:

> **A circle is either a true circle or a straight line — never an ellipse.**

A circle square to the camera (a cable drum flange, a cork valve wheel) is a
**true circle** and is correct. A circle whose axis lies across the picture (a
bucket rim) is edge-on and must be a **straight line**. The ellipse is the
state between them, and finding one means the camera is off-axis and the piece
is carrying ground. Companion tell: **if you can see the top of it, or inside
it, it is wrong.**

### Cap it, or crop it

The style lock asks for **pipe mouths, elbows and flanges**, and that is not in
tension with the rule above *provided the mouth is square to the camera* — a
mouth seen head-on is a true circle and is exactly right. The trap is the mouth
seen at an angle:

> **A pipe world is full of circular openings, and an opening is the hardest
> thing to keep flat.**

The model wants to show you the mouth, because a mouth is what says "pipe" —
but drawing it at an angle tilts the whole object and out comes the ellipse.
Three of the first twelve pieces failed exactly this way. Saying "no ellipses"
does not help; it is not trying to draw an ellipse, it is trying to draw a
pipe. So hand it the legal endings and leave nothing to decide:

> **CAP IT, OR CROP IT** — or point it straight at the camera.

A flat disc cap facing the camera is a true circle. A pipe running off the
frame edge has no end to draw. Reuse the `ENDS` clause in
`tools/fix-w2lib.mjs`.

## Generating

`art-src/tools/plane-clauses.mjs` holds the shared clauses (`ELEV`, `FLOAT`,
`CRAFT`, `KEY`, and `laws()` which assembles them). **Import them rather than
retyping them** — same reason `keylib.js` is shared, which is that every one of
its rules shipped as a bug first. `tools/sheet-w2lib.mjs` is the worked example.
