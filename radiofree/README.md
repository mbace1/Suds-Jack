# Radio Free Helsinki

A pirate news broadcast in a **vertical feed**: one bulletin per screen, snapping
as you scroll, the way a phone feed works. Each post is **half a Metal Gear codec
screen** stood on end — the story's picture on top, **Toko** (the teal gel from
Toko Drop) reading the wire below it with a data column and a waveform — plus a
right-hand rail and the copy underneath.

All twelve bulletins live in one column, ordered by channel. It covers what
Helsinki actually is — a games town wired into a tech industry, sitting next to a
defence band — and every bulletin has a **DECODE** button.

**Vertical is the format, not a mode.** The pictures are drawn portrait for it;
a landscape card inside a vertical post reads as something shot for another
screen and cropped in.

> **Every bulletin is fiction.** The studios, ministries, ports and operators
> are invented, and no real company, agency or country is described or accused
> of anything. What is *not* invented is the language. Each item is written the
> way this kind of story really gets written, and DECODE names the move it is
> pulling. The propaganda is the subject, not the payload.

**Trilingual: fi / en / ja.** Every word — the twelve bulletins, their decode
notes and their tells, not just the chrome — exists in all three. Browser-
detected, switchable from the masthead, persisted.

**Offline-first and installable.** It is a news feed you read on a phone, which
means it gets read on a metro — so the shell is precached and the whole thing
runs with no network.

No build step, no assets, no CDN — open `radiofree/index.html`. Every pixel
(Toko's face, all twelve panels, both app icons) is drawn in code.

## Playing

| | |
|---|---|
| move through the feed | **scroll / swipe** · ↑ ↓ · PageUp/PageDown · Space · the **▼ NEXT** rail button |
| jump between channels | ← → · the **◀ ▶** dial buttons |
| decode | the **⧉ DECODE** rail button · `D` |
| skip the read | tap the bulletin copy |
| language | the **EN / FI / JA** button in the masthead (cycles; `rfhLang`) |
| mute | ♪ in the masthead (persisted in `localStorage` as `rfhSound`) |

Scrolling is the primary control; the dial in the masthead is a *readout* of
which channel the scroll has put you on, and a way to jump to another one.

**Only the post you are on is live.** It re-tunes (the picture fades up out of
noise), types its bulletin and drives the lip-sync. Its neighbours keep the one
frame they were painted with, so scrolling shows real pictures instead of blank
boxes and nothing off-screen burns a frame budget. A post you have not reached
yet holds its headline and a standby line where the copy will be — you cannot
hear a station you have not tuned to.

## The sign-off

The feed does not just stop after the twelfth bulletin. The station signs off:
a test card, the carrier gone, `--.--` on the dial — and it hands back the
twelve techniques, marking the ones **you** actually opened and printing their
tells at you. The ones you skipped stay dim, and say so.

The last bulletin on the defence band turns the frame on this station; the
sign-off is the same move made specific to you, which is why the count is real
rather than flattering. What you decoded persists (`rfhDecoded`), so a
technique found once is still credited on the next visit.

## Sharing a bulletin

The address follows the scroll — `#seabed` while you are on the seabed story —
and a link that names a bulletin opens on it. That is what makes a post worth
sending someone; a link that lands them at the top of a twelve-story pile is a
different link.

It is `replaceState`, not `push`: the back button leaves the page instead of
walking twelve fake history entries. The trap that buys — and the reason it has
to be `replaceState` — is that it does **not** fire `hashchange`, so the handler
that catches pasted links can never be triggered by the app's own writes.

## Offline

`sw.js` precaches the shell cache-first and `manifest.webmanifest` makes it
installable. The worker registers **over https only** (or with `?sw=1`), so
local dev and the smoke gate are never handed a stale shell by a worker they
did not ask for.

There is no build step, so the precache list names every file by hand — exactly
the kind of list that goes stale in silence. The gate checks it against what is
actually in `js/`, checks that `sw.js`'s version agrees with the `?v=N` the page
requests, and then proves the point the hard way: it registers the worker, cuts
the network, reloads, and reads a bulletin.

**Bump `sw.js`'s `VERSION` and `V` with the rest of the `?v=N` tokens.** A new
deploy has to be a new cache name or the old shell simply stays.

## DECODE — the point of the thing

Press it and the bulletin re-reads itself in plain language. The broadcast
wording stays on screen, struck through, and the plain reading grows in beside
it in amber:

> ~~Ninety-two roles were affected~~ → **The board voted to fire ninety-two people**

Underneath, a drawer names the technique (`AGENTLESS PASSIVE`), explains what it
did, and gives a **TELL** — the question that catches it next time, in the wild:

> *When you cannot answer "who did this?" from the sentence, that was the
> sentence's job.*

The twelve techniques: agentless passive, missing denominator, euphemism,
manufactured consensus, selective baseline, nominalization, source laundering,
numbers as atmosphere, category drift, anonymous authority, procurement dialect,
and — last on the defence band, pointed back at this station — the pre-emptive
frame.

**The pictures decode too.** The framing is never only in the words, so every
panel changes under DECODE: the truncated bar chart re-bases to zero and the
mountain becomes the bump it always was, the valuation tower goes hollow except
for the 6% actually sold, the full auditorium empties to the four people who
were on the stage, and the nine hundred accounts around a topic collapse into a
fan spoked to the one node that made them. Decoding the text without decoding
the chart would teach half the lesson.

## Languages

The three versions are **not translations of each other's tricks**. Each one
spins its bulletin the way that language really does it, so the technique on
display is one a reader of that language would actually meet:

- **Finnish** has a true agentless passive, so `kaiku-restructure` reaches for
  it directly — *"Yhdeksänkymmentäkaksi tehtävää oli sopeutusten kohteena"* —
  and the decode is `AGENTITON PASSIIVI`.
- **Japanese** hides the actor in 〜される and in the polite noun (再編、協議、
  対応), which is what `vuosaari-automation` leans on; its technique is 名詞化.
- **English** keeps the -ation nouns and "sources close to".

Switching language rebuilds the feed in place: same post, same decode states,
same scroll position. `<html lang>` follows, so a screen reader changes voice
and the browser picks Japanese glyph forms instead of guessing.

Two things the reader does per language: Japanese types at **26 characters per
second** against 72 for the Latin scripts (a kanji carries far more than a
letter, and the same rate flashes a bulletin past unread), and a **kana counts
as a full mouth opening** rather than a consonant — Japanese is mora-timed, so
letter-by-letter amplitude would leave Toko's face nearly shut through a whole
bulletin.

## The channels

| freq | call | band |
|---|---|---|
| `87.60` | KAIKU | games / studios |
| `104.40` | VERKKO | tech / industry |
| `141.12` | VARTIO | defence / signal |

## Files

```
radiofree/
  index.html      shell + all CSS (codec chrome, CRT scanlines, feed layout)
  js/
    main.js       boot, the tune-in gate, the feed, tuning, decode, the loop
    codec.js      one post's screen (both frames in ONE canvas) + the Reader
    toko.js       the anchor: gel wobble, blink, lip-sync, decode tear
    visuals.js    the twelve story panels + the sign-off test card
    stories.js    the wire — copy, decode readings, techniques, tells (fi/en/ja)
    i18n.js       every other string, in all three languages
    screen.js     PixelScreen: small canvas, hard-pixel upscale, dither helpers
    audio.js      synth codec kit + the carrier hiss, all through one master gain
    palette.js    single source of truth for colour
  sw.js           the offline shell (precaches every file by name)
  manifest.webmanifest
  icon-192.png    drawn in code and baked — see the note below
  icon-512.png
  test/
    smoke.cjs     the gate (see below)
```

## Notes for anyone editing it

**Toko is lip-synced, not flapping.** `Reader.update()` returns a mouth
amplitude per frame from the character it just typed — vowels open it, spaces
close it — and that value is what `Toko.update()` drives the mouth with. If you
change how text is revealed, keep the amplitude coming or the face goes dead.

**Both frames live in one canvas.** `codec.js` draws the portrait and the story
panel into detached `PixelScreen` buffers and blits them into a single 144×276
screen, so the two frames cannot drift apart when CSS scales the post.

**Which post is live is read off the scroll position**, not from an
IntersectionObserver. The observer version could not be trusted: its callback
arrives asynchronously, so a jump — a deep link, a channel change — would land
correctly and then be overridden a frame later by a queued entry from where the
feed used to be. Every post is the same height, so the answer is one division.

**`behavior: 'auto'` does not mean "jump".** In `scrollTo`/`scrollIntoView` it
means *defer to CSS*, and the feed's CSS is `scroll-behavior: smooth` — so
asking for `'auto'` politely animates. `'instant'` is the one that lands.

**Amber has one job.** It means "the spin is showing" and it never appears
before DECODE. Sector colours (cyan/green/red) carry the channel; green is the
default phosphor. Adding an amber accent anywhere else costs the app the one
piece of colour vocabulary it teaches.

**A mistyped visual key falls back silently** to the bar chart, which would ship
the wrong picture beside the right words. `PANEL_KEYS` is exported from
`visuals.js` and the gate checks every story's key against it.

**A missing string does not throw.** `t()` returns the key, and a raw key is
still a non-empty string, so `rail.decode` would ship quietly on a button. The
gate checks that all three blocks carry every interface key and every field of
every bulletin — including that each language's lines still contain `{{…|…}}`
markup, since a bulletin with nothing marked has nothing to decode.

**The icons are drawn, not authored.** A 48px pixel Toko in a codec frame,
nearest-neighbour upscaled and baked to PNG by a throwaway script — the same
rule as everything else here. Redraw them rather than editing the PNGs.

**Sample `bayer()` at the cell index.** Drawing in 2px cells while calling
`bayer(x, y)` only ever reaches four of its sixteen thresholds and the stipple
collapses into a regular dot grid — the gulf water column did exactly that. Use
`bayer(x >> 1, y >> 1)`.

## The gate

```sh
NODE_PATH=/opt/node22/lib/node_modules node radiofree/test/smoke.cjs
```

Seventy-one checks in a real browser: zero console errors; the feed is vertical (one
post per screen, snapping, media portrait both in the buffer and on screen); the
live codec animates while its neighbours hold their painted frame and unread
posts sit on standby; the reader types and can be skipped; DECODE grows the
plain readings, re-folds, and stays per-post; scrolling, the rail, the keyboard
and the dial all move the feed; every one of the twelve bulletins carries a full
read *and* a decode; every visual key is a real panel; **fi/en/ja are complete**
(every interface key and every field of every bulletin, with markup to decode)
and switching language keeps your place and your open drawer; every control is
44px; the sign-off closes the feed, lists all twelve techniques and marks the ones
you decoded (in every language); the address follows the scroll and a `#id`
link opens that bulletin
without pushing history; the precache names every module and agrees with the
page's version; the app **really boots with the network cut**; and **WCAG AA on
every text colour** — measured with the translucent decode-box
background properly composited, which is what a first pass got wrong by a factor
of four.

`window.__rfh` is the console handle, same convention as `__dc` / `__hd` /
`__gol` in the sibling demos:

```js
__rfh.debug.open('amplification')   // jump to a bulletin (instantly)
__rfh.debug.channel('DEFENCE')      // jump to a channel
__rfh.debug.go(1)                   // scroll a post
__rfh.debug.toggleDecode()
__rfh.debug.setLang('ja')           // rebuilds the feed in place
__rfh.debug.stories()               // every id on the wire
__rfh.state                         // { channel, index, decoded, id }
```

## Deploying

Same caveat as the sibling demos: the published site is served from the
**`gh-pages` branch**, not `main`. Copy `radiofree/` (minus `test/`) onto
`gh-pages` to go live at `/Suds-Jack/radiofree/`, and bump the `?v=N`
cache-busters in `index.html` and every import together when you do.

**Shipped** — it is on the arcade floor as a cabinet (`hub/games.js` +
a `codec` marquee in `hub/art.js`), and its page carries
`<script type="module" src="../hub/shell.js?v=9">` like every other game, which
is what puts the HUB button in the corner. Two things that bit on the first
deploy:

- **Bump every hub token together.** `games.js` was being reached at `?v=5`
  from `hub.js` and `?v=8` from `shell.js`; a new cabinet stays invisible to
  anyone holding either cached copy, so both — and every game page's
  `shell.js?v=` — moved to 9 in one go.
- **The shell owns the top-left corner.** Its HUB button is fixed there, which
  is where this app's own wordmark sat. `body:has(.arcade-home) .logo` now
  hides ours; anything else new should check that corner before using it.
