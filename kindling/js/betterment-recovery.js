// Betterment recovery layer.
//
// This is intentionally small and additive: current main already has a stable
// care core, renderer, live art seam and mobile navigation. This module makes the
// current product obey the authoritative Betterment rules without replacing
// those working pieces. As each deeper system becomes first-class, it can import
// betterment-rules.js directly and this DOM bridge can shrink.

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
while (!window.__kd || !window.__bettermentUx) await wait(10);

const kd = window.__kd;
const ux = window.__bettermentUx;
const rules = await import('./betterment-rules.js?v=11');
const { addTask } = await import('./state.js?v=10');

const panel = document.getElementById('panel');
const screen = document.getElementById('screen');
const FULL_DAY = 5;
let syncing = false;
let scheduled = false;

const make = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

const setText = (node, value) => {
  if (node && node.textContent !== value) node.textContent = value;
};

function bondLevel() {
  const bond = rules.totalBondXp();
  return { bond, level: Math.floor(bond / 100) + 1, xp: bond % 100 };
}

function enforceFivePointFire() {
  const { done, target } = rules.fireProgress();
  const card = panel.querySelector('[data-bm-progress]');
  if (!card) return;

  const track = card.querySelector('.bm-progress-track');
  if (track) {
    track.style.gridTemplateColumns = `repeat(${target}, 1fr)`;
    let segs = [...track.querySelectorAll('.bm-progress-seg')];
    if (segs.length !== target) {
      track.replaceChildren();
      for (let i = 0; i < target; i++) track.appendChild(make('span', `bm-progress-seg${i < done ? ' on' : ''}`));
      segs = [...track.querySelectorAll('.bm-progress-seg')];
    }
    segs.forEach((seg, i) => seg.classList.toggle('on', i < done));
  }

  setText(card.querySelector('.bm-progress-count'), `${done} / ${target}`);
  const label = card.querySelector('.bm-progress-score span');
  setText(label, done >= FULL_DAY ? 'FIRE TENDED' : 'care points');
  const eyebrow = card.querySelector('.bm-eyebrow');
  if (eyebrow) setText(eyebrow, done >= FULL_DAY ? 'FIRE TENDED' : "TODAY'S FIRE");
}

function enforceBondHud() {
  const info = bondLevel();
  setText(document.getElementById('bm-level'), String(info.level));
  setText(document.getElementById('bm-xp-text'), `${info.xp} / 100`);
  const fill = document.getElementById('bm-xp-fill');
  if (fill) fill.style.width = `${info.xp}%`;
}

function injectProgressivePreset() {
  const page = panel.querySelector('.bm-page');
  if (!page || page.querySelector('[data-bm-pushups]')) return;
  if (!/choose what matters today/i.test(page.querySelector('h2')?.textContent || '')) return;

  const body = [...page.querySelectorAll('.bm-goal-section')]
    .find(section => section.querySelector('h3')?.textContent === 'Body');
  const choices = body?.querySelector('.bm-goal-choices');
  if (!choices) return;

  const exists = kd.state.tasks.some(task => rules.progressiveTemplate(task)?.id === 'pushups-10');
  const choice = make('article', `bm-goal-choice${exists ? ' added' : ''}`);
  choice.dataset.bmPushups = '1';

  const icon = make('span', 'bm-task-icon bm-tone-green', '10×');
  icon.setAttribute('aria-hidden', 'true');
  const copy = make('span', 'bm-goal-choice-copy');
  copy.append(make('strong', '', 'Do 10 push-ups'), make('span', 'bm-category', 'Body · progressive'));
  const button = make('button', 'bm-small-action', exists ? 'Added' : 'Add');
  button.type = 'button';
  button.disabled = exists || kd.state.tasks.length >= 14;
  button.addEventListener('click', () => {
    if (!addTask('Do 10 push-ups')) {
      kd.debug.say('Your goal list is full at fourteen.');
      return;
    }
    kd.debug.say('Do 10 push-ups added. A larger optional tier appears only after the first win.');
    ux.navigate('today');
    syncSoon();
  });

  choice.append(icon, copy, button);
  choices.prepend(choice);
}

function progressiveSignature(items) {
  return items.map(({ task, tier }) => `${task.id}:${tier.templateId}:${tier.id}`).join('|');
}

function renderProgressiveCards() {
  const today = panel.querySelector('.today');
  if (!today) return;
  const opportunities = rules.progressiveOpportunities();
  const signature = progressiveSignature(opportunities);
  let stack = today.querySelector('[data-bm-progressive-stack]');

  if (!opportunities.length) {
    stack?.remove();
    return;
  }
  if (stack?.dataset.signature === signature) return;

  stack?.remove();
  stack = make('section', 'bm-progressive-stack');
  stack.dataset.bmProgressiveStack = '1';
  stack.dataset.signature = signature;

  for (const { task, tier } of opportunities) {
    const card = make('article', 'bm-progressive-card');
    const copy = make('div', 'bm-progressive-copy');
    copy.append(
      make('span', 'bm-eyebrow', 'OPTIONAL · GO FURTHER'),
      make('strong', '', tier.label),
      make('span', 'bm-progressive-reward', `+${tier.flames} Flames · +${tier.bondXp} Bond XP`),
    );
    const button = make('button', 'bm-progressive-action', 'Complete');
    button.type = 'button';
    button.addEventListener('click', () => {
      const result = rules.completeProgressiveTier(task.id);
      if (!result) return;
      kd.debug.say(`${result.tier.label}. Bonus: +${result.flames} Flames · +${result.bondXp} Bond XP.`);
      syncSoon();
    });
    card.append(copy, button);
    stack.appendChild(card);
  }

  const sheet = today.querySelector('.sheet');
  const anchor = sheet?.nextElementSibling || today.querySelector('.add');
  if (anchor) anchor.before(stack); else today.appendChild(stack);
}

function renderWarning(status) {
  const today = panel.querySelector('.today');
  if (!today) return;
  let card = today.querySelector('[data-bm-kindling-warning]');
  if (!status.warning) {
    card?.remove();
    return;
  }
  if (card) return;

  card = make('section', 'bm-kindling-warning');
  card.dataset.bmKindlingWarning = '1';
  card.append(
    make('span', 'bm-eyebrow', 'THE FIRE IS FADING'),
    make('strong', '', `${status.companion?.name || 'Your companion'} stays close to the coals.`),
    make('p', '', 'One real care action today steadies the fire and resets the danger.'),
  );
  const progress = today.querySelector('[data-bm-progress]');
  if (progress) progress.before(card); else today.prepend(card);
}

function removeKindlingScene() {
  screen?.querySelector('[data-bm-kindling-scene]')?.remove();
  screen?.classList.remove('bm-first-miss');
  document.body.classList.remove('bm-kindling-event');
}

function renderKindlingScene(event) {
  if (!screen) return;
  document.body.classList.add('bm-kindling-event');
  screen.classList.remove('bm-first-miss');
  if (screen.querySelector('[data-bm-kindling-scene]')) return;

  const scene = make('div', 'bm-kindling-scene');
  scene.dataset.bmKindlingScene = '1';
  scene.setAttribute('aria-hidden', 'true');
  const ring = make('div', 'bm-kindling-ring');
  ring.append(make('span', 'bm-kindling-coal', '▲'), make('span', 'bm-kindling-ash', '· · ·'));
  scene.appendChild(ring);
  screen.appendChild(scene);
}

function renderKindlingPage(event) {
  if (panel.querySelector('[data-bm-kindling-page]')) return;
  const wrap = make('div', 'bm-page bm-kindling-page');
  wrap.dataset.bmKindlingPage = '1';
  wrap.append(
    make('span', 'bm-eyebrow', 'KINDLED'),
    make('h2', '', 'The fire was not tended.'),
    make('p', 'bm-kindling-name', `${event.name} became Kindling.`),
  );

  const memory = make('section', 'bm-card bm-kindling-memory');
  memory.append(
    make('span', 'bm-kindled-mark', '▲'),
    make('strong', '', `${event.name} · Generation ${event.generation}`),
    make('p', 'bm-page-copy', `Reached ${event.stage}. ${event.bondXp} Bond XP remains in the lineage record.`),
  );
  wrap.appendChild(memory);

  const next = make('button', 'btn bm-wake-ember', 'Wake the next Ember');
  next.type = 'button';
  next.addEventListener('click', () => {
    const companion = rules.wakeNextCompanion();
    kd.idle?.interrupt('sit');
    removeKindlingScene();
    kd.debug.say(`${companion.name} wakes beside the coals.`);
    ux.navigate('today');
    syncSoon();
  });
  wrap.appendChild(next);
  panel.replaceChildren(wrap);
}

function enhanceCompanion() {
  const activeNav = document.querySelector('[data-bm-page="companion"].active');
  const page = panel.querySelector('.bm-page');
  if (!activeNav || !page || page.querySelector('[data-bm-kindling-page]')) return;

  const info = bondLevel();
  const copy = page.querySelector('.bm-page-copy');
  setText(copy, 'Your companion grows from real care. Two consecutive completely missed care-days turn the active companion into Kindling.');
  setText(page.querySelector('.bm-big'), `Lv. ${info.level}`);
  const bondLine = page.querySelector('.bm-companion-card .bm-hud-label');
  setText(bondLine, `${info.xp} / 100 bond to next level`);

  if (page.querySelector('[data-bm-lineage]')) return;
  const active = rules.activeCompanion();
  const lineage = rules.lineage();
  const card = make('section', 'bm-card bm-lineage-card');
  card.dataset.bmLineage = '1';
  card.append(
    make('span', 'bm-eyebrow', 'LINEAGE'),
    make('strong', '', `${active?.name || 'Ember'} · Generation ${active?.generation || 1}`),
  );
  if (!lineage.length) {
    card.appendChild(make('p', 'bm-page-copy', 'No ancestors yet.'));
  } else {
    for (const ancestor of lineage.slice(-4).reverse()) {
      card.appendChild(make('p', 'bm-lineage-entry', `${ancestor.name} · ${ancestor.stage} · Kindled`));
    }
  }
  page.appendChild(card);
}

function syncSceneWarning(status) {
  if (!screen || status.event) return;
  screen.classList.toggle('bm-first-miss', status.warning);
}

function sync() {
  if (syncing) return;
  syncing = true;
  try {
    const status = rules.evaluateKindling();

    // Public smoke/debug seam. The domain functions themselves stay in their
    // module; this object simply makes the current running rules inspectable.
    window.__bettermentRules = rules;
    ux.goalProgress = () => rules.fireProgress();

    enforceBondHud();

    if (status.event) {
      renderKindlingScene(status.event);
      renderKindlingPage(status.event);
      return;
    }

    removeKindlingScene();
    syncSceneWarning(status);
    enforceFivePointFire();
    renderWarning(status);
    renderProgressiveCards();
    injectProgressivePreset();
    enhanceCompanion();
  } finally {
    syncing = false;
  }
}

function syncSoon() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    sync();
  });
}

new MutationObserver(syncSoon).observe(panel, { childList: true, subtree: false });
panel.addEventListener('click', event => {
  if (event.target.closest('.task, .mood, .bm-progressive-action, .bm-small-action, .btn')) {
    setTimeout(syncSoon, 0);
  }
});

setInterval(sync, 300);
sync();

window.__bettermentRecovery = { sync, rules };
