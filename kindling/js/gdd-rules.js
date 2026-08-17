// Betterment v6 — GDD rules layered over the stable v5 care loop.
//
// This module deliberately keeps the proven core state machine intact while the
// newer game systems settle. Its extra state lives inside `kindlingState` under
// `betterment`, so it is still local-only and survives reloads with the rest of
// the app.

const wait = ms => new Promise(r => setTimeout(r, ms));
while (!window.__kd || !window.__bettermentUx) await wait(10);

const kd = window.__kd;
const { addTask } = await import('./state.js?v=5');
const FULL_DAY = 5;
const DAY_MS = 86400000;

const make = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const roman = n => {
  const values = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let out = '';
  for (const [v, s] of values) while (n >= v) { out += s; n -= v; }
  return out || 'I';
};

function dayKey(d = new Date()) {
  const t = new Date(d.getTime() - 4 * 3600 * 1000);
  const p = n => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

function dayNumber(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function dayDistance(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round(dayNumber(b) - dayNumber(a)));
}

function generationName(n) {
  return n <= 1 ? 'Ember' : `Ember ${roman(n)}`;
}

function ensureMeta() {
  const today = dayKey();
  let changed = false;
  if (!kd.state.betterment || typeof kd.state.betterment !== 'object') {
    // Feature activation starts a fresh grace window. Old inactivity must never
    // retroactively Kindle a creature the first time this version is opened.
    kd.state.betterment = {
      v: 1,
      lastCareDay: today,
      companion: {
        id: `ember-${Date.now().toString(36)}`,
        name: 'Ember',
        generation: 1,
        bornDay: today,
        startKept: kd.state.kept || 0,
        alive: true,
      },
      lineage: [],
      kindling: { event: null },
      bonus: { date: today, done: [] },
    };
    changed = true;
  }

  const m = kd.state.betterment;
  if (!Array.isArray(m.lineage)) { m.lineage = []; changed = true; }
  if (!m.kindling || typeof m.kindling !== 'object') { m.kindling = { event: null }; changed = true; }
  if (!m.bonus || typeof m.bonus !== 'object') { m.bonus = { date: today, done: [] }; changed = true; }
  if (!Array.isArray(m.bonus.done)) { m.bonus.done = []; changed = true; }
  if (m.bonus.date !== today) { m.bonus = { date: today, done: [] }; changed = true; }

  if (!m.companion) {
    const generation = m.lineage.length + 1;
    m.companion = {
      id: `ember-${Date.now().toString(36)}`,
      name: generationName(generation),
      generation,
      bornDay: today,
      startKept: kd.state.kept || 0,
      alive: true,
    };
    changed = true;
  }

  if (!m.lastCareDay) { m.lastCareDay = today; changed = true; }
  if (changed) persist();
  return m;
}

function persist() {
  // The core debug seam saves the authoritative kindlingState without paying
  // anything. Using it keeps this layer from inventing a second persistence key.
  kd.debug.give(0);
}

const meta = ensureMeta();

function observeCare() {
  const today = dayKey();
  const lastKept = kd.state.lastKept;
  if (lastKept === today && meta.lastCareDay !== today) {
    meta.lastCareDay = today;
    persist();
  }
}

function completedMissedDays() {
  // `lastCareDay` itself was cared for (or is the feature-activation grace day).
  // Only complete care-days strictly between that day and today count as missed.
  return Math.max(0, dayDistance(meta.lastCareDay, dayKey()) - 1);
}

function archiveCurrentCompanion() {
  if (!meta.companion?.alive) return null;
  const today = dayKey();
  const bondUnits = Math.max(0, (kd.state.kept || 0) - (meta.companion.startKept || 0));
  const ancestor = {
    ...meta.companion,
    alive: false,
    kindledDay: today,
    stage: kd.debug.stage(),
    bondUnits,
  };
  meta.lineage.push(ancestor);
  meta.companion.alive = false;
  meta.kindling.event = {
    pending: true,
    day: today,
    name: ancestor.name,
    generation: ancestor.generation,
    stage: ancestor.stage,
    bondUnits,
  };
  persist();
  return ancestor;
}

function evaluateKindling() {
  observeCare();
  if (meta.kindling.event?.pending || !meta.companion?.alive) return;
  if (completedMissedDays() >= 2) archiveCurrentCompanion();
}

function wakeNewCompanion() {
  const generation = meta.lineage.length + 1;
  const today = dayKey();
  meta.companion = {
    id: `ember-${Date.now().toString(36)}`,
    name: generationName(generation),
    generation,
    bornDay: today,
    startKept: kd.state.kept || 0,
    alive: true,
  };
  meta.lastCareDay = today; // a new creature always starts with a grace day
  if (meta.kindling.event) meta.kindling.event.pending = false;
  persist();
  kd.debug.say(`${meta.companion.name} wakes beside the coals.`);
  return meta.companion;
}

// Progressive goals are finite. Base completion is handled by the existing task
// system; these are optional Tier II / III rewards and never add Care Points.
const PROGRESSIVE = new Map([
  ['do 10 push-ups', [
    { label: 'Reach 20 push-ups total', flames: 20, bond: 40 },
    { label: 'Reach 30 push-ups total', flames: 20, bond: 40 },
  ]],
  ['read for 10 min', [
    { label: 'Reach 20 minutes total', flames: 20, bond: 40 },
    { label: 'Reach 30 minutes total', flames: 20, bond: 40 },
  ]],
  ['take a short walk', [
    { label: 'Keep walking to 20 minutes total', flames: 20, bond: 40 },
    { label: 'Keep walking to 30 minutes total', flames: 20, bond: 40 },
  ]],
]);

const normalized = text => String(text || '').trim().toLowerCase();
const bonusKey = (task, index) => `${task.id}:${index}`;

function nextTier(task) {
  if (!kd.state.sheet.done.includes(task.id)) return null;
  const tiers = PROGRESSIVE.get(normalized(task.text));
  if (!tiers) return null;
  for (let i = 0; i < tiers.length; i++) {
    if (!meta.bonus.done.includes(bonusKey(task, i))) return { ...tiers[i], index: i };
  }
  return null;
}

function completeTier(task, tier) {
  const current = nextTier(task);
  if (!current || current.index !== tier.index) return false;
  const key = bonusKey(task, tier.index);
  if (meta.bonus.done.includes(key)) return false;
  meta.bonus.done.push(key);

  // One kindling unit is presented as 20 Flames in the v4 HUD. Bond is currently
  // represented by the existing 20-XP lifetime units, so +40 Bond = +2 units.
  kd.state.fuel += tier.flames / 20;
  kd.state.kept += tier.bond / 20;
  persist();
  kd.debug.say(`${tier.label}. Bonus kept: +${tier.flames} Flames · +${tier.bond} Bond XP.`);
  return true;
}

function fixedFireCard() {
  const care = Math.min(FULL_DAY, kd.debug.cared());
  const card = make('section', 'bm-gdd-fire');
  card.dataset.gddFire = '1';

  const top = make('div', 'bm-gdd-fire-top');
  const copy = make('div');
  copy.appendChild(make('span', 'bm-eyebrow', care >= FULL_DAY ? 'FIRE TENDED' : "TODAY'S FIRE"));
  const count = make('strong', 'bm-gdd-fire-count', `${care} / ${FULL_DAY}`);
  top.append(copy, count);

  const track = make('div', 'bm-gdd-fire-track');
  for (let i = 0; i < FULL_DAY; i++) track.appendChild(make('span', `bm-gdd-fire-seg${i < care ? ' on' : ''}`));

  const foot = make('div', 'bm-gdd-fire-foot', care >= FULL_DAY
    ? 'Baseline complete. Extra goals still earn Flames + Bond.'
    : `${FULL_DAY - care} care point${FULL_DAY - care === 1 ? '' : 's'} to tend the fire.`);
  card.append(top, track, foot);
  return card;
}

function warningCard() {
  if (completedMissedDays() !== 1 || !meta.companion?.alive) return null;
  const card = make('section', 'bm-kindling-warning');
  card.append(
    make('span', 'bm-eyebrow', 'THE FIRE IS FADING'),
    make('strong', '', `${meta.companion.name} is staying close to the coals.`),
    make('p', '', 'Any care action today steadies the fire and resets the danger.'),
  );
  return card;
}

function bonusCards() {
  const wrap = make('div', 'bm-bonus-stack');
  let n = 0;
  for (const task of kd.state.tasks) {
    const tier = nextTier(task);
    if (!tier) continue;
    n++;
    const card = make('section', 'bm-bonus-card');
    const copy = make('div', 'bm-bonus-copy');
    copy.append(
      make('span', 'bm-eyebrow', 'GO FURTHER · OPTIONAL'),
      make('strong', '', tier.label),
      make('span', 'bm-bonus-reward', `+${tier.flames} Flames · +${tier.bond} Bond XP`),
    );
    const done = make('button', 'bm-bonus-action', 'Complete');
    done.type = 'button';
    done.addEventListener('click', () => {
      if (completeTier(task, tier)) setTimeout(sync, 0);
    });
    card.append(copy, done);
    wrap.appendChild(card);
  }
  return n ? wrap : null;
}

function injectPushupGoal() {
  const manager = document.querySelector('.bm-page');
  if (!manager || !/choose what matters today/i.test(manager.querySelector('h2')?.textContent || '')) return;
  if (manager.querySelector('[data-gdd-pushups]')) return;

  const body = [...manager.querySelectorAll('.bm-goal-section')].find(s => s.querySelector('h3')?.textContent === 'Body');
  const choices = body?.querySelector('.bm-goal-choices');
  if (!choices) return;

  const exists = kd.state.tasks.some(t => normalized(t.text) === 'do 10 push-ups');
  const card = make('article', `bm-goal-choice${exists ? ' added' : ''}`);
  card.dataset.gddPushups = '1';
  const icon = make('span', 'bm-task-icon bm-tone-green', '10×');
  icon.setAttribute('aria-hidden', 'true');
  const copy = make('span', 'bm-goal-choice-copy');
  copy.append(make('strong', '', 'Do 10 push-ups'), make('span', 'bm-category', 'Body · progressive'));
  const button = make('button', 'bm-small-action', exists ? 'Added' : 'Add');
  button.type = 'button';
  button.disabled = exists || kd.state.tasks.length >= 14;
  button.addEventListener('click', () => {
    if (!addTask('Do 10 push-ups')) return;
    kd.debug.say('Do 10 push-ups added. A bonus tier can appear after you complete it.');
    window.__bettermentUx.navigate('today');
  });
  card.append(icon, copy, button);
  choices.prepend(card);
}

function kindlingPanel() {
  const event = meta.kindling.event;
  if (!event?.pending) return null;
  const wrap = make('div', 'bm-page bm-kindling-page');
  wrap.append(
    make('span', 'bm-eyebrow', 'KINDLED'),
    make('h2', '', 'The fire was not tended.'),
    make('p', 'bm-kindling-name', `${event.name} became Kindling.`),
  );

  const memory = make('section', 'bm-card bm-kindling-memory');
  memory.append(
    make('span', 'bm-kindled-mark', '▲'),
    make('strong', '', `${event.name} · Generation ${event.generation}`),
    make('p', 'bm-page-copy', `Reached ${event.stage}. Its name and history remain in the lineage.`),
  );
  wrap.appendChild(memory);

  const next = make('button', 'btn bm-wake-ember', 'Wake a new ember');
  next.type = 'button';
  next.addEventListener('click', () => {
    wakeNewCompanion();
    document.body.classList.remove('bm-kindling-event');
    window.__bettermentUx.navigate('today');
    setTimeout(sync, 0);
  });
  wrap.appendChild(next);
  return wrap;
}

function sceneOverlay() {
  const screen = document.querySelector('.screen-wrap');
  if (!screen) return;
  const event = meta.kindling.event?.pending;
  let overlay = screen.querySelector('.bm-kindling-scene');
  if (!event) {
    overlay?.remove();
    document.body.classList.remove('bm-kindling-event');
    return;
  }
  document.body.classList.add('bm-kindling-event');
  if (overlay) return;
  overlay = make('div', 'bm-kindling-scene');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.append(make('div', 'bm-kindled-ember', '▲'), make('div', 'bm-kindled-ash', '· · ·'));
  screen.appendChild(overlay);
}

function enhanceCompanionPage() {
  const page = document.querySelector('.bm-page');
  if (!page || window.__bettermentUxPage === 'kindling') return;
  const heading = page.querySelector('h2');
  if (!heading) return;
  const navActive = document.querySelector('[data-bm-page="companion"].active');
  if (!navActive) return;
  if (page.querySelector('[data-gdd-lineage]')) return;

  const section = make('section', 'bm-card bm-lineage-summary');
  section.dataset.gddLineage = '1';
  section.appendChild(make('span', 'bm-eyebrow', 'LINEAGE'));
  section.appendChild(make('strong', '', `${meta.companion?.name || 'Ember'} · Generation ${meta.companion?.generation || 1}`));
  if (!meta.lineage.length) {
    section.appendChild(make('p', 'bm-page-copy', 'No ancestors yet.'));
  } else {
    for (const ancestor of meta.lineage.slice(-4).reverse()) {
      const row = make('div', 'bm-lineage-row');
      row.append(make('span', 'bm-kindled-mini', '▲'), make('span', '', `${ancestor.name} · Kindled · ${ancestor.stage}`));
      section.appendChild(row);
    }
  }
  page.appendChild(section);
}

function enforceFireUI() {
  const today = document.querySelector('.today');
  if (!today) return;
  today.querySelector('.bm-progress')?.classList.add('bm-progress-superseded');
  let fire = today.querySelector('[data-gdd-fire]');
  if (!fire) {
    fire = fixedFireCard();
    today.prepend(fire);
  } else {
    fire.replaceWith(fixedFireCard());
  }

  today.querySelector('.bm-kindling-warning')?.remove();
  const warning = warningCard();
  if (warning) today.querySelector('[data-gdd-fire]')?.after(warning);

  today.querySelector('.bm-bonus-stack')?.remove();
  const bonuses = bonusCards();
  if (bonuses) today.querySelector('.sheet')?.after(bonuses);
}

function forceKindlingEvent() {
  const event = meta.kindling.event?.pending;
  if (!event) {
    if (window.__bettermentUxPage === 'kindling') window.__bettermentUxPage = null;
    return false;
  }
  const panel = document.getElementById('panel');
  if (!panel.querySelector('.bm-kindling-page')) panel.replaceChildren(kindlingPanel());
  window.__bettermentUxPage = 'kindling';
  kd.debug.say(`${event.name} became Kindling.`);
  return true;
}

function sync() {
  ensureMeta();
  evaluateKindling();
  sceneOverlay();

  if (forceKindlingEvent()) return;

  enforceFireUI();
  injectPushupGoal();
  enhanceCompanionPage();

  // Expose the GDD definition, not the older task-count denominator.
  window.__bettermentUx.goalProgress = () => ({
    done: Math.min(FULL_DAY, kd.debug.cared()),
    target: FULL_DAY,
  });
}

// Stop journey/hello controls from acting on an absent companion if a Kindling
// event is onscreen. The event owns the interaction until a new ember is woken.
document.addEventListener('click', e => {
  if (!meta.kindling.event?.pending) return;
  if (e.target.closest('.bm-wake-ember')) return;
  if (e.target.closest('.btn.send, .task, .mood, .acts .btn, .bm-nav button')) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}, true);

new MutationObserver(() => setTimeout(sync, 0)).observe(document.getElementById('panel'), { childList: true, subtree: false });
setInterval(sync, 350);
sync();

window.__bettermentGdd = {
  sync,
  meta,
  missedDays: completedMissedDays,
  progressive: PROGRESSIVE,
  wakeNewCompanion,
  completeTier(taskId) {
    const task = kd.state.tasks.find(t => t.id === taskId);
    const tier = task && nextTier(task);
    return task && tier ? completeTier(task, tier) : false;
  },
  debugKindle() {
    meta.lastCareDay = (() => {
      const t = new Date();
      t.setDate(t.getDate() - 3);
      return dayKey(t);
    })();
    evaluateKindling();
    sync();
  },
};
