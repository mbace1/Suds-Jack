# Toko Move — next gameplay and features
**Written:** 2026-10-31  
**Lane:** Helsinki content (main focus). Mobile first. Nagoya only after Helsinki is polished.

All features below stay inside existing systems (events, walks, jobs, kit, week, regulars, rival, city data). No second mission engine. Each one is measurable with the existing shift gates before it ships.

## Design rules for new features
- Easy to approach: first shift still teaches the loop in one sentence, then gets out of the way.
- Hard to put down: something compounds across shifts (unlocks, known walks, standing, kit, week money).
- One verb set: pick, wait, catch, ride, get off, walk, deliver. New features bend numbers or add cards, not new controls.
- Seeded and replayable. Bots must still be able to finish ≥ 40%.
- Mobile first. Touch targets stay ≥ 44 px; primary action stays obvious.

## Phase A — Unlocks and more missions (next)
**Goal:** the deck and the bag grow with play.

1. **Unlock gate for encounters.** Some cards (the three new walking/cargo ones, plus 2–3 more) only enter the draw after N on-time deliveries or goodwill threshold. First shift stays simple.
2. **Bigger bag as progression.** Capacity 6 unlocks after a fixed number of on-time deliveries (persisted), not only as a kit choice. Kit can still raise it further.
3. **More walking missions.** 2–3 additional encounter cards that only fire while walking, and one that teaches a new street. Expand `WALK_STREETS` only where a real useful link is missing.
4. **Regular requests.** A regular sometimes asks for a specific cargo size or type. Delivering it raises standing faster. Missing it does not fail the shift.

**Exit for Phase A:** owner plays a phone session and can name at least one thing that opened because they kept playing.

## Phase B — Challenge variety
**Goal:** more than the basic three-delivery shift, still on the same board.

1. **Inventory pressure shift.** One large + two smalls, or a full bag with a drop on the way. Forces a choice about what to leave.
2. **Multi-stop chain.** A hand-off that must be delivered before the original deadline, or a three-stop job that pays more but is tighter.
3. **Restricted mode.** One shift where only trams (or only metro) are allowed, or where walking is free but services are sparse (Quiet Sunday already leans this way).
4. **Timed burst.** A short window (2–3 minutes) with higher pay for on-time, then back to normal. Seeded so it replays.

**Exit for Phase B:** at least two challenge types exist, are gated, and a stranger can finish them by tapping.

## Phase C — Strategic depth and meta
**Goal:** different viable ways to play the same week.

1. **Rival with a personality.** Rival prefers certain cargo or certain lines. Visible on the map and in the end screen. Beating him on his preferred jobs pays the existing +20%.
2. **City day that changes the optimal strategy.** Market Morning already boosts Hakaniemi; add one more lever (e.g. rain slows walking more, or a disruption day that rewards knowing shortcuts).
3. **Week meta that is readable.** Rent, kit choice, and unlock progress visible between shifts without opening a menu. One screen, shapes before words.
4. **Shareable daily that includes unlock progress.** Existing daily already has a share line; add a single glyph for “bigger bag unlocked” or “X streets known”.

**Exit for Phase C:** owner can describe two different ways to play a week that both feel viable.

## Phase D — Later cities (blocked)
Only after Helsinki is a real, polished, mobile-first game.

- **Nagoya:** pure-subway grid + Meijō loop (direction choice). Pack + definition. Reuses unlocks, inventory, challenge types, and UI clarity.
- **New York:** express vs local.
- **Tokyo:** density; choosing not to ride is often right.

Do not fetch packs or write definitions until the Helsinki Exit is met.

## What is deliberately not in this plan
- New verbs (bikes, full trams, doors-closing drama, interchange sprint) — already rejected or measured as weak.
- A second mission engine or quest log.
- Piritori content of any kind.
- Authored geometry presented as real transit.

## Suggested build order (one lane)
1. Unlock gate for the new encounters + bigger-bag progression (Phase A.1–A.2).
2. One inventory-pressure challenge type (Phase B.1).
3. Real-phone measurement after each.
4. Then the rest of Phase A and B, then C.
5. Nagoya only after Helsinki feels polished.

## Gates before claiming any feature
```bash
NODE_PATH=$(npm root -g) node toko-move/test/ship.cjs
NODE_PATH=$(npm root -g) node toko-move/test/stranger.cjs
NODE_PATH=$(npm root -g) node toko-move/test/lang.cjs
NODE_PATH=$(npm root -g) node toko-move/test/itch.cjs
node toko-move/test/shifts.cjs
```
