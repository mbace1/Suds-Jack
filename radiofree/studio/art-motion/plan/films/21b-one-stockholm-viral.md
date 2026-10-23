# One Stockholm (Doodle 4), VIRAL CUT v1, 23 Oct

Owner, 23 Oct: a viral version of Doodle 5, then "Test other 2 as well and rest after". This is one of the rest. It is
built from the v1 draft (`plan/films/21-one-stockholm.md`), which stays as it is.

- Engine key `os` (the same kit), `papercut/one-stockholm-viral/`.
- Scenes: `osv_*`, appended to `scenes/os_kit.js` after v1's last scene. No v1 line changed, so v1 renders exactly as
  before.
- 44 beats at 140 BPM, plus one 2-beat hold for the price caption: 20.1 s, plus the papercut sign-off. v1 was 60 beats at
  112 BPM.
- Captions at the BIG size (82 px em, `captionSize: "big"`).
- The score is the Doodle palette, bright on frame 1 and sour from the box on, driven (`score.py`).

## The viral format

The same seven rules as the other viral cuts (`plan/films/25b-count-the-trees-viral.md`): the hook is the first frame,
~18–22 s plus the sign-off, one shareable escalation, a sharpened punchline, a loop, a hit on frame 1 (35 ms in, never
sample 0), and a hook-first post of ≤280 characters that ends with a question.

## How this film does it

**Frame 1 (the hook).**
- The lit paper Stockholm stands in the pine clearing at the cable's end: v1's turn, moved to the front.
- Under it, a strip cut from the box's appliance label: **Doodle DATA CENTRE · SWEDEN / UP TO 2,000 MW / ≈ ALL OF
  STOCKHOLM**. With the sound off, frame 0 says the whole story before a caption word has finished: a city, a data
  centre, a number, and the hedges ("up to", "≈") in the picture itself.
- The ends of the city start to fold at 0.24 s (`FOLD`), the middle last. It is flat on **power.** (0.74 s), the grey box
  comes up out of the same crease with a thump, the clearing flashes once, and the box's green light starts to blink.
- Caption: **A Stockholm's / worth of power.** The ~1 s frame is the cover: the box standing where the city was, the full
  caption, and the strip.

**The escalation, in three steps.**
1. *Up to 2,000 MW: about all of Stockholm.* The real skyline from the water, its windows coming on in one sweep, left to
   right; the last ones light on **all of Stockholm**, and the whole city flashes on a slam.
2. *Jobs? The seller: 500. / Doodle: maybe hundreds.* The seller's hand-painted 500 JOBS (OUR ESTIMATE) creaks up on
   **500**, and Doodle's printed MAYBE HUNDREDS. STILL EARLY DAYS. pops up on its pop. This is the share beat: two signs
   that do not agree, side by side, each owned by whoever put it up.
3. *Grid operator: / without new power, / prices rise nationwide.* On the map, the warning pops at Torsboda on the
   attribution, the dashed turbine that is not built is drawn on the condition, and a price tag flips up in each of the
   four price areas on **nationwide**. The condition is on screen in the caption and in the picture.

**The punchline.**
- **Power: one Stockholm. / Jobs: too early to say.**
- The box's appliance label slams in over the clearing (×1.3 → ×0.92). The black arrow slides home to the longest bar,
  1 STOCKHOLM, on **Power**, and the red TOO EARLY TO SAY stamp comes down across the empty JOBS field on the pop.

**The loop.**
- On `back` (3.45 s into the last shot) the label drops out of the frame under its own weight, the box folds down into the
  crease, and the city stands up again a card at a time, middle first (`UNFOLD`), lit.
- The strip comes back up from below once the label has gone, so the punchline has the frame to itself until then. The
  punchline caption clears 0.45 s before the end.
- The camera eases back to frame 0's exact framing: `V.z0` = 1.03, focus (540, 1150), no drift. The very last frame forces
  it, and the moon's halo is drawn at frame 0's phase.
- So the last frame and the first share their whole composition: the clearing, the lit city, the strip, the camera and an
  empty top band. Frame 0 then folds the city again. The loop is the argument: *a city, a box, a city, a box*.
- On frame 0 the strip is at ×1.05 and settles to ×1 over 0.25 s. That is a small punch on the hit, deliberately.
- The score's last bar is the sour jingle landing on `back` and a riser that lands on frame 1's hit.
- The **papercut sign-off breaks the loop** in the `+signoff` master. On a platform that loops, post the film-only master
  (`23-10-One-Stockholm-VIRAL-loop-en.mp4`) and keep the sign-off for places that do not.

**Post copy (`post.en`, 256 characters):** A Stockholm's worth of power: Doodle's planned data centre in Torsboda, Sweden
may draw up to 2,000 MW. Jobs? The seller says 500; Doodle, maybe hundreds. Without new power, the grid operator warns,
prices rise nationwide. Good deal for Sweden? #Sweden #AI

## The fact re-check (23 Oct 2026)

**How:** WebSearch in Swedish and English, 23 Oct. Nothing is quoted on screen.

| # | claim on screen | status | sources |
|---|---|---|---|
| 1 | **Up to 2,000 MW; about all of Stockholm** | **HOLDS.** The deal as reported: 650 MW in phase one, a 1,000 MW target, an option to 1,800–2,000 MW; Doodle says the current talks cover up to 1 GW, hence "up to". The comparison is the outlets': Sveriges Radio (as much electricity as all of Stockholm), Energinyheter (more than the city of Stockholm); E.ON says the site could need up to 1,000 MW, roughly Stockholm's total demand. | Sveriges Radio; Energinyheter; Affärsvärlden |
| 2 | **The seller: 500 (jobs)** | **HOLDS.** Torsboda Industrial Park, the municipal company selling the site, estimates at least 500 direct jobs. It is the seller's figure, on the seller's sign. | Sundsvall municipality, 18 Jun; SVT; Torsboda Industrial Park |
| 3 | **Doodle: maybe hundreds** | **HOLDS.** No firm Doodle job number has been published as of 23 Oct. Doodle has said hundreds and that it is still early days. Nothing says Doodle denied the 500. | Sveriges Radio; SVT |
| 4 | **Without new power, prices rise nationwide** | **HOLDS, conditional.** Svenska kraftnät to Sveriges Radio: a load like this without new generation would affect prices across the whole country. | Sveriges Radio; Dagens PS |
| 5 | **The sale; an E.ON contract** | **NOT CLOSED / NOT SIGNED as of the re-check.** The Sundsvall and Timrå councils approved the sale on conditions; it was planned to close in October, pending ISP (Inspektionen för strategiska produkter) clearance and the decisions becoming legally binding. No E.ON connection agreement had been reported (none as of June). **The film never says the sale closed or that power was contracted:** "planned", "may draw", "up to". | Sundsvall municipality; Sveriges Radio; samordningsforbundet.se ("Kommunen förklarar") |

**Does anything change the punchline?** No. A firm Doodle job number would; none exists. **Check on the morning of
posting:** the ISP decision, whether the sale has closed, and any E.ON agreement. If Doodle publishes a job figure,
the punchline goes.

## Shots (5 shots, 44 beats + a 2-beat hold at 140 BPM ≈ 20.1 s, + the sign-off)

| # | id | beats | caption (en) | what we see | cues (s, en) |
|---|---|---|---|---|---|
| 1 | `osv_hook` | 8 | A Stockholm's / worth of **power.** | The lit paper Stockholm in the pines over the strip; it folds, ends first, and the grey Doodle box comes up out of the crease on the pop, with a flash. | pop 0.74 |
| 2 | `osv_city` | 9 | Up to 2,000 MW: / about **all of Stockholm.** | Stockholm from the water, windows sweeping on left to right; the last on the pop, the city flashes. Tag: STOCKHOLM | pop 4.40 |
| 3 | `osv_jobs` | 9 | Jobs? The seller: 500. / Doodle: **maybe hundreds.** | The box behind its fence; the seller's plywood sign on "500", Doodle's printed sign on the pop. Both left of the IG rail. | sell 7.94, doodle 8.46 |
| 4 | `osv_map` | 9 + 2 | Grid operator: / without new power, / prices rise **nationwide.** | The card map: the warning at Torsboda, the dashed turbine that is not built, four price tags. Tag: GRID OPERATOR: SVENSKA KRAFTNÄT | warn 11.51, built 11.95, nation 12.88 |
| 5 | `osv_end` | 10 | Power: one Stockholm. / Jobs: **too early to say.** | The appliance label slams in; the arrow to 1 STOCKHOLM, the stamp. Then the label falls, the box folds, the city stands up, the strip returns: frame 0. | power 16.11, jobs 16.96, back 19.31 |

**Sound** (`score.py`):
- **Frame 1:** a hit at 35 ms on D major (kick, sub, saw stab, crash), then a card flip per folding piece (mirroring
  `FOLD`), and a thump, a soured stab and the box's hum on **power**.
- **The bed:** the Doodle hold music, sour, with a kick on every beat, claps on 2 and 4 and off-beat hats, ducked
  −3.5 dB under each caption; risers, a whoosh and a kick into every cut.
- **The city:** the harbour lapping, a tick per step of the window sweep (mirroring `SWEEP`), and a slam with a chime and a
  sparkle on **all of Stockholm**.
- **The signs:** a wood creak on **500**, a pop and a clank for Doodle's sign, and a cheerful little chime, for nothing.
- **The map:** a bonk for the warning, a pencil for the turbine, a coin per price area and a hit on **nationwide**, the
  till.
- **The end:** a stamp as the label slams in, a paper slide for the arrow, the stamp on **too early to say**; on `back` a
  whoosh as the label falls, a card flip per piece standing up (mirroring `UNFOLD`), the sour jingle and a riser into
  frame 1.

## Risks

- **The sale has not closed and no power contract is reported.** The film only ever says "planned", "may draw" and
  "up to". Re-check on the morning of posting (above).
- **The Stockholm comparison is the outlets'.** "Up to 2,000 MW ≈ all of Stockholm" is how Sveriges Radio and
  Energinyheter put it; Doodle's own talks are about up to 1 GW. The "up to" and the "≈" are on screen on the first frame.
- **"Grid operator:" is a paraphrase with an attribution,** not a quote, and it carries its condition.
- **fi / ja are drafts** (`native_read` false), adapted from v1's drafts.
- **The loop jumps from the label to a lit city.** It is a matched-composition loop, not a seamless motion loop: the
  last frame IS frame 0's picture, and frame 0 folds it again.
- **The sign-off master breaks the loop** (see above).

## Build

```
uv run -q --with numpy --with soundfile --with matplotlib python pipeline/build.py papercut/one-stockholm-viral --lang en \
  --fonts $P/lib/fonts --engine $P --jobs 1 --signoff previews/signoff-papercut.mp4 --out $S/build-osv
```
