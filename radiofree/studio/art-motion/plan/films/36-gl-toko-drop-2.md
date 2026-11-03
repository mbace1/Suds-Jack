# 36 · GL · Toko Drop 2.0 (v115): the game's own intro, then a fast compilation (stills checkpoint, 3 Nov)

**Owner, 3 Nov**, in order, with each message overriding the one before where they differ:
1. "I already mentioned that GL needs to be 3d, but also.. can we make one of Toko drop 2.0?"
2. "Include the intro animations and then gameplay compilation to some fast music."
3. "Actual game intro with toko Midori games logo and then compilation."

So there is **no GL bumper at the front**. Frame 1 is the game's own v16 intro, starting on the Toko Midori Games
lockup and recorded from the deployed game. A fast compilation of real v115 play follows, cut on the beat. GL appears
only as a light tag along the bottom of the compilation, plus an end card. This is a **stills checkpoint**: nothing
has been fully rendered and nothing has been posted.

- **Stills:** `previews/03-11-GL-Toko-Drop-2-stills.jpg`, ten frames composited by the episode page itself:
  - three intro frames;
  - five compilation cuts;
  - both end-card options.
- **Music sketch:** `previews/03-11-GL-Toko-Drop-2-music-sketch.m4a`. It is the whole 33.5 s, rendered by
  `score.py`, with the game's own intro cues cut in.
- **Episode page:** `looks/gl/tokodrop2/`:
  - `index.html` and `film.js`, the compositor;
  - `plan.json`, the cut list;
  - `score.py`, the music;
  - `tools/`, the capture scripts.
- **Length:** 33.49 s = 24 bars at **172 BPM**. The intro runs for 6 bars, the compilation for 16 and the end card for 2.

## How it is made

- **The game is the deployed copy.** `git archive origin/gh-pages toko-drop-2 toko hub` goes into scratch and is served
  on 127.0.0.1:8731 (`tools/serve.sh`). The game is never patched, and nothing touches gh-pages.
- **Every frame is the game's own render.** Chromium on SwiftShader runs at a 432×768 CSS viewport, a phone held
  upright, so the game picks its portrait arenas and its phone HUD. The device scale factor is:
  - 2.5 for full-frame cuts (1080×1920 native);
  - 3.75 for the cuts the compositor crops 1.5–1.6×, so a crop is still one game pixel to one film pixel.
- **The compositor never re-renders the game.** `film.js` shows each frame as it was drawn. It adds only:
  - a punch-in and a 0.1 s flash on each cut;
  - the GL strip along the bottom: the GL mark in the logo's ramp, one or two words, and the version that added the
    thing.

  The early-3D look (vertex snapping, affine textures, 15-bit dither) is used **only on end card A**.
- **Three capture paths.** Each uses only the game's own debug hooks (`window.__toko`):
  1. **The intro, then the run after it:** `tools/cap.cjs`, using `capBegin('arcade')` and `capFrame(t)`, the same path
     the v16 intro's review film used. Intro frames are indexed by intro time; once the run starts, the game's own bot
     plays it frame by frame.
  2. **Real play in a later world:** `tools/play.cjs` loads `?nointro&world=N`, the game's bot plays, `advance(s)` jumps
     ahead, then frames are drawn one at a time.
  3. **The told moments, staged:** `tools/stage.cjs` uses `showcase()`, `idle()` and `act()`, the look-check hooks the
     game's own tests use.
     - **Slam:** a size-5 giant on the world-2 floor. The script keeps the hero just outside reach while firing in
       bursts. When the giant gathers, the hero holds for nine frames, steps out as it slams, then shoots it down.
     - **Ram:** world 3. The hero stands by a ram lane with two gels pinned at the wall end. On the warning the hero
       steps out of the lane, and the ram shoves the gels.

     The code is all real game code; only where things stand and what the hero does is scripted.
- **Cost under SwiftShader:** about 1.3 s a frame at dpr 2.5 and about 3 s at dpr 3.75. A full render is about 250
  intro frames plus about 670 compilation frames, roughly 35–45 minutes of capture in the background, then
  `pipeline/render.mjs` over `looks/gl/tokodrop2/index.html` with `--mount _clips=<capture dir>`.

## The cut list (from `plan.json`, at 172 BPM; a beat is 0.349 s)

- The **version** column is the build that introduced the thing, per `toko-drop-2/VERSIONS.md` and the tuning comments
  in the deployed v115.
- Rows 4, 5, 7, 9 and 11 (the run start, gates, STEP OUT!, CLEAR THE LANE! and HOLD THE RING) are **captured**.
  So are the frames the stills use from rows 6, 8 and 10.
- Rows 12–26 are **planned**, to capture after approval.

| # | t (s) | beats | part | GL tag | ver | source | what it shows |
|---|---|---|---|---|---|---|---|
| 1 | 0.00–3.84 | 11 | intro | — | — | `intro` @0.45 s | the Toko Midori Games lockup lands, Toko blinks, MIDORI goes, the camera pushes in, "drop" pops in letter by letter |
| 2 | 3.84–5.93 | 6 | intro | — | — | `intro` @5.95 s | the drop lets go of the p, falls, lands; the grid rings out of it |
| 3 | 5.93–8.37 | 7 | intro | — | — | `intro` @8.61 s | it opens its eyes; the camera pulls out to play; the HUD comes in |
| 4 | 8.37–9.77 | 4 | cut (the drop) | THE RUN STARTS | — | `intro` @11.3 s | real play: the run that follows the intro (world 1) |
| 5 | 9.77–11.16 | 4 | cut | GATES | — | `w2` | real play, world 2 driveway: a BURST POD banner, gates (DASH THROUGH!), the ball (v111) |
| 6 | 11.16–12.56 | 4 | cut | GIANTS SHED GOO | V114 | `slam` @1.0, crop 1.5× | staged: a giant under fire sheds goo and wears down |
| 7 | 12.56–13.26 | 2 | cut | STEP OUT! | V115 | `slam` @3.65, crop 1.5× | staged: the giant gathers (v112), its ring and the STEP OUT! tag; the hero steps out as it lands |
| 8 | 13.26–13.95 | 2 | cut | GIANT DOWN | — | `slam` @4.5, crop 1.5× | staged: the hero turns and the giant bursts into goo |
| 9 | 13.95–15.35 | 4 | cut | CLEAR THE LANE! | V115 | `ram` @0.15, crop 1.6× | staged: world 3 sewer, a ram's lane lit, the CLEAR THE LANE! tag |
| 10 | 15.35–16.05 | 2 | cut | SEWER RAMS | V110 | `ram` @1.15, crop 1.6× | staged: the ram punches the gels across the floor |
| 11 | 16.05–16.74 | 2 | cut | HOLD THE RING | — | `w3` | real play, world 3, wave 19: the HOLD THE RING challenge, gates, a bounty |
| 12 | 16.74–18.14 | 4 | cut | CISTERN | — | `w4` | real play, world 4 |
| 13 | 18.14–19.53 | 4 | cut | BOILER | — | `w5` | real play, world 5 |
| 14 | 19.53–20.23 | 2 | cut | RIVER | — | `w6` | real play, world 6 |
| 15 | 20.23–20.93 | 2 | cut | ICE | V110 | `w7` | real play, world 7 (the drifting blocks) |
| 16 | 20.93–21.63 | 2 | cut | THE DEEP | — | `w8` | real play, world 8 |
| 17 | 21.63–22.33 | 2 | cut | CORE | — | `w9` | real play, world 9 |
| 18 | 22.33–23.72 | 4 | cut | BOSS | — | `boss` | real play: a world boss (`bossWave()` jumps the run to it) |
| 19 | 23.72–25.12 | 4 | cut | WORLD CLEAR | — | `boss` @1.4 | the boss down; the next world opens |
| 20–23 | 25.12–26.51 | 1 each | four one-beat cuts | — | — | `banner1–4` | wave banners from four worlds, one per snare |
| 24 | 26.51–27.91 | 4 | cut | GIANT + ESCORT | V106 | `escort` | a giant riding its escort |
| 25 | 27.91–29.30 | 4 | cut | DASH | — | `dash` | a dash through a gate chain (the bot never dashes, so this is staged with `act()`) |
| 26 | 29.30–30.70 | 4 | cut | — | — | `finale` | the last bar: the floor goo-splattered, the score climbing |
| 27 | 30.70–33.49 | 8 | end card | — | — | — | A: the early-3D GL card · B: the game's title screen (see below) |

## Music (`score.py`; 172 BPM, D minor i–VI–VII–v)

- **Style:** a late-90s console drum-and-bass drive: a chopped two-bar break, a detuned "reese" bass, FM stabs on the
  off-beats and a wide pad. Every voice is synthesised in numpy; nothing is sampled and nothing is borrowed.
- **Bars 1–6, under the intro:**
  - the game's own intro cues, rendered by the game (`introWav`) and cut to the same three runs as the picture;
  - a pad, and a filtered break from bar 3;
  - a noise riser through bars 5–6, and a snare roll into the drop.
- **Bar 7, the drop:** lands on the first gameplay cut, 0.2 s after the game's own "go".
- **Bars 7–22, the compilation:**
  - the full break, bass and stabs, and every cut sits on a beat;
  - bar 19's four one-beat cuts each get a snare;
  - bar 22 has a fill.
- **Bars 23–24, the end card:** a crash and the tonic, then the card's text lands on beats 1, 2, 2.5 and 3.5.
- **Mix:** the sketch measures about −11 dBFS RMS through the compilation, with peaks at −1 dBFS. It is not yet
  loudness-mastered (the house pipeline's −14 LUFS check comes with the build).

## End card: GL or the game's own title? Recommendation: **B, the game's own title**

- **A, the early-3D GL card:**
  - a voxel GL, and the drop rebuilt as a low-poly PS1 gel on a pedestal;
  - TOKO DROP 2.0 · PLAY FREE IN THE ARCADE · MBACE1.GITHUB.IO/SUDS-JACK · PRESS START.

  It is the right card if GL becomes a recurring series (a GL episode per game).
- **B, the game's real title screen** (the yellow brush TOKO DROP, the ARCADE button), with the same address on a band
  along the bottom and "GL · GAMEPLAY LABORATORY" as a credit line. It is recommended because:
  - it is the exact screen the link opens on;
  - it keeps the trailer to one identity, from the Toko Midori Games logo to the Toko Drop title;
  - a third look in the last two seconds would dilute both.
- The plain "GL" glyphs replace the bold ones on card A, because at that size the bold G read as a 6.

## Risks

- **Staged moments.** Rows 6–10 (and 25, the dash) are staged with the game's own look-check hooks. It is real game code
  and real rendering, but the script sets where things stand and what the hero does.
  - Real play would not give these moments on demand. A hunt for "a giant gathering within reach of the hero" in
    world-4 bot play found none in about 150 s of play, because the bot loses a fresh run in about 30 s there.
  - Every other cut is the game's own bot playing.
- **The arena camera is far out on a phone.** Told moments are small, so rows 6–10 are cropped 1.5–1.6× from frames
  captured at higher resolution. Full-frame cuts are busy but honest: that is how the game looks on a phone.
- **"THE RUN STARTS" (row 4) is weak.** Wave 1 is a nearly empty grid. Replace it with a frame later in the same run,
  or a second GATES cut.
- **"GIANTS SHED GOO" (row 6) needs a better take.** The staged giant (a size-5 globbo, 6 hp) is shot in short bursts so
  it lives to slam, so it sheds only a few droplets. Take a giant from real play in a later world, or re-stage it with
  longer bursts after the slam.
- **Version tags (V114, V115…) are dev-log numbers.** They suit a lab show; drop them if the owner wants a cleaner
  strip.
- **Dated content.** The game ships daily (v115 is today's), so a later build would date the HUD label and the tags.
- **The intro is trimmed to three runs.** The drop's gathering (4.95–5.95 s) and part of the grid's spread are skipped.
  The game's own "2.0 · v115 · webgl2" readout shows at the bottom of the intro frames; it is the game's own, left as
  is.
- **The URL on the cards is the arcade root,** `mbace1.github.io/Suds-Jack`. It was checked against the repo's own
  links, and gh-pages has no CNAME. The `/toko-drop-2/` deep link is too long for the bitmap font, so it goes in the
  post instead.
- **The music is a sketch.** It has not been listened to by a person yet or mixed against the picture.

## Post draft

> Toko Drop 2.0 (v115): giants that slam, sewer rams, goo everywhere. Free in the arcade: mbace1.github.io/Suds-Jack/toko-drop-2/
