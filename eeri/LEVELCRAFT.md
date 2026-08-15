# EERI — LEVELCRAFT: how to author a level here

> **The file that did not exist.** `DESIGN.md` says what the game *does*.
> `VERSIONS.md` says what *shipped*. `LEVEL2.md` is one level worked through
> completely. None of them says **how to build a new one, and what this
> project has already learned about doing it** — so that is this file, and
> it is all harvested from work that actually happened rather than opinion.
>
> **`LEVEL2.md` is the worked example.** Read it beside this. It walks
> `LEVEL 2 — THE SCAFFOLD` beat by beat with real coordinates, and it is the
> template every other level is cut from. Nothing here repeats it.
>
> Canon order is unchanged: `PHASING.md` → `DESIGN.md` → `ART_BRIEF.md` →
> `assets/README.md`. Nothing here overrides them.

---

## 1. The skill ladder

**One verb per level.** DESIGN §4: *a level that introduces two ideas is two
levels.* The ladder is the game's spine, and it is what stops level 7 being
level 3 with different scenery.

| level | teaches | assumes |
|---|---|---|
| 1-1 | **stomp** | run, jump |
| 1-2 | **climb** | + stomp |
| 1-3 | *(nothing new)* — both, and the crane | + climb |
| 2-1 | **wade** — water as a floor you sink in | all of world 1 |
| 2-2 | **pipe** — a tube you go inside | + wade |
| 2-3 | *(nothing new)* — both, and the hoist | + pipe |

**Level 3 of a world adds no verb.** DESIGN §4.2 makes it the big one, and
"big" means *both of the old ones at once*, not a third thing to learn on
the level where you are already being tested.

**A new verb needs three things before it can carry a level**, and skipping
any one of them is how a level becomes unprovable:

1. **A tile or an entity** — and know which. Everything solid in this game is
   a tile. A thing that MOVES cannot be one (see §4).
2. **A `check()` rule in `parts.js`** for the way it goes wrong.
3. **An entry in the reach model**, if it changes where the player can get
   to. See §3, trap 2 — this one has bitten.

---

## 2. The four beats

The Nintendo pattern, and the beats are **marked in the source** because the
marks are the only thing that stops beat 2 quietly becoming another beat 1.

1. **Introduce** — the new thing alone and safe. Nothing else on screen. It
   costs you nothing to meet it.
2. **Vary** — the same idea, different spacing. Harder, still only one idea.
3. **Combine** — the new thing against something you already know. Never
   against a second new thing.
4. **Test** — once, at the peak. **The ride sits here**, in the back half;
   `check()` refuses a ride whose payoff lands in the first 45%, because a
   ride that opens a level is a level whose peak is its first minute.

`LEVEL2.md` §2 shows all four with coordinates.

**Two authoring habits worth copying from it:**

- **Teach a jump with a bolt arc, not a hazard.** `boltArc()` draws the
  trajectory; following the bolts *is* the timing. Nothing has to be
  explained.
- **Let two answers be correct.** Level 2's beat 2 puts a 3-wide hole under
  a deck: the deck is a way over it and so is the jump. A level that permits
  two solutions to one obstacle is being generous on purpose.

---

## 3. The traps, generalised

Every one of these cost real time. They are in `VERSIONS.md` in full; these
are the versions that transfer to whatever you are building next.

**A hazard placed by feel lands on the beat that needs stillness.** A steam
vent once sat inside the girder's seating window — the one place the ride
asks you to stop was the one place something threw you out of the cab. Its
sibling: a hopper on the machine's staging ground, so the one place you must
stand still to board was a place something was hitting you. *Before placing
a hazard, ask what the player is doing at that x.*

**Anything that adds to the player's reach must be added to the reach
model.** The model was written when a jump was the only way to gain height,
so the gizmo lab reported its own bolts unreachable the day the tarp landed.
`parts.js` carries the warning in a comment. **A check that refuses correct
rooms is worse than no check** — it trains you to ignore it.

**A rise the player did not ask for is not the game's to cut.** Variable
jump height was clamping *every* upward velocity, so the tarp measured 2.47
tiles instead of 5.1 and the stomp's bounce silently depended on whether the
jump button happened to be held.

**A debug constant in shipping code outlives the debugging session.**
`Player.update`'s fall handler carried `x = 43` — a Level 2 coordinate — so
every fall in every level teleported the kid there, bypassing the
`fallRespawn()` that already existed and already did the right thing. It
survived four version bumps and a deploy.

**One `?v=` token per module.** Two tokens means the browser instantiates it
twice and its state splits. This project has hit it four times; `smoke.cjs`
checks it now.

**`TILES` in `parts.js` is declarative only — nothing imports it.** The four
string constants (`SOLID_CHARS`, `BELT_CHARS`, `TARP_CHAR`, `CLIMB_CHAR`)
are the real contract, so `TILES` can silently disagree with them. Adding a
tile means adding to both.

**A silent default is worse than a crash.** `MACHINE_REACH[type]` throws on
an unknown machine — good, loud. But `MACHINE_SPEED[type]` falls back to
`|| 3`, and `rideTime()`'s if/else has no `else`, so a new ride verb leaves
`work = 0` and `estimate()` quietly under-counts. Prefer the throw.

**A tireless bot beats levels a child would put down.** That is why the
playthrough gate measures **COST** — how often the level took the ride away
— and not merely completion.

**Two browser gates in parallel starve each other** on a software renderer
and fail on movement timings that look exactly like real regressions. Run
them one at a time.

---

## 4. The tile line, and where it stops

**Every solid in this game is a tile.** That is why the gizmo kit was cheap:
a belt is a floor that moves you, a tarp is a floor that throws you. Both
stamp like any other part, and the whole behaviour is one hook in the
player's step.

**A moving platform cannot be a tile.** Tile meshes are built once per
`Level`, and collision is a grid lookup — there is nowhere for a floor that
moves to live. It needs an entity with its own collision pass, and the
player needs to be told it is standing on something, which `Player` has no
concept of today. The kit stopped at that line **deliberately**.

So, when adding a thing:

| the thing | build it as |
|---|---|
| a floor that changes your speed or throws you | **a tile char** — cheap, follow the belt |
| a hazard, an enemy, a prop with state | **an entity** — follow `robots.js` |
| a floor that MOVES | **an entity + a platform pass in `Player`** — the expensive one |

An entity follows `robots.js` exactly: `constructor(scene, level, def)`
adding its own meshes to the passed group, `update(dt, reduced)` writing
`group.position`, and loose-scalar predicates. **Everything must live inside
that group**, or it leaks when the level changes.

---

## 5. The rules that are code, not prose

`check()` in `js/parts.js` refuses all of the following, and
`node eeri/test/rooms.mjs` is where it fails. This is the author's
checklist — but you do not have to remember it, which is the point.

- a ladder with no landing, or no foot
- a level with no midway checkpoint, or one outside 30–70%
- a ride whose payoff sits in the first 45% of the room
- a machine parked more than a short drive behind its job, or past it
- a ride-ending hazard inside a machine's run to its job
- a flag before the last obstacle
- a bolt count that is not exactly 100, or golden bolts that are not exactly 3
- a golden bolt you would collect by walking
- a bolt nothing can reach — judged against the map **after** the ride has
  done its work, or every bolt the ride opens up reads as unreachable
- a robot patrolling a deck that is not there, or across a hole
- a telegraph under the 1.0 s floor
- a belt that walks you off an edge
- a tarp that throws you into a ceiling
- a gap or step with under 0.6 tiles of slack

**If a rule is wrong, change the rule in `parts.js`. Never work around it in
a room.** A room that dodges a rule is a room the next person cannot trust.

**Adding a rule?** It needs a room broken on purpose in `test/rooms.mjs`.
The pattern is `bites(name, room, expect)`, which matches a **lower-cased
substring of the problem message** — so give each new rule a distinctive
phrase. Use the `furniture()` / `hundred` fillers so a bad room breaks
exactly one rule and the failure names the thing you meant.

---

## 6. The gates, and what each one cannot see

```
node eeri/test/rooms.mjs                                 # geometry
NODE_PATH=$(npm root -g) node eeri/test/smoke.cjs        # the game
NODE_PATH=$(npm root -g) node eeri/test/playthrough.cjs  # playability + COST
NODE_PATH=$(npm root -g) node eeri/test/dev-menu.mjs     # the dev pack
NODE_PATH=$(npm root -g) node eeri/test/fx-smoke.mjs     # the FX pack
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs         # the cabinet
```

| gate | proves | **cannot see** |
|---|---|---|
| `rooms.mjs` | a room's geometry against the reach budget | whether it is *playable*; anything about a fall, a frame, or feel |
| `smoke.cjs` | it boots, the verbs work, the asset seam holds | whether a level is finishable |
| `playthrough.cjs` | a bot finishes every level, and what it COST | whether a child would enjoy it |
| `hub-smoke.cjs` | the cabinet on the arcade page | anything inside the game |

**`playthrough.cjs` exists because `rooms.mjs` passed a level nobody could
finish.** That is the whole argument for having both: a proof about geometry
cannot see a wrecking ball standing on the machine's only route to its job,
and it cannot see a fall handler sending you to the wrong place. Both of
those shipped.

**What no gate can see is whether it is fun.** That is Gate A in
`PHASING.md`, and it is an owner judgement: *a stranger plays levels 1–3
with the rides deleted and still calls it fun.*

---

## 7. Before you start, and before you finish

**Before:**

```
git fetch origin main gh-pages     # and diff both
```

This project has produced **four** lineages. Two were discovered only after
the fact, and **version numbers did not detect either** — two trees
independently reached "v11", then "v12", "v14" and "v15". `main` is the only
place to author; `gh-pages` is a deploy target.

Then read the other lane's `VERSIONS.md` before writing a heading, and
**never reuse a number**.

**After:**

- all gates green, run **singly**
- a `VERSIONS.md` entry — decimal (`vMAJOR.MINOR`) since v15
- `node scripts/versions.mjs` to regenerate `hub/versions.json` — do not
  hand-edit it
- one `?v=` token per module, everywhere it is imported
- say in the commit message if you touched a **SHARED** file
  (`main.js`, `palette.js`, `assets/manifest.json`, `index.html`)

## 8. Lanes

Two agents editing one module is how two lineages start.

| lane | owns |
|---|---|
| **Design/Level** | `js/rooms.js`, `js/parts.js`, `js/level.js`, `js/kid.js`, `js/input.js`, `js/robots.js`, `js/flag.js`, `test/**`, `DESIGN.md` |
| **Art** | `assets/**`, `art-src/**`, `js/craft.js`, `js/layers.js` paintings, `PAL` colour values, `ASSET_PLAN.md` |
| **SHARED — coordinate first** | `js/main.js`, `js/assets.js`, `js/palette.js` structure, `assets/manifest.json`, `index.html` |
