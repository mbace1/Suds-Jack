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

**New films are built by pipeline** (from 17 Oct): `pipeline/README.md`. A film is a picture, a `copy.json` and a
cue sheet; `pipeline/build.py` renders, captions, scores, mixes and checks a master in one command.
- **The Chair Is Taken** (Coxon #5, papercut in clean light, ~41 s): `papercut/chair-is-taken/`, `scenes/ct_*.js`,
  `scenes/rfp_clean.js`, `shot-table-chair.md`. The first papercut film through the pipeline.
- **Kill Switch** (the flat safety leaflet, ~35 s): `flat/kill-switch/` (the 11 s pilot is `clay/kill-switch/film.js`).

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

- `eras_doh.js` — **On Hold** (Doodle #2, 37.5 s): Doodle froze two sites over a tax rise,
  Finland raised the tax anyway and dropped the support, Doodle came anyway — and on
  6.10.2026 the regulator put both sites on hold again. `scenes/doh_*.js`, `synth_doh.py`,
  `subs/on-hold-captions.py`, `shot-table-onhold.md` (sources), `review-onhold-v2.md`.
  Scores and captions build on `lib/rfsound.py` (the synthesised orchestra, two-pass
  loudnorm to −14 LUFS) and `lib/rfcaps.py` (house style H), so a new film is data.

- `eras_dr.js` — **Unexpectedly, a Deer** (Toko thinker #1, papercut, 37.5 s): a Kallio flat,
  a Finnish hound, and a home camera whose AI writes the dog up as a deer — the behaviour
  reviewers documented in Google's Gemini for Home (renamed Doodle Home). `scenes/dr_*.js`,
  `synth_dr.py`, `subs/deer-captions.py`, `shot-table-deer.md`, `review-deer-v3.md`.

- `eras_cw.js` — **Committee of the Whole** (Coxon #2, papercut, 37.5 s): New York's council
  hearing on AI risk, 5.10.2026 — the companies came under threat of subpoena, one not at all;
  Jacob Coxon's estimate; no company gave a number; "flippant at best". Coxon is a real person:
  shown only from behind, never masked. `scenes/cw_*.js`, `synth_cw.py`,
  `subs/committee-captions.py`, `shot-table-committee.md`, `review-committee-v2.md`.

- `eras_hp.js` — **A Handful of People** (Coxon #1, papercut, 37.5 s): his resignation post,
  his point to Jon Stewart that the choice should not rest with a handful of people (paraphrase),
  the Reuters/Ipsos 62% and 54%, the Speaker saying Congress won't take the lead, and the
  midterms. `scenes/hp_*.js`, `synth_hp.py`, `subs/handful-captions.py`,
  `shot-table-handful.md`, `review-handful-v2.md`. Finished films for download: `films/`.

## Release names (owner, 2026-10-14)

Finished films go in `films/` named `DD-MM-SeriesN-Title.mp4`: the release date, the series
and its number, the title — hyphens for spaces, so the link works anywhere unescaped. Series:
`Doodle` (the Google/Doodle stories), `Coxon` (Jacob Coxon, and AI governance after him), `BigTech` (the other platforms), `Nordic` (the Nordics), `Toko` (the Toko thinkers).
E.g. `14-10-Doodle1-Biodiversity-Fund.mp4`. The repo is public, so each file has a direct
download link: `https://raw.githubusercontent.com/mbace1/Suds-Jack/<commit>/radiofree/studio/art-motion/films/<name>`.

Papercut light (v4, owner 2026-10-14: "spruced up … dynamic slight shadows"): the kit's light is
set each frame from the camera — it sways with the camera's drift and the shadows lengthen on a
push-in — and the farthest sheets are drawn from a cached, slightly blurred copy for depth.

To test later (owner, 2026-10-14, on the first film going live: "it had small glitches on it
but I like those, we can test very subtle glitches in the future as well"): a *very* subtle,
deliberate glitch layer — a frame's tear or a one-row slip on a cut, never on a caption.

## House style (owner, 2026-10-14): claymation first

"The claymation style looks amazing, let's start using that as primary for a bit." New films
are made in the **Aardman plasticine** look approved from the clay tests (style 1 of four,
2026-10-14): matte modelling clay with thumbprints and tool drags, chunky forms, a clay-and-card
set, a warm lamp key against a cold window, shallow depth of field, graded a stop darker for the
house's autumn. Posed **on twos** — 12 poses a second held two frames each in a 24 fps file, the
clay surface re-lumped per pose so it boils like real stop-motion — while camera, rain and light
move every frame. People wear Toko masks (rigid: the acting is in body, posture and props); real
people are still never given faces. Papercut is the second style, for when a story suits it.

**Fixes stay in the film's own style** (owner, 2026-10-14: "Make all the changes in the current
video styles still. Only new videos in new style"). A papercut film is fixed in papercut — and
gets the papercut sign-off; only new films, and remakes the owner names (the Deer, in clay), are
made in clay. The sign-off is `scenes/so_ident.js` (papercut: the Cathedral over the rooftops,
Toko at a mic beside the pirate mast) with `subs/signoff-captions.ass` and `synth_signoff.py`;
its lettering is RADIO FREE HELSINKI and LOCAL · GLOBAL · FREE RADIO — no "Toko, from
Helsinki" line (owner, 2026-10-14). **The clay films go to the Toko Midori Games socials and
carry no end slate** (owner, same day: "no end slate for now") **and no RADIO FREE HELSINKI bug** (`build(..., bug=False)`).

Cost: three.js under SwiftShader renders about 6.5 s a frame here — roughly 100 minutes for a
37.5 s film — so stills come first, always, and the full render runs in the background. The
clay kit lives in `clay/` (scene, sculpting, materials, the Toko mask from the traced master,
the render script). Captions and score are the same `lib/rfcaps.py` and `lib/rfsound.py`.

## The standard procedure (owner, 2026-10-13: "make this the standard procedure")

Every film goes through the same nine steps; The Biodiversity Fund v6 is the worked
example (`eras_bdf.js`, `scenes/bdf_*.js`, `synth_bdf.py`, `subs/biodiversity-tiktok.py`).

1. **Record first.** Research the story and write the sources down beside the shot
   table before a frame is drawn: every on-screen number, date and quote has a URL.
   Real names only for what verifiably happened; no invented quote or reaction in a
   real person's mouth; a claim someone makes without evidence is shown as *theirs*.
2. **Shot table** (`shot-table-<film>.md`): claymation first (see House style), papercut
   when a story suits it — either way one stop dark, fall palette, magenta masks; six shots of twelve beats at 112 BPM
   (~6.4 s), the last ten; half-second crossfades. Screen text ≤ 8 words a shot.
3. **Stills before film.** Render each shot's key moment with `--solo --stills` and
   LOOK: a hero must be lit or rimmed, nothing important behind a caption, no text
   past its card or the frame. Fix, re-still.
4. **Score** (`synth_<film>.py`): every cut and hit on the beat grid, normalised to
   −14 LUFS, the tail rings out — never a chop.
5. **Render** at 1080×1920, 30 fps, with the score.
6. **House captions** (style H, see below): white Poppins ExtraBold with outline,
   the line fades in ~0.8 s after the cut, line two joins at ~3 s, one keyword
   lights ochre once read, gone 0.35 s before the dissolve, no line wider than 800 px.
7. **Independent review** by a fresh agent that has not seen the build: facts
   against sources, then the picture frame by frame.
8. **Fix what the review finds**, re-render, and pull a 1 fps contact sheet of the
   captioned cut — every frame checked for clipping and collisions before it ships.
9. **The station.** Every film carries the Radio Free Helsinki bug top-left (in the captions,
   `lib/rfcaps.py`) and ends on the 3 s clay sign-off — Toko at the mic in Helsinki, ON AIR,
   "RADIO FREE HELSINKI · Toko, from Helsinki · LOCAL · GLOBAL · FREE RADIO" (owner, 2026-10-14:
   the station is run by Toko from Helsinki, so it can speak on local and global agendas while
   keeping a free radio running here). A story from elsewhere says where it is, in words and tags.
10. **Deliver** the captioned MP4 (the one that ships) and the plain one; commit the
   scenes, film table, score, captions script, shot table with sources, and review.

## Naming in the films (owner, 2026-10-13)

"We can sometimes use real names to be clear." The films may name a real company,
product or institution **when the story is unclear without it** — and only for what
verifiably happened, taken from a source that is written down beside the shot table.
Still no invented quote in a real person's mouth, no invented claim attached to a
real name, and the joke stays on the language. This is the studio's rule: the daily
wire (`EDITORIAL.md`, enforced in `tools/generate-wire.mjs`) still runs invented names.

## Captions: the house style (owner, 2026-10-13)

"Outline with occasionally pops on important words." TikTok-sized white Poppins
ExtraBold with a black outline, centred, each shot's lines building into one block
that holds to the cut, placed per shot in a band that misses the picture's key
detail and TikTok's own UI. One word per shot — the one that carries it — lands in
the film's ochre pushed toward yellow, large, then settles. Generated by
`subs/biodiversity-tiktok.py` (style H; A/B/C were the tests), burned in with
`ffmpeg -vf "subtitles=<file>.ass:fontsdir=<fonts>"`.
Timing rule (owner: "too fast transitions ... text pops in first ... give more time
to read"): a shot runs twelve beats (~6.4 s) — the action in its first three seconds,
then the picture holds — and shots dissolve over half a second. A line fades in ~0.8 s
AFTER the cut, never with it; the second joins at ~3 s below it without moving it; both
are gone before the dissolve. The keyword lights up only once its line has been read.

Width rule (owner: "some clipping still with text"): no caption line is wider than
800 px. The styles carry 140 px side margins because libass wraps a \pos line at the
frame minus the margins; at 80 px, lines of 890-905 px ran to the bezel and into
TikTok's right-hand buttons. Bottom rule (owner, 2026-10-16: the location tags "are blocked on Instagram by the bottom texts and channel
info"): the bottom 290 px of the frame belong to Instagram's caption and channel line, and its buttons run
down the right edge. Every where/what tag sits with its bottom edge at or above y = 1630 (`RFP.SAFE_B` in
`scenes/rfp_kit.js`; each kit's `tag()` clamps to it), at least a tag's own height above where tags used to
sit, and a right-aligned tag ends 160 px from the edge. Scene text gets the same care: a label's card is cut to
its measured words, and nothing that swings or zooms may carry text past the frame.
