// THE QUIET MAP, IN THE PAGE (v2.60). With a parcel in hand the board says
// which lines are YOURS: every vehicle that keeps a badge is on one of them (or
// is the lit one, or the one you are on), every other vehicle is a faint dot,
// and the lines themselves are drawn with the same focus. With nothing in
// focus, nothing is dimmed — the old board, exactly.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/quiet.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); } };

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  try {
    await page.goto(`${base}/toko-move/?shift=3&day=none`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.rival && !document.getElementById('play').disabled, null, { timeout: 30000 });
    await page.tap('#play'); await page.waitForTimeout(400);
    await page.tap('#jobBoard .jobOffer:not([disabled])');
    await page.waitForFunction(() => (window.__tm.focusLines?.() || new Set()).size > 0, null, { timeout: 8000 }).catch(() => {});
    // what the frame actually drew, caught on its next call
    const read = () => page.evaluate(async () => {
      const tm = window.__tm, T = tm.transit, real = T.draw.bind(T); let focus = null;
      T.draw = (ctx, w, h, o) => { focus = o?.focus || null; return real(ctx, w, h, o); };
      await new Promise(r => setTimeout(r, 500)); T.draw = real;
      const foc = [...(tm.focusLines?.() || [])], lit = new Set((tm.catchables?.() || []).map(k => k.vehicle.id)), sel = tm.liveNetwork.selectedVehicleId;
      const badges = (tm.liveNetwork.lastBadges || []).map(b => ({ line: b.line, id: b.id })), dots = tm.liveNetwork.lastDots || [];
      const layers = T.layers.filter(l => l.visible && l.path?.length > 1), hot = focus ? layers.filter(focus).map(l => l.name) : [];
      return { foc, badges, stray: badges.filter(b => !foc.includes(b.line) && !lit.has(b.id) && b.id !== sel), faint: dots.filter(d => d.faint).length, dots: dots.length, hot, layers: layers.length };
    });
    const q = await read();
    ok(`a parcel in hand puts lines in focus (${q.foc.filter(x => !/^\d{3,}/.test(x)).join(', ')})`, q.foc.length > 0);
    ok(`the lines are drawn with that focus (${q.hot.length} of ${q.layers} at full strength)`, q.hot.length > 0 && q.hot.length < q.layers / 2 && q.hot.every(n => q.foc.includes(n)));
    ok(`every badge on the board is yours, lit, or your ride (${q.badges.length} badges, ${q.stray.length} strays)`, q.badges.length > 0 && q.stray.length === 0, JSON.stringify(q.stray.slice(0, 4)));
    ok(`everything else is a faint dot (${q.faint} of ${q.dots})`, q.faint > 10);
    // nothing in focus: the old board, exactly
    const off = await page.evaluate(async () => { const tm = window.__tm, keep = tm.focusLines; tm.focusLines = () => new Set();
      await new Promise(r => setTimeout(r, 500)); const dots = tm.liveNetwork.lastDots || [], faint = dots.filter(d => d.faint).length; tm.focusLines = keep; return { faint, badges: (tm.liveNetwork.lastBadges || []).length }; });
    ok(`with nothing in focus nothing is dimmed (${off.faint} faint, ${off.badges} badges)`, off.faint === 0 && off.badges >= q.badges.length);
    ok(`no page errors (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  quiet: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
