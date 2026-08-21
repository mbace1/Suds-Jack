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

  // ---- LIGHTS -----------------------------------------------------------
  // `light` is the one row kind no builder emits, so nothing else in the
  // suite can see it. Three things have to hold and the last one cost an
  // afternoon.
  {
    const g = await page.evaluate(() => {
      const E = document.querySelector('iframe').contentWindow.__eeri;
      let lights = 0, handles = 0, visible = 0, weakest = Infinity, shortest = Infinity;
      E.scene.traverse((o) => {
        if (o.isPointLight) {
          lights++;
          weakest = Math.min(weakest, o.intensity);
          shortest = Math.min(shortest, o.distance);
        }
        if (o.userData?.lightHandle) { handles++; if (o.visible) visible++; }
      });
      return { lights, handles, visible, weakest, shortest };
    });
    ok(`the sheet's light rows become real lights (${g.lights})`, g.lights > 0);
    ok(`each light has a handle to grab (${g.handles})`, g.handles === g.lights);
    // …and here they are SHOWN, because this test opened the inspector several
    // steps ago and that is what opening it does. The other half of the claim
    // — that the shipped game never draws a wireframe ball over a lamp — is
    // not checkable on this page for exactly that reason, so it lives in
    // `smoke.cjs`, which loads `index.html` and never opens anything.
    ok(`…and the inspector has revealed them (${g.visible}/${g.handles})`,
      g.visible === g.handles);
    // THE UNITS TRAP, and it is why this is a number rather than a boolean.
    // three.js has been physically based since r155: a PointLight's intensity
    // is candela falling off as 1/d^2, while this scene's DirectionalLight
    // (1.35) and HemisphereLight (1.25) are in units that do not. The first
    // five lights were authored at 2.2 — directional-sized — and off, 2.2 and
    // even 90 were indistinguishable in a screenshot. A light nobody can see
    // is not a dim light; it is a bug that renders perfectly.
    ok(`no light is authored in directional units (weakest ${g.weakest}cd)`,
      g.weakest >= 40, 'under ~40cd a PointLight is invisible at these distances');
    // …and it has to REACH. A lamp six units up whose distance stops at 12
    // never gets to the floor the game is played on.
    ok(`every light reaches the floor (shortest ${g.shortest} units)`, g.shortest >= 16);
  }

  // ---- PLACING ------------------------------------------------------------
  // The whole point of the sheet being data: a click adds a ROW, the room
  // rebuilds from rows, and what is on screen is what SAVE would write. This
  // drives it the way a hand would — choose a band, choose an asset, click.
  {
    const before = await page.evaluate(() => {
      const w = document.querySelector('iframe').contentWindow;
      let n = 0; w.__eeri.scene.traverse((o) => { if (o.userData?.rows) n = o.userData.rows.length; });
      return n;
    });
    const placed = await page.evaluate(async () => {
      const doc = document;
      const insp = doc.querySelector('.insp');
      const q = (k) => insp.querySelector(`[data-el="${k}"]`);
      // PLACE mode, back1 band, the first cutout in the list
      insp.querySelector('[data-a="place"]').click();
      q('band').value = 'back1';
      const assetSel = q('asset');
      const idx = [...assetSel.options].findIndex((o) => /cutout/.test(o.textContent));
      assetSel.value = String(idx);
      const c = doc.querySelector('.inspCatch');
      const r = c.getBoundingClientRect();
      const at = { clientX: r.left + r.width * 0.45, clientY: r.top + r.height * 0.55 };
      c.dispatchEvent(new PointerEvent('pointerdown', { ...at, bubbles: true, pointerId: 1 }));
      c.dispatchEvent(new PointerEvent('pointerup', { ...at, bubbles: true, pointerId: 1 }));
      await new Promise((res) => setTimeout(res, 60));
      const w = document.querySelector('iframe').contentWindow;
      let rows = null; w.__eeri.scene.traverse((o) => { if (o.userData?.rows) rows = o.userData.rows; });
      const last = rows && rows[rows.length - 1];
      return { n: rows ? rows.length : 0, last, out: q('out').textContent };
    });
    ok(`PLACE adds a row to the sheet (${before} -> ${placed.n})`, placed.n === before + 1,
      JSON.stringify(placed.out));
    // SNAPPED TO THE BAND, which is the owner's call: depth is the band's, not
    // the pointer's. back1 is -1.20.
    ok(`…at the band's own depth, not the pointer's (z ${placed.last?.z})`,
      placed.last && Math.abs(placed.last.z - (-1.20)) < 1e-6, JSON.stringify(placed.last));
    // …and on the half-tile grid
    ok('…snapped to the half-tile grid',
      placed.last && Math.abs(placed.last.x * 2 - Math.round(placed.last.x * 2)) < 1e-6
      && Math.abs(placed.last.y * 2 - Math.round(placed.last.y * 2)) < 1e-6,
      JSON.stringify(placed.last));
    // the row has to have actually BUILT something, or it is a row nobody drew
    await page.waitForTimeout(900);
    const drew = await page.evaluate((id) => {
      const w = document.querySelector('iframe').contentWindow;
      let hit = 0; w.__eeri.scene.traverse((o) => { if (o.userData?.row === id) hit++; });
      return hit;
    }, placed.last?.id);
    ok(`…and the room rebuilt with it in (${drew} mesh)`, drew > 0);

    // THE SIZE SLIDER, which runs AFTER the snap — the owner's shape for this:
    // the band decides depth, the hand decides scale. It edits the selected
    // row, so the thing just placed has to be picked first.
    const sized = await page.evaluate(async (id) => {
      const doc = document;
      const w = doc.querySelector('iframe').contentWindow;
      let mesh = null; w.__eeri.scene.traverse((o) => { if (o.userData?.row === id) mesh = o; });
      const insp = doc.querySelector('.insp');
      const q = (k) => insp.querySelector(`[data-el="${k}"]`);
      let rows = null; w.__eeri.scene.traverse((o) => { if (o.userData?.rows) rows = o.userData.rows; });
      const row = rows.find((r) => r.id === id);
      const before = row.h;
      // select it the way a click would, then move the slider for real
      window.__insp.picked = mesh;
      q('size').value = '3.5';
      q('size').dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise((res) => setTimeout(res, 60));
      let rows2 = null; w.__eeri.scene.traverse((o) => { if (o.userData?.rows) rows2 = o.userData.rows; });
      const after = rows2.find((r) => r.id === id).h;
      return { before, after, label: q('sizeVal').textContent };
    }, placed.last?.id);
    ok(`the size slider resizes the placed row (h ${sized.before} -> ${sized.after})`,
      Math.abs(sized.after - 3.5) < 1e-6 && sized.after !== sized.before,
      JSON.stringify(sized));
    ok(`…and says what it did (${sized.label})`, sized.label === '3.50');

    // DUPLICATE and DELETE. A tool that adds but cannot remove makes every
    // mistake permanent, and the first thing anyone does with a placement tool
    // is place something wrong.
    // RE-SELECT AFTER EVERY REBUILD, AND WAIT A REAL FRAME. Each edit rebuilds
    // the room from rows, which throws away the mesh that was selected — so a
    // `picked` captured before the edit points into a detached graph and
    // `rowOf` walks up to nothing. The first cut of this waited 60ms between
    // clicks; at the ~3 fps this sandbox renders at, that is a fifth of a
    // frame, so nothing had rebuilt yet and every count came back unchanged.
    const pickFresh = async (id) => page.evaluate((rid) => {
      const w = document.querySelector('iframe').contentWindow;
      let mesh = null; w.__eeri.scene.traverse((o) => { if (o.userData?.row === rid) mesh = o; });
      window.__insp.picked = mesh;
      return !!mesh;
    }, id);
    const rowsNow = () => page.evaluate(() => {
      const w = document.querySelector('iframe').contentWindow;
      let r = null; w.__eeri.scene.traverse((o) => { if (o.userData?.rows) r = o.userData.rows; });
      return r ? r.map((x) => ({ id: x.id, x: x.x })) : [];
    });
    const clickA = async (a) => { await page.evaluate((sel) =>
      document.querySelector(`.insp [data-a="${sel}"]`).click(), a);
      await page.waitForTimeout(1200); };

    const id = placed.last.id;
    ok('the placed row is still selectable after its rebuild', await pickFresh(id));
    const start = (await rowsNow()).length;
    await clickA('dup');
    const afterDup = await rowsNow();
    const copy = afterDup[afterDup.length - 1];
    await pickFresh(id);
    await clickA('del');
    const afterDel = await rowsNow();
    const edits = { start, dup: afterDup.length, del: afterDel.length,
      copyX: copy.x, srcX: afterDup.find((r) => r.id === id)?.x,
      originalGone: !afterDel.some((r) => r.id === id),
      copyKept: afterDel.some((r) => r.id === copy.id) };
    ok(`DUPLICATE adds a copy (${edits.start} -> ${edits.dup})`, edits.dup === edits.start + 1);
    ok(`…offset a half tile so it is not hiding behind the original (${edits.srcX} -> ${edits.copyX})`,
      Math.abs(edits.copyX - edits.srcX - 0.5) < 1e-6, JSON.stringify(edits));
    ok(`DELETE removes the selected row (${edits.dup} -> ${edits.del})`,
      edits.del === edits.dup - 1 && edits.originalGone);
    ok('…and takes the right one — the copy survives', edits.copyKept);
  }

  ok('no page errors while driving the tool', errs.length === 0, errs.slice(0, 2).join(' | '));

  await br.close(); srv.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
