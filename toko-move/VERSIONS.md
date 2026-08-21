# Toko Move — versions

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
