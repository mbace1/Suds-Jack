# Toko Drop — Roadmap

Goal: evolve Toko Drop from a live playtest build into a **public 1.0**
— a polished, shareable arcade game at mbace1.github.io/Suds-Jack/toko-drop/ —
then deepen it with post-1.0 content.

Everything ships through the normal release flow (PR + squash into `gh-pages`,
VERSIONS.md entry, smoke/syntax gates, deploy verification); nothing here
blocks bug fixes or small requests. VERSIONS.md stays the record of what
actually shipped — items are deleted here as they land.

**Standing constraints (do not violate):**
- No build step; everything runs as plain ES modules.
- No CDN/runtime dependencies — vendor everything (`toko-drop/vendor/`).
- Classic mode never interrupts between waves (GDD §2 boundary): screens,
  choices, and reward beats belong to Roguelike mode exclusively.
- **No background music, ever** (GDD §10): SFX, synth stingers, and the
  announcer ARE the audio identity.
- New file paths carry `?v=` cache tokens from day one (v118/v119 lesson) —
  and go into BOTH `scripts/bump-version.sh`'s file loop and `sw.js`'s
  precache list.

*Shipped so far: M1 groundwork (v126), tutorial hints + share (v127),
offline PWA (v128), perf heuristic + fixes (v129), daily seed (v130),
daily leaderboard (v131), fresh-device/i18n sweep (117-key parity, en/ja/fi
verified). See VERSIONS.md.*

---

## M1 — Balance from telemetry

*Gate: real playtest runs landing in the feedback inbox — **waiting on
played runs (SEND & CONTINUE) and optionally the Sheets deployment**.*

- **Sheets endpoint swap** (user step): deploy `scripts/feedback-sheet.gs`
  per its header, paste the `/exec` URL into `SHEET_ENDPOINT`
  (`toko-drop/js/main.js`) — unlimited submissions; Formspree remains the
  fallback until then.
- **Difficulty pass driven by data** (inbox records + `_hitReport()`
  telemetry). Knobs, all single numbers:
  - SMASH TV wave budget (+40%), mob pulse size/gap (3 / ~2.5 s)
  - shooter budget share (35%) and cap curve (1 + wave/3, max 5)
  - WARDEN hp/aura (5 / 4.5), boss-escort count/timing
  - graze margin/value (0.55 / +25)

## M2 — Public 1.0 (remaining)

- **Leaderboard go-live** (user step): deploy `scripts/leaderboard-sheet.gs`
  per its header, paste the `/exec` URL into `LEADERBOARD_ENDPOINT`
  (`toko-drop/js/main.js`). Until then daily runs show no board UI.
- **Real-device pass** (user step): one session each on a phone (portrait +
  landscape, install-to-home-screen, offline relaunch) and a controller.
- **itch.io page** (user-owned account; deliberately last): page linking or
  embedding the Pages build; README/landing polish alongside it.

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
