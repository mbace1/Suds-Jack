# Toko Drop 2.0 — Version Log

<!-- Rules:
  - A new top `## vN — YYYY-MM-DD` entry, with a bold one-line title and
    bullets, for EVERY commit that touches game files. Game files are
    everything except docs (*.md), scripts/, test/, .github/ and spec/.
  - `scripts/bump-version.sh <N>` moves the `?v=N` cache tokens, the HUD
    label (`2.0 · vN`) and this file's stub together. Fill the stub in
    before committing: the hook refuses an entry that still says TODO.
  - At each multiple of 10, roll the previous decade into the Archive
    below, one line per version.
  - `scripts/pre-commit` checks the commit being made, not the disk. It
    refuses a game-file commit that does not change this file, leaves a
    malformed top entry or an unfilled stub anywhere, skips an archive, or
    carries a version that origin/main already has. Main is what Pages
    serves, so changed bytes under a released `?v=N` would sit stale on
    phones. Install it once per clone:
      cp scripts/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
    Never `--no-verify`.
-->

## v18 — 2026-10-23
**The flick dash; the arena bigger and the right way round**
- **Only a FLICK of the aim stick dashes** (owner, 2026-10-23: a plain
  let-go is no dash; better flick detection and a longer dash; the length
  and speed of the flick set the dash). 1.x dashed on every let-go and on a
  tap; a tap and a cancelled touch are no dash now (`input.flick.tap` brings
  1.x's tap back).
  - `js/flick.js` reads the aim stick's history at the lift, off the
    events' own timeStamps: a stroke still moving at the lift, long enough
    and fast somewhere in it, is a flick. A thumb that stopped before it
    lifted, or an aim sweep lifted while still creeping, is a let-go.
  - The dash goes where it was flicked. The stroke's length sets the
    distance, 2.4 to 11 u (1.x's was 4.77), and its peak speed sets the
    speed, 18 to 46 u/s (1.x's was 26). Distance is exact; it lasts at
    most 24 steps, and past that the speed gives way, never the distance.
  - The i-frames are the dash, as 1.x's were. The cooldown grows with the
    distance: 1.x's 0.75 s at 1.x's 4.77 u, plus or minus 0.1 s a unit.
  - **CUT cuts deeper the faster the flick**: 1 to 4 hits (a button's dash
    is still 2). PUSH shoves harder the same way.
  - Pad and keys keep 1.x's fixed dash on a button (owner: the pad keeps a
    button with a fixed dash).
  - The touch hint says FLICK TO DASH. `?fps` shows the last flick as it was
    read (px, px/ms) and the dash it bought.
  - Measured with physical thumb strokes through real CDP touch events, on
    a phone at 60 and 120 Hz and on an iPad. Taps, held let-goes, stop-lifts
    and aim sweeps are no dash. A 7 mm flick reads as about 4 u, a 24 mm one
    as 11 u.
- **The camera keeps the whole arena, with trimmed margins** (owner: keep
  the whole arena, trim the margins, as long as the orientation is right).
  - The margin is 10 px a side instead of 5% of the screen. On a phone held
    sideways the arena is about 4% bigger. Upright it is width-bound, so it
    gains about 1%.
  - **A phone turned mid-run turns the world with it.** The arena is still
    1.x's, picked once a run, but it is no longer shown as a strip across
    the new screen: it lies along the screen's long side, tilted toward the
    new bottom. It turns the way that keeps it where it was on the glass,
    read off the screen's orientation angle. The sticks, keys and pad turn
    with it, so up is still up.
  - The fit finds the distance on the half-extents first and then centres,
    once.
- Ghosts pool 10, up from 1.x's 7, for the longer dash.
- Gates: the hero suite checks the flick reader and the flick dash, with
  210 checks. The browser smoke now checks four things:
  - a plain let-go does not dash, and a flick up the screen dashes once, up
    the screen
  - the arena sits about 10 px from the edge on its tight axis (v17 sat at
    23 px)
  - a turned phone turns the view, filling 45% of the upright screen's
    height against 21% unturned
  - an unturned screen is never turned
- Cache tokens `?v=17` → `?v=18`; HUD label → `2.0 · v18`

---

## v17 — 2026-10-23
**Gates, pickups and the DASH pod; enemies dangerous on arrival; SDF gels on the title**
- **Gates and pickups, 1.x's own** (owner, 2026-10-22: healing is 1.x's gates
  as they are; `js/sim/pickups.js`, `js/render/pickups.js`, every number in
  `js/tuning/pickups.js` with its 1.x line):
  - **Gates** from wave 3, one a wave and at most three standing. Dash
    through one for a heal, invincibility, faster fire or double score. Risk
    gates from wave 5 flash green (double prize) and red (a dud). Drift gates
    from wave 10 wander. Chained gates pay 500 × N, and a beam hurts gels
    that touch it.
  - **The convoy**: one a wave, gold moths that drop pods, nuggets and ×2.
  - **The bounty** on waves 4, 7, 10, and so on: a marked gel, worth a pod
    if you kill it within 8 s.
  - Pickups bob, blink out and wear a glyph. A HUD row shows the pod, the
    dash level and the timers.
  - Two healing knobs (longer drops, a rare heart) are in tuning, off.
- **The DASH pod** (owner: dash upgrades come from the convoy pods): the moth
  that completes a clean sweep of a convoy drops a DASH pod while your dash is
  below level 2. Level 1 kills what you dash through, level 2 adds the boom.
  At level 2 it is a weapon pod.
- **A hit knocks dash level 2 down to 1, never lower**, as 1.x's weapon pods
  do (`hero.dashUpgrade.loseOnHit`; owner: "maybe", so it is one switch).
- **Enemies are dangerous from their first frame** (owner: "c or less"). A
  new body acts, hurts and can be shot on its first step, as in 1.x. The
  swell is only drawn now, and shorter: `gel.swell` is 0.15 s. A brood
  (REDD, PURP, SPLITTA) still waits, unseen and inert, through its parent's
  0.28 s death pop, then comes out at rest. Eleven species tests moved and
  were re-derived from 1.x's own numbers.
- **The title**: DASH cycles PUSH and CUT only (a saved PASS falls back to
  PUSH), and SURVIVAL is hidden (one word brings it back).
- **GELS · CLASSIC / SDF** on the title (owner: an SDF menu option), saved
  between visits; classic stays the default. In SDF mode, 17 gel types with
  the shared dome or rounded cube are ray-marched (`js/render/sdf.js`) inside
  a fitted hull. They keep the game's own jelly material, so the flash,
  tells, CLOAKER's fade, death poses and dents all still work. The 10 custom
  bodies and the hero stay as they are.
  - One shader per species, so an arriving enemy builds nothing.
  - The edges use alpha-to-coverage, within half a pixel of the surface.
  - `?gels=sdf` opens it directly. Big gels still die as mesh jelly halves.
    Merging between gels is off.
- **`?fps`** puts a frame-time line beside the version in either style, and
  **`?bench`** runs a fixed 24-body scene and leaves its result on screen,
  for comparing the two on a phone and an iPad.
- **Measured** (a bot, 200 seeded Arcade runs each, the same bot both times):
  | | v15 | v16 |
  |---|---|---|
  | mean wave | 8.7 | 10.6 |
  | time | 71 s | 92 s |
  | hearts a run | — | 2.2 (0.21 a wave) |
  | DASH pods a run | — | 2.4 (about 70% of a run at dash level 1–2) |
  The dash share is the first balance knob to watch.
- Tests: `test/pickups.mjs` (119 checks), `test/view.mjs` (58, the view's half
  of arrival), new sim checks, and smoke scenarios for SDF on WebGPU and
  WebGL 2 that fail when the SDF gels draw nothing.
- Built on v16 (the start intro): INTRO stays beside ARCADE; the gel style is
  applied when a run starts, before the intro, and the readout times the intro too
- Cache tokens `?v=16` → `?v=17`; HUD label → `2.0 · v17`

---

## v16 — 2026-10-22
**The start intro, behind an INTRO button beside ARCADE**
- Owner, 2026-10-22: a start video. Then "make it live on the arcade version as an intro button next to the start button
  in the menu". The title's first row is now ARCADE and, beside it, INTRO, which plays the intro and hands it straight to
  an ARCADE run. It never plays on its own. `?intro` makes every start play it, for testing.
- The intro, ~11 s, in the engine:
  - The magenta Toko Midori Games™ lockup on black: the traced master face and the drawn logotype on one line. Toko
    blinks.
  - MIDORI fades. The camera pushes in while "drop" pops in under Toko, lower case. It holds a beat on the face plus
    "Toko / drop".
  - Then on in to the foot of the p, where a whitish drop gathers and lets go.
  - The camera follows the drop down and swings to straight down as it lands.
  - The floor's grid runs out of it in a blue ring to the rail. It opens its eyes. The camera pulls out to the game's
    own view while the HUD comes in piece by piece.
- **The drop is the hero.** Same mesh, same white satin gel, and it lands on the spawn point, so the run starts where the
  intro leaves it. The floor shader gained a reveal for this: the void outside a radius, a crisp blue front on its edge,
  and the grid lit behind it. At rest the reveal is off and play is unchanged.
- A 16-bit cue for every stage: pulse waves, a triangle and noise through a SNES-style echo. They are synthesised and go
  through the master gain, so mute mutes them.
- Any key, pointer or pad press skips it, except in its first 0.35 s, which still belong to the press that started it.
- `intro/master.js` and `intro/wordmark.js` are verbatim copies of the brand's `toko/js/`, because 2.0's own Pages has no
  `../toko/`. The logotype never had a p: it is built from the logotype's own d, mirrored, with its stem run 28 units
  below the baseline.
- Every frame is a function of the intro's time, which is what `__toko.capBegin()` / `capFrame(t)` / `introWav()`
  record the review film from.
- **Made on the arcade copy, not in the source repo**, which was not reachable from the session that built it. The
  source must take this as its v16 before its next deploy, or that deploy removes the intro. The patch and notes are in
  Suds-Jack `handoff/toko-drop-2-intro/`.
- Reconciled into the source from the arcade deploy (gh-pages `981f48c2`,
  built on the arcade copy because the source was out of reach; its handoff is
  Suds-Jack `claude/radio-free-helsinki-pvtsw5`, `handoff/toko-drop-2-intro/`).
  The patch applied to v15 unchanged; test and doc tokens moved to `?v=16`,
  and the smoke's DualSense walk to the DASH switch counts INTRO (five downs)

---

## v15 — 2026-10-22
**DRAPER and CLOAKER: all 27 of 1.x's gel types are in**
- **DRAPER** is 1.x's wall-weaver. It holds about 11 from you, keeps its
  broad face square to you, and every weave winds up for 0.9 s while its
  end-spools tumble. Then it looms a curtain: 13 bullets across your line
  with one 2-slot gap to slip through, marching at 0.72 of a shot's speed.
  Two of them cross their curtains. A curtain loomed slanted near a wall
  keeps the end bullets that start past the edge and walk back in, as 1.x's
  did (the core's tighter bullet bounds would have deleted 113 of 771
  curtains' bullets over 40 seeds)
- **CLOAKER** is 1.x's ambush. It stands visible for about a second, cloaks
  to a shimmer and runs to a flank 6.5–8 from you, then decloaks over
  0.6 s and fires a 3-shot fan. It can be hit in every state, as in 1.x.
  Its decloak strobe is drawn: 1.x wrote it and then overwrote it with
  black in the same frame, so it never showed there (`look.strobe` false
  restores that)
- A body you cannot fully see dies its own way: an elite CLOAKER killed
  while cloaked fades out as 1.x's did, rather than bursting into the
  solid jelly halves of v11
- Its shadow (v14) stays while it is cloaked: 1.x's shadow pass ignored a
  body's opacity, so a cloaked CLOAKER cast a full shadow there too
- Both are checked step by step against 1.x's own arithmetic: DRAPER 109
  checks, CLOAKER 74. Species: 27 of 27
- Cache tokens `?v=14` → `?v=15`; HUD label → `2.0 · v15`

---

## v14 — 2026-10-22
**The arena's light: shots and blasts light the floor, bodies cast shadows**
- The graphics pass's third step (owner, 2026-10-22). The floor stays matte,
  with no reflection: it is the grid it was, and later perhaps concrete. 1.x's
  floor is unlit, a picture, so no scene light can reach it. Instead, each
  frame a small top-down **light map** of the arena is drawn
  (`js/render/light.js`, `TUNING.light.arena`), and the floor reads it:
  - a shadow darkens what is under it
  - light lifts the floor a little and its grid lines a lot, the way a lit
    surface shows its texture
- **What throws light**: every bullet, a soft pool in its colour; each of
  your shots, a flicker at the muzzle; every kill, a burst in the body's
  colour that lights the grid round it, stronger for a big gel and a boss;
  and the dash boom
- **Every body stands in a soft shadow**, the hero too. Overlapping shadows
  take the darker of the two rather than adding up to black. A body its look
  hides casts none, and neither does a brood still waiting out its parent's
  pop
- The map's rows run the other way from the floor's, which the floor's
  sample accounts for. Checked on WebGPU and on WebGL 2, where a kill at the
  near edge first lit the far edge
- The smoke checks that every bullet in flight throws its pool of light. It
  fails with the light map switched off
- Cache tokens `?v=13` → `?v=14`; HUD label → `2.0 · v14`

---

## v13 — 2026-10-22
**Arcade juice: bullets glow, hits spark, kills flash and ring**
- The graphics pass's second step, after the jelly (owner, 2026-10-22: D,
  in order). It is all in colour and in world space, with no screen-wide
  bloom, because the owner prefers colour over bloom. Each glow is drawn
  additively in the colour of whatever made it (`js/render/juice.js`,
  `TUNING.juice`)
- **Every bullet is a small comet**: a soft halo round it and a short trail
  behind it, both in its own colour. The gels' shots glow harder than yours,
  because they are the ones you have to read
- **A hit throws sparks**: hot streaks sprayed back out of the body from
  where the shot landed (sprayed every way, half of them were hidden by the
  jelly)
- **A kill flashes and rings**: a hot disc in the body's colour that is gone
  in a blink, and a ring sent across the floor. It is bigger for a big gel
  and bigger again for a boss. The dash boom sends a ring too
- Three instanced draws carry all of it
- The smoke checks that every bullet in flight carries its glow, sampled
  while the gun is held. It fails with the juice switched off: at the end of
  a run no bullet is left in flight, so the first version of the check could
  never fail
- Cache tokens `?v=12` → `?v=13`; HUD label → `2.0 · v13`

---

## v12 — 2026-10-22
**PURP, PYRA, BOTFLY and BULWARK, and SLUG, REDD and SHEPHERD held to 1.x again**
- **PURP CUBE** is 1.x's circler. It tumbles on REDD's shared cube flop
  round a ring about 5 from you, firing a 2-arm pinwheel that turns each
  pulse. On death it breaks into a brood of PURP MINIs, more the later the
  wave (5 early, 45 from wave 25), held only by the child valve
- **PYRA** is 1.x's spinner turret, a floating orange ring with 4, 6 or 8
  gold holes. The holes are its hp: each hit closes one, and every hole
  lost spins it faster. Every live hole fires a 3-shot fan each volley. It
  never moves, and a PUSH dash leaves it standing. Its holes are drawn
  where their shots leave (1.x drew them counter-rotating against their
  own fans)
- **BOTFLY** is 1.x's hovering bot. It orbits 8 from you and charges for
  the last half second of its clock, then fires one homing shot that
  steers with 1.x's lerp
- **BULWARK** is 1.x's plate walker. It walks at you and turns its plate
  to face you, and a shot that hits the plate is spent with a tink, even a
  piercing one. It never fires and its corpse does not fire back
- **REDD's brood no longer takes its parent's shockwave**, and is not
  drawn while it waits out the parent's death pop (1.x builds the minis
  when the pop ends)
- **SLUG**: the CUT dash's last step no longer splits a slug twice. A dash
  that kills a slug outright kills it whole, where its head lay. Two
  middle hits in one frame split it the way 1.x did, and a freshly split
  half no longer slides in from its spawn point for a frame
- **SHEPHERD**: checked against 1.x, with tests for where the herd stops
  (1.2) and that a boss is never herded
- Species: 25 of 1.x's 27 types are in; DRAPER and CLOAKER are left
- Cache tokens `?v=11` → `?v=12`; HUD label → `2.0 · v12`

---

## v11 — 2026-10-22
**Jelly that dents when hit, and big gels die sliced in two**
- **A hit dents the jelly** where the shot landed, and the dent springs
  back with a wobble (a damped spring in the gel shader, `blob.dent`), on
  the blob and cube families. Their hit flash is softened to 0.4
  (`death.hitFlashJelly`) because a full white flash hid the dent. Satin
  bodies (crystals, TORO, BAMBU, the hero) keep the full flash
- **Big gels die as jelly cut along your shot line** (`js/render/jelly.js`,
  `death.jelly`). Any blob-family gel of radius 0.75 or more becomes a
  small soft body at the kill: a lattice of tets, ported from the Godot
  repo's `jelly_body.gd` (Q-052). It is cut by a vertical blade through
  the line from you to it, the two halves are pushed apart, and each
  wobbles, slumps and melts into its puddle over 1.3 s. Each half shows a
  clean, flat cut face, a cross-section pinned to its own tets, and its
  skin meets that face with no notches. At most 3 at once, and each
  species' jelly material is built while it is still alive, so the first
  slice does not stall WebGPU
- **The soft body has a set.** The new gate found the first cut was
  unstable: with edges this soft the lattice had no shear, so it flowed
  like syrup until its tets were slivers. Then the hard volume constraint
  fired particles off at 40 m/s, and one half in nine rolled back into
  the blade. Two fixes, and each has a control in the test that fails
  without it:
  - A pull toward the rest shape, carried with the body's centre and
    rotation (shape matching, `match` 0.04)
  - No volume constraint on the slivers the cut flattens (`sliver` 0.25)
- **A slice is cheap.** Each tet's inverse is computed once per cut, so
  pinning about 500 render vertices is multiply-adds, and the cut's code
  is warmed while the game loads (cold, the first slice of a run cost
  about 3× a warm one). A warm cut is 5 to 8 ms on a desktop, and a sliced
  body steps and draws in about 1 ms a frame
- Effects (droplets, splats, jelly) now freeze along with the look hold
  that captures use, so a frame shows the moment it asked for
- `test/jelly.mjs`, 20 checks, joins `scripts/smoke.sh`. It checks:
  - Volume, a clean cut and pinning
  - A dome left alone for four seconds stays a dome
  - The cut face stays flat through the slump
  - Across 24 cuts, no particle ever outruns its kick and every pair of
    halves parts by at least 0.3 m
  - The frame cost
- The smoke ends a running hurt flash before its screenshot. A hit in the
  2 s run had caught the 0.32 s red vignette mid-flash, which tinted the
  floor sample and failed the look check on a frame with nothing wrong in it
- Cache tokens `?v=10` → `?v=11`; HUD label → `2.0 · v11`

---

## v10 — 2026-10-22
**The first graphics pass: the gels are jelly now**
- **Every gel body is real jelly** (owner, 2026-10-22: the graphics pass,
  "real gelatin" first, held to their melon-jelly reference). It is mostly
  see-through, so the floor's grid bends behind it, and its colour comes
  from light travelling through it: deep where the body is thick, pale and
  bright at a thin edge, scaled to each body's size. An inner glow in its
  own hue keeps a gel's colour over the dark floor it lets through
- **The jelly has something to reflect**: a small studio painted in code
  (`js/render/env.js`), with a soft light overhead that slides across every
  crown and two strip lights on the horizon, one in the grid's teal and one
  warm, that catch the sides. 1.x had nothing to reflect, so a glossy gel
  showed one pin of light and read as plastic
- The crystals (OMEGA, the PRISMS, SHEPHERD), TORO's wheel and BAMBU's stalk
  keep their tuned satin, with the new reflections; the hero stays 1.x's
  white satin. `TUNING.material.jelly.on: false` puts every gel back on
  1.x's satin, `TUNING.env.on: false` takes the studio away
- Cache tokens `?v=9` → `?v=10`; HUD label → `2.0 · v10`

---

## Archive

One line per version; the full entries are in git history (`git log -p VERSIONS.md`).

- **v9** (2026-10-22) — Four more of 1.x's roster, and every earlier port held to 1.x
- **v8** (2026-10-22) — The bosses: OMEGA, the TWIN PRISMS and the WARDEN, as 1.x had them
- **v7** (2026-10-22) — A third dash on test: CUT goes through and hurts
- **v6** (2026-10-22) — The PUSH dash on test beside 1.x's, and tougher gels to push around
- **v5** (2026-10-21) — 1.x's rules underneath: a species module each, 1.x's crowd, score, hits and HARDCADE
- **v4** (2026-10-20) — 1.x's gelatin, on 1.x's floor, in 1.x's units — and ARCADE / HARDCADE / SURVIVAL
- **v3** (2026-10-19) — A game: twin sticks, six species, the night, HARDIVAL — playable from the menu
- **v2** (2026-10-19) — The slab fills the screen; the garage, lawns and street sit at its edges
- **v1** (2026-10-19) — M0: repo and rules — a blank night driveway with the version on screen
