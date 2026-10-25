# Claude Code Pipeline for Suds-Jack
**Purpose:** Short operating guide that sits next to AGENTS.md and CLAUDE.md. Use this on every new session.

## Start every session
1. Read `AGENTS.md` (canon table, severity language, token rules, gates).
2. Read the lane’s authority document:
   - Piritori → `piritori/DESIGN_AUTHORITY.md` first.
   - Toko Move → `toko-move/ROADMAP.md` + `OWNER_OVERRIDE_V2.md`.
   - Others → their listed canon in AGENTS.md.
3. Load the `project-work-state` skill (`.claude/skills/project-work-state/SKILL.md`).
4. Inspect current `main`, open PRs, and recent commits for the lane.
5. Open or create the lane’s `PROGRESS.md` (see template below) and update the four facts before writing code.

## One-lane rule (non-negotiable)
Stay on the owner-chosen lane until its Exit condition is met or the owner redirects. Do not touch another game while waiting.

## Four facts (keep in PROGRESS.md or the existing handoff)
- **Goal** — player-facing outcome.
- **Done** — only implemented + tested + merged (or explicitly live) facts.
- **Next** — single smallest executable slice.
- **Exit** — evidence required before leaving the lane (real entry path, not a debug hook).

## Before any PR
- Fetch current main SHA.
- Confirm the branch still contains only this lane’s changes.
- Run the relevant gates (list them in the PR).
- Fill the PR template Evidence section with a real browser/phone path a stranger can follow.
- One `?v=` token per module; bump only when bytes change.
- Never regenerate `hub/versions.json` on the deployed tree without `--check`.

## Severity language (use these words)
Playable / Gate / Canon / Drift / Polish.  
Playable and Gate block merge. Canon needs an owner decision.

## Recommended next concrete tasks (after Toko Move store)

### Toko Move (finish store path)
- Confirm ship bar on a real phone (M6 LIVE).
- Native Finnish read of the language pass.
- Owner itch.io upload of the M2 package.

### Piritori Era I (after Move)
Smallest high-value slices that stay inside locked canon:
1. Map-first opening that loads the twelve-anchor graph and shows ordinary flow.
2. Full 7-day spine playthrough through the real UI (validate-slice + v3-playthrough.cjs must pass via the interface).
3. One 2v2 and one 3v3 formation battle that can be lost and still advance the story.
4. Market + crew loadout that remembers choices across blocks.
5. Visual fidelity check against ART_BIBLE cut-cardstock baseline (use visual-reference-fidelity skill).

Gates to run before claiming any of the above:
```bash
node piritori/map/validate-map.mjs
node piritori/content/validate-slice.mjs
node piritori/test/v3-contract.mjs
node piritori/test/v3-state.mjs
node piritori/test/v3-battle.mjs
NODE_PATH=$(npm root -g) node piritori/test/v3-playthrough.cjs
node piritori/test/fight.mjs
node piritori/test/market.mjs
```

## PROGRESS.md template
Copy this into the active lane folder (or root if shared) and keep it updated:

```markdown
# PROGRESS — [Lane name]
**Updated:** YYYY-MM-DD HH:MM EET

## Goal
(player-facing outcome)

## Done
- [fact] — implemented / tested / merged / live

## Next
(single smallest slice)

## Exit
(evidence required: real entry path, screenshot or gate output)

## Open questions for owner
- 
```

## Skills to load
- Always: project-work-state
- Playtest work: game-playtest
- Hub / version / deploy: hub-release
- Movement / geometry: movement-regression
- Godot: godot-game-dev
- Art comparison: visual-reference-fidelity

This file does not override AGENTS.md, CLAUDE.md, or any project’s DESIGN_AUTHORITY. It only operationalizes them.
