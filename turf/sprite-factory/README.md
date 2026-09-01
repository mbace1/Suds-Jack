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

Only **approved** coverage counts as progress. Generated candidates do not.

Near-duplicate frames have zero animation value. A visually strong frame with the wrong mechanical job is rejected.

## v0.2

Open `index.html` through GitHub Pages or any local HTTP server. It now reads `manifest.json` rather than hard-coding the production plan.

Current functionality:

- 28-character roster manifest with stable IDs where confidence is sufficient
- source-reference links to the four owner casting/run-cycle images already in `turf/references/`
- explicit front/rear isometric directions
- target frame budgets per action
- base-action coverage matrix
- planned / review / approved / rejected state cycling
- local review-state persistence
- exportable JSON state snapshot
- prioritized idle queue
- conservative approved-only parity meter
- PNG candidate validation for preferred plate size, opaque alpha and pure-magenta background corners
- two-image exact-pixel similarity check to expose duplicate/near-duplicate output
- duplicate flag count persisted with review state

The three final provisional roster slots remain visibly marked `needs-id`; the app does not pretend their labels are authoritative.

## Manifest

`manifest.json` is the production contract for the app. It currently defines:

- owner source references
- character IDs
- two tactical isometric directions
- action/frame targets
- export expectations
- queue priority
- validation rules

Coverage is deliberately separate from raw image count.

## Candidate validation

The browser validator is a first mechanical gate, not an art director. It can reject objective export defects before review:

- wrong dimensions
- non-opaque pixels
- missing `#FF00FF` background at the image corners
- suspiciously high exact-pixel similarity between two same-size candidates

It cannot yet decide anatomy, pose continuity, support-leg ownership, weapon grip or aesthetic quality. Those remain approval gates.

## Existing pipeline compatibility

Do not undo the current illustration-fidelity findings in `turf/art-src/sprites/README.md`: TURF reference art is not a 32x40 / 32-colour retro-pixel pipeline. Existing v3 plates are cut at 192x288 with `--no-quantise` and illustration validation. The Sprite Factory tracks that higher-detail production path while borrowing MST-level animation discipline, readability and coverage rather than forcing MST's literal rendering technique.

## Next build

1. Frame-level candidate records instead of only action-level cells.
2. Candidate gallery with approve/reject controls and provenance.
3. Direction + phase coverage inside each action.
4. Silhouette/lower-body similarity metrics, not only whole-image exact equality.
5. Motion-state ledger support for locomotion.
6. Animation preview assembled only from approved candidates.
7. Generator job packets compatible with `scripts/gen-with-ref.mjs`.
8. Repository-side progress report generated from the manifest/candidate records.
