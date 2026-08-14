# EERI — versions

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
