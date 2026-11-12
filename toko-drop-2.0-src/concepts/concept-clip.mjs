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
  t.nointro = true; t.capPlay((w) => think(w, mem, SKILLS.expert), 5152); await t.room(ROOM);
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
await browser.close();
console.log('done');
