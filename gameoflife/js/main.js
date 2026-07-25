// The Game of Life — hub, routing, and the rest-cycle.
// Flow: hub → experience → (occasionally: feedback) → (every 2nd finish: nature
// interlude) → hub. An address like #tether opens that experience directly.
// The hub is zen: it offers ONE experience at a time, drawn from the registry
// by the content mix (70% story / 20% game / 10% wisdom), preferring things
// not yet visited today. A quiet "something else" link redraws once per mood.
// Adding an experience = one module in js/experiences/ + one REGISTRY entry
// (with a `kind`) + its strings in i18n.js. Nothing else changes.

import { t, setLang, getLang, LANGS } from './i18n.js?v=36';
import { PAL } from './palette.js?v=36';
import { PixelScreen, shade } from './pixel.js?v=36';
import * as store from './storage.js?v=36';
import * as audio from './audio.js?v=36';
import { pickInterlude, isEvening, guessHemisphere } from './nature.js?v=36';
import * as outbound from './feedback.js?v=36';
import { aqueduct } from './experiences/aqueduct.js?v=36';
import { forest } from './experiences/forest.js?v=36';
import { tern } from './experiences/tern.js?v=36';
import { cup } from './experiences/cup.js?v=36';
import { hanami } from './experiences/hanami.js?v=36';
import { berry } from './experiences/berry.js?v=36';
import { stars } from './experiences/stars.js?v=36';
import { maple } from './experiences/maple.js?v=36';
import { plate } from './experiences/plate.js?v=36';
import { seam } from './experiences/seam.js?v=36';
import { dots } from './experiences/dots.js?v=36';
import { glass } from './experiences/glass.js?v=36';
import { wait } from './experiences/wait.js?v=36';
import { lichen } from './experiences/lichen.js?v=36';
import { cloud } from './experiences/cloud.js?v=36';
import { ice } from './experiences/ice.js?v=36';
import { trace } from './experiences/trace.js?v=36';
import { gears } from './experiences/gears.js?v=36';
import { cairn } from './experiences/cairn.js?v=36';
import { downhill } from './experiences/downhill.js?v=36';
import { tether } from './experiences/tether.js?v=36';
import { hedge } from './experiences/hedge.js?v=36';

const REGISTRY = [aqueduct, forest, tern, cup, hanami, berry, stars, maple, plate, seam, dots, glass, wait, lichen, cloud, ice, trace, gears, cairn, downhill, tether, hedge];
const KIND_WEIGHT = { story: 0.7, game: 0.2, wisdom: 0.1 };

const app = document.getElementById('app');
let current = null;    // active experience handle
let offering = null;   // the experience currently offered by the hub
let hubScene = null;   // the living header scene's raf handle
let justGrew = false;  // the sound garden gained a voice on this return to the hub
let invitationPut = false;  // "not yet" holds until the next finish, not until the next repaint
let byKeyboard = false;     // the last input was a key — only then do we move focus

// ── the living header: a quiet pixel sky that follows the hour ─────
function startHubScene(parent) {
  const scr = new PixelScreen(parent, 192, 44);
  scr.canvas.classList.add('hub-canvas');
  let raf = 0, dead = false;

  function draw(now) {
    if (dead) return;
    const slot = daySlot();
    const W = scr.w, H = scr.h;
    if (slot === 'morning') {
      scr.bands(0, 0, W, H, [PAL.SKY_DAWN_TOP, '#8a6a80', '#c98f7a', PAL.SKY_DAWN_LOW]);
      scr.disc(148, 34, 8, PAL.EMBER);                    // ember halo behind the sun
      scr.disc(148, 34, 7, PAL.SUN, PAL.EMBER);           // sun climbing, warm rim
      scr.px(0, 26 + Math.sin(now / 1600) * 2, 60, 2, '#d9b49a');   // low mist
      scr.px(90, 20, 30, 1, '#c9a48a');
    } else if (slot === 'day') {
      scr.bands(0, 0, W, H, [PAL.SKY_DAY_TOP, '#93bfdd', '#a9cde2', PAL.SKY_DAY_LOW]);
      scr.disc(96, 12, 7, PAL.SUN, true);                 // sun high, crisp rim
      const cx = (now / 300) % (W + 40) - 20;             // one slow cloud
      scr.rect(cx, 18, 22, 4, '#e8f2f4', shade('#e8f2f4', 0.86));
      scr.px(cx + 5, 15, 12, 3, '#e8f2f4');
    } else if (slot === 'evening') {
      scr.bands(0, 0, W, H, [PAL.SKY_DUSK_TOP, '#5a4258', '#8a5d6d', PAL.SKY_DUSK_LOW]);
      scr.disc(36, 33, 8, PAL.EMBER);                     // the sinking sun's ember bleed
      scr.disc(36, 32, 7, '#e8a86c', PAL.DANGER);         // sun going down
      scr.px(80, 16, 30, 2, '#7a5468');                   // dusk bar cloud
    } else {
      scr.bands(0, 0, W, H, ['#0a0c18', '#0e1220', '#131828', '#181e30']);
      scr.disc(150, 12, 5, PAL.PAPER_DIM, true);          // moon, crisp rim
      scr.px(147, 9, 4, 4, '#181e30');                    // its crescent bite
      const tw = Math.floor(now / 450) % 2 === 0;
      for (let i = 0; i < 12; i++) {                      // twinkling field
        const x = (i * 31 + 9) % 188, y = (i * 17 + 3) % 30;
        if (i % 3 !== (tw ? 0 : 1)) scr.px(x, y, 1, 1, '#8a90a8');
      }
      // a tiny Otava, for those who played The Night Compass
      for (const [x, y] of [[18, 22], [24, 19], [30, 18], [35, 20], [36, 26], [44, 27], [43, 20]]) scr.px(x, y, 1, 1, PAL.FOAM);
    }
    // the constant: a dark treeline that belongs to every hour
    for (let x = 0; x < W; x += 8) {
      const h = 4 + ((x * 7) % 7);
      scr.px(x, H - h, 8, h, slot === 'night' ? '#05060c' : PAL.MOSS_DEEP);
      scr.px(x + 3, H - h - 3, 2, 3, slot === 'night' ? '#05060c' : PAL.MOSS_DEEP);
    }
    // the header is decoration, not content — for anyone who has asked the
    // system for less motion, paint the hour once and hold it there. (The
    // experiences keep animating: there the movement IS the thing.)
    if (!stillness()) raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  return { destroy() { dead = true; cancelAnimationFrame(raf); scr.destroy(); } };
}

const stillness = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function stopHubScene() { if (hubScene) { hubScene.destroy(); hubScene = null; } }

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

// hemisphere: seed once from the timezone so southern visitors are not told to
// look for frost in January. It is only a guess; the hub footer can flip it.
if (!store.hemiSet()) store.setHemi(guessHemisphere());

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
function showHub() {
  if (current) { current.destroy(); current = null; }
  stopHubScene();
  app.innerHTML = '';
  setHash('');   // the hub is the plain address; only an experience deep-links
  document.title = t('hub.title');

  const newcomer = store.getState().completions.length < 2;

  const header = el('header', 'hub-header');
  const sceneWrap = el('div', 'hub-scene');
  hubScene = startHubScene(sceneWrap);
  header.append(sceneWrap, el('h1', '', t('hub.title')));
  // the tagline only greets newcomers — returning visitors keep the quiet
  if (newcomer) header.appendChild(el('p', 'tagline', t('hub.tagline')));
  header.appendChild(el('p', 'greet', t(`hub.greet.${daySlot()}`)));
  app.appendChild(header);

  const resting = store.interludeDue();

  // the cycle, made visible: two breaths of play, then a rest
  const dots = el('div', 'cycle-dots');
  const done = Math.min(2, store.getState().sinceInterlude);
  for (let i = 0; i < 2; i++) dots.appendChild(el('span', 'dot' + (i < done ? ' full' : '')));
  dots.appendChild(el('span', 'dot rest' + (resting ? ' full' : ''), '~'));
  app.appendChild(dots);

  // one offering, not a menu
  if (!offering) offering = drawOffering();
  const exp = offering;
  const card = el('div', 'card offering');
  card.append(
    el('p', 'offer-note', `${t('hub.offer')} · ${t(`kind.${exp.kind}`)}`),
    el('h2', '', t(`exp.${exp.id}.name`)),
    el('p', '', t(`exp.${exp.id}.desc`)),
  );
  if (store.timesPlayedToday(exp.id) > 0) card.appendChild(el('p', 'played-note', `✓ ${t('hub.done.today')}`));
  const b = el('button', 'btn', store.timesPlayed(exp.id) ? t('hub.again') : t('hub.play'));
  b.onclick = () => startExperience(exp);
  card.appendChild(b);
  app.appendChild(card);

  if (REGISTRY.length > 1) {
    const other = el('button', 'link-btn another-btn', t('hub.another'));
    other.onclick = () => { audio.step(); offering = drawOffering(exp); showHub(); };
    app.appendChild(other);
  }

  // the explanatory hint fades once the rhythm is known — less text, more zen
  if (resting) app.appendChild(el('p', 'cycle-hint', t('hub.rested')));
  else if (newcomer) app.appendChild(el('p', 'cycle-hint', t('hub.cycle.hint')));

  // a single quiet footer carries the set-once controls (language, feedback)
  // out of the main column, so the offering stays the one thing in focus
  const footer = el('div', 'hub-footer');
  const langRow = el('div', 'lang-row');
  for (const { code, label } of LANGS) {
    const b = el('button', 'lang-btn' + (getLang() === code ? ' active' : ''), label);
    b.onclick = () => { useLang(code); store.setLangPref(code); showHub(); };
    langRow.appendChild(b);
  }
  // the sound garden: one voice per invitation actually accepted. Shown as
  // glyphs so it needs no plural rules, and only once there is something to show.
  const voices = store.gardenVoices();
  if (voices > 0) {
    const filled = '♪ '.repeat(voices).trim();
    const rest = ' ·'.repeat(audio.gardenMax() - voices);
    const g = el('p', 'garden-note', `${t('gd.label')}  ${filled}${rest}`);
    if (justGrew) g.classList.add('grew');
    footer.appendChild(g);
    if (justGrew) footer.appendChild(el('p', 'garden-grew', t(store.gardenFull() ? 'gd.full' : 'gd.grew')));
  }
  justGrew = false;

  footer.appendChild(langRow);

  // which hemisphere's seasons the invitations follow — set once, then forgotten
  const hemiRow = el('div', 'lang-row hemi-row');
  hemiRow.appendChild(el('span', 'hemi-label', t('hemi.label')));
  for (const h of ['n', 's']) {
    const b = el('button', 'lang-btn' + (store.getHemi() === h ? ' active' : ''), t(`hemi.${h}`));
    b.onclick = () => { store.setHemi(h); showHub(); };
    hemiRow.appendChild(b);
  }
  footer.appendChild(hemiRow);

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
  stopHubScene();
  audio.gardenStop();          // the garden belongs to the hub, not to play
  app.innerHTML = '';
  const host = el('div', 'exp');
  app.appendChild(host);
  const back = el('button', 'link-btn back-btn', t('ui.back'));
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
  stopHubScene();
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

// the hub's mood follows the hour, like the invitations do
function daySlot(h = new Date().getHours()) {
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
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
    showHub, showInterlude,
    start: id => { const e = REGISTRY.find(x => x.id === id); if (e) startExperience(e); },
    setLang: l => { useLang(l); store.setLangPref(l); showHub(); },
    feedback: () => JSON.parse(store.exportFeedback()),
    outbox: () => store.outbox(),
    setEndpoint: u => outbound.setEndpoint(u),
    flush: () => outbound.flush(),
  },
};

// anything written while the endpoint was unreachable goes out now, quietly
outbound.flush();

document.title = t('hub.title');
document.body.style.background = PAL.BG;
// a shared link lands on the thing it names; everything else opens the hub
if (!openFromHash()) showHub();
