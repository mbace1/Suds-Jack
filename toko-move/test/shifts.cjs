// CAN A SHIFT BE WON, as a number.
//
// Nothing in this project had ever finished a shift. The gates certify that a
// job can be taken, a tram caught, a miss counted; none of them asks whether
// three deliveries fit in three thousand ticks, and the one time a person
// tried (v2.34, by hand, twice) the answer was 0/3 both times. This drives the
// real game — the real timetable, the real challenge, the real mobility
// controller — through the same commands the buttons call, and reports how
// often a shift ends ALL DELIVERED and where the others die.
//
// The fleet and the offers are deterministic (hashes, not rolls), so one bot
// playing one policy is ONE shift, not a sample. The variation that matters is
// the player's: which of three jobs, which of three plans, whether to wait or
// walk. So the bot is a family — a handful of named policies, plus RANDOM-BUT-
// SANE bots seeded 1..N that choose among the offered options the way a
// player who reads the panel might — and the report is a distribution.
//
// Time is stepped with flow.runTicks(1) between decisions, never the wall
// clock: a shift runs in well under a second and 200 of them in minutes.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const GATE = process.argv.includes('--gate');
const SURVEY = process.argv.includes('--survey');   // play the whole day with no target: how many deliveries does a day hold?
const N = Number(process.argv.find(a => /^\d+$/.test(a)) || (GATE ? 40 : 200));
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404); return res.end('no'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

// One shift, inside the page. `policy` is {job, plan, seed}: job/plan name a
// rule or 'random' (drawn from a seeded rng so a run can be replayed).
const playShift = async (page, policy) => page.evaluate(async (policy) => {
  const tm = window.__tm, flow = tm.flow, ch = tm.challenge, mob = tm.mobility, city = tm.city;
  if (policy.target) ch.targetOverride = policy.target;
  const { routeChoices } = globalThis.__tmRouteChoiceCore;
  const DAY = flow.clock.ticksPerDay;
  let s = (policy.seed * 2654435761) >>> 0;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const layerFor = line => tm.transit.layers.find(x => x.id === line.sourceId);
  const idxOf = (layer, id) => { const n = city.resolved[id]; let bi = 0, bd = Infinity;
    for (let i = 0; i < layer.path.length; i++) { const q = layer.path[i], d = (q[0] - n.lat) ** 2 + (q[1] - n.lon) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
  const dirOf = (layer, a, b) => { const i = idxOf(layer, a), j = idxOf(layer, b); return i === j ? null : (j > i ? 1 : -1); };
  const arrival = choice => { const leg = choice.legs[0], layer = layerFor(leg.line); if (!layer) return { ready: false, eta: null };
    const idx = idxOf(layer, leg.from), dir = dirOf(layer, leg.from, leg.to);
    const near = tm.liveNetwork.nearestTo(layer, idx, flow.clock.tick, 2.2, dir);
    if (near) return { ready: true, eta: 0, vehicle: near.vehicle };
    return { ready: false, eta: tm.liveNetwork.nextArrival(layer, idx, flow.clock.tick, dir), vehicle: null }; };
  const log = [], timeline = [];
  let waitTicks = 0, rideTicks = 0, chosen = null, chosenAt = 0, lastKind = null, catches = 0, transfers = 0, drops = 0;
  const say = (k, x) => log.push(`${flow.clock.tick}: ${k} ${x || ''}`.trim());
  { const realSay = ch.say; ch.say = m => { if (/^DROPPED/.test(String(m))) log.push(`${flow.clock.tick}: DROPPED ${m}`); return realSay?.(m); }; }

  // Which job. 'first' = the one the dispatcher lists first (Loop 47 puts the
  // reachable one there on job 1); 'cheapest' = lowest door-to-door estimate;
  // 'random' = any of the three.
  const chooseJob = () => { const offers = ch.offers; if (!offers.length) return null;
    if (policy.job === 'first') return offers[0];
    if (policy.job === 'cheapest') return offers.map(o => ({ o, c: tm.planCostFrom?.(o.stops[0], o.stops[1]) ?? 1e9 })).sort((a, b) => a.c - b.c)[0].o;
    return pick(offers); };
  // Which plan, from the three the panel would show. 'soonest' = catch the
  // first thing coming; 'total' = lowest door-to-door including the transfer
  // wait (what the panel prints); 'random' = any.
  const choosePlan = choices => { if (!choices.length) return null;
    const priced = choices.map(c => { const a = arrival(c), e = tm.planEstimateOf?.(c) || {}; return { c, a, total: e.total ?? 1e9, wait: a.eta ?? 1e9 }; });
    if (policy.plan === 'soonest') return priced.sort((x, y) => x.wait - y.wait)[0].c;
    if (policy.plan === 'total') return priced.sort((x, y) => x.total - y.total)[0].c;
    return pick(choices); };

  let eventsSeen = 0, eventCost = 0, handoffs = 0, ditherSince = null;
  while (flow.clock.tick < DAY && !ch.complete) {
    // Events: 'help' takes the first option, 'skip' the free one, 'random' either.
    if (tm.events?.pending) { const opts = tm.events.options(); const free = opts.findIndex(o => !o.cost);
      const i = policy.events === 'help' ? 0 : policy.events === 'skip' ? Math.max(0, free) : (rnd() < 0.5 ? 0 : Math.max(0, free));
      const r = tm.events.choose(i); eventsSeen++; eventCost += r.cost || 0; say('EVENT', `${opts[i]?.label}`); }
    const st = mob.status();
    if (st.kind !== lastKind) { timeline.push([flow.clock.tick, st.kind]); lastKind = st.kind; }
    if (!ch.active) {
      if (policy.dither) { if (ditherSince == null) ditherSince = flow.clock.tick;
        if (flow.clock.tick - ditherSince < policy.dither) { flow.runTicks(1); continue; } }
      const job = chooseJob(); if (job) { const wasHandoff = !!job.handoff && flow.clock.tick <= job.bonusUntil; const r = ch.acceptOffer(job.id); if (!r.error && wasHandoff) handoffs++; say('JOB', `${job.stops[0]}>${job.stops[1]} ${job.cargo} limit ${job.limit}${wasHandoff ? ' HANDOFF' : ''} ${r.error || ''}`); chosen = null; ditherSince = null; } }
    else if (st.kind === 'getoff') { const r = mob.getOff(); say('OFF', `${st.at} ${st.transfer ? 'transfer' : 'deliver'} ${r.error || ''}`); if (st.transfer) transfers++; chosen = null; }
    else if (st.kind === 'waiting') { waitTicks++;
      const from = ch.currentFrom(), to = ch.currentTo();
      const choices = routeChoices(city, from, to, 3);
      // Commit to a plan once, the way a player standing at a stop does, and
      // re-choose only if it has been more than 60 ticks with nothing lit.
      if (!chosen || flow.clock.tick - chosenAt > 60) { chosen = choosePlan(choices); chosenAt = flow.clock.tick;
        if (chosen) say('PLAN', `${chosen.legs.map(l => l.line.label).join('>')} wait ${arrival(chosen).eta}`); }
      // ON YOUR WAY: what the chosen line passes. 'yes' takes every drop on
      // the chosen line, 'random' flips a coin per offer, 'no' ignores them.
      if (chosen && policy.along && policy.along !== 'no' && tm.alongOffers) {
        for (const o of tm.alongOffers()) { if (o.line !== chosen.legs[0].line.label) continue;
          if (policy.along === 'yes' || rnd() < 0.5) { const r = ch.acceptAlong(o); if (!r.error) { drops++; say('DROP-TAKEN', `${o.stops[1]} on ${o.line}`); } } } }
      if (chosen) { const a = arrival(chosen); if (a.ready) { const r = mob.catchChoice(chosen, a.vehicle); if (!r.error) { catches++; say('CATCH', chosen.legs[0].line.label); } else say('CATCH-FAIL', r.error); } }
    }
    else if (st.kind === 'riding') rideTicks++;
    flow.runTicks(1);
  }
  const dropped = log.filter(l => / DROPPED/.test(l)).length;
  return { won: ch.complete, delivered: ch.index, eventsSeen, eventCost, holds: (tm.events?.holds || []).length,
    bestStreak: ch.bestStreak || 0, tips: ch.tips || 0, goodwill: ch.goodwill || 0, handoffs,
    rivalDelivered: tm.rival?.delivered || 0, rivalTook: tm.rival?.taken.length || 0, visited: tm.visited ? tm.visited.size : 0, tick: flow.clock.tick, score: ch.score, late: ch.late, drops, dropped,
    waitTicks, rideTicks, catches, transfers, lastKind, activeJob: ch.active ? `${ch.active.stops[0]}>${ch.active.stops[1]}` : null,
    leg: ch.leg, log, timeline };
}, policy);

server.listen(0, '127.0.0.1', async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  // FLEET=count:3 | headway:10,5 — swap the fleet before the shift starts, so
  // provisioning can be measured against the same jobs and the same policies.
  const FLEET = process.env.FLEET || '';
  const token = (fs.readFileSync(path.join(__dirname, '..', 'js', 'main-v212.js'), 'utf8').match(/live-network\.js\?v=(\d+)/) || [])[1];
  const boot = async () => { await page.goto(`${base}/toko-move/`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__tm?.mobility && window.__tm?.liveNetwork && globalThis.__tmRouteChoiceCore, null, { timeout: 30000 });
    if (FLEET) await page.evaluate(async ({ FLEET, token }) => {
      const { LiveNetwork } = await import(`./js/live-network.js?v=${token}`);
      const [kind, arg] = FLEET.split(':'), tm = window.__tm;
      const opts = { ticksPerDay: tm.flow.clock.ticksPerDay };
      if (kind === 'count') opts.vehiclesPerLine = Number(arg);
      else { const [t, m] = arg.split(',').map(Number); opts.headwayMinutes = { TRAM: t, SUBWAY: m }; }
      tm.liveNetwork = new LiveNetwork(tm.transit, opts);
    }, { FLEET, token });
    await page.click('#play'); await page.waitForTimeout(100); };
  if (FLEET) console.log(`fleet: ${FLEET}`);
  const named = [
    { name: 'first job · soonest tram', job: 'first', plan: 'soonest', seed: 1 },
    { name: 'first job · best total', job: 'first', plan: 'total', seed: 1 },
    { name: 'cheapest job · soonest tram', job: 'cheapest', plan: 'soonest', seed: 1 },
    { name: 'cheapest job · best total', job: 'cheapest', plan: 'total', seed: 1 },
    { name: 'cheapest · total · every drop', job: 'cheapest', plan: 'total', seed: 1, along: 'yes' },
    { name: 'dawdler · reads the whole board', job: 'cheapest', plan: 'total', seed: 1, along: 'yes', dither: 400 },
    { name: 'first · soonest · every drop', job: 'first', plan: 'soonest', seed: 1, along: 'yes' },
  ];
  const results = [];
  const run = async (policy, label) => { await boot(); const r = await playShift(page, policy); results.push({ label, policy, ...r }); return r; };
  console.log('NAMED POLICIES');
  for (const p of named) { const r = await run(p, p.name);
    console.log(`  ${r.won ? 'WIN ' : 'LOSS'} ${p.name.padEnd(30)} ${r.delivered} delivered at tick ${r.tick} · wait ${r.waitTicks} ride ${r.rideTicks} · catches ${r.catches} transfers ${r.transfers} · drops taken ${r.drops} made ${r.dropped} · ended ${r.lastKind}${r.activeJob ? ' on ' + r.activeJob : ''}`); }
  if (SURVEY) {
    console.log(`\nSURVEY × ${N} — random-but-sane bots, whole day, no target`);
    const got = [], scores = [], drops = [];
    for (let i = 1; i <= N; i++) { const r = await run({ job: 'random', plan: 'random', seed: i, along: 'random', target: 99 }, `survey ${i}`); got.push(r.delivered + r.dropped); scores.push(r.score); drops.push(r.dropped); if (i % 25 === 0) process.stdout.write(`  ${i}… `); }
    got.sort((a, b) => a - b); const hist = {}; for (const g of got) hist[g] = (hist[g] || 0) + 1;
    console.log(`\n  deliveries + drops per day: ${Object.entries(hist).map(([k, v]) => `${k}:${v}`).join(' ')}`);
    for (const t of [3, 4, 5, 6, 7, 8]) console.log(`  target ${t} → ${(got.filter(g => g >= t).length / N * 100).toFixed(0)}% would finish`);
    console.log(`  mean score ${(scores.reduce((a, b) => a + b, 0) / N).toFixed(0)} · mean drops made ${(drops.reduce((a, b) => a + b, 0) / N).toFixed(1)}`);
    await browser.close(); server.close(); return;
  }
  console.log(`\nRANDOM-BUT-SANE BOTS × ${N}`);
  let wins = 0; const byDelivered = [0, 0, 0, 0, 0, 0, 0], endedIn = {}, t0 = Date.now();
  for (let i = 1; i <= N; i++) { const r = await run({ job: 'random', plan: 'random', seed: i, along: 'random', events: 'random' }, `random ${i}`);
    if (r.won) wins++; byDelivered[Math.min(6, r.delivered)]++; endedIn[r.lastKind] = (endedIn[r.lastKind] || 0) + 1;
    if (i % 25 === 0) process.stdout.write(`  ${i}… `); }
  console.log(`\n  win rate ${(wins / N * 100).toFixed(1)}% · deliveries 0/1/2/3/4/5/6+: ${byDelivered.join(' / ')} · ended while ${JSON.stringify(endedIn)} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  const rnd = results.filter(r => r.policy.job === 'random');
  const avg = k => (rnd.reduce((a, r) => a + r[k], 0) / rnd.length).toFixed(0);
  console.log(`  mean waiting ${avg('waitTicks')}t · riding ${avg('rideTicks')}t · catches ${avg('catches')} · transfers ${avg('transfers')} · drops taken ${avg('drops')} made ${avg('dropped')} · events answered ${avg('eventsSeen')} (cost ${avg('eventCost')}t) · holds ${avg('holds')}\n  best streak ${avg('bestStreak')} · tips ${avg('tips')} · goodwill ${avg('goodwill')} · hand-offs taken ${avg('handoffs')}\n  rival delivered ${avg('rivalDelivered')} · jobs they took from you ${avg('rivalTook')} · stops visited ${avg('visited')}`);
  // First-job anatomy: how long from shift start to the first delivery.
  const firstDelivery = rnd.map(r => { const l = r.log.find(x => / OFF .* deliver| DROPPED/.test(x)); return l ? Number(l.split(':')[0]) : null; }).filter(x => x != null);
  firstDelivery.sort((a, b) => a - b);
  const q = p => firstDelivery[Math.floor(p * (firstDelivery.length - 1))];
  console.log(`  first delivery lands at tick: min ${q(0)} · median ${q(.5)} · p90 ${q(.9)} · max ${q(1)} (${firstDelivery.length} of ${rnd.length} ever delivered once)`);
  fs.writeFileSync(path.join(__dirname, '..', 'shifts.out.json'), JSON.stringify(results.map(r => ({ ...r, timeline: r.timeline, log: r.log.slice(0, 60) })), null, 1));
  console.log(`  full logs → toko-move/shifts.out.json`);
  await browser.close(); server.close();
  // AS A GATE. Measured at v2.35: random-but-sane 63.5% over 200 (sd ≈ 3.4),
  // the cheapest-job policies won at tick 858. The floors sit far enough below
  // that a red here is the fleet or the dispatcher, not the dice: 40% for the
  // random bots at N=40 (sd ≈ 7.6, so three below), and the cheapest-job bot
  // must WIN, since a shift a sensible player cannot finish is the bug this
  // file exists to catch.
  if (GATE) {
    let fail = 0; const ok = (c, m) => { c ? 0 : fail++; console.log(`${c ? 'ok  ' : 'FAIL'}  ${m}`); };
    const rate = wins / N * 100;
    ok(rate >= 40, `random-but-sane bots win at least 40% of shifts (${rate.toFixed(1)}%)`);
    const best = results.filter(r => r.policy.job === 'cheapest');
    ok(best.every(r => r.won), `a player who takes the cheapest job finishes the shift (${best.map(r => r.delivered + '/3').join(', ')})`);
    ok(byDelivered[0] === 0, `no bot ends a shift with nothing delivered (${byDelivered[0]} did)`);
    const made = rnd.reduce((a, r) => a + r.dropped, 0);
    ok(made > 0, `drops on the way are offered, taken and handed over (${made} across ${rnd.length} bots)`);
    const answered = rnd.reduce((a, r) => a + r.eventsSeen, 0), held = rnd.reduce((a, r) => a + r.holds, 0);
    ok(answered >= rnd.length, `events fire and get answered — at least one a shift on average (${answered} across ${rnd.length} bots)`);
    ok(held >= rnd.length * 0.5, `disruptions happen (${held} holds across ${rnd.length} bots)`);
    const chained = rnd.filter(r => r.bestStreak >= 2).length, took = rnd.reduce((a, r) => a + r.handoffs, 0);
    ok(chained >= rnd.length * 0.5, `an on-time chain is reachable — half the bots get to ×1.25 or better (${chained} of ${rnd.length})`);
    ok(took > 0, `hand-offs are offered at the door and taken (${took} across ${rnd.length} bots)`);
    const rivalWorked = rnd.filter(r => r.rivalDelivered > 0).length;
    ok(rivalWorked === rnd.length, `the other courier works every shift (${rivalWorked} of ${rnd.length})`);
    // A decisive player never loses a job to them, which is the design — so
    // the only bot that can measure the claim is one that dawdles, and the
    // random bots must show it costs a decisive one nothing.
    const dawdler = results.find(r => r.policy.dither), decisive = rnd.reduce((a, r) => a + r.rivalTook, 0);
    ok(dawdler && dawdler.rivalTook > 0, `a courier who reads the whole board loses one (${dawdler?.rivalTook ?? 0} taken)`);
    ok(decisive === 0, `and a decisive one loses none (${decisive} across ${rnd.length} bots)`);
    console.log(`\nshifts: ${10 - fail} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
  }
});
