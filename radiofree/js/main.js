// Radio Free Helsinki — the receiver.

import { PAL, SECTOR_COLOR } from './palette.js?v=43';
import { Post, Reader } from './codec.js?v=43';
import { Package } from './package.js?v=43';
import { SECTORS, STORIES, COPY, ARCHIVED, EPISODES, EPISODE, storyCopy, storyBroadcast,
         parseLine, loadWire, WIRE_INFO } from './stories.js?v=43';
import { t, getLang, setLang, initLang, nextLang, formatDate, LANGS } from './i18n.js?v=43';
import * as audio from './audio.js?v=43';
import { PixelScreen } from './screen.js?v=43';
import { BROLL_KEYS } from './visuals.js?v=43';
import { drawPlate, PLATE_W, PLATE_H } from './plates.js?v=43';
import { drawHead } from '../../toko/js/face.js';
import { TOKO } from '../../toko/js/palette.js';

// DECODE IS GONE. It was the app's second layer — a button that struck the
// broadcast wording through and grew a plain reading beside it, plus a drawer
// naming the technique and a sign-off that handed them all back. Owner's call,
// 2026-08-08: the station is a news feed, not a lesson.
//
// What that removed, so nobody goes looking: the rail button, the decode box,
// the technique/tell drawer, the sign-off tally, the amber "the spin is
// showing" vocabulary, the story panels that mutated under it, and `?clean` —
// which only existed to render a bulletin WITHOUT the layer, and is now the
// only way anything renders. Wires may still carry `{{spun|plain}}` markup and
// technique/tell fields; they are stripped and ignored.
const PARAMS = new URLSearchParams(location.search);
// VERTICAL — the clip framing. The app is already 9:16, so this is not a
// second layout: it is the same one with the furniture taken out (masthead,
// rail, hub button, signature badge) so a recording carries the broadcast and
// nothing that belongs to a website. It is SEPARATE from ?clean on purpose —
const VERTICAL = PARAMS.has('vertical');
if (VERTICAL) document.documentElement.classList.add('vertical');
// which morning's broadcast to play. An unknown or absent date plays the
// newest — see loadWire's ladder.
const WANT_DATE = PARAMS.get('date');

const $ = id => document.getElementById(id);
const app = $('app'), gate = $('gate'), feed = $('feed');

let posts = [];
let active = -1;
let reader = null;
let raf = 0, last = performance.now();
let booted = false;

initLang();

{
  const c = gate.querySelector('.noise');
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  let gt = 0;
  (function fuzz() {
    if (gate.classList.contains('gone')) return;
    gt += 1;
    g.fillStyle = PAL.VOID;
    g.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x += 2) {
        if (Math.random() < 0.10) {
          g.fillStyle = Math.random() < 0.3 ? PAL.GREEN_LO : PAL.STATIC;
          g.fillRect(x, y, 2, 1);
        }
      }
    }
    g.fillStyle = PAL.GREEN_DIM;
    for (let x = 0; x < c.width; x++) {
      const v = Math.sin((x + gt) * 0.19) * Math.sin(gt * 0.03) * 6;
      g.fillRect(x, c.height / 2 + v, 1, 1);
    }
    requestAnimationFrame(fuzz);
  })();
}

function el(tag, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function paintGateLang() {
  $('gateBlurb').textContent = t('gate.blurb');
  $('gateFiction').textContent = t('gate.fiction');
  $('tuneIn').textContent = t('gate.btn');
  for (const b of gate.querySelectorAll('.gate-lang button')) {
    b.classList.toggle('active', b.dataset.lang === getLang());
    b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  }
}

function paintMastLang() {
  const b = $('lang');
  b.textContent = LANGS.find(l => l.code === getLang()).label;
  b.setAttribute('aria-label', t('a11y.lang'));
  $('chDown').setAttribute('aria-label', t('a11y.prevChannel'));
  $('chUp').setAttribute('aria-label', t('a11y.nextChannel'));
  $('sound').setAttribute('aria-label', t('a11y.sound'));
}

function useLang(code) {
  setLang(code);
  paintGateLang();
  if (!booted) return;
  paintMastLang();
  rebuildFeed();
}

{
  const row = el('div', 'gate-lang');
  for (const l of LANGS) {
    const b = el('button', '', l.label);
    b.dataset.lang = l.code;
    b.onclick = () => useLang(l.code);
    row.appendChild(b);
  }
  gate.appendChild(row);
  paintGateLang();
}

const SOUND_KEY = 'rfhSound';
let soundOn = localStorage.getItem(SOUND_KEY) !== '0';

function paintSound() {
  const b = $('sound');
  b.textContent = soundOn ? '♪' : '♪̸';
  b.setAttribute('aria-pressed', String(soundOn));
}

$('sound').onclick = () => {
  soundOn = !soundOn;
  localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0');
  audio.setMuted(!soundOn);
  paintSound();
  if (soundOn) audio.blip(1);
};

let tuning = false;
$('tuneIn').onclick = async () => {
  // idempotent: vertical tunes itself in, and the console handle and the gate
  // both press this button. A second run would fetch the wire again and build
  // a second feed on top of the first.
  if (tuning || booted) return;
  tuning = true;
  audio.init();
  audio.setMuted(!soundOn);
  audio.ring();
  gate.classList.add('gone');
  app.hidden = false;
  setTimeout(() => { audio.connect(); audio.carrierStart(); }, 780);
  // The wire is fetched now, so tuning in is genuinely tuning in. loadWire()
  // always resolves — with the day's bulletins or with the off-air post — so
  // there is no branch here where the feed never appears.
  await loadWire(WANT_DATE);
  boot();
};

// A recording starts when the browser context does and cannot be trimmed
// afterwards, so the tune-in card would be the first two seconds of every
// clip — the station's front door, in a video that is not the station. In
// clip framing the receiver is already on.
if (VERTICAL) $('tuneIn').click();

// The archive. A native <select> on purpose: it is one element, it is
// keyboard- and screen-reader-correct without a line of ARIA, and on a phone it
// opens the platform's own picker instead of a list this app would have to
// re-implement badly. Hidden entirely when there is only one morning to pick.
function buildArchive() {
  const host = $('archive');
  if (!host) return;
  host.innerHTML = '';
  if (VERTICAL || EPISODES.length < 2) { host.hidden = true; return; }
  host.hidden = false;
  const sel = el('select', 'archive-sel');
  sel.setAttribute('aria-label', t('a11y.archive'));
  for (const d of EPISODES) {
    const o = document.createElement('option');
    o.value = d;
    o.textContent = formatDate(new Date(d + 'T00:00:00'));
    if (d === EPISODE) o.selected = true;
    sel.appendChild(o);
  }
  // a different morning is a different broadcast, so it is a navigation, not a
  // re-render — the scroll and the audio reset with it
  sel.onchange = () => {
    const u = new URL(location.href);
    u.searchParams.set('date', sel.value);
    u.hash = '';
    location.assign(u.toString());
  };
  host.appendChild(sel);
}

// A small Toko, drawn rather than written: `drawHead` is the one measured
// geometry (`toko/js/face.js`) and a second copy of it here would drift.
function parodyMark() {
  const wrap = el('div', 'parody');
  wrap.title = t('parody');
  wrap.setAttribute('aria-label', t('parody'));
  const cv = document.createElement('canvas');
  const S = 40, dpr = Math.min(3, window.devicePixelRatio || 1);
  cv.width = S * dpr; cv.height = S * dpr;
  cv.style.width = S + 'px'; cv.style.height = S + 'px';
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  drawHead(c, 2, 3, S - 4, { ground: TOKO.MAGENTA, ink: TOKO.PAPER });
  wrap.appendChild(cv);
  wrap.appendChild(el('span', 'parody-lbl', t('parody')));
  return wrap;
}

function boot() {
  booted = true;
  paintSound();
  paintMastLang();
  buildArchive();
  $('lang').onclick = () => useLang(nextLang());
  // TYPEWRITER OFF. The copy is set, not typed, and the per-character blips
  // are silenced with it — owner's call, the bulletins read better as text
  // than as an effect. The carrier hiss and the decode sting stay.
  //
  // Worth knowing before turning it back on: the Reader's per-character
  // amplitude is what drove Toko's lip-sync. Nothing depends on it today
  // because the anchor is not in frame — the post is full-bleed footage — but
  // if Toko returns in a scene, the mouth needs that value coming again or the
  // face sits dead.
  reader = new Reader(() => {});
  buildFeed();
  watchScroll();
  bindControls();
  const deep = indexFromHash();
  if (deep > 0) scrollToPost(deep, true);
  else setActive(0, true);
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

function buildFeed() {
  const date = formatDate(new Date());
  const pad = n => String(n).padStart(2, '0');
  feed.innerHTML = '';
  posts = [];

  STORIES.forEach((story, i) => {
    const sector = SECTORS.find(s => s.id === story.sector);
    const copy = storyCopy(story.id, getLang());
    const art = el('article', 'post');
    art.dataset.id = story.id;
    art.dataset.index = String(i);
    art.style.setProperty('--accent', SECTOR_COLOR[story.sector]);

    const media = el('div', 'post-media');
    const slot = el('div', 'media-slot');
    media.appendChild(slot);

    const rail = el('div', 'rail');
    const nextBtn = el('button', 'rail-btn next-btn');
    nextBtn.innerHTML = `<span class="glyph" aria-hidden="true">▼</span><span class="lbl">${t('rail.next')}</span>`;
    nextBtn.setAttribute('aria-label', t('a11y.nextPost'));
    nextBtn.onclick = () => scrollToPost(i + 1);
    rail.append(nextBtn);
    media.appendChild(rail);
    if (i === 0) media.appendChild(el('div', 'swipe-hint', t('hint.swipe')));
    // THE PARODY MARK. Two registers share this feed and the reader has to be
    // able to tell them apart at a glance, not by reading a footer: a bulletin
    // written as satire carries Toko's face, and one reported straight — real
    // names, public statements — does not. The face IS the brand mark, so it
    // says "this is the station being funny" without a word of explanation.
    if (!story.sourced) media.appendChild(parodyMark());

    const cap = el('div', 'post-caption');
    // The kicker is the DATELINE and nothing else, so it stays one short block
    // of solid colour. Everything that is a readout — the position in the
    // rotation, the date — is a dim mono line above it. One line of forty
    // characters in a solid block is a paragraph with a highlighter on it.
    const meta = el('p', 'meta');
    meta.innerHTML = `<span class="rec">${t('tag.onair')}</span> ${pad(i + 1)}/${STORIES.length} · ${date}`;
    const tag = el('p', 'tag', copy.slug);
    const head = el('h2', 'head', copy.head);
    const bulletin = el('div', 'bulletin');
    bulletin.setAttribute('aria-live', 'polite');
    bulletin.appendChild(el('p', 'standby', t('standby')));

    cap.append(meta, tag, head, bulletin);
    // the honesty line, and it has to be honest: a sourced bulletin names real
    // companies and real people, so it must not sit under "invented names"
    cap.appendChild(el('p', 'fiction' + (story.sourced ? ' sourced' : ''),
      t(story.sourced ? 'sourced' : 'fiction')));

    art.append(media, cap);
    feed.appendChild(art);

    // The dateline the stand-up strap prints. It is the COPY's slug, so it
    // follows the language, and it is handed to the shot rather than looked up
    // there — the shot classes never read the wire.
    story.dateline = (copy && copy.slug) || '';
    const post = new Package(slot, story, sector, i);
    post.renderStatic();
    posts.push({ story, sector, copy, post, read: false, els: { art, bulletin } });
  });
  buildSignOff(STORIES.length, date);
  measure();
}

function buildSignOff(i, date) {
  const art = el('article', 'post sign-off');
  art.dataset.id = 'sign-off';
  art.dataset.index = String(i);
  art.style.setProperty('--accent', PAL.GREEN);

  const media = el('div', 'post-media');
  const slot = el('div', 'media-slot');
  media.appendChild(slot);
  const rail = el('div', 'rail');
  const topBtn = el('button', 'rail-btn top-btn');
  topBtn.innerHTML = `<span class="glyph" aria-hidden="true">▲</span><span class="lbl">${t('rail.top')}</span>`;
  topBtn.setAttribute('aria-label', t('off.back'));
  topBtn.onclick = () => scrollToPost(0);
  rail.appendChild(topBtn);
  media.appendChild(rail);

  const cap = el('div', 'post-caption');
  const tag = el('p', 'tag');
  tag.innerHTML = `<span class="rec">${t('off.tag')}</span> · ${date}`;
  const body = el('div', 'bulletin');
  body.append(el('p', 'bulletin-line', t('off.p1').replace('{n}', String(STORIES.length))),
              el('p', 'bulletin-line', t('off.p2')));
  cap.append(tag, el('h2', 'head', t('off.head')), body,
    el('p', 'fiction', t('fiction')));

  art.append(media, cap);
  feed.appendChild(art);

  const post = new Post(slot, { visual: 'signoff', sector: 'GAMING' },
    { freq: '--.--' }, i);
  post.silent = true;
  post.accent = PAL.GREEN;
  post.renderStatic();
  posts.push({ signoff: true, post, els: { art }, read: true });
}

function rebuildFeed() {
  const keep = posts.map(p => ({ read: p.read, signoff: !!p.signoff }));
  const at = Math.max(0, active);
  for (const p of posts) p.post.destroy();
  active = -1;
  buildFeed();
  posts.forEach((p, i) => {
    if (!keep[i] || keep[i].signoff || p.signoff) return;
    p.read = keep[i].read;
    p.post.renderStatic();
  });
  scrollToPost(at, true);
}

let stride = 0;
const measure = () => { stride = feed.scrollHeight / Math.max(1, posts.length); };

function indexAt() { return feed.scrollTop / (stride || 1); }

function watchScroll() {
  measure();
  feed.addEventListener('scroll', () => {
    const f = indexAt();
    const i = Math.round(f);
    if (Math.abs(f - i) < 0.2 && i !== active && posts[i]) setActive(i);
  }, { passive: true });
  window.addEventListener('resize', measure);
}

function setActive(i, first = false) {
  if (i === active || !posts[i]) return;
  const prev = posts[active];
  if (prev) {
    prev.post.goIdle();
    prev.els.art.classList.remove('live');
    if (!reader.done) reader.finish();
  }
  active = i;
  const p = posts[i];
  p.post.goLive();
  p.els.art.classList.add('live');

  if (p.signoff) {
    document.documentElement.style.setProperty('--accent', PAL.GREEN);
    $('freq').textContent = '--.--';
    $('call').textContent = t('off.tag');
    document.title = `${t('off.head')} — Radio Free Helsinki`;
    setHash('');
    audio.carrierDuck(false);
    if (!first) audio.recode();
    return;
  }

  document.documentElement.style.setProperty('--accent', SECTOR_COLOR[p.story.sector]);
  $('freq').textContent = p.sector.freq;
  $('call').textContent = p.sector.call;
  document.title = `${p.copy.head} — Radio Free Helsinki`;
  setHash(p.story.id);

  // The Reader is handed runs with no annotation half at all — `.spun` and
  // `.plain` are not styled away, they are never constructed. `storyBroadcast`
  // is the field that carries the words with no markup in them.
  const lines = storyBroadcast(p.story.id, getLang()).map(text => [{ text, plain: null }]);
  reader.play(p.els.bulletin, lines, false);
  reader.finish();                     // set, not typed
  p.read = true;
  if (!first) audio.page();
}

function setHash(id) {
  const url = location.pathname + location.search + (id ? `#${id}` : '');
  try { history.replaceState(null, '', url); } catch { /* file:// */ }
}

function indexFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  return id ? posts.findIndex(p => !p.signoff && p.story.id === id) : -1;
}

window.addEventListener('hashchange', () => {
  const i = indexFromHash();
  if (i >= 0 && i !== active) scrollToPost(i, true);
});

function scrollToPost(i, instant = false) {
  const n = Math.max(0, Math.min(posts.length - 1, i));
  if (!stride) measure();
  feed.scrollTo(instant ? { top: n * stride, behavior: 'instant' } : { top: n * stride });
  if (instant) setActive(n);
}

function channelOf(i) {
  const p = posts[i];
  return p && !p.signoff ? SECTORS.findIndex(s => s.id === p.story.sector) : -1;
}

function tuneChannel(delta) {
  const here = channelOf(active);
  const want = (here + delta + SECTORS.length) % SECTORS.length;
  const target = posts.findIndex(p => p.story.sector === SECTORS[want].id);
  if (target < 0) return;
  audio.tune(true);
  scrollToPost(target);
}

function bindControls() {
  $('chUp').onclick = () => tuneChannel(1);
  $('chDown').onclick = () => tuneChannel(-1);

  feed.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    if (!e.target.closest('.bulletin')) return;
    if (!reader.done) { reader.finish(); audio.blip(2); }
  });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    switch (e.key) {
      case 'ArrowDown': case 'PageDown': case ' ': e.preventDefault(); scrollToPost(active + 1); break;
      case 'ArrowUp': case 'PageUp': e.preventDefault(); scrollToPost(active - 1); break;
      case 'ArrowRight': tuneChannel(1); break;
      case 'ArrowLeft': tuneChannel(-1); break;
      default: break;
    }
  });
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const p = posts[active];
  if (p) {
    const mouth = p.signoff ? 0 : reader.update(dt, getLang());
    if (!p.signoff && reader.done) audio.carrierDuck(false);
    p.post.update(dt, mouth);
    p.post.draw();
  }
  raf = requestAnimationFrame(loop);
}

function drawAllPlates() {
  const keys = BROLL_KEYS || [];
  const results = [];
  const scr = new PixelScreen(null, PLATE_W, PLATE_H);
  const total = PLATE_W * PLATE_H;
  for (const key of keys) {
    for (const d of [0]) {
      try {
        scr.clear('#000000');
        drawPlate(key, scr, 1.25, d);
        const data = scr.ctx.getImageData(0, 0, PLATE_W, PLATE_H).data;
        let lit = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] + data[i + 1] + data[i + 2] > 12) lit++;
        }
        if (lit < total * 0.02) {
          results.push({ key, d, ok: false, error: `near-empty (${lit}/${total})` });
        } else {
          results.push({ key, d, ok: true, lit });
        }
      } catch (e) {
        results.push({ key, d, ok: false, error: String(e && e.message ? e.message : e) });
      }
    }
  }
  scr.destroy();
  const failed = results.filter(r => !r.ok);
  const out = { ok: failed.length === 0, count: keys.length, results, failed };
  if (!out.ok) console.error('[rfh plates]', failed);
  else console.log('[rfh plates] ALL OK', keys.length, 'keys × 2 decode states');
  return out;
}

window.__rfh = {
  audio,
  get state() {
    const p = posts[active];
    if (!p) return null;
    if (p.signoff) return { signoff: true, index: active, lang: getLang() };
    return { channel: p.story.sector, index: active, id: p.story.id, lang: getLang() };
  },
  vertical: VERTICAL,
  // The stingers a recording tops and tails itself with. Kept here rather than
  // in the renderer because they are made of the wire — the frequency, the
  // dateline, the headline — and the renderer must not learn to read the wire;
  // it presses play and nothing else.
  //
  //   ident()             the station, at the head
  //   ident({ card: 1 })  the end card: the dateline and the headline, held
  //                       long enough to read. It used to print the bulletin's
  //                       TELL, which went with DECODE.
  ident: async ({ ms = 1100, card = false, fade = 280 } = {}) => {
    const box = $('ident');
    const sec = SECTORS[0] || {};
    const p = posts[active];
    const c = card && p && !p.signoff ? storyCopy(p.story.id, getLang()) : null;
    $('identSub').textContent = card
      ? `${(c && c.slug) || ''} · ${WIRE_INFO.date || ''}`.trim()
      : `${sec.freq || '--.--'} ${sec.call || ''}`.trim();
    const body = $('identBody');
    body.innerHTML = '';
    if (c) body.appendChild(document.createTextNode(c.head));
    box.hidden = false;
    // a frame between display and opacity, or the transition never starts
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    box.classList.add('on');
    await new Promise(r => setTimeout(r, ms));
    box.classList.remove('on');
    await new Promise(r => setTimeout(r, fade));
    box.hidden = true;
  },
  debug: {
    tuneIn: () => $('tuneIn').click(),
    // what a clip export would say, straight out of the wire's own field
    broadcast: (id, lang) => storyBroadcast(id || (posts[active] && posts[active].story.id),
                                            lang || getLang()),
    // the whole copy block for a bulletin, in the language on screen — what a
    // caption file and a post text are written from
    copy: (id, lang) => storyCopy(id || (posts[active] && posts[active].story.id),
                                  lang || getLang()),
    go: d => scrollToPost(active + d),
    tuneChannel,
    finishRead: () => reader.finish(),
    stories: () => posts.filter(p => !p.signoff).map(p => p.story.id),
    // Anything inspecting the wire comes through here. stories.js holds it in
    // live bindings filled once by loadWire(), so a second import() of that
    // module gets a fresh and EMPTY copy — that crashed the gate once.
    wire: () => ({ ...WIRE_INFO }),
    wireData: () => ({ sectors: SECTORS, stories: STORIES, copy: COPY }),
    episode: () => EPISODE,
    episodes: () => [...EPISODES],
    // the rotation as it actually aired: what is on, top first, and what the
    // wire is still carrying but keeping off the feed
    rotation: () => ({
      onAir: STORIES.map(s => ({ id: s.id, sector: s.sector, filed: s.filed || null })),
      archived: [...ARCHIVED],
    }),
    // codec posts hold a shot OBJECT, packages hold a shot NAME — a gate reads
    // this to prove the program frame really is cutting, so it has to answer
    // for both kinds without the caller knowing which it asked
    shot: () => {
      const p = posts[active];
      if (!p || p.signoff) return null;
      const s = p.post.shot;
      if (!s) return null;
      const shown = p.post.footage ? p.post.footage() : null;
      return typeof s === 'string' ? { type: s, key: shown }
        : { type: s.type, key: s.key || null };
    },
    // force the edit onto one shot — a gate (and a clip harness) has to be
    // able to look at the studio without waiting out the cut
    cut: (shot) => {
      const p = posts[active];
      if (p && !p.signoff && p.post.cutTo) p.post.cutTo(shot);
      return p && !p.signoff && p.post.shot;
    },
    // 'booth' or 'street' — which set the anchor is standing on
    anchorSet: () => {
      const p = posts[active];
      const a = p && p.post && p.post.anchor;
      return a ? a.set : null;
    },
    beat: () => {
      const p = posts[active];
      return p && !p.signoff && p.post.beat !== undefined ? p.post.beat : null;
    },
    // the anchor's mouth. A gate has to be able to prove the face is not dead,
    // and it cannot do that off the pixels — the blink and the sway move that
    // band too.
    mouth: () => {
      const p = posts[active];
      const a = p && p.post && p.post.anchor;
      return a ? a.mouthSmooth : null;
    },
    // which panel the live post is carrying — thirteen of these exist and
    // until now none of them reached a screen
    visual: () => {
      const p = posts[active];
      return p && !p.signoff ? p.story.visual : null;
    },
    // the live package itself, so a gate can look inside a shot
    pkg: () => {
      const p = posts[active];
      return p && !p.signoff ? p.post.drawn : null;
    },
    cutTo: shot => {
      const p = posts[active];
      if (!p || p.signoff || !p.post.cutTo) return false;
      p.post.cutTo(shot);
      return true;
    },
    setLang: useLang,
    open: id => {
      const i = posts.findIndex(p => !p.signoff && p.story.id === id);
      if (i < 0) return false;
      scrollToPost(i, true);
      return true;
    },
    channel: cid => {
      const i = posts.findIndex(p => !p.signoff && p.story.sector === cid);
      if (i < 0) return false;
      scrollToPost(i, true);
      return true;
    },
    drawAllPlates,
    brollKeys: () => [...(BROLL_KEYS || [])],
  },
};

window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); audio.carrierStop(); });
