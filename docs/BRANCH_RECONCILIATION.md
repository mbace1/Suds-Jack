# Branch reconciliation plan

Tracking issue: [#192](https://github.com/mbace1/Suds-Jack/issues/192)

## Goal

Make `main` the complete source of truth while keeping `gh-pages` as the production
branch. The first reconciliation must not rename, move, or delete any deployed path.
The GitHub Pages domain and every existing game URL remain unchanged.

This is a preservation migration, not a normal branch merge. At the inventory refs,
`gh-pages` is both 551 commits ahead of and 250 commits behind `main`.

## Non-negotiable safety rules

1. Keep the current GitHub Pages domain and publishing configuration.
2. Preserve every path currently present on `gh-pages` at the same relative path.
3. Do not replace `gh-pages` with `main` until a generated deployment tree has been
   compared with production and all public HTML paths pass HTTP smoke checks.
4. Do not resolve diverged gameplay files by choosing a whole branch.
5. Copy production-only projects into `main` byte-for-byte before refactoring them.
6. Keep main-only tests, design notes, and experiments unless separately reviewed.
7. Use redirects only if a later, explicitly reviewed change must move a URL.

The complete public HTML list is recorded as `publicHtmlPaths` in
`reports/branch-inventory.json`.

## Inventory checkpoint

The preservation snapshot is anchored to these exact refs:

- `main`: `890bd8b6564d3daf7967072de17f36407f443a9b`
- `gh-pages`: `0f0e2105d5565d0bcf75494edcbdba7ee6e35d1f`

All import and divergence counts below refer to that production SHA. Re-run the
inventory against the current `gh-pages` head before this branch leaves draft.

| Classification | Paths | Default treatment |
|---|---:|---|
| Identical | 189 | No change |
| Main only | 21 | Keep in `main`; do not deploy unintentionally |
| Production only | 233 | Import unchanged at the same path |
| Diverged | 40 | Reconcile by project using the rules below |
| Total | 483 | Complete Git-tree inventory |

Only the 40 diverged paths require content judgment. The other 443 are mechanical.

## Project ledger

| Area | Preliminary source | Treatment | URL impact |
|---|---|---|---|
| `Skltr/`, `eye-test/`, `neon-ronin/`, `powder/`, `radiofree/`, `sudz/`, `tiny2d/`, `tinyhawk/`, `voxel/` | Production | Import byte-for-byte | None |
| `hyperdagger/` | Production | Import current live version, including offline and vendor assets | None |
| `toko-drop/` | Production for live game | Import current live version; retain main-only `GODOT_PORT.md` and `lab.html` | None |
| `hub/`, root `index.html`, `AnotherHUB/`, root `sw.js` | Production | Use the current live shell as baseline | None |
| `dropcabal/`, `flashprince/`, `gameoflife/`, `paperboy/`, `sudsjack/` entry pages | Production shell | Keep live entry-page integrations; retain main-only source/tests | None |
| `toko/` | Manual overlay | Use live shell/sting changes and retain main-only brand tests/fixtures | None |
| `gameoflife/ideas/` and tests | Main | Keep as source-only material unless explicitly deployed | None |
| Root `README.md` | Production baseline | Reconcile documentation after the code tree is unified | None |
| Root `CLAUDE.md` | Manual merge | Preserve main's detailed design knowledge and add production-only guidance | None |
| Production scripts and root design docs | Production | Import unchanged, then audit separately | None |

"Preliminary source" records the safest first import baseline. It is not permission
to discard files from the other branch.

## Open pull-request overlap

The inventory also intersects three open pull requests. Their changes must be
replayed or reconciled after the production baseline is present; they must not be
silently replaced by the branch import.

| PR | Inventory overlap | Treatment |
|---|---|---|
| [#183](https://github.com/mbace1/Suds-Jack/pull/183) Radio Free Helsinki | 37 production-only `radiofree/` paths, 14 diverged hub/Toko/docs paths, 17 otherwise-identical shared paths, and one new workflow | Treat the PR head and production tree as two inputs. Preserve the live wire/archive and separately reconcile the workflow, source, hub, Toko, and documentation changes. |
| [#181](https://github.com/mbace1/Suds-Jack/pull/181) Drop Cabal gamepad | Four diverged entry/hub/docs paths, four otherwise-identical Drop Cabal source paths, and one main-only hub test | Rebase or replay after the live entry-page shell is imported, then run the native-gamepad and hub smoke tests. |
| [#1](https://github.com/mbace1/Suds-Jack/pull/1) initial Suds Jack scaffold | Two diverged root docs plus 15 paths absent from both current trees | Treat as a legacy proposal, not production reconciliation. The current `sudz/` and `sudsjack/` trees are preserved independently. |

Recorded PR heads: #183 `3ebee592`, #181 `4926e232`, #1 `456d866`.

## Pull-request sequence

### PR 1 — Inventory and contract

- Add the read-only inventory script and generated reports.
- Record the path-preservation contract.
- Change no game or deployment behavior.

### PR 2 — Preserve production in `main`

- Import all production-only paths without moving them.
- Reconcile the 40 diverged paths by the project ledger.
- Keep all main-only paths.
- Run syntax, registry, localization, game smoke, hub, and offline checks.

### PR 3 — Reproducible checks

- Add a minimal Node package manifest and pinned runtime/tool versions.
- Make existing tests callable through stable scripts.
- Add CI without changing deployment.

### PR 4 — Generated deployment

- Build a deployment tree from `main` in a temporary directory.
- Generate versions and service-worker inventories there.
- Compare its full path set with the current `gh-pages` tree.
- Smoke-test every preserved HTML URL before allowing publication.

### PR 5 — Switch publication source

- Publish the verified generated tree to `gh-pages`.
- Keep the existing Pages domain, branch, paths, and URLs.
- Retain a rollback reference to the previous production commit.

Shared utilities and gameplay refactors begin only after this sequence is stable.

## Acceptance gate for the first generated deployment

- Zero missing paths relative to the pre-migration production inventory unless an
  exception is explicitly approved.
- Every path in `publicHtmlPaths` returns successfully from a clean local server.
- Root and `AnotherHUB/` remain compatible entry points.
- All current service-worker scopes install from a clean cache and work offline.
- Existing local-storage keys and feedback endpoints remain unchanged.
- The generated `gh-pages` diff contains no unexplained deletion or rename.
- Rollback to the recorded pre-migration production SHA is documented and tested.

## Regenerating the inventory

```sh
git fetch origin main gh-pages
node scripts/branch-inventory.mjs origin/main origin/gh-pages reports
```

The tool reads Git trees only. It does not check out, merge, copy, or delete files.
