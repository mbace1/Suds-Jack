# Flash Prince — versions

The public release number. The `?v=N` token in `index.html` is a separate
thing: it tracks every module-graph change so a browser cannot serve half of
one build and half of another. Bump both when shipping.

## v4 — 2026-07-28

Art built to the owner's reference sheets (two Another World tribute
illustrations, 2026-07). What they demanded that the build was not doing:

- **Every material is a RAMP, not a fill.** A rock face in the reference is a
  lit top plane, a mid face, a shadow side and a dark crevice line — four
  values on one shape — and every mass here was being painted with exactly
  one. The sixteen-colour rule was never the obstacle; the eleven world slots
  were just being spent flat. Every surface now carries EDGE / NEAR / SOLID /
  DARK across it.
- **Foliage is clustered blades, not a frond on a stick.** New `leaves()`:
  broad leaves over a NARROW fan, widest about halfway along, on a filled base,
  drawn dark and then lighter and smaller over the top. The first cut used thin
  triangles over a 270° fan and every cluster came out a black starburst.
- **Growth over every lip** — moss and creeper hanging off each exposed
  surface, LIGHTER than the stone it hangs from. The other way round it reads
  as damage rather than as life, which is the tell in both references.
- **Ruins became architecture**: base, tapered shaft with a lit edge and
  flutes, capital, lintel, and a carved meander. Palace arches got a keystone,
  an impost course and a dark void behind them.
- **The machine became a machine**: dark armoured plate with cyan light strips,
  hot orange vents and slack cable runs, instead of one flat wheel.
- **Warm against cool.** Both references live on it — teal jungle against
  orange machine light, cyan crystal against red rock — and each biome was
  sitting in a single temperature. The reactor's LUX2 is now a hot orange.
- **A sky with things in it**: stars, and three bodies rather than two.
- Foreground **bioluminescence** — glowing caps and crystals clustered along
  the bottom of the frame — and **petroglyphs** cut into the rock where the
  stone starts and the jungle ends.

One thing that had to be walked back: the first atmosphere pass stacked three
haze veils all the way down to the floor, which added to about half an alpha
over everything the player stands on and turned the whole picture pale.
Recession has to happen BEHIND the action, not on it — it is two bands in the
middle distance and one veil at the foot now.

## v3 — 2026-07-28

Prince of Persia's move set, properly; a real control panel on a phone; and
the rock stops being one poured shape.

**The move set.** What was here was Flashback's half — commit, run, hang,
mantle. This is the rest of PoP's vocabulary, and every one of them exists
because the original had it and the game is worse without it:

- **The careful step** (Shift + a direction). Five pixels instead of twelve
  and twenty-six frames instead of twenty-two: more time to travel less
  ground, which is exactly the trade you want when the floor runs out in nine
  pixels. Held, it never promotes to a run. It is the most useful button in
  Prince of Persia and it was missing.
- **Climbing down** (down, at a lip). He kneels, gets his hands on the edge
  and lowers himself over it — twenty-six pixels of descent for free, and the
  difference between a two-storey drop and a survivable one. The button that
  did it is still held when he arrives, so letting go needs a fresh press;
  without that he dropped into the thing he had just carefully avoided.
- **Stepping up** onto anything a foot high, rather than hanging off it. A
  move set that dangles you from a kerb is comic.
- **The run-turn** — plant, pivot, go back the other way in twenty-two frames
  instead of skidding to a halt and then turning in thirty-four.
- **The wall bump.** Running into stone stops you and takes a moment back for
  it. And he will not sprint at a wall he is already standing against, which
  is what turned the first cut into a bump-step-bump oscillation.
- **The flask** now needs a crouch over it, as PoP's potions do — a beat of
  vulnerability in exchange for the heal.
- **A buffered jump.** 26 frames, just longer than a step. A committed move
  set has to forgive a button pressed while you are locked out of the world,
  or it reads as unresponsive when it is only committed.

**The sword.** Found in the tomb, and once it is out he is in a stance rather
than walking: forward advances, back retreats, up strikes, Shift parries, down
puts it away. The **swordsman** runs the same grammar with the same wind-ups,
so a fight is two people reading each other. A strike lands on ONE frame in
the middle of the swing; the parry window is four frames either side of it.
Parry and the blades ring and nobody is hurt. Stand there and you lose a
flask.

**The controls, on a phone.** Held upright, the pad is now a real panel UNDER
the picture — a thumb on a portrait phone covers the bottom third of the
glass, and in a game where the thing that kills you is at your feet that is
the third you most need to see. Landscape keeps the overlay, pushed into the
corners and kept faint. Both are drawn in display pixels rather than into the
sixteen-colour buffer, and both only appear on a touchscreen.

**Art.** Coursed masonry on everything built and bedding planes on everything
natural; alcoves cut into the back walls; grass tufts on soil and chipped
edges on stone; sconces that wash the wall behind them.

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
