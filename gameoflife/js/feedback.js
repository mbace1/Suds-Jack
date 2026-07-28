// The Game of Life — getting a visitor's note to the people who made the game.
//
// Until now feedback only ever reached the visitor's own localStorage, which
// means it reached nobody. This posts it to a form endpoint instead — and,
// because a form endpoint is a thing that can be offline, rate-limited or
// simply not configured yet, it never loses a note: anything that fails to send
// is kept in an outbox and retried on the next visit.
//
// ── Setting the endpoint ────────────────────────────────────────────
// Create a form at https://formspree.io (or any service that accepts a JSON
// POST and answers with CORS headers) and paste its URL below. That is the
// whole configuration.
//
//   ENDPOINT = 'https://formspree.io/f/xxxxxxxx';
//
// Leave it empty and the app behaves exactly as it did before: notes are kept
// locally, nothing is sent, and no promise about sending is shown to anyone.
//
// A Google Form would need one more thing — its per-question `entry.NNNN` field
// ids — and cannot confirm delivery, because Google Forms sends no CORS headers
// and the browser can only fire the request blind. Formspree is the easier fit.

import * as store from './storage.js?v=41';

let ENDPOINT = 'https://script.google.com/macros/s/AKfycbycM2SigkqxRLecc5S4SFF_sq3XDNrVmfcXzYb2cQrHnBEoSU6JNeB7yQ8pAuN89lDf/exec';

export function endpoint() { return ENDPOINT; }
export function configured() { return !!ENDPOINT; }
export function setEndpoint(url) { ENDPOINT = url || ''; }   // tests + console

// This room keeps its OWN endpoint and its own outbox on purpose — it is the
// offline-first one, its service worker precaches an exact list scoped to
// /gameoflife/, and importing the hub's transport would break that promise.
// What it does share is the one thing that makes a sheet sortable: the same
// `game` key the arcade catalogue uses for this cabinet. Point ENDPOINT at
// the same Apps Script and its rows sit with everything else.
const GAME_ID = 'gameoflife';

// An Apps Script web app CANNOT answer a CORS preflight, and an
// `application/json` body is exactly what triggers one. Posting this the
// obvious way meant every note failed, queued, and retried forever on a path
// that could never work. So the request is kept "simple" — text/plain,
// no-cors — which the browser sends without asking permission first.
//
// The cost is that the answer is opaque: `res.ok` is false and `res.status`
// is 0 on a POST that arrived perfectly. Reading either would turn every
// successful send into a failure, so neither is read. What is left is the
// honest statement that it LEFT, which is what 'sent-blind' means. Only a
// real network error throws, and only that queues.
// A FUNCTION, not a const: setEndpoint() repoints this at runtime (the smoke
// gate does exactly that), and a value frozen at import would keep answering
// for the endpoint that is no longer in use.
const blind = () => /script\.google\.com/.test(ENDPOINT);

async function post(entry) {
  const body = JSON.stringify({ game: GAME_ID, source: 'gameoflife', ...entry });
  if (blind()) {
    await fetch(ENDPOINT, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body,
    });
    return;
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`endpoint answered ${res.status}`);
}

// 'sent' | 'queued' | 'off' — never throws, because a note the player has
// already written must not be lost to a network error
export async function send(entry) {
  if (!ENDPOINT) return 'off';
  try {
    await post(entry);
    // never 'sent' on the blind path: it left, and that is all anybody here
    // can honestly say about it
    return blind() ? 'sent-blind' : 'sent';
  } catch {
    store.queueFeedback(entry);
    return 'queued';
  }
}

// on the next visit, try the outbox again — quietly, and one at a time so a
// still-broken endpoint costs one failed request rather than a burst
export async function flush() {
  if (!ENDPOINT) return 0;
  let sent = 0;
  for (const entry of store.outbox()) {
    try {
      await post(entry);
      store.unqueueFeedback(entry);
      sent++;
    } catch {
      break;
    }
  }
  return sent;
}
