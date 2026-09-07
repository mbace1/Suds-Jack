---
name: suds-hub-release
description: Use when publishing, versioning, merging, or verifying a playable game on the Suds-Jack Hub/GitHub Pages. Prevents test-harness entry mistakes, stale version tokens, and unverified release claims.
---

# Suds Hub Release

Read `AGENTS.md` §2b, §3 and §4 before changing release paths.

## Release contract

`main` is development truth. The Hub route must launch the actual player build. Labs, diagnostics and debug harnesses use separate URLs.

Before merge/release:
1. Re-read current `main`; other agents may have advanced it.
2. Keep the PR game-scoped. Rebuild cleanly on latest `main` if branch history carries unrelated work.
3. Check the game's `VERSIONS.md` or equivalent and visible in-game marker.
4. Check every changed module `?v=` token. Exactly one token per module; bump only when bytes change.
5. Verify the exact Hub/cabinet route in a browser, through title/menu into gameplay.
6. Verify diagnostics/lab routes separately; never substitute them for the campaign.
7. Run the dedicated game gate and the relevant repo gate.
8. Merge only the tested head SHA.

## Release evidence

A good release note names:
- PR number and merge SHA;
- visible version/build;
- exact real entry path tested;
- automated/browser evidence;
- anything not manually/live verified.

## Stop conditions

Do not merge when:
- Hub entry opens a test harness or dead screen;
- version metadata and runtime bytes disagree;
- CI is green only on an earlier head;
- `main` moved and the PR now contains unrelated history;
- a required Gate/Playable finding remains.
