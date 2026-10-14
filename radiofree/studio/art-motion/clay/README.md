# Clay — the claymation kit (house style from 2026-10-14)

The Aardman-plasticine look the owner picked from four tests ("the claymation style looks
amazing, let's start using that as primary"). three.js r167, rendered headless (Playwright +
SwiftShader), deterministic: the same frame number always draws the same picture.

- `film/` — **Happy Little Bot** (Toko thinker #2), the first clay film, and the template for the
  next ones: `film.js` is the film (shots, timing, acting), `lib/` the kit:
  `clay.js` (the plasticine material: thumbprints, tool drags, the per-pose "boil"),
  `sculpt.js` (lumps, sausages, balls, lathes; the Toko mask built from the traced master),
  `rig.js` (the child, the toy, the grown-up), `city.js` (the window, Helsinki in the rain),
  `post.js` (depth of field, ambient occlusion, the grade), `master.js` (a copy of
  `toko/js/master.js`, the traced face).
- `film/render.mjs` — `--stills` (one PNG per shot), `--still 3:0.75`, `--frames 0-899`
  (JPEGs, resumable), `--encode` (silent 24 fps H.264). Run with `NODE_PATH=$(npm root -g)`.
- `tests/` — the four style tests the owner chose from (style1 = the chosen look), kept as a
  record; they were laid out with `vendor/` beside them and two extra addons (UnrealBloomPass,
  LuminosityHighPassShader), so they need that layout to re-render.
- `vendor` → `../../vendor` (the studio's three.js; the film needs GTAOPass, RoundedBoxGeometry,
  BufferGeometryUtils, all there).

Posed on twos: 12 poses a second, each held two frames of a 24 fps file, the clay surface
re-lumped per pose; camera, rain and light move every frame. About 6.5 s a frame here, so a
37.5 s film is ~100 min of rendering: stills first, always. Captions and score are added after,
with `../lib/rfcaps.py` and `../lib/rfsound.py` (see `../subs/bot-captions.py`, `../synth_bot.py`).
