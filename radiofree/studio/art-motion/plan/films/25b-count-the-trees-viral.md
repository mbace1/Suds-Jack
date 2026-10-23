# Count the Trees (Doodle 5), VIRAL CUT v1, 23 Oct

Owner, 23 Oct: "Doodle 5 is now becoming more of bigger news so we should highlight that and make it a viral video."
This cut is built from the v1 draft (`plan/films/25-count-the-trees.md`), which stays as it is.

- Engine key `cnt` (the same kit), `papercut/count-the-trees-viral/`.
- Scenes: `cntv_*`, appended to `scenes/cnt_kit.js` after v1's last scene. No v1 line changed, so v1 renders exactly as
  before.
- 44 beats at 140 BPM ≈ 19.3 s, plus the papercut sign-off. v1 was 60 beats at 112 BPM ≈ 32.1 s.
- Captions at the BIG size (82 px em, `captionSize: "big"`).
- The score is the Doodle palette from the first frame, sour and driven (`score.py`).

## The viral format (shared by the three viral cuts)

1. **The hook IS the first frame.** There is no setup question. Frame 1 shows the shock and reads with the sound off in
   under a second.
2. **~18–22 s of film + the papercut sign-off.** Short, big, high-contrast captions that still pass the pipeline's
   reading-time checks.
3. **One escalation beat that makes it shareable.** Here it is real headline phrasings in other languages, with **no
   outlet names, mastheads or logos**.
4. **The punchline** stays, sharpened for speed.
5. **A loop.** The last frame hands back into the first, so a replay reads as one more turn.
6. **Sound:** a hit on frame 1, more driving than v1.
7. **Post copy** (`post.en`): hook-first, ≤280 characters, ending with a question.

## How this film does it

**Frame 1 (the hook).**
- The forest inside the red boundary is already falling, lane by lane. The felling front started before the film did:
  `HOOK_LEAD` = 1.05 s, so frame 0 is mid-fell.
- A big torn clipping sits at the bottom: **TREES · THE GUARDIAN'S ESTIMATE / 250,000**.
- The caption **About 250,000 / trees. Gone.** types on above it. The last lane falls on **Gone.** (0.70 s), the cleared
  site flashes, and the sound hits.
- With the sound off, frame 0 still says *250,000 trees* in a 150 px Anton numeral before a single caption word has
  finished.

**The escalation, in three steps.**
1. *Cleared before the required assessment.* The EIA card slams down onto the empty site, its box empty.
2. *Police opened a preliminary inquiry.* A patrol car comes along the road under the site, its light bar strobing blue
   across the clearing, and the inquiry card slams down. This is the news since v1.
3. *The story went worldwide.* Six newsprint slips drop onto the map one after another. Each carries a phrase as it was
   reported, in its own language, with a language chip and no masthead. The sixth and biggest, the English one, lands on
   **worldwide.** This is the share beat.

**The punchline.**
- **Felled: ~330 ha. / Planting planned: / 130 ha.**
- Saplings come up across 40 % of the clearing (130 of ~330), and the tag pops on **130 ha**.
- v1's "hectares" became "ha" so the line fits at the big size and is read in one look.

**The loop.**
- On `back` (3.55 s into the last shot) the camera eases back out to frame 0's exact framing:
  `V.z0` = 1.03, focus (525, 960), no drift. The very last frame forces it.
- The big clipping comes back up from below on `back`, so the punchline has the frame to itself until then. It settles
  in the same place with the same words, and the punchline caption clears 0.45 s before the end. The last frame and the
  first therefore share their whole composition: the map, the red ring, the clipping, the camera and an empty top band.
- On frame 0 the clipping is at ×1.05 and settles to ×1 over 0.25 s. That is a small punch on the hit, deliberately.
- What jumps is the content, from saplings in a cleared site back to a forest being felled. That turns the loop into
  the film's argument: *planting, felling, planting*.
- The score's last bar is a riser that lands on frame 1's hit.
- The **papercut sign-off breaks the loop** in the `+signoff` master. On a platform that loops, post the film-only
  master (`count-the-trees-viral.en.mp4`) and keep the sign-off for places that do not.

**Post copy (`post.en`, 264 characters):** About 250,000 trees, by the Guardian's estimate, cleared at Muhos, Finland, for
a Doodle data centre, before the required environmental assessment. Police have opened a preliminary inquiry. Planting
planned: 130 of ~330 hectares. Who counts the trees? #Finland #AI

## The fact re-check (23 Oct 2026)

**How:** WebFetch cannot reach theguardian.com from this session. Everything below comes from WebSearch result
summaries, and **no original article was opened.** Nothing is quoted on screen.

| # | claim on screen | status | sources (search summaries) |
|---|---|---|---|
| 1 | **About 250,000 trees, the Guardian's estimate** | **CONFIRMED as the Guardian's estimate (22 Oct), reported by others.** It is credited on the clipping on every frame it appears, and in the post. | Tom's Guide; Yahoo News; Timberbiz; Shopifreaks; Common Dreams (headline) |
| 2 | **Cleared before the required assessment** | **CONFIRMED.** On 6 Oct, LVV ordered Tuike Finland (Doodle's Finnish company) to stop preparatory work at Muhos and Kajaani until the environmental impact assessments are done, by 23 Oct at the latest. Doodle says it stopped on receiving the letters, and that the felling met the Forest Act. The film says "before the required assessment" and never "illegally". The tag says LVV ORDERED A HALT · 6.10.2026. | Al Jazeera 7 Oct; AFP via ORF and Euronews; Tom's Hardware; DCD |
| 3 | **Police opened a preliminary inquiry** | **CONFIRMED.** Oulu police opened an *esiselvitys* into the preparatory work at Muhos, to establish whether there is reason to suspect a crime such as environmental damage. It followed a request filed by a private person on 2 Oct; two requests were filed in all. An esiselvitys is **not** a criminal investigation, and the film does not call it one: the card says PRELIMINARY INQUIRY, and the Finnish card says ESISELVITYS. | Iltalehti, as carried by Kaleva ("IL: Poliisi on aloittanut esiselvityksen Googlen Muhoksen datakeskuksen valmistelutöistä") and MTV Uutiset; Yle; Kaleva ("Oulun poliisille on tehty kaksi tutkintapyyntöä") |
| 4 | **The story went worldwide**: six slips | **CONFIRMED.** There was coverage in at least six languages, 7–23 Oct. Each slip is a phrase as reported, set in the station's own type, with a language chip and no masthead, logo or outlet name. PT *250 mil árvores* (Amazonas Atual); RO *sute de mii de copaci* (G4Media, GoNews); FI *metsähakkuut Muhoksella* (Kaleva); DE *500 Fußballfelder Wald* (a German-language edition); ES *choca con un bosque* (Xataka); EN *250,000 trees* (Tom's Guide and others). The German slip is set in capitals, as FUSSBALLFELDER. | as listed |
| 5 | **Felled: ~330 ha** | **CONFIRMED.** It is the figure reported as Tuike's own; the regulator says over 300. The "~" carries the approximation. | AFP; DCD; TechSpot |
| 6 | **Planting planned: 130 ha** | **CONFIRMED.** It is Doodle's own statement (AFP, about 7 Oct): its landscaping and biodiversity plans include tree planting across 130 ha at Muhos. It is said without quote marks. | Tom's Hardware; The Next Web; courthousenews |
| — | **Not used** | **The 93,000 petition:** not confirmed in Finnish sources, and the petition is about data centres in general, so the beat was dropped. **The PM's "cold shower":** not confirmed. **Otanmäki ~150,000 / ~400,000 in total:** one source only. **"Illegal":** the authority's finding is about the missing assessment. | — |

## Shots (5 shots, 44 beats at 140 BPM ≈ 19.3 s, + the sign-off)

| # | id | beats | caption (en) | what we see (from directly above) | cues (s, en) |
|---|---|---|---|---|---|
| 1 | `cntv_hook` | 8 | About 250,000 / trees. **Gone.** | The forest inside the red ring already falling lane by lane, and sawdust puffs. The big clipping TREES · THE GUARDIAN'S ESTIMATE / 250,000. A flash and a camera kick on Gone. | gone 0.70 |
| 2 | `cntv_eia` | 9 | Cleared before / the required / **assessment.** | The cleared site, and the EIA card slamming down (scale 2.4 → 1.55) with its box empty. Tag: LVV ORDERED A HALT · 6.10.2026 | eia 4.75 |
| 3 | `cntv_police` | 9 | Police opened a / preliminary / **inquiry.** | A white and blue patrol car (no insignia) comes along the road, its blue light sweeping the clearing, and the POLICE · OULU / PRELIMINARY INQUIRY card slams down. Tag: OULU, FINLAND · OCTOBER 2026 | car 7.39, inq 8.61 |
| 4 | `cntv_world` | 9 | The story went / **worldwide.** | Six slips fall onto the map every 0.19 s; the sixth (EN, ×1.18) lands on the pop, with a flash. Tag: HEADLINES IN SIX LANGUAGES | slips 11.19, world 12.70 |
| 5 | `cntv_end` | 10 | Felled: ~330 ha. / Planting planned: / **130 ha.** | Saplings across 40 % of the clearing and the PLANTING PLANNED · 130 ha tag. Then the camera goes back to frame 0, with the big clipping in place. | plant 15.86, ha 16.49, back 18.55 |

**Sound** (`score.py`):
- **Frame 1:** a hit at 35 ms (kick, sub, a Dm saw stab, a crash), then a knock and a rustle per lane (mirroring
  `fellV`) up to Gone.
- **The bed:** the Doodle hold music, sour, with a kick on every beat, claps on 2 and 4 and off-beat hats, ducked
  −3.5 dB under each caption.
- **The cuts:** risers and a whoosh into every cut.
- **The slams:** a stamp with a bonk for the EIA; a siren in whoops plus the LED flicker of the light bar, then a stamp
  for the inquiry.
- **The slips:** a slap on each, with a crash and a chime up a fifth on worldwide.
- **The end:** kalimba saplings, a tag pop on 130 ha, the sour jingle landing on `back`, and a riser into the loop.

## Risks

- **The Guardian's original was not opened.** The 250,000 is credited as its estimate on screen and in the post, as in v1.
- **The police beat is the newest fact,** and it comes from Finnish press via search summaries. The film says only
  "opened a preliminary inquiry", which is what an esiselvitys is, and nothing about suspects or charges.
- **The slips are real phrasings without their outlets.** That is deliberate (no mastheads), but it means a viewer cannot
  check a slip from the frame. The sources are in `copy.json` and here.
- **fi / ja are drafts** (`native_read` false). The Finnish inquiry card is a single word, ESISELVITYS.
- **The loop jumps from saplings to a falling forest.** It is a matched-composition loop, not a seamless motion loop.
- **The sign-off master breaks the loop** (see above).

## Build

```
uv run -q --with numpy --with soundfile --with matplotlib python pipeline/build.py papercut/count-the-trees-viral --lang en \
  --fonts $P/lib/fonts --engine $P --jobs 1 --signoff previews/signoff-papercut.mp4 --out $S/build-cntv
```

Preview: `previews/23-10-Count-the-Trees-VIRAL-en.mp4`.

**v1 build, 23 Oct: PASSED.**
- 19.29 s of film; 22.3 s with the sign-off.
- Text: 96 pass, 6 warn, 0 FAIL. The warnings are the fi/ja native reads and the fi/ja sidecar lengths on the en master.
- Sound: 5 pass, 0 FAIL. −13.9 LUFS, −2.8 dBTP, LRA 1.4, and 20/20 cues have a sound within 40 ms.

**Fixes after looking at the first build:**
1. The big clipping sat under the punchline for the whole last shot, so three numbers competed with 130 ha. It now
   rises in on `back`.
2. The punchline caption was still fading on the last frame, so the loop join had text on one side and none on the
   other. `until` went from end−0.2 to end−0.45; that is still 3.6 s on screen against 3.1 s of reading time.
3. The hook went static for 2.5 s after "Gone.", so it now has a slow push-in (+2.5 %).
4. The score's tail used to decay over 0.3 s. It now only fades in the last 0.3 s, so the riser runs into the loop.

## v2 (23 Oct): the owner's notes on v1

The notes: "Police car is too big, ending too abruptly", then "the visual seems small for 130ha", then "330 ha is huge".
v2 is 56 beats at 140 BPM = **24.0 s**, plus the sign-off. It has six shots: hook 7 beats, **pitch 12**, EIA 8, police 8,
world 6, end 15.

**Scale, made felt (the new `cntv_pitch` shot).**
- The shot opens close on ONE football pitch on the felled ground, tagged ONE FOOTBALL PITCH · 105 × 68 m, with a
  referee's whistle.
- The camera then pulls back while the pitches multiply outward until they tile the clearing. The last one lands on
  the caption's pop word: "330 hectares: / about **460** / football pitches."
- The arithmetic:
  - A pitch is 105 × 68 m = 7,140 m² = 0.714 ha.
  - 330 / 0.714 = 462, so the caption says "about 460".
  - 130 / 0.714 = 182, so the label says "≈ 180".
- The drawing is true to the clearing's own scale. The red-line polygon is 552,990 px² for ~330 ha, so 0.409 px/m, and
  a pitch is 43.0 × 27.8 px. 463 grid cells have their centre inside the red line, and the planted 40 % holds ~185 of
  them.
- The trees, the road and the car are drawn at the map's illustrative scale. Only the area is to scale.

**Three facts at most (a FAIL in the text checks).** The pitch caption became the third fact, so the "worldwide" beat
lost its caption. It is a short captionless shot now: the six headline slips under a label, HEADLINES IN SIX LANGUAGES,
where a caption would stand. The argument is rewritten around the pitches (34 words). `post.en` adds "about 460 football
pitches" (273 characters).

**Police.**
- The car is drawn at 0.3× (≈ 26 × 55 px, about half the road's width and the size of a tree crown).
- The blue light sweeps wider (radius 760).
- The inquiry card is smaller (×0.92) and sits over the top of the site, so the stumps and the car on the road below
  stay in view.

**130 ha, made to read big; the proportion is unchanged at 40 % of the clearing.**
- The camera comes in ×1.24 by the pop, then on to ×1.30 through the hold, so the clearing fills the frame.
- The saplings are denser (16 px grid, ~860 of them), brighter, and planted across the clearing's full width. A solid
  bright edge with a glow marks the patch.
- The pitch grid lies faint over the whole clearing, so the patch reads as ~180 of the ~460.
- The label (Doodle · PLANTING PLANNED · 130 ha · ≈ 180 FOOTBALL PITCHES) stands on the bare felled ground with an arrow
  down into the patch, never on it.

**The ending.**
- The punchline caption holds 3.8 s after its pop (v1: 2.35 s), with the saplings still settling and a slow push-in.
- On `back` the camera eases out to frame 0's framing over 1.8 s while the score's jingle lands and a held D-minor chord
  rings.
- The clipping rises into place on `clip`, after the caption has cleared.
- The last 0.43 s is still, with the chord's tail. That is the join into the sign-off, and the join back to frame 0 in
  the loop master.
- A frame-level zoom (`camZ`) was added for these moves, because the stack's own per-layer zoom is ~10 % of `z` and
  barely shows. It is 1 on frame 0 and on the last frame, so the loop still matches.

**Build: PASSED.**
- Text: 97 pass, 7 warn, 0 FAIL. The warnings are the fi/ja native reads and the fi/ja sidecar lengths.
- Sound: 5 pass, 0 FAIL. −14.0 LUFS, −2.9 dBTP, LRA 2.4.

**Looked at, and fixed:** the first v2 render opened the pitch shot at ×3.1. That blew the stumps up into blurred blobs
and still showed the pitch small. It now opens at ×2.4, with heavier pitch lines and the tiles at 88 % so the felled
ground shows through.

**Previews:**
- `previews/23-10-Count-the-Trees-VIRAL-v2-en.mp4` (27.0 s with the sign-off).
- `previews/23-10-Count-the-Trees-VIRAL-v2-loop-en.mp4` (24.0 s, the film only, for platforms that loop).
- The v1 viral preview is kept.
