# Mistakes

A running log of mistakes made in this repo, so they don't get repeated.
Kept short: what went wrong, how it was caught, the fix or rule that
prevents it next time. Append, don't rewrite history.

A Stop hook (`.claude/hooks/stop-mistakes-check.sh`) makes Claude check
this file once per session before finishing, and append anything new.

---

- **Stale git worktrees from a prior (pre-compaction) session pointed at
  an outdated `gh-pages` commit**, not the real remote tip. Reused
  without re-checking, a deploy could have been built on the wrong base.
  Caught by comparing `git fetch origin gh-pages`'s reported tip against
  the worktree's actual `HEAD` before doing anything with it — they
  didn't match. Fix: before reusing any worktree that already existed at
  the start of a session, `git branch -f <branch> origin/<branch>` and
  recreate it, rather than trusting it's current.

- **`kill %1` didn't kill the intended background server**, because the
  job table didn't match what was assumed (a `python3 -m http.server`
  process from an earlier command was still running under a different
  job slot). The next server start failed with `EADDRINUSE`. Fix: find
  the actual PID with `lsof -i :<port>` and kill that directly, rather
  than trusting `%1`/`%2` job references across separate Bash tool calls
  (each call can be a fresh shell, so job numbers don't reliably persist).

- **A Playwright test's own filtering for an expected, harmless local
  404 (`hub/shell.js`, which only exists once actually deployed under the
  arcade) was wrong in two separate ways at once**: one check never
  filtered it out at all, and the console-error check tried to string-match
  the failing URL against Chrome's own error message — which never
  includes the URL, so the filter silently matched nothing. Both were
  caught only by actually running the test and reading the failure output,
  not by reviewing the test code. Fix: when a hook's expected-but-harmless
  signal needs filtering out of a check, filter it consistently everywhere
  the signal could show up (network log AND console log), and verify by
  running the test rather than reasoning about whether the filter should
  work.
