#!/usr/bin/env node
// THE LINEAGE ALARM — does this branch still contain what the site is running?
//
//   node scripts/lineage-check.mjs [--ref origin/gh-pages] [--only a,b] [--strict]
//
// Why it exists. Twice a project here grew two histories without anyone
// noticing, because VERSION NUMBERS DO NOT DETECT IT: Eeri's two lineages both
// reached "v11" and hub/versions.json said v11 on each, and Slay Kallio's site
// shipped its own "v40" (Toko at the table, straight to gh-pages across seven
// games) while this branch already had a different v40 and was at v52. A
// wholesale deploy either way deletes the other side's work, and the only thing
// that ever caught it was a person reading two files.
//
// The check is one line per game: the site's TOP `## v…` heading of that
// game's VERSIONS.md must appear verbatim in the branch's log. Heading lines
// carry a date and a version, so two different releases that share a number
// are told apart by it, and a branch that is merely BEHIND the site is told
// apart from one that has SPLIT from it by comparing the numbers:
//
//   OK      the site's release is in this branch's history
//   BEHIND  the site is newer and this branch simply has not caught up
//   SPLIT   this branch is at or past the site's number and does NOT contain
//           the site's release — somebody shipped something here never saw
//
// Only SPLIT fails, and only for games this branch actually changed (--only, or
// the default of every game whose folder differs from the ref); a split in a
// game you did not touch is printed and left for whoever owns it (--strict
// fails on those too). No dependencies; reads the ref with plain `git show`.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const REF = arg('--ref', 'origin/gh-pages');
const STRICT = process.argv.includes('--strict');
const git = (...a) => { try { return execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };

if (git('rev-parse', '--verify', REF) === null) { console.log(`lineage: ${REF} is not available here — nothing to compare (fetch it first)`); process.exit(0); }

const top = log => log.split(/\r?\n/).find(l => /^## v\d/.test(l))?.trim() ?? null;
const num = h => { const m = h?.match(/^## v(\d+)(?:\.(\d+))?/); return m ? Number(m[1]) * 1000 + Number(m[2] ?? 0) : -1; };
const games = readdirSync('.').filter(d => !d.startsWith('.') && statSync(d).isDirectory() && existsSync(`${d}/VERSIONS.md`));
const only = arg('--only', null)?.split(',');
const touched = new Set(only ?? games.filter(d => (git('diff', '--quiet', REF, '--', d) === null)));

let failed = 0;
const rows = [];
for (const d of games) {
  const live = git('show', `${REF}:${d}/VERSIONS.md`);
  if (live === null) continue;                                   // not on the site
  const siteTop = top(live), here = readFileSync(`${d}/VERSIONS.md`, 'utf8');
  if (!siteTop) continue;
  const lines = new Set(here.split(/\r?\n/).map(l => l.trim()));
  const mine = top(here);
  let verdict;
  if (lines.has(siteTop)) verdict = 'OK';
  else if (num(mine) < num(siteTop)) verdict = 'BEHIND';
  else verdict = 'SPLIT';
  const counts = touched.has(d) || STRICT;
  if (verdict === 'SPLIT' && counts) failed++;
  rows.push({ d, verdict, siteTop, mine, counts });
}
for (const r of rows.sort((a, b) => (a.verdict === 'SPLIT' ? 0 : 1) - (b.verdict === 'SPLIT' ? 0 : 1))) {
  const tag = r.verdict === 'SPLIT' ? (r.counts ? 'SPLIT ✗' : 'split (untouched)') : r.verdict;
  console.log(`${tag.padEnd(18)} ${r.d.padEnd(14)} site: ${r.siteTop}   branch: ${r.mine ?? '—'}`);
  if (r.verdict === 'SPLIT' && process.env.GITHUB_ACTIONS)
    console.log(`::${r.counts ? 'error' : 'warning'} file=${r.d}/VERSIONS.md::${r.d}: the site is running "${r.siteTop}", which this branch's log does not contain. Bring that release in before deploying — a wholesale copy from either side deletes the other's work.`);
}
if (failed) console.log(`\n${failed} game(s) this branch changed have split from ${REF}.`);
process.exit(failed ? 1 : 0);
