# Toko Drop 2.0 — agent notes

## Producer design docs

Read `[`DESIGN.md`](DESIGN.md)` before design-affecting work. Also read [`docs/ACTIVEPRODUCER.md`](docs/ACTIVEPRODUCER.md).

Items are tagged **SHIPPED** / **LOCKED-NOT-BUILT** / **PROPOSAL**. Do not decide open design questions silently — list them in the PR description or ask the producer (D-sign) / Mikael. Do not implement LOCKED-NOT-BUILT systems without a producer brief.

You are in the playable 2.0 tree on `gh-pages`. `main` also keeps a docs-only copy of this folder so agents starting there can find the same producer doc. Classic Drop remains in `../toko-drop/` and is not the ship target. Do not merge Drop Zero into 2.0 without a joint Mikael + producer decision in the brief.

`gh-pages` is a deploy target — keep doc-only changes small and do not mix them with a gameplay deploy unless the owner asked.

## Sakurai skill (adopted 15 Nov 2026)

Design and review Toko Drop 2.0 using the sakurai skill (`.claude/skills/sakurai` at the repo root): apply its principles, cite the chapter, and bring design questions back to D-sign/Mikael instead of deciding quietly. The Drop-specific mapping (all **PROPOSAL** until Mikael picks) is in [`DESIGN.md`](DESIGN.md) §6. The skill is an unofficial AI summary of Sakurai's videos, not his words (see `.claude/skills/sakurai/NOTICE.md`).
