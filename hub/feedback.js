// Hub feedback — getting a player's note off their machine and to the people
// who made the thing, from a page with no server behind it.
//
// This deliberately mirrors the transport toko-drop already ships (see
// scripts/feedback-sheet.gs on the gh-pages branch for the server half):
//
//   SHEET_ENDPOINT    a Google Apps Script web app — no submission limit, but
//                     it cannot answer a CORS preflight, so the POST is kept
//                     "simple" (text/plain, no-cors) and the reply is opaque.
//                     Paste a deployment's /exec URL here and it takes over.
//   FORMSPREE_ENDPOINT the fallback already in use by the games (~50 notes a
//                     month on the free tier), which does answer with CORS, so
//                     delivery can actually be confirmed.
//
// Every note is written to localStorage first, whatever happens next. A note
// that could not be delivered goes to an outbox and is retried on the next
// visit, one at a time — a broken endpoint costs one failed request, not a
// burst. Nothing is ever dropped on the floor, and nothing is promised that
// was not done: an opaque no-cors POST reports 'sent-blind', not 'sent'.

// PASTE THE SHEET URL HERE and the whole floor switches over — the arcade,
// the counter, and every surface that posts through this module. Deploy
// scripts/feedback-sheet.gs as a web app (setup is in its header comment,
// ~3 minutes) and drop its /exec URL in. Unlimited, and it lands somewhere
// sortable by game instead of in an inbox — at the cost that its answer
// cannot be read, so those notes report 'sent-blind', never 'sent'.
const SHEET_ENDPOINT = '';                                  // 'https://script.google.com/macros/s/XXXX/exec'
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdarbpve';

const KEY = 'sudsJackHub';
const MAX_KEPT = 200;

// live values — the constants above are the shipped configuration; the test
// loop (and the console) can point these at a stub instead. `blind` marks an
// Apps Script style sink, whose answer the browser will not let us read.
let ENDPOINT = SHEET_ENDPOINT || FORMSPREE_ENDPOINT;
let blind = !!SHEET_ENDPOINT;

export function setEndpoint(url, isBlind = false) { ENDPOINT = url || ''; blind = isBlind; }

// What was on screen when the note was written — the layout, the language.
// Supplied by the page rather than guessed at here, because this module has no
// business knowing what a layout is; it just has to make sure the answer
// travels with the note. Every surface that posts through here gets it.
let context = () => ({});
export function setContext(fn) { context = typeof fn === 'function' ? fn : () => ({}); }
export function configured() { return !!ENDPOINT; }

// ── the local record ───────────────────────────────────────────────
function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function write(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}
export function archive() { return read().feedback ?? []; }
export function outbox() { return read().outbox ?? []; }

function keep(entry) {
  const s = read();
  s.feedback = [entry, ...(s.feedback ?? [])].slice(0, MAX_KEPT);
  write(s);
}
function queue(entry) {
  const s = read();
  s.outbox = [...(s.outbox ?? []), entry].slice(-MAX_KEPT);
  write(s);
}
function unqueue(entry) {
  const s = read();
  s.outbox = (s.outbox ?? []).filter(e => e.ts !== entry.ts || e.game !== entry.game);
  write(s);
}

// ── the wire ───────────────────────────────────────────────────────
async function post(entry) {
  const body = JSON.stringify({
    ...entry, ua: navigator.userAgent, screen: `${innerWidth}x${innerHeight}`,
  });
  if (blind) {
    // no-cors: the browser will not let us read the answer, so this is the one
    // path where "it left" is the strongest thing that can honestly be said
    await fetch(ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body,
    });
    return 'sent-blind';
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`endpoint answered ${res.status}`);
  return 'sent';
}

// 'sent' | 'sent-blind' | 'queued' | 'off' — never throws, because a note a
// player has already written must not be lost to a flaky network
export async function send(entry) {
  // The context is folded in HERE rather than at the wire, so the copy kept on
  // the device is the same object that goes out. It was applied in post() at
  // first, which meant the archive the player can read back had no idea which
  // layout or language produced it — the one place that fact is worth showing.
  // `source` says which surface it was left on; `kind` rides along from
  // topics.js the same way.
  const full = { source: 'hub', ...context(), ...entry };
  keep(full);
  if (!configured()) return 'off';
  try {
    return await post(full);
  } catch {
    queue(full);
    return 'queued';
  }
}

// on the next visit, quietly try again — one at a time, stopping at the first
// failure so a still-broken endpoint is not hammered
export async function flush() {
  if (!configured()) return 0;
  let sent = 0;
  for (const entry of outbox()) {
    try {
      await post(entry);
      unqueue(entry);
      sent++;
    } catch {
      break;
    }
  }
  return sent;
}

// A note is held if it is still in the outbox — matched the same way unqueue()
// matches, so the two never disagree about what "delivered" means.
export function held(entry) {
  return outbox().some(e => e.ts === entry.ts && e.game === entry.game);
}

// Everything kept on this device, gone. Local only: anything already delivered
// is out of our hands and this does not pretend otherwise.
export function forget() {
  const s = read();
  delete s.feedback;
  delete s.outbox;
  write(s);
}

// console handle, same convention as the games (__dc / __hd / __gol)
export const debug = { archive, outbox, flush, configured, setEndpoint, endpoint: () => ENDPOINT, forget };
