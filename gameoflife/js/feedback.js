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

import * as store from './storage.js?v=36';

let ENDPOINT = '';

export function endpoint() { return ENDPOINT; }
export function configured() { return !!ENDPOINT; }
export function setEndpoint(url) { ENDPOINT = url || ''; }   // tests + console

async function post(entry) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`endpoint answered ${res.status}`);
}

// 'sent' | 'queued' | 'off' — never throws, because a note the player has
// already written must not be lost to a network error
export async function send(entry) {
  if (!ENDPOINT) return 'off';
  try {
    await post(entry);
    return 'sent';
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
