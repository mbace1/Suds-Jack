// THE SEALED PARCEL, PLAYED (v2.71, NARRATIVE-TWISTS.md §1). A player who takes
// the sealed offer on the second dispatch by tapping it, answers its card by
// tapping, and then plays the way test/stranger.cjs plays — CATCH when it
// lights, GET OFF when it lights. No debug hook moves them.
//
// It holds, on the screen:
//   · the second dispatch offers one parcel with no stop, only a family to ride
//   · taken, the stop is SEALED in the panel and in every name the game gives
//     it, and the board draws no flag for it, until it opens
//   · it opens ABOARD the family the label named (or at once, at the kiosk)
//   · delivered, the notebook gains a line: on the end card, and on the title
//     card the next time the game is opened
//
//   NODE_PATH=$(npm root -g) node toko-move/test/sealed.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); } };
const boot = async (page, url) => {
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 });
};

// What the screen offers, and what the sealed job is doing.
const look = () => {
  const vis = e => e && !e.disabled && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
  const q = sel => [...document.querySelectorAll(sel)].filter(vis), tm = window.__tm, ch = tm.challenge;
  const j = [ch.active, ch.queued].find(x => x?.sealed) || null, dest = j ? (j.originalStops?.[1] || j.stops[j.stops.length - 1]) : null;
  const real = dest ? tm.city.nodes.find(n => n.id === dest)?.name : null;
  const st = tm.mobility.status(), layer = st?.kind === 'riding' ? tm.liveNetwork?.vehicle?.(st.ride?.vehicleId)?.layer?.name : null;
  const out = { tick: tm.flow.clock.tick, index: ch.index, target: ch.target, sealed: j ? { family: j.sealed.family, revealed: j.sealed.revealed, real, named: ch.name(dest), city: tm.city.nameOverride?.(dest) || null, sheetLeak: !j.sealed.revealed && !!real && document.getElementById('sheet').innerText.includes(real), riding: layer } : null, notes: tm.sealed?.notebook?.().length || 0 };
  const endVeil = document.getElementById('end'); if (endVeil && !endVeil.hidden) return { ...out, phase: 'end', title: document.getElementById('endTitle').textContent, endText: document.getElementById('endStats').innerText };
  const t = document.getElementById('title');
  if (t && !t.hidden && getComputedStyle(t).display !== 'none' && vis(document.getElementById('play'))) return { ...out, phase: 'title', sel: '#play' };
  const sealedOffer = q('#jobBoard .jobOffer:not([disabled])').find(b => /SEALED/.test(b.innerText));
  if (q('.eventCard button').length) return { ...out, phase: 'event', card: document.querySelector('.eventCard .evLine')?.textContent || '', buttons: q('.eventCard button').map(b => b.innerText.replace(/\s+/g, ' ')) };
  if (q('#getOff').length) return { ...out, phase: 'getoff', sel: '#getOff' };
  if (q('.catchChoice.lit').length) return { ...out, phase: 'catch', sel: '.catchChoice.lit:not([disabled])' };
  if (!ch.active && sealedOffer) return { ...out, phase: 'sealedOffer', offerText: sealedOffer.innerText.replace(/\s+/g, ' '), sel: `#jobBoard .jobOffer[data-id="${sealedOffer.dataset.id}"]` };
  if (!ch.active && q('#jobBoard .jobOffer:not([disabled])').length) return { ...out, phase: 'jobs', sel: '#jobBoard .jobOffer:not([disabled])' };
  const due = (tm.catchables?.().length || st?.kind === 'getoff' || tm.events?.pending || (!ch.active && (ch.offers || []).length));
  return { ...out, phase: 'wait', due: !!due };
};

async function play(page, { kiosk = false } = {}) {
  await page.evaluate(() => window.__tm.flow.clock.setPaused(true));
  const log = { offered: null, card: null, buttons: null, took: false, leaks: [], named: [], opened: null, end: null };
  let held = 0;
  for (let i = 0; i < 6000; i++) {
    const s = await page.evaluate(look);
    if (s.sealed) {
      if (s.sealed.sheetLeak) log.leaks.push(`t${s.tick} ${s.sealed.real}`);
      if (!s.sealed.revealed) log.named.push(`${s.sealed.named}|${s.sealed.city}`);
      if (s.sealed.revealed && !log.opened) log.opened = { tick: s.tick, riding: s.sealed.riding, family: s.sealed.family, index: s.index };
    }
    if (s.phase === 'end') { log.end = s; break; }
    if (s.phase === 'sealedOffer') { log.offered = s.offerText; log.took = true; }
    if (s.phase === 'event') {
      const sealedCard = /label says/.test(s.card);
      if (sealedCard) { log.card = s.card; log.buttons = s.buttons; }
      const sel = sealedCard && kiosk ? '.eventCard button:not([disabled]) >> nth=1' : '.eventCard button:not([disabled])';
      await page.locator(sel).first().tap({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(60); continue;
    }
    if (s.sel) { await page.tap(s.sel, { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(60); continue; }
    if (s.due && held++ < 8) { await page.waitForTimeout(80); continue; }
    held = 0;
    await page.evaluate(() => window.__tm.flow.runTicks(3));
  }
  return log;
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  try {
    // ── ride and watch
    for (const q of ['?shift=1', '?shift=2']) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
      await boot(page, `${base}/toko-move/${q}`);
      const log = await play(page);
      const L = `${q}:`;
      ok(`${L} the second dispatch offers a parcel with no stop, only a family ("${log.offered}")`, !!log.offered && /SEALED/.test(log.offered) && /ride the \S+/.test(log.offered));
      ok(`${L} taking it deals the card — "${log.card}" [${(log.buttons || []).join(' | ')}]`, /you'll know the stop/.test(log.card || '') && /^Ride the \S+ and watch \+0 s$/.test(log.buttons?.[0] || '') && /^Ask at the kiosk \+40 s$/.test(log.buttons?.[1] || ''));
      ok(`${L} until it opens the stop is SEALED in every name the game gives it (${[...new Set(log.named)].join(', ')})`, log.named.length > 0 && log.named.every(x => x === 'SEALED|SEALED'));
      ok(`${L} and the panel never names it (${log.leaks.length} leaks)`, !log.leaks.length, log.leaks.slice(0, 2).join(' | '));
      ok(`${L} it opens aboard the family the label named (${log.opened ? `aboard ${log.opened.riding}, family ${log.opened.family}` : 'never opened'})`, !!log.opened && !!log.opened.riding && log.opened.riding.replace(/[A-Z]+$/, '').replace(/^(\d+).*/, '$1') === log.opened.family.replace(/[A-Z]+$/, ''));
      const e = log.end;
      ok(`${L} the shift ends (${e ? `${e.title}, ${e.index}/${e.target}` : 'never'})`, !!e && e.index >= 2);
      ok(`${L} delivered, the notebook has its line, and the end card says it ("${(e?.endText || '').split('\n')[0]}")`, !!e && e.notes === 1 && /NOTEBOOK · .+ · /.test(e.endText));
      // the next time the game opens, the title card carries it
      await boot(page, `${base}/toko-move/${q}`);
      const t = await page.evaluate(() => ({ s: document.querySelector('.notebook summary')?.innerText || '', li: [...document.querySelectorAll('.notebook li')].map(l => l.innerText) }));
      ok(`${L} the title card keeps the notebook ("${t.s}": ${t.li[0] || ''})`, /NOTEBOOK · 1/.test(t.s) && t.li.length === 1);
      ok(`${L} no page errors`, !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // ── ask at the kiosk
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
      await boot(page, `${base}/toko-move/?shift=1`);
      const log = await play(page, { kiosk: true });
      ok(`kiosk: asking opens it at once, before any ride (${log.opened ? (log.opened.riding ? `aboard ${log.opened.riding}` : 'at the stop') : 'never'})`, !!log.opened && !log.opened.riding);
      ok(`kiosk: the shift still ends with the notebook line (${log.end?.notes})`, log.end?.notes === 1);
      ok('kiosk: no page errors', !errs.length, errs.slice(0, 2).join(' | '));
      await ctx.close();
    }
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  sealed: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
