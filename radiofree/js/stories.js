// Radio Free Helsinki — fetching the day's wire.
//
// EVERY BULLETIN IS FICTION. The studios, ministries, ports and operators are
// invented, and no real company, agency or country is being described or
// accused of anything. What is NOT invented is the language: each item is
// written the way this kind of story actually gets written, and DECODE names
// the move it is pulling. That is the whole point of the app — the propaganda
// is the subject, not the payload. `STORIES.md` is the bar a bulletin has to
// clear, and it is where the words live now: **`wire.json`, not this file.**
//
// The wire is fetched, not bundled, so a new day's bulletins reach a listener
// without a build. Three things follow from that, and all three are why this
// module is more than `await fetch()`:
//
//   1. It is fetched NETWORK-FIRST while the shell stays cache-first. The
//      shell is the app and should come off disk instantly; the wire is the
//      content, and a stale one is the exact failure this exercise exists to
//      prevent. `sw.js` carries the matching rule.
//   2. It is VALIDATED before a word of it reaches the screen (`wire.js`), by
//      the same validator `tools/validate-wire.mjs` runs in a terminal. The
//      art keys especially: they fall back silently in the renderer, so an
//      external typo would ship the wrong picture beside the right words.
//   3. It can FAIL. Offline on a first visit, a half-written file, a 404 mid
//      edit — so a station-identification post is baked in, in all three
//      languages, and the feed shows that rather than nothing. An app that can
//      be updated from outside is an app that can be broken from outside.

import { PANEL_KEYS, BROLL_KEYS } from './visuals.js?v=25';

import { SECTOR_COLOR } from './palette.js?v=25';
import { validateWire, rotate, pickCopy } from './wire.js?v=25';

export { parseLine, flatten } from './wire.js?v=25';

export const WIRE_URL = 'wire.json';

// The station identification. Not an error page — the feed is a feed, so a
// wire that cannot be read becomes one post that says so, on air, in register.
// It carries markup like any bulletin, because DECODE must not be dead here.
const OFF_AIR = {
  version: 1,
  sectors: [{ id: 'GAMING', freq: '87.60', call: 'KAIKU' }],
  stories: [{ id: 'station-id', sector: 'GAMING', visual: 'sat', broll: 'cathedral' }],
  copy: {
    en: {
      'station-id': {
        slug: 'STATION IDENTIFICATION',
        head: 'The wire did not come through',
        lines: ['This station {{is experiencing technical difficulties|could not load today’s bulletins}}. The transmitter is fine; what is missing is the copy. Try again when you have a signal.'],
        technique: 'THE SOOTHING PASSIVE',
        decodeNote: 'Even an outage notice reaches for it. "Is experiencing difficulties" happens to a station the way weather happens to a town — nobody chose it, and nobody has to have fixed it by Tuesday. This one is telling the truth, and it is still worth noticing that the shape was sitting there to be reached for.',
        tell: 'An outage with no cause and no time in it is a mood, not an update.',
      },
    },
    fi: {
      'station-id': {
        slug: 'ASEMATUNNUS',
        head: 'Sähke ei tullut perille',
        lines: ['Asemalla {{on teknisiä ongelmia|ei saatu ladattua tämän päivän sähkeitä}}. Lähetin on kunnossa; puuttuva osa on teksti. Yritä uudelleen kun sinulla on kenttää.'],
        technique: 'RAUHOITTAVA PASSIIVI',
        decodeNote: 'Häiriötiedotekin tarttuu siihen. "Asemalla on teknisiä ongelmia" tapahtuu asemalle niin kuin sää tapahtuu kaupungille — kukaan ei valinnut sitä eikä kenenkään tarvitse olla korjannut sitä tiistaiksi. Tämä puhuu totta, ja silti kannattaa huomata, että muoto oli valmiina tartuttavaksi.',
        tell: 'Häiriö ilman syytä ja ilman aikaa on tunnelma, ei tiedote.',
      },
    },
    ja: {
      'station-id': {
        slug: 'アセマトゥンヌス',
        head: '記事が届かなかった',
        lines: ['当局は{{技術的な問題が発生しています|本日の記事を読み込めませんでした}}。送信機は正常で、欠けているのは原稿のほうだ。電波の届くところで、もう一度どうぞ。'],
        technique: 'なだめる受動態',
        decodeNote: '障害のお知らせでさえこの型に手が伸びる。「問題が発生しています」は、天気が町に起こるのと同じように局に起こる——誰も選んでおらず、誰も火曜までに直しておかなくてよい。これは本当のことを言っているが、それでもその型がそこに用意されていたことは見ておく価値がある。',
        tell: '原因も時刻もない障害告知は、報せではなく雰囲気だ。',
      },
    },
  },
};

// Live bindings: importers see whatever `loadWire()` last put here. Nothing
// reads them before boot has awaited the load.
export let SECTORS = [];
export let STORIES = [];
export let COPY = { en: {}, fi: {}, ja: {} };
// ids that are on the wire but out of the rotation — retired, or past `keep`
export let ARCHIVED = [];

// what the app is currently reading — for the console handle and the gate
export let WIRE_INFO = { source: 'none', updated: null, count: 0, archived: 0, errors: [] };

function install(wire, source, errors = []) {
  SECTORS = wire.sectors;
  // Newest first, oldest archived off the bottom. `rotate` also drops retired
  // bulletins, so ARCHIVED is reported rather than swallowed — a feed that
  // quietly got shorter reads as bulletins that were never written.
  const { shown, archived } = rotate(wire);
  STORIES = shown;
  ARCHIVED = archived;
  COPY = wire.copy;
  WIRE_INFO = { source, updated: wire.updated || null, count: STORIES.length,
                archived: archived.length, errors };
  if (archived.length) console.info(`[rfh] ${archived.length} archived: ${archived.join(', ')}`);
  return WIRE_INFO;
}

/**
 * Fetch, check, install. Resolves with WIRE_INFO either way — the caller gets
 * a feed to build no matter what happened, and `source` says which one it is.
 *
 * `cache: 'no-cache'` asks the browser to revalidate rather than serve its own
 * copy; the service worker does the real work (network first, the cached wire
 * as fallback), so this stays correct with or without a worker installed.
 */
export async function loadWire(url = WIRE_URL) {
  let errors = [];
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const wire = await res.json();
    const v = validateWire(wire, {
      panelKeys: PANEL_KEYS,
      brollKeys: BROLL_KEYS,
      sectorIds: Object.keys(SECTOR_COLOR),
    });
    if (v.ok) {
      // warnings are for the author, not the listener — they do not stop a read
      if (v.warnings.length) console.warn('[rfh] wire warnings:\n' + v.warnings.join('\n'));
      return install(wire, 'network');
    }
    errors = v.errors;
    console.error(`[rfh] wire rejected (${errors.length} problem${errors.length === 1 ? '' : 's'}):\n`
      + errors.join('\n'));
  } catch (err) {
    errors = [String(err && err.message ? err.message : err)];
    console.error('[rfh] wire unavailable: ' + errors[0]);
  }
  return install(OFF_AIR, 'off-air', errors);
}

export function storyCopy(id, lang) {
  return pickCopy(COPY, id, lang);
}
