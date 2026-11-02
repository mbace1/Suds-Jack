// Toko Move v3 — THE STAGE (owner, 2026-11-02: "more of the new design, less
// of the old map with visible trams on a realistic schedule … more curated
// narrative roguelike with fun choices and minimalistic visuals"; signed off as
// turn-based card hops, the scenes as the main view with the board between
// moments, and a slim job strip).
//
// journey.js is the game and knows nothing of a screen; this file acts it out.
// One moment at a time:
//   · AT A STOP   the iso stop scene, and ONE card at the bottom (the art
//                 bible's grammar: a Toko face, one line, two buttons priced in
//                 time). A corner inset of the board shows the two offers as
//                 the paths they are, so a choice reads as where it leaves you
//   · ABOARD      the tram interior (the night car on NIGHT) with the in-car
//                 display — "4 · MUNKKINIEMI › LASIPALATSI" — and, if the deck
//                 deals one there, its card
//   · BETWEEN     the board: the courier disc snaps onto its line's pill and
//                 rides the real geometry to the next stop; a walk is a dash
//   · DELIVERED   a stamp on the stop, then the next job's card
// The clock moves only by the prices you choose, so nothing happens while you
// read. Every animation is skippable by a tap and none of them is a timer the
// game waits on to be fair: the state has already moved when it starts.
import { tr } from './lang.js?v=7';
import * as J from './journey.js?v=1';
import * as Runs from './runs.js?v=2';
import { HopBoard } from './hopboard.js?v=1';
import { skinFor } from './skin.js?v=1';
import { moodFace, MOODS } from './events.js?v=10';
import { buildRealHelsinki } from './real-helsinki.js?v=5';
import { colourOf, parcelHtml } from './parcels.js?v=1';
import { esc } from './ui.js?v=2';
import { STORE } from './platform.js?v=1';
import { lineFamily } from './board.js?v=8';

export const BUILD_VERSION = '3.0';
const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const RUN = Runs.resolveRun(params);
const SEED = Number(params.get('seed')) || (1000 + Math.floor(Math.random() * 9000));
const SKIN = skinFor({ mutator: RUN.skin || null });
const NIGHT = SKIN.id === 'night';
const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── the scenes (art/minimal-metro-look/layers/*/MOTION.md) ──────────────────
// Each is a stack of full-frame layers, cut once to WebP in two native plates
// (9:16 and 16:9 — each its own composition, not a crop). The frame is fitted
// to COVER the screen and every layer moves inside it, so a sway is a sway of
// the car and never of the screen.
const SCENES = {
  // `face` is the courier's Toko face (the push-in's origin); `focus` is the
  // point a cropped screen keeps in view — on a phone the 9:16 plate is wider
  // than the screen, and centring it cut the courier off the stop's right edge
  tram: { layers: ['01-outside-tile', '02-car', '03-people', '04-courier'], tile: { '916': 1222 / 1920, '169': 1670 / 1080 }, face: { '916': [.53, .34], '169': [.43, .22] }, focus: { '916': [.5, .5], '169': [.5, .45] } },
  night: { layers: ['01-outside-tile', '02-car', '03-people', '04-courier'], drift: true, face: { '916': [.29, .59], '169': [.29, .25] }, focus: { '916': [.42, .55], '169': [.45, .5] } },
  // `chip` is the coral pause disc on the tram's front chip (03-tram is the
  // disruption plate): covered in the chip's own ink unless a line IS halted,
  // when it pulses (the bible's 2 s halt pulse)
  stop: { layers: ['01-backdrop', '02-street', '03-tram', '04-shelter', '05-people', '06-courier'], face: { '916': [.89, .32], '169': [.59, .33] }, focus: { '916': [.68, .4], '169': [.55, .45] }, chip: { '916': [.663, .3958, .034], '169': [.4542, .3278, .02] } },
};

const CSS = `
#v3{position:fixed;inset:0;overflow:hidden;overflow:clip;background:#f4f1e8;color:#15262b;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-user-select:none;user-select:none;touch-action:manipulation}
#v3[hidden]{display:none}
#v3 .frame{position:absolute;left:0;top:0;transition:opacity .22s}
#v3.fmt-916 .frame{width:max(100vw,calc(100vh * 9 / 16));width:max(100vw,calc(100dvh * 9 / 16));aspect-ratio:9/16}
#v3.fmt-169 .frame{width:max(100vw,calc(100vh * 16 / 9));width:max(100vw,calc(100dvh * 16 / 9));aspect-ratio:16/9}
#v3 .frame.fade{opacity:0}
#v3 .frame.push{animation:v3push 2.4s ease-out both}
@keyframes v3push{from{transform:scale(1)}to{transform:scale(1.035)}}
#v3 .L{position:absolute;inset:0;background-size:100% 100%;background-repeat:no-repeat}
#v3 .L.tile{background-size:auto 100%;background-repeat:repeat-x;animation:v3scroll 11s linear infinite}
@keyframes v3scroll{from{background-position:0 0}to{background-position:calc(var(--tw,1000px) * -1) 0}}
#v3 .L.drift{background-size:auto 100%;background-repeat:repeat-x;animation:v3drift 9s ease-in-out infinite alternate}
@keyframes v3drift{from{background-position:0 0}to{background-position:-28px 0}}
#v3 .sway{animation:v3sway 1.6s ease-in-out infinite}
#v3 .sway.lag{animation-delay:-.08s}
#v3.night-car .sway{animation-duration:1.1s}
#v3 .bob{animation:v3sway 1.6s ease-in-out infinite,v3bob .8s ease-in-out infinite}
@keyframes v3sway{0%,100%{transform:translateY(-1.4px)}50%{transform:translateY(1.4px)}}
@keyframes v3bob{0%,100%{margin-top:0}50%{margin-top:.8px}}
#v3 .shift{animation:v3shift 4s ease-in-out infinite alternate}
@keyframes v3shift{from{transform:translateX(0)}to{transform:translateX(2px)}}
#v3 .idle{animation:v3idle 2.4s ease-in-out infinite alternate}
@keyframes v3idle{from{transform:translateY(0)}to{transform:translateY(1.5px)}}
#v3 .L.dusk{background:linear-gradient(#0d1730,#1b2a4d 55%,#2a3550);mix-blend-mode:multiply;opacity:.92}
#v3 .chip{position:absolute;aspect-ratio:1;border-radius:50%;background:#142529;transform:translate(-50%,-50%)}
#v3.halt .chip{background:transparent;box-shadow:0 0 0 0 rgba(226,104,60,.7);animation:v3pulse 2s ease-out infinite}
@keyframes v3pulse{from{box-shadow:0 0 0 0 rgba(226,104,60,.75)}to{box-shadow:0 0 0 1.4em rgba(226,104,60,0)}}
#v3board{position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .22s;pointer-events:none}
#v3board.on{opacity:1;pointer-events:auto}
#v3top{position:absolute;left:0;right:0;top:calc(env(safe-area-inset-top) + 10px);display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;z-index:3}
.v3pill{display:inline-flex;align-items:center;gap:11px;padding:3px 3px 3px 14px;height:40px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px rgba(21,38,43,.12),0 2px 6px rgba(21,38,43,.14)}
.v3pill .clk{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}
.v3pill .dots{font-size:15px;letter-spacing:3px;color:#233d4d;line-height:1}
.v3pill .dots i{font-style:normal;color:#e2683c}
.v3ring{position:relative;display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:conic-gradient(var(--ring,#233d4d) calc(var(--p,0) * 1%),#e2e6e1 0)}
.v3ring::after{content:'';position:absolute;inset:4px;border-radius:50%;background:#fff}
.v3ring .pcl{position:relative;z-index:1}
.v3strip{display:flex;align-items:center;gap:8px;max-width:min(92vw,460px);min-height:30px;padding:4px 13px;border-radius:999px;background:rgba(255,253,247,.95);box-shadow:0 0 0 1px rgba(21,38,43,.10);font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden}
.v3strip[hidden]{display:none}
.v3strip b{font-weight:800;letter-spacing:1px;overflow:hidden;text-overflow:ellipsis}
.v3strip .left{color:#69777a;font-variant-numeric:tabular-nums}
.v3strip .left.late{color:#b34a36}
#v3.night .v3pill,#v3.night .v3strip{background:#161e24;color:#f6f9fc;box-shadow:0 0 0 1px #2a363e}
#v3.night .v3pill .dots{color:#f6f9fc}
#v3.night .v3ring{background:conic-gradient(var(--ring,#7ad3b0) calc(var(--p,0) * 1%),#2a363e 0)}
#v3.night .v3ring::after{background:#161e24}
#v3mini{position:absolute;right:12px;top:calc(env(safe-area-inset-top) + 98px);width:min(34vw,164px);aspect-ratio:1;padding:0;border:0;border-radius:18px;overflow:hidden;background:#f4f1e8;box-shadow:0 0 0 3px #fff,0 4px 14px rgba(21,38,43,.25);cursor:pointer;z-index:3;transition:opacity .2s}
#v3mini canvas{display:block;width:100%;height:100%}
#v3mini[hidden]{display:none}
#v3mini .tag{position:absolute;left:8px;bottom:6px;font:800 10px/1 ui-monospace,Menlo,monospace;letter-spacing:1.5px;color:#15262b;background:rgba(255,255,255,.85);padding:3px 5px;border-radius:5px}
#v3panel{position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 12px);max-width:520px;margin:0 auto;z-index:4}
@media (orientation:landscape){#v3panel{left:auto;right:16px;width:min(430px,48vw)}#v3mini{top:calc(env(safe-area-inset-top) + 64px)}}
#v3panel .eventCard{margin:0;animation:v3stamp .22s ease-out both}
@keyframes v3stamp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
.evAt{display:block;font-size:11px;font-weight:800;letter-spacing:1.6px;color:#69777a;margin-bottom:3px}
.v3sign{display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:14px;background:#101418;color:#ffb648;font:700 15px/1.2 ui-monospace,'SF Mono',Menlo,Consolas,monospace;letter-spacing:1px;box-shadow:0 0 0 2px #2a2f34,0 4px 14px rgba(0,0,0,.35);animation:v3stamp .22s ease-out both}
.v3sign .lb{display:inline-grid;place-items:center;min-width:34px;height:26px;padding:0 6px;border-radius:6px;color:#fff;font-weight:900}
.v3sign .nx{color:#fff}
.v3stamp{display:flex;flex-direction:column;align-items:center;gap:4px;padding:16px;border-radius:18px;background:#fffdf7;border:3px solid #233d4d;box-shadow:0 6px 20px rgba(21,38,43,.25);text-align:center;animation:v3stamp .22s ease-out both}
.v3stamp .big{font-size:22px;font-weight:900;letter-spacing:3px;color:#233d4d}
.v3stamp.late{border-color:#e2683c}.v3stamp.late .big{color:#b34a36}
.v3stamp .pts{font-size:15px;font-weight:800;color:#3f7a45}
.v3tap{position:absolute;right:14px;bottom:calc(env(safe-area-inset-bottom) + 14px);font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:1.5px;color:rgba(21,38,43,.55);pointer-events:none;z-index:4}
#v3.night .v3tap{color:rgba(246,249,252,.6)}
@media (prefers-reduced-motion:reduce){#v3 .L,#v3 .sway,#v3 .bob,#v3 .shift,#v3 .idle,#v3 .frame.push{animation:none!important}}
`;

// ── the page ───────────────────────────────────────────────────────────────
// The old real-time game's chrome stays in index.html for ?classic and the
// tester links (boot.js); none of it belongs on this stage.
for (const id of ['hud', 'map', 'transitPanel', 'zoomRail', 'pop', 'feed', 'sheet', 'paused', 'upgrade']) $(id)?.remove();
document.head.insertAdjacentHTML('beforeend', `<style id="v3css">${CSS}</style>`);
document.body.insertAdjacentHTML('afterbegin', `<div id="v3" hidden class="${NIGHT ? 'night' : ''}"><div class="frame" id="v3frame"></div><canvas id="v3board" aria-label="the board: where you are going"></canvas>
<div id="v3top"><span class="v3pill" id="v3pill"><span class="clk" id="v3clock">07:00</span><span class="dots" id="v3dots" aria-label="jobs"></span><span class="v3ring" id="v3ring" title="time left on this job"></span></span><div class="v3strip" id="v3strip" hidden></div></div>
<button id="v3mini" type="button" hidden aria-label="the board"><canvas id="v3minic"></canvas><span class="tag">MAP</span></button><div id="v3panel" aria-live="polite"></div></div>`);
const stage = $('v3'), frameEl = $('v3frame'), panel = $('v3panel');
// focusing a button that is still sliding in scrolled the stage under the HUD
// (overflow:hidden is a scroll container); the stage never scrolls
stage.addEventListener('scroll', () => { stage.scrollTop = 0; stage.scrollLeft = 0; });
let fmt = '';
function sizeFrame() {
  const f = innerWidth / innerHeight < 1 ? '916' : '169';
  if (f !== fmt) { fmt = f; stage.classList.toggle('fmt-916', f === '916'); stage.classList.toggle('fmt-169', f === '169'); if (scene) paintScene(scene, true); }
  place();
  board?.resize(); mini?.resize(); if (still) still();
}
// Fit the frame to cover the screen, keeping the scene's focus in view.
function place() {
  const sc = SCENES[scene]; if (!sc) return;
  const W = frameEl.offsetWidth, H = frameEl.offsetHeight, vw = stage.clientWidth || innerWidth, vh = stage.clientHeight || innerHeight, [fx, fy] = sc.focus[fmt];
  const clamp = (v, lo) => Math.max(lo, Math.min(0, v));
  frameEl.style.left = `${Math.round(clamp(vw / 2 - fx * W, vw - W))}px`; frameEl.style.top = `${Math.round(clamp(vh / 2 - fy * H, vh - H))}px`;
  frameEl.style.transformOrigin = `${sc.face[fmt][0] * 100}% ${sc.face[fmt][1] * 100}%`;
  if (sc.tile) frameEl.style.setProperty('--tw', `${Math.round(H * sc.tile[fmt])}px`);
}
let scene = '';
function paintScene(name, force = false) {
  if (name === scene && !force) return;
  const sc = SCENES[name], first = !scene; scene = name;
  stage.classList.toggle('night-stop', NIGHT && name === 'stop');
  stage.classList.toggle('night-car', name === 'night');
  const build = () => {
    frameEl.innerHTML = sc.layers.map((l, i) => {
      const cls = i === 0 ? (sc.tile ? 'tile' : sc.drift ? 'drift' : '') : name === 'stop' ? (l === '05-people' ? 'shift' : l === '06-courier' ? 'idle' : '') : (i === 1 ? 'sway' : i === 2 ? 'sway lag' : 'bob');
      const chip = l === '03-tram' && sc.chip ? `<i class="chip" style="left:${sc.chip[fmt][0] * 100}%;top:${sc.chip[fmt][1] * 100}%;width:${sc.chip[fmt][2] * 100}%"></i>` : '';
      return `<div class="L ${cls}" style="background-image:url(scenes/${name}/${fmt}/${l}.webp)">${chip}</div>`;
    }).join('') + (NIGHT && name === 'stop' ? '<div class="L dusk"></div>' : '');
    place();
    frameEl.classList.remove('push'); if (!CALM) { void frameEl.offsetWidth; frameEl.classList.add('push'); }
    frameEl.classList.remove('fade');
  };
  if (first || force || CALM) build(); else { frameEl.classList.add('fade'); setTimeout(build, 200); }
}

// ── loading ────────────────────────────────────────────────────────────────
let net = null, board = null, mini = null, S = null, still = null;
const getJson = async url => { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(`${url} ${r.status}`); return r.json(); };
const ready = (async () => {
  const play = $('play'); if (play) { play.disabled = true; play.textContent = 'LOADING HELSINKI…'; }
  const [pack, water] = await Promise.all([getJson('./cities/helsinki.json'), getJson('./cities/ground/helsinki-water.json').catch(() => null)]);
  net = J.network(buildRealHelsinki(pack));
  board = new HopBoard($('v3board'), { pack, water, skin: SKIN, net }); board.label = tr;
  mini = new HopBoard($('v3minic'), { pack, water, skin: SKIN, net }); mini.label = tr;
  if (play) { play.disabled = false; play.textContent = 'START SHIFT'; }
})().catch(err => { const p = $('play'); if (p) p.textContent = 'MAP LOAD FAILED'; console.error(err); throw err; });

// ── the title card: the ladder (runs.js) ───────────────────────────────────
const COUNT = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];
const hhmm = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
function paintTitle() {
  const start = (RUN.startHour ?? 7) * 60, end = start + J.SHIFT_SECONDS / 60;
  const set = (id, t) => { const e = $(id); if (e) e.textContent = t; };
  set('titleWhen', `Helsinki · ${hhmm(start)} · ${RUN.title}`);
  const body = document.querySelector('#title .cardBody p'); if (body) body.textContent = 'A courier in Helsinki. At every stop, one card: which tram, which way, who to help. The clock only moves when you choose.';
  set('titleGoal', `${COUNT[RUN.target] || RUN.target} deliveries before ${hhmm(end)}.`);
  const n = $('shiftNo'); if (n) n.hidden = true;
  const all = Runs.loadRuns(), star = k => '★'.repeat(k) + '☆'.repeat(3 - k), row = $('mutRow');
  if (row) row.innerHTML = `<p class="mutHead">RUNS</p><div class="runList">${Runs.RUNS.map((r, i) => {
    const open = Runs.unlocked(r.id, all), rec = all[r.id], prev = Runs.RUNS[i - 1];
    return open ? `<a class="run${r.id === RUN.id ? ' on' : ''}" href="${Runs.runHref(r.id, location.search)}" data-run="${r.id}"${r.id === RUN.id ? ' aria-current="true"' : ''}><span class="runG" aria-hidden="true">${r.glyph}</span><span class="runT"><b>${esc(r.name)}</b><small>${esc(r.title)} · ${r.target} jobs</small></span><span class="runS" title="${rec.stars} stars">${rec.done ? star(rec.stars) : ''}</span></a>`
      : `<span class="run locked" data-run="${r.id}" aria-disabled="true"><span class="runG" aria-hidden="true">🔒</span><span class="runT"><b>${esc(r.name)}</b><small>finish ${esc(prev.name)} to open</small></span></span>`;
  }).join('')}</div><p class="hint mutBlurb">${esc(RUN.blurb)}</p>`;
  // the daily, the week and LIVE are still the real-time game, and still the
  // reward for clearing NIGHT (owner: ladder first)
  const extras = Runs.extrasOpen(all);
  const dl = $('dailyLink'); if (dl) dl.hidden = !extras;
  const wl = $('weekLink'); if (wl) { wl.hidden = !extras; wl.textContent = 'OR THE WEEK · five shifts, rent due Friday'; }
  const ll = $('liveLink'); if (ll) ll.hidden = !extras || STORE;
}

// ── the HUD: one pill and one strip ────────────────────────────────────────
let shownMin = null, rollTimer = 0;
function paintHud() {
  const s = S, clock = $('v3clock'), mins = (RUN.startHour ?? 7) * 60 + Math.floor(s.clock / 60);
  // the clock ROLLS to its new time (art bible: transitions/hud-clock-roll)
  clearInterval(rollTimer);
  if (shownMin == null || CALM || mins - shownMin > 90 || mins < shownMin) { shownMin = mins; clock.textContent = hhmm(mins); }
  else { const from = shownMin, steps = Math.max(1, mins - from), t0 = performance.now(), dur = Math.min(900, 120 + steps * 40);
    rollTimer = setInterval(() => { const k = Math.min(1, (performance.now() - t0) / dur), m = Math.round(from + (mins - from) * k); clock.textContent = hhmm(m); if (k >= 1) clearInterval(rollTimer); }, 30); shownMin = mins; }
  $('v3dots').innerHTML = Array.from({ length: s.target }, (_, i) => i < s.results.length ? (s.results[i] === 'late' ? '<i>●</i>' : '●') : '○').join('');
  const ring = $('v3ring'), job = s.job, left = J.timeLeft(s);
  if (job) { const p = Math.max(0, Math.min(1, left / job.limit)); ring.style.setProperty('--p', String(Math.round(p * 100))); ring.style.setProperty('--ring', p < 0.3 ? '#e2683c' : (NIGHT ? '#7ad3b0' : '#233d4d')); ring.innerHTML = parcelHtml(job.cargo, { max: 17 }); }
  else { ring.style.setProperty('--p', '0'); ring.innerHTML = ''; }
  // the strip: the job, where it goes, and how long it has
  const strip = $('v3strip');
  if (job) { strip.hidden = false;
    strip.innerHTML = `${parcelHtml(job.cargo, { max: 15 })}<span>${esc(J.cargoWord(job.cargo))}</span><span aria-hidden="true">→</span><b>${esc(net.name(job.to).toUpperCase())}</b><span class="left${left < 0 ? ' late' : ''}">${left < 0 ? `late by ${Math.ceil(-left / 60)} min` : `${Math.max(1, Math.ceil(left / 60))} min left`}</span>`; }
  else strip.hidden = true;
}

// ── the card ───────────────────────────────────────────────────────────────
// Prices read as a stopwatch, "+6:00": the classic deck's "+40 s" scaled to a
// tram ride would be "+1260 s", which nobody can compare at a glance.
const price = sec => `+${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
const face = mood => { const url = moodFace(mood), disc = (MOODS[mood] || MOODS.info).disc; return url ? `<img class="evFace" src="${url}" alt="" width="44" height="44">` : `<i class="evFace" style="background:${disc}"></i>`; };
function paintCard(c) {
  const stack = c.options.some(o => String(tr(o.label)).length > 18);
  panel.innerHTML = `<section class="eventCard mood-${esc(c.mood)}" data-kind="${c.kind}"><div class="evHead">${face(c.mood)}<b class="evLine">${c.at ? `<span class="evAt">${esc(c.at.toUpperCase())}</span>` : ''}${esc(c.text)}</b></div><div class="evOpts${stack ? ' evStack' : ''}">${c.options.map((o, i) => `<button class="evBtn ${i === 0 ? 'evPrimary' : 'evGhost'} eventOpt" type="button" data-i="${i}"><span class="evLb">${esc(o.label)}</span><span class="evCost">${price(o.price)}</span></button>`).join('')}</div></section>`;
  panel.querySelectorAll('.eventOpt').forEach(b => b.addEventListener('click', () => pick(Number(b.dataset.i))));
}

// the corner inset: here, the drop, and the hops on offer as their own paths
function paintMini(c) {
  const btn = $('v3mini'), hops = c?.kind === 'route' ? c.options.map(o => o.hop).filter(Boolean) : [];
  // at dispatch the drop on offer is the job's; it shows where it is before you take it
  const job = S.job || (S.offer ? { to: S.offer.to, cargo: S.offer.cargo } : null), show = !!job && c && c.kind !== 'story';
  btn.hidden = !show; if (!show) { still = null; return; }
  still = () => { mini.resize(); mini.draw({ at: S.at, dest: job.to, destColour: colourOf(job.cargo), previews: hops, labels: false, lift: false, halted: haltedLayer }); };
  still();
}
const haltedLayer = layer => !!S?.halt && String(layer.mode || '').toUpperCase() !== 'SUBWAY' && J.halted(S, lineFamily(layer.name));

// The full board, opened from the inset: the same picture with names on it.
let boardOpen = false;
function openBoard() {
  const c = J.card(net, S); if (!c || busy) return;
  boardOpen = true; panel.style.visibility = 'hidden'; $('v3mini').hidden = true;
  const cv = $('v3board'); cv.classList.add('on'); board.resize();
  const job = S.job || (S.offer ? { to: S.offer.to, cargo: S.offer.cargo } : null);
  board.draw({ at: S.at, dest: job?.to, destColour: job ? colourOf(job.cargo) : undefined, previews: c.kind === 'route' ? c.options.map(o => o.hop).filter(Boolean) : [], lift: false, halted: haltedLayer });
  hint('TAP TO CLOSE');
}
$('v3mini').addEventListener('click', openBoard);
$('v3board').addEventListener('click', () => { if (!boardOpen) return; boardOpen = false; $('v3board').classList.remove('on'); panel.style.visibility = ''; hint(''); render(); });
function hint(t) { let h = stage.querySelector('.v3tap'); if (!t) { h?.remove(); return; } if (!h) { h = document.createElement('div'); h.className = 'v3tap'; stage.append(h); } h.textContent = t; }

// ── the moment ─────────────────────────────────────────────────────────────
let busy = false, pendingHop = null, skip = null;
const interior = () => NIGHT ? 'night' : 'tram';
function render() {
  paintHud();
  const c = J.card(net, S);
  if (!c) return finish();
  if (c.kind === 'story' && pendingHop) {
    // a card dealt on the way: aboard is the car, on foot is the board mid-walk
    if (pendingHop.kind === 'walk') { showBoard(pendingHop, 0.5); }
    else { hideBoard(); paintScene(interior()); }
  } else { hideBoard(); paintScene('stop'); }
  stage.classList.toggle('halt', c.kind === 'halt');
  paintCard(c); paintMini(c);
}

// Play the board for a hop from t0 to t1; resolves when done or tapped past.
function showBoard(hop, t = 1) { const cv = $('v3board'); cv.classList.add('on'); board.resize(); board.draw({ at: S.at, hop, t, dest: S.job?.to, destColour: S.job ? colourOf(S.job.cargo) : undefined, halted: haltedLayer }); }
function hideBoard() { $('v3board').classList.remove('on'); }
function rideBoard(hop, t0 = 0, t1 = 1) {
  return new Promise(done => {
    const cv = $('v3board'); cv.classList.add('on'); board.resize(); $('v3mini').hidden = true;
    const dur = CALM ? 300 : (1300 + 700 * Math.min(1, hop.price / 900)) * (t1 - t0), start = performance.now();
    const ease = k => k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    let over = false; const end = () => { if (over) return; over = true; skip = null; board.draw({ at: S.at, hop, t: t1, dest: S.job?.to, destColour: S.job ? colourOf(S.job.cargo) : undefined, halted: haltedLayer }); done(); };
    skip = end;
    const step = now => { if (over) return; const k = Math.min(1, (now - start) / dur);
      board.draw({ at: S.at, hop, t: t0 + (t1 - t0) * ease(k), dest: S.job?.to, destColour: S.job ? colourOf(S.job.cargo) : undefined, halted: haltedLayer });
      if (k >= 1) end(); else requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
// A beat that a tap ends early.
const beat = ms => new Promise(done => { let over = false; const end = () => { if (over) return; over = true; skip = null; done(); }; skip = end; setTimeout(end, CALM ? Math.min(ms, 500) : ms); });
stage.addEventListener('pointerup', e => { if (skip && !e.target.closest('button')) skip(); });
addEventListener('keydown', e => { if (skip && !stage.hidden && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); skip(); } });

// The in-car display: the line, where it is going, and the next stop.
function sign(hop) {
  const layer = board.transit.layers.find(l => l.id === hop.line?.sourceId), ink = layer?.colour || '#52676d';
  const where = J.terminus(net, hop);
  // the line's last stop that way, then the next — once, when they are one
  const end = where && where !== net.name(hop.to) ? `<span>${esc(String(where).toUpperCase())}</span><span aria-hidden="true">›</span>` : '<span aria-hidden="true">›</span>';
  panel.innerHTML = `<div class="v3sign" role="status"><span class="lb" style="background:${ink}">${esc(hop.line.mode === 'metro' ? 'M' : (hop.line.family || hop.line.label))}</span>${end}<span class="nx">${esc(net.name(hop.to).toUpperCase())}</span></div>`;
}

async function pick(i) {
  if (busy || !S || S.phase === 'end') return;
  busy = true; panel.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const wasHop = pendingHop;
  const r = J.choose(net, S, i);
  if (r.error) { busy = false; render(); return; }
  paintHud();
  try {
    if (r.hop) {
      $('v3mini').hidden = true;
      if (r.hop.kind === 'ride') { hideBoard(); paintScene(interior()); sign(r.hop); }
      if (r.story) { pendingHop = r.hop; busy = false; return render(); }
      if (r.hop.kind === 'ride') await beat(1200);
      panel.innerHTML = '';
      await rideBoard(r.hop);
    } else if (wasHop) {
      // the card on the way is answered: the rest of the hop, then the stop
      pendingHop = null; panel.innerHTML = '';
      await rideBoard(wasHop, wasHop.kind === 'walk' ? 0.5 : 0, 1);
    }
    pendingHop = null;
    if (r.delivered) await stamp(r.delivered);
  } finally { busy = false; }
  render();
}

async function stamp(d) {
  hideBoard(); paintScene('stop'); $('v3mini').hidden = true;
  const pts = S.score - (stamp.last || 0); stamp.last = S.score;
  panel.innerHTML = `<div class="v3stamp${d.late ? ' late' : ''}" role="status"><span class="big">${d.late ? 'DELIVERED LATE' : 'DELIVERED'}</span><span>${esc(net.name(d.to))}</span><span class="pts">+${pts}</span></div>`;
  paintHud();
  await beat(1500);
}

// ── the end: the run's result (runs.js) ────────────────────────────────────
function finish() {
  hideBoard(); $('v3mini').hidden = true; panel.innerHTML = '';
  const r = Runs.record(RUN.id, { delivered: S.done, target: S.target, late: S.late, score: S.score });
  const i = Runs.ORDER.indexOf(RUN.id), next = Runs.RUNS[i + 1], star = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const why = r.done ? (r.stars === 1 ? 'every job delivered · some late' : r.stars === 2 ? `every job on time · ${Number(RUN.par).toLocaleString('en-US')} for the third star` : 'every job on time, at par') : `deliver all ${S.target} to complete ${RUN.name}`;
  const opened = r.opened.map(id => `<p class="runOpened">${esc(Runs.BY_ID[id].name)} IS OPEN</p>`).join('') + (r.extrasOpened ? '<p class="runOpened">THE DAILY AND THE WEEK ARE OPEN</p>' : '');
  const go = r.done && next && Runs.unlocked(next.id, r.all) ? `<a class="btn prime wide" id="nextRun" href="${Runs.runHref(next.id, location.search)}">NEXT · ${esc(next.name)}</a>` : '';
  $('endTitle').textContent = r.done ? `${RUN.name} COMPLETE` : 'NOT YET';
  $('endStats').innerHTML = `<div class="dailyBox runBox"><p class="dailyHead">${esc(RUN.name)} · ${esc(RUN.title)}</p><p class="runStars" aria-label="${r.stars} of 3 stars">${star(r.stars)}</p><p class="hint">${esc(why)}${r.newBest && r.all[RUN.id].plays > 1 ? ' · a new best' : ''}</p>${opened}${go}</div>`
    + `<p>deliveries <b>${S.done}/${S.target}</b></p><p>on time <b>${S.done - S.late}</b></p><p>score <b>${S.score}</b></p><p>best streak <b>${S.bestStreak}</b></p>`;
  $('endNote').textContent = r.done ? 'Every job delivered.' : 'The shift ended.';
  const again = $('again'); if (again) { again.textContent = r.done ? `${RUN.name} AGAIN · A NEW SHIFT` : `TRY ${RUN.name} AGAIN`; again.classList.toggle('prime', !go); again.classList.toggle('ghost', !!go); again.onclick = () => { location.href = Runs.runHref(RUN.id, location.search); }; }
  $('end').hidden = false;
  game.result = r;
}

// ── start ──────────────────────────────────────────────────────────────────
async function start() {
  await ready;
  $('title').hidden = true; stage.hidden = false;
  S = J.newRun(net, RUN, SEED); stamp.last = 0; shownMin = null;
  sizeFrame(); render();
}
paintTitle();
$('play')?.addEventListener('click', start);
addEventListener('resize', () => { if (!stage.hidden) { sizeFrame(); if (boardOpen) openBoard(); } });
sizeFrame();

// For the gates: what the screen is showing, read-only. Every action a gate
// takes is a tap on a real button.
const game = { version: BUILD_VERSION, run: RUN, seed: SEED, ready, state: () => S, net: () => net, card: () => (S ? J.card(net, S) : null), busy: () => busy, scene: () => scene, result: null };
globalThis.__tm3 = game;
