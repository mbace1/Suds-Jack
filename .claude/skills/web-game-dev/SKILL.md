---
name: web-game-dev
description: Route and execute browser-game work in Suds-Jack without confusing model tests with playable browser evidence. Use for Canvas/WebGL/Three.js/browser-native games, gameplay features, input, camera, VFX, performance or release work.
---

# Web game development — Suds-Jack

Read root `AGENTS.md`, the target game's canon/docs, then the relevant narrow repo skill before editing.

## Routing

- Player-facing behavior or regression: use `game-playtest`.
- Movement/traversal: also use `movement-regression`.
- Hub/deployment/version changes: also use `hub-release`.
- Visual target work: also use `visual-reference-fidelity`.
- Long or interrupted work: also use `project-work-state`.

## Browser-game rules

1. Preserve the repo's no-build vanilla-module architecture unless the owner explicitly changes it.
2. Separate simulation, input and presentation enough that deterministic logic can be tested without pretending that a model test proves the interface.
3. Test the real player entry point in a browser. Debug handles may arrange setup but must not perform the action being proved.
4. For input changes, exercise the actual keyboard/pointer/touch path used by players.
5. For camera/visual changes, capture or inspect the rendered result; source-code intent is not visual proof.
6. For performance work, measure before and after. Do not optimize from intuition alone.
7. Keep cache/module version tokens synchronized with changed bytes according to `AGENTS.md`.
8. A Hub game is not playable merely because its direct URL or lab page works.

## Done means

- target game's own deterministic gates pass where applicable;
- browser gate exercises the player-facing path;
- no new console/page errors;
- version/docs reflect the actual build;
- Hub route works when the change is meant to be playable there;
- no claim exceeds the evidence collected.