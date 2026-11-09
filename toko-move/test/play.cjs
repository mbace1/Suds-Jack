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
// the top row: the pill must clear the arcade's HUB button and ♪, at any width
const topRow = page => page.evaluate(() => { const r = e => e?.getBoundingClientRect(), pill = r(document.getElementById('v3pill')), snd = r(document.getElementById('v3sound')), home = r(document.querySelector('.arcade-home'));
  const hit = (a, c) => !!a && !!c && a.width > 0 && c.width > 0 && a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom;
  return { home: hit(pill, home), snd: hit(pill, snd), w: Math.round(pill.width), left: Math.round(pill.left), right: Math.round(pill.right), hasHome: !!home?.width, t: document.getElementById('v3pill').style.transform }; });
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
    car: (() => { for (const e of document.querySelectorAll('#v3frame .L')) { const m = getComputedStyle(e).backgroundImage.match(/(02-car(?:-[a-z]+)?)\.webp/); if (m) return m[1]; } return null; })(),
    layers: [...document.querySelectorAll('#v3frame .L')].map(e => (e.style.backgroundImage.match(/scenes\/([a-z]+)\/\d+\/([0-9a-z-]+)\.webp/) || []).slice(1).join('/')).filter(Boolean),
    card: window.__tm3.card()?.id || null,
  };
});
// Play by tapping: the first button of every card; tap the scene to hurry a
// hop or a stamp along. Returns everything it saw.
async function playOut(page, { maxSteps = 600, pick = () => 0, onCard = null } = {}) {
  const seen = { scenes: new Set(), kinds: new Set(), boards: 0, signs: [], stamps: [], cards: [], bad: [], clocks: [], strips: [], end: false, reveals: new Set(), trams: [], lands: new Set(), plates: new Set(), wx: new Set(), stakes: [], cars: new Set(), layers: new Set() };
  for (let i = 0; i < maxSteps; i++) {
    const s = await look(page);
    seen.scenes.add(s.scene); if (s.board) seen.boards++; if (s.sign) seen.signs.push(s.sign); if (s.stamp) seen.stamps.push(s.stamp);
    if (s.rev) seen.reveals.add(s.rev); if (s.tram) seen.trams.push(s.tram); if (s.car) seen.cars.add(s.car); for (const l of s.layers) seen.layers.add(l); if (s.land) seen.lands.add(s.land); if (s.plate) seen.plates.add(s.plate); seen.wx.add(s.wx); seen.stakes.push(...s.stakes);
    if (s.overflow) seen.bad.push('the page scrolled or overflowed');
    if (s.end) { seen.end = true; break; }
    if (!s.busy && s.buttons.length) {
      // a card slides in (v3stamp, .26 s): measure where it SETTLES, not mid-entrance
      if (s.buttons.some(b => !b.inside)) { await page.waitForTimeout(400); Object.assign(s, await look(page)); if (!s.buttons.length) continue; }
      seen.kinds.add(s.kind); seen.cards.push(s); if (s.strip) seen.strips.push(s.strip);
      if (s.buttons.length !== 3 && s.kind !== 'route') seen.bad.push(`${s.kind} has ${s.buttons.length} buttons`);   // v3.18: three at every choice (a sealed dead end may have one)
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
        runs: [...document.querySelectorAll('#mutRow .run[data-run]')].map(r => ({ id: r.dataset.run, open: !r.classList.contains('locked'), lit: r.classList.contains('on') })),
        goal: document.getElementById('titleGoal').textContent, play: document.getElementById('play').textContent,
        links: ['dailyLink', 'weekLink', 'liveLink'].filter(id => { const e = document.getElementById(id); return e && !e.hidden && getComputedStyle(e).display !== 'none'; }) }));
      ok(`the bare address is the card journey, not the real-time game (v${t.v})`, !t.classic && t.v === '3.21' && /v3\.21/.test(t.hero));
      ok(`it is Act 1, in Helsinki (${await page.evaluate(() => document.getElementById('titleWhen').textContent)})`, await page.evaluate(() => /^Act 1 · Helsinki · 07:00/.test(document.getElementById('titleWhen').textContent)));
      ok(`the ladder: EASY open and lit, three locked (${t.runs.map(r => r.id + (r.open ? '' : '🔒')).join(' ')})`, t.runs.map(r => r.id).join() === 'easy,medium,hard,night' && t.runs[0].open && t.runs[0].lit && t.runs.slice(1).every(r => !r.open) && t.run === 'easy');
      ok(`the goal and the button (${t.goal} · ${t.play})`, /^Three deliveries before 08:15/.test(t.goal) && t.play === 'START SHIFT');
      ok(`no daily, week or LIVE before NIGHT (${t.links})`, !t.links.length);
      // the same address with a pinned shift, so the gate sees the same one
      await page.goto(`${base}/toko-move/?run=easy&seed=1009`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForTimeout(250);
      const fc = await look(page);
      ok(`the shift opens on its weather (${fc.stamp})`, /CLEAR/.test(fc.stamp) && /quiet city/.test(fc.stamp));
      ok(`the first stop is a key station: its landmark stands behind it and its plate names it (${fc.land}, ${fc.plate})`, fc.land === 'lasipalatsi' && fc.plate === 'LASIPALATSI');
      await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const first = await look(page);
      ok(`START deals the first card: a job, take it, ask for another, or (special) express (${first.line})`, first.kind === 'dispatch' && first.buttons.length === 3 && /Take it, express/.test(first.buttons[2].t) && /for /.test(first.line));
      ok(`the HUD pill: the run's clock, three empty jobs, no money yet (${first.clock} ${first.dots} ${first.eur})`, first.clock === '07:00' && first.dots === '○○○' && first.eur === '€0');
      ok(`Take it says what the job pays (${first.stakes})`, /^€\d+$/.test(first.stakes[0] || ''));
      ok('the corner map shows where the job on offer goes', first.mini);
      // ── sound (v3.2): the house kit's toggle on the journey, top-right, and a real mute
      const snd = await page.evaluate(() => { const r = e => e?.getBoundingClientRect(), b = r(document.getElementById('v3sound')), pill = r(document.getElementById('v3pill')), home = r(document.querySelector('.arcade-home'));
        const hit = (a, c) => !!a && !!c && a.left < c.right && c.left < a.right && a.top < c.bottom && c.top < a.bottom;
        return { w: b?.width, h: b?.height, right: b ? innerWidth - b.right : null, pressed: document.getElementById('v3sound')?.getAttribute('aria-pressed'), pill: hit(b, pill), home: hit(b, home), level: window.__tm3.audio.level() }; });
      ok(`a sound toggle, 44px, top-right, clear of the pill and the HUB button (${snd.w}×${snd.h}, ${snd.right}px from the edge)`, snd.w >= 44 && snd.h >= 44 && snd.right < 20 && !snd.pill && !snd.home && snd.pressed === 'true');
      await page.tap('#v3sound'); await page.waitForTimeout(100);
      const off = await page.evaluate(() => ({ pressed: document.getElementById('v3sound').getAttribute('aria-pressed'), kept: localStorage.getItem('tokoMoveSound'), level: window.__tm3.audio.level() }));
      await page.tap('#v3sound'); await page.waitForTimeout(100);
      const back = await page.evaluate(() => ({ pressed: document.getElementById('v3sound').getAttribute('aria-pressed'), kept: localStorage.getItem('tokoMoveSound'), level: window.__tm3.audio.level() }));
      ok(`♪ mutes at once and the choice is kept, the same key as ?classic (${off.pressed}/${off.kept}/${off.level} → ${back.pressed}/${back.kept}/${back.level})`, off.pressed === 'false' && off.kept === 'off' && off.level === 0 && back.pressed === 'true' && back.kept === 'on' && back.level > 0);
      // the corner MAP opens the board, and a tap closes it
      await page.tap('#v3mini'); await page.waitForTimeout(250);
      const open = await page.evaluate(() => ({ on: document.getElementById('v3board').classList.contains('on'), card: getComputedStyle(document.getElementById('v3panel')).visibility }));
      await page.tap('#v3board'); await page.waitForTimeout(300);
      const shut = await page.evaluate(() => ({ on: document.getElementById('v3board').classList.contains('on'), card: getComputedStyle(document.getElementById('v3panel')).visibility }));
      ok(`MAP opens the whole board over the scene, and a tap closes it (${open.on}/${open.card} → ${shut.on}/${shut.card})`, open.on && open.card === 'hidden' && !shut.on && shut.card === 'visible');
      // EASY, played out by tapping
      const seen = await playOut(page);
      ok(`EASY played by tapping only reaches the end (${seen.cards.length} cards)`, seen.end);
      ok(`every card keeps the grammar: three priced 44px buttons on screen, no scroll ${seen.bad.slice(0, 2).join(' | ')}`, !seen.bad.length);
      ok(`dispatch, route and story cards were dealt (${[...seen.kinds]})`, ['dispatch', 'route', 'story'].every(k => seen.kinds.has(k)));
      const offClock = seen.clocks.filter(([a, b]) => a !== b);
      ok(`the pill's clock is the run's clock at every card (${seen.clocks.length} read)`, !offClock.length, JSON.stringify(offClock.slice(0, 3)));
      ok(`the stop and the tram interior were both on screen (${[...seen.scenes]})`, seen.scenes.has('stop') && seen.scenes.has('tram'));
      ok(`a ride shows the in-car display (${seen.signs[0] || 'none'})`, seen.signs.some(s => /›/.test(s)));
      const hops = await page.evaluate(() => window.__tm3.boards);
      ok(`hops were played on the board (${hops} hops; counted, since a hurried tap skips each in a frame)`, hops > 0);
      const rides = await page.evaluate(() => window.__tm3.rides || 0);
      ok(`a ride is played inside the car, the corner map following it (v3.19; ${rides} rides)`, rides > 0);
      ok(`the strip names the job and where it goes (${seen.strips[0]})`, seen.strips.length && seen.strips.every(s => /→/.test(s) && /min (left)|late by/.test(s)));
      ok(`every drop is stamped, with what was inside and what it paid (${seen.stamps.find(s => /DELIVERED/.test(s))})`, seen.stamps.some(s => /DELIVERED/.test(s) && /Signed for: \S/.test(s) && /\+€\d+/.test(s)));
      const risky = seen.stakes.find(x => /^(usually|maybe|long shot) .+ · or .+/.test(x));
      ok(`a risky button shows its stakes, the odds in a word (${risky})`, !!risky);
      ok(`a choice is followed by its reveal (${[...seen.reveals][0]})`, seen.reveals.size >= 2);
      const tr = seen.trams.find(t => t.model && /^\d+$/.test(t.chip));
      ok(`a tram ride pulls in at the stop as a model, with the line's number on its chip (${JSON.stringify(tr)})`, !!tr && ['artic', 'nr2plus', 'vario', 'nr2', 'nr1', 'museum'].includes(tr.model));
      ok(`every stop has its plate (${[...seen.plates].join(', ')})`, seen.plates.size >= 2);
      const heard = await page.evaluate(() => [...new Set(window.__tm3.audio.log.map(e => e.name))]);
      const need = ['forecast', 'deal', 'tap', 'stamp', 'end'], missing = need.filter(n => !heard.includes(n));
      ok(`the run is heard: the forecast, a card dealt, a tap, the stamp, the end (${heard.join(' ')})`, !missing.length, `missing ${missing}`);
      ok('a tram rings in, and a hop is heard on the rails or underfoot', heard.some(n => n === 'bell' || n === 'museum') && heard.some(n => n === 'ride' || n === 'walk'));
      ok('a delivery is heard as one (or as late)', heard.includes('deliver') || heard.includes('late'));
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
      const beds = await page.evaluate(() => window.__tm3.audio.log.filter(e => /^bed:/.test(e.name)).map(e => e.name));
      ok(`and it is heard: a ${hw} bed under the stop, quiet inside the car (${beds.slice(0, 4).join(' ')})`, beds.includes(`bed:${hw}`) && beds.includes('bed:none'));
      ok(`and the ways out are priced, a taxi the special third (${halt?.buttons.map(b => b.t).join(' / ')})`, !!halt && halt.buttons.length === 3 && /Find another way/.test(halt.buttons[0].t) && /Wait it out/.test(halt.buttons[1].t) && /Taxi to /.test(halt.buttons[2].t));
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
      const nt = await topRow(page);
      ok(`the night's wider pill clears the HUB button and ♪ (${nt.left}–${nt.right}px ${nt.t || 'centred'})`, nt.hasHome && !nt.home && !nt.snd);
      ok(`a ride at night is the night car (${[...seen.scenes]})`, seen.scenes.has('night') && !seen.scenes.has('tram') && !seen.scenes.has('metro'));
      ok(`and the night shift keeps its stops: the sunny moments are day pictures (${[...seen.scenes].filter(x => x.startsWith('m-')).join(', ') || 'none'})`, ![...seen.scenes].some(x => x.startsWith('m-')));
      ok('the night hums under the city', await page.evaluate(() => window.__tm3.audio.log.some(e => e.name === 'bed:night')));
      ok('no page or network errors (NIGHT)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── the old trams from inside (v3.3): seed 1197's EASY rides the museum tram, then an Nr II
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1197`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await playOut(page, { maxSteps: 260 });
      // the in-car sign names the model too, but a hurried tap skips it in a frame; the tram at the stop stays
      const models = [...new Set(seen.trams.map(t => t.model))];
      ok(`the museum tram is wood and brass inside (${[...seen.cars].join(' ')} · at the stop: ${models.join(', ')})`, seen.cars.has('02-car-museum') && models.includes('museum'));
      ok('and an Nr II is its 1970s self inside', seen.cars.has('02-car-old'));
      ok('every interior layer it asked for was there (no 404s)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── more interiors (v3.11): the metro by day, the rush car, and the weather in the window.
    // MEDIUM 1162 is a rainy day that rides the metro and is dealt the crush aboard it;
    // MEDIUM 1027 rides a tram in the rain and is dealt the crush there.
    for (const [seed, car] of [[1162, 'metro'], [1027, 'tram']]) {
      const ctx = await browser.newContext(PHONE); await seedRuns(ctx, { easy: { done: true } });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=medium&seed=${seed}`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      // the card is up a beat before the car behind it fills (the scene cross-fades in .2 s): look once it has
      let crush = 'never dealt';
      const seen = await playOut(page, { maxSteps: 70, onCard: async c => { if (c.card === 'crush') { await page.waitForTimeout(500); crush = (await look(page)).layers.join(' '); } } }), L = seen.layers;
      if (car === 'metro') {
        ok(`a metro ride by day is the metro car, a tunnel for its window (${[...L].filter(l => l.startsWith('metro')).join(' ')})`, L.has('metro/02-car') && L.has('metro/01-outside-tile'));
        ok('and a tunnel has no rain in it', ![...L].some(l => /^metro\/01-outside-tile-/.test(l)));
      } else ok(`a rainy day rains in the tram's window too (${[...L].filter(l => l.includes('outside')).join(' ')})`, L.has('tram/01-outside-tile-rain') && !L.has('tram/01-outside-tile'));
      ok(`the crush card fills the ${car} (${crush})`, crush.includes(`${car}/03-people-rush`) && crush.includes(`${car}/04-courier-rush`));
      ok(`no page or network errors (${car} interiors)`, !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── the moments (v3.12, the owner's approved art, PR #632): EASY 1003 (a clear day)
    // takes jobs, boards trams, delivers, and boards the metro at Kalasatama, each
    // beat with its picture
    {
      const M = await import(require('url').pathToFileURL(require('path').join(__dirname, '../js/moments.js')).href);
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1003`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await playOut(page, { maxSteps: 400 }), ms = [...seen.scenes].filter(x => x.startsWith('m-')).map(x => x.slice(2));
      const among = pool => ms.some(m => pool.includes(m)), hand = [...Object.values(M.HANDOFF_AT).flat()];
      ok(`a run on a clear day is told in the new pictures: ${ms.length} of them (${ms.join(', ')})`, ms.length >= 4 && ms.every(m => M.MOMENTS[m]?.fmts.includes('916')));
      ok('a job taken is handed over (a kiosk, a bench, or a place of its own)', among([...M.PICKUP, ...hand]));
      ok('a delivery is at a door, with a cyclist, at the bench or at a place of its own', among([...M.DELIVERY, ...hand]));
      ok('a tram boarded is a tram stop', among(M.BOARD_TRAM));
      ok('the metro boarded at Kalasatama stands at its open-air platform', among(M.BOARD_METRO_KALASATAMA));
      ok(`and the run still ends (${seen.cards.length} cards)`, seen.end);
      ok('no page or network errors (moments)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── a card's own scene, and a choice's consequence (v3.13): EASY 1152 deals the
    // tourist and her map, then the lady at the crossing (walked across), then the
    // seat she saved
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1152`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await playOut(page, { maxSteps: 400 }), ms = [...seen.scenes].filter(x => x.startsWith('m-')).map(x => x.slice(2));
      ok(`the tourist's card is played in front of her and her map (${ms.join(', ')})`, ms.includes('tourist'));
      ok('walking the lady across is the crossing', ms.includes('crossing'));
      ok('and the seat she saved you is her callback\'s scene', ms.includes('saved-seat'));
      ok('no page or network errors (card scenes)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── missions (v3.14): the title lists them (the first open after EASY), and LOST AND
    // FOUND plays through: the wallet handed in at the kiosk, a perk drafted between jobs,
    // the owner aboard, the end card with the build
    {
      const ctx = await browser.newContext(PHONE); await seedRuns(ctx, { easy: { done: true, stars: 2, plays: 1 } });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/`, { waitUntil: 'load' }); await ready(page);
      const list = await page.evaluate(() => [...document.querySelectorAll('[data-mission]')].map(e => `${e.dataset.mission}:${e.tagName === 'A' ? 'open' : 'locked'}`));
      ok(`the title lists the missions, the first open after EASY (${list.join(' ')})`, list[0] === 'aino:open' && list.slice(1).every(x => x.endsWith('locked')) && list.length >= 4);
      // v3.17: the missions on the map — a pin where each starts, and a tap on the open one plays it
      await page.waitForFunction(() => document.getElementById('missionMap')?.dataset.pins, null, { timeout: 15000 });
      const pins = (await page.evaluate(() => document.getElementById('missionMap').dataset.pins)).split(' ').map(x => { const [id, state, px, py] = x.split(':'); return { id, state, x: +px, y: +py }; });
      ok(`the map pins every mission where it starts, AINO'S MORNING open (${pins.map(p => p.id + ':' + p.state).join(' ')})`, pins.length === list.length && pins.find(p => p.id === 'aino')?.state === 'open' && pins.filter(p => p.state === 'locked').length === list.length - 1);
      await page.$eval('#missionMap', e => e.scrollIntoView({ block: 'start' })); await page.waitForTimeout(200);
      const box = await (await page.$('#missionMap')).boundingBox(), aino = pins.find(p => p.id === 'aino');
      await page.touchscreen.tap(box.x + aino.x, box.y + aino.y); await page.waitForURL(/mission=aino/, { timeout: 5000 }).catch(() => {});
      ok(`a tap on the open pin plays it (${page.url().replace(base, '')})`, /\?mission=aino/.test(page.url()));
      await page.goto(`${base}/toko-move/?mission=wallet&seed=11`, { waitUntil: 'load' }); await ready(page);
      const t = await page.evaluate(() => ({ when: document.getElementById('titleWhen').textContent, play: document.getElementById('play').textContent }));
      ok(`?mission=wallet is the errand (${t.when} · ${t.play})`, /LOST AND FOUND/.test(t.when) && t.play === 'START THE ERRAND');
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      let perkCard = null;
      const seen = await playOut(page, { maxSteps: 400, onCard: async c => { if (c.kind === 'perk' && !perkCard) perkCard = c.buttons.map(b => b.t).join(' | '); } });
      const ms = [...seen.scenes].filter(x => x.startsWith('m-')).map(x => x.slice(2)), res = await page.evaluate(() => window.__tm3.result);
      ok(`the wallet is handed in at the kiosk, in its picture (${ms.join(', ')})`, ms.includes('wallet'));
      ok(`between jobs a perk is drafted from two, or the cash (${perkCard})`, !!perkCard && perkCard.split(' | ').length === 3 && /Keep the cash/.test(perkCard));
      ok(`and the errand ends on its card, with the build (${JSON.stringify(res)})`, seen.end && res?.mode === 'mission' && res.perks.length >= 1);
      ok('no page or network errors (missions)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // v3.15: a fork in EAST OF THE BRIDGE (two errands, one card), and THE LAST TRAM at night
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?mission=east&seed=4`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      let fork = null;
      const seen = await playOut(page, { maxSteps: 400, onCard: async c => { if (!fork && /Two errands/.test(c.line)) fork = c.buttons.map(b => b.t.replace(/\+\d+:\d\d.*/, '').trim()); } });
      ok(`a fork is two errands and a coin on one card (${fork?.join(' / ')})`, fork?.length === 3 && fork.slice(0, 2).every(b => /→/.test(b)) && /Toss a coin/.test(fork[2]));
      ok('and the errand goes on to its end', seen.end);
      await page.goto(`${base}/toko-move/?mission=lasttram&seed=2`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const night = await playOut(page, { maxSteps: 400 });
      ok(`THE LAST TRAM is the night shift: the night car, no sunny moments (${[...night.scenes].join(', ')})`, night.end && night.scenes.has('night') && ![...night.scenes].some(x => x.startsWith('m-')) && night.clocks.some(([c]) => /^23:/.test(c)));
      ok('no page or network errors (fork, night)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // v3.16: the march on Mannerheimintie: MEDIUM 15 (a clear day) holds the 4 by the Parliament House
    {
      const ctx = await browser.newContext(PHONE); await seedRuns(ctx, { easy: { done: true, stars: 2, plays: 1 } });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=medium&seed=15`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      let march = null;
      const seen = await playOut(page, { maxSteps: 400, onCard: async c => { if (!march && c.kind === 'halt') march = { line: c.line, scene: c.scene }; } });
      ok(`the march holds a Mannerheimintie line, drawn from above (${JSON.stringify(march)})`, /^A march on Mannerheimintie, by the Parliament House\. The (1|2|4|10) is halted\.$/.test(march?.line || '') && march.scene === 'm-demonstration');
      ok('and the shift goes on round it to its end', seen.end);
      ok('no page or network errors (the march)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // v3.17: today's errand — one mission a day, the same for everyone, its first finish stands
    {
      const ctx = await browser.newContext(PHONE); await seedRuns(ctx, { easy: { done: true, stars: 2, plays: 1 } });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/`, { waitUntil: 'load' }); await ready(page);
      const link = await page.evaluate(() => { const a = document.getElementById('errandLink'); return a ? { t: a.textContent, h: a.getAttribute('href') } : null; });
      ok(`the missions offer today's errand (${link?.t})`, !!link && /^TODAY'S ERRAND · /.test(link.t) && link.h === '?errand');
      await page.goto(`${base}/toko-move/?errand&date=2026-11-08`, { waitUntil: 'load' }); await ready(page);
      const t = await page.evaluate(() => ({ when: document.getElementById('titleWhen').textContent, goal: document.getElementById('titleGoal').textContent, play: document.getElementById('play').textContent }));
      ok(`?errand is the day's mission (${t.when})`, /^Errand \d+ · 8 Nov · THE LAST TRAM$/.test(t.when) && /same errand for everyone/.test(t.goal) && t.play === 'START THE ERRAND');
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await playOut(page, { maxSteps: 400 }), res = await page.evaluate(() => window.__tm3.result);
      ok(`it ends on the errand's card, its line to send, and it stands (${JSON.stringify(res)})`, seen.end && res?.mode === 'errand' && res.first === true && /^Toko Move · Errand \d+ · 8 Nov\nTHE LAST TRAM [🟩🟨🟥⬛]{3} · €\d+/u.test(res.text));
      await page.goto(`${base}/toko-move/?errand&date=2026-11-08`, { waitUntil: 'load' }); await ready(page);
      ok('the title then shows what stands for the day', await page.evaluate(() => /TODAY'S STANDS/.test(document.getElementById('mutRow').textContent)));
      ok('no page or network errors (the errand)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // v3.20: the two machines, read as one (__tm3.machine(), body[data-ui], body[data-state]), and a
    // shift played from the keyboard alone: 1, 2, 3 answer whatever card is waiting
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1009`, { waitUntil: 'load' }); await ready(page);
      const t = await page.evaluate(() => [document.body.dataset.ui, window.__tm3.machine().ui]);
      ok(`the title is a state of the screen (${t})`, t[0] === 'title' && t[1] === 'title');
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 }); await page.waitForTimeout(500);
      const m0 = await page.evaluate(() => ({ ...window.__tm3.machine(), body: [document.body.dataset.ui, document.body.dataset.state] }));
      ok(`the first card is the run's dispatch state, waiting, with where it may go (${m0.state} · ${m0.ui} → ${m0.next.join(' ')})`, m0.state === 'dispatch' && m0.ui === 'card' && m0.body.join() === 'card,dispatch' && m0.next.includes('route') && m0.options.length === 3 && !m0.problems.length);
      const seen = new Set(), problems = [];
      for (let i = 0; i < 400; i++) { const m = await page.evaluate(() => window.__tm3.machine()); seen.add(`${m.ui}:${m.state}`); problems.push(...m.problems); if (m.ui === 'end') break;
        if (m.ui === 'card') { await page.keyboard.press(String(1 + (i % 3))); await page.waitForTimeout(140); } else await page.waitForTimeout(220); }
      const uis = new Set([...seen].map(x => x.split(':')[0]));
      ok(`a shift is played from the keyboard alone, 1·2·3, to its end card (${[...seen].join(' ')})`, uis.has('card') && uis.has('moving') && uis.has('end') && await page.evaluate(() => !document.getElementById('end').hidden));
      ok('and nothing the machine checks breaks on the way', !problems.length, problems.slice(0, 3).join(' | '));
      ok('no page or network errors (the machines)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // v3.21: the play log — a shift played is written down on this device, one left mid-way is a QUIT
    // with the state it was left in, and the title offers the readout to copy back
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1009`, { waitUntil: 'load' }); await ready(page);
      ok('a new device has no play log on its title', await page.evaluate(() => !document.getElementById('playsBtn')));
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      await playOut(page, { maxSteps: 400, pick: s => s.buttons.length > 2 ? 2 : 0 });
      const one = await page.evaluate(() => window.__tm3.plays());
      ok(`a shift played is written down: its choices, how long each took, the third taken (${one.picks} choices, third ${one.third.taken}/${one.third.offered})`, one.ended === 1 && one.picks > 5 && one.third.taken > 0 && Object.values(one.states).some(v => v.medianMs > 0));
      await page.goto(`${base}/toko-move/?run=easy&seed=1009`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 }); await page.waitForTimeout(500);
      await page.goto(`${base}/toko-move/?run=easy&seed=1009`, { waitUntil: 'load' }); await ready(page);
      const two = await page.evaluate(() => window.__tm3.plays());
      ok(`a shift left mid-way is a QUIT, with the state it was left in (${JSON.stringify(two.quitAt)})`, two.ended === 2 && two.quits === 1 && two.quitAt.dispatch === 1);
      const t = await page.evaluate(() => { document.getElementById('playsBtn').click(); return { b: document.getElementById('playsBtn').textContent, box: !document.getElementById('playsBox').hidden, txt: document.querySelector('.playsText').textContent }; });
      ok(`the title offers the readout to copy back (${t.b}: ${t.txt.split('\n')[0]})`, t.b === 'YOUR PLAY LOG · 2' && t.box && /^Toko Move play log · v[\d.]+ · 2 shifts \(1 left early\)/.test(t.txt) && /Third option taken/.test(t.txt));
      ok('no page or network errors (the play log)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── story arcs (v3.4, ACT1.md §10): a second run meets Dispatch, and the city remembers
    {
      const ctx = await browser.newContext(PHONE); await seedRuns(ctx, { easy: { done: true, stars: 2, plays: 1 } });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1002`, { waitUntil: 'load' }); await ready(page);
      const before = await page.evaluate(() => localStorage.getItem('tokoMoveMemory'));
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      let met = null;
      const seen = await playOut(page, { onCard: async c => { if (!met && /^Dispatch here\./.test(c.line)) met = c; } });
      const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('tokoMoveMemory') || '{}'));
      ok(`a second run opens with Dispatch, a card like any other (${met?.line})`, !!met && met.kind === 'story' && met.buttons.length === 3);
      ok(`and the city remembers it after the run (${before} → ${JSON.stringify(kept)})`, seen.end && !before && kept.dispatch === 1);
      ok('no page or network errors (arcs)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── the rival and the sealed parcel (v3.5, ACT1.md §11): a fourth run of MEDIUM
    {
      const ctx = await browser.newContext(PHONE); await seedRuns(ctx, { easy: { done: true, stars: 2, plays: 2 }, medium: { plays: 1 } });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=medium&seed=1002`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await playOut(page);
      const sealed = seen.cards.find(c => c.kind === 'dispatch' && /^A sealed parcel\./.test(c.line)), race = seen.cards.find(c => / The other courier wants it too\.$/.test(c.line));
      ok(`a fourth run deals a sealed parcel, and its stop is hidden on the strip (${sealed?.line} · ${seen.strips.find(x => /SEALED/.test(x)) || 'no SEALED strip'})`, !!sealed && seen.strips.some(x => /SEALED · \S+/.test(x)));
      ok(`MEDIUM deals a race, its clock on the button (${race?.stakes?.[0]})`, !!race && /^beat \d\d:\d\d /.test(race.stakes[0] || ''));
      const note = await page.evaluate(() => JSON.parse(localStorage.getItem('tokoMoveNotebook') || '[]'));
      ok(`the race is settled on the stamp, and the sealed drop writes the notebook (${note[0]})`, seen.stamps.some(x => /You beat the other courier|She got there first/.test(x)) && note.length >= 1 && seen.stamps.some(x => x.includes(note[0].split(' · ').slice(1).join(' · '))));
      ok('no page or network errors (rival, sealed)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── the daily and the week on the journey (v3.6, ACT1.md §12)
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?daily&date=2026-11-04`, { waitUntil: 'load' }); await ready(page);
      const t = await page.evaluate(() => ({ mode: window.__tm3.mode, when: document.getElementById('titleWhen').textContent, goal: document.getElementById('titleGoal').textContent, classic: !!window.__tm }));
      ok(`?daily is the journey now: today's shift for everyone (${t.when} · ${t.goal.slice(0, 40)})`, t.mode === 'daily' && !t.classic && /^Daily \d+ · 4 Nov/.test(t.when) && /same shift for everyone/.test(t.goal));
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const seen = await playOut(page);
      const end = await page.evaluate(() => ({ title: document.getElementById('endTitle').textContent, stats: document.getElementById('endStats').textContent, rec: JSON.parse(localStorage.getItem('tokoMoveDaily') || '{}')['2026-11-04'], share: document.getElementById('shareText')?.textContent || '' }));
      ok(`the daily ends on its grid, stands as the day's result, and has a line to send (${end.share.split('\n').slice(0, 2).join(' / ')})`, seen.end && /^DAILY \d+/.test(end.title) && /day's result/.test(end.stats) && !!end.rec && /^Toko Move · Daily \d+ · 4 Nov\n[🟩🟨⬛]+ · €\d+/.test(end.share));
      // a second finish the same day is practice: the first stands
      await page.goto(`${base}/toko-move/?daily&date=2026-11-04`, { waitUntil: 'load' }); await ready(page);
      const stands = await page.evaluate(() => document.getElementById('mutRow').textContent);
      ok(`and the title says what stands (${stands.slice(0, 40)})`, /TODAY'S STANDS/.test(stands) && /practice/.test(stands));
      // the week: seeded at Friday with four days banked, Friday decides the rent
      await page.evaluate(() => { const days = ['none', 'none', 'match', 'market', 'helsinki']; const sh = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'].map((name, i) => ({ name, day: days[i], score: 1000, euros: 100, results: ['ok', 'ok', 'ok', 'ok'], drops: 0, tips: 0, left: false, trail: [] }));
        localStorage.setItem('tokoMoveWeek3', JSON.stringify({ seed: 4242, day: 4, days, shifts: sh, started: null, live: null, kit: [], nights: {} })); });
      await page.goto(`${base}/toko-move/?week`, { waitUntil: 'load' }); await ready(page);
      const wt = await page.evaluate(() => ({ mode: window.__tm3.mode, when: document.getElementById('titleWhen').textContent, goal: document.getElementById('titleGoal').textContent, strip: document.querySelector('.weekStrip')?.textContent || '' }));
      ok(`?week is the journey now: Friday, €400 banked of the rent (${wt.when} · ${wt.goal})`, wt.mode === 'week' && /^Week 4242 · FRIDAY/.test(wt.when) && /€400 of the €400 rent/.test(wt.goal) && /MON€100/.test(wt.strip));
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 });
      const wk = await playOut(page);
      const fri = await page.evaluate(() => ({ stats: document.getElementById('endStats').textContent, again: document.getElementById('again').textContent, w: JSON.parse(localStorage.getItem('tokoMoveWeek3') || 'null'), classic: localStorage.getItem('tokoMoveWeek') }));
      ok(`Friday closes the week on the rent (${(fri.stats.match(/RENT PAID[^·]*· €\d+ over|SHORT €\d+ ON THE RENT/) || [])[0]} · ${fri.again})`, wk.end && /RENT PAID|SHORT/.test(fri.stats) && fri.w?.day === 5 && fri.again === 'A NEW WEEK');
      ok('and a ?classic week is never touched', fri.classic === null);
      ok('no page or network errors (daily, week)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── a 320px phone: the pill still clears both corners, scaled if it must be
    {
      const ctx = await browser.newContext({ ...PHONE, viewport: { width: 320, height: 640 } }); await seedRuns(ctx, { easy: { done: true }, medium: { done: true }, hard: { done: true } });
      const page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=night&seed=60`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play'); await page.waitForSelector('#v3panel .eventOpt', { timeout: 15000 }); await page.waitForTimeout(400);
      const t = await topRow(page), scale = Number((t.t.match(/scale\(([\d.]+)\)/) || [])[1] || 1);
      ok(`on a 320px phone the night pill clears the HUB button and ♪ (${t.left}–${t.right}px, ×${scale})`, t.hasHome && !t.home && !t.snd && scale >= 0.6);
      ok('no page or network errors (320px)', !errs.length, errs.slice(0, 3).join(' | '));
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
    // ── the board, polished (v3.8): it stands on the ground — the sea filled
    // where sea.js says the sea is, paper where the land is — read off the
    // pixels at real places across the whole frame of the first hop
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1002`, { waitUntil: 'load' }); await ready(page);
      const info0 = await page.evaluate(() => window.__tm3.board());
      ok(`the board stands on the ground: a solved sea, ${info0.streets} streets, ${info0.marks} landmarks`, info0.ground && info0.sea >= 1 && info0.islands >= 40 && info0.streets > 1000 && info0.marks >= 6);
      await page.tap('#play');
      for (let i = 0; i < 400; i++) { const s = await look(page); if (s.board && s.busy) break; if (!s.busy && s.buttons.length) { await page.tap('#v3panel .eventOpt[data-i="0"]').catch(() => {}); await page.waitForTimeout(250); } else await page.waitForTimeout(40); }
      await page.waitForTimeout(150);
      const { view, ms } = await page.evaluate(() => window.__tm3.board());
      const { seaRings, isSea } = await import(require('url').pathToFileURL(path.join(ROOT, 'toko-move/js/sea.js')).href);
      const water = JSON.parse(fs.readFileSync(path.join(ROOT, 'toko-move/cities/ground/helsinki-water.json'), 'utf8')), sea = seaRings(water), bb = water.boundingBox;
      const pts = []; if (view) for (let i = 1; i < 12; i++) for (let j = 2; j < 20; j++) { const lat = view.n + (view.s - view.n) * j / 22, lon = view.w + (view.e - view.w) * i / 12;
        if (lat > bb.s + 0.003 && lat < bb.n - 0.003 && lon > bb.w + 0.004 && lon < bb.e - 0.004) pts.push([lat, lon]); }
      const px = await page.evaluate(p => window.__tm3.probe(p), pts), blue = c => !!c && c[2] - c[0] > 12;
      const wet = pts.map((p, k) => [isSea(sea, p[0], p[1], water.areas), blue(px[k])]), sw = wet.filter(w => w[0]), sl = wet.filter(w => !w[0]);
      const hitW = sw.filter(w => w[1]).length / Math.max(1, sw.length), hitL = sl.filter(w => !w[1]).length / Math.max(1, sl.length);
      ok(`where the sea is, the board paints water (${sw.length} sea points, ${(100 * hitW).toFixed(0)}% blue; ${sl.length} land points, ${(100 * hitL).toFixed(0)}% not) · base drawn in ${ms?.toFixed(0)} ms`, sw.length >= 8 && sl.length >= 30 && hitW >= 0.85 && hitL >= 0.9);
      ok('no page or network errors (the board)', !errs.length, errs.slice(0, 3).join(' | '));
      await ctx.close();
    }
    // ── scenarios in the scene (v3.9): a stop card's subject stands in the
    // scene while it is played (EASY seed 1000 deals the vappu student second)
    {
      const ctx = await browser.newContext(PHONE), page = await ctx.newPage(), errs = watch(page);
      await page.goto(`${base}/toko-move/?run=easy&seed=1000`, { waitUntil: 'load' }); await ready(page);
      await page.tap('#play');
      const actorNow = () => page.evaluate(() => { const el = document.querySelector('#v3frame .L.actor:not(.out)'); return el ? { id: el.dataset.actor, bg: getComputedStyle(el).backgroundImage } : null; });
      let met = null, after = null, card = '';
      for (let i = 0; i < 400; i++) { const s = await look(page); card = await page.evaluate(() => document.querySelector('#v3panel .eventCard')?.dataset.card || '');
        if (!met && card === 'vappu' && !s.busy && s.buttons.length) { await page.waitForTimeout(500); met = await actorNow(); await page.tap('#v3panel .eventOpt[data-i="1"]').catch(() => {}); await page.waitForTimeout(300); continue; }
        if (met && card && card !== 'vappu' && !s.busy && s.buttons.length) { after = await actorNow(); break; }
        if (s.end) break;
        if (!s.busy && s.buttons.length) { await page.tap('#v3panel .eventOpt[data-i="0"]').catch(() => {}); await page.waitForTimeout(250); } else await page.waitForTimeout(40); }
      ok(`the student in the white cap stands at the stop while the vappu card is played (${met?.id || 'nobody'})`, met?.id === 'vappu' && /07-actor-vappu\.webp/.test(met.bg));
      ok(`and is gone once the card is answered (next: ${card}, actor ${after?.id || 'none'})`, !!met && after?.id !== 'vappu');
      ok('no page or network errors (scenarios)', !errs.length, errs.slice(0, 3).join(' | '));
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
