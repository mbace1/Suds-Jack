# Tiny Hawk versions

## v6 — Special meter

- Added a THPS-style Special meter that fills only when complete landed lines bank successfully.
- Added four fat-bird signature tricks: Wingspan Grab, Featherflip, Talonflip and Eggplant Impossible.
- Made signature tricks consume the live meter and made bails kill the Special state.
- Added Special-trick session goals and a dedicated HUD meter without changing the Skate-style flick controls.

## v5 — Fat bird protagonist

- Replaced the abstract prism skater with a permanent fat bird riding a complete skateboard.
- Built a readable faceted silhouette with belly, head, beak, eyes, wings, tail, feet, trucks and wheels.
- Added speed-aware feather shimmer, grounded effort beats and wider airborne wing flares.
- Preserved crouches, flips, shuvits, grinds, manuals and bail animation across the full character rig.

## v4 — Skate-style ground flicks

- Connected loaded diagonal pops to kickflips and heelflips instead of discarding them on the ground.
- Connected a loaded sideways swipe to a pop shuvit with the same ollie impulse.
- Preserved straight release/up ollies and airborne follow-up flicks for longer combos.

## v3 — Reliable right-stick pop

- Sample touch and mouse flicks at event time so fast gestures cannot disappear between rendered frames.
- Pop when a loaded stick springs back toward centre, while preserving the full down-to-up flick.
- Preserve a loaded ollie when the touchscreen thumb releases and guarantee one action per gesture.

## v2 — The Part

- Rebuilt the prototype around the concept's five-film roguelike run.
- Added a deterministic 13-row branching map with spots, sessions, shops, events, rests and a rival.
- Added goal sets, UTC Daily with three tries, relic trade-offs, trick lessons and footage economy.
- Added story choices with persistent sponsor, skate-stopper, rival and injury consequences.
- Added three district washes and an end-of-run tape recap with rank.
- Reworked scoring so repetition, fakie, insurance and every multiplier resolve in one landing-gated combo system.
- Made Part node commitments survive exits and reloads, preventing route and goal rerolls.
- Charged Daily attempts when filming starts and limited Insurance Clip to one save per node across retries.
- Guaranteed a new board part from each cleared Session, with footage compensation once the collection is complete.
- Preserved and extended the validated flick-it controls, chase camera, grinds, manuals, touch and gamepad support.

## v1 — Control prototype

- Third-person heightfield park, faceted prism skater and Skate Story render treatment.
- Flick-it and Tony Hawk controller schemes, ollies, air tricks, landing judgment, grinds and manuals.
