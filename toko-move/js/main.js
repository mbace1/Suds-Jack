// Wiring. The board is canvas; everything you can press is a real DOM button,
// which is what keeps the game keyboard-reachable and the 44px and contrast
// floors measurable instead of hand-waved.

import { Game, DAYS, WEEK } from './sim.js?v=1';
import { Renderer } from './render.js?v=1';
import { LineDrawer } from './input.js?v=1';
import { Kit } from './audio.js?v=1';
import { PAL } from './palette.js?v=1';

const $ = id => document.getElementById(id);
const HI_KEY = 'tokoMoveHi';
const SOUND_KEY = 'tokoMoveSound';

const CARD = {
  line: ['NEW LINE', 'one more line you are allowed to draw'],
  tunnel: ['TUNNEL', 'one more crossing under the water'],
  train: ['TRAIN', 'another train, on a line you pick'],
  carriage: ['CARRIAGE', 'six more seats, on a line you pick'],
};

let game, renderer, drawer, kit, drops = 0, feedTimer = 0, keyNav = false;

function seedFromUrl() {
  const m = /seed=(\d+)/.exec(location.hash || location.search);
  return m ? (+m[1] | 0) || 1 : (Math.random() * 1e9) | 0;
}

function boot(seed = seedFromUrl()) {
  game = new Game(seed);
  drops = 0;
  drawer?.destroy();
  renderer = renderer || new Renderer($('board'));
  renderer.resize();
  drawer = new LineDrawer($('board'), renderer, game, {
    onMessage: say,
    onChange: () => { paintHud(); kit.line(); },
  });
  $('seedNote').textContent = `board ${seed}`;
  $('endSeed').textContent = `board ${seed}`;
  paintHud();
}

// ── the strip ───────────────────────────────────────────────────────────
function paintHud() {
  $('score').textContent = game.score;
  $('day').textContent = DAYS[game.day];
  $('week').textContent = `week ${game.weekNo}`;
  stock('stkLines', `${game.net.lines.length}/${game.net.maxLines}`, game.net.lines.length >= game.net.maxLines);
  stock('stkTrains', game.net.spareTrains, game.net.spareTrains === 0);
  stock('stkTunnels', game.net.tunnelsLeft(), game.net.tunnelsLeft() === 0);
}

function stock(id, value, spent) {
  const el = $(id);
  el.querySelector('b').textContent = value;
  el.classList.toggle('none', !!spent);
}

function say(msg) {
  const f = $('feed');
  f.textContent = msg;
  f.classList.add('show');
  clearTimeout(feedTimer);
  feedTimer = setTimeout(() => f.classList.remove('show'), 1900);
}

// ── the weekly card ─────────────────────────────────────────────────────
function showUpgrade() {
  const veil = $('upgrade');
  $('upWeek').textContent = `end of week ${game.week}`;
  $('lineWrap').hidden = true;
  const box = $('upBtns');
  box.innerHTML = '';
  for (const kind of game.offer) {
    const [title, blurb] = CARD[kind];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn wide';
    b.innerHTML = `<b></b><span></span>`;
    b.querySelector('b').textContent = title;
    b.querySelector('span').textContent = blurb;
    b.onclick = () => choose(kind, b);
    box.append(b);
  }
  veil.hidden = false;
  if (keyNav) box.querySelector('button')?.focus();
}

function choose(kind, btn) {
  // mark what was picked — the picker opening underneath a pair of buttons that
  // both still look unpressed leaves you unsure which reward you are placing
  for (const b of $('upBtns').querySelectorAll('button')) b.classList.toggle('sel', b === btn);
  if (!game.needsLine(kind)) return apply(kind, null);
  // second step rather than a card per line — the reward and its destination
  // are two different decisions and stacking them makes eight buttons
  const wrap = $('lineWrap');
  const pick = $('linePick');
  pick.innerHTML = '';
  $('lineAsk').textContent = kind === 'train' ? 'Which line gets the train?' : 'Which line gets the carriage?';
  for (const line of game.net.lines) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    const sw = document.createElement('s');
    sw.style.background = PAL.lines[line.colour];
    const label = document.createElement('span');
    const trains = line.trains.length;
    label.textContent = `${line.stations.length} stops · ${trains} train${trains === 1 ? '' : 's'}`;
    b.append(sw, label);
    b.setAttribute('aria-label', `Line ${line.id + 1}, ${label.textContent}`);
    b.onclick = () => apply(kind, line.id);
    pick.append(b);
  }
  wrap.hidden = false;
  if (keyNav) pick.querySelector('button')?.focus();
}

function apply(kind, lineId) {
  game.applyUpgrade(kind, lineId);
  $('upgrade').hidden = true;
  paintHud();
}

// ── the end ─────────────────────────────────────────────────────────────
function showEnd() {
  const r = game.report();
  const hi = Math.max(r.score, +(localStorage.getItem(HI_KEY) || 0));
  localStorage.setItem(HI_KEY, hi);

  const worst = game.world.worstStation();
  $('endWhy').textContent = worst
    ? `The ${worst.kind} stop could not take any more.`
    : 'The network gave out.';
  $('endStats').innerHTML = '';
  const rows = [
    ['delivered', r.score],
    ['best', hi],
    ['lasted', `${r.weeks} week${r.weeks === 1 ? '' : 's'}, ${r.days % 7} day${r.days % 7 === 1 ? '' : 's'}`],
    ['stops open', r.stations],
    ['lines running', r.lines],
  ];
  for (const [k, v] of rows) {
    const d = document.createElement('div');
    const a = document.createElement('span'); a.textContent = k;
    const b = document.createElement('b'); b.textContent = v;
    d.append(a, b);
    $('endStats').append(d);
  }
  $('end').hidden = false;
  if (keyNav) $('again').focus();
}

// ── the loop ────────────────────────────────────────────────────────────
let last = 0;
function frame(now) {
  const dt = last ? (now - last) / 1000 : 0;
  last = now;
  if (game) {
    const wasState = game.state;
    game.step(dt);
    drainEvents();
    if (game.state !== wasState) {
      if (game.state === 'upgrade') showUpgrade();
      if (game.state === 'over') showEnd();
    }
    renderer.draw(game, drawer.view());
    if ((now | 0) % 4 === 0) paintHud();
  }
  requestAnimationFrame(frame);
}

function drainEvents() {
  if (!game.events.length) return;
  for (const e of game.events) {
    if (e === 'drop') kit.drop(drops++);
    if (e === 'week') kit.week();
    if (e === 'over') kit.over();
  }
  game.events.length = 0;
}

// ── controls ────────────────────────────────────────────────────────────
kit = new Kit();
boot();

$('play').addEventListener('click', () => {
  $('title').hidden = true;
  game.start();
  paintHud();
});

$('again').addEventListener('click', () => {
  $('end').hidden = true;
  boot((Math.random() * 1e9) | 0);
  game.start();
});

$('pause').addEventListener('click', () => {
  if (game.state !== 'play') return;
  game.paused = !game.paused;
  $('pause').textContent = game.paused ? '▶' : '❚❚';
  $('pause').setAttribute('aria-label', game.paused ? 'Resume' : 'Pause');
});

$('speed').addEventListener('click', () => {
  game.speed = game.speed >= 2 ? 1 : 2;
  $('speed').textContent = `×${game.speed}`;
});

$('sound').addEventListener('click', () => {
  const on = $('sound').getAttribute('aria-pressed') !== 'true';
  $('sound').setAttribute('aria-pressed', String(on));
  localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  kit.enable(on);
});
if (localStorage.getItem(SOUND_KEY) === '1') {
  $('sound').setAttribute('aria-pressed', 'true');
  // the context still needs a gesture; this only records the preference
  addEventListener('pointerdown', () => kit.enable(true), { once: true });
}

addEventListener('keydown', e => {
  keyNav = true;
  if (e.key === ' ' && game.state === 'play') { e.preventDefault(); $('pause').click(); }
});
addEventListener('pointerdown', () => { keyNav = false; }, true);
addEventListener('resize', () => renderer?.resize());
new ResizeObserver(() => renderer?.resize()).observe($('wrap'));

requestAnimationFrame(frame);

// the smoke gate drives the game through this rather than through the pointer
window.__tm = {
  get game() { return game; },
  get net() { return game.net; },
  get world() { return game.world; },
  get renderer() { return renderer; },
  // board -> page, so a test taps by board coordinate and can never drift from
  // the letterbox the renderer actually used
  toClient(bx, by) {
    const r = renderer.canvas.getBoundingClientRect();
    return { x: r.left + renderer.ox + bx * renderer.scale, y: r.top + renderer.oy + by * renderer.scale };
  },
  debug: { boot, showUpgrade, showEnd, say, WEEK },
};
