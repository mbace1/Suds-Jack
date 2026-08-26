# Toko Assistant — patch notes

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
