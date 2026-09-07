# Eeri checkpoint & retry pack

The retry loop should feel like **continuation**, never failure. Eeri has infinite retries, no lives and no death state; this pack makes that rule visible.

## Sequence

### Checkpoint activation
1. Cross the checkpoint — gameplay never stops.
2. 0 ms: marker switches to active state.
3. 40 ms: small local puff / material response.
4. 100–420 ms: HUD acknowledgement, then it gets out of the way.

### Pit retry
1. Fall is detected.
2. Brief crafted wipe/puff hides the teleport; max 220 ms before control is back.
3. Respawn at the latest checkpoint, facing the route forward.
4. 650 ms mercy/readiness window: readable, not invulnerable-looking flashing.

### Knockback recovery
No screen transition. The kid stays in the world, receives the existing knockback and mercy frames, and control remains responsive.

## Rules

- No `DEAD`, `FAIL`, lives, countdown or restart confirmation.
- Retry cannot reset the whole level when a checkpoint exists.
- Machine state must resolve to a safe authored state before player control returns.
- Camera cuts to the checkpoint rather than panning across the level.
- Total no-control time after a pit is <= 450 ms.
