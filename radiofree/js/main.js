// Radio Free Helsinki — the receiver.
//
// The feed is vertical and snaps one post per screen, the way a phone feed
// works: all twelve bulletins in one column, ordered by channel. Scrolling is
// the primary control — the dial in the masthead reports which channel you have
// scrolled into, and jumps you between them.
//
// Only the post you are actually on is live: it re-tunes (the picture fades up
// out of noise), types its bulletin, and drives Toko's lip-sync. Neighbours are
// painted once and held, so scrolling shows real pictures rather than blank
// boxes, and nothing off-screen burns a frame budget.
//
// Three languages. Changing one rebuilds the feed in place — same position,
// same decode states — because every word on screen, bulletins included, comes
// from the language blocks.

import { PAL, SECTOR_COLOR } from './palette.js?v=7';
import { Post, Reader } from './codec.js?v=7';
import { SECTORS, STORIES, COPY, storyCopy, parseLine, loadWire, WIRE_INFO } from './stories.js?v=7';
import { t, getLang, setLang, initLang, nextLang, formatDate, LANGS } from './i18n.js?v=7';
import * as audio from './audio.js?v=7';

const $ = id => document.getElementById(id);
const app = $('app'), gate = $('gate'), feed = $('feed');

let posts = [];            // { story, sector, copy, post, els, decoded, read }
let active = -1;
let reader = null;
let raf = 0, last = performance.now();
let booted = false;

initLang();

// ── the static on the gate ─────────────────────────────────────────
// The app's first frame has to be moving: a dead screen behind a "tune in"
// button reads as a page that failed to load.
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

// ── language ───────────────────────────────────────────────────────
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

// ── what you have taken apart ──────────────────────────────────────
// Kept because the sign-off hands it back to you, and because a technique you
// found once is worth still being credited with on the next visit.
const DECODED_KEY = 'rfhDecoded';
let decodedIds = new Set();
try { decodedIds = new Set(JSON.parse(localStorage.getItem(DECODED_KEY) || '[]')); }
catch { /* private mode, or something else wrote there */ }
function rememberDecoded(id) {
  if (decodedIds.has(id)) return;
  decodedIds.add(id);
  try { localStorage.setItem(DECODED_KEY, JSON.stringify([...decodedIds])); } catch { /* ignore */ }
}

// ── sound ──────────────────────────────────────────────────────────
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

// ── tune in ────────────────────────────────────────────────────────
$('tuneIn').onclick = async () => {
  audio.init();
  audio.setMuted(!soundOn);
  audio.ring();
  gate.classList.add('gone');
  app.hidden = false;
  setTimeout(() => { audio.connect(); audio.carrierStart(); }, 780);
  // The wire is fetched, so tuning in is genuinely tuning in: the dial sweeps
  // while it arrives. Nothing is built until it has, and loadWire() always
  // resolves — with the day's bulletins or with the off-air post — so there is
  // no branch here where the feed simply never appears.
  await loadWire();
  boot();
};

function boot() {
  booted = true;
  paintSound();
  paintMastLang();
  $('lang').onclick = () => useLang(nextLang());
  reader = new Reader(n => { if (n % 2 === 0) audio.blip(n); });
  buildFeed();
  watchScroll();
  bindControls();
  // a shared link lands on the bulletin it names; everything else starts at
  // the top of the wire
  const deep = indexFromHash();
  if (deep > 0) scrollToPost(deep, true);
  else setActive(0, true);
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

// ── the feed ───────────────────────────────────────────────────────
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
    // the accent is per-post, not global: while two posts are on screen mid
    // scroll they must keep their own channel colour
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
    // the dial already says which channel you are on, so the tag carries what
    // it does not: position in the feed, dateline, date. Naming the sector here
    // too pushed it onto a second line on every phone.
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

    const post = new Post(slot, story, sector, i);
    post.renderStatic();
    posts.push({ story, sector, copy, post, decoded: false, read: false,
      els: { art, bulletin, box, decodeBtn } });
  });
  buildSignOff(STORIES.length, date);
  measure();
}

// The end of the feed is not "nothing else loaded". Twelve bulletins in, the
// station signs off — a test card, the carrier gone — and hands back the twelve
// tells, marking the ones you actually opened. The last bulletin turns the
// frame on this station; this is the same move, made specific to you.
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
  post.silent = true;                    // the carrier stops with the broadcast
  post.accent = PAL.GREEN;
  post.renderStatic();
  posts.push({ signoff: true, post, els: { art, tally }, decoded: false, read: true });
}

// the tally is rendered on arrival rather than at build time, so it reflects
// what you decoded on the way down
function paintTally(p) {
  const wrap = p.els.tally;
  wrap.innerHTML = '';
  wrap.appendChild(el('p', 'tally-head', `${t('off.tally')} ${decodedIds.size}/${STORIES.length}`));
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
  const n = decodedIds.size;
  wrap.appendChild(el('p', 'tally-note',
    n === 0 ? t('off.none')
      : n >= STORIES.length ? t('off.all').replace('{n}', String(STORIES.length))
      : t('off.some')));
}

// swapping language re-writes every word on screen, so the feed is rebuilt —
// but the reader's place in it should not move: same post, same decode states
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
      p.els.box.hidden = false;
      p.els.decodeBtn.classList.add('on');
      p.els.decodeBtn.setAttribute('aria-expanded', 'true');
      p.els.decodeBtn.querySelector('.lbl').textContent = t('rail.refold');
    }
    p.post.renderStatic();
  });
  scrollToPost(at, true);
}

// Which post the viewport is on, read straight off the scroll position.
//
// This was an IntersectionObserver first, and it could not be trusted: its
// callback arrives asynchronously, so a jump (a deep link, a channel change)
// would land correctly and then be overridden a frame later by a queued entry
// from where the feed used to be. Every post is the same height, so the answer
// is one division — and it agrees with a programmatic jump immediately.
let stride = 0;
const measure = () => { stride = feed.scrollHeight / Math.max(1, posts.length); };

function indexAt() { return feed.scrollTop / (stride || 1); }

function watchScroll() {
  measure();
  feed.addEventListener('scroll', () => {
    const f = indexAt();
    const i = Math.round(f);
    // only hand over once the post is most of the way into place, so a slow
    // drag does not start and abandon two reads on the way past
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
    if (!reader.done) reader.finish();     // never leave a half-typed bulletin
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
    setHash('');                 // the sign-off is the plain address, not a link
    paintTally(p);
    audio.carrierDuck(false);
    if (!first) audio.recode();  // the falling tone: the station going off air
    return;
  }

  // the masthead reports where the scroll put you
  document.documentElement.style.setProperty('--accent', SECTOR_COLOR[p.story.sector]);
  $('freq').textContent = p.sector.freq;
  $('call').textContent = p.sector.call;
  document.title = `${p.copy.head} — Radio Free Helsinki`;
  setHash(p.story.id);

  const lines = p.copy.lines.map(parseLine);
  reader.play(p.els.bulletin, lines, p.decoded);
  if (p.read) reader.finish();   // already heard: show it whole, do not retype
  else { p.read = true; audio.carrierDuck(true); }
  if (!first) audio.page();
}

// ── the address is the bulletin ────────────────────────────────────
// A feed you scroll past twelve stories in is worth sending someone, and a
// link that lands them on the top of the pile is not the same link. The
// address follows the scroll, and an incoming #id opens that post.
//
// replaceState, not push: the back button should leave the page rather than
// walk twelve fake history entries, and — the trap — replaceState does NOT
// fire hashchange, so the handler below cannot be triggered by our own writes.
function setHash(id) {
  const url = location.pathname + location.search + (id ? `#${id}` : '');
  try { history.replaceState(null, '', url); } catch { /* file:// etc. */ }
}

function indexFromHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  return id ? posts.findIndex(p => !p.signoff && p.story.id === id) : -1;
}

// a fragment can also arrive without a reload — pasted into an open tab, or
// reached with the back button
window.addEventListener('hashchange', () => {
  const i = indexFromHash();
  if (i >= 0 && i !== active) scrollToPost(i, true);
});

// ── navigation ─────────────────────────────────────────────────────
function scrollToPost(i, instant = false) {
  const n = Math.max(0, Math.min(posts.length - 1, i));
  if (!stride) measure();
  // 'instant' is the one that actually jumps: scrollTo's default behavior
  // 'auto' means "defer to CSS", and the feed's CSS is scroll-behavior: smooth,
  // so asking for 'auto' politely animates instead of landing
  feed.scrollTo(instant ? { top: n * stride, behavior: 'instant' } : { top: n * stride });
  if (instant) setActive(n);
}

// -1 on the sign-off, which has no band: tuning from there goes to the first
function channelOf(i) {
  const p = posts[i];
  return p && !p.signoff ? SECTORS.findIndex(s => s.id === p.story.sector) : -1;
}

// the dial jumps between channels: the first post of the previous/next band
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
  // a bulletin still being read jumps to the end first — you cannot decode
  // half a sentence
  if (!reader.done) reader.finish();
  reader.setDecoded(p.decoded);
  p.els.box.hidden = !p.decoded;
  p.els.decodeBtn.classList.toggle('on', p.decoded);
  p.els.decodeBtn.setAttribute('aria-expanded', String(p.decoded));
  p.els.decodeBtn.querySelector('.lbl').textContent = t(p.decoded ? 'rail.refold' : 'rail.decode');
  p.decoded ? audio.decode() : audio.recode();
}

function bindControls() {
  $('chUp').onclick = () => tuneChannel(1);
  $('chDown').onclick = () => tuneChannel(-1);

  // tapping the copy skips the typing — the reader is a flourish, not a gate
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

// ── the loop ───────────────────────────────────────────────────────
// Only the live post animates. The rest keep the frame they were painted with,
// which is what makes a twelve-canvas feed cheap.
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

// console handle, same convention as __dc / __hd / __gol in the sibling demos
window.__rfh = {
  audio,
  get state() {
    const p = posts[active];
    if (!p) return null;
    if (p.signoff) return { signoff: true, index: active, decodedCount: decodedIds.size, lang: getLang() };
    return { channel: p.story.sector, index: active, decoded: p.decoded,
             id: p.story.id, lang: getLang(),
             shot: p.post.shots[p.post.shot], broll: p.post.brollNow(),
             brollPool: p.post.brollPool };
  },
  debug: {
    tuneIn: () => $('tuneIn').click(),
    go: d => scrollToPost(active + d),
    tuneChannel,
    toggleDecode: () => toggleDecode(active),
    finishRead: () => reader.finish(),
    stories: () => posts.filter(p => !p.signoff).map(p => p.story.id),
    // What the feed is actually reading, and where it came from. Anything
    // inspecting the wire must come through here: `stories.js` holds it in
    // live bindings filled once by loadWire(), so a second `import()` of that
    // module — a test, a console — gets a fresh, EMPTY copy. That cost the
    // gate a crash the first time.
    wire: () => ({ ...WIRE_INFO }),
    wireData: () => ({ sectors: SECTORS, stories: STORIES, copy: COPY }),
    reload: async () => { await loadWire(); rebuildFeed(); return { ...WIRE_INFO }; },
    decoded: () => [...decodedIds],
    forgetDecoded: () => { decodedIds.clear(); try { localStorage.removeItem(DECODED_KEY); } catch {} },
    setLang: useLang,
    // tests and deep links need to land on a post without waiting for a smooth
    // scroll to finish, so jump instantly and set the active post directly
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
  },
};

window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); audio.carrierStop(); });
