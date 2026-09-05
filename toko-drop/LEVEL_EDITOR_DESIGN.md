# Toko Drop — level editor, scoping

Owner ask, 2026-09-02. Three requirements:

1. **Multiple arena shapes, including actively changing ones** — the worked
   example: three overlapping circles whose common area moves.
2. **Drop-down menus at the top** for enemies / pickups / mode-specific items;
   tap to choose, tap to place a spawn spot.
3. **A timeline in seconds, 0.1s increments**, scrollable, along the bottom.

This is a scope, not a plan of record. Nothing below is built. It exists to
make the go/no-go decision an informed one, and to stop the first
implementation session from re-deriving the same constraints.

Code facts are read off `gh-pages` (v235), which is where `toko-drop/js/`
actually lives. `main`'s copy is stale at v175 and must not be used for this.

---

## 1. The headline: two of the three asks are nearly free

The spawn pipeline is **already an authored-timeline data structure**. It was
built procedurally, but the runtime contract it produces is exactly what an
editor would want to write by hand.

`getEnemySchedule()` builds a time-ordered list, and `main.js` pumps it:

```js
while (pendingSpawns.length > 0 && waveTimer >= pendingSpawns[0].delay) {
  const s = pendingSpawns.shift();
  const edge = smashMode ? 0.99 : 0.85;
  const bx = s.px != null ? s.px : Math.cos(s.angle) * HALF_X * edge;
  const bz = s.pz != null ? s.pz : Math.sin(s.angle) * HALF_Z * edge;
  const en = new Enemy(scene, s.type, bx + ox, bz + oz, s.speedMult, s.intervalMult);
```

Two things fall out of that, and they're the difference between "large feature"
and "very large feature":

- **A spawn entry already carries an optional explicit position.** `s.px` /
  `s.pz` override the spawn ring. Requirement 2's "tap to place a spawn spot"
  writes `{px, pz}` — no new runtime path, no new plumbing.
- **A spawn entry already carries a time.** `delay`, compared against
  `waveTimer`. Requirement 3's 0.1s timeline writes `delay` values. The pump
  loop doesn't care whether a human or the director produced them.

So the editor's output is an existing shape:

```js
{ type, delay, px, pz, speedMult, intervalMult, clusterOffset?, shooter? }
```

**What is genuinely new for 2 and 3** is a UI, a file format, and a way to run
a level that bypasses `getEnemySchedule()`. Not a rewrite of how spawning works.

**Containment is also already parameterized**, which matters for requirement 1:

```js
player.update(dt, moveDir, aimDir, bullets, halfX, halfZ)
enemy.update(dt, playerPos, bullets, halfX = 19, halfZ = 18)
```

Both modules take the arena as arguments rather than reaching for a global.
That's the seam a shape system slots into.

---

## 2. The real work: arena shapes

Everything else is UI. This is the engineering.

### 2.1 How deep the rectangle goes

Counted on `gh-pages` v235:

| site | count | what it does |
|---|---|---|
| `HALF_X` in `main.js` | 88 total | — |
| — of which containment clamps | 20 | `Math.max(-HALF_X + 1, Math.min(HALF_X - 1, …))` |
| — of which spawn/edge placement | 31 | `Math.cos(a) * HALF_X * edge`, hazard placement, FX |
| `halfX`/`halfZ` in `enemy.js` | 9 | per-body clamps, `_flopMove` bounds, random targets |
| `halfX`/`halfZ` in `player.js` | 2 | signature + one clamp block |

The rectangle is assumed in three distinct ways, and they need different fixes:

1. **Containment** (~31 sites) — "keep this body inside." Mechanical to migrate.
2. **Placement** (~31 sites) — "put something at the edge / somewhere valid."
   Needs a shape-aware replacement, not a clamp.
3. **Rendering** — the floor is a `PlaneGeometry(HALF_X*2, HALF_Z*2)` whose
   shader derives everything from `worldToUV()`. Shape has to be drawn, not
   just enforced, or the player can't see where the floor is.

### 2.2 Proposal: one `Arena` object, backed by an SDF

Signed distance is the right tool here, and the codebase already speaks it —
the gel dome is an SDF (`smax(length(p) - 1, -p.y - domeCut, domeRound)`,
`TUNING.blob`), and the floor is already a shader doing per-pixel math in UV
space. This is a technique the project has, not a new one to learn.

```js
const arena = {
  sdf(x, z),            // < 0 inside, > 0 outside, world units
  contains(x, z, r),    // sdf(x,z) + r <= 0
  clamp(x, z, r),       // → nearest valid point (march down the gradient)
  edgePoint(angle),     // replaces cos(a) * HALF_X * edge
  randomInside(rng),    // replaces (rand*2-1) * (halfX - 2)
  aabb(),               // camera fit, worldToUV, floor plane size
  update(t),            // moving shapes advance here
};
```

The owner's example maps directly onto SDF operators:

| shape | SDF |
|---|---|
| the current rectangle | `max(abs(x) - hx, abs(z) - hz)` |
| a circle | `length(p - c) - r` |
| several circles, all of them | `min(d1, d2, d3)` — **union** |
| **their common area** | `max(d1, d2, d3)` — **intersection** |
| that common area moving | animate the centres in `update(t)` |

So "three overlapping circles create a moving common area" is
`max(sdCircle1, sdCircle2, sdCircle3)` with animated centres. It's one line of
shape algebra, which is the good news; the cost is everywhere it has to be
*honoured*, which is §2.1.

### 2.3 Rendering the shape, twice, without painting twice

The floor must show the playable region or the shape is invisible. That means
the SDF in the fragment stage — and the standing constraint is that
shader-dependent art is written **once, on TSL**, never in both languages
(`TOKO_DROP_ROADMAP.md`, guiding constraints).

That constraint is in tension with reality here: the classic r167 path is the
**default** renderer, so a shape that only draws under `WEBGPU (BETA)` would be
invisible for most players. Arena passes v223 and v228 resolved this by keeping
GLSL and TSL in deliberate parity for the *floor specifically* — the same math
expressed twice, gated by review rather than by rule. A shape system has to
follow that same exception, and it should be named as an exception rather than
quietly broken.

Concretely: `uArena`-style uniforms already carry the floor's parameters as
packed vec4s, and v228 added fixed-size point arrays (`uMass[10]`, `uPops[6]`,
`uPrizes[5]`) branch-free on both paths. A shape is the same problem again —
**a fixed-size array of circles/rects with a combine mode**, evaluated
branch-free. Precedent exists, including the trap: keep the loops static.

One thing that gets *easier*: `scripts/webgpu-smoke.sh` (added this session)
now actually executes the TSL path, so a broken node graph fails a gate instead
of shipping green. Shape work is the first feature that lands with that safety
net under it.

### 2.4 Moving shapes are a design problem, not just a code one

If the valid region moves out from under a body, something must happen. This is
**not** answerable in code review — it's a rules decision, and it changes how
the mode feels:

- **Push** — the arena shoves you along the SDF gradient. Safe, forgiving,
  slightly mushy; a shrinking region becomes a crowd-control tool.
- **Damage** — standing outside costs HP, like the poison zones already do.
  Sharp, readable, punishing; needs a telegraph so it isn't a gotcha.
- **Death** — falling off. Maximum stakes, and completely at odds with the
  current game, which has no fall state at all.

There's a related question for enemies: does the shape contain them too? If
yes, a shrinking region is a kill-box for both sides and pressure rises on its
own. If no, the swarm can stand where you can't, which is a different (and
possibly better) game.

**These need answering before implementation, not during.** They're the kind of
thing that's cheap to decide now and expensive to change once 31 placement
sites depend on it.

---

## 3. Where the editor lives

**Rebuild-on-real-code is a settled principle here.** `enemy-lab.html` was a
fork carrying its own copy of the goo shader against a CDN three@0.160; v216
rebuilt it on `js/specimen.js` and the vendored builds precisely because a lab
that isn't the game lies to you (roadmap Phase 1). An editor is a much bigger
surface for the same failure.

So: **the editor imports the real game modules** — `enemy.js`, `tuning.js`, the
real `Arena`, the real spawn pump — and renders through the same path the game
does. It does not reimplement placement, and it never gets its own copy of a
shader.

Two candidate homes:

- **`toko-drop/editor.html`**, a sibling page like `enemy-lab.html`. Clean
  separation, no weight added to the game bundle, reachable from the lab/hub.
  Preferred.
- Inside the pause menu, like `designer.js`. Rejected: the settings panel is
  already the busiest surface in the game and this needs the whole screen.

---

## 4. Level format

JSON, versioned, in-repo, and *testable* — the repo's habit is that data with
consequences gets a gate (`test/rooms.mjs` proves Eeri rooms; v217 proved the
wave director byte-for-byte).

```jsonc
{
  "format": 1,
  "id": "three-rings",
  "name": "THREE RINGS",
  "arena": {
    "combine": "intersect",              // union | intersect
    "shapes": [
      { "kind": "circle", "c": [-4, 0], "r": 9,
        "move": { "kind": "orbit", "radius": 3, "period": 12 } },
      { "kind": "circle", "c": [ 4, 0], "r": 9 },
      { "kind": "circle", "c": [ 0, 5], "r": 9 }
    ]
  },
  "duration": 90.0,
  "spawns": [
    { "t": 0.0, "type": "GLOBBO",    "px": -6, "pz": -10 },
    { "t": 0.5, "type": "GLOBBO",    "px":  6, "pz": -10 },
    { "t": 4.2, "type": "SPLITTA",   "px":  0, "pz": -12, "speedMult": 1.2 },
    { "t": 8.0, "kind": "pickup", "id": "firerate", "px": 0, "pz": 0 }
  ],
  "rules": { "mode": "arcade", "outside": "damage" }
}
```

Notes on the shape of this:

- `t` in seconds, authored at 0.1s. It becomes `delay` verbatim.
- `px`/`pz` are already understood by the spawn pump.
- `type` is a **name**, not the numeric `EnemyType` value — the numeric ids are
  positional and a saved level must not break when the enum grows.
- `rules.mode` decides which ruleset the level runs under, which is how
  "mode-specific items" in requirement 2 stay coherent: the palette filters to
  what that mode actually has (Rush's four bodies vs the 40-type gun ecology).

---

## 5. UI sketch, against the three requirements

Touch-first — "mobile touch is first-class" is a standing constraint, and the
requested layout (menus top, timeline bottom) is already a phone layout.

```
┌──────────────────────────────────────────────┐
│ [ARENA ▾] [ENEMIES ▾] [PICKUPS ▾] [RULES ▾]  │  ← req 2
├──────────────────────────────────────────────┤
│                                              │
│         the arena, real renderer,            │
│         real shape, ghosts at each           │  ← tap to place
│         spawn point for the current time     │
│                                              │
├──────────────────────────────────────────────┤
│ ▶  0.0 ┊ 1.0 ┊ 2.0 ┊ 3.0 ┊ 4.0 ┊ 5.0 ┊ …    │  ← req 3
│    ● ●    ●        ●●●         ●             │     scrollable
└──────────────────────────────────────────────┘
```

- **Choose-then-place** (their phrasing) is the right touch interaction: it
  avoids drag, which fights page scroll on mobile.
- The **playhead is the editing context** — the arena shows the shape *at that
  moment* (critical once shapes move) and the spawns at that moment. Scrubbing
  is how you check a moving common area actually leaves somewhere to stand.
- **Play-from-here** is the feature that makes the whole thing worth using.
  Same page, real game code, starting at the playhead.

---

## 6. Honest flags

**This is a big feature, and it lands next to an unresolved concern.** The
viability read from earlier still stands: the game's biggest risk is surface
area — six rulesets plus six cabinets is already a lot to meet on a title
screen. An editor adds another. It's defensible (an editor is the strongest
possible answer to Phase 6's "content drops", and authored levels are exactly
the content an unlock track would gate) but it should be a decision, not a
drift.

**It resurrects CHALLENGES.** `Q-028` — a ten-level campaign with per-level
rules — was dropped by the owner on 2026-08-28. An editor plus a level format
*is* the delivery mechanism CHALLENGES needed. That's not an argument against
either; it means the two should be decided together rather than one arriving
through the back door.

**Rush is mid-playtest.** The tier table and all four ability numbers are still
flagged unvalidated. Starting a large new system before that feedback lands
risks building on numbers that move.

---

## 7. Phasing, with gates

Each phase ends somewhere shippable, and nothing proceeds on a red gate.

**P0 — the rectangle becomes an SDF, and nothing changes. ✅ SHIPPED (v236).**
`toko-drop/js/arena.js` + `scripts/arena-check.mjs`. What actually happened,
including where this scope was wrong, is §8.

**P1 — static custom shapes, no editor.**
Hand-written JSON, a loader, floor rendering on both paths, and one authored
level playable end-to-end.
*Gate:* a headless playthrough of the authored level; screenshots of the shape
on classic and TSL, proving parity.

**P2 — the editor UI. ✅ SHIPPED (v237), ahead of P1 on the owner's call.**
Requirements 2 and 3, on the real renderer, with play-from-here, on the
rectangle. `js/editor.js` + `js/level.js`; gates `scripts/level-check.mjs` and
`scripts/editor-smoke.sh` (the round-trip above, plus: the body stands within a
body-width of the tap, on time). What was learned is §9.

**P3 — moving shapes.** Only after §2.4 is decided.
*Gate:* a level whose common area moves is provably always non-empty and always
has a reachable standing spot, checked headlessly across its duration.

P0 is the honest test of whether this is a two-week feature or a two-month one,
and it's useful on its own even if the editor is never built: an `Arena` object
is a better foundation than 88 references to `HALF_X`.

---

## 8. P0, as built (v236)

Written after the fact, because a scope that is never checked against what got
built is just a guess with a date on it.

**What shipped.** `toko-drop/js/arena.js`: a pure module (no three.js, no DOM,
no imports) holding `sdf` / `contains` / `clamp` / `ringPoint` / `insetPoint` /
`rayEdge` / `randomPoint` / `update`, plus `rectShape`, `circleShape`,
`unionShape` and `intersectShape`. Only the rectangle is wired up. The gate is
`scripts/arena-check.mjs` — 8,396 bare-node checks comparing every method
against the literal expression the call site used to inline, at all six shipped
arena sizes, with `Object.is` rather than a tolerance.

**§2.1's counts were wrong, and wrong in a useful way.** The estimate was ~31
containment and ~31 placement sites. The real number of sites that had to move
is about **twenty**. The rest of the 88 `HALF_X` references are not boundary
questions at all — they are `HALF_X * 0.32` set dressing, the floor plane, the
camera fit, `worldToUV`. Those are asking how BIG the room is, which stays a
fair question for a shape of any kind, so `HALF_X` / `HALF_Z` survive as the
region's bounding box. **Splitting "the boundary" from "the size" is the single
thing that made P0 a day instead of a fortnight**, and it is the finding to
carry into P1.

**Three sites were deliberately not migrated**, and naming them is cheaper than
letting the next session rediscover them:

- `smashDoorPos`'s literal cardinal table. `ringPoint(π/2, 1)` answers
  `6.7e-16`, not `0`. The literal is exact; the general form is not.
- The cube **flop** reflection, which is per-axis (`if |nx| > bx flip x`). An
  SDF has no notion of an axis. P1 needs a gradient-reflect helper — bounce off
  the surface normal — before that one can move.
- The decoration drift bounce, for the same reason.

**One primitive was missing from §2.2's sketch and had to be invented:
`rayEdge`.** TORO's dash telegraph asks "how far along this heading until I hit
a wall", which is neither a clamp nor a placement. It was an inlined slab test.
It is closed-form on a box and a sphere-trace otherwise, so the telegraph will
still draw the true distance in a room with a curved wall. Any future *dash,
charge, or beam* wants the same call.

**Two determinism rules had to be written down**, because they are invisible
until a level uses a shape and then everything desynchronises at once:

1. `randomPoint` draws from the rng **exactly twice, x then z, for every
   shape**. Rejection sampling is banned outright — a variable draw count
   desynchronises every seeded schedule. Non-rectangular shapes take the AABB
   sample and *clamp* it inside instead.
2. Nothing in the module reads `Math.random()` or a clock. `update(t)` takes
   its time as an argument.

**Being right and being identical are different goals.** P0's job was the
second, so the rectangle's `clamp` reproduces `Math.max(-h, Math.min(h, v))`
including its behaviour when `h < 0`, and `ringPoint` stays the old
`cos·halfX·edge` formula — which on a box is an inscribed **ellipse**, not the
boundary. Both are odd. Both are what the game has always done. Fixing them
belongs in a release that says it is fixing them.

**The gates earned their keep twice.** `smoke.sh` runs its own enemy harness and
caught the `Enemy.update()` signature change on the first run rather than in a
browser. And `arena-check.mjs` was falsified before being trusted: a
wrong-axis clamp fails 1,032 of its checks, and adding `1e-12` to one ring
coordinate fails 1,536.

**What P0 says about the rest of the estimate.** The rectangle survived being
reimplemented, which was the stated stop-condition, so §2.1 is no longer the
risk. The remaining risk is entirely §2.3 — **drawing** the shape, twice, in
GLSL and TSL — and §2.4, which is still a decision nobody has made.

---

## 9. The editor, as built (v237)

Owner, on being offered P1 (shaped arenas): *"rectangular is ok too, the tool
is what really makes it work though."* So the order flipped: P2 shipped before
P1, on the rectangle, and P1 stays on the shelf until a shape is wanted.

**What shipped.** `index.html?editor` mounts `js/editor.js` over the running
game — §3's "sibling page" was NOT taken. The sibling would have needed its own
scene, camera, floor and spawn pump, and every one of those is a place the
editor could disagree with the game about where a body lands. Mounting over the
real game costs one `gameState` ('editor', render-only) and a hooks object, and
buys the real floor, the real camera and the real `pendingSpawns` for free.
`js/level.js` is §4's format, pure, with `compile()` emitting the pump's exact
entry shape. `EXAMPLE_LEVEL` (FIRST LIGHT) is built in.

**Against the three requirements:**

1. *Arena shapes* — the format carries `arena` (a named rectangle or an
   explicit `{halfX, halfZ}`), and `arenaPreset()` makes the game honour it.
   Non-rectangular is a `shape` field away once §2.3/§2.4 are settled.
2. *Drop-downs on top, tap to choose, tap to place* — native `<select>`s (the
   one drop-down that is touch-friendly everywhere), choose-then-tap, no drag.
   A tap near an existing spawn selects it; MOVE ⤢ then tap relocates it.
3. *0.1s timeline along the bottom, scrollable* — a canvas strip in a
   `pan-x` scroller, 0.1s ticks, 1s labels, four zooms, two lanes (enemies /
   pickups), stacked-cell counts. Tap sets the playhead; the playhead is where
   a new spawn lands and what the ghosts brighten for.

**Play-from-here** is what makes it a tool rather than a form. Spawns before
the playhead are DROPPED, not fired at once (a pile of catch-up bodies on frame
one is a different level). The run goes through the ordinary `startGame()` with
`customLevel` steering a handful of gates — and one of those gates was found in
design, not play: the classic "all enemies dead → WAVE CLEAR → spawnWave()"
path would have re-compiled the level as wave 2 and looped forever.

**Two traps paid for:**

- `input.js` `preventDefault()`s every touch outside its UI list, which kills
  the synthesised `click` on the canvas. The editor reads arena taps from raw
  `touchstart`/`touchend` pairs in the CAPTURE phase (the same lesson
  `hub/shell.js` learned), and the timeline strip lives inside `#tded`, which
  is on that list, so its `click` survives.
- Rush's own level clock (`rush.levelDuration()`) would have fired a level-up
  mid-authored-level. It is parked at 1e9 while `customLevel` is set.

**Gates.** `scripts/level-check.mjs` (bare node, reads enemy names out of
`enemy.js`'s source) and `scripts/editor-smoke.sh` (Playwright, touch-emulated
phone: tap → spawn under the tap; save/load; export/import; play from 0.5s →
the body stands within a body-width of the tap, on time; the run ends on the
level's clock and reports back).

**Not built, and why:** per-spawn `speedMult`/`elite` editing in the UI (the
format carries them; import sets them — the palette wanted proving first);
translations (a tool, like the enemy tester); shapes (§7 P1) and moving
shapes (§7 P3, still gated on §2.4).
