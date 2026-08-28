# RUSH MODE — Design Reference

**§1–§2 describe shipped code.** Source of truth is `js/tuning.js`
(`TUNING.rush`) and the `rush` ruleset object in `js/main.js` — every number
below is transcribed from there, cited by file:line against the commit that
shipped it (`v224`/`v225`, `VERSIONS.md`). If this doc and the code disagree,
the code wins; file the drift.

**§3–§5 are PROPOSED, not implemented.** Same status Godot's own
`design/RUSH_TIERS_AND_LEVELS.md` carried before this doc existed: the
*model* is the deliverable, not the numbers — first playtest recalibrates the
numbers, not the method. Tracked as queue items in root `QUEUE.md`.

This doc exists because Rush was designed in two places that stopped talking
to each other. It shipped here (`toko-drop/`) in `v224`/`v225` off a decision
recorded in the Godot repo's `RUSH_MODE.md` §3. Separately, that same repo's
`design/RUSH_TIERS_AND_LEVELS.md` and `design/RUSH_MODE_ACCEPTANCE.md`
designed a **different, unshipped** Rush — a draining time-attack clock with
heat-as-score-multiplier — and built a full S/A/B/C grading system on top of
it that was never wired to any code, Godot's or this build's (`QUEUE.md`
items Q-017/Q-018, `repo: toko-drop-godot`, still `Queued`). §3 below ports
*that grading system's method*, not its numbers, onto the mode that actually
shipped. Per the leadership split (root `CLAUDE.md`), that's the right
direction anyway: gameplay is designed here first.

---

## 1. What shipped (`v224`/`v225`)

One rule everything hangs off: **boost is the good option, the gun is the
fallback.** Rush is its own ruleset, not a modifier — ROGUELIKE and DAILY
don't apply inside it (`tuning.js:270-275`).

### 1.1 Boost, shield, heat

- Holding boost moves at **17 u/s** vs. 6 walking (`tuning.js:279`), grants
  **invulnerability**, and **kills on contact**. Player-side: `player.js`'s
  `shielded` getter is `boosting && !firing` — **pulling the trigger cancels
  the shield mid-boost.**
- **Heat is the shared cost** of boosting and shooting (`tuning.js:280-285`):
  - Boost: **+0.55/s** (≈1.8s of continuous boost from cold)
  - Gun: **+0.02/shot** (the gun runs warm, not hot)
  - Idle: **−0.42/s** (≈2.4s to shed a full meter)
  - **Overheat lockout at 1.0** — boost is refused until heat drops to
    **0.35** (hysteresis; no fluttering on the edge). `rush.update()`,
    `main.js:3428-3441`.
- **Shotgun** is the close-range answer when overheated: 5 pellets, 0.5 rad
  spread, fires 3.4× slower (`tuning.js:298`).

### 1.2 Chain and the Cooler

- Every **boost kill** extends a chain (`+1`, cap **100**, `2.5s` window per
  kill — `tuning.js:299`, `rush.boostKill()` `main.js:3467-3470`). The chain
  is a separate meter from heat: it tracks streak of boost kills, not
  resource cost.
- The roster's **YELA_CUBE is the Cooler** (`tuning.js:296`): boost-killing
  one vents **0.22 heat** and can clear an overheat lockout outright
  (`rush.vent()`, `main.js:3459-3464`). It's the mode's only relief valve —
  the roster feeds its own economy instead of just standing in front of it.

### 1.3 The roster (`v225`, `tuning.js:286-297`)

Rush replaces the base game's 21-type ecology with four Blade-Rush-shaped
bodies and nothing else — no shooters, because a gun club would make
standing still the answer, the opposite of the mode:

| code name | Blade Rush role | min level | budget cost | HP |
|---|---|---|---|---|
| GLOBBO | Chomper — plain body, lunges | 1 | 1 | 1 |
| YELA_CUBE | Cooler — kill it, vent heat | 1 | 1 | 2 |
| SPLITTA | Snake — splits into a minnow train | 2 | 3 | 5 |
| SLUDGE_CUBE | Asteroid — slow mass, ploughs a lane | 3 | 2 | 2 |

(HP from `enemy.js:487-494`; budget cost is what the wave director spends per
spawn, not damage.) Boss set pieces are off-roster — a boss beat demotes to
`'spike'` kind under Rush (`main.js:109`). Every furniture system the base
arena has — gates, bounty, vault, escort, vents, drain, foam, curtain, cargo
convoy — is suppressed; Rush is a **bare arena** (`bareArena()`, `main.js:3401`).

### 1.4 Lives — corrected (`v226`, `Q-025`)

**An earlier draft of this section was wrong, and it's worth recording how.**
It read `rush.lives` and `rush.checkExtraLife()` as a revive-pool that was
"fully wired for display but never spent," and Q-025 was opened to either
wire a revive-on-death mechanic or remove the machinery. On inspection,
neither read was right: `checkExtraLife()`'s caller already did
`player.maxHp++; player.hp++` on every 25,000-score threshold
(`main.js:8527-8531`, unchanged by this fix) — **the extra-life mechanic
already worked**, by growing the HP pool directly. The HUD's hit-point dots
already read `player.hp`/`maxHp` (`main.js:4396-4399`), exactly matching the
game's own comment: *"the hp dots are the lives"* (`main.js`, `startGame()`).
Nothing anywhere read `rush.lives` for display — not the HUD, not
`designer.js`, not `lang.js` — and the milestone text on a threshold is
"EXTRA LIFE!", not "EXTRA MAN!" as the earlier draft quoted (that string
belongs to the *base* game's separate `tkNextMan` extra-life system).

So `rush.lives` was a second, purely internal counter tracking the same
event `checkExtraLife()` already handled correctly, incremented alongside the
real grant and decremented by nothing (`loseLife()` was dead code) — inert,
not broken; nothing a player could ever observe. **`v226` removes `rush.lives`
and `loseLife()`.** `nextLife` — the threshold gate `checkExtraLife()`
actually needs — stays. No observable behavior changed.

The lesson for §3 below: don't assume "lives" names a separate bankable pool
just because the field exists. It doesn't. A Rush run's survivability is
governed entirely by `player.hp` (3 dots, `MAX_HP` in `player.js`) growing
slowly via the extra-life threshold — there is no continue/revive concept in
the shipped design at all.

---

## 2. Timed levels

Levels are Rush's difficulty clock, and they run **both directions**:

- **Level duration** (`rush.levelDuration()`, `main.js:3419-3424`,
  `tuning.js:300`): level 1 = **60s**, level 2 = **90s**, level *N≥3* =
  `90 + (N-2)×30` — so level 3 = 120s, level 4 = 150s, and so on,
  open-ended.
- **Level up** happens automatically when the timer elapses
  (`rush.update()`, `main.js:3452-3453`) — no player action required, just
  survival.
- **Level down** happens on any non-fatal hit (`main.js:3509`): the chain
  breaks, the level drops by one, and *that level's own timer resets to
  zero* (`rush.levelDown()`, `main.js:3474`). A level can be revisited many
  times inside one run.
- **The level number *is* the difficulty knob**, both ways: `getWaveScale()`
  and `getEnemySchedule()` read `rush.level` in place of the ordinary wave
  count (`main.js:58, 88, 96`), so dropping a level after a hit measurably
  makes the *next* stretch easier — not just a scoreboard penalty.

This is structurally different from the Godot repo's unshipped design (§3
adapts around the difference rather than hiding it): that doc assumed a
**fixed 180s run** split into three 60s legs on a **draining clock** funded
by kills. What shipped here is an **endless ascending ladder** funded by
survival time, with no overall clock and no upper bound on level number. A
run ends when HP runs out (§1.4), not when a clock does.

---

## 3. S/A/B/C tiers — proposed

### 3.1 Why score can't be the graded number directly

Under Rush, `onKill()`'s score line reduces to (every other multiplier is
suppressed by the bare arena) `main.js:3251-3253`:

```
score += 100 * streak * max(1, chain)
```

`streak` counts consecutive kills since the last hit and is **uncapped**;
`chain` counts consecutive boost kills within its 2.5s window, capped at 100.
Both zero on a hit. That makes an untouched stretch compound roughly
quadratically — order-of-magnitude back-of-envelope, a clean 100-kill
untouched run (`Σ 100·n·min(n,100)` for n=1..100) lands north of **30
million** points, entirely from never taking a hit. A single hit doesn't
just cost a life, it resets the compounding to zero. Godot's own open
question #1 ("are the raw numbers unwieldy?") suspected this shape and
proposed a divisor; here the honest fix is different — **don't grade the
compounding number at all.** Score stays visible and remains the
leaderboard/bragging figure (it already is); tiers grade a *stable* quantity
instead, exactly the way Godot's own species-value table was really a proxy
for throughput, not an end in itself.

### 3.2 The graded quantity: kills per level

Reuse Godot's four reference-skill profiles (`design/RUSH_TIERS_AND_LEVELS.md`
§3) as a starting point — they're generic twin-stick throughput numbers, not
engine-specific, and there's no equivalent JS playtest data yet, so treat
them as **ported and unvalidated**, first playtest owns the real numbers:

| tier | kills/s |
|---|---|
| C | 0.5 |
| B | 0.9 |
| A | 1.4 |
| S | 2.0 |

PAR kill count for a level = `kills/s × level duration` (§2). Because
duration is a known closed form per level, so is the table:

| level | duration | C | B | A | S |
|---|---|---|---|---|---|
| 1 | 60s | 30 | 54 | 84 | 120 |
| 2 | 90s | 45 | 81 | 126 | 180 |
| 3 | 120s | 60 | 108 | 168 | 240 |
| 4 | 150s | 75 | 135 | 210 | 300 |
| *N≥3* | `90+(N-2)·30` | `dur×0.5` | `dur×0.9` | `dur×1.4` | `dur×2.0` |

Below C: no letter, same as Godot's rule and for the same reason — a
punitive grade on a first run teaches nothing.

**Supply sampled, `Q-026`.** Godot's own director had a hard supply ceiling
below B tier until spawn telegraphs were made to pipeline (§5 there) — worth
checking here since `getEnemySchedule()` was tuned for the base game's wave
pacing, not Rush's roster. A standalone replica of the schedule loop against
the real `TUNING` data (40 seeds/level, best-case player who kills the
instant a body lands) gives a supply ceiling of `kills-per-batch ÷ (spawn-drip
duration + the 1.5s wave-clear gap every mode pays, `main.js:9308`)`:

| level | kind | budget | kills/batch | drip | batch | supply k/s | vs S (2.0) | vs A (1.4) |
|---|---|---|---|---|---|---|---|---|
| 1 | normal | 3.0 | 3.4 | 0.48s | 1.98s | 1.71 | short 0.29 | meets |
| 2 | normal | 7.0 | 4.9 | 1.02s | 2.52s | 1.95 | short 0.05 | meets |
| 3 | swarm | 11.0 | 8.8 | 0.55s | 2.05s | 4.28 | meets | meets |
| 4 | spike | 15.0 | 8.6 | 2.16s | 3.66s | 2.34 | meets | meets |
| 5 | normal | 7.0 | 4.6 | 0.90s | 2.40s | 1.93 | short 0.07 | meets |
| 6 | swarm | 19.0 | 15.1 | 1.09s | 2.59s | 5.84 | meets | meets |
| 7 | normal | 10.0 | 5.8 | 1.40s | 2.90s | 2.02 | meets | meets |

Nothing like Godot's finding — the ceiling roughly *tracks* the S-tier PAR
rather than sitting well below it. `'swarm'`/`'spike'`-kind levels clear it
with room; plain `'normal'`-kind levels (the majority — levels 1, 2, 5, and
most levels past 7 that aren't a multiple of 3 or 4) fall short by 0.05–0.3
kills/s, small enough that it reads as "S is a tight ceiling on quiet levels"
rather than "S is unreachable." **Caveats on this number:** it's a spawn-side
ceiling assuming zero travel/positioning time and instant kills — a real
player's number is lower, not higher, so this doesn't prove S is *reachable*,
only that the director isn't the thing stopping it outright the way Godot's
was. It also doesn't model the flat 1.5s `waveGapT` breather having any
Rush-specific tuning — that gap is inherited from the base game's pacing and
was never re-examined for Rush's continuous-pressure design; shortening it
for Rush specifically (not proposed here) is the natural first lever if
playtest shows the `'normal'`-level shortfall actually matters. Re-run
`scripts/rush-supply-sample.mjs` if `TUNING.waves` or `TUNING.rush.pool`
changes — the table above is a snapshot, not a promise.

### 3.3 Live tier and stamps

- **Live tier**: current level's kill count against the PAR table,
  interpolated by elapsed time within the level — the mid-run feedback the
  mode otherwise lacks, shown the same place the heat bar already lives in
  the HUD.
- **A level stamps its tier when it's cleared by the timer** (level-up), and
  the stamp never revises. **A level that ends by level-down (a hit) stamps
  nothing** — it isn't a failed grade, it's an incomplete one, same logic as
  Godot's "no grade without finishing the clock," mapped from "the whole
  run" onto "this one level."
- The run summary shows the **stamped ladder** — one tier per level actually
  cleared — rather than a single terminal grade. Godot's fixed 3-minute run
  had one grade because it had one ending; this mode's levels are open-ended,
  so the ladder *is* the summary. (A single "best sustained tier" or
  "highest level cleared" headline number for the death screen is a UI
  question, not a design one — punt to whoever builds the screen.)

### 3.4 Leg goals, adapted to an open-ended ladder

Godot's three-leg design worked because each of three *fixed* legs got
exactly one goal, chosen to be awkward to farm with the others' behaviour.
Rush has no fixed legs — but it does have levels, so the same idea maps onto
**a goal that cycles by level number mod 3**, and any run long enough to
clear three consecutive levels gets a shot at all three:

| slot | levels | goal | condition |
|---|---|---|---|
| **A** | 1, 4, 7, … | **UNTOUCHED** | finish the level without taking a hit |
| **B** | 2, 5, 8, … | **UNBROKEN** | the boost chain's 2.5s window never lapses — always land the next boost kill in time |
| **C** | 3, 6, 9, … | **NEVER LOCKED** | never trip the overheat lockout (`rush.overheated` stays false the whole level) |

Slot C is a deliberate departure from Godot's literal wording. Godot's "heat"
*was* a score multiplier that decayed over time — "never let it reach zero"
was a continuity goal. This build's `rush.heat` is a **lockout resource**
that rises when you boost or shoot and is *good* at zero; porting "never let
heat reach zero" verbatim would demand the opposite of good play. NEVER
LOCKED keeps the same *shape* of goal (a resource-management axis, distinct
from "got hit" and "kept the chain alive") without inheriting a name that
means the opposite thing here.

**Known overlap, stated rather than hidden:** slot A (UNTOUCHED) and slot B
(UNBROKEN) aren't fully orthogonal here the way Godot's were — any hit zeros
*both* the chain and the hit-streak in this code (`main.js:3509`), so a hit
fails both goals at once if they land in the same stretch. They're still
distinct in the failure case that matters most (a chain can lapse from
*timing*, no hit involved, at any point) — just not as cleanly separated as
Godot's time-decayed heat made them. Worth watching in playtest; the fix, if
it proves to matter, is making slot B's condition purely about window
timeout and explicitly not about hits — which, read literally, it already
is; the overlap is a side effect of a hit *also* zeroing the chain, not the
goal definition being wrong.

**Star:** three consecutive slots (any full A→B→C run of levels, e.g. levels
1–3, or 4–6) all stamped **and** all three goals hit → a **★** against that
cycle. Because the ladder is open-ended, a long run can earn more than one
star — a deliberate extension past Godot's design, which had exactly one
shot at exactly one star per run because it had exactly one leg-cycle.

---

## 4. Explicit divergences from the Godot research

Recorded so nobody "fixes" one of these back toward the Godot doc without
noticing it's a deliberate reconciliation, not an oversight:

| axis | Godot's unshipped design | what shipped here |
|---|---|---|
| run structure | fixed 180s run, drains | endless ladder, funded by survival time |
| heat semantics | score multiplier; decays over time; want it *high* | lockout resource; rises on use; want it *low* |
| kill value | `100 × target max_hp` — species-weighted | flat `100`, scaled only by streak/chain — species-neutral |
| lives | not designed (n/a — the clock ends the run) | no separate "lives" concept; `player.hp` grows via the extra-life threshold (§1.4) |
| spawn model | edge-ring telegraphed, never built | reuses the base game's `getEnemySchedule()`; sampled at `rush.level` 1–7, meets A-tier everywhere, meets S except a small shortfall on plain levels (§3.2) |
| grading unit | whole-run final letter | per-level stamped ladder (§3.3) |

---

## 5. Open questions

1. ~~Wire `rush.lives` to something, or cut it.~~ **Resolved, `Q-025`/`v226`:**
   there was nothing to wire — `checkExtraLife()`'s real effect (growing
   `player.maxHp`/`hp`) already worked; `rush.lives` was dead weight and is
   removed. See §1.4.
2. ~~Does `getEnemySchedule()` actually supply an S-tier kill rate?~~
   **Answered, `Q-026`:** yes, almost everywhere — see §3.2's sampled table.
   The one soft spot (plain `'normal'`-kind levels, ~0.05–0.3 kills/s short of
   S) is worth a playtest read, not a code fix on its own.
3. Should the *reference kill-rates* (§3.2) get their own JS-side playtest
   pass, given the score formula and roster are both different from what
   produced Godot's numbers? Almost certainly yes — they're marked ported,
   not derived, for exactly this reason.
4. Live tier visibility: same open question Godot's doc raised and left open
   — a dropping letter mid-run may read as discouraging to some players.
   Unresolved here too.
5. Does any of this apply to the base (non-Rush) game's wave-based scoring?
   Out of scope for this doc; Godot's tier doc punted the same question for
   Normal mode.

---

## 6. Queue

Tracked as root `QUEUE.md` items: Q-025 (this doc + the lives gap), Q-026
(supply-rate verification), Q-027 (tier/goal implementation once the numbers
above clear a playtest pass). See `QUEUE.md` for status.
