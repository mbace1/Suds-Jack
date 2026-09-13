---
name: suds-godot-game-dev
description: Use when building, converting, inspecting, or testing a Suds-Jack Godot project, including Piritori, Toko Drop, imported Web prototypes, scenes, nodes, signals, runtime input, and exports.
---

# Suds Godot Game Development

Read `AGENTS.md`, then the project's canon and Godot handoff before touching implementation. For Piritori, `DESIGN_AUTHORITY.md` remains above `GODOT_HANDOFF.md`.

## Architecture

Prefer composition over deep inheritance for player, enemies, weapons, interactions and reusable gameplay systems. In Godot, small focused Nodes/resources/signals are usually easier to test and replace than one large actor script.

## Agent workflow

When `gda`/Godot Agent is installed, prefer its structured CLI/runtime inspection rather than guessing scene state. Use JSON output, inspect scenes/nodes/scripts headlessly, and use live runtime input/screenshots/errors for player-facing verification. If `gda` is unavailable, use ordinary Godot CLI/headless tests and state the limitation.

The external `gda` skill is version-locked to its installed CLI, so do not copy command syntax from an old online skill into the repo; consult `gda skill`/`gda schema` on the machine running it.

## Conversion rules

1. Preserve gameplay/canon first; engine conversion is not permission to redesign.
2. Map authored systems to Godot components/resources rather than recreating hidden assumptions.
3. Keep input actions explicit and test keyboard/gamepad/touch where the project supports them.
4. Validate scene paths, autoloads, resource references and export settings.
5. Run the actual scene/export and exercise the real player flow.
6. Record any Web->Godot behavior differences as known deltas, not silent substitutions.

## Completion

A Godot task is not done because scenes parse. Require a runnable entry scene/export, no blocking runtime errors, and evidence for the player action changed.
