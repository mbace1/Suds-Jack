# PROGRESS — Toko Move (store path)
**Updated:** 2026-10-25 19:46 EET  
**Lane:** Toko Move store readiness (itch.io)  
**Owner direction:** ROADMAP.md (2026-10-24) — publish Toko Move first as pure transport simulator; Piritori is a later separate spin-off.

## Goal
Shippable Toko Move on itch.io under the contract-approved title. No Piritori assets, characters, or systems. A stranger can open the page, understand the first shift, and finish a week.

## Done
- v2.64: current HSL network + rival walk fix + itch packaging (`tools/package-itch.mjs`) + store-build seam (`js/platform.js`) + `test/itch.cjs` (package boots and plays alone).
- v2.65: stranger first minutes measured and fixed (`test/stranger.cjs`); store stills + cover from the packaged build; LIVE hidden on store title.
- v2.66: Finnish language pass (DOM translator, `test/lang.cjs`); draft in game register, not native read.
- v2.67: ship bar (S1–S7) measured and held by `test/ship.cjs` — storage throws, mid-shift pause, landscape/320px, sound + mute, credits, full week by tapping, frame cost profiled. Implemented + tested on main.
- Page kit: `store/ITCH.md` (settings, copy, controls, credits, media commands). Changelog is `VERSIONS.md`.
- Packaging produces a self-contained zip (~74 files, 0.47 MB) that refuses paths outside the package.

## Next
Owner actions outside the code (roadmap M6–M7):
1. Real-phone pass on LIVE (HSL MQTT) — M6. Do not sell LIVE on the itch page until this is done.
2. Native Finnish read of the language strings.
3. Upload the M2 zip (or butler) to itch.io and wire the page from `store/ITCH.md`. Confirm the live embed matches the packaged build.

Small optional polish while waiting (safe, one-lane):
- Rent decision: measured at €400 is high (95/90/70% pay); rule now reads €500. Left for owner.
- Any remaining English strings the lang gate still flags after a native read.

## Exit
- `node toko-move/tools/package-itch.mjs` produces a zip that `test/itch.cjs` plays alone (already green).
- Owner confirms ship bar on a real phone (including LIVE if the page will mention it).
- itch.io page is live, embed 405×720 portrait, mobile-friendly, credits present, and matches the packaged build.
- VERSIONS.md headline posted as a devlog entry.

## Open questions for owner
- Rent at €400 or raise to €500?
- Pricing and final release status (In development vs 1.0) for the first upload.
- Whether Japanese is wanted before 1.0 (not started).
- Exact itch.io project URL slug.

## Gates run on last change
Ship bar, stranger, lang, and itch package gates were green as of v2.67 (see VERSIONS.md). Re-run before any new claim:
```bash
NODE_PATH=$(npm root -g) node toko-move/test/ship.cjs
NODE_PATH=$(npm root -g) node toko-move/test/stranger.cjs
NODE_PATH=$(npm root -g) node toko-move/test/lang.cjs
NODE_PATH=$(npm root -g) node toko-move/test/itch.cjs
node toko-move/test/shifts.cjs
```

## Notes
- Stay on this lane until Exit or owner redirect. Do not pull Piritori content into the store build.
- One `?v=` token per module.
- Never regenerate hub/versions.json on the deployed tree without `--check`.
- LIVE stays off the store page until M6.
