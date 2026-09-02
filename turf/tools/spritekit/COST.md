# What the full roster actually costs

Measured, not estimated. Every number below came off a real run in this repo.

## Per generation

The shared `nano-banana.mjs` throws away the API's usage block, so a probe was
written to read it. One frame, prompt plus a reference image:

```
promptTokenCount      817   (559 text + 258 for the reference image)
candidatesTokenCount 1290   (IMAGE)
wall clock            7.2 - 9.6 s
```

**1290 output tokens is not a coincidence** — it is the fixed size Google bills
an image at, which is what makes the published **$0.039 per image** apply
exactly rather than approximately. The 817 input tokens at Flash text rates come
to about **$0.0002**, so input is noise and the working figure is:

> **$0.039 per generated frame.**

## Per character

Front **and** rear, since rear must be a separate generation (Bible §15):

| clip | frames | ×2 facings |
|---|---|---|
| `move12` | 12 | 24 |
| `melee` | 5 | 10 |
| `react` (hit 3 + KO 5) | 8 | 16 |
| `idle` | **1** | 2 |
| **subtotal** | | **52** |
| `ranged`, armed characters only | 5 | 10 |

`idle` is one generation for a whole clip because the breath is computed
(`breathe.cjs`) rather than generated — that alone saves 14 frames a character
against generating 8 breath phases both ways.

Dropping `move12` to the 4-phase `move` takes a character from 52 to **36**.
The 12-phase cycle is smoother and had a *lower* first-pass rate (3 re-rolls in
12 front frames, 0 in 12 rear), so it costs roughly triple for the same clip.

## The roster

The casting sheets hold **26 characters** (6 + 20). Assuming about a quarter
carry a firearm:

```
26 x 52                     = 1352 frames
 6 x 10  (ranged)           =   60
                              -----
                              1412 frames
+15% re-rolls               = 1624 frames
x $0.039                    = $63.34
```

With the 4-phase cycle instead of 12: **996 frames, $44.66.**

### Where 15% comes from

Measured over the ~50 generations run *after* the method was settled, not over
the discovery work — the facing and down-pose re-rolls that cost the most are
fixed by rules now (mirror the reference; name the bottom edge as the ground
line) and should not recur.

```
roster breadth, 16 frames    1 would need a re-roll (sledge loop closure)   6%
ranged, 5 frames             0                                              0%
hoodie melee, 5 frames       1 flagged (followthrough held high)           20%
12-phase front, 12 frames    3                                             25%
12-phase rear, 12 frames     0                                              0%
```

15% is the middle of that and is the number to plan with. The spread is real
though: **rear cycles first-pass better than front**, twice now.

## The part that is not money

A full `make.mjs move` run took **64 s**: 29 s of API and **35 s of local
processing**. The local half is the larger one, and it is almost entirely
**Chromium start-up** — `cut.mjs` runs twice per frame, then `normalise`,
`drift` and `anim` each launch their own browser.

At roster scale that is the binding constraint, not the bill:

```
API        1624 frames, 8 in parallel, ~8 s each      ~27 minutes
local      1624 frames x ~8.75 s, serial              ~4 hours
```

**So the money is the API and the time was Chromium.**

**Since fixed, and better than the fix proposed here.** The suggestion above was
to pool one browser. The browser is gone instead: every measurement runs on
Skia in-process via `@napi-rs/canvas` (see `TOOLING.md`). Measured over the full
post-generation chain on one clip — fitclip, register, fitclip, drift, verify,
edge, anim — **30909ms -> 2277ms, 13.5x**. Rebuilding all 17 committed sets end
to end now takes **98 seconds**.

Re-costed with that, the local half of the roster run drops from ~4 hours to
roughly **20 minutes**, which puts it well under the ~27 minutes of API time. The
binding constraint is no longer machine time at all — it is the two hours of
human judgement below.

## Reading

Sixty-odd dollars and an afternoon is not the thing standing between this and a
finished roster. **The gates cannot tell you a pose is good**, so a person has
to watch 26 characters' worth of GIFs and decide. At roughly a minute a clip
that is about two hours of judgement, and it does not parallelise. Budget that,
not the API.
