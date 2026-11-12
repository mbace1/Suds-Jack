# TURF Astra execution checklist

Status: ready for first live sprite run once an Astra-capable remote dev session is connected.

## Hard rules

- 2D sprite production only. No Blender or 3D intermediary for TURF.
- Never surface intermediate frames, rejected candidates, debug boards, contact sheets, or diagnostics to the owner.
- Legal production facings: `front_iso` and `rear_iso` only.
- Side/profile/cardinal collapse is an immediate reject.
- Generate one frame at a time. Never ask Astra to invent a whole sheet.
- Character identity, scale, feet origin, camera, costume, palette and prop state stay locked unless the action explicitly changes them.
- Duplicate or near-duplicate frames have zero animation value and are rejected.
- More frames are allowed when they improve motion readability; padding is not.

## Pilot character

`cast_04_grey_hoodie_bottle`

Reference source: `casting-sheet-detail-2` from `manifest.json`.

## Pass 1 — front_iso idle

Target: 4 core frames, expandable to 6 only if the extra frames add visible but subtle motion.

1. rest
2. inhale
3. peak
4. exhale

Acceptance:
- no camera/facing drift
- same face, hair, hoodie, bottle and body proportions
- feet remain anchored
- upper-body change is visible at game scale
- no pair is near-identical
- cycle loops cleanly

Do not begin movement until the complete idle animation is approved internally.

## Pass 2 — front_iso move

Start at 12 frames. Expand to 14 or 16 only when necessary for a better transition; never duplicate a pose to reach a target count.

Canonical 12-frame motion contract:

1. left_contact
2. left_compression
3. left_push
4. left_pass
5. left_reach
6. left_precontact
7. right_contact
8. right_compression
9. right_push
10. right_pass
11. right_reach
12. right_precontact

Hard locomotion check: frames 1 and 7 must clearly belong to opposite planted feet while preserving the SAME `front_iso` facing. Equivalent opposition applies through both half-cycles.

## Pass 3 — front_iso actions

Only after idle + move pass:

- melee: ready / anticipation / contact / followthrough / recover
- hit: impact / recoil / catch
- KO: stagger / buckle / fall / impact / settled
- ranged only if this character's approved weapon state requires it

## Pass 4 — rear_iso

Author rear animation independently from the character rear master and the approved front motion grammar. Do not mirror or rotate front renders into rear sprites.

Order: idle -> move -> melee -> hit -> KO -> ranged if applicable.

## Per-frame Astra context

Every frame request should include:

1. canonical character master
2. current facing master (`front_iso` or `rear_iso`)
3. action + exact phase name
4. previous approved frame, when one exists
5. paired opposite locomotion frame, when one exists
6. next-pose intent in words, not a generated preview
7. non-negotiable invariants and forbidden outputs

Astra should modify only what the phase requires. When a previous approved frame exists, treat it as continuity authority but not as a pose to copy.

## Hidden review loop

For every candidate:

1. normalize to the current TURF illustration pipeline
2. run artifact/output gates
3. run facing check
4. run silhouette / scale / origin drift checks
5. run action-region duplicate check
6. for move, compare against its opposite half-cycle frame
7. inspect anatomy / identity / mechanical job
8. approve, revise, or reject internally

Only approved candidates may be used as references for later frames.

## Owner-facing release condition

Show nothing until at minimum one complete animation has passed as an animation, not merely as individual frames.

The first owner-visible output should therefore be the assembled approved `front_iso` idle cycle. If that does not meet the benchmark, keep iterating internally and do not present it.

## Stop condition

If Astra repeatedly fails the same hard gate after three meaningfully different attempts at one phase, stop generation for that phase and diagnose the control strategy. Do not brute-force dozens of candidates and do not lower the gate to create apparent progress.
