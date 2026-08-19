# Piritori → Eden — design authority

Status: **ACTIVE**  
Authority reset: 2026-08-19  
Owner: Mikael Haveri  

This file defines which documents and assets control future work. It exists
because the playable prototype, several older briefs, an earlier Art Bible and
the newer approved design library currently disagree. Future implementation
must follow this hierarchy rather than selecting whichever file is convenient.

## Authority order

From highest to lowest:

1. Direct owner decisions recorded after this reset.
2. `DESIGN_AUTHORITY.md`.
3. `GAME_DESIGN_DOCUMENT.md`.
4. `NARRATIVE.md` and `SCREEN_AND_COMBAT_BASELINE.md`.
5. `art-library/APPROVALS.md`, `art-library/CATALOG.md` and the system contracts
   linked from them.
6. `FIGHT_BRIEF.md`, `MAP.md` and `DECISIONS.md`, but only where they do not
   conflict with the documents above.
7. The current runtime, tests and legacy design documents. These are evidence
   and prototypes, not permission to change the design.

When two sources at the same level disagree, stop and record a decision. Do not
silently average them together.

## Locked product direction

- Piritori → Eden is a narrative strategy game combining a visible city-flow
  simulation, location-based market management, authored encounters and rare
  isometric formation battles.
- Era I, Kallio in 2003, is the production focus. Era II, Pasila in 2024–2025,
  remains canon but phase-gated until the Era I slice works end to end.
- The first slice begins with Aatami's small purchase at Piritori and expands
  through recurring people and places rather than opening a complete market
  table immediately.
- Combat supports variable XvX encounters. The first slice concentrates on 2v2
  and 3v3 using front, middle and back rows on mostly invisible 3x3 or 3x4
  formation spaces.
- Toko Move shares the neutral flow engine, not Piritori's adult content,
  factions, economy or narrative data.
- Real Helsinki geography grounds the fiction. Criminal operations, exact
  routes, named groups and actionable methods remain fictional or abstract.

## Active visual baseline

The active visual source is the categorized `art-library/`, not the previous
Art Bible or the current prototype's code-drawn placeholders.

- Broad, low-detail cut-cardstock shapes establish silhouette and volume.
- Torn fibres, imperfect cuts, physical overlaps and shallow layer shadows make
  the construction readable.
- Sparse marker and ink details define faces, joints, folds and highlights.
  Lines should visibly wobble, skip, overshoot or vary in pressure.
- Characters, animals, weapons, foliage, locations and UI belong to the same
  handmade material family.
- The approved hand-ink `v03` character and equipment sets are the main
  baseline. The clean-cardstock `v02` set is the simplification fallback.
- Darkest Dungeon informs contrast, tactical readability, consequence and UI
  weight. It does not create a separate rendered-ink art register, and its
  characters, layouts and assets are not copied.
- Finnish Kallio specificity comes through geography, architecture, practical
  clothing, weather, trams, signs and ordinary residents—not caricature.

The older claim that the map/interiors must be PAPER while fights become a
separate polished INK style is superseded. Battles may be darker and more
dramatic, but they retain the same cut-paper and hand-marker construction.

## Active art status

`art-library/APPROVALS.md` is the approval register.

- **Approved:** modular v03 characters and equipment, v02 fallback, foliage,
  Karhupuisto, formation geometry, responsive command geometry and the Toko
  Slomo narrative-instance baseline.
- **Semi-approved:** Sörnäinen docks, Kallio courtyard v02, props, weather and
  current battle-screen layouts.
- **Inactive:** everything under `art-library/archive/needs-rework/`.

Approval establishes direction; it does not mean every review sheet is already
split, compressed, registered or animation-ready.

## Legacy material

Until Art Bible v1 replaces them, these files are retained only as production
history and reference:

- `ART_BIBLE.md`
- `ART_BRIEF_CONCEPT.md`
- `ART_PROMPTS.md`
- `ART_REQUEST.md`
- `ASSETS.md`
- `CLAUDE_HANDOFF.md`
- `CONTENT_HANDOVER.md`

Their still-useful facts may be migrated into the new Art Bible. Their visual
rules do not override the active library or the hierarchy above.

## Asset exception

Piritori is an explicit exception to the repository's old global “no image
assets” convention. Approved raster and vector assets are source material under
`piritori/art-library/`; optimized runtime derivatives may ship under
`piritori/art/`. Generated review sheets and archived comparisons are not
automatically deployed.

## Direct publishing workflow

There is one owner and one active design agent. Work does not wait for a PR
merge.

1. Make one coherent, reviewable milestone.
2. Validate its documents, manifests, links and relevant runtime gates.
3. Commit approved source directly to `main` with a narrow message.
4. Do not update the playable version for document-only work.
5. For a playable milestone, bump the visible project version and changelog,
   deploy the exact tested files to `gh-pages`, update the hub metadata, and
   verify the live hashes.

The current published prototype is v2. The next playable milestone is v3; Art
Bible and design commits before it remain source milestones rather than false
playable releases.
