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
