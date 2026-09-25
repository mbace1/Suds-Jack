# Toko Move — versions

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
