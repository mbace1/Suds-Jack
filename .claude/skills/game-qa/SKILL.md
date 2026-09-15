---
name: game-qa
description: Verify gameplay correctness and regressions in Suds-Jack. Use for bug reports, smoke tests, finishability, input failures, state faults, browser errors and claims that a build works. Distinct from subjective playtest/design feedback.
---

# Game QA — Suds-Jack

QA answers: does the implemented game actually work through the player's interface?

## Protocol

1. Reproduce before changing code when possible.
2. Record the exact entry point, build/version marker, input sequence and observed failure.
3. Identify the smallest deterministic/model check that can guard the underlying rule.
4. Add or extend a browser/runtime check that proves the player-facing path when the bug is interface, integration, rendering or input related.
5. Make the smallest fix that addresses the reproduced fault.
6. Prove the new gate fails on the broken behavior conceptually: if removing the feature would still pass, the gate is inadequate.
7. Re-run the target project's focused gate, then the relevant repository/Hub gate.

## Evidence levels

- Source inspection: hypothesis only.
- Deterministic unit/contract test: proves model rule only.
- Browser/runtime automation: proves the exercised runtime path.
- Hub/deployed entry automation: proves integration of the exercised path.
- Human play: required when the question is feel, readability, aesthetics or emergent experience rather than binary correctness.

Never promote a lower evidence level into a stronger claim.

## Regression record

A useful regression names:
- starting state;
- real input sequence;
- expected state/position/result;
- forbidden failure;
- build/version;
- zero unexpected runtime errors where applicable.

Playable and Gate failures block merge under root `AGENTS.md`.