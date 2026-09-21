// THE CITY-DAY BROWSER GATE (v2.42).
//
// city-day.mjs asks whether the four days are well formed and whether the names
// they use are real. This one asks the only question that actually matters, and
// it is the question v2.40's local-knowledge rule failed: IN THE RUNNING GAME,
// DOES THE DAY DO ANYTHING? A market whose premium drop is never offered, a
// crowd that never holds a tram and a Sunday whose walk is not shorter are all
// the same bug — a rule that reads beautifully in the module and never reaches
// the player. Every check here is driven through the shipping page.
//
//   NODE_PATH=$(npm root -g) node toko-move/test/days.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

// Play the shift headlessly through the real flow, collecting what the day did.
const probe = (page, ticks) => page.evaluate(async (ticks) => {
  const tm = window.__tm, ch = tm.challenge, mob = tm.mobility, flow = tm.flow;
  const out = { marketOffers: 0, marketValues: [], plainValues: [], heldCrowded: 0, heldOther: 0, walks: [], encounters: tm.events?.queue?.filter(e => e.kind === 'encounter').length || 0 };
  const crowded = new Set((tm.cityDirector?.layers?.() || []).map(l => l.id));
  const other = (tm.transit?.layers || []).filter(l => !crowded.has(l.id)).slice(0, 6);
  const seen = new Set();
  for (let t = 0; t < ticks; t++) {
    const st = mob.status?.();
    if (!ch.active) { const o = (ch.offers || [])[0]; if (o) ch.acceptOffer(o.id); }
    else if (st?.kind === 'getoff') mob.getOff();
    else if (st?.kind === 'waiting') {
      for (const off of (tm.alongOffers?.() || [])) {
        if (seen.has(off.id)) continue; seen.add(off.id);
        (off.market ? out.marketValues : out.plainValues).push(off.value);
        if (off.market) out.marketOffers++;
      }
      for (const w of (mob.walks?.() || [])) out.walks.push({ to: w.to, cost: w.cost });
      const { routeChoices } = globalThis.__tmRouteChoiceCore;
      const c = routeChoices(tm.city, ch.currentFrom(), ch.currentTo(), 3)[0];
      if (c) { const layer = tm.transit.layers.find(x => x.id === c.legs[0].line.sourceId);
        if (layer) { let bi = 0, bd = Infinity; const n = tm.city.resolved[c.legs[0].from];
          for (let i = 0; i < layer.path.length; i++) { const q = layer.path[i], d = (q[0] - n.lat) ** 2 + (q[1] - n.lon) ** 2; if (d < bd) { bd = d; bi = i; } }
          const near = tm.liveNetwork.nearestTo(layer, bi, flow.clock.tick, 2.2, null);
          if (near) mob.catchChoice(c, near.vehicle); } }
    }
    for (const id of crowded) { const l = tm.transit.layers.find(x => x.id === id); if (l && tm.liveNetwork.heldNow(l, flow.clock.tick)) { out.heldCrowded++; break; } }
    for (const l of other) if (tm.liveNetwork.heldNow(l, flow.clock.tick)) { out.heldOther++; break; }
    flow.runTicks(1);
  }
  out.fleet = tm.liveNetwork.vehicles.length;
  out.walkFactor = tm.walkFactor || 1;
  out.day = tm.cityDay?.id || 'none';
  out.shift = tm.shiftSeed;
  return out;
}, ticks);

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const errs = [];
  const open = async (q) => { const page = await browser.newPage({ viewport: { width: 820, height: 1180 } });
    page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
    await page.goto(`${base}/toko-move/${q}`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.mobility && window.__tm?.liveNetwork && globalThis.__tmRouteChoiceCore, null, { timeout: 30000 });
    return page; };
  try {
    // ── the announcement, before a single tick is played ──────────────────
    for (const id of ['match', 'market', 'helsinki', 'quiet']) {
      const page = await open(`?shift=1&day=${id}`);
      const card = await page.evaluate(() => ({ text: document.getElementById('dayCard')?.textContent || '',
        shiftNo: document.getElementById('shiftNo')?.textContent || '', day: window.__tm.cityDay?.id,
        name: window.__tm.cityDay?.name, visible: !document.getElementById('title').hidden }));
      ok(`${id}: the title card names the day before START SHIFT (${card.name})`,
        card.visible && card.day === id && card.text.includes(card.name), JSON.stringify(card).slice(0, 160));
      ok(`${id}: and says what it does`, card.text.length > card.name.length + 30, card.text.slice(0, 80));
      ok(`${id}: the shift has a number you could quote back (${card.shiftNo})`, /#\d+/.test(card.shiftNo));
      await page.close();
    }
    { const page = await open('?shift=1&day=none');
      const card = await page.evaluate(() => ({ text: document.getElementById('dayCard')?.textContent || '', day: window.__tm.cityDay }));
      ok('an ordinary day announces nothing', card.text === '' && card.day === null);
      await page.close(); }

    // ── the same shift number is the same day, twice ──────────────────────
    { const a = await open('?shift=4821'), b = await open('?shift=4821');
      const [x, y] = await Promise.all([a.evaluate(() => window.__tm.cityDay?.id), b.evaluate(() => window.__tm.cityDay?.id)]);
      ok(`shift #4821 is the same day every time (${x})`, x === y && !!x);
      const c = await open('?shift=4822');
      const z = await c.evaluate(() => ({ id: window.__tm.cityDay?.id, seed: window.__tm.shiftSeed }));
      ok('and a different number is its own shift', z.seed === 4822);
      await a.close(); await b.close(); await c.close(); }

    // ── what each day DOES, played ───────────────────────────────────────
    const ORDINARY = await (async () => { const page = await open('?shift=3&day=none');
      await page.click('#play'); const r = await probe(page, 900); await page.close(); return r; })();
    ok(`an ordinary day holds nothing (${ORDINARY.heldCrowded + ORDINARY.heldOther} ticks held)`, ORDINARY.heldCrowded + ORDINARY.heldOther === 0);
    ok(`an ordinary day offers no market drop (${ORDINARY.marketOffers})`, ORDINARY.marketOffers === 0);

    // MARKET is two claims and they are measured apart, because the first one
    // fires on every route and the second one only where the quarter is on it.
    { const page = await open('?shift=3&day=market'); await page.click('#play');
      const r = await probe(page, 2400); await page.close();
      const mine = r.marketOffers + r.plainValues.length, theirs = ORDINARY.marketOffers + ORDINARY.plainValues.length;
      ok(`MARKET: a market morning is more work — more drops on the same shift (${mine} against ${theirs})`, mine > theirs);
      ok('MARKET: a market morning still holds no trams', r.heldCrowded + r.heldOther === 0); }

    // The premium itself, driven through the real method with real pack stops
    // rather than waiting for a route that happens to pass Hakaniemi: the same
    // candidate list, priced by a challenge that has a market and one that does
    // not. A route-dependent claim asserted on one route is a coin toss.
    { const page = await open('?shift=3&day=market'); await page.click('#play');
      const r = await page.evaluate(() => { const tm = window.__tm, ch = tm.challenge;
        // alongOffers only answers a courier who is carrying something and
        // standing at a stop, which is the state the premium exists for.
        if (!ch.active) { const o = (ch.offers || [])[0]; if (o) ch.acceptOffer(o.id); }
        const stops = (tm.transit?.pack?.stops || []);
        const hak = stops.find(s => s.name === tm.market.name);
        const others = stops.filter(s => s.name !== tm.market.name).slice(0, 6);
        const between = [...others.slice(0, 3), hak, ...others.slice(3)].filter(Boolean)
          .map((s, i) => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon, pathIndex: i }));
        const cands = [{ line: { label: 'T' }, from: ch.currentFrom(), to: ch.currentTo(), between }];
        const was = ch.market;
        const withMk = ch.alongOffers(cands).map(o => ({ name: o.name, value: o.value, market: o.market }));
        ch.market = null; const without = ch.alongOffers(cands).map(o => ({ name: o.name, value: o.value, market: o.market }));
        // The SAME stop with the premium switched off: an ordinary day picks a
        // different stop entirely, so comparing the two lists compares two
        // different drops. Zeroing the bonus keeps the pick and removes only
        // the thing being measured.
        ch.market = { ...was, bonus: 0 };
        const flat = ch.alongOffers(cands).map(o => ({ name: o.name, value: o.value, market: o.market }));
        ch.market = was;
        return { withMk, without, flat, marketName: tm.market.name, quarter: !!hak }; });
      ok(`MARKET: the quarter is on the board (${r.marketName})`, r.quarter);
      const premium = r.withMk.find(o => o.market);
      ok(`MARKET: a drop in the quarter is flagged as one (${r.withMk.map(o => o.name + (o.market ? '*' : '')).join(', ')})`, !!premium);
      const plain = r.flat.find(o => o.name === premium?.name);
      ok('MARKET: and the same stop pays more than it would on an ordinary day',
        !!premium && !!plain && premium.value > plain.value, JSON.stringify({ premium, plain }).slice(0, 180));
      ok('MARKET: an ordinary day flags nothing', r.without.every(o => !o.market));
      await page.close(); }

    { const page = await open('?shift=3&day=match'); await page.click('#play');
      const r = await probe(page, 900);
      const strip = await page.evaluate(() => document.getElementById('cityDay')?.textContent || '');
      await page.close();
      ok(`MATCH: the crowded families really stand still (${r.heldCrowded} ticks held)`, r.heldCrowded > 0);
      ok(`MATCH: and the rest of the network keeps running (${r.heldOther} ticks held elsewhere)`, r.heldOther === 0);
      ok(`MATCH: the sheet carries the day (${strip.slice(0, 40)})`, /MATCH DAY/.test(strip)); }

    { const page = await open('?shift=3&day=helsinki'); await page.click('#play');
      const r = await probe(page, 300); await page.close();
      ok(`HELSINKI: the deck is wider (${r.encounters} encounters queued)`, r.encounters >= 4);
      ok('HELSINKI: and it is a day about people, not trams', r.heldCrowded === 0); }

    { const page = await open('?shift=3&day=quiet'); await page.click('#play');
      const r = await probe(page, 900); await page.close();
      ok(`QUIET: fewer trams than an ordinary day (${r.fleet} against ${ORDINARY.fleet})`, r.fleet < ORDINARY.fleet);
      ok(`QUIET: walking is quicker (×${r.walkFactor})`, r.walkFactor < 1);
      // The one that proves the compensation is real rather than a constant in
      // a module: the same walking link, measured through the game, is shorter.
      const cheap = (walks) => { const m = new Map(); for (const w of walks) m.set(w.to, Math.min(m.get(w.to) ?? Infinity, w.cost)); return m; };
      const a = cheap(ORDINARY.walks), b = cheap(r.walks);
      const shared = [...a.keys()].filter(k => b.has(k));
      ok(`QUIET: the same walk really is shorter on a Sunday (${shared.length} links compared)`,
        shared.length > 0 && shared.every(k => b.get(k) <= a.get(k)) && shared.some(k => b.get(k) < a.get(k)),
        shared.slice(0, 4).map(k => `${k} ${a.get(k)}→${b.get(k)}`).join(' ')); }

    ok(`no page errors across every day (${errs.length})`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { fail++; console.log(`  FAIL threw: ${e.message}`); }
  await browser.close(); server.close();
  console.log(`\n  city days: ${pass} passed, ${fail} failed  (${ROOT})`);
  process.exit(fail ? 1 : 0);
});
