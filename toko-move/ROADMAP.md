# Toko Move — roadmap after v2.36

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

**Weather SHIPPED v2.49** (clear, rain, fog, first snow, frost — each a look
and a lever; VERSIONS.md v2.49 has the measurements). Still open under this
heading: the courier seen walking along the street, tram badges with a shape,
and the shift replay as a poster.

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
