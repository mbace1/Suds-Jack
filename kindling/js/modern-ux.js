// Betterment v4 — mobile-first UX over the proven Kindling state machine.
// Existing care, breathing, errand, growth and persistence logic stays authoritative.

const wait = ms => new Promise(r => setTimeout(r, ms));
while (!window.__kd) await wait(10);

const kd = window.__kd;
const { THINGS } = await import('./errand.js?v=9');
const { addTask, removeTask, setSound } = await import('./state.js?v=9');
const { HELLO } = await import('./idle.js?v=9');
const app = document.getElementById('app');
const panel = document.getElementById('panel');
const FULL_DAY = 5;
const ERRAND_COST = 3;
const THEME_KEY = 'bettermentTheme';
let page = 'today';
let syncing = false;

const labels = new Map([
  ['drank some water', 'Drink water'],
  ['stepped outside', 'Step outside'],
  ['moved your body', 'Move your body'],
  ['ate something real', 'Eat something'],
  ['put one thing back', 'Put one thing back'],
  ['said something to someone', 'Message someone'],
]);

const GOALS = [
  { id: 'water', title: 'Drink water', category: 'Body', glyph: 'H2O', tone: 'blue' },
  { id: 'eat', title: 'Eat something', category: 'Body', glyph: 'FOOD', tone: 'amber' },
  { id: 'outside', title: 'Step outside', category: 'Body', glyph: 'OUT', tone: 'green' },
  { id: 'stretch', title: 'Stretch', category: 'Body', glyph: 'MOVE', tone: 'green' },
  { id: 'walk', title: 'Take a short walk', category: 'Body', glyph: 'WALK', tone: 'green' },
  { id: 'brush', title: 'Brush teeth', category: 'Hygiene', glyph: 'CARE', tone: 'purple' },
  { id: 'shower', title: 'Take a shower', category: 'Hygiene', glyph: 'WASH', tone: 'blue' },
  { id: 'face', title: 'Wash your face', category: 'Hygiene', glyph: 'CARE', tone: 'blue' },
  { id: 'meds', title: 'Take meds', category: 'Daily care', glyph: 'MED', tone: 'amber' },
  { id: 'tidy', title: 'Put one thing back', category: 'Daily care', glyph: 'TIDY', tone: 'neutral' },
  { id: 'read', title: 'Read for 10 min', category: 'Mind', glyph: 'READ', tone: 'amber' },
  { id: 'breathe', title: 'Take a breathing break', category: 'Mind', glyph: 'AIR', tone: 'blue' },
  { id: 'pause', title: 'Take a quiet minute', category: 'Mind', glyph: 'CALM', tone: 'purple' },
  { id: 'message', title: 'Message someone', category: 'Connection', glyph: 'TALK', tone: 'purple' },
  { id: 'call', title: 'Call someone', category: 'Connection', glyph: 'CALL', tone: 'purple' },
  { id: 'thanks', title: 'Send a kind message', category: 'Connection', glyph: 'KIND', tone: 'green' },
];
const CATEGORY_ORDER = ['Body', 'Hygiene', 'Mind', 'Connection', 'Daily care'];

const make = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const setText = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };
const displayLabel = text => labels.get(String(text).trim().toLowerCase()) || String(text).trim();

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

const flames = () => (kd.state.fuel || 0) * 20;
const care = () => Math.min(FULL_DAY, kd.debug.cared());
const goalTarget = () => Math.max(1, Math.min(FULL_DAY, kd.state.tasks.length));
const goalDone = () => Math.min(goalTarget(), kd.state.sheet.done.length);
function levelInfo() {
  const kept = kd.state.kept || 0;
  return { level: Math.floor(kept / 5) + 1, xp: (kept % 5) * 20 };
}
function meta(text) {
  const shown = displayLabel(text);
  const preset = GOALS.find(g => g.title.toLowerCase() === shown.toLowerCase());
  if (preset) return [preset.glyph, preset.tone, preset.category];
  const t = shown.toLowerCase();
  if (t.includes('water')) return ['H2O', 'blue', 'Body'];
  if (t.includes('brush') || t.includes('tooth') || t.includes('wash') || t.includes('shower')) return ['CARE', 'purple', 'Hygiene'];
  if (t.includes('outside') || t.includes('move') || t.includes('stretch') || t.includes('walk')) return ['MOVE', 'green', 'Body'];
  if (t.includes('eat') || t.includes('food')) return ['FOOD', 'amber', 'Body'];
  if (t.includes('message') || t.includes('said') || t.includes('call')) return ['TALK', 'purple', 'Connection'];
  if (t.includes('read') || t.includes('quiet') || t.includes('breathe')) return ['CALM', 'blue', 'Mind'];
  if (t.includes('med') || t.includes('tidy') || t.includes('put one')) return ['CARE', 'amber', 'Daily care'];
  return ['GOAL', 'neutral', 'Your goal'];
}
function hasGoal(title) {
  const wanted = title.toLowerCase();
  return kd.state.tasks.some(t => displayLabel(t.text).toLowerCase() === wanted);
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
  for (const [id, icon, label] of [
    ['today', '▲', 'Today'],
    ['journey', '◇', 'Journey'],
    ['inventory', '▣', 'Inventory'],
    ['reflect', '≡', 'Reflect'],
    ['companion', '●', 'Companion'],
  ]) {
    const b = make('button', '', label);
    b.type = 'button';
    b.dataset.bmPage = id;
    const glyph = make('span', 'bm-nav-icon', icon);
    glyph.setAttribute('aria-hidden', 'true');
    b.prepend(glyph);
    b.addEventListener('click', () => navigate(id));
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
  track.style.gridTemplateColumns = `repeat(${goalTarget()},1fr)`;
  for (let i = 0; i < goalTarget(); i++) track.appendChild(make('span', `bm-progress-seg${i < goalDone() ? ' on' : ''}`));
  middle.appendChild(track);
  const score = make('div', 'bm-progress-score');
  score.append(make('strong', 'bm-progress-count', `${goalDone()} / ${goalTarget()}`), make('span', '', 'goals done'));
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
  what.textContent = displayLabel(raw);
  const [glyph, tone, category] = meta(what.textContent);
  const icon = make('span', `bm-task-icon bm-tone-${tone}`, glyph);
  icon.setAttribute('aria-hidden', 'true');
  const copy = make('span', 'bm-task-copy');
  task.insertBefore(icon, box);
  task.insertBefore(copy, what);
  copy.append(what, make('span', 'bm-reward', `${category} · +20 flames`));
  task.appendChild(box);
}

function enhanceMood(today) {
  const ask = today.querySelector('.ask');
  if (ask && ask.textContent.trim() === 'How is it going?') ask.firstChild.textContent = 'How are you feeling?';
  today.querySelectorAll('.mood').forEach(b => {
    const label = b.textContent.trim();
    b.textContent = label.charAt(0).toUpperCase() + label.slice(1);
  });
}

function enhanceToday() {
  const today = panel.querySelector('.today');
  if (!today) return;
  enhanceMood(today);
  if (!today.querySelector('[data-bm-progress]')) today.prepend(progressCard());

  const sheet = today.querySelector('.sheet');
  if (sheet && !today.querySelector('.bm-section-head')) {
    const head = make('div', 'bm-section-head');
    head.append(make('div', '', "TODAY'S GOALS"), make('span', 'bm-checked', `${kd.state.sheet.done.length} checked`));
    sheet.before(head);
  }
  today.querySelectorAll('.task').forEach(enhanceTask);
  const input = today.querySelector('.add input');
  if (input) input.placeholder = 'Add your own goal';
  const addBtn = today.querySelector('.add .btn');
  if (addBtn) addBtn.textContent = '+ Add';
  const form = today.querySelector('.add');
  if (form && !today.querySelector('.bm-manage-goals')) {
    const manage = make('button', 'bm-manage-goals', 'Choose or manage goals');
    manage.type = 'button';
    manage.addEventListener('click', () => openCustom('goals'));
    form.after(manage);
  }
  // Relabelled by what they SAY, not by where they sit. Indexing into this row
  // broke the moment the base layer added a fourth button: `actions[2]` was the
  // journal when this was written and is "say hello" since v3, so the merge
  // would have shipped a hello button labelled "Reflect".
  for (const btn of today.querySelectorAll('.acts .btn')) {
    const was = btn.textContent.toLowerCase();
    if (was.startsWith('breathe')) btn.textContent = 'Breathe';
    else if (was.startsWith('journal')) btn.textContent = 'Reflect';
  }
}

function syncHud() {
  const info = levelInfo();
  setText(document.getElementById('bm-flames'), String(flames()));
  setText(document.getElementById('bm-level'), String(info.level));
  setText(document.getElementById('bm-xp-text'), `${info.xp} / 100`);
  const fill = document.getElementById('bm-xp-fill');
  if (fill) fill.style.width = `${info.xp}%`;
  setText(document.querySelector('.bm-progress-count'), `${goalDone()} / ${goalTarget()}`);
  const track = document.querySelector('.bm-progress-track');
  if (track) track.style.gridTemplateColumns = `repeat(${goalTarget()},1fr)`;
  const segs = [...document.querySelectorAll('.bm-progress-seg')];
  if (segs.length !== goalTarget() && track) {
    track.replaceChildren();
    for (let i = 0; i < goalTarget(); i++) track.appendChild(make('span', `bm-progress-seg${i < goalDone() ? ' on' : ''}`));
  } else {
    segs.forEach((seg, i) => seg.classList.toggle('on', i < goalDone()));
  }
  setText(document.querySelector('.bm-checked'), `${kd.state.sheet.done.length} checked`);
}

function syncJourneyButtons() {
  document.querySelectorAll('.btn.send, .bm-send').forEach(send => {
    let text;
    if (kd.state.errand?.out) {
      const secs = Math.max(0, Math.ceil((kd.state.errand.endsAt - Date.now()) / 1000));
      send.disabled = true;
      text = `send on journey · back in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    } else {
      send.disabled = kd.state.fuel < ERRAND_COST;
      text = `send on journey · ${ERRAND_COST * 20} flames`;
    }
    setText(send, text);
  });
}

function syncNav() {
  const visiblePage = page === 'goals' ? 'today' : page;
  document.querySelectorAll('.bm-nav [data-bm-page]').forEach(b => {
    const active = b.dataset.bmPage === visiblePage;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
}

function shell(label, title, copy) {
  const wrap = make('div', 'bm-page');
  wrap.append(make('span', 'bm-eyebrow', label), make('h2', '', title));
  if (copy) wrap.appendChild(make('p', 'bm-page-copy', copy));
  return wrap;
}

function journeyView() {
  const out = !!kd.state.errand?.out;
  const wrap = shell('JOURNEY', out ? 'Out beyond the fire' : 'Send your companion out',
    out ? 'The journey keeps going while the app is closed. There is nothing to manage.'
      : 'Spend 60 flames on a short journey. It always returns with a story and may bring a found object.');
  if (out) {
    const timer = make('div', 'bm-card bm-timer');
    timer.dataset.bmTimer = '1';
    wrap.appendChild(timer);
  } else {
    const send = make('button', 'btn send bm-send', 'send on journey · 60 flames');
    send.type = 'button';
    send.addEventListener('click', () => { kd.debug.sendOut(); syncSoon(); });
    wrap.appendChild(send);
    const short = Math.max(0, ERRAND_COST * 20 - flames());
    if (short > 0) wrap.appendChild(make('p', 'bm-page-copy bm-journey-hint', `Complete ${Math.ceil(short / 20)} more goal${short > 20 ? 's' : ''} to have enough flames.`));
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

function inventoryView() {
  const wrap = shell('INVENTORY', 'Found by the fire', 'Memories from journeys. There is no missing-item pressure and no collection penalty.');
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

function companionView() {
  const info = levelInfo();
  const stage = kd.debug.stage();
  const stageName = stage.charAt(0).toUpperCase() + stage.slice(1);
  const wrap = shell('COMPANION', stageName, 'Your companion grows from real care, never screen time, and cannot get worse because you stayed away.');
  const card = make('section', 'bm-card bm-companion-card');
  card.append(make('div', 'bm-big', `Lv. ${info.level}`), make('span', 'bm-hud-label', `${info.xp} / 100 bond to next level`));
  wrap.appendChild(card);
  const hello = make('button', 'btn', 'Say hello');
  hello.type = 'button';
  // The base layer owns what the creature actually does (js/idle.js turns it
  // toward you and holds the pose). Calling the same thing from here keeps the
  // two doors on one implementation. It pays nothing from either.
  hello.addEventListener('click', () => {
    kd.idle?.hello();
    kd.debug.say(HELLO[Math.floor(Math.random() * HELLO.length)]);
  });
  wrap.appendChild(hello);
  return wrap;
}

function goalsView() {
  const wrap = shell('GOALS', 'Choose what matters today', 'Start with a few clear actions. Add what helps; remove what does not fit your life.');
  const back = make('button', 'btn bm-back', '← Back to Today');
  back.type = 'button';
  back.addEventListener('click', () => navigate('today'));
  wrap.appendChild(back);

  const current = make('section', 'bm-card bm-current-goals');
  current.appendChild(make('span', 'bm-eyebrow', `YOUR GOALS · ${kd.state.tasks.length}/14`));
  for (const task of kd.state.tasks) {
    const row = make('div', 'bm-current-goal');
    const [glyph, tone, category] = meta(task.text);
    const icon = make('span', `bm-mini-icon bm-tone-${tone}`, glyph);
    icon.setAttribute('aria-hidden', 'true');
    const copy = make('span', 'bm-current-copy');
    copy.append(make('strong', '', displayLabel(task.text)), make('span', 'bm-category', category));
    const remove = make('button', 'bm-small-action', 'Remove');
    remove.type = 'button';
    remove.disabled = kd.state.tasks.length <= 1;
    remove.addEventListener('click', () => {
      if (kd.state.tasks.length <= 1) return;
      removeTask(task.id);
      kd.debug.say(`${displayLabel(task.text)} removed from your goals.`);
      renderCustom('goals');
      syncSoon();
    });
    row.append(icon, copy, remove);
    current.appendChild(row);
  }
  wrap.appendChild(current);

  const custom = make('form', 'bm-card bm-library-add');
  custom.appendChild(make('span', 'bm-eyebrow', 'YOUR OWN GOAL'));
  const customRow = make('div', 'bm-library-add-row');
  const input = make('input', '', '');
  input.type = 'text';
  input.maxLength = 46;
  input.placeholder = 'e.g. Take vitamins';
  input.setAttribute('aria-label', 'Write your own goal');
  const add = make('button', 'btn', '+ Add');
  add.type = 'submit';
  customRow.append(input, add);
  custom.appendChild(customRow);
  custom.addEventListener('submit', e => {
    e.preventDefault();
    const id = addTask(input.value);
    if (!id) {
      kd.debug.say(kd.state.tasks.length >= 14 ? 'Your goal list is full at fourteen.' : 'Write a goal first.');
      return;
    }
    kd.debug.say(`${input.value.trim()} added.`);
    renderCustom('goals');
    syncSoon();
  });
  wrap.appendChild(custom);

  for (const category of CATEGORY_ORDER) {
    const section = make('section', 'bm-goal-section');
    section.appendChild(make('h3', '', category));
    const choices = make('div', 'bm-goal-choices');
    for (const goal of GOALS.filter(g => g.category === category)) {
      const added = hasGoal(goal.title);
      const choice = make('article', `bm-goal-choice${added ? ' added' : ''}`);
      const icon = make('span', `bm-task-icon bm-tone-${goal.tone}`, goal.glyph);
      icon.setAttribute('aria-hidden', 'true');
      const copy = make('span', 'bm-goal-choice-copy');
      copy.append(make('strong', '', goal.title), make('span', 'bm-category', goal.category));
      const button = make('button', 'bm-small-action', added ? 'Added' : 'Add');
      button.type = 'button';
      button.disabled = added || kd.state.tasks.length >= 14;
      button.addEventListener('click', () => {
        const id = addTask(goal.title);
        if (!id) {
          kd.debug.say('Your goal list is full at fourteen.');
          return;
        }
        kd.debug.say(`${goal.title} added.`);
        renderCustom('goals');
        syncSoon();
      });
      choice.append(icon, copy, button);
      choices.appendChild(choice);
    }
    section.appendChild(choices);
    wrap.appendChild(section);
  }
  return wrap;
}

function settingsView() {
  const wrap = shell('SETTINGS', 'Make the fire yours', 'Dark mode is the default. Your care data stays in this browser.');
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
    setSound(kd.audio.isOn());
    soundBtn.textContent = `Sound ${kd.audio.isOn() ? 'on' : 'off'}`;
  });
  soundRow.appendChild(soundBtn);
  sound.appendChild(soundRow);

  const data = make('section', 'bm-card');
  data.append(make('strong', '', 'Local only'), make('p', 'bm-page-copy', 'Goals, check-ins and memories stay in this browser. There is no account and nothing is uploaded.'));
  wrap.append(appearance, sound, data);
  return wrap;
}

function renderCustom(id) {
  if (id === 'journey') panel.replaceChildren(journeyView());
  if (id === 'inventory') panel.replaceChildren(inventoryView());
  if (id === 'companion') panel.replaceChildren(companionView());
  if (id === 'goals') panel.replaceChildren(goalsView());
  if (id === 'settings') panel.replaceChildren(settingsView());
}

function navigate(id) {
  page = id;
  if (id === 'today') {
    kd.view.page = 'today';
    kd.debug.render(true);
  } else if (id === 'reflect') {
    kd.view.page = 'journal';
    kd.debug.render(true);
  } else {
    kd.view.page = 'today';
    renderCustom(id);
  }
  syncSoon();
}
function openCustom(id) { page = id; kd.view.page = 'today'; renderCustom(id); syncSoon(); }

function syncCustom() {
  if (page !== 'journey') return;
  const timer = panel.querySelector('[data-bm-timer]');
  if (timer && kd.state.errand?.out) {
    const secs = Math.max(0, Math.ceil((kd.state.errand.endsAt - Date.now()) / 1000));
    setText(timer, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
  }
}

function sync() {
  if (syncing) return;
  syncing = true;
  try {
    buildHud();
    buildNav();

    if (kd.view.page === 'breathe') {
      page = 'today';
    } else if (kd.view.page === 'journal' && page === 'reflect') {
      // Keep the core journal logic.
    } else if (['journey', 'inventory', 'companion', 'goals', 'settings'].includes(page)) {
      if (!panel.querySelector('.bm-page')) renderCustom(page);
    } else {
      page = 'today';
      enhanceToday();
    }

    syncHud();
    syncJourneyButtons();
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

// Main renders replace the direct child of #panel. Watching only that boundary
// avoids a feedback loop when this layer updates progress text inside the panel.
new MutationObserver(syncSoon).observe(panel, { childList: true });
panel.addEventListener('click', e => {
  if (e.target.closest('.task, .mood, .drop, .btn.send')) setTimeout(syncSoon, 0);
});
setInterval(sync, 500);
sync();

window.__bettermentUx = {
  navigate,
  theme,
  setTheme,
  sync,
  goals: GOALS,
  goalProgress: () => ({ done: goalDone(), target: goalTarget() }),
};