// Betterment v3 — mobile-first UX shell layered over the proven Kindling logic.
// The existing state machine remains authoritative; this module changes how that
// state is presented and adds top-level views that read from the same local data.

const sleep = ms => new Promise(r => setTimeout(r, ms));
while (!window.__kd) await sleep(10);

const kd = window.__kd;
const { THINGS } = await import('./errand.js?v=2');
const app = document.getElementById('app');
const panel = document.getElementById('panel');

const FULL_DAY = 5;
const ERRAND_COST = 3;
const THEME_KEY = 'bettermentTheme';
let currentPage = 'today';
let syncing = false;

const directLabels = new Map([
  ['drank some water', 'Drink water'],
  ['stepped outside', 'Step outside'],
  ['moved your body', 'Move your body'],
  ['ate something real', 'Eat something'],
  ['put one thing back', 'Put one thing back'],
  ['said something to someone', 'Message someone'],
]);

function theme() {
  try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch { return 'dark'; }
}
function setTheme(value) {
  const next = value === 'parchment' ? 'parchment' : 'dark';
  document.documentElement.dataset.bettermentTheme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch { /* private mode */ }
  return next;
}
setTheme(theme());

function flames() { return (kd.state.fuel || 0) * 20; }
function levelInfo() {
  const kept = kd.state.kept || 0;
  return { level: Math.floor(kept / 5) + 1, xp: (kept % 5) * 20 };
}
function careNow() { return Math.min(FULL_DAY, kd.debug.cared()); }

function metaFor(text) {
  const t = text.toLowerCase();
  if (t.includes('water')) return ['H2O', 'blue'];
  if (t.includes('brush') || t.includes('tooth') || t.includes('teeth')) return ['CARE', 'purple'];
  if (t.includes('outside') || t.includes('move') || t.includes('stretch') || t.includes('walk')) return ['MOVE', 'green'];
  if (t.includes('eat') || t.includes('food')) return ['FOOD', 'amber'];
  if (t.includes('message') || t.includes('said') || t.includes('call')) return ['TALK', 'purple'];
  if (t.includes('read')) return ['READ', 'amber'];
  if (t.includes('med')) return ['MED', 'amber'];
  return ['GOAL', 'neutral'];
}

function make(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function buildHud() {
  if (document.querySelector('.betterment-hud')) return;
  const hud = make('header', 'betterment-hud');
  hud.setAttribute('aria-label', 'Betterment progress');

  const currency = make('section', 'bm-hud-block');
  currency.innerHTML = '<span class="bm-flame-mark" aria-hidden="true">▲</span><span><strong id="bm-flames" class="bm-hud-number">0</strong><span class="bm-hud-label">Flames</span></span>';

  const level = make('section', 'bm-hud-block bm-level');
  level.innerHTML = '<span class="bm-hud-label">Level</span><strong id="bm-level">1</strong><div class="bm-xp-track" aria-hidden="true"><div id="bm-xp-fill" class="bm-xp-fill"></div></div><span id="bm-xp-text" class="bm-xp-text">0 / 100</span>';

  const settings = make('button', 'bm-settings', 'SET');
  settings.type = 'button';
  settings.setAttribute('aria-label', 'Open settings');
  settings.addEventListener('click', () => openCustom('settings'));

  hud.append(currency, level, settings);
  app.prepend(hud);
}

function buildNav() {
  if (document.querySelector('.bm-nav')) return;
  const nav = make('nav', 'bm-nav');
  nav.setAttribute('aria-label', 'Main navigation');
  const items = [
    ['today', '▲', 'Today'],
    ['journey', '◇', 'Journey'],
    ['inventory', '▣', 'Inventory'],
    ['reflect', '≡', 'Reflect'],
    ['companion', '●', 'Companion'],
  ];
  for (const [page, icon, label] of items) {
    const b = make('button', '', label);
    b.type = 'button';
    b.dataset.bmPage = page;
    const i = make('span', 'bm-nav-icon', icon);
    i.setAttribute('aria-hidden', 'true');
    b.prepend(i);
    b.addEventListener('click', () => navigate(page));
    nav.appendChild(b);
  }
  document.body.appendChild(nav);
}

function progressCard() {
  const card = make('section', 'bm-progress');
  card.dataset.bmProgress = '1';
  const fire = make('div', 'bm-progress-fire', '▲');
  fire.setAttribute('aria-hidden', 'true');

  const middle = make('div');
  middle.appendChild(make('span', 'bm-eyebrow', "TODAY'S PROGRESS"));
  const track = make('div', 'bm-progress-track');
  track.setAttribute('aria-label', `${careNow()} of ${FULL_DAY} care steps complete`);
  for (let i = 0; i < FULL_DAY; i++) track.appendChild(make('span', `bm-progress-seg${i < careNow() ? ' on' : ''}`));
  middle.appendChild(track);

  const score = make('div', 'bm-progress-score');
  score.append(make('strong', 'bm-progress-count', `${careNow()} / ${FULL_DAY}`), make('span', '', 'steps done'));
  card.append(fire, middle, score);
  return card;
}

function enhanceTask(task) {
  if (task.dataset.bmReady) return;
  task.dataset.bmReady = '1';
  const box = task.querySelector('.box');
  const what = task.querySelector('.what');
  if (!box || !what) return;

  const raw = what.textContent.trim();
  what.textContent = directLabels.get(raw.toLowerCase()) || raw;
  const [glyph, tone] = metaFor(what.textContent);
  const icon = make('span', `bm-task-icon bm-tone-${tone}`, glyph);
  icon.setAttribute('aria-hidden', 'true');

  const copy = make('span', 'bm-task-copy');
  task.insertBefore(icon, box);
  task.insertBefore(copy, what);
  copy.append(what, make('span', 'bm-reward', '+20 flames'));
  task.appendChild(box);
}

function enhanceToday() {
  const today = panel.querySelector('.today');
  if (!today) return;

  if (!today.querySelector('[data-bm-progress]')) today.prepend(progressCard());
  const sheet = today.querySelector('.sheet');
  if (sheet && !today.querySelector('.bm-section-head')) {
    const head = make('div', 'bm-section-head');
    head.append(make('div', '', 'TODAY'), make('span', 'bm-checked', `${kd.state.sheet.done.length} checked`));
    sheet.before(head);
  }
  today.querySelectorAll('.task').forEach(enhanceTask);

  const add = today.querySelector('.add input');
  if (add) add.placeholder = 'Add your own goal';

  const buttons = [...today.querySelectorAll('.acts .btn')];
  if (buttons[0]) buttons[0].textContent = 'Breathe';
  if (buttons[2]) buttons[2].textContent = 'Reflect';
  syncJourneyButton();
}

function syncHud() {
  const f = document.getElementById('bm-flames');
  const l = document.getElementById('bm-level');
  const fill = document.getElementById('bm-xp-fill');
  const xp = document.getElementById('bm-xp-text');
  const info = levelInfo();
  if (f) f.textContent = String(flames());
  if (l) l.textContent = String(info.level);
  if (fill) fill.style.width = `${info.xp}%`;
  if (xp) xp.textContent = `${info.xp} / 100`;

  const count = document.querySelector('.bm-progress-count');
  if (count) count.textContent = `${careNow()} / ${FULL_DAY}`;
  document.querySelectorAll('.bm-progress-seg').forEach((seg, i) => seg.classList.toggle('on', i < careNow()));
  const checked = document.querySelector('.bm-checked');
  if (checked) checked.textContent = `${kd.state.sheet.done.length} checked`;
}

function syncJourneyButton() {
  document.querySelectorAll('.btn.send, .bm-send').forEach(send => {
    if (kd.state.errand?.out) {
      const secs = Math.max(0, Math.ceil((kd.state.errand.endsAt - Date.now()) / 1000));
      send.disabled = true;
      send.textContent = `send on journey · back in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    } else {
      send.disabled = kd.state.fuel < ERRAND_COST;
      send.textContent = `send on journey · ${ERRAND_COST * 20} flames`;
    }
  });
}

function syncNav() {
  document.querySelectorAll('.bm-nav [data-bm-page]').forEach(b => {
    const active = b.dataset.bmPage === currentPage;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
}

function navigate(page) {
  currentPage = page;
  if (page === 'today') {
    kd.view.page = 'today';
    kd.debug.render(true);
  } else if (page === 'reflect') {
    kd.view.page = 'journal';
    kd.debug.render(true);
  } else {
    kd.view.page = 'today';
    renderCustom(page);
  }
  syncSoon();
}

function openCustom(page) {
  currentPage = page;
  kd.view.page = 'today';
  renderCustom(page);
  syncSoon();
}

function pageShell(label, title, copy) {
  const wrap = make('div', 'bm-page');
  wrap.append(make('span', 'bm-eyebrow', label), make('h2', '', title));
  if (copy) wrap.appendChild(make('p', 'bm-page-copy', copy));
  return wrap;
}

function renderJourney() {
  const wrap = pageShell('JOURNEY', kd.state.errand?.out ? 'Out beyond the fire' : 'Send your companion out',
    kd.state.errand?.out
      ? 'The journey keeps going while the app is closed. There is nothing to manage.'
      : 'Spend 60 flames on a short journey. It always returns with a story and may bring a found object.');

  if (kd.state.errand?.out) {
    const timer = make('div', 'bm-card bm-timer');
    timer.dataset.bmTimer = '1';
    wrap.appendChild(timer);
  } else {
    const send = make('button', 'btn send bm-send', 'send on journey · 60 flames');
    send.type = 'button';
    send.addEventListener('click', () => kd.debug.sendOut());
    wrap.appendChild(send);
  }

  const lines = kd.state.journal.flatMap(d => d.lines).slice(-3);
  if (lines.length) {
    const card = make('section', 'bm-card');
    card.appendChild(make('span', 'bm-eyebrow', 'RECENT MEMORIES'));
    for (const line of lines) card.appendChild(make('p', 'bm-page-copy', line));
    wrap.appendChild(card);
  }
  return wrap;
}

function renderInventory() {
  const wrap = pageShell('INVENTORY', 'Found by the fire',
    'Memories, not a checklist. There is no penalty for things you have not found.');
  if (!kd.state.found.length) {
    wrap.appendChild(make('div', 'bm-card', 'No found objects yet. Journeys sometimes bring one home.'));
    return wrap;
  }
  const counts = new Map();
  for (const id of kd.state.found) counts.set(id, (counts.get(id) || 0) + 1);
  const grid = make('div', 'bm-grid');
  for (const [id, n] of counts) {
    const card = make('article', 'bm-card bm-find');
    card.append(make('span', 'bm-find-mark', '◆'), make('strong', '', THINGS[id]?.name || id));
    if (n > 1) card.appendChild(make('span', 'bm-hud-label', `×${n}`));
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
  return wrap;
}

function renderCompanion() {
  const info = levelInfo();
  const stageId = kd.debug.stage();
  const wrap = pageShell('COMPANION', stageId,
    'Your companion grows from real care, never from screen time. It cannot get worse because you stayed away.');
  const card = make('section', 'bm-card');
  card.append(make('div', 'bm-big', `Lv. ${info.level}`), make('span', 'bm-hud-label', `${info.xp} / 100 bond`));
  wrap.appendChild(card);
  const hello = make('button', 'btn', 'Say hello');
  hello.type = 'button';
  hello.addEventListener('click', () => {
    kd.view.hopT = .42;
    kd.debug.say('It looks up from the fire.');
  });
  wrap.appendChild(hello);
  return wrap;
}

function renderSettings() {
  const wrap = pageShell('SETTINGS', 'Make the fire yours', 'Dark mode is the default. Your care data stays in this browser.');

  const appearance = make('section', 'bm-card');
  const row = make('div', 'bm-setting-row');
  row.appendChild(make('strong', '', 'Appearance'));
  const toggle = make('button', 'btn', theme() === 'dark' ? 'Parchment mode' : 'Dark mode');
  toggle.type = 'button';
  toggle.addEventListener('click', () => {
    const next = setTheme(theme() === 'dark' ? 'parchment' : 'dark');
    toggle.textContent = next === 'dark' ? 'Parchment mode' : 'Dark mode';
  });
  row.appendChild(toggle);
  appearance.appendChild(row);

  const sound = make('section', 'bm-card');
  const soundRow = make('div', 'bm-setting-row');
  soundRow.appendChild(make('strong', '', 'Sound'));
  const soundBtn = make('button', 'btn', `Sound ${kd.audio.isOn() ? 'on' : 'off'}`);
  soundBtn.type = 'button';
  soundBtn.addEventListener('click', () => {
    kd.audio.setOn(!kd.audio.isOn());
    soundBtn.textContent = `Sound ${kd.audio.isOn() ? 'on' : 'off'}`;
  });
  soundRow.appendChild(soundBtn);
  sound.appendChild(soundRow);

  const data = make('section', 'bm-card');
  data.append(make('strong', '', 'Local only'), make('p', 'bm-page-copy', 'Goals, check-ins and memories are stored in this browser. There is no account and nothing is uploaded.'));
  wrap.append(appearance, sound, data);
  return wrap;
}

function renderCustom(page) {
  if (page === 'journey') panel.replaceChildren(renderJourney());
  else if (page === 'inventory') panel.replaceChildren(renderInventory());
  else if (page === 'companion') panel.replaceChildren(renderCompanion());
  else if (page === 'settings') panel.replaceChildren(renderSettings());
}

function syncCustom() {
  if (currentPage === 'journey') {
    const timer = panel.querySelector('[data-bm-timer]');
    if (timer && kd.state.errand?.out) {
      const secs = Math.max(0, Math.ceil((kd.state.errand.endsAt - Date.now()) / 1000));
      timer.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    }
  }
}

function sync() {
  if (syncing) return;
  syncing = true;
  try {
    buildHud();
    buildNav();

    if (kd.view.page === 'breathe') {
      // The fire itself is the breathing visual; do not replace that panel.
    } else if (kd.view.page === 'journal' && currentPage === 'reflect') {
      // Existing journal logic remains authoritative.
    } else if (['journey', 'inventory', 'companion', 'settings'].includes(currentPage)) {
      if (!panel.querySelector('.bm-page')) renderCustom(currentPage);
    } else {
      currentPage = 'today';
      enhanceToday();
    }

    syncHud();
    syncJourneyButton();
    syncCustom();
    syncNav();
  } finally {
    syncing = false;
  }
}

let scheduled = false;
function syncSoon() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; sync(); });
}

new MutationObserver(syncSoon).observe(panel, { childList: true, subtree: true });
setInterval(sync, 500);
sync();

window.__bettermentUx = {
  navigate,
  theme,
  setTheme,
  sync,
};
