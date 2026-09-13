---
name: suds-game-playtest
description: Use when testing whether a Suds-Jack game is actually playable through its real player-facing entry point. Applies to browser games, hub cabinets, Godot exports, controls, progression, combat, traversal, and regressions.
---

# Suds Game Playtest

Read `AGENTS.md` first, then the target project's canon/version docs.

## Core rule

Do not call a feature playable because a model, state machine, debug hook, unit test, or isolated lab passes. A playable claim requires evidence through the same entry point and controls a player uses.

## Required loop

1. Identify the exact player entry URL/build/scene.
2. Record the visible version/build marker before testing.
3. Enter through the real title/menu/character flow. Debug handles may set up state, but must not perform the action under test.
4. Exercise the smallest complete player loop relevant to the change: start -> action -> consequence -> recovery/progression.
5. Test at least one failure/recovery path where appropriate.
6. Capture concrete evidence: states reached, coordinates/timing where useful, errors, and final progression state.
7. Run the project's cheap deterministic gates plus its browser/runtime gate.
8. If the live/hub route differs from the test route, the result is NOT verified.

## Merge blockers

Treat as `Playable` or `Gate` per `AGENTS.md`:
- title/menu cannot reach gameplay;
- controls work only through debug APIs;
- player gets stuck with no valid progression;
- gate passes after removing/bypassing the feature it claims to test;
- hub points to a lab/test harness instead of the campaign;
- visible version does not match tested bytes.

## Reporting

Prefer exact evidence over confidence language. Say `browser verified`, `runtime verified`, `deterministic only`, or `not run`. Never say `playtested` when only source inspection or model-level tests were performed.
