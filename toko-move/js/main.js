// Wiring. The board is canvas; everything you can press is a real DOM button,
// which is what keeps the game keyboard-reachable and the 44px and contrast
// floors measurable instead of hand-waved.

import { Game } from './sim.js?v=10';
import { MISSIONS, byId, campaign, clockFmt } from './missions.js?v=10';
import { Renderer } from './render.js?v=10';
import { LineDrawer, RoadDrawer } from './input.js?v=10';
import { Kit } from './audio.js?v=10';
import { PAL, sizeAt } from './palette.js?v=10';

const $ = id => document.getElementById(id);
const HI_KEY = 'tokoMoveHi';              // the arcade's score wall reads this one
const PROGRESS_KEY = 'tokoMoveProgress';
const SOUND_KEY = 'tokoMoveSound';

const CARD = {
  line: ['NEW LINE', 'one more line you are allowed to draw'],
  tunnel: ['TUNNEL', 'one more crossing under the water'],
  train: ['TRAIN', 'another train, on a line you pick'],
  carriage: ['CARRIAGE', 'six more seats, on a line you pick'],
  road: ['MORE ROAD', 'twelve more squares to lay'],
  cars: ['MORE CARS', 'two more on the road at once'],
  bridge: ['BRIDGE', 'one more crossing over the water'],
};

let game, renderer, drawer, kit, drops = 0, feedTimer = 0, keyNav = false;

// ── what you have cleared ───────────────────────────────────────────────
function progress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || { cleared: [], best: {} }; }
  catch { return { cleared: [], best: {} }; }
}
function saveProgress(p) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* private window */ }
}
// The campaign is a spine, but anything cleared stays open — you can go back to
// a mission you liked without replaying the one before it.
function unlocked(m, p) {
  if (m.order == null) return true;
  const spine = campaign();
  const i = spine.indexOf(m);
  return i <= 0 || p.cleared.includes(spine[i - 1].id);
}

function paintMissions() {
  const p = progress();
  for (const [box, list] of [[$('campaignList'), campaign()], [$('freeList'), MISSIONS.filter(m => m.order == null)]]) {
    box.innerHTML = '';
    for (const m of list) {
      const open = unlocked(m, p);
      const done = p.cleared.includes(m.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn wide miss' + (done ? ' done' : '');
      b.disabled = !open;
      const t = document.createElement('b'); t.textContent = m.title;
      const d = document.createElement('span'); d.textContent = m.brief;
      b.append(t, d);
      const best = p.best?.[m.id];
      if (done || best != null || !open) {
        const tag = document.createElement('em');
        tag.className = 'tag';
        tag.textContent = !open ? 'locked' : done ? `cleared · best ${best ?? 0}` : `best ${best}`;
        b.append(tag);
      }
      if (open) b.onclick = () => launch(m.id);
      box.append(b);
    }
  }
}

// ── a run ───────────────────────────────────────────────────────────────
// A pinned board, for reporting a run and for the gate. The v3 rewrite dropped
// this: the end card went on printing "board 481203" while nothing read it back,
// so the number was a receipt for something you could not return to — and every
// gate run got a different board, which is exactly the kind of flake that gets
// written off as "the test is flaky".
function seedFromUrl() {
  const m = /seed=(\d+)/.exec(location.hash || location.search);
  return m ? ((+m[1] | 0) || 1) : null;
}
const nextSeed = () => seedFromUrl() ?? ((Math.random() * 1e9) | 0);

// portrait is the shape of the space the board gets, not of the device
const portraitNow = () => {
  const r = $('wrap').getBoundingClientRect();
  return r.height > r.width;
};

function launch(missionId, seed = nextSeed()) {
  $('title').hidden = true;
  $('end').hidden = true;
  // a panel left open across a launch is a panel describing the wrong layer
  showHowto(false);
  boot(seed, missionId);
  game.start();
  paintHud();
}

function boot(seed, missionId) {
  game = new Game(seed, missionId, { portrait: portraitNow() });
  drops = 0;
  drawer?.destroy();
  renderer = renderer || new Renderer($('board'));
  renderer.resize();
  // the layer decides which gesture the board answers to
  makeDrawer();
  $('endSeed').textContent = `board ${seed}`;
  paintHud();
}

// ── the strip ───────────────────────────────────────────────────────────
// The gesture belongs to the FOCUSED layer: there is nothing to draw on the
// roads and nothing to lay on the metro, so switching layers swaps the whole
// drawer rather than teaching one of them a second verb.
function makeDrawer() {
  drawer?.destroy();
  const Drawer = game.layer === 'roads' ? RoadDrawer : LineDrawer;
  drawer = new Drawer($('board'), renderer, game, {
    onMessage: say,
    onChange: () => { paintHud(); kit.line(); },
  });
}

const LAYER_WORD = { metro: 'metro', roads: 'roads' };

function swapLayer() {
  if (game.layers.length < 2) return;
  const i = game.layers.indexOf(game.layer);
  const next = game.layers[(i + 1) % game.layers.length];
  if (!game.focus(next)) return;
  makeDrawer();
  if (!$('howto').hidden) paintHowto();   // the rules follow the layer
  paintHud();
  say(`drawing on the ${LAYER_WORD[next] ?? next}`);
}

function paintHud() {
  if (!game) return;
  $('score').textContent = game.score;
  $('day').textContent = game.unitLabel;

  const left = game.remaining;
  if (left == null) $('week').textContent = `${game.clock.cycleWord} ${game.cycleNo}`;
  else $('week').textContent = `${clockFmt(left)} left`;

  const goals = game.goalReadout();
  const g = $('goal');
  g.textContent = goals.map(x => x.text).join(' · ');
  g.classList.toggle('close', left != null && left < 60);

  // the counts belong to the layer you are DRAWING on: showing both networks'
  // stock at once was tried on paper and it is six numbers nobody reads
  const swap = $('swap');
  swap.hidden = game.layers.length < 2;
  if (!swap.hidden) {
    const i = game.layers.indexOf(game.layer);
    const next = game.layers[(i + 1) % game.layers.length];
    swap.textContent = LAYER_WORD[game.layer] ?? game.layer;
    swap.setAttribute('aria-label', `Drawing on the ${LAYER_WORD[game.layer]}. Switch to the ${LAYER_WORD[next]}.`);
  }

  if (game.layer === 'roads' && game.roads) {
    stock('stkLines', `${game.roads.used()}/${game.roads.budget}`, game.roads.left() <= 0, 'road');
    stock('stkTrains', game.roads.spareCars, game.roads.spareCars === 0, 'cars idle');
    stock('stkTunnels', game.roads.bridgesLeft(), game.roads.bridgesLeft() === 0, 'bridges');
  } else {
    stock('stkLines', `${game.net.lines.length}/${game.net.maxLines}`, game.net.lines.length >= game.net.maxLines, 'lines');
    stock('stkTrains', game.net.spareTrains, game.net.spareTrains === 0, 'trains');
    stock('stkTunnels', game.net.tunnelsLeft(), game.net.tunnelsLeft() === 0, 'tunnels');
  }

  // The count only exists when there is something to count. A permanent "0
  // stranded" is furniture; a number that appears is a thing that happened.
  const stuck = $('stkStuck');
  stuck.hidden = game.stranded === 0;
  if (!stuck.hidden) stuck.querySelector('b').textContent = game.stranded;

  teach();
}

function stock(id, value, spent, label) {
  const el = $(id);
  el.querySelector('b').textContent = value;
  if (label) el.querySelector('i').textContent = label;
  el.classList.toggle('none', !!spent);
}

// The three rules a growing board cannot teach on its own, said once each, the
// first time the game actually does the thing. Mini Metro teaches by constraint
// and has no tutorial — which works for everything except the rules that have
// nothing to see: a shape nobody can reach, a ring whose meaning you learn by
// dying, and water that refuses you after the fact.
const TIPS = [
  ['stranded', g => g.stranded > 0, g => g.roads
    ? 'Somebody is waiting for a shape no road reaches. They will give up and go.'
    : 'Somebody is waiting for a shape no line reaches. They will give up and go.'],
  ['crowding', g => g.world.stations.some(s => s.over > 0.25),
    'That stop is over capacity. The ring closing around it is the day running out.'],
  ['tunnel', g => !g.roads && g.net.tunnelsLeft() < g.net.ownedTunnels,
    'Crossing water spends a tunnel. You only get more at the end of a week.'],
  // …and the other half of that rule: once they are gone, the stops you cannot
  // reach are RINGED while you drag, rather than refusing you on arrival
  ['nowater', g => !g.roads && g.net.tunnelsLeft() <= 0,
    'No tunnels left. A stop you cannot reach across the water is ringed while you drag.'],
  ['bridge', g => !!g.roads && g.roads.spanned.size > 0,
    'That is a bridge. One buys the whole crossing, however wide the water — but only one crossing.'],
  ['road', g => !!g.roads && g.roads.left() <= 0,
    'That is all the road you have. Lift some from where it is idle, or wait for more.'],
  ['jam', g => !!g.roads && g.roads.jammed > 2,
    'Traffic is backing up. Cars pick their own way — you can only give them more room.'],
];

function teach() {
  if (!game || game.state !== 'play') return;
  for (const [key, when, line] of TIPS) {
    if (game.taught.has(key)) continue;
    if (!when(game)) continue;
    game.taught.add(key);
    say(typeof line === 'function' ? line(game) : line);
    return;                 // one lesson at a time
  }
}

// ── the rules, on demand ────────────────────────────────────────────────
// Every tip this game gives fires ONCE and is gone. That is right for a nudge
// and wrong for the delete gesture: it is the one rule a player cannot guess,
// and the moment they want it is three minutes after it was said. PLAYTEST.md
// §3.3 has had this open since v6.
//
// Keyed by LAYER, because the two layers share no verbs at all — there is
// nothing to draw on the roads and nothing to lay on the metro.
const HOWTO = {
  metro: [
    ['Draw a line', 'drag from one stop to another.'],
    ['Extend it', 'drag from the stub at either end onto the next stop.'],
    ['Take it back', 'drag the stub back down the line — onto the stop behind the end. Keep going and the whole line comes up.'],
    ['Water', 'crossing it spends a tunnel, and you only get more at the end of a week.'],
    ['A stop fills up', 'the ring closing around it is how long you have.'],
  ],
  roads: [
    ['Lay road', 'drag across bare ground.'],
    ['Carry it on', 'start on road you already have and drag onto bare ground.'],
    ['Lift it', 'start on road and drag back along it.'],
    ['Water', 'one bridge buys the whole crossing, however wide — but only one crossing.'],
    ['The cars', 'pick their own way and cannot be told otherwise. All you give them is room.'],
  ],
};

function paintHowto() {
  const ul = $('howtoList');
  ul.textContent = '';
  for (const [what, how] of HOWTO[game?.layer ?? 'metro'] ?? HOWTO.metro) {
    const li = document.createElement('li');
    const b = document.createElement('b');
    b.textContent = what + ' — ';
    li.append(b, document.createTextNode(how));
    ul.append(li);
  }
}

function showHowto(on) {
  const panel = $('howto'), btn = $('help');
  // repainted every time it opens, because the layer can change under it
  if (on) paintHowto();
  panel.hidden = !on;
  btn.setAttribute('aria-expanded', String(!!on));
}

function say(msg) {
  const f = $('feed');
  f.textContent = msg;
  f.classList.add('show');
  clearTimeout(feedTimer);
  feedTimer = setTimeout(() => f.classList.remove('show'), 1900);
}

// ── the upgrade beat ────────────────────────────────────────────────────
function showUpgrade() {
  const veil = $('upgrade');
  $('upWeek').textContent = `${game.clock.cycleWord} ${game.cycleNo}`;
  $('lineWrap').hidden = true;
  const box = $('upBtns');
  box.innerHTML = '';
  for (const kind of game.offer) {
    const [title, blurb] = CARD[kind];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn wide';
    b.innerHTML = '<b></b><span></span>';
    b.querySelector('b').textContent = title;
    b.querySelector('span').textContent = blurb;
    b.onclick = () => choose(kind, b);
    box.append(b);
  }
  veil.hidden = false;
  if (keyNav) box.querySelector('button')?.focus();
}

function choose(kind, btn) {
  for (const b of $('upBtns').querySelectorAll('button')) b.classList.toggle('sel', b === btn);
  if (!game.needsLine(kind)) return apply(kind, null);
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
const REASON = {
  won: 'Everybody got where they were going.',
  timeup: 'The night ended with people still standing on platforms.',
  overcrowd: null,               // filled in from the stop that gave out
};

function showEnd() {
  const r = game.report();
  const p = progress();
  p.best = p.best || {};
  p.best[r.mission] = Math.max(r.score, p.best[r.mission] ?? 0);
  if (r.won && !p.cleared.includes(r.mission)) p.cleared.push(r.mission);
  saveProgress(p);
  if (r.mission === 'endless') {
    try { localStorage.setItem(HI_KEY, Math.max(r.score, +(localStorage.getItem(HI_KEY) || 0))); } catch { /* ignore */ }
  }

  $('endTitle').textContent = r.won ? 'THE NIGHT HELD' : r.reason === 'overcrowd' ? 'THE LINE STOPPED' : 'DAWN CAME FIRST';
  const worst = game.world.worstStation();
  $('endWhy').textContent = r.reason === 'overcrowd'
    ? `The ${worst ? worst.kind : ''} stop could not take any more.`
    : (REASON[r.reason] || '');

  $('endStats').innerHTML = '';
  const rows = [[r.title, '']];
  for (const g of r.goals) rows.push([g.text, g.have >= g.want ? 'met' : 'missed']);
  rows.push(['delivered', r.score]);
  if (r.gaveUp) rows.push(['gave up and went home', r.gaveUp]);
  rows.push(['best here', p.best[r.mission]]);
  rows.push([r.cycleWord === 'week' ? 'lasted' : 'ran', `${r.units} ${r.cycleWord === 'week' ? 'days' : 'hours'}`]);
  rows.push(['stops open', r.stations]);
  rows.push(['lines running', r.lines]);
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
    const was = game.state;
    game.step(dt);
    drainEvents();
    if (game.state !== was) {
      if (game.state === 'upgrade') showUpgrade();
      if (game.state === 'over' || game.state === 'won') showEnd();
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
    else if (e === 'week') kit.week();
    else if (e === 'over') kit.over();
    else if (e === 'won') kit.week();
    else if (e && e.say) { say(e.say); kit.line(); }
  }
  game.events.length = 0;
}

// ── controls ────────────────────────────────────────────────────────────
kit = new Kit();
boot(nextSeed(), 'endless');
paintMissions();

$('again').addEventListener('click', () => launch(game.mission.id));
$('toMissions').addEventListener('click', () => {
  $('end').hidden = true;
  paintMissions();
  $('title').hidden = false;
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
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch { /* ignore */ }
  kit.enable(on);
});
if (localStorage.getItem(SOUND_KEY) === '1') {
  $('sound').setAttribute('aria-pressed', 'true');
  addEventListener('pointerdown', () => kit.enable(true), { once: true });
}

$('help').addEventListener('click', () => showHowto($('howto').hidden));
$('swap').addEventListener('click', swapLayer);

addEventListener('keydown', e => {
  keyNav = true;
  if (e.key === ' ' && game.state === 'play') { e.preventDefault(); $('pause').click(); }
  // Tab is taken by focus, so the layer switch is on a letter
  if ((e.key === 'l' || e.key === 'L') && game.state === 'play') swapLayer();
  // Esc closes the rules and puts focus back where it came from — a panel you
  // can open and not close with the keyboard is a trap
  if (e.key === 'Escape' && !$('howto').hidden) { showHowto(false); $('help').focus(); }
});
addEventListener('pointerdown', () => { keyNav = false; }, true);
addEventListener('resize', () => renderer?.resize());
new ResizeObserver(() => renderer?.resize()).observe($('wrap'));

requestAnimationFrame(frame);

window.__tm = {
  get game() { return game; },
  get net() { return game.net; },
  get world() { return game.world; },
  get renderer() { return renderer; },
  toClient(bx, by) {
    const r = renderer.canvas.getBoundingClientRect();
    return { x: r.left + renderer.ox + bx * renderer.scale, y: r.top + renderer.oy + by * renderer.scale };
  },
  missions: MISSIONS,
  // the gate measures TAP TARGETS off these; a test that recomputes where the
  // nub is can agree with itself while disagreeing with the game
  get touch() {
    return {
      scale: renderer.scale,
      nubs: drawer.nubs(),
      nubHitPx: drawer.nubHit * 2 * renderer.scale,
      stationHitPx: drawer.stationHit * 2 * renderer.scale,
      nubDrawPx: (drawer.view().nubR || 0) * renderer.scale,
    };
  },
  debug: { launch, boot, showUpgrade, showEnd, say, paintMissions, progress, byId, sizeAt, seedFromUrl, PAL,
    // which gesture the board is answering to — the gate needs to see that it
    // moves with the layer, and `drawer` itself is not on the surface
    drawerKind: () => (drawer instanceof RoadDrawer ? 'roads' : 'metro') },
};
