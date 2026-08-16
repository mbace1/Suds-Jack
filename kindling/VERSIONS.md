# Kindling — versions

## v4 — 2026-08-16

The mobile UX becomes a real self-care goal product rather than only a reskin.

- **Goal management:** a dedicated goal screen lets the user add/remove goals, write custom goals, and choose presets grouped into Body, Hygiene, Mind, Connection and Daily care.
- **Daily progress truth:** the segmented Today bar now tracks checked goals directly rather than mixing mood/breathing into the visible goal count. The underlying fire still responds to the broader care model.
- **Clear mobile hierarchy:** Today keeps the scene, explicit goal checks, visible `+20 Flames` reward language, a large journey action and direct access to goal management.
- **Journey guidance:** the journey page tells the user how many more goals are needed when they do not yet have 60 Flames.
- **Companion:** the companion page exposes Level/bond and a harmless hello interaction without creating a need meter.
- **Dark first:** dark mode remains the default; parchment is optional.
- **Offline:** v4 UX resources are included in the service-worker shell.
- **Test:** `test/betterment-ux-smoke.cjs` covers mobile navigation, goal checking, Flames, preset goal addition, real destinations, theme switching and overflow.

The underlying v2 state machine remains authoritative for once-only payouts, 04:00 rollover, breathing, errands, journal, collection, growth and local-only persistence.

## v3 — 2026-08-16

The first Betterment UX overhaul. The proven v2 care loop stays in place; a new mobile-first presentation layer makes it read like a game rather than a small utility.

- **Large goal rows** — full-width touch targets, direct action labels, visual goal badges, persistent check states, and a visible `+20 flames` reward language.
- **Today progress** — a five-step segmented bar mirrors the fire's existing daily-care cap and updates immediately as tasks, check-ins, and breathing rounds are kept.
- **Game HUD** — unspent kindling is presented as flames (`1 kindling = 20 flames`) and lifetime care derives a non-punitive companion level/bond readout. No state is lost and no new grind gate is introduced.
- **Mobile-first shell** — large fixed bottom navigation for Today, Journey, Inventory, Reflections, and Companion, plus a dedicated settings entry.
- **Journey / Inventory / Companion views** — real views backed by the existing errand, found-object, growth, and local-state systems rather than dead mock-up buttons.
- **Dark mode first** — the approved dark bonfire direction is the default; an optional parchment mode changes the UI surfaces without touching the pixel scene or user data.
- **Betterment naming** — the app-facing title and copy now reflect the Betterment direction while the implementation folder remains `kindling/` for compatibility.
- **Offline remains first-class** — the v3 UX JS/CSS are added to the app's own service-worker shell while the v2 gameplay modules keep their stable cache token.

## v2 — 2026-08-11

Offline, installable, and reachable by keyboard.

- **`sw.js`** — cache-first, its own version, scoped to this folder. A thing you open once a day, often on a phone and often first thing, cannot need a signal.
- **The precache list cannot drift.** Every entry is fetched by the smoke gate, the page's own `?v=` token is compared with the worker's, and the four `../hub/*` files that give this page its way home are checked against the tokens `hub/shell.js` actually imports.
- **`manifest.webmanifest` + icons**, so it can live on a home screen where a daily thing belongs.
- **The focus follows a view swap** — but only when the last input was a key, so a tap never raises a ring nobody asked for.
- Module tokens moved to `?v=2` together with the worker's cache name.

## v1 — 2026-08-11

The first build. A care companion in one room: you tick off the small real things you did, they become fuel, the fuel keeps a fire, and the fire is the light you see the room by.

- **The room** (`js/room.js`). One 192×128 canvas: hearth, creature, woodpile, two shelves, a door and a window. The light is a measured ramp out of the hearth — how far it reaches across the floor IS the day's tally.
- **The sheet** (`js/state.js`). Six default care lines plus up to fourteen of your own, a five-step check-in, and a streak counted back from today. The day turns at **04:00**, not midnight. Untick freely; the lifetime count only ever goes up.
- **Breathing** (`js/breathe.js`). Four rounds of 4 in / 4 hold / 6 out, paced on the fire itself rather than a second meter. Each completed round is banked, so stopping early keeps what you did.
- **The errand** (`js/errand.js`). Three kindling sends the creature out for 90 seconds of real time; the outcome is seeded at departure and computed on return, so it survives a reload and a closed tab. There is no bad outing.
- **Growth.** Five stages off the lifetime count of small things kept — a spark, a wisp, a tender, a keeper, an elder. Screen time earns nothing.
- **Nothing leaves the browser.** One localStorage key, no account, no network call, no leaderboard.
- `node kindling/test/smoke.cjs` — the gate, driven off game state.
