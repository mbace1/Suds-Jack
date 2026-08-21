#!/usr/bin/env node
/**
 * Did the thing that went to gh-pages actually survive the trip?
 *
 *   node test/deploy-check.cjs                       # every in-repo cabinet
 *   node test/deploy-check.cjs piritori/             # one of them
 *   node test/deploy-check.cjs --root /tmp/ghp       # against a worktree
 *   node test/deploy-check.cjs --root /tmp/ghp piritori/ toko-move/
 *
 * WHY THIS EXISTS. The per-game gates prove a game works IN ITS OWN TREE. They
 * cannot see the four ways a deploy breaks a working game, because every one of
 * them is about the difference between this branch and the site:
 *
 *   · a file that was not copied — `assets/` is a build directory and does not
 *     ship, `test/` and `art-src/` are excluded on purpose, and it is very easy
 *     to exclude one folder too many;
 *   · a `?v=` token pointing at a URL the site does not have;
 *   · the HOME button, which loads `../hub/shell.js` from the SITE root at the
 *     SITE's token — a game deployed carrying its branch's number gets no HOME
 *     button and nothing else notices;
 *   · a path that is right on a domain root and wrong under /Suds-Jack/.
 *
 * All four are 404s or console errors, and all four are invisible until
 * something loads the deployed bytes. So: serve the tree, open each cabinet,
 * watch the network and the console.
 *
 * Run it against the gh-pages worktree BEFORE pushing:
 *
 *   git worktree add /tmp/ghp origin/gh-pages --detach
 *   ...copy the game in...
 *   node test/deploy-check.cjs --root /tmp/ghp piritori/
 *
 * It is deliberately shallow — boot, look, click nothing. A deploy check that
 * plays the game is a per-game gate with a slower start-up, and this one has to
 * stay cheap enough to run on every push.
 *
 * TWO THINGS IT MUST NOT CALL A FAILURE, both learned by writing it wrong:
 *
 *   · The site is served from /Suds-Jack/, not from a domain root. Kindling
 *     ships root-absolute paths like /Suds-Jack/kindling/assets/index-HASH.js,
 *     which are correct live and 404 the moment you serve the tree at `/`.
 *     So the tree is mounted at BOTH — a cabinet is opened under the real
 *     prefix and a bare path still resolves.
 *   · Half these games load three.js from jsDelivr. In a sandbox with an egress
 *     proxy those come back ERR_TUNNEL_CONNECTION_FAILED, which is the network
 *     this check is running in and says nothing about the deploy. Only
 *     SAME-ORIGIN failures fail; cross-origin ones are counted and printed, so
 *     a game that genuinely needs the CDN is visible rather than silently
 *     tolerated.
 *
 * (github.io is blocked outbound from the agent sandboxes, so serving the
 * worktree is the check. Confirming the real URL is the owner's.)
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const rootIdx = argv.indexOf('--root');
const ROOT = rootIdx >= 0 ? path.resolve(argv[rootIdx + 1]) : path.resolve(__dirname, '..');
// `rootIdx + 1` is only a flag VALUE when the flag is actually present — with
// no --root, rootIdx is -1 and this silently swallowed argv[0], so asking for
// one cabinet ran the whole floor and looked like it had worked.
const skip = rootIdx >= 0 ? rootIdx + 1 : -1;
const asked = argv.filter((a, i) => !a.startsWith('--') && i !== skip);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif',
  '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg',
};

let pass = 0, fail = 0;
const ok = (n, c, d) => {
  c ? (pass++, console.log('  ok   ' + n))
    : (fail++, console.log('  FAIL ' + n + (d ? '\n         ' + d : '')));
};

// The catalogue is the list of cabinets, so a game added to the floor is
// checked without anybody remembering to add it here. `inRepo` marks the ones
// this branch carries; `live: false` marks a cabinet with nothing behind it.
async function cabinets() {
  const mod = await import('file://' + path.join(ROOT, 'hub', 'games.js'));
  const all = mod.GAMES ?? mod.default ?? [];
  return all.filter(g => g.inRepo && g.live !== false && g.path);
}

// The live site lives under /Suds-Jack/. Mount the tree there AND at the root,
// so a root-absolute path written for the real URL resolves and a relative one
// still does too.
const PREFIX = '/Suds-Jack';

const serve = () => new Promise(res => {
  const s = http.createServer((req, r) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel.startsWith(PREFIX + '/') || rel === PREFIX) rel = rel.slice(PREFIX.length) || '/';
    let p = path.join(ROOT, rel);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end('no'); }
    r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(r);
  });
  s.listen(0, '127.0.0.1', () => res({ s, base: 'http://127.0.0.1:' + s.address().port }));
});

(async () => {
  console.log(`\ndeploy check — ${ROOT}\n`);
  const all = await cabinets();
  const list = asked.length
    ? all.filter(g => asked.some(a => g.path.replace(/\/$/, '') === a.replace(/\/$/, '')))
    : all;
  if (!list.length) {
    console.error(asked.length ? `no cabinet matches ${asked.join(', ')}` : 'no cabinets found');
    process.exit(1);
  }

  const { s, base } = await serve();
  const b = await chromium.launch();

  for (const g of list) {
    console.log(`\n${g.id}  (${g.path})\n`);
    const p = await b.newPage({ viewport: { width: 390, height: 820 } });
    const errs = [], bad = [], offsite = new Set();
    const mine = u => u.startsWith(base);
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => {
      if (m.type() !== 'error') return;
      // the console message for a blocked CDN fetch carries no URL, so it
      // cannot be attributed — the requestfailed handler already counted it
      if (/Failed to load resource/.test(m.text())) return;
      errs.push('console: ' + m.text());
    });
    p.on('requestfailed', r => (mine(r.url())
      ? bad.push('failed  ' + r.url().replace(base, ''))
      : offsite.add(new URL(r.url()).host)));
    p.on('response', r => {
      if (r.status() < 400) return;
      mine(r.url())
        ? bad.push(r.status() + '  ' + r.url().replace(base, ''))
        : offsite.add(new URL(r.url()).host);
    });

    const resp = await p.goto(base + PREFIX + '/' + g.path).catch(() => null);
    ok('the page is there', !!resp && resp.status() === 200, resp ? `HTTP ${resp.status()}` : 'no response');
    // long enough for a module graph, an importmap and the first frame; short
    // enough that twelve cabinets do not take a coffee break
    await p.waitForTimeout(2600);

    ok('nothing on the site 404s', bad.length === 0, bad.slice(0, 6).join('\n         '));
    if (offsite.size) console.log(`  --   needs the network: ${[...offsite].join(', ')}`);
    ok('no console or page errors', errs.length === 0, errs.slice(0, 4).join('\n         '));

    // the HOME button is the one thing that is about the SITE rather than the
    // game: shell.js is loaded from the site root at the site's own token, so a
    // cabinet deployed carrying its branch's number silently loses it
    const home = await p.evaluate(() => !!document.querySelector('a.arcade-home'));
    const tag = await p.evaluate(() =>
      (document.querySelector('script[src*="hub/shell.js"]') || {}).src || '');
    ok(`the HOME button is on the page${tag ? ` (${tag.split('/').pop()})` : ''}`, home);

    // Something was actually painted. A cabinet that boots to a blank page
    // passes every check above.
    //
    // Not askable when the CDN was unreachable: a game whose whole renderer is
    // an unfetched three.js draws nothing, and that is this network's fault
    // rather than the deploy's. Skltr is the one that fails it here. Say so and
    // move on — asserting what you cannot observe is how a gate starts lying.
    if (offsite.size) {
      console.log('  --   cannot judge the first frame without the network');
    } else
    ok('and there is something on it', await p.evaluate(() => {
      const t = (document.body.innerText || '').trim();
      if (t.length > 12) return true;
      return [...document.querySelectorAll('canvas')].some(c => {
        if (!c.width || !c.height) return false;
        try {
          const d = c.getContext('2d')?.getImageData(0, 0, c.width, c.height).data;
          if (!d) return true;                 // webgl — cannot read it, assume drawn
          const first = `${d[0]},${d[1]},${d[2]}`;
          for (let i = 4; i < d.length; i += 4) {
            if (`${d[i]},${d[i + 1]},${d[i + 2]}` !== first) return true;
          }
          return false;
        } catch { return true; }               // tainted canvas is a drawn canvas
      });
    }));

    await p.close();
  }

  await b.close(); s.close();
  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
