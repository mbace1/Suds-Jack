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

**P0 — the rectangle becomes an SDF, and nothing changes.**
Introduce `Arena`, express the current presets as SDFs, migrate the ~31
containment sites and ~31 placement sites. No new shapes, no editor, no visible
difference.
*Gate:* seeded spawn schedules byte-identical to v235 across several seeds ×
modes × waves (the v217 method), plus `smoke.sh` + `cabinets.sh` +
`webgpu-smoke.sh` green. **If the rectangle can't survive being reimplemented,
stop here** — that's the whole risk of §2.1 surfacing early and cheaply.

**P1 — static custom shapes, no editor.**
Hand-written JSON, a loader, floor rendering on both paths, and one authored
level playable end-to-end.
*Gate:* a headless playthrough of the authored level; screenshots of the shape
on classic and TSL, proving parity.

**P2 — the editor UI.** Requirements 2 and 3, on the real renderer, with
play-from-here.
*Gate:* round-trip — author a level, save, reload, play it, and the spawns land
where and when they were placed.

**P3 — moving shapes.** Only after §2.4 is decided.
*Gate:* a level whose common area moves is provably always non-empty and always
has a reachable standing spot, checked headlessly across its duration.

P0 is the honest test of whether this is a two-week feature or a two-month one,
and it's useful on its own even if the editor is never built: an `Arena` object
is a better foundation than 88 references to `HALF_X`.
