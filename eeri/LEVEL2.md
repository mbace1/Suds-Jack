# EERI — LEVEL 2: THE SCAFFOLD

> The worked example. Every level in this game is cut from this shape, so
> this file documents **one level completely** — what it teaches, where every
> object sits and why, what the build learned, and where the owner's
> experience analysis (2026-08, `EERI_experience_analysis1.md`) says it still
> falls short.
>
> Canon order stays: `PHASING.md` → `DESIGN.md` → `ART_BRIEF.md` →
> `assets/README.md` → `VERSIONS.md`. This file adds nothing to them; it is
> them, applied to one room.
>
> Source: `js/rooms.js`, `ROOMS[1]`. Every number below is **read out of the
> compiler**, not recalled — regenerate with the snippet in §8.

---

## 1. What it is

| | |
|---|---|
| **name** | `LEVEL 2 — THE SCAFFOLD` |
| **idea** | **the climb** — one verb, and the room is built around nothing else |
| **world** | 1 (Groundworks), level 2 of 3 — so it ends in the **small flag**, not the gate |
| **span** | spawn `x=4.5` → finish `x=93` (flag) |
| **bolts** | **100** (the HUD's `x/100` is the level's completion figure) |
| **golden** | **3**, hidden |
| **checkpoint** | `x=46` — 48% through, inside the 30–70% window the rule demands |
| **machine** | excavator at `x=52`, track `44…57`, verbs `dig` + `span`, arm 2.6 |
| **learned run** | **30.2 s** — `run 14.3 · climbs 4.4 · smalls 4.2 · obstacles 1.8 · ride 5.5` |
| **on foot** | **82%** — DESIGN §1 asks for 80%, and this is the room that proves the ratio |

**Why the climb gets its own level.** DESIGN §4: *one idea per level, and a
level that introduces two ideas is two levels.* Level 1 teaches the stomp.
Level 2 teaches the climb and **re-teaches nothing** — the hopper and the
roller are simply *there*, underneath, as things you already know. That is
the entire reason the room can afford four ladders.

**The constraint that shapes it.** DESIGN §4.2: *levels may go up, but
always come back down* — a level ends on the ground it started on, so the
camera never leaves its band for long. Every ladder here is answered by a
way down.

---

## 2. The four beats, object by object

The beats are marked in the source because **the marks are the only thing
that stops beat 2 quietly becoming another beat 1.**

### Beat 1 · INTRODUCE — `x 12–18`

```
scaffold(12, 18, 7)     → ladder at x=12 (cy 4→7), deck x=13…18 at cy 7
boltCol(12, 5, 8)       → bolts UP the rungs
boltRun(5, 13, 18) · boltRun(9, 13, 18)
```

One ladder, one deck, **nothing underneath it**. No hazard, no hole, no
enemy. The bolts run *up the rungs*, so the first climb is a thing you do
for a reward rather than a thing you are told about — the level teaches by
placement, which is the whole method.

This is the beat the experience analysis defends: teach through layout, not
text.

### Beat 2 · VARY — `x 20–32`

```
pit(20, 22)             → 3 wide  (REACH.gap = 3; jumpAcross 4.85 → 1.85 slack)
boltArc(5, 19, 23, 2) · boltArc(6, 19, 23, 2)   → the arc IS the jump's timing
hazard(24, 'steam')
scaffold(26, 32, 9)     → ladder x=26 (cy 4→9), deck x=27…32 at cy 9
boltCol(26, 5, 10)
golden(12, [30])        → above the deck: a jump off it, not a walk along it
```

Same idea, harder: **a hole under the approach and a taller climb** (5 rungs
against 3). Two answers are deliberately both correct — the deck is a way
over the hole, and the hole is only 3 wide, so the jump is also a way over
the hole. A level that permits two solutions to the same obstacle is being
generous on purpose.

The **bolt arc** is the breadcrumb that teaches a jump instead of
explaining it: follow the bolts and the timing is already right.

> **Authoring note.** The steam vent at `x=24` is written under the beat-3
> comment in the source but sits physically between beat 2's pit and its
> scaffold. The comment grouping is looser than the geometry. Harmless, but
> if the beats are ever machine-checked, this is the line that will trip it.

### Beat 3 · COMBINE — `x 30–48`

```
hopper(30, 33)          → ground level, under/past the tall deck
roller(35, 41)          → 6 wide; too flat to stomp, so you jump it
scaffold(43, 48, 6)     → ladder x=43 (cy 4→6), deck x=44…48
checkpoint(46)
```

**What is already known, underneath what is new.** A roller trundles the
floor you would have walked, and the deck you just learned to climb passes
over the top of it. The new verb is not tested against a new threat — it is
tested against the old ones, which is what "combine" means.

The **roller is the one you do not land on**: landing bounces you off
*without* killing it. That is the game saying *this one you jump* in the
only language it has.

### Beat 4 · THE RIDE — `x 48–65`

```
girderStack(48)
machine('excavator', 52, [44, 57])
chasm(58, 65)           → 8 wide — machine-shaped, no jump reaches it
boltRun(5, 59, 64)      → only over the span
golden(7, [62])
```

The peak, and it sits at **60–68% of the room** — `check()` refuses a ride
whose payoff lands in the first 45%, because a ride that opens a level is a
level whose peak is its first minute.

The gap is past **both** of them: no jump crosses 8 tiles, and the machine
refuses a cliff. The only way over is a girder the machine carries there and
lowers in. The compiler derives the whole job from two parts sitting near
each other:

```
girder: stackX 48 · gap 58…65 at cy 3 · seat window x 53.6…57.3 · spanLen 9.8
```

**The fetch is the job here, and that is why it is allowed.** DESIGN §8.0
retired the lock-and-key shape — walk past the machine, hit a wall, walk
*back* — and `check()` now refuses a machine parked more than 8 tiles behind
its job. This room's excavator sits 6 tiles before the chasm. Going to the
stack is not a walk-back; it is the work.

### The way down, and the end — `x 70–93`

```
scaffold(70, 75, 6) · boltCol(70, 5, 7) · golden(9, [73])
hopper(78, 84)
flagAt(93)
```

Down the far side, one last known thing, and the flag — which **builds
itself in three phases** on the approach and **activates by being run
past**. No button, no stopping: a six-year-old at a sprint should not have
to stop and press something to finish a level.

---

## 3. The skills, stated as a ladder

| level | verb it adds | what it assumes you already have |
|---|---|---|
| 1 | **stomp** | run, jump |
| **2** | **climb** | run, jump, stomp |
| 3 | *(none — both, plus the crane)* | all of the above |

Level 3 adds **no new verb** on purpose: DESIGN §4.2 makes level 3 of a
world the big one, and "big" means *both of the old ones at once*, not a
third thing to learn.

**What the climb actually contracts to** (`kid.js`, `level.js`):

- A rung is **not solid in any direction.** You walk through it, fall
  through it, and only the verb holds you on it. *A solid ladder is a wall
  with a picture of a ladder on it.*
- The climb **tops out with his feet on the deck**, never a rung above it in
  the air.
- **Holding a direction steps him off.** Without that, the top of a ladder is
  a place you can only leave by jumping — a trap with rungs.
- A jump lets go, and it is a real jump.

---

## 4. The rules this room is proved against

`node eeri/test/rooms.mjs` — the room passes **clean**, with no problems
reported. The rules that actually bite on this room:

| rule | what it checks here |
|---|---|
| ladder foot + landing | all four ladders have something to stand on under them and a deck tile beside the top rung |
| gap ≤ `REACH.gap` (3) | the pit at 20 is exactly 3; the chasm at 58 is 8 and therefore *must* declare `clears: 'span'` |
| slack ≥ 0.6 tiles | the 3-wide pit leaves **1.85** — DESIGN §4.1's "full tile of slack", met |
| ride in the back half | payoff at `x=58` = 60% of the room ✓ |
| machine lead ≤ 8 | excavator at 52, job at 58 → lead 6 ✓ |
| machine track unbroken | track `44…57` contains no hole ✓ |
| nothing ride-ending in the machine's run | the steam vent is at 24, far outside `52…58` ✓ |
| checkpoint 30–70% | `x=46` → 48% ✓ |
| finish past everything | flag at 93, last obstacle ends at 65 ✓ |
| exactly 100 bolts / 3 golden | ✓ |
| every bolt reachable | judged against the map **after** the ride — or the 6 bolts over the span read as unreachable |
| golden not collectable by walking | all three are ≥ 2 tiles off the floor |
| robot patrols real floor | no robot crosses either hole |

**The standing instruction:** if a rule is wrong, change the rule in
`parts.js`. Never work around it in a room.

---

## 5. What building it taught

Harvested from `VERSIONS.md` v12–v15. These generalise past this room.

**A hazard placed by feel lands on the beat that needs stillness.** A steam
vent originally sat at `x=56` — *inside the girder's seating window* — so the
one place the ride asks you to stop was the one place something threw you out
of the cab. It is at 24 now. Its sibling: a hopper parked on the machine's
staging ground meant the one place you must stand still to board was a place
something was hitting you.

**Anything that adds to the player's reach must be added to the reach
model.** The model was written when a jump was the only way to gain height,
so the gizmo lab reported its own bolts unreachable. *A check that refuses
correct rooms is worse than no check.*

**A rise the player did not ask for is not the game's to cut.** Variable jump
height was clamping every upward velocity, so the tarp measured 2.47 tiles
instead of 5.1 and the stomp's bounce silently depended on the jump button
being held.

**A room with no machine crashed the game.** `exc` was read unguarded through
the whole foot branch. A throw inside `setAnimationLoop` is total and silent.

**A room change is not finished when the index flips.** `site()` flips on
assignment while `goSite()` still has to place the kid, so anything
positioning him must wait on `transitioning()`.

**One `?v=` token per module** — four occurrences now. Two tokens means the
browser instantiates the module twice and its state splits.

**New, this session: a debug constant in shipping code outlives the
debugging session.** See §6.

---

## 6. The bug this level was hiding

`js/kid.js`'s fall handler read:

```js
if (this.y < 0.9) { this.x = 43; this.y = 5; ... }
```

`x = 43` is a **Level 2 coordinate** — it sits just at this room's third
ladder — that had leaked out of a debugging session into shipping code. The
effect was global: *every* fall in *every* level teleported Eeri to x=43,
bypassing `level.fallRespawn()`, which already existed and already did the
right thing (the near lip of whichever hole took you, else the last
checkpoint).

It is now:

```js
const r = this.level.fallRespawn(this.x);
this.x = r.x; this.y = r.y; this.vx = 0; this.vy = 0;
```

**How it surfaced.** The playthrough gate — not the room prover, which
cannot see it, and not a human, who would read it as "the game put me
somewhere odd". The bot stalled at `x=44` on this level for its full
five-minute budget, six times. It is exactly the case the playthrough gate
was built for: `rooms.mjs` proves a level is *reachable*, `playthrough.cjs`
proves it is *playable*.

The owner's experience analysis independently filed the same bug as **P0**.

---

## 7. Where this level still falls short

From the owner's experience analysis, the parts that land on this room:

**The repetition risk is real here.** The analysis names the loop —
*run right → follow bolts → bounce → run right* — and this level's middle
stretch (`x 30–48`) is where it is most exposed, because the hopper, the
roller and the third scaffold arrive in a row with nothing reacting between
them. The ask is an environmental or character response **every 3–5
seconds**: a cardboard flap moving, a bot noticing Eeri, the crane passing
behind, a tarp bending. The level has two authored camera shots
(`x 16–26` and `x 42–72`) and no authored *events*.

**The learned run is 30.2 s against a design target of ~40.** DESIGN §4 sets
60–90 s first time and ~40 once learned. The estimate passes its gate (which
only asks for 20–120) but sits under the design's own figure — so this level
is at the short end, and the fix is density of *incident*, not more tiles.

**The stomp contradiction reaches into this level.** The analysis calls it
P1: the bounce is 0.8 × jump, deliberately *under* jump height, while the
level design presents stomping as the signature reward. The owner wants
**115–135%**. That is a reversal of DESIGN §0.2, and it is not a one-line
change — the bounce was set below jump height precisely so an enemy standing
under a ledge could not open a route the room prover does not model. Raising
it means **the reach model has to learn the stomp**, and every room needs
re-proving. This level has three stompable hoppers.

**Instructional text.** The analysis asks for less of it, and specifically
none beside the excavator. This room's ride currently leans on the hint
line (`HOLD ▼ SLING THE GIRDER ON`, `CARRY IT TO THE GAP`,
`HOLD ▼ LOWER THE SPAN IN`) — three written prompts for one ride.

---

## 8. Regenerating every number in this file

```bash
node -e "
import('./eeri/js/rooms.js').then(async (m) => {
  const p = await import('./eeri/js/parts.js');
  const room = m.ROOMS[1], r = p.compile(room);
  console.log(JSON.stringify({
    name: r.name, idea: r.idea,
    bolts: r.bolts.length, golden: r.golden.length,
    ladders: r.ladders, pits: r.pits, robots: r.robots,
    hazards: r.hazards, machines: r.machines,
    checkpoint: r.checkpoint, flag: r.flag, girder: r.girder,
    obstacles: r.obstacles.map(o => ({at:o.at, kind:o.kind, size:o.size, clears:o.clears})),
  }, null, 2));
  console.log(p.estimate(room));
  console.log(p.check(room).problems);
});
"
```

And the four gates, all of which must be green before this level ships:

```
node eeri/test/rooms.mjs                                 # geometry
NODE_PATH=$(npm root -g) node eeri/test/smoke.cjs        # the game
NODE_PATH=$(npm root -g) node eeri/test/playthrough.cjs  # a bot finishes it
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs         # the cabinet
```
