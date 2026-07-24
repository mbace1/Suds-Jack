# Toko Drop — Game Design Document

> **Current version: v13** · Living document — section stamps show last meaningful update.  
> Changelog in [VERSIONS.md](VERSIONS.md) · Player-facing summary in [README.md](README.md)

---

## 1. Concept *(v1)*

**Genre:** Twin-stick swarm-survival arena shooter *(v198: the movement
game — CLOSE COMBAT + FLUID — is the default; the classic bullet-hell
arsenal is the OPTIONS opt-out)*  
**Platform:** Browser (Three.js + Web Audio) — portrait mobile primary, keyboard/mouse desktop secondary  
**Session length:** 10–25 minutes  
**Tone:** Arcade-kinetic. No story. Satisfying movement, readable chaos, escalating pressure.

**One-line pitch:** Survive waves of goo swarms that dodge your gun, school
like fish, and burst into revenge rings when they die — picking upgrades
that let you bend the rules.

---

## 2. Core Loop *(v4)*

```
Title screen
  └─ Start run (new seeded PRNG)
       └─ Wave → enemies spawn over 30 s
            ├─ All enemies dead + timer elapsed → Wave Clear
            │    ├─ [Roguelike ON]  Choose 1 of 3 upgrade cards → next wave
            │    └─ [Roguelike OFF] Straight to next wave (Arcade)
            └─ Player dies → Game Over screen (2.8 s) → Title screen
```

**Roguelike mode** is the default. Players opt into pure Arcade via a toggle on the title screen (persisted to `localStorage`).

**Design boundary (fixed rule, agreed 2026-07-09):** classic/arcade mode has
**no between-wave interruptions** — no screens, choices, or reward beats;
waves flow into each other uninterrupted. The between-wave upgrade layer
belongs to Roguelike mode exclusively. Non-interrupting feedback (fading
banners, sounds, HUD meters) is fine in classic; anything that pauses play
or asks for input between waves is not.

---

## 3. Arena *(v11)*

| Property | Value |
|---|---|
| Shape | Rectangle, portrait-optimised |
| Half-width X | 11 units (22 total) |
| Half-depth Z | 18 units (36 total) |
| Floor | Animated grid shader — teal/purple pulse |
| Border | Glowing edge line at y = 0.02 |
| Obstacles | Gate pairs (from wave 3+) — see §8 |
| Camera | Position (0, 27, 21) · Look-at (0, 0, −3) · FOV 60° |
| Fog | Near 42, far 80 (atmospheric haze on far wall) |

The arena is intentionally narrower than deep so it fills a portrait phone screen. Enemy spawn positions follow an ellipse matching the arena proportions (HALF_X × 0.85, HALF_Z × 0.85).

---

## 4. Player *(v12)*

### Movement
| Stat | Base | Upgrade |
|---|---|---|
| Speed | 6 u/s | +20% per Speed Up card |
| Dash speed | 26 u/s | — |
| Dash duration | 0.18 s | — |
| Dash cooldown | 0.75 s | −0.15 s per Dash Refresh card |

Dash grants full invincibility frames. During dash: ghost trail (7 blue afterimages), opacity flicker, squash-stretch spring.

### Shooting
| Mode | Behaviour |
|---|---|
| SINGLE | One bullet per fire pulse |
| BURST | Three bullets 0 / 120 / 240 ms apart |
| SPREAD | Five-shot fan (±20° spread) |

Fire rate base: 0.09 s. Reduced by Fire Rate Up (×0.8 per card) and fire-rate powerup (×0.4 for 8 s).  
Player bullets: green (0x44ff88), glow trail, 24 u/s.

### Health & mercy
- **Max HP:** 3 (base) — increased by +1 HP upgrade cards  
- **Mercy i-frames:** 1.2 s after any real hit (flicker visible)  
- **Shield upgrade:** absorbs one hit silently; recharges each wave start  
- **Death:** triggers 2.8 s game-over countdown, then title screen

### Visual feedback
- **Hit flash:** red emissive on player goo material for 0.25 s  
- **Hit vignette:** red radial gradient at screen edges for 0.32 s  
- **Invincible boost:** granted by Invincible powerup (3 s, no flicker)

---

## 5. Enemy Roster *(v6)*

### Blob types (goo shader, animated wobble)
| Name | Notes |
|---|---|
| GLOBBO | Basic melee chaser |
| SPITTOR | Ranged, single shots |
| FANNER | Ranged, fan burst |
| WEEVA | Weaving movement |
| SPLITTA | Splits into children on death; fires death-burst ring |

### Cube types (MeshPhongMaterial, no shader)
| Name | Notes |
|---|---|
| YELA_CUBE | Melee chaser, leaves slime trail |
| ORANGE_CUBE | Ranged |
| SLUDGE_CUBE | Leaves poison zones; visual sludge ribbon trails |
| REDD_CUBE | Splits into REDD_MINI children |
| PURP_CUBE | Melee; splits into PURP_MINI children |

### Specialists
| Name | Notes |
|---|---|
| TORO | Fast melee dasher; extra shake on contact during dash |
| BAMBU | Segmented; lobs telegraphed AoE bombs |
| PYRA | High-priority ranged specialist |

### Variants (applied at spawn, wave ≥ 2)
| Variant | HP | Scale | Frequency |
|---|---|---|---|
| Normal | 1× | 1× | 3 in 7 |
| Elite | 2× | 1.2× | 1 in 7 |
| Elite-Lite | 1.5× | 1× | 1 in 7 |
| Twin | pair | 1× | 1 in 7 |
| Group | 3–4 cheap | 1× | 1 in 7 |

BAMBU and PYRA are exempt from HP multipliers (they use custom HP systems).

---

## 6. Wave System *(v12)*

### Budget formula
```
budget = floor((4 + wave × 2.8) × modifier)
modifier: boss wave = 2.5 ×  |  spike wave = 1.6 ×  |  normal = 1.0 ×
```

### Wave types
| Condition | Type | Notes |
|---|---|---|
| wave % 8 === 0 | Boss | 2.5× budget; guaranteed top-tier enemy at t=0 with 3× HP, 1.5× scale |
| wave % 4 === 0 (not boss) | Spike | 1.6× budget |
| Otherwise | Normal | — |

Boss wave guaranteed enemy priority: TORO → PYRA → BAMBU → PURP_CUBE (whichever is unlocked).

### Enemy unlock gates (minWave)
Wave 1: GLOBBO, YELA_CUBE, SPITTOR, FANNER  
Wave 2: ORANGE_CUBE, WEEVA  
Wave 3: SLUDGE_CUBE, BAMBU, SPLITTA  
Wave 4: REDD_CUBE  
Wave 5: PURP_CUBE, PYRA  
Wave 6: TORO  

### Speed scaling
```
speedMult    = min(1 + (wave−1) × 0.16, 3.2)
intervalMult = max(1 − (wave−1) × 0.11, 0.26)
```

### Cargo convoy *(v7)*
One convoy per wave, spawning 12–24 s in. Always sinusoidal sweep (amp 3–8 u, freq 0.7–1.7 Hz). Each moth killed drops a drifting random powerup (7 s lifetime). Silent — no overlay or HUD indicator.

---

## 7. Upgrade Cards *(v10)*

Shown between waves in Roguelike mode. Player picks 1 of 3 random cards from the pool. Pool is not depleted — same card can appear multiple times.

| Card | ID | Effect |
|---|---|---|
| +1 HP | `hp` | `player.maxHp++; player.hp++` |
| Speed Up | `speed` | `_speedMult × 1.2` |
| Fire Rate Up | `firerate` | `_fireRateMult × 0.8` |
| Bigger Bullets | `bigbullets` | `playerBulletScale × 1.3` (cap 3.0) |
| Dash Refresh | `dashcd` | `_dashCDMult − 0.15` (floor 0.2) |
| Nuke | `nuke` | Clear all active enemy bullets instantly |
| Pierce | `pierce` | Bullets pass through enemies (per-bullet `_hitIds` Set) |
| Magnet | `magnet` | Pickups within 9 u drift toward player; speed ∝ proximity |
| Shield | `shield` | Absorbs 1 hit silently; recharges at each wave start |
| Dash Boom | `dashboom` | Fires 12 radial bullets on every dash start |

---

## 8. Pickups & Powerups *(v5)*

Dropped by: cargo convoy kills, gate detonation, random wave floor spawns.

| Type | Color | Effect | Duration |
|---|---|---|---|
| `hp` | Red | +1 HP (capped at maxHp) | Permanent |
| `firerate` | Pink | Fire-rate × 0.4 | 8 s |
| `weapon_burst` | Cyan | Switch to BURST mode | Until replaced |
| `weapon_spread` | Gold | Switch to SPREAD mode | Until replaced |
| `invincible` | White | Full invincibility | 3 s |

Weapon mode resets to SINGLE on `startGame()` but persists within a run. Pickups drift, bob on y-axis, expire after 9 s (convoy drops: 7 s).

---

## 9. Gates *(v1, FX v12)*

Spawn from wave 3. One gate per wave. A gate is two posts with a laser beam between them (4 units wide).

- **Enemy contact:** laser deals 1 HP to any enemy touching it (0.5 s cooldown, triggers `onKill`)
- **Player dash-through:** detonates gate — 14-shard teal burst, camera shake, pickup sound, spawns one floor powerup at gate centre. Posts remain as scenery.
- Gate position: random within `HALF_X × 1.5` / `HALF_Z × 1.5`.

### 9b. Secondary objectives & anti-hazards *(v133)*

Gates proved the pattern: an optional in-action objective that rewards a
deliberate detour. Two more layers on the same axis (both fully optional,
non-interrupting per §2):

- **BOUNTY** — every 3rd wave (from 4, never boss waves) the first arrival is
  marked with a gold ring + 8 s countdown. Kill it inside the window →
  `1500 + wave×100` (×2 under a multiplier) + a guaranteed weapon pod at the
  body. Expired = it's just an enemy again. A *prioritization* problem.
- **CLEANSE foam zone** — the anti-thesis of the poison hazards: a foam pool
  you *want* to stand in. Every 4th wave (from 6, seeded — daily runs match).
  Holding your ground inside for ~1.2 s (progress decays 1.5× when you leave)
  detonates a full-screen enemy-bullet cleanse paying `500 + 10/bullet`.
  Standing still in a bullet-hell IS the price. A *positioning* problem.

---

## 10. Audio Design *(v10)*

All sounds procedural via Web Audio API (`AudioSystem` in `audio.js`). No files, no format dependencies. (One deliberate exception since v121: the recorded title-intro clip `audio/announcer-intro.mp3`, behind its own INTRO VOICE toggle.)

**The game is music-free by design (decided 2026-07-11).** SFX, synth stingers, and the announcer ARE the audio identity — do not add background music. Any future audio work extends the stinger/announcer palette instead.

| Event | Sound |
|---|---|
| Player shoot | 920 Hz square, 0.07 s |
| Enemy hit | 500 Hz square, 0.07 s |
| Blob death | 420 Hz sine decay → 75 Hz |
| Cube death | 380 Hz square → 55 Hz + noise burst |
| TORO death | 95 Hz sawtooth → 38 Hz + noise |
| BAMBU death | 480 Hz triangle → 190 Hz |
| PYRA death | 1300 Hz sine → 550 Hz (crystal) |
| Player hit | 100 Hz sawtooth + noise |
| Player die | 65 Hz sawtooth + heavy noise |
| Pickup / gate | 3-note ascending arpeggio (G4→C5→E5, 60 ms apart) |
| Wave clear | 4-note ascending arpeggio (C4→E4→G4→C5, 90 ms apart) |

---

## 11. Visual Language *(v12)*

| Element | Approach |
|---|---|
| Blob enemies | Custom goo ShaderMaterial — vertex wobble, analytic normal perturbation, Fresnel rim, SSS pulse |
| Cube enemies | MeshPhongMaterial — flat, angular, intentionally less "alive" than blobs |
| Player | White goo shader (wobble=0, smooth), Kirby black eyes with reflection dots |
| Cargo moths | Golden goo body + translucent wing planes with sine-flap animation |
| Player bullets | Green (0x44ff88), glow trail (0.22 u step, 0.45 opacity) |
| Enemy bullets | Red (0xff4422), glow trail (0.28 u step, 0.55 opacity) · Fat lobs: orange |
| Death FX | Bouncing chunks (squash-on-land spring), splash puddles, poison zones |
| Dash trail | 7 blue ghost afterimages (GHOST_INTERVAL 0.03 s, GHOST_LIFE 0.28 s) |
| Hit vignette | Red radial gradient at screen edges, 0.32 s fade |
| Floor | Animated grid shader — teal/purple pulse, non-square UV frequencies (17.1×/28×) |

---

## 12. HUD *(v13)*

| Element | Position | Notes |
|---|---|---|
| WAVE N | Top-left | 14px bold monospace |
| Wave progress bar | Below wave | 100 × 3 px, gold → green at 100% |
| Score | Top-right | 14px bold monospace |
| ×N STREAK | Below score | Flashes on kill, gold |
| HP dots | Left, y=48 | Filled red / empty grey, 9 px radius |
| ✶ SHLD | Below HP dots | 11px, blue — visible when shield active |
| Weapon mode | Right of HP | Shown when not SINGLE |
| Enemy HP bars | World-projected | 36 × 5 px above each enemy |
| Damage numbers | World-projected | −1, yellow, 0.6 s float |
| HI score | Top-right sub | 12px, faint — only when > 0 |
| v13 | Bottom-left | 10px monospace, 0.18 opacity |
| SEED XXXXXX | Bottom-right | 10px monospace, 0.18 opacity — only during active run |

---

## 13. Seeded Runs *(v5)*

Each run generates a `runSeed` (24-bit hex, shown bottom-right and on game-over). The `mulberry32` PRNG is initialised from this seed and used for all randomised decisions within the run: wave composition, variant selection, spawn delays, gate position, convoy parameters. Sharing a seed reproduces an identical run.

---

## 14. Balance Notes *(v12)*

- **Budget cap:** `list.length < 18` — no wave exceeds 18 spawn entries regardless of budget  
- **Wave 1 is always Normal** — variants are disabled until wave 2  
- **Boss supersedes Spike** — if wave % 8 === 0, it's a boss, not a spike, even if wave % 4 === 0  
- **Dash Boom fires player bullets** — they hit enemies normally, don't trigger game-over on player  
- **Pierce per-bullet tracking** — `_hitIds` Set is not cleared between enemy waves; safe because enemy instances are new objects each wave  
- **Shield absorb order:** shield blocks before HP loss; no shake increase, mercy i-frames still granted via `player.hit()` path in non-shield scenario only

---

## 15. Backlog (retired → roadmap)

Forward planning lives in **`TOKO_DROP_ROADMAP.md`** (four milestones toward
public 1.0 and beyond, agreed 2026-07-11). This section is retired — accepted
ideas go on the roadmap, and VERSIONS.md records what shipped.

### BOTFLY (v88)

Flying bot: hovers at ~y1.5 on translucent wings, holds a mid-range band
around the player while drifting tangentially, and fires a **slow homing
shot** every 3.8s (speed ×0.62, turn rate 1.8 — outrunnable and dashable).
Charge-up emissive flicker 0.5s before each shot. No contact damage (it
flies). Unlocks wave 5, cost 4. With its arrival, **Homing (H/H2) left the
player weapon-pod drop pools** — homing is enemy-exclusive; the HOMING
firing modes remain implemented but unreachable.

---

*GDD maintained alongside `VERSIONS.md`. Update the relevant section(s) and bump the version stamp when design changes.*

<!-- Mode identity rule (2026-07-14, user): a mode/cabinet's identity =
visuals + structure (rooms vs scrolling vs fixed screen) + gameplay/terrain
elements + SOUND. The scrutiny checklist lives in TOKO_DROP_ROADMAP.md M5. -->
