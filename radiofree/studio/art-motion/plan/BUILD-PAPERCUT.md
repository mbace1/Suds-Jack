# Building a Radio Free Helsinki papercut film — the brief every builder follows

Engine root: `/tmp/claude-0/-home-user-Suds-Jack/83745c96-d2f6-5fb2-9ae6-f4818d9d4e36/scratchpad/am` (call it P).
Read first: the film's shot table (`/home/user/Suds-Jack/radiofree/studio/art-motion/plan/films/NN-*.md`),
`/home/user/Suds-Jack/radiofree/studio/art-motion/PLANNING.md`, and the house README
`/home/user/Suds-Jack/radiofree/studio/art-motion/README.md` (procedure, naming, captions).

## The engine
- A film is `P/代码工程/eras_<id>.js` (copy the shape of `eras_cw.js`: FILM_SIZE 1080×1920, BPM 112,
  SCENE_LIBS, then ERAS: six shots of 12 beats (60/112 s each), the last one 10 beats, 0.5 s
  crossfades) plus one scene file per shot, `P/代码工程/scenes/<id>_<name>.js`, each registering
  `SCENES['<id>_<name>'] = { draw(c, lt) {...} }` (lt = local time in the shot).
- The papercut kit is `scenes/rfp_kit.js` (global `RFP`): `sheet`, `sprite`, `put`, `layer`, `stack`
  (parallax layers with camera `{x, y, z, fx, fy}`; the light and the shadows follow the camera),
  `box` (the shadowbox frame — call it last), `dusk`, `glow`, `ease`, `move`, `pop`, `walker`
  (a masked figure), `leaves`, `ledAt`. Worked examples to read: `scenes/cw_kit.js` +
  `cw_hall.js`/`cw_chair.js` (New York City Hall, a skyline, a cab, tags), `scenes/hp_kit.js`
  (`tag()` — the small ochre where/what tag in the lower corner), `scenes/doh_*.js`.
- Put everything specific to your film in your OWN kit, `scenes/<id>_kit.js`, listed last in
  SCENE_LIBS. **Never edit shared files** (`rfp_kit.js`, other films' kits, `lib/*`, `render.py`) —
  other builders are working in the same folder at the same time. Use your own `<id>` prefix
  everywhere.
- Fonts available in canvas: `"Anton-400"`, `"ArchivoBlack-400"`, `"RobotoCondensed"`.
- Stills: `cd P && uv run -q --with playwright==1.56.0 python 代码工程/render.py --film <id> --width 1080 --height 1920 --solo <id>_<scene> --stills 1.5,4.5 --no-counter --out 渲染/stills_<id>`
- Whole picture (silent is fine): `... render.py --film <id> --width 1080 --height 1920 --fps 30 --out 渲染/成片_<id>.mp4` (add `--audio <wav>` only if you have one).
- `node --check` every JS file you touch. Never put a `//` comment in the middle of a line —
  it has commented out the rest of a statement more than once here.

## The film's own look
Each new film has its OWN palette and feel (the owner: "slightly different colors … so they don't
all look the same"). Use the palette in the shot table for your sky, sheets and accents — not the
house's dark autumn browns. Keep the papercut craft: layered card, cut edges, soft shadows,
parallax, a camera that drifts or pushes.

## Captions (house style H)
`P/subs/<id>_caps.py`, copying `P/subs/cw_caps.py`: `build(SHOTS, CUT, path, manual=True)` with every
line break written as `\\N`, `[keyword]` for the highlighted word, first half at ~0.8 s and second
half at ~3.0 s of each shot. Keep the RADIO FREE HELSINKI bug (the default). Keep every line under
800 px (≈ 26 characters). Burn with:
`cd P/subs && ffmpeg -y -i ../渲染/成片_<id>.mp4 -vf "subtitles=<id>_H.ass:fontsdir=fonts,fade=t=out:st=37.15:d=0.35" -c:v libx264 -crf 18 -pix_fmt yuv420p ../渲染/<id>_captions.mp4`
Captions sit in the top ~600 px: keep faces, labels and the action below y ≈ 700.

## Editorial rules (hard)
- Real people are never drawn with faces (backs, silhouettes, empty chairs, podiums). Generic
  people may wear Toko masks (`RFP.walker`). Never imitate a real newsreader's face.
- Never invent a quote. Quote marks only around words a source reports verbatim. Paraphrase
  never in quote marks. Google is "Doodle".
- In-picture text is limited to labels, tags and signs that the shot table names.

## Process (the house standard)
1. Build the kit and the six scenes. Render ONE still per shot at the key moment; LOOK at each
   honestly at phone size: does the picture tell the beat with no words? Is anything clipped,
   muddy, too dark, or overlapping the caption zone? Fix and re-render until each reads.
2. Render the picture, burn the captions, and make a 1 fps contact sheet
   (`ffmpeg -i ... -vf "fps=1,scale=270:480,tile=8x5" -frames:v 1 ...`); look at it.
3. Write `P/plan/<id>-EVENTS.md`: the exact seconds of every sound-worthy event (stamps, drops,
   clicks, rings, the punch), for the composer.
4. Report back (under 200 words): paths of the stills, the silent picture, the captioned picture,
   the contact sheet and EVENTS.md; what you fixed after looking; anything you could not do.
