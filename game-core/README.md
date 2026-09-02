# Suds Game Core

Shared, no-build infrastructure for the first three integration targets only:

1. **Flash Prince** — explicit locomotion state contracts plus deterministic movement tapes.
2. **Tiny Hawk** — isolated cannon-es skateboard physics comparison lab plus engine-agnostic benchmark metrics.
3. **Hyper Dagger** — existing offline/smoke suites bridged into the shared regression runner.

**Out of scope:** Eeri and Toko Drop. Do not wire either game into this folder yet.

## Modules

- `state-machine.js` — deterministic finite-state machine with strict legal-transition checking and compact transition history.
- `telemetry.js` — frame-indexed event telemetry, invariants, and a tiny serializable input tape for deterministic reproduction.
- `playtest.html` / `playtest.js` — same-origin browser harness for render/input survival checks.
- `test/run.mjs` — unified red/green terminal runner for Flash Prince, Tiny Hawk and Hyper Dagger only.

Run the stronger regression layer from repo root with:

`node game-core/test/run.mjs`

## Flash Prince

`flashprince/js/movement-state-contract.js` defines the playable movement graph. `MovementHeroV3.go()` routes real lab transitions through the shared FSM in non-strict telemetry mode. `flashprince/test/movement-tapes.mjs` now locks five deterministic paths: run/jump/land, low mantle, ledge pull-up, climb-down and crouch/roll. It also proves illegal direct state jumps are rejected.

Next Flash Prince step: promote the tapes from state-only assertions to full MovementHero simulations that assert position windows and exact transition frames in the four movement-lab scenes.

## Tiny Hawk physics A/B

Open `tinyhawk/physics-lab.html`. Production physics is still authoritative. The cannon-es probe now feeds `PhysicsBenchmark`, which records contact chatter, pop variance, landing speed and transition speed retention. The same collector is intentionally engine-agnostic so production physics can feed identical observations next.

Do not replace the production heightfield solver until both solvers have comparable runs and cannon-es wins on measured stability without making steering/landing feel worse.

## Hyper Dagger

Game Core now calls the existing `hyperdagger/test/offline.cjs` and `hyperdagger/test/smoke.cjs` suites rather than duplicating them. Next Hyper Dagger step is a small deterministic invariant layer for seeded spawn timing, survival-clock progression and firing cadence.

## Playtest contract

The browser smoke page answers “does it load and survive representative input?” The unified Node runner answers “did the known gameplay contracts regress?” Neither is a subjective quality claim. Keep the scope to these three titles until their deterministic coverage is strong enough to catch the regressions we have actually seen.
