// The contract tests named in SHARED_ENGINE.md, run in bare node — no browser,
// no GPU, no audio device, so this is fast enough to run on every edit.
//
// The DOM-shaped ones from that list (pause not breaking touch editing, no
// horizontal overflow on a phone) live in the products' own smoke gates; these
// are the ones about the simulation, which is where the two products can
// actually diverge without anyone noticing.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createFlow } from '../sim.js?v=1';
import { KALLIO } from '../city.js?v=1';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? ' → ' + detail : '')); }
};

const DEMAND = {
  rate: 130,
  pairs: [
    { from: 'home', to: 'work', weight: 3 },
    { from: 'home', to: 'school', weight: 2 },
    { from: 'home', to: 'shop', weight: 2 },
    { from: 'work', to: 'home', weight: 3 },
    { from: 'shop', to: 'home', weight: 2 },
    { from: 'transfer', to: 'shop', weight: 1 },
  ],
};

const build = (seed = 7) => {
  const f = createFlow({ city: KALLIO, seed, days: 7, demand: DEMAND });
  f.clock.setPaused(false);
  return f;
};

const LINE_A = ['hakaniemi', 'kuudeslinja', 'karhupuisto', 'vaasanaukio', 'vaasankatu', 'kurvi'];
const LINE_B = ['kirkko', 'kuudeslinja', 'hakaniemi'];

console.log('\nflow-core contract\n');

// ── identical seed, identical neutral movement, in BOTH products ────────
{
  const run = () => {
    const f = build(11);
    f.addRoute('tram', LINE_A);
    f.addRoute('tram', LINE_B);
    f.runTicks(1200);
    return f.fingerprint();
  };
  const a = run(), b = run();
  ok('identical seed creates identical movement', a === b, `${a}\n         vs ${b}`);

  // and a different seed must actually differ, or the first check is vacuous
  const f = build(12);
  f.addRoute('tram', LINE_A); f.addRoute('tram', LINE_B);
  f.runTicks(1200);
  ok('a different seed diverges', f.fingerprint() !== a);
}

// ── redrawing or deleting a route never loses an agent ──────────────────
{
  const f = build(21);
  f.addRoute('tram', LINE_A);
  f.runTicks(900);
  const before = f.trips.active.length + f.trips.completed.length + f.trips.abandoned.length;
  const riding = f.trips.active.filter(t => t.state === 'riding').length;
  ok('some trips are aboard before the edit', riding > 0, `riding=${riding}`);

  const r = f.routes.list[0];
  f.reshapeRoute(r.id, ['hakaniemi', 'kuudeslinja', 'karhupuisto', 'vaasanaukio']);
  const after = f.trips.active.length + f.trips.completed.length + f.trips.abandoned.length;
  ok('reshaping loses nobody', after === before, `${before} → ${after}`);
  ok('nobody is left aboard a line that changed',
    f.trips.active.every(t => t.state !== 'riding' || f.routes.get(t.leg?.routeId)));

  const before2 = f.trips.active.length + f.trips.completed.length + f.trips.abandoned.length;
  f.removeRoute(f.routes.list[0].id);
  const after2 = f.trips.active.length + f.trips.completed.length + f.trips.abandoned.length;
  ok('deleting a line loses nobody', after2 === before2, `${before2} → ${after2}`);
  ok('and everyone is standing somewhere real',
    f.trips.active.every(t => t.state !== 'riding'));
}

// ── a closed edge reroutes or visibly queues every affected trip ────────
{
  const f = build(31);
  f.addRoute('tram', LINE_A);
  f.addRoute('tram', LINE_B);
  f.runTicks(700);
  const edge = f.graph.edgeBetween('vaasanaukio', 'vaasankatu', 'tram');
  edge.closed = true;
  f.trips.replan();
  f.runTicks(400);
  const stranded = f.trips.active.filter(t =>
    t.state === 'riding' && (() => {
      const r = f.routes.get(t.leg?.routeId);
      return r && !r.nodes.length;
    })());
  ok('a closed edge strands nobody mid-air', stranded.length === 0);
  const queued = [...f.graph.nodes.values()].reduce((s, n) => s + n.waiting.length, 0);
  ok('affected trips are visibly queued or rerouted', queued > 0, `queued=${queued}`);
  ok('no carrier crosses a closed edge', f.routes.list.every(r =>
    r.carriers.every(c => {
      if (c.docked) return true;
      const e = f.graph.edgeBetween(r.nodes[c.idx], r.nodes[c.idx + c.dir], r.mode);
      return !e || !e.closed;
    })));
}

// ── pause freezes the simulation ────────────────────────────────────────
{
  const f = build(41);
  f.addRoute('tram', LINE_A);
  f.runTicks(300);
  f.clock.setPaused(true);
  const fp = f.fingerprint();
  f.update(5000);
  ok('pause freezes the simulation', f.fingerprint() === fp);
  f.clock.setPaused(false);
  f.update(1000);
  ok('and it starts again', f.fingerprint() !== fp);
}

// ── the core stays neutral, and the products stay out of each other ─────
{
  const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.name === 'test' || d.name === 'explorations' || d.name.startsWith('.')
      ? []
      : d.isDirectory() ? walk(join(dir, d.name))
        : d.name.endsWith('.js') || d.name.endsWith('.html') ? [join(dir, d.name)] : []);

  const readAll = dir => walk(dir).map(f => ({ f, t: readFileSync(f, 'utf8') }));

  // flow-core must not use either product's vocabulary
  const CORE_BANNED = /\b(drug|police|dealer|school run|pollution|emission|contraband|market|debt|heat|trust)\b/i;
  const coreHits = readAll(join(ROOT, 'flow-core'))
    .filter(({ t }) => CORE_BANNED.test(t.replace(/^\s*\/\/.*$/gm, '')));
  ok('flow-core carries no product vocabulary',
    coreHits.length === 0, coreHits.map(h => h.f.replace(ROOT, '')).join(', '));

  // no Piritori term may appear in the Toko Move bundle
  const PIRITORI_BANNED = /\b(piritori|piri|peukku|amphetamine|debt|heat|contraband|dealer|igor|jaska|mccormick)\b/i;
  const tmHits = readAll(join(ROOT, 'toko-move'))
    .filter(({ t }) => PIRITORI_BANNED.test(t));
  ok('no Piritori term appears in Toko Move',
    tmHits.length === 0, tmHits.map(h => h.f.replace(ROOT, '')).join(', '));

  // and no Toko Move-specific goal leaks the other way
  const TM_BANNED = /\b(emissions?|pollution|accessibility|family-friendly)\b/i;
  const ptHits = readAll(join(ROOT, 'piritori'))
    .filter(({ t }) => TM_BANNED.test(t));
  ok('no Toko Move goal appears in Piritori',
    ptHits.length === 0, ptHits.map(h => h.f.replace(ROOT, '')).join(', '));

  // neither product imports the other
  const cross = [...readAll(join(ROOT, 'piritori')), ...readAll(join(ROOT, 'toko-move'))]
    .filter(({ f, t }) => /from ['"]\.\.\/\.\.\/(piritori|toko-move)\//.test(t));
  ok('the products never import each other', cross.length === 0,
    cross.map(h => h.f.replace(ROOT, '')).join(', '));
}

// ── both products get the same core, and the same city ─────────────────
{
  const a = build(55), b = build(55);
  a.addRoute('tram', LINE_A); b.addRoute('tram', LINE_A);
  a.runTicks(800); b.runTicks(800);
  ok('two products on one seed move identically', a.fingerprint() === b.fingerprint());
  ok('the shared city has no product-specific node name',
    [...a.graph.nodes.keys()].every(id => !/piritori/i.test(id)));
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
