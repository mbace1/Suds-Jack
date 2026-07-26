// The arcade — every playable thing in the repo on one page, each with a way
// in (Play) and a way back (Feedback).
//
// One row of cabinets, drawn from hub/games.js. Nothing here knows anything
// about any particular game: add an entry to the catalogue and a marquee to
// art.js and a cabinet appears. Feedback is the same panel everywhere, tagged
// with which game it came from, and goes out through hub/feedback.js.

import { GAMES, SKETCHES } from './games.js?v=2';
import { drawMarquee } from './art.js?v=2';
import * as feedback from './feedback.js?v=2';

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

  const play = el('a', 'marquee');
  play.href = game.path;
  play.setAttribute('aria-label', `Play ${game.title}`);
  play.tabIndex = -1;                    // the Play button below is the real target
  const canvas = el('canvas', 'art');
  canvas.setAttribute('aria-hidden', 'true');
  drawMarquee(canvas, game.art, game.accent);
  play.appendChild(canvas);
  card.appendChild(play);

  const body = el('div', 'cab-body');
  const head = el('div', 'cab-head');
  head.append(el('span', 'caret', '>'), el('h3', '', game.title));
  body.append(head, el('p', 'lineage', game.lineage), el('p', 'tagline', game.tagline));

  const tags = el('ul', 'tags');
  for (const tg of game.tags) tags.appendChild(el('li', '', tg));
  body.appendChild(tags);

  body.appendChild(el('p', 'controls', game.controls));

  const actions = el('div', 'actions');
  const go = el('a', 'btn play', '[ Play ]');
  go.href = game.path;
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
  openPanel = { close };
  pips[0].focus();
}

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
const rack = document.getElementById('cabinets');
for (const g of GAMES) rack.appendChild(cabinet(g));

const shelfList = document.getElementById('sketches');
for (const s of SKETCHES) shelfList.appendChild(shelf(s));

document.getElementById('status').prepend(accentRow());
useAccent(readAccent());

document.getElementById('hub-feedback').onclick = () => openFeedback('the arcade itself', 'hub');

// anything written while an endpoint was unreachable goes out now, quietly
feedback.flush();

// console handle, same convention as the games
window.__hub = {
  games: GAMES, sketches: SKETCHES, feedback,
  debug: { open: openFeedback, accent: readAccent, setAccent: useAccent },
};
