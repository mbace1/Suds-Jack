# Flash Prince — versions

The public release number. The `?v=N` token in `index.html` is a separate
thing: it tracks every module-graph change so a browser cannot serve half of
one build and half of another. Bump both when shipping.

## v1 — 2026-07-27

First build. A cinematic platformer in the Another World idiom: filled
polygons quantised to sixteen colours, rotoscoped skeletal animation, fixed
screens with a hard cut between them.

- **Movement is committed.** Every grounded move is a scripted length — a step
  is 22 frames and carries 12px, a turn is 18, a mantle is 40 — and the stick
  is not connected to anything until the move declares itself open. Tap a
  direction for one step, hold it and the step runs on into a run.
- **The ledge.** Walk off an edge and he catches it rather than falls; hold
  toward a lip in the air and he grabs it; up mantles him over. A standing jump
  rises 27px, so his hands reach a lip 53px up, so a 48px storey is climbable —
  every distance in the level is measured off those numbers.
- **Falls.** One storey free, two hurt, three kill. Prince of Persia's ladder.
- **The duel.** A sentry takes 68 frames from seeing you to firing (spot 26,
  draw 26, aim 16) and so do you — drawing the pistol costs 21. Crouch and his
  shot goes over your head; roll and you go under it.
- **Fourteen screens**, jungle → dig → tomb → reactor → palace → overgrown,
  with the sixteen-colour palette walking continuously across the whole run so
  no two adjacent screens are the same colour and no screen announces a change.
- Traps: proximity-free spike cycles, ceiling slabs, tiles that will not hold,
  a plate-and-gate on a timer, pulsing force fields.
- Beast, sentry and drone; three health cells; a run clock with a best time in
  `localStorage` under `flashPrinceBest`.
- Keyboard, gamepad and an on-screen pad on touch. The arcade shell for the way
  back to the hub.
