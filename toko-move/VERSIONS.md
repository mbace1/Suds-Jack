# Toko Move — versions

## v8 — 2026-08-21

**The bridge did not look like a bridge**, and the fix is the same shape as the
one v7 already recorded about the road: everything a state assertion can reach
was right, and a screenshot said no.

A span got parapets in v7 — drawn on the square's top and bottom edge whatever
direction the traffic ran. So an east-west crossing read correctly and a
north-south one came out as a **ladder of rungs laid across the road** rather
than a rail down each side of it, which is a level crossing, not a bridge. The
parapets run along the traffic now, taken from the span's own road neighbours;
a lone span with nothing either side still gets all four, because a stub of
bridge is what it is.

## v7 — 2026-08-21

**The Rush** — the second local layer, and the first mission not played on
trains. You lay road and nothing else; every driver picks their own way and will
not be told otherwise.

This is the owner's "Mini Motorways will be a local car layer" taken as a
constraint rather than a skin. Mini Metro's dial is **frequency** — stretch a
line and it calls less often anywhere on it — and you own the vehicles. Mini
Motorways' dial is **capacity**: nobody waits for a departure, cars take up
room, and room runs out. So the verb here is *provide room*, not *route people*,
and there is deliberately nothing on the page that assigns a car to anybody. Two
local layers that played the same would be worse than one.

Everything about the PEOPLE is shared code: a building is a `Station`, a trip is
a `Passenger` with a destination shape, the unreachable mark and the give-up
fuse read `hopsFrom` on whichever transport the mission runs on. That is the
owner's "layers are near-clones differing by variables" made true rather than
asserted — `layer: 'roads'` in the mission is the whole switch.

### Three things it shipped wrong, all found by measuring rather than by reading

- **A deadlock wearing a comment.** `CELL_CARS = 2` was written as "one each
  way, so nobody deadlocks head-on" and then counted both, so a one-square
  street with two cars pointing east and two pointing west locked solid for
  ever. The balance sweep came back with two boards in eight at 93% and 100% of
  every car stopped. Halving the odds of a deadlock is not preventing one: the
  lane is real now, and traffic coming the other way does not block you.
- **A queue that advanced one car a tick.** Cars were driven in array order, so
  the back of a jam moved before the front. Nearest-its-destination first, and
  a full street flushes together.
- **A bridge that charged by the square.** That makes the price of a river its
  WIDTH: a three-cell channel ate the whole allowance in one span, every L laid
  after it broke silently mid-water, and the board came apart into islands
  nothing could route between — one seed finished with six buildings, three
  deliveries and not a single car on the road. A bridge is a **crossing** now,
  one charge per connected run of water, which is the rule the metro layer has
  always played by: a tunnel is a crossing, however wide the river under it.
  Wins went 9/16 → 12/16 and people walking away halved.
- And bridges are **buyable** at the end of a morning, but only offered once you
  have spent them all on a board that has water. A card that can do nothing is
  worse than no card when you are only dealt two.

### The target is measured, and the first guess was wrong by half

A deterministic player joining each new building to the nearest road it already
owns wins 12 boards in 16 at **190** and gets there at 4:56 of the 7:00. The
shipped guess of 85 was reached at 2:41 — two thirds of the morning with
nothing left to play for. Past 210 the wins fall away for the wrong reason: the
clock, rather than the town outgrowing its roads.

### A road you cannot see is not a quiet road

The first cut took "a shade off the paper" literally and drew the road at
`#ddd6c6` — **1.19:1** against the ground. Every state assertion about it
passed; it simply did not appear in a screenshot. That is the failure this repo
keeps meeting: a gate that certifies *works* cannot see *looks*. So the road is
warm tarmac now, clear of the ground and still light enough that a paper-filled
car and an ink-outlined building read on top of it — and a **dashed centre
stripe** runs along every join, which is the whole difference between a slab of
grey ground and a street. The contrast ratios are in the gate, because that
much of *looks* a number can hold.

### Gates

`node toko-move/test/core.mjs` — 271 checks (was 201): the grid, the road
budget, the crossing rule and its order-independence, reach and the downhill
route, the lane rule, the flush order, dispatch and delivery, what lifting the
road out from under a car does, the Rush's wiring and upgrades, and that the
mission can actually be finished. `NODE_PATH=$(npm root -g) node
toko-move/test/smoke.cjs` — 87 (was 77): the drag that lays road, the drag that
lifts it, and the drag off the end that carries it on — that last one shipped
broken, because "started on road" decided the verb and every attempt to extend
a street simply erased it.

One flake fixed while here: the cut-a-line-under-a-moving-train setup dragged
across a live board, so a stop spawning mid-drag failed the gate about one run
in ten for a reason that was not the bug. The board is held still now.

## v6 — 2026-08-21

**The people nobody can reach are visible now**, and the look moves off its
parent.

`PLAYTEST.md` measured up to 61% of a queue waiting for a shape no line reaches,
drawn exactly like everybody else and never leaving — dead weight pushing the
crowding gauge with nothing on screen to act on. Mini Metro has no answer to
copy: its unreachable passengers behave the same way. So this is a **logical
option, measured**, in the owner's terms — build the sensible thing, test it,
and leave the logic written down to be revised.

- **A waiting passenger is an object now**, not a bare shape. It carries how
  long it has stood there and whether anything reaches it, and the layers to
  come need it to carry weight and a deadline. The same object goes back on the
  platform when it transfers, so a destination survives the handoff — the exact
  thing OpenTTD's own manual records itself getting wrong.
- **Marked** in a pale ink, silhouette untouched. Filling the shape was already
  tried and thrown away: a solid star reads as a different destination.
- **Counted** on the strip as `nowhere to go N`, in the alarm colour, and only
  when there is something to count.
- **They give up** after 45 seconds (70 on the festival night) and the end card
  says how many went home. Measured cost: mean survival 198s → 205s, delivered
  120 → 124, and on boards where nobody is stranded the runs are identical.
- **The three untaught rules say themselves once each** — somebody stranded,
  a ring a quarter closed, a tunnel spent.

### Homage, not a clone (owner's steer)

The palette shifts off its parent's: cooler paper, deeper indigo and vermilion,
and the closest pair of line colours now 98 apart where the old set was 90 —
measured, not eyeballed. But the real divergences are **form**, not hue, and
this game already had three: the grab nub at a line's end, the riders shown
along a train's roof, and the queue drawn as a block rather than a fan. The
ghosted passenger is a fourth, and it is the first one that is a rule rather
than a decoration.

### A gate that copied the palette

The nub's pixel probe held its own copy of the seven line colours and failed the
moment the real ones moved. It reads `PAL` from the game now. That is the third
time in this project a duplicated constant has produced a check that agreed with
itself and disagreed with the game.

### Gates

```
node toko-move/test/core.mjs                           # 201 checks, bare node
NODE_PATH=$(npm root -g) node toko-move/test/smoke.cjs # 76 checks, three formats
```

Mutation-tested: never marking anybody, never letting anybody go, letting people
WITH a route give up, and forgetting who a passenger was across a transfer each
fail a named check.

## v5 — 2026-08-21

**A phone could not pause the game, and the board was using a third of the
screen.** Both found by measuring a render rather than by running the suite,
which stayed green through all of it. Written up in full in `PLAYTEST.md`.

- **The strip wraps.** At 390px it ran to 515px and put pause, speed and sound
  off the screen. `overflow: hidden` clipped them, which is exactly why the
  gate's no-horizontal-overflow check passed the whole time — it measured the
  document, not the controls. It measures the controls now.
- **The board turns to match the screen.** A mission states a rectangle; which
  way up it goes is the screen's business. A portrait phone gets a portrait
  board: screen use goes 36% → 74%, and a stop goes 7px → 22px. Decided once at
  the start of a run, because a board that reshaped itself on rotation would
  move every stop out from under the lines drawn on them.
- **Drawing floors** (`sizeAt` in `palette.js`): the declared board-unit size,
  or a screen-pixel minimum, whichever is bigger. A waiting passenger drew at
  2px on a phone and 6.8px now. The nub stands off the *drawn* radius, so the
  two cannot drift apart.

### A crash, found by playing rather than by testing

Cutting a line while a train was out on the leg being removed left the train
pointing at a leg that no longer existed, and the next frame read `pts` off
`undefined` and took the renderer down. **Every gate passed**, because they all
retract lines that are standing still. A line that shortens now brings its
trains back with it.

### And a regression of my own, found the same way

The v3 rewrite dropped `seedFromUrl()`. The end card went on printing "board
481203" while nothing read it back — a receipt for a run nobody could return to
— and every gate run got a different board. That is how a real bug hides inside
a flaky test: the browser gate failed about one run in three and the honest
reading was "the board changed under it", not "the test is flaky".

### The playtest

`PLAYTEST.md` — driven only through pointer gestures, on desktop, phone and a
phone on its side. Play is possible on all three. The teaching audit found one
hole worth the whole document: **a passenger whose shape no line reaches is
drawn identically to one about to board.** Across three boards, 0.4% to 21% of
the queue is unreachable on average, peaking at 61%, with somebody stranded for
about half the run on two of three seeds — and they are not scenery, they sit on
platforms pushing the crowding gauge toward game over. The first one appears
11.9s after the first line, the same second as the first delivery.

### Gates

```
node toko-move/test/core.mjs                           # 186 checks, bare node
NODE_PATH=$(npm root -g) node toko-move/test/smoke.cjs # 71 checks, three formats
```

The browser gate now measures canvas tap targets, control clipping, board
orientation and drawn legibility at 1180×800, 390×760 and 640×360. Every fix
here is mutation-tested: un-wrapping the strip, un-turning the board, removing
either drawing floor, or putting back the train that outlives its leg each fails
a named check.

## v4 — 2026-08-21

**You could not delete a line with a thumb.** The owner asked how deleting works
at all, which is its own answer about discoverability — and measuring it turned
up a real bug underneath.

Every hit radius was fixed in BOARD units, so it shrank with the window. The
end-of-line nub measured 46px on a 1200px desktop and **17px on a 390px phone**.
Since the nub is the only way to shorten or remove a line, there was no way to
edit a line by touch at all. Radii are screen measurements now (`TOUCH` in
`palette.js`), converted to board units at the current scale, so a target stays
the size of a finger whatever the board is doing.

- **The nub is drawn.** It was an invisible hotspot, which is why the question
  got asked: a gesture with nothing to aim at is a gesture nobody finds. It is
  a ring in the line's own colour with a paper gap around it.
- **Nub versus stop is decided by DISTANCE, not by checking the nub first.** At
  phone scale the two hit zones overlap, and nub-first would have made it
  impossible to start a *new* line from a stop that a line already ends at.
- **`nubs()` moved from `input.js` to `lines.js`.** It is a fact about the
  network's shape, and the renderer needs it too — a renderer importing the
  input layer to find out where to draw is backwards.

### The gate hole that let it ship

The 44px sweep only ever looked at **DOM buttons**. Everything drawn on the
canvas — every stop, every nub, the entire game — was never measured. It now
measures the real targets, on a phone as well as a desktop, and drives an actual
delete-by-drag at 390px.

Two of the new checks were weak on the first cut and had to be rewritten, which
is becoming this project's recurring lesson:

- reading `nubDrawPx` back out of the game proves a *number* exists, not that
  anything was painted. It samples the canvas for the line's colour now.
- "reachable" is not "legible": nearest-wins keeps the nub grabbable even when
  it is jammed against the stop, so the stand-off needed its own check that the
  drawn nub CLEARS the drawn stop on screen.

Mutation-tested: putting either radius back in board units, removing the drawn
nub, or collapsing the stand-off each fails a named check.

### Found while looking, NOT fixed here

Two more phone faults, measured and left alone because they are a different job:

- **the pause, speed and sound buttons are entirely off-screen at 390px**
  (they sit at 375-515px on a 390px viewport), so a phone cannot pause the game.
  `body { overflow: hidden }` clips them, which is exactly why the gate's
  "no horizontal overflow" check passed while three controls were unusable —
  the same weak-check family again.
- **the board uses 35.8% of a portrait phone screen**, 395px of letterbox,
  because an 860x600 landscape board is fitted into a portrait viewport. Stops
  render at 7px and waiting shapes at 2px, which is not legible.

## v3 — 2026-08-21

**The sim stops owning its numbers.** Owner's direction (ROADMAP.md) makes this
one game whose layers are near-clones differing by variables, and whose missions
— about ten minutes each — declare those variables. So the next piece of work was
never a second layer: it was the format the layers plug into.

`js/missions.js` is that format. A mission states its clock, its board, its
spawn model, its transport, its goal and its fail rule. Nothing in `sim.js`,
`world.js` or `lines.js` keeps a tuning value any more — if one can be found
there, it is in the wrong file.

**The endless city is now a mission, and that is the proof.** It is the v2 game
expressed entirely as data, and it had to come out unchanged. It does: across
nine seeds the board, every stop and every passenger are identical for 300
seconds, and across five full runs to game over the score, the clock to the
millisecond, the stops, the lines and the trains all match v2 exactly.

**Goals come in five kinds** — deliver, survive, hold, escort, budget — because a
mission may state any of them. Two of them need things this build has not got
(cargo, money), so a mission naming them is **refused at load** with a message
saying which capability is missing. A goal that is silently impossible is worse
than a mission that will not start.

**"The Festival"** is the first real mission and the seam test: an evening board,
the festival closes at midnight, and the whole field walks to the six nearest
stops at once. Ten minutes, an hour a minute, and the clock reads 00:00 as the
crowd lands.

### What was got wrong on the way

- **The Festival was unwinnable and the fault was the design, not the tuning.**
  120 people onto four six-capacity platforms closed the gauge every time, so
  every seed died at exactly t=240, sixty seconds after the burst. But a crowd
  jamming the stops IS the festival. It now has **no sudden death at all** — the
  gauge still fills and still warns, it just costs you the people rather than
  the night. That is what a per-mission fail rule is for.
- **The festival was a detail inside an ordinary evening.** At the first tuning
  the ambient traffic was 76% of everyone who turned up. The night is quiet now
  and the crowd is most of it.
- **The target was guessed, then measured.** 220 comes from eight seeds: a
  player who keeps every stop connected delivers 235–383 of the 439 who turn up,
  and a player who draws nothing delivers none.
- **The clock printed "1:60".** Flooring the minutes off a float while ceiling
  the seconds separately. One shared `clockFmt` now ceils the total and then
  divides — which also stops a countdown reading 1:59 with two whole minutes to
  go.
- **A test that used one seed proved nothing and said it had.** The check that a
  mission carrying a crowd lays out the same board as one without passed even
  with the site drawn from the board's own stream, because roughly one board in
  seven survives the shift by coincidence. Swept over sixty seeds it fails 52 of
  them. The crowd's location takes its own rng stream for exactly this reason.
- **A check that counted "stops with anybody on them"** was satisfied by ambient
  traffic and passed happily with the whole crowd dumped on one platform. It
  measures the burst now.

### Gates

```
node toko-move/test/core.mjs                           # 165 checks, bare node
NODE_PATH=$(npm root -g) node toko-move/test/smoke.cjs # 47 checks, real browser
```

Mutation-tested again: borrowing the board's rng for the crowd, dumping the
crowd on one stop, silencing the burst's announcement, un-breaking a crossed
hold line, letting a goalless mission count as won, accepting a goal whose
capability is missing, and giving the festival sudden death back — each fails a
named check.

The browser gate also reported 46 checks on one run and 45 on the next: it took
whichever reward the weekly offer happened to roll, so one assertion existed
only some of the time. A gate whose size depends on a dice roll cannot be
compared between runs, so it forces the two-step reward now.

## v2 — 2026-08-20

**Rebuilt from scratch as a Mini Metro clone.**

Numbered v2 rather than v1 even though every line of it is new. The cabinet
already shipped a v1, and the arcade tags what MOVED by diffing `versions.json`
against the numbers you last saw — restart at v1 and a returning visitor is told
nothing changed, which is the one thing that is certainly false here. A version
number belongs to the cabinet, not to the codebase behind it.

Owner's call: the previous build played identically to Mini Motorways over an
abstract map, and the answer was neither a repaint nor a different genre — it
was to build the thing properly and on its own.

Nothing is shared any more. The old version was a thin daylight skin over
`flow-core`, the engine Piritori owns; this one has its own sim, its own
renderer and its own input, and `flow-core` is untouched and still Piritori's.

**The game.** Every stop is a shape and everybody standing on it wants to reach
a stop of some other shape. You draw lines between stops, trains run them, the
city keeps growing and people never stop arriving. A stop over its capacity
starts a clock; when the clock closes, the run is over. Score is people
delivered.

- **Octolinear track** (`geometry.js`) — every leg is 0°, 45° or 90° and
  nothing else. Get this wrong and it stops being a metro map and becomes a
  graph.
- **The network solves once, not per passenger** (`lines.js`) — a breadth-first
  sweep per shape gives every stop a hop count, so a passenger's whole decision
  is "is the next stop closer to my shape than this one". Boarding the wrong
  direction and riding past a transfer are impossible by construction rather
  than by rule.
- **The nub.** A stop has to answer two different drags — extend the line that
  ends here, or start a new one — so every terminus grows a small stub. Grab the
  stub to extend, grab the shape to start. The line commits *as you drag*, and
  dragging back onto the previous stop is the undo.
- **Water costs tunnels**, which is the only reason one connection is more
  expensive than another. A board with no river is a board where every line is
  equally good.
- **The weekly card**: two options, never more. A choice between four is a menu.

### What was got wrong on the way

- **Red was line one AND the crowding alarm**, so a healthy line read as a
  warning. Banning red from the palette only moved the collision onto orange —
  the real fix was that the alarm should never have competed on hue at all. The
  gauge is ink now, and the gate fails if any line colour comes near it.
- **Amber and orange were 50 apart** and read as one colour two stops in. The
  seventh line colour is now picked by measuring candidates against the other
  six instead of by eye.
- **Trains vanished into their own line** — same colour, no gap. They get a
  paper casing first, which is also why the cabinet cover draws them that way.
- **The crowding arc looked like a stray hair** growing out of a stop. A gauge
  needs its empty half drawn or there is nothing to read the full half against.
- **Passengers past capacity were filled solid**, and a solid star reads as a
  different destination from a hollow one. Every waiting shape is drawn the
  same; the queue getting longer and the gauge closing already say it.
- **`dim` and `warn` failed AA** for body text at 3.99 and 3.80. This repo has
  regressed on exactly that before, so both are measured in the gate now.
- **Gates for the tunnel marks were computed on the unshifted path**, so two
  lines sharing a leg left one line's tunnel marks stranded over open water.

### The module tokens start at `?v=2`, not `?v=1`

The build this replaces was deployed with `js/main.js?v=1` and
`js/palette.js?v=1`. Those two URLs now point at completely different code, so
shipping this at `?v=1` would serve a returning visitor last month's bytes from
cache under the same address — the exact failure this repo has shipped before.
Everything under `toko-move/` carries `?v=2`, and `../hub/shell.js?v=34` matches
what the rest of the deployed site is pinned to.

### Gates

```
node toko-move/test/core.mjs                          # 111 checks, bare node
NODE_PATH=$(npm root -g) node toko-move/test/smoke.cjs # 29 checks, real browser
```

`core.mjs` needs no browser, no GPU and no canvas, so it runs on every edit, and
it is driven off game state rather than the wall clock. Both gates were
mutation-tested: breaking the octolinear bend, the boarding direction, the
transfer rule, the parallel-line offset, the water check, the tunnel cost, the
palette separation, the AA floor and the 44px floor each fail at least one
named check.
