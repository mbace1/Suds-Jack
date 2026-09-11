// Flowsnow — the playthrough gate.
//
// smoke.cjs proves the INTERFACE: a tap starts a ride, the HUD reads the state,
// the recap is honest, the way home is there. It proves the ending by putting
// the rider at z = -2395 and stepping three seconds.
//
// Nothing proved the 2,400 m in between, and that is where the mountain lives.
// This gate rides all of it. It exists because of a bug it would have caught on
// its first run and smoke.cjs could not: `impact` is `max(0, -vn)`, so a grazing
// re-contact lands with an impact of exactly 0, `audio.land` fed that to a gain,
// and an exponential ramp to zero is a RangeError — thrown out of the physics
// step, costing that frame its render. Two ten-second holds never meet a
// grazing landing. A hundred and sixty seconds of mountain meets them constantly.
//
// It drives `debug.step` on purpose. AGENTS.md §4 is right that a debug hook
// must not stand in for the interface — but the interface is smoke.cjs's job,
// and what is under test here is whether the RUN is rideable, on a sandbox with
// no GPU that renders this at a handful of frames a second. The input it feeds
// is the same shape `input.read()` produces, and it goes through the same
// physicsStep the live loop calls.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.md': 'text/plain' };

let pass = 0, fail = 0;
const ok = (n, c, d) => { c ? (pass++, console.log('  ok   ' + n)) : (fail++, console.log('  FAIL ' + n + (d !== undefined ? ' → ' + d : ''))); };

const server = http.createServer((rq, rs) => {
  let p = decodeURIComponent(rq.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rs.writeHead(404); return rs.end('no'); }
  rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(rs);
});

server.listen(0, async () => {
  const base = 'http://localhost:' + server.address().port;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 640 } });
  p.setDefaultTimeout(90000);

  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  await p.goto(base + '/flowsnow/', { waitUntil: 'load' });
  await p.waitForFunction(() => window.__fs && window.__fs.debug, null, { timeout: 40000 });

  // Ride the whole mountain, steering toward the gully line the way a player
  // holding a lean does. `sampled` is every 100 m so a stall can be located
  // rather than merely detected.
  const run = await p.evaluate(() => {
    const F = window.__fs, d = F.debug, t = F.terrain;
    d.start();
    const sampled = [];
    let next = 100, guard = 0, slowest = Infinity, slowestAt = 0;
    // A throw inside the ride must be REPORTED with the metre it happened at,
    // not allowed out of the evaluate to kill the harness. The whole point of
    // this gate is the exception it caught on its first run; a gate that dies
    // instead of failing tells you less than one that names the spot.
    let threw = null;
    while (F.mode() === 'play' && guard++ < 600) {
      const s = F.state;
      const off = s.x - t.lineX(s.z);
      // The pilot is P on offset plus D on lateral drift, and the D term is not
      // a refinement — it is the difference between a gate that measures the
      // mountain and one that measures its own bad riding. Undamped, the bot
      // overshoots, pins the edge, and the edge scrubs nearly everything: a run
      // takes 340-476 s and reads 0.06 m/s mid-descent, which looks exactly
      // like a bog in the terrain and is not one. Damped, the same mountain
      // rides in ~150 s and never drops below its launch speed. Tuned in bare
      // node against the pure physics, because a browser sweep costs minutes
      // a row.
      const lean = Math.max(-0.45, Math.min(0.45, -(off * 0.03 + s.vx * 0.10)));
      try {
        d.step(1.0, { lean });
      } catch (e) {
        threw = { at: Math.round(F.state.dist), msg: String(e && e.message || e) };
        break;
      }
      const q = F.state;
      // past the launch: the first metres are simply the starting vz, and a
      // minimum taken there says nothing about whether the run bogs down
      if (q.dist > 50 && q.speed < slowest) { slowest = q.speed; slowestAt = Math.round(q.dist); }
      if (q.dist >= next) {
        sampled.push({ d: Math.round(q.dist), v: +q.speed.toFixed(1), depth: +q.depth.toFixed(2) });
        next += 100;
      }
    }
    const s = F.state;
    return {
      mode: F.mode(), guard, sampled, threw,
      dist: Math.round(s.dist), time: +s.time.toFixed(1), score: Math.round(s.score),
      top: +s.speedMax.toFixed(1), deepest: +s.deepBest.toFixed(2),
      falls: s.tumbles, airBest: +s.airBest.toFixed(2), slowest: +slowest.toFixed(1), slowestAt,
    };
  });

  ok('the mountain can be ridden from the top to the bottom', run.mode === 'done' && run.dist >= 2400,
    `${run.mode} at ${run.dist} m after ${run.guard} steps`);
  ok('and the ride itself never threw', !run.threw, run.threw && `at ${run.threw.at} m — ${run.threw.msg}`);
  ok('and nothing threw on the way down', errs.length === 0, errs.slice(0, 3).join(' | '));

  // A run nobody can finish is broken; a run that crawls is dull. Both are
  // findings, and only a full descent can tell them apart.
  ok('the descent never bogs down', run.slowest > 2, `${run.slowest} m/s at ${run.slowestAt} m`);
  ok('it is ridden at a downhill pace, not walked', run.time < 260, `${run.time} s`);
  ok('every 100 m of it was reached', run.sampled.length >= 23, run.sampled.length);

  // The run must offer both mediums to the same rider — the whole v2 decision
  // rests on the packed line and the deep field both being on the route.
  const shallow = run.sampled.filter(s => s.depth < 0.4).length;
  const deep = run.sampled.filter(s => s.depth > 0.8).length;
  ok('the route crosses packed snow', shallow >= 3, `${shallow} of ${run.sampled.length} samples`);
  ok('and deep snow', deep >= 3, `${deep} of ${run.sampled.length} samples`);

  ok('the recap is reached with a score', run.score > 0, run.score);

  console.log(`\n  ridden: ${run.dist} m in ${run.time} s · top ${Math.round(run.top * 3.6)} km/h · ` +
    `deepest ${run.deepest} m · best air ${run.airBest} s · falls ${run.falls} · score ${run.score}`);
  console.log(`  slowest ${run.slowest} m/s at ${run.slowestAt} m`);

  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  server.close();
  process.exit(fail ? 1 : 0);
});
