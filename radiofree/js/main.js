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

import { PAL, SECTOR_COLOR } from './palette.js?v=2';
import { Post, Reader } from './codec.js?v=2';
import { SECTORS, STORIES, parseLine } from './stories.js?v=2';
import * as audio from './audio.js?v=2';

const $ = id => document.getElementById(id);
const app = $('app'), gate = $('gate'), feed = $('feed');

const posts = [];          // { story, sector, post, els, decoded, read }
let active = -1;
let reader = null;
let raf = 0, last = performance.now();

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

// ── sound ──────────────────────────────────────────────────────────
const SOUND_KEY = 'rfhSound';
let soundOn = localStorage.getItem(SOUND_KEY) !== '0';

function paintSound() {
  const b = $('sound');
  b.textContent = soundOn ? '♪' : '♪̸';
  b.setAttribute('aria-pressed', String(soundOn));
  b.title = soundOn ? 'Sound on' : 'Sound off';
}

$('sound').onclick = () => {
  soundOn = !soundOn;
  localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0');
  audio.setMuted(!soundOn);
  paintSound();
  if (soundOn) audio.blip(1);
};

// ── tune in ────────────────────────────────────────────────────────
$('tuneIn').onclick = () => {
  audio.init();
  audio.setMuted(!soundOn);
  audio.ring();
  gate.classList.add('gone');
  app.hidden = false;
  setTimeout(() => { audio.connect(); audio.carrierStart(); }, 780);
  boot();
};

function el(tag, cls = '', text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function boot() {
  paintSound();
  reader = new Reader(n => { if (n % 2 === 0) audio.blip(n); });
  buildFeed();
  watchScroll();
  bindControls();
  setActive(0, true);
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

// ── the feed ───────────────────────────────────────────────────────
function buildFeed() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;

  STORIES.forEach((story, i) => {
    const sector = SECTORS.find(s => s.id === story.sector);
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
    decodeBtn.innerHTML = '<span class="glyph" aria-hidden="true">⧉</span><span class="lbl">DECODE</span>';
    decodeBtn.setAttribute('aria-expanded', 'false');
    decodeBtn.onclick = () => toggleDecode(i);
    const nextBtn = el('button', 'rail-btn next-btn');
    nextBtn.innerHTML = '<span class="glyph" aria-hidden="true">▼</span><span class="lbl">NEXT</span>';
    nextBtn.setAttribute('aria-label', 'Next bulletin');
    nextBtn.onclick = () => scrollToPost(i + 1);
    rail.append(decodeBtn, nextBtn);
    media.appendChild(rail);
    if (i === 0) media.appendChild(el('div', 'swipe-hint', 'swipe up for the next bulletin'));

    const cap = el('div', 'post-caption');
    // the dial already says which channel you are on, so the tag carries what
    // it does not: position in the feed, dateline, date. Naming the sector here
    // too pushed it onto a second line on every phone.
    const tag = el('p', 'tag');
    tag.innerHTML = `<span class="rec">ON AIR</span> ${pad(i + 1)}/${STORIES.length} · ${story.slug} · ${date}`;
    const head = el('h2', 'head', story.head);
    const bulletin = el('div', 'bulletin');
    bulletin.setAttribute('aria-live', 'polite');
    bulletin.appendChild(el('p', 'standby', 'awaiting transmission'));

    const box = el('div', 'decode-box');
    box.hidden = true;
    box.append(
      el('p', 'technique', story.technique),
      el('p', 'note', story.decodeNote),
      el('p', 'tell', story.tell),
    );
    cap.append(tag, head, bulletin, box,
      el('p', 'fiction', 'Fictional broadcast · invented studios, ministries and ports · real techniques'));

    art.append(media, cap);
    feed.appendChild(art);

    const post = new Post(slot, story, sector, i);
    post.renderStatic();
    posts.push({ story, sector, post, decoded: false, read: false,
      els: { art, bulletin, box, decodeBtn } });
  });
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

  // the masthead reports where the scroll put you
  document.documentElement.style.setProperty('--accent', SECTOR_COLOR[p.story.sector]);
  $('freq').textContent = p.sector.freq;
  $('call').textContent = p.sector.call;
  document.title = `${p.story.head} — Radio Free Helsinki`;

  if (!p.read) {
    p.read = true;
    reader.play(p.els.bulletin, p.story.lines.map(parseLine), p.decoded);
    audio.carrierDuck(true);
    if (!first) audio.page();
  } else {
    // already heard: show it whole rather than retyping on every scroll past
    reader.play(p.els.bulletin, p.story.lines.map(parseLine), p.decoded);
    reader.finish();
    if (!first) audio.page();
  }
}

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

function channelOf(i) { return SECTORS.findIndex(s => s.id === posts[i].story.sector); }

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
  if (!p) return;
  if (i !== active) { scrollToPost(i); return; }
  p.decoded = !p.decoded;
  p.post.decoded = p.decoded;
  // a bulletin still being read jumps to the end first — you cannot decode
  // half a sentence
  if (!reader.done) reader.finish();
  reader.setDecoded(p.decoded);
  p.els.box.hidden = !p.decoded;
  p.els.decodeBtn.classList.toggle('on', p.decoded);
  p.els.decodeBtn.setAttribute('aria-expanded', String(p.decoded));
  p.els.decodeBtn.querySelector('.lbl').textContent = p.decoded ? 'RE-FOLD' : 'DECODE';
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
    const mouth = reader.update(dt);
    if (reader.done) audio.carrierDuck(false);
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
    return p ? { channel: p.story.sector, index: active, decoded: p.decoded, id: p.story.id } : null;
  },
  debug: {
    tuneIn: () => $('tuneIn').click(),
    go: d => scrollToPost(active + d),
    tuneChannel,
    toggleDecode: () => toggleDecode(active),
    finishRead: () => reader.finish(),
    stories: () => posts.map(p => p.story.id),
    // tests and deep links need to land on a post without waiting for a smooth
    // scroll to finish, so jump instantly and set the active post directly
    open: id => {
      const i = posts.findIndex(p => p.story.id === id);
      if (i < 0) return false;
      scrollToPost(i, true);
      return true;
    },
    channel: cid => {
      const i = posts.findIndex(p => p.story.sector === cid);
      if (i < 0) return false;
      scrollToPost(i, true);
      return true;
    },
  },
};

window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); audio.carrierStop(); });
