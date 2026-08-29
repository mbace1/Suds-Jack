// Radio Free Helsinki — fetch, validate and install the day's wire.

import { PANEL_KEYS, BROLL_KEYS } from './visuals.js?v=37';
import { SECTOR_COLOR } from './palette.js?v=37';
import { validateWire, rotate, pickCopy, cleanLines } from './wire.js?v=37';
import { EXTRA_STORIES, EXTRA_COPY } from './extras.js?v=48';

export { parseLine, flatten, splitLine, cleanLines } from './wire.js?v=37';

export const INDEX_URL = 'wire/index.json';
export const WIRE_URL = 'wire.json';
export const episodeUrl = date => `wire/${date}.json`;

export let EPISODES = [];
export let EPISODE = null;

const OFF_AIR = {
  version: 1,
  sectors: [{ id: 'GAMING', freq: '87.60', call: 'KAIKU' }],
  stories: [{ id: 'station-id', sector: 'GAMING', visual: 'sat', broll: 'cathedral' }],
  copy: {
    en: { 'station-id': { slug: 'STATION IDENTIFICATION', head: 'The wire did not come through', lines: ['This station {{is experiencing technical difficulties|could not load today’s bulletins}}. Try again when you have a signal.'], technique: 'OFF AIR', decodeNote: '', tell: '' } },
    fi: { 'station-id': { slug: 'ASEMATUNNUS', head: 'Sähke ei tullut perille', lines: ['Asema {{kokee teknisiä ongelmia|ei saanut ladattua tämän päivän sähkeitä}}. Yritä uudelleen kun sinulla on kenttää.'], technique: 'OFF AIR', decodeNote: '', tell: '' } },
    ja: { 'station-id': { slug: '局ID', head: '記事が届かなかった', lines: ['当局は{{技術的な問題が発生しています|本日の記事を読み込めませんでした}}。電波の届くところでもう一度どうぞ。'], technique: 'OFF AIR', decodeNote: '', tell: '' } },
  },
};

export let SECTORS = [];
export let STORIES = [];
export let COPY = { en: {}, fi: {}, ja: {} };
export let ARCHIVED = [];
export let WIRE_INFO = { source: 'none', updated: null, count: 0, archived: 0, errors: [] };

function install(wire, source, errors = []) {
  SECTORS = wire.sectors;
  const { shown, archived } = rotate(wire);
  const addExtras = wire.date === '2026-08-29' && source !== 'off-air';
  STORIES = addExtras ? [...shown, ...EXTRA_STORIES] : shown;
  ARCHIVED = archived;
  COPY = {
    en: { ...(wire.copy.en || {}), ...(addExtras ? EXTRA_COPY.en : {}) },
    fi: { ...(wire.copy.fi || {}), ...(addExtras ? EXTRA_COPY.fi : {}) },
    ja: { ...(wire.copy.ja || {}), ...(addExtras ? EXTRA_COPY.ja : {}) },
  };
  WIRE_INFO = {
    source,
    updated: wire.updated || null,
    date: wire.date || null,
    count: STORIES.length,
    archived: archived.length,
    errors,
  };
  if (archived.length) console.info(`[rfh] ${archived.length} archived: ${archived.join(', ')}`);
  return WIRE_INFO;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function check(wire) {
  return validateWire(wire, {
    panelKeys: PANEL_KEYS,
    brollKeys: BROLL_KEYS,
    sectorIds: Object.keys(SECTOR_COLOR),
  });
}

export async function loadWire(want = null) {
  const errors = [];
  const tried = [];

  try {
    const index = await fetchJson(INDEX_URL);
    const list = Array.isArray(index.episodes)
      ? index.episodes.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      : [];
    if (!list.length) throw new Error('index lists no episodes');
    EPISODES = list;
    const asked = want && list.includes(want) ? want : list[0];
    if (want && asked !== want) errors.push(`no episode for ${want}; playing ${asked}`);

    const order = [asked, ...list.filter(d => d !== asked)];
    for (const date of order) {
      let wire;
      try {
        wire = await fetchJson(episodeUrl(date));
      } catch (err) {
        tried.push(String(err && err.message ? err.message : err));
        continue;
      }
      const v = check(wire);
      if (v.ok) {
        if (v.warnings.length) console.warn('[rfh] wire warnings:\n' + v.warnings.join('\n'));
        if (date !== asked) errors.push(`episode ${asked} unavailable; playing ${date}`);
        EPISODE = date;
        return install(wire, 'episode', errors);
      }
      tried.push(...v.errors);
    }
  } catch (err) {
    tried.push(String(err && err.message ? err.message : err));
  }

  try {
    const wire = await fetchJson(WIRE_URL);
    const v = check(wire);
    if (v.ok) {
      EPISODE = wire.date || null;
      return install(wire, 'network', [...errors, ...tried]);
    }
    tried.push(...v.errors);
  } catch (err) {
    tried.push(String(err && err.message ? err.message : err));
  }

  console.error('[rfh] wire unavailable:\n' + tried.join('\n'));
  EPISODE = null;
  return install(OFF_AIR, 'off-air', [...errors, ...tried]);
}

export function storyBroadcast(id, lang) {
  const c = pickCopy(COPY, id, lang);
  return c ? cleanLines(c) : [];
}

export function storyCopy(id, lang) {
  return pickCopy(COPY, id, lang);
}
