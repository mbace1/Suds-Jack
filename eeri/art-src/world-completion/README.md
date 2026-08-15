# Eeri world-completion payoff pack

This pack turns the already-approved golden-bolt purpose into a strong end-of-world moment: **nine golden bolts build the world's building**.

## Clock-out sequence

1. Eeri runs through the world gate — no button.
2. Camera/frame settles on the world's construction for a short authored beat.
3. The building shows the cumulative number of parts earned, 0–9.
4. Newly earned parts land one at a time, bottom-up, using the same crafted build language as the three-phase flags.
5. At 9/9 only, the `lit` state switches on and the whole construction gets one warm completion response.
6. The next world opens regardless of count.

## Persistence

- Golden bolts persist per world and survive retry/replay.
- A previously earned part never un-builds.
- The completed/partial building becomes a skyline landmark in later worlds.
- No count gates the next world.

## Asset contract

`building_wN_v1.glb`: sibling nodes `part0`…`part8` plus `lit`. Each cumulative count must make a readable structure; no single part may be required for the silhouette to make sense.
