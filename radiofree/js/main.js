// Radio Free Helsinki — the receiver.

import { PAL, SECTOR_COLOR } from './palette.js?v=28';
import { Post, Reader } from './codec.js?v=28';
import { Package } from './package.js?v=28';
import { SECTORS, STORIES, COPY, ARCHIVED, storyCopy, parseLine, loadWire, WIRE_INFO } from './stories.js?v=28';
import { t, getLang, setLang, initLang, nextLang, formatDate, LANGS } from './i18n.js?v=28';
import * as audio from './audio.js?v=28';
import { PixelScreen } from './screen.js?v=28';
import { drawVisual, BROLL_KEYS, PANEL_W, PANEL_H } from './visuals.js?v=28';

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

const DECODED_KEY = 'rfhDecoded';
let decodedIds = new Set();
try { decodedIds = new Set(JSON.parse(localStorage.getItem(DECODED_KEY) || '[]')); }
catch { /* private mode */ }
function rememberDecoded(id) {
  if (decodedIds.has(id)) return;
  decodedIds.add(id);
  try { localStorage.setItem(DECODED_KEY, JSON.stringify([...decodedIds])); } catch { /* ignore */ }
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

$('tuneIn').onclick = async () => {
  audio.init();
  audio.setMuted(!soundOn);
  audio.ring();
  gate.classList.add('gone');
  app.hidden = false;
  setTimeout(() => { audio.connect(); audio.carrierStart(); }, 780);
  // The wire is fetched now, so tuning in is genuinely tuning in. loadWire()
  // always resolves — with the day's bulletins or with the off-air post — so
  // there is no branch here where the feed never appears.
  await loadWire();
  boot();
};

function boot() {
  booted = true;
  paintSound();
  paintMastLang();
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
    const decodeBtn = el('button', 'rail-btn decode-btn');
    decodeBtn.innerHTML = `<span class="glyph" aria-hidden="true">⧉</span><span class="lbl">${t('rail.decode')}</span>`;
    decodeBtn.setAttribute('aria-expanded', 'false');
    decodeBtn.onclick = () => toggleDecode(i);
    const nextBtn = el('button', 'rail-btn next-btn');
    nextBtn.innerHTML = `<span class="glyph" aria-hidden="true">▼</span><span class="lbl">${t('rail.next')}</span>`;
    nextBtn.setAttribute('aria-label', t('a11y.nextPost'));
    nextBtn.onclick = () => scrollToPost(i + 1);
    rail.append(decodeBtn, nextBtn);
    media.appendChild(rail);
    if (i === 0) media.appendChild(el('div', 'swipe-hint', t('hint.swipe')));

    const cap = el('div', 'post-caption');
    const tag = el('p', 'tag');
    tag.innerHTML = `<span class="rec">${t('tag.onair')}</span> ${pad(i + 1)}/${STORIES.length} · ${copy.slug} · ${date}`;
    const head = el('h2', 'head', copy.head);
    const bulletin = el('div', 'bulletin');
    bulletin.setAttribute('aria-live', 'polite');
    bulletin.appendChild(el('p', 'standby', t('standby')));

    const box = el('div', 'decode-box');
    box.hidden = true;
    box.append(
      el('p', 'technique', copy.technique),
      el('p', 'note', copy.decodeNote),
      el('p', 'tell', t('tell.prefix') + copy.tell),
    );
    cap.append(tag, head, bulletin, box, el('p', 'fiction', t('fiction')));

    art.append(media, cap);
    feed.appendChild(art);

    const post = new Package(slot, story, sector, i);
    post.renderStatic();
    posts.push({ story, sector, copy, post, decoded: false, read: false,
      els: { art, bulletin, box, decodeBtn } });
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
  const tally = el('div', 'tally');
  cap.append(tag, el('h2', 'head', t('off.head')), body, tally,
    el('p', 'fiction', t('fiction')));

  art.append(media, cap);
  feed.appendChild(art);

  const post = new Post(slot, { visual: 'signoff', sector: 'GAMING' },
    { freq: '--.--' }, i);
  post.silent = true;
  post.accent = PAL.GREEN;
  post.renderStatic();
  posts.push({ signoff: true, post, els: { art, tally }, decoded: false, read: true });
}

function paintTally(p) {
  const wrap = p.els.tally;
  wrap.innerHTML = '';
  // Count against WHAT AIRED, not against everything ever decoded. `rfhDecoded`
  // persists across visits, so once bulletins start being archived a returning
  // listener's set outgrows the feed and the tally reads "14/12".
  const onAir = STORIES.filter(s => decodedIds.has(s.id)).length;
  wrap.appendChild(el('p', 'tally-head', `${t('off.tally')} ${onAir}/${STORIES.length}`));
  for (const story of STORIES) {
    const copy = storyCopy(story.id, getLang());
    const got = decodedIds.has(story.id);
    const row = el('div', 'tally-row' + (got ? ' got' : ''));
    row.append(
      el('span', 'tally-mark', got ? '✓' : '·'),
      el('span', 'tally-tech', copy.technique),
    );
    if (got) row.appendChild(el('span', 'tally-tell', copy.tell));
    wrap.appendChild(row);
  }
  const n = onAir;
  wrap.appendChild(el('p', 'tally-note',
    n === 0 ? t('off.none')
      : n >= STORIES.length ? t('off.all').replace('{n}', String(STORIES.length))
      : t('off.some')));
}

function rebuildFeed() {
  const keep = posts.map(p => ({ decoded: p.decoded, read: p.read, signoff: !!p.signoff }));
  const at = Math.max(0, active);
  for (const p of posts) p.post.destroy();
  active = -1;
  buildFeed();
  posts.forEach((p, i) => {
    if (!keep[i] || keep[i].signoff || p.signoff) return;
    p.decoded = keep[i].decoded;
    p.read = keep[i].read;
    p.post.decoded = p.decoded;
    if (p.decoded) {
      p.els.art.classList.add('is-decoded');
      p.els.box.hidden = false;
      p.els.decodeBtn.classList.add('on');
      p.els.decodeBtn.setAttribute('aria-expanded', 'true');
      p.els.decodeBtn.querySelector('.lbl').textContent = t('rail.refold');
    }
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
    paintTally(p);
    audio.carrierDuck(false);
    if (!first) audio.recode();
    return;
  }

  document.documentElement.style.setProperty('--accent', SECTOR_COLOR[p.story.sector]);
  $('freq').textContent = p.sector.freq;
  $('call').textContent = p.sector.call;
  document.title = `${p.copy.head} — Radio Free Helsinki`;
  setHash(p.story.id);

  const lines = p.copy.lines.map(parseLine);
  reader.play(p.els.bulletin, lines, p.decoded);
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

function toggleDecode(i) {
  const p = posts[i];
  if (!p || p.signoff) return;
  if (i !== active) { scrollToPost(i); return; }
  p.decoded = !p.decoded;
  p.post.decoded = p.decoded;
  if (p.decoded) rememberDecoded(p.story.id);
  if (!reader.done) reader.finish();
  reader.setDecoded(p.decoded);
  p.els.art.classList.toggle('is-decoded', p.decoded);
  p.els.box.hidden = !p.decoded;
  p.els.decodeBtn.classList.toggle('on', p.decoded);
  p.els.decodeBtn.setAttribute('aria-expanded', String(p.decoded));
  p.els.decodeBtn.querySelector('.lbl').textContent = t(p.decoded ? 'rail.refold' : 'rail.decode');
  p.decoded ? audio.decode() : audio.recode();
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
      case 'd': case 'D': toggleDecode(active); break;
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
  const scr = new PixelScreen(null, PANEL_W, PANEL_H);
  const total = PANEL_W * PANEL_H;
  for (const key of keys) {
    for (const d of [0, 1]) {
      try {
        scr.clear('#000000');
        drawVisual(key, scr, 1.25, d);
        const data = scr.ctx.getImageData(0, 0, PANEL_W, PANEL_H).data;
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
    if (p.signoff) return { signoff: true, index: active,
        decodedCount: STORIES.filter(s => decodedIds.has(s.id)).length, lang: getLang() };
    return { channel: p.story.sector, index: active, decoded: p.decoded,
             id: p.story.id, lang: getLang() };
  },
  debug: {
    tuneIn: () => $('tuneIn').click(),
    go: d => scrollToPost(active + d),
    tuneChannel,
    toggleDecode: () => toggleDecode(active),
    finishRead: () => reader.finish(),
    stories: () => posts.filter(p => !p.signoff).map(p => p.story.id),
    // Anything inspecting the wire comes through here. stories.js holds it in
    // live bindings filled once by loadWire(), so a second import() of that
    // module gets a fresh and EMPTY copy — that crashed the gate once.
    wire: () => ({ ...WIRE_INFO }),
    wireData: () => ({ sectors: SECTORS, stories: STORIES, copy: COPY }),
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
      return typeof s === 'string' ? { type: s, key: null }
        : { type: s.type, key: s.key || null };
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
    decoded: () => [...decodedIds],
    forgetDecoded: () => { decodedIds.clear(); try { localStorage.removeItem(DECODED_KEY); } catch {} },
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
