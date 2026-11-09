# 36 · Toko Drop 2.0: the game's own intro, then a fast compilation (re-cut 8 Nov for the Toko Midori Games accounts; built 4 Nov as GL; stills checkpoint 3 Nov)

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

## Toko re-cut, 8 Nov (Toko 7, for the Toko Midori Games accounts; supersedes GL1)

**Owner, Sun 8 Nov ~19:05 Helsinki:** "Can you make the Toko Drop 2.0 video be for Toko Midori Games accounts. So end
slate with those socials, no links of any kind just logo and Toko details. Saying coming in 2027. Make the video a bit
shorter edit out glitched shooting part. Use current world 1 visuals, see if other worlds can be used since they look
better now." GL1 (`films/04-11-GL1-Toko-Drop-2.mp4`) is on HOLD in `POSTED.md` and is not to be posted.

- **Files:**
  - `films/08-11-Toko7-Toko-Drop-2.mp4`: 1080×1920, 30 fps, **25.1 s** (was 33.5), H.264 crf 17 + AAC, 22.4 MB, no
    RFH sign-off;
  - `previews/08-11-Toko-Drop-2-Toko-en.mp4`: the phone preview (crf 25), 8.0 MB;
  - `previews/08-11-Toko-Drop-2-Toko-stills.jpg`: eight frames (the intro, six cuts, the slate).
- **Length:** 18 bars at 172 BPM = 25.12 s: the game's intro 4 bars, the compilation 10, the end slate 4. Every cut is
  on a beat; `score.py` now reads its bar layout off `plan.json` (written by `tools/mkplan3.py`) instead of hard-coding
  the 4 Nov film's 6 + 16 + 2.
- **Sound:** the same synth score, re-cut to the new bars, with the game's own **v123** intro cues (`introWav`) under
  the intro. Measured on the filed MP4 by ffmpeg ebur128: **−14.1 LUFS integrated, −2.7 dBFS true peak, LRA 7.5**.
  Under the slate a soft pulse and a note as each line lands, then the pad rings out.

### What was cut as "the glitched shooting part", and why it happened

Found frame by frame in the 4 Nov film: **22.3–25.1 s, the BOSS and WORLD CLEAR cuts.** After both of world 1's Twin
Prisms were put down (`debug.killBosses`), the hero stood still and kept firing: a straight row of evenly spaced shots
running right across the empty arena, sitting in the same place frame after frame. The same thing showed for a moment
in the BOSS cut before it. The cause was the capture, not the game: the takes were played by the game's built-in
capture bot (`botInput` in `main.js`), which with nothing on the floor aims at +x and **fires anyway**, and the shot rate
lined up with the 30 fps capture step so the stream looked frozen.

The fix is a different player, not a trim: **`tools/bot.cjs`**, handed to the game through its own hook
(`debug.capPlay(think, seed)`, added in v119). It fires only when there is a body to shoot, circles the nearest body
instead of backing straight away, turns now and then, and dashes when something gets close. Every play frame in the
re-cut was taken with it (`tools/take3.cjs`, `tools/cap3.cjs`; fixed seeds, so a take can be made again). The world
clear is gone from the edit, the boss cut is a real fight, and the film's play frames were checked for frozen stretches
(frame-to-frame motion never under 1.0 of 255 on a 270×480 sample; median 3.2).

### The cut list (`plan.json`; every play frame from the deployed v123)

| t (s) | beats | what | take |
|---|---|---|---|
| 0.00 | 7 | the game's own intro: the Toko Midori Games lockup, then "Toko drop" (intro 1.9 s on) | the game's intro |
| 2.44 | 5 | the drop hangs from the magenta bar, lets go, falls, lands; the ring goes out (5.6 s on) | the game's intro |
| 4.19 | 4 | it opens its eyes over the grid and drops to world 1's floor; the HUD comes in (9.1 s on) | intro, then real play |
| 5.58 | 4 | WORLD 1 · THE GRID: the new void and its neon loops, every body a light, a wall curtain | REAL |
| 6.98 | 4 | WORLD 1 · THE GRID: wave 6 clear, wave 7, a bounty body | REAL |
| 8.37 | 4 | WORLD 2 · THE DRIVEWAY: DASH THE GATES, a tank, the rolling ball | REAL |
| 9.77 | 4 | WORLD 3 · THE SEWER: a giant gathers and slams beside the hero | REAL |
| 11.16 | 4 | WORLD 4 · THE CISTERN: a diagonal curtain, a floor of goo | REAL |
| 12.56 | 4 | WORLD 5 · THE BOILER ROOM: protect the heart | REAL |
| 13.95 | 2 | WORLD 6 · THE RIVER: hold the ring, a crab-legged giant | REAL |
| 14.65 | 2 | WORLD 7 · THE ICE SHEET: swarm | REAL |
| 15.35 | 2 | WORLD 8 · THE DEEP: collect the gems | REAL |
| 16.05 | 4 | WORLD 9 · THE CORE: protect the heart on the magenta grid | REAL |
| 17.44 | 6 | WORLD 1 · BOSS: Twin Prisms, fought by the capture player (`debug.bossWave` jumps the run to its boss wave) | REAL (jumped to the boss) |
| 19.53 | 16 | the Toko Midori Games end slate, held to 25.12 | — |

- **All nine worlds** are in, each from a fresh v123 take; every one looked better than its 4 Nov cut and none was
  dropped. World 1 opens the compilation twice and closes it with the boss, so the new void look leads and ends.
- **Dropped, all staged:** GIANTS, STEP OUT!, SPLIT!, CLEAR THE LANE!, SEWER RAMS, GIANT + ESCORT, DASH. A fresh
  STEP OUT! was staged on world 1 (`stage2.cjs g2 1`) and not used: the giant is small on the whole-arena camera and the
  hero takes a hit in the middle of it. The re-cut is **all real play**.
- **Cuts placed off hurt flashes.** A hit on the hero flashes the screen red, and the capture tops lives back up (the HUD
  then shows three again). Every cut sits clear of those frames (scanned per take).
- **The tag along the bottom** is a small Toko face (the traced master, magenta) and the world's name. **No GL mark
  anywhere**; the strip is near-opaque so the game's own `2.0 · v123` line does not show through it.

### The end slate (`film.js`, `card=toko`, the default now)

Magenta `#F0027F` on black, nothing else (BRAND.md §2c): the **traced master face** (`toko/js/master.js`, not `face.js`'s
GEO) beside the drawn three-line logotype (`toko/js/wordmark.js`), in `lockup.js`'s proportions; then

> TOKO DROP 2.0
> COMING IN 2027 (black, reversed out of a magenta band)
> INSTAGRAM / tokomidorigames
> X / @tokomidori

The platforms are named as words, with no platform logos. **No URL, no "play free", no arcade, no QR, no GL.** The face
pops in on the downbeat, the logotype lines follow, the title slams in on beat 3, the band wipes on 4.5, the handles land
on 6 and 6.5, and the face blinks once on beat 9. The handles stay out of the bottom fifth, where Reels and X lay their
own captions. The type is Anton, as on the Toko clay films' cards. The kit is mounted for the render with
`--mount toko=<repo>/toko`.

### How to make it again

```
looks/gl/tokodrop2/tools/serve.sh <scratch>/site                    # the deployed gh-pages build on :8731
node tools/take3.cjs <world> <clips>/w<N> busy:7:90 0-149          # each world (w1: busy:8:90 0-179)
node tools/take3.cjs 1 <clips>/boss busy:4:60 0-29,30-179@boss
node tools/cap3.cjs <clips>/intro 0-345                            # the intro and the start of the run
node tools/misc.cjs <scratch>/misc                                 # the intro's cues (intro/sfx.wav)
python3 tools/index.py <clips>; python3 tools/mkplan3.py plan.json
uv run --with numpy --with soundfile python score.py plan.json score.wav <scratch>/misc/intro/sfx.wav
NODE_PATH=$(npm root -g) node pipeline/render.mjs looks/gl/tokodrop2/index.html <out> --fonts <fonts> \
  --mount _clips=<clips> --mount toko=<repo>/toko                  # then ffmpeg: frames + score.wav, crf 17
```

### Risks (re-cut)

- **"Coming in 2027"** is the owner's line and the film states it as fact; the game is playable today in the arcade, and
  the slate does not mention that (by instruction). If someone replies "it's already out", that is the owner's call.
- **The capture still tops up lives**, as on 4 Nov. No cut shows the top-up (the cuts avoid every hurt flash), but the
  HUD's lives are always full.
- **The boss cut is reached by `debug.bossWave`**, a jump: the run in that cut is real play from the boss wave on, but
  the waves before it were skipped.
- **The capture player is ours** (`tools/bot.cjs`), not the game's look-ahead bot from v119 (that one lives in the game's
  own repo, not in the deployed tree). It plays well enough to look like a person; it is not a skill claim.
- **Platform marks:** none are drawn. If the owner wants the Instagram and X glyphs, they are a separate decision.

## Built 4 Nov (full film, English)

**Owner, 4 Nov:** "All these are English for now. Proceed." End card **B** (the game's own title), as recommended.

- **Files:**
  - `films/04-11-GL1-Toko-Drop-2.mp4`: 1080×1920, 30 fps, 33.5 s, H.264 + AAC, no RFH sign-off;
  - `previews/04-11-GL-Toko-Drop-2-en.mp4`: the phone preview;
  - `previews/04-11-GL-Toko-Drop-2-sheet.jpg`: 12 frames across the film.
- **No `-loop` master.** The film has no sign-off, so the master is already film-only. It ends on the title card, so a
  loop is a hard cut back to the Toko Midori Games lockup.
- **The build is the live v117, not v115.** gh-pages moved twice since the checkpoint: v116 is a phone shader pass, v117
  a bot and balance pass. Every frame, the intro included, was recaptured from the deployed v117, so the HUD reads
  `2.0 · v117`. Nothing on screen names a version: the strip's V114/V115 tags are dropped by default.
- **Sound:** `score.py` (172 BPM), with the game's own v117 intro cues (`introWav`) under the intro. It is now mastered
  to the house finish and measured by ffmpeg's ebur128: **−14.1 LUFS integrated, −3.3 dBFS true peak, LRA 5.6** on the
  filed file. The intro builds from about −20 dB RMS to about −14 for the compilation. The quietest second is the
  logo's (about −30 dB), and nothing drops out.

### The cut list as built (every cut on a beat; `plan.json`, written by `tools/mkplan.py` from `tools/froms.json`)

| # | t (s) | beats | tag | source | real play or staged |
|---|---|---|---|---|---|
| — | 0.00–8.37 | 24 | — | the v16 intro, three runs | the game's own intro, frame by frame |
| 1 | 8.37 | 4 | ARCADE | world 8 | real play |
| 2 | 9.77 | 4 | GATES | world 2 | real play |
| 3 | 11.16 | 4 | GIANTS | world 6, `stage2.cjs g1` | staged: a giant and its escort, shot until it wears |
| 4 | 12.56 | 2 | STEP OUT! | world 5, `stage2.cjs g2` | staged: the gather, the ring and tag, the step out, the slam |
| 5 | 13.26 | 2 | SPLIT! | world 6, `g1` | staged: the giant bursts and splits |
| 6 | 13.95 | 4 | CLEAR THE LANE! | world 3, `stage2.cjs ram` | staged: four gels pinned in a ram lane, the tag, the hero steps out |
| 7 | 15.35 | 2 | SEWER RAMS | world 3, `ram` | staged: the punch |
| 8 | 16.05 | 2 | HOLD THE RING | world 3 | real play |
| 9–14 | 16.74–22.33 | 4,4,2,2,2,2 | CISTERN · BOILER · RIVER · ICE · THE DEEP · CORE | worlds 4–9 | real play |
| 15 | 22.33 | 4 | BOSS | world 1 | real play, reached with `debug.bossWave()` (the Twin Prisms) |
| 16 | 23.72 | 4 | WORLD CLEAR | world 1 | the bosses put down with `debug.killBosses()`; the game's own WORLD CLEAR follows |
| 17–20 | 25.12 | 1 each | — | worlds 5–8 | real play, one beat each |
| 21 | 26.51 | 4 | GIANT + ESCORT | world 9, `g1` (march only) | staged |
| 22 | 27.91 | 4 | DASH | world 7, `stage2.cjs dash` | staged: two dashes through a line of bodies |
| 23 | 29.30 | 4 | — | world 9 | real play |
| card | 30.70–33.49 | 8 | — | the title screen | the game's own menu, with the band PLAY FREE IN THE ARCADE · MBACE1.GITHUB.IO/SUDS-JACK · GL GAMEPLAY LABORATORY |

- **Real play** (`tools/take.cjs`) is the game's own simple bot, with each take started on a crowd (`busy:N`).
  World 5–9 floors carry 25–40 bodies at once.
- **Staged** (`tools/stage2.cjs`) uses `showcase` / `idle` / `act`, the game's own look-check hooks. All of it is real game
  code and rendering; the script only sets where things stand and what the hero does.
- **Capture aid, all takes:** the hero's lives are topped up every step, so the bot's run reaches the moment instead of
  ending. The hearts in the HUD are therefore always full.
- **Crops:** staged takes are captured at device scale 3.25–3.75 and cropped 1.3–1.8×, so a crop is never upscaled past
  about 1.2×.
- **Fixed against the checkpoint:**
  - the empty-floor staged cuts now carry company: an escort of mites, gels around the slam, and four gels in the ram lane;
  - the near-empty "THE RUN STARTS" opener is replaced by a busy world-8 floor;
  - the GL mark uses the plain glyphs (the bold G read as a 6);
  - the run-start ARCADE banner is cropped out of the staged cuts.
- **The remaining tells of staging:** a staged cut opens on a fresh run, with a low score in the HUD's corner (cropped out
  on most). SPLIT! and GIANTS share one giant.


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

## The checkpoint's cut list (3 Nov; superseded by "The cut list as built" above)

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

**Toko re-cut, 8 Nov (Toko Instagram + Toko X; no links, as the slate):**

> Toko Drop 2.0. One drop, nine worlds, a lot of goo. Coming in 2027. #TokoDrop #gamedev #indiedev #twinstick

(107 characters. No link anywhere, per the owner. The 4 Nov draft below carried the arcade's address and is not for the
Toko accounts.)

**GL1, 4 Nov (on HOLD, not to be posted):**

> Toko Drop 2.0: nine worlds, giants that slam, sewer rams, goo everywhere. Free in the arcade: mbace1.github.io/Suds-Jack/toko-drop-2/

(4 Nov: the version number is dropped from the post, because the game ships daily and a number in the copy dates it.)

## The owner's lockup (9 Nov)

**Owner, 9 Nov:** "Fyi, the text in the beginning logo is a bit wrong, please use this instead", with the official Toko
Midori Games lockup attached as a 2000×1000 RGBA PNG: a magenta disc with a white face, and the three-line logotype in
magenta.

- The PNG is filed as `looks/gl/tokodrop2/lockup.png`, exactly as sent, and is never redrawn.
- **Opening (first four beats, 0–1.40 s):** a new `lockup` segment. The disc pops in, then the three lines slide in.
  The game's own logo sound plays under it.
- **The cut:** on the beat, the film cuts to the game's own intro from source 3.52 s. By then the game's drawn
  "Toko Midori Games™" has left the frame and its title "Toko drop" is building. The old lockup frames (source
  1.9–3.5 s) are gone.
- **End slate:** the same image replaces the traced face and drawn logotype. There is no ™, because the owner's
  lockup has none.
- **Re-render:** only frames 0–73 and the slate (586–752) were re-rendered. The compilation is unchanged.
- **Score:** `score.py` cuts the game's intro sound under the lockup segment too. It is −14.0 LUFS by its own check, and
  the filed MP4 measures −14.1 LUFS and −2.9 dBFS true peak. Length 25.1 s.
- **Files:** `films/08-11-Toko7-Toko-Drop-2.mp4` is the new cut. The 8 Nov cut is kept as
  `films/08-11-Toko7-Toko-Drop-2-v1.mp4` and is NOT for posting.
- **Flag for the brand lane:** `toko/js/wordmark.js`, the game's drawn logotype, differs from this lockup. The games and
  the arcade still draw it. That is not this film's lane, so it goes to the owner.

**Owner, 9 Nov ~20:30:** "Actually, I will put it directly in the game." The film waits for the game to ship the lockup; then `tools/cap3.cjs` re-records the intro from the live build and the lockup segment goes (the game's own intro carries it). The overlay cut stays filed as the fallback.
