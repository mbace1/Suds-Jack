# PROGRESS — Toko Move
**Updated:** 2026-10-31 10:16 EET  
**Lane:** Helsinki content first (main focus), store in parallel, Nagoya later  
**Owner direction:** ROADMAP.md (2026-10-24) — publish Toko Move first.  
**Priority (2026-10-25, clarified):**
1. **Main focus:** more missions to unlock, more ways to move, different strategies, bigger inventory, other challenge types. Easy to approach, hard to put down. UI/touch clarity supports this.
2. **Nagoya (and later cities) only after the Helsinki map is a real game, polished and working nicely.**
3. **Platform order:** mobile first, tablet second.

## Goal
Make the Helsinki map a real, polished, mobile-first game that is easy to start and hard to put down. Then (and only then) begin Nagoya. Store upload can happen in parallel once the phone pass is done.

## Done
- v2.64–v2.67: network, packaging, stranger first minutes, Finnish draft, ship bar. On main.
- Walking, events, hand-offs, regulars, kit, week+rent, rival, city days exist.
- City pipeline is data-driven. Helsinki is the only playable city. Nagoya / New York / Tokyo are planned (CAMPAIGN.md).
- **Mobile clarity pass started (2026-10-31):** first job now shows a short instructional hint (“Tap a job below. Then tap the lit tram to board.”) and the first available offer is marked primary (stronger border/background). Job rows raised to 56 px on narrow screens. No gameplay change.

## Next
**Main focus — Helsinki content (mobile first):**
1. **Real-phone measurement** of the new hint + primary row. Confirm the next tap is obvious and targets feel good.
2. Further UI clarity if the phone pass still shows problems (zoom rail discoverability, sheet vs map balance).
3. Unlockable missions and progression.
4. More ways to move and real strategic differences.
5. Bigger inventory that changes decisions.
6. Other challenge types beyond the basic three-delivery shift.
7. Tablet layout and touch only after the phone version feels good.

**Store (parallel, not blocking content):**
- Real-phone LIVE check, native Finnish read, itch.io upload when ready.

**Nagoya (blocked):**
- Do not fetch the pack or write the definition until the Helsinki map is polished and working nicely on mobile (owner call).
- When it starts: real pack, `cities/nagoya.city.js`, Meijō loop / direction choice, reusing the improved systems.

## Exit
- Helsinki main-focus Exit: owner plays on a phone and says it is clearer, more varied, and hard to put down; at least one unlock path and one new challenge type are gated and green. Tablet is secondary.
- Nagoya start: Helsinki map is a real polished working game (owner call). Then pack + definition + one playable shift.
- Store: zip plays alone, phone confirmed, itch page live (can happen before or after content Exit).

## Open questions for owner
- After a phone play of the new hint + primary row, what still feels unclear?
- What should unlock first (missions, walking, inventory, challenge types)?
- What does “polished and working nicely” mean for the Helsinki map?

## Gates
```bash
NODE_PATH=$(npm root -g) node toko-move/test/ship.cjs
NODE_PATH=$(npm root -g) node toko-move/test/stranger.cjs
NODE_PATH=$(npm root -g) node toko-move/test/lang.cjs
NODE_PATH=$(npm root -g) node toko-move/test/itch.cjs
node toko-move/test/shifts.cjs
```

## Notes
- Content on Helsinki is the main focus. Do not start Nagoya until the Helsinki map is polished and working nicely.
- Mobile first, tablet second.
- New systems stay inside existing verbs and city-data shape.
- One ?v= token per module. The job-board and index.html changes need a token bump on next real release.
