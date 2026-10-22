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
