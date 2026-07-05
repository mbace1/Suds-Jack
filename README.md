# Toko Drop — v114

Twin-stick bullet-hell arena shooter built with Three.js and Web Audio.

## Play

Live at **[mbace1.github.io/Suds-Jack/toko-drop/](https://mbace1.github.io/Suds-Jack/toko-drop/)**

## Controls

|  | Move | Aim / Fire | Dash | Pause |
|---|---|---|---|---|
| **Keyboard** | WASD | Hold LMB toward target | Space | ESC |
| **Touch** | Left stick | Right stick | Release right stick | Top-centre tap |
| **Gamepad** | Left stick | Right stick (auto-fire) | A / bumper / trigger | Start |

On-screen joysticks hide automatically when a gamepad is in use. **E** — toggle eye style.

Two arena orientations, switchable on the title screen:
- **Portrait** (22 × 36) — upright mobile play
- **Landscape** (38 × 22) — Steam Deck and sideways mobile

A connected gamepad defaults to landscape automatically, unless you've picked an orientation yourself.

## Modes

**Arcade** *(default)* — waves run back-to-back with no interruption.  
**Roguelike** — choose an upgrade card after every wave cleared. Toggle on the title screen.

Death returns you to the title screen so you can start a fresh run.

Your **personal bests** (score, deepest wave, longest time) are saved locally and shown on the title screen — beat any of them and the death screen flags it with a ★ badge.

## Enemies

13 enemy types: blobs, cubes, and specialists.  
Variants include **elite** (2× HP, 1.2× scale), **elite-lite** (1.5× HP), **twins**, and **groups**.

Waves pulse in intensity rather than running flat:
- **Swarm** (every 3rd) — a rush of cheap, fast enemies bursting in tight
- **Spike** (every 4th) — heavy 1.6× budget
- **Boss** (every 8th) — a boss-scaled enemy (3× HP, 1.5× size), 2.5× budget
- **Breather** — the wave after any intense one runs lighter (a brief lull)

Difficulty climbs to its peak by around wave 10, then holds — built for competitive 5–10 minute runs.

Mid-wave **cargo moth convoys** sweep the arena in sinusoidal paths — shoot them for drifting pickup drops.

Dash through a **gate** to detonate it in a burst of shards and claim a powerup drop.

## Upgrades

| Card | Effect |
|---|---|
| +1 HP | Gain one hit point |
| Speed Up | Move 20% faster permanently |
| Fire Rate Up | Shoot 20% faster permanently |
| Bigger Bullets | Bullets 30% larger |
| Dash Refresh | Dash cooldown −0.15 s |
| Nuke | Clear all enemy bullets instantly |
| Pierce | Bullets pass through enemies |
| Magnet | Pickups are attracted to you |
| Shield | Absorbs one hit, resets each wave |
| Dash Boom | Radial explosion on every dash |

## Hit Telemetry

Every run records a damage log: each HP-loss captures the wave, enemy composition, bullet count, active upgrades, and damage source (bullet / melee / poison). Logs are saved locally under `tokoDropHitLog`.

Open the browser console and run:
- `_hitReport()` — formatted analysis with wave-kind breakdown, dangerous enemies, tuning notes
- `_hitLog()` — raw JSON of all recorded sessions

On death, a feedback panel offers quick-pick reasons (some predicted from the run's telemetry — e.g. the enemy that hit you most) plus a free-text box. Feedback is saved locally under `tokoDropFeedback`:
- `_feedback()` — summary of reason counts and written comments
- `_feedbackExport()` — downloads a `.csv` of all feedback entries

## Design Reference

See [GDD.md](GDD.md) for the full Game Design Document with per-section version stamps.

## Changelog

See [VERSIONS.md](VERSIONS.md) for the full version history.
