# TOKO MIDORI — 常緑

**The masked artist behind the Suds Jack workshop.** This folder is the whole
identity: the marks, the colour, the letterforms, the glitch, the sting, and the
one-line signature a game imports to be signed by it.

Everything here is **painted in code**. There is not one image asset in this
brand — no PNG, no font file, no SVG on disk. The SVG logo files are *generated*
from the same string art the canvas draws, so the file you hand someone can
never drift from the thing on screen. Open
[`index.html`](index.html) to see all of it running.

---

## 1. Who is signing this

Toko Midori is the artist behind the look of every cabinet in this workshop. The
mask is not a gimmick — it is the terms. You do not get a face, a founder story
or a personal brand to buy into. You get the work, and the work is free, in a
browser, with no account.

Toko is not against the machine. Toko is holding one — these games are built
with AI, out loud, on purpose, and nobody is pretending otherwise. What Toko is
against is the machine becoming the *audience*: a world where everything is
generated and nothing is **made**, where people scroll output instead of cutting
their own.

So the identity shows its seams on purpose. Every mark is allowed to tear, drop
out and lose the signal, because a thing that is obviously constructed is a
thing you can obviously build yourself.

**Use the tools. Take the source. GO MAKE YOUR OWN.**

### The name

**常緑** — *tokomidori*, an old Japanese reading of the word for **evergreen**:
the green that does not drop. It is the right name for a workshop whose other
project spends its whole runtime sending you back outside, and it is the reason
the identity is built on exactly one green.

### The voice

| | |
|---|---|
| Primary cry | `GO MAKE YOUR OWN` |
| Secondary | `NO PUBLISHER · NO LAUNCHER · NO ACCOUNT` |
| Where it has to fit | `NO ACCOUNT · NO LAUNCHER` |
| Workshop note | `PAINTED IN CODE · NO IMAGE ASSETS` |

All four live in `VOICE` in [`js/palette.js`](js/palette.js) — next to the
colours, because they are as fixed as the colours are. Short, imperative,
uppercase, no exclamation marks. Toko does not sell, apologise, or say *we*.

---

## 2. The marks

One **24 × 24** grid, written as string art in [`js/mark.js`](js/mark.js) — the
same idiom hyperdagger builds its voxel enemies from, so the logo is legible as
source code, editable in a text editor, and impossible to lose to a missing
binary.

| Mark | Grid | Where |
|---|---|---|
| **The mask** | 24 × 24 | the primary. Screens, marquees, mastheads, anywhere ≥ 48px |
| **The reduction** | 16 × 16 | favicons, credits lines, anywhere the 24 would turn to mud |
| **The seal** | 22 × 22 | the *signature* — corners, stamps, credits |
| **The wordmark** | 5×7 type | the name, letterspaced hard |
| **The stack** | — | name / rule / cry, for a title screen |
| **The lockup** | — | mask + name + a game, in the game's colour |

Construction notes that matter, because they are the difference between the mask
and a face with features drawn on it:

- **The brows are the shell colour, not the light.** Dark brow over dark slit
  over dark mouth is what makes a mask read as a mask.
- **The one light is a streak angled down the upper left** — lacquer catching a
  room. It was a band across the whole crown first and read as a *headband*.
  Light has a direction or it is a hat.
- **The crack runs off centre.** It is plotted by hand (`CRACK` in `mark.js`) so
  it is the same break every time — a signature, not a random fracture. Down the
  midline it would read as a manufacturing seam, which is the opposite of what
  it is saying.
- **The reduction is redrawn, not resampled.** It drops the crown light and the
  crack and keeps the brow; without the brow it stops being a mask and starts
  being a smiley.
- **The seal is a hanko, and a hanko is always red.** Toko's is chipped, on a
  press that was never serviced. The chips are seeded, so every impression is
  the same impression.

### Registers

A mark is drawn in exactly one of four (`REGISTER` in `js/palette.js`):

- **LIVE** — green on void. The default: screens, marquees, in-game.
- **STAMP** — hanko red. Anywhere Toko is *signing* rather than speaking.
- **GHOST** — one colour, no depth. 16px, print, any surface that cannot hold
  the green.
- **RIOT** — green torn by red, phosphor in the highlights. **Only ever exists
  on the frame a hit lands on.** It is not a resting state and must never be
  used as one.

---

## 3. The palette

One green held against a near-black void, a hanko red for the signature, and two
phosphors *borrowed* from the games. **If a mark needs a colour that is not in
this table, the mark is wrong.**

The mask is allowed exactly six inks: `MIDORI`, `MIDORI_DEEP`, `LUX`,
`VERMILION`, black for the slits, and **one** derived shade —
`shade(MIDORI, 0.45)` for the crack. `toko/test/brand.cjs` reads the rendered
mask back pixel by pixel and fails on anything else, so a colour cannot be
smuggled into the identity by accident.

| Token | Hex | On the void | Use |
|---|---|---|---|
| `MIDORI` | `#4ce08a` | 11.4:1 | **the** colour. Safe as text at any size |
| `MIDORI_DEEP` | `#146b46` | — | shell, brows, seams |
| `MOSS` | `#0d241a` | — | the fill behind a mark |
| `LUX` | `#a6e85a` | — | the crown light (= Game of Life `LEAF_LUX`) |
| `VERMILION` | `#e5372c` | 4.6:1 | **the stamp.** Legal as text, but it is a stamp colour — do not set body copy in it |
| `VERM_DEEP` | `#7d1a14` | — | the press |
| `PHOSPHOR` | `#35e8d8` | — | *borrowed:* the arcade terminal. The machine's colour, never Toko's |
| `GOLD` | `#ffd75a` | — | *borrowed:* reward, not identity |
| `BONE` | `#ece5d5` | 15.3:1 | body copy |
| `ASH` | `#96a29a` | 7.7:1 | dim copy |
| `VOID` | `#05070a` | — | the ground (= the arcade hub's background) |

The void is deliberately the hub's `#06070a` neighbourhood so a Toko mark
dropped onto the arcade sits on its own colour instead of floating in a box.

Every text pairing above clears **WCAG AA**. That is a brand rule here for the
same reason it is one in `gameoflife/` and `hub/`: hierarchy comes from size and
space, never from being unreadable.

---

## 4. The alphabet

**5 × 7, cut by hand** (`FONT` in [`js/pixel.js`](js/pixel.js)): A–Z, 0–9 and
`. , ! ? - : ' / · ×`. One pixel of air between glyphs; the wordmark tracks at
two.

The brand owns its letterforms outright — there is no font file to license, to
load, or to fail to load. Anything the identity ever needs to say, it says in
these. `textRows()` lays a string out as string art, which is what the SVG
exporter eats, so the wordmark that ships as a logo file is byte-for-byte the
letterforms the canvas draws.

---

## 5. The glitch

[`js/glitch.js`](js/glitch.js): `tear`, `split`, `dropout`, `shuffle`,
`scanlines`, `carrier`, `noise`, and the two calls that matter —

```js
hit(ctx, w, h, intensity, { seed, t })   // everything above, on one 0..1 dial
pulse(t, { every: 6.5, len: 0.34 })      // the resting behaviour of every mark
```

Four rules:

1. **Seeded.** A glitch you cannot reproduce is a bug wearing a costume.
2. **It is an event, not a state.** Below ~0.25 the mark reads clean. A logo
   that is permanently broken reads as a *rendering fault*, and nobody trusts a
   rendering fault. `pulse()` is the shape: still, a third of a second of
   stutter, still again — roughly every eight seconds.
3. **Whole art pixels only.** Glitch the small canvas, never the upscaled one,
   so a tear is always a whole number of fat pixels.
4. **No scanlines on a small mark.** Below ~48 art pixels one scanline lands on
   every *other* logo pixel and stripes the mark instead of glassing it.

---

## 6. Signing a page

One import. It stamps the seal into a corner, sits under the HUD, never takes
input unless you give it an `href`, holds a 44px tap target when you do, and
paints a single still frame for anyone who has asked for reduced motion.

```html
<script type="module">
  import { sign } from '../toko/js/signature.js';
  sign();                                        // bottom-left, non-interactive
  // sign({ corner: 'bottom-right', href: '../toko/' });
</script>
```

Signed on `main`: `toko-drop/`, `paperboy/`, `dropcabal/`, `hyperdagger/`.

Other entry points:

```js
import { playSting, playStingOnce } from '../toko/js/sting.js';
import { startMasthead }           from '../toko/js/masthead.js';
import { paintSignature }          from '../toko/js/signature.js';  // into your own canvas
import { svgMask, svgSeal, svgWordmark, faviconHref } from '../toko/js/mark.js';
```

`startMasthead(el)` is the arcade hub's header — remember to `stop()` it
wherever the page re-renders, or the loop leaks against a detached canvas (a bug
the Game of Life hub has already paid for once).

### `gameoflife/` is deliberately unsigned

The Game of Life is the one room where Toko takes the mask off. It is a zen
app whose entire job is to be quiet and send you outdoors; a stuttering
vermilion stamp in its corner would undo the thing it exists to do. There is
also a hard technical reason: its service worker precaches an exact file list
scoped to `/gameoflife/`, and `test/offline.cjs` asserts **zero** network
requests during a whole experience — a cross-directory import would break the
offline promise. It stays unsigned in both senses.

---

## 7. Rules

**Do**

- Draw the mask at whole-number scales. It is a pixel grid; 1.5× is not a size.
- Give it air: at least 3 mask-pixels of clear space on every side.
- Use LIVE by default, STAMP to sign, GHOST when the surface cannot hold green.
- Let the game keep its own accent in a lockup. Toko is the green; the cabinet
  is its own colour.
- Let it hold still. `pulse()` already knows when to break.

**Don't**

- Don't recolour the mask outside the four registers.
- Don't leave RIOT on screen. It is one frame, not a look.
- Don't set body copy in vermilion, and never in vermilion on green.
- Don't resample the 24 down to 16 — there is a 16 for that.
- Don't add a sixth colour, a drop shadow, a gradient, or a rounded corner.
- Don't put a mark on a photograph. There are no photographs here.

---

## 8. The files

```
toko/
  BRAND.md          this
  index.html        the brand board — every mark, live, with SVG downloads
  toko.css          the palette as CSS custom properties + the CSS-only glitch
  js/
    palette.js      colour, registers, voice
    pixel.js        the surface, the 5×7 alphabet, the pen, seeded RNG
    mark.js         the marks — canvas AND SVG, from one grid
    glitch.js       tear / split / dropout / shuffle / scanlines / carrier / hit / pulse
    sting.js        the three-second boot sting
    signature.js    the drop-in corner signature
    masthead.js     the animated header for the arcade hub
    board.js        wires the brand board (imports nothing the games don't)
  test/
    brand.cjs       headless gate: marks draw, SVG emits, signed games stay clean
```

No build step, no dependencies, no CDN. Copy `toko/` next to a game and it
works.

> **Deploy:** the live site is served from the **`gh-pages`** branch, not `main`.
> `toko/` has to be copied there — together with the game `index.html` files
> that import it — to go live at `/Suds-Jack/toko/`.
