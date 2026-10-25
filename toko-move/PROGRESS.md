# PROGRESS — Toko Move
**Updated:** 2026-10-25 22:13 EET  
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

## Next
**Main focus — Helsinki content (mobile first):**
1. UI clarity + touch pass on phone: obvious targets, short instructions that fade, less basic feel. Measure on a real phone first.
2. Unlockable missions and progression.
3. More ways to move and real strategic differences.
4. Bigger inventory that changes decisions.
5. Other challenge types beyond the basic three-delivery shift.
6. Tablet layout and touch only after the phone version feels good.

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
- Which phone UI/touch problems are worst right now?
- What should unlock first (missions, walking, inventory, challenge types)?
- What does “polished and working nicely” mean for the Helsinki map (specific systems, or a play session you’re happy with)?

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
- One ?v= token per module.
