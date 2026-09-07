# EERI — World 3/4 greybox test pass

Status: **playtest scaffolding**, intentionally easy to replace.

## Goal

Get EERI 3-1 through 4-3 addressable and structurally testable before spending engineering time on the planned cherry-picker and floodlight-rig rides.

The six rooms use only mechanics already in Worlds 1–2 / the Gizmo Lab. Visual dressing owns no collision.

## World 3 — Forest clearing and digs

- **3-1 — The Cut Bank:** tarp / springy floor as the level idea; forest-cutbank feel; excavator + bank as the temporary ride payoff.
- **3-2 — The Timber Lift:** hoists become the main vertical route; existing span stands in for placing a felled log.
- **3-3 — Root Works:** tarp + hoist + known enemies; crane/wall is the temporary world-peak ride.

Visual anchors come from the approved World-3 Library cutouts: hollow log/root tunnel and stump/felled-log clearing. Keep broad empty windows around gameplay.

## World 4 — Evening site under lights

- **4-1 — The Night Shift:** conveyor-belt level in a grey loading-dock/service-yard composition.
- **4-2 — The Lit Scaffold:** vertical work-height rhythm against a blue multi-bay warehouse exterior.
- **4-3 — Last Lights:** full-kit exam; a large blue/orange gantry-crane silhouette owns the final screen.

Owner source art supplied 2026-08-16 fixes the World-4 language: cool blue/grey card and corrugation, timber structure, orange/yellow safety hardware, warm amber work lights, hazard striping, loading bays and gantry machinery. The large source PNGs have baked black backgrounds, so the current sidecar uses clean procedural architecture plus transparent Library accents (work lamp, barrier lamps, cable reel). Replace those planes with final alpha-prepped cutouts without changing level data.

## Rules for this pass

- No new gameplay mechanic hidden in dressing.
- No collision from artwork.
- 100 ordinary bolts + 3 golden bolts per level.
- Midway checkpoint.
- Machine payoff in the back half.
- World-ending big flag + gate only on 3-3 and 4-3.
- Layout tuning comes before collectible choreography/polish.

Run the structural gate with:

```sh
node eeri/test/world34.mjs
```
