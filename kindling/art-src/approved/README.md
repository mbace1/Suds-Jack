# Betterment / Kindling — approved art handoff

This folder is the repo-visible handoff for the **accepted Betterment art created in the ChatGPT art pass**. No new art was generated for this PR.

## Direction locked by these assets

- crafted / handmade **2D layers first**, retro-pixel treatment second
- dark-fantasy bonfire, ruins and forest language
- mobile-readable silhouettes and large UI elements
- side-scrolling / left-to-right journey staging with limited depth
- environment modules should resolve into **no more than four stackable layers** where practical
- character sheets support both 2D animation planning and a Meshy → rig → animation pipeline
- character families include sex, colour and age variation concepts

## Pack

`BETTERMENT_ACCEPTED_ART_REPO_PACK.zip` contains repo-optimised WebP reference copies of the currently accepted sheets and scene concepts:

### World / UX reference
- `cozy_campfire_amid_twilight_ruins.webp`
- `moonlit_campfire_beneath_the_castle.webp`
- `moonlit_monster_campfire_ruins.webp`
- `pixel_art_journey_to_the_hilltop_castle.webp`
- `cozy_pixel_art_fantasy_game_ui_kit.webp`

### Art library / environment
- `pixel_fantasy_environment_art_library.webp`
- `bonfire_camp_pixel_art_environment_sheet.webp`
- `daytime_paths_and_open_areas_sheet.webp`
- `layered_daytime_paths_4layer.webp`
- `layered_ruins_foreground_4layer.webp`

### Character / Meshy / animation
- `pixel_art_character_concept_sheet.webp`
- `betterment_kindling_dark_fantasy_art_bible.webp`
- `ember_character_art_bible_sheet.webp`
- `mossling_forest_ruin_companion_art_bible.webp`
- `ashling_ember_drake_character_sheet.webp`
- `moss_knight_enemy_guardian_art_bible.webp`

## Production use

These are **source/reference sheets**, not final cut sprites or final 3D meshes. When promoting them into production:

1. Extract individual environment pieces into transparent assets.
2. Keep scene modules to background/base → structure → foreground detail → optional FX/top-detail.
3. Keep horizontal traversal readable; do not invent perspective depth that the supplied layers cannot support.
4. For characters, use the turnaround/T-pose concepts as Meshy input guidance, then clean topology, rig, and validate animations before runtime use.
5. Preserve the established Ember / Mossling / Ashling / Moss Knight family silhouettes while using the documented sex, age and colour variants.

The existing gameplay/runtime files are intentionally untouched by this handoff.