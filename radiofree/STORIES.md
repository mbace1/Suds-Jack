# Adding a bulletin

**A bulletin is a JSON edit.** The wire lives in `wire.json` — not in a module,
not in a build. Add a block, run the validator, publish the file. The app picks
it up on the next load with no deploy, no cache-token bump, and no rebuild.

```
node radiofree/tools/validate-wire.mjs        # exit 0 = safe to publish
```

That is the whole loop. The rest of this page is the bar the content has to
clear, and the two places where a JSON edit still touches code.

## The two edits

1. **The roster** — one object in `wire.json`'s `stories`:
   `{ "id", "sector", "visual", "broll" }`. Order does not matter; the app
   sorts by channel at load, so a new line can go at the end of the array.
2. **The copy** — one block under **each** of `copy.en`, `copy.fi`, `copy.ja`,
   keyed by the same id: `slug`, `head`, `lines`, `technique`, `decodeNote`,
   `tell`.

`updated` is a free-text date shown to nobody but useful to you; bump it so you
can tell at a glance which wire a listener is on (`__rfh.debug.wire()`).

## The one thing JSON cannot add

**`visual` and `broll` name art that is drawn in code.** An external edit can
only pick from what the build already has — `PANEL_KEYS` in `js/visuals.js`
(the story panel, which decodes) and `BROLL_KEYS` in `js/broll.js` (the footage
the package cuts to). The validator prints the legal keys when you get one
wrong. Reusing a panel is normal and costs nothing; a *new* panel is a code
change and a deploy, and it is the only part of a bulletin that is.

If you want new art, add a function to `PANELS` in `js/visuals.js`:

```js
function myPanel(scr, t, d) {           // d = decode, 0..1 — animate the reveal
  field(scr, d);                        // graticule; pass `false` for full-frame art
  // draw the framing at d = 0, and the honest version at d = 1
}
```

## The bar

**It is fiction, and the fiction is load-bearing.** Every studio, ministry,
port and operator is invented, and no real company, agency or country is
described or accused of anything. That is not squeamishness — the app's whole
claim is that it teaches recognition rather than manufacturing claims, and it
says so on the tune-in gate. A real name in a fake dateline turns a screenshot
of this app into the thing the app is about. On the defence band the actors stay
unnamed on purpose: "the alliance", "a neighbouring state", "the eastern
border". That is also how careful reporting on those subjects actually reads.

This matters more now than it did when the wire was a module. **The content is
publishable by anyone with write access to one file**, so the rule has to live
in the author's head — the validator can check that a bulletin decodes, but it
cannot check that a defamation is fictional.

**What is real is the language.** Each bulletin is written the way that kind of
story actually gets written, and DECODE names the move. If you cannot say which
technique a bulletin teaches in two words, it is not a bulletin yet.

**One technique per bulletin, and it must be new.** Sixteen are taken. The
sign-off hands all of them back at the end and marks the ones the listener
caught, so a duplicate costs a slot and teaches nothing twice — the validator
*warns* on a repeat rather than failing, because a deliberate second angle on
the same move is a judgement call and not a defect.

**Register: The Onion, not a sketch.** The deadpan is total. The joke — and
there should be one — is in the *fact*, never in the wording: no winking
adjectives, no punchline verbs, no character who is obviously a fool. Write the
straightest wire copy you can and let the content be the thing that is absurd.
A bulletin that sounds like it is being funny has stopped being able to teach,
because the point is that this is exactly how the real ones sound.

**Every `{{spun|plain}}` pair has to earn both halves.** The left is what Toko
reads on air and it must be publishable; the right is what a plain reading would
have said and it must be *specific*. "a difficult but necessary step" →
"a way to protect this quarter's margin", not "something bad". Vague plain
readings are the failure mode: the decode is the payload, and a decode that
merely says "this is spin" has told the listener nothing they did not press the
button already knowing.

**The three languages are not translations of each other's tricks.** Each spins
the story the way that language really does it — Finnish reaches for the true
agentless `passiivi`, Japanese for 〜される and the polite noun (再編、協議) — so
the technique on display is the one a reader of that language would actually
meet. Translating the English spin word-for-word produces Finnish that no
Finnish newsroom would print, and the bulletin stops teaching in that language.

**The panel decodes too.** The framing is never only in the words. A panel that
just illustrates the headline is a wasted half of the post: the truncated bar
chart re-bases to zero, the valuation tower goes hollow but for the 6 % actually
sold, the packed auditorium empties to the four people on the stage. Decide what
the picture is lying about before you pick it. Amber has exactly one job — "the
spin is showing" — and never appears before DECODE.

## What the validator enforces

`js/wire.js` is the single implementation; `tools/validate-wire.mjs` runs it
over a file and the app runs it over the download, so a wire that passes in a
terminal cannot then be rejected in a browser for a reason you never saw. It
fails on:

- a `version` this build does not know, or a missing/duplicate/reserved id
- a channel that has no accent colour in the build
- a `visual` or `broll` the build cannot draw — **the silent one.** Both fall
  back in the renderer (to the bar chart, to the first footage plate), so a typo
  ships the wrong picture beside the right words and nothing anywhere complains
- a bulletin missing from any of en / fi / ja, or missing any field
- `lines` empty, or a line that is empty
- malformed `{{…|…}}` markup, or a pair with an empty half
- **no markup at all in a bulletin** — nothing to decode is the one failure that
  makes a bulletin pointless rather than broken

It warns (does not fail) on copy for a bulletin that is not on the roster, and
on a repeated technique.

## When it goes wrong on air

The app never shows an empty feed. If the wire 404s, times out, is unparseable
or fails validation, `stories.js` installs a baked-in **station identification**
post instead — one bulletin, in all three languages, that says the copy did not
arrive. It carries markup and decodes like any other, because a dead DECODE
button would be the app failing at the one thing it does. `__rfh.debug.wire()`
reports `source: 'off-air'` and the validation errors.

## Caching, and why the wire is not versioned

The shell is **cache-first** (a new deploy is a new `?v=N` and a new cache), and
`wire.json` is **network-first** (`sw.js`). That split is the whole arrangement:
the app loads instantly off disk and the *content* is never stale. If you make
the wire cache-first to save a request, a listener is pinned to whatever
bulletins they first downloaded and the file stops being externally updatable —
which is the failure this format exists to prevent, and it fails silently.

Offline, the worker serves the last wire that listener actually received. That
is deliberately not the wire that shipped with the build.

## The gate

```
NODE_PATH=/opt/node22/lib/node_modules node radiofree/test/smoke.cjs
```

91 checks. Beyond the content rules above it proves the update path itself: the
feed is reading a *fetched* wire rather than a baked-in one; the CLI validator
catches a bad art key, a missing language and a bulletin with nothing to decode;
a broken wire degrades to the station identification without throwing; a cached
shell still picks up an edited wire on the next load; and offline reads the last
wire that arrived.
