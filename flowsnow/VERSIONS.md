# Flowsnow — Version Log

<!-- Same rules as VERSIONS.md at the site root:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
  js/main.js carries an independent integer ?v= cache token in index.html.
-->

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
