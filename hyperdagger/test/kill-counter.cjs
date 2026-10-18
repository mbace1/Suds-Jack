// HD-008 — the kill counter stays up for the whole run, in every season and
// in a free run, on a phone-sized viewport (portrait and landscape).
//
// 12 Oct playtest: "0 kills" showed before a run and vanished during seasons
// 1 and 2 — index.html's active-frame rule hid #kills under body.in-run.
// Each run here is STARTED through the menu (the season button, or a click on
// the empty menu for a free run); the debug hooks only set up: freeze the
// director, keep the player alive, spawn a skull and kill it. Then the HUD
// must read "1 kills", be on screen, and not sit under the HOME button, the
// pause button or the clock.
//
//   NODE_PATH=…/node_modules node hyperdagger/test/kill-counter.cjs
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d ? ' → ' + d : ''))); };

const VIEWS = [
  { name: 'phone portrait', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'phone landscape', width: 844, height: 390, isMobile: true, hasTouch: true },
];
// season id → how the run is started. 'season' presses that season's tab,
// then START (HD-019); 'menu' presses START on what the menu holds. VOID (the
// control season) has no tab, so the hook selects it and START starts it; the
// free run is START on a fresh menu with RUN: FREE.
const RUNS = [['void', 'menu'], ['ember', 'season'], ['inca', 'season'], ['haul', 'season'], ['free', 'menu']];

srv.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    for (const v of VIEWS) {
      for (const [id, how] of RUNS) {
        const label = `${v.name} · ${id === 'free' ? 'free run' : id}`;
        const ctx = await b.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.isMobile, hasTouch: v.hasTouch });
        const p = await ctx.newPage();
        const errs = [];
        p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
        await p.addInitScript(() => {
          localStorage.setItem('hyperDaggerSeenTips', '1');
          localStorage.setItem('hyperDaggerRunKind', 'free');
        });
        await p.goto(base + '/hyperdagger/index.html?assets=0');
        await p.waitForFunction(() => window.__hd && window.__hd.debug && document.querySelector('#msg'), null, { timeout: 30000 });
        const before = await p.evaluate(() => {
          const k = document.getElementById('kills');
          return { text: k.textContent, shown: getComputedStyle(k).display !== 'none' };
        });
        // HD-019: the menu wears no HUD. The counter is the run's, and "0 kills"
        // over a season you have not started said nothing
        ok(`${label}: the menu shows no counter`, !before.shown, JSON.stringify(before));
        // HD-019: a season tab picks the season and START underneath starts
        // it; VOID has no tab, so the hook selects it and START starts it
        if (how === 'season') await p.locator(`#msg button.mn-season[data-season="${id}"]`).dispatchEvent('pointerdown');
        else if (id !== 'free') await p.evaluate(sid => window.__hd.debug.setSeason(sid), id);
        // a finger on START, as on the phone these views are: a mouse click
        // asks for the pointer lock, and a locked pointer halves the software
        // renderer's frame rate in headless Chromium (measured: ~400 ms a frame
        // against ~200), which is the harness and not the game
        {
          const box = await p.locator('#startBtn').boundingBox();
          if (box) await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          else await p.evaluate(() => window.__hd.debug.startGame());
        }
        await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing'
          && document.body.classList.contains('in-run'), null, { timeout: 15000 });
        const kill = await p.evaluate(async () => {
          const d = window.__hd.debug;
          d.freezeDirector(true); d.setInvulnerable(true);
          const frames = n => new Promise(r => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
          await frames(3);
          // a fresh run starts at zero, whatever the director spawned so far
          const zero = document.getElementById('kills').textContent;
          // two skulls, one killed: the other stays alive, so the HUD has to
          // keep updating with an enemy on the field (main threw in the
          // threat vignette whenever one was, before the counter's line ran)
          const sk = d.spawnSkull(); d.spawnSkull();
          await frames(2);
          d.killEnemy(sk, 0, -1);
          await frames(4);
          const el = document.getElementById('kills');
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const rect = q => { const e = document.querySelector(q); if (!e || getComputedStyle(e).display === 'none') return null; const x = e.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom }; };
          return {
            zero, text: el.textContent, display: cs.display, visibility: cs.visibility,
            opacity: +cs.opacity, kills: { l: r.left, t: r.top, r: r.right, b: r.bottom },
            vw: innerWidth, vh: innerHeight, state: d.getState().state,
            others: { home: rect('.arcade-home'), toko: rect('.arcade-toko'), pause: rect('#pauseBtn'), timer: rect('#timer') },
          };
        });
        const k = kill.kills;
        ok(`${label}: counter visible mid-run`,
          kill.state === 'playing' && kill.display !== 'none' && kill.visibility === 'visible' && kill.opacity >= 0.5
          && k.r - k.l > 10 && k.b - k.t > 5, JSON.stringify(kill));
        ok(`${label}: counter shows 1 after one kill`, /^1 kills\b/.test(kill.text), `${kill.zero} → ${kill.text}`);
        ok(`${label}: counter fits the viewport`, k.l >= 0 && k.t >= 0 && k.r <= kill.vw && k.b <= kill.vh, JSON.stringify(k));
        const hit = Object.entries(kill.others).filter(([, o]) => o && o.r - o.l > 0
          && !(k.r <= o.l || k.l >= o.r || k.b <= o.t || k.t >= o.b)).map(([n]) => n);
        ok(`${label}: counter clashes with nothing in the HUD`, hit.length === 0, hit.join(', ') + ' ' + JSON.stringify(kill.others));
        ok(`${label}: no page errors`, errs.length === 0, errs.slice(0, 3).join(' | '));
        await ctx.close();
      }
    }
  } finally {
    await b.close(); srv.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
