// Radio Free Helsinki — the receiver.
//
// Boot → tune-in gate (which is also the gesture that unlocks WebAudio) →
// codec connects → Toko reads the day's wire. Three channels on the dial, four
// bulletins each; page with a swipe, the arrow keys, or NEXT. DECODE is the
// point of the whole thing: it re-reads the bulletin in plain language, names
// the technique, and re-draws the picture without the flattering framing.

import { PAL, SECTOR_COLOR } from './palette.js?v=1';
import { Codec, Reader } from './codec.js?v=1';
import { SECTORS, storiesFor, parseLine } from './stories.js?v=1';
import * as audio from './audio.js?v=1';

const $ = id => document.getElementById(id);
const app = $('app'), gate = $('gate');

let codec = null, reader = null;
let sectorIdx = 0, storyIdx = 0, decoded = false;
let raf = 0, last = performance.now();

const channel = () => SECTORS[sectorIdx];
const list = () => storiesFor(channel().id);
const story = () => list()[Math.min(storyIdx, list().length - 1)];

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
    // a carrier trying to come through the noise
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

function boot() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  $('date').textContent = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  paintSound();

  codec = new Codec($('codec'));
  reader = new Reader($('bulletin'), n => { if (n % 2 === 0) audio.blip(n); });

  showStory(true);
  bindControls();
  last = performance.now();
  raf = requestAnimationFrame(loop);
}

// ── rendering the current bulletin ─────────────────────────────────
function showStory(fresh) {
  const s = story();
  document.documentElement.style.setProperty('--accent', SECTOR_COLOR[s.sector]);

  $('freq').textContent = channel().freq;
  $('call').textContent = channel().call;
  $('sector').textContent = channel().label;
  $('slug').textContent = s.slug;
  $('tag').textContent = `${s.sector} · ${String(storyIdx + 1).padStart(2, '0')} / ${String(list().length).padStart(2, '0')}`;
  $('head').textContent = s.head;

  decoded = false;
  paintDecode();
  $('technique').textContent = s.technique;
  $('note').textContent = s.decodeNote;
  $('tell').textContent = s.tell;

  codec.setStory(s);
  if (fresh) codec.signal = 0;
  reader.play(s.lines.map(parseLine), false);
  audio.carrierDuck(true);
  paintProgress();
  document.title = `${s.head} — Radio Free Helsinki`;
}

function paintDecode() {
  $('decodeBox').hidden = !decoded;
  const b = $('decode');
  b.classList.toggle('on', decoded);
  b.textContent = decoded ? 'Re-fold' : 'Decode';
  b.setAttribute('aria-expanded', String(decoded));
}

function paintProgress() {
  const wrap = $('progress');
  wrap.innerHTML = '';
  list().forEach((_, i) => {
    const bar = document.createElement('i');
    if (i < storyIdx) bar.className = 'seen';
    if (i === storyIdx) bar.className = 'at';
    wrap.appendChild(bar);
  });
}

// ── navigation ─────────────────────────────────────────────────────
function go(delta) {
  const n = list().length;
  let i = storyIdx + delta;
  if (i >= n) { tuneChannel(1, true); return; }          // sweep on past the end
  if (i < 0) {
    tuneChannel(-1, true);
    storyIdx = list().length - 1;
    showStory(true);
    return;
  }
  storyIdx = i;
  audio.page();
  showStory(false);
}

function tuneChannel(delta, quiet) {
  sectorIdx = (sectorIdx + delta + SECTORS.length) % SECTORS.length;
  storyIdx = 0;
  audio.tune(true);
  if (!quiet) audio.page();
  showStory(true);
}

function toggleDecode() {
  decoded = !decoded;
  // a bulletin still being read jumps to the end first — you cannot decode
  // half a sentence
  if (!reader.done) reader.finish();
  reader.setDecoded(decoded);
  paintDecode();
  decoded ? audio.decode() : audio.recode();
}

function bindControls() {
  $('next').onclick = () => go(1);
  $('decode').onclick = toggleDecode;
  $('chUp').onclick = () => tuneChannel(1);
  $('chDown').onclick = () => tuneChannel(-1);

  // tapping the copy skips the typing — the reader is a flourish, not a gate
  $('bulletin').onclick = () => { if (!reader.done) { reader.finish(); audio.blip(2); } };

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    switch (e.key) {
      case 'ArrowDown': case 'PageDown': case ' ': e.preventDefault(); go(1); break;
      case 'ArrowUp': case 'PageUp': e.preventDefault(); go(-1); break;
      case 'ArrowRight': tuneChannel(1); break;
      case 'ArrowLeft': tuneChannel(-1); break;
      case 'd': case 'D': toggleDecode(); break;
      default: break;
    }
  });

  // vertical swipe pages the feed, the way the shape of the thing promises
  let sy = 0, sx = 0, tracking = false;
  const surface = app;
  surface.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    tracking = true; sy = e.clientY; sx = e.clientX;
  });
  surface.addEventListener('pointerup', e => {
    if (!tracking) return;
    tracking = false;
    const dy = e.clientY - sy, dx = e.clientX - sx;
    if (Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx)) go(dy < 0 ? 1 : -1);
    else if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) tuneChannel(dx < 0 ? 1 : -1);
  });

  let wheelLock = 0;
  surface.addEventListener('wheel', e => {
    const now = performance.now();
    if (now < wheelLock || Math.abs(e.deltaY) < 12) return;
    wheelLock = now + 480;
    go(e.deltaY > 0 ? 1 : -1);
  }, { passive: true });
}

// ── the loop ───────────────────────────────────────────────────────
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const mouth = reader.update(dt);
  if (reader.done) audio.carrierDuck(false);
  codec.update(dt, mouth, decoded);
  codec.draw();
  raf = requestAnimationFrame(loop);
}

// console handle, same convention as __dc / __hd / __gol in the sibling demos
window.__rfh = {
  audio,
  get state() { return { channel: channel().id, storyIdx, decoded, id: story().id }; },
  debug: {
    tuneIn: () => $('tuneIn').click(),
    go, tuneChannel, toggleDecode,
    channel: id => {
      const i = SECTORS.findIndex(s => s.id === id);
      if (i < 0) return false;
      sectorIdx = i; storyIdx = 0; showStory(true);
      return true;
    },
    open: id => {
      for (let si = 0; si < SECTORS.length; si++) {
        const idx = storiesFor(SECTORS[si].id).findIndex(s => s.id === id);
        if (idx >= 0) { sectorIdx = si; storyIdx = idx; showStory(true); return true; }
      }
      return false;
    },
    finishRead: () => reader.finish(),
    stories: () => storiesFor('ALL').map(s => s.id),
  },
};

window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); audio.carrierStop(); });
