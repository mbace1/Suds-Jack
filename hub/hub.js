// The arcade — every playable thing in the repo on one page, each with a way
// in (Play) and a way back (Feedback).
//
// One row of cabinets, drawn from hub/games.js. Nothing here knows anything
// about any particular game: add an entry to the catalogue and a marquee to
// art.js and a cabinet appears. Feedback is the same panel everywhere, tagged
// with which game it came from, and goes out through hub/feedback.js.

import { GAMES, SKETCHES } from './games.js?v=10';
import { drawMarquee } from './art.js?v=10';
import * as feedback from './feedback.js?v=13';
import * as topics from './topics.js?v=2';
import { LANGS, t, gameText, setLang, getLang, preferred, remember } from './i18n.js?v=6';
import { watchPad, padPresent } from './pad.js?v=9';
import * as room from './arcade.js?v=1';

const el = (tag, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

// Has this browser been introduced yet? Read here rather than asked of the
// sting module, because the answer decides whether Play is a plain link — and
// a link that has to load a module before it knows whether it is a link would
// be a link that hesitates.
function introSeen() {
  try { return !!localStorage.getItem('tokoSting'); } catch { return true; }
}

// ── cabinets ───────────────────────────────────────────────────────
function cabinet(game) {
  const card = el('article', 'cab');
  card.id = `cab-${game.id}`;
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
  // The title is an anchor to this cabinet. That is the whole deep-link
  // affordance: right-click, copy link, paste into a message, and whoever opens
  // it lands on this cabinet with the floor already scrolled to it. A separate
  // "share" button would be a third control on a card that already has two.
  const h3 = el('h3');
  const anchor = el('a', 'cab-link', game.title);
  anchor.href = `#${game.id}`;
  anchor.onclick = e => { e.preventDefault(); goTo(game.id); };
  h3.appendChild(anchor);
  head.append(el('span', 'caret', '>'), h3);
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

  // Your best, off your own disk. The games already write these; the hub only
  // reads them back. Nothing is fetched and nothing is sent — which is also
  // the reason there is no leaderboard here and never will be, and why a
  // cabinet you have not played simply has no line rather than a zero.
  const best = room.bestOf(game);
  if (best != null) {
    const fmt = game.score.fmt === 'points' ? best.toLocaleString()
      : t('best.secs', { x: Math.round(best) });
    body.appendChild(el('p', 'best', `${t('best')} ${fmt}`));
  }

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
    // pressing Play is the only honest signal the hub has that you tried it —
    // it cannot know whether you liked it, and does not ask
    go.addEventListener('click', e => {
      markPlayed(game.id);
      room.sound.coin();
      // The workshop's mark, in front of the game — which is where a studio
      // logo belongs and is the one place it is not in the way of anything.
      // Once per browser (playStingOnce's own key), skippable from the first
      // frame, and the navigation happens when it is done EITHER WAY: if the
      // import fails, or toko/ is not in this tree at all, the catch still
      // sends you to the game. A nicety must never be the reason a Play button
      // does nothing.
      if (introSeen() || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      const gone = () => { location.href = game.path; };
      import('../toko/js/sting.js')
        .then(m => m.playStingOnce('tokoSting')?.done ?? null)
        .then(gone, gone);
    });
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
    notesLink();
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

// ── what you have already said ─────────────────────────────────────
// Every note is written to this device before anything else happens to it, and
// until now that record was invisible: you pressed Send, got a sentence back,
// and had no way to know whether it went, what you had already said, or whether
// you were about to repeat yourself. A feedback channel you cannot read back is
// a suggestion box nailed shut.
//
// So: the archive, newest first, with what each note was about, which shape of
// the floor you were looking at, and — honestly — whether it actually left.
// Held notes can be pushed again from here rather than waiting for the next
// visit, and the whole record can be thrown away, which is the other half of
// keeping something on someone's machine.
function openNotes() {
  if (openPanel) return;
  const returnTo = document.activeElement;
  const scrim = el('div', 'scrim');
  const sheet = el('div', 'sheet');
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'notes-title');

  const h = el('h2', '', t('notes.title'));
  h.id = 'notes-title';
  sheet.appendChild(h);

  const list = el('div', 'note-list');
  sheet.appendChild(list);

  const actions = el('div', 'actions');
  const retry = el('button', 'btn play', `[ ${t('notes.retry')} ]`);
  const forget = el('button', 'btn ghost', `[ ${t('notes.forget')} ]`);
  const close = el('button', 'btn ghost', `[ ${t('fb.close')} ]`);
  actions.append(retry, forget, close);
  sheet.appendChild(actions);

  const titleOf = id => GAMES.find(g => g.id === id)?.title ?? t('hub.self');
  const kindOf = id => topics.kinds(getLang()).find(k => k.id === id)?.label ?? '';

  function draw() {
    const notes = feedback.archive();
    list.textContent = '';
    if (!notes.length) {
      list.appendChild(el('p', 'fb-dest', t('notes.none')));
      retry.hidden = true; forget.hidden = true;
      return;
    }
    let holding = 0;
    for (const n of notes.slice(0, 40)) {
      const row = el('div', 'note-row');
      const head = el('div', 'note-head');
      head.appendChild(el('span', 'note-what',
        [titleOf(n.game), kindOf(n.kind)].filter(Boolean).join(' · ')));
      const isHeld = feedback.held(n);
      if (isHeld) holding++;
      const state = el('span', `note-state${isHeld ? ' held' : ''}`,
        t(isHeld ? 'notes.held' : 'notes.gone'));
      head.appendChild(state);
      row.appendChild(head);
      // the date only — a timestamp to the second says "we are watching", and
      // the useful question is "was that the one I left last week"
      const when = new Date(n.ts).toLocaleDateString(getLang());
      const bits = [when, n.rating ? `${n.rating}/5` : '', n.layout ?? ''].filter(Boolean);
      row.appendChild(el('p', 'note-meta', bits.join(' · ')));
      if (n.text) row.appendChild(el('p', 'note-text', n.text));
      list.appendChild(row);
    }
    retry.hidden = !holding || !feedback.configured();
    forget.hidden = false;
  }

  retry.onclick = async () => {
    retry.disabled = true;
    retry.textContent = `[ ${t('fb.sending')} ]`;
    await feedback.flush();
    retry.disabled = false;
    retry.textContent = `[ ${t('notes.retry')} ]`;
    draw();
    notesLink();
  };
  // two presses, not a confirm dialog: the second press is the confirmation and
  // it says so on the button
  let armed = false;
  forget.onclick = () => {
    if (!armed) { armed = true; forget.textContent = `[ ${t('notes.sure')} ]`; return; }
    feedback.forget();
    armed = false;
    forget.textContent = `[ ${t('notes.forget')} ]`;
    draw();
    notesLink();
  };
  close.onclick = shut;

  function onKey(e) {
    if (e.key === 'Escape') { shut(); return; }
    if (e.key !== 'Tab') return;
    const stops = [...sheet.querySelectorAll('button:not([disabled]):not([hidden])')];
    if (!stops.length) return;
    const first = stops[0], last = stops[stops.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function shut() {
    document.removeEventListener('keydown', onKey);
    scrim.remove();
    openPanel = null;
    if (returnTo && returnTo.isConnected) returnTo.focus();
  }

  scrim.onclick = e => { if (e.target === scrim) shut(); };
  document.addEventListener('keydown', onKey);
  scrim.appendChild(sheet);
  document.body.appendChild(scrim);
  draw();
  openPanel = { close: shut, rate: () => {}, send: () => {} };
  close.focus();
}

// the link only exists once there is something behind it — an empty archive is
// not worth a word in the status line
function notesLink() {
  const n = feedback.archive().length;
  let link = document.getElementById('notes-link');
  if (!n) { link?.remove(); return; }
  if (!link) {
    link = el('button', 'link-btn');
    link.id = 'notes-link';
    link.onclick = openNotes;
    document.getElementById('status').appendChild(link);
  }
  link.textContent = t('notes.link', { n });
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
  markFresh(versions);
}

// ── finding one ────────────────────────────────────────────────────
// Thirteen cabinets is past the point where scanning works, and the tags are
// already in the catalogue doing nothing. So: a box and a row of tags above the
// floor. Typing matches the title, the tagline, the lineage and the tags — in
// whatever language the page is in, because a Finnish reader searching for
// "räiskintä" should not have to guess the English.
//
// Tags are OR against each other and AND against the text: picking `gamepad`
// and `pixel` means either, which is what a person means by picking two, and
// then the words narrow it. Nothing is persisted — a filter you did not set
// ── what you have already tried ────────────────────────────────────
// Thirteen cabinets and no memory means every visit starts from nothing: you
// scan the same covers deciding which ones you have already opened. Pressing
// Play is the only honest signal the hub has — it cannot know whether you
// stayed, or liked it, and it does not ask. So it records exactly that much and
// says exactly that much: TRIED, with the date, and a count in the heading.
//
// Nothing is reordered by it. Sorting the floor by what you have played would
// move the covers around under somebody who had just learned where they were,
// which costs more than it gives.
const PLAYED_KEY = 'sudsJackHubPlayed';

function readPlayed() {
  try { return JSON.parse(localStorage.getItem(PLAYED_KEY)) || {}; } catch { return {}; }
}

function markPlayed(id) {
  const p = readPlayed();
  p[id] = Date.now();
  try { localStorage.setItem(PLAYED_KEY, JSON.stringify(p)); } catch { /* private mode */ }
  // pressing Play is the only honest signal this page gets, so all three
  // counters hang off this one moment and nothing else
  room.credits.add();
  room.streak.mark();
  showPlayed();
  wallRow();
}

function showPlayed() {
  const played = readPlayed();
  let n = 0;
  for (const card of document.querySelectorAll('.cab')) {
    const id = card.id.replace(/^cab-/, '');
    card.querySelector('.tried')?.remove();
    if (!played[id]) continue;
    n++;
    card.classList.add('is-tried');
    const tag = el('span', 'tried', t('played'));
    tag.title = t('played.when', { x: new Date(played[id]).toLocaleDateString(getLang()) });
    card.querySelector('.cab-head')?.appendChild(tag);
  }
  const head = document.getElementById('floor-head');
  if (!head) return;
  const total = document.querySelectorAll('.cab').length;
  // what CHANGED owns this line when there is any — news beats a reminder
  if (n && !head.dataset.fresh) head.textContent = `${t('floor')} · ${t('played.count', { n, m: total })}`;
}

// ── one cabinet, by name ───────────────────────────────────────────
// /#hyperdagger lands on that cabinet; /#hyperdagger/feedback opens its note
// panel. That second one is the point: a link you can paste to a playtester
// which puts them in front of the box, and getting somebody in front of the box
// is upstream of getting a note at all. setHash uses replaceState so it never
// fires its own hashchange back at itself — the rule gameoflife's deep links
// already follow.
function setHash(h) {
  history.replaceState(null, '', h ? `#${h}` : location.pathname + location.search);
}

function goTo(id, opts = {}) {
  const card = document.getElementById(`cab-${id}`);
  if (!card) return false;
  setHash(id);
  card.scrollIntoView({ block: 'center', behavior: opts.jump ? 'auto' : 'smooth' });
  const at = navigables().indexOf(card);
  if (at >= 0) select(at, false);
  return true;
}

// Fragments this page does not own. One entry, and it is the counter.
const THEIRS = new Set(['toko']);

function openFromHash({ jump = false } = {}) {
  const raw = decodeURIComponent(location.hash.slice(1));
  if (!raw) return;
  const [id, what] = raw.split('/');
  // onFloor(), so a pasted `#brand` cannot hand somebody the secret cabinet
  // without the code — it falls through to "not a cabinet here" instead
  const game = onFloor().find(g => g.id === id);
  // THE HASH IS NOT OURS ALONE. `#toko` opens the counter at the top of the
  // page — every badge in every signed game links to `/#toko` — and this
  // handler used to wipe any fragment it did not recognise as a cabinet.
  // hub.js runs first, so the counter's own reader found an empty hash and
  // never opened: the link had been dead the whole time it was documented as
  // working, because the gate for it runs on the brand board, where hub.js is
  // not. A hash somebody else answers to is named here; anything else is still
  // a dead cabinet link and still gets tidied away.
  if (!game) { if (!THEIRS.has(id)) setHash(''); return; }
  goTo(id, { jump });
  if (what === 'feedback') openFeedback(game.title, game.id, game.accent);
}

addEventListener('hashchange', () => openFromHash());

// ── what has moved since you were last here ────────────────────────
// A page with twelve cabinets on it and no memory asks you to remember which
// ones you have already seen, which nobody does. The version numbers are
// already fetched and already true, so the difference between the ones on the
// page now and the ones on the page last time IS the answer — no analytics, no
// account, one object in localStorage.
//
// The snapshot is written on the way OUT, not on arrival: written on arrival,
// a reload thirty seconds later would tell you nothing had changed since a
// visit you were still in the middle of.
const SEEN_KEY = 'sudsJackHubSeen';

function readSeen() {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY)); } catch { return null; }
}

let pendingSeen = null;
function markFresh(versions) {
  const now = {};
  for (const [id, v] of Object.entries(versions)) now[id] = v.v;
  pendingSeen = now;

  const seen = readSeen();
  // A first visit has nothing to compare against, and marking all twelve as new
  // would say nothing while looking like it said something.
  if (!seen) return;

  let n = 0;
  for (const slot of document.querySelectorAll('.ver')) {
    const id = slot.dataset.game;
    if (!(id in now)) continue;
    const was = seen[id];
    const state = was === undefined ? 'new' : (now[id] > was ? 'up' : null);
    if (!state) continue;
    n++;
    const tag = el('span', 'fresh', t(`fresh.${state}`));
    tag.title = state === 'up' ? t('fresh.from', { x: was }) : '';
    slot.after(tag);
    slot.closest('.cab')?.classList.add('has-fresh');
  }
  const head = document.getElementById('floor-head');
  if (n && head) {
    head.textContent = `${t('floor')} · ${t('fresh.count', { n })}`;
    head.dataset.fresh = '1';
  }
}

// this visit becomes the last one on the way out
addEventListener('pagehide', () => {
  if (!pendingSeen) return;
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(pendingSeen)); } catch { /* private mode */ }
});

// ── moving around with a controller (and with the arrow keys) ──────
// The arcade is a wall of cabinets, so a pad should walk it like one: a
// direction moves the selection, A plays, Y leaves a note. Selection is real
// DOM focus, so the keyboard, a screen reader and the pad are all looking at
// the same thing rather than at three parallel ideas of "current".
const A = 0, B = 1, X = 2, Y = 3;

function navigables() {
  // offsetParent is null for anything display:none — a filtered-out cabinet is
  // not somewhere the pad should be able to walk to
  return [
    ...document.querySelectorAll('.cab'),
    ...document.querySelectorAll('.sketch'),
  ].filter(n => n.offsetParent !== null);
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

// ── how the floor is laid out ──────────────────────────────────────
// The rack's shape is a switch rather than a decision, because it is the thing
// most worth arguing about and nobody can argue with a screenshot. Three
// shapes, one attribute on <html>, and CSS does the rest:
//
//   rack   the ladder — 1 / 2 / 3 / 4 across as the screen allows
//   wide   one cabinet per row, marquee at the full width of the wrap
//   list   no marquee at all: title, version, tagline, buttons, one line each
//
// Every note records which one you were looking at (see setContext below), so
// "the covers are too small" and "the covers are too loud" can be told apart by
// where they came from instead of by argument.
const LAYOUTS = ['rack', 'wide', 'list'];
const LAYOUT_KEY = 'sudsJackHubLayout';

function readLayout() {
  try {
    const v = localStorage.getItem(LAYOUT_KEY);
    return LAYOUTS.includes(v) ? v : 'rack';
  } catch { return 'rack'; }
}

function useLayout(name) {
  const id = LAYOUTS.includes(name) ? name : 'rack';
  document.documentElement.dataset.layout = id;
  try { localStorage.setItem(LAYOUT_KEY, id); } catch { /* private mode */ }
  document.querySelectorAll('.layout-row .opt-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.layout === id);
    b.setAttribute('aria-pressed', String(b.dataset.layout === id));
  });
  // the rows changed shape under the selection, so it no longer means anything
  sel = -1;
  document.querySelectorAll('.cab.sel, .sketch.sel').forEach(n => n.classList.remove('sel'));
}

function layoutRow() {
  const row = el('div', 'status-row layout-row');
  row.appendChild(el('span', 'status-label', t('layout')));
  for (const id of LAYOUTS) {
    const b = el('button', 'opt-btn', t(`layout.${id}`));
    b.dataset.layout = id;
    b.title = t(`layout.${id}.hint`);
    b.onclick = () => useLayout(id);
    row.appendChild(b);
  }
  return row;
}

// ── the room: sound, and the counters on the wall ──────────────────
// Sound is OFF and says so. The counters only appear once there is something
// to count — an arcade wall with "0 credits · 0 tickets" on it is a page
// telling you what you have not done yet, which is nagging with extra steps.
function soundRow() {
  const row = el('div', 'status-row sound-row');
  row.appendChild(el('span', 'status-label', t('sound')));
  const b = el('button', 'opt-btn');
  const paint = () => {
    const on = room.sound.on();
    b.textContent = t(on ? 'sound.on' : 'sound.off');
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  };
  b.onclick = () => { room.sound.set(!room.sound.on()); paint(); };
  paint();
  row.appendChild(b);
  return row;
}

function wallRow() {
  document.querySelector('.wall-row')?.remove();
  const c = room.credits.get(), tk = room.tickets.get(), st = room.streak.get();
  if (!c && !tk && st < 2) return;
  const row = el('div', 'status-row wall-row');
  if (c) row.appendChild(el('span', 'wall', c === 1 ? t('credit.one') : t('credit.many', { x: c })));
  if (st > 1) row.appendChild(el('span', 'wall', t('streak', { x: st })));
  if (tk) {
    const n = el('span', 'wall', t('tickets', { x: tk }));
    n.title = t('tickets.buy');          // the joke, where it cannot get in the way
    row.appendChild(n);
  }
  document.getElementById('status').appendChild(row);
}

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
// A secret cabinet is off every rack, every count and every filter until the
// code is entered. `shown()` is read at render time rather than captured once,
// so unlocking is a re-render and nothing else has to know about it.
let unlocked = false;
const onFloor = () => GAMES.filter(g => !g.secret || unlocked);
const active = () => onFloor().filter(g => g.status !== 'archived');
const archived = () => onFloor().filter(g => g.status === 'archived');

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
  for (const g of active()) rack.appendChild(cabinet(g));

  const oldRack = document.getElementById('archived');
  oldRack.textContent = '';
  for (const g of archived()) oldRack.appendChild(cabinet(g));

  const shelfList = document.getElementById('sketches');
  shelfList.textContent = '';
  for (const s of SKETCHES) shelfList.appendChild(shelf(s));

  // the archive is only worth a heading if there is something in it
  document.getElementById('archive-block').hidden = !archived().length;

  document.querySelectorAll('.lang-row .lang-btn').forEach(b => {
    const on = b.dataset.lang === getLang();
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });

  // the accent row carries words too, so it is rebuilt with everything else
  document.querySelector('.accent-row')?.remove();
  document.querySelector('.layout-row')?.remove();
  document.querySelector('.sound-row')?.remove();
  document.getElementById('status').prepend(soundRow());
  document.getElementById('status').prepend(accentRow());
  document.getElementById('status').prepend(layoutRow());
  useAccent(readAccent());
  useLayout(readLayout());

  padHint(false);
  notesLink();
  showPlayed();
  wallRow();
  showVersions();
  // a rebuild threw away the elements the selection pointed at
  sel = -1;
}

document.querySelector('header').prepend(langRow());
setLang(preferred());
document.documentElement.lang = getLang();
render();

document.getElementById('hub-feedback').onclick = () => openFeedback(t('hub.self'), 'hub');

// a pasted link lands where it says it does, without the smooth scroll that
// would read as the page moving on its own
openFromHash({ jump: true });

// What was on screen when the note was written. Feedback about a layout that
// nobody can tell you was in force is feedback about nothing, so this rides
// along on every note from either surface — the panel under a cover art and the
// counter both post through this module.
// `intro` is which of the two stings this browser was shown. There are two of
// them and you only see one, so "the opening drags" is unattributable without
// it — the same reason every note already records which floor layout was in
// force. Read lazily off localStorage so it costs nothing until a note is sent.
feedback.setContext(() => {
  const c = { layout: readLayout(), lang: getLang() };
  try {
    const intro = localStorage.getItem('tokoStingStyle');
    if (intro) c.intro = intro;
  } catch { /* private mode */ }
  return c;
});

// anything written while an endpoint was unreachable goes out now, quietly
feedback.flush();

// ── the room ───────────────────────────────────────────────────────
// Everything below is atmosphere and every piece of it is allowed to do
// nothing: reduced motion turns the first three off, sound is off until asked,
// and the floor above works with all of it missing.
// THE TUBE IS THE HUB'S. The arcade is a terminal, so it comes on like one —
// and that is all it does here. The workshop's mark used to play on arrival
// too, which put a studio logo in front of a page that is a menu; it now goes
// where a studio logo actually goes, in front of a GAME (see the Play handler
// in cabinet()).
//
// NOT IN FRONT OF A DEEP LINK. `/#hyperdagger` means somebody came for one
// thing, and a title card between them and it is exactly what this workshop is
// against.
if (!location.hash) room.powerOn();
room.sound.start();                    // a no-op unless it was left switched on
room.flicker();

// The code. What it reveals is a cabinet that was in the catalogue the whole
// time — re-rendering is the entire unlock, because `active()` reads `unlocked`
// rather than having been handed a list.
room.konami(() => {
  if (unlocked) return;
  unlocked = true;
  render();
  goTo('brand');
  room.sound.coin();
});

// Console handle, same convention as the games — and the seam the counter
// reaches through. `topics` and `feedback` are published here so anything else
// on the page uses THESE module instances rather than importing its own copy at
// its own ?v= token: a second instance of feedback.js has its own endpoint
// configuration, which is a bug that only shows up after the next token bump.
window.__hub = {
  games: GAMES, sketches: SKETCHES, feedback, topics, room,
  // GETTERS, not the arrays. The counter reads `__hub.active` and expects a
  // list, and these two now depend on whether the secret cabinet is unlocked —
  // handing over a snapshot would freeze it at whatever was true when hub.js
  // finished loading, which is always "locked".
  get active() { return active(); },
  get archived() { return archived(); },
  t, lang: getLang,
  debug: {
    open: openFeedback, accent: readAccent, setAccent: useAccent,
    select, move, padHint, selected: () => sel, columns,
    lang: getLang, setLang: useLang, langs: LANGS, render,
    layout: readLayout, setLayout: useLayout, layouts: LAYOUTS,
    notes: openNotes, notesLink,
    room, unlock: () => { unlocked = true; render(); },
    goTo, openFromHash, played: readPlayed, markPlayed,
    seen: readSeen, markSeen: () => {
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(pendingSeen ?? {})); } catch { /* */ }
    },
  },
};
