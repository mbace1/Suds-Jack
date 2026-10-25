# PROGRESS — Toko Move (store path)
**Updated:** 2026-10-25 21:34 EET  
**Lane:** Toko Move store readiness, then content  
**Owner direction:** ROADMAP.md (2026-10-24) — publish Toko Move first.  
**Content direction (2026-10-25, refined):**
1. UI and touch areas are not always clear. Needs better clarity and instructions. Overall UI is quite basic.
2. More missions to unlock, more ways to move, different strategies. Bigger inventory. Other types of challenges. Goal: easy to approach, hard to put down.
3. Four cities already planned (CAMPAIGN.md): Helsinki → Nagoya → New York → Tokyo. Plan the later cities with the bigger new features.

## Goal
Shippable Toko Move on itch.io, then deepen Helsinki so a phone or tablet session is clearer, more varied, and harder to put down. Later cities inherit the improved systems.

## Done
- v2.64–v2.67: network, packaging, stranger first minutes, Finnish draft, ship bar (including basic 320 px / landscape). On main.
- Walking, event deck, hand-offs, regulars, kit, week+rent, rival, city days all exist.
- City pipeline is data-driven (`js/city-build.js`). Helsinki is chapter 1. Nagoya / New York / Tokyo are defined as what their networks teach; packs not yet fetched.

## Next
**Immediate (store Exit):**
1. Real-phone LIVE (M6).
2. Native Finnish read.
3. itch.io upload.

**After upload — Helsinki content phase:**
1. **UI clarity + touch pass.** Make targets obvious, add short contextual instructions that fade, improve the basic look without breaking the sparse Mini Metro-ish register. Measure on phone and tablet first.
2. **Unlockable progression.** Missions and movement options that open over time (more walking routes, inventory capacity, new challenge types). Different viable strategies, not one optimal loop.
3. **More ways to move and bigger inventory.** Expand useful walking and carrying so choices compound across a week.
4. **Challenge variety.** Beyond the current three-delivery shift: timed, restricted, multi-stop, or inventory-pressure variants that still use the same board.

**Later cities (plan now, build after Helsinki feels deeper):**
- Nagoya: pure-subway grid + Meijō loop (direction choice).
- New York: express vs local.
- Tokyo: density and choosing not to ride.
Plan the bigger features (unlocks, inventory, challenge types, clearer UI) so they travel with the city data rather than being Helsinki-only.

## Exit
- Store: zip plays alone, phone confirmed, itch page live.
- Content phase: owner plays phone + tablet and says the UI is clearer and there is more reason to keep going; at least one unlock path and one new challenge type are gated and green. Helsinki remains default.

## Open questions for owner
- Which UI clarity problems are worst (touch size, missing labels, sheet vs map, first-run instructions)?
- What should unlock first (more walking, bigger bag, new challenge types, more missions)?
- Any preferred order or emphasis among Nagoya / New York / Tokyo once Helsinki is deeper?

## Gates
```bash
NODE_PATH=$(npm root -g) node toko-move/test/ship.cjs
NODE_PATH=$(npm root -g) node toko-move/test/stranger.cjs
NODE_PATH=$(npm root -g) node toko-move/test/lang.cjs
NODE_PATH=$(npm root -g) node toko-move/test/itch.cjs
node toko-move/test/shifts.cjs
```

## Notes
- Store path remains current Exit until upload or explicit redirect.
- New systems must stay inside existing verbs and city-data shape. No second mission engine.
- Four-city plan lives in CAMPAIGN.md; later cities get the improved features, not a separate design.
- One ?v= token per module.
