# Flash Prince — versions

The public release number. The `?v=N` token in `index.html` is a separate
thing: it tracks every module-graph change so a browser cannot serve half of
one build and half of another. Bump both when shipping.

## v7 — 2026-09-05

Traversal validation close-out. The public Hub route remains the real campaign; the dedicated movement lab now covers the two remaining unverified locomotion cases in a real Chromium input pass.

- Scene 3 now verifies an authored **70px deliberate drop** into `landHard`, exactly one health lost, grounded impact at **y=176**, and recovery back to `stand` with **0 transition faults**.
- Scene 1 now verifies both **release braking** (`run → runStop → stand`) and a live **reverse brake/pivot** (`run → runStop → pivot → runStart → run`) with the facing direction actually flipped.
- Existing browser coverage for running gap/landing, ledge catch/pull-up, low mantle, climb-down and shimmy remains in the same gate.
- Movement diagnostics are now **FP-MOVE-9** and expose face + health so recovery behavior is directly testable.
- `/flashprince/` still launches the campaign through `js/main.js?v=9`; movement-only code remains isolated at `/flashprince/movement-lab.html`.

If this gate is green, the traversal exit condition is met and the next Flash Prince work returns to character-specific animation, shooting and shield integration.

## v6 — 2026-09-04

Playable-entry hotfix. The Hub cabinet had accidentally been wired to the Rotoscope movement lab instead of the actual campaign loop, so movement CI could be green while the public game was not a valid end-to-end build.

- `/flashprince/` now launches the real campaign through `js/main.js?v=9`.
- The Rotoscope 3.0 movement lab remains available separately at `/flashprince/movement-lab.html` and keeps build marker **FP-MOVE-8**.
- Added a Chromium playable-entry regression that opens the exact Hub route, advances the opening screen with player input, and verifies the campaign continues updating without page or console errors.
- The existing Chromium movement regressions now explicitly run against the separate movement-lab URL, preventing test infrastructure from silently replacing the public game again.
- CI now gates both the real Hub playable path and the movement laboratory independently.

Movement work resumes only after this Hub route is verified playable.

## v5 — 2026-09-04

Broken Transit is now covered as a complete browser-played traversal sequence rather than isolated state assertions.

- Chromium accelerates into a real run, clears the authored **three-tile gap**, and must resolve through `landRun` on the lower right platform.
- It continues into a second running jump, catches the **32px raised ledge**, settles through `ledgeCatch → hang`, and completes `pullUp` onto the upper platform.
- The verified finish is **x=229.1 / y=96**, grounded, with **0 transition faults**.
- The pass exposed one hidden validator mismatch in normal gameplay: fast floor contact is implemented as `air → land → landRun`, while the movement contract only represented a direct `air → landRun`. The real runtime promotion is now explicitly legal and regression-tested.
- Scene 4 low mantle remains in the browser gate and still finishes grounded at **y=160**.
- The playable entry uses module token **v8** and exposes build marker **FP-MOVE-8**.

Next movement pass: deliberate climb-down and shimmy, then hard landing and brake/pivot before returning to character-specific animation and combat work.

## v4 — 2026-09-04

Movement foundation release. This is the first Flash Prince build with a dedicated runtime movement gate rather than relying on visual inspection alone.

- Fixed the low-mantle failure where the hero could rise one tile but remain horizontally beside the obstacle, then fall or jitter on the following frame.
- Low mantle now commits to a measured **16px rise + 12px carry** onto the upper surface.
- Corrected legal movement transitions for landing reversals, running-landing continuation and low-mantle continuation.
- Added deterministic state and geometry regressions for standing/running jumps, ledge catch and pull-up, deliberate climb-down, mantle, crouch/roll and landing recovery.
- Added an isolated Flash Prince CI gate plus a real Chromium Scene 4 playthrough. The browser test reaches `lowMantle`, completes at **y=160**, verifies the hero is grounded, and reports **0 transition faults**.
- The playable entry uses module token **v7** and exposes build marker **FP-MOVE-7** for verification.

The next pass stays on Flash Prince: expand the same real-browser coverage to running gap/ledge catch, hard landing, climb-down/shimmy and brake/pivot before returning to character-specific animation and combat work.

## v3 — 2026-08-08

The Hub build is now an art-and-animation presentation build rather than a bare
diagnostic grid.

- **Rotoscope 3.0** adds eight-key running silhouettes plus dedicated walking,
  braking, jump, landing and ledge-impact keys. Root motion and collision stay
  unchanged; only the authored body performance changes, so the pass can be
  judged without destabilising movement.
- **Four authored presentation scenes** replace the grid as the default view:
  jungle arrival, broken transit, reactor shaft and palace ruin. They use hard
  palette bands, large filled polygon masses, foreground silhouettes, sparse
  moving light/particles and no gradients or texture maps.
- The lab keeps its analysis tools, but they are hidden by default. `H` reveals
  state/frame/phase data; `1–4` switches scenes, `R` resets.
- The playable entry now loads `movement-lab-v3.js?v=6`.

This is a strong step toward the Flashback art/animation target, but it is not
yet a 90% claim: enemy animation, character-specific costume detail, scene
composition density and full campaign integration still need another pass.

## v2 — 2026-07-28

The first act stops being one long screen.

Laid out side by side, screens 0–4 were the same composition five times: palms
at the edges, two suns, a ridge. Every screen was distinct in LAYOUT — which is
what you die on — but not one of them was somewhere you could name afterwards,
and five identical pictures is the fastest way to make a hand-authored world
feel generated.

- **`scene`** — a new optional field on a room. The biome still decides the
  sixteen colours and which shapes are allowed; `scene` decides where in that
  biome you are standing, and hangs one thing in the frame you remember the
  room by. It changes the trunks (count, height, girth, lean) and adds that
  screen's own furniture.
- `pod` — the capsule that put him here, half-buried at the end of the furrow
  it cut, hatch blown off, still venting
- `chasm` — no far side: mist all the way down with something lit at the
  bottom of it, which is the only reason you can tell it is far
- `understory` — down among it, a ceiling of leaves overhead and undergrowth at your feet, the sky only a rumour
- `canopy` — above it, the mist now a sea below you with the tops of the trees coming up through it
- `firstStone` — the first thing anybody built, seen through the last trees
- `colonnade` — two near columns in black across screen 9, which is what tells it apart from screen 8: both are cut block with glyphs, and at a glance they were the same picture

## v1 — 2026-07-27

First build. A cinematic platformer in the Another World idiom: filled polygons quantised to sixteen colours, rotoscoped skeletal animation, fixed screens with a hard cut between them.

- **Movement is committed.** Every grounded move is a scripted length — a step is 22 frames and carries 12px, a turn is 18, a mantle is 40 — and the stick is not connected to anything until the move declares itself open. Tap a direction for one step, hold it and the step runs on into a run.
- **The ledge.** Walk off an edge and he catches it rather than falls; hold toward a lip in the air and he grabs it; up mantles him over. A standing jump rises 27px, so his hands reach a lip 53px up, so a 48px storey is climbable — every distance in the level is measured off those numbers.
- **Falls.** One storey free, two hurt, three kill. Prince of Persia's ladder.
- **The duel.** A sentry takes 68 frames from seeing you to firing (spot 26, draw 26, aim 16) and so do you — drawing the pistol costs 21. Crouch and his shot goes over your head; roll and you go under it.
- **Fourteen screens**, jungle → dig → tomb → reactor → palace → overgrown, with the sixteen-colour palette walking continuously across the whole run so no two adjacent screens are the same colour and no screen announces a change.
- Traps: proximity-free spike cycles, ceiling slabs, tiles that will not hold, a plate-and-gate on a timer, pulsing force fields.
- Beast, sentry and drone; three health cells; a run clock with a best time in `localStorage` under `flashPrinceBest`.
- Keyboard, gamepad and an on-screen pad on touch. The arcade shell for the way back to the hub.
