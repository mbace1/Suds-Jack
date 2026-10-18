# The film pipeline

`plan/PRODUCTION-STANDARD.md` says why. This file says how. A film is three files of **data**:
- `film.html` + its script: the picture;
- `copy.json`: every word on screen, in every language;
- `score.py`: the cue sheet.

The pipeline turns them into a checked master. Its polish comes from shared parts, not from that day's effort.

```sh
# one master, one command (from art-motion/; fonts = the engine's lib/fonts directory)
uv run --with numpy --with soundfile --with matplotlib python pipeline/build.py clay/kill-switch --lang en --fonts <fonts> --out <dir>
uv run --with numpy --with soundfile python pipeline/test_checks.py    # the pipeline's own gate: every check seen to fail
uv run --with numpy --with soundfile --with matplotlib python pipeline/sound/sheet.py <dir>   # the sound library, laid out to look at
```

**Two kinds of film.**
- A **page** film draws its own frames in a canvas page (`film.html`), e.g. Kill Switch.
- An **engine** film (`film.json`) is a papercut film drawn by the huashu engine, e.g. *The Chair Is Taken*:
  1. `plan.mjs` resolves the timeline from the copy. Holds are rounded up to whole beats, so cuts stay on the
     grid. Cues can be tied to pop words (`"tip": "word:law"`), so the picture hits the word in every language.
  2. The scenes read it as `window.FILM_PLAN`. The plan is the first library the engine loads: the kits read it as
     they load, and when it loaded last every cue in the picture fell back to its scene's default while the score
     hit the planned times (Chair v1 shipped like that).
  3. The engine renders the picture.
  4. The **caption pass** (`text/overlay.html`) puts the same captions and bug on its frames.

  Pass `--engine <dir>` and, for the station's ending, `--signoff previews/signoff-papercut.mp4`.

`build.py` runs five stages and **fails on any FAIL**:

| stage | what | where |
|---|---|---|
| picture | headless Chromium renders the frames. The page also hands over its `events` (every beat and every word, retimed) and a `report` (every caption measured with the real fonts) | `render.mjs` |
| text | sidecars (SRT and VTT) in every language on this master's timeline, plus the text checks | `text/text.py` |
| sound | the film's cue sheet places sounds from the library and music from the series stems, then the mix chain masters and checks the result | `sound/` and the film's `score.py` |
| delivery | H.264 + AAC 256k, then loudness and true peak are measured **on the MP4**, because AAC can raise a peak | `build.py` |
| report | `build-report.md` (every check: pass, warn or FAIL, with why), `qa-frames.png` (the caption moments), `qa-sound.png` (spectrogram, level, the picture's beats, quiet spans) | `build.py` |

`--air` is the broadcast build: a language without a native read FAILs instead of warning.

## Text (`text/`)

- **`copy.json`**: per line, the text in `en`, `fi` and `ja`, its `at` and `until` (beat names with offsets), the
  `hold` beat, and a `source` note. It also holds `ui` (chips, datelines), `props` (in-world text that stays in one
  language, with the reason), `post` (the social copy) and `native_read` per language.
- **Syntax:** `/` breaks a line and `[word]` is the pop word. In Japanese a space marks a reveal segment and is never
  drawn.
- **Timing comes from reading speed.**
  - A line needs 1 s plus its characters at **en 20, fi 17, ja 6** a second. Japanese is set conservatively:
    the common subtitle guideline is 4 a second, and the native read may move it.
  - Words come on at 2.2× that rate, with a 0.22 s pause at each line break. The last word stays up at least 0.8 s.
  - If a language needs longer than the picture gives, `plan()` **inserts a hold** before the line's `hold` beat and
    every later beat moves. The Japanese Kill Switch is 12.35 s against the English 11.0: its first line needs 5.0 s.
- **One renderer** (`captions.js`) draws the house look in every language: black outline, the pop word in amber,
  sprung. It also draws the station bug, on a soft backing.
- **Size:** the "82" in the house ASS style is **not** an 82 px em. libass sizes Poppins by its Windows ascent +
  descent, so the house caption is a **46.5 px em on 87 px lines**. Measured: one line inks 661 px either way.
  - `"captionSize": "house"` (the default) reproduces it.
  - `"big"` (82 px em) is the creator-native size the Kill Switch pilot was built at, 1.76× house. Which one the
    feed wants is the owner's call.
- **Scrims:** the renderer measures the picture behind each line on captionless frames (edge energy, the busiest of
  five samples). It draws a scrim only when that picture is busy, as a soft, blurred shadow of the caption's own box.
  It never draws a band across the frame.
- **The message** (owner, 18 Oct: "messaging too unclear"): `argument` is the film in one sentence (≤ 35 words), and
  every caption has a `role`. The first caption is the one `setup` (the question, up by 1.5 s), the last is the one
  `punchline` (the answer, over its image), and at most three `evidence` captions sit between. `PLANNING.md` says why.
- **Checks:**
  - the message: the argument, the roles, asked first, answered last, three facts at most;
  - every line in every language, with a pop word and a source;
  - line width ≤ 800 px, measured;
  - the safe zone (top 150, bottom 1630, the right-hand rail);
  - reading time;
  - the last word's hold;
  - no caption over the shot's key details (the film's `keep(t)`);
  - native reads;
  - sidecar reading time and line length (2 lines; 42 characters, or 16 in Japanese).

## Sound (`sound/`)

- **`sfx.py`, library `sfx-1`**, 40 sounds, each deterministic (its own seeded generator, never the shared one):
  - UI and motion: whoosh (short/mid/long, in/out, or an exact length), swish, pop, chip (good/bad), tick, tap
    (and the dull tap that does nothing), slap, ripple;
  - foley for paper, card, wood, glass and clay: tap, drop, slide, flip;
  - stingers: reveal, deadpan, alarm;
  - the sonic logos: `logo_rfh()` (the station's G-C-G call) and `logo_toko()` (a blink between two felt notes).

  Change a sound's character → bump `LIB` and note it here.
- **`stems.py`, series music:**
  - RFH is 112 BPM, A minor, Am–F–C–G, with a bright 1.1 s plate.
  - `bed()` writes drums, bass and keys as separate stems and stops for any `quiet` span.
  - `motif()` is the call, `accent()` is one chord tone for a pop word, and `sting()` is the ending.
  - Doodle, Coxon and Toko (`lib/rfseries.py`) pour through the same Session.
- **`mix.py`, the chain:**
  - three buses (music, effects, voice), each with the series' reverb;
  - music ducks under key captions (−3.5 dB) and under voice (up to −8 dB);
  - the series EQ, then glue;
  - the lightest limiter that keeps loudnorm linear;
  - the house finish (−14 LUFS, −2 dBTP);
  - dry stems.
- **Sound checks:**
  - loudness within 0.5 LU;
  - true peak ≤ −1.0 dBTP;
  - no unmarked silence over 1.5 s;
  - every cue the picture lists has a sound within 40 ms, or a written exemption.

## Voice

Held (see the standard). When it comes, it is a bus that already exists (`Session.voice`), and the copy file already
holds the lines.

## Built so far

- **Kill Switch** (`clay/kill-switch/film.js`, `copy.json`, `score.py`), the pilot: en, fi and ja masters,
  `previews/17-10-Kill-Switch-pipeline-*.mp4`. Reports are in `qa/pipeline/kill-switch-pilot/`.
- **The Chair Is Taken** (Coxon #5, `papercut/chair-is-taken/`): the first engine film. v2, one question
  (`previews/18-10-Chair-Is-Taken-v2-en.mp4`); v1 is `previews/18-10-Chair-Is-Taken-en.mp4`. Reports are in
  `qa/pipeline/chair-is-taken/`.
- **Kill Switch**, the full film (`flat/kill-switch/`): v2, one comparison (`previews/18-10-Kill-Switch-v2-en.mp4`);
  v1 is `previews/18-10-Kill-Switch-en.mp4`. Reports are in `qa/pipeline/kill-switch/`.
