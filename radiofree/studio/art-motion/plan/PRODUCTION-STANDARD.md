# Production standard: studio-grade, as pipelines

Owner, 17 Oct 2026:
- "Studio look or high level animation look."
- "For 2d I would say animation movies and top YT channels (Kurzgesagt). For 3d look it's more clay centric
  with Aardman being the target, Kubo movie as well."
- "The sounds and music need a polished pipeline as well, so they work as positive benefits. Similar can be
  subtitles and text as a pipeline. Maybe voice generation in the future."

Until now each film was made by hand: its own scene code, its own synth script, captions timed by hand.
That is why quality varies from film to film. The standard below turns each layer into a **pipeline**:
shared parts, one way of working, and checks that fail a film before the owner sees it. A film then becomes
data (script, shots, events), and its polish comes from the pipeline rather than from that day's effort.

## The two picture targets

### 3D: clay, at Aardman and Laika (*Kubo and the Two Strings*)

Clay is the main 3D language ("allows for lots of variations"). What separates our renders from the references:

| | Aardman / Laika | Ours now | The standard |
|---|---|---|---|
| Light | motivated practicals, soft bounce, contact shadows, haze in the air (Kubo's lanterns) | one key, flat fill, little contact shadow | **key, fill and rim on every shot**; ambient occlusion pass (GTAO, already in `lib/post.js`); bounce cards; volumetric beams where there is a source |
| Sets | dense, specific, scaled to the puppet | dressed in v2, sparse elsewhere | a **set-dressing pass** on every set, with props at puppet scale; every set has one *specific* thing (the cord hole, the 令和8年 calendar) |
| Surfaces | plasticine with real fingerprints, felt, wood, Kubo's paper | the clay shader is good; fabric and paper are basic | a material library: clay, felt, knit, wood, lacquer, **paper and origami**. Kubo's paper is our bridge to the papercut |
| Performance | anticipation, follow-through, holds, eye-lines | poses, little acting | an **acting pass**: on twos, an anticipation before every move, a settle after, holds of at least 8 frames. With masks, the head tilt and hands do the acting |
| Camera | lenses, dolly moves, rack focus | fixed or slow drift | a lens per shot (35/50/85 equivalent), motivated moves, rack focus on reveals |

*Kubo also shows where Kyoto Toko belongs: a Laika-grade Japanese setting where paper and clay already meet.*

### 2D: feature animation and Kurzgesagt

| | Kurzgesagt / features | Ours now | The standard |
|---|---|---|---|
| Shape | rounded, clean vectors; gradients inside shapes; rim light; glow | flat fills, keylines | rounded geometry, an inner gradient and rim on every form, an additive glow layer |
| Depth | 3–5 parallax layers, atmospheric perspective | mostly 1–2 planes | at least 3 layers per shot, the far ones lower in contrast |
| Life | something always moving (particles, breathing, drift) | static between beats | **secondary motion on every shot** |
| Colour | a colour script per piece: dark grounds, vivid accents | per-film palettes | a colour script per film, before any drawing |
| Motion | eased curves, overlap, follow-through | linear or simple eases | one easing library (spring, back, io), with overlap built in |

The paper look stays and gets refined. It may also suit two games:
- **Eeri** (cardboard, Crafted World);
- **Piritori** (Kallio Noir).

That is a proposal for those projects' own owners and lanes, not a change made from here. Eeri's art lane
goes through `eeri/PHASING.md`.

## The sound pipeline: sound as a benefit, not a bed

**What we have:** `lib/rfsound.py` and `lib/rfseries.py` (a good synthesised kit, three series palettes) and
loudness mastering to −14 LUFS, but a new script per film.

**The standard:**
1. **One score file per film, driven by its events.** The picture exports `events.json` (every cut, pop, slap,
   word) and the score reads it. Shipped in the Kill Switch polish test (`synth_ks_polish.py`). Every film works this way.
2. **A designed sound library**, built once and versioned:
   - **UI and motion:** whooshes in three lengths, pops, chips, ticks, slaps, swishes.
   - **Foley by material:** clay, paper, card, wood, glass.
   - **Stingers.**
   - **A sonic logo each** for Radio Free Helsinki and Toko Midori.
3. **Music as stems per series:** bed, motif and sting, in fixed keys and tempos (RFH 112 BPM) so cues can be
   cut to picture. The music answers the edit, as in the Kill Switch tap, where the music stops.
4. **One mix chain:**
   - buses: music, effects, voice;
   - ducking under voice and under key captions;
   - one room reverb per series (generated impulse responses, `ir()`);
   - glue compression;
   - −14 LUFS integrated, −1 dBTP.
5. **Checks that fail the build:**
   - loudness and true peak;
   - no silence over 1.5 s unless it is marked as a joke;
   - every listed event has a sound within 40 ms.

## The text pipeline: captions and on-screen type

**What we have:** `lib/rfcaps.py` (house style H, burned in as ASS), timed by hand per film, and SAFE_B for
Instagram.

**The standard:**
1. **One copy file per film** (`copy.json`) holds:
   - every line, its pop word, and the shot it belongs to;
   - its languages: **en, plus fi and ja versions**;
   - its source note.

   The film, the captions, the sidecar files and the post copy all read from it.
2. **Timing from reading speed** (the house rule: 1 s + 1 s per 20 characters, the first line longest). Never by
   hand, and never shorter than the rule.
3. **One caption renderer** for burned-in captions, animated word by word as in the Kill Switch test. It keeps
   the house look (outline, amber pop word) and adds a scrim only when the picture behind is busy.
4. **Layout from safe zones:**
   - Instagram, TikTok and Shorts bottom UI (SAFE_B 1630);
   - the right-hand rail;
   - a band that avoids the shot's key detail.
5. **Sidecar files** (SRT/VTT, en, fi, ja) on every export, for accessibility and YouTube captions.
6. **Checks:** line width ≤ 800 px, reading time, safe zones, and every Japanese line marked *native read: yes/no*.

## Voice (future)

Hold for now. When it comes:
- the copy file already holds the lines;
- the voice track becomes a bus in the mix chain, and the captions sync to it;
- three languages or none (the station's own rule: a voice good in one language and bad in two is worse
  than none, so kokoro-js stays held);
- a disclosure decision for the owner first, because the station never says how it makes its films.

## Order of work

1. ~~**Pilot all three pipelines on Kill Switch**~~ **Done, 17 Oct.** `pipeline/` (see its README): `copy.json`,
   one caption renderer, sound library `sfx-1` (40 sounds), RFH stems, the mix chain, and one command that builds
   and checks a master. There are three masters from one copy file:
   - en, 11.0 s;
   - fi, 11.0 s;
   - ja, 12.35 s. The picture holds 1.35 s so the first line can be read, and the score follows the moved beats
     with no edit.

   All three: −14.1 LUFS, −4 dBTP; 0 fails. The warnings are the unread fi and ja lines.

   The checks caught four lines over 800 px on their first run, one of them the polish test's own English line
   (806 px, shipped). `pipeline/test_checks.py` proves each check fails on a broken input.
2. **A 3D benchmark shot at the Aardman/Kubo bar:** Kyoto Toko at the irori, with full lighting, AO, an acting
   pass and the camera standard. It is a calibration for the owner, not a film.
3. **Papercut refinement:** cleaner light and the feed-style edit on one shot of *The Chair Is Taken*.
4. **A 2D benchmark at the Kurzgesagt bar:** the manga or JRPG Tokyo Toko shot, rebuilt to the 2D standard.
