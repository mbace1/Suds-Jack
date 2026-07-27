# Adding a bulletin

Everything the station needs is four edits. This page is the bar a bulletin has
to clear — most of it is enforced by the gate, and the gate is not a nice place
to find out.

The template at the bottom is a copy-paste of all four.

## The four edits

1. **The roster** — one line in `STORIES` in `js/stories.js`:
   `{ id, sector, visual, broll }`. `sector` is `GAMING` / `INDUSTRY` /
   `DEFENCE`; the feed is ordered by channel, so the line goes with its band.
2. **The copy** — one block in **each** of `EN`, `FI`, `JA` in the same file:
   `slug`, `head`, `lines`, `technique`, `decodeNote`, `tell`.
3. **The picture** — a panel function in `js/visuals.js`, added to `PANELS`.
   `broll` picks the footage the package cuts to from `BROLL_KEYS` in
   `js/broll.js` — reuse one, a fourth plate is a bigger job than a bulletin.
4. **The cache** — bump `?v=N` in `index.html`, every `js/*.js` import, and
   **`sw.js`'s `VERSION` and `V` with them**. There is no build step; the gate
   checks the tokens agree and that `sw.js` precaches every module by name.

## The bar

**It is fiction, and the fiction is load-bearing.** Every studio, ministry,
port and operator is invented, and no real company, agency or country is
described or accused of anything. That is not squeamishness — the app's whole
claim is that it teaches recognition rather than manufacturing claims, and it
says so on the tune-in gate. A real name in a fake dateline turns a screenshot
of this app into the thing the app is about. On the defence band the actors stay
unnamed on purpose: "the alliance", "a neighbouring state", "the eastern
border". That is also how careful reporting on those subjects actually reads.

**What is real is the language.** Each bulletin is written the way that kind of
story actually gets written, and DECODE names the move. If you cannot say which
technique a bulletin teaches in two words, it is not a bulletin yet.

**One technique per bulletin, and it must be new.** Sixteen are taken (grep
`technique:`). The sign-off hands all of them back at the end and marks the
ones the listener caught, so a duplicate costs a slot and teaches nothing.

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
`t()` returns the key when a string is missing and a raw key is still a
non-empty string, so nothing throws — the gate checks every field of every
bulletin in all three blocks, **including** that the lines still carry `{{…|…}}`
markup, since a bulletin with nothing marked has nothing to decode.

**The panel decodes too.** The framing is never only in the words. A panel that
just illustrates the headline is a wasted half of the post: the truncated bar
chart re-bases to zero, the valuation tower goes hollow but for the 6 % actually
sold, the packed auditorium empties to the four people on the stage. Decide what
the picture is lying about before you draw it. Amber has exactly one job — "the
spin is showing" — and never appears before DECODE.

**The panel is portrait and it must be legible at 128×152.** Two panels shipped
as unreadable scribble and had to be rebuilt around one clear idea each (spokes
to a hub, a grid with a single vanishing point). Draw the idea, not the texture.

## The gate

From the repo root:

```
NODE_PATH=/opt/node22/lib/node_modules node radiofree/test/smoke.cjs
```

77 checks. The ones a new bulletin runs into first: every story's `visual` is a
real panel key and its `broll` a real footage key (a mistyped key falls back
silently to the bar chart / to Esplanadi and ships the wrong picture beside the
right words); every bulletin carries a full read *and* a decode in all three
languages; the sign-off counts the roster rather than a hardcoded number; every
text colour clears WCAG AA with translucent backgrounds composited up the tree.

## The template

```js
// 1 — js/stories.js, in STORIES, on its channel
  { id: 'my-bulletin', sector: 'GAMING', visual: 'myPanel', broll: 'esplanadi' },

// 2 — js/stories.js, the same block in EN, FI and JA
  'my-bulletin': {
    slug: 'KALLIO',                       // the dateline: a Helsinki place
    head: 'The headline, straight, as a wire would file it',
    lines: [
      'First paragraph, with {{the spun wording|what a plain reading would have said}} in it.',
      'Second paragraph. Two lines is the shape — a third is a feature, not filler.',
    ],
    technique: 'THE MOVE, IN TWO WORDS',
    decodeNote: 'What the move did here, in three or four sentences. Name the ' +
      'mechanism, not the vibe. If the panel is lying too, say what it was ' +
      'lying about — this is the only place that gets explained.',
    tell: 'The question that catches this in the wild. One sentence, portable, ' +
      'usable on a story that has nothing to do with Helsinki.',
  },

// 3 — js/visuals.js, then add `myPanel` to PANELS
function myPanel(scr, t, d) {           // d = decode, 0..1 — animate the reveal
  field(scr, d);                        // graticule; pass `false` for full-frame art
  // draw the framing at d = 0, and the honest version at d = 1
}
```
