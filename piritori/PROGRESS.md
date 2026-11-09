# PROGRESS — Piritori (Era I)
**Updated:** 2026-10-25 19:57 EET  
**Lane:** Piritori Era I playable spine  
**Owner direction:** DESIGN_AUTHORITY.md (active). Deferred until Toko Move store path is further along. Publishing: separate product after Toko Move; shares only neutral flow-core.

## Goal
Playable Era I slice (Kallio 2003) that a player can complete end-to-end through the real interface: map-first opening, 7-day spine, markets, encounters, and formation battles that can be lost. Respects the design authority hierarchy.

## Done
- Design authority hierarchy locked (DESIGN_AUTHORITY.md → locks → GDD → Art Bible → UX → MAP → content JSON → art manifest).
- Era I map graph and content slice validated on main (`map/kallio-era1-2003-v1.json`, `content/era1-slice-v1.json`).
- Runtime prototypes and gates exist (v3-contract, v3-state, v3-battle, v3-playthrough, fight, market, validate-map, validate-slice).
- Visual baseline: cut-cardstock + hand-marker (ART_BIBLE.md). Approved art library and v3 manifest registered.
- Campaign variants (piritori-c09, piritori-c17) present as experimental slices.

## Next
Smallest high-value slices (after Toko Move store work advances):
1. Map-first opening that loads the twelve-anchor graph and shows ordinary flow; player can select a location.
2. Full 7-day spine playthrough through the real UI (not debug hooks).
3. One 2v2 and one 3v3 formation battle that can be lost and still progress the story.
4. Market + crew persistence across blocks.
5. Visual fidelity check against ART_BIBLE baseline.

## Exit
Owner can start from the hub, complete the Era I slice on phone and desktop, and name concrete feel or clarity problems. Relevant gates green on the exact commit that was played. Era II remains phase-gated.

## Open questions for owner
- Exact public framing and itch slug for the future “Toko Move: Piritori” spin-off.
- Any remaining owner overrides that should be recorded in DESIGN_AUTHORITY or DECISIONS.md.
- Whether current prototype fight panel / map camera already satisfy UX_SPEC or need a recorded override.

## Gates to run before claiming progress
```bash
node piritori/map/validate-map.mjs
node piritori/content/validate-slice.mjs
node piritori/test/v3-contract.mjs
node piritori/test/v3-state.mjs
node piritori/test/v3-battle.mjs
NODE_PATH=$(npm root -g) node piritori/test/v3-playthrough.cjs
node piritori/test/fight.mjs
node piritori/test/market.mjs
```

## Notes
- Stay on this lane once started; do not expand into Era II until Exit.
- Canon documents outrank code. Record any deliberate override.
- Do not pull Piritori content into the Toko Move store build.
- One ?v= token per module.
