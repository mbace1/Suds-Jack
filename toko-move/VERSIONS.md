# Toko Move — versions

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
