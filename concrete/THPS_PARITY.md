# CONCRETE — distance to Tony Hawk's Pro Skater

The ordered list of what the original THPS (1999) does that this build does
not, with a recommendation per item. Ordered by what changes a *line* the
most for the least code, because a two-minute score attack lives or dies on
whether one trick can be linked to the next. Written 2026-09-19 against v5.

**What is already here (v5):** two-minute runs, ollie, kickflip, indy grab,
50-50 and boardslide on rails and ledges (funbox, crates, benches), lip
stalls (Axle, Nose, Tail, Rock to Fakie) with an ollie out or a drop-in,
vert airs off the three quarter pipes with a landing back on the transition,
spins scored on landing, a combo that multiplies and banks on landing, bails
that get up in place, solid props that stop or slam you, a DualSense-first
control scheme in THPS's own layout.

## Recommended, in order

1. **Named gaps.** THPS's score is half gap bonuses ("Over the rail", "Funbox
   transfer", "Crate to crate"). A gap is a pair of trigger volumes and a
   name; leaving one and landing in the other inside a combo adds points and
   prints the name. Cheap (a table of AABB pairs in `skate.js`), and it is
   what makes the room a *level* instead of an obstacle course — it tells the
   player which lines the room was built for. Suggested first five: over
   the long rail, the funbox lip-to-lip, crate to crate at (24, −26/−22),
   quarter-to-deck, and a north-to-east transfer.
2. **The grind balance meter.** In THPS 1 a grind has a wobbling meter you
   hold with left/right; fall off it and you bail. Without it a grind is a
   free score per second, which is why v5 caps its worth. One float, one
   HUD bar, ±steer to correct, and the drift grows with the grind's length.
   A half-day, and it turns every ledge into a skill check.
3. **Spin bonus written into the trick name and the multiplier.** v5 adds
   `180`/`360` to the combo on landing but the multiplier only steps on a
   trick. THPS steps the multiplier per spin as well, and reads "Kickflip
   360". Small change to `land()`.
4. **More flip and grab tricks on the two buttons + a direction.** THPS maps
   square+direction to heelflip / pop shove-it / varial, circle+direction to
   melon / stalefish / nosegrab. The skater poses are cheap (edits of the
   air pose in `skater.js`); the board rotation for a shove-it is
   `deck.rotation.y`. Eight tricks from two poses and one table.
5. **Special meter and one special per skater.** Fill it by landing clean,
   lose it on a bail, and a special (the 900, a benihana, a darkslide) is
   worth 3–5× a normal trick. Needs the pose and a HUD bar; the meter is
   the reason to keep landing rather than to keep bailing for the restart.
6. **Goals per run: high score, a SKATE letter set, a hidden tape.** THPS's
   level has five goals; three are collectibles placed on lines the level
   wants you to find. Letters on top of the crates, over the long rail and
   on the east deck would teach the room. Collectibles are trigger volumes
   plus a HUD row; persistence in `concrete-goals`.
7. **Manual (THPS 2) and revert (THPS 3).** Deliberately after the above:
   both exist to link *between* objects, and until the objects have gaps and
   the grinds have a meter there is nothing to link that is worth the
   balance mechanic each needs. Manual is down-up on the stick with its own
   balance bar; revert is a landing input off a transition.
8. **A second level.** The warehouse is THPS's first level for a reason: one
   room, every object type once. A second room should come after the goals,
   because a level without goals is a room.
9. **Create-a-skater / outfits.** `skater.js` builds from one `OUTFIT`
   table; a picker is a menu row and a persisted key. Cosmetic, last.

## Not recommended

- **Camera modes / free camera.** The follow camera with the right stick is
  enough for a room this size, and THPS's own camera is the follow camera.
- **Multiplayer / horse.** A second pad on one screen doubles every system
  and this room has one line at a time in it.
- **Physics-sim board (Skate-style).** This is a THPS homage; the board is a
  cursor with tricks, and the ramp code (`ground()`, `slopeAlong()`) is
  written for that, not for a rigid body.

## Known limits in v5

- **The camera does not collide.** It is clamped inside the room (v5, after
  the new decks put the skater's back to the end wall and the chase seat went
  through it), but it still passes through the funbox and the crates. THPS
  pulls the camera in; a sphere cast from the skater would do it here.
- **A grind is worth a flat 100 a second** and cannot be fallen off. Item 2
  above is the fix, and until it lands every ledge is free score.
- **A stall cannot be held.** It runs 0.75 s and then drops you in. THPS holds
  it until you move; holding needs an input to hold and the grind button is
  already the one that got you there.

## Known drift to fix on the art side

- The Blender room (`assets/models/warehouse*.glb`) stands three bins
  inside the east quarter pipe (`art-source/export.py`, "Utility bin" at
  x 25.8, z 27–31). The physics keeps them by the rolling door; the desktop
  tier draws them in the ramp. Needs a re-export with the bins moved.
- The Blender room has no decks behind its copings; v5 draws code-built
  decks over it on both tiers. A re-export should model them.
