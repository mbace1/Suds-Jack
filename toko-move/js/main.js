// Toko Move — keep a growing city moving through one day.
// Same core, same city, same capacity. Warm, readable, no hard failure.

import { createFlow } from '../../flow-core/sim.js?v=2';
import { KALLIO } from '../../flow-core/city.js?v=1';
import { FlowRenderer } from '../../flow-core/render.js?v=1';
import { RouteDrawer } from '../../flow-core/input.js?v=1';
import { Carrier } from '../../flow-core/routes.js?v=1';
import { THEME } from './palette.js?v=1';
import { DayGoals, TARGET } from './goals.js?v=1';

const $ = id => document.getElementById(id);
const DAYS = 1;
let flow, goals, renderer, drawer, draft = null, sel = null, done = false, delivered = 0;
let msgs = [];

function say(l) { msgs.unshift(l); msgs.length = Math.min(msgs.length, 12); paintFeed(); }

function boot(seed = 7) {
  flow = createFlow({
    city: KALLIO, seed, days: DAYS,
    demand: {
      rate: 130,
      pairs: [
        { from: 'home', to: 'work', weight: 3 },
        { from: 'home', to: 'school', weight: 2 },
        { from: 'home', to: 'shop', weight: 2 },
        { from: 'work', to: 'home', weight: 3 },
        { from: 'shop', to: 'home', weight: 2 },
        { from: 'transfer', to: 'shop', weight: 1 },
      ],
    },
    hooks: {
      onTick: t => {
        goals.step(t);
        drainDeliveries();
        // the first booking comes in with the morning, then a steady trickle
        if (t === 120 || t % 900 === 0) callForService();
      },
      onDay: () => finish(),
      onEvent: ev => {
        if (ev.kind === 'close_edge') say(`Track work between stops. Journeys are finding another way.`);
        if (ev.kind === 'slow_edge') say(`A slow order is in place. Allow extra time.`);
        if (ev.kind === 'surge') say(`A crowd is building at ${flow.graph.node(ev.target).name}.`);
        if (ev.kind === 'choice') offerUpgrade();
      },
    },
  });
  goals = new DayGoals(flow);
  done = false; delivered = 0; msgs = []; sel = null;

  $('map').style.aspectRatio = `${flow.graph.bounds.w} / ${flow.graph.bounds.h}`;
  drawer?.destroy();               // or a restart leaves the old one listening
  renderer = new FlowRenderer($('map'), THEME);
  drawer = new RouteDrawer($('map'), renderer, flow, {
    markersProvider: () => markers(),
    onCommit: (mode, nodes) => {
      const r = flow.addRoute(mode, nodes);
      say(r.error ? `— ${r.error}` : `New line: ${nodes.map(id => flow.graph.node(id).name).join(' → ')}.`);
      paintHud();
    },
    onTap: (hit, p) => {
      if (hit.kind === 'node') { sel = hit.id; paintSheet(); hidePop(); }
      else showPop(hit, p);
    },
    onDraft: d => { draft = d; },
  });

  say('Morning. Everybody is about to need to be somewhere.');
  paintHud(); paintSheet();
}

// The fourth layer here is freight and maintenance — same injection point, same
// capacity, nothing hidden about it.
function callForService() {
  const ns = [...flow.graph.nodes.values()];
  const from = ns.find(n => n.has('shop')) || ns[0];
  const to = ns.find(n => n.has('work') && n.id !== from.id) || ns[1];
  flow.inject(from.id, to.id, { kind: 'freight', n: 1 });
  say(`A delivery is booked from ${from.name} to ${to.name}.`);
}

function drainDeliveries() {
  for (const t of flow.trips.completed) {
    if (!t.payload || t._seen) continue;
    t._seen = true;
    delivered += 1;
    goals.deliveries = delivered;
  }
}

function offerUpgrade() {
  if (done) return;
  flow.clock.setPaused(true);
  $('upText').textContent = 'The transport board can fund one improvement today. Which helps more right now?';
  const box = $('upBtns'); box.innerHTML = '';
  const opts = [
    {
      label: 'Put another carrier on every line',
      run: () => {
        for (const r of flow.routes.list) {
          r.carriers.push(new Carrier({ routeId: r.id, capacity: r.carrierCapacity, at: 0 }));
        }
      },
    },
    {
      label: 'Raise every stop\'s shelter capacity',
      run: () => { for (const n of flow.graph.nodes.values()) n.capacity += 10; },
    },
  ];
  for (const o of opts) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn wide'; b.textContent = o.label;
    b.onclick = () => {
      o.run();
      goals.upgrades += 1;
      $('upgrade').hidden = true;
      flow.clock.setPaused(false);
      say('The improvement is in service.');
      paintHud();
    };
    box.append(b);
  }
  $('upgrade').hidden = false;
}

function finish() {
  if (done) return;
  done = true;
  flow.clock.setPaused(true);
  const r = goals.report();
  $('endTitle').textContent = r.passed ? 'A GOOD DAY' : 'THE DAY IS OVER';
  $('endStats').innerHTML =
    `<p>journeys completed <b>${(r.completion * 100) | 0}%</b> <span class="t">target ${(TARGET.completion * 100) | 0}%</span></p>` +
    `<p>city reached <b>${(r.access * 100) | 0}%</b> <span class="t">target ${(TARGET.access * 100) | 0}%</span></p>` +
    `<p>emissions <b>${r.emissions | 0}</b> <span class="t">budget ${TARGET.emissions}</span></p>` +
    `<p>deliveries made <b>${r.deliveries}</b></p>`;
  const missed = goals.unreached();
  $('endNote').textContent = missed.length
    ? `Still no line at: ${missed.join(', ')}.`
    : 'Every stop had a service today.';
  $('end').hidden = false;
}

// ── the pin layer ───────────────────────────────────────────────────────
// What the day map can be asked about: deliveries on their way, and any stop
// starting to overflow. Built fresh each paint so nothing shown is stale.
function markers() {
  if (!flow || !goals) return [];
  const out = [];
  const slots = {};
  const slot = node => (slots[node] = (slots[node] ?? -1) + 1);

  for (const t of flow.trips.active) {
    if (!t.payload) continue;
    out.push({
      id: `job:${t.id}`, node: t.dest, slot: slot(t.dest),
      glyph: '▣', color: '#e2683c', data: t,
    });
  }
  const w = goals.worstCrowd();
  if (w.id && w.load > 0.7) {
    out.push({ id: 'crowd', node: w.id, slot: slot(w.id), glyph: '!', color: '#e2683c' });
  }
  return out;
}

// ── the small window ────────────────────────────────────────────────────
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

function showPop(hit, p) {
  const body = popBody(hit);
  if (!body) { hidePop(); return; }
  $('popBody').innerHTML = body;
  const box = $('pop');
  box.hidden = false;
  const r = $('map').getBoundingClientRect();
  const w = Math.min(300, innerWidth - 20);
  box.style.width = w + 'px';
  box.style.left = Math.max(10, Math.min(innerWidth - w - 10, r.left + p.x - w / 2)) + 'px';
  box.style.top = Math.max(10, Math.min(innerHeight - 170, r.top + p.y + 14)) + 'px';
}
function hidePop() { $('pop').hidden = true; }

function popBody(hit) {
  const name = id => flow.graph.node(id).name;
  if (hit.kind === 'carrier') {
    const r = flow.routes.get(hit.routeId);
    if (!r) return null;
    const c = r.carriers.find(k => k.id === hit.carrierId);
    const title = r.fixed
      ? (r.mode === 'metro' ? 'The metro' : r.mode === 'car' ? `Street traffic · ${r.label}` : `Tram ${r.label}`)
      : `Your line ${r.id.toUpperCase()}`;
    return `<h3>${esc(title)}</h3>`
      + `<p>${c.load.length}/${r.carrierCapacity} aboard between ${esc(name(r.nodes[c.idx]))} and ${esc(name(r.nodes[Math.min(c.idx + Math.max(c.dir, 0), r.nodes.length - 1)]))}.</p>`
      + (r.fixed ? '<p class="dim">A city service — it runs whether you plan around it or not.</p>' : '');
  }
  if (hit.kind !== 'marker') return null;
  const mk = hit.marker;
  if (mk.id.startsWith('job:')) {
    const t = mk.data;
    return `<h3>Delivery due</h3>`
      + `<p>Booked from ${esc(name(t.origin))} to ${esc(name(t.dest))} — ${t.state === 'riding' ? 'on its way now' : 'still waiting for a line that goes there'}.</p>`;
  }
  if (mk.id === 'crowd') {
    const w = goals.worstCrowd();
    return `<h3>Crowding · ${esc(name(w.id))}</h3>`
      + `<p>The shelter is at ${Math.round(w.load * 100)}% of its capacity. More service here, or a second way out, before people start giving up.</p>`;
  }
  return null;
}

function paintHud() {
  const r = goals.report();
  $('done').textContent = `${(r.completion * 100) | 0}%`;
  $('reach').textContent = `${(r.access * 100) | 0}%`;
  $('emit').textContent = `${r.emissions | 0}`;
  $('clock').textContent = `${String(6 + Math.floor(flow.clock.dayProgress * 16)).padStart(2, '0')}:00`;
  $('lines').textContent = `${flow.routes.drawn.length}/${flow.routes.maxRoutes} lines`;
}

function paintSheet() {
  const box = $('sheet');
  if (!sel) { box.innerHTML = '<p class="hint">Drag between two stops to open a line. Tap a stop to see who is waiting.</p>'; return; }
  const n = flow.graph.node(sel);
  const served = flow.routes.routesAt(sel).length;
  box.innerHTML = `<h2>${n.name}</h2>`
    + `<p class="hint">${n.waiting.length} waiting of ${n.capacity} · ${served ? `${served} line${served > 1 ? 's' : ''} call here` : 'no line calls here'}</p>`
    + `<p class="hint">${n.tags.map(t => ({ home: 'homes', work: 'workplaces', school: 'a school', shop: 'shops', transfer: 'an interchange', service: 'services' }[t] || t)).join(' · ')}</p>`;
}

function paintFeed() {
  const f = $('feed'); f.innerHTML = '';
  for (const m of msgs.slice(0, 3)) { const d = document.createElement('div'); d.textContent = m; f.append(d); }
}

let last = 0;
function frame(now) {
  const dt = last ? Math.min(120, now - last) : 0; last = now;
  if (flow) {
    flow.update(dt);
    renderer.draw(flow, { draft, alpha: flow.clock.alpha(), markers: markers() });
    if (flow.clock.tick % 10 === 0) paintHud();
  }
  requestAnimationFrame(frame);
}

addEventListener('resize', () => renderer?.resize());
$('play').addEventListener('click', () => { $('title').hidden = true; flow.clock.setPaused(false); });
$('pause').addEventListener('click', () => {
  flow.clock.setPaused(!flow.clock.paused);
  $('pause').textContent = flow.clock.paused ? '▶' : '❚❚';
});
$('speed').addEventListener('click', () => {
  const s = flow.clock.speed >= 4 ? 1 : flow.clock.speed * 2;
  flow.clock.setSpeed(s); $('speed').textContent = `×${s}`;
});
$('again').addEventListener('click', () => { $('end').hidden = true; boot(7); flow.clock.setPaused(false); });
$('popClose').addEventListener('click', hidePop);
addEventListener('keydown', e => { if (e.key === 'Escape') hidePop(); });

boot(7);
requestAnimationFrame(frame);

window.__tm = {
  get flow() { return flow; }, get goals() { return goals; },
  debug: { boot, finish, markers, showPop, hidePop },
};
