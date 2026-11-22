#!/usr/bin/env node
// itch-clips.mjs — short films of the real game for the itch page and anywhere else a moving picture has to sell it
// (docs/ITCH.md; docs/PLAN.md feature B, and the workshop's "MP4s that work as marketing"). Every frame is the game's
// own, drawn at an exact 30 a second (debug capFrame: a slow software GPU still makes a smooth film), played by the
// look-ahead bot the curve is measured with (scripts/bot.mjs, the expert, through debug capPlay) on a seed of its
// own, so a clip can be made again; the world's own song is rendered offline by the game (debug musicWav) and laid
// under it. ffmpeg cuts and encodes: an MP4 a clip (H.264, the music under it, the 1.x logo over the last seconds
// of the montage), and a short GIF of each for a page that will not play video.
//
//   node scripts/itch-clips.mjs [outDir=dist/itch-clips] [--only nine-worlds] [--segs 1,4] [--size 1280x720] [--fps 30] [--gif 4] [--quick]
//
// Slow by nature under a software GPU (a frame and its picture take a second or two): run it in the background.
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdtempSync, mkdirSync, rmSync, readdirSync, renameSync } from 'node:fs';
import { join, extname, normalize, sep, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// v156: --gl opens the game on its WebGL 2 path (?webgl): a sandbox whose software GPU cannot run WebGPU draws
// every picture blank otherwise
const GL = process.argv.includes('--gl') ? 'webgl&' : '';
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const OUT = resolve(args[0] && !args[0].startsWith('--') ? args[0] : 'dist/itch-clips');
const SEGS = opt('--segs', null)?.split(',').map(Number) ?? null;   // --segs 1,4: only these segments of a clip (a check of a shot)
const ONLY = opt('--only', null), FPS = +opt('--fps', 30), GIF = +opt('--gif', 4), QUICK = args.includes('--quick');   // --quick: a second a segment, a check of the pipeline
const [W, H] = opt('--size', '1280x720').split('x').map(Number);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), LOGO = join(ROOT, 'scripts/itch-logo-1x.png');

// The clips. A clip is segments, cut together in order; a segment is a run started on its seed (`world`: ARCADE's or
// HARDCADE's from that world; `room`: a campaign room), run ahead `warm` s with the hero kept alive (so it opens
// mid-fight), then filmed for `secs` with the hero on its own. `boss`: the run goes straight to its world's boss
// wave first. `song` and `script` are the music (js/tuning/music.js), `logo` puts the logo over the last seconds
const CLIPS = [
  { name: 'nine-worlds', song: 'title', script: [{ at: 0, level: 4 }], logo: true,
    segs: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((world) => ({ mode: 'arcade', world, seed: world === 7 ? 1017 : 1000 + world, warm: 12, secs: 1.8 })) },
  { name: 'curb-king', song: 'driveway', script: [{ at: 0, level: 4, boss: true }],
    segs: [{ mode: 'arcade', world: 2, seed: 2207, warm: 4, boss: true, bossWarm: 4, secs: 10 }] },
  { name: 'hardcade', song: 'sewer', script: [{ at: 0, level: 4 }],
    segs: [{ mode: 'hardcade', world: 3, seed: 3301, warm: 30, secs: 10 }] },
  { name: 'campaign-clot', song: 'driveway', script: [{ at: 0, level: 3 }],
    segs: [{ room: 'clot', seed: 4402, warm: 2, busy: 4, secs: 10 }] },   // a short run-ahead: the heart still whole when it opens
  // v123: PROGRESS, a short trailer of the game as it stands (owner, 2026-11-08: "a short trailer to show the
  // progress"): the title, the nine worlds, two bosses under their own cards, HARDCADE's corpse fire, the campaign's
  // grid and three of its rooms, and the logo over the last world with the version it is at. `caption` and `sub` are
  // a lower third in the game's own lettering; `screen` films one of the game's own screens instead of a run
  { name: 'progress', song: 'title', script: [{ at: 0, level: 4 }], logo: true, noBanner: true,   // the captions say it; a CHALLENGE MISSED would not sell
    segs: [
      { screen: 'title', secs: 2.2 },
      ...['THE GRID', 'THE DRIVEWAY', 'THE SEWER', 'THE CISTERN', 'THE BOILER ROOM', 'THE RIVER', 'THE ICE SHEET', 'THE DEEP', 'THE CORE']
        .map((name, i) => ({ mode: 'arcade', world: i + 1, seed: 1000 + i + 1, warm: 12, secs: 1.1, caption: 'NINE WORLDS', sub: `${i + 1} · ${name}` })),
      { mode: 'arcade', world: 2, seed: 2207, warm: 4, boss: true, bossWarm: 3, secs: 2.2, caption: 'A BOSS IN EVERY WORLD' },
      { mode: 'arcade', world: 9, seed: 2209, warm: 4, boss: true, bossWarm: 3, secs: 2.2, caption: 'A BOSS IN EVERY WORLD' },
      { mode: 'hardcade', world: 3, seed: 3301, warm: 30, secs: 2.4, caption: 'HARDCADE', sub: 'THE DEAD SHOOT BACK' },
      { screen: 'grid', secs: 1.8, caption: 'CAMPAIGN', sub: '36 ROOMS\nGRADED S TO F', side: true },
      { room: 'eddy', seed: 4101, warm: 1.5, busy: 1, secs: 1.5, caption: 'CAMPAIGN', sub: 'HOLD THE RING' },   // a long run-ahead held the ring to the end
      { room: 'clot', seed: 4402, warm: 2, busy: 4, secs: 1.5, caption: 'CAMPAIGN', sub: 'PROTECT THE HEART' },
      { room: 'the-core', seed: 4436, warm: 4, busy: 4, secs: 1.5, caption: 'CAMPAIGN', sub: 'THE GAUNTLET' },
      // its own run (v127): on world 9's own seed, its 14 s run-ahead met the NINE WORLDS shot's 12 s and four 0.5 s top-ups
      // to the frame, and the trailer closed on the same 1.1 s it had shown twelve seconds before
      { mode: 'arcade', world: 9, seed: 1919, warm: 20, secs: 2.8, sub: 'NOW AT {ver}' },
    ] },
  // v143: LOOK (owner, 2026-11-11: "Make trailer showing the parts you want looked at"): the floors of v138 to v143,
  // one shot a question, the question under it. A `stage` is a shot DIRECTED rather than played: the hero alone on
  // the floor (the run's director stood down, `clear`), put down at `at` (fractions of the floor's half sizes) and
  // walked by `path` ([from s, to s, x, z, dash] in the floor's own axes), where the look-ahead bot would be busy
  // surviving and never stand in the river to be looked at. `js` sets a shot up (the ice's: chips laid in the road
  // to a hole). Everything in it is the game's own: nothing is drawn for the film
  { name: 'look', song: 'driveway', script: [{ at: 0, level: 2 }], noBanner: true, ask: true,
    segs: [
      { stage: { world: 2, zoom: 1.8, at: [-0.5, -0.35], path: [[0, 2.3, 0.85, 0.35], [2.3, 2.5, 0.85, 0.35, 1], [2.5, 4.2, 0.85, 0.35]] }, seed: 5202, secs: 4.2, caption: 'THE DRIVEWAY', sub: 'DO NEIGHBOURING POURS LOOK DIFFERENT?\nKICK THE LEAVES' },
      { mode: 'arcade', world: 2, seed: 1002, warm: 12, secs: 1.8, caption: 'THE DRIVEWAY', sub: 'IS THE FIGHT STILL EASY TO READ?' },
      { mode: 'arcade', world: 3, seed: 1003, warm: 12, secs: 2.4, caption: 'THE SEWER', sub: 'FLAGSTONES: RICHER, OR BUSIER?' },
      { stage: { room: 'needle', zoom: 1.6, at: [-0.3, 0.15], path: [[0, 3.2, 0.7, -0.2]] }, seed: 5204, secs: 3.2, caption: 'THE CISTERN', sub: 'DO THE RINGS FOLLOW YOU?' },
      { mode: 'arcade', world: 5, seed: 1005, warm: 12, secs: 2.4, caption: 'THE BOILER ROOM', sub: 'PLATES: RICHER, OR BUSIER?' },
      { stage: { world: 6, zoom: 1.8, at: [0.22, 0.05], path: [[0, 3.6, -0.75, 0]] }, seed: 5206, secs: 3.6, caption: 'THE RIVER', sub: 'DO THE FISH SCATTER? IS THERE A WAKE?' },
      { stage: { world: 7, zoom: 1.8, at: [0, 0], path: [[0.9, 1.1, 1, 0, 1]],
          js: `const pit = w.posts.find((q) => q.pit), lit = t.scenery.leaves; h.x = h.px = pit.x - pit.r - 5; h.z = h.pz = pit.z + 0.2;
               for (let i = 0; i < 6; i++) { lit.x[i] = pit.x - pit.r - 3.6 + i * 0.35; lit.z[i] = pit.z + 0.2 + (i % 3 - 1) * 0.35; lit.y[i] = 0; lit.sunk[i] = 0; lit.free[i] = 1; lit.awake[i] = 1; }` },
        seed: 5207, secs: 3.8, caption: 'THE ICE SHEET', sub: 'DO THE HOLES READ AS BROKEN ICE?\nDASH THE CHIPS INTO ONE' },
      { mode: 'arcade', world: 7, seed: 1007, warm: 12, secs: 1.8, caption: 'THE ICE SHEET', sub: 'SNOW DRIFTS: CAN YOU STILL READ THE FIGHT?' },
      { mode: 'arcade', world: 8, seed: 1008, warm: 12, secs: 2.0, caption: 'THE DEEP', sub: 'STARFISH AND SHELLS' },
      { mode: 'arcade', world: 9, seed: 1009, warm: 12, secs: 2.0, caption: 'THE CORE', sub: 'LAMPS AND RUNNING LIGHT' },
      { room: 'first-light', seed: 4001, warm: 1.5, busy: 1, secs: 2.4, caption: 'CAMPAIGN · THE SURFACE', sub: 'ARE THE LEAVES RIGHT FOR A SMALL ROOM?' },
      { room: 'eddy', seed: 4101, warm: 1.5, busy: 1, secs: 2.4, caption: 'CAMPAIGN · THE WELL', sub: 'DOES THE RIVER PAST THE EDGE READ WELL?' },
      { mode: 'arcade', world: 5, seed: 1905, warm: 20, secs: 2.6, caption: 'IS ANY SHOT OR GEL HARD TO SEE?', sub: 'NOW AT {ver} · PLAY, THEN TAP PLAY RECORD' },
    ] },
  // v144: WATER — the cistern on its simulated water (render/water.js): the hero alone in it, then a fight
  { name: 'water', song: 'sewer', script: [{ at: 0, level: 2 }], noBanner: true, ask: true,
    segs: [
      { stage: { world: 4, zoom: 1.5, at: [-0.15, -0.25], path: [[0.4, 1.9, 0.55, 0.25], [1.9, 2.1, 0.55, 0.25, 1], [2.1, 4.4, -0.45, -0.5]] }, seed: 5404, secs: 4.4, caption: 'THE CISTERN', sub: 'THE WATER IS SIMULATED: WALK, DASH, WATCH IT' },
      { stage: { world: 4, zoom: 1.3, at: [-0.3, -0.45], path: [[0.5, 3.6, -0.62, -0.6]] }, seed: 5405, secs: 3.6, caption: 'THE CISTERN', sub: 'THE FALL FROM THE SEWER ABOVE' },
      { mode: 'arcade', world: 4, seed: 1004, warm: 12, secs: 4.5, caption: 'THE CISTERN', sub: 'DARK NOW. CAN YOU STILL READ THE FIGHT?' },
    ] },
  // v147: LOOK 2 — the seven worlds rebuilt to the owner's answers to LOOK (v144 to v147), one shot each and its question
  { name: 'look2', song: 'sewer', script: [{ at: 0, level: 2 }], noBanner: true, ask: true,
    segs: [
      { stage: { world: 3, zoom: 1.6, at: [-0.25, -0.1], path: [[0.3, 3.4, 0.3, -0.1]] }, seed: 5303, secs: 3.4, caption: 'THE SEWER', sub: 'THE STREAM RUNS IN A CHUTE NOW.\nDOES IT READ AS A SLIDE?' },
      { stage: { world: 4, zoom: 1.4, at: [-0.15, -0.25], path: [[0.4, 1.9, 0.5, 0.2], [1.9, 2.1, 0.5, 0.2, 1], [2.1, 4.2, -0.5, -0.55]] }, seed: 5404, secs: 4.2, caption: 'THE CISTERN', sub: 'REAL WATER, DARK, THE FALL FROM ABOVE.\nIS THIS THE MOOD?' },
      { mode: 'arcade', world: 5, seed: 1005, warm: 12, secs: 3.2, caption: 'THE BOILER ROOM', sub: 'SQUARE DECKS, FIRE AND FANS.\nA MACHINE DUNGEON YET?' },
      { stage: { world: 6, zoom: 1.6, at: [0.2, 0.1], path: [[1.4, 3.8, -0.5, -0.15]] }, seed: 5206, secs: 3.8, caption: 'THE RIVER', sub: 'STAND IN THE STREAM: A WAKE. THREE KINDS OF FISH.\nCLOSER TO WHAT YOU MEANT?' },
      { stage: { world: 7, zoom: 1.6, at: [0, 0], path: [[0.6, 3.0, 0.4, 0.3]],
          js: `const pit = w.posts.find((q) => q.pit); h.x = h.px = pit.x - pit.r - 3.2; h.z = h.pz = pit.z + 1.2;` },
        seed: 5207, secs: 3.2, caption: 'THE ICE SHEET', sub: 'ARE THE HOLES BROKEN ENOUGH NOW?\nIS THERE ENOUGH SNOW?' },
      { stage: { world: 8, zoom: 1.6, at: [-0.2, -0.1], path: [[0.3, 1.8, 0.4, 0.2], [1.8, 2.0, 0.4, 0.2, 1], [2.0, 3.8, -0.3, 0.4]] }, seed: 5208, secs: 3.8, caption: 'THE DEEP', sub: 'UNDER WATER NOW. THE PLANKTON LIGHTS WHERE YOU MOVE.\nENOUGH?' },
      { stage: { world: 9, zoom: 1.3, at: [-0.45, 0.35], path: [[0.3, 3.8, 0.4, -0.3]] }, seed: 5209, secs: 3.8, caption: 'THE CORE', sub: 'A MACHINE UNDER GLASS, AND A HEART THAT BEATS.\nENOUGH MENACE?' },
      { mode: 'arcade', world: 6, seed: 1906, warm: 16, secs: 2.8, caption: 'CAN YOU STILL READ EVERY FIGHT?', sub: 'NOW AT {ver} · PLAY, THEN TAP PLAY RECORD' },
    ] },
  // v150: LOOK 3 — the seven worlds again, after the owner's answers to LOOK 2 (v148 to v150), one shot each and its question
  { name: 'look3', song: 'sewer', script: [{ at: 0, level: 2 }], noBanner: true, ask: true,
    segs: [
      { stage: { world: 3, zoom: 1.6, at: [-0.25, -0.1], path: [[0.3, 3.4, 0.3, -0.1]] }, seed: 5303, secs: 3.4, caption: 'THE SEWER', sub: 'A HALF-PIPE NOW, THE STREAM SWINGING UP ITS WALLS.\nA SLIDE?' },
      { stage: { world: 4, zoom: 1.5, at: [0.1, 0.1], path: [[0.4, 3.6, -0.4, -0.35]] }, seed: 5404, secs: 3.8, caption: 'THE CISTERN', sub: 'LEAVES AFLOAT, CARRIED FROM THE FALL TO THE WELLS.\nTHE DEBRIS YOU MEANT?' },
      { stage: { world: 5, zoom: 1.15, at: [-0.35, -0.55], path: [[0.5, 5.2, 0.25, 0.05]] }, seed: 5305, secs: 5.4, caption: 'THE BOILER ROOM', sub: 'THE FIRE IS BLOWN ON A BEAT, STEAM AFTER IT, ENGINES TURNING.\nTHE MOOD NOW?' },
      { stage: { world: 6, zoom: 1.5, at: [0.1, 0.45], path: [[0.6, 3.0, -0.45, 0.05]] }, seed: 5206, secs: 3.2, caption: 'THE RIVER', sub: 'THE LILY PADS STAY WHERE THEY GROW NOW.' },
      { stage: { world: 7, zoom: 1.45, at: [-0.3, 0.2], path: [[0.4, 1.4, 0.6, -0.3], [1.4, 1.6, 0.6, -0.3, 1], [1.6, 2.6, -0.2, -0.7], [2.6, 2.8, -0.6, -0.4, 1], [2.8, 4.2, -0.6, 0.3]] }, seed: 5207, secs: 4.4, caption: 'THE ICE SHEET', sub: 'MORE SNOW, AND WHAT SLIDES OVER IT LEAVES A TRAIL.\nRIGHT?' },
      { stage: { world: 8, zoom: 1.25, at: [-0.2, -0.6], path: [[0.3, 1.8, 0.4, 0.08], [1.8, 2.0, 0.4, 0.08, 1], [2.0, 4.2, -0.35, 0.12]] }, seed: 5208, secs: 4.4, caption: 'THE DEEP', sub: 'SHOALS THAT PART ROUND YOU, CRABS, LIGHT FROM THE SURFACE.\nALIVE NOW?' },
      { stage: { world: 9, zoom: 1.3, at: [-0.45, 0.35], path: [[0.3, 4.2, 0.4, -0.3]] }, seed: 5209, secs: 4.4, caption: 'THE CORE', sub: 'THE HEART DRIVES THE MACHINE: EVERY BEAT KICKS IT.\nENOUGH NOW?' },
      { mode: 'arcade', world: 7, seed: 1907, warm: 16, secs: 2.8, caption: 'CAN YOU STILL READ EVERY FIGHT?', sub: 'NOW AT {ver} · PLAY, THEN TAP PLAY RECORD' },
    ] },
];

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname.slice(1)) || 'index.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT + sep) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const binary = [process.env.CHROMIUM, '/opt/pw-browsers/chromium'].find((b) => b && existsSync(b));
const profile = mkdtempSync(join(tmpdir(), 'itch-clips-cdp-'));
const proc = spawn(binary, ['--headless=new', '--no-sandbox', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--mute-audio', '--no-proxy-server',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--enable-unsafe-webgpu', '--use-webgpu-adapter=swiftshader', '--enable-features=Vulkan', '--use-vulkan=swiftshader', 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'], detached: true });
const wsUrl = await new Promise((res, rej) => { let b = ''; proc.stderr.on('data', (d) => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); setTimeout(() => rej(new Error('no DevTools port')), 20000); });
const ws = new WebSocket(wsUrl); await new Promise((r) => (ws.onopen = r));
let seq = 0; const pend = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
const send = (method, params = {}, sessionId) => new Promise((res, rej) => { const id = ++seq; pend.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// a page of the game at the clip's size, its shaders warmed, the debug readouts and the MENU button hidden (the HUD
// stays: it is the game)
async function page(url) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await s('Page.navigate', { url });
  const ev = async (expression) => { const r = await s('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result?.value; };
  for (let i = 0; i < 240 && !(await ev('!!(window.__toko && window.__toko.ready)')); i++) await sleep(250);
  for (let i = 0; i < 480; i++) { if (await ev('(() => { const a = __toko.actors; return !!a.warmQueue && a.warmQueue.length === 0 && !a.warmHeld; })()')) break; await sleep(250); }
  await ev(`(() => { const st = document.createElement('style'); st.textContent = '#ver,#fault,#sticks,#fps,#pausebtn{display:none!important}'; document.head.append(st); })()`);
  // v127: a film is shot without the camera's shake. The shake is 1.x's, a trauma-scaled wobble at 6–7 Hz; a film's
  // frames are 1/30 s apart, and sampled that far apart it is the whole picture jumping between frames (v122's trailer
  // jumped through the world 9 boss's landing and the first frames of four shots: the owner saw it as a glitch). The
  // page's own tuning, the module the game imported, for this page alone
  await ev(`(async () => { const { TUNING } = await import('/js/tuning.js?v=161'); TUNING.shake.amp = [0, 0, 0]; })()`);
  // v123: a lower third for a trailer (a segment's `caption` and `sub`), in the game's own lettering
  await ev(`(() => { const st = document.createElement('style'); st.textContent = '#tcap{position:fixed;left:50%;bottom:6.5%;transform:translateX(-50%);z-index:20;text-align:center;pointer-events:none;width:max-content;max-width:94vw}'
    + '#tcap .t{font-size:clamp(22px,3.4vw,46px);letter-spacing:.16em;color:#fff;text-shadow:0 0 2px #000,0 0 3px #000,0 2px 10px rgba(0,0,0,.85)}'
    + '#tcap .s{margin-top:4px;font-size:clamp(12px,1.55vw,21px);letter-spacing:.22em;color:#ffb468;text-shadow:0 0 2px #000,0 0 3px #000,0 1px 6px rgba(0,0,0,.85)}'
    + '#tcap.ask .s{font-size:clamp(16px,2.25vw,30px);letter-spacing:.14em;line-height:1.3}'   // v143: a clip whose lower line is a QUESTION (the look clip): big enough to read on a phone
    + '#tcap .t:empty,#tcap .s:empty{display:none}#tcap .s{white-space:pre-line}#tcap.side{left:4%;bottom:auto;top:40%;transform:none;text-align:left;max-width:23vw}'; document.head.append(st);
    const c = document.createElement('div'); c.id = 'tcap'; c.hidden = true; c.innerHTML = '<div class="t"></div><div class="s"></div>'; document.body.append(c); })()`);
  const shot = async (file) => { const r = await s('Page.captureScreenshot', { format: 'jpeg', quality: 92 }); writeFileSync(file, Buffer.from(r.data, 'base64')); };
  return { ev, shot, close: () => send('Target.closeTarget', { targetId }) };
}

// one segment, filmed into `dir` from frame number `at` on the page `p` (one page for every clip: its shaders are
// warmed once, where a page a segment spent minutes a segment compiling them again); the frames it made
async function film(p, sg, dir, at) {
  // v123: the segment's lower third ({ver}: the version the game says it is at), or none
  const ver = (await p.ev(`(document.getElementById('ver')?.textContent.match(/v\\d+/) ?? [''])[0]`)) || '';
  const say = (x) => JSON.stringify((x ?? '').replace('{ver}', ver));
  await p.ev(`(() => { const c = document.getElementById('tcap'); c.querySelector('.t').textContent = ${say(sg.caption)}; c.querySelector('.s').textContent = ${say(sg.sub)}; c.hidden = !(${say(sg.caption)} || ${say(sg.sub)}); c.classList.toggle('side', ${!!sg.side}); })()`);
  if (sg.screen) return filmScreen(p, sg, dir, at);
  const mode = sg.room ? 'campaign' : sg.mode;
  // v143: a DIRECTED shot (`stage`, above): the hero alone on its floor, walked by a path
  const G = sg.stage;
  const state = G ? await p.ev(`(async () => { const t = __toko, { TUNING } = await import('/js/tuning.js?v=161'), DT = TUNING.sim.dt;
    t.toMenu();
    localStorage.setItem('toko2.hard', 'off');
    ${G.world ? `localStorage.setItem('toko2.reached.arcade', '9'); localStorage.setItem('toko2.startAt.arcade', '${G.world}');` : ''}
    window.__plan = ${JSON.stringify(G.path)}; window.__pn = 0;
    t.nointro = true;
    t.capPlay(() => { const s = (window.__pn++) * DT; let mx = 0, mz = 0, dash = false;
      for (const [a, b, x, z, d] of window.__plan) if (s >= a && s < b) { mx = x; mz = z; dash = !!d && s - a < DT * 1.5; }
      return { mx, mz, ax: mx || 1, az: mz, aim: false, fire: false, dash }; }, ${sg.seed});
    ${G.room ? `t.loop(false); await t.room('${G.room}');` : `t.capBegin('arcade');`}
    for (let i = 0; i < 100 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100));
    if (t.state !== 'play') return t.state;
    const w = t.world, h = w.hero; h.invinc = 1e9;
    t.advance(1.2);
    w.director = { step() {} }; for (const g of w.gels) g.alive = false; w.gels.length = 0; w.bullets.length = 0;
    h.x = h.px = ${G.at[0]} * w.hx; h.z = h.pz = ${G.at[1]} * w.hz; h.vx = h.vz = 0;
    ${G.js ?? ''}
    t.advance(0.3);
    window.__pn = 0;   // the path starts with the film
    h.invinc = 0; h.mercy = 0;   // (nothing is left on the floor to hurt it, and the HUD says so while it is)
    t.ui.bannerEl.hidden = true; t.ui._bannerT = 0;
    return t.world.world === ${G.world ?? 'undefined'} || ${!G.world} ? t.state : 'world ' + t.world.world; })()`) : await p.ev(`(async () => { const t = __toko, { think, SKILLS, prng } = await import('/scripts/bot.mjs');
    t.toMenu();   // v123: from the title, as a player starts one: the last run's card and banner do not ride into this one
    const mem = { quarry: null, lineup: null, seen: new WeakMap(), rnd: prng(${sg.seed} * 31 + 7) };
    // a run at its world from the start screen's own START AT (v85): the world reached, the run set to start there
    localStorage.setItem('toko2.hard', '${mode === 'hardcade' || sg.hard ? 'on' : 'off'}');
    ${sg.world ? `localStorage.setItem('toko2.reached.${mode}', '9'); localStorage.setItem('toko2.startAt.${mode}', '${sg.world}');` : ''}
    t.nointro = true; t.capPlay((w) => think(w, mem, SKILLS.expert), ${sg.seed});
    ${sg.room ? `t.loop(false); await t.room('${sg.room}');` : `t.capBegin('${mode}');`}
    for (let i = 0; i < 100 && t.state !== 'play'; i++) await new Promise((r) => setTimeout(r, 100));
    const h = t.world.hero; h.invinc = 1e9;
    t.advance(${sg.warm});
    ${sg.boss ? `t.bossWave(); t.advance(${sg.bossWarm ?? 3});` : ''}
    // and on until the floor is busy: a clip of a lull between waves sells nothing
    const busy = () => t.world.gels.filter((g) => g.alive && g.state === 'active').length;
    for (let i = 0; i < 40 && busy() < ${sg.busy ?? 6}; i++) t.advance(0.5);
    h.invinc = 0; h.mercy = 0;
    // a banner the run-ahead raised (CHALLENGE MISSED, a wave's name) would hang over the clip's first seconds: gone
    t.ui.bannerEl.hidden = true; t.ui._bannerT = 0;
    return t.world.world === ${sg.world ?? 'undefined'} || ${!sg.world} ? t.state : 'world ' + t.world.world; })()`);
  if (state !== 'play') throw new Error(`the run is not playing as asked (${state})`);
  // a few frames not kept: what the run brought on screen compiles its pipelines off the frame loop (v116), and a
  // frame drawn before one is ready leaves that thing out
  for (let i = 0; i < 4; i++) { await p.ev(`__toko.capFrame(${(i / FPS).toFixed(5)})`); await sleep(1500); }
  // a directed shot may be seen CLOSER (`stage.zoom`): the game draws `zoom` × the pixels and the picture is
  // magnified about where the hero stands, so it stays as sharp as the rest and a leaf is big enough to see on a
  // phone; the HUD and the caption are the page's and stay their size
  const Z = G?.zoom ?? 1;
  const closer = Z > 1 ? `t.renderer.setPixelRatio(${Z}); const h = t.world.hero, v = new t.THREE.Vector3(h.x, 0.4, h.z).project(t.camera), cv = t.renderer.domElement;
      cv.style.transformOrigin = ((v.x * 0.5 + 0.5) * innerWidth).toFixed(1) + 'px ' + ((0.5 - v.y * 0.5) * innerHeight).toFixed(1) + 'px'; cv.style.transform = 'scale(${Z})';` : '';
  let n = 0;
  for (let i = 0; i < Math.round((QUICK ? Math.min(1, sg.secs) : sg.secs) * FPS); i++) {
    const st = await p.ev(`(() => { const t = __toko; ${Z > 1 ? `t.renderer.setPixelRatio(${Z});` : ''} t.capFrame(${((i + 4) / FPS).toFixed(5)}); ${closer} return t.world?.over ? 'over' : t.state; })()`);
    await p.shot(join(dir, `${String(at + n).padStart(5, '0')}.jpg`)); n++;
    if (st !== 'play') { console.log(`    (the run left play at frame ${i}: ${st})`); break; }
  }
  if (Z > 1) await p.ev(`(() => { const t = __toko, cv = t.renderer.domElement; cv.style.transform = ''; cv.style.transformOrigin = ''; t.applyQuality(); })()`);
  return n;
}

// v123: one of the game's own screens filmed for `secs`: the title as a first-timer finds it, or the campaign's grid
// part played (worlds 1–3 through, at the grades a good player brings)
async function filmScreen(p, sg, dir, at) {
  await p.ev(`(async () => { const t = __toko;
    for (const k of Object.keys(localStorage)) if (/^toko2\\.(reached|startAt|daily|campaign)/.test(k)) localStorage.removeItem(k);
    localStorage.setItem('toko2.hard', 'off');
    if (${JSON.stringify(sg.screen)} === 'grid') {
      const g = 'SASBAASSACASBASAAS', ids = ['first-light', 'high-ground', 'three-rings', 'first-swarm', 'hands-up', 'gate-run', 'in-order', 'eddy', 'the-sludge', 'flotsam', 'slug-run', 'undertow', 'splitter', 'clot', 'pulse', 'spike', 'needle', 'crossfire'];
      const pr = {}; ids.forEach((id, i) => { pr[id] = { grade: g[i], pts: 1, kills: 1 }; }); localStorage.setItem('toko2.campaign', JSON.stringify(pr));
    }
    t.toMenu();
    if (${JSON.stringify(sg.screen)} === 'grid') { [...document.querySelectorAll('#menu .item')].find((b) => /^CAMPAIGN/.test(b.textContent.trim()))?.click(); document.getElementById('menu').style.zoom = String(Math.min(1.5, innerHeight / 560)); }
    await new Promise((r) => setTimeout(r, 300)); })()`);
  for (let i = 0; i < 3; i++) { await p.ev(`__toko.capFrame(${(i / FPS).toFixed(5)})`); await sleep(800); }
  let n = 0;
  for (let i = 0; i < Math.round((QUICK ? Math.min(1, sg.secs) : sg.secs) * FPS); i++) {
    await p.ev(`__toko.capFrame(${((i + 3) / FPS).toFixed(5)})`);
    await p.shot(join(dir, `${String(at + n).padStart(5, '0')}.jpg`)); n++;
  }
  await p.ev(`document.getElementById('menu').style.zoom = ''`);
  return n;
}

// the song under a clip, rendered by the game itself
async function song(p, c, seconds, file) {
  writeFileSync(file, Buffer.from(await p.ev(`__toko.musicWav('${c.song}', { seconds: ${seconds.toFixed(2)}, script: ${JSON.stringify(c.script)} })`), 'base64'));
}

mkdirSync(OUT, { recursive: true });
const work = mkdtempSync(join(tmpdir(), 'itch-clips-'));
let p = null;
try {
  p = await page(`${base}?${GL}nointro&lang=en`);
  for (const c of CLIPS) {
    if (ONLY && c.name !== ONLY) continue;
    const t0 = Date.now(), dir = join(work, c.name); mkdirSync(dir, { recursive: true });
    await p.ev(`document.getElementById('tcap').classList.toggle('ask', ${!!c.ask})`);
    await p.ev(`(() => { document.getElementById('tban')?.remove(); if (${!!c.noBanner}) { const s = document.createElement('style'); s.id = 'tban'; s.textContent = '#banner{display:none!important}'; document.head.append(s); } })()`);
    console.log(`${c.name}:`);
    let frames = 0;
    for (const [i, sg] of c.segs.entries()) { if (SEGS && !SEGS.includes(i + 1)) continue; const n = await film(p, sg, dir, frames); frames += n; console.log(`  segment ${i + 1}/${c.segs.length}: ${n} frames`); }
    const D = frames / FPS, wav = join(dir, 'song.wav');
    await song(p, c, D + 0.5, wav);
    const mp4 = join(OUT, `${c.name}.mp4`), fadeOut = Math.max(0, D - 0.5);
    // the picture fades in and out; the logo (the montage) comes up over the last seconds and stays as it goes dark
    const v = `[0:v]fade=t=in:st=0:d=0.25,fade=t=out:st=${fadeOut.toFixed(2)}:d=0.5[v0]`;
    const logo = c.logo ? `;[2:v]scale=${Math.round(W * 0.42)}:-1,format=rgba,fade=t=in:st=${Math.max(0, D - 2.4).toFixed(2)}:d=0.6:alpha=1[lg];[v0][lg]overlay=(W-w)/2:(H-h)/2:shortest=1,format=yuv420p[v]` : ';[v0]format=yuv420p[v]';
    // v123: the song brought to a video's loudness (−16 LUFS, true peak under −1.5 dB): rendered at the game's own
    // level it measured −28 LUFS, far under anything played beside it
    const a = `;[1:a]atrim=0:${D.toFixed(2)},loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.2,afade=t=out:st=${Math.max(0, D - 0.9).toFixed(2)}:d=0.9[a]`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, '%05d.jpg'), '-i', wav, ...(c.logo ? ['-loop', '1', '-framerate', String(FPS), '-t', D.toFixed(2), '-i', LOGO] : []),
      '-filter_complex', v + logo + a, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-t', D.toFixed(2), '-movflags', '+faststart', mp4]);
    // a GIF of its first seconds, for a page that will not play video
    const gif = join(OUT, `${c.name}.gif`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-t', String(Math.min(GIF, D)), '-i', mp4, '-vf', `fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`, gif]);   // small enough for a page's screenshots
    console.log(`  ✔ ${c.name}.mp4 (${D.toFixed(1)} s, ${(statSync(mp4).size / 1e6).toFixed(1)} MB) and .gif (${(statSync(gif).size / 1e6).toFixed(1)} MB), ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  console.log(`✔ clips in ${OUT}`);
} finally {
  await p?.close().catch(() => {});
  ws.close(); server.close();
  try { process.kill(-proc.pid, 'SIGKILL'); } catch {}
  await sleep(500); rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); rmSync(work, { recursive: true, force: true });
}
