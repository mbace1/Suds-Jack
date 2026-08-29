// Automatic local-only play evidence for every catalogue page that loads pad.js.
// Runs, deaths and failures belong to the games themselves because the shared
// shell cannot infer those semantics honestly.
import { GAMES } from './games.js?v=43';
import { logPlay } from './playlog.js';

const here = location.pathname.replace(/\/index\.html$/, '/').replace(/([^/])$/, '$1/');
const entry = GAMES.find(g => here.endsWith(`/${g.path}`));
const onceKey = id => `tokoPlayVisit:${id}:${location.pathname}`;

export function beginPlaySession(game) {
  if (!game) return { end() {} };
  const started = performance.now();
  let ended = false;

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
    if (seconds >= 8) logPlay(game, 'session', { seconds, reason: reason || 'leave' });
  };

  addEventListener('pagehide', () => end('pagehide'), { once: true });
  addEventListener('beforeunload', () => end('unload'), { once: true });
  return { end };
}

// pad.js is already loaded by the common game shell. Importing this module from
// pad.js therefore gives every catalogued game coarse play evidence without
// changing each game's own code. The hub itself resolves no entry and is inert.
export const currentSession = beginPlaySession(entry?.id || null);
export default beginPlaySession;
