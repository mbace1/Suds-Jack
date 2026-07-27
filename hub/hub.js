// The arcade — every playable thing in the repo on one page, each with a way
// in (Play) and a way back (Feedback).
//
// One row of cabinets, drawn from hub/games.js. Nothing here knows anything
// about any particular game: add an entry to the catalogue and a marquee to
// art.js and a cabinet appears. Feedback is the same panel everywhere, tagged
// with which game it came from, and goes out through hub/feedback.js.

import { GAMES, SKETCHES } from './games.js?v=5';
import { drawMarquee } from './art.js?v=6';
import * as feedback from './feedback.js?v=5';
import * as topics from './topics.js?v=2';
import { LANGS, t, gameText, setLang, getLang, preferred, remember } from './i18n.js?v=1';
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
    frame.setAttribute('aria-label', t('play.aria', { x: game.title }));
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
  body.append(head, el('p', 'lineage', gameText(game, 'lineage')),
    el('p', 'tagline', gameText(game, 'tagline')));

  const tags = el('ul', 'tags');
  for (const tg of game.tags) tags.appendChild(el('li', '', tg));
  body.appendChild(tags);

  // where a cabinet stands right now: its own line while it is playable, and
  // in place of the controls once there is nothing to press
  const note = gameText(game, 'note');
  if (note && playable) body.appendChild(el('p', 'note', note));
  body.appendChild(el('p', 'controls',
    playable ? gameText(game, 'controls') : (note || t('notup.yet'))));

  const actions = el('div', 'actions');
  let go;
  if (playable) {
    go = el('a', 'btn play', `[ ${t('play')} ]`);
    go.href = game.path;
  } else {
    // a dead button that says so beats a live one that 404s
    go = el('button', 'btn dead', `[ ${t('notup')} ]`);
    go.disabled = true;
  }
  // feedback stays open either way — "put this one back" is worth hearing
  const fb = el('button', 'btn ghost', `[ ${t('feedback')} ]`);
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
  row.append(a, el('span', 'sketch-note', gameText(sketch, 'tagline')));
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

  const h = el('h2', '', t('fb.title', { x: title }));
  h.id = 'fb-title';
  sheet.append(h, el('p', 'fb-q', t('fb.q')));

  // The kind row, ordered by what this project is actually asking about
  // (topics.js). Nothing is gated behind it — pick one and the suggestions
  // under the box change; ignore it and you can still just type. Making it a
  // required first step would buy tidier data by charging every casual player
  // an extra tap, which is the wrong trade for the one channel players use.
  let kind = '';
  const kindRow = el('div', 'kind-row');
  const kindBtns = topics.kindsFor(gameId, getLang()).map(k => {
    const b = el('button', 'kind', k.label);
    b.type = 'button';
    b.title = k.hint ?? '';
    b.setAttribute('aria-pressed', 'false');
    b.onclick = () => {
      kind = kind === k.id ? '' : k.id;
      kindBtns.forEach(o => {
        const on = o.dataset.kind === kind;
        o.classList.toggle('on', on);
        o.setAttribute('aria-pressed', String(on));
      });
      renderChips();
    };
    b.dataset.kind = k.id;
    kindRow.appendChild(b);
    return b;
  });
  sheet.appendChild(kindRow);

  let rating = 0;
  const row = el('div', 'rate-row');
  const pips = [];
  for (let i = 1; i <= 5; i++) {
    const b = el('button', 'pip', '#');
    b.setAttribute('aria-label', t('fb.rate', { n: i }));
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
  ta.placeholder = t('fb.placeholder');
  ta.setAttribute('aria-label', t('fb.note'));
  sheet.appendChild(ta);

  // Suggestions, and they FILL THE BOX rather than submit. A one-tap answer you
  // cannot then argue with is a leading question, and the argument is the part
  // worth having — so tapping one puts the words in the box with the cursor
  // after them, ready to be finished, cut or contradicted.
  const chipRow = el('div', 'chip-row');
  sheet.appendChild(chipRow);
  function renderChips() {
    chipRow.textContent = '';
    if (!kind) return;
    for (const s of topics.chipsFor(gameId, kind, getLang())) {
      const c = el('button', 'chip', s);
      c.type = 'button';
      c.onclick = () => {
        ta.value = ta.value.trim() ? `${ta.value.replace(/\s+$/, '')} ${s}` : s;
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
      };
      chipRow.appendChild(c);
    }
  }

  // only claim delivery if there is somewhere for it to go
  sheet.appendChild(el('p', 'fb-dest', t(feedback.configured() ? 'fb.dest.on' : 'fb.dest.off')));

  const actions = el('div', 'actions');
  const send = el('button', 'btn play', `[ ${t('fb.send')} ]`);
  const cancel = el('button', 'btn ghost', `[ ${t('fb.notnow')} ]`);
  actions.append(send, cancel);
  sheet.appendChild(actions);

  // an opaque no-cors POST cannot be confirmed; say only what is true
  const SAID = {
    sent: 'fb.sent', 'sent-blind': 'fb.sent.blind', queued: 'fb.queued', off: 'fb.off',
  };

  send.onclick = async () => {
    const text = ta.value.trim();
    // saying nothing and pressing send should record nothing — an empty entry
    // is noise in the data and a lie to the person who sent it
    if (!rating && !text && !kind) { close(); return; }
    send.disabled = true; cancel.disabled = true;
    sheet.querySelectorAll('.rate-row, .fb-text, .fb-dest, .fb-q, .kind-row, .chip-row').forEach(n => n.remove());
    const saying = el('p', 'fb-said', t('fb.sending'));
    sheet.insertBefore(saying, actions);
    const how = await feedback.send({ game: gameId, kind, rating, text, ts: Date.now() });
    saying.textContent = t(SAID[how] ?? SAID.off);
    cancel.textContent = `[ ${t('fb.close')} ]`;
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
    slot.title = t('ver.from', { x: v.from });
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

// a line in the status bar, but only once a pad has actually shown up. It is
// re-called on a language switch, so it relabels an existing hint rather than
// insisting it has already been added.
let padSeen = false;
function padHint(fromPad = true) {
  if (fromPad) padSeen = true;
  if (!padSeen) return;
  let row = document.getElementById('pad-hint');
  if (!row) {
    row = el('span', 'status-row pad-hint');
    row.id = 'pad-hint';
    document.getElementById('status').appendChild(row);
    if (sel < 0) select(0, false);
  }
  row.textContent = t('pad.hint');
}
addEventListener('gamepadconnected', () => padHint());
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
  row.appendChild(el('span', 'status-label', t('screen')));
  for (const name of Object.keys(ACCENTS)) {
    const b = el('button', 'opt-btn', t(`accent.${name}`));
    b.dataset.accent = name;
    b.onclick = () => useAccent(name);
    row.appendChild(b);
  }
  return row;
}

// ── the language row ───────────────────────────────────────────────
// Three languages, at the top, by their own codes — the same three the whole
// workshop uses. Codes rather than flags or full names: this is a terminal, the
// row has to survive at the top of a phone screen, and a flag is a country
// rather than a language. The full name is still the accessible name.
function langRow() {
  const row = el('nav', 'lang-row');
  row.setAttribute('aria-label', t('lang'));
  for (const l of LANGS) {
    const b = el('button', 'lang-btn', l.code);
    b.type = 'button';
    b.dataset.lang = l.code;
    b.setAttribute('aria-label', l.label);
    b.onclick = () => useLang(l.code);
    row.appendChild(b);
  }
  return row;
}

// Everything the page says is built from t() and gameText(), so switching is a
// rebuild rather than a reload: the accent, the scroll position and any pad
// selection all survive it, and there is no flash of the old language.
function useLang(code) {
  setLang(code);
  remember(code);
  // a page that says lang="en" while showing Japanese is lying to every screen
  // reader and translation tool that asks it
  document.documentElement.lang = code;
  render();
}

// ── build the page ─────────────────────────────────────────────────
// Two floors. The active one is what is being worked on right now and gets
// the top of the page to itself; everything finished or set down is still
// here, still playable, one section further down. A game moves between them
// by one word in games.js.
const active = GAMES.filter(g => g.status !== 'archived');
const archived = GAMES.filter(g => g.status === 'archived');

const setText = (sel, key) => {
  const n = document.querySelector(sel);
  if (n) n.textContent = t(key);
};

function render() {
  // the static copy in index.html is the no-JS fallback; this is the real one
  setText('.sub', 'sub');
  setText('#floor-head', 'floor');
  setText('#floor-sr', 'floor.sr');
  setText('#archive-head', 'archive');
  setText('#sketch-head', 'sketches');
  setText('#source-link', 'source');
  setText('#hub-feedback', 'tell.hub');

  const rack = document.getElementById('cabinets');
  rack.textContent = '';
  for (const g of active) rack.appendChild(cabinet(g));

  const oldRack = document.getElementById('archived');
  oldRack.textContent = '';
  for (const g of archived) oldRack.appendChild(cabinet(g));

  const shelfList = document.getElementById('sketches');
  shelfList.textContent = '';
  for (const s of SKETCHES) shelfList.appendChild(shelf(s));

  // the archive is only worth a heading if there is something in it
  document.getElementById('archive-block').hidden = !archived.length;

  document.querySelectorAll('.lang-row .lang-btn').forEach(b => {
    const on = b.dataset.lang === getLang();
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });

  // the accent row carries words too, so it is rebuilt with everything else
  document.querySelector('.accent-row')?.remove();
  document.getElementById('status').prepend(accentRow());
  useAccent(readAccent());

  padHint(false);
  showVersions();
  // a rebuild threw away the elements the selection pointed at
  sel = -1;
}

document.querySelector('header').prepend(langRow());
setLang(preferred());
document.documentElement.lang = getLang();
render();

document.getElementById('hub-feedback').onclick = () => openFeedback(t('hub.self'), 'hub');

// anything written while an endpoint was unreachable goes out now, quietly
feedback.flush();

// Console handle, same convention as the games — and the seam the counter
// reaches through. `topics` and `feedback` are published here so anything else
// on the page uses THESE module instances rather than importing its own copy at
// its own ?v= token: a second instance of feedback.js has its own endpoint
// configuration, which is a bug that only shows up after the next token bump.
window.__hub = {
  games: GAMES, active, archived, sketches: SKETCHES, feedback, topics,
  t, lang: getLang,
  debug: {
    open: openFeedback, accent: readAccent, setAccent: useAccent,
    select, move, padHint, selected: () => sel,
    lang: getLang, setLang: useLang, langs: LANGS, render,
  },
};
