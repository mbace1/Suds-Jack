// EERI — drive the level inspector the way a person does, and prove the edit
// LOOP closes: pick a prop, move it, and have the move survive as data.
//
//   NODE_PATH=$(npm root -g) node eeri/test/inspector.cjs
//
// WHY IT IS ITS OWN GATE. `dev-menu.mjs` reads the source and proves the
// inspector cannot reach into the game — no hooks in `main.js`, nothing about
// it in `js/menu.js`. That is a real check and it is static: it says the tool
// is wired safely, never that the tool WORKS. And `smoke.cjs` will not have
// it, because the inspector is deliberately not in the shipped page — it
// lives on `dev.html`, which frames `index.html` rather than copying it.
//
// What is actually at stake here is one claim: a prop moved in the inspector
// changes the ROW that drew it, so SAVE writes what is on screen. Before the
// rows existed a drag was a nice demo that died on reload. If the mesh and
// its row ever come apart — an async `cutout` losing its tag, a replay that
// forgets to stamp — the panel still looks completely fine and every saved
// sheet is silently wrong.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.css': 'text/css' };

let pass = 0, fail = 0;
const ok = (name, good, detail = '') => {
  if (good) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '\n       → ' + detail : '')); }
};

const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
  fs.readFile(f, (e, b) => e
    ? (r.writeHead(404), r.end())
    : (r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }), r.end(b)));
});

srv.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${srv.address().port}`;
  const br = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await br.newPage({ viewport: { width: 1100, height: 620 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));

  await page.goto(`${base}/eeri/dev.html?skip`, { waitUntil: 'load' });
  // dev.html FRAMES the game, so everything worth asserting is one frame down
  const game = await page.waitForFunction(() => {
    const f = document.querySelector('iframe');
    return f?.contentWindow?.__eeri?.debug ? true : null;
  }, null, { timeout: 60000 }).then(() => true).catch(() => false);
  ok('the dev page comes up with the game inside it', game);
  if (!game) { await br.close(); srv.close(); process.exit(1); }

  // stand in a world that HAS a dressing sheet
  await page.evaluate(() => document.querySelector('iframe').contentWindow.__eeri.debug.goSite(9));
  await page.waitForFunction(() => {
    const w = document.querySelector('iframe').contentWindow;
    return !w.__eeri.debug.transitioning();
  }, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(3500);

  ok('the pause menu carries the inspector row',
    await page.evaluate(() => !!document.querySelector('.insp')));

  // ---- the thing this file exists for --------------------------------
  const res = await page.evaluate(async () => {
    const doc = document;
    const w = doc.querySelector('iframe').contentWindow;
    const scene = w.__eeri.scene;
    // any replayed dressing mesh will do — it is the LINK being tested
    let mesh = null, group = null;
    scene.traverse((o) => {
      if (mesh || !o.isMesh || !o.userData?.row) return;
      for (let n = o; n; n = n.parent) if (n.userData?.rows) { mesh = o; group = n; return; }
    });
    if (!mesh) return { err: 'no replayed dressing mesh in the scene' };

    
    return { hasMesh: true, rowId: mesh.userData.row, rows: group.userData.rows.length };
  });
  ok('the site is drawn from a sheet, and its meshes carry their row ids',
    !res.err && res.hasMesh, res.err || '');
  ok(`the group holds the whole sheet (${res.rows} rows)`, res.rows > 20, JSON.stringify(res));

  // EVERY mesh, not one. The first cut of this check grabbed the first
  // tagged mesh it found and asserted on that, and passed with the tagging
  // for `panel` and `disc` deleted — because the one it happened to find was
  // a `cutout`, which tags by its own path (it finishes asynchronously, so it
  // captures the id rather than reading the live one). Two of the three
  // leaves could have shipped untagged behind a green gate. A row-less mesh
  // is a prop that can be dragged and never saved, so the count is the check.
  const tags = await page.evaluate(() => {
    const w = document.querySelector('iframe').contentWindow;
    let total = 0, tagged = 0;
    const kinds = {};
    w.__eeri.scene.traverse((o) => {
      if (!o.isMesh) return;
      let sheet = null;
      for (let n = o; n; n = n.parent) if (n.userData?.rows) { sheet = n; break; }
      if (!sheet) return;
      total++;
      if (o.userData.row) tagged++;
      else {
        const k = o.geometry?.type || '?';
        kinds[k] = (kinds[k] || 0) + 1;
      }
    });
    return { total, tagged, kinds };
  });
  ok(`every prop in the sheet can be traced back to its row (${tags.tagged}/${tags.total})`,
    tags.total > 20 && tags.tagged === tags.total,
    `untagged by geometry: ${JSON.stringify(tags.kinds)}`);

  // move a prop through the inspector's own code path and check the row moved
  const moved = await page.evaluate(() => {
    const doc = document;
    const w = doc.querySelector('iframe').contentWindow;
    const insp = window.__insp;
    if (!insp) return { err: 'no inspector handle exposed' };
    let mesh = null, group = null;
    w.__eeri.scene.traverse((o) => {
      if (mesh || !o.isMesh || !o.userData?.row) return;
      for (let n = o; n; n = n.parent) if (n.userData?.rows) { mesh = o; group = n; return; }
    });
    const row = group.userData.rows.find((r) => r.id === mesh.userData.row);
    const was = { x: row.x, y: row.y };
    insp.show();
    insp.select(mesh);
    mesh.position.x += 3.25;
    mesh.position.y -= 1.5;
    insp.syncRow();
    const now = { x: row.x, y: row.y };
    // and REVERT has to put the row back too, or undo is a lie
    insp.revert();
    const after = { x: row.x, y: row.y };
    return { was, now, after, home: !!mesh.userData.__inspHome };
  });

  ok('moving a prop writes the move into its row',
    !moved.err && Math.abs(moved.now.x - moved.was.x - 3.25) < 0.01
    && Math.abs(moved.now.y - moved.was.y + 1.5) < 0.01,
    JSON.stringify(moved));
  ok('…and REVERT puts the row back, not just the mesh',
    !moved.err && Math.abs(moved.after.x - moved.was.x) < 0.01
    && Math.abs(moved.after.y - moved.was.y) < 0.01,
    JSON.stringify(moved));

  ok('no page errors while driving the tool', errs.length === 0, errs.slice(0, 2).join(' | '));

  await br.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
