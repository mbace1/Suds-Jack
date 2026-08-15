# EERI — versions

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
