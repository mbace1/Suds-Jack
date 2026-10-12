# TURF Astra Sprite Pilot

Status: active pilot contract.

This pilot keeps TURF strictly 2D. No Blender, no 3D reconstruction, no Piritori Option C work.

## Goal

Prove one complete TURF character animation set with a frame-first 2D workflow before scaling the roster.

## Pilot character

`cast_04_grey_hoodie_bottle`

Reason: readable silhouette, layered clothing, visible limbs, and enough asymmetry to expose identity drift.

## Production order

1. Idle front_iso — 6 frames maximum.
2. Move front_iso — 16 frames maximum.
3. Melee or ranged action appropriate to the master — 5 to 8 frames.
4. Hit front_iso — 3 to 5 frames.
5. KO front_iso — 5 to 8 frames.
6. Repeat each action as independently authored rear_iso.

Do not generate side/profile/cardinal directions.

## Generation rule

Generate ONE frame at a time.

Each requested frame gets:
- the canonical character master;
- the previous APPROVED frame when one exists;
- the next mechanical pose target;
- the action phase and foot/contact state;
- the fixed front_iso or rear_iso camera contract;
- the previous rejection notes for this exact frame slot.

Never ask a model for a complete sprite sheet.

## Hidden production rule

All attempts are private working material.

Do not surface:
- generations;
- rejected candidates;
- diagnostic boards;
- contact sheets;
- side-by-side comparisons;
- validator images;
- progress screenshots.

Only a completed animation that passes every hard gate may be shown to the owner.

## Hard gates

A candidate is rejected if any of these are true:
- side/profile/cardinal facing;
- duplicate or near-duplicate of another frame slot;
- wrong planted foot/contact phase;
- identity drift in face, hair, clothing, body type or weapon;
- broken/cropped hands, feet, weapon or silhouette;
- origin/scale drift outside tolerance;
- anatomy error;
- text, numbers, UI, borders, shadow, VFX or presentation framing;
- camera drift;
- action phase does not materially advance motion.

A visually attractive frame with the wrong mechanical job still fails.

## Frame-count policy

More frames are allowed when they make motion easier to author correctly. Do not reduce frame count by duplicating poses or stretching holds.

Suggested targets:
- idle: 4–6 unique frames;
- move: 12–16 unique frames;
- attack: 5–8 unique frames;
- hit: 3–5 unique frames;
- KO: 5–8 unique frames.

## Move cycle contract

The move cycle must contain two genuinely different half-cycles.

For a 16-frame move:
- F1 = left contact;
- F9 = right contact;
- F2/F10 = compression;
- F3/F11 = push;
- F4/F12 = pass;
- F5/F13 = reach;
- F6/F14 = pre-contact;
- F7/F15 = settle/transfer;
- F8/F16 = next-contact anticipation.

Left and right contact frames must not be mirrored copies with only cosmetic edits. Limb ownership and body mechanics must switch.

## Art target

Preserve TURF's existing higher-detail illustration target. Do not force a 32x40 or tiny-palette retro pipeline. Use the existing 192x288 production plate and current Sprite Bible identity/style references.

MST parity means animation discipline, readable posing, exaggeration, timing and coverage — not literal copying of Metal Slug Tactics rendering.

## Approval milestone

The pilot succeeds only when one character has:
- complete front_iso idle;
- complete front_iso move;
- one action;
- hit;
- KO;
- independently authored rear_iso equivalents;
- zero hard-gate failures;
- owner approval on the assembled animations.

Until then, generated frame count is not progress.

## Astra execution

Run this pilot with the latest available Astra model in the remote development environment, using high or stronger reasoning when available. The model is an execution agent, not the pose authority: phase/contact/camera constraints in this file and the Sprite Factory manifest win over model preference.

If Astra cannot consistently satisfy the first idle and move gates, stop and diagnose the failing stage before scaling or generating more characters.
