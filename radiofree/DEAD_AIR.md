# Radio Free Helsinki — dead air (DESIGN)

*The narrative layer, designed from the owner's answers of 2026-10-13. The decided table is the owner's; everything else is a proposal until they sign it off.*

## Built in v73

- **The stop.** One more post past the sign-off, `#dead-air`, `--.--` on the dial. Built like the sign-off (a static panel and a lower third), so every existing `signoff` check already skips it.
- **The handler.** Toko's four opening lines and a progress line, quiet register, fi/en/ja. No parser yet (that is `toko/js/chat.js`, phase 2).
- **Three drops**, chosen because their cabinets really write a best to disk: Hyper Dagger (`hyperDaggerHi`, survive 60 s), Toko Drop (`tokoDropHi`, 25,000), Drop Cabal (`dropCabalHi`, 15,000). **The lines are provisional** — tune them from real runs. Flash Prince was the obvious fourth and is out: the catalogue still names `flashPrinceBest`, but the live build no longer writes it.
- **Three secrets**: *I · Night shift, Pasila* (piece), *FILE · Warehouse of Thought Oy* (file — the operator, the town and the job figures come from the 2026-09-24 bulletin), *II · The second frequency* (piece). A dug secret stays dug.
- **The card**: 1080×1920 PNG of the dug secret, drawn in code.
- **`GATE`** in `js/deadair.js`: `false` (open). On, dead air needs a typed key; the weekly-code scheme is not built yet.
- Gates: `test/smoke.cjs` plants a best past one line and below another and asserts exactly one secret digs up; fi and ja are checked for leftover English.

## Decided (owner)

| | |
|---|---|
| Where | **Inside Radio Free Helsinki.** Not a new cabinet, not a new name. |
| You | **A listener who found the frequency.** Outside, unknown, caught the signal. |
| Toko | **The handler.** Two-way: he talks, gives the jobs, answers what you type. |
| A job | **A dead drop.** The state archives everything, so the only place to hide a thing is in a score nobody reaches. One secret per cabinet; a run that gets far enough digs it up. **Games stay unchanged.** |
| A secret | **Pieces of one story, and files on the world.** Rarely, a real workshop truth. |
| Tone | **Two registers.** Files keep the wire's deadpan comedy; pieces are quieter and grimmer. |
| Gate | **Open for now.** The clips may hold the key later; build it as a switch. |
| Arc | **It never ends.** No finale; the story is the city. |
| Clips | **No DECODE in the social cut.** Bulletin, Toko, card. |

## 1. What it is

The station has two frequencies. **104.40** is the broadcast: the daily wire, the feed, the sign-off. Turn the dial off the band and the air is dead — and in the dead air somebody is waiting. That is where the handler talks, where the jobs come from, and where what the broadcast cannot say gets said. Same app, same shell, same offline promise.

## 2. Where it lives in the app

- The dial in the masthead already reads out the channel. Give it one more stop past the end of the band — `--.--` — and make it reachable: drag the dial, or the sign-off card's last line (*the carrier is gone. keep listening.*).
- It is a **mode of the same page**, like the sign-off is: the feed stays the feed, the dead-air screen is a codec panel over the same terminal. `#dead` deep-links it; `#drop/<id>` lands you on a job.
- House rules apply unchanged: fi/en/ja with the trilingual gate, no image assets, everything in the precache, one `?v=` token.

## 3. The loop

**tune off the band** → **the handler** (he knows what you have dug up, never who you are) → **the job** (a cabinet, a line to reach) → **the drop** (a piece, or a file; the card to post) → **back to the dial**. A new drop a week; the broadcast carries on daily underneath.

## 4. The handler

- Toko, **face only**, in the codec panel: `toko/js/chat.js`'s Sierra-style counter, dialogue tree and typed parser dropped into the page. No body (`BRAND.md`, `toko-live/CANON.md`). The eyes open while he answers — the one moment he is looking at somebody.
- He speaks the pieces' register: quiet, dry, no jokes. The files he hands over are in the wire's voice, because they *are* the wire's world.
- Topics open as drops are dug up; some open only **by your own words** at the parser, which is already how the counter rewards typing.
- He remembers through `localStorage` only. No name, no account, nothing leaves the browser — the brand's terms.

## 5. The jobs — dead drops

A drop is `{ cabinet, line, piece }`: which game, how far, what it buries. The handler names the line in the fiction (*"nobody has survived a minute in the dagger pit since the archive went live. Something is under that minute."*). The job deep-links the cabinet with `?drop=<id>`; the game is untouched; on return the dead-air screen reads the cabinet's own best or its playlog and, if the line is crossed, hands over the drop.

First eight, by verifiable seam (keys from `hub/games.js`, playlog from `hub/playlog.js`):

| Cabinet | Line (set from run histories, never guessed) |
|---|---|
| Hyper Dagger | survive N seconds |
| Toko Drop | reach a score / a wave |
| Drop Cabal | a score |
| Flowsnow | a score |
| Powder | a best |
| Paper Route | a score |
| Flash Prince | a best time |
| CONCRETE | points |

Phase 2: one playlog event per game buys richer lines (TURF: extract the crew; Toko Move: finish a shift) — one line of code in each, never a mechanic.

## 6. The secrets

- **Pieces** — one continuing story, numbered, 120–200 words each, the grim register. The story is the city as the broadcasts cannot report it. It never resolves; it accumulates.
- **Files** — dossiers on the wire's **invented actors**: the ministries, the operators, the techniques. They reuse the names the daily generator already invents, so a file you dig up is about a company that was on air that week. This is the continuity between the feed and the dead air, and it costs nothing — the wire writes the cast.
- **Truths** — rare, marked as such, written by the owner: what got cut, what was set down, a build nobody shipped. The mask slips once a season at most.
- Every drop renders a **card** (drawn in code, 1080×1920) you can post back into the feed: the piece's first line, the frequency, the badge.

All three obey `EDITORIAL.md`'s naming rule: real places, invented everyone, no real person ever.

## 7. Cadence and the gate

- Never ends: **one drop a week**, owner-paced. The week's drop can lean on that week's real bulletins, which is what makes the story feel like the city rather than a plot.
- **Open now.** `GATE` is one switch: off, every drop is reachable from the dial; on, the week's frequency printed on that week's clips is the only way in. Build the switch on day one so turning it on later is a flag, not a rewrite.

## 8. The clips

The social export is the film kit's existing cut minus the DECODE reveal: cold open, the bulletin, Toko, the card. Plus the badge, the fiction line, and one line — *Radio Free Helsinki · link in bio*. Nothing in a clip names a drop while the gate is off.

## 9. Not in this design

No account. No server. No leaderboard. No body for Toko. No real names. No second app.

## 10. Still to decide, later, one at a time

The handler's antagonist (the archive? a ministry? nobody — just the city). The first piece's hook. Whether drops ever expire.
