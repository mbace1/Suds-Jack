# TURF Sprite Factory

Frame-first production controller for scaling TURF character animation toward MST-level animation coverage without treating raw generation count as progress.

## Production order

1. **Idle seeds** — create very small, controlled pose deltas for every goal character. Identity consistency is the first gate.
2. **Base actions** — cover Move, Melee, Ranged, Hit and KO for the roster.
3. **Motion phases** — expand each action into mechanically meaningful phases rather than arbitrary poses.
4. **Variations** — create multiple candidates for each phase while preserving character identity and origin.
5. **Gold assembly** — hand-pick approved candidates into complete animations and repair transitions frame-by-frame.
6. **Parity audit** — measure coverage, directionality, phase uniqueness, continuity, anatomy and rendering quality against the project target.

## Progress rule

Only **approved** frame/action coverage counts as progress. Generated candidates do not.

Near-duplicate frames have zero animation value. A visually good frame with the wrong mechanical job is rejected.

## Current app

Open `index.html`. The first version provides:

- 28-character goal roster scaffold
- base-action coverage matrix
- planned / review / approved / rejected state cycling
- prioritized idle-production queue
- parity coverage meter
- six-stage production ladder

State is intentionally session-local in v0.1. The next version should read/write a repository manifest rather than hard-code state.

## Next implementation steps

- replace provisional roster labels with stable character IDs tied to the owner reference sheets
- add `manifest.json` with frame-level state
- add direction coverage
- add per-frame candidate gallery
- add validation results for pure background, scale/origin, duplicate similarity and paired-phase opposition
- add animation preview assembled only from approved frames
- integrate generation jobs with the existing `scripts/gen-with-ref.mjs` path
- preserve raw generation provenance and prompt/reference hashes

## Existing pipeline compatibility

Do not undo the current illustration-fidelity findings in `turf/art-src/sprites/README.md`: TURF reference art is not a 32x40 / 32-colour retro-pixel pipeline. Existing v3 plates are cut at 192x288 with `--no-quantise` and illustration validation. The Sprite Factory should track and validate this higher-detail production path rather than silently forcing old MST-style palette constraints.
