# EERI — design plan

> **READ `PHASING.md` FIRST.** It is newer owner direction (2026-08-14) and
> **supersedes this file where they disagree** — the 80/20 reference ratio
> (Crafted World is the default answer, Tropical Freeze is the seasoning),
> the tool-reality table, and the phase gates. This file remains canon for
> everything it does not contradict.

Companion to `ART_BRIEF.md` (look) and `assets/README.md` (technical
contract). This file is **what the game does and what that costs in
assets** — the art pipeline should be able to read §6 alone and know what
to make next.

Status: plan, 2026-08-13. Rewritten on owner direction (below).

---

## 0. Owner direction, 2026-08-13 — the pivot

> *"Scrap the feral machines and focus on hazards and small enemies. It
> needs to be a fun platformer with short machine riding sequences. You
> can always add features like ladders and gizmos."*
>
> *"All the Suds Jack games are mobile friendly (on-screen controls) but
> also controller first — no mouse and keyboard type instructions."*

**The platformer is the spine. Machines are set-pieces.** Everything below
follows from that, and it supersedes the machine-as-loop plan: no feral
timer, no taming puzzle, no machine A→B tracks, no lock-and-key rooms.

This is the **Tropical Freeze shape**, which was already the locked
reference: the mine cart and Rambi are *sequences* you board for a
thrilling stretch and step off again. They are not the game. Running,
jumping and reading hazards is the game.

## 0.1 The fork is closed (2026-08-13)

The two lineages that both called themselves v6 are **reconciled into
`main`**, split by kind: code from the gameplay lineage (parts kit, room
prover, crane, robots, brick wall, camera director, the layer art and the
excavator GLB), the character and pipeline from the art lineage (the
Meshy-rigged animated Eeri, the skinned-rig seam, height-in-tiles
normalisation, ART_PIPELINE/ART_TARGET).

Build on `main`. Two regressions the graft nearly shipped are recorded in
VERSIONS.md, and the one worth repeating here: **the painted layer art was
being loaded but never requested**, because `assets.js` was imported under
two different `?v=` tokens and the instance holding the manifest was not
the instance the layers asked. There are now two gate checks for it.

---

## 1. The game

**On foot, moment to moment:** run, jump, **climb**, **stomp**, and read
what the site is doing to you. Bolts to collect. That is 80% of playtime
and it has to be good on its own — if the riding were deleted the game
should still be worth playing.

**Machine sequences, every couple of screens:** board at a marked point,
ride a short authored stretch that no amount of jumping could cross, step
off at the far end. Thirty to forty seconds. The ride is a **reward and a
change of gear**, not a puzzle.

**The scale rule that ties it together:** *big machines you ride, small
machines you dodge.* Both are Tonka × Cat, both belong to the site — the
contrast is size and intent, which is Mario's Yoshi-versus-Goomba split in
this game's own vocabulary.

## 2. Verbs

| verb | who | notes |
|---|---|---|
| run · jump | kid | apex 2.65 tiles, run-jump 4.85 across — the budget every room is proved against |
| **stomp** | kid | **new, and the biggest single gap.** Bounce off a small enemy to kill it and gain height. A platformer without a stomp is a walking simulator with gaps |
| **climb** | kid | **new.** Ladders and scaffold rungs — rooms become vertical instead of corridors |
| board / leave | kid | at authored points only, not anywhere near a machine |
| drive · dig · swing | machine | inside a ride sequence only |

Gizmos are the third source of variety and cost the least: tipping planks,
conveyor belts, hoist platforms, swinging hooks, bouncy tarpaulins.

## 3. What the site does to you

**Small enemies** — never malicious, just site machines gone wandering.
All stompable, all readable, each with one behaviour:
- **hopper** (a jackhammer on legs) — hops on a fixed rhythm; a timing test
- **roller** (a mini road roller) — trundles a span, turns at edges; a
  spacing test, too flat to stomp comfortably so you jump it
- **bucket** (a scuttling cement bucket) — sleeps, wakes when you land
  near, chases briefly; a provocation test

**Hazards** — environmental, always telegraphed before they are lethal:
steam vents, swinging loads, falling pallets, wet cement (slows, never
kills), sparking cables.

**A ride-ending hazard may never stand between a machine and its job.**
Learned the hard way: the swinging ball hung across the excavator's only
run from where it parks to the bank it has to dig, and since a hit takes
the RIDE it threw you out of the cab. It is not an absolute wall — a
steady drive can thread the swing — but it is timing-dependent, which is
worse for a six-year-old than a flat no: the same approach works
sometimes, and each failure costs the whole walk back. Hazards that
merely knock back are fine anywhere; the ride-enders belong in stretches
only the kid walks. `test/rooms.mjs` refuses the arrangement now.

**Cost of a hit:** knockback and mercy frames on foot; inside a ride, the
Yoshi rule stands — a hit ends the ride early and drops you back on foot,
so a ride is a thing you can *lose* rather than fail.

## 4. Levels — the Mario/Yoshi shape (owner direction)

> *"Levels like Yoshi or Mario — not too long, but still nice and
> challenging for kids."*

**Length: 60–90 seconds** first time through, ~40 once learned. The
current 96-tile room is right — about seven screens — so the size stays
and the *contents* change.

**One idea per level, in four beats** (the Nintendo pattern):
1. **Introduce** it alone and safe — the new gizmo with nothing else on
   screen.
2. **Vary** it — same idea, different spacing.
3. **Combine** it with something already known.
4. **Test** it once, at the level's peak.

A level that introduces two ideas is two levels.

**The ride sits at beat 3–4**, around the 60–70% mark: it is the peak, so
it must not open the level. One ride per level, maximum.

**Challenging for kids means generous, not easy:**
- Everything telegraphs. No hazard is lethal on the frame you first see it.
- **No pixel-precision jumps ever** — every gap and step is proved against
  the reach budget with margin, not to the millimetre.
- A **midway checkpoint**, Mario World's gate. Dying sends you there, not
  to the start.
- Hits knock back and cost mercy frames. Falling costs a respawn. Neither
  ends a run.
- No timer. Nothing in this game should ever hurry a six-year-old.
- Difficulty comes from **reading**, never from reflex or memorisation.

**Secrets, one per level.** A pocket off the main line holding something
worth the detour — the Mario 3 invitation, in this game's vocabulary: a
patch of hoarding that is 2% different, a ladder that goes one rung
further than it needs to.

**Collectibles, two tiers.** Bolts scattered as the breadcrumb trail that
teaches the route, plus **three hidden tokens per level** — Yoshi's
flowers, Mario's big coins — that give a reason to come back. The token
**changes by world**: toolboxes in world 1, blueprints in world 2, golden
bolts in world 3 (owner: all three, so each world gets its own).

## 4.1 Counts, locked (owner, 2026-08-13)

- **Three levels now**, and the game grows **three at a time**: 3 → 6 →
  9, aiming at **12**.
- **A world is three levels**, and a world is one backdrop set. That
  retires the "all three rooms look like one place" complaint — sharing a
  backdrop across a world is Mario 3's own rule, and it was only wrong
  before because there was no world above the levels to justify it.
  **Backdrop bill: one set per three levels. Twelve levels is four sets,
  and set one already exists.**
- **No world map** for now — one level runs into the next.
- **Infinite retries.** No lives, no game over. The checkpoint is the
  only cost of failing, and the only currency is time.
- **Knockback is the whole damage model.** Eeri is never hurt, never
  dies, has no health bar. A hit shoves him and grants mercy frames; a
  pit costs a respawn at the checkpoint. Nothing else ever happens to him.
- **Six years old.** Telegraphs and jumps do **not** have to be
  realistic, and should not be: telegraph ≥ **1.0 s** before anything can
  touch you, every jump proved with **a full tile of slack** over the
  budget, floaty over crisp wherever the two disagree. Stomp is in.

## 4.2 The twelve, and the shape of a world (owner, 2026-08-13)

**Committed to 12 levels now** — four worlds of three.

| world | place | ride machines |
|---|---|---|
| 1 | **Groundworks** | excavator + one more |
| 2 | **Pipes and water hazards** | two |
| 3 | **Forest clearing and digs** | two |
| 4 | **Evening site, under lights** | two |

**Two ride machines per world, maybe more** — so eight-plus machines is
the standing art commitment, not one per world.

**Level 1 and 2 of a world end in a flag.** It **builds itself in three
phases** as you reach it and **activates by running past it** — no button,
no stopping. A **puff of smoke** on each phase.

**Level 3 of a world is the big one** — a boss-type setup, puzzle or
enemies — and its flag is **bigger and a different colour**.

**Clocking out happens only at the end of a world**, and it is Eeri
walking out through a gate. That is the world's curtain, not the level's.

**Collectibles, settled:**
- **Bolts — `x/100`.** A hundred in a level, and the count is the level's
  completion figure.
- **Golden bolts — `3/3`,** hidden, one set per level.
- **Blueprints — one per world,** and they **unlock secret art**. That
  makes the art pipeline's own concepts the reward, which is the cheapest
  and most honest unlockable this project could have.

**Levels may go up** — ladders and scaffolds — **but always come back
down.** A level ends on the same ground it started on, so the camera never
has to leave its band for long.

**SFX only.** No music yet.

**No map.** Levels run 1 → 12 in order, and any unlocked level can be
jumped to from a menu.

**Every level has an address, and it is Mario's** (owner, 2026-08-15).
`EERI 1-1` is the first level of the first world, `1-2` the second, `2-1`
the first of world two — world and level, both 1-based, three levels to a
world exactly as §4.1 fixes. It is a URL: `/eeri/#eeri-1-2` opens that level
directly, which is what makes one shareable for a playtest.

The rules that keep it honest, all of them in `js/levelid.js`:

- **It is a NAMING layer over the flat site list, never a second list.** The
  game still runs on one index and `goSite(i + 1)` is still the whole of
  "next level"; no room knows which world it is in, because the mapping is
  arithmetic. Two lists that can disagree is the bug this project has
  already paid for more than once.
- **The address space is the whole twelve from the start.** A level is
  addressable the moment it is authored, so `#eeri-2-1` is a link somebody
  can hold before world 2 exists — it opens **1-1** rather than a black
  screen, and so does nonsense.
- **Forgiving in, canonical out.** `#eeri-1-2`, `#EERI-1-2` and `#1-2` all
  mean the same level, because the failure mode is a child or a parent
  typing it; the bar is then rewritten to the full form.
- **The HUD prints the address beside the name**, and so does the tab title,
  so what is on screen is what you can paste to somebody.
- The gizmo lab is `#lab` — addressed, and not a level.

## 4.3 What the golden bolts are for (owner approved, 2026-08-14)

§7 asked whether `3/3` bought anything and the honest answer was no — they
were a count, and a count that buys nothing is a chore with a sparkle on
it. **They build the world's building.**

The premise of this game is that Eeri is on a worksite. Twelve levels go
past and **nothing on that site ever gets finished**, which is the quiet
hole in the whole thing. So:

- A world is three levels; each level hides **three golden bolts**; a world
  therefore holds **nine**.
- **Clocking out** (§4.2 — the end of a WORLD, Eeri walking out through the
  gate) shows **the building this world was working on**, and it is
  assembled from the golden bolts you found. Nine of nine and it is
  finished and the lights go on. Four of nine and it stands there
  four-ninths built, with the gaps visible.
- **It never gates anything.** You clock out either way and the next world
  opens either way. Age six, generous (§3): the reward for finding them is
  *seeing more of the thing*, never being let past a door.
- It **comes back**. The world-1 building is still standing behind world 2
  — a finished one is a landmark on the skyline layer, an unfinished one
  is a frame. That costs the art pipeline nothing extra, because it is the
  same `skyline` layer being dressed with something the player earned.

**Why this one and not a gallery.** Blueprints already unlock secret art
(§4.2), so a second art-unlock would be the same reward twice. This one
reuses grammar the game already has — **the flag builds itself in three
phases**, and a building assembling from nine parts is that idea at world
scale — and it pays off the premise instead of decorating it.

**What it costs art** (one item per world, and the cheapest kind):

| asset | contract | note |
|---|---|---|
| `building_w1_v1.glb` … `_w4_` | **nine sibling nodes** `part0`…`part8`, shown cumulatively exactly like the flag's `phase0/1/2`; plus `lit`, a node the game shows only at 9/9 | must read at every count from 0 to 9, so the parts assemble bottom-up and no single part is load-bearing for the silhouette |
| the same building, **flat**, in that world's `skyline` layer | painted, two states: frame and finished | this is the "it comes back" half, and it is a re-dress of a layer already being painted |

**What it costs design:** the count has to persist per world rather than
per level — `goldenGot` is currently reset with the level (`main.js`), and
this needs a per-world tally that survives a retry. Infinite retries are
already the rule (§4.1), so a golden bolt found once stays found.

## 4.4 The game speaks three languages (v15.1)

House convention across this whole site, and Eeri had none until v15.1 —
which means the **Finnish six-year-old it is built for had been reading it
in English** for fourteen versions. `js/lang.js` is the pack.

- **fi / en / ja**, with **English as the per-KEY fallback**, so a
  half-finished language ships rather than not shipping.
- The tongue is **detected once** from the browser and then obeyed; a
  choice made on the title screen persists and beats detection forever.
- `<html lang>` is written before anything paints.
- **The glyphs do not translate.** ◀ ▶ ▲ ▼ Ⓐ Ⓑ are the same in all three,
  which is half the reason §5's no-key-names rule exists.

**What this means for art: no text in any asset, ever.** A painted sign, a
hoarding, a UI element with a word in it is a thing that can only be made
three times or be wrong twice. `ART_BRIEF.md` §4 already says art-text must
be locale-free; this is why. Numerals and glyphs are fine.

**The title screen** (`js/intro.js`) carries the game's one line of story,
in the player's language — owner's words, the Finnish being the source:

> **eeri** — *seikkailee työkoneiden ja robottien maailmassa*

It goes up **before** the scene builds and is awaited after it, so the name
and the story are what you read while the layer art loads. `?skip` walks
past it, which is what every test gate uses.

**Honest caveat, recorded rather than hidden:** the Japanese is written by
someone who does not speak it natively — the same position as
`toko/js/dialogue.ja.js`, which carries the same note. Treat it as a draft
until somebody reads it.

## 5. Controls — house convention, not a per-game choice

**Controller first, touch always, and prompts that name neither a key nor
a mouse.**

- Movement: d-pad **or** left stick. Jump: **A**. Action (climb, board,
  use): **B**. Nothing needs a second stick, a trigger, or a pointer.
- On-screen controls mirror exactly those: ◀ ▶ ▲ and one action button,
  44 px minimum, `pointerdown`/`touchend` — never `click`.
- The catalogue entry becomes `pad: 'native'` — Eeri reads a pad itself
  rather than having `hub/padkeys.js` synthesise key events at it.
- **Every prompt uses glyphs, never key names.** `▶ RUN · Ⓐ JUMP ·
  Ⓑ CLIMB`, never `A D — RUN · SPACE — JUMP`. Current hint strings are all
  keyboard and all wrong; they are a rewrite, not a patch.
- Keyboard keeps working. It is a fallback, and it is never what a prompt
  describes.

---

## 6. Assets this needs — for the art pipeline

Contracts, scale and orientation live in `assets/README.md`; the look is
`ART_BRIEF.md` §3.6 (Tonka × Cat) and §5.1 (manipulable pieces).

**The priority moved.** Machines are no longer the spine, so the crane and
the manipulable pieces drop below the things the player touches every
second. Small enemies and gizmos are now the top of the list.

### 6.1 Already live — do not remake
`eeri_v3.glb` (skinned; clips idle/walk/run/jump/sit) · `excavator_v1.glb`
· the `groundworks_*` layer set (v2, crafted) + `groundworks_sky_v1` ·
the four material detail maps (card / felt / balsa / flute) ·
**the button glyph set** (§6.4 — drawn in code, v15.1).

### 6.2 Needed next, in priority order

| # | asset | contract | why |
|---|---|---|---|
| 1 | `hopper_v1.glb` · `roller_v1.glb` · `bucket_v1.glb` | small (≤ 1 tile). Rigid nodes; each needs a **squash node** the game scales when stomped, and a **notice tell** — a lit eye or lamp — that fires before it acts | the moment-to-moment. Nothing is more used and nothing is missing more |
| 2 | **Eeri's new clips** on `eeri_v3.glb` | add `climb`, `stomp` (the bounce), `hurt` to the existing five | the two new verbs have no animation at all |
| 3 | **gizmo kit** — `ladder_v1.glb`, `scaffold_v1.glb`, `plank_v1.glb` (tipping), `conveyor_v1.glb`, `hook_v1.glb` | 1-tile modules that repeat; ladder and scaffold must tile vertically without a seam | verticality and variety, and the cheapest fun per asset in the whole list |
| 4 | **hazard kit** — `vent_v1.glb` (`collar` lights before it blows), `pallet_v1.glb` (falls, then a rubble state), `cement_v1.png` (a flat patch, 2D) | telegraph is the whole point of each one | carries the tension between rides |
| 5 | ~~Site 2 and Site 3 layer sets~~ **— dropped for now** | | §4.1: a world is three levels and shares one backdrop. Levels 1–3 are world 1 and `groundworks_*` already covers them. The next set is due at **level 4**, not now |
| 6 | `crane_v1.glb` | excavator's node set — `house boom stick bucket seat step wheels beacon` — ball on the stick's end | the one ride machine with no art; demoted from #1 because rides are now occasional |
| 7 | `bank_v1.glb`, `wall_v1.glb`, `girder_v1.glb` | `state0/1/2` (+ `grip` on the girder) | ride payoffs. Real, but the last thing the player looks at |

### 6.3 What §4's level shape adds

| asset | contract | note |
|---|---|---|
| `flag_v1.glb` | `phase0` `phase1` `phase2` as sibling nodes (it BUILDS in three steps), plus `pole` | one per level 1 and 2 of each world. It assembles as Eeri arrives and activates by being run past — so each phase must read at a glance, mid-run |
| `flag_big_v1.glb` | same three phases, **larger and a different colour** | the level-3 flag. It must be tellable from the small one at a distance, before you reach it |
| smoke puff | 2D sprite sheet or a scaled quad — the game already pools particles | fires once per flag phase. Three puffs per flag |
| `gate_v1.glb` | `frame` + `door` (the game opens it) | **end of a WORLD only**, not a level — Eeri clocks out and walks through |
| `token_toolbox_v1.glb` · `token_blueprint_v1.glb` · `token_bolt_v1.glb` | ≤ 1 tile, **unmistakably not a bolt** at 32 px — different silhouette, not just bigger | golden bolts are 3 per level and hidden; blueprints are **1 per world** and unlock secret art, so the blueprint wants to look like a thing worth framing |
| **backdrops must not visibly repeat** over 96 tiles | already the spec'd rect width, but the *painting* has to carry seven screens without a recognisable tile | the one thing that makes a level feel long or short regardless of its actual size |
| gizmo kit variety (§6.2 #3) | | "one idea per level" means the kit IS the level count — twelve levels needs roughly twelve ideas, so breadth here beats polish |

**Backdrop count, settled (§4.1–4.2):** one set per **world of three
levels**. Four worlds = **four sets**. Set one (`groundworks_*`) exists.
The next three are **pipes/water**, **forest clearing**, and **evening
site under lights** — and the evening set is the one to think hardest
about, because lit windows and lamp pools are the only place in this game
where light is drawn rather than painted flat.

**Ride machines: eight or more** (§4.2), two per world, and each one is a
full `assets/README.md` node contract with `seat`, `step` and `beacon`.
The excavator and the crane are one and two; the **skidder** (World 3) and
the **loader** (World 4) are three and four as of v15.28, built as code
placeholders against the excavator's node contract. Worlds 2–4 want four
more.
Candidates that fit the theme and bring a *different verb*: a dump truck
you ride in the bed of, a pipe-layer, a roller, a cherry-picker that
lifts, an amphibious dredger for the water world, a floodlight rig for the
evening one.

### 6.3.1 To the art lane, from a wiring pass — measured 2026-08-20

Written after wiring Worlds 3 and 4 their own machines, because what the
wiring found is the art lane's to act on and none of it is guesswork — every
line below was measured by flipping assets `live` and reading what the seam
said.

**The headline: the art is not missing, it is switched off.** Twenty-five
model entries, twenty-five files on disk, and **twenty-two say
`status: "placeholder"`** — so the game builds the code version and never
fetches the file. That is the audit's "18 unreachable" restated from the
other side: it is not that the meshes fail, it is that nothing asks for
them.

**What happens if you just flip them.** All twenty-one were set `live` and
the game walked through eleven levels. **No contract warnings at all** — the
node checks pass on every one. Five were then actually fetched
(`crane`, `boltbot`, `hopper`, `bucket`, `rollerbot`); the other sixteen
were never requested by any code path, so `live` changes nothing for them.

Three things follow, in the order they are worth your credits:

1. **`crane_v1.glb` cannot be flipped live as it stands, and it is the
   excavator_v2 trap again.** Its node names all match, so the seam accepts
   it — and then the machine renders about a third of its intended size with
   the wrecking ball hanging in open air away from the arm. The nodes are
   right and the **offsets and scale are not**: `crane.js` swings `ball` off
   `arm` off `boom` off `house` at the placeholder's distances. Compare the
   two frames — the code crane is a readable yellow machine with a big ball;
   the live one is a small blob under a detached rope. **What it needs:** the
   same treatment `excavator_v1` got — built to the placeholder's pivots,
   rest pose and overall size, so game code cannot tell which it got.

2. **The small robots load and render, and at gameplay scale they read as
   brown blobs.** `boltbot`/`hopper`/`bucket`/`rollerbot` all fetch and
   animate through `robots.js` now (PR #291 did that half). Side by side with
   the placeholder, the mesh has more detail and **less read**: the
   placeholder is `PAL.MACHINE` orange, which is the cast's family colour,
   and the mesh is a mid-brown that sits on top of pipe stacks and dirt bands
   of almost the same value. An enemy a six-year-old cannot pick out of the
   scenery is a worse enemy than a box. **What it needs:** the family colour
   carried into the mesh, or a rim/edge that survives at ~40 px tall — the
   same problem the kid had before his INK outline in v15.25, and the same
   fix is available.

3. **Sixteen props are unreachable because nothing PLACES them, not because
   anything is wrong with them** — `dumptruck`, `forklift`, `cherrypicker`,
   `pipelayer`, `floodlight`, `workerbot`, `vacbot`, `jackhammer`,
   `generator`, `compressor`, `wheelbarrow`, `cabledrum`, `gascart` and the
   two tokens. Placing them is the **dressing layer's** job
   (`js/world2-dressing.js`, `js/world34-dressing.js`), which is art's file,
   and it is the cheapest visible-quality work left in the project: a
   worksite with a generator and a barrow standing about reads as worked-in
   in a way no backdrop can.

**And one live defect:** the World 3/4 dressing logs
`[eeri] World 3/4 dressing asset failed: forestTunnel` and
`… forestClearing` on every boot of those worlds. Two dressing assets are
being asked for and not arriving.

**Two new contracts, and they are the ones worth a mesh next** —
`skidder_v1.glb` (World 3) and `loader_v1.glb` (World 4). Both are wired,
both are in the manifest with their node lists, and both ride on code-built
placeholders today. Their `_note` in `assets/manifest.json` carries the
offsets, and the rule from item 1 applies: **keep the placeholder's pivots,
rest pose and size**, or the arm will not meet the job.

### 6.4 UI art — **the glyph set is BUILT** (v15.1)

`js/glyphs.js` ships it, drawn in code as inline SVG. **Do not remake it as
a sheet unless you are replacing it deliberately** — there is a seam for
that (`useGlyphSheet()`), but the drawn set is the default for three
reasons that are not laziness: one set has to serve a **13px hint line and
a 62px touch button**, and only a vector survives that range; it recolours
through `currentColor`, so the machine-yellow/ink pair is a CSS edit rather
than a re-export; and a glyph set that is a file drifts from the game that
uses it, which is the failure this repo keeps paying for.

The owner's direction it was built to (2026-08-14): *"those buttons can
have small pic of the action or icon of the character in motion, like old
arcades with illustrated backboards."* So a button is **not an arrow** — it
carries a picture of the thing it does, and where that thing is something
Eeri does, the picture is Eeri doing it:

| control | the picture |
|---|---|
| ◀ ▶ | Eeri running, mirrored, with a small direction tick |
| ▲ | Eeri climbing a ladder — the ladder is in the picture because "up" is climb on foot and boom-up in a cab, and the ladder says which |
| ▼ | a bucket digging |
| Ⓐ | Eeri jumping — the same pose reads as the stomp, which is the same button |
| Ⓑ | Eeri stepping up onto a machine — the one action about the MACHINE rather than about him |

**The pad layout is owner-specified** and the smoke gate asserts it: `▲`
above, `◀ ▼ ▶` below, **down in the middle** because it is the least-used
direction and the middle is hardest for a thumb to hit by accident, while
◀ ▶ keep the outside where the thumb rests. Never more than two rows — a
landscape phone is short, and a full four-way cross has been tried and
pushed the hint line into the middle of the picture.

**No key caps, no mouse icons, ever.** Still true, and now also true of the
prompts in all three languages — the gate checks every pack.

### 6.4.1 The title logo — **art's next UI item**

Owner, 2026-08-14: *"I will ask art to make a logo around the character."*
A logotype with Eeri **in** it, not beside it. The game ships a plain
code-drawn wordmark until the file lands and falls back to it if the file
404s, so this is never blocking.

Full contract in `assets/README.md`: `assets/2d/eeri_logo_v1.png`, **1120 ×
440** (2× the intro's 560px cap), mark inside the middle 90%, and it must
read against the intro's **sky-blue gradient with no box behind it** — INK
outline, MACHINE yellow fill. Flip `ui.logo.status` to `"live"`, bump the
manifest `v`, done.

The story line under it is **text, not art** (`js/lang.js`) — it is
translated into three languages and a picture of a sentence cannot be.

### 6.5 Not yet
A fourth machine. More sites than the layer sets above cover. Do not start
either until §7 is answered.

### 6.6 The four worlds, briefed for art (2026-08-14)

**§4.2 named the worlds; this briefs them.** A name is not a brief — an
artist handed "pipes and water hazards" and the five-layer contract still
does not know what goes in `far` versus `fore`, what the palette shift is,
or what water means when collision is a tile grid. That gap is why the
world-2 set had not started. `ART_BRIEF.md` §4's per-world row is still
marked `[ASSUME — world list is design's call]`; **this is that call**,
and the art lane can resolve that row from here.

**What does NOT change, ever.** Each world is the same kit re-dressed, per
ART_BRIEF §4 "Modularity" — the same layer rects, the same `PPU`, the same
`LAYER_TINT` ramp, the same tile grid underneath, the same safety-yellow
cast, the same hazard language (red + black/yellow chevron, readable in
greyscale). **A world is a re-dress and a palette shift, not a new
renderer.** The evening world in particular is a *repaint*, not a lighting
rig — §4's row says so and it stays true.

**The one rule that decides world 2, and it is a design rule not an art
one: water is PAINTED and never entered.** Eeri does not wade and does not
swim. Water is backdrop, and where it meets the playfield it is a **pit
that costs a life** — collision-identical to the holes already in `SITES`,
so `fallRespawn` and the room prover need no new concept. Swimming would
break §4.2's "a level comes back down to the ground it started on" and
would be a different game for a stretch. The world's identity is carried
by the **pipes**, which are geometry, not by the water, which is scenery.

#### The briefs

**World 1 — Groundworks** *(shipped: `groundworks_*`, the reference)*
The dug trench, the half-built frames, the card-and-felt earth section
under your feet. Every other world is judged against this one for
material density and how much air the skyline keeps.

**World 2 — Pipes and water hazards**

| layer | what is in it |
|---|---|
| `sky` | as world 1, a shade cooler and greyer — a working day after rain, not a storm |
| `skyline` | quiet, heavily hazed: a low treatment plant, tanks and a chimney. Same rule as always — crisp two-tone blocks here read as near and fight the playfield |
| `far` | the pipe yard: **stacked pipe ends seen face-on**, a wall of circles, which is the world's single strongest read and belongs at distance where repetition is an asset |
| `mid` | trench boxes and shoring, a laid main running the length of the level with its joints showing, hoarding with the world's own signage silhouette |
| `near` | the trench lip: sandbags, spoil, a pump with a hose over the edge |
| `fore` | **cropped**, per assets/README: a pipe run **crossing high**, standing verticals you pass behind, low sweeps of hose and spoil along the bottom. Nothing parked at eye level |

- **Palette shift:** EARTH ramp goes cooler and wetter (a wet-clay grey-brown);
  STEEL ramp gains one duller, greener tone for old pipework; the water
  itself is a **flat band in two tones with a hard seam**, never a gradient
  and never animated below the playfield.
- **Where water meets the playfield it is a pit.** Paint the lip so the
  hazard is obvious *without* the chevron — the chevron is for things that
  hurt you where you stand, not for holes.
- **Gizmo the world owns:** the tipping `plank` over a trench.
- **What must not happen:** a wet look. This is Crafted World, and paper
  does not get wet — water is a flat cut shape, the way felt is grass.

**World 3 — Forest clearing and digs**

| layer | what is in it |
|---|---|
| `sky` | warmer, higher-key; the one world where sky shows through foliage rather than over a skyline |
| `skyline` | a treeline, not a city — a soft hazed band of canopy. The quietest skyline of the four |
| `far` | standing timber and the cut edge of the clearing: felled trunks stacked, the forest going back |
| `mid` | the dig itself — an exposed cut with roots in it, a site hut, a stack of sleepers |
| `near` | stumps, brash piles, a chainsawed log with the cut face showing |
| `fore` | **cropped**: trunks you pass behind (the best occluder in the game — a tree is naturally a narrow vertical), a low fern sweep at the bottom, a branch crossing high |

- **Palette shift:** the ACCENT GREEN family widens from one grass-lip
  green into **three** — canopy, mid foliage, ground cover — which is the
  biggest palette change of the four and the reason this world is not
  simply world 1 with trees. EARTH gains a raw root-and-peat tone.
- **The material opportunity:** foliage is the one surface in the game
  that wants **felt** at full strength rather than card. Crafted World's
  best trick is a leaf that is obviously fabric.
- **Gizmo the world owns:** the `conveyor` (a log deck), and vertical —
  this is the world to spend ladders and scaffold on, because a treeline
  gives the camera somewhere to go up into.
- **What must not happen:** a forest so busy the playfield silhouette is
  lost. Foliage lives in `far` and `fore`; `mid` and `near` stay legible.

**World 4 — Evening site, under lights**

| layer | what is in it |
|---|---|
| `sky` | the deep one: a dusk gradient as **three or four flat bands with hard seams**, darkest at the top. This is the world's whole mood and it is one image |
| `skyline` | the city with **lit windows** — small, warm, irregular, and the only place in this game where light is drawn rather than painted flat |
| `far` | tower cranes with their warning lamps, the half-built frame reading as silhouette against the sky |
| `mid` | the site under floodlight: **lamp pools painted onto the ground as flat shapes with hard edges**, not soft falloff. A pool is a shape, like everything else |
| `near` | light stands, generator, cable runs, a brazier |
| `fore` | **cropped and near-black**: this world's foreground is the strongest silhouette lane of the four, because everything behind it is bright |

- **Palette shift, and it is the big one:** every ramp drops in value and
  the whole set shifts cool, *except* the lamp pools and lit windows,
  which stay warm and become the only high-value notes on screen. Safety
  yellow now reads as the brightest thing in the world, which is exactly
  right — the cast is lit.
- **§3.4's key light does not move.** It is still upper-left; it is just
  dimmer, and the lamps are local additions painted in. **Do not** build a
  runtime lighting rig for this. §4: "night is a repaint, not a lighting
  rig."
- **Gizmo the world owns:** the `hoist`, and the hazard kit's `vent` —
  a lit collar telegraphs beautifully in the dark.
- **What must not happen:** unreadable. Age six, in a lit room, on a
  phone. Test every layer in greyscale like every other world, and the
  playfield must still read at 32 px.

#### Ride machines, one per world — APPROVED (owner, 2026-08-14)

§4.2 commits to two per world; this names **one each** — approved by the
owner on 2026-08-14, so the art queue is unblocked and PHASING's Gate B
item is closed — and defers the second until a world plays end to end.
Each is chosen for the **verb it brings**, because a second machine that
digs is not a second machine.

| world | machine | the verb it brings | why this one |
|---|---|---|---|
| 1 | **excavator** *(live)* + **crane** *(coded, art owed)* | DIG · SWING | already the game |
| 2 | **pipe-layer** (side-boom) | **LAY** — it lowers a pipe across a gap and the pipe becomes the bridge you then run over | the only machine so far that *makes geometry you keep*. Everything else removes or moves; this one builds, and a six-year-old watching a gap become a floor is the best thing a ride can do |
| 3 | **cherry-picker** (lift) | **RISE** — it carries you up and puts you on the high route | §4.2 permits a level to go up; a machine that goes up is how a world spends that permission without a new camera |
| 4 | **floodlight rig** | **AIM** — it points a lamp and what it lights becomes safe to cross | a verb no other machine has, and it is the world's identity rather than a re-skin. It also makes darkness a *puzzle* instead of a readability problem |

Node contracts are the standard `assets/README.md` set — `seat`, `step`,
`beacon`, plus the articulating nodes each one needs. **The `beacon` rule
holds in world 4 too**: lit and turning while unmanned, dark once Eeri is
aboard. In a dark world that tell is stronger, not weaker.

**Cost, stated honestly:** this is three new ride machines plus the crane
already owed, three backdrop sets of five layers each, and one palette
shift per world. It is the largest remaining art commitment in the
project, which is exactly why §4.2 capped the ride at "short sequences"
and why the gizmo kit — cheap, reusable, twelve-levels-worth of variety —
sits above it in §6.2's priority order. **Do worlds in order. Do not
start world 3's set before world 2's levels exist.**

---

## 7. Open, for the owner

**This list had gone stale, and a stale open-questions list is worse than
no list: seven of its eight items had been answered in §4.2 for a day
while this section still said "open", so an art agent reading in the
documented order — §7 last — finished the doc believing the world list
was undecided and the queue blocked.** Answered items now say so and
point at where the answer lives. Only genuinely open things stay open.

**Answered, do not re-ask:**

| was | answer | where |
|---|---|---|
| What are the four worlds? | Groundworks · Pipes and water hazards · Forest clearing and digs · Evening site under lights | §4.2, briefed for art in **§6.6** |
| Does each world end with something bigger? | Yes — **level 3 of a world is the big one**, boss-type setup, puzzle or enemies, and its flag is bigger and a different colour | §4.2 |
| What does the level's end look like? | A flag that **builds in three phases** and activates by being **run past**, a puff of smoke per phase. Clocking out through a gate is the **world's** curtain, not the level's | §4.2, shipped in `js/flag.js` |
| Do the tokens do anything? | Bolts `x/100` are the level's completion figure; **blueprints unlock secret art**, one per world; **golden bolts build the world's building** and it is shown at clock-out | §4.2, **§4.3** |
| Do levels ever go up? | Yes — ladders and scaffolds — **but a level always comes back down** and ends on the ground it started on | §4.2, shipped v11 |
| Music? | **SFX only.** No music yet | §4.2 |
| Level select? | No map. Levels run **1 → 12 in order**, and any unlocked level can be jumped to from a menu | §4.2 |

**Still open, and this is the short list:**

1. **The second ride machine per world.** (The first is settled — §6.6.) One each is proposed in §6.6 and
   is the art queue's next item; the *second* of the "two per world, maybe
   more" is deliberately deferred until a world plays end to end.
2. **Does a world's level 3 reuse its world's backdrop**, or does the big
   one get its own dress? Reusing is the cheap answer and probably right;
   it is named here so nobody assumes the expensive one.

### 7.1 Answering rate — a note for whoever holds this file

Every item above moved from "open" to "answered" without this section
being touched, because the answers arrived as owner direction and were
written into §4.2 where they belonged. **An answer landing in §4.2 must
strike its question here in the same edit.** That is the whole maintenance
rule for this section, and skipping it is what cost the art queue a day.

---

## 8. Next steps (planned 2026-08-13, after the first real playtest)

### 8.0 The gap to close first: the ride is still a puzzle, not a set-piece

§0 pivoted machines to **short authored ride sequences** — board at a
marked point, cross something unjumpable, step off, thirty to forty
seconds. What is actually built is still the older lock-and-key shape:
you walk past the machine, hit a wall you cannot jump, walk **back**,
mount, and drive twenty-three tiles at 3.4 tiles/sec to do a job.

That is a slow puzzle with a long dead drive in the middle, and it is the
single biggest thing standing between this and "a fun platformer". The
playtest found it as *"a blocker that is not possible to jump over"* —
which is what a lock feels like when the key is behind you.

**The fix, and it is a level-authoring change more than a code one:** the
machine goes **on the route, facing the obstacle**, so you board it where
you meet it and ride it *forwards* into the job. No going back. The drive
shortens to a few tiles, or the ride becomes the interesting part (the
machine carries you over the thing). Keep the fetch shape for at most one
level, late, as a deliberate puzzle — never in a teaching level.

### 8.1 Order of work

**Tier 1 — make it safe to add nine more levels**

1. **A playthrough gate.** The room prover proves a level is *reachable*;
   it cannot see whether a level is *playable*. **Built, and it earned its
   keep immediately** — it found SITE 3's four-wide pit, which sat at the
   very edge of the run budget and which the tireless bot stalled on
   repeatedly. `REACH.gap` is 3 now, a full tile of slack, as §4.1 already
   demanded.

   **Its honest limit, worth knowing before trusting it:** a bot that never
   gives up will eventually beat a level a child would put down. Restoring
   the ball-on-the-route bug, the *rule* check refuses it while the
   playthrough still finishes. So the gate also measures COST — how many
   times the level took the ride away — because "possible" and "reasonable"
   are different questions and only the rules catch the second.
2. **Re-lay the three existing levels** against §8.0.
3. **Climb and ladders.** A declared verb with nothing behind it. Cheapest
   variety in the game and the only route to vertical sections.
4. **The midway checkpoint** (§4). Locked in the design, absent from the
   build.

**Tier 2 — the on-foot game, which is 80% of playtime**

5. **The other two small enemies** — hopper and roller (§3). One enemy
   type across twelve levels is not a game.
6. **The gizmo kit** — tipping plank, conveyor, hoist. "One idea per
   level" means the kit *is* the level count.
7. **World 2, levels 4–6.** Needs backdrop set two.

**Tier 3 — the meta the design already fixed**

8. Bolts `x/100`, golden bolts `3/3` hidden, blueprints one per world.
9. Level-select menu; clock-out gate at the end of a world.

### 8.2 What Tier 1–2 needs from the art pipeline

Nothing in Tier 1 is blocked on art — it is code and level layout. Tier 2
is blocked on these, in order:

| # | asset | for |
|---|---|---|
| 1 | `hopper_v1.glb`, `roller_v1.glb` | §3's enemies — each needs a squash node and a lit notice tell |
| 2 | `ladder_v1.glb`, `scaffold_v1.glb` | must tile vertically without a seam. **Built and playable on a code placeholder** — one tile tall, origin at its foot, the game repeats it up the run. It is drawn at z +0.35, in front of the wall it is bolted to, and a rung every tile is what makes the climb readable |
| 3 | `plank_v1.glb` (tipping), `conveyor_v1.glb`, `hoist_v1.glb` | the gizmo kit |
| 4 | **world 2 backdrop set** — `pipeworks_{skyline,far,mid,near,fore}_v1.png` | levels 4–6; same rects and sizes as `groundworks` |
| 5 | `checkpoint_v1.glb` | §6.3 |
| 6 | world 1's **second ride machine** | §4.2 says two per world; world 1 has one |

Everything else in §6 stands.
