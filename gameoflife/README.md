# The Game of Life

Mini games and interactive stories that always revert to the notion of going
back to nature. Play a small thing on a screen; be handed something real.

> **Share it:** *Small pixel games and stories that always send you back
> outside. Two minutes each — a Roman aqueduct, an arctic tern, a zen teacup,
> a constellation — and after every second one, the game itself rests and
> invites you out to real water, real birds, or a poem in the evening.
> Free, no install, EN/FI/JA:* `https://mbace1.github.io/Suds-Jack/gameoflife/`

**The cycle is the design.** After every second finished experience the hub
rests and opens an *invitation* instead: find moving water, watch wind for a
minute, and in the evening (18:00–05:00 local) read a poem or look at a
painting rather than go out in the dark. Accepting the invitation resets the
cycle; declining leaves it standing for the next visit.

**The hub is zen.** It never shows a menu — it offers ONE experience at a
time, drawn from the registry by the content mix (**70% stories / 20% games /
10% kernels of wisdom**, preferring things not yet visited today), with a
quiet "something else, perhaps" link for a single redraw. A three-dot row
makes the cycle visible: two breaths of play, then the `~` rest. A living
pixel sky above the title follows the real hour — dawn, noon sun, dusk,
stars — so the app itself keeps the day-rhythm it points you toward. The
set-once controls (language, hemisphere, "leave a thought" feedback) live in one
quiet footer below a divider, out of the main column; the explanatory tagline only
greets newcomers (fewer than two lifetime completions), so returning visitors
land on a cleaner header with the offering as the single thing in focus.

**Content crosses cultures.** `js/poems.js` is a pool of public-domain poems
— Bashō, Issa, Shiki, Eino Leino, Wordsworth — each carried in all three
languages, so a Japanese haiku can arrive in Finnish and a Finnish nocturne
in Japanese. Evening invitations rotate through the pool regardless of
source culture.

**The invitations know the season — in both hemispheres.** `nature.js` reads the
month (meteorological seasons): winter days suggest frost and bare-tree
silhouettes, spring days buds and birdsong, summer days barefoot grass and
working shade, autumn days leaf-catching. Evening poems prefer the current
season's verses. `season(date, hemi)` shifts the year half a turn for `'s'`, so
a July visitor in Melbourne is sent to look for frost, not barefoot grass. The
first run seeds the guess from the browser's IANA timezone
(`guessHemisphere()` — a hint, never a claim) and a quiet `seasons north|south`
toggle in the hub footer corrects it for good.

## Playing

No build step. Open `gameoflife/index.html` in a browser, or serve the repo
root with any static server. Live URL (once deployed to `gh-pages`):
`/Suds-Jack/gameoflife/`.

Languages: **suomi / English / 日本語** — auto-picked from the browser,
switchable in the hub, persisted in `localStorage`, and mirrored onto
`<html lang>` so screen readers switch voice and Japanese gets its own glyph
forms.

A fragment names an experience: **`/Suds-Jack/gameoflife/#tether`** opens The
Tether directly, so a link is worth sending to someone. Returning to the hub
clears the fragment again, and it works whether the link is opened cold or
pasted into a tab that is already on the hub. An unknown id just opens the hub.

Two rules keep the app from nagging:

- **Rating is occasional.** The panel appears after the first finish, then only
  every fifth (`store.feedbackDue()`). Anyone with something to say in between
  has the always-present *leave a thought* link in the footer. Submitting an
  empty form records nothing and does not thank you for it.
  See **Where feedback goes** below for making those notes actually arrive.
- **"Not yet" means not this visit.** Putting off a nature invitation holds
  until the next finish, so a language switch or a redraw cannot put the same
  invitation back in your face. Esc or a click outside the panel does the same
  as *not yet*.

Keyboard and touch: a visible `:focus-visible` ring, focus moves to the primary
action after a view swap (for keyboard users only, so a tap never raises a ring
out of nowhere), and **every** interactive element is a 44 px target — the
rating leaves were 26 px and the footer links 14 px tall, which is a word to
read rather than a thing to hit.

**Sound has an off switch.** The chimes and the ambient garden are lovely and a
person on a quiet train still needs to be able to stop them. The footer carries
a `sound on/off` toggle, persisted (`store.soundOn()`). It works by routing every
voice through a single master gain in `audio.js` — nothing may connect straight
to `ctx.destination` — so the mute is total rather than a list of sounds someone
remembered to silence, and any sound added later inherits it for free.

**Strings are gated too.** `check_levels.mjs` scans every `t('…')` an
experience asks for, plus the `exp.<id>.name/desc` each registry entry needs,
and fails if any is missing from **en, fi or ja** — it also checks the three
language blocks agree with each other. This exists because First Lightning
reached production rendering `lt.s1` as its story text and `lt.wait` as its
button: `t()` falls back to returning the key, and a raw key is still a
non-empty string, so nothing downstream noticed.

**Contrast meets WCAG AA.** The muted-on-dark palette had nine failures, the
worst being the seasons label at **1.92:1** — effectively invisible to a lot of
eyes. Text greys moved to `#8d8165` and the primary button to `#4e6839`
(cream-on-green was 3.87:1, now 5.02:1). The hierarchy that used to come from
making things nearly unreadable now comes from size. Contrast and target size
are both measured in the smoke gate, so a future re-tint cannot quietly undo it.

**Nothing opens frozen.** Every experience is already moving on its first
screen — dawn mist crossing the trunks in `forest`, steam off the waiting tea in
`cup`, midges in the July light in `berry`, dust turning in the void in `seam`
and `gears`, the hedge stirring in `hedge`. Thirteen of the twenty-two used to
open on a still picture, which reads as a broken page while you are deciding
whether to stay. For the `cached()` scenes the motion is a **live layer drawn
after the blit**, so the performance work is untouched — wrapping a scene in
`cached()` without lifting its moving parts out is exactly how this regresses,
so the smoke gate samples each first screen and fails on any that does not
change. It iterates `__gol.debug.ids()` (the live registry, never a hardcoded
list — a hardcoded one silently skipped two new experiences and both were
frozen) and takes **three samples at irregular gaps**, because two evenly
spaced samples can land on the same phase of a slow motion and call a live
scene dead.

**The page centres on the middle.** The title stays anchored at the top and
everything below it floats to the centre. In an experience the scene lands
**just above the vertical midpoint** with the words beneath it: the gap above is
computed rather than centred (`50vh − canvas height − 36px`), because centring
the whole block left the canvas ~100px too high. It is gated behind
`min-height: 700px` — on a 667px phone that placement costs a scroll, and fitting
on screen beats hitting the midline.

**Green is the accent.** Headings and highlights are `#8faf6a` rather than the
old gold; this is an app about going back outside and the identity colour should
say so. Gold remains where it belongs — inside scene art.

**The layout holds still.** Story beats run from ~90 to ~340 characters, and
sizing `.exp-text` to the short ones made the Continue button walk up to 190 px
up and down the screen between taps — you had to re-aim every time. Six lines
are now held open, so the action row stays put. A short viewport (a phone held
sideways) gets its own rules: the 3:2 scene alone used to be *taller* than a
360 px-high screen with the choices 150 px below the fold, so under
`max-height: 560px` the scene is capped at `38vh` and everything fits unscrolled
(it pays for the 44px touch targets rather than shrinking them).

**Accessibility floor.** `#app` is a `<main>`; `.exp-text` is an
`aria-live="polite"` region (marked centrally in `startExperience`, not in 22
modules) so a screen reader is told when the story says something new; the scene
canvas is `aria-hidden` because the text is the channel that can actually be
followed; the tab title names the experience you are in. `prefers-reduced-motion`
stills the decorative hub header — one frame of the current hour, held — while
the experiences keep animating, since there the movement *is* the content.

## Where feedback goes

**One line of setup, and it is not done yet.** Create a form at
[formspree.io](https://formspree.io) (or anything that takes a JSON `POST` and
answers with CORS headers) and paste its URL into `ENDPOINT` at the top of
`js/feedback.js`:

```js
let ENDPOINT = 'https://formspree.io/f/xxxxxxxx';
```

That is the whole configuration. Until it is set, the app behaves exactly as it
always did — notes are kept in the visitor's own `localStorage`, nothing is
sent, and **no promise of delivery is shown to anyone**, because making one
would be a lie.

Once set:

- The panel gains one quiet line saying where the note goes. Telling someone
  before they write is the minimum this app owes them.
- A note that cannot be delivered — endpoint down, rate-limited, offline — is
  **kept in an outbox**, the player is told it will go later rather than
  thanked, and `flush()` drains it on the next visit, one at a time so a
  still-broken endpoint costs one request rather than a burst.
- Every note is *also* kept locally regardless, so `__gol.debug.feedback()`
  stays the complete record.

Console handles for trying it without deploying: `__gol.debug.setEndpoint(url)`,
`__gol.debug.outbox()`, `__gol.debug.flush()`.

A Google Form would need its per-question `entry.NNNN` field ids and cannot
confirm delivery — Google sends no CORS headers, so the browser can only fire
the request blind. Formspree is the easier fit.

## Current experiences

| id | kind | name | shape |
|----|------|------|-------|
| `aqueduct` | game | The Stone River | Visual story of Roman aqueducts → rotate-the-stones channel puzzle (3 levels) → *go find real water flowing downhill* |
| `forest` | story | The Forest Path | Branching pixel walk → guided four-breath pause → *take the walk for real* |
| `tern` | story | The Longest Summer | An arctic tern's pole-to-pole migration, two choices, one astonishing true fact → *follow a real bird out of sight* |
| `cup` | wisdom | A Cup of Tea | Nan-in's overflowing bowl — press and *hold* to pour a dithered Raku chawan past full, the cyan excess cascading over the lip and off the table → *empty a moment under the sky* |
| `hanami` | story | Under the Blossoms | Hanami from Emperor Saga's court to Edo's riverbanks; mono no aware is the learning → *find one thing on a tree that will be gone in two weeks* |
| `berry` | story | The Right to Roam | A Finnish blueberry summer teaching jokamiehenoikeus, rights and their quiet duties → *carry one thing out of your nearest everyone's-place* |
| `stars` | game | The Night Compass | Trace the Big Dipper (Otava / 北斗七星) star by star, then follow its pointers to Polaris → *go find one real star tonight* |
| `maple` | story | The Year of the Old Maple | One tree through four seasons — spring unpacks, autumn reveals, winter waits ready → *adopt a tree and visit it once per season* |
| `plate` | story | The Silver Plate | Paris 1838: run the exposure, watch the crowd erase itself, meet the first human ever photographed → *sit still two minutes in a busy place* |
| `seam` | story | The Golden Seam | Gather a shattered tea bowl from the void, then honor the break in glowing kintsugi gold → *trace a repaired object's history for a minute* |
| `dots` | story | The Four Dots | Padua 1610: pass the nights watching four specks beside Jupiter refuse to hold still, then meet the first moons of another world → *find the brightest non-Moon light tonight* |
| `glass` | game | The Glass Plate | Palo Alto 1878: release Muybridge's horse, the tripwires fire twelve cameras, one frame proves all four hooves airborne — then spin the stills into a zoetrope → *blink-freeze a running animal* |
| `wait` | wisdom | Stand and Wait | A misted hillside: press once, then stand while the fog thins and an old pine resolves, fireflies lifting into the void — you cannot hurry it → *stand at a tree's base for three minutes* |
| `lichen` | wisdom | The Lichen | A bare stone greens over with dithered sage lichen if you leave it alone; touch it and the growth recoils — glowing spores lift into the void → *press a hand to moss for thirty seconds* |
| `cloud` | story | The Cloudberry Patch | A midnight-sun mire, ripe lakka, and a bear's track leading to your patch; the finest cluster asks to be left — companion to The Right to Roam → *leave a beautiful thing where it is* |
| `ice` | story | The Ice Core | Drill down through banded glacier ice, reading each layer as a year of trapped sky (soot, ash, ancient air that glows cyan and breaks the frame) → *imagine your square of earth 100 years ago* |
| `trace` | game | Trace the Chaos | Draw your own constellation from a field of stars; a dithered purple nebula blooms around what you connect, then you name it — the sky was never arranged → *find and name your own star pattern* |
| `gears` | game | The Bronze Gears | Crank the 2,000-year-old Antikythera mechanism through the months until the Sun and Moon hands meet the lunar node and it predicts an eclipse → *watch a second hand make one full circle* |
| `cairn` | game | The Cairn | Balance three irregular stones into a trail marker on a dusk fell — land each near the balance line or it topples, patiently, until it stands → *balance two real rocks and leave them* |
| `downhill` | game | Water Downhill | Tilt four stone ledges so a trickle chains all the way down and pours off the frame in cyan — water takes the first opening you give it → *pour water on a real slope and watch it choose* |
| `tether` | story | The Tether | Paris 1783: cut the rope and the ground lets go — Paris turns into a map, embers eat the linen, and the brazier throws sparks past the frame; the first humans ever to fly free → *look down from the highest place you can walk to* |
| `hedge` | story | The Living Wall | Count the woody species along thirty paces of an English hedge (repeats teach that it's *kinds* you count) — Hooper's rule dates it at ~700 years, older than the church behind it → *read the oldest living boundary near you* |
| `seed` | wisdom | The Seed | Plant one seed and wait through the day/night cycle — growth cannot be hurried → *plant something and let it take its own time* |
| `lightning` | story | First Lightning | Philadelphia 1882: open the shutter on a storm roof and wait; the plate keeps what the eye cannot, and lightning turns out to be shaped like a river → *watch the next storm from a window and count to the thunder* |
| `whale` | story | The Whale Fall | Ride a forty-tonne body three kilometres down into water that has never been lit, and stay fifty years while it becomes a town of a hundred species → *look under something fallen and see what is already eating it* |
| `pando` | story | The Trembling Giant | Pick out four separate aspens on a Utah hillside, then watch the ground light up: one root system, 47,000 stems, one tree → *find two trees that might be one* |

## Visual standard (2026-07 master doc)

New experiences follow the owner's art direction (see
`ideas/2026-07-master-ideas.md` + reference art in `ideas/ref/`): 16-bit
scenes floating in a pure black void as **irregular jagged vignettes** (`plate`/`seam`/`dots`) or **cinematic
letterboxed widescreen** (`glass`/`tether`), muted graphic-novel environment tones, and
luminescent **cyan/gold** for interactive elements that **break the frame**
into the void. `plate`/`seam`/`dots` are the pilots; existing experiences migrate
gradually. Shared `pixel.js` now gives every scene **crisp defined sections** (a 1px
darker seam between `bands()` colours) and optional **outline edges** on `disc`/`rect`
(a defined rim), plus a warm `EMBER` contrast accent and `EDGE` ink in the palette.
For reference-grade scenes it also provides **halftone dithering** (`bayer` +
`rampDither` for stippled tonal ramps) and `softDisc` (feathered vignette halos).
`seam` was rebuilt first to full reference fidelity (dithered Raku glaze, gold
veins, cyan overflow, matching `ideas/ref/kintsugi-overflow.png`); `dots` also
carries the toolkit — a cool halo behind the eyepiece, a dithered glass interior
in the lens, and a luminous cyan wash under the escaping orbits; `wait` is
built to `ideas/ref/horizon-pine-vignette.png` — a dithered blue vignette on the
void, a pale halftone fog that burns off to reveal the pine, and green fireflies
that drift past the frame; `ice` reads a dithered ice cylinder whose ancient air
glows cyan; and `trace` is built to `ideas/ref/constellation-nebula.png` — a
gold constellation you draw yourself over a dithered purple nebula that blooms
around it. (`plate` keeps its original clean jagged vignette —
the halo/dither pass muddied it, so it was reverted; the toolkit is opt-in per
scene, not automatic.)

New content should keep the registry near the 70/20/10 story/game/wisdom mix.

## Performance: cache the static layer

Dithered art is expensive — a full-screen `rampDither` pass is one `fillRect` per
pixel, and a reference-grade scene can paint ~18k of them. Repainting that every
frame drops a mid-range phone into single-digit fps, and almost none of it changes
between frames.

`PixelScreen.cached(key, drawFn)` is the fix: it runs `drawFn` into an offscreen
canvas once, then blits it every frame until `key` changes. Helpers work unchanged
inside the callback (`cached` retargets `this.ctx` for the duration), so caching a
scene is a matter of wrapping its static art and keying on whatever actually
changes:

```js
scr.cached(`base:${found.size}`, () => { lane(); hedge(); tally(); });
marker(now);          // only the live layer runs per frame
```

Scenes that use it: `wait`, `gears`, `lichen`, `hedge`, `seam`, `ice`. Two rules
learned the hard way:

- **Split static from animated properly.** Anything that moves has to come out of
  the cached callback (`gears` keeps the radially symmetric gear *bodies* cached and
  redraws only teeth and spokes; `lichen` caches the crust and keeps the pulsing
  apothecia live).
- **Sample `bayer()` at the cell index, not the pixel.** Drawing in 2px cells while
  calling `bayer(x, y)` at even coordinates only ever reaches 4 of its 16 threshold
  values — all low — which collapses a stipple into hard-edged blobs. Use
  `bayer(x >> 1, y >> 1)`.

Profiling recipe: Playwright + CDP `Emulation.setCPUThrottlingRate(4)` (≈ a
mid-range phone), a phone viewport, and a wrapped
`CanvasRenderingContext2D.prototype.fillRect` counting calls per frame. Use a
**fresh page per scene** — a leaked rAF loop from a previous scene silently inflates
every number after it.

## Architecture (what a new experience needs)

```
gameoflife/
  index.html            shell + all CSS
  js/
    main.js             zen hub (one weighted offering), routing, rest-cycle, overlays
    i18n.js             every user-facing string, fi/en/ja (en is the fallback)
    poems.js            cross-cultural public-domain poem pool, all three languages
    palette.js          single source of truth for all colours
    pixel.js            PixelScreen: 192×128 canvas upscaled with hard pixels
    storage.js          localStorage state: completions, cycle counter, feedback
    nature.js           invitation picker (rotating, evening-aware)
    audio.js            gentle WebAudio kit (plink/step/chime/water/breath)
    experiences/
      aqueduct.js       each experience exports { id, start(host, ctx) }
      forest.js         ctx = { t, audio, onComplete }; start returns { destroy }
```

Adding an experience is three edits: a module in `js/experiences/` (exporting
`id` and a `kind` of `story`/`game`/`wisdom`), one entry in `REGISTRY` in
`main.js`, and its strings (all three languages) in `i18n.js`. Everything
else — the offering draw, completion tracking, feedback, the rest cycle —
comes for free.

## Testing loop

Two scripts live in `test/` and gate every greenlight:

```sh
node gameoflife/test/check_levels.mjs   # aqueduct levels stay solvable (no deps)
node gameoflife/test/smoke.cjs          # 18-check headless run-through (needs playwright + its Chromium)
```

The smoke test serves the repo root itself, drives the hub in all three
languages, plays into both experiences, forces the day and evening interludes,
and fails on any console error. If `playwright` is installed globally, point
`NODE_PATH` at the global `node_modules`.

Everything is also inspectable from the console via `window.__gol`
(same convention as `__dc` / `__hd` in the sibling projects):

```js
__gol.debug.start('aqueduct')   // jump straight into an experience
__gol.debug.showInterlude()     // preview the current nature invitation
__gol.debug.setLang('ja')       // flip language live
__gol.debug.feedback()          // dump collected feedback entries
__gol.store.getState()          // raw persisted state
```

Feedback is deliberately minimal: 1–5 leaves + optional free text, stored
locally under `golState.feedback`. Reviewing a playtest = ask the tester to
paste `__gol.debug.feedback()`.

## Contributing ideas (stories, games, graphics)

`ideas/TEMPLATE.md` holds fill-in templates for the four content types —
story, game/puzzle, wisdom kernel, and graphics/scene notes — matched to the
70/20/10 mix. Two ways to deliver an idea:

1. **Paste it into a Claude session** — a filled template, a fragment, or
   three loose sentences; any of the three languages.
2. **Commit a markdown file to `gameoflife/ideas/`** on any branch and
   mention it in a session.

Rules of thumb: every idea needs its *nature revert* (the real-world thing it
sends the player to do); wisdom sources and poems must be public domain;
graphics are described in words or mood references — everything is drawn in
code at 192×128 from `palette.js`, no image assets.

## Content pipeline (beta → main → live)

1. New experiences and refinements are developed on `claude/*` beta branches.
2. Playtest via the testing loop above; iterate on the branch.
3. **Greenlight**: content that feels right is merged to `main`.
4. **Deploy**: the published site is served from the `gh-pages` branch (a
   separate curated site root) — copy `gameoflife/` onto `gh-pages` to go
   live at `/Suds-Jack/gameoflife/`, same as the sibling demos.

Module imports carry `?v=N` cache-busters; bump them together when shipping
to `gh-pages` so clients pick up coherent versions.

## Roadmap — an expanding experience

The owner's 2026-07 master idea queue is **fully shipped** (see
`ideas/2026-07-master-ideas.md`). Remaining ideas, roughly in order; each lands
as its own small versioned addition:

- ✅ **Seasonal awareness**: invitations that know winter from summer — done,
  `nature.js` `season()`, and now **hemisphere-aware** (see below).
- ✅ **A day-shape**: done — `daySlot()` greeting + the living hub sky follow the
  hour, and evening swaps the invitation for a poem.
- ✅ **Sound garden**: done — the hub's ambient bed grows one voice per *accepted*
  invitation (see below). Screen time never earns one.
- **More experiences**: seed-to-tree patience garden; a tide/moon rhythm toy; a
  mycelium maze. (The hedgerow/Hooper's-rule idea shipped as `hedge`.)
- **Shared feedback**: opt-in export of feedback to an issue/form endpoint,
  replacing the copy-paste loop.


### The sound garden

The hub plays a near-inaudible ambient bed that **grows only when the player
actually goes outside**. Accepting a nature invitation (`consumeInterlude()`)
increments `accepted` in storage; `gardenVoices()` caps it at five, and
`audio.gardenStart(n)` layers that many voices: a ground note, a fifth, sparse
pentatonic chimes, an octave pad, and an occasional two-note bird figure. It
plays on the hub only — `gardenStop()` runs when an experience or the feedback
panel opens, so play is silent and the reward stays attached to the real world.
The footer shows it as `♪` glyphs (no plural rules in three languages), and the
one-time acknowledgement appears on the return to the hub.
