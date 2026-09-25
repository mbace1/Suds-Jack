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

- **`git merge-base` on a shallow clone returned nothing, which reads
  exactly like "two unrelated lineages"** (Eeri's disease) — and nearly got
  reported to the owner as one for piritori-eden's C.19 branch. The
  `add_repo` clone is `--depth 1`, so the history that held the common
  ancestor simply wasn't there. Caught by suspecting the ruler before the
  finding: deepened the fetch until `.git/shallow` was gone, re-ran it, and
  got a real merge base (`312540d`, a 162-vs-7 split, perfectly mergeable).
  Fix: before concluding "no common ancestor", check `.git/shallow` and
  fetch enough history (`git fetch --depth=2000 origin <both branches>`);
  an empty merge-base on a shallow clone is not a finding.

- **`pkill -f "http.server …"` killed the shell running it — twice in one
  session.** The pattern also matches the calling shell's own command line
  (it contains the same text), so the Bash call died with exit 144 and took
  the commands after it (a commit and a push) down with it. Fix: stop servers
  by port — `for pid in $(lsof -t -i :PORT); do kill $pid; done` — never
  `pkill -f` with a string the current command also contains.

- **`rm -rf test` in a gh-pages worktree deleted three TRACKED files**
  (`test/piritori-c18-*`), because a temporary copy of `hub-smoke.cjs` had
  been put in a directory the site already owns. Caught only because the
  staged file list was read before committing. Fix: put temporary harness
  files in the scratchpad, or delete them by exact name; read
  `git diff --cached --name-only` before every deploy commit.

- **A token cascade over the site missed `AnotherHUB/index.html`.** That page
  carries `<base href="../">`, so its relative references resolve against the
  site root, not its own folder, and a script resolving paths per file never
  matched them. The smoke test's "byte-identical apart from the base tag" rule
  is what exposed it. Fix: after any cascade, diff AnotherHUB against the
  root page with the base line stripped.
