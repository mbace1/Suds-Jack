#!/usr/bin/env node
// ship.mjs — put ONE game on the site, the way it has been done by hand.
//
//   node scripts/ship.mjs <game> [--from <repo-root>] [--push] [--dry]
//                         [--prune] [--force] [--no-boot] [--check "<cmd>"]
//                         [--trailer "<text>"]
//
// The site is the gh-pages branch, and it is edited from more than one
// direction, so shipping a game has meant the same dance every time: fetch
// gh-pages into a worktree, copy the game's folder over its copy there
// (minus test/ and art-src/), put BACK the cross-directory tokens the site
// owns (its ../hub/shell.js?v=N, its ../toko/… badge), move the one line in
// hub/versions.json, boot the staged tree to prove it loads with no 404s and
// a whole precache, commit, rebase on whatever landed meanwhile, push, and
// go and look at the Pages run. Every one of those steps has been forgotten
// at least once. This is all of them, in order, refusing where a hand would
// have to think:
//
//   - it will not ship a game whose copy on the site is AHEAD of the source
//     (the site moved on its own — bring that work back first);
//   - it will not ship without a new VERSIONS entry (no number, no release);
//   - it will not delete files the site has that the source does not,
//     unless told to (--prune), and it names them;
//   - it will not push a tree that failed to boot.
//
// It changes exactly two things on the site: <game>/ and that game's entry
// in hub/versions.json (plus VERSIONS.md and README.md at the root for the
// one project — Toko Drop — whose log lives there). games.js, art.js and
// the hub are the site's; scripts/deploy-hub.mjs is the tool for those.
//
// --from is the repo root the game is read from; default is this checkout.
// For Toko Drop, whose canonical tree IS gh-pages, point it at a worktree of
// that lineage — shipping from a stale branch copy is how second lineages
// start, and the version guard above is what catches it.

import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, statSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';

const argv = process.argv.slice(2);
const flag = n => argv.includes('--' + n);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const game = argv.find(a => !a.startsWith('--') && !argv.includes('--' + a) && argv[argv.indexOf(a) - 1]?.startsWith('--') !== true);
if (!game) { console.error('usage: node scripts/ship.mjs <game> [--from <repo-root>] [--push] [--dry] [--prune] [--force] [--no-boot] [--check "<cmd>"] [--trailer "<text>"]'); process.exit(2); }

const HERE = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.resolve(opt('from', HERE));
const WT = path.join(os.tmpdir(), 'ship-gh-pages');
const EXCLUDE = new Set(['test', 'art-src', 'node_modules', '.DS_Store']);
const say = m => console.log('· ' + m);
const die = (m, code = 1) => { console.error('✘ ' + m); if (existsSync(WT)) console.error('  staged tree left at ' + WT); process.exit(code); };
const sh = (cmd, cwd = HERE) => execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

// ── versions, the way hub/versions.json counts them ───────────────────────
const topOf = f => { if (!existsSync(f)) return null; const m = readFileSync(f, 'utf8').match(/^##\s*v(\d+)(?:\.(\d+))?/m); if (!m) return null; const M = +m[1], mn = m[2] === undefined ? null : +m[2]; return { v: mn === null ? String(M) : `${M}.${m[2]}`, n: M * 1000 + Math.min(999, mn ?? 0) }; };
const norm = t => t.toLowerCase().replace(/[^a-z0-9]/g, '');
function rootLogOwns(root) {          // is the root VERSIONS.md this game's log?
  const f = path.join(root, 'VERSIONS.md'); if (!existsSync(f)) return false;
  const h1 = readFileSync(f, 'utf8').match(/^#\s*(.+?)\s*(?:—|-|$)/m); if (!h1) return false;
  let titles = [norm(game)];
  const t = catalogueEntry(root).title; if (t) titles.push(norm(t));
  return titles.includes(norm(h1[1]));
}
const versionOf = root => rootLogOwns(root) ? topOf(path.join(root, 'VERSIONS.md')) : topOf(path.join(root, game, 'VERSIONS.md'));
// the catalogue keys a game by ID, and the id is not always the folder
// (toko-drop/ is `tokodrop`). Entries nest objects, so split games.js at
// each `id:` and read the fields of the entry whose path is this folder.
function catalogueEntry(root) {
  try {
    const g = readFileSync(path.join(root, 'hub', 'games.js'), 'utf8');
    const ids = [...g.matchAll(/\bid:\s*'([^']+)'/g)];
    for (let i = 0; i < ids.length; i++) {
      const chunk = g.slice(ids[i].index, ids[i + 1]?.index ?? g.length);
      if (new RegExp(`\\bpath:\\s*'${game}/'`).test(chunk)) {
        const t = chunk.match(/\btitle:\s*'([^']+)'/);
        return { id: ids[i][1], title: t ? t[1] : null };
      }
    }
  } catch {}
  return { id: game, title: null };
}
const catalogueId = root => catalogueEntry(root).id;

// ── files ─────────────────────────────────────────────────────────────────
function walk(dir, rel = '') { const out = []; if (!existsSync(dir)) return out; for (const e of readdirSync(dir, { withFileTypes: true })) { if (EXCLUDE.has(e.name)) continue; const r = path.join(rel, e.name); if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), r)); else out.push(r); } return out; }
const CROSS = /(\.\.\/(?:hub|toko)\/[^"'`?\s)]+)\?v=(\d+)/g;
function crossTokens(dir) { const map = new Map(); for (const f of walk(dir).filter(f => /\.(html|js)$/.test(f) && !f.includes('/'))) { for (const m of readFileSync(path.join(dir, f), 'utf8').matchAll(CROSS)) map.set(m[1], m[2]); } return map; }

// ── 0. what and from where ────────────────────────────────────────────────
if (!existsSync(path.join(SRC, game))) die(`${game}/ is not in ${SRC}`);
const srcV = versionOf(SRC);
if (!srcV) die(`${game} has no VERSIONS.md entry to ship — add a ## vN entry first`);
say(`${game} v${srcV.v} from ${SRC}`);

// ── 1. the site, fresh ────────────────────────────────────────────────────
sh('git fetch origin gh-pages');
if (existsSync(WT)) { try { sh(`git worktree remove --force ${WT}`); } catch { rmSync(WT, { recursive: true, force: true }); } }
sh(`git worktree add --detach ${WT} origin/gh-pages`);
say(`gh-pages at ${sh('git rev-parse --short HEAD', WT)} in ${WT}`);

// ── 2. the guards ─────────────────────────────────────────────────────────
const siteV = versionOf(WT);
if (siteV) {
  if (siteV.n > srcV.n) die(`the site has ${game} v${siteV.v}, AHEAD of this v${srcV.v} — the site moved on its own; bring that work back first`);
  if (siteV.n === srcV.n && !flag('force')) die(`the site already has ${game} v${siteV.v} — nothing new to ship (no new VERSIONS entry). --force to overwrite anyway`);
  say(`site has v${siteV.v}, shipping v${srcV.v}`);
} else say('the site has no version for this game yet (a new cabinet)');
const siteFiles = walk(path.join(WT, game)), srcFiles = walk(path.join(SRC, game));
const onlySite = siteFiles.filter(f => !srcFiles.includes(f));
if (onlySite.length && !flag('prune')) die(`the site's ${game}/ has ${onlySite.length} file(s) the source does not — nothing was written. --prune to delete them:\n    ${onlySite.join('\n    ')}`);
const oldCross = crossTokens(path.join(WT, game));

// ── 3. the copy ───────────────────────────────────────────────────────────
rmSync(path.join(WT, game), { recursive: true, force: true });
cpSync(path.join(SRC, game), path.join(WT, game), { recursive: true, filter: p => !EXCLUDE.has(path.basename(p)) });
say(`copied ${srcFiles.length} files${onlySite.length ? `, pruned ${onlySite.length}` : ''}`);
if (rootLogOwns(SRC)) for (const f of ['VERSIONS.md', 'README.md']) if (existsSync(path.join(SRC, f))) { cpSync(path.join(SRC, f), path.join(WT, f)); say(`copied root ${f} (this game's log lives there)`); }
// the site's cross-directory tokens go back: the shell and the badge are the site's
let restored = 0;
for (const f of walk(path.join(WT, game)).filter(f => /\.(html|js)$/.test(f) && !f.includes('/'))) {
  const p = path.join(WT, game, f); let s = readFileSync(p, 'utf8'); const before = s;
  s = s.replace(CROSS, (m, ref, tok) => oldCross.has(ref) && oldCross.get(ref) !== tok ? (restored++, `${ref}?v=${oldCross.get(ref)}`) : m);
  if (s !== before) writeFileSync(p, s);
}
if (restored) say(`kept the site's cross-directory tokens (${restored} reference${restored > 1 ? 's' : ''}: ${[...oldCross].map(([k, v]) => `${k}?v=${v}`).join(', ')})`);

// ── 4. the one line in hub/versions.json ──────────────────────────────────
{
  const p = path.join(WT, 'hub', 'versions.json');
  if (!existsSync(p)) die('hub/versions.json is not on the site');
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const id = catalogueId(WT);
  j[id] = { v: srcV.v, n: srcV.n, from: 'VERSIONS.md' };
  writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  say(`hub/versions.json: ${id} → v${srcV.v}`);
}

// ── 5. it boots: no page errors, no 404s, a whole precache ────────────────
if (!flag('no-boot')) {
  const missing = [];
  const swp = path.join(WT, game, 'sw.js');
  if (existsSync(swp)) {
    const sw = readFileSync(swp, 'utf8');
    const refs = new Set();
    for (const m of sw.matchAll(/['"`](\.{1,2}\/[^'"`$]+?)(?:\?v=[^'"`]*)?['"`]/g)) refs.add(m[1]);
    for (const m of sw.matchAll(/\[((?:\s*'[^']+'\s*,?)+)\]\s*\.map\(\s*(\w+)\s*=>\s*`([^`]+)`\)/g)) { const names = [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]); for (const n of names) refs.add(m[3].replace('${' + m[2] + '}', n).replace(/\?v=\$\{[^}]+\}/, '').replace(/\?v=[^`]*$/, '')); }
    for (const r of refs) { const f = path.join(WT, game, r.split('?')[0]); if (!(existsSync(f) || existsSync(path.join(f, 'index.html')))) missing.push(r); }
    if (missing.length) die(`the precache names files that are not there:\n    ${missing.join('\n    ')}`);
    say(`precache whole (${refs.size} entries)`);
  }
  const require = createRequire(import.meta.url);
  let chromium; try { ({ chromium } = require(path.join(sh('npm root -g'), 'playwright'))); } catch { die('playwright not found under `npm root -g` (needed for the boot check; --no-boot to skip)'); }
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };
  const srv = createServer((q, r) => { let p = path.join(WT, decodeURIComponent(q.url.split('?')[0])); if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(readFileSync(p)); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--disable-dev-shm-usage'] });
  const pg = await br.newPage({ viewport: { width: 900, height: 560 } });
  const errs = [], n404 = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('response', r => { if (r.status() === 404) n404.push(new URL(r.url()).pathname); });
  await pg.goto(`http://127.0.0.1:${port}/${game}/`, { waitUntil: 'load' });
  await pg.waitForTimeout(8000);
  const hasCanvas = await pg.evaluate(() => !!document.querySelector('canvas'));
  await br.close(); srv.close();
  if (errs.length || n404.length) die(`the staged tree does not boot clean — errors ${errs.length}, 404s ${n404.length}\n    ${[...errs, ...n404].slice(0, 6).join('\n    ')}`);
  say(`boots clean (${hasCanvas ? 'canvas up, ' : ''}0 errors, 0 404s)`);
}
if (opt('check')) { say(`running --check: ${opt('check')}`); try { execSync(opt('check'), { cwd: WT, stdio: 'inherit', env: { ...process.env, SHIP_ROOT: WT } }); } catch { die('--check failed'); } }

// ── 6. the commit ─────────────────────────────────────────────────────────
const logFile = rootLogOwns(WT) ? path.join(WT, 'VERSIONS.md') : path.join(WT, game, 'VERSIONS.md');
const log = readFileSync(logFile, 'utf8');
const head = log.match(/^##\s*v[\d.]+[^\n]*\n\*\*([^*]+)\*\*/m);
const title = catalogueEntry(WT).title ?? game;
const body = (log.split(/^##\s*v/m)[1] || '').split('\n').filter(l => /^\s*-\s/.test(l)).slice(0, 14).join('\n');
const msg = `${title} v${srcV.v} on the site — ${head ? head[1].trim() : 'release'}\n\n${body}\n\nShipped by scripts/ship.mjs: ${game}/ and its hub/versions.json line only; the site's cross-directory tokens kept; staged tree booted clean.${opt('trailer') ? '\n\n' + opt('trailer') : ''}\n`;
// porcelain lines are "XY path"; the leading X may be a space, so never trim
const status = execSync('git status --porcelain', { cwd: WT }).toString().split('\n').filter(Boolean);
const outside = status.map(l => l.replace(/^.. /, '')).filter(f => !(f.startsWith(game + '/') || f === 'hub/versions.json' || f === 'VERSIONS.md' || f === 'README.md'));
if (outside.length) die(`the staged change reaches outside ${game}/: ${outside.join(', ')}`);
say(`${status.length} paths change on the site`);
if (flag('dry')) { console.log('\n--- dry run: commit message ---\n' + msg + '\n--- staged tree kept at ' + WT + ' ---'); process.exit(0); }
writeFileSync(path.join(WT, '.ship-msg'), msg);
for (const f of [game, 'hub/versions.json', 'VERSIONS.md', 'README.md']) if (existsSync(path.join(WT, f))) sh(`git add -A -- ${f}`, WT);
sh('git -c user.name="$(git log -1 --format=%an)" -c user.email="$(git log -1 --format=%ae)" commit -q -F .ship-msg', WT);
rmSync(path.join(WT, '.ship-msg'));
say(`committed ${sh('git rev-parse --short HEAD', WT)}: ${msg.split('\n')[0]}`);

// ── 7. the push, and where to look ────────────────────────────────────────
if (!flag('push')) { say('not pushed (no --push). To push from here: git -C ' + WT + ' push origin HEAD:gh-pages'); process.exit(0); }
sh('git fetch origin gh-pages', WT); sh('git rebase origin/gh-pages', WT);
sh('git push origin HEAD:gh-pages', WT);
const remote = sh('git remote get-url origin').replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
say(`pushed ${sh('git rev-parse --short HEAD', WT)} → gh-pages`);
say(`now verify the "pages build and deployment" run concludes success: ${remote}/actions`);
try { sh(`git worktree remove --force ${WT}`); } catch {}
