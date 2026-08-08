# Flash Prince — versions

The public release number. The `?v=N` token in `index.html` is a separate thing: it tracks every module-graph change so a browser cannot serve half of one build and half of another. Bump both when shipping.

## v6 — 2026-08-08

The remake stops behaving like a set of selectable movement rooms and becomes the beginning of an actual cinematic-platformer route.

- **Five connected fixed screens:** walking off the side now hard-cuts into the adjacent jungle screen, and the route can be traversed back in the opposite direction.
- **Movement choreography:** the layouts escalate from run/jump gaps into staggered ledges, climbing, hanging, low traversal and controlled drops so the advanced body vocabulary is part of the route rather than a demonstration.
- **Jungle first:** layered canopy, mist, hanging vines and foreground silhouettes remain dominant throughout the opening.
- **Sci-fi reveal:** pod → beacon/cable → embedded panel → buried conduit → a geometric doorway in the fifth chamber. Technology is discovered progressively inside the vegetation rather than replacing it.
- **No animation regression:** v5 crouch, roll, climb-down, shimmy and low-mantle frames remain layered over the dense v3/v4 run, walk, jump, stop, pivot, catch and pull-up animation set.
- **House controls retained:** dual sticks remain default; buttons remain selectable from Controls.

## v5 — 2026-08-08

The jungle slice now carries the rest of the cinematic body vocabulary instead of falling back to sparse legacy poses.

- **Crouch + crouch-walk:** four distinct weight-transfer drawings rather than a low standing pose sliding sideways.
- **Roll:** five authored phases from tuck through shoulder rotation to recovery.
- **Climb-down:** stand at lip → sit/turn → hands take weight → full hang.
- **Shimmy:** alternating hand-transfer/body-swing drawings while the ledge anchor stays exact.
- **Low mantle:** plant → drive knee/body over → recover to standing, with the existing one-tile contextual traversal rule unchanged.
- **Stand-up:** three-stage recovery instead of snapping from crouch to the normal standing body.
- The approved v4 run, walk, jump, brake, pivot, ledge-catch and pull-up layers remain underneath unchanged.
- Four lush jungle traversal compositions remain the playable testbed, with small sci-fi traces embedded in the foliage.

## v4 — 2026-08-08

The movement work is now presented inside the first environment target instead of grey movement-test rooms.

- **Layered alien jungle:** distant canopy silhouettes, multiple trunk depths, mist, hanging vines and near-black foreground foliage cross the picture plane.
- **Sci-fi stays small:** a half-buried pod, tiny beacon lights, cable/panel traces and geometric fragments are discoveries inside the vegetation rather than the dominant look.
- **Traversal compositions:** the four opening screens now use gaps, staggered ledges, climbs and drops designed to exercise the cinematic movement set rather than flat laboratory floors.
- **Advanced movement retained:** dense run/walk animation, standing/running jump phases, hard stop, planted pivot, ledge impact, hang and multi-stage pull-up remain the character foundation.
- **Mobile controls:** house dual sticks remain the default, with the button layout available from Controls.

## v3 — 2026-08-08

The remake movement lab shifts from a procedural angle rig toward dense, authored cinematic-platformer animation.

- **12-drawing run cycle** with separate contact, recoil, passing, high, flight and reach phases, plus uneven exposure so planted frames read longer than airborne ones.
- **8-drawing walk cycle** with lower knee lift and longer weight-bearing contacts.
- **Action animation pass:** running/standing takeoff, rise, apex, fall, landing, hard stop, planted pivot, ledge impact, hanging motion and a multi-stage pull-up now use their own authored screen-space drawings instead of collapsing to one generic pose.
- **Renderer split:** the approved run/walk strip remains untouched while the action layer overrides only the states that still needed denser animation.
- **Mobile controls:** the house dual-stick pattern is the default, with the button/D-pad layout retained as a persistent alternative in the Controls menu.
- Physics, ledge anchors, jump distances and fall rules are unchanged while the visual motion is rebuilt around them.

## v2 — 2026-07-28

The first act stops being one long screen. Screens gained distinct jungle compositions: pod, chasm, understory, canopy, first stone and colonnade landmarks.

## v1 — 2026-07-27

First build. A cinematic platformer in the Another World idiom: filled polygons quantised to sixteen colours, rotoscoped skeletal animation, fixed screens with a hard cut between them. Movement is committed; ledges, falls, duels, traps, enemies and the fourteen-screen jungle-to-tomb route establish the original prototype.
