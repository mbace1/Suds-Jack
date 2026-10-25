# PROGRESS — Toko Move (store path)
**Updated:** 2026-10-25 22:04 EET  
**Lane:** Toko Move store readiness, then Helsinki content, then Nagoya  
**Owner direction:** ROADMAP.md (2026-10-24) — publish Toko Move first.  
**Content direction (2026-10-25):**
1. UI and touch areas are not always clear. Needs better clarity and instructions. Overall UI is quite basic.
2. More missions to unlock, more ways to move, different strategies. Bigger inventory. Other types of challenges. Goal: easy to approach, hard to put down.
3. Four cities planned (CAMPAIGN.md): Helsinki → Nagoya → New York → Tokyo.
4. **Start builds on Nagoya only after Helsinki feels feature-complete.**

## Goal
Shippable Toko Move on itch.io. Then finish Helsinki so it feels feature-complete (clearer UI, unlockable progression, more movement and challenge variety). Only then begin the Nagoya pack and definition. Later cities inherit the improved systems.

## Done
- v2.64–v2.67: network, packaging, stranger first minutes, Finnish draft, ship bar. On main.
- Walking, event deck, hand-offs, regulars, kit, week+rent, rival, city days exist.
- City pipeline is data-driven (`js/city-build.js`). Helsinki is chapter 1. Nagoya / New York / Tokyo are defined by what their networks teach; packs not yet fetched.

## Next
**Immediate (store Exit):**
1. Real-phone LIVE (M6).
2. Native Finnish read.
3. itch.io upload.

**Helsinki content phase (until feature-complete):**
1. UI clarity + touch pass (instructions that fade, clearer targets, phone + tablet).
2. Unlockable progression (missions, movement options, inventory).
3. More ways to move and bigger inventory so strategies diverge.
4. Challenge variety beyond the basic three-delivery shift.

**Nagoya (starts only after Helsinki feels feature-complete):**
- Fetch the pack (GTFS / ODPT — needs real network access).
- Write `cities/nagoya.city.js` definition (anchors, walks, mode table).
- Teach the Meijō loop / direction choice.
- Reuse the improved UI, unlocks, inventory, and challenge systems. No Helsinki-only features.

New York and Tokyo stay planned; same rule — after the previous city feels complete enough to carry the systems forward.

## Exit
- Store: zip plays alone, phone confirmed, itch page live.
- Helsinki feature-complete: owner plays phone + tablet and says the UI is clearer and there is more reason to keep going; at least one unlock path and one new challenge type are gated and green.
- Nagoya start: Helsinki Exit above is met; then pack + definition + one playable shift on the real Nagoya network.

## Open questions for owner
- Which UI clarity problems are worst right now?
- What should unlock first?
- What does “Helsinki feels feature-complete” mean to you (specific systems, or just a play session where you’re happy to stop)?

## Gates
```bash
NODE_PATH=$(npm root -g) node toko-move/test/ship.cjs
NODE_PATH=$(npm root -g) node toko-move/test/stranger.cjs
NODE_PATH=$(npm root -g) node toko-move/test/lang.cjs
NODE_PATH=$(npm root -g) node toko-move/test/itch.cjs
node toko-move/test/shifts.cjs
```

## Notes
- Do not start Nagoya pack or definition work until Helsinki feature-complete Exit is met or the owner explicitly redirects.
- New systems stay inside existing verbs and city-data shape.
- Four-city plan lives in CAMPAIGN.md.
- One ?v= token per module.
