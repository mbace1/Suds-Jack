// The arcade — every playable thing in the repo on one page, each with a way
// in (Play) and a way back (Feedback).
//
// One row of cabinets, drawn from hub/games.js. Nothing here knows anything
// about any particular game: add an entry to the catalogue and a marquee to
// art.js and a cabinet appears. Feedback is the same panel everywhere, tagged
// with which game it came from, and goes out through hub/feedback.js.

import { GAMES, SKETCHES } from './games.js?v=5';
import { drawMarquee } from './art.js?v=5';
import * as feedback from './feedback.js?v=5';
import { watchPad, padPresent } from './pad.js?v=5';

const el = (tag, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

// ── cabinets ───────────────────────────────────────────────────────
function cabinet(game) {
  const card = el('article', 'cab');
  card.style.setProperty('--cab', game.accent);   // the cabinet's own colour

  // a cabinet with nothing behind it yet is a frame, not a link
  const playable = game.live !== false;
  if (!playable) card.classList.add('dark');
  const frame = el(playable ? 'a' : 'div', 'marquee');
  if (playable) {
    frame.href = game.path;
    frame.setAttribute('aria-label', `Play ${game.title}`);
    frame.tabIndex = -1;                 // the Play button below is the real target
  }
  const canvas = el('canvas', 'art');
  canvas.setAttribute('aria-hidden', 'true');
  drawMarquee(canvas, game.art, game.accent);
  frame.appendChild(canvas);
  card.appendChild(frame);

  const body = el('div', 'cab-body');
  const head = el('div', 'cab-head');
  head.append(el('span', 'caret', '>'), el('h3', '', game.title));
  // the version, if the project has one. Filled in after versions.json lands,
  // so a missing or stale file costs a number rather than the whole cabinet.
  const ver = el('span', 'ver');
  ver.dataset.game = game.id;
  head.appendChild(ver);
  body.append(head, el('p', 'lineage', game.lineage), el('p', 'tagline', game.tagline));

  const tags = el('ul', 'tags');
  for (const tg of game.tags) tags.appendChild(el('li', '', tg));
  body.appendChild(tags);

  // where a cabinet stands right now: its own line while it is playable, and
  // in place of the controls once there is nothing to press
  if (game.note && playable) body.appendChild(el('p', 'note', game.note));
  body.appendChild(el('p', 'controls', playable ? game.controls : (game.note ?? 'not up yet')));

  const actions = el('div', 'actions');
  let go;
  if (playable) {
    go = el('a', 'btn play', '[ Play ]');
    go.href = game.path;
  } else {
    // a dead button that says so beats a live one that 404s
    go = el('button', 'btn dead', '[ Not up ]');
    go.disabled = true;
  }
  // feedback stays open either way — "put this one back" is worth hearing
  const fb = el('button', 'btn ghost', '[ Feedback ]');
  fb.onclick = () => openFeedback(game.title, game.id, game.accent);
  actions.append(go, fb);
  body.appendChild(actions);

  card.appendChild(body);
  return card;
}

function shelf(sketch) {
  const row = el('li', 'sketch');
  const a = el('a', 'sketch-link', sketch.title);
  a.href = sketch.path;
  row.append(a, el('span', 'sketch-note', sketch.tagline));
  return row;
}

// ── feedback panel ─────────────────────────────────────────────────
let openPanel = null;

function openFeedback(title, gameId, accent) {
  if (openPanel) return;
  const returnTo = document.activeElement;

  const scrim = el('div', 'scrim');
  const sheet = el('div', 'sheet');
  // the panel wears the colour of the cabinet it was opened from
  if (accent) sheet.style.setProperty('--accent', accent);   // the cabinet's colour
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'fb-title');

  const h = el('h2', '', `Feedback: ${title}`);
  h.id = 'fb-title';
  sheet.append(h, el('p', 'fb-q', 'How was it?'));

  let rating = 0;
  const row = el('div', 'rate-row');
  const pips = [];
  for (let i = 1; i <= 5; i++) {
    const b = el('button', 'pip', '#');
    b.setAttribute('aria-label', `${i} out of 5`);
    b.setAttribute('aria-pressed', 'false');
    b.onclick = () => {
      rating = i;
      pips.forEach((p, j) => {
        p.classList.toggle('lit', j < i);
        p.setAttribute('aria-pressed', String(j < i));
      });
    };
    pips.push(b);
    row.appendChild(b);
  }
  sheet.appendChild(row);

  const ta = document.createElement('textarea');
  ta.className = 'fb-text';
  ta.rows = 4;
  ta.placeholder = 'What would you change? What did you like? (optional)';
  ta.setAttribute('aria-label', 'Your note');
  sheet.appendChild(ta);

  // only claim delivery if there is somewhere for it to go
  sheet.appendChild(el('p', 'fb-dest', feedback.configured()
    ? 'Goes straight to the people building these. No account, no tracking.'
    : 'Kept on this device — no inbox is configured yet.'));

  const actions = el('div', 'actions');
  const send = el('button', 'btn play', '[ Send ]');
  const cancel = el('button', 'btn ghost', '[ Not now ]');
  actions.append(send, cancel);
  sheet.appendChild(actions);

  const SAID = {
    sent: 'Got it — thank you. That went straight to the workshop.',
    // an opaque no-cors POST cannot be confirmed; say only what is true
    'sent-blind': 'Sent. That form does not answer back, so that is as much as we know.',
    queued: 'Held for now — the inbox did not answer. It will go out next time you visit.',
    off: 'Kept on this device.',
  };

  send.onclick = async () => {
    const text = ta.value.trim();
    // saying nothing and pressing send should record nothing — an empty entry
    // is noise in the data and a lie to the person who sent it
    if (!rating && !text) { close(); return; }
    send.disabled = true; cancel.disabled = true;
    sheet.querySelectorAll('.rate-row, .fb-text, .fb-dest, .fb-q').forEach(n => n.remove());
    const saying = el('p', 'fb-said', 'Sending…');
    sheet.insertBefore(saying, actions);
    const how = await feedback.send({ game: gameId, rating, text, ts: Date.now() });
    saying.textContent = SAID[how] ?? SAID.off;
    cancel.textContent = '[ Close ]';
    cancel.disabled = false;
    cancel.focus();
    send.remove();
  };
  cancel.onclick = close;

  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    // a modal keeps the keyboard inside it, or Tab wanders off behind the scrim
    const stops = [...sheet.querySelectorAll('button:not([disabled]), textarea')];
    if (!stops.length) return;
    const first = stops[0], last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function close() {
    document.removeEventListener('keydown', onKey);
    scrim.remove();
    openPanel = null;
    if (returnTo && returnTo.isConnected) returnTo.focus();
  }

  // on click, not pointerdown: closing on the way down hands focus back and
  // then the click that follows lands on the page behind and takes it away again
  scrim.onclick = e => { if (e.target === scrim) close(); };
  document.addEventListener('keydown', onKey);
  scrim.appendChild(sheet);
  document.body.appendChild(scrim);
  openPanel = {
    close,
    // so a controller can work the panel too: d-pad sets the rating, A sends
    rate: n => pips[Math.max(0, Math.min(4, n - 1))].click(),
    send: () => send.isConnected && !send.disabled && send.click(),
  };
  pips[0].focus();
}

// ── the version each project is on ─────────────────────────────────
// Generated by scripts/versions.mjs at deploy time, which reads each game's
// VERSIONS.md (Toko Drop's convention, now every project's) or falls back to
// the ?v= module token it already carries. Fetched rather than baked in, so
// shipping a new build of one game does not mean re-deploying the arcade.
async function showVersions() {
  let versions;
  try {
    const res = await fetch(new URL('hub/versions.json', document.baseURI), { cache: 'no-cache' });
    if (!res.ok) return;
    versions = await res.json();
  } catch { return; }               // offline, or not generated yet: no numbers
  for (const slot of document.querySelectorAll('.ver')) {
    const v = versions[slot.dataset.game];
    if (!v) continue;
    slot.textContent = `v${v.v}`;
    slot.title = `version from ${v.from}`;
  }
  window.__hub.versions = versions;
}

// ── moving around with a controller (and with the arrow keys) ──────
// The arcade is a wall of cabinets, so a pad should walk it like one: a
// direction moves the selection, A plays, Y leaves a note. Selection is real
// DOM focus, so the keyboard, a screen reader and the pad are all looking at
// the same thing rather than at three parallel ideas of "current".
const A = 0, B = 1, X = 2, Y = 3;

function navigables() {
  return [
    ...document.querySelectorAll('.cab'),
    ...document.querySelectorAll('.sketch'),
  ];
}

// what a cabinet's direction key actually lands on: Play if there is
// something to play, otherwise the Feedback button, which is always there
const target = row =>
  row.querySelector('.btn.play') || row.querySelector('.sketch-link') || row.querySelector('.btn.ghost');

let sel = -1;

function select(i, scroll = true) {
  const rows = navigables();
  if (!rows.length) return;
  sel = (i + rows.length) % rows.length;
  rows.forEach((r, n) => r.classList.toggle('sel', n === sel));
  const el = target(rows[sel]);
  if (el) el.focus({ preventScroll: true });
  if (scroll) rows[sel].scrollIntoView({ block: 'nearest' });
}

// the rack is a grid, so up/down should cross a row rather than step one card
function columns() {
  const rack = document.getElementById('cabinets');
  return rack ? getComputedStyle(rack).gridTemplateColumns.split(' ').length : 1;
}

function move(dx, dy) {
  const step = dx + dy * columns();
  select(sel < 0 ? 0 : sel + step);
}

// keyboard parity, for anyone who would rather not reach for the mouse. Arrow
// keys inside the note field belong to the note field.
document.addEventListener('keydown', e => {
  if (e.target.matches('textarea, input')) return;
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return;
  e.preventDefault();
  move(...d);
});

watchPad({
  dir(dx, dy) {
    if (!dx && !dy) return;          // the stick coming back to centre; nothing to move
    if (openPanel) { if (dx) openPanel.rate(ratingFromDir(dx)); return; }
    move(dx, dy);
  },
  press(i) {
    if (openPanel) {
      if (i === A) openPanel.send();
      if (i === B) openPanel.close();
      return;
    }
    const row = navigables()[sel];
    if (i === A) (row ? target(row) : navigables()[0] && target(navigables()[0]))?.click();
    if (i === Y || i === X) row?.querySelector('.btn.ghost')?.click();
    if (i === B) select(0);
  },
});

// stepping the rating with left/right: remember where it was and nudge
let padRating = 0;
function ratingFromDir(dx) {
  padRating = Math.max(1, Math.min(5, (padRating || 3) + dx));
  return padRating;
}

// a line in the status bar, but only once a pad has actually shown up
function padHint() {
  if (document.getElementById('pad-hint')) return;
  const row = el('span', 'status-row pad-hint');
  row.id = 'pad-hint';
  row.textContent = 'pad: ✕ play · △ feedback · hold ☰ for hub';
  document.getElementById('status').appendChild(row);
  if (sel < 0) select(0, false);
}
addEventListener('gamepadconnected', padHint);
if (padPresent()) padHint();

// ── the screen's phosphor ──────────────────────────────────────────
// The terminal's own colour, the same three as gameoflife's. It tints the
// chrome only — carets, rules, the status line, focus rings. Each cabinet
// keeps its own accent inside its frame, because that is the game's colour.
const ACCENTS = {
  cyan:  ['#35e8d8', '#7fd8d0'],
  green: ['#5ce87a', '#8fd89a'],
  white: ['#cfe4ea', '#b6c8ce'],
};
const ACCENT_KEY = 'sudsJackHubAccent';

function readAccent() {
  try { return ACCENTS[localStorage.getItem(ACCENT_KEY)] ? localStorage.getItem(ACCENT_KEY) : 'cyan'; }
  catch { return 'cyan'; }
}

function useAccent(name) {
  const [hex, dim] = ACCENTS[name] ?? ACCENTS.cyan;
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-dim', dim);
  try { localStorage.setItem(ACCENT_KEY, name); } catch { /* private mode */ }
  document.querySelectorAll('.accent-row .opt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.accent === name);
    b.setAttribute('aria-pressed', String(b.dataset.accent === name));
  });
}

function accentRow() {
  const row = el('div', 'status-row accent-row');
  row.appendChild(el('span', 'status-label', 'screen:'));
  for (const name of Object.keys(ACCENTS)) {
    const b = el('button', 'opt-btn', name);
    b.dataset.accent = name;
    b.onclick = () => useAccent(name);
    row.appendChild(b);
  }
  return row;
}

// ── build the page ─────────────────────────────────────────────────
// Two floors. The active one is what is being worked on right now and gets
// the top of the page to itself; everything finished or set down is still
// here, still playable, one section further down. A game moves between them
// by one word in games.js.
const active = GAMES.filter(g => g.status !== 'archived');
const archived = GAMES.filter(g => g.status === 'archived');

const rack = document.getElementById('cabinets');
for (const g of active) rack.appendChild(cabinet(g));

const oldRack = document.getElementById('archived');
for (const g of archived) oldRack.appendChild(cabinet(g));

const shelfList = document.getElementById('sketches');
for (const s of SKETCHES) shelfList.appendChild(shelf(s));

// the archive is only worth a heading if there is something in it
if (!archived.length) document.getElementById('archive-block').hidden = true;

document.getElementById('status').prepend(accentRow());
useAccent(readAccent());

document.getElementById('hub-feedback').onclick = () => openFeedback('the arcade itself', 'hub');
showVersions();

// anything written while an endpoint was unreachable goes out now, quietly
feedback.flush();

// console handle, same convention as the games
window.__hub = {
  games: GAMES, active, archived, sketches: SKETCHES, feedback,
  debug: {
    open: openFeedback, accent: readAccent, setAccent: useAccent,
    select, move, padHint, selected: () => sel,
  },
};
