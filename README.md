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
**Paper Route — Dawn Run.** A Paperboy clone built on Three.js r167, reusing the
toko-drop gel/neon art pipeline (`MeshPhysicalMaterial` transmission + clearcoat,
`UnrealBloomPass`, chromatic-aberration `ShaderPass`, ACES tonemap, IBL via
`RoomEnvironment`, Kirby eyes) with a **brand-new warm-dawn palette** — teal-dusk
road, mint subscriber houses, coral non-subscribers, gold papers, cyan bundles.
All colours live in `js/palette.js` so the scheme re-tints in one place.

**Controls:** A/D or ←/→ steer · W/S throttle/brake · Z throw left · X (or M) throw right · SPACE throw to lean side · ESC pause  
**Mobile:** left-half stick rides (x = steer, y = throttle) · ◀ ▶ buttons throw

#### Gameplay
- Endless auto-scrolling paper route; the road/lawns follow the bike and a scrolling lane texture sells the speed
- Houses stream in on both kerbs — **mint = subscribers** (deliver to the mailbox for 250 × streak), **coral = non-subscribers** (smash a window for 100)
- Land a paper near a subscriber's mailbox zone to deliver; miss a subscriber as it scrolls past and your delivery streak resets
- Road hazards: magenta cars (oncoming/moving), amber hydrants, gold cones, lilac hopping dogs — a hit costs a life (3 lives, mercy i-frames + flicker after a crash)
- 10 starting papers; grab cyan **paper bundles** on the road to refill (+5, cap 25)
- "Day" milestones every 130 m ramp bike speed + hazard density and award a bonus; hi-score in localStorage
- FX reused from toko-drop: screen-shake trauma, spark bursts, speed-line ghost trail, gel-glow deliveries

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

### 2026-06
- **`paperboy/` — Paper Route (Dawn Run):** new Paperboy clone reusing the toko-drop gel/neon art pipeline (physical gel materials, bloom + chromatic aberration + ACES, IBL, Kirby eyes, screen-shake, ghost trail) with a fresh warm-dawn palette centralised in `js/palette.js` (teal road, mint subscriber houses, coral non-subscribers, gold papers, cyan bundles). Endless auto-scrolling route with streamed-and-culled houses/hazards/pickups, arc-throw paper delivery to mailbox zones, window smashing, paper-bundle resupply, 3-life crash system, and 130 m "day" difficulty ramp with localStorage hi-score. Modular `js/`: `main` (scene + loop + collisions + HUD), `world` (route streaming + paper resolution), `player` (gel rider + bike), `paper` (arc-throw pool), `input`, `audio`, `palette`
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
