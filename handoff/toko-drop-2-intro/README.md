# Toko Drop 2.0 v16: the start intro, behind an INTRO button

**Live on the arcade since 22 Oct 2026** as `gh-pages` commit `981f48c2` ("Arcade: Toko Drop 2.0 v16 — the start intro,
behind an INTRO button beside ARCADE, at toko-drop-2/"). This folder reconciles that deploy back to `main` (AGENTS.md
§2b), because `main` does not carry the 2.0 copy.

Owner, 22 Oct: "Make a start video for toko drop", then, after the review film, "make it live on the arcade version as an
intro button next to the start button in the menu", then "Make a PR after putting it in v15 or 16".

## What shipped

- **The title's first row is ARCADE and, beside it, INTRO.** INTRO plays the ~11 s intro and hands it straight to an
  ARCADE run. The intro never plays on its own. `?intro` makes every start play it, for testing.
- **The intro**, in the engine and computed from its own time `t`:
  1. The magenta Toko Midori Games™ lockup on black, with the traced master face and the drawn logotype on one line.
     Toko blinks.
  2. MIDORI fades. The camera pushes in while "drop" pops in under Toko in lower case, then holds a beat on the face and
     "Toko / drop".
  3. The camera goes on in to the foot of the p, where a whitish drop gathers and lets go.
  4. The camera follows the drop down and swings round to look straight down as it lands.
  5. The floor's grid runs out of the drop in a blue ring, out to the rail.
  6. The drop opens its eyes.
  7. The camera pulls out to the game's own view while the HUD comes in.
- **The drop is the hero.** It is the same mesh and the same white satin gel, and it lands on the spawn point.
- **The floor shader gained a reveal.** At rest it is off, so play is unchanged.
- **Sound:** a 16-bit cue for every stage, synthesised, through the master gain.
- **Skipping:** any key, pointer or pad press skips the intro, except in its first 0.35 s.
- **Versioning:** every `?v=` token moved 15 → 16, as 2.0's own releases move them. The HUD label reads `2.0 · v16`. There
  is a v16 entry in `toko-drop-2/VERSIONS.md`. The catalogue note and the `versions.json` row were updated for this cabinet
  only.

**Follow-up `fe85a015`: the token cascade.** `981f48c2` changed `hub/games.js` without moving its token, so a returning
visitor's service worker kept the v15 note. The cascade the v15 deploy did, computed from the imports:
- `games.js` v146, hub v150, shell v109, hub-entry v73
- `sw` v139
- the counter's chain to `board.js` v15

Only tokens changed. The hub, AnotherHUB, the counter, `toko-drop-2` and `hyperdagger` load with no HTTP or page errors.

## Files here

- `intro-v16.patch` is the exact deployed change, `git diff 25dae247 981f48c2 -- toko-drop-2/`. It applies cleanly to
  v15. It adds `js/intro/{intro,sfx,master,wordmark}.js` and changes `js/main.js`, `js/ui.js`, `js/render/floor.js`,
  `index.html` and `VERSIONS.md`, plus the token move.
- `toko-drop-2-intro-review.mp4` is the review film: 1920×1080, 14 s, recorded frame by frame from the real game with its
  own sound.
- `tools/film.cjs` and `tools/stills.cjs` record the film and stills through `__toko.capBegin()` / `capFrame(t)` /
  `introWav()`.
- `tools/verify.cjs` is the release check. It drives the real route: the hub's cabinet link, the 2.0 title, clicking
  INTRO, and the intro handing over to play.

## How it was verified (Chromium on SwiftShader, which falls back to WebGL 2)

`tools/verify.cjs` against the deploy tree: 14/14 passed.
- The hub links to `toko-drop-2/` and shows the v16 note. The label reads v16.
- The first row is ARCADE + INTRO, and both buttons are at least 44 px.
- INTRO starts the intro, which hands over to play on its own after about 11 s. The HUD is up and no inline styles are
  left behind.
- ARCADE still starts a run directly.
- A key skips the intro.
- The title fits at 390×844 and 844×390 with no sideways scroll.
- No fault box and no page errors.

## Still open

- **The 2.0 source repo (`mbace1/toko-drop`) does not have this yet.** It was not reachable from the session that built
  it (the Claude GitHub App is not installed on it). It must take `intro-v16.patch` as its v16, or renumber if it has
  already used v16, before its next deploy. **A deploy from the source without it removes the intro from the arcade.**
- It has not run on a real GPU, on the WebGPU backend, or on a phone. Check on a phone: open Toko Drop 2.0 from the hub
  and press INTRO, holding the phone both ways.
- The pad skip has not been tried with a real controller. The code path is there.
