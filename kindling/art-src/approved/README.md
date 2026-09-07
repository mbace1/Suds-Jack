# Betterment / Kindling approved art handoff

Accepted art handoff through 2026-08-18. These are repo-friendly WebP working copies of the approved source images recovered from the ChatGPT conversation. No new art was generated for this PR.

## Locked visual direction
- crafted 2D illustration first, retro game second
- dark-fantasy bonfire / forest / ruin setting
- side-scrolling left-to-right composition; depth only when supported by explicit art layers
- dark mode canonical
- large readable mobile silhouettes and restrained material noise

## Characters / Meshy
The Art Bible sheets cover Ember, Mossling, Ashling and Moss Knight with:
- male/female variants
- young/adult/elder variants
- colour variants
- 2D idle/walk/run/attack or cast animation strips
- separated-part / rigging notes
- front/side/back/3/4 T-pose or multi-view references for Meshy

## Environment production rule
The latest `layer-breakdowns/` sheets are the preferred production reference. Each module is capped at four stackable layers:
1. background/base silhouette
2. terrain/structure
3. foreground detail/vegetation
4. optional FX/top detail

Do not flatten the assembled preview when building production scenes. Extract/rebuild the individual planes so parallax remains controlled and the crafty-layered read stays close to the approved construction direction.

## Contents
- `art-bible/` — global and per-character Art Bible sheets
- `characters/` — character family overview
- `environments/` — broad environment/prop sheets
- `layer-breakdowns/` — four-layer production breakdowns
- `references/` — approved evening/night/day side-scrolling scene targets
- `ui/` — approved UX element kit reference

## Fidelity note
The committed WebPs are lightweight repository review/reference derivatives of the accepted full-resolution source sheets. They preserve the complete accepted set while keeping this PR browsable. Production cutouts, transparent layers, rig files and final-resolution exports remain later art-pipeline work; these references should not be wired directly into runtime assets.
