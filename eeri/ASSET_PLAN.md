# EERI — the asset plan

> **READ `PHASING.md` FIRST.** It is newer owner direction (2026-08-14) and
> **supersedes this file where they disagree** — the 80/20 reference ratio
> (Crafted World is the default answer, Tropical Freeze is the seasoning),
> the tool-reality table, and the phase gates. This file remains canon for
> everything it does not contradict.

**What is still needed, what route each thing takes, and what it costs.**
Derived from what the design docs already commit to — `ART_BRIEF.md` §5 (cast
list v1), §5.1 (manipulable pieces), §3.5 (per-world re-dress) and `SITES` in
`js/level.js` — not from a wishlist. Where the brief marks something
`[ASSUME — design's call]` it is marked here too.

Method is `/ART_PIPELINE.md`. Target and the 80/20 split is `/ART_TARGET.md`.

---

## The rule that sorts this list

**If it does not move in depth, rotate, articulate or cross the camera, it is
2D.** Everything below is sorted by that test first and by priority second,
because it is what decides the route and therefore the cost.

And the cost asymmetry is the headline:

| | route | credits |
|---|---|---|
| **2D environment (~80% of the screen)** | nano concept → `cutout` → `build-layers` | **0** |
| **3D cast and movers (~20%)** | nano T-pose → Meshy mesh → rig/slice → clips | **30–45 each** |

Nano concepts are free and compositing is local, so **the 80% of the screen
costs nothing but iterations**. Spend credits only on things that move.

---

## 0. LIVE DESIGN INPUT — re-read before picking work

**Design is a moving document and it adds art needs.** As of 2026-08-13 the
design instance's branch `claude/eeri-platformer-instance-2un2bg` carries an
undeployed **v6 — "the parts kit, rooms that are proven finishable, and the
crane"**, which lands three code placeholders with seams already open and
therefore three art jobs that were "future" in this plan an hour ago:

| new | where | node/state contract | plan move |
|---|---|---|---|
| **wrecking crane** | `js/crane.js` | `house boom arm ball tracks wheels seat step beacon` — the excavator's contract exactly, so a GLB drops in behind the same check and the same `paint` map | **M5 promoted: future → needed** |
| **brick wall** | `Wall` in `js/pieces.js` | `state0` intact · `state1` cracked · `state2` rubble | **§3 `wall` promoted: not built → needed** |
| **robots + steam vent** | `js/robots.js` (`Robot`, `SteamVent`) | small patrolling hazard, and a vent with a lit collar | **NEW — not in cast list v1 at all** |

The crane is also a *design reversal worth knowing*: the brief had it as a
hazard boss, and the owner moved it to a rideable — "the ball that swings at
you unmanned is the ball you swing at the wall once the cab is yours". Its
concept must therefore satisfy §1.2's unmanned tell (empty seat, beacon)
like every other rideable, not just read as a threat.

**The robots are the interesting gap.** Cast list v1 has no small enemies at
all, so there is no style rule for them yet. Before generating: they are
*small*, they are seen at ~32 px, and by §3.7 each needs one exaggerated
feature. That is a design conversation, not an art guess.

> **Read this section against the design branch before starting anything.**
> The whole reason it exists is that this plan was written from `ART_BRIEF`
> alone and was a day stale on the day it was written.

---

## 1. Done

| asset | route | state |
|---|---|---|
| Eeri | nano T-pose → mesh → **Meshy auto-rig** → 5 clips → `packchar` | live, 41 cr |
| excavator | mesh → hand-rig, `paint` map | live |
| groundworks ×5 layers | nano craft → composite | live, crafted register (v7) |
| playfield card grain | nano tile → `detailmap` → seam | live (v8) |

---

## 2. The cast — five machines still owed (3D, they all articulate)

`ART_BRIEF` §5 cast list v1: **dump truck · cement mixer · roller · tower
crane (set-piece) · wrecking-ball crane (hazard boss)**. All 3D without
argument — every one is ridden or articulates.

Route per machine: nano concept (side-on, flat toy paint, the machine style
block) → `image-to-3d --raw --lowpoly` → **`slice.mjs`** (Meshy's rigger is
humanoid-only, so machines are hand-cut) → `paint` map in the manifest.
**~30 credits each, ~150 for the set.**

| # | machine | articulated nodes needed | one exaggerated feature (§3.7 silhouette rule) |
|---|---|---|---|
| M1 | dump truck | `bed` (tips at the rear axle), `wheels` | the bed |
| M2 | cement mixer | `drum` (spins on its inclined axis), `chute`, `wheels` | the drum |
| M3 | roller | `drum` front (rolls), `wheels` rear | the drum-nose |
| M4 | tower crane | `slew`, `jib`, `trolley`, `hook` (a 4-deep chain) | hook and height |
| M5 | wrecking-ball crane | `slew`, `jib`, `cable`, `ball` | the ball's arc |

**Every one also ships `seat`, `step` and `beacon`** (§1.2) — the amber lamp
as its own mesh so the game can light, turn and kill it, and a seat readable
as *empty* from the side at 32 px. That is the unmanned tell and it is not
optional on a rideable.

Two traps this list will hit, both already in the pipeline's index:
- **`seat` is where Eeri's FEET go**, roughly a body-height below the cushion,
  and it may sit off-centre in z. The mount arc has to interpolate into that z.
- **A wheel is a circle** — cut it with a plane and it comes out sawn in half.
  M3's roller drum and M1/M2's wheels all need circular cut tests.

M4 and M5 are the two that most repay the 3D budget: they are big, they
articulate through a long chain, and a crane traversing a load is exactly the
"background layers where things *happen*" that buys Tropical Freeze's depth
for one asset.

---

## 3. Manipulable world pieces (3D — they are lifted, carried, broken)

`ART_BRIEF` §5.1. Each ships **all its states in one GLB** as sibling nodes
`state0/state1/state2`, sharing an origin so they register against each other;
anything carried also needs a `grip` node.

| piece | states | state | note |
|---|---|---|---|
| `bank` | full · half · dug flat | code placeholder, live in play | works; mesh only if the cut face needs more than code gives |
| `girder` | stacked · slung · seated as a span | code placeholder, live in play | `grip` required; the span is walked on, so its top is flat and 1 tile deep |
| `wall` | intact · cracked · rubble | **not built** | rubble is a different silhouette, not a shorter wall |
| `load` | grounded · slung · placed | **not built** | `grip` required |

**These are the best case the slicer has**: three sibling states are a cut
table with no joints and no rest rotations — the easiest thing in the tool.
~30 cr each, and `wall` is the one the design actually needs next (it is the
demolition world's lock).

---

## 4. Worlds 2–4 (2D — this is the 80%, and it is nearly free)

`ART_BRIEF` §3.5: **groundworks · scaffold heights · demolition ·
night-shift** — flagged `[ASSUME — world list is design's call]`, so treat
the last three as proposals until design confirms.

Per world: **five crafted layer concepts + one detail map, 0 credits**, using
the style block in `art-src/craft/README.md` verbatim. Then `build-layers.mjs`
with the same rects, and a palette set in `palette.js` the way
`gameoflife/palette.js` does biomes.

| world | what changes | what stays |
|---|---|---|
| scaffold heights | vertical kit — standards, lift planks, ladders; the skyline drops BELOW you | grammar, rects, tint ladder |
| demolition | broken card, torn edges, exposed fluting everywhere, dust ochres | as above |
| night-shift | **a repaint, not a lighting rig** (§3.5, explicitly) — deep blues, work-lamp pools painted in | as above |

Each world also wants **one silhouette-defining hero piece** so a repaint does
not read as a repaint — and per `ART_TARGET` rung 6 the acceptance test is
that a stranger can name the world *and the material* from a cropped shot.

Also cheap and worth doing per world: **more detail maps** via
`detailmap.mjs` — a torn-card map for demolition, a plank/ply map for
scaffold. Free, and it is what stops every world's playfield sharing one
grain.

---

## 5. The foreground lane, per world (2D, 0 cr)

`fore` is built for groundworks only. Every world needs its own, to the v4
fore contract: pieces **cropped by the frame**, near-silhouette, one cluster
per ~96 world units so the crop is an event and not a wall. Graded hard to
dark umber by the compositor — the generator bakes magenta bounce into dark
surfaces and no edge treatment reaches it.

---

## 6. Not on the list, deliberately

- **Static props in 3D.** A pipe stack that never moves gains nothing at these
  camera angles and costs 30 credits, a rig, a node contract and a load. It is
  2D. This is the single most likely way to waste the budget.
- **The sky.** Code-drawn gradient, clouds and sun. §4 says it stays that way:
  it is the backdrop, not a kit piece.
- **Re-generating anything that can be instanced or retextured.** A kit piece
  is generated once and placed a hundred times; a world is a **Retexture**,
  not new meshes.

---

## 7. Suggested order

1. **`wall`** — the demolition lock, and the easiest thing the slicer does.
2. **M1 dump truck** — second rideable, proves the machine route repeats
   cheaply now that the excavator has paid for the pattern.
3. **World 2 layer set** — 0 credits, biggest visible change per effort, and
   it proves the crafted style block travels to a second theme.
4. **M4/M5 cranes** — the set-piece and the boss; the largest depth payoff.
5. **M2/M3 mixer and roller**, `load`, worlds 3–4.

Rough spend for all of it: **~210 credits** for eight 3D assets, and **zero**
for three complete worlds of 2D environment. That ratio is the 80/20 rule
paying for itself.

**Budget: 1,911 credits remaining** (2026-08-13). The whole plan above is
about 11% of it, so cost is not the constraint on this game's art — iteration
count is. Spend the headroom on re-rolls and LOOK passes, not on meshing
things that should be painted.

---

## Note back from integration (2026-08-15): the portrait plate's controls

`padplate_v1.png` is mounted and shipping, and the DMG face reads
beautifully. One measured problem for a re-roll whenever the plate is next
touched: **its controls are drawn too small relative to the face for a
phone.** At 390 px wide the plate is about 225 px tall, which puts the
drawn d-pad arms at roughly 20 px — so the hit zone has to be more than
twice the picture of the switch to clear DESIGN §5's 44 px floor. A d-pad
zone being larger than the drawn cross is normal; being **2× larger** means
the player's thumb and their eye disagree about where the control is.

The landscape plate does not have this problem — the arcade strip draws
its stick and buttons large, and the hit areas sit almost exactly on them.

What would fix it: the same DMG face with the d-pad, A/B and the pills
scaled up within it (less blank shell, same silhouette). The blank panel
between the d-pad and B should stay — the Toko sticker lives there now.

---

## Resolved: `ladder_v1.glb` / `scaffold_v1.glb` are NOT going to be meshes

`PHASING.md` Phase A lists them as Art items and `DESIGN.md` §8.2 gives them a
contract — *"must tile vertically without a seam. Built and playable on a code
placeholder — one tile tall, origin at its foot, the game repeats it up the
run."* Read on its own that says: make a mesh. Looked at, it says the opposite,
and the looking is what settles it.

The ladder is **already built**, twice, in `js/level.js`: once from the map's
`ladders` list and once from the `H` tile. Two stiles and a rung per tile,
through `box()`/`craftBox()` so it takes the balsa grain like every other made
thing, drawn at z +0.35–0.45 so the rungs read against the earth behind them.
Every clause of the contract is already satisfied — one tile, origin at the
foot, repeated up the run, a rung every tile — and it satisfies the hard one,
**seamless tiling, BY CONSTRUCTION**: it is generated per tile, so there is no
seam to hide.

A Meshy mesh cannot do that. An image-to-3D result has no reason for its top
cross-section to match its bottom, and nothing in the pipeline can make it —
so a ladder tile would arrive with a visible joint every 1.0 units, which is
the one defect the contract names. Buying that with 30 credits and a slice
table would be paying to make the asset worse.

This is the tool-reality table's own routing rule reaching one step further.
It already says *deformation → code*; a **repeating modular tile is code** for
exactly the same reason — it is defined by a rule rather than by a shape, and
a generated shape cannot hold a rule.

**What IS open here is the LOOK, not the format.** The tiles are `box()`
primitives in `mat.steel` and `mat.girder`. If a scaffold pass is wanted, it
belongs in the material and the profile, and `js/level.js` is Design/Level's
file — so that is a coordinated change, not an art drop. Nothing is blocked on
a file that does not exist.

---

## The audit, and the number that should stop the art queue

`node art-src/tools/audit-assets.mjs`

**31/31 shipped files keep their contract. 18 of them cannot be reached by the
game.**

Nothing under `js/` names them in a `getModel()`/`getPiece()` call, and that is
the whole finding: `js/robots.js` builds every enemy in code and does not
import `assets.js` at all. So every enemy mesh and every kit prop —
`boltbot`, `rollerbot`, `vacbot`, `workerbot`, `cabledrum`, `compressor`,
`gascart`, `generator`, `jackhammer`, `wheelbarrow`, the three tokens, and the
five machines with no ride yet — is a correct file answering a question nobody
asks.

**No existing gate can see this, and that is structural rather than an
oversight.** `smoke.cjs` boots the game and checks the assets the game asks
for, which is the right thing to check; an asset nothing asks for is, to that
gate, simply not there. So a mesh can be generated, cut, measured, committed
and catalogued, and be unreachable, with everything green.

### What follows for the art queue

**Making a seventh and eighth bot by retexture would add two more unreachable
files.** PHASING Phase B calls that the best asset-value-per-credit item in the
plan, and per credit it is — but the value is realised at the seam, not at the
mesh, and the seam is not there. The next credit spent on an enemy should come
after `js/robots.js` can ask for one.

That wiring is **Design/Level's** (`js/robots.js`, per the lanes table). What
the art lane owes it is exactly what this audit gives: proof that the files it
will ask for keep their contracts. They do — including all four skinned rigs
with their clips, and every sliced machine with its node set.

### And three that cannot be meshes as specified

`bank`, `girder` and `wall` are wired — `main.js` calls `getPiece` for all
three — but their placeholders are built to the ROOM's dimensions
(`buildBankModel(def.bank.rows, width)`), and `pieces.js` places the asset
without scaling it. A fixed GLB cannot serve a size the room declares. This is
the ladder finding again: **some assets are defined by a rule, and a generated
shape cannot hold a rule.** They need either a design decision (rooms
standardise on one size), a scaling seam, or to stay code-built. Until one of
those, they are not art work.

### One real defect it found

The crane's `paint` map named `hook`. That node was renamed `ball` — and
`sheave` renamed `arm` — when the crane was cut, to match the names
`js/crane.js` actually drives, but the paint map was not moved with them.
`housePaint` warns and skips an unknown name, so the ball would have kept its
Meshy texture while everything around it took the palette. Invisible to every
gate, because the crane is `placeholder` and nothing loads it yet. Fixed, and
`arm` added alongside — the excavator paints its whole chain, and a
half-painted boom is worse than an unpainted one.
