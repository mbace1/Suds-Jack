# Toko Drop 2.0: the start intro (draft for approval, 22 Oct 2026)

Owner, 22 Oct: "Make a start video for toko drop." The game is 2.0, and the intro is built in-game with an MP4 for review
(both picked by the owner in answer to a question).

**Status: built and recorded, waiting for approval. Not shipped.** The 2.0 source repo (`mbace1/toko-drop`) is not
reachable from the session that built this: the Claude GitHub App is not installed on it. So the intro was built against
the **deployed v15** (`gh-pages:toko-drop-2/`, which is plain ES modules and the same code) and staged here. To ship it,
someone applies it in the source repo (see below).

- Review film: `toko-drop-2-intro-review.mp4`, 1920×1080, 14 s: the 11 s intro, then 3 s of the run under the look
  check's bot. Recorded frame by frame from the real game, with its own sound.
- Patch: `intro-v15.patch`. It applies cleanly to deployed v15 (`patch -p1`, checked).
- Files: `js/intro/{intro,sfx,master,wordmark}.js` (new), `js/render/floor.js` and `js/main.js` (changed).
- Capture: `tools/film.cjs` (the film) and `tools/stills.cjs` (stills at chosen times).

## What it does (the owner's brief, in order)

| t (s) | picture | sound (16-bit: pulse waves, triangle, noise, a SNES-style echo) |
|---|---|---|
| 0.55 | Magenta Toko Midori Games™ on black: the traced master face on the left, the drawn logotype on one line | bright 25 % pulse arpeggio over a triangle root |
| 2.05 | Toko blinks (the brand's resting animation) | the smallest tick |
| 2.6 | MIDORI fades and sinks | two soft falling triangle notes |
| 3.05–4.4 | Push in; "drop" pops in under "Toko", lower case, letter by letter; a beat on the face + **Toko / drop** title card | air rush; four staccato blips, C E G C |
| 4.4–5.0 | On in to the foot of the p | |
| 4.95–6.15 | A whitish drop gathers under the p, swells, stretches, hangs on a thread | rising wobbly bloop; a plink as it necks |
| 6.15–6.93 | It lets go; the camera follows it down and swings over to look straight down as it lands | slide whistle down; thump, splat and plip |
| 7.0–8.7 | The blue grid runs out of the drop in a ring, the camera pulling up to watch it reach the rail | shimmering climb on a thin pulse |
| 9.0 | The camera comes down and round to its face; it **opens its eyes**, hops, and blinks | pi-ping |
| 9.45–10.85 | Pull out to the game's own camera (view offset and all); score, lives, clock and pause come in one by one | a tick per HUD element |
| 10.85 | The run starts (the mode banner, then wave 1) | a short major stab |

**The drop IS the hero**: the same mesh and the same white satin gel. It lands on the spawn point, so the run starts
from exactly where the intro leaves it. The grid is the arena floor's own shader, given a reveal (the void outside a
radius, a crisp blue front on its edge, the grid lit up behind it). At rest the reveal is off and play is unchanged.

## Rules it follows

- **Once per tab** (`sessionStorage toko2.intro`), before the first run only; AGAIN goes straight in. `?intro` plays it
  every run, and `?nointro` never plays it. It is off under `prefers-reduced-motion`.
- **Any press skips it**: key, pointer or pad. The first 0.35 s is ignored, because the press that started the run would
  otherwise skip it too. A skip silences the scheduled cues and starts the run at once.
- **Every frame is a function of t** (`intro.frame(t)`), so the game, a skip and the capture draw the same thing.
- **The brand is the brand's own.** `master.js` and `wordmark.js` are verbatim copies of `toko/js/` (vendored, because
  2.0's own Pages has no `../toko/`). The logotype never had a **p**, so it is built from the same parts as its d, mirrored,
  with the stem run 28 units below the baseline. Two colours only: black and #F0027F.
- **Sound is synthesised and goes through the game's master gain**, so mute mutes it. The film measures −27 LUFS
  integrated with a peak of −12 dBFS: subtle, and the loudest cue sits a step below a kill.

## To ship it (in `mbace1/toko-drop`)

1. Apply `intro-v15.patch` (or copy the files) onto the version it is based on, v15. Check that nothing newer touched
   `main.js` or `render/floor.js`.
2. `scripts/bump-version.sh 16`, so the new modules get `?v=16` like the rest. Fill in the stub:

   ```
   ## v16 — 2026-10-2x
   **The start intro: Toko Midori Games → Toko drop → the drop lands, the grid runs out of it, it opens its eyes**
   - Before the first run of a tab: the magenta lockup on black, MIDORI goes, "drop" pops in under Toko, a whitish drop
     gathers under the p and falls; the camera follows it down to looking straight down, the floor's grid runs out of it
     in a blue ring, it opens its eyes, and the camera pulls out to the game's view as the HUD comes in. ~11 s.
   - The drop is the hero (same mesh, same gel) and lands on the spawn point. The floor shader has a reveal for it
     (off at rest).
   - 16-bit cues for every stage, synthesised, through the master gain.
   - Any press skips (not in its first 0.35 s); once per tab; ?intro / ?nointro; off under reduced motion.
   ```
3. Run the gates, then check it on a phone with `?intro`, held both ways.

## Honest limits

- **Never run on a real GPU or on the WebGPU backend.** Everything here ran on SwiftShader through `?webgl`. The phone
  check is the real test.
- **Built on deployed v15, not the source repo.** If the source has moved past v15 in `main.js` or `floor.js`, the patch
  needs merging by hand.
- **The arcade's own sting** plays once per browser on the first Play from the hub. So a first-ever visit from the hub
  sees the Toko sting and then this lockup. Every visit after that sees only this.
- **The pad skip has not been tested with a real controller.** The code path is there: any button, after 0.35 s.
- The Godot port is untouched.
