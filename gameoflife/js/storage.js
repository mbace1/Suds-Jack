// The Game of Life — persistence (localStorage under a single key).
// State shape:
//   lang            'fi' | 'en' | 'ja'
//   completions     [{ id, ts }]           every finished experience, ever
//   sinceInterlude  int                    finishes since the last nature interlude
//   natureIdx       int                    rotates through the interlude prompts
//   feedback        [{ id, leaves, text, lang, ts }]

const KEY = 'golState';

const DEFAULTS = {
  lang: null,
  completions: [],
  sinceInterlude: 0,
  natureIdx: 0,
  feedback: [],
};

let state = load();

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode etc. */ }
}

export function getState() { return state; }

export function setLangPref(l) { state.lang = l; save(); }

export function recordCompletion(id) {
  state.completions.push({ id, ts: Date.now() });
  state.sinceInterlude += 1;
  save();
}

// The heart of the cycle: after every second finish the games rest
// and hand the player an invitation to the real world.
export function interludeDue() { return state.sinceInterlude >= 2; }

export function consumeInterlude() {
  state.sinceInterlude = 0;
  state.natureIdx += 1;
  save();
}

export function timesPlayedToday(id) {
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  return state.completions.filter(c => c.id === id && c.ts >= dayStart.getTime()).length;
}

export function timesPlayed(id) {
  return state.completions.filter(c => c.id === id).length;
}

export function recordFeedback(entry) {
  state.feedback.push({ ...entry, ts: Date.now() });
  save();
}

export function exportFeedback() {
  return JSON.stringify(state.feedback, null, 2);
}
