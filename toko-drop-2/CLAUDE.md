# Toko Drop 2.0 — agent notes

## Producer design docs

Read `[`DESIGN.md`](DESIGN.md)` before design-affecting work. Also read [`docs/ACTIVEPRODUCER.md`](docs/ACTIVEPRODUCER.md).

Items are tagged **SHIPPED** / **LOCKED-NOT-BUILT** / **PROPOSAL**. Do not decide open design questions silently — list them in the PR description or ask the producer (D-sign) / Mikael. Do not implement LOCKED-NOT-BUILT systems without a producer brief.

**Where the tree lives (18 Nov 2026).** The playable 2.0 tree ships from `gh-pages`, where it was authored up to v155. From v155, `main` carries the **whole** tree too, reconciled from `gh-pages` (AGENTS.md §2b). Before that, `main` had none of it, and the game existed in one place only. The rule from here:
- Ship by PR into `gh-pages`, as before.
- In the same session, reconcile the folder back to `main` (`git checkout origin/gh-pages -- toko-drop-2`) in a PR of its own.
- A release is not done while `main` is behind. Classic Drop remains in `../toko-drop/` and is not the ship target. Do not merge Drop Zero into 2.0 without a joint Mikael + producer decision in the brief.

`gh-pages` is a deploy target — keep doc-only changes small and do not mix them with a gameplay deploy unless the owner asked.

## Sakurai skill (adopted 15 Nov 2026)

Design and review Toko Drop 2.0 using the sakurai skill (`.claude/skills/sakurai` at the repo root): apply its principles, cite the chapter, and bring design questions back to D-sign/Mikael instead of deciding quietly. The Drop-specific mapping (all **PROPOSAL** until Mikael picks) is in [`DESIGN.md`](DESIGN.md) §6. The skill is an unofficial AI summary of Sakurai's videos, not his words (see `.claude/skills/sakurai/NOTICE.md`).
