# GLYPH//CITY — versions

## v1 — the concept (2026-10-18)

The owner asked for a cyberpunk animated isometric game concept in an ASCII
animation style: three.js as the goal, usable for videos too.

- An isometric city block at night, rendered through a full-screen ASCII pass
  (`js/ascii.js`): tone picks the glyph, hue colours it, lights stay points, depth
  silhouettes become `| - / \`, and the brightest cells cycle through data glyphs.
- One game loop: carry shards to an uplink (`n² × 100`), stay out of drone
  searchlights (TRACE), and cross lanes between the cars. Dash ghosts a light.
- The runner is a cyan `@` stood on its own body, the HUD and title are characters
  in the same grid, and rain falls as `/` over the dark cells.
- Six palettes: NEON, PHOSPHOR, AMBER, ICE, MAGENTA, VAPOR.
- `tools/capture.mjs` records an MP4 frame by frame off the game's own clock
  (`?capture=1`); `test/smoke.cjs` is the gate.

Things learned getting the picture to read, kept because they apply to any
ASCII pass:
- **Pick glyphs in display gamma.** The render target holds linear light, and
  glyph choice in linear space put every dark tone on one character.
- **A lit window averaged into its wall is noise.** Keep the brightest tap apart
  and make it its own glyph, and give walls a flat diffuse colour with the
  windows only in the emissive map, so a face is one tone.
- **Outline on the Laplacian of depth, not the gradient.** The gradient is
  constant on a plane, so it outlined every floor in the city.
- **Weather goes in the grid.** Thin 3D rain lines only flip glyphs at random.
- **An ASCII picture needs empty space.** Wider streets, a third of the lots
  kept low, and a cutaway that sinks whatever stands between the runner and
  the camera.
