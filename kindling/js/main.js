// Kindling — the app: the sheet, the room, and the clock that ties them.
//
// The loop is Finch's, taken at its word and made small: you tick off a real
// thing you actually did, that becomes fuel, the fuel keeps a fire, the fire is
// the light you see the room by, and a fire with anything to it can send the
// creature out for a walk you do not watch. Nothing here is a score.
//
// The rules of the copy are as load-bearing as the code, so they are written
// down: it never nags, it never scolds a missed day, it never says "you failed"
// or "don't break your streak", and it never claims to be therapy. A day with
// nothing in it gets "the coals kept" and a clear sheet, because that is true
// and because an app that can make you feel worse has no business asking how
// you are.
//
// Everything is DOM buttons over one canvas: the picture is the reward, but the
// controls are real elements, which is what makes it keyboard-navigable, what
// lets the arcade's `{ui:true}` pad bridge walk it, and what keeps the 44px and
// WCAG-AA floors measurable.

import { PixelScreen, loop } from './pixel.js?v=8';
import { drawRoom, FLOOR_Y, FIRE_X, skyOf } from './room.js?v=8';
import { makeIdle, HELLO } from './idle.js?v=8';
import * as audio from './audio.js?v=8';
import { makeBreath, ROUNDS } from './breathe.js?v=8';
import { THINGS, startErrand, errandLeft, report, ERRAND_MS } from './errand.js?v=8';
import {
  S, save, write, rollover, warmth, caredToday, liveStreak, stage, nextStage,
  toggleTask, setMood, countBreath, addTask, removeTask, spend, found, note, setSound,
  dayKey, FULL_DAY, ERRAND_COST, PAY,
} from './state.js?v=8';

const MOODS = [
  { id: 'rough',  label: 'rough' },
  { id: 'low',    label: 'low' },
  { id: 'ok',     label: 'ok' },
  { id: 'good',   label: 'good' },
  { id: 'bright', label: 'bright' },
];

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const screenWrap = document.getElementById('screen');
const panel = document.getElementById('panel');
const statusLine = document.getElementById('status');
const sayLine = document.getElementById('say');

const scr = new PixelScreen(screenWrap);

// ── what the picture is doing right now ───────────────────────────────
const view = {
  page: 'today',          // today | journal | breathe
  shown: warmth(),        // the fire eases toward the real warmth, so ticking
                          // something off is visibly the fire taking it
  sky: skyOf(),
  hop: 0,
  hopT: 0,
  sparks: [],
  breath: null,
  grewTo: stage().id,
};

function say(text) { sayLine.textContent = text; }

// The creature's own business (js/idle.js). It is handed a READER rather than
// the state module: it can see how warm the room is, how much wood there is and
// how full the shelf is, and it has no way to change any of them. Screen time
// earns nothing, and this is the piece of code that has to be trusted about it.
const idle = makeIdle(() => ({
  warmth: warmth(), fuel: S.fuel, found: S.found.length,
}));

// ── who is driving ──────────────────────────────────────────────────
// Swapping a view rebuilds the panel, which throws the focus back to the body —
// a keyboard player has to tab in again from the top every time. So the focus
// follows a view swap, but ONLY when the last thing that happened arrived from a
// key: move it after a tap and a phone raises a ring nobody asked for.
let keyDriven = false;
addEventListener('keydown', e => {
  if (['Tab', 'Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) keyDriven = true;
}, true);
addEventListener('pointerdown', () => { keyDriven = false; }, true);

function focusPrimary() {
  if (!keyDriven) return;
  panel.querySelector('button, input')?.focus();
}

// ── the loop ─────────────────────────────────────────────────────────
let lastDay = dayKey();

const anim = loop((dt, t) => {
  // the fire eases toward the day (1.4s to a new level), so a tick is an event
  const target = warmth();
  view.shown += (target - view.shown) * Math.min(1, dt * 1.6);
  if (Math.abs(target - view.shown) < 0.004) view.shown = target;

  if (view.hopT > 0) {
    view.hopT -= dt;
    const k = Math.max(0, view.hopT / 0.42);
    view.hop = Math.sin(k * Math.PI) * 6;
    if (view.hopT <= 0) view.hop = 0;
  } else if (!S.errand?.out) {
    idle.update(dt, { asleep: caredToday() === 0, still: anim.still });
  }

  for (let i = view.sparks.length - 1; i >= 0; i--) {
    const s = view.sparks[i];
    s.life -= dt * 1.5;
    s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 22 * dt;
    if (s.life <= 0) view.sparks.splice(i, 1);
  }

  if (view.breath) {
    view.breath.update(dt);
    view.flame = 0.25 + view.breath.fullness * 0.75;
    paintBreath();
  } else {
    view.flame = null;
  }

  drawRoom(scr, {
    warmth: view.shown,
    flame: view.flame,
    fuel: S.fuel,
    found: S.found,
    away: !!S.errand?.out,
    stage: stage().id,
    // the hop wins over whatever it was doing, because that one is YOUR event
    pose: view.hopT > 0 ? 'hop' : idle.pose,
    petX: idle.x,
    face: idle.face,
    look: idle.look,
    hop: view.hop,
    sparks: view.sparks,
    sky: view.sky,
    still: anim.still,
    t,
  });

  tickClocks();
});

// The two things that happen without you: the day turning over, and the
// creature coming home. Both are checked off the wall clock rather than counted
// in frames, so a backgrounded tab (where rAF stops) gets them right on return.
let clockAt = 0;
function tickClocks() {
  const now = Date.now();
  if (now - clockAt < 500) return;
  clockAt = now;

  // what is outside, from the local clock alone — nothing is fetched and nothing
  // claims to be the real weather. It only ever changes on the half-second tick,
  // so the room's cache is not asked to think about it every frame.
  const sky = skyOf();
  if (sky.key !== view.sky?.key) view.sky = sky;

  if (dayKey() !== lastDay) {
    lastDay = dayKey();
    rollover();
    idle.interrupt();
    render();
    say(caredToday() === 0
      ? 'A new day. The sheet is clear and the coals kept.'
      : 'A new day.');
  }

  if (S.errand?.out) {
    if (errandLeft(S.errand, now) <= 0) comeHome();
    else if (view.page === 'today') refreshErrandButton();
  }
}

// ── the acts ─────────────────────────────────────────────────────────
function sparkle(n = 8) {
  for (let i = 0; i < n; i++) {
    view.sparks.push({
      x: FIRE_X + (Math.random() * 8 - 4),   // the bonfire moved; the sparks follow
      y: FLOOR_Y - 6 - Math.random() * 8,
      vx: (Math.random() * 2 - 1) * 14,
      vy: -18 - Math.random() * 22,
      life: 0.6 + Math.random() * 0.5,
    });
  }
}

function keptOne(text) {
  sparkle();
  view.hopT = 0.42;
  idle.interrupt();                    // it stops what it was doing and looks
  audio.kept();
  const st = stage();
  if (st.id !== view.grewTo) {
    view.grewTo = st.id;
    audio.grew();
    say(`${text} And it is ${st.name} now.`);
    note(`It grew into ${st.name}.`);
  } else {
    say(text);
  }
  statusRender();
}

function onTask(task, btn) {
  // asked before the toggle: a line that has already been credited today can be
  // ticked again for the look of it, and it simply pays nothing
  const settled = S.sheet.paid.includes(task.id);
  const now = toggleTask(task.id);
  markTask(btn, now);
  if (!now) {
    audio.unkept();
    say('Taken back off the list. No harm in it.');
    statusRender();
    return;
  }
  if (settled) {
    statusRender();
    say('Back on the list. Today already counted that one.');
    return;
  }
  const left = FULL_DAY - caredToday();
  keptOne(left > 0
    ? `The fire takes it. ${left} more small thing${left === 1 ? '' : 's'} would fill it.`
    : 'The fire has everything it needs today.');
}

function onMood(m) {
  const paid = setMood(m.id);
  audio.mood();
  if (paid) keptOne(`Noted: ${m.label}. That counts as looking after yourself.`);
  else say(`Changed to ${m.label}. Changing your mind is free.`);
  render();
}

function sendOut() {
  if (S.errand?.out) return;
  if (!spend(ERRAND_COST)) {
    say(`Not enough kindling yet — an errand takes ${ERRAND_COST}.`);
    return;
  }
  S.errand = startErrand();
  save();
  audio.out();
  idle.leave();
  say('Out it goes. It will be back in a minute and a half, whether you watch or not.');
  render();
}

function comeHome() {
  const errand = S.errand;
  S.errand = null;
  const r = report(errand, S.found);
  for (const line of r.lines) note(line);
  if (r.thing) found(r.thing);
  save();
  audio.home();
  idle.interrupt('stretch');           // it stretches, the way anything does
  view.hopT = 0.42;
  say(`Home. ${r.lines.join(' ')}`);
  render();
}

// ── breathing ────────────────────────────────────────────────────────
function startBreathing() {
  view.page = 'breathe';
  view.breath = makeBreath({
    onRound() { countBreath(); audio.kept(); statusRender(); },
    onDone() {
      view.breath = null;
      view.page = 'today';
      say('Four rounds. The fire is a little higher than it was.');
      render(true);
    },
  });
  render(true);
  audio.breathIn();
}

function stopBreathing() {
  const rounds = view.breath ? view.breath.round - 1 : 0;
  view.breath = null;
  view.page = 'today';
  say(rounds > 0
    ? `${rounds} round${rounds === 1 ? '' : 's'} kept. Stopping when you have had enough is the exercise too.`
    : 'Any time.');
  render(true);
}

let lastPhase = null;
function paintBreath() {
  const b = view.breath;
  if (!b) return;
  const box = document.getElementById('breath-label');
  if (box) box.textContent = `${b.label} · ${b.left}`;
  const meter = document.getElementById('breath-round');
  if (meter) meter.textContent = `round ${b.round} of ${ROUNDS}`;
  if (b.phase !== lastPhase) {
    lastPhase = b.phase;
    if (b.phase === 'in') audio.breathIn();
    if (b.phase === 'out') audio.breathOut();
  }
}

// ── the views ────────────────────────────────────────────────────────
function markTask(btn, done) {
  btn.setAttribute('aria-pressed', done ? 'true' : 'false');
  btn.querySelector('.box').textContent = done ? '[x]' : '[ ]';
}

function todayPanel() {
  const wrap = el('div', 'today');

  if (!S.sheet.mood) {
    const q = el('p', 'ask', 'How is it going?');
    const row = el('div', 'moods');
    for (const m of MOODS) {
      const b = el('button', 'mood', m.label);
      b.type = 'button';
      b.addEventListener('click', () => onMood(m));
      row.appendChild(b);
    }
    wrap.append(q, row);
  } else {
    const m = MOODS.find(x => x.id === S.sheet.mood);
    const line = el('p', 'ask', `Today: ${m ? m.label : S.sheet.mood}. `);
    const change = el('button', 'link', 'change');
    change.type = 'button';
    change.addEventListener('click', () => { S.sheet.mood = null; save(); render(); });
    line.appendChild(change);
    wrap.appendChild(line);
  }

  const list = el('ul', 'sheet');
  for (const task of S.tasks) {
    const li = el('li');
    const b = el('button', 'task');
    b.type = 'button';
    b.appendChild(el('span', 'box', S.sheet.done.includes(task.id) ? '[x]' : '[ ]'));
    b.appendChild(el('span', 'what', task.text));
    b.setAttribute('aria-pressed', S.sheet.done.includes(task.id) ? 'true' : 'false');
    b.addEventListener('click', () => onTask(task, b));
    li.appendChild(b);
    if (task.custom) {
      const x = el('button', 'drop', '×');
      x.type = 'button';
      x.setAttribute('aria-label', `remove "${task.text}" from the list`);
      x.addEventListener('click', () => {
        removeTask(task.id);
        say('Off the list.');
        render(true);        // the button it was on has just gone
      });
      li.appendChild(x);
    }
    list.appendChild(li);
  }
  wrap.appendChild(list);

  // your own list matters more than mine: the six defaults are a starting
  // point, and anything you add is a line you wrote about your own day
  const form = el('form', 'add');
  const input = el('input');
  input.type = 'text';
  input.maxLength = 46;
  input.placeholder = 'something you want to keep doing';
  input.setAttribute('aria-label', 'add something to the list');
  const addBtn = el('button', 'btn', 'add');
  addBtn.type = 'submit';
  form.append(input, addBtn);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const id = addTask(input.value);
    input.value = '';
    if (!id) { say('That one is either empty or the list is full at fourteen.'); return; }
    audio.page();
    say('Added. It is yours now, so word it however you like.');
    render();
    document.querySelector('.add input')?.focus();
  });
  wrap.appendChild(form);

  const acts = el('div', 'acts');
  const breathe = el('button', 'btn', `breathe  (+${PAY.breath})`);
  breathe.type = 'button';
  breathe.addEventListener('click', startBreathing);

  const send = el('button', 'btn send', '');
  send.type = 'button';
  send.addEventListener('click', sendOut);

  // Saying hello is the only interaction in the app with no payout at all — no
  // kindling, no counter, no cooldown to game. It is here precisely because
  // everything else in a care app tends to become a transaction.
  const hello = el('button', 'btn', 'say hello');
  hello.type = 'button';
  hello.addEventListener('click', () => {
    if (S.errand?.out) { say('It is out. There is a light in the window.'); return; }
    idle.hello();
    audio.page();
    say(HELLO[Math.floor(Math.random() * HELLO.length)]);
  });

  const journal = el('button', 'btn', 'journal');
  journal.type = 'button';
  journal.addEventListener('click', () => { view.page = 'journal'; audio.page(); render(true); });

  acts.append(breathe, send, hello, journal);
  wrap.appendChild(acts);
  return wrap;
}

function refreshErrandButton() {
  const send = document.querySelector('.btn.send');
  if (!send) return;
  if (S.errand?.out) {
    const left = errandLeft(S.errand);
    const secs = Math.ceil(left / 1000);
    send.disabled = true;
    send.textContent = `out — back in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  } else {
    send.disabled = S.fuel < ERRAND_COST;
    send.textContent = `send it out  (${ERRAND_COST})`;
  }
}

function breathePanel() {
  const wrap = el('div', 'breathing');
  const label = el('p', 'breath-label', 'breathe in · 4');
  label.id = 'breath-label';
  label.setAttribute('aria-live', 'polite');
  const round = el('p', 'breath-round', `round 1 of ${ROUNDS}`);
  round.id = 'breath-round';
  const hint = el('p', 'hint', 'Follow the fire. It rises while you fill and falls while you empty.');
  const stop = el('button', 'btn', 'enough for now');
  stop.type = 'button';
  stop.addEventListener('click', stopBreathing);
  wrap.append(label, round, hint, stop);
  return wrap;
}

function journalPanel() {
  const wrap = el('div', 'journal');
  const back = el('button', 'btn', 'back to today');
  back.type = 'button';
  back.addEventListener('click', () => { view.page = 'today'; audio.page(); render(true); });
  wrap.appendChild(back);

  if (!S.journal.length) {
    wrap.appendChild(el('p', 'hint', 'Nothing written yet. It fills itself as the days go.'));
    return wrap;
  }

  const list = el('ul', 'days');
  for (const day of S.journal.slice(0, 30)) {
    const li = el('li');
    li.appendChild(el('h2', 'date', prettyDate(day.date)));
    const bits = [];
    if (day.kept) bits.push(`${day.kept} small thing${day.kept === 1 ? '' : 's'}`);
    if (day.mood) bits.push(day.mood);
    if (bits.length) li.appendChild(el('p', 'tally', bits.join(' · ')));
    for (const line of day.lines) li.appendChild(el('p', 'line', line));
    list.appendChild(li);
  }
  wrap.appendChild(list);

  if (S.found.length) {
    const counts = new Map();
    for (const id of S.found) counts.set(id, (counts.get(id) ?? 0) + 1);
    const shelf = el('p', 'hint', 'On the shelf: ' + [...counts].map(([id, n]) =>
      (THINGS[id]?.name ?? id) + (n > 1 ? ` ×${n}` : '')).join(', ') + '.');
    wrap.appendChild(shelf);
  }
  return wrap;
}

function prettyDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  const today = dayKey();
  if (key === today) return 'today';
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function statusRender() {
  statusLine.replaceChildren();
  const st = stage(), next = nextStage();
  const bits = [
    `${S.fuel} kindling`,
    liveStreak() > 0 ? `${liveStreak()} day${liveStreak() === 1 ? '' : 's'} running` : 'day one, whenever',
    next ? `${st.name} · ${next.at - S.kept} to ${next.name}` : `${st.name}, fully grown`,
  ];
  for (const b of bits) statusLine.appendChild(el('span', 'bit', b));

  const sound = el('button', 'bit link', `sound ${audio.isOn() ? 'on' : 'off'}`);
  sound.type = 'button';
  sound.setAttribute('aria-pressed', audio.isOn() ? 'true' : 'false');
  sound.addEventListener('click', () => {
    audio.setOn(!audio.isOn());
    setSound(audio.isOn());
    audio.setWarmth(warmth());
    statusRender();
  });
  statusLine.appendChild(sound);
}

// `focus` is passed only where the VIEW changed — a repaint after ticking a line
// must leave the focus where the player put it.
function render(focus = false) {
  panel.replaceChildren(
    view.page === 'journal' ? journalPanel()
      : view.page === 'breathe' ? breathePanel()
        : todayPanel());
  if (view.page === 'today') refreshErrandButton();
  statusRender();
  audio.setWarmth(warmth());
  if (focus) focusPrimary();
}

// ── boot ─────────────────────────────────────────────────────────────
render();

// The one-time note about where this all lives. It is first, it is once, and it
// is the truth: an app that asks how you are should say who is listening.
if (!S.seen) {
  say('Everything you tick, write or find stays in this browser. Nothing is sent anywhere, and there is no account.');
  S.seen = true;
  save();
} else if (S.errand?.out) {
  const secs = Math.ceil(errandLeft(S.errand) / 1000);
  say(secs > 0 ? 'It is out. There is a light in the window.' : 'Something is at the door.');
} else if (caredToday() === 0) {
  say(liveStreak() > 0
    ? 'Coals, and something asleep beside them. Whenever you are ready.'
    : 'The coals kept. Nothing was lost while you were away.');
} else {
  say(`${caredToday()} small thing${caredToday() === 1 ? '' : 's'} so far today.`);
}

if (S.sound) audio.setOn(true);

addEventListener('pagehide', write);
addEventListener('visibilitychange', () => { if (document.hidden) write(); });

// the console handle, and what the smoke test drives. Everything the test needs
// is state, not pixels — a sandbox with no GPU renders this at a handful of
// frames a second and a clock-driven test would be a coin flip.
window.__kd = {
  state: S,
  audio,
  view,
  idle,
  debug: {
    render,
    say,
    warmth: () => warmth(),
    cared: () => caredToday(),
    streak: () => liveStreak(),
    stage: () => stage().id,
    tasks: () => S.tasks.map(t => t.id),
    tick: () => tickClocks(),
    // hand the clock forward rather than waiting ninety seconds for it
    finishErrand() {
      if (!S.errand?.out) return false;
      S.errand.endsAt = Date.now() - 1;
      clockAt = 0;
      tickClocks();
      return true;
    },
    // pretend a day has gone by: the sheet turns over, nothing else is touched
    ageDay(days = 1) {
      const shift = k => {
        const [y, m, d] = k.split('-').map(Number);
        const t = new Date(y, m - 1, d, 12);
        t.setDate(t.getDate() - days);
        const p = n => String(n).padStart(2, '0');
        return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
      };
      S.sheet.date = shift(S.sheet.date);
      if (S.lastKept) S.lastKept = shift(S.lastKept);
      for (const day of S.journal) day.date = shift(day.date);
      lastDay = S.sheet.date;
      clockAt = 0;
      tickClocks();
      return dayKey();
    },
    // drive the creature's own business without waiting out its long gaps
    idleStep(secs = 1, step = 0.05) {
      for (let i = 0; i < secs / step; i++) idle.update(step, { asleep: caredToday() === 0 });   // the gate drives it awake
      return { x: idle.x, pose: idle.pose, behaviour: idle.behaviour };
    },
    sky: () => view.sky,
    breathe: startBreathing,
    stopBreathing,
    sendOut,
    give(n) { S.fuel += n; save(); render(); },
    stop() { anim.stop(); },
    ERRAND_MS,
  },
};
