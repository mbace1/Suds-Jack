# PROGRESS — Toko Move (store path)
**Updated:** 2026-10-25 20:15 EET  
**Lane:** Toko Move store readiness, then content  
**Owner direction:** ROADMAP.md (2026-10-24) — publish Toko Move first.  
**New direction (2026-10-25):** Better playability on mobile phone and tablet. More content: new missions, more walking. Later a new city.

## Goal
Shippable Toko Move on itch.io, then deepen the Helsinki loop so a phone or tablet session feels better and has more to do. No Piritori assets.

## Done
- v2.64–v2.67: current network, rival fix, itch packaging, stranger first minutes, Finnish draft, full ship bar (including landscape + 320 px). Implemented + tested on main.
- Walking already exists: major-street network (`hubs-walking.js`), OSM street paths where the extract has them (`walkpath.js`), local knowledge of visited stops, walking events, and the courier drawn along the street (v2.55).
- Content already in: event deck, hand-offs, regulars, city days, kit, week with rent, rival.
- Page kit and packaging ready.

## Next
**Immediate (store Exit, still first):**
1. Real-phone LIVE check (M6). Do not sell LIVE until done.
2. Native Finnish read.
3. itch.io upload of the packaged zip + page from `store/ITCH.md`.

**After upload — content phase (owner, 2026-10-25):**
1. **Mobile / tablet playability pass** (measure first, then fix). Phone and tablet viewports beyond the existing 320 px / landscape ship-bar items: touch targets, sheet vs map balance, zoom/pan feel, one-handed reach, landscape tablet layout, safe areas. Gate with a real-device or high-fidelity emulator playthrough that a stranger can finish without precision taps.
2. **More walking.** Expand the useful walking graph (more streets that matter, clearer when walking beats waiting, walking missions that use the street network). Keep the rule that a walk is a real path or a named abstraction, not free movement.
3. **New missions.** Add to the existing event/hand-off system rather than a second mission engine. Short, seeded, replayable cards or chain jobs that use walking, cargo, and regulars. Measure that random-but-sane bots still finish ≥ 40%.
4. **Later: a new city.** Only after the Helsinki loop is deeper. Requires a new city pack in the same shape as `cities/helsinki.json` + ground layers, and a city-select seam that does not break the current Helsinki build.

## Exit
- Store: packaged zip plays alone, owner confirms phone, itch page live.
- Content phase Exit (later): owner plays a phone and a tablet session and names what improved; at least one new walking-heavy mission and one new event family are in the deck and held by the shift gates; Helsinki remains the default.

## Open questions for owner
- Rent €400 or €500?
- Which mobile pain points to hit first (touch targets, map pinch, sheet height, tablet landscape)?
- Preferred first new-city candidate (if any), or keep Helsinki only for now?
- How much walking should be “mission” vs optional shortcut?

## Gates
Re-run before any claim:
```bash
NODE_PATH=$(npm root -g) node toko-move/test/ship.cjs
NODE_PATH=$(npm root -g) node toko-move/test/stranger.cjs
NODE_PATH=$(npm root -g) node toko-move/test/lang.cjs
NODE_PATH=$(npm root -g) node toko-move/test/itch.cjs
node toko-move/test/shifts.cjs
```

## Notes
- Store path remains the current Exit. Do not start the content phase until the upload is done or the owner explicitly redirects.
- New content must stay inside the existing systems (events, walks, jobs, city data). No second mission engine.
- One ?v= token per module. Canon and ROADMAP outrank code.
- LIVE stays off the store page until M6.
