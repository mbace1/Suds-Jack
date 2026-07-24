// The Game of Life — hub, routing, and the rest-cycle.
// Flow: hub → experience → feedback → (every 2nd finish: nature interlude) → hub.
// The hub is zen: it offers ONE experience at a time, drawn from the registry
// by the content mix (70% story / 20% game / 10% wisdom), preferring things
// not yet visited today. A quiet "something else" link redraws once per mood.
// Adding an experience = one module in js/experiences/ + one REGISTRY entry
// (with a `kind`) + its strings in i18n.js. Nothing else changes.

import { t, setLang, getLang, LANGS } from './i18n.js?v=19';
import { PAL } from './palette.js?v=19';
import { PixelScreen, shade } from './pixel.js?v=19';
import * as store from './storage.js?v=19';
import * as audio from './audio.js?v=19';
import { pickInterlude, isEvening } from './nature.js?v=19';
import { aqueduct } from './experiences/aqueduct.js?v=19';
import { forest } from './experiences/forest.js?v=19';
import { tern } from './experiences/tern.js?v=19';
import { cup } from './experiences/cup.js?v=19';
import { hanami } from './experiences/hanami.js?v=19';
import { berry } from './experiences/berry.js?v=19';
import { stars } from './experiences/stars.js?v=19';
import { maple } from './experiences/maple.js?v=19';
import { plate } from './experiences/plate.js?v=19';
import { seam } from './experiences/seam.js?v=19';
import { dots } from './experiences/dots.js?v=19';
import { glass } from './experiences/glass.js?v=19';
import { wait } from './experiences/wait.js?v=19';
import { lichen } from './experiences/lichen.js?v=19';
import { cloud } from './experiences/cloud.js?v=19';

const REGISTRY = [aqueduct, forest, tern, cup, hanami, berry, stars, maple, plate, seam, dots, glass, wait, lichen, cloud];
const KIND_WEIGHT = { story: 0.7, game: 0.2, wisdom: 0.1 };

const app = document.getElementById('app');
let current = null;    // active experience handle
let offering = null;   // the experience currently offered by the hub
let hubScene = null;   // the living header scene's raf handle

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
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  return { destroy() { dead = true; cancelAnimationFrame(raf); scr.destroy(); } };
}

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
  stopHubScene();
  app.innerHTML = '';

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
    b.onclick = () => { setLang(code); store.setLangPref(code); showHub(); };
    langRow.appendChild(b);
  }
  footer.appendChild(langRow);
  const fb = el('button', 'link-btn footer-link', t('hub.feedback'));
  fb.onclick = () => showFeedback('hub', showHub);
  footer.appendChild(fb);
  app.appendChild(footer);

  // the cycle: if two experiences have been finished, the hub opens
  // straight onto the invitation before anything else can be played
  if (resting) showInterlude();
}

// ── experience routing ─────────────────────────────────────────────
function startExperience(exp) {
  stopHubScene();
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
      offering = null;   // the hub offers something fresh next time
      showFeedback(exp.id, showHub);
    },
  });
}

// ── feedback (leaves 1–5 + optional words, kept in localStorage) ───
function showFeedback(expId, done) {
  if (current) { current.destroy(); current = null; }
  stopHubScene();
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
  go.onclick = () => { audio.chime(); store.consumeInterlude(); ov.remove(); showHub(); };
  const later = el('button', 'link-btn', t('nat.later'));
  later.onclick = () => ov.remove();   // counter stays: the invitation returns next visit
  actions.append(go, later);
  box.appendChild(actions);
  ov.appendChild(box);
  document.body.appendChild(ov);
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
