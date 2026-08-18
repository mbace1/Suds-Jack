# Hyper Dagger as a platform

End goal: the coolest browser home for **fast FPS skill games** — not one mode, a stack.

## Modes (now → later)

| Mode | Reference | Job |
|------|-----------|-----|
| **PURE** | Devil Daggers | Fixed spawn spine, one-touch, edge death, gem thieves |
| **HYPER** | Hyper Demon | Draining clock, dash, REAP, aggression |
| **TRUCK** (later) | Clustertruck | Track + physics chaos, still first-person speed |

## Shared core (do not fork per mode)

- Player body: Quake accel, hop, dagger-jump, look stack (mouse/pad/touch)
- Dagger gunfeel: tap burst / hold stream
- Voxel enemies + software raster look
- Input layer, audio, smoke gate, offline SW
- Mode flags only toggle rules (death, dash, director, timer)

## Rule

Ship PURE pillars until the 0–180s test passes. Then HYPER aggression. TRUCK only after the core feels inevitable.
