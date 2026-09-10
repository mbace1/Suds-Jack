# Flowsnow — Version Log

<!-- Same rules as VERSIONS.md at the site root:
  - Add a new ## vN entry at the top for every commit that touches game files.
  - Stage this file alongside your changes.
  - scripts/versions.mjs reads the top entry to show the version on the arcade.
  js/main.js carries an independent integer ?v= cache token in index.html.
-->

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
