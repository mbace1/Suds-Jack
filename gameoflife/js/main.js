// The Game of Life — hub, routing, and the rest-cycle.
// Flow: hub → experience → feedback → (every 2nd finish: nature interlude) → hub.
// Adding an experience = one module in js/experiences/ + one REGISTRY entry
// + its strings in i18n.js. Nothing else changes.

import { t, setLang, getLang, LANGS } from './i18n.js?v=1';
import { PAL } from './palette.js?v=1';
import * as store from './storage.js?v=1';
import * as audio from './audio.js?v=1';
import { pickInterlude, isEvening } from './nature.js?v=1';
import { aqueduct } from './experiences/aqueduct.js?v=1';
import { forest } from './experiences/forest.js?v=1';

const REGISTRY = [aqueduct, forest];

const app = document.getElementById('app');
let current = null;   // active experience handle

// language: stored pref → browser hint → English
{
  const pref = store.getState().lang;
  if (pref) setLang(pref);
  else {
    const nav = (navigator.language || 'en').slice(0, 2);
    setLang(['fi', 'ja'].includes(nav) ? nav : 'en');
  }
}

document.addEventListener('pointerdown', audio.init, { once: true });

// ── hub ────────────────────────────────────────────────────────────
function showHub() {
  if (current) { current.destroy(); current = null; }
  app.innerHTML = '';

  const header = el('header', 'hub-header');
  header.append(
    el('h1', '', t('hub.title')),
    el('p', 'tagline', t('hub.tagline')),
  );

  const langRow = el('div', 'lang-row');
  for (const { code, label } of LANGS) {
    const b = el('button', 'lang-btn' + (getLang() === code ? ' active' : ''), label);
    b.onclick = () => { setLang(code); store.setLangPref(code); showHub(); };
    langRow.appendChild(b);
  }
  header.appendChild(langRow);
  app.appendChild(header);

  const resting = store.interludeDue();
  const cards = el('div', 'cards');
  for (const exp of REGISTRY) {
    const card = el('div', 'card');
    const today = store.timesPlayedToday(exp.id);
    card.append(
      el('h2', '', t(`exp.${exp.id}.name`)),
      el('p', '', t(`exp.${exp.id}.desc`)),
    );
    if (today > 0) card.appendChild(el('p', 'played-note', `✓ ${t('hub.done.today')}`));
    const b = el('button', 'btn', store.timesPlayed(exp.id) ? t('hub.again') : t('hub.play'));
    b.onclick = () => startExperience(exp);
    card.appendChild(b);
    cards.appendChild(card);
  }
  app.appendChild(cards);

  app.appendChild(el('p', 'cycle-hint', resting ? t('hub.rested') : t('hub.cycle.hint')));

  const fb = el('button', 'link-btn', t('hub.feedback'));
  fb.onclick = () => showFeedback('hub', showHub);
  app.appendChild(fb);

  // the cycle: if two experiences have been finished, the hub opens
  // straight onto the invitation before anything else can be played
  if (resting) showInterlude();
}

// ── experience routing ─────────────────────────────────────────────
function startExperience(exp) {
  app.innerHTML = '';
  const host = el('div', 'exp');
  app.appendChild(host);
  const back = el('button', 'link-btn back-btn', t('ui.back'));
  back.onclick = showHub;
  app.appendChild(back);

  current = exp.start(host, {
    t,
    audio,
    onComplete() {
      store.recordCompletion(exp.id);
      showFeedback(exp.id, showHub);
    },
  });
}

// ── feedback (leaves 1–5 + optional words, kept in localStorage) ───
function showFeedback(expId, done) {
  if (current) { current.destroy(); current = null; }
  app.innerHTML = '';
  const box = el('div', 'panel');
  box.append(el('h2', '', t('fb.title')), el('p', '', t('fb.q')));

  let leaves = 0;
  const row = el('div', 'leaf-row');
  const btns = [];
  for (let i = 1; i <= 5; i++) {
    const b = el('button', 'leaf-btn', '🌿');
    b.onclick = () => {
      leaves = i;
      btns.forEach((x, j) => x.classList.toggle('lit', j < i));
    };
    btns.push(b);
    row.appendChild(b);
  }
  box.appendChild(row);

  const ta = document.createElement('textarea');
  ta.className = 'fb-text';
  ta.placeholder = t('fb.placeholder');
  box.appendChild(ta);

  const actions = el('div', 'exp-buttons');
  const send = el('button', 'btn', t('fb.send'));
  send.onclick = () => {
    store.recordFeedback({ id: expId, leaves, text: ta.value.trim(), lang: getLang() });
    box.innerHTML = '';
    box.appendChild(el('p', '', t('fb.thanks')));
    setTimeout(done, 900);
  };
  const skip = el('button', 'link-btn', t('fb.skip'));
  skip.onclick = done;
  actions.append(send, skip);
  box.appendChild(actions);
  app.appendChild(box);
}

// ── nature interlude overlay ───────────────────────────────────────
function showInterlude() {
  if (document.querySelector('.overlay')) return;   // hub re-renders must not stack invitations
  const pick = pickInterlude(store.getState().natureIdx);
  const ov = el('div', 'overlay');
  const box = el('div', 'panel interlude');
  box.append(
    el('h2', '', (isEvening() ? '🌙 ' : '🌾 ') + t('nat.title')),
    el('p', '', t(pick.textKey)),
  );
  if (pick.poem) {
    const po = el('div', 'poem');
    po.append(el('p', 'poem-body', t('poem.body')), el('p', 'poem-title', t('poem.title')));
    box.appendChild(po);
  }
  if (pick.artNote) box.appendChild(el('p', 'nature-note', t('nat.eve.art')));

  const actions = el('div', 'exp-buttons');
  const go = el('button', 'btn', t('nat.accept'));
  go.onclick = () => { audio.chime(); store.consumeInterlude(); ov.remove(); showHub(); };
  const later = el('button', 'link-btn', t('nat.later'));
  later.onclick = () => ov.remove();   // counter stays: the invitation returns next visit
  actions.append(go, later);
  box.appendChild(actions);
  ov.appendChild(box);
  document.body.appendChild(ov);
}

function el(tag, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// console / smoke-test handle, same convention as __dc / __hd
window.__gol = {
  store, audio,
  debug: {
    showHub, showInterlude,
    start: id => { const e = REGISTRY.find(x => x.id === id); if (e) startExperience(e); },
    setLang: l => { setLang(l); store.setLangPref(l); showHub(); },
    feedback: () => JSON.parse(store.exportFeedback()),
  },
};

document.title = t('hub.title');
document.body.style.background = PAL.BG;
showHub();
