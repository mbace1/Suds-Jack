# Eeri machine-control presentation pack

This is not a new control scheme. It makes the **existing two-button/directional scheme readable at the moment a machine takes over**.

The current game has two proven ride reads — excavator and wrecking crane — while World 2 still uses greybox ride proxies. This pack therefore authors the two existing machines and a generic contract future rides must satisfy rather than pretending unshipped machines already exist.

## Mount handoff

1. Before mount: the physical step/seat is the affordance; Ⓑ appears only when in range.
2. During mount: normal foot hints disappear.
3. First seated frame: controlled machine parts get a short material highlight — wheels/drive base plus the active tool.
4. A compact control strip appears for up to 2.5 s, then gets out of the way after the player succeeds once.

## Excavator

`◀ ▶ DRIVE · ▲ ▼ BOOM · Ⓑ HOP OUT`

When the bucket is in dig range, ▼ and the bucket receive the emphasis. The bank is the object being acted on; no detached text panel should compete with it.

## Crane

`◀ ▶ DRIVE · ▼ SWING · Ⓑ HOP OUT`

The ball/cable is highlighted briefly on mount. Once the player has swung successfully the full strip collapses to the action glyph only when near the brick wall.

## Rule for every future ride

A machine may expose at most **one contextual work action at a time**. If a ride needs a menu of machine functions, the ride is too complicated for this game.
