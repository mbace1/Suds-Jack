# Toko Drop — Roadmap

Goal: evolve Toko Drop from a live playtest build (v125) into a **public 1.0**
— a polished, shareable arcade game at mbace1.github.io/Suds-Jack/toko-drop/ —
then deepen it with a competitive layer and post-1.0 content.

Four milestones. Each ships playable on its own through the normal release
flow (PR + squash into `gh-pages`, VERSIONS.md entry, smoke/syntax gates,
deploy verification); nothing here blocks bug fixes or small requests in
the meantime. Re-visit the ordering after each milestone — VERSIONS.md stays
the record of what actually shipped.

**Standing constraints (do not violate):**
- No build step; everything runs as plain ES modules.
- No CDN/runtime dependencies — vendor everything (`toko-drop/vendor/`).
- Classic mode never interrupts between waves (GDD §2 boundary): screens,
  choices, and reward beats belong to Roguelike mode exclusively.
- **No background music, ever** (GDD §10): SFX, synth stingers, and the
  announcer ARE the audio identity.
- New file paths carry `?v=` cache tokens from day one (v118/v119 lesson).

---

## M1 — Balance from telemetry

*Gate: real playtest runs landing in the feedback inbox.*

- **Sheets endpoint swap**: when the Apps Script from
  `scripts/feedback-sheet.gs` is deployed, paste its `/exec` URL into
  `SHEET_ENDPOINT` (`toko-drop/js/main.js`) — unlimited submissions;
  Formspree remains the fallback.
- **Difficulty pass driven by data** (inbox records + `_hitReport()`
  telemetry). Knobs, all single numbers:
  - SMASH TV wave budget (+40%), mob pulse size/gap (3 / ~2.5 s)
  - shooter budget share (35%) and cap curve (1 + wave/3, max 5)
  - WARDEN hp/aura (5 / 4.5), boss-escort count/timing
  - graze margin/value (0.55 / +25)
- **Refresh the death-screen feedback chips** so they ask about the new
  systems (doors/exits, floor loot, graze, WARDEN) instead of only the old.
- **Verify the OMEGA fight in the SMASH TV fixed room** (30×22) — the boss
  was tuned for larger arenas.

## M2 — Public 1.0

*Presentation + first-run experience. Gate: M1 says the loop is sound.*

- **First-run tutorial hints**: non-interrupting fading callouts (move/aim/
  dash; "dash i-frames don't graze") during a brand-new player's first two
  waves only. Honors the GDD §2 boundary — no popups, no pauses.
- **Share button** on the death screen: `navigator.share` with clipboard
  fallback — score/wave/seed + the game URL. OG/Twitter cards already ship.
- **Offline PWA**: minimal service worker, cache-first over the `?v=`-tokened
  module graph so the installed app works offline; must respect the release
  cache discipline (new token = new cache).
- **itch.io page** (user-owned account) linking or embedding the Pages build;
  README/landing polish.
- **Pre-release sweep**: fresh-device pass (empty localStorage), en/ja/fi
  string review, perf-mode default heuristic via `fpsEMA` on weak phones.

## M3 — Competitive layer

*Daily seed + trust-based leaderboard.*

- **Daily seed**: run seed derived from the UTC date — no server needed.
  DAILY chip on the title next to ROGUELIKE; separate local daily-best;
  death screen marks the run "DAILY" and offers share.
- **Leaderboard**: a second Apps Script sheet endpoint (same pattern as
  `feedback-sheet.gs`): POST initials + score + wave + seed + build on daily
  deaths, GET a cached top-10 for the daily death screen. Trust-based by
  design; light server-side plausibility caps (max score/wave) documented in
  the script header. Fails silent offline, exactly like the feedback sink.

## M4 — Content depth

*Post-1.0, ordered by what M1 data says players engage with.*

- **Graze-chain heat meter** if graze counts show engagement.
- **Visible elite affixes**: behavior modifiers with a readable tell
  (not just bigger/more HP).
- **Second boss archetype**, alternating with OMEGA per boss cycle.
- **SMASH TV floor structure**: the boss room ends a floor → palette shift +
  tougher lattice on the next; bonus room between floors.
- **Announcer variety**: more lines; recorded clips can replace synth speech
  wherever the user supplies audio (the intro-voice ffmpeg pipeline exists).

---

*Maintained alongside `GDD.md` (design truths) and `VERSIONS.md` (what
shipped). When a roadmap item ships, delete it here and let VERSIONS.md
carry the record.*
