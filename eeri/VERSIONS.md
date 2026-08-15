# EERI — versions

## v15.11 — 2026-08-15 — World 2 looks like World 2, and the world's curtain works again

Wiring `#250`'s levels revealed two things that were only ever true while
three levels existed.

**THE GATE WAS UNREACHABLE.** A flag ends a level, a gate ends a WORLD
(DESIGN §4.2) — and while World 1 was the whole game those were the same
moment, so nothing had to tell them apart. The instant level 4 existed,
raising World 1's big flag auto-advanced straight into it and the gate,
the world's entire curtain, could never fire. **A gated level does not
auto-advance**: the flag goes up and you walk out yourself. And the
curtain is now a *beat* rather than an ending when there is a world behind
it — CLOCKING OUT holds, then World 2 loads.

**THE BACKDROP FOLLOWED NOTHING.** `main.js` built the diorama once at
boot with `buildLayers(scene, 'groundworks')`, so levels 4–6 played World
2 in front of World 1's site. The layer set had no teardown, because
nothing had ever needed one — six full-width planes left in the scene are
not hidden by six more, the near ones are opaque. `layers.js` gains
`dispose()` (every plane, its geometry, material and texture, plus the
background events' own meshes), and `goSite` swaps sets when a room
crosses into another world. Which world a level is in is arithmetic —
three to a world — until a world wants a name that is not its backdrop's.

**And so `pipeworks_*` goes LIVE.** Painted and parked since art lineage
v16, blocked ever since by the gate that fails a live asset nothing
fetches. Now something fetches it. Manifest `v: 25`.

**A test trap worth keeping.** The gate walked out of World 1, then
navigated back to `/eeri/?skip#eeri-1-3` to finish its World 1 checks — and
three of them failed. That URL differs from the open one only in its HASH,
so it is a same-document navigation: the page never reloaded, the run
carried on in World 2, and the checks read the wrong room while the
address bar said 1-3. Every other address check in that file carries an
`?a=N` for exactly this reason. It is not decoration.

Gates: rooms 147 / fx 31 / dev-menu 30 / **smoke 282** / playthrough 13 / hub.

## v15.10 — 2026-08-15 — World 2 has levels (PR 4 of 4)

**Levels 4, 5 and 6 — the Wet Trench, the Pipe Run, the Pumphouse.** The
world's three beats in the order `WORLD2.md` set them: water alone, then
pipes over water, then all of it plus the hoist as the world's exam. The
gizmos were each proved in the `LAB` before a level spent one, which is
what the LAB is for.

**The playthrough gate is the reason to believe it:** a bot finishes all
**six** levels now, and loses the ride zero times in each. `rooms.mjs` is
at 147 — the prover grew with the rooms rather than after them.

**What this unblocks, and it is the point:** World 2's backdrop has been
painted and parked since art lineage v16, and the `pipeworks_*` manifest
entries could not be flipped to `live` because the smoke gate fails any
live asset nothing fetches — and nothing asked for world 2. Now something
does.

**Still to wire:** `main.js` builds the diorama ONCE at boot with
`buildLayers(scene, 'groundworks')`, so levels 4–6 currently play in front
of World 1's site. The layer set has no teardown, so swapping worlds is a
real change to `layers.js` (Art lane) rather than a one-line argument.
Named here so it is not mistaken for the levels being wrong.

Gates: rooms 147 / fx 31 / dev-menu 30 / smoke 274 / **playthrough 13** / hub.

## v15.9 — 2026-08-15 — the hoist: the first solid thing that is not a tile (World 2, PR 3 of 4)

> Submitted as v15.4 — a number already spent, and four releases behind
> by the time it merged. Renumbered at the merge per LEVELCRAFT.md §7.

**The expensive item of world 2, and it is expensive for one reason.** Every
other floor in this game is a character in the grid: collision is a lookup,
meshes are built once per room, and nothing in `Player` has any concept of
standing ON something — entity contact has only ever been a one-frame
impulse (`bounce`, `struck`) after which you are airborne. A floor that
MOVES can be none of those, which is why the gizmo kit stopped at the tile
line on purpose (v14) and why this is its own release.

**`js/hoist.js`** is an entity shaped exactly like `robots.js`'s — it takes
the room's group, adds its meshes to it, answers `update(dt, reduced)`.
Everything it makes lives inside that group or it leaks on a level change.
It moves **vertically only**: a lift is what level 6 asks for, and one that
also slid sideways would have its carry arguing with the player's own run.

**The motion is a TRIANGLE, not a sine**, and that is a design decision
rather than a shortcut. You have to *wait* for a hoist, and waiting is only
fair if the arrival is predictable — a sine spends most of its time near the
ends and reads as a lift that hesitates.

**The carry is one pass in `Player.update`, after the tile pass** — so a
tile always wins, and standing on real ground is never overridden by a hoist
passing underneath. It distinguishes two cases that look the same and are
not:

- **LANDING** — falling, and the feet *crossed* the deck between frames.
  Tested as a crossing rather than an overlap, or a fast fall tunnels
  straight through a platform one tile thick.
- **RIDING** — already carried, still over it, not jumping. **This is the
  one that matters**: a rising hoist comes UP into the feet, so the crossing
  test can never fire, and without this branch the player sinks through a
  lift travelling towards them. `player.carrier` is kept across frames
  because that is the only way to tell the two apart.

**Four rules, four rooms broken on purpose** — the ladder's contract
generalised, plus one a ladder never needed: a hoist that tops out with
nowhere to step off · one whose shaft runs through solid tile · one that
carries you into a **ceiling** (a ladder is static, so if it clears once it
clears forever; a hoist is only wrong for the half of the cycle you are not
watching) · one that goes nowhere.

**And the reach model learns it**, paid on the way in rather than after the
lab complains: anything within a jump of any height the hoist passes through
is reachable. That debt is now paid three times — tarp, pipe, hoist.

`prefers-reduced-motion` **parks it at the bottom** rather than freezing it
mid-shaft, where it would be a floor nobody could reach and a level nobody
could finish. The game stays completable with the animation off.

Gates, each run singly: rooms **103/0**, smoke **265/0**, playthrough
**7/0**. The browser gate proves physics rather than a state flag: he lands
on it, it carries him up, a jump lets go, and he is never left inside a tile.

**Still open, and deliberately PR 4's:** the playthrough bot does not know
how to wait for a lift — it holds `right` every tick on foot, which walks it
off a platform. No level has a hoist yet, so nothing stalls today; it must
land with levels 4–6, which is where it can actually be exercised.

**SHARED files touched:** `js/main.js` (build, update, debug hooks).

## v15.8 — 2026-08-15 — the bucket wakes, and the dev pack gets its five rows

**A fourth enemy: the bucket.** `WORLD2.md` §3 level 5 asks for it and the
behaviour was simply absent from `robots.js`, so the beat could not be
written. It is a **proximity** test, which is the one axis the other three
do not cover — hopper is timing, roller is spacing, skitter is provocation.
An abandoned digger bucket asleep on the floor: it wakes when you **land**
beside it, lifts its head for 0.55 s without moving, chases for 2.2 s, then
settles.

Three rules make it fair rather than merely present:

- **It wakes on a LANDING, not on a radius.** Walking past a sleeping one
  is safe. A radius would teach "never go near the pipe mouth", and then
  the pipe stops being the way across, which is the whole of that beat.
  The landing edge is computed in the robot from the kid's `grounded`
  flag — main.js passes it, nothing new is invented.
- **Asleep and waking, it cannot hurt you.** Otherwise the head-lift is
  decoration: a tell you cannot act on teaches nothing.
- **It gives up.** DESIGN §4.1 has no lives and no death; a pursuer that
  never stops is a different game. The answer is always go round, or wait.

Proved in the `LAB` beside the pipe's far mouth — come out of the pipe and
it wakes, which is level 5's beat in one object. The GLB (`bucket_v1.glb`,
skinned, four clips) stays `placeholder`: `robots.js` is still code-built
for every kind, and the gate rightly fails a live asset nothing fetches.

**The dev pack gets the five rows from PR #235** (`dev/README.md` named
them): warps by fraction of the room, take-the-machine, dig-one,
invincible, hitboxes, copy-state. Four new debug hooks carry them —
`tame` `dig` `invincible` `boxes` — and `dev-menu.mjs` now names all four,
because a hook the pack reads and nothing else does is exactly the silent
break that gate exists for. Two notes on how they are built: invincibility
is an **unexpiring mercy timer** rather than a second path through damage
(a debugging aid must not change the thing being debugged), and the hitbox
preview draws `debug.boxes()` — the numbers the collisions actually use,
not a guess at them.

**Not done, and correctly blocked:** flipping World 2's `pipeworks_*`
layers to `live`. All five PNGs are on disk and the sixth reuses the
groundworks sky, but the smoke gate fails any live asset nothing fetches
and no room asks for world 2 yet. That flip belongs to the level lane's
PR 3, in the same change as the first World 2 room.

**A flake, recorded rather than buried:** *"holding the bucket in the stack
slings the girder on"* failed on one run of `smoke.cjs` and passed on the
next two against the same tree. It is wall-clock sensitive under sandbox
load. It should be re-cut to judge game state, like the rest of that gate.

Gates: 99 / 31 / 30 / **269** / 7 / hub.

## v15.7 — 2026-08-15 — he turns around, and the d-pad becomes a stick

**He was moon-walking, and it is the +z/+x confusion for the third time.**
Running left played the run clip on a body still pointed screen-right.
`pose()` mirrors the facing with `π − θ`, which is correct for the
**code-built** kid — he is modelled facing +x, and `π − θ` sends +x to −x.
It is wrong for the **skinned** rig, which is modelled facing +z: a
rotation of θ about Y sends +z to `(sin θ, 0, cos θ)`, and
`sin(π − θ) = sin θ`, so his x component never changes sign. For a
+z-forward rig the mirror is simply **−θ**, which lands him screen-left
with the same tip toward the camera. One line, and the third symptom of
the same root: the first two were facing the camera while running and
sitting backwards in the cab.

**The d-pad is a stick** (owner: *"the d-pad part should be a larger
on-screen stick like in other games in this repo"*). Every other cabinet
here that takes a thumb reads a stick, and the reason is mechanical:
four rectangles have three seams, and a thumb that drifts onto a seam
stops steering with nothing to feel. `input.bindStick()` is one zone with
a generous deadzone, direction measured from the control's **centre**
rather than from where the thumb landed — a self-centring stick would walk
away from the drawn d-pad within a few presses — plus a knob that follows
the thumb, since the painted cross cannot move. The four zones stay in the
DOM for the keyboard, the accessible names and the unplated fallback, and
go **pointer-inert**; the gate checks that second half, because a live
button sitting on top of the stick would swallow every press and the stick
would look mounted while doing nothing.

**The plate is measured now, not judged.** `padplate_v1.png` is 1024 × 590
and the drawn plate inside it runs x 122…1022, y 75…588 with its yellow
strip ending at y 121. Two owner complaints fall straight out of those
numbers: the plate's centre is x **572** against the image's 512, so drawn
full-width it sits ~6% RIGHT of centre; and the old 496-row crop left 27
rows of yellow behind. So the image box is deliberately **wider than the
screen and pushed left** (`left: -11%; right: 1.8%`, crop `1024/466`) —
the plate lands at 96% of the viewport, centred, with no yellow. A and B
grow to 14% × 24%, being the two controls a six-year-old hits under
pressure.

Gates: 99 / 31 / 30 / **269** / 7 / hub.

## v15.6 — 2026-08-15 — water, the pipe, and the pump verb (World 2, PR 2 of 4)

> Submitted by the level lane as v15.3. That number was already spent by
> the levels PR before it, and 15.4/15.5 shipped while this was open — so
> it lands as **15.6**. The lesson is in `LEVELCRAFT.md`: a number is
> claimed at MERGE, not at authoring.
> **VERSIONS ARE DECIMAL from v15 (2026-08-14).** `vMAJOR.MINOR` — the
> integer is a milestone, the decimal an increment on it. Three lineages of
> this project each burned whole integers on ordinary work and then collided
> on them (there were two v11s and two v13s); a minor part gives increments
> somewhere to go that is not the next milestone's number.
>
> **The `?v=` module tokens stay integers.** They are cache-busters, not
> releases — they track every module-graph change, and the release number
> tracks what shipped. `scripts/versions.mjs` reads both and emits a label
> (`"15.1"`) plus a sort key (`15001`), because one number cannot do both
> jobs: a label cannot be compared (`'15.10' < '15.9'` lexically) and a
> float cannot be displayed (`15.0` prints as `15`).


## v15.5 — 2026-08-15 — the plate is cropped, the bank says dig, the mark is a sticker

Four owner notes from one sitting, and the last of them found a bug that
had been swallowing two other things silently.

**The portrait plate is cropped and centred** (*"can be cropped a bit from
the top and should be very slightly smaller and centered on the screen
along the bottom"*). `#pad` is inset 4% either side and its box is given
the plate's ratio **minus the crop** (1024 × 496 against the image's 590),
with the image anchored to the box's bottom and the overflow clipped. The
crop takes the transparent air and a sliver of the yellow strip off the
top; the controls do not move, because `#touch` keeps the image's FULL
ratio and every hit area is a percentage of that.

**The title logo comes back.** `intro.js` asks `uiAsset('logo')` for it,
and `uiAsset` reads the manifest — which `main.js` was loading **after**
the intro. So the lookup ran against a null manifest every time, returned
null every time, and the code-drawn wordmark shipped in front of a painted
logo that was sitting right there marked `live`. The manifest is a ~2 KB
JSON read; it now happens first, and the intro awaits nothing else.

**The dirt bank asks to be dug.** Paired ▲▼ chevrons at the top of the
face and a hazard-striped board under them — on the BANK, never beside the
machine, so the affordance is on the thing the affordance is about. The
first cut put the board between the arrows and hid ▼, which is the whole
instruction.

**The Toko mark is a sticker on the pad** (*"can be on the game pad but
should look more like a sticker"*): white die-cut border, a few degrees
off square, a shadow, and parked in the plate's deliberately empty ground
— the DMG's blank panel in portrait, the arcade strip's middle in
landscape. `sign()` writes its position inline, so the rules have to
shout, and a `MutationObserver` re-parents the badge into `#touch` once
`.plated` lands so it tracks the plate art at any size.

**The trap, and it is a layer trap, not a z-index one.** The sticker did
not appear. `sign()` sets `z-index: 4` inline (deliberately, so it sits
under a game's HUD) and the plate is `z-index: 5`, so the first fix was an
`!important` 7 — and nothing changed. Nor did **9999**. `#touch` was at
`z-index: auto`, which paints the entire hit layer as a unit *below* `#pad`
— and no z-index on a child can climb out of its own parent's layer. One
line fixes it (`#touch { z-index: 6 }`), and the same line un-buries the
plated buttons' **press tint**, which had been painting under the plate
since the plates were mounted with nobody noticing, because a transparent
button and a buried tint look identical. The gate now asserts the layer
order rather than the badge's number: `z(touch) > z(pad)`.

Gates: 88 / 31 / 30 / 257 / 7 / hub.

## v15.4 — 2026-08-15 — stomp and hurt animate, and both lanes' docs land

**The two verbs finally react.** `eeri_v4` has carried `stomp` and `hurt`
since the art lane shipped it and only `climb` was wired, so the biggest
moments in the game — bouncing off a robot, taking a hit — played the run
cycle. They are **one-shots over the top of the state machine**, not
states: the kid is airborne a frame after a bounce and running again a
third of a second after a knock, so driving them through `CLIP_FOR` would
either never fire or never end. `ClipDriver.once()` owns the rig for the
clip's own length, capped (0.4s stomp, 0.55s hurt) because a clip that
outlives the moment reads as a hitch rather than a reaction.

**The first wiring of it never fired at all, and nothing would have said
so.** `main.js` resolves stomps and hits AFTER `player.update()` has drawn
the frame, so the one-frame flag was set too late for that frame's visual
and cleared at the top of the next update before it was ever read. The
game plays identically with a rig that simply never reacts — no gate, no
error, nothing. Fixed by firing at the MOMENT, from `bounce()` and
`struck()` themselves, and the smoke gate now drives both and asserts the
clip takes over **and hands the rig back**.

That release check is judged on **game time, not the wall clock**. My first
reading said the one-shot never released; it had, and the sandbox was
simply rendering at a few frames a second — this project's oldest trap,
caught here only because the probe was rewritten to ask the game.

Also in: both lanes' pending work, all documentation — the art lane's World
1 source-pool index, and the levels lane's World 2 plan with its correction
that world 2's backdrop already exists (`pipeworks_*` shipped in PR #236
and is parked as placeholder).

Gates: 256 smoke, 88 rooms, 7 playthrough, 31 fx, 30 dev-pack, hub green.

## v15.3 — 2026-08-15 — the pad plates are mounted, and the controls are drawn

PR #236 shipped both touch plates and PR #234 landed on top of it, but
nothing MOUNTED them — the art was live in the manifest and the game still
drew its own circles. Owner: *"the vertical controls is not the Gameboy
look."* Correct, and the miss was this lane's: the art lane's submission
listed mounting as our work and we went to deploy without doing it.

**Two plates, because they are two objects.** Portrait gets the Game Boy
DMG face; landscape gets the arcade control-panel strip whose middle is
deliberately empty, because in landscape the middle of the screen is the
game. The DOM buttons keep their ids and become **transparent hit areas**
over the drawn controls, so `js/input.js` binds them unchanged.

Both PNGs carry a lot of transparent air above the plate, which is what
makes a full-width image work on a short phone: the painted face is about
half the rendered height, so the landscape strip covers ~40% of a 390px
screen rather than the ~72% its 3:1 ratio suggests.

**Four things this cost, each a real bug rather than a tidy-up:**

1. **Neither plate ever displayed at first.** `#pad img` is one id plus one
   type and outranks a bare `#padP`, so `display: none` won. Specificity,
   not a typo, and invisible until measured.
2. **The signature landed on the A button again.** Its coarse-pointer inset
   of 92 was measured to clear a row of 62px circles; the plate owns the
   whole bottom strip now, so 92 sits on the drawn A. Raised to 210, which
   clears the painted face in both orientations. v6 fixed this once for
   jump — the third time it has bitten.
3. **The face buttons overlapped each other** in landscape, which means an
   ambiguous press: jumping when you meant to climb into a machine.
4. **The 44px floor and the drawn d-pad genuinely conflict.** At 390px wide
   the DMG plate is 225px tall and its d-pad arms are about 20px, so four
   zones that each clear the floor cannot also be disjoint. Adjacent zones
   are how a virtual d-pad has always worked, so the gate now allows
   overlap BETWEEN D-PAD MEMBERS ONLY and still refuses it anywhere else.
   **A note back to the art lane:** for portrait phone use the plate wants
   its controls drawn larger relative to the face — the hit zone is
   currently more than twice the picture of the switch.

The old "never more than two rows tall" check was this lane's rule for a
layout this lane drew. The arrangement is the art's now, so it is replaced
by what actually matters: the plate is mounted, and every hit area sits on
it.

If a plate 404s or is still `placeholder`, `.plated` is never set and the
drawn circles stay — the game is playable either way, same as the rest of
the seam.

Gates: 251 smoke, 88 rooms, 7 playthrough, 31 fx, 30 dev-pack, hub green.

> **VERSIONS ARE DECIMAL from v15 (2026-08-14).** `vMAJOR.MINOR` — the
> integer is a milestone, the decimal an increment on it. Three lineages of
> this project each burned whole integers on ordinary work and then collided
> on them (there were two v11s and two v13s); a minor part gives increments
> somewhere to go that is not the next milestone's number.
>
> **The `?v=` module tokens stay integers.** They are cache-busters, not
> releases — they track every module-graph change, and the release number
> tracks what shipped. `scripts/versions.mjs` reads both and emits a label
> (`"15.1"`) plus a sort key (`15001`), because one number cannot do both
> jobs: a label cannot be compared (`'15.10' < '15.9'` lexically) and a
> float cannot be displayed (`15.0` prints as `15`).


## v15.2 — 2026-08-15 — every level has an address, and falls stop teleporting

**`EERI 1-1`** (owner's direction, and it is Mario's scheme because that is
the one every parent already reads). World and level, both 1-based, three
levels to a world exactly as DESIGN §4.1 fixes it — so `1-3` closes world
one and `2-1` opens world two. It is a URL: `/eeri/#eeri-1-2` boots straight
into that room, which is what makes a level shareable for a playtest.

**It is a naming layer, not a second list.** `js/levelid.js` is pure — no
three.js, no DOM, so `test/rooms.mjs` proves the mapping in plain Node — and
the game still runs on one flat index with `goSite(i + 1)` as the whole of
"next level". No room knows which world it is in, because the mapping is
arithmetic over the index.

Four decisions:

- **The address space is the whole planned twelve from the start.** A level
  is addressable the moment it is authored, so `#eeri-2-1` is a link
  somebody can hold before world 2 is built: it opens **1-1** rather than a
  black screen, and so does nonsense.
- **Forgiving in, canonical out.** `#eeri-1-2`, `#EERI-1-2` and `#1-2` all
  mean the same level — the failure mode is a child or a parent typing it —
  and the bar is rewritten to the full form afterwards.
- **`replaceState`, never `location.hash =`.** Assigning fires `hashchange`
  back at the handler that just changed the level, and the game reloads the
  room it is already standing in. `gameoflife` documents the same trap.
- **The HUD prints the address beside the name** (`1-2 · LEVEL 2 — THE
  SCAFFOLD`) and so does the tab title.

It composes with the title screen rather than fighting it: the intro is
`?skip`-able for the gates and the address is a fragment, so `?skip#eeri-1-2`
is a level and `#eeri-1-2` alone is the title screen then that level.

### the bug, and it was live on the trunk

**Falls used a hardcoded `x = 43`.** `Player.update`'s fall handler carried a
LEVEL 2 coordinate — it sits at that room's third ladder — left behind by a
debugging session, so *every* fall in *every* level teleported the kid there,
bypassing `level.fallRespawn()`, which already existed and already did the
right thing (the near lip of whichever hole took you, else the last
checkpoint passed).

Found by the **playthrough gate**, the only one of the four that could see
it: `rooms.mjs` proves a room is reachable and cannot watch a fall, and a
human reads it as "the game put me somewhere odd". The owner's experience
analysis filed the same thing as **P0** independently. The general lesson is
new to this log: **a debug constant in shipping code outlives the debugging
session.**

### and two documents

**`LEVEL2.md`** — the worked example. Every level here is cut from one shape,
so one level is documented completely: the four beats object by object with
real coordinates, the skill ladder it sits on, the `check()` rules that bite
on it, what building it taught, and where it still falls short against the
owner's analysis. Every number is read out of the compiler, and the file
carries the snippet to regenerate them.

**`WORLD2.md`** — the grey box for Pipeworks (DESIGN §4.2). Theme, three
levels on the four-beat pattern, the art queue with the `pipeworks_*` layer
table matching the rects `smoke.cjs` measures, two machines on the
excavator's node contract, and an honest costing: water and the pipe are
cheap re-dresses, the hoist is not — every solid in this game is a tile and a
moving platform cannot be one. **Not a to-do list:** the owner's analysis
says explicitly not to prioritise more levels yet.

### the reconciliation this entry is landing through

This work was built on a branch that had assembled the three lineages
**independently of `main` doing the same thing**, because the branch was
started without the `git fetch origin main gh-pages` that CLAUDE.md's Eeri
section requires. Both trees then wrote a v12, a v14 and a v15 with different
content — a fourth lineage, and exactly the collision the decimal scheme
above was introduced to stop.

`main` won on every overlap, because `main` is the trunk: its assembly, its
`v15.1` language/title/FX pack, its decimal versioning, its `REACH.gap` of 4.
Only the work `main` did not have was carried across — the respawn fix, the
address, and the two documents — re-applied against `main`'s newer
`main.js`, `smoke.cjs` and `rooms.mjs` rather than merged, since a merge
reported 23 conflicts and would have deleted eight modules. The abandoned
branch's own `v15`/`v16` numbering is void; nothing referenced it.

## v15.1 — 2026-08-14 — three languages, a title screen, an illustrated pad, and the dev/FX pack

Four owner asks in one pass, and one of them was overdue by fourteen
versions.

**The game speaks fi / en / ja.** It had no i18n at all, which means the
Finnish six-year-old it is built for had been reading it in English the
whole time. `js/lang.js` is the pack — English is the **per-key** fallback
so a half-finished language ships rather than not shipping, the tongue is
detected once from the browser and then obeyed, a choice persists under
`eeriLang`, and `<html lang>` is written before anything paints. Every
in-play prompt moved into it; the glyphs do not translate because they are
the same in all three.

**A title screen** (`js/intro.js`), which the game did not have — it booted
straight into level 1 from a `#boot` div that said EERI and vanished, which
is a loading state, not a title. The owner's words, verbatim: **eeri /
seikkailee työkoneiden ja robottien maailmassa**. It goes up *before* the
scene build and is awaited *after* it, so the player reads the name and the
story line while three megabytes of layer art come down behind them — an
intro shown after the loading finishes costs time instead of hiding it.
`?skip` walks past it for the gates.

**The logo is behind the asset seam and art is drawing the real one.**
`manifest.json` → `ui.logo`, with a new `uiAsset()` in `assets.js` because
the layer path returns a `THREE.Texture` and a title logo is DOM, not scene.
A code-drawn wordmark ships until the file lands and comes back if it 404s.
The contract is written out in `assets/README.md`: 1120×440, middle 90% safe,
must hold against the sky-blue gradient with no box behind it.

**The pad is the owner's layout, and the buttons are pictures.**

```
      ▲
  ◀   ▼   ▶            Ⓑ   Ⓐ
```

Down sits between left and right because it is the least-used direction and
the middle is the hardest place for a thumb to hit by accident, while ◀ ▶
keep the outside where the thumb rests. Still two rows — a landscape phone
is short, and a full four-way cross has already been tried and pushed the
hint into the middle of the picture.

Each button now carries **a small picture of what it does** (owner: *"like
old arcades with illustrated backboards"*): Eeri running for ◀ ▶, climbing
a ladder for ▲, a bucket for ▼, and the two face buttons in machine yellow.
`js/glyphs.js` draws them as inline SVG rather than shipping a sheet — they
scale from a 13px hint line to a 62px button, they re-colour through
`currentColor`, and a set that is a file drifts from the game that uses it.
A painted sheet can replace them through `useGlyphSheet()`.

**The dev / FX pack** (`CLAUDE_HANDOFF.md`, `EERI_DEV_PACK.md`). Tools for
iterating on feel, built so they cannot destabilise the game:

- `dev.html` **frames `index.html` rather than copying it**, so what is
  inspected is byte-for-byte what ships. This repo has paid for the
  copy-drifts bug more than once.
- Effects fire from **polling** `window.__eeri`'s debug state and reading
  events out of the differences — zero hooks in `main.js`. Honest limits,
  both tested: a poll sees only a net change, and a level change must fire
  **nothing** (every counter resets on a new room; without that guard the
  first frame of level 2 fired a dig, a stomp and a clear at once).
- `js/fx.js` and `js/audio-fx.js` **inject** three.js and WebAudio instead
  of importing them, so `test/fx-smoke.mjs` runs the whole spec, pool and
  inference in bare node — no browser, no GPU, no audio device.
- Sound is synthesised, never sampled, and everything goes through one
  master gain. `test/dev-menu.mjs` fails on a binary audio file.
- One line was added to the game: `THREE, scene` on the `__eeri` handle. A
  particle has to be added to something.

`test/dev-menu.mjs` exists for the failure nothing else can catch: the pack
reads hooks nothing in the game depends on, so renaming one breaks the pack
and **nothing else fails** — the menu would quietly show dashes while the
effects quietly stopped.

Two of the new gate checks were wrong on their first cut and are worth
recording: one matched the *comment* in `main.js` explaining why the scene
is exported, and one asserted every prompt contains a glyph when several are
plain sentences ("CARRY IT TO THE GAP"). Both were tests of the clock rather
than of the rule.

**Documented, not just built** — the standing rule is that the art pipeline
reads `DESIGN.md` §6 alone and knows what to make next, so §6 caught up in
the same pass: the glyph set moved to §6.1 "already live, do not remake"
with the reasons it is drawn rather than a sheet, §6.4 records the owner's
illustrated-backboard direction and the pad layout the gate asserts, §6.4.1
is the title logo as art's next UI item, and **§4.4 states the three
languages and what they cost art — no text in any asset, ever**, since a
painted word can only be made three times or be wrong twice.

Gates: 77 prover, 190 smoke (up 33), 7 playthrough, 31 fx, 30 dev-pack, hub green.

## v14 — 2026-08-14 — the third lineage joins, and the number skips

**v13 is deliberately not used.** There were *three* Eeri lineages, not
two, and this is the third joining: `claude/eeri-platformer-levels-dtfh0x`
had its own v11, v12 and v13 while `main` had its own v11 and v12. Taking
either 13 would have made two different v13s. **The joined tree is v14 and
neither lineage ever wrote that number.**

**This one merged the other way round from v12, and that was the finding.**
The levels lane was *ahead* on the Design/Level core, so it became the base
rather than the graft:

| | main (v12) | levels lane | joined (v14) |
|---|---|---|---|
| room prover | 30 checks | **77** | 77 |
| smoke | 157 | 172 | **172** |
| playthrough | **7** | *absent* | 7 |

It brought the **midway checkpoint** (locked in DESIGN §4 since the first
plan and still missing here), the **gizmo kit** — belts that carry you and
tarps that throw you, with the prover refusing a belt that walks you off an
edge you did not choose and a tarp that throws you into a ceiling — the
**golden bolts** wired to the HUD, `landedOn` split out of `stompedBy` so a
roller can be landed on without being killed, `cutJump` and `justBounced`,
a flattened parts list so one helper can return several parts, and levels
with names instead of numbers.

**Three things only `main` had were grafted onto it:**

1. **The facing fix.** `SKIN_YAW` was `-PI/2` stacked on top of
   `FACE_TURN`'s `0.42pi`, which swung Eeri round to face the camera while
   running and sat him backwards in the cab. One cause, two symptoms, and
   the levels lane still carried both.
2. **The manifest could not bust its own cache** — fetched at `?v=1` while
   the manifest inside said `v: 11`. It is the one file that cannot bust
   itself: hold a stale copy and you keep the old art forever with every
   asset URL inside it still perfectly correct.
3. **`playthrough.cjs`, restored.** That branch had no playthrough gate at
   all — the gate that exists *because* the prover once passed a level
   nobody could finish. It passed on their levels unmodified, which is the
   single best evidence this merge is sound: a bot that had never seen
   their rooms finished all three and was never thrown out of a cab.

**Why it forked, and what actually fixes it.** All three lineages branched
before `CLAUDE.md` said Eeri existed, so no agent was told the project was
there, who owned which module, or that `gh-pages` is a deploy target. The
docs now say all three (`CLAUDE.md` § Eeri, both copies). The evidence it
works: the art lane branched *after* that commit and its very next commit
was "replant the art lane on main, per the new lanes rule" — it read the
lanes table and complied. This lineage branched before it, and did not.

**A merge is still not a git merge here.** `--allow-unrelated-histories`
was tried and abandoned: the levels lane descends from `gh-pages`, so
merging it drags the whole deployed site — toko-drop, toko, voxel — into
`main`. The join is scoped to `eeri/js`, `eeri/test`, `index.html` and the
manifest; `main`'s docs are kept whole.

Every module token unified at `?v=14`. The levels lineage's own log is
archived below rather than overwritten.

Gates: 77 prover, 172 smoke, 7 playthrough, hub green.

## v12 — 2026-08-14 — the two trees become one, and the docs say why

**There were two Eeris, and neither knew it.** `git merge-base
origin/main origin/gh-pages` returned *nothing*: no common ancestor. One
lineage carried the gameplay (the facing fix, glyph controls, stomp, the
building flag, ladders, the whole test suite), the other carried the art
(the craft material kit, the v2 crafted layers, a paper sky, painted
machines). **Both called themselves v11**, so nothing looked wrong from
either side, and the owner's report — "Eeri still faces the camera, the
instructions still say WASD" — was one fact wearing two hats: the live
site was the other lineage.

This is that merge, and it is a merge by KIND rather than by branch.

**How, because the how is reusable.** The art lineage's own log named its
starting point ("design v6 × crafted art"), and `main`'s v6 commit turns
out to be byte-identical to `gh-pages` in `parts.js`, `rooms.js` and
`input.js`. So there *is* a content ancestor even though there is no git
one, and every shared file could go through a real three-way merge
against it instead of being picked wholesale. Fifteen files, eleven
conflicts, and every conflict but three was an import line.

What each side kept:

- **Art wins the art**: `craft.js` and the material kit (card / felt /
  balsa / flute, greyscale maps multiplied onto palette colours), the
  crafted v2 layer set and the paper sky layer, the repainted excavator,
  `ASSET_PLAN.md`, and the `craftBox` routing through `level`, `pieces`,
  `excavator`, `crane`, `hazards`, `robots`.
- **Gameplay wins the logic**: `SKIN_YAW = 0` (he runs sideways again),
  the glyph controls, the stomp, `fallRespawn`, the ladder block, the
  three-phase flag, the re-laid levels, `test/`.
- **One graft each way.** The flag replaced the art lineage's balsa gate
  posts, so `flag.js` now builds through `craftMat`/`craftBox` — a flag
  in smooth plastic beside painted-wood machines would have been a
  regression nobody would have attributed to this merge. And the sky is a
  sixth layer, so `assets/README.md`'s size table and the gate that reads
  it both learned about it.

**The token pass is the other half.** The merge produced `assets.js?v=3`
in one module and `?v=4` in another — the exact split that has silently
unplugged the layer art twice before. Every module now carries `?v=12`,
one token, bumped together.

**And the fix that matters most is not code.** `CLAUDE.md` — the file
every agent reads first — mentioned Eeri **zero times** across 1,153
lines. That is why three lineages exist: no agent was ever told the
project was there, who owned which module, or that `gh-pages` is a deploy
target rather than a workspace. It now carries an Eeri section with the
reading order (`PHASING.md` first — it is newer owner direction and
supersedes the rest), a LANES table naming who owns what and which three
modules are shared, the branch rule, the four gates and the traps. The
`gh-pages` copy of `CLAUDE.md` — a different, older file, which is what
the art agent actually reads — got the same section plus a header saying
where it is standing, and that branch's `VERSIONS.md` got a FORK NOTICE.

A version number cannot detect a fork. The next agent to write a heading
has to read the other branch's log first, and now the docs say so.

**One more found by looking at the deployed build rather than at the
tests.** `assets.js` fetched `manifest.json?v=1` while the manifest inside
said `v: 12`. The manifest declares the cache token for every asset, so it
is the one file that cannot bust itself — a returning visitor holding the
cached copy at the old token never learns a new one exists and keeps the
old art forever, silently, with every asset URL in it still correct. The
fetch carries the manifest's own version now and the gate asserts the two
agree.

Gates: 157 smoke, 30 prover, 7 playthrough, hub green.
## v23 — 2026-08-14 — the open failure is closed: it was three bugs, all mine

v21's known-open "walking out of site 1" check is fixed. origin/main ran
green in a worktree, which pinned it to this branch, and the chase found
three stacked faults:

1. **`assets.js` threw on `rig:"prop"`** — the node loop assumed every
   non-skinned model declares `nodes`, so every pickup fell back to its code
   placeholder with only a console warning. The bolt GLB was never actually
   on screen. Props now return whole.
2. **The bolt's placeholder builder returned a bare Group** where the seam's
   contract says builder and live path return the same `{root}` shape — "so
   game code cannot tell them apart". It worked on whichever path was
   exercised that day and crashed on the other.
3. **The real killer: a hundred of a thing is a budget of its own.** The
   live bolt was Meshy raw — ~4k tris and a 1024² texture — and 100 clones
   dropped headless rendering to 6 fps, which starved the gate's 8-second
   walk-out. Remeshed (5 cr) to 500 tris, packed at 64px texture: **43 KB**,
   from 3.3 MB.

The diagnostic that settled it: bolt as placeholder → 189/0 green; bolt
live-heavy → the one red. Not flakiness, not level geometry — draw cost.

Gates: 189 smoke green on the placeholder run; final live-bolt confirmation
run below.

## v22 — 2026-08-14 — Eeri leans over his own logo, and landscape gets its arcade plank

Both from owner notes on v21, same day:

- **`logo_v2.png`** — "needs to have Eeri the character involved, coming
  towards the camera pov from top of the text box, waist up." He leans over
  the sign's top edge like a kid over a fence: body behind the plate, head
  and hands breaking above it. Built with `--ref E1-eeri-tpose` so he is the
  SAME kid as the cast model rather than a re-imagining — the ref carries
  the character, the sign is ours and is described. v1 removed.
- **`padplate_landscape_v1.png`** — "wider and thinner look, maybe more
  arcade background board feel." Not a stretch of the portrait DMG plate but
  a different object: an arcade cabinet control-panel strip, joystick ball
  far left, B/A + SELECT/START + grill far right, and the whole middle
  deliberately EMPTY — in landscape the middle of the screen is the game.

The portrait DMG plate is unchanged and now named `padplate_portrait`.
Mounting all three (title state, per-orientation plates, transparent hit
areas over the drawn controls) is Design/Level + shared-file work.

Known open from v21 stands: the walk-out-of-site-1 check still fails (188 of
189) and is still not isolated.

Gates: 188 smoke + 30 rooms, 1 known failure.

## v20 — 2026-08-14 — the pickups are 3D, and the gate learns a third rig

DESIGN §6.3's collectables. The bolt now comes through the asset seam
(`bolt_v1.glb`) instead of being two cylinders built inline, and world 1–3's
tokens exist as `token_toolbox` / `token_blueprint` / `token_bolt`.

**§6.3's real requirement is a SILHOUETTE test, not a look test** —
"unmistakably NOT a bolt at 32 px, different silhouette, not just bigger" —
so `art-src/tools/silhouette.mjs` (new) renders each one keyed, at 32 px, as
a flat black shape, which is all the player's eye actually gets. The four
read as: a blob with a hole (bolt), a winged V (golden bolt — allowed to be
a bolt because it IS the golden one, so the wings carry it), an arch with
daylight under it (toolbox), and a long diagonal (blueprint). Distinct as
pure shapes, which is the contract.

**A pickup's origin is its CENTRE.** It floats and bobs; the foot-contact
rule in assets/README governs things that stand. Shipping these base-anchored
would have hung every bolt half a tile high. `packprop.mjs` (new) takes
`--anchor center|base` and says why.

Weight: Meshy returned 3.3 MB each — a 1024² texture for something drawn
32 px wide. `packprop.mjs` re-exports at 128², which is 240–307 KB, inside
assets/README's 400 KB budget for the first time in this project. The
textures are downsized rather than stripped-and-painted because a Meshy prop
is a single `mesh_node`: a `paint` map could only give it ONE colour, and the
bolt's grey collar against the yellow is the read.

**The smoke gate learned a third kind of rig.** It knew skinned characters
(declare CLIPS) and hand-cut models (declare NODES) and failed all four
pickups, which have neither. `rig: "prop"` now declares *no moving parts* and
is asserted as such — saying it beats exempting it, because a prop that
quietly grew an animated part is still caught.

Two live bugs fixed on the way in, both from a code placeholder becoming a
real GLB: the collect fade walked `b.children`, which reaches a Group's
direct children but never the Mesh inside a loaded GLB (Group → Object3D →
Mesh), so bolts would have popped without fading; and cloned GLB materials
are shared and opaque, so one collected bolt would have faded every bolt in
the level at once.

Cross-lane, declared: `js/main.js` (shared) routes bolts through `getModel`,
and `test/smoke.cjs` gains the prop contract.

Gates: 186 smoke + 30 rooms + 7 playthrough.

## v19 — 2026-08-14 — the enemy family is three deep

DESIGN §6.2 #1 — "nothing is more used and nothing is missing more" — was
one enemy across twelve levels. Now: `hopper_v1.glb` (24 bones; idle/walk/
run/**hop** — 417 Hop_with_Arms_Raised IS the fixed-rhythm hop §3 asks for)
and `bucket_v1.glb` (22 bones; idle/walk/run/**wake** — 271, measured
head-led at 0.12 against near-still limbs, so the look-up is the telegraph
itself; then `run` chases). Both on the bolt-bot body plan, both rigged
FIRST TRY — the volume rule from v17 held twice more. Both `placeholder`
until js/robots.js consumes them.

The **roller stays a vehicle** (PHASING routing: wheels → sliced nodes,
never a rig). Its concept is in `art-src/bots/B-roller.jpg`: domed top that
reads as un-landable from across a room — §3's rule for it — with its
notice-tell lamp on a stalk. Mesh + slice is a follow-up; it needs
`slice.mjs`, not the rigger.

Costs this batch: 60 cr meshes, 12 cr clips — and **rigging billed 0** on
both (the rig charge appears to have moved into bundle pricing). Balance
1732 → all of Phase A's remaining art fits several times over.

Gates: 174 smoke + 30 rooms.

## v18 — 2026-08-14 — the two new verbs animate

DESIGN §6.2 #2, verbatim: "the two new verbs have no animation at all."
`eeri_v4.glb` fixes that with three library clips on the existing rig —
`climb` (438 Ladder_Climb_Loop, chosen over the fast/slow variants because
the game HOLDS a climb, so it has to loop), `stomp` (470 Jumping_Down, the
crouch-and-rebound), and `hurt` (178 Hit_Reaction — a plain flinch; the
library's other reactions are punches and gunshots, which have no business
in this game). 9 credits, `art-src/tools/meshyrig.mjs anim`.

The full action library with names is at docs.meshy.ai/en/api/animation-library
— found while hunting a hurt clip, and better than the rough id ranges this
repo had been navigating by.

New FILE name (eeri_v4, not a rewrite of v3) per the versioned-URL rule.
Clips measured moving in the packed file before install: climb forearm 0.22 /
leg 0.20, stomp 0.68 / 0.55, hurt 0.36 across the board — none dead.

One declared cross-lane line in js/kid.js: `CLIP_FOR.climb` pointed at
`'walk'` as a stand-in and now points at the real clip. Wiring `stomp` and
`hurt` into the state machine is real behaviour work and stays with
Design/Level — the clips are on the model waiting.

Also concepted on the rigged body plan: `B-hopper2` and `B-bucket2`
(art-src/bots/), the next two family members. Not yet meshed.

Gates: 166 smoke + 30 rooms + 7 playthrough.

## v17 — 2026-08-14 — the bolt-bot rigs, and why the first two did not

PHASING §2's highest asset-value-per-credit item: ONE Meshy-rigged biped that
the whole non-violent enemy family is re-headed and retextured from, so the
game stops being one enemy type across twelve levels. `boltbot_v1.glb` — 24
bones, feet at the origin, `idle`/`walk`/`run`, 1.1 MB. It sits in the
manifest as **placeholder** until `js/robots.js` asks for it, because the
smoke gate fails a live asset nothing fetches.

**Two rigs were rejected before this one, and the reason was not the pose.**
Both were in a strict T-pose with daylight through both armpits and between
the legs — exactly what ART_PIPELINE's T-pose rule asks for — and Meshy
answered *"Pose estimation failed, please provide a valid model"* both times.
The second attempt even had textbook human proportions: visible neck,
shoulders wider than hips, arms as long as the legs, elbows and knees halfway.
Rejected again.

The answer was in `art-src/E1-eeri-tpose.jpg`, the concept that rigged first
time months ago: **his legs merge at the hip with no daylight at all, and his
arms are barely 40° from his sides.** He breaks the stated rule and rigs
anyway. So the rule was mis-stated. What the estimator wants is **volume** — a
body it can fit a skeleton *inside*. Eeri is a solid toy with mass; both
failed bots were tubes stuck onto a box, and there is nothing inside a tube.

The fix, and the general lesson now in ART_PIPELINE: for anything non-human,
`--ref` a character that has already rigged, take its BODY PLAN, and disown
its costume in words. The third bolt-bot did that and rigged first time. Be a
robot in the faceplate and the surface, never in the construction.

Cost of learning it: 90 credits of meshes (the two failures charged 30 each;
**a failed rig charges nothing**), then 5 for the rig and 3 for the idle clip.

Verified by measurement, not by eye (`art-src/tools/botmeasure.mjs`, new):
every driven joint travels in `walk` and `run` — forearms 0.15–0.23, legs
0.12–0.16 — against an idle that is correctly near-static at 0.004–0.011. A
dead joint renders completely plausibly, so this is the only honest check.

Not done here, and deliberately: **the stomp squash is CODE, not a clip**
(PHASING §1) and `js/robots.js` is Design/Level's file. The rig ships with a
root the game can scale; the flatten-and-pop belongs to that lane.

> **A note on the numbering.** Two lineages both shipped a "v10" and a "v11":
> main's are gameplay (the machine on the route; ladders and vertical levels),
> the art lane's were the material kit and the painted machines. The art
> entries below are renumbered **v12–v16** to continue from main's v11 rather
> than collide with it. Their own text still refers to itself by the old
> numbers in places, and that is left alone — rewriting the record to look
> tidier than it was is how the traps stop being findable.

## v16 — 2026-08-14 — world 2's backdrop, built ahead of need and parked

The pipeworks layer set (DESIGN §4.1 "pipes/water") — built now because the
whole run cost ~nothing on the v14 model policy, parked because §6.2 #5 says
it is due at level 4, which does not exist yet. It ships in the manifest
under `layers.pipeworks` with status **placeholder — deliberately**: the
smoke gate fails any live asset the game never fetches (the v6 bug class,
2.7 MB shipped and never requested), and no level plays world 2 yet. Level 4
flips six words to "live" and nothing else; the seam (`buildLayers(scene, world)`) has taken a
world name since v6, so when level 4 lands it is one string in the room def.

- **28-piece pool** (`art-src/craft/pipeworks/`): waterworks skyline (water
  tower, gasometer, pump station, elevated pipeline, crane), the far water
  structures (tank tower, pipe rack, pump house, standpipe, a lattice pipe
  bridge), a mid kit of pipes at hand height (runs, a red-wheeled valve, an
  elbow, pump skid, sluice, pipe stack), wet near clutter, dark fore
  occluders, and three grade strips with standing water let into them.
- **Water is CUT PAPER** — layered blue card with scalloped torn edges and
  paper foam curls, never a rendered liquid. The near lane carries it as a
  wide strip sunk half into the grade.
- **23 of 26 concepts on base nano banana** (flash); Pro only for the three
  structural heroes. Owner's call, and the strata A/B backs it: flash results
  are equivalent outside fine lattice work.
- `build-layers.mjs` gained a **`WORLD` switch** — per-world pool + layer
  config over the same world-agnostic rects — and a per-piece **`sink`**:
  some pieces keep a sliver of white base (legit ink the key is right to
  keep), and burying the feet in the grade is cheaper and more honest than
  re-rolling for a perfect crop. P-mid-tower is borrowed from the groundworks
  pool deliberately: one shared silhouette ties the worlds to one site.
- The sky entry points at the groundworks sky — world-agnostic until a world
  needs its own (the evening set will).

Composition acceptance (full-width strips): far and mid pass cleanly; the
skyline needed the hero rate halved after three identical cranes landed in
one screen — one hero piece per pool makes the hero rate the repeat rate.

## v15 — 2026-08-14 — the ground stops being wallpaper

The owner, on v12: *"I thought it was already done."* It had been — twice. v10
gave the earth the material kit and v11 fixed the detail map's contrast, and
both were real fixes on the MATERIAL axis. Neither touched composition, which
is why ~30% of every frame was still an evenly-spaced motif marching across
136 world units between four dead-straight horizontals. Machine-perfect is the
one thing the reference is not.

- **Each stratum takes its own section at its own scale.** They shared one
  `flute` map, so four bands were four tints of one stamp.
- **The boundaries INTERLOCK instead of running straight.** Each band sends
  tongues of itself into the band below at varying widths and depths, drawn
  per solid run so a dug hole is never bridged. This replaced a first attempt
  that laid a torn-card strip along each boundary — which was worse, and
  usefully so: it turned four straight lines into four regular rows of
  identical bumps, i.e. the same failure with more ink. **A boundary wants to
  be irregular in POSITION, not dressed.** The geometry version costs no asset
  at all.
- **The face carries things you can name** — a paper-tube pipe with a tape
  band, a crushed drum, a root, broken brickwork, stone clusters, a bottle —
  keyed cutouts placed deterministically, knocked back in value so they sit in
  the earth rather than on it, and skipped where they would float over a dug
  pit. The v4 "cobbles" they replace are ninety grey dodecahedrons mixed toward
  INK on a brown face: invisible, which is why the section read as empty
  however much material was thrown at it.
- **The grass lip gets its felt fringe**, tiled at the strip's own aspect.

**A DETAIL MAP MUST TILE, WHICH MEANS IT MUST BE FEATURELESS**, and this cost
two rounds. The strata sources inherited the house craft block, which names
split pins and masking tape, so every section came back with fixings in
specific places — correct for a piece, fatal for a map, because a map repeats:
at a 3-unit repeat you could count the same brass pin forty-five times.
`detailmap.mjs` gained a **`highpass`** argument (subtract everything coarser
than a radius; the features are large and the fluting is fine, so one number
separates them). That fixed two of the four. It could not fix `packed` and
`gritty`, which are photographs of a specific card *assemblage* — the
arrangement is the subject, and no filter turns an object into a material.
Both were pulled; those bands fall back to `flute`, which is genuinely
uniform, at two densities. **The test is TILE IT 3×3 AND LOOK** — a single
patch of all four reads as convincing card, and only the 3×3 shows which two
are objects.

Also fixed: the first cut placed all 46 face cutouts between y −0.5 and −8,
which is almost entirely below the bottom of the frame — loaded, lit and
rendered where nobody would ever see one.

**Postscript — it was the prompt, not the model.** The credits came back and
the three failed sources were re-rolled against both models on the fixed
brief. All three came out right on both, which settles it: the earlier
failures were the house craft block leaking fixings into a texture, not the
generator. And **base nano banana (`gemini-2.5-flash-image`) produced the
best-tiling swatch of the four**, beating Pro — Pro put repeating white blobs
in `gritty`. Pro won `gritty` and the torn edge. So the standing rule is
**generate on flash, escalate to Pro only when a look fails**; Pro's clear
advantage is a piece with internal structure, where the subject is an object.
All four strata are live again.

Gates: 156 smoke + 29 room-prover.

## v14 — 2026-08-14 — the layers are COMPOSED, not tiled

The owner's note on v11 was that the assets were not good enough yet, and
then, looking at them: *"a lot of the backgrounds looked like it stopped
abruptly or that it's not connected to ground. generally they are flat and
need more definition or edge contrast."* Rendering a full layer strip instead
of a screenshot showed why, and it was not a material failure.

**Every layer was ONE generated segment stamped across the rect with a gap
between copies.** In one 1280px frame at x=78 you could count three identical
half-built frames at identical heights with three identical cranes above them;
across the whole strip roughly half of each layer was empty air. The segments
themselves were on target — balsa standards, split-pin bolts, corrugated cut
edges, all of it — so every previous pass had been improving the thing that
was already right.

So the unit of generation stops being a segment and becomes a **piece**, and
`build-layers.mjs` becomes a compositor:

1. **A pool, not a tile.** 36 pieces (`art-src/craft/pieces/`), each ONE object
   on magenta with no ground under it. The tool finds its ink bounds, gives it
   a world height and places it.
2. **A height profile.** Each piece carries its own world height and jitters
   around it; `hero` pieces — cranes, a lift core, a chimney stack, a tall
   scaffold — appear rarely and stand well above the run. A run of 13s with an
   occasional 21 is a skyline; thirteen 13s is a fence.
3. **A continuous grade, and feet that are buried in it.** Each ground lane
   gets a torn-card ground line tiled the full width, and then the SAME strip
   again in front at half height, so every piece is planted rather than
   standing on air. Drawn only behind, a grade is a backdrop and the cutouts
   still float — which is the "not connected to ground" read exactly.
4. **Edge contrast.** Every piece drops a hard-edged cutout shadow onto
   whatever is behind it (which is what Crafted World's flat sets actually do)
   and each lane's contrast is pushed back up before the depth tint washes it
   out.
5. **A value staircase.** The depth tint alone mixes every lane toward the
   same pale sky, which is why the old build read as one field of cream with
   the player lost in it. Each lane now steps down from the one behind it
   (1.00 / 0.92 / 0.84 / 0.78) and the hoarding — the only wide block of local
   colour in the kit — was promoted into the NEAR lane, so there is something
   behind the play lane that is neither pale nor grey.

Placement is seeded, so the same commit builds the same layers, and the tools
plus the pool ship in `art-src/` — `build-layers.mjs` rebuilds
`assets/2d/groundworks_*_v3.png` byte-for-byte from `art-src/craft/pieces/`.

**Three bugs in the chroma key, all of which had shipped.** `keylib.js` is now
the one copy, shared by the compositor and the review tools:

- **A ratio test over-keys.** Keying on `g < min(r,b) × 0.8` alone lets JPEG
  chroma noise in a dark passage punch black speckle through the middle of the
  art — it was visible all over the lift core and the dark scaffold. The
  backing is a lit sheet, so demand an absolute floor and a real separation
  too.
- **A level test under-keys.** The previous cut tested `r > 140 && b > 140 &&
  g < 110`, which is a test for BRIGHT magenta — and the model casts a SHADOW
  on the backing, around (90, 15, 90), which passes none of those thresholds.
  That shipped as a solid purple block beside a tower.
- **A keyed pixel still carries its original colour.** Canvas scaling averages
  rgb across the alpha edge, so a piece composited at half size grows a
  magenta fringe out of pixels that are supposedly invisible. Dilating the
  opaque colour a few pixels into the transparent region is the fix, and it is
  the real cause of the whole "pink on the clouds" family — no amount of
  threshold tuning reaches it. Worst residual lean across the five shipped
  layers is now 12 levels, against ~100 before.

And one that is not a bug: **the de-magenta correction is per piece, on
purpose.** The backing bounces onto everything it lights, so a balsa scaffold
comes back salmon — but `castprobe.mjs` scores the orange skip and the orange
cones just as high, because orange genuinely sits on the magenta side of the
green-magenta axis. A blanket correction would grey out the only saturated
colours in the kit. The neutrals declare a correction; the painted pieces
declare none.

The superseded `_v1` and `_v2` layer sets are removed (7 MB).

## v13 — 2026-08-13 — the machines are painted wood, and the map tool is fixed

**The excavator was still smooth plastic in a crafted world**, and chasing it
found two independent causes plus a bug in the tool that makes every map.

1. **An imported GLB carries its own UV atlas.** `craftBox`'s world-space UV
   trick is only available to geometry we build, so on a live model a
   repeating map stretched ONE copy of the brushwork across the whole
   machine. The paint path now tiles across the atlas explicitly (repeat 9),
   on a cloned texture — repeat lives on the Texture, and the cached one is
   shared with every other surface asking for balsa.
2. **The placeholder machines built boxes directly.** `excavator.js`,
   `crane.js`, `pieces.js` and `robots.js` each had a local
   `new THREE.Mesh(new THREE.BoxGeometry(...), M(c))`, which gets the shared
   material but none of the UV density. All four route through `craftBox`
   now.
3. **`detailmap.mjs` scaled contrast about the MEAN**, which preserves the
   source photo's own contrast. That is fine for corrugated card (luminance
   40…230) and useless for a white-painted board (230…250): the balsa map
   came out ±4% however high the strength went. It does a **histogram
   stretch** now — 5th to 95th percentile onto a fixed band — so a map's
   contrast is a property of the REQUEST, not of how well lit the source
   happened to be. Every material was rebuilt through it; felt and balsa
   only became visible at all after this.

The lesson generalises past this project: **normalising by mean preserves
the source's contrast; normalising by range sets it.** A tool that takes a
"strength" argument and ignores it for low-contrast inputs is worse than one
with no argument, because it looks like it is working.

Gate: 134 checks + 29 room prover.

## v12 — 2026-08-13 — a material KIT, not cardboard everywhere

**Crafted World is a kit of materials and the first pass used card for all of
it.** `js/craft.js` is now the one factory every surface is made through, and
the manifest's `textures` block is the palette: `flute` (the cut edge of
corrugated card, stacked fluting) for the earth section and every dug face,
`card` (kraft liner) for flat card, `felt` for the grass lip, `balsa`
(painted wood, brush strokes and a paint chip) for machines, girders and
props — §3.3's "painted wood and pressed steel". Each is a greyscale map
multiplied onto a palette colour, so §3.2 holds exactly.

**The ground is the headline.** It was flat brown, then card with a faint
grain, and it is now visibly a CUT THROUGH STACKED CORRUGATED CARD — which is
what a cut earth section is in this reference. The strata banding the depth
pass established still reads through it; the flute strength was pulled from
0.62 to 0.5 precisely so it would.

**Two failures worth recording.** A probe of the live scene found **3
materials mapped and about 70 not**: every module had grown its own
`const M = (c) => new MeshLambertMaterial(...)`, so the grass lip, both
machines and every prop were still flat paint while the ground behind them
was card. Patching call sites would have left the next one to be written
flat, so `craft.js` replaced all of them — 128 materials now carry their
material, and the ones that do not are the beacon lamp, shadows and glass,
which must stay bare. And the first maps were far too weak: ±20% variation,
which Lambert then flattens further. A material you have to be told is there
is not doing its job.

Also fixed: the sky's remaining magenta. **Magenta is the only thing where r
AND b both exceed g** — yellow, orange, kraft and cream all have b < g, and
cotton is neutral — so the despill needs no threshold and cannot eat a real
colour. 2.04% of pixels carried a pink cast; now 0.004%.

And the gate learned to refuse a manifest block containing a stray note: a
bare `_note` string beside the texture entries made the seam-scope check
resolve a path on `undefined` and killed the whole run with
`ERR_INVALID_ARG_TYPE` instead of naming the problem.

Gate: 134 checks + 29 in the room prover.

## v11 — 2026-08-13 — ladders, and levels that go up

`climb` was a verb DESIGN.md declared and nothing implemented. It is real
now, and it is the cheapest variety in the game: `L` is the one tile the
kid can stand INSIDE and still be held up.

The rules, chosen for a six-year-old rather than for realism: gravity is
off entirely while you are on a ladder, up and down climb at a deliberate
3.4 tiles/sec, left and right still slide you along, **letting go of up
holds you where you are** rather than sliding you down, and **jump lets
go** — so nobody has to hunt for the exact top rung to get off.

SITE 2 gets the first climb: a ladder off the floor to a high walk with
three bolts along it the ground route never reaches, then a step back down
at the far end. §4.2's rule holds — a level may go up, but it comes back
down, so the camera never has to leave its band for long.

**Two traps, both caught by the prover the moment the part existed.** A
ladder whose foot hangs in mid-air is a ladder nobody can get on, so the
check demands something solid under it. And a ladder must reach PAST the
walk it serves: the first cut stopped one rung short of the ledge, so he
climbed to the top and bumped his head on the thing he was climbing to.

Gates: 151 smoke (six new over the ladder), 30 prover, 7 playthrough.

## v10 — 2026-08-13 — the machine sits on the route, facing its job

DESIGN.md §8.0. The excavator parked at x=61 with its bank at 84, so you
walked past it, met a wall you could not jump, and had to walk
twenty-three tiles BACK to fetch it. That is the lock-and-key shape the
pivot retired, and it is what the playtest felt as an impossible blocker —
a lock feels impossible when the key is behind you.

All three levels re-laid. The machine now stands a short drive short of
its work and you ride forwards into it:

| level | before | after |
|---|---|---|
| SITE 1 | 23 tiles of driving | **7** (2.1 s) |
| SITE 2 | 18 to the stack | **5** |
| SITE 3 | 14 tiles | **6** (1.8 s) |

**And the ride-ender rule was too narrow.** It knew only about the
swinging ball — but a steam vent throws you out of the cab in exactly the
same way, and one stood at x=44 in SITE 2, squarely between the machine
and the girder stack it had to lift. Same bug, different art, completely
unflagged. The check covers every ride-ender now and caught that vent the
moment it was broadened; the vent has moved to the kid's own stretch.

Gates: 145 smoke, 30 prover, 7 playthrough, all green after the re-lay.

## v9 — 2026-08-13 — a gate that actually plays the game

`test/rooms.mjs` proves a room's *geometry*. It cannot see whether a level
is playable, and it passed one that was not. So `test/playthrough.cjs` is
a bot that FINISHES every level: it runs right, jumps when the run is
blocked or a hole is ahead, boards the machine when something in the way
needs it, uses the verb, and must reach the flag. It is deliberately dumb
— no waypoints, no level knowledge — because a bot that needs to be told
the route cannot tell you the route is broken.

**It earned its keep on the first honest run.** SITE 3's pit was four
tiles, sat at the very edge of the 4.85-tile run, and the bot — which
never gives up — stalled on it over and over. DESIGN.md §4.1 already
locked "a full tile of slack" for a six-year-old and the budget did not
enforce it: `REACH.gap` was 4. It is 3 now, and the pit is 3.

**Its honest limit, recorded so nobody over-trusts it.** A tireless bot
will eventually beat a level a child would put down. Restoring the
ball-on-the-route bug, the *rule* check refuses the arrangement while the
playthrough sails through it — the ball turns out to be timing-dependent
rather than an absolute wall, which is why v8's account of it is corrected
above. So the gate also measures **cost**: how many times a level took the
ride away. Possible and reasonable are different questions, and the static
rules are what catch the second.

Two bot bugs found on the way, both worth naming because they are the
shape of mistake this kind of harness makes: it never hopped out of the
cab (the flag only finishes on foot, so it drove past the end forever),
and it treated the girder as one action when it is two — pick it off the
stack, then carry it to the lip.

Gate: 7 checks over 3 levels, run alongside 145 smoke and 30 prover.

## v8 — 2026-08-13 — three bugs from actual play

All three came from one playtest, and two of them were one cause.

**He ran toward the camera, and sat backwards in the cab.** The skinned
rig is modelled facing +z, and `FACE_TURN` (0.42π ≈ 75.6°) already sends
+z to (0.97, 0, 0.25) — screen-right, tipped slightly toward the camera,
which is exactly the 3/4 view the game wants. The extra −90° it carried
was added on top and swung him round to face the lens. The same −90° left
him backwards while riding, because riding zeroes the turn and he was then
facing +z on the nose. `SKIN_YAW` is 0 now, and riding puts the +z→+x
quarter turn back by hand. The gate measures his forward as a WORLD
DIRECTION rather than an angle, because facing is a thing you see.

**"After the machine there is a blocker that is not possible to jump
over."** The bank is three tiles and a jump reaches 2.65, so it is not
meant to be jumped — it is the machine's job. But the machine could never
get to it: **the wrecking ball hung at x=70, squarely across the
excavator's only run from where it parks to the bank at 84**, and a hit
takes the RIDE. Every attempt ended with the ball throwing you out of the
cab. **Correction, from the playthrough gate:** it is not an absolute
wall — a bot that drives steadily can thread the swing, and did. It is
*timing-dependent*, which for a six-year-old is arguably worse: the same
approach works sometimes and throws you out other times, with a long walk
back either way. Either way the arrangement is refused by rule now.

The ball has moved to x=35, in the stretch only the kid ever walks, and
the rule is now enforced rather than remembered: `test/rooms.mjs` refuses
any room where a ride-ending hazard stands between a machine and an
obstacle it is meant to clear, with a deliberately broken room proving the
check bites. The old track rules only ever asked about holes.

**And nothing told you to go back for it.** Standing at the lock on foot
now says so, with the direction: `◀ TOO HIGH TO JUMP — GO BACK FOR THE
MACHINE`. A six-year-old should not have to infer that the answer is
twenty tiles behind them.

Gate: 145 checks, plus 30 in the room prover.

## v7 — 2026-08-13 — controller-first controls, the stomp, and the flag

**Three lineages became one.** The gameplay branch (parts kit, room prover,
crane, robots, brick wall) and the art branch (Meshy-rigged animated Eeri,
the pipeline) are reconciled into `main`, split by kind. Two regressions the
graft nearly shipped were caught: `kid.js` had reverted to a hardcoded fall
respawn, and the gate only understood the node contract so the skinned
character failed it.

**The painted layer art was unplugged, again.** `layers.js` imported
`assets.js?v=1` while `main.js` imported `?v=2` — two tokens, so the module
instantiated twice, `loadManifest()` ran on one instance and
`getLayerTexture()` asked the other. Every layer fell back to code-paint
while 2.7 MB of PNG sat unrequested. `palette.js` was split the same way.
Third time for this class, so it is gated now: a static sweep failing on any
module imported under two tokens, and a runtime check that every asset the
manifest calls **live** was actually FETCHED.

**Controls are controller-first** (DESIGN.md §5). `input.js` reads a pad
natively — polled once a frame, edge-detected against its own previous
state so an idle pad never clobbers a held key, and polled in every mode
rather than inside the play branch. Every prompt is glyphs and names no
key; the on-screen buttons wear the same glyphs. The touch layout is a
bottom row plus a boom pair: the d-pad cross tried first stood 200 px tall
on a landscape phone and shoved the hint into the middle of the picture.

**The stomp.** Landing on a small machine kills it and bounces 80% of a
jump — enough to chain, never enough to reach what a jump cannot, so no
room's proved reach budget is quietly broken by an enemy standing in it.
Tested before the lunge, so jumping at one is the right answer rather than
a gamble, and it does not also count as being hit.

**The flag** (DESIGN.md §4.2) replaces the plain exit gate. It builds in
three phases as Eeri closes — base plate, pole, cloth — a puff of smoke
each, and finishes by being **run past**: no button, no stopping on a mark.
Level 3 of a world flies a bigger one in a different colour. Behind the
asset seam like everything else (`phase0/1/2` + `pole`).

Gate: 144 checks, plus 29 in the room prover. Five of the new ones run in a
real landscape-phone context rather than a forced-visible desktop — the
badge check earned itself immediately by catching Ⓑ underneath the Toko
signature, the same collision v6 fixed once for jump.

## v6 — 2026-08-13
**The parts kit, and rooms that can be finished.** Rooms were a hand-drawn
grid plus half a dozen side-arrays that could disagree with it — the pit
was declared twice, the bank twice, and nothing anywhere checked that a
machine could actually reach the thing it was supposed to clear. That is
where "you get stuck pretty fast" came from.

`js/parts.js` is the palette, and it is the method flashprince already
proved, ported rather than copied. There a room is twenty by twelve
characters and `editor.js` paints it from a named brush strip, because
"the character IS the data". Eeri's rooms scroll and carry MACHINES, so a
room here is a LIST OF PARTS and each part declares its rules once: what
it stamps into the map, what it demands of whoever arrives, and which
verb removes it. `js/rooms.js` is the whole game as three such lists.

**And the piece flashprince never had.** Its level distances are measured
off a written budget — a running jump carries 3.7 tiles, so a 3-tile gap
goes and a 4-tile gap does not — but nothing checks a room against it;
you find out by playing. Eeri gets the budget as numbers computed off
`kid.js` rather than guessed (jump apex 12.6²/60 = **2.65 tiles**, so a
2-tile step goes and 3 does not; a run carries **4.85**, so a 4-tile gap
goes and 5 does not) AND the check. `test/rooms.mjs` walks every room
from spawn to exit in plain Node — no browser, the shape of gameoflife's
`check_levels.mjs` — and a room that cannot be finished fails the build.
It carries eight rooms broken on purpose, one way each, so a prover that
cannot fail cannot pass unnoticed: a step too tall, a gap too wide, a
lock with no machine, **a machine penned from its own job by a hole**,
an obstacle outside its machine's reach, a machine spawned off its own
track, a robot patrolling across a hole.

**Machines have an A-to-B track now**, declared per room, and the check
holds the room to it: the track may not be cut by a hole, and every
obstacle the machine is meant to clear must lie within arm's reach of
somewhere on it. That single rule is what stops the class of soft-lock.

**SITE 3 — the wall, and the third verb.** A wrecking crane
(`js/crane.js`), on the excavator's exact node contract so a live GLB
drops in behind the same check and the same paint map. The brief had this
machine down as a *hazard boss*; the owner's direction moves it, and it
is the game's thesis in one object — the ball that swings at you unmanned
is the ball you swing at the wall once the cab is yours. The brick wall
(`Wall` in `js/pieces.js`) is the third manipulable piece: intact →
cracked → rubble, honouring §5.1's rule that rubble is a different
silhouette and not a shorter wall, and its rows leave the MAP when it
comes down, the same honesty as the dig and the span.

**Small things to avoid** (`js/robots.js`). A robot patrols a span the
kit guarantees is floor, notices, winds up, then lunges — flashprince's
sentry clock compressed, so it is a reading test rather than a reflex
test. A steam vent breathes on a fixed clock with a lit collar before it
blows. The cost is the Yoshi rule, unchanged: a hit takes the RIDE, not
the run, and a machine drives straight over a robot.

**Touch, fixed.** The Toko badge sat on top of the jump button — inert
per the house rule, but covering the one control the game is played with;
on a coarse pointer it now clears the whole button row. And every hint
named keyboard keys to a thumb that has none, so there is a touch string
set: `◀ ▶ — RUN · ▲ — JUMP`.

Found on the way: `window.__eeri.exc` was captured once at boot, so after
a room change the handle still pointed at the machine you had left — the
test that placed the kid beside "the machine" was standing him next to
one in another room. It is a getter now.

Gate: 115 checks, plus 29 in `test/rooms.mjs` (21 over the real rooms,
8 proving the prover bites).

## v5 — 2026-08-13
**The art lands, and the game goes up on the floor.** The seam built in
v1 did its job: five layer paintings and the excavator swapped from code
placeholder to file with a status flip, and no game code changed to
accept them. The excavator GLB honours the rig contract exactly — every
contracted node present, and its rest pose, pivots and node translations
match the placeholder to three decimals, so `house.y = 0.86`, the 0.52
boom and the −1.35 stick all land where the code already reached for
them. Its `wheels` node ships without the child spinners the placeholder
had, so the wheels do not roll; everything else animates.

**Two house rules had to be enforced at the seam rather than assumed.**
The model arrived with five baked photo-texture materials at metallic
0.5 — and §3.2 makes "one palette, one material language" a make-or-break
rule, not a preference, precisely because the risk in a 2D/3D game is the
cast and the world reading as two different games. It rendered rust-brown
against a brown hoarding and stopped being safety yellow. So a model
entry may now carry a `paint` map (node → palette role) and `assets.js`
replaces its materials with flat palette colours, keeping every bit of
geometry and rig. The node contract was already enforced there; the
surface is now too. Omit `paint` to ship an asset's own materials.

The fore painting was composed against the **old** occluder rect
(y −1…5), which v4 corrected to −2…14 so a foreground can actually be
cropped by the top of the frame. `art-src/tools/recanvas-fore.mjs` moves
it onto the taller canvas **at the exact world position it was painted
for** — the same pixels, the same world units, simply with room above
them. Its sibling tool pinned an absolute path into a scratch directory
and stopped working when that session ended; this one resolves playwright
through CJS instead, since ESM does not honour `NODE_PATH`.

**Deployed.** The cabinet was lit on the hub and pointed at `eeri/`,
which did not exist on `gh-pages` — Play was a 404. The game, the
catalogue entry and the `worksite` marquee are on the site now, merged
into the site's own `games.js`/`art.js` rather than overwriting them
(the site carries `tokotrip`, which this branch does not, and an
overwrite deletes a cabinet). `deploy-hub.mjs` renumbered every token
from one map, and its guard caught that the site's `hub.js` had grown a
WebXR floor sort this branch never had — brought back before deploying,
or the deploy would have deleted it.

**The textures the model never showed are gone.** Every one of its five
textured materials is covered by the paint map, so those images were
bytes the browser downloaded, decoded into blob URLs and threw away —
and each was an async load still in flight when the hub gate opened the
game and moved on, which is how they were found: a `Couldn't load
texture blob:` error that only Eeri produced.
`art-src/tools/strip-textures.mjs` removes them and compacts the buffer;
it refuses to run if any textured material is NOT repainted, since then
stripping would change what is on screen. Geometry, tri count, node
names, rest pose and pivots are untouched, and the frame is
pixel-identical. 924 → 851 KB.

Known, and the asset producer's call: at 851 KB and 8 740 triangles the
excavator is over the brief's ceilings (400 KB, and 3 000 tris for a
small machine / 6 000 for a big set-piece) — the weight is geometry, not
textures, so it wants decimating rather than re-exporting. Its `wheels`
node has no child spinners, so the wheels do not roll. And the fore
painting still sits below the playfield ground line, so it reads as a
band along the bottom rather than something you pass behind.

Gate: 98 checks, plus 13 against the deployed tree.

## v4 — 2026-08-13
**The depth pass — the Tropical Freeze half, which needs no cast.** The
3D characters are blocked on the Meshy pipeline, so this version moves
the other half of the confirmed reference pair: "2D gameplay, fully 3D
layered world — dramatic depth, the camera drifting on rails, background
layers where things happen, heavy-object weight." None of that needs a
model. It was judged the way the method says — render, LOOK, name what is
wrong, redo — and the LOOK named three things:

**A third of every frame was dead flat brown.** The earth below the lip
was one unbroken slab: the largest area on screen carrying no
information, which is the one thing the reference never does. It is a
cut section now — strata darkening downward, cobbles embedded in the
face, a fresh cut edge drawn either side of every hole, and a hard
shadow under the grass lip, because the lane the game is played on was a
0.14-tile hairline against a flat wall. The bank bands the same way; it
is the room's most important object and it read as a box.

**The occluder lane was buried.** Its rect stopped at y=5 — one tile
above the ground line — so a foreground piece physically could not reach
the top of the frame, and the one girder in it floated inside the dirt.
The "cropped foreground = depth" lesson was written in the brief and
absent from the screen. The rect runs −2…14 now, the whole visible band
at that depth, and carries a real kit: scaffold standards you pass
behind, spoil sweeping the bottom edge, a pipe run crossing above
everything. Two things it got wrong first and the README now states: a
big shape parked at eye level is a blob with the game hidden behind it
(the cable drums were 1.25-unit discs at head height), and a heap whose
crest sits below the playfield's ground line reads as a hole cut in the
earth rather than a mound in front of it.

**The background competed instead of receding.** A haze band sits the far
stack in air, and the skyline lost its internal contrast — crisp two-tone
blocks at that distance read as near and fought the playfield.

Plus the two things the reference has that a spring does not.
**`js/camera.js` is a director**: a site declares SHOTS — zones with
their own dolly, height and lead — and the camera blends across them, so
a room pulls back where it is asking you to read a lock and closes in
where it is not. Over that sit a slow **drift**, so the frame is never
dead still, and a **punch** — a short dolly kick on the dig, the sling,
the span seating and every hit, which is what weight looks like from
behind a camera. And **the background works**: a crane traverses a load
across the skyline and a truck crosses the far road, where before one
digging machine was one event in ninety-six tiles.

**The seam, hardened, because asset input has started.** Art contributes
files to `assets/` and a status flip, nothing else — so the gate now
refuses a manifest path that climbs out of that folder, and measures a
live PNG's pixels against its documented size rather than letting it
stretch silently onto the plane. The size table in `assets/README.md` is
the brief an artist paints to, so it is checked against `LAYER_RECTS` ×
`PPU` in code rather than trusted to have been kept up by hand. Both
guards were verified by feeding the gate bad input and watching it fail.

Gate: 93 checks.

## v3 — 2026-08-13
**The level beyond one room.** Walking through the gate now leads
somewhere: sites are data (`SITES` in `js/level.js` — map, bolts, spawns,
exit, and which lock the room carries), one `buildSite()` builds a room
into a single group and tears the old one down whole, the kid and the
machine persist, and the camera **cuts** to the new room — a slow pan
across a rebuilt world is a lie about geography. Each room's machine
starts unmanned again: taming does not carry between sites, so the mount
is read every time, which is the point of it.

Site 2 is **the girder** — the second manipulable piece, its contract
already waiting in the manifest: stacked → slung → seated as a span. The
gap is eight tiles, past *both* of them — the kid's jump falls short and
the machine refuses the cliff. The same gesture as the dig works it the
other way round: hold the bucket in the stack and the chains take the
load (the machine drives at ×0.55 while carrying — a machine earns its
slowness); lower it at the lip and the span seats, filling the MAP row
the way the dig cleared one, so the bridged gap is a fact about the
level. The kid crosses on foot, because the exit is his half of the job.

Found by LOOKING, not by the gate: a slung load hung a fixed length
under the bucket and **sank into the ground** when the boom came down —
now the chains go slack and the load rests, never sinks (the rest depth
is measured off the asset's own bounding box, so a live GLB keeps the
behaviour). Found the flaky way: the GPU-less sandbox runs the clock
~5× slow, so a mount that takes 0.55 s of game time takes ~3 s of wall
clock — the test's retry loop now walks back up and gives each attempt
real time, and the crossing is asserted mid-span instead of demanding a
36-tile walk inside a wall-clock timeout.

Gate: 65 checks.

## v2 — 2026-08-13
**The loop.** v1 had systems and no game: riding was strictly worse than
walking (45% slower, no jump, a five-times wider body), the boom was a
verb with no object, and the room had no reason to go right. v2 is the
answer, and it is the owner's: **a machine is dangerous until it is
yours, and the room is a lock the machine opens.**

The excavator now starts **unmanned** — amber beacon turning, working its
own slow dig cycle. It is not hunting Eeri; it is heavy and blind, and
standing under the bucket while it sweeps puts him down. The lift is the
window, so **mounting is the skill test**: read the cycle, take the step,
and the beacon goes out — the threat is now the tool, permanently.

The room is two obstacles, each shaped for exactly one of them. **The
pit** is kid-shaped: he clears it in a run, and the machine refuses a
cliff. **The bank** is machine-shaped: three tiles of dirt above his
jump, taken down a row at a time by holding the bucket in it. Digging
edits the **map**, not the picture, so the level really changed; the
bank's cut face and spill are drawn per state (`js/pieces.js`, behind the
same asset seam as everything else, contract `state0/1/2`). Walking out
through the gate the machine opened is SITE CLEAR.

Fixed on the way: a queued `action` press was consumed again the instant
riding began, so a player who mashed E climbed in and fell straight back
out — the same double-consume trap Suds Jack paid for, now drained at
both edges. The HUD moved to the top-right; it had been sitting under
`hub/shell.js`'s HOME button, unreadable, in every screenshot.

Gate: 49 checks.

## v1 — 2026-08-12
Gate-1 diorama slice, asset-ready. The full layer stack (sky / skyline /
far / mid / near / foreground occluders) as code-painted cutouts at real
z-depths behind a 24° long-lens camera; tile-grid level with collision
(ground, mounds, steel platforms, a pit, a girder); Eeri on foot (run /
buffered+coyote jump / hard-landing squash); the excavator as first mount
(E to climb in via the step, drive with heavy ease, W/S boom on real
hinges, hop out); 19 bolt spinners to collect; a depth-tinted background
excavator working a dig loop on the far layer; blob shadows, exhaust
puffs, touch buttons. **The asset seam is live:** `assets/manifest.json` +
`js/assets.js` — every model and 2D layer swaps from code placeholder to
PNG/GLB file with a one-word manifest edit against the node contracts in
`assets/README.md`.

The first hazard is in and it sets the pattern: a wrecking ball hangs dead
still until you come near, then **winds back** — chevrons pulsing, one
warning tone — and only then swings. Nothing here kills; the cost is the
**Yoshi rule**, a hit takes the RIDE (thrown clear of the cab) and never
the run, with mercy frames on foot. A synth kit carries it, including a
diesel bed whose pitch rises with the machine's load, and the arcade
cabinet (`worksite` cover), the way home and the Toko signature are
mounted. `prefers-reduced-motion` stills the decorative background
machine and holds the chevrons steady instead of flashing.

Not yet: more machines, more world themes, the level beyond one room.

---

# The art lineage's log (archived, 2026-08-14)

These are the entries the **`gh-pages` lineage** wrote while it had no
common ancestor with `main` — the craft material kit, the crafted layer
set, the paper sky, the painted machines. They are kept verbatim because
they are the only record of how that art got made, and because their
numbers **collide with the entries above**: this file's v1–v11 and these
v1–v11 are different work. Everything from **v12 up is one tree**.

## v11 — 2026-08-13 — the machines are painted wood, and the map tool is fixed

**The excavator was still smooth plastic in a crafted world**, and chasing it
found two independent causes plus a bug in the tool that makes every map.

1. **An imported GLB carries its own UV atlas.** `craftBox`'s world-space UV
   trick is only available to geometry we build, so on a live model a
   repeating map stretched ONE copy of the brushwork across the whole
   machine. The paint path now tiles across the atlas explicitly (repeat 9),
   on a cloned texture — repeat lives on the Texture, and the cached one is
   shared with every other surface asking for balsa.
2. **The placeholder machines built boxes directly.** `excavator.js`,
   `crane.js`, `pieces.js` and `robots.js` each had a local
   `new THREE.Mesh(new THREE.BoxGeometry(...), M(c))`, which gets the shared
   material but none of the UV density. All four route through `craftBox`
   now.
3. **`detailmap.mjs` scaled contrast about the MEAN**, which preserves the
   source photo's own contrast. That is fine for corrugated card (luminance
   40…230) and useless for a white-painted board (230…250): the balsa map
   came out ±4% however high the strength went. It does a **histogram
   stretch** now — 5th to 95th percentile onto a fixed band — so a map's
   contrast is a property of the REQUEST, not of how well lit the source
   happened to be. Every material was rebuilt through it; felt and balsa
   only became visible at all after this.

The lesson generalises past this project: **normalising by mean preserves
the source's contrast; normalising by range sets it.** A tool that takes a
"strength" argument and ignores it for low-contrast inputs is worse than one
with no argument, because it looks like it is working.

Gate: 134 checks + 29 room prover.

## v10 — 2026-08-13 — a material KIT, not cardboard everywhere

**Crafted World is a kit of materials and the first pass used card for all of
it.** `js/craft.js` is now the one factory every surface is made through, and
the manifest's `textures` block is the palette: `flute` (the cut edge of
corrugated card, stacked fluting) for the earth section and every dug face,
`card` (kraft liner) for flat card, `felt` for the grass lip, `balsa`
(painted wood, brush strokes and a paint chip) for machines, girders and
props — §3.3's "painted wood and pressed steel". Each is a greyscale map
multiplied onto a palette colour, so §3.2 holds exactly.

**The ground is the headline.** It was flat brown, then card with a faint
grain, and it is now visibly a CUT THROUGH STACKED CORRUGATED CARD — which is
what a cut earth section is in this reference. The strata banding the depth
pass established still reads through it; the flute strength was pulled from
0.62 to 0.5 precisely so it would.

**Two failures worth recording.** A probe of the live scene found **3
materials mapped and about 70 not**: every module had grown its own
`const M = (c) => new MeshLambertMaterial(...)`, so the grass lip, both
machines and every prop were still flat paint while the ground behind them
was card. Patching call sites would have left the next one to be written
flat, so `craft.js` replaced all of them — 128 materials now carry their
material, and the ones that do not are the beacon lamp, shadows and glass,
which must stay bare. And the first maps were far too weak: ±20% variation,
which Lambert then flattens further. A material you have to be told is there
is not doing its job.

Also fixed: the sky's remaining magenta. **Magenta is the only thing where r
AND b both exceed g** — yellow, orange, kraft and cream all have b < g, and
cotton is neutral — so the despill needs no threshold and cannot eat a real
colour. 2.04% of pixels carried a pink cast; now 0.004%.

And the gate learned to refuse a manifest block containing a stray note: a
bare `_note` string beside the texture entries made the seam-scope check
resolve a path on `undefined` and killed the whole run with
`ERR_INVALID_ARG_TYPE` instead of naming the problem.

Gate: 134 checks + 29 in the room prover.

## v9 — 2026-08-13 — one build: design v6 × the crafted art, and a paper sky

**The two lineages are one tree again, and the numbering jumps to v9 to
clear both sides' collided v6–v8.** Base: the design branch's v6 (parts kit,
provable rooms via `test/rooms.mjs`, the crane, the wall, robots and vents,
touch fixes). Carried onto it, from the art branch's v6–v8: the Meshy-rigged
animated Eeri behind a `rig: "skinned"` seam with `height` in tiles, the
crafted `_v2` layer set, the playfield card grain (`getTexture`, world-space
UVs), and the kid's palette. The design gate — 116 checks + 29 in the room
prover — passes over the merged tree with all art live.

**And the sky joins the crafted register** (owner's direction: the cardboard
look belongs on the backgrounds, and the sky was the last smooth code paint
on screen). `groundworks_sky_v1.png`: the palette's own gradient × a paper
grain used as LUMINANCE only (§3.2 — no asset invents a colour), COTTON WOOL
cloud cutouts tiled sparsely with a per-tile drift, and ONE construction-
paper sun with a split pin. Built by `art-src` tooling from two free nano
generations; `drawSky` stays as the code placeholder behind the same seam as
every other layer, and the gate now measures the sky PNG like the rest.

Three lessons from the sky, kept in the tool:
- **A prop sheet must forbid its own backing.** The first sheet put the
  props on a kraft board the keyer cannot remove; "directly on the magenta,
  NO board" fixed it.
- **A naively tiled sheet grows a second sun.** The sun is cropped out and
  stamped exactly once; two suns is a broken toy, not a whimsical one.
- **Cotton needs a tighter despill than card.** Bright pixels put the
  generic clamp above 255 where it does nothing, and the wisps kept pink
  rims; a sheet with no legitimate pinks can clamp r/b hard to green+10,
  plus an alpha rolloff on strong spill.

## v6 (design lineage) — 2026-08-13
**The parts kit, and rooms that can be finished.** Rooms were a hand-drawn
grid plus half a dozen side-arrays that could disagree with it — the pit
was declared twice, the bank twice, and nothing anywhere checked that a
machine could actually reach the thing it was supposed to clear. That is
where "you get stuck pretty fast" came from.

`js/parts.js` is the palette, and it is the method flashprince already
proved, ported rather than copied. There a room is twenty by twelve
characters and `editor.js` paints it from a named brush strip, because
"the character IS the data". Eeri's rooms scroll and carry MACHINES, so a
room here is a LIST OF PARTS and each part declares its rules once: what
it stamps into the map, what it demands of whoever arrives, and which
verb removes it. `js/rooms.js` is the whole game as three such lists.

**And the piece flashprince never had.** Its level distances are measured
off a written budget — a running jump carries 3.7 tiles, so a 3-tile gap
goes and a 4-tile gap does not — but nothing checks a room against it;
you find out by playing. Eeri gets the budget as numbers computed off
`kid.js` rather than guessed (jump apex 12.6²/60 = **2.65 tiles**, so a
2-tile step goes and 3 does not; a run carries **4.85**, so a 4-tile gap
goes and 5 does not) AND the check. `test/rooms.mjs` walks every room
from spawn to exit in plain Node — no browser, the shape of gameoflife's
`check_levels.mjs` — and a room that cannot be finished fails the build.
It carries eight rooms broken on purpose, one way each, so a prover that
cannot fail cannot pass unnoticed: a step too tall, a gap too wide, a
lock with no machine, **a machine penned from its own job by a hole**,
an obstacle outside its machine's reach, a machine spawned off its own
track, a robot patrolling across a hole.

**Machines have an A-to-B track now**, declared per room, and the check
holds the room to it: the track may not be cut by a hole, and every
obstacle the machine is meant to clear must lie within arm's reach of
somewhere on it. That single rule is what stops the class of soft-lock.

**SITE 3 — the wall, and the third verb.** A wrecking crane
(`js/crane.js`), on the excavator's exact node contract so a live GLB
drops in behind the same check and the same paint map. The brief had this
machine down as a *hazard boss*; the owner's direction moves it, and it
is the game's thesis in one object — the ball that swings at you unmanned
is the ball you swing at the wall once the cab is yours. The brick wall
(`Wall` in `js/pieces.js`) is the third manipulable piece: intact →
cracked → rubble, honouring §5.1's rule that rubble is a different
silhouette and not a shorter wall, and its rows leave the MAP when it
comes down, the same honesty as the dig and the span.

**Small things to avoid** (`js/robots.js`). A robot patrols a span the
kit guarantees is floor, notices, winds up, then lunges — flashprince's
sentry clock compressed, so it is a reading test rather than a reflex
test. A steam vent breathes on a fixed clock with a lit collar before it
blows. The cost is the Yoshi rule, unchanged: a hit takes the RIDE, not
the run, and a machine drives straight over a robot.

**Touch, fixed.** The Toko badge sat on top of the jump button — inert
per the house rule, but covering the one control the game is played with;
on a coarse pointer it now clears the whole button row. And every hint
named keyboard keys to a thumb that has none, so there is a touch string
set: `◀ ▶ — RUN · ▲ — JUMP`.

Found on the way: `window.__eeri.exc` was captured once at boot, so after
a room change the handle still pointed at the machine you had left — the
test that placed the kid beside "the machine" was standing him next to
one in another room. It is a getter now.

Gate: 115 checks, plus 29 in `test/rooms.mjs` (21 over the real rooms,
8 proving the prover bites).

## v5 — 2026-08-13
**The art lands, and the game goes up on the floor.** The seam built in
v1 did its job: five layer paintings and the excavator swapped from code
placeholder to file with a status flip, and no game code changed to
accept them. The excavator GLB honours the rig contract exactly — every
contracted node present, and its rest pose, pivots and node translations
match the placeholder to three decimals, so `house.y = 0.86`, the 0.52
boom and the −1.35 stick all land where the code already reached for
them. Its `wheels` node ships without the child spinners the placeholder
had, so the wheels do not roll; everything else animates.

**Two house rules had to be enforced at the seam rather than assumed.**
The model arrived with five baked photo-texture materials at metallic
0.5 — and §3.2 makes "one palette, one material language" a make-or-break
rule, not a preference, precisely because the risk in a 2D/3D game is the
cast and the world reading as two different games. It rendered rust-brown
against a brown hoarding and stopped being safety yellow. So a model
entry may now carry a `paint` map (node → palette role) and `assets.js`
replaces its materials with flat palette colours, keeping every bit of
geometry and rig. The node contract was already enforced there; the
surface is now too. Omit `paint` to ship an asset's own materials.

The fore painting was composed against the **old** occluder rect
(y −1…5), which v4 corrected to −2…14 so a foreground can actually be
cropped by the top of the frame. `art-src/tools/recanvas-fore.mjs` moves
it onto the taller canvas **at the exact world position it was painted
for** — the same pixels, the same world units, simply with room above
them. Its sibling tool pinned an absolute path into a scratch directory
and stopped working when that session ended; this one resolves playwright
through CJS instead, since ESM does not honour `NODE_PATH`.

**Deployed.** The cabinet was lit on the hub and pointed at `eeri/`,
which did not exist on `gh-pages` — Play was a 404. The game, the
catalogue entry and the `worksite` marquee are on the site now, merged
into the site's own `games.js`/`art.js` rather than overwriting them
(the site carries `tokotrip`, which this branch does not, and an
overwrite deletes a cabinet). `deploy-hub.mjs` renumbered every token
from one map, and its guard caught that the site's `hub.js` had grown a
WebXR floor sort this branch never had — brought back before deploying,
or the deploy would have deleted it.

**The textures the model never showed are gone.** Every one of its five
textured materials is covered by the paint map, so those images were
bytes the browser downloaded, decoded into blob URLs and threw away —
and each was an async load still in flight when the hub gate opened the
game and moved on, which is how they were found: a `Couldn't load
texture blob:` error that only Eeri produced.
`art-src/tools/strip-textures.mjs` removes them and compacts the buffer;
it refuses to run if any textured material is NOT repainted, since then
stripping would change what is on screen. Geometry, tri count, node
names, rest pose and pivots are untouched, and the frame is
pixel-identical. 924 → 851 KB.

Known, and the asset producer's call: at 851 KB and 8 740 triangles the
excavator is over the brief's ceilings (400 KB, and 3 000 tris for a
small machine / 6 000 for a big set-piece) — the weight is geometry, not
textures, so it wants decimating rather than re-exporting. Its `wheels`
node has no child spinners, so the wheels do not roll. And the fore
painting still sits below the playfield ground line, so it reads as a
band along the bottom rather than something you pass behind.

Gate: 98 checks, plus 13 against the deployed tree.

## v4 — 2026-08-13
**The depth pass — the Tropical Freeze half, which needs no cast.** The
3D characters are blocked on the Meshy pipeline, so this version moves
the other half of the confirmed reference pair: "2D gameplay, fully 3D
layered world — dramatic depth, the camera drifting on rails, background
layers where things happen, heavy-object weight." None of that needs a
model. It was judged the way the method says — render, LOOK, name what is
wrong, redo — and the LOOK named three things:

**A third of every frame was dead flat brown.** The earth below the lip
was one unbroken slab: the largest area on screen carrying no
information, which is the one thing the reference never does. It is a
cut section now — strata darkening downward, cobbles embedded in the
face, a fresh cut edge drawn either side of every hole, and a hard
shadow under the grass lip, because the lane the game is played on was a
0.14-tile hairline against a flat wall. The bank bands the same way; it
is the room's most important object and it read as a box.

**The occluder lane was buried.** Its rect stopped at y=5 — one tile
above the ground line — so a foreground piece physically could not reach
the top of the frame, and the one girder in it floated inside the dirt.
The "cropped foreground = depth" lesson was written in the brief and
absent from the screen. The rect runs −2…14 now, the whole visible band
at that depth, and carries a real kit: scaffold standards you pass
behind, spoil sweeping the bottom edge, a pipe run crossing above
everything. Two things it got wrong first and the README now states: a
big shape parked at eye level is a blob with the game hidden behind it
(the cable drums were 1.25-unit discs at head height), and a heap whose
crest sits below the playfield's ground line reads as a hole cut in the
earth rather than a mound in front of it.

**The background competed instead of receding.** A haze band sits the far
stack in air, and the skyline lost its internal contrast — crisp two-tone
blocks at that distance read as near and fought the playfield.

Plus the two things the reference has that a spring does not.
**`js/camera.js` is a director**: a site declares SHOTS — zones with
their own dolly, height and lead — and the camera blends across them, so
a room pulls back where it is asking you to read a lock and closes in
where it is not. Over that sit a slow **drift**, so the frame is never
dead still, and a **punch** — a short dolly kick on the dig, the sling,
the span seating and every hit, which is what weight looks like from
behind a camera. And **the background works**: a crane traverses a load
across the skyline and a truck crosses the far road, where before one
digging machine was one event in ninety-six tiles.

**The seam, hardened, because asset input has started.** Art contributes
files to `assets/` and a status flip, nothing else — so the gate now
refuses a manifest path that climbs out of that folder, and measures a
live PNG's pixels against its documented size rather than letting it
stretch silently onto the plane. The size table in `assets/README.md` is
the brief an artist paints to, so it is checked against `LAYER_RECTS` ×
`PPU` in code rather than trusted to have been kept up by hand. Both
guards were verified by feeding the gate bad input and watching it fail.

Gate: 93 checks.

## v3 — 2026-08-13
**The level beyond one room.** Walking through the gate now leads
somewhere: sites are data (`SITES` in `js/level.js` — map, bolts, spawns,
exit, and which lock the room carries), one `buildSite()` builds a room
into a single group and tears the old one down whole, the kid and the
machine persist, and the camera **cuts** to the new room — a slow pan
across a rebuilt world is a lie about geography. Each room's machine
starts unmanned again: taming does not carry between sites, so the mount
is read every time, which is the point of it.

Site 2 is **the girder** — the second manipulable piece, its contract
already waiting in the manifest: stacked → slung → seated as a span. The
gap is eight tiles, past *both* of them — the kid's jump falls short and
the machine refuses the cliff. The same gesture as the dig works it the
other way round: hold the bucket in the stack and the chains take the
load (the machine drives at ×0.55 while carrying — a machine earns its
slowness); lower it at the lip and the span seats, filling the MAP row
the way the dig cleared one, so the bridged gap is a fact about the
level. The kid crosses on foot, because the exit is his half of the job.

Found by LOOKING, not by the gate: a slung load hung a fixed length
under the bucket and **sank into the ground** when the boom came down —
now the chains go slack and the load rests, never sinks (the rest depth
is measured off the asset's own bounding box, so a live GLB keeps the
behaviour). Found the flaky way: the GPU-less sandbox runs the clock
~5× slow, so a mount that takes 0.55 s of game time takes ~3 s of wall
clock — the test's retry loop now walks back up and gives each attempt
real time, and the crossing is asserted mid-span instead of demanding a
36-tile walk inside a wall-clock timeout.

Gate: 65 checks.

## v2 — 2026-08-13
**The loop.** v1 had systems and no game: riding was strictly worse than
walking (45% slower, no jump, a five-times wider body), the boom was a
verb with no object, and the room had no reason to go right. v2 is the
answer, and it is the owner's: **a machine is dangerous until it is
yours, and the room is a lock the machine opens.**

The excavator now starts **unmanned** — amber beacon turning, working its
own slow dig cycle. It is not hunting Eeri; it is heavy and blind, and
standing under the bucket while it sweeps puts him down. The lift is the
window, so **mounting is the skill test**: read the cycle, take the step,
and the beacon goes out — the threat is now the tool, permanently.

The room is two obstacles, each shaped for exactly one of them. **The
pit** is kid-shaped: he clears it in a run, and the machine refuses a
cliff. **The bank** is machine-shaped: three tiles of dirt above his
jump, taken down a row at a time by holding the bucket in it. Digging
edits the **map**, not the picture, so the level really changed; the
bank's cut face and spill are drawn per state (`js/pieces.js`, behind the
same asset seam as everything else, contract `state0/1/2`). Walking out
through the gate the machine opened is SITE CLEAR.

Fixed on the way: a queued `action` press was consumed again the instant
riding began, so a player who mashed E climbed in and fell straight back
out — the same double-consume trap Suds Jack paid for, now drained at
both edges. The HUD moved to the top-right; it had been sitting under
`hub/shell.js`'s HOME button, unreadable, in every screenshot.

Gate: 49 checks.

## v1 — 2026-08-12
Gate-1 diorama slice, asset-ready. The full layer stack (sky / skyline /
far / mid / near / foreground occluders) as code-painted cutouts at real
z-depths behind a 24° long-lens camera; tile-grid level with collision
(ground, mounds, steel platforms, a pit, a girder); Eeri on foot (run /
buffered+coyote jump / hard-landing squash); the excavator as first mount
(E to climb in via the step, drive with heavy ease, W/S boom on real
hinges, hop out); 19 bolt spinners to collect; a depth-tinted background
excavator working a dig loop on the far layer; blob shadows, exhaust
puffs, touch buttons. **The asset seam is live:** `assets/manifest.json` +
`js/assets.js` — every model and 2D layer swaps from code placeholder to
PNG/GLB file with a one-word manifest edit against the node contracts in
`assets/README.md`.

The first hazard is in and it sets the pattern: a wrecking ball hangs dead
still until you come near, then **winds back** — chevrons pulsing, one
warning tone — and only then swings. Nothing here kills; the cost is the
**Yoshi rule**, a hit takes the RIDE (thrown clear of the cab) and never
the run, with mercy frames on foot. A synth kit carries it, including a
diesel bed whose pitch rises with the machine's load, and the arcade
cabinet (`worksite` cover), the way home and the Toko signature are
mounted. `prefers-reduced-motion` stills the decorative background
machine and holds the chevrons steady instead of flashing.

Not yet: more machines, more world themes, the level beyond one room.

---

# The levels lineage's log (archived, 2026-08-14)

The entries `claude/eeri-platformer-levels-dtfh0x` wrote while it had no
common ancestor with `main` — the checkpoint, the generosity numbers, the
gizmo kit. Kept verbatim because they are the only record of how that work
was reasoned about, and because **their v9-v13 collide with the entries
above**. Everything from **v14 up is one tree**.

## v13 — 2026-08-14 — the gizmo kit starts, and it stops at the tile line

**"Gizmos are the third source of variety and cost the least" (DESIGN §2) —
and they are also what makes twelve levels possible, because one idea per
level means the kit IS the level count.** Two of them, and both are
TILE-NATIVE, which is why they cost almost nothing: a **belt** is a floor
that moves you (2.6 tiles/s, and it moves the FLOOR — your own speed is
untouched, so you keep full control on ground that disagrees with you), and a
**tarp** is a floor that throws you (5.1 tiles, about twice the 2.65 a jump
reaches). Each stamps like any other part and the whole behaviour is one hook
in the player's step. A belt carries its direction in its own character —
`C` runs right, `c` runs left — so a belt cannot disagree with itself, and
the chevrons on top say which way while it is standing still.

**Where the kit stops, and why it is a line rather than a pause.** The
gizmos that must MOVE — a hoist platform, a tipping plank, a swinging hook —
are a much larger job, because every solid in this game is a TILE and a
moving platform cannot be one. That wants an entity with its own collision
pass and carry logic. It is named here so the next session knows the kit
stopped deliberately rather than ran out of steam.

**The lab, and why it is not a level.** One idea per level means a new gizmo
cannot be dropped into levels 1–3 without making each of them two levels — so
the kit is proved in `LAB` (`js/rooms.js`), the standalone reference the way
toko-drop keeps `enemy-lab.html`, and spent on levels 4–6, which are due a
world-2 backdrop anyway. It is buildable but **never in the sequence**:
`SITES` is what a room index means, `ROOMS` is what the game runs through,
and one derived constant separates them rather than two lists that can
disagree. `__eeri.debug.goLab()` opens it. It is held to every structural
rule a level is — a hundred bolts, three golden, a checkpoint, a flag — and
to none of the shape rules, because its length is whatever proving the kit
takes.

**Found immediately, and it is the general lesson:** the lab reported its own
bolts unreachable. The reach model was written when a jump was the only way
to gain height, so a trail four tiles above a tarp — which throws you five —
read as hung in the sky. **Anything a gizmo adds to the player's reach has to
be added to the model too, or the check starts refusing correct rooms, which
is worse than not checking at all.** The tarp is in the model now; the next
gizmo that moves the player will have to be.

Both gizmos are held to the one way each goes wrong: a belt may not **hand
you to a cell with no floor** — a jump you got wrong is yours, a belt you
were standing on is not — and a tarp must have the **headroom** to throw you
into, because a bounce into a ceiling reads as the game taking the move back.
Both rules bite in `test/rooms.mjs`.

**Three bugs the lab found in code that was already shipping**, which is what
a lab is for:

- **A room with no machine crashed the game.** Levels 1–3 each park one, so
  `exc` was read unguarded all through the foot branch; the lab is a
  platforming room with nothing to ride, and it threw on its first frame.
  A crash inside `setAnimationLoop` is total and silent — every later frame
  throws, the game freezes, and the screen says nothing.
- **Variable jump height was cutting rises the player never asked for.**
  Releasing jump clamps the climb at 4, and that clamp ran on *every* upward
  velocity: a tarp's 17.5 and a stomp's 10.08 were both cut on the next frame
  unless a button they have nothing to do with happened to be held. The tarp
  measured **2.47 tiles instead of 5.1**, and the stomp's bounce silently
  depended on the jump button. A rise the player did not ask for is not
  theirs to cut, so the clamp now applies to jumps only.
- **The gate positioned the kid before a room change had settled.** `site()`
  flips as soon as the index is assigned, while `goSite()` still has to put
  him on the new spawn — so a `setPos` fired the instant it flipped was
  overwritten a frame later, and the mount failed with the machine standing
  right beside him. `debug.transitioning()` is exposed and every room wait
  settles on it.

Measured in the lab afterwards: the belt carries 1.1 tiles a second of
standing still with `vx` untouched, and the tarp lifts **4.8 tiles** against
the 5.1 the model predicts — the difference is frame discretisation, and the
model keeps the honest number rather than the flattering one.

Gate: 75 checks in the room prover, and the browser gate proves both gizmos
by standing still on them — anything that happens is the gizmo's doing.

## v12 — 2026-08-14 — the generosity rules become numbers

**Three telegraphs were under the floor the design sets, and nothing could
see it.** DESIGN §4.1 is explicit and it is about a six-year-old — *telegraph
≥ 1.0 s before anything can touch you* — while the skitter warned for
**0.80 s** (notice 0.35 + wind 0.45), the steam vent for **0.55 s** and the
wrecking ball for **0.85 s**. The rule lived in a document and the numbers
lived in three different modules, which is the whole reason it drifted.

So the clocks moved into `parts.js`, beside the reach budget, and `robots.js`
and `hazards.js` import them rather than keeping their own: skitter
0.45 + 0.62 = **1.07 s**, vent **1.05 s**, ball **1.05 s**. The room prover
holds all three to the floor. **A hopper is exempt and the reason is stated
rather than assumed**: the floor is about things that BECOME dangerous, and a
hopper is dangerous continuously and identically from the moment you see it —
a metronome, never a surprise — so what it owes is a rhythm slow enough to
read (≥ 1.2 s a cycle), which is checked instead.

**How long a level takes is now a number.** `estimate()` walks a room and
prices it: the run at the kid's own speed, a beat per obstacle, a beat per
small machine, every ladder at climbing speed, and **the ride from the job it
actually does** — mount, drive to the work at that machine's own top speed,
the work itself, dismount. The prover prints it per level and refuses a room
that is not a level at all.

Two things fell out of it that are the owner's to settle, and neither is a
bug:

- **The rides are 5.5–10.8 s. DESIGN §1 says thirty to forty.** What is built
  is *board, do a job, hop off*; what the design describes is *ride a short
  authored stretch that no amount of jumping could cross*. The estimate
  originally carried a flat 30 s for a ride, which hid this completely — the
  number is measured from the parts now, and the parts disagree with the
  brief.
- **A learned run is ~32 s against the "~40 once learned" target.** On the
  same model the first time through lands inside 60–90, so this is the levels
  being slightly thin rather than wrong.

The **on-foot share** is checked because §1 makes it a claim: *"that is 80% of
playtime and it has to be good on its own."* The three levels run 71% / 82% /
68% — level 3 being the most ride-heavy, which is right for the big one — and
a room that falls under 60% now fails.

**And the slack rule, which cannot fire on a legal room.** §4.1 asks for a
full tile of slack on every jump; the budget's own ceilings give 0.65 on a
2-tile step and 0.85 on a 4-tile gap, so the ceiling *cannot* meet the rule
and only what a level actually uses can be checked. Sizes are whole tiles, so
every legal room already passes — which makes the rule's real job the other
direction: catching the KID changing under levels proved against the old
numbers. The bite does exactly that, weakening the jump and checking the
levels notice.

Gate: 70 checks in `test/rooms.mjs` (up from 59), the browser gate unchanged
in count.

## v11 — 2026-08-13 — three rooms become three LEVELS

**Built on the deployed head, not on a fork of it.** Two reconciliations had
already been paid for, and both had the same cause: `main` and `gh-pages`
have **unrelated histories** (Pages is an orphan branch), so a lineage that
starts from an old copy of the tree cannot be merged back, only re-typed.
This version starts from `gh-pages` — the art lineage through v10, crafted
materials and all — and brings the design lineage's controls commit forward
onto it, rather than the other way round. Where the two numbered the same
module differently, **this tree's numbering wins**: a token carried over from
the other lineage names a file that never existed here.

**Every new surface goes through `craft.js`** (ART_TARGET §0.05). The props
this version adds — the flag, the checkpoint, two new kinds of small machine,
the rungs of every ladder — are painted balsa like the rest of the site's
timber, with one exception that is deliberate: **the flag's cloth is FELT**,
because that is what a flag is made of in this kit. The lamps and the smoke
puffs stay bare, which is the case `craft.js` names. A prop built with a bare
`new MeshLambertMaterial` is flat paint standing in a crafted world, and that
is the failure v10 spent a whole pass undoing.

**THE CLIMB** (`parts.js`, `level.js`, `kid.js`). A rung is **not solid** in
any direction — you walk through it, fall through it, and only the verb holds
you on it; a solid ladder is a wall with a picture of a ladder on it. Two
things it would have got wrong and now cannot: the climb **tops out with his
feet on the deck** rather than one rung above it in the air, and **holding a
direction steps him off**, because without that the top of a ladder is a
place you can only leave by jumping — a trap with rungs. A jump lets go and
is a real jump. The up EDGE is drained while it is held as a climb, or the
stale press is read as a jump the moment he steps off — the same
double-consume trap the mount already pays for.

**Two more kinds of small machine** (`robots.js`), and the split is the point
of having more than one: a **hopper** is a timing test on a fixed 1.35 s
rhythm with a crouch as the tell, a **roller** is a spacing test that is too
flat to stand on — landing on one bounces you off *without* killing it, which
is the game saying *this one you jump* — and the original **skitter** is the
provocation test. A roller that shoved you off used to hit you for it in the
same frame; it now shrugs for 0.4 s. Any of them can stand on a **deck**
rather than the ground, declared rather than sampled, because `groundTop`
from a fixed height puts every deck robot back on the floor.

**The furniture that makes a room a level** (`flag.js`). A **checkpoint**
that lights by being passed and buys the middle of the level back — there are
no lives, so time is the only thing it can cost. A **flag** that builds
itself in **three phases** on the approach, a puff of smoke each, and
**activates by being run past**: no button, no stopping, because a
six-year-old at a sprint should not have to stop and press something to
finish a level. Level 3 of a world flies the **big** one, and the **gate is
the WORLD's curtain** — it is built only where a room declares one.

**The levels themselves.** Three rooms authored to the four-beat Nintendo
shape, one idea each, marked in the source because the marks are the only
thing that stops beat 2 quietly becoming another beat 1: **1 — the stomp**,
**2 — the climb**, **3 — both, and the crane**. A hundred bolts a level and
three hidden golden ones, the count being the level's completion figure, so
it starts again with the level rather than running on across the job.

**And §4 stopped being a document.** `check()` now refuses: a ladder with no
landing or no foot · a level with no midway checkpoint · a **ride whose
payoff sits in the first 45% of the room** (a ride is beat 3–4, not the way
in) · a flag planted before the last obstacle · 99 bolts under a HUD that
says 100 · not exactly three golden bolts · a golden bolt sitting where you
would collect it by walking · a bolt hung where no jump or ladder reaches it
· a robot patrolling a deck that is not there. Reachability is judged against
the map **after** the room's rides have done their work — the bank dug, the
span seated — or every bolt a ride opens up reads as unreachable. Nine new
rooms broken on purpose prove each rule bites.

Found by the levels themselves: a steam vent sat at x=56 in level 2, which is
**inside the girder's seating window** — the one place the ride asks you to
stop was a place that threw you out of the cab. And a hopper parked on the
machine's own staging ground meant the one place you have to stand still to
board was a place something was hitting you. Both are the same lesson: a
hazard placed by feel lands on the beat that needs stillness.

Found in the gate: it sampled the wrecking ball's state **once** after
walking away from it, and the ride test ends inside the ball's six-tile wake
radius — so it was asserting `rest` on a hazard mid-swing. It waits for the
state now, and the telegraph is proved as an ORDER (wind before swing)
recorded off a frame loop, because a poll on a machine rendering at a handful
of frames a second can miss a phase entirely and say nothing about whether
the game warned you.

Gate: 113 checks, plus 59 in `test/rooms.mjs` (42 over the real levels, 17
proving the prover bites).

## v10 — 2026-08-13 — a material KIT, not cardboard everywhere

**Crafted World is a kit of materials and the first pass used card for all of
it.** `js/craft.js` is now the one factory every surface is made through, and
the manifest's `textures` block is the palette: `flute` (the cut edge of
corrugated card, stacked fluting) for the earth section and every dug face,
`card` (kraft liner) for flat card, `felt` for the grass lip, `balsa`
(painted wood, brush strokes and a paint chip) for machines, girders and
props — §3.3's "painted wood and pressed steel". Each is a greyscale map
multiplied onto a palette colour, so §3.2 holds exactly.

**The ground is the headline.** It was flat brown, then card with a faint
grain, and it is now visibly a CUT THROUGH STACKED CORRUGATED CARD — which is
what a cut earth section is in this reference. The strata banding the depth
pass established still reads through it; the flute strength was pulled from
0.62 to 0.5 precisely so it would.

**Two failures worth recording.** A probe of the live scene found **3
materials mapped and about 70 not**: every module had grown its own
`const M = (c) => new MeshLambertMaterial(...)`, so the grass lip, both
machines and every prop were still flat paint while the ground behind them
was card. Patching call sites would have left the next one to be written
flat, so `craft.js` replaced all of them — 128 materials now carry their
material, and the ones that do not are the beacon lamp, shadows and glass,
which must stay bare. And the first maps were far too weak: ±20% variation,
which Lambert then flattens further. A material you have to be told is there
is not doing its job.

Also fixed: the sky's remaining magenta. **Magenta is the only thing where r
AND b both exceed g** — yellow, orange, kraft and cream all have b < g, and
cotton is neutral — so the despill needs no threshold and cannot eat a real
colour. 2.04% of pixels carried a pink cast; now 0.004%.

And the gate learned to refuse a manifest block containing a stray note: a
bare `_note` string beside the texture entries made the seam-scope check
resolve a path on `undefined` and killed the whole run with
`ERR_INVALID_ARG_TYPE` instead of naming the problem.

Gate: 134 checks + 29 in the room prover.

## v9 — 2026-08-13 — one build: design v6 × the crafted art, and a paper sky

**The two lineages are one tree again, and the numbering jumps to v9 to
clear both sides' collided v6–v8.** Base: the design branch's v6 (parts kit,
provable rooms via `test/rooms.mjs`, the crane, the wall, robots and vents,
touch fixes). Carried onto it, from the art branch's v6–v8: the Meshy-rigged
animated Eeri behind a `rig: "skinned"` seam with `height` in tiles, the
crafted `_v2` layer set, the playfield card grain (`getTexture`, world-space
UVs), and the kid's palette. The design gate — 116 checks + 29 in the room
prover — passes over the merged tree with all art live.

**And the sky joins the crafted register** (owner's direction: the cardboard
look belongs on the backgrounds, and the sky was the last smooth code paint
on screen). `groundworks_sky_v1.png`: the palette's own gradient × a paper
grain used as LUMINANCE only (§3.2 — no asset invents a colour), COTTON WOOL
cloud cutouts tiled sparsely with a per-tile drift, and ONE construction-
paper sun with a split pin. Built by `art-src` tooling from two free nano
generations; `drawSky` stays as the code placeholder behind the same seam as
every other layer, and the gate now measures the sky PNG like the rest.

Three lessons from the sky, kept in the tool:
- **A prop sheet must forbid its own backing.** The first sheet put the
  props on a kraft board the keyer cannot remove; "directly on the magenta,
  NO board" fixed it.
- **A naively tiled sheet grows a second sun.** The sun is cropped out and
  stamped exactly once; two suns is a broken toy, not a whimsical one.
- **Cotton needs a tighter despill than card.** Bright pixels put the
  generic clamp above 255 where it does nothing, and the wisps kept pink
  rims; a sheet with no legitimate pinks can clamp r/b hard to green+10,
  plus an alpha rolloff on strong spill.

## v6 (design lineage) — 2026-08-13
**The parts kit, and rooms that can be finished.** Rooms were a hand-drawn
grid plus half a dozen side-arrays that could disagree with it — the pit
was declared twice, the bank twice, and nothing anywhere checked that a
machine could actually reach the thing it was supposed to clear. That is
where "you get stuck pretty fast" came from.

`js/parts.js` is the palette, and it is the method flashprince already
proved, ported rather than copied. There a room is twenty by twelve
characters and `editor.js` paints it from a named brush strip, because
"the character IS the data". Eeri's rooms scroll and carry MACHINES, so a
room here is a LIST OF PARTS and each part declares its rules once: what
it stamps into the map, what it demands of whoever arrives, and which
verb removes it. `js/rooms.js` is the whole game as three such lists.

**And the piece flashprince never had.** Its level distances are measured
off a written budget — a running jump carries 3.7 tiles, so a 3-tile gap
goes and a 4-tile gap does not — but nothing checks a room against it;
you find out by playing. Eeri gets the budget as numbers computed off
`kid.js` rather than guessed (jump apex 12.6²/60 = **2.65 tiles**, so a
2-tile step goes and 3 does not; a run carries **4.85**, so a 4-tile gap
goes and 5 does not) AND the check. `test/rooms.mjs` walks every room
from spawn to exit in plain Node — no browser, the shape of gameoflife's
`check_levels.mjs` — and a room that cannot be finished fails the build.
It carries eight rooms broken on purpose, one way each, so a prover that
cannot fail cannot pass unnoticed: a step too tall, a gap too wide, a
lock with no machine, **a machine penned from its own job by a hole**,
an obstacle outside its machine's reach, a machine spawned off its own
track, a robot patrolling across a hole.

**Machines have an A-to-B track now**, declared per room, and the check
holds the room to it: the track may not be cut by a hole, and every
obstacle the machine is meant to clear must lie within arm's reach of
somewhere on it. That single rule is what stops the class of soft-lock.

**SITE 3 — the wall, and the third verb.** A wrecking crane
(`js/crane.js`), on the excavator's exact node contract so a live GLB
drops in behind the same check and the same paint map. The brief had this
machine down as a *hazard boss*; the owner's direction moves it, and it
is the game's thesis in one object — the ball that swings at you unmanned
is the ball you swing at the wall once the cab is yours. The brick wall
(`Wall` in `js/pieces.js`) is the third manipulable piece: intact →
cracked → rubble, honouring §5.1's rule that rubble is a different
silhouette and not a shorter wall, and its rows leave the MAP when it
comes down, the same honesty as the dig and the span.

**Small things to avoid** (`js/robots.js`). A robot patrols a span the
kit guarantees is floor, notices, winds up, then lunges — flashprince's
sentry clock compressed, so it is a reading test rather than a reflex
test. A steam vent breathes on a fixed clock with a lit collar before it
blows. The cost is the Yoshi rule, unchanged: a hit takes the RIDE, not
the run, and a machine drives straight over a robot.

**Touch, fixed.** The Toko badge sat on top of the jump button — inert
per the house rule, but covering the one control the game is played with;
on a coarse pointer it now clears the whole button row. And every hint
named keyboard keys to a thumb that has none, so there is a touch string
set: `◀ ▶ — RUN · ▲ — JUMP`.

Found on the way: `window.__eeri.exc` was captured once at boot, so after
a room change the handle still pointed at the machine you had left — the
test that placed the kid beside "the machine" was standing him next to
one in another room. It is a getter now.

Gate: 115 checks, plus 29 in `test/rooms.mjs` (21 over the real rooms,
8 proving the prover bites).

## v5 — 2026-08-13
**The art lands, and the game goes up on the floor.** The seam built in
v1 did its job: five layer paintings and the excavator swapped from code
placeholder to file with a status flip, and no game code changed to
accept them. The excavator GLB honours the rig contract exactly — every
contracted node present, and its rest pose, pivots and node translations
match the placeholder to three decimals, so `house.y = 0.86`, the 0.52
boom and the −1.35 stick all land where the code already reached for
them. Its `wheels` node ships without the child spinners the placeholder
had, so the wheels do not roll; everything else animates.

**Two house rules had to be enforced at the seam rather than assumed.**
The model arrived with five baked photo-texture materials at metallic
0.5 — and §3.2 makes "one palette, one material language" a make-or-break
rule, not a preference, precisely because the risk in a 2D/3D game is the
cast and the world reading as two different games. It rendered rust-brown
against a brown hoarding and stopped being safety yellow. So a model
entry may now carry a `paint` map (node → palette role) and `assets.js`
replaces its materials with flat palette colours, keeping every bit of
geometry and rig. The node contract was already enforced there; the
surface is now too. Omit `paint` to ship an asset's own materials.

The fore painting was composed against the **old** occluder rect
(y −1…5), which v4 corrected to −2…14 so a foreground can actually be
cropped by the top of the frame. `art-src/tools/recanvas-fore.mjs` moves
it onto the taller canvas **at the exact world position it was painted
for** — the same pixels, the same world units, simply with room above
them. Its sibling tool pinned an absolute path into a scratch directory
and stopped working when that session ended; this one resolves playwright
through CJS instead, since ESM does not honour `NODE_PATH`.

**Deployed.** The cabinet was lit on the hub and pointed at `eeri/`,
which did not exist on `gh-pages` — Play was a 404. The game, the
catalogue entry and the `worksite` marquee are on the site now, merged
into the site's own `games.js`/`art.js` rather than overwriting them
(the site carries `tokotrip`, which this branch does not, and an
overwrite deletes a cabinet). `deploy-hub.mjs` renumbered every token
from one map, and its guard caught that the site's `hub.js` had grown a
WebXR floor sort this branch never had — brought back before deploying,
or the deploy would have deleted it.

**The textures the model never showed are gone.** Every one of its five
textured materials is covered by the paint map, so those images were
bytes the browser downloaded, decoded into blob URLs and threw away —
and each was an async load still in flight when the hub gate opened the
game and moved on, which is how they were found: a `Couldn't load
texture blob:` error that only Eeri produced.
`art-src/tools/strip-textures.mjs` removes them and compacts the buffer;
it refuses to run if any textured material is NOT repainted, since then
stripping would change what is on screen. Geometry, tri count, node
names, rest pose and pivots are untouched, and the frame is
pixel-identical. 924 → 851 KB.

Known, and the asset producer's call: at 851 KB and 8 740 triangles the
excavator is over the brief's ceilings (400 KB, and 3 000 tris for a
small machine / 6 000 for a big set-piece) — the weight is geometry, not
textures, so it wants decimating rather than re-exporting. Its `wheels`
node has no child spinners, so the wheels do not roll. And the fore
painting still sits below the playfield ground line, so it reads as a
band along the bottom rather than something you pass behind.

Gate: 98 checks, plus 13 against the deployed tree.

## v4 — 2026-08-13
**The depth pass — the Tropical Freeze half, which needs no cast.** The
3D characters are blocked on the Meshy pipeline, so this version moves
the other half of the confirmed reference pair: "2D gameplay, fully 3D
layered world — dramatic depth, the camera drifting on rails, background
layers where things happen, heavy-object weight." None of that needs a
model. It was judged the way the method says — render, LOOK, name what is
wrong, redo — and the LOOK named three things:

**A third of every frame was dead flat brown.** The earth below the lip
was one unbroken slab: the largest area on screen carrying no
information, which is the one thing the reference never does. It is a
cut section now — strata darkening downward, cobbles embedded in the
face, a fresh cut edge drawn either side of every hole, and a hard
shadow under the grass lip, because the lane the game is played on was a
0.14-tile hairline against a flat wall. The bank bands the same way; it
is the room's most important object and it read as a box.

**The occluder lane was buried.** Its rect stopped at y=5 — one tile
above the ground line — so a foreground piece physically could not reach
the top of the frame, and the one girder in it floated inside the dirt.
The "cropped foreground = depth" lesson was written in the brief and
absent from the screen. The rect runs −2…14 now, the whole visible band
at that depth, and carries a real kit: scaffold standards you pass
behind, spoil sweeping the bottom edge, a pipe run crossing above
everything. Two things it got wrong first and the README now states: a
big shape parked at eye level is a blob with the game hidden behind it
(the cable drums were 1.25-unit discs at head height), and a heap whose
crest sits below the playfield's ground line reads as a hole cut in the
earth rather than a mound in front of it.

**The background competed instead of receding.** A haze band sits the far
stack in air, and the skyline lost its internal contrast — crisp two-tone
blocks at that distance read as near and fought the playfield.

Plus the two things the reference has that a spring does not.
**`js/camera.js` is a director**: a site declares SHOTS — zones with
their own dolly, height and lead — and the camera blends across them, so
a room pulls back where it is asking you to read a lock and closes in
where it is not. Over that sit a slow **drift**, so the frame is never
dead still, and a **punch** — a short dolly kick on the dig, the sling,
the span seating and every hit, which is what weight looks like from
behind a camera. And **the background works**: a crane traverses a load
across the skyline and a truck crosses the far road, where before one
digging machine was one event in ninety-six tiles.

**The seam, hardened, because asset input has started.** Art contributes
files to `assets/` and a status flip, nothing else — so the gate now
refuses a manifest path that climbs out of that folder, and measures a
live PNG's pixels against its documented size rather than letting it
stretch silently onto the plane. The size table in `assets/README.md` is
the brief an artist paints to, so it is checked against `LAYER_RECTS` ×
`PPU` in code rather than trusted to have been kept up by hand. Both
guards were verified by feeding the gate bad input and watching it fail.

Gate: 93 checks.

## v3 — 2026-08-13
**The level beyond one room.** Walking through the gate now leads
somewhere: sites are data (`SITES` in `js/level.js` — map, bolts, spawns,
exit, and which lock the room carries), one `buildSite()` builds a room
into a single group and tears the old one down whole, the kid and the
machine persist, and the camera **cuts** to the new room — a slow pan
across a rebuilt world is a lie about geography. Each room's machine
starts unmanned again: taming does not carry between sites, so the mount
is read every time, which is the point of it.

Site 2 is **the girder** — the second manipulable piece, its contract
already waiting in the manifest: stacked → slung → seated as a span. The
gap is eight tiles, past *both* of them — the kid's jump falls short and
the machine refuses the cliff. The same gesture as the dig works it the
other way round: hold the bucket in the stack and the chains take the
load (the machine drives at ×0.55 while carrying — a machine earns its
slowness); lower it at the lip and the span seats, filling the MAP row
the way the dig cleared one, so the bridged gap is a fact about the
level. The kid crosses on foot, because the exit is his half of the job.

Found by LOOKING, not by the gate: a slung load hung a fixed length
under the bucket and **sank into the ground** when the boom came down —
now the chains go slack and the load rests, never sinks (the rest depth
is measured off the asset's own bounding box, so a live GLB keeps the
behaviour). Found the flaky way: the GPU-less sandbox runs the clock
~5× slow, so a mount that takes 0.55 s of game time takes ~3 s of wall
clock — the test's retry loop now walks back up and gives each attempt
real time, and the crossing is asserted mid-span instead of demanding a
36-tile walk inside a wall-clock timeout.

Gate: 65 checks.

## v2 — 2026-08-13
**The loop.** v1 had systems and no game: riding was strictly worse than
walking (45% slower, no jump, a five-times wider body), the boom was a
verb with no object, and the room had no reason to go right. v2 is the
answer, and it is the owner's: **a machine is dangerous until it is
yours, and the room is a lock the machine opens.**

The excavator now starts **unmanned** — amber beacon turning, working its
own slow dig cycle. It is not hunting Eeri; it is heavy and blind, and
standing under the bucket while it sweeps puts him down. The lift is the
window, so **mounting is the skill test**: read the cycle, take the step,
and the beacon goes out — the threat is now the tool, permanently.

The room is two obstacles, each shaped for exactly one of them. **The
pit** is kid-shaped: he clears it in a run, and the machine refuses a
cliff. **The bank** is machine-shaped: three tiles of dirt above his
jump, taken down a row at a time by holding the bucket in it. Digging
edits the **map**, not the picture, so the level really changed; the
bank's cut face and spill are drawn per state (`js/pieces.js`, behind the
same asset seam as everything else, contract `state0/1/2`). Walking out
through the gate the machine opened is SITE CLEAR.

Fixed on the way: a queued `action` press was consumed again the instant
riding began, so a player who mashed E climbed in and fell straight back
out — the same double-consume trap Suds Jack paid for, now drained at
both edges. The HUD moved to the top-right; it had been sitting under
`hub/shell.js`'s HOME button, unreadable, in every screenshot.

Gate: 49 checks.

## v1 — 2026-08-12
Gate-1 diorama slice, asset-ready. The full layer stack (sky / skyline /
far / mid / near / foreground occluders) as code-painted cutouts at real
z-depths behind a 24° long-lens camera; tile-grid level with collision
(ground, mounds, steel platforms, a pit, a girder); Eeri on foot (run /
buffered+coyote jump / hard-landing squash); the excavator as first mount
(E to climb in via the step, drive with heavy ease, W/S boom on real
hinges, hop out); 19 bolt spinners to collect; a depth-tinted background
excavator working a dig loop on the far layer; blob shadows, exhaust
puffs, touch buttons. **The asset seam is live:** `assets/manifest.json` +
`js/assets.js` — every model and 2D layer swaps from code placeholder to
PNG/GLB file with a one-word manifest edit against the node contracts in
`assets/README.md`.

The first hazard is in and it sets the pattern: a wrecking ball hangs dead
still until you come near, then **winds back** — chevrons pulsing, one
warning tone — and only then swings. Nothing here kills; the cost is the
**Yoshi rule**, a hit takes the RIDE (thrown clear of the cab) and never
the run, with mercy frames on foot. A synth kit carries it, including a
diesel bed whose pitch rises with the machine's load, and the arcade
cabinet (`worksite` cover), the way home and the Toko signature are
mounted. `prefers-reduced-motion` stills the decorative background
machine and holds the chevrons steady instead of flashing.

Not yet: more machines, more world themes, the level beyond one room.
