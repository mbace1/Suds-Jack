# Suds-Jack

**Concept:** Bomb Jack × Suds 51 × Tempest 2000

A collection of WebGL experiments and a browser game, built as art-style references and playable demos.

Live preview: https://mbace1.github.io/Suds-Jack/

---

## Demos

### `goo-snowman.html`
WebGL fragment-shader snowman. Full-screen ray-marched SDF with Blinn-Phong + Fresnel + SSS lighting, two-pass bloom. Starting point for the goo shader series.

### `goo-surface.html`
SPH-lite (Smoothed Particle Hydrodynamics) goop on a flat surface. 64 particles, metaball WebGL render pass, amber/honey color. Tap to poke, drag to pull. Designed as a physics + art-style reference for porting to Godot 4 or Unreal Engine.

### `goo-flop.html`
Single gel cube that flops onto its side on a horizontal swipe. Physics: gravity-torque model (restoring below 45°, accelerating above), pivot-arc geometry for center tracking, squish on impact. Ray-marched SDF with Rodrigues rotation. Swipe right/left → cube tips and rests on its side; opposite swipe rights it.

### `paperboy/`
**Paper Route — Dawn Run.** A Paperboy clone built on Three.js r167 with an
**isometric, flat-shaded homage to the original Paperboy art** — orthographic 3/4
camera, bright sunny-day palette (sky-blue backdrop, grey road, green lawns, cube
houses with pitched roofs, a BMX kid in a yellow helmet). **Unlit flat `MeshBasicMaterial`
— no lights, shadows or fog** — with `NoToneMapping` for a flat 2D poster read; no bloom /
chromatic aberration / gel transmission (that look belongs to toko-drop). All colours live in `js/palette.js`
so the scheme re-tints in one place.

**Controls:** A/D or ←/→ steer · W/S throttle/brake · Z throw left · X (or M) throw right · SPACE throw to lean side · ESC pause  
**Mobile:** left-half stick rides (x = steer, y = throttle) · ◀ ▶ buttons throw

#### Gameplay
- Endless auto-scrolling paper route; the road/lawns follow the bike and a scrolling lane texture sells the speed
- Houses stream in on both kerbs — **teal = subscribers** (deliver to the mailbox for 250 × streak), **terracotta = non-subscribers** (smash a window for 100)
- Land a paper near a subscriber's mailbox zone to deliver; miss a subscriber as it scrolls past and your delivery streak resets
- Road hazards: passing cars (oncoming/moving), red hydrants, orange cones, brown hopping dogs — a hit costs a life (3 lives, mercy i-frames + flicker after a crash)
- 10 starting papers; grab blue **paper bundles** on the road to refill (+5, cap 25)
- "Day" milestones every 130 m ramp bike speed + hazard density and award a bonus; hi-score in localStorage
- Screen-shake trauma + spark bursts on deliveries, smashes, pickups and crashes

### `hyperdagger/`
**Hyper Dagger.** A first-person **Devil Daggers × HYPERDEMON homage** built on Three.js
r167 — survive a swarm of voxel skulls on a neon disc floating in a synthwave void; your
survival time is your only score. All enemies are **string-art voxel models** rendered as
one `InstancedMesh` each, and every kill explodes them into **physical voxel debris**
(gravity, floor bounce with damping, tumbling, shrink-out) via a shared 1600-cube pool.
`UnrealBloomPass` + HDR palette colors (only eyes / totem veins / daggers / arena ring
exceed 1.0) give selective glow without washing out the bone.

**Controls:** mouse look (pointer lock) · LMB **tap = shotgun burst / hold = dagger stream** · WASD move · SHIFT dash · SPACE jump  
**Mobile:** left on-screen stick moves · right stick looks **and auto-fires while held** (quick tap = shotgun) · centre DASH / JUMP buttons

#### Gameplay
- Obsidian **totems** (slowly drifting) rise behind telegraph light-beams and exhale chasing **skulls** (faster over time, 30% **gilded** 2-HP skulls after 60 s); horned **brutes** (10 HP, knockback-resistant) join after 40 s; segmented **serpents** weave around the arena and dive-bomb after 70 s — every ring is individually destructible and gibs on its own
- **Gems** drop from heavy kills (totems 3, brutes 2, each serpent ring 1, Leviathan 10), scatter physically, then magnet to you: 10 gems → faster stream + wider shotgun, 30 gems → **homing daggers**
- **Spiders** (after 55 s) skitter across the floor eating your loose gems — kill one and it refunds everything it swallowed +1; the **Leviathan** (after 120 s) rises at the arena centre, exhales skulls, and drags you toward its face every 9 s — walk or dash out of the pull
- Segment-vs-sphere hit tests so fast daggers can't tunnel; skulls take knockback per hit
- Two modes (menu toggle): **PURE** — Devil Daggers rules, one touch kills; **HYPER** — HYPERDEMON rules, a draining life-clock is your health: kills add their score in seconds (cap 60), a hit costs 10 + mercy i-frames, 0 = TIME OUT. Separate hi-scores
- One touch kills you (PURE) — DEVOURED slow-mo, instant tap/click retry, hi-score in localStorage
- HYPERDEMON feel: afterimage motion smear, trauma-driven screen shake + chromatic aberration, FOV kicks on dash/shotgun, rainbow-band sky, first-person voxel gauntlet with recoil

### `toko-drop/`
Twin-stick bullet-hell arena shooter built on Three.js r167.

**Controls:** WASD + hold LMB to aim/fire · SPACE to dash · ESC pause · E toggle eyes  
**Mobile:** left/right virtual sticks

#### Enemies (13 types)
| Type | Behaviour |
|------|-----------|
| GLOBBO | Direct chaser |
| SPITTOR | Keeps range, telegraphed ring burst |
| FANNER | Strafes, fan spread |
| WEEVA | Spiral fire, slow drift |
| SPLITTA | Splits into GLOBBOs on death |
| YELA_CUBE | Cardinal mover, leaves slime trail |
| ORANGE_CUBE | Move–aim–shoot burst pattern |
| SLUDGE_CUBE | Slow, drops poison zones, ribbon trail |
| REDD_CUBE | Splits into REDD_MINIs |
| PURP_CUBE | Splits into PURP_MINIs (homing) |
| TORO | Rev → telegraph → dash charge |
| BAMBU | Stationary, grows segments, lobs fat bullets |
| PYRA | Spinning ring, destroyable hole nodes |

#### Features
- 7-wave progression with speed/interval scaling
- Screen-shake trauma system
- Kirby-style eyes on player that track aim direction
- Player dash with ghost trail + mercy i-frames
- Gates (laser posts): dash through to deactivate → drops a powerup
- Powerup types: invincibility (3 s), fire-rate boost (5 s, ×2.5 rate)
- Death FX: chunk physics, puddle decals, sludge ribbons, poison zones
- Score + streak multiplier, hi-score in localStorage
- **Gel material pass:** all enemies + player use `MeshPhysicalMaterial` with transmission, clearcoat, and IOR — blobs read as translucent goo, cubes as candy-glass; vertex shader surface ripple on blob types via `onBeforeCompile`; IBL via `RoomEnvironment` + `PMREMGenerator`

---

## Changelog

### 2026-07
- **hyperdagger HYPER mode:** menu-toggleable HYPERDEMON scoring — a draining life-clock is your health (start 30 s, cap 60 s): kills add their score in seconds, a hit costs 10 s + knockback + 1.2 s mercy i-frames instead of instant death, 0 = TIME OUT. PURE mode (one-touch DD rules) unchanged; separate localStorage hi-scores per mode
- **hyperdagger roster completion:** **Spider** gem-thief (skitters on the floor eating loose gems, refunds its haul +1 when killed) and the **Leviathan** boss (60-HP voxel god-head at the arena centre after 120 s — exhales skulls, drags the player toward its face every 9 s, showers 10 gems on death). New `pull()` synth warning, `player.nudge()` external-force hook, debug spawners
- **hyperdagger parity pass:** Devil Daggers feature parity — tap-shotgun / hold-stream firing, gem drops with magnet physics, 3-tier dagger levels (LV 3 homing), gilded 2-HP skulls, 12-ring **serpent** (centipede homage) with individually gibbing segments, drifting totems, telegraphed spawns. HYPERDEMON graphics parity — `AfterimagePass` motion smear, trauma-driven shake + chromatic-aberration `ShaderPass`, FOV kicks, dash move (Shift / on-screen DASH), rainbow hue-wheel sky, first-person checkerboard voxel gauntlet with recoil, death slow-mo. New `gems.js`; new synth sounds (shotgun/gem/levelup/dash/roar)
- **`hyperdagger/` — Hyper Dagger:** new first-person Devil Daggers × HYPERDEMON homage. Voxel enemies (string-art layer models → per-enemy `InstancedMesh` with per-voxel `setColorAt`), physical voxel-gib debris pool (gravity, floor bounce, tumble, shrink-out), dagger-stream combat with segment-sphere hit tests + knockback, totem/skull/brute spawn director, animated shader sky + synthwave grid arena, selective HDR bloom, WebAudio synth kit incl. detuned-saw drone. Desktop pointer-lock mouse look; mobile dual on-screen sticks (right stick auto-fires) + jump button. Survival-time score, localStorage hi-score

### 2026-06
- **toko-drop v0.3.3:** Stronger death VFX (heavier gel-like chunks) + improved material hit response on blobs (visible temporary refraction/transmission shift when hit).
- **toko-drop v0.3.2:** Stronger hit response on blobs, improved death chunks, richer idle wobble, better dash visual feedback + powerup pickup feel.
- **toko-drop v0.3.1:** Stronger hit rim glow + basic inner emissive boost on blob-type enemies.
- **`paperboy/` — Paper Route (Dawn Run):** new Paperboy clone. **Art rebuilt as an isometric, flat-shaded Paperboy homage** — orthographic 3/4 camera (`OrthographicCamera` + `ISO_OFF`, sun/shadow frustum follows the bike), bright sunny-day palette, `MeshLambertMaterial` under a hemisphere/sun rig, `NoToneMapping`, no bloom/chroma/gel (dropped the toko-drop pipeline that the first cut used). Cube houses with pitched roofs, a low-poly BMX kid. Gameplay unchanged: endless streamed-and-culled route, arc-throw delivery to subscriber mailbox zones, window smashing, blue-bundle resupply, 3-life crash system, 130 m "day" ramp, localStorage hi-score. Colours centralised in `js/palette.js`. Modular `js/`: `main`, `world`, `player`, `paper`, `input`, `audio`, `palette`. Live site is served from the `gh-pages` branch (not `main`)
- **toko-drop "all-out gel" VFX pass:** five-part physical upgrade — (1) post-processing pipeline (`EffectComposer`: `UnrealBloomPass` strength 0.55/threshold 0.9 so only hot highlights bloom + custom chromatic-aberration `ShaderPass` + `OutputPass` ACES/sRGB); (2) `iridescence` + `attenuationColor`/`attenuationDistance` on blobs, plus `sheen` + `anisotropy` on cubes (Jell-O colour depth, soap-film sheen, candy-glass streaks); (3) Fresnel rim glow injected in the fragment shader (wet glistening silhouette edges); (4) blob geometry densified to 48×32 segments (smooth vertex-displaced surface, no faceting); (5) `SludgeRibbon` rewritten from a flat strip into an arched 3D `TubeGeometry` gel bead
- **Godot port brief (`toko-drop/GODOT_PORT.md`):** dispatch-ready doc mapping every browser gel/VFX system to its Godot 4.3+ equivalent — true SSS, screen-space refraction, verlet tentacles dragging on the floor, `GPUParticles3D` drips, `SoftBody3D` splits, `WorldEnvironment` SSR/SSIL/SDFGI, custom Compositor passes; includes a `gel.gdshader` skeleton, ordered task list, and parity checklist
- **Visual Lab (`toko-drop/lab.html`):** per-enemy slider tuning tool — live Three.js preview (OrbitControls, click-to-hit), 4 param groups (material, vertex wobble, scale breathe, hit response) each with plain-English descriptions; Record Snapshot saves params + text note to localStorage; Copy as Prompt formats all snapshots as LLM-ready context; Copy Code Patch generates paste-ready `enemy.js` block; Export JSON for archival
- **toko-drop gel amplified:** emissive inner glow on all enemies, vertex wobble 3× larger, hit squash init 0.35→0.65, decay halved — blobs visibly morph, cubes have candy-glass pulse
- **toko-drop gel material pass:** all enemies + player upgraded to `MeshPhysicalMaterial` — blobs get transmission + clearcoat goo look; cubes get rounded-box candy-glass; IBL via `RoomEnvironment`; ACESFilmic tonemapping
- **toko-drop perf pass:** bullets rewritten with `InstancedMesh` + typed arrays — 300 draw calls → 2; zero allocations per frame
- **Blob vertex shader:** organic surface ripple on blob-type enemies via `onBeforeCompile`; hit-burst wave decays after each shot; collision shape unchanged
- **Player powerup methods:** `grantInvincibility`, `grantFireRateBoost`, `dashing` getter (were called but not implemented)
- **goo-flop:** full 90° side-flop physics; pivot-arc geometry; gravity-torque model; swipe gesture detection

### 2025 (earlier)
- toko-drop: 13 enemy types, fat bullets, poison zones, TORO dash boss, BAMBU lob, PYRA ring
- toko-drop: gates, powerups, Kirby eyes, SludgeRibbon (BufferGeometry), BambuAoE
- goo-surface: SPH physics, metaball WebGL render, drag/poke interaction, bloom
- goo-snowman: initial WebGL fragment-shader SDF demo
