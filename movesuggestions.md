# Toko Move — design suggestions

This file is the open design notebook for Toko / Claude Code.

Use it for:
- new gameplay ideas
- mechanic proposals
- map/readability ideas
- visual/UI suggestions
- progression/economy concepts
- experiments worth prototyping
- questions or alternatives that are not yet decisions

Do **not** treat ideas in this file as implemented, approved, or current-state truth.

For factual project state, implementation details, active branch/PR information, known technical debt, and what is actually working, use `moveupdates.md`.

## Current design thesis
Toko Move is a courier game played on Helsinki's existing moving transit network. The player should be reading the city and making timing decisions rather than drawing transport lines.

Core question:
**Wait for tram, transfer, or walk?**

## Ideas / suggestions

### Transit decisions
- Make vehicle arrival timing readable enough that the player can intentionally gamble on waiting versus walking.
- Let a player walk to a downstream hub to intercept a tram that has already passed the current hub.
- Reward staying on a useful vehicle longer when it avoids a risky transfer.
- Make major transfer hubs feel like places where several tactical options appear at once.

### Walking
- Walking should mostly connect transfer hubs along recognizable major streets, not become free omnidirectional movement.
- Animate the courier moving along the walking corridor rather than resolving only through a timer.
- Show interception opportunities before committing to a walk: `WALK 8t · CATCH 7 +3t`.
- Consider weather, cargo weight, and crowding as modifiers later.

### Jobs
- Offer several jobs simultaneously so the moving network affects which delivery is attractive right now.
- Mix urgent short jobs with longer high-value routes.
- Cargo restrictions should create genuinely different network decisions rather than simple score modifiers.
- Multi-stop delivery runs can create route-planning tension without turning the game into line construction.

### Network events
- Service delays should affect vehicle frequency/waiting rather than altering real HSL geometry.
- Temporary crowding could make a normally strong transfer hub less attractive.
- Rush-hour waves can make vehicle timing more valuable.
- A rare disruption could make walking to a parallel corridor suddenly optimal.

### Map readability
Visual hierarchy target:
1. colored HSL lines
2. moving numbered vehicles
3. transfer hubs
4. major walkable streets
5. minor HSL stops
6. geography / coast / parks

The player should be able to understand the immediate decision within a few seconds without losing the feeling of a living Helsinki map.

## Toko notes
Add new design thoughts below this line. Keep them speculative until promoted into `moveupdates.md` through actual implementation or an explicit design decision.

---
