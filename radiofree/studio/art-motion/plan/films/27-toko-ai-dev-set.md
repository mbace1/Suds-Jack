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

## Film 1, built (v1, 23 Oct)

- **Files:** `clay/loop/` (`film.html`, `film.js`, `copy.json`, `score.py`). It reuses Welcome Home's kit through `../welcome/lib/`, the
  way Backup Mode does.
- **Preview:** `previews/23-10-Toko-One-More-Loop-en.mp4`, 25.7 s. Toko's rule applies: no sign-off and no bug.
- **Build:** pipeline PASSED, 96 pass, 4 warn, 0 fail (fi and ja are unread; two Japanese sidecars run 0.1–0.5 s short),
  −13.7 LUFS, −2.8 dBTP.
- **Look, iterated four times on stills before the render:**
  1. The phone was placed in the wrong frame: it sat at lap height, and the over-the-shoulder shot looked at the gravel.
  2. A true point-of-view shot is impossible here, because the face is only ~10 cm from the phone, so the camera ended up
     inside the mask.
  3. The over-the-shoulder camera is therefore set 11 cm to his right of the phone's sight line, which is what clears the
     mask. The hood's strings are hidden for that shot only.
  4. The phone light was moved toward the face so it lights the mask and not the gloves round the screen.
  5. The lamp post was moved into frame 0.
  6. The phone's clock is drawn at 40 px so the night reads in three jumps.
- **Known, for v2:**
  - In round one of shot 2 the "One more change?" chip sits at the very bottom edge of the frame.
  - In round three the phone's clock rides up under the caption as he taps.
  - The fix for both is aiming the over-the-shoulder camera from the phone's centre rather than above it.
- **Score:** lo-fi night at 84 BPM in F (`LOFI` in `score.py`). The phone's chiptune and chimes are the only electronic
  sounds. Crickets until dawn, then birds. The drones are faint filtered whirs. The card opens on `logo_toko`, the blink,
  over a held Fmaj9.

## Film 3: Five Is the New Fifty (26 Oct)

The owner said yes on 26 Oct: "Work out the details, look for news on similar topics". This section replaces the draft
above. There is no build and no render yet; stills come first, in the studio set (`clay/studio/set.js`).

**Argument:** with AI tools, a team of five ships what used to fill a floor. The headcount shrinks, but the deciding
doesn't. "Fifty" is the title's figure of speech, never a number on screen. The film is observed, not reported, so it
carries no number at all (set rule, line 30).

### The news around it (26 Oct)

All of these come from search summaries only. WebFetch could not reach gdconf.com, businesswire.com or
mobilegamer.biz, so none of the primaries were opened. None is used on screen.

| # | date | outlet | claim | use |
|---|---|---|---|---|
| 1 | 29 Jan 2026 | GDC State of the Game Industry, press release on BusinessWire; also GameDiscoverCo's Substack, GamesBeat and Outlook Respawn | Over 2,300 respondents. **28%** were laid off in the past two years (33% in the US); **two-thirds** of AAA respondents report layoffs at their company, against a third at indie studios; **36%** use generative AI in their work; **52%** say it harms the industry (30% the year before); 7% call it positive. One Substack summary says 52% use AI, which contradicts its own header, so the primary must be opened. | Background. Its numbers are allowed on screen once the primary is opened, but not yet. https://www.businesswire.com/news/home/20260129438528/en/ · https://gamesbeat.com/state-of-game-industry-survey-sheds-light-on-layoffs-genai-views-unionization-and-tariffs-gdc-survey/ |
| 2 | Aug 2026 | Gamescom Dev Speaker Survey (100 conference speakers), reported by GamesBeat, PocketGamer.biz and Game Developer | **33%** expect AI to make teams smaller; 36% expect it to change roles instead; 14% expect more output per person; **37%** call smaller teams the biggest opportunity of the next three years. Caveat: the respondents are speakers, not a random sample, and these are expectations, not measurements. | **Used in the POST COPY only (owner, 26 Oct), attributed; never on screen.** SEARCH-SUMMARY ONLY: the primary was not opened. Live line: "In Gamescom's 2026 survey of its developer speakers, a third expect AI to make teams smaller." https://gamesbeat.com/game-devs-focus-on-ai-smaller-teams-and-leadership-gamescom-dev-survey/ · https://pocketgamer.biz/gamescom-dev-survey-puts-ai-and-smaller-teams-at-centre-of-industry-change |
| 3 | 14 Jan 2026 (SEC filing) | Playtika; reported by Insider Gaming, mobilegamer.biz and CTech | About 15% of staff cut (450–525 people, sources differ) at a cost of $12–15M. The CEO's memo, as reported, describes moving away from headcount-heavy operations toward streamlined teams powered by AI and automation. | Context only: a real company, so it is not named in the film. https://insider-gaming.com/mobile-developer-playtika-holds-mass-layoffs-will-leverage-ai/ · https://www.calcalistech.com/ctechnews/article/skmtlvlr11x |
| 4 | Apr 2026 | Bloomberg Opinion (Dave Lee), on PitchBook data, syndicated by Advisor Perspectives | Average headcount of companies that became unicorns: 1,128 (2023), 544 (2025), 323 (2026 so far); 172 in the US. The column argues AI productivity is **not** the main driver; venture dynamics and AI hype are. | It gives the film a fair counterweight: the shrink is real, but the cause is argued. https://www.advisorperspectives.com/articles/2026/04/18/tech-unicorn-mix-workers-ai-hype |
| 5 | Mar 2026 | cinevva.com roundup | Solo developers shipping games built with AI coding agents, e.g. a bullet-hell platformer said to have shipped in 10 days with eight parallel agents. No sales figures are given. | Atmosphere only. It is a single trade blog and the product names are AI-specific, so it is not on screen. https://app.cinevva.com/news/2026-03-22-solo-devs-shipping-games-with-ai |
| 6 | Jul 2026 | trade reports (search summary) | Microsoft reportedly cut ~3,200 more Xbox roles through FY27 and parted with four studios; Take-Two reportedly dissolved its AI department in a restructuring. | Context. Unverified, and not for screen. |

**What the news says, honestly:** layoffs are documented (GDC, Playtika). That AI makes teams smaller is mostly an
**expectation** (Gamescom) and a **company's stated aim** (Playtika), and the strongest data point (PitchBook) comes with
an argument that AI isn't the main cause. Nothing sourced shows a five-person AI team out-shipping fifty. So the film
shows a way of working, as the set promises, and claims no trend.

### The five

Toko sits at the centre desk, **magenta** as always. The four teammates have the **same face in four carrier colours**
from `STICKER`, one flat each, never mixed. BRAND §2c allows this: the original Toko can be any of the nine carriers,
and other colours carry context. Here the context is "the team".

The plan's line 26 rule says "magenta every time" for Toko himself, and it still holds for him. **The owner approves
the carriers.** The alternative, five magenta Tokos, reads as clones of one man, which argues the wrong thing.

The set is the studio's long desk, extended to fit five (`DESK.x0/x1` widened, chairs re-spaced). The four carriers
reuse Toko's rig and differ only in colour and pose. Hands are the **paddles with no thumbs**, always touching what
they hold (laptop edge, cardboard, mug). The clipping probe (`__film.clip(t)`) is wired in from this film. The window
onto the park stays, with the drones passing as usual.

### Shot table

Grid: 112 BPM (B = 0.536 s). Shots at s1 0, s2 8B, s3 16B, s4 24B, card 30B, end 38B, which is **20.4 s** with the
card. Captions are at the big size, every line within 800 px, and each reads cold.

| # | beats | picture | caption (en) | role | sound |
|---|---|---|---|---|---|
| 1 | s1 | **Frame 0 hook:** a frontal medium-wide shot of five Tokos at one long desk, typing in sync. The keyboards are the beat. Behind them, the back wall is already faintly see-through: grey-blue ghost desks recede into fog. | A team of [five]. | setup | five keyboards on the beat (felt clicks as hats), felt piano, room tone |
| 2 | s2 | **The back wall tips forward and down like a theatre flat** and lands flat on the floor. Behind it is a ghost hall of empty desks and chairs, about fifty, translucent and cold, receding into fog. Each Toko's laptop puts out a cardboard part: a side panel, a screen, a joystick, a coin door, a marquee. | Doing work that / once filled a [floor]. | evidence | a big soft wood thud as the flat lands; a cold reverb hum for the ghost hall; cardboard pops, one per laptop |
| 3 | s3 | The five assemble **one cardboard arcade cabinet** in the middle of the floor, each paddle pressing a part home. The callback gag: the AI on the magenta laptop offers *One more change?* (film 1's chip), Toko shakes his head and closes the lid. In the ghost hall, the monitors **switch off row by row**, back to front. | The tools do / the [typing]. | evidence | cardboard taps; the "one more change?" chime from film 1, then a lid click; a descending run of monitor-off clicks |
| 4 | s4 | All five paddles on the finished cabinet; its marquee lights magenta. The ghost hall fades to nothing. Hold, then ease back to the frame-0 composition with the cabinet gone through the door and the wall standing again, faintly see-through: the next game. | The five do / the [deciding]. | punchline | the cabinet's chiptune jingle; the piano resolves; a door bump |
| card | card | **Toko's card** over the studio, blurred: the badge, then **SMALL TEAMS. / BIG DECISIONS.** and TOKO MIDORI · THE GAME CREATOR. Held at least 4 s. | (card) | — | `logo_toko` blink, a held chord |

**The loop:** the last frame matches frame 0's framing, five at the desk with the ghost wall faint behind them.

**The gags** stay small and readable:
- the wall falling like a flat;
- five laptops putting out five different cardboard parts;
- film 1's "One more change?" refused;
- ghost monitors clicking off row by row.

**GLH sting (5 s):** the wall falls onto the ghost hall, from the clean render.

**Post copy (en, 220 chars, in `clay/fivefifty/copy.json` with fi and ja):** "A team of five, doing work that once filled a
floor. In Gamescom's 2026 survey of its developer speakers, a third expect AI to make teams smaller. The tools do the
typing. The five do the deciding. #gamedev #indiedev #AI". The Gamescom line is row 2: search-summary only, post copy only.

**Risks:**
- **The number of desks.** "Fifty" in the picture is a metaphor. If a viewer reads it as a claim, cut the hall to an
  uncountable fog.
- **Render cost.** Five puppets plus fifty ghost desks. The ghost desks are instanced and unlit (one material, fog),
  and the puppets act on twos.
- **The carriers need the owner's OK.**
- **Finnish and Japanese** are drafts until a native read.

## Revisions, 28 Oct (owner's notes on the finished films 2 and 3)

**Owner:** "Five has the window and desks look on top of each other and it should be clearer, either or." "Needs a
designer slogan should be 'Build faster, but don't forget the fun'." "Both have some glitches."

### Five Is the New Fifty v2
- **Either/or.** v1's back wall was 72 % opaque from frame 0, so the park window and the ghost hall showed at once. The
  wall is solid now and the hall exists only while the wall is (partly) out: the studio and its window while the wall
  stands, the empty hall once it has flown out, the window again when it flies back for the card.
- **Glitches found and fixed** (measured with `__film.clip(t)` at 0.05 s, and by eye on full-size frames):
  - When he shut the lid, his paddles held its screen side, which ends up underneath: they sank into the shut laptop
    and vanished, and his arms lay flat across the desk. The paddles now reach over the top and hold the lid's back.
  - They stay on the shut laptop while the box pops up and the sides drop in, then slide back along the sides' outer
    faces to press them home. v1 parked them on the box's top, so a side came down through his forearm (26 cells).
  - Parts popped out of the laptops full size and stood through the lids (17 cells); they now start small and grow.
  - The fly-in arc rose 9 units and swept through laptops and arms; it rises 24 now and drops onto the box.
  - The cabinet's black screen z-fought the lumpy box front and flickered as a black triangle; it stands proud now.
  - Left: one-cell grazes as his right arm brushes the left side panel (12.2–12.45 s). That is contact, not a clip.

### Needs a Designer v2
- **The card:** BUILD FASTER, / BUT DON'T FORGET THE FUN. (fi RAKENNA NOPEAMMIN, / MUTTA ÄLÄ UNOHDA HAUSKUUTTA.;
  ja もっと速く作ろう。/ でも、楽しさを忘れずに。). All six lines fit within 760 px; fi and ja still need a native read.
- **Glitches found and fixed:**
  - Box after box came out over the middle of the lid's top edge, which is right in front of his mask, so they crossed
    his face. They now come out small from behind the lid's right edge and arc away to the stack.
  - The keeper lifted before his paddles reached it and floated beside his face. The paddles reach it first now, and
    it waits on the desk beside the laptop on his side (v1 had it in front of the lid, so the lift had to hop it).
  - In shot 4 the box sat so far to the side that his arm stretched like a noodle; it rests nearer now.
