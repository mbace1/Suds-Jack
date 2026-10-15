# Sound by series

Until October 2026 every Radio Free Helsinki film was scored from one small additive kit
(`lib/rfsound.py`: celesta, tuba, brass, horn, kick, stamp, bell…) at one tempo, 112 BPM, so
every film sounded like the same family. Each **series** now has its own palette. Three things
stay shared:

- **The picture grid.** Cuts are 12 beats at 112 BPM (6.4286 s) apart, and the last shot is
  10 beats (37.5 s). A series may pick any tempo whose beat lands on every cut: 84, 112, 140 or
  168 BPM (9, 12, 15 or 18 beats a shot). Picture-synced effects are placed in **seconds**
  (copied from the old scores, or taken from an events list), never in a series' beats, so a
  change of tempo can never move a hit.
- **The finish.** `Mix.finish()` is unchanged: soft clip, the tail rung out from the last hit,
  and a two-pass loudnorm to −14 LUFS / −2 dBTP.
- **The station's sign-off** (`synth_signoff.py`, `signoff_m14.wav`). It is the same jingle
  after every film, whatever the series.

## The three palettes

**Doodle (Big Tech stories, papercut): the launch video, undercut.** 140 BPM, D major souring
to D minor. Fifteen beats a shot make three bars of 4/4 and then a 3/4 **break bar** before
every cut. An ad cuts a bar short, and the break bar is where the jingle lives.
- **Instruments:** an FM electric piano (`fm_ep`), `marimba`, a detuned saw `pluck`, a round
  `sub_bass`, a `supersaw` stab, a clean `clap` on 2 and 4, 808-style `hat`s and a tight kick
  (`kick_tight`).
- **App sounds:** `sparkle` (success, two chimes up a fifth), `bonk` (error, down a minor
  third), `ui_tick`, `whir`, and risers that stop just short of their hit (`lead_in`).
- **Space:** a bright 1.3 s plate and a +4 dB shelf above 2.5 kHz. The dynamics are ad-tight.
- **Rules:**
  - The hook plays only in the break bar and lands on the next cut.
  - It sours by flattening its F♯ to F and sagging in pitch. It comes and goes with the story:
    bright, then flat when the support is snipped, brightest under the €13 bn cheque, flat
    again over the forest.
  - Under captions the music is accompaniment only: the hold-music arpeggio and the groove.
  - Keyword pops take a `sparkle` when the line is corporate good news and a `bonk` when it is
    the record.
  - When the story pulls the plug, the music can `tape_stop` and come back worn (`wow`).

**Coxon (US politics and AI risk, papercut): the institution, taking itself seriously.** 84 BPM,
C minor. Nine beats a shot make two bars of 4/4 and a **pickup beat**. The snare rolls through
that pickup into almost every cut: the drum roll before an announcement.
- **Instruments:**
  - A low brass chorale (`trombone`): brighter as it gets louder, with a lip scoop into pitch,
    no vibrato, and a `slide=` for wry lowering.
  - `timpani`, with a pedal glide via `to=`, and `timp_roll`.
  - A parade snare (`field_snare`, `snare_roll`, `ruff`), a concert `bass_drum` and a `crash`.
  - A `fife` that is a hair sharp. That is the wry part.
  - City Hall's `tower_bell`, and a `rim` tick for the chamber clock.
- **Space:** a 1.9 s stone chamber, a touch darker. Dynamics are part of the point: LRA up to
  8 LU.
- **Rules:**
  - A civic hit is bass drum, timpani and snare, with a crash only when it matters.
  - Chorale chords change on the bar lines.
  - The processional (`march`) is a bass drum on 1 and 3 and a rim tick on 2 and 4. At level 2
    it adds the snare and ruffs.
  - The fife plays only in a shot's tail or after a hit. Its accents on keyword pops are a soft
    timpani tap or a wry pip.
  - Each film chooses its ending mode: *A Handful of People* (citizen action) ends in C major,
    *Committee of the Whole* (to court) in C minor.

**Toko (everyday life, observed; claymation): the room, and the hands in it.** 168 BPM in 3/4,
felt as one beat to a bar. F major: a small kitchen waltz. Eighteen beats a shot make six bars,
and a bar is exactly two picture beats.
- **Instruments:** `felt_piano` (stretched partials, two strings beating), a `music_box` comb
  that can `run_down`, `kalimba`, a plucked `upright` bass, and brushes (`brush_tap`,
  `brush_swish`).
- **Beds:** `room` tone, `vinyl` crackle, and `rain` on the window, all set by `beds()`.
- **Gadgets:** a toy, a camera, an LED. These are the **only thin, electronic sounds in the
  room**, and they come out of a tiny speaker (`toy_voice`, `toy_ding`, `toy_blip`, `servo`).
  The Deer's camera has its own small cold voice, all through `tinny()`. `cam_chime` is pips
  in fifths and octaves, no thirds: a machine is sure, never warm. The rest are `cam_snap`,
  `led_tick` and `led_flicker`, a flag that `fall_whistle`s and `pin_wobble`s, and `phone_buzz`.
- **Foley:** soft and rounded: `sit`, `pat`, `paw`, `knock`, `tag_pop`, `lamp_click`, `tram`.
- **Space:** a 0.65 s furnished room, with the top rolled off 2 dB.
- **Rules:**
  - The band is bass on one and felt chords on two and three.
  - For stillness it drops to held chords (`hold`). It does not keep pulsing under someone
    being sad.
  - Under captions the music box plays one note a bar.
  - A music box running down means something has been given up.
  - In a comedy, a joke is timed by STOPPING. The band stops dead on the DEER flag. After the
    two pats there is a real silence, 8 dB down to rain and room. The head tilts are
    `upright_slide`s: 'bwoop?' up, 'bwomp' down.

## Which film uses which series

| Film | Series | Script → score (`音频/`) | Status |
|---|---|---|---|
| The Biodiversity Fund | Doodle #1, but scored in the old house kit | `synth_bdf.py` → `配乐_bdf_m14.wav` | released; frozen, not rescored |
| On Hold | Doodle | `synth_doh_s2.py` → `配乐_doh_s2_m14.wav` | new (the old `配乐_doh_m14.wav` is kept) |
| A Handful of People | Coxon | `synth_hp_s2.py` → `配乐_hp_s2_m14.wav` | new (old kept) |
| Committee of the Whole | Coxon | `synth_cw_s2.py` → `配乐_cw_s2_m14.wav` | new (old kept) |
| Happy Little Bot | Toko | `synth_bot_s2.py` → `配乐_bot_s2_m14.wav` | new (old kept) |
| Unexpectedly, a Deer (clay remake) | Toko | `synth_dr_s2.py` → `配乐_dr_s2_m14.wav` | new (the papercut `synth_dr.py` and its wav are kept) |
| Station sign-off | all series | `synth_signoff.py` → `signoff_m14.wav` | shared; frozen |

Run a score with `uv run --with numpy --with soundfile python 音频/<script>.py` from this
folder. It needs numpy and soundfile, and takes about 10 s.

## Scoring a Toko film from an events list (as the clay Deer was)

```python
from rfseries import *                     # PB, CUT, END, T_HIT, pop(); Toko()
s = Toko(); s.beds(rain_=0.8)              # room tone, a record's surface, rain on the window
s.waltz(0, 0, ['F', 'F', 'Bb', 'F', 'Gm7', 'C7'])          # shot 0, from bar 0: one chord a bar
s.tune(0, 0, [(0, 0, 81), (1, 0, 84), (2, 0, 86)])       # music box: (bar, beat, midi)
s.events([(0.3, 'tram', 0.7, -0.4), (1.2, 'led'), (1.25, 'tag')])   # (seconds, kind[, gain, pan])
s.events([(CUT[1] + 2.2, 'flag'), (CUT[1] + 1.4, 'swivel')])
s.chatter(t, n=6)                          # a gadget's babble (the camera's brief, the toy)
s.hold(t, (53, 57, 60, 64), 2.0, bass=41)  # a held, pedalled felt chord for a still moment
s.run_down(times, notes)                   # the box giving out
s.note(kalimba(81), s.snap(pop(5, 1)), 0.2)  # a small accent inside a keyword's pop window
s.render(out_wav, ring_from=T_HIT + 1.4, tau=0.9)
```

`Toko.FOLEY` holds the effects by name: `tram led ding swivel tag flag pat paw knock sit lamp
rustle card`. Add new ones to that dict. `s.bar(shot, k, beat)` gives the time of a bar,
`s.at(shot, beat)` the time of a beat, `pop(shot, half)` the moment a keyword pops (0.5 s
after its caption line appears), and `s.snap(t)` the first grid point inside that pop. A smoke
test of this API, using the Deer table's own events, rendered cleanly (in scratch, not here).

## How it is built

- **`lib/rfsound.py`.** The new voices are appended below a marked line. Nothing above that
  line changed (verified byte-for-byte), and nothing new runs at import or touches the shared
  `rng`. The sign-off, which imports the kit, re-renders to an identical md5.
  `synth_bdf.py` carries its own copy of the old kit, so the kit cannot reach it.
  Also new: `soft`, `sweep`, `shelf`, `convolve`, `ir`, `Bus`, `glue`, `trim`, `tape_stop`,
  `wow`, and the meters `bs1770` (K-weighted, gated) and `true_peak` (4× oversampled). Both
  meters agree with ffmpeg's ebur128 to 0.1 dB.
- **`lib/rfseries.py`.**
  - The picture grid (`PB CUT END T_HIT`, computed exactly as the old scripts compute it, so
    every second matches) and `pop()`.
  - `Score`, which has a music bus and an effects bus, each with its own reverb send. The music
    can be filtered or tape-stopped without the effects going with it.
  - The three palettes as subclasses.
- **`Score.render()`.** It applies the series EQ, then a gentle glue, then the **lightest**
  look-ahead limiter that brings the peak-to-loudness ratio under 11.3 dB. That ratio is
  measured on a simulation of `finish()`'s own soft clip and tail. Above about 12 dB, loudnorm
  falls back to its dynamic limiter, which pumps; below it, loudnorm stays linear. All four
  new scores normalised in linear mode. Doodle needed a limiter 9 dB below peak, Handful only 4.

## Verification

Nobody listened to these scores; they were checked with numbers and pictures. The tools are in
`qa/sound/`: `analyse.py`, `timbre.py`, `loud.sh`, `stems.py`, and `hits.json`, which holds
every picture hit computed exactly as the old scripts place them. That folder also has a
spectrogram per new score and an old-over-new comparison per film.

| | LUFS | dBTP | LRA | music on lattice (× chance) | A-wtd centroid | onsets/s | picture hits ±30 ms |
|---|---|---|---|---|---|---|---|
| old On Hold / Handful / Committee / Bot | −13.9 / −13.6 / −14.0 / −13.8 | −1.4 / −1.9 / −2.0 / −2.0 | 8–11 | 112: 2.4–3.9 (doh, cw) | 1046–1564 Hz | 1.5–3.3 | 21/21, 12/12, 13/14, 9/9 |
| **On Hold · Doodle** | −14.0 | −3.0 | 4.5 | **140: 3.1** (112: 1.1) | **1993 Hz** | 5.4 | 21/21 |
| **Handful · Coxon** | −14.2 | −3.3 | 8.4 | **84: 1.5** (112: 1.0) | 1137 Hz | 6.7 | 12/12 |
| **Committee · Coxon** | −14.1 | −2.9 | 4.5 | **84: 2.1** (112: 1.1) | 1224 Hz | 5.2 | 14/14 |
| **Bot · Toko** | −14.0 | −3.0 | 5.0 | **84/168: 5.4** (112: 1.8) | 1336 Hz (music 918) | 8.1 (music 2.1) | 9/9 |

- **Lattice fit** is the share of the music stem's onsets that fall within 25 ms of a tempo's
  half-beat grid, divided by the chance rate. Toko's 168 beat is the same lattice as 84's
  half-beat.
- **Toko's onset density** is the toy's babble and dings, which are picture-synced as in the
  old score. Its *music* plays 2.1 onsets a second.
- **Timbre** (z-scored MFCC mean and spread):
  - The two Coxon films sit **2.4** apart, closer than any two old films (3.2–9.6).
  - The three series sit 5.4–6.8 apart.
  - Each new score sits 5.7–8.7 from the old score for the same film.
- **Hygiene:** no clipped samples, and DC under 3e-4 in every new score. Every new file is
  exactly as long as the old one (1,799,999 samples).
- **Reading the spectrograms:** showspectrumpic's lowest bin spans roughly 20–57 Hz, so its
  low end looks heavier than it is. The STFT shares in `final_analysis.txt` are the better
  guide. Do not use the `stop=` option; its zoom mirrors the spectrum.

**The clay Deer** (`synth_dr_s2.py`):
- **Loudness:** −14.1 LUFS, −3.1 dBTP, LRA 9.2 LU, linear loudnorm, no clipping.
- **Tempo:** the music stem sits on the 84|168 lattice at 5.6× chance (112 at 2.1×).
- **Events:** 55 sounded events from `clay-deer/EVENTS.md`, every paw-fall included.
  `qa/sound/hitcheck.py` finds 49 starting within 30 ms, with a median offset of 0 ms. It
  looks for a ≥4 dB rise over the 20–80 ms before each event, which is finer than the
  2048-point onsets.
- **The six that don't register** are soft continuity sounds under a joke, by choice: four
  hallway paws under the flag chimes and the RACCOON whistle, the last trot paw under the
  DEER chime, and the price-tag swing under the passing tram.
- **Global seconds win over beat labels.** "Dog stands up" is labelled beat 3 but happens at
  8.14 s, and the first render had it 104 ms early.

**Not yet confirmed by ear:**
- The fife's deliberate sharpness (+0.6 %).
- The worn tape at the end of On Hold.
- Whether 168 BPM in 3/4 feels like a one-in-a-bar lilt or a hurry.

## Films with their own music (from 2026-10-15)

The owner's direction is that these films must not all sound the same. Each keeps its series
(Coxon 1–2, Doodle 3–4, the Nordics 5, Toko 6–7) but gets its own lead instrument, key, tempo
and feel, from "Music (its own)" in its shot table
(`radiofree/studio/art-motion/plan/films/NN-*.md`).
Each score's picture hits come from `plan/<id>-EVENTS.md`.

Rendering rule added for these: `Score.render()` also asks loudnorm's own pass-1 measurement
(true peak after gain ≤ −2.1, LRA ≤ 10.8 LU) before accepting a limiter setting. loudnorm's LRA
reads about 2.5 LU above ebur128's, and above 11 LU it falls back to dynamic mode. The five scores
above re-render byte-identically under this rule.

The hit check (`qa/sound/hitcheck.py`) is now band-aware. An event counts when it rises ≥4 dB within
±30 ms in any band (broadband, 150–600 Hz, 0.6–2.5 kHz, 2.5–10 kHz), and the report says which band
carried it. A 5 kHz squeak is heard over a tuba even when it barely moves the broadband level.

- **1 · Paid For By** (`synth_pfb.py` → `配乐_pfb_m14.wav`): a brassy campaign jingle in B♭ at
  112: trumpets in thirds, sousaphone oom-pah, trombones, glockenspiel, rally claps, and the
  Coxon snare and bass drum.
  - It starts boxed inside the TV and opens out as the money drifts into the room.
  - At the keyboard the glockenspiel plays a note per key and nothing on A or I.
  - The end card's chord loses a section at each shrink of the fine print, leaving a breath of
    silence for the last line (−34.5 dB against −12.8). Then one tuba note sags on the last hit.
  - −13.8 LUFS, −3.0 dBTP. 69/69 events within 30 ms (61 broadband). Music on the 112 lattice
    at 2.7×.
- **3 · The Newsreader Was Fake** (`synth_nrf.py` → `配乐_nrf_m14.wav`): a breaking-news theme
  parody in E minor at 140 (Doodle's sub bass). A stopwatch ticks on every beat. Urgent
  saw-brass stabs (`saw_stab`) and timpani; a rising dominant arpeggio in each 3/4 break bar
  lands on E minor at the cut.
  - The bids climb, the villain paddle gets a tritone sting, and a riser lifts the gavel to its
    bang.
  - "Liable" launches a dry roll that stops dead 0.1 s before the LIABLE stamp (−35.5 dB, then
    −12.3 dB).
  - The tick stops on FLAT, a breath follows (−38.4 dB), then the ka-ching
    (`cash_register`) over a small E-major stab, and the receipt `printer` at three times the
    speed.
  - −14.1 LUFS, −3.1 dBTP. 45/45 events within 30 ms. Music on the 140 lattice at 3.2×.
- **2 · On the Same Voluntary Terms** (`synth_vt.py` → `配乐_vt_m14.wav`): a stiff-upper-lip
  string-quartet minuet, an original tune in D major, 3/4 on the 168 grid (new
  `violin`/`viola`/`cello`). The tune sits on long notes wherever a caption appears.
  - The first chord of shot 3 is cut dead by the transatlantic ring (`phone_bell`): the music
    stem drops from −14.1 to −43.3 dB.
  - Through the seventeen days a single cello holds its D and sulks (`cello_hold`), re-bowing on
    DAY 17.
  - Shot 5 replays shot 1's music exactly (correlation 0.99, ±0.00 dB) under the same rhyming
    foley. Shot 6 plays through one smaller rattle until the door click cuts it.
  - −14.0 LUFS, −3.0 dBTP. 47/47 events within 30 ms. Music on the 84|168 lattice at 2.2×.
- **4 · Irreversible** (`synth_irr.py` → `配乐_irr_m14.wav`): a glossy keynote groove in D major
  at 140 (a soft four-on-the-floor, a `pluck` arpeggio, marimba, the sub), the twelve stars on a
  rising glockenspiel. When the case begins it turns into courtroom pizzicato in D minor on the
  same grid (new `pizz_str`: the quartet's bodies, plucked).
  - "IRREVERSIBLE HARM" lands on a solemn low hit: timpani, bass drum, low trombones, cello and
    a deep bell. The law book's pages turn and nine drawers burst one per eighth on climbing
    plucks. The scale rocks on a two-note see-saw that never settles.
  - The padlock clicks onto the keynote's glossy chord, as if it were a launch. A pencil, the tape
    and a little photocopier (`copier`, `pencil`) keep working behind it; one pluck sits under the
    last line.
  - −13.7 LUFS, −3.0 dBTP. 41/41 events within 30 ms (the seventh star, under the tape, by spectral
    flux). Music on the 140 lattice at 2.9×.
- **5 · Satire Excepted** (`synth_sat.py` → `配乐_sat_m14.wav`): a jaunty Copenhagen waltz in G
  major, 3/4 on the 168 grid, six bars a shot. A musette `accordion` (three reeds, one sharp and one
  flat) plays the tune over its own oom-pah-pah bass buttons; a `harpsichord` breaks the chords. The
  tune holds long notes while each caption appears.
  - A celesta run lights the palace windows over lapping water, a boat's putter and two flags.
    The copying press stamps on the waltz's downbeats (`press_stamp`) and the band leaves the
    downbeat to it. The calendar's pages rip on harpsichord notes climbing D–E–F♯, each fluttering
    away on a trill, and the pencil circles the 1st on G.
  - On the rail the band stops dead for the tag (ding, then DING). On the scale a `slide_whistle`
    rides the beam's computed angle, and the band can't choose between G major and G minor.
  - A small ta-DA lands on "This has been satire.", then 1.3 s of room tone. On "Probably." a
    `fagotto` (bassoon) doubts in two notes: D, then a sagging C♯ that never resolves, as the balance
    swings back in.
  - −13.9 LUFS, −3.3 dBTP. 34/34 events within 30 ms, with no limiting. Music on the 84|168
    lattice at 3.8×.
  - The events list puts the ta-da on "Probably."; the brief puts it on "This has been satire." and
    gives "Probably." the bassoon. The score follows the brief.
- **6 · Genius** (`synth_gen.py` → `配乐_gen_m14.wav`, 509 frames = 21.21 s): a cheesy game show and
  sitcom groove in C at 109 BPM. The beat is 0.55 s because the sad trombone's wahs are 0.55 s
  apart in the picture.
  - The band is slap bass, combo organ, claps and game-show brass. Toko's room stays underneath:
    flies, birds, a snoring dog, a kalimba for the dog's ear.
  - The TA-DA stops the groove; the BURST is a fanfare and a confetti cannon.
  - The rollback is the burst itself rewound (`tape_rewind`): the same fanfare reversed and
    spooling faster, ending on a blip.
  - A muted trombone plays wah-wah as the dog walks out.
  - −14.0 LUFS, −2.8 dBTP. 25/25 events within 30 ms (median −2 ms).
- **7 · Somebody Does the Dishes** (`synth_dsh.py` → `配乐_dsh_m14.wav`, 514 frames = 21.42 s): a
  lounge bossa "smart home" jingle in G. Its quarter note is the robot's 0.7 s teleoperated jerk,
  so the robot moves on the beat. Nylon guitar batida, upright, rim clave, shaker, a vibraphone
  jingle.
  - The band goes drowsy as Toko nods off and wakes on his snort.
  - At the wall wipe it closes off into an office hum (`office_hum`), with a yawn and a stapler:
    kitchen −15.3 dB against cubicle −21 to −25 dB.
  - The split shot plays both worlds at once (kitchen left, cubicle right).
  - The film ends on a two-note vibraphone wave.
  - −13.8 LUFS, −2.7 dBTP. 30/30 events within 30 ms.
- **Caption timing for 6 and 7 is assumed** (their captions are burned later): first line about
  0.8 s after each cut. The tunes keep off those moments, but re-check once the caption files
  exist.
- The hit check now reports each onset at its **half-rise point**. Its first-crossing reading
  showed −22 ms for Genius, because a fly or a bird in a quiet passage clears the 4 dB bar before
  the hit itself. With the half-rise point every film reads a median of 0 to −2 ms.
