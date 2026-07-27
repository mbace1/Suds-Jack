# Radio Free Helsinki

A pirate news broadcast that looks like **half a Metal Gear codec screen**: one
portrait frame with **Toko** — the teal gel from Toko Drop — reading the day's
wire, and where the second portrait would be, a small animated picture per
story. Below it, a feed you swipe through like Shorts or a stories reel.

Three channels on the dial, four bulletins each. It covers what Helsinki
actually is — a games town wired into a tech industry, sitting next to a
defence band — and every bulletin has a **DECODE** button.

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
| page the feed | swipe up/down · ↑ ↓ · PageUp/PageDown · Space · **NEXT** |
| change channel | swipe left/right · ← → · the **◀ ▶** dial buttons |
| decode | **DECODE** · `D` |
| skip the read | tap the bulletin copy |
| mute | ♪ in the masthead (persisted in `localStorage` as `rfhSound`) |

Running off the end of a channel sweeps on to the next one, so NEXT alone walks
the whole wire.

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
    main.js       boot, the tune-in gate, paging, tuning, decode, the loop
    codec.js      the codec screen (both frames in ONE canvas) + the Reader
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
panel into detached `PixelScreen` buffers and blits them into a single 248×124
screen, so the two frames cannot drift apart when CSS scales the page.

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

Thirty checks in a real browser: zero console errors, the codec actually
animates (not a still frame), the reader types and can be skipped, DECODE grows
the plain readings and re-folds, paging and tuning and the sound toggle, every
one of the twelve bulletins carrying a full read *and* a decode, every visual
key being a real panel, every control at 44px, and **WCAG AA on every text
colour** — measured with the translucent decode-box background properly
composited, which is what a first pass got wrong by a factor of four.

`window.__rfh` is the console handle, same convention as `__dc` / `__hd` /
`__gol` in the sibling demos:

```js
__rfh.debug.open('amplification')   // jump to a bulletin
__rfh.debug.channel('DEFENCE')      // jump to a channel
__rfh.debug.toggleDecode()
__rfh.debug.stories()               // every id on the wire
__rfh.state                         // { channel, storyIdx, decoded, id }
```

## Deploying

Same caveat as the sibling demos: the published site is served from the
**`gh-pages` branch**, not `main`. Copy `radiofree/` (minus `test/`) onto
`gh-pages` to go live at `/Suds-Jack/radiofree/`, and bump the `?v=N`
cache-busters in `index.html` and every import together when you do.
