// The room the cabinets are standing in.
//
// Everything here is atmosphere. None of it is load-bearing: the floor works
// with all of it switched off, and every piece checks `prefers-reduced-motion`
// or sits behind a toggle that is OFF until somebody asks for it. That is the
// deal — a workshop page that boots like a tube is a nice joke once and a tax
// forever, so none of it may ever stand between you and pressing Play.
//
// Kept out of hub.js because hub.js is the floor: cabinets, feedback, the
// catalogue. This is the room tone, the flicker, the counters on the wall.

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');
const store = {
  get(k, fallback) {
    try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

// ── 5. power-on ────────────────────────────────────────────────────
// The arcade is a terminal, so it comes on like one: the tube strikes across
// the whole glass, opens, and the floor is there.
//
// This is the HUB's animation and only the hub's. The workshop's mark used to
// play here too — for a while both played at once, a black veil sweeping open
// underneath a magenta panel at z-index 99999 that hid it completely — and it
// has gone where a studio logo actually belongs, in front of a game rather
// than in front of a menu. The `mark` hook is still here because the two are
// worth sequencing on a title screen; the arcade just does not use it.
//
// Once per TAB, not once per load. Every game here is a real navigation, so
// coming back from one is a fresh page, and a boot animation on each return is
// a toll on the way home — which is the opposite of what the shell button is
// for. sessionStorage is exactly "this tab, this visit".
const BOOT_KEY = 'sudsJackHubBooted';

export function powerOn({ mark } = {}) {
  const nothing = Promise.resolve();
  try {
    if (sessionStorage.getItem(BOOT_KEY)) return nothing;
    sessionStorage.setItem(BOOT_KEY, '1');
  } catch { return nothing; }

  // Reduced motion drops the TUBE, not the introduction. The sting has its own
  // still-frame path for exactly this case — it holds the finished mark for a
  // beat instead of drawing it — so refusing to call it at all would be this
  // module deciding that somebody who dislikes movement also does not get to
  // be told whose workshop this is.
  if (REDUCED.matches) return Promise.resolve(mark?.()).catch(() => {});

  const veil = document.createElement('div');
  veil.className = 'power-on';
  veil.setAttribute('aria-hidden', 'true');       // it is not content
  veil.innerHTML = '<i></i>';
  document.body.appendChild(veil);

  let over = false;
  const away = () => {
    if (over) return;
    over = true;
    off();
    veil.classList.add('gone');
    setTimeout(() => veil.remove(), 340);
  };

  // Skippable from the first frame, the same rule the sting already holds
  // itself to — and ONE input skips the whole thing rather than each half in
  // turn. Skipping before the mark is reached deliberately leaves it unseen
  // rather than marking it as shown: you did not watch it, so you have not
  // been introduced, and it is still waiting next time.
  const skip = () => away();
  const off = () => {
    removeEventListener('keydown', skip);
    removeEventListener('pointerdown', skip);
  };
  addEventListener('keydown', skip);
  addEventListener('pointerdown', skip);

  // The veil HOLDS after the tube opens rather than removing itself, so the
  // mark has a black screen to arrive on instead of the floor. Everything
  // after this point is a nicety, and a nicety may never be the reason the
  // page does not open — hence the catch either side of it.
  return new Promise(r => setTimeout(r, 720))
    .then(() => (over || !mark ? null : (off(), mark())))
    .catch(() => {})
    .then(away, away);
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

// ── 7. marquee flicker ─────────────────────────────────────────────
// Every so often one tube on the floor struggles for a moment and settles.
// One cabinet at a time and never the same one twice running — two things
// twitching at once reads as a broken page rather than as an old one.
export function flicker(root = document) {
  if (REDUCED.matches) return { stop() {} };
  let last = null;
  const tick = () => {
    const arts = [...root.querySelectorAll('.cab:not([hidden]) .art')]
      .filter(n => n !== last && n.offsetParent !== null);
    if (arts.length) {
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
