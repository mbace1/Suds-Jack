# EERI — layer art requests, derived from the v15.19 build

**For the art-pipeline instance.** This is a request list, not a wishlist:
every item below is a gap that `art-src/tools/build-worlds.mjs` hit while
composing the four shipping worlds, measured rather than guessed.

Read first, in this order: `PHASING.md` (owner direction, supersedes),
`ART_BRIEF.md`, `/ART_PIPELINE.md`, and `art-src/world-N-library/README.md`
for the folder contract. The prompt clauses are **already written** — import
them from `art-src/tools/plane-clauses.mjs` (`ELEV`, and the no-ground
clauses) rather than retyping them. Every sentence in that file was paid for
by a re-roll.

---

## How this list was derived, so you can argue with it

A parallax lane draws from a pool. When a lane has nothing of its own, the
compositor is forced to borrow from a neighbouring lane and rescale it — the
same object then appears at two depths in one screen, which is exactly what
"flat" looks like to a player. So the honest measure of a thin pool is
**how many pieces are doing double duty**:

| world | pieces used in more than one lane | worst offender |
|---|---|---|
| **pipeworks** | **12 of 16** | `standpipe-valve-a` — in all four of skyline, far, mid, fore |
| **groundworks** | **11** | every skyline piece is also a far piece |
| nightshift | 7 | `w4-dock-night-sheet-a#16` in three lanes |
| grove | 3 | healthiest — its sheets carry real treeline strips |

Two conclusions fall straight out:

1. **Groundworks has no skyline tier at all.** All six of its skyline entries
   are scaffolds and frames pulled up from `far` and scaled. That is the whole
   reason World 1 reads pale and flat: it is the same white foam-board object
   at three different depths. This is the top priority and it is not a matter
   of taste.
2. **Pipeworks is stretched thinnest.** Sixteen pieces across five lanes, with
   one standpipe carrying four of them.

Grove needs the least. Please do not spend the budget there.

---

## The contract every piece must meet

These are hard requirements of the compositor, not style preferences.

| | |
|---|---|
| **format** | PNG. **Alpha already cut is best.** Failing that, a *flat, uniform* black, white or bright-blue backing — `keyOut()` handles all three, but a gradient backing keys badly (the blue ones we have are gradients and only survive because the key tests chroma, not distance) |
| **elevation** | `ELEV` from `plane-clauses.mjs`, verbatim. A circle is a true circle or a straight line, never an ellipse |
| **ground** | none. No floor, no pedestal, no cast shadow, no receding ground. The compositor plants each piece on the lane's own ground line and draws its own contact shadow |
| **tint** | **none — send full contrast.** Depth haze is baked by the compositor per lane (skyline 0.78 → fore 0.00). A pre-hazed piece gets hazed twice and disappears |
| **clouds / sky / sun** | never. The sky is its own layer |
| **resolution** | at least 2× the pixel height it will occupy (table below). Bigger is fine; the compositor downsamples |

### If you deliver several pieces on one board

Boards are cut automatically by flood fill (`components()`, min area 9000 px).
That imposes one rule and it is easy to miss:

> **Objects on a board must not touch, and must not overlap.** Two objects
> sharing a single pixel of contact become **one** component and cut out as a
> single unusable blob. Leave a clear channel of background between every pair.

Index order is raster order, top-to-bottom then left-to-right, so a pool entry
naming `#3` means the fourth object found that way. Keep boards to a tidy grid
and the indices stay predictable.

### Lane sizes, for scale

`PPU` is 30 px per world unit. A piece's requested height below is in **world
units**; multiply by 30 for the pixel height it occupies in the strip.

| lane | strip px | world rect | ground line | haze baked |
|---|---|---|---|---|
| skyline | 4096 × 900 | 160 × 30 | 3.0 | 0.78 |
| far | 4096 × 600 | 140 × 20 | 3.4 | 0.55 |
| mid | 3660 × 420 | 122 × 14 | 3.8 | 0.26 |
| near | 3360 × 240 | 112 × 8 | 3.9 | 0.08 |
| fore | 3360 × 480 | 112 × 16 | 5.4 | 0.00 |

---

## PRIORITY 1 — World 1 skyline: the distant city (6 pieces)

`art-src/world-1-library/background/`

The old magenta pool has these (`craft/pieces/P-sky-*.jpg`, listed in
`world-1-library/INDEX.md`) and they are the v14 art the owner asked us to
move off. The new library has no replacement, so the lane is currently faked.

Every piece here is **quiet**: low internal contrast, simple silhouette, read
at a glance and then get out of the way. They carry 0.78 haze, so send them at
full strength and trust the compositor.

| # | piece | height | notes |
|---|---|---|---|
| 1 | office tower slab | 14 | plain painted card slab, regular window grid, flat top |
| 2 | stepped building | 12 | two or three setbacks — the silhouette IS the piece |
| 3 | paired low blocks | 9 | two squat blocks side by side, differing heights |
| 4 | slim tower block | 17 | narrow, tall, a vertical accent among the slabs |
| 5 | chimney / vent stack | 19 | one tall thin stack, slight taper, banded |
| 6 | tower crane, distant | 20 | balsa lattice mast + jib. The one hero shape on the horizon |

**Colour is the point.** The current lane is white-on-pale-blue and vanishes.
Give these muted but *real* colour — chalky blues, warm greys, a dusty
terracotta — so that at 0.78 haze they still separate from the sky.

## PRIORITY 2 — World 2 pipeworks: the thin lanes (7 pieces)

`art-src/world-2-library/`

The 16 delivered pieces are excellent and they are why World 2 finally looks
like itself. They are simply spread over too many jobs.

**`background/` — a skyline tier of its own (4)**

| # | piece | height | notes |
|---|---|---|---|
| 7 | water tower on legs | 18 | the silhouette that says "waterworks" from a distance |
| 8 | digester / gas holder | 13 | a fat cylinder with a banded top — a true circle, dead square on |
| 9 | filter-bed gantry | 11 | a long low lattice walkway on legs, repeats well |
| 10 | tall vent stack | 21 | pipeworks' answer to the chimney; hero height |

**`foreground/` — the occluder lane has three pieces total (3)**

Fore pieces are **cropped by the frame, top and bottom** — that is the job.
Send them tall and narrow, and let detail run off both ends.

| # | piece | height | notes |
|---|---|---|---|
| 11 | vertical pipe run with brackets | 16 | runs off the top and the bottom of frame |
| 12 | ladder cage against a pipe | 15 | narrow, rhythmic, something to pass behind |
| 13 | low spoil / wet-sand sweep | 5 | sits along the very bottom edge, cropped below |

## PRIORITY 3 — the ground, all four worlds (4 pieces)

`art-src/world-N-library/textures/`

**This is the biggest single area on screen and it is currently painted in
code** — flat fills with a torn edge and scattered grit. It is the weakest
thing in every lane and one good strip per world would lift all four.

Each is a **horizontally tileable strip**, roughly 2048 × 400, of layered
crafted strata seen dead-on: torn kraft courses, corrugated edges showing,
small stones and roots embedded. No objects with a nameable identity in them —
the tiling law from `INDEX.md` applies (tile it 3 × 3 and LOOK).

| # | piece | world | notes |
|---|---|---|---|
| 14 | dug earth strata | groundworks | warm browns, sand courses, buried brick and pipe ends |
| 15 | wet concrete + standing water | pipeworks | grey-blue, a darker damp band along the top edge |
| 16 | forest floor over cut soil | grove | moss and leaf crest over root-laced earth |
| 17 | dock asphalt, night | nightshift | cold dark grey, painted line fragments, puddle sheen |

## PRIORITY 4 — World 4 foreground (2 pieces)

`art-src/world-4-library/foreground/`

Nightshift reads well, but its fore lane is three pieces and two of them are
also near-lane props.

| # | piece | height | notes |
|---|---|---|---|
| 18 | dock crane leg / gantry upright | 16 | heavy steel, cropped top and bottom |
| 19 | stacked containers, cropped | 14 | a corner of a stack running off the top of frame |

**Lit, not silhouetted.** Everything in World 4 is a night scene, and the
foreground carries zero haze — a black shape at the front of a dark picture is
a hole. Give these the warm sodium rim the delivered dock pieces already have.

---

## What NOT to make

- **Grove pieces.** It is the healthiest pool; three double-duty pieces is
  fine. Spend the budget on Worlds 1 and 2.
- **More near-lane props for World 1.** It already has twenty distinct ones,
  the deepest pool in the game. It is the *distance* that is missing.
- **Anything pre-hazed, pre-shadowed, or standing on ground.** See the
  contract above; this is what most re-rolls have been spent on.

## Delivery

Drop files into the folders named above, add a line per piece to that
library's `CATALOG.md`, and say in the PR which of the numbered requests each
file answers. Do **not** touch `assets/manifest.json` or `assets/2d/` — the
libraries are source, and `build-worlds.mjs` is what turns them into shipping
layers. Once the files land, one command rebuilds a world:

```
NODE_PATH=$(npm root -g) node art-src/tools/build-worlds.mjs groundworks
```

Pool membership, per-piece world heights and draw weights live in `WORLDS` in
that file — adding a piece to a lane is one line there.
