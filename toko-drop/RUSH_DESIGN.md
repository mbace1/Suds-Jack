# RUSH MODE — Design Reference

**§1–§2 describe shipped code.** Source of truth is `js/tuning.js`
(`TUNING.rush`) and the `rush` ruleset object in `js/main.js` — every number
below is transcribed from there, cited by file:line against the commit that
shipped it (`v224`/`v225`, `VERSIONS.md`). If this doc and the code disagree,
the code wins; file the drift.

**§3.2–§3.4 describe shipped code** (`v227`, `Q-027`) — the PAR table, live
tier, stamped ladder, and the two per-level goals are live in `main.js`'s
`rush` object, same sourcing rule as §1–§2. **§3.1's numeric derivation and
§4–§5's open questions are still commentary/analysis**, not code — the tier
*rates* in `TUNING.rush.tiers` are ported from Godot's research and marked
unvalidated regardless of the surrounding logic being shipped: the model is
implemented, the numbers still want a playtest pass. Tracked as queue items
in root `QUEUE.md`.

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

### 3.3 Live tier and stamps — shipped `v227`

- **Live tier** (`rush.liveTier()`): current level's kill count against the
  PAR table, interpolated by elapsed time within the level — the mid-run
  feedback the mode otherwise lacks. Shown top-right in the HUD, under the
  score.
- **A level stamps its tier when it's cleared by the timer** (`rush.levelUp()`,
  before advancing), and the stamp never revises. **A level that ends by
  level-down (a hit) stamps nothing** — it isn't a failed grade, it's an
  incomplete one, same logic as Godot's "no grade without finishing the
  clock," mapped from "the whole run" onto "this one level."
- The death screen shows the **stamped ladder** (`rush.ladder`, `1:B 2:S★ …`)
  rather than a single terminal grade. Godot's fixed 3-minute run had one
  grade because it had one ending; this mode's levels are open-ended, so the
  ladder *is* the summary.

### 3.4 Goals — corrected during implementation, shipped `v227`

**The three-slot proposal below this line, as originally written, doesn't
work — kept for the record, not as the design.** It assumed a goal could be
"UNTOUCHED: finish the level without taking a hit," parallel to Godot's leg
goal of the same name. But `levelDown()` already resets that level's timer to
0 on *every* hit (§2) — which means reaching a level-up stamp **at all**
already requires a completely hit-free attempt. UNTOUCHED wasn't a goal, it
was a tautology: every single stamp in `rush.ladder` satisfies it by
construction, so showing it as an "achievement" would have been showing the
player something that's never false. Building this and only noticing once
`_freshAttempt()` made the reset explicit is the sort of thing worth stating
plainly rather than quietly editing away.

**What shipped instead: two goals, no slots, no 3-level cycle.** Every level
attempt tracks two independent booleans, both true only if never violated for
that attempt's whole duration:

| goal | condition | tripped by |
|---|---|---|
| **`chainUnbroken`** | the boost chain's 2.5s window never lapses | `rush.update()`'s timeout branch — a chain that runs out the clock, not a hit (a hit also zeros the chain, but that ends the attempt via `levelDown()` with no stamp anyway, so it never reaches this check) |
| **`neverLocked`** | never trip the overheat lockout | `heat` reaching 1.0 and `rush.overheated` flipping true |

`neverLocked` replaces Godot's "heat" goal under the same renamed logic as
before: this build's `rush.heat` is a lockout resource that's *good* at zero,
the opposite of Godot's score-multiplier heat that wanted to stay high, so
the goal is phrased for what's actually true here.

**Star: per level, not per 3-level cycle.** A level stamped with both goals
still clean earns a **★** on that rung of the ladder. The 3-slot cycle
(§3.4, original) depended on three genuinely distinct axes to avoid being
farmable together; with only two real axes left, a fixed 3-level grouping
had no remaining rationale — a run-length-independent per-level star fits an
open-ended ladder better than a borrowed fixed-leg structure anyway. A long
run can still earn many stars, same intent as the original "more than one
star per run" extension, just counted per rung instead of per triple.

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
   not derived, for exactly this reason. **First data point (bot, not human):**
   a simple scripted player — boost + charge the nearest body, back off and
   shoot once heat crosses 0.8, resume once it drops to 0.45, no active dodge
   of body contact while backed off — was driven through the real game loop
   (fast-forwarded via a frozen clock, not real time) for ~75s before dying
   to its third hit, landing 3 kills. It **never stamped a single level** —
   consistent with §2's finding that a stamp requires a fully hit-free
   attempt, and suggests that bar is genuinely hard to clear even for a
   patient, non-panicking player, not just a human one. This is one run, one
   crude policy (no real dodging), and not itself evidence the C/B/A/S rates
   are wrong — it's evidence that reaching *any* stamp may be the harder
   design question, separate from which letter you get once you do.

   **Second data point, and the more useful one:** a "smarter" evasion
   policy — flee the weighted center of every live threat (inverse-square
   repulsion, like a flocking separation force) instead of just the single
   nearest enemy, so it can't be baited into fleeing A straight into B — was
   tried next, expecting it to survive longer. It **died faster**: under a
   minute, before v1's own ~75s. Read charitably, this isn't "evasion logic
   doesn't help" — it's that pure repulsion with no wall-awareness can drive
   a bot straight into a corner, where retreat runs out. The honest
   conclusion isn't a fix, it's a stopping point: getting a bot to reliably
   *play well* (real dodging, spacing, wall-awareness) is a different and
   much larger problem than the one being asked here, and disproportionate
   effort for it. Both bot runs agree on the one thing that matters for this
   question — clearing a level is hard — and a real human playtest is the
   right next instrument, not a third bot.
4. **Decided by shipping, `v227`:** live tier is always visible (top-right
   HUD). Godot's doc raised and left open whether a dropping letter mid-run
   reads as discouraging; this build shipped the visible version without
   litigating that further. Revisit if playtest feedback says otherwise.
5. Does any of this apply to the base (non-Rush) game's wave-based scoring?
   Out of scope for this doc; Godot's tier doc punted the same question for
   Normal mode.
6. Now that §3.4's goal count dropped from three to two, is there a genuine
   third axis worth adding later (raw kill-rate already grades the tier;
   `chainUnbroken`/`neverLocked` cover chain-timing and heat-management) — or
   is two the natural number here and a third would just be padding? Not
   pursued for `v227`; worth asking again after real playtest data exists.

---

## 6. Queue

Tracked as root `QUEUE.md` items: Q-025 (the lives correction, landed
`v226`), Q-026 (supply-rate verification, landed), Q-027 (tier/goal/ladder
system, landed `v227`, two goals not three — see §3.4). See `QUEUE.md` for
status.
