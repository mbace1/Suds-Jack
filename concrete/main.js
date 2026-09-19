import { createGame } from './skate.js?v=6';
import { createPadEdge } from './pad.js?v=1';
const $ = id => document.getElementById(id);

// Every menu on this page is built for a DualSense first: up/down on the
// stick or d-pad walks it, cross confirms, circle backs out, left/right turns
// a setting, Options pauses. The keyboard and the pointer drive the same
// menus through the same three verbs, and the glyphs on screen follow
// whichever controller was touched last.
const GLYPHS = {
  ps: { cross: '✕', circle: '○', square: '□', triangle: '△', options: 'OPTIONS', create: 'CREATE', l1: 'L1', r1: 'R1', r2: 'R2', move: 'L', look: 'R', dpad: '✥' },
  xbox: { cross: 'A', circle: 'B', square: 'X', triangle: 'Y', options: '☰', create: '⧉', l1: 'LB', r1: 'RB', r2: 'RT', move: 'L', look: 'R', dpad: '✥' },
  key: { cross: 'SPACE', circle: 'K', square: 'J', triangle: 'L', options: 'ESC', create: 'R', l1: 'Q', r1: 'E', r2: 'W', move: 'WASD', look: 'MOUSE', dpad: '↑↓' },
  touch: { cross: 'OLLIE', circle: 'GRAB', square: 'FLIP', triangle: 'GRIND', options: '?', create: '—', l1: '←', r1: '→', r2: '↑', move: '✥', look: '◉', dpad: 'TAP' },
};
GLYPHS.generic = GLYPHS.xbox;
let glyphKind = '';
function setGlyphs(kind) {
  if (!GLYPHS[kind] || kind === glyphKind) return;
  glyphKind = kind;
  document.documentElement.dataset.glyphs = kind;
  for (const el of document.querySelectorAll('i[data-g]')) el.textContent = GLYPHS[kind][el.dataset.g] || '';
}
setGlyphs(matchMedia('(pointer:coarse)').matches ? 'touch' : 'key');

// --- Options ---------------------------------------------------------------
const CHOICES = { skater: ['thps', 'blender'], look: ['modern', 'ps1'], reflections: ['auto', 'on', 'off'] };
const LABELS = { thps: 'THPS ’99', blender: 'BLENDER RIG', modern: 'MODERN', ps1: 'PS1', auto: 'AUTO', on: 'ON', off: 'OFF' };
const options = { skater: 'thps', look: 'modern', reflections: 'auto' };
try { Object.assign(options, JSON.parse(localStorage.getItem('concrete-opts') || '{}')); } catch { }
const params = new URLSearchParams(location.search);
for (const k in CHOICES) if (CHOICES[k].includes(params.get(k))) options[k] = params.get(k);
for (const k in CHOICES) if (!CHOICES[k].includes(options[k])) options[k] = CHOICES[k][0];
function saveOptions() { try { localStorage.setItem('concrete-opts', JSON.stringify(options)); } catch { } }

// --- Game ------------------------------------------------------------------
let screen = 'title', game, ended = false;
const activate = (el, fn) => {
  let last = -Infinity;
  const fire = e => { if (e.type === 'touchend') e.preventDefault(); if (performance.now() - last < 300) return; last = performance.now(); fn(e); };
  el.addEventListener('pointerup', fire);
  el.addEventListener('touchend', fire, { passive: false });
  el.addEventListener('click', e => { if (e.detail === 0) fn(e); });
};
try {
  game = createGame($('world'), h => {
    for (const k of ['score', 'best', 'speed', 'device']) $(k).textContent = k === 'speed' ? Math.round(h.speed * 3.6) : k === 'device' ? h[k] : Math.floor(h[k]).toLocaleString();
    $('time').textContent = `${Math.floor(h.time / 60)}:${Math.floor(h.time % 60).toString().padStart(2, '0')}`;
    $('timebar').style.width = `${h.time / 120 * 100}%`;
    $('combo-label').textContent = h.combo ? 'CURRENT COMBO' : 'FIND YOUR NEXT LINE';
    $('combo').textContent = h.combo ? `${Math.floor(h.combo)} × ${h.mult}` : '';
    $('trick-name').textContent = h.trick;
    if (screen === 'play') setGlyphs(h.device === 'DUALSENSE' ? 'ps' : h.device === 'CONTROLLER' ? (h.padKind || 'xbox') : h.device === 'TOUCH' ? 'touch' : 'key');
    if (h.ended && !ended) {
      ended = true;
      $('title').innerHTML = 'SESSION<br>COMPLETE.';
      $('message').textContent = `${h.score.toLocaleString()} points. One more run?`;
      $('start').textContent = 'RUN IT BACK ↗';
      show('title');
    }
  }, options);
  game.ready.finally(() => { $('start').disabled = false; $('start').textContent = 'DROP IN ↗'; menus.title.select(0); });
  game.setLook(options.look);
  game.setReflections(options.reflections);
  if (game.mobile) CHOICES.skater = ['thps'];
} catch (e) {
  $('support').textContent = 'WebGL could not start. Enable hardware acceleration and reload.';
  console.error(e);
}

// --- Menus -----------------------------------------------------------------
class Menu {
  constructor(id, handlers) {
    this.el = $(id); this.handlers = handlers; this.index = 0;
    this.items = [...this.el.querySelectorAll('.item')];
    this.items.forEach((item, i) => {
      activate(item, () => { this.select(i); this.confirm(); });
      item.addEventListener('pointerenter', () => this.select(i));
    });
    this.select(0);
  }
  select(i) {
    const n = this.items.length;
    this.index = ((i % n) + n) % n;
    this.items.forEach((item, j) => { item.classList.toggle('selected', j === this.index); item.setAttribute('aria-selected', j === this.index ? 'true' : 'false'); });
  }
  move(d) { let i = this.index; for (let k = 0; k < this.items.length; k++) { i += d; const item = this.items[((i % this.items.length) + this.items.length) % this.items.length]; if (!item.disabled) break; } this.select(i); }
  confirm() { const item = this.items[this.index]; if (item.disabled) return; if (item.dataset.opt) this.adjust(1); else this.handlers.act?.(item.dataset.act, item); }
  adjust(d) { const item = this.items[this.index]; if (item.dataset.opt) this.handlers.adjust?.(item.dataset.opt, d); }
  back() { this.handlers.back?.(); }
}
const menus = {};
const SCREENS = { title: 'intro', pause: 'pause', options: 'options' };
let optionsFrom = 'title';
function show(next) {
  for (const [name, id] of Object.entries(SCREENS)) $(id).hidden = name !== next;
  $('trick').hidden = next !== 'play';
  $('touch').hidden = next !== 'play';
  screen = next;
  document.documentElement.dataset.screen = next;
  if (next === 'options') renderOptions();
  if (next !== 'play' && next !== 'title') game?.pause(true);
  if (next === 'play') game?.pause(false);
}
function start() {
  if (!game || $('start').disabled) return;
  game.start();
  ended = false;
  show('play');
}
function openControls() {
  const dlg = $('controls');
  if (dlg.open) return;
  if (screen === 'play') game?.pause(true);
  dlg.showModal();
}
function openPause() {
  if (screen !== 'play' || !game?.active) return;
  menus.pause.select(0);
  show('pause');
}
function resume() { if (screen === 'pause' || screen === 'options' && optionsFrom === 'pause') show('play'); }
function quit() { game?.end(); }
function openOptions(from) { optionsFrom = from; menus.options.select(0); show('options'); }
function renderOptions() {
  for (const item of menus.options.items) {
    const k = item.dataset.opt;
    if (!k) continue;
    item.querySelector('b').textContent = LABELS[options[k]] || options[k];
    item.hidden = CHOICES[k].length < 2;
  }
  const all = [...$('options-menu').querySelectorAll('.item')];
  for (const item of all) item.classList.remove('selected');
  menus.options.items = all.filter(i => !i.hidden);
  menus.options.select(Math.min(menus.options.index, menus.options.items.length - 1));
}
function adjust(k, d) {
  const list = CHOICES[k];
  options[k] = list[(list.indexOf(options[k]) + d + list.length) % list.length];
  saveOptions();
  if (k === 'look') game?.setLook(options.look);
  if (k === 'reflections') game?.setReflections(options.reflections);
  if (k === 'skater') game?.setSkater(options.skater).then(actual => { if (actual !== options.skater) { options.skater = actual; saveOptions(); } renderOptions(); });
  renderOptions();
}
const commonAct = from => (act) => {
  if (act === 'start' || act === 'restart') start();
  else if (act === 'controls') openControls();
  else if (act === 'options') openOptions(from);
  else if (act === 'resume') resume();
  else if (act === 'quit') { show('play'); quit(); }
  else if (act === 'back') show(optionsFrom);
};
menus.title = new Menu('title-menu', { act: commonAct('title'), back: () => { } });
menus.pause = new Menu('pause-menu', { act: commonAct('pause'), back: resume });
menus.options = new Menu('options-menu', { act: commonAct('options'), adjust, back: () => show(optionsFrom) });
function current() { return screen === 'title' ? menus.title : screen === 'pause' ? menus.pause : screen === 'options' ? menus.options : null; }

activate($('help'), () => { if (screen === 'play') openPause(); else openControls(); });
activate($('footer-help'), openControls);
activate($('close-controls'), () => $('controls').close());
$('controls').addEventListener('close', () => { if (screen === 'play') game?.pause(false); });
$('controls').addEventListener('cancel', e => { e.preventDefault(); $('controls').close(); });

window.addEventListener('keydown', e => {
  const dlg = $('controls');
  if (dlg.open) { if (['Escape', 'Backspace', 'Enter', ' ', 'k'].includes(e.key)) { e.preventDefault(); dlg.close(); } return; }
  if (screen === 'play') { if (e.key === 'Escape') { e.preventDefault(); openPause(); } return; }
  const m = current(); if (!m) return;
  const k = e.key.toLowerCase();
  if (k === 'arrowdown' || k === 's') { e.preventDefault(); m.move(1); }
  else if (k === 'arrowup' || k === 'w') { e.preventDefault(); m.move(-1); }
  else if (k === 'arrowright' || k === 'd') { e.preventDefault(); m.adjust(1); }
  else if (k === 'arrowleft' || k === 'a') { e.preventDefault(); m.adjust(-1); }
  else if (k === 'enter' || k === ' ') { e.preventDefault(); m.confirm(); }
  else if (k === 'escape' || k === 'backspace') { e.preventDefault(); if (screen === 'pause') resume(); else m.back(); }
});

// Touch buttons and sticks (the same verbs, one finger each).
for (const el of document.querySelectorAll('[data-key]')) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); game?.key(el.dataset.key, true); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(event, () => game?.key(el.dataset.key, false));
}
for (const [id, look] of [['move-stick', false], ['look-stick', true]]) {
  const el = $(id);
  const move = e => { const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; if (look) game?.look(x * 2 - 1, y * 2 - 1); else game?.stick(x * 120, y * 120); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); move(e); });
  el.addEventListener('pointermove', e => { if (el.hasPointerCapture(e.pointerId)) move(e); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(ev, () => { if (look) game?.look(0, 0); else game?.stick(60, 60); });
}

// The controller in the menus. The game reads the same pad itself during
// play and drains it on every transition, so a cross that confirmed DROP IN
// never becomes the first ollie of the run.
const edge = createPadEdge();
function padLoop(now) {
  requestAnimationFrame(padLoop);
  const pe = edge.tick(now);
  if (!pe.pad) return;
  if (pe.pressed.size || pe.step) setGlyphs(pe.kind);
  const dlg = $('controls');
  if (dlg.open) { if (pe.pressed.has(0) || pe.pressed.has(1)) dlg.close(); return; }
  if (screen === 'play') { if (pe.pressed.has(9)) openPause(); return; }
  const m = current(); if (!m) return;
  if (pe.step && pe.dy) m.move(pe.dy);
  if (pe.step && pe.dx) m.adjust(pe.dx);
  if (pe.pressed.has(0)) m.confirm();
  if (pe.pressed.has(1)) { if (screen === 'pause') resume(); else m.back(); }
  if (pe.pressed.has(9) && screen === 'pause') resume();
}
requestAnimationFrame(padLoop);
show('title');

window.__concrete = {
  game, options, get screen() { return screen; },
  debug: { pose: (name, t) => game?.skater.hold(name, t), poses: () => game?.skater.poses, look: () => game?.lookPass.metrics() },
};
