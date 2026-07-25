// The Game of Life — persistence (localStorage under a single key).
// State shape:
//   lang            'fi' | 'en' | 'ja'
//   completions     [{ id, ts }]           every finished experience, ever
//   sinceInterlude  int                    finishes since the last nature interlude
//   natureIdx       int                    rotates through the interlude prompts
//   accepted        int                    invitations the player actually took
//   hemi            'n' | 's' | null       which hemisphere's seasons to use
//   feedback        [{ id, leaves, text, lang, ts }]

const KEY = 'golState';
const GARDEN_MAX = 5;

const DEFAULTS = {
  lang: null,
  completions: [],
  sinceInterlude: 0,
  natureIdx: 0,
  accepted: 0,
  hemi: null,          // null until set, so main.js can seed the timezone guess
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

// which hemisphere's seasons the invitations should follow
export function getHemi() { return state.hemi === 's' ? 's' : 'n'; }
export function hemiSet() { return state.hemi === 'n' || state.hemi === 's'; }
export function setHemi(h) { state.hemi = h === 's' ? 's' : 'n'; save(); }

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
  state.accepted += 1;
  save();
}

// the sound garden grows one voice per accepted invitation — screen time never
// earns a voice, only going outside does
export function gardenVoices() { return Math.min(GARDEN_MAX, state.accepted || 0); }
export function gardenFull() { return gardenVoices() >= GARDEN_MAX; }

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
