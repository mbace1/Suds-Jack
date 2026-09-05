# Powder — versions

The `## vN` heading at the top is what the arcade floor shows as the build
number (`scripts/versions.mjs` reads it at deploy time). The `?v=N` token on
the module graph is a cache-bust, kept separately.

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
