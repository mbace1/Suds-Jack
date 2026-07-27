# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projects

### Suds Jack
HTML5 demo built with **Three.js / WebGL**.
Concept: "Bomb Jack x Suds 51 x Tempest 2000" — floating bomb-collection gameplay, soap/bubble aesthetic, Tempest 2000 psychedelic tube-shooter energy.
Build tooling: TBD — update this file once chosen and add dev/build commands.

### Paper Route — Dawn Run (`paperboy/`)
A **Paperboy clone** built on Three.js r167 with an **isometric, flat-shaded homage to
the original Paperboy art** — orthographic 3/4 camera, bright sunny-day palette (sky-blue
backdrop, grey road, green lawns, cube houses with pitched roofs, a little BMX kid in a
yellow helmet). It renders **flat and unlit** — `MeshBasicMaterial` solid colours, **no
lights, shadows, fog, bloom, chromatic-aberration or gel transmission** (those belong to
toko-drop) — for a deliberately 2D poster read. The whole colour scheme lives in
`paperboy/js/palette.js` so it re-tints in one edit. Endless auto-scrolling route;
deliver to the teal subscriber houses, dodge road hazards, refill from blue bundles,
survive 3 crashes. No build step — open `paperboy/index.html` (three.js loads from the
jsDelivr CDN via an importmap, same as toko-drop).

> Note on deploys: the published site is served from the **`gh-pages` branch** (a
> separate curated site root that already holds `toko-drop/`), **not** `main`. Demo
> updates must be copied onto `gh-pages` to go live at `/Suds-Jack/paperboy/`.

### Hyper Dagger (`hyperdagger/`)
A first-person **Devil Daggers × HYPERDEMON homage** on Three.js r167 — survive a swarm
of **voxel** skulls on a neon disc in a synthwave void; survival time is the only score.
Enemies are string-art voxel models (one `InstancedMesh` per enemy, per-voxel colors) and
deaths explode them into **physical voxel debris** (gravity, floor bounce, tumble) from a
shared pool. Combat: **hold to stream daggers**, gems drop from heavy kills and level
the daggers up (LV 3 = **homing**); enemy roster is skulls, crowned skulls, splitter
skulls (burst into minis), brutes, drifting totem spawners (which also pulse **jumpable
orb rings**), **watcher** drones firing aimed orb volleys, thorn spikes erupting under
the player, **blinkers** that teleport toward you, a **segmented serpent** whose rings
gib individually (its pale **ghost** variant is armored from the front — shoot the rings
from behind), spider gem-thieves that also lay **egg sacs** (hatch 2 skulls unless shot,
harmless to touch), and the Leviathan boss. Returnal-inspired bullet-hell: enemy orbs are slow, readable,
and the **dash phases through projectiles** (never bodies). Movement: **jump + double
jump**, dash with FOV kick (requests buffered 0.25 s across the cooldown). Art is **black & white with dark red as the only contrast color** — the neon grid
just stops at the arena edge (no barrier visual). Desktop: pointer-lock mouse look,
**fire is automatic while moving** (hold LMB when still), Space jump ×2, Shift dash,
Esc = pause/options. Touch: dual on-screen sticks — left moves, right looks; **firing is
automatic while moving** (or while the look stick is held); **tap either stick = jump ×2,
flick either stick = dash**; ⏸ button top-right. The pause menu carries persisted
options (`hyperDaggerOpts`): game speed ×1/1.25/1.5, FOV 70/80/90, look sensitivity, and smear/
shake/chroma toggles. Touch play requests fullscreen + landscape lock on start. Onboarding
is paced across the first ~150s (one new enemy roughly every 15-20s) and recurring spawns
tighten over time; the death screen recaps what killed you, a kill breakdown, and your
last 10 run times. No build step — open `hyperdagger/index.html` (three.js via jsDelivr
importmap, same as toko-drop). Same `gh-pages` deploy caveat as paperboy.

### Drop Cabal (`dropcabal/`)
A **Cabal (1988 arcade) homage** on Three.js r167 with the **blob and cube enemies from
Toko Drop** — a gallery shooter with layered depth shooting. Pixel look: renders at a
**220 px internal height** upscaled with `image-rendering: pixelated` + a CSS scanline
overlay; everything is unlit `MeshBasicMaterial` with `NoToneMapping` (flat 2D read,
same rule as paperboy). The little teal gel commando runs along a foreground strip
behind a sandbag row; the mouse/touch crosshair raycasts into a perspective field
(ground plane, falling back to an invisible far wall at z −32) and tracers fly INTO the
depth rows — near enemies and destructible suds towers intercept shots aimed at far
ones. Enemy orbs fly OUT toward the player plane and are dodged by running or the
i-frame roll. Grenades lob to the crosshair point (start 3, +1 per stage / bonus tower,
cap 9). Stage quota gauge Cabal-style; clearing pops all stragglers. No build step —
open `dropcabal/index.html` (three.js via jsDelivr importmap). Same `gh-pages` deploy
caveat as paperboy.

### The Game of Life (`gameoflife/`)
**Mini games and interactive stories that always revert to going back to nature.**
Minimalist pixel experiences (canvas 2D, no three.js, no build step). The hub is **zen**:
never a menu — ONE offering at a time, drawn weighted by the content mix (**70% story /
20% game / 10% wisdom**, preferring unvisited-today; "something else, perhaps" redraws),
with a 3-dot row (two breaths of play, then `~` rest). After every 2nd finished
experience the hub *rests* and shows a nature invitation instead (evening 18:00–05:00
swaps outdoor prompts for a poem / look-at-art prompt). Invitations are **seasonal**:
`nature.js`'s `season(date, hemi)` puts two per-season prompts ahead
of the generic pool (winter frost / spring buds / summer barefoot grass / autumn
leaf-catching); it is **hemisphere-aware** — `'s'` shifts the year six months, seeded
once from the IANA timezone (`guessHemisphere()`) and flippable via a quiet
`seasons north|south` toggle in `.hub-footer` (`store.getHemi/setHemi`). Evening poems come from `js/poems.js`, a **cross-cultural pool**
(Bashō/Issa/Shiki/Leino/Wordsworth, each in all three languages — a haiku can arrive
in Finnish), filtered to the current season via per-poem `season` tags ('any' floats). Trilingual fi/en/ja — every string in
`js/i18n.js` (en fallback), browser-detected, persisted. Experiences export
`{ id, kind, start(host, ctx) }` (kind = story|game|wisdom; ctx = `{t, audio,
onComplete}`, start returns `{destroy}`) and register in `REGISTRY` in `main.js`;
current roster: `aqueduct` (game — Roman aqueduct story → rotate-stones channel puzzle,
BFS flow with live partial water), `forest` (story — branching walk → guided 4-breath
finale), `tern` (story — arctic tern migration pole to pole, 2 choices), `cup`
(wisdom — Nan-in's overflowing teacup; **hold** to pour a dithered Raku chawan past
full, the cyan excess cascading over the lip and off the table), `hanami`
(story — 12 centuries of hanami, Heian court → Edo riverbanks, mono no aware), and
`berry` (story — a Finnish blueberry summer teaching jokamiehenoikeus), and `stars`
(game — trace the Big Dipper star by star, then follow its pointer stars to Polaris;
tap-order chain + tap-the-right-star hit tests), `maple` (story — one tree through
four seasons on the same hill; phenology: spring unpacks, autumn reveals), and `plate`
(story — Boulevard du Temple 1838; a timed exposure erases the moving crowd, the still
man remains: the first photographed human), and `seam` (story — kintsugi: gather five
shards from the void, choose clay or gold, seams gild in GOLD_LUX with a frame-breaking
glow; `cup`'s overflow is now CYAN_LUX and runs off the table), and `dots` (story —
Galileo, Padua 1610: pass the nights, the four Galilean moons swing around Jupiter on
their real periods; a lens-vignette in the void with a notebook strip), and `glass`
(game — Muybridge, Palo Alto 1878: release the horse, tripwires fire 12 cameras, one
frame proves all four hooves airborne, then a zoetrope revives the stills; debuts the
cinematic-letterbox format), and `wait` (wisdom — Stand and Wait: press once then
stand while a dithered halftone fog burns off over ~9s to reveal an old pine,
green `LEAF_LUX` fireflies drifting past the frame; tapping only earns "the mist
keeps its own time"; built to `horizon-pine-vignette.png`), and `lichen` (wisdom —
The Lichen: leave the bare dithered stone alone ~14s and a stippled sage bloom
colonises it; *touching it makes the growth recoil*; luminescent `LEAF_LUX`
apothecia + rising spores break into the void — the interaction that teaches is
non-interaction), and `cloud` (story — The Cloudberry Patch: a midnight-sun aapa
mire, ripe lakka, a bear's track to your patch; the finest cluster asks to be left
— branching companion to `berry`, full-scene Finnish-nature family, not the void
vignette), and `ice` (story — The Ice Core: an arctic drill descending through
dithered annual ice bands, reading each era from wildfire soot to 20,000-year-old
air that glows `CYAN_LUX` and breaks the frame; reference-grade void-vignette
build), and `trace` (game — Trace the Chaos: tap star-to-star to draw your own
constellation from a scattered field, a dithered purple nebula blooming around
what you connect in glowing `GOLD_LUX`, then name it and learn the sky was never
arranged; extends `stars`, built to `constellation-nebula.png`), and `gears`
(game — The Bronze Gears: crank the Antikythera mechanism's meshed bronze gears
through the lunar months until the Sun/Moon hands meet the node and it predicts
an eclipse, a `GOLD_LUX` corona breaking the frame; void-vignette bronze build),
and `cairn` (game — The Cairn: tap where each of three irregular dithered stones
should rest on a dusk fell; near the balance line it holds, off it topples and you
retry — gravity is patient; the crowning stone catches the last light), and
`downhill` (game — Water Downhill: a tilt cousin of `aqueduct`; tap four stone
ledges to flip their slope until a trickle chains down and pours off the frame in
`CYAN_LUX`), and `tether` (story — The Tether: Paris 1783, cut the rope and the
ground lets go; Paris compresses into a map as you climb, embers eat the linen, and
the brazier flare throws `GOLD_LUX` sparks past the letterbox bars into the void —
cinematic-widescreen like `glass`), and `hedge` (story — The Living Wall: tap the
shrubs along thirty paces of an English hedge to count woody *species*; tapping a
repeat teaches that it is kinds you count, and Hooper's rule then dates the hedge
at ~700 years, older than the church behind it; a botanist's tally strip fills as
you go — full-scene English-lane build), and `seed` (wisdom — plant one and wait out the day/night cycle), `lightning` (story — Philadelphia 1882, Jennings holds a dry-plate open on a storm roof; the plate proves lightning is shaped like a river, not a zigzag), `whale` (story — a forty-tonne body sinks three km into unlit water and becomes a town of a hundred species over fifty years; per-pixel dithered water column in `cached()`, bioluminescence breaking the frame), and `pando` (story — pick four separate Utah aspens, then the ground goes transparent on one GOLD_LUX root system feeding all 47,000 stems). `plate` pilots the **2026-07 visual standard** (owner's master doc in `gameoflife/ideas/`, reference art in `ideas/ref/`):
jagged 16-bit vignettes in a pure-black void, muted environments, luminescent cyan/gold
interactive elements that break the frame (`PAL.VOID/CYAN_LUX/GOLD_LUX`, plus
`PAL.LEAF_LUX` — a luminescent green for nature-scene glow like fireflies). Shared `pixel.js`
gives all art crisp **defined sections** (1px darker seam between `bands()` colours) and
opt-in outline **edges** on `disc(cx,cy,r,color,edge)`/`rect(...,edge)` via `shade()`, plus a
warm `PAL.EMBER` contrast accent + `PAL.EDGE` ink; and for reference-grade scenes
**halftone dithering** (`bayer`/`rampDither` — stippled tonal ramps) + `softDisc`
(feathered vignette halos). `seam` is rebuilt to full `kintsugi-overflow.png` fidelity
(dithered Raku glaze ramp, gold veins with bright core, glowing cyan overflow); `dots`
also shares the toolkit — a cool halo behind the eyepiece + a dithered glass interior in
the lens + a cyan wash under the escaping orbits. (`plate` was given the same pass but
the halo/dither muddied its clean vignette, so it was reverted to its original art — the
toolkit is opt-in per scene, not a blanket restyle.) The owner's idea queue in that doc
takes priority over Claude's roadmap picks.
Dithering is expensive — one `fillRect` per pixel — so any scene whose art is mostly
static wraps it in **`scr.cached(key, drawFn)`** (`pixel.js`): `drawFn` paints into an
offscreen canvas once and is blitted each frame until `key` changes (`cached` retargets
`this.ctx`, so every helper works unchanged inside it). Used by `wait`/`gears`/`lichen`/
`hedge`/`seam`/`ice`; the discipline is to key on what actually changes
(`base:${found.size}`, `core:${stop}:${Math.round(scroll)}`) and lift every moving part
out of the callback — `gears` caches the radially symmetric gear bodies and redraws only
teeth/spokes, `lichen` caches the crust and keeps the pulsing apothecia live. When
drawing dither in 2px cells sample `bayer(x >> 1, y >> 1)` (the **cell** index): sampling
at even pixel coordinates only reaches 4 of the matrix's 16 values, all low, and the
stipple collapses into blobs. `startExperience` in `main.js` destroys `current` before
starting the next one — going experience→experience (as `__gol.debug.start` does) used to
leak the previous rAF loop against a detached canvas. Profile with Playwright + CDP
`Emulation.setCPUThrottlingRate(4)` and a wrapped `fillRect` counter, **one fresh page per
scene** or leaked loops inflate the counts.
The hub greeting follows the hour (`daySlot()`: morning/day/evening/night) and a
**living header scene** (192×44 `PixelScreen`, `startHubScene` in `main.js`) paints the
same hour — dawn mist / noon sun + cloud / dusk / starry night with a tiny Otava — over
a constant treeline; it must be `stopHubScene()`d wherever the app re-renders. Zen
chrome-trimming: the set-once controls (language, feedback) sit in ONE quiet
`.hub-footer` below a divider (language, hemisphere, feedback), out of the main
column; the explanatory tagline and
cycle-hint only show for newcomers (< 2 lifetime completions), so returners land on a
clean header with the offering as the single focus. The app must never nag:
**rating is occasional** (`store.feedbackDue()` — after the 1st finish, then
every 5th; the footer's *leave a thought* link is always there, and an empty
submission records nothing rather than thanking you for silence), and
**"not yet" on a nature invitation holds for the visit** (`invitationPut` in
`main.js`, reset by the next finish) so a redraw or a language switch cannot
re-ask; Esc / a click on the backdrop is the same as *not yet*. Feedback
**leaves the browser** via `js/feedback.js`: paste a Formspree-style JSON
endpoint into its one `ENDPOINT` constant and notes POST there — unset, the app
sends nothing and *shows no delivery promise* (`fb.dest` only renders when
`outbound.configured()`); undeliverable notes go to a `store.outbox()` and
`flush()` drains them on the next visit one at a time, and every note is kept
locally either way. A fragment
deep-links one experience (`/gameoflife/#tether` → `openFromHash()`; `setHash()`
uses `replaceState` so it never fires the `hashchange` handler back at itself,
and the hub is always the plain address) — that is what makes a link shareable
for playtesting. `useLang()` mirrors the language onto `<html lang>`. Keyboard/
touch floor: a `:focus-visible` ring, `focusPrimary()` moving focus after a view
swap **only when the last input was a key** (so a tap never raises a ring), a
**44px minimum on every control** and **WCAG AA on every text colour** — both
measured in the smoke gate, because the muted-on-dark palette had drifted to
1.92:1 on the seasons label and both regressed twice while being fixed (text
greys are `#8d8165`, the primary button `#4e6839`; hierarchy comes from size,
never from being unreadable) — per-leaf rating `aria-label`s, `#app` as a `<main>`, `.exp-text`
marked `aria-live="polite"` centrally in `startExperience` (not in 22 modules)
with the scene canvas `aria-hidden` in `PixelScreen` — the text is the followable
channel — and `document.title` naming the current experience. The layout must
**hold still**: `.exp-text` holds six lines open (`min-height: 10.2em`) because
sizing it to short beats walked the Continue button ~190px between taps, and a
`max-height: 560px` block caps the scene at `38vh` so a phone held sideways fits
without scrolling. In portrait the title stays at the top and everything below it
floats to the middle (paired `auto` margins), with the scene placed **just above
the vertical midpoint** by a computed gap (`50vh − canvas height − 36px`, gated
behind `min-height: 700px` because on a 667px phone it costs a scroll). The UI
accent is **green** `#8faf6a` (headings, active toggles); gold stays inside scene
art only. **Every experience must be animated on its first screen** — a still
opening reads as a broken page — and for `cached()` scenes that motion is a live
layer drawn *after* the blit; the smoke gate samples each first screen twice and
names any that is frozen. `prefers-reduced-motion` freezes the decorative hub header
(one frame of the hour) while experiences keep animating. `pixel.js` gives a 192×128
`PixelScreen` upscaled with `image-rendering: pixelated`; `palette.js` is the single
colour source; `audio.js` is a quiet WebAudio kit routing **every** voice through one
master gain (nothing connects to `ctx.destination` directly) so the footer's
`sound on/off` toggle — persisted via `store.soundOn()` — mutes the app totally
and any sound added later inherits it; `storage.js` keeps completions /
cycle counter / 1–5-leaf feedback in `localStorage` (`golState`).
The **sound garden** is the reward loop's teeth: the hub's near-inaudible ambient
bed grows one voice per *accepted* invitation only (`accepted` in storage →
`gardenVoices()` capped at 5 → `audio.gardenStart(n)` layering ground note /
fifth / sparse pentatonic chimes / octave pad / bird figure). Screen time never
earns a voice; `gardenStop()` fires on entering an experience or the feedback
panel, so it plays on the hub alone. Shown in `.hub-footer` as `♪` glyphs
(plural-free across fi/en/ja) with a one-time "you went outside" acknowledgement. `window.__gol` exposes
`{store, audio, debug: {start, showInterlude, setLang, feedback}}` for console testing.
The app is **offline-first**: `sw.js` precaches the shell cache-first and
`manifest.webmanifest` makes it installable — it sends you outdoors, so it has to
work where the signal stops. The worker registers on **https only** (or `?sw=1`)
so dev and the smoke gate never get a stale shell; `test/offline.cjs` kills the
server, goes offline and drives a whole experience, asserting zero network
requests. Its precache list must name every file (no build step), so
`check_levels.mjs` fails on a missing experience, a missing shared module, or
`?v=N` drift between `sw.js` and `index.html` — **bump the version in sw.js too**.
**Before adding an experience read `gameoflife/EXPERIENCES.md`** and copy
`js/experiences/_template.js` — it states the bar (all three languages, an
animated first screen, a real revert in the outro, a deterministic smoke block)
and the two art traps (dithering is opt-in; sample `bayer()` at the cell index).
Files under `js/experiences/` starting with `_` are skipped by the i18n scan.
Pipeline: develop on `claude/*` beta branches → greenlight to `main` → copy to
`gh-pages` to go live at `/Suds-Jack/gameoflife/` (same deploy caveat as paperboy);
bump `?v=N` cache-busters together when shipping. See `gameoflife/README.md` for the
roadmap of future experiences.

### Radio Free Helsinki (`radiofree/`)
A **fictional pirate news broadcast** — an app, not a game. **The feed is vertical
and that is the format, not a mode**: one bulletin per screen in a `scroll-snap`
column (TikTok-shaped), all twelve in one feed ordered by channel. Each post is
**half a Metal Gear codec screen stood on end** — the story's **portrait** picture
panel on top, **Toko** (the teal gel from toko-drop, `#00ccaa`, dark eyes, white
specular) reading the wire below it with a freq/REC/level data column beside her and
a waveform across the bottom — plus a TikTok-style right rail (⧉ DECODE, ▼ NEXT) and
the copy underneath. Panels are drawn portrait (`PANEL_W/PANEL_H` = 128×152) because
a landscape card inside a vertical post reads as something shot for another screen
and cropped in. **Canvas 2D pixel art, no three.js, no build step, no assets, no
CDN** — every pixel is drawn in code, so it works offline. Three channels
(`SECTORS` in `stories.js`): **87.60 KAIKU** games/studios, **104.40 VERKKO**
tech/industry, **141.12 VARTIO** defence/signal — Helsinki as a games town wired
into a tech industry next to a defence band. Sixteen bulletins, ordered by band.

**The top frame is an edit, not a picture.** Every bulletin cuts on a 3.6 s beat
between the story **graphic** (`visuals.js`), **B-roll** of a low-poly Helsinki
(`broll.js` — drones over the Esplanadi, the container harbour, the eastern
treeline) and a **wide** of the booth (`drawWide` in `toko.js`). The three are
deliberately different registers; that contrast is what makes a post read as a
cut package rather than two fixed frames. `Post.cutting()` is the director, a
cut snaps with a bright band + displaced rows, `goLive()` resets to shot 0, and
**DECODE cuts home to the graphic and holds** — it is the only shot that
decodes. `poly.js` is the renderer: painter's algorithm, banded lambert, no
z-buffer and no clipper. Its two paid-for traps — a polygon reaching behind the
near plane is dropped **whole** (the first ground planes started behind the
camera and the shot was bare sky), and two full-length ground planes stacked on
each other have the *same* average depth so the sort is a coin toss (butt the
strips together in x). `cam.hz` slides the horizon off centre. Video grain must
**not** come from `bayer()` — the low cells are the same cells every frame, so
it sits still and reads as a perforated screen.

**Adding a bulletin is four edits and `radiofree/STORIES.md` is the bar**: the
roster line (`visual` + `broll`, both gate-checked against `PANEL_KEYS` /
`BROLL_KEYS`), the copy block in all three languages, the panel, the cache
tokens. Register is **The Onion** — total deadpan, the joke in the fact and
never in the wording — one new technique per bulletin, and every plain reading
specific ("a way to protect this quarter's margin", not "something bad").

**Scrolling is the primary control**; the masthead dial is a *readout* of which
channel the scroll landed on plus a jump between bands. **Only the live post
animates** — it re-tunes (picture up out of noise), types, and drives the lip-sync;
neighbours hold the single frame `renderStatic()` painted (so scrolling shows real
pictures, and twelve canvases stay cheap), and posts not yet reached show a standby
line instead of their copy. Decode state is per post.

**Trilingual fi/en/ja** — and not translations of each other's tricks: each
language spins its bulletin the way that language really does it, so Finnish
reaches for the true agentless passiivi and Japanese for 〜される and the polite
noun (再編、協議). All twelve bulletins, their decode notes and their tells live in
`stories.js`'s `COPY[lang]`; every other string is in `i18n.js`. Language is
browser-detected, switchable from the masthead, persisted (`rfhLang`), and
switching **rebuilds the feed in place** — same post, same decode states, same
scroll position — with `<html lang>` following. The reader adapts per script:
Japanese types at 26 cps against 72 for Latin (a kanji carries far more than a
letter), and a **kana counts as a full mouth opening** rather than a consonant,
because Japanese is mora-timed and letter-by-letter amplitude leaves the face
shut. `t()` returns the key when a string is missing and a raw key is still a
non-empty string, so the gate checks all three blocks for every interface key
*and* every field of every bulletin, including that the lines still carry
`{{…|…}}` markup.

**Everything on the wire is invented** — fictional studios, ministries, ports and
operators; no real company, agency or country is described or accused of anything.
What is real is the *language*: each bulletin is written the way that kind of story
actually gets written, and **DECODE** names the move. That is the app's whole payload
and the reason the propaganda subject is safe to build — it teaches recognition, it
does not manufacture claims. The masthead and the tune-in gate both say so on screen.

**DECODE is the mechanic.** Copy is marked up `{{as broadcast|what that means}}`
(`parseLine`/`flatten` in `stories.js`); pressing DECODE strikes the broadcast wording
in place and grows the plain reading beside it in amber, then opens a drawer with the
technique (`AGENTLESS PASSIVE`, `MISSING DENOMINATOR`, `SOURCE LAUNDERING`,
`CATEGORY DRIFT`, `PRE-EMPTIVE FRAME`…), what it did, and a **TELL** — the question
that catches it in the wild. **The panels decode too**, because the framing is never
only in the words: the truncated bar chart re-bases to zero (mountain → bump), the
valuation tower goes hollow but for the 6% actually sold, the packed auditorium empties
to the four people on the stage, 900 accounts collapse into a fan spoked to the one node
that made them. The last bulletin on the defence band turns the frame on this station.

**Amber has exactly one job** — "the spin is showing" — and never appears before DECODE;
sector colours (cyan/green/red) carry the channel, green is the default phosphor.
Adding amber anywhere else costs the app its one piece of taught colour vocabulary.

**Toko broadcasts from a flat, not a studio** (owner's reference photo): the
booth is a night kitchen, a slack bulb string and a cold laptop lighting the face
from below. Those bulbs are the only warm light that is NOT the decode — dim and
desaturated on purpose, because amber has one job. **Toko is lip-synced, not
flapping:** `Reader.update()` returns a mouth amplitude from
the character it just typed (vowels open, consonants part, spaces close) and that value
drives `Toko.update()`. Change how text is revealed and the amplitude has to keep
coming or the face goes dead. The gel wobbles with rx/ry breathing in opposite phase
(volume conserved = jelly), blinks on a timer, and under DECODE goes amber and tears
(`getImageData` band displacement). Two traps already paid for: teal lerped only
part-way to amber lands on **olive** and reads as a rendering fault (tint at 0.92, not
0.55), and the mic capsule parked over the mouth reads as a **tongue** and kills the
lip-sync — it lives below-right of the mouth.

**Both frames are ONE canvas.** `codec.js` draws the portrait (96×96) and the story
panel (128×152) into *detached* `PixelScreen` buffers and blits them into a single
144×276 post screen with the data column and waveform band, so the frames cannot drift
apart when CSS scales the post. `PixelScreen(null, w, h)` is the detached mode. Idle
waveform samples sit on a breathing carrier — with noise alone an open channel
quantised to 1px and read as a broken dotted line.

**Which post is live is read off `feed.scrollTop`**, not from an IntersectionObserver.
The observer version could not be trusted: its callback is async, so a jump (deep
link, channel change) landed correctly and was then overridden a frame later by a
queued entry from where the feed used to be — every post is the same height, so the
answer is one division, and it agrees with a programmatic jump immediately. The
handover only fires within 0.2 of a snap point so a slow drag cannot start and
abandon two reads. **`behavior: 'auto'` is not "jump"** — in `scrollTo`/
`scrollIntoView` it means *defer to CSS*, and the feed is `scroll-behavior: smooth`,
so `'auto'` politely animates; `'instant'` is the one that lands.

**Audio** (`audio.js`) is all-synth: per-character blips, ring/connect pips, tuning
sweeps, a falling saw for DECODE, and a looping band-passed **carrier hiss** that ducks
while a bulletin is read. Everything routes through one master gain — nothing connects
to `ctx.destination` — so the ♪ mute is total and anything added later inherits it.
Mute persists in `localStorage` (`rfhSound`).

**The feed ends, it does not stop.** A thirteenth post signs the station off — a
test card, `post.silent` flatlining the carrier, `--.--` on the dial — and hands
back all twelve techniques, marking the ones the listener actually decoded and
printing those tells back at them (dim + `·` for the ones skipped). The decoded
set persists in `rfhDecoded`. It is the last bulletin's move (turning the frame
on this station) made specific to you. The sign-off post has no `story`/`copy`,
so `channelOf`, `indexFromHash`, `toggleDecode`, `rebuildFeed` and the loop all
step over `p.signoff` — anything new that reads `p.story` must too.

A fragment deep-links one bulletin (`/radiofree/#seabed` → the address follows
the scroll, so a link is worth sending); `setHash()` uses `replaceState` so the
back button leaves the page instead of walking twelve fake entries — and, the
part that matters, `replaceState` does **not** fire `hashchange`, so the handler
catching pasted links can never be triggered by the app's own writes. The app is
**offline-first**: `sw.js` precaches the shell cache-first and
`manifest.webmanifest` makes it installable — it is read on a metro, so it has to
work where the signal stops. The worker registers on **https only** (or `?sw=1`)
so dev and the smoke gate never get a stale shell; the precache list must name
every file (no build step), and the gate checks it against `js/`, checks
`sw.js`'s `VERSION`/`V` against the page's `?v=N`, then registers the worker,
cuts the network and reads a bulletin. **Bump `sw.js` with the other tokens.**
Both app icons are drawn in code at 48px and baked to PNG — redraw, don't edit.

**Traps:** `drawVisual` falls back to the bar chart on an unknown key, which would ship
the wrong picture beside the right words in silence — `PANEL_KEYS` is exported and the
gate checks every story against it. Dither in 2px cells must sample `bayer(x >> 1, y >> 1)`
(the cell index) or the stipple collapses into a dot grid — the gulf water column did.
`PixelScreen.line()` must round its endpoints *before* computing the slope —
stepping from rounded coordinates with an unrounded slope lets Bresenham miss
the target and run to the guard limit, which drew two long rays across the
account graph. `field(scr, decode, false)` turns the graticule off for scenes with their own full-frame
texture (`sea`, `engine`); a grid under a wireframe terrain is noise on noise.

**Gate:** `NODE_PATH=/opt/node22/lib/node_modules node radiofree/test/smoke.cjs` — 77
checks (roster counts are read off `__rfh.debug.stories()`, never hardcoded — that
number went stale twice): zero console errors, the feed is vertical (one post per screen, snapping, media
portrait in the buffer *and* on screen), the live codec animates while neighbours hold
their painted frame and unread posts sit on standby, the reader types and can be
skipped, DECODE grows plain readings / re-folds / stays per-post, scroll+rail+keyboard
+dial all move the feed, every bulletin carrying a full read *and* a decode,
every visual and footage key real, the program frame really cutting
between graphic/B-roll/wide with DECODE holding the graphic, fi/en/ja complete with a language switch that keeps your
place, a sign-off that closes the feed and marks what you decoded, a `#id` deep link
that opens its bulletin without pushing history, a
precache that names every module, a real run with the network cut, 44px targets, and **WCAG AA on every text colour** — with translucent backgrounds properly
composited up the tree (taking the first non-transparent colour reads
`rgba(255,180,58,.05)` as solid amber and fails the decode box by 4x).
`window.__rfh` exposes `{audio, state, debug: {open, channel, go, tuneChannel,
toggleDecode, finishRead, stories, tuneIn}}`. Same `gh-pages` deploy caveat as the
other demos; bump the `?v=N` cache-busters together.

### Toko Drop — Gelatin Bullet-Hell Twin-Stick Shooter
Top-down arena twin-stick shooter. Primary development is in **Unreal Engine 5.4** (started from the Top Down template), with a potential HTML5 prototype / Godot port planned.

**Pillars:** twin-stick controls, bullet-hell enemy patterns with deliberately slow enemy movement, roguelite run-based progression, gun upgrade trees, gelatin/clay visuals (translucent wobbling materials, destructible chunks, colorful puddle decals).

**Current UE5.4 state:**
- Player pawn: `BP_GelPlayer` (Character-based, static mesh + `M_Gelatin` material, set as Default Pawn in `BP_TopDownGameMode`)
- Weapon: `BP_Weapon` (Actor-based, basic firing logic, spawned at a character weapon point)
- Enemy: Blueprint class with basic "move toward player" AI
- Mostly Blueprint-driven; open to C++ for performance-sensitive paths (bullet counts in bullet-hell can get heavy)

**Systems still to build:**
1. Weapon system + upgrade trees
2. Enemy bullet-hell patterns (spiral, spread, ring, etc.)
3. Arena + procedural/roguelite run generation
4. Roguelite meta-progression (unlocks, between-run upgrades)
5. Gelatin VFX: vertex displacement wobble, destructible chunks, puddle decals (Niagara + material functions)
6. HUD: health, score, run state

## Repository Structure

```
suds-jack/      # (not yet scaffolded)
toko-drop/
  index.html
  js/
    main.js     # Three.js scene, game loop, collision, wave management
    input.js    # Virtual joystick (touch) + WASD/mouse fallback
    player.js   # Player movement, dash mechanic, firing
    enemy.js    # Enemy class — 4 bullet-hell patterns, each with distinct color
    bullet.js   # Object-pooled bullets (300 cap, shared pool for all bullets)
paperboy/       # Paper Route — Dawn Run (Paperboy clone, toko-drop art, new palette)
  index.html
  js/
    main.js     # Scene + render pipeline (bloom/chroma/ACES/IBL), loop, collisions, HUD, states
    palette.js  # Central warm-dawn colour scheme (single source of truth for all tints)
    world.js    # Route streaming (houses/hazards/pickups) + cull, paper→house resolution
    player.js   # Gel rider + low-poly bike, steer/throttle, lean, crash mercy, ghost trail
    paper.js    # Object-pooled thrown papers with arc/gravity physics + landing detection
    input.js    # Touch stick (steer/throttle) + two throw buttons; WASD/ZX keyboard fallback
    audio.js    # WebAudio bleep kit (throw/deliver/smash/pickup/crash/day-clear)
dropcabal/      # Drop Cabal — Cabal-style gallery shooter, toko-drop enemies, pixel render
  index.html
  js/
    main.js     # Scene (sunset sky/hills/checker field), pixel renderer, crosshair raycast,
                #   spawn director, tracer/orb/grenade collisions, HUD, states
    palette.js  # Suds-sunset colour scheme (sky/hills/ground/towers/player)
    enemy.js    # Toko Drop gels on depth rows: GLOBBO/YELA/SPITTOR/ORANGE/SPLITTA(+MINI)
    player.js   # Gel commando: run along strip, gun lookAt crosshair, dodge roll, mercy
    shots.js    # Pooled tracers (prev-pos segment tests), enemy orbs (lob gravity), grenades
    fx.js       # InstancedMesh debris pool + additive boom shells
    input.js    # Mouse aim/LMB fire/A-D run/Space roll/G-RMB nade; dual virtual sticks (touch)
    audio.js    # WebAudio bleep kit (fire/thock/splat/boom/pew/fanfare…)
radiofree/      # Radio Free Helsinki — MGS-codec news broadcast, Toko anchors, DECODE
  index.html
  js/
    main.js     # boot + tune-in gate, the vertical snap feed, tuning, decode, the loop
    codec.js    # one post: both codec frames in ONE canvas; Reader (typewriter → mouth)
    toko.js     # the anchor: gel wobble, blink, lip-sync, amber decode tear
    visuals.js  # portrait story panels + the sign-off test card; PANEL_KEYS
    broll.js    # low-poly Helsinki footage plates; BROLL_KEYS
    poly.js     # the tiny flat-shaded 3D renderer under the footage
    stories.js  # the wire: copy with {{spun|plain}} markup, techniques, tells (fi/en/ja)
    i18n.js     # every other string, all three languages
    screen.js   # PixelScreen (detachable), shade/mix/bayer, scanlines
    audio.js    # synth codec kit + carrier hiss, one master gain (total mute)
    palette.js
  sw.js         # offline shell; manifest.webmanifest + icons drawn in code
  test/
    smoke.cjs   # 72-check headless gate
hyperdagger/    # Hyper Dagger — FPS Devil Daggers × HYPERDEMON homage, voxel enemies
  index.html
  js/
    main.js     # Scene (grid arena, rainbow sky, afterimage/bloom/chroma), director, combat, HUD, style meter
    voxel.js    # String-art voxel models + parser, VoxelSprite (InstancedMesh), DebrisPool physics
    enemy.js    # Skull/Wraith, Brute, Totem (spawner), Serpent (chain), Spider (thief), Leviathan
    daggers.js  # Object-pooled dagger projectiles; homing steer at LV 3; segment hit tests
    gems.js     # DD-style gem drops: ballistic scatter, hover, player magnet, collect
    player.js   # First-person controller: yaw/pitch, WASD/stick strafe, jump, dash, head-bob
    input.js    # Pointer-lock mouse+WASD, gamepad (sticks/RT/A/B), or dual touch sticks; tap-vs-hold fire
    audio.js    # WebAudio synth kit (fire/hit/gib/gem/levelup/dash/roar/death + drone + intensity music)
```

## Toko Drop — Architecture Notes

**Entry point:** `toko-drop/js/main.js` sets up the Three.js scene, wires input/player/enemy/bullets together, and runs the game loop.

**Controls:** Virtual twin-sticks (left half / right half of screen). Right stick release triggers a **dash** with i-frames. Desktop fallback: WASD move, hold LMB + mouse to aim and fire, Space to dash.

**Enemy patterns** (all four spawn simultaneously per wave, each with a unique color):
- `Pattern.RING` — orange, radial burst of 10 bullets every 2 s
- `Pattern.SPIRAL` — purple, rotating single shot every 80 ms
- `Pattern.SPREAD` — blue, 5-bullet aimed cone every 1.5 s
- `Pattern.ALTERNATING` — green, alternates ring burst and direct aimed shot every 1.1 s

**Bullet pool:** `BulletPool` pre-allocates 300 `THREE.Mesh` instances. `spawnDir(x, z, dx, dz, isPlayer, color)` pops from pool; `recycleAt(i)` splices active array at index `i` (always iterate backwards when recycling mid-loop).

**Dash:** 0.18 s at 26 units/s, 0.9 s cooldown, invincible during dash. Direction uses last aim direction if stick was released before movement.

**Wave progression:** when all 4 enemies are dead, `spawnWave()` removes old meshes from scene and spawns fresh enemies at `0.6 × HALF` radius in a cross pattern. Wave counter displayed in UI.

## Drop Cabal (`dropcabal/`) — Architecture Notes

**Layout:** player strip at z = 8 (`PLAYER_Z`), sandbag row at z ≈ 2.8, enemy depth rows
at z −7 / −16 / −26 (`ROWS`, weighted far-heavy), destructible towers scattered z −9…−28,
invisible crosshair far wall at `AIM_WALL_Z` −32, hills/sky behind it. Camera is a
perspective cam at (playerX·0.35, 7.4, 19.5) — it trucks with the player for the Cabal
scroll, plus trauma shake.

**Aim / layered shooting:** `computeAim()` raycasts the pointer through the camera at
the ground plane; misses (or hits behind the wall) fall back to the z −32 wall plane.
Tracers spawn at the gun tip toward the aim point (+jitter) at 90 u/s and keep `prev`
each frame; `collideTracers()` picks the LOWEST segment-param hit among tower chunks
(sphere-approximated), enemies, and enemy orbs (shootable, +20), else ground puff /
far-wall recycle — so near things really do eat shots aimed at far things.

**Enemies (`enemy.js`):** toko-drop family — GLOBBO (teal hop, aimed orb), YELA CUBE
(fast slide, quick orb), SPITTOR (red gel, gravity lob), ORANGE CUBE (3-spread), SPLITTA
(big green, splits into 2 rushing MINIs on death — minis kamikaze the player plane and
don't count toward spawn quota). Enter from a row edge, then strafe between random
targets; fire only once in `strafe` state. Debuts (non-GLOBBO) toast once per run.

**Stage flow:** quota = 14 + stage·6 kills; the director keeps ≤ min(8, 3+stage·0.8)
mains alive, interval tightening with stage. `killEnemy` → gauge; quota reached →
`stageClear()` pops stragglers, +1 bomb, bonus = stage·1000, 2.4 s banner → next stage
(fresh scenery, +1 tower per stage capped +3). Bonus towers (gold cap, 22%) give +1
grenade when fully levelled. Player: 3 lives, orb/mini hit costs one unless rolling
(0.36 s, i-frames) or in 2 s mercy flicker; grenade = 0.75 s arc to the crosshair ground
point, r 5.4 boom killing enemies/towers/orbs. Hi-score in localStorage `dropCabalHi`.
Touch is **dual virtual sticks** drawn on a full-res `#ui` canvas overlay: left stick
x = run, right stick is a **rate controller** (deflection = crosshair velocity, `AIM_PX`
1100 px/s at full tilt, integrated in `applyTouchAim`) + autofire while held; a quick
sub-250 ms / sub-12 px tap on EITHER stick = roll; idle sticks show dashed RUN/AIM
hints once touch is seen. Module imports carry `?v=2` cache-busters (paperboy
convention) so gh-pages picks up coherent versions.

**Pixel render:** `renderer.setSize(iw, 220, false)` + CSS `image-rendering: pixelated`
(canvas stretched to viewport) + scanline overlay div; `NearestFilter` on the sky /
checker `CanvasTexture`s. The sky canvas is 608×256 to match the 190×80 plane aspect so
the sun stays round. Careful iterating pools: `hitPlayer()` calls `orbs.clear()`, so the
orb-vs-player loop re-checks `i` against length; `boomAt`/mini handlers bail out when a
kill triggers `stageClear`/`gameOver` mid-loop. `window.__dc` exposes
`{enemies(), orbs, tracers, player, debug: {state, score, setStage, addNades, killAll,
start}}` for console tinkering and headless smoke tests.

## Hyper Dagger (`hyperdagger/`) — Architecture Notes

**Voxel pipeline (`voxel.js`):** `MODELS` defines enemies as string-art layers —
`layers[0]` is the bottom slice, each layer an array of rows, row 0 the *front* face
(mapped to +z so `Object3D.lookAt(player)` points the face at the player). Palette values
are hex ints, or `[r,g,b]` arrays with components > 1 for **HDR glow voxels** (eyes,
totem veins) that trip the bloom threshold while bone/body stays matte. `VoxelSprite`
bakes a model into one `InstancedMesh` (per-voxel `setColorAt`; hit-flash brightens
`material.color`, which multiplies every instance). `DebrisPool` is a single 1600-cube
`InstancedMesh`: gravity −28, floor bounce ×−0.38 with friction, Euler tumble, shrink-out
over the last 0.3 s; `burst(worldVoxels, …)` explodes a dead enemy's actual voxels
outward from their centroid plus the killing dagger's impulse.

**Combat:** hold LMB (or hold the right touch stick) = dagger stream. Weapon levels via
gems — `LEVEL_GEMS = [0,0,10,30]`, `WEAPON[lv]` sets stream rate / homing. LV 3 daggers steer toward the best target in a
~37° cone (`DaggerPool.update(dt, targets)`). Each dagger keeps `prev` position and
collisions use **segment-vs-sphere** tests so fast projectiles can't tunnel. Skulls take
knockback along the dagger direction (brutes mostly resist via lower `knock`).
Enemy → player kill test is against both torso and camera positions; totems don't kill,
they `player.pushOut(...)` as solids. Gems (`gems.js`) scatter ballistically, hover, then
magnet to the player inside 5.5 u.

**Spawn director (`main.js`):** all heavy spawns are **telegraphed** — an additive light
beam marks the spot for 0.7 s (`pending[]`), then the enemy appears. First-appearance
times are spread across the first ~150s so mechanics land one at a time rather than
piling up (each debut in `resetRun()`, each recurring cadence tightening via
`Math.max(floor, base - gameTime * rate)` in `director()`; each debut fires a one-per-run
`announce()` — big toast + `audio.stinger()`, keys in `announced{}`, the Leviathan
re-announcing on every respawn): totems (cap 6, slow orbit
drift) from t=0 every 24s tightening to 16s, exhaling skulls (global cap 46, 30% gilded
`Wraith` after 60s) at a tightening interval and pulsing an orb ring every 6s; **watchers**
(cap 3) from t=25 every 20s tightening to 12s; brutes from t=45 every 16s tightening to
10s; **thorns** from t=60 (0.9s sigil warning, lethal below `feet.y` 1.4) every 12s
tightening to 6s; **spiders** (cap 2) from t=75 every 30s tightening to 20s, laying an egg
sac every ~10s; **blinkers** (cap 3) from t=90 every 25s tightening to 14s; **serpents**
(cap 2) from t=100 every 45s tightening to 32s — every second serpent is a ghost; the
**Leviathan** from t=150, one at a time, respawning every 120s. Totem exhales roll
splitters (15%, > 45s) before crowned skulls (30%, > 60s). A `Serpent` is a controller
owning 12 `SerpentSegment` enemies (pushed into the main `enemies` array so the normal
collision loops apply); the head weaves around the player and dive-bombs every 8s,
surviving segments chain-follow at 0.95 u spacing, and each ring gibs + drops a gem
individually. Spiders skitter on the floor and eat loose gems — killing one refunds
everything it swallowed + 1. The Leviathan is a 60-HP god-head at the arena centre that
exhales skulls and every 9s drags the player toward itself for 1.8s (`player.nudge` at
7 u/s — walk or dash out); it drops 10 gems. A pairwise separation pass (skull/brute
only) keeps the swarm from collapsing into one blob.

**Death recap (`main.js`):** `killsByType` tallies kills by `e.type` (Wraith/Splitter/
MiniSkull all report `'skull'` — they never override the base type, so the breakdown
line only ever needs the handful of distinct enemy types) and `lastKiller` is
overwritten by every `playerStruck(sx, sz, killerType)` call, so on the fatal call it's
already the correct cause — no post-hoc reordering needed. `showDeath()` builds a
"felled by ___ · daggers LV_" line plus the kill breakdown, then reads/writes a
`hyperDaggerHistory` localStorage array (last 10 runs, newest first) and renders
`hist.slice(1, 9)` — skipping index 0, the run that was just pushed — as the "recent"
line, since showing the run you're already looking at the big stat line for is
redundant. TIME OUT (HYPER's clock hitting 0 in `step()`) bypasses the cause line
entirely rather than blaming a stale `lastKiller` from an earlier survived hit.

**Modes:** menu-button toggle, persisted in `localStorage` (`hyperDaggerMode`). PURE =
one-touch death (DD). HYPER = HYPERDEMON rules: `lifeT` drains in real time (start 30,
cap 60), kills add `e.score` seconds, an enemy touch costs 10 + `player.nudge`
knockback + 1.2 s `mercyT` i-frames, and 0 → `die(true)` = TIME OUT. Hi-scores are
per-mode (`hyperDaggerHi` / `hyperDaggerHiHyper`).

**Input quirks:** shooting is minimalistic — the stream is automatic whenever move
input is nonzero (`getMove()` length > 0.15), and holding LMB / the look stick fires
while standing still. A sub-250 ms / sub-12 px tap on EITHER stick = jump (works
mid-air for the double jump; a second finger tapping an occupied half also jumps); a
fast ≥40 px flick within the last 150 ms before release on **either stick = dash**
along the screen-space flick direction. No on-screen buttons —
touches that start on DOM controls (`button`, `#pauseBtn`) are left alone so the pause
menu stays tappable. Pointer-lock mousemove deltas with `hypot > 400` are dropped —
some browsers emit one giant bogus delta right after locking. On desktop the pause
button can't be clicked while pointer-locked (lock routes all events to the canvas) —
Esc is the pause path there; the button exists for touch. **Gamepad** is a third path:
`input.pollGamepad()` runs once per frame in `animate()`, reading the first connected
controller and feeding the SAME `getMove`/`getLookRate`/`firing` getters as
mouse+keyboard (left stick move, right stick look-rate, RT/RB hold-fire) with A =
jump ×2 and B/LT = dash edge-detected in the poll — so nothing downstream knows a pad
is in use. Axes are deadzoned (0.18) and the move vector clamped to unit length. When
no pad is present the getters fall through to the existing mouse/keyboard/touch logic.

**Style meter (`main.js`):** a Returnal/DMC-style rank that rewards chaining. `addStyle`
adds by event (per-type kills via `STYLE_GAIN`, +4 per dash-through-orb credited once
via `o.phased`, +n on gem pickup) into `styleVal` (cap 150); `step()` bleeds it every
frame at `6 + styleVal*0.05` per second so the top tiers (`STYLE_TIERS` D→SSS) stay
fleeting and demand a continuous chain. The tier drives a HUD badge (`#style` rank +
`×mult` + fill bar, `updateStyleHud()`), folds into music intensity (0.35 weight
alongside threat count and run progress), and only **S+** rank-ups toast/flourish so
lower crossings never clobber an enemy-debut announcement. `stylePeakIdx` is the
run-end "peak rank" recap line. Debug: `__hd.debug.addStyle(n)` / `getStyle()`.

**Render / feel:** ACES tone mapping + `EffectComposer` (`RenderPass` →
`AfterimagePass` 0.72 (HYPERDEMON motion smear) → `UnrealBloomPass` 0.7/0.45/0.6 →
chromatic-aberration `ShaderPass` → `OutputPass`); smear/shake/chroma each sit behind a
pause-menu toggle. Bloom is *selective* via HDR colors (white daggers/blade/crown, red
eyes/veins/gems exceed 1.0). A **trauma** value (kills, shotgun, dash,
death) drives camera shake + the chroma amount; dash and shotgun kick the FOV. The
first-person **voxel gauntlet** is a camera child (`scene.add(camera)` required) at
z −1.05 — closer and it smears into a slab at the screen corner; its glove is
checkerboarded because unlit same-color voxels read as one flat polygon. Death = red
vignette + slow-mo debris.

**Audio (`audio.js`):** all-synth, no assets. A detuned-saw **drone** underlays every run;
over it sits an **intensity-driven music layer** — an A1 minor-pentatonic arpeggio on a
lookahead scheduler (`musicUpdate(intensity)` called each frame schedules 16th notes
~0.15 s ahead so it stays steady regardless of frame rate; falling >0.25 s behind, e.g.
after a pause, resyncs instead of bursting). Voices layer in by intensity (computed in
`step()` from live-threat count + run progress): bass always, arp > 0.25, hi-hat tick
> 0.5, lead counter-melody > 0.75. `musicStart/Stop` bracket the drone in `startGame`/
`die`; a MUSIC pause-menu toggle (`opts.music`) reconciles live via `applyOpts` →
`musicPlaying()`.

Sky is a `BackSide` sphere: greyscale band shimmer over black with one dark-red ember
glow at the horizon (`fog: false`); the floor is a `CanvasTexture` white-on-black grid
on a circle of exactly `ARENA_R` — the grid simply ends at the edge, no barrier mesh. Death/menu/pause are DOM overlays; touch sticks
are drawn on the `#canvas-ui` overlay each frame. Hi-score lives in `localStorage` under
`hyperDaggerHi`. `window.__hd` exposes `{enemies, player, debris, daggers, gems,
serpents, audio, debug}` (debug: `addGems(n)`, `spawnSerpent()`, `spawnSpider()`,
`spawnLeviathan()`, `setTime(t)` + `getSchedule()` — the raw `nextXAt` timers, for
verifying onboarding pacing / announcements without real-time simulation) for console
tinkering and
automated smoke tests.

## Paper Route (`paperboy/`) — Architecture Notes

**Coordinate system:** forward = −z (the bike auto-advances into −z); +x is right. The
road, lawns, and kerbs are long static meshes re-centred on `player.position.z` every
frame, and the road's lane texture scrolls via `roadTex.offset.y` to sell the speed —
so the world is effectively infinite without moving the geometry.

**Camera / art:** a fixed-angle `OrthographicCamera` offset by `ISO_OFF` from the bike
gives the isometric Paperboy read; the route rolls mostly *up* the screen with a slight
rightward lean. Rendering is a plain `renderer.render` (no `EffectComposer`) with
`NoToneMapping`, and every mesh is **unlit `MeshBasicMaterial`** — no lights, shadows or
fog — for a flat 2D look. House "flash" on a delivery/smash is a colour lerp toward white
(`bodyMat.color.lerp(_WHITE, k)`), since `MeshBasic` has no emissive channel; `baseColor`
is updated on delivery so the house stays green after the flash settles.

**Streaming (`world.js`):** houses (both kerbs), hazards, and pickups spawn ahead of the
bike (independent z-cursors advancing toward `playerZ - SPAWN_AHEAD`) and are culled +
disposed once well behind. Houses are randomly subscriber (~55%, mint) or not (coral).
Each house carries a delivery zone `{ zoneX, z, zoneR }` near its mailbox.

**Throw → delivery:** `paper.js` is an arc-physics pool — `throw_(x,z,side,speed)` launches
a paper with lateral velocity toward `side`, slight forward lead, and gravity. On landing
it's flagged; `main` polls `papers.freshLandings()` and calls `world.resolvePaper(p)`,
which finds the nearest same-side house within `zoneR`: subscriber → deliver (250 ×
streak), non-subscriber → window smash (100). Tuning that matters: `THROW_VX`,
`HOUSE_X`/`zoneX`, and `zoneR` jointly set the deliverable lane band — land-x ≈
playerX + THROW_VX·flightTime must fall within `zoneX ± zoneR`, so the rider delivers
from the matching lane, not dead centre.

**Crash / lives:** `world.hazardHit()` returns an overlapping live hazard; a hit calls
`player.crash()` (mercy i-frames + flicker, returns false while invincible to avoid
double-hits), costs a life, breaks the streak. 0 lives → game over → auto-restart.

**Days:** every `DAY_DIST` (130 m) increments the day, bumps `player.setBaseSpeed` and
`world.setDifficulty` (hazard density + car speed), and awards a bonus. Hi-score persists
in `localStorage` under `paperRouteHi`.

**Controls:** desktop A/D-←/→ steer, W/S throttle, Z/X (or M) throw left/right, Space
throws toward the lean side, Esc pause. Touch: left-half stick (x = steer, y = throttle)
+ on-screen ◀ ▶ throw buttons whose hit-rects live on `InputManager` and are drawn by the
HUD.
