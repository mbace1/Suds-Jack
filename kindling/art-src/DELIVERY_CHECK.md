# Checking a delivery — the two tools, and what they found

`ART_REQUESTS.md` §1 states the rules that make a sheet cuttable. These two
tools **measure** them, because a rule nobody can check is a rule that gets
broken silently — and this project has already paid for that twice: five scene
concepts arrived at 160×90 (thumbnails of the art, not the art), and a
re-delivery arrived truncated. Neither is visible in a file listing.

```
node tools/art-manifest.cjs expect <dir> > MANIFEST.md   # publish sums BEFORE the files arrive
node tools/art-manifest.cjs verify <dir> MANIFEST.md     # checks bytes AND sha256
NODE_PATH=$(npm root -g) node tools/art-check.cjs <dir>  # is it cuttable?
```

## Why publish sums first

PR #282 shipped the pack as base64 chunks. It produced 107,789 bytes against a
manifest claiming 116,809, and the only symptom anyone had was *"the archive
will not open"* — which could mean a bad zip, a bad script, a bad upload or a
bad file. With sums published first it reports **which file, and how many bytes
short**. It also separates a *broken* file from a *substituted* one: right size
and wrong hash is somebody's other draft, not a transfer fault.

Eeri does exactly this and it paid off — `BINARY_STATUS.md` there published the
checksums before the binaries existed, so the approved machine roster was
identified **by hash rather than by eye**, which is what makes *"do not infer
approval for discarded intermediate sheets"* enforceable instead of hopeful.

## What `art-check` measured on the current delivery

**19 of 19 files fail, all four ways: not PNG · under 320×180 · no alpha ·
presentation board.** That is not a surprise — it is `ART_REQUESTS.md` §0 in
numbers rather than prose. The useful column is the **corner test**: a board is
opaque and dark at all four corners, which is precisely what makes it readable
and uncuttable, and 17 of 19 are 4/4.

### The finding that is NOT already in ART_REQUESTS

**Distinct colour counts run 3,110 – 20,073.**

Rule 4 asks for true pixel art at 1:1 rather than an illustration with a pixel
filter over it. A genuine limited-palette sheet has **dozens** of colours. These
have thousands, which means they are illustrations that *look* pixelly — every
edge is anti-aliased into in-between values.

At the same time **74–100% of sampled pixels sit within 24 of a colour already
in `js/palette.js`**. So the art is on-palette in *spirit* — the hues are right,
and sampling the palette off these references (as `js/palette.js` now does) was
the correct call.

Both things being true at once is the actionable part:

> **A re-delivery at 320×180 in PNG with alpha would still fail rule 4 unless it
> is also QUANTISED to the palette.** Size, format and transparency are
> transfer problems. The colour count is an *authoring* problem, and it is the
> one that does not fix itself by exporting differently.

Worth stating in the next request in exactly those terms: *quantise to the
shared palette, no anti-aliasing, nearest-neighbour only* — otherwise the same
sheets come back bigger and still soft, and the round trip is spent.

## Using them as a gate

`art-check.cjs` is **advisory by default** so it can be run against art nobody
has promised yet. Pass `--strict` to exit non-zero once a delivery is supposed
to conform. It is deliberately not wired into `test/smoke.cjs`: the smoke gate
tests the *game*, and no art here is loaded by the game yet.

## The third tool: `art-cool.cjs`, and why a good-looking layer failed anyway

Batch 1 landed and every gate went green. The art is genuinely good — native
pixel art, binary alpha, correct sizes, on palette. It still broke the thing
this game is built around, and no check caught it because every check was
asking whether the file was *cuttable*, not what it did to the *loop*.

`js/palette.js` states the scheme in one line: **the environment is COLD and
the fire is the only warm thing in it.** That is not a mood. `lightAt()` is a
MEASURE — how far the ember ramp reaches IS the day's tally — so warmth the art
bakes in is warmth the day can no longer add.

Measured warmth per delivered layer, before any fire exists (red leading blue
by more than 40, the same ruler `test/smoke.cjs` counts with):

| layer | opaque px | already warm | |
|---|---|---|---|
| `camp-sky` | 57600 | 72 | 0.1% |
| `camp-ruin` | 6196 | 1288 | 20.8% |
| `camp-ground` | 17020 | **14428** | **84.8%** |
| `camp-front` | 13720 | 1952 | 14.2% |

The ground plane arrived warm brown across its whole area, so the moment it is
visible at all the measure is saturated. Walking the six light bands:

```
before   2008 → 11772 → 12155 → 13369 → 15445 → 17713
```

A 5.9× cliff and then a plateau. Of the five small things a day holds, the
first did nearly all the visible work and the other four moved the room by
3%, 10%, 15%, 15%. Drawn in code the same ladder ran
`1243 → 2322 → 3261 → 4137 → 5089 → 5997` — every step worth about the same.
**The art was better and the game was worse**, and the smoke gate still passed
because it only compares band 0 with band 5 and asks for 1.5×; the delivery
scraped in at 1.57×.

`tools/art-cool.cjs` moves only the warm axis and **preserves luminance**, so
the picture keeps its values, texture and silhouette — a cooled ground is the
same art in moonlight, not a darker or bluer one. Hue that is not warm is
untouched, which is why the grass stays green: the test is red leading blue,
and green leads neither. It snaps back onto `js/palette.js` afterwards, because
a cooled pixel is a new colour and these assets are quantised on purpose.

```
node tools/art-cool.cjs assets/camp-ground.png assets/camp-ground.png
→ camp-ground.png  320x180  warm 14428 (84.8%) → 0 (0.0%)

after    4614 → 5602 → 6715 → 8837 → 11336 → 14103
```

Steps of +21%, +20%, +32%, +28%, +24%, and the full-day check goes from 1.57×
to 3.07×. `--target` is the r−b gap left behind (default 14) — deliberately
under the gate's 40 rather than at zero, because a literally neutral stone
reads dead and the fire still needs something to push against.

The general lesson, and it is the same one the band-brightness ruler taught
twice: **a gate that certifies *works* cannot see *looks*, and a gate that
certifies *looks* can still miss *plays*.** This one needed a picture — six
bands rendered in a column — before anybody could see it.

`camp-ruin` (20.8%) and `camp-front` (14.2%) are left alone on purpose: most of
their warmth is the hanging lantern and the banner, which are light sources and
accents rather than lit ground, and together they are small enough not to move
the ladder.
