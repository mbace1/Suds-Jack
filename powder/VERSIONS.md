# Powder — versions

The `## vN` heading at the top is what the arcade floor shows as the build
number (`scripts/versions.mjs` reads it at deploy time). The `?v=N` token on
the module graph is a cache-bust, kept separately.

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
