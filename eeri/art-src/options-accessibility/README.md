# Eeri pause, options & accessibility pack

A child/parent-friendly shell contract for settings that matter on phone and controller. The pause screen is not a settings dashboard: the first row is **Continue**, then **Restart checkpoint**, then **Level select**. Everything else sits under Options.

## Required options

- SFX volume: Off / Low / Medium / Full.
- Reduced motion: Follow device / Reduce / Full.
- Touch control size: Small / Standard / Large.
- Touch handedness: Standard / Mirrored.
- Language: suomi / English / 日本語.

No difficulty selector, lives, timer, health setting or camera-shake slider is introduced. Eeri's generosity belongs to the game, not to an accessibility menu.

## Safety rules

- Pause freezes game time, hazards and machine work together.
- Restart returns to the current checkpoint; it never deletes collectible progress already banked by the game's own rules.
- Level select shows only unlocked levels and uses the existing `EERI W-L` address scheme.
- Every touch target is at least 44 CSS px.
- Options persist locally and missing storage must fall back safely.
