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

**Controls:** mouse look (pointer lock) · **fire is automatic while you move** (hold LMB when still) · WASD · SPACE **jump / double jump** · SHIFT dash · ESC pause/options  
**Mobile:** left stick moves · right stick looks · **fire is automatic** · **tap either stick = jump / double jump** · **flick either stick to dash** · ⏸ pause — no on-screen buttons

#### Gameplay
- Obsidian **totems** (slowly drifting) rise behind telegraph light-beams from the start and exhale chasing **skulls** (faster over time, 30% **gilded** 2-HP skulls after 60 s); horned **brutes** (10 HP, knockback-resistant) join at 45 s; segmented **serpents** weave around the arena and dive-bomb from 100 s — every ring is individually destructible and gibs on its own
- Onboarding is paced one mechanic at a time over the first ~150 s (watchers 25 s, brutes 45 s, thorns 60 s, spiders 75 s, blinkers 90 s, serpents 100 s, Leviathan 150 s) and recurring spawns tighten as the run goes on, instead of five enemies debuting in the same 30-second window
- **Milestone announcements:** every first encounter gets a named toast + a low two-note stinger — THE WATCHERS, THE BRUTES, THORNS BENEATH, THE THIEVES, THE BLINKERS, THE SERPENT / THE PALE SERPENT, CROWNED SKULLS, THE SPLITTERS — and THE LEVIATHAN RISES plays on every boss spawn
- **Gems** drop from heavy kills (totems 3, brutes 2, each serpent ring 1, Leviathan 10), scatter physically, then magnet to you: 10 gems → faster stream, 30 gems → **homing daggers**
- **Spiders** skitter across the floor eating your loose gems — kill one and it refunds everything it swallowed +1; the **Leviathan** rises at the arena centre, exhales skulls, and drags you toward its face every 9 s — walk or dash out of the pull
- Segment-vs-sphere hit tests so fast daggers can't tunnel; skulls take knockback per hit
- **Returnal-inspired bullet-hell:** watcher drones telegraph and fire aimed orb volleys, totems pulse slow expanding orb rings you jump over, and thorn spikes erupt from red sigils under your feet — **dash phases through orbs** (never through bodies); dash requests buffer across the cooldown
- **Splitter skulls** (white crown) burst into three frantic minis; spawn mix shifts as the run goes on
- **Blinkers** teleport 6-8 u toward you every couple of seconds (running away doesn't build distance); every second **serpent** is a pale **ghost** whose rings deflect daggers from the front — flank it or shoot the tail; **spiders lay egg sacs** that hatch two skulls unless you pop them first (eggs are harmless to touch)
- Two modes (menu toggle): **PURE** — Devil Daggers rules, one touch kills; **HYPER** — HYPERDEMON rules, a draining life-clock is your health: kills add their score in seconds (cap 60), a hit costs 10 + mercy i-frames, 0 = TIME OUT. Separate hi-scores
- One touch kills you (PURE) — DEVOURED slow-mo, instant tap/click retry, hi-score in localStorage
- **Death recap:** the death screen names what killed you, a per-enemy kill breakdown, your dagger level reached, and your last 10 run times
- HYPERDEMON feel: afterimage motion smear, trauma-driven screen shake + chromatic aberration, FOV kicks on dash/shotgun, rainbow-band sky, first-person voxel gauntlet with recoil
- **Adaptive music:** an all-synth minor-pentatonic arpeggio layers voices in as the swarm and run time build — bass at all times, arp / hi-hat / lead counter-melody phasing in with intensity, over the detuned-saw drone; toggle in the pause menu
- **Style meter:** a Returnal/DMC-style rank (D → SSS) fed by fast kills, dash-through-orb dodges and gem pickups; idling bleeds it out faster at the top tiers, so holding **S+** means never stopping. The rank drives a HUD badge + fill bar and swells the music; your peak rank is on the death recap
- **Gamepad:** plug in a controller — left stick moves, right stick looks, RT/RB fire, A jumps (×2), B/LT dashes — feeding the same input paths as mouse/keyboard/touch
- **LV4 — the crimson hand:** a fourth dagger tier at 70 gems (DD's upgrade ladder): 26/s stream + homing, and the **gauntlet itself evolves** with each level — knuckle glow at LV2, red veins at LV3, full crimson-and-fire at LV4
- **Dread skulls** stalk runs past 120 s — Skull-IV-scale dark-red chasers (8 HP, faster than you on foot, barely flinch) that force dash play; they drop 3 gems
- **Reactive floor:** the arena grid thumps in time with the 138 BPM soundtrack (scaled by live intensity) and flushes red when you're hit
- **Pulsing pressure director** (ported from toko-drop's wave system): recurring spawns come in budgeted pulses every ~14 s with a deterministic rhythm — every 8th is **HEAVY** (guaranteed serpent or dread centrepiece), every 4th a **SPIKE** (1.5× budget of brutes/dreads/spiders), every 3rd a **SWARM** (a tight burst of skull packs + blinkers), and the pulse after any intense one is a half-budget **breather** — so runs breathe in peaks and lulls instead of a flat drip
- **First-run tips card:** a one-time 3-tip overlay before your first descent (auto-fire while moving, dash phases through orbs, gems level daggers); the menu itself stays terse
- **Accessibility:** pause-menu **MOTION REDUCED** master switch (kills smear/shake/chroma/FOV kicks without touching your individual toggles) and **CONTRAST HIGH** (hotter orbs + telegraph beams, no red floor flush)
- **Adaptive performance:** a frame-time governor (**PERF AUTO**, default) steps render cost down on weak devices — chroma → smear → pixel ratio → bloom + debris cap — and back up when the device recovers; it never overwrites your own FX choices. HIGH/LOW pin the extremes
- **Daily runs:** a menu toggle switches FREE ↔ **DAILY** — everyone on the same UTC day faces the same seeded spawn schedule and pulse picks (per mode). Per-day best + a 30-entry all-time daily board live in localStorage; daily times never touch the FREE hi-score
- **Killer death cam + share:** dying swings the camera toward whatever got you (it burns bright) during the slow-mo; the recap adds a pulses-survived line and a **COPY RUN** button that puts a share string on your clipboard

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
- **hyperdagger v4.3 — killer death cam + recap/share:** dying now swings the camera toward the killer over ~1.3 s of the slow-mo (`deathCam` shortest-path yaw/pitch lerp in the non-playing loop; `playerStruck` records the fatal hit's position + entity ref, the killer's sprite flashes ×3; TIME OUT and debug deaths skip the swing). Death recap adds "survived N pulses (M heavy)" and a **COPY RUN** button — clipboard share string like `HYPER DAGGER · daily 2026-07-11 · PURE · 143.2s · 87 kills · LV4 · rank SS`, falling back to showing the string inline if clipboard is blocked; the button stops propagation so tapping it never restarts the run
- **hyperdagger v4.2 — daily seed + local leaderboards:** new RUN **DAILY/FREE** menu toggle (`hyperDaggerRunKind`). DAILY seeds the director from `fnv1a(utcDate + ':' + mode)` (new `js/rng.js`: mulberry32/fnv1a/mixSeed); each pulse draws from a fresh `mulberry32(mixSeed(seed, pulseN))` stream, and `ringSpot`/exhale rolls use the seeded run-stream — so same-day players share the spawn schedule and per-pulse pick sequences (enemy micro-jitter stays random; full determinism is impossible with live input). **The pulse budget now grows with pulse index instead of wall time** — the verification suite caught the same pulse redrawing differently at different game times. Scoring: per-day best in `hyperDaggerDaily:<date>:<mode>` (pinned to the seed date across UTC midnight), a capped 30-entry all-time daily table with rank shown on death ("daily #N all-time"), boot-time GC merging stale day keys, and daily times never touch the FREE hi-scores. Debug: `setRunKind`, `setDate`, `getRunInfo`, `lastPulsePicks`, `getDailyTable`
- **hyperdagger v4.1 — run telemetry + balance/mix pass:** every death appends a record to localStorage `hyperDaggerRunLog` (cap 40): duration, mode, cause, kills by type, weapon level, gems, style peak, pulse index + kind at death. `__hd.debug.report()` aggregates it — median/best time, deaths by cause and by pulse kind, average weapon level — so future tuning works from data (toko-drop's hit-telemetry pattern; local only). Provisional balance: style bleed softened `6+0.05v → 5+0.045v`/s (S-rank was draining out between pulse peaks). Audio mix: the drone now **ducks up to 50% under the music layer** as intensity climbs (`setTargetAtTime`, τ 0.4 s), and gibs get **±12% pitch variance** so dense clears don't machine-gun identically. Debug: `die()`, `report()`
- **hyperdagger v4.0 — adaptive performance governor:** new PERF AUTO/HIGH/LOW pause row (`opts.perf`). In AUTO a frame-time EMA (measured on the *unclamped* delta; >250 ms real samples discarded as tab-hidden) walks a five-tier ladder — T1 chroma off → T2 smear off → T3 pixelRatio 1.5 → T4 pixelRatio 1 + bloom off + debris soft-cap 800 — stepping down after 1.5 s sustained >40 ms and up one tier per 15 s stable <22 ms, with settle windows after tier changes/unpause/visibility flips. The governor **never writes `opts.*`**: effective pass state is `userToggle && motion && tierAllows`, so the menu always shows user intent and a step-up can't resurrect a toggle the user disabled. New shared `applyRenderScale()` sets renderer **and** composer pixel ratio (composer caches its own) and is used by `resize()` so window resizes can't undo a tier. `DebrisPool.softCap` skips spawns past the cap without reallocating. Debug: `forceFrameTime(ms)` (bypasses the tab-hidden discard), `getPerfTier()`, `setPerfTier(t)`, mutable `perfTuning`
- **hyperdagger v3.9 — landing pass (onboarding + accessibility):** one-time **tips card** before the first run (localStorage `hyperDaggerSeenTips`, new `'tips'` state between menu and playing) covering the three non-obvious mechanics; menu controls blurb trimmed to two lines. New A11Y pause rows: **MOTION FULL/REDUCED** (`opts.motion` master switch — composes as `userToggle && motion` in `applyOpts`/`updateFeel`, so smear/shake/chroma/FOV-kick all stop without rewriting the user's stored toggles) and **CONTRAST NORMAL/HIGH** (`opts.contrast` — orb material retinted 2.6→3.4 HDR red via the now-exposed `OrbPool.mat`, telegraph beams ×1.4, floor `uRed` flush disabled). optRow coercion now falls back to raw strings (prep for v4.0's `perf` option). Debug: `setOpt(k,v)`, `getFx()`
- **hyperdagger v3.8 — pulse director (toko-drop's wave/budget system, adapted):** the six independent recurring spawn timers (watcher/brute/spider/blinker/serpent/dread) are replaced by budgeted **pulses** every ~14 s (tightening to 9 s): budget `3 + min(t/60,2.5)·3.2 + max(0,t/60−2.5)·1.4` (knee at 2.5 min, tuned to match the old system's mid-run pressure) spent on a `[key, unlockTime, cost]` pool — skull-pack 2, watcher/brute/blinker 3, spider 4, dread 6, serpent 8 — with per-type caps and unlock gates preserving the onboarding debut order (watcher 25 s … dread 120 s). Deterministic rhythm from toko-drop: every 8th pulse **HEAVY** (1.6×, guaranteed serpent/dread centrepiece), every 4th **SPIKE** (1.5×, 70 % heavies), every 3rd **SWARM** (1.3×, bodies only, 3× tighter stagger), post-intense pulses **breathe at 0.5×**. Totems, thorns and the Leviathan keep their own scripted clocks. Debug: `pulse(n)` / `pulseInfo(n)`
- **hyperdagger v3.7 — parity pass (crimson hand, dread skulls, reactive floor):** fourth dagger tier at 70 gems (`WEAPON[4]` = 26/s stream + homing) mirroring DD's upgrade ladder, with the **first-person gauntlet evolving per level** via `VoxelSprite.retint()` (parsed voxels now keep their palette `key`; `GAUNTLET_TIERS` rewrites just those voxels — knuckle glow → red veins → crimson hand). New **DreadSkull** enemy (Skull IV analog: voxel model `skullDread`, 8 HP, radius 1.3, +2.6 speed, knock 2, score 5, 3 gems, style +8) debuting at t=120 behind a 0.9 s telegraph, cap 2, cadence 40 s → 24 s; joins the pairwise separation set. Floor swapped to a `ShaderMaterial` — grid brightness thumps on the 138 BPM beat scaled by smoothed music intensity (`uPulse`), red flush on trauma (`uRed`)
- **hyperdagger v3.6 — style meter + gamepad:** a Returnal/DMC-flavoured rank system (`STYLE_TIERS` D→SSS, cap 150) rewards chaining — kills add by type, a dash *through* an orb adds +4 (credited once per orb via `o.phased`), gem pickups top it up; `step()` bleeds the meter at `6 + styleVal·0.05`/s so the top tiers stay fleeting. The tier shows as a HUD badge + `×mult` + fill bar (`#style`), folds into the music-intensity signal (0.35 weight), and its run peak is a new death-recap line; only S-and-above rank-ups toast so lower crossings never clobber an enemy-debut announcement. **Gamepad support:** `input.pollGamepad()` runs each frame and feeds the existing `getMove`/`getLookRate`/`firing` getters (left stick move, right stick look-rate, RT/RB fire, A = jump ×2, B/LT = dash, deadzoned + edge-detected) so a controller needs no other plumbing
- **hyperdagger v3.5 — adaptive music layer:** an all-synth A1 minor-pentatonic arpeggio on a lookahead scheduler (16th notes queued ~0.15 s ahead so it never stutters, resyncs after a pause instead of bursting) plays over the drone. Voices layer in with a run-intensity signal (live-threat count + run progress): bass always, arp above ~0.25, hi-hat tick above ~0.5, a lead counter-melody above ~0.75 — so the soundtrack thickens as the swarm builds and thins when you clear it. New MUSIC on/off toggle in the pause menu (`opts.music`, persisted, reconciles live)
- **hyperdagger v3.4 — milestone announcements:** every enemy debut now gets an authored first-encounter moment — a 2.2 s named toast (THE WATCHERS / THE BRUTES / THORNS BENEATH / THE THIEVES / THE BLINKERS / THE SERPENT / THE PALE SERPENT / CROWNED SKULLS / THE SPLITTERS) plus a low two-note dread stinger and a trauma pulse; THE LEVIATHAN RISES re-announces on every boss respawn. One-per-run keyed in `announced{}`; new `debug.setTime()` warp for testing the schedule
- **hyperdagger v3.3 — difficulty pacing + death recap:** onboarding spread across the first ~150 s so mechanics debut one at a time (watcher 25 s, brute 45 s, thorn 60 s, spider 75 s, blinker 90 s, serpent 100 s, Leviathan 150 s — replacing the old 40-70 s five-enemy pile-up); every recurring spawn now tightens its cadence toward a floor as the run goes on instead of holding flat; skull cap 42→46. Death screen now recaps the run: what killed you, a kill breakdown by enemy type, dagger level reached, and your last 10 run times (`hyperDaggerHistory` in localStorage)
- **hyperdagger v3.2 — symmetric sticks + minimalistic shooting:** tap EITHER stick to jump/double-jump (flick-dash was already on both); a second finger tapping an occupied half jumps too. Shooting is now automatic whenever you're moving — on desktop and touch alike — with hold-LMB / hold-look-stick as the standing-still fire; standing motionless without input is the only way to hold fire
- **hyperdagger v3.1 — roster round two:** **Blinker** (glitch shard that jump-cuts 6-8 u toward the player every 2.2 s with a debris puff + zap at the departure point — anti-kiting), **ghost serpent** (every second serpent; pale rings armored from the front, daggers *clink* off — damage only from behind/side, which also counters lazy homing), **spider egg sacs** (laid every ~10 s, pulse for 4 s then hatch two skulls; 2 HP targets, harmless to touch)
- **hyperdagger v3 — Returnal-inspired bullet-hell pass:** new `bullets.js` orb pool (slow readable red orbs, culled past the arena); **Watcher** drone (orbits at mid range, eye-burn telegraph + warning tick, 3-orb aimed fan — the game's first ranged enemy), **totem orb rings** (flat, jumpable expanding waves every 7 s), **Thorn** floor spikes (red sigil under your feet → white voxel spike; move, dash, or jump), **Splitter** skull → 3 mini skulls. Dash gets projectile i-frames (phases through orbs, never bodies) + 0.25 s input buffering. Fixes: gem pool 40→80, totems can't spawn overlapping, look-sensitivity option in the pause menu, fullscreen + landscape lock on touch play, notch-safe HUD (`viewport-fit=cover` + safe-area insets)
- **hyperdagger v2 — feel + monochrome restyle:** faster all around (move 12 u/s, dash 30 u/s on a 1 s cooldown, hotter streams, quicker enemies); **double jump** replaces the shotgun (Space ×2 / tap the left touch stick); **flick either stick to dash** in the flick direction; on-screen DASH/JUMP buttons removed; new ⏸ **pause menu** (Esc on desktop) with persisted options — game speed ×1/1.25/1.5, FOV 70/80/90, smear/shake/chroma toggles. Art rebuilt **black & white with dark red as the single contrast color** — grey band sky with a red ember horizon, white-on-black grid that simply stops at the arena edge (barrier ring removed), white daggers/blade, red eyes/veins/gems/telegraphs
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
