# Art-motion films (huashu-art-motion engine)

Films drawn in code with the third-party skill **huashu-art-motion**
(github.com/alchaincyf/huashu-art-motion, installed user-level, reviewed before
use: local-only engine; its optional TTS module calls a ByteDance API and was
not used). Only OUR files live here — scenes, film tables, the score, the
review. The engine is copied fresh from the skill:

```sh
cp -R ~/.claude/skills/huashu-art-motion/scripts/engine <proj>/代码工程
cp scenes/*.js <proj>/代码工程/scenes/ && cp eras_rf*.js <proj>/代码工程/
uv run --with playwright==1.56.0 python <proj>/代码工程/render.py --film rfa --width 1080 --height 1920 --fps 30 --audio 配乐.wav --out 成片.mp4
```
(`playwright==1.56.0` matches the sandbox's preinstalled Chromium 1194.)

- `eras_rf.js` — the three style directions shown first (pop / constructivist / Matisse).
- `eras_rfa.js` — **You Looked At It**, 15 s portrait: Constructivist poster × Helsinki
  autumn; `shot-table.md` is its storyboard (lint green), `synth.py` its score
  (112 BPM, every cut on a beat), `review-you-looked-at-it.md` the independent
  review (6/10, ship with fixes — fixes pending).
- `eras_rfm.js` — the **mask** samples (owner, 2026-10-13: "masks… a different color
  toko face"): the traced master face (`scenes/toko_master.js`, GENERATED from
  `toko/js/master.js`, unchanged) worn as a mask in the carrier colours, so a
  figure can face the camera without code ever drawing a face.
- `eras_ts.js` — **twelve style tests** for the owner to approve, one story (a masked
  Helsinki where looking is buying), 4 s each: `ts_hopper` (night light), `ts_lino`
  (two-plate linocut), `ts_poster` (Constructivist photomontage), `ts_grain`
  (editorial grain), `ts_ukiyoe` (Hiroshige rain on Pitkäsilta), `ts_deco` (Cassandre
  tram, destination KASSA), `ts_riso` (three inks + key, multiplied, misregistered),
  `ts_comic` (Lichtenstein close-up), `ts_glass` (stained glass, Our Lady of Free
  Returns), `ts_hours` (Book of Hours, October), `ts_paper` (papercut shadowbox,
  LOOKING IS FREE*), `ts_munch` (expressionist oil, The Total). The masks are the
  only faces in any of them.
- `eras_rfp.js` — **You Looked At It, the papercut cut** (owner picked test 11 of 12,
  2026-10-13: "Paper cut box is the best so far"). `scenes/rfp_kit.js` is the box:
  card sheets with their shadows baked once, a parallax stack, a focus-point camera,
  a card walker with a timed LED. `shot-table-papercut.md` is its storyboard (lint
  green), `synth_rfp.py` its score (−14 LUFS, the last hit at 14.2 s rings out). It
  folds in every fix from `review-you-looked-at-it.md`.

## Naming in the films (owner, 2026-10-13)

"We can sometimes use real names to be clear." The films may name a real company,
product or institution **when the story is unclear without it** — and only for what
verifiably happened, taken from a source that is written down beside the shot table.
Still no invented quote in a real person's mouth, no invented claim attached to a
real name, and the joke stays on the language. This is the studio's rule: the daily
wire (`EDITORIAL.md`, enforced in `tools/generate-wire.mjs`) still runs invented names.
