# AGENTS.md — for automated reviewers and coding agents

This repository is worked by several agents at once, plus Codex reviewing pull
requests. `CLAUDE.md` is the long-form guide to every project. **This file is
the short version an automated reviewer needs**: where each project's canon
lives, what counts as a serious finding here, and the traps this codebase has
actually shipped.

## 1. Canon lives in documents, and documents win

Most projects here have an owner-written design document. **It outranks the
code.** If an implementation contradicts its canon doc, that is a finding —
even when the code is otherwise correct, tested and pretty.

| project | canon | notes |
|---|---|---|
| `piritori/` + `toko-move/` + `flow-core/` | `piritori/DESIGN_AUTHORITY.md` first; then `DESIGN_LOCKS.md` and `GAME_DESIGN_DOCUMENT.md`; `ART_BIBLE.md` owns visuals, `UX_SPEC.md` owns interaction/reflow, `MAP.md` owns Era I geography/graph, `content/era1-slice-v1.json` owns the finite authored slice, and `art/v3/manifest.json` owns registered runtime-art ids; other documents follow only where consistent | Current `main` is the source. PR #269 is historical transfer context, not a merge gate. |
| `eeri/` | `eeri/PHASING.md` first, then `DESIGN.md`, `ART_BRIEF.md`, `VERSIONS.md` | multi-agent; PHASING supersedes on conflict |
| `kindling/` | `BETTERMENT_OWNER_DIRECTION.md` | newest authority; supersedes older "cozy hut" calls |
| `toko/` | `toko/BRAND.md` | two colours only, geometry invariants |
| `gameoflife/` | `gameoflife/EXPERIENCES.md` + `ideas/` | read before adding an experience |

**When canon is deliberately overridden**, the override is recorded in the file
that breaks it, naming what it contradicts. Example: `piritori/js/fight.js`
opens with three numbered OWNER OVERRIDE blocks — a combat layer at all, live
firearms against *"there is no gunfight"*, and cover as terrain — each naming
the sentence it contradicts and the words that overrode it. An unrecorded
contradiction is a finding; a recorded one is a decision.

**Note for Piritori reviewers.** Read `piritori/DESIGN_AUTHORITY.md` first.
`piritori/ART_BIBLE.md`, `UX_SPEC.md`, `MAP.md` and the approved art library supersede
the previous PAPER-versus-INK split and the prototype's placeholders. Guns, named goods and terrain cover remain recorded
owner decisions where they agree with the GDD. Battles stay darker and more
forceful, but characters, locations, props and UI share the active cut-cardstock
and hand-marker construction.

The v2 graph in `flow-core/city.js` is legacy runtime evidence. v3 must adapt
the twelve-anchor Era I graph in
`piritori/map/kallio-era1-2003-v1.json`; fiction sites inherit an anchor and
must not be converted into false real-world addresses.

For a Godot conversion, read `piritori/GODOT_HANDOFF.md` after the canon stack.
It is an implementation and coordination guide, not authority to change the
design or begin phase-gated Era II production.

**The 2024 Pasila act is canon and phase-gated.** Second-act content in the code
or in an art queue *is* a finding until Act I is feature complete —
`DECISIONS.md` §5.

## 2. Severity, in this repository's terms

Generic P1/P2 is less useful here than these five. Please use these words.

| level | means | example that actually happened |
|---|---|---|
| **Playable** | a player can reach a state where the game cannot be played or progressed | a fight panel that opened with no buttons and froze forever; overlays that swallowed every tap because `display:flex` beat `[hidden]` |
| **Gate** | breaks, or should break, a documented test gate — or the gate passes while the thing it names is broken | the smoke gate drove the model through a debug handle and never the interface |
| **Canon** | contradicts a canon document above, without a recorded override | Eden drawn as a node or a progress bar, when the owner locked it as a mystery |
| **Drift** | code, docs, PR text or version tokens disagree with each other | a precache list one token behind the page; a PR body claiming capacity that the code does not enforce |
| **Polish** | everything else | naming, dead code, formatting |

**Playable and Gate block a merge. Canon needs an owner decision, not a
unilateral fix.**

## 3. Rules that are load-bearing, not preferences

- **No build step, anywhere.** Vanilla ES modules, opened from a file server.
  A finding that recommends a bundler is out of scope unless the owner asked.
- **Image assets are project-owned exceptions.** Most demos draw in code and PWA
  icons remain generated. Piritori explicitly keeps approved raster/vector
  source under `piritori/art-library/` and optimized runtime derivatives under
  `piritori/art/`; its manifests and approval register control what is active.
- **One `?v=` token per module**, bumped when and only when its bytes change.
  Two tokens for one module means the browser instantiates it twice and its
  state splits — this has silently unplugged megabytes of art, twice.
- **Determinism.** Where a project claims seeded replay, simulation runs on
  whole integer ticks and the renderer interpolates. Accumulating a float `dt`
  reproduces a seed's events but not its movement.
- **44px minimum touch targets and WCAG AA text contrast** are measured by the
  gates in several projects. Treat a regression as Gate, not Polish.
- **`pointerup` AND `touchend`, never `click`**, for anything over a canvas
  that cancels touches. Cancelling `touchstart` in the capture phase kills the
  pointer stream too, so the element sees `pointercancel` and never
  `pointerup`. This has cost this repo two separate bugs.

## 4. Testing rules, learned the hard way

- **Debug hooks (`window.__pt`, `__eeri`, `__gol`, …) are for SETUP only.**
  Never drive the action under test through them. A browser gate that calls the
  model directly proves the model and says nothing about the interface — this
  is exactly how a completely frozen fight panel passed 44 checks.
- **A gate that cannot fail is a Gate-level finding.** If a check would pass
  with the feature removed, say so.
- Bare-node gates (`.mjs`) run with no browser, GPU or audio device and are
  cheap enough for every edit. Browser gates (`.cjs`) need Playwright.

## 5. Running the gates

CI runs these on every push (`.github/workflows/gates.yml`). Locally:

```bash
node flow-core/test/contract.mjs                          # neutral core
node piritori/map/validate-map.mjs                       # Era I graph and sites
node piritori/content/validate-slice.mjs                 # authored slice + art register
node piritori/test/v3-contract.mjs                       # v3 shell and canon-facing invariants
node piritori/test/v3-state.mjs                          # authored choices, economy and ending
node piritori/test/v3-battle.mjs                         # formation actions and outcomes
NODE_PATH=$(npm root -g) node piritori/test/v3-playthrough.cjs # map-first opening + five live modes
node piritori/test/fight.mjs                              # rank fights
node piritori/test/market.mjs                             # goods, deals, cut bags
NODE_PATH=$(npm root -g) node flow-core/test/smoke.cjs    # both entry points

node eeri/test/rooms.mjs                                  # eeri: geometry
NODE_PATH=$(npm root -g) node eeri/test/playthrough.cjs    # eeri: finishable
node kindling/test/smoke.cjs                              # kindling
node toko/test/brand.cjs                                  # brand geometry + ink
NODE_PATH=$(npm root -g) node test/hub-smoke.cjs          # the arcade
```

The Piritori lane above is wired into CI. Add a job per other project only as
it is verified green, rather than turning everything on at once and teaching
people to ignore red.

## 6. Asking for a review

Codex reviews on: opening a PR for review, marking a draft ready, and the
comment `@codex review`. Long-lived agent branches get many pushes between
those moments, so label a PR **`review`** to have every subsequent push request
a fresh review automatically (`.github/workflows/codex-review.yml`).

## 7. What a good finding looks like here

The most useful review this repo has had named a specific unit and its speed
value, predicted the exact wrong number a HUD would show, and pointed out that
a test only avoided a bug by taking a shortcut. Concrete beats comprehensive.
If a finding is a guess, say it is a guess — several people act on these
directly.
