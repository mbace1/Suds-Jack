# TURF Sprite Factory

Frame-first production controller for scaling TURF character animation toward MST-level animation coverage without treating raw generation count as progress.

## v0.7 — pose-controlled, hidden generation

Direct prompt-to-sprite generation is no longer a production path. It produced repeated poses, side/profile drift and user-visible failures.

v0.7 changes the authority order:

**character master → deterministic authored pose → pose-controlled generator job → quarantine → normalize → TURF mechanical/facing/duplicate gates → human approval → Aseprite/runtime export**

Nothing generated is user-facing by default. Candidates live in quarantine and may only be promoted after every release gate passes.

### Hard direction rule

TURF authors only two directions:

- `front_iso` — front three-quarter tactical diagonal
- `rear_iso` — rear three-quarter tactical diagonal

Side, profile, cardinal, turnaround and multi-direction sheets are forbidden production outputs.

### Deterministic pose control

`pose-control.mjs` creates the control pose before any image generation. Move uses a fixed 12-frame ownership cycle with F1/F7, F2/F8 etc. as mechanically opposite same-facing phases. Idle uses four authored vertical/breathing states.

```sh
node pose-control.mjs --direction front_iso --action move --frame 1 --out work/poses/f01.png
```

The resulting PNG can feed an OpenPose/ControlNet-style workflow. The accompanying JSON is the motion record.

### Generator packet

`comfy-job.mjs` builds a provider-neutral packet for ComfyUI-style pose-controlled generation. It separates:

- identity reference
- explicit pose control image
- fixed isometric camera contract
- one-frame output contract
- negative/forbidden output classes
- hidden quarantine destination

```sh
node comfy-job.mjs --character cast_12_heavy_puffer_hammer --reference master.png --direction front_iso --action move --frame 1 --pose work/poses/f01.png --out work/jobs/f01.json
```

This packet is deliberately not tied to one exact ComfyUI node graph; Frame Lab / ControlNet / IP-Adapter / reference-edit workflows can consume the same production contract.

### Hidden release controller

`hidden-pipeline.mjs` prevents generated material from becoming a deliverable by accident. Initial evaluation records `visibility: hidden`. Promotion requires explicit approval plus passed output, facing, duplicate and mechanical gates.

```sh
node hidden-pipeline.mjs --input work/quarantine/f01.png --report work/reports/f01.json
```

A candidate cannot be promoted simply because it looks good.

## Production order

1. Prove Idle + Move on several visually different characters.
2. Freeze front/rear isometric pose grammars.
3. Sweep Idle + Move across the roster.
4. Add Melee/Ranged/Hit/KO pose libraries.
5. Hand-repair failed transitions, then assemble approved animations.
6. Export only approved sets to runtime.

## Progress rule

Only **approved** coverage counts as progress. Generated/quarantined/rejected/revise candidates do not.

Near-duplicate frames have zero animation value. A visually strong frame with the wrong mechanical job is rejected.

## Existing processing layer

- `normalize.mjs` — Sharp normalization to the production plate and artifact profile.
- `output-gate.mjs` — rejects wrong output type/layout/background before mechanical review.
- `diagnostic-diff.mjs` — Pixelmatch diagnostic diff only; never the motion authority.
- `validator-bridge.mjs` + `../tools/spritekit/` — phase, silhouette, facing, mirror, drift, origin and rhythm gates.
- `aseprite-export.mjs` — optional approved animation assembly/export.

The reference-art path remains illustration-fidelity 192×288 with no forced low-colour quantisation.

## Tests

```sh
npm test
```

v0.7 tests additionally enforce that side/profile directions are illegal, F1/F7 own different leg positions, and generator jobs remain hidden/quarantined.

## Release philosophy

The generator has no authority over motion, camera, approval or delivery. Pose is authored first; generation fills the character into that pose; deterministic and human gates decide whether the frame survives.
