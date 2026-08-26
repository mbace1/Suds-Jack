// Automatic local-only play evidence for every catalogue page that loads shell.js.
// The shell imports this module once it has resolved the current catalogue entry.
// We deliberately log only coarse session facts here. Runs, deaths and failures
// belong to the games themselves because the shell cannot infer those honestly.
import { logPlay } from './playlog.js';

const onceKey = id => `tokoPlayVisit:${id}`;

export function beginPlaySession(game) {
  if (!game) return { end() {} };
  const started = performance.now();
  let ended = false;

  // One visit per page lifetime. sessionStorage is only a guard against a host
  // accidentally mounting the helper twice; a real navigation creates a new
  // page and therefore a new visit as intended.
  try {
    const key = onceKey(game);
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      logPlay(game, 'visit');
    }
  } catch {
    logPlay(game, 'visit');
  }

  const end = reason => {
    if (ended) return;
    ended = true;
    const seconds = Math.max(0, Math.round((performance.now() - started) / 1000));
    // Tiny accidental opens are still visits, but not meaningful play sessions.
    if (seconds >= 8) logPlay(game, 'session', { seconds, reason: reason || 'leave' });
  };

  addEventListener('pagehide', () => end('pagehide'), { once: true });
  addEventListener('beforeunload', () => end('unload'), { once: true });
  return { end };
}

export default beginPlaySession;
