// Kindling v8 — companion roster + first lineage/breeding prototype.
// Two living mature companions can create one egg. Future real care hatches it.
// Parents remain permanently available; no creature is consumed by breeding.

const wait = ms => new Promise(r => setTimeout(r, ms));
while (!window.__kd || !window.__bettermentUx || !window.__bettermentGdd || !window.__bettermentCombat) await wait(10);

const kd = window.__kd;
const gdd = window.__bettermentGdd;
const combat = window.__bettermentCombat.state;
const { save } = await import('./state.js?v=5');
const meta = gdd.meta;

const HATCH_CARE = 5;
const MATURE_CARE = 18;

const TRAIT_POOLS = {
  horns: ['stub', 'branch', 'curl', 'none'],
  ears: ['round', 'leaf', 'point', 'droop'],
  ember: ['orange', 'green', 'blue', 'white'],
  marking: ['ash', 'moss', 'stripe', 'speckle'],
};
const TEMPERAMENTS = ['curious', 'cautious', 'bold', 'sleepy', 'stubborn', 'bright'];
const COMBAT_STYLES = ['quick striker', 'guard-heavy', 'skill-focused', 'counterattacker'];

const make = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function defaultTraits(kind = 'ember') {
  if (kind === 'moss') return { horns: 'branch', ears: 'leaf', ember: 'green', marking: 'moss' };
  return { horns: 'stub', ears: 'round', ember: 'orange', marking: 'ash' };
}

function ensureLineageGame() {
  if (!meta.lineageGame || typeof meta.lineageGame !== 'object') meta.lineageGame = {};
  const lg = meta.lineageGame;
  if (!Array.isArray(lg.roster)) lg.roster = [];
  if (!('egg' in lg)) lg.egg = null;
  if (!Number.isFinite(lg.hatched)) lg.hatched = 0;
  syncRoster();
  save();
  return lg;
}

function currentRecord(companion) {
  return {
    id: companion.id,
    name: companion.name,
    generation: companion.generation || 1,
    parents: companion.parents || [],
    traits: companion.traits || defaultTraits(),
    temperament: companion.temperament || 'curious',
    combatStyle: companion.combatStyle || 'quick striker',
    bornAtKept: companion.startKept ?? kd.state.kept ?? 0,
    mature: companion.generation === 1,
    alive: companion.alive !== false,
    source: companion.source || 'bonfire',
  };
}

function syncRoster() {
  if (!meta.lineageGame) return;
  const roster = meta.lineageGame.roster;
  const active = meta.companion;
  if (active?.id && !roster.some(r => r.id === active.id)) roster.push(currentRecord(active));

  for (const ancestor of meta.lineage || []) {
    const row = roster.find(r => r.id === ancestor.id);
    if (row) {
      row.alive = false;
      row.kindledDay = ancestor.kindledDay;
    }
  }

  for (const r of roster) {
    if (!r.mature && (kd.state.kept || 0) - (r.bornAtKept || 0) >= MATURE_CARE) r.mature = true;
  }
}

const game = ensureLineageGame();

function liveMature() {
  syncRoster();
  return game.roster.filter(r => r.alive && r.mature);
}

function canAwakenMossling() {
  return (combat.mossFragments || 0) >= 1 && !game.roster.some(r => r.source === 'moss-fragment' && r.alive);
}

function awakenMossling() {
  if (!canAwakenMossling()) return false;
  combat.mossFragments -= 1;
  const id = `moss-${Date.now().toString(36)}`;
  game.roster.push({
    id,
    name: 'Mossling',
    generation: 1,
    parents: [],
    traits: defaultTraits('moss'),
    temperament: 'cautious',
    combatStyle: 'guard-heavy',
    bornAtKept: kd.state.kept || 0,
    mature: true,
    alive: true,
    source: 'moss-fragment',
  });
  save();
  kd.debug.say('The Moss Fragment opens. Something small and green looks back.');
  sync();
  return true;
}

function seedRng(seed) {
  let x = (seed >>> 0) || 0x9e3779b9;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function inheritedValue(a, b, pool, rng) {
  const inherited = rng() < .5 ? a : b;
  if (rng() >= .12) return inherited;
  const others = pool.filter(x => x !== inherited);
  return others[Math.floor(rng() * others.length)] || inherited;
}

function createChildPreview(a, b, seed) {
  const rng = seedRng(seed);
  const generation = Math.max(a.generation || 1, b.generation || 1) + 1;
  const traits = {};
  for (const [key, pool] of Object.entries(TRAIT_POOLS)) {
    traits[key] = inheritedValue(a.traits[key], b.traits[key], pool, rng);
  }
  const temperament = inheritedValue(a.temperament, b.temperament, TEMPERAMENTS, rng);
  const combatStyle = inheritedValue(a.combatStyle, b.combatStyle, COMBAT_STYLES, rng);
  return {
    id: `child-${seed.toString(36)}`,
    name: `Ashling ${generation}`,
    generation,
    parents: [a.id, b.id],
    parentNames: [a.name, b.name],
    traits,
    temperament,
    combatStyle,
  };
}

function beginNest(parentA, parentB) {
  if (game.egg) return false;
  const candidates = liveMature();
  const a = candidates.find(r => r.id === parentA) || candidates[0];
  const b = candidates.find(r => r.id === parentB) || candidates.find(r => r.id !== a?.id);
  if (!a || !b || a.id === b.id) return false;
  const seed = (Date.now() ^ ((kd.state.kept || 0) * 2654435761)) >>> 0;
  game.egg = {
    seed,
    parents: [a.id, b.id],
    parentNames: [a.name, b.name],
    createdAtKept: kd.state.kept || 0,
    child: createChildPreview(a, b, seed),
  };
  save();
  kd.debug.say(`${a.name} and ${b.name} settle beside a new ember-seed.`);
  sync();
  return true;
}

function eggProgress() {
  if (!game.egg) return { done: 0, target: HATCH_CARE, ready: false };
  const done = Math.max(0, Math.min(HATCH_CARE, (kd.state.kept || 0) - game.egg.createdAtKept));
  return { done, target: HATCH_CARE, ready: done >= HATCH_CARE };
}

function hatch() {
  if (!game.egg || !eggProgress().ready) return null;
  const child = {
    ...game.egg.child,
    bornAtKept: kd.state.kept || 0,
    mature: false,
    alive: true,
    source: 'lineage',
  };
  game.roster.push(child);
  game.egg = null;
  game.hatched += 1;
  save();
  kd.debug.say(`${child.name} hatches beside the fire.`);
  sync();
  return child;
}

function traitChip(text) { return make('span', 'bm-trait-chip', text); }

function creatureCard(r) {
  const card = make('article', `bm-roster-card${r.alive ? '' : ' kindled'}`);
  const head = make('div', 'bm-roster-head');
  const mark = make('span', 'bm-roster-mark', r.alive ? (r.source === 'moss-fragment' ? '♣' : '●') : '▲');
  const copy = make('span', 'bm-roster-name');
  copy.append(make('strong', '', r.name), make('span', '', `Generation ${r.generation} · ${r.alive ? (r.mature ? 'mature' : 'young') : 'Kindled'}`));
  head.append(mark, copy);
  const traits = make('div', 'bm-traits');
  traits.append(
    traitChip(`${r.traits.horns} horns`),
    traitChip(`${r.traits.ears} ears`),
    traitChip(`${r.traits.ember} ember`),
    traitChip(r.temperament),
    traitChip(r.combatStyle),
  );
  card.append(head, traits);
  if (r.parents?.length) {
    const names = r.parentNames?.join(' + ') || r.parents.join(' + ');
    card.appendChild(make('p', 'bm-parentage', `From ${names}`));
  }
  return card;
}

function eggCard() {
  const egg = game.egg;
  if (!egg) return null;
  const p = eggProgress();
  const card = make('section', 'bm-card bm-egg-card');
  card.append(make('span', 'bm-eyebrow', 'EMBER-SEED'), make('strong', '', `${egg.parentNames[0]} + ${egg.parentNames[1]}`));
  card.appendChild(make('p', 'bm-page-copy', 'Normal future care warms the egg. Closing the app or missing time never removes hatch progress.'));
  const track = make('div', 'bm-egg-track');
  const fill = make('div', 'bm-egg-fill');
  fill.style.width = `${(p.done / p.target) * 100}%`;
  track.appendChild(fill);
  card.append(track, make('div', 'bm-egg-count', `${p.done} / ${p.target} care to hatch`));

  const tendencies = make('div', 'bm-egg-tendencies');
  tendencies.append(
    traitChip(`${egg.parentNames[0]} / ${egg.parentNames[1]} lineage`),
    traitChip('visual traits inherited'),
    traitChip('temperament inherited'),
    traitChip('small mutation chance'),
  );
  card.appendChild(tendencies);

  if (p.ready) {
    const b = make('button', 'btn bm-hatch', 'Hatch ember-seed');
    b.type = 'button';
    b.addEventListener('click', hatch);
    card.appendChild(b);
  }
  return card;
}

function breedingPanel() {
  syncRoster();
  const section = make('section', 'bm-breeding');
  section.dataset.breeding = '1';
  section.append(make('span', 'bm-eyebrow', 'COMPANION LINEAGE'), make('h3', '', 'Roster & Nest'));

  const grid = make('div', 'bm-roster-grid');
  for (const r of game.roster) grid.appendChild(creatureCard(r));
  section.appendChild(grid);

  if (canAwakenMossling()) {
    const discovery = make('section', 'bm-card bm-moss-discovery');
    discovery.append(
      make('span', 'bm-eyebrow', 'COMBAT DISCOVERY'),
      make('strong', '', 'Something lives inside the Moss Fragment'),
      make('p', 'bm-page-copy', 'Use one fragment to awaken a second mature prototype companion for the lineage test.'),
    );
    const b = make('button', 'btn', 'Awaken Mossling · 1 fragment');
    b.type = 'button';
    b.addEventListener('click', awakenMossling);
    discovery.appendChild(b);
    section.appendChild(discovery);
  }

  const egg = eggCard();
  if (egg) {
    section.appendChild(egg);
  } else {
    const parents = liveMature();
    const nest = make('section', 'bm-card bm-nest-card');
    nest.append(make('span', 'bm-eyebrow', 'NEST'), make('strong', '', parents.length >= 2 ? 'Create an ember-seed' : 'Two mature companions needed'));
    nest.appendChild(make('p', 'bm-page-copy', parents.length >= 2
      ? `${parents[0].name} and ${parents[1].name} can create a descendant. Parents stay permanently available.`
      : 'Additional companions come from journeys, combat discoveries and later world events.'));
    const b = make('button', 'btn bm-breed', parents.length >= 2 ? `Breed ${parents[0].name} + ${parents[1].name}` : 'Need a second companion');
    b.type = 'button';
    b.disabled = parents.length < 2;
    if (parents.length >= 2) b.addEventListener('click', () => beginNest(parents[0].id, parents[1].id));
    nest.appendChild(b);
    section.appendChild(nest);
  }

  return section;
}

function uiSignature() {
  const progress = eggProgress();
  return JSON.stringify({
    kept: kd.state.kept || 0,
    fragments: combat.mossFragments || 0,
    roster: game.roster.map(r => [r.id, r.alive, r.mature, r.generation]),
    egg: game.egg ? [game.egg.seed, progress.done, progress.ready] : null,
  });
}

function onCompanionPage() {
  const page = document.querySelector('#panel > .bm-page');
  if (!page || page.classList.contains('bm-combat-page')) return false;
  const eyebrow = page.querySelector('.bm-eyebrow');
  if (!eyebrow || eyebrow.textContent.trim().toUpperCase() !== 'COMPANION') return false;
  const signature = uiSignature();
  const old = page.querySelector('[data-breeding]');
  if (old?.dataset.signature === signature) return true;
  const next = breedingPanel();
  next.dataset.signature = signature;
  if (old) old.replaceWith(next); else page.appendChild(next);
  return true;
}

function sync() {
  syncRoster();
  onCompanionPage();
}

setInterval(sync, 500);
sync();

window.__bettermentBreeding = {
  game,
  sync,
  awakenMossling,
  beginNest,
  eggProgress,
  hatch,
  liveMature,
  constants: { HATCH_CARE, MATURE_CARE },
};
