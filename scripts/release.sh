#!/usr/bin/env bash
set -euo pipefail

# release.sh — run AFTER the PR has been squash-merged into gh-pages.
#
# Squash-merging leaves the feature branch diverged from gh-pages (its original
# commits never appear on gh-pages; a new squashed commit does). That forces a
# manual reset + force-push every release and makes the stop-hook flag GitHub's
# own merge commit as "unverified". This resyncs local + remote feature branch
# to the merged gh-pages tip so the divergence and the false-positive nag both
# go away, leaving a clean base for the next change.

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "detached HEAD — checkout your feature branch first" >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "working tree has uncommitted changes — commit or stash before resyncing" >&2
  exit 1
fi

git fetch origin gh-pages
git checkout -B "$BRANCH" origin/gh-pages
git push --force-with-lease origin "$BRANCH"

echo "✔ resynced $BRANCH to origin/gh-pages (clean base for next change)"
