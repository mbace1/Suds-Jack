# EERI — WORLD 2: PIPEWORKS

> **Read `PHASING.md` first**, then `DESIGN.md` §4.2 and §6. This file is
> **World 2's grey box**: what the three levels do, what art they need, and
> the seam contract for each new asset. It adds nothing to canon — it is
> canon *applied* to one world, so the Art and Design/Level lanes can work
> the same brief without meeting.
>
> Status: **grey box, 2026-08-14.** Nothing here is built yet. Phase B
> (PHASING §3) is where it lands, and Phase B does not start until **Gate A**
> is called by the owner.

---

## 0. What World 2 is

DESIGN §4.2 names it: **"Pipes and water hazards"**, two ride machines,
one backdrop set, levels 4–6. That is the whole brief canon gives, so
everything below is this file's proposal and the owner's to overrule.

**The place.** The groundworks got dug in world 1; world 2 is what goes
*into* the hole. A drainage and water-main job: concrete pipe sections
stacked in the yard, a flooded trench nobody has pumped out yet, valves and
standpipes, a settling pond with a duckboard walk across it. Same site,
one job later — which is why it shares a backdrop set with itself and not
with world 1.

**Why water, mechanically.** World 1's floor is either there or it is a
hole. Water gives a **third state of floor**: somewhere you can be that is
neither safe nor fatal. That is the cheapest possible new idea for a
platformer, and it is the one that makes three levels of pipes different
from three levels of dirt.

**The rule water must obey, and it is not negotiable** (DESIGN §4.1):
*Eeri is never hurt, never dies, has no health bar.* So **water does not
drown him.** Deep water is a **respawn**, exactly like a pit — the level
hands him back to the near lip. Shallow water is a **slow**, like wet
cement. Nothing about world 2 introduces a way to lose that world 1 did
not already have.

---

## 1. The one new idea, and how it splits across three levels

**One idea per level** (DESIGN §4) means World 2 spends **three** ideas,
and they have to be three, not one idea three times.

| level | idea | the gizmo that carries it |
|---|---|---|
| **4 — THE WET TRENCH** | **water as a floor you sink in** | shallow water (slow) and deep water (respawn) |
| **5 — THE PIPE RUN** | **the pipe: a tube you go INSIDE** | pipe segments — enter one end, come out the other |
| **6 — THE PUMPHOUSE** | **the hoist**, and both of the above | hoist platform, the world's big one |

Level 6 is the world's level 3, so per DESIGN §4.2 it takes **no new verb**,
carries **the big flag**, and ends in **the gate** — Eeri clocking out.

### 1.1 What is genuinely new code, honestly costed

Two of the three are cheap. One is not, and it should be known before the
level is authored around it.

| thing | cost | why |
|---|---|---|
| **shallow water** | **tile-native, cheap.** A new TILE char, same shape as the belt: a floor that changes your speed. `underfoot()` reads it, `kid.js` scales `RUN`. | a belt already proves the pattern |
| **deep water** | **cheap.** It is a `pit` that is drawn differently — `fallRespawn()` already hands you to the near lip | the whole mechanic exists |
| **the pipe** | **moderate.** A pipe is two doorways and a hidden walk between them. It is not a tile — it is a pair of authored points and a scripted move, closest in shape to the machine mount | new, but bounded |
| **the hoist** | **EXPENSIVE, and it is the one to be careful about.** DESIGN §0.2 and `parts.js` both say it: *every solid in this game is a tile, and a moving platform cannot be one.* A hoist needs an entity with its own collision pass, and the room prover cannot currently model a floor that moves | this is the real Phase B engineering item |

**The recommendation, and the reason:** author levels 4 and 5 first on the
cheap two. If the hoist slips, **level 6 falls back to the pipe + water at
their hardest**, which is a legitimate level-3 (§4 says the big one is
"both of the old ones", not a new one). The hoist should not be allowed to
block a world.

---

## 2. The grey box — three levels, four beats each

Same shape as `js/rooms.js` carries for world 1: 96 tiles wide, ground band
top at `GROUND` = 4, ride at beat 3–4 in the back half, checkpoint between
30% and 70%, 100 bolts, 3 golden, flag past the last obstacle. Every number
below is a **starting position for the prover to argue with**, not a
measurement — `node eeri/test/rooms.mjs` is what settles them.

### LEVEL 4 — THE WET TRENCH
*idea: water is a floor you sink in*

| beat | x | what happens |
|---|---|---|
| — | 4–13 | dry ground, a bolt trail out of the gate. Nothing new yet |
| **1 · introduce** | 15–22 | **one shallow puddle, flat ground, nothing else on screen.** You walk into it and you are slow. That is the entire teaching moment, and it costs nothing — which is the point: the first meeting with a new idea is never also a threat |
| **2 · vary** | 25–38 | shallow water with a **hopper** in it (a known thing, made harder by the new thing — the rhythm you learned in world 1 is the same rhythm, but you arrive at it slower), then a **deep** stretch you must jump, taught by a bolt arc |
| — | ~46 | **checkpoint** |
| **3 · combine** | 48–62 | shallow lead-in → deep gap → a **roller** on the far bank. The slow approach is what makes the jump a decision instead of a reflex |
| **4 · ride** | 66–86 | **the pump rig** (§3.1): board it on the route facing the flooded trench, drive forward 4 tiles, and **pump the water down** — deep becomes shallow becomes floor. The machine changes the map, exactly as the excavator's dig does |
| — | 88–93 | the drained trench floor carries the bolts only the ride opens up. **Small flag** at 93 |

**Golden bolts:** one over the deep stretch (taken mid-jump), one in the
trench that only exists once it is pumped, one up a standpipe off the line.

### LEVEL 5 — THE PIPE RUN
*idea: the pipe — a tube you go inside*

| beat | x | what happens |
|---|---|---|
| **1 · introduce** | 12–20 | **one pipe, on the flat, both mouths visible at once.** You can see where it comes out before you go in. A first pipe you cannot see the end of is a trap |
| **2 · vary** | 24–36 | a pipe that goes **up** — in at ground, out on a deck. Same object, and now it is a ladder that is faster than a ladder. A second one whose far mouth is off-screen, taught by bolts leading into it |
| — | ~44 | **checkpoint** |
| **3 · combine** | 46–64 | pipes over water: the mouth is on the far side of a deep stretch, so the pipe is the way across and the water is what makes it worth using. A **bucket** enemy (§3.3, if built) asleep by a mouth |
| **4 · ride** | 68–88 | **the pipe-layer** (§3.2): a section of main is missing and the trench is open. The machine picks a pipe off the stack and **seats it as a span** — mechanically the excavator's girder job, re-dressed, which is why this ride is nearly free |
| — | 90–93 | **small flag** at 93 |

### LEVEL 6 — THE PUMPHOUSE
*idea: no new verb — both of the above, and the hoist*

| beat | x | what happens |
|---|---|---|
| **1 · introduce (the pairing)** | 14–24 | a pipe that delivers you onto a deck over water — the two ideas meeting, neither of them new |
| **2 · vary** | 26–42 | the settling pond: shallow flats and deep channels read as one surface, told apart by colour. **This is the level's real difficulty and it is a READING test**, which is what §4.1 asks difficulty to be |
| — | ~48 | **checkpoint** |
| **3 · combine** | 50–70 | hoist platforms over the pond (or, if the hoist slipped, a pipe network across it) |
| **4 · ride** | 72–88 | the world's peak. Either ride machine, against the pumphouse itself |
| — | 88–93 | **the BIG flag** at 88 — larger and a different colour — and **the gate** at 92.5. Eeri clocks out and walks through. **This is the only room in world 2 that carries a gate** |

---

## 3. The art queue — what World 2 needs made

Ordered by what blocks a level from being playable at all. Everything here
is the **Art lane's** (`assets/**`, `art-src/**`, `js/craft.js`), and every
entry is a **drop point**: a file at the manifest path, a status flip, a `v`
bump, then `node eeri/test/smoke.cjs`. The game plays on code placeholders
until each arrives — that is the seam working, not a compromise.

**The 80/20 ratio applies here first** (PHASING §0.1): the default answer
for every item below is **Yoshi's Crafted World** — toy diorama, visible
hand-built set, craft materials. Water is **not** a shader and **not**
transparent: it is a **cut sheet of blue-green material** laid into the
trench, with a hard hand-cut edge, the same way felt is the grass lip.
Tropical Freeze's seasoning is one moment in five — the pumphouse
silhouette at level 6, and nothing else.

<<<<<<< HEAD
### 3.1 The backdrop set — `pipeworks_*` (blocks all three levels)

The single biggest item, and the only one that blocks every level equally.
**Same rects and PNG sizes as `groundworks`** — the table in
`assets/README.md` is the contract and `smoke.cjs` measures against it:

| layer | z | world rect | PNG size |
|---|---|---|---|
| `pipeworks_sky_v1.png` | −48 | −60…170 × −6…40 | 4096 × 1380 |
| `pipeworks_skyline_v1.png` | −30 | −30…130 × 0…30 | 4096 × 900 |
| `pipeworks_far_v1.png` | −14 | −20…120 × 0…20 | 4096 × 600 |
| `pipeworks_mid_v1.png` | −6 | −12…110 × 0…14 | 3660 × 420 |
| `pipeworks_near_v1.png` | −2 | −8…104 × 0…8 | 3360 × 240 |
| `pipeworks_fore_v1.png` | +2.2 | −8…104 × −2…14 | 3360 × 480 |
=======
### 3.1 The backdrop set — `pipeworks_*` — **ALREADY PAINTED**

> **Corrected 2026-08-15.** This section used to call the backdrop "the
> single biggest item". It is not an item at all any more: the **art lane
> built it ahead of need and parked it** (art lineage v16, *"world 2's
> backdrop, built ahead of need and parked"*). Five PNGs are on disk now.
>
> Measured against the contract, all five are **painted to size exactly**:

| layer | z | world rect | PNG size | on disk |
|---|---|---|---|---|
| `pipeworks_sky_v1.png` | −48 | −60…170 × −6…40 | 4096 × 1380 | **missing** |
| `pipeworks_skyline_v1.png` | −30 | −30…130 × 0…30 | 4096 × 900 | ✅ 4096×900 |
| `pipeworks_far_v1.png` | −14 | −20…120 × 0…20 | 4096 × 600 | ✅ 4096×600 |
| `pipeworks_mid_v1.png` | −6 | −12…110 × 0…14 | 3660 × 420 | ✅ 3660×420 |
| `pipeworks_near_v1.png` | −2 | −8…104 × 0…8 | 3360 × 240 | ✅ 3360×240 |
| `pipeworks_fore_v1.png` | +2.2 | −8…104 × −2…14 | 3360 × 480 | ✅ 3360×480 |

**What is left is a status flip, not a painting job.** All six entries are
`"placeholder"` in `assets/manifest.json`; flipping the five that exist to
`"live"` and bumping the manifest `v` is the whole of it, and `smoke.cjs`
will measure them on the way in. **That flip is the Art lane's, not
Design/Level's** — `assets/**` and the manifest are theirs.

The one genuine gap is **`sky`**: `groundworks` ships one and `pipeworks`
does not. Also on disk and unaccounted for by any manifest entry:
`f_pipe_v1.png` (256×137), which looks like a foreground pipe prop.

The rest of this section is the brief the five were painted to, kept because
it is still what the `sky` needs and still what a repaint would be judged
against.
>>>>>>> origin/claude/eeri-platformer-levels-dtfh0x

Each layer keeps the **job** `assets/README.md` gives it, re-dressed:

- **`skyline`** — quiet, heavily hazed. A water tower, a treatment works.
  Low internal contrast; crisp blocks here read as *near* and fight the
  playfield.
- **`far`** — structure as distance: pipe gantries, a raised main on
  trestles.
- **`mid`** — the built stage: stacked concrete pipe sections, valve
  housings, hoarding. This is where the world says "pipes" loudest.
- **`near`** — dressing behind the action; may overlap the playfield
  silhouette.
- **`fore`** — **the occluder lane, and every piece is CROPPED off the top
  or bottom of the rect.** A pipe run crossing high, standpipes you pass
  behind, low sweeps of spoil. Dark, near-silhouette, no sky tint. The two
  rules already learned: a big shape at eye level is a blob with the game
  behind it, and a crest below the playfield ground line (y = 4) reads as a
  hole rather than a mound.

**Palette shift, not a repaint.** World 2 is world 1's palette moved wet:
the earth ramp stays, the greens go one step cooler, and a **blue-green
water role** joins `PAL` beside `GREEN`. Machine yellow does not move — it
is the cast's family colour across all four worlds.

### 3.2 The two ride machines (DESIGN §4.2: two per world)

Both follow the **excavator's node contract exactly**, because
`assets.js` checks that contract and the game's mount/ride code reads
those node names and nothing else:

**`pump_v1.glb`** — level 4's, and the world's first.
```
nodes: house · boom · hose · nozzle · seat · step · wheels · beacon
```
- `house` slews · `boom` is the arm the hose runs along · `hose` and
  `nozzle` are what points at the water.
- The **verb is `pump`** (a new entry in `MACHINE_REACH` in `parts.js`,
  Design/Level's edit, not Art's). It lowers a water level the way the
  excavator lowers a bank — a row at a time, so it reads.
- `seat` open and readable from the side at 32 px, **empty** — that is how
  a player tells an unmanned machine from a tamed one.
- `beacon` lit and turning while unmanned, dark once Eeri is aboard.

**`pipelayer_v1.glb`** — level 5's.
```
nodes: house · boom · arm · clamp · seat · step · wheels · beacon
```
- `clamp` is the grab. Its job is the excavator's **span** verb re-dressed,
  so it needs no new game code at all — the cheapest second machine
  available.

**Routing** (PHASING §1): both are **vehicles**, so **sliced nodes, never a
rig** — image-to-3D then `slice.mjs`, exactly as the excavator was done.

### 3.3 Pieces and the hazard kit

| manifest key | file | contracted nodes | notes |
|---|---|---|---|
| `pieces.pipe` | `3d/pipe_v1.glb` | `state0` `state1` `state2` `grip` | stacked → slung → **seated as a span**. Same three-state rule as `girder_v1`: each state is the whole object at that stage, shared origin, and the seated state is **walked on**, so its top is flat and 1 tile deep |
| `pieces.valve` | `3d/valve_v1.glb` | `wheel` `lamp` | level 6 dressing that reads as interactive; `lamp` is lit, so **bare of any material map** |
| `pieces.flagBig` | *(exists)* | — | world 2 reuses the contract; a **different colour again** would be a nice-to-have, not a requirement |

**The pipe you go inside** (level 5's idea) is a **tile-and-marker job, not
a model**: two authored mouth positions plus a scripted move. Art owes it
a **mouth** that reads as enterable at a glance — a dark opening with a
bright rim, unmistakably not scenery. This is the one asset in world 2
where the *silhouette* has to carry a game rule, so it wants a LOOK gate of
its own.

### 3.4 The material palette

`assets/manifest.json`'s `textures` block already carries `card`, `felt`,
`balsa` and `flute`, all greyscale detail maps multiplied onto a palette
colour. World 2 needs **one more**:

| key | file | what it is |
|---|---|---|
| `water` | `2d/water_detail_v1.png` | the cut-sheet water surface — a hand-cut craft material with a visible grain and a hard edge, **not** a transparency and **not** a ripple shader. Multiplied onto the new blue-green palette role like every other map |

Concrete pipe wants **`card`** (it is the ground's own material, and a
concrete pipe is a ground product). The machines stay **`balsa`**, per
ART_TARGET §0.05 and the rule in DESIGN §0.2 — *anything that draws is made
through `js/craft.js`, without exception.*

---

## 4. The Design/Level lane's own list

Not art, and not blocked on art. In order:

1. **The water tile.** A `TILES.water` char + `SOLID_CHARS`/speed handling
   in `level.js` and `kid.js`, mirroring the belt exactly. Then a
   `check()` rule: **deep water needs a lip you can be handed back to**,
   the same demand a pit already answers.
2. **`MACHINE_REACH.pump`** with the `pump` verb, and `RIDE.pump` in the
   cost table so `estimate()` stays honest.
3. **The pipe pair.** Two authored points, a scripted move between them,
   and a `check()` rule that **both mouths must be standable** — a pipe
   that delivers you into a wall is the vertical version of a ladder ending
   in mid-air, which is the exact mistake the parts kit exists to make
   impossible.
4. **The rooms.** Levels 4–6 into `js/rooms.js` on the grey box above, then
   `rooms.mjs` until it stops complaining.
5. **The prover's new rules**, because a rule that is not in `check()`
   drifts: water reachability, pipe mouths, and the pump's track.
6. **`playthrough.cjs` must learn the pipe** — the bot's vocabulary is
   `right/left/jump/down/action/up`, and it has already stalled once on a
   verb it did not know about (the climb). A pipe it cannot enter is the
   same bug waiting.

## 5. What blocks what

```
Gate A (owner's call)
   └── World 2 starts
         ├── pipeworks_* backdrop set ──── blocks levels 4, 5, 6 equally
         ├── water tile (code) ─────────── blocks level 4
         │     └── pump_v1.glb ─────────── blocks level 4's ride
         ├── pipe pair (code) ──────────── blocks level 5
         │     └── pipelayer_v1.glb ────── blocks level 5's ride (cheap: span re-dressed)
         └── hoist (code, EXPENSIVE) ───── blocks level 6's beat 3 ONLY
               └── fallback: pipe + water at their hardest
```

**The one thing to decide before anything is made:** whether the hoist is
in. It is the only expensive item in the world and the only one whose slip
has a fallback. Everything else is a re-dress of machinery this game
already has, which is why World 2 is a cheaper world than World 1 was.

---

## 6. The gates, unchanged

All four, green, before anything deploys:

```
node eeri/test/rooms.mjs                                 # the room prover
NODE_PATH=$(npm root -g) node eeri/test/smoke.cjs        # the game
NODE_PATH=$(npm root -g) node eeri/test/playthrough.cjs  # a bot finishes every level
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs         # the cabinet
```

And the branch rule (CLAUDE.md): **`main` is the only place to author.**
`gh-pages` is a deploy target. Before any World 2 work,
`git fetch origin main gh-pages` and diff both — this project has started
two orphan lineages already, and version numbers do not detect it.
