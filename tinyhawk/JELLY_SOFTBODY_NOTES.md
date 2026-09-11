# Jelly Baby reference notes — Tiny Hawk

Reference: Scott Sun / `scottstts/Jelly-Baby` (`jelly.scottsun.io`).

## Why it matters

Do **not** turn the Tiny Hawk bird into a generic jelly character. The useful lesson is secondary motion: a heavy/fat bird should visibly absorb and release energy when skating.

## Techniques worth adapting

- Separate gameplay collision/body state from the high-resolution rendered surface.
- Use a small deformation cage / control points to drive visual squash and wobble rather than making the gameplay collider unstable.
- Apply landing compression from impact impulse, then damped recovery.
- Carry a smaller residual wobble through belly/body mass after ollies, drops, bails and hard turns.
- Let direction changes create subtle lateral lag, while board/contact physics remain authoritative.
- Keep deformation bounded so silhouette readability and trick timing never become ambiguous.
- Consider localized deformation/secondary motion instead of solving the entire character as a soft body.

## Tiny Hawk prototype order

1. Landing squash driven by vertical impact speed.
2. Damped belly/body recovery independent of board collision.
3. Lateral mass lag on carve/reversal.
4. Bail/impact exaggeration.
5. Only if profiling justifies it: move an expensive deformation kernel out of the main JS path (WASM is an escalation option, not a starting requirement).

## Acceptance rules

- Board/contact physics must behave identically with deformation disabled.
- Deformation cannot change jump height, collision outcome or trick scoring.
- At gameplay camera distance, squash must read without making the bird look liquid.
- Browser test should prove deformation state settles after an impact rather than accumulating energy forever.
- Performance comparison must be recorded before adding a more complex solver.

## Source concepts to inspect

The Jelly Baby repository separates `baby-cage`, `soft-body`, `soft-body-kernel`, `deform-surface`, and grab interaction. Learn the architecture and tuning strategy; do not vendor/copy the implementation wholesale.