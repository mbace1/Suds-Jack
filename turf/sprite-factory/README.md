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

## Current build — v0.5

Open `index.html` through GitHub Pages or any local HTTP server.

Current functionality:

- 28-character roster manifest with stable IDs where confidence is sufficient
- source-reference links to the four owner casting/run-cycle images already in `turf/references/`
- explicit front/rear isometric directions
- target frame budgets and canonical phases per action
- frame-level candidate store with provenance and validation fields
- candidate gallery and approved-only animation preview
- approved-frame progress model; raw generation count does not inflate progress
- mechanical failure display for mirror, region-similarity and drift results
- motion-ledger schema for foundational locomotion
- clean render-packet builder for isolated one-frame generation
- repository-side progress report

The three final provisional roster slots remain visibly marked `needs-id`; the app does not pretend their labels are authoritative.

## Mechanical validation

The Sprite Factory now consumes the measured spritekit validator model rather than treating exact-pixel equality as a meaningful animation gate.

`../tools/spritekit/phase.cjs` checks normalized silhouette similarity, region-specific IoU and mirror similarity. Locomotion is scored primarily in the lower body; idle and upper-body actions must use an upper-body or full-body region instead of incorrectly treating still feet as a duplicate failure.

`../tools/spritekit/drift.cjs` checks ground-line/origin stability, scale drift and locomotion body-height rhythm. These are objective mechanical gates, not art-direction scores.

Validation profiles are artifact-specific:

- `prekey_magenta_plate`: opaque `#FF00FF` plate before keying
- `cut_binary_alpha`: transparent-background cut frame with binary alpha

Do not apply the opaque-alpha plate rule to cut sprites.

## Render packet correctness

Opposite locomotion phases are paired inside the same facing, e.g. Move F1 ↔ F7 in a 12-frame cycle. Front/rear facing is not an opposite motion phase.

Previous/next references are strictly adjacent approved frames. The tool does not silently substitute unrelated approved poses because that can corrupt continuity.

The packet also carries the canonical phase from `manifest.json`, validates integer frame bounds, reports the paired opposite frame number, and marks when a motion ledger is mandatory.

## Tests

Run:

```sh
node --test turf/sprite-factory/test.mjs
```

Unit coverage includes opposite-pair mapping, same-facing paired selection, strict adjacent-frame behavior, phase lookup, frame validation, newest-approved revision selection, frame coverage and project progress accounting.

## Progress report

Run:

```sh
node turf/sprite-factory/progress-report.mjs
node turf/sprite-factory/progress-report.mjs --json
```

The report derives required coverage from `manifest.json` and approved coverage from `candidates.json`. Missing/rejected/revise candidates never count toward parity.

## Manifest

`manifest.json` is the production contract for the app. It defines owner source references, character IDs, tactical directions, action/frame targets, canonical phases, export expectations, queue priority, artifact profiles and validation rules.

## Existing pipeline compatibility

Do not undo the current illustration-fidelity findings in `turf/art-src/sprites/README.md`: TURF reference art is not a 32x40 / 32-colour retro-pixel pipeline. Existing v3 plates are cut at 192x288 with `--no-quantise` and illustration validation. The Sprite Factory tracks that higher-detail production path while borrowing MST-level animation discipline, readability and coverage rather than forcing MST's literal rendering technique.

## Next build

1. Write actual spritekit validator output back into candidate records automatically.
2. Add approve/revise/reject controls that persist review decisions instead of display-only status.
3. Add idle-specific upper-body validation fixtures and thresholds.
4. Attach motion-ledger records to actual Move candidates.
5. Add adjustable-FPS approved animation playback.
6. Integrate generator job packets with the existing generation path.
7. Run awkward-silhouette breadth tests across heavy puffer, long coat, brimmed hat and long-weapon characters.
