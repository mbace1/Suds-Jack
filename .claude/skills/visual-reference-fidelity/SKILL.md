---
name: suds-visual-reference-fidelity
description: Use when matching a visual target, reference game, uploaded concept, approved screenshot, art bible, sprite sheet, diorama, UI look, camera, or animation style in Suds-Jack.
---

# Suds Visual Reference Fidelity

Read the target project's art canon before generating or changing visuals. The newest owner-approved image/art brief outranks older exploratory work.

## Work from measurable traits

Translate the reference into concrete constraints before editing:
- camera/projection and horizon;
- silhouette/proportions;
- palette/material count and contrast hierarchy;
- density and empty-space ratio;
- scale of player versus environment;
- line/edge treatment, texture and lighting;
- animation pose, facing, contact ownership and frame cadence;
- layering/alpha/cropping requirements.

Preserve approved traits that were not requested to change. Small requested edits must not trigger a wholesale reinterpretation.

## Verification loop

1. Name the exact reference/canon source being matched.
2. Compare target and result trait-by-trait, not by vague similarity.
3. For runtime art, verify the asset that ships is the asset being judged: correct manifest/path/layer/crop/version.
4. For animation, detect duplicate frames, wrong facing, mirrored limb ownership and mixed character styles.
5. For camera/layout changes, compare actual viewport composition, not source constants alone.
6. Do not declare parity percentages without a defined rubric and evidence.

## Failure conditions

Reject the pass when:
- a different reference/style silently replaces the approved one;
- generated/code art is substituted for supplied approved art without owner direction;
- visual assets exist but are not integrated into the playable build;
- framing/camera remains effectively unchanged despite a requested camera change;
- repeated frames or hybrid character animation are presented as finished work.

Report what visibly changed and what still differs. Fidelity claims require a screenshot/runtime comparison or equivalent direct evidence.
