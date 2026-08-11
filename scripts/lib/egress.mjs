// Telling "the host is blocked" apart from "the key is wrong".
//
// Both arrive as a bare 403 and they need different people to fix, so guessing
// is worse than useless. This lives in its own file because the CLI that uses
// it runs its command on import — logic that cannot be imported cannot be
// tested, and this particular logic has now been wrong twice:
//
//   first cut  — inferred from the status code alone, so it reported this
//                environment's blocked host as "the key was rejected".
//   second cut — asked the proxy's failure log, but sampled it ONCE straight
//                after the failure. The log is written asynchronously, so the
//                check lost the race and printed the same wrong answer, this
//                time to a user who had just pasted a perfectly good key.
//
// So: two independent tells, either of which is sufficient.

// A proxy's CONNECT rejection is a couple of dozen bytes of plain text. Every
// service this pipeline talks to answers a real auth failure with JSON. A 403
// whose body will not parse as JSON therefore did not come from the service —
// there is nothing else in the response that separates them.
export function looksLikeProxyBody(text) {
  if (!text || text.length > 512) return false;
  try { JSON.parse(text); return false; } catch { return true; }
}

// The proxy's own record: authoritative, but written after the fact. Polled,
// never sampled — see the race above.
export async function blockedByProxy(host, {
  tries = 4, waitMs = 250, env = process.env, fetchImpl = fetch,
  sleep = ms => new Promise(r => setTimeout(r, ms)),
} = {}) {
  const proxy = env.HTTPS_PROXY || env.https_proxy;
  if (!proxy) return false;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetchImpl(new URL('/__agentproxy/status', proxy), { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const { recentRelayFailures = [] } = await res.json();
        if (recentRelayFailures.some(f =>
          String(f.host ?? '').startsWith(host) && /reject|denied|403/i.test(`${f.kind} ${f.detail}`))) return true;
      }
    } catch { /* no proxy, or it is not answering — the body tell still stands */ }
    if (i < tries - 1) await sleep(waitMs);
  }
  return false;
}
