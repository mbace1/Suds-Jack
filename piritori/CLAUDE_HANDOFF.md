# Claude Code handoff — Piritori → Eden

Owner handoff, 2026-08-16.

## Purpose of this handoff

The GDD is ready for owner review. The previous Art Bible and screen tests were
rejected and reset. Do not submit, cite or implement `ART_BIBLE.md` until a new
Finnish, cartoony character direction is owner-approved.

Read in this order:

1. GAME_DESIGN_DOCUMENT.md
2. NARRATIVE.md
3. SHARED_ENGINE.md
4. NEWS_SOURCE_LEDGER.md
5. BRIEF.md as historical context
6. references/toko-move-2021-concept.jpg when available
7. the repository root CLAUDE.md for repo-wide conventions

## First response requested from Claude Code

Reply in the PR conversation before writing code. The reply should contain:

1. a short critique of the core combination: Drug Wars market pressure plus a
   visible people/transport flow game;
2. the smallest five-minute prototype that can prove or disprove the idea;
3. a proposed file/module layout for flow-core, piritori and toko-move;
4. the two highest design risks and two highest technical risks;
5. a direct recommendation on the working definition of Eden;
6. a recommendation on the highest-risk open decision in the GDD;
7. any contradiction found between the GDD and current repository rules.

Keep critique concrete and review the proposed vertical slice rather than
inventing a larger production roadmap. Do not begin the next implementation
pass until the owner reviews the GDD. Art implementation remains blocked on a
separate character-direction approval.

## Hard constraints

- This is not the earlier handcrafted exploration interpretation.
- Mobile-first.
- Two product entry points from the first playable slice.
- Ordinary people movement and hidden/product movement share the same graph and
  capacity.
- Toko Move must be fully family-friendly and contain no leaked drug wording or
  assumptions.
- Piritori has a separate alternating-turn crew battle layer. Aatami commands;
  recruited operatives fight, can be injured or killed and must be replaced.
- No real-world trafficking data or attempt at operational realism.
- Do not clone Mini Metro station shapes, line language or Mini Motorways
  coloured-house/pin grammar.
- Hub and gh-pages deployment are authorised once the playable baseline passes
  checks; preserve unrelated live drift.
- Keep the first code slice small, deterministic and testable.

## Current design unknowns

- Eden’s final meaning.
- Final campaign duration.
- Exact first tactical party size and turn-order model.

These are discussion items, not gaps to silently fill.

## Suggested PR sequence after design approval

1. Neutral flow-core lab plus two minimal skins.
2. Route editing, queues and phone interaction.
3. Piritori market/debt/heat prototype.
4. Toko Move day/access/pollution prototype.
5. Narrative contacts and product-specific event passes.
6. Art and audio production after the loop and replacement Art Bible survive
   review.

Each PR should keep both products runnable whenever shared core behavior changes.
