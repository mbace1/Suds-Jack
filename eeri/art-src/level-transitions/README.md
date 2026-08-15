# Eeri level transition pack

Source-only transition language for connecting screens and level states without making the player wait.

The visual metaphor is **a small handmade construction board**: kraft card, hazard tape, a stamped EERI level address. It should feel like part of the toy world, not a separate UI skin.

## Included moments

- `level_in` — short card reveal with `EERI 1-2` style stamp
- `retry` — fastest path; no celebration, no copy, no punishment
- `checkpoint_respawn` — quick tape wipe that preserves continuity
- `level_clear` — the only transition allowed to breathe
- `world_change` — broader card swap for a new material/world palette

## Rules

1. Retry is under 420 ms total and never says fail/death.
2. Level entry is under 700 ms; gameplay may load behind the cover.
3. Level clear can run to ~1.1 s because the player has already finished.
4. Text is only the canonical level address / existing world name; no new exposition.
5. Reduced motion becomes a short opacity swap, never a moving full-screen wipe.

`transition-spec.js` holds timings. `transition-elements.svg` contains reusable source pieces. `transition-lab.html` auditions all variants without booting the game.
