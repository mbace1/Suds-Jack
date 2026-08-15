# Eeri collectible presentation pack

Source-only presentation rules for the collectible hierarchy already in DESIGN.md:

- common bolts — `x/100`
- golden bolts — `x/3`
- blueprint/world collectible — one per world, unlocks secret art

The goal is to answer **“I picked it up; where did it go and why did it matter?”** without stopping the run.

## Hierarchy

### Common bolt
Tiny and repeatable. The object pops, a small metal chip travels toward the bolt counter, and the number answers. Multiple bolts collected quickly aggregate instead of spawning a stream of HUD clutter.

### Golden bolt
Clearly rarer: one ring, slightly longer travel, and the `x/3` badge answers. Still no gameplay pause.

### Blueprint / world collectible
Distinct silhouette and longest presentation. It lifts for a beat, folds/slides toward the world-collectible slot, then a small framed-card acknowledgement may appear because this collectible really does unlock secret art. The player keeps control.

## Rules

1. Never freeze gameplay for a pickup.
2. Common pickups may not produce full-screen effects.
3. Pickup flights are representational—the real object is already collected at contact.
4. Rapid common pickups coalesce within 220 ms.
5. The HUD destination must already exist before a flight is enabled; otherwise use only the local pop.
6. Reduced motion removes flight arcs and uses local pop + counter pulse.

`collectible-spec.js` holds the timing/budget contract. `collectible-pieces.svg` is reusable source art. The lab previews the three tiers and burst aggregation.
