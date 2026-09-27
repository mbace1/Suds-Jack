# PAJATSO — versions

The game was PACHI PIT for its first release; v2 renamed it and made the
Finnish coin wall game the front door. The pit run is still here as KUOPPA
(`pit.html`), the roguelike mode, until it is rebuilt on the Pajatso face.

## v4 — 2026-09-27 — KUOPPA on the Pajatso face, and the six parts

The owner, on the roadmap: *"Go ahead."* The order was already set by their
answers: the roguelike keeps KUOPPA's debt-and-deadline shape, and the
pachinko parts arrive **in order, in this mode only** — chucker + reels →
tulips → FEVER → windmills → chain jackpots → ball multipliers. The base
machine gets none of them.

**The run** (`kuoppa.html`, `js/kuoppa/`). The house hands you **20 coins a
round** (five more for every lock opened); whatever the machine pays goes in
your **purse**; every third round a **debt** comes out of it (30 · 60 · 110 ·
175 · 255 · 350 · 460 · 600). Pay it and the next part is **bolted onto the
face** — the sheet says what it is and what it does; miss it and the floor
opens. Between rounds the **vendor** lays out three of twelve charms (bent
nail, brass plates, filed windows, heavy R, regular, savings book, rubber
nails, fat pot — and, once their part is on, lucky seven, magnet, wired
tulips, long fever). `Kuoppa` IS the base machine: a subclass of `Pajatso`
that pays pulls from the round's coins instead of the purse (`canSpend`/
`spend`, `window()` and `intoPot()` became hooks in `game.js` for it). Pure,
seeded, three rng streams.

**The parts, each where it lives on the photograph's face**
(`buildPajatso(mods)` takes them; with no mods it is exactly v3's face):

1. **START chucker + reels**: a pocket in the middle of the nails with two
   life nails over it; a coin in it holds a spin (up to four), and the reels
   are the old pit's lottery (`js/reels.js` — draw the outcome, build a picture
   that shows it, pay the PICTURE). They play on an LCD in a **box bolted on
   top of the case** (the bottles move along the top to make room), which
   appears the moment the part does.
2. **Tulips**: the two 1:00 windows; a coin opens the petals wide, the next
   shuts them (`board.js`'s `when` walls, drawn in both states).
3. **FEVER**: a jackpot — a line of sevens or the POTTI — opens the
   **attacker**, a gate under the right half of the window row; while FEVER
   lasts every coin that misses a window there pays 2 mk. *The first cut paid
   the right-hand pot columns instead, and it did nothing*: the right V plate
   funnels coins back to the middle, so a sweep read the same with FEVER on
   and off. The gate is a zone the coins actually cross, and now a long pull
   during FEVER pays ~1.6 a coin against 0.65 without it — the bot that
   shoots right wins 23% of runs against 19% for the one that does not.
4. **Windmills**: two, either side of the chucker, cleared of nails by the
   wedge rule (blade radius + a pass).
5. **Chain**: after a jackpot, sevens three times as often for eight spins,
   and the **POTTI grows 2 mk a round** until somebody takes it — the owner's
   *maybe C*, the progressive jackpot, in the mode it was meant for.
6. **Multipliers**: the R windows become ×3 — three more coins to shoot.

**The base machine had a hot spot, and the run found it.** A bot pulling at
30% on every coin was being paid 3.5 a coin: the spring's wobble (±1.5 on a
104–121 range) was narrow enough that one pull landed on the POTTI 7% of the
time. v3's sweep had shown it as a bump and called it variance. The Pajatso's
spring now wobbles ±4.5 (`wobble` in `game.js`): the POTTI rate is 1–2% at
every setting, the whole lever pays 1.10 on a fresh pot and **0.98 with the
pot left to run**, and the lowest pull fails the top 8% of the time (the coin
comes back). *A run is the best instrument a machine has*: it plays one
setting for hundreds of coins, which is exactly what a sweep averages away.

**Tuned with bots** (`node pajatso/test/run.mjs runs`, `test/runbot.mjs`),
150 runs a policy: pulling without buying (`steady`) reaches lock 5 in 60% of
runs and never passes lock 6; buying what leaves the debt covered (`prudent`)
**wins 19%**; the same while shooting right in FEVER **wins 23%**. Before the
coins grew with the locks, income was flat while debts grew and nothing got
past lock 6. `node pajatso/test/run.mjs face` sweeps the lever on every stage
of the face: no coin fished out, no fouls, the chucker found 4–7% of the time.

**The two pages share one table** (`js/classic/table.js`): the lever, keys,
pad, toasts, first-time lines, the arcade's corner, the language switch,
pause and the loop — so KUOPPA is its rules, its events and its sheets, and
nothing about pulling a lever is written twice. The base page's `main.js` is
100 lines now. Found on the way: after a debt was paid, the vendor opened on
a timer and **replaced the sheet that says which part was just bolted on**
before it could be read (`kuoppa.cjs` caught it: the button it clicked was
detached from the page).

On a phone the reels are the one thing up there that must be read, so the
KUOPPA page fits the machine UNDER the top bar (`clearTop`), and the debt and
round moved down beside the lever — the purse, the round's coins, HOME and
Toko are all the top has room for.

The old pit (v1's KUOPPA, `pit.html`) stays, a small link from the new title.

Gates: `core.mjs` 139 (the parts on every stage of the face, the rules, the
reels paying the picture, the parts in order, a bot run twice from one
seed), `classic.cjs` 32, **`kuoppa.cjs` 28** (new: a round, the vendor, a
debt paid and a part bolted on, a spin, a fall, both formats), `smoke.cjs` 44
(the old pit).

## v3 — 2026-09-27 — the real machine, on a Kallio bar wall

The owner sent two photographs of a real Pajatso — a Finnish 1 mk machine, one
of them hanging on an orange bar wall with two brown bottles on top — and
answered eight questions: *Kallio bar*; the pachinko parts *in order, but only
the special mode, not base*; keep the debt-and-deadline run; *B, maybe C* for
the jackpot (bigger and rarer here, perhaps progressive in the roguelike);
*that or more* coins; the UI in all three languages; *Kuoppa is roguelike*.

**The face is the photograph's, not v2's memory of one.** v2 guessed a
Bajazzo-type face — cups among the nails, a clown with a cup for a mouth.
The real one puts every winning place in a ROW OF WINDOWS across the top,
payouts printed under them: `R · 1:00 · 1:50 · 1:50 · 7:00 · 1:50 · 1:50 ·
1:00 · R`. Under them a grey band, red V deflectors, and the thing that makes a
Pajatso a Pajatso: **the pot**, columns of coins stacked behind chrome
dividers where you can see them. So:

- A coin that misses every window falls past the V into a column and STAYS
  THERE, on screen. The pot is state (`game.pot`, thirteen columns, a hump to
  start, the way the photographs show it); a full column spills into the cash
  box.
- **The POTTI is the red 7:00**, and it pays seven AND the three middle
  columns. That is the owner's *B*: bigger (≈40 mk on a fresh machine against
  v2's 10) and rarer (1 in ~95 coins against 1 in ~30) — and its size is on
  the glass before you pull, which no printed number can do. The HUD says
  `POTTI now` too.
- **Money is markka.** 1:50 pays one and a half, so the purse can hold 50 p;
  a pull takes a whole markka, and under one markka you are out. **30 mk** a
  session (the answer was "that or more"). `R` gives the coin back.
- The POTTI window is 2.66 bu against the others' 2.9, and a nail stands over
  its mouth a pass above each wall top — the same guard v2's clown had.

Measured with `node pajatso/test/face.mjs` (rewritten for windows and the
pot): **1.05 back per markka on a fresh pot and 0.97 with the pot left to run**
— the difference is the POTTI paying out a hump the machine then has to eat
back — POTTI 1 in 95, no coin fished out, no fouls. Two things it took:

- *The first sweep had a sweet spot worth 3.1 a coin.* Twenty-odd nails in the
  red let one pull land on the same window; a denser staggered field
  (5.2 × 3.8, a tenth missing) makes every power a neighbourhood of windows.
  Individual powers still read 0.5–2.4 over 150 coins, which is the POTTI's
  variance at ~40 mk a hit, not a lane.
- *The top of the lever was a dead zone* (88% lost): the strongest coins rode
  the rail round and dropped down the gap by the right wall. A second kicker
  just over the window row throws them back onto the last windows.

**The room is a Kallio bar**: an orange painted panel on a white wall, the
teak case, the black 1 mk plate (`1mk VAIHTOKONE · MYNTVÄXLARE 2×50p`) down
the right of the glass, a chrome drawer pull, the crank on the right side of
the case, two brown bottles on top and the corner of a bar table with two coin
holes in it. No maker's plate is copied; the little brass one says PAJATSO.

**Three languages** (`js/classic/lang.js`): fi / en / ja, a switch on the title
and the pause sheet, English as the per-key fallback. The first visit follows
the arcade's own choice (`sudsJackHubLang`), then the browser. Markka are
written with a Finnish comma in Finnish. `core.mjs` fails on a key missing
from a pack, on English left in one, and on a key the page asks for that does
not exist.

On a phone the purse sits beside the arcade's corner and nothing else: the
best score moved off the top bar under 440 px (it read into the sound button),
and `POTTI now` joined the pull numbers by the lever.

Gates: `core.mjs` 114, `classic.cjs` 32 (the language switch, the comma, the
choice kept), `smoke.cjs` 44 (KUOPPA, untouched).

## v2 — 2026-09-26 — Pajatso

The owner, after v1: *"Boring, the mobile view should be much closer. Not told
many features in the game."* Then: *"make it Pajatso, change name. Start with
regular Pajatso, then add a roguelike mode and tons of Pachinko like
features."* This is the first half: the regular one.

**What a Pajatso is, here.** A kiosk machine on a pine wall: one coin at a
time, a lever you pull DOWN and let go, a rail over the top, brass nails,
and cups with a number painted under each — the Bajazzo (the clown) the
machine is named after is painted on the arch, and his mouth is a cup. Twenty
coins, and the session ends when they do. Your best is the most you ever held
at once. `index.html` is the machine; `js/classic/` is all of it.

**The face runs on the pachinko board's physics**, unchanged — the rail, the
backflow valve, the knife-edge tip, the stuck-coin rattle — with a bigger coin
(2.5 bu on a 60 bu face) and its own layout (`js/classic/layout.js`). Tuned by
measurement with `node pajatso/test/face.mjs`, which sweeps the lever and
prints where coins end up and what comes back per coin. What it took:

- *Both walls need kickers.* The nails stop a pass short of each wall, which
  leaves a free lane down it; the strongest shots rode the rail round and fell
  straight down the right wall, the weakest down the guide, and neither touched
  a nail. Red ramps on both walls send them back in.
- *The wedge rule as ONE pass, not a box per feature.* Every coin the first cut
  had to fish out was sitting on a cup's guard nail with a lattice nail beside
  it. A field nail may now not stand closer than a pass to any other nail or to
  the end of any wall, and the gate checks every pair.
- *The spring decides whether the lever means anything.* At the first range,
  everything above half power rode the whole arc and did the same thing. The
  range now sweeps the release point from the left, over the top, and only the
  last quarter goes round to the right side — three games on one lever.
- *Paint what the physics says.* The clown's mouth was meant as the jackpot and
  was hit more often than the two side chimneys together, so the chimneys are
  the ★ POTTI (10) and the clown pays 5. The numbers were set from measured
  rates: over the whole lever the machine pays back 0.95 a coin; the best pull
  (about 20%) sits a little over 1 and the dead zone near 85% well under.
- *A bug in the shared board:* a cup's sensor reached 1.4 bu BELOW its floor,
  so a coin sliding underneath a cup was paid as a coin in it. Traced off the
  POTTI; the pit's pachinko board had the same bound and is fixed with it.

**Closer.** The camera solves for the face: upright it is fitted to the
phone's WIDTH (the coin count floats over the sign), and while a coin is on
the face the camera leans in and follows it (about 30 px of coin on a 390 px
phone, against 13 at rest). **Told.** Five first-time lines, each once per
browser, never over the lever: pulling, the cups and the bottom, a tap to pull
the same again, the POTTI chimneys, and the right side.

**Controls.** Drag the red knob down and let go — where your finger is IS the
pull; a TAP pulls exactly what you pulled last (the green line on the lever).
SPACE or ↓ held pulls at a steady rate and fires on release; ENTER repeats.
A pad: hold A, or squeeze RT like the lever itself; Y repeats.


## v1 — 2026-09-26 — the pit, the machine, the debt

The owner's brief: *"a game that's mixed Clover Pit, Raccoin and Pachinko..
roguelike elements and 3D room like the Pit."* `GDD.md` is the design; this
log is what shipped and what it cost to get there.

**What is in it.** A first-person concrete cell at the bottom of a shaft, with
four stations you turn between (the machine, the ATM, the charm vendor, the
door with its eight padlocks and the red phone). The machine is a pachinko
board whose coins fall onto a coin pusher whose lip spills into your tray. Each
deadline is three shifts of twelve house coins; the ATM must hold the debt at
the end of the third or the trapdoor opens. Twenty-nine charms in six families
(nails, stamps, reels, pusher, money, raccoon), ten phone deals, FEVER through
the attacker, the BANDIT through the ceiling, and endless after the door.

**Everything that is rules or physics is pure** (`rng`, `board`, `pusher`,
`reels`, `engine`, `data`): no DOM, no three.js, no clock, seeded. That is what
lets `test/core.mjs` run whole runs with a bot in bare node, and what lets
`test/measure.mjs` read the machine rather than guess at it.

**The board was tuned by measurement, and the lessons generalise:**

- *A wedge is a gap between a coin's width and a hair more.* A coin resting on
  a nail with a wall at its back is stuck forever; every clearance on the board
  is either a pass (`BOARD.CLEAR`, 2.25 bu for a 2 bu coin) or a fence.
- *A row of nails is a potential well, not a ramp.* The first "way" stalled
  every slow coin: rolling round the downhill nail, a coin climbs unless the
  slope is steeper than `atan((s/2) / h)`, h being how high it sits between two
  nails. At 1.25 bu spacing that is 27 degrees; every way on the board is 30.
- *A coin balanced on a nail head is an equilibrium no real coin holds.* The
  sim tips it (and one on a pocket's rim) the way a breath of air would.
- *The launch lane needs a backflow valve* (逆流防止). Without it a coin
  knocked back up-left by the top nails rode the rail backwards down the lane,
  and every launch after it hit it at the bottom: one bot logged 370 fouls in a
  single shift. The valve is one-way on the coin's sense of rotation.
- *A foul has to be taken out when it TURNS, not when it lands*: a coin
  resting on the lane floor has vy ≈ 0, not < 0, and so was never counted.

The dial now has a map a player can learn: low power runs the WAY into the
start chucker (~16% of coins), middle power feeds the tulips (~15%), and full
power rides over the top and down the right side — which only matters in FEVER,
when 95%+ of right-hand shots find the open gate.

**The pusher is quasi-static on purpose, and the float must be PACKED.** A coin
on a pusher bed moves because something moved it. The first float was laid at
86% cover and swallowed 36 coins without paying one — every push spent closing
gaps — and the shelf, half full, absorbed the next forty. The float is a touching
hex lattice from the slab's reach to a front row already over the lip, and a
packed shelf, so the first coin of the first shift shoves one off the front.
A pusher conserves coins (the core gate holds it to the coin), so pusher
charms can only close the gutters or top the pile up: Long Stroke, which just
shoved more into the gutters, was cut for Loaded Bed.

**The reels are a lottery, not three strips.** Three independent reels cannot
give a jackpot a rate a player sees in thirty drops (three sevens on a line at
one in ten is one in a thousand a line), so a spin draws its outcome and then
BUILDS a picture that shows it — the winning line lit, every other line broken,
sometimes a REACH on a miss. The engine pays what the picture shows, and the
core gate checks 4000 pictures against their draws.

**The view.** Low-res render, nearest upscale, ACES, 40-level ordered dither,
vignette and grain in one blit (three skips tone mapping into a target). The
machine is the room's second light and changes colour with its mood. Every
station SOLVES its lens: the narrowest field of view that fits its silhouette
into the band the HUD leaves free, lens-shifted into it — so the machine fills
a phone held upright and a monitor alike. Three render bugs worth keeping:
the fit first used the machine's bounding box, whose top front corner is empty
air (the machine came out small); every coin on the board was drawn EDGE-ON
(three's XYZ Euler applies the spin before the stand-up); and a metal coin
facing the camera reflects the room BEHIND the viewer, which the environment
cube had painted black — so coins in flight get their own brighter material on
a dark disc, the Master System's flat fill inside a hard line.

**What the site caught that the branch could not.** Walking the deployed tree on
a phone found three faults before anyone played it, all green on the branch:
the site's HOME shell is newer and seats a Toko button beside HOME under a
thumb, and the HUD's fixed 104px corner put it on top of the deadline (the top
bar now MEASURES where the arcade's corner ends, and upright the debt runs full
width under it rather than shrinking its bar to a dot); the SHIFT 1 message was a
centred nowrap line, so a phone's first instruction ran off both edges; and
`hub/pad.js` was imported bare while the shell asks for it by token — two
URLs, two instances, two pollers. Each has a check now (the smoke gate stands a
Toko button next to HOME itself, since the branch's shell has none).

**Balance, as first measured** (`node pachipit/test/measure.mjs runs 10`): the
naked machine (the `saver` bot, buying nothing) dies at deadline 3-4; the best
charm runs reach deadline 8. The bots still spend themselves to death before
the first debt too often — that is a fact about the instrument, and the next
balance pass starts there.
