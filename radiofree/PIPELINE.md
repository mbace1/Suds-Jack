# The signal pipeline — PLAN (rev. 2, 2026-10-13)

*Radio Free Helsinki films → Toko Midori Games socials → dead air, the narrative layer inside the station. Revised the same day it was written, after the studio's work on `claude/radio-free-helsinki-pvtsw5` (`radiofree/studio/art-motion/`) set new owner direction. Facts carry file refs; everything else is a proposal.*

## What changed in rev. 2, and why

| rev. 1 said | The studio, same day (owner) | rev. 2 |
|---|---|---|
| The clips are the bulletins, auto-rendered daily by the pixel film kit | *"Forget decode, forget older visuals"* (2026-09-27); papercut shadowbox is the house style, *"make this the standard procedure"* (2026-10-13) | **The social films are studio films**, made by the studio's nine steps. The daily auto-cut (`render-day.mjs --social`, v73) becomes an optional second track, kept off unless the owner wants it. |
| A film carries the fiction footer and invented names only | *"We can sometimes use real names to be clear"* — films only, verified facts only, sources written beside the shot table | **Films may name real companies**; the daily wire and dead air keep invented names (see "Two naming rules"). |
| Score at −16 LUFS, the kit's terminal captions | −14 LUFS; house captions style H (white Poppins ExtraBold, outline, one ochre keyword, ≤ 800 px a line) | The studio's numbers win for anything posted. |
| Toko appears as the codec anchor | Figures wear **the traced Toko master face as a magenta mask**; *"the mask itself is the device"* | The mask is the visual link between the films, the socials and dead air. |

## 0. What exists

| Piece | Where | State |
|---|---|---|
| **The studio** (`radiofree/studio/`) | branch `claude/radio-free-helsinki-pvtsw5` only | Two films through the nine steps: *You Looked At It* (papercut v2, review 8/10 SHIP) and *The Biodiversity Fund* (v6, review v2 7/10 ship-with-fixes, fixes applied per its commits). Engine: the third-party skill huashu-art-motion, copied in fresh per render; our scenes, film tables, scores, captions and reviews are committed. **The MP4s are not in the repo.** |
| **The live app** (radiofree v72 on `gh-pages`; v73 with dead air on `claude/feedback-game-hub-gdxx9h`) | | The feed, the sign-off, now dead air. |
| **The daily wire** (`.github/workflows/radiofree-wire.yml`) | `main` | **Failing every day since at least 2026-10-05**: `ANTHROPIC_API_KEY` is not set. The studio does not need it (films are researched by hand, with sources); the live feed does. |
| **Brand** (`toko/`) | | Face, master trace, badge, `VOICE`. **No social handle exists anywhere in the repo.** |

**Two Radio Free lineages again.** The studio branch's `radiofree/` app has diverged from the live one (its merge base with `gh-pages` is `f39a7774`; AGENTS.md already lists rule breaks on it). The studio folder itself is self-contained, so it should travel **by path** (`radiofree/studio/` only) to `main`, never by merging the branch — the Eeri rule, applied before it costs anything.

## 1. The loop

**a film** (studio, a real story, papercut, masks) → its caption and end card say *the frequency is open past the end of the band* → **dead air** (`#dead-air`) → **a dead drop** in one of the cabinets → **the secret** (a piece, or a file) → **a card** the listener can post → the next film.

## 2. Track A — the studio films (the main content)

- **Procedure:** the studio's nine steps, unchanged (`studio/art-motion/README.md`): record the sources first, shot table, stills before film, score on the beat at −14 LUFS, render 1080×1920 30 fps, house captions (style H), an independent review by a fresh agent, fix what it finds, deliver captioned + plain MP4.
- **Cadence:** a film is a session of work with a review loop, so plan **two a week**, not one a day.
- **Add one beat for the loop:** the end card gains one line — *keep listening past 104.40* (fi/ja too) — and the post's caption names `#dead-air`. Nothing in a film names a drop or a secret while dead air's `GATE` is off.
- **Delivery:** the captioned MP4 goes to the socials; both MP4s go to a release asset or bucket (owner decision, §5), not into git.

## 3. Track B — the daily auto-cut (optional, off)

`render-day.mjs --social` (v73) renders any bulletin as the feed cut: no DECODE, Toko's take, the card with *LINK IN BIO*, footer lifted out of the platforms' caption band; an ffmpeg pass makes H.264 (headless Chromium writes AV1). It is the old visual language the owner set aside for films, so it stays **off** until asked for — useful only if a daily cadence matters more than the house style. It needs the wire secret either way.

## 4. Socials

- **Accounts:** one handle on both, under Toko Midori Games (proposal `@tokomidorigames`). Avatar = the badge. Bio = the cry + the terms + the link to Radio Free Helsinki.
- **Posting:** by hand for the first month (Instagram's Graph API needs a professional account, a Facebook Page and a Meta app; TikTok's Content Posting API needs an audit).
- **Post copy:** the film's sources go in the caption or the first comment — the studio already writes them down, and a satire account that cites is harder to take down. Label *satire*; say it is made with AI, out loud (the brand creed).
- **Measurement:** platform-side only. The site keeps *nothing leaves the browser*.

## 5. Two naming rules, and where each applies

| Surface | Rule | Why |
|---|---|---|
| **Studio films** | Real names when the story is unclear without them, **only for what verifiably happened**, sources beside the shot table; no invented quote or claim on a real name | owner, 2026-10-13 |
| **The daily wire** | Real events, invented names, always (`EDITORIAL.md`, enforced by `generate-wire.mjs`) | owner, 2026-07-31 |
| **Dead air** | **Invented names**, like the wire — the pieces and files are fiction, and fiction may not be attached to a real company | follows from both |

The consequence to watch: the same real event can appear under two names — *The Biodiversity Fund* says **Doodle** (Google, with sources), the 24 Sept bulletin and dead air's file say **Warehouse of Thought Oy**. That is correct, not drift: the film reports what happened, the file invents what the archive keeps. A dead-air file must never take the film's real name.

## 6. Build order

1. Bring `radiofree/studio/` to `main` by path (tooling, not deployed) so the films have one home.
2. Ship v73 (dead air) to `gh-pages`.
3. The end-card line in the studio's film table and score (one beat), then re-render *You Looked At It* and *The Biodiversity Fund*.
4. Accounts; post the two films by hand.
5. Dead air v2 (see `DEAD_AIR.md`): pieces drawn from the films' world, the handler parser.

## 7. Owner decisions

1. Set `ANTHROPIC_API_KEY` (the live feed needs it; the films do not).
2. The handle, and who holds the accounts.
3. Where the MP4s live (release assets, or a bucket).
4. Track B: keep it off, or a daily auto-cut alongside the films.
