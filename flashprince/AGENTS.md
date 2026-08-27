# Flash Prince — non-negotiable animation rules

These rules apply to every file under `flashprince/`.

1. Read `animation-locks.json` before changing animation, movement, rendering, palette or input code. Run `node scripts/check-animation-locks.mjs` before and after the work.
2. The v18 run is immutable and retained as the selectable legacy character: do not redraw, regenerate, recolour, retime, mirror differently, reorder or replace its frames, holds, first-six-frame start, orientation or 1.22px root speed.
3. The default character is the complete Conrad-sheet character approved for v51, including Conrad row 4 for running and row 5 for wind-up. Never mix the v18 run into that default character.
4. Changing the run requires explicit user permission naming it. Otherwise stop.
5. The Conrad B. Hart sheet is primary reference. Compare every new frame against the corresponding Flashback GIF sequence before release and record the mapping.
6. Never call generated approximation Conrad-checked unless that comparison happened.
7. A playable release requires keyboard, mobile and gamepad testing, including Z/up and right-stick up/press jump; update the Hub version and smoke-check the deployed build.
8. The v23 START/RUN art was rejected and must never return.
