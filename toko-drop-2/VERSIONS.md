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
