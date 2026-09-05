# Parity notes — this build ↔ the Godot port

A two-way ledger between **this build** (`toko-drop/`, the lead) and the
**Godot port** (`mbace1/toko-drop-godot`). It is notes, not a request: the
decisions in section 1 are the owner's, and nothing should be built from this
file without one.

Opened from the Godot side on **2026-08-27** against v225. Updated
**2026-08-28** against **v231** — six versions landed in one day (v226–v231),
which is most of what changed below.

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

## 1. Gameplay that exists ONLY in the Godot port

### 1a. CHALLENGES — ~~a ten-level campaign~~ **Dropped, 2026-08-28 (Q-028)**

Resolved since the last update, by the owner, in `QUEUE.md`: shelved on both
sides — no build here, no further build-out in Godot. The design doc stays as
a record, same shape as `sudsjack/`'s "SET DOWN". Nobody resumes it without
the owner asking in their own words. **Nothing further needed from this
repo** — leaving the entry so the closed loop is visible in one place rather
than only in `QUEUE.md`'s history.

### 1b. RUSH abilities — still open

v224/v225 gave Rush its ruleset, arena and roster here, but no ability. The
port has four selectable ones, chosen before the run:

| ability | idea |
|---|---|
| HEAT EXCHANGE | dump accumulated heat as a burn — bigger the hotter you are |
| HYPER BOMB | a big clear that costs no heat; the panic button |
| OVERCHARGE | a window where boosting is free and the chain climbs double |
| QUANTUM SHIELD | a window where enemy fire is reflected back as yours |

Same three options as CHALLENGES had (migrate / grandfather-and-document /
retire), and smaller — it slots into a mode this build already has. Still the
owner's call.

### 1c. RUSH lives — a NEW divergence, opened by Q-025

v226 (`991daf08`) removed `rush.lives` here as dead code — `checkExtraLife()`'s
caller already grew `player.maxHp`/`hp` directly, so the counter was inert,
not a live bug that was cutting runs short. Rush here has always effectively
run on HP.

The port's `rush.lives` is NOT dead code — `take_hit()` decrements it and only
ends the run at zero, reached from its own hit path, with a test asserting it.
So the two builds now genuinely disagree about whether Rush has a separate
lives resource at all, and it is a live disagreement rather than one side
having an unported fix. Filing it here rather than deciding it: **owner's
call**, same three shapes as the other two.

---

## 2. What the Godot port is missing from HERE

- ~~v225 in full~~ **Ported, v3.2** (`bareArena()`, the four-body roster, the
  COOLER vent, no bosses in Rush).
- ~~v227 — S/A/B/C tiers, the stamped ladder, per-level goals~~ **Ported,
  v3.4.** Two goals, not three — see §3 below; this was independently
  re-derived on the Godot side, not copied from the correction here.
- **ROGUELIKE: 12 of 20 cards**, and mode B's bonus gauntlet — unchanged since
  the last update.
- **v226's HP-based lives model** — not ported; see §1c, it is now a recorded
  divergence rather than a gap.
- **v228 (Arena pass 2), v229/v230 (haptics + reduce-motion), v231 (press
  kit)** — not yet assessed on the Godot side. v229/v230 look directly
  portable (Godot has `Input.vibrate_handheld()`); v231 is not a game change.

---

## 3. Confirmed already at parity

- **v224's Rush ruleset** — unchanged since the last update, still identical
  number for number.
- **Rush level as difficulty, both ways** — unchanged.
- **The tier numbers.** `TUNING.rush.tiers` here (S 2.0 / A 1.4 / B 0.9 / C
  0.5) match the Godot repo's `design/RUSH_TIERS_AND_LEVELS.md` research
  exactly — v227's own comment credits that doc and flags the numbers
  unvalidated against real playtest data. First playtest here owns them now,
  same as v224's ruleset did.
- **The two-goals-not-three correction, found independently on BOTH sides.**
  v227 here found the original three-goal proposal (UNTOUCHED / UNBROKEN /
  NEVER LOCKED, mirroring the Godot doc's three legs) doesn't work:
  `levelDown()` resets a level's timer to 0 on every hit, so reaching any
  level-up stamp already requires a hit-free attempt — UNTOUCHED is always
  true by construction. Cut before shipping (`RUSH_DESIGN.md` §3.4). The
  Godot build hit the identical wall porting v227 and verified the same is
  true of `take_hit()` there. **Two implementations, same maths, same
  conclusion** — about as confirmed as a design correction gets.
  `design/RUSH_TIERS_AND_LEVELS.md` in the Godot repo still shows the
  three-leg version in its prose; worth a pass to bring the doc in line with
  what both builds now actually do, though neither build's behaviour depends
  on the doc text.

---

## 4. Two things found from the Godot side that may apply here

Unchanged since the last update — still worth a glance, neither acted on:

1. **A menu row was once labelled with this build's own OFF text** — the
   port's ROGUELIKE row read "no upgrades — pure arcade survival" (this
   build's copy for the mode being off) while the mode itself was on. Fixed
   there; worth a glance at whether any menu string here reads as its own
   off-state.
2. **A RISK gate pays two pods, not one** — a port-side test assumed one pod
   from "a gate" and failed on the seeded 35% roll that makes a gate RISK.
   Behaviour was correct in both builds; only the test was wrong. Flagged in
   case a similar assumption exists here.
