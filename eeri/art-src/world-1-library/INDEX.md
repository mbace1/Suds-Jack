# World 1 library — index of existing sources

The category folders are the contract; the pieces themselves largely already
exist elsewhere in `art-src/`, generated for the v14–v23 art passes. **This
index maps them into the library's taxonomy by reference instead of copying
megabytes of JPGs into a second location** — a piece that exists twice will
drift twice. New candidates still land in the folders per the README.

Every piece listed here already satisfies the critical plane rule: each was
generated as ONE object with no ground, no pedestal, no floor shadow, frontal
or near-side-on (the generation clause is in
`art-src/tools/sheet-pieces.mjs`, and it matches the README's rule nearly
word for word).

**Keying note.** The referenced sources are **magenta-backed** (#ff00ff),
keyed by `art-src/tools/keylib.js` (hue-ratio key + despill + alpha bleed —
read its header before touching a threshold; all three of its rules shipped as
bugs first). The README's World 1 lock names **bright blue** as negative space
for newly generated candidates, which is a conflict on paper only: the
**direction pieces below are committed already keyed**, as transparent PNGs, so
no consumer of this library has to know what colour was behind them. That is
the rule going forward — *a library piece arrives with its background already
gone*. Backing colour is a detail of generation, not of the library.

## background/  (distant structural silhouettes, quiet)
| piece | source |
|---|---|
| office tower slab | `craft/pieces/P-sky-slab.jpg` |
| stepped building | `craft/pieces/P-sky-step.jpg` |
| paired low blocks | `craft/pieces/P-sky-pair.jpg` |
| slim tower block | `craft/pieces/P-sky-tower.jpg` |
| chimney stack | `craft/pieces/P-sky-stack.jpg` |
| tower crane (balsa lattice) | `craft/pieces/P-sky-crane.jpg` |

## midground/  (scaffold bays, hoarding, frames, trusses)
| piece | source |
|---|---|
| five-storey concrete frame | `craft/pieces/P-far-frame5.jpg` |
| three-storey frame | `craft/pieces/P-far-frame3.jpg` |
| squat two-storey frame | `craft/pieces/P-far-frame2.jpg` |
| lift-core tower with stair | `craft/pieces/P-far-core.jpg` |
| cement silo on legs | `craft/pieces/P-far-silo.jpg` |
| site hoarding run (far grade) | `craft/pieces/P-far-hoard.jpg` |
| tower crane with base | `craft/pieces/P-far-crane.jpg` |
| three-lift scaffold | `craft/pieces/P-mid-scaff3.jpg` |
| single-lift scaffold bay | `craft/pieces/P-mid-scaff1.jpg` |
| tall slim scaffold tower | `craft/pieces/P-mid-tower.jpg` |
| overlapping-panel hoarding | `craft/pieces/P-mid-hoard.jpg` |
| site cabin | `craft/pieces/P-mid-hut.jpg` |

## foreground/  (narrow verticals, bottom sweeps, overhead crossings)
| piece | source |
|---|---|
| full-height scaffold standard | `craft/pieces/P-fore-stand.jpg` |
| debris-netting panel | `craft/pieces/P-fore-net.jpg` |
| high pipe run (cropped both ends) | `craft/pieces/P-fore-pipe.jpg` |
| dark spoil sweep (bottom edge) | `craft/pieces/P-fore-spoil.jpg` |
| dark drums + trestle (cropped) | `craft/pieces/P-fore-drums.jpg` |

## props/  (flat side-view dressing that sits on the ground line)
| piece | source |
|---|---|
| pipe stack (pyramid, chocked) | `craft/pieces/P-mid-pipes.jpg` |
| concrete mixer | `craft/pieces/P-mid-mixer.jpg` |
| sheet-stack against uprights | `craft/pieces/P-mid-stack.jpg` |
| builders skip | `craft/pieces/P-mid-skip.jpg` |
| spoil mound with felt crest | `craft/pieces/P-near-spoil.jpg` |
| small pipe pyramid | `craft/pieces/P-near-pipes.jpg` |
| traffic cones ×3 | `craft/pieces/P-near-cones.jpg` |
| oil drums ×2 | `craft/pieces/P-near-drums.jpg` |
| pallet + sacks | `craft/pieces/P-near-pallet.jpg` |
| temporary fencing run | `craft/pieces/P-near-fence.jpg` |
| buried features (pipe, drum, root, brick, stones, bottle) | `craft/earth/F-*.jpg` |

## textures/  (material swatches — MUST BE FEATURELESS, they tile)
| swatch | source |
|---|---|
| fine card fluting (topsoil) | `craft/earth/S-topsoil.jpg` |
| coarse card fluting | `craft/earth/S-mid.jpg` |
| packed kraft layers | `craft/earth/S-packed.jpg` |
| gritty fluting | `craft/earth/S-gritty.jpg` |
| balsa / felt / flute / paper | `craft/T-*.jpg` |
| felt fringe strip (keyed edge) | `craft/earth/E-fringe.jpg` |

The tiling law for anything in this section, learned twice: **a detail map
must be featureless — tile it 3×3 and LOOK** (`ART_PIPELINE.md` traps 20–23).
A swatch with a nameable object in it reads fine as a patch and prints the
same object forty-five times across a level.

## Direction pieces — the files actually in this folder

Everything above is a **reference** into the v14–v23 pool. This section is the
library's own art: twelve keyed PNGs committed in the category folders, added
to show **direction and material variety** rather than to fill a slot in a
level.

The pool they sit beside is coherent but narrow — it is largely *one* material
(painted card) doing every job, because it grew a piece at a time to answer
whatever the compositor was short of. So each piece here **leads with a
different material**, and the name says which: the point of the set is the
spread, and a name that ends in its material is a name you can shop by.

| folder | file | material lead |
|---|---|---|
| `background/` | `gantry-steel.png` | painted steel — a pale blue lattice gantry, thin and quiet |
| `background/` | `slabtower-foam.png` | painted foam board — putty-grey slab, bubble grain across the face |
| `midground/` | `bagstack-kraft.png` | kraft paper — cement sacks stacked on a corrugated pallet |
| `midground/` | `formwork-balsa.png` | balsa — a braced formwork panel, open grain, A-frame legs |
| `midground/` | `hoarding-tape.png` | masking tape — a taped-over hoarding, tape *as* the drawing |
| `midground/` | `liftshaft-brass.png` | brass fasteners — split-pin heads marching up both edges |
| `foreground/` | `mesh-steel.png` | painted steel — a dark mesh panel to crop against the edge |
| `foreground/` | `plankcross-balsa.png` | balsa — two planks in an X, cropped by all four edges |
| `props/` | `cabledrum-kraft.png` | corrugated card — one flange dead-on, a true circle, fluted rim |
| `props/` | `mixerbucket-foam.png` | painted foam board — chalky buckets, thick soft-cut rims |
| `props/` | `toolchest-steel.png` | painted steel — the set's one saturated red |
| `props/` | `turfroll-felt.png` | wool felt — two turf rolls crossed, the nap doing the work |

**The set was flattened after the first cut.** Six of the twelve came back
carrying volume — you could see the tops of the sacks, inside the buckets, the
lid of the chest — and there is **no expanded 3D ground in this game** for any
of that to stand on. The full rule and the test that catches it now live in
README § "The elevation test"; the short version is *a circle in true
elevation is a straight line, not an ellipse*, so an ellipse anywhere means the
camera is off-axis and the piece is carrying ground.

**Three more things cost a re-roll each, all the plane rule** (README §
"Critical plane rule"), so they are worth naming:

1. **A cast shadow survives keying.** A shadow on magenta is *dark* magenta,
   and dark magenta sits below keylib's absolute floor (`mn > 45`) — the floor
   that exists so JPEG noise in dark art is not punched full of holes
   (`ART_PIPELINE.md` trap 14). So it keys as an opaque maroon smear beside the
   object. Lowering the floor re-opens trap 14; **the fix belongs in the
   prompt**.
2. **"No shadow" is the wrong instruction** — a model can honour it and still
   stand the object on something, and a thing that stands has a contact patch.
   Say the load-bearing thing instead: *the object is cut out and floating, and
   the magenta continues behind and underneath it*. That removes the ground,
   rather than removing the shadow the ground implies. Two pieces needed a
   second roll purely because the first fix aimed at the shadow.

A third, smaller: **a white object on a magenta backing picks up bounce**, and
despill (which fires on any `g < min(r,b)` lean) then eats its pale side. The
palette is chalky and slightly warm anyway, so tinting off the white point
costs nothing and takes the problem with it — `slabtower-foam` is putty grey
for that reason, not by taste.

## Not in the library on purpose
- `craft/pieces/G-*.jpg`, `craft/earth/E-tear.jpg` — compositor internals
  (grade strips), consumed by `tools/build-layers.mjs`, not placeable pieces.
- `bots/`, `pickups/`, `title/` — cast, collectables and UI: they go through
  the 3D/manifest seams, not the layer library.
- `craft/pipeworks/` — World 2's pool, parked until level 4.
