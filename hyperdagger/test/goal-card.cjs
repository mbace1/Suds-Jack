// HD-010 — every run opens with a one-line goal card that says the season's
// real rules, and it is gone again by ~2 s; the clock carries a label that
// says what the number is. Phone-sized viewports, portrait and landscape.
//
// 12 Oct playtest: the season clock counted down while the title still said
// "time is your only score", and season 3's "load 36 · +0s" said nothing.
// Each run is STARTED through the menu, as in test/kill-counter.cjs (#593).
// The card must not take input, must not cover the reticle (the viewport's
// centre), and must not sit on the clock, its label, HOME, pause, or the kill
// counter where #593 puts it (under the clock — the rule is injected here so
// the geometry is checked before #593 lands).
//
// main's player.pos throw (fixed in #591/#593/#594) fires while enemies are
// alive; the director is frozen at once and a "player.pos" page error is
// logged, not failed.
//
//   NODE_PATH=…/node_modules node hyperdagger/test/goal-card.cjs
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
// main runs a season under the SAVED mode (#591 fixes that), so the test saves
// the season's own mode first; the card follows the rules actually running.
const SEASON_MODE = { ember: 'hyper', inca: 'hyper', haul: 'truck' };
// [season, how it starts, expected card, expected clock label (regex)]
const RUNS = [
  ['void', 'menu', 'SURVIVE THE SWARM · ONE TOUCH KILLS', /^TIME SURVIVED$/],
  ['ember', 'season', 'SURVIVE THE CLOCK · KILLS BUY TIME', /^YOUR LIFE · KILLS ADD TIME$/],
  ['inca', 'season', 'SURVIVE THE CLOCK · KILLS BUY TIME', /^YOUR LIFE · KILLS ADD TIME$/],
  // v58 (HD-018): the load left the score, so season 3 says the TRUCK mode's words
  ['haul', 'season', 'STAY ON THE CONVOY · THE ROAD KILLS', /^TIME SURVIVED$/],
  ['free', 'menu', null, /\S/],   // a fresh menu: whatever it holds, the card is that run's line
];
// #593's in-run kill counter, under the clock
const KILLS_593 = 'body.in-run #kills { display: block !important; left: 50%; transform: translateX(-50%); top: calc(0.8rem + 42px); font-size: 0.85rem; white-space: nowrap; max-width: calc(100vw - 2rem); overflow: hidden; text-overflow: ellipsis; }';

srv.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  try {
    for (const v of VIEWS) {
      for (const [id, how, want, clockRe] of RUNS) {
        const label = `${v.name} · ${id === 'free' ? 'free run' : id}`;
        const ctx = await b.newContext({ viewport: { width: v.width, height: v.height }, isMobile: v.isMobile, hasTouch: v.hasTouch });
        const p = await ctx.newPage();
        const errs = [];
        p.on('pageerror', e => errs.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
        await p.addInitScript(m => {
          localStorage.setItem('hyperDaggerSeenTips', '1');
          localStorage.setItem('hyperDaggerRunKind', 'free');
          if (m) localStorage.setItem('hyperDaggerModeV31', m);
        }, SEASON_MODE[id] || null);
        await p.goto(base + '/hyperdagger/index.html?assets=0');
        await p.waitForFunction(() => window.__hd && window.__hd.debug && document.querySelector('#msg'), null, { timeout: 30000 });
        await p.addStyleTag({ content: KILLS_593 });
        const pre = await p.evaluate(() => getComputedStyle(document.getElementById('goalCard')).visibility);
        ok(`${label}: no card on the menu`, pre === 'hidden', pre);
        if (how === 'season') {
          await p.locator(`#msg button.season[data-season="${id}"]`).dispatchEvent('pointerdown');
        } else {
          if (id !== 'free') await p.evaluate(sid => window.__hd.debug.setSeason(sid), id);
          const box = await p.locator('#msg .go').boundingBox();
          if (box) await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          else await p.evaluate(() => window.__hd.debug.startGame());
        }
        const t0 = Date.now();
        await p.waitForFunction(() => window.__hd.debug.getState().state === 'playing'
          && document.body.classList.contains('in-run'), null, { timeout: 15000 });
        const at = await p.evaluate(async () => {
          const d = window.__hd.debug;
          d.freezeDirector(true); d.setInvulnerable(true);
          for (const e of [...(d.getEnemies?.() || [])]) try { d.killEnemy(e, 0, -1); } catch {}
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const g = document.getElementById('goalCard');
          const cs = getComputedStyle(g);
          const rect = q => { const e = document.querySelector(q); if (!e || getComputedStyle(e).display === 'none') return null; const x = e.getBoundingClientRect(); return x.width ? { l: x.left, t: x.top, r: x.right, b: x.bottom } : null; };
          return {
            text: g.textContent, cut: g.scrollWidth > g.clientWidth + 1, vis: cs.visibility, show: g.classList.contains('show'), pe: cs.pointerEvents,
            card: rect('#goalCard'), vw: innerWidth, vh: innerHeight, hook: d.getGoal?.(),
            clock: document.getElementById('clockLabel').textContent,
            others: { timer: rect('#timer'), clockLabel: rect('#clockLabel'), kills: rect('#kills'), home: rect('.arcade-home'), toko: rect('.arcade-toko'), pause: rect('#pauseBtn') },
          };
        });
        const shownAfter = Date.now() - t0;
        ok(`${label}: goal card up at the start`, at.show && at.vis === 'visible' && at.text.length > 0 && shownAfter < 1500, `${shownAfter}ms ${JSON.stringify(at.text)} ${at.vis}`);
        ok(`${label}: card says ${want ? JSON.stringify(want) : "the run's line"}`, want ? at.text === want : at.text === (at.hook && at.hook.goal), at.text);
        ok(`${label}: clock label says what the clock means`, clockRe.test(at.clock), JSON.stringify(at.clock));
        ok(`${label}: card takes no input`, at.pe === 'none', at.pe);
        const c = at.card;
        ok(`${label}: card fits the viewport, one line`, c && c.l >= 0 && c.r <= at.vw && c.b - c.t < 48 && !at.cut, JSON.stringify(c) + (at.cut ? ' cut off' : ''));
        const cx = at.vw / 2, cy = at.vh / 2, R = 28;   // the reticle: the frame's centre
        ok(`${label}: card clear of the reticle`, c && (c.b <= cy - R || c.t >= cy + R || c.r <= cx - R || c.l >= cx + R), JSON.stringify({ c, cy }));
        const hit = Object.entries(at.others).filter(([, o]) => o && c && !(c.r <= o.l || c.l >= o.r || c.b <= o.t || c.t >= o.b)).map(([n]) => n);
        ok(`${label}: card clashes with nothing in the HUD`, hit.length === 0, hit.join(', ') + ' ' + JSON.stringify(at.others));
        const k = at.others.kills, cl = at.others.clockLabel;
        ok(`${label}: clock label clear of the kill counter and clock`, cl && ![k, at.others.timer].some(o => o && !(cl.r <= o.l || cl.l >= o.r || cl.b <= o.t || cl.t >= o.b)), JSON.stringify({ cl, k }));
        // gone again: hidden by ~2 s (1.6 s + a 0.3 s fade); 2.5 s of wall time for a loaded box
        await p.waitForTimeout(Math.max(0, 2500 - (Date.now() - t0)));
        const after = await p.evaluate(() => { const g = document.getElementById('goalCard'); const cs = getComputedStyle(g); return { show: g.classList.contains('show'), vis: cs.visibility, op: +cs.opacity, state: window.__hd.debug.getState().state }; });
        // Two questions, because only one of them is the game's. The game
        // DISMISSES the card on a 1.6 s wall-clock timer — that must hold. The
        // 0.3 s CSS fade after it advances only as frames are drawn, and on a
        // ~250 ms-a-frame software renderer it can still be mid-fade at 2.5 s;
        // the same check failed that way on this PR's own branch (control run,
        // 17 Oct). So: dismissed by 2.5 s, and fully hidden within 1.5 s more.
        ok(`${label}: card dismissed by ~2.5 s`, !after.show, `${Date.now() - t0}ms ${JSON.stringify(after)}`);
        let vis = after.vis;
        for (let i = 0; i < 30 && vis !== 'hidden'; i++) { await p.waitForTimeout(50); vis = await p.evaluate(() => getComputedStyle(document.getElementById('goalCard')).visibility); }
        ok(`${label}: card's fade finishes`, vis === 'hidden', `${Date.now() - t0}ms vis=${vis}`);
        ok(`${label}: run still going under it`, after.state === 'playing', after.state);
        const real = errs.filter(e => !/player\.pos/.test(e));
        if (real.length < errs.length) console.log(`  note ${label}: ${errs.length - real.length} player.pos error(s) on main, not counted`);
        ok(`${label}: no page errors`, real.length === 0, real.slice(0, 3).join(' | '));
        await ctx.close();
      }
    }
  } finally {
    await b.close(); srv.close();
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
