// the hell concept, a bot fighting in it (scratch, never shipped): node shot.mjs <tree> <room> <outPrefix> <times,comma s> [dsf=2] [w=390] [h=844]
import { createRequire } from 'module';
import { readFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, TREE, ROOM, OUT, TIMES = '0', DSF = '2', W = '390', H = '844'] = process.argv;
const V = readFileSync(`${process.env.S}/${TREE}/index.html`, 'utf8').match(/js\/main\.js\?v=(\d+)/)[1];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--mute-audio', '--no-proxy-server'] });
const page = await (await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: +DSF, isMobile: true, hasTouch: true })).newPage();
page.setDefaultTimeout(900000);
page.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 300)));
page.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text().slice(0, 300)); });
await page.goto(`http://127.0.0.1:8792/${TREE}/?nointro&lang=en`);
await page.waitForFunction(() => window.__toko && window.__toko.ready, null, { timeout: 600000, polling: 500 });
await page.waitForFunction(() => { const a = __toko.actors; return !!a.warmQueue && a.warmQueue.length === 0 && !a.warmHeld; }, null, { timeout: 900000, polling: 1000 });
await page.addStyleTag({ content: '#ver,#fault,#sticks,#fps{display:none!important}' });
const r = await page.evaluate(async ([ROOM, tree, V, ADV]) => {
  const t = __toko, { think, SKILLS, prng } = await import(`/${tree}/scripts/bot.mjs?v=${V}`);
  const mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(91) };
  // the bot, but when a vent near him is about to blow he walks onto it (to show a vent throwing the hero)
  const ride = (w) => {
    const base = think(w, mem, SKILLS.expert), h = w.hero;
    if (!w.vents || h.fly || !(+(window.__RIDE ?? 1))) return base;
    const P = w.ventSpec.period, v = w.vents.map((v) => ({ v, tb: (1 - v.s) * P, d: Math.hypot(v.x - h.x, v.z - h.z) })).filter((o) => o.tb < 2.8 && o.v.blew % 2 === 0 && o.d < o.tb * 6 + 1).sort((a, b) => a.d - b.d)[0]?.v;
    if (!v) return base;
    const dx = v.x - h.x, dz = v.z - h.z, d = Math.hypot(dx, dz) || 1;
    const tb = (1 - v.s) * w.ventSpec.period, hold = d < 0.6 && tb < 0.9;   // the last moment on it he holds his fire, so what comes for him goes up with him
    return { ...base, mx: d > 0.4 ? dx / d : 0, mz: d > 0.4 ? dz / d : 0, dash: false, fire: hold ? false : base.fire };
  };
  t.nointro = true; t.capPlay(ride, 5152); await t.room(ROOM);
  for (let i = 0; i < 150 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100));
  if (t.state !== 'play') return `${ROOM}: not playing (${t.state})`;
  t.advance(+(ADV)); t.loop(false); t.ui.bannerEl.hidden = true;
  return `${ROOM}: floor ${t.world.hx}x${t.world.hz} bodies ${t.world.gels.filter((g) => g.alive).length}`;
}, [ROOM, TREE, V, process.env.ADV ?? '1.5']);
console.log(r);
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });
const N = +(process.env.N ?? 270), B = +(process.env.BASE ?? 14);
for (let i = 0; i < 4; i++) await page.evaluate((s) => { __toko.capFrame(s); __toko.ui.bannerEl.hidden = true; }, B - (4 - i) / 30);
for (let i = 0; i < N; i++) {
  await page.evaluate((s) => { __toko.capFrame(s); }, B + i / 30);
  await page.screenshot({ path: `${OUT}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90, timeout: 300000 });
  if (i % 30 === 0) console.log('frame', i, new Date().toISOString().slice(11, 19));
}
console.log(await page.evaluate(() => JSON.stringify((__toko.world.vents || []).map((v) => ({ blew: v.blew, thrown: v.thrown })))));
await browser.close();
console.log('done');
