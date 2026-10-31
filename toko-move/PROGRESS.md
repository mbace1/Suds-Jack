# PROGRESS — Toko Move
**Updated:** 2026-10-31 12:45 EET  
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
- City pipeline is data-driven. Helsinki is the only playable city.
- Mobile clarity pass started (first-job hint + primary row, 56 px rows).
- First content slice: three new encounter cards (walking shortcut, walking hand-off, fragile care).
- **Feature plan written:** `toko-move/FEATURES.md` — Phase A (unlocks + more missions), Phase B (challenge variety), Phase C (strategic depth), Phase D (later cities, blocked).

## Next
**Follow FEATURES.md, starting at Phase A:**
1. Unlock gate so some encounter cards only appear after N on-time deliveries or goodwill.
2. Bigger bag (capacity 6) as a progression unlock, not only a kit choice.
3. More walking missions and one regular-request type.
4. Then Phase B challenge types (inventory pressure, multi-stop, restricted, timed burst).
5. Real-phone measurement after each slice.

**Store (parallel):** real-phone LIVE, native Finnish read, itch upload when ready.

**Nagoya:** blocked until Helsinki is polished and working nicely on mobile.

## Exit
- Helsinki: owner plays on a phone and says it is clearer, more varied, and hard to put down; at least one unlock path and one new challenge type are gated and green.
- Nagoya start: Helsinki map is a real polished working game (owner call).
- Store: zip plays alone, phone confirmed, itch page live.

## Open questions for owner
- After a phone play, what still feels unclear or missing?
- Confirm bigger bag unlocks after a fixed number of deliveries (suggested) vs staying kit-only.
- Preferred first challenge type from Phase B.

## Gates
```bash
NODE_PATH=$(npm root -g) node toko-move/test/ship.cjs
NODE_PATH=$(npm root -g) node toko-move/test/stranger.cjs
NODE_PATH=$(npm root -g) node toko-move/test/lang.cjs
NODE_PATH=$(npm root -g) node toko-move/test/itch.cjs
node toko-move/test/shifts.cjs
```

## Notes
- Content on Helsinki is the main focus. Feature plan lives in FEATURES.md.
- Mobile first, tablet second. Do not start Nagoya until Helsinki is polished.
- New systems stay inside existing verbs and city-data shape.
- One ?v= token per module.
