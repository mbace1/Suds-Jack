#!/usr/bin/env node
// music-render.mjs — the music (v58, js/music.js) rendered with no speaker,
// in headless Chromium's OfflineAudioContext, so it can be measured and
// listened to off the phone.
//
//   node scripts/music-render.mjs measure            every song at every level: loudness, peak, and where its energy sits,
//                                                    beside the game's own effects (a kill, a hit, a shot)
//   node scripts/music-render.mjs showcase [ids]     each song building a layer at a time to its boss and a sting
//                                                    (dist/music/<n>-<id>.wav, and .mp3 where ffmpeg is)
//   node scripts/music-render.mjs replay <world> [secs] [skill]
//                                                    a bot's real run of an arcade world, the music and every effect
//                                                    together, as the game would play them (worldWant, cueFor)
// --out <dir> (default dist/music)
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join, extname, normalize, sep, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { TUNING as T } from '../js/tuning.js?v=160';
import { compile, worldWant, cueFor } from '../js/music.js?v=160';
import { createWorld, step } from '../js/sim/world.js?v=160';
import { SKILLS, prng, think } from './bot.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const MODE = args[0] ?? 'measure', OUT = resolve(opt('--out', join(ROOT, 'dist/music')));
const M = T.music;
mkdirSync(OUT, { recursive: true });

// ── the page: the game's own modules, rendering offline ──────────────────────
const PAGE = `<!doctype html><meta charset="utf-8"><script type="module">
import { renderMusicWav, Music, cueFor } from './js/music.js?v=160';
import { Sound } from './js/audio.js?v=160';
import { wavBytes } from './js/intro/sfx.js?v=160';
import { TUNING } from './js/tuning.js?v=160';
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
window.render = async (id, o) => b64(await renderMusicWav(id, o));
// the live game's loop, offline: the context suspended every frame, the music's say set and its frame run,
// the frame's events handed to the sound and the music's cues, then on
window.replay = async (tl, { rate = 44100, music = true, sfx = true } = {}) => {
  const ctx = new OfflineAudioContext(2, Math.ceil(tl.seconds * rate), rate);
  const sound = new Sound(); sound.attach(ctx);   // the game's own master: its level and its limiter
  const m = new Music(); if (music) m.attach(ctx, sound.master);
  let wi = 0, ei = 0;
  for (const f of tl.frames) ctx.suspend(f.t).then(() => {
    while (ei < tl.events.length && tl.events[ei].t <= f.t + 1e-9) { const e = tl.events[ei++].e; if (sfx) sound.event(e); const c = cueFor(e); if (c && music) m.cue(c[0], c[1]); }
    if (music) { m.set(f.want); m.frame(); }
    ctx.resume();
  });
  return b64(wavBytes(await ctx.startRendering()));
};
window.T = TUNING;   // the parts mode mutes parts by their levels
window.ready = true;
</script>`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1));
  if (rel === '__music.html') { res.writeHead(200, { 'content-type': MIME['.html'] }); return res.end(PAGE); }
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT + sep) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const binary = [process.env.CHROMIUM, '/opt/pw-browsers/chromium'].find((b) => b && existsSync(b));
const profile = mkdtempSync(join(tmpdir(), 'music-render-'));
const proc = spawn(binary, ['--headless=new', '--no-sandbox', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--mute-audio', '--no-proxy-server', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'], detached: true });
const wsUrl = await new Promise((res, rej) => { let b = ''; proc.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); setTimeout(() => rej(new Error('no DevTools port')), 20000); });
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Runtime.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await send('Page.navigate', { url: `${base}__music.html` }, sessionId);
const evaluate = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }, sessionId); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
for (let i = 0; i < 100 && !(await evaluate('!!window.ready').catch(() => false)); i++) await new Promise((r) => setTimeout(r, 100));

// ── reading a WAV back, and what is in it ───────────────────────────────────
function pcm(b64) {
  const buf = Buffer.from(b64, 'base64'), n = (buf.length - 44) / 4, L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = buf.readInt16LE(44 + i * 4) / 32768; R[i] = buf.readInt16LE(46 + i * 4) / 32768; }
  return { buf, L, R, rate: buf.readUInt32LE(24) };
}
const db = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
function fft(re, im) {   // in place, radix 2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) {
      const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
      re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
      const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
}
const BANDS = [[0, 120, 'sub'], [120, 400, 'low'], [400, 2000, 'mid'], [2000, 6000, 'high'], [6000, 30000, 'air']];
// what a phone's speaker gives back of it: a second-order high-pass at 300 Hz (a Pixel's speaker has next to nothing under it)
function phone(x, rate, f = 300) {
  const w = (2 * Math.PI * f) / rate, cs = Math.cos(w), al = Math.sin(w) / (2 * 0.707), a0 = 1 + al;
  const b0 = (1 + cs) / 2 / a0, b1 = -(1 + cs) / a0, b2 = b0, a1 = (-2 * cs) / a0, a2 = (1 - al) / a0, y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; }
  return y;
}
function stats({ L, R, rate }, from = 0, to = Infinity) {
  const a = Math.floor(from * rate), b = Math.min(L.length, Math.floor(to * rate));
  let ss = 0, peak = 0, sp = 0;
  const mono = new Float32Array(L.length); for (let i = 0; i < L.length; i++) mono[i] = (L[i] + R[i]) / 2;
  const ph = phone(mono, rate);
  for (let i = a; i < b; i++) { const v = mono[i]; ss += v * v; sp += ph[i] * ph[i]; peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); }
  const N = 4096, band = BANDS.map(() => 0), hann = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  for (let o = a; o + N <= b; o += N) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = ((L[o + i] + R[o + i]) / 2) * hann[i];
    fft(re, im);
    for (let k = 1; k < N / 2; k++) { const f = (k * rate) / N, p = re[k] * re[k] + im[k] * im[k]; const j = BANDS.findIndex(([lo, hi]) => f >= lo && f < hi); if (j >= 0) band[j] += p; }
  }
  const tot = band.reduce((x, y) => x + y, 0) || 1;
  return { rms: db(Math.sqrt(ss / Math.max(1, b - a))), phone: db(Math.sqrt(sp / Math.max(1, b - a))), peak: db(peak), bands: band.map((x) => Math.round((100 * x) / tot)) };
}
// the loudest 50 ms of a render: how loud an effect is while it sounds
function loudest({ L, R, rate }, onPhone = false) {
  let x = new Float32Array(L.length); for (let i = 0; i < L.length; i++) x[i] = (L[i] + R[i]) / 2;
  if (onPhone) x = phone(x, rate);
  const w = Math.floor(rate * 0.05); let best = 0;
  for (let o = 0; o + w <= x.length; o += w >> 1) { let ss = 0; for (let i = o; i < o + w; i++) ss += x[i] * x[i]; best = Math.max(best, ss / w); }
  return db(Math.sqrt(best));
}
// to listen to: brought up to a listening level as a whole (EBU R128, -16 LUFS), so the music and the effects keep their balance
const mp3 = (wav) => { try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '160k', wav.replace(/\.wav$/, '.mp3')]); return true; } catch { return false; } };
const barS = (id) => { const C = compile(id); return C.step * C.S.bar; };

try {
  if (MODE === 'measure') {
    const rows = [];
    const only = args[1] && !args[1].startsWith('--') ? args[1].split(',') : Object.keys(M.songs), levels = (opt('--levels', '0,1,2,3,4,boss')).split(',').map((x) => (x === 'boss' ? x : Number(x)));
    for (const id of only) {
      const bar = barS(id), secs = bar * 9;
      for (const lv of levels) {
        const script = lv === 'boss' ? [{ at: 0, level: 4, boss: true }] : [{ at: 0, level: lv, lull: false }];
        const s = stats(pcm(await evaluate(`render(${JSON.stringify(id)}, { seconds: ${secs}, script: ${JSON.stringify(script)} })`)), bar, secs);
        rows.push({ id, lv, ...s });
      }
    }
    console.log('song       level   RMS dBFS  on a phone  peak    sub/low/mid/high/air %');
    for (const r of rows) console.log(`${r.id.padEnd(10)} ${String(r.lv).padEnd(6)} ${r.rms.toFixed(1).padStart(7)}  ${r.phone.toFixed(1).padStart(9)}  ${r.peak.toFixed(1).padStart(6)}   ${r.bands.join('/')}`);
    // the effects beside it: one at a time, each as loud as it gets
    const fx = [['kill', { type: 'kill', kind: 'globbo', m: 1 }], ['hit', { type: 'hit' }], ['hurt', { type: 'hurt' }], ['shot', { type: 'shot' }], ['heat', { type: 'heat', up: true, mult: 3 }]];
    for (const [name, e] of fx) {
      const tl = { seconds: 1, frames: [{ t: 0.05, want: {} }], events: [{ t: 0.05, e }] };
      const p = pcm(await evaluate(`replay(${JSON.stringify(tl)}, { music: false })`));
      console.log(`effect ${name.padEnd(5)} loudest 50 ms ${loudest(p).toFixed(1)} dBFS (on a phone ${loudest(p, true).toFixed(1)}), peak ${stats(p).peak.toFixed(1)}`);
    }
  } else if (MODE === 'parts') {
    // one part at a time, the rest muted: how loud each part is, through a phone's speaker
    const id = args[1] ?? 'grid', bar = barS(id), secs = bar * 9, S = M.songs[id];
    const parts = ['lead', 'arp', 'bass', 'pad', 'stab', 'drip', 'ping'].filter((p) => S[p]), drums = ['kick', 'snare', 'hat', 'ride', 'metal'];
    const keep = await evaluate(`JSON.stringify({ parts: Object.fromEntries(${JSON.stringify(parts)}.map((p) => [p, T.music.songs[${JSON.stringify(id)}][p].vol])), kit: Object.fromEntries(${JSON.stringify(drums)}.map((d) => [d, T.music.kit[d].vol])) })`);
    for (const solo of [...parts, ...drums]) {
      await evaluate(`(() => { const k = ${keep}, S = T.music.songs[${JSON.stringify(id)}]; for (const p in k.parts) S[p].vol = p === ${JSON.stringify(solo)} ? k.parts[p] : 0; for (const d in k.kit) T.music.kit[d].vol = d === ${JSON.stringify(solo)} ? k.kit[d] : 0; T.music.kit.kick.click = ${JSON.stringify(solo)} === 'kick' ? 0.1 : 0; T.music.kit.snare.toneVol = ${JSON.stringify(solo)} === 'snare' ? 0.12 : 0; })()`);
      const p = pcm(await evaluate(`render(${JSON.stringify(id)}, { seconds: ${secs}, script: [{ at: 0, level: 4, lull: false }] })`)), st = stats(p, bar, secs);
      console.log(`${id} ${solo.padEnd(6)} RMS ${st.rms.toFixed(1).padStart(6)}  on a phone ${st.phone.toFixed(1).padStart(6)}  its loudest 50 ms on a phone ${loudest(p, true).toFixed(1).padStart(6)}  ${st.bands.join('/')}`);
    }
  } else if (MODE === 'showcase') {
    const ids = (args[1] && !args[1].startsWith('--') ? args[1].split(',') : ['title', ...M.byWorld]);
    for (const [i, id] of ids.entries()) {
      const bar = barS(id);
      let at = 0;
      const script = [], add = (bars, want) => { script.push({ at, ...want }); at += bars * bar; };
      if (id === 'title') add(16, { level: 3, lull: false });
      else { add(2, { level: 1, lull: false }); add(4, { level: 2 }); add(4, { level: 3 }); add(4, { level: 4 }); add(4, { level: 4, boss: true }); script.push({ at, boss: false, sting: 'boss' }); at += 1; }
      const secs = at + 2.5, file = join(OUT, `${String(i).padStart(2, '0')}-${id}.wav`);
      writeFileSync(file, Buffer.from(await evaluate(`render(${JSON.stringify(id)}, { seconds: ${secs}, script: ${JSON.stringify(script)} })`), 'base64'));
      console.log(`${file}  ${secs.toFixed(1)} s  (${M.songs[id].name})${mp3(file) ? ' + mp3' : ''}`);
    }
  } else if (MODE === 'replay') {
    // a bot's run, as the game would play it: the frames' music say and the events, at 30 frames a second
    const world = Number(args[1] ?? 1), secs = Number(args[2] ?? 90), K = SKILLS[args[3] ?? 'sharp'];
    const w = createWorld({ seed: 4242, mode: 'arcade', world }), mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(4242) };
    const frames = [], events = [], FR = 1 / 30;
    let held = null, nextF = 0.1, end = secs, over = false;
    for (let i = 0; w.time < end; i++) {
      if (!w.over) { if (i % K.every === 0 || !held) held = think(w, mem, K); else held = { ...held, dash: false }; step(w, held); for (const e of w.events) events.push({ t: w.time, e: JSON.parse(JSON.stringify(e)) }); }
      else { w.time += T.sim.dt; if (!over) { over = true; end = Math.min(end, w.time + 3); } }
      while (nextF <= w.time) { frames.push({ t: nextF, want: w.over ? { song: null, duck: false } : { ...worldWant(w), duck: false, silent: false } }); nextF += FR; }
    }
    const noMusic = args.includes('--no-music'), file = join(OUT, `replay-world${world}-${Math.round(end)}s${noMusic ? '-sfx' : ''}.wav`);
    writeFileSync(file, Buffer.from(await evaluate(`replay(${JSON.stringify({ seconds: end, frames, events })}, { music: ${!noMusic} })`), 'base64'));
    const p = pcm(readFileSync(file).toString('base64'));
    let clip = 0, worst = [0, 0];
    for (let i = 0; i < p.L.length; i++) { const v = Math.max(Math.abs(p.L[i]), Math.abs(p.R[i])); if (v > 0.98) clip++; if (v > worst[0]) worst = [v, i / p.rate]; }
    console.log(`${file}  ${end.toFixed(0)} s, wave ${w.wave}, ${w.kills} kills, heat ×${1 + Math.floor(w.heat || 0)} at the end${w.over ? ', down' : ''}: RMS ${stats(p).rms.toFixed(1)} dBFS, peak ${stats(p).peak.toFixed(1)} at ${worst[1].toFixed(2)} s, ${clip} samples at full scale${mp3(file) ? ' + mp3' : ''}`);
    // what the music was asked, as it changed: the song, the level, a boss, a lull, a hit
    let was = '', trace = [];
    for (const f of frames) { const k = `${f.want.song ?? '—'} L${f.want.level ?? '-'}${f.want.boss ? ' BOSS' : ''}${f.want.lull ? ' lull' : ''}`; if (k !== was) { trace.push(`${f.t.toFixed(1)}s ${k}`); was = k; } }
    const hits = events.filter((x) => x.e.type === 'hurt').map((x) => x.t.toFixed(1)), cues = events.filter((x) => ['ruleWarn', 'ruleFire', 'bossDown', 'worldOut', 'worldLand'].includes(x.e.type)).map((x) => `${x.t.toFixed(1)}s ${x.e.type}`);
    console.log(`  the music's say (${trace.length} changes): ${trace.slice(0, 60).join(' | ')}${trace.length > 60 ? ' …' : ''}`);
    console.log(`  hits taken at: ${hits.join(' ') || 'none'}`);
    console.log(`  cues: ${cues.slice(0, 30).join(' | ')}`);
    const near = events.filter((x) => Math.abs(x.t - worst[1]) < 0.15).map((x) => x.e.type);
    console.log(`  around the peak: ${Object.entries(near.reduce((a, k) => ((a[k] = (a[k] || 0) + 1), a), {})).map(([k, n]) => `${k}×${n}`).join(' ')}`);
  }
} finally {
  ws.close(); try { process.kill(-proc.pid, 'SIGKILL'); } catch { /* gone */ }
  server.close(); rmSync(profile, { recursive: true, force: true });
}
