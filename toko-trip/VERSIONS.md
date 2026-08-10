# Toko Trip — release log

## v2 — 2026-08-10

The cove got much bigger, the island got a book, a radio and a way home,
and the whole thing got a gate.

- **A broad, mellow bay.** `groundHeight`'s profile is now written in world
  metres instead of a normalised dome, because "how many steps of sand
  before the water" is the thing being tuned and a normalised dome hides
  it. A grass crown at ~1.7 m falls to the waterline around r 13 — five
  metres of walkable beach — while the cove tip still drops under water
  about four steps in front of the chair. `ISLAND_R` 18, a wider spine,
  more palms and reeds; every scatter pass re-placed itself off the same
  function, which is what that function is for.
- **Fixed: the chair faced away from the water.** The model is built with
  its backrest at local +z, so rotating the nook by `chairYaw` sat you with
  your back to the cove. `chairYaw` is now documented as the direction the
  *sitter faces*, the nook rotates by `chairYaw + π`, and one `nook()`
  helper maps every local coordinate, so the deck, radio and book cannot
  drift apart from it again. The gate asserts it behaviourally.
- **Quality tiers and static sun shadows.** `TIER` decides once per device:
  Quest keeps the base budget, Vision Pro and desktop get a 1.2×
  framebuffer, a 2048 shadow map, ~2.2× instancing and a denser mesh. The
  sun casts real shadows, rendered only while a mood blends and never
  after — the scene is static and the sun only moves on a mood change — so
  palms and lanterns land on the sand at no steady-state cost.
- **The island notices a real sit.** Head in the seat band for a moment and
  one wave comes in louder with a low chime. A long press on the chair
  recalibrates the seat from the head pose, which is the whole calibration
  path on Vision Pro, where Safari has no `immersive-ar` for `chair-lab`
  and no `squeeze` to bind anything to.
- **The book.** Treasure Island's opening pages on canvas textures rather
  than troika-three-text — no vendored dependency, and sharper per byte at
  one page of large serif type. It opens into your lap, turns, and shuts
  itself at the end. Pages carry a faint emissive so they read at dusk
  without relighting the nook.
- **The radio plays real records**, each one credited in world. A `TRACKS`
  table carries the provenance and a plaque above the radio prints it, so
  nothing plays unattributed; the credit shrinks to fit rather than
  clipping the source. Loading is lazy, so the island still opens at once;
  a missing file falls back to the synth bed in silence; and pressing the
  radio shows a card immediately, because decoding a three-minute side
  takes about three seconds and a button that seems dead gets pressed
  twice. See `audio/README.md` for what is in the folder and on what basis.
- **The way home** is a driftwood signpost with a little CRT on it, drawn
  in code like every marquee on the site. It ends the XR session before
  navigating, so a headset is never left on a dead compositor.
- **`toko-trip/test/smoke.cjs`** — 29 checks, all driven off game state
  rather than the wall clock.

Still to come: the cave interior (deferred by decision), and the nature
walks from real footage.

## v1 — 2026-08-10

Island v2, on the floor for the first time.

- The cove: `groundHeight(x, z)` is the one source of truth — dome falloff,
  the inlet carved from the sea to ~3.5 m in front of the chair, and a level
  pad under the real chair (`PAD_H` 0.92, so the sea sits below your feet).
- The nook: driftwood deck, beach chair placed from `chair-lab.html`'s
  calibration (persistent anchor when granted, local-floor fallback always),
  side table, radio, the book waiting.
- Baked AO in vertex colours (every scattered thing darkens the sand under
  it), grain and bump noise passes on sand and water — the two fixes named
  in the build brief, in order.
- Eight swaying palms, three lanterns that brighten as the mood darkens,
  rocks, a driftwood log, shells, 420 instanced grass tufts, 260 instanced
  pebbles, ~2000 shoreline foam points breathing with the surf, reeds on
  both inlet banks, fireflies at dusk, and the cave landmark with its
  flickering magenta neon arch (exterior only).
- Three moods on the totem (or M): Golden Hour, Dusk & Fireflies, Bright
  Midday — each a single config object.
- Teleport by controller ray (water rejected), pointing at the chair
  returns the reference space to the calibration, desktop drag-look + WASD.
- Procedural surf (brown noise, twin LFO swells); the radio plays a quiet
  self-made pad until `RADIO_TRACK_URL` is given a royalty-free track.
- three r180 vendored locally (`vendor/`), WebGPURenderer with WebGL2
  fallback and a `FORCE_WEBGL` escape hatch. No post-processing.

Still to come, from the brief: sit-down detection, the Treasure Island
book, the radio track, the hub link in-world, the cave interior (deferred
by decision).
