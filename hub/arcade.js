// The room the cabinets are standing in.
//
// Everything here is atmosphere. None of it is load-bearing: the floor works
// with all of it switched off, and every piece checks `prefers-reduced-motion`
// or sits behind a toggle that is OFF until somebody asks for it. That is the
// deal — a workshop page that boots like a tube is a nice joke once and a tax
// forever, so none of it may ever stand between you and pressing Play.
//
// Kept out of hub.js because hub.js is the floor: cabinets, feedback, the
// catalogue. This is the room tone, the idle reel, the counters on the wall.

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
const store = {
  get(k, fallback) {
    try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

// ── 5. power-on ────────────────────────────────────────────────────
// The page comes up like a tube rather than like a document: one bright line
// across the middle, then it opens vertically, then the phosphor fades and the
// floor is there.
//
// Once per TAB, not once per load. Every game on this site is a real navigation
// and coming back from one is a fresh page — a boot animation on each return
// would be a toll on the way home, which is the opposite of what the shell
// button is for. sessionStorage is exactly "this tab, this visit".
export function powerOn() {
  if (REDUCED.matches) return;
  try { if (sessionStorage.getItem('sudsJackHubBooted')) return; } catch { return; }
  try { sessionStorage.setItem('sudsJackHubBooted', '1'); } catch { /* */ }

  const veil = document.createElement('div');
  veil.className = 'power-on';
  veil.setAttribute('aria-hidden', 'true');       // it is not content
  veil.innerHTML = '<i></i>';
  document.body.appendChild(veil);
  // the element removes itself; nothing else has to remember it exists
  veil.addEventListener('animationend', e => {
    if (e.target === veil) veil.remove();
  });
  setTimeout(() => veil.remove(), 2000);          // and a belt for the braces
}

// ── 2. room tone ───────────────────────────────────────────────────
// An arcade is never silent — there is a hum off the cabinets before anybody
// plays anything. This is that, about as quiet as a thing can be and still be
// there, plus a coin on the way in.
//
// OFF until asked. A page that makes noise on arrival is a page people close,
// and browsers will not let it start before a gesture anyway.
const SOUND_KEY = 'sudsJackHubSound';
let ctx = null, bed = null, master = null;

export const sound = {
  on: () => store.get(SOUND_KEY, false) === true,
  set(v) {
    store.set(SOUND_KEY, !!v);
    if (v) sound.start(); else sound.stop();
  },

  start() {
    if (!sound.on()) return;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        // EVERYTHING routes through here, so the toggle is total and anything
        // added later inherits it. Nothing connects to destination directly.
        master = ctx.createGain();
        master.gain.value = 0.6;
        master.connect(ctx.destination);
      }
      ctx.resume?.();
      if (bed) return;
      // two saws a couple of cents apart under a low filter: the beat between
      // them is what makes it read as a room rather than as a test tone
      const g = ctx.createGain();
      g.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      const a = ctx.createOscillator(), b = ctx.createOscillator();
      a.type = b.type = 'sawtooth';
      a.frequency.value = 55; b.frequency.value = 55.4;
      a.connect(lp); b.connect(lp); lp.connect(g); g.connect(master);
      a.start(); b.start();
      g.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1.2);   // fade in
      bed = { a, b, g };
    } catch { /* no audio here; the floor does not care */ }
  },

  stop() {
    if (!bed || !ctx) return;
    try {
      bed.g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
      const { a, b } = bed;
      setTimeout(() => { try { a.stop(); b.stop(); } catch { /* */ } }, 400);
    } catch { /* */ }
    bed = null;
  },

  // the coin on the way in — two notes, up, over in a fifth of a second
  coin() {
    if (!sound.on() || !ctx || !master) return;
    try {
      const now = ctx.currentTime;
      for (const [f, at] of [[988, 0], [1319, 0.07]]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + at);
        g.gain.exponentialRampToValueAtTime(0.12, now + at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.11);
        o.connect(g); g.connect(master);
        o.start(now + at); o.stop(now + at + 0.13);
      }
    } catch { /* */ }
  },
};

// ── 1. attract mode ────────────────────────────────────────────────
// Leave the floor alone for a while and it starts showing you the covers, one
// at a time, big. This is what an arcade does with an idle cabinet and it is
// the cheapest way to make a page of small pictures feel like a room.
//
// Any input at all ends it, including the input that would have ended it
// anyway — the whole point is that it must never be in the way. It also stands
// down while a dialog is open, because a modal is somebody in the middle of
// something.
const IDLE_MS = 30000, HOLD_MS = 4200;

export function attract({ games, draw, onExit } = {}) {
  if (REDUCED.matches) return { stop() {} };

  let timer = 0, reel = 0, box = null, at = 0;
  const live = () => games.filter(g => g.live !== false);

  const show = () => {
    const list = live();
    if (!list.length) return stop();
    const g = list[at++ % list.length];
    box.querySelector('.attract-name').textContent = g.title;
    box.querySelector('.attract-line').textContent = g.lineage ?? '';
    box.style.setProperty('--cab', g.accent);
    draw(box.querySelector('canvas'), g.art, g.accent);
  };

  const begin = () => {
    if (box || document.querySelector('.sheet:not([hidden])')) return;
    box = document.createElement('div');
    box.className = 'attract';
    box.setAttribute('aria-hidden', 'true');   // the floor underneath is the page
    box.innerHTML = '<canvas class="art" width="128" height="72"></canvas>' +
      '<p class="attract-name"></p><p class="attract-line"></p>';
    document.body.appendChild(box);
    document.documentElement.dataset.attract = 'on';
    show();
    reel = setInterval(show, HOLD_MS);
  };

  const stop = () => {
    clearInterval(reel); reel = 0;
    box?.remove(); box = null;
    delete document.documentElement.dataset.attract;
  };

  const poke = () => {
    if (box) { stop(); onExit?.(); }
    clearTimeout(timer);
    timer = setTimeout(begin, IDLE_MS);
  };

  // `capture` so a click that is about to be swallowed by a cabinet still
  // counts as somebody being here
  for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'focusin'])
    addEventListener(ev, poke, { capture: true, passive: true });
  poke();
  // `begin` is handed back so the gate can raise the reel without sitting
  // through the idle timer — an animation nobody can trigger on purpose is an
  // animation nobody can test.
  return { stop, poke, begin, showing: () => !!box };
}

// ── 7. marquee flicker ─────────────────────────────────────────────
// Every so often one tube on the floor struggles for a moment and settles. One
// cabinet at a time, never the same one twice running, and never while the
// attract reel is up — two things twitching at once reads as a broken page
// rather than as an old one.
export function flicker(root = document) {
  if (REDUCED.matches) return { stop() {} };
  let last = null;
  const tick = () => {
    const arts = [...root.querySelectorAll('.cab:not([hidden]) .art')]
      .filter(n => n !== last && n.offsetParent !== null);
    if (arts.length && !document.documentElement.dataset.attract) {
      const n = arts[Math.floor(Math.random() * arts.length)];
      last = n;
      n.classList.add('flick');
      setTimeout(() => n.classList.remove('flick'), 900);
    }
    id = setTimeout(tick, 6000 + Math.random() * 9000);
  };
  let id = setTimeout(tick, 4000);
  return { stop: () => clearTimeout(id) };
}

// ── 6. konami ──────────────────────────────────────────────────────
// The code, and it unlocks a cabinet that is not on the floor. Kept honest:
// what it reveals is real and already in the repo, because a secret that turns
// out to be a joke about there being no secret is worth exactly one telling.
const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

export function konami(fn) {
  let i = 0;
  addEventListener('keydown', e => {
    // a field owns its own keys — the same lesson the counter learned when
    // typing "3 CRASHES" picked topic three
    if (e.target.matches?.('input, textarea')) { i = 0; return; }
    const want = CODE[i];
    const got = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    i = got === want ? i + 1 : (got === CODE[0] ? 1 : 0);
    if (i === CODE.length) { i = 0; fn(); }
  });
}

// ── 4. credits, 8. the streak, 9. tickets ──────────────────────────
// Three counters on the wall. None of them gate anything, and that is stated
// out loud rather than implied — an arcade that hands you a number and then
// asks you to earn it with a number is a shop.
const CREDIT_KEY = 'sudsJackHubCredits';
const DAYS_KEY = 'sudsJackHubDays';
const TICKET_KEY = 'sudsJackHubTickets';

const today = () => new Date().toISOString().slice(0, 10);

export const credits = {
  get: () => store.get(CREDIT_KEY, 0),
  add() { const n = credits.get() + 1; store.set(CREDIT_KEY, n); return n; },
};

export const tickets = {
  get: () => store.get(TICKET_KEY, 0),
  add() { const n = tickets.get() + 1; store.set(TICKET_KEY, n); return n; },
};

// Days you played, newest last, capped. The streak is counted back from TODAY
// and nowhere else: counted back from the most recent day instead, a streak
// that ended in March would still be showing in July, which is a scoreboard
// telling you about somebody you no longer are.
export const streak = {
  mark() {
    const days = store.get(DAYS_KEY, []);
    const d = today();
    if (days[days.length - 1] !== d) days.push(d);
    store.set(DAYS_KEY, days.slice(-40));
    return streak.get();
  },
  get() {
    const days = new Set(store.get(DAYS_KEY, []));
    if (!days.has(today())) return 0;
    let n = 0;
    for (const d = new Date(); days.has(d.toISOString().slice(0, 10)); d.setDate(d.getDate() - 1)) n++;
    return n;
  },
};

// ── 3. the score wall ──────────────────────────────────────────────
// The games already write their bests to localStorage on this machine, so the
// hub can read them back and put them on the cabinets. Nothing is sent
// anywhere and nothing is fetched — these are YOUR numbers, off your own disk,
// which is also why there is no leaderboard here and never will be.
export function bestOf(game) {
  if (!game.score) return null;
  const raw = store.get(game.score.key, null);
  const n = typeof raw === 'number' ? raw : parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
