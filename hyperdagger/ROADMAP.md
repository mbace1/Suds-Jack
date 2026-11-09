# Hyper Dagger — v60 integration and SDF track

## Current state — 9 November 2026

- Live hub: v59. Separate SDF preview: build 3; retain it until retirement is explicitly agreed.
- v60 candidate: PR #628 preserves all of #626 (`baa953c5`) and the combined renderer/menu work. Main `6944c929` and the separate Toko prerequisite #635 are integrated locally; current runtime tokens are main 118, input 111 and worker cache v88.
- Mikael approved merge and project continuation on 9 November. Required final-head CI/review and gameplay/offline checks still gate merge/publication. The known Toko idle-aside CI blocker is addressed in its own prerequisite PR #635, not as an SDF rendering change.
- Full prior gameplay smoke passed 220/0; SDF play passed 35/0 after approved natural-observation fixture repair. Recheck the final shared-counter/cache integration, then publish and verify the actual hub build.
- Classic remains the default. Physical-device performance is unmeasured.
- Completed runs tie at 300.0 seconds. This is an open scoring design decision, not authorization to change the score.

The existing game remains the comparison baseline. The SDF preview is a
hybrid renderer: only listed enemies are converted; the arena, convoy,
weapons and physical debris still use the existing geometry.

## Build 2 — historical preview slice
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

## Build 3 — implemented experimental slice
- Seven SDF enemy profiles, including the orbital Watcher and open-shell Totem.
- Six bounded trajectory cuts per enemy; dark cut edges and hit flash.
- Charge/spawn signals drive the Watcher iris and Totem core.
- Season-direction lighting in world space and analytic SDF floor engravings.
- Gameplay health, radii, firing/spawning, scoring and voxel deaths retained.
- Dedicated Watcher/Totem encounter via the existing VOID director, with
  separate test records; standard season wave tables are unchanged.

Owner's latest "Go ahead" authorizes this preview expansion while physical
GPU measurements remain open; it does not approve SDF as the default.

## Next — hardware budget and combat readability
- Measure full gameplay on physical iPad, Android phone and desktop GPU:
  close skull, 12-body pack, late-wave swarm, every season and cube projection.
- Target 60 fps desktop / 30 fps tablet over a 60-second run; record p95 frame
  time, game/real-time ratio and browser/GPU. These are exit targets, not results.
- Compare target size, crown recognition, damage flash and occlusion in motion.
- Review wound visibility across six-hit bodies and glancing impacts; expand
  from the current six recent through-cuts only within a measured GPU budget.
- Add SDF-specific distance/step budgets and a return-to-Classic recovery if
  measurements miss the budget. No automatic quality claim from SwiftShader.

## Build 4 — after v60 integration: one articulated enemy
1. Watcher: implemented in build 3; validate on physical devices.
2. Totem: implemented in build 3; validate on physical devices.
3. Inspect spider and serpent, then choose ONE articulated conversion. Retain segment hitboxes, attack timing, silhouette and death behavior; complete its encounter and performance validation before starting the other.
4. Heavy/boss silhouettes only after all preceding conversions are tested.

Each conversion must pass the real menu → play → encounter → kill/death → retry
loop, keep its distinct silhouette and timing, and stay within the hardware
budget before another enemy starts. Existing voxel fallback remains available.

## Build 5 — environment and coherent lighting
- Build 3 adds material-only SDF floor inlays. Next convert a small patch
  of genuine 3D arena detail; preserve floor/edge collisions.
- Match SDF lighting to each season and its imported geometry; compare shadow,
  depth, fog, projection and postprocessing with the current build.
- Only consider a fullscreen raymarch after measured GPU evidence supports it.
  A hybrid renderer is an acceptable final architecture.

## Rollout gates
Opt-in v60: green integrated game/repository gates, visual review, reviewed merge and Mikael’s explicit merge approval, then publish and verify the main hub route. Physical-device results must be reported as unavailable when unavailable.

Making SDF the default additionally requires a physical-device pass at the budgets above and an owner decision. Update cabinet text/version to describe the build actually shipped.
A preview release does not certify 95% near-parity.

---

# Earlier milestone plan — historical

These v55–v58 targets predate v59 and are retained as planning history, not current completion claims. `VERSIONS.md` records shipped behavior; `QUEUE.md` holds outstanding work.

## v55 — Menu & Scoring Contract (historical target)
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

## v57 — Polished Total Experience (historical target)
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
