# Toko Live — versions

The public release number, read by `scripts/versions.mjs` into the arcade's
`hub/versions.json`. Toko Live is the room's HOST rather than a cabinet in the
catalogue, so it reaches the generator through the `EXTRA` list beside the
brand — the same route `toko/` takes.

This log starts where the number already was: the host cabinet had `v18`
hand-typed into `hub/toko-cabinet-dom.js` as a DOM string, which is a release
number living in exactly one place that nothing can check. v18 here is that
same claim, moved somewhere the tooling can read it and the gate can hold it to.

## v19 — 2026-09-10

**The menu had two owners, and the fight took the page.** With the brain
modules finally deployed, `/toko-live/` locked up about two seconds after
load: no 404, no page error, nothing in the console — the character simply
never appeared, and even a screenshot timed out, because the renderer's main
thread was saturated. `conversation-plus.js` watched `.tc-menu` with a
`MutationObserver` and re-rendered its starter list whenever anything else
wrote into it; `chat.js` renders that same element. Two owners writing into
one node is a ping-pong at microtask speed. Instrumented, it ran forever:
render five suggestion buttons, watch four of somebody else's replace them,
render five again.

The repair is two rules, and they generalise to any layer that decorates
somebody else's element: **coalesce to a frame and never react to your own
writes** (`requestAnimationFrame` + `takeRecords()`), and **give up** — after
six rounds inside a second and a half the observer disconnects and says so in
the console. A decoration may lose the menu. It may not take the page.

Verified in a browser against the deployed tree: `toko-stage` 91,912 lit
pixels, the approved face 98,816, the portrait 11,528 — where before the fix
`page.evaluate(() => 1 + 1)` timed out.

## v18 — 2026-09-10

The build that was already on the floor: talk to Toko face to face, with the
same local learning brain as the counter — project knowledge, critique,
decisions, status and factual news.
