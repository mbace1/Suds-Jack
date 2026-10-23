# Toko: making games with AI — a set of four clay films (plan, 23 Oct)

**Owner, 23 Oct.** The idea is that indie and AAA developers all use AI for projects, prototypes and mods. They chat
with Claude and the others all day, many run long loops and test the hard limits, and coders have an edge. Many need
good designers, small teams could have a multiplying impact, and AAA needs to restructure around expanding on
prototypes. The owner's direction for the set: "Clay polished and planned well".

**Owner, the same day:** "Maybe Toko could be prototyping on a phone in an evening park, as some covert drones fly over
him." That is the set's world for film 1. See *The world* below.

**Strand:** Toko (Toko Midori Games accounts), in Toko's own voice. Short cuts double as interstitials in **GLH**, the
Gameplay Laboratory highlights compilations.

**The idea in IDEAS.md:** "Toko: making games with AI, a set".

## The message, once for all four

Toko uses AI out loud, on purpose. The set is about where the work went: the making got cheap, and the deciding did
not. Every film ends on the human side, in the message family *you still decide · go make your own* (toko-formats.md).

## The rules the set keeps

| rule | from |
|---|---|
| Clay, at the Welcome Home v4 and Deer v6 finish: thumbprints, tool drags, the per-pose boil, acting on twos, camera and light every frame, DoF, AO, grade | `clay/README.md`, `review-deer-clay-v6.md` |
| Toko is the canon Toko: the traced master face on a magenta clay disc (`toko/BRAND.md` §2c; `lib/toko.js` builds it from `master.js`). He is magenta every time, because this is the Game Creator himself, not a persona in a mood. | BRAND §2c |
| No station bug and no slate. Toko's card closes each film, all caps, with the badge, held ≥ 4 s and set the same way every time. | `toko-formats.md`, owner 15 and 19 Oct |
| Named on screen: TOKO MIDORI · THE GAME CREATOR, on the card. | `toko-formats.md` ("wasn't sure this was a toko film") |
| The AI is generic: no product's UI, logo or name. If a film ever names Claude, it carries the house disclosure that it was made with Anthropic's tools (owner, 23 Oct). None of the four needs to. | owner, 23 Oct |
| The only numbers allowed are GDC 2026 State of the Game Industry's, dated, and only after the primary is opened: 36 % use generative AI in their job, and 52 % say it is harming the industry (up from 30 %). As of this plan they come from search summaries only (gamingonlinux.com Jan 2026; gdconf.com; techspot.com/news/111128). Film 1 uses none. | IDEAS.md |
| No real developer, studio or game is shown or named. | house |
| A hook on frame 0; the loop is a content loop (the last picture hands back to the first). Captions in the pipeline's house style, every one clear to a cold viewer: one setup, at most three evidence, one punchline. | viral format, owner's clarity rule |

## The world (one place, two rooms; shared props make them a set)

- **The park (film 1).** A Helsinki-ish evening park: a slatted bench, an old lamp post that comes on at dusk, birches
  and spruces as clay lumps, wet gravel, a low fog, the sky a gradient from dusk to night to dawn. Toko sits with
  **his phone**, whose screen is the key light on his mask.
  - **Small dark drones** drift over: matte clay bodies, four arms, a blinking red light, two or three at a time, high
    and slow. Nobody looks up and nothing happens; they are ambient. They are the same AI wave, seen from above, and
    a quiet tie to the Brink and military-AI thread. **They never do anything, carry nothing and are attributed to no
    one.**
- **The studio (films 2–4).** Toko Midori Games: one room, a long desk, a monitor, sticky notes, a whiteboard, a
  cardboard arcade cabinet, a window onto the same park (so the drones can pass in the window, the recurring motif).
- **Shared props across all four:** the phone (magenta case), the thermos mug, a sticker of the badge, the drones.
- **Why the park for film 1 and the desk for the rest:** One More Loop is one person and one night, and outdoors the
  passing hours read as SKY (dusk, night, dawn) without a clock on the wall. The team films need a room full of
  desks. The park also gives the set a picture nobody else's dev-life film has.

## Sound, one family

Lo-fi night: felt piano, soft tape pad, vinyl. The **only** electronic sounds are the phone's: its chiptune blips
from the prototype, and a polite chime for each "one more change?". A drone pass is a faint high whir, panned and
filtered, never loud. Crickets and a distant tram set the park; the studio keeps the room tone. A score per film is a
pipeline `score.py` with its own series class (Backup Mode's NOIR pattern), mastered to the house −14 LUFS.

## Film 1 · One More Loop (park, ~26 s with the card)

**Argument:** with an AI, a working game prototype takes an hour, but the AI always offers one more change, and the
loop can eat the whole night. Only the person can say enough.

Grid: 112 BPM (B = 0.536 s). Shots at s1 0, s2 12B, s3 22B, s4 30B, card 40B, end 48B = 25.7 s.

| # | beats | picture | caption (en) | role | sound |
|---|---|---|---|---|---|
| 1 | s1 | **Frame 0 hook:** dusk, the park wide and low. Toko on the bench, hunched, the phone's glow on his mask; the lamp post flickers on; two drones, tiny, cross high in the orange-blue sky. On "hour" he lifts the phone: the prototype runs (a little magenta drop dodging dots). | Toko asked an AI / for a game prototype. / It took an [hour]. | setup | crickets; the phone's chiptune; a felt-piano figure; a drone's whir far off |
| 2 | s2 | **Night, over his shoulder onto the phone.** A chat, his line and the AI's, and each reply ends: *One more change?* He taps *yes*. The sky behind goes from navy to black in three jumps (the time on the phone: 23:40, 01:55, 03:10), and his thermos tips over by the third. | Then: one more change. / And one [more]. | evidence | a chime on each "one more change?"; taps; the pad thickens |
| 3 | s3 | **Close on the mask, lit by the phone,** red drone lights blinking across the dark behind him, out of focus. He slumps a little lower each pose. | It always offers / one more [change]. | evidence | the phone's chime, the drone's whir passes left to right |
| 4 | s4 | **Dawn, wide again: the frame-0 composition.** Pale pink sky, fog lifting, a bird on the lamp post. Toko asleep on the bench, the phone glowing in his glove: *One more change?* One drone crosses, small. | The prototype took an hour. / The loop took the [night]. | punchline | birdsong; the piano's figure, slower; one last chime, unanswered |
| card | card | **Toko's card,** over the dawn park, blurred: the badge, then **THE MACHINE NEVER SAYS ENOUGH. / YOU DO.** and under it TOKO MIDORI · THE GAME CREATOR. Held ≥ 4 s. | (card, `ui.card1`/`ui.card2`/`ui.name`) | — | the held chord rings out |

**The loop:** the card hands back to frame 0, dusk again, and the night starts over. The film is called One More Loop
because it is one.

**Facts:** none are needed; the film is observed, not reported. The "One more change?" line is the generic shape of an
assistant's reply offering another iteration, written for the film and attributed to no product.

## Film 2 · Needs a Designer (studio, ~22 s)

**Argument:** AI makes building cheap, so coders get prototypes fast, but a pile of working prototypes is not a game.
Taste and design are now the scarce part.

| # | picture | caption (en, draft) | role |
|---|---|---|---|
| 1 | Toko at the desk; prototype after prototype pops out of the monitor as little clay game boxes, ten of them, stacking up. | Ten prototypes / in a [week]. | setup |
| 2 | He plays each for a second and drops it in a crate: they all work, and none is fun. | All of them [work]. | evidence |
| 3 | He picks one, turns it over, cuts half of it off with a clay knife, and it lights up. | One is [fun]. | evidence |
| 4 | The crate of nine, the one on the desk. | Making is cheap now. / Knowing what to make [isn't]. | punchline |
| card | WE BUILD FAST. / WE STILL DECIDE WHAT. | — | — |

## Film 3 · Five Is the New Fifty (studio, ~22 s)

**Argument:** with AI tools, a very small team can ship what used to need a much bigger one, so the multiplier is
people with judgement, not headcount. It is shown as scale, with no numbers.

| # | picture | caption (en, draft) | role |
|---|---|---|---|
| 1 | Pull back from Toko's desk: one desk, then five Tokos in carrier colours, each at a desk. | Five people. | setup |
| 2 | Behind them the wall of the room falls away like a set flat, and a ghost hall of fifty empty desks recedes into fog. | The work of a much / bigger [team]. | evidence |
| 3 | The five ship: a cardboard cabinet rolls out of the door, and the ghost desks fade. | The tools do the [typing]. | evidence |
| 4 | The five, looking at the one cabinet. | The five do the [deciding]. | punchline |
| card | SMALL TEAMS. / BIG DECISIONS. | — | — |

If a number is wanted here, it has to be the dated GDC one with the primary opened, and it would replace caption 2.

## Film 4 · Prototype First (studio, ~22 s)

**Argument:** when a prototype is cheap, the big studio's order flips: build it first, then plan around what's fun,
instead of planning for a year and building last.

| # | picture | caption (en, draft) | role |
|---|---|---|---|
| 1 | A tall paper org chart on the whiteboard, a design document as thick as a brick on top of it. | The big-studio [way]: | setup |
| 2 | Toko builds a small playable thing in a day; the chart's boxes peel off the board and gather round it. | Plan for a year. / Build [last]. | evidence |
| 3 | The chart re-forms as a ring round the prototype, everyone expanding on it. | Now: build it [first]. | evidence |
| 4 | The brick document becomes the doorstop. | Then plan around / what's [fun]. | punchline |
| card | BUILD IT. / THEN DECIDE. | — | — |

## GLH interstitials (4–6 s stings, from each film's own frames)

The same masters, cut from the clean (captionless) render, with a one-line card in the GLH lower-third style:

| film | sting | length |
|---|---|---|
| 1 | dusk to night to dawn in three cuts on the bench, ending on *One more change?* | 5 s |
| 2 | the stack of ten prototype boxes topples into the crate | 4 s |
| 3 | the wall falls away onto the ghost hall | 5 s |
| 4 | the chart's boxes peel off and ring the prototype | 5 s |

Each is exported by `render.mjs --from/--to` on the film's frames (no captions: `captions = false` is a page query,
to be added as `?clean=1`), with the GLH's own sound bed. That waits until GLH's format is settled (task 64).

## Production order

1. **One More Loop** first. It builds the park, the drones and the phone UI, and it sets the card that the other
   three reuse.
2. **The studio set**, built once for films 2–4, with a look still approved before any of them is animated.
3. **Needs a Designer**, **Five Is the New Fifty**, **Prototype First**, in that order. The puppet count goes up
   film by film, and the clipping probe (`__film.clip(t)`, Welcome Home's) gets wired in from film 3.

## Risks

- **"All developers use AI" is not true as stated.** The set never says it; the GDC numbers say a third use it and
  half say it hurts. The films show one way of working, not everybody's.
- **The drones.** They must stay ambient: no target, no action, no insignia, nobody's. If they read as a claim,
  remove them.
- **Render cost.** A park with trees, fog and DoF is heavier than the kitchen: stills first; trees are instanced.
- **Toko's register.** The captions are plain and the card is Toko's all-caps voice. The owner approves the card
  wording; it is the one place the set has an opinion.
- **Finnish and Japanese** are drafts until a native read, as in every film.
