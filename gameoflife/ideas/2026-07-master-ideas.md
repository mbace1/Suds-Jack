# Master idea document — received 2026-07-23

Source: project owner, via idea-form exchange. Reference art in `ref/`
(original): `kintsugi-overflow.png`, `horizon-pine-vignette.png`,
`constellation-nebula.png`, `hanami-river-widescreen.png`.

## Global visual standard (applies to everything going forward)

1. **Abstract Vignette** — 16-bit pixel art floating in pure black
   (`#000000`). The frame is irregular and jagged, dictated by the central
   object.
2. **Cinematic Widescreen** — 16-bit art framed by hard black letterbox
   bars (16:9 or 2.35:1) for sweeping landscapes against the void.
3. **The Breakout Element** — key interactions (water spilling, dust
   falling, light glowing) must physically break the vignette boundary,
   spilling into the black void.
4. **Palette** — muted classic European graphic-novel tones (Moebius,
   Valerian) for environments; jarring luminescent **cyan** or **gold**
   for interactive elements (water, light, energy).

## Implementation queue (owner content — jumps ahead of Claude's picks)

### Stories
- [x] **The Silver Plate** — Paris 1838, first photo of a human. *History
      only remembers what stands still.* → sit still 2 min in a busy place. (v11)
- [x] **The Four Dots** — Padua 1610, Galileo + Jupiter's moons. → find the (v13)
      brightest non-moon light tonight.
- [x] **The Glass Plate** — Palo Alto 1878, Muybridge's horse. → blink-freeze (v14)
      a running animal.
- [ ] **The Tether** — Paris 1783, first free balloon flight. → look down
      from the highest walkable point.
- [ ] **The Cloudberry Patch** — Finnish marsh, bear tracks. *Not everything
      beautiful is meant for you.* → leave a beautiful thing where it is.
- [x] **The Golden Seam** — kintsugi. *Scars are proof of survival.* → trace
      a repaired object's damage for one minute. (ref: kintsugi-overflow.png) (v12)
- [ ] **The Ice Core** — arctic station, layers of memory. → imagine your
      square of earth 100 years ago.

### Games
- [ ] **Water Downhill** — TILT variant of the aqueduct (angle a stone until
      the trickle runs; the water breaks the frame).
- [ ] **The Bronze Gears** — Antikythera; rotate gears until they clank into
      an eclipse. → watch a second hand make one full circle.
- [x] **Empty Your Cup v2** — cyan overflow breaks (v12; hold-to-pour + Raku still open)
      the vignette. (upgrade of `cup`; ref: kintsugi-overflow.png)
- [ ] **The Cairn** — balance three irregular stones. *Gravity is infinitely
      patient.* → balance two real rocks, leave them.
- [ ] **Trace the Chaos** — free-form constellation drawing; connecting stars
      reveals nebula dust. (extends `stars`; ref: constellation-nebula.png)
      → find and name your own star pattern.

### Wisdom
- [x] **Stand and Wait** (shipped as `wait`) — press once, then stand while the
      mist thins over ~9 s and the horizon pine resolves; fireflies lift into the
      void, tapping only earns "the mist keeps its own time." *Patience doesn't
      end; it deepens.* (ref: horizon-pine-vignette.png; reference-grade dithered
      fog + vignette) → stand at a tree's base for three minutes.
- [ ] **The Lichen** — leave the controls alone for 15 s and lichen blooms.
      *Growth happens when you stop forcing it.* → press a hand to moss for
      thirty seconds.

## Parked (Claude's pre-existing pick, superseded by this queue)
- The Living Wall — English hedgerows + Hooper's rule (one woody species per
  century in thirty paces). → read the oldest living boundary near you.
