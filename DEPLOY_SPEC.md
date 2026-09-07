# Building a game for this arcade

For Grok Build, or anything else generating an app that has to land on the
Suds-Jack hub. Written after porting Kindling, so every rule below is something
that actually cost time rather than something that sounds prudent.

The target is **gh-pages**: static files, no server, no environment variables,
no build running at deploy time. A cabinet is a folder.

---

## The five that will bite

**1. Every path is relative. No exceptions.**
The cabinet is served from `/Suds-Jack/<game>/`, not from a domain root. A
root-absolute `/art/camp.jpg` is correct on Vercel and 404s here. Kindling shipped
140 of those and the scene rendered black.

- Vite: `base: "./"`, and build asset URLs off `import.meta.env.BASE_URL`.
- Never write `/assets/…`, `/art/…`, `/fonts/…` in source or CSS.
- One helper for asset URLs, used everywhere, so this is one line to change.

**2. No server. Assume there will never be one.**
No SSR, no API routes, no middleware, no database, no auth. Concretely: not
Nitro, not TanStack **Start** (Router is fine), not Next server components.

If accounts are wanted, they are an *enhancement over* a working local save —
never a requirement. Kindling ported cleanly only because `store.ts` already fell
back to `localStorage` when nobody was signed in. Build it that way from the
start and the port is an afternoon; build it the other way and it is a rewrite.

**3. Ship `dist/`, not the toolchain.**
Commit the built output. `node_modules`, `vite.config.ts` and `package.json` do
not belong on the site. Keep the build small — Kindling is 264 kB of JS and
1.2 MB total, which is fine; a 6 MB bundle for a daily habit app is not.

**4. A precache list cannot be hand-kept if filenames are hashed.**
Generate `sw.js` after the build by walking `dist/`, and derive the cache name
from a hash of that list so a changed byte rolls the cache. A list one name
behind the page is an app that loads online and is blank on a train — this repo
has shipped that twice.

Register the worker on **https only** (`location.protocol === 'https:'`), or a
local dev server serves a stale shell forever.

**5. Two lines make it a cabinet.**
```html
<script type="module">
  import('../hub/shell.js').catch(() => {});
</script>
```
That is the arcade's HUB button, loaded from the site root because it belongs to
the site, not to your app. It must be the deployed `hub/shell.js` — do not vendor
a copy, it drifts.

Then one entry in `hub/games.js`: `id, title, tagline, lineage, tags, controls,
path, accent, art, status`, plus `pad` if the game takes a controller
(`{ui:true}` walks the page's own buttons, which is right for anything built out
of real DOM controls).

---

## What the hub will check

`node test/hub-smoke.cjs` — 166 checks over the floor. The ones that catch new
cabinets:

- every in-repo link resolves 200
- **44 px minimum** on every control
- **WCAG AA** on every text colour
- no horizontal overflow at phone width
- zero console errors on load

Build with real `<button>` and `<a>` elements. That is what makes the game
keyboard-navigable, what lets the gamepad bridge walk it, and what makes those
floors measurable at all.

---

## Things this arcade cares about that a generator will not guess

- **No text baked into images.** The hub is fi / en / ja, and a translated string
  cannot be pulled out of a PNG.
- **Nothing leaves the browser.** No analytics, no fonts from a CDN, no external
  calls. Every cabinet works on a plane, and several say so in their copy.
- **Offline is not optional** for anything opened daily. Precache the shell.
- **`prefers-reduced-motion`** turns decorative motion off and keeps the app
  usable.
- **Copy never scolds.** Kindling's gate literally greps every string the app can
  say for a telling-off, because that is a design rule and not a preference.

---

## The handover that works

A branch with:

```
<game>/dist/**          the built site — this is what gets copied
<game>/README.md        one paragraph: what it is, what it stores, what it needs
```

and, if the source is in another repo, the commit it was built from. Nothing
else is needed and nothing else will be read.

**Commit the files themselves.** Four deliveries into this project, the recurring
failure has been a document describing artefacts that did not travel with it — a
zip whose chunks were truncated, a manifest naming PNGs in no branch, thumbnails
standing in for sheets. If `git show <branch>:<path>` does not print bytes, it did
not arrive.

---

## Art, if you are generating it too

Full detail in `kindling/art-src/NANO_BANANA_PIPELINE.md`. The short version:

- **Ask for 4× the target size**, not 1:1. A model puts a roughly constant number
  of features into a picture whatever size you request, so asking for 320×180
  gets you a 320×180-sized *idea* — few, large, empty shapes.
- **Magenta backgrounds** (`#FF00FF`), keyed to alpha afterwards. A model that
  will not give you transparency will happily give you a flat colour.
- **Quantise in the authoring step.** Colour count is not fixable by re-exporting;
  the delivered sheets measured 3,110–20,073 distinct colours while 74–100% of
  their pixels already sat within 24 of the game's own palette.
- **Never a presentation board.** Labels, captions, frames and card backgrounds
  baked into the image make it unreadable to a cutter, and every sheet delivered
  before the pipeline existed was one.
- If the game is **not** pixel art, most of the above stops mattering — which is
  the real lesson. Kindling's art problems were downstream of a 320×180 canvas,
  and the standalone build solved them by not having one.
