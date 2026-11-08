# Toko Move — roadmap after v2.36

## Owner direction, 2026-11-06 — more art, more scenarios, a polished board

*"We need to add lots more art and scenarios in these styles and the tip
down view can use some polish. The trailer is great way to communicate
progress."*

The plan reads this as three things. First, more of the minimal-metro look:
the iso stop, the close interiors and the flat-vector people. Second, more
situations to put in it. Third, the board between moments ("the top down
view") brought up to the scenes. Every step ends in a re-filmed trailer
(`tools/film3.cjs`), because that is how progress is shown.

1. ~~**v3.8 · The board, polished.**~~ Shipped in v3.8 (and the district names moved where the places are). Six changes, on Day, Night and Snow:
   - The sea is filled. The board only stroked the coastline, so a harbour
     read as blue tubes. The sea is now solved from the coastline, as the
     bible's stills already do, and drawn with a shore.
   - The real streets and the district names go under the lines.
   - The network is quiet. The line you ride is bold and inked behind you
     as you go.
   - The landmarks appear on the board.
   - The pill is bigger and carries the line number.
   - The camera eases between hops instead of cutting.
2. ~~**v3.9 · Scenarios in the scene.**~~ Shipped in v3.9: sixteen stop actors (`make_actors.py`) and nine walking pictures on the board (`js/vignettes.js`). A card's subject appears in the scene
   it is played in: the gull on the parcel, the lady at the crossing, the
   tourist and the map, the busker, the choir, the inspector, the dog and
   the rest. Each one is a flat-vector cutout in the people's style
   (featureless faces, tapered limbs) on one layer that comes and goes with
   its card.
3. ~~**v3.10 · More places.**~~ Shipped in v3.10: a landmark for all 23 places (`make_places.py`), snow and puddles on the stop. Autumn leaves wait for a season the game does not have yet. Landmarks for more stations than today's twelve,
   and weather on the scene: snow on the shelter roof, puddles and autumn
   leaves.
4. ~~**v3.11 · More interiors.**~~ Shipped in v3.11 without the key, every
   car derived from the shipped plate (`make_cars.py`): the metro by day
   with a tunnel window, a rush-hour car (tram and metro), the empty car for
   the humming card. The window carries the weather (`make_windows.py`), and
   the night window's rain falls one way. Generated plates would still add
   new compositions; that waits for the key.
5. ~~**v3.12 · The owner's art.**~~ The code-drawn window views were
   dropped on the owner's word (*"Forget your art designs, I will get u a
   PR"*). Shipped in v3.12 instead: all 21 approved scenes of PR #632 as
   moments of the job (handovers, tram stops, the Kalasatama platform, the
   stairs down), each at its place where it has one.
   v3.13 added the next approvals: the cards' own scenes (the tourist, the
   sealed parcel, the saved seat), the crossing as the consequence of
   helping, and the snow. Held for the owner: the wallet (no journey card)
   and the demonstration (its cause is a new proposal).
6. ~~**v3.14 · Missions, the wallet, roguelike runs.**~~ Shipped: four
   three-job missions across real places, each event with its art; the
   wallet as a two-button choice card with a callback; a version per seed,
   strikes, a perk draft between jobs, and unlocks (missions and perks).
   Next: more missions as art lands (one per approved scene set), a mission
   that strings the sealed parcel and the race, and the perks on the runs
   too if the owner wants them there (it would move the measured bands).
   v3.15: forks (two errands on one card), THE STICKER (the race and the
   sealed parcel) and THE LAST TRAM (the night, its events those with art). Further packs land the same way: the
   approved crops as they are, at the beat they draw.

Next, proposed 2026-11-08 (owner: *"Plan next steps and show me trailer"*):

**Owner's answers, same day:** the march goes in, *"for central lines,
especially around Mannerheimintie"*; perks and modifiers go on *"all runs …
test all, plan to fit the design"*; and the build is played on the Suds Jack
cabinet, not uploaded to itch. ~~**v3.16 · The march, and the roguelike on
every run.**~~ Shipped: the march holds the 1, 2, 4 and 10 by the Parliament
House (MEDIUM every other shift, HARD when its halt is central); every run
drafts perks, deals one fork and counts strikes, with HARD's clock and
NIGHT's strikes refitted so the ladder keeps its shape. The list below moves
up by one.

7. ~~**v3.17 · Missions on the board.**~~ Shipped in v3.17 (the map on the title card, a tap on a pin plays it). The mission list becomes the map:
   each mission's start is a pin at its real place, done ones stamped with
   their best, the next one open and pulsing. No new art; the board and the
   pins are what exists.
8. ~~**v3.17 · The daily mission.**~~ Shipped in v3.17 as TODAY'S ERRAND (`?errand`). One mission a day, seeded from the date
   (the daily shift's rule), its perk pool fixed, a share line with the
   strikes and the build. Cheap and social, and it gives the six missions a
   reason to be replayed.
9. **v3.18 · The next approved pack.** Whatever PR #632's successors
   approve becomes moments first, then a mission built from them, as v3.14
   and v3.15 did. Two decisions are the owner's and wait for him: the
   demonstration as a halt cause, and perks on the main runs (it would move
   the measured bands).
10. **Store refresh.** The trailer, stills and itch text brought up to the
    missions. The upload, a real-phone pass and a native Finnish read stay
    the owner's.

**Owner, 2026-11-08, on v3.17:** *"The traveling on a tram visual is a great one
and should be used more … The waiting on a stop visual is great but needs lots of
improvement and polish … We need 3 options at every choice. 2 regular and 3rd can
sometimes be special or very special. This same lower third look, should be used
in menus and the intro screen."*

11. ~~**v3.18 · Three at every choice, and the menus wear the card.**~~ Shipped.
12. **v3.19 · The ride, longer.** The tram interior as the stage for a longer
    stretch of travel: the ride held, more aboard (cards, the people moving),
    choices made riding; and the courier's neck mended (Toko's head sits left
    of the neck in the interior layers).
13. **v3.20 · The stop, polished** toward the approved illustrations, with what
    the repo holds (no new art invented).

Each step is measured, gated and deployed, and the trailer is re-filmed with
what changed.

## Owner direction, 2026-11-02 — the card journey (v3.0)

*"We need more of the new design, less of the old map with visible trams on a
realistic schedule. The new art bibles is what we are going from as an
experience and occasionally you should feel like the trams have some realism
but it's less actual schedule, more curated narrative roguelike with fun
choices and minimalistic visuals."* Signed off as turn-based card hops, the
scenes as the main view with the board between moments, and a slim job strip.

v3.0 shipped the frame of it, and v3.1 shipped Act 1's content (`ACT1.md`):
36 Helsinki cards by tone, stakes with the odds in words, euros, buyers and
what the parcels held, the weather, six tram models (look only), and
landmarks at twelve key stations. The bare address is the card journey
(`js/journey.js` + `js/play.js`); the real-time game is `?classic`.

### Act 1 to ship — the plan (owner, 2026-11-03: *"keep going with upgrading through a plan"*)

The owner's Act 1 note put feel first: *"Making the visual layers have smooth
animations will add to the appeal. UI animations and effects will be a big
polish issue for shipping the Helsinki act."* So the order is feel, then
character, then the modes, then the store. One version per step, each measured
and gated, each deployed before the next starts.

1. ~~**The cabinet cover from the v3.1 scenes.**~~ Done 2026-11-03: the
   arcade's `tramstop` marquee is the Kauppatori stop as the game draws it.
2. ~~**v3.2 · Sound for the journey.**~~ Shipped in v3.2. The journey is silent; only `?classic`
   has the kit. The same house kit (synthesised, one master gain, the same
   kept mute): a tram bell when it pulls in, the ride, a card dealt, the
   stamp, euros counting up, a risk landing or not, a sale, the museum tram,
   quiet weather beds (rain, snow wind, night), and the end of a run.
3. ~~**v3.3 · The old trams from inside.**~~ Shipped in v3.3. One interior serves all six models
   today; Nr I, Nr II and the museum tram get their own (wood, brass, the
   bell rope), the newer ones share theirs. Look only, like the outside.
4. ~~**v3.4 · Story arcs.**~~ Shipped in v3.4 (Dispatch, the 1987 ticket and three in-run callbacks; the Other Courier and the Retired Number wait for v3.5's rival). The itch bible's CARDS.md arcs (Same Morning, the
   Inspector, the Other Courier, the Retired Number, the Dispatch arc): a card
   that comes back later in the same run and remembers what you chose. The
   character and the funny moments live here.
5. ~~**v3.5 · The rival, the regulars and the sealed parcel on the journey.**~~ Shipped in v3.5.
   Run modifiers, so each adds a card and never a screen.
6. ~~**v3.6 · The daily and the week as journeys.**~~ Shipped in v3.6. Today they open the
   real-time game.
7. ~~**v3.7 · The ship bar on the journey, and the store pass.**~~ Shipped in v3.7 (`test/ship3.cjs`, `tools/stills3.cjs`, `store/ITCH.md`). Act 1 is ready for itch; the upload, the rent (€400 or €500: VERSIONS.md v3.7 has the numbers), the itch page URL and a real-phone pass are the owner's. `ship.cjs`'s
   S1–S7 re-run against the journey (a whole run by tapping, leaving
   mid-run, hostile storage, landscape and 320px, frame cost, sound and mute,
   credits), then the store copy, stills and cover re-shot from v3. Then Act 1
   is ready for itch — the upload stays the owner's.

After the plan (2026-11-06): **the trailer.** `tools/film3.cjs` films the
journey from the store build with its own sound, in 9:16 and 16:9.
`store/ITCH.md` says which cut goes where.

## Owner direction, 2026-10-24 — publish Toko Move first; Piritori is its spin-off

*"Toko Move is the thing we publish first and then Piritori is a spin-off that
becomes the bigger game. I have Toko Move approved in my contract but not
Piritori, so it has to be Toko Move: Piritori and then we rebrand."* And on
the first draft of the order: *"Toko Move has none of Piritori assets. It's a
simple transportation simulator game with missions"*; *"We are looking at
platform publishing like itch.io"*. (Supersedes the 2026-10-23 draft and the
2026-09-27 "two modes" note.)

### The release order

1. **Toko Move** — published first, on itch.io, under the title the contract
   approves. A transport simulator with missions on the real Helsinki network.
   **It carries nothing of Piritori**: no characters, art, name, door or code.
2. **Toko Move: Piritori** — the spin-off, published under the approved title
   as its own itch.io project with its own adult-content rating. Built in its
   own lane (`mbace1/piritori-eden`); Piritori's canon stands untouched —
   separate products sharing only the neutral city engine (`flow-core`).
3. **Piritori** — the rebrand, once the spin-off has outgrown the name; it
   becomes the bigger title and the top of the publisher page. Toko Move stays
   published and maintained beside it.

Two things to settle outside the code before step 2: that the contract's
approval of *Toko Move* covers a spin-off of this kind under that name, and
the spin-off's itch.io URL — give it a neutral slug (`…/piritori`) from day
one so the rebrand changes a title, not an address.

### Toko Move's road to the store — milestones

**M1 · Current network + the rival fix (v2.64, 2026-10-24).** The feed the
nightly refresh has validated since; the rival no longer loses his walk to a
race abandoned a tick later. `tools/fingerprint.mjs` makes every future
adoption one command.

**M2 · The store build (v2.64).** One shipping tree, two places it is
published. `js/platform.js` is the seam: a packaged build declares
`TOKO_PLATFORM` and the game then shares the STORE PAGE rather than the frame
it is playing in, and leaves out the playtest test card.
`tools/package-itch.mjs` builds the upload — `toko-move/` beside the parts of
`flow-core/` it imports, a root `index.html` that steps into it, no arcade
HOME button, no tests or tools — refuses any path that would reach outside the
package, and zips it. `test/itch.cjs` unzips that file, serves it ALONE, and
plays a shift through it.

**M3 · The store page kit.** `store/ITCH.md` (title, short and long
description, controls, tags, credits, embed settings); the Crown Bridges film
(`tools/film.cjs`) as the trailer; stills from the same harness.
*Done in v2.65:* `tools/stills.cjs` renders six phone stills and the 630×500
cover from the store build (dispatch, a lit catch, tram 12 over the Crown
Bridge, an event card, the week's rent, the daily result).

**M4 · First minutes for a stranger.** Until now every player had the arcade
around them and a test card telling them what to try. A store player arrives
cold: the first shift has to teach the loop — take a job, catch a tram, get
off, deliver — without a page of text. Measure it (the shift bot's "naive"
player and a timed first-delivery) before building it.
*Done in v2.65:* `test/stranger.cjs` taps only what lights. It finished every
shift already, so nothing was built that the measurement did not ask for; it
found four things a stranger reads wrong (a quoted plan missing from the catch
board — shift 1's first delivery 29 → 9.7 min — a stale "nothing to catch",
"get off here" at the boarding stop, LIVE on the store title) and holds all
four.

**The ship bar (v2.67, owner: "a shippable Toko Move before considering
itch.io").** Before the store, the game has to survive what a stranger's phone
does to it. Seven items, each measured before it was fixed, held by
`test/ship.cjs`:
S1 the whole week plays by tapping, Monday to the rent, with memory flat ·
S2 leaving mid-shift pauses and says so · S3 storage that throws, and saves
in the wrong shape · S4 phone landscape and 320px phones · S5 frame cost
(measured; headless cannot speak for a phone GPU, so M6 confirms it) ·
S6 sound with a kept mute · S7 credits in the game. What the bar does NOT
claim: that the game is fun enough to sell — that is a playtest, and the
owner's call.

**M5 · Language.** Finnish and English at least, the arcade's house
convention (fi/en/ja) as the target; Toko Move is English-only today.
*Done in v2.66 for Finnish:* `js/lang.js` translates at the DOM, `test/lang.cjs`
plays in Finnish and fails on any English left. Needs a native read; Japanese
not started.

**M6 · LIVE on a real phone.** LIVE has never met HSL's broker from here; it
needs the owner's phone (or a network that reaches `mqtt.hsl.fi`) before a
store page may name it.

**M7 · 1.0 on itch.io.** Owner uploads the M2 zip (or `butler` with the
owner's key — not available here), embed 405×720 with fullscreen, mobile
friendly, the M3 page. Every later release: the same package script, the same
gate, `VERSIONS.md` as the changelog.

Owner actions outside the code: the GitHub Actions setting so the nightly
network refresh opens its own PR; the phone pass on the test card; the
itch.io account and page.

The kids' mode stays withdrawn (2026-09-27).


Owner direction, 2026-09-17, in their words: *"Disruptions is good, feels like
roguelike random events type deal. Maybe we need more random events, help the
granny across the street (10 sec delay), etc. Hand offs is good. Regulars is
good. Local knowledge is good. Streaks and combos is good. Rival is great,
events is great. Ferry might work. Next we should also look at the competition
and draw from them a bit. Maybe roguelikes too."*

Rejected or unmentioned from the same list, so not on this roadmap: city bikes,
full trams, doors-closing drama, interchange sprint.


## UI direction (owner, 2026-09-17, same day): *"make the UI feel a bit more
## fun, approachable, and simplistic. The Mini Metro and Motorways are succinct
## experiences."*

So the UI pass comes BEFORE the event deck and the deck is built in its
language. What "succinct" means here, concretely:
- **No ticks on screen.** `~145t` and `deadline 337t` are a dev unit leaking
  into the game; the clock is 07:04, so everything is minutes: *in 3 min*,
  *~4 min*, a deadline ring. Ticks stay in the engine and the tests.
- **Shapes before words.** A boarding option is the line's own badge (the
  same one on the map) → destination · *now* / *in 3 min* · price. Lit means
  tap. No heading sentence, no DIRECT/VIA — a transfer is two badges.
- **One sentence of guidance, on job one, then none.**
- **The HUD is three glyphs**: the clock, deliveries as dots (●●○), the
  current job's deadline as a ring around its cargo icon. No labels.
- **The feed goes on a phone**; the map and the one card say it.
- **The map is the hero** and grows as the sheet shrinks.
- **An event is a face, one line, two big buttons priced in seconds.**

## What the references say (read from memory — Steam, Wikipedia and the press
## are blocked from the build sandbox, so this is a designer's recall, not a
## fetch; Trafficity itself is still unread)

- **80 Days (inkle)** is the closest cousin: travel on real routes, and every
  stop can hand you a short text event with two or three options that cost
  the run's own currencies (time, money, health). The lesson is the SHAPE — an
  event is two lines and a choice with a price in ticks, never a paragraph.
- **Slay the Spire's `?` rooms**: one of three options, asymmetric
  risk/reward, and some are traps you can walk past. The lesson: every event
  needs an option that costs nothing so refusing is always possible, and one
  that is better than it looks.
- **FTL's blue options**: a choice that only exists because you carry the
  right thing. Here that is CARGO — a hot lunch can be handed to the hungry
  busker for goodwill, a fragile parcel means you cannot run for the doors,
  documents mean the inspector waves you through. This is the best fit in the
  list, because the cargo rules already exist and do almost nothing.
- **Curious Expedition**: helping people costs the one resource you are short
  of. Here the resource is ticks; the granny is ten seconds.
- **Death Stranding**: recipients are people with names who rate you and ask
  for you again. That is Regulars.
- **Crazy Taxi**: chaining fares extends the clock and there is one rival on
  the road. That is Streaks and the Rival.
- **Paperboy** (in this repo): deliveries along a route you are already on —
  built as ON YOUR WAY in v2.36. Its other half, obstacles on the route, is
  what walking events are.
- **Mini Metro / Mini Motorways**: readable at a glance, no text. The
  counterweight to all of the above: an event panel must be as scannable as
  the catch panel or it will be dismissed unread.

## The systems, in build order

Every one is measured with `test/shifts.cjs` before it ships, and the floor
holds: random-but-sane bots ≥ 40%, the cheapest-job bot wins.

### 1. Events — the roguelike deck — SHIPPED v2.38 (seven encounters, three disruptions; goodwill accrues and nothing spends it yet)
`data/events.js`: a deck of short cards, each `{ id, where, when, text,
options }`. `where` is `stop | aboard | walking`; `when` is a tick window and
a weight; every option is `{ label, cost: {ticks, score}, needs: cargo|drop|
streak, then }`. Drawn from the SHIFT SEED (hash of index and tick bucket),
never rolled, so a shift replays and the bot can play them. Two kinds:
- **Disruptions** — no choice, a fact on the feed and the board: *6 not
  running past Hakaniemi for 8 minutes*, *metro halted at Kamppi*, *tram stuck
  behind a car on Mannerheimintie (+40t on line 4/10)*. Implemented as a
  temporary hold on a layer's vehicles (phase frozen) or a closed stop; the
  catch panel and the estimator read it, so the plan visibly goes wrong.
- **Encounters** — a choice: the granny at the crossing (help: 100t, +goodwill;
  don't: nothing), a tourist with a map (help: 60t and you learn a shortcut —
  ties to Local knowledge), the ticket inspector (documents cargo: waved
  through; else 80t), a dropped wallet, a busker (hot food cargo: give it, lose
  the job, big goodwill), a friend on the tram (talk: miss your stop unless
  you tap), a stroller on the tram steps (help: 30t, +goodwill).
Budget: at most three encounters and one disruption per shift; total event
cost capped so a run of bad luck stays winnable (measured).

### 2. Streaks and combos — SHIPPED v2.39
On-time chain multiplier on score, a "no missed connection" bonus, a
"clean shift" bonus, shown live on the HUD (`×2` next to the score) so a
streak is a thing you protect. Best shift kept in `localStorage` and on the
end screen. Cheapest item on the list.

### 3. Hand-offs — SHIPPED v2.39
Deliver to B and the recipient hands you a job to C on the doorstep — no
dispatch screen, no waiting for an offer. The campaign chain in `JOBS` already
authors ten of these; a procedural one is the current destination as origin,
priced by the same estimator. Offered on the arrival card, one tap.

### 4. Regulars — SHIPPED v2.39 (six people, standing across shifts, goodwill spent here)
Six named recipients at fixed stops (the florist at Ooppera, the print shop in
Kallio, the harbour office…). A regular's job pays a tip that grows with how
often you have been on time for them, remembered across shifts
(`localStorage`). They appear in dispatch with their name and your standing.
Goodwill from encounters feeds the same number.

### 5. Local knowledge — SHIPPED v2.40 (visited STOPS, not streets — see VERSIONS.md for why the obvious rule is inert)
A walking street appears on the board only after you have walked it, or a
tourist showed you. The known map is persisted; a new player sees hubs and
lines, a tenth-shift player sees the shortcuts. Events 1 and 4 both write to it.

### 6. Rival — SHIPPED v2.40
One AI courier on the board, drawn like you in another colour, running the
bot's cheapest-job policy off the same dispatch. A job the rival takes first
is gone. Visible on the map and in the end screen (*the rival delivered 4*).
The shift bot already IS this courier.

### 7. City events — SHIPPED v2.42 (four days, one per shift, named on the title card)
The disruption system with a face on it. Four days, each riding a lever that
already existed and none of them a new mechanic: MATCH DAY (the Töölö trams
crawl), MARKET MORNING (more drops, and a premium in the Hakaniemi quarter),
HELSINKI DAY (a wider event deck, double goodwill), QUIET SUNDAY (a third of
the trams gone, walking quicker). The shift also got a NUMBER — random per
visit, pinned by `?shift=N` — because every shift before this drew the same
deck from the same hardcoded seed 7.

### 8. Ferry — CLOSED, the pack has no ferry
The condition was "only if the pack carries the Suomenlinna ferry as a layer".
It does not: `cities/helsinki.json` holds 34 lines, 30 TRAM and 4 SUBWAY, and
no FERRY of any kind. So there is nothing to build a set piece on without
authoring a service the city does not run, which is the one thing this project
does not do with HSL data. Reopen only if the pack is rebuilt from a feed that
includes the ferry.

## Exit for the roadmap
A shift where something happened that was not the timetable — measured as
"events seen per shift" > 0 in the bot and, the real exit, the owner playing
one on a phone and naming what they would keep.

---

# NEXT LEVEL — proposed 2026-09-23, not yet picked

Owner, 2026-09-23: *"For visual and systems updates.. let's take leaps as a
game and think next level."* Everything above shipped; this is what a leap
looks like from here. Ordered by how much of the game each one turns on, not
by size. Nothing below is started.

**Where the game is.** One five-minute shift on the real network, with jobs,
drops, an event deck, four city days, a rival, parcels with a size, regulars
with a standing, a map you learn. It is a good loop and it is ONE loop: press
again and you get the same jobs on a different day. Every system below is
built and measured; what none of them has is somewhere to GO.

## L1 · The week (the run) — SHIPPED v2.47

`?week`, and a link on the daily's title card. As proposed, with two rules
the proposal did not have: **leaving is clocking out** (a shift is saved as it
goes and a reload closes it with what it had banked), and **a weekday is a
weekday** (the week draws its own deck — two ordinary days, a match, a market,
the city's day — so no Tuesday is a quiet Sunday). Standing belongs to the
week; visited stops stay the player's. Rent is measured in VERSIONS.md v2.47.

*The proposal, as written:*

Five shifts, Monday to Friday, one run. A day drawn for each. Money instead of
score, and **rent due on Friday**: the run is won or lost at the end of the
week, not the end of the shift. Between shifts you keep your standing, your
known stops and your money, and lose your streak.

This is the leap because it makes every existing system COMPOUND instead of
reset: a regular is worth cultivating on Monday for Thursday's tip; the map
you learn on Tuesday is the map you walk on Sunday; a bad Wednesday is a
Friday problem. Slay the Spire is a run, not a fight. Nothing here is a new
mechanic — it is a save between shifts and a number to beat.

Prerequisite: **jobs vary by shift** (v2.42 deliberately left them fixed). A
week of identical dispatch is not a week.

## L2 · Kit (the choice between shifts) — SHIPPED v2.48

Six items, each priced by measurement at €16–52 a week, rent re-measured to
€400. Three of the proposal's items were built and CUT — the bike, the wrap
(and the thermos) bend levers the game almost never pulls, so each measured
under €7; VERSIONS.md v2.48 has the table and `kit.js` the reason.

*The proposal, as written:*

Monday night, pick one of three. Each is a knob on a lever that already
exists, so each is a day's work and a bot can measure it:

| kit | rides |
|---|---|
| a bigger bag (capacity 5 → 7) | `parcels.CAPACITY` |
| a bike (walking ×0.6) | `walkCost` |
| a thermos (hot food cools slower) | `CARGO.freshness` |
| a radio (disruptions announced a minute early) | `EventDirector` |
| a friend at HSL (see tomorrow's day tonight) | `drawCityEvent` |
| a season ticket (transfers cost nothing) | `planEstimate` |

FTL's blue options, StS's relics. The rule from the ascension ladder holds:
no kit may add a verb, only bend a number the player already reads.

## L3 · The daily shift (cheap, social) — SHIPPED v2.45

`?shift=N` already pins a shift. Make **today's date the seed**: one shift
number for everyone, one attempt, a share line — *Shift #0923 · 3/3 · 1,842 ·
MARKET MORNING*. Wordle's shape on a game that already has the seed. Two
lines of code and a share button; the biggest reason to come back tomorrow
that this game could have for the least work. Sits under L1 or beside it.

## L4 · Weather, and the map as the hero (visual + systems in one)

**SHIPPED in full.** Weather v2.49 (clear, rain, fog, first snow, frost — each
a look and a lever), tram badges with a shape v2.50, the week as a poster v2.54,
and the courier walking along the real street v2.55 (8 of 17 walks; the rest
leave the OSM street extract and stay straight — see VERSIONS.md v2.55).

The dawn wash exists; a week has five mornings. Rain, fog, first snow, a clear
frost — each is a look AND a lever: rain slows walking, snow slows everything,
and **fog hides badges past 400 m so a known route is the only route**, which
is the first time Local Knowledge would matter on an ordinary day. Drawn in
the night-map register the owner set (grey ground, one blue, the lines carry
the colour): fog is the ground losing contrast with distance, snow is the
streets going pale, rain is the lines gaining a wet highlight. No new assets;
`paintDawn` is already the seam.

Also under this heading, three things the map still does not do that a Mini
Metro map does: the courier should be seen WALKING along the street rather
than standing at either end of it; a tram badge should carry its shape (a
two-cell car, nose first) so the board reads as vehicles before it reads as
labels; and the end-of-shift replay, which already exists in `shiftlog.js`,
should render as one poster you can save — the run's trace on the map, the
day's name, the number.

## L5 · Live HSL (the thing nobody else has)

**SHIPPED v2.56 — built blind, verified only against a mocked broker.** No key
was needed after all: HSL's high-frequency positioning is on an open MQTT
broker. LIVE re-times the timetable fleet from real reports rather than
building a second one; see VERSIONS.md v2.56 for the limits.

**The network moves with the city (v2.57 → v2.62).** The nightly HSL refresh
is how the board stays true: v2.57 took Töölöntori off when HSL stopped
serving it, and v2.62 took the refresh's pack with the Crown Bridge trams
(11, 11H, 12) and Kruunuvuori as a destination. The refresh cannot open its
own PR here (Actions may not create pull requests in this repo), so a
network change still lands by hand from its `automation/toko-move-hsl-*`
branch. v2.63 took the board on to Laajasalo (Yliskylä), where 12 ends.

The pack is real geometry from HSL's own feed; the vehicles on it are a
timetable simulation. HSL publishes real-time positions (Digitransit, needs a
free API key). A **LIVE** mode would put the actual 07:12 tram on the board
and let you courier against the real morning. Two honest caveats: it cannot
be replayed, so it is a mode beside SHIFT and never the gate's subject; and
the sandbox cannot reach HSL (the feed 403s from here), so it is built blind
and verified on a phone. The most next-level idea on this list and the one
with the most unknowns; I would do L1 first and this fifth.

## Recommendation

**L3 this week, L1 next.** The daily shift is an afternoon and it answers
"why would I open this tomorrow" with the systems already built. The week is
the real leap and it is a fortnight: jobs by shift, a save between shifts,
rent, and every bot policy taught to play five days. L2 and L4 then have a
run to live in. L5 waits for a key.

## GitHub, while we are here

Three of these are process leaps and one already happened today.

- **PR previews on Pages.** Every PR that touches a game deploys to
  `/Suds-Jack/preview/<branch>/` for as long as it is open, so a branch can be
  played on a phone before merge. The standing gap in every version log is
  *the owner has not played this on a phone*, and the reason is that playing
  a branch means a deploy. This removes the reason.
- **Screenshots as artifacts.** The six-shot audit (phone and desktop, title,
  dispatch, waiting) attached to every toko-move run and posted on the PR. An
  art change ends in a screenshot, never in a green suite — the rule is
  already in CLAUDE.md, the automation is not.
- **The balance report as a PR comment.** `shifts.cjs` win rate and mean
  score against main, posted automatically, so every gameplay change carries
  its measurement whether or not the author remembered to run it.
- **A refresh that says what changed** — done today (v2.44): the nightly HSL
  refresh had failed for twelve days with an unactionable line, and now prints
  the stop and line names gone and new, and keeps the pack it built.
