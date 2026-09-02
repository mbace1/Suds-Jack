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

## Current build — v0.4

Open `index.html` through GitHub Pages or any local HTTP server.

Current functionality:

- 28-character roster manifest with stable IDs where confidence is sufficient
- source-reference links to the four owner casting/run-cycle images already in `turf/references/`
- explicit front/rear isometric directions
- target frame budgets and canonical phases per action
- base-action coverage matrix
- planned / review / approved / rejected state cycling
- local review-state persistence and JSON export
- prioritized idle queue
- conservative approved-only parity meter
- PNG candidate validation for preferred plate size, opaque alpha and pure-magenta background corners
- two-image exact-pixel similarity check to expose duplicate/near-duplicate output
- frame-level candidate store with provenance and validation fields
- motion-ledger schema for foundational locomotion
- clean render-packet builder for isolated one-frame generation

The three final provisional roster slots remain visibly marked `needs-id`; the app does not pretend their labels are authoritative.

## Render packet correctness

The render packet is deliberately minimal. v0.4 fixes two production-significant issues found during testing:

- **Opposite locomotion phases are paired inside the same facing**, e.g. Move F1 ↔ F7 in a 12-frame cycle. Front/rear facing is not an opposite motion phase.
- **Previous/next references are now strictly adjacent approved frames.** The tool no longer silently substitutes some older approved pose, which could corrupt continuity.

The packet now also carries the exact phase derived from `manifest.json`, validates integer frame bounds, reports the paired opposite frame number, and marks when a motion ledger is mandatory.

## Tests

Run:

```sh
node --test turf/sprite-factory/test.mjs
```

Current unit coverage checks:

- 12-frame Move opposite-pair mapping (1↔7)
- same-facing paired-phase selection
- no cross-facing substitution
- strict adjacent-frame reference behavior
- phase lookup from manifest
- invalid/out-of-range frame rejection
- invalid opposite-phase-offset rejection

The v0.4 test set passes 6/6 locally.

## Manifest

`manifest.json` is the production contract for the app. It defines owner source references, character IDs, tactical directions, action/frame targets, canonical phases, export expectations, queue priority and validation rules.

Coverage is deliberately separate from raw image count.

## Candidate validation

The browser validator is a first mechanical gate, not an art director. It can reject objective export defects before review: wrong dimensions, non-opaque pixels, missing `#FF00FF` background at the image corners and suspiciously high exact-pixel similarity between two same-size candidates.

It cannot yet decide anatomy, pose continuity, support-leg ownership, weapon grip or aesthetic quality. Those remain approval gates.

## Existing pipeline compatibility

Do not undo the current illustration-fidelity findings in `turf/art-src/sprites/README.md`: TURF reference art is not a 32x40 / 32-colour retro-pixel pipeline. Existing v3 plates are cut at 192x288 with `--no-quantise` and illustration validation. The Sprite Factory tracks that higher-detail production path while borrowing MST-level animation discipline, readability and coverage rather than forcing MST's literal rendering technique.

## Next build

1. Candidate gallery with approve/reject controls and provenance.
2. Direction + phase coverage inside each action.
3. Silhouette/lower-body similarity metrics, not only whole-image exact equality.
4. Motion-ledger records attached to actual Move candidates.
5. Animation preview assembled only from approved candidates.
6. Generator job packets compatible with `scripts/gen-with-ref.mjs`.
7. Repository-side progress report generated from candidate records.
