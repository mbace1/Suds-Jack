# The art target — what the references actually do, and how the pipeline gets there

**Audience: the development instance.** This says what the references actually
do, where we are against them, and the ordered work that closes the distance —
each rung with an acceptance test, so "did we get closer" is answerable rather
than arguable.

Read [`ART_PIPELINE.md`](ART_PIPELINE.md) first. This document assumes it.

---

## 0. The references, and they are a PAIR

From `eeri/ART_BRIEF.md` §1.1, owner-confirmed 2026-08-12:

| tier | reference | contributes |
|---|---|---|
| 1 — grammar | **Super Mario Bros. 3 + Mario World** | honest tile grid; the level as a **built stage** (SMB3's curtain-and-flats conceit); themed worlds re-skinning one grammar; secrets that look like the wall; the ride verb |
| 2 — presentation ★ | **Yoshi's Crafted World** | "the closest single match": a **toy diorama** visibly hand-built from craft materials, foreground/background lanes, soft friendly light — and it is a *riding* game |
| 2 — presentation ★ | **DKC: Tropical Freeze** | the canonical 2D-gameplay-in-a-3D-world: dramatic depth, camera drifting on rails, background layers where things *happen*, heavy-object weight |
| secondary | *Super Mario Bros. Wonder* | modern readability, expressive character animation, flat-graphic UI on a dimensional world |
| secondary | *LittleBigPlanet* | the depth **stack** — discrete lanes in one diorama box, materials that read as real toy stuff |

★ **is the confirmed pair, and neither half is optional.** The brief's own
formulation: *Crafted World's toy-diorama material world × Tropical Freeze's
layered dynamism, on Mario 3/World's level grammar.*

**They pull in different directions and that is the point.** Tropical Freeze
is about **structure** — depth, camera, motion, weight. Crafted World is about
**material** — what everything is visibly MADE of. A game with TF's structure
and no material identity is a competent layered platformer. A game with
Crafted World's materials and no structure is a nice-looking flat one. The
brief asks for both, so this document tracks both, and §1 and §2 below are
deliberately separate audits.

An earlier draft of this file was named for Tropical Freeze alone and never
mentioned Crafted World — which is the reference the brief calls the *closer*
match. Do not let the structural half crowd out the material half again; it is
the easier one to reason about and it will try to.

---

## 0.1 THE MIX: 80% stylised 2D, 20% 3D

**Owner's direction, 2026-08, and it decides more than anything else in this
document: the environment is stylised 2D, with 3D used sparingly for the
things that must move in depth. Roughly 80/20.**

| | share | what it covers | how it is made |
|---|---|---|---|
| **stylised 2D** | ~80% | **the environment** — every parallax layer: skyline, far, mid, near, foreground. Flat crafted cutout shapes at real z-depths. | nano concept → chroma-key cutout → composited to the layer rect → PNG. The `layers.js` seam that already ships. |
| **3D** | ~20% | **the cast** (Eeri, the machines) and **the few things that must move in depth** — a background machine working, a hero piece that rotates or collapses, a foreground occluder that crosses the camera | nano T-pose concept → Meshy → auto-rig / slice |

**This corrects the obvious wrong instinct**, which an earlier draft of this
file had: *do not rebuild the background as 3D geometry.* The flat layers are
not a placeholder for 3D — **they are the target**. They are also the half of
this project that has already worked: the five groundworks layers shipped in
v3 and survived the v6 cull that threw out both generated models, because
large flat art keeps its detail at the size it is seen.

Two consequences worth stating plainly, because they are what the ratio buys:

- **Crafted World's material identity is carried by the 2D art**, not by
  geometry. A fold, a tab, a lap joint, a cut edge showing its thickness — all
  *drawn*. That is cheaper, more controllable and more on-brief than modelling
  them, and it is what the reference actually looks like: a flat set seen from
  the front.
- **Tropical Freeze's dynamism is bought with the 20%**, and it is bought
  cheaply, because depth reads from *motion and occlusion* far more than from
  everything being solid. One 3D machine working on the far layer sells the
  whole background as real. Ten of them cost ten times as much and sell it no
  harder.

**Spend the 3D budget on things that MOVE.** A static prop gains almost
nothing from being 3D at these camera angles and costs 30 credits, a rig, a
node contract and a load. If it does not move in depth, rotate, articulate or
cross the camera, it is 2D.

---

## 1. What *Donkey Kong Country: Tropical Freeze* actually is

It matters that this is named precisely, because "make it look like DKC" is
not actionable and the thing people copy is usually the wrong half. TF is not
a beautiful 2D game. **It is a fully 3D game whose gameplay is constrained to
a plane**, and almost everything that makes it look the way it does follows
from that one decision.

Nine properties, roughly in order of how much they contribute:

1. **The background is real space, not a painting.** Levels are built across
   many depth layers, and what you see behind you will often be played later —
   in this level or a future one. The depth is *diegetic*: it is somewhere,
   not a backdrop of somewhere.
2. **The camera moves in three dimensions.** It dollies, pushes in, rolls,
   swings around barrel blasts, drops back for a set piece. A locked side-on
   camera throws away most of what the 3D geometry bought.
3. **Foreground occluders, constantly.** Things cross in front of the player
   and crop the frame. This is the cheapest depth cue in the medium and TF
   never stops using it.
4. **The playfield plane is unambiguous.** With that much depth, the player
   must never wonder what they can stand on. TF solves it with value and
   focus: the gameplay plane is the sharpest, highest-contrast band on screen
   and everything else is pushed away in value.
5. **Silhouette-first characters.** DK reads instantly against a riot of
   foliage — dark mass, strong outline, a red tie as the one saturated note.
   Enemies read by shape at a glance.
6. **Animation with mass.** Anticipation, follow-through, overlap. DK's roll
   has weight; his landing settles. Nothing snaps.
7. **Secondary motion everywhere.** Fur, tie, vines, cloth, water, dust — the
   world is never still, and almost none of it is gameplay.
8. **A palette identity per world.** Each world is instantly nameable by
   colour alone. Same grammar, different key.
9. **The level itself is a character.** It collapses, rotates, floods, freezes.
   Set pieces are staged, not decorated.

**What is out of reach and should be said out loud:** TF is a large studio's
multi-year output with bespoke art for every prop. We are not going to match
its density of unique assets. **That is fine, because density is the cheapest
of the nine and the last one anybody notices.** Properties 1–6 are structural
and are almost entirely available to us. A game with real depth, a moving
camera, foreground crops, clean plane readability and weighty animation reads
as "in the family" even with a fraction of the unique props. A game with
gorgeous props and none of the structure reads as a flat platformer with
expensive wallpaper.

---

## 1b. What *Yoshi's Crafted World* actually is

Also worth naming precisely, because "papercraft" invites a wood-grain swatch
and the reference is not a swatch. **Crafted World is a diorama you are told
was built by hand, and what does the telling is the CONSTRUCTION — folds,
tabs, laps, cut edges — not the surface.**

Under the 80/20 split that construction is **drawn**, not modelled. That is
not a compromise: the reference is a flat set seen from the front, and a
painted lap joint reads as a lap joint. What must not happen is a flat shape
with a papery texture and no visible joins — that is the swatch mistake, and
it is the one failure mode this section exists to prevent.

Seven properties:

1. **Everything is made OF something identifiable.** Not "cardboard-styled" —
   corrugated card, construction paper, foil, felt, sponge, paper cups, straws,
   tape, string. A player can name the material of any object on screen.
2. **The construction is visible and load-bearing.** Folds, tabs, slots,
   overlapping seams, the cut edge showing the corrugation, a bend where the
   card creased. **This is the whole effect** — a smooth object painted brown
   is not cardboard, and a folded one with a visible tab is, even untextured.
3. **The set is finite and you can see its edges.** It sits in a box. Flats
   end; you can see they are flats. That is a *gift* to us because SMB3's
   curtain-and-flats conceit and a construction site both want exactly this.
4. **Scale confusion is deliberate.** Household objects are terrain. A cup is
   a tower. It is charming *because* the scale is wrong.
5. **Front and back lanes.** The set has a reverse side, and it is a real
   place. LittleBigPlanet's discrete lane stack, same idea.
6. **Soft, friendly, near-shadowless light.** Broad and warm, no drama, no
   harsh contrast. It reads as a lit tabletop, not a lit world.
7. **Handmade imperfection.** Nothing is machined. Slightly off-square,
   slightly rough at the cut, a wobble in a line.

**How this maps onto EERI's own brief**, which is the reason it was chosen:
§3.3 already asks for "painted wood and pressed steel: flat fills"; the cast
is Tonka toys; the world is a construction site, which is *literally* a place
made of visible flats, girders, hoarding panels and bolted joints. **A
construction site is already a Crafted World diorama.** The material identity
is not something we bolt on — it is the subject.

---

## 2. Where EERI is against that

Honest audit, not a wishlist. **Two tables, because the two references fail
differently and averaging them hides which half is behind.**

### 2a. Against Tropical Freeze — structure

| # | property | EERI today | gap |
|---|---|---|---|
| 1 | real background space | flat planes with painted art at fixed z | **none by design** — under the 80/20 split (§0.1) flat IS the target; the gap is the ART on them, which is rung 1 |
| 2 | 3D camera | fixed 24° long lens, follows x only | **large** |
| 3 | foreground occluders | one `fore` layer, sparse, static | medium |
| 4 | plane readability | depth tint toward sky ✓ | **small — this one is already right** |
| 5 | silhouette-first cast | code-built kid, strong shapes ✓, no rim light | medium |
| 6 | animation mass | hand-keyed, snappy, no follow-through | **large — and now cheap to close** |
| 7 | secondary motion | exhaust puffs, beacon, chevrons | medium |
| 8 | per-world palette | `palette.js` is a single source ✓, one world exists | small (structurally solved) |
| 9 | level as character | the bank digs down, the gate opens ✓ | medium |

Note property 1 is scored as no gap. That is the 80/20 split talking: TF's
"the background is real space" is bought here with *motion and occlusion* from
the 20% (rung 1c), not by making the scenery solid. One working machine on the
far layer does the job.

Two more things worth noticing. **Property 4 is already solved** —
`LAYER_TINT` pushing each depth toward `SKY_PALE` is exactly the mechanism TF
uses, and it was built before anyone was aiming at TF. And **property 6, the
one with the largest gap, became the cheapest to close the day the auto-rigger
went in.** A 600-clip library of animator-authored motion is the whole of
"anticipation and follow-through" for 3 credits a clip.

### 2b. Against Crafted World — material

| # | property | EERI today | gap |
|---|---|---|---|
| 1 | made of identifiable stuff | flat palette fills; reads as *coloured*, not as *material* | **large — the biggest gap in either table** |
| 2 | visible construction | bolt-head motif on the machines ✓, nothing on the world | **large — and it is the whole effect**; drawn, per §0.1 |
| 3 | finite set, visible flats | layer planes literally ARE flats ✓ | small |
| 4 | deliberate scale play | none | medium (optional — a construction site justifies real scale) |
| 5 | front/back lanes | `LAYER_Z` stack exists ✓, back lane not playable | medium |
| 6 | soft shadowless light | hemisphere + one soft key, no harsh shadows ✓ | **none — already right** |
| 7 | handmade imperfection | everything is machine-perfect boxes | medium |

**The material half is further behind than the structural half**, and it is
the half the brief calls the closer match. That is the single most important
line in this document. Property 2 — *visible construction* — is where nearly
all of the gain is: folds, tabs, seams, cut edges, overlapping panels, bolted
plates. It is geometry and it is cheap.

Note property 6 is already correct, and property 3 is nearly free because the
layer flats are literally flats. Crafted World is not as far away as it looks;
it is just being scored on a different axis than anyone has been aiming at.

---

## 3. The ladder

Six rungs. Each is independently shippable, each visibly closes distance, and
each has an acceptance test. **Do them in order** — rung 2 is worth little
before rung 1, and rung 6 is meaningless before rung 3.

Rungs 1, 2, 4 and part of 6 serve **Tropical Freeze** (structure). Rungs 1b
and 6 serve **Crafted World** (material). Rung 3 serves both. If you find
yourself doing only the structural ones, re-read §2b.

### Rung 1 — the 2D layers become crafted art (the 80%)

**Not 3D.** The layer planes stay flat and stay 2D; what changes is that the
art on them stops being code-painted blocks and becomes Crafted-World-grade
crafted cutouts. This is the single largest visible gain available, it is the
biggest share of the screen, and the seam for it already ships.

Pipeline, per layer, per world — the one proven in v3:

    nano concept (one wide segment)  →  cutout.mjs (chroma-key to alpha)
      →  build-layers.mjs (scale by HEIGHT, tile with per-layer gap, bake tint)
      →  assets/2d/<world>/<layer>.png  →  one word to "live" in the manifest

- `LAYER_Z` / `LAYER_TINT` / `LAYER_RECTS` are the contract. Do not touch
  them; only what is painted onto each rect changes.
- Each layer is one image over its fixed world rect at **30 px/unit**, with
  the depth tint toward `SKY_PALE` already mixed in (0.58 / 0.38 / 0.20 /
  0.07 / 0).
- **Density is what kills these**, not fidelity. The v3 build butted every
  tile against the last and the near lane became a solid wall of cones that
  fought the playfield. The code placeholders were sparse *on purpose* — a
  bank at x 2, pipes at 26, a bank at 38. Near pitch ×2.6, fore ×3.4.

**Acceptance:** the full layer stack in-game, screenshotted at gameplay size,
and the player is instantly findable against every one of them. Then the same
shot with the layers hidden — if the level is no harder to read, the layers
are doing their job and not competing.

### Rung 1b — the art is visibly BUILT (the Crafted World half)

Runs with rung 1, and under the 80/20 split this is **drawn, not modelled.**
Crafted World is a flat set seen from the front; a painted lap joint reads as
a lap joint. Every layer's art must show how it was made:

- **Overlapping panels with a visible lap**, never a flush join. A hoarding is
  boards laid over each other, not a rectangle.
- **Visible fixings.** Bolt heads, plates, brackets, straps, tape. The bolt
  motif already established for the machines (§3.6) becomes the world's motif.
- **Honest cut edges.** Where a flat ends, paint its thickness — the
  corrugation, the ply, the raw steel edge. A shape with no edge is the enemy
  of this entire reference.
- **Tabs, slots and folds** where a real set would need them.
- **Deliberate imperfection.** A few degrees off square, a slightly proud
  panel, a wobble in a cut line. Machine-perfect is the wrong read.

Put it in the style block verbatim, on every environment prompt:

> visibly built from overlapping panels with bolted plates and exposed cut
> edges showing their thickness, tabs and folds at the joins, slightly rough
> and handmade, never machine-perfect

**Acceptance:** crop any 200×200 patch of a finished layer and show it alone.
A viewer should be able to say what it is made of and point at a join. If the
patch reads as "brown shape", the layer has failed — and note this test is
about *material*, which is exactly the axis §2b says we are furthest behind on.

### Rung 1c — the 20%: three-dimensional things that MOVE

The whole 3D environment budget, and it is deliberately small. Only pieces
that earn it:

- **One working machine per world on the FAR layer** — already in EERI, tinted
  by depth, running its dig loop. This one asset sells the whole background as
  real space; that is the Tropical Freeze lesson in a single object.
- **Two or three foreground occluders that cross the camera** at `LAYER_Z.FORE`
  — a girder, a swinging hook, a passing bucket. Cropped hard, dark, low
  detail. Cheapest depth cue in the medium.
- **Any hero piece that articulates**: something that rotates, collapses,
  tips, or the player rides.

Everything else in the environment is 2D. **If it does not move in depth,
rotate, articulate or cross the camera, it is 2D** — a static prop gains
almost nothing from being 3D at these camera angles and costs 30 credits, a
rig, a node contract and a load.

**Acceptance:** count the 3D draw calls in the environment. If the environment
is more than ~20% of the scene's 3D objects, something static got modelled
that should have been painted.

### Rung 2 — the camera earns its third dimension

A camera rig that dollies, pushes in and eases, driven by level-authored
volumes rather than per-frame code.

- A `CameraDirector` reading zones from the level: `{x0, x1, z, fov, lookAhead,
  pitch}`, eased between with critically-damped springs (no overshoot on a
  platformer camera).
- Push in for a tight passage; drop back and raise for a set piece; lead the
  facing direction.
- **Never move the camera during a precision jump.** TF is disciplined about
  this and it is the difference between cinematic and unplayable.

**Acceptance:** the same room, walked end to end, produces at least three
distinct compositions. And the jump-arc test: a recorded input replay that
clears every gap must still clear it with the director on.

### Rung 3 — the cast becomes animated

Every character through the auto-rigger. This is the largest visible gain per
credit in the whole document.

- Concepts in **T-pose** (`ART_PIPELINE.md` §1), mesh, `meshyrig.mjs rig`,
  then pull the clips the game's state machine needs: idle, walk, run, jump,
  land, climb, sit, hit, celebrate.
- **The game's animation layer changes shape.** Today `kid.js` sets node
  rotations per frame. A skinned character is driven by an `AnimationMixer`
  with **crossfades** between clips. Build a small `CharacterRig` wrapper
  exposing the same verbs the game already speaks (`pose('run', t, speed)`) so
  `main.js` does not learn about mixers — the asset seam's whole point is that
  game code cannot tell which it got.
- Keep the code-built placeholder working behind that seam. It is the fallback
  and it is how the gate stays honest.

**Acceptance:** `swingtest`-equivalent on the mixer — sample the clip at N
phases and assert the hand and foot positions actually differ. Then look at
six frames of the cycle side by side (`clipview.mjs`). A run that does not
counter-swing is not a run.

### Rung 4 — foreground and secondary motion

- **Occluders**: three or four foreground pieces per room, cropped hard by the
  frame, dark and low-detail. Reuse rung 1's kit at `LAYER_Z.FORE`.
- **Secondary motion**: cheap vertex wobble in a shared shader on anything
  organic or hanging; dust at footfalls and landings; a settle on every heavy
  stop. None of it is gameplay and all of it is what makes a frame feel alive.
- **Rim light on the cast only.** One cheap fresnel term in the character
  material is what keeps a silhouette readable against a busy background —
  this is how TF wins property 5, and it costs one shader chunk.

**Acceptance:** a still frame with the player standing in front of the busiest
part of the room. Squint. If the player is not instantly findable, the rim
light or the depth tint is wrong.

### Rung 5 — the back lane becomes a place

Crafted World's reverse side and LBP's lane stack: make **one** background
layer reachable — a ramp, a lift, a machine that carries you back — so the
depth the player has been looking at for four rungs turns out to be somewhere
they can stand.

This is the single strongest proof that the background is real space rather
than a painting, and after rung 1 the geometry to support it already exists.
Keep it to one lane and one authored transition; a freely traversable depth
stack is a different game.

**Acceptance:** a player can stand on the `MID` layer, look back at the `PLAY`
layer, and the depth tint resolves correctly in both directions.

### Rung 6 — worlds

Second and third worlds by **Retexture**, not by regeneration. The same
modular kit repainted per world is exactly TF's "same grammar, different key"
*and* Crafted World's "same box, different craft materials" — one built-in
serving both references at a fraction of the cost of new meshes.

- `palette.js` already centralises colour; add a per-world palette set the way
  `gameoflife/palette.js` does biome sets.
- Give each world a **material** identity as well as a colour one — this is
  the Crafted World half and it is what stops a repaint reading as a repaint.
- One new silhouette-defining piece per world.

**Acceptance:** a screenshot from each world, cropped to exclude the HUD,
correctly named by someone who has not seen them before — *and* the material
of any object in it correctly named too.

---

## 4. Standing rules for this work

1. **`ART_PIPELINE.md` governs.** A Meshy feature is always the primary
   choice; look it up before building anything.
2. **Never regenerate what you can instance or retexture.** A background kit
   is generated once and placed a hundred times.
3. **Depth is the product.** When a choice is between a prettier prop and a
   more legible depth read, take the depth. Property 1 beats property 9.
4. **The gameplay plane is sacred.** Nothing in the background may be
   mistakable for something you can stand on. When in doubt push it further
   toward the sky tint.
5. **Every asset gets rendered LARGE beside its concept before it goes live**,
   and every driven joint gets measured, not eyeballed. Both of those rules
   were bought with shipped mistakes; the trap index in `ART_PIPELINE.md` §
   lists them.
6. **The asset seam stays.** Every model must swap back to its code-built
   placeholder with a one-word manifest edit. That is what makes it safe to
   try a generated asset at all.
7. **Ship one rung at a time**, with a VERSIONS entry naming what moved and
   what it cost.
