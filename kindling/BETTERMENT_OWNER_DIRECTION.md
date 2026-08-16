# Betterment — latest owner direction

**Date:** 2026-08-16  
**Status:** newest direction; this file supersedes conflicting recommendations in `BETTERMENT_DESIGN.md`.

## Product

Betterment is a **gamified self-care and habit-tracking app** where real-life mental-health, hygiene and wellness goals nurture a virtual companion.

Use Finch and similar apps as the **feature/category benchmark**, without copying their branding, characters, exact copy, or proprietary visual expression.

Priority feature families:
- clear daily goals and habit checks;
- mood/check-in and reflection;
- breathing / calming actions;
- companion growth and reactions;
- gentle streak/context and visible progress;
- journeys / outings;
- found objects, memories and collection;
- supportive return flow with no punishment for absence.

## UX — mobile first

The UI must be immediately legible on a phone.

- Large touch targets and large retro-styled panels.
- Direct labels: `Drink water`, `Brush teeth`, `Step outside`, `Stretch`, etc.
- Strong Today hierarchy: companion/fire scene → progress → goals → journey/action.
- Explicit checking system on each goal.
- Visible segmented daily progress bar.
- Flames are an understandable game-facing reward language.
- A companion level / bond readout is allowed as **gentle permanent progression**, not a pressure or failure mechanic.
- Journey, inventory, reflections and companion should be real top-level destinations, not dead mock-up buttons.
- Dark mode is required and should be the primary presentation.

## Visual direction — locked target for now

The approved direction is the latest single-screen concept combining the dark bonfire mock-up with the visible goal checking/progress system.

Scene direction:
- dark-fantasy bonfire;
- small friendly monster companion;
- forest and/or castle ruin rather than a cozy hut;
- moonlit/cold environment against warm orange fire;
- ruined arches, trees, banners, moss, simple fantasy props;
- threatening atmosphere without making the companion or self-care loop hostile.

Art construction:
- **layered 2D**, not a 3D diorama/render;
- hybrid of the project's crafty handmade language and retro pixel art;
- clear foreground / gameplay-mid / background planes;
- paper, card, felt, cut-stone and stitched/crafted cues can appear in the illustration;
- retro pixel edges and icon language can sit on top of the craft shapes;
- button surfaces should be comparatively clean and restrained — do not cover every UI surface in heavy fabric/felt texture;
- large shapes and readable silhouettes over small detail noise.

Think: **crafted 2D illustration first + retro game language second**, with modern mobile information hierarchy.

## Superseded earlier calls

Where older notes conflict, the following are no longer instructions:
- avoiding progress bars entirely;
- avoiding all level/XP-like presentation;
- keeping the old tiny utility/list UX;
- the cozy-hut visual setting as the primary world;
- highly textured fabric buttons;
- 3D/diorama-like scene rendering.

## Current implementation priority

1. Code and logic first — stop producing more art drafts unless requested.
2. Ship the mobile-first Today overhaul: large goals, checks, progress, HUD and dark mode.
3. Make Journey / Inventory / Reflections / Companion navigation functional using existing state.
4. Preserve existing local-only storage, offline support, breathing, errands, collection and non-punitive rules.
5. After UX is playable, replace/extend the current room art toward the approved layered 2D dark-fantasy craft/pixel scene.

## Implemented in the current PR

The current Betterment implementation now includes:
- large mobile goal rows with explicit checked states and `+20 Flames` feedback;
- a segmented daily goal-progress bar;
- Flames plus gentle Level/bond HUD;
- functional Journey, Inventory, Reflections and Companion destinations;
- dark mode as the primary theme;
- a dedicated goal-management screen with category presets inspired by the self-care-app category model: **Body, Hygiene, Mind, Connection and Daily care**;
- direct add/remove goal management while preserving the existing local-only state and once-only reward rules;
- custom user-authored goals alongside presets;
- v4 mobile UX resources cached for offline use.

The current daily progress target remains the existing balanced-day target of **five goals**. This is an implementation assumption to confirm with the owner before deeper scheduling/recurrence logic is built.