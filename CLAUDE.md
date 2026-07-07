# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projects

### Suds Jack
HTML5 demo built with **Three.js / WebGL**.
Concept: "Bomb Jack x Suds 51 x Tempest 2000" — floating bomb-collection gameplay, soap/bubble aesthetic, Tempest 2000 psychedelic tube-shooter energy.
Build tooling: TBD — update this file once chosen and add dev/build commands.

### Paper Route — Dawn Run (`paperboy/`)
A **Paperboy clone** built on Three.js r167 with an **isometric, flat-shaded homage to
the original Paperboy art** — orthographic 3/4 camera, bright sunny-day palette (sky-blue
backdrop, grey road, green lawns, cube houses with pitched roofs, a little BMX kid in a
yellow helmet). It renders **flat and unlit** — `MeshBasicMaterial` solid colours, **no
lights, shadows, fog, bloom, chromatic-aberration or gel transmission** (those belong to
toko-drop) — for a deliberately 2D poster read. The whole colour scheme lives in
`paperboy/js/palette.js` so it re-tints in one edit. Endless auto-scrolling route;
deliver to the teal subscriber houses, dodge road hazards, refill from blue bundles,
survive 3 crashes. No build step — open `paperboy/index.html` (three.js loads from the
jsDelivr CDN via an importmap, same as toko-drop).

> Note on deploys: the published site is served from the **`gh-pages` branch** (a
> separate curated site root that already holds `toko-drop/`), **not** `main`. Demo
> updates must be copied onto `gh-pages` to go live at `/Suds-Jack/paperboy/`.

### Hyper Dagger (`hyperdagger/`)
A first-person **Devil Daggers × HYPERDEMON homage** on Three.js r167 — survive a swarm
of **voxel** skulls on a neon disc in a synthwave void; survival time is the only score.
Enemies are string-art voxel models (one `InstancedMesh` per enemy, per-voxel colors) and
deaths explode them into **physical voxel debris** (gravity, floor bounce, tumble) from a
shared pool. DD-parity combat: **tap = shotgun burst, hold = dagger stream**, gems drop
from heavy kills and level the daggers up (LV 3 = **homing**); enemy roster is skulls,
gilded skulls, brutes, drifting totem spawners, and a **segmented serpent** whose rings
gib individually. HYPERDEMON-parity feel: dash, afterimage motion smear, trauma-driven
shake + chromatic aberration, rainbow-band sky, telegraph beams, voxel gauntlet.
Desktop: pointer-lock mouse look, LMB tap/hold, Shift dash, Space jump. Touch: dual
on-screen sticks — right stick looks *and auto-fires*, quick tap = shotgun — plus centre
DASH/JUMP buttons. No build step — open `hyperdagger/index.html` (three.js via jsDelivr
importmap, same as toko-drop). Same `gh-pages` deploy caveat as paperboy.

### Toko Drop — Gelatin Bullet-Hell Twin-Stick Shooter
Top-down arena twin-stick shooter. Primary development is in **Unreal Engine 5.4** (started from the Top Down template), with a potential HTML5 prototype / Godot port planned.

**Pillars:** twin-stick controls, bullet-hell enemy patterns with deliberately slow enemy movement, roguelite run-based progression, gun upgrade trees, gelatin/clay visuals (translucent wobbling materials, destructible chunks, colorful puddle decals).

**Current UE5.4 state:**
- Player pawn: `BP_GelPlayer` (Character-based, static mesh + `M_Gelatin` material, set as Default Pawn in `BP_TopDownGameMode`)
- Weapon: `BP_Weapon` (Actor-based, basic firing logic, spawned at a character weapon point)
- Enemy: Blueprint class with basic "move toward player" AI
- Mostly Blueprint-driven; open to C++ for performance-sensitive paths (bullet counts in bullet-hell can get heavy)

**Systems still to build:**
1. Weapon system + upgrade trees
2. Enemy bullet-hell patterns (spiral, spread, ring, etc.)
3. Arena + procedural/roguelite run generation
4. Roguelite meta-progression (unlocks, between-run upgrades)
5. Gelatin VFX: vertex displacement wobble, destructible chunks, puddle decals (Niagara + material functions)
6. HUD: health, score, run state

## Repository Structure

```
suds-jack/      # (not yet scaffolded)
toko-drop/
  index.html
  js/
    main.js     # Three.js scene, game loop, collision, wave management
    input.js    # Virtual joystick (touch) + WASD/mouse fallback
    player.js   # Player movement, dash mechanic, firing
    enemy.js    # Enemy class — 4 bullet-hell patterns, each with distinct color
    bullet.js   # Object-pooled bullets (300 cap, shared pool for all bullets)
paperboy/       # Paper Route — Dawn Run (Paperboy clone, toko-drop art, new palette)
  index.html
  js/
    main.js     # Scene + render pipeline (bloom/chroma/ACES/IBL), loop, collisions, HUD, states
    palette.js  # Central warm-dawn colour scheme (single source of truth for all tints)
    world.js    # Route streaming (houses/hazards/pickups) + cull, paper→house resolution
    player.js   # Gel rider + low-poly bike, steer/throttle, lean, crash mercy, ghost trail
    paper.js    # Object-pooled thrown papers with arc/gravity physics + landing detection
    input.js    # Touch stick (steer/throttle) + two throw buttons; WASD/ZX keyboard fallback
    audio.js    # WebAudio bleep kit (throw/deliver/smash/pickup/crash/day-clear)
hyperdagger/    # Hyper Dagger — FPS Devil Daggers × HYPERDEMON homage, voxel enemies
  index.html
  js/
    main.js     # Scene (grid arena, rainbow sky, afterimage/bloom/chroma), director, combat, HUD
    voxel.js    # String-art voxel models + parser, VoxelSprite (InstancedMesh), DebrisPool physics
    enemy.js    # Skull/Wraith, Brute, Totem (spawner), Serpent (chain), Spider (thief), Leviathan
    daggers.js  # Object-pooled dagger projectiles; homing steer at LV 3; segment hit tests
    gems.js     # DD-style gem drops: ballistic scatter, hover, player magnet, collect
    player.js   # First-person controller: yaw/pitch, WASD/stick strafe, jump, dash, head-bob
    input.js    # Pointer-lock mouse + WASD, or dual touch sticks + DASH/JUMP btns; tap-vs-hold fire
    audio.js    # WebAudio synth kit (fire/shotgun/hit/gib/gem/levelup/dash/roar/death + drone)
```

## Toko Drop — Architecture Notes

**Entry point:** `toko-drop/js/main.js` sets up the Three.js scene, wires input/player/enemy/bullets together, and runs the game loop.

**Controls:** Virtual twin-sticks (left half / right half of screen). Right stick release triggers a **dash** with i-frames. Desktop fallback: WASD move, hold LMB + mouse to aim and fire, Space to dash.

**Enemy patterns** (all four spawn simultaneously per wave, each with a unique color):
- `Pattern.RING` — orange, radial burst of 10 bullets every 2 s
- `Pattern.SPIRAL` — purple, rotating single shot every 80 ms
- `Pattern.SPREAD` — blue, 5-bullet aimed cone every 1.5 s
- `Pattern.ALTERNATING` — green, alternates ring burst and direct aimed shot every 1.1 s

**Bullet pool:** `BulletPool` pre-allocates 300 `THREE.Mesh` instances. `spawnDir(x, z, dx, dz, isPlayer, color)` pops from pool; `recycleAt(i)` splices active array at index `i` (always iterate backwards when recycling mid-loop).

**Dash:** 0.18 s at 26 units/s, 0.9 s cooldown, invincible during dash. Direction uses last aim direction if stick was released before movement.

**Wave progression:** when all 4 enemies are dead, `spawnWave()` removes old meshes from scene and spawns fresh enemies at `0.6 × HALF` radius in a cross pattern. Wave counter displayed in UI.

## Hyper Dagger (`hyperdagger/`) — Architecture Notes

**Voxel pipeline (`voxel.js`):** `MODELS` defines enemies as string-art layers —
`layers[0]` is the bottom slice, each layer an array of rows, row 0 the *front* face
(mapped to +z so `Object3D.lookAt(player)` points the face at the player). Palette values
are hex ints, or `[r,g,b]` arrays with components > 1 for **HDR glow voxels** (eyes,
totem veins) that trip the bloom threshold while bone/body stays matte. `VoxelSprite`
bakes a model into one `InstancedMesh` (per-voxel `setColorAt`; hit-flash brightens
`material.color`, which multiplies every instance). `DebrisPool` is a single 1600-cube
`InstancedMesh`: gravity −28, floor bounce ×−0.38 with friction, Euler tumble, shrink-out
over the last 0.3 s; `burst(worldVoxels, …)` explodes a dead enemy's actual voxels
outward from their centroid plus the killing dagger's impulse.

**Combat:** LMB tap (or quick right-stick tap on touch) = shotgun burst; hold = stream
(desktop stream starts after a 0.26 s hold so a tap stays a clean shotgun; touch streams
immediately). Weapon levels via gems — `LEVEL_GEMS = [0,0,10,30]`, `WEAPON[lv]` sets
stream rate / shotgun count / homing. LV 3 daggers steer toward the best target in a
~37° cone (`DaggerPool.update(dt, targets)`). Each dagger keeps `prev` position and
collisions use **segment-vs-sphere** tests so fast projectiles can't tunnel. Skulls take
knockback along the dagger direction (brutes mostly resist via lower `knock`).
Enemy → player kill test is against both torso and camera positions; totems don't kill,
they `player.pushOut(...)` as solids. Gems (`gems.js`) scatter ballistically, hover, then
magnet to the player inside 5.5 u.

**Spawn director (`main.js`):** all heavy spawns are **telegraphed** — an additive light
beam marks the spot for 0.7 s (`pending[]`), then the enemy appears. Totems (cap 6,
slow orbit drift) every 24 s at ring spots ≥ 12 u from the player, exhaling skulls
(global cap 42, 30% gilded `Wraith` after 60 s) at a tightening interval; brutes join
after 40 s every 16 s; **serpents** (cap 2) after 70 s every 45 s. A `Serpent` is a
controller owning 12 `SerpentSegment` enemies (pushed into the main `enemies` array so
the normal collision loops apply); the head weaves around the player and dive-bombs
every 8 s, surviving segments chain-follow at 0.95 u spacing, and each ring gibs + drops
a gem individually. **Spiders** (cap 2, after 55 s every 30 s) skitter on the floor and
eat loose gems — killing one refunds everything it swallowed + 1. The **Leviathan**
(after 120 s, one at a time, respawning every 120 s) is a 60-HP god-head at the arena
centre that exhales skulls and every 9 s drags the player toward itself for 1.8 s
(`player.nudge` at 7 u/s — walk or dash out); it drops 10 gems. A pairwise separation
pass (skull/brute only) keeps the swarm from collapsing into one blob.

**Modes:** menu-button toggle, persisted in `localStorage` (`hyperDaggerMode`). PURE =
one-touch death (DD). HYPER = HYPERDEMON rules: `lifeT` drains in real time (start 30,
cap 60), kills add `e.score` seconds, an enemy touch costs 10 + `player.nudge`
knockback + 1.2 s `mercyT` i-frames, and 0 → `die(true)` = TIME OUT. Hi-scores are
per-mode (`hyperDaggerHi` / `hyperDaggerHiHyper`).

**Input quirks:** right touch stick is *look + auto-fire* (Devil Daggers wants constant
fire; a separate fire button costs a thumb); a sub-250 ms / sub-12 px tap on it is the
shotgun. Pointer-lock mousemove deltas with `hypot > 400` are dropped — some browsers
emit one giant bogus delta right after locking. DASH/JUMP are fixed circles
bottom-centre, checked before stick assignment in `touchstart`. Shotgun-on-mousedown is
gated on `document.pointerLockElement` so menu/resume clicks don't fire.

**Render / feel:** ACES tone mapping + `EffectComposer` (`RenderPass` →
`AfterimagePass` 0.72 (HYPERDEMON motion smear) → `UnrealBloomPass` 0.7/0.45/0.6 →
chromatic-aberration `ShaderPass` → `OutputPass`). Bloom is *selective* via HDR colors
(daggers, edge ring, glow voxels exceed 1.0). A **trauma** value (kills, shotgun, dash,
death) drives camera shake + the chroma amount; dash and shotgun kick the FOV. The
first-person **voxel gauntlet** is a camera child (`scene.add(camera)` required) at
z −1.05 — closer and it smears into a slab at the screen corner; its glove is
checkerboarded because unlit same-color voxels read as one flat polygon. Death = red
vignette + slow-mo debris. Sky is a `BackSide` sphere with an animated hue-wheel band
shader (`fog: false`); the floor is a `CanvasTexture` neon grid on a circle, fog
`0x14041c` blends it toward the horizon. Death/menu/pause are DOM overlays; touch sticks
are drawn on the `#canvas-ui` overlay each frame. Hi-score lives in `localStorage` under
`hyperDaggerHi`. `window.__hd` exposes `{enemies, player, debris, daggers, gems,
serpents, debug}` (debug: `addGems(n)`, `spawnSerpent()`, `spawnSpider()`,
`spawnLeviathan()`) for console tinkering and automated smoke tests.

## Paper Route (`paperboy/`) — Architecture Notes

**Coordinate system:** forward = −z (the bike auto-advances into −z); +x is right. The
road, lawns, and kerbs are long static meshes re-centred on `player.position.z` every
frame, and the road's lane texture scrolls via `roadTex.offset.y` to sell the speed —
so the world is effectively infinite without moving the geometry.

**Camera / art:** a fixed-angle `OrthographicCamera` offset by `ISO_OFF` from the bike
gives the isometric Paperboy read; the route rolls mostly *up* the screen with a slight
rightward lean. Rendering is a plain `renderer.render` (no `EffectComposer`) with
`NoToneMapping`, and every mesh is **unlit `MeshBasicMaterial`** — no lights, shadows or
fog — for a flat 2D look. House "flash" on a delivery/smash is a colour lerp toward white
(`bodyMat.color.lerp(_WHITE, k)`), since `MeshBasic` has no emissive channel; `baseColor`
is updated on delivery so the house stays green after the flash settles.

**Streaming (`world.js`):** houses (both kerbs), hazards, and pickups spawn ahead of the
bike (independent z-cursors advancing toward `playerZ - SPAWN_AHEAD`) and are culled +
disposed once well behind. Houses are randomly subscriber (~55%, mint) or not (coral).
Each house carries a delivery zone `{ zoneX, z, zoneR }` near its mailbox.

**Throw → delivery:** `paper.js` is an arc-physics pool — `throw_(x,z,side,speed)` launches
a paper with lateral velocity toward `side`, slight forward lead, and gravity. On landing
it's flagged; `main` polls `papers.freshLandings()` and calls `world.resolvePaper(p)`,
which finds the nearest same-side house within `zoneR`: subscriber → deliver (250 ×
streak), non-subscriber → window smash (100). Tuning that matters: `THROW_VX`,
`HOUSE_X`/`zoneX`, and `zoneR` jointly set the deliverable lane band — land-x ≈
playerX + THROW_VX·flightTime must fall within `zoneX ± zoneR`, so the rider delivers
from the matching lane, not dead centre.

**Crash / lives:** `world.hazardHit()` returns an overlapping live hazard; a hit calls
`player.crash()` (mercy i-frames + flicker, returns false while invincible to avoid
double-hits), costs a life, breaks the streak. 0 lives → game over → auto-restart.

**Days:** every `DAY_DIST` (130 m) increments the day, bumps `player.setBaseSpeed` and
`world.setDifficulty` (hazard density + car speed), and awards a bonus. Hi-score persists
in `localStorage` under `paperRouteHi`.

**Controls:** desktop A/D-←/→ steer, W/S throttle, Z/X (or M) throw left/right, Space
throws toward the lean side, Esc pause. Touch: left-half stick (x = steer, y = throttle)
+ on-screen ◀ ▶ throw buttons whose hit-rects live on `InputManager` and are drawn by the
HUD.
