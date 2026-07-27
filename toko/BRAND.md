# TOKO MIDORI GAMES™

**The identity of the workshop.** The face, the two colours, the lockups, the
sticker sheet, the sting, and the one-line signature a game imports to be signed
by it.

Everything is **drawn in code from one geometry table**. There is not one image
asset in this folder — the SVG logo files are *generated* from the same arcs the
canvas strokes, so the file you hand a printer and the thing on screen cannot
drift apart. No build step, no dependencies, no CDN. Open
[`index.html`](index.html) to see all of it running.

> **Two things in here are reconstructions, not originals, and you should know
> which:**
> 1. **The face geometry** in `js/face.js` was measured off the master artwork.
>    It is accurate to about a pixel at logo size, but if the original vector
>    file exists, its numbers belong in `GEO` — replace them and everything
>    downstream updates.
> 2. **The logotype typeface** is the owner's licence and is *not* redistributed
>    here. See §4.

---

## 1. Who is signing this

Toko Midori is the masked artist behind the look of every cabinet in this
workshop. The mask is not a gimmick — it is the terms. You do not get a face, a
founder story or a personal brand to buy into. You get the work, and the work is
free, in a browser, with no account.

Toko is not against the machine. Toko is holding one — these games are built
with AI, out loud, on purpose, and nobody is pretending otherwise. What Toko is
against is the machine becoming the *audience*: a world where everything is
generated and nothing is **made**, where people scroll output instead of cutting
their own.

**Use the tools. Take the source. GO MAKE YOUR OWN.**

| | |
|---|---|
| Company | **Toko Midori Games**™ |
| Creator | **美鳥十湖** — *Toko Midori*, The Game Creator |
| Cry | `GO MAKE YOUR OWN` |
| Terms | `NO PUBLISHER · NO LAUNCHER · NO ACCOUNT` |

All of it lives in `VOICE` in [`js/palette.js`](js/palette.js), next to the
colours, because it is as fixed as the colours are.

---

## 2. The face

Round-capped strokes, one weight throughout, no fills and no corners.

- **The mouth** is two arcs opening up, nested and concentric. Both stop
  *short* of a semicircle, so the tips stand up straight instead of hooking
  outward — that is what keeps a clear band of air between the mouth and the
  eyes above it.
- **Each eye** is a semicircle **crown** with two straight parallel **legs**
  dropped from its ends.

### The eye has two states, and the logo is the closed one

| | | |
|---|---|---|
| **Closed** | `open: 0` | An upside-down U with **nothing between the legs**. The anime happy eye — smiling with the eyes shut. **This is the logo**, the default, and what every resting mark wears. |
| **Open** | `open: 1` | The same U with a **pupil** line down the middle. He is looking at you. |

Closed is the resting face. Open is an event: `glance()` in `util.js` lifts the
lids every eleven seconds or so, holds a moment, and shuts them again. In the
counter he opens them for as long as he is answering you, because that is the
one moment he is actually looking at somebody.

> **Four wrong answers got to this, and all of them were the same mistake:**
> leaving something in the middle of a face that is meant to be smiling with
> its eyes closed. A small arc nested inside (a dot floating in the arch). A
> stem hanging permanently from the crown (the eye read as an "m"). One arc
> swept 240° doing crown and legs together (it curls under and closes into a
> ring — an eyeball stuck on the face). That arc stopped at 200° (no ring, but
> the legs never come down and it is a shallow dome floating above the mouth).
>
> The crown and the legs are separate strokes because a single arc can be a
> ring or a dome but never an arch. The legs are parallel because everything
> else in this face is flat-sided. And the middle is empty because he is
> smiling.

**The stroke weight is the most sensitive number in the brand.** Too heavy and
the eye's slots close up and the arch renders as a blob with hairline cracks in
it. In the master artwork a leg, a slot and a stem are roughly equal widths,
which puts the stroke at about a fifth of the mouth's outer radius. It is
`GEO.stroke` and it is not a taste question.

### The carriers

| | |
|---|---|
| **The mark** | the bare face. Primary; anything printed |
| **Reversed** | paper on black. The screen default |
| **The badge** | the face on a disc. Stickers, pins, the favicon, the in-game signature |
| **The icon** | full bleed on a rounded square. App icons, cartridge labels |

**Minimum size: 44px.** Below that the slots start to close and the eyes go
solid. `sign()` clamps to it rather than letting a caller ship mud.

**Clear space:** one eye-radius on every side. The face already hangs low in its
own design box — align to `bounds()`, never to the box.

---

## 2b. The one, and the clusters

Beyond the mark there is the **character**: the face reversed out of a bust — a
rounded head on a short, wide stand. `drawHead` / `svgHead`.

> **Toko Midori is the one, the person.**
> **But also Toko Midori is clusters.**

The same head, packed with small heads — Toko, the members, the ex-members, the
members who have not arrived yet, and the players. One person and a crowd, drawn
with the same stamp. `drawCluster`.

Two rules come out of that, and they are the reason the cluster exists at all:

- **The crowd never wins the silhouette.** It is what the person is *made of*,
  so the big face is drawn over it at a heavier weight and must still read at a
  glance. If you cannot see the face, the cell is too coarse.
- **The stand is short and wide.** Drawn narrow it reads as a lightbulb; drawn
  like this it reads as shoulders, and the silhouette stays a person.

---

## 3. Two colours

```
RGB (0, 0, 0)       CMYK (0, 0, 0, 100)     #000000
RGB (240, 2, 127)   CMYK (0, 100, 0, 0)     #F0027F
```

Both are process primaries — 100% K and 100% M. That is the whole idea: it
prints anywhere, on any press, at no cost, with nothing to match. **White is the
paper, not a colour.** No tints, no shades, no gradients, no drop shadows.

Magenta is **4.0:1 on black**. It is a *mark* colour and a large-display colour.
**It is never body copy.** Body copy is white, or `--toko-smoke` (7.4:1) when it
needs to sit back.

### The carriers

The face also runs in a rotating set of nine flats — the mark in a colour on
white, and reversed out of a full-bleed colour tile. That is how the icons and
the stickers work: **one face, many carriers.**

This does not make them brand colours. Black and magenta are the identity;
these are what the mark is *carried on*, **one flat at a time**, never mixed and
never two inside a single mark. A carrier is a whole surface or it is nothing.

Several of those pairings — white on yellow especially — are nowhere near a text
contrast ratio. They carry the **mark** and never type. `STICKER` and `SHEET` in
`palette.js`.

---

## 4. The logotype

A **condensed squarish grotesque**: flat-sided bowls, square counters, tight
tracking, a clipped corner on the *G*, splayed *M*. Set in three lines that
stack almost solid, flush left, with the ™ at the foot of *Games*. A one-line
setting exists for anywhere too short to stack.

**The logotype is DRAWN, not set** — [`js/wordmark.js`](js/wordmark.js). It only
ever says three words, so those three words are outlines: no font file to
licence, to load, or to fail to load, which is the same rule the face already
keeps. The letterforms are drawn *after* the owner's face, by eye. They are
close, and they are ours.

Twelve glyphs exist, and only twelve — the letters `Toko Midori Games` needs.
That is deliberate. An alphabet would be a typeface, and a typeface is not ours
to redraw; a logotype is a drawing of three particular words.

Each glyph is a set of **solids** unioned together and a set of **holes**
punched out afterwards. The first cut filled them with `evenodd`, and wherever
two solids overlapped — a *d*'s stem crossing its bowl, an *s*'s bars meeting
its spines — the overlap cancelled and cut a white notch through the letter.

Leading is **1.06 × cap height**. The drawn glyphs fill 0…cap exactly, so the
size *is* the cap height; the 0.92 that suits a font (whose em box is taller
than its caps) laps the three lines over each other.

If the original vector artwork surfaces, its outlines belong in `GLYPHS`.

### The lockup

Face, gap, three lines, ™. **The logotype stands the same height as the face.**
That relationship *is* the lockup; nothing else about it is adjustable.

---

## 5. The glitch

[`js/glitch.js`](js/glitch.js): `tear`, `split`, `dropout`, `shuffle`,
`scanlines`, `carrier`, `noise`, plus `hit(ctx, w, h, intensity)` and
`pulse(t)`.

1. **Seeded.** A glitch you cannot reproduce is a bug wearing a costume.
2. **An event, not a state.** Below ~0.25 the mark reads clean. A logo that is
   permanently broken reads as a *rendering fault*, and nobody trusts a
   rendering fault.
3. **Off by default.** The resting animation of a Toko mark is a **blink** —
   the eyes squash shut for a beat every few seconds. That is the whole thing.
   The glitch is for stings, transitions and title cards; `sign()` takes
   `glitch: true` and does not assume it.

---

## 5b. The counter

A slim bar that sits at the top of the arcade and opens into a conversation with
Toko in the old Sierra idiom — a portrait, text that types itself out, and a
numbered list of things you are allowed to say. Police Quest at the front desk.

```html
<script type="module">
  import { mountChat } from './toko/js/chat.js';
  mountChat(document.querySelector('header'));   // inserted after it
</script>
```

**It is a hand-written dialogue tree, not a language model.** There is no network
call here and there never will be: the kit is offline-first and zero-dependency,
and a workshop whose whole position is *go make your own* should not answer you
with rented autocomplete. Toko says what Toko wrote — in
[`js/dialogue.js`](js/dialogue.js), which is the file to edit. Asking some things
unlocks others, so the conversation grows as you dig.

What it does beyond talking:

- **He picks a cabinet.** `WHAT SHOULD I PLAY?` reads the arcade's own
  catalogue (`window.__hub`) and answers with one game and a real link — the
  same one all day, which is the line he says while giving it. Dropped on a
  page with no catalogue he says he cannot see the floor, rather than throwing.
- **He remembers you came back.** Two things persist and nothing else: how many
  times you have opened the counter, and whether you asked for the tick. No
  identity, no profile, no account — the workshop is built on not having one.
- **A typing tick**, off until you ask for it, remembered after you do. The
  AudioContext is built lazily on that first gesture, because one created
  before a gesture just sits suspended and logs a warning for its trouble.

Rules it holds:

- **1–9 picks, ENTER skips the typing, ESC leaves.** Keyboard-first, like the
  games under it. Nothing traps you and no animation has to be watched to the
  end.
- **It must not push the games below the fold.** It sits *above* the cabinets,
  so the topic menu runs two columns where there is room; stacked, seven topics
  at the 44px tap floor made a panel nearly 600px tall.
- **The typing is time-driven, not a chain of timeouts.** A `setTimeout` per
  character pays the timer's minimum resolution every time, and an
  18ms-per-character line measured out at nearly 70 — the greeting took 2.6
  seconds to say eleven words. Every character gets a due time up front and one
  rAF walks the schedule.
- **Reduced motion prints the line whole.** No typing, no blink, no growth
  animation.

---

## 5c. The tempo

**Toko is always listening to Comfortably Numb.** That is the house note, and it
is a rule with numbers in it rather than a mood board: heavy-lidded, floating, a
long way from eager — and with a solo in it, so the calm is never the same thing
as flat.

It lives in `blink()` and `drift()` in [`js/util.js`](js/util.js), and every
resting mark in the kit keeps the same time.

- **The blink closes, DWELLS shut, and opens slower than it closed.** That
  asymmetry is the whole thing. A symmetrical blink reads awake; a fast one
  reads nervous. Roughly 0.17s down, 0.12s held shut, 0.36s back up, every
  7.5s — and **every fourth is a long one**, where the eyes stay shut a beat
  past comfortable.
- **Nothing is ever perfectly still, and nothing is ever quick.** `drift()` is
  a nine-second breath under the mouth; the amplitude is under 1%, which is the
  point.
- **The counter types at 34ms a character**, with a long beat between lines and
  a longer one before the first — Toko has to come back from wherever he was
  before he answers you.
- **The mouth talks slowly.** At 22 rad/s it chattered like a puppet; it runs
  at 11.

Two things this rule does **not** cover. `pulse()` — the glitch cadence — stays
square and harsh, because the glitch is the machine and not Toko. And the
sting's *timeline* stays brisk: it is an event, and an event you cannot skip is
an ad. Only the blink inside it slowed down.

`test/brand.cjs` measures the curve — that it fully closes, that it dwells, and
that opening takes over 1.5× the time closing does. Untested, a "just a touch
snappier" walks it back one commit at a time until Toko is blinking like a
cursor.

---

## 6. Signing a page

```html
<script type="module">
  import { sign } from '../toko/js/signature.js';
  sign();                                     // bottom-left, non-interactive
  // sign({ corner: 'bottom-right', href: '../toko/' });
</script>
```

The badge goes in a corner at `z-index: 4` — **under** the game's HUD, over the
game canvas — takes no input unless you give it an `href` (then it holds a 44px
tap target), honours the safe-area insets, and paints one still frame for anyone
who has asked for reduced motion.

Signed on `main`: `toko-drop/`, `paperboy/`, `dropcabal/`, `hyperdagger/`.

Other entry points:

```js
import { playSting, playStingOnce } from '../toko/js/sting.js';
import { startMasthead }            from '../toko/js/masthead.js';
import { paintSignature }           from '../toko/js/signature.js';   // your own canvas
import { drawLockup, drawSheet }    from '../toko/js/lockup.js';
import { svgFace, svgBadge, faviconHref } from '../toko/js/face.js';
```

`startMasthead(el)` — `stop()` it wherever the page re-renders, or the loop
leaks against a detached canvas (a bug the Game of Life hub has already paid for
once).

### `gameoflife/` is deliberately unsigned

It is the one room where Toko takes the mask off — a zen app whose entire job is
to be quiet and send you outdoors, and a magenta badge in its corner would undo
the thing it exists to do. There is a hard technical reason too: its service
worker precaches an exact file list scoped to `/gameoflife/`, and
`test/offline.cjs` asserts **zero** network requests during a whole experience,
so a cross-directory import would break the offline promise either way.

---

## 7. Rules

**Do**

- Draw the face from `GEO`. Every number there was measured; there is no
  "roughly".
- Align to `bounds()` — the ink — not to the design box.
- Keep the two colours, and let the paper be the paper.
- Let it blink. That is the animation.
- Say when the typeface is substituted.

**Don't**

- Don't re-weight the stroke. It closes the eyes.
- Don't outline, gradient, bevel, shadow, or rotate the face.
- Don't set body copy in magenta.
- Don't take the sticker colours into anything on a screen.
- Don't stretch the lockup — the logotype is the face's height, always.
- Don't put the mark below 44px, and don't put it on a photograph.

---

## 8. The files

```
toko/
  BRAND.md        this
  index.html      the brand board — every mark live, with SVG downloads
  toko.css        the palette as custom properties + the CSS-only glitch
  js/
    palette.js    the two colours, the sticker sheet, the type spec, the words
    face.js       THE MARK — one geometry table, canvas and SVG out of it
    lockup.js     the logotype, the lockups, the sticker sheet, the credit line
    surface.js    a device-pixel-ratio canvas with a reduced-motion-safe loop
    glitch.js     tear / split / dropout / shuffle / scanlines / carrier / hit
    util.js       seeded RNG + the resting pulse
    sting.js      the three-second sting (skippable from frame one)
    chat.js       the counter — the conversation panel, self-contained
    dialogue.js   what Toko says. Edit THIS to change the conversation
    signature.js  sign() — the drop-in corner badge
    masthead.js   the animated lockup for the arcade hub
    board.js      wires the board out of the shipping modules
  test/
    brand.cjs     the gate: geometry, SVG, sting, every signed game
```

> **Deploy:** the live site serves from the **`gh-pages`** branch, not `main`.
> `toko/` and the signed game `index.html` files both have to be copied there to
> go live at `/Suds-Jack/toko/`.
