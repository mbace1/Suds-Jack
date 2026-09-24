# Motion — how a bulletin moves when it leaves the feed

The feed is a feed: one post per screen, a package cutting on a beat clock,
DECODE a button. A **clip** is a film, and a film has rules the feed does not
need. This page is those rules, with where each number came from, so that the
next person can move one and know what they are moving. `js/film.js` is the
implementation; `test/film.mjs` asserts the plan in bare node; the picture is
judged from decoded frames (`tools/render-day.mjs` then a contact sheet), never
from a green suite.

## The references, and what was measured off each

The week of 2026-09-22 produced a wave of **code-drawn films** — no image
assets, every frame a function of time, rendered in headless Chromium — around
the Claude Opus 5.5 launch. Four of them were read as code, not as videos:

| Reference | What it is | What was taken |
|---|---|---|
| `misbahsy/claude-horizon-animation` (`horizon-reel`) | A deterministic reconstruction of the twenty-second launch film: one dome-shaped horizon per shot, a serif word riding the curve, cuts that accelerate | The **cut rhythm** (480 → 270 ms across a run; cards 1.3 / 1.9 s), **word runs** (each phrase starts larger, `step 0.28`, and grows `0.3` across its run), hard **sky alternation** between neighbours, the surface numbers (`grain 0.16`, `flicker 0.035`, `vignette 0.32`, drawn shots **boil at 12 Hz**), and the rule that the payoff word is the biggest thing on screen by the end |
| `JohnHeibel/PDoomVideo` + `ClaudeAnimationBase` (p5.brush) | A 156 s music video and its starter kit, with an `ANIMATION_GUIDE.md` the model wrote for itself | **Pure function of t** (frames render in parallel and out of order), `pulse`/`kf`/`backOut(s=1.9)`/`elasticOut`, **never snap an expression** — squash, blink, pop, "one clear focal action per shot with big silhouettes", the brush **wipe** (cover at p=.5, swap under full cover), the **iris**, `sfx` letters that pop on `backOut` and wobble, "**something happens in every shot**", and the diagnosis worth quoting whole: *"everything moves at one brisk speed, events pile on top of each other, and moments are over before anyone understands them"* |
| `iart-ai/javascript-animation-skills` | Two agent skills: canvas films and a Web Audio soundtrack | The **beat grid** as data (`BPM`, `SECTIONS`, `SHOTS`, `EVENTS` — one list, two readers), **boil not jitter** (re-seed every 4 frames, ~7.5/s), the pace table by form (comedy 1–3 s a shot, story 2–5, explainer 3–6, ambient 5–10), "**one world, many cameras**" — a continuous world and shots are only cameras on it, "carry something over every cut", the `label` that **types on** with a box that grows, and a QC list that reads stills against the storyboard row |
| `lab-explainer` (same repo) | A three.js explainer format | The **caption rule**: one sentence at a time, 40–65 characters, on screen for **1 s + 1 s per 17 characters**, starting just after the change it describes, with **gaps** so the picture gets the eyes back; judge legibility on a still **640 px wide** |
| HyperFrames' Claude guide | GSAP-timeline motion graphics | The easing table (`power2.out` 0.4–0.6 s smooth, `power4.out` 0.2–0.3 snappy, `back.out(1.6)` bouncy, `expo.out` dramatic), **95% hard cuts**, the character stagger at 0.12 s, and **counters** that roll a number up on `onUpdate` |

Three things the references agree on, which are the load-bearing ones:
**every frame is a pure function of time**; **timing is what turns drawings into
a story**, so every caption gets a reading budget and every payoff a hold; and
**a still tells you nothing** — the check is a contact sheet at the action beat
of every shot.

## What was refused, and why

The fidelity rule is that a reference must not silently replace the approved
look. This station is a **128×152 pixel panel behind curved glass**, drawn flat
in the Master System register, two colours per state, no image assets. So:

- **No watercolour, no brush, no serif.** The p5.brush medium and the launch
  film's bookish serif are their look. The typography *motion* is borrowed; the
  typeface stays the terminal mono.
- **No dome.** The launch film's one-shape-many-materials device is its
  signature. Ours already exists: every shot is seen through the same set — the
  bezel, the corner ticks, the scanlines — and the material behind it changes
  on every cut (footage / Toko / the graphic). That is the same rule, in our
  shape.
- **No push-in.** The reference's slow 4% push inside every shot is what keeps
  hard cuts from feeling static. On pixel art a 4% scale is uneven pixels, the
  one thing this renderer exists to avoid. The picture moves instead by what a
  CRT moves by: a **scanline roll** across the glass, exposure **flicker**, and
  grain that **boils**.
- **No planet limb sign-off.** The card is the station's own: the wordmark,
  the frequency, and the codec's waveform — the one every post has carried
  since v1 — going flat.
- **No music, yet.** The soundtrack skill is the obvious next borrow (a beat
  grid the cuts already sit on, synthesised in Web Audio, every voice through
  one gain). It is not in v65 because every cut here lands on a *reading*
  budget, not a bar, and a beat grid that the cuts do not honour is worse than
  silence.

## The film, shot by shot

Length is **derived from the copy**, never set: `--seconds` is a target the
reading budgets compress toward, down to 55%, and the manifest records the
length a clip actually is.

| Phase | Shot | Length | What happens |
|---|---|---|---|
| Cold open | footage | 2.0 s | The slug and the first headline run pop in (`backOut`, 0.32 s) |
| Read 1 | Toko | 1 s + 1 s / 22 chars, floor 2.4 | The **sentence carrying the first struck span** of paragraph 1, as one caption; the second headline run pops on the cut |
| Read 2 | the graphic, green | same | Paragraph 2's sentence; the third run |
| Breath | footage | 0.8 s | Nothing new — the silence before the payoff |
| **Reveal** | cut flash 0.10 s → the graphic, **amber**, at full width | | The panel is blitted at an **integer** scale (×7 for 128 px: 896 × 1064) — not the phone card it sits in on the feed, which made it a stamp in the first export |
| Hold | the graphic | Σ pairs + the tell | The **technique** pops in as the payoff word (96 px, growing 30% across the hold, `AMBER_HOT`); each `{{spun|plain}}` pair is its own caption — the wording with a **strike wiping across** (0.25 s), then the plain reading **typing on** (28 ms a character) with a cursor; 1 s + 1 s / 17 chars each, gap 0.3 s; then the **tell** as a question; the **figure counter** rolls from `claim` to `plain` over 0.9 s (`easeOut`) with the claim struck small above it |
| Sign-off | card | 1.6 s | Wordmark, frequency, the waveform flatlining, the fiction line |

Every shot start gets the cut flash (white at 0.34, three frames) and the
reveal gets it hardest. The headline runs dim to 55% once the payoff is up: one
focal thing per shot.

## Surface

`grain 0.16` (overlay, full-resolution noise built once, drawn at a new offset
every tick at 12 Hz so it boils), `flicker 0.035` (an exposure veil re-drawn per
tick), `vignette 0.32`, a scanline roll across the picture every 5.2 s.

## The quality bar

Look at decoded frames, not the JSON, and not `<video>` seeks — a `currentTime`
seek on an AV1 clip returned the first frame and reported a reveal that had not
happened as one that had not fired. `tools/` decodes through mediabunny's
`CanvasSink`, which lands on the frame it was asked for.

- **The reveal is a cut**, not a state change: flash, then amber, then the
  payoff word, then the first strike — in that order, on consecutive frames.
- **One caption at a time**, and every caption is on screen for its budget.
- **The word reads at 640 px wide.** If it does not, shorten the sentence
  rather than the type.
- **Nothing arrives at once.** A frame with the headline, two paragraphs and
  four plain readings on it is the fault this page exists to close.
- **The panel is the frame.** If the graphic reads as a thumbnail, the scale
  is not an integer or the band is wrong.
- **Neighbours differ.** No two consecutive shots are the same register.
- **The last frame is the finished card**, not a mid-motion one.
