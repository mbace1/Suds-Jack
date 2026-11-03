// THE CARD JOURNEY, PLAYED (v3.0; owner, 2026-11-02: "more curated narrative
// roguelike with fun choices and minimalistic visuals" — signed off as
// turn-based card hops, the scenes as the main view with the board between
// moments, and a slim job strip).
//
// A new player arrives at the bare address on a phone and plays EASY the way
// a person does: START, then tap a card's first button every time, and tap
// the screen to hurry a hop along. Nothing moves the courier but those taps;
// the save is SEEDED only to stand a player further up the ladder, and `?seed`
// only pins which shift is dealt so the gate sees the same one every run.
//
// It holds, on the screen:
//   · the bare address is the journey (no real-time game behind it), the ladder
//     on the title with EASY open, and `?classic` is still the real-time game
//   · every moment is ONE card: a face, a line, at most two 44px buttons each
//     with a price, inside the screen; the HUD pill's clock is the run's clock
//   · a stop is the stop scene, a ride is the tram interior with its in-car
//     display, a hop is the board — the courier riding a real line
//   · the strip names the job and where it goes; the corner MAP opens the board
//   · EASY played out completes, gives stars and opens MEDIUM; NEXT goes there
//   · HARD halts a line (the card says so, the stop's tram pulses), NIGHT is
//     23:00 in the night car, and all of it reads in Finnish and sideways
//   · ACT 1 (v3.1, ACT1.md): a button shows its stakes with the odds as a word,
//     a choice is followed by its reveal, the pill counts euros and a drop
//     names what was inside; the shift's weather is said and falls on the
//     stop; a tram ride pulls in at the stop as one of the six models with the
//     line's number on its chip; a key station stands behind its landmark and
//     every stop has its plate; NIGHT's tram with no number glows
//
//   NODE_PATH=$(npm root -g) node toko-move/test/play.cjs [rootDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  ok   ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ' — ' + extra : ''}`); } };
const PHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'en-US' };
const SIDEWAYS = { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, locale: 'en-US' };
const seedRuns = (ctx, runs) => ctx.addInitScript(r => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('tokoMoveRuns', JSON.stringify(r)); sessionStorage.setItem('seeded', '1'); } } catch {} }, runs);
const ready = page => page.waitForFunction(() => window.__tm3 && !document.getElementById('play').disabled, null, { timeout: 30000 });

// What the screen shows, read the way a person reads it.
const look = page => page.evaluate(() => {
  const end = document.getElementById('end'), panel = document.getElementById('v3panel');
  const btns = [...panel.querySelectorAll('.eventOpt:not([disabled])')];
  const vw = innerWidth, vh = innerHeight, r = e => e.getBoundingClientRect();
  const s = window.__tm3.state();
  return {
    end: !!end && !end.hidden, busy: window.__tm3.busy(), scene: window.__tm3.scene(), board: document.getElementById('v3board').classList.contains('on'),
    kind: window.__tm3.card()?.kind || null, line: panel.querySelector('.evLine')?.textContent || '', sign: panel.querySelector('.v3sign')?.textContent || '',
    stamp: panel.querySelector('.v3stamp')?.textContent || '',
    buttons: btns.map(b => { const q = r(b); return { t: b.textContent, h: q.height, inside: q.left >= 0 && q.right <= vw + 0.5 && q.top >= 0 && q.bottom <= vh + 0.5 }; }),
    clock: document.getElementById('v3clock').textContent, strip: document.getElementById('v3strip').hidden ? '' : document.getElementById('v3strip').textContent,
    mini: !document.getElementById('v3mini').hidden, halt: document.getElementById('v3').classList.contains('halt'),
    night: document.getElementById('v3').classList.contains('night'), dots: document.getElementById('v3dots').textContent,
    want: s ? (() => { const m = (window.__tm3.run.startHour ?? 7) * 60 + Math.floor(s.clock / 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; })() : null,
    overflow: document.documentElement.scrollWidth > vw + 1 || document.getElementById('v3').scrollTop !== 0,
    eur: document.getElementById('v3eur').textContent, stakes: [...panel.querySelectorAll('.evStk')].map(e => e.textContent.replace(/\s+/g, ' ').trim()),
    rev: panel.querySelector('.v3rev')?.textContent || '', wx: document.getElementById('v3wx').className,
    tram: (() => { const t = document.getElementById('v3tram'); return t && !t.hidden ? { model: t.dataset.model, chip: document.getElementById('v3chip').textContent, glow: t.classList.contains('glow') } : null; })(),
    land: document.querySelector('#v3frame .L.land')?.dataset.land || null, plate: document.querySelector('#v3frame .plate b')?.textContent || '',
  };
});
// Play by tapping: the first button of every card; tap the scene to hurry a
// hop or a stamp along. Returns everything it saw.
async function playOut(page, { maxSteps = 600, pick = () => 0, onCard = null } = {}) {
  const seen = { scenes: new Set(), kinds: new Set(), boards: 0, signs: [], stamps: [], cards: [], bad: [], clocks: [], strips: [], end: false, reveals: new Set(), trams: [], lands: new Set(), plates: new Set(), wx: new Set(), stakes: [] };
  for (let i = 0; i < maxSteps; i++) {
    const s = await look(page);
    seen.scenes.add(s.scene); if (s.board) seen.boards++; if (s.sign) seen.signs.push(s.sign); if (s.stamp) seen.stamps.push(s.stamp);
    if (s.rev) seen.reveals.add(s.rev); if (s.tram) seen.trams.push(s.tram); if (s.land) seen.lands.add(s.land); if (s.plate) seen.plates.add(s.plate); seen.wx.add(s.wx); seen.stakes.push(...s.stakes);
    if (s.overflow) seen.bad.push('the page scrolled or overflowed');
    if (s.end) { seen.end = true; break; }
    if (!s.busy && s.buttons.length) {
      // a card slides in (v3stamp, .26 s): measure where it SETTLES, not mid-entrance
      if (s.buttons.some(b => !b.inside)) { await page.waitForTimeout(400); Object.assign(s, await look(page)); if (!s.buttons.length) continue; }
      seen.kinds.add(s.kind); seen.cards.push(s); if (s.strip) seen.strips.push(s.strip);
      if (s.buttons.length > 2) seen.bad.push(`${s.kind} has ${s.buttons.length} buttons`);
      if (s.buttons.some(b => b.h < 44 || !b.inside)) seen.bad.push(`${s.kind}: a button under 44px or off screen ${JSON.stringify(s.buttons)}`);
      if (!/\+\d+:\d\d/.test(s.buttons.map(b => b.t).join(' '))) seen.bad.push(`${s.kind}: a button without a price`);
      seen.clocks.push([s.clock, s.want]);
      if (onCard) await onCard(s);
      await page.tap(`#v3panel .eventOpt[data-i="${pick(s)}"]`, { timeout: 2000 }).catch(e => seen.bad.push('tap: ' + String(e).slice(0, 80)));
      await page.waitForTimeout(120); continue;
    }
    // hurry the hop / the stamp: a tap on the scene, not on a button
    await page.touchscreen.tap(Math.round(page.viewportSize().width * 0.2), Math.round(page.viewportSize().height * 0.45)).catch(() => {});
    await page.waitForTimeout(140);
  }
  return seen;
}

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const watch = page => { const errs = []; page.on('pageerror', e => errs.push(String(e).slice(0, 160))); page.on('response', r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url().replace(base, '')}`); }); return errs; };
  try {
    // ── a new player, EASY, on a phone
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/`, { waitUntil: 'load' }); await ready(page);
      const t = await page.evaluate(() => ({ classic: !!window.__tm, v: window.__tm3.version, hero: document.querySelector('.versionHero')?.textContent || '', run: window.__tm3.run.id,
        runs: [...document.querySelectorAll('#mutRow .run')].map(r => ({ id: r.dataset.run, open: !r.classList.contains('locked'), lit: r.classList.contains('on') })),
        goal: document.getElementById('titleGoal').textContent, play: document.getElementById('play').textContent,
        links: ['dailyLink', 'weekLink', 'liveLink'].filter(id => { const e = document.getElementById(id); return e && !e.hidden && getComputedStyle(e).display !== 'none'; }) }));
      ok(`the bare address is the card journey, not the real-time game (v${t.v})`, !t.classic && t.v === '3.1' && /v3\.1/.test(t.hero));
      ok(`it is Act 1, in Helsinki (${await page.evaluate(() => document.getElementById('titleWhen').textContent)})`, await page.evaluate(() => /^Act 1 · Helsinki · 07:00/.test(document.getElementById('titleWhen').textContent)));
      ok(`the ladder: EASY open and lit, three locked (${t.runs.map(r => r.id + (r.open ? '' : '🔒')).join(' ')})`, t.runs.map(r => r.id).join() === 'easy,medium,hard,night' && t.runs[0].open && t.runs[0].lit && t.runs.slice(1).every(r => !r.open) && t.run === 'easy');
      ok(`the goal and the button (${t.goal} · ${t.play})`, /^Three deliveries before 08:15/.test(t.goal) && t.play === 'START SHIFT');
      ok(`no daily, week or LIVE before NIGHT (${t.links})`, !t.links.length);
      // the same address with a pinned shift, so the gate sees the same one
      await page.goto(`${base}/toko-move/?run=easy&seed=1002`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForTimeout(250);
      const fc = await look(page);
      ok(`the shift opens on its weather (${fc.stamp})`, /CLEAR/.test(fc.stamp) && /quiet city/.test(fc.stamp));
      ok(`the first stop is a key station: its landmark stands behind it and its plate names it (${fc.land}, ${fc.plate})`, fc.land === 'lasipalatsi' && fc.plate === 'LASIPALATSI');
      await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const first = await look(page);
      ok(`START deals the first card: a job, take it or ask for another (${first.line})`, first.kind === 'dispatch' && first.buttons.length === 2 && /for /.test(first.line));
      ok(`the HUD pill: the run's clock, three empty jobs, no money yet (${first.clock} ${first.dots} ${first.eur})`, first.clock === '07:00' && first.dots === '○○○' && first.eur === '€0');
      ok(`Take it says what the job pays (${first.stakes})`, /^€\d+$/.test(first.stakes[0] || ''));
      ok('the corner map shows where the job on offer goes', first.mini);
      // the corner MAP opens the board, and a tap closes it
      await page.tap('#v3mini'); await page.waitForTimeout(250);
      const open = await page.evaluate(() => ({ on: document.getElementById('v3board').classList.contains('on'), card: getComputedStyle(document.getElementById('v3panel')).visibility }));
      await page.tap('#v3board'); await page.waitForTimeout(300);
      const shut = await page.evaluate(() => ({ on: document.getElementById('v3board').classList.contains('on'), card: getComputedStyle(document.getElementById('v3panel')).visibility }));
      ok(`MAP opens the whole board over the scene, and a tap closes it (${open.on}/${open.card} → ${shut.on}/${shut.card})`, open.on && open.card === 'hidden' && !shut.on && shut.card === 'visible');
      // EASY, played out by tapping
      const seen = await playOut(page);
      ok(`EASY played by tapping only reaches the end (${seen.cards.length} cards)`, seen.end);
      ok(`every card keeps the grammar: ≤2 priced 44px buttons on screen, no scroll ${seen.bad.slice(0, 2).join(' | ')}`, !seen.bad.length);
      ok(`dispatch, route and story cards were dealt (${[...seen.kinds]})`, ['dispatch', 'route', 'story'].every(k => seen.kinds.has(k)));
      const offClock = seen.clocks.filter(([a, b]) => a !== b);
      ok(`the pill's clock is the run's clock at every card (${seen.clocks.length} read)`, !offClock.length, JSON.stringify(offClock.slice(0, 3)));
      ok(`the stop and the tram interior were both on screen (${[...seen.scenes]})`, seen.scenes.has('stop') && seen.scenes.has('tram'));
      ok(`a ride shows the in-car display (${seen.signs[0] || 'none'})`, seen.signs.some(s => /›/.test(s)));
      ok(`hops were played on the board (${seen.boards} frames)`, seen.boards > 0);
      ok(`the strip names the job and where it goes (${seen.strips[0]})`, seen.strips.length && seen.strips.every(s => /→/.test(s) && /min (left)|late by/.test(s)));
      ok(`every drop is stamped, with what was inside and what it paid (${seen.stamps.find(s => /DELIVERED/.test(s))})`, seen.stamps.some(s => /DELIVERED/.test(s) && /Signed for: \S/.test(s) && /\+€\d+/.test(s)));
      const risky = seen.stakes.find(x => /^(usually|maybe|long shot) .+ · or .+/.test(x));
      ok(`a risky button shows its stakes, the odds in a word (${risky})`, !!risky);
      ok(`a choice is followed by its reveal (${[...seen.reveals][0]})`, seen.reveals.size >= 2);
      const tr = seen.trams.find(t => t.model && /^\d+$/.test(t.chip));
      ok(`a tram ride pulls in at the stop as a model, with the line's number on its chip (${JSON.stringify(tr)})`, !!tr && ['artic', 'nr2plus', 'vario', 'nr2', 'nr1', 'museum'].includes(tr.model));
      ok(`every stop has its plate (${[...seen.plates].join(', ')})`, seen.plates.size >= 2);
      const eur = await page.evaluate(() => document.getElementById('endStats').textContent);
      ok(`the end card says what was earned, in euros, and what you carried (${(eur.match(/earned €\d+/) || [])[0]})`, /earned €[1-9]\d*/.test(eur) && /WHAT YOU CARRIED/.test(eur) && (eur.match(/· (delivered|sold)/g) || []).length >= 3);
      const card = await page.evaluate(() => ({ t: document.getElementById('endTitle').textContent, stars: document.querySelector('.runStars')?.textContent || '', opened: [...document.querySelectorAll('.runOpened')].map(e => e.textContent), next: document.getElementById('nextRun')?.textContent || null, again: document.getElementById('again').textContent }));
      ok(`EASY COMPLETE with stars (${card.t} ${card.stars})`, card.t === 'EASY COMPLETE' && /^★+☆*$/.test(card.stars) && card.stars.length === 3);
      ok(`MEDIUM opens, and NEXT goes there (${card.opened} · ${card.next})`, card.opened.includes('MEDIUM IS OPEN') && card.next === 'NEXT · MEDIUM');
      ok(`trying again is a new shift (${card.again})`, /EASY AGAIN · A NEW SHIFT/.test(card.again));
      // the end card is read before NEXT is pressed: a tap in the moment after
      // a skip is swallowed on purpose (play.js), so a hurried tap can never
      // press what appeared under it
      await page.waitForTimeout(700);
      await Promise.all([page.waitForNavigation(), page.tap('#nextRun')]); await ready(page);
      const m = await page.evaluate(() => ({ run: window.__tm3.run.id, lit: document.querySelector('#mutRow .run.on')?.dataset.run, stars: document.querySelector('#mutRow .run[data-run="easy"] .runS')?.textContent || '', url: location.search }));
      ok(`NEXT opens MEDIUM on the journey, lit, EASY wearing its stars (${m.run} ${m.url} ${m.stars})`, m.run === 'medium' && m.lit === 'medium' && /★/.test(m.stars) && !/classic/.test(m.url));
      ok('no page or network errors (EASY)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── HARD halts a line
    {
      const ctx = await browser.newContext(PHONE); await seedRuns(ctx, { easy: { done: true }, medium: { done: true } });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=hard&seed=19`, { waitUntil: 'load' }); await ready(page);
      ok('after MEDIUM, HARD is open', await page.evaluate(() => window.__tm3.run.id === 'hard'));
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      let halt = null;
      await playOut(page, { maxSteps: 120, onCard: async s => { if (s.kind === 'halt' && !halt) { await page.waitForTimeout(1100); halt = await look(page); } }, pick: s => 0 }).catch(() => {});
      ok(`the halt is a card that names the line, and the stop's tram pulses (${halt?.line})`, !!halt && /is halted/.test(halt.line) && halt.halt && halt.scene === 'stop' && halt.tram && /^\d+$/.test(halt.tram.chip));
      const hw = await page.evaluate(() => window.__tm3.state().weather);
      ok(`HARD's shift is snow or rain, and it falls on the stop (${hw})`, ['snow', 'rain'].includes(hw) && (halt?.wx || '').includes(`${hw} on`));
      ok(`and both ways out are priced (${halt?.buttons.map(b => b.t).join(' / ')})`, !!halt && halt.buttons.length === 2 && /Find another way/.test(halt.buttons[0].t) && /Wait it out/.test(halt.buttons[1].t));
      ok('no page or network errors (HARD)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── NIGHT: 23:00, the night car
    {
      const ctx = await browser.newContext(PHONE); await seedRuns(ctx, { easy: { done: true }, medium: { done: true }, hard: { done: true } });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=night&seed=60`, { waitUntil: 'load' }); await ready(page);
      const t = await page.evaluate(() => ({ when: document.getElementById('titleWhen').textContent, goal: document.getElementById('titleGoal').textContent }));
      ok(`NIGHT on the title: 23:00, five jobs before 00:15 (${t.when} · ${t.goal})`, /23:00/.test(t.when) && /^Five deliveries before 00:15/.test(t.goal));
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      let ghost = null;
      const seen = await playOut(page, { maxSteps: 90, onCard: async s => { if (/no number/.test(s.line) && !ghost) { await page.waitForTimeout(1200); ghost = await look(page); } },
        pick: s => { if (s.kind !== 'route') return 0; const i = s.buttons.findIndex(b => !/^Walk/.test(b.t)); return i < 0 ? 0 : i; } });
      ok(`the tram with no number pulls in: the museum tram, no number on it, glowing (${JSON.stringify(ghost?.tram)})`, ghost?.tram?.model === 'museum' && ghost.tram.chip === '' && ghost.tram.glow);
      const c = seen.cards[0];
      ok(`the night stage: the pill reads after eleven, five jobs (${c?.clock} ${c?.dots})`, !!c && /^23:/.test(c.clock) && c.dots === '○○○○○' && c.night);
      ok(`a ride at night is the night car (${[...seen.scenes]})`, seen.scenes.has('night') && !seen.scenes.has('tram'));
      ok('no page or network errors (NIGHT)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── in Finnish
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1185&lang=fi`, { waitUntil: 'load' }); await ready(page);
      const t = await page.evaluate(() => ({ play: document.getElementById('play').textContent, body: document.querySelector('#title .cardBody p').textContent, goal: document.getElementById('titleGoal').textContent }));
      ok(`the title in Finnish (${t.play} · ${t.goal})`, t.play === 'ALOITA VUORO' && /^Lähetti Helsingissä/.test(t.body) && /^Kolme toimitusta ennen kello 8\.15/.test(t.goal));
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await playOut(page, { maxSteps: 400 });
      const words = seen.cards.map(c => c.line + ' ' + c.buttons.map(b => b.t).join(' ')).join(' | ');
      const misses = await page.evaluate(() => [...(window.__tmLang?.misses || [])]);
      ok(`a whole EASY run in Finnish reaches the end (${seen.cards.length} cards)`, seen.end);
      ok(`the cards speak Finnish (${seen.cards.slice(0, 3).map(c => c.line).join(' | ')})`, /Ota se/.test(words) && /→/.test(words) && !/\b(Take it|Walk to|for [A-Z])/.test(words));
      ok(`nothing the journey says is missing from the table (${misses.slice(0, 4).join(' | ')})`, !misses.length);
      ok('no page or network errors (Finnish)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── sideways: START on screen, the card beside the scene
    {
      const ctx = await browser.newContext(SIDEWAYS), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1111`, { waitUntil: 'load' }); await ready(page);
      const st = await page.evaluate(() => { const r = document.getElementById('play').getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
      ok('a phone held sideways shows START without scrolling', st);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await playOut(page, { maxSteps: 60 });
      ok(`sideways, every card fits beside the scene ${seen.bad.slice(0, 2).join(' | ')}`, !seen.bad.length && seen.cards.length >= 4);
      ok('no page or network errors (sideways)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── ?classic is still the real-time game
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?classic`, { waitUntil: 'load' });
      const up = await page.waitForFunction(() => window.__tm?.flow && !document.getElementById('play').disabled, null, { timeout: 30000 }).then(() => true, () => false);
      ok('?classic boots the real-time game it always was', up && await page.evaluate(() => !window.__tm3 && !!document.getElementById('map')));
      ok('no page or network errors (classic)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
  } catch (e) { ok('the gate ran to the end', false, String(e).slice(0, 300)); }
  console.log(`\n  play: ${pass} passed, ${fail} failed`);
  await browser.close(); server.close(); process.exit(fail ? 1 : 0);
});
