# Flash Prince — versions

The public release number. The `?v=N` token in `index.html` is a separate thing: it tracks every module-graph change so a browser cannot serve half of one build and half of another. Bump both when shipping.

## v12 — 2026-08-08

Playable-entrypoint correction plus live run-cycle replacement.

- **Hub playable now launches the actual game loop (`main.js`) again**, not the animation-reference lab.
- **Live hero run now uses twelve individually authored silhouettes** with uneven held exposure instead of the old four-key interpolated run rig.
- **Contact frames hold longer; passing/flight frames snap through faster** to restore a photographed/rotoscoped cadence.
- **No environment expansion in this pass:** work is deliberately concentrated on character movement and the playable route.

## v11 — 2026-08-08

Direct Flashback-reference locomotion silhouette pass.

- **Walk rebuilt as eight individually authored screen-space body drawings** rather than presenting one consistent articulated body through the whole cycle.
- **Run rebuilt as twelve authored silhouettes** with larger frame-to-frame changes in chest position, shoulder line, head placement, stride length and limb mass.
- **Uneven exposure retained:** planted contacts remain longer while passing/flight silhouettes move through quickly.
- **v10 transition timing retained:** braking, reversal, takeoff preparation and landing recovery keep the more committed human-weight timing.
- **Production Hub entrypoint now loads v11.**

## v10 — 2026-08-08

Character silhouette and transition-timing correction pass after direct comparison with Flashback footage/screens.

- **Pose-family silhouette changes:** run, low traversal, air and hanging states alter apparent torso/hip shape instead of decorating one invariant puppet.
- **Long-leg / compact-torso read strengthened** with state-specific costume mass and contact accents.
- **Braking, pivot, jump gather and landing timing rebuilt** around longer planted moments and shorter passing transitions.
- **Character fidelity explicitly prioritized over further environment decoration.**

## v8 — 2026-08-08

Reference-density animation pass toward the Flashback / classic Prince of Persia target.

- **Locomotion timing rebuilt:** walk, run-start, full run and running recovery now expose substantially more discrete animation moments instead of leaning on long pose holds.
- **12-beat run presentation:** contact, down, passing and flight phases are split across both halves of the stride with short, deliberately uneven exposure.
- **Walk remains committed:** the 24-tick step keeps the existing physical travel but distributes it across eight visible phase beats for a more photographed/rotoscoped read.
- **Run-start + recovery:** acceleration and landing-to-run now have denser transition timing so the character does not snap between the good cyclic animation and traversal actions.
- **v7 body fidelity retained:** broader chest, tapered waist, costume mass, hands, boots, jaw/hair silhouette and near/far limb depth remain the drawing foundation.
- **Jungle route retained:** the five-screen lush sci-fi opening and advanced traversal vocabulary remain playable while character fidelity is pushed first.

## v7 — 2026-08-08

Character and environment fidelity pass.

- **New body construction:** the locomotion renderer now uses a broader shoulder/chest mass, narrower waist, separate hip/trouser shape, angular boots, polygon hands, neck/jaw structure and a directional hair silhouette instead of the previous narrow mannequin body.
- **Depth on the character:** rear limbs are darker/slimmer while the front leg and arm carry the brighter silhouette, improving readability during the dense run and walk cycles.
- **Much denser jungle:** each opening screen now combines distant canopy, varied trunks, buttress roots, hanging vine curtains, frond clusters, mist, spores, wet ledge highlights, small growths and foreground occlusion.
- **Distinct landmarks:** the five screens now build around a crashed pod, damaged beacon, embedded panel, exposed cable/conduit structure and a large half-buried geometric doorway.
- **Sci-fi remains subordinate:** technology sits inside roots, foliage and rock rather than replacing the jungle composition.
- **Traversal unchanged:** the v6 five-screen route and v5 advanced movement vocabulary remain intact while visual fidelity increases.

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