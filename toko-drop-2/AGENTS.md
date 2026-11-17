# Toko Drop 2.0 — agent pointers

## Producer design docs

Read `[`DESIGN.md`](DESIGN.md)` before design-affecting work. Also read [`docs/ACTIVEPRODUCER.md`](docs/ACTIVEPRODUCER.md).

Items are tagged **SHIPPED** / **LOCKED-NOT-BUILT** / **PROPOSAL**. Do not decide open design questions silently — list them in the PR description or ask the producer (D-sign) / Mikael. Do not implement LOCKED-NOT-BUILT systems without a producer brief.

Playable 2.0 tree (this branch). Do not merge Drop Zero into 2.0 without a joint Mikael + producer decision.

## Sakurai skill (adopted 15 Nov 2026)

Design and review Toko Drop 2.0 using the sakurai skill (`.claude/skills/sakurai` at the repo root): apply its principles, cite the chapter, and bring design questions back to D-sign/Mikael instead of deciding quietly. The Drop-specific mapping (all **PROPOSAL** until Mikael picks) is in [`DESIGN.md`](DESIGN.md) §6. The skill is an unofficial AI summary of Sakurai's videos, not his words (see `.claude/skills/sakurai/NOTICE.md`).

## Testers: unlock and room jump (v154)

- `?unlock=all` opens every campaign room (HARD PAIN's too) and lets START AT pick any of the 9 arcade worlds.
- `?room=N` goes straight into campaign room N. N is its number on the grid (1–36) or its id, e.g. `?room=12` or `?room=undertow`. It also implies `?unlock=all`.
- Both make the page a **sandbox**. Saved progress is read but never written: grades, bests, the furthest world, the kept run, the play record and settings changes all live in memory until the page closes. The language picker is the one exception, because it writes to localStorage directly. The title shows `TEST UNLOCK · NOT SAVED`.
- `?world=N` (existing) still starts an arcade run in world N.
- `?bossphases=off` gives the v153 bosses (one rage at half health, old health) for an A/B. `?bossphases=all` also puts the three-phase bosses in the campaign boss rooms.
- Console helpers: `__toko.unlock`, `__toko.sandbox` (what the sandbox kept), `__toko.room(id)`, `__toko.bossWave()`.

