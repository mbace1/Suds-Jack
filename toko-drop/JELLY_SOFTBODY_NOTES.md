# Jelly Baby reference notes — Toko Drop

Reference: Scott Sun / `scottstts/Jelly-Baby` (`jelly.scottsun.io`).

## Why it matters

Toko Drop's Jell-O visual direction is a direct fit for controlled soft-body presentation. The goal is not simulation for its own sake: deformation should make movement, hits and enemy/projectile interactions readable and satisfying.

## Techniques worth adapting

- Low-resolution deformation cage drives a smoother rendered surface.
- Keep simulation, surface deformation and interaction/grab/force application as separate modules.
- Propagate an impact through the body as a damped wave rather than a single scale animation.
- Preserve volume approximately during squash/stretch so the character feels gelatinous rather than rubber-sheet thin.
- Add localized impulses for bullets, dash starts/stops, wall impacts and explosions.
- Tune damping/stiffness by gameplay role: player should settle quickly enough for control readability; props/enemies can wobble longer.
- Keep gameplay collision simpler and more deterministic than the visual soft body.

## Toko Drop prototype order

1. Visual-only squash/stretch shell over the existing gameplay body.
2. Directional hit impulse and damped ripple.
3. Dash compression/release.
4. Enemy/material presets with different stiffness/damping.
5. Surface reconstruction polish and highlights/refraction only after motion reads correctly.
6. Profile JS solver; consider a small WASM kernel only if solver cost is a demonstrated bottleneck.

## Acceptance rules

- Twin-stick aiming and collision remain deterministic with soft-body visuals enabled/disabled.
- Hit direction is visually readable from deformation.
- Wobble returns to a stable rest state.
- No uncontrolled tunnelling/exploding vertices after repeated impulses.
- Mobile/browser frame budget is measured with representative enemy counts.
- Physics fidelity is subordinate to responsive controls.

## Source concepts to inspect

The Jelly Baby repository exposes distinct `baby-cage`, `soft-body`, `soft-body-kernel`, `deform-surface`, and grab modules. Its key transferable idea is the separation of a cheap simulation representation from the final visual surface. Learn from the design; do not copy the project wholesale.