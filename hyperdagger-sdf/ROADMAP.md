# SDF conversion — active preview track

The existing game remains the comparison baseline. The SDF preview is a
hybrid renderer: only listed enemies are converted; the arena, convoy,
weapons and physical debris still use the existing geometry.

## Build 2 — testable skull-family slice
- Classic / SDF Preview choice on the real title menu, saved between visits.
- Mouse/touch buttons; R or gamepad up/down changes renderer; START plays.
- Regular, crowned Wraith, cleft Splitter, small hornless Mini and crowned
  Dread have distinct SDF profiles and keep their gameplay values.
- Season palette supplies the SDF bone/eye tint. Detailed Inca mosaic pattern
  matching is a later art pass, not claimed complete here.
- `sdf-preview.html` compares profiles and 12/40-body swarms.
- Separate `/hyperdagger-sdf/` online preview; the current cabinet remains at
  `/hyperdagger/`. The preview does not register a service worker, so it
  cannot delete the current cabinet's offline caches.

## Build 3 — hardware budget and combat readability
- Measure full gameplay on physical iPad, Android phone and desktop GPU:
  close skull, 12-body pack, late-wave swarm, every season and cube projection.
- Target 60 fps desktop / 30 fps tablet over a 60-second run; record p95 frame
  time, game/real-time ratio and browser/GPU. These are exit targets, not results.
- Compare target size, crown recognition, damage flash and occlusion in motion.
- Add SDF wound/erosion feedback for multi-hit enemies; the current preview
  flashes on hit and retains voxel debris, but does not carve SDF bullet holes.
- Add SDF-specific distance/step budgets and a return-to-Classic recovery if
  measurements miss the budget. No automatic quality claim from SwiftShader.

## Build 4 — next enemy, one complete loop at a time
1. Watcher: body, charging cue, firing, hit and death; preserve aimed volleys.
2. Totem: sculpt, pulse animation, spawned skulls and break-up.
3. Spider and serpent: articulated limbs/rings; retain each segment's hitbox.
4. Heavy/boss silhouettes only after all preceding conversions are tested.

Each conversion must pass the real menu → play → encounter → kill/death → retry
loop, keep its distinct silhouette and timing, and stay within the hardware
budget before another enemy starts. Existing voxel fallback remains available.

## Build 5 — environment and coherent lighting
- Convert a small patch of arena detail first; preserve floor/edge collisions.
- Match SDF lighting to each season and its imported geometry; compare shadow,
  depth, fog, projection and postprocessing with the current build.
- Only consider a fullscreen raymarch after measured GPU evidence supports it.
  A hybrid renderer is an acceptable final architecture.

## Public rollout gate
Visual review + physical-device pass + green game gates + reviewed merge.
Then update the cabinet description/version and publish the selected default.
A preview release does not certify 95% near-parity.

---

# Hyper Dagger Roadmap

Version bumps are tied to milestones. Each milestone is a shippable slice of the total experience (play, UI, feedback, scoring).

## v55 — Menu & Scoring Contract (current)
- Explicit season + mode selection on the title screen
- Mode override sticks; seasons remain primary
- Personal best and daily best visible
- Time tiers (S/A/B/C/FAIL) on recap
- Daily keys and board include season
- Combo counter, threat ring, basic telegraphs

## v56 — Season Identity & Wave Pacing
- Each season has distinct pacing and verb
  - S1: swarm + rubble/cover
  - S2: jump/avoid goo waves (enemies in troughs)
  - S3: forward momentum, trucks, gaze, no rear pressure
- Wave tables with density + breathing gaps
- Brief slowmo + toast on wave transitions
- Board script accepts season

## v57 — Polished Total Experience (near complete)
- Consistent recap across death and complete
- Stronger heavy telegraphs and hit confirmation
- Menu and death screen visual polish
- Mobile/gamepad paths verified for all seasons
- Board fully wired when endpoint is set
- VERSIONS.md and hub note updated

## v58 — Feature Complete Ship
- All three seasons playable to 300 s with correct scoring
- Leaderboards live (or cleanly off)
- No major missing feedback or broken control schemes
- Gate green; ready for public playtest

Landed items move to VERSIONS.md. Queue holds the next concrete tasks.
