#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const [base = 'origin/main', production = 'origin/gh-pages', outputDir = 'reports'] = process.argv.slice(2);

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function commit(ref) {
  try {
    return {
      sha: git(['rev-parse', '--verify', `${ref}^{commit}`]),
      committedAt: git(['show', '-s', '--format=%cI', ref]),
    };
  } catch {
    throw new Error(`Cannot resolve Git ref: ${ref}`);
  }
}

function tree(ref) {
  const raw = execFileSync('git', ['ls-tree', '-r', '-z', ref], { encoding: 'utf8' });
  const entries = new Map();
  for (const record of raw.split('\0')) {
    if (!record) continue;
    const match = record.match(/^(\d+) (\w+) ([0-9a-f]+)\t(.+)$/s);
    if (!match) throw new Error(`Unexpected ls-tree record: ${record}`);
    const [, mode, type, sha, path] = match;
    entries.set(path, { mode, type, sha });
  }
  return entries;
}

function kind(path) {
  const extension = extname(path).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.mp3', '.wav', '.ogg'].includes(extension)) return 'asset';
  if (path.includes('/vendor/') || path.startsWith('vendor/')) return 'vendor';
  if (['.md', '.txt'].includes(extension)) return 'docs';
  if (['.js', '.mjs', '.cjs', '.html', '.css', '.json', '.webmanifest', '.sh'].includes(extension)) return 'source';
  return 'other';
}

function topLevel(path) {
  const slash = path.indexOf('/');
  return slash === -1 ? '(root)' : path.slice(0, slash);
}

const baseTree = tree(base);
const productionTree = tree(production);
const baseCommit = commit(base);
const productionCommit = commit(production);
const paths = [...new Set([...baseTree.keys(), ...productionTree.keys()])].sort();
const records = paths.map((path) => {
  const main = baseTree.get(path) ?? null;
  const pages = productionTree.get(path) ?? null;
  let status = 'diverged';
  if (!main) status = 'production-only';
  else if (!pages) status = 'main-only';
  else if (main.sha === pages.sha && main.mode === pages.mode) status = 'identical';
  return { path, project: topLevel(path), kind: kind(path), status, main, production: pages };
});

const projects = {};
for (const record of records) {
  const project = projects[record.project] ??= { total: 0, identical: 0, 'main-only': 0, 'production-only': 0, diverged: 0 };
  project.total += 1;
  project[record.status] += 1;
}

const report = {
  refs: { main: base, production },
  commits: {
    main: baseCommit,
    production: productionCommit,
  },
  totals: records.reduce((acc, record) => {
    acc.total += 1;
    acc[record.status] += 1;
    return acc;
  }, { total: 0, identical: 0, 'main-only': 0, 'production-only': 0, diverged: 0 }),
  projects,
  publicHtmlPaths: records
    .filter((record) => record.production && record.path.endsWith('.html'))
    .map((record) => record.path),
  files: records,
};

const classifiedTotal = report.totals.identical
  + report.totals['main-only']
  + report.totals['production-only']
  + report.totals.diverged;
if (classifiedTotal !== report.totals.total || report.totals.total !== paths.length) {
  throw new Error('Inventory totals are internally inconsistent');
}

const rows = Object.entries(projects)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, counts]) => `| \`${name}\` | ${counts.total} | ${counts.identical} | ${counts['main-only']} | ${counts['production-only']} | ${counts.diverged} |`)
  .join('\n');

const markdown = `# Branch inventory\n\nGenerated from complete Git trees; files are compared by blob SHA and mode.\n\n- Main: \`${report.commits.main.sha}\` (${report.commits.main.committedAt})\n- Production: \`${report.commits.production.sha}\` (${report.commits.production.committedAt})\n- Total paths: **${report.totals.total}**\n- Identical: **${report.totals.identical}**\n- Main only: **${report.totals['main-only']}**\n- Production only: **${report.totals['production-only']}**\n- Diverged: **${report.totals.diverged}**\n- Existing production HTML paths to preserve: **${report.publicHtmlPaths.length}**\n\n| Project | Total | Identical | Main only | Production only | Diverged |\n|---|---:|---:|---:|---:|---:|\n${rows}\n\n## Status meanings\n\n- **Identical:** same blob SHA and file mode on both refs.\n- **Main only:** present only on the main ref.\n- **Production only:** present only on the production ref.\n- **Diverged:** same path exists on both refs with different content or mode.\n\nUse the JSON report for the per-file migration ledger. Classification here is descriptive, not a canonical-version decision.\n`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(join(outputDir, 'branch-inventory.json'), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(join(outputDir, 'branch-inventory.md'), markdown);
console.log(`Wrote ${records.length} paths to ${outputDir}/branch-inventory.{json,md}`);
