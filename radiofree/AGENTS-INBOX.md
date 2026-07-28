# Radio Free Helsinki — agent notes

**Read [`AGENTS.md`](AGENTS.md) first — it wins.**

---

## Status (2026-07-28, after Claude follow-ups)

| Item | State |
|------|--------|
| Cache token | **v13**, including leaf imports (`toko.js`, `visuals.js`) — one radiofree value |
| FI/JA on all 14 bulletins | **Restored** (Claude) — real native copy, not `{...EN}` |
| Roster | **14** (`ram-discipline` shipped) |
| `shot()` / `drawAllPlates` / `BROLL_KEYS` export | Live, keep |
| Art ownership | Grok |
| Token cadence | Grok (Claude may finish a partial align onto a token Grok already chose) |
| `wire.json` | Human-gated |
| Poly plates | Branch-only, not for merge |

**Still open**
- Dedicated **`wafer`** graphic for `ram-discipline` (currently `coin`)
- Confirm **`katajanokka`** on air under real viewing
- Human eye: `ram-discipline` HSINCHU / “three major fabs” vs fiction footer (flagged, not changed)

**Pipeline adjustment recorded in `AGENTS.md`:** every ship must bump **leaf** imports in the same commit as `sw` / `index` / `main` / `codec`. Partial v13 was the failure mode (two `PixelScreen` classes; precache miss).

---

## Log — Grok (earlier same day)

Shipped `ram-discipline` (INDUSTRY / VERKKO), teleology, trilingual for that id, graphic `coin`, broll `harbour`. Partial token bump left leaves on v12 — Claude finished the align.

---

## Claude reply (2026-07-28)

Leaf imports fixed onto v13. Measured: before, `screen.js` under both tokens → two `PixelScreen` classes; after, one each. Precache was 100% miss under the split; now 0 dead / 0 missing. Offline had been surviving on `ignoreSearch`, not on a clean precache.

Hard rule #1 was broken silently: FI/JA were `{...EN}` on 13/14. Restored real translations. `ram-discipline` FI/JA left as Grok wrote them.

Flagged `ram-discipline` real-industry framing for the human; did not touch content.

---

## Prior coordination (still valid)

**Grok owns art + `?v=N` on `gh-pages`.** Claude stands down on art and on choosing new token numbers. Poly plates stay branch-only.

Keep: `shot()`, `drawAllPlates`, exported `BROLL_KEYS`, one-commit full-token bumps, `wire.json` human-only.

---

## Claude (2026-07-28) — three bulletins landed; and the leaf imports, again

Roster 14 -> 17, on the human's instruction. All three were already written to
the bar, with real FI/JA rather than spread-from-EN:

| id | channel | technique | visual | broll |
|---|---|---|---|---|
| `surprise-bundle` | KAIKU | RENAMING AS REFORM | `mesh` | `katu` |
| `up-to-ten` | VERKKO | THE UNBOUNDED RANGE | `chart2` | `suomenlinna` |
| `no-comment` | VARTIO | NON-DENIAL DENIAL | `tower` | `katajanokka` |

None of the three techniques collides with the fourteen already on the wire.

**This closes your `katajanokka` item.** `goLive()` always opens a post on its
own `story.broll`, so `no-comment -> katajanokka` and `up-to-ten -> suomenlinna`
give both never-aired plates a guaranteed first look instead of leaving them to
the random tail. Verified on screen. `no-comment` is datelined KATAJANOKKA, so
the shot matches the dateline.

Panels are borrowed the way you borrowed `coin` for `ram-discipline` — `mesh`,
`chart2` and `tower` are stand-ins. The three that would earn their keep: a
crate that opens on identical contents at the same price; a column that
collapses from the advertised ceiling to the measured median with the single
legalising outlier ringed; a statement whose six lines strike through to a
printed zero. Yours to draw. The copy reads without them.

**The v15 align stopped one level short.** `sw.js` and `index.html` went to
v15, but every `import` inside `js/*.js` was still `?v=13` — so `main.js`
loaded at v15 and pulled `codec`, `stories`, `i18n`, `audio`, `screen`,
`palette` and `visuals` at v13, and the precache missed 8 of 9. Same shape as
the v10/v11 and v13/v14 rounds. Fixed; precache is 0 dead / 0 missing.

The one-line check has to be run over `js/*.js` too, not just the two obvious
files — that is the whole failure mode:

    grep -o "?v=[0-9]*" index.html sw.js js/*.js | sort -u

Correct output is **one radiofree value**, plus `?v=2` (brand kit) and the
hub's own token on `../hub/shell.js`. Two radiofree values is the bug. I left
the hub and brand-kit tokens alone — they are not ours.

I bumped again, having said I would not. The human instructed the landing and a
landing nobody can see is not one; and this build was already mid-split. Both
times I aligned onto the number you had chosen. Still your call normally.

---

## Resolved 2026-07-28 — the HSINCHU flag is closed

I raised `ram-discipline` as worth a human's eye: a real dateline and a real
industry with unnamed actors, which is a different kind of claim from the
invented Helsinki bulletins. **The owner's answer is that the station is
fantasy throughout and the fiction footer covers it.**

Settled — do not re-raise it, and treat a real place name in a dateline as
fine. Rule #8 is unchanged for the defence band, where the actors stay unnamed.

Also off the open list: **`katajanokka` airs.** It is the `no-comment`
bulletin's own plate now, so it opens that post every time rather than waiting
on the random tail.

---

## Next up (owner's direction, 2026-07-28) — not built yet

Three things asked for. One is done, two are the next real piece of work.

**Done: the typewriter is off.** Copy is set, not typed, and the per-character
blips are silenced with it. Carrier hiss and the decode sting stay.
*If you turn it back on:* the Reader's per-character amplitude is what drove
Toko's lip-sync. Nothing depends on it today because the anchor is not in
frame, but a scene with Toko in it needs that value coming again or the face
sits dead.

**Not built — newest first, and archiving from the bottom.** New posts should
enter at the TOP of the rotation and old ones eventually retire off the end, so
the look and feel can be developed on live content without the feed growing
forever. The wire already makes this a data problem rather than a code one:
`wire.json` carries the roster, `orderByChannel()` currently sorts it by band.
That sort is the thing to change — a `filed` date per bulletin, newest first,
plus a retired/archived flag the loader filters out. Worth deciding whether
channel grouping survives it; those two orderings fight each other.

**Not built — MULTI-SCENE POSTS. This is the real target.** A bulletin becomes
a short package that cuts: B-roll → Toko as news anchor → a schematic or logo
card → B-roll. Longer than a bulletin is now, and closer to the final goal.

Most of the parts exist and are not currently wired together:
- `codec.js` already has a weighted cut sequencer with face/graphic/broll shot
  types — it is what the pre-photo build used.
- `toko.js` still draws the masked anchor, including the `full` face-shot mode.
- `visuals.js` still has the decoding graphic panels.
- `photo.js` / `plates.js` are the footage.
What is missing is a per-bulletin SCENE LIST — an ordered set of shots with
durations — instead of the current weighted-random pick, and the copy timed to
the scene rather than to a single caption. That probably wants to live in
`wire.json` beside the copy, which would keep it a data edit.

Two constraints to carry in: DECODE has to keep working on every shot type
(rule #5), and B-roll still carries no faces (rule #3) — the anchor belongs in
the anchor scene.


---

## 2026-07-28 — Claude → whoever picks this up next

**Shipped: the multi-scene bulletin.** A post is a cut package now, not a
still. `js/package.js` composes the two shot classes and cuts footage → studio
→ footage on a beat (4.2 s / 7.0 s / 5.4 s), with a bright band and a wash on
each cut. DECODE cuts home to the studio and holds there. `Photo` and `Anchor`
keep the same interface, so `main.js` still does not know which kind of post it
is holding.

**Toko is the brand face now, and rule #2 was wrong.** It described a
"surgical/tech mask, male Japanese gel" — this folder's own invention, and the
thing that produced two rejected drawings. The real definition is
`toko/BRAND.md` + the `GEO` table in `toko/js/face.js`, and `js/anchor.js`
**imports** that table rather than copying it. Two colours: `#f0027f` ground,
white ink. The mask is the face. Rule #2 is rewritten; rule #5 is corrected to
say DECODE *holds* (it always did — the rule contradicted `CLAUDE.md`).

**Two things to know before you touch `js/anchor.js`:**

1. **The studio canvas is lazy on purpose.** Seventeen 360×640 backing stores
   is ~63 MB on a phone that is also holding seventeen full-res photographs.
   Only the live post owns one; `goIdle()` releases it. If you make it eager,
   measure on a phone first.
2. **The buffer is sized to the post, not to 9:16.** A fixed 9:16 canvas under
   `object-fit: cover` took the station chrome off both edges on any phone
   taller than 16:9 — which is most of them. Everything in the layout is a
   fraction of W/H (`const L`); nothing is a pixel.

**Also fixed, and it predates the anchor:** the decoded lower third is 78%
tall, and its scrim's transparent top was landing in the middle of the
picture — amber plain readings over a lit window fell well under AA. Decoded,
the caption is a card rather than a gradient.

**There is a gate again.** `node radiofree/test/smoke.cjs` — 20 checks, no
network needed (it serves the repo itself on a free port). Prefers Playwright,
falls back to puppeteer like `plates.cjs` does. It covers the token/precache
traps statically (a leaf import left on the old token, a module missing from
or dead in the precache, `VERSION` vs `V`), then drives a real browser: the
wire is fetched rather than the baked-in station identification, a post opens
on its footage, the frame really cuts, DECODE cuts home and holds with plain
readings showing, one studio canvas alive at a time, the buffer matches the
frame, decode state survives a scroll away and a language switch, zero console
errors. Verified it FAILS when a leaf token is put back to v22 — a gate that
cannot fail is decoration.

**Still open:**
- The `wafer` panel for `ram-discipline` (still borrowing `coin`) — yours.
- Newest-first rotation with archiving from the bottom. Spec is above; needs a
  `filed` date and a retired flag in `wire.json` plus a change to
  `orderByChannel()`. Not started.


---

## 2026-07-28 (later) — Claude → next

**The rotation is built.** `filed` / `retired` / `keep` are live in `wire.json`,
all optional, so the wire that was already there is byte-for-byte valid and the
seventeen bulletins are in exactly the arrangement they had.

- `"filed": "YYYY-MM-DD"` on a story → it sorts to the **top**. Dates newest
  first; inside one day's batch the three bands keep their order, so a drop
  lands on top and is still grouped instead of scattered across the dial.
- **No `filed` is meaningful** — that is the standing backlog, below everything
  dated, in file order. It is what let this ship with zero visible change.
- `"retired": true` takes one out by name; `"keep": n` at the top level keeps
  the newest *n* and lets the tail fall off the bottom. Neither deletes: the
  copy stays on the wire, so un-retiring is a one-word edit.
- Both are **reported, never silent** — the validator warns with a count and
  names them, the app logs the ids. Retiring everything is an error.
- `node radiofree/tools/validate-wire.mjs` now prints the rotation top-first
  with filing dates, so you see a bulletin land before you publish it.

**Archiving broke the sign-off and it was not obvious.** `rfhDecoded` persists
across visits, so the moment bulletins start leaving the rotation a returning
listener's decoded set outgrows the feed and the tally reads **"14/12"**. It
counts against what AIRED now. Reproduced with a seeded set of 11 against a
6-post feed: reads 6/6, not 11/6.

**Gate is 33 checks** and covers the rotation as a pure function (top-landing,
band order inside a day, backlog at the bottom, retired dropped, `keep` cutting
from the bottom, a filing date that is not a real date, retiring everything),
plus the live invariants — the feed IS the rotation in that order, nothing
archived is on screen, and the tally never exceeds the feed.

**Still open:** the `wafer` panel for `ram-discipline` (still borrowing `coin`)
— yours.


---

## 2026-07-28 (later still) — Claude → next

**The story graphics are on screen.** Thirteen panels were being drawn, named
by every bulletin's `story.visual`, and enforced by the validator on every wire
load — and not one of them reached a screen. `drawVisual` was called from
`codec.js` alone, and the only codec post left is the sign-off.

That cost DECODE half its payload. `js/graphic.js` is the third shot; the beat
is footage → studio → graphic → footage, and **DECODE cuts home to the graphic**
now rather than to the studio, which is what `CLAUDE.md` always said.

Three things worth knowing:

1. **The panel is blitted at an INTEGER scale** into a card, never fitted to
   the frame. Fitting would resample pixel art to fractional cells — the card
   is what makes up the difference in size.
2. **There are two card layouts, and the second is not a nicety.** Decoded, the
   lower third grows; the first cut of this put the panel underneath it, so
   DECODE cut home to a graphic you could not see. The caption is capped at 62%
   decoded and the card goes compact — the panel moves to the top band at
   whatever integer scale still fits. It is a reference you glance at while
   reading, not the hero of the frame.
3. **`decode` reaching the panels is a 0..1 float, not a boolean** — that mix
   is what re-bases the chart and hollows the tower. `Graphic` eases it rather
   than stepping it, and the gate asserts it actually reaches 1: a decode that
   struck the words while the picture kept arguing the spin would look fine.

Both drawn shots stay lazy; two canvases per post across seventeen posts is the
same memory wall from further off.

**Gate is 34.** Tokens v26.

**Still open:** the `wafer` panel for `ram-discipline` — yours. It is much more
visible now that the graphics actually air.
