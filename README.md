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
