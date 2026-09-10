# Toko Player Pulse

Toko Live can ask players short, contextual questions and turn the answers into development evidence. This is a feedback channel, not a voting system: player responses inform design but never automatically become roadmap commitments.

## Loop

`play context -> Toko moment -> answer card -> pulse event -> aggregate -> project feedback -> Claude/Codex/design review -> shipped/dropped/queued result -> Toko can close the loop with players`

Toko should prefer silence. Ask only when there is a meaningful trigger: a completed/abandoned run, repeated retry, first encounter with a mechanic, return after an update, or a developer-authored research question whose trigger has actually occurred.

## Answer cards

Default to four large A/B/C/D choices with optional `Tell Toko` free text. Questions should sound like Toko, not a survey. Examples:

- `What should Powder push hardest?` — Racing / Exploration / Expression / Make it stranger
- `Why did you stop that run?` — Done / Bored / Confused / Wanted a different approach
- `Did you understand why you missed that tram?` — Timing / Route / Button / Yes, I mistimed it
- `Which version felt better?` — Current / Previous / Different strengths / Neither

Never ask for personally identifying information. Store an anonymous local player/session id only when needed to prevent duplicate weighting.

## Pulse event schema

```json
{
  "schema": 1,
  "questionId": "powder.vision.001",
  "project": "powder",
  "build": "v2",
  "askedAt": "ISO-8601",
  "trigger": "post-session",
  "playContext": {"sessions": 2, "minutes": 11},
  "answer": "exploration",
  "freeText": null
}
```

The public client MUST NOT receive a GitHub write credential. Production submission goes through a small authenticated/rate-limited feedback endpoint. The endpoint validates known question IDs and allowed answers, strips unexpected fields, rate-limits abuse, and writes/aggregates development evidence server-side.

## Repo-facing output

Do not commit one file per click. Aggregate pulses into compact project summaries that agents can consume, for example:

```md
## Powder — player pulse
Question: What should Powder push hardest?
Responses: 42
- Exploration 45%
- Racing 26%
- Strange/experimental 19%
- Expression 10%

Toko interpretation: exploration is currently the strongest player pull.
Status: feedback, not approved roadmap.
```

Claude/Codex may turn a strong signal into a normal design note or `QUEUE.md` item. The queue keeps its existing stable-ID/status/landing rules; Player Pulse does not bypass them.

## Questions from development

Agents may publish research questions for Toko with:

- stable question id
- project/build scope
- question + 2–4 answers
- trigger/eligibility condition
- expiry or target response count
- why the answer matters
- destination design/queue document

Toko asks only eligible players at an appropriate moment. This makes playtesting part of the game rather than a detached survey.

## Future-facing language

When Toko discusses development he must distinguish:

- **SHIPPED** — evidenced by version/commit/PR.
- **QUEUED** — explicitly present as an active item in a formal queue.
- **ROADMAP** — explicitly authored future intent in a roadmap/design authority, but not necessarily scheduled or queued.
- **LIKELY** — Toko inference from current work, feedback and unresolved design pressure.
- **MY GUESS** — deliberately speculative Toko opinion.

Never present ROADMAP, LIKELY or MY GUESS as a promise, and never call roadmap prose QUEUED unless a queue item actually exists.

## Closed-loop memory

Chronicle should retain relationships between a pulse question, resulting design/queue item, and eventual landing/dropping decision. That enables Toko to say, truthfully, that player feedback contributed to a later change and show the evidence/timeline behind it.
