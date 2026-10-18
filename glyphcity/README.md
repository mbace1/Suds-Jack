# GLYPH//CITY — concept

**An isometric cyberpunk city drawn entirely in text.** The owner asked for a
cyberpunk animated isometric game concept in an ASCII animation style, built in
three.js and usable for videos as well (2026-10-18). This folder is that
concept: a playable prototype plus a frame-exact MP4 exporter.

## The game, in one loop

You are the `@`, a courier, in a rain-soaked city block at night.

- **Shards** of data (yellow, with a light pillar) drop onto the streets. Walk
  over one to pick it up; it orbits you.
- Deliver to an **uplink** (green pylon on a street corner). The payout is
  `n² × 100` for `n` shards carried, so carrying more pays more.
- **Drones** sweep the streets with searchlights. Standing in a light raises
  your **TRACE**; a full trace **flatlines** you and the shards are lost. A
  drone that has seen you follows you for a moment and its light goes red.
- **Cars** own the lanes. The painted median between the two lanes is the one
  safe line, and every crossing is a gap you have to pick. A hit knocks you
  down and you drop what you carry.
- **Dash** (Space / tap / A) is a short burst that also ghosts you through a
  searchlight.

Carrying more pays quadratically, and the trace and the cars take shards away,
so every extra shard is a bet on getting home with it.

## Controls

| | keyboard | touch | pad |
|---|---|---|---|
| move | WASD / arrows (screen-relative) | drag anywhere | left stick / d-pad |
| dash | Space | quick tap | A / RT |
| colour scheme | C | — | Y |
| raw 3D (no ASCII) | V | — | X |
| glyph density | `[` `]` | — | — |
| zoom | `-` `=` | — | — |

Leave it alone for 25 s and it drops back to the title, where the autopilot
plays the attract run behind the logo.

## How the look works (`js/ascii.js`)

The city is an ordinary three.js scene rendered into a render target, colour
plus depth. A single full-screen pass redraws the screen as a grid of
characters:

- **Tone → glyph.** Each cell averages the colour under it, **in display
  gamma**, and picks off the ramp `" .:-=+*#%@"` with a black point, so the
  empty street is blank. (The target holds linear light; picking glyphs in
  linear space put every dark tone on one character.)
- **Colour → ink.** The glyph keeps the cell's hue, so a pink sign stays pink.
- **Lights are points.** The brightest of the nine taps is kept apart: a lit
  window averaged into its wall is just a noisier wall, and kept apart it is an
  `o` or a `#` in the window's own colour. The walls are a flat diffuse tint and
  the windows live only in the emissive map, so each face of a building is
  one tone and reads as one glyph.
- **Silhouettes are lines.** A Laplacian over depth (zero on any plane, so
  floors and walls are not outlined) marks the near side of every real depth
  step, and a Sobel picks `| - / \` by its direction.
- **The hottest cells are data.** Signs, billboards and the hologram cycle
  through `01$&<>{}[]=`, so the light itself looks like it is made of text.
- **The HUD and the title are characters in the same grid** (an overlay data
  texture, one texel per cell), so a canvas capture includes them and the
  type never fights the picture. The logo is drawn big into a canvas and read
  back as characters.
- **Rain falls in the grid, not the scene**: thin 3D lines averaged into cells
  only flip glyphs at random, so rain is `/` drawn over the dark cells only.

Six palettes ship (`C`): NEON keeps the scene's own colour; PHOSPHOR, AMBER and
ICE are single-colour screens; MAGENTA (Toko's) and VAPOR are duotones. This
follows the owner's direction to explore many colours.

## The city (`js/city.js`)

A grid of blocks cut by streets on every line `x = k·P`, `z = k·P`. Cars,
drones, shards and the runner all live on those lines, so the autopilot's
route is just "along this street to the right cross street, then along that
one". The iso camera hides any street that has a building between it and the
camera, so a **cutaway** casts three rays from the runner toward the camera
and sinks any building they pass through to a stump, which grows back once the
runner has moved on. A third of the lots are low (shops, garages) because the
ASCII picture needs empty space between the towers to read at all.

## Video (`tools/capture.mjs`)

```
NODE_PATH=$(npm root -g) node glyphcity/tools/capture.mjs out.mp4 [--w 1280 --h 720 --fps 30 --seed 7]
NODE_PATH=$(npm root -g) node glyphcity/tools/capture.mjs stills --shot     # five PNG stills
```

`?capture=1` stops the page's own loop and hands the clock to
`window.__gc.frame(dt)`, so the video is timed by frame count and not by the
wall clock: a slow software GPU gives a slow render, never a stuttering video.
The default cut is 16.5 s: title over the attract run (0–3 s), the run with
the HUD (3–11 s), a palette tour (11–15 s), and back to the title. `--w 1080
--h 1920` gives a vertical cut for social feeds.

## Not done yet (questions for approval)

- **Hub cabinet**: not listed in `hub/games.js` yet. That is a two-edit job
  (catalogue entry + marquee) once the look is approved.
- **Reference match**: the reference post (x.com/Ansenjeo/status/2111613140375138649)
  could not be opened from the build environment, so this look is built from
  the usual 3D-to-ASCII shader conventions rather than matched against that
  clip. If the reference uses a particular glyph set, font, or colour handling,
  those are single constants in `ascii.js`.
- **Depth of play**: one loop only. Obvious next steps are a shift timer with
  a quota, more than one district, a drone that calls in others, and rooftop
  routes reached by ladders (the cutaway already handles height).
