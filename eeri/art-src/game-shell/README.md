# Eeri title, level-select & resume pack

Eeri deliberately has **no world map**. The shell therefore has to do three jobs cleanly: start/continue, let a parent or child replay an unlocked level, and expose progress without becoming a meta-game.

## Title hierarchy

- Fresh save: **START**.
- Existing progress: **CONTINUE** (primary), then Level Select, Secret Art, Options.
- Language remains available on the title screen.

## Continue

Continue means the latest unlocked/current level using the canonical `EERI W-L` address. It does not serialize arbitrary mid-jump world state. A browser refresh resumes at the level start (or a durable checkpoint only if the runtime later persists one explicitly).

## Level Select

A simple four-row × three-level list, not a map. Each cell can show:

- `EERI 2-1` address/name
- unlocked / locked
- bolt best `x/100`
- golden slots `●○○`
- small completion stamp

Locked cells do not tease mechanics/art from future worlds. Selecting a level writes/uses the existing URL fragment instead of introducing a parallel level index.
