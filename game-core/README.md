# Suds Game Core

Shared, no-build infrastructure for the first three integration targets only:

1. **Flash Prince** — explicit locomotion state contracts and transition regression checks.
2. **Tiny Hawk** — isolated cannon-es skateboard physics comparison lab; production skater physics is unchanged until the comparison wins.
3. **Hyper Dagger** — runtime/input/render smoke coverage through the shared browser runner.

**Out of scope for this pass:** Eeri and Toko Drop. Do not wire either game into this folder yet.

## Modules

- `state-machine.js` — deterministic finite-state machine with strict legal-transition checking and compact transition history.
- `telemetry.js` — frame-indexed event telemetry, invariants, and a tiny serializable input tape for deterministic reproduction.
- `playtest.html` / `playtest.js` — same-origin browser harness that loads only the three target games, verifies source contracts, finds a render canvas, drives representative input, and reports runtime smoke failures.

## Flash Prince

`flashprince/js/movement-state-contract.js` describes the state graph used by the currently playable movement lab (`movement-lab-v3.js` -> `MovementHeroV3` -> `MovementHero`). The older campaign Hero contract is kept separately in `hero-state-contract.js` so campaign integration can happen without conflating the two movement models.

Next integration step: route `MovementHero.go()` through `StateMachine.go()` in non-strict telemetry mode first, run the four movement-lab scenes, then turn strict mode on once every intentional edge transition is represented.

## Tiny Hawk cannon-es lab

Open `tinyhawk/physics-lab.html`. It is deliberately separate from `tinyhawk/index.html` and uses a pinned `cannon-es@0.20.0` import. Compare these before moving anything into production:

- ramp entry/exit stability;
- ground contact chatter;
- pop consistency at lips;
- landing recovery;
- steering while loaded versus airborne;
- numerical stability at high speed.

The production heightfield solver remains authoritative until the probe is measurably better.

## Playtest contract

Open `game-core/playtest.html` from the same static server as the hub. It runs Flash Prince, Tiny Hawk and Hyper Dagger sequentially. A green smoke result is not a claim of game quality; it means the page rendered, expected source vocabulary exists, representative input did not immediately crash, and the frame remained alive long enough to observe.

The next layer should add title-specific invariants and deterministic input tapes rather than adding more games.