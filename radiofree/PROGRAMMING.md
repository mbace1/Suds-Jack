# Radio Free Helsinki — Programming Desk

The daily wire should feel programmed, not like five RSS items chosen by accident.
`EDITORIAL.md` remains the voice and safety authority. This document controls the mix.

## Daily transmission

Default target: **7 bulletins**. A shorter day is preferable to filler.

The desk should try to assemble:

1. **HELSINKI / FINLAND** — a concrete local or national event with a useful human consequence.
2. **GAMES** — studios, publishing, labour, platforms, creative technology or game culture.
3. **TECH / INDUSTRY** — infrastructure, AI, telecoms, energy, logistics, data centres or industrial policy.
4. **CULTURE / CITY** — art, nightlife, architecture, transport, public space, food or a strange civic detail.
5. **SIGNAL / SECURITY** — communications, positioning, resilience, borders, defence-adjacent technology; only when there is a real suitable event.
6. **ODD WIRE** — a small, specific story that becomes memorable through the RFH lens rather than through importance.
7. **LEAD** — the strongest remaining story of the day, regardless of desk.

These are editorial slots, not visible channels. RFH remains one station and one feed.

## Selection rules

- Prefer stories with a concrete action, consequence and number over commentary about commentary.
- Prefer Helsinki/Finland relevance when two stories are equally strong.
- Do not manufacture a category match. If there is no worthwhile security story, use another strong city, games, culture or technology item.
- Avoid multiple bulletins whose underlying event is essentially the same story.
- Avoid a whole transmission being layoffs, AI, war, markets or government. Rhythm matters.
- At least one item should be small enough to make the world feel inhabited rather than summarized.
- The opening item should have immediate visual and verbal clarity on a phone screen.
- The final ordinary bulletin should leave a strong image before sign-off.

## Recurring labels

The generator may assign one of these optional editorial labels for future UI use:

- `LEAD`
- `CITY`
- `GAMES`
- `TECH`
- `CULTURE`
- `SIGNAL`
- `ODD WIRE`

They are metadata, not permission to change the broadcast voice.

## Visual programming

The picture is part of story selection. Prefer a story when the current visual library can make a specific argument about it.

For each bulletin, the generator should decide:

- **visual** — the diagram or scene carrying the rhetorical claim;
- **broll** — the place/action cutaway giving the bulletin a physical world;
- **visualBeat** — one short instruction describing what should become newly legible during DECODE.

`visualBeat` is descriptive metadata. Existing clients may ignore it. It is intended to guide the next renderer pass and prevent generic art selection.

Good: `The impressive occupancy figure collapses when the surveyed wedge is revealed.`

Bad: `Show a cool graph.`

## Future formats

Do not put these into the automatic daily transmission until their renderer exists, but select/source material with them in mind:

- **BREAK-IN** — one urgent item interrupting the normal feed.
- **NIGHT WIRE** — 2–3 quieter city/culture/odd items.
- **FILE** — a longer multi-panel investigation assembled from several verified sources.
- **STATION ID** — very short world-building interstitials with no factual claim.

The goal is a station with programming, not an infinite news list.