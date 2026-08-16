# Eeri secret-art scrapbook pack

Blueprints already have a purpose: **one per world unlocks secret art**. This pack gives that reward a presentation that feels like something Eeri found on the worksite rather than a generic image gallery.

## Scrapbook language

- Four physical pages/tabs, one per world.
- Locked page: kraft-paper pocket with the blueprint-shaped slot visible. No padlock icon, price, or requirement list.
- Blueprint collected: the pocket opens and reveals a small set of art-pipeline material — concept, layer study, machine sketch, character/prop development.
- Art keeps its original aspect ratio; no crop is required to fit the UI.
- Captions are tiny and optional. The picture is the reward.
- Secret Art is accessible from the title/game shell after the first page unlocks.

## Source rule

Do **not** commission separate 'gallery art'. The reward must come from the real Eeri art pipeline (`eeri/art-src/` and world libraries). An integration manifest chooses which existing source images are safe/interesting enough to expose. Missing art simply leaves a page with fewer cards; it never blocks progression.

## Interaction

Tap a thumbnail → full image on the same page → tap/back returns. Swipe is optional; buttons/pad must always work. Nothing auto-plays and there is no music dependency.
