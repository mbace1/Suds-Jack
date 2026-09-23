# Flowsnow — Version Log

<!-- Same rules as VERSIONS.md at the site root:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
  js/main.js carries an independent integer ?v= cache token in index.html.
-->

## v9 — 2026-09-21
**The hands: an air stops being a timer and becomes a trick with a name**
- **The grab button paid nothing.** Until this version an air was a stopwatch —
  seconds aloft, yaw rounded to the nearest 180, and a `grab` flag that set a
  boolean, passed it to the landing toast as the word *grab*, and touched no
  number anywhere in the game. `js/tricks.js` is the vocabulary that replaces
  it, and it is **pure** (no DOM, no three.js, no clock), so every trick in the
  game is asserted in bare node the way the board and the snowpack are.
- **A grab has an IDENTITY, and it is made of controls the board already had.**
  Six of them, on two axes: which edge the hand reaches over comes from `lean`
  (the edge you are already on) and how far along the board it reaches comes
  from the trim keys (weighting the nose is how you reach the nose). Indy,
  Melon, Mute, Nose, Stalefish, Tail. It is chosen **once**, at the instant the
  hand goes down — a grab you can change by moving the stick afterwards is a
  menu. Reaching past the bindings pays more because it costs more to come back
  from, which is the argument this game already makes about a dive and about
  deep snow.
- **And the attitude is something you have to bring back.** The trim keys pitch
  the board in the air, and letting that run is a flip. The board levels toward
  the **nearest whole rotation** rather than toward zero, so going all the way
  round is a way of getting back and stopping in the middle is the thing that
  hurts. Swept on an ordinary 0.75 s pop, by how long the pitch is held: **up to
  0.35 s you bail and land; 0.40–0.55 s is the band and every one of them is a
  fall; 0.60 s and up the levelling carries you round and it is a Flip.** Half a
  second of pitch is the decision, and it is a real one in both directions.
- **THE RATES ARE CALIBRATED AGAINST A NUMBER NOBODY HAD MEASURED.** What air
  the mountain actually gives, logged over a whole descent: **312 airs, median
  0.72 s, p90 0.82, best 1.37.** Every rate is a division into that, and the
  first cut had guessed all of them — a 360 wanted 1.21 s and a flip 1.43, both
  past the longest air on the hill, so every spin anybody tried failed the
  landing test and the pitch key was a crash button with nothing on the far side
  of it. At 7.6 and 8.2 the ladder is a **180 on any air, a 360 in the top
  tenth, a flip on a median air if you commit, and a 540 once a run if ever.**
- **RAISING THE SPIN RATE BROKE THE STEERING, and that is one control meaning
  two things for the third time in this file** (`tuck` picks a grab *and*
  pitches the board, which is why a Nose grab used to flip you). Lean steers on
  the ground and spins in the air; at 5.2 a small corrective lean produced a few
  degrees nobody noticed, and at 7.6 the **same held stick is a quarter turn** —
  the bare-node pilot, which steers with a ±0.45 lean and has no idea it is
  airborne, started landing sideways off the glacier's crevasses and that
  chapter read **1.8 m/s**. A spin is a committed stick now: nothing under
  `SPIN_DEAD` rotates at all and the range above it is rescaled, so full lean is
  still the full rate and the pilot is untouched.
- **What it pays, and the ORDER is the claim rather than the numbers** — read
  off the air distribution, not off how hard each one sounds. A 180 fits every
  air and risks nothing; a flip fits a median air but carries the band; a 360
  needs the top tenth of airs. So 180 (202) < Flip (343) < 360 (372). At the
  first cut's `PAY.flip` of 220 a flip paid 263 against the free 180's 202,
  which had the hardest thing in the game costing a fraction over the easiest.
- **A neutral stick was a Melon.** `lean > 0` makes a stick at rest a heel lean
  by arithmetic, so a straight air came back with a name for a choice nobody
  made. The edge has a deadband and the neutral answer is **Indy**.
- **The figure reaches, and the arm had to GROW to do it.** A trick whose name
  you cannot read off the rider is a line of text over a figure doing the same
  thing every time, so the edge decides which hand goes down and the reach
  decides whether that arm swings toward the nose or the tail — both out of the
  same `GRABS` table the name and the score come from, so a grab cannot look
  like one thing and pay another. What a close render found: the arms are 0.62 m
  sticks on a pivot at chest height, and **straight down they stop a third of a
  metre above the deck**, so no rotation could ever have read as a grab. The
  robe is a cone with no elbow in it, so the reach is the only joint there is,
  and the reaching arm extends to 0.98 m — to the board's edge and not through
  it, which was the first cut's other fault.
- **And the honest half, measured rather than claimed: at play distance you read
  the grab off the TOAST, not off the rider.** From the seat the game gives you
  the figure is about 90 px tall with a scarf across half of it — the reach is
  visible as *a grab* and not as *which grab*. Four angles at 3.4 m tell them
  apart cleanly, and a chase camera is not one of them. That is v5's crevasse
  finding and v7's trench finding for the third time, so it is written down
  rather than tuned: the rider is small because the mountain is the subject, and
  anything that has to be read off the figure needs a different seat.
- The landing toast prints the **name and what it was worth** instead of
  `360 · grab · 0.9s`, a receipt for three facts rather than a name for one
  thing; the recap's *biggest spin* becomes **best trick**, because the name
  contains the spin and says what else was going on.
- **Honest limits.** Touch has one button, and holding the right half is both
  the tuck and the grab — so a touch player always gets a nose grab and cannot
  flip. Nobody has played any of this; the window above is measured off the
  bare-node pilot, which is not a pair of hands.
- Gates: `node flowsnow/test/core.mjs` is 142 checks (up from 121) — the grab
  table, the commitment window in all three of its states, and the pay order.
- Tokens: `physics.js` 2→3, `figure.js` 1→2, `lang.js` 1→2, new `tricks.js` at
  v1, entry `main.js` 8→9.

## v8 — 2026-09-21
**The camera is the thing under test: a glance over the shoulder, and a crevasse
answer that is a cut**
- **Two leaps in a row were built, gated green and turned out to be invisible
  for a reason that was the CAMERA rather than the thing itself** — v5's
  crevasses, and v7's trench. So the seat moved out of `main.js` into
  `js/camera.js` and is **pure**: no DOM, no three.js, no clock. A camera you can
  ask in bare node is the only way to say anything about one that is not a
  screenshot, and `main.js` now copies the answer onto a `PerspectiveCamera` and
  does nothing else.
- **v7's numbers are kept exactly and everything new is a term on top that is
  zero at rest**, so a rider on the packed line with nothing ahead and no glance
  sits precisely where v7 put them. Gated, because a camera pass that quietly
  re-frames the ordinary case is a camera pass nobody can review.
- **THE GLANCE OVER THE SHOULDER** (`C` / `Q`, pad LB — held, never toggled). The
  snowpack is a record of where you have BEEN and the seat looks where you are
  GOING, so the one thing v7 draws is the one thing the camera never framed. The
  glance crosses the seat to the downhill side of the rider and aims back up the
  hill, and it costs you the view ahead for exactly as long as you want your own
  line instead — which is the honest price and the reason it is a verb.
- **The height is the whole thing, and 3.4 m was not nearly enough.** Looking
  back means looking at ground that is UPHILL of you, and on a 17° slope that
  ground climbs away as fast as you back off from it. The first cut put the seat
  about a metre over the snow and the frame was a wall of it — no horizon, no
  line, no trench. Holding a groove 15 m behind at a 20° depression wants
  ~12 m over the rider: **a glance on a slope is a drone shot and there is no
  version of it that is not.**
- **THE CREVASSE IS ANSWERED, AND THE ANSWER IS A CUT.** v5 tried geometry (a
  windward ridge) and cut it because a ridge across the fall line has a crest
  you can balance on. v8 tried the camera. The numbers are the deliverable:
  - *Detecting a hole is solved.* Sag below a chord from 6 m to 42 m ahead
    separates cleanly — ordinary ground never exceeds **1.73 m** anywhere on the
    mountain, the slot reads **3.21 m at 24 m out** and 4.19 at 12. The obvious
    metric does NOT separate: extrapolating the local grade from a 6 m baseline
    out to 34 m amplifies curvature, and ordinary couloir reads 7.19 m "below
    grade" against a crevasse's 8 to 10. A hole has a far side; a roll-over does
    not, and only the chord asks that question.
  - *Beyond ~20 m the interior is OCCLUDED* — 3.3 m of ground stands in the
    sightline. No aim helps; there is a hill in the way.
  - *Inside ~16 m it is unoccluded but OUT OF FRAME.* At 16 m back and 5 m up,
    **38 of 78** points of the interior are clear of the ground and none is in
    the picture. Aiming the camera at the sag's own position recovered **2 of 78**.
  - *Swept against seat height*, it takes 8 m above the surface to see 21 of 78
    from 24 m back and 12 m to see 44. That is not a chase camera.
  So a 4 m slot on a 17° slope cannot be shown from behind the rider — not by
  shaping the ground and not by moving the seat. What is left is a genuinely
  different camera (a drone seat 8-12 m up while a hole is near, which the sag
  measure is exactly the trigger for) or a tell that is not visual. Both are the
  owner's call, so **neither is here and the detector is gone with the response**
  — a detector with no user is dead code.
- **The seat backs off in deep snow**, measured rather than chosen. Same S-turn
  in the run-out at sink 0.58, the plume's share of the frame: 0/0 reads 2.58%,
  1.1/0.45 reads 1.84%, **2.2/0.9 reads 1.41%**, 3.5/1.6 reads 1.00%. Monotone,
  and 2.2/0.9 is the knee. The honest reading is only that the plume is pulled
  back rather than removed — backing a camera off shrinks everything in frame,
  and whether the run is more READABLE for it is not something a pixel count can
  say. One thing it did buy that was not asked for: from the higher seat the
  v7 trench reads **while riding forward**, not only on the glance.
- Not bound on touch, and said rather than hidden: both halves of the screen
  already carry a verb, and overloading one to look backwards is how you get a
  glance every time somebody means to turn.
- Gates: `core.mjs` **121** (nine of them the seat), `smoke.cjs` 43,
  `playthrough.cjs` 9 — the descent is byte-identical to v7 (2,400 m, 168.9 s,
  6187), which is what a camera-only change should be.

## v7 — 2026-09-20
**The snow remembers you: a conserving snowpack the board writes into**
- **The displacement is a term in `depth`, not in `height`, and that is the whole
  design.** `terrain.depth(x, z)` was already what the board sinks into, what
  decides whether an edge can bite, what cushions a landing and what the score is
  keyed to. Put the board's displacement THERE and every one of them follows with
  nothing told: your own groove is shallower snow, so it is faster and it grips;
  the berm you threw is deeper, so it slows you and floats you. It also makes
  cutting into the firm floor impossible by construction.
- **What you take, you put somewhere.** `cut` totals the volume it removed and
  distributes exactly that over the berm ring by weight, so the field's sum is
  unchanged by any carve — gated at 1e-9 m³ for one cut and 1e-5 for a 400-step
  stroke. A pack that quietly loses mass flattens the mountain over 2,400 m and
  nothing else in the game would ever report it.
- **`js/snowpack.js` is pure** — no DOM, no three.js, no clock — so all of the
  above is asserted in bare node. The field is a 192 × 192 rolling window at
  0.40 m, addressed toroidally, zeroing whatever scrolls in.
- **THE TRENCH IS BEHIND THE BOARD.** A lane reaching even half a metre ahead
  means the board always arrives on ground it has already stripped: `sink` goes
  to zero and takes the float, the spray, the landing cushion and the entire
  surfing score with it, because the powder model and the displacement model are
  then eating the same snow. Cut strictly behind the contact patch and *nothing
  in physics.js changes at all*, while the groove — which is a record of where
  you have been — appears where you can see it.
- **Four shapes of the same mistake, and the order matters because each one hid
  the next:**
  - *A progressive cut is a ramp.* Removing a little more each step deepens the
    ground behind the board faster than the ground ahead, so the rider climbs the
    leading face of its own trench for the whole run. It is not a rate to tune —
    the ramp IS the rate. `depth` is a target now and converges in one pass.
  - *A disc-shaped cut is also a ramp.* A bowl centred on the board follows the
    board downhill: the ground 0.35 m ahead (where `terrain.normal` samples)
    stands about 7° above the ground 0.35 m behind, permanently. On a 17° grade
    that is a forty per cent tax on the driving force and it reads as the snow
    being glue — every chapter between 0.6 and 3.5 m/s. A trench is a
    cross-section swept along a path, and its floor is level along travel.
  - *A berm laid in a ring is a bow wave.* At 20 m/s the board moves 0.17 m a
    step and drives straight into snow it piled the step before.
  - *A board that is not sweeping displaces nothing.* Without that, a standing
    start excavates a pit to its full sink depth, lays the berm in a complete
    ring around itself, and the run never leaves the bowl.
- **THE LANDING CRATER WAS A FEEDBACK LOOP, and only the count showed it.** A
  crater centred on the rider lowers the ground the rider is standing on, the
  rider drops into it, and that registers as another landing. Measured: **2,320
  landings in one descent against 32 real ones**, 168 s → 270 s, slowest 0.5 m/s.
  Every other number it produced looked plausible. It goes behind the board too.
- **And the bare-node pilot fires the game's events now.** It passed none, so it
  never dug a crater, and the whole loop above was invisible to 111 green checks
  and found by a browser. A gate that passes events the game does not pass is
  measuring a different game.
- **The ribbon is the trench, because the terrain mesh cannot be.** A tile is
  48 m over SEG 20, so its vertices are **2.4 m** apart and a board is 0.30 m
  wide: there is nowhere in that mesh to put a groove, at any refresh rate. The
  trail strip already follows the exact path the board took, so it is widened
  from two vertices to five — crest, wall, floor, wall, crest — with every height
  read from `terrain.height` and the width read from the numbers physics actually
  cuts with. It used to carry its own `drop` from sink, which was a second model
  of the same displacement, free to drift from the one the rider was feeling.
  `Field.refresh` also re-heights the nearest tiles (no shadow re-bake — a trench
  moves nobody's horizon), which is enough for a berm and never enough for a groove.
- **Open, and the owner's call.** The groove reads as a groove and not much more
  than that, for a reason that is about the CAMERA rather than the geometry: the
  chase seat looks forward, so your own trench is mostly out of frame, and where
  it is in frame the plume is usually on top of it. Measured, the ribbon paints
  12% of the picture and I cannot tell from a SwiftShader still whether that is
  right. This is the v5 crevasse finding again — a thing that is correct and
  hard to see — and it wants a person's eyes before any more is spent on it.
- Gates: `core.mjs` **112** (was 90), `smoke.cjs` 43, `playthrough.cjs` 9. The
  descent is 168.9 s against 167.6, and scores **6187 against 5872** — the trench
  is faster ground, which is the feel change arriving in the one number that
  measures it.

## v6 — 2026-09-18
**The spray becomes snow: instanced streaks instead of a bag of marbles**
- **A `THREE.Points` sprite can only ever be a round disc**, and a round disc at
  the old 90 px cap is a bokeh ball — the rooster tail was a string of beads with
  a rider somewhere inside it. The snow is one draw call of **instanced quads**
  now (`snowSprayMaterial`), which costs the same and can be any shape.
- **A crystal in flight is STRETCHED, and the stretch has to be in SCREEN space.**
  A flake thrown at the lens is a dot; the same flake thrown across the frame is a
  streak, and that difference IS the motion. Stretching along the world velocity
  would smear the one particle that should stay a point. It is overlapping
  **streaks**, not overlapping discs, that read as a sheet of snow.
- **Snow scatters forward hard**, so the plume between you and the sun lights up
  rather than going grey. The old material had no view-to-sun term at all.
- **Three faults, and each one is a number that was right about a different
  thing:**
  - *The stretch at 0.085.* A crystal leaves the edge at about 5 m/s, which bought
    a **44%** elongation — invisible. At 0.95 it is three to seven times its own
    width and the packed-line carve finally reads as thrown rather than sprinkled.
  - *A crystal at alpha 0.85.* Each one is then an object you can point at, and
    the plume is a string of them. The density has to come from **overlap**: 0.42,
    twice as many at two thirds the size, and the same snow becomes a texture.
  - *A cloud at alpha 0.38.* Same fault one scale up — a veil is built from many
    faint layers, so 0.22 and twice as many.
- **A WORLD-SPACE QUAD HAS NO `gl_PointSize` CLAMP, and that clamp was doing real
  work.** Without it a cloud born a metre from the lens is a six-metre disc across
  the whole frame: the first cut painted **20% of the picture** and put the rider
  inside his own tail — v3's lesson back in new clothes. The quad is clamped in
  **NDC** instead, which is the same clamp in units that need no viewport
  (`r * P[1][1] / depth` is the half-size as a fraction of half the frame height),
  and the caps are the old pixel caps converted, so the amount of snow is
  unchanged and everything above it is what is new. 3% of the frame now.
- **THE BUG THAT COST TWO PASSES: a mirror is not a rotation.** The quad is laid
  out on the basis `(perp, dir)`, and `perp = (-dir.y, dir.x)` gives that basis a
  determinant of **−1** — so every quad's winding was reversed, back-face culling
  ate all of it, and the frame had 680 live flakes and **zero** pixels of snow.
  No error, no warning, and all 41 gates green. `vec2(dir.y, -dir.x)` is the
  proper rotation; the material is `DoubleSide` as well, because a particle quad
  has no meaningful facing and relying on the winding of a procedurally built
  basis is exactly the fragility that just cost the two passes.
- **Two gates for the two halves of that**, because neither is a taste question:
  *the snow in the air is actually drawn* (the mesh is toggled and the frame
  diffed — it fails with `share: 0` against the mirrored basis) and *the plume is
  not the whole frame* (under 12%). A gate still cannot see whether the plume
  LOOKS like snow, so this pass ends where every art pass here ends — in a
  screenshot, five of them, across four chapters.
- **A cloud's edge wobbles with ANGLE.** Keyed to `floor(vUv.x * 5.0)` it is five
  vertical bands down a circle, which reads as a striped disc — still a disc,
  which is the whole thing this is trying not to be.
- **The backlight MIXES rather than adds.** Added, a few hundred overlapping
  quads with the sun dead ahead clip to a white hole with the rider inside it.
- **Not done, and named rather than left implied:** the streak is the particle's
  own velocity, not its velocity *relative to the camera*. A chase camera at
  20 m/s should smear the air it flies through, and that is a real speed cue this
  does not have — but it would streak the ambient snowfall into rain, so it wants
  its own pass and its own look.
- Gates: `core.mjs` 90, `smoke.cjs` **43** (was 41), `playthrough.cjs` 9. The
  playthrough is byte-identical to v5 (2,400 m, 5,872) — the change is visual and
  touches no number the rider reads.

## v5 — 2026-09-18
**The run gets somewhere to go: five chapters, and a glacier with teeth**
- **One run was one formula from top to bottom.** A gully, dunes, rollers and
  kickers for 2,400 m, with nothing changing but the light. `chapter(z)` in
  `terrain.js` is the same formula with its own numbers, blended along z, and
  because it lives inside `base()` and `depth()` the renderer, the rider, the
  snow, the collision and the sun occlusion all read one surface and none of them
  has to know a chapter exists. **BOWL** (open, shallow, a place to drop in) →
  **GULLY** (the game as it was) → **COULOIR** (17 m wide, scoured, committing) →
  **GLACIER** (wide, bare, cut by crevasses) → **RUN-OUT** (the deepest snow of
  the run, at dusk). Each changes the SHAPE and the SNOW, not just the colour.
- **Crevasses need no new physics, and that is the point.** The rider is already
  thrown when the ground drops away faster than gravity, and already tumbles on a
  hard enough landing. So SPEED is the answer to a crevasse — carry it and you
  sail the gap, crawl at it and you drop in and meet the far wall. That inverts
  the powder chapters, where speed is what you give up.
- **THE RULE THAT STOPS A SLOT BEING A PIT IS ARITHMETIC.** Over its ramp out the
  mountain descends `GRADE * WALL_DOWN`; a slot deeper than that has a far lip
  standing above its own floor, and nothing gets out. Measured, the first cut left
  the far wall 5.6 m up over 15 m against 4.5 m of grade and the rider **sat at
  the bottom of it at 1,380 m with the clock still running** — worse than dying.
  `CREV_MAX_DROP` is derived from the grade so a bigger number cannot be chosen.
- **THE LIP WAS BUILT, MEASURED THREE WAYS AND CUT**, and it is the finding worth
  keeping. Rendered and looked at, a 4.6 m slot 26 m ahead of a chase camera on a
  17° slope is **not visible at all** — you find it by falling in, which is a
  gotcha in a game that telegraphs everything else. Real crevasses carry a
  windward ridge, so one was built. At a height that reads (2.57 m proud) the run
  sticks behind it at 1,370 m. At a height that does not read it STILL traps: a
  ridge across the fall line has a **crest**, a crest is a line of zero gradient,
  and the pilot stopped dead balanced on one at 1,416 m with every metre ahead of
  it lower. Both failed, so there is no lip. **Crevasse visibility is OPEN** — see
  the limits below.
- **A kicker's spread was a constant from when the channel was one width.** At a
  flat 50 m it put take-offs 25 m up the couloir's wall, and three of them
  measured NEGATIVE prominence: not bumps, just less wall. The spread is the
  chapter's now, and the gate checks every kicker in every chapter stands proud of
  its own channel rather than checking one kicker at one fixed width.
- **The run-out is as deep as the float model can lift a board out of.** Swept at
  the deepest drift: `deep` 1.40 settles at 7.8 m/s and plane 0.63, 1.25 at 9.7,
  **1.15 at 11.0 and plane 0.82**. Past about 1.2 the payoff chapter stops planing
  and becomes a slog, so the ceiling is measured rather than chosen.
- **Six checks silently became tests of the wrong place.** Every powder check
  started at `z = 0`, which is now the bowl — deliberately shallow. They ride the
  run-out now, and the sample point is itself a measurement: `-2300` is where all
  four powder claims hold at once, but a 10 s hold from there **crosses the
  2,400 m finish** and every later step is inert, which read as the game throwing
  no snow. `-2150` leaves room. WHERE a test rides is part of what it measures.
- **"Throws a wall of it" is now a RELATIVE claim**, and the reason is a real
  tension: spray comes mostly from how buried the board is, and making the deepest
  chapter shallow enough to plane in un-buries you. An absolute 0.6 was asserting
  "deep enough to wallow in". Measured 0.36-0.46 against 0.11-0.16 on the line —
  2.2x to 4x — so the bar is twice the line with a floor, set under the bottom of
  the measured range rather than at one reading.
- **The browser pilot rides in bare node now.** Two changes passed every
  bare-node test and stuck the playthrough's P+D pilot on the mountain, because it
  takes a different line. That took a browser and three minutes to find; it costs
  two seconds here, and the check is verified falsifiable — putting the lip back
  turns it red and names the chapter (`glacier 0.0`).
- **My own rulers were wrong three times in one sitting**, which is the pattern to
  watch: a boundary check that divided by a field starting at zero read a 100%
  step on a change of a millionth; a prominence check measured a couloir's walls
  and called a take-off a hole; and a "never stops climbing" check counted
  frame-to-frame jitter at equilibrium. Kindling's lesson, three more times: *the
  page was right and the ruler was wrong.*
- Gates: `core.mjs` **90**, `smoke.cjs` 41, `playthrough.cjs` 9 — 2,400 m in
  168 s, best air **0.93 s** and **2 falls** against v4's 0.03 s and none, which
  closes the "the pilot only carves" gap v3 recorded without anyone aiming at it.
  Tokens: `terrain.js?v=3`, `js/main.js?v=5`.
- **Open, and honest:** crevasses are under-telegraphed — they work, they do not
  trap, and you cannot reliably see one coming. The two routes left are a visual
  treatment rather than a geometric one (a darker inner face; the 2.4 m tile mesh
  cannot resolve the slot's wall today) or accepting them as a glacier's hazard
  that punishes speed you cannot see past. And the wind-carved skin still reads on
  deep powder in the run-out, where wind would have carved nothing — `skin()` is
  in the shader and does not know the snow depth under it.

## v4 — 2026-09-13
**The snow gets form: a real terminator, a skin, baked sun, and a horizon**
- **The snow had no form and the cause was one line.** v3's `wrap = ndl*0.55+0.45`
  compressed the whole Lambert range, so a board-length facet moved the pixel by
  about 2% luminance and the mountain read as a flat gradient for most of the
  descent. There are **two terms** now: the sun keeps a real terminator (a lit face
  and a shadow face, softened only by the sun's own width) and the sky term stays
  WRAPPED, because snow really is lit from every direction by every other bit of
  snow. `uForm` mixes them, at 0.72.
- **The terminator has to SPAN the range the ground occupies.** The first cut ramped
  `smoothstep(-0.05, 0.32, ndl)`, and with the sun at 20-31° over a field tilted ~17°
  every pixel sits past 0.32 — fully lit, flatter than the wrap it replaced, and two
  captures came back as paper. It ramps `-0.10 .. 0.92` now, which is where a real
  slope lives.
- **Sun occlusion is BAKED per vertex** (`terrain.occlusion`, a horizon march along the
  sun's azimuth over `height()`), so the far field carries the shadow of every swell
  and gully wall with no shadow map. `Field` re-bakes a tile a frame once the sun has
  drifted 0.05 down the run.
- **A skin, and the amplitude is a SLOPE.** Sastrugi lie across the wind, long along it
  and short across, their crests wandering; under them a coarser dune grain. The first
  cut used 0.028 m over a 0.47 m period, which is a **21° facet** — a field of those is
  corrugated iron, and the frame read as corduroy. 0.005 m is a skin, and what makes it
  read is the light raking across it, not its size.
- **Fade detail on the FOOTPRINT, not on distance.** A 1-2.4 m grain seen at 200 m down
  a grazing surface covers a fraction of a pixel and beats against the grid; fading on
  distance alone drew metre-wide rake lines to the horizon. A pixel's footprint is
  distance over `dot(n, V)`, and on that the skin simply runs out.
- **The sky has mountains in it.** Two ranges of ridgeline read off the azimuth, the far
  one all but dissolved in the haze — so the frame has a scale beyond the gully wall,
  and `skyAt()` being shared by the dome and the fog means a far slope fogs into the
  range that is actually behind it.
- **Snow scatters forward**, so looking into the sun across it lifts the whole field —
  but as a lift in the SHADOWS (`1 - 0.7*sun`), not a second specular. Stacked on the
  sheen it blew two frames to white through ACES.
- **A gate caught what four screenshots could not.** `SKY` grew a dependency on `hash21`
  and on `uShade`; `skyMaterial` declared neither, so the DOME failed to compile while
  the ground compiled fine — the pictures still looked right. `smoke.cjs` and
  `playthrough.cjs` both failed on `VALIDATE_STATUS false`. The house rule has a mirror:
  a screenshot cannot see *works* any more than a gate can see *looks*.
- Gates: `core.mjs` 72, `smoke.cjs` 41, `playthrough.cjs` 9. Tokens: `terrain.js?v=2`,
  `snowmat.js?v=2`, `world.js?v=2`, `js/main.js?v=4`.
- Honest limits: this is the ground only. The spray is still Points bokeh, the snowpack
  still does not deform, and the run is still one seed with no chapters in it.

## v3 — 2026-09-10
**A crash on an ordinary landing, and the gate that rides the mountain**
- **A landing with no impact threw.** `impact` is `max(0, -vn)`, so a grazing
  re-contact — which is most landings on rolling ground — lands with an impact
  of exactly 0. `audio.land` scales its thud by that, and `_tone` RAMPS
  EXPONENTIALLY to the gain it is given; an exponential ramp to zero is a
  RangeError, not a silence. It threw out of `physicsStep`, so the frame it
  happened on never rendered. A tone nobody can hear is now simply not played.
- **`test/playthrough.cjs` is new, and it is why the bug was found.**
  `smoke.cjs` proves the interface and proves the ENDING by putting the rider at
  `z = -2395` and stepping three seconds; nothing rode the 2,400 m in between,
  which is where the mountain is. The new gate rides all of it and asserts the
  descent finishes, never bogs down, keeps a downhill pace, and crosses both
  mediums. It caught the crash at 163 m on its first run. Verified falsifiable:
  with the guard removed it FAILS and names the metre, rather than dying — a
  throw inside the ride is caught and reported, not allowed out of the evaluate.
- **The gate's pilot needed a D term, and that is a finding about gates rather
  than about snow.** Undamped, the bot overshoots the line, pins the edge, and
  the edge scrubs nearly everything: the run reads 340-476 s and 0.06 m/s
  mid-descent, which looks exactly like a bog in the terrain. It is not one —
  measured in bare node, a rider at REST in deep snow reaches 1 m/s in 0.4 s and
  18 m/s in a minute, so v2's *"a bog is somewhere you crawl out of, never a
  trap"* holds. Damped, the same mountain rides in 158 s and never drops below
  12 m/s. A tireless bot that rides badly measures its own riding.
- **Every module was imported BARE, so this fix would not have shipped.**
  `index.html` busts `main.js` and `main.js` asked for `./audio.js` with no
  token — a returning browser keeps every module but the entry. All eleven now
  carry one, and `core.mjs` asserts both halves of the rule: every local import
  is tokened, and ONE module is never asked for under two tokens (`palette.js`
  has three importers, `snowmat.js` two, and two tokens for one module is two
  instances of it with the state split). `js/main.js?v=3`.
- Gates: `core.mjs` 72, `smoke.cjs` 41, `playthrough.cjs` 9. The title screen also
  printed `v1` through v2 AND v3 while the cabinet advertised the real number;
  it reads the shipped version now and a check fails if code and log disagree.
- Honest limits: the playthrough's pilot only carves — best air 0.03 s and zero
  falls across the descent — so the kickers, the pop and the tumble paths are
  exercised by `smoke.cjs` and not by the ride. And a LOOK at the whole run
  found something no gate can see, recorded in CLAUDE.md rather than changed
  here: the snow reads as a flat gradient because the wrapped terminator spends
  the surface grain. That is a look decision and it is the owner's.

## v2 — 2026-09-10
**The snowpack gets a depth, and the board rides IN it**
- Owner direction: *more powder and sinking-into-snow type gameplay.* The
  mountain now has two surfaces. `base(x, z)` is the firm floor, `depth(x, z)`
  is the loose snow lying over it, and `height()` — what you see, what the snow
  settles on and what the rider sinks into — is the sum. Wind loads the gully,
  scours the walls back to bare, and a packed line is beaten down the middle;
  slow drifts make the depth worth reading. A kicker is stamped firm, because
  you cannot build a take-off out of powder.
- **`sink` is the whole model.** At rest the board settles to the floor of the
  pack. Speed PLANES it back out; trim decides where the nose points while it
  does. Plowing costs speed in proportion to how buried you are AND how fast
  you are going, so the resistance falls away as you slow: a bog is somewhere
  you crawl out of, never a trap.
- **One key, two meanings, and the medium decides.** A tail pushed into deep
  snow cannot bite, so the brake's pivot, scrub and grip cost all fade with the
  DEPTH of the pack and what is left is pure trim. `↓` scrubs on the packed
  line and floats the nose in powder. `↑` tuck is faster on hardpack and buries
  you in powder.
- **Over the front** is the powder way to fall: buried, nose-heavy and quick
  digs the nose in after `DIVE_TIME`, and getting the weight back is the answer.
- Deep snow is slower (about 13 m/s against 20 on the line) and scores several
  times more, so leaving the fast line is the decision the run is made of.
  Riding it well — fast, deep and planing — is what the score is keyed to.
- A buried board throws a rooster tail and leaves a TRENCH rather than a line,
  and casts no shadow. Deep snow cushions a landing that would put you down on
  hardpack. The HUD gains SNOW M and a FLOAT bar; the recap gains deepest snow.
- `js/main.js?v=2`. `test/core.mjs`: 68 checks, 26 of them new on the pack, the
  float, the plow, the trim inversion, the dive and the cushion.
  `test/smoke.cjs`: 41, including a ridden comparison of deep against packed.

## v1 — 2026-09-07
**First descent**
- A simplistic snowboarding game: one 2,400 m run down a meandering gully,
  from dawn-gold at the top to dusk at the bottom. Journey / Sword of the Sea
  in the look — warm-lit snow with lavender shadows, a peach horizon, one small
  red-robed figure with a simulated scarf, standing stones and arches out on
  the field — and Shredders in the hands.
- **The board model** (`js/physics.js`, pure): the board has a heading and the
  rider a velocity, and the edge is what pulls one after the other. Lean sets
  the edge, the edge turns the board along its sidecut, grip drags the velocity
  round after it as far as the edge can hold; ask for more and the velocity
  lags — a slip angle that scrubs speed, throws spray and drains flow. Riding
  switch is a board pointing the other way, not a board dragged round. Air is
  not a button: the ground falls away faster than gravity can follow and you
  are off it; Space pops. Land across the line at speed and you fall; land
  backwards and you ride switch. A monolith is a wall.
- **Snow as a simulation** (`js/particles.js`, pure): a 5,000-particle pool in
  typed arrays with gravity, drag, wind and a collision against the terrain
  function — a flake that reaches the snow fades on its surface, never under
  it. Spray comes off the working edge in proportion to speed, edge and skid;
  a landing throws a powder cloud sized by its impact; flakes drift through
  the air around the camera.
- **The mountain as a function** (`js/terrain.js`, pure): every height and
  normal from `height(x, z)`; a ring of 121 terrain tiles follows the rider
  and rebuilds only the new ones, nearest first.
- **Flow** is the score: a clean carve at speed earns it, air holds it, a
  landing pays out on it, a scrub or a fall spends it. Best kept under
  `flowsnow.best` — nothing leaves the browser.
- Keys, touch (left half leans, right half pops / tucks) and a native pad.
  fi / en / ja. Signed. `test/core.mjs` = 42 bare-node checks on the terrain,
  the board model and the snow; `test/smoke.cjs` = a browser gate driven off
  game state.
