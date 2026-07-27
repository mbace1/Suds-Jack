# Neon Ronin — Roadmap

## Direction: Morbid Metal × Tears of Metal

The design target is Morbid Metal's character-swap arena combat blended with Tears of
Metal's horde-scale battles and commandable battalion. Co-op is deliberately out of
scope — squad allies deliver that fantasy single-player.

- **M1 — Hordes + squad allies — DONE.** Mob-tier DRONE swarmers on a cheap shared-material
  rig arriving in flood packs (live cap 70); recruitable ally ronin (RONIN BANNER card,
  cap 6) with ring formation, auto-engage, per-room revive, and the CHARGE order
  (`E` / ⚑ button). Enemy AI generalized to target the player *or* any ally.
- **M2 — Combat verbs — DONE.** Heavy attack (RMB, ×2.8 damage, committed 0.78 s),
  timed parry (F — 0.24 s active window that negates melee, staggers the attacker and
  reflects bolts, and pays 10 ult charge), and per-frame ultimates on a kill-charged
  meter (R): KIRI IAIJUTSU line-blink, GORO TECTONIC quake rings, SAYA THOUSAND CUTS
  flurry. Touch gets ⛨ PARRY / ★ ULT buttons; auto-combat mixes heavies in.
- **M3 — Run structure + meta.** Per-room objective variants (KILL ALL / SURVIVE /
  DESTROY 3 pylons / PROTECT the shrine bot) paying bonus "salvage"; salvage persists in
  `localStorage` and buys permanent upgrades in a between-run FORGE screen (+max
  integrity, +ally cap, a starting modifier slot, a 4th unlockable frame).
- **M4 — Bosses + elites.** Every 4th room becomes a boss arena (SHOGUN PRIME — scaled
  fancy rig that phase-swaps its own stance and weapon mid-fight, telegraphed sweeps plus
  bolt novas); elite variants of existing enemies carrying one aura modifier each
  (shielded / frenzied / splitting).
- **M5 — Presentation juice.** Hit-stop on heavy hits, blade trail ribbons, dash smear,
  kill-streak-driven WebAudio music layering. Merges with Phase 3/4 below.

---

# HD Model & Physical Animation Roadmap

Goal: evolve the player (first) and enemies (later) from box-primitive rigs with
stateless posing into a **much higher-fidelity model with physically-grounded
animation**, without giving up the things that make the demo easy to iterate on:
no build step, three.js from a CDN importmap, everything tweakable in one editor.

The plan is four phases. Each phase ships playable on its own; nothing blocks
gameplay work in the meantime.

---

## Phase 1 — HD procedural rig (still code-built, ~2–4× today's detail)

Keep generating the model in `robots.js`, but graduate the skeleton and shapes:

- **Real joint chains**: split arms into shoulder → elbow → wrist (3 pivots) and
  legs into hip → knee → ankle. This alone transforms swing/run silhouettes —
  elbows whip, knees drive, ankles roll through footfalls.
- **Hands**: simple mitten hands with an opposable thumb block; weapons parented
  to the palm instead of the forearm so grips read correctly.
- **Silhouette upgrade**: bevelled boxes (`BoxGeometry` + a chamfer pass, or
  low-seg `CylinderGeometry` shells) for armour plates layered over slimmer core
  limbs; separate chest/abdomen segments so the torso can bend as two units.
- **Costume as separate meshes**: the kasa, sode shoulder pads, obi knot, and
  hakama panels become individually transformable nodes — required for Phase 3
  secondary motion.
- **Material pass**: keep flat neon accents, add a second tier of dim emissive
  panel lines (the `trim` material) and a subtle fresnel rim shader
  (`onBeforeCompile`) so silhouettes read against the dark cave without bloom.

Deliverable: same API (`buildSamurai`, `poseX`), richer rig underneath.
Estimated size: robots.js grows to ~500 lines; zero new dependencies.

## Phase 2 — Authored glTF hero (optional fork from Phase 1)

If we outgrow procedural primitives:

- Author the hero in Blender following the reference sheet (kasa, rope obi,
  scabbards, hakama, piston shins), ~5–15k tris, **skinned** to the same bone
  names the code already uses (`hips`, `torso`, `head`, `armL/R`, `legL/R`, plus
  new `elbow/knee/wrist` bones).
- Export glTF + Draco; load with `GLTFLoader` from the same CDN. Tint per
  role/form by material-name convention so one mesh serves all three frames and
  the enemy variants.
- Keep the procedural rig as the instant-iteration fallback behind a flag
  (`?rig=proc`), and as the low-LOD for crowds (brute rooms spawn many rigs).

Decision gate: only take this fork when Phase 1 stops being enough — authored
assets slow down iteration and this repo thrives on fast tweaks.

## Phase 3 — Physical animation (the big win)

Layer physics on top of the stateless poses instead of replacing them:

1. **Spring-damper joint layer.** Every posed joint gets a critically-damped
   spring toward its target rotation (`θ'' = k(target−θ) − c·θ'`). All poses
   stay authored in code, but transitions (idle→run, windup→slash, land)
   overshoot and settle naturally. This is the single highest-value change.
2. **Secondary motion via verlet chains.** Hat brim tilt, obi tails, scabbards,
   and 4–6 hakama skirt strips simulated as 2–3 point verlet chains pinned to
   the body, colliding with a capsule around the legs. Cheap (~dozens of
   points), sells speed and direction changes better than anything else.
3. **Acceleration-driven lean.** Lean from actual acceleration vector (not just
   speed): starts, stops, direction flicks and dashes all tilt the torso and
   hat correctly; landing compresses knees (squash) then recovers.
4. **Foot IK.** Two-bone IK for plants: feet stick to the floor plane between
   steps, stride length adapts to real velocity, no more skating at low speed.
5. **Impulse hit reactions.** Getting hit injects an impulse into the spring
   layer (head snap, torso twist away from the hit direction) — no authored
   flinch animations needed.
6. **Ragdoll deaths.** On kill, hand the whole rig to a verlet ragdoll
   (points at joints, stick constraints along bones, floor collision) with the
   killing impulse applied — replaces/augments the shard burst. Enemy-only at
   first, ~1s lifetime, pooled.

Tech choice: **hand-rolled verlet + springs, no physics engine.** Rapier/ammo
(wasm) would add a build/download step and this scope doesn't need broadphase,
joints-with-motors or stacking. Everything above is O(joints) per rig.

Perf budget: player (full stack: springs + IK + chains) ≤0.3 ms; enemies get
springs + ragdoll-on-death only; 60 fps on a mid phone with 20 rigs alive.

## Phase 4 — Presentation polish

- Blade trail ribbons (triangle strip along recent blade tip positions).
- Dash smear: brief scale-stretch along velocity + 2–3 ghost afterimages.
- Camera improvements: velocity lookahead, hit-stop (30–60 ms freeze on heavy
  hits), FOV kick on dash.
- Footstep decals/dust puffs synced to IK foot plants.

---

## Suggested order of attack

| Step | Scope | Payoff |
|------|-------|--------|
| 1 | Phase 3.1 spring layer on current boxes | huge feel upgrade, tiny code |
| 2 | Phase 1 elbows/knees + hands | silhouettes finally look "animated" |
| 3 | Phase 3.2 verlet costume + 3.3 accel lean | reference-image fantasy sells |
| 4 | Phase 3.4 foot IK + 3.6 ragdolls | grounded locomotion, satisfying kills |
| 5 | Phase 4 trails/smears/hit-stop | combat juice |
| 6 | Phase 2 authored glTF | only if/when procedural caps out |
