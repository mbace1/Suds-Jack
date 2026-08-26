# Toko Assistant — patch notes

## 2026-08-27 — cross-game awareness pass 1

- Added `hub/playlog.js`, a shared local-only play log for the whole Toko catalogue.
- The log has a stable API for visits, starts/runs, failures/deaths/game-over events and favourites, so games can report richer play evidence without Toko importing game internals.
- Added `play-awareness.js`, which reads only declared catalogue score keys plus the shared play log and existing hub day/credit/ticket counters; it does not scan unrelated localStorage.
- Toko can now answer `WHAT HAVE I PLAYED?`, `MY SCORES`, `MY FAVOURITES`, and game-specific questions such as `HOW AM I DOING IN TOKO DROP?`.
- Existing high scores already stored by games are visible immediately, even before richer play-log events are adopted by every game.
- Added local favourite commands such as `FAVOURITE TOKO DROP` / `UNFAVOURITE TOKO DROP`.
- Added `play-conversation.js` as a separate bridge so cross-game awareness stays modular and does not expand the core parser.
- `toko/index.html` now loads the cross-game layer and describes play awareness as part of the counter.

## 2026-08-26 — live news pass 2

- Expanded live discovery with separate Games, Game Industry and Art/Culture channels using public JSON news discovery rather than scraping arbitrary HTML.
- Kept Hacker News as a technology signal and Helsinki Linked Events as the local culture/event signal.
- Added a one-way Helsinki Free Radio bridge into Toko's factual wire: only RFH stories explicitly marked `sourced: true` are ingested.
- RFH parody bulletins never enter Toko's factual news store, preserving the station's invented-actor editorial boundary.
- The RFH bridge reads the latest network-first episode index, so straight-report items can become part of Toko's current conversation without duplicating copy.
- Browser failures remain non-blocking and are visible only in source state/debug data.

## 2026-08-26 — live news pass 1

- Added `news-sources.js`, a browser-safe live source layer on top of the shared news wire.
- Added a real technology feed via Hacker News' public JSON API.
- Added a real Helsinki cultural/event signal via Helsinki Linked Events.
- Live refresh happens once per page session, fails silently when offline or blocked, and records source status instead of breaking the counter.
- Added a generic `registerJSONSource()` adapter so Games, Industry and Art/Culture sources can be plugged in without changing the wire or chat code.
- Added `news-conversation.js` for individual story discussion.
- Players can now refer to `STORY 1`, `HEADLINE 2`, `LATEST STORY`, or a story by title words.
- Once a story is selected, follow-ups such as `SOURCE`, `SUMMARY`, `YOUR TAKE`, `WHY DOES IT MATTER?`, `NEXT STORY` and `PREVIOUS STORY` stay on that story.
- Story facts remain separate from Toko's commentary; asking for the source never returns Toko's opinion as evidence.
- These live stories automatically enter the same normalized wire that Helsinki Free Radio can read through `radioQueue()`.

## 2026-08-26 — news wire pass 1

- Added `news-wire.js` as a shared normalized news layer intended for both Toko Assistant and Helsinki Free Radio.
- Defined separate Games, Industry, Tech, Art/Culture and Helsinki channels with persistent enable/disable settings.
- News ingestion preserves headline, source, URL, summary, category and publication time as factual wire data.
- Toko commentary is generated separately from the factual story object, so his philosophy/opinion cannot silently become part of the source summary.
- Added commentary lenses for layoffs/closures, acquisitions, AI, live-service/monetisation, delays, cancellations, indie development, art/culture and Finnish/Helsinki stories.
- Added `radioQueue()` to expose the same stories in a radio-friendly shape including a separate commentary field.
- The wire deliberately does not scrape arbitrary sites from the browser. External feed collection can now plug into one stable `TokoNewsWire.ingest()` interface instead of being coupled to the chat UI.

## 2026-08-26 — game knowledge pass 1

- Added `game-lineage.js`, a separate curated genre-family module rather than turning Toko into a trivia dump.
- Toko can now explain design ancestry for roguelikes/run-based games, FPS, immersive sims, Souls games, platformers, open worlds, stealth, strategy, deckbuilders, metroidvanias, rhythm games and authored/narrative exploration.
- Each lineage includes a historical spine, Toko's interpretation of the design inheritance, and a criticism/tension about how the genre is commonly misunderstood.
- Genre questions work as free text: e.g. `ROGUELIKE`, `WHERE DID IMMERSIVE SIMS COME FROM?`, `WHAT IS THE SOULSLIKE LINEAGE?`.
- Toko remembers the lineage currently being discussed, so follow-ups such as `WHAT IS THE PROBLEM?` or `WHY?` continue that genre discussion.
- Added lineage-vs-lineage comparison support when two recognizable genre families are named.
- Added a context-driven `SHOW ME A GENRE FAMILY TREE` suggestion to the rotating short menu.
- Kept the lineage data modular so it can expand independently of the conversation parser.

## 2026-08-26 — conversation pass 3

- Follow-up questions now carry the previous subject: short inputs such as `WHY?`, `HOW SO?`, `REALLY?`, `GO ON` and `WHAT DO YOU MEAN?` continue the conversation instead of being parsed as isolated questions.
- Added a lightweight session context tracking the last subject, last answer and turn count.
- Contextual suggested questions now react to the current conversation subject as well as time, durable interests, memory depth and news state.
- Ordinary typed conversation is written into Toko's durable memory with a subject tag, so future sessions can weight prompts around recurring interests.
- Explicit disagreement (`I DISAGREE`, `YOU'RE WRONG`, etc.) is remembered separately. Toko accepts the disagreement rather than trying to win, and `MEMORY` can later acknowledge what the two of you last argued about.
- Exposed narrow `remember()` and `disagree()` hooks from `mind.js` so conversation features can extend persistent state without duplicating storage logic.
- Kept the visible menu at four varied suggestions plus Leave; the authored Sierra tree remains underneath.

## 2026-08-26 — conversation pass 2

- Free-text questions now get a broader Toko response layer before the old parser gives up.
- Toko stays honest on unknown factual questions instead of inventing an answer.
- Added broader authored reactions around games, art, replay, failure, industry habits, development, nature, AI, the player/developer relationship and Toko's own aesthetic.
- The visible prompt list is reduced to four suggested questions plus the way out.
- Suggested questions rotate and are weighted by time of day, stored interests, memory depth and whether news is available.
- Suggestions deliberately vary by subject so the menu does not become four versions of the same design question.
- The authored Sierra-style dialogue tree is still intact underneath; typing remains the deeper route.
- Added `conversation-plus.js` as a separate module so the original parser and language packs remain merge-safe.

## 2026-08-26 — conversation pass 1

- Added `mind.js` as an additive layer behind the existing dialogue tree.
- Persistent local memory for recurring subjects, interests and discoveries.
- Curated genre-defining game canon from early computer/arcade work through modern landmarks.
- Toko commentary on AI, monetisation/live service, open worlds, indie development and visual fidelity.
- Time/season-aware nature prompts and the principle that Toko never asks for proof that you went outside.
- Shared local news inbox API for Toko and later Helsinki Free Radio use.
- First hidden DOS layer: `DIR`, `WHOAMI`, `MEMORY`, `TYPE MANIFESTO.TXT`, `NATURE.EXE`, and `MIRROR.EXE`.
- `MIRROR.EXE` is the first rare full-screen fourth-wall event.
