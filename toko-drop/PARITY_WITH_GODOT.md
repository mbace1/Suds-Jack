# Parity notes — this build ↔ the Godot port

A two-way ledger between **this build** (`toko-drop/`, the lead) and the
**Godot port** (`mbace1/toko-drop-godot`). It is notes, not a request: the
decisions in section 1 are the owner's, and nothing should be built from this
file without one.

Opened from the Godot side on **2026-08-27** against v225; updated
**2026-08-28** against v231. **Re-audited 2026-09-06 against v240 and the
port's `master` (`07053e7`, past Q-039)** — this pass ran the gates rather
than reading the code, and every one of the three items §1 had open has since
been closed by an owner decision.

## The rule this is measured against

Owner direction, 2026-08-27:

> "We should aim the push of graphics and physics on Godot. Otherwise follow
> the lead of the JS version."

- **This build leads on gameplay.** New modes, verbs, content are designed,
  played and proved here first.
- **The Godot port follows on gameplay**, and pushes on **graphics and
  physics** — the part a browser build cannot do.
- **A feature is never designed twice.**

So the useful question for this file is not "do the two match" — they should
not, on presentation — but **"is any gameplay living in the wrong repo?"**

---

## 0. Measured parity, 2026-09-06 (v240 ↔ `07053e7`)

Run, not read. The cross-build gate plays the SAME level file in both engines
and diffs every body's type, second and position:

| gate | result |
|---|---|
| `level-parity.mjs first-light` | **46/46** |
| `level-parity.mjs three-rings` | **34/34** |
| port `tests/smoke.gd` | PASS |
| port `tests/arena_check.gd` | 8,396/8,396 |
| port boot sanity (`main.tscn --quit-after 120`) | 0 script errors |

Both level files were re-synced from the deployed tree first
(`tools/sync-levels.sh` → `origin/gh-pages` `aa786040`), so this is the live
format against the live port.

Number-for-number spot checks, both directions:

- **Rush tiers** — `TUNING.rush.tiers` S 2.0 / A 1.4 / B 0.9 / C 0.5 ≡
  `RushRules.TIERS`. Identical.
- **Rush abilities** — all four, every number: HEAT EXCHANGE 8 s / minHeat
  0.15 / radius 3 + 5·heat · HYPER BOMB 22 s / radius 10 · OVERCHARGE 16 s /
  4 s · QUANTUM SHIELD 18 s / 3 s. Identical. (`reflectRadius: 0.9` is a
  browser-side collision detail with no port counterpart — not a divergence.)

---

## 1. Gameplay that exists ONLY in the Godot port

**All three entries here are now CLOSED.** Kept, struck through, because a
closed loop visible in one place is the point of this file.

### 1a. CHALLENGES — ~~a ten-level campaign~~ **Dropped, 2026-08-28 (Q-028)**

Shelved on both sides by the owner. The design doc stays as a record. Note
for whoever reopens it: **the level format (§3) is now the delivery mechanism
CHALLENGES needed** — `LEVEL_EDITOR_DESIGN.md` §6 flagged that an editor plus
a format *is* that mechanism, and said the two should be decided together
rather than one arriving through the back door. The editor shipped (v237);
CHALLENGES is still dropped. That is a decision waiting, not a gap.

### 1b. RUSH abilities — ~~still open~~ **CLOSED: ported here, v232**

Owner's call, 2026-08-28: port them upstream. v232 did, stating outright that
*"this build leads on gameplay, so this is now the reference version, not a
copy."* v234 then found and fixed a real bug in that port — the abilities
were firing themselves off the boost button's `onDash`, which is not an
unclaimed input — and gave them a dedicated bind (Q / pad X-LB / lower-left
pad). **Verified identical number for number today** (§0). The port has
since reconciled its own values to these.

### 1c. RUSH lives — ~~a NEW divergence~~ **CLOSED as a DECIDED divergence (Q-029)**

Owner, 2026-09-04: *"rush lives is 3."* The port keeps its live counter at
`LIVES_START := 3`, pinned by its own smoke; this build's v226 removal (Rush
running on HP) is deliberately **not** ported. The two builds disagree on
purpose, and both know it. Whether this build ever converges is the owner's,
not a bug to fix.

---

## 2. What the Godot port is missing from HERE

Re-measured 2026-09-06, by grep against the port's `master` — the previous
pass's counts were both wrong.

- **ROGUELIKE: 8 of 20 cards.** Not 12 of 20. The port has 6 of this build's
  16 normal cards (`hp speed firerate dashcd longdash nuke`) and 2 of its 4
  cursed (`x_berserk x_leadfeet`). Missing: `bigbullets pierce magnet shield
  dashboom graze vampire ripple tiredlegs minnow`, plus `x_glasscannon
  x_gambler`. Mode B's bonus gauntlet is still absent too.
- **v228 Arena pass 2** — the floor's reactive terms (swarm mass darkens the
  ground, a kill rings out, pickups mark their own ground;
  `TUNING.arena.massSample/popCount/prizeCount`). Confirmed absent: the port's
  `floor_grid.gdshader` has the v240 shape uniforms but no `u_mass`/`u_pops`/
  `u_prizes`. This is presentation, which is the port's own lane — worth a
  look precisely *because* it is the half the port is supposed to lead on.
- **v229/v230 haptics** — no `Input.vibrate_handheld()` anywhere in the port,
  and no reduce-motion setting. Both look directly portable and neither is a
  gameplay change.
- **v233's Rush-specific onboarding hints** — the port has generic idle
  thumb-hints on the touch sticks (`touch_sticks.gd`, first-timers only) but
  not the timed Rush lesson chain (boost → shield → firing cancels it → heat
  is shared → your ability).
- **v234's RUSH LADDER as a SCREEN.** The port stamps the same ladder data
  (`RushRules.ladder`, one row per level survived) and prints it on the death
  screen — what it lacks is the browsable panel: a tile grid with each level's
  kind icon, best tier and star, and a per-level card naming the exact S/A/B/C
  kill counts and the two ★ goals.
- **v231 press kit** — not a game change; nothing to port.

---

## 3. Confirmed already at parity

- **THE LEVEL FORMAT — the strongest parity claim in this file** (v239 here,
  Q-039 there). One JSON, two engines, and a gate that proves it rather than
  asserting it: the same file played in both, every body's type, second and
  position diffed. 46/46 and 34/34 today. There is no exporter and no
  translation layer — `tools/sync-levels.sh` copies the files out of this
  build's deployed tree verbatim, because a translation layer is how Eeri's
  exporter silently dropped two part types for two versions.
  - **It closed a real fork.** Two sessions built two different "format 1"s
    from the same design sketch on the same day; the port's loader was written
    against the one that never merged. A level this build's editor authored
    was a level the port refused, on its first key. v239 is the union.
  - **A build that lacks a thing refuses the level BY NAME.** The port has no
    CLOSE COMBAT and no authored-Rush wiring, so it refuses `mode: "melee"`
    and `mode: "rush"` with a message that says why. The file is never blamed
    for a build's gap. That rule is the format's, not one build's.
- **THE ARENA AS AN SDF** — v236 here, Q-031 there, and the port's
  `tests/arena_check.gd` is a port of this build's `arena-check.mjs` check for
  check: 8,396 exact comparisons, both green, both falsified before being
  trusted (a 1e-12 nudge on one coordinate fails ~1,536 of them).
- **THE FLOOR DRAWING A LEVEL'S REGION — and here the port LED.** Its Q-037
  shape uniforms predate this build's v240 term. Same design on both:
  `u_shape0..3` / `uShape[4]` as a fixed slot array, union as `min`,
  intersect as `max`, an unused slot as the combine's neutral element,
  branch-free, and the same look constants (edge band 0.45, outside 0.22,
  edge glow 0.55). This is the first time the ledger records the gameplay
  build following the port on anything — presentation is the port's lane, and
  it used it.
- **v224's Rush ruleset** — unchanged, still identical number for number.
- **Rush level as difficulty, both ways** — unchanged.
- **The tier numbers** — re-verified today (§0). Still flagged unvalidated
  against real playtest data on both sides; this build's first playtest owns
  them.
- **The two-goals-not-three correction, found independently on BOTH sides.**
  `levelDown()`/`take_hit()` reset a level's timer on every hit, so reaching
  any stamp already requires a hit-free attempt — UNTOUCHED is true by
  construction. Two implementations, same maths, same conclusion.
  **Still outstanding, and still only a doc**: the port's
  `design/RUSH_TIERS_AND_LEVELS.md` prose still shows the three-leg version
  (3 mentions of UNTOUCHED as of today). Neither build's behaviour depends on
  it; it is a trap for the next reader.

---

## 4. Two things found from the Godot side that may apply here

**Both checked here on 2026-09-06 — neither applies. Closing them.** They sat
"worth a glance" for nine versions, which is longer than the glance took.

1. ~~**A menu row labelled with its own OFF text**~~ — the port's ROGUELIKE
   row once read this build's mode-is-off copy while the mode was on. Checked
   here by walking every `toggleRow()` call in `designer.js` and printing the
   on/off hint each one resolves to: **8 rows, 0 with the pair reversed**
   (SMASH TV, CLOSE COMBAT, announcer, intro voice, test mode, pixel, WEBGPU,
   haptics). The helper reads `on ? onH : offH` from one `paint()`, so the
   only way to get this wrong here is to pass the two arguments swapped, and
   nobody has.
2. ~~**A RISK gate pays two pods, not one**~~ — that was a port-side test
   assumption failing on the seeded 35% roll; behaviour was correct in both
   builds. **No gate in this repo asserts a pod count at all** (`smoke.sh`,
   `cabinets.sh`, `level-smoke.sh`, `editor-smoke.sh`, `level-check.mjs`,
   `arena-check.mjs`), so there is no equivalent assumption to be wrong.

---

## 5. Divergences opened since v231 — recorded, not problems

Each of these is a deliberate split, filed so nobody "fixes" one by accident.

1. **The editor is browser-only, by owner decision (2026-09-04).** The port
   LOADS levels and does not author them. There is no plan for a Godot editor;
   authoring happens on the phone, in `index.html?editor`, and the file
   travels. Do not build a second editor.
2. **An authored RUSH level does not play on the port.** This build plays one
   (`rules.mode: "rush"` — boost, shotgun, HP-as-lives, Rush's own level clock
   parked at 1e9 so the authored clock is the only one running). The port
   refuses it by name, because Rush there is a `Mode` with its own director
   cadence, roster, HUD and level-up clock, and wiring one means DECIDING
   which of those an authored timeline overrides. **This is the largest open
   question between the two builds** and it is a design decision, not a port.
3. **CLOSE COMBAT (v187) does not exist on the port**, so `mode: "melee"` is
   refused there. Not filed as a gap before; filing it now because the format
   made it visible.
4. **The port has no menu row to PLAY a synced level** — `level_id` is
   reached only through `tools/trace.gd` / `capture.gd`. A level plays on the
   iPad today only under a developer's hands. If the point of a shared format
   is that a level authored on the phone is playable on the iPad, this is the
   last mile, and it is small.

---

## 6. How to re-run this audit

Nothing here should be taken on trust; it took about ten minutes to measure.

```bash
# 1. the port reads the DEPLOYED files
cd toko-drop-godot && UPSTREAM=/path/to/Suds-Jack tools/sync-levels.sh

# 2. this build's half of the cross-build trace
cd Suds-Jack && scripts/level-smoke.sh first-light && scripts/level-smoke.sh three-rings

# 3. the diff, in the port
cd toko-drop-godot
GODOT=… node tools/level-parity.mjs first-light /tmp/toko-level/seen-first-light.txt
GODOT=… node tools/level-parity.mjs three-rings /tmp/toko-level/seen-three-rings.txt

# 4. the port's own gates (a FRESH clone needs the import first — it writes
#    the class_name cache that --script needs, or every gate fails to parse)
godot --headless --path . --import
godot --headless --path . --script tests/smoke.gd
godot --headless --path . --script tests/arena_check.gd
godot --headless --path . scenes/main.tscn --quit-after 120   # 0 SCRIPT ERROR = pass
```
