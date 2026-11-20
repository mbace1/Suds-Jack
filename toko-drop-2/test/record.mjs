// record.mjs — the play record (js/record.js, v61), in bare node: what it
// keeps and how many, the entry a finished room and a finished run leave, and
// that the text a person pastes reads back.
//
// Usage: node test/record.mjs           (exit 1 on any failure)
import { readFileSync } from 'node:fs';
import { createWorld, step } from '../js/sim/world.js?v=158';
import { TUNING as T } from '../js/tuning.js?v=158';
import { rooms } from '../js/sim/director/campaign.js?v=158';
import * as record from '../js/record.js?v=158';
import { Meter, device, Quality } from '../js/meter.js?v=158';

let failed = 0, passed = 0;
const check = (c, ok, d = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${c}${d ? ` — ${d}` : ''}`); };
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
// main.js's store, over a map
const memStore = () => { const m = new Map(); return { str: (k) => m.get(k) ?? '', num: (k) => Number(m.get(k)) || 0, set: (k, v) => m.set(k, String(v)), m }; };
const how = { input: 'touch', screen: 'portrait', date: new Date(2026, 9, 29, 14, 5) };
// the version this tree is at: VERSIONS.md's top entry, which bump-version.sh moves with every ?v= token
const V = Number(readFileSync(new URL('../VERSIONS.md', import.meta.url), 'utf8').match(/^## v(\d+) /m)[1]);

// keeping
{
  const S = memStore();
  check('an empty record reads as nothing', record.read(S).length === 0);
  for (let i = 0; i < 7; i++) record.add(S, { k: 'r', n: i }, 5);
  const a = record.read(S);
  check('it keeps the newest `cap` and drops the oldest', a.length === 5 && a[0].n === 2 && a[4].n === 6, JSON.stringify(a.map((x) => x.n)));
  S.set('toko2.record', '{not json');
  check('a broken record reads as nothing, rather than stopping the game', record.read(S).length === 0);
  check('the cap is TUNING.record.cap', T.record.cap >= 100, String(T.record.cap));
  check('the version is the module\'s own cache token', record.VERSION === V, `${record.VERSION} against VERSIONS.md's v${V}`);
}

// a room: played to its end (the hero stands still and goes down, or the clock runs out)
{
  const R = rooms()[0], level = JSON.parse(readFileSync(new URL(`../levels/${R.id}.json`, import.meta.url), 'utf8'));
  const w = createWorld({ seed: 7, mode: 'campaign', room: { ...R, level } });
  for (let i = 0; i < (level.duration + 5) / T.sim.dt && !w.over; i++) step(w, IDLE);
  const e = record.entryFor(w, 'campaign', [], how);
  check('a room ends', w.over && !!w.roomResult, JSON.stringify(w.roomResult));
  check('…and its entry says which room, how it went, and the grade', e.k === 'r' && e.id === R.id && e.g === w.roomResult.grade && e.o === w.roomResult.outcome && e.s === w.roomResult.score && e.h === 0, JSON.stringify(e));
  check('…with when, on what input and which way up', e.v === V && e.at === '2026-10-29 14:05' && e.i === 't' && e.or === 'p', JSON.stringify(e));
}

// a run: the lives it lost, where
{
  const w = createWorld({ seed: 3, mode: 'arcade' }), lost = [];
  w.hero.invinc = 0;
  for (let i = 0; i < 90 / T.sim.dt && !w.over; i++) {
    step(w, IDLE);
    for (const ev of w.events) if (ev.type === 'hurt') lost.push([w.wave, ev.by ?? '?']);
  }
  const e = record.entryFor(w, 'arcade', lost, { ...how, input: 'pad', screen: 'landscape' });
  check('a run that stands still goes down', w.over && lost.length === T.hero.lives, `${w.over} ${lost.length}`);
  check('…and its entry has the world, the wave, the score and every life it lost', e.k === 'a' && e.w === 1 && e.n === w.wave && e.s === w.score && e.d.length === lost.length && e.won === 0, JSON.stringify(e));
  check('…on a pad, landscape', e.i === 'p' && e.or === 'l');
  check('HARDCADE is its own kind', record.entryFor({ ...w, roomResult: null }, 'hardcade', [], how).k === 'h');
}

// left from the pause menu: kept, as a quit
{
  const R = rooms()[1], level = JSON.parse(readFileSync(new URL(`../levels/${R.id}.json`, import.meta.url), 'utf8'));
  const w = createWorld({ seed: 9, mode: 'campaign', room: { ...R, level } });
  for (let i = 0; i < 3 / T.sim.dt; i++) step(w, IDLE);
  const e = record.entryFor(w, 'campaign', [], how, true);
  check('a room left before its end is kept as a quit, with no grade', e.k === 'r' && e.id === R.id && e.o === 'quit' && e.g === null && e.t > 2.9, JSON.stringify(e));
  const a = createWorld({ seed: 4, mode: 'arcade' });
  for (let i = 0; i < 3 / T.sim.dt; i++) step(a, IDLE);
  check('a run left from the pause menu says so', record.entryFor(a, 'arcade', [], how, true).q === 1);
  check('…and one played to its end does not', !('q' in record.entryFor(a, 'arcade', [], how)));
}

// how the phone ran it (v63, js/meter.js)
{
  const M = new Meter();
  for (let i = 0; i < 59; i++) M.frame(16.7, 1 / 60);
  check('under a second of frames says nothing', M.summary() === null);
  M.reset();
  // a 60 Hz phone: one frame in fifty late (40 ms), and the game keeping up
  for (let i = 0; i < 1000; i++) { const ms = i % 50 === 49 ? 40 : 1000 / 60; M.frame(ms, ms / 1000); }
  let f = M.summary();
  check('a 60 Hz phone: the median, the 95th, the late share, the refresh, the game at full speed', f[0] === 16.7 && f[1] === 16.7 && f[2] === 2 && f[3] === 60 && f[4] === 1, JSON.stringify(f));
  M.frame(5000, 0); M.frame(-3, 0);
  check('a hidden tab\'s gap is no frame', M.n === 1000);
  M.reset();
  for (let i = 0; i < 600; i++) M.frame(1000 / 120, 1 / 120);
  check('a 120 Hz phone reads 120', M.summary()[3] === 120, JSON.stringify(M.summary()));
  M.reset();
  // a phone that cannot keep up: 120 ms frames, and a frame catches up 5 steps at most (TUNING.sim.maxSteps)
  for (let i = 0; i < 200; i++) M.frame(i % 4 ? 120 : 1000 / 60, i % 4 ? T.sim.maxSteps * T.sim.dt : 1 / 60);
  f = M.summary();
  check('a phone that cannot keep up: most frames late, and the game slowed', f[2] === 75 && f[4] < 0.75 && f[4] > 0.7, JSON.stringify(f));
  check('…and its slow frames read as slow as they were, not 100 ms', f[1] === 120, JSON.stringify(f));
  M.reset();
  for (let i = 0; i < 100; i++) M.frame(300, T.sim.maxSteps * T.sim.dt);
  f = M.summary();
  check('a phone with every frame slow: every frame late, whatever its refresh reads', f[0] === 300 && f[2] === 100 && f[4] < 0.3, JSON.stringify(f));
  check('the phone in a few words', device({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', touchPoints: 5, width: 1170, height: 2532, ratio: 3, backend: 'webgpu', gels: 'classic', goo: true }) === 'ios 1170x2532@3 webgpu classic goo');
  check('an iPad says it is a Mac, but has touch', device({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', touchPoints: 5, width: 2048, height: 1536, ratio: 2, backend: 'webgl2', gels: 'sdf', goo: false }) === 'ios 2048x1536@2 webgl2 sdf');
  check('a Mac with no touch is a Mac, an Android an Android', device({ ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', touchPoints: 0, width: 1, height: 1, ratio: 1, backend: 'webgpu', gels: 'classic' }).startsWith('mac ') &&
    device({ ua: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)', touchPoints: 5, width: 1, height: 1, ratio: 2.625, backend: 'webgpu', gels: 'classic' }) === 'android 1x1@2.63 webgpu classic');

  const R = rooms()[0], level = JSON.parse(readFileSync(new URL(`../levels/${R.id}.json`, import.meta.url), 'utf8'));
  const w = createWorld({ seed: 7, mode: 'campaign', room: { ...R, level } });
  const phone = { ...how, frames: [16.7, 18.2, 1.5, 60, 1], device: 'android 1080x2400@2.75 webgpu classic goo', letGos: { flick: 4, near: 1, release: 9, tap: 0 } };
  const e = record.entryFor(w, 'campaign', [], phone, true);
  check('an entry says how the phone ran it: the frames, the phone, the aim stick\'s let-gos', JSON.stringify(e.f) === '[16.7,18.2,1.5,60,1]' && e.dv === phone.device && JSON.stringify(e.fl) === '[4,1,9,0]', JSON.stringify(e));
  check('…and none on a pad or the keys', !('fl' in record.entryFor(w, 'campaign', [], { ...phone, letGos: { flick: 0, near: 0, release: 0, tap: 0 } })));
  check('…and no frames when there were too few (as an older entry reads)', !('f' in record.entryFor(w, 'campaign', [], { ...phone, frames: null })) && !('f' in record.entryFor(w, 'campaign', [], how)));
  check('OPTIONS reads the newest entry\'s frames', JSON.stringify(record.lastFrames([{ f: [1, 2, 3, 60, 1] }, { k: 'a' }, { f: [9, 9, 9, 30, 0.8] }, { k: 'r' }])) === '[9,9,9,30,0.8]' && record.lastFrames([{ k: 'a' }]) === null);
}

// handing it over and reading it back
{
  const S = memStore();
  record.add(S, { k: 'r', id: 'first-light', g: 'A', s: 52000 }, 10);
  record.add(S, { k: 'a', w: 4, n: 29, s: 900000, d: [[12, 'globbo']] }, 10);
  const text = record.pack(record.read(S), how.date);
  check('the text starts with two lines a person can read', text.startsWith(`TOKO DROP 2.0 · PLAY RECORD\n1 rooms · 1 arcade runs · v${V} · 2026-10-29 14:05\n`), text.split('\n').slice(0, 2).join(' | '));
  const back = record.unpack(`here it is:\n${text}\n\nthanks`);
  check('it reads back from whatever a message put round it', back?.runs.length === 2 && back.runs[1].d[0][1] === 'globbo' && back.v === V, JSON.stringify(back));
  check('text that is not a record reads back as nothing', record.unpack('hello { there') === null && record.unpack('no json') === null);
}

// ── v86: the quality that steps down on a slow phone (js/meter.js Quality, Meter.recent) ──
{
  const Q = T.quality, m = new Meter();
  check('a meter with no window yet says nothing', m.recent(Q.window) === null);
  for (let i = 0; i < 200; i++) m.frame(16.7, 1 / 60);                // 3.3 s of clean 60 Hz
  const calm = m.recent(Q.window);
  check('a clean window reads no late frames and the game at full speed', calm && calm.late === 0 && Math.abs(calm.sim - 1) < 0.02 && calm.hz === 60, JSON.stringify(calm));
  check('…and the window starts again', m.recent(Q.window) === null);
  for (let i = 0; i < 40; i++) m.frame(90, 5 / 60);                   // 3.6 s of 11 Hz, the sim dropping frames
  const slow = m.recent(Q.window);
  check('a slow window reads late frames and the game behind', slow && slow.late > 90 && slow.sim < 0.95, JSON.stringify(slow));
  const q = new Quality(Q);
  check('the quality starts at the full picture', q.step === 0 && q.share === 1);
  check('a slow window steps it down one', q.judge(slow) && q.step === 1 && q.share === Q.steps[1]);
  for (let i = 0; i < 10; i++) q.judge(slow);
  check('…and never below the last step', q.step === Q.steps.length - 1);
  let moved = 0;
  for (let i = 0; i < Q.up.windows - 1; i++) moved += q.judge(calm) ? 1 : 0;
  check(`${Q.up.windows - 1} calm windows do not step it back up yet`, moved === 0 && q.step === Q.steps.length - 1);
  check('the next calm window does, by one', q.judge(calm) && q.step === Q.steps.length - 2);
  const r = new Quality(Q, 2); r.judge({ late: 10, sim: 1, n: 100 });
  check('a middling window holds the step and resets the calm count', r.step === 2 && r.calm === 0);
  check('a remembered step is clamped to the steps there are', new Quality(Q, 99).step === Q.steps.length - 1 && new Quality(Q, -3).step === 0);
  check('the device line says the step a run was drawn at', /q0\.72$/.test(device({ width: 1, height: 1, ratio: 1, backend: 'webgpu', gels: 'classic', goo: true, q: 0.72 })) && !/ q/.test(device({ width: 1, height: 1, ratio: 1, backend: 'webgpu', gels: 'classic', goo: true, q: 1 })));
}

console.log(failed ? `\n✗ record: ${failed} failed, ${passed} passed` : `✔ record: ${passed} checks`);
process.exit(failed ? 1 : 0);
