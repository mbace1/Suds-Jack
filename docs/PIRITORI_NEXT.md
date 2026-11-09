# Piritori Next — Era I playable spine
**Status:** Deferred until Toko Move store path is further along.  
**Canon reminder:** Read DESIGN_AUTHORITY.md first. Do not invent systems that contradict locks.

## Locked product direction (do not re-open)
- Narrative strategy: city-flow + location markets + authored encounters + rare isometric formation battles.
- Era I (Kallio 2003) is production focus. Era II phase-gated.
- Cut-cardstock + hand-marker visual family.
- Shares only neutral flow-core with Toko Move. No Piritori characters, art, or economy in Toko Move.
- First content package: validated 7-day spine in content/era1-slice-v1.json.

## Suggested next slices (in order, after Move)
Each slice must be playable through the real interface (not window.__pt or similar debug hooks).

1. **Map-first opening**
   - Load kallio-era1-2003-v1.json.
   - Show ordinary people flow and the eight active slice anchors.
   - Player can select a location and see its basic state.
   - Gate: validate-map.mjs + v3-contract.mjs.

2. **7-day spine playthrough**
   - Complete the fourteen blocks/encounters, four mission families, six crew, five offers.
   - Choices alter at least one of: access, relationship, cash/debt/stock, crew condition, local pressure.
   - Gate: validate-slice.mjs + v3-state.mjs + v3-playthrough.cjs (real UI).

3. **Formation battles that can be lost**
   - One 2v2 and one 3v3 using front/middle/back rows.
   - Battle is part of its parent mission (does not charge an extra block).
   - Loss has persistent consequences but does not soft-lock the campaign.
   - Gate: v3-battle.mjs + fight.mjs.

4. **Market + crew persistence**
   - Known offers, cash, debt, stock, crew roster survive across blocks.
   - Larger loads raise robbery risk.
   - Gate: market.mjs.

5. **Visual fidelity pass**
   - Runtime art matches ART_BIBLE cut-cardstock / hand-marker baseline.
   - Use visual-reference-fidelity skill and art/v3/manifest.json as the register.

## Exit for this lane
Owner can start from the hub, complete the Era I slice on phone and desktop, and name concrete feel or clarity problems. Gates above are green on the exact commit that was played.

## Open questions (do not decide unilaterally)
- Exact public framing for the spin-off title and itch slug.
- Any remaining owner overrides that should be recorded in DESIGN_AUTHORITY or DECISIONS.md.
- Whether the current prototype’s fight panel and map camera already satisfy UX_SPEC or need a recorded override.

Keep updates in the lane’s PROGRESS.md. Do not expand into Era II until the Exit above is met.
