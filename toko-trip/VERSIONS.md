# Toko Trip — release log

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
