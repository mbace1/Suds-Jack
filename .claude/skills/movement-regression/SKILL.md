---
name: suds-movement-regression
description: Use when changing player movement, traversal, animation transitions, collision, ledges, jumps, landings, climbs, rolls, pivots, or movement state machines in Suds-Jack games.
---

# Suds Movement Regression

Movement changes are not complete when they look plausible in code. Preserve the authored movement contract and prove the exact player path.

## Method

1. Read the target game's movement/canon docs and current state-transition contract.
2. Identify the exact authored geometry involved: tile positions, ledge heights, gaps, slopes, collision volumes.
3. Reproduce the problem in the real runtime with player inputs.
4. Record the expected transition sequence and useful numeric windows (position, velocity, frame, health/damage).
5. Fix the runtime, not merely the test, unless evidence proves the assertion itself was wrong.
6. Add two layers of regression where practical:
   - deterministic/state/geometry test;
   - browser/runtime input test on actual authored geometry.
7. Assert zero illegal transition faults and a valid final grounded/hanging/progression state.
8. Test release/reversal/recovery input, not only the happy path.

## Anti-patterns

Do not:
- call `grab()`, `beginClimbDown()` or equivalent directly when the bug concerns detection through real geometry;
- use blank worlds when authored collision is part of the behavior;
- widen tolerances until a failing move passes;
- replace a real input hold with an instantaneous key press when the simulation needs to observe a held input frame;
- accept duplicated or hybrid animation states between character profiles.

## Completion

A traversal slice is done only when the deterministic gate and real runtime path agree on transitions and final state. If browser execution was not run, say so explicitly.
