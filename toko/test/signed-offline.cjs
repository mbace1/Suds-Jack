// TOKO MIDORI — does a SIGNED game still boot with the network gone?
//
//   node toko/test/signed-offline.cjs <siteRoot> toko-drop hyperdagger radiofree
//
// NOT part of brand.cjs, and it cannot be: the service workers live only on
// the deployed tree (gh-pages), so this has to be pointed at a checkout of
// that branch rather than at this repo's root.
//
// The trap this checks: signature.js pulls in five more toko modules, and a
// worker that precaches only signature.js boots offline by silently going to
// the network for the rest — which looks fine on a warm connection and fails
// exactly where the offline promise was supposed to hold.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2];
const GAMES = process.argv.slice(3);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const serve = () => new Promise(r => {
  const s = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
      res.writeHead(404); return res.end('no');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => r({ s, port: s.address().port }));
});

(async () => {
  const { s, port } = await serve();
  const base = `http://127.0.0.1:${port}`;
  let fail = 0;
  for (const game of GAMES) {
    const ctx = await (await chromium.launch()).newContext();
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    // `?sw=1` because some games gate registration on https-or-that flag, so
    // dev and the gates never inherit a stale shell (gameoflife's rule).
    await p.goto(`${base}/${game}/index.html?sw=1`, { waitUntil: 'networkidle' });
    // wait for the worker to take control and finish precaching
    await p.waitForFunction(() => navigator.serviceWorker &&
      navigator.serviceWorker.controller !== null, null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(2500);

    const hits = [];
    await ctx.setOffline(true);
    p.on('requestfailed', r => hits.push(r.url()));
    await p.reload({ waitUntil: 'load' }).catch(e => errs.push('reload: ' + e.message));
    await p.waitForTimeout(2500);

    const state = await p.evaluate(() => {
      const c = document.querySelector('.toko-sign canvas, canvas.toko-sign, [class*="toko"] canvas');
      let ink = 0;
      if (c) {
        try {
          const g = c.getContext('2d');
          const d = g.getImageData(0, 0, c.width, c.height).data;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 8) ink++;
        } catch { /* tainted */ }
      }
      return { sign: !!document.querySelector('[class*="toko-sign"], .toko-signature'), ink,
        anyCanvas: document.querySelectorAll('canvas').length };
    });
    const bad = hits.filter(u => !/favicon|analytics/.test(u));
    const okOffline = bad.length === 0;
    console.log(`${game.padEnd(12)} offline-clean:${okOffline ? 'yes' : 'NO'}  ` +
      `signature:${state.sign ? 'yes' : 'no'}  badge-ink:${state.ink}  errs:${errs.length}`);
    if (bad.length) console.log('   went to the network:', [...new Set(bad)].slice(0, 6).join('\n     '));
    if (errs.length) console.log('   errors:', errs.slice(0, 3).join(' | '));
    if (!okOffline || !state.sign) fail++;
    await ctx.browser().close();
  }
  s.close();
  console.log(fail ? `\n${fail} game(s) not clean` : '\nall signed games boot offline with the badge');
})();
