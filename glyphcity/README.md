# GLYPH CITY — concept

A cyberpunk isometric game set in neo-Helsinki, drawn entirely in text. Started 18 Oct 2026 on the owner's
direction ("a cyberpunk animated isometric game concept in this ASCII animation style; it can be tested for videos as
well or first"). The style reference is an X post the build environment cannot open, so this pass shows the
general ASCII look; it is waiting for the reference frames to match it.

**The idea that makes it a game, not a filter:** the city is rendered in 3D, but every cell of the screen becomes ONE
glyph. A cell's brightness picks from a ramp (`" .:-=+*#%@"`). Where depth or normals break, the glyph is the edge's own
angle (`_ / | \`). And the world's **writing** goes straight into the same grid as real characters: SAUNA on its sign,
ﾗｰﾒﾝ on a vertical board, the HUD, prompts, the title. Text is the material, so text can be the mechanic. When the
courier jacks into a terminal, the grid around him decodes into katakana and settles.

**The loop (first draft):** you are Courier 07, running data packets across the Kallio sector in the rain. Every
terminal you jack into rewrites the street around you for a moment, and what it says matters: routes, codes, who is
watching. Score is credits; the city is the clock.

## Files

| file | what |
|---|---|
| `js/glyphs.js` | the glyph atlas, rasterised at exactly the cell size: the ramp first, the edge strokes next, then ASCII, half-width katakana, block shades |
| `js/ascii.js` | the camera back: scene → colour, depth and normals at half resolution → one glyph a cell (ramp, edges, rain, labels) → neon bloom → tone and encode |
| `js/city.js` | the city: iso blocks, window grids, neon boards, traffic on the ground and in the air, steam, the courier, and the billboard with the Toko face (`toko/js/master.js`) in glyphs |
| `js/film.js` + `film.html` | the 12 s concept film, every frame a pure function of t (`window.__film`, the house render contract) |
| `tools/score.py` | its sound, synthesised: rain, drone, pulse, key clicks, the jack-in glitch, the title hit |
| `fonts/DejaVuSansMono-Bold.ttf` | the cell's typeface (Bitstream Vera licence, free to redistribute) |

## Rendering the film

```
cd radiofree/studio/art-motion
NODE_PATH=$(npm root -g) node pipeline/render.mjs gc/film.html <out> --fonts <any dir> \
  --mount gc=../../../glyphcity --mount toko=../../../toko [--from i --to j] [--stills 3,6]
```

`?raw=1` shows the city before it is written (for debugging the 3D), `?w=1080&h=1920` gives a vertical cut.

## Traps already paid for

- **Fog by distance from an iso camera.** The orthographic camera sits `CAM_D` back, so fog has to start there. With
  the default range the whole colour pass was fog and only the normal pass (which ignores fog) drew anything.
- **Edges: never a first difference on depth.** Under this camera every plane is a depth ramp, and a Sobel on depth
  called the whole floor an edge. Normals take the Sobel; depth takes a second difference, which is zero on a plane.
- **Small boxes are rings of strokes.** Every little box (roof plant, lane mark) becomes an outline of `_/|\`, so the
  kiosks' roofs are flat and the lane marks are planes.
- **The street must be seen.** The camera sits up at +x +z, so anything tall on the near side of the street walls it
  off. The near row is kiosks, and the courier runs on the far kerb.
