# CONCRETE

## v5 — 2026-09-20

**The room is a level now.** Every prop stands in ONE table (`PROPS` in
`skate.js`) holding where it is, how big it is, how tall it is and whether its
top edges take a grind — and the physics, the procedural dressing and the
grind list all read that one table, so what you can see is what you can hit.
v4's shelving, lockers and stair set were drawn by the procedural tier only,
existed on no other tier, and stood in the run-ups to two of the three ramps;
they are gone. The gate asserts no prop stands inside a quarter pipe, its
run-up or the funbox.
**Solid objects.** A crate, a cabinet, a locker, a bin, a bench and the funbox
are things you ride onto or stop against rather than through. **A wall is
where the ground stops being SMOOTH** — the rise over this step measured
against what the local slope predicts — because measuring the rise alone reads
the steep half of a quarter pipe (1.2 m per metre) as a wall and slams anyone
who carries speed into it. In the air the test is against the **apex** of the
ollie you are in, not your height right now: measured against the current
height, ollieing onto the funbox from the side slammed every time, because the
board crosses the edge early in the arc.
**Quarter pipes have decks.** `ground()` promised 3.6 m of height behind each
coping over nothing at all; `DECKS` gives each one a platform, drawn on both
tiers.
**Stalls** (owner's ask). Triangle into a lip hangs the board on the coping —
Axle, Nose, Tail or Rock to Fakie, named by the direction held — and cross
ollies out of it while letting it run drops you back in. A roll-in is **not a
transfer**: the transfer check read the transition's own fall as an edge and
popped the skater into the air at the bottom of every ramp, which is the same
smooth-versus-step confusion as the wall, with the sign flipped.
**Ledges.** A grindable line is an axis, a length and a height, so a rail down
z and a crate edge along x share every rule (`nearRail`, `crossesRail`). The
funbox's four top edges, the crates' four each and the benches' two are
grindable; approach along the line for a 50-50, across it for a boardslide.
**A rail is only an obstacle when you CUT ACROSS it.** Riding the line itself
put the across-coordinate at exactly zero, and `Math.sign(0)` is 0, which is
"opposite" to every sign — so the skater stopped dead on open floor beside its
own rail and pressing forward re-blocked it every frame, with no way out. It
takes strict opposite signs, a transversal approach and real speed now.
**The gate drives a DualSense through all of it**, with `debug.placeAt` as
setup only: a crate stopping a run, an ollie onto the funbox into a ledge
grind, a stall on the coping and a clean roll-in with the transfer counter
proving no pop, and a rail line that banks. `debug.props/rails/ground` expose
the room's own tables so the gate asserts what the room contains rather than
what a screenshot suggests.
**`concrete/THPS_PARITY.md`** is the ordered distance to Tony Hawk's Pro
Skater, with a recommendation per item and three things deliberately out of
scope. Tokens: main v6, skate v7, skater v2.

## v4 — 2026-09-19

DualSense edition. Every menu on the page — title, pause, options, controls —
is walked with the d-pad or stick, cross confirms, circle backs out, Options
pauses, Create resets position, and the on-screen glyphs follow whichever
controller was touched last (PS shapes on a DualSense, letters on an Xbox pad,
keys otherwise). The layout is THPS's own: cross ollie, square flip, circle
grab, triangle grind, L1/R1 spin in the air, R2 push.

**Triangle now grinds.** In v3 the pad wrote straight into the key table and
skipped `key()`, which is where the grind buffer is armed — a controller could
ollie, flip and grab but never once snap to a rail. Every pad button goes
through `key()` now, and a cross that confirmed DROP IN is drained so it is
not also the first ollie of the run.

**Ramps ride like ramps.** The ground function has a slope now and the physics
reads it: gravity along the heading slows a climb and speeds a descent, the
rider pitches with the transition, pushing fades out on steep wood, and the
old "hit 2.8 m and teleport into the air facing backwards" launch is gone.
Off the lip of a quarter pipe the board goes UP (vy from the speed you
carried), turns around at the top and lands back on the same transition,
then rolls out with the speed the descent gives back. Too slow for the lip
and you roll back down fakie without leaving the floor. A bail now gets up
where the skater fell — v3 reset to the start of the room, which turned every
slam into a walk across the warehouse — and the board slides off ahead while
they are down. Spins are scored on landing (180 per half turn) and a near
landing is straightened THPS-style; coming into a rail across it is a
boardslide, along it a 50–50.

**The skater is in the register of the original THPS**: `skater.js`, a
few dozen Lambert boxes with an eight-pixel face and a shirt print drawn on
canvases with the filtering off, and eleven poses written as edits of one
crouch so the legs always agree with the hips. Poses snap rather than blend,
and on the PS1 look they update at fifteen steps a second with the vertices
snapped to a 160×120 grid. It is the house skater on both tiers; the Blender
rig is the SKATER option, loaded on demand, and still promises its twelve
clips and grab contact on desktop.

**The look** (`look.js`): a wet concrete floor that reflects the skater, the
sparks and the lights — a real mirrored second render through the vendored
Reflector, masked by a wetness texture, refreshed at most every 40 ms —
slanted shafts of window light, and a PS1 mode that draws the whole frame at
240 lines through a Bayer dither with the shadows off. LOOK and REFLECTIONS
are options, persisted under `concrete-opts`; reflections default off on the
mobile tier.

`assets/validation.json` is regenerated: the committed copy recorded hashes
for the board and skater GLBs that the files in the tree do not have, and the
validator rewrites it on every run anyway.

Gate: the playthrough now injects a DualSense and drives the menus, the
triangle grind, Options/Create, the vert launch and the roll-back through
`navigator.getGamepads`, and asserts a bail recovers in place. Tokens: main
v5, skate v6, art v5, style v3; skater, look and pad are new at v1.

## v3 — 2026-09-10

Fix the first-tap debounce so Drop In responds immediately on the fast mobile
procedural renderer. Browser coverage now verifies mobile without GLB requests,
keyboard/touch combos and grinding, plus desktop Blender clips and grab contact.
Main module v4; game art and physics unchanged.

## v2 — 2026-09-09

Blender art edition. Original rigged human skater and concave skateboard; modeled warehouse, quarter pipes, funbox, rails, pallets, crates, cable reels, cones, ventilation and lighting fixtures. Twelve in-place animation clips with visual-only foot and grab-hand IK. Six original material families, editable decals and a pooled effects atlas.

Desktop and mobile GLB variants load automatically. Query `?quality=desktop` or `?quality=mobile` forces a tier. WebP textures inside GLBs are used because the environment blocked the KTX tool download; original PNG sources are retained. Physics and scoring remain authoritative; missing models leave the procedural fallback playable.

Player entry: `concrete/index.html`. Visible build: `CONCRETE v2`.

## v1 — 2026-09-09

Warehouse vertical slice: two-minute sessions, ollies, kickflips, grabs, rail grinds, combo banking, bails and reset. Keyboard/mouse, native gamepad, and separate touch movement/camera sticks.
