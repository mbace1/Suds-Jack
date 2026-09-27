# Powder — versions

The `## vN` heading at the top is what the arcade floor shows as the build
number (`scripts/versions.mjs` reads it at deploy time). The `?v=N` token on
the module graph is a cache-bust, kept separately.

## v12 — 2026-09-27
A rocket sled, off the concept plates — and the feel the formula brief
actually meant: tiny, exact movements flat out, a board's lean slow.

THE ASK (owner): "Make the ships look more like the reference concept art
than actual formula cars. The formula reference was only to high octane
racing with miniscule movements at high speed and more snowboarding like
at lower speeds. It's a rocket sled after all."

THE SHIP (`craft.js`). The plates in `ref/`, read as a set: a long cream
fuselage from a chrome nose cone, a bubble canopy, the hull cut open behind
the cockpit on a bay full of machinery, the accent on the lower half with
a flaked edge, rust at the nose and round the bay, a number roundel on each
flank — and CHROME CANS the size of the cockpit, which is what every plate
is about. Built as a kit again, lofted: the fuselage pinches in over the
bay and the livery paints that stretch dark, so the pinch reads as a hole
with finned blocks, headers and a blower in it. NOSE carries its two cans
either side of the nose on stub pylons, open fans in their mouths, and a
smaller pair of sustainers at the tail (the "5" plate, cans fore and aft;
the thrust is still all at the front, they only burn). AFT hangs two big
cans off the rear hub, bores to the chase camera, a spinner in each, one
dorsal fin. The formula kit's wings, halo, floor and the pods on wishbones
are gone, and the hover cushion is invisible, as on every plate — only its
glow on the sand is left (`posePods`).

Found on the way: the livery canvas was painted nose-at-top and then
FLIPPED on upload (`CanvasTexture.flipY`), so the bay's dark band landed a
metre forward of the bay, across the back of the cockpit. And the budget:
the first cut was 10.5-11.9k triangles, over the pipeline's 9,000 for a
ship — the finned bay blocks were most of it. The references re-exported
and round-tripped at 8,938 (NOSE) / 7,794 (AFT).

THE FEEL, measured first (`test/ladder.mjs`, new: speed x lock in SIM time,
the race loop paused, on the rock-cleared flats — on the rift floor half the
mid-speed runs met the canyon wall and read as a handling washout). v11 had
it half right and half backwards:
  - NOSE was already fine-grained fast (a quarter lock at 50 m/s: 7 deg of
    heading in 2 s) but never leaned slow: 11-13 deg of bank at most.
  - AFT slid at EVERY lock from 30 m/s up — 8-10 m/s of slip at a QUARTER
    lock — because full power ate the rear grip (`rearCircle` 0.28).
Three changes:
  - the lock shrinks as 1/v past 20 m/s (`lockRef`, floor `lockMin` 0.34),
    not on a line — the yaw rate a given g needs IS 1/v, so the stick asks
    for the same g at every speed: 1.0 to 20 m/s, 0.67 at 30, 0.4 at 50.
  - the bank depends on speed: `bankMaxSlow` 27 deg and `bankSteerSlow` to
    12 m/s, blending to 11 deg by 40. The pilot's lean reads the STICK, not
    the speed-scaled steer, so a slow turn goes over on its edge at once.
  - `rearCircle` 0.28 -> 0.14.
Held-speed ladder, v11 -> v12 (heading in 2 s / slip m/s / bank deg):
  NOSE 10 m/s full   89 / 2.0 / 11  ->  89 / 2.1 / 26
  NOSE 50 m/s quarter 7 / 0.7 / 3   ->   5 / 0.5 / 3
  NOSE 50 m/s full   28 / 9.2 / 11  ->  21 / 5.9 / 9
  AFT  50 m/s quarter 20 / 9.6 / 3  ->   5 / 0.6 / 3
  AFT  50 m/s full   38 / 17.2 / 7  ->  22 / 6.7 / 8
  AFT  30 m/s half   45 / 10.9 / 5  ->  24 / 1.8 / 9
AFT is still the looser at half lock (4.0 m/s of slip at 50 against NOSE's
1.4): power steps the tail out, it just has to be asked. The look run's
carve at 174 km/h: slip 7.0 -> 2.6 m/s at 11.5 deg of bank.

Not measured here: a real phone. `thumbs`/`keys` are wall-clock harnesses
and this change moves the vehicle, not the input paths.

Tokens: per module, as AGENTS.md has it — `craft.js` and `vehicle.js` (their
bytes changed) and `main.js` (it imports both) go to `?v=12`; every other
module keeps `?v=11`, byte-identical to v11, so a returning player's cache
keeps them. (Until v11 this log moved the whole graph together.)

The import path (`craftFromModel`) gets two fixes the kit exposed. Each
distinct HULL map now gets its own material: the reference export carries
the mapped fuselage AND unmapped trim, and with one shared material the
trim's panel texture replaced the livery. And an imported ship gets the
cushion's ground glow the kit has, since it has no pods either.

## v11 — 2026-09-27
A formula car that carves the sand like powder — and, underneath it, two
bugs from the rebuild that had the car pointing the wrong way.

THE ASK (owner): sand stays, but the feel should be carving in powder; a
lower camera, the view widening with speed, speed streaks, more top end;
formula-shaped craft; major visual upgrades.

TWO BUGS FROM THE REBUILD, found by looking at the carve shot. The mesh took
`+yaw` where physics and camera take a right-positive yaw, so the ship
turned the opposite way to everything else: at a heading of 20 degrees it
sat 40 degrees off its own path, and through every turn it swung its nose
out of the corner. And the pads' feet were placed `pos + forward * z` while
the kit and every moment put the nose at -z, so the front pads read the
ground behind the car and the rear pads the ground ahead — self-consistent,
so nothing ever diverged, but every crest unloaded the wrong end first and
the car rode 3 degrees nose-UP down the 4.5% grade (it follows it now, 3.7
down). A third, older one: the pad damper worked on ABSOLUTE vertical
velocity, and on the grade the ground falls away at ~2 m/s, so the dampers
pulled every pad off the sand. On the dune test venue the v10 car was in
the air half the time at 150 km/h; v11, 0%.

THE CARVE. The sled BANKS into a turn (each pad's rest height offset by the
bank, lagged 0.12 s: 4-8 degrees at 0.4-0.7 g, 15 at most), and a bank into
the steer is the EDGE: up to 38% more grip, and the lowered pods dig in.
The runners PLANE — sink falls as the square root of speed from 4 to 34 m/s,
so the sled rides up on top as it gets going — and each pad PLOUGHS by its
own sink and speed instead of one drag multiplier. Measured with the NOSE
chassis on the dune venue, 3 s of sim per phase: a quarter lock pulls 0.37 g
at 0.7 m/s of slide, half 0.71 g at 1.4, full lock slides at 10.6 m/s and
1.07 g, and releasing it straightens in about a second. v10 on the same sand
slid 2.4 m/s at a quarter lock and leaned OUT of every turn.

GROOVES. Each pod cuts one. The first cut was a ribbon laid a few cm over
height(), and it never showed: the ground is drawn on a 6.25 m grid, so the
rendered sand sits decimetres off the height function between vertices and
the ribbon was half buried, half floating. `trench.js` is now a TRAIL MAP —
a render target round the player that the pods stamp (depth and berm,
max-blended) and the ground shader reads: the floor darker, the walls
embossed toward the low sun, the berm lighter, the wind ripples wiped where
a pod went through.

SPRAY AND SPEED. Particles are STREAKS (`streaks.js`), drawn as their motion
relative to the camera, not as discs. The sheet leaves the OUTSIDE of the
carve; the rooster tail stays low; grains in the air sit below the lens so
none reads as a scratch across the sky; everything fades out before it
reaches the glass. The seat is a formula chase seat — 8.6 m back and 2.35 m
up — with the field of view opening from 60 degrees with speed and the frame
banking into the carve with the car. C / RB swaps to the old high seat
(remembered). Planing is where the top end came from: 185 km/h flat out on
the dune, 225 with the boost.

THE FORMULA KIT. Needle nose, halo, sidepods, front and rear wings with
endplates, four sprung pods on wishbones that sit on the sand under their
pads and steer at the front; NOSE carries its cans beside the cockpit, AFT
in the gearbox. About 7.5k triangles and 22 draw calls. The sidepods and
engine cover are in the cream livery with the colour in the stripe, like the
plates — in the accent colour, the car read as a maroon lump from behind.

LIGHT AND SHADOW. The ships never threw a shadow on the sand: three draws a
shadow map with the layers of the camera it is rendering for, and the pass
that draws the ground never saw the HD ships. Each ship now carries a few
boxes on their own layer that the world pass draws with no colour and no
depth, and that cast. And a SHIP LIGHT, HD layer only, from over the
camera's shoulder: the route runs toward a low sun, so every car you chase
is backlit.

SKY. The ringed body is lit — a half phase with a soft terminator, bands, a
lilac limb, a ring with a gap in it, the body's shadow across the ring and
the ring's across the body — and smaller. The flare keeps only the ghosts on
the sun's side of the frame centre: past that they sat on the car.

MEASURED. 319 draw calls and 105k triangles a frame at high (v7: 284 / 79k)
— the difference is the kit, 22 draws a ship against 14. Under SwiftShader
a frame costs about 1.8x v10's at low, spread over fill rate with no single
cause (ships, spray and trail each move it by a quarter frame), which is why
the wall-clock harnesses (keys, thumbs) read slower this version: read their
deltas against a v11 run, never against v10's numbers.

HARNESSES. `test/look.mjs` shoots the race through the game's own camera
(menu, start, cruise, carve, rift, boost); `test/car.mjs` is the kit on a
turntable; `debug.advance(n)` runs the whole race step n times at the sim's
rate, so a shot is of a carve in progress rather than of a car still
landing. `refexport.mjs` had lost its output path; it walks the nested kit
now and merges the reference manifest instead of dropping the derrick.

Tokens: every module `?v=10` → `?v=11`, moved together.

## v10 — 2026-09-26
Your thumbs, measured at last; and the Blender fans spin.

TOUCH. The owner's main control scheme is on-screen twin-stick touch, and
every controls number before this came from drive2 / corner, which override
`input.read` with exact values — so they measured the physics and bypassed
every scheme equally. `test/thumbs.mjs` drives the real touch path through
CDP touch events and found a fault only a thumb could have: the stick's gate
was a CIRCLE, and on the left stick x is steer and y is throttle, so full lock
was only reachable at y = 0, which is zero throttle. Full lock and full power
together were impossible; the most of both at once was 0.71 steer.
The first guess was that the forced lift-off stepped the tail out. It did
not — slip was 5.4 m/s against the keyboard's 5.8. The cost was the turbine:
the natural hard-turn gesture took N1 from 0.62 to 0.27 in 1.5 s where the
keyboard came out of the same turn at 0.90, and thrust goes as N1 squared.
The gate is SQUARE now: each axis clamps on its own, the way W and D are
independent keys. Thumb up then slid right sends 1.00 steer and 1.00 throttle,
turns 17° (keyboard 17°) and holds N1 at 0.85 (keyboard 0.90). Nothing changes
inside the circle, where the two gates agree; only a thumb past the rim reads
differently. A pure sideways sweep still cuts power, because a thumb that is
not pushing up is not asking for it — no throttle is added that was not
asked for. The on-screen stick draws the same square and its knob clamps the
same way, so it never shows a thumb stopping short of where the game hears it.

BLENDER FANS. The authored ships' turbine discs orbited the hull and rendered
black: built in world coordinates, each disc's origin sat at the ship's centre
so `rotation.z` swung it round a 1.1 m circle, and a bmesh ring has no uv so
the turbine texture sampled (0, 0) everywhere. `craft.js` re-centres a loaded
fan on its own origin and gives a mapless disc a planar uv; the authored
scripts do both at source.

Tokens: every module `?v=9` → `?v=10`, moved together.

## v9 — 2026-09-07
The keyboard, and the door for Blender.

CONTROLS, second pass, on the report that they were still a nightmare. A key
is a switch, and full lock the instant it closes is a slide at any real
speed; the sticks and the pad are analog and the keyboard was not, and it
was the keyboard the report came from. Digital steer now ramps — 0.22 s to
full lock, 0.09 s back — so a tap is a quarter turn and a hold is a
committed one. The lock the driver can ask for shrinks with speed (all of
it below 72 km/h, 55% at 160), since the sustainable yaw rate falls as
1/v and asking for more is a slide whatever the rudder does. The turbine
spools in 0.75 s instead of 1.3, so idle to half thrust is 0.8 s, not 1.4.
In a slide the camera looks half way to where the sled is GOING, so the
sled slides across the frame instead of the world swinging round it. The
brake means something now. Measured through real key events: one second
of A at 140 km/h is 17 degrees of heading with 7.8 m/s of slide, where it
was a spin.

THE BLENDER PIPELINE. `pipeline/README.md` is the contract — units, frame,
envelope, material names, the empties, the budgets, the 2D pieces — and
`js/models.js` enforces it: a .glb that breaks it is reported in the
console and not used, and that chassis stays on the kit. So exports can be
early and often; a bad one never breaks the build. `pipeline/powder_blender.py`
builds the template scene, validates against the same numbers, and exports
with the right flags. `models/reference/` holds the kit itself exported in
exactly the expected form, to import into Blender before modelling; load
the game with `?models=reference` and the whole door is exercised with no
Blender in the loop — both ships load, validate, dress in the game's
chrome and race at 14 draw calls, and two landmarks bake into the tiles.
Landmarks are vertex-coloured set pieces the tile bake takes as-is; ships
keep their painted hull texture and get everything else from the game.
`art/numerals.png`, when it exists, replaces the drawn roundel numerals.

## v8 — 2026-09-07
The controls, on the owner's report that they were a nightmare and did not
work. They were right, and it was three separate faults.

THE SLED HAD NO DIRECTIONAL STABILITY. There was no self-aligning moment
anywhere in the model, so nothing ever brought a slide back. Measured, full
lock from a cruise ran away to 1.41 rad/s with 18.6 m/s of slide and stayed
there; releasing the stick did nothing. A long body with a slip angle wants
to line back up with where it is actually going, and that restoring moment
is why a real vehicle does not spin the moment the rear steps out. It is in
now, tanh-saturated so it stabilises without ever out-arguing the driver.
Release from a full-lock slide recovers to nearly straight in two seconds,
and opposite lock pulls 21 m/s of slide down to 10 in just over one.

THE RUDDER WAS BOTH TOO SLOW AND, WHERE IT MATTERED, TOO WEAK. Steering had
a 0.73 s time constant: the heading moved 1.8 degrees in the first quarter
second of full lock, which is a quarter second of the game ignoring you.
Worse, the axle forces are themselves a yaw damper worth more than the
explicit one, so while the runners had grip the sled was far lazier than the
arithmetic said, and it only woke up once it was already sliding. Lazy while
planted and eager while sliding is exactly backwards. The rudder is five
times bigger now and FADES WITH SLIP, because it is the runners biting and
not an air vane: small inputs get an answer, and you cannot steer yourself
into a spin. The lock ladder at 90 km/h now runs 0.13 / 0.40 / 0.54 rad/s
with 0.7 / 4.8 / 9.5 m/s of slide, and at 140 km/h everything slides —
so corner speed is a real decision again.

THE KEY MAP WAS INCOHERENT. The arrow cluster was split three ways: up and
down were the weight axis while left and right panned the camera, and
neither did what an arrow key does in any other game. Arrows now mirror
WASD. Space is boost, Shift is the spoiler, Q and E pan. One job per key.

Two more things found while measuring. On touch, holding only the RIGHT
stick silently forced 75% throttle — so reaching over to pan the camera
opened the taps by itself, against this build's own no-auto-throttle rule.
And the SLIP readout now carries the grip state in its colour, because
without it there is no way to tell turning from sliding until the scenery
tells you.

## v7 — 2026-09-07
Layers over the 3D, on the owner's direction — and the HD layer made
honest first. Until now the canvas itself was 0.62x, so "HD" only meant
"not dithered"; the docs said full-resolution and the code did not. The
PS2 world now renders into its own 0.62x buffer and is blitted up soft
into a full-resolution canvas, and the ships, flames and sparks are drawn
over it at the window's real size.

Over that sit two new screen-space layers. HEAT HAZE: after the HD pass
the finished frame is copied into a texture and refracting sprites at the
nozzles — and a mirage band along the horizon, hotter on the salt — bend
it, so the exhaust and the hot ground displace what is behind them rather
than drawing anything of their own. And the sun's LENS FLARE, the one
thing every reference plate has: a blown halo and ghost rings marching
through the frame centre, occluded by the canyon walls.

The ships went through the MODEL SHOP. Chrome is real chrome now — metal
at roughness 0.1 reflecting a two-tone world (violet sky over white sand,
a hard horizon bar, one hot sun) filtered once through PMREM, which is
exactly what the plates' nacelles show. Each can carries a spinning
turbine face in its mouth, a nozzle bell with the flame inside it, dark
bands, plumbing back to the hull and a pump block. Everything static is
merged per material, so a ship is 14 draw calls with all that detail
(it was 23 without it).

The rockets answer the turbine. The flame runs RICH while the throttle is
ahead of the spool — orange, short, fat — and LEAN once N1 has caught up,
with shock diamonds streaming out of the bell at the turbine's rate; the
fans spin with N1; the exhaust haze goes as N1²; and revving on the spot
on sand throws ROCKET WASH behind the cans — behind the nose on the front
sled, behind the tail on the aft one.

The six concept plates are in `art/`: the chassis you are about to race
is shown on the menu (nose-green / aft-five) and the results frame one.

## v6 — 2026-09-06
Gamepad, and a measured frame budget.

The pad is the scheme's natural home, because both axes v5 added are
analog: the turbine spools, so part throttle is a real choice, and weight
is a lean, not a button. Left stick steers and works the throttle, right
stick pans and is your weight, RT/LT are throttle and brake for anyone
who expects a racer to work that way, A drops in, Start pauses, Y swaps
the chassis. It feeds the SAME control struct as keys and glass and is
merged with them rather than exclusive, so a stick in one hand and a
keyboard under the other still works; the touch overlay hides itself
while a pad is driving.

Then the frame was measured for the first time since v5 put two
full-resolution passes on top of the composer. Two things came out of it.
The depth prepass was re-rendering all 121 streamed tiles at full
resolution when it only exists to occlude the ships, so it is now culled
to the range of the farthest ship — 118 draw calls down to 44. And the
props were 1420 separate meshes for 30k triangles, about 21 triangles a
call, each drawn twice (shadow map, then world); everything but the
floaters is static and shares a flat Lambert colour, so each tile's props
now bake down to ONE merged mesh with the colour in a vertex attribute.
Together: 929 draw calls to 384, for 15% more triangles (the merged mesh
culls at tile granularity, which is what the terrain already did).

## v5 — 2026-07-27
Controls rebuilt round a WEIGHT axis. Left stick steers and works the
throttle; right stick pans the camera left/right and is your weight
up/down — back to boost and lift the nose like a hot rod on the launch,
forward to press the nose down like a front spoiler, which adds front
grip and costs no speed. Two chassis, swapped with F: NOSE rockets pull
you through the corner (thrust acts along the steered front); AFT
rockets carry a bigger rudder and step the tail out under power. Both
measured — nose 0.65 rad/s at 2.7 slip, aft 0.89 at 6.3.
Rendering is now two layers: the world stays PS2 (0.62x, posterised,
dithered, soft upscale) and the SHIPS are HD — full resolution over the
top, Phong speculars, panel-line and rivet maps, layered rocket flames,
spark showers off rock and every wall strike, and a fine spindrift
curtain off the loaded outside runner in a carve.

## v4 — 2026-07-27
Second pass on the owner's direction. The sleds are rocket-propelled at the
FRONT and handle like a front-wheel-drive hot rod: thrust acts along the
steered nose, grip is per axle from the pad loads, power eats the front's
traction circle (push) and lifting off unloads the rear (the tail comes
round) — neither scripted. The sand SINKS: each runner settles under load
and the lateral bite arrives late on soft ground. The whole field is now a
mellow 4.5% mountain, the canyon is ~1.8x wider, and roads cross it on
bridge decks you can ride or run under (a two-layer ground query, since a
heightfield cannot hold a bridge). Whites and greys in the sand, purples in
the sky, a sun that blooms, and a PS2 render: 0.62x soft upscale, Lambert,
hard shadows, posterise + Bayer dither.

## v3 — 2026-07-27
Rebuilt from scratch on the owner's direction: simulator-like detail, surreal
3D, flatlands with canyons. A rigid body on four sprung hover pads at a fixed
120 Hz, a turbine that spools, slip-limited grip, walls that are not
special-cased. An open tile-streamed world with a salt-floored rift and the
breaches that make it enterable — their width measured, not guessed. Violet-
to-amber sky, a ringed body ahead, floating rock, bloom and heat shimmer. A
telemetry cluster for a HUD. The owner's wordmark on the intro.

## v2 — 2026-07-27
The burn economy measured and fixed: dive-and-spend had been 36% slower than
never touching the mechanic. Deep no longer pays the carve scrub twice, a tank
lasts long enough to be worth charging, and the packed line is a ribbon so the
deep snow is a lean away rather than a trek.

## v1 — 2026-07-27
First build. A heavy hover racer carving a deep-powder descent, rendered
PS1-style against the Moebius/Otomo reference plates. Twin-stick touch.
