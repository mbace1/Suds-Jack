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

## Current build — v0.6

v0.6 adds an external image-processing layer around the calibrated TURF validators without replacing them.

- `normalize.mjs` uses Sharp to normalize candidate frames to the production plate, keep the feet/south anchor stable, and apply the correct artifact profile.
- `diagnostic-diff.mjs` uses Pixelmatch to produce a visual diff PNG + JSON changed-pixel report. This is diagnostic only; it never decides whether motion is valid.
- `aseprite-export.mjs` is an optional Aseprite CLI adapter for approved animation assembly/export. Without `--run` it only prints the exact export packet, so Aseprite is not a hard runtime dependency.
- `validator-bridge.mjs` keeps action-aware validation regions: Move → lower body; Idle/Melee/Ranged → upper body; reactions → full body.
- The existing `../tools/spritekit/` validators remain the mechanical source of truth for facing, silhouette, phase opposition, drift, origin and motion quality.

Install the local toolchain from this folder:

```sh
npm install
```

Normalize a pre-key plate:

```sh
node normalize.mjs --input raw.png --output normalized.png --profile prekey_magenta_plate
```

Normalize a cut frame with binary alpha:

```sh
node normalize.mjs --input cut.png --output normalized-cut.png --profile cut_binary_alpha
```

Create a diagnostic diff:

```sh
node diagnostic-diff.mjs --a F1.png --b F7.png --out F1-F7-diff.png
```

Prepare or run an Aseprite export:

```sh
node aseprite-export.mjs --input move.aseprite --sheet move.png --data move.json --tag move
node aseprite-export.mjs --input move.aseprite --sheet move.png --data move.json --tag move --run
```

## Mechanical validation

`../tools/spritekit/phase.cjs` checks normalized silhouette similarity, region-specific IoU and mirror similarity. Locomotion is scored primarily in the lower body; idle and upper-body actions use an upper-body or full-body region instead of incorrectly treating still feet as a duplicate failure.

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

```sh
node --test turf/sprite-factory/test.mjs
```

Unit coverage includes opposite-pair mapping, same-facing paired selection, strict adjacent-frame behavior, phase lookup, frame validation, newest-approved revision selection, frame coverage and project progress accounting.

## Progress report

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

1. Write spritekit validator output back into candidate records automatically.
2. Add approve/revise/reject controls that persist review decisions.
3. Add idle-specific upper-body fixtures and calibrated thresholds.
4. Attach motion-ledger records to actual Move candidates.
5. Add adjustable-FPS approved animation playback.
6. Integrate generator job packets with the existing generation path.
7. Run awkward-silhouette breadth tests across heavy puffer, long coat, brimmed hat and long-weapon characters.
