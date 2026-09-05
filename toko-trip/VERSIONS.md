# Toko Trip — release log

## v6 — 2026-08-11

The island can take imported models now.

- **A glTF importer**, with `GLTFLoader` vendored beside the rest of three.
  Drop a `.glb` into `models/` and add a row to `MODELS`: the loader drops it
  onto `groundHeight()` from its own measured base, so it cannot float or
  sink, and `at: [x, z]` is metres from the chair in the island's own
  coordinates — the same ones the terrain and the beach mask speak.
  `flat: true` re-materials it into the satin family, which is what stops a
  downloaded PBR asset reading like a photograph glued onto a poster.
- **Every row carries its provenance** — author, source, licence — the same
  discipline the records already follow, because provenance is the expensive
  thing to reconstruct later and 3D assets are where it is easiest to get
  wrong. See `models/README.md`.
- **A missing or broken model is never the reason the island fails to open.**
  Each load is independent; failure is logged and skipped, and costs you that
  prop and nothing else.

Verified end to end with a throwaway model, which loaded, scaled, sat on the
sand, and cast a real shadow into the baked lighting. It was not committed —
`models/` ships with a README and nothing else.

## v5 — 2026-08-11

A jetty — somewhere for the eye to walk.

- **The jetty.** Planks across, two beams under, five pairs of posts into the
  bed, running 8.4 m from the sand out over the water. It is built the way the
  nook's deck is built — a box per board, tone jitter per board, ends baked
  darker — because that is what makes timber read as timber rather than as one
  striped slab. Two things ride the walk out, and both are the tide's: the
  boards get damper and darker the further they are from dry sand, and each
  post carries the waterline on it, soaked below and a pale rime of dried salt
  just above, the same tell v4 gave the sand.
- **Where it is, is the whole design.** On the cove's spine it would run dead
  down the middle of the bay and halve the open water from the chair, which is
  the one view this island is built around. So it goes to one side — and which
  side is not a taste question. The lantern sits 1.65 m off the spine and the
  sign home sits 2.5 m off it the other way; between them a deck fouls one or
  the other at every offset from −2.8 to +2.8, and outside them the palms close
  in. −3.0 m is the only lane with clearance on both sides that still ends in
  water deep enough to need posts.
  Found by measuring, after the first cut put the deck **through** that lantern
  — 9 cm from its post — because the clearance check asked the palms and
  nothing else.
- **It is in the bake.** Five `proxyBox`es rather than one, because `proxyBox`
  is axis-aligned and this deck lies at 23° to the axes, so a single box either
  misses the ends or shades water the planks are nowhere near. Most of the
  shade it throws lands on the **seabed** — v3 gave the bay a bottom, and a
  jetty floating over its own clean sand would give that away.
- **Nothing in it is a measured coordinate.** Where the planks meet the sand is
  *found*, by bisecting the terrain for deck height, because this file's rule
  is that moving `INLET_A`/`INLET_B` reshapes the bay and everything re-places
  itself off the same function. A hardcoded start would have been the one thing
  in the cove that did not move with it. The bisection window is deliberately
  wide: the shore's distance along the spine changes with the offset, and a
  narrow one clamps to its own bound and starts the deck in mid-air.

Not done, and worth knowing: the teleport clamp reads `groundHeight`, so you
cannot stand ON the jetty — you stand under it, in the water, exactly as you do
beside the driftwood log. Walking the planks needs the teleport to know about
the deck, which is a bigger change than adding a prop.

## v4 — 2026-08-10

A graphics and details pass, aimed at what a seated person actually looks at.

- **Clouds.** Half the view from the chair is sky, and a bare gradient was
  the cheapest thing in the scene to improve. Sixteen soft sprites on a
  slowly turning ring — no volumetrics, no per-frame cost — each taking the
  mood's own colour, so a sunset lights their undersides and dusk turns them
  bruise-purple. They have their own seeded rng, so the sky does not
  reshuffle every time a rock moves.
- **A horizon with something on it.** Three far islands in fog colour. An
  empty horizon has no scale in it; with something on it the sea reads as
  distance rather than as a flat band.
- **Birds.** Three, circling, never landing. Two triangles each and a
  wingbeat that is one sine — which is the only thing that makes three
  triangles read as a bird rather than a speck.
- **The tide line.** The waterline is the edge of this scene people look at
  most and the sand simply stopped there. Wet sand is now darker and more
  saturated than dry, and a pale rime of dried salt sits just above the
  water's reach, marking how far it came in.

## v3 — 2026-08-10

The lighting stopped guessing, and the water got a bottom.

- **A real lightmap, replacing the fake one.** v2 shaded the sand with flat
  discs under each object — a decent cheat that could not know a palm has a
  *crown*, so trunks had shadows and the thing casting the actual shade did
  not. Now every standing thing is a sphere or a box, and each point on the
  ground fires a cosine-weighted hemisphere of rays and counts how much sky
  it can see. It runs at load because the proxies are binned into 4 m cells,
  so a ray only tests its own neighbourhood. The bake ships twice: into the
  terrain's vertex colours, and as a 256² `aoMap`, which shades between
  vertices where a 27 cm mesh spacing has nothing to say.
  A palm's trunk shape is now decided in the scatter plan rather than in the
  builder, because the bake has to know where the crown ends up.
- **Water with a floor.** The usual way to fade water at a beach is to read
  the depth buffer and compare; this island already has the seabed as a
  function, so every vertex simply asks how deep the water is above it. No
  depth texture, no backend difference, and it cannot disagree with the
  ground it lies on. Colour and alpha both ride that depth, so the shallows
  are pale and see-through and the bay reads as a bowl you can see the
  bottom of. The horizon sheet behind it is a **ring**, not a sheet — a full
  sheet under the island is opaque, so light through the shallow water lands
  on that instead of on the sand and the whole fade is invisible.
  Tuned twice: the first pass was so transparent the bay read as wet sand
  and the waterline disappeared with it.

Chosen and worth recording: this did **not** use TSL. The vendored r180
bundle ships the node materials but not the TSL functions, and the exact
per-vertex depth above is better than a screen-space one anyway — it asks
the same `groundHeight` everything else asks.

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
