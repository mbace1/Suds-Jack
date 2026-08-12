# Flash Prince — versions

The public release number. The `?v=N` token in `index.html` is a separate
thing: it tracks every module-graph change so a browser cannot serve half of
one build and half of another. Bump both when shipping.

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
- `understory` — down among it, a ceiling of leaves overhead and undergrowth
  at your feet, the sky only a rumour
- `canopy` — above it, the mist now a sea below you with the tops of the trees
  coming up through it
- `firstStone` — the first thing anybody built, seen through the last trees
- `colonnade` — two near columns in black across screen 9, which is what tells
  it apart from screen 8: both are cut block with glyphs, and at a glance they
  were the same picture

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
