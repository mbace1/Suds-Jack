<!--
One lane per PR. If this touches two projects' folders, say why in "Scope" —
AGENTS.md §1 lists who owns what, and two agents in one module is how two
lineages start. Delete any section that does not apply rather than leaving it
blank; a blank section reads as "checked, nothing to say".
-->

## Scope

- **Lane / project:** <!-- e.g. hub, toko-drop/, turf/, eeri/ (Design/Level) -->
- **Canon read first:** <!-- the doc AGENTS.md names for this folder, and anything in it this changes -->
- **Owner direction, if any:** <!-- quote it; "the owner said" without the words is not direction -->

## What changed and why

<!-- The behaviour a player or a maintainer will notice, then the reason.
     A bug fix says what the bug WAS, measured, not just that it is gone. -->

## Versions and tokens

- [ ] `VERSIONS.md` has a new top entry (a number never reused — fetch and read the other lineage's log first)
- [ ] Every module whose bytes changed has a bumped `?v=` token, and **only** those
- [ ] `hub/games.js` title / tagline / controls / note still describe the game that ships
- [ ] `node scripts/versions.mjs . --check` agrees — or `<site> --check` on the deployed tree, never a plain regenerate there

## Evidence

<!-- Gates prove it WORKS. They cannot see how it LOOKS or FEELS. -->
- **Gates run** (name each, with its result):
- **Real entry path tested in a browser:** <!-- the hub cabinet's Play link, through title/menu into play — not a lab or debug URL -->
- **Look / feel change?** Attach a screenshot, or a GIF for motion (`toko-drop/scripts/enemy-loop.mjs` for Toko Drop). A green suite is not evidence for a look.
- **Not verified:** <!-- say what you could not check — a phone, a pad, a GPU, the network. This line is never empty on a feel change. -->

## Findings left open

<!-- In AGENTS.md §2's words: Playable / Gate block a merge; Canon needs the
     owner; Drift and Polish may ship if named here. "None" is an answer. -->

## Deploy

- [ ] Not deploying in this PR — merging is not a release
- [ ] Deploying: `node scripts/deploy-hub.mjs <site> --dry` read before the real run, and any `--take` named here with the reason
- [ ] After deploy: the **pages build and deployment** run concluded `success`, and the live cabinet was opened
