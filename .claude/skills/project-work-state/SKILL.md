---
name: suds-project-work-state
description: Use for multi-step or multi-session Suds-Jack development work, especially when several agents are active, the user says continue/go ahead/next, or work must stay on one game until an exit condition is met.
---

# Suds Project Work State

Use repository files as persistent working memory. Do not rely on chat/session memory as the only source of project status.

## Start/resume

Before changing code:
1. Read `AGENTS.md` and the target game's canon/version docs.
2. Read any existing project task/progress/handoff file.
3. Inspect current `main`, the active branch/PR, recent relevant commits and CI status.
4. Reconcile documentation claims with repository reality before resuming.

## One-lane rule

When the owner has chosen a game/task lane, stay on it until its stated exit condition is met or the owner redirects. Do not use idle time to advance another game.

For each active lane keep four facts explicit in the relevant project progress/handoff document when one exists:
- **Goal** — current player-facing outcome.
- **Done** — merged/tested facts only.
- **Next** — smallest executable slice.
- **Exit** — evidence required before moving on.

Do not create planning-file clutter when a project already has a clear handoff/progress document; update the existing source instead.

## Branch hygiene

Other agents may advance `main` at any time. Before PR/merge:
- fetch current `main` SHA;
- compare the branch scope;
- rebuild/rebase cleanly if unrelated history entered the branch;
- verify CI on the final head SHA.

## Truth rule

Separate `implemented`, `tested`, `browser/runtime verified`, `merged`, and `live on Hub`. Never collapse these into one generic `done` status.
