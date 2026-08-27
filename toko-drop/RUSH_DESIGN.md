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

### 1.4 Lives — shipped but not wired

`TUNING.rush.lives` (`start: 3, extraEvery: 25000`) and `rush.lives` /
`rush.checkExtraLife()` exist, award "EXTRA MAN!" on score thresholds, and
show a life count in the HUD. **Nothing spends one.** `rush.loseLife()` is
defined (`main.js:3475-3481`) and never called; a hit while
`player.alive` stays true breaks the chain and levels down
(`main.js:3509`), but the transition from "hit" to "run over" is governed
entirely by `player.hp` (`MAX_HP = 3`, `player.js:10`) hitting zero — at
which point the run ends regardless of how many Rush lives are banked. **A
Rush run currently survives exactly 3 hits, full stop; the life counter is
cosmetic.** Filed as a queue item (§6) — this is a shipped-code gap, not a
design disagreement, and belongs in code review before the tier system in §3
leans on "lives" meaning anything.

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
punitive grade on a first run teaches nothing. **Open question, unverified:**
whether `getEnemySchedule()`'s actual spawn density at high `rush.level` can
even *supply* an S-tier kill rate. Godot's tier doc found its own director
had a hard supply ceiling below B tier until spawn telegraphs were made to
pipeline (§5 there). This build's schedule was tuned for the base game's wave
pacing, not Rush's roster; verify before trusting the S/A rows past level 3
or so. Filed as a queue item (§6).

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
| lives | not designed (n/a — the clock ends the run) | designed, HUD-visible, **not wired to anything** (§1.4) |
| spawn model | edge-ring telegraphed, never built | reuses the base game's `getEnemySchedule()`, unverified at Rush pacing |
| grading unit | whole-run final letter | per-level stamped ladder (§3.3) |

---

## 5. Open questions

1. Wire `rush.lives` to something, or cut the HUD element and the
   `checkExtraLife()` machinery — right now it lies to the player. Not a
   design question, a code-review one; §1.4.
2. Does `getEnemySchedule()` actually supply an S-tier kill rate at `rush.level`
   4+, or does it hit the same pipelining problem Godot's spawn director did?
   Needs a played (or scripted) sample, not a read of the code.
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
