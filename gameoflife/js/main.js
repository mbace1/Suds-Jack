// The Game of Life — hub, routing, and the rest-cycle.
// Flow: hub → experience → (occasionally: feedback) → (every 2nd finish: nature
// interlude) → hub. An address like #tether opens that experience directly.
// The hub is zen: it offers ONE experience at a time, drawn from the registry
// by the content mix (70% story / 20% game / 10% wisdom), preferring things
// not yet visited today. A quiet "something else" link redraws once per mood.
// Adding an experience = one module in js/experiences/ + one REGISTRY entry
// (with a `kind`) + its strings in i18n.js. Nothing else changes.

import { t, setLang, getLang, LANGS } from './i18n.js?v=42';
import { PAL, setAccent, accentRgb } from './palette.js?v=42';
import { setAccentAll, unwarp, liveCount } from './crt.js?v=42';
import * as store from './storage.js?v=42';
import * as crt from './crt.js?v=42';
import * as audio from './audio.js?v=42';
import { pickInterlude, isEvening, guessHemisphere } from './nature.js?v=42';
import * as outbound from './feedback.js?v=42';
import { aqueduct } from './experiences/aqueduct.js?v=42';
import { forest } from './experiences/forest.js?v=42';
import { tern } from './experiences/tern.js?v=42';
import { cup } from './experiences/cup.js?v=42';
import { hanami } from './experiences/hanami.js?v=42';
import { berry } from './experiences/berry.js?v=42';
import { stars } from './experiences/stars.js?v=42';
import { maple } from './experiences/maple.js?v=42';
import { plate } from './experiences/plate.js?v=42';
import { seam } from './experiences/seam.js?v=42';
import { dots } from './experiences/dots.js?v=42';
import { glass } from './experiences/glass.js?v=42';
import { wait } from './experiences/wait.js?v=42';
import { lichen } from './experiences/lichen.js?v=42';
import { cloud } from './experiences/cloud.js?v=42';
import { ice } from './experiences/ice.js?v=42';
import { trace } from './experiences/trace.js?v=42';
import { gears } from './experiences/gears.js?v=42';
import { cairn } from './experiences/cairn.js?v=42';
import { downhill } from './experiences/downhill.js?v=42';
import { tether } from './experiences/tether.js?v=42';
import { hedge } from './experiences/hedge.js?v=42';
import { seed } from './experiences/seed.js?v=42';
import { lightning } from './experiences/lightning.js?v=42';
import { whale } from './experiences/whale.js?v=42';
import { pando } from './experiences/pando.js?v=42';
import { murmur } from './experiences/murmur.js?v=42';
import { eel } from './experiences/eel.js?v=42';

const REGISTRY = [aqueduct, forest, tern, cup, hanami, berry, stars, maple, plate, seam, dots, glass, wait, lichen, cloud, ice, trace, gears, cairn, downhill, tether, hedge, seed, lightning, whale, pando, murmur, eel];
const KIND_WEIGHT = { story: 0.7, game: 0.2, wisdom: 0.1 };

const app = document.getElementById('app');
let current = null;    // active experience handle
let offering = null;   // the experience currently offered by the hub
let justGrew = false;  // the sound garden gained a voice on this return to the hub
let invitationPut = false;  // "not yet" holds until the next finish, not until the next repaint
let byKeyboard = false;     // the last input was a key — only then do we move focus

const stillness = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// weighted draw over the kinds actually present, preferring unvisited-today;
// `not` excludes the current offering so "something else" always changes
function drawOffering(not = null) {
  const fresh = REGISTRY.filter(e => store.timesPlayedToday(e.id) === 0 && e !== not);
  const pool = fresh.length ? fresh : REGISTRY.filter(e => e !== not);
  if (!pool.length) return not;
  let total = 0;
  const weights = pool.map(e => { const w = KIND_WEIGHT[e.kind] ?? 0.1; total += w; return w; });
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

// language: stored pref → browser hint → English. Mirror it onto <html lang>
// too, so screen readers switch voice and the browser picks the right CJK
// glyph forms for Japanese instead of guessing.
function useLang(l) { setLang(l); document.documentElement.lang = l; }
{
  const pref = store.getState().lang;
  if (pref) useLang(pref);
  else {
    const nav = (navigator.language || 'en').slice(0, 2);
    useLang(['fi', 'ja'].includes(nav) ? nav : 'en');
  }
}

// the screen's accent: one phosphor colour for the chrome, the CRT's glow and
// every interactive element inside the scenes. Applied before the first paint
// so nothing flashes cyan on the way to green.
const ACCENT_ORDER = ['cyan', 'green', 'white'];
function useAccent(a) {
  store.setAccent(a);
  setAccent(a);              // palette: chrome variables + PAL.CYAN_LUX
  setAccentAll(accentRgb()); // any screen already on the page
}
useAccent(store.getAccent());

// hemisphere: seed once from the timezone so southern visitors are not told to
// look for frost in January. It is only a guess; the hub footer can flip it.
if (!store.hemiSet()) store.setHemi(guessHemisphere());

// the remembered mute has to be in force before the first note can play
audio.setMuted(!store.soundOn());

// whether the picture is shown through the curved screen at all. Set before
// anything builds a PixelScreen; toggling re-renders, which rebuilds them.
crt.setEnabled(store.crtOn());
document.addEventListener('pointerdown', audio.init, { once: true });
document.addEventListener('keydown', e => {
  if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') byKeyboard = true;
}, true);
document.addEventListener('pointerdown', () => { byKeyboard = false; }, true);

// after a view swap the old focus is gone and Tab restarts from the top of the
// page. Put the keyboard back on the thing you came here to press — but only
// for keyboard users, so a tap never raises a focus ring out of nowhere.
function focusPrimary(scope) {
  if (!byKeyboard) return;
  const b = scope.querySelector('.btn') || scope.querySelector('button');
  if (b) b.focus({ preventScroll: true });
}

// ── hub ────────────────────────────────────────────────────────────
// A ship's terminal, not a menu: a title, a rule, one offering behind a caret,
// and a status line. Everything decorative is gone — no sky, no cards, no
// chrome that is not either the offering or a switch someone might need.
function showHub() {
  if (current) { current.destroy(); current = null; }
  app.innerHTML = '';
  setHash('');   // the hub is the plain address; only an experience deep-links
  document.title = t('hub.title');

  const newcomer = store.getState().completions.length < 2;
  const resting = store.interludeDue();

  const header = el('header', 'hub-header');
  header.appendChild(el('h1', '', t('hub.title')));
  // one dim line of orientation for a first-timer; returners get the quiet
  if (newcomer) header.appendChild(el('p', 'tagline', t('hub.tagline')));
  app.appendChild(header);
  app.appendChild(el('div', 'rule'));

  // one offering, not a menu
  if (!offering) offering = drawOffering();
  const exp = offering;
  const card = el('div', 'offer');
  const name = el('p', 'offer-name');
  name.append(el('span', 'caret', '>'), document.createTextNode(t(`exp.${exp.id}.name`)));
  card.append(name, el('p', 'offer-kind', t(`kind.${exp.kind}`)));
  if (store.timesPlayedToday(exp.id) > 0) card.appendChild(el('p', 'played-note', `· ${t('hub.done.today')}`));

  const acts = el('div', 'exp-buttons');
  const b = el('button', 'btn', `[ ${store.timesPlayed(exp.id) ? t('hub.again') : t('hub.play')} ]`);
  b.onclick = () => startExperience(exp);
  acts.appendChild(b);
  card.appendChild(acts);

  if (REGISTRY.length > 1) {
    const other = el('button', 'link-btn another-btn', `${t('hub.another')}...`);
    other.onclick = () => { audio.step(); offering = drawOffering(exp); showHub(); };
    card.appendChild(other);
  }
  app.appendChild(card);

  // the explanatory hint fades once the rhythm is known — less text, more zen
  if (resting) app.appendChild(el('p', 'cycle-hint', t('hub.rested')));
  else if (newcomer) app.appendChild(el('p', 'cycle-hint', t('hub.cycle.hint')));

  app.appendChild(el('div', 'rule'));

  // ── the status line: every set-once switch, in one terminal readout ──
  const footer = el('div', 'hub-footer');

  const optRow = (cls, label, items) => {
    const row = el('div', 'lang-row opt-row ' + cls);
    if (label) row.appendChild(el('span', 'hemi-label', `${label}:`));
    for (const it of items) {
      const btn = el('button', 'lang-btn' + (it.on ? ' active' : ''), it.text);
      if (it.aria) btn.setAttribute('aria-label', it.aria);
      btn.setAttribute('aria-pressed', String(!!it.on));
      btn.onclick = it.act;
      row.appendChild(btn);
    }
    return row;
  };

  const top = el('div', 'status');
  // languages by their own codes — this is a terminal, and 'fi en ja' is how a
  // terminal would say it. The full name stays as the accessible name.
  top.appendChild(optRow('', '', LANGS.map(({ code, label }) => ({
    text: code, aria: label, on: getLang() === code,
    act: () => { useLang(code); store.setLangPref(code); showHub(); },
  }))));
  top.appendChild(optRow('accent-row', t('acc.label'), ACCENT_ORDER.map(a => ({
    text: t(`acc.${a}`), on: store.getAccent() === a,
    act: () => { useAccent(a); showHub(); },
  }))));
  // the screen itself, switchable — it is a filter over 1px dithered art, and
  // some scenes (whale, ice, seam, lichen, eel) are cleaner without it
  top.appendChild(optRow('crt-row', t('crt.label'), [true, false].map(on => ({
    text: t(on ? 'crt.on' : 'crt.off'), on: store.crtOn() === on,
    act: () => { store.setCrtOn(on); crt.setEnabled(on); audio.step(); showHub(); },
  }))));
  footer.appendChild(top);

  const bottom = el('div', 'status');
  bottom.appendChild(optRow('sound-row', t('snd.label'), [true, false].map(on => ({
    text: t(on ? 'snd.on' : 'snd.off'), on: store.soundOn() === on,
    act: () => {
      store.setSoundOn(on);
      audio.init();                 // this click is the gesture that unlocks audio
      audio.setMuted(!on);
      if (on) audio.step();         // let them hear that it came back
      showHub();
    },
  }))));
  // which hemisphere's seasons the invitations follow — set once, then forgotten
  bottom.appendChild(optRow('hemi-row', t('hemi.label'), ['n', 's'].map(h => ({
    text: t(`hemi.${h}`), on: store.getHemi() === h,
    act: () => { store.setHemi(h); showHub(); },
  }))));
  footer.appendChild(bottom);

  // the sound garden: one voice per invitation actually accepted. Shown as
  // glyphs so it needs no plural rules, and only once there is something to show.
  const voices = store.gardenVoices();
  if (voices > 0) {
    const filled = '♪ '.repeat(voices).trim();
    const rest = ' ·'.repeat(audio.gardenMax() - voices);
    const g = el('p', 'garden-note', `${filled}${rest}`);
    g.setAttribute('aria-label', `${t('gd.label')}: ${voices}/${audio.gardenMax()}`);
    if (justGrew) g.classList.add('grew');
    footer.appendChild(g);
    if (justGrew) footer.appendChild(el('p', 'garden-grew', t(store.gardenFull() ? 'gd.full' : 'gd.grew')));
  }
  justGrew = false;

  const fb = el('button', 'link-btn footer-link', t('hub.feedback'));
  fb.onclick = () => showFeedback('hub', showHub);
  footer.appendChild(fb);
  app.appendChild(footer);

  // the ambient bed plays on the hub only — it is the reward for going outside
  audio.gardenStart(voices);
  focusPrimary(card);

  // the cycle: if two experiences have been finished, the hub opens
  // straight onto the invitation before anything else can be played.
  // "Not yet" means not this visit — a language switch or a redraw must not
  // put the same invitation back in your face.
  if (resting && !invitationPut) showInterlude();
}

// ── experience routing ─────────────────────────────────────────────
function startExperience(exp) {
  // never leave the previous experience's raf loop running against a detached
  // canvas — the hub normally destroys it on the way through, but going straight
  // from one experience to another (as __gol.debug.start does) would leak a loop
  if (current) { current.destroy(); current = null; }
  audio.gardenStop();          // the garden belongs to the hub, not to play
  app.innerHTML = '';
  const host = el('div', 'exp');
  app.appendChild(host);
  const back = el('button', 'link-btn back-btn', `< ${t('ui.back')}`);
  back.onclick = showHub;
  app.appendChild(back);
  setHash(exp.id);       // so the address bar is worth sharing

  // the tab (and the history entry behind a shared link) should say which one
  document.title = `${t(`exp.${exp.id}.name`)} — ${t('hub.title')}`;

  current = exp.start(host, {
    t,
    audio,
    onComplete() {
      store.recordCompletion(exp.id);
      offering = null;          // the hub offers something fresh next time
      invitationPut = false;    // a new finish earns a fresh invitation
      // asked occasionally, not every time — see store.feedbackDue()
      if (store.feedbackDue()) showFeedback(exp.id, showHub);
      else showHub();
    },
  });

  // every experience builds its own .exp-text, so mark it here rather than in
  // 22 modules: it is where each new beat of the story appears, and without a
  // live region a screen reader is never told the page said something new
  const said = host.querySelector('.exp-text');
  if (said) { said.setAttribute('aria-live', 'polite'); said.setAttribute('aria-atomic', 'true'); }
  focusPrimary(host);
}

// one experience per address: /gameoflife/#tether opens it directly, which is
// what makes a link worth sending to someone. replaceState, not push — the
// back button should still leave the page rather than walk a fake history.
function setHash(id) {
  const url = location.pathname + location.search + (id ? `#${id}` : '');
  try { history.replaceState(null, '', url); } catch { /* file:// etc. */ }
}

// a fragment can also arrive without a reload — pasted into an already-open
// tab, or reached with the back button. setHash uses replaceState, which does
// not fire this event, so there is no loop between the two.
window.addEventListener('hashchange', () => { if (!openFromHash()) showHub(); });

function openFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  const exp = id && REGISTRY.find(e => e.id === id);
  if (!exp) return false;
  startExperience(exp);
  return true;
}

// ── feedback (leaves 1–5 + optional words, kept in localStorage) ───
function showFeedback(expId, done) {
  if (current) { current.destroy(); current = null; }
  audio.gardenStop();
  app.innerHTML = '';
  const box = el('div', 'panel');
  box.append(el('h2', '', t('fb.title')), el('p', '', t('fb.q')));

  let leaves = 0;
  const row = el('div', 'leaf-row');
  const btns = [];
  for (let i = 1; i <= 5; i++) {
    const b = el('button', 'leaf-btn', '🌿');
    // five identical leaf glyphs are meaningless to a screen reader, so each
    // one says which rating it is
    b.setAttribute('aria-label', `${i} / 5 ${t('fb.leaves')}`);
    b.onclick = () => {
      leaves = i;
      btns.forEach((x, j) => {
        x.classList.toggle('lit', j < i);
        x.setAttribute('aria-pressed', String(j < i));
      });
    };
    btns.push(b);
    row.appendChild(b);
  }
  box.appendChild(row);

  const ta = document.createElement('textarea');
  ta.className = 'fb-text';
  ta.placeholder = t('fb.placeholder');
  box.appendChild(ta);

  // say where it goes before it goes — but only when it actually goes anywhere
  if (outbound.configured()) box.appendChild(el('p', 'fb-dest', t('fb.dest')));

  const actions = el('div', 'exp-buttons');
  const send = el('button', 'btn', t('fb.send'));
  send.onclick = async () => {
    const text = ta.value.trim();
    // pressing "leave it" having said nothing used to store an empty entry and
    // thank you for it — that is a lie to the player and noise in the data
    if (!leaves && !text) { done(); return; }
    const entry = { id: expId, leaves, text, lang: getLang(), ts: Date.now() };
    store.recordFeedback(entry);          // the local record, kept regardless
    box.innerHTML = '';
    box.appendChild(el('p', '', t('fb.sending')));
    // 'sent' | 'queued' (endpoint unreachable — kept for the next visit) |
    // 'off' (no endpoint configured, so nothing was promised)
    const how = await outbound.send(entry);
    box.innerHTML = '';
    box.appendChild(el('p', '', t(how === 'queued' ? 'fb.queued' : 'fb.thanks')));
    setTimeout(done, how === 'queued' ? 1600 : 900);
  };
  const skip = el('button', 'link-btn', t('fb.skip'));
  skip.onclick = done;
  actions.append(send, skip);
  box.appendChild(actions);
  app.appendChild(box);
  focusPrimary(row);
}

// ── nature interlude overlay ───────────────────────────────────────
function showInterlude() {
  if (document.querySelector('.overlay')) return;   // hub re-renders must not stack invitations
  const pick = pickInterlude(store.getState().natureIdx, new Date(), store.getHemi());
  const ov = el('div', 'overlay');
  const box = el('div', 'panel interlude');
  box.append(
    el('h2', '', (isEvening() ? '🌙 ' : '🌾 ') + t('nat.title')),
    el('p', '', t(pick.textKey)),
  );
  if (pick.poem) {
    const po = el('div', 'poem');
    const body = pick.poem.body[getLang()] ?? pick.poem.body.en;
    po.append(
      el('p', 'poem-body', body),
      el('p', 'poem-title', `— ${pick.poem.author}, ${pick.poem.year}`),
    );
    box.appendChild(po);
  }
  if (pick.artNote) box.appendChild(el('p', 'nature-note', t('nat.eve.art')));

  const actions = el('div', 'exp-buttons');
  const go = el('button', 'btn', t('nat.accept'));
  // accepting is the only thing that grows the sound garden
  go.onclick = () => { audio.chime(); store.consumeInterlude(); justGrew = true; close(); showHub(); };
  const later = el('button', 'link-btn', t('nat.later'));
  // counter stays, so the invitation returns after the next finish — but not
  // again during this visit
  later.onclick = () => { invitationPut = true; close(); };
  actions.append(go, later);
  box.appendChild(actions);
  ov.appendChild(box);

  // a modal should close the ways a modal closes: Esc, or the dark outside it
  function onKey(e) { if (e.key === 'Escape') later.onclick(); }
  function close() { document.removeEventListener('keydown', onKey); ov.remove(); }
  document.addEventListener('keydown', onKey);
  ov.onpointerdown = e => { if (e.target === ov) later.onclick(); };

  document.body.appendChild(ov);
  focusPrimary(actions);
}

function el(tag, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

// console / smoke-test handle, same convention as __dc / __hd
window.__gol = {
  store, audio, outbound,
  debug: {
    showHub, showInterlude, t,
    // what the hub can actually offer — the testing loop walks this, so a new
    // experience cannot reach a player without its strings and its intro
    // the roster, so tests cover whatever is registered rather than a list
    // someone has to remember to update. Entries carry their kind too; the
    // walk in smoke.cjs reads `.id`, the catalogue gate reads both.
    ids: () => REGISTRY.map(e => ({ id: e.id, kind: e.kind })),
    start: id => { const e = REGISTRY.find(x => x.id === id); if (e) startExperience(e); },
    setLang: l => { useLang(l); store.setLangPref(l); showHub(); },
    feedback: () => JSON.parse(store.exportFeedback()),
    outbox: () => store.outbox(),
    setEndpoint: u => outbound.setEndpoint(u),
    setAccent: a => { useAccent(a); showHub(); },
    // picture coords (0..1) -> where they land on the curved glass; the test
    // loop taps by what a scene drew, not by where the CRT put it
    unwarp,
    getAccent: () => store.getAccent(),
    // what the scenes are drawing their live elements with, right now
    accentInScene: () => PAL.CYAN_LUX,
    screensLive: liveCount,
    flush: () => outbound.flush(),
  },
};

// anything written while the endpoint was unreachable goes out now, quietly
outbound.flush();

document.title = t('hub.title');
// a shared link lands on the thing it names; everything else opens the hub
if (!openFromHash()) showHub();
