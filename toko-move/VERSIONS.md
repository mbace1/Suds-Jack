# Toko Move — versions

## v3.27 — 2026-11-11

**THE PAD ON EVERY SCREEN** — the owner: *"Dualsense with ipad doesn't work."*

- **What was wrong.** The pad reached Toko Move only through its cards: the
  arcade's bridge (`hub/padkeys.js`) turns a pad's buttons into keys, and
  only a card listened to them (v3.20). START SHIFT, the run list, the end
  card and the map answered a tap or a click and nothing else, so with only
  a controller the game could not even be started. On an iPad, a controller
  is often the only thing in your hands.
- **Now** (`play.js`):
  - **The title and the end card**: the d-pad (the bridge's arrow keys,
    `hub/games.js`) walks the screen's buttons and links, lit in yellow;
    cross presses the lit one, or the screen's main button when nothing is
    lit (START SHIFT; NEXT, else AGAIN). A touch puts the light out.
  - **A card**: cross, circle, square are its three buttons as before, and
    each button now wears its pad button while a pad is connected (✕ ○ □ on
    a DualSense, A B X on another pad).
  - **The map**: any face button closes it.
  - Triangle still hurries what is playing; holding Options (Start) still
    goes back to the arcade.
- **Tested without the hardware**: `test/pad.cjs` (new) gives the page a
  DualSense through the browser's own Gamepad API and plays from the title
  to the end card with nothing else: the d-pad lighting the title, cross as
  START SHIFT, ✕ ○ □ on the cards, a whole shift answered, the map closed
  from the pad, cross on the end card going to NEXT. A real iPad and
  DualSense were not available here.
- `test/play.cjs`: the ladder check knows the long shift sits locked beside
  the four runs on a first visit (v3.26).

## v3.26 — 2026-11-11

**THE LONG SHIFT** — the owner's *"the game actually becomes like a roguelike,
and no strict missions are needed"*, as a run: one that does not end until
you do.

- **An endless run** (`runs.js` `LONG`), beside the ladder rather than on it:
  it opens once EASY is done (finishing EASY now says *MEDIUM IS OPEN* and
  *THE LONG SHIFT IS OPEN*), and the ladder is the four runs it was.
  - Jobs keep coming until three late drops or ten o'clock end it (a
    three-hour shift, 07:00–10:00, `shiftMin`).
  - Every job's clock is 6% shorter than the last (`ramp`): about 1.5× the
    best route on the first jobs, 0.9× from the ninth.
  - The day, the area, the drawn perks, the forks and the made cards come as
    on any run; the deck never runs out (made cards fill what the written
    ones lack, 24 a shift).
  - **Stars for how far it went**: one at 5 jobs, two at 10, three at 15,
    struck out or not. Its best is jobs, not euros, and the run list shows it
    (*Until you drop · best 12 jobs*).
- **The screen**: the title says how it ends; the job dots grow with the
  jobs (the last nine, with the count before them) instead of counting down
  to a last one; the end card leads with the jobs, says what ended it and
  how many the next star needs.
- **Measured** (`test/long.mjs`, 60 shifts): the board-reading bot does 12
  jobs on the median (best 16), the tapper 8 (best 13); most shifts end on
  the strikes. So three stars ask for a top-fifth shift.
- In Finnish too (*PITKÄ VUORO*, *Kunnes uuvut*).
- **Gates.**
  - `test/long.mjs` (new, also in CI): not a rung, opened by EASY, the save
    (stars by jobs, best by jobs), it ends both ways, the deck holds, the
    ramp, the measured band.
  - `test/runs.mjs`: finishing EASY opens MEDIUM and the long shift.
  - `test/play.cjs`: the long shift listed and open after EASY, its title in
    English and Finnish, its dots growing with the jobs.

## v3.25 — 2026-11-11

**MORE PARTS** — the owner's *"100x content so it never feels stale"*, taken
further: every part added multiplies the cards the modules make.

- **The modules grow** (`js/modules.js`): 41 people (+15), 32 wants (+12) and
  25 twists (+11), which is **32,800 cards** before the third is drawn,
  against 7,500 in v3.22.
  - **New people:** a sailor on shore leave, a woman in a moose costume, a
    retired opera singer, a man walking three dachshunds, a climber with a
    crash pad, a bride on her way to the church, a nurse home from the
    night shift…
  - **New wants:** on foot, a map held upside down, a flat tyre, eight
    pizza boxes, the way to the public sauna; aboard, the tram doors, the
    crossword's last word, a pickpocket; at the stop, a proposal and a
    dropped ring, a drone over the wires, free ice cream (sun only). For
    NIGHT, two more strange ones: a whistler who keeps pace with the
    streetlights (on foot), and someone at the stop waiting for the tram
    that left an hour ago.
  - **New twists:** a trumpet in an open window, a gull eating a whole
    croissant, a ferry horn, a name day, the ice groaning on the bay (snow),
    a very large moon (night)…
- **The days bring the new ones out**: ice cream on a heatwave, the sauna on
  the first snow, the crossword on a quiet Sunday, the map for the cruise
  ships, the whistler and the last tram under a full moon.
- Every new line is in Finnish. A sample of 3,000 made cards in every
  weather and hour translates whole.
- **Measured** (`test/journey.mjs`, 60 seeds, reader · tapper): EASY 60 · 57,
  MEDIUM 58 · 52, HARD 53 · 34, NIGHT 46 · 28. The ladder holds; NIGHT's two
  new waits cost the reader four shifts in sixty.
- **Gates.**
  - `test/modules.mjs`: at least 40 people, 32 wants and 25 twists, over
    30,000 cards, and every place with its share of wants.
  - `test/journey.mjs`: the regulars check asks that a standing rose, not
    that it is exactly 4 (it reads the shift's end, and a seed may visit the
    same regular twice).
  - `test/play.cjs`: the museum-tram test that names EASY 1197's rides plays
    it `&written`; the Finnish check on a made card's line looks for English
    words left in it, rather than for an ä or ö (*"Tikkaita kantava mies
    katsoo istumapaikkaasi hyvin toiveikkaasti"* has neither).

## v3.24 — 2026-11-09

**THE SHIFT, DRAWN** — the rest of v3.23's step toward the owner's *"like a
roguelike, and no strict missions are needed"*: where a shift goes and what it
can draft are drawn too.

- **Where the drops lean** (`days.js` `AREAS`). Three shifts in five lean
  to one part of the city: the harbour, the centre, Kallio, east of the
  bridge or the west side. A stop there comes up three times as often (on
  HARD, a shift leaning to the harbour sends 61% of its jobs there, against
  31% leaning nowhere). The first card says so, after the day: *PAYDAY · FEES ×1.15 ·
  EVERYONE WANTS IT NOW · DROPS AROUND THE HARBOUR*.
- **Six new perks, all trade-offs** (`missions.js` `PERKS`, `drawn`):
  - **Hustle**: fees ×1.25, every clock shorter;
  - **Take it easy**: clocks a third longer, fees ×0.85;
  - **A borrowed bike**: walking a third quicker, trams later;
  - **Nerve**: a risk lands much more often, clocks shorter;
  - **Charm**: +€3 a drop, a risk lands less often;
  - **A thermos**: +€2 a drop, deadlines a tenth longer.
- **Each shift draws two of the perks it has not unlocked**, and the draft
  offers one as its **special third button** (v3.18's grammar: two regular,
  a special third) while one is left to take; after that the third is the
  cash again. The two regular buttons are the unlocked pool, as before.
  - The first cut put the drawn perks in the regular pool. A player who taps
    the first button then took a trade-off blind, and the tapper bot lost six
    points on MEDIUM and eight on NIGHT. As the special third, a trade-off is
    a choice somebody makes.
- **Missions draw nothing**: their drops and their perks are written.
- `?written` stays the v3.21 shift: no day, no area, no drawn perks.
- **Measured** (`test/journey.mjs`, 60 seeds, reader · tapper): EASY 60 · 56,
  MEDIUM 58 · 51, HARD 54 · 36, NIGHT 50 · 31. HARD's par moves 130 → 140:
  the days' fees and tips put the reader's 70th percentile at 148.
- **Gates.**
  - `test/days.mjs`: the area's share and pull, its line, a day and an area
    sharing it, the six trade-offs (never unlocked, in Finnish), two drawn a
    shift, the draft's special third and then the cash, Hustle's two levers,
    missions drawing nothing.
  - `test/journey.mjs`: a draft's third is the drawn perk or the cash; the
    par check prints every run's 70th percentile.
  - `test/play.cjs`: EASY 7's first card adds *DROPS EAST OF THE BRIDGE*;
    the moments test that names EASY 1003's route plays it `&written`.

## v3.23 — 2026-11-09

**THE DAY, DRAWN** — the next step of the owner's *"randomized from modules, so
the game actually becomes like a roguelike, and no strict missions are
needed"*: a shift is now a draw, not only a ladder step.

- **Every shift draws its day** (`js/days.js`), on top of its run and its
  weather. About two in five are ordinary. The rest:
  - **Helsinki Festival**: tips +€2, fuller trams, the accordion out;
  - **Payday**: fees ×1.15, every clock a little shorter;
  - **A quiet Sunday**: fees ×0.9, clocks ×1.1;
  - **A heatwave** (sun only): walking slower, tips +€1;
  - **The first snow** (snow only): luck +5%, tips +€1;
  - **Two cruise ships in**: fees ×1.05, tourists asking the way;
  - **Derby day**: fuller trams, luck +5%, everyone talking hockey;
  - **A full moon** (NIGHT only): fees ×1.1, luck −5%, the strange ones out.
- **No new rule.** A day only moves the levers the run already has (the fee,
  the clock, the tip, the luck, the walk, the wait) and which made cards come
  up more (`boost`, on modules.js). It is drawn by a hash of the seed, so a
  seed is still one shift, and an ordinary day plays exactly as before.
  A mission is its own day.
- **The first card says it**, above its line: *PAYDAY · FEES ×1.15 · EVERYONE
  WANTS IT NOW*. Only the first. In Finnish too.
- **The play log** notes each shift's day, and the readout says how the
  shifts of each kind of day ended.
- `?written` now also means an ordinary day: the shift exactly as v3.21
  dealt it, for a test or a trailer that names a seed.
- **Measured** (`test/journey.mjs`, 60 seeds, reader · tapper): EASY 60 · 56,
  MEDIUM 59 · 52, HARD 53 · 35, NIGHT 54 · 30. The ladder holds.
- **Gates.**
  - `test/days.mjs` (new, also in CI): the draw against its weights, the
    weather and the hour, an ordinary day identical to no days on every run,
    each lever landing, the boost, the first card only, Finnish, missions.
  - `test/journey.mjs`: the fee checks fold in the day's fee; the arc test
    that names EASY 5 runs on an ordinary day.
  - `test/play.cjs`: the festival on EASY 7's first card, in English and
    Finnish, and on no card after it.

## v3.22 — 2026-11-09

**CARDS MADE FROM MODULES** — the owner: *"game needs more variety, fun
options, etc. There can be 100x content so it never feels stale. These can also
be randomized from modules, so the game actually becomes like a roguelike."*
And: *"Toko face get buried behind map."*

- **Cards made from parts** (`js/modules.js`). A story card is now often put
  together from three parts:
  - **WHO**, somebody at the stop, aboard or on the street (26: a man in a
    Marimekko scarf, a busker with a broken string, a very tall Swede…);
  - **WANT**, what they are doing or need, with two ordinary options and
    three possible thirds (21: a glove on the tracks, the ticket app, a
    speakerphone divorce, the inspectors, the secret courtyard sauna…);
  - **TWIST**, one line of the day around it (14).

  That is over 7,500 cards before the third is drawn, against 46 written
  ones. The third is ordinary three times in five, special about one in
  four, very special one in eight.
- **How a run deals them.** About half the slots in a deck are made, the rest
  written. The written card is still drawn first, so the run's rng and
  everything else in the deck are exactly what they were; the slot is then
  given to a made card by a hash of the seed. The same seed deals the same
  cards. A run's tones, places, weather and hour decide which parts fit:
  NIGHT draws the stranger facing the wrong way, the passenger who asks what
  year it is, the humming at the stop and the footsteps at your pace (three
  new scary wants, so NIGHT stays mostly scary); snow draws somebody
  shivering, never somebody sunbathing.
- **In Finnish too.** Every part is a whole phrase in both languages, joined
  at the same seam, so the Finnish is never inflected across a join
  (`lang.js` `moduleLine` finds a card's line part by part; every button and
  what it says is in the table).
- **Toko's face clear of the map.** On a phone the corner map sat exactly
  where the courier stands at the stop. The map now moves to the other
  corner whenever it would cover the face (`clearFace` in `play.js`). The
  art request (PR #633) asks for the stop redrawn with the face out of the
  top third, every element as its own layer, and people and things as
  cutouts for these cards.
- **Measured** (`test/journey.mjs`, 60 seeds, reader · tapper): EASY 60/60 ·
  60/60, MEDIUM 59 · 54, HARD 54 · 37, NIGHT 55 · 29. The ladder holds; the
  made cards are a little kinder than the written ones, mostly to MEDIUM's
  tapper.
- **Gates.**
  - `test/modules.mjs` (new, also in CI): the count, every part in Finnish,
    the effects vocabulary and its sizes, the same key making the same card,
    the parts fitting the run (night, snow, places), the tiers, every want
    reachable, about half of every deck made, no want twice, whole shifts
    played through them, and the written deck untouched underneath.
  - `test/journey.mjs`: the odds sample is 320 seeds a run (the made cards
    took some of the "long shot" rolls it counted).
  - `test/play.cjs`: a real shift on the phone deals made cards, three
    buttons on screen, its line in Finnish under `?lang=fi`. The tests that
    name a seed for a written card's art (the crush, the tourist, the vappu
    student) add `&written`, which deals the written deck only, exactly as
    v3.21 did.

## v3.21 — 2026-11-09

**WHAT A PERSON DID** — the owner said yes to reading the cabinet's own play,
and to the trailer and the store page catching up with v3.18–v3.20.

- **The play log** (`js/playlog.js`). Every balance number so far came from
  bots, and a bot has no clock and never closes the tab. The game now writes
  down what a person does, off the run's own machine (v3.20):
  - every card: its state, which button (1, 2, 3), its tier, and how long it
    took to choose;
  - every shift's end: done, late, strikes, struck out, the euros;
  - a shift left mid-way: QUIT, with the state it was left in.
- **Kept on this device only:** the last 60 shifts, on their own key. One
  summary line goes to the arcade's shared log, when the cabinet has loaded
  it; the itch build carries no path out of itself.
- **YOUR PLAY LOG** on the title, once anything has been played. The readout
  covers:
  - runs done, struck out and left;
  - the time to choose by state (median and slowest);
  - how often the third option is taken (special, very special);
  - where shifts were left.

  COPY THE LOG puts it on the clipboard, to paste back to the developer.
  `__tm3.plays()` and `__tm3.playReport()` give the same to a test or an
  agent.
- **The trailer** adds two takes: the choir's very special *"Join in"*
  aboard (EASY 1001), and a ride stop by stop inside the car (EASY 1357,
  the 2 to Senaatintori).
- **The store page** (`store/ITCH.md`): three choices with a special third,
  the ride inside the car, perks and strikes, the missions on the map and
  the day's errand, the march, and the keys 1, 2, 3.
- **Gates.**
  - `test/playlog.mjs` (new, also in CI): the timing, a re-render counted
    once, QUIT, the readout, the 60-session store, a store in the wrong
    shape, and a real run read in the machine's own states.
  - `test/play.cjs`: a shift written down, a shift left mid-way read as a
    QUIT, the title's readout.

## v3.20 — 2026-11-09

**THE MACHINES, NAMED** — the owner: *"Find all of the implicit state machines
in my app. Make the best decision that will elevate all three: the user
experience (UX), developer experience (DX), and agent experience (AX) always,
without breaking anything."*

`STATE-MACHINES.md` lists every machine in the game: fourteen, with where each
lives and its states. Two were implicit and central, and are now explicit. The
rest are small, live in one module each, and are documented as they are.

- **The run** (`journey.js` `STATES`, `stateOf`, `check`). The card a run
  shows used to be a precedence chain inside `card()`: `phase` plus the flags
  beside it. It is now one table:
  - eight named states (dispatch, fork, errand, story, halt, route, perk,
    end);
  - for each, what must be true in it and where it may go next;
  - `card()` switches on it, and every card carries its `state`.
- **The screen** (`play.js` `UI`, `uiState`). It used to be loose variables.
  Now: loading → title → card ⇄ moving, card ⇄ board, → end. It is derived
  from the same variables, so it cannot disagree with them. The page wears
  it as `body[data-ui]` and `body[data-state]`.
- **For the player (UX):**
  - **keys 1, 2, 3 answer any waiting card**, and the cabinet's pad does the
    same: A, B and X are the three buttons and Y hurries what is playing
    (`pad` in the arcade catalogue);
  - the stricter checks guard every step against a broken card.
- **For a developer (DX):** one table instead of a chain of flags, and
  `check()` names what is wrong instead of a card that silently misbehaves.
- **For an agent (AX):** `__tm3.machine()` gives the state, the screen,
  where the run may go next, the card's options (label, price, tier) and any
  problem, in one call. The doc says where every other machine lives.
- **Nothing broke.** Over the four runs and six missions, 116,907 steps hash
  identically before and after the table. The check found no broken state in
  4,000 runs, or along a whole shift played from the keyboard.
- **Gates.**
  - `test/journey.mjs` §7d: 4,000 runs, every step keeps its state's
    conditions and moves only where the table allows; every state is reached.
  - `test/play.cjs`: the title is a state of the screen, the first card is
    `dispatch`, and a shift is played from the keyboard alone to its end card
    with nothing broken on the way.

## v3.19 — 2026-11-08

**THE RIDE, INSIDE, AND THE NECK** — the owner, on v3.17: *"The traveling on a
tram visual is a great one and should be used more. The neck is a bit
disconnected but the background looks great moving. Similar ones should for a
longer loop of travel, animations and choices."*

- **A ride stays in the car.** It used to show the interior for a beat, then
  cut to the board. Now the whole ride plays inside, for 2.6 to 5.2 seconds by
  how long it is:
  - the window carries the travel and slows at each stop the line passes;
  - the sign names the next stop (*"then RUOHOLAHTI"* under it);
  - the corner map follows the courier along the line.

  A tap hurries it, as before. After a card aboard, the rest of the ride is
  played in the car too. Walks and lifts still go on the board.
- **More choices aboard.** Cards that happen aboard are dealt half again as
  often, so more of them are played in the car. Bands, reader · tapper:

  | run | reader | tapper |
  |---|---|---|
  | EASY | 60/60 | 60/60 |
  | MEDIUM | 56 | 50 |
  | HARD | 54 | 44 |
  | NIGHT | 51 | 25 |

  The ladder holds.
- **The neck.** Toko's head sat high on the courier in the tram and metro
  interiors, with about 40 px of neck between the ring and the collar. It is
  moved down onto the collar and centred over the neck, in all 12 layers
  (tram and metro, both formats, every crowd and old-car variant).
  - `art/minimal-metro-look/fix_neck.py` does it from the originals, kept in
    `_prev/neck/`, so running it again gives the same files.
  - The art request (PR #633) asks for the courier redrawn at the source,
    which replaces this.
- **Gates.** `test/play.cjs`: a ride is played inside the car with the corner
  map; new seeds where the decks moved (the crush in the metro, MEDIUM 1162;
  the tourist, the crossing and the saved seat, EASY 1152).

## v3.18 — 2026-11-08

**THREE AT EVERY CHOICE, AND THE MENUS WEAR THE CARD** — the owner, on
v3.17: *"We need 3 options at every choice. 2 regular and 3rd can sometimes
be special or very special. This same lower third look, should be used in
menus and the intro screen."*

- **Every card has three buttons.** The first two are what they always
  were, in the same places (the cheaper hop still on the left). The third
  is new, and sometimes special (gold, ★ SPECIAL) or very special (a slow
  cyan-and-gold shine, ✦ VERY SPECIAL):
  - **A stop:** another way when there is one. On about one stop in five,
    a taxi straight to the drop (special: €8 plus €3 a km, a four-minute
    wait, slower in snow). On one in twenty-five, a cargo bike courier's
    lift (very special: free and quick). A sealed parcel has no address,
    so it gets no lift.
  - **A story card:** a third thing to do, written for each of the 46
    cards and the two mission cards. Twenty are ordinary, sixteen special
    (they cost or pay a little), ten very special (choir: *"Join in"*;
    sauna: *"Ask about the cold plunge"*; the ghost tram: *"Ask the driver
    where it goes"*; the wallet: *"Find him from the library card"*).
  - **A dispatch:**
    - take it / ask for another / *Take it, express* (special: the fee
      ×1.5, the clock ×0.7);
    - a mission's: take it / *Take it slow* (the fee ×0.8, the clock ×1.3)
      / express;
    - the race: race her / let her have it / *Buy her a coffee* (special:
      €3, no race).
  - **A halt:** find another way / wait it out / a taxi past it (special).
  - **A fork:** the two jobs, or *Toss a coin* (special: one of them, and
    €3).
  - **A perk:** the two perks, or *Keep the cash* (€8).
- **Measured.** The taxi was first on every third stop for €6: the
  reader's NIGHT went 43 → 57 of 60. At €8 + €3/km with a four-minute wait,
  on one stop in five, the ladder keeps its shape. Bands, reader · tapper:

  | run | reader | tapper |
  |---|---|---|
  | EASY | 60/60 | 60/60 |
  | MEDIUM | 57 | 46 |
  | HARD | 54 | 44 |
  | NIGHT | 51 | 27 |

  More choice is better for a player who reads; the tapper, who never
  takes a third, is where it was.
- **The menus wear the card.** The title is the game's lower third over an
  approved picture: the tram stop (PR #632), sideways the tram at the
  platform, with Toko's face beside the name. The runs and missions are
  pill buttons, START stays at the foot of the card, and the end card and
  the pause share the look.
- **Finnish** for every new option, line and tag.
- **Gates.**
  - `test/journey.mjs`: three buttons on every card; the two regular ways
    first; the third sometimes special and now and then very special.
  - `test/missions.mjs`: the wallet's third, the fork's coin, the race's
    coffee.
  - `test/play.cjs` (browser): three priced 44px buttons on every card;
    the express, the halt's taxi, the perk's cash, the coin.

## v3.17 — 2026-11-08

**THE MISSIONS ON THE MAP, AND TODAY'S ERRAND** — ROADMAP steps 7 and 8 (owner,
2026-11-08: *"Go ahead with plans"*).

- **The missions on the map.** Once EASY is done, the title card's MISSIONS
  section opens on the city:
  - a pin where each mission starts (the station, the market square,
    Hakaniemi, the ferry quay, Kamppi, Lasipalatsi);
  - finished ones dark with a tick, the open one in Toko's cyan and
    breathing, with its name beside it, the locked ones small and grey with
    their glyph;
  - a tap on an open pin plays it, and the list below it says the same in
    words.
  - It is the board's own drawing (`HopBoard.drawPins`): the sea, the lines
    stepped back, no new art. Only the open pin is named, because the pins
    sit close together in the centre.
- **Today's errand** (`?errand`): one mission a day, the same for everyone.
  - The missions take turns by the daily's own count; the seed is the
    day's; every perk is in the pool.
  - The first finish stands, kept beside the daily's on its own key; again
    is practice. The title then shows what stands.
  - The end card has the line to send: *"Toko Move · Errand 47 · 8 Nov /
    THE LAST TRAM 🟩🟩🟨 · €70 · A season pass, Good shoes"* — a square a
    job, red for the ones a lost errand never reached, and the build.
  - It opens with the missions, after EASY, from a link above the list:
    *TODAY'S ERRAND · THE LAST TRAM*.
- **Finnish** for the errand.
- **Gates.** `test/play.cjs` (browser):
  - the map pins every mission and a tap on the open pin plays it;
  - the errand is offered, is the day's mission, ends on its line, and
    stands.

## v3.16 — 2026-11-08

**THE MARCH, AND THE ROGUELIKE ON EVERY RUN** — the owner's answers:
*"For central lines, especially around Mannerheimintie. The congress building
area"* (the demonstration), and *"yes to all runs, modifiers, perks. Let's
test all, plan to fit the design."*

- **The march.** A peaceful march on Mannerheimintie, by the Parliament
  House, holds the tram lines that run between Lasipalatsi and the Opera:
  the 1, 2, 4 and 10. The four lines are read off the network, not typed.
  - MEDIUM: every other shift or so, a march holds one of them from about
    07:12, for 20 to 32 minutes or two jobs.
  - HARD: its held line is the march when it is one of the four (14 of 60
    shifts); otherwise the plain halt it always was.
  - The card: *"A march on Mannerheimintie, by the Parliament House. The 4
    is halted."*, with the halt's two ways out: find another way, or wait it
    out (priced honestly).
  - The art: the approved demonstration scene (PR #632), drawn from above,
    plays at the card by day in any weather. It was HELD until now; all 29
    approved scenes are in the game.
  - Measured: MEDIUM moves by one shift in sixty for the reader and none for
    the tapper. The march is something to route round, not a wall.
- **Perks, forks and strikes on every run.**
  - **Perks:** between jobs, pick one of two for the rest of the shift.
    The pool is the missions' (three, one more per mission finished); the
    daily's is the first three, the same for everyone.
  - **Forks:** one job a run comes in two at once, and the card asks which
    ("Two jobs come in at once. Pick one.").
  - **Strikes:** none on EASY, three on MEDIUM and HARD, two at NIGHT. The
    title says so, the stamp counts them, and the end card names them.
- **Tested, then fitted.** Bots, 60 to 100 shifts a run, on three seed
  blocks:
  - perks alone made every rung easier, and put NIGHT's tapper above HARD's;
  - forks barely move a band;
  - two strikes everywhere broke the ladder's order, three everywhere left
    NIGHT too soft.
  - What ships: HARD's clock is 0.9 (it was 1.0) and NIGHT strikes out on
    two. Bands, reader · tapper:

    | run | reader | tapper |
    |---|---|---|
    | EASY | 60/60 | 60/60 |
    | MEDIUM | 53 | 46 |
    | HARD | 52 | 44 |
    | NIGHT | 43 | 27 |

    The ladder keeps its shape, and the tapper is stopped higher up each
    rung. Pars are re-read off the reader's 70th percentile: MEDIUM 120,
    HARD 130, NIGHT 155.
- **A bug the new strikes found:** a strike-out on the very last drop
  counted as a finished run (and a finished mission). Struck out is not
  complete now (`J.complete`, `starsFor`).
- **Finnish** for the march, the perk draft, the forks and the strikes.
- **Gates.**
  - `test/journey.mjs`: the march (its four lines, MEDIUM's every other
    shift, HARD's central halt, its card, no ride on the held line) and the
    run's levers (a perk between jobs, a fork, strike-outs that are not
    complete).
  - `test/moments.mjs`: the march's scene.
  - `test/missions.mjs`: a mission takes none of its base run's march or
    forks.
  - `test/play.cjs` (browser): MEDIUM 15 meets the march in its picture.

## v3.15 — 2026-11-07

**FORKS, A RACE, A STICKER, AND THE LAST TRAM** — the next step of v3.14's
missions (ROADMAP step 6: "a mission that strings the sealed parcel and the
race").

- **Forks.** A mission job can be two errands, and the card asks which. It is
  the same card as any choice: one line, two buttons, each with its fee
  ("Something fragile → Arabia €48 / Parts → Sörnäinen €13"). The big fee
  is the fragile one, which rides the tram only. The event that job deals
  is drawn from the errand you picked. EAST OF THE BRIDGE's middle job is
  a fork now.
- **THE STICKER** (Kamppi), the run's own modifiers as a mission:
  1. a race: the other courier wants the envelope ("Race her", ×1.3 if you
     beat her, ×0.6 if not);
  2. a sealed parcel, only a sticker until the right line tells you (×1.5);
  3. a fork: an express parcel for the station on a tight clock, or parts
     for the market with no hurry.
- **THE LAST TRAM** (the station, 23:00), the night shift as a mission:
  - the night car, half the trams, kebabs for Kallio, a contract before
    midnight, and something that hums;
  - its events are the night's that have art: the ghost tram at the stop,
    the empty humming car, the karaoke and the reindeer on the walk;
  - the night cards with no art (the kebab, the last metro, the flicker)
    are not dealt, by the owner's rule: every event with its correct art.
- **Six missions now**, each opening the next. THE LAST TRAM is last.
- **Measured** (60 seeds each):
  - A board-reader finishes every mission (THE STICKER 59/60, one lost to
    the clock).
  - A left-tapper collects strikes and loses some; THE LAST TRAM costs it
    the most (38 strikes, 12 lost). Its clock is 1.1: at 1.3 a reader never
    struck.
- **Finnish** for the forks, the new briefs and the two missions.
- **Gates.**
  - `test/missions.mjs` (23 checks):
    - a fork offers two errands, and the one picked is the job;
    - THE STICKER opens on a race and deals the sealed parcel;
    - THE LAST TRAM is played at night, from the station;
    - the art rule now names the walking pictures, the ghost tram and the
      empty car.
  - `test/play.cjs` (browser): a fork on one card in EAST, and THE LAST
    TRAM through to its end in the night car.

## v3.14 — 2026-11-07

**MISSIONS, THE WALLET, AND A RUN THAT CARRIES SOMETHING** — the owner's
direction: *"Add wallet menu and UI based on base simple UX look that's
already used for choices. Also start adding the art and locations, build
missions and all the events in those missions with correct art. Add
roguelike elements."*

- **The wallet**, in the journey's own choice card (one line, two buttons,
  a price on each, the stakes under them). It is a card made for missions
  (`MISSION_CARDS` in `js/missions.js`):
  - *Hand it in at the kiosk* (+1:00, ×1.1) shows the approved kiosk scene.
  - *Pocket it* is a risk: maybe +€40, or −€20 for the fright.
  - Handing it in brings the owner back aboard on a later job (`wallet2`).
  - The classic deck's third option, *Leave it*, is not on it: the bible's
    card has at most two buttons.

  The wallet scene is in the game now; the demonstration is still held.
- **Four missions** (`?mission=<id>`, listed on the title under the runs).
  Each is three jobs across real places, with its own briefs, drops and
  events:
  - **AINO'S MORNING**: Lasipalatsi → the Opera → Kamppi or Eira → the
    station. The crossing, then the saved seat if you helped.
  - **LOST AND FOUND**: Kauppatori → Katajanokka → a ferry terminal → the
    station. The wallet, then its owner.
  - **EAST OF THE BRIDGE**: Hakaniemi → Kalasatama (heavy: transit only) →
    Arabia or Sörnäinen → back for the market.
  - **THE HARBOUR ROUND**: Olympiaterminaali → the market quay → along the
    shore → the canal at Ruoholahti.

  Every event card a mission deals has its art: a stop actor, or an
  approved scene. The pickup, delivery and boarding moments play in
  missions as everywhere.

  No buyer cards are dealt. A first cut dealt four, and selling the
  errand's parcel ended most left-tapping runs. That was a trap, not a
  choice.
- **The roguelike parts**, each a lever the journey already had:
  - **A version per seed.** The drops and events of each step are drawn,
    so 30 seeds of EAST give 6+ versions. The same seed is the same
    version.
  - **Strikes.** The second late drop loses the errand.
  - **The draft.** Between jobs, pick one of two perks for the rest of the
    errand: good shoes (walks −20%), a season pass (waits −30%), a paper
    map (deadlines +20%), a lucky coin (risks +15%), a regular's number
    (+€4 a drop), an umbrella (the weather leaves the parcel alone). The
    end card shows your build.
  - **Meta.** The first mission opens with EASY, each after the one before.
    Each first finish adds a perk to the pool: three from the start, six
    with three missions done.
- **The runs are untouched.** Everything is behind `run.mission`.
  `journey.mjs`'s measured bands read exactly as before (easy 60/60 (60) ·
  60/60 (58) … night 40/60 (12) · 34/60 (4)), and the seed-pinned browser
  checks still deal what they dealt.
- **Measured.** A board-reader finishes every mission (EAST, the hard one,
  on a 1.25 clock). A left-tapper collects 12–35 strikes per 60 runs and
  loses some.
- **Finnish** for the missions' title, cards, perks, briefs and end card.
- **Gates.**
  - `test/missions.mjs` (19 checks):
    - real places and cards, and no buyers;
    - every event has art;
    - one version per seed;
    - the draft: two different perks, never one already held, each doing
      what it says;
    - two strikes lose the errand;
    - readers finish, left-tappers collect strikes;
    - the wallet's two buttons and its callback;
    - the save, the unlocks and the perk pool;
    - the runs untouched.
  - `test/moments.mjs` adds the wallet's kiosk scene.
  - `test/play.cjs` (browser):
    - the title lists the missions, the first open after EASY;
    - LOST AND FOUND plays through: the wallet handed in at the kiosk, a
      perk drafted from two, the end card with the build.

## v3.13 — 2026-11-07

**THE CARDS HAVE THEIR SCENES, AND THE SNOW HAS ONE** — PR #632's next two
approvals (29 scenes now). Six are in the game; the other two are held, each
with its reason.

- **A card's scene while it is played.** Each stands under the card, in place
  of the stop or the car:
  - the `map` card ("A tourist is looking for the Moomin shop…") is played
    in front of the tourist and her map;
  - the sealed parcel's card is the courier with the box between the kiosk
    and the tram: ask, or ride and watch.

  Both are on a clear day.
- **The lady who saved you a seat.** The `granny2` callback, aboard, is the
  seat she saved by the door. It is inside a tram, so it stands by day in
  any weather.
- **A choice's consequence.** Walking the lady across (the `granny` card's
  first option) is the crossing, under the line its reveal already says.
  Walking on is not drawn. The pack's own notes call this pair "the
  strongest story comparison": a choice at a stop, and the same lady later
  aboard.
- **The wind at a tram stop** is a sixth way to board a tram.
- **Snow, the first weather the art has.** On a snowy day a walk and a
  delivery are the courier on the snowy steps. Rain and fog still keep the
  game's own scenes.
- **Held, with the reason written next to them** (`HELD` in
  `js/moments.js`; nothing of them ships):
  - **the wallet:** the scene is the classic deck's encounter, and the
    journey has no wallet card. Adding one moves every deal.
  - **the demonstration:** its pack approves the art and calls the cause a
    new proposal. A march as the reason a line is halted needs the owner's
    sign-off first.
- **Framing.** The saved seat, upright, keeps the lady's face in view.
- **Gates.**
  - `test/moments.mjs` (20 checks):
    - the approved art is untouched (175 images);
    - every one of the 29 approved scenes is a moment (27) or held (2);
    - a held scene names its reason and ships nothing;
    - the game's 49 pictures are the approved crops;
    - the card scenes, the choice and the snow.
  - `test/play.cjs` (browser):
    - EASY 1103 plays the tourist's card in front of her, walks the lady
      across, and meets the seat she saved;
    - EASY 3434 shows 8 moments in one run.

## v3.12 — 2026-11-07

**THE JOB ITSELF, IN THE OWNER'S NEW ILLUSTRATIONS** — PR #632, every approved
exterior variant: 21 scenes, 37 pictures (`art/approved-exteriors/`). It
follows the owner's *"Forget your art designs, I will get u a PR"*, and then,
on a first cut that used only the latest four, *"It should have a lot
more"*.

- **Every beat of a job has its picture.** Each stands full frame under the
  panel that beat already has:
  - **A job taken** is a handover where you are:
    - the station's granite at Rautatientori;
    - the canal bridge at Ruoholahti;
    - the market quay, the close quay or the ferry at the four harbour stops;
    - the lakeside reeds at the park stops (Ooppera on Töölönlahti, Arabia
      on Vanhankaupunginlahti, Meilahti, Käpylä);
    - anywhere else a kiosk hatch, a bench, or the tram stop.

    It carries a PICKED UP stamp. A sealed parcel's line keeps its address
    hidden.
  - **A delivery** is at the same places at the drop. Anywhere else it is a
    doorway, a cyclist at the steps, or the bench. The tram you came on has
    gone while you were at the door.
  - **A tram boarded** (after it pulls in) is a tram stop, five ways. The
    museum tram and the Nr I and II keep their own pictures: the art draws
    today's trams.
  - **A metro boarded at Kalasatama** is the open-air platform, four ways
    (of the game's 23 places only Kalasatama has an outdoor metro).
    Anywhere else it is the stairs down.
- **Sunny only.** The owner: *"Sunny ones work, rain doesn't."* The moments
  stand by day on a clear day. The night shift and a day of rain, snow or
  fog keep the game's own scenes.
- **The same drop is always the same picture.** A beat picks from its pool
  by the thing itself: the drop, the ride, the job. A first hash (FNV-1a)
  picked only two of Kalasatama's four platforms, because its low bits
  barely move for keys that differ only at the end. It has a final mix
  now.
- **The art, as delivered.**
  - The PR's commits are in the history unchanged. Its own check
    (`approved-exteriors/reproduce.py`) passes: every hash, and all 21
    variants pixel-exact.
  - The game ships the approved crops as webp (`scenes/moments/<fmt>/`,
    2.7 MB for all 37), in the formats they were approved in.
  - Five scenes are landscape only, and no portrait is invented for them.
    A phone held upright picks from the other sixteen.
  - The crops are 1024 wide (the dual-crop pair 1792), about 2× enlarged on
    a phone's frame. Masters at 2× would sharpen them.
- **Framing on a phone, found by looking.** A phone's frame is narrower
  than 9:16 upright and wider than 16:9 sideways, so some scenes keep a
  point other than the middle in view:
  - the cyclist's face and the parcel;
  - the metro's cab and the courier at its edge;
  - the doorway's parcel, sideways;
  - the courier on the Kalasatama curve and at the tram stops.

  Sideways, a moment's stamp is narrower (38vw), so the parcel in their
  hands stays in view.
- **Gates.**
  - `test/moments.mjs` (15 checks):
    - the approved art is untouched (125 images against the inventory's
      checksums);
    - every approved scene is a moment, in exactly its approved formats;
    - the game's 37 pictures are those crops (36.5–43.4 dB). The control,
      two different scenes compared, reads 5.7 dB;
    - the open-perspectives scenes carry their pack's crop boxes and faces;
    - every face and kept point is inside its crop and clear of the card;
    - every beat's pool, the night and the weather;
    - every scene shipped is reachable from some beat.
  - `test/play.cjs` (browser): EASY 3434, a clear day, shows 7 of them in
    one run: a pickup, a delivery, two tram stops, the station at
    Rautatientori and the Kalasatama platform. A night run shows none.

## v3.11 — 2026-11-07

**MORE INTERIORS, AND THE WEATHER IN THE WINDOW** — step 4 of the plan for the
owner's direction of 2026-11-06 (ROADMAP.md), and the owner's note on a night
screenshot the next day: *"Rain seems to be falling into 2 different
directions here. But assume we need more of these and outside art."*

- **The rain fell two ways, and now falls one.** The window is a tile the
  game scrolls. To make its ends meet, `plates.py` put the picture beside
  its own mirror. That is fine for a row of houses. It was wrong for the
  rain the night plate had painted in: the left half fell one way and the
  right half the other, and where they met the streaks made a row of Λs.
  - `make_windows.py` takes the painted rain out (a streak is a short
    bright run along a row; it gets its row's 31 px median).
  - The rain goes back in as weather, drawn at x and x ± W so the tile stays
    seamless, all of it falling down and to the left.
  - A first cut used a square 9 px median. A steep streak fills more than
    half of that square, so a ghost of every streak stayed, visible only
    with the contrast stretched.
  - The painted plate is kept in `art/…/_prev/` so a re-run starts from it.
- **The window carries the weather.** The stop's rain is never drawn inside
  a car, so a rainy run showed sun through the glass.
  - The day tram's window has rain, snow and fog
    (`01-outside-tile-<rain|snow|fog>`), picked by the run's weather.
  - The night car's window keeps its rain. A night run is always "clear",
    and its look was always a rainy night. It gets snow and fog too, made
    from the dried plate.
- **The metro by day.** Every metro hop rode the tram's car until now.
  `make_cars.py` makes it from the same plate:
  - the metro's colours (orange seats, yellow poles, pale grey laminate);
  - a tunnel for the window: rings, cable runs, lamps with their light on
    the wall, a sign too far to read.
  - Two things found by looking:
    - The first tunnel put its lamps a few pixels below the glass, and the
      window read as a black panel. The glass is measured now, and
      everything sits inside it.
    - The plate's riders were cut out of a day window, and the cut kept a
      rim of that sky. It is invisible against daylight and glows against
      a tunnel. The metro's rider layers drop it, except on Toko's head,
      whose ring meets its disc in exactly that colour (the first pass
      chewed it).
- **Rush hour.** The crush card, or a tram you let go by because it was
  full, now rides in a full car (`03-people-rush`, `04-courier-rush`):
  - In 16:9 the plate's rider sits one seat over each way, re-dressed (a
    green coat and brown hair, a purple coat and black hair). He is cut
    clean of the seat strips that came with him.
  - Standing passengers hold straps close to the lens, cropped by the
    frame, over the courier because they are nearer than he is.
  - The metro has its own rush car.
  - The humming card ("the empty car") leaves the riders out.
- **Gates.**
  - `test/scenarios.mjs`: every layer the car can ask for exists (the
    weather list is read from play.js). The rain in every window falls one
    way, measured as the slant of the image gradient per half. The old
    two-way plate is the control: the same ruler reads it +0.97 / −0.97,
    and the new windows +0.69 to +0.96 in both halves. The night's snow
    and fog have no painted rain under them.
  - `test/play.cjs` (browser): MEDIUM 1087 rides the metro in the tunnel
    car and fills it for the crush; MEDIUM 1027 rains in the tram's window
    and fills the tram.
  - The gate waits for the car to fill: the card is up 0.2 s before the
    scene behind it cross-fades, and the bot answered it in less.

## v3.10 — 2026-11-07

**EVERY STOP IS SOMEWHERE** — step 3 of the plan for the owner's direction of
2026-11-06 (ROADMAP.md): *"lots more art … in these styles."*

- **Eleven more landmarks.** Act 1 drew one behind the stop at twelve key
  stations. The other eleven places stood in front of the same paper
  blocks. Now every place the network names has its own:
  - Uspenski's onion domes at Katajanokka;
  - the Suvilahti gasometer in its steel cage at Sörnäinen;
  - the Crown Bridge's pylon at Kruunuvuori, with a tram on the deck;
  - the wooden houses of Puu-Käpylä in ochre, red and green;
  - the Arabia factory and its chimney;
  - the West Harbour terminal (with the bobbing ferry);
  - a Jugend villa and its turret in Eira;
  - the Cable Factory and the canal at Ruoholahti;
  - the expo hall and its flags at Messukeskus;
  - the hospital towers at Meilahti;
  - pines on the rock at Laajasalo.

  They are drawn in `make_act1.py`'s register (flat iso, three values a
  face, no outline, no text) by `art/minimal-metro-look/make_places.py`,
  and placed by its own `placed()`, so they sit in the same sky. The bold
  "key station" plate stays with the original twelve. The landmark itself
  is now read from `act1.json`, not from a list in the code.
- **The weather lies on the stop.**
  - Snow (`05b-wx-snow`): on the shelter roof, the bench, the ticket
    machine and the bin, along the platform's edge, and across the tracks.
  - Rain (`05b-wx-rain`): puddles on the platform, and a wet edge.

  Both use the same camera as the stop. The stop's scene key now carries
  the weather, so a new run at the same place repaints it.
- **The tooling.** `act1.json` is updated, never rewritten, so
  `make_act1.py`'s trams, `make_actors.py`'s cast and these places stand
  side by side.
- **Gates.** `test/scenarios.mjs` now also holds:
  - every one of the 23 places has its landmark in both formats;
  - both ferry terminals carry the ferry;
  - the snow and rain layers exist in both formats.

  9 checks.
- **The trailer** gains "Every stop is somewhere": Katajanokka in the snow.

## v3.9 — 2026-11-07

**SCENARIOS IN THE SCENE** — step 2 of the plan for the owner's direction of
2026-11-06 (ROADMAP.md): *"lots more art and scenarios in these styles."*

- **Who you meet stands at the stop.** Sixteen story cards played at the
  stop now bring their subject into the scene for as long as the card is
  played:
  - the gull on your parcel, staring at you, and its friend;
  - the lady with her cane at the kerb;
  - the tourist with Stockholm's map, and the one with a fan of notes and a
    paper bag (the Moomin card shows no troll, only a shopper);
  - the busker with an accordion and an open case;
  - the dog in its tiny yellow raincoat;
  - the student in a white cap and red overalls, with a vappu balloon;
  - the other courier, the same face in ink on white, never the courier's
    cyan;
  - the long coat, the dentist's white coat, the towel, the spruce man, the
    Swedish question and three puffy coats;
  - the crowd pressed under the shelter out of the horizontal rain.

  Each is one transparent layer per format
  (`scenes/stop/<fmt>/07-actor-<card>.webp`, 396 KB for all 32), drawn by
  `art/minimal-metro-look/make_actors.py` with the stop's own camera and
  people. The rules hold: flat fills, faces featureless, one Toko face in
  cyan, no text. The actor steps in with the card and out when the card
  is answered, and the night dims it with everything else.
- **What you walk past rides beside you.** The nine cards played on foot
  each put a small picture beside the courier on the board, a white card
  with an ink edge and a tail (`js/vignettes.js`): the reindeer on
  Mannerheimintie, the sofa on Aleksanterinkatu, the ice hole, the karaoke
  door, the roadworks, the fence gap, the fog over the cranes, the black ice
  with its pensioner and the rain in your bag. The bubble sits to the
  courier's left, because the board writes every name to the right; a first
  cut covered SENAATINTORI.
- **Gates.**
  - `test/scenarios.mjs` (bare node, in `gates.yml`) holds the casting:
    every actor is a card played at the stop, both formats exist, every
    actor stands clear of the card in both formats (read off its own pixels
    with ffmpeg), and every walking card has a picture.
  - `test/play.cjs` holds the moment: on EASY seed 1000 the student stands
    at the stop while the vappu card is played and is gone after. 84
    checks.
- **The trailer** gains two takes, "Who you meet at the stop" and "What
  you walk past".

## v3.8 — 2026-11-06

**THE BOARD, POLISHED** — step 1 of the plan for the owner's direction of
2026-11-06 (ROADMAP.md): *"the top down view can use some polish."* Read off
the trailer's board frames, it had three faults. Each is fixed with data the
game already shipped and the journey never loaded.

- **The sea is filled.**
  - OpenStreetMap carries the sea as coastline, which is a line. The board
    stroked a band along it, so a harbour read as blue tubes over paper.
  - `js/sea.js` solves it the way the bible's stills do, as vector: ways
    joined into chains, each chain closed along a frame walked clockwise,
    and the islands cut out even-odd.
  - The board fills it, draws a lighter shallows band inside the shore and
    a hairline coast. Where the water pack ends (24.995 E) the ground fades
    out instead of stopping on a ruled line.
  - `test/sea.mjs` asks geography, not geometry: the South Harbour,
    Töölönlahti and Eläintarhanlahti are water; Senaatintori, Kamppi and
    Korkeasaari are land; no stop stands in the sea; and the sea is a sane
    share of the extract.
- **The land is no longer empty.**
  - The real-time board's ground (`ground.js`) is now under the journey's
    board: the real streets in the centre extract, HSL's corridors beyond
    it, the district names spaced and quiet, and the six origami landmarks
    at their stops.
  - The corner mini map stays plain (`detail: false`): at 164 px, streets
    are noise.
- **The district names stand where the places are** (owner, the same day:
  *"Kluuvi looks to be in the wrong place on the map"*).
  - The pack gives each quarter the centre of its sub-district polygon. The
    polygons run over water, rail yards and parks, so Kluuvi's centre was in
    the tracks north of the station, and five more (Katajanokka,
    Kruununhaka, Kaivopuisto, Hernesaari, Lapinlahti) stood in the sea.
  - Snapping each one to the nearest street was tried and put three on the
    wrong neighbour (Kaivopuisto went to Katajanokka), because the street
    extract stops north of them. So the six are placed by hand in `sea.js`'s
    `LABEL_AT`, each with its reason.
  - `test/sea.mjs` holds that no name the board writes stands in the water,
    that every hand placement says why, and that Kluuvi is written between
    the station and the Esplanadi. 21 checks.
- **The line you ride has weight.**
  - While a hop plays, the network sits at half strength. The hop's line is
    bold: solid behind the courier and faint ahead.
  - The pill is bigger and carries the line's family number ("4", not "4H")
    on its tail, so the courier on its nose never covers it.
  - The drop breathes while you ride, and the board settles in as it opens
    (none under reduced motion).
- **Cheaper, not dearer.**
  - Everything that holds still for a hop is drawn once into a base canvas:
    16–28 ms under software rendering.
  - Each frame of the hop then blits the base and draws only the line, the
    pill and the names. Before, every frame redrew the whole board.
- **Gates.**
  - `test/play.cjs` reads the board's own pixels at real places across the
    first hop's frame. On seed 1002, 30 sea points paint blue (100%) and 168
    land points don't (97%). It also checks the board stands on the ground:
    a solved sea, 3,731 streets and 6 landmarks.
  - Two read-only hooks serve those checks: `__tm3.board()` and
    `__tm3.probe(lat, lon)`.
  - play.cjs passes 81 of 81.

## v3.7 — 2026-11-04

**ACT 1 IS READY TO SHIP** — the Act 1 ship plan's last step: the ship bar run
on the journey, and the store pass. The upload to itch stays the owner's
(roadmap M7).

- **`test/ship3.cjs`** is `ship.cjs`'s bar held for the journey a stranger
  now meets first. It is in `gates.yml` beside the real-time one. 19
  checks, all passing on their first run:
  - **S1:** a whole week by tapping, Monday to Friday's rent. Each day hands
    on to the next. The page grows by ×0.94–1.13 through a shift, and every
    card is ≥44px and on screen.
  - **S2:** a hidden tab suspends the sound, and it comes back. Leaving
    Monday mid-shift banks what it made and opens on Tuesday.
  - **S3:** storage that throws still plays a run to its end card. Saves
    in the wrong shape (the runs, the memory, the regulars, the week, the
    daily, the notebook, the mute) are a fresh start on the ladder, the
    daily and the week.
  - **S4:** a 320px phone plays a whole run.
  - **S5:** measured, not gated: 4 long tasks over a run, the longest
    122 ms, under software compositing.
  - **S6:** nothing sounds before the first touch.
  - **S7:** the data credits are on the title card in English and Finnish.
- **A number for the owner (the open rent question).** The rent came over
  from the real-time week (€400, from points÷10). On the journey, a player
  who always taps the first button pays it in 51 of 60 seeded weeks. €500
  would be paid in 32 of 60 and €600 in 11, against a median week of €514.
  The rent is left at €400 here, because it is the owner's call.
- **The store pass.** `tools/stills3.cjs` shoots the store page from the
  store build, every screen reached by tapping:
  - twelve 1080×1920 stills: the title, a dispatch at Lasipalatsi, a risk
    with its odds, the museum tram, the board, a delivery, the race, the
    sealed parcel, the night's tram with no number, EASY complete, the
    daily and the week's rent;
  - the 630×500 cover: the game's own Kauppatori stop, composited, with the
    wordmark on paper.

  `store/ITCH.md` is rewritten for v3: a card game, Act 1 in Helsinki, the
  description, the Finnish summary, controls, tags and media. The trailer
  slot is left empty until a journey film exists. `tools/film.cjs` is still
  the real-time game's.
- **After the release, tools only (2026-11-06): the trailer.** No game byte
  changed, so the build is still 3.7. `tools/film3.cjs` films the journey
  from the store build, so the trailer slot has a film:
  - **What it shows** (47.1 s):
    - the title on the Kauppatori stop;
    - a first delivery whole: Dispatch, a tram, a risk in words that lands,
      the board, DELIVERED;
    - the museum tram from outside and in, with an inspector and an €80 fine;
    - the night's tram with no number, which goes to the depot;
    - the other courier's race;
    - the lady from Mannerheimintie, saving the seat she was helped to;
    - the end card.

    Four one-line captions sit between the beats. Portrait is 1080×1920;
    `--landscape` is 1920×1080. Both are 30 fps, H.264 + AAC, about 10 MB,
    and take about 10 minutes each under SwiftShader.
  - **Virtual time.** A frame costs a second or more to capture, so the page
    runs on a clock the film steps:
    - an init script swaps out `performance.now`, `Date.now`, timers and
      `requestAnimationFrame`;
    - the DevTools animation timeline is held at rate 0, and every
      animation's `currentTime` is set from the film clock each frame.

    So a transition ends, and its promise resolves, on the frame it should.
    The two cuts are the same film: every take lands at the same second in
    both.
  - **The game's own sound.** Every cue and weather bed is logged at film
    time, then `js/audio.js` itself renders into an OfflineAudioContext that
    suspends at each moment. One fixed gain (6 dB past a −3 dB peak) and a
    limiter keep the kit's own balance. Found on the way: cues in the same
    render quantum must run in the order they were laid down. A bed stopped
    and the next one started at a cut ran the other way round, and faded
    the fresh bed from its default gain of 1, which is a half-second burst.
    The game itself can't reach that, because its stop and start are always
    at least a frame apart.

## v3.6 — 2026-11-04

**THE DAILY AND THE WEEK, AS JOURNEYS** — step 6 of the Act 1 ship plan
(ACT1.md §12). `?daily` and `?week` opened the real-time game; they are card
journeys now, and `&classic` keeps the real-time versions.

- **`js/modes.js`** says which shift a visit is: a run of the ladder,
  today's daily (MEDIUM's rules on the date's seed, `&date=` to pin one), or
  a day of the week (`week.js`'s seed for that day).
- **The daily** has no memory and no regulars' standing, so it is the same
  shift on every device. The first finish stands (`tokoMoveDaily`, shared
  with `?classic`), and a replay says it is practice. The end card has the
  grid, the euros, the streak and a line to copy.
- **The week** banks each delivery as it lands, so leaving mid-shift
  clocks out with it. The title shows the five days and the pace, and
  Friday's end card is the rent. It has its own save (`tokoMoveWeek3`),
  because a `?classic` week is scored in points; the real-time kit stays
  there too.
- **Routing:** `boot.js` no longer sends `daily`/`week` to the real-time
  game. In the real-time game, its title links and its own week
  navigation (A NEW WEEK, the next shift, a kit pick) carry `&classic`.
  Otherwise a classic week would have walked into the journey on Tuesday.
- **Gates moved with it:** `daily.cjs`, `week.cjs`, `ship.cjs`, `lang.cjs`
  and `tools/stills.cjs` drive the real-time versions at `&classic`.
- **Finnish:** a line with " · " is translated part by part. The first
  patterns for "Daily 43 · 4 Nov · 07:00" were whole-line and never fired,
  so the parts have their own patterns now.

Gates: `test/play.cjs` 78 (`?daily` is the journey, ends on its grid, stands
and shares, and a replay says what stands; `?week` seeded at Friday closes on
the rent and leaves a classic week untouched); `daily.cjs` 20, `week.cjs` 31,
`ship.cjs` 23 and `lang.cjs` 19 at `&classic`.

## v3.5 — 2026-11-04

**THE RIVAL, THE REGULARS AND THE SEALED PARCEL** — step 5 of the Act 1 ship
plan: the real-time game's three run-modifiers (`rival.js`, `regulars.js`,
`sealed.js`) on the journey (ACT1.md §11). Each adds a line or a card, never a
screen, and each keeps the memory `?classic` already writes.

- **The race (MEDIUM and HARD).** One dispatch a run: *"The other courier
  wants it too."* **Race her** shows her time on the button, which is the
  best route at the run's pace (MEDIUM ×1.2, HARD ×1.1). The strip carries
  *beat her by 07:33* in place of the minutes left. Beat it for ×1.3, or
  she gets there first and it is ×0.6. There are no dice: the time your
  choices took decides it. Over 40 MEDIUM runs the left-tapper wins 21
  and loses 13.
- **The regulars.** A job to Riikka's Ooppera (or Seppo's Hakaniemi, Mirja's
  Länsiterminaali, Tuomas's Meilahti, Anneli's Kauppatori, Kaarlo's Arabia)
  names her on the card and on the strip. On time, she tips from her
  standing (12% of the fee a step) and the standing rises; late, it falls.
  It is kept in `tokoMoveRegulars`, the same store `?classic` uses.
- **The sealed parcel (from a fourth run, not EASY).** The second job has no
  address, only a sticker (×1.5): *"The label says: you'll know the
  stop."* You can **Ride the 12 and watch** (free) or **Ask at the kiosk**
  (+0:40), which names it. Boarding that line names it too (*"Aboard the
  12, the label makes sense: Kamppi."*). Until then, the strip says
  *SEALED · 12*, and the corner map and the board draw no drop: `dropOf()`
  in `play.js` is the one place that answers. Delivered, it writes a line
  in the notebook `?classic` keeps, and the stamp shows it.
- None of the three spends the run's rng (the race's job and the sealed line
  come from a hash of the seed), so the bands did not move a job.

Gates: `test/journey.mjs` 201 (no race on EASY or NIGHT; one on MEDIUM and
HARD; the race card's clock; both outcomes, decided by time; a regular
named, tipping, rising; the sealed parcel only from a fourth run and never
on EASY, hidden on the route card, named by the kiosk and by its line;
the notebook written). `test/play.cjs` 71 (a fourth MEDIUM run: the sealed
card and SEALED strip, the race on the button, the race settled and the
notebook line on the stamp). Finnish: 8 lines, 10 patterns.

## v3.4 — 2026-11-03

**THE CITY REMEMBERS** — step 4 of the Act 1 ship plan: story arcs, adapted
from the itch bible's twist cards (`art/itch-bible/CARDS.md`) to the
journey and written into `ACT1.md` §10 before a line of code.

- **In a run.** An option can `set` a flag, and its CALLBACK card takes the
  next job's card slot: walk the granny across Mannerheimintie and she is on
  your tram later with the seat by the door saved; hold the top of the
  spruce and the spruce man, without the spruce, insists on carrying your
  parcel; let the seagull pose and it comes back with a friend.
- **Across runs.** Two ARCS are kept on the device (`tokoMoveMemory`, its own
  key, an allow-list of counters) and passed into `newRun`, so a seed and a
  memory replay exactly. A run deals at most one step, never on a first
  run, and an arc step keeps its slot against a callback.
  - **Dispatch** (the spine): four steps, one a run. *"Don't shake the blue
    one."* → letters from the same sender → *"Just one, by hand. She asked
    for you."* (Aino, in Kallio, with coffee: ×1.5) → *"And one for the
    east, if you ever find it."* No line goes there.
  - **The 1987 ticket:** found on NIGHT, still warm; keep it and a later
    day's inspector asks where you got it (*maybe* ×1.3, or he keeps it for
    the museum).
- A run with no memory deals exactly the deck it always did (no rng is
  spent on arcs). The bands move by a job or two where bots trigger the
  callbacks: MEDIUM's left-tapper 49→48 completes of 60, HARD's 41→42.
- **Fixed on the way:** `lang.cjs` failed on main one run in three with
  "CROSS THE CROWN BRIDGE" left in English — the test card's toast
  uppercases its mission title and only some draws show it. `lang.js` now
  translates a line the table knows when it is SHOUTED.

Gates: `test/journey.mjs` 191 (no arc without a memory; never on a first
run; the step the memory says is next; one a run in its own slot; Dispatch
met and kept; the inspector closes the ticket arc; a callback only after
its choice, and the granny does come back; a seed with a memory replays);
`test/play.cjs` 67 (a second EASY opens with Dispatch, and the memory is
kept after the run). 47 new Finnish lines.

## v3.3 — 2026-11-03

**THE OLD TRAMS FROM INSIDE** — step 3 of the Act 1 ship plan. v3.1 drew six
tram models at the stop (look only, ACT1.md §6), and then every one of them
was the same modern car inside. Now the museum tram is varnished wood with
slatted benches, brass poles, leather straps and a bell rope along the
ceiling; the Nr I and Nr II are the 1970s inside as well as out — orange
ribbed vinyl, beige laminate, chrome. The Artic, the Variotram and the
Nr II+ keep the car as painted. They still ride exactly the same.

- `art/minimal-metro-look/make_interiors.py` makes them from the plate the
  game already ships, so they cannot drift from it: the plate is flat
  vector, so each colour family (seat, wall, pole, frame) is a handful of
  tones, and each is moved to its target with its shading kept.
- Two traps, both found by looking at a render, not by a check: the
  antialiased seam where a blue seat meets a cream wall belongs to neither
  family and came out as a white fringe round every seat (and the 1px
  highlight along each seat back with it); and part of the seat was cut
  WITH the riders, so blue cushion showed under them in a wooden car. The
  people and courier layers are moved too, by a strict test, since the
  courier's navy jacket is the seat's hue (it is more saturated).
- And one a colour test cannot solve: where the seat shows through the gap
  between the courier's knees it is LIT, and lit seat is exactly the
  jacket's blue. Shape solves it: the jacket is a few large patches of blue
  and the gap a small one. The first cut kept only the largest patch and
  turned half the jacket brown (the strap and the shirt cut it in two); the
  second kept the gap blue, because the seat pixels the strict test had
  just moved were the bridge joining it to the jacket. Patches are found
  after the strict test now, and only the small ones move.
- `play.js` picks the car from the hop's model; the night car stays the
  night car. Six new layers per format, about 570 KB in all.

Gate: `test/play.cjs` plays seed 1197's EASY, which rides the museum tram
and then an Nr II, and reads the car layer on screen for each (no 404s).

## v3.2 — 2026-11-03

**SOUND FOR THE JOURNEY** — step 2 of the Act 1 ship plan (`ROADMAP.md`;
owner, 2026-11-03: *"keep going with upgrading through a plan"*). The card
journey had been silent since v3.0: only `?classic` carried the house kit.
The same kit now plays the journey, through the same master gain and the
same kept mute (`tokoMoveSound`), so a mute set in either game holds in both.

- **Called, not inferred.** `?classic` hears itself by watching state
  (`poll`); the journey stages every moment itself, so `play.js` calls the
  kit at each: a card dealt (a paper flick; a halt gets the two-pip
  warning), a tap, the tram's **ding-ding** as it pulls in (the museum tram
  strikes three, lower; the night's tram with no number arrives in
  silence), the rails clacking or footsteps for a hop, a risk that worked
  (up) or did not (down), euros changing hands (a coin), the stamp's thump
  and then the delivery's arpeggio (or the late slide), the forecast's
  chime, the end, and a longer fanfare for ACT 1 COMPLETE.
- **Beds.** `audio.bed()` is a quiet loop that follows the weather on
  screen — bandpassed rain, wind through snow, fog, and a low hum at night
  — crossfading as the scene changes and falling silent inside the car,
  where the weather is never drawn either. A hidden tab suspends the
  context, so a bed never hisses on under somebody else's page.
- **The toggle.** ♪, 44px, top-right; the HUB button owns the top-left, and
  on a phone the pill moves in from both sides to clear them.
- Sound is not motion: under `prefers-reduced-motion` the drive-in is still,
  and its bell still rings.

Synthesised, never sampled, nothing fetched, so the store zip stays one
file with nothing outside it.

Gates: `test/play.cjs` hears an EASY run (forecast, deal, tap, bell, a hop,
the stamp, a delivery, the end), measures the toggle (44px, top-right, clear
of the pill and the HUB button) and checks ♪ is a real mute at once and
kept; HARD has its snow or rain bed under the stop and quiet in the car;
NIGHT hums; and the night's wider pill, and a 320px phone's, clear the HUB
button and ♪ (the pill is now measured into the space between them —
`fitTop()` — after a fixed margin put the night's under the HUB button).
`test/ship.cjs`'s S6 still holds `?classic`'s sound, which now shares the
module.

## v3.1 — 2026-11-03

**ACT 1: HELSINKI** (owner, 2026-11-02: *"The trams in the bible look a bit
like the latest Helsinki trams, but we have older and even older models with
distinct visual look. That and key stations should have more visual
indicators. And design random events and funny situations that can happen.
Card choices should also have some risk factors as well as added time, risks
can add positive and negative multipliers. Snow will impact walking routes,
but also congest trams … selling the package to someone else can gain big
bucks, but also hint at what the packages might contain … focus on making act1
the playable for now … UI animations and effects will be a big polish issue
for shipping the Helsinki act"*).

Signed off 2026-11-03:

- **The act:** Act 1 is just Helsinki, as a complete experience. It is the
  four runs: *"easy and medium that are more fun, hard is more risky and
  difficult and night is a bit more scary and very risky"*.
- **Risk:** stakes shown, with the odds in words.
- **Money:** euros, not points.
- **Trams:** look only, *"museum quality trams are super rare, but there are
  many tiers in between"*.

The design is `ACT1.md`.

### The deck (`js/cards.js`)

There are 36 Helsinki cards, each with a tone:

- **fun:** the seagull on your parcel, the choir doing Finlandia, the man with
  a whole spruce, the public sauna at quarter to eight, the dog in a tiny
  raincoat walking itself to work;
- **risky:** run for the red light, the gap in the rail-yard fence, the
  parcel held above your head in the rush;
- **scary:** the tram with no number, someone humming your ringtone, the
  reindeer on Mannerheimintie nobody else can see.

Each run deals one card per job from its own tones and its shift's weather.

**A button can carry stakes.** They show under its label, with the odds as a
word: *usually* is 75%, *maybe* 50%, *long shot* 25%. The words are fixed, so
a player can learn them, and the gate holds each to within 8 points over
thousands of rolls. What a choice did is a **reveal**: the line (often the
funny one) and its chips.

**Selling the parcel** is a family of buyers:

- a vappu student;
- a dentist who decides it is the crowns;
- the rival courier, who pays half the time in Monopoly money;
- at night, a woman in a long coat who knows your name.

Every buyer **names what was inside**. Every job has hidden contents (*"a whole
salmon, looking at you"*, *"a USB stick labelled DO NOT"*). A buyer, the rain
or curiosity can name them; otherwise the delivery stamp does: *"Signed for:
…"*. A sale pays now, but the job is gone. **Dispatch hears**, so every fee
after it is ×0.85. Without that, a sale was free money on any clock with room
in it: the left-tapper sold in 24 of 60 EASY shifts and still finished every
one.

### Euros

A job pays a **fee**: €8 plus about €1.10 per minute of the best route, times
the parcel's size pay. These multiply it:

- an on-time streak;
- late, which halves it;
- every risk that lands on the job (the strip shows the job's ×).

The run's score is **€ banked**. Pars are now €65, €110, €120 and €140.

### Weather (per shift, from the run's skies)

| run | skies |
|---|---|
| EASY | clear |
| MEDIUM | clear, rain or snow |
| HARD | snow or rain |
| NIGHT | fog, rain or snow |

- **Snow:** walks ×1.4 and tram waits ×1.3, and trams are full more often.
  Every walk can slip you (*usually* fine · or +1:30, and someone helps you
  up).
- **Rain:** walks ×1.1, and a paper parcel on a walk can get wet (*maybe* · or
  ×0.7).

Deadlines are set from the weather, so it is slow, not unfair. The shift opens
on a weather stamp, and snow, rain or fog falls on the stop and the board.

### The stop (`art/minimal-metro-look/make_act1.py`)

Drawn in the art pack's own iso camera and palette:

- **Six tram models, look only:** Artic (40%), Nr II+ (22%), Variotram (14%),
  Nr II (12%), Nr I (10%) and the museum tram (2%). The model you ride
  **drives in** at the stop, with the line's number on its chip, and **drives
  out** when you arrive. The in-car display names it. The museum tram gets its
  own stamp.
- **Twelve key stations stand behind their landmark.** The station clock
  tower, the cathedral, the SkyWheel (turning) and the tents, the Chapel of
  Silence, Kallio's tower, the brick market hall, the opera, Amos Rex's
  domes, a ferry (bobbing), the shipyard cranes, Kalasatama's and Pasila's
  towers. Each is placed where a phone's crop and a phone held sideways both
  keep it in view.
- **Every stop has its plate:** its name and its lines, ringed in yellow at a
  key station.
- **NIGHT** dims every layer on its own, so the tram with no number glows.

### Motion

- The € counter rolls and bumps.
- A job's dot pops.
- The deadline ring drains smoothly.
- Cards stamp in, and reveals bump in.
- Trams drive along the track.
- Weather falls.

Every one of them is skippable by a tap, and still under
`prefers-reduced-motion`. The end card says what you earned and lists **what
you carried**.

### Measured (`node test/journey.mjs`: sixty fresh shifts, reader / left-tapper)

| run | reader | left-tapper |
|---|---|---|
| EASY | 60/60 (60 on time) | 60/60 (58) |
| MEDIUM | 57/60 (33) | 49/60 (15) |
| HARD | 54/60 (15) | 41/60 (7) |
| NIGHT | 40/60 (12) | 34/60 (4) |

NIGHT is the very risky one. MEDIUM first measured *harder* than HARD for the
left-tapper (39 against 41), because its jobs reached further, so its reach
went from 20 to 16 minutes.

### Gates

- `test/journey.mjs` is now 180 checks: the deck's shape, tones and weather;
  the odds; the stakes; a sale; the fee; the contents named on every drop; the
  weather's effects; the tram models' rarity; the bands.
- `test/play.cjs` checks, through the real buttons:
  - the weather stamp;
  - the landmark and the plate;
  - the € pill and the fee on Take it;
  - a risky button's stakes and its reveal;
  - the tram model and its chip;
  - the delivery stamp's contents;
  - the end card's euros and what you carried;
  - HARD's weather on the stop;
  - NIGHT's glowing museum tram;
  - all of it in Finnish with no misses.
- `ship.cjs` no longer reads the page before a week's next day has booted (a
  race it lost once under load).

What it does not have yet:

- New interiors for the old trams (the plates are the Artic's).
- Sound.
- The daily and the week as journeys.

## v3.0 — 2026-11-02

**THE CARD JOURNEY** (owner: *"We need more of the new design, less of the old
map with visible trams on a realistic schedule. The new art bibles is what we
are going from as an experience and occasionally you should feel like the
trams have some realism but it's less actual schedule, more curated narrative
roguelike with fun choices and minimalistic visuals"*). Signed off in three
answers: **turn-based card hops**; **the scenes as the main view, the board
between moments**; and **a slim job strip** kept from the old UI.

The bare address is a new game on the same city. A shift is a run of **cards**,
each in the art bible's grammar: a Toko face, one line, two buttons with a
price. The **clock moves only by the prices you choose**, so nothing happens
while you read.

- **Dispatch:** *"Documents for Kamppi."* Take it, or pay a minute to ask for
  another.
- **At a stop:** where to go from here, for example *"4 to Lasipalatsi · +6:00"*
  or *"Walk to Kamppi · +5:00"*. The price is this hop's. The left button is
  the cheaper hop, not always the right one, because the choice is where it
  leaves you.
- **The deck's cards** happen at a stop, aboard or on foot.
- **HARD halts a line:** route round it for free, or wait it out at its honest
  price.

The network is real: 23 named places, every HSL line variant between them,
and the walks between neighbours. The times are plausible but never a
timetable. A ride is distance along the line at a tram's or the metro's pace,
plus a wait drawn from the line's headway. On HARD the rush sometimes fills
the first tram.

**The screen is the art bible's** (`js/play.js`):

- **A stop** is the iso stop scene and **a ride** is the tram interior, or the
  night car on NIGHT. Each is the layer stack from
  `art/minimal-metro-look/layers/`, cut to WebP in both native plates
  (`scenes/`, 744 KB). Each layer moves per its MOTION.md: the window scrolls,
  the car sways, the riders lag the sway, and the stop's people shift their
  weight. Every scene opens with a push-in of at most 4%.
- **The in-car display** says the line, where it is going and the next stop.
- **Between moments, the board** (`js/hopboard.js`) shows the courier disc
  snapping onto its line's pill and riding the real HSL geometry to the next
  stop. A walk is an ink dash.
- **The corner MAP** shows here, the drop, and the two offers as their own
  paths. Tap it for the whole board.
- **The HUD** is one pill (the clock rolls to its new time, the job dots and
  the deadline ring) and **the strip**: *Documents → KAMPPI · 9 min left*.
- **A delivery** is a stamp on the stop.
- Every animation is skippable with a tap, and none of them is something the
  game waits on to be fair.

**The model is pure** (`js/journey.js`: no DOM and no clock, deterministic from
a seed, with its rng in one integer).

**Measured, not guessed** (`node test/journey.mjs`): sixty fresh shifts of
every run, one bot that reads the board and one that taps left every time.
Completed, reader / left-tapper (on time in brackets):

| run | reader | left-tapper |
|---|---|---|
| EASY | 60/60 (60) | 60/60 (55) |
| MEDIUM | 57/60 (41) | 44/60 (15) |
| HARD | 53/60 (22) | 35/60 (8) |
| NIGHT | 48/60 (24) | 26/60 (3) |

Par was re-set to the reader's 70th percentile: 720, 1330, 1380 and 1580.
Two things the measurement changed:

- **NIGHT's deadlines were first set from daytime waits.** That put 2 of 40
  night jobs on time. The best-route table is now per run.
- **One stop card in five had a single button.** The second option now falls
  back to another line to the same stop, because two lines with two waits is
  still a choice. 93% of stop cards now offer two.

**The real-time game is `?classic`** (`js/boot.js`). It also opens for every
tester or share link that names one of its modes (`?shift`, `?daily`, `?day`,
`?weather`, `?rush`, `?kit`, `?week`, `?live`, `?skin`, `?mutator`). So a
shared daily still works, and the daily, the week and LIVE still open after
NIGHT. Its ladder keeps its own links (`runHref` keeps `classic`).

Gates:

- New: `test/journey.mjs` (156 checks: the network, the card grammar, the
  rules a hop keeps, the clock as the sum of the prices, determinism, the
  halt, the deck, the bands) and `test/play.cjs` (40 checks).
  - play.cjs plays EASY on a phone by tapping only, to COMPLETE and NEXT ·
    MEDIUM.
  - It checks the scenes, the in-car display, the board, the strip, the MAP,
    and that the clock is the run's at every card.
  - It also covers HARD's halt card with the pulsing tram, NIGHT in the night
    car, a whole run in Finnish with no misses, sideways, and `?classic`.
- Moved to `?classic`: `runs.cjs`, `stranger.cjs` and `lang.cjs`'s ladder
  run.
- `itch.cjs` plays the journey from the zip, then `?classic`.
- `cabinet-route.cjs` lands on the journey.

What it does not have yet:

- The sealed parcel, the rival and the regulars.
- Sound.
- A card deck written for the journey. It plays the classic deck, re-priced
  at 1.5 s a tick.

The daily and the week are still the real-time game.

## v2.73 — 2026-11-01

**THE LADDER: EASY, MEDIUM, HARD, NIGHT** (owner: *"make it a much more of a
structured experience. Easy, medium, hard and night runs. Each unlocked after
the easier is completed … redesign a lot of the basics around the new
direction"*). Signed off in three answers: the ladder first and the rest after
it; a **new shift every attempt**; a run is **completed by delivering every
job**, with stars on top that gate nothing.

The game is now four runs (`js/runs.js`). The bare address IS the ladder: a
new player sees EASY open and three runs locked, and each locked row says
what opens it. Every attempt is a fresh shift. Delivering every job completes
the run (late is allowed and costs score) and opens the next. The end card
gives **★** for done, **★★** for every job on time and **★★★** for on time at
par, says what opened, and its loud button is **NEXT · MEDIUM**. Clearing
NIGHT opens **the daily and the week**, which keep the classic rules; LIVE
waits there as well.

| run | jobs | the rules |
|---|---|---|
| EASY · First shift | 3 | a short board (the three cheapest jobs that fit, no hand-offs), deadlines ×1.5, plain parcels only, one kind card at a stop or aboard, clear sky, no rival, no sealed parcel, no held lines |
| MEDIUM · A morning | 4 | the classic game: every parcel, the morning rush, the city day and weather drawn, the rival, the sealed parcel |
| HARD · Rush hour, one line down | 5 | the rush at its peak, 0.6× headway, a tram family halted from ten minutes in, warning cards |
| NIGHT · Last service | 5 | the night board from 23:00, twice the headway, deadlines ×0.9, night cards |

**Measured, not guessed** (`node test/shifts.cjs --runs=12` — a new mode: twelve
fresh shifts of each run, sensible and naive bots, completed sensible/naive):
EASY 12/12 · 12/12, MEDIUM 12/12 · 10/12, HARD 12/12 · 6/12, NIGHT 12/12 ·
5/12. A player who reads the board can clear the ladder; one who taps the
first thing on it is stopped higher on each rung. Three first guesses were
wrong and the measurement says why: MEDIUM at three jobs was flat against
EASY (12/12 both), HARD's ×0.9 deadline left 3 of 12 on time (two stars a
rumour), and NIGHT at four jobs was easier than HARD for the naive player.
Par is about the sensible bot's 70th percentile of completed scores.

**EASY had to be unlosable for someone who taps what lights**, and the bots
could not see why it was not: the ladder gate's tapping player lost one fresh
EASY shift 2/3. After every delivery the first thing on the board was a
**hand-off** of unknown length (the board also listed one job that took most
of the shift), and a player who takes the first thing listed took it. EASY
now has a **short board** — the three cheapest jobs that fit, no hand-off —
and its one card always happens at a stop or aboard, because on some shifts
it was a walking card that a player who never walks never meets. Measured
with the tapping player on ten fresh EASY shifts: 10/10 complete.

**The basics that moved with it.**
- **The mutator chips are gone** (v2.70's row): NIGHT is a run, and the rush
  and the held line are HARD's. `mutators.js` keeps only the shared levers.
- **Any tester parameter keeps the classic rules** (`?shift=`, `?daily`,
  `?day=`, `?weather=`, `?rush=`, `?kit=`), so the gates written against them
  still measure what they measured. `?shift=N&run=X` plays a run on a pinned
  shift.
- **The title card** carries the ladder beside START SHIFT, and the shift
  label is not repeated above it. The goal line counts the run's jobs (*Five
  deliveries before 00:15*).
- **A run decides** the jobs (`targetOverride`), the parcels (`cargoPool`,
  which also feeds the drops and hand-offs), the deadlines (through the same
  `limit` the kit uses), and whether the rival, the sealed parcel, a city day
  or a held line are in it at all.
- **LIVE's link ignored `hidden`**: `#liveLink` is styled `display:block`, which
  beats the attribute, so "OR LIVE" showed wherever it was meant to be hidden.
  It now waits behind NIGHT with the daily and the week (`live.cjs` checks both
  sides of that).
- **A phone held sideways** is 390px tall, and four ladder rows pushed START
  off it (`ship.cjs` S4 caught it): on a short screen the ladder is one row of
  four names.

Gates: `test/runs.mjs` (bare node: the table, what opens what, stars, a broken
or forged save, which visit plays which run, and the levers the v2.70
mutators' checks held) and `test/runs.cjs`, a browser gate: a new player's
ladder; EASY played out by tapping only, ending complete and opening MEDIUM,
with NEXT going there; a fresh shift every attempt; HARD's rush and held line;
NIGHT's board and clock; what clearing NIGHT opens; and the Finnish. They
replace `mutators.mjs` and `mutators.cjs`. `daily.cjs` and `week.cjs` now
reach the daily at `?daily`. The stills add the ladder and the EASY-complete
card; the store copy describes the four runs.

## v2.72 — 2026-11-01

**A STRANGER MEETS THE CARDS, AND THE STORE PAGE SHOWS THE GAME IT SELLS**
(the itch package slice; owner: *"Itch package — cover + stills … once the
in-game UI matches"*).

**The event director dealt from the head of its queue only**, so a card
waiting for the courier to be somewhere held back every card behind it.
Shift 1 deals a *walking* card first, and a player who only taps CATCH never
walks — so they met **none** of the shift's four cards. That was true on
v2.68 as well (checked on its tree); it came to light because the store
stills could no longer find an event card to photograph. The director now
deals the first **due** card whose place this is; a held line keeps its own
time and never waits behind a card at all (v2.70 had made that true only for
a Disruption run's halt). And a card is now due **at its time or by its job,
whichever is first** — the n-th card once n deliveries are done — because the
times assume all seventy-five minutes, and a quick courier who finished three
jobs by half-time left two of the three undealt. Job one is never interrupted
early. `test/stranger.cjs` now fails if a stranger who never walks meets no
card (all three of its runs meet one now), and `events.mjs` holds both rules
in bare node.

Two things fell out of cards actually firing: the **sealed parcel's label**
was dropped whenever another card was already open — it now waits at the
front of the deal, and since a label has no place it opens wherever the
courier is (`where: 'any'`); and the **itch gate's** scripted player caught
the nearest tram in *either* direction, so once a card moved the timing it
boarded one going away from the drop and rode past its budget — it now takes
the leg's own direction, and delivers by tick 861.

**The stills come from the new look.** `tools/stills.cjs` renders ten
phone stills from the store build — the six it had, plus one per core
mutator, each chosen by its chip on the title card and played by tapping
(`07-night`, `08-disruption`, `09-rush-hour`, `10-snow-day`; MUTATORS.md:
*"one still each"*) — and the cover the bible asks for: the day board with
tram 12 over the water, the HUD pill in the corner, and the name on paper
with the courier's cyan as its full stop (the first cover put a dark band
under a board that has since become paper). `store/ITCH.md` describes the
mutators and the sealed parcel and lists the new stills.

## v2.71 — 2026-11-01

**THE SEALED PARCEL, AND A NOTEBOOK THAT NEVER EXPLAINS ITSELF**
(NARRATIVE-TWISTS.md §1, the first run-modifier; owner: *"Now, make the
game"*). *"Every run deals one parcel with no address, only a Toko sticker,
and you learn where it goes by riding."* `js/sealed.js`:

- **The second dispatch deals one sealed offer** — never the first job (it
  teaches, and stays exactly as it was), never the first offer listed, seeded
  by the shift, and only an offer whose quickest plan ends on a **tram
  family**, because the offer says nothing but `✉ SEALED · ride the 2`.
- **Taken, its stop is SEALED** wherever the game names a stop: the panel, the
  plan rows, the feed, and the board, which draws no ring, no flag and no
  forced label for it. Two seams carry that rather than a check at every place
  a stop is named — the challenge's `name()` and the city's `nameOverride`,
  which the job board and the plan rows read.
- **The card** is the bible's, on an info face: *"The label says: you'll know
  the stop."* — `Ride the 2 and watch · +0 s` or `Ask at the kiosk · +40 s`.
- **It opens aboard the family the label named**: the stop is named in the
  feed and its flag lights ahead of you. The kiosk opens it at once.
- **Delivered, the notebook gains a line** — the stop and one sentence from a
  list that never explains itself (*"The sticker was warm."*). It is kept on
  this device, shown on the end card, and on the title card under
  `✉ NOTEBOOK · n` the next time the game is opened. Nothing in it names a
  place the game does not have: Toko Move carries nothing of Piritori (the
  bible's "East of Piritori" door is deliberately not built).

A run-modifier never re-skins (MUTATORS.md), and this one rides on every
kind of run but LIVE — the daily included, since the parcel is part of the
day everybody plays.

Gates: `test/sealed.mjs` (bare node — which offer, the notebook and its
store, blocked and mangled storage, the card's prices, Finnish for every
line) and `test/sealed.cjs` (a browser — the sealed offer taken by tapping
it, SEALED in every name and never in the panel, opened aboard the right
family, the notebook line on the end card and the title card, and the kiosk
path).

## v2.70 — 2026-11-01

**FOUR MUTATORS, FROM THE FIRST RUN** (MUTATORS.md, itch v1's core set;
owner: *"Now, make the game"*). The title card has a row — DAY · NIGHT ·
DISRUPTION · RUSH HOUR · SNOW DAY — and a run wears one. Each chip is a link,
because a run is decided at boot: choosing one starts a fresh page wearing it,
and DAY takes it off. The row sits beside START SHIFT, where the choice is
made, with the chosen mutator's one sentence under it (inside the title's
scrolling body it was below the fold on a phone). `js/mutators.js` is the table, and every entry is a
setting on a lever the game already had, which is the bible's own limit — a
mutator never changes the verbs, never adds a currency, never draws a route:

- **NIGHT** — the night skin, the clock from **23:00** (the title says so, and
  the goal reads *before 00:15*), every line provisioned to **2×** the headway,
  no rush (opposite hours), no low sun. Cards lean to facts and notices.
- **DISRUPTION** — one **tram family** (seeded, never the metro: the bible's
  safe spine) is **halted from ten minutes in**, every variant of it, drawn as
  grey dashes with grey trams. It lifts when **two jobs** are done or after
  28–44 minutes, and the feed says so. It keeps its own time: an encounter
  waiting for the courier to be somewhere no longer holds a halt back behind it
  (the chance disruption of an ordinary shift is unchanged).
- **RUSH HOUR** — the rush **at its peak all shift** (the RUSH chip, full
  trams, the surge on pay) and every line at **0.6×** the headway.
- **SNOW DAY** — the snow skin and the first-snow weather: services a fifth
  slower, feet two fifths slower (the bible's ×0.7), kinder cards.

**A mutator is the day**: no city event is drawn on top of it, and no weather
but its own — one mutator per run (MUTATORS.md). **Today's address under a
mutator is today's city but not the daily**: same seed, its own kind, never
recorded, so the one result everybody compares stays comparable. LIVE and the
week wear none. Card moods follow the bible's bias (`pickWeighted`), and with
no mutator the director deals exactly the schedule it always did — `mutators.mjs`
compares sixty seeds card for card.

Gates: `test/mutators.mjs` (bare node — the table against the bible, each
lever, the halt, the mood shares moving the right way and no-mutator dealing
the old deck) and `test/mutators.cjs` (a browser — the row on the title card,
choosing by tapping a chip, then each mutator played out by tapping only, with
its promise checked on screen: 23:00 and past midnight, the held family from
~10 min lifting by the second job, RUSH from first tick to last, the snow skin;
and the Finnish for every new line).

## v2.69 — 2026-11-01

**THE BOARD IS PAPER, AND THE HUD IS ONE PILL** (art bible §1/§3/§4, the
second slice of the minimal-metro look; owner: *"Now, make the game"*). The
bible made **Day paper the default** board and Night a mutator — *"Default (no
mutator) is the Day skin"* — so `js/skin.js` holds three skins as colour only:
**Day** (`#f4f1e8` paper, the bible's day tram inks), **Night** (the owner's
grey night board from `board.js`, kept whole, metro lifted to `#ff6a3d`) and
**Snow** (Day with the paper about 6% lighter and grey-blue water). A skin
never moves geometry. Which one a run wears is `skinFor`: a mutator decides,
`?skin=` wins for a link, and a city day that snows already IS the Snow Day the
bible describes. Every line, chip and pill reads `layer.colour`, so
`applySkin` recolours the pack once and the whole board follows.

- **The courier is a disc**: Toko cyan, a white ring, a white parcel, an ink
  edge and a soft shadow — the only cyan-filled thing on the board, told apart
  by shape as well as colour, because tram 2 is a teal too. The walk callout
  used to sit on it (the hub you would walk to is usually a minute away); it
  now lifts clear, since the courier is the one thing always on top.
- **The metro is drawn last, 1.6× wide, on a casing in the ground colour**, so
  every tram reads as crossing it.
- **A held line is grey dashes** (`#b8c2c6`) on its own geometry, and its trams
  go grey with it — a disruption now shows on the board, not only on the card.
- **The HUD is clock · ●●○ · the deadline ring in one pill.** The ring is navy
  while there is time (mint on night) and **coral under 30%** — it was the
  cargo's colour, which said what you carry (the glyph inside already does)
  and nothing about time. The minutes-left number and the next-stop label left
  the bar: the ring is the deadline and the sheet names the stop. The minutes
  are still on the ring's title. Score and the streak stay beside the pill,
  because a delivery still pops them.
- **Night darkens the bar** (`body.skin-night`); the sheet stays paper for now
  — the night cards are the mutator slice's.

Gate: `test/skin.mjs` (153 checks) holds the bible's own floors — every day ink
3:1 on paper, no two day lines closer than dE 18 (the worst pair, 2 and 12, is
18.3), none within dE 18 of the courier's cyan, water never reading as the
courier — and scans `core-v212.js` for every `SK.` key so no skin can be
missing one the board draws.

## v2.68 — 2026-11-01

**THE EVENT CARDS WEAR TOKO'S FACE** (PR #631, the first slice of the
minimal-metro look, art bible §4; owner: *"Playtest PR #631 … so the faces and
+N s buttons feel right on phone"*). The card's face is the traced master on a
mood disc — yellow for a favour, cyan for a fact, coral for a risk and every
held line, deep teal for an inspector — with one line of text and big pill
buttons that each say what they cost: `+N s`, the free way past `+0 s`. Held
lines are the same card, coral, no buttons: `1 is held · 6 min`.

Landed with what stopped the PR shipping, found by running the gates its
branch could not:
- **The store build refused it.** `events.js` imports `toko/js/master.js`
  from outside the game folder and the itch packager (rightly) refused a zip
  that reaches outside itself. `package-itch.mjs` now carries a short SHARED
  list — that one file, at the same relative place, so no import is
  rewritten.
- **The token gate.** `main-v212.js` changed under the same `?v=`, so a
  returning player could keep `events.js?v=5` from cache and never see the new
  cards; and `job-board-v212.js` had drifted on main the same way
  (`f4869b1f`). Both moved.
- **Finnish.** Main's new first-job hint ("Tap a job below. Then tap the lit
  tram to board.") and October's walking and cargo cards had no Finnish — the
  played-shift gate only meets the cards its seeds draw. `test/lang.cjs` now
  also checks every card's words directly, drawn or not (36 lines).

**Playtested on a 390px phone viewport**, every card presented, measured and
answered with a real tap, in both languages: faces render, nothing overflows,
every card fits on screen. One change from it: a long label in a half-width
pill wrapped to four lines ("Papers, please — waved through" made an 82px
pill), so a card whose options run past 18 characters stacks them full width —
every pill is 52px now. Two things the bible's one-line card gives up on a
phone, left as the bible has them and noted for the owner: a held line's cause
and an option's score/note live in a tooltip, and touch has no hover.

The PR also fixed `esc()` in events.js, which mapped every character to
itself.

## v2.67 — 2026-10-24

**THE SHIP BAR** (owner: *"We need a shippable Toko Move before considering
itch.io"*). Shippable was defined first, as seven things a stranger's phone
does to a game that no feature test does on purpose (ROADMAP.md, "The ship
bar"); an audit measured each one before anything was built, and
`test/ship.cjs` (23, in CI) now holds them. Three reverted fixes at once fail
it exactly where they should.

- **S3 — storage that throws stopped the game loading at all.** A private
  window or blocked site data makes even *reading* `localStorage` throw, and
  `regulars.js` and `knowledge.js` read it in a default parameter, outside
  their try. Both guarded. And a week save that was valid JSON in the wrong
  shape loaded (it only had to HAVE a shifts array) and crashed at the kit
  night several screens later; `wellFormed()` now decides, and a save that is
  not a week is a fresh week. The daily's record for today is checked the
  same way.
- **S2 — leaving mid-shift was silent.** The clock's catch-up cap already kept
  a hidden tab from fast-forwarding, but nothing said so and the shift resumed
  under the player's thumb. Hidden now pauses, and coming back shows PAUSED
  with RESUME. LIVE is real time and is left alone; a pause made by hand gets
  no card.
- **S4 — a phone held sideways got a 195px strip of map** and the CATCH row at
  the bottom edge. Short landscape screens now get the side-by-side layout the
  tablet already had. At 320px the cost column no longer squeezes the
  destination into a column one word wide.
- **S6 — the game made no sound.** `js/audio.js`: synthesised (never sampled,
  nothing fetched), one master gain, a ♪ mute in the HUD that is kept.
  It watches the game the way juice.js does — catch, get-off, delivery, late,
  drop, chain, event card, miss, end of shift — so it cannot ring for
  something that did not happen. Nothing before the first touch.
- **S7 — the credits were only on the map canvas.** The title card now names
  HSL (CC BY 4.0), OpenStreetMap contributors (ODbL 1.0) and the City of
  Helsinki, in both languages.
- **S1 — nothing had ever played a whole week.** The gate now plays Monday to
  Friday's rent by tapping what lights: 3/3 deliveries every day, RENT PAID,
  the page and the heap flat across all five (DOM 492 → 483, 11.2 → 11.2 MB).
- **S5 — frame cost, measured, and two fixes.** Profiled on a phone viewport,
  the largest JavaScript in a frame was `nearestTo` walking every vehicle in
  the city to find the few on one line, inside a search that steps tick by
  tick: the fleet is indexed by line now (rebuilt whenever LIVE replaces or
  grows the array), 133–169 ms → 39 ms per 4 s. Next, `projection()` looked
  the canvas up by id once per drawn point, and `sheetSlot()` re-appended all
  nine sheet sections every frame — a style pass each time, and in Finnish
  nine sections of "new" text for lang.js to walk. The canvas is cached and
  the sections move only when their order is wrong. At 4× CPU throttle the
  median frame went 150 → 100 ms; the rest of that is headless Chromium
  compositing in software (2.5 s of every 3 s is "Commit"), which a phone's
  GPU does, so it is reported, not gated. The game's own per-frame work is
  ~2.2 ms at 1×.

Two more places compared `innerHTML` (the second-job banner, drawn from the
frame loop) or `textContent` (the catch hint) with English to decide whether
to repaint — in Finnish they repainted every time; they compare what they
last wrote now. The hub-tactics panel emptied its section instead of
deleting it, so `sheetSlot` no longer recreated it every frame.

## v2.66 — 2026-10-24

**SUOMEKSI** (roadmap M5: *"Finnish and English at least"*). The game plays in
Finnish: a Finnish browser lands in it, `?lang=fi` / `?lang=en` choose, the
choice is remembered, and the title card carries one link to the other
language (SUOMEKSI / IN ENGLISH).

**How, and why that way.** The words live where they are drawn — templates
and data tables in about twenty modules — so `js/lang.js` translates at the
one place every word passes through: the DOM. English stays the source,
written inline as before; a MutationObserver swaps each text node, aria-label
and title for its Finnish, English the per-string fallback (the house
convention). A line is looked up whole, then fact by fact across the game's
own " · " separator, then by pattern for the lines that carry names and
numbers ("in 5 min", "BOARD ONE OF 3", "to Kamppi"). **Place names are never
inflected**: a pattern puts a stop where Finnish needs no case ending
("kohde Kamppi", "vaihto: Eira"), because a wrong ending on a stop's name is
worse than a plainer sentence. Canvas text has no node, so the map's
TAP · GET OFF and WALK labels, the LATE floater, the week poster and both
share texts call `tr()` where they draw.

**What a DOM translator could break, held.** The catch panel is rebuilt only
when what it says changes, so a press in flight lands (v2.4x); a translator
that made every render look different would undo that. One place compared
`innerHTML` to decide whether to repaint (the drops on the way) and now
compares what it last wrote instead. `test/lang.cjs` checks that a lit CATCH
is the same button while the clock runs under it, in Finnish.

**`test/lang.cjs`** (18, in CI) plays two fixed shifts, today's daily and a
week through its kit pick in Finnish, tapping only what lights, opens the map
panel, and fails on any string the table missed that still reads as English;
it also holds the switch both ways, the remembered choice, a Finnish browser,
and English untouched. Its first run left 26 strings and a second found
"beat him" hiding behind a leading separator; the zoom rail reads LÄHI /
REITTI / KOKO because KAUPUNKI did not fit 44 px.

The Finnish is a **draft in the game's register, not a native read** — the
same caveat Toko's counter packs carry. Japanese, the arcade's third
language, is not started.

## v2.65 — 2026-10-24

**THE FIRST MINUTES FOR A STRANGER** (roadmap M4; owner: *"Go 5 then 6 then
7"*). Measured first, as the milestone says: `test/stranger.cjs` is a player
who knows nothing but what the screen offers — tap the first job, wait until a
row says CATCH and tap it, tap GET OFF when it lights, answer any card — with
no debug hook moving them. On v2.64 that player always finished, and on the
way read four things wrong. Each is fixed and each is asserted, and the gate
was run against the old code to prove it fails there.

- **The dispatch quoted a plan the catch board did not offer.** Shift 1's first
  job read "2 · change · ~10 min"; the board under it listed the first three
  routes the router found, none on the 2, and the one lit row was an
  18-minute loop via Eira. The stranger took it — anyone would — and the first
  delivery took **29 game minutes**. The board now shows the three QUICKEST
  door to door out of the same six the dispatch ranks by (still lit first):
  **9.7 minutes**. Today's daily 8.6, shift 2 6.3; the gate's bar is 20.
- **"Nothing to catch yet" stayed above a lit CATCH.** The rows refresh in
  place every tick (v2.4x, so a press in flight still lands); the first-job
  hint above them did not. It refreshes with them now.
- **"Get off here" at the stop you just boarded.** One tap after CATCH the ride
  panel offered an early exit at the boarding stop ("saves ~1 min") — the game
  contradicting the advice it had just given. The boarding stop is never an
  exit.
- **LIVE on the store build's title card.** The store page rule is to sell
  only what has been played; LIVE waits for M6. Hidden when `STORE`, and
  `test/itch.cjs` checks it.

**The store page's pictures** (roadmap M3): `tools/stills.cjs` renders the
630×500 cover and six phone stills from the store build, entered by tapping
START and played by tapping what lights; `store/ITCH.md` names them.

Gates: `stranger.cjs` (18, new, in CI) and `itch.cjs` (12). `misses.cjs`
watches 1400 ticks instead of 700 — with only the quickest plans on the board
fewer lines light, and 700 ticks saw two misses where the check needs three
(both judged correct).

## v2.64 — 2026-10-24

**THE STORE BUILD, AND THE NETWORK HSL HAS BEEN RUNNING SINCE SEPTEMBER**
(owner, 2026-10-24: *"Toko Move is the thing we publish first and then
Piritori is a spin-off that becomes the bigger game"* — ROADMAP.md has the
order and the milestones to an itch.io 1.0).

**The network.** The nightly refresh has validated every night since v2.63 and
failed only on opening its PR (the repo does not let Actions open one), so
this takes its newest pack, `automation/toko-move-hsl-40079925291`, byte for
byte. HSL reroutes trams **2, 4 and H** (4 now runs Katajanokka → Hakaniemi →
Kallio → Meilahti; Ooppera ↔ Meilahti has no tram) and adds **7B and 9B** —
B-lines are usually works diversions, so expect them to change back; the
board follows the feed either way. Every stop moved by the same 3 m, which is
the board's corner, not the stops. **`tools/fingerprint.mjs`** prints what a
refresh moved and `--write` accepts it — adopting a network is now one command
(the September adoption used a scratch script that died with its container).

**The rival kept losing his walk.** A claim on a new job turned him towards
your stop; if you took the job a tick later the claim dropped and he started a
FRESH 260-tick walk. A player who takes each job as it appears reset him every
time, and a quick shift ended with the other courier having delivered nothing
(the shift gate caught it on the new network: 39 of 40). A race given up now
resumes the walk it interrupted, with the time that walk had left.

**The store build (roadmap M2).** One shipping tree, two homes.
`js/platform.js` is the seam: a packaged build declares `TOKO_PLATFORM` and
the game then shares the STORE PAGE rather than the frame itch.io plays it in,
and leaves the playtest card off. **`tools/package-itch.mjs`** builds the
upload from what git tracks — `toko-move/` beside `flow-core/` so every path
resolves unchanged, a root `index.html` that steps in, no arcade HOME button,
no tests, tools or design notes — and refuses any path that would reach
outside the package (an import resolves against its file, a `fetch` against
the page; it accepts either). **`test/itch.cjs`** unzips the result into an
empty folder, serves it alone and plays a delivery through it: 11 checks, and
it fails both ways it was mutated (the HOME button left in is stopped by the
packager itself; a new module not yet in git is a 404 from the zip). 74 files,
0.47 MB. **`store/ITCH.md`** is the page kit: settings, copy (only what the
build does — LIVE stays off the page until M6), controls, credits, media.

**Rent is NOT re-set, and should be** (`--kitweeks=20`): on this network €400
is paid by the earner **95%**, the sensible player **90%** and the naive
player **70%** of weeks (v2.63: 90 / 70 / 60). That is outside the 20-week
noise, and the rule the rent was set by (earner ~80%, sensible ~55%) now reads
**€500** (75% / 50%). Left at €400 for the owner to decide: it is the biggest
balance change since the week shipped, and the diversions may change back.

The avoid-a-passed-stop gate (v2.62) no longer names a route — the one it
named went with tram 4 — and checks every pair instead: 0 leaks, and it fails
without the rule.

## v2.63 — 2026-09-26

**LAAJASALO, AND THE MAP NAMES ITS HUBS.**

**Laajasalo** is a delivery stop: Yliskylän keskusta, the district's centre,
where tram 12 ends past Kruunuvuori. Like Kruunuvuori it is tram-only — 12 is
the one way there. The graph moved by exactly its node, one tram link and 12's
extension; the board box grew east again (25.028 → 25.066) and no stop that
was on it moved. Adding a destination reshuffles every shift's deal (dispatch
draws from the list by seeded hash), which moved two pinned scenarios:
- the daily gate's end-card shift goes to 2 (2–4 fit; 1 and 5–8 do not);
- the shift gate's "a cheapest-job player finishes" no longer includes the
  **dawdler**, which idles 400 ticks before every job by design (40% of the
  shift) and exists for the rival check. Measured over 20 shifts it finishes
  19 on v2.62 and 18 on v2.63 — the same rate — and shift 1 is one of the two
  the reshuffle made long. Every player who does not idle still finishes.

**Stop names no longer lose to passing trams.** A name gave way to every
vehicle badge, and the centre is where trams bunch: measured over forty frames
on a phone, **Rautatientori — the main hub — was labelled in none, on v2.61 as
on v2.62**, Senaatintori in three. A transfer hub's name now outranks a badge
for a line you are not using (its halo keeps it legible) and still gives way
to any tram you could catch or that is on your lines, and to other names.
Rautatientori 0 → 40 of 40, Kauppatori 19 → 40. `test/labels.cjs` holds it and
fails on the old rule. A second rule — the job's own two stops placed first —
was built, measured and removed: with a job in hand the job's stop was already
named every frame, because the quiet map fades the other lines' trams.

**Rent re-measured** (`--kitweeks=20`): **90% / 70% / 60%** pay €400 (v2.62:
90 / 80 / 45) — inside 20-week noise. Rent stays €400.

The test card keeps v2.62's list, so ticks already earned are not wiped.

## v2.62 — 2026-09-26

**THE CROWN BRIDGES ARE ON THE BOARD** (owner, 2026-09-25: move with the
city). This morning's HSL refresh validated for the first time since the 12th
— v2.57 took Töölöntori off, so every anchor resolved again — and the new
network is in: **trams 11, 11H and 12** over the Crown Bridges, and
**Kruunuvuori**, the stop at the far end, as a delivery destination. No walk
reaches it; only the tram does, which is the bridge's whole point. The refresh
PR could not be opened (GitHub Actions is not permitted to create pull
requests in this repo), so the pack was taken from the refresh's own branch,
`automation/toko-move-hsl-36232650378`, byte for byte.

What else the feed moved, all of it real and all of it followed: **line 2**
now runs Senaatintori → Lasipalatsi → Ooppera instead of Rautatientori →
Kamppi; **4T and 8T are gone**; **Kamppi has no tram stop** any more (the
feed dropped "Kamppi (M)"), so it is metro and walking; **Rautatientori** now
sits on a tram stop of its own name; Kalasatama and Ooppera moved a few tens
of metres onto the stops the feed still has. The fingerprint moved by exactly
those, plus Kruunuvuori's node, its two tram links and the three new lines.

**The board is 52% wider** (east edge 24.986 → 25.028) because the box is
derived from the anchors; no stop that was on it moved, since coordinates run
from the north-west corner. On a phone the play view keeps its zoom. The two
new families were **inked by solving, not picking**: the thirteen existing
colours HELD (a line learned by colour keeps it) and 11/12 solved in the same
band at 3:1 for the widest gap to everything — green and teal, min dE76 27.8
(was 32.5), floor 27.5. Re-solving all sixteen would buy the gap back by
recolouring every line at once.

**A planner fault the new lines made fatal, fixed at the source.** A bot on
the new board was offered Kalasatama → Kruunuvuori as "11 back to Pasila,
then 11H out through Kalasatama again", took it, and shuttled for the rest of
the shift. Three rules, one idea — *no plan covers ground twice*:
- a transfer's two legs may share only the stop you change at (the gate found
  **6,164** looping plans across the old board's options — Pasila → Kallio on
  9 past Kallio to Hakaniemi and 3 back; Pasila → Meilahti on 2 through
  Ooppera and 4 back through it);
- a line that already goes there is never the first leg of a transfer;
- **mid-delivery, the panel does not offer a plan back through a stop this
  delivery has already stood at** (its pickup, every transfer, every walk's
  end), unless that would leave nothing. This one is the trip-scale version,
  and it is what the zero-delivery shifts had in common on BOTH builds.

Measured, 200 random-but-sane bots each: shifts ending with nothing delivered
**2 → 0** (the old build also had 2 — the 40-bot gate had held by seed luck),
win rate 75% old → 76% new. Shift gate 11/11 with 14 dailies.

**Rent re-measured** (`--kitweeks=20`): **90% / 80% / 45%** pay €400 (v2.61:
75 / 85 / 25). The first two are inside 20-week noise; the naive player's +20
is plausibly the loop fix — the first plan the panel offers is no longer a
trap. Rent stays €400.

**The test card's new list** is the bridge: ride 11 or 12, deliver to
Kruunuvuori, tap the tram, LIVE (the real Crown Bridge trams included), tell
Toko. The daily gate's end-card scenario moved back to shift 1, which fits
the new network (2, 3 and 4 do not).

## v2.61 — 2026-09-26

**THE TEST CARD** (`js/testcard.js`; owner: *"try to hook me into testing with
enticing updates"*). The title card now carries this build's missions — five
things it just changed, each with a TRY link straight into it: **the quiet
map** (take a job), **tap the tram** (board by tapping it on the map), **walk
a street**, **LIVE**, and **tell Toko** — which opens this cabinet's note panel
on the arcade, so nothing new is sent anywhere. A mission ticks itself off when
you actually DO it in the game, never when you tap a row: taking a job ticks
the quiet map, only a tap on the MAP (not the panel) ticks the tram, a walk
starting ticks the street, a live feed running ticks LIVE. The feed says
*✓ TESTED · THE QUIET MAP · 1/5* the moment one lands, the card remembers across
reloads, and a new build brings a new list rather than carrying old ticks. The
arcade's note for the cabinet says so too.

`test/testcard.mjs` (7) holds the rules; `test/testcard.cjs` (10) plays them —
a job tapped, a tram tapped on the map (and the panel NOT counting), a reload,
and *Tell Toko* landing on `#tokomove/feedback`.

## v2.60 — 2026-09-26

**THE QUIET MAP.** Thirty-four lines and a hundred and fifty vehicles all drawn
at full strength meant the board never said which of them were YOURS: every
tram got a badge in turn and your own line was one colour among thirty. Now,
with a parcel in hand, the lines that matter to what you are doing stay at full
strength and are drawn last and a little heavier; the other lines step back to
about a quarter; and every vehicle on them is a small faint dot rather than a
badge. The lit tram and the one you are riding are never dimmed.

*Which* lines is one rule by state (`tm.focusLines`, main-v212): on a ride, the
line you are on and the rest of your plan; waiting with a parcel, the legs of
the options on offer; with no parcel, the lines the board's jobs would put you
on. It is deliberately tighter than the badge ranking's `relevantLines`,
because a line drawn at full strength is a claim that it is yours. With nothing
in focus — dispatch before anything is arriving — nothing is dimmed and the
board is exactly the old one.

Owner's direction was the brief: *make the map read as yours first*, then a
phone playtest. Measured on shift 3 waiting at Rautatientori: 5 of 34 lines in
focus, 15 badges all on them, 133 of 154 vehicles faint. `test/quiet.cjs` (6)
holds that every badge is yours, lit or your ride, that the rest are faint, that
the lines are drawn with the same focus, and that nothing dims when nothing is
in focus; drawing every vehicle full again fails it.

## v2.59 — 2026-09-25

**LIVE'S BADGE LAGGED THE FEED BY UP TO FIFTEEN SECONDS.** v2.58 repaints the
HUD on every tenth tick crossed — and LIVE runs the clock at a fifteenth, so
ten ticks is fifteen real seconds: *LIVE · 3* could still read *LIVE* long
after the trams were on the board, and *FEED LOST* could arrive late. CI caught
it (`live.cjs`, *the HUD says LIVE and how many (LIVE)*). In LIVE the HUD also
repaints the moment the feed's own label changes. The gate now reads the badge
400 ms after the reports land; the old line fails it every time.

## v2.58 — 2026-09-25

**THE HUD FROZE WHEN A FRAME SKIPPED A TENTH TICK.** CI failed v2.56 and v2.57
on *the peak says so on the HUD (BUSY ×1.2)* while the fee on the same page was
already paying ×1.3. The frame loop repainted the HUD only on a frame that
landed EXACTLY on a multiple of ten ticks; a frame that advances several ticks
— a slow phone, a busy runner, the harness's jump to the peak — can step over
one, and then the clock and the rush badge stayed on whatever moment last
painted them (here, an event mid-jump). It was never flaky; it was a race the
local machine happened to win. The HUD now repaints on every tenth tick
CROSSED. `rush.cjs` jumps to three ticks past a tenth, so it fails on the old
line every time (reproduced: *BUSY ×1.2*) and passes on the new one.

## v2.57 — 2026-09-25

**TÖÖLÖNTORI LEAVES THE BOARD, BECAUSE HSL LEFT IT** (owner, 2026-09-25: move
with the city). The nightly HSL refresh has failed every night since the 12th
on *cannot resolve anchor toolontori*, and v2.44's diff said why: the feed
dropped Töölöntori, Apollonkatu, Arkadiankatu, Hanken, Maria, Sammonkatu and
the 4T/8T loop, and added the Crown Bridges stops (Kruunuvuori, Korkeasaari,
Yliskylä, Merihaka …) with lines 11, 11H and 12. Töölöntori is not renamed,
it is **unserved** — and it was one of the game's delivery anchors, so the
shipped board was sending couriers to a stop no tram calls at any more.

It is gone as a destination, a transfer hub and a walk end. What stood on it
moved to where the city still is: the campaign's fragile parcel to Töölö goes
to **Ooppera** (Töölö, on the Mannerheimintie trams) and its next job leaves
from there, so the campaign is still one chain; Mannerheimintie is walked
Lasipalatsi → Ooppera; Helsinginkatu is walked from Ooppera, where it meets
Mannerheimintie; Runeberginkatu is drawn Kamppi → Meilahti; the TÖÖLÖ label
sits on Ooppera. The graph fingerprint moved by exactly Töölöntori: its node,
its eight links and its place in lines 2, 2H, 8H and 8T, which now run Kamppi
→ Ooppera and Ruoholahti → Ooppera — no other node moved by a centimetre. The
anchor gates count the anchors the definition declares (21) rather than a
typed 22.

**What this unblocks.** With every remaining anchor served by the new feed,
the nightly refresh can validate again and open its own refresh PR with the
new network. The Crown Bridges trams (11, 11H, 12) then appear on the board as
lines; Laajasalo as a DESTINATION is the step after that, because it needs the
new pack in the tree and this sandbox cannot fetch it.

**Four browser gates leaned on the old boards**, because removing a
destination changes what every pinned shift deals: shift 3's first job now
changes trams (mapcontrol accepts a get-off at a transfer and checks you are
left waiting there; juice rides leg by leg), shift 1 no longer suits a
never-walking bot (daily's end-card scenario is shift 2), and in shift 4 the
rival now starts on your stop (shift 2 puts him 2.9 km out). A pinned shift in
a gate is a SCENARIO, not the thing measured — `shifts.cjs` is, and it stays
11/11 with every one of the next 14 dailies winnable.

**Rent re-measured** (`--kitweeks=20`): **75% / 85% / 25%** pay €400 (v2.56:
85 / 55 / 25). The first two swapped places, which is what 20-week noise looks
like; rent stays €400.

## v2.56 — 2026-09-25

**LIVE — THE REAL MORNING** (roadmap L5, `js/hfp.js`, `js/mqtt-ws.js`). The
title card offers *OR LIVE · the real trams, right now* (`?live`): every tram
and metro train on the board is where HSL says it is, from HSL's open
high-frequency positioning feed. It needs **no API key** — the roadmap
assumed Digitransit and a key, but HFP is published on an open MQTT broker
(`wss://mqtt.hsl.fi`), and MQTT 3.1.1 over a WebSocket is four packets, so the
client is written out (`mqtt-ws.js`, ~80 lines) rather than vendored.

**LIVE is not a second fleet.** The timetable fleet already answers everything
the game asks — where is it, which way, when does it reach my stop, can I catch
it, where does my ride go — from one closed form: a vehicle is a phase on its
line's out-and-back cycle and a speed. So a real report is projected onto its
line's exact HSL path (matched by GTFS route id, which HFP carries), and the
phase is re-solved so that the closed form puts it exactly there now; between
reports it runs on at the line's speed. The catch panel, the ride, the arrival
minutes and the badges are unchanged and cannot tell. Which way it is going is
read off two reports' motion along the path, and before there is motion, off
the reported heading against the path's own bearing.

**Real time.** Ten ticks a real second is fifteen game-minutes a real minute,
so LIVE runs the clock at a fifteenth: a 75-minute shift is 75 real minutes,
the clock shows Helsinki's real time, and ×2/×4 are off. It is an ordinary,
clear morning with no rush curve and no scripted disruptions, because the real
city brings its own; and it records nothing — not the daily, not the week —
because a live morning cannot be replayed or compared.

**The honest limits, handled rather than hidden**: a report more than 120 m
from its line (a depot run, a diversion) is ignored, never snapped onto a line
it is not on; a line with no real vehicle has none, which is the real city; a
vehicle not heard from for three minutes leaves the board — except the one you
are riding, which runs on until you get off; and when the feed dies, errors or
goes quiet for 30 s, **the timetable comes back** and the HUD says *LIVE · FEED
LOST · TIMETABLE*. While it is live the HUD says *LIVE · N*, N being real
vehicles on the board.

**NOT VERIFIED AGAINST THE REAL BROKER.** The build sandbox cannot reach
`mqtt.hsl.fi` (403 at the proxy), so every message in both gates is synthetic —
shaped as HSL documents HFP v2 and placed on the real paths of the committed
pack. `test/live.mjs` (21, bare node): the framing round-trips (two packets in
one frame, one packet across two), a report lands where it was reported
(0.00 m), both directions read, the metro matches by route, and the four
limits hold. `test/live.cjs` (11): the broker is mocked at the WebSocket with
Playwright's `routeWebSocket`, answering CONNECT and SUBSCRIBE as a broker
does; the way in, the real-rate clock, three trams landing at 0.0 m, the HUD,
the catch panel reading the live fleet, and the timetable returning when the
socket closes. Reversing the direction solve fails the first; removing the
fallback fails the second. **The first real test is a phone on a Helsinki
morning.**

**Rent re-measured after v2.55's snow fix** (`--kitweeks=20`, kit taken
nightly, every morning drawing its own weather): the three players pay €400 in
**85% / 55% / 25%** of weeks, against 80 / 65 / 10 before — every column inside
20-week noise. Rent stays €400.


## v2.55 — 2026-09-25

**THE SNOW WEEK WAS A PRICING BUG, AND IT IS MOSTLY GONE.** v2.49 left snow
open: a week held in snow paid **+€57** over the same week clear, and it was
put down to diverged boards. It was not only that. A hand-off's fee is built
from `90 + dist × 9`, and for a hand-off `dist` came from the trip's time
estimate — which rides the live fleet, a fifth slower in snow. So the snow
turned a longer ride into a longer "distance" and paid more for the same two
stops (111 against 118 on the gate's pair). The fee is priced off a dry day's
trip now, the same way v2.49 fixed the deadline. Re-measured (`shifts.cjs
--wx=30`, 30 no-kit weeks each, paired against the same weeks clear):

| weather held all week | v2.49 | v2.55 |
|---|---|---|
| rain | −€1 ± 30 | −€25 ± 21 |
| fog | +€2 ± 1 | +€1 ± 0 |
| snow | **+€57** | **+€20 ± 17** |

What is left of snow is inside about one standard error, and it is the
diverged-boards effect v2.49 described: a slower fleet puts the courier
somewhere else by the second job. Rain now reads as the cost it is meant to
be. `weather.mjs` holds that a hand-off is offered to the same door on both
days and pays the same; putting the old line back fails it.

**NO TICKS ON SCREEN.** A tick is the engine's unit (forty to a minute), and
four places still printed it: the stop's *ALSO CALLING HERE* panel ("MISSED 4 ·
about 12t ago", "+8t", walk exits "30t"), the nearby list ("12t away"), the
walk line in the feed, and the two skill moments ("8t margin", "3t transfer").
Waits and walks read in minutes now; a margin reads in seconds, because a
connection made with twelve seconds to spare is the story and "now" would throw
it away (`seconds()` in `ui.js`). `shiftlog.mjs` scans every module for a tick
suffix on a printed value, so the next one fails the gate rather than a
playtest.

**THE WALK FOLLOWS THE STREET** (roadmap L4, `js/walkpath.js`). A walk between
two stops was drawn as a straight line — the courier slid through blocks. The
repo already carries real OpenStreetMap streets for the centre, so the figure
walks those: the shortest way along real streets between the street points
nearest each stop, with the street the walk is named for preferred. The line
still to walk is drawn ahead of the figure as an ink dash on a white casing,
because the walk runs down the same streets the trams do and an orange dash
vanished into the orange line under it. The camera follows the same point.

Built from shared points alone, the extract came out as **455 separate
pieces**: it is simplified, and a T-junction's shared node is exactly what
thinning drops. A way's loose end within 25 m of another street is joined to it
(only loose ends — joining every near pair would walk the figure through the
gap between two parallel streets), which makes the centre one network of 4,249
points. Both ends are snapped to the same piece. Three honest limits: the
extract covers only the centre (60.17–60.20 / 24.93–24.98), so a walk with an
end outside it stays straight; a stop more than 140 m from a street stays
straight; and a path longer than 1.9 × the straight line is refused. **8 of the
17 walks follow streets** (Mannerheimintie, Helsinginkatu, Hämeentie,
Kaivokatu / Simonkatu, Kaivokatu / Kaisaniemi, the Pasila corridor); the rest
have an end outside the extract. The walk's COST is unchanged — it is still the
gameplay abstraction `hubs-walking.js` says it is; only where the figure is
drawn moved.

`test/walkpath.mjs` (31, bare node, the committed extract) and `test/walk.cjs`
(6, a real tap on a walk row): every sampled position is on the street path
(worst 0.0 m) and the courier leaves the straight chord by up to 266 m to
follow it. Turning off the junction pass fails the first; drawing straight fails
the second.

## v2.54 — 2026-09-25

**THE WEEK AS A POSTER.** Leap 5 of five (`js/poster.js`). Friday's end card
was text you could copy. It is a picture now as well: the city's lines faint in
the dark, the five routes you actually rode drawn over them in five colours,
start and end marked, and under them each day's grid and money, the rent
verdict and the kit you carried — one 1080 × 1350 image, a phone's 4:5. SAVE
THE POSTER hands it to the phone's share sheet as a file where it can take
one and downloads it where it cannot; the text line stays, one button down.

The routes are **recorded as you play**, because each day of the week is a
separate page and a poster drawn at the end would have nothing to draw: every
fifteen ticks the courier's position joins the day's trail, the trail rides in
the week's save with the shift (so a shift left half-way keeps the line it had
drawn), and it is thinned to 180 points, ends kept — five days stay a few
kilobytes. The frame fits every point of the week and keeps the city's shape
(a kilometre east is a kilometre north); a week with no movement still draws
the lines.

`test/poster.mjs` (11) holds the trail and the frame in bare node;
`test/week.cjs` (31) now asks Friday for a 1080×1350 poster with real colour
in it and for SAVE to hand over a PNG. Not drawing it, or not wiring the
button, each fails it.

## v2.53 — 2026-09-25

**THE RIVAL RACES YOU.** Leap 4 of five (`js/rival.js`). A claim used to be a
countdown on a row while Vesa walked somewhere else entirely. It is a journey
now: the moment he wants one of your jobs he turns and heads for the stop you
are standing at, a dashed purple line runs from him to it, the stop pulses in
his colour with VESA · N s, and he arrives exactly when the claim runs out — the
countdown is a figure you can watch getting closer. The row says so: *Vesa is
coming for it · 12 s · beat him +20%*.

- **Beat him** — take the job he is racing for and it pays a fifth more, on the
  job itself, so the fee delivered and the fee logged are one number, and the
  feed says BEAT VESA · +20%.
- **Lose to him** — he takes it, walks off with the parcel on his back to its
  destination, and wants nothing else until that delivery is made. (The first
  cut had him racing for your next job the instant he won, which read as him
  dropping the parcel.)
- He moves on SEGMENTS — from where he stands, to somewhere, between two ticks —
  and every change of plan starts the next one where he is, so a claim won,
  lost or abandoned never makes him jump (the gate holds his largest step
  under 40 m a tick; it is 17.9).

**Rent holds at €400.** The contested job is on the board from the moment it is
dealt, so a quick player can take the +20% nearly every time — that is the
choice, and it is income. Measured (`--kitweeks=20`, kit, weather and the rush
all on): **80% / 65% / 10%**. The shortest-job player's 55 → 65 is inside a
20-week sample's noise (about ±11 points), so it is not a reason to move the
rent, and the shift gate — 14 dailies — still reads 11/11.

`test/rival.cjs` (11) walks the clock a tick at a time on shift 4, where he
starts 2.9 km away (on shift 3 he starts ON your stop and "he gets closer"
reads 0 m → 0 m): the claim turns him, he closes 2863 m → 1095 m, the row names
the prize, taking it pays 108 → 130 and ends the race without a jump, and on
the other ending he takes it, carries it and claims nothing more. Removing the
bonus, the carrying guard or the race path each fails it.

## v2.52 — 2026-09-25

**THE RUSH: the shift has a shape.** Leap 3 of five (`js/rush.js`). Seventy-
five minutes of morning were seventy-five identical minutes. Now the city
fills and empties — quiet at 07:00, peaking about 07:40, thinning by 08:15 —
and the load pulls two levers in opposite directions, which is what makes it a
decision rather than a tax:

- **Full trams.** At the peak up to half the arriving vehicles are too full to
  board. A full tram is drawn with heads pressed to every window and is never
  ringed; its row says "full · wait for the next" and cannot be tapped; and the
  catch call itself refuses it, so the panel, the map tap and the bot all meet
  one rule. Fullness is a hash of the vehicle and the quarter of its cycle, so
  the same tram stays full for its whole time at your stop and a shift replays.
- **Rush pay.** A job offered in the rush pays up to ×1.3, and the fee on the
  board already says so — take the rich job into the crowd, or the plain one
  around it. The HUD names the hour beside the clock: BUSY, then RUSH ×1.3.
- **The light moves.** The dawn wash was a flat tint that faded; it is a low
  sun off the east edge at seven, climbing and swinging south as the shift
  runs, its warm pool going with it.

`?rush=off` turns it off; the harness's `?day=none` control is calm, and
`?rush=on` keeps the rush under it (the bot's weeks do, because their ordinary
days pin `day=none`).

**Found on the way, and older than the rush: an empty board.** The rival
claims ordinary offers one at a time and nothing ever refilled the board, so a
player who read slowly enough lost every job and had nothing to do until
08:15 — the rush gate found it by idling to the peak and finding zero offers.
When he takes the last ordinary job, dispatch now deals a fresh board: losing
one to him is still the cost of dawdling, being stranded is not.

**Rent holds at €400 with the rush on**, measured with the week as it is played
(kit nightly, drawn weather, the rush on every day): **80% / 55% / 10%**,
exactly v2.49's. The two levers cancel for a bot — the waits the full trams
cost are about what rush pay gives back — which is the point of pulling them
against each other; what changes is WHEN a shift is hard, not whether the week
is. The shift gate's 14 dailies, with the rush, are all winnable.

`test/rush.mjs` (9) holds the curve, the two levers and fullness that holds
still; `test/rush.cjs` (9) holds it in the page: calm control, a quiet seven,
RUSH ×1.3 and ×1.3 pay at the peak, ~47% of the fleet full, the catch call
refusing a full tram, and — with a job taken in the rush — a full tram pulling
in, its row disabled and never offered to the map. Removing the panel's
check, the catch's check or the board refill each fails it.

## v2.51 — 2026-09-25

**DELIVERIES YOU CAN FEEL.** Leap 2 of five (`js/juice.js`). A delivery was a
line in the feed and a number that changed; it is a moment now, and every
beat of it is something the game already knew. **Delivered**: the door flashes
(a ring off the stop), the parcel pops up and away, seven coins arc off the
top of the map toward the score, the fee rises, and the score bumps. **Late**:
the parcel comes out grey and cracked and shakes, the fee reads LATE +N in
red, and the chain's ×N stutters as it breaks. **A drop**: a smaller ring and
its fee in green — extra, and it looks extra. **The chain**: each step up the
on-time multiplier punches in over the courier as the HUD's ×N bumps.

It RECORDS BY WATCHING, like the shift log: nothing in `deliveries.js` knows
it exists. Each frame compares the score, the results and the multiplier with
the last and turns the difference into effects, so it is drawn FROM the
numbers and cannot disagree with them. Under `prefers-reduced-motion` the
coins, the shake and the punch go and the words stay.

`test/juice.cjs` (7): two on-time deliveries and a late one through the game's
own get-off — deliver, then the chain stepping up, then late; the score bumps;
the chain stutters on the break; every effect clears inside two seconds.
Filing a late job as a delivery, dropping the stutter, or never clearing each
fail it.

## v2.50 — 2026-09-25

**THE MAP IS THE CONTROLLER.** Leap 1 of five (owner: *"can we make graphics
and gameplay leaps?"*, then *"all in order"*). Every decision in a shift used
to be a tap on a list under the map, and the map was something you watched —
the one thing standing between this and Mini Metro. Now:

- **Vehicles, not labels.** A tram is two cars along its own heading, the
  metro three, the line number upright on it; your own ride is bigger, outlined
  and has its windows lit. The declutter pass keeps the TURNED body's bounds
  apart, so a tram going north takes the room a tram going north takes.
- **Tap the tram to board it.** A tram you could board this second is RINGED,
  pulsing, and ranked first so it is always a vehicle and never folded into a
  dot. Tapping it boards it through the very call the CATCH button makes
  (`tm.catchVehicle` → `challenge.catchChoice`), so nothing about a catch
  depends on where the finger was. The finger gets 34 px, more than the eye,
  because a moving tram is a small target under a thumb.
- **Tap your stop to get off.** When the ride arrives the stop pulses with TAP ·
  GET OFF over it, and a tap on it does what the GET OFF button does.
- The panel stays, every button in it, and says so: *"Tap the ringed tram on
  the map, or here."* A tap fires pointerup AND touchend, so one action per
  450 ms, and a tap that did something does not also open the stop popup.

`test/mapcontrol.cjs` (8) plays it with real touch at the projected screen
point and never touches the panel: a tap on empty map boards nothing, a tap
on the lit tram boards it, a tap on the stop delivers, the popup stays shut.
Removing the map action fails three checks; not ranking the lit tram first
fails the one that asks it to be a vehicle.

One ruler moved with the thing it measures: `badges.cjs` rebuilt each dot's
would-be label box as a fixed 24×14, and a vehicle now claims its turned
body's bounds, so the check accused four trams of yielding to lower ranks
they had never overlapped. The draw pass records the box it wanted on each
dot and the check reads that; sorting by screen position instead of rank still
fails it three ways.

## v2.49 — 2026-09-24

**WEATHER.** Roadmap NEXT LEVEL, L4. Every morning draws a weather from its
shift — the daily from the date, each day of the week from its own — and each
kind is a look AND a lever (`js/weather.js`):

| weather | share | look | lever |
|---|---|---|---|
| ☀ clear | 40% | — | — |
| 🌧 rain | 25% | streaks, a darker wet sheen | services ×0.9, walking ×1.2 |
| 🌫 fog | 15% | the map greys out past the courier's 400 m, drawn as that circle | vehicles past 400 m are not drawn; far arrivals read "in the fog" |
| ❄ first snow | 10% | the streets go pale under falling flakes | services ×0.8, walking ×1.4 |
| ✧ frost | 10% | a cold edge on a sharp map | — |

A slower service **keeps its timetable**: the live network runs more
vehicles on the longer cycle, so weather costs ride time, not waiting time,
which is what snow does to a real city. Fog is the first ordinary morning on
which Local Knowledge matters: the service is still there and still lights
when it arrives, but the map will not show it coming and the panel will not
say when — including its header, which first shipped saying "first in 3 min"
over three rows that said "in the fog". The title card names the morning next
to the city day. `?weather=` pins one; the harness's `?day=none` control means
clear too, because a control that draws its own weather is not a control.

**The first measurement said rain PAID, and it was right.** `shifts.cjs --wx`
holds one weather all week against the same weeks clear: rain came out
**+€52 a week**. Deadlines are built from the trip's estimate, the estimate
rides the live fleet, and so a slower fleet quoted longer deadlines — the
weather paid itself back as slack and then some. **The dispatcher now quotes a
dry day's deadline** (`deadlineFor` scales the estimate by the weather's
speed), and `weather.mjs` holds that a trip the snow makes slower gets the
same deadline as on a dry day. Re-measured:

| weather held all week | against clear |
|---|---|
| rain | −€1 ± 30 |
| fog | +€2 ± 1 |
| frost | +€2 ± 1 |
| snow | **+€57** (30 weeks: €474 against €417) |

**Fog is free for the bot, and that is the honest result**: the bot never
reads the map or the panel's minutes, it only catches what is lit, so fog's
whole cost — not knowing what is coming — is one only a person pays. **Snow
still measures as a good week and it is NOT the snow**: fares are unchanged
and the deadline is a dry day's. Printed per payout, the snow weeks took more
of the long hand-off jobs worth ~1000 points (five in a week where clear took
one); a hand-off is offered by hash, not by weather, so the two runs had simply
diverged onto different boards — a slower fleet puts the courier somewhere
else by the second job. It is a real number and an open finding, not a fixed
one, and it sits on one morning in ten.

**Rent stays €400**, measured with the week as it is played — kit taken
nightly, every morning drawing its own weather (`--kitweeks=20`): the three
players pay **80% / 55% / 10%**, exactly v2.48's. The weather mix moves no
week's rent; it moves which mornings are hard. The shift gate's 14 dailies,
now with their drawn weather, are all winnable by the cheapest-job player.

`test/weather.mjs` (13) holds the mix, the pins, fog's reach and a slower
fleet on the same headway; `test/weather.cjs` (8) holds fog in the page — 0 of
290 vehicles past 400 m drawn, all 16 near ones drawn, "in the fog" on the
rows and not a minute in the header — and rain's two levers. Removing the fog
filter, the fog label, the header fix or the speed factor each fails it.

## v2.48 — 2026-09-24

**KIT, the choice between shifts.** Roadmap NEXT LEVEL, L2. Every night of the
week (Monday to Thursday) offers three things and you take one; what you take
you keep until Friday. Six items, and the ascension ladder's rule — **no item
adds a verb, each bends ONE number the player already reads** — and every one
of them is priced by measurement (`shifts.cjs --kits=20`: 20 weeks with the
item held all week against the same 20 without it, paired, the player who
reads the fee):

| item | bends | worth a week |
|---|---|---|
| 🎒 a bigger bag | room 5 → 6 | €52 ± 10 |
| 📱 a courier app | drops pay ×1.5 | €32 ± 3 |
| 📝 a better contract | jobs pay ×1.1 | €29 ± 5 |
| ⭐ a good name | on-time chain ×0.3 a step, not ×0.25 | €25 ± 2 |
| 📟 an easy dispatcher | deadlines ×1.15 | €20 ± 6 |
| 📇 business cards | every regular starts at three pips | €16 ± 2 |

**It took three passes, and the first was not a choice.** Pass one: a bag of
7 was worth €86, the dispatcher €20, a thermos €6, cards (tips ×1.5) €3, bubble
wrap €1 and a bike exactly €0 — the bag in every offer was the answer, and
three of six were decoys. **The bike, the wrap and the thermos were CUT**, not
tuned: the bot walked 2–3 times in twenty shifts (a walking link opens only
between stops you have been to, and has to save half a minute), and hot or
fragile-with-a-change work is a small share of the board, so each lever sat
idle whatever its size. An item whose lever is almost never pulled is a trap
in an offer of three. Their levers went with them; `kit.js` says why. Pass
two replaced them with levers every shift pulls — the chain, a drop's fee —
and found the chain at ×0.4 worth €73, so it is ×0.3; cards became a
standing, not a multiplier on one (tips on a Monday are zero, and ×1.5 of zero
is zero), and needed three pips to be worth €16. The band is €16–52: the bag is
still the strong pick and the cards the weak one, but nothing is dead and
nothing is always right.

The offer is seeded by the week and the night and SAVED the first time it is
shown, so a reload cannot reroll it; one tap takes the item and goes to the
next shift, because a kit is applied when the page boots. A night closed
without a pick is offered again on the title card and holds START until it is
taken. The title and end cards show the kit held; Friday's share line
carries it. `?kit=a,b` applies kit to a pinned or random shift — that is how
the bot prices an item — and is ignored on the daily, whose result is one
everybody compares.

**Rent is €400 now, and it was measured again** (`shifts.cjs --kitweeks=20`:
an offer of three each night, the best-valued item taken). Kit is income, so
v2.47's €350 would have been paid by nearly everyone:

| player | median week | €350 | **€400** | €450 |
|---|---|---|---|---|
| reads the fee | €483 | 95% | **80%** | 60% |
| takes the shortest job | €447 | 80% | **55%** | 45% |
| takes the first job, never walks | €342 | 45% | **10%** | 5% |

€400 holds the two players who choose their jobs where v2.47 left them (78%
and 58% at €350 without kit). The first-job player falls from 28% to 10%:
kit pays whoever uses the lever it bends, and a player who takes whatever is
first does not use any of them. That is the ladder's shape, not a bug.

`test/kit.mjs` (33) holds the offers, the nights and each lever in the
engine's own arithmetic — a job of 200 is offered at 220 with the contract, a
regular you have never met tips with the cards, the third on-time job is ×1.6
with a good name — and removing any lever fails it. `test/week.cjs` (29) walks
the week through the picker, closes a card without picking, checks the kit
reaches Tuesday's shift, and that the daily ignores `?kit=`; both wirings fail
it when removed.

## v2.47 — 2026-09-24

**THE WEEK.** Roadmap NEXT LEVEL, L1. `?week` — or the new link under START
SHIFT on the daily's title card — is five shifts, Monday to Friday, one run.
A shift pays its score in euros (one per ten points), the week keeps the
money, and **rent is due on Friday**: the run is won or lost at the end of
the week, not the end of a shift. The title card shows the week as five
cells, what is banked and what each shift still has to find; the end card
adds the day's money to the strip and leads on to tomorrow; Friday settles
the rent and shares the week, a row a day.

Four rules (`js/week.js`, all held in bare node by `test/week.mjs`):
**a week is a seed** (five shift numbers and five city days from it);
**a weekday is a weekday** (the week draws its own deck — two ordinary days,
MATCH, MARKET, HELSINKI, shuffled — because the daily's deck is four special
days with QUIET SUNDAY in it); **leaving is clocking out** (every delivery is
written into the save as it lands, and a page reopened on a started shift
closes it with what it had banked — a run you can reload out of a bad
morning is not a run); **standing belongs to the week** (regulars start every
Monday at nothing and remember you until Friday, through a store the
challenge saves with; visited stops stay yours for good). A shift of the week
is played once: the replay button is hidden.

**Rent is €350, and it was measured** (`shifts.cjs --weeks=40`, 40 weeks
each, standing wiped every Monday). Three players on the same 40 weeks:

| player | median week | pays €300 | €350 | €400 | €450 |
|---|---|---|---|---|---|
| reads the fee (pay per minute of plan, drops, walks) | €395 | 95% | **78%** | 45% | 18% |
| takes the shortest job (drops, walks) | €360 | 88% | **58%** | 23% | 8% |
| takes the first job, never walks | €319 | 58% | **28%** | 5% | 3% |

€350 is the price where the gap between those players is widest and the best
of them still loses about one week in five. The first cut had €480, a guess,
and not one of 120 bot weeks paid it.

**What the week found that a shift could not: the cheapest job is not the
best one.** The dailies bot takes the job with the shortest plan, because a
shift is won on deliveries. A week is won on money, and the shortest job pays
least — so the "sensible" player earns less than one who divides the fee by
the plan (`job: 'rate'`, new in the bot). Win the shift and lose the rent is a
real way to play this now, and a decision the daily never asked for.

`test/week.cjs` plays the run in the page: in from the daily's card, Monday's
standing empty whatever the browser's is, Monday recorded, Tuesday remembering
Monday's regular, Tuesday left mid-shift and closed with its money, Wednesday
next, Friday's verdict, the share line, a new week. Three mutations — no week
standing, no progress writes, no clock-out — each fail it.

## v2.46 — 2026-09-24

**A phone playtest, touch only, and a won shift that never ended.** Entered the
way a player does — the arcade floor, the Toko Move cabinet's PLAY, the title,
START — on a 390×844 touch screen, and played Daily 2 by tapping: job, the lit
CATCH, GET OFF, three times over, then SHARE.

**THE BLOCKER: from v2.29 a won shift did not end.** The end card was wired to
`challenge.step()` returning true, and since v2.29 that only happens when an
event or a crowd fires; the delivery itself is made by GET OFF, outside step.
So the third delivery landed and the shift ran on, a dead GET OFF on the sheet,
until some event happened to fire — and at the day's end `onDay` declined to
finish a shift that was already complete. On QUIET SUNDAY the playtest ran nine
minutes at ×4 past its last delivery with no card. Every gate missed it because
every gate runs the clock out; none had ever won a shift in a browser. The
shift ends now on the tick the target is met, and the day's end always ends
it. `test/daily.cjs` gains a section that wins an ordinary shift through the
same calls a tap makes and asks for ALL DELIVERED on the next tick — it fails
on the v2.45 wiring (card still down at tick 2167 of the win). The route panel
also clears itself when no job is active, so a GET OFF cannot outlive its job;
that half is not separately gated (the in-page loop never renders, and a check
that cannot fail was dropped rather than kept).

**The fix broke the shift back, and the card caught it.** Ending on the
delivering tick ran the end card before the shift log's next poll (it polls
from the draw loop), so a 3/3 win listed its third job as NOT DELIVERED.
`finish()` polls the log before closing it; the daily gate's bot polls the way
the draw loop does and fails when a 3/3 win reads otherwise. The same card said
`126t to spare` — the log speaks minutes now (`just in time`, `LATE by 2 min`,
a missed plan `~6 min` against `~4 min`), and the gate fails on any `Nt` in it.
Both new checks were run against their mutants and fail on them.

Readability, all off the screenshots: **the phone HUD** reserved 92px on its
SECOND row for a HUB button that sits on the first, so the stats wrapped onto a
third row whenever the job timer read two digits and the map jumped ~25px —
the second row runs full width now. **The on-map walk callout** said
`WALK 7t · CATCH 2H +0t · GO` in 9px: raw engine ticks, which the house
vocabulary (`ui.js`) promises never reach the screen. It reads
`WALK ~1 min → 2H now` at 11px and is drawn over the courier rather than under.
**Zoom rail** labels 9 → 11px; the title's shift line 10.5 → 12px. A tall end
card no longer slides under the HUB button (the veil keeps 64px clear on a phone).

**CI caught a ruler, not the page.** `misses.cjs` failed once on main (4T@22)
and passed on the same commit on the branch. The gate dated each MISSED banner
as its own clock minus the banner's age, but the banner redraws every 250ms,
so a stale banner dated a pre-watch miss LATE, into the judged window — and the
panel's own record, which has the true tick, expires after 8 ticks, so reading
it at the end of the run found nothing to correct against. The gate now
collects that record every frame, re-dates each banner to it, and counts one
miss once (the old count of 9-10 was the same few misses seen on several
frames; it reads 5/5 now, run after run). Reproduced locally before the fix
(4T@18); a tracker mutated to report unlit catches still fails it (5/69).

What the playtest found and left: a ticket-inspection card can push the lit
CATCH below the fold for a moment (it is the thing asking for a decision, so it
goes first); the zoom rail covers the map's top-right labels; the shift log's
legend percentages are 10px.

## v2.45 — 2026-09-23

**The daily shift.** Roadmap NEXT LEVEL, L3. With no parameter the game is
TODAY's shift: the local date is the seed, so everyone who opens it today gets
the same city day, the same jobs, the same event deck and the same rival. The
title card names it — *DAILY 1 · 23 Sep* — and the end card leads with the
result as a grid, a square per job on the ask: 🟩 on time, 🟨 late, ⬛ not
delivered, drops after it as a count. SHARE uses the phone's share sheet, the
clipboard where there is none, and puts the text on screen if neither works.
`?shift=N` still pins a shift and `?shift=random` still deals a fresh one;
neither records anything or offers to share.

Three rules, each against a way the shape goes wrong. **The first finish is the
result**: replaying today is practice, the title says so BEFORE the run starts,
and a better practice score never overwrites the day. **The date is the
player's own**, as Wordle does it, counted on UTC midnights so a daylight-saving
weekend is still two days. **Nothing leaves the browser**: the record is
localStorage, sixty days of it, and the share line is text you send yourself.
A streak counts back from today (the arcade's own rule). A clock set before the
epoch gets a daily with no number rather than a *Daily 0*, which is what the
first build showed on the day it was made.

**THE JOBS FOLLOW THE SHIFT, which the daily could not do without.** v2.42 made
the city day, the deck and the rival follow the shift number and left dispatch
alone: offers were hashed from where you stand and how far into the shift you
are, and nothing else. Every shift ever played dealt the same work, and a
daily would have dealt the same work every morning. The shift number joins the
hash now (and the hand-off's). Unset — every bare-node gate that builds a
challenge by hand — the offers are byte-identical to before, so no fixed test
moved.

**A DAILY THAT CANNOT BE WON IS BROKEN FOR EVERYONE AT ONCE, so the dailies are
played before anyone meets them.** `shifts.cjs --dailies=N` plays the next N
calendar days on their real seeds and drawn city days with a sensible policy,
and `--gate` holds the next fourteen winnable. Its first run lost three of
thirty, and all three were the same **real bug, older than this version**: the
catch panel took the network's three best plans and let the cargo rule refuse
the tap. With a fragile parcel (tram only) at Kamppi the three best plans to
Sörnäinen were all metro, so every lit CATCH was refused, no tram was ever
offered, and a sensible player stood at the stop for 2,800 of the shift's
3,000 ticks. Put thirty varied bots on each of those boards and they won 67–77%,
so the days were never unwinnable — the panel was hiding the way out. Plans
are filtered by what the parcel may ride BEFORE the top three are taken, by one
predicate (`allowFor`) the panel, the dispatcher's pricing, the drops and the
bot all share, and when the rule rather than the network leaves nothing the
panel says so. `route-choice.mjs` checks every anchor pair for every restricted
cargo — none refusable, none starved — against a control that the unfiltered
plans at Kamppi really do contain the metro; both shapes of the bug (no filter,
filter after the cut) are caught.

| | |
|---|---|
| next 30 dailies, before the fix | 27 won |
| next 30 dailies, after | 30 won |
| next 90 dailies, after | 90 won · scores 248–1811 · 23 Helsinki Day, 28 market, 19 match, 20 quiet |
| random bots, ordinary day, 80 | 86.3% (v2.44: 80.0%) |
| mean score, same cell | 1189 (v2.44: 1565) |

The mean score fell by a quarter and that is the instrument, not the game:
before this, every bot played one board, and that board happened to be rich.
The win rate moved inside the noise.

**One ruler fixed on the way.** The misses gate failed on a MISSED banner at
tick 14 with the observer's first sample at tick 16 — a real miss from before
the gate was watching, surfaced because shift 1 now deals a job whose first
tram leaves the moment it is taken. A banner from before the first sample is
set aside and counted, and at least three must still be judged.

**Also:** the end card read *goodwill +-4* after pocketing the wallet.

Gates: `test/daily.mjs` (50, bare node), `test/daily.cjs` (16, browser: two
strangers get the same board, the first finish is the result, SHARE copies a
line that links to today, a pinned or random shift records nothing), the cargo
section of `route-choice.mjs`, and `shifts.cjs --gate` at 11 with the dailies.

## v2.44 — 2026-09-23

**The dispatch list stopped rewriting itself five times a second.** CI caught
it first: the phone gate's tap on the first job resolved to a row that was gone
by the time it was pressed ("Element is not visible", v2.43's run). The list
re-rendered every two ticks so a *now* could become *in 1 min* promptly, and
the first cut replaced the whole slot's innerHTML each time whether or not a
character had moved. A thumb landing between two replacements lands on
nothing. The DOM is written only when the words change now; the gate taps in
one evaluate, the way a thumb does, so it no longer depends on that.

**The nightly HSL refresh had failed every run since the 12th, and said
nothing useful.** Each run stopped at *cannot resolve anchor toolontori* and
not one printed what the feed calls that stop now, so the failure was
unactionable from the log and nobody acted for twelve days. `scripts/hsl-diff.mjs`
prints the stop and line names gone and new between the shipped pack and the
feed, the workflow runs it whether or not validation passes and writes it to
the job summary, and the generated pack is uploaded on every run rather than
thrown away with the runner. The HSL feed is blocked from the build sandbox
(403), so the alias itself is added off that log, not guessed.

## v2.43 — 2026-09-18

**A job is a PARCEL now, not a person.** Owner, 2026-09-18: *"Recipients names
aren't needed. Maybe package size is relevant, can carry many smaller but only
few or one larger. They can be also color coded rather than named."* Both halves
of that are the same change, and it lands on the one row the whole game is
played from.

**Names are gone.** A dispatch row used to open *Riikka · Ooppera · asks for
you* — three words of reading before you reach the thing you are choosing
between. It opens with the parcel now: a coloured box whose SIZE is what it
costs you to carry, then the place, then the tram and the price. The hand-off
says *handed to you here* rather than naming a person, and a standing is PIPS
instead of a phrase (`standingWord` is deleted rather than left unused — a
phrase with no reader is dead code). The regulars still exist, still remember
you and still tip; what is gone is their names on screen, which is exactly what
was asked.

**THE BAG IS SPACE, AND THE SENTENCE IS THE ARITHMETIC.** *Many smaller but only
few or one larger* is a capacity of 5 with small 1, medium 2, large 5 — five
smalls, two mediums with a small beside them, or ONE large and nothing else.
That replaces two separate caps (one queued job, two drops) with one rule, and
it is the first time this game has asked you to give something up to take
something. `test/parcels.mjs` asserts the sentence as arithmetic rather than
trusting three constants that look about right.

| size | units | cargoes | pays |
|---|---|---|---|
| small | 1 | documents, express, hot food | ×0.82 |
| medium | 2 | parts, fresh food, market goods | ×1 |
| large | 5 | fragile, equipment | ×1.45 |

A large has to pay for the drops it stops you taking or nobody would take one,
and must not pay so well that the packing stops mattering — gated both ways: a
bagful of smalls still out-earns one large, and a large still beats a small by
half again.

**ONE PALETTE, because there were two.** `cargoColour` in core-v212.js and
`cargoColourOf` in job-board-v212.js disagreed on all eight cargoes, so the
deadline ring and the offer row drew the same parcel in two different colours.
Colour that means something may only be defined once, and it lives in
`js/parcels.js`. The eight are measured against each other in CIE Lab, not
picked by eye — **the first set failed its own gate at dE 19.6 between hot food
and market goods**, which is two parcels a player cannot separate and therefore
no colour coding at all. Market goods is a deep red-brown now and the closest
pair is 25.2.

**THE GAME WAS OFFERING WHAT IT WOULD REFUSE.** The first build of the capacity
rule listed every drop and every second job at full strength and then answered
the tap with *the bag is full* — a rule kept to itself until you break it, which
is the same fault as quoting a number you then do not use. A parcel that will
not fit is drawn dim, disabled, and says *no room in the bag*. Gated in the
browser and driven BOTH WAYS on its own page: with a small parcel in hand the
drops are tappable, with a large one they are not, and no row the sheet leaves
enabled is one the engine would turn down.

**The cost, measured.** 80 bots a cell, the walking bot, ordinary day, against
v2.42's identical cell:

| | v2.42 | v2.43 |
|---|---|---|
| win rate | 85.0% | 80.0% |
| mean score | 1793 | 1565 |
| drops taken / made | 7 / 6 | 6 / 5 |

Five points of win rate and 13% of score is what the bag costs, and it is the
mechanic working rather than a regression: a quarter of all jobs are large, and
a large one means the leg carries nothing else. Well clear of the 40% floor.

Gates: `test/parcels.mjs` (71, bare node) and four new checks in
`test/phone.cjs` (43). Six mutations, six caught. `regulars.mjs` moved to pips
and a nameless door.

## v2.42 — 2026-09-18

**The shift has a name now.** Roadmap item 7. Four city days, one per shift,
announced on the title card BEFORE start — a roguelike modifier you meet by
losing is a different genre, and this game decided at v2.26 that a number it
will not show is a number it may not use. Every day rides a lever that already
existed, which is Slay Kallio's ascension-ladder rule: a modifier that needs a
new system is a second game wearing a hat.

| day | what it does | rides |
|---|---|---|
| MATCH DAY | the Töölö trams crawl all morning | `liveNetwork.hold()`, repeated |
| MARKET MORNING | more drops, and a premium in the Hakaniemi quarter | `alongOffers()` |
| HELSINKI DAY | five encounters instead of three, double goodwill | `drawSchedule()`'s budget |
| QUIET SUNDAY | a third of the trams gone, walking quicker | `HEADWAY_MIN` + `walkCost` |

**And a shift NUMBER, because every shift was seed 7.** The event deck and the
rival were both mounted on a hardcoded seed, so a player replaying the game got
the same three encounters at the same three minutes for ever. A shift is now a
number — random per visit, pinned by `?shift=N`, printed on the title card and
the end screen so a shift can be quoted, replayed and handed to a bot. `?day=`
pins the day, and `?day=none` is an ORDINARY day: the control the harness needs,
since a modifier measured against itself is not measured at all. The job offers
still do NOT vary by shift. That is the next thing to do rather than a thing
done — varying them in the same version as the days would leave two changes
arguing over one measurement.

**THE BOT COULD NOT WALK, AND EVERY NUMBER THIS PROJECT HAS PRINTED CAME FROM
A COURIER WHO REFUSED TO.** QUIET SUNDAY takes trams away and gives the
pavement back, and it first measured as a flat 25-point loss with the
compensation invisible, because `shifts.cjs` had no walk in it at all. A
mechanic the harness cannot pursue is a mechanic nobody can balance — TURF's
cache, for the third time. The bot now walks when walking there and catching
from THERE beats standing here. Measured at 60 bots a cell:

| | bot cannot walk | bot can walk |
|---|---|---|
| ordinary day | 68.3% | **81.7%** |
| quiet Sunday | 40.0% | **70.0%** |

Walking is worth +13 points on an ordinary day and +30 on a Sunday. The second
number is the day working exactly as written; the first is a standing finding
about every measurement before this one. It is also the first real payoff Local
Knowledge (v2.40) has ever had — the stops you have been to are the shift.

**Two days were INERT and the measurement said so.** This is v2.40's lesson
arriving on schedule, and the gates now ask the question directly.
- MATCH DAY first crowded families 4 and 10, because those are the stadium's
  lines in the real city. The harness then showed **line 10 carrying 0.0% of
  all catches in a shift** — half the day was aimed at a service this game
  never uses. It crowds 2 and 4 now, which carry ~28% of every catch between
  them and both really do run past the stadium, so the fiction survived contact
  with the measurement.
- MARKET MORNING keyed its premium on one stop id, and measured at **six offers
  across sixty shifts**, which is not a cluster, it is a rumour. The premium is
  a 600 m QUARTER now, and — the half that fires on every route — a market
  morning offers a line's ordinary drop AND the quarter, so the day is more
  work rather than only better-paid work. A first attempt to fix it by dealing
  the market anchor into dispatch made things worse and was reverted: making
  the market your DESTINATION takes it out of the drop window, because
  `between` excludes both ends of the leg.

**The crowd is a measured number, not a judged one.** A three-point ladder at
80 bots a cell against an ordinary-day control: 45 ticks a hold reads inert
(−1.3 points, the crowded families lose 1.6 of share), 110 reads brutal (−17.5,
share −7.0), **80 ships** — felt, routed around, and far above the shift gate's
40% floor.

**The deck, measured.** 80 bots a cell, the walking bot, each bot pinned to its
own shift number, against an ordinary-day control:

| day | win rate | mean score |
|---|---|---|
| ordinary (control) | 85.0% | 1793 |
| MATCH DAY | 67.5% | 1664 |
| MARKET MORNING | 75.0% | **2190** |
| HELSINKI DAY | 85.0% | 1760 |
| QUIET SUNDAY | 63.7% | 1172 |
| **what a player actually meets** | **76.3%** | 1721 |

Read it as two hard days, one rich one and one mild one. MARKET MORNING is the
shape an upside card should have — not easier, **richer**: +22% score for a
10-point win rate, because a bag of three drops costs time the bot spends
greedily. HELSINKI DAY is honestly the mildest of the four: it does what it
says (five encounters, goodwill ×2, measured) and it costs about 58 ticks of a
3000-tick morning, which is flavour rather than pressure. Said here rather than
dressed up. MATCH DAY's cost read −10.0 in one block and −17.5 in another at
the identical setting, which is the per-cell noise at this sample doing what
v2.24 said it would; the direction is a finding, the size is not.

Gates: `test/city-day.mjs` (83, bare node) asks whether the four days are well
formed and whether every name they use is real IN THE SHIPPED PACK — a market
at a stop that does not exist is the inert bug wearing a nicer hat.
`test/days.cjs` (32, browser) asks the only question that matters: in the
running game, does the day do anything? Six mutations, six caught. The other
browser gates are now pinned to `?shift=1&day=none`, because a gate that lets
a third of the trams vanish at random is measuring the dice.

**Roadmap item 8, the ferry, is CLOSED rather than deferred.** Its condition was
"only if the pack carries the Suomenlinna ferry as a layer". It does not — 34
lines, 30 TRAM and 4 SUBWAY, no FERRY — so the set piece would need a service
the city does not run, and this project does not author HSL data.

## v2.41 — 2026-09-18

**The UI pass, from six screenshots.** Phone and desktop, title / dispatch /
waiting, looked at rather than gated — the owner's direction is Mini Metro and
Mini Motorways: *fun, approachable, simplistic, succinct*. The night map stays
(owner, 2026-09-02); what moved is everything around it.

- **A badge budget.** A phone at CITY scale carried fifty labelled trams and
  the crowd rule could only stop them overlapping; the map was a wall of
  chips. `LiveNetwork.draw` takes a `budget` — at most N labelled badges,
  in rank order, the rest dots at their true position even where there is
  room — and main sizes it to the canvas (one label per ~11k CSS px², 10–32).
  Rank fills the budget with the lines you can use, and **the dispatch
  offers' lines now count as relevant** (they did not: with no job taken the
  rank was flat and the budget went to whichever line sorted first).
- **No key on a phone.** Seventeen chips over the bottom of a 390px map were
  the loudest thing on it, and every badge and every row already wears its
  line. The legend draws only on a canvas 600 CSS px or wider.
- **Desktop is map-first.** The sheet was two thirds of a 1280px screen and
  mostly empty; the map is the game. The grid is now `1fr` map + a 380–440px
  column, the canvas fills its cell (the inline board aspect is overridden),
  and the feed is one quiet ellipsed line at the foot of the column instead
  of a two-line log at its head. The vehicle counter (`CITY · 64/310 near`)
  is gone from the HUD; on a phone the layer inspector button goes too, so
  the top row is clock · pause · speed.
- **The surround is the land grey.** With a canvas wider than the board, the
  near-black outside it read as a slab on a black sheet with a fifth of the
  screen dead each side. Same grey as the paper now; the frame line says where
  the data ends.
- **The zoom rail is one pill**, not three shadowed slabs; the version hero is
  a line under the title, not the loudest thing on the card.
- **Copy.** *a stranger* → *new to you*; *Vesa is going for this* → *Vesa
  wants it*; and the waiting panel's *Lit says CATCH — tap it* no longer
  shows over three dim rows — it reads *Tap the lit one* when one is lit and
  *Nothing to catch yet · first in N min* when none is.

Gates: badges (20), phone (37), misses (8), cabinet route (19), the bare-node
suite, tokens, version sync, shifts --gate — the budget is a draw-time rule
and the sim is untouched. Nine tokens moved.

## v2.40 — 2026-09-18

**Local knowledge, and the obvious rule is INERT.** The walking network was
fully known from the first second of the first shift, which is nobody's
experience of a city. The obvious fix — learn a street by standing on it —
was built, and it changed nothing: walking is only ever offered FROM where you
are, and arriving is what teaches you, so by the time the filter could bite
you already knew the street. Every walk was still offered. Caught in a browser
probe before it shipped, and the check that would have caught it is now in the
gate so it cannot come back.

What is learned is the **FAR END**: you know a way on foot when you have been
to BOTH stops it joins. Not circular (you reach stops by tram), granular (half
a street can be known), and arriving somewhere new really does open the map —
one new stop, one new walk, and the feed says so. Three central stops are known
from the start. Persisted in `localStorage`; the end screen counts them. **The
tourist card is the payoff**: it shows you a stop you have never been to, and
never one that joins nothing you know.

**The other courier.** Vesa works the same board: a purple figure on the map
with a dashed line to where they are heading, and a claim on ONE ordinary
offer — *Vesa is going for this · 15 s*. Let it run out and the job is theirs,
with a line in the feed and a count on the end screen. Never the hand-off
(that was put in your hand), never the last job of the shift, and never inside
the first six seconds of a board. It is deliberately NOT a second simulation:
a rival with its own route planner is a second game running beside yours and
none of it is visible.

**A decisive player never loses a job to them, and that is the design** — so
the only bot that can measure the claim is one that dawdles. `shifts.cjs`
gained a `dawdler` policy that reads the whole board for forty seconds before
choosing: it loses two jobs a shift, and the forty random bots lose none. A
mechanic nothing in the harness can pursue is a mechanic nobody can balance
(TURF's lesson about the cache); this is the same thing from the other side.

Gates: `test/city.mjs` (51, bare node, in CI), including the inert rule as a
standing check. Six mutations, six caught. `shifts.cjs --gate` is 10.
Win rate 67.5%, inside the band.

## v2.39 — 2026-09-18

**Three things that share one currency**, which is why they shipped together.

**The streak is the LAST multiplier** — Balatro's shape, which this engine
already uses and had nowhere else to put: every bonus adds, then the chain
multiplies the lot. Consecutive on-time deliveries pay ×1 ×1.25 ×1.5 ×1.75 ×2,
capped, and **one late parcel takes all of it**. That asymmetry is the whole
decision: at four, do you take the fast job or the paying one? A drop on the
way counts — it is a delivery. Live on the HUD in green beside the score.

**The hand-off**: the person you just delivered to has another one going out,
in your hand before dispatch hears about it. It is not a new kind of job — an
ordinary offer from where you stand, listed first, with **+25% that expires in
fifteen seconds**. Let it lapse and it is still there at the ordinary price.
**Measured and then made harder**: offered at every door it took the random
bots from 62% to **87%**, because it removes the walk back to a hub and
dispatch stops being a decision. So it is EARNED — only after an on-time
delivery, and then at about half the doors, except a regular, who always has
one. Back to 62.5%, the same as v2.38.

**Regulars** (`js/regulars.js`): six named people at six stops — Riikka the
florist at Ooppera, Seppo's print shop at Hakaniemi, Mirja at the harbour
office, Tuomas the lab courier, Anneli at the market café, Kaarlo's ceramics.
Standing 0-5 in `localStorage`, raised by an on-time delivery to them and cut
by a late one; it pays a **tip** on the standing you ARRIVED with — today's
delivery is what moves it for next time — and the board shows their name and
how you stand (*seen you once*, *asks for you*). **This is what goodwill was
for**: the event deck's granny has been accruing a number with nothing to
spend it on, and goodwill now counts as standing with EVERYBODY for the rest
of the shift. Word gets around, one number reaches six people, and helping is
never a charity the score punishes you for.

**A REAL BUG, found because a gate refused to build**: the hash is `>>> 0`
(unsigned) and three shifts off it used `>>` (signed). Half of all seeds have
the top bit set, so `CARGO_KEYS[-1234]` is `undefined` — silently — and
`CARGO[undefined] || CARGO.documents` had been giving **38% of all drops no
cargo at all** since v2.36, falling back to documents. The hand-off hit the
same thing and simply was never built. `events.js` masks with `&0xffff` and
was never affected; its `>>>` is defensive. The gate that sees it is not
variety (a negative index tallies as its own key and the histogram looks
healthy) but the direct question: **every drop must carry something real**.

Gates: `test/regulars.mjs` (63, bare node, in CI) — the ladder and its cap, one
late breaking it, a drop counting, the tip paid on arrival standing, goodwill
capped, the door window, the hand-off listed first and only where handed over,
and the signed-shift trap. Nine mutations, nine caught. `events.mjs` grew a
600-check sweep asserting every drawn card is a real card. `shifts.cjs --gate`
is 8: an on-time chain is reachable, hand-offs are taken.

## v2.38 — 2026-09-17

**The event deck** (owner: *"roguelike random events type deal… help the
granny across the street (10 sec delay)"*). `js/events.js`, two kinds:

- **Disruptions are facts.** A car on the rails, a points failure, a
  passenger unwell: one line is HELD at its stops for four to six game-minutes.
  `LiveNetwork.hold()` makes it real rather than announced — positions are a
  closed form in the tick, so a hold is ticks the layer does not experience
  (`effectiveTick`), and both the fleet and `nextArrival` read it, so the catch
  panel's *in 3 min* becomes *in 9 min* and the plan you made visibly goes
  wrong. An estimate never looks through a FUTURE hold: you learn of a
  disruption when it happens, which is what makes it one. Shown as a banner
  with the line's badge and the minutes left on it.
- **Encounters are a choice** — 80 Days' shape: a face, one line, options as
  rows priced in seconds. The granny (walk her across, −10 s, +goodwill), the
  tourist, the inspector (documents cargo: *waved through* — FTL's blue option;
  otherwise show your ticket, −3 s), the wallet (hand it in, or pocket it for
  more score and −3 goodwill — the trap), the busker, the stroller, an old
  friend. Every card has a free way past. **A card never blocks the tram**:
  catching while one is up takes the free option for you — boarding IS walking
  on. Only having chosen to help holds you (`busy`), and that is the cost.
  Goodwill accrues on the challenge and nothing spends it yet; Regulars will.

The deck is DRAWN, never rolled: the schedule is a hash of the shift seed, so
a shift replays and the bot can play it. Budget: three encounters and one
disruption a shift, worst-case encounter cost under 280 ticks. Measured:
random-but-sane bots answer ~3 events a shift at ~85 ticks and 37 of 40 meet
a hold; the win rate reads 62.5%, inside the noise of v2.36's 63.5%.

Gates: `test/events.mjs` (53, bare node, in CI) — a free option on every card,
a seeded draw, no card twice, the budget, and a 240-tick hold moving the next
arrival by exactly 240; `shifts.cjs --gate` gained two checks (events are
answered, holds happen). misses.cjs stays green because a card never blocks.

## v2.37 — 2026-09-17

**The succinct UI** (owner: *"make the UI feel a bit more fun, approachable,
and simplistic. The Mini Metro and Motorways are succinct experiences"*). One
rule: shapes before words, and no ticks on screen.

- **Minutes, not ticks.** `~145t` and `deadline 337t` were the engine's unit
  leaking into the game. `js/ui.js` reads ticks-per-minute off the clock and
  everything on screen says *now*, *in 3 min*, *~4 min*, *8 min left*. Ticks
  stay in the engine and every test.
- **The HUD is glyphs**: the clock, deliveries as dots (`●○○ +2`), the score,
  and the current job as its cargo glyph inside a RING that empties with the
  deadline. The words "deliveries" and "deadline" are gone.
- **Every option is one row**: the line's own badge (the block that rides on
  the map, so a plan and its tram look like one thing) → where it is headed ·
  *now* or *in 3 min* · the price. A transfer is two badges. No DIRECT/VIA, no
  "YOU ARE AT", no "Lit says…" past the first job.
- **Dispatch is one row per job**: cargo glyph, destination, the first badge
  that gets you there and when, what it pays. It was four lines of prose.
- The feed and the read-only panel are gone on a phone; the map grew to
  50dvh; the title card is two sentences.
- Cargo is a glyph (✉ ♨ ⚙ ◇ ▣ ⚡ ❀ ▤), the three-letter code its title.

Gate note: phone.cjs's "dispatch list is gone" check keyed on the old heading
text and would have passed vacuously; it keys on `DISPATCH ·` now.

## v2.36 — 2026-09-17

**ON YOUR WAY — Paperboy's loop on a tram.** Waiting was still 22% of a shift
and riding was 600 ticks with nothing to press. The main job says where you
are going; these say what you could drop at the REAL stops you will pass
getting there — the HSL stop table (292 stops), not the twenty-node game
graph, because between two graph nodes a tram calls at three to eight stops
nobody could deliver to before. A drop is made from aboard while the vehicle
stands at the stop: no headway, no get-off. One ride serves two or three
jobs, and choosing a line is choosing what it passes — every offer names the
line that passes it, which is the point. Two offers per stop, a bag of two.

**Drops pay score and count in their own tally; the shift's ask stays the
authored A→B jobs.** Measured first the other way with a survey bot playing
the whole day with no target: a day held ~12 deliveries of which ten were
drops, and the jobs had become a chauffeur for a drop route. The owner's brief
says A→B jobs are the objective, so the HUD reads `1/3 +4`, the end screen
gets a *drops on the way* line, and a shift is won the same way it was.
Random-but-sane bots (which take a drop on their chosen line half the time)
win 75% of 40 and hand over ~6 drops each.

**Found on the way: the first drop stranded the courier.** The mobility
controller keyed its leg on `ch.index`, and a drop bumped index without
changing the job, so `syncLeg` read a new leg and wiped the ride from under
the courier — status "riding", aboard nothing, for the rest of the shift. The
random bots fell 60% → 37% the moment drops existed and every loss was
"ended riding, 1 delivered". The key is the job's id now.

The target is a per-shift property (`challenge.target`, `DELIVERY_TARGET` the
default) so a campaign city or the survey bot can carry its own; the HUD and
the end screen read it from the challenge.

UI: the ON YOUR WAY panel sits under the boarding options (its own sheet slot,
`alongBoard`) and vanishes once you board; the ride strip marks each drop at
its true fraction of the leg with its name. `shifts.cjs` gained `--survey`
and a fourth gate check (drops are offered, taken and handed over — mutation
that never hands one over: caught).

Reference note: the owner pointed at Trafficity (Steam). Steam, SteamDB,
Reddit, YouTube, Wikipedia and the games press are all blocked from this
sandbox and nothing about it is indexed by search yet, so the reference pass
against it has not happened. The insight built here is from the reference in
the repo — Paperboy — whose whole loop is deliveries along a route you are
already travelling.

## v2.35 — 2026-09-13

**The shift could not be won, and now it can — measured, not felt.** Nothing in
this project had ever finished a shift: the gates certified that a job could be
taken and a tram caught, and the one person who tried by hand (v2.34, twice)
got 0/3 both times. `test/shifts.cjs` drives the real game — the real
timetable, the real challenge, the real mobility controller — through the same
commands the buttons call, stepping the clock with `flow.runTicks` rather than
the wall clock, so a shift runs in under a second and two hundred in minutes.
The fleet and the offers are deterministic (hashes, not rolls), so the sample
is over PLAYERS, not seeds: four named policies plus random-but-sane bots that
choose among what the panel would show.

**At v2.34, random-but-sane bots won 19% of shifts. The cause was the fleet.**
Three vehicles per line, whatever the line's length, makes the headway the
length divided by three: tram 15 every 61 game-minutes, the metro every 49,
trams 1/7/9 every 25-29 — against a real morning of 7.5 for a trunk tram and 4
for the metro. The 500-tick stand at Arabia for the next 6 was not bad luck, it
was the timetable. `LiveNetwork` now provisions each line to a TARGET headway
(`HEADWAY_MIN`, vehicles = cycle ÷ headway, never fewer than two): 102 vehicles
became 310, the median headway went from 692 ticks to 296, and the same bots
went 19% → 35% at 10/5 → **52% at 7.5/4**, which is HSL's morning peak, which is
when the shift is.

**The second cause was dispatch.** Loop 47 listed first whichever job had a
tram within reach, and on job one that was Lasipalatsi → Arabia at ~1500
ticks — half the day for one delivery. A bot taking the first-listed job
finished 1/3; a bot taking the cheapest finished 3/3 at tick 2201. Offers are
now SIZED TO THE SHIFT: priced door to door by the same estimator the deadline
uses, anything that cannot land before the day ends is dropped, and the three
kept are a spread — cheapest, middle, dearest that fits. With both fixes the
random bots win **63.5% of 200 shifts** and the cheapest-job player finishes at
tick 858; median first delivery moved from tick 1191 to 509. `--gate` runs 40
and holds 40% and a cheapest-job win; it is in CI.

**Found on the way, and fixed: RUN THE DAY AGAIN was a dead second shift.** It
booted a fresh flow and challenge in place while main-v212's mobility
controller, fleet, trails and log all kept the old ones — measured,
`tm.mobility.ch !== tm.challenge` after the button, so a job taken on the second
shift was invisible to the controller and no CATCH could ever light. It reloads.

**UI, from the screenshots.** The lit CATCH is FIRST — three 130px cards had
put it second or third, under two greyed WAITs, half below the fold on a phone;
options are one row each now (verb, service, where it goes, cost) and all three
fit beside the map. The HUD lost its 46px dead band beside the HUB button: the
clock and controls sit to the right of it, the status line under. The feed
truncated mid-word ("Transit only; no") and now ellipsises one line on a phone.
The read-only ALSO CALLING HERE panel is folded into a `<details>` (MISSED stays
outside it, visible). The duplicate "ON TRAM 1H" card above the ride card is
gone, and the ride card is a STRIP — passed stops filled, where you are ringed,
the destination flagged, a countdown off the same closed form the catch panel
uses — instead of "Vehicle hsl:1H:2 · current Kamppi · next Kluuvi".

**Art.** The courier is a FIGURE and is on the board whenever you are: a flat
fill inside a hard line — head, coat, bag, two legs that swap on a five-tick
gait — standing at the stop while you wait, walking while you walk. It used to
be a navy dot marked W, and only while walking, so for most of the shift you
were nowhere on the map at all. Every badge has a NOSE on its leading edge from
the path tangent, because a CATCH lights only for a vehicle heading your way
and a rectangle could not say which way that was. Dots paint UNDER badges now
(a dot at the same spot as the badge it yielded to was punching a hole in the
label). The job's destination carries a pennant on a pole with the stop's name
in the cargo's colour, instead of a second ring in a second colour. And one
warm wash over the ground, strongest at 07:00 and gone by 08:15, so the five
minutes have a direction you can feel — soft-light, so the line ink is
untouched.

Gates: `shifts.cjs --gate` (3, new, in CI), phone.cjs 37, misses.cjs 8,
badges.cjs 20, cabinet-route 19, tokens.mjs, and every bare-node gate green.

## v2.34 — 2026-09-11

**The cache tokens were wrong, and nothing was looking at them.** Two faults,
one of them shipped an hour earlier in v2.33:

`core-v212.js` was rewritten in v2.33 — its `BUILD_VERSION` moved and, more to
the point, its import of `live-network.js` moved from `?v=7` to `?v=8` — and it
kept `?v=36`. A returning player holding a cached `core-v212.js?v=36` would have
gone on importing `live-network.js?v=7` for as long as that cache held: the
badge fix sat on the server, the token said nothing had changed, and the board
kept its pile-up. It is now `?v=37`.

`deliveries.js` was being imported under **two** tokens at once — `?v=11` by
`core-v212.js` and `?v=10` by `job-board-v212.js` — which is the exact failure
the one-token-per-module rule is named for: the browser instantiates the module
twice and its state splits in half. It has been that way since v2.29 moved
`DELIVERY_TARGET` from 6 to 3 and bumped only core's copy, so a returning player
had an engine wanting three deliveries and a job board reading six.

**`test/tokens.mjs` is the gate, and it measures against the DEPLOYED tree**,
because a token means "this is not the file you already have" and the file you
already have is what it has to be compared against. It walks the import graph
from `index.html` rather than globbing `js/*.js` — the folder still carries
`main.js`, `main-v210.js` and `main-v211.js`, superseded entry points nothing
loads, whose stale tokens are dead files rather than a cache fault. It asserts
one token per module across the live graph, and that no module's bytes changed
while its token stood still. CI fetches `gh-pages` for it; with no ref to read
it **fails** rather than skipping.

The reverse case is reported and **not** enforced, and finding that out is worth
writing down: "bytes identical, token moved" is what a CORRECTION looks like.
v2.33 shipped core's new bytes under its old token, so the deployed copy already
matches this tree and the 36 → 37 that fixes it reads, from bytes alone, exactly
like a gratuitous bump. Nothing in the two trees can tell them apart. The cost of
a wrong bump is one refetch; the cost of a missed one is a player stuck on the
old build until their cache turns over.

Also in this release, in `test/hub-smoke.cjs` rather than the game: the arcade
gate was failing about one run in four, two different ways, and both were the
ruler rather than the floor. The hold-Start test dereferenced
`.arcade-home .fill` in its wait predicate — null before the shell module ran
and null again after the hold navigated home, so the wait rejected on its own
exception and reported both "the fill never started" and a page error. And a
page still loading when the gate walks on has its requests aborted, which
arrives as "Failed to fetch" from whatever was mid-flight — usually toko-move's
own boot fetch, reported at the end of a run against a page left minutes
earlier. Abort-shaped messages are now dropped only while a navigation the gate
itself started is in flight, and every error is stamped with the page that was
open when it arrived, because an unstamped message named neither the game nor
the moment.

## v2.33 — 2026-09-10

**The line badges never dodged each other.** `LiveNetwork.draw()` painted one
badge per vehicle at its exact projected position, in vehicle order, with no
collision handling of any kind — while `drawStopLabels()` was carefully avoiding
those same badges, so stop names dodged trams and trams piled on trams.
Measured, at deviceScaleFactor 2:

| | badges | overlapping pairs | worst stack | badge area buried | fully hidden |
|---|---|---|---|---|---|
| phone, CITY | 27 | 34 | 9 | 25.3% | 1 |
| phone, ROUTE | 62 | 49 | 6 | 24.1% | 2 |
| phone, STOP | 18 | 5 | 3 | 16.5% | 1 |
| tablet, CITY | 27 | 22 | 7 | 19.2% | 1 |
| tablet, ROUTE | 62 | 31 | 4 | 19.8% | 1 |

The heap around Kamppi is in every screenshot sent to the owner since v2.28.

**The fix is DEGRADATION, not movement.** A badge is not a label beside a
vehicle, it *is* the vehicle — so nudging one out of a crowd moves the tram, and
at city scale a fourteen-pixel nudge is several hundred metres of lie about where
the service is. Instead the highest-ranked vehicle in a crowd keeps its labelled
badge and everything under it falls back to a dot at its true position. Nothing
is dropped and nothing moves; what is given up is the label, which was
unreadable in that heap anyway.

**Rank comes from the caller, because the board cannot know which tram matters.**
`draw()` takes a `priority` function and `main` supplies one from the lines that
are any use to you right now — the one you are riding, the one your selected plan
says to take, and the ones the boarding panel is offering. Without it the
declutter would be arbitrary about which service it silenced, and the silenced
one is often yours. A selected vehicle outranks everything.

Ties break on vehicle **id**, never on position. A positional tiebreak is the
obvious way to write it and it makes two crossing trams swap which of them is
readable, frame after frame, for as long as they are close.

After: **zero** overlapping badges at every scale on both viewports, with 12 of
27 vehicles labelled at phone CITY and 32 of 66 at phone ROUTE.

`test/badges.cjs` (20 checks) is the gate: no two labelled badges overlap at
three scales on two viewports; badges + dots account for every vehicle shown;
`main` really passes a rank function; the declutter is actually engaging, so the
no-overlap checks are not vacuous; a line silenced unranked gets a readable badge
back when ranked; and every vehicle that yielded its label yielded it to one that
outranks it by rank-then-id. Six mutations, six caught — including the positional
tiebreak, which the two obvious "is it stable" checks could not see.

## v2.32 — 2026-09-10

**`MISSED` was accusing the player of missing trams the game had never offered
them.** The owner could not get the recording onto a machine that can push, so
the claim in PR #473 — that its four `MISSED` lines were evidence the catch
buttons were unreachable — could not be checked against the video. It could be
checked against the CODE, and it turns out to be a second fault that survived
v2.30.

`hub-tactics` worked its own misses out, and it asked a different question from
the panel with the buttons on it: its `arrival()` scanned **every service
calling at the stop** and took **no direction**, flagging a miss whenever any
tram on any line was at the hub and left. A CATCH lights only for a vehicle
travelling the way your leg goes.

Measured on the live build, reproducing the recorded situation — an iPad in
portrait, a job taken, standing still at Lasipalatsi for 100 seconds:
**23 `MISSED` banners across 8 lines** (4T, 10H, 4H, H, 1H, 10B, 10, 1T), while
the only line the game ever offered for that job was **1**. The overlap was
**none**. Every accusation was about a tram the player had never been offered,
and the one they could actually board was never mentioned. Same run after the
fix: **one** miss, on line 1, which had been lit.

**A miss is now what the word says**: a catch that was lit, is not any more, and
you did not board it. It is detected in `route-choice.js`, where readiness is
already computed **with a direction**, and published on `tm.catchMisses`;
`hub-tactics` reads that instead of counting for itself. Boarding is explicitly
not a miss — taking a lit catch makes it stop being lit, and calling that a
failure would blame the player for succeeding.

`test/misses.cjs`, and the first version of it was worthless: it watched
`tm.catchMisses` rather than the banner on screen, so a mutation putting the old
computation back in `hub-tactics` changed nothing it could see, and its boarding
check sampled once at the end when the list self-trims after 8 ticks — at ×4
that is 200 ms of wall time, long gone. **All three mutations walked straight
past it.** It reads the BANNER now, watches the whole of a boarding, and waits
for a catch to light rather than shrugging when none has.

Two measurement faults were found and fixed inside the gate itself, and both
were the ruler rather than the game: a 200 ms sampler at ×4 sees one frame in
eight and missed catches lighting and going dark between samples (rAF now); and
the banner is throttled, so the tick it becomes VISIBLE lags the miss by up to
two polls — measured, lit until 272, dark at 274, banner seen at 291. It prints
its own age, so the gate uses that. Before both, the same build passed and
failed the same check on consecutive runs.

## v2.31 — 2026-09-07

**Where a phone actually spends its pixels, measured rather than guessed.** v2.30
left one plan of three off the bottom on a phone, and the game's core verb is
comparing plans. So the budget at 390x664 was measured instead of nudged: the
HUD was **152px** (23% of the screen, wrapped to two rows), the board 292, the
feed 39, and the sheet **181** — while three catch buttons were **95px each**,
285px of options in a panel with 181 to put them in.

Four things came off the fat, none of them information: the HUD drops `next
X → Y` (the job panel's own first line, one row below it) and the near-count
(diagnostic) on narrow screens, which unwraps it to **130**; the feed keeps one
line instead of two; the catch button puts its verb and its arrival on ONE line
instead of two of its four, and its chips lose 2px of padding, taking it **95 →
69**; and a transfer's cost reads `+499t changing` rather than repeating the
interchange name that is already on the chip above it.

**Result: all three plans are on screen at once on a real iPhone (390x844) and
on an iPad.** At 390x664 — Playwright's iPhone 13, which is Safari with its
chrome bars showing, the worst case — two are whole and the third is past the
edge, and the panel now **counts itself**: `BOARD ONE OF 3`, so a viewport that
cannot show a plan still tells you it is there.

**One attempt at the worst case was reverted by its own gate.** Taking the board
to 37dvh bought the third button and broke something better: the canvas became
wider than it is tall, and at ROUTE the board covered **77%** of it instead of
91% — the empty-map problem v2.28 fixed, re-introduced to buy a button at a
viewport that cannot hold one anyway. The board keeps its 44dvh.

`test/phone.cjs` is 37 checks: the plan count at three viewports, the panel's
self-count when it cannot show them all, and that every option still says CATCH
or WAIT — that last one added because a mutation removing the verb was MISSED
first time round. Compacting a button to fit three of them is allowed to move
the verb and not allowed to lose it. Five mutations, all caught.

## v2.30 — 2026-09-07

**Reviewing another lane's PR #473, which diagnosed v2.28's sheet bug from the
owner's own recording.** It was superseded — v2.29 had already fixed the same
thing from the other end and shipped — and it could not merge (two conflicts, and
it claimed a version number main had already used). But its diagnosis was better
than mine in one way and it found two things I had missed, so what it caught is
here rather than closed with it.

**It proved the order was a RACE, not merely wrong.** I had reasoned my way to
the root cause; #473 measured it — same build, three runs at 820x1180, two
different paint orders, and on the run where the read-only HUB panel won, **zero**
CATCH buttons were on screen. On an iPhone it lost every time. Re-measured
against v2.29 across six runs at both viewports, the order is now identical every
time and the catch count is 3/3 on iPad and 2/3 on iPhone, against its own
after-figures of 3/3 and 1/3.

**`rideStatus` was a SIXTH writer and I had listed five.** The panel that says
which tram you are on appends straight to `#sheet` and was on no list. It came out
first anyway — correct **by accident**, because `sheetSlot` moves the named slots
to the end around whatever else is there — and the next module to append directly
would have landed on top of the buttons in exactly the same way. It is a declared
slot now, and while riding the two things you can DO (get off early, replan) lead.

**#473's CSS `order` is taken as a second layer, with its own flaw fixed.**
`order` defaults to 0 and its declarations started at 1, so a panel nobody had
thought of would jump to the TOP, ahead of the buttons — the mirror image of the
bug it was fixing. Here `#sheet>*` is `order:9` and the six named panels are 1-6,
so an undeclared panel lands last. Two layers, because either alone is a single
point of failure: a module that appends directly escapes the DOM ordering, and a
panel with no rule escapes the CSS.

**And the reason the recording says MISSED four times about trams that were
standing at the stop.** HUB OPTIONS is read-only by design — spans, not buttons,
"Availability, not recommendation" — and it said **AT HUB** in the same three
words the boarding panel uses. #473 named this and deliberately left it. It now
reads **ALSO CALLING HERE**, says *"Everything at this stop, whether or not it is
any use to you. Nothing here is tappable — board from the panel above."*

Nothing about the CATCH rule changed: a catch stays disabled unless a vehicle is
at the stop travelling the way this leg goes, which is the design working.

`test/phone.cjs` grows to 31 checks. Six mutations, each caught — and two of them
were MISSED on the first attempt, which is the finding worth keeping: a gate that
only reads the rendered page cannot tell a declared slot from one that came out
first by accident. `sheetSlot()` with no argument now reports the list, so the
gate can ask the code rather than the pixels.

## v2.29 — 2026-09-06

Two findings from the owner's first real playtest, and both were worse than
they sounded.

**"don't know how to move from one spot to another" — and it was literal.**
Taking a job did not change the screen. **Five** modules wrote into `#sheet` on
their own timers — `paintSheet`, the dispatch board, the catch panel, the hub
tactics panel, the recovery controls — and not one of them owned CLEARING it,
so accepting a job left the dispatch list exactly where it was, three `TAKE JOB`
cards deep, and appended the buttons that actually board a tram *below* it, off
the bottom of a phone, under a list that looked untouched. The only
acknowledgement anywhere was a feed line that `#feed`'s own `max-height` cut off
mid-sentence. There was nothing wrong with the boarding code; the next action
was simply behind a stale one.

`#sheet` now has five **slots** in a fixed order and each writer owns exactly
one. The order is what you can act on first: **what you can board**, then what
you are carrying, then what else this stop offers, then anything still on the
dispatch list. Boarding leads because the HUD one row above already names the
job and its deadline — measured on a phone, putting the job header first left
the first CATCH button ending at y=577 of 664. The panel says **YOU ARE AT X ·
BOARD ONE OF THESE** and, on the first job only, one line of what lit and grey
mean. The job header is three lines instead of five, having repeated the HUD.

**"tram speeds are too fast" — and no single number could have fixed it.**
Speed was a fixed DURATION per mode: fifty minutes end to end for any tram, on a
network whose lines run from about 3 km to about 17 km. So the long ones covered
five times the ground of the short ones in the same time. Measured across all
102 vehicles, apparent speed ran from a crawl to a median of **299 km/h** with a
90th percentile of **494** — trams visibly overtaking other trams on the same
map. Half the fleet was already slow; turning one dial down would have made
those slower still and left the fast ones fast.

A vehicle now has a **speed** and its pass time follows from its own line's
length, which is the way round reality works: `MODE_KMH` is 16 for a tram and 30
for the metro, real average service speeds with stops in them. What the player
sees is then only the compression, and that is the shift's `hours`: three hours
in five minutes was 36x. **1.25 hours is 15x** — every tram at **240 km/h** and
the metro at 450, at or below the slower half of what shipped, with the 494
tail gone. A tram crosses the 4 km ROUTE viewport in about a minute.

It is paid for in deliveries, because a slower fleet makes every ride longer in
ticks by the same factor. Measured over 56 random door-to-door plans, the median
job costs **856 ticks** against a 3000-tick shift, so `DELIVERY_TARGET` is
**three**. The same measurement caught the shipped build being wrong on its own
terms: five median jobs fitted and the target asked for **six**, so a shift could
not be finished at ordinary difficulty by anyone, and no gate had ever asked.

If it should be slower still, the honest next lever is a **longer shift** rather
than a smaller compression: `ticksPerDay` 4500 buys the same slowdown again and
keeps the deliveries, at the cost of the owner's five-minute session.

`test/pace.mjs`: 12 checks in bare node — one apparent speed for every tram
whatever its line is long, at or below what shipped, the metro still faster than
a tram, a minute to cross the ROUTE viewport, and a target the shift can hold.
Five mutations each caught. `test/phone.cjs` grows seven: taking a job changes
the screen, the dispatch list goes, the panel says what it is for in those
words, its first button is WHOLLY on screen without scrolling, and the slots are
in order. Three mutations each caught.

## v2.28 — 2026-09-06

**The phone pass, and it found the worst bug this lane has shipped.** Nobody had
opened the game at 390px. The title card had had a paragraph appended to it on
every release since v2.19 — nine of them, each describing what had just
changed — and on an iPhone 13 the card was taller than the screen, on a `.veil`
with no `overflow`. **START SHIFT was below the fold, on a surface that could not
be scrolled.** The button was present, visible, enabled and 44px; every gate was
green; the game could not be started with a thumb.

The fix is in two halves and only the second one lasts. The copy is cut to what
you DO — you drive nothing, you take a job and catch something already moving —
because a title screen is not a changelog and the changelog is this file. And
the card is now a flex column with `max-height: 100dvh - 32px`, its text in a
`.cardBody` that scrolls while the button does not, so **a card that grows again
eats its own paragraphs instead of its button**. The veil scrolls too, as a
floor under both.

**A phone opens at ROUTE, not CITY.** CITY fits the whole board by height, and
`board.js` then grows the box sideways to fill the canvas — growing rather than
cropping, deliberately, so no stop is ever hidden. On a desktop the map element
carries the board's own portrait aspect and that growth is nothing. On a phone
`width:100%` plus `max-height` force the element landscape, and the grown half
has no ground, no water and no streets in it, because the data ends where the
extract does: **48% of the map was black**, and the badges that survived piled
into a heap in the middle. ROUTE's 4 km viewport is a crop of the board rather
than a fit to it, so it is full of map at any element shape — measured, the
board covers 43% of the canvas width at CITY and 91% at ROUTE — and it is the
scale the game is played at anyway. CITY stays one tap away on the rail.

The map gives 8vh back to the job sheet (`44dvh`), because a board about
comparing three plans was showing one of them. And `say()` drops a line that
repeats the one above it — the feed was printing DISPATCH twice, which is a
double call, not news.

`test/phone.cjs`: 11 checks at 390x664 on a real touch context, six mutations
each caught, including the shipped bug reproduced exactly (restore the long copy
and remove the cap and START SHIFT reports `y 1130..1174 of 664`). Its
reachability check knows the difference between a control **off screen inside a
scroller** — a scroll away, which is what the third job offer legitimately is —
and one off screen with nothing to scroll, which is the bug.

Frame rate at 390x664, off the game's own loop: 48 / 31 / 55 fps at
CITY / ROUTE / STOP. ROUTE is the expensive one — it draws the streets, the
corridors, every badge and every trail at once — and it is now the opening
scale, so that number is the one to watch.

## v2.27 — 2026-09-06

**Every tram drags a wake.** The idea came from a canvas demo the owner sent: two paths, a dot running along each, and a background painted `rgba(5,10,15,0.3)` instead of cleared so the dots smear. Half of it was already here and done properly — `LiveNetwork` interpolates real traced HSL geometry at real speeds, where the demo's four hand-typed points make a long route and a short one take the same time. The **trail** was the part worth taking: direction was only readable from a badge, and a badge does not say whether a tram is coming toward you or leaving.

**The demo's technique cannot be used on this board, and that decided the design.** An alpha-overdraw trail fades everything on the canvas, and this map's ground — water, streets, districts, landmarks — is a cached bitmap blitted fresh every frame. Fading it would smear the map into mud; not fading it would erase the trail on the next blit. So nothing accumulates in pixels: each vehicle keeps ~17 recent positions in **lat/lon** and the tail is re-projected every frame like everything else. That is not a workaround. A pixel buffer would be wrong the instant you panned and stale in a different way the instant you zoomed.

**It is drawn additively**, because the first cut was invisible: a wake in a line's own colour, laid along that same line, is nothing. The demo's trail read against black; here it has to read against the route it runs on, so it has to be *brighter* than that route rather than merely present. `lighter` also means two trams meeting on a shared corridor brighten each other, which is true and useful. The tail fades on a squared curve and tapers from 4.5 px at the head to 1.1 px, so the fat bright end is unambiguously where the tram is going.

It samples on the TICK, not the frame — a 120 Hz screen must not remember more of the city than a 30 Hz one — and it obeys the camera's near-rule, so a tram you are not being shown does not leave a wake either. A vehicle that stops being drawn is forgotten, or a filtered fleet leaves ghosts for as long as the tab is open.

`test/trails.mjs`: 17 checks in bare node against a stub context, seven mutations each caught. 60/58/60 fps at the three scales, unchanged.

One trap the gate found in itself: the stub context was assembled with `Object.assign`, which copies an accessor's **value** rather than the accessor — so the composite-operation setter vanished and the check that the wake is drawn additively could never have passed.


**Deployed, and the deploy found a bug five releases old.** Every hand-deploy this lane has made since v2.22 shipped `../hub/shell.js?v=17` onto a site whose other twenty-two cabinets ask for `?v=35` — the exact trap `CLAUDE.md` records for hand-deploys ("this cabinet shipped pinned to v17 while fourteen others were on v34"), and another lane had already had to repair it once. A cabinet pinned to an old shell serves an old HOME button out of cache forever while the rest of the floor gets the new one. `test/cabinet-route.cjs` now asserts the token agrees with whatever the rest of the floor asks for — agreement, not a number, because this checkout and the deploy tree are legitimately on different ones.

**The cabinet finally shows the game.** Its marquee was still `daymap` — a
transit diagram drawn for the superseded Mini Metro lane, a game that no longer
exists — and the marquee is the only thing a player judges before pressing
Play. `tramstop` replaces it, built to the floor's own rule that a marquee is a
COVER and not an icon: Helsinki at 07:00, the Cathedral small and off-centre
because it says where you are and then gets out of the way, a green tram
arriving, and the courier cropped by the near edge with his arm up for it.

Eleven renders, and the notes are worth keeping because every one of them was
the same class of mistake — **a thing drawn without asking what is behind it**.
The tram was a box beside its own track (front and flank are now sized off the
rails at their own depth). The courier was filled at `#1b2430` on a street that
is `#171c24` where he stands, so a flat fill inside a hard black line read as a
hole with a rim round it. His head, torso and raised arm were all lit along the
same x and welded into one teal stripe with no person inside it. And four goes
at an articulated running figure all read as an animal lunging: at 128x72 a
person is a rectangle, a disc and ONE gesture, with the light as a FAT band and
not a 1px rim — which is what `backlot` two cabinets along had been doing all
along.

`daymap` is deleted with it. The gate grew the check that would have caught a
rename: `drawMarquee` falls back to `gel` for a key it does not know, which is
correct at runtime and completely silent, so "every marquee is painted" passes
while a cabinet shows another game's drawing. Only the forward direction is
asserted — the live catalogue carries cabinets this tree has not got, and their
art functions are not orphans.
## v2.26 — 2026-09-02

**The shift shows itself back.** A run ended in four numbers — delivered, score, bonuses, late — which was survivable while nothing could go wrong and became the worst possible ending the moment v2.25 made a shift losable. Four numbers tell you that you failed and nothing about where. `js/shiftlog.js` is the design doc's own experiment #6, the one item on its list of eight that had never been built, and its strongest-directions list calls post-run replay "a core learning tool".

**It records by WATCHING.** Nothing in `deliveries.js` or `mobility-v212.js` knows the file exists: it polls from the draw loop, notices what changed and writes it down — the same discipline as turf's `anim.js` reading `state.log` rather than being called by `combat.js`. So it cannot break the game it observes, and it can be deleted without touching a rule. `test/shiftlog.mjs` drives every branch of it in bare node against a stub, because it owns no DOM and no clock; five mutations (never closing a job, inverting lateness, allowing negative spare, dropping the noise threshold, and dropping HTML escaping) are each caught.

**The one thing it computes rather than observes is the alternative**: at the moment you board, what the best plan from where you stand was worth against what you actually took, both from the same timetable the panel quoted at you. `at Länsiterminaali you boarded a ~1307t plan · a ~1018t one was on the board · 289t` — that is a sentence a player can learn from, and it appeared on the job that failed.

That comparison could not fire at first and the reason is worth keeping: `mobility.catchChoice` executes a chosen plan as a **single physical leg**, and `selectedPlan` was that leg rather than the plan clicked. One leg is by construction no worse than a whole trip, so the check was structurally incapable of ever finding a better alternative. The ride keeps the plan the player actually pressed now.

## v2.25 — 2026-09-02

**The game can be lost now, and the ride has a decision in it.** Both halves at once, because neither works alone: tension without input is a clock you watch, and input without stakes is busywork.

**The deadline was a distance formula and never bit.** `late` was 0 in every run this game had ever been measured on, and the report card's `margin` column — the one number that would have said why — had never once been recorded correctly: it read `remaining()` at the moment a completion was *noticed*, by which point the challenge had already moved to the next job, so it printed `—` for every job of every run. Fixed, the answer was **75%, 58%, 42% and 14% of the deadline left spare.** A deadline with half of itself to spare is not a deadline.

So a deadline is the trip's **real cost plus a grace**. `planCost` in the job board asks the same timetable the panels quote at you for the cheapest door-to-door plan; `deadlineFor` takes 1.35× it. Bare node installs no estimator and falls through to the old formula, which is what keeps every gate written before this measuring what it meant to. First measured run afterwards: deadlines roughly halved (1155→544, 1075→666), spare 47 / 42 / 0 / 29%, and **`late 1`** — the first failable shift in the project's history. The job that failed was the one that ate a 517-tick transfer wait, which is exactly what should cost you.

**Getting off early** is the only decision the ride ever had in it. 71% of a five-minute shift is spent aboard with nothing to press; the verb list already said *ride* and *get off*, and what was missing is that you could only get off where the plan said. A tram passing an interchange where a faster continuation is standing right now is the most ordinary decision in transit and the game could not express it.

It is offered **only while the vehicle is really at a stop** — the same 2.2-second window a catch uses, because stepping off between stops is not a thing you can do — and **only when leaving beats staying**, measured: what the rest of this ride plus the plan's remainder costs, against the best plan from here. Across a measured shift it was computed 85 times, was worth taking 46 of them, and the best single case saved **360 ticks — 36 seconds of a 300-second shift.** Usually staying aboard is right, which is correct and is why the button is not always there.

## v2.24 — 2026-09-02

**The outer board stopped being invented.** 78% of the board had no OSM streets, and that 78% was drawn with twelve hand-authored corridors — the one kind of geometry this project's own rules say must never sit on the board as though it were real. It is now HSL's own service corridors, from the GTFS feed, under CC BY 4.0: `cities/ground/helsinki-corridors.json`, 696 traces covering 60.149–60.218 / 24.895–24.995, which is essentially the whole board. **There is no authored geometry on the map any more.**

It is emphatically **not a street map** — it has every street a bus or tram uses and no street without a route on it — and the credit line says exactly that in its own clause. That is the right shape for the coarse layer anyway: an arterial is precisely a street a bus runs on.

Three things had to be true for it to be usable rather than merely present.

**Rail, metro and ferry corridors are dropped.** A ferry corridor stroked as a road is a street across the harbour. The mutation test caught this as a hole in the GATE rather than in the code — the check asked whether the *pack* contained ferries, never whether the *drawn runs* excluded them, so deleting the filter passed. Each run carries its mode now and the gate asks the runs.

**Each corridor is clipped to the ground the street pack does not cover.** Otherwise the two layers draw the same street twice with slightly different geometry — the doubling that made this a choice between them rather than a combination of them. 653 bus and tram corridors become 519 clipped runs, none wholly inside the extract.

**One line per street.** A GTFS shape exists per direction and per route, so a street a bus runs both ways along arrives as two traces a few metres apart, and six routes down Mäkelänkatu arrive as six. Points are hashed into ~20 m cells and the busiest run in a place wins: 519 become 367. Busiest first on purpose — the trunk should survive, and it is the one whose geometry the most services agree on.

Tiers come from the feed's own trip counts rather than a guess: the real distribution's quartiles are 458 / 992 / 2394, so those are the thresholds, and the camera reveals major at city scale, adds mid at route, all at stop — the same hierarchy the OSM streets use.

**Which source you are looking at no longer depends on the camera.** The first cut chose by the camera centre, so panning across the extract boundary swapped the entire ground layer under you. Geography decides now: both are on screen at once and the seam is where the data's seam actually is.

**A layout rule was silently deleting a licence.** The credit line wraps and was capped at the last two lines — invisible until the HSL clause made it three, at which point the line that fell off the top was `© OpenStreetMap contributors (ODbL 1.0)`. The cap is gone; the legend asks how many lines there are instead of assuming, and a credit that will not fit pushes the legend up rather than losing a clause.

Two self-inflicted wounds, both the same mistake: editing this dense file by splicing between two text markers deletes everything between them. It took out `viewRect`/`courierLatLon`/`layersNear`/`fleetFilter` once and `drawLandmarkLayer` once, and **both times the module still parsed** — a bare-node import reports "document is not defined" and looks like success. Only booting the real page caught it. Load the page, not the module.

## v2.23 — 2026-09-02

**The street importer, written and gated — everything either side of the fetch.** Measured first, because "the streets only cover the centre" is a shrug until it is a number: the board is **41.2 km²** and the committed extract covers **9.2 km², 22% of it**. Fifteen of the twenty-two delivery anchors and twenty-eight of the forty-one districts stand on ground with no streets under them — Töölö, Kamppi, Senaatintori, Kauppatori, Katajanokka, Eira, Käpylä, Pasila, Jätkäsaari, Länsisatama, Arabianranta, Meilahti.

`toko-move/scripts/streets-import.mjs` replaces the `map/tools/streets-import.mjs` that the pack names in its own `generatedBy` and that **exists in no branch of this repository** — the tool was lost and the data outlived it. It prints the exact Overpass query for the board box plus a margin, turns an `out geom` response into a pack in the schema already in use, and validates one.

It cannot fetch from here and says so rather than pretending: the egress proxy refuses `overpass-api.de` by organisation policy, a network limit rather than a missing token. So the fetch is one documented manual step on a networked machine, and both sides of it are done and tested.

`--check` is the step worth insisting on. Three questions: does the pack cover the board, is it tiered, and — the one that matters — **does it still contain every named street the committed extract knows?** An import that quietly lost Mannerheimintie passes the first two. It counts distinct NAMES rather than ways on purpose, because a real `out geom` import returns whole ways and will have far fewer roads for the same city: the committed extract is **82% two-point fragments**, 5652 ways carrying only 14291 points, because its geometry arrived per segment.

`test/streets-import.mjs` runs the importer **with no network at all**, which is the whole difficulty. The Overpass response is synthesised from the committed extract — every real way turned back into the element it came from — and put through the real parser: 5652 ways of real Helsinki geometry round-trip point for point, junk is skipped rather than mis-tiered, and the coverage check **fails on the pack we ship**, which is correct and is what will announce the fix.

**One street file, and the file says what it covers.** The first cut looked for a full-board pack and fell back to the centre extract, which meant probing for a file that is not there — a 404 on every load, the same noise the superseded water fetch was removed for one version earlier. Extent is a property of a pack, not of its name: `helsinki-streets.json` is the only name, `streetsCoverBoard()` reads its bounding box, and the credit line stops saying "centre extract" on its own. Replacing the file IS the change.

**And four gates that existed were not in CI.** `board`, `camera`, `ground` and the new `streets-import` all ran only when someone remembered to — the same failure the toko-move CI block's own comment warns about, two feet below where they should have been listed.

## v2.22 — 2026-09-02

**The transfer is priced at the moment you choose it.** The report card was extended first, because the sentence "there is nothing to do while you wait at a transfer" was a guess about a number nobody was keeping. Measured: **transfer waits are 77% of all platform time** — 501 ticks across four transfers against 146 across five first catches, worst single wait 256t — and the correction to the guess is just as useful: **0% of that waiting had nothing on offer.** A walk was there 40% of the time, a second job 18%, both 42%. The problem was never an empty platform.

The problem was that **the panel was showing none of it**. A two-leg plan advertised `ARRIVES ~10t` — the wait for leg one — while leg two sat behind a 250-tick headway at an interchange nobody had looked at yet. This game's rule is that no route is marked as the answer; it is not that the facts are withheld. A cost you only discover after committing is not a choice, it is a reveal. Every choice now carries `~550t door to door · then WAIT 200t at Ooppera`, and the two numbers are separate on purpose: a total alone lets a plan hide a long stand behind an otherwise reasonable figure, and the stand is the part a player feels.

**The horizon was hiding more than the transfer.** `arrivalState` scanned 120 ticks forward for the next vehicle, so a line whose next service was 200 ticks out reported `WAITING` and no number at all — and the moment plans are compared on total time, a plan with no number loses to a plan with a bad one. The transfer lookahead would have needed a 900-tick scan of its own.

Both scans are gone. A vehicle here is a **triangle wave** — `cycle = (phase + tick × speed) mod 2`, out on [0,1] and back on (1,2] — so a stop at path index *i* sits at `q = i/(n-1)` outbound and `2-q` inbound, and the wait is how far the wave has to travel to reach that value. One subtraction per vehicle, exact, **no horizon at all**. `LiveNetwork.nextArrival` is checked in `test/route-choice.mjs` against the 3000-tick scan it replaces on 1088 cases across all 34 layers: the only disagreement is 22 ticks, which is exactly the width of the catch window — the scan reports the moment a vehicle ENTERS it, the closed form the moment it is at the stop. Five mutations of the solver (dropping the standing-here case, flipping the return direction, forgetting the modulo wrap, an off-by-one on the path length, ignoring vehicle speed) are each caught.

**The report card was wrong twice in the same direction, and both times it made the game look worse than it is.** It now splits FIRST catch from TRANSFER catch instead of tallying transfers as a mark, and counts what was on the table during each waiting tick. And DEAD AIR — already once corrected for ignoring walks — was counting a stop where a second job was on offer as time spent doing nothing: 79% of the waiting in one run was exactly that. Taking on a second parcel while you stand there is a decision. With the definition fixed, dead air is **1%**.

**And there were two clocks.** The dispatch board's `est` was `hit.dt + stops×3 + transfers×5` — a formula with two magic numbers in it and no relation to how fast anything on this board moves — printed as `est` a few pixels from the catch panel's real figure, for the same trip. A game whose entire verb set is *read the network and time it* cannot have two clocks. `js/timetable.js` is now the one that answers, and both panels ask it.

Pulling it out found three more copies of the same divergence. `firstArrival` in the dispatch board scanned **120 ticks** (the same horizon artefact, so a service twelve seconds further out reported "no useful vehicle") and **passed no direction at all** — the board could advertise a tram arriving in 0t that runs the other way and cannot take you anywhere near your destination. It takes a LEG now, because a leg is the thing that knows which way you mean to go. And the board carried its own `nearestPathIndex` that did not scale longitude by cos(lat), measuring a stop as about twice as far north-south as east-west: a third copy of a function that already existed twice, and the only one of the three that was wrong.

Two plans that started on the same line also printed the same sentence twice, because the label named only the first leg. They are deduplicated by plan and named by interchange now: `TRAM 4T +0t · ~292t · direct | TRAM 1H +7t · ~588t · via Ooppera (+289t there)` — the direct one is here now and takes half as long, and until this version the board could not say so.

Report card, three runs at v2.22 against v2.21's two: **transfer waits fall from 77–78% of platform time to 13–35%**, dead air is 1% under the corrected definition, and deliveries and score are unchanged at 4/6 and 756. One number moved the other way and is not explained: first-catch waits rose from ~140t to ~660t. The card is noisy run to run and the bot's policy changed in the same release, so that is recorded rather than attributed.

Honest about what this did not prove: the bot now picks the best-scoring enabled choice, and it was also given the other decision the estimates enable — letting a catchable vehicle go for a better plan. That is left out. An enabled plan has no wait left in its total so it almost always wins; the rule fired four times in a whole shift for 21 ticks, and its arbitrary hold-out guard added noise to a card that is already noisy run to run. Taking the vehicle in front of you is very nearly always right. The estimate's job is to say **which** vehicle in front of you, and what the one after it will cost.

## v2.21 — 2026-09-02

**Landmarks, folded.** Owner's direction: "bigger spots like the white church can look a bit like a low poly origami, mostly grey night version map colors though." Six of them — Tuomiokirkko, Uspenski, Kallion kirkko, Päärautatieasema, Ooppera, Länsiterminaali — drawn in `js/landmarks.js` as flat polygons in three greys with one light direction shared by all six. Origami taken as a technical instruction rather than a mood: a folded model has flat faces and hard creases and is read entirely by which face catches the light, so there is no gradient, no outline, and nothing shaded inside a face. **The crease IS the value change** — the first cut kept the three greys within a step of each other and every building came out a grey blob with a tower on it.

**The dome was a cone.** Two long facets meeting at a point is what you get if you draw a dome as a triangle, and the cathedral read as a spike with two tent pegs beside it. A dome's whole character is the shoulder: it leaves the drum almost vertically, turns hard and arrives flat. Four folds a side, apex at r×1.3, and the lantern is a separate little drum standing on top rather than the tip of the cone.

**Where they are, stated exactly.** `cities/ground/helsinki-landmarks.json` places each one as an **offset in metres from a real HSL stop** — the stop coordinate is source data, the offset is the only invented number in the file, and the pack says so at length: not footprints, not traced, not fetched, accurate to about a block, and **not to be credited to OpenStreetMap**. The on-screen credit line says `landmarks: map symbols, placed by hand` in its own clause for exactly that reason. If a networked run ever fetches the OSM building ways, an `at` pair replaces `anchor`+`offset` and nothing else changes.

They are sized in metres and **clamped in pixels** (15–96): true scale alone makes a cathedral eight pixels wide at route scale, and a fixed pixel size makes it an icon that never becomes a building. Clamped, it is a symbol far out and a shape up close. Hidden entirely at CITY scale, where a 15px building among the whole of Helsinki is a speck arguing with a stop dot. They live inside the cached ground layer, above the streets and under the network — a tram passes in front of the cathedral, and the cathedral stands on the street.

The ground gate is 224 checks now, and the five new landmark assertions were mutation-tested: an offset wandering past 400 m, an unknown form, an unknown anchor, a second pale church, and the pack crediting OpenStreetMap for an authored position are each caught.

## v2.20 — 2026-09-02

**The night map, and real ground under it.** Owner's direction: "a more readable map with streets and water that is based in a gray scale with some contrast colors like dark blue for water... mostly grey night version map colors though." Recorded in `board.js` as an override, because it replaces the warm paper board that file was written for.

**The ground is real data, and it was already in this repository.** Three packs, recovered from the Piritori map work on `gh-pages` (commit `606058bb`) and committed under `toko-move/cities/ground/`, read by the new `js/ground.js`:

- **water** — OpenStreetMap via Overpass, ODbL 1.0. 111 fillable bodies and 139 coastline edges spanning **the whole board** (60.148–60.218N), where the pack in use covered 60.17–60.20 — which is why Eira, Länsisatama and Käpylä had been sitting on blank paper.
- **streets** — OpenStreetMap via Overpass, ODbL 1.0. 5652 ways carrying class and tier. **Centre extract only** (60.17–60.20 / 24.93–24.98, about the middle third of the board), and that limit is handled rather than hidden: inside it the real streets are the ground, outside it the board keeps its schematic corridors, and never both in the same place — an invented line beside a real one along the same street is the one thing this map may not do. The on-screen credit names the extent.
- **districts** — City of Helsinki osa-aluejako 2015 via the dhh16 mirror. 41 real sub-district label points, ordered by how much of the extent each covers, replacing **nine names typed into the runtime by hand** and hung off whichever delivery anchor was nearest.

**Streets are a hierarchy, revealed by the camera** — city shows arterials, route adds mid, stop adds the rest, which is the owner's "the closer you zoom, the more major streets you see". A third of the pack is never drawn: `service` and `track` are parking aisles and yard access, and 260 of the pedestrian ways are **closed rings** — squares mapped as areas. Stroked as lines they draw a box around every block, and the stop-scale view was an outline of the ground floor of Helsinki rather than a street grid.

**The sea is shown, not filled.** An OSM coastline is a directed OPEN line with land on its left, and closing it into a polygon invents a shape the data does not contain — the Piritori lane tried three closures and completed none. So the water is shaded outward from the shore on the side the winding itself says is water, in three fading passes. Flip the winding and the shading goes inland, which is exactly the error it would be.

**The line inks were re-solved, because they had to be.** Six of the fourteen fail 3:1 on the night ground (1 at 1.83:1, 4 at 1.77, 5 at 2.31, 6 at 1.79, 10 at 1.76, 15 at 1.85) — a dark line on a dark board is not a quieter line, it is an absent one. Same constrained search, same pinned metro orange, new band: L 56–78, chroma 32–56, **min dE76 = 32.5** (the paper solve reached 37.0 and had more room). Widening to L 54–80 / chroma 58 reaches 41.1 and buys it in neon — mint, lemon and hot pink, the highlighter set the first solve exists to avoid. The floor in `test/board.mjs` moved to 32.0 to match.

**And the rule that keeps a street from reading as a service changed shape.** The paper board did it with luminance: roads under 1.9:1, lines at least 1.6× louder. At night a line must be LIGHT to be legible at all — the quietest is metro orange at 3.9:1 — so 1.6× caps a road at 2.44:1, and a road held there is nearly the board colour. The first cut of this palette obeyed the old rule and drew streets that were not visible on screen; a gate that certifies an invisible layer is measuring the wrong thing. What actually separates them is **colour**: every road ink has Lab chroma under 9 and every line over 30, a gap of nearly four times. The gate holds that, plus a lightness ceiling, plus the tier order, plus a floor so a street cannot vanish.

`test/ground.mjs` is a new gate (189 checks): every pack states its source, licence and extent; the on-screen credit names OpenStreetMap, ODbL, the City of Helsinki and the street extent; water spans the board; the tiers are a real hierarchy; a missing pack is empty rather than a crash and claims no attribution it cannot support.

**Two bugs the report card found that no gate could.** The shift went from 5 deliveries to ONE, and the page had no errors: `route-choice.js` carried `Math.floor(tick/2)` in its render key, so the panel rewrote its own innerHTML four times a second and destroyed the CATCH buttons with it. A press arriving mid-swap lands on a detached element and does nothing — on a phone, a tap that silently fails at exactly the moment the game asks you to be quick. The panel is now rebuilt only when what it says changes, and the arrival line, the enabled state and the verb are refreshed **in place**. And the zoom rail was placed from a measurement taken while it was still `hidden`, so `offsetWidth` was 0, the rail landed a full width right of the map over the job sheet, and at z-index 30 it ate the clicks it covered.

**The ground is cached offscreen.** Water, streets and place names change when the camera changes and at no other time; painted every frame they cost the city view half its frame rate for a picture identical to the one before it. Painted into an offscreen canvas keyed on the camera and blitted, all three scales run at 60. Same discipline as `gameoflife`'s `scr.cached`, same rule: keep every moving part outside it.

The old `flow-core/data/kallio-water-v1.json` fetch is gone. The ground pack supersedes it in every respect, and that path does not exist on the deployed site — so every load of the live cabinet was taking a 404 for a file whose contents were already on screen from somewhere better.

Report card, v2.20: 5 jobs taken, 4/6 delivered, score 756, late 0, dead air 4%, riding 69%.

## v2.19 — 2026-09-02

**The camera.** The owner's reading of v2.18 was exact — "the map is clutter with fast moving objects" — and the fix is not fewer trams. It is a camera: the thing that decides what is NEAR right now. `js/camera.js` owns a centre, a zoom and the arithmetic; it owns no canvas and draws nothing, which is why `test/camera.mjs` can prove it in bare node (36 checks) instead of by looking at a screenshot.

**Three scales, snapped** (owner: "snap to 3 scales is primary option, but pinch to zoom second"). They are stated in METRES of viewport height and converted through the board, so they keep their meaning if an anchor moves the box: CITY = the whole 4.9 × 8.4 km board (×1), ROUTE = 4000 m so a 2 km radius fits (×2.10), STOP = 1300 m (×6.47). The rail sits over the map's own top-right corner, not in the HUD strip — the HUD is the shift, the rail is the map.

**Pinch, wheel, drag, double-tap** are all secondary and all present. Zoom is about the POINT, never the centre: a map that zooms to its own middle walks whatever you were looking at off the screen. Nearest-notch is judged in log space, because zoom is multiplicative and the boundary between ×1 and ×2.1 is ×1.45, not ×1.55 — a linear rule names a band you are not in at every notch.

**Follow has a dead zone** (42% of the viewport). Recentring on every metre the courier moves makes the map the thing that moves and the courier the thing that stands still, and then no landmark holds. A drag drops the follow — a pinch that also pans is a map sliding away under the gesture meant to scale it — and a ◎ appears to take it back.

**The fleet rule, the owner's words applied**: "when I zoom in the whole area can be the barrier but when zoomed out, only trams that will pass by me, and in a circle of 2km map scale". Zoomed in, the viewport is the only filter. At CITY scale a vehicle needs both: a line that passes within 180 m of where you stand, and a position inside the 2 km circle — measured with longitude scaled by cos(lat), or the circle is an ellipse on the ground. The vehicle you are riding is never filtered out of its own ride. **It hides badges, never lines**: every route stays drawn at full length at every scale, so the map still says what exists, and the HUD says `ROUTE · 9/102 near` so a filter is never mistaken for a bug.

**Label density follows the camera too.** Twenty-two names over the whole city is a wall of type at CITY scale; zoomed out the board now keeps only the names that are decisions — the transfer spots and the two ends of the job in hand. The dots stay drawn, so one zoom step brings any name back.

Two things found on the way. `boardRect()` is the board in canvas pixels and moves with the camera, so once you can zoom it is regularly wider than the screen — and the legend, the frame and the label placement all used it as "the area I may draw in", laying their work out against a rectangle three screens wide. `viewRect()` is the intersection, which is what those three meant all along. And `fitLatLon` rebuilt the entire projection on every call — a cos and two closures, per point, per path, per frame; affordable at one fixed scale, not once the answer changes continuously. It is memoised on the five numbers it depends on.

## v2.18 — 2026-09-02

The five-minute shift. flow-core's day is sixty seconds of wall time, built for Piritori's day simulation, and Toko Move had been running on it: a tram crossed Helsinki in three seconds, and every headway change made to keep catches reachable inside sixty seconds only added vehicles — 272 on screen at v2.17. `createFlow` now takes an optional `ticksPerDay` (flow-core's default is untouched; its contract passes 29/29), and Toko Move asks for 3000 ticks: 07:00–10:00 of game time in five minutes of wall time, a tram's 50-minute pass in about 83 seconds. Vehicles per line go from 8 back to 3. The HUD clock shows minutes.

Game-time quantities scale with the day — vehicle speed, deadlines, walking cost. Wall-time ones do not: the 120- and 80-tick lookahead horizons are 12 and 8 seconds at the shared tick rate and stay put, and the catch window is now stated as **seconds** (callers still pass 2.2; it means 2.2 seconds, inside Loop 18's 2–8 second window).

Vehicles are spaced **evenly** around the out-and-back cycle, offset per line by hash. They were hash-scattered, and scattered phases bunch: measured at Lasipalatsi from tick 0, the gap to the next same-direction vehicle reached 1453 ticks on a line whose even headway is 556. Evenly spaced, the worst gap is 508 (51 s) and the mean 229 (23 s) across all forty line-directions there.

Dispatch is constrained by the network (Loop 47). The first offer a bot took had no compatible vehicle for 1204 ticks — two minutes on the tutorial job — while five lines were arriving at that very hub. `refreshOffers` now draws six candidates and keeps three; when the live fleet is wired in, at least one kept offer has a catch inside 30 seconds, and on the first job that one leads (Loop 43). Bare-node gates install no judge and see the old behaviour.

Six modules were imported at two different cache tokens — `live-network`, `deliveries` (three!), `hubs-walking`, `transit-layers`, `board`, `route-choice` — which instantiates each twice and splits its state. All normalised to one token each.

Report card, five-minute shift: 4/6 delivered, score 756, late 0, riding 52% / waiting 44%, dead air 5%, first catch in 2 ticks, worst wait 519 (one headway), mean 183.

## v2.17 — 2026-09-02

The shift becomes playable, measured rather than asserted. Every number below came from `test/report.cjs` playing the real page, and each was set originally without anyone checking it against the clock it runs on.

**Vehicle speed is derived from the clock.** A tram took 2083 ticks to cross its route against a 600-tick shift — at 1.6 minutes per tick, 55.6 hours of game time for one pass, about 67x too slow. A stop saw ~0.3 tram arrivals per shift while every job needs a catch, and the first catchable vehicle appeared at tick 585 of 600: a shift completed nothing. Speed is now stated as what it means (`END_TO_END_MINUTES`, tram 50, metro 45) and converted through `ticksPerDay`.

**The catch window is in ticks.** It was a raw path-index distance, hardcoded 2.2 at six call sites, and a path index is not a unit of anything — 2.2 on a 241-point tram path is a different real distance from 2.2 on a 682-point metro path, and the time a vehicle spends inside it scales with speed. Fixing the speed alone therefore made catching *impossible*, verified: not one choice enabled in a whole shift.

**Headway tightened to 8 vehicles per line** — a tram every 3.9 ticks, 7.8 per direction, about a 13-minute headway. Completions went 0 → 3, waits to 9-30 ticks.

**A shift is six jobs, not ten.** A job's journey measures 50-230 ticks in a 600-tick day, so ten needed roughly 2.5x the hours available and the back half was unreachable however often the trams ran. The authored campaign is still ten (a chain, each job starting where the last ended); a shift plays six of it.

**A deadline allowed for flying, not riding.** Offers set `limit = 110 + dist*7` from the straight-line graph distance while the journey goes through the network with transfers at each change. Now `dist*16`.

Together: waiting fell from a shift that was 100% unfinishable to roughly half riding, dead air 3-8%, and jobs that complete and score.

Known and not fixed: the same job can take 59 or 220 ticks depending on where the vehicles happen to be — a 4x spread that no fixed deadline covers. A deadline derived from the chosen route's own estimate, rather than from distance, is the next question.

Also fixes three bugs in the report bot itself, each of which libelled the game before it was caught: dead air claimed to account for walking and did not, GET OFF was never pressed so finished rides read as zero completions, and completion accounting sat after a `continue` and never ran.

## v2.16 — 2026-09-02

The city layer becomes data, which is what a second chapter actually costs. `js/city-build.js` turns a city DEFINITION plus a source pack into a graph; `cities/helsinki.city.js` is chapter 1's definition and `js/real-helsinki.js` is a three-line door onto it. A definition owns which real stops its anchors resolve to, what each is called and what it is for, the walk links, and the per-mode speeds, capacities and vehicle counts — and owns no geometry at all, which still comes from the committed pack exactly as the agency published it.

`test/city-build.mjs` holds both halves of the claim rather than asserting them in prose. Helsinki's graph is compared against a **frozen fingerprint of the output the hand-written v2.11 builder produced** — every node's id, name, tags, capacity and projected position, every edge's endpoints, mode and time — so the generalisation is proved to have cost nothing. Then a second definition over the same pack builds a different working board with its own anchors, speeds, capacities and carrier counts, which is the bet chapter 2 rests on. Three definition failure modes fail at build time: an anchor that resolves to nothing, a walk link to a place not on the board, and a declared mode with no service through it. Five mutations run against the gate, all caught.

Nagoya remains blocked on data, and the blocker is recorded in `CAMPAIGN.md` §5: the sandboxed agent environment's egress proxy denies `api.odpt.org`, `overpass-api.de` and `api.openstreetmap.org` by policy, so it is a network limit rather than a missing token. Drawing the network by hand instead is explicitly ruled out — authored geometry presented as real is the one thing the canon forbids, and it would poison the chapter meant to prove the pipeline generalises.

## v2.15 — 2026-09-02

The key. Thirteen tram colours with nothing naming them is a code you break by tapping, so the families actually drawn on the board get a strip along the bottom in the same ink. It is built from the VISIBLE layers rather than from the palette — hiding a line in the MAP inspector takes it out of the key too, and a family added later appears without anyone maintaining a list. Grouped by ink rather than by family, because M1 and M2 deliberately share one colour (they share track across the whole board) and two identical orange chips side by side would ask a question the map does not mean to raise; they read as one `M1 M2` entry instead. It wraps rather than running off the frame.

## v2.14 — 2026-09-01

Stop names now draw LAST, after the moving vehicles, and step around them: they are the layer that identifies everything else and were being printed under whatever tram badge happened to be passing. `live-network.js`'s draw reports the boxes it painted so the label pass can avoid them.

The board answers questions. Tapping a stop opens what is APPROACHING it — line, mode, direction-aware, with a real ETA in the same ticks the deadlines use, plus its HSL stop identity and whether it is a transfer spot. It never names a route to take; the offers already present tradeoffs without an answer, and this is the same rule applied to the map. It binds `pointerup` AND `touchend`, never `click` — the trap `hub/shell.js` and the Toko signature both paid for. Two bugs found building it: the stop-to-path match compared raw degrees, so a stop matched about twice as far east-west as north-south, and the first cut reported the raw path-index gap as "stops out", which it never was — a vehicle covers `path.length-1` indices per `1/speed` ticks, so the gap converts to an actual ETA.

The five inherited gates now test the v2.12 runtime instead of the v2.11 modules it replaced — the reason a SyntaxError in a file the page imports sat here behind a green-looking suite. `version-sync` reads the v2.12 chain and asserts the superseded wrappers are out of the page; it also stops demanding hub == VERSIONS.md, since the hub advertises what is LIVE and the log records what has LANDED. Only one direction is ever wrong and it is the one that shipped on main — hub claiming 2.12.2 against a 2.11 tree. The hub may lag; it may never lead. `route-choice` walks the shipped dispatch loop rather than v2.11's auto-assigned job, and `real-helsinki` pins what replaced the deleted per-job events: the shift is one chain, the back half carries more pressure than the front, and every job has a deadline and a payout. All six gates are green together for the first time.

## v2.13 — 2026-09-01

The board. The map was drawn to the whole HSL pack while every delivery anchor sits inside 9.1% of its area, so the metro ran out to Espoo and Vuosaari and the twenty-two places you actually deliver to were a knot of overlapping labels in the middle. The viewport is now a gameplay box derived from the resolved anchors, the canvas takes that box's own shape, and everything outside it is clipped to a framed edge — the board is the board, not whatever the pack happens to reach.

Line identity replaces one flat green. GTFS `route_color` is null on all 34 lines, so the documented fallback was painting thirty distinct tram services in one indistinguishable colour; each tram FAMILY now carries its own ink (variants share it — 4, 4H and 4T are one corridor) with HSL's metro orange kept and pinned. The palette is solved, not picked: a hand-picked set measured 32 pairs under the house colour-distance convention, and maximising raw separation drives to the gamut corners, so the search was constrained to the product's own tonal range and the minimum perceptual gap maximised inside it — min dE76 37.0 across all fourteen. Recorded as an owner override at the top of `board.js`, since it contradicts `TRANSIT_LAYERS.md`'s colour rule while leaving its geometry rule fully intact.

Main streets are drawn as ground — thin, flat grey, under everything, no caps — from the same abstractions `hubs-walking.js` already declared for walking. Transfer spots are drawn as real interchange markers rather than plain stops, because they are where the game's decisions happen. Stop labels claim a box and pick a free side, transfer spots claiming first; a label with nowhere to go is dropped rather than printed through its neighbour (Lasipalatsi printed through Kamppi, Länsiterminaali ran off the frame as "siterminaali"). District names drop to a watermark under the network instead of competing at the same size.

One projection now serves the transit layers, water, roads, stops, live vehicles and the walker — `core-v212.js` publishes it as `tm.project` and `main-v212.js` reads it, replacing a second copy that computed the same thing. The old path went through `flow.graph.fit`, which letterboxes with `Math.min`: a portrait board in a landscape canvas is exactly how the city ended up squeezed into a column. Wide screens get the map beside the dispatch board; a phone keeps them stacked.

Also fixes the missing brace in `route-choice.js` that made this build a SyntaxError and took the whole ES module graph down with it.

`test/board.mjs` is the new gate — the box holds every anchor with room off the frame, the box stays a genuine crop, the aspect fit may only grow (never crop away a stop you deliver to), the projection is not mirrored or flipped, every tram family has ink, the palette holds its dE floor, roads stay quieter than every service, and each drawn street names a real anchor. All ten checks were mutation-tested.

## v2.11 — 2026-08-30

Route-choice pass. Each active delivery now derives up to three useful fixed-transit approaches from the real HSL gameplay services: direct routes first, then one-transfer alternatives ranked by stop count and transfer cost. The job sheet names the line, mode, direction and transfer station before the player commits. Suggested services are interactive: tapping one isolates its exact HSL source layer in the map inspector. This turns the real network into an explicit decision surface without reintroducing traveler clutter or inventing transit geometry. The v2.10 22-location board, escalating ten-job campaign, cargo constraints and late-shift events remain intact.

## v2.10 — 2026-08-29

Map-to-gameplay pass. The board expands to 22 HSL-resolved locations with Hietalahti, Meilahti, Arabia and Olympiaterminaali. Visual hierarchy is tightened around land/water, district context, the active origin/destination and useful transit. The ten-job shift is rebuilt as a teaching curve: short centre run, speed-sensitive food, west-harbour corridor, first transfer, transit-only medical cargo, rush-hour northbound work, a delayed north-east run, metro-window express work, a harbour multi-stop and a final tram-only circuit. Job events now add rush, delay and harbour pressure while keeping route geometry sourced from HSL. Passenger clutter remains suppressed and tram telegraphs stay on exact GTFS paths.

## v2.9 — 2026-08-29

Readable real-map pass. The delivery board expands from 12 to 18 HSL-resolved anchors, adding Lasipalatsi, Ooppera, Messukeskus, Länsiterminaali, Eira and Käpylä. The ten-job route is retuned around the actual HSL network and now ranges across south Helsinki, West Harbour, downtown, Töölö, Pasila, Käpylä, Kallio, Kalasatama and Katajanokka. Passenger queue/load marks are suppressed in Toko Move, while route-relevant tram cues move along exact GTFS paths near the current leg to telegraph useful options. Transit layers use GTFS route colours when present, with HSL tram green and metro orange only as source-compatible fallbacks. Selected stops get stronger emphasis and HSL stop identity. The map also restores real OpenStreetMap coastline/inland-water context from the committed ODbL extract where that extract covers the gameplay view.

## v2.8 — 2026-08-29

Real-map conversion. The committed HSL pack is now the full current network: 292 stops and 34 exact GTFS route layers, generated with zero shape tolerance. All 12 delivery anchors resolve to HSL stop identities and real geographic coordinates. Gameplay fixed services are derived from HSL stop sequences (22 useful services through the delivery board, including M1/M2), while the old authored tram/metro skeleton is no longer used. Raw HSL route geometry is drawn through the same geographic projection as the delivery anchors, each route remains independently toggleable/soloable, and the full MAP inspector now derives its viewport from source geometry instead of a clipping box. The GTFS reader was upgraded to handle HSL's very large stop_times file without converting it to one oversized JavaScript string.

## v2.7 — 2026-08-29

Full-network refresh pipeline. GitHub Actions can now fetch the official HSL GTFS feed, build the Helsinki tram + metro pack with zero geometric approximation tolerance, validate that the old central clipping box is gone, and open a data PR only when the source changes. The runtime now accepts both the old clipped pack and the future full-Helsinki pack without crashing, and the opening screen/hub are bumped to v2.7.

## v2.6 — 2026-08-29

Visible-build pass. The opening screen now shows a large, unmistakable `v2.6` build number so hub testers can immediately confirm which Toko Move revision is loaded. Hub metadata is bumped in lockstep. The exact HSL transit inspector from v2.5 remains the active map-development path.

## v2.5 — 2026-08-29

Exact transit inspector pass. The playable delivery build now exposes the committed HSL GTFS geometry through a dedicated MAP view instead of falsely overlaying it on the still-authored gameplay graph. Every source tram/metro line-direction is independently visible, hideable and soloable, with tram-only, metro-only and show-all controls. Geometry is rendered directly from the committed source paths with no octolinear redraw or hand-authored approximation. The source limitation remains explicit: the current exact pack is clipped to central Helsinki while the restored full-feed packer waits for a complete HSL GTFS ZIP. Also fixes the main module's quote escaping bug.

## v2.4 — 2026-08-29

Exact-transit foundation. Restores the repo's HSL city packs and GTFS tooling, adds one display layer per source line-direction, preserves each committed GTFS path object unchanged, and gates independent layer visibility. The authoritative rule is now explicit: Helsinki transit geometry must come from source data rather than approximated route drawing.

## v2.3 — 2026-08-29

Cargo behaviour and visual identity pass. Cargo types now alter routing or scoring: hot/fresh food rewards fast delivery, fragile cargo is constrained to tram routing and earns a safe direct-run bonus, equipment stays on transit, market goods use tram routes, and express work pays a speed bonus. The UI gains cargo badges, a live deadline meter, stronger Helsinki typography, coloured destination markers, and a light harbour/city overlay on the map.

## v2.2 — 2026-08-29

Delivery depth pass. The ten Central Helsinki jobs now have cargo types, per-job deadlines and score values; late deliveries still count but pay half score. Three later jobs become multi-stop A → B → C runs, and the first express job triggers an 08:00 rush-hour passenger wave that competes for the same network capacity. HUD and job sheet now show the current leg, deadline and score.

## v2.1 — 2026-08-29

Reliability and geography pass for the Central Helsinki delivery game. The startup copy and HUD now describe the delivery objective, the main module cache token is bumped, and the daylight smoke gate tests the Helsinki graph instead of the old Kallio route. The board expands south and east with Ruoholahti, Senaatintori and Katajanokka, and the ten-job route now crosses those areas.

## v2 — 2026-08-29

Central Helsinki becomes the authored game board. The primary objective is now a chain of ten concrete A → B courier jobs across Pasila, Töölö, Kallio, Sörnäinen, Kalasatama, Hakaniemi, Kamppi, Rautatientori and Kauppatori. Existing metro, tram and rail services form the transport skeleton; player-drawn lines solve the gaps.

## v1 — 2026-08-18

The day half joins the hub: the same flow-core city as Piritori — provably, by
seed — moving people to school and work in daylight. No product, no heat, no
fights; the goals panel and the clean transit read are the whole game.
