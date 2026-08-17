// Kindling — everything the app remembers, and the only place it is decided.
//
// It all lives in one localStorage key on your own machine. Nothing here is
// sent anywhere, there is no account and there is no leaderboard, which is a
// design position and not a missing feature: a page that asks how you are doing
// and then posts the answer somewhere is a different kind of page.
//
// Three rules run through the whole model:
//
//  1. THE DAY TURNS AT 04:00, not midnight. A care list that resets while you
//     are still awake tells you that you failed at 00:01 on a night you were
//     doing fine. `dayKey` shifts the clock back four hours, so a late night
//     still belongs to the day it feels like.
//  2. NOTHING IS EVER TAKEN AWAY. A missed day resets the streak counter
//     because a streak is a count of consecutive days and lying about it would
//     be worse — but the fire banks to coals rather than going out, the fuel
//     stays, the shelf stays, and the copy never scolds (see main.js).
//  3. A STREAK IS COUNTED BACK FROM TODAY. `streak` is stored, but what the app
//     shows is `liveStreak()` — zero unless the last kept day was today or
//     yesterday. The arcade's own counters learned this the hard way: a streak
//     that ended in March was still being shown in July.

const KEY = 'kindlingState';
const V = 1;

// how much care makes a full fire for one day. Deliberately low: five small
// things is a good day, and a bar you cannot fill is a bar that teaches you to
// stop looking at it.
export const FULL_DAY = 5;

// what each act is worth in kindling (the currency an errand spends)
export const PAY = { task: 1, mood: 1, breath: 2 };
export const ERRAND_COST = 3;

// the creature grows on the lifetime count of small things kept, not on days
// visited — screen time earns nothing here
export const STAGES = [
  { at: 0,  id: 'spark',  name: 'a spark' },
  { at: 6,  id: 'wisp',   name: 'a wisp' },
  { at: 18, id: 'tender', name: 'a tender' },
  { at: 40, id: 'keeper', name: 'a keeper' },
  { at: 80, id: 'elder',  name: 'an elder' },
];

export function dayKey(d = new Date()) {
  const t = new Date(d.getTime() - 4 * 3600 * 1000);   // the day turns at 04:00
  const p = n => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

export function prevKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(y, m - 1, d, 12);                  // noon: no DST edges
  t.setDate(t.getDate() - 1);
  const p = n => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

const DEFAULT_TASKS = [
  { id: 'water',   text: 'drank some water' },
  { id: 'outside', text: 'stepped outside' },
  { id: 'moved',   text: 'moved your body' },
  { id: 'ate',     text: 'ate something real' },
  { id: 'tidied',  text: 'put one thing back' },
  { id: 'said',    text: 'said something to someone' },
];

function fresh() {
  return {
    v: V,
    tasks: DEFAULT_TASKS.map(t => ({ ...t })),
    // `paid` is what today has already been credited for. Without it the fuel
    // and the lifetime count could be farmed by ticking one line on and off,
    // and closing that hole by refusing to untick would have been worse: a list
    // you cannot correct is a list you stop being honest with.
    sheet: { date: dayKey(), done: [], paid: [], mood: null, breaths: 0 },
    fuel: 0,
    kept: 0,                 // lifetime small things
    days: 0,                 // lifetime days with at least one
    streak: 0,
    best: 0,
    lastKept: null,          // the day key of the most recent kept day
    found: [],               // ids of things brought home, in the order found
    journal: [],             // newest first: { date, kept, mood, lines[] }
    errand: null,            // { out, endsAt, seed } while the creature is away
    sound: false,            // off until asked, like every other page here
    seen: false,             // the one-time note about where this data lives
  };
}

export const S = load();

function load() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { raw = null; }
  const s = { ...fresh(), ...(raw && typeof raw === 'object' ? raw : {}) };
  // a stored shape from a future version is left alone rather than half-read
  if (s.v !== V) return fresh();
  s.sheet = { date: dayKey(), done: [], paid: [], mood: null, breaths: 0, ...(s.sheet || {}) };
  if (!Array.isArray(s.sheet.paid)) s.sheet.paid = [...s.sheet.done];
  if (!Array.isArray(s.tasks) || !s.tasks.length) s.tasks = DEFAULT_TASKS.map(t => ({ ...t }));
  for (const k of ['found', 'journal']) if (!Array.isArray(s[k])) s[k] = [];
  rollover(s);
  return s;
}

let pending = 0;
export function save() {
  clearTimeout(pending);
  pending = setTimeout(write, 120);
}
export function write() {
  clearTimeout(pending);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* private mode: play on */ }
}

// ── the day ───────────────────────────────────────────────────────────
// Turning the sheet over is the only destructive thing in here, and it destroys
// nothing but the checkmarks: the day it closes is already in the journal,
// because the journal entry is written as the day happens rather than archived
// at the end of it (a day archived at the end is a day lost if the tab closes).
export function rollover(s = S) {
  const today = dayKey();
  if (s.sheet.date === today) return false;
  s.sheet = { date: today, done: [], paid: [], mood: null, breaths: 0 };
  return true;
}

export function entry(s = S) {
  const today = dayKey();
  if (!s.journal.length || s.journal[0].date !== today) {
    s.journal.unshift({ date: today, kept: 0, mood: null, lines: [] });
    s.journal.length = Math.min(s.journal.length, 120);
  }
  return s.journal[0];
}

// today's care, in small things: the checkmarks, the check-in, and up to three
// rounds of breathing (a fourth is welcome, it just does not raise the fire —
// the fire is a picture of a balanced day, not of one thing done ten times)
export function caredToday(s = S) {
  return s.sheet.done.length + (s.sheet.mood ? 1 : 0) + Math.min(3, s.sheet.breaths);
}

// 0..1 — how high the fire stands. Never quite 0: what is left when a day goes
// by untouched is coals, and coals are still a fire.
export function warmth(s = S) {
  return Math.min(1, caredToday(s) / FULL_DAY);
}

export function liveStreak(s = S) {
  const today = dayKey();
  if (s.lastKept === today || s.lastKept === prevKey(today)) return s.streak;
  return 0;
}

export function stage(s = S) {
  let out = STAGES[0];
  for (const st of STAGES) if (s.kept >= st.at) out = st;
  return out;
}

export function nextStage(s = S) {
  return STAGES.find(st => s.kept < st.at) ?? null;
}

// ── keeping something ─────────────────────────────────────────────────
// One funnel, so the day-kept bookkeeping and the once-only rule exist once
// each. `key` is what today is being credited FOR: a task id, the check-in, or
// which round of breathing. Pay a key twice and it pays nothing the second time.
function payOnce(s, key, pay) {
  if (s.sheet.paid.includes(key)) { save(); return false; }
  s.sheet.paid.push(key);
  const today = dayKey();
  if (s.lastKept !== today) {
    s.streak = s.lastKept === prevKey(today) ? s.streak + 1 : 1;
    s.best = Math.max(s.best, s.streak);
    s.lastKept = today;
    s.days += 1;
  }
  s.fuel += pay;
  s.kept += 1;
  entry(s).kept = caredToday(s);
  save();
  return true;
}

// Toggling a task off is allowed and takes nothing back — not the kindling, not
// the lifetime count, not the streak. Mis-tapping a list on a phone is not a
// moral event.
export function toggleTask(id, s = S) {
  const at = s.sheet.done.indexOf(id);
  if (at >= 0) {
    s.sheet.done.splice(at, 1);
    entry(s).kept = caredToday(s);
    save();
    return false;
  }
  s.sheet.done.push(id);
  payOnce(s, id, PAY.task);
  return true;
}

// returns true the first time you check in today, false when you change it —
// changing your mind is free
export function setMood(mood, s = S) {
  s.sheet.mood = mood;
  entry(s).mood = mood;
  return payOnce(s, 'mood', PAY.mood);
}

// Rounds beyond the third are welcome and pay nothing, for the same reason the
// fire stops rising at five small things: this is a picture of a balanced day,
// not of one thing done twenty times.
export function countBreath(s = S) {
  s.sheet.breaths += 1;
  payOnce(s, `breath:${Math.min(3, s.sheet.breaths)}`, PAY.breath);
}

// ── the list itself ───────────────────────────────────────────────────
export function addTask(text, s = S) {
  const clean = String(text).trim().slice(0, 46);
  if (!clean) return null;
  if (s.tasks.length >= 14) return null;             // a list you scroll is a chore
  const id = 'c' + Date.now().toString(36);
  s.tasks.push({ id, text: clean, custom: true });
  save();
  return id;
}

export function removeTask(id, s = S) {
  s.tasks = s.tasks.filter(t => t.id !== id);
  s.sheet.done = s.sheet.done.filter(d => d !== id);
  entry(s).kept = caredToday(s);
  save();
}

export function spend(n, s = S) {
  if (s.fuel < n) return false;
  s.fuel -= n;
  save();
  return true;
}

export function found(id, s = S) {
  s.found.push(id);
  save();
}

export function note(line, s = S) {
  entry(s).lines.push(line);
  save();
}

export function setSound(on, s = S) { s.sound = !!on; save(); }

// for the smoke test and the console — nothing in the app calls this
export function wipe() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
