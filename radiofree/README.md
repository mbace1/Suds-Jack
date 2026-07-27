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

No build step, no assets, no CDN — open `radiofree/index.html`. Every pixel
(Toko's face, all twelve panels) is drawn in code.

## Playing

| | |
|---|---|
| move through the feed | **scroll / swipe** · ↑ ↓ · PageUp/PageDown · Space · the **▼ NEXT** rail button |
| jump between channels | ← → · the **◀ ▶** dial buttons |
| decode | the **⧉ DECODE** rail button · `D` |
| skip the read | tap the bulletin copy |
| mute | ♪ in the masthead (persisted in `localStorage` as `rfhSound`) |

Scrolling is the primary control; the dial in the masthead is a *readout* of
which channel the scroll has put you on, and a way to jump to another one.

**Only the post you are on is live.** It re-tunes (the picture fades up out of
noise), types its bulletin and drives the lip-sync. Its neighbours keep the one
frame they were painted with, so scrolling shows real pictures instead of blank
boxes and nothing off-screen burns a frame budget. A post you have not reached
yet holds its headline and a standby line where the copy will be — you cannot
hear a station you have not tuned to.

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
    visuals.js    the twelve story panels, each of which changes under decode
    stories.js    the wire — copy, decode readings, techniques, tells
    screen.js     PixelScreen: small canvas, hard-pixel upscale, dither helpers
    audio.js      synth codec kit + the carrier hiss, all through one master gain
    palette.js    single source of truth for colour
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

**Sample `bayer()` at the cell index.** Drawing in 2px cells while calling
`bayer(x, y)` only ever reaches four of its sixteen thresholds and the stipple
collapses into a regular dot grid — the gulf water column did exactly that. Use
`bayer(x >> 1, y >> 1)`.

## The gate

```sh
NODE_PATH=/opt/node22/lib/node_modules node radiofree/test/smoke.cjs
```

Forty checks in a real browser: zero console errors; the feed is vertical (one
post per screen, snapping, media portrait both in the buffer and on screen); the
live codec animates while its neighbours hold their painted frame and unread
posts sit on standby; the reader types and can be skipped; DECODE grows the
plain readings, re-folds, and stays per-post; scrolling, the rail, the keyboard
and the dial all move the feed; every one of the twelve bulletins carries a full
read *and* a decode; every visual key is a real panel; every control is 44px;
and **WCAG AA on every text colour** — measured with the translucent decode-box
background properly composited, which is what a first pass got wrong by a factor
of four.

`window.__rfh` is the console handle, same convention as `__dc` / `__hd` /
`__gol` in the sibling demos:

```js
__rfh.debug.open('amplification')   // jump to a bulletin (instantly)
__rfh.debug.channel('DEFENCE')      // jump to a channel
__rfh.debug.go(1)                   // scroll a post
__rfh.debug.toggleDecode()
__rfh.debug.stories()               // every id on the wire
__rfh.state                         // { channel, index, decoded, id }
```

## Deploying

Same caveat as the sibling demos: the published site is served from the
**`gh-pages` branch**, not `main`. Copy `radiofree/` (minus `test/`) onto
`gh-pages` to go live at `/Suds-Jack/radiofree/`, and bump the `?v=N`
cache-busters in `index.html` and every import together when you do.
